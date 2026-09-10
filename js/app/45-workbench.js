// 45-workbench.js —— 板块子页路由（习惯/记录/空间）/ 链接板块 / 每日速推 / 新闻 / 管家阿福 NPC（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G8-首页导航（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// v10.0：旧版板块聚合首页已删除——习惯/记录/空间由底栏 5 tab 直达；寄语卡迁首页；系统日志卡迁空间页
Object.assign(App, {
  // ====== 板块子页路由（v10.0 起无 home 视图，默认习惯页） ======
  _wbView: 'habit', // habit/record/me/ledger/diary/todo/read_en/read_sc/outfit/memory...
  _wbReadTick: null,
  // v12.9.31d 【独行者同款背景】白名单：凡声明使用红白渐变整页背景的子页，往这里加视图名即可
  //   （styles.css body.bg-rpg-red 提供通用红白渐变；目前：rpg99 个人中心）
  RPG99_SKIN_VIEWS: { rpg99: 1, home99: 1 }, // v12.9.32 空间页（独行据点）同享独行者红白渐变
  render_workbench() {
    const view = this._wbView || 'habit';
    // 清理阅读计时器
    if (view !== 'read_en' && view !== 'read_sc') this._stopWbReadTick();
    // v11.0 宠物同步钩子（挑战强联动 + 精力负荷预警弹窗；沙箱态自动跳过）
    try { if (this.pet99Sync) this.pet99Sync(); } catch (e) {}
    // v12.9.31 独行信条同步钩子（经验/宝石懒结算：打卡/记账后随视图渲染自动到账；沙箱态自动跳过）
    try { if (this.rpg99Sync) this.rpg99Sync(); } catch (e) {}
    // v12.9.31d 【独行者同款背景】通用换肤：白名单子页挂 bg-rpg-red（红白渐变铺满全页），其余一律卸载。
    //   关键修复：必须同时满足 currentView==='workbench' 才挂——回首页后云同步/档案保存等异步触发
    //   render_workbench() 时 _wbView 可能残留 'rpg99'，无条件 toggle 会误挂类，导致首页背景不恢复轻氧绿白
    // v12.9.40 戒断数据页（数据中心 → 戒断数据 tab）同享独行者红白渐变
    const skinOn = this.currentView === 'workbench'
      && (!!this.RPG99_SKIN_VIEWS[view]
        || (view === 'datacenter99' && this._dc99 && this._dc99.tab === 'quit99'));
    try {
      document.body.classList.toggle('bg-rpg-red', skinOn);
      document.body.classList.toggle('mode-rpg99', skinOn); // 兼容别名（与 bg-rpg-red 同规则）
    } catch (e) {}
    // v12.9.46 【挑战中心】红+绿+白混合渐变整页背景（重做版 · 用户指定页面级 app 背景）
    const chalOn = this.currentView === 'workbench' && view === 'challenge99';
    try { document.body.classList.toggle('bg-chal99', chalOn); } catch (e) {}
    // v12.9.46 【月度魔物】魔窟整页背景：暗谷雷暴深色（与山谷场景同一世界观）
    const bossOn = this.currentView === 'workbench' && view === 'boss99';
    try { document.body.classList.toggle('bg-boss99', bossOn); } catch (e) {}
    // v12.9.46 月度魔物战鼓音乐：仅魔窟页播放，离开即停（避免后台残留轰鸣）
    try { if (view !== 'boss99' && this._boss99Leave) this._boss99Leave(); } catch (e) {}
    const wb = Store.getWorkbench();
    const W = CONFIG.workbench || {};
    const html = `
      ${this._renderWbHeader(view)}
      ${this._wbBody(view, wb, W)}
    `;
    const el = document.getElementById('view-workbench');
    // v12.8 滚动位置保持：同视图重渲染（打卡/保存/展开等操作后）不再异常跳回顶部；仅切换视图时回顶
    const sameView = this._wbRenderView === view;
    const savedY = window.scrollY || window.pageYOffset || 0;
    if (el) el.innerHTML = html;
    this._wbRenderView = view;
    // v12.9.35 场景行为引擎绑定：小家小银自动行为（蜷睡/舔爪/撒娇+彩蛋 · 22:00–06:00 夜间睡眠）/
    //   宠物页动作自动循环（点击=彩蛋 · 夜间睡眠）/ 个人中心战士 3D（拖拽旋转+点击攻击）
    try {
      if (view === 'home99') this._home99CatEngineStart(); else this._home99CatEngineStop();
      if (view === 'pet99') this._pet99AutoStart(); else this._pet99AutoStop();
      if (view === 'rpg99' && this.rpg99Hero3dBind) this.rpg99Hero3dBind();
      // v12.9.40 戒断数据：数据中心 → 戒断数据页的四魔物 3D 交互（拖拽旋转/单击挑逗/长按属性）
      if (view === 'datacenter99' && this._dc99 && this._dc99.tab === 'quit99' && this.quit99Bind) this.quit99Bind();
      // v12.9.46 月度魔物：魔窟页场景引擎（战鼓音乐 + 咆哮循环 + 雷鸣）
      if (view === 'boss99' && this._boss99SceneStart) this._boss99SceneStart();
    } catch (e) {}
    // v12.9.36 手机适配：横竖屏旋转后小家按新视口重渲染（窄/横版布局与 scene viewBox 切换）。
    //   全局只绑一次（__wbResizeBound 守卫）；仅小家在屏时生效，防抖 300ms 避开旋转动画中途值
    try {
      if (!this.__wbResizeBound) {
        this.__wbResizeBound = 1;
        let __wbResizeT = 0;
        window.addEventListener('resize', () => {
          if (this._wbView !== 'home99' || this.currentView !== 'workbench') return;
          clearTimeout(__wbResizeT);
          __wbResizeT = setTimeout(() => {
            if (this._wbView === 'home99' && this.currentView === 'workbench') this.render_workbench();
          }, 300);
        });
      }
    } catch (e) {}
    // 绑定阅读计时器
    if (view === 'read_en' || view === 'read_sc') {
      this._startWbReadTick();
    }
    try {
      if (sameView) window.scrollTo({ top: savedY, behavior: 'instant' }); // 原位保持（瞬时：html 全局 smooth 会让恢复产生二次滑动）
      else window.scrollTo({ top: 0, behavior: 'instant' });               // 切换视图回顶
    } catch (e) {}
  },
  _renderWbHeader(view, opts) {
    opts = opts || {};
    // v12.7：习惯/记录/空间已是 dock 圆形导航的直达页——顶部「返回首页」按钮删除（左下角 dock 常驻）
    if (opts.skipHome) return '';
    const DOCK_VIEWS = { habit: 1, record: 1, home99: 1, rpg99: 1 }; // rpg99：个人中心自带悬浮返回按钮（v12.9.31b）
    if (DOCK_VIEWS[view]) return '';
    return `<div style="margin-bottom:10px">
      <button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button>
    </div>`;
  },
  gotoWb(k) {
    // v12.1 归心模式：界面固定在首页——板块子页入口一律拦下（回轻氧后恢复自由）
    if (this._mode99 === 'guixin') {
      this._flash('🌙 归心模式中，界面停在首页——点「轻氧」回去，再到处走走');
      return;
    }
    // v10.0：旧聚合首页已删除——旧入口 gotoWb('home') 一律安全重定向到底栏「首页」
    if (!k || k === 'home') { this._navNoPush(() => this.navigate('dashboard')); return; }
    // v12.9 历史入栈（同子页重复点击不入栈；数据中心除外——它会把子库重置回 home，属于真实导航）
    const samePage = this.currentView === 'workbench' && this._wbView === k
      && (k !== 'datacenter99' || !this._dc99 || this._dc99.tab === 'home');
    if (!samePage) this._navPush();
    this._wbView = k;
    // v6.9 数据中心三库整合：点击【数据中心】总是先出现三张卡（习惯数据/经济数据/就医数据），再点卡进入对应库
    if (k === 'datacenter99' && this._dc99) this._dc99.tab = 'home';
    // v2026.0905 修复兜底：若当前不在板块子页视图容器（书签直达/异常路径），先激活该容器再渲染子页
    if (this.currentView !== 'workbench') {
      this.currentView = 'workbench';
      try { document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-workbench')); } catch(e){}
      // v12.7 dock 圆形导航：习惯/记录/空间子页高亮对应按钮；其余子页统一高亮「习惯」兜底
      const TAB_OF_WB = { habit: 'habit', record: 'record', me: 'space', home99: 'space', garden99: 'space', homeShop99: 'space', rpg99: 'space', dream99: 'record', drift99: 'record', vault99: 'record', ta99: 'record' };
      const hi = TAB_OF_WB[k] || 'habit';
      try { document.querySelectorAll('.dock99-btn').forEach(t => t.classList.toggle('active', t.dataset.view === hi)); } catch(e){}
    }
    this.render_workbench();
  },
  _wbBody(view, wb, W) {
    // v11.5 阿福陪伴：记录板块全子页统一注入「管家阿福」陪伴卡（顶部一张，角色化+数据感知+专属服务）。
    // 灵光/憾潮已有各自深度定制的阿福卡（回响/陪打），不在注入清单里；异常时静默降级为原样返回。
    const body = this._wbBodyRaw(view, wb, W);
    try {
      if (this._afu99RecPages && this._afu99RecPages.indexOf(view) !== -1 && this._afu99Rec) {
        return this._afu99Rec(view, W) + body;
      }
    } catch (_) {}
    return body;
  },
  _wbBodyRaw(view, wb, W) {
    switch (view) {
      case 'habit': return this._wbHabit(wb, W);
      case 'datacenter99': return this._wbDataCenter99(wb, W); // v3.3 数据中心（近7日统计升级）
      case 'sport99': return this._wbSport99(wb, W); // v12.9 运动数据：分析站 + 教学站（86-sport99.js）
      case 'study99': return this._wbStudy99(wb, W); // v12.9 学习数据：记录站 + 练习站（87-study99.js）
      case 'record': return this._wbRecord(wb, W);
      case 'ta99': return this._wbTa99(wb, W); // v12.8 Ta·情侣空间：邀请码绑定·共享·情侣签到·纪念日·互相打卡（85-ta99.js）
      case 'sparks99': return this._wbSparks99(wb, W); // v11.2 灵光：灵光乍现时刻（无需完成的憧憬）
      case 'regrets99': return this._wbRegrets99(wb, W); // v11.3 憾潮：后悔的事·殴打发泄
      case 'footprints99': return this._wbFootprints99(wb, W); // v11.3 足迹：走过的中国·34省点亮
      case 'dream99': return this._wbDream99(wb, W); // v11.9 拾梦：醒来速记梦境·语音/文字·阿福AI整理（76-dream99.js）
      case 'drift99': return this._wbDrift99(wb, W); // v12.0 漂流：烦恼封瓶·海洋打捞·放生释怀（77-drift99.js）
      case 'vault99': return this._wbVault99(wb, W); // v12.2 密码箱：秘密安放·健康隐私分区·密码接管（81-vault99.js）
      case 'notes99': return this._wbNotes99(wb, W); // v12.9.5 铭记（原「记事」· 人生大事）
      case 'readingNotes': return this.readingNotesPage();   // v12.9.5 读感（原「阅读笔记」· 68-focus-notes.js）
      case 'challenge99': return this.challenge99Page();      // v12.9.46 重做：红绿白渐变 · 月度魔物+原生挑战双卡不对称（68-focus-notes.js）
      case 'boss99': return this.boss99Page();                // v12.9.46 月度魔物 · 山谷Boss讨伐（98-boss99.js）
      case 'weather99': return this.weather99Page();          // v12.9.46 独行天气 · 预报/气候数据/24节气倒数（99-weather99.js）
      case 'pet99': return this.pet99Page();                 // v11.0 宠物主页 + 每日精力负荷（70-pet.js）
      case 'pet99Shop': return this.pet99ShopPage();          // v11.0 宠物商城·宝石购买（70-pet.js）
      case 'rpg99': return this._wbRpg99(wb, W);             // v12.9.31 个人中心 · 独行资料（92-rpg99.js · 全程像素风）
      case 'home99': return this._wbHome99(wb, W);            // v11.8 小家：房间主场景（75-home99.js）
      case 'garden99': return this._wbGarden99(wb, W);       // v11.8 小家：花园养花
      case 'homeShop99': return this._wbHomeShop99(wb, W);    // v11.8 小家：小家商城（花种子/装饰/盆位）
      case 'reflect99': { if (this._dc99) this._dc99.tab = 'reflect99'; return this._wbDataCenter99(wb, W); } // v12.9.11 反省数据（原「反省中心」→ 数据中心 tab，旧书签安全重定向）
      case 'illness99': return this._wbIllness99(wb, W); // v6.9 就医数据（自【记录】迁入，v12.2 感染科迁密码箱）
      case 'dailylog99': { if (this._dc99) this._dc99.tab = 'health99'; return this._wbDataCenter99(wb, W); } // v12.9.11 健康数据（原「智慧中心」→ 数据中心 tab，旧书签安全重定向）
      case 'modelOrgan': return this._wbModelOrgan(wb, W); // v2026.0906 两大模型专页：五脏六腑
      // v12.9：case 'modelFit'（健身六分化专页）已删除——迁至【数据中心 → 运动数据】
      case 'modelMeta':  return this._wbModelMeta(wb, W);  // v2026.0906 两大模型专页：消化代谢
      case 'report99': { if (this._dc99) this._dc99.tab = 'report99'; return this._wbDataCenter99(wb, W); } // v12.9.11 报告数据（原「报告中心」→ 数据中心 tab，旧书签安全重定向）
      case 'me': return this._wbHome99(wb, W); // v11.8：原「空间·我」页升级为小家（旧书签安全重定向；档案迁数据中心、系统日志迁同步页）
      case 'ledger': return this._wbLedger(wb, W);
      case 'diary': return this._wbDiary(wb, W);
      case 'todo': return this._wbTodo(wb, W);
      case 'countdown': return this._wbCountdown(wb, W); // v6.8 倒数日（自待办拆出）
      case 'memorial': return this._wbMemorial(wb, W);  // v6.8 纪念日
      case 'read_en': return this._wbRead('English', (W.readEnglish||[]), W, { clickableWords: true });
      case 'read_sc': return this._wbRead('Science', (W.readScience||[]), W);
      case 'outfit': return this._wbOutfit(W);
      case 'memory': return this._wbMemory(wb, W);
      // v12.3 【格物】图书馆（原 links 学科知识导航 图书馆化）
      case 'gewu99':   return this._wbGewu99(wb, W);
      // v12.3 【致知】收音机（原新闻速递 电台化）
      case 'zhizhi99': return this._wbZhizhi99(wb, W);
      // ===== v12.3 旧路由兼容重定向（书签不失效）=====
      case 'links':     return this._wbLinks(wb, W); // 旧链接板保留（书签兼容；入口卡已拆为格物/致知）
      case 'ln_en':   { this._gw99RedirectShelf('en');   return this._wbGewu99(wb, W); }
      case 'ln_pol':   { this._gw99RedirectShelf('pol');   return this._wbGewu99(wb, W); }
      case 'ln_math':  { this._gw99RedirectShelf('math');  return this._wbGewu99(wb, W); }
      case 'ln_cs':    { this._gw99RedirectShelf('cs');    return this._wbGewu99(wb, W); }
      case 'ln_law':    { this._gw99RedirectShelf('law');    return this._wbGewu99(wb, W); }
      case 'ln_med':   { this._gw99RedirectShelf('med');   return this._wbGewu99(wb, W); }
      case 'ln_life':   { this._gw99RedirectShelf('life');   return this._wbGewu99(wb, W); }
      case 'ln_psy':   { this._gw99RedirectShelf('psy');   return this._wbGewu99(wb, W); }
      case 'news_politics':     { this._zz99On = 'politics';     this._zz99Idx = 0; return this._wbZhizhi99(wb, W); }
      case 'news_international':{ this._zz99On = 'international'; this._zz99Idx = 0; return this._wbZhizhi99(wb, W); }
      case 'news_economy':      { this._zz99On = 'economy';      this._zz99Idx = 0; return this._wbZhizhi99(wb, W); }
      case 'news_livelihood':   { this._zz99On = 'livelihood';   this._zz99Idx = 0; return this._wbZhizhi99(wb, W); }
      case 'news_scitech':      { this._zz99On = 'scitech';      this._zz99Idx = 0; return this._wbZhizhi99(wb, W); }
      case 'news_foreign':      { this._zz99On = 'foreign';      this._zz99Idx = 0; return this._wbZhizhi99(wb, W); }
      // P6：第16 卡 生活科普（每日0点固定刷新6张）；文学欣赏/书架已删除（v2026.0906）
      case 'wb_sci':  return this._wbLifeSci(wb, W);
      case 'wb_exp':   return this._wbExp(wb, W);
      default: return this._wbHabit(wb, W);   // v10.0：旧聚合首页已删除，未知子页安全回落习惯页
    }
  },

  // ====== 链接板块：8 学科卡片 + 6 新闻卡片 ======
  // v2026.0905 修复：此前卡片 onclick 误用 App.navigate('ln_english'...) ——
  //   ① 学科页是「板块子视图」，必须走 App.gotoWb()（navigate 只认顶层 view 容器）；
  //   ② 视图键名不匹配（实际为 ln_en/ln_pol/ln_med/ln_life/ln_psy，而非 ln_english/ln_politics/...）；
  //   ③ navigate 找不到容器时会把所有 .view 的 active 全部摘掉 → 点击后整页空白（即用户反馈的"跳转失败"）。
  _wbLinks(wb, W) {
    // v12.9.3：英语/政治/高数/计算机四科「答题刷题」功能已整体迁入【数据中心 → 学习数据 → 练习站】（90-study99-quiz.js · 题库 88/89-quiz99）。
    //   本页保留：四科刷题快速直达按钮 + 通识四学科卡（法律/医学/生活/心理，仍带每日 10 题小测）+ 新闻速递。
    const QUICK = [
      { sub:'en',   icon:'🇬🇧', name:'英语刷题', color:'#3b82f6' },
      { sub:'pol',  icon:'🏛️', name:'政治刷题', color:'#dc2626' },
      { sub:'math', icon:'📐', name:'高数刷题', color:'#16a34a' },
      { sub:'cs',   icon:'💻', name:'计算机刷题', color:'#7c3aed' },
    ];
    const SUBJECTS = [
      { key:'law',       wb:'ln_law',  icon:'⚖️', name:'法律常识',      sub:'生活必备权利义务',   color:'#ea580c', bg:'linear-gradient(135deg,#ffedd5,#fed7aa)' },
      { key:'medical',   wb:'ln_med',  icon:'🩺', name:'医学常识',      sub:'急救健康知识',       color:'#0891b2', bg:'linear-gradient(135deg,#cffafe,#a5f3fc)' },
      { key:'lifestory', wb:'ln_life', icon:'🏠', name:'生活常识',      sub:'居家出行实用技巧',   color:'#ca8a04', bg:'linear-gradient(135deg,#fef9c3,#fef08a)' },
      { key:'psychology',wb:'ln_psy',  icon:'🧠', name:'社会心理学',    sub:'人际关系与洞察',     color:'#db2777', bg:'linear-gradient(135deg,#fce7f3,#fbcfe8)' },
    ];
    const NEWS = [
      { key:'politics',     icon:'🇨🇳', name:'国内时政',       sub:'每日 5 条 · 政府网',   color:'#dc2626', bg:'linear-gradient(135deg,#fee2e2,#fecaca)' },
      { key:'international',icon:'🌍', name:'国际新闻',       sub:'每日 5 条 · 全球媒体', color:'#2563eb', bg:'linear-gradient(135deg,#dbeafe,#bfdbfe)' },
      { key:'economy',      icon:'📈', name:'经济金融',       sub:'每日 5 条 · 财经时报', color:'#ca8a04', bg:'linear-gradient(135deg,#fef9c3,#fef08a)' },
      { key:'livelihood',   icon:'🏡', name:'民生人文',       sub:'每日 5 条 · 社会动态', color:'#16a34a', bg:'linear-gradient(135deg,#dcfce7,#bbf7d0)' },
      { key:'scitech',      icon:'🚀', name:'科技航天',       sub:'每日 5 条 · 前沿科技', color:'#7c3aed', bg:'linear-gradient(135deg,#ede9fe,#ddd6fe)' },
      { key:'foreign',      icon:'📰', name:'外刊/英语新闻',  sub:'每日 5 条 · 外媒原文', color:'#ea580c', bg:'linear-gradient(135deg,#ffedd5,#fed7aa)' },
    ];
    const mkCard = (s, wbKey, click) => `<div class="subject-card" style="background:${s.bg};border-left:4px solid ${s.color};cursor:pointer"
       onclick="${click||`App.gotoWb('${wbKey}')`}">
      <div class="sc-icon">${s.icon}</div>
      <div class="sc-info">
        <div class="sc-name">${this.esc(s.name)}</div>
        <div class="sc-sub" style="color:${s.color}">${this.esc(s.sub)}</div>
      </div>
      <div class="sc-arrow" style="color:${s.color}">›</div>
    </div>`;
    return `
      <div class="card">
        <div class="card-title"><span class="ico">🔗</span>学科知识导航</div>
        <div class="mp-sub" style="padding:6px 4px 10px;font-size:12.5px;color:#64748b">v12.9.3：英语 / 政治 / 高数 / 计算机四科刷题已迁入【练习站】——分题型题组、真题与频次标注、错题自动归档。</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${QUICK.map(q => `<div style="border:1.5px solid ${q.color}44;background:#fff;border-radius:12px;padding:10px 4px;text-align:center;cursor:pointer" onclick="App.st99PZGo('${q.sub}')">
            <div style="font-size:20px;line-height:1.2">${q.icon}</div>
            <div style="font-size:11.5px;font-weight:800;color:${q.color};margin-top:3px">${q.name}</div>
            <div style="font-size:9.5px;color:#94a3b8;margin-top:2px">练习站直达 ›</div>
          </div>`).join('')}
        </div>
        <div class="mp-sub" style="padding:14px 4px 10px;font-size:12.5px;color:#64748b">通识 4 学科 · 每日速推 + 知识库 + 每日 10 题小测（原样保留）。</div>
        <div class="subject-grid">${SUBJECTS.map(s => mkCard(s, s.wb)).join('')}</div>
        <div style="margin-top:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;color:#334155">📰 新闻速递 · 每日自动更新</div>
            <div style="font-size:11px;color:#94a3b8">点击卡片查看当日 3-6 条实时新闻（含原文）</div>
          </div>
          <div class="subject-grid">${NEWS.map(n => mkCard(n, 'news_' + n.key)).join('')}</div>
        </div>
        <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>
      </div>`;
  },

  // ====== 每日速推：knowledgeCards 20 条 3D 翻转 ======
  _renderDailyKnowledgeCards(kcKey, subjectCode, isZb) {
    const cards = (CONFIG.knowledgeCards && CONFIG.knowledgeCards[kcKey]) ? CONFIG.knowledgeCards[kcKey] : [];
    if (!cards.length) return '';
    const seed = (typeof Store !== 'undefined' && Store.today) ? Store.today() : String(Date.now()).slice(0,10);
    let hash = 0;
    for (let i = 0; i < (seed + '@kc:' + subjectCode).length; i++) { hash = ((hash << 5) - hash + (seed+'@kc:'+subjectCode).charCodeAt(i)) | 0; }
    const rnd = () => { hash = (hash * 9301 + 49297) % 233280; return hash / 233280; };
    const shuffled = cards.slice().sort(() => rnd() - 0.5);
    const today20 = shuffled.slice(0, Math.min(20, shuffled.length));
    const tagPrefix = isZb ? '江西专升本' : '实用知识';
    const id = 'kcCarousel_' + subjectCode;
    let carouselHtml = today20.map((c, i) => `
      <div class="kc-flip-card" data-i="${i}" onclick="this.classList.toggle('flipped')">
        <div class="kc-flip-inner">
          <div class="kc-front">
            <div class="kc-front-icon">${this.esc(c.icon||'📘')}</div>
            <div class="kc-front-title">${this.esc(c.title||'知识点')}</div>
            <div class="kc-front-tag">${this.esc(c.tag||'')} · ${this.esc(c.freq||'')}</div>
            <div class="kc-front-hint">👆 点击翻面看要点</div>
          </div>
          <div class="kc-back">
            <div class="kc-back-title">${this.esc(c.title||'')}</div>
            <ul class="kc-back-points">${(c.points||[]).map(p => `<li>${this.esc(p)}</li>`).join('')}</ul>
            ${c.examTip ? `<div class="kc-back-tip">💡 ${this.esc(c.examTip)}</div>` : ''}
          </div>
        </div>
      </div>`).join('');
    return `
      <div class="card" style="margin-top:14px">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
          <span><span class="ico">🎯</span>每日速推 · ${this.esc(kcKey)}（${tagPrefix}）</span>
          <span style="font-size:12px;color:#94a3b8">👆 点击翻面 · 左右滑动切换</span>
        </div>
        <div class="kc-carousel-wrap" id="${id}Wrap">
          <div class="kc-carousel" id="${id}">${carouselHtml}</div>
        </div>
        <div class="kc-carousel-controls">
          <button class="kc-btn kc-prev" onclick="App._kcSwipe('${id}', -1)">‹ 上一张</button>
          <span class="kc-dots" id="${id}Dots">
            ${today20.map((_,i) => `<span class="kc-dot${i===0?' active':''}" data-i="${i}" onclick="App._kcGo('${id}',${i})"></span>`).join('')}
          </span>
          <button class="kc-btn kc-next" onclick="App._kcSwipe('${id}', 1)">下一张 ›</button>
        </div>
      </div>`;
  },
  _kcSwipe(id, dir) {
    const wrap = document.getElementById(id + 'Wrap'); if (!wrap) return;
    const cardW = wrap.querySelector('.kc-flip-card')?.offsetWidth || 260;
    const step = cardW + 16;
    const cur = wrap._kcIdx ?? 0;
    const total = wrap.querySelectorAll('.kc-flip-card').length;
    let next = cur + dir;
    if (next < 0) next = total - 1;
    if (next >= total) next = 0;
    this._kcGo(id, next);
  },
  _kcGo(id, idx) {
    const wrap = document.getElementById(id + 'Wrap'); if (!wrap) return;
    wrap._kcIdx = idx;
    const cardW = wrap.querySelector('.kc-flip-card')?.offsetWidth || 260;
    wrap.querySelector('.kc-carousel').style.transform = `translateX(-${idx * (cardW + 16)}px)`;
    const dots = document.querySelectorAll('#' + id + 'Dots .kc-dot');
    dots.forEach(d => d.classList.toggle('active', Number(d.dataset.i) === idx));
    wrap.querySelectorAll('.kc-flip-card.flipped').forEach(c => c.classList.remove('flipped'));
  },

  // ====== 新闻：获取 + 渲染 ======
  // v2026.0905 修复：种子引入「当日刷新批次号」，让「换一批」真正换内容
  //   （此前种子固定为 today:feedKey，同一天内清除缓存重选结果必然相同）
  _newsTryCount(feedKey, today) {
    const tryKey = 'news_' + feedKey + '_' + today + '_try';
    let n = 0;
    try { n = parseInt(localStorage.getItem(tryKey) || '0', 10) || 0; } catch(e) {}
    return Math.max(0, Math.min(99, n));
  },
  _fetchNewsForCategory(feedKey) {
    // v12.9.40 实时优先：分类台实时 RSS 缓存（zz99_cat_*，10 分钟 TTL，由致知实时引擎写入）→ 本地静态池
    try {
      const live = this._zz99CatCache ? this._zz99CatCache(feedKey) : JSON.parse(localStorage.getItem('zz99_cat_' + feedKey) || 'null');
      if (live && live.ok && Array.isArray(live.items) && live.items.length) return live.items;
    } catch (e) {}
    const cfg = (CONFIG.newsCategories && CONFIG.newsCategories[feedKey]) || null;
    const today = (typeof Store !== 'undefined' && Store.today) ? Store.today() : new Date().toISOString().slice(0,10);
    const tryN = this._newsTryCount(feedKey, today);
    const cacheKey = 'news_' + feedKey + '_' + today + '_t' + tryN;
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch(e) {}
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    const topics = (cfg && cfg.hotTopics && cfg.hotTopics.length > 0) ? cfg.hotTopics : [];
    if (topics.length === 0) return [];
    let seed = today + ':' + feedKey + ':' + tryN;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0; }
    const rnd = () => { hash = (hash * 9301 + 49297) % 233280; return hash / 233280; };
    const shuffled = topics.slice().sort(() => rnd() - 0.5);
    const pickCount = Math.max(3, Math.min(6, shuffled.length));
    const picked = shuffled.slice(0, pickCount).map(t => ({
      id: t.id || (feedKey + '_' + today + '_' + tryN + '_' + Math.random().toString(36).slice(2,7)),
      title: t.title || '', summary: t.summary || t.desc || '',
      source: t.source || t.sourceName || '', tag: t.tag || t.category || '',
      icon: t.icon || (cfg && cfg.icon) || '📰', url: t.url || t.link || '#',
      date: t.date || today,
      englishTitle: t.englishTitle || t.enTitle || '',
      englishSummary: t.englishSummary || t.enSummary || '',
    }));
    try { localStorage.setItem(cacheKey, JSON.stringify(picked)); } catch(e) {}
    return picked;
  },

  // 渲染某科「知识点 12 条 + 10 题小测（含即时反馈·得分·积分）」
  _renderSubjectQuizAndKnowledge(code) {
    const quiz = Store.getTodaySubjectQuiz(code, 10);
    const bag = Store.getSubjectQuizBag(code);
    const label = quiz.label || code;
    const total = quiz.questions.length;
    const done = bag.right + bag.wrong;
    const scorePct = done ? Math.round(bag.right / done * 100) : 0;
    const sourceTip = (quiz.source || '内置题库') + ' · 更新日期 ' + (quiz.date || '');
    let knHtml = '';
    if (quiz.knowledge && quiz.knowledge.length) {
      knHtml = `<div class="card" style="margin-top:14px">
        <div class="card-title"><span class="ico">📚</span>${this.esc(label)} · 知识点精讲（今日 ${quiz.knowledge.length} 条）<span class="sub" style="font-size:12px;color:#94a3b8;margin-left:6px">${this.esc(sourceTip)}</span></div>
        <div class="kp-grid">
        ${quiz.knowledge.map(k=>`
          <div class="kp-card">
            <div class="kp-title">${this.esc(k.title||'知识点')}</div>
            <div class="kp-summary">${this.esc(k.summary||'')}</div>
            ${k.eg?`<div class="kp-eg">💡 例：${this.esc(k.eg)}</div>`:''}
          </div>`).join('')}
        </div>
      </div>`;
    }
    let qHtml = '';
    if (quiz.questions && quiz.questions.length) {
      qHtml = `<div class="card" style="margin-top:14px" id="quizRoot-${code}">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <span><span class="ico">🧠</span>${this.esc(label)} · 今日 10 题小测</span>
          <span style="font-size:12px;color:#64748b">✅ 对 <b style="color:#16a34a">${bag.right}</b> / ❌ 错 <b style="color:#b91c1c">${bag.wrong}</b> / 完成 ${done}/${total} · 得分率 ${scorePct}%</span>
        </div>
        <div style="margin-top:4px;font-size:12px;color:#64748b">同题当天只记一次，答完自动判分并展示解析。</div>
        <div style="margin-top:10px">
          ${quiz.questions.map((q,i) => {
            const qidKey = (q.id !== null && q.id !== undefined) ? String(q.id) : ('idx_'+i);
            const isDone = bag.done && (bag.done[qidKey] !== undefined);
            const isRight = bag.done && bag.done[qidKey] === 1;
            const statusPill = !isDone ? '' : (isRight
              ? '<span class="chip chip-ok">✅ 已答对</span>'
              : '<span class="chip chip-bad">❌ 已答错</span>');
            return `<div class="quiz-item" data-code="${this.esc(code)}" data-qid="${this.esc(qidKey)}" data-ans="${q.ans}">
              <div class="quiz-q">${i+1}. ${this.esc(q.q)} ${statusPill}</div>
              <div class="quiz-opts">
                ${q.opts.map((op,j) => `<label class="quiz-opt" data-i="${j}">
                  <input type="radio" name="quiz_${code}_${i}" value="${j}" ${isDone?'disabled':''}>
                  <span>${String.fromCharCode(65+j)}. ${this.esc(op)}</span>
                </label>`).join('')}
              </div>
              <div class="quiz-actions">
                <button class="btn btn-primary btn-sm quiz-submit-btn" ${isDone?'disabled':''}>提交本题</button>
                ${q.exp ? `<div class="quiz-exp hidden" style="margin-left:10px">💭 ${this.esc(q.exp)}</div>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
    return knHtml + qHtml;
  },
  _attachQuizHandlersOnce() {
    if (this._quizAttached) return;
    this._quizAttached = true;
    document.addEventListener('click', e => {
      const btn = e.target.closest('.quiz-submit-btn');
      if (!btn) return;
      const item = btn.closest('.quiz-item'); if (!item) return;
      const code = item.getAttribute('data-code'); const qid = item.getAttribute('data-qid'); const trueAns = Number(item.getAttribute('data-ans'));
      const picked = item.querySelector('input[type="radio"]:checked');
      if (!picked) return this._flash('请先选一个选项');
      const user = Number(picked.value);
      const ok = user === trueAns;
      const expEl = item.querySelector('.quiz-exp'); if (expEl) expEl.classList.remove('hidden');
      // 视觉反馈
      item.querySelectorAll('.quiz-opt').forEach((opt, idx) => {
        if (idx === trueAns) opt.classList.add('quiz-opt-ok');
        if (idx === user && !ok) opt.classList.add('quiz-opt-bad');
        opt.querySelectorAll('input').forEach(x=>x.disabled=true);
      });
      btn.disabled = true;
      const r = Store.answerSubjectQuiz(code, qid, ok);
      if (!r.ok && r.msg) this._flash(r.msg);
      else this._flash(ok ? `✅ 答对！继续加油` : `❌ 答错了，正确答案是 ${String.fromCharCode(65+trueAns)}`);
    });
  },
  // ====== 管家阿福 NPC（私人管家 · 亲和陪伴式问候/点评/建议）======
  // 人设：老派却新潮的贴身管家，语气温和、偶尔俏皮，像家人一样陪用户自律
  _butlerName: '阿福',
  // 时段问候语（北京时间）
  _butlerGreeting() {
    const d = Store.beijingDate(Store.nowBeijing());
    const h = d.getHours();
    if (h >= 5 && h < 9)   return { title: '早上好，新的一天由阿福为您拉开帷幕 ☀️', msg: '晨光正好，先喝杯温水、吃顿早餐，一天的战斗力从规律开始。' };
    if (h >= 9 && h < 12)  return { title: '上午好，学习工作的黄金时段 🌿', msg: '大脑最清醒的几个小时，把最难的任务放在现在，阿福在旁边帮您盯着进度。' };
    if (h >= 12 && h < 14) return { title: '中午好，记得好好吃饭 🍚', msg: '午饭别糊弄，饭后小憩 20 分钟胜过刷一小时手机。' };
    if (h >= 14 && h < 18) return { title: '下午好，冲过疲劳期就是坦途 🌤️', msg: '午后容易犯困，起来接杯水、拉伸两分钟，效率马上回来。' };
    if (h >= 18 && h < 23) return { title: '晚上好，今天辛苦了 🌆', msg: '晚饭七分饱，睡前一小时远离屏幕，23:00 前熄灯——阿福会来查房的哦。' };
    return { title: '夜深了，还没睡呀 🌙', msg: '再忙也没有睡眠重要，放下手机，明天的您会感谢现在入睡的自己。' };
  },
  // 管家消费点评：对单笔支出给出健康/节制的亲和提醒
  _butlerSpendAdvice(entry) {
    if (!entry) return '';
    const note = String(entry.note || '');
    const cat = entry.category || 'other';
    const amt = Number(entry.amount) || 0;
    const hit = (arr) => arr.some(k => note.includes(k));
    // 违规类：温和而坚定
    if (cat === 'game')    return `🎮 游戏充值已记为违规消费（¥${amt.toFixed(2)}）。阿福不责备您，但按红线原则这笔要如实登记——冲动过去后，咱们把这份预算挪给能真正让您开心的事，好吗？`;
    if (cat === 'lottery') return `🎰 彩票/盲盒 ¥${amt.toFixed(2)} 已登记。小赌怡情是骗局的开场白，阿福更愿意陪您把这份"运气"攒进储蓄罐。`;
    if (cat === 'adult')   return `⛔ 成人消费 ¥${amt.toFixed(2)} 已按违规记录。欲望人人都有，管理它的能力才是真本事——这笔翻篇，明天的您继续加油。`;
    // 健康习惯类关键词
    if (hit(['奶茶','喜茶','蜜雪','茶百道','一点点','贡茶','coco','书亦','益禾堂','霸王别姬','柠檬茶'])) {
      return amt >= 20
        ? `🧋 ¥${amt.toFixed(2)} 的奶茶记下了。甜甜的快乐偶尔一次没关系，但一杯全糖奶茶 ≈ 13 块方糖，一周别超过 2 杯，下次试试三分糖或鲜榨果蔬汁，阿福替您的胰岛先谢过～`
        : `🧋 ¥${amt.toFixed(2)} 的奶茶记下了。小小一杯甜，记得搭配今天多走 2000 步来平衡，快乐与健康可以兼得。`;
    }
    if (hit(['可乐','雪碧','汽水','碳酸','能量饮料','红牛'])) return `🥤 含糖饮料 ¥${amt.toFixed(2)} 已记录。糖分会偷走下午的专注力，明天把它换成气泡水或无糖茶，阿福已经把替代清单准备好了。`;
    if (hit(['炸鸡','烧烤','烤串','炸串','汉堡','薯条','麻辣烫','螺蛳粉','方便面','泡面'])) return `🍗 ¥${amt.toFixed(2)} 的高油高钠餐已记录。偶尔解馋没问题，记得今天多喝水、明天补一顿蔬菜，肠胃的账阿福帮您记着呢。`;
    if (hit(['夜宵','宵夜'])) return `🌙 夜宵 ¥${amt.toFixed(2)} 已记录。睡前 3 小时进食会影响睡眠质量和体重管理——嘴馋时先喝杯温水等 10 分钟，很多时候"饿"只是"馋"。`;
    if (hit(['烟','槟榔','打火机','电子烟'])) return `🚭 与尼古丁相关的 ¥${amt.toFixed(2)} 已登记。每戒一天，肺和钱包都会同时感谢您——需要的话，阿福随时陪您聊聊戒断替代方案。`;
    if (hit(['啤酒','白酒','洋酒','酒'])) return `🍺 酒类消费 ¥${amt.toFixed(2)} 已记录。小酌怡情、大饮伤肝，今天的量适可而止，明早还要做那个清醒的自己。`;
    // 正向消费：不吝赞美
    if (cat === 'gym')   return `💪 健身支出 ¥${amt.toFixed(2)}——花在身体上的每一分钱都稳赚不赔，阿福给您竖大拇指！`;
    if (cat === 'study') return `📚 学习支出 ¥${amt.toFixed(2)}——投资大脑是复利最高的选择，未来的您正在感谢现在的决定。`;
    if (cat === 'med')   return `💊 医药支出 ¥${amt.toFixed(2)} 已登记。按时服药、按时复查，健康是所有计划的第一位，阿福陪您一起守住。`;
    // 大额支出提醒（非必要类）
    if (amt >= 300 && ['social','clothes','other'].includes(cat)) return `💸 ¥${amt.toFixed(2)} 属于较大额支出。已经花了就不必自责，但下次同类消费前，先给自己 24 小时冷静期——想要和需要，隔一天再看会不一样。`;
    if (amt >= 100 && cat === 'meal') return `🍽️ 餐饮单笔 ¥${amt.toFixed(2)}，是聚餐犒劳还是随手下单？记账的意义就在这里——看清钱的去向，才能决定它的去向。`;
    // 普通：偶尔的一句管家式关怀（不每次都刷屏，金额任意但概率性）— 保持确定性输出更稳，这里给通用鼓励
    return `✅ ¥${amt.toFixed(2)} 已入账。每一笔都记得清清楚楚，管住钱的流向，就管住了生活的秩序。`;
  },
  // 可支配收入分配卡（50/30/20 管家分配法）—— inputId 由调用方传入避免重复 id
  _butlerBudgetCard(inputId, rerenderFn) {
    const income = Store.getLedgerIncomePlan();
    const b = Store.ledgerBudgetStatus();
    const fmt = (v) => '¥' + (Math.round(v * 100) / 100).toFixed(2);
    let body = '';
    if (!(income > 0)) {
      body = `
        <div class="butler-budget-set">
          <div class="bb-set-say">${this._afu99AvatarHtml(18, 'pxafu-inline')}阿福还没拿到您这个月的"可支配收入"数字（工资/生活费扣除固定房租等刚性支出后，真正由您支配的部分）。告诉我金额，我会按 <b>50/30/20 分配法</b> 帮您把每一块钱都安排好。</div>
          <div class="bb-set-row">
            <input type="number" id="${inputId}" class="input" min="0" step="0.01" placeholder="例如：2000">
            <button class="btn btn-primary" onclick="App.saveIncomePlan('${inputId}','${rerenderFn}')">交给阿福打理</button>
          </div>
          <div class="bb-set-note">分配方案：必要生活 50%（餐食/交通/通讯/日用） · 储蓄投资 30%（雷打不动先存） · 健康成长 20%（健身/学习/弹性）</div>
        </div>`;
    } else {
      const bar = (used, budget, color) => {
        const pct = budget > 0 ? Math.min(100, Math.round(used / budget * 100)) : 0;
        return `<div class="bb-bar"><div class="bb-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
      };
      let paceSay;
      if (b.pace >= 15) paceSay = `⚠️ 本月已花掉可支配收入的 ${b.spendPct}%，而时间才走到 ${b.timePct}%——节奏偏快了，接下来一周阿福建议"非必要不出手"。`;
      else if (b.pace <= -15) paceSay = `🐢 节奏稳健：时间过半多月，支出仅 ${b.spendPct}%，剩余的富余可以考虑补一笔储蓄或小小的自我奖励。`;
      else paceSay = `✅ 消费节奏刚刚好（支出进度 ${b.spendPct}% vs 时间进度 ${b.timePct}%），就这样稳稳地走到月底。`;
      body = `
        <div class="bb-head-line">
          <span>本月可支配收入 <b>${fmt(income)}</b></span>
          <span>本月已支出 <b style="color:#dc2626">${fmt(b.monthTotal)}</b></span>
          <button class="btn btn-ghost btn-sm" onclick="App.toggleIncomeEdit('${inputId}')">✏️ 调整</button>
        </div>
        <div class="bb-edit hidden" id="${inputId}_wrap">
          <div class="bb-set-row">
            <input type="number" id="${inputId}" class="input" min="0" step="0.01" value="${income}">
            <button class="btn btn-primary" onclick="App.saveIncomePlan('${inputId}','${rerenderFn}')">保存</button>
          </div>
        </div>
        <div class="bb-grid">
          <div class="bb-item">
            <div class="bb-item-h"><span>🍚 必要生活 50%</span><span class="${b.necessaryLeft < 0 ? 'bb-over' : ''}">${fmt(b.necessaryUsed)} / ${fmt(b.necessaryBudget)}</span></div>
            ${bar(b.necessaryUsed, b.necessaryBudget, 'linear-gradient(90deg,#34d399,#10b981)')}
            <div class="bb-item-sub">餐食 / 日用品 / 交通 / 通讯 / 医药 ${b.necessaryLeft < 0 ? '· 已超支 ' + fmt(-b.necessaryLeft) : '· 剩 ' + fmt(b.necessaryLeft)}</div>
          </div>
          <div class="bb-item">
            <div class="bb-item-h"><span>🏦 储蓄投资 30%</span><span>${fmt(income * 0.3)}</span></div>
            ${bar(income * 0.3, income * 0.3, 'linear-gradient(90deg,#38bdf8,#0ea5e9)')}
            <div class="bb-item-sub">发薪日雷打不动先存，剩下的才是能花的</div>
          </div>
          <div class="bb-item">
            <div class="bb-item-h"><span>🌱 健康成长 20%</span><span class="${(b.growthUsed + b.flexibleUsed) > income * 0.2 && b.flexibleUsed > income * 0.1 ? 'bb-over' : ''}">${fmt(b.growthUsed + b.flexibleUsed)} / ${fmt(income * 0.2)}</span></div>
            ${bar(b.growthUsed, income * 0.2, 'linear-gradient(90deg,#a78bfa,#7c3aed)')}
            <div class="bb-item-sub">健身 / 学习 / 弹性快乐金 ${b.growthLeft >= 0 ? '· 剩 ' + fmt(b.growthLeft) : '· 已超支 ' + fmt(-b.growthLeft)}</div>
          </div>
        </div>
        <div class="bb-pace">${this._afu99AvatarHtml(16, 'pxafu-inline')}${this.esc(paceSay)}</div>`;
    }
    return `
      <div class="card butler-budget-card">
        <div class="card-title"><span class="ico">💼</span>管家${this._butlerName} · 可支配收入分配 <span class="sub">50/30/20 分配法</span></div>
        ${body}
      </div>`;
  },
  toggleIncomeEdit(inputId) {
    const w = document.getElementById(inputId + '_wrap');
    if (w) w.classList.toggle('hidden');
  },
  saveIncomePlan(inputId, rerenderFn) {
    const el = document.getElementById(inputId);
    const v = parseFloat(el && el.value);
    if (!v || v <= 0) return this._flash('阿福需要一个大于 0 的金额才能开始打理～');
    Store.setLedgerIncomePlan(v);
    this._flash(`收到！本月可支配收入 ¥${v.toFixed(2)}，阿福已按 50/30/20 为您分配妥当。`);
    try { this[rerenderFn](); } catch (e) {}
  },
  // v10.0：旧聚合首页已删除——寄语卡迁首页（_wbSelfCards 于 render_dashboard 调用）；
  //   系统日志卡迁空间页（_wbMe）；链接板块入口迁记录页；习惯/记录/空间由底栏 5 tab 直达。
});
