// 94-hot99.js —— v12.9.40 【实时热搜】格物 · 文娱/时政双版（微博/抖音/知乎/头条/每日要闻/人民网时政）
// [功能组] G3-学习成长 + G4-数据洞察（自媒体选题风向标 · 60s API + RSS→JSON 双通道）
//
// 设计（用户规则）：
//   · 实时让用户知道微博/抖音/知乎的最新热点，分【文娱板块】与【时政板块】
//   · 文娱：微博热搜 / 抖音热点 / 知乎热榜（60s API · 5 分钟缓存）
//   · 时政：头条热榜（60s API）/ 每日要闻（60s 读懂世界）/ 人民网时政（RSS→JSON）
//   · 每 5 分钟自动刷新（在页面时）· 手动 🔄 强制刷新 · 失败保留上次缓存 · 每条一键复制（自媒体选题用）
// 数据源（全部 CORS 开放 · 免 key）：
//   https://60s-api.viki.moe/v2/{weibo|douyin|zhihu|toutiao|60s}   开源项目 60s（vikiboss）
//   https://api.rss2json.com/v1/api.json?rss_url=…人民网时政        RSS→JSON 代理
Object.assign(App, {
  // ==================== 实时热搜 · 状态 ====================
  _hot99Board: 'wy',     // wy 文娱 | sz 时政
  _hot99Data: {},        // { srcKey: { ok, ts, stale, items } }
  _hot99Timer: null,

  // ==================== 数据源清单（文娱 / 时政）====================
  // 60s API 为双宿主机（主 60s-api + 镜像 www），偶发限流/路由波动 → 拉取时自动换宿主机重试
  _hot99Sources() {
    return {
      weibo:   { board: 'wy', ico: '🟥', n: '微博热搜', path: '/v2/weibo',   hint: '全网热度风向标' },
      douyin:  { board: 'wy', ico: '🎵', n: '抖音热点', path: '/v2/douyin',  hint: '文娱风向 · 短视频圈' },
      zhihu:   { board: 'wy', ico: '🔵', n: '知乎热榜', path: '/v2/zhihu',   hint: '深度讨论 · 观点场' },
      bilibili:{ board: 'wy', ico: '📺', n: 'B站热搜', path: '/v2/bilibili', hint: '二次元 · Z 世代风向' },
      toutiao: { board: 'sz', ico: '📰', n: '头条热榜', path: '/v2/toutiao', hint: '新闻要闻榜' },
      daily:   { board: 'sz', ico: '🌏', n: '每日要闻', path: '/v2/60s',     hint: '60 秒读懂世界' },
      rmrb:    { board: 'sz', ico: '🇨🇳', n: '人民网时政', rss: 'http://www.people.com.cn/rss/politics.xml', hint: '权威时政' },
    };
  },
  _hot99Hosts() { return ['https://60s-api.viki.moe', 'https://60s.viki.moe']; },

  // 热度值格式化（2618529 → 261.9万）
  _hot99FmtHot(v) {
    v = +v || 0;
    if (v >= 1e8) return (v / 1e8).toFixed(1) + '亿';
    if (v >= 1e4) return (v / 1e4).toFixed(1) + '万';
    return v ? String(v) : '';
  },
  _hot99SearchUrl(q) { return 'https://www.baidu.com/s?wd=' + encodeURIComponent(q); },

  // 同步读缓存（首渲染用）
  _hot99Read(k) {
    if (this._hot99Data[k]) return this._hot99Data[k];
    try { const c = JSON.parse(localStorage.getItem('hot99_' + k) || 'null'); if (c) { this._hot99Data[k] = c; return c; } } catch (e) {}
    return null;
  },

  // ==================== 拉取单个源（5 分钟 TTL · 4.5s 超时 · 失败保留旧缓存）====================
  async _hot99Fetch(k, force) {
    const s = this._hot99Sources()[k];
    if (!s) return null;
    const ck = 'hot99_' + k;
    try {
      const cache = JSON.parse(localStorage.getItem(ck) || 'null');
      if (!force && cache && cache.ok && (Date.now() - (cache.ts || 0)) < 5 * 60 * 1000) {
        this._hot99Data[k] = cache;
        return cache;
      }
    } catch (e) {}
    try {
      let items = [];
      if (s.rss) {
        // 人民网时政：RSS→JSON
        const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(s.rss);
        const ctrl = new AbortController();
        const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 4500);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        const j = await res.json().catch(() => ({}));
        if (!(j && j.status === 'ok' && Array.isArray(j.items) && j.items.length)) throw new Error('bad');
        const strip = (x) => String(x || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        items = j.items.slice(0, 10).map(it => ({
          t: strip(it.title).slice(0, 90),
          h: '', u: it.link || '',
          sub: '发于 ' + String(it.pubDate || '').slice(0, 10),
        }));
      } else {
        // 60s API：主宿主机失败 → 换镜像宿主机重试（限流/路由波动自愈）
        let j = null;
        for (const host of this._hot99Hosts()) {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 4500);
            const res = await fetch(host + s.path, { signal: ctrl.signal, cache: 'no-store' });
            clearTimeout(timer);
            const jj = await res.json().catch(() => ({}));
            if (jj && jj.code === 200 && jj.data) { j = jj; break; }
          } catch (e) {}
          await new Promise(r => setTimeout(r, 350));   // 换宿主机前小歇
        }
        if (!j) throw new Error('bad');
        if (k === 'daily') {
          // 60s 读懂世界：{ date, news: [...] }
          const news = Array.isArray(j.data.news) ? j.data.news : [];
          items = news.slice(0, 12).map(t => ({
            t: String(t || '').slice(0, 90),
            h: '', u: this._hot99SearchUrl(String(t || '').slice(0, 40)),
            sub: j.data.date || '',
          }));
        } else if (k === 'zhihu') {
          items = (j.data || []).slice(0, 10).map(it => ({
            t: String(it.title || '').slice(0, 90),
            h: String(it.hot_value_desc || ''),
            u: it.link || this._hot99SearchUrl(String(it.title || '').slice(0, 40)),
            sub: (it.answer_cnt ? it.answer_cnt + ' 回应' : '') + (it.detail ? ' · ' + String(it.detail).slice(0, 42) : ''),
          }));
        } else {
          items = (j.data || []).slice(0, 10).map(it => ({
            t: String(it.title || '').slice(0, 90),
            h: this._hot99FmtHot(it.hot_value),
            u: it.link || this._hot99SearchUrl(String(it.title || '').slice(0, 40)),
            sub: '',
          }));
        }
      }
      if (!items.length) throw new Error('empty');
      const data = { ok: true, ts: Date.now(), items };
      this._hot99Data[k] = data;
      try { localStorage.setItem(ck, JSON.stringify(data)); } catch (e) {}
      return data;
    } catch (e) {
      // 失败：沿用上次缓存（哪怕过期），标记 stale
      try {
        const old = JSON.parse(localStorage.getItem(ck) || 'null');
        if (old && old.items && old.items.length) {
          const d = Object.assign({}, old, { stale: true });
          this._hot99Data[k] = d;
          return d;
        }
      } catch (_) {}
      this._hot99Data[k] = { ok: false, ts: Date.now(), items: [] };
      return this._hot99Data[k];
    }
  },

  // 拉当前板块全部源（串行 + 错峰小歇，防连续请求触发限流；完成且仍在页面 → 重渲染）
  async _hot99Kick(force) {
    const srcs = Object.keys(this._hot99Sources()).filter(k => this._hot99Sources()[k].board === this._hot99Board);
    for (let i = 0; i < srcs.length; i++) {
      await this._hot99Fetch(srcs[i], force);
      if (i < srcs.length - 1) await new Promise(r => setTimeout(r, 300));
    }
    try {
      if (this.currentView === 'workbench' && this._wbView === 'gewu99' && this._gw99View === 'hot') this.render_workbench();
    } catch (e) {}
  },
  // 在页面时每 5 分钟自动续热（TTL 守卫：缓存 >5 分钟才真拉）
  _hot99AutoTick() {
    if (this._hot99Timer) return;
    this._hot99Timer = setInterval(() => {
      try {
        if (this.currentView !== 'workbench' || this._wbView !== 'gewu99' || this._gw99View !== 'hot') return;
        this._hot99Kick(false);
      } catch (e) {}
    }, 5 * 60 * 1000);
  },
  _hot99RefreshAll() {
    this._flash('🔄 正在拉取全部实时热搜…');
    this._hot99Kick(true);
  },
  _hot99BoardSet(b) {
    if (this._hot99Board === b) return;
    this._hot99Board = b;
    this._hot99Kick(false);
    this.render_workbench();
  },

  // ==================== 复制标题（自媒体选题）====================
  _hot99Copy(k, i) {
    const d = this._hot99Data[k] || this._hot99Read(k) || {};
    const it = (d.items || [])[i];
    if (!it) return;
    const text = it.t;
    const done = () => this._flash('📋 已复制：' + text.slice(0, 26) + (text.length > 26 ? '…' : ''));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => this._hot99CopyFallback(text, done));
    } else this._hot99CopyFallback(text, done);
  },
  _hot99CopyFallback(text, done) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    } catch (e) { this._flash('复制失败——请长按标题手动复制'); }
  },

  // ==================== 页面（格物 → 实时热搜视图）====================
  _gw99GotoHot() {
    this._gw99View = 'hot';
    this.gotoWb('gewu99');
  },
  _gw99HotView() {
    this._hot99Kick(false);
    this._hot99AutoTick();
    const board = this._hot99Board;
    const srcs = this._hot99Sources();
    const keys = Object.keys(srcs).filter(k => srcs[k].board === board);
    const RK = ['#dc2626', '#ea580c', '#ca8a04'];
    let secs = '';
    keys.forEach(k => {
      const s = srcs[k];
      const d = this._hot99Read(k) || { ok: false, items: [] };
      const mins = d.ts ? Math.max(0, Math.round((Date.now() - d.ts) / 60000)) : null;
      const state = d.ok
        ? `${d.stale ? '⚠️ 上次缓存' : '🟢 实时'}${mins !== null ? ' · ' + (mins < 1 ? '刚刚' : mins + ' 分钟前') : ''}`
        : '⚪ 暂无数据（点上方 🔄 重试）';
      const rows = (d.items || []).slice(0, 10).map((it, i) => `
        <a class="hot99-row" href="${this.esc(it.u || '#')}" target="_blank" rel="noopener">
          <span class="hot99-rk${i < 3 ? ' top' : ''}" style="${i < 3 ? 'background:' + RK[i] : ''}">${i + 1}</span>
          <div class="hot99-bd">
            <div class="hot99-t">${this.esc(it.t)}</div>
            ${it.sub ? `<div class="hot99-s">${this.esc(it.sub)}</div>` : ''}
          </div>
          ${it.h ? `<span class="hot99-hv">🔥 ${this.esc(it.h)}</span>` : ''}
          <button class="hot99-cp" onclick="event.preventDefault();event.stopPropagation();App._hot99Copy('${k}',${i})" title="复制标题">📋</button>
        </a>`).join('');
      secs += `
      <div class="hot99-sec">
        <div class="hot99-sec-hd">
          <span class="hot99-sec-t"><b>${s.ico} ${this.esc(s.n)}</b><i>${this.esc(s.hint)}</i></span>
          <span class="hot99-sec-st">${state}</span>
        </div>
        ${rows || '<div class="hot99-empty">暂无数据——实时源可能未响应，点上方「🔄 刷新」重试</div>'}
      </div>`;
    });
    return `
    <style>
      .hot99{font-family:ui-monospace,'Courier New',monospace}
      .hot99-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
      .hot99-title{font-size:17px;font-weight:900;color:#1e293b;letter-spacing:1px}
      .hot99-tabs{display:flex;gap:8px}
      .hot99-tab{border:2px solid #fca5a5;background:#fff;color:#b91c1c;font-size:12px;font-weight:900;
        padding:6px 14px;cursor:pointer;border-radius:999px}
      .hot99-tab.on{background:linear-gradient(90deg,#dc2626,#b91c1c);color:#fff;border-color:#7f1d1d}
      .hot99-rfall{margin-left:auto;border:2px solid #f97316;background:#fff7ed;color:#c2410c;font-size:12px;
        font-weight:900;padding:6px 13px;cursor:pointer;border-radius:999px}
      .hot99-rfall:active{transform:translate(1px,1px)}
      .hot99-note{font-size:11px;color:#b91c1c;line-height:1.9;background:#fef2f2;border:2px dashed #fca5a5;padding:10px 12px;margin-bottom:14px}
      .hot99-sec{background:#fff;border:2px solid #fecaca;border-radius:12px;padding:11px 12px;margin-bottom:14px;
        box-shadow:3px 3px 0 rgba(185,28,28,.08)}
      .hot99-sec-hd{display:flex;align-items:baseline;justify-content:space-between;gap:8px;border-bottom:2px dashed #fecaca;padding-bottom:7px;margin-bottom:8px}
      .hot99-sec-t b{font-size:14px;color:#7f1d1d}
      .hot99-sec-t i{font-style:normal;font-size:10px;color:#b91c1c;margin-left:8px}
      .hot99-sec-st{font-size:10px;font-weight:700;color:#16a34a;white-space:nowrap}
      .hot99-row{display:flex;align-items:center;gap:9px;padding:7px 4px;border-bottom:1px dashed #fef2f2;text-decoration:none;color:inherit}
      .hot99-row:last-child{border-bottom:0}
      .hot99-row:active{background:#fef2f2}
      .hot99-rk{width:21px;height:21px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:900;color:#94a3b8;background:#f1f5f9;border-radius:4px}
      .hot99-rk.top{color:#fff}
      .hot99-bd{flex:1;min-width:0}
      .hot99-t{font-size:13px;font-weight:700;color:#1e293b;line-height:1.45;word-break:break-all}
      .hot99-s{font-size:10px;color:#94a3b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .hot99-hv{flex-shrink:0;font-size:10.5px;font-weight:900;color:#ea580c;white-space:nowrap}
      .hot99-cp{flex-shrink:0;width:26px;height:26px;border:1.5px solid #fecaca;background:#fff;border-radius:6px;
        font-size:12px;cursor:pointer;line-height:1}
      .hot99-cp:active{transform:translate(1px,1px);background:#fef2f2}
      .hot99-empty{font-size:11.5px;color:#b91c1c;text-align:center;padding:14px 0}
    </style>
    <div class="hot99">
      <div class="hot99-top">
        <button class="btn btn-ghost btn-sm" onclick="App._gw99Back()">← 图书馆门厅</button>
        <span class="hot99-title">🔥 实时热搜</span>
        <div class="hot99-tabs">
          <button class="hot99-tab${board === 'wy' ? ' on' : ''}" onclick="App._hot99BoardSet('wy')">🎬 文娱热点</button>
          <button class="hot99-tab${board === 'sz' ? ' on' : ''}" onclick="App._hot99BoardSet('sz')">📰 时政要闻</button>
        </div>
        <button class="hot99-rfall" onclick="App._hot99RefreshAll()">🔄 刷新</button>
      </div>
      <div class="hot99-note">
        📥 数据实时拉取（5 分钟缓存 · 页面停留每 5 分钟自动续热）· 文娱：微博热搜 / 抖音热点 / 知乎热榜 / B站热搜 · 时政：头条热榜 / 每日要闻（60 秒读懂世界）/ 人民网时政。<br>
        📋 点每条右侧的复制键一键复制标题（自媒体选题）；点整条打开原文/搜索。
      </div>
      ${secs}
      <div style="margin-top:4px"><button class="btn btn-ghost" onclick="App._gw99Back()">← 返回图书馆门厅</button></div>
    </div>`;
  },
});
