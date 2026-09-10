// 63-music99.js —— v12.9.13 全局音乐：Web Audio 程序化实时合成 3 首（零音频资源 · 零流量 · 无缝循环）
// [功能组] G5-情感陪伴 / G6-专注模式（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// ① 清醒马林巴：D 大调 · BPM122 · 4/4 —— 马林巴正弦+泛音快速衰减，明快颗粒律动，适合学习思考/运动
// ② 追梦少年：BPM128 · 4/4 —— 架子鼓独奏（v12.9.17 改编）：底鼓/军鼓/闭开镲/嗵鼓/吊镲/叮叮镲全套鼓组，
//    16 分网格密集鼓点 + 幽灵音 + 力度微随机（真人手感）；律动→加密→高潮双踩→大过门，演唱会现场感
// ③ 邦戈拉丁：邦戈鼓 + 拉丁旋律 · BPM 120 · 4/4
//    邦戈鼓高低鼓皮交替敲击（指尖/掌根/拇指轮扫），沙锤摇奏，尼龙吉他分解拨弦，
//    响木 Son Clave 2-3 + 牛铃 Montuno 切分 + 长笛歌唱性旋律 + 装饰音——
//    轻松起伏如眼前一对拉丁舞者享受音乐的洗礼（v12.9.29 重写拉丁骨架）
// v12.9.16 首页 hero：📻 统一播放器（音乐 / 今日播报二选一 · 见 media99Toggle；播报在 83-zhizhi99.js）
// 所有音符写入用模长回绕（%(len)），循环点即乐句衔接点 → BufferSource loop=true 天然无缝
Object.assign(App, {
  _m99Ctx: null, _m99Gain: null, _m99Src: null, _m99Bufs: {}, _m99Playing: null,
  MUSIC99: [
    { k: 'marimba', ico: '🎵', n: '清醒马林巴', d: 'D 大调 · BPM 122 · 颗粒感明快律动 · 适合学习思考与运动' },
    { k: 'dream',   ico: '🥁', n: '追梦少年',   d: 'BPM 128 · 架子鼓独奏 · 密集鼓点如演唱会现场' },
    { k: 'heal',    ico: '🪘', n: '邦戈拉丁',   d: 'BPM 120 · 邦戈鼓+响木+牛铃+长笛 · 拉丁舞者起舞的轻松起伏' },
  ],

  // ===== 基础设施 =====
  _m99Ac() {
    if (!this._m99Ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        this._m99Ctx = new AC();
        this._m99Gain = this._m99Ctx.createGain();
        this._m99Gain.gain.value = 0.55;
        this._m99Gain.connect(this._m99Ctx.destination);
      } catch (e) { return null; }
    }
    if (this._m99Ctx.state === 'suspended') { try { this._m99Ctx.resume(); } catch (e) {} }
    return this._m99Ctx;
  },
  async music99Buffer(key) {
    if (this._m99Bufs[key]) return this._m99Bufs[key];
    const ac = this._m99Ac();
    if (!ac) return null;
    const sr = ac.sampleRate;
    const data = key === 'marimba' ? this._m99Marimba(sr) : (key === 'dream' ? this._m99Dream(sr) : this._m99Heal(sr));
    const buf = ac.createBuffer(1, data.length, sr);
    try { buf.copyToChannel(data, 0); } catch (e) { buf.getChannelData(0).set(data); }
    this._m99Bufs[key] = buf;
    return buf;
  },
  // v12.9.16 peak 可选：治愈系音量偏小（0.58）/ 热血系略热（0.88）/ 默认 0.82
  _m99Norm(out, peak) {
    if (!(peak > 0)) peak = 0.82;
    let p = 0;
    for (let i = 0; i < out.length; i++) { const a = Math.abs(out[i]); if (a > p) p = a; }
    if (p > 0.001) { const g = peak / p; for (let i = 0; i < out.length; i++) out[i] *= g; }
    return out;
  },
  _m99Freq(m) { return 440 * Math.pow(2, (m - 69) / 12); },

  // ===== 播放控制（用户手势触发 → AudioContext 合法解锁）=====
  async music99Play(k) {
    const ac = this._m99Ac();
    if (!ac) { this._flash('当前浏览器不支持 Web Audio，无法播放音乐'); return; }
    const meta = this.MUSIC99.find(x => x.k === k) || {};
    this.music99Stop();
    if (this._home99RadioOn) { try { this.home99RadioStop(true); } catch (e) {} }   // v12.9.16 与播报互斥
    this._flash('💿 ' + (meta.n || '音乐') + ' · 合成加载中…');
    const buf = await this.music99Buffer(k);
    if (!buf) { this._flash('音乐合成失败，请稍后再试'); return; }
    try {
      const src = ac.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(this._m99Gain);
      src.start();
      this._m99Src = src; this._m99Playing = k;
      this._m99BtnSync();
      this._flash('💿 正在播放 · ' + (meta.n || '') + '（再点 📻 停止）');
    } catch (e) { this._flash('音乐播放失败'); }
  },
  music99Stop() {
    try { if (this._m99Src) { this._m99Src.stop(); this._m99Src.disconnect(); } } catch (e) {}
    this._m99Src = null; this._m99Playing = null;
    this._m99BtnSync();
  },
  // ===== v12.9.16 统一播放器：音乐 + 今日播报合二为一（用户单选播放其中之一）=====
  // 首页 hero 只留一个 📻 按钮：无播放时点开选择器；正在播放（音乐/播报任一）时点击即停止
  media99Toggle() {
    if (this._m99Playing) { this.music99Stop(); this._flash('⏹ 音乐已停止'); return; }
    if (this._home99RadioOn) { this.home99RadioStop(); return; }
    this.media99Picker();
  },
  media99Picker() {
    const curMusic = this._m99Playing;
    const radioOn = !!this._home99RadioOn;
    this._modal({
      title: '📻 播放器 · 音乐 / 今日播报',
      body: `<div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-bottom:10px">选择要播放的内容（音乐为 App 实时程序化合成 · 零流量 · 无缝循环；播报由阿福朗读今日要闻）：</div>` +
        `<div class="m99-track${radioOn ? ' on' : ''}" onclick="App.home99Radio();App._closeModal()">
          <div class="m99-track-ico">📡</div>
          <div class="m99-track-main">
            <div class="m99-track-name">今日播报${radioOn ? ' · 播放中' : ''}</div>
            <div class="m99-track-sub">阿福主播 · 聚合要闻 · 争取实时（致知电台 FM 87.7）</div>
          </div>
          <div class="m99-track-go">${radioOn ? '⏹' : '▶'}</div>
        </div>` +
        this.MUSIC99.map(x => `
          <div class="m99-track${curMusic === x.k ? ' on' : ''}" onclick="App.home99RadioStop(true);App.music99Play('${x.k}');App._closeModal()">
            <div class="m99-track-ico">${x.ico}</div>
            <div class="m99-track-main">
              <div class="m99-track-name">${x.n}${curMusic === x.k ? ' · 播放中' : ''}</div>
              <div class="m99-track-sub">${x.d}</div>
            </div>
            <div class="m99-track-go">${curMusic === x.k ? '⏹' : '▶'}</div>
          </div>`).join('') +
        ((curMusic || radioOn) ? `<div style="margin-top:10px;text-align:right"><button class="btn btn-ghost btn-sm" onclick="App.music99Stop();App.home99RadioStop();App._closeModal()">⏹ 全部停止</button></div>` : ''),
      actions: [{ label: '关闭' }],
    });
  },
  _m99BtnSync() {
    try { document.querySelectorAll('#m99MediaBtn').forEach(b => b.classList.toggle('playing', !!(this._m99Playing || this._home99RadioOn))); } catch (e) {}
  },

  // ===== ① 清醒马林巴（D 大调 · BPM122 · 32 小节循环：D-A-Bm-G ×4）=====
  _m99Marimba(sr) {
    const spb = 60 / 122 / 4;                       // 16 分音符
    const bars = 32;
    const len = Math.round(bars * 16 * spb * sr);
    const out = new Float32Array(len);
    const addNote = (midi, at, vel, dur) => {
      const f = this._m99Freq(midi);
      const n0 = Math.round(at * sr), nL = Math.round(dur * sr);
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        const env = Math.min(1, t / 0.003) * Math.exp(-t / 0.16);
        const s = Math.sin(2 * Math.PI * f * t) + 0.16 * Math.sin(2 * Math.PI * 3.95 * f * t) + 0.05 * Math.sin(2 * Math.PI * 9.2 * f * t);
        out[(n0 + i) % len] += s * env * vel;
      }
    };
    // 和声进行（每 2 小节一换）：D · A/C# · Bm · G（根音低音声部 MIDI）
    const roots = [50, 45, 47, 43];
    const tones = [                             // 每和弦的琶音音池（跨两个八度 · 索引即旋律 pattern 用值）
      [62, 66, 69, 74, 78, 81],                // D:  D4 F#4 A4 D5 F#5 A5
      [61, 64, 69, 73, 76, 81],                // A:  C#4 E4 A4 C#5 E5 A5
      [62, 66, 71, 74, 78, 83],                // Bm: B4 D5 F#5 B5 D6 F#6 → 降一个八度用
      [62, 67, 71, 74, 79, 83],                // G:  D4 G4 B4 D5 G5 B5
    ].map(a => a.map(m => m - 12));            // 整体降八度保持温润颗粒感
    // 旋律 pattern（32 个 16 分槽/2 小节 · null=休止 · 数字=音池索引）
    const PH1 = [0,2,3,2, 4,null,3,2, 1,3,2,null, 3,4,3,2, 0,2,3,5, 4,null,3,null, 2,3,1,3, 2,null,0,null];
    const PH2 = [5,4,3,4, 3,null,2,3, 2,1,0,1, 2,null,3,null, 5,3,2,3, 4,5,4,3, 2,3,1,2, 0,null,null,null];
    for (let bar = 0; bar < bars; bar++) {
      const ci = Math.floor(bar / 2) % 4;
      const bt = bar * 16 * spb;
      // 低音声部：1/3 拍根音 · 2/4 拍五度（八度低）
      for (let b = 0; b < 4; b++) {
        const midi = (b % 2 === 0 ? roots[ci] : roots[ci] + 7) - 12;
        addNote(midi, bt + b * 4 * spb, b % 2 === 0 ? 0.9 : 0.65, spb * 4 * 0.92);
      }
      // 主旋律：密集中16分琶音 · 后半周期换 pattern 变奏 · 每 4 小节留呼吸空拍
      const ph = (Math.floor(bar / 2) % 2 === 0) ? PH1 : PH2;
      for (let s = 0; s < 16; s++) {
        const idx = ph[(s + (bar % 4) * 2) % ph.length];
        if (idx === null || idx === undefined) continue;
        if (bar % 4 === 3 && s % 8 === 6) continue;   // 第 4 小节留气口
        const pool = tones[ci];
        const midi = pool[idx % pool.length] + 12 * Math.floor(idx / pool.length);
        addNote(midi, bt + s * spb, (s % 4 === 0 ? 0.8 : 0.55) * (bar % 2 ? 0.92 : 1), spb * 0.92);
      }
    }
    return this._m99Norm(out);
  },

  // ===== ② 追梦少年（架子鼓独奏 · BPM128 · 24 小节演唱会循环，v12.9.17 改编）=====
  // 只有一套架子鼓：底鼓（下扫正弦+起音click）/ 军鼓（噪声+鼓身+16分幽灵音）/ 闭镲·开镲
  //   / 嗵鼓四只（下行过门）/ 吊镲（段落起始重击）/ 叮叮镲（高潮骑行）
  // 16 分网格鼓点密集 · 每击力度 ±8% 微随机（真人手感）· 结构 A律动→B加密→C高潮双踩→D大过门回环
  _m99Dream(sr) {
    const bd = 60 / 128;                           // 一拍
    const TH = bd / 4;                            // 16 分音符
    const bars = 24;
    const len = Math.round(bars * 4 * bd * sr);
    const out = new Float32Array(len);
    const put = (i, v) => { out[i % len] += v; };
    const vel = (v) => v * (0.92 + Math.random() * 0.16);   // 力度微随机（真人手感）
    // 底鼓：正弦下扫 150→40Hz + 起音 click（鼓槌击皮）
    const kick = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.22 * sr);
      let ph = 0;
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        ph += 2 * Math.PI * (40 + 110 * Math.exp(-t / 0.028)) / sr;
        const click = Math.exp(-t / 0.002) * 0.35 * (Math.random() * 2 - 1);
        put(n0 + i, (Math.sin(ph) + click) * Math.exp(-t / 0.07) * v);
      }
    };
    // 军鼓：软化噪声 + 185Hz 鼓身 + 高频沙头
    const snare = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.19 * sr);
      let lp = 0;
      const a = 1 - Math.exp(-2 * Math.PI * 2600 / sr);
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        lp += a * ((Math.random() * 2 - 1) - lp);
        const head = Math.exp(-t / 0.012) * 0.5 * (Math.random() * 2 - 1);
        put(n0 + i, (lp * 0.6 + head + Math.sin(2 * Math.PI * 185 * t) * 0.38) * Math.exp(-t / 0.052) * v);
      }
    };
    // 闭镲：一阶高通噪声 · 快衰减（x − LP ≈ HP）
    const hatC = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.055 * sr);
      let lp = 0;
      const a = 1 - Math.exp(-2 * Math.PI * 7000 / sr);
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        lp += a * ((Math.random() * 2 - 1) - lp);
        put(n0 + i, ((Math.random() * 2 - 1) - lp) * Math.exp(-t / 0.014) * v);
      }
    };
    // 开镲：高通噪声长衰减 + 失谐方波金属簇
    const hatO = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.4 * sr);
      let lp = 0;
      const a = 1 - Math.exp(-2 * Math.PI * 6500 / sr);
      const met = [8200, 10300, 12700];
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        lp += a * ((Math.random() * 2 - 1) - lp);
        let m = 0;
        for (let k = 0; k < 3; k++) m += Math.sign(Math.sin(2 * Math.PI * met[k] * t));
        put(n0 + i, (((Math.random() * 2 - 1) - lp) * 0.7 + m * 0.06) * Math.exp(-t / 0.09) * v);
      }
    };
    // 嗵鼓：正弦下扫 f0→f1 + 起音
    const tom = (at, f0, f1, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.34 * sr);
      let ph = 0;
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        ph += 2 * Math.PI * (f1 + (f0 - f1) * Math.exp(-t / 0.05)) / sr;
        put(n0 + i, (Math.sin(ph) + Math.exp(-t / 0.004) * 0.2 * (Math.random() * 2 - 1)) * Math.exp(-t / 0.11) * v);
      }
    };
    // 吊镲：高通噪声长衰减（1.8s）+ 四簇金属泛音
    const crash = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(1.8 * sr);
      let lp = 0;
      const a = 1 - Math.exp(-2 * Math.PI * 5500 / sr);
      const met = [5100, 6700, 8900, 11300];
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        lp += a * ((Math.random() * 2 - 1) - lp);
        let m = 0;
        for (let k = 0; k < 4; k++) m += Math.sign(Math.sin(2 * Math.PI * met[k] * t));
        put(n0 + i, (((Math.random() * 2 - 1) - lp) * 0.8 + m * 0.05) * Math.exp(-t / 0.55) * v);
      }
    };
    // 叮叮镲：金属 ping + 高频噪声（骑行律动）
    const ride = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.5 * sr);
      let lp = 0;
      const a = 1 - Math.exp(-2 * Math.PI * 7500 / sr);
      const met = [3200, 4300, 5600];
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        lp += a * ((Math.random() * 2 - 1) - lp);
        let m = 0;
        for (let k = 0; k < 3; k++) m += Math.sin(2 * Math.PI * met[k] * t);
        put(n0 + i, (((Math.random() * 2 - 1) - lp) * 0.35 + m * 0.12) * Math.exp(-t / 0.28) * v);
      }
    };
    // —— 编排（pos(小节, 16分格)）——
    const pos = (b, s) => b * 4 * bd + s * TH;
    // A 段 b0-3：律动建立——8 分闭镲 + 底鼓 1/3 拍 + 军鼓 2/4 拍
    for (let b = 0; b < 4; b++) {
      [0, 2, 4, 6, 8, 10, 12, 14].forEach(s => hatC(pos(b, s), vel(0.16)));
      [0, 6, 8].forEach(s => kick(pos(b, s), vel(0.62)));
      if (b === 3) [0, 6, 8, 14].forEach(s => kick(pos(b, s), vel(0.62)));
      [4, 12].forEach(s => snare(pos(b, s), vel(0.55)));
      if (b === 3) { snare(pos(b, 13), vel(0.30)); snare(pos(b, 14), vel(0.42)); snare(pos(b, 15), vel(0.55)); }  // 小过门渐强
    }
    // B 段 b4-11：加密——16 分闭镲 + 切分底鼓 + 军鼓幽灵音 + b11 换骑行镲
    for (let b = 4; b < 12; b++) {
      if (b < 11) {
        for (let s = 0; s < 16; s++) hatC(pos(b, s), vel(s % 2 === 0 ? 0.16 : 0.09));   // 16 分镲（正格重、反格轻）
      } else {
        [0, 4, 8, 12].forEach(s => ride(pos(b, s), vel(0.24)));                          // 骑行镲
        [2, 6, 10, 14].forEach(s => hatC(pos(b, s), vel(0.10)));
      }
      [0, 6, 8, 10].forEach(s => kick(pos(b, s), vel(0.62)));
      if (b % 2 === 1) kick(pos(b, 3), vel(0.50));                                       // 切分补踢
      [4, 12].forEach(s => snare(pos(b, s), vel(0.58)));
      [7, 15].forEach(s => snare(pos(b, s), vel(0.11)));                                 // 16 分幽灵音
      if (b === 7) { tom(pos(b, 12), 220, 178, 0.5); tom(pos(b, 13), 178, 145, 0.48); tom(pos(b, 14), 145, 118, 0.46); snare(pos(b, 15), vel(0.6)); }  // 嗵鼓小过门
      if (b === 11) [12, 13, 14, 15].forEach((s, i) => snare(pos(b, s), vel(0.22 + i * 0.13)));  // 军鼓渐强滚奏
    }
    // C 段 b12-19：高潮——吊镲开场 + 底鼓 8 分双踩 + 开镲重拍 + 军鼓重音
    crash(pos(12, 0), 0.44);
    crash(pos(16, 0), 0.38);
    for (let b = 12; b < 20; b++) {
      [0, 2, 4, 6, 8, 10, 12, 14].forEach(s => kick(pos(b, s), vel(0.70)));              // 8 分双踩（disco 律动·威猛）
      if (b % 4 === 3) kick(pos(b, 15), vel(0.5));                                        // 句尾补踢
      [4, 12].forEach(s => snare(pos(b, s), vel(0.62)));
      if (b === 14 || b === 18) snare(pos(b, 14), vel(0.5));                             // 偶发重音
      [0, 4, 8, 12].forEach(s => hatO(pos(b, s), vel(0.20)));                             // 开镲重拍（演唱会感）
      [2, 6, 10, 14].forEach(s => hatC(pos(b, s), vel(0.12)));
      if (b >= 16) [0, 4, 8, 12].forEach(s => ride(pos(b, s), vel(0.18)));               // 叠骑行镲推向末段
      if (b === 15 || b === 19) { tom(pos(b, 12), 220, 178, 0.5); tom(pos(b, 13), 178, 145, 0.48); tom(pos(b, 14), 145, 118, 0.46); tom(pos(b, 15), 118, 95, 0.44); }
    }
    // D 段 b20-23：大过门→回环——嗵鼓两轮下行 + 军鼓全格渐强滚 + 吊镲收束（长衰减自然跨循环点）
    for (let b = 20; b < 22; b++) {
      [0, 2, 4, 6, 8, 10, 12, 14].forEach(s => hatC(pos(b, s), vel(0.14)));
      [0, 6, 8].forEach(s => kick(pos(b, s), vel(0.6)));
      [4, 12].forEach(s => snare(pos(b, s), vel(0.55)));
    }
    // b21 第 3-4 拍嗵鼓下行过门
    tom(pos(21, 8), 220, 178, 0.55); tom(pos(21, 9), 190, 155, 0.52);
    tom(pos(21, 10), 165, 135, 0.50); tom(pos(21, 11), 140, 115, 0.50);
    tom(pos(21, 12), 118, 95, 0.48); tom(pos(21, 13), 105, 88, 0.46);
    tom(pos(21, 14), 95, 82, 0.46); tom(pos(21, 15), 88, 78, 0.46);
    // b22 军鼓全格渐强滚奏（0.15→0.5）
    for (let s = 0; s < 16; s++) snare(pos(22, s), vel(0.15 + s * 0.023));
    // b23 吊镲重击 + 双底鼓收束（尾拍渐静，回 A 段律动）
    crash(pos(23, 0), 0.46);
    kick(pos(23, 0), vel(0.72)); kick(pos(23, 8), vel(0.55));
    hatO(pos(23, 0), vel(0.20));
    snare(pos(23, 4), vel(0.45)); snare(pos(23, 12), vel(0.40));
    return this._m99Norm(out, 0.88);
  },

  // ===== ③ 邦戈拉丁（邦戈鼓 + 长笛 + 尼龙吉他 · BPM 120 · 16 小节循环）=====
  // 邦戈鼓 = 高鼓皮(260Hz 下扫)+低鼓皮(180Hz 下扫)，指尖/掌根/拇指轮扫四种击法；
  // 响木 Son Clave 2-3 · 牛铃 Montuno 切分 · 沙锤摇奏 · 尼龙吉他切分拨弦 ·
  // 长笛歌唱性旋律——轻松起伏如眼前一对拉丁舞者享受音乐的洗礼（v12.9.29 重写）
  _m99Heal(sr) {
    const bd = 60 / 120;                           // 一拍
    const s16 = bd / 4;                            // 16 分音符
    const bars = 16;
    const len = Math.round(bars * 4 * bd * sr);
    const out = new Float32Array(len);
    const put = (i, v) => { out[i % len] += v; };
    const vel = (v) => v * (0.9 + Math.random() * 0.18);  // 力度微随机（真人手感）
    // 段落力度系数：A 律动(0.85) / B 起伏(1.0) / A' 回归(0.9) / C 高潮回环(1.15)
    const dyn = (bar) => bar < 4 ? 0.85 : (bar < 8 ? 1.0 : (bar < 12 ? 0.9 : 1.15));

    // —— 邦戈鼓（高低双鼓皮 · type: hi 高鼓/lo 低鼓/tip 指尖/mute 闷击）——
    const bongo = (at, v, type) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.16 * sr);
      const base = type === 'hi' || type === 'tip' ? 260 : 180;
      let ph = 0;
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        ph += 2 * Math.PI * (base + 60 * Math.exp(-t / 0.02)) / sr;
        const noiseAmt = type === 'mute' ? 0.4 : 0.15;
        const dec = type === 'mute' ? 0.04 : (type === 'tip' ? 0.06 : 0.1);
        const noise = noiseAmt * Math.exp(-t / dec) * (Math.random() * 2 - 1);
        const env = type === 'tip' ? Math.exp(-t / 0.05) : Math.exp(-t / dec);
        put(n0 + i, (Math.sin(ph) + noise) * env * v);
      }
    };
    // 拇指轮扫（高频快速连续轻击 · 拇指沿鼓面扫过）
    const gliss = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.12 * sr);
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        const env = Math.exp(-t / 0.03);
        const n = 0.08 * (Math.random() * 2 - 1);
        const tone = 0.04 * Math.sin(2 * Math.PI * 320 * t);
        put(n0 + i, (n + tone) * env * v);
      }
    };

    // —— 响木 Clave（2-3 Son Clave · 木头敲击高频短促）——
    // 音色：2500Hz 方波基 + 5300/7800Hz 泛音 · 极短衰减（45ms）· 颗粒感木头声
    const clave = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.045 * sr);
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        const env = Math.exp(-t / 0.018);
        const s = Math.sign(Math.sin(2 * Math.PI * 2500 * t)) * 0.5
          + 0.3 * Math.sin(2 * Math.PI * 5300 * t)
          + 0.15 * Math.sin(2 * Math.PI * 7800 * t);
        put(n0 + i, s * env * v);
      }
    };

    // —— 牛铃 Cowbell（金属敲击 · Montuno 切分重音）——
    // 音色：540/800/1100Hz 不和谐簇（金属共振）+ 短噪声起音 · 衰减 200ms
    const cowbell = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(0.2 * sr);
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        const env = Math.exp(-t / 0.08) * Math.min(1, t / 0.001);
        const click = Math.exp(-t / 0.0015) * 0.3 * (Math.random() * 2 - 1);
        const s = 0.4 * Math.sign(Math.sin(2 * Math.PI * 540 * t))
          + 0.25 * Math.sign(Math.sin(2 * Math.PI * 800 * t))
          + 0.15 * Math.sign(Math.sin(2 * Math.PI * 1100 * t));
        put(n0 + i, (s + click) * env * v);
      }
    };

    // —— 沙锤摇奏（高通噪声 · 持续 16 分音符摇动）——
    const shaker = (at, v) => {
      const n0 = Math.round(at * sr), nL = Math.round(s16 * 0.85 * sr);
      let lp = 0;
      const a = 1 - Math.exp(-2 * Math.PI * 6000 / sr);
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        const p = t / (nL / sr);
        const env = Math.sin(Math.PI * p) * 0.5 + 0.3;   // 摇动起伏
        lp += a * ((Math.random() * 2 - 1) - lp);
        put(n0 + i, ((Math.random() * 2 - 1) - lp) * env * v * 0.3);
      }
    };

    // —— 尼龙吉他拨弦（正弦+泛音 · 快速衰减 · 指弹感）——
    const guitar = (midi, at, dur, vel) => {
      const f0 = this._m99Freq(midi);
      const n0 = Math.round(at * sr), nL = Math.round(dur * sr);
      let lp = 0;
      const a = 1 - Math.exp(-2 * Math.PI * 3200 / sr);
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        const env = Math.exp(-t / 0.5) * Math.min(1, t / 0.002);
        const s = Math.sin(2 * Math.PI * f0 * t)
          + 0.4 * Math.sin(4 * Math.PI * f0 * t)
          + 0.15 * Math.sin(6 * Math.PI * f0 * t);
        lp += a * (s - lp);
        put(n0 + i, lp * env * vel);
      }
    };

    // —— 长笛旋律（正弦基波+少量泛音+渐入颤音 · 歌唱性 · 轻松欢快）——
    // 加入装饰音（短倚音）和滑音起音，让旋律更舞蹈化
    const flute = (midi, at, dur, vel, grace) => {
      const f0 = this._m99Freq(midi);
      const n0 = Math.round(at * sr), nL = Math.round(dur * sr);
      let lp = 0;
      const a = 1 - Math.exp(-2 * Math.PI * 4500 / sr);
      for (let i = 0; i < nL; i++) {
        const t = i / sr;
        // 渐入颤音（5.8Hz · 0.3s 后渐入 → 气息稳定后颤音）
        const vib = 1 + 0.006 * Math.min(1, t / 0.3) * Math.sin(2 * Math.PI * 5.8 * t);
        const f = f0 * vib;
        // ADSR：柔和起音(15ms) + 延音 + 慢释放(60ms)
        let env;
        if (t < 0.015) env = t / 0.015;
        else if (t > dur - 0.06) env = Math.max(0, (dur - t) / 0.06);
        else env = 1;
        // 气息噪声（吹奏的真实感）
        const breath = 0.02 * (Math.random() * 2 - 1) * env;
        const s = Math.sin(2 * Math.PI * f * t)
          + 0.12 * Math.sin(4 * Math.PI * f * t)
          + 0.05 * Math.sin(6 * Math.PI * f * t) + breath;
        lp += a * (s - lp);
        put(n0 + i, lp * env * vel);
      }
      // 装饰音：主音前 50ms 插入短倚音（高一阶）
      if (grace) {
        const gN0 = n0 - Math.round(0.05 * sr);
        const gNL = Math.round(0.05 * sr);
        const gf = this._m99Freq(midi + 2);
        for (let i = 0; i < gNL; i++) {
          const t = i / sr;
          const env = Math.exp(-t / 0.02);
          put(gN0 + i, (Math.sin(2 * Math.PI * gf * t) + 0.1 * Math.sin(4 * Math.PI * gf * t)) * env * vel * 0.5);
        }
      }
    };

    // ===== 2-3 Son Clave 节奏型（拉丁音乐基础骨架 · 每 2 小节一循环）=====
    // 第 1 小节（"2" 段）：第 2 拍 + 第 2.5 拍
    // 第 2 小节（"3" 段）：第 1 拍 + 第 1.5 拍 + 第 2.5 拍（实际位置稍偏后）
    // 16 分网格：slot = 拍数 * 4
    const CLAVE_2 = [4, 6];                    // 第 1 小节 clave 槽位（2 击）
    const CLAVE_3 = [0, 2, 6];                 // 第 2 小节 clave 槽位（3 击）

    // ===== 邦戈鼓节奏型（16 分网格 · 每小节 16 槽 · h=高鼓 l=低鼓 t=指尖 g=轮扫 m=闷击）=====
    // 段A：基础律动 · 低鼓打底拍 + 高鼓打反拍 + 指尖点缀
    const PAT_A = 'l.h.h.l.h.h.l.h.l.h.h.l.h.gl';
    // 段B：起伏加密 · 双高鼓切分 + 闷击点缀 + 轮扫过门
    const PAT_B = 'l.hh.l.hh.l.hh.l.hh.l.hh.l.hh.lg';
    // 段C：高潮回环 · 低鼓每拍打底 + 高鼓反拍 + 末尾大轮扫收束（前 16 字符有效）
    const PAT_C = 'l.hl.hl.hl.hl.hg.....l.hl.hl.hl.hl.gl';

    // 沙锤 pattern（每拍两个 16 分 · 轻重交替 · 反拍加重）
    const SHAKE = 's.s.s.s.s.s.s.s.s.s.s.s.s.s.s.s';

    // 牛铃 Montuno 切分 pattern（每小节 4 击 · 1/1.5/2.5/3.5 拍 · 段 B/C 才加入）
    const COWBELL_SLOTS = [0, 2, 6, 10];

    // ===== 长笛旋律（A 小调五声 A-C-D-E-G · 拉丁歌唱性 · 轻松欢快）=====
    // g 标记 = 加装饰音（短倚音）· 力度随段落起伏
    // [midi, 起拍(拍), 时值(拍), 力度, 装饰音?]
    const FLUTE = [
      // 段A（bars 1-4）：开场欢快上扬 · 力度轻盈
      [69, 0, 0.5, .26], [72, 0.5, 0.5, .28], [74, 1, 1, .30],
      [72, 2, 0.5, .28], [69, 2.5, 1.5, .30],
      [74, 4, 0.5, .28], [76, 4.5, 0.5, .30, 1], [74, 5, 0.5, .28], [72, 5.5, 0.5, .26],
      [69, 6, 0.5, .28], [72, 6.5, 1.5, .30],
      // 段B（bars 5-8）：起伏跳跃 · 力度加强 · 装饰音增多
      [76, 8, 0.5, .33], [74, 8.5, 0.5, .30], [72, 9, 0.5, .28, 1], [69, 9.5, 0.5, .30],
      [74, 10, 0.5, .31], [76, 10.5, 0.5, .33, 1], [81, 11, 1, .35],
      [76, 12, 0.5, .31], [74, 12.5, 0.5, .29], [72, 13, 0.5, .27], [69, 13.5, 0.5, .29],
      [67, 14, 1, .27], [69, 15, 1, .30],
      // 段A'（bars 9-12）：回归欢快 · 力度回落
      [69, 16, 0.5, .27], [72, 16.5, 0.5, .29], [74, 17, 1, .31],
      [72, 18, 0.5, .29], [69, 18.5, 1.5, .31],
      [74, 20, 0.5, .29], [76, 20.5, 0.5, .31], [74, 21, 0.5, .28], [72, 21.5, 0.5, .26],
      [69, 22, 0.5, .28], [72, 22.5, 1.5, .31],
      // 段C（bars 13-16）：高潮收束回环 · 力度最大 · 齐奏感
      [76, 24, 0.5, .34, 1], [81, 24.5, 0.5, .36, 1], [76, 25, 0.5, .33], [74, 25.5, 0.5, .31],
      [72, 26, 0.5, .30], [69, 26.5, 0.5, .32], [67, 27, 1, .31],
      [69, 28, 0.5, .30, 1], [72, 28.5, 0.5, .32], [74, 29, 0.5, .33, 1], [76, 29.5, 0.5, .35],
      [74, 30, 0.5, .32], [72, 30.5, 0.5, .30], [69, 31, 1, .33],
    ];

    // ===== 尼龙吉他 Montuno 切分 pattern（Am-F-C-G × 4 小节循环）=====
    // 拉丁 Montuno：切分拨弦 · 反拍重音 · 每和弦 8 个 16 分拨弦点
    // 16 分槽位拨弦点：[2,3, 6,7, 10,11, 14,15]（反拍 + 切分）
    const CHORDS = [
      { root: 57, notes: [45, 52, 57, 60, 64, 69] },   // Am
      { root: 53, notes: [41, 48, 53, 57, 60, 65] },   // F
      { root: 48, notes: [36, 43, 48, 55, 60, 64] },   // C
      { root: 55, notes: [43, 50, 55, 59, 62, 67] },   // G
    ];
    // Montuno 拨弦指法：[低根, 五, 三, 高根, 五, 三, 高根, 五]（切分上下行）
    const GTR_PAT = [0, 1, 2, 5, 3, 4, 5, 1];
    const GTR_SLOTS = [2, 4, 6, 8, 10, 12, 14, 16];   // 8 分切分拨弦点（16分网格）

    // ===== 渲染 =====
    for (let bar = 0; bar < bars; bar++) {
      const barAt = bar * 4 * bd;
      const d = dyn(bar);

      // 响木 Son Clave（每 2 小节循环 · 2-3 clave 骨架）
      if (bar % 2 === 0) {
        // 第 1 小节（"2" 段）
        CLAVE_2.forEach(s => clave(barAt + s * s16, vel(0.32 * d)));
      } else {
        // 第 2 小节（"3" 段）
        CLAVE_3.forEach(s => clave(barAt + s * s16, vel(0.32 * d)));
      }

      // 牛铃 Montuno 切分（段 B/C 才加入 · 段 A 静默留呼吸）
      if (bar >= 4) {
        COWBELL_SLOTS.forEach(s => cowbell(barAt + s * s16, vel(0.18 * d)));
      }

      // 邦戈鼓 pattern（段 A/B/C 分配 · 力度随段落起伏）
      let pat;
      if (bar < 4) pat = PAT_A;
      else if (bar < 8) pat = PAT_B;
      else if (bar < 12) pat = PAT_A;
      else pat = PAT_C;
      for (let s = 0; s < 16; s++) {
        const at = barAt + s * s16;
        const c = pat[s];
        if (!c || c === '.') continue;
        if (c === 'l') bongo(at, vel(0.55 * d), 'lo');
        else if (c === 'h') bongo(at, vel(0.50 * d), 'hi');
        else if (c === 't') bongo(at, vel(0.32 * d), 'tip');
        else if (c === 'm') bongo(at, vel(0.42 * d), 'mute');
        else if (c === 'g') gliss(at, vel(0.38 * d));
      }

      // 沙锤（每拍两个 16 分 · 反拍加重）
      for (let s = 0; s < 16; s++) {
        if (SHAKE[s] === 's') shaker(barAt + s * s16, vel((s % 2 === 1 ? 0.55 : 0.45) * d));
      }

      // 尼龙吉他 Montuno 切分拨弦
      const ch = CHORDS[bar % 4];
      for (let b = 0; b < 8; b++) {
        const midi = ch.notes[GTR_PAT[b % GTR_PAT.length]];
        const slot = GTR_SLOTS[b];
        guitar(midi, barAt + slot * s16, bd * 0.4, vel(0.10 * d));
      }
    }

    // 长笛旋律（装饰音在 flute 函数内自动渲染）
    FLUTE.forEach(n => flute(n[0], n[1] * bd, n[2] * bd, n[3], n[4]));

    return this._m99Norm(out, 0.72);   // 拉丁曲轻快明亮，音量适中
  },
});
