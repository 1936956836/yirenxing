// 主应用逻辑 - 视图渲染与交互
// [功能组] G1-系统内核（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
const App = {
  currentView: 'dashboard',
  init() {
    this.applyStoredTheme();
    this.applyStoredPalette();           // 个性化主题色
    this._applyTimeTheme();              // v2.0.8：七时段主题（黎明/早晨/正午/午后/黄昏/暮色/深夜）
    if (!this._tthemeTimer) {            // 每分钟检查一次是否跨时段（凌晨/整点自动换色）
      this._tthemeTimer = setInterval(() => this._applyTimeTheme(), 60000);
    }
    this.bindNav();
    this.bindGlobalEvents();
    // v12.7：顶边栏已删除（时间功能随 topbar 一并移除）；dock 收纳状态还原
    try {
      if (localStorage.getItem('dock99_collapsed') === '1') {
        document.getElementById('dock99').classList.add('collapsed');
      }
    } catch(e){}
    // P6：默认视图同步切回 dashboard
    this.navigate('dashboard');
    // v2026.0906-8 存储写入失败告警钩子：Store.save 三级瘦身仍失败时（配额爆/隐私模式禁写），
    // 自动下载内存中最新完整数据兜底 + 弹一次告警（storage 层不依赖 DOM，经此钩子解耦）
    Store._onWriteFail = (level, fullData) => this._storeWriteFailAlarm(level, fullData);
    // 启动后台任务：每周自动快照、连续打卡奖励结算、睡眠提醒
    try {
      Store.archiveH99OldDays();               // 数据安全：>180 天旧明细压缩冷存（连击语义保留）
      Store.autoWeeklySnapshot();
      // v3.4：货币通道收紧（原银行「积分→钻石」兑换通道已删除）
      this.checkStreakBonusOnLoad();
      this.startReminderLoop();
      this.checkBackupReminder();
      this.checkAfuInsights();               // 阿福主动洞察：异常模式预警卡
      this._afu99StartWatch && this._afu99StartWatch();  // v11.1 阿福夜巡：00:00–05:00 使用监测（熬夜/通宵判定）
      // v12.9.40 戒断数据结算：周一 0 点（首启后每周）四魔物活性 0 → +5 宝石/只；
      //   日结算惰魔（前一日无运动/学习 → 活性 +1）与贪魔（前一日花销 > 200 → 活性 +1），首启不追溯
      this._quit99Settle && this._quit99Settle();
      this._quit99Daily && this._quit99Daily();
    } catch(e) { console.warn('startup tasks failed', e); }
    // v11.4 云账户：恢复已保存的 Supabase 项目连接与登录会话（未配置/离线时静默跳过）
    try { if (this.cloud99Init) this.cloud99Init(); } catch(e) {}
    // v12.9.21 数据总线日志：记录最近 6 次域变更（跨域统计与牵连排查用；v12.9.31 数据中心·共享中枢卡已删除，引擎保留）
    try {
      this._busLog = [];
      if (Store.bus) Store.bus.on('*', (p) => {
        const t = new Date();
        const hh = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + ':' + String(t.getSeconds()).padStart(2, '0');
        (p.domains || []).forEach(dm => {
          if (Store.DOMAIN_GROUPS && Store.DOMAIN_GROUPS[dm]) {
            this._busLog.unshift({ t: hh, dm, g: Store.DOMAIN_GROUPS[dm] });
          }
        });
        if (this._busLog.length > 6) this._busLog.length = 6;
      });
    } catch(e) {}
    // 新手引导首次弹出（v12.9.20：未登录时入队，登录解锁后放出）
    try {
      const seen = localStorage.getItem('onboarded');
      if (!seen) {
        setTimeout(() => { try { this._c99GateDefer ? this._c99GateDefer(() => this.showOnboarding()) : this.showOnboarding(); } catch(e){} }, 600);
      }
    } catch(e){}
    // v12.9.38 版本更新推送（单一来源 js/version.js · 每版仅一次）：管家阿福弹本版更新说明
    //   新用户走 onboarding 不叠加；登录门禁在场时等解锁后再弹（_c99GateDefer）
    try {
      const V = window.__APP_VER__ || null;
      if (V && V.v && V.changes && V.changes.length) {
        const wk = 'app_ver_seen_' + V.v;
        if (!localStorage.getItem(wk) && localStorage.getItem('onboarded')) {
          setTimeout(() => { try { this._c99GateDefer ? this._c99GateDefer(() => this.showVersionWelcome()) : this.showVersionWelcome(); } catch(e){} }, 2700); // 等 2s 开屏动画结束后再弹
          localStorage.setItem(wk, '1');
        }
      }
    } catch(e){}
    // 每日阿福晨报（首次访问 / 切换日期时弹 · v12.9.23）——延迟 2.8s 等开屏动画播完再出
    try {
      const lastGreet = localStorage.getItem('last_greet_date');
      const today = Store.today();
      if (lastGreet !== today) {
        setTimeout(() => { try { this._c99GateDefer ? this._c99GateDefer(() => this.showDailyGreeting()) : this.showDailyGreeting(); } catch(e){} }, 2800);
        localStorage.setItem('last_greet_date', today);
      }
    } catch(e){}
    // P8：「今日需要做的事」提示卡 —— v2.0.4 彻底关闭自动弹（修复手机端"一打开就弹窗、点关闭还关不掉"）
    //     用户若想看清单，随时通过顶栏「🌈 今日待办」手动按钮打开；
    //     顶栏按钮颜色仍按 dismiss / skip 同步（点击后当日不再灰/红的交互保留）
    //     参考：showDailyTodoPrompt 弹窗内容不涉及迁徙，但曾因 DOM 层级与 wild-overlay 叠加导致"点击关闭无反应"，
    //           所以此处直接把自动弹注释掉，杜绝一切"App 一打开就有任何弹窗"。
    try {
      const today2 = Store.today();
      const dismissKey = `todo_dismiss_${today2}`;
      const skipKey    = `todo_skip_${today2}`;
      const dismiss   = localStorage.getItem(dismissKey);
      const skip      = localStorage.getItem(skipKey);
      // 顶栏按钮颜色同步
      try {
        const btn = document.getElementById('todoPromptBtn');
        if (btn) {
          btn.classList.remove('muted','skip');
          if (skip) btn.classList.add('skip');
          else if (dismiss) btn.classList.add('muted');
        }
      } catch(_){}
    } catch(e){}
    // Step3 打卡按钮倒计时 & 状态每秒刷新（北京时间开窗/关窗）
    if (!window.__punchTick) {
      window.__punchTick = setInterval(() => { try { App._tickPunchButtons(); } catch(_){} }, 1000);
    }
    // v12.9.40 联网门禁：App 规定联网使用——检测到未联网立即全屏锁定，恢复后自动解锁
    try { this._net99Init(); } catch (e) {}
    // v12.9.44 到期锁：安装包直发模式（不走线上更新源）——版本到期全屏锁定，装新版自动解锁
    // v12.9.59 客户端判定改用 Capacitor 官方 isNativePlatform（_nat99On，95-native99.js）：
    //   旧自造插件存在性判定 + 使用统计懒结算 + 权限弹窗 + 桥事件监听已随自造插件体系全部移除
    try {
      if (this._nat99On && this._nat99On()) {
        try { this._nat99ExpiryLock(); } catch (e) {}
        if (!window.__nat99ExpTick) {
          window.__nat99ExpTick = setInterval(() => { try { App._nat99ExpiryLock && App._nat99ExpiryLock(); } catch(_){} }, 60000);
        }
        // v12.9.55→59 版本更新检测：启动立刻请求云端版本 json（镜像链逐源回退）；网络异常只给
        //   友好提示，绝不弹调试报错弹窗（更新链详见 95-native99.js _apk99Check）
        try { this._apk99Check(); } catch (e) {}
        // v12.9.45b 更新检查补强：Android 从后台恢复 App 不会重跑 init()——visibilitychange
        //   回前台立即复查（版本锁幂等防重复，无需节流）
        if (!window.__apk99Vis) {
          window.__apk99Vis = true;
          document.addEventListener('visibilitychange', () => {
            try {
              if (document.visibilityState !== 'visible') return;
              if (!App._nat99On || !App._nat99On()) return;
              App._apk99Check();
            } catch (e) {}
          });
        }
      }
    } catch (e) {}
  },

  // ===== v12.9.40 联网门禁（未联网禁止使用）：navigator.onLine + 双端点探测兜底 =====
  //   · offline 事件 → 立即锁定；online 事件 → 立即复检
  //   · 每 30s 静默探测（navigator.onLine 会「假在线」：WiFi 已连但外网不通），连续 2 次失败 → 锁定
  //   · 锁定为不可关闭的全屏遮罩（z-index 最高），恢复联网自动解除并补拉实时数据
  _net99Fail: 0,
  _net99Locked: false,
  _net99Cd: null,
  _net99Init() {
    try {
      window.addEventListener('offline', () => { this._net99Fail = 99; this._net99Lock(); });
      window.addEventListener('online', () => this._net99Check(true));
      // 启动即检：离线直接锁（在线则交给 30s 心跳接管）
      if (navigator.onLine === false) { this._net99Fail = 99; this._net99Lock(); }
      if (!this._net99Timer) {
        this._net99Timer = setInterval(() => { try { this._net99Check(false); } catch (e) {} }, 30000);
      }
    } catch (e) {}
  },
  // 连通性探测：任一端点 fetch 成功即在线（no-cors 请求网络层可达就会 resolve）
  async _net99Ping() {
    const eps = ['https://www.baidu.com/favicon.ico', 'https://www.qq.com/favicon.ico'];
    for (const ep of eps) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 4500);
        await fetch(ep + '?net99=' + Date.now(), { signal: ctrl.signal, cache: 'no-store', mode: 'no-cors' });
        clearTimeout(timer);
        return true;
      } catch (e) {}
    }
    return false;
  },
  async _net99Check(fromEvt) {
    try {
      // 浏览器明确报离线（事件触发）→ 直接锁，不再探测
      if (fromEvt && navigator.onLine === false) { this._net99Fail = 99; this._net99Lock(); return; }
      const ok = await this._net99Ping();
      this._net99Fail = ok ? 0 : (this._net99Fail + 1);
      if (ok) {
        if (this._net99Locked) this._net99Unlock();
      } else if (this._net99Fail >= 2) {
        this._net99Lock();
      }
    } catch (e) {}
  },
  _net99Lock() {
    if (this._net99Locked) return;
    this._net99Locked = true;
    try { this.home99RadioStop && this.home99RadioStop(true); this._zz99StopSpeak && this._zz99StopSpeak(); } catch (e) {}
    let ov = document.getElementById('net99-lock');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'net99-lock';
      ov.innerHTML = `
        <div class="net99-box">
          <div class="net99-ico">📡</div>
          <div class="net99-t">网络已断开</div>
          <div class="net99-d">一人行需要<b>联网</b>使用——检测到当前设备未联网，App 已锁定。<br>请检查网络连接（WiFi / 移动数据）后重试。</div>
          <div class="net99-cd" id="net99Cd">…</div>
          <button class="net99-btn" onclick="App._net99Retry()">🔄 立即重试</button>
          <div class="net99-tip">每 30 秒自动重试 · 恢复联网后自动解锁（本地数据不会丢失）</div>
        </div>`;
      document.body.appendChild(ov);
    }
    ov.style.display = 'flex';
    try { this._flash('📡 网络已断开——请恢复联网后继续使用'); } catch (e) {}
    // 自动重试倒计时（20s）
    this._net99CdTick(20);
  },
  _net99CdTick(n) {
    try { clearInterval(this._net99Cd); } catch (e) {}
    let left = n;
    const el = () => document.getElementById('net99Cd');
    const upd = () => { const e = el(); if (e) e.textContent = `${left} 秒后自动重试…`; };
    upd();
    this._net99Cd = setInterval(() => {
      left--;
      if (left <= 0) {
        try { clearInterval(this._net99Cd); } catch (e) {}
        const e = el(); if (e) e.textContent = '正在重试…';
        this._net99Check(true);
        if (this._net99Locked) this._net99CdTick(20);
      } else upd();
    }, 1000);
  },
  _net99Retry() {
    const e = document.getElementById('net99Cd');
    if (e) e.textContent = '正在重试…';
    this._net99Check(true).then(() => {
      if (this._net99Locked) { this._flash('❌ 仍然离线——请先恢复网络连接'); this._net99CdTick(20); }
    });
  },
  _net99Unlock() {
    if (!this._net99Locked) return;
    this._net99Locked = false;
    this._net99Fail = 0;
    try { clearInterval(this._net99Cd); } catch (e) {}
    const ov = document.getElementById('net99-lock');
    if (ov) ov.style.display = 'none';
    try { this._flash('✅ 网络已恢复，欢迎回来'); } catch (e) {}
    // 恢复后补拉实时数据（新闻/天气）
    try { if (this._zz99On) this._zz99LiveRefresh(this._zz99On, true); } catch (e) {}
    try { if (this.loadWeather) this.loadWeather().catch(() => {}); } catch (e) {}
  },
  applyStoredPalette() {
    let pid = 'teal';
    try { pid = localStorage.getItem('app_palette') || 'teal'; } catch(e){}
    this._palette = pid;
    const p = (CONFIG.themes || []).find(t => t.id === pid);
    if (!p) return;
    const root = document.documentElement;
    root.style.setProperty('--primary', p.primary);
    root.style.setProperty('--primary-dark', p.primaryDark);
    root.style.setProperty('--accent', p.accent);
  },
  setPalette(pid) {
    try { localStorage.setItem('app_palette', pid); } catch(e){}
    this.applyStoredPalette();
    this._flash('🎨 主题色已切换');
  },
  // ===== 深色模式（f2；v12.9.20 入口迁至设置页，旧顶栏/侧栏按钮已删）=====
  applyStoredTheme() {
    let theme = 'light';
    try { theme = localStorage.getItem('app_theme') || 'light'; } catch(e){}
    try { document.documentElement.setAttribute('data-theme', theme); } catch(e){}
    this._theme = theme;
  },
  toggleTheme() {
    const next = this._theme === 'dark' ? 'light' : 'dark';
    try { document.documentElement.setAttribute('data-theme', next); localStorage.setItem('app_theme', next); } catch(e){}
    this._theme = next;
  },
  // ===== 内部通用 Flash 提示（替代 alert 友好提示；v2.3.0 长文案自适应） =====
  _flash(msg) {
    let el = document.getElementById('__appFlash');
    if (!el) {
      el = document.createElement('div');
      el.id = '__appFlash';
      el.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:rgba(15,118,110,0.95);color:#fff;padding:10px 18px;border-radius:16px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);opacity:0;transition:opacity 0.25s;pointer-events:none;max-width:86vw;line-height:1.6;text-align:center;white-space:normal;box-sizing:border-box;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(this._flashT);
    // 管家点评等长文案按长度延长停留时间（2.2s ~ 6s）
    const dur = Math.min(6000, 2200 + String(msg).length * 55);
    this._flashT = setTimeout(() => { el.style.opacity = '0'; }, dur);
  },
  // ===== 新手 3 步引导（首次访问弹模态） =====
  showOnboarding() {
    if (document.getElementById('onboardModal')) return;
    const steps = CONFIG.onboarding || [];
    let idx = 0;
    const modal = document.createElement('div');
    modal.id = 'onboardModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:16px;max-width:380px;width:100%;padding:24px 22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,0.25);';
    modal.appendChild(card);
    document.body.appendChild(modal);
    const render = () => {
      const s = steps[idx];
      card.innerHTML = `
        <div style="font-size:48px;margin-bottom:14px">${s.icon}</div>
        <h3 style="margin:0 0 10px;font-size:18px;color:#047857">${s.title}</h3>
        <p style="margin:0 0 18px;font-size:14px;color:#475569;line-height:1.65">${s.desc}</p>
        <div style="display:flex;gap:6px;justify-content:center;margin-bottom:18px">
          ${steps.map((_, i) => `<span style="width:${i===idx?24:8}px;height:8px;border-radius:4px;background:${i===idx?'#059669':'#cbd5e1'};transition:all 0.2s"></span>`).join('')}
        </div>
        <div style="display:flex;gap:10px;justify-content:center">
          ${idx > 0 ? '<button id="obPrev" style="padding:8px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;font-size:13px;cursor:pointer">上一步</button>' : ''}
          <button id="obNext" style="padding:8px 18px;background:#059669;color:#fff;border:0;border-radius:8px;font-size:13px;cursor:pointer">${idx === steps.length-1 ? '开始使用 ✨' : '下一步'}</button>
        </div>
        <button id="obSkip" style="margin-top:14px;background:none;border:0;color:#94a3b8;font-size:12px;cursor:pointer">跳过引导</button>
      `;
      document.getElementById('obNext').onclick = () => {
        if (idx < steps.length - 1) { idx++; render(); }
        else { close(); }
      };
      const prev = document.getElementById('obPrev');
      if (prev) prev.onclick = () => { idx--; render(); };
      document.getElementById('obSkip').onclick = close;
    };
    const close = () => {
      try { localStorage.setItem('onboarded', '1'); } catch(e){}
      modal.remove();
    };
    render();
  },
  // ===== v12.9.38 版本更新说明（数据驱动：js/version.js → 阿福推送 · 每版一次）=====
  //   分类徽章：新增=绿 / 修复=橙 / 优化=蓝 / 移除=灰；changes 由 version.js 单一来源维护
  showVersionWelcome() {
    const V = window.__APP_VER__ || { v: '?', date: '', changes: [] };
    const CAT = {
      '新增': { bg: '#ecfdf5', bd: '#a7f3d0', fg: '#047857' },
      '修复': { bg: '#fff7ed', bd: '#fed7aa', fg: '#c2410c' },
      '优化': { bg: '#eff6ff', bd: '#bfdbfe', fg: '#1d4ed8' },
      '移除': { bg: '#f8fafc', bd: '#e2e8f0', fg: '#64748b' },
    };
    const items = (V.changes || []).map(s => {
      const c = CAT[s.cat] || CAT['优化'];
      return `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:linear-gradient(135deg,#f8fbf9,#f6faf8);border:1px solid #e2e8f0;border-radius:10px">
          <div style="font-size:22px;line-height:1.2">${s.ico || '✨'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:3px">
              <span style="display:inline-block;font-size:10.5px;font-weight:800;color:${c.fg};background:${c.bg};border:1px solid ${c.bd};border-radius:5px;padding:1px 6px;margin-right:6px;vertical-align:1px">${s.cat}</span>${s.t}
            </div>
            <div style="font-size:12.5px;color:#475569;line-height:1.65">${s.d}</div>
          </div>
        </div>`;
    }).join('');
    const body = `
      <div style="font-size:12.5px;color:#475569;line-height:1.75;margin-bottom:12px">
        亲爱的用户，「一人行」<b style="color:#059669">v${this.esc(V.v)}</b>${V.date ? '（' + this.esc(V.date) + '）' : ''}已就绪——本次更新内容如下，由你的管家阿福为你送达 🤵
      </div>
      <div style="display:flex;flex-direction:column;gap:9px;max-height:52vh;overflow:auto;padding-right:2px">${items}</div>
      <div style="margin-top:12px;padding:9px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;font-size:12px;color:#065f46;line-height:1.7">
        🍀 每次版本更新，阿福都会在启动时推送更新说明（每版仅一次）；想随时找他，首页右上圆形入口。
      </div>`;
    this._modal(`🤵 一人行 v${V.v} · 更新说明`, body);
  },
  // ===== 每日开场问候 → v12.9.23 升格为「阿福晨报」（见 79-afu-record.js showAfuMorningBrief）=====
  //   每天 0 点后首次打开：阿福主动说一段——今日天气 + 待办要点 + 昨日完成度 + 一句健康提醒
  showDailyGreeting() { try { return this.showAfuMorningBrief(); } catch(e){} },
  // P7/P8：「今日需要做的事」提示卡（默认只自动弹 1 次/日；用户关闭/前往/跳过 今日不再自动弹，0 点重置）
  //     交互：未完成默认显示前 6 条；「展开全部」看更多；已完成另成小节，灰打钩；含「今日暂不提醒」按钮
  showDailyTodoPrompt(opts) {
    opts = opts || {};
    const today = Store.today();
    const dismissKey = `todo_dismiss_${today}`;
    const skipKey    = `todo_skip_${today}`;
    if (!opts.forceOpen && document.getElementById('dailyTodoPrompt')) return;
    if (!opts.forceOpen && localStorage.getItem(skipKey) === '1') {
      this._flash('⏸️ 今日已设置「暂不提醒」；点顶栏「🌈今日待办」可随时打开清单。');
      return;
    }
    const markDismiss = (reason) => {
      try {
        localStorage.setItem(dismissKey, reason || 'dismiss');
        const btn = document.getElementById('todoPromptBtn');
        if (btn) { btn.classList.remove('skip'); btn.classList.add('muted'); }
        if (typeof App !== 'undefined' && App.render_dashboard) App.render_dashboard();
      } catch(_){}
    };
    const markSkipToday = () => {
      try {
        localStorage.setItem(skipKey, '1');
        localStorage.setItem(dismissKey, 'skip');
        const btn = document.getElementById('todoPromptBtn');
        if (btn) { btn.classList.remove('muted'); btn.classList.add('skip'); }
        if (typeof App !== 'undefined' && App.render_dashboard) App.render_dashboard();
        this._flash('⏸️ 今天不打算做全部 — 今日不再自动弹（顶栏按钮仍可手动打开），0 点后恢复');
      } catch(_){}
    };
    const rec = this.todayRec();
    const achList = CONFIG.achievements || [];
    const groups = CONFIG.coins.rewardGroups || [];
    const h = new Date().getHours();
    const groupRows = groups.map(g => {
      const ids = g.items || [];
      const done = ids.filter(id => this._achDone(id, rec)).length;
      const total = ids.length;
      return { ico: g.icon, name: g.name, done, total, ids };
    });
    const totalAch = achList.length;
    const doneAch = achList.filter(a => this._achDone(a.id, rec)).length;
    const lifeDone = doneAch === totalAch;
    const W = CONFIG.workbench || {};
    const ledgerR = Store.checkTodayLedgerReward ? Store.checkTodayLedgerReward(false) : {ready:false, already:false, count:0, charCount:0};
    const diaryR  = Store.checkTodayDiaryReward  ? Store.checkTodayDiaryReward(false)  : {ready:false, already:false, count:0, charCount:0};
    const memoryR = Store.checkTodayMemoryReward ? Store.checkTodayMemoryReward(false) : {ready:false, already:false};
    const wb = Store.getWorkbench ? Store.getWorkbench() : {};
    // v2026.0906 修复：readTodayMinutes 为旧字段（无任何写入方），改读 workbench.read.totalMs
    const read = (wb && wb.read) || {};
    const readIsToday = read.date === (Store.todayBJ ? Store.todayBJ() : Store.today());
    const todayMin = readIsToday ? Math.floor((read.totalMs || 0) / 60000) : 0;
    const readTarget = 15;
    const readDone = todayMin >= readTarget;
    const subjNames = { english:'🇬🇧 英语', politics:'🏛️ 政治', math:'📐 高数', cs:'💻 计算机' };
    const subjRows = [];
    try {
      // v12.9.3：四科刷题进度改读【练习站】刷题流水（quiz99）；格物小测仅剩通识四科
      const qz = Store.getQuiz99 ? Store.getQuiz99() : { logs: [] };
      const qToday = Store.todayBJ ? Store.todayBJ() : Store.today();
      Object.keys(subjNames).forEach(code => {
        const ls = qz.logs.filter(l => l.date === qToday && l.sub === code);
        const n = ls.length;
        const right = ls.filter(l => l.ok).length;
        const t = 10; // 每科每日目标 10 题
        subjRows.push({ code, name: subjNames[code], done: n, total: t, finished: n >= t, right, wrong: n - right });
      });
    } catch(_){}
    const subjAll = subjRows.every(s => s.finished);
    const streak = Store.calcStreak();
    const PENDING = [], DONE = [];
    const push = (o) => {
      if (o.done) DONE.push(o); else PENDING.push(o);
    };
    // 6 大生活板块：每组一条「完成度」
    groupRows.forEach(g => {
      const ok = g.done === g.total;
      push({ tag: g.ico + ' ' + g.name,
             text: ok ? `已全部完成 ✅` : `还剩 ${g.total - g.done}/${g.total} 项未完成（前往首页打卡）`,
             go:`App.navigate('dashboard')`, done: ok });
    });
    // 记录板块 4 项（经济/日记/记忆/阅读）
    push({ tag:'💰 经济数据',
           text: (ledgerR.ready || ledgerR.already) ? `今日已记 ${ledgerR.count||0} 条 ✅` : `今日 ${ledgerR.count||0} 条，还差 ${Math.max(0,(W.ledgerMinCount||2)-(ledgerR.count||0))} 条达标`,
           go:`App.navigate('workbench')`, done: !!(ledgerR.ready || ledgerR.already) });
    push({ tag:'📔 博客',
           text: (diaryR.ready || diaryR.already) ? `累计字数已达标 ${diaryR.charCount||0} ✅` : `累计字数还差 ${Math.max(0,(W.diaryMinChars||100)-(diaryR.charCount||0))} 字达标`,
           go:`App.navigate('workbench')`, done: !!(diaryR.ready || diaryR.already) });
    push({ tag:'🧠 记忆',
           text: memoryR.ready || memoryR.already ? `新学+复习已完成 ✅` : `新学/艾宾浩斯到期复习尚未完成`,
           go:`App.gotoWb('memory')`, done: !!(memoryR.ready || memoryR.already) });
    push({ tag:'📖 阅读',
           text: readDone ? `已达标 ${todayMin}/${readTarget} 分钟 ✅` : `今日阅读 ${todayMin} / ${readTarget} 分钟`,
           go:`App.gotoWb('read_en')`, done: readDone });
    // 4 科刷题（练习站）
    subjRows.forEach(s => {
      push({ tag: s.name + ' 刷题',
             text: s.finished ? `今日目标 ${s.total} 题已刷完 ✅（对${s.right}/错${s.wrong}）` : `今日已刷 ${s.done}/${s.total} 题 · 对 ${s.right} / 错 ${s.wrong}`,
             go:`App.st99PZGo('${s.code}')`, done: !!s.finished });
    });
    const totalTodos = PENDING.length;
    const pct = totalAch > 0 ? Math.round(doneAch/totalAch*100) : 0;
    const COLLAPSE = 6;
    const visible = PENDING.slice(0, COLLAPSE);
    const hidden  = PENDING.slice(COLLAPSE);
    const skipSet = (localStorage.getItem(skipKey) === '1');
    const renderRow = (t, opts2) => {
      opts2 = opts2 || {};
      const done = !!t.done;
      const border = opts2.last !== true ? 'border-bottom:1px dashed var(--border);padding-bottom:10px;margin-bottom:10px' : '';
      return `<div class="log-row ${done?'log-row-done':''}" style="${border}">
          <div class="log-ico">${done?'✅':opts2.forceIco||'📌'}</div>
          <div class="log-body">
            <div style="font-weight:800;color:#0f172a;${done?'opacity:.65;text-decoration:line-through;':''}">${this.esc(t.tag)}</div>
            <div style="font-size:12px;color:#475569;${done?'opacity:.7;':''}">${this.esc(t.text)}</div>
          </div>
          ${done?'':`<button class="btn btn-sm btn-primary" onclick="document.getElementById('dailyTodoPrompt')&&document.getElementById('dailyTodoPrompt').remove();try{${t.go};}catch(_){}try{App._todoMarkDismiss('go');}catch(_){}">前往</button>`}
        </div>`;
    };
    const pendingHtml = PENDING.length === 0
      ? `<div class="card" style="background:linear-gradient(135deg,#ecfeff,#f0fdf4);border:1px solid #86efac"><div class="card-title"><span class="ico">🎉</span>今日待办全部完成</div><div style="font-size:13px;color:#0f172a;line-height:1.7">✅ 6 大生活板块已全部打卡；记录板块的经济/日记/记忆/阅读全完成；练习站四科各 10 题刷完。你今天超棒！</div></div>`
      : `<div id="todoTipList">
          ${visible.map((t,i)=>renderRow(t,{last: (i===visible.length-1) && hidden.length===0})).join('')}
          ${hidden.length>0?`<div id="todoTipMoreWrap" style="${border? '' : ''}">
            <details style="margin-top:8px">
              <summary style="cursor:pointer;font-size:12px;font-weight:700;color:#4338ca;padding:4px 8px;border-radius:8px;background:#eef2ff;border:1px solid #c7d2fe;display:inline-block">展开另外 ${hidden.length} 条 ▾</summary>
              <div style="margin-top:8px">${hidden.map((t,i)=>renderRow(t,{last: i===hidden.length-1})).join('')}</div>
            </details>
          </div>`:''}
        </div>`;
    const doneHtml = DONE.length === 0
      ? ''
      : `<details style="margin-top:10px">
           <summary style="cursor:pointer;font-size:12px;font-weight:700;color:#166534;padding:4px 8px;border-radius:8px;background:#dcfce7;border:1px solid #86efac;display:inline-block">
             已完成 ${DONE.length} 项（灰打钩，点击展开）
           </summary>
           <div style="margin-top:8px">${DONE.map((t,i)=>renderRow(t,{last:i===DONE.length-1,forceIco:'✅'})).join('')}</div>
         </details>`;
    const html = `
      <div class="todo-prompt-card" onclick="event.stopPropagation()">
        <div class="todo-prompt-head">
          <div>
            <div style="font-size:17px;font-weight:900;color:#0f172a">🌈 今日需要做的事${opts.fromAuto?' <span class="chip chip-gray" style="margin-left:6px">首次打开 / 0 点前仅自动弹 1 次</span>':''}</div>
            <div style="font-size:12px;color:#64748b;margin-top:3px">${today} · 6 大生活 + 记录 4 项 + 4 科题库（默认只展开前 6 条未完成）</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${skipSet ? `<span class="chip chip-red">⏸️ 今日已设置「暂不提醒」</span>` : `<button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5" onclick="App._todoMarkSkipToday(); document.getElementById('dailyTodoPrompt')&&document.getElementById('dailyTodoPrompt').remove();">⏸️ 今天不打算做全部</button>`}
            <button class="btn btn-sm btn-ghost" onclick="document.getElementById('dailyTodoPrompt').remove(); try{App._todoMarkDismiss('close');}catch(_){}">✕ 关闭</button>
          </div>
        </div>
        <div class="todo-prompt-overview">
          <div class="tp-stat"><div class="tp-n">${doneAch}<span>/${totalAch}</span></div><div class="tp-l">生活打卡完成</div></div>
          <div class="tp-stat"><div class="tp-n" style="color:#16a34a">${pct}%</div><div class="tp-l">总体完成度</div></div>
          <div class="tp-stat"><div class="tp-n" style="color:#ca8a04">${totalTodos}</div><div class="tp-l">今日待办</div></div>
          <div class="tp-stat"><div class="tp-n" style="color:#047857">🌳${streak}</div><div class="tp-l">连续达标</div></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:4px">
          ${groupRows.map(g=>`<div class="tp-mini ${g.done===g.total?'done':''}"><div class="tp-mini-n">${g.ico} ${this.esc(g.name)}</div><div class="tp-mini-p">${g.done}/${g.total}</div></div>`).join('')}
        </div>
        <div style="margin-top:10px">
          <div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:8px">📋 未完成清单${PENDING.length>COLLAPSE?`（默认前 ${COLLAPSE} 条）`:''}</div>
          <div style="max-height:55vh;overflow:auto;padding-right:4px">${pendingHtml}${doneHtml}</div>
        </div>
        <div style="margin-top:10px;display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;font-size:12px;color:#475569;border-top:1px dashed var(--border);padding-top:8px">
          <div>${h<6 || h>=23 ? '😴 现在应优先睡觉' : (h<11?'🌅 晨间打卡优先' : (h<14?'☀️ 记得吃饭+午睡':'🌇 把今日记录好，不要留到明天'))}</div>
        </div>
      </div>
    `;
    let overlay = document.getElementById('dailyTodoPrompt');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.id = 'dailyTodoPrompt';
    overlay.onclick = () => { overlay.remove(); try{App._todoMarkDismiss('mask');}catch(_){} };
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:14px;padding-top:60px;overflow:auto;';
    overlay.innerHTML = `<div style="width:100%;max-width:720px">${html}</div>`;
    (document.body || document.documentElement).appendChild(overlay);
  },
  _todoMarkDismiss(reason) {
    const today = Store.today();
    try {
      localStorage.setItem(`todo_dismiss_${today}`, (reason||'dismiss') + '@' + Date.now());
      const btn = document.getElementById('todoPromptBtn');
      if (btn && localStorage.getItem(`todo_skip_${today}`) !== '1') {
        btn.classList.remove('skip'); btn.classList.add('muted');
      }
      if (typeof App !== 'undefined' && App.render_dashboard) App.render_dashboard();
    } catch(_){}
  },
  _todoMarkSkipToday() {
    const today = Store.today();
    try {
      localStorage.setItem(`todo_skip_${today}`, '1');
      localStorage.setItem(`todo_dismiss_${today}`, 'skip@' + Date.now());
      const btn = document.getElementById('todoPromptBtn');
      if (btn) { btn.classList.remove('muted'); btn.classList.add('skip'); }
      if (typeof App !== 'undefined' && App.render_dashboard) App.render_dashboard();
      this._flash('⏸️ 今天不打算做全部 — 今日不再自动弹（顶栏「🌈今日待办」仍可随时打开清单），0 点后恢复');
    } catch(_){}
  },
  // ===== 连续打卡阶梯提示：到达阶梯时一次性庆祝（不可重复）=====
  // v3.5：原积分/勋章/荣誉发放已随旧货币体系移除，改为纯庆祝提示
  checkStreakBonusOnLoad() {
    const streak = Store.calcStreak();
    const lastGranted = Store.getSetting('last_streak_bonus', 0);
    const bonuses = (CONFIG.streakBonuses || []).filter(b => streak >= b.days && b.days > lastGranted);
    if (bonuses.length === 0) return;
    bonuses.sort((a, b) => a.days - b.days);
    const lastLevel = bonuses[bonuses.length - 1].days;
    Store.setSetting('last_streak_bonus', lastLevel);
    const top = bonuses[bonuses.length - 1];
    setTimeout(() => {
      this._flash(`${top.icon} 连续达标 ${top.days} 天！获得「${top.title}」称号，继续保持！`);
    }, 1200);
  },
};
