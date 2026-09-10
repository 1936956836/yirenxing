// 98-boss99.js —— v12.9.46 【月度魔物】山谷Boss讨伐（挑战中心重做 · 接通独行信条与打卡数据）
// [功能组] G6-专注模式（挑战域：月度魔物Boss · 与原生挑战并列）
//
// 设计（参考市面超Boss战 · 数值由系统参考难度设计）：
//   · Boss 居于山谷：天色暗淡 + 电闪雷鸣 + 两眼冒红光不断咆哮（循环动画）
//   · 像素战鼓音乐：148bpm 密集鼓点 + 低频持续轰鸣（Web Audio 全程序合成 · 离开页面即停）
//   · Boss 属性极高且随战士等级自适应（系统参考难度）：完成月度任务每条 -10% 属性，3 条共 -30%
//   · 任务（学生画像 · 需长期坚持）：本月健身打卡 12 次 / 学习打卡 24 天 / 健身∪学习连续 10 天
//   · 战斗（红白渐变战场 · 与独行信条统一）：攻击 / 重击(2.4倍·35%落空) / 防御(回复+减伤)
//     —— 阶段机制：60%血 咆哮(攻击+15%) · 30%血 狂暴(再+30%·反击变密) + 汲能回血
//     —— 不做任务硬闯≈必败；3 条任务全完成后胜率约五成上下（中概率，长期坚持才有胜机）
Object.assign(App, {
  _boss99Key: 'one-xing-boss99-v1',
  _boss99Data() {
    try {
      const raw = localStorage.getItem(this._boss99Key);
      if (raw) return Object.assign({ wins: {} }, JSON.parse(raw));
    } catch (e) {}
    return { wins: {} };
  },
  _boss99Save(d) { try { localStorage.setItem(this._boss99Key, JSON.stringify(d)); } catch (e) {} },
  _boss99Month() {
    const n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
  },
  // 当月Boss（按月份种子确定性轮换 · 同月刷新不变脸）
  _boss99Def() {
    const mo = this._boss99Month();
    let h = 2166136261;
    for (let i = 0; i < mo.length; i++) { h ^= mo.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    const POOL = [
      { n: '惰噬者·寐皇', q: '凡人的坚持，不过是我枕边的尘埃。' },
      { n: '怠渊魔尊·千彻', q: '躺下吧——山谷会替你忘记所有明天。' },
      { n: '堕影魔王·蚀骨', q: '你练出的每一寸骨血，终将归于我的胃囊。' },
      { n: '梦魇魔主·噬心', q: '深夜里放弃的你，才是我最好的养料。' },
      { n: '裂谷暴君·残响', q: '雷鸣是我咆哮的回声，你逃不出这座山谷。' },
      { n: '蚀月魔君·晦明', q: '连月光都要在我面前熄灭，何况是你？' },
    ];
    return POOL[h % POOL.length];
  },
  // 月度任务（接通打卡数据 · 自动进度）：健身12次 / 学习24天 / 双修连续10天
  _boss99Tasks() {
    let fit = 0, study = 0, streak = 0, run = 0;
    try {
      const month = this._boss99Month();
      const [y, m] = month.split('-').map(Number);
      const dim = new Date(y, m, 0).getDate();
      const today = Store.today();
      const days = (Store.getHabit99().days || {});
      const touched = (v) => Array.isArray(v) ? v.length > 0 : !!(v && (v.ts || v.makeup));
      for (let d = 1; d <= dim; d++) {
        const dk = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        if (dk > today) break;
        const day = days[dk];
        if (!day) { run = 0; continue; }
        const f = touched(day.fitness);
        const s = ['studyMorning', 'studyNoon', 'studyEvening'].some(k => touched(day[k]));
        if (f) fit++;
        if (s) study++;
        if (f || s) { run++; if (run > streak) streak = run; } else run = 0;
      }
    } catch (e) {}
    return [
      { id: 'fit', ico: '💪', name: '淬体 · 健身坚持', goal: 12, prog: Math.min(12, fit), tip: '本月健身卡打卡满 12 次（≈每周 3 次）——练出的每一分力量都会斩进魔物血肉' },
      { id: 'study', ico: '📚', name: '修心 · 学习坚持', goal: 24, prog: Math.min(24, study), tip: '本月学习卡打卡满 24 天（早/午/晚任一即算当日）——书页翻动声是战士的战歌' },
      { id: 'will', ico: '🔥', name: '砺志 · 双修不辍', goal: 10, prog: Math.min(10, streak), tip: '本月「健身或学习」任一打卡的最长连续天数 ≥ 10 天——意志不熄，剑刃不钝' },
    ].map(t => Object.assign(t, { done: t.prog >= t.goal }));
  },
  // Boss 当前属性（系统参考难度 = 随战士等级自适应 + 任务削弱 0.9^完成数）
  _boss99Stats(tasks) {
    tasks = tasks || this._boss99Tasks();
    const r = this._rpg99Data();
    const prog = this._rpg99ExpProg(r.exp);
    const at = this._rpg99Attrs(prog.lv);
    const gb = this._rpg99GearBonus(r);
    const lv = prog.lv;
    const wk = tasks.filter(t => t.done).length;
    const k = Math.pow(0.9, wk);
    const heroAtk = at.atk + gb.atk;
    const def = Math.round((10 + lv * 0.8) * k);
    const avgDmg = heroAtk * 1.25 * (100 / (100 + def));
    return {
      lv, wk, k, def,
      hero: { atk: heroAtk, def: at.def + gb.def, hp: at.hp + gb.hp, max: 90 + lv * 9 + gb.hp * 3 },
      hp: Math.max(150, Math.round(avgDmg * 26 * k)),
      atk: Math.round((12 + lv * 2) * k),
    };
  },

  // ==================== Boss 像素画（28×30 · 巨角暗魔 · 双帧咆哮）====================
  _boss99Px(open) {
    window.__boss99PxC = window.__boss99PxC || {};
    const k = open ? 'open' : 'shut';
    if (window.__boss99PxC[k]) return window.__boss99PxC[k];
    const c = document.createElement('canvas'); c.width = 28; c.height = 30;
    const x = c.getContext('2d');
    const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
    const K = '#07070c', D = '#171722', G = '#26263a', C = '#52526e', R = '#ff3b3b', Wt = '#f4f4f8';
    // 双角（对称外弯）
    [[5, 1], [4, 3], [4, 5], [5, 7]].forEach(([px, py]) => { P(px, py, 2, 2, G); P(28 - px - 2, py, 2, 2, G); });
    P(5, 9, 2, 1, D); P(21, 9, 2, 1, D);
    // 头 + 描边
    P(8, 7, 12, 12, D); P(8, 7, 12, 1, G); P(8, 7, 1, 12, G); P(19, 8, 1, 11, G);
    P(9, 10, 10, 1, K);                                   // 眉骨阴影
    P(10, 11, 3, 2, K); P(15, 11, 3, 2, K);               // 眼眶
    P(11, 11, 1, 2, R); P(16, 11, 1, 2, R);               // 红瞳（页面另有CSS红光覆盖层）
    P(9, 13, 1, 4, K); P(18, 13, 1, 4, K);                // 颧骨阴影
    if (open) {
      P(10, 14, 8, 5, K);                                 // 咆哮大口
      P(11, 14, 1, 1, Wt); P(13, 14, 1, 1, Wt); P(16, 14, 1, 1, Wt);
      P(11, 18, 1, 1, Wt); P(14, 18, 1, 1, Wt); P(16, 18, 1, 1, Wt);
      P(12, 16, 4, 1, '#7f1d1d');                        // 喉底暗红
    } else {
      P(11, 15, 6, 1, K);                                // 闭口嘴缝 + 微露齿
      P(11, 14, 1, 1, Wt); P(13, 14, 1, 1, Wt); P(15, 14, 1, 1, Wt);
    }
    // 肩峰 + 躯干 + 胸口裂纹与暗红伤痕
    P(4, 17, 4, 3, D); P(20, 17, 4, 3, D);
    P(3, 16, 2, 1, G); P(23, 16, 2, 1, G);
    P(8, 19, 12, 9, D); P(7, 20, 1, 7, G); P(20, 20, 1, 7, G);
    P(11, 20, 1, 6, G); P(14, 21, 1, 5, G); P(17, 20, 1, 6, G);
    P(13, 22, 3, 1, '#3b0d0d'); P(12, 24, 4, 1, '#3b0d0d');
    // 手臂 + 利爪
    P(4, 20, 3, 7, D); P(21, 20, 3, 7, D);
    P(3, 27, 1, 2, C); P(5, 27, 1, 2, C); P(22, 27, 1, 2, C); P(24, 27, 1, 2, C);
    // 底部阴影渐隐
    P(8, 27, 12, 3, '#101018');
    const url = c.toDataURL();
    window.__boss99PxC[k] = url;
    return url;
  },

  // ==================== 像素战鼓音乐（148bpm 密集鼓点 + 低频轰鸣 · 离开页面即停）====================
  _boss99Drum: null,
  _boss99DrumStart() {
    this._boss99DrumStop();
    if (!this._sfx99On()) return;
    const ac = this._sfx99Ac();
    if (!ac) return;
    const master = ac.createGain(); master.gain.value = 0.4; master.connect(ac.destination);
    // 低频持续轰鸣（E1 + B0 五度 · 低通压暗）
    const mkDrone = (f, g) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150;
      const gn = ac.createGain(); gn.gain.value = g;
      o.connect(lp); lp.connect(gn); gn.connect(master); o.start();
      return o;
    };
    const st = { ac, master, d1: mkDrone(41.2, 0.13), d2: mkDrone(30.87, 0.09), nodes: [], timer: null, nextT: 0, step: 0, bar: 0 };
    const kick = (t) => {
      const o = st.ac.createOscillator(); o.type = 'sine';
      const g = st.ac.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.18);
    };
    const snare = (t) => {
      const sr = st.ac.sampleRate, n = Math.floor(sr * 0.09);
      const b = st.ac.createBuffer(1, n, sr), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = st.ac.createBufferSource(); s.buffer = b;
      const bp = st.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1750; bp.Q.value = 0.9;
      const g = st.ac.createGain(); g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + 0.1);
    };
    const tom = (t, f) => {
      const o = st.ac.createOscillator(); o.type = 'sine';
      const g = st.ac.createGain();
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.16);
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.22);
    };
    // 16 步音序（每步 ≈ 0.101s）：密集双踩 + 军鼓切分 + 每 4 小节桶鼓填充
    const KICK = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0];
    const SNR = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
    const STEP = 60 / 148 / 4;
    st.nextT = st.ac.currentTime + 0.06;
    st.timer = setInterval(() => {
      try {
        const now = st.ac.currentTime;
        while (st.nextT < now + 0.4) {
          const i = st.step % 16;
          if (KICK[i]) kick(st.nextT);
          if (SNR[i]) snare(st.nextT);
          if (st.bar % 4 === 3 && i >= 12) tom(st.nextT, i % 2 ? 96 : 78);
          st.step++; if (st.step % 16 === 0) st.bar++;
          st.nextT += STEP;
        }
      } catch (e) {}
    }, 160);
    this._boss99Drum = st;
  },
  _boss99DrumStop() {
    const st = this._boss99Drum;
    if (!st) return;
    try { if (st.timer) clearInterval(st.timer); } catch (e) {}
    try { st.d1.stop(); st.d2.stop(); } catch (e) {}
    try { st.master.disconnect(); } catch (e) {}
    this._boss99Drum = null;
  },
  // 离开魔窟页统一清扫（45-workbench.js 视图切换钩子调用）
  _boss99Leave() {
    this._boss99DrumStop();
    if (this._boss99RoarTimer) { clearInterval(this._boss99RoarTimer); this._boss99RoarTimer = null; }
  },

  // ==================== 持久样式注入（页面 + 对决战场 · 仅注入一次）====================
  //   对决战场复用独行信条四魔对决的 q99-bt-* 体系（93-quit99.js 内嵌样式随戒断数据页渲染才有），
  //   这里补齐同一套战斗样式 + 本页专属样式，保证从挑战中心直入魔窟也能正常开战
  _boss99Css() {
    if (document.getElementById('boss99Css')) return;
    const st = document.createElement('style');
    st.id = 'boss99Css';
    st.textContent = `
      /* —— 魔窟页（山谷场景 · 天色暗淡 + 电闪雷鸣 + 红瞳咆哮）—— */
      .boss99-wrap{max-width:640px;margin:0 auto}
      .boss99-hud{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
      .boss99-hud-mid{flex:1;min-width:150px;text-align:center}
      .boss99-hud-name{font-size:15px;font-weight:900;color:#fecaca;letter-spacing:1px;text-shadow:0 0 12px rgba(239,68,68,.45)}
      .boss99-hud-sub{font-size:10px;color:#94a3b8;margin-top:2px}
      .boss99-hud-hero{text-align:right;font-size:11.5px;font-weight:900;color:#fca5a5;line-height:1.5}
      .boss99-hud-hero span{font-size:9px;color:#a1a1b5}
      .boss99-valley{position:relative;height:440px;border-radius:14px;overflow:hidden;border:3px solid #0b0b12;
        background:linear-gradient(180deg,#04040a 0%,#0a0a13 48%,#12121d 74%,#0d0d14 100%);
        box-shadow:inset 0 0 80px rgba(0,0,0,.7),0 12px 30px rgba(0,0,0,.45)}
      .boss99-sky{position:absolute;inset:0;background:
        radial-gradient(ellipse 60% 34% at 50% 8%,rgba(99,102,241,.14),transparent 70%),
        radial-gradient(ellipse 120% 50% at 50% 105%,rgba(30,41,59,.5),transparent 60%)}
      .boss99-mtn{position:absolute;left:0;right:0;bottom:0;width:100%;height:62%}
      .boss99-bolt{position:absolute;top:0;width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;
        border-top:44px solid rgba(226,232,240,.92);filter:drop-shadow(0 0 9px rgba(148,163,184,.9));opacity:0;
        transform:rotate(14deg);animation:b99bolt 7.2s infinite}
      .boss99-bolt.b1{left:17%;animation-delay:.9s}
      .boss99-bolt.b2{right:13%;transform:rotate(-11deg);animation-delay:3.8s}
      @keyframes b99bolt{0%,86%,100%{opacity:0}88%{opacity:.95}90%{opacity:.1}92%{opacity:.8}95%{opacity:0}}
      .boss99-flash{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 30%,rgba(203,213,225,.32),transparent 70%);opacity:0;pointer-events:none}
      .boss99-flash.f1{animation:b99flash 7.2s infinite;animation-delay:.92s}
      .boss99-flash.f2{animation:b99flash 7.2s infinite;animation-delay:3.82s}
      @keyframes b99flash{0%,87%,93%,100%{opacity:0}89%{opacity:.85}91%{opacity:.25}}
      .boss99-mon{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);width:186px;z-index:4}
      .boss99-mon.jolt{animation:b99jolt .5s ease}
      @keyframes b99jolt{0%,100%{transform:translate(-50%,-50%)}25%{transform:translate(calc(-50% - 5px),calc(-50% + 3px))}
        55%{transform:translate(calc(-50% + 4px),calc(-50% - 2px))}}
      .boss99-mon-in{position:relative;width:186px;height:200px;transition:transform .5s cubic-bezier(.3,1.4,.5,1)}
      .boss99-mon-in img{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;filter:drop-shadow(0 10px 22px rgba(0,0,0,.65))}
      .boss99-mon-in .open{opacity:0}
      .boss99-mon-in.roar{transform:scale(1.07) translateY(-4px)}
      .boss99-mon-in.roar .open{opacity:1}
      .boss99-mon-in.roar .shut{opacity:0}
      .boss99-eye{position:absolute;top:37%;width:11px;height:11px;border-radius:50%;background:#ff2d2d;
        box-shadow:0 0 10px 3px rgba(255,50,50,.85),0 0 26px 8px rgba(255,40,40,.45);animation:b99eye 2.1s ease-in-out infinite;z-index:2}
      .boss99-eye.e1{left:36.5%}
      .boss99-eye.e2{left:55%}
      @keyframes b99eye{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.28)}}
      .boss99-shadow{position:absolute;left:8%;width:84%;bottom:-13px;height:22px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(0,0,0,.62),rgba(0,0,0,0) 74%)}
      .boss99-plate{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:6;display:flex;gap:7px;flex-wrap:wrap;justify-content:center;max-width:94%}
      .boss99-plate span{font-family:ui-monospace,'Courier New',monospace;font-size:10px;font-weight:900;letter-spacing:.5px;
        color:#fecaca;background:rgba(12,10,16,.82);border:2px solid #7f1d1d;padding:3px 8px;white-space:nowrap}
      .boss99-plate b{color:#f87171;font-size:11.5px}
      .boss99-plate .boss99-plate-cut{color:#86efac;border-color:#14532d}
      /* —— 讨伐任务栏（30%）—— */
      .boss99-tasks{margin-top:14px}
      .boss99-tasks-t{font-size:12.5px;font-weight:900;color:#7f1d1d;margin-bottom:8px;letter-spacing:.5px}
      .boss99-task{padding:11px 12px;margin-bottom:9px;background:linear-gradient(180deg,#fff,#fef2f2);border:2px solid #fecaca;border-radius:11px}
      .boss99-task.done{background:linear-gradient(180deg,#f0fdf4,#dcfce7);border-color:#bbf7d0}
      .boss99-task-top{display:flex;align-items:center;gap:8px}
      .boss99-task-ico{font-size:17px}
      .boss99-task-name{flex:1;font-size:13px;font-weight:900;color:#1f2937}
      .boss99-task.done .boss99-task-name{color:#15803d}
      .boss99-task-n{font-size:10.5px;font-weight:900;color:#b91c1c;font-variant-numeric:tabular-nums}
      .boss99-task.done .boss99-task-n{color:#15803d}
      .boss99-task-bar{height:8px;border-radius:4px;background:rgba(127,29,29,.14);margin-top:7px;overflow:hidden}
      .boss99-task-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#f87171,#dc2626);transition:width .5s ease}
      .boss99-task.done .boss99-task-bar i{background:linear-gradient(90deg,#4ade80,#16a34a)}
      .boss99-task-tip{font-size:10.5px;color:#64748b;line-height:1.7;margin-top:6px}
      .boss99-task-cut{color:#b91c1c}
      .boss99-tasks-note{font-size:10.5px;color:#64748b;line-height:1.9;padding:10px 12px;background:#fff;border:2px dashed #fca5a5;border-radius:11px;margin-bottom:11px}
      .boss99-tasks-note b{color:#b91c1c}
      .boss99-fight{width:100%;font-size:15px;font-weight:900;letter-spacing:6px;color:#fff;padding:13px 0;cursor:pointer;
        background:linear-gradient(90deg,#dc2626,#991b1b);border:2px solid #7f1d1d;border-radius:12px;
        box-shadow:0 6px 0 #5b1010,inset 0 1px 0 rgba(255,255,255,.25);transition:transform .12s ease,box-shadow .12s ease}
      .boss99-fight:active{transform:translateY(4px);box-shadow:0 2px 0 #5b1010,inset 0 1px 0 rgba(255,255,255,.25)}
      /* —— 对决战场（独行信条红白渐变 · 与 93-quit99.js 四魔对决同款 q99-bt 体系）—— */
      .q99-bt{position:relative;font-family:ui-monospace,'Courier New',monospace}
      .q99-bt-stage{position:relative;height:238px;overflow:hidden;border:3px solid #7f1d1d;
        background:linear-gradient(180deg,#f87171 0%,#fb9a8b 14%,#fecaca 30%,#fee2e2 48%,#ffffff 70%,#fff1f2 100%)}
      .q99-bt-stage.shake{animation:q99btshake .34s ease}
      @keyframes q99btshake{0%,100%{transform:translate(0,0)}20%{transform:translate(-4px,2px)}
        45%{transform:translate(4px,-2px)}70%{transform:translate(-3px,-1px)}}
      .q99-bt-sun{position:absolute;top:14px;left:16px;width:30px;height:30px;background:#fde047;border:3px solid #7f1d1d;
        box-shadow:3px 3px 0 rgba(127,29,29,.25);animation:q99btbob 3.4s ease-in-out infinite;z-index:1}
      .q99-bt-cloud{position:absolute;image-rendering:pixelated;opacity:.9;background-size:100% 100%;
        background-repeat:no-repeat;animation:q99btdrift 9s ease-in-out infinite alternate;z-index:1}
      .q99-bt-dot{position:absolute;width:5px;height:5px;background:rgba(255,255,255,.85);
        animation:q99bttwk 2.6s ease-in-out infinite;z-index:1}
      @keyframes q99btbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      @keyframes q99btdrift{from{transform:translateX(0)}to{transform:translateX(16px)}}
      @keyframes q99bttwk{0%,100%{opacity:.2}50%{opacity:.9}}
      .q99-bt-grd{position:absolute;left:0;right:0;bottom:0;height:24px;border-top:4px solid #7f1d1d;
        background:repeating-linear-gradient(90deg,#f87171 0 14px,#ef4444 14px 28px);opacity:.92}
      .q99-bt-grd::after{content:'';position:absolute;left:0;right:0;top:-9px;height:5px;
        background:repeating-linear-gradient(90deg,#fff 0 5px,transparent 5px 10px);opacity:.55}
      .q99-bt-mon3d{position:absolute;left:14%;bottom:27px;perspective:640px;z-index:4}
      .q99-bt-mon3d::after,.q99-bt-hero::after{content:'';position:absolute;left:6%;width:88%;bottom:-8px;height:14px;
        border-radius:50%;background:radial-gradient(closest-side,rgba(80,20,20,.3),rgba(80,20,20,0) 74%)}
      .q99-bt-monin{position:relative;transform-style:preserve-3d;animation:q99btsway 2.8s ease-in-out infinite}
      @keyframes q99btsway{0%,100%{transform:translateY(0) rotateY(-8deg)}50%{transform:translateY(-7px) rotateY(8deg)}}
      .q99-bt-mon3d.atk .q99-bt-monin{animation:q99btatk .42s ease}
      @keyframes q99btatk{0%,100%{transform:translateX(0)}45%{transform:translateX(46px) rotateY(0)}}
      .q99-bt-mon3d.hit .q99-bt-monin{animation:q99bthurt .3s ease}
      @keyframes q99bthurt{0%,100%{transform:translateX(0) rotateY(0)}30%{transform:translateX(10px) rotateY(-6deg)}
        60%{transform:translateX(-6px) rotateY(4deg)}}
      .q99-bt-hero{position:absolute;right:12%;bottom:27px;perspective:640px;z-index:4}
      .q99-bt-heroin{position:relative;transform-style:preserve-3d;animation:q99btsway2 2.8s ease-in-out infinite}
      @keyframes q99btsway2{0%,100%{transform:translateY(0) rotateY(8deg)}50%{transform:translateY(-7px) rotateY(-8deg)}}
      .q99-bt-heroin.hit{animation:q99bthit .34s ease}
      @keyframes q99bthit{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}60%{transform:translateX(5px)}}
      .q99-vg,.q99-vg-arm{position:absolute;inset:0;transform-style:preserve-3d;pointer-events:none}
      .q99-vg-arm{transform-origin:76% 42%}
      .q99-vg-arm.swing{animation:q99swing .6s cubic-bezier(.25,.9,.3,1)}
      @keyframes q99swing{0%{transform:translateZ(0) rotate(0)}38%{transform:translateZ(22px) rotate(-100deg)}
        60%{transform:translateZ(22px) rotate(22deg)}100%{transform:translateZ(0) rotate(0)}}
      .q99-bt-slash{position:absolute;z-index:8;width:26px;height:26px;border-radius:50%;pointer-events:none;
        border:5px solid rgba(255,255,255,.95);animation:q99btslash .45s ease-out forwards}
      @keyframes q99btslash{0%{opacity:.95;transform:scale(.3)}100%{opacity:0;transform:scale(2.8)}}
      .q99-bt-vs{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%) rotate(-4deg);z-index:6;
        font-size:18px;font-weight:900;color:#fff;background:#dc2626;border:3px solid #fff;padding:4px 13px;
        letter-spacing:3px;box-shadow:3px 3px 0 rgba(127,29,29,.35);text-shadow:1px 1px 0 rgba(127,29,29,.6)}
      .q99-hp{position:absolute;top:12px;z-index:6;width:40%}
      .q99-hp.mon{left:3%}.q99-hp.hero{right:3%}
      .q99-hp .nm{font-size:10px;font-weight:900;color:#7f1d1d;letter-spacing:1px;margin-bottom:3px;display:flex;justify-content:space-between}
      .q99-hp .bar{height:13px;background:#450a0a;border:2px solid #7f1d1d;position:relative;box-shadow:2px 2px 0 rgba(127,29,29,.25)}
      .q99-hp .bar i{display:block;height:100%;transition:width .3s ease}
      .q99-hp.mon .bar i{background:linear-gradient(90deg,#f87171,#dc2626)}
      .q99-hp.hero .bar i{background:linear-gradient(90deg,#fde047,#f59e0b);float:right}
      .q99-hp .bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        font-size:8.5px;font-weight:900;color:#fff;text-shadow:1px 1px 0 rgba(0,0,0,.5)}
      .q99-dmg{position:absolute;z-index:9;font-size:14px;font-weight:900;color:#fff;background:#dc2626;
        border:2px solid #fff;padding:1px 7px;box-shadow:2px 2px 0 rgba(127,29,29,.4);pointer-events:none;
        animation:q99dmg 1s ease-out forwards;transform:rotate(-6deg);text-shadow:1px 1px 0 rgba(127,29,29,.6)}
      @keyframes q99dmg{0%{opacity:0;transform:translateY(0) rotate(-6deg) scale(.5)}
        18%{opacity:1;transform:translateY(-10px) rotate(-6deg) scale(1.15)}
        100%{opacity:0;transform:translateY(-56px) rotate(-6deg) scale(1)}}
      .q99-bt-fin{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-4deg);z-index:10;
        font-size:22px;font-weight:900;letter-spacing:4px;color:#fff;background:#7f1d1d;border:3px solid #fff;
        padding:7px 18px;box-shadow:4px 4px 0 rgba(127,29,29,.4);pointer-events:none;white-space:nowrap;
        animation:q99btfin .9s ease-out forwards}
      .q99-bt-fin.win{background:linear-gradient(90deg,#f59e0b,#d97706)}
      @keyframes q99btfin{0%{opacity:0;transform:translate(-50%,-50%) rotate(-4deg) scale(.4)}
        18%{opacity:1;transform:translate(-50%,-50%) rotate(-4deg) scale(1.15)}
        30%,100%{opacity:1;transform:translate(-50%,-50%) rotate(-4deg) scale(1)}}
      .q99-bt-acts{display:flex;gap:9px;margin-top:11px}
      .q99-bt-acts button{flex:1;font-size:13px;font-weight:900;padding:9px 0;border-radius:0;cursor:pointer}
      .q99-bt-atk{background:linear-gradient(90deg,#dc2626,#b91c1c);color:#fff;border:2px solid #7f1d1d;
        box-shadow:3px 3px 0 rgba(127,29,29,.3)}
      .q99-bt-atk:active{transform:translate(1px,1px);box-shadow:1px 1px 0 rgba(127,29,29,.3)}
      .q99-bt-flee{background:#fff;color:#b91c1c;border:2px solid #dc2626;box-shadow:3px 3px 0 rgba(220,38,38,.18)}
      .q99-bt-flee:active{transform:translate(1px,1px)}
      .b99-heavy{background:linear-gradient(90deg,#9a3412,#7c2d12);color:#fff;border:2px solid #7c2d12;box-shadow:3px 3px 0 rgba(124,45,18,.3)}
      .b99-heavy:active{transform:translate(1px,1px);box-shadow:1px 1px 0 rgba(124,45,18,.3)}
      .b99-guard{background:linear-gradient(90deg,#1d4ed8,#1e40af);color:#fff;border:2px solid #1e3a8a;box-shadow:3px 3px 0 rgba(30,58,138,.3)}
      .b99-guard:active{transform:translate(1px,1px);box-shadow:1px 1px 0 rgba(30,58,138,.3)}
      .q99-bt-log{margin-top:9px;font-size:10.5px;font-weight:800;color:#7f1d1d;text-align:center;min-height:16px;
        background:#fff;border:2px dashed #fca5a5;padding:5px 8px}
      /* 战场魔物（Boss 像素体 · 双帧口部） */
      .b99-bossvox{position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:q99btsway 2.8s ease-in-out infinite}
      .b99-bossvox img{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
      .b99-m-shut{z-index:1}
      .b99-m-open{z-index:2;opacity:0}
      .b99-bossvox.roar .b99-m-open{opacity:1}
      .b99-bossvox.roar .b99-m-shut{opacity:0}`;
    document.head.appendChild(st);
  },

  // ==================== 魔窟页（山谷场景 70% + 任务栏 30%）====================
  boss99Page() {
    this._boss99Css();
    const def = this._boss99Def();
    const month = this._boss99Month();
    const tasks = this._boss99Tasks();
    const st = this._boss99Stats(tasks);
    const data = this._boss99Data();
    const won = !!data.wins[month];
    const r = this._rpg99Data();
    const prog = this._rpg99ExpProg(r.exp);
    const taskRow = (t) => `
      <div class="boss99-task${t.done ? ' done' : ''}">
        <div class="boss99-task-top">
          <span class="boss99-task-ico">${t.ico}</span>
          <span class="boss99-task-name">${t.name}</span>
          <span class="boss99-task-n">${t.done ? '✓ 已完成' : t.prog + '/' + t.goal}</span>
        </div>
        <div class="boss99-task-bar"><i style="width:${Math.min(100, Math.round(t.prog / t.goal * 100))}%"></i></div>
        <div class="boss99-task-tip">${t.tip}　<b class="boss99-task-cut">完成即削它 10% 属性</b></div>
      </div>`;
    return `
    <div class="boss99-wrap">
      <div class="boss99-hud">
        <button class="btn btn-ghost btn-sm" onclick="App.navBack()">← 返回</button>
        <div class="boss99-hud-mid">
          <div class="boss99-hud-name">${this.esc(def.n)}</div>
          <div class="boss99-hud-sub">幽暗山谷 · ${month.replace('-', ' 年 ')} 月 · ${won ? '🏆 本月已讨伐（可再战·无奖励）' : '⚔️ 待讨伐'}</div>
        </div>
        <div class="boss99-hud-hero">战士 Lv.${prog.lv}<br><span>${this.esc(this._rpg99RankName(prog.lv))}</span></div>
      </div>

      <div class="boss99-valley" id="boss99Valley">
        <div class="boss99-sky"></div>
        <i class="boss99-bolt b1"></i><i class="boss99-bolt b2"></i>
        <i class="boss99-flash f1"></i><i class="boss99-flash f2"></i>
        <svg class="boss99-mtn" viewBox="0 0 400 170" preserveAspectRatio="none">
          <polygon points="0,170 60,38 128,170" fill="#161622"></polygon>
          <polygon points="400,170 338,30 272,170" fill="#161622"></polygon>
          <polygon points="70,170 150,66 232,170" fill="#111119"></polygon>
          <polygon points="168,170 200,102 236,170" fill="#0b0b12"></polygon>
          <rect x="0" y="158" width="400" height="12" fill="#0d0d14"></rect>
        </svg>
        <div class="boss99-mon" id="boss99Mon">
          <div class="boss99-mon-in" id="boss99MonIn">
            <img class="shut" src="${this._boss99Px(0)}" alt="月度魔物" draggable="false">
            <img class="open" src="${this._boss99Px(1)}" alt="" draggable="false">
            <i class="boss99-eye e1"></i><i class="boss99-eye e2"></i>
          </div>
          <i class="boss99-shadow"></i>
        </div>
        <div class="boss99-plate">
          <span class="boss99-plate-hp">HP <b>${st.hp}</b></span>
          <span class="boss99-plate-atk">ATK <b>${st.atk}</b></span>
          <span class="boss99-plate-def">DEF <b>${st.def}</b></span>
          <span class="boss99-plate-cut">已被任务削弱 ${st.wk * 10}%</span>
        </div>
      </div>

      <div class="boss99-tasks">
        <div class="boss99-tasks-t">📋 讨伐任务（每月 3 条 · 接通你的打卡数据自动结算）</div>
        ${tasks.map(taskRow).join('')}
        <div class="boss99-tasks-note">系统参考你的战士等级设计魔物强度：不做任务硬闯≈必败；每完成 1 条任务，魔物 HP/攻击/防御<b>各 -10%</b>（3 条共 -30%），届时才有一战之力——长期坚持，方有胜机。</div>
        <button class="boss99-fight" onclick="App.boss99Battle()">⚔️ ${won ? '再战魔物' : '讨伐魔物'}</button>
      </div>
    </div>`;
  },
  // 场景引擎：进入页面后启动（咆哮循环 + 雷鸣 + 战鼓），离开由 _boss99Leave 清扫
  _boss99SceneStart() {
    try { this._boss99Leave(); } catch (e) {}
    try { this._boss99DrumStart(); } catch (e) {}
    const monIn = document.getElementById('boss99MonIn');
    const mon = document.getElementById('boss99Mon');
    if (!monIn || !mon) return;
    let roared = false;
    this._boss99RoarTimer = setInterval(() => {
      roared = !roared;
      // 咆哮节律：闭嘴 2.4s → 张口咆哮 1.4s（配红瞳增亮 + 身躯前倾）
      if (roared) {
        monIn.classList.add('roar');
        try { this._sfx99 && this._sfx99(Math.random() < 0.3 ? 'thunder' : 'boss-roar'); } catch (e) {}
      } else {
        monIn.classList.remove('roar');
      }
      mon.classList.remove('jolt'); void mon.offsetWidth; mon.classList.add('jolt');
    }, 3800);
    monIn.classList.add('roar');
    try { this._sfx99 && this._sfx99('boss-roar'); } catch (e) {}
    setTimeout(() => { try { monIn.classList.remove('roar'); } catch (e) {} }, 1400);
  },

  // ==================== 讨伐对决（红白渐变战场 · 攻击/重击/防御 · 三阶段机制）====================
  boss99Battle() {
    this._boss99Css();
    const def = this._boss99Def();
    const tasks = this._boss99Tasks();
    const st = this._boss99Stats(tasks);
    const month = this._boss99Month();
    const data = this._boss99Data();
    const won = !!data.wins[month];
    const H = { hp: st.hero.max, max: st.hero.max, atk: st.hero.atk, def: st.hero.def };
    const M = { hp: st.hp, max: st.hp, atk: st.atk, def: st.def };
    let phase = 1, hits = 0, lock = false, over = false, brace = false, charge = 1, hit4 = 0;
    // 战士体素（与四魔对决同款）
    let heroHtml = '';
    try {
      const p = Store.getProfile ? Store.getProfile() : {};
      const female = p.gender === '女';
      const S = 5, px = Math.round(S * 24), hh = Math.round(S * 32);
      const vox = window.__rpg99HeroVoxels ? window.__rpg99HeroVoxels(!!female, this._rpg99HeroPal(), S) : null;
      if (vox) heroHtml = `<div class="q99-bt-hero" style="width:${px}px;height:${hh}px"><div class="q99-bt-heroin" id="b99Hro">
          <div class="q99-vg">${vox.body}</div><div class="q99-vg q99-vg-arm" id="b99Arm">${vox.arm}</div>
        </div></div>`;
    } catch (e) {}
    if (!heroHtml) heroHtml = `<div class="q99-bt-hero"><div class="q99-bt-heroin" id="b99Hro" style="font-size:40px">🧙</div></div>`;
    const btCloud = window.__rpg99CloudUrl ? window.__rpg99CloudUrl() : '';
    this._modal({
      title: `⚔️ 讨伐对决 · ${def.n}`,
      body: `
      <div class="q99-bt">
        <div class="q99-bt-stage" id="b99Stage">
          <span class="q99-bt-sun"></span>
          ${btCloud ? `<i class="q99-bt-cloud" style="top:28%;left:7%;width:46px;height:15px;background-image:url('${btCloud}')"></i>
          <i class="q99-bt-cloud" style="top:16%;right:9%;width:36px;height:12px;background-image:url('${btCloud}');animation-delay:2.6s"></i>` : ''}
          <span class="q99-bt-dot" style="top:9%;left:49%"></span>
          <span class="q99-bt-dot" style="top:15%;left:53%;animation-delay:.9s"></span>
          <span class="q99-bt-dot" style="top:24%;left:47%;animation-delay:1.7s"></span>
          <div class="q99-hp mon"><div class="nm"><span>${this.esc(def.n)}${st.wk ? `（削弱${st.wk * 10}%）` : ''}</span><span id="b99MHp">${M.hp}/${M.max}</span></div>
            <div class="bar"><i id="b99MHpBar" style="width:100%"></i><span>山谷魔王</span></div></div>
          <div class="q99-hp hero"><div class="nm"><span id="b99HHp">${H.hp}/${H.max}</span><span>战士 Lv.${st.lv}</span></div>
            <div class="bar"><i id="b99HHpBar" style="width:100%"></i><span>HP</span></div></div>
          <div class="q99-bt-mon3d" id="b99Mon" style="width:112px;height:120px"><div class="q99-bt-monin b99-bossvox">
            <img src="${this._boss99Px(0)}" class="b99-m-shut" draggable="false" alt="">
            <img src="${this._boss99Px(1)}" class="b99-m-open" draggable="false" alt="">
          </div></div>
          ${heroHtml}
          <span class="q99-bt-vs">VS</span>
          <span class="q99-bt-grd"></span>
        </div>
        <div class="q99-bt-acts b99-acts">
          <button class="q99-bt-atk" id="b99Atk">⚔️ 攻击</button>
          <button class="b99-heavy" id="b99Heavy">💥 重击</button>
          <button class="b99-guard" id="b99Guard">🛡️ 防御</button>
          <button class="q99-bt-flee" id="b99Flee">🏃 撤退</button>
        </div>
        <div class="q99-bt-log" id="b99Log">魔物盘踞山谷——攻击稳步输出 · 重击 2.4 倍但 35% 落空 · 防御回复并减伤反击</div>
      </div>`,
      actions: [],
    });
    try { this._sfx99 && this._sfx99('boss-roar'); } catch (e) {}
    const stage = document.getElementById('b99Stage');
    if (!stage) return;
    const monBox = document.getElementById('b99Mon');
    const heroBox = document.getElementById('b99Hro');
    const arm = document.getElementById('b99Arm');
    const log = document.getElementById('b99Log');
    const monIn = monBox ? monBox.querySelector('.b99-bossvox') : null;
    const bar = (id, v, mx) => { const el = document.getElementById(id); if (el) el.style.width = Math.max(0, Math.round(v / mx * 100)) + '%'; };
    const txt = (id, s) => { const el = document.getElementById(id); if (el) el.textContent = s; };
    const upd = () => { bar('b99MHpBar', M.hp, M.max); bar('b99HHpBar', H.hp, H.max); txt('b99MHp', Math.max(0, M.hp) + '/' + M.max); txt('b99HHp', Math.max(0, H.hp) + '/' + H.max); };
    const dmgPop = (left, dmg) => {
      const s = document.createElement('span');
      s.className = 'q99-dmg';
      s.textContent = '-' + dmg;
      s.style.left = left;
      s.style.top = (80 + Math.random() * 50) + 'px';
      stage.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    };
    const finPop = (t, win) => {
      const b = document.createElement('span');
      b.className = 'q99-bt-fin' + (win ? ' win' : '');
      b.textContent = t;
      stage.appendChild(b);
    };
    const slashPop = () => {
      const sl = document.createElement('span');
      sl.className = 'q99-bt-slash';
      sl.style.left = (monBox.offsetLeft + monBox.offsetWidth * .5 - 13) + 'px';
      sl.style.top = (monBox.offsetTop + monBox.offsetHeight * .26) + 'px';
      stage.appendChild(sl);
      setTimeout(() => sl.remove(), 470);
    };
    const closeBattle = () => { const ov = stage.closest('.wild-overlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); };
    // 阶段推进：60% 咆哮（ATK+15%）· 30% 狂暴（ATK 再+30% · 反击变密 · 汲能回血）
    const phaseCheck = () => {
      const pct = M.hp / M.max;
      if (phase === 1 && pct <= 0.6) {
        phase = 2; M.atk = Math.round(M.atk * 1.15);
        stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
        if (monIn) { monIn.classList.add('roar'); setTimeout(() => { try { monIn.classList.remove('roar'); } catch (e) {} }, 1200); }
        try { this._sfx99 && this._sfx99('boss-roar'); } catch (e) {}
        if (log) log.textContent = `🌋 ${def.n}发出震谷咆哮！攻击力 +15%（血量过 60%）`;
      }
      if (phase === 2 && pct <= 0.3) {
        phase = 3; M.atk = Math.round(M.atk * 1.3);
        stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
        if (monIn) { monIn.classList.add('roar'); setTimeout(() => { try { monIn.classList.remove('roar'); } catch (e) {} }, 1400); }
        try { this._sfx99 && this._sfx99('boss-roar'); } catch (e) {}
        if (log) log.textContent = `🔥 ${def.n}进入狂暴！攻击力再 +30% · 反击更频繁（血量过 30%）`;
      }
    };
    const win = () => {
      over = true; lock = true;
      const first = !won;
      if (first) {
        const d2 = this._boss99Data();
        d2.wins[month] = 1;
        this._boss99Save(d2);
        const r2 = this._rpg99Data();
        r2.exp = (r2.exp || 0) + 40;
        this._rpg99Save(r2);
        const p = this._pet99Data();
        p.points = (p.points || 0) + 36;
        this._pet99Save(p);
      }
      if (log) log.textContent = first
        ? `🏆 讨伐成功！${def.n}轰然倒下——独行信条经验 +40 · 宝石 +36`
        : `🏆 再次讨伐成功！（本月奖励已领过）`;
      finPop('🏆 讨伐成功', true);
      try { this._sfx99 && this._sfx99('cheer'); } catch (e) {}
      this._flash(first ? `🏆 你讨伐了${def.n}！经验 +40 · 宝石 +36` : `🏆 再次讨伐${def.n}成功（本月奖励已领过）`);
      setTimeout(() => { closeBattle(); try { this.render_workbench(); } catch (e) {} }, 1200);
    };
    const lose = () => {
      over = true; lock = true;
      if (log) log.textContent = `💔 战士倒下了……${def.n}仍在山谷咆哮——完成月度任务削弱它，再来复仇`;
      finPop('💔 战士倒下', false);
      this._flash(`💔 讨伐失败——${def.n}未被撼动；先完成月度任务削弱它`);
      setTimeout(closeBattle, 1300);
    };
    // 一次战士行动：dmgMul 重击倍率 · 挥空标记
    const heroAct = (dmgMul, missRate) => {
      if (lock || over) return;
      lock = true;
      hits++; hit4++;
      try { this._sfx99 && this._sfx99('swing'); } catch (e) {}
      if (arm) { arm.classList.remove('swing'); void arm.offsetWidth; arm.classList.add('swing'); }
      if (Math.random() < (missRate || 0)) {
        dmgPop((monBox.offsetLeft + monBox.offsetWidth * .4) + 'px', 0);
        if (log) log.textContent = `💨 重击挥空了！${def.n}纹丝不动`;
        setTimeout(() => { lock = false; }, 420);
        return;
      }
      const crit = Math.random() < 0.08;
      let dmg = Math.max(2, Math.round(H.atk * (1 + Math.random() * 0.5) * charge * dmgMul * (crit ? 1.6 : 1) * (100 / (100 + M.def))));
      charge = 1;
      M.hp -= dmg;
      slashPop();
      monBox.classList.remove('hit'); void monBox.offsetWidth; monBox.classList.add('hit');
      setTimeout(() => { try { this._sfx99 && this._sfx99('boss-roar'); } catch (e) {} }, 260);
      dmgPop((monBox.offsetLeft + monBox.offsetWidth * .55 + (Math.random() * 24 - 12)) + 'px', dmg);
      upd();
      if (crit && log) log.textContent = `⚡ 会心一击！造成 ${dmg} 伤害`;
      setTimeout(() => {
        if (M.hp <= 0) return win();
        phaseCheck();
        // 狂暴汲能：每第 4 次挥击，魔物汲取黑暗能量回复 1.5% 血量
        if (phase === 3 && hit4 % 4 === 0 && M.hp > 0) {
          const hl = Math.round(M.max * 0.015);
          M.hp = Math.min(M.max, M.hp + hl);
          upd();
          if (log) log.textContent = `🌑 ${def.n}汲取黑暗能量，回复 ${hl} 点血量！`;
        }
        // 反击节律：常规每 3 次挥击一次 · 咆哮后每 2 次
        const cad = phase >= 2 ? 2 : 3;
        if (hits % cad === 0) {
          monBox.classList.add('atk');
          stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
          try { this._sfx99 && this._sfx99('boss-roar'); } catch (e) {}
          let md = Math.max(3, Math.round(M.atk * (0.9 + Math.random() * 0.4)));
          if (brace) { md = Math.max(1, Math.round(md * 0.35)); brace = false; }
          H.hp -= md;
          setTimeout(() => {
            try { this._sfx99 && this._sfx99('thud'); } catch (e) {}
            if (heroBox) { heroBox.classList.remove('hit'); void heroBox.offsetWidth; heroBox.classList.add('hit'); }
            dmgPop((heroBox ? heroBox.offsetLeft + heroBox.offsetWidth * .5 : 220) + 'px', md);
            upd();
            monBox.classList.remove('atk');
            if (H.hp <= 0) return lose();
            if (log) log.textContent = `⚔️ 你造成 ${dmg} 伤害 · ${def.n}反击 ${md} 伤害`;
            lock = false;
          }, 240);
        } else {
          if (log) log.textContent = crit ? `⚡ 会心一击 ${dmg} 伤害（${def.n} HP ${Math.max(0, M.hp)}/${M.max}）` : `⚔️ 你造成 ${dmg} 伤害（${def.n} HP ${Math.max(0, M.hp)}/${M.max}）`;
          lock = false;
        }
      }, 360);
    };
    document.getElementById('b99Atk').addEventListener('click', () => heroAct(1, 0));
    document.getElementById('b99Heavy').addEventListener('click', () => heroAct(2.4, 0.35));
    document.getElementById('b99Guard').addEventListener('click', () => {
      if (lock || over) return;
      brace = true;
      const hl = Math.max(1, Math.round(H.max * 0.06));
      H.hp = Math.min(H.max, H.hp + hl);
      upd();
      try { this._sfx99 && this._sfx99('on'); } catch (e) {}
      if (log) log.textContent = `🛡️ 你稳住呼吸：回复 ${hl} 点血 · 下一次反击伤害 -65%`;
    });
    document.getElementById('b99Flee').addEventListener('click', () => {
      try { this._sfx99 && this._sfx99('back'); } catch (e) {}
      closeBattle();
    });
  },
});
