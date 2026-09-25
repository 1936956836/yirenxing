// 15-utils.js —— 工具方法 / Step3 打卡按钮样式（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G1-系统内核 / G8-首页导航（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// v12.4 死代码清理：FAB 快捷记录（toggleFab/fabQuick/fabSaveNote/_fabFlash）与 sidebar（renderSidebar）
//               及 .snav 高亮兜底均已随废弃 UI 一并删除
// v12.7：顶边栏（含北京时间时钟与滚动收缩）已按用户要求彻底删除，
//               导航改挂左下角圆形 dock 按钮（.dock99-btn）
Object.assign(App, {
  // ===== 模块可折叠（f9）=====
  bindGlobalEvents() {
    // P6：挂载四科题库小测提交事件（委托，一次即可）
    this._attachQuizHandlersOnce();
    // 模块可折叠：点击 .card-title[data-collapsible] 折叠后续内容
    // v12.9.10 动画规范：卡片高度跟着内容一起渐变（JS 量高驱动 transition，不出现内容突现）；
    //   箭头 ▼ 收起态（展开按钮）→ 展开后旋转 180° 成 ▲（收叠按钮），旋转与高度同步过渡
    document.addEventListener('click', (e) => {
      const t = e.target.closest('.card-title[data-collapsible="1"]');
      if (!t) return;
      const parent = t.parentElement;
      if (!parent) { t.classList.toggle('collapsed'); return; }
      const kids = Array.from(parent.children);
      const body = kids.slice(kids.indexOf(t) + 1);
      const willCollapse = !t.classList.contains('collapsed');
      if (!body.length) { t.classList.toggle('collapsed'); return; }
      body.forEach(el => {
        const T = 'height .32s cubic-bezier(.4,0,.2,1), opacity .26s ease';
        el.style.transition = T;
        el.style.overflow = 'hidden';
        if (willCollapse) {
          // 收起：先固定当前高度为起点 → 加类 → 过渡到 0
          el.style.height = el.scrollHeight + 'px';
          el.style.opacity = '1';
          void el.offsetHeight;
          t.classList.add('collapsed');
          el.style.height = '0px';
          el.style.opacity = '0';
        } else {
          // 展开：先撤类+临时 auto 测真实高度（height:0 时子元素行高塌缩会测量失真）→
          //   锁回 0 起点 → 过渡到真实高度（同步代码块内无渲染中断，不会闪现）
          t.classList.remove('collapsed');
          el.style.height = 'auto';
          const target = el.offsetHeight;
          el.style.height = '0px';
          el.style.opacity = '0';
          void el.offsetHeight;
          el.style.height = target + 'px';
          el.style.opacity = '1';
          const done = (ev) => {
            if (ev.propertyName !== 'height') return;
            el.style.height = '';
            el.style.opacity = '';
            el.style.overflow = '';
            el.removeEventListener('transitionend', done);
          };
          el.addEventListener('transitionend', done);
          setTimeout(() => { if (el.style.height && el.style.height !== '0px') { el.style.height = ''; el.style.overflow = ''; } }, 420);
        }
      });
    });
  },
  // 导航绑定（左下角圆形 dock 按钮收纳式导航）
  bindNav() {
    const go = (view) => this.navigate(view);
    document.querySelectorAll('.dock99-btn').forEach(t => t.addEventListener('click', () => {
      // v12.9.46 【独行音乐】长按已触发：吞掉紧随的 click，不再跳首页（100-solomusic99.js 置位，此处消费）
      if (this.__holdNav99) { this.__holdNav99 = false; return; }
      go(t.dataset.view);
    }));
    // 收纳/展开（单击）+ v12.9.45 权限管理入口（长按 1 秒：液体流动音 + 圆幕渐变过渡，见 96-perm99.js）
    const tg = document.getElementById('dock99Toggle');
    if (tg) {
      let lp99 = null, lp99Fired = false, lp99Sx = 0, lp99Sy = 0;
      const lp99Clear = () => { if (lp99) { clearTimeout(lp99); lp99 = null; } try { tg.classList.remove('holding'); } catch (e) {} };
      tg.addEventListener('pointerdown', (e) => {
        lp99Fired = false; lp99Sx = e.clientX; lp99Sy = e.clientY;
        try { tg.setPointerCapture(e.pointerId); } catch (_) {}
        // 液体流动音在长按开始瞬间播（手势上下文内 AudioContext 必定 resume 成功；
        //   0.92s 正好覆盖 1 秒长按期——若放在 1 秒后的 setTimeout 里，脱离手势会静默丢失）
        try { App._sfx99 && App._sfx99('liquid'); } catch (_) {}
        lp99 = setTimeout(() => {
          lp99 = null; lp99Fired = true;
          try { tg.classList.remove('holding'); } catch (_) {}
          try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
          try { App._perm99Enter && App._perm99Enter(e); } catch (_) {}
        }, 1000);
        setTimeout(() => { if (lp99) { try { tg.classList.add('holding'); } catch (_) {} } }, 60);
      });
      tg.addEventListener('pointermove', (e) => {
        if (!lp99) return;
        if (Math.abs(e.clientX - lp99Sx) + Math.abs(e.clientY - lp99Sy) > 12) lp99Clear();
      });
      tg.addEventListener('pointerup', lp99Clear);
      tg.addEventListener('pointercancel', lp99Clear);
      tg.addEventListener('contextmenu', (e) => e.preventDefault());   // 手机长按不弹系统菜单
      tg.addEventListener('click', () => {
        if (lp99Fired) { lp99Fired = false; return; }                 // 长按已触发：吞掉 click，不再收展
        const nav = document.getElementById('dock99');
        if (!nav) return;
        const collapsed = nav.classList.toggle('collapsed');
        try { localStorage.setItem('dock99_collapsed', collapsed ? '1' : '0'); } catch (e) {}
      });
    }
    // v12.9.46 【独行音乐】入口：底部【首页】旋钮长按 1 秒（液体音 + 圆幕过渡，见 100-solomusic99.js）
    try { if (this._sm99BindEntry) this._sm99BindEntry(); } catch (e) {}
    // v12.9.47 【独行地球】入口：底部【习惯】旋钮长按 1 秒（液体音 + 深蓝圆幕过渡，见 101-earth99.js）
    try { if (this._earth99BindEntry) this._earth99BindEntry(); } catch (e) {}
    // v12.9.47 【独行视频】入口：底部【记录】旋钮长按 1 秒（液体音 + 紫红圆幕过渡，见 102-video99.js）
    try { if (this._video99BindEntry) this._video99BindEntry(); } catch (e) {}
    // v12.9.47 【独行表达】入口：底部【家园】旋钮长按 1 秒（液体音 + 青绿圆幕过渡，见 103-express99.js）
    try { if (this._express99BindEntry) this._express99BindEntry(); } catch (e) {}
  },
  // 视图切换（激活 dock 圆形导航高亮）
  // v1.0.1：休息模式与离线浏览模式已彻底移除，view 参数不再支持 '|offline' 后缀
  navigate(view) {
    // v12.9.31d 【独行者同款背景】换肤卸载：离开板块子页（回首页/切 tab）即撤红白渐变；workbench 渲染时按白名单重挂
    //   （bg-rpg-red 通用类 + mode-rpg99 兼容别名一并移除，双保险）
    // v12.9.46b 挑战中心/魔窟背景与战鼓音乐同口径卸载：从子页直跳首页时 render_workbench 不会执行，
    //   红绿白渐变/暗谷背景会残留在首页、魔窟战鼓会继续轰鸣——统一在 navigate 出口清理
    try {
      document.body.classList.remove('bg-rpg-red');
      document.body.classList.remove('mode-rpg99');
      if (view !== 'workbench') {
        document.body.classList.remove('bg-chal99');
        document.body.classList.remove('bg-boss99');
      }
    } catch (e) {}
    if (view !== 'workbench') { try { if (this._boss99Leave) this._boss99Leave(); } catch (e) {} }
    // v12.9.47 离开【独行视频】：存播放进度 + 暂停 + 退出横屏（画布仍在但声音不停会是事故）
    if (view !== 'video99') { try { if (this._video99Leave) this._video99Leave(); } catch (e) {} }
    // v12.9.47 离开【独行表达】：停录音 + 静默存档（≥2 句）
    if (view !== 'express99') { try { if (this._express99Leave) this._express99Leave(); } catch (e) {} }
    let cleanView = view;
    if (typeof view === 'string' && view.endsWith('|offline')) {
      cleanView = view.slice(0, -'|offline'.length); // 兼容旧存档/书签里的后缀，静默剥掉
    }
    // v12.1 归心模式：界面固定在首页——底栏/侧栏其余 tab 一律拦下（回轻氧后恢复自由）
    if (this._mode99 === 'guixin' && cleanView !== 'dashboard') {
      this._flash('🌙 归心模式中，界面停在首页——点「轻氧」回去，再到处走走');
      return;
    }
    // v12.9.22 同步版面已删除（登录后云同步全自动：启动恢复 + 落盘节流上传）：
    //   旧入口/旧书签 navigate('sync') → 设置页（云账户卡在设置页，见 render_data_protection）
    if (cleanView === 'sync') cleanView = 'data_protection';
    // v10.0 底栏 5 tab：习惯/记录/空间 是板块子页的顶层化映射
    //   habit → 习惯子页；record → 记录子页；space → 小家子页（v11.8「空间」升级为「小家」，dock 按钮仍叫「空间」）
    const TAB_TO_WB = { habit: 'habit', record: 'record', space: 'home99' };
    if (TAB_TO_WB[cleanView]) {
      // v12.9 历史入栈（同页重复点 dock 不入栈）
      if (!(this.currentView === 'workbench' && this._wbView === TAB_TO_WB[cleanView])) this._navPush();
      this._wbView = TAB_TO_WB[cleanView];
      this.currentView = 'workbench';
      try { document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-workbench')); } catch(e){}
      try { document.querySelectorAll('.dock99-btn').forEach(t => t.classList.toggle('active', t.dataset.view === cleanView)); } catch(e){}
      this.render_workbench();
      try { window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){}
      return;
    }
    // v12.9 历史入栈（真正的页面变化才入栈；navigate('workbench') 会重置子页也算变化）
    if (cleanView !== this.currentView || cleanView === 'workbench') this._navPush();
    this.currentView = cleanView;
    const activeTab = cleanView === 'workbench' ? 'habit' : cleanView;
    try { document.querySelectorAll('.dock99-btn').forEach(t => t.classList.toggle('active', t.dataset.view === activeTab)); } catch(e){}
    // 子页别名：goals/weekly_report/data_protection 复用 view-sync 容器
    const SUB_TO_CONTAINER = { goals: 'sync', weekly_report: 'sync', data_protection: 'sync' };
    const containerView = SUB_TO_CONTAINER[cleanView] || cleanView;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + containerView));
    // 当跳子页时，激活 sync 容器并显示子页 tab（容器 id 仍叫 view-sync：仅作复用名，与已删除的同步版面无关）
    if (containerView !== cleanView) {
      try { document.querySelectorAll('.sync-sub-tab').forEach(t => t.classList.toggle('active', t.dataset.sub === cleanView)); } catch(e){}
    }
    // v1.0.1 休息模式已彻底移除：不再按时间段限制任何交互
    // （农场/牧场等挂机体系已随 v7.0 拆分迁出，主程序不再保留相关夜间逻辑）
    // 防御性：旧书签 navigate('workbench')（v10.0 旧聚合首页已删除）→ 安全回落习惯子页
    if (cleanView === 'workbench') this._wbView = 'habit';
    // v2026.0906：旧视图安全重定向 —— 这些顶层视图（rewards/logs/ledger/diary/todo/outfit）的
    // 渲染函数已删除（并入板块子页），旧书签/旧入口 navigate 一律重定向到对应子页：
    //   rewards（v3.1 任务 tab 下线）→ 首页；logs（v3.0 日志板块取消）→ 首页
    //   ledger / diary / todo / outfit → 记录板块下对应子页
    const LEGACY_WB_REDIRECT = { rewards: '__home', logs: '__home', ledger: 'ledger', diary: 'diary', todo: 'todo', outfit: 'outfit' };
    if (LEGACY_WB_REDIRECT[cleanView]) {
      // v10.0：rewards/logs 原本去旧聚合首页——该界面已删除，直接回导航「首页」
      if (LEGACY_WB_REDIRECT[cleanView] === '__home') { this._navNoPush(() => this.navigate('dashboard')); return; }
      this._wbView = LEGACY_WB_REDIRECT[cleanView];
      this.currentView = 'workbench';
      try { document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-workbench')); } catch(e){}
      try { document.querySelectorAll('.dock99-btn').forEach(t => t.classList.toggle('active', t.dataset.view === 'record')); } catch(e){}
      this.render_workbench();
      try { window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){}
      return;
    }
    // 渲染分发：调用对应 render_xxx
    // v12.9.22 v7.0 前旧视图（商店/银行/农场/31 个小游戏等）的代码与重定向表已删净——
    //   任何无渲染器的视图名（旧书签/异常路径）一律安全回落首页，不再维护逐一映射
    const renderer = this['render_' + cleanView];
    if (renderer) renderer.call(this);
    else { this._navNoPush(() => this.navigate('dashboard')); return; }
    try { window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){}
  },
  // ====== v12.9 统一「返回上一页」导航历史栈 ======
  // 状态粒度：顶层 view + 板块子页(_wbView) + 数据中心子库(_dc99.tab) + 运动数据子站(_sp99.view)
  // 挂点：navigate() / gotoWb() / _dc99Set('tab') / _sp99Set('view') 切换前入栈；navBack() 出栈还原
  _navPush() {
    if (this._navRestoring) return;
    const inWb = this.currentView === 'workbench';
    const cur = {
      view: this.currentView,
      wb: inWb ? (this._wbView || 'habit') : null,
      dc99: (inWb && this._wbView === 'datacenter99' && this._dc99) ? (this._dc99.tab || 'home') : null,
      sp: (inWb && this._wbView === 'datacenter99' && this._dc99 && this._dc99.tab === 'sport99' && this._sp99) ? (this._sp99.view || 'home') : null,
      st99: (inWb && ((this._wbView === 'datacenter99' && this._dc99 && this._dc99.tab === 'study99') || this._wbView === 'study99') && this._st99) ? (this._st99.view || 'home') : null, // v12.9.3 学习数据子站（含练习站）
      st99pz: (inWb && this._st99 && this._st99.view === 'practice' && this._st99PZSt) ? (this._st99PZSt.page || 'home') : null, // v12.9.3 练习站内部页（题组/答题/完成）
    };
    const hist = this._navHist = this._navHist || [];
    const last = hist[hist.length - 1];
    if (last && last.view === cur.view && last.wb === cur.wb && last.dc99 === cur.dc99 && last.sp === cur.sp && last.st99 === cur.st99 && last.st99pz === cur.st99pz) return;
    hist.push(cur);
    if (hist.length > 40) hist.shift();
  },
  navBack() {
    const hist = this._navHist = this._navHist || [];
    const prev = hist.pop();
    if (!prev) { this.navigate('dashboard'); return; } // 无历史（首屏直达）→ 回首页
    this._navRestoring = true; // 还原过程不入栈
    try {
      if (prev.view === 'workbench') {
        this._wbView = prev.wb || 'habit';
        if (prev.dc99) {
          if (!this._dc99) this._dc99 = { card: '_summary', metric: 'nightH', chart: 'line', range: 7, tab: 'home' };
          this._dc99.tab = prev.dc99;
        }
        if (prev.sp) { this._sp99Init(); this._sp99.view = prev.sp; }
        if (prev.st99) { this._st99Init().view = prev.st99; if (prev.st99 === 'practice') this._st99PZInit().page = prev.st99pz || 'home'; } // v12.9.3 还原学习数据/练习站子页（_st99PZSt 状态）
        if (this.currentView !== 'workbench') {
          this.currentView = 'workbench';
          try { document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-workbench')); } catch (e) {}
        }
        // dock 高亮口径与 gotoWb 一致（数据中心/模型等子页统一高亮「习惯」兜底）
        const TAB_OF_WB = { habit: 'habit', record: 'record', me: 'space', home99: 'space', garden99: 'space', homeShop99: 'space', dream99: 'record', drift99: 'record', vault99: 'record', ta99: 'record' };
        const hi = TAB_OF_WB[prev.wb] || 'habit';
        try { document.querySelectorAll('.dock99-btn').forEach(t => t.classList.toggle('active', t.dataset.view === hi)); } catch (e) {}
        this.render_workbench();
      } else {
        this.navigate(prev.view);
      }
    } finally { this._navRestoring = false; }
  },
  // 跳过入栈的一次性导航（内部重定向用：gotoWb('home')→首页、LEGACY 旧视图重定向）
  _navNoPush(fn) {
    this._navRestoring = true;
    try { fn(); } finally { this._navRestoring = false; }
  },
  // ====== 工具方法 ======
  esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  // —— 通用 modal（v7.0 拆分独立时自 110-farm-ranch.js 迁入：该文件已随虚拟模块迁出至「生命征程·虚拟」，
  //    但备份引导/习惯数据/洞察报告/我页/拆分公告等现实版功能均依赖此弹窗）——
  // 三种调用：_modal(title, html)  /  _modal(title, html, actions[])  /  _modal({title,body,actions:[{label,onClick,primary,keep}]})
  // v12.9.47 补第三参 actions 支持（此前第三参被静默丢弃——独行地球科普窗/独行视频合规声明等按钮不渲染的根因）
  _modal(a, b, c) {
    const opts = (a && typeof a === 'object') ? a : { title: a, body: b, actions: Array.isArray(c) ? c : [] };
    const title = opts.title || '提示';
    const htmlBody = opts.body || '';
    const actions = opts.actions || [];
    const keepOpen = !!opts.keepOpen;
    const overlay = document.createElement('div');
    overlay.className = 'wild-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.62);backdrop-filter:blur(4px);z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;';
    const box = document.createElement('div');
    box.style.cssText = 'max-width:560px;width:100%;max-height:86vh;overflow:auto;background:#fff;border-radius:14px;padding:16px 18px;box-shadow:0 20px 50px rgba(2,6,23,.3)';
    const doClose = () => { const p = overlay.parentNode; if (p) p.removeChild(overlay); try { if (overlay._escH) document.removeEventListener('keydown', overlay._escH); } catch(_) {} try { if (typeof opts.onClose === 'function' && !overlay._onClosed) { overlay._onClosed = true; opts.onClose(); } } catch(_) {} };
    const close = document.createElement('button');
    close.className = 'btn btn-danger btn-sm';
    close.innerText = '✕ 关闭';
    close.onclick = (e) => { e.stopPropagation(); doClose(); };
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px';
    const h3 = document.createElement('div');
    h3.style.cssText = 'font-size:16px;font-weight:800;color:#0f172a';
    h3.textContent = title || '提示';
    head.appendChild(h3);
    head.appendChild(close);
    const body = document.createElement('div');
    body.innerHTML = htmlBody;
    box.appendChild(head);
    box.appendChild(body);
    if (actions.length) {
      const ftr = document.createElement('div');
      ftr.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap';
      actions.forEach(ac => {
        const btn = document.createElement('button');
        btn.className = 'btn ' + (ac.primary ? 'btn-primary' : 'btn-ghost');
        btn.innerText = ac.label || '确定';
        btn.onclick = (e) => {
          e.stopPropagation();
          let r = true;
          try { if (typeof ac.onClick === 'function') r = ac.onClick(e); } catch(err) {}
          if (!ac.keep && r !== false) doClose();
        };
        ftr.appendChild(btn);
      });
      box.appendChild(ftr);
    }
    overlay.appendChild(box);
    const escHandler = (ev) => { if (ev.key === 'Escape' && !keepOpen) doClose(); };
    document.addEventListener('keydown', escHandler);
    overlay._escH = escHandler;
    (document.body || document.documentElement).appendChild(overlay);
  },
  _closeModal() {
    document.querySelectorAll('.wild-overlay').forEach(el => { try { if (el._escH) document.removeEventListener('keydown', el._escH); } catch(_) {} const p = el.parentNode; if (p) p.removeChild(el); });
  },

  // 数值统一保留 1 位小数（v7.0 农场/牧场时代遗产 → 现为运动数据 86-sport99 使用）
  _f1(n) { const x = Number(n); return (isFinite(x) ? x : 0).toFixed(1); },

  _fmtHMS(ms) {
    ms = Math.max(0, Math.round(ms));
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0');
    const sss = String(ss).padStart(2, '0');
    return (h ? (h + ':') : '') + mm + ':' + sss;
  },
  todayRec() { return Store.getDay(); },
  pct(a, b) { return b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0; },
  // ====== Step3 打卡按钮统一样式 + 倒计时 live tick ======
  // opts: {windowName, done, btnText, onclick, primary=true, small=false, extraLabel},
  _punchBtnHTML(opts) {
    const w = Store.punchWindowStatus(opts.windowName);
    const done = opts.done;
    let statusLabel = '', btnLabel = opts.btnText || '打卡', disabled = '', badgeCls = 'pb-badge-wait', styleExtra = 'color:#047857';
    if (done) {
      statusLabel = '✓ 已打卡'; badgeCls = 'pb-badge-done'; btnLabel = (opts.btnText || '打卡') + ' ✓';
      disabled = 'disabled'; styleExtra = 'background:#059669;color:#fff';
    } else if (w.open) {
      statusLabel = `开放中 · 剩余 ${this._fmtHMS(w.closeLeftMs)}`; badgeCls = 'pb-badge-open';
    } else {
      statusLabel = w.windowLabel || '⏳ 等待开放'; badgeCls = 'pb-badge-wait';
      disabled = 'disabled'; styleExtra = 'background:#e2e8f0;color:#94a3b8'; btnLabel = (opts.btnText || '打卡') + '（未到时间）';
    }
    const cls = ['punch-btn'];
    if (opts.primary !== false && !done) cls.push('btn-primary');
    else if (opts.small) cls.push('btn-sm');
    const extra = opts.extraLabel ? `<div class="pb-extra">${opts.extraLabel}</div>` : '';
    const handle = opts.onclick || '';
    const dataWin = `data-pw="${opts.windowName}"`;
    const dataWait = `data-wait="${Math.round(w.waitMs || 0)}"`;
    const dataCloseLeft = `data-close-left="${Math.round(w.closeLeftMs || 0)}"`;
    const dataDone = done ? 'data-done="1"' : '';
    const dataStatus = `data-label-open="开放中 · 剩余 HH:MM:SS" data-label-wait="${this.esc(w.windowLabel || '⏳ 等待开放')}" data-label-done="✓ 已打卡"`;
    const badge = `<span class="pb-badge ${badgeCls}" data-pw-badge="${opts.windowName}">${statusLabel}</span>`;
    const btn = `<button class="${cls.join(' ')} btn punch-btn-core" style="${styleExtra}" ${dataWin} ${dataWait} ${dataCloseLeft} ${dataDone} ${dataStatus} ${disabled} onclick="${handle}">${btnLabel}</button>`;
    return `<div class="punch-row ${opts.small ? 'punch-row-sm' : ''}" ${dataWin}>${btn}${badge}${extra}</div>`;
  },
  // 每秒调用一次，更新所有 [data-pw] 的按钮文字与 badge（未到窗/已开/已关三种）
  _tickPunchButtons() {
    if (!document.querySelectorAll) return;
    const nodes = document.querySelectorAll('[data-pw]');
    nodes.forEach((row) => {
      const winName = row.getAttribute('data-pw');
      if (!winName) return;
      if (row.getAttribute && row.tagName !== 'DIV' && row.classList && !row.classList.contains('punch-row')) {
        // 忽略非 row 节点（避免重入）
      }
      const btns = row.querySelectorAll ? row : null;
    });
    document.querySelectorAll('.punch-row[data-pw]').forEach(row => {
      const name = row.getAttribute('data-pw');
      const w = Store.punchWindowStatus(name);
      const btn = row.querySelector('.punch-btn-core');
      const badge = row.querySelector('[data-pw-badge]');
      if (!btn) return;
      if (btn.getAttribute('data-done') === '1') {
        if (badge) badge.textContent = '✓ 已打卡';
        return;
      }
      if (w.open) {
        if (badge) badge.textContent = `开放中 · 剩余 ${this._fmtHMS(w.closeLeftMs)}`;
        if (btn.disabled) { btn.disabled = false; btn.style.cssText = ''; btn.classList.add('btn-primary'); }
      } else {
        if (badge) badge.textContent = w.windowLabel || '⏳ 等待开放';
        if (!btn.disabled) {
          btn.disabled = true;
          const orig = (btn.textContent || '').replace('（未到时间）','').replace('（打卡开放中）','');
          btn.textContent = orig + '（未到时间）';
          btn.style.background = '#e2e8f0'; btn.style.color = '#94a3b8';
          btn.classList.remove('btn-primary');
        } else {
          // 保持 disabled；更新 badge 即可
        }
      }
    });
  },
  // 打卡成功：小任务奖励金币 1~5 立即发（完成后首次打卡触发）
  _onPunchReward(group, key, label) {
    const done = Store._isMiniDone(group, key);
    if (!done) return;
    const r = Store.claimMiniTask(group, key);
    if (r && r.ok) {
      this._flash(`✅ ${label || '打卡完成'} +${r && r.amount ? r.amount : '?'} 金币`);
    }
    else if (r && r.duplicate) { /* 已领过，静音；绝不重复 bump */ }
    else if (r && r.msg) this._flash(r.msg);
  },

});
