// 96-perm99.js —— v12.9.46 【独行空间】（原权限管理）页面 + 全局音效引擎
// [功能组] G1-系统内核（权限与声音是全 App 基础设施 · 改动牵连排查请按组检索）
//
// 入口：底部导航第一个按钮（🧭 收展键）长按 1 秒 → 液体流动音 + 圆幕渐变过渡 → 进入本页
//
// 独行空间/权限（v12.9.46b 全端开放 · 用户规则）：权限内容对所有类型展示，仅客户端执行跳转：
//   · 六项系统能力逐卡显示真实状态（闹钟和提醒/悬浮窗/使用量/通知栏/电池不优化/读取应用列表）
//   · 点击开关 → 跳转对应手机系统设置页，用户自行允许；返回 App 自动复检刷新
//   · 「使用量权限」的旧入口（戒断数据页按钮 + 启动弹窗直跳）已全部迁移到这里
//
// 音效引擎（Web Audio 全程序合成 · 零音频文件 · 零流量 · APK 体积零增加）：
//   tap 普通点击（短促清脆）· back 取消/返回（轻"嗒"·次要按钮复用同一声音）
//   · success 成功（轻快悦耳双音）· fail 失败/警告（低沉短促不刺耳）· popup 弹窗（很轻）
//   · liquid 长按/过渡（液体流动）· on/off 开关（上滑小泡/轻嗒）
//   · 独行信条（rpg99 视图）下自动切换 8-bit 芯片音色（游戏音效风）
//   · 全部 0.05-0.92 秒；总开关：本页「全局音效」卡（localStorage sfx99 · 默认开启）
Object.assign(App, {

  // ==================== 音效引擎 ====================
  _sfx99Ctx: null,
  _sfx99On() { try { return localStorage.getItem('sfx99') !== '0'; } catch (e) { return true; } },
  _sfx99Set(on) { try { localStorage.setItem('sfx99', on ? '1' : '0'); } catch (e) {} },
  _sfx99Ac() {
    if (!this._sfx99Ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { this._sfx99Ctx = new AC(); } catch (e) { return null; }
    }
    if (this._sfx99Ctx.state === 'suspended') { try { this._sfx99Ctx.resume(); } catch (e) {} }
    return this._sfx99Ctx;
  },
  // 单音基元：wave 波形 / f1→f2 滑频 / dur 时长 / vol 音量 / when 延迟（秒 · 音序用）
  _sfx99Tone(wave, f1, f2, dur, vol, when) {
    const ac = this._sfx99Ac();
    if (!ac) return;
    const t0 = ac.currentTime + (when || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f1, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  },
  // 噪声基元：带通扫掠（液体流动的主体）
  _sfx99Noise(dur, vol, f0, f1, q) {
    const ac = this._sfx99Ac();
    if (!ac) return;
    const sr = ac.sampleRate;
    const n = Math.floor(sr * dur);
    const buf = ac.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q || 2;
    const t0 = ac.currentTime;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(ac.destination);
    src.start(t0); src.stop(t0 + dur + 0.02);
  },
  // 播放入口（App._sfx99('tap')）
  _sfx99LastMeow: 0,
  _sfx99(kind) {
    if (!this._sfx99On()) return;
    try {
      // 独行信条（个人中心 rpg99）视图 → 游戏音色（8-bit 芯片风）
      const rpg = this.currentView === 'rpg99' || (this.currentView === 'workbench' && this._wbView === 'rpg99');
      switch (kind) {
        case 'tap':       // 点击确认：短促清脆（RPG 页换芯片音色）
          if (rpg) this._sfx99Tone('square', 880, 0, 0.06, 0.09);
          else this._sfx99Tone('sine', 1150, 900, 0.07, 0.16);
          break;
        case 'back':      // 取消/返回：轻一点的"嗒"（次要按钮统一复用）
          this._sfx99Tone('sine', 620, 0, 0.05, 0.10);
          break;
        case 'popup':     // 弹窗弹出：很轻的过渡音
          this._sfx99Tone('sine', 780, 0, 0.05, 0.07);
          break;
        case 'on':        // 开关打开：上滑小泡
          this._sfx99Tone('sine', 520, 820, 0.09, 0.16);
          break;
        case 'off':       // 开关关闭：轻嗒
          this._sfx99Tone('sine', 600, 0, 0.05, 0.10);
          break;
        case 'swing':    // 像素战士挥武器：短促"嗖"（带通噪声高频快速下扫 + 尾音轻点）
          this._sfx99Noise(0.18, 0.20, 2600, 480, 1.4);
          this._sfx99Tone('sine', 320, 0, 0.05, 0.06, 0.1);
          break;
        case 'thud':     // 战士受击：低沉闷响（噪声极短 + 低频正弦）
          this._sfx99Noise(0.09, 0.16, 220, 90, 0.8);
          this._sfx99Tone('sine', 130, 70, 0.13, 0.18);
          break;
        case 'meow':     // 小银猫叫：合成喵（音高先升后降 + 共振峰带通 · 随机微变调防机械感 · 450ms 节流）
          if (Date.now() - (this._sfx99LastMeow || 0) < 450) break;
          this._sfx99LastMeow = Date.now();
          this._sfx99Meow(0.94 + Math.random() * 0.12);
          break;
        case 'liquid':    // 长按提示 / 入场过渡：液体流动（0.92s · 带通扫掠 + 三颗上升气泡）
          this._sfx99Noise(0.92, 0.13, 350, 850, 1.8);
          this._sfx99Tone('sine', 480, 720, 0.16, 0.10, 0.05);
          this._sfx99Tone('sine', 560, 840, 0.14, 0.09, 0.28);
          this._sfx99Tone('sine', 640, 960, 0.12, 0.08, 0.50);
          break;
        case 'success':   // 成功：轻快悦耳双音（RPG 页换上行琶音）
          if (rpg) {
            this._sfx99Tone('square', 523, 0, 0.07, 0.09);
            this._sfx99Tone('square', 659, 0, 0.07, 0.09, 0.07);
            this._sfx99Tone('square', 784, 0, 0.10, 0.09, 0.14);
          } else {
            this._sfx99Tone('sine', 1047, 0, 0.13, 0.15);
            this._sfx99Tone('sine', 1319, 0, 0.18, 0.13, 0.10);
          }
          break;
        case 'fail':      // 失败/警告：低沉短促，不刺耳
          if (rpg) this._sfx99Tone('square', 180, 110, 0.20, 0.10);
          else this._sfx99Tone('triangle', 190, 140, 0.22, 0.16);
          break;
        case 'gameTap':
          this._sfx99Tone('square', 880, 0, 0.06, 0.09);
          break;
        case 'gameSuccess':
          this._sfx99Tone('square', 523, 0, 0.07, 0.09);
          this._sfx99Tone('square', 659, 0, 0.07, 0.09, 0.07);
          this._sfx99Tone('square', 784, 0, 0.10, 0.09, 0.14);
          break;
        case 'gameFail':
          this._sfx99Tone('square', 180, 110, 0.20, 0.10);
          break;
        case 'box':       // 盲盒摇晃：木壳咯咯声（三连短噪声脉冲 · 间隔递缩）
          this._sfx99Noise(0.05, 0.16, 700, 300, 1.2);
          this._sfx99Noise(0.05, 0.15, 650, 280, 1.2);
          this._sfx99Noise(0.06, 0.16, 720, 300, 1.2);
          this._sfx99Tone('sine', 240, 180, 0.10, 0.10, 0.05);
          break;
        case 'reveal':    // 盲盒开出：上行琶音 + 闪光泛音（惊喜感）
          this._sfx99Tone('sine', 523, 0, 0.09, 0.14);
          this._sfx99Tone('sine', 659, 0, 0.09, 0.14, 0.08);
          this._sfx99Tone('sine', 784, 0, 0.09, 0.13, 0.16);
          this._sfx99Tone('sine', 1047, 0, 0.16, 0.12, 0.24);
          this._sfx99Noise(0.12, 0.06, 3200, 1600, 2.5);
          break;
        case 'cheer':     // v12.9.46 自律打卡成功 · 专属庆祝：双八度琶音 + 三角波闪亮尾音 + 彩带"唰"
          this._sfx99Tone('sine', 523, 0, 0.08, 0.14);
          this._sfx99Tone('sine', 784, 0, 0.08, 0.14, 0.07);
          this._sfx99Tone('sine', 1047, 0, 0.09, 0.14, 0.14);
          this._sfx99Tone('triangle', 1568, 0, 0.14, 0.10, 0.22);
          this._sfx99Noise(0.10, 0.05, 3600, 2200, 2.8);
          break;
        case 'coin':      // v12.9.46 消费记录入账 · 金币叮当：双高音叮（B5→E6 错落）
          this._sfx99Tone('sine', 988, 0, 0.07, 0.13);
          this._sfx99Tone('sine', 1319, 0, 0.13, 0.12, 0.06);
          this._sfx99Tone('sine', 1976, 0, 0.05, 0.04, 0.09);
          break;
        // ==================== v12.9.46 沙盘场景音效（记录页 · 点小人/果树/邮筒/小银）====================
        case 'hi':        // 像素小人挥手：友好双音「哟～」（D5→A5 上行轻快）
          this._sfx99Tone('sine', 587, 0, 0.09, 0.13);
          this._sfx99Tone('sine', 880, 0, 0.13, 0.12, 0.1);
          this._sfx99Tone('sine', 1175, 0, 0.05, 0.04, 0.2);
          break;
        case 'rustle':   // 果树摇曳：叶片沙沙（双段带通噪声快速下扫 · 轻颤）
          this._sfx99Noise(0.14, 0.05, 2600, 900, 1.6);
          this._sfx99Noise(0.2, 0.04, 2200, 700, 1.4);
          this._sfx99Tone('triangle', 660, 0, 0.06, 0.03, 0.03);
          break;
        case 'mail':      // 邮筒开箱：纸片滑出"唰" + 双叮来信（G5→C6）
          this._sfx99Noise(0.16, 0.04, 1400, 2800, 2.2);
          this._sfx99Tone('sine', 784, 0, 0.07, 0.1, 0.14);
          this._sfx99Tone('sine', 1047, 0, 0.12, 0.09, 0.22);
          break;
        // ==================== v12.9.46 四魔专属恶魔音效（戒断数据 · 每魔一种叫声）====================
        case 'mon-yin':   // 淫魔：妖媚低语「呵～」——锯齿慢滑降 + 气声 + 媚颤双泛音
          this._sfx99Tone('sawtooth', 260, 150, 0.52, 0.05);
          this._sfx99Tone('sine', 520, 330, 0.38, 0.045, 0.07);
          this._sfx99Tone('sine', 780, 560, 0.30, 0.03, 0.16);
          this._sfx99Noise(0.42, 0.045, 480, 950, 1.6);
          break;
        case 'mon-yu':    // 娱魔：尖锐狂笑「嘿嘿嘿～」——方波三连上行（尾音上挑）
          this._sfx99Tone('square', 560, 625, 0.09, 0.065);
          this._sfx99Tone('square', 650, 715, 0.09, 0.065, 0.115);
          this._sfx99Tone('square', 730, 860, 0.13, 0.055, 0.23);
          this._sfx99Noise(0.10, 0.03, 1800, 2600, 2.4);
          break;
        case 'mon-duo':   // 惰魔：昏沉低吼「唔——」——次声级正弦慢滑 + 三角次谐（打哈欠般迟钝）
          this._sfx99Tone('sine', 95, 57, 0.72, 0.17);
          this._sfx99Tone('triangle', 48, 35, 0.68, 0.10, 0.06);
          this._sfx99Noise(0.55, 0.028, 120, 300, 1.2);
          break;
        case 'mon-tan':   // 贪魔：贪婪嘶吼「嘶！」——锯齿急速滑升 + 金属带通 + 高频泛音闪
          this._sfx99Tone('sawtooth', 180, 920, 0.25, 0.075);
          this._sfx99Noise(0.22, 0.09, 850, 2600, 3.2);
          this._sfx99Tone('square', 1240, 0, 0.05, 0.04, 0.23);
          this._sfx99Tone('square', 1860, 0, 0.04, 0.03, 0.27);
          break;
        case 'boss-roar':  // v12.9.46 月度魔物咆哮：巨兽低吼「吼——！」——锯齿宽幅滑降 + 喉音颤 + 次声轰底
          this._sfx99Tone('sawtooth', 220, 68, 0.62, 0.16);
          this._sfx99Tone('square', 82, 46, 0.55, 0.085, 0.05);
          this._sfx99Tone('sine', 40, 28, 0.66, 0.14, 0.02);
          this._sfx99Noise(0.5, 0.05, 180, 700, 1.6);
          break;
        case 'thunder':   // v12.9.46 雷鸣：白噪宽带爆裂 + 低频滚雷衰减
          this._sfx99Noise(0.85, 0.12, 140, 2400, 0.6);
          this._sfx99Tone('sine', 72, 30, 0.8, 0.12, 0.04);
          this._sfx99Noise(0.6, 0.06, 90, 300, 1.1);
          break;
        case 'cosmos':    // v12.9.46 独行地球：宇宙深空滑越——高频下坠 + 宽带星风 + 低频嗡鸣
          this._sfx99Tone('sine', 620, 140, 0.52, 0.14);
          this._sfx99Noise(0.5, 0.06, 300, 1800, 1.4);
          this._sfx99Tone('triangle', 130, 62, 0.6, 0.09, 0.06);
          this._sfx99Tone('sine', 1100, 1600, 0.14, 0.05, 0.02);
          break;
      }
    } catch (e) {}
  },
  // 猫叫合成（pitch：微变调系数）：锯齿波过共振峰带通，音高 520→860→760→480 弯出"喵——"
  _sfx99Meow(pitch) {
    const ac = this._sfx99Ac();
    if (!ac) return;
    const t0 = ac.currentTime;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520 * pitch, t0);
    o.frequency.linearRampToValueAtTime(860 * pitch, t0 + 0.12);
    o.frequency.linearRampToValueAtTime(760 * pitch, t0 + 0.24);
    o.frequency.linearRampToValueAtTime(480 * pitch, t0 + 0.34);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 5;
    bp.frequency.setValueAtTime(900, t0);
    bp.frequency.linearRampToValueAtTime(1500, t0 + 0.12);
    bp.frequency.linearRampToValueAtTime(1100, t0 + 0.34);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.05);
    g.gain.setValueAtTime(0.22, t0 + 0.20);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.36);
    o.connect(bp); bp.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + 0.40);
  },

  // 全局接线（模块加载即挂好）：手势解锁 AudioContext · _modal/_flash 语义包装 · 点击委托
  _sfx99Init() {
    if (this.__sfx99Wired) return;
    this.__sfx99Wired = true;
    // 手机浏览器要求用户手势后才允许出声——任意按下/按键都尝试解锁+恢复。
    // v12.9.46 修复音效丢失：①解锁监听不再 once（首次 resume 异步竞争失败后，后续手势不再重试 → 永久静音）；
    //   ②App 切后台系统会 suspend AudioContext，回前台必须 resume，否则此后所有音效静默丢失
    const un = () => { try { this._sfx99Ac(); } catch (e) {} };
    document.addEventListener('pointerdown', un, { capture: true });
    document.addEventListener('keydown', un, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') un();
    });
    // 弹窗打开 → 很轻的过渡音（包装 _modal，不改其实现）
    const om = this._modal.bind(this);
    this._modal = function (...a) { try { App._sfx99('popup'); } catch (e) {} return om.apply(App, a); };
    // flash 语义 → 专属音效（v12.9.46 新增两级：打卡成功 cheer · 消费入账 coin）
    const ofl = this._flash.bind(this);
    this._flash = function (msg) {
      try {
        const m = String(msg || '');
        if (/打卡成功|打卡完成|补卡成功|挑战完成|连续打卡/.test(m)) App._sfx99('cheer');
        else if (/已同步【数据中心|已入账|已记录（累计|花费已同步/.test(m)) App._sfx99('coin');
        else if (/^(✅|🎉|🏆|🥇|🥈|🥉|⭐|💪|🌟)/.test(m)) App._sfx99('success');
        else if (/^(❌|🚫|⚠|⛔|💔)/.test(m)) App._sfx99('fail');
      } catch (e) {}
      return ofl.call(App, msg);
    };
    // 点击委托：按钮 → 确认音；返回/关闭类 → 统一轻"嗒"（开关音效走自身逻辑，此处跳过）
    // v12.9.46 全量覆盖：卡片/chip/热区等非 <button> 可点元素（div[onclick] / a[href] / [role=button]）
    //   一并补上确认音——所有「点卡片进子页」的交互不再无声
    document.addEventListener('click', (e) => {
      try {
        const b = e.target && e.target.closest ? e.target.closest('button') : null;
        if (b) {
          if (b.id === 'dock99Toggle') return;                 // 长按入口有自己的液体音
          if (b.classList.contains('perm99-sw')) return;        // 开关走自身逻辑
          if (/返回|关闭|取消|下次再说|稍后再说|稍后|跳过/.test(b.textContent || '')) { this._sfx99('back'); return; }
          this._sfx99('tap'); return;
        }
        const c = e.target && e.target.closest ? e.target.closest('[onclick], a[href], [role="button"]') : null;
        if (c) {
          const ctxt = (c.textContent || '') + ' ' + (c.getAttribute('onclick') || '');
          if (/navBack|返回|关闭|取消|跳过/.test(ctxt)) { this._sfx99('back'); return; }
          this._sfx99('tap');
        }
      } catch (e) {}
    }, true);
  },

  // ==================== 独行空间（原权限管理 · 入口：🧭 长按 1 秒）====================
// v12.9.69 权限中心重写：
//   · 权限去重：usage(使用量权限/使用情况访问) / battery(电池不优化/忽略电池优化) 合并
//   · 全权限三态交互：①顶部「系统已授予/未授予」真值标签 ②点击卡片任意区域跳系统设置
//     ③右侧开关 = App内业务启停（独立于系统权限，切换即时生效）
//   · Lookus99 插件 checkAllPerms() 返回全9项系统真值；openSetting(k) 支持全9项跳转
//   · _perm99AppSw 记录 App 内开关状态（localStorage 持久化）
// v12.9.60 修复回归：本函数在 v12.9.59 权限页重写时被误删——导致 🧭 长按
  _perm99Enter(ev) {
    const btn = document.getElementById('dock99Toggle');
    const r = btn ? btn.getBoundingClientRect() : null;
    const x = (ev && ev.clientX) || (r ? r.left + r.width / 2 : 40);
    const y = (ev && ev.clientY) || (r ? r.top + r.height / 2 : window.innerHeight - 40);
    const veil = document.createElement('div');
    veil.className = 'perm99-veil';
    veil.style.setProperty('--vx', x + 'px');
    veil.style.setProperty('--vy', y + 'px');
    (document.body || document.documentElement).appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('run')));
    setTimeout(() => { try { this.navigate('perm99'); } catch (e) {} }, 950);   // 圆幕铺满瞬间换页
    setTimeout(() => {
      veil.classList.add('fade');
      setTimeout(() => { try { veil.remove(); } catch (e) {} }, 380);
    }, 1080);
  },

  // v12.9.69 权限中心三态模型：
  //   sys → 系统已授予/未授予（原生 Lookus99.checkAllPerms 真值，只读）
  //   app → App内开关（App自行持久化的业务启停，独立于系统权限）
  //   sys 只读 + app 可切 → 卡片顶部标签 + 右侧开关 → 点击卡片跳系统设置
  // 去重完成：usage(使用量权限/使用情况访问合并) / battery(电池不优化/忽略电池优化合并)
  PERM99: [
    // —— 顶部区域（原有基础权限，usage/battery 已与 Lookus 模块合并 ——）
    { k: 'mic',     ico: '🎤', n: '话筒权限',   tag: '',     d: '语音对话 / 朗读等语音功能——仅在你按下说话时使用，不录音不上传', sys: true },
    { k: 'notif',   ico: '🔔', n: '通知栏权限', tag: '',     d: '阿福提醒推送到手机通知栏（打卡/喝水/三餐/卫生/睡眠）', sys: true },
    { k: 'usage',   ico: '📊', n: '使用情况访问', tag: '关键', d: '查看各App使用情况、读取App使用记录、屏幕亮熄屏事件、解锁次数；支持原有统计功能 + 情侣【此时此刻】时间轴', sys: true },
    { k: 'overlay', ico: '🪟', n: '悬浮窗权限', tag: '关键', d: '聚神锁机页面、悬浮提醒的显示基础', sys: true },
    { k: 'battery', ico: '🔋', n: '忽略电池优化', tag: '',   d: '加入省电白名单，防止后台被系统清理；保障提醒准时到达、【此时此刻】持续采集设备状态', sys: true },
    { k: 'applist', ico: '📋', n: '读取应用列表', tag: '',   d: '识别娱乐类App（抖音/B站/游戏等），记录更精准', sys: true },
    { k: 'alarm',   ico: '⏰', n: '闹钟和提醒', tag: '',     d: '定时提醒、番茄钟到点准时唤醒；缺少它提醒会延迟', sys: true },
    // —— 【此时此刻】分组（仅独有权限；usage/battery 已在上半区合并）——
    //   由 LOOKUS99_PERM（115-lookus99.js）驱动，此处不再重复
  ],

  // App内开关状态（localStorage 持久化，独立于系统权限）
  _perm99AppSwDef() {
    // usage / battery 合并后，App内开关同时控制上半区 + Lookus 下游的对应采集
    const lk = this._lk99Sw ? this._lk99Sw() : { usage: false, notifs: false, battery: false, location: false };
    return {
      mic:   Store.getSetting('perm99_app_mic',   '1') === '1',
      notif: Store.getSetting('perm99_app_notif', '1') === '1',
      usage: Store.getSetting('perm99_app_usage', '0') === '1' || !!lk.usage,
      overlay:  Store.getSetting('perm99_app_overlay', '0') === '1',
      battery: Store.getSetting('perm99_app_battery', '0') === '1' || !!lk.battery,
      applist: Store.getSetting('perm99_app_applist', '0') === '1',
      alarm:   Store.getSetting('perm99_app_alarm',   '1') === '1',
      notifs:  !!lk.notifs,
      location: !!lk.location,
    };
  },
  _perm99AppSw: null,

  // 全权限系统真值缓存（Lookus99.checkAllPerms 返回）
  _perm99St: null,

  async _perm99Status(force) {
    if (!this._nat99On()) return null;
    // v12.9.73 【P2-6】防抖节流 + 在途合并：从系统设置返回会同时触发
    //   visibilitychange(0/1200/3500ms) + focus(200/2500ms) + pageshow(300/2000ms)，
    //   旧版一次返回最多 5~7 路并发 checkAllPerms 原生调用；现在——
    //   · 非强制调用：500ms 内直接回缓存（节流）
    //   · 并发调用（含强制）：在途合并，共用同一次原生调用（去重）
    const now = Date.now();
    if (!force && this._perm99St && now - (this._perm99StAt || 0) < 500) return this._perm99St;
    if (this._perm99StatusP) return this._perm99StatusP;
    const run = (async () => {
    if (!force && this._perm99St) return this._perm99St;
    const zero = { mic: false, notif: false, overlay: false, usage: false, battery: false, applist: true, alarm: true, notifs: false, location: false };
    try {
      const LK = this._nat99Plg('Lookus99');
      if (LK && LK.checkAllPerms) {
        const r = await LK.checkAllPerms();
        this._perm99St = Object.assign(zero, r || {});
        this._lk99PermsSt = Object.assign({}, zero, r || {});   // 同步给 Lookus 模块用
      } else {
        // 旧 Lookus99（只返回 usage/notifs/battery/location）—— 补齐其余
        const r2 = LK ? (await LK.checkPerms()) || {} : {};
        this._perm99St = Object.assign(zero, r2);
        this._lk99PermsSt = Object.assign({}, zero, r2);
      }
    } catch (e) { this._perm99St = Object.assign({}, zero); }
    // 旧话筒/通知真值插件兜底（Lookus99 新版已返回 mic/notif，但以防万一）
    try {
      const SR = this._nat99Plg('Vosk99');
      if (SR) { const r = await SR.checkPermissions(); if (r && r.recordAudio === 'granted') this._perm99St.mic = true; }
    } catch (e) {}
    try {
      const L = this._nat99Plg('LocalNotifications');
      if (L) { const r = await L.checkPermissions(); if (r && r.display === 'granted') this._perm99St.notif = true; }
    } catch (e) {}
    this._perm99StAt = Date.now();       // 【P2-6】节流时间戳（成功拿到一次真值才刷新）
    return this._perm99St;
    })();
    this._perm99StatusP = run;
    try { return await run; } finally { if (this._perm99StatusP === run) this._perm99StatusP = null; }
  },

  // ==================== 崩溃日志（Crash99 · v12.9.73 P1：仅本地保存，上传必须用户同意）====================
  _crash99Plg() { return this._nat99Plg('Crash99'); },
  // 启动巡检：有未处理的本地崩溃日志 → 弹窗征询（每批只问一次；绝不静默上传）
  async _crash99Boot() {
    if (!this._nat99On()) return;
    const P = this._crash99Plg();
    if (!P || !P.pending) return;
    try {
      const r = await P.pending();
      const n = (r && r.count) || 0;
      if (!n) return;
      let asked = 0;
      try { asked = parseInt(localStorage.getItem('crash99_asked') || '0', 10) || 0; } catch (e) {}
      if (asked >= n) return;                       // 该批已问过（崩溃数没涨不再打扰）
      try { localStorage.setItem('crash99_asked', String(n)); } catch (e) {}
      this._modal(`🧯 检测到 ${n} 份崩溃日志（仅保存在本机）`, `
        <div style="font-size:12.5px;color:#475569;line-height:2;padding:4px 0">
          上次运行发生了崩溃，堆栈已保存在手机本地（最多 20 份 · 不会自动上传）。<br>
          <b>是否上传到你的云账户</b>帮助定位问题？也可复制后自行保管。
        </div>`, [
        { label: '📤 上传云端', primary: true, onClick: () => this._crash99Upload() },
        { label: '📋 复制', onClick: () => this._crash99Copy() },
        { label: '📱 暂不（保留本机）' },
      ]);
    } catch (e) {}
  },
  async _crash99Upload() {
    try {
      const P = this._crash99Plg();
      if (!P || !P.read) return;
      const r = await P.read({ limit: 20 });
      const logs = (r && r.logs) || [];
      if (!logs.length) { this._flash('本机没有待上传的崩溃日志'); return; }
      // 隐私红线：仅登录云账户时上传；未登录给复制出路，绝不静默外发
      if (!(this._c99 && this._c99.client && this._c99.user)) {
        this._flash('🌐 需先登录云账户再上传——也可点下方「复制」手动带走');
        this._crash99Copy();
        return;
      }
      const rows = logs.map(l => ({
        user_id: this._c99.user.id,
        ver: 'v' + ((window.__APP_VER__ && window.__APP_VER__.v) || ''),
        file: l.file || '',
        log: String(l.text || '').slice(0, 20000),
      }));
      const { error } = await this._c99.client.from('crash99_logs').insert(rows);
      if (error) {
        this._flash('⚠️ 上传未成功（云账户缺 crash99_logs 表或网络异常）——日志已保留本机，可稍后重试');
        return;
      }
      try { await P.clear(); } catch (e) {}
      this._flash('✅ 崩溃日志已上传云端并清除本机副本——感谢帮助改进');
    } catch (e) { this._flash('⚠️ 上传失败——日志已保留本机可重试'); }
  },
  async _crash99Copy() {
    try {
      const P = this._crash99Plg();
      if (!P || !P.read) return;
      const r = await P.read({ limit: 20 });
      const logs = (r && r.logs) || [];
      if (!logs.length) { this._flash('本机没有崩溃日志'); return; }
      const text = logs.map(l => `---- ${l.file || ''} ----\n${l.text || ''}`).join('\n\n');
      try { await navigator.clipboard.writeText(text); this._flash('📋 崩溃日志已复制到剪贴板'); }
      catch (e) { this._flash('⚠️ 复制失败——剪贴板权限被拒'); }
    } catch (e) {}
  },

  render_perm99() {
    const v = document.getElementById('view-perm99');
    if (!v) return;
    const sfxOn = this._sfx99On();
    const st = this._perm99St || {};
    // v12.9.69 App内开关状态（独立于系统权限）
    const appSw = this._perm99AppSwDef();
    this._perm99AppSw = appSw;
    const client = this._nat99On() || !!window.__PHONE_EDITION__;
    // v12.9.69 三态卡片渲染：系统标签（真值）+ 开关（App内）+ 点击跳系统设置
    const cards = this.PERM99.map(p => this._perm99CardHtml(p, st, appSw)).join('');
    v.innerHTML = `
      <div class="perm99-wrap">
        <div class="perm99-head">
          <button class="btn btn-ghost btn-sm" onclick="App.navBack()">← 返回</button>
          <div class="perm99-title">🛡️ 独行空间</div>
          <button class="btn btn-ghost btn-sm" onclick="App._perm99Refresh()">重新检测</button>
        </div>
        <div class="perm99-sub">长按 🧭 1 秒可随时回到这里</div>
        <div class="perm99-banner">ℹ️ 未授权仅影响对应功能，其他功能不受影响 · 所有数据仅本机读取，不出设备</div>
        ${client ? '' : '<div class="perm99-banner">🌐 当前为网页版——权限内容正常展示；授权操作在手机客户端上进行</div>'}
        <div class="perm99-acts">
          <div class="perm99-act" onclick="App._apk99CheckForce()">
            <div class="perm99-act-ico">🔄</div>
            <div class="perm99-act-mid">
              <div class="perm99-act-name">检查更新</div>
              <div class="perm99-act-desc">检查是否有新版本 · 已是最新会提示</div>
            </div>
            <span class="perm99-act-go">›</span>
          </div>
          <div class="perm99-act" onclick="App.gotoWb('notify99')">
            <div class="perm99-act-ico">🔔</div>
            <div class="perm99-act-mid">
              <div class="perm99-act-name">阿福提醒设置</div>
              <div class="perm99-act-desc">打卡 / 喝水 / 三餐 / 卫生 / 睡眠——推送到手机通知栏</div>
            </div>
            <span class="perm99-act-go">›</span>
          </div>
          <div class="perm99-act" onclick="App.navigate('guide99')">
            <div class="perm99-act-ico">📖</div>
            <div class="perm99-act-mid">
              <div class="perm99-act-name">一人行攻略</div>
              <div class="perm99-act-desc">各功能与后续新功能的使用方法</div>
            </div>
            <span class="perm99-act-go">›</span>
          </div>
        </div>
        <div class="perm99-card ${sfxOn ? 'on' : ''}" data-clickable="0">
          <div class="perm99-ico">🔊</div>
          <div class="perm99-mid">
            <div class="perm99-name">全局音效</div>
            <div class="perm99-desc">点击确认 / 长按流动 / 成功 / 警告提示音——一键总开关</div>
          </div>
          <button type="button" class="perm99-sw ${sfxOn ? 'on' : ''}" data-sfx="1" aria-label="音效开关"></button>
        </div>
        ${cards}
        ${this._lk99On && this._lk99On() ? `
        <div class="lk99-pc-head">📡 设备同步 ·【此时此刻】（情侣空间）</div>
        <div class="perm99-banner lk99-law-b">以上设备权限仅用于双方知情授权的信息同步，您可随时在此关闭任一权限；关闭后相关数据将停止采集与同步</div>
        ${this._lk99PermRowsHtml(st)}
        <div class="perm99-foot" style="margin-top:8px">①系统授权状态为只读真值（跳系统设置手动开启）②右侧开关为本App内启停（独立于系统权限 · 切换即时生效真停采）</div>` : ''}
        ${client ? '<div class="perm99-foot" id="perm99foot">正在检测权限状态…</div>' : ''}
      </div>`;
    if (client) this._perm99Refresh(true);

    // —— v12.9.69 事件绑定：卡片点击跳系统设置 / 右侧开关只切 App内状态 ——
    // 全局音效卡：data-clickable="0" 不绑定跳设置
    v.querySelectorAll('.perm99-card').forEach(card => {
      const k = card.dataset.perm;
      if (!k) return;                                    // sfx 卡没有 data-perm
      card.addEventListener('click', (ev) => {
        if (ev.target && ev.target.closest('.perm99-sw')) return;    // 点的是开关 → 不走跳转
        if (ev.target && ev.target.closest('button')) return;
        if (!this._nat99On() && !window.__PHONE_EDITION__) {
          this._sfx99('back');
          this._flash('🌐 网页版——在手机客户端点击卡面可跳系统设置');
          return;
        }
        this._sfx99('tap');
        this._perm99JumpSetting(k);
      });
    });
    // 所有开关按钮
    v.querySelectorAll('.perm99-sw').forEach(sw => {
      sw.addEventListener('pointerdown', () => sw.classList.add('pressing'));
      sw.addEventListener('pointerup', () => sw.classList.remove('pressing'));
      sw.addEventListener('pointerleave', () => sw.classList.remove('pressing'));
      sw.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (sw.dataset.sfx) {                           // 音效总开关：本页直接生效
          const now = !this._sfx99On();
          this._sfx99Set(now);
          sw.classList.toggle('on', now);
          const c = sw.closest('.perm99-card');
          if (c) c.classList.toggle('on', now);
          this._sfx99(now ? 'on' : 'off');
          return;
        }
        const k = sw.dataset.perm;
        if (!k) {
          const lk = sw.dataset.lk;
          if (lk) this._lk99SwToggle(lk);               // Lookus 下游专用开关
          return;
        }
        // —— v12.9.69 三态开关切换逻辑 ——
        if (!this._nat99On() && !window.__PHONE_EDITION__) {
          this._sfx99('back');
          this._flash('🌐 网页版无需授权——权限在手机客户端的对应功能里按需申请');
          return;
        }
        this._perm99AppSwToggle(k);
      });
    });
  },

  // v12.9.69 生成一张权限卡片 HTML（三态：系统标签 + 名称+关键标签 + 描述 + App内开关）
  _perm99CardHtml(p, sysSt, appSw) {
    const sysOk = !!sysSt[p.k];
    const on = !!appSw[p.k];
    // usage / battery 合并：Lookus 下游开关也一起驱动
    const merged = (p.k === 'usage' || p.k === 'battery') && !!appSw['lk_' + p.k.slice(0,1)];   // 不用了，已用 _perm99AppSwDef 统一
    return `<div class="perm99-card ${on && sysOk ? 'on' : sysOk ? '' : ''}" data-perm="${p.k}" id="perm99card-${p.k}">
      <div class="perm99-ico">${p.ico}</div>
      <div class="perm99-mid">
        <div class="perm99-name">${p.n}${p.tag ? `<span class="perm99-tag">${p.tag}</span>` : ''}${p.sys !== false ? `<span class="lk99-sys sys-chip ${sysOk ? 'ok' : ''}">${sysOk ? '系统已授予' : '系统未授予'}</span>` : ''}</div>
        <div class="perm99-desc">${p.d}</div>
      </div>
      <button type="button" class="perm99-sw ${on ? 'on' : ''}" data-perm="${p.k}" aria-label="${p.n} App内启停"></button>
    </div>`;
  },

  // v12.9.69 卡片点击 → 跳系统设置（Lookus99.openSetting 支持全 9 项）
  async _perm99JumpSetting(k) {
    const P = this._nat99Plg('Lookus99');
    if (!P || !P.openSetting) {
      this._flash('📱 请在手机客户端上开启该权限');
      return;
    }
    try {
      await P.openSetting({ k });
      this._flash('已跳转系统设置——开启后返回 App 自动复检');
    } catch (e) {
      // 旧 Lookus99 只支持 usage/notifs/battery/location → 兜底：用应用详情页
      try {
        const Intent = null;   // 无法在 JS 里直接构造，只能让旧插件来
        this._flash('⚠️ 该 ROM 没有对应设置页——到 系统设置 → 应用 → 一人行 → 权限 手动开启');
      } catch (e2) {}
    }
  },

  // v12.9.69 App内开关切换（持久化 + 联动 Lookus 采集）
  _perm99AppSwToggle(k) {
    const def = this._perm99AppSwDef();
    const now = !def[k];
    def[k] = now;
    const SET_MAP = { mic: 'perm99_app_mic', notif: 'perm99_app_notif', usage: 'perm99_app_usage', overlay: 'perm99_app_overlay', battery: 'perm99_app_battery', applist: 'perm99_app_applist', alarm: 'perm99_app_alarm' };
    if (SET_MAP[k]) Store.setSetting(SET_MAP[k], now ? '1' : '0');
    this._perm99AppSw = def;
    this._sfx99(now ? 'on' : 'off');

    // usage / battery 合并：同步 Lookus 下游开关
    if (k === 'usage' || k === 'battery') {
      if (this._lk99SwSave) {
        const lk = this._lk99Sw();
        lk[k] = now;
        this._lk99SwSave(lk);
        try { this._lk99SyncService(true); } catch (e) {}
      }
    }
    // v12.9.70 【应用锁机】联动：悬浮窗 App内开关 = 锁机总闸（阿福锁唯一逃生出口）
    //   关闭 → 停止锁机后台 Service + 销毁全部屏保；开启 → 已有规则则恢复守护
    if (k === 'overlay' && this._lock99Plg) {
      try { now ? this._lock99PermResume() : this._lock99PermStopAll(); } catch (e) {}
    }
    // usage / battery 关闭 → Lookus 对应功能置灰
    const card = document.getElementById('perm99card-' + k);
    const sysOk = !!(this._perm99St && this._perm99St[k]);
    if (card) card.classList.toggle('on', !!(now && sysOk));
    const sw = card && card.querySelector('.perm99-sw');
    if (sw) sw.classList.toggle('on', now);
    if (!now) {
      this._flash('已停用「' + ((this.PERM99.find(p => p.k === k) || {}).n || k) + '」——对应数据停止采集与同步');
      // Lookus 整体停采检查
      try { if (this._lk99AnyOn && !this._lk99AnyOn()) this._lk99SyncService(true); } catch (e) {}
    } else {
      // 开启但系统未授予 → 提示跳设置
      if (!sysOk) {
        this._flash('开关已打开——点击卡片去系统设置授权「' + ((this.PERM99.find(p => p.k === k) || {}).n || k) + '」');
      } else {
        this._flash('✅ 已开启——功能恢复');
      }
    }
    this._perm99Refresh(true);
  },

  // v12.9.49 返回巡检：授权弹窗后 120 秒窗口内每 5 秒复检
  _perm99Arm() {
    try { if (this.__perm99ArmT) return; } catch (e) {}
    this.__perm99ArmT = Date.now();
    const t0 = this.__perm99ArmT;
    const sig = () => JSON.stringify(this._perm99St || {});
    let last = sig();
    const tick = async () => {
      if (this.currentView !== 'perm99' || Date.now() - t0 > 120000) { clearInterval(int); return; }
      const st = await this._perm99Status(true);
      const now = sig();
      if (now !== last) { last = now; this._perm99Refresh(true); }
    };
    const int = setInterval(tick, 5000);
  },

  async _perm99Refresh(silent) {
    if (!this._nat99On()) {
      const foot = document.getElementById('perm99foot');
      if (foot && window.__PHONE_EDITION__) foot.textContent = 'ℹ️ 权限检测在手机客户端上进行';
      return;
    }
    const st = await this._perm99Status(true);
    if (!st) {
      if (!silent) this._flash('⚠️ 权限状态检测失败，稍后再试');
      return;
    }
    const appSw = this._perm99AppSwDef();
    this._perm99AppSw = appSw;
    // v12.9.69 全量刷新系统标签 + App内开关状态
    this.PERM99.forEach(p => {
      const card = document.getElementById('perm99card-' + p.k);
      if (!card) return;
      const sysOk = !!st[p.k];
      const on = !!appSw[p.k];
      card.classList.toggle('on', !!(on && sysOk));
      const sw = card.querySelector('.perm99-sw[data-perm="' + p.k + '"]');
      if (sw) { sw.classList.toggle('on', on); sw.classList.remove('wait'); }
      const sys = card.querySelector('.lk99-sys.sys-chip');
      if (sys) { sys.classList.toggle('ok', sysOk); sys.textContent = sysOk ? '系统已授予' : '系统未授予'; }
    });
    // Lookus 分区局部重绘（notifs / location 独有权限）
    if (this._lk99PermsSt && this._lk99RerenderPerm99) this._lk99RerenderPerm99();
    const foot = document.getElementById('perm99foot');
    if (foot) {
      const t = new Date();
      const hh = String(t.getHours()).padStart(2, '0'), mm = String(t.getMinutes()).padStart(2, '0');
      foot.textContent = '最近检测 ' + hh + ':' + mm + ' · 系统权限真值已刷新 · App内开关可随时切换';
    }
    if (!silent) this._flash('✅ 权限状态已刷新');
    this._perm99Arm();
  },

  // ==================== v12.9.46 【一人行攻略】（权限管理页入口 · 数据驱动 · 新功能追加条目即可）====================
  GUIDE99: [
    { g: '🧭 导航与系统', items: [
      { t: '底部导航', d: '习惯 / 记录 / 🧭收展键 / 小家 / 我。单击 🧭 收起导航栏，长按 1 秒进入【独行空间】（液体流动音 + 圆幕过渡）。' },
      { t: '独行空间（权限）', d: '六项系统权限逐卡管理：内容全端展示，手机/平板客户端上点击开关跳转对应系统设置页（返回 App 自动复检），网页端仅展示不执行。全局音效总开关也在这里。' },
      { t: '检查更新', d: '独行空间页内点「检查更新」——有新版会弹更新说明（应用内下载 → 自动弹安装界面），已是最新会直接提示。' },
      { t: '版本到期制', d: '安装包内置有效期（见检查更新提示），到期 App 全屏锁定、装新版自动解锁；临近到期 7 天每天提醒。' },
    ] },
    { g: '🌿 习惯域', items: [
      { t: '像素地图 · 六区域', d: '习惯页顶部的像素世界：生活小镇 / 成长海湾 / 消费都市 / 戒断寺庙 / 数据研究所 / 开发工厂——打卡越多，地图越亮。' },
      { t: '习惯小卡打卡', d: '点击卡片即打卡；喝水 / 运动 / 学习等记录型小卡点开填写数值，消费类花费自动入账【经济数据】。' },
      { t: '补卡与反省', d: '当日漏打卡可补（留痕进【反省数据】），反省书帮你复盘破戒原因。' },
      { t: '戒断数据 · 四魔封印', d: '数据研究所第 10 库：四魔物（淫/娱/惰/贪）在夜空飞行，破戒 +1 活性、当日未破 -1；活性满 5 冲破封印，用战士对决重铸。客户端开启「使用量权限」后四魔自动执法（娱魔盯娱乐 App、惰魔盯全天屏幕）。' },
    ] },
    { g: '💪 成长城', items: [
      { t: '独行信条 · RPG', d: '「我」页进入：像素战士体素 3D 建模，当日打卡 15/30 个发宝石与经验；点击战士挥砍、四魔对决全程配音效。' },
      { t: '小银 · 宠物', d: '宠物页：喂食（宝石购买口粮）成长无降级；点小银有毛线球 / 逗猫棒彩蛋，全程猫咪音效。宝石只消费不产出，来源在独行信条。' },
      { t: '小家', d: '像素房间随真实时间昼夜流转；养花（浇水 1.6× 加速不浇水不枯）、小家商城（壁纸/地板/家具/花盆位）。' },
      { t: '挑战中心', d: '生成健身 / 学习目标卡（🔗 置顶长成长海湾），完成自动结算奖励。' },
    ] },
    { g: '🎓 学习域', items: [
      { t: '格物 · 图书馆', d: '书架收藏 / 阅读进度；门厅进【实时热搜】：文娱（微博 / 抖音 / 知乎 / B站）+ 时政（头条 / 每日要闻 / 人民网）双版，5 分钟缓存自动续热，一键复制标题做选题。' },
      { t: '致知 · 收音机', d: '七大分类台实时 RSS 收听，10 分钟缓存、收听中每分钟续热。' },
      { t: '学习数据', d: '记录站（知识点长成科目知识树 · 图表 · 日历）+ 练习站（分题型刷题 · 错题本 · 正确率）。' },
      { t: '应用数据', d: '数据研究所第 11 库：授权「使用量权限」后可查看手机上所有 App 今日使用时长（抖音 / B站 / 微博…），娱乐类自动标红。' },
    ] },
    { g: '📊 数据研究所', items: [
      { t: '十一库总览（女生十二库）', d: '习惯 / 经济 / 就医 / 运动 / 学习 / 饮食 / 报告 / 反省 / 档案 / 戒断 / 应用——打卡数据去向全部在这汇总；档案性别为「女」时追加【经期数据】库（v12.9.50 女生专属）。' },
      { t: '经济数据', d: '记支出 / 记收入双模式，管家 50/30/20 科学分配可支配收入；消费建议卡每日轮换。' },
      { t: '饮食数据 · 今天吃什么', d: '顶部盲盒：点击开盒（摇晃 → 爆开）随机决定今天吃什么——火锅 / 炒菜 / 港式 / 日式… 18 种像素美食，可重开换一个。' },
      { t: '运动数据', d: '分析站（体测 / 图表 / 日历）+ 教学站（动作动画演示）。' },
      { t: '报告数据', d: '每日图文总结报告，可导出 PNG 分享。' },
    ] },
    { g: '☁️ 账户与数据安全', items: [
      { t: '云账户', d: '登录后云同步全自动：启动恢复 + 落盘节流上传；多设备同步中心可查冲突记录。' },
      { t: '本地数据', d: '主存档 localStorage 加密分域存储；宠物 / 小家数据独立键（重置主存档不影响）。' },
      { t: '联网门禁', d: 'App 规定联网使用：检测到断网全屏锁定，恢复后自动解锁并补拉实时数据。' },
    ] },
    { g: '🔔 v12.9.49 新功能', items: [
      { t: '阿福 · 通知栏推送', d: '独行空间 →「阿福提醒设置」：打卡 / 喝水 / 三餐 / 卫生 / 睡眠 / 囤货临期六类提醒推送到手机下拉通知栏（独立渠道「阿福的提醒」，可在系统设置单独控制铃声震动；定时走系统 AlarmManager，App 被杀也响）。点通知直达对应页面，通知自带「稍后15分钟」。设置与消息中心都在该页，文案可自定义。' },
      { t: '物品使用成本', d: '经济数据 →「物品使用成本」：录入买过的东西（价格 / 日期 / 分类 / 照片或像素图标），按次（总价÷次数）或按天（总价÷天数）两种算法一键切换；点卡片「打卡」记一次使用；统计页看两模式汇总、分类占比、使用最多 / 陪伴最久，支持 CSV 导出。新增 +1 经验，打卡 +1 经验 +1 宝石。' },
      { t: '囤货保质期管理', d: '经济数据 →「囤货保质期」：囤的食物饮品录入到期日或保质期天数，自动判 ✅正常 / ⚠️即将到期 / 🔴临期预警(≤7天) / ❌已过期（最急的排最前）；「消耗」登记扣库存，吃完自动归档；过期自动归档并统计本月食品浪费总额；临期 7 天阿福推系统通知。' },
      { t: '情侣空间 · 封面流', d: '【Ta】主页重做为封面流：中间卡片最大、两侧立体翘起，左右滑动有透视景深；点侧卡居中、点中卡进入。新增：AI 约会邀请（生成浪漫文案，Ta 回应「必须答应！/ 等你好久了 / 让我先看看时间」）、情侣农场（双方各浇一次水算一天，收获双份奖励）、共同目标（双方共更进度，完成解锁徽章）、回忆相册（照片时间线）、双人足迹、专属装扮（甜蜜值解锁皮肤）。' },
    ] },
  ],
  render_guide99() {
    const v = document.getElementById('view-guide99');
    if (!v) return;
    const secs = this.GUIDE99.map((sec, si) => `
      <div class="guide99-sec">
        <div class="guide99-sec-hd">
          <span class="guide99-sec-ico">${sec.g.slice(0, 2)}</span>
          <span class="guide99-sec-t">${this.esc(sec.g.slice(2).trim())}</span>
          <span class="guide99-sec-n">${sec.items.length} 条</span>
        </div>
        ${sec.items.map(it => `
          <div class="guide99-item">
            <div class="guide99-item-t">${this.esc(it.t)}</div>
            <div class="guide99-item-d">${this.esc(it.d)}</div>
          </div>`).join('')}
      </div>`).join('');
    v.innerHTML = `
      <div class="perm99-wrap guide99-wrap">
        <div class="perm99-head">
          <button class="btn btn-ghost btn-sm" onclick="App.navBack()">← 返回</button>
          <div class="perm99-title">📖 一人行攻略</div>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('perm99')">🛡️ 权限</button>
        </div>
        <div class="perm99-sub">各功能与后续新功能的使用方法 · 随版本更新持续补充</div>
        <div class="perm99-banner">🗂️ 共 ${this.GUIDE99.reduce((s, x) => s + x.items.length, 0)} 条攻略 · 按功能分区检索</div>
        ${secs}
        <div class="perm99-foot">攻略随版本迭代持续更新 · 有看不懂的功能就来这里查</div>
      </div>`;
  },
});

// 模块加载即接线（_modal/_flash 在更早的文件里已定义，此处包装对后续所有调用生效）
App._sfx99Init();

// 从系统设置返回 App → 权限页自动复检刷新
// v12.9.49 根因修复：App 是顶层 const（未挂到 window）——旧监听器判 window.App 永远为 undefined，
//   从系统设置返回后的自动复检从未执行过（这正是「授权后开关不自动打开」的主因）。改判 App 本体。
//   多路复检：① visibilitychange 即时；② window focus（部分 ROM 从设置页返回不触发
//   visibilitychange 但触发 focus）；③ 返回后 1.2s / 3.5s 两次延迟补检（权限状态回传慢的 ROM
//   也能点亮开关）；④ 跳转后 _perm99Arm() 的 120 秒巡检兜底。同一时刻只有权限页在屏才动。
// v12.9.73 【P2-6】事件合并去重：同 delay 只保留 1 个 timer（visibilitychange + focus 连发
//   不再重复排程）；真正挡住多路并发打原生插件的是 _perm99Status 的在途合并 + 500ms 节流。
(function () {
  const pend = {};
  const recheck = (delay) => {
    if (pend[delay] != null) return;
    pend[delay] = setTimeout(() => {
      pend[delay] = null;
      try {
        if (document.visibilityState !== 'visible') return;
        if (typeof App !== 'undefined' && App.currentView === 'perm99') App._perm99Refresh(true);
      } catch (e) {}
    }, delay);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { recheck(0); recheck(1200); recheck(3500); }
  });
  window.addEventListener('focus', () => { recheck(200); recheck(2500); });
  window.addEventListener('pageshow', (e) => { if (e && e.persisted) { recheck(300); recheck(2000); } });
  // v12.9.73 【P1 崩溃日志征询】：启动 2.5s 后巡检本地崩溃日志（有则弹窗征询是否上传——
  //   用户明确同意才走云账户上传，未登录降级复制；绝不静默上传）
  setTimeout(() => { try { App._crash99Boot(); } catch (e) {} }, 2500);
})();
