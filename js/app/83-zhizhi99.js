// 83-zhizhi99.js —— v12.3 【致知】收音机：新闻的电台化改造
// [功能组] G3-学习成长（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// 原「新闻速递（news_*）」收音机化：
//   · 木质收音机面板 + 调频刻度盘 + 指针 + 信号灯——点击电台即「调频播放」
//   · 7 个电台：FM 87.7 今日播报（聚合播报 + 实时新闻）+ 6 类新闻台（复用 _fetchNewsForCategory 数据）
//   · 播报流：新闻逐条自动推进展示；配浏览器语音合成（SpeechSynthesis）朗读标题与摘要
//     —— 无 TTS 环境静默降级为纯视觉播报（不报错不卡顿）
//   · 实时新闻：今日播报台尝试经 RSS→JSON 代理拉取人民网时政头条（3.5s 超时，缓存 2h，失败回退本地新闻池）
//   · 旧路由 news_* 安全重定向至致知对应电台（书签兼容）
// 电台哲学：「致知在格物」之后，耳朵也要有它的路——听新闻，也是一种读书。
Object.assign(App, {
  // ==================== 收音机状态 ====================
  _zz99On: null,        // 当前电台 key（null = 关机）
  _zz99Idx: 0,          // 当前播报条目序号
  _zz99Speaking: false, // 是否正在朗读
  _zz99Live: null,      // 今日播报的实时头条缓存 { items, ts, ok }

  // ==================== 主入口（路由 App.gotoWb('zhizhi99')）====================
  _wbZhizhi99(wb, W) {
    const stations = this._zz99Stations();
    const cur = this._zz99On ? stations.find(s => s.key === this._zz99On) : null;
    // v12.9.40 实时化：进台即静默拉实时源（缓存 >10 分钟才真拉），到达后若仍在该台自动重渲染
    try {
      if (cur) this._zz99LiveRefresh(cur.key);
      this._zz99AutoTick();
    } catch (e) {}
    if (cur) return this._zz99StationView(cur);
    return this._zz99RadioView(stations);
  },

  // ==================== 电台清单（今日播报 + 6 新闻台）====================
  _zz99Stations() {
    const cats = (CONFIG.newsCategories || {});
    const freqs = [ // 虚构频段，纯氛围（v12.9.40 七台全部实时源化）
      { key: 'daily',        fm: 'FM 87.7', name: '今日播报', ico: '📡', color: '#7c3aed', sub: '阿福主播 · 聚合要闻 · 实时' },
      { key: 'politics',     fm: 'FM 90.1', name: '国内时政', ico: '🇨🇳', color: '#dc2626', sub: '人民网时政 · 实时' },
      { key: 'international', fm: 'FM 93.5', name: '国际新闻', ico: '🌍', color: '#2563eb', sub: '人民网国际 · 实时' },
      { key: 'economy',      fm: 'FM 96.8', name: '经济金融', ico: '📈', color: '#ca8a04', sub: '人民网财经 · 实时' },
      { key: 'livelihood',   fm: 'FM 99.3', name: '民生人文', ico: '🏡', color: '#16a34a', sub: '人民网社会 · 实时' },
      { key: 'scitech',      fm: 'FM 102.6', name: '科技航天', ico: '🚀', color: '#0891b2', sub: 'IT之家 · 实时' },
      { key: 'foreign',      fm: 'FM 106.9', name: '外刊英语', ico: '📰', color: '#ea580c', sub: 'BBC World · 实时' },
    ];
    return freqs;
  },

  // ==================== 关机视图：收音机面板 ====================
  _zz99RadioView(stations) {
    const dial = stations.map((s, i) => `
      <button class="zz99-dial-station" style="--c:${s.color}" onclick="App._zz99Tune('${s.key}')">
        <span class="zz99-fm">${s.fm}</span>
        <span class="zz99-name">${s.ico} ${this.esc(s.name)}</span>
        <span class="zz99-sub">${this.esc(s.sub)}</span>
      </button>`).join('');
    return `
    <div class="zz99-radio">
      <div class="zz99-hero">
        <div class="zz99-hero-title">📻 致知 · 收音机</div>
        <div class="zz99-hero-sub">7 个电台 · 点击调频播放 · 支持语音播报（浏览器朗读）</div>
        <div class="zz99-hero-quote">「致知在格物，物格而后知至。」——读完书，来听听世界。</div>
      </div>
      <div class="zz99-panel">
        <div class="zz99-panel-top">
          <div class="zz99-brand">ONE-XING <span>RADIO</span></div>
          <div class="zz99-power" id="zz99Power"><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="zz99-scale">
          <div class="zz99-scale-line"></div>
          ${stations.map((s, i) => `<span class="zz99-scale-tick" style="left:${6 + i * 14.6}%">|<b>${s.fm.split(' ')[1]}</b></span>`).join('')}
        </div>
        <div class="zz99-dial">${dial}</div>
        <div class="zz99-panel-foot">
          <span class="zz99-led" id="zz99Led"></span>
          <span class="zz99-foot-txt">${this._zz99TtsOk() ? '🔊 手机客户端：点电台用系统人声自动朗读新闻' : '🔇 语音播报为手机客户端专属——本机将以文字流播报'}</span>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title"><span class="ico">💡</span>这台收音机怎么听</div>
        <div style="font-size:12.5px;color:var(--text-soft);line-height:1.9;margin-top:6px">
          <b>七个台全部接入实时新闻源</b>（人民网时政/国际/财经/社会 · IT之家 · BBC World）：调台自动拉取最新 RSS（10 分钟缓存，
          收听中每分钟后台续热，页面随时可点 🔄 强制刷新）；实时源未响应时自动回退本地新闻池，不会空台。
          <b>FM 87.7 今日播报</b>是阿福主播的聚合台：开台白 → 实时头条 → 六大电台各一条要闻 → 结束语，一口气听完今天的世界。
          播报中随时可以「暂停 / 下一台」。
        </div>
      </div>
      <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button> <button class="btn btn-ghost" onclick="App.gotoWb('gewu99')">📚 去【格物】读书</button></div>
    </div>`;
  },

  // ==================== 电台视图：播报流 ====================
  _zz99StationView(st) {
    const items = this._zz99Items(st.key);
    const idx = Math.min(this._zz99Idx, Math.max(0, items.length - 1));
    const cur = items[idx];
    const list = items.map((n, i) => `
      <div class="zz99-item${i === idx ? ' on' : (i < idx ? ' past' : '')}" onclick="App._zz99Jump(${i})">
        <span class="zz99-item-no">${String(i + 1).padStart(2, '0')}</span>
        <div class="zz99-item-bd">
          <div class="zz99-item-t">${n.icon || ''} ${this.esc(n.title)}</div>
          <div class="zz99-item-s">${this.esc(String(n.summary || '').slice(0, 64))}${(n.summary || '').length > 64 ? '…' : ''}</div>
        </div>
        ${i === idx ? '<span class="zz99-item-live">正在播报</span>' : ''}
      </div>`).join('');
    // v12.9.40 实时状态条：全部七台显示实时源 + 更新时间 + 手动刷新
    const liveInfo = st.key === 'daily' ? (this._zz99Live || {}) : (this._zz99CatCache(st.key) || {});
    const minsAgo = liveInfo.ts ? Math.max(0, Math.round((Date.now() - liveInfo.ts) / 60000)) : null;
    const liveTag = `
      <div class="zz99-live-tag">
        <span>${liveInfo.ok ? '🌐 实时新闻 · ' + this.esc(liveInfo.srcName || 'RSS') : '📼 本地新闻池（实时源未响应）'}</span>
        ${liveInfo.ok && minsAgo !== null ? `<span class="zz99-live-ts">${minsAgo < 1 ? '刚刚' : minsAgo + ' 分钟前'}更新</span>` : ''}
        <button class="zz99-live-rf" onclick="App._zz99ManualRefresh()" title="立即刷新实时新闻">🔄 刷新</button>
      </div>`;
    return `
    <div class="zz99-onair" style="--c:${st.color}">
      <div class="zz99-onair-top">
        <button class="btn btn-ghost btn-sm" onclick="App._zz99Off()">⏻ 关机</button>
        <span class="zz99-onair-fm">${st.fm}</span>
        <span class="zz99-onair-name">${st.ico} ${this.esc(st.name)}</span>
        <span class="zz99-onair-led"><i></i> ON AIR</span>
      </div>
      ${liveTag}
      <div class="zz99-now" id="zz99Now">
        <div class="zz99-now-tag">${cur.icon || '📰'} ${this.esc(cur.tag || '要闻')}</div>
        <div class="zz99-now-t">${this.esc(cur.title)}</div>
        <div class="zz99-now-s">${this.esc(cur.summary || '')}</div>
        ${cur.englishTitle ? `<div class="zz99-now-en">EN · ${this.esc(cur.englishTitle)}</div>` : ''}
        <div class="zz99-now-meta">${this.esc(cur.source || '')} · ${this.esc(cur.date || '')} · 第 ${idx + 1} / ${items.length} 条</div>
      </div>
      <div class="zz99-ctrl">
        <button class="zz99-btn" onclick="App._zz99Play()">${this._zz99Speaking ? '⏸ 暂停' : '▶ 播放'}</button>
        <button class="zz99-btn" onclick="App._zz99Next()">⏭ 下一台</button>
        <button class="zz99-btn" onclick="App._zz99Stop()">⏹ 停止</button>
        ${cur.url ? `<a class="zz99-btn zz99-link" href="${this.esc(cur.url)}" target="_blank" rel="noopener">🔗 原文</a>` : ''}
      </div>
      <div class="zz99-list">${list}</div>
      <div style="margin-top:12px"><button class="btn btn-ghost btn-sm" onclick="App._zz99Off()">← 返回收音机面板</button></div>
    </div>`;
  },

  // ==================== 电台条目（daily = 聚合 + 实时；其余 = 分类新闻）====================
  _zz99Items(key) {
    if (key === 'daily') return this._zz99DailyItems();
    const items = this._fetchNewsForCategory ? this._fetchNewsForCategory(key) : [];
    return items && items.length ? items : [];
  },
  // 今日播报：开台白 + 六台各头条 + 结束语（实时优先，回退本地）
  _zz99DailyItems() {
    const intro = {
      tag: '开台白', icon: '📡', title: '一人行电台 · 今日播报', source: '阿福', date: (typeof Store !== 'undefined' && Store.today) ? Store.today() : '',
      summary: `现在是北京时间 ${this._zz99ClockText()}。阿福为你播报今天的要闻：接下来是六大电台各一条头条，大约五分钟。世界很大，你一个人也在好好生活。`,
    };
    const outro = {
      tag: '结束语', icon: '🌙', title: '今日播报到此结束', source: '阿福', date: '',
      summary: '以上就是今天的全部要闻。感谢收听一人行电台——去读书，去睡觉，去好好吃饭。明天见。',
    };
    const heads = [];
    ['politics', 'international', 'economy', 'livelihood', 'scitech', 'foreign'].forEach(k => {
      const cat = (CONFIG.newsCategories || {})[k];
      const items = this._fetchNewsForCategory ? this._fetchNewsForCategory(k) : [];
      if (cat && items && items.length) {
        const h = Object.assign({}, items[0]);
        h.tag = cat.title; // 标注来源电台
        heads.push(h);
      }
    });
    // 实时头条插在开台白之后（拉取成功时）
    let live = [];
    if (this._zz99Live && this._zz99Live.ok && this._zz99Live.items && this._zz99Live.items.length) {
      live = this._zz99Live.items.slice(0, 3).map(x => ({
        tag: '实时', icon: '🌐', title: x.title || '', summary: x.summary || x.description || '',
        source: x.source || '人民网', date: String(x.pubDate || '').slice(0, 10), url: x.link || '',
      }));
    }
    return [intro].concat(live).concat(heads).concat([outro]);
  },

  // ==================== v12.9.40 实时新闻引擎（七台全部实时源化）====================
  // 六大分类台 RSS 源（RSS→JSON 代理 · 10 分钟缓存 · 失败回退本地静态池）
  _zz99Feeds() {
    return {
      politics:     { rss: 'http://www.people.com.cn/rss/politics.xml', src: '人民网·时政', srcName: '人民网 RSS' },
      international:{ rss: 'http://www.people.com.cn/rss/world.xml', src: '人民网·国际', srcName: '人民网 RSS' },
      economy:      { rss: 'http://www.people.com.cn/rss/finance.xml', src: '人民网·财经', srcName: '人民网 RSS' },
      livelihood:   { rss: 'http://www.people.com.cn/rss/society.xml', src: '人民网·社会', srcName: '人民网 RSS' },
      scitech:      { rss: 'https://www.ithome.com/rss/', src: 'IT之家', srcName: 'IT之家 RSS' },
      foreign:      { rss: 'http://feeds.bbci.co.uk/news/world/rss.xml', src: 'BBC World', srcName: 'BBC World RSS' },
    };
  },
  // 分类台实时缓存读取（渲染态用）
  _zz99CatCache(key) {
    try { return JSON.parse(localStorage.getItem('zz99_cat_' + key) || 'null') || null; } catch (e) { return null; }
  },
  // 拉取某一分类台的实时 RSS（10 分钟 TTL · 4.5s 超时 · 失败保留旧缓存不落盘）
  async _zz99FetchCategory(key, force) {
    const feed = this._zz99Feeds()[key];
    if (!feed) return null;
    try {
      const cache = this._zz99CatCache(key);
      if (!force && cache && cache.ok && (Date.now() - (cache.ts || 0)) < 10 * 60 * 1000) return cache;
    } catch (e) {}
    try {
      const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed.rss);
      const ctrl = new AbortController();
      const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 4500);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      const j = await res.json().catch(() => ({}));
      if (j && j.status === 'ok' && Array.isArray(j.items) && j.items.length) {
        const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const items = j.items.slice(0, 8).map(it => ({
          id: 'live_' + key + '_' + String(it.guid || it.link || Math.random()).slice(-24),
          title: strip(it.title).slice(0, 90),
          summary: strip(it.description || it.content).slice(0, 140),
          source: feed.src, tag: '实时',
          icon: '🌐', url: it.link || '',
          date: String(it.pubDate || '').slice(0, 16),
        }));
        const data = { ok: true, ts: Date.now(), srcName: feed.srcName, items, __fetched: true };
        // v12.9.56 __fetched 标记不落盘（仅本次调用可见：真拉了网络才触发收音机重渲染）
        try { const persist = Object.assign({}, data); delete persist.__fetched; localStorage.setItem('zz99_cat_' + key, JSON.stringify(persist)); } catch (e) {}
        return data;
      }
      throw new Error('bad payload');
    } catch (e) {
      // 失败：保留上次成功缓存（页面继续显示旧实时条目 + 更新时间）
      return this._zz99CatCache(key);
    }
  },
  // 静默刷新当前台（force=绕过 TTL 立即拉）：到达后若仍在该台自动重渲染
  // v12.9.56 卡死根治（重入守卫）：_wbZhizhi99 渲染时会同步调本函数（缓存 TTL 内同步 resolve），
  //   旧版 then 里无条件 render_workbench → 渲染又触发本函数 → 无限微任务循环把主线程饿死
  //   （致知台「点击播放后卡死」的真凶——与 TTS/桥无关，网页版与真机同中招）。
  //   两道守卫：① 同 key 1.5 秒窗口内不重入（微任务风暴直接掐断）；② 仅当「force 或本次真正
  //   发起了网络拉取（__fetched）」才重渲染——缓存命中数据没变，无需重画。
  _zz99LiveRefresh(key, force) {
    const now = Date.now();
    if (!force && this._zz99LRKey === key && (now - (this._zz99LRAt || 0)) < 1500) return Promise.resolve();
    this._zz99LRKey = key; this._zz99LRAt = now;
    const p = key === 'daily' ? this._zz99FetchLive(force) : this._zz99FetchCategory(key, force);
    return Promise.resolve(p).then((r) => {
      if (!force && !(r && r.__fetched)) return;     // 缓存命中/拉取失败：数据未变，不重渲染（断循环）
      if (this.currentView === 'workbench' && this._wbView === 'zhizhi99' && this._zz99On === key) {
        try { this.render_workbench(); } catch (e) {}
      }
    }).catch(() => {});
  },
  // 手动刷新按钮（强制绕过 TTL）
  _zz99ManualRefresh() {
    const key = this._zz99On;
    if (!key) return;
    this._flash('🔄 正在拉取实时新闻…');
    this._zz99LiveRefresh(key, true);
  },
  // v12.9.40 后台实时心跳：致知在屏时每 60s 静默续热（缓存 >10 分钟才真拉，防刷代理）
  _zz99AutoTick() {
    if (this._zz99Tick) return;
    this._zz99Tick = setInterval(() => {
      try {
        if (this.currentView !== 'workbench' || this._wbView !== 'zhizhi99' || !this._zz99On) return;
        this._zz99LiveRefresh(this._zz99On);
      } catch (e) {}
    }, 60000);
  },

  // ==================== 实时新闻（今日播报台：人民网时政 RSS，10 分钟缓存）====================
  async _zz99FetchLive(force) {
    try {
      const cache = JSON.parse(localStorage.getItem('zz99_live_cache') || 'null');
      if (!force && cache && cache.ts && (Date.now() - cache.ts) < 10 * 60 * 1000 && cache.ok) {
        this._zz99Live = cache; return cache;
      }
    } catch (e) {}
    const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('http://www.people.com.cn/rss/politics.xml');
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 4500);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      const j = await res.json().catch(() => ({}));
      if (j && j.status === 'ok' && Array.isArray(j.items) && j.items.length) {
        const data = { ok: true, ts: Date.now(), srcName: '人民网 RSS', items: j.items.slice(0, 6), __fetched: true };
        this._zz99Live = data;
        // v12.9.56 __fetched 标记不落盘（仅本次调用可见：真拉了网络才触发收音机重渲染）
        try { const persist = Object.assign({}, data); delete persist.__fetched; localStorage.setItem('zz99_live_cache', JSON.stringify(persist)); } catch (e) {}
        return data;
      }
      throw new Error('bad payload');
    } catch (e) {
      // 失败：优先沿用上次成功缓存（哪怕已过期），否则本地池
      const old = (() => { try { return JSON.parse(localStorage.getItem('zz99_live_cache') || 'null'); } catch (_) { return null; } })();
      this._zz99Live = old && old.items && old.items.length ? old : { ok: false, ts: Date.now(), items: [] };
      return this._zz99Live;
    }
  },

  // ==================== 电台控制 ====================
  _zz99Tune(key) {
    if (this._home99RadioOn) { this._home99RadioOn = false; this._m99BtnSyncRadio(); }  // v12.9.13 首页播音机让位
    this._zz99On = key;
    this._zz99Idx = 0;
    // v12.9.40 七台全实时：调台即强制拉实时源，先渲染（缓存/本地池）到达后自动重渲染
    this.gotoWb('zhizhi99');
    this._zz99LiveRefresh(key, true);
  },
  _zz99Off() {
    this._zz99StopSpeak();
    this._zz99On = null;
    this._zz99Idx = 0;
    this._zz99Speaking = false;
    this.gotoWb('zhizhi99');
  },
  _zz99Jump(i) {
    this._zz99Idx = i;
    this.gotoWb('zhizhi99');
    this._zz99SpeakCur();
  },
  _zz99Next() {
    const items = this._zz99Items(this._zz99On);
    this._zz99StopSpeak();
    this._zz99Speaking = false;
    this._zz99Idx = Math.min(this._zz99Idx + 1, Math.max(0, items.length - 1));
    this.gotoWb('zhizhi99');
    this._zz99SpeakCur();
  },
  _zz99Stop() {
    this._zz99StopSpeak();
    this._zz99Speaking = false;
    const el = document.getElementById('zz99Now');
    if (el) el.classList.remove('speaking');
    this._flash('⏹ 播报已停止');
    this.gotoWb('zhizhi99');   // v12.9.14 播放按钮 ⏸→▶ 即时复位（同页重渲染 · 滚动位置保持）
  },
  _zz99Play() {
    if (this._zz99Speaking) { this._zz99StopSpeak(); this._zz99Speaking = false; this.gotoWb('zhizhi99'); return; }
    this._zz99SpeakCur();
  },
  _zz99SpeakCur() {
    const items = this._zz99On ? this._zz99Items(this._zz99On) : [];
    if (!items.length) return;
    const cur = items[Math.min(this._zz99Idx, items.length - 1)];
    // v12.9.14 标题与正文之间 ¶ 分段（播报停顿稍长像真人换气）；读完自动下一条（条间 800ms 段落气口）
    const text = `${cur.title || ''}。\n${cur.summary || ''}`;
    this._zz99Speak(text, () => {
      this._zz99Speaking = false;
      if (this._zz99On && this._zz99Idx < items.length - 1)
        setTimeout(() => { if (this._zz99On && this._zz99Idx < items.length - 1) this._zz99Next(); }, 800);
    });
    this._zz99Speaking = !!this._zz99TtsOk();
    this.gotoWb('zhizhi99');
  },

  // ==================== v12.9.59 TTS 封装（@capacitor-community/text-to-speech · 复用全局实例）====================
  // 重做根因：安卓 WebView 不带语音合成内核（window.speechSynthesis 不存在）→ 旧版弹「当前浏览器不支持」。
  //   人声全部走系统 TTS 引擎（95-native99.js 统一封装——同一引擎实例，绝不重复新建；
  //   引擎缺失/失败 → 95 层统一友好提示一次，绝不弹「插件找不到」报错弹窗）。
  //   播报风格保留：约 140-150 字/分舒缓语速、中低音 pitch 0.88、每句微变速微变调（拒绝机器念稿感）；
  //   标点四档停顿：段落 900ms / 句末 620ms / 分句 470ms / 逗顿 330ms（呼吸气口）。
  //   官方插件 speak() 在整段朗读完成时 resolve——顺序播报链直接 await 推进，无需事件猜时长。
  _zz99TtsOk() {
    return !!this._tts99();   // 客户端系统 TTS 恒可用；网页版无语音（调用方提示，不判断浏览器）
  },
  _zz99Speak(text, onEnd) {
    if (!this._tts99()) return;           // 网页版：无语音，不朗读也不自动推进（文字流停留当前条，手动下一台）
    const token = (this._zz99Token = (this._zz99Token || 0) + 1);   // 取代旧播报的取消令牌
    const raw = String(text || '').slice(0, 600).replace(/\s*\n+\s*/g, '¶');  // 换行 → 段落长停顿标记
    // 分句：按中文标点切分（标点保留在句内 · 段落/句末/分句/逗顿四档停顿）
    const parts = (raw.match(/[^。！？；，、!?;,.¶]+[。！？；，、!?,.;¶]*/g) || []).map(s => s.trim()).filter(Boolean);
    if (!parts.length) parts.push(raw.replace(/¶/g, '').trim());
    let i = 0;
    const jitter = (base, amp) => Math.max(0.5, base + (Math.random() - 0.5) * 2 * amp);
    const speakNext = async () => {
      if (token !== this._zz99Token) return;                    // 已被新播报/停止取代
      if (i >= parts.length) { if (onEnd) { try { onEnd(); } catch (e) {} } return; }
      const seg = parts[i++];
      const gap = /¶/.test(seg) ? 900                                    // 段落之间停顿稍长（呼吸气口）
        : (/[。！？!?]\s*$/.test(seg) ? 620 : (/[；;]/.test(seg) ? 470 : 330));  // 句末 / 分句 / 逗顿
      // 逐段朗读（speak 完成即 resolve → 气口停顿 → 下一段；失败 → 95 层友好提示 + 停链）
      const ok = await this._tts99Speak(seg.replace(/¶/g, ''), {
        lang: 'zh-CN', rate: jitter(i === 1 ? 0.78 : 0.81, 0.015), pitch: jitter(0.88, 0.02),
      });
      if (token !== this._zz99Token) return;
      if (!ok) return this._zz99TtsFail();                      // 引擎失效：停链（提示由 95 层统一去重）
      setTimeout(speakNext, gap);
    };
    speakNext();
  },
  // TTS 失败统一出口：停链 + 停自动连播（友好提示由 95-native99 层统一处理，这里只复位状态）
  _zz99TtsFail() {
    try { this._zz99StopSpeak(); } catch (e) {}
    this._zz99On = null;                    // 停止自动连播（旧版会无限空转下一条 = 卡死）
    this._zz99Speaking = false;
    this._home99RadioOn = false;            // 首页播音机同步让位
    if (this._m99BtnSyncRadio) { try { this._m99BtnSyncRadio(); } catch (e) {} }
  },
  _zz99StopSpeak() {
    this._zz99Token = (this._zz99Token || 0) + 1;              // 令牌失效：链式停顿不再推进
    this._tts99Stop();                                          // 官方插件 stop（立即截断）
  },
  // ==================== v12.9.13 首页播音机：立即播放「今日播报」（不离开首页）====================
  home99Radio() {
    if (this._home99RadioOn) { this.home99RadioStop(); return; }
    if (!this._zz99TtsOk()) { this._flash('📻 语音播报走手机系统人声——请在一人行手机客户端收听'); return; }
    if (this._m99Playing) this.music99Stop();   // v12.9.16 统一播放器：播报与音乐互斥（单选播放其中之一）
    this._home99RadioOn = true;
    this._home99RadioIdx = 0;
    this._m99BtnSyncRadio();
    this._flash('📻 阿福开始播报今日要闻');
    this._zz99FetchLive().catch(() => {});   // 实时头条异步拉取（本次或下次播报生效）
    this._home99RadioSeq();
  },
  _home99RadioSeq() {
    if (!this._home99RadioOn) return;
    const items = this._zz99Items('daily');
    if (!items.length) { this.home99RadioStop(); return; }
    const cur = items[Math.min(this._home99RadioIdx, items.length - 1)];
    // v12.9.14 标题→摘要 ¶ 分段长停顿；新闻条目之间停 850ms（段落感 + 呼吸气口）
    this._zz99Speak(`${cur.title || ''}。\n${cur.summary || ''}`, () => {
      if (!this._home99RadioOn) return;
      setTimeout(() => {
        if (!this._home99RadioOn) return;
        this._home99RadioIdx += 1;
        if (this._home99RadioIdx < items.length) this._home99RadioSeq();
        else this.home99RadioStop();
      }, 850);
    });
  },
  home99RadioStop(silent) {
    const was = !!this._home99RadioOn;
    this._home99RadioOn = false;
    this._zz99StopSpeak();
    this._m99BtnSyncRadio();
    if (was && !silent) this._flash('⏹ 今日播报已停止');
  },
  _m99BtnSyncRadio() {
    // v12.9.16 首页播放按钮已合一（📻 同时承载音乐/播报状态）→ 统一交给 63-music99 的按钮同步
    if (this._m99BtnSync) { try { this._m99BtnSync(); } catch (e) {} }
  },
  _zz99ClockText() {
    const d = (typeof Store !== 'undefined' && Store.nowBeijing) ? Store.nowBeijing() : new Date();
    const t = new Date(d);
    return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
  },
});
