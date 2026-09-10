// 100-solomusic99.js —— v12.9.46 【独行音乐】开源聚合搜索 + 像素可视化播放器
// [功能组] G5-情感陪伴 / G6-专注模式（音乐域：底部【首页】旋钮长按 1 秒进入本页）
//
// 设计（用户规则 · 独行音乐）：
//   · 入口：底部导航【首页】圆形旋钮长按 1 秒（液体流动音 + 圆幕渐变过渡，与权限管理一致）
//   · 音乐资源：开源聚合 API 直连（已验证 CORS 全开 · 免 key · 免后端代理）
//       搜索：GD Studio 聚合（网易云 / QQ音乐 / 酷狗 / 酷我 四平台，播放链接播放时即时解析、失效自动跳过）
//       歌单：各平台歌单分享链接 → Meting 聚合接口整单导入；汽水音乐（v12.9.46b）→ 拉分享页
//             解析 _ROUTER_DATA 曲目清单，逐曲跨平台智能匹配可播放音源（独家曲跳过）
//       本地：MP3 / WAV / FLAC 等文件导入（IndexedDB 落盘，刷新不丢）；支持拖放
//       内置：免版权曲库——Web Audio 程序合成原创芯片曲目（可按风格/情绪筛选，可商用零版权风险）
//   · 播放器：播放/暂停 · 上一首/下一首 · 进度条拖拽 · 音量 · 播放模式（单曲循环/列表循环/随机）
//   · 歌单管理：本地歌单增删改，localStorage 持久化不丢失
//   · 歌词：LRC 自动获取 · 滚动高亮 · 点击跳转
//   · 可视化（Canvas 像素引擎 · Web Audio AnalyserNode 实时频谱）：
//       3D 像素地形（方块随频谱起伏 · 鼓点凸起）/ 频谱柱 / 波形 / 粒子 / 动态背景 五种预设
//       参数可调：灵敏度 · 冷却时间 · 触发频段 · 强度 · 粒子特效开关
//   · 音频管线：本地文件与合成曲走 Web Audio（真实频谱）；平台曲 CDN 无 CORS 头时自动降级
//     直连播放（可视化切模拟律动，音乐不受影响）
//   · 技术说明：与全 App 一致的零依赖原生 JS + Web Audio + Canvas 实现（React/Three.js 不引入，
//     保证 APK 离线零体积增加）；聚合接口 CORS 全开，无需自建 Node 代理（调音页保留可配置代理位）
//   · 合规：仅个人学习与非商业用途；音乐版权归各平台；会员歌曲请开通对应平台会员
Object.assign(App, {

  // ==================== 常量 ====================
  SM99_KEY: 'one-xing-solomusic99-v1',
  SM99_API: 'https://music-api.gdstudio.xyz/api.php',       // 搜索/直链/歌词（CORS * · 已验证）
  SM99_METING: 'https://api.injahow.cn/meting/',            // 歌单整单导入（CORS * · 已验证）
  SM99_SRC: [
    { k: 'netease', n: '网易云', dot: '#e04a3f' },
    { k: 'tencent', n: 'QQ音乐', dot: '#12b7f5' },
    { k: 'kugou',   n: '酷狗',   dot: '#2ba5f7' },
    { k: 'kuwo',    n: '酷我',   dot: '#ffb628' },
  ],
  SM99_PRESET: [
    { k: 'terrain',   n: '像素地形', ico: '🏔️' },
    { k: 'bars',     n: '频谱柱',   ico: '📊' },
    { k: 'wave',     n: '波形',     ico: '〰️' },
    { k: 'particles',n: '粒子',     ico: '✨' },
    { k: 'dynbg',    n: '动态背景', ico: '🌌' },
  ],
  SM99_MODE: [
    { k: 'list',   n: '列表循环', ico: '🔁' },
    { k: 'single', n: '单曲循环', ico: '🔂' },
    { k: 'shuffle',n: '随机播放', ico: '🔀' },
  ],

  // ==================== 内置免版权曲库（程序合成原创 · 零版权风险）====================
  // 音阶（半音表 · 芯片五声）：度数字符 '0'-'9' 索引 → 半音偏移；'.' = 休止
  SM99_PENT_MAJ: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24],
  SM99_PENT_MIN: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24],
  SM99_SYN: [
    { k: 'dawn', n: '晨光启程', ico: '🌅', bpm: 128, root: 262, sc: 'MAJ', wave: 'square', mg: .13, echo: false,
      tags: ['8bit芯片', '欢快', '出发'],
      d: 'C 大调五声 · 明快弹跳主旋律 + 四拍鼓组 · 适合晨间与运动',
      mel: ['0.2.4.5.4.2.0...', '0.2.4.5.7...5...', '9.7.5.4.5.7...2.', '4.2.0.2.4.5.7.9.'],
      bas: ['0.......7.......', '5.......4.......', '0.......7.......', '0.......0.0.0...'],
      drm: ['K.H.S.H.K.H.S.HH', 'K.H.S.H.K.HKS.HH', 'K.H.S.H.K.H.S.HH', 'K.H.SKK.K.HKS.HH'] },
    { k: 'star', n: '星海漫游', ico: '🌌', bpm: 76, root: 220, sc: 'MIN', wave: 'triangle', mg: .16, echo: true,
      tags: ['Lo-Fi', '平静', '梦幻'],
      d: 'A 小调五声 · 柔和三角波 + 空灵回声 · 适合睡前与冥想',
      mel: ['0...3...5...7...', '5...3...0...2...', '7...5...3...2...', '0...0...2...3...'],
      bas: ['0...............', '................', '5...............', '3...............'],
      drm: ['K.......H.......', '....S.......H...', 'K.......H.......', '....S.....H.....'] },
    { k: 'battle', n: '像素战场', ico: '⚔️', bpm: 150, root: 165, sc: 'MIN', wave: 'square', mg: .12, echo: false,
      tags: ['8bit芯片', '紧张', '战斗'],
      d: 'E 小调五声 · 密集十六分驱动 + 低频泵动贝斯 · 适合训练与冲刺',
      mel: ['0.3.5.7.5.3.0.3.', '5.7.9.7.5.3.5.7.', '0.3.5.7.5.3.0.3.', '7.5.3.0.3.5.7.9.'],
      bas: ['0.0.0.0.0.0.0.0.', '5.5.5.5.3.3.3.3.', '0.0.0.0.0.0.0.0.', '0.0.5.0.3.0.5.0.'],
      drm: ['K.H.S.H.K.HKS.HH', 'K.H.S.H.K.HKS.HKK', 'K.HKS.H.K.H.S.HH', 'KK.H.S.H.K.HKS.HH'] },
    { k: 'creek', n: '溪谷鸟鸣', ico: '🐦', bpm: 90, root: 262, sc: 'MAJ', wave: 'triangle', mg: .15, echo: true,
      tags: ['Lo-Fi', '平静', '自然'],
      d: 'C 大调五声 · 高音区鸟鸣式点缀 + 轻沙锤 · 适合阅读与散步',
      mel: ['7..9..5...4..2..', '4.2.0...2.4.....', '7..9...7..5..4..', '2.4.5...4.2.0...'],
      bas: ['0.......4.......', '5.......2.......', '0.......4.......', '0.......0.......'],
      drm: ['H...H...H...H...', 'H...H...H...H.H.', 'H...H...H...H...', 'H...H...H...H...'] },
    { k: 'study', n: '深夜自习', ico: '📖', bpm: 100, root: 294, sc: 'MIN', wave: 'square', mg: .10, echo: true,
      tags: ['Lo-Fi', '专注', '学习'],
      d: 'D 小调五声 · 稳定分解琶音 + 极简鼓点 · 适合自习与码字',
      mel: ['0.3.5.7..5..3...', '3.5.7.9..7..5...', '5.7.9...7.5.3...', '0.3.5.3.0...3...'],
      bas: ['0.......5.......', '3.......7.......', '0.......5.......', '7.......5...3...'],
      drm: ['K...H...S...H...', 'K...H...S...H.H.', 'K...H...S...H...', 'K...H...S...H...'] },
    { k: 'triumph', n: '凯旋进行曲', ico: '🏆', bpm: 118, root: 349, sc: 'MAJ', wave: 'square', mg: .15, echo: false,
      tags: ['进行曲', '史诗', '胜利'],
      d: 'F 大调五声 · 军鼓行进 + 上行凯歌主旋律 · 适合完成挑战的奖励时刻',
      mel: ['5..4..2..0...2..', '4..5..7..9...7..', '9..7..5..4...2..', '0.2.4.5.7.9...0..'],
      bas: ['0.......0.......', '4.......4.......', '5.......5.......', '0..0..4.5...7...'],
      drm: ['K..K..S.K..K..S.', 'K..K..S.K..KS.KS', 'K..K..S.K..K..S.', 'K..KS.KS.K.KS.SS'] },
  ],

  // ==================== 数据（歌单与设置 · localStorage 持久化）====================
  _sm99Data() {
    try {
      const raw = localStorage.getItem(this.SM99_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.playlists) && d.playlists.length) {
          d.set = Object.assign({ mode: 'list', vol: 85, preset: 'terrain', sens: 1.2, cool: .12, band: 'low', inten: 1.4, part: true, proxy: '' }, d.set || {});
          return d;
        }
      }
    } catch (e) {}
    return { playlists: [{ id: 'p' + Date.now(), name: '我的歌单', created: Date.now(), songs: [] }], set: { mode: 'list', vol: 85, preset: 'terrain', sens: 1.2, cool: .12, band: 'low', inten: 1.4, part: true, proxy: '' }, last: null };
  },
  _sm99Save(d) { try { localStorage.setItem(this.SM99_KEY, JSON.stringify(d)); } catch (e) {} },
  _sm99Uid(s) { return [s.s, s.p || '', s.id || s.fk || s.sk || '', s.n].join('|'); },

  // ==================== IndexedDB（本地音乐文件落盘 · 刷新不丢）====================
  _sm99Idb() {
    return new Promise((ok, no) => {
      try {
        const rq = indexedDB.open('one-xing-sm99', 1);
        rq.onupgradeneeded = () => { try { rq.result.createObjectStore('files'); } catch (e) {} };
        rq.onsuccess = () => ok(rq.result);
        rq.onerror = () => no(rq.error || new Error('idb'));
      } catch (e) { no(e); }
    });
  },
  async _sm99IdbPut(key, blob) {
    const db = await this._sm99Idb();
    return new Promise((ok, no) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, key);
      tx.oncomplete = ok; tx.onerror = () => no(tx.error || new Error('put'));
    });
  },
  async _sm99IdbGet(key) {
    try {
      const db = await this._sm99Idb();
      return await new Promise((ok, no) => {
        const tx = db.transaction('files', 'readonly');
        const rq = tx.objectStore('files').get(key);
        rq.onsuccess = () => ok(rq.result || null);
        rq.onerror = () => no(rq.error || new Error('get'));
      });
    } catch (e) { return null; }
  },
  async _sm99IdbDel(key) {
    try {
      const db = await this._sm99Idb();
      await new Promise((ok) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').delete(key);
        tx.oncomplete = ok; tx.onerror = ok;
      });
    } catch (e) {}
  },

  // ==================== 聚合 API（限速队列：GD 接口 ≥1.05s 间隔 · 12s 超时）====================
  _sm99ApiQ: Promise.resolve(),
  _sm99ApiT: 0,
  _sm99Api(url) {
    const run = async () => {
      const gap = 1060 - (Date.now() - this._sm99ApiT);
      if (gap > 0) await new Promise(r => setTimeout(r, gap));
      this._sm99ApiT = Date.now();
      const ctrl = new AbortController();
      const to = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 12000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } finally { clearTimeout(to); }
    };
    this._sm99ApiQ = this._sm99ApiQ.then(run, run);
    return this._sm99ApiQ;
  },
  async _sm99Resolve(song) {
    const j = await this._sm99Api(this.SM99_API + '?types=url&source=' + song.p + '&id=' + encodeURIComponent(song.id));
    if (!j || !j.url) throw new Error('无可用音源');
    return j;
  },

  // ==================== Web Audio 基础（主增益 → 频谱仪 → 输出 · 合成器回声链）====================
  _sm99Ctx: null, _sm99Master: null, _sm99An: null, _sm99Echo: null,
  _sm99Ac() {
    if (!this._sm99Ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        this._sm99Ctx = new AC();
        this._sm99Master = this._sm99Ctx.createGain();
        this._sm99Master.gain.value = 0.8;
        this._sm99An = this._sm99Ctx.createAnalyser();
        this._sm99An.fftSize = 1024;
        this._sm99An.smoothingTimeConstant = 0.55;
        this._sm99Master.connect(this._sm99An);
        this._sm99An.connect(this._sm99Ctx.destination);
        // 回声链（合成曲 Lo-Fi 空灵感）：干声直达 master，湿声经延迟回馈
        const dl = this._sm99Ctx.createDelay(1.2);
        dl.delayTime.value = 0.23;
        const fb = this._sm99Ctx.createGain(); fb.gain.value = 0.32;
        const wet = this._sm99Ctx.createGain(); wet.gain.value = 0.28;
        dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(this._sm99Master);
        this._sm99Echo = { in: dl };
      } catch (e) { return null; }
    }
    if (this._sm99Ctx.state === 'suspended') { try { this._sm99Ctx.resume(); } catch (e) {} }
    return this._sm99Ctx;
  },

  // ==================== 合成曲引擎（16 步音序器 · 无限循环 BGM）====================
  _sm99SynSt: null,
  _sm99SynDef(k) { return this.SM99_SYN.find(t => t.k === k) || this.SM99_SYN[0]; },
  _sm99SynStart(def) {
    const ac = this._sm99Ac();
    if (!ac) return false;
    this._sm99SynStop();
    const steps = def.mel.length * 16;
    const st = { def, step: 0, nextT: ac.currentTime + 0.15 };
    this._sm99SynSt = st;
    const tick = () => {
      if (this._sm99SynSt !== st) return;
      const spb = 60 / def.bpm / 4;
      while (st.nextT < ac.currentTime + 0.30) {
        this._sm99SynStep(def, st.step, st.nextT, spb);
        st.nextT += spb;
        st.step = (st.step + 1) % steps;
      }
      setTimeout(tick, 110);   // setTimeout 而非 setInterval：节奏与页面生命周期解耦，切页不断
    };
    tick();
    return true;
  },
  _sm99SynStop() { this._sm99SynSt = null; },
  _sm99SynStep(def, step, t, spb) {
    const bar = Math.floor(step / 16), s16 = step % 16;
    const sc = def.sc === 'MIN' ? this.SM99_PENT_MIN : this.SM99_PENT_MAJ;
    const m = def.mel[bar][s16];
    if (m && m !== '.') { const sm = sc[+m]; if (sm != null) this._sm99Note(def.wave, def.root * Math.pow(2, sm / 12), t, spb * 1.9, def.mg, def.echo); }
    const b = def.bas[bar][s16];
    if (b && b !== '.') { const sm = sc[+b]; this._sm99Note('triangle', def.root / 2 * Math.pow(2, sm / 12), t, spb * 3.7, .24, false); }
    const d = def.drm[bar][s16];
    if (d === 'K') this._sm99Kick(t); else if (d === 'S') this._sm99Snare(t); else if (d === 'H') this._sm99Hat(t);
  },
  _sm99Note(wave, f, t, dur, vol, echo) {
    const ac = this._sm99Ctx; if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = wave; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this._sm99Master);
    if (echo && this._sm99Echo) { try { g.connect(this._sm99Echo.in); } catch (e) {} }
    o.start(t); o.stop(t + dur + 0.05);
  },
  _sm99Kick(t) {
    const ac = this._sm99Ctx; if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o.connect(g); g.connect(this._sm99Master);
    o.start(t); o.stop(t + 0.15);
  },
  _sm99Snare(t) {
    const ac = this._sm99Ctx; if (!ac) return;
    const n = Math.floor(ac.sampleRate * 0.09);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(); src.buffer = buf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9;
    const g = ac.createGain(); g.gain.value = 0.26;
    src.connect(bp); bp.connect(g); g.connect(this._sm99Master);
    src.start(t);
  },
  _sm99Hat(t) {
    const ac = this._sm99Ctx; if (!ac) return;
    const n = Math.floor(ac.sampleRate * 0.045);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(); src.buffer = buf;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6800;
    const g = ac.createGain(); g.gain.value = 0.11;
    src.connect(hp); hp.connect(g); g.connect(this._sm99Master);
    src.start(t);
  },

  // ==================== 双音频元素（A=Web Audio 管线 · B=直连兜底）====================
  _sm99ElA: null, _sm99ElB: null, _sm99SrcNode: null,
  _sm99Els() {
    if (this._sm99ElA) return true;
    const ac = this._sm99Ac();
    if (!ac) return false;
    // A：crossOrigin=anonymous + MediaElementSource（本地文件真实频谱；平台曲 CDN 带 CORS 头时也走这里）
    const a = document.createElement('audio');
    a.preload = 'auto'; a.crossOrigin = 'anonymous';
    this._sm99SrcNode = ac.createMediaElementSource(a);
    this._sm99SrcNode.connect(this._sm99Master);
    a.addEventListener('error', () => { try { this._sm99OnErr('A'); } catch (e) {} });
    a.addEventListener('ended', () => { try { this._sm99OnEnd(); } catch (e) {} });
    a.addEventListener('playing', () => { try { this._sm99OnPlayEv(); } catch (e) {} });
    a.addEventListener('pause', () => { try { this._sm99PauseEv(); } catch (e) {} });
    // B：无 Web Audio 直连（平台 CDN 无 CORS 头时：音乐照播，可视化转模拟律动）
    const b = document.createElement('audio');
    b.preload = 'auto';
    b.addEventListener('error', () => { try { this._sm99OnErr('B'); } catch (e) {} });
    b.addEventListener('ended', () => { try { this._sm99OnEnd(); } catch (e) {} });
    b.addEventListener('playing', () => { try { this._sm99OnPlayEv(); } catch (e) {} });
    b.addEventListener('pause', () => { try { this._sm99PauseEv(); } catch (e) {} });
    this._sm99ElA = a; this._sm99ElB = b;
    try { a.volume = 1; b.volume = Math.min(1, (this._sm99Data().set.vol || 85) / 100); } catch (e) {}
    return true;
  },

  // ==================== 播放状态机 ====================
  _sm99Rt: null, _sm99CorsBad: {},
  _sm99RtInit() {
    if (this._sm99Rt) return this._sm99Rt;
    const d = this._sm99Data();
    let plId = d.last && d.last.pl ? d.last.pl : (d.playlists[0] && d.playlists[0].id);
    if (!d.playlists.find(p => p.id === plId)) plId = d.playlists[0].id;
    this._sm99Rt = {
      tab: 'search', kw: '', srcK: 'netease', results: [], searching: false,
      plId, dead: {}, lrc: null, lrcIdx: -1, lrcTry: 0,
      cur: null, playing: false, el: null, // el: 'A'|'B'|'S'
      zeroFrm: 0, beat: 0, beatT: 0, avgLow: 40, skip: 0, synTag: '全部',
    };
    return this._sm99Rt;
  },
  _sm99Pl() {
    const d = this._sm99Data();
    const rt = this._sm99RtInit();
    return d.playlists.find(p => p.id === rt.plId) || d.playlists[0];
  },

  // 停止全部音源（synth / A / B）
  _sm99StopAll() {
    this._sm99SynStop();
    try { if (this._sm99ElA) { this._sm99ElA.pause(); this._sm99ElA.removeAttribute('src'); this._sm99ElA.load(); } } catch (e) {}
    try { if (this._sm99ElB) { this._sm99ElB.pause(); this._sm99ElB.removeAttribute('src'); this._sm99ElB.load(); } } catch (e) {}
    if (this._sm99Rt) { this._sm99Rt.playing = false; this._sm99Rt.el = null; }
  },

  // 播放一首：song 歌曲对象；list 播放上下文数组；i 当前索引
  async _sm99PlaySong(song, list, i) {
    if (!this._sm99Els()) { this._flash('⚠️ 当前浏览器不支持音频播放'); return; }
    // 与首页📻收音机互斥（避免双声部打架）
    try { if (this._m99Playing || this._home99RadioOn) { this.music99Stop(); this.home99RadioStop(); } } catch (e) {}
    this._sm99StopAll();
    const rt = this._sm99RtInit();
    rt.cur = { song, list: list || [song], i: i || 0 };
    rt.playing = true; rt.lrc = null; rt.lrcIdx = -1; rt.zeroFrm = 0;
    this._sm99PaintNp();
    this._sm99MediaSession(song);
    try {
      if (song.s === 'y') {                       // 内置合成曲
        const ok = this._sm99SynStart(this._sm99SynDef(song.sk));
        if (!ok) throw new Error('合成器启动失败');
        rt.el = 'S';
        this._sm99PaintNp();
        return;
      }
      let url = null;
      if (song.s === 'l') {                       // 本地文件（IndexedDB 取回）
        const blob = await this._sm99IdbGet(song.fk);
        if (!blob) { this._flash('⚠️ 本地文件已失效，请重新导入'); rt.playing = false; this._sm99PaintNp(); return; }
        url = URL.createObjectURL(blob);
        this._sm99ElA.src = url;
        rt.el = 'A';
        await this._sm99ElA.play();
        this._sm99PaintNp();
        return;
      }
      // 平台远程曲：解析直链（带过期时间 → 每次播放现解析）
      const r = await this._sm99Resolve(song);
      song.br = r.br || null;
      if (this._sm99CorsBad[song.p]) {            // 该平台 CDN 已知无 CORS 头 → 直连 B
        this._sm99ElB.src = r.url;
        rt.el = 'B';
        await this._sm99ElB.play();
      } else {                                    // 先尝试 A（真实频谱），失败自动降级 B
        this._sm99ElA.src = r.url;
        rt.el = 'A';
        await this._sm99ElA.play();
      }
      this._sm99PaintNp();
      this._sm99LyricFetch(song);                 // 歌词后台并行拉取
    } catch (e) {
      // 解析失败 / 播放失败 → 标死 + 自动跳下一首
      this._sm99MarkDead(song);
    }
  },
  // 播放列表上下文：歌单内播放
  _sm99PlayPlAt(i) {
    const pl = this._sm99Pl();
    if (!pl || !pl.songs.length) { this._flash('⚠️ 歌单是空的，先去搜索加歌吧'); return; }
    i = Math.max(0, Math.min(pl.songs.length - 1, i));
    const d = this._sm99Data(); d.last = { pl: pl.id, i }; this._sm99Save(d);
    this._sm99PlaySong(pl.songs[i], pl.songs, i);
  },
  _sm99MarkDead(song) {
    const rt = this._sm99RtInit();
    rt.dead[this._sm99Uid(song)] = true;
    rt.playing = false;
    this._sm99PaintNp();
    this._flash('⚠️ 《' + String(song.n || '').slice(0, 18) + '》暂无法播放，已自动跳过');
    if (rt.cur && rt.cur.list && rt.cur.list.length > 1 && rt.skip < rt.cur.list.length + 2) {
      rt.skip++;
      setTimeout(() => this._sm99Next(false), 350);
    }
  },
  _sm99OnErr(which) {
    const rt = this._sm99Rt;
    if (!rt || !rt.cur) return;
    const song = rt.cur.song;
    if (!song || song.s !== 'r') return;
    if (which === 'A') {
      // A 元素加载失败：大概率是平台 CDN 无 CORS 头 → 记住并立即用 B 重试
      this._sm99CorsBad[song.p] = true;
      this._sm99Els();
      this._sm99ElB.src = this._sm99ElA.src;
      rt.el = 'B';
      this._sm99ElB.play().catch(() => this._sm99MarkDead(song));
      return;
    }
    this._sm99MarkDead(song);                      // B 也失败 → 真死链
  },
  _sm99OnEnd() {
    const rt = this._sm99Rt;
    if (rt && rt.cur) {
      const d = this._sm99Data();
      if (d.set.mode === 'single') { this._sm99PlaySong(rt.cur.song, rt.cur.list, rt.cur.i); return; }
    }
    this._sm99Next(true);
  },
  _sm99OnPlayEv() { const rt = this._sm99Rt; if (rt) { rt.playing = true; rt.skip = 0; this._sm99PaintNp(); } },
  _sm99PauseEv() { const rt = this._sm99Rt; if (rt && !rt.cur) return; /* 换曲暂停不刷 */ },

  _sm99Toggle() {
    const rt = this._sm99RtInit();
    if (!rt.cur) { this._sm99PlayPlAt(0); return; }
    if (rt.el === 'S') {
      if (rt.playing) { this._sm99SynStop(); rt.playing = false; }
      else { this._sm99SynStart(this._sm99SynDef(rt.cur.song.sk)); rt.playing = true; }
      this._sm99PaintNp(); return;
    }
    const el = rt.el === 'B' ? this._sm99ElB : this._sm99ElA;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); rt.playing = true; }
    else { el.pause(); rt.playing = false; }
    this._sm99PaintNp();
  },
  _sm99Next(auto) {
    const rt = this._sm99RtInit();
    if (!rt.cur || !rt.cur.list.length) { this._sm99PlayPlAt(0); return; }
    const d = this._sm99Data();
    const L = rt.cur.list.length;
    let i;
    if (d.set.mode === 'shuffle' && L > 1) {
      do { i = Math.floor(Math.random() * L); } while (i === rt.cur.i);
    } else {
      i = (rt.cur.i + 1) % L;
    }
    this._sm99PlaySong(rt.cur.list[i], rt.cur.list, i);
  },
  _sm99Prev() {
    const rt = this._sm99RtInit();
    if (!rt.cur || !rt.cur.list.length) { this._sm99PlayPlAt(0); return; }
    const i = (rt.cur.i - 1 + rt.cur.list.length) % rt.cur.list.length;
    this._sm99PlaySong(rt.cur.list[i], rt.cur.list, i);
  },
  _sm99Seek(v) {
    const rt = this._sm99Rt; if (!rt || !rt.cur) return;
    if (rt.el === 'A' || rt.el === 'B') {
      const el = rt.el === 'B' ? this._sm99ElB : this._sm99ElA;
      try { el.currentTime = Math.max(0, Math.min(el.duration || 0, +v)); } catch (e) {}
    }
  },
  _sm99Vol(v) {
    const d = this._sm99Data();
    d.set.vol = Math.max(0, Math.min(100, Math.round(+v || 0)));
    this._sm99Save(d);
    try { if (this._sm99Master) this._sm99Master.gain.value = 0.8 * d.set.vol / 100; } catch (e) {}
    try { if (this._sm99ElB) this._sm99ElB.volume = d.set.vol / 100; } catch (e) {}
    const lab = document.getElementById('sm99VolLab');
    if (lab) lab.textContent = d.set.vol + '%';
  },
  _sm99ModeCycle() {
    const d = this._sm99Data();
    const i = this.SM99_MODE.findIndex(m => m.k === d.set.mode);
    d.set.mode = this.SM99_MODE[(i + 1) % this.SM99_MODE.length].k;
    this._sm99Save(d);
    this._flash('🎵 播放模式：' + this.SM99_MODE.find(m => m.k === d.set.mode).n);
    this._sm99PaintNp();
  },

  // ==================== 搜索（GD 聚合 · 四平台）====================
  async _sm99SearchGo() {
    const rt = this._sm99RtInit();
    const inp = document.getElementById('sm99Kw');
    const kw = (inp ? inp.value : rt.kw || '').trim();
    if (!kw) { this._flash('💡 想听什么？输入歌名或歌手搜一搜'); return; }
    rt.kw = kw;
    if (!navigator.onLine) { this._flash('⚠️ 当前离线——联网后才能搜索平台曲库（内置曲库不受影响）'); return; }
    rt.searching = true;
    this._sm99TabBody('search');
    try {
      const j = await this._sm99Api(this.SM99_API + '?types=search&source=' + rt.srcK + '&name=' + encodeURIComponent(kw) + '&count=30&pages=1');
      if (!Array.isArray(j)) throw new Error('empty');
      rt.results = j.filter(x => x && x.id && x.name)
        .map(x => ({ s: 'r', p: rt.srcK, id: String(x.id), n: String(x.name), a: (Array.isArray(x.artist) ? x.artist : [x.artist]).filter(Boolean).join(' / ') || '未知歌手', al: x.album || '', u: '' }));
      rt.results.forEach(s => { s.u = this._sm99Uid(s); });
      if (!rt.results.length) this._flash('🔎 没搜到「' + kw.slice(0, 16) + '」，换个关键词试试');
    } catch (e) {
      rt.results = [];
      this._flash('⚠️ 搜索失败（接口限流或网络波动），稍等几秒再试');
    }
    rt.searching = false;
    if (rt.tab === 'search') this._sm99TabBody('search');
  },
  _sm99SearchSrc(k) {
    const rt = this._sm99RtInit();
    rt.srcK = k;
    document.querySelectorAll('.sm99-src-chip').forEach(c => c.classList.toggle('on', c.dataset.p === k));
    try { this._sfx99('tap'); } catch (e) {}
  },

  // ==================== 歌单管理 ====================
  _sm99PlNew() {
    const d = this._sm99Data();
    const rt = this._sm99RtInit();
    let base = '新建歌单', n = 1;
    while (d.playlists.find(p => p.name === base + (n > 1 ? n : ''))) n++;
    const name = base + (n > 1 ? n : '');
    d.playlists.push({ id: 'p' + Date.now(), name, created: Date.now(), songs: [] });
    rt.plId = d.playlists[d.playlists.length - 1].id;
    this._sm99Save(d);
    this._flash('✅ 已创建「' + name + '」');
    this._sm99TabBody('pl');
  },
  _sm99PlSwitch(id) {
    const rt = this._sm99RtInit();
    rt.plId = id;
    this._sm99TabBody('pl');
  },
  _sm99PlRename() {
    const pl = this._sm99Pl();
    if (!pl) return;
    const v = prompt('歌单改名：', pl.name);
    if (v && v.trim()) {
      pl.name = v.trim().slice(0, 24);
      const d = this._sm99Data();
      const t = d.playlists.find(p => p.id === pl.id);
      if (t) t.name = pl.name;
      this._sm99Save(d);
      this._flash('✅ 已改名「' + pl.name + '」');
      this._sm99TabBody('pl');
    }
  },
  _sm99PlDel() {
    const d = this._sm99Data();
    const rt = this._sm99RtInit();
    const pl = this._sm99Pl();
    if (!pl) return;
    if (d.playlists.length <= 1) { this._flash('⚠️ 至少保留一个歌单'); return; }
    if (!confirm('删除歌单「' + pl.name + '」？其中 ' + pl.songs.length + ' 首不会删除本地文件')) return;
    d.playlists = d.playlists.filter(p => p.id !== pl.id);
    rt.plId = d.playlists[0].id;
    this._sm99Save(d);
    this._flash('🗑️ 歌单已删除');
    this._sm99TabBody('pl');
  },
  _sm99Add(song) {
    const pl = this._sm99Pl();
    if (!pl) return;
    const d = this._sm99Data();
    const t = d.playlists.find(p => p.id === pl.id);
    const u = this._sm99Uid(song);
    if (t.songs.find(x => this._sm99Uid(x) === u)) { this._flash('💡 这首已在歌单里了'); return; }
    t.songs.push(JSON.parse(JSON.stringify(song)));
    this._sm99Save(d);
    this._flash('✅ 已加入「' + t.name + '」（共 ' + t.songs.length + ' 首）');
    if (this._sm99Rt.tab === 'pl') this._sm99TabBody('pl');
  },
  _sm99Remove(i) {
    const pl = this._sm99Pl();
    const d = this._sm99Data();
    const t = d.playlists.find(p => p.id === pl.id);
    if (!t || i < 0 || i >= t.songs.length) return;
    const s = t.songs.splice(i, 1)[0];
    if (s.s === 'l') this._sm99IdbDel(s.fk);       // 本地文件一并清理
    this._sm99Save(d);
    this._flash('🗑️ 已移除《' + String(s.n).slice(0, 16) + '》');
    this._sm99TabBody('pl');
  },

  // ==================== 歌单链接导入（Meting 聚合 + 汽水音乐）====================
  async _sm99ImportLink() {
    const inp = document.getElementById('sm99Link');
    const raw = (inp ? inp.value : '').trim();
    if (!raw) { this._flash('💡 粘贴网易云/QQ/酷狗/酷我/汽水的歌单分享链接'); return; }
    if (!navigator.onLine) { this._flash('⚠️ 离线状态无法导入歌单'); return; }
    // v12.9.46b 汽水音乐：分享链接无公开聚合接口——拉分享页解析曲目后跨平台智能匹配
    if (/qishui\.douyin\.com|music\.douyin\.com\/qishui|luna\.douyin\.com/.test(raw)) {
      this._sm99ImportQishui(raw);
      return;
    }
    let p = null, id = null;
    let m;
    if (/(?:music\.)?163\.com/.test(raw) && (m = raw.match(/[?&]id=(\d+)/))) { p = 'netease'; id = m[1]; }
    else if (/y\.qq\.com/.test(raw) && (m = raw.match(/playlist\/([0-9A-Za-z]+)/))) { p = 'tencent'; id = m[1]; }
    else if (/kuwo\.cn/.test(raw) && (m = raw.match(/playlist_detail\/(\d+)/))) { p = 'kuwo'; id = m[1]; }
    else if (/kugou\.com/.test(raw) && (m = raw.match(/special\/single\/(\d+)/))) { p = 'kugou'; id = m[1]; }
    if (!p) {
      this._flash('⚠️ 暂无法识别该链接——请打开歌单页复制完整链接（163cn.tv 短链请先在浏览器打开再复制长链接）');
      return;
    }
    this._flash('⏳ 正在拉取歌单…');
    try {
      const j = await this._sm99Api(this.SM99_METING + '?server=' + p + '&type=playlist&id=' + encodeURIComponent(id));
      if (!Array.isArray(j) || !j.length) throw new Error('empty');
      const songs = j.map(x => {
        const mm = String(x.url || '').match(/id=(\d+)/);
        return { s: 'r', p, id: mm ? mm[1] : '', n: String(x.name || '未知曲目'), a: String(x.artist || '未知歌手').replace(/,/g, ' / '), al: '', u: '' };
      }).filter(s => s.id);
      songs.forEach(s => { s.u = this._sm99Uid(s); });
      if (!songs.length) throw new Error('parse');
      const d = this._sm99Data();
      const rt = this._sm99RtInit();
      const nm = '导入歌单 ' + (Store.today() || '').slice(5).replace('-', '/');
      const pl = { id: 'p' + Date.now(), name: nm, created: Date.now(), songs };
      d.playlists.push(pl);
      rt.plId = pl.id;
      this._sm99Save(d);
      if (inp) inp.value = '';
      this._flash('🎉 导入成功：「' + nm + '」共 ' + songs.length + ' 首');
      this._sm99TabBody('pl');
    } catch (e) {
      this._flash('⚠️ 歌单拉取失败（接口限流或歌单需权限），稍后再试或手动搜索添加');
    }
  },

  // ==================== 汽水音乐歌单导入（v12.9.46b）====================
  // 汽水（字节系）无公开聚合接口且音源加密——方案：拉分享页解析 _ROUTER_DATA 取曲目清单，
  // 逐曲跨平台（网易云 → QQ）智能匹配同名同歌手的可播放音源；独家/翻唱曲无法匹配则跳过。
  // 分享页跨域：走三重公共 CORS 代理链（allorigins → codetabs → corsproxy），任一成功即用。
  SM99_QS_PROXIES: [
    (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    (u) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
    (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
  ],
  // 平衡大括号扫描提取 _ROUTER_DATA = {...}（避免正则截断 JSON）
  _qs99Router(html) {
    const i = html.indexOf('_ROUTER_DATA');
    if (i < 0) return null;
    const s = html.indexOf('{', i);
    if (s < 0) return null;
    let depth = 0, inStr = false, esc = false;
    for (let j = s; j < html.length; j++) {
      const ch = html[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
      } else {
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (!depth) { try { return JSON.parse(html.slice(s, j + 1)); } catch (e) { return null; } } }
      }
    }
    return null;
  },
  // 递归收集曲目：qishui 分享页的字段名随版本浮动（track_infos/tracks/…），
  //   泛化识别「有歌名 + 有歌手 + 像时长」的节点即可，天然兼容单曲与歌单分享
  _qs99Tracks(node, out, seen) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(x => this._qs99Tracks(x, out, seen)); return; }
    const name = typeof node.name === 'string' ? node.name : (typeof node.track_name === 'string' ? node.track_name : (node.trackName && typeof node.trackName === 'string' ? node.trackName : null));
    if (name && name.length >= 1 && name.length <= 90) {
      let arts = node.artists || node.artist || (node.track && (node.track.artists || node.track.artist)) || null;
      if (arts && !Array.isArray(arts) && typeof arts === 'object') arts = arts.name ? [arts] : null;
      let aStr = '';
      if (Array.isArray(arts)) aStr = arts.map(x => typeof x === 'string' ? x : (x && x.name) || '').filter(Boolean).join(' / ');
      else if (typeof arts === 'string') aStr = arts;
      let al = node.album;
      if (al && typeof al === 'object') al = al.name || '';
      const dur = node.duration || node.interval || (node.track && node.track.duration) || 0;
      if (aStr && (!dur || dur > 25)) {                       // 时长（秒或毫秒）过短的是预览片段/铃声
        const key = name + '|' + aStr;
        if (!seen[key]) { seen[key] = 1; out.push({ n: name, a: aStr, al: String(al || '') }); }
      }
    }
    Object.values(node).forEach(v => this._qs99Tracks(v, out, seen));
  },
  _qs99Norm(x) { return String(x || '').toLowerCase().replace(/[\s'’·\-—_/\\()（）\[\]【】.。,，、!！?？:：;；"“”`~*]/g, ''); },
  _qs99Pick(arr, t) {
    const tn = this._qs99Norm(t.n);
    let best = null, bs = 0;
    for (const it of (arr || [])) {
      if (!it || !it.id || !it.name) continue;
      const n2 = this._qs99Norm(it.name);
      let sc = 0;
      if (n2 === tn) sc = 1;
      else if (n2.length > 2 && tn.length > 2 && (n2.includes(tn) || tn.includes(n2))) sc = .75;
      if (!sc) continue;
      const a2 = this._qs99Norm(Array.isArray(it.artist) ? it.artist.join('') : it.artist);
      const ta = this._qs99Norm(t.a);
      if (ta && a2) {
        if (a2.includes(ta) || ta.includes(a2)) sc += .15;
        else sc -= .3;
      }
      if (sc > bs) { bs = sc; best = it; }
    }
    return bs >= .6 ? best : null;
  },
  async _sm99ImportQishui(raw) {
    const mm = String(raw || '').match(/https?:\/\/[^\s"'，。”]+/);
    const link = mm ? mm[0] : String(raw || '').trim();
    const say = (x) => { const el = document.getElementById('sm99QsProg'); if (el) { el.style.display = 'block'; el.innerHTML = x; } else this._flash(x); };
    say('⏳ 正在拉取汽水分享页…');
    let html = '';
    for (const px of this.SM99_QS_PROXIES) {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 15000);
        const res = await fetch(px(link), { signal: ctrl.signal });
        clearTimeout(to);
        if (res.ok) { const t2 = await res.text(); if (t2 && t2.length > 800) { html = t2; break; } }
      } catch (e) {}
    }
    if (!html) { say('⚠️ 汽水分享页拉取失败（跨域代理不可达或链接失效）——换个网络稍后再试'); return; }
    const tracks = [];
    this._qs99Tracks(this._qs99Router(html), tracks, {});
    if (!tracks.length) { say('⚠️ 分享页解析不到曲目（可能是私密歌单或新版页面结构）'); return; }
    const cap = Math.min(tracks.length, 60);
    say(`📄 解析到 ${tracks.length} 首 · 开始跨平台匹配（约需 ${Math.ceil(cap * 1.2)} 秒，请勿离开本页）…`);
    const songs = [];
    for (let i = 0; i < cap; i++) {
      const t = tracks[i];
      say(`🧩 匹配中 ${i + 1}/${cap} · 已匹配 ${songs.length} 首 · 《${this.esc(t.n.slice(0, 14))}》`);
      for (const src of ['netease', 'tencent']) {
        try {
          const j = await this._sm99Api(this.SM99_API + '?types=search&source=' + src + '&name=' + encodeURIComponent(t.n + ' ' + t.a.split(' / ')[0]) + '&count=6');
          const pick = this._qs99Pick(Array.isArray(j) ? j : [], t);
          if (pick) { songs.push({ s: 'r', p: src, id: String(pick.id), n: t.n, a: t.a, al: t.al || '', u: '' }); break; }
        } catch (e) {}
      }
    }
    if (!songs.length) { say('⚠️ 一首都没匹配上——汽水歌单多为独家/翻唱曲目，试试手动搜索添加'); return; }
    songs.forEach(s => { s.u = this._sm99Uid(s); });
    const d = this._sm99Data();
    const rt = this._sm99RtInit();
    const nm = '汽水歌单 ' + (Store.today() || '').slice(5).replace('-', '/');
    d.playlists.push({ id: 'p' + Date.now(), name: nm, created: Date.now(), songs });
    rt.plId = d.playlists[d.playlists.length - 1].id;
    this._sm99Save(d);
    const inp = document.getElementById('sm99Link');
    if (inp) inp.value = '';
    this._sm99TabBody('pl');                                     // 重渲染后进度元素会重建，再写最终结果
    say(`🎉 汽水导入完成：「${nm}」可播放 ${songs.length}/${tracks.length} 首${songs.length < tracks.length ? `（${tracks.length - songs.length} 首独家曲无平台音源）` : ''}`);
  },

  // ==================== 本地文件导入（IndexedDB 落盘）====================
  async _sm99ImportFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const d = this._sm99Data();
    const rt = this._sm99RtInit();
    const t = d.playlists.find(x => x.id === rt.plId);
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!/^audio\//.test(f.type || '') && !/\.(mp3|wav|flac|m4a|ogg|aac|opus)$/i.test(f.name || '')) continue;
      const key = 'f' + Date.now() + '_' + i;
      try {
        await this._sm99IdbPut(key, f);
        const ext = (f.name.match(/\.([a-z0-9]+)$/i) || [])[1] || 'audio';
        t.songs.push({ s: 'l', fk: key, n: f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60), a: '本地音乐 · ' + ext.toUpperCase(), al: (f.size / 1048576).toFixed(1) + ' MB', u: '' });
        ok++;
      } catch (e) {}
    }
    this._sm99Save(d);
    this._flash(ok ? '✅ 已导入 ' + ok + ' 首本地音乐（已落盘，刷新不丢）' : '⚠️ 没有可导入的音频文件（支持 MP3/WAV/FLAC 等）');
    if (ok && rt.tab === 'pl') this._sm99TabBody('pl');
  },
  _sm99PickFiles() { const el = document.getElementById('sm99File'); if (el) el.click(); },
  _sm99FileInput(ev) { this._sm99ImportFiles(ev.target.files); ev.target.value = ''; },

  // ==================== 歌词（LRC）====================
  async _sm99LyricFetch(song) {
    const rt = this._sm99RtInit();
    if (!song || song.s !== 'r') { rt.lrc = null; this._sm99LrcPaint(); return; }
    try {
      const j = await this._sm99Api(this.SM99_API + '?types=lyric&source=' + song.p + '&id=' + encodeURIComponent(song.id));
      const txt = j && j.lyric ? String(j.lyric) : '';
      rt.lrc = this._sm99LrcParse(txt);
    } catch (e) { rt.lrc = null; }
    this._sm99LrcPaint();
  },
  _sm99LrcParse(txt) {
    if (!txt || !txt.trim()) return null;
    const out = [];
    txt.split(/\r?\n/).forEach(line => {
      const times = [...line.matchAll(/\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g)];
      if (!times.length) return;
      const text = line.replace(/\[[^\]]*\]/g, '').trim();
      times.forEach(m => {
        const t = (+m[1]) * 60 + (+m[2]) + (m[3] ? +('0.' + m[3]) : 0);
        if (text) out.push({ t, text });
      });
    });
    if (!out.length) return null;
    out.sort((a, b) => a.t - b.t);
    return out;
  },
  _sm99LrcPaint() {
    const rt = this._sm99Rt;
    if (!rt || rt.tab !== 'lrc') return;
    const box = document.getElementById('sm99LrcBox');
    if (!box) return;
    if (!rt.cur) { box.innerHTML = '<div class="sm99-lrc-none">🎵 还没有在播放——去搜索或歌单里点一首吧</div>'; return; }
    if (rt.cur.song.s !== 'r') { box.innerHTML = '<div class="sm99-lrc-none">🎹 纯音乐 · 尽情享受旋律本身</div>'; return; }
    if (!rt.lrc) { box.innerHTML = '<div class="sm99-lrc-none">📝 这首没有找到歌词（纯音乐或曲库未收录）</div>'; return; }
    box.innerHTML = rt.lrc.map((l, i) => '<div class="sm99-lrc-line' + (i === rt.lrcIdx ? ' on' : '') + '" data-t="' + l.t + '" onclick="App._sm99LrcJump(' + l.t + ')">' + this.esc(l.text) + '</div>').join('');
  },
  _sm99LrcJump(t) {
    this._sm99Seek(t);
    try { this._sfx99('tap'); } catch (e) {}
  },

  // ==================== 像素封面（确定性哈希 → 12×12 像素专辑图 · 零网络）====================
  _sm99Covers: {},
  _sm99Cover(seed) {
    const key = String(seed || 'x');
    if (this._sm99Covers[key]) return this._sm99Covers[key];
    let h = 5381;
    for (let i = 0; i < key.length; i++) { h = ((h << 5) + h + key.charCodeAt(i)) >>> 0; }
    const PALS = [
      ['#34d399', '#059669', '#a7f3d0'], ['#7dd3fc', '#0284c7', '#e0f2fe'], ['#f9a8d4', '#db2777', '#fce7f3'],
      ['#fbbf24', '#d97706', '#fef3c7'], ['#a78bfa', '#7c3aed', '#ede9fe'], ['#f472b6', '#be185d', '#fbcfe8'],
      ['#4ade80', '#16a34a', '#dcfce7'], ['#38bdf8', '#0369a1', '#f0f9ff'],
    ];
    const P = PALS[h % PALS.length];
    const cv = document.createElement('canvas');
    cv.width = 12; cv.height = 12;
    const c = cv.getContext('2d');
    const R = (x, y, w, hh, col) => { c.fillStyle = col; c.fillRect(x, y, w, hh); };
    R(0, 0, 12, 12, P[2]);
    R(0, 0, 12, 1, P[1]); R(0, 11, 12, 1, P[1]); R(0, 0, 1, 12, P[1]); R(11, 0, 1, 12, P[1]);
    for (let i = 0; i < 14; i++) {
      h = ((h * 1103515245) + 12345) >>> 0;
      const x = h % 10 + 1, y = (h >> 8) % 10 + 1;
      R(x, y, 1, 1, (h >> 16) % 3 === 0 ? P[0] : P[1]);
    }
    R(4, 4, 4, 4, P[0]);
    R(5, 5, 2, 2, P[2]);
    R(8, 5, 3, 1, P[0]); R(8, 6, 1, 2, P[0]);
    const url = cv.toDataURL();
    this._sm99Covers[key] = url;
    return url;
  },

  // ==================== 页面渲染 ====================
  render_solomusic99() {
    const v = document.getElementById('view-solomusic99');
    if (!v) return;
    const rt = this._sm99RtInit();
    const d = this._sm99Data();
    if (!this._sm99Covers._) this._sm99Covers._ = 1;
    v.innerHTML = `
      <div class="sm99-wrap">
        <div class="sm99-head">
          <button class="btn btn-ghost btn-sm" onclick="App.navBack()">← 返回</button>
          <div class="sm99-title">🎧 独行音乐</div>
          <div class="sm99-src-badge" title="开源聚合接口 · 已验证直连">聚合 · ${this.SM99_SRC.length} 平台</div>
        </div>
        <div class="sm99-sub">长按底部【🏠 首页】旋钮 1 秒可回到这里 · 网易云 / QQ音乐 / 酷狗 / 酷我聚合搜索</div>

        <div id="sm99Np"></div>

        <div class="sm99-vizbox">
          <canvas id="sm99Viz"></canvas>
          <div class="sm99-viz-tag" id="sm99VizTag"></div>
        </div>

        <div class="sm99-ctrl" id="sm99Ctrl">
          <button class="sm99-gbtn sm99-mode" id="sm99Mode" title="播放模式" onclick="App._sm99ModeCycle()"></button>
          <button class="sm99-gbtn" title="上一首" onclick="App._sm99Prev()">⏮</button>
          <button class="sm99-gbtn sm99-play" id="sm99Play" title="播放/暂停" onclick="App._sm99Toggle()">▶</button>
          <button class="sm99-gbtn" title="下一首" onclick="App._sm99Next()">⏭</button>
          <div class="sm99-volbox" title="音量">🔊<input type="range" id="sm99Vol" class="sm99-range" min="0" max="100" value="${d.set.vol}" oninput="App._sm99Vol(this.value)"><b id="sm99VolLab">${d.set.vol}%</b></div>
        </div>

        <div class="sm99-tabs">
          <button class="sm99-tab on" data-tab="search" onclick="App._sm99Tab('search')">🔍 搜索</button>
          <button class="sm99-tab" data-tab="pl" onclick="App._sm99Tab('pl')">📃 歌单</button>
          <button class="sm99-tab" data-tab="lib" onclick="App._sm99Tab('lib')">🎲 曲库</button>
          <button class="sm99-tab" data-tab="lrc" onclick="App._sm99Tab('lrc')">📝 歌词</button>
          <button class="sm99-tab" data-tab="tune" onclick="App._sm99Tab('tune')">🎛️ 调音</button>
        </div>
        <div class="sm99-tabbody" id="sm99TabBody"></div>

        <div class="sm99-foot">
          <b>⚖️ 合规说明</b>：本项目仅用于个人学习与非商业用途 · 音乐版权归各平台所有 ·
          会员歌曲请开通对应平台会员 · 内置曲库为程序合成原创（免版权可商用） ·
          外链免版权站（<a href="https://mixkit.co/free-stock-music/" target="_blank" rel="noopener">Mixkit</a> ·
          <a href="https://www.tosound.com/" target="_blank" rel="noopener">淘声网</a>）遵循其授权协议
        </div>
      </div>`;
    this._sm99PaintNp();
    this._sm99Tab(rt.tab, true);
    this._sm99VizStart();
    this._sm99BindDrop();   // 本地音乐拖放导入（拖到本页任意位置）
  },

  // 正在播放 hero + 控制区（切歌只刷这两块，不动搜索输入）
  _sm99PaintNp() {
    const rt = this._sm99RtInit();
    const d = this._sm99Data();
    const np = document.getElementById('sm99Np');
    const pb = document.getElementById('sm99Play');
    const md = document.getElementById('sm99Mode');
    if (md) { const m = this.SM99_MODE.find(x => x.k === d.set.mode) || this.SM99_MODE[0]; md.textContent = m.ico; md.title = m.n; }
    if (pb) { pb.textContent = rt.playing ? '⏸' : '▶'; pb.classList.toggle('playing', !!rt.playing); }
    if (!np) return;
    if (!rt.cur) {
      np.innerHTML = `<div class="card sm99-np">
        <div class="sm99-np-cover">${rt.dead._n ? '' : ''}<canvas data-pc="none"></canvas></div>
        <div class="sm99-np-mid">
          <div class="sm99-np-name" style="color:var(--text-faint)">还没有播放 · 点一首开始吧</div>
          <div class="sm99-np-artist">搜索平台曲库 / 播放歌单 / 或试试内置免版权曲库</div>
          <div class="sm99-np-bar"><input type="range" class="sm99-range sm99-prog" id="sm99Prog" min="0" max="100" value="0" disabled></div>
          <div class="sm99-np-time"><span id="sm99T1">0:00</span><span id="sm99T2">0:00</span></div>
        </div>
      </div>`;
      this._sm99CoverPaint(np.querySelector('canvas'), 'empty');
      return;
    }
    const s = rt.cur.song;
    const pdef = this.SM99_SRC.find(x => x.k === s.p);
    const def = s.s === 'y' ? this._sm99SynDef(s.sk) : null;
    const name = s.s === 'y' ? def.ico + ' ' + def.n : this.esc(String(s.n || '未知曲目'));
    const artist = s.s === 'y' ? this.esc(def.d) : this.esc(String(s.a || '')) + (s.al ? ' · ' + this.esc(String(s.al).slice(0, 22)) : '');
    const tag = s.s === 'y' ? '<span class="sm99-badge" style="background:#ecfdf5;color:#059669">合成曲 · ∞循环</span>'
      : s.s === 'l' ? '<span class="sm99-badge" style="background:#eff6ff;color:#1d4ed8">本地文件</span>'
      : '<span class="sm99-badge" style="background:#fff7ed;color:#c2410c">' + (pdef ? pdef.n : s.p) + (s.br ? ' · ' + Math.round(s.br / 1000) / 10 + 'M' : '') + '</span>';
    const dead = rt.dead[this._sm99Uid(s)];
    np.innerHTML = `<div class="card sm99-np${rt.playing ? ' on' : ''}">
      <div class="sm99-np-cover"><canvas data-pc="${this.esc(this._sm99Uid(s))}"></canvas>${rt.playing ? '<i class="sm99-np-eq"><b></b><b></b><b></b></i>' : ''}</div>
      <div class="sm99-np-mid">
        <div class="sm99-np-name"${dead ? ' style="text-decoration:line-through;opacity:.55"' : ''}>${name} ${tag}</div>
        <div class="sm99-np-artist">${artist}</div>
        <div class="sm99-np-bar"><input type="range" class="sm99-range sm99-prog" id="sm99Prog" min="0" max="1000" value="0" oninput="App._sm99Seek(this.value/1000*(App._sm99Rt&&App._sm99Rt.el&&App._sm99Rt.el!=='S'?(App._sm99Rt.el==='B'?App._sm99ElB.duration||0:App._sm99ElA.duration||0):0))"></div>
        <div class="sm99-np-time"><span id="sm99T1">0:00</span><span id="sm99T2">${rt.el === 'S' ? '∞' : '0:00'}</span></div>
      </div>
    </div>`;
    this._sm99CoverPaint(np.querySelector('canvas'), this._sm99Uid(s));
  },
  _sm99CoverPaint(cv, seed) {
    if (!cv) return;
    const url = this._sm99Cover(seed);
    const img = new Image();
    img.onload = () => {
      const c = cv.getContext('2d');
      cv.width = 96; cv.height = 96;
      c.imageSmoothingEnabled = false;
      c.drawImage(img, 0, 0, 96, 96);
    };
    img.src = url;
  },

  // ==================== Tab 渲染 ====================
  _sm99Tab(tab, force) {
    const rt = this._sm99RtInit();
    if (rt.tab === tab && !force) return;
    rt.tab = tab;
    document.querySelectorAll('.sm99-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
    this._sm99TabBody(tab);
  },
  _sm99TabBody(tab) {
    const body = document.getElementById('sm99TabBody');
    if (!body) return;
    const rt = this._sm99RtInit();
    const d = this._sm99Data();
    if (tab === 'search') {
      const chips = this.SM99_SRC.map(x => `<button class="sm99-src-chip${rt.srcK === x.k ? ' on' : ''}" data-p="${x.k}" onclick="App._sm99SearchSrc('${x.k}')"><i style="background:${x.dot}"></i>${x.n}</button>`).join('');
      let listHtml = '';
      if (rt.searching) listHtml = '<div class="sm99-empty">🔎 正在搜索「' + this.esc(rt.kw) + '」…</div>';
      else if (rt.results.length) {
        listHtml = rt.results.map((s, i) => {
          const dead = rt.dead[s.u];
          return `<div class="sm99-song${dead ? ' dead' : ''}">
            <img class="sm99-song-cover" src="${this._sm99Cover(s.u)}" alt="">
            <div class="sm99-song-mid" onclick="App._sm99PlaySong(App._sm99Rt.results[${i}],App._sm99Rt.results,${i})">
              <b>${this.esc(s.n)}${dead ? ' <span class="sm99-dead-tag">✕ 失效</span>' : ''}</b>
              <small>${this.esc(s.a)}${s.al ? ' · ' + this.esc(s.al.slice(0, 24)) : ''}</small>
            </div>
            <button class="sm99-song-btn" title="加入歌单" onclick="App._sm99Add(App._sm99Rt.results[${i}])">＋</button>
          </div>`;
        }).join('');
      } else {
        listHtml = '<div class="sm99-empty">输入歌名/歌手搜索 · 点结果即播放 · ＋加入歌单<br><small>搜索结果自动过滤无音源曲目（无法播放会自动跳过）</small></div>';
      }
      body.innerHTML = `
        <div class="sm99-searchbar">
          <input id="sm99Kw" class="input" placeholder="搜索歌名 / 歌手 / 专辑…" value="${this.esc(rt.kw)}" onkeydown="if(event.key==='Enter')App._sm99SearchGo()">
          <button class="btn btn-primary btn-sm" onclick="App._sm99SearchGo()">🔍 搜索</button>
        </div>
        <div class="sm99-src-row">${chips}</div>
        <div class="sm99-list">${listHtml}</div>`;
    }
    else if (tab === 'pl') {
      const pl = this._sm99Pl();
      const pills = d.playlists.map(p => `<button class="sm99-pl-pill${p.id === rt.plId ? ' on' : ''}" onclick="App._sm99PlSwitch('${p.id}')">${this.esc(p.name)}<small>${p.songs.length}</small></button>`).join('');
      const cur = this._sm99Rt.cur;
      const songs = pl.songs.length ? pl.songs.map((s, i) => {
        const playing = cur && this._sm99Uid(cur.song) === this._sm99Uid(s);
        return `<div class="sm99-song${playing ? ' playing' : ''}${rt.dead[this._sm99Uid(s)] ? ' dead' : ''}">
          <img class="sm99-song-cover" src="${this._sm99Cover(this._sm99Uid(s))}" alt="">
          <div class="sm99-song-mid" onclick="App._sm99PlayPlAt(${i})">
            <b>${playing ? '<span class="sm99-play-tag">▶</span> ' : ''}${this.esc(s.n)}${rt.dead[this._sm99Uid(s)] ? ' <span class="sm99-dead-tag">✕ 失效</span>' : ''}</b>
            <small>${this.esc(s.a || '')}${s.al && s.s !== 'l' ? ' · ' + this.esc(String(s.al).slice(0, 20)) : ''}</small>
          </div>
          <button class="sm99-song-btn" title="移出歌单" onclick="App._sm99Remove(${i})">✕</button>
        </div>`;
      }).join('') : '<div class="sm99-empty">这个歌单还是空的<br><small>去【搜索】加歌 / 导入歌单链接 / 导入本地音乐</small></div>';
      body.innerHTML = `
        <div class="sm99-pl-bar">
          <div class="sm99-pl-pills">${pills}</div>
          <button class="sm99-mini-btn" title="新建歌单" onclick="App._sm99PlNew()">＋ 新建</button>
        </div>
        <div class="sm99-pl-ops">
          <button class="sm99-mini-btn" onclick="App._sm99PlRename()">✏️ 改名</button>
          <button class="sm99-mini-btn" onclick="App._sm99PlDel()">🗑️ 删除歌单</button>
          <span class="sm99-pl-n">${pl.songs.length} 首 · 数据本地存储不丢失</span>
        </div>
        <div class="sm99-list">${songs}</div>
        <div class="sm99-import">
          <div class="sm99-imp-t">🔗 歌单链接导入（网易云 / QQ / 酷狗 / 酷我 / 汽水）</div>
          <div class="sm99-searchbar">
            <input id="sm99Link" class="input" placeholder="粘贴歌单分享链接——含汽水音乐（qishui.douyin.com）" onkeydown="if(event.key==='Enter')App._sm99ImportLink()">
            <button class="btn btn-primary btn-sm" onclick="App._sm99ImportLink()">导入</button>
          </div>
          <div class="sm99-lib-note" id="sm99QsProg" style="display:none"></div>
          <div style="font-size:10.5px;color:#94a3b8;margin:6px 0 2px;line-height:1.6">🥤 汽水音乐：粘贴歌单或单曲分享链接，自动解析曲目并跨平台匹配可播放音源（独家曲无法匹配，会自动跳过）。</div>
          <div class="sm99-imp-t">💾 本地音乐导入（MP3 / WAV / FLAC · 拖放到本页也可）</div>
          <button class="btn btn-ghost btn-sm" onclick="App._sm99PickFiles()">📁 选择音乐文件</button>
          <input type="file" id="sm99File" accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac,.opus" multiple style="display:none" onchange="App._sm99FileInput(this)">
        </div>`;
    }
    else if (tab === 'lib') {
      const TAGS = ['全部', '8bit芯片', 'Lo-Fi', '进行曲', '欢快', '平静', '梦幻', '紧张', '专注', '史诗', '自然', '战斗', '学习', '胜利', '出发'];
      const chips = TAGS.map(t => `<button class="sm99-src-chip${rt.synTag === t ? ' on' : ''}" onclick="App._sm99SynTag('${t}')">${t}</button>`).join('');
      const list = this.SM99_SYN.filter(t => rt.synTag === '全部' || t.tags.indexOf(rt.synTag) !== -1);
      body.innerHTML = `
        <div class="sm99-lib-note">🎲 内置免版权曲库 —— 程序合成原创芯片音乐（<b>零版权风险 · 可商用</b>），按风格 / 情绪筛选；联网平台曲在【搜索】</div>
        <div class="sm99-src-row">${chips}</div>
        <div class="sm99-list">${list.map(t => `
          <div class="sm99-song synth">
            <img class="sm99-song-cover" src="${this._sm99Cover('syn:' + t.k)}" alt="">
            <div class="sm99-song-mid" onclick="App._sm99PlaySyn('${t.k}')">
              <b>${t.ico} ${t.n}</b>
              <small>${this.esc(t.d)}</small>
              <div class="sm99-tags">${t.tags.map(x => '<span>' + x + '</span>').join('')}</div>
            </div>
            <button class="sm99-song-btn" title="加入歌单" onclick="App._sm99Add({s:'y',sk:'${t.k}',n:'${t.n}',a:'内置曲库',u:''})">＋</button>
          </div>`).join('') || '<div class="sm99-empty">该标签下暂无曲目</div>'}
        </div>`;
    }
    else if (tab === 'lrc') {
      body.innerHTML = '<div class="sm99-lrc" id="sm99LrcBox"></div>';
      this._sm99LrcPaint();
    }
    else if (tab === 'tune') {
      const pr = this.SM99_PRESET.map(p => `<button class="sm99-src-chip${d.set.preset === p.k ? ' on' : ''}" onclick="App._sm99Set('preset','${p.k}')">${p.ico} ${p.n}</button>`).join('');
      const bands = [['low', '低频（鼓点）'], ['mid', '中频（人声）'], ['full', '全频']].map(b => `<button class="sm99-src-chip${d.set.band === b[0] ? ' on' : ''}" onclick="App._sm99Set('band','${b[0]}')">${b[1]}</button>`).join('');
      body.innerHTML = `
        <div class="sm99-imp-t">🖼️ 可视化预设</div>
        <div class="sm99-src-row">${pr}</div>
        <div class="sm99-imp-t">🎚️ 可视化参数（实时生效）</div>
        <div class="sm99-param"><label>灵敏度<small>频谱 → 画面 的放大倍数</small></label>
          <input type="range" class="sm99-range" min="0.4" max="3" step="0.1" value="${d.set.sens}" oninput="App._sm99Set('sens',+this.value)"><b>${d.set.sens}</b></div>
        <div class="sm99-param"><label>冷却时间<small>数值越大起伏越快</small></label>
          <input type="range" class="sm99-range" min="0.02" max="0.4" step="0.01" value="${d.set.cool}" oninput="App._sm99Set('cool',+this.value)"><b>${d.set.cool}</b></div>
        <div class="sm99-param"><label>强度<small>鼓点冲击幅度</small></label>
          <input type="range" class="sm99-range" min="0.5" max="3" step="0.1" value="${d.set.inten}" oninput="App._sm99Set('inten',+this.value)"><b>${d.set.inten}</b></div>
        <div class="sm99-imp-t">📡 触发频段</div>
        <div class="sm99-src-row">${bands}</div>
        <div class="sm99-param-row">
          <label>✨ 粒子特效</label>
          <button class="sm99-sw${d.set.part ? ' on' : ''}" onclick="App._sm99Set('part',!${d.set.part})"><i></i><em>${d.set.part ? '开' : '关'}</em></button>
        </div>
        <div class="sm99-imp-t">🛰️ API 代理（可选 · 进阶）</div>
        <div class="sm99-searchbar">
          <input id="sm99Proxy" class="input" placeholder="默认直连聚合接口（已验证可用），无需代理" value="${this.esc(d.set.proxy)}">
          <button class="btn btn-primary btn-sm" onclick="App._sm99ProxySave()">保存</button>
        </div>
        <div class="sm99-lib-note">聚合接口 CORS 全开（搜索 / 直链 / 歌词 / 歌单导入均已直连验证），一般无需自建 Node 代理；若你部署了自用代理（如 Cloudflare Worker / Node 服务），填入地址后所有请求改走代理。</div>`;
    }
  },
  _sm99SynTag(t) {
    const rt = this._sm99RtInit();
    rt.synTag = t;
    this._sm99TabBody('lib');
  },
  _sm99PlaySyn(k) {
    const def = this._sm99SynDef(k);
    this._sm99PlaySong({ s: 'y', sk: k, n: def.n, a: '内置曲库', u: this._sm99Uid({ s: 'y', sk: k }) }, [{ s: 'y', sk: k }], 0);
  },
  _sm99Set(k, v) {
    const d = this._sm99Data();
    d.set[k] = v;
    this._sm99Save(d);
    if (k === 'preset' || k === 'band') this._sm99TabBody('tune');
  },
  _sm99ProxySave() {
    const el = document.getElementById('sm99Proxy');
    const v = (el ? el.value : '').trim();
    const d = this._sm99Data();
    d.set.proxy = v;
    this._sm99Save(d);
    this._flash(v ? '🛰️ 代理已保存，后续请求将走代理' : '✅ 已恢复直连模式');
  },

  // ==================== 可视化引擎（Canvas 像素渲染 · 单 rAF 主循环）====================
  _sm99VizOn: false,
  _sm99VizStart() {
    const rt = this._sm99RtInit();
    const cv = document.getElementById('sm99Viz');
    if (!cv) return;
    rt.cv = cv;
    rt.cx = cv.getContext('2d');
    try {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.parentElement.clientWidth || 320;
      cv.width = w * dpr; cv.height = 190 * dpr;
      cv.style.height = '190px';
      rt.cx.scale(dpr, dpr);
      rt.vw = w; rt.vh = 190;
    } catch (e) { rt.vw = 320; rt.vh = 190; }
    rt.parts = null;
    if (this._sm99VizOn) return;
    this._sm99VizOn = true;
    const loop = (ts) => {
      if (!this._sm99VizLoop(ts)) return;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  // 返回 false = 停止（画布已脱离 DOM）；单帧逻辑也驱动进度条/歌词/律动弹跳
  _sm99VizLoop(ts) {
    const rt = this._sm99Rt;
    if (!rt || !rt.cv || !rt.cv.isConnected) { this._sm99VizOn = false; return false; }
    const d = this._sm99Data();
    const s = this._sm99Spec(ts);
    // —— 鼓点检测（触发频段可调）——
    const lo = s.low;
    rt.avgLow = rt.avgLow * 0.92 + lo * 0.08;
    const beatGate = 150 + (d.set.band === 'mid' ? 60 : d.set.band === 'full' ? 90 : 0);
    if (lo > rt.avgLow * 1.38 + beatGate * 0.25 && ts - rt.beatT > 170) {
      rt.beatT = ts; rt.beat = 1;
      const pb = document.getElementById('sm99Play');
      if (pb && rt.playing) { pb.classList.remove('beat'); void pb.offsetWidth; pb.classList.add('beat'); }
    }
    rt.beat *= 0.90;
    // —— 绘制 ——
    try { this._sm99VizDraw(s, ts); } catch (e) {}
    // —— 进度条 / 时间 / 歌词滚动 ——
    this._sm99ProgTick(ts);
    return true;
  },
  // 频谱源：A=真实 AnalyserNode / B=模拟律动（含 A 被污染的兜底切换）
  _sm99Spec(ts) {
    const rt = this._sm99Rt;
    const d = this._sm99Data();
    const out = new Array(48).fill(0);
    let low = 0;
    const sim = () => {
      const t = (ts || 0) / 1000;
      const bpm = 118;
      const ph = (t * bpm / 60) % 1;
      const beat = Math.exp(-5 * ph);
      for (let i = 0; i < 48; i++) {
        const env = (0.42 + 0.58 * beat * (i < 10 ? 1 : 0.55));
        const v = (0.5 + 0.5 * Math.sin(t * (1.7 + i * 0.31) + i * 2.4)) * (0.5 + 0.5 * Math.sin(t * 0.61 + i * 0.9));
        out[i] = Math.max(0, Math.min(255, v * env * 190 * (1 - i / 48 * 0.72)));
      }
      low = (out[0] + out[1] + out[2] + out[3]) / 4 + beat * 130;
      return { bins: out, low, sim: true };
    };
    if (rt.el === 'B') return sim();
    if (rt.el === 'A' || rt.el === 'S') {
      const an = this._sm99An;
      if (an) {
        const raw = new Uint8Array(an.frequencyBinCount);
        try { an.getByteFrequencyData(raw); } catch (e) { return sim(); }
        let any = 0;
        for (let i = 0; i < 48; i++) {
          const b0 = Math.floor(Math.pow(i / 48, 1.55) * 340) + 1;
          const b1 = Math.max(b0 + 1, Math.floor(Math.pow((i + 1) / 48, 1.55) * 340) + 1);
          let mx = 0;
          for (let b = b0; b < b1 && b < raw.length; b++) { if (raw[b] > mx) mx = raw[b]; any += raw[b] > 12 ? 1 : 0; }
          out[i] = mx;
        }
        if (rt.el === 'A' && rt.playing) {
          rt.zeroFrm = any > 6 ? 0 : rt.zeroFrm + 1;
          if (rt.zeroFrm > 90) return sim();   // A 管线被 CORS 污染（全是 0）→ 模拟律动兜底
        }
        low = (out[0] + out[1] + out[2] + out[3]) / 4;
        return { bins: out, low, sim: false };
      }
    }
    return sim();
  },
  _sm99VizDraw(s, ts) {
    const rt = this._sm99Rt;
    const d = this._sm99Data();
    const c = rt.cx, W = rt.vw, H = rt.vh;
    const set = d.set;
    const sens = set.sens, inten = set.inten, cool = set.cool;
    const preset = set.preset || 'terrain';
    const t = (ts || 0) / 1000;
    if (preset === 'terrain') {
      // ===== 3D 像素地形 v2（v12.9.46b · 流动的时间长河）=====
      // 设计三要素（用户规则）：
      //   ① 起承转合：能量不再整列齐动——每格按「到中心的格距 × 单格延迟」回看历史快照，
      //      击拍从中心格先起、向四周逐格荡开（历史环形缓冲 90 帧 ≈ 1.5s）
      //   ② 水波纹：强鼓点在地形脚下水面生成像素菱环涟漪，逐帧扩散变淡
      //   ③ 时间长河：地形漂浮在向左流动的水面上——河面流光 + 地形倒影微光 + 色相随时间缓移；
      //      全局乐句呼吸包络（约 8s 起伏），地形有呼吸感而非持续乱抖
      c.fillStyle = '#0a1420';
      c.fillRect(0, 0, W, H);
      const G = 12, N = G * G;
      if (!rt.ter || rt.ter.length !== N) rt.ter = new Float32Array(N);
      const cw = Math.min(13, (W - 30) / (G * 2));
      const ch = cw * 0.5;
      const uH = 3.2;
      const ox = W / 2, oy = 12;
      const wy = Math.min(H - 26, oy + G * 2 * ch + 10);      // 河面水位线（地形脚下）
      // —— 历史快照环形缓冲（波传播数据源 · 每帧一份）——
      if (!rt.hist || !rt.hist.length || rt.hist[0].b.length !== 48) rt.hist = [];
      rt.hist.push({ b: s.bins.slice(0, 48), beat: rt.beat });
      if (rt.hist.length > 90) rt.hist.shift();
      const HN = rt.hist.length;
      const at = (fi) => rt.hist[Math.max(0, Math.min(HN - 1, fi))];   // 安全取历史帧
      // —— 乐句呼吸包络（起承转合的"合"：约 8s 一轮的整体起伏）——
      const phr = 0.74 + 0.26 * Math.sin(t * 0.8);
      // —— 时间长河：河面流光（向左流动 · 波带相位随时间推进）——
      const riverG = c.createLinearGradient(0, wy - 6, 0, H);
      riverG.addColorStop(0, 'rgba(10,26,40,0)');
      riverG.addColorStop(0.28, 'rgba(13,42,64,.92)');
      riverG.addColorStop(1, 'rgba(6,16,28,1)');
      c.fillStyle = riverG;
      c.fillRect(0, wy - 6, W, H - wy + 6);
      for (let row = 0; row < 4; row++) {
        const ry = wy + 2 + row * 5;
        const spd = 16 + row * 9;                              // 越深流得越快（视差）
        for (let k = 0; k < 9; k++) {
          const phase = ((k * 61 + (W - ((t * spd) % (W + 60)))) % (W + 60)) - 30;
          const shine = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.4 + k * 1.9 + row));
          c.fillStyle = `rgba(94,234,212,${(0.10 + 0.16 * shine) * (1 - row * 0.16)})`;
          const dw = 8 + Math.round(shine * 10);
          c.fillRect(Math.round(phase), ry, dw, 2);
        }
      }
      // 河面微光（低频能量 → 水面整体亮度的呼吸）
      c.fillStyle = `rgba(125,211,252,${0.05 + Math.min(0.1, s.low / 255 * 0.1)})`;
      c.fillRect(0, wy - 1, W, 2);
      // —— 水波纹（强鼓点 → 像素菱环从地形中心向外扩散）——
      if (rt.beat > 0.6 && ts - (rt.ripT || 0) > 240) {
        rt.ripT = ts;
        (rt.rip = rt.rip || []).push({ r: 4, a: 0.85 * Math.min(1, rt.beat) });
      }
      if (rt.rip && rt.rip.length) {
        for (let ri = rt.rip.length - 1; ri >= 0; ri--) {
          const rp = rt.rip[ri];
          rp.r += 2.2 + rt.beat * 1.6; rp.a *= 0.962;
          if (rp.a < 0.04 || rp.r > W * 0.8) { rt.rip.splice(ri, 1); continue; }
          const rw = rp.r, rh = rp.r * 0.5;                    // 菱环（贴合等距地形平面）
          c.fillStyle = `rgba(153,246,228,${rp.a})`;
          const steps = Math.max(14, Math.round(rw));
          for (let si = 0; si <= steps; si++) {
            const ang = si / steps * Math.PI * 2;
            const pxs = Math.round(ox + Math.cos(ang) * rw);
            const pys = Math.round(wy - 2 + Math.sin(ang) * rh);
            c.fillRect(pxs, pys, 2, 2);
            if (si % 2 === 0) { c.fillRect(pxs + 1, pys, 2, 2); }  // 加密采样防断环
          }
        }
      }
      // —— 星尘背景（随时间向左漂 · 顺流方向）——
      if (set.part) {
        for (let i = 0; i < 26; i++) {
          const drift = (t * (4 + (i % 3) * 3)) % (W + 8);
          const sx = W - drift;
          const sy = (i * 83.7 + Math.sin(t * 0.7 + i) * 8) % (wy * 0.62);
          c.fillStyle = i % 4 === 0 ? 'rgba(125,211,252,.5)' : 'rgba(255,255,255,.26)';
          c.fillRect(Math.floor(sx), Math.floor(sy), 2, 2);
        }
      }
      // —— 地形主体：每格回看「格距 × 延迟」帧前的频谱/鼓点 → 波从中心荡开 ——
      const DELAY = 2.3;                                       // 每格延迟帧数（中心→最外约 20 帧）
      for (let z = 0; z < G; z++) {
        for (let x = 0; x < G; x++) {
          const i = z * G + x;
          const dd = Math.hypot(x - (G - 1) / 2, z - (G - 1) / 2);
          const h = at(HN - 1 - Math.round(dd * DELAY));
          const bin = Math.floor((x / G) * 42) + 1;
          const boost = h.beat * 2.6 * inten;
          const tgt = (h.b[bin] / 255) * 26 * sens * phr + boost * (0.5 + 0.5 * Math.sin(x * .8 + z * .6 - t * 2));
          rt.ter[i] += (tgt - rt.ter[i]) * Math.min(1, cool * 6 + 0.06);
          const hpx = Math.max(1.5, rt.ter[i]) * uH / 3.2;
          const px = ox + (x - z) * cw;
          const py = oy + (x + z) * ch - hpx;
          // 色相随时间缓移（时间的颜色在流动）
          const hue = 152 + ((x + z) / (G * 2)) * 66 + Math.sin(t * 0.35) * 14;
          const li = Math.min(0.9, 0.45 + (h.b[bin] / 255) * 0.4);
          c.fillStyle = `hsl(${hue},62%,${Math.round(52 + li * 16)}%)`;
          c.beginPath();
          c.moveTo(px, py);
          c.lineTo(px + cw, py + ch);
          c.lineTo(px, py + ch * 2);
          c.lineTo(px - cw, py + ch);
          c.closePath(); c.fill();
          c.fillStyle = `hsl(${hue},58%,${Math.round(30 + li * 10)}%)`;   // 左侧面
          c.beginPath();
          c.moveTo(px - cw, py + ch);
          c.lineTo(px, py + ch * 2);
          c.lineTo(px, py + ch * 2 + hpx);
          c.lineTo(px - cw, py + ch + hpx);
          c.closePath(); c.fill();
          c.fillStyle = `hsl(${hue},58%,${Math.round(40 + li * 12)}%)`;   // 右侧面
          c.beginPath();
          c.moveTo(px + cw, py + ch);
          c.lineTo(px, py + ch * 2);
          c.lineTo(px, py + ch * 2 + hpx);
          c.lineTo(px + cw, py + ch + hpx);
          c.closePath(); c.fill();
          if (h.beat > 0.55 && (x + z) % 4 === 0 && set.part) {
            c.fillStyle = 'rgba(255,255,255,.75)';
            c.fillRect(px - 1, py - 3 - Math.random() * 4, 2, 2);
          }
        }
      }
      // —— 地形在河面的倒影微光（椭圆辉光 · 随低频呼吸，像倒影在水里晃）——
      const glowA = 0.06 + Math.min(0.12, s.low / 255 * 0.12) + rt.beat * 0.05;
      const rg = c.createRadialGradient(ox, wy, 4, ox, wy, G * cw * 0.9);
      rg.addColorStop(0, `rgba(94,234,212,${glowA})`);
      rg.addColorStop(1, 'rgba(94,234,212,0)');
      c.fillStyle = rg;
      c.beginPath();
      c.ellipse(ox, wy + 3, G * cw * 0.9, 12 + rt.beat * 5, 0, 0, Math.PI * 2);
      c.fill();
    }
    else if (preset === 'bars') {
      c.fillStyle = '#0a1420';
      c.fillRect(0, 0, W, H);
      const n = 48, bw = W / n;
      for (let i = 0; i < n; i++) {
        const v = (s.bins[i] / 255) * (H - 34) * sens + rt.beat * 14 * inten;
        const h = Math.max(3, Math.min(H - 30, v));
        const hue = 152 + (i / n) * 66;
        c.fillStyle = `hsl(${hue},70%,55%)`;
        const w = Math.max(2, Math.floor(bw) - 2);
        for (let y = 0; y < Math.floor(h / 6); y++) {
          c.fillRect(Math.floor(i * bw) + 1, H - 16 - y * 6 - 5, w, 5);        // 像素块堆叠
        }
        c.fillStyle = '#e2fce9';
        c.fillRect(Math.floor(i * bw) + 1, Math.max(4, H - 16 - h - 4), w, 2);  // 峰值帽
      }
      if (set.part && rt.beat > 0.5) {
        c.fillStyle = 'rgba(110,231,183,.85)';
        c.fillRect(0, H - 12, W * Math.min(1, rt.beat), 2);
      }
    }
    else if (preset === 'wave') {
      c.fillStyle = '#0a1420';
      c.fillRect(0, 0, W, H);
      const an = this._sm99An;
      let data = null;
      if ((rt.el === 'A' || rt.el === 'S') && an && !s.sim) {
        data = new Uint8Array(an.fftSize);
        try { an.getByteTimeDomainData(data); } catch (e) { data = null; }
      }
      c.lineWidth = 3;
      c.strokeStyle = '#34d399';
      c.shadowColor = '#34d399';
      c.shadowBlur = 10;
      c.beginPath();
      for (let x = 0; x < W; x += 3) {
        let y;
        if (data) {
          const idx = Math.floor(x / W * data.length);
          y = H / 2 + (data[idx] - 128) / 128 * (H / 2.6) * sens;
        } else {
          const t2 = t;
          y = H / 2 + Math.sin(x * 0.045 + t2 * 5) * Math.sin(x * 0.012 + t2 * 1.7) * (H / 3.2) * sens * (0.5 + rt.beat * 0.5);
        }
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
      c.shadowBlur = 0;
      if (set.part && rt.beat > 0.6) {
        c.fillStyle = 'rgba(110,231,183,.5)';
        for (let i = 0; i < 8; i++) c.fillRect(Math.random() * W, Math.random() * H, 3, 3);
      }
    }
    else if (preset === 'particles') {
      if (!rt.parts || !rt.parts.length) {
        rt.parts = Array.from({ length: 84 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 1.2, vy: (Math.random() - .5) * 1.2, s: 2 + Math.random() * 3, life: Math.random() }));
      }
      c.fillStyle = 'rgba(6,12,22,.32)';
      c.fillRect(0, 0, W, H);
      const energy = (s.bins[2] / 255) * sens;
      rt.parts.forEach(p => {
        p.x += p.vx * (1 + energy * 2 + rt.beat * 3);
        p.y += p.vy * (1 + energy * 2 + rt.beat * 3);
        p.life -= 0.004;
        if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || p.life <= 0) {
          if (rt.beat > 0.5) {   // 鼓点重生：中心爆发
            const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.5;
            p.x = W / 2; p.y = H / 2; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.life = 1;
          } else { p.x = Math.random() * W; p.y = Math.random() * H; p.life = 1; p.vx = (Math.random() - .5) * 1.2; p.vy = (Math.random() - .5) * 1.2; }
        }
        const hue = 150 + (1 - p.life) * 80;
        c.fillStyle = `hsla(${hue},80%,${45 + p.life * 25}%,${0.4 + p.life * 0.6})`;
        c.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.s), Math.ceil(p.s));
      });
    }
    else {  // dynbg 动态背景
      const hue = (t * 9 + rt.beat * 40) % 360;
      const g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, `hsl(${(hue + 140) % 360},48%,${8 + rt.beat * 10}%)`);
      g.addColorStop(1, `hsl(${(hue + 210) % 360},52%,${13 + energy2(s) * 14}%)`);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      for (let i = 0; i < 5; i++) {
        const r = 26 + (s.bins[i * 9] / 255) * 46 * sens;
        const bx = W / 2 + Math.cos(t * (0.5 + i * 0.21) + i * 2) * (W / 3.4);
        const by = H / 2 + Math.sin(t * (0.4 + i * 0.17) + i) * (H / 3.6);
        c.beginPath();
        c.arc(bx, by, r, 0, Math.PI * 2);
        c.fillStyle = `hsla(${(hue + i * 42) % 360},70%,58%,.13)`;
        c.fill();
      }
      if (rt.beat > 0.62) {
        c.strokeStyle = `hsla(${hue},85%,70%,${rt.beat * 0.7})`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(W / 2, H / 2, 20 + (1 - rt.beat) * 90, 0, Math.PI * 2);
        c.stroke();
      }
      c.strokeStyle = 'rgba(255,255,255,.07)';
      c.lineWidth = 1;
      for (let y = 0; y < H; y += 16) { c.beginPath(); c.moveTo(0, y + (t * 12 % 16)); c.lineTo(W, y + (t * 12 % 16)); c.stroke(); }
    }
    // 预设角标 + 数据源标记
    const tag = document.getElementById('sm99VizTag');
    if (tag) {
      const pd = this.SM99_PRESET.find(p => p.k === preset) || this.SM99_PRESET[0];
      tag.textContent = pd.ico + ' ' + pd.n + (s.sim ? ' · 模拟律动' : ' · 实时频谱');
    }
    function energy2(sp) { return (sp.bins[2] || 0) / 255; }
  },
  // 进度条 + 时间 + 歌词行进（rAF 内节流到 ~4Hz）
  _sm99LastProg: 0,
  _sm99ProgTick(ts) {
    if (ts - this._sm99LastProg < 240) return;
    this._sm99LastProg = ts;
    const rt = this._sm99Rt;
    if (!rt) return;
    const prog = document.getElementById('sm99Prog');
    const t1 = document.getElementById('sm99T1');
    const t2 = document.getElementById('sm99T2');
    const fmt = (x) => { x = Math.max(0, x | 0); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
    if (rt.el === 'A' || rt.el === 'B') {
      const el = rt.el === 'B' ? this._sm99ElB : this._sm99ElA;
      if (el && el.duration) {
        if (prog && document.activeElement !== prog) { prog.disabled = false; prog.value = Math.round(el.currentTime / el.duration * 1000); }
        if (t1) t1.textContent = fmt(el.currentTime);
        if (t2) t2.textContent = fmt(el.duration);
        // 歌词行进
        if (rt.lrc && rt.lrc.length && rt.tab === 'lrc') {
          let idx = -1;
          for (let i = 0; i < rt.lrc.length; i++) { if (rt.lrc[i].t <= el.currentTime + 0.2) idx = i; else break; }
          if (idx !== rt.lrcIdx) {
            rt.lrcIdx = idx;
            const box = document.getElementById('sm99LrcBox');
            if (box) {
              const lines = box.querySelectorAll('.sm99-lrc-line');
              lines.forEach((l, i) => l.classList.toggle('on', i === idx));
              if (idx >= 0 && lines[idx]) {
                const lineEl = lines[idx];
                const target = lineEl.offsetTop - box.clientHeight / 2 + lineEl.clientHeight / 2;
                box.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
              }
            }
          }
        }
      }
    } else if (rt.el === 'S' && rt.playing) {
      if (prog) { prog.disabled = true; prog.value = ((ts / 1000 % 30) / 30) * 1000; }
      if (t1) t1.textContent = fmt((ts / 1000) % 30);
    }
  },

  // ==================== 媒体会话（锁屏/通知栏控制 · Android）====================
  _sm99MediaSession(song) {
    try {
      if (!('mediaSession' in navigator)) return;
      const art = this._sm99Cover(this._sm99Uid(song));
      navigator.mediaSession.metadata = new MediaMetadata({
        title: String(song.n || '独行音乐'),
        artist: String(song.a || '一人行'),
        album: '独行音乐 · 一人行',
        artwork: [{ src: art, sizes: '96x96', type: 'image/png' }],
      });
      navigator.mediaSession.setActionHandler('play', () => this._sm99Toggle());
      navigator.mediaSession.setActionHandler('pause', () => this._sm99Toggle());
      navigator.mediaSession.setActionHandler('previoustrack', () => this._sm99Prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this._sm99Next());
    } catch (e) {}
  },

  // ==================== 入场（长按【首页】旋钮 1 秒 · 液体音 + 圆幕过渡）====================
  _sm99Enter(ev) {
    const btn = document.querySelector('.dock99-btn[data-view="dashboard"]');
    const r = btn ? btn.getBoundingClientRect() : null;
    const x = (ev && ev.clientX) || (r ? r.left + r.width / 2 : 40);
    const y = (ev && ev.clientY) || (r ? r.top + r.height / 2 : window.innerHeight - 40);
    const veil = document.createElement('div');
    veil.className = 'perm99-veil sm99-veil';
    veil.style.setProperty('--vx', x + 'px');
    veil.style.setProperty('--vy', y + 'px');
    (document.body || document.documentElement).appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('run')));
    setTimeout(() => { try { this.navigate('solomusic99'); } catch (e) {} }, 950);
    setTimeout(() => {
      veil.classList.add('fade');
      setTimeout(() => { try { veil.remove(); } catch (e) {} }, 380);
    }, 1080);
  },
  // 长按绑定（包装 bindNav，不改 15-utils 原实现）
  _sm99BindEntry() {
    const hb = document.querySelector('.dock99-btn[data-view="dashboard"]');
    if (!hb || hb.dataset.sm99Wired) return;
    hb.dataset.sm99Wired = '1';
    let lp = null, fired = false, sx = 0, sy = 0;
    const clear = () => { if (lp) { clearTimeout(lp); lp = null; } };
    hb.addEventListener('pointerdown', (e) => {
      fired = false; sx = e.clientX; sy = e.clientY;
      try { hb.setPointerCapture(e.pointerId); } catch (_) {}
      try { App._sfx99 && App._sfx99('liquid'); } catch (_) {}   // 液体音在按下瞬间（手势上下文内必出声）
      lp = setTimeout(() => {
        lp = null; fired = true;
        App.__holdNav99 = true;   // 长按已触发：紧随其后的 click 不跳首页（bindNav 里消费并清除）
        try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
        try { this._sm99Enter(e); } catch (_) {}
      }, 1000);
    });
    hb.addEventListener('pointermove', (e) => {
      if (!lp) return;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) clear();   // 手指滑动 = 取消长按
    });
    hb.addEventListener('pointerup', clear);
    hb.addEventListener('pointercancel', clear);
    hb.addEventListener('contextmenu', (e) => e.preventDefault());              // 手机长按不弹系统菜单
  },

  // ==================== 本地文件拖放导入（拖到本页任意位置）====================
  _sm99BindDrop() {
    if (this.__sm99DropWired) return;
    this.__sm99DropWired = 1;
    const wrap = document.getElementById('view-solomusic99');
    if (!wrap) return;
    let depth = 0;
    wrap.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; wrap.classList.add('sm99-drag'); });
    wrap.addEventListener('dragover', (e) => e.preventDefault());
    wrap.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; wrap.classList.remove('sm99-drag'); } });
    wrap.addEventListener('drop', (e) => {
      e.preventDefault(); depth = 0; wrap.classList.remove('sm99-drag');
      const fs = e.dataTransfer && e.dataTransfer.files;
      if (fs && fs.length) this._sm99ImportFiles(fs);
    });
  },
});