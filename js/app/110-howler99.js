// 110-howler99.js —— v12.9.58 【howler.js 环境音效台】（G6-专注模式 · 替换旧 Web Audio 白噪音引擎）
// [功能组] G6-专注模式 / G5-情感陪伴（宠物联动）
//
// 集成开源 howler.js（MIT · js/lib/howler.min.js）作为网页音频层——多音效叠加 / 独立音量 / 无缝循环。
// 真机约束（用户处方）：❌ 不使用浏览器原生 Audio 裸 API —— 音源 = OfflineAudioContext 离线合成
//   （不下发外部音频文件），播放 = howler.js（内部走 Web Audio，异常自动落 HTML5 音频元素）。
//   v12.9.59：原生环境音兜底已随自造插件整体删除（自造插件真机必报「插件不存在」）；
//   howler 播放异常时友好提示并停止该轨，绝不弹调试报错弹窗。
//
// 音效（5 种 · 8 秒无缝循环 · 首尾 1s 交叉淡化）：下雨 / 海浪 / 森林 / 咖啡馆 / 晚风
// 联动：专注模式选择弹窗快选区 + 环境音效台面板（多轨叠加 · 独立音量 · 宠物一起听）
// 释放：退出专注 / 离开页面 / App 退后台（原生层 handleOnPause 兜底）自动停止全部音效。
Object.assign(App, {

  // ==================== 音效定义 ====================
  _amb99DEFS() {
    return {
      rain:   { n: '下雨',   ico: '🌧️', d: '粉噪雨幕 + 远处阵雨起伏 + 偶发雨滴' },
      wave:   { n: '海浪',   ico: '🌊', d: '深棕海涌 + 慢周期浪涌拍岸' },
      forest: { n: '森林',  ico: '🌲', d: '叶间风语 + 随机鸟啼短句' },
      cafe:   { n: '咖啡馆', ico: '☕', d: '人声频段低语 + 偶发杯碟轻碰' },
      wind:   { n: '晚风',   ico: '🍃', d: '慢摆带通风声 · 阵风起伏' },
    };
  },
  // 每轨状态：{ key: { on, vol, howl?, b64? } }；默认选中雨声（旧专注行为延续）
  _amb99State: { },
  _amb99Log: [],

  _amb99LogAdd(line, tag) {
    const t = new Date();
    const ts = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
    this._amb99Log.push(`[${ts}]${tag ? '[' + tag + ']' : ''} ${line}`);
    if (this._amb99Log.length > 80) this._amb99Log.splice(0, this._amb99Log.length - 80);
  },

  // ==================== 音源合成（OfflineAudioContext → 8s 无缝循环 WAV）====================
  // 合成图：白/棕噪底 + 滤波 + LFO 起伏 + 离散事件（鸟啼/雨滴/杯碰 · 预先调度进离线渲染）。
  // 渲染 9s，尾部 1s 与头部 1s 交叉淡化 → 8s 循环体（循环点无爆音无缝）。
  async _amb99Synth(key) {
    if (this._amb99Cache && this._amb99Cache[key]) return this._amb99Cache[key];
    const SR = 22050, LOOP = 8, TOTAL = 9;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) throw new Error('no offline ctx');
    const ctx = new OAC(1, SR * TOTAL, SR);
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // 噪声源（离线渲染用周期性 buffer 循环，随机性足够）
    const noiseBuf = (brown) => {
      const b = ctx.createBuffer(1, SR * 2, SR);
      const d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
        else d[i] = w;
      }
      return b;
    };
    const loopSrc = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; };
    const filt = (type, f, q) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; };
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    // 慢 LFO（振幅或频率调制）
    const lfo = (rate, depth, target) => {
      const o = ctx.createOscillator(); o.frequency.value = rate;
      const d = gain(depth); o.connect(d); d.connect(target); o.start(0); o.stop(SR * TOTAL / SR);
      return o;
    };
    const rnd = (a, b) => a + Math.random() * (b - a);

    if (key === 'rain') {
      // 雨幕：白噪低通 1250Hz
      const s1 = loopSrc(noiseBuf(false));
      s1.connect(filt('lowpass', 1250)).connect(gain(0.16)).connect(master); s1.start(0);
      // 远处阵雨：带通白噪 + 慢起伏
      const s2 = loopSrc(noiseBuf(false));
      const g2 = gain(0.075);
      s2.connect(filt('bandpass', 420, 0.6)).connect(g2).connect(master); s2.start(0);
      lfo(0.09, 0.04, g2.gain);
      // 雨滴：偶发高频短粒（限制在 0.6~7.4s，避开循环缝合区）
      for (let i = 0; i < 26; i++) {
        const t0 = rnd(0.6, 7.4);
        const s = ctx.createBufferSource(); s.buffer = noiseBuf(false);
        s.playbackRate.value = rnd(0.9, 1.4);
        const g = gain(0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(rnd(0.02, 0.05), t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + rnd(0.01, 0.03));
        s.connect(filt('highpass', rnd(1800, 3600))).connect(g).connect(master);
        s.start(t0, rnd(0, 1.5), 0.05);
      }
    } else if (key === 'wave') {
      // 海底涌：棕噪低通 320Hz + 慢浪涌调制（呼吸 ~11s 周期，循环内 1.5 个浪）
      const s1 = loopSrc(noiseBuf(true));
      const g1 = gain(0.28);
      s1.connect(filt('lowpass', 320)).connect(g1).connect(master); s1.start(0);
      lfo(0.09, 0.14, g1.gain);
      // 浪尖白沫：带通白噪与浪涌同相起伏
      const s2 = loopSrc(noiseBuf(false));
      const g2 = gain(0.03);
      s2.connect(filt('bandpass', 1500, 0.5)).connect(g2).connect(master); s2.start(0);
      lfo(0.09, 0.022, g2.gain);
    } else if (key === 'forest') {
      // 叶间风语：白噪带通 900Hz 慢摆
      const s1 = loopSrc(noiseBuf(false));
      const g1 = gain(0.05);
      const bp = filt('bandpass', 900, 0.8);
      s1.connect(bp).connect(g1).connect(master); s1.start(0);
      lfo(0.05, 240, bp.frequency);
      lfo(0.06, 0.022, g1.gain);
      // 地气：棕噪极轻
      const s2 = loopSrc(noiseBuf(true));
      s2.connect(filt('lowpass', 240)).connect(gain(0.05)).connect(master); s2.start(0);
      // 鸟啼短句：2~4 音符正弦扫频（移开循环缝合区）
      for (let c = 0; c < 3; c++) {
        const t0 = rnd(0.8, 7.2);
        const n = 2 + Math.floor(Math.random() * 3);
        const o = ctx.createOscillator(); o.type = 'sine';
        const g = gain(0.0001); o.connect(g); g.connect(master);
        const base = 2100 + Math.random() * 900;
        for (let i = 0; i < n; i++) {
          const st = t0 + i * 0.17;
          const f0 = base + Math.random() * 300;
          o.frequency.setValueAtTime(f0, st);
          o.frequency.exponentialRampToValueAtTime(f0 + rnd(200, 700), st + 0.08);
          o.frequency.exponentialRampToValueAtTime(f0 + 130, st + 0.15);
          g.gain.setValueAtTime(0.0001, st);
          g.gain.exponentialRampToValueAtTime(0.045, st + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, st + 0.16);
        }
        o.start(t0); o.stop(t0 + n * 0.17 + 0.2);
      }
    } else if (key === 'cafe') {
      // 人声低语带：白噪带通 480Hz（人声频段）+ 慢起伏
      const s1 = loopSrc(noiseBuf(false));
      const g1 = gain(0.11);
      s1.connect(filt('bandpass', 480, 0.45)).connect(g1).connect(master); s1.start(0);
      lfo(0.13, 0.045, g1.gain);
      // 底噪嗡鸣：棕噪
      const s2 = loopSrc(noiseBuf(true));
      s2.connect(filt('lowpass', 180)).connect(gain(0.06)).connect(master); s2.start(0);
      // 杯碟轻碰：偶发高频衰减振荡
      for (let i = 0; i < 4; i++) {
        const t0 = rnd(0.8, 7.3);
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.setValueAtTime(rnd(2400, 4200), t0);
        o.frequency.exponentialRampToValueAtTime(rnd(1400, 2000), t0 + 0.12);
        const g = gain(0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.028, t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + 0.18);
      }
    } else { // wind 晚风
      const s1 = loopSrc(noiseBuf(true));
      const bp = filt('bandpass', 560, 0.7);
      const g1 = gain(0.16);
      s1.connect(bp).connect(g1).connect(master); s1.start(0);
      lfo(0.055, 260, bp.frequency);      // 中心频率慢摆 = 风声忽远忽近
      lfo(0.043, 0.09, g1.gain);          // 阵风强弱起伏
      // 高频叶梢：白噪高通轻叠
      const s2 = loopSrc(noiseBuf(false));
      s2.connect(filt('highpass', 3800)).connect(gain(0.012)).connect(master); s2.start(0);
    }

    const rendered = await ctx.startRendering();
    const data = rendered.getChannelData(0);
    // 首尾交叉淡化 → 8s 循环体
    const nLoop = SR * LOOP;
    const fadeN = SR;
    const out = new Float32Array(nLoop);
    out.set(data.subarray(0, nLoop));
    for (let i = 0; i < fadeN; i++) {
      const a = i / fadeN;                        // 头部权重 0→1
      out[i] = out[i] * a + data[nLoop + i] * (1 - a);
    }
    // 限幅 + 量化 PCM16 → WAV
    const pcm = new Int16Array(nLoop);
    for (let i = 0; i < nLoop; i++) {
      const v = Math.max(-1, Math.min(1, out[i]));
      pcm[i] = v < 0 ? v * 32768 : v * 32767;
    }
    const wav = this._amb99Wav(pcm, SR);
    const b64 = this._amb99B64(wav);
    this._amb99Cache = this._amb99Cache || {};
    this._amb99Cache[key] = b64;
    return b64;
  },
  // PCM16 mono → WAV 文件字节（RIFF；原生层 parseWav 直接认）
  _amb99Wav(pcm, sr) {
    const n = pcm.length;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const wstr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    wstr(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); wstr(8, 'WAVE');
    wstr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    wstr(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, pcm[i], true);
    return new Uint8Array(buf);
  },
  _amb99B64(bytes) {
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  },

  // ==================== 播放层（howler.js · 网页音频）====================
  async _amb99Play(key) {
    const st = (this._amb99State[key] = this._amb99State[key] || { on: true, vol: 0.7 });
    st.on = true;
    try {
      const b64 = await this._amb99Synth(key);
      st.b64 = b64;
      if (typeof Howl === 'undefined') throw new Error('howler.js 未加载');
      st.howl = new Howl({ src: ['data:audio/wav;base64,' + b64], format: ['wav'], loop: true, volume: st.vol });
      st.howl.once('loaderror', () => {
        // howler 解码失败（个别机型 WebView）：停该轨 + 友好提示一次（会话去重），不弹调试报错
        this._amb99Stop(key);
        if (!this.__amb99Warned) {
          this.__amb99Warned = true;
          try { this._flash('🎧 环境音效在本机播放失败——专注功能不受影响'); } catch (e) {}
        }
      });
      st.howl.play();
      this._amb99LogAdd('播放（howler）· ' + key + ' · 音量 ' + st.vol.toFixed(2), key);
    } catch (e) {
      st.on = false;
      this._amb99LogAdd('播放失败：' + String((e && e.message) || e), key);
      if (!this.__amb99Warned) {
        this.__amb99Warned = true;
        try { this._flash('🎧 环境音效在本机暂不可用——专注功能不受影响'); } catch (e2) {}
      }
    }
  },
  _amb99Stop(key) {
    const st = this._amb99State[key];
    if (!st) return;
    st.on = false;
    try { if (st.howl) { st.howl.stop(); st.howl.unload(); } } catch (e) {}
    st.howl = null;
    this._amb99LogAdd('停止 · ' + key, key);
  },
  _amb99StopAll() {
    Object.keys(this._amb99State).forEach(k => this._amb99Stop(k));
  },
  _amb99SetVol(key, v) {
    const st = this._amb99State[key];
    if (!st) return;
    st.vol = Math.max(0, Math.min(1, v));
    try { if (st.howl) st.howl.volume(st.vol); } catch (e) {}
  },
  _amb99AnyOn() { return Object.keys(this._amb99State).some(k => this._amb99State[k] && this._amb99State[k].on); },

  // ==================== 环境音效台（面板）====================
  amb99Panel() {
    const defs = this._amb99DEFS();
    const rows = Object.keys(defs).map(k => {
      const d = defs[k];
      const st = this._amb99State[k] || { on: false, vol: 0.7 };
      return `<div class="amb99-row${st.on ? ' on' : ''}">
        <button type="button" class="amb99-tg" onclick="App._amb99Toggle('${k}')">
          <span class="amb99-ico">${d.ico}</span>
          <span class="amb99-mid"><b>${d.n}</b><i>${d.d}</i></span>
          <span class="amb99-sw">${st.on ? '⏸' : '▶'}</span>
        </button>
        <label class="amb99-vol">
          <input type="range" min="0" max="100" value="${Math.round((st.vol || 0.7) * 100)}"
            oninput="App._amb99VolInput('${k}', this.value)" onchange="App._amb99VolInput('${k}', this.value)">
          <span class="amb99-pct">${Math.round((st.vol || 0.7) * 100)}%</span>
        </label>
      </div>`;
    }).join('');
    const petLn = this._amb99PetLine();
    this._modal('🎧 环境音效台 · howler.js', `
      <div style="font-size:11.5px;color:#64748b;line-height:1.7;margin-bottom:10px">
        可同时叠加多种环境音（下雨+海浪+森林…），每种独立音量、无缝循环（howler.js 网页音频 · 零流量零文件）。
      </div>
      <div class="amb99-list">${rows}</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" class="btn btn-ghost btn-sm" style="flex:1;margin:0" onclick="App._amb99StopAll();App.amb99Panel()">⏹ 全部停止</button>
      </div>
      ${petLn}`,
      [{ label: '完成', primary: true, onClick: () => { if (!this._amb99AnyOn()) this._amb99StopAll(); } }]);
  },
  _amb99Toggle(k) {
    const st = (this._amb99State[k] = this._amb99State[k] || { on: false, vol: 0.7 });
    if (st.on) this._amb99Stop(k); else this._amb99Play(k);
    this.amb99Panel();   // 刷新面板行状态
  },
  _amb99VolInput(k, v) {
    const vol = (+v || 0) / 100;
    this._amb99SetVol(k, vol);
    const st = this._amb99State[k];
    if (st && st.on && !st.howl) this._amb99Play(k);   // 未在播（拖音量想开）：直接开
    try {
      const el = event && event.target;
      if (el) { const pct = el.parentElement.querySelector('.amb99-pct'); if (pct) pct.textContent = Math.round(vol * 100) + '%'; }
    } catch (e) {}
  },
  // 宠物联动：正在放音效时邀宠物一起听（愉悦 +8 · 每天一次）
  _amb99PetLine() {
    const day = (Store && Store.today) ? Store.today() : '';
    const done = (() => { try { const p = this._pet99Data(); return !!(p.awarded && p.awarded['amb99_' + day]); } catch (e) { return false; } })();
    const anyOn = this._amb99AnyOn();
    if (done) return `<div class="amb99-pet done">🐾 小银今天已经一起听过环境音了——它趴在旁边很安心</div>`;
    return `<button type="button" class="amb99-pet" ${anyOn ? '' : 'disabled'} onclick="App._amb99PetJoin()">
      🐾 ${anyOn ? '叫小银一起来听（愉悦 +8）' : '先开一种环境音，再叫小银一起来听'}</button>`;
  },
  _amb99PetJoin() {
    try {
      const p = this._pet99Data();
      const day = (Store && Store.today) ? Store.today() : '';
      if (p.awarded && p.awarded['amb99_' + day]) return;
      p.joy = Math.max(0, Math.min(100, (p.joy || 60) + 8));
      p.awarded = p.awarded || {};
      p.awarded['amb99_' + day] = 1;
      this._pet99Save(p);
      this._flash('🐾 小银挨着音效睡着了——愉悦 +8');
      this.amb99Panel();
    } catch (e) { this._flash('🐾 宠物正在打盹，稍后再叫它'); }
  },
});
