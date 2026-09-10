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
    document.getElementById('view-dashboard').innerHTML = html;
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
          <button class="hero99-ava" onclick="App.afuChatOpen()" title="管家阿福 · 点击对话">${this._afu99AvatarHtml(30)}</button>
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

  // ====== 个人档案（数据中心「主人档案」使用；v12.7 已不在首页渲染）======
  renderProfileCard() {
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
    // —— 自填表单（生日 / MBTI / 身高 / 体重 / 性别）+ 保存按钮 ——
    const mbtiOpts = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
    const mbtiVal = profile.mbti || '';
    const formHtml = `
      <div class="pf-edit" style="margin-bottom:10px">
        <label>生日 <input type="date" id="pf_birth" value="${this.esc(birth)}" /></label>
        <label>MBTI
          <select id="pf_mbti">
            <option value="">（未填）</option>
            ${mbtiOpts.map(m => `<option value="${m}" ${mbtiVal===m?'selected':''}>${m}</option>`).join('')}
          </select>
        </label>
        <label>身高 (cm) <input type="number" id="pf_height" min="0" step="0.1" value="${profile.height||0}" /></label>
        <label>体重 (kg) <input type="number" id="pf_weight" min="0" step="0.1" value="${profile.weight||0}" /></label>
        <label class="span2">所学专业（练习站按此生成专业课题库）
          <input id="pf_major" list="pf_major_dl" maxlength="20" placeholder="如：计算机科学与技术 / 护理学 / 会计学" value="${this.esc(profile.major || '')}">
          <datalist id="pf_major_dl">
            ${['计算机科学与技术','软件工程','物联网工程','大数据技术','人工智能','信息安全','护理学','助产','会计学','财务管理','审计学','学前教育','汉语言文学','文秘','法学','机械设计制造及其自动化','机电一体化','车辆工程','电气工程及其自动化','电子信息工程','自动化','通信工程','土木工程','建筑工程','工程管理','工程造价','药学','中药学','制药工程','工商管理','市场营销','人力资源管理','物流管理','旅游管理','酒店管理','电子商务','跨境电子商务'].map(m => `<option value="${m}"></option>`).join('')}
          </datalist>
        </label>
        <label class="span2">性别
          <select id="pf_gender">
            <option value="男" ${(profile.gender||'男')==='男'?'selected':''}>男</option>
            <option value="女" ${profile.gender==='女'?'selected':''}>女</option>
          </select>
        </label>
        <div class="span2" style="display:flex;gap:6px;justify-content:flex-end;margin-top:4px">
          <button class="btn btn-ghost" onclick="App.resetProfileToDefault()">恢复默认</button>
          <button class="btn btn-primary" onclick="App.saveProfileFromForm()">💾 保存档案（将更新运势 / 饮食BMI / 穿搭推荐）</button>
        </div>
      </div>`;
    // —— 三大指标：BMI / BMR / 档案未填提示 ——
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
    const metaStats = `
      <div class="pf-stats-mini">
        <div class="pf-stat-mini"><span>BMI（体重 ÷ 身高²）</span><b style="color:${bmi?bmi.color:'#64748b'}">${bmi?bmi.value.toFixed(1):'—'}</b><span>${bmi?bmi.label:'请先填身高/体重'}</span></div>
        <div class="pf-stat-mini"><span>BMR 基础代谢</span><b>${bmr?bmr:'—'}</b><span>${bmr?bmi?bmi.tip:'Mifflin-St Jeor 估算':'填写档案后自动计算'}</span></div>
        <div class="pf-stat-mini"><span>MBTI / 生日档案</span><b>${this.esc(profile.mbti||'未填')}</b><span>${profile.birthDate? '已设置 '+profile.birthDate : '生日未填'}</span></div>
      </div>`;
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
    // 组装 HTML
    let html = `<div class="profile-card">
      <div class="pc-head">
        <div class="pc-avatar">🎂</div>
        <div class="pc-info">
          <div class="pc-name">我的生命征程 · 用户自填档案（支持多账号个性化）</div>
          <div class="pc-meta">${birth ? (birth.slice(0,4)+'年'+birth.slice(5,7)+'月'+birth.slice(8,10)+'日 · '+zodiac+' · '+starSign+' · '+age+'岁（将满 '+birthThisYear+'岁，倒计时 '+birthDays+' 天）') : '🪧 请先在下方保存生日信息，倒计时与运势将即时生效。'}</div>
        </div>
      </div>
      ${formHtml}
      ${metaStats}
      <div class="pc-stats">
        <div class="pc-stat">
          <div class="pc-stat-num">${birth ? earthDays.toLocaleString() : '—'}</div>
          <div class="pc-stat-label">🌍 在地球存在（天）</div>
        </div>
        <div class="pc-stat">
          <div class="pc-stat-num">${birth ? age : '—'}</div>
          <div class="pc-stat-label">🎂 年龄（岁）</div>
        </div>
        <div class="pc-stat pc-stat-highlight">
          <div class="pc-stat-num">${birth ? birthDays : '—'}</div>
          <div class="pc-stat-label">🎈 距下一个生日（天）</div>
        </div>
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
  _calcStarSign(m, d) {
    const stars = [[1,20,'水瓶座♒'],[2,19,'双鱼座♓'],[3,21,'白羊座♈'],[4,20,'金牛座♉'],[5,21,'双子座♊'],[6,22,'巨蟹座♋'],[7,23,'狮子座♌'],[8,23,'处女座♍'],[9,23,'天秤座♎'],[10,24,'天蝎座♏'],[11,23,'射手座♐'],[12,22,'摩羯座♑']];
    let pick = stars[0][2];
    for (let i = stars.length - 1; i >= 0; i--) {
      if ((m > stars[i][0]) || (m === stars[i][0] && d >= stars[i][1])) { pick = stars[i][2]; break; }
    }
    return pick;
  },
  saveProfileFromForm() {
    const patch = {};
    const $ = id => document.getElementById(id);
    const bd = $('pf_birth'); if (bd) patch.birthDate = (bd.value || '').slice(0,10);
    const mt = $('pf_mbti'); if (mt) patch.mbti = mt.value || '';
    const hh = $('pf_height'); if (hh) patch.height = parseFloat(hh.value || 0);
    const ww = $('pf_weight'); if (ww) patch.weight = parseFloat(ww.value || 0);
    const gd = $('pf_gender'); if (gd) patch.gender = gd.value || '男';
    const mj = $('pf_major'); if (mj) patch.major = (mj.value || '').slice(0, 20); // v12.9.3 所学专业 → 练习站专业课题库
    const r = Store.setProfile(patch);
    if (r.ok) {
      if (mj && typeof patch.major === 'string') this._qz99Sets = null; // 专业变更 → 清练习站题组缓存（专业课组随档案重建）
      this._flash('✅ 档案保存成功：倒计时、运势、饮食BMI、穿搭推荐已全部联动刷新' + (mj ? '；练习站专业课已按「' + this.esc(patch.major || '（空）') + '」更新' : '') + '。');
      this.render_dashboard && this.render_dashboard(); this.render_workbench && this.render_workbench();
    }
    else this._flash(r.msg || '保存失败');
  },
  resetProfileToDefault() {
    const bd = (CONFIG.profile && CONFIG.profile.birthDate) ? CONFIG.profile.birthDate : '';
    const h = (CONFIG.profile && CONFIG.profile.height) || 0;
    const w = (CONFIG.profile && CONFIG.profile.weight) || 0;
    Store.setProfile({ birthDate: bd, mbti: '', height: h, weight: w, gender: '男', major: '' }); // v12.9.3 major 一并清空
    this._qz99Sets = null; // 清空练习站题组缓存（专业课题库随档案重建）
    this._flash('已恢复默认档案：' + (bd || '无默认生日'));
    this.render_workbench && this.render_workbench();
  },
});
