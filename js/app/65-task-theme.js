// 65-task-theme.js —— 七时段主题系统（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G2-生活基础（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
Object.assign(App, {
  // v2026.0906：旧任务页（render_rewards/_rewardsHtml/claimMini/claimGroupFull/grantReward/grantDaily）
  // 已整体删除——该页早已无任何入口，
  // 打卡金币实际由 _onPunchReward 自动发放（见 15-utils.js），手动领取 UI 属已废弃体系。
  // 今日待办清单仍在首页（00-core.js showDailyTodoPrompt）与记录板块·管家阿福展示。
  // v1.0.1 休息模式已彻底移除 —— 相关时间函数（_worldResting/_isAnniversary/_nightWindow/_nightDecorate/_worldRestingCardHTML 等）随之删除；
  // （农场/牧场/柯基等挂机体系已随 v7.0 拆分迁出，主程序不再保留相关夜间逻辑）
  // ===== v2.0.8 七时段主题系统（按现实时间自动切换 UI 配色，一天最多 7 色）=====
  // 时段：黎明5-8 / 早晨8-11 / 正午11-14 / 午后14-17 / 黄昏17-20 / 暮色20-23 / 深夜23-5
  // 原理：按小时算出主题名 → <body data-ttheme="xxx"> → styles.css 末尾 7 个主题块
  //       覆盖 --bg-grad / --glow-a/b / --topbar-veil（渐变水滴质感保留，顶栏同色系融合）
  // 深色模式让位：CSS 侧用 html:not([data-theme="dark"]) 守卫，用户手动深色模式优先
  _TTHEME_INFO: {
    dawn:     ['🌅', '黎明'],
    morning:  ['🌿', '早晨'],
    noon:     ['☀️', '正午'],
    afternoon:['🌤️', '午后'],
    dusk:     ['🌇', '黄昏'],
    evening:  ['🌆', '暮色'],
    night:    ['🌙', '深夜'],
  },
  _tthemeOf(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 11) return 'morning';
    if (h >= 11 && h < 14) return 'noon';
    if (h >= 14 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'dusk';
    if (h >= 20 && h < 23) return 'evening';
    return 'night'; // 23:00-04:59
  },
  _applyTimeTheme() {
    const t = this._tthemeOf(new Date().getHours());
    if (this._ttheme === t) return;          // 未跨时段则跳过（省 DOM 写入）
    this._ttheme = t;
    try { document.body.setAttribute('data-ttheme', t); } catch(e) {}
  },
});
