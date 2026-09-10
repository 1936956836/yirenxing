// 102-video99.js —— v12.9.47 【独行视频】聚合搜索 + 液态玻璃播放器（长按底部【记录】旋钮 1 秒进入）
// [功能组] G5-情感陪伴 / G6-专注模式（观影域：治愈像素风 · 深色液态玻璃 · 白字辉光）
//
// 设计（用户规则 · 独行视频）：
//   · 入口：底部导航【记录】旋钮长按 1 秒（液体音 + 紫红圆幕渐变过渡，与独行音乐/地球一致）
//   · 播放两种方式：① 关键词搜索——多源片库聚合（量子/卧龙/非凡/暴风 · 免 key 直连 + 三重
//     CORS 代理链兜底），多线路自动优选（优先 4K/8K/HDR/1080/蓝光标记的片源），剧集选集 +
//     上一集/下一集；② 粘贴链接直放（mp4 / m3u8 / flv / mpd / 直链）
//   · 短视频解析：粘贴抖音 / 快手分享链接 → 自动解析无水印视频流（hdplay 优先于 wmplay，
//     从源头去水印）→ 解析中展示「正在解析，自动去除水印…」加载动画；失败给文字提示
//   · 播放内核：原生 video + 按需加载 hls.js / flv.js / dash.js（在线增强，离线自动降级——
//     与全 App 零依赖原则一致，APK 离线体积零增加；Android WebView / iOS Safari 原生 HLS 直放）
//     倍速 0.5–3x · 线路/画质切换（HLS 分档锁定）· 音轨切换 · 字幕（.srt/.vtt 导入，
//     SRT→WebVTT 自动转换，同名自动匹配多语言字幕）
//   · 横竖屏：竖屏右下 🔄 液态玻璃横屏键 → 全屏横屏（客户端 Capacitor ScreenOrientation
//     原生 lock/unlock 优先；网页走 Fullscreen + orientation.lock，均不支持时 CSS 旋转兜底）
//     横屏右上「返回竖屏」· 重力感应自动切换（设置可关 · 仅触屏设备）
//     横屏隐藏状态栏/导航栏（Fullscreen 沉浸）· 控件适配横屏布局（底部控制条 + 右侧竖排微调键）
//   · 手势：左右滑快进/快退（实时预览）· 左半上下滑独立亮度（不依赖系统亮度）· 右半上下滑音量
//   · 播放记忆：退出自动记进度（节流 5s 落盘），再次打开从上次位置续播；定时关闭（15/30/60/90 分钟
//     或播完本集）；播放列表 / 收藏 / 历史 / 本地视频（IndexedDB 落盘刷新不丢 · 支持拖放导入）
//   · 合规：首次打开弹合规声明；片卡与侧栏「🔗 正版直达」一键跳转芒果TV/爱奇艺/腾讯视频等官方
//     搜索——坚决反对盗版，支持正版；去水印仅限个人观看
Object.assign(App, {

  // ==================== 常量 ====================
  // 长视频片库聚合（苹果CMS JSON · 免 key · 多源容灾：直连失败走公共 CORS 代理链）
  // v12.9.48 资源装载扩展（libretv 同源公开 CMS 接口 · 实测筛选）：新增 电影天堂/百度/360 三源（七源并发），
  //   综艺新番覆盖大幅提升（花儿与少年全季 / 披荆斩棘等）；排前的源实测响应快，供增量渲染先出结果
  VIDEO99_SITES: [
    { n: '量子源', u: 'https://cj.lziapi.com/api.php/provide/vod/' },
    { n: '非凡源', u: 'https://api.ffzyapi.com/api.php/provide/vod/' },
    { n: '电影天堂', u: 'https://caiji.dyttzyapi.com/api.php/provide/vod/' },
    { n: '百度源', u: 'https://api.apibdzy.com/api.php/provide/vod/' },
    { n: '360源', u: 'https://360zy.com/api.php/provide/vod/' },
    { n: '卧龙源', u: 'https://collect.wolongzy.cc/api.php/provide/vod/' },
    { n: '暴风源', u: 'https://bfzy.tv/api.php/provide/vod/' },
  ],
  // 三重公共 CORS 代理链（任一成功即用 · 与独行音乐同款）
  VIDEO99_PROXY: [
    (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    (u) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
    (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
  ],
  // 正版平台（一键跳转 · 引导正版）
  VIDEO99_OFFICIAL: [
    { n: '爱奇艺', ico: '🟢', u: 'https://so.iqiyi.com/so/q_' },
    { n: '腾讯视频', ico: '🐧', u: 'https://v.qq.com/x/search/?q=' },
    { n: '芒果TV', ico: '🥭', u: 'https://so.mgtv.com/so?k=' },
    { n: '优酷', ico: '📺', u: 'https://so.youku.com/search_video_q_' },
    { n: '哔哩哔哩', ico: '🎞️', u: 'https://search.bilibili.com/all?keyword=' },
  ],
  VIDEO99_RATES: [0.5, 0.75, 1, 1.25, 1.5, 2, 3],

  // ==================== 状态 ====================
  _video99Rt: null,

  // ==================== 页面 ====================
  render_video99() {
    const v = document.getElementById('view-video99');
    if (!v) return;
    const rt = this._video99Rt = this._video99Rt || {
      tab: 'search', kw: '', results: null, searching: false,
      cur: null, vod: null, sources: [], srcIdx: 0, eps: [], epIdx: 0,
      rate: 1, vol: Math.max(0, Math.min(1, +(localStorage.getItem('video99_vol') || 0.8))),
      bri: Math.max(0.1, Math.min(1, +(localStorage.getItem('video99_bri') || 1))),
      land: false, seeking: false, subOn: '',
      hls: null, libFlv: null, libDash: null,
      autoOri: localStorage.getItem('video99_autoori') !== '0',
      remember: localStorage.getItem('video99_remember') !== '0',
      autoNext: localStorage.getItem('video99_autonext') !== '0',
      sleepEnd: 0, sleepAfterEp: false, sleepLeft: 0,
      hideT: 0, lastSave: 0,
      agreed: localStorage.getItem('video99_ok') === '1',
    };
    v.innerHTML = `
      <div class="video99-stage" id="video99Stage">
        <div class="video99-top">
          <button class="video99-gbtn-s" onclick="App.navBack()" title="返回">←</button>
          <div class="video99-searchbar">
            <input id="video99Kw" class="video99-input" placeholder="搜片名，或粘贴链接（mp4 / m3u8 / 抖音 / 快手）" enterkeyhint="search" onkeydown="if(event.key==='Enter')App._video99Go()">
            <button class="video99-go" onclick="App._video99Go()" title="搜索 / 播放链接">🔍</button>
          </div>
          <button class="video99-gbtn-s" onclick="App._video99Official()" title="正版直达">🔗</button>
          <button class="video99-gbtn-s" onclick="App._video99Settings()" title="播放设置">⚙️</button>
        </div>
        <div class="video99-tabs">
          <button class="video99-tab" data-t="search" onclick="App._video99SetTab('search')">🔍 搜索</button>
          <button class="video99-tab" data-t="queue" onclick="App._video99SetTab('queue')">▶️ 播放列表</button>
          <button class="video99-tab" data-t="fav" onclick="App._video99SetTab('fav')">⭐ 收藏</button>
          <button class="video99-tab" data-t="hist" onclick="App._video99SetTab('hist')">🕘 历史</button>
          <button class="video99-tab" data-t="local" onclick="App._video99SetTab('local')">📁 本地</button>
        </div>
        <div class="video99-main" id="video99Main"></div>

        <!-- 播放器（液态玻璃 · 横竖屏自适应） -->
        <div class="video99-frame" id="video99Frame" style="display:none">
          <video id="video99V" playsinline webkit-playsinline x5-playsinline preload="metadata"></video>
          <div class="video99-dim" id="video99Dim"></div>
          <div class="video99-load" id="video99Load"><i></i><span>缓冲中…</span></div>
          <div class="video99-chip" id="video99Chip"></div>
          <div class="video99-ctl" id="video99Ctl">
            <div class="video99-ctl-top">
              <span class="video99-title" id="video99Title"></span>
              <span class="video99-q" id="video99Q">自动</span>
              <span class="video99-sleepchip" id="video99SleepChip"></span>
            </div>
            <div class="video99-bar">
              <span class="video99-time" id="video99Cur">00:00</span>
              <input type="range" id="video99Seek" class="video99-seek" min="0" max="1000" step="1" value="0">
              <span class="video99-time" id="video99Dur">00:00</span>
            </div>
            <div class="video99-btns">
              <button class="video99-cbtn" id="video99Prev" title="上一集">⏮</button>
              <button class="video99-cbtn big" id="video99Play" title="播放 / 暂停">▶</button>
              <button class="video99-cbtn" id="video99Next" title="下一集">⏭</button>
              <button class="video99-cbtn" id="video99Rate" title="倍速">1x</button>
              <button class="video99-cbtn" id="video99CC" title="字幕">CC</button>
              <button class="video99-cbtn" id="video99EpsBtn" title="选集">☰</button>
              <button class="video99-cbtn" id="video99Timer" title="定时关闭">⏲</button>
              <button class="video99-cbtn" id="video99Panel" title="线路 · 画质 · 音轨">🎛</button>
              <button class="video99-cbtn" id="video99Mute" title="静音">🔊</button>
              <input type="range" id="video99Vol" class="video99-vol" min="0" max="100" step="1" value="${Math.round(rt.vol * 100)}" title="音量">
            </div>
          </div>
          <button class="video99-rot" id="video99Rot" title="横屏播放">🔄</button>
          <button class="video99-close" id="video99Close" title="关闭播放器">✕</button>
          <button class="video99-backport" id="video99BackPort" title="返回竖屏">📱 返回竖屏</button>
          <div class="video99-rail">
            <button onclick="App._video99VolN(0.1)" title="音量 +">🔊<small>+</small></button>
            <button onclick="App._video99VolN(-0.1)" title="音量 −">🔈<small>−</small></button>
            <button onclick="App._video99BriN(0.1)" title="亮度 +">☀️<small>+</small></button>
            <button onclick="App._video99BriN(-0.1)" title="亮度 −">🔅<small>−</small></button>
          </div>
          <div class="video99-eps" id="video99Eps" style="display:none">
            <div class="video99-eps-head">
              <span id="video99EpsTitle">选集</span>
              <button class="video99-mini" onclick="App._video99EpsToggle(false)">收起 ▼</button>
            </div>
            <div class="video99-srcpills" id="video99SrcPills"></div>
            <div class="video99-eps-grid" id="video99EpsGrid"></div>
          </div>
          <div class="video99-parse" id="video99Parse" style="display:none">
            <div class="video99-parse-spin"><i></i><i></i><i></i></div>
            <b>正在解析，自动去除水印…</b>
            <span>正在提取无水印视频流，请稍候（仅限个人观看，请勿盗用他人原创）</span>
          </div>
        </div>
        <input type="file" id="video99File" accept="video/*,.mp4,.webm,.mkv,.flv,.mov,.srt,.vtt" multiple style="display:none">
      </div>`;
    this._video99Dim();
    this._video99Paint();
    this._video99BindPlayer();
    this._video99BindDrop();
    if (!rt.agreed) this._video99Disclaimer();
    // 重进本页：续播上次影片（播放记忆）
    if (rt.cur && rt.cur.url) {
      if (rt.cur.kind === 'local') this._video99LocalPlay(String(rt.cur.k).slice(6));
      else this._video99Open(rt.cur.url, { resume: true });
    }
    // 定时器 + 重力感应（全局一次）
    if (!this.__video99Tick) {
      this.__video99Tick = setInterval(() => this._video99Ticker(), 3000);
      this.__video99OriH = () => {
        clearTimeout(this.__video99OriT);
        this.__video99OriT = setTimeout(() => this._video99OriChange(), 280);
      };
      window.addEventListener('orientationchange', this.__video99OriH);
      window.addEventListener('resize', this.__video99OriH);
    }
  },

  // ==================== 侧栏渲染 ====================
  _video99SetTab(t) {
    const rt = this._video99Rt;
    if (!rt || rt.tab === t) return;
    try { this._sfx99('tap'); } catch (e) {}
    rt.tab = t;
    this._video99Paint();
  },

  _video99Paint() {
    const rt = this._video99Rt;
    const box = document.getElementById('video99Main');
    if (!rt || !box) return;
    document.querySelectorAll('.video99-tab').forEach(t => t.classList.toggle('on', t.dataset.t === rt.tab));
    const esc = (s) => this.esc(s);
    if (rt.tab === 'local') { this._video99PaintLocal(); return; }

    let html = '';
    if (rt.tab === 'search') {
      if (rt.searching) {
        html = `<div class="video99-empty">🔎 正在全网片库搜索「${esc(rt.kw)}」…<small>量子 / 卧龙 / 非凡 / 暴风 四源并发中</small></div>`;
      } else if (rt.results == null) {
        html = `
          <div class="video99-hero">
            <div class="video99-hero-t">🎞️ 独行视频</div>
            <div class="video99-hero-p">一个人，也要把喜欢的片子认真看完。</div>
            <div class="video99-hero-grid">
              <div class="video99-hero-cell" onclick="App._video99HeroGo('热播')"><b>🔥</b><span>热播</span></div>
              <div class="video99-hero-cell" onclick="App._video99HeroGo('经典')"><b>🏆</b><span>经典</span></div>
              <div class="video99-hero-cell" onclick="App._video99HeroGo('动画')"><b>🎌</b><span>动画</span></div>
              <div class="video99-hero-cell" onclick="App._video99HeroGo('纪录片')"><b>🌍</b><span>纪录片</span></div>
              <div class="video99-hero-cell" onclick="App._video99HeroGo('喜剧')"><b>😂</b><span>喜剧</span></div>
              <div class="video99-hero-cell" onclick="App._video99HeroGo('悬疑')"><b>🕵️</b><span>悬疑</span></div>
            </div>
            <div class="video99-note">① 顶部输入片名搜索（多片库聚合 · 自动优选最高画质线路）<br>
              ② 粘贴视频链接直放（mp4 / m3u8 / flv / mpd）<br>
              ③ 粘贴抖音 · 快手分享链接 → 自动解析<b>无水印</b>播放<br>
              ④ 本地 tab 导入手机视频（IndexedDB 落盘 · 支持拖放）</div>
          </div>`;
      } else if (!rt.results.length) {
        html = `<div class="video99-empty">没有搜到相关影片<small>换个关键词试试，或点右上 🔗 去正版平台观看</small></div>`;
      } else {
        html = rt.results.map((v, i) => {
          const sources = this._video99VodSources(v);
          const nEps = sources.reduce((a, s) => a + s.eps.length, 0);
          const hq = sources.some(s => s.eps.some(e => /4K|8K|HDR|蓝光|1080/i.test(e.n || '')));
          const sub = [v.vod_year, v.vod_class && String(v.vod_class).split(',')[0], v.vod_remarks].filter(Boolean).join(' · ');
          return `
          <div class="video99-vod" onclick="App._video99PlayVod(${i})">
            <div class="video99-vod-pic" style="background-image:url('${esc(v.vod_pic || '')}')"></div>
            <div class="video99-vod-mid">
              <b>${esc(v.vod_name)}</b>
              <small>${esc(sub)}</small>
              <span class="video99-tags"><i>${nEps || 1} 集</i>${hq ? '<i class="hq">优选高清</i>' : ''}${sources.length > 1 ? '<i>' + sources.length + ' 线路</i>' : ''}</span>
            </div>
            <div class="video99-vod-ops">
              <button class="video99-mini" onclick="event.stopPropagation();App._video99VodFav(${i})" title="收藏">⭐</button>
              <button class="video99-mini" onclick="event.stopPropagation();App._video99Official('${esc(v.vod_name)}')" title="去正版观看">🔗</button>
            </div>
          </div>`;
        }).join('');
      }
      html += `
        <div class="video99-foot">
          <div class="video99-foot-t">🔗 正版直达 · 支持正版</div>
          <div class="video99-official">${this.VIDEO99_OFFICIAL.map(o =>
            `<button class="video99-mini" onclick="App._video99OpenTab('${o.u + encodeURIComponent(rt.kw || '')}')">${o.ico} ${o.n}</button>`).join('')}
          </div>
          <div>本播放器仅提供播放界面，资源来自互联网公开渠道，版权归原平台所有；坚决反对盗版，仅供个人学习交流。</div>
        </div>`;
    } else if (rt.tab === 'queue') {
      if (rt.eps && rt.eps.length) {
        html = `<div class="video99-sec-t">▶️ 当前播放列表 · ${esc(rt.vod ? rt.vod.vod_name : '')}（${rt.eps.length} 集 · ${esc((rt.sources[rt.srcIdx] || {}).name || '')}）</div>
          <div class="video99-eps-grid inlist">${rt.eps.map((e, i) =>
            `<button class="video99-ep${i === rt.epIdx ? ' on' : ''}" onclick="App._video99EpPlay(${i})">${esc(e.n || ('第' + (i + 1) + '集'))}</button>`).join('')}</div>`;
      } else {
        html = `<div class="video99-empty">播放列表为空<small>搜索影片选集播放，或粘贴链接直放</small></div>`;
      }
    } else if (rt.tab === 'fav') {
      const favs = this._video99FavData();
      html = favs.length ? `<div class="video99-sec-t">⭐ 我的收藏（${favs.length}）</div>` + favs.map(f => `
        <div class="video99-row">
          <div class="video99-row-mid" onclick="App._video99Replay('${esc(f.k)}')">
            <b>${esc(f.n)}</b><small>${esc(f.sub || '')} · ${new Date(f.at).toLocaleDateString()}</small>
          </div>
          <button class="video99-mini" onclick="App._video99FavDel('${esc(f.k)}')">🗑</button>
        </div>`).join('') : `<div class="video99-empty">还没有收藏<small>播放时点 ⭐，或在搜索结果里收藏</small></div>`;
    } else if (rt.tab === 'hist') {
      const hist = this._video99Hist();
      html = hist.length ? `<div class="video99-sec-t">🕘 播放历史（${hist.length}）</div>` + hist.map(h => {
        const pct = h.d > 0 ? Math.min(100, Math.round((h.t || 0) / h.d * 100)) : 0;
        return `
        <div class="video99-row">
          <div class="video99-row-mid" onclick="App._video99Replay('${esc(h.k)}')">
            <b>${esc(h.n)}</b>
            <small>${esc(h.sub || '')} · ${new Date(h.at).toLocaleString()}${h.t > 0 && h.d > 0 ? ' · 已看 ' + pct + '%' : ''}</small>
            ${h.t > 0 && h.d > 0 ? `<i class="video99-pbar"><u style="width:${pct}%"></u></i>` : ''}
          </div>
          <button class="video99-mini" onclick="App._video99HistDel('${esc(h.k)}')">🗑</button>
        </div>`;
      }).join('') + `<div style="text-align:center;margin-top:10px"><button class="video99-mini" onclick="App._video99HistClear()">清空历史</button></div>`
        : `<div class="video99-empty">暂无播放历史<small>看过的片会记在这里，续播不迷路</small></div>`;
    }
    box.innerHTML = html;
  },

  _video99HeroGo(kw) {
    const inp = document.getElementById('video99Kw');
    if (inp) inp.value = kw;
    this._video99Search(kw);
  },

  _video99PaintLocal() {
    const box = document.getElementById('video99Main');
    if (!box) return;
    box.innerHTML = `
      <div class="video99-imp">
        <button class="video99-big" onclick="App._video99Pick()">📥 导入本地视频 / 字幕</button>
        <div class="video99-note">支持 MP4 / WebM / MKV / FLV 等（也可直接拖放进本页）· 字幕支持 .srt / .vtt（与视频同名自动匹配）· 存本机 IndexedDB，刷新不丢</div>
      </div>
      <div class="video99-lsec" id="video99LocalList">读取中…</div>
      <div class="video99-lsec" id="video99SubList">读取中…</div>`;
    this._video99LocalList().then(fs => {
      const el = document.getElementById('video99LocalList');
      if (!el) return;
      el.innerHTML = `<div class="video99-sec-t">📁 本地视频（${fs.length}）</div>` + (fs.length ? fs.map(f => `
        <div class="video99-row">
          <div class="video99-row-mid" onclick="App._video99LocalPlay('${esc(f.id)}')">
            <b>${esc(f.name)}</b><small>${(f.size / 1048576).toFixed(1)} MB · ${new Date(f.at).toLocaleDateString()}</small>
          </div>
          <button class="video99-mini" onclick="App._video99LocalDel('${esc(f.id)}')">🗑</button>
        </div>`).join('') : '<div class="video99-empty">还没有导入本地视频</div>');
    });
    const subs = this._video99Subs();
    const el2 = document.getElementById('video99SubList');
    if (el2) el2.innerHTML = `<div class="video99-sec-t">💬 字幕库（${subs.length}）</div>` + (subs.length ? subs.map(s => `
      <div class="video99-row">
        <div class="video99-row-mid" onclick="App._video99SubApplyById('${esc(s.id)}')">
          <b>${esc(s.name)}</b><small>点击附加到当前播放 · 🗑 删除</small>
        </div>
        <button class="video99-mini" onclick="App._video99SubDel('${esc(s.id)}')">🗑</button>
      </div>`).join('') : '<div class="video99-empty">还没有字幕——播放时点 CC 导入</div>');
  },

  // ==================== 搜索（片库聚合）====================
  _video99Go() {
    const inp = document.getElementById('video99Kw');
    const kw = String(inp ? inp.value : '').trim();
    if (!kw) { this._flash('先输入片名，或粘贴视频链接'); return; }
    try { this._sfx99('tap'); } catch (e) {}
    if (/^https?:\/\//i.test(kw)) {
      const rt = this._video99Rt;
      if (this._video99IsShort(kw)) { this._video99ParseShort(kw); return; }
      let name = '链接视频';
      try { name = decodeURIComponent(String(kw.split('?')[0].split('/').pop() || '')) || '链接视频'; } catch (e) {}
      rt.cur = { kind: 'link', k: 'link:' + kw, n: name.slice(0, 46), sub: '直链播放', pic: '', url: kw };
      this._video99Open(kw, {});
      this._video99HistAdd();
    } else {
      this._video99Search(kw);
    }
  },

  // v12.9.48 引擎提速：直连 + 三代理「并发竞速，先回先得」（此前串行重试最坏 4×9s；
  //   现在所有通道同时出发，最快的那个赢，单源最坏 7s 封顶，配合增量渲染先到的结果先上屏）
  async _video99Fetch(u, ms) {
    const tries = [u].concat(this.VIDEO99_PROXY.map(p => p(u)));
    const one = async (t) => {
      const ctrl = new AbortController();
      const to = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, ms || 7000);
      try {
        const res = await fetch(t, { signal: ctrl.signal });
        if (!res || !res.ok) return null;
        return await res.json();
      } catch (e) { return null; }
      finally { clearTimeout(to); }
    };
    return new Promise((ok) => {
      let settled = false, left = tries.length;
      tries.forEach(t => {
        one(t).then(j => {
          if (!settled && j) { settled = true; ok(j); }
        }).finally(() => { if (--left === 0 && !settled) ok(null); });
      });
    });
  },

  async _video99Search(kw) {
    const rt = this._video99Rt;
    if (!rt) return;
    kw = String(kw || '').trim();
    if (!kw) { this._flash('先输入片名'); return; }
    rt.kw = kw;
    rt.searching = true;
    rt.results = [];
    if (rt.tab !== 'search') rt.tab = 'search';
    this._video99Paint();
    const add = (list) => {
      for (const v of (list || [])) {
        if (!v || !v.vod_name || !v.vod_play_url) continue;
        if (rt.results.some(o => o.vod_name === v.vod_name && (o.vod_year || '') === (v.vod_year || ''))) continue;
        rt.results.push(v);
      }
      if (rt.tab === 'search' && rt.searching) this._video99Paint();
    };
    await Promise.all(this.VIDEO99_SITES.map(async (s) => {
      const j = await this._video99Fetch(s.u + '?ac=detail&wd=' + encodeURIComponent(kw), 7000);
      add(j && j.list);
    }));
    rt.searching = false;
    if (rt.tab === 'search') this._video99Paint();
    if (!rt.results.length) {
      try { this._sfx99('fail'); } catch (e) {}
      this._flash('没有搜到「' + kw.slice(0, 16) + '」——换个关键词，或点 🔗 去正版平台看');
    } else {
      try { this._sfx99('success'); } catch (e) {}
    }
  },

  // vod_play_from / vod_play_url → [{name, eps:[{n,u}]}]
  _video99VodSources(vod) {
    if (!vod) return [];
    const froms = String(vod.vod_play_from || '').split('$$$');
    const urls = String(vod.vod_play_url || '').split('$$$');
    const out = [];
    for (let i = 0; i < froms.length; i++) {
      const eps = String(urls[i] || '').split('#').filter(Boolean).map(ep => {
        const p = String(ep).split('$');
        return { n: (p[0] || '').trim(), u: (p[1] || '').trim() };
      }).filter(e => e.u);
      if (eps.length) out.push({ name: froms[i] || ('线路' + (i + 1)), eps });
    }
    return out;
  },

  // 线路优选：集数多者优先，同集数时 4K/8K/HDR/1080/蓝光 标记多者优先
  _video99BestSrc(sources) {
    if (!sources || !sources.length) return null;
    const q = (s) => s.eps.reduce((a, e) => a + (/4K|8K|HDR|蓝光|1080/i.test(e.n || '') ? 1 : 0), 0);
    let best = sources[0];
    for (const s of sources) {
      if (s.eps.length > best.eps.length || (s.eps.length === best.eps.length && q(s) > q(best))) best = s;
    }
    return best;
  },

  _video99PlayVod(i, srcIdx, epIdx) {
    const rt = this._video99Rt;
    if (!rt || !rt.results || !rt.results[i]) return;
    const vod = rt.results[i];
    const sources = this._video99VodSources(vod);
    if (!sources.length) { this._flash('这部影片的播放源暂不可用——点 🔗 去正版看看'); return; }
    rt.vod = vod;
    rt.sources = sources;
    rt.srcIdx = (srcIdx == null) ? Math.max(0, sources.indexOf(this._video99BestSrc(sources))) : srcIdx;
    rt.eps = sources[rt.srcIdx].eps;
    rt.epIdx = (epIdx == null) ? 0 : epIdx;
    const ep = rt.eps[rt.epIdx];
    rt.cur = {
      kind: 'vod', k: 'vod:' + (vod.vod_id || vod.vod_name) + ':' + rt.srcIdx + ':' + rt.epIdx,
      n: vod.vod_name + (rt.eps.length > 1 ? ' · ' + (ep.n || ('第' + (rt.epIdx + 1) + '集')) : ''),
      sub: vod.vod_remarks || '', pic: vod.vod_pic || '', url: ep.u, vodIdx: i,
    };
    this._video99Open(ep.u, {});
    this._video99HistAdd();
    const epsBox = document.getElementById('video99Eps');
    if (epsBox && epsBox.style.display !== 'none') this._video99EpsPaint();
    if (rt.tab === 'queue') this._video99Paint();
  },

  _video99VodFav(i) {
    const rt = this._video99Rt;
    if (!rt || !rt.results || !rt.results[i]) return;
    const vod = rt.results[i];
    const src = this._video99BestSrc(this._video99VodSources(vod));
    if (!src) return;
    this._video99FavToggle({
      k: 'vod:' + (vod.vod_id || vod.vod_name), kind: 'vod',
      n: vod.vod_name, sub: vod.vod_remarks || '', pic: vod.vod_pic || '', url: src.eps[0].u,
    });
  },

  _video99EpMove(d) {
    const rt = this._video99Rt;
    if (!rt || !rt.eps || !rt.eps.length) { this._flash(d > 0 ? '已经是最后一集' : '已经是第一集'); return; }
    const ni = rt.epIdx + d;
    if (ni < 0 || ni >= rt.eps.length) { this._flash(d > 0 ? '已经是最后一集' : '已经是第一集'); return; }
    this._video99EpPlay(ni);
  },

  _video99EpPlay(idx) {
    const rt = this._video99Rt;
    if (!rt || !rt.eps || !rt.eps[idx]) return;
    rt.epIdx = idx;
    const ep = rt.eps[idx];
    rt.cur = Object.assign({}, rt.cur, {
      k: 'vod:' + (rt.vod ? (rt.vod.vod_id || rt.vod.vod_name) : 'x') + ':' + rt.srcIdx + ':' + idx,
      n: (rt.vod ? rt.vod.vod_name : '播放中') + ' · ' + (ep.n || ('第' + (idx + 1) + '集')),
      url: ep.u,
    });
    // 换集：按该集自己的播放记忆续播（无记忆则从头）
    this._video99Open(ep.u, {});
    this._video99HistAdd();
    this._video99EpsPaint();
    if (rt.tab === 'queue') this._video99Paint();
  },

  _video99EpsToggle(show) {
    const box = document.getElementById('video99Eps');
    if (!box) return;
    const on = (show === undefined) ? box.style.display === 'none' : !!show;
    box.style.display = on ? '' : 'none';
    try { this._sfx99('popup'); } catch (e) {}
    if (on) this._video99EpsPaint();
  },

  _video99EpsPaint() {
    const rt = this._video99Rt;
    if (!rt) return;
    const pills = document.getElementById('video99SrcPills');
    const grid = document.getElementById('video99EpsGrid');
    const ttl = document.getElementById('video99EpsTitle');
    if (ttl) ttl.textContent = '选集 · ' + (rt.vod ? rt.vod.vod_name : (rt.cur ? rt.cur.n : ''));
    if (pills) pills.innerHTML = (rt.sources || []).map((s, i) =>
      `<button class="video99-srchip${i === rt.srcIdx ? ' on' : ''}" onclick="App._video99SrcPlay(${i})">${this.esc(s.name)} ${s.eps.length}集</button>`).join('');
    if (grid) grid.innerHTML = (rt.eps && rt.eps.length)
      ? rt.eps.map((e, i) => `<button class="video99-ep${i === rt.epIdx ? ' on' : ''}" onclick="App._video99EpPlay(${i})">${this.esc(e.n || ('第' + (i + 1) + '集'))}</button>`).join('')
      : '<div class="video99-empty" style="grid-column:1/-1">当前为单集播放（链接 / 短视频 / 本地）</div>';
  },

  // 换线路：保持集数与进度
  _video99SrcPlay(i) {
    const rt = this._video99Rt;
    if (!rt || !rt.sources || !rt.sources[i] || i === rt.srcIdx) return;
    const vd = document.getElementById('video99V');
    const keep = (() => { try { return vd && isFinite(vd.currentTime) ? vd.currentTime : 0; } catch (e) { return 0; } })();
    rt.srcIdx = i;
    rt.eps = rt.sources[i].eps;
    if (rt.epIdx >= rt.eps.length) rt.epIdx = 0;
    const ep = rt.eps[rt.epIdx];
    rt.cur = Object.assign({}, rt.cur, {
      k: 'vod:' + (rt.vod ? (rt.vod.vod_id || rt.vod.vod_name) : 'x') + ':' + i + ':' + rt.epIdx,
      url: ep.u,
    });
    try { this._sfx99('cosmos'); } catch (e) {}
    this._video99Open(ep.u, { resume: false, seekTo: keep > 5 ? keep : 0 });
    this._video99EpsPaint();
  },

  // ==================== 播放器核心 ====================
  // 按需加载播放内核（hls.js / flv.js / dash.js · 在线增强 · 离线降级）
  _video99Libs: {},
  _video99Lib(key, src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (this._video99Libs[key]) return this._video99Libs[key];
    this._video99Libs[key] = new Promise((ok) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      const to = setTimeout(() => ok(null), 9000);
      s.onload = () => { clearTimeout(to); ok(window[globalName] || null); };
      s.onerror = () => { clearTimeout(to); ok(null); };
      (document.head || document.documentElement).appendChild(s);
    });
    return this._video99Libs[key];
  },

  async _video99Open(url, opts = {}) {
    const rt = this._video99Rt;
    const frame = document.getElementById('video99Frame');
    const vd = document.getElementById('video99V');
    if (!rt || !frame || !vd || !url) return;
    if (opts.cur) rt.cur = opts.cur;
    rt.cur.url = url;
    frame.style.display = '';
    const titleEl = document.getElementById('video99Title');
    if (titleEl) titleEl.textContent = rt.cur.n || '播放中';
    // 清旧引擎与字幕
    if (rt.hls) { try { rt.hls.destroy(); } catch (e) {} rt.hls = null; }
    if (rt.libFlv) { try { rt.libFlv.pause(); rt.libFlv.unload(); rt.libFlv.detachMediaElement(); rt.libFlv.destroy(); } catch (e) {} rt.libFlv = null; }
    if (rt.libDash) { try { rt.libDash.reset(); } catch (e) {} rt.libDash = null; }
    this._video99SubOff();
    const q = document.getElementById('video99Q');
    if (q) q.textContent = '自动';
    try { vd.pause(); } catch (e) {}
    vd.playbackRate = rt.rate || 1;
    vd.volume = rt.vol;
    vd.muted = false;
    this._video99Dim();
    const low = String(url).split('?')[0].toLowerCase();
    try {
      if (/\.m3u8$/.test(low)) {
        if (vd.canPlayType('application/vnd.apple.mpegurl')) {
          vd.src = url;                                            // Android WebView / iOS Safari 原生 HLS
        } else {
          const Hls = await this._video99Lib('hls', 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js', 'Hls');
          if (Hls && Hls.isSupported()) {
            rt.hls = new Hls({ enableWorker: true });
            rt.hls.loadSource(url);
            rt.hls.attachMedia(vd);
            rt.hls.on(Hls.Events.MANIFEST_PARSED, () => { try { vd.play().catch(() => {}); } catch (e) {} });
            rt.hls.on(Hls.Events.ERROR, (ev, d) => {
              if (d && d.fatal) {
                this._flash('⚠️ 这条线路失灵了——点 🎛 换线路，或稍后再来');
                try { vd.pause(); } catch (e) {}
                const l = document.getElementById('video99Load'); if (l) l.style.display = 'none';
              }
            });
          } else { vd.src = url; }
        }
      } else if (/\.flv$/.test(low)) {
        const flvjs = await this._video99Lib('flv', 'https://cdn.jsdelivr.net/npm/flv.js@1.6.2/dist/flv.min.js', 'flvjs');
        if (flvjs && flvjs.isSupported()) {
          rt.libFlv = flvjs.createPlayer({ type: 'flv', url: url, isLive: false });
          rt.libFlv.attachMediaElement(vd);
          rt.libFlv.load();
          try { rt.libFlv.play(); } catch (e) {}
        } else throw new Error('flv');
      } else if (/\.mpd$/.test(low)) {
        const dashjs = await this._video99Lib('dash', 'https://cdn.jsdelivr.net/npm/dashjs@4.7.4/dist/dash.all.min.js', 'dashjs');
        if (dashjs && dashjs.MediaPlayer) {
          rt.libDash = dashjs.MediaPlayer().create();
          rt.libDash.initialize(vd, url, true);
        } else throw new Error('dash');
      } else {
        vd.src = url;
      }
    } catch (e) {
      this._flash('⚠️ 播放内核加载失败（离线或网络受限）——MP4 直链与本地视频不受影响');
    }
    // 续播 / 定位
    const key = rt.cur.k || url;
    let seekTo = opts.seekTo || 0;
    if (!seekTo && opts.resume !== false && rt.remember) {
      const prog = this._video99ProgGet(key);
      if (prog && prog.t > 20 && (!prog.d || prog.t < prog.d - 12)) {
        seekTo = prog.t;
        this._flash('⏩ 已从上次位置继续播放（' + this._video99Fmt(prog.t) + '）');
      }
    }
    if (seekTo > 0) {
      vd.addEventListener('loadedmetadata', () => { try { vd.currentTime = seekTo; } catch (e) {} }, { once: true });
    }
    // 字幕同名自动匹配（多语言：文件名前缀一致即挂载）
    this._video99SubAuto();
    if (opts.silent !== true) { try { vd.play().catch(() => {}); } catch (e) {} }
    this._video99CtlShow();
    this._video99PlayState();
  },

  _video99PlayState() {
    const vd = document.getElementById('video99V');
    const btn = document.getElementById('video99Play');
    if (!vd || !btn) return;
    btn.textContent = vd.paused ? '▶' : '⏸';
    btn.classList.toggle('playing', !vd.paused);
  },

  _video99Fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
  },

  _video99TickUI() {
    const rt = this._video99Rt;
    const vd = document.getElementById('video99V');
    if (!rt || !vd) return;
    if (!rt.seeking && isFinite(vd.duration) && vd.duration > 0) {
      const sk = document.getElementById('video99Seek');
      if (sk) sk.value = String(Math.round(vd.currentTime / vd.duration * 1000));
    }
    const cur = document.getElementById('video99Cur');
    const dur = document.getElementById('video99Dur');
    if (cur) cur.textContent = this._video99Fmt(vd.currentTime);
    if (dur) dur.textContent = this._video99Fmt(vd.duration);
  },

  // 3 秒心跳：进度落盘（节流）+ 定时关闭
  _video99Ticker() {
    const rt = this._video99Rt;
    if (!rt || this.currentView !== 'video99') return;
    const vd = document.getElementById('video99V');
    const frame = document.getElementById('video99Frame');
    if (vd && frame && frame.style.display !== 'none' && !vd.paused && rt.cur) {
      this._video99ProgSet(rt.cur.k, vd.currentTime, vd.duration);
    }
    const chip = document.getElementById('video99SleepChip');
    if (rt.sleepEnd) {
      const left = Math.max(0, rt.sleepEnd - Date.now());
      rt.sleepLeft = left;
      if (chip) { chip.style.display = 'inline-block'; chip.textContent = '⏲ ' + Math.ceil(left / 60000) + ' 分钟'; }
      if (left <= 0) {
        rt.sleepEnd = 0;
        if (chip) chip.style.display = 'none';
        if (vd) { try { vd.pause(); } catch (e) {} }
        this._flash('🌙 定时关闭：播放已暂停');
        this._video99CtlShow();
      }
    } else if (chip) chip.style.display = 'none';
  },

  _video99Ended() {
    const rt = this._video99Rt;
    if (!rt) return;
    if (rt.cur) this._video99ProgClear(rt.cur.k);
    if (rt.sleepAfterEp) { rt.sleepAfterEp = false; this._flash('🌙 定时关闭：本集播完已停止'); return; }
    if (rt.autoNext && rt.eps && rt.epIdx < rt.eps.length - 1) this._video99EpMove(1);
  },

  _video99Rate() {
    const vd = document.getElementById('video99V');
    const rt = this._video99Rt;
    if (!vd || !rt) return;
    const idx = this.VIDEO99_RATES.indexOf(vd.playbackRate);
    const next = this.VIDEO99_RATES[(idx + 1 + this.VIDEO99_RATES.length) % this.VIDEO99_RATES.length];
    vd.playbackRate = next;
    rt.rate = next;
    const b = document.getElementById('video99Rate');
    if (b) b.textContent = (next === 1 ? '1x' : next + 'x');
    try { this._sfx99('tap'); } catch (e) {}
    this._flash('倍速 ' + next + 'x');
  },

  // ==================== 线路 / 画质 / 音轨 / 字幕 面板 ====================
  _video99Panel() {
    const rt = this._video99Rt;
    const vd = document.getElementById('video99V');
    if (!rt) return;
    try { this._sfx99('popup'); } catch (e) {}
    const lines = (rt.sources || []).map((s, i) =>
      `<button class="video99-mini${i === rt.srcIdx ? ' on' : ''}" onclick="App._video99SrcPlay(${i})">${this.esc(s.name)} · ${s.eps.length}集</button>`).join('')
      || '<div class="video99-note">当前为直链/短视频/本地播放，无多线路</div>';
    let quals = '<div class="video99-note">当前线路为自适应流（HLS 自动匹配网速）</div>';
    if (rt.hls && rt.hls.levels && rt.hls.levels.length > 1) {
      quals = `<button class="video99-mini${rt.hls.autoLevelEnabled ? ' on' : ''}" onclick="App._video99Quality(-1)">自动</button>` +
        rt.hls.levels.map((l, i) =>
          `<button class="video99-mini${(!rt.hls.autoLevelEnabled && rt.hls.currentLevel === i) ? ' on' : ''}" onclick="App._video99Quality(${i})">${(l.height ? l.height + 'p' : '档' + (i + 1))}${l.bitrate ? ' · ' + Math.round(l.bitrate / 1000) + 'kbps' : ''}</button>`).join('');
    }
    let auds = '<div class="video99-note">当前片源仅单音轨（多音轨需片源支持）</div>';
    try {
      const at = vd && vd.audioTracks;
      if (at && at.length > 1) {
        auds = Array.from(at).map((t, i) =>
          `<button class="video99-mini${t.enabled ? ' on' : ''}" onclick="App._video99AudioSet(${i})">${this.esc(t.label || t.language || ('音轨' + (i + 1)))}</button>`).join('');
      }
    } catch (e) {}
    const subs = this._video99Subs();
    this._modal('🎛 线路 · 画质 · 音轨 · 字幕', `
      <div class="video99-panel">
        <div class="video99-panel-t">📡 线路</div><div class="video99-pills">${lines}</div>
        <div class="video99-panel-t">🎬 画质（优先匹配最高画质）</div><div class="video99-pills">${quals}</div>
        <div class="video99-panel-t">🎵 音轨</div><div class="video99-pills">${auds}</div>
        <div class="video99-panel-t">💬 字幕（自动匹配多语言）</div>
        <div class="video99-pills">
          <button class="video99-big" onclick="App._video99SubPick()">📂 导入 .srt / .vtt</button>
          ${subs.slice(0, 12).map(s => `<button class="video99-mini${rt.subOn === s.name ? ' on' : ''}" onclick="App._video99SubApplyById('${this.esc(s.id)}')">${this.esc(s.name)}</button>`).join('')}
          ${rt.subOn ? `<button class="video99-mini" onclick="App._video99SubOffClick()">✕ 关闭当前字幕</button>` : ''}
        </div>
      </div>`, [{ label: '完成', primary: true }]);
  },

  _video99Quality(i) {
    const rt = this._video99Rt;
    if (!rt || !rt.hls) { this._flash('当前线路不支持画质切换（原生流自动适配）'); return; }
    try {
      rt.hls.currentLevel = i;                                   // -1 = 自动
      const q = document.getElementById('video99Q');
      if (q) q.textContent = i < 0 ? '自动' : (rt.hls.levels[i] && rt.hls.levels[i].height ? rt.hls.levels[i].height + 'p' : '档' + (i + 1));
      this._flash(i < 0 ? '画质：自动（按网速自适应）' : '画质已锁定 ' + (q ? q.textContent : ''));
    } catch (e) {}
  },

  _video99AudioSet(i) {
    const vd = document.getElementById('video99V');
    try {
      const at = vd.audioTracks;
      if (!at) return;
      Array.from(at).forEach((t, j) => { t.enabled = j === i; });
      this._flash('音轨已切换：' + (at[i].label || at[i].language || ('音轨' + (i + 1))));
    } catch (e) { this._flash('当前浏览器不支持音轨切换'); }
  },

  // ==================== 字幕 ====================
  _video99Subs() { try { return JSON.parse(localStorage.getItem('video99_subs') || '[]'); } catch (e) { return []; } },

  _video99SubAuto() {
    const rt = this._video99Rt;
    if (!rt || !rt.cur || !rt.cur.n) return;
    const base = String(rt.cur.n).replace(/\.[^.]+$/, '').split(' · ')[0];
    const m = this._video99Subs().find(s => String(s.name).replace(/\.[^.]+$/, '').indexOf(base) === 0);
    if (m) this._video99SubApply(m.text, m.name);
  },

  _video99SrtToVtt(s) {
    if (!s) return '';
    const body = String(s).replace(/\r+/g, '').replace(/^\uFEFF/, '');
    return 'WEBVTT\n\n' + body.replace(/(\d{2}:\d{2}:\d{2}),(\d{1,3})/g, '$1.$2');
  },

  _video99SubApply(text, label) {
    const vd = document.getElementById('video99V');
    const rt = this._video99Rt;
    if (!vd || !rt) return;
    const isVtt = /\.vtt$/i.test(label || '');
    const vtt = isVtt ? text : this._video99SrtToVtt(text);
    if (!vtt || !/\d{2}:\d{2}/.test(vtt)) { this._flash('⚠️ 字幕文件解析失败（支持 .srt / .vtt）'); return; }
    this._video99SubOff();
    const url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
    const tr = document.createElement('track');
    tr.kind = 'subtitles'; tr.label = label || '字幕'; tr.srclang = 'zh'; tr.default = true;
    tr.src = url;
    vd.appendChild(tr);
    setTimeout(() => { try { if (vd.textTracks[0]) vd.textTracks[0].mode = 'showing'; } catch (e) {} }, 80);
    rt.subOn = label || '字幕';
    const cc = document.getElementById('video99CC');
    if (cc) cc.classList.add('on');
    this._flash('💬 字幕已加载：' + (label || ''));
  },

  _video99SubApplyById(id) {
    const s = this._video99Subs().find(x => x.id === id);
    if (!s) return;
    this._video99SubApply(s.text, s.name);
    try { const ov = document.querySelector('.wild-overlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
  },

  _video99SubOff() {
    const vd = document.getElementById('video99V');
    const rt = this._video99Rt;
    if (vd) Array.from(vd.querySelectorAll('track')).forEach(t => { try { URL.revokeObjectURL(t.src); } catch (e) {} t.remove(); });
    if (rt) rt.subOn = '';
    const cc = document.getElementById('video99CC');
    if (cc) cc.classList.remove('on');
  },

  _video99SubOffClick() {
    this._video99SubOff();
    this._flash('字幕已关闭');
    try { const ov = document.querySelector('.wild-overlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
  },

  _video99SubToggle() {
    const rt = this._video99Rt;
    try { this._sfx99('tap'); } catch (e) {}
    if (rt && rt.subOn) { this._video99SubOff(); this._flash('字幕已关闭'); return; }
    this._video99Panel();
  },

  _video99SubPick() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.srt,.vtt';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const text = String(rd.result || '');
        const subs = this._video99Subs();
        subs.unshift({ id: 's' + Date.now() + Math.random().toString(36).slice(2, 5), name: f.name, text: text.slice(0, 2e6), at: Date.now() });
        try { localStorage.setItem('video99_subs', JSON.stringify(subs.slice(0, 60))); } catch (e) { this._flash('⚠️ 字幕过大，本地存不下（可换个精简版字幕）'); }
        this._video99SubApply(text, f.name);
      };
      rd.readAsText(f, 'utf-8');
    };
    inp.click();
  },

  _video99SubDel(id) {
    try { localStorage.setItem('video99_subs', JSON.stringify(this._video99Subs().filter(s => s.id !== id))); } catch (e) {}
    if (this._video99Rt && this._video99Rt.tab === 'local') this._video99PaintLocal();
    this._flash('字幕已删除');
  },

  // ==================== 短视频解析（抖音 / 快手 · 自动去水印）====================
  _video99IsShort(u) {
    return /(?:douyin|iesdouyin|tiktok|kuaishou|chenzhongtech|gifshow|ksapp)\./i.test(String(u || ''));
  },

  // 从解析接口响应中提取无水印流（hdplay > play > video_url；wmplay 带水印不用）
  _video99ShortPick(j) {
    if (!j) return null;
    const d = j.data || j;
    const play = d.hdplay || d.play || d.video_url || d.url || (d.video && (d.video.play || d.video.url)) || null;
    if (!play || typeof play !== 'string' || !/^https?:\/\//.test(play)) return null;
    return {
      url: play,
      title: (d.title || d.desc || '短视频').slice(0, 60),
      author: (d.author && (d.author.nickname || d.author.name)) || '',
      pic: d.cover || d.pic || '',
    };
  },

  async _video99ParseShort(u) {
    const rt = this._video99Rt;
    if (!rt) return;
    const ov = document.getElementById('video99Parse');
    if (ov) ov.style.display = '';
    try { this._sfx99('liquid'); } catch (e) {}
    // 短链展开（fetch 自动跟重定向，取落点 URL）
    let full = u;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 8000);
      const res = await fetch(u, { signal: ctrl.signal, redirect: 'follow' });
      clearTimeout(to);
      if (res && res.url) full = res.url;
    } catch (e) {}
    const eps = [
      'https://www.tikwm.com/api/?url=' + encodeURIComponent(full) + '&hd=1',
      'https://api.pearktrue.cn/api/douyin/?url=' + encodeURIComponent(full),
    ];
    for (const ep of eps) {
      const j = await this._video99Fetch(ep, 12000);
      const m = this._video99ShortPick(j);
      if (m) {
        if (ov) ov.style.display = 'none';
        rt.cur = {
          kind: 'short', k: 'short:' + full, n: m.title,
          sub: m.author ? '作者：' + m.author : '短视频 · 已去水印', pic: m.pic, url: m.url,
        };
        this._video99Open(m.url, {});
        this._video99HistAdd();
        try { this._sfx99('success'); } catch (e) {}
        this._flash('✅ 解析成功 · 已自动去除水印（仅限个人观看，请勿盗用他人原创）');
        return;
      }
    }
    if (ov) ov.style.display = 'none';
    try { this._sfx99('fail'); } catch (e) {}
    this._flash('❌ 解析失败：接口繁忙或链接无效——稍后再试，或复制到原 App 观看');
  },

  // ==================== 历史 / 收藏 / 进度 ====================
  _video99Hist() { try { return JSON.parse(localStorage.getItem('video99_hist') || '[]'); } catch (e) { return []; } },
  _video99HistAdd() {
    const rt = this._video99Rt;
    if (!rt || !rt.cur) return;
    const c = rt.cur;
    const list = this._video99Hist().filter(h => h.k !== c.k);
    list.unshift({ k: c.k, kind: c.kind || 'link', n: c.n || '未命名', sub: c.sub || '', pic: c.pic || '', url: c.url || '', at: Date.now(), t: 0, d: 0 });
    try { localStorage.setItem('video99_hist', JSON.stringify(list.slice(0, 100))); } catch (e) {}
    if (rt.tab === 'hist') this._video99Paint();
  },
  _video99HistDel(k) {
    try { localStorage.setItem('video99_hist', JSON.stringify(this._video99Hist().filter(h => h.k !== k))); } catch (e) {}
    if (this._video99Rt && this._video99Rt.tab === 'hist') this._video99Paint();
  },
  _video99HistClear() {
    try { localStorage.setItem('video99_hist', '[]'); } catch (e) {}
    if (this._video99Rt && this._video99Rt.tab === 'hist') this._video99Paint();
    this._flash('🕘 播放历史已清空');
  },
  _video99FavData() { try { return JSON.parse(localStorage.getItem('video99_fav') || '[]'); } catch (e) { return []; } },
  _video99FavToggle(cur) {
    const c = cur || (this._video99Rt && this._video99Rt.cur);
    if (!c || !c.url) { this._flash('先播放再收藏'); return; }
    const list = this._video99FavData();
    const i = list.findIndex(f => f.k === c.k);
    if (i >= 0) { list.splice(i, 1); try { this._sfx99('off'); } catch (e) {} this._flash('已从收藏移出'); }
    else {
      list.unshift({ k: c.k, kind: c.kind || 'link', n: c.n, sub: c.sub, pic: c.pic, url: c.url, at: Date.now() });
      try { this._sfx99('on'); } catch (e) {} this._flash('⭐ 已加入收藏');
    }
    try { localStorage.setItem('video99_fav', JSON.stringify(list.slice(0, 100))); } catch (e) {}
    if (this._video99Rt && this._video99Rt.tab === 'fav') this._video99Paint();
  },
  _video99FavDel(k) {
    try { localStorage.setItem('video99_fav', JSON.stringify(this._video99FavData().filter(f => f.k !== k))); } catch (e) {}
    if (this._video99Rt && this._video99Rt.tab === 'fav') this._video99Paint();
  },

  // 播放记忆（退出记进度 · 重进续播）
  _video99ProgAll() { try { return JSON.parse(localStorage.getItem('video99_prog') || '{}'); } catch (e) { return {}; } },
  _video99ProgGet(k) { return k ? this._video99ProgAll()[k] : null; },
  _video99ProgSet(k, t, d, force) {
    if (!k || !isFinite(t) || t <= 3) return;
    const rt = this._video99Rt;
    if (rt && !rt.remember) return;
    if (!force && rt && Date.now() - (rt.lastSave || 0) < 5000) return;
    if (rt) rt.lastSave = Date.now();
    const m = this._video99ProgAll();
    m[k] = { t: Math.floor(t), d: isFinite(d) ? Math.floor(d) : 0, at: Date.now() };
    const keys = Object.keys(m);
    if (keys.length > 200) keys.sort((a, b) => (m[a].at || 0) - (m[b].at || 0)).slice(0, keys.length - 200).forEach(x => { delete m[x]; });
    try { localStorage.setItem('video99_prog', JSON.stringify(m)); } catch (e) {}
    const list = this._video99Hist();
    const h = list.find(x => x.k === k);
    if (h) { h.t = m[k].t; h.d = m[k].d; try { localStorage.setItem('video99_hist', JSON.stringify(list)); } catch (e) {} }
  },
  _video99ProgClear(k) {
    if (!k) return;
    const m = this._video99ProgAll();
    if (m[k]) { delete m[k]; try { localStorage.setItem('video99_prog', JSON.stringify(m)); } catch (e) {} }
  },

  // 历史/收藏重放
  _video99Replay(k) {
    const rt = this._video99Rt;
    if (!rt) return;
    const h = this._video99Hist().find(x => x.k === k) || this._video99FavData().find(x => x.k === k);
    if (!h) { this._flash('条目已失效'); return; }
    try { this._sfx99('tap'); } catch (e) {}
    if (String(h.k).indexOf('local:') === 0) { this._video99LocalPlay(String(h.k).slice(6)); return; }
    rt.cur = { kind: h.kind || 'link', k: h.k, n: h.n, sub: h.sub, pic: h.pic, url: h.url };
    this._video99Open(h.url, { resume: true });
    this._video99HistAdd();
  },

  // ==================== 本地视频（IndexedDB）====================
  _video99DB() {
    return new Promise((ok) => {
      try {
        const rq = indexedDB.open('one-xing-video99', 1);
        rq.onupgradeneeded = () => { try { rq.result.createObjectStore('files', { keyPath: 'id' }); } catch (e) {} };
        rq.onsuccess = () => ok(rq.result);
        rq.onerror = () => ok(null);
      } catch (e) { ok(null); }
    });
  },
  async _video99LocalList() {
    const db = await this._video99DB();
    if (!db) return [];
    return new Promise((ok) => {
      try {
        const rq = db.transaction('files').objectStore('files').getAll();
        rq.onsuccess = () => ok((rq.result || []).sort((a, b) => (b.at || 0) - (a.at || 0)));
        rq.onerror = () => ok([]);
      } catch (e) { ok([]); }
    });
  },
  async _video99FilePut(f) {
    const db = await this._video99DB();
    if (!db) { this._flash('⚠️ 本地存储不可用（隐私模式？）'); return; }
    return new Promise((ok) => {
      try {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put({ id: 'f' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: f.name, type: f.type, size: f.size, at: Date.now(), blob: f });
        tx.oncomplete = () => ok();
        tx.onerror = () => ok();
      } catch (e) { ok(); }
    });
  },
  async _video99LocalPlay(id) {
    const db = await this._video99DB();
    if (!db) { this._flash('本地视频不可用'); return; }
    new Promise((ok) => {
      try {
        const rq = db.transaction('files').objectStore('files').get(id);
        rq.onsuccess = () => ok(rq.result || null);
        rq.onerror = () => ok(null);
      } catch (e) { ok(null); }
    }).then(rec => {
      if (!rec || !rec.blob) { this._flash('本地视频不存在（可能已删除）'); return; }
      const rt = this._video99Rt;
      const url = URL.createObjectURL(rec.blob);
      rt.cur = { kind: 'local', k: 'local:' + id, n: rec.name, sub: (rec.size / 1048576).toFixed(1) + ' MB · 本地', pic: '', url: url, localId: id };
      this._video99Open(url, { resume: true });
      this._video99HistAdd();
    });
  },
  async _video99LocalDel(id) {
    const db = await this._video99DB();
    if (!db) return;
    try { db.transaction('files', 'readwrite').objectStore('files').delete(id); } catch (e) {}
    this._flash('已删除本地视频');
    setTimeout(() => { if (this._video99Rt && this._video99Rt.tab === 'local') this._video99PaintLocal(); }, 120);
  },
  _video99Pick() {
    const f = document.getElementById('video99File');
    if (f) f.click();
  },
  async _video99ImportFiles(fs) {
    let nv = 0, ns = 0;
    for (const f of Array.from(fs || [])) {
      if (/\.(srt|vtt)$/i.test(f.name)) {
        await new Promise(ok => {
          const rd = new FileReader();
          rd.onload = () => {
            const subs = this._video99Subs();
            subs.unshift({ id: 's' + Date.now() + Math.random().toString(36).slice(2, 5), name: f.name, text: String(rd.result || '').slice(0, 2e6), at: Date.now() });
            try { localStorage.setItem('video99_subs', JSON.stringify(subs.slice(0, 60))); } catch (e) {}
            ok();
          };
          rd.readAsText(f, 'utf-8');
        });
        ns++;
      } else if (/^video\//.test(f.type) || /\.(mp4|webm|mkv|flv|mov|m3u8|mpd)$/i.test(f.name)) {
        await this._video99FilePut(f);
        nv++;
      }
    }
    try { this._sfx99('success'); } catch (e) {}
    this._flash('✅ 已导入' + (nv ? ' ' + nv + ' 个视频' : '') + (ns ? (nv ? ' · ' : ' ') + ns + ' 条字幕' : ''));
    if (this._video99Rt && this._video99Rt.tab === 'local') this._video99PaintLocal();
  },
  _video99BindDrop() {
    const wrap = document.getElementById('view-video99');
    if (!wrap || wrap.dataset.v99drop) return;
    wrap.dataset.v99drop = '1';
    let depth = 0;
    wrap.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; wrap.classList.add('video99-drag'); });
    wrap.addEventListener('dragover', (e) => e.preventDefault());
    wrap.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; wrap.classList.remove('video99-drag'); } });
    wrap.addEventListener('drop', (e) => {
      e.preventDefault(); depth = 0; wrap.classList.remove('video99-drag');
      const fs = e.dataTransfer && e.dataTransfer.files;
      if (fs && fs.length) this._video99ImportFiles(fs);
    });
  },

  // ==================== 定时关闭 / 亮度 / 音量 ====================
  _video99Sleep() {
    const rt = this._video99Rt;
    if (!rt) return;
    try { this._sfx99('popup'); } catch (e) {}
    const cur = rt.sleepEnd ? `（当前剩余 ${Math.ceil((rt.sleepEnd - Date.now()) / 60000)} 分钟）` : '';
    this._modal('⏲ 定时关闭', `
      <div class="video99-panel">
        <div class="video99-pills">
          ${[15, 30, 60, 90].map(m => `<button class="video99-mini" onclick="App._video99SleepSet(${m * 60000})">${m} 分钟后</button>`).join('')}
          <button class="video99-mini" onclick="App._video99SleepSet(-1)">🌙 播完本集</button>
          <button class="video99-mini" onclick="App._video99SleepSet(0)">✕ 取消定时</button>
        </div>
        <div class="video99-note" style="margin-top:8px">到点自动暂停播放${cur}</div>
      </div>`, [{ label: '关闭', primary: true }]);
  },
  _video99SleepSet(ms) {
    const rt = this._video99Rt;
    if (!rt) return;
    if (ms > 0) { rt.sleepEnd = Date.now() + ms; rt.sleepAfterEp = false; this._flash('⏲ 将在 ' + Math.round(ms / 60000) + ' 分钟后停止播放'); }
    else if (ms === -1) { rt.sleepAfterEp = true; rt.sleepEnd = 0; this._flash('🌙 本集播完后停止播放'); }
    else { rt.sleepEnd = 0; rt.sleepAfterEp = false; this._flash('已取消定时关闭'); }
    try { const ov = document.querySelector('.wild-overlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
  },

  _video99BriSet(v) {
    const rt = this._video99Rt;
    if (!rt) return;
    rt.bri = Math.max(0.1, Math.min(1, v));
    try { localStorage.setItem('video99_bri', String(rt.bri)); } catch (e) {}
    this._video99Dim();
  },
  _video99Dim() {
    const rt = this._video99Rt;
    const el = document.getElementById('video99Dim');
    if (el && rt) el.style.opacity = String((1 - rt.bri) * 0.82);
  },
  _video99BriN(d) { this._video99BriSet((this._video99Rt ? this._video99Rt.bri : 1) + d); },
  _video99VolN(d) {
    const vd = document.getElementById('video99V');
    const rt = this._video99Rt;
    if (!vd || !rt) return;
    const nv = Math.max(0, Math.min(1, (vd.muted ? 0 : vd.volume) + d));
    vd.volume = nv; vd.muted = false; rt.vol = nv;
    try { localStorage.setItem('video99_vol', String(nv)); } catch (e) {}
    const v = document.getElementById('video99Vol');
    if (v) v.value = Math.round(nv * 100);
    const c = document.getElementById('video99Chip');
    if (c) { c.style.display = ''; c.textContent = '🔊 音量 ' + Math.round(nv * 100) + '%'; clearTimeout(this.__video99ChipT); this.__video99ChipT = setTimeout(() => { c.style.display = 'none'; }, 700); }
  },

  // ==================== 横竖屏 ====================
  // 客户端（Capacitor ScreenOrientation · 原生 lock/unlock）优先；
  // 网页走 Fullscreen（隐藏状态栏/导航栏的沉浸全屏）+ screen.orientation.lock；
  // 均不支持（桌面/iOS Safari）时 CSS 旋转兜底 —— 三层实现，行为一致
  _video99Land(on, fromFs) {
    const st = document.getElementById('video99Stage');
    const rt = this._video99Rt;
    if (!st || !rt || !!on === !!rt.land) return;
    rt.land = !!on;
    st.classList.toggle('land', !!on);
    try { this._sfx99(on ? 'cosmos' : 'back'); } catch (e) {}
    const cap = (() => { try { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ScreenOrientation; } catch (e) { return null; } })();
    const scr = (typeof screen !== 'undefined' && screen.orientation) || null;
    if (on) {
      if (cap && cap.lock) { try { cap.lock({ orientation: 'landscape' }).catch(() => {}); } catch (e) {} }
      let p = Promise.resolve();
      try { if (st.requestFullscreen) p = st.requestFullscreen().catch(() => {}); } catch (e) {}
      Promise.resolve(p).then(() => {
        try {
          if (scr && scr.lock) scr.lock('landscape').catch(() => { try { st.classList.add('rot'); } catch (e) {} });
          else { try { st.classList.add('rot'); } catch (e) {} }
        } catch (e) { try { st.classList.add('rot'); } catch (e2) {} }
      });
      this._video99CtlShow();
    } else {
      st.classList.remove('rot');
      if (cap && cap.unlock) { try { cap.unlock().catch(() => {}); } catch (e) {} }
      try { if (scr && scr.unlock) scr.unlock(); } catch (e) {}
      if (!fromFs && document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
      this._video99CtlShow();
    }
  },

  // 重力感应自动切换（仅触屏设备 · 设置可关）
  _video99OriChange() {
    const rt = this._video99Rt;
    if (!rt || !rt.autoOri) return;
    if (this.currentView !== 'video99') return;
    if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return;   // 桌面不自动转
    const frame = document.getElementById('video99Frame');
    if (!frame || frame.style.display === 'none') { if (rt.land) this._video99Land(false); return; }
    this._video99Land(window.innerWidth > window.innerHeight);
  },

  // ==================== 播放器事件绑定 ====================
  _video99BindPlayer() {
    const $ = (id) => document.getElementById(id);
    const rt = this._video99Rt;
    const frame = $('video99Frame'), vd = $('video99V');
    if (!rt || !frame || !vd) return;
    $('video99Play').onclick = () => {
      try { this._sfx99('tap'); } catch (e) {}
      if (vd.paused) vd.play().catch(() => {});
      else { vd.pause(); this._video99ProgSet(rt.cur && rt.cur.k, vd.currentTime, vd.duration, true); }
    };
    $('video99Prev').onclick = () => this._video99EpMove(-1);
    $('video99Next').onclick = () => this._video99EpMove(1);
    $('video99Rate').onclick = () => this._video99Rate();
    $('video99CC').onclick = () => this._video99SubToggle();
    $('video99EpsBtn').onclick = () => this._video99EpsToggle();
    $('video99Timer').onclick = () => this._video99Sleep();
    $('video99Panel').onclick = () => this._video99Panel();
    $('video99Mute').onclick = () => {
      vd.muted = !vd.muted;
      $('video99Mute').textContent = vd.muted ? '🔇' : '🔊';
      try { this._sfx99('tap'); } catch (e) {}
    };
    $('video99Vol').oninput = (e) => {
      rt.vol = +e.target.value / 100;
      vd.volume = rt.vol; vd.muted = false;
      $('video99Mute').textContent = '🔊';
      try { localStorage.setItem('video99_vol', String(rt.vol)); } catch (e2) {}
    };
    $('video99Rot').onclick = () => this._video99Land(true);
    $('video99BackPort').onclick = () => this._video99Land(false);
    $('video99Close').onclick = () => this._video99Close();
    $('video99File').onchange = (e) => { const fs = e.target.files; if (fs && fs.length) this._video99ImportFiles(fs); e.target.value = ''; };

    const sk = $('video99Seek');
    sk.addEventListener('pointerdown', () => { rt.seeking = true; });
    sk.addEventListener('input', () => {
      if (!isFinite(vd.duration) || vd.duration <= 0) return;
      vd.currentTime = +sk.value / 1000 * vd.duration;
      this._video99TickUI();
    });
    const skUp = () => { rt.seeking = false; };
    sk.addEventListener('pointerup', skUp);
    sk.addEventListener('pointercancel', skUp);

    vd.addEventListener('timeupdate', () => this._video99TickUI());
    vd.addEventListener('play', () => this._video99PlayState());
    vd.addEventListener('pause', () => this._video99PlayState());
    vd.addEventListener('ended', () => this._video99Ended());
    vd.addEventListener('waiting', () => { const l = $('video99Load'); if (l) l.style.display = ''; });
    vd.addEventListener('playing', () => { const l = $('video99Load'); if (l) l.style.display = 'none'; });
    vd.addEventListener('canplay', () => { const l = $('video99Load'); if (l) l.style.display = 'none'; });
    vd.addEventListener('error', () => {
      const l = $('video99Load'); if (l) l.style.display = 'none';
      if (vd.currentSrc || vd.src) this._flash('⚠️ 播放失败——点 🎛 换线路/画质，或稍后再来');
    });

    // 手势：左右滑快进快退 · 左半上下滑亮度 · 右半上下滑音量 · 点按唤出控件
    this._video99BindGestures(frame, vd);

    // 系统手势退出全屏时同步退出横屏态（防状态不同步）
    if (this.__video99FsH) { try { document.removeEventListener('fullscreenchange', this.__video99FsH); } catch (e) {} }
    this.__video99FsH = () => {
      const rt2 = this._video99Rt;
      if (!document.fullscreenElement && rt2 && rt2.land && this.currentView === 'video99') this._video99Land(false, true);
    };
    document.addEventListener('fullscreenchange', this.__video99FsH);
  },

  _video99BindGestures(frame, vd) {
    const rt = this._video99Rt;
    let down = false, sx = 0, sy = 0, t0 = 0, moved = false, axis = '', side = 0, baseT = 0, baseV = 0, baseB = 0, target = 0;
    const chip = () => document.getElementById('video99Chip');
    frame.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.video99-ctl,.video99-eps,.video99-rot,.video99-close,.video99-backport,.video99-rail,.video99-parse')) return;
      down = true; moved = false; axis = '';
      sx = e.clientX; sy = e.clientY; t0 = performance.now();
      side = sx < window.innerWidth / 2 ? 0 : 1;
      baseT = vd.currentTime || 0;
      baseV = vd.muted ? 0 : vd.volume;
      baseB = rt.bri;
    });
    frame.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 14) {
        moved = true;
        axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        try { frame.setPointerCapture(e.pointerId); } catch (e2) {}
      }
      if (!moved) return;
      const c = chip();
      if (axis === 'h') {
        const dts = Math.max(-600, Math.min(600, dx * 0.6));
        target = Math.max(0, Math.min(vd.duration || 3600, baseT + dts));
        if (c) { c.style.display = ''; c.textContent = (dts >= 0 ? '⏩ +' : '⏪ −') + Math.abs(Math.round(dts)) + 's'; }
      } else if (side === 0) {
        this._video99BriSet(baseB - dy / 260);
        if (c) { c.style.display = ''; c.textContent = '☀️ 亮度 ' + Math.round(rt.bri * 100) + '%'; }
      } else {
        const nv = Math.max(0, Math.min(1, baseV - dy / 260));
        vd.volume = nv; vd.muted = false; rt.vol = nv;
        try { localStorage.setItem('video99_vol', String(nv)); } catch (e2) {}
        const vv = document.getElementById('video99Vol');
        if (vv) vv.value = Math.round(nv * 100);
        if (c) { c.style.display = ''; c.textContent = '🔊 音量 ' + Math.round(nv * 100) + '%'; }
      }
    });
    const up = () => {
      if (!down) return;
      if (moved) {
        if (axis === 'h') { try { if (isFinite(vd.duration)) vd.currentTime = target; } catch (e) {} }
        const c = chip();
        if (c) { clearTimeout(this.__video99ChipT); this.__video99ChipT = setTimeout(() => { c.style.display = 'none'; }, 350); }
      } else if (performance.now() - t0 < 350) {
        this._video99CtlToggle();
      }
      down = false; moved = false;
    };
    frame.addEventListener('pointerup', up);
    frame.addEventListener('pointercancel', up);
  },

  // 控件显隐（播放 3.6s 后自动隐藏 · 暂停时常驻）
  _video99CtlShow() {
    const rt = this._video99Rt;
    if (!rt) return;
    ['video99Ctl', 'video99Rot', 'video99Close', 'video99BackPort'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('show');
    });
    if (rt.hideT) clearTimeout(rt.hideT);
    rt.hideT = setTimeout(() => {
      const vd = document.getElementById('video99V');
      if (vd && !vd.paused) {
        ['video99Ctl', 'video99Rot', 'video99Close', 'video99BackPort'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.remove('show');
        });
      }
    }, 3600);
  },
  _video99CtlToggle() {
    const c = document.getElementById('video99Ctl');
    if (c && c.classList.contains('show')) {
      ['video99Ctl', 'video99Rot', 'video99Close', 'video99BackPort'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('show');
      });
    } else this._video99CtlShow();
  },

  _video99Close() {
    const rt = this._video99Rt;
    if (!rt) return;
    try { this._sfx99('back'); } catch (e) {}
    const vd = document.getElementById('video99V');
    if (vd) {
      if (rt.cur) this._video99ProgSet(rt.cur.k, vd.currentTime, vd.duration, true);
      try { vd.pause(); } catch (e) {}
    }
    if (rt.land) this._video99Land(false);
    const frame = document.getElementById('video99Frame');
    if (frame) frame.style.display = 'none';
    const eps = document.getElementById('video99Eps');
    if (eps) eps.style.display = 'none';
    rt.cur = null; rt.eps = []; rt.sources = []; rt.vod = null; rt.epIdx = 0; rt.srcIdx = 0;
  },

  // ==================== 设置 / 合规 / 正版 ====================
  _video99Settings() {
    const rt = this._video99Rt;
    if (!rt) return;
    try { this._sfx99('tap'); } catch (e) {}
    const sw = (k, n, des) => `<button class="video99-sw${rt[k] ? ' on' : ''}" onclick="App._video99SetSw(this,'${k}')"><i></i><em>${n}</em><small>${des}</small></button>`;
    this._modal('⚙️ 播放设置', `
      <div class="video99-setbox">
        ${sw('autoOri', '重力感应自动横屏', '手机横置自动切横屏，竖置返回竖屏（仅触屏设备）')}
        ${sw('remember', '记忆播放位置', '退出自动记录进度，再次打开续播')}
        ${sw('autoNext', '自动连播下一集', '本集播完自动播放下一集')}
        <div class="video99-param">
          <label>播放器独立亮度（不受系统亮度影响）<small id="video99BriLab">${Math.round(rt.bri * 100)}%</small></label>
          <input type="range" class="video99-setrange" min="10" max="100" step="5" value="${Math.round(rt.bri * 100)}"
            oninput="App._video99BriSet(this.value/100);document.getElementById('video99BriLab').textContent=this.value+'%'">
        </div>
        <div class="video99-pills" style="margin-top:10px">
          <button class="video99-mini" onclick="App._video99HistClear()">🕘 清空历史</button>
          <button class="video99-mini" onclick="App._video99FavClear()">⭐ 清空收藏</button>
          <button class="video99-mini" onclick="App._video99Disclaimer()">📜 重看合规声明</button>
          <button class="video99-mini" onclick="App._video99Official()">🔗 正版直达</button>
        </div>
        <div class="video99-note" style="margin-top:10px">播放内核：原生 video + 按需加载 hls.js / flv.js / dash.js（在线增强 · 离线自动降级）· 短视频解析去水印仅限个人观看</div>
      </div>`, [{ label: '完成', primary: true }]);
  },
  _video99SetSw(btn, k) {
    const rt = this._video99Rt;
    if (!rt) return;
    rt[k] = !rt[k];
    const map = { autoOri: 'video99_autoori', remember: 'video99_remember', autoNext: 'video99_autonext' };
    if (map[k]) { try { localStorage.setItem(map[k], rt[k] ? '1' : '0'); } catch (e) {} }
    btn.classList.toggle('on', !!rt[k]);
    try { this._sfx99(rt[k] ? 'on' : 'off'); } catch (e) {}
  },
  _video99FavClear() {
    try { localStorage.setItem('video99_fav', '[]'); } catch (e) {}
    if (this._video99Rt && this._video99Rt.tab === 'fav') this._video99Paint();
    this._flash('⭐ 收藏已清空');
  },

  _video99Disclaimer() {
    const rt = this._video99Rt;
    this._modal('📜 独行视频 · 合规声明', `
      <div class="video99-law">
        <p>本播放器仅提供视频播放界面，所有视频资源均来自互联网公开渠道，版权归原平台所有。我们坚决反对盗版，支持正版，请勿将本工具用于商业用途、二次分发或传播侵权内容。短视频解析去水印功能仅限个人观看，禁止盗用他人原创短视频。</p>
        <p class="tip">点击「同意并继续」即表示你已阅读并承诺遵守以上声明。会员内容请开通对应平台会员观看。</p>
      </div>`, [
      { label: '🔗 去看正版', onClick: () => { this._video99Official(); return false; } },
      {
        label: '✅ 同意并继续', primary: true, onClick: () => {
          if (rt) rt.agreed = true;
          try { localStorage.setItem('video99_ok', '1'); } catch (e) {}
        },
      },
    ]);
  },

  _video99Official(kw) {
    const k = kw || (this._video99Rt && this._video99Rt.kw) || '';
    try { this._sfx99('tap'); } catch (e) {}
    this._modal('🔗 正版直达 · 支持正版', `
      <div class="video99-panel">
        <div class="video99-note" style="margin:0 0 10px">一人行坚决反对盗版。以下为各平台官方搜索入口${k ? '（已带关键词「' + this.esc(k) + '」）' : ''}，会员内容请开通对应平台会员：</div>
        <div class="video99-pills">${this.VIDEO99_OFFICIAL.map(o =>
          `<button class="video99-mini" onclick="App._video99OpenTab('${o.u + encodeURIComponent(k)}')">${o.ico} ${o.n}</button>`).join('')}
        </div>
      </div>`, [{ label: '关闭', primary: true }]);
  },
  _video99OpenTab(u) {
    try { window.open(u, '_blank', 'noopener'); } catch (e) { this._flash('⚠️ 当前环境不支持新窗口——复制链接前往：' + u); }
  },

  // ==================== 离开（存进度 · 暂停 · 退横屏）====================
  _video99Leave() {
    const rt = this._video99Rt;
    if (!rt) return;
    const vd = document.getElementById('video99V');
    if (vd) {
      if (rt.cur) this._video99ProgSet(rt.cur.k, vd.currentTime, vd.duration, true);
      try { vd.pause(); } catch (e) {}
    }
    if (rt.land) this._video99Land(false);
  },

  // ==================== 入口（长按【记录】旋钮 1 秒 · 液体音 + 紫红圆幕）====================
  _video99Enter(ev) {
    const btn = document.querySelector('.dock99-btn[data-view="record"]');
    const r = btn ? btn.getBoundingClientRect() : null;
    const x = (ev && ev.clientX) || (r ? r.left + r.width / 2 : 40);
    const y = (ev && ev.clientY) || (r ? r.top + r.height / 2 : window.innerHeight - 40);
    const veil = document.createElement('div');
    veil.className = 'perm99-veil video99-veil';
    veil.style.setProperty('--vx', x + 'px');
    veil.style.setProperty('--vy', y + 'px');
    (document.body || document.documentElement).appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('run')));
    setTimeout(() => { try { this.navigate('video99'); } catch (e) {} }, 950);
    setTimeout(() => {
      veil.classList.add('fade');
      setTimeout(() => { try { veil.remove(); } catch (e) {} }, 380);
    }, 1080);
  },
  // 长按绑定（挂在【记录】旋钮上；bindNav 末尾统一调用）
  _video99BindEntry() {
    const hb = document.querySelector('.dock99-btn[data-view="record"]');
    if (!hb || hb.dataset.video99Wired) return;
    hb.dataset.video99Wired = '1';
    let lp = null, sx = 0, sy = 0;
    const clear = () => { if (lp) { clearTimeout(lp); lp = null; } };
    hb.addEventListener('pointerdown', (e) => {
      sx = e.clientX; sy = e.clientY;
      try { hb.setPointerCapture(e.pointerId); } catch (_) {}
      try { App._sfx99 && App._sfx99('liquid'); } catch (_) {}   // 液体音在按下瞬间（手势上下文内必出声）
      lp = setTimeout(() => {
        lp = null;
        App.__holdNav99 = true;   // 长按已触发：吞掉紧随的 click，不再进记录页
        try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
        try { this._video99Enter(e); } catch (_) {}
      }, 1000);
    });
    hb.addEventListener('pointermove', (e) => {
      if (!lp) return;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) clear();   // 手指滑动 = 取消
    });
    hb.addEventListener('pointerup', clear);
    hb.addEventListener('pointercancel', clear);
    hb.addEventListener('contextmenu', (e) => e.preventDefault());
  },
});
