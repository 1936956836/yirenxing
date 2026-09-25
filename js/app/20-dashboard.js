// 20-dashboard.js —— v12.7 新首页：hero 标题区（大标题+荧光笔+副标题+天气chip+阿福/宠物入口）
// [功能组] G8-首页导航（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   + Have good time 分割线 + 模式 chips + 像素猫卡 + 小树卡 + 习惯网格 + 待办四象限
//   · v12.7 按用户要求整体重构：删旧版首页卡（阿福双卡/寄语/下载横幅/天气卡/倒数卡/备份卡/更新公告卡），
//     阿福的提示卡全部迁入阿福专属页（afuChatOpen 聊天页，见 _afu99PageCards）
//   · 美术升级总纲：留白多、层级少、色彩统一的克制表达（card99 毛玻璃大圆角卡片）
//   · 旧「我的档案」渲染（renderProfileCard/_calcStarSign/…）仍由数据中心「主人档案」使用，保留
Object.assign(App, {
  // ====== 新首页 ======
  render_dashboard() {
    let html = '';
    // ---------- hero：大标题 + 副标题 + 天气 chip + 阿福 / 宠物两个圆形入口 ----------
    html += this._hero99();
    // ---------- 分割线（左右留白 · 冷浅灰）----------
    html += `<div class="hero99-div"><span>Have good time</span><i></i></div>`;
    // ---------- 模式 chips：轻氧 / 聚神 / 归心（80-mode99.js）----------
    html += this._mode99HomeCard ? this._mode99HomeCard() : '';
    // ---------- 今日精力负荷卡（v12.9.46 自挑战中心迁入主页 · 共享引擎 load99 单一取数口）----------
    html += this._load99HomeCard();
    // ---------- 七三开行：自律数据大卡（左 7）+ 右列（我的形象卡 + 小银卡）----------
    html += `<div class="duo99">${this._tree99Card()}<div class="duo99-side">${this._me99Card()}${this._pet99CatCard()}</div></div>`;
    // ---------- 今日习惯网格 ----------
    html += this._habit99GridCard();
    // ---------- 待办四象限 ----------
    html += this._todo99MiniCard();
    // ---------- v12.9.50 账户区（首页底部）：账号信息 / 修改密码 / 主人档案快捷入口 ----------
    html += this._acct99Card();
    document.getElementById('view-dashboard').innerHTML = html;
    // v12.9.59 首页阿福图标长按入口（点击=文字聊天不变 · 长按1000ms=语音对话页；一次性事件委托）
    try { if (this._vf99WireHeroIcon) this._vf99WireHeroIcon(); } catch (e) {}
    // 异步加载天气（写入 hero chip，不阻塞首屏）
    if (typeof this.loadWeather === 'function') {
      Promise.resolve().then(() => this.loadWeather()).catch(() => {});
    }
  },

  // ---------- hero 标题区 ----------
  _hero99() {
    // 天气 chip 初始文案：30 分钟内的缓存优先，否则等 loadWeather 异步回填
    let wTxt = '🌤️ …';
    try {
      const wc = JSON.parse(localStorage.getItem('weather_cache') || 'null');
      if (wc && wc.data && (Date.now() - (wc.ts || 0) < 30 * 60 * 1000) && wc.data.temp != null) {
        const w = this._weatherCodeMap(wc.data.code);
        wTxt = `${w.icon} ${Math.round(wc.data.temp)}°C`;
      }
    } catch (e) {}
    // 右上只保留管家阿福圆形入口（小银已有专属卡片，点击像素猫卡进入宠物页）
    return `
      <section class="hero99">
        <div class="hero99-main">
          <div class="hero99-titlerow">
            <h1 class="hero99-title"><span class="hero99-hl">做自己</span>的同行者</h1>
            <div class="hero99-wchip" id="hero99W" title="今日天气 · 点击进入独行天气" role="button" onclick="App._weather99Go()">${wTxt}</div>
          </div>
          <div class="hero99-sub">把日子过成喜欢的模样·一人行</div>
        </div>
        <div class="hero99-btns">
          <button class="hero99-mbtn rx${(this._m99Playing || this._home99RadioOn) ? ' playing' : ''}" id="m99MediaBtn" onclick="App.media99Toggle()" title="播放器 · 音乐 / 今日播报">📻</button>
          <button class="hero99-ava" onclick="App.afuChatOpen()" title="管家阿福 · 点击文字对话 / 长按 1 秒语音通话">${this._afu99AvatarHtml(30)}</button>
        </div>
      </section>`;
  },

  // ---------- 今日精力负荷卡（v12.9.46 自挑战中心迁入主页；数据走 load99 共享引擎，打卡后即时刷新）----------
  _load99HomeCard() {
    let L = { pct: 0, used: 0, cap: 100, items: [] };
    try { L = this.load99() || L; } catch (_) {}
    const Z = this._pet99Zone ? this._pet99Zone(L.pct) : { name: '舒适区间', color: '#16a34a', tip: '' };
    const items = L.items || [];
    const names = items.slice(0, 2).map(x => `${x.ico} ${String(x.name).replace(/（.*?）/g, '')}`);
    const left = L.cap - L.used;
    return `<div class="card card99 load99-home" onclick="App.gotoWb('pet99')" role="button">
      <div class="load99-top">
        <div class="load99-tt"><span class="load99-bolt">⚡</span><b>今日精力负荷</b><span class="load99-zone" style="color:${Z.color};background:${Z.color}14;border-color:${Z.color}55">${Z.name}</span></div>
        <div class="load99-num" style="color:${Z.color}">${Math.min(100, L.pct)}<small>%</small></div>
      </div>
      <div class="load99-track"><div class="load99-fill" style="width:${Math.min(100, L.pct)}%;background:linear-gradient(90deg,${Z.color}cc,${Z.color})"></div><i style="left:60%"></i><i style="left:85%"></i></div>
      <div class="load99-tip" style="color:${Z.color}">${Z.tip || ''}</div>
      <div class="load99-ft">
        <span>${items.length ? names.join(' · ') + (items.length > 2 ? ` 等 ${items.length} 项` : '') : '今日暂无任务占用'} · 余量 ${Math.max(0, Math.round(left * 10) / 10)} 点</span>
        <span class="load99-more">详情 ›</span>
      </div>
    </div>`;
  },

  // ---------- 小银卡（七三开右列 · 紧凑版；动作在宠物页交互设置，首页只展示当前动作）----------
  _pet99CatCard() {
    const p = this._pet99Data();
    const sleeping = this._mode99 === 'guixin';
    const act = sleeping ? 'sleep' : (p.act || 'idle');
    const actName = { idle: '待机', lick: '舔爪', sleep: '打盹', coq: '撒娇' }[act] || '待机';
    return `<div class="card card99 pet99-cat-card" onclick="App.gotoWb('pet99')">
      <div class="p99-cat-stage">${this._pet99CatHtml({ px: 64, act })}</div>
      <div class="p99-cat-name">${sleeping ? '小银睡着了 😴' : `小银 · ${this._pet99StageName(p)}`}</div>
      <div class="p99-cat-sub">${sleeping ? '🌙 星夜安眠' : `💎 ${p.points} · ${actName}中`}</div>
    </div>`;
  },

  // ---------- 我的形象卡（七三开右列 · 按档案性别换男/女头像；点击去【个人中心】）----------
  // v12.9.31b 回退：首页恢复原版照片头像（绿色衣服男生/女生 jpg）——像素战士形象只在【个人中心】内展示
  _me99Card() {
    let p = {};
    try { p = Store.getProfile ? Store.getProfile() : {}; } catch (e) {}
    const female = p.gender === '女';
    const img = female ? 'img/avatar-female.jpg' : 'img/avatar-male.jpg';
    const mbti = p.mbti ? ' · ' + this.esc(p.mbti) : '';
    return `<div class="card card99 me99-card" onclick="App.gotoWb('rpg99')">
      <img class="me99-ava" src="${img}" alt="我的形象" draggable="false" oncontextmenu="return false;" ondragstart="return false;" style="-webkit-touch-callout:none;user-select:none;pointer-events:none;">
      <div class="me99-name">我的形象</div>
      <div class="me99-sub">${female ? '女' : '男'}${mbti} · 个人中心 ›</div>
    </div>`;
  },

  // ---------- v12.9.51 账户区（首页底部 · 用户指令）：账号信息 / 修改密码 / 主人档案 / 切换账号 ----------
  _acct99Card() {
    const u = (this._c99 && this._c99.user) || null;
    const guest = !u && (this._c99 && this._c99.state) === 'guest';
    const email = (u && u.email) || '';
    const masked = email ? email.replace(/^(.{2}).*(@.*)$/, '$1****$2') : (guest ? '游客模式 · 数据仅存本机' : '未登录');
    return `<div class="card card99 acct99-card" style="margin-top:14px">
      <div class="acct99-row">
        <div class="acct99-user">
          <div class="acct99-ico">${guest ? '🌿' : '👤'}</div>
          <div>
            <div class="acct99-name">${u ? '账户 · 已登录' : (guest ? '账户 · 游客模式' : '账户 · 未登录')}</div>
            <div class="acct99-mail" title="${this.esc(email)}">${this.esc(masked)}</div>
          </div>
        </div>
        <div class="acct99-btns">
          ${guest
            ? `<button class="btn btn-ghost btn-sm" style="margin:0" onclick="App._map99OpenData('profile')">🧾 主人档案</button>
               <button class="btn btn-primary btn-sm" style="margin:0" onclick="App.cloud99GuestToLogin()">🔐 登录账号</button>`
            : `<button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.acct99View()">👁️ 账号信息</button>
               <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.acct99ChangePwd()">🔑 修改密码</button>
               <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App._map99OpenData('profile')">🧾 主人档案</button>
               <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.acct99SwitchAsk()">🔄 切换账号</button>`}
        </div>
      </div>
    </div>`;
  },
  // v12.9.60 游客 → 登录账号：弹门登录（本机数据保留，登录后随账号上云）
  cloud99GuestToLogin() {
    this._modal('🔐 登录账号', `
      <div style="font-size:12.5px;color:#475569;line-height:2">
        游客模式下登录账号：<b>本机数据保留</b>，登录后开始随账号云端同步（多设备共用）。<br>
        <span style="color:#94a3b8">没有账号也可以继续当游客使用——数据始终只存本机。</span>
      </div>`,
      [{ label: '继续当游客' },
       { label: '🔐 去登录', primary: true, onClick: () => { try { this.cloud99GateShow(); } catch (e) {} } }]);
  },
  // 切换账号：二次确认 → 登出 → 登录门
  acct99SwitchAsk() {
    this._modal({
      title: '🔄 切换账号',
      body: `<div style="font-size:13px;line-height:2;color:var(--text);padding:4px 2px">
        将<b>退出当前账号</b>并回到登录门，可换其他账号登录（本机数据保留，云端数据随账号走）。
      </div>`,
      actions: [
        { label: '取消' },
        { label: '🔄 退出并切换', primary: true, onClick: () => this.cloud99Logout() },
      ],
    });
  },
  // 账号信息弹窗：登录账号 + 说明（密码不留存本机，只能修改不能查看——安全设计）
  acct99View() {
    const u = (this._c99 && this._c99.user) || null;
    const email = (u && u.email) || '';
    this._modal({
      title: '👤 账号信息',
      body: `<div style="font-size:13px;line-height:2;color:var(--text);padding:4px 2px">
        <div style="display:flex;gap:8px;align-items:center;background:#f1f5f9;border-radius:10px;padding:10px 12px;margin-bottom:10px">
          <span style="font-size:16px">📧</span>
          <div><div style="font-weight:800;word-break:break-all">${this.esc(email || '未登录（强制登录门禁下此处不应为空——请截图反馈）')}</div>
          <div style="font-size:11px;color:var(--text-soft)">登录账号（邮箱）</div></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;background:#f1f5f9;border-radius:10px;padding:10px 12px;margin-bottom:10px">
          <span style="font-size:16px">🔑</span>
          <div><div style="font-weight:800">••••••••</div>
          <div style="font-size:11px;color:var(--text-soft)">登录密码（加密存储，不出现在本机——如忘记请点「修改密码」重设）</div></div>
        </div>
        <div style="font-size:11.5px;color:var(--text-soft);line-height:1.8">🔒 密码采用单向加密存于云端，任何页面（包括本机）都无法查看原密码——这是账户安全的底线设计。可随时通过「修改密码」重设。</div>
      </div>`,
      actions: [
        { label: '关闭' },
        { label: '🔑 修改密码', primary: true, onClick: () => this.acct99ChangePwd() },
      ],
    });
  },
  // 修改密码弹窗（Supabase updateUser · 登录态直改）
  acct99ChangePwd() {
    if (!this._c99 || !this._c99.client || !this._c99.user) {
      this._flash('❌ 请先登录账户');
      return this.cloud99GateShow();
    }
    this._modal({
      title: '🔑 修改账户密码',
      body: `<div style="font-size:13px;line-height:1.9;color:var(--text);padding:4px 2px">
        <div style="font-size:12px;color:var(--text-soft);margin-bottom:8px">当前账号：<b>${this.esc(this._c99.user.email)}</b>（修改后所有设备需用新密码登录）</div>
        <div class="field"><label>新密码（≥6 位）</label>
          <input type="password" class="input" id="acct99Pw1" placeholder="输入新密码">
        </div>
        <div class="field"><label>再输入一次</label>
          <input type="password" class="input" id="acct99Pw2" placeholder="再输一遍，确认没打错" onkeydown="if(event.key==='Enter')App.acct99DoChangePwd()">
        </div>
      </div>`,
      actions: [
        { label: '取消' },
        { label: '✅ 确认修改', primary: true, onClick: () => this.acct99DoChangePwd() },
      ],
    });
  },
  async acct99DoChangePwd() {
    if (!this._c99 || !this._c99.client || !this._c99.user) return;
    const p1 = String((document.getElementById('acct99Pw1') || {}).value || '');
    const p2 = String((document.getElementById('acct99Pw2') || {}).value || '');
    if (p1.length < 6) return this._flash('新密码至少 6 位');
    if (p1 !== p2) return this._flash('两次输入的新密码不一样');
    try {
      const { error } = await this._c99.client.auth.updateUser({ password: p1 });
      if (error) { this._flash('❌ 修改失败：' + (error.message || '请稍后重试')); return; }
      try { this._closeModal(); } catch (e) {}
      this._flash('✅ 密码已修改——下次登录请使用新密码');
    } catch (e) {
      this._flash('❌ 网络异常：' + (e.message || '请检查网络'));
    }
  },

  // ---------- 自律数据大卡（七三开左 7：连续自律 + 本周平均 + 今日习惯）----------
  _tree99Card() {
    const streak = Store.calcStreak();
    // 本周（近 7 天）平均完成度 —— v12.9.21 改走 Store.hub.range（跨域共享枢纽·单一事实源，口径一处定义全端一致）
    const weekAvg = Store.hub ? Store.hub.range(this._hb99DkOff(-6), this._hb99DkOff(0)).recordPct
      : (() => { // 兜底：hub 不可用时维持旧算法
        const today0 = new Date(); today0.setHours(0, 0, 0, 0);
        let weekSum = 0;
        const data = Store.load();
        for (let i = 0; i < 7; i++) {
          const dd = new Date(today0); dd.setDate(dd.getDate() - i);
          weekSum += this.dayCompletionPct(data.records[Store.fmtDate(dd)]);
        }
        return Math.round(weekSum / 7);
      })();
    // 今日习惯完成度（自律卡全集）
    const cards = (typeof CONFIG !== 'undefined' && CONFIG.habitCards) || [];
    let doneN = 0;
    cards.forEach(c => { try { if (this._habit99CardState && this._habit99CardState(c).done) doneN++; } catch (_) {} });
    const tree = streak >= 30 ? '🌳' : streak >= 14 ? '🌴' : streak >= 4 ? '🌱' : '🌰';
    return `<div class="card card99 tree99-card" onclick="App.gotoWb('report99')">
      <div class="tree99-ico">${tree}</div>
      <div class="tree99-num">${streak}<small> 天</small></div>
      <div class="tree99-lbl">连续自律</div>
      <div class="tree99-sub">本周平均 ${weekAvg}% · 今日习惯 ${doneN}/${cards.length}</div>
    </div>`;
  },

  // ---------- 今日习惯网格（v12.7：最多 3×3 = 9 张，且都是当前时间段可打卡/记录的卡；长按 1 秒液态水填满打卡）----------
  _habit99GridCard() {
    const cards = (typeof CONFIG !== 'undefined' && CONFIG.habitCards) || [];
    const st = c => { try { return this._habit99CardState(c) || {}; } catch (_) { return {}; } };
    const inWin = c => { try { return !!(this._habit99InWindow && this._habit99InWindow(c)); } catch (_) { return false; } };
    const done = c => !!st(c).done;
    // 可打卡/记录：窗口开放 且 未完成（多记录卡/当日可多次的卡只要不冷却/不上锁即可）
    const punchable = c => {
      const s = st(c);
      if (!inWin(c) || s.locked || s.cooling) return false;
      if (c.id === 'fitness') return !s.todayDone;
      if (c.multi || c.study || c.id === 'mood' || c.focus) return true;
      return !s.done;
    };
    const open = cards.filter(inWin);
    const todo = open.filter(punchable);
    const doneOpen = open.filter(c => !punchable(c)); // 窗口内但已完成（展示 ✓，不可再打卡）
    const show = todo.slice(0, 9).concat(doneOpen.slice(0, Math.max(0, 9 - Math.min(todo.length, 9)))).slice(0, 9);
    const doneN = cards.filter(done).length;
    return `<div class="card card99 hb99-grid-card">
      <div class="hb99-grid-head">
        <b>今日习惯</b><span class="hb99-grid-n">${doneN}/${cards.length}</span>
        <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.navigate('habit')">全部 ›</button>
      </div>
      ${show.length ? `<div class="hb99-quick-grid">
        ${show.map(c => `<button class="hb99-qchip${done(c) ? ' done' : ''}" id="hq99-${c.id}" type="button"
          onclick="if(App._hq99Held){App._hq99Held=false;return;}App.navigate('habit')"
          onpointerdown="App._hq99HoldStart('${c.id}')" onpointerup="App._hq99HoldEnd('${c.id}')" onpointerleave="App._hq99HoldEnd('${c.id}')"
          onpointercancel="App._hq99HoldEnd('${c.id}')">
          <span>${c.ico || '📌'}</span>${this.esc(c.name)}<i>${done(c) ? '✓' : ''}</i>
          <em class="hb99-qchip-water"></em>
        </button>`).join('')}
      </div>` : `<div style="font-size:12.5px;color:var(--text-faint);padding:14px 2px;text-align:center">当前时段暂无开放的习惯卡——去【习惯】页看看全部卡片与补卡中心</div>`}
      <div style="font-size:11px;color:var(--text-faint);margin-top:10px">💧 长按卡片 1 秒：液态水从左到右填满即打卡</div>
    </div>`;
  },
  // 首页习惯 chip 长按打卡（1 秒 · 液态水填充动画；守卫与习惯页 _habit99HoldStart 一致）
  _hq99HoldStart(cardId) {
    if (this._hq99Timer) { clearTimeout(this._hq99Timer); this._hq99Timer = null; }
    const c = (CONFIG.habitCards || []).find(x => x.id === cardId);
    if (!c) return;
    const s = this._habit99CardState(c);
    if (c.id === 'fitness') { if (s.todayDone) return; }
    else if (!c.multi && !c.study && s.done) return;
    if (c.study && s.done) return;
    if (c.id === 'mood' && s.cooling) { this._flash(`⏳ 心情冷却中：距下次可记录还需 ${s.coolMin} 分钟`); return; }
    if (c.id === 'fitnessMeal' && s.locked) { this._flash('🔒 健身餐需先完成当日【健身】卡打卡，才能开放'); return; }
    if (c.id === 'medCost' && s.locked) { this._flash('🔒 医疗消需先打卡当日【健康】卡且未勾选「感觉良好」，才能开放'); return; }
    if (!this._habit99InWindow(c)) return;
    const el = document.getElementById('hq99-' + cardId);
    const holdMs = (CONFIG.habit99 && CONFIG.habit99.holdMs) || 1000;
    if (el) {
      el.classList.add('holding');
      const water = el.querySelector('.hb99-qchip-water');
      if (water) water.style.transitionDuration = holdMs + 'ms'; // 水位涨速与长按时长严格同步
    }
    // v12.9.46 首页习惯 chip 长按打卡音效：与习惯页同步（按住即播液体声）
    try { this._sfx99 && this._sfx99('liquid'); } catch (_) {}
    this._hq99Timer = setTimeout(() => {
      this._hq99Timer = null;
      if (el) el.classList.remove('holding');
      this._hq99Held = true; // 抑制随后的 click 导航
      this.habit99OpenForm(cardId);
    }, holdMs);
  },
  _hq99HoldEnd(cardId) {
    if (this._hq99Timer) { clearTimeout(this._hq99Timer); this._hq99Timer = null; }
    const el = document.getElementById('hq99-' + cardId);
    if (el) el.classList.remove('holding');
  },

  // ---------- 待办四象限简卡 ----------
  _todo99MiniCard() {
    const wb = Store.getWorkbench ? Store.getWorkbench() : {};
    const plans = (wb && wb.todoPlans) || [];
    const Q = this._TODO_Q || {};
    const qOf = p => (p.q >= 1 && p.q <= 4) ? p.q : 2;
    const openN = k => plans.filter(p => !p.done && qOf(p) === k).length;
    const openAll = plans.filter(p => !p.done).length;
    return `<div class="card card99 tq99-mini-card" onclick="App.gotoWb('todo')">
      <div class="tq99-mini-head"><b>今日待办 · 重要四象限</b><span>${openAll} 项待办 · 管理 ›</span></div>
      <div class="tq99-mini-row">
        ${[1, 2, 3, 4].map(k => Q[k] ? `<span class="tq99-q q${k}">${Q[k].ico} ${Q[k].name}<b>${openN(k)}</b></span>` : '').join('')}
      </div>
    </div>`;
  },

  // ---------- v12.7 阿福专属页提示卡：旧版首页的阿福卡（问候/状态/夜巡/严重批评）全部迁到这里 ----------
  // 由 68-focus-notes.js 的 _afuChatRender 注入到聊天页消息区顶部
  _afu99PageCards() {
    let html = '';
    try {
      const g = this._butlerGreeting ? this._butlerGreeting() : { title: '你好呀', msg: '' };
      const streak = Store.calcStreak();
      const habitCardsAll = (typeof CONFIG !== 'undefined' && CONFIG.habitCards) || [];
      const selfCards = habitCardsAll.filter(c => !c.cost);
      let doneCount = 0;
      selfCards.forEach(c => { try { if (this._habit99CardState && this._habit99CardState(c).done) doneCount++; } catch (_) {} });
      const h = Store.beijingDate(Store.nowBeijing()).getHours();
      html += `<div class="card afu99-page-card">
        <div class="afu99-pc-head">${this._afu99AvatarHtml(36)}<div><b>管家阿福</b><span>${this.esc(g.title)}</span></div></div>
        <div class="afu99-pc-stats">🌳 连续自律 <b>${streak}</b> 天 · 今日习惯 <b>${doneCount}/${selfCards.length}</b>${h >= 23 || h < 6 ? ' · 夜深了，早点休息' : ''}</div>
        ${g.msg ? `<div class="afu99-pc-sub">${this.esc(g.msg)}</div>` : ''}
        ${this._afu99NightLine ? this._afu99NightLine() : ''}
      </div>`;
      html += this._afu99SevereCard ? this._afu99SevereCard() : '';
    } catch (e) {}
    return html;
  },

  // ====== v12.9.51 主人档案 · 整体重做（主流生活 App 个人信息板块风格）======
  // 结构：头像 Hero（性别感知）→ 身体数据速览（BMI/BMR/在地球天数）→ 信息行点按编辑
  //       （生日/性别/身高/体重/MBTI/所学专业，替代旧表格表单）→ 成就勋章墙 ×20 → 运势/MBTI/节气倒数（保留）
  _pf99Css() {
    if (document.getElementById('pf99Css')) return;
    const st = document.createElement('style');
    st.id = 'pf99Css';
    st.textContent = `
      /* —— Hero：渐变头卡 + 头像 + 徽章条 —— */
      .pf99-hero{position:relative;border-radius:20px;overflow:hidden;padding:20px 18px 16px;color:#fff;
        background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 52%,#a855f7 100%);box-shadow:0 10px 26px rgba(99,102,241,.32)}
      .pf99-hero::before{content:'';position:absolute;inset:0;pointer-events:none;background:
        radial-gradient(circle at 86% 10%,rgba(255,255,255,.25),transparent 44%),
        radial-gradient(circle at 6% 94%,rgba(255,255,255,.12),transparent 40%)}
      .pf99-hero-in{position:relative;display:flex;align-items:center;gap:14px}
      .pf99-ava{width:62px;height:62px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;
        font-size:31px;background:linear-gradient(160deg,#fef3c7,#fde68a);border:3px solid rgba(255,255,255,.9);
        box-shadow:0 4px 14px rgba(0,0,0,.22)}
      .pf99-hero-name{font-size:17px;font-weight:900;letter-spacing:.5px}
      .pf99-hero-sub{font-size:11px;font-weight:700;color:rgba(255,255,255,.85);margin-top:3px}
      .pf99-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
      .pf99-chip{font-size:10px;font-weight:800;padding:2.5px 9px;border-radius:999px;
        background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.38)}
      .pf99-hero-bd{position:relative;margin-top:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;
        background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:12px;padding:8px 12px;
        font-size:11.5px;font-weight:800}
      /* —— 身体数据速览 —— */
      .pf99-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
      .pf99-stat{background:#fff;border-radius:16px;padding:12px 6px 10px;text-align:center;
        border:1px solid #f1f5f9;box-shadow:0 2px 10px rgba(15,23,42,.05)}
      .pf99-stat b{display:block;font-size:20px;font-weight:900;font-variant-numeric:tabular-nums;line-height:1.2}
      .pf99-stat i{display:block;font-style:normal;font-size:10.5px;font-weight:800;color:#64748b;margin-top:3px}
      .pf99-stat small{display:block;font-size:9.5px;font-weight:700;color:#94a3b8;margin-top:1px}
      /* —— 信息行（iOS 设置风格 · 点按弹层编辑）—— */
      .pf99-sec{margin-top:18px}
      .pf99-sec-t{display:flex;align-items:baseline;gap:6px;font-size:14px;font-weight:900;color:#0f172a;margin:0 2px 9px}
      .pf99-sec-t .ico{font-size:15px}
      .pf99-sec-t em{font-style:normal;font-size:10.5px;font-weight:700;color:#94a3b8;margin-left:auto}
      .pf99-list{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #f1f5f9;box-shadow:0 2px 10px rgba(15,23,42,.05)}
      .pf99-row{display:flex;align-items:center;gap:12px;padding:13px 14px;cursor:pointer;transition:background .15s ease}
      .pf99-row:active{background:#f8fafc}
      .pf99-row + .pf99-row{border-top:1px solid #f1f5f9}
      .pf99-row-ico{width:34px;height:34px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;
        justify-content:center;font-size:16.5px}
      .pf99-row-label{font-size:13.5px;font-weight:800;color:#0f172a}
      .pf99-row-val{margin-left:auto;font-size:13px;font-weight:700;color:#64748b;text-align:right;
        max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pf99-row-val.strong{color:#0f172a;font-weight:900}
      .pf99-row .chev{color:#cbd5e1;font-size:15px;flex-shrink:0}
      .pf99-tip{font-size:10.5px;color:#94a3b8;text-align:center;margin-top:8px;line-height:1.6}
      .pf99-tip a{color:#818cf8;font-weight:800;text-decoration:none}
      /* —— 成就勋章墙 —— */
      .pf99-medals{background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 2px 10px rgba(15,23,42,.05);
        display:grid;grid-template-columns:repeat(4,1fr);gap:14px 6px;padding:16px 10px 12px}
      .pf99-medal{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer}
      .pf99-medal-disc{position:relative;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:22px;background:radial-gradient(circle at 32% 26%,var(--hi),var(--lo));border:3px solid var(--ring);
        box-shadow:0 3px 9px rgba(0,0,0,.18),inset 0 2px 3px rgba(255,255,255,.5)}
      .pf99-medal-disc::after{content:'';position:absolute;inset:4px;border-radius:50%;border:1.5px dashed rgba(255,255,255,.55)}
      .pf99-medal.t1{--hi:#fcd34d;--lo:#d97706;--ring:#b45309}
      .pf99-medal.t2{--hi:#e8edf3;--lo:#94a3b8;--ring:#64748b}
      .pf99-medal.t3{--hi:#fde68a;--lo:#f59e0b;--ring:#b45309}
      .pf99-medal.t4{--hi:#f5d0fe;--lo:#a855f7;--ring:#7e22ce}
      .pf99-medal.t4 .pf99-medal-disc{background:conic-gradient(from 210deg,#f0abfc,#818cf8,#34d399,#fbbf24,#f0abfc)}
      .pf99-medal.locked .pf99-medal-disc{background:radial-gradient(circle at 32% 26%,#e2e8f0,#cbd5e1);
        border-color:#94a3b8;box-shadow:none}
      .pf99-medal.locked .pf99-medal-disc .mi{filter:grayscale(1);opacity:.4}
      .pf99-medal-lock{position:absolute;right:-5px;bottom:-3px;font-size:10px;background:#fff;color:#64748b;
        border-radius:50%;width:17px;height:17px;display:flex;align-items:center;justify-content:center;
        box-shadow:0 1px 3px rgba(0,0,0,.28)}
      .pf99-medal-n{font-size:10px;font-weight:900;color:#0f172a;max-width:66px;text-align:center;line-height:1.3;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pf99-medal.locked .pf99-medal-n{color:#94a3b8}
      /* —— 编辑弹层 —— */
      .pf99-edit-label{font-size:12.5px;font-weight:800;color:#334155;margin-bottom:10px;line-height:1.7}
      .pf99-gsel{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .pf99-gbtn{padding:14px 0;border-radius:14px;border:2.5px solid #e2e8f0;background:#fff;
        font-size:15px;font-weight:900;color:#334155;cursor:pointer}
      .pf99-gbtn.on.m{border-color:#0ea5e9;color:#0369a1;background:#f0f9ff}
      .pf99-gbtn.on.f{border-color:#ec4899;color:#be185d;background:#fdf2f8}
      .pf99-mbti-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
      .pf99-mbti-b{padding:9px 0;border-radius:10px;border:2px solid #e2e8f0;background:#fff;
        font-size:12px;font-weight:900;color:#334155;cursor:pointer}
      .pf99-mbti-b.on{border-color:#7c3aed;background:#ede9fe;color:#5b21b6}
      .pf99-md-disc{width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:37px;margin:6px auto 12px;background:radial-gradient(circle at 32% 26%,var(--hi),var(--lo));
        border:4px solid var(--ring);box-shadow:0 6px 18px rgba(0,0,0,.22),inset 0 2px 4px rgba(255,255,255,.55);position:relative}
      .pf99-md-disc::after{content:'';position:absolute;inset:6px;border-radius:50%;border:2px dashed rgba(255,255,255,.55)}
      .pf99-md.t1{--hi:#fcd34d;--lo:#d97706;--ring:#b45309}.pf99-md.t2{--hi:#e8edf3;--lo:#94a3b8;--ring:#64748b}
      .pf99-md.t3{--hi:#fde68a;--lo:#f59e0b;--ring:#b45309}.pf99-md.t4{--hi:#f5d0fe;--lo:#a855f7;--ring:#7e22ce}
      .pf99-md.t4 .pf99-md-disc{background:conic-gradient(from 210deg,#f0abfc,#818cf8,#34d399,#fbbf24,#f0abfc)}
      .pf99-md.locked .pf99-md-disc{background:radial-gradient(circle at 32% 26%,#e2e8f0,#cbd5e1);border-color:#94a3b8;box-shadow:none}
      .pf99-md.locked .pf99-md-disc .mi{filter:grayscale(1);opacity:.4}
      .pf99-md-name{text-align:center;font-size:16px;font-weight:900;color:#0f172a}
      .pf99-md-tier{text-align:center;font-size:10.5px;font-weight:800;margin:3px 0 10px}
      .pf99-md-desc{font-size:12.5px;color:#475569;line-height:1.8;background:#f8fafc;border-radius:12px;padding:10px 12px}
      .pf99-md-prog{margin-top:12px}
      .pf99-md-prog .lb{display:flex;justify-content:space-between;font-size:11px;font-weight:800;color:#334155;margin-bottom:5px}
      .pf99-md-prog .bar{height:14px;border-radius:999px;background:#e2e8f0;overflow:hidden}
      .pf99-md-prog .bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#a5b4fc,#7c3aed);
        transition:width .5s ease}`;
    document.head.appendChild(st);
  },
  renderProfileCard() {
    this._pf99Css();
    const profile = Store.getProfile();
    // 生日：用户自填 → 否则用默认（CONFIG.profile.birthDate）
    let birth = profile.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate) ? profile.birthDate : (CONFIG.profile.birthDate || '');
    const now = new Date();
    const today = new Date(now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + 'T00:00:00');
    let earthDays = 0, age = 0, birthDays = 0, zodiac = '—', starSign = '—', birthThisYear = '—';
    if (birth) {
      const birthDate = new Date(birth + 'T00:00:00');
      earthDays = Math.floor((today - birthDate) / 86400000);
      age = Math.floor(earthDays / 365.25);
      let nextBirth = new Date(now.getFullYear() + '-' + birth.slice(5) + 'T00:00:00');
      if (nextBirth < today) nextBirth = new Date((now.getFullYear()+1) + '-' + birth.slice(5) + 'T00:00:00');
      birthDays = Math.ceil((nextBirth - today) / 86400000);
      birthThisYear = nextBirth.getFullYear() - birthDate.getFullYear();
      const zodiacs = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
      zodiac = (profile.zodiac || '') || zodiacs[((birthDate.getFullYear() - 4) % 12 + 12) % 12];
      starSign = (profile.starSign || '') || this._calcStarSign(birthDate.getMonth()+1, birthDate.getDate());
    }
    const mergedEvents = [];
    (CONFIG.festivals || []).forEach(f => mergedEvents.push({ ...f, type: 'festival' }));
    (CONFIG.solarTerms || []).forEach(s => mergedEvents.push({ ...s, type: 'solar' }));
    const upcoming = [];
    mergedEvents.forEach(e => {
      let d = new Date(now.getFullYear() + '-' + e.date + 'T00:00:00');
      if (d < today) d = new Date((now.getFullYear()+1) + '-' + e.date + 'T00:00:00');
      const days = Math.ceil((d - today) / 86400000);
      upcoming.push({ ...e, days, dateObj: d });
    });
    upcoming.sort((a, b) => a.days - b.days);
    const top6 = upcoming.slice(0, 6);
    // —— 身体数据速览：BMI / BMR / 在地球天数 ——
    const bmi = Store.getBMI();
    const bmr = Store.getBMR();
    const fort = Store.getTodayFortune();
    let baziBlock = '';
    if (profile.birthDate) {
      const b = Store.getBazi();
      baziBlock = `<div class="bazi-info">🕯️ 八字：${this.esc(b && b.bazi || '—')}；生肖：${this.esc(b && b.zodiac || '—')}；五行：金${b && b.elements?b.elements['金']:0}·木${b && b.elements?b.elements['木']:0}·水${b && b.elements?b.elements['水']:0}·火${b && b.elements?b.elements['火']:0}·土${b && b.elements?b.elements['土']:0} · 缺：${this.esc(b && b.lack || '五行俱全')}</div>`;
    } else {
      baziBlock = `<div class="bazi-info">请先填写生日，系统才会推算生辰八字与当日运势。</div>`;
    }
    let fortuneBlock = '';
    if (profile.birthDate && fort) {
      fortuneBlock = `
        <div class="fortune-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="font-weight:900;font-size:16px;color:#92400e">✨ 今日运势 · ${this.esc(fort.summary)} <span style="font-size:12px;color:#78350f;margin-left:6px">综合 ${fort.overall} / 100 · ${fort.date}</span></div>
            <div style="font-size:12px">🎨 幸运色：<b style="color:#7c2d12">${this.esc(fort.luckyColor||'—')}</b> · 🔢 幸运数字：<b>${fort.luckyNumber}</b> · 🧠 MBTI：${this.esc(fort.mbti||'未填')}</div>
          </div>
          <div class="fortune-row">
            <div class="fortune-cell"><b style="color:#be185d">${fort.love}</b><span>💕 爱情 / 人际</span></div>
            <div class="fortune-cell"><b style="color:#0369a1">${fort.career}</b><span>📚 学业 / 事业</span></div>
            <div class="fortune-cell"><b style="color:#ca8a04">${fort.wealth}</b><span>💰 财富运势</span></div>
            <div class="fortune-cell"><b style="color:#15803d">${fort.health}</b><span>💪 健康状态</span></div>
          </div>
          <div class="fortune-yj">
            <div>🌿 宜：${this.esc(fort.yi || '')}</div>
            <div>⚠️ 忌：${this.esc(fort.ji || '')}</div>
          </div>
          <div style="margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.6);font-size:12.5px;color:#14532d">🧭 MBTI 日签：${this.esc(fort.mbtiTip||'')}</div>
          ${baziBlock}
        </div>`;
    } else {
      fortuneBlock = `<div class="fortune-card" style="opacity:.85"><div style="font-size:13px;color:#78350f;line-height:1.7">✨ 填好 <b>生日</b> + <b>MBTI</b> + <b>身高 / 体重</b> 后，系统每日 0 点刷新：<ul style="margin:6px 0 0 18px;padding:0"><li>生肖 / 星座 / 生辰八字 / 五行缺项</li><li>综合 / 爱情 / 学业 / 财富 / 健康 运势分</li><li>幸运色、幸运数字、宜/忌、MBTI 日签</li><li>功能台-饮食：个性化 BMI 与热量增肌追踪</li><li>功能台-穿搭：个性化身材与幸运色穿搭推荐</li></ul></div></div>`;
    }
    // —— v2026.0905：MBTI 16 型行为处事建议卡 ——
    let mbtiBlock = '';
    const mbti = (profile.mbti || '').toUpperCase().trim();
    const mbtiAdvice = (typeof CONFIG !== 'undefined' && CONFIG.mbtiAdvice) || {};
    const validCode = /^[IE][NS][TF][JP]$/.test(mbti);
    if (validCode && mbtiAdvice[mbti]) {
      const a = mbtiAdvice[mbti];
      const dims = [
        { k: mbti[0] === 'I' ? '内向 I' : '外向 E', v: mbti[0] === 'I' ? '独处续航' : '社交充能' },
        { k: mbti[1] === 'N' ? '直觉 N' : '实感 S', v: mbti[1] === 'N' ? '未来图景' : '当下细节' },
        { k: mbti[2] === 'T' ? '思考 T' : '情感 F', v: mbti[2] === 'T' ? '逻辑决策' : '价值观共情' },
        { k: mbti[3] === 'J' ? '判断 J' : '感知 P', v: mbti[3] === 'J' ? '计划有序' : '灵活应变' },
      ];
      mbtiBlock = `
        <div class="mbti-advice-card">
          <div class="mbti-advice-head">
            <div class="mbti-advice-badge">🧠 ${mbti}</div>
            <div>
              <div class="mbti-advice-role">${a.role}</div>
              <div class="mbti-advice-core">${a.core}</div>
            </div>
          </div>
          <div class="mbti-advice-dims">${dims.map(d => `<div class="mbti-dim"><div class="mbti-dim-k">${d.k}</div><div class="mbti-dim-v">${d.v}</div></div>`).join('')}</div>
          <div class="mbti-advice-tip">💡 <b>行为处事建议：</b>${a.tip}</div>
        </div>`;
    } else if (profile.mbti && !validCode) {
      mbtiBlock = `<div class="mbti-advice-card" style="opacity:.75"><div class="mbti-advice-head"><div class="mbti-advice-badge" style="background:#f1f5f9;color:#64748b">⚠️ ${this.esc(profile.mbti)}</div><div><div class="mbti-advice-role">格式疑似错误</div><div class="mbti-advice-core">MBTI 应为 4 位字母如 INTJ / ENFP</div></div></div></div>`;
    }
    // —— v12.9.51 信息行（点按编辑 · 替代旧表格表单）——
    const female = profile.gender === '女';
    const rows = [
      { k: 'birthDate', ico: '🎂', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', label: '生日',
        val: birth ? birth.replace(/-/g, ' / ') : '未填写', strong: !!birth },
      { k: 'gender', ico: '👤', bg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', label: '性别',
        val: female ? '女' : '男', strong: true },
      { k: 'height', ico: '📏', bg: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', label: '身高',
        val: profile.height ? profile.height + ' cm' : '未填写', strong: !!profile.height },
      { k: 'weight', ico: '⚖️', bg: 'linear-gradient(135deg,#fce7f3,#fbcfe8)', label: '体重',
        val: profile.weight ? profile.weight + ' kg' : '未填写', strong: !!profile.weight },
      { k: 'mbti', ico: '🧠', bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', label: 'MBTI 人格',
        val: profile.mbti || '未填写', strong: !!profile.mbti },
      { k: 'major', ico: '🎓', bg: 'linear-gradient(135deg,#ffedd5,#fed7aa)', label: '所学专业',
        val: profile.major || '未填写（练习站题库）', strong: !!profile.major },
    ];
    // —— v12.9.51 成就勋章墙（20 枚 · 点按看详情与进度）——
    const medDefs = this._medal99Defs();
    const medS = this._medal99Stats();
    const medGot = medDefs.filter(m => (m.get(medS) || 0) >= m.goal).length;
    const medalHtml = medDefs.map((m, i) => {
      const cur = m.get(medS) || 0;
      const got = cur >= m.goal;
      return `<div class="pf99-medal t${m.tier}${got ? '' : ' locked'}" onclick="App._medal99Detail(${i})" title="${this.esc(m.n)} · ${this.esc(m.d)}">
        <div class="pf99-medal-disc"><span class="mi">${m.ico}</span>${got ? '' : '<span class="pf99-medal-lock">🔒</span>'}</div>
        <span class="pf99-medal-n">${this.esc(m.n)}</span>
      </div>`;
    }).join('');
    // 组装 HTML
    let html = `<div>
      <div class="pf99-hero">
        <div class="pf99-hero-in">
          <div class="pf99-ava">${female ? '👩' : '👨'}</div>
          <div style="min-width:0">
            <div class="pf99-hero-name">主人档案</div>
            <div class="pf99-hero-sub">${birth ? (birthThisYear + ' 岁 · ' + zodiac + ' · ' + starSign) : '完善信息，解锁专属服务'}</div>
            <div class="pf99-chips">
              ${birth ? `<span class="pf99-chip">🌍 已在地球 ${earthDays.toLocaleString()} 天</span>` : ''}
              ${birth ? `<span class="pf99-chip">🎈 生日还有 ${birthDays} 天</span>` : ''}
              ${profile.mbti ? `<span class="pf99-chip">🧠 ${this.esc(profile.mbti)}</span>` : ''}
              <span class="pf99-chip">${female ? '👩 女生' : '👨 男生'}</span>
            </div>
          </div>
        </div>
        ${birth ? `<div class="pf99-hero-bd">🎂 下一个生日还有 ${birthDays} 天 · 届时 ${birthThisYear} 周岁</div>` : `<div class="pf99-hero-bd">🪧 还没填生日——填好即解锁：运势 / 八字 / 倒计时</div>`}
      </div>

      <div class="pf99-stats">
        <div class="pf99-stat"><b style="color:${bmi ? bmi.color : '#94a3b8'}">${bmi ? bmi.value.toFixed(1) : '—'}</b><i>BMI 指数</i><small>${bmi ? bmi.label : '填身高体重后计算'}</small></div>
        <div class="pf99-stat"><b style="color:#7c3aed">${bmr ? bmr : '—'}</b><i>BMR 基础代谢</i><small>${bmr ? 'kcal / 天' : '填写档案后计算'}</small></div>
        <div class="pf99-stat"><b style="color:#0ea5e9">${birth ? earthDays.toLocaleString() : '—'}</b><i>在地球天数</i><small>${birth ? age + ' 岁' : '生日未填'}</small></div>
      </div>

      <div class="pf99-sec">
        <div class="pf99-sec-t"><span class="ico">📋</span>基本信息<em>点击任一项即可修改</em></div>
        <div class="pf99-list">
          ${rows.map(r => `<div class="pf99-row" onclick="App.pf99EditField('${r.k}')">
            <span class="pf99-row-ico" style="background:${r.bg}">${r.ico}</span>
            <span class="pf99-row-label">${r.label}</span>
            <span class="pf99-row-val${r.strong ? ' strong' : ''}">${this.esc(r.val)}</span>
            <span class="chev">›</span>
          </div>`).join('')}
        </div>
        <div class="pf99-tip">保存后自动联动：运势 / 八字 / 饮食BMI / 穿搭推荐 / 练习站专业题库 · <a href="javascript:void(0)" onclick="App.resetProfileToDefault()">恢复默认</a></div>
      </div>

      <div class="pf99-sec">
        <div class="pf99-sec-t"><span class="ico">🏅</span>成就勋章<em>已解锁 ${medGot} / ${medDefs.length}</em></div>
        <div class="pf99-medals">${medalHtml}</div>
        <div class="pf99-tip">每一枚勋章都是坚持的刻度——点击勋章查看获取条件与当前进度</div>
      </div>

      ${fortuneBlock}
      ${mbtiBlock}
      <div class="pc-section-title">📅 近期节日 / 24节气 倒数</div>
      <div class="pc-countdown-grid">`;
    top6.forEach(e => {
      const isToday = e.days === 0;
      const isTomorrow = e.days === 1;
      const label = isToday ? '就在今天！' : isTomorrow ? '明天' : `${e.days}天`;
      const cls = e.type === 'solar' ? 'pc-cd-solar' : 'pc-cd-fest';
      const urgency = e.days <= 3 ? ' pc-cd-urgent' : '';
      html += `<div class="pc-cd ${cls}${urgency}">
        <div class="pc-cd-icon">${e.icon || '📅'}</div>
        <div class="pc-cd-body">
          <div class="pc-cd-name">${this.esc(e.name)}</div>
          <div class="pc-cd-date">${e.dateObj.getMonth()+1}月${e.dateObj.getDate()}日${e.note ? ' · ' + this.esc(e.note) : ''}</div>
        </div>
        <div class="pc-cd-days">${label}</div>
      </div>`;
    });
    html += `</div></div>`;
    return html;
  },
  // ====== v12.9.51 成就勋章（20 枚 · 数据驱动实时判定 · 无需额外存储）======
  // tier：1 铜 · 2 银 · 3 金 · 4 彩（传说）；get(S) 取当前进度值，与 goal 比较即判定
  _medal99Defs() {
    return [
      { ico: '🌅', n: '初启程',     tier: 1, d: '完成人生第一次打卡——万丈高楼，起于垒土。', goal: 1,    u: '天',   get: S => S.totalDays },
      { ico: '🔥', n: '七日火种',   tier: 1, d: '连续打卡 7 天——习惯的种子开始发芽。', goal: 7,    u: '天',   get: S => S.maxStreak },
      { ico: '⚔️', n: '廿一日成',   tier: 2, d: '连续打卡 21 天——21 天养成一个习惯。', goal: 21,   u: '天',   get: S => S.maxStreak },
      { ico: '💯', n: '百日筑基',   tier: 3, d: '累计打卡 100 天——筑基已成，气自华。', goal: 100,  u: '天',   get: S => S.totalDays },
      { ico: '🌍', n: '周年独行',   tier: 4, d: '累计打卡 365 天——一整年的坚持，独行亦光芒。', goal: 365,  u: '天',   get: S => S.totalDays },
      { ico: '💪', n: '淬体入门',   tier: 1, d: '健身打卡累计 30 天。', goal: 30,   u: '天',   get: S => S.fitness },
      { ico: '🏋️', n: '淬体宗师',   tier: 3, d: '健身打卡累计 100 天——肉身即圣殿。', goal: 100,  u: '天',   get: S => S.fitness },
      { ico: '📚', n: '学海拾贝',   tier: 1, d: '学习打卡累计 30 天。', goal: 30,   u: '天',   get: S => S.study },
      { ico: '🎓', n: '博学笃行',   tier: 3, d: '学习打卡累计 100 天——博学而笃志，切问而近思。', goal: 100,  u: '天',   get: S => S.study },
      { ico: '🍚', n: '三餐有序',   tier: 2, d: '三餐打卡累计 30 天——好好吃饭是头等大事。', goal: 30,   u: '天',   get: S => S.meal },
      { ico: '💧', n: '涓滴不息',   tier: 1, d: '喝水打卡累计 30 天。', goal: 30,   u: '天',   get: S => S.water },
      { ico: '📝', n: '妙笔生花',   tier: 2, d: '累计写下 30 篇日记——笔耕不辍。', goal: 30,   u: '篇',   get: S => S.diary },
      { ico: '🧘', n: '心如止水',   tier: 2, d: '聚神专注累计 1000 分钟。', goal: 1000, u: '分钟', get: S => S.focusMin },
      { ico: '📖', n: '阅读万里',   tier: 2, d: '累计阅读 1000 分钟——读万卷书如行万里路。', goal: 1000, u: '分钟', get: S => S.readMin },
      { ico: '💰', n: '精打细算',   tier: 1, d: '记账累计 30 天——每一笔都算数。', goal: 30,   u: '天',   get: S => S.ledgerDays },
      { ico: '👹', n: '初斩魔物',   tier: 1, d: '首次讨伐月度魔物——山谷初胜。', goal: 1,    u: '次',   get: S => S.bossWins },
      { ico: '🐉', n: '三斩魔龙',   tier: 2, d: '累计讨伐月度魔物 3 次。', goal: 3,    u: '次',   get: S => S.bossWins },
      { ico: '🗡️', n: '魔物终结者', tier: 4, d: '累计讨伐月度魔物 12 次——一年十二个月，月月皆斩。', goal: 12,   u: '次',   get: S => S.bossWins },
      { ico: '🔒', n: '封魔战士',   tier: 2, d: '四魔封印（正气/正心/正姿/正魂/正言）任一连续未破 7 天。', goal: 7,    u: '天',   get: S => S.quitStreak },
      { ico: '⭐', n: '独行者',     tier: 3, d: '独行信条等级达到 Lv.10——十级孤独，十级强大。', goal: 10,   u: '级',   get: S => S.rpgLv },
    ];
  },
  // 勋章进度数据（实时从各域汇总：习惯/日记/阅读/记账/魔物/封印/独行信条）
  _medal99Stats() {
    const S = { totalDays: 0, maxStreak: 0, fitness: 0, study: 0, meal: 0, water: 0, diary: 0,
      focusMin: 0, readMin: 0, ledgerDays: 0, bossWins: 0, quitStreak: 0, rpgLv: 0 };
    try {
      const h = Store.getHabit99();
      const touched = (v) => Array.isArray(v) ? v.length > 0 : !!(v && (v.ts || v.makeup || v.done));
      const keys = Array.from(new Set(Object.keys(h.days || {}).concat(Object.keys(h.archive || {})))).sort();
      const dayMs = (k) => new Date(k + 'T00:00:00').getTime();
      let run = 0, prev = null;
      keys.forEach(k => {
        const day = Store._h99DayRead(h, k) || {};
        if (!Object.keys(day).some(cid => touched(day[cid]))) return;
        S.totalDays++;
        if (prev !== null && dayMs(k) - dayMs(prev) === 86400000) run++; else run = 1;
        if (run > S.maxStreak) S.maxStreak = run;
        prev = k;
        if (touched(day.fitness)) S.fitness++;
        if (['studyMorning', 'studyNoon', 'studyEvening'].some(x => touched(day[x]))) S.study++;
        if (['breakfast', 'lunch', 'dinner'].some(x => touched(day[x]))) S.meal++;
        if (touched(day.water)) S.water++;
        (day.focus || []).forEach(f => { S.focusMin += (+f.durationMin || 0); });
      });
    } catch (e) {}
    try { S.diary = (Store.getDiaries() || []).length; } catch (e) {}
    try { const wb = Store.getWorkbench(); S.readMin = Math.floor((((wb.read || {}).totalMs) || 0) / 60000); } catch (e) {}
    try { S.ledgerDays = new Set((Store.getLedger() || []).map(x => x.date)).size; } catch (e) {}
    try { S.bossWins = Object.keys(((this._boss99Data() || {}).wins) || {}).length; } catch (e) {}
    try {
      ['zhengqi', 'zhengxin', 'posture', 'zhenghun', 'zhengyan'].forEach(cid => {
        const s = Store.habit99CleanStreak(cid); if (s > S.quitStreak) S.quitStreak = s;
      });
    } catch (e) {}
    try { S.rpgLv = this._rpg99ExpProg(this._rpg99Data().exp).lv; } catch (e) {}
    return S;
  },
  // 勋章详情（点按勋章弹出：图标 + 稀有度 + 条件 + 当前进度条）
  _medal99Detail(i) {
    const m = this._medal99Defs()[i];
    if (!m) return;
    const cur = m.get(this._medal99Stats()) || 0;
    const got = cur >= m.goal;
    const pct = Math.min(100, Math.round(cur / m.goal * 100));
    const TIER = { 1: ['铜 · 常见', '#b45309'], 2: ['银 · 稀有', '#64748b'], 3: ['金 · 史诗', '#b45309'], 4: ['彩 · 传说', '#7e22ce'] };
    const tn = TIER[m.tier] || TIER[1];
    this._sfx99 && this._sfx99(got ? 'success' : 'popup');
    this._modal({
      title: '🏅 ' + m.n + (got ? '（已解锁）' : ''),
      body: `
        <div class="pf99-md t${m.tier}${got ? '' : ' locked'}">
          <div class="pf99-md-disc"><span class="mi">${m.ico}</span></div>
          <div class="pf99-md-name">${this.esc(m.n)}</div>
          <div class="pf99-md-tier" style="color:${tn[1]}">${got ? '✅ 已解锁 · ' : ''}${tn[0]}</div>
          <div class="pf99-md-desc">${this.esc(m.d)}</div>
          <div class="pf99-md-prog">
            <div class="lb"><span>当前进度</span><span>${Math.min(cur, m.goal)} / ${m.goal} ${m.u}</span></div>
            <div class="bar"><i style="width:${pct}%"></i></div>
            <div style="text-align:center;font-size:11px;font-weight:800;color:${got ? '#15803d' : '#64748b'};margin-top:8px">
              ${got ? '🎉 已达成——继续坚持下一枚！' : '再坚持一下，勋章就到手了'}
            </div>
          </div>
        </div>`,
      actions: [{ label: '关闭', onClick: null }],
    });
  },
  _calcStarSign(m, d) {
    const stars = [[1,20,'水瓶座♒'],[2,19,'双鱼座♓'],[3,21,'白羊座♈'],[4,20,'金牛座♉'],[5,21,'双子座♊'],[6,22,'巨蟹座♋'],[7,23,'狮子座♌'],[8,23,'处女座♍'],[9,23,'天秤座♎'],[10,24,'天蝎座♏'],[11,23,'射手座♐'],[12,22,'摩羯座♑']];
    let pick = stars[0][2];
    for (let i = stars.length - 1; i >= 0; i--) {
      if ((m > stars[i][0]) || (m === stars[i][0] && d >= stars[i][1])) { pick = stars[i][2]; break; }
    }
    return pick;
  },
  // ====== v12.9.51 信息行编辑（点按单项弹层 · 替代旧表单的保存入口）======
  _pf99MajorList: ['计算机科学与技术','软件工程','物联网工程','大数据技术','人工智能','信息安全','护理学','助产','会计学','财务管理','审计学','学前教育','汉语言文学','文秘','法学','机械设计制造及其自动化','机电一体化','车辆工程','电气工程及其自动化','电子信息工程','自动化','通信工程','土木工程','建筑工程','工程管理','工程造价','药学','中药学','制药工程','工商管理','市场营销','人力资源管理','物流管理','旅游管理','酒店管理','电子商务','跨境电子商务'],
  pf99EditField(k) {
    this._pf99Css();
    const p = Store.getProfile();
    this._pf99EditK = k;
    let title = '', body = '';
    if (k === 'gender') {
      this._pf99Gender = p.gender === '女' ? '女' : '男';
      title = '性别';
      body = `<div class="pf99-edit-label">选择你的性别（影响形象 / 女生专属功能 / 穿搭与 BMR 建议）</div>
        <div class="pf99-gsel">
          <button class="pf99-gbtn m${this._pf99Gender === '男' ? ' on' : ''}" id="pf99gM" onclick="App._pf99PickGender('男')">👨 男</button>
          <button class="pf99-gbtn f${this._pf99Gender === '女' ? ' on' : ''}" id="pf99gF" onclick="App._pf99PickGender('女')">👩 女</button>
        </div>`;
    } else if (k === 'mbti') {
      this._pf99Mbti = p.mbti || '';
      const opts = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
      title = 'MBTI 人格';
      body = `<div class="pf99-edit-label">选择你的人格类型（16 型 · 影响日签与行为建议）</div>
        <div class="pf99-mbti-grid">
          ${opts.map(m => `<button class="pf99-mbti-b" id="pf99m_${m}" onclick="App._pf99PickMbti('${m}')">${m}</button>`).join('')}
        </div>`;
    } else {
      const F = {
        birthDate: ['生日', 'date', p.birthDate || '', '（填好即解锁：运势 / 八字 / 倒计时）'],
        height: ['身高', 'number', p.height || '', 'step="0.1" min="0" placeholder="单位 cm（如 175）"（BMI 与 BMR 的计算依据）'],
        weight: ['体重', 'number', p.weight || '', 'step="0.1" min="0" placeholder="单位 kg（如 65）"（BMI 与 BMR 的计算依据）'],
        major: ['所学专业', 'text', p.major || '', 'maxlength="20" placeholder="如：计算机科学与技术" list="pf99MajorDl"（练习站按此生成专业课题库）'],
      }[k];
      if (!F) return;
      title = F[0];
      body = `<input class="input" id="pf99Input" type="${F[1]}" value="${this.esc(F[2])}" ${F[3]}>
        ${k === 'major' ? `<datalist id="pf99MajorDl">${this._pf99MajorList.map(m => `<option value="${m}"></option>`).join('')}</datalist>` : ''}
        <div style="font-size:10.5px;color:#94a3b8;margin-top:8px">保存后自动联动刷新相关功能</div>`;
    }
    this._modal({
      title,
      body,
      actions: [
        { label: '取消', onClick: null },
        { label: '💾 保存', primary: true, keep: true, onClick: () => App.pf99SaveField() },
      ],
    });
  },
  _pf99PickGender(g) {
    this._pf99Gender = g;
    const m = document.getElementById('pf99gM');
    const f = document.getElementById('pf99gF');
    if (m) m.classList.toggle('on', g === '男');
    if (f) f.classList.toggle('on', g === '女');
  },
  _pf99PickMbti(m) {
    this._pf99Mbti = this._pf99Mbti === m ? '' : m;
    const opts = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
    opts.forEach(o => { const el = document.getElementById('pf99m_' + o); if (el) el.classList.toggle('on', this._pf99Mbti === o); });
  },
  pf99SaveField() {
    const k = this._pf99EditK;
    const patch = {};
    if (k === 'gender') patch.gender = this._pf99Gender || '男';
    else if (k === 'mbti') patch.mbti = (this._pf99Mbti || '').toUpperCase().slice(0, 4);
    else {
      const el = document.getElementById('pf99Input');
      if (!el) return;
      const v = el.value;
      if (k === 'birthDate') patch.birthDate = (v || '').slice(0, 10);
      else if (k === 'height') patch.height = Math.max(0, parseFloat(v) || 0);
      else if (k === 'weight') patch.weight = Math.max(0, parseFloat(v) || 0);
      else if (k === 'major') patch.major = (v || '').slice(0, 20);
    }
    const r = Store.setProfile(patch);
    if (r.ok) {
      if (k === 'major') this._qz99Sets = null; // 专业变更 → 清练习站题组缓存（专业课组随档案重建）
      try { this._sfx99 && this._sfx99('success'); } catch (e) {}
      this._flash('✅ 已保存：' + (patch.birthDate ? '生日' : patch.gender ? '性别' : patch.height ? '身高' : patch.weight ? '体重' : patch.mbti !== undefined ? 'MBTI' : '专业') + '已更新，相关功能联动刷新');
      this._closeModal();
      this.render_dashboard && this.render_dashboard();
      this.render_workbench && this.render_workbench();
    } else {
      this._flash(r.msg || '保存失败');
      return false; // 保持弹层打开
    }
  },
  resetProfileToDefault() {
    if (!confirm('确认恢复默认档案？将清空生日 / MBTI / 身高体重 / 性别 / 专业（相关联动功能将回到初始状态）')) return;
    const bd = (CONFIG.profile && CONFIG.profile.birthDate) ? CONFIG.profile.birthDate : '';
    const h = (CONFIG.profile && CONFIG.profile.height) || 0;
    const w = (CONFIG.profile && CONFIG.profile.weight) || 0;
    Store.setProfile({ birthDate: bd, mbti: '', height: h, weight: w, gender: '男', major: '' }); // v12.9.3 major 一并清空
    this._qz99Sets = null; // 清空练习站题组缓存（专业课题库随档案重建）
    this._flash('已恢复默认档案：' + (bd || '无默认生日'));
    this.render_workbench && this.render_workbench();
  },
});
