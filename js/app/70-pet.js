// =====================================================================
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// v12.7 【宠物系统】8-bit 像素白猫「小银」（浅粉围巾）+ 【每日精力负荷】引擎
//   · 形象与四套动作（待机/舔爪/打盹/撒娇）由 62-pixelcat.js canvas 精灵驱动，
//     旧版动漫风 SVG 猫 / 装扮图层 / 小窝升级已按用户要求整体删除
//   · 增量开发：不改动任何原有业务模块；业务数据只读（打卡/专注/日记/书架 → 宝石）
//   · 宠物数据独立 localStorage key：one-xing-pet-v1（重置不影响业务存档）
//   · 禁止：饥饿/生病/死亡/降级惩罚、抽卡/排行榜/对战；不喂食不限制任何交互
// v12.9.31 【独行信条】：「自律点」更名「宝石」（存储仍为 points，语义/文案全端同步）——
//   宠物系统只消费不产出：宝石来源统一由 RPG 引擎发放（92-rpg99.js · 当日打卡 15/30 个 · 阿福审核通过的合格记录）
// =====================================================================
Object.assign(App, {
  // ==================== 宠物数据层（独立存储）====================
  _pet99Key: 'one-xing-pet-v1',
  // 成长阶段：growth = 累计喂食次数（只增不减，无降级）
  _pet99Stages: [
    { name: '幼崽', need: 4 },
    { name: '幼年', need: 10 },
    { name: '少年', need: 18 },
    { name: '青年', need: 28 },
    { name: '成年', need: 0 },
  ],
  // v11.0 商城经济重做（v12.9.31 宝石来源收敛至 RPG 引擎两条后定价维持，拉长养成周期）
  _pet99Foods() {
    return [
      { id: 'food_basic', name: '普通猫粮', ico: '🍚', cost: 30,  growth: 1, satiety: 20, joy: 2,  desc: '成长 +1 · 饱腹 +20 · 愉悦 +2（成年后仅维持饱腹、小幅提升愉悦）' },
      { id: 'food_can',   name: '营养罐头', ico: '🥫', cost: 70,  growth: 2, satiety: 35, joy: 5,  desc: '成长 +2 · 饱腹 +35 · 愉悦 +5（成长加速型口粮）' },
      { id: 'food_fish',  name: '鲜鱼盛宴', ico: '🐟', cost: 150, growth: 3, satiety: 50, joy: 10, desc: '成长 +3 · 饱腹 +50 · 愉悦 +10（小银最期待的硬菜）' },
    ];
  },
  _pet99Data() {
    try {
      const raw = localStorage.getItem(this._pet99Key);
      if (raw) {
        const p = JSON.parse(raw);
        // 兜底合并（结构演进安全；v12.8 恢复装扮：decor 穿戴中 / ownedDecor 已拥有）
        return Object.assign({ points: 0, growth: 0, joy: 60, satiety: 70, act: 'idle',
          awarded: {}, mile: {}, ratingClaimed: {}, syncedUntil: '', warned: '',
          decor: {}, ownedDecor: [] }, p);
      }
    } catch (e) {}
    return { points: 0, growth: 0, joy: 60, satiety: 70, act: 'idle',
      awarded: {}, mile: {}, ratingClaimed: {}, syncedUntil: '', warned: '',
      decor: {}, ownedDecor: [] };
  },
  _pet99Save(p) { try { localStorage.setItem(this._pet99Key, JSON.stringify(p)); } catch (e) {} },
  _pet99StageIdx(p) {
    // 成长阈值：4/10/18/28（成长=累计喂食次数，只增不减）
    const NEEDS = [4, 10, 18, 28, Infinity];
    const g = (p && p.growth) || 0;
    let idx = 0;
    for (let i = 0; i < NEEDS.length; i++) { if (g >= NEEDS[i]) idx = i; }
    return idx;
  },
  _pet99StageName(p) { return this._pet99Stages[this._pet99StageIdx(p)].name; },

  // ==================== 连续性口径（供 RPG 引擎复用 · 只读）====================
  // v12.9.31 旧的宝石产出引擎（习惯卡+1 / 挑战卡+2 / 连续里程碑 3/7/14/30 / 管家评价+5）已整体删除，
  // 经验与宝石统一由【独行信条】RPG 引擎发放（92-rpg99.js）；此处仅保留连续天数的判定口径
  // 日期工具：给定 dk 的前一天
  _pet99PrevDk(dk) {
    const d = new Date(dk + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  // 当日该习惯卡是否有任意记录（宽口径：打卡或记录即算，用于基础 1 点）
  _pet99CardTouched(dk, cardId) {
    try {
      const v = ((Store.getHabit99().days || {})[dk] || {})[cardId];
      return Array.isArray(v) ? v.length > 0 : !!v;
    } catch (e) { return false; }
  },
  // 当日该习惯卡是否「完成」（严口径：与坚持天数同标准，用于连续里程碑）
  _pet99StreakDone(cardId, v) {
    if (cardId === 'water') {
      const goal = (typeof CONFIG !== 'undefined' && CONFIG.habit99 && CONFIG.habit99.waterGoalMl) || 1300;
      return Array.isArray(v) && v.reduce((s, x) => s + (parseInt(x.amount, 10) || 0), 0) >= goal;
    }
    if (cardId === 'fitness') return !!(v && !Array.isArray(v) && (v.ts || v.makeup));
    if (this._hb99ZhengIds().includes(cardId)) {
      return !!(v && !Array.isArray(v) && typeof v.level === 'string' && v.level.indexOf('未破') === 0);
    }
    return Array.isArray(v) ? v.length > 0 : !!(v && (v.done || v.ts || v.start || v.firstTs || v.makeup));
  },
  // 习惯卡：截至 dk 的连续完成天数（含 dk 当日；中断即停）
  _pet99StreakAt(dk, cardId) {
    let s = 0, cur = dk;
    try {
      for (let i = 0; i < 400; i++) {
        const v = ((Store.getHabit99().days || {})[cur] || {})[cardId];
        if (this._pet99StreakDone(cardId, v)) { s++; cur = this._pet99PrevDk(cur); } else break;
      }
    } catch (e) {}
    return s;
  },
  // 挑战卡：截至 dk 的连续打卡天数（违约日已撤销打卡，自然中断）
  _pet99ChStreakAt(dk, ch) {
    let s = 0, cur = dk;
    const keys = ch.checkins || {};
    for (let i = 0; i < 400; i++) {
      if (keys[cur]) { s++; cur = this._pet99PrevDk(cur); } else break;
    }
    return s;
  },
  // v12.9.31 【独行信条】重做：_pet99Milestone（连续 3/7/14/30 里程碑奖励）与 _pet99DayPoints（习惯卡+1/挑战卡+2）
  // 两套旧宝石产出已删除——宝石新来源见 92-rpg99.js（当日打卡 15/30 个 · 阿福审核通过的合格记录）
  pet99Sync() {
    if (this._dev99) return; // 沙箱态：跳过（同步/联动/弹窗都不触发，保证真实数据零污染）
    try {
      const p = this._pet99Data();
      const today = Store.today();
      // v12.9.31 【独行信条】重做：旧的宝石结算引擎（习惯卡+1/挑战卡+2/连续里程碑/管家评价+5）已全部删除——
      // 宝石与经验统一由 RPG 引擎（92-rpg99.js · rpg99Sync）发放，宠物系统只消费不产出
      // 挑战目标 ↔ 健身/学习卡强联动（当日卡完成 → 目标自动打卡）
      this._pet99ChallengeAutoLink(today);
      // 精力负荷 ≥85% 弹窗（每日至多一次）
      this._pet99LoadWarn(p, today);
      return 0;
    } catch (e) { return 0; }
  },
  // v11.0 强联动：目标勾选了「联动健身卡/学习卡」→ 对应小卡当日打卡后自动完成目标打卡
  _pet99ChallengeAutoLink(today) {
    try {
      (Store._challengesData ? Store._challengesData() : []).forEach(ch => {
        if (!ch || ch.status !== 'active' || !ch.linkCard) return;
        if ((ch.checkins || {})[today]) return;
        if ((ch.violations || {})[today]) return; // v11.0 当日已违约（记录到相关消费）→ 不自动打卡
        const day = (Store.getHabit99().days || {})[today] || {};
        let done = false;
        if (ch.linkCard === 'fitness') {
          const rec = day.fitness;
          done = Array.isArray(rec) ? !!rec.length : !!(rec && (rec.ts || rec.makeup));
        } else if (ch.linkCard === 'study') {
          done = ['studyMorning','studyNoon','studyEvening'].some(k => {
            const rec = day[k];
            return Array.isArray(rec) ? !!rec.length : !!(rec && (rec.ts || rec.makeup));
          });
        }
        if (done) {
          const r = Store.challengeCheckin(ch.id);
          if (r.ok) {
            this._flash(r.justDone
              ? `🔗 【${ch.name}】由联动卡自动打卡完成——挑战成功，已转正为习惯小卡！`
              : `🔗 检测到【${ch.linkCard === 'fitness' ? '健身' : '学习'}】卡今日已完成，「${ch.name}」已自动打卡`);
          }
        }
      });
    } catch (e) {}
  },

  // ==================== v11.0 消费↔挑战违约联动 ====================
  // 戒X类目标（名称含「戒XX」「不吃/不喝/不买XX」）当日记录到对应消费 → 当日未达标
  // 例：目标「戒奶茶计划」+ 吃吃消卡记录了喝奶茶 → 该目标今日未达标（撤销当日打卡、连续中断）
  _pet99QuitKey(name) {
    if (!name) return '';
    let m = String(name).match(/戒\s*([\u4e00-\u9fa5A-Za-z0-9]+)/);
    if (!m) m = String(name).match(/不(?:吃|喝|买|抽|玩|刷|氪)\s*([\u4e00-\u9fa5A-Za-z0-9]+)/);
    if (!m) return '';
    // 去掉常见后缀词（戒奶茶计划 → 奶茶）
    let kw = m[1].replace(/(计划|挑战|行动|打卡|日记|记录|日志|习惯|天|周|月)+$/g, '');
    return kw.length >= 2 ? kw : ''; // 关键词至少 2 字，避免「戒糖」的「糖」误伤「无糖」等文本
  },
  // 消费 payload → 可检索文本（递归收集全部字符串字段：类别/饮品/水果名/消费方式等）
  _pet99ScanText(payload) {
    const parts = [];
    const walk = (v) => {
      if (typeof v === 'string') parts.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(payload);
    return parts.join(' ');
  },
  // 打卡/记录提交后调用：扫描所有进行中的戒X类目标，命中关键词 → 标记当日违约
  _pet99ViolationScan(dk, cardId, payload) {
    if (this._dev99) return; // 沙箱态不写真实挑战数据
    try {
      const text = this._pet99ScanText(payload);
      if (!text) return;
      const hits = [];
      (Store._challengesData ? Store._challengesData() : []).forEach(ch => {
        if (!ch || ch.status !== 'active') return;
        if ((ch.violations || {})[dk]) return; // 当日已违约过，不重复提示
        const kw = this._pet99QuitKey(ch.name);
        if (kw && text.indexOf(kw) >= 0) {
          const r = Store.challengeViolate(ch.id, dk, { cardId, text: text.slice(0, 60), keyword: kw });
          if (r.ok) hits.push({ name: ch.name, kw });
        }
      });
      if (hits.length) {
        const c = (CONFIG.habitCards || []).find(x => x.id === cardId) || {};
        const lines = hits.map(h => `<div style="margin-top:6px"><b style="color:#b91c1c">「${this.esc(h.name)}」今日未达标</b>　<span style="font-size:12px;color:#64748b">${c.ico || '🧋'}${c.name || cardId} 记录到「${this.esc(h.kw)}」</span></div>`).join('');
        setTimeout(() => {
          this._modal({
            title: '⛔ 戒断目标 · 今日未达标',
            body: `<div style="font-size:13px;color:#475569;line-height:1.8">检测到与你的戒断目标相关的消费记录：<br>当日打卡已撤销、连续天数中断——诚实记录本身就是自律的一部分，明天继续加油。${lines}</div>`,
            actions: [{ label: '知道了', primary: true }],
          });
        }, 250);
      }
    } catch (e) {}
  },

  // ==================== v11.0 管家六维评价（报告数据联动 · v12.9.31 起纯展示不再产出宝石）====================
  // 六维度：健康/睡眠/饮食/卫生/运动/学习（核心卡完成度综合；优秀 ≥85 分）
  _pet99Dims(dk) {
    const rec = (id) => this._pet99CardTouched(dk, id);
    return [
      { key: 'health',  name: '健康', ico: '❤️', done: rec('health') ? 1 : 0,                          total: 1, cards: '健康卡' },
      { key: 'sleep',   name: '睡眠', ico: '🌙', done: (rec('goodMorning') ? 1 : 0) + (rec('goodNight') ? 1 : 0), total: 2, cards: '早安 + 晚安' },
      { key: 'diet',    name: '饮食', ico: '🍚', done: ['breakfast','lunch','dinner'].filter(rec).length, total: 3, cards: '三餐' },
      { key: 'hygiene', name: '卫生', ico: '🧼', done: ['faceWashM','mouthWashM','faceWashE','mouthWashE'].filter(rec).length, total: 4, cards: '洁面/漱口（晨晚）' },
      { key: 'sport',   name: '运动', ico: '💪', done: (rec('fitness') || rec('steps')) ? 1 : 0,        total: 1, cards: '健身/步数 任一' },
      { key: 'study',   name: '学习', ico: '📖', done: (rec('studyMorning') || rec('studyNoon') || rec('studyEvening')) ? 1 : 0, total: 1, cards: '学习卡 任一' },
    ];
  },
  _pet99Grade(dk) {
    const dims = this._pet99Dims(dk);
    const score = Math.round(dims.reduce((s, d) => s + d.done / d.total, 0) / dims.length * 100);
    // 优秀守卫：综合 ≥85 且每个维度 ≥50%（不能完全放弃某一维度）
    const minDim = Math.min(...dims.map(d => d.done / d.total));
    const lv = (score >= 85 && minDim >= 0.5) ? '优秀' : score >= 70 ? '良好' : score >= 50 ? '尚可' : '待改进';
    const color = lv === '优秀' ? '#16a34a' : score >= 70 ? '#0284c7' : score >= 50 ? '#ca8a04' : '#dc2626';
    return { dims, score, lv, color };
  },
  // v12.9.31 【独行信条】重做：管家评价「优秀 +5 宝石」手动领取（_pet99Claimable / pet99ClaimRating）已删除——
  // 宝石来源收敛为 RPG 引擎两条（当日打卡 15/30 个 · 阿福审核通过的合格记录）；六维评价展示保留，仅不再产出货币

  // ==================== 每日精力负荷引擎（容量 100，动态计算自动跨日重置）====================
  // 构成：①挑战目标的今日份额（每日目标全额 / 每周 ÷7 / 每月 ÷30）
  //      ②健身卡 +12、学习卡 +8/张（当日已打卡的数据参考；步数卡不计）
  // v12.9.46 数据共享升级：load99() 为全端唯一共享取数口（主页卡片/宠物页/挑战中心/月度魔物
  //   战斗系统一律从这里取），带当日缓存——打卡/挑战变动后调 load99Invalidate() 失效重算，
  //   并在主页可见时即时刷新卡片，跨模块口径从此只有这一份
  _load99Cache: null,
  load99() {
    const dk = Store.today();
    const c = this._load99Cache;
    if (c && c.dk === dk && !c.dirty) return c.data;
    const data = this.pet99Load();
    this._load99Cache = { dk, dirty: false, data };
    return data;
  },
  // 精力负荷相关数据（挑战/健身卡/学习卡打卡）变动后调用：失效缓存 + 主页在屏即时刷新
  load99Invalidate() {
    if (this._load99Cache) this._load99Cache.dirty = true;
    try {
      if (this.currentView === 'dashboard' && this.render_dashboard) this.render_dashboard();
      else if (this.currentView === 'workbench' && (this._wbView === 'challenge99' || this._wbView === 'boss99')) this.render_workbench();
    } catch (e) {}
  },
  pet99Load() {
    let used = 0; const items = [];
    try {
      const chs = (Store._challengesData ? Store._challengesData() : []).filter(c => c && c.status === 'active');
      const EFF = { light: 8, mid: 18, heavy: 32 };
      chs.forEach(ch => {
        const effort = EFF[ch.effort] || 8;
        const share = ch.goalType === 'weekly' ? effort / 7 : ch.goalType === 'monthly' ? effort / 30 : effort;
        used += share;
        const typeName = { daily: '每日', weekly: '每周', monthly: '每月' }[ch.goalType] || '每日';
        items.push({ ico: ch.icon || '🏆', name: `${ch.name}（${typeName}目标）`, val: Math.round(share * 10) / 10 });
      });
      const day = (Store.getHabit99().days || {})[Store.today()] || {};
      const fitRec = day.fitness;
      if (Array.isArray(fitRec) ? fitRec.length : (fitRec && (fitRec.ts || fitRec.makeup))) {
        used += 12; items.push({ ico: '💪', name: '健身卡（今日已练 · 数据参考）', val: 12 });
      }
      const studyNames = { studyMorning: '早学习', studyNoon: '午学习', studyEvening: '晚学习' };
      Object.keys(studyNames).forEach(k => {
        const rec = day[k];
        if (Array.isArray(rec) ? rec.length : (rec && (rec.ts || rec.makeup))) {
          used += 8; items.push({ ico: '📚', name: `${studyNames[k]}卡（今日已学 · 数据参考）`, val: 8 });
        }
      });
    } catch (e) {}
    return { cap: 100, used: Math.round(used * 10) / 10, pct: Math.min(999, Math.round(used)), items };
  },
  _pet99Zone(pct) {
    if (pct < 60) return { key: 'low', name: '舒适区间', color: '#16a34a', bg: '#f0fdf4', tip: '精力充沛，从容推进今天的计划～', petMood: 'playful' };
    if (pct < 85) return { key: 'mid', name: '适中区间', color: '#f59e0b', bg: '#fffbeb', tip: '今日任务适中，稳步推进即可', petMood: 'calm' };
    return { key: 'high', name: '高负荷', color: '#dc2626', bg: '#fef2f2', tip: '精力接近上限——建议精简计划，专注核心几件事，高效优于堆砌数量', petMood: 'lazy' };
  },
  _pet99LoadWarn(p, today) {
    try {
      const L = this.pet99Load();
      if (L.pct >= 85 && p.warned !== today) {
        p.warned = today;
        this._pet99Save(p);
        this._modal({ title: '⚡ 精力负荷预警', body: '<div style="font-size:13.5px;color:#475569;line-height:1.9;text-align:center;padding:6px 2px">你的今日精力已接近上限，大脑无法承载过多任务。<br><b style="color:#dc2626">建议精简计划，专注核心几件事即可，<br>高效优于堆砌数量。</b></div>', actions: [{ label: '知道了', primary: true }] });
      }
    } catch (e) {}
  },

  // ==================== 宠物交互文案（点击宠物触发）====================
  // v12.7 形象已换成 8-bit 像素白猫，文案沿用「小银」人格
  _pet99Lines() {
    return {
      playful: {
        stories: ['小银今天追着尾巴转了三圈，最后抱着尾巴睡着了——它觉得抓住了全世界。', '小银把你的拖鞋叼到了窝里，郑重地和你分享它这个月的珍藏。', '阳光晒进来的时候，小银喜欢摊成一张软软的小饼，尾巴尖轻轻打着拍子。', '小银偷偷把最爱的毛线球滚到了你脚边，这是它表达「一起玩」的最高礼节。'],
        jokes: ['问：像素猫最怕什么？答：分辨率调低，条纹糊掉。', '小银立志要捉住逗猫棒，屡败屡战——它说这叫「战略性撤退」。', '猫的日记：今天什么也没干，很充实。', '小银盯着一处空气看了十分钟——科学家也无法解释猫到底看见了什么。'],
        quotes: ['今天也在好好照顾自己，小银都看在眼里哦。', '一步一个脚印，你走得很稳。', '自律不是苦行，是给未来的自己递一颗糖。', '今天也是值得被记录的一天。'],
      },
      calm: {
        stories: ['小银安静地窝在你身边，听着键盘的声音，像听一首熟悉的曲子。', '午后的光落在小银的围巾上，一圈一圈，像把时间也梳理顺了。', '小银只是待在这里，不打扰，也不离开——陪伴本身就是它的语言。', '它把爪子收进身体下面，团成一个柔软的句号，陪你把今天慢慢写完。'],
        jokes: ['小银打了个哈欠——不是无聊，是「战略性储备能量」。', '猫为什么总要纸箱？小银：这叫极简主义生活。', '小银对毛线球的战争已进入第 100 天，双方仍相持不下。', '小银今天照镜子看了很久，然后决定不理那只猫了。'],
        quotes: ['稳稳的，就好。不着急。', '你已经在路上了，剩下的交给时间。', '记得偶尔抬头，喝口水，伸展一下。', '完成比完美更重要，今天已经很棒了。'],
      },
      lazy: {
        stories: ['小银把自己摊成一块软软的年糕，用眯眯眼告诉你：休息一下也没什么大不了。', '小银今天什么都没干，它说这是「猫式哲学」的重要实践。', '它慢吞吞地伸了个懒腰，好像在替你说：别撑着啦。', '小银用尾巴轻轻拍了拍垫子——那个位置是留给你的，坐下来歇会儿。'],
        jokes: ['小银的今日计划：躺着。执行情况：超额完成。', '猫生第一要义：能躺着，绝不坐着。小银已修炼满级。', '小银说它不是懒，是「节能模式」。', '小银梦见自己在跑步，然后累醒了，继续睡。'],
        quotes: ['已经做得够多了，剩下的明天再说。', '把自己照顾好，才是最重要的任务。', '大脑需要留白，就像小窝需要阳光。', '慢一点，反而走得更远。'],
      },
    };
  },
  // v12.9.36 宠物页自动行为循环 + 点击彩蛋 + 夜间睡眠
  //   动作全自动轮换（无手动按钮）；22:00–06:00 默认蜷成一团睡觉（与小家同口径）
  //   唯一手动触发的是彩蛋——点小银随机「掉落毛线球」/「主人像素手挥逗猫棒（尾端小鱼干）」
  _pet99AutoStop() {
    if (this.__pet99AutoRaf) { cancelAnimationFrame(this.__pet99AutoRaf); this.__pet99AutoRaf = 0; }
  },
  _pet99AutoStart() {
    this._pet99AutoStop();
    const cat = document.querySelector('.pxcat[data-live="1"]');
    if (!cat) return;
    const ACTS = ['idle', 'lick', 'coq', 'sleep', 'curled'];
    const DUR = { idle: [2500, 4500], lick: [2500, 4000], coq: [2500, 4000], sleep: [4000, 7000], curled: [5000, 9000] };
    const NAME = { idle: '待机中', lick: '舔爪爪中', coq: '撒娇中', sleep: '打盹中', curled: '蜷成一团睡觉 💤' };
    const NIGHT = '夜深了 · 小银蜷成一团睡觉 💤（22:00–06:00）';
    const isNight = () => { const h = new Date().getHours(); return h >= 22 || h < 6; };
    const label = document.getElementById('pet99ActNow');
    let i = ACTS.indexOf(cat.dataset.act); if (i < 0) i = 0;
    let end = 0;
    const loop = () => {
      if (!cat.isConnected) { this.__pet99AutoRaf = 0; return; }          // 页面重渲染/离开：自动停
      const now = performance.now();
      if (!cat.parentElement.querySelector('.p99-egg')) {                 // 彩蛋播放中不打扰
        if (isNight()) {                                                 // 夜间：默认蜷成一团睡觉
          if (cat.dataset.act !== 'curled') {
            cat.dataset.act = 'curled';
            if (label) label.textContent = NIGHT;
          }
          end = now + 600000;                                             // 10 分钟后再查（跨过 06:00 自然醒）
        } else if (now >= end) {
          i = (i + 1 + Math.floor(Math.random() * (ACTS.length - 1))) % ACTS.length; // 保证换动作
          cat.dataset.act = ACTS[i];
          if (label) label.textContent = NAME[ACTS[i]];
          end = now + (DUR[ACTS[i]][0] + Math.random() * (DUR[ACTS[i]][1] - DUR[ACTS[i]][0])); // DUR 本身即毫秒
        }
      }
      this.__pet99AutoRaf = requestAnimationFrame(loop);
    };
    this.__pet99AutoRaf = requestAnimationFrame(loop);
  },
  // 彩蛋：点小银 → 随机掉毛线球（掉落/弹跳/滚动）/ 主人像素手挥逗猫棒（尾端小鱼干晃动）
  _pet99Egg() {
    const stage = document.querySelector('.p99-cat-stage');
    const cat = stage && stage.querySelector('.pxcat');
    if (!stage || !cat) return;
    if (stage.querySelector('.p99-egg')) return;                          // 正在玩
    // v12.9.45 猫叫音效：点小银喵一声（合成喵 · 随机微变调 · 音效引擎 96-perm99.js）
    try { this._sfx99 && this._sfx99('meow'); } catch (e) {}
    const yarn = Math.random() < 0.5;
    const el = document.createElement('img');
    el.className = 'p99-egg ' + (yarn ? 'p99-egg-yarn' : 'p99-egg-wand');
    el.src = yarn ? (window.__px99YarnUrl || '') : (window.__px99WandUrl || '');
    if (!el.src) return;
    stage.appendChild(el);
    cat.dataset.act = 'coq';                                              // 开心互动（眯眯眼 + 抬爪）
    cat.classList.add('p99-hop');
    const label = document.getElementById('pet99ActNow');
    if (label) label.textContent = yarn ? '玩毛线球中 🧶' : '扑逗猫棒中 🎣';
    setTimeout(() => {
      el.remove(); cat.classList.remove('p99-hop');
      this._flash(yarn ? '🧶 毛线球滚远了——小银玩得心满意足' : '🎣 小银够到了小鱼干——开心到转圈');
    }, 5400);
  },

  // ==================== 宠物操作（喂食/重置）====================
  // v11.0 口粮三档：普通粮(+1成长)/营养罐头(+2)/鲜鱼盛宴(+3)——价格按新点数经济重定
  pet99FeedAsk() {
    const p = this._pet99Data();
    const rows = this._pet99Foods().map(f => `
      <div style="display:flex;align-items:center;gap:10px;margin-top:8px;padding:9px 10px;border-radius:11px;background:${f.id === 'food_fish' ? '#fff7ed' : f.id === 'food_can' ? '#f0fdf4' : '#f8fafc'};border:1.5px solid ${f.id === 'food_fish' ? '#fed7aa' : f.id === 'food_can' ? '#bbf7d0' : '#e2e8f0'}">
        <span style="font-size:24px">${f.ico}</span>
        <div style="flex:1;min-width:0"><b style="font-size:13px">${f.name}</b>
          <div style="font-size:11px;color:#64748b;margin-top:2px">成长 +${f.growth} · 饱腹 +${f.satiety} · 愉悦 +${f.joy}</div></div>
        <button class="btn btn-sm btn-primary" style="margin:0;${p.points < f.cost ? 'opacity:.5' : ''}" onclick="App.pet99Feed('${f.id}')">💎 ${f.cost}</button>
      </div>`).join('');
    this._modal({
      title: `🍜 给小银加餐（宝石 ${p.points}）`,
      body: `<div style="font-size:12px;color:#64748b;line-height:1.7">成年前加速成长；成年满级后仅维持饱腹、小幅提升愉悦。<b>不喂食不会有任何负面</b>，全部交互照常可用。</div>${rows}`,
      actions: [{ label: '先不喂', primary: true }],
    });
  },
  pet99Feed(foodId) {
    const p = this._pet99Data();
    const food = this._pet99Foods().find(f => f.id === (foodId || 'food_basic'));
    if (!food) return;
    if (p.points < food.cost) { this._flash(`宝石不足（需要 ${food.cost}，当前 ${p.points}）——宝石来自每日打卡 15/30 个与阿福审核通过的合格记录（见【个人中心 · 独行信条】）`); return; }
    // v12.9.45 喂食猫叫：小银开心喵一声（音效引擎 96-perm99.js）
    try { this._sfx99 && this._sfx99('meow'); } catch (e) {}
    const idx = this._pet99StageIdx(p);
    const wasAdult = idx >= 4;
    p.points -= food.cost;
    p.growth += food.growth;     // 成长只增不减（成年后等级封顶，不再升级）
    p.satiety = Math.min(100, p.satiety + food.satiety);
    p.joy = Math.min(100, p.joy + food.joy);
    this._pet99Save(p);
    const nowAdult = this._pet99StageIdx(p);
    if (!wasAdult && nowAdult > idx) {
      this._modal('🎉 成长进阶！', `<div style="text-align:center;padding:8px 0">${this._pet99CatHtml({ px: 130, act: 'coq' })}<div style="font-size:15px;font-weight:800;margin-top:8px">小银成长为「${this._pet99Stages[nowAdult].name}」啦！</div><div style="font-size:12.5px;color:#64748b;margin-top:6px">等级永久保留，不会降级～</div></div>`, [{ label: '太棒了', primary: true }]);
    } else if (wasAdult) {
      this._flash(`${food.ico} 小银已是成年满级——口粮维持饱腹、小幅提升愉悦（不喂也不会有任何负面哦）`);
    } else {
      this._flash(`${food.ico} 喂食成功：成长 +${food.growth}（${p.growth}/${this._pet99Stages[Math.min(4, this._pet99StageIdx(p) + 1)].need || '∞'} 餐进阶）· 愉悦 +${food.joy}`);
    }
    this._closeModal();
    this.gotoWb('pet99');
  },
  // ==================== v12.8 宠物装扮（像素风 · 宝石购买 · 恢复上线）====================
  // 图形由 62-pixelcat.js DECOR 像素叠层绘制（window.__px99DecorIcon 生成单品图标）；
  // 装扮跟着帧动画走：帽子/眼镜随头部姿态偏移，颈部固定——同一只像素猫，怎么动都戴着
  _pet99DecorCatalog() {
    return [
      { id: 'neck_bow',     slot: 'neck', n: '蓝蝴蝶结',   cost: 40,  d: '和浅粉围巾很搭的出门单品' },
      { id: 'neck_bell',    slot: 'neck', n: '金色铃铛圈', cost: 50,  d: '走到哪响到哪，再也不会走丢' },
      { id: 'hat_straw',    slot: 'hat',  n: '像素小草帽', cost: 60,  d: '田园猫必备，防晒又上镜' },
      { id: 'hat_crown',    slot: 'hat',  n: '碎花头环',   cost: 70,  d: '把整个春天戴在头上' },
      { id: 'hat_beret',    slot: 'hat',  n: '红贝雷帽',   cost: 80,  d: '艺术猫的标配，歪戴更俏皮' },
      { id: 'face_glasses', slot: 'face', n: '圆框小眼镜', cost: 90,  d: '一秒变身博学学士猫' },
    ];
  },
  _pet99ApplyDecor(p) {
    try { if (window.__px99ApplyDecor) window.__px99ApplyDecor(p.decor || {}); } catch (_) {}
  },
  // 购买装扮（买完自动戴上；已拥有则等价于穿戴切换）
  pet99BuyDecor(id) {
    const it = this._pet99DecorCatalog().find(x => x.id === id);
    if (!it) return;
    const p = this._pet99Data();
    p.ownedDecor = p.ownedDecor || [];
    if (p.ownedDecor.indexOf(id) !== -1) return this.pet99WearDecor(id);
    if (p.points < it.cost) return this._flash(`宝石不足（需要 ${it.cost}，当前 ${p.points}）——宝石来自每日打卡 15/30 个与阿福审核通过的合格记录（见【个人中心 · 独行信条】）`);
    p.points -= it.cost;
    p.ownedDecor.push(id);
    p.decor = Object.assign({}, p.decor || {});
    p.decor[it.slot] = id;
    this._pet99Save(p);
    this._pet99ApplyDecor(p);
    this._flash(`🎀 「${it.n}」已购入并戴在小银头上啦`);
    this.render_workbench();
  },
  // 穿戴/取下（同部位互斥；再点一次已穿戴的 = 取下）
  pet99WearDecor(id) {
    const it = this._pet99DecorCatalog().find(x => x.id === id);
    if (!it) return;
    const p = this._pet99Data();
    p.decor = Object.assign({}, p.decor || {});
    if (p.decor[it.slot] === id) {
      delete p.decor[it.slot];
      this._pet99Save(p);
      this._pet99ApplyDecor(p);
      this._flash(`已取下「${it.n}」`);
    } else {
      p.decor[it.slot] = id;
      this._pet99Save(p);
      this._pet99ApplyDecor(p);
      this._flash(`🎀 小银戴上了「${it.n}」`);
    }
    this.render_workbench();
  },
  // 装扮小图标（像素 sprite；异常回退 emoji）
  _pet99DecorIcon(it) {
    try {
      const url = window.__px99DecorIcon ? window.__px99DecorIcon(it.id) : '';
      // v12.9.40 下载悬浮键修复：装扮图标禁长按菜单（pointer-events:none 压掉手机浏览器原生下载键）
      if (url) return `<img class="p99-decor-ico" src="${url}" alt="${this.esc(it.n)}" draggable="false" oncontextmenu="return false;" ondragstart="return false;" style="-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;pointer-events:none;">`;
    } catch (_) {}
    return `<span style="font-size:24px">🎀</span>`;
  },

  pet99ResetAsk() {
    this._modal({
      title: '♻️ 重置宠物全部数据？',
      body: '<div style="font-size:13px;color:#475569;line-height:1.8">将清空宠物的<b>宝石、成长等级、愉悦度与当前动作</b>，重新从幼崽开始。<br><b style="color:#16a34a">不会删除你的真实自律业务记录</b>（打卡/专注/日记/书架/挑战等一切照旧；独行信条的经验与等级不受影响）。</div>',
      actions: [
        { label: '取消' },
        { label: '确认重置', onClick: () => {
            try { localStorage.removeItem(App._pet99Key); } catch (e) {}
            App._flash('♻️ 宠物数据已重置（业务记录不受影响）');
            App.gotoWb('pet99');
          } },
      ],
    });
  },

  // ==================== 宠物主页 ====================
  // 管家六维评价卡：昨日定级 + 近7日优秀可领取（当日 24 点定级）
  _pet99RatingCard() {
    const yesterday = this._hb99DkOff(-1);
    const gy = this._pet99Grade(yesterday);
    const gt = this._pet99Grade(Store.today());
    const dimBar = (d) => `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
      <span style="width:56px;font-size:11.5px;font-weight:700;color:#334155;flex-shrink:0">${d.ico} ${d.name}</span>
      <div style="flex:1;height:7px;border-radius:4px;background:#e2e8f0;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(d.done / d.total * 100)}%;background:${d.done / d.total >= 1 ? '#16a34a' : d.done / d.total >= .5 ? '#f59e0b' : '#f87171'}"></i></div>
      <b style="width:34px;text-align:right;font-size:11px;color:#64748b">${d.done}/${d.total}</b>
    </div>`;
    return `<div class="card" style="margin-bottom:14px;border:1.5px solid #c7d2fe;background:#eef2ff66">
      <div class="card-title"><span class="ico pxafu"></span>管家评价 · 六维综合
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">报告实时更新 · 当日 24 点定级</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px 12px;flex-wrap:wrap;margin-top:6px">
        <div style="font-size:12.5px">昨日（${yesterday.slice(5)}）：<b style="color:${gy.color}">${gy.lv} ${gy.score} 分</b></div>
        <div style="font-size:12.5px">今日实时：<b style="color:${gt.color}">${gt.lv} ${gt.score} 分</b></div>
        <span style="font-size:11px;color:#94a3b8;margin-left:auto">六维评价（v12.9.31 起不再产出宝石 · 见【个人中心 · 独行信条】）</span>
      </div>
      <div style="margin-top:8px">${this._pet99Dims(Store.today()).map(dimBar).join('')}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px">六维：健康/睡眠/饮食/卫生/运动/学习（核心卡完成度综合）；报告详情见【习惯 → 报告数据】。</div>
    </div>`;
  },
  pet99Page() {
    const p = this._pet99Data();
    const L = this.load99();
    const zone = this._pet99Zone(L.pct);
    const stageIdx = this._pet99StageIdx(p);
    const nextNeed = this._pet99Stages[Math.min(4, stageIdx + 1)].need;
    const act = p.act || 'idle';
    const bar = (label, v, color) => `<div style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;font-size:12px"><b>${label}</b><span style="color:${color};font-weight:800">${Math.round(v)}%</span></div>
      <div style="height:8px;border-radius:4px;background:#e2e8f0;margin-top:4px;overflow:hidden"><div style="height:100%;width:${Math.min(100, v)}%;background:${color};border-radius:4px;transition:width .4s"></div></div></div>`;
    let html = `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🐱</span>小银 · 像素小猫
        <button class="btn btn-ghost btn-sm p99-title-btn" onclick="App.gotoWb('pet99Shop')">🛒 口粮商店</button>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">8-bit 白猫小银戴着她最爱的浅粉围巾住在这里。这里的<b>宝石只增不减</b>：来自【独行信条】RPG 引擎——<b>当日累计打卡 15 个 +1 颗 / 30 个 +2 颗</b> · 阿福审核通过的合格分类记录（≥100 字）<b>每日 +1 颗</b>。</div>
      <div class="p99-cat-stage" style="cursor:pointer" onclick="App._pet99Egg()" title="点小银触发彩蛋">${this._pet99CatHtml({ px: 150, act, live: 1 })}</div>
      <div style="text-align:center;font-size:12px;color:#94a3b8">👆 点小银触发彩蛋（毛线球 / 逗猫棒）· 动作自动循环 · 当前 <span id="pet99ActNow" style="color:#7c3aed;font-weight:700">${({ idle: '待机中', lick: '舔爪爪中', coq: '撒娇中', sleep: '打盹中', curled: '蜷成一团睡觉 💤' })[act] || '待机中'}</span></div>
      <div style="text-align:center;margin-top:8px;font-size:12px;color:#92709a">
        🎀 ${(() => {
          const worn = this._pet99DecorCatalog().filter(it => (p.decor || {})[it.slot] === it.id);
          return worn.length ? worn.map(it => it.n).join(' · ') : '还没戴装扮——去装扮衣柜挑一件吧';
        })()}
      </div>
      <div class="p99-stage-row" style="display:flex;flex-wrap:wrap;margin-top:12px;align-items:center">
        <div style="font-size:13px"><b>${this._pet99Stages[stageIdx].name}</b>（成长 ${p.growth}${nextNeed ? ` / ${nextNeed} 餐` : ' · 已满级'}）</div>
        <div style="font-size:13px">💎 宝石 <b style="color:#7c3aed">${p.points}</b></div>
        <button class="btn btn-primary btn-sm" style="margin:0;background:linear-gradient(90deg,#ec4899,#f472b6);border:0" onclick="App.gotoWb('pet99Shop')">🎀 装扮衣柜</button>
        <button class="btn btn-primary btn-sm" style="margin:0;background:linear-gradient(90deg,#f59e0b,#f97316);border:0" onclick="App.pet99FeedAsk()">🍜 给小银加餐</button>
      </div>
      ${bar('😊 愉悦度（影响神态与台词风格，低也不会有负面）', p.joy, '#ec4899')}
      ${bar('🍚 饱腹度（不喂食不会变差、不限制任何交互）', p.satiety, '#f59e0b')}
      ${bar('🌱 成长进度（等级永久保留，不降级）', nextNeed ? Math.min(100, p.growth / nextNeed * 100) : 100, '#22c55e')}
    </div>
    ${this._pet99RatingCard()}
    <div class="card" style="margin-bottom:14px;border:1.5px solid ${zone.color}22;background:${zone.bg}">
      <div class="card-title"><span class="ico">⚡</span>每日精力负荷
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">每日凌晨自动重置 · 不跨日累计</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-top:8px;flex-wrap:wrap">
        <div class="p99-big-pct" style="font-size:30px;font-weight:900;color:${zone.color}">${Math.min(100, L.pct)}%</div>
        <div style="font-size:13px;font-weight:800;color:${zone.color}">${zone.name}</div>
      </div>
      <div style="height:14px;border-radius:7px;background:#e2e8f0;margin-top:8px;overflow:hidden;position:relative">
        <div style="height:100%;width:${Math.min(100, L.pct)}%;background:linear-gradient(90deg,${L.pct >= 85 ? '#ef4444,#dc2626' : L.pct >= 60 ? '#f59e0b,#f97316' : '#22c55e,#16a34a'});transition:width .4s"></div>
        <div style="position:absolute;left:60%;top:0;bottom:0;width:2px;background:#f59e0b55"></div>
        <div style="position:absolute;left:85%;top:0;bottom:0;width:2px;background:#ef444455"></div>
      </div>
      <div style="font-size:12.5px;color:#475569;margin-top:8px;line-height:1.7">${zone.tip}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px">区间：0-60% 舒适 · 60-85% 适中 · ≥85% 接近上限（弹窗提醒）· 100% 禁止新增今日任务</div>
      <div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#ffffffaa">
        <div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:6px">📋 今日精力构成（${L.used}/${L.cap} 点）</div>
        ${L.items.length ? L.items.map(x => `<div class="p99-load-item"><span>${x.ico} ${this.esc(x.name)}</span><b style="color:${x.val >= 20 ? '#dc2626' : '#475569'}">⚡${x.val}</b></div>`).join('') : '<div style="font-size:12px;color:#94a3b8">今日暂无任务占用——去【挑战中心】设定你的第一个目标吧</div>'}
        <div style="font-size:11px;color:#94a3b8;margin-top:6px">健身卡（⚡12）与学习卡（⚡8/张）今日打卡后计入数据参考；步数卡不计入。</div>
      </div>
    </div>
    <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="App.gotoWb('challenge99')">🏆 挑战中心（设定目标）</button>
      <button class="btn btn-ghost" onclick="App.pet99ResetAsk()">♻️ 重置宠物数据</button>
      <button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button>
    </div>`;
    return html;
  },

  // ==================== 宠物商城（v12.8：装扮衣柜恢复上线 + 口粮）====================
  pet99ShopPage() {
    const p = this._pet99Data();
    const owned = p.ownedDecor || [];
    const decor = p.decor || {};
    const wornCnt = this._pet99DecorCatalog().filter(it => decor[it.slot] === it.id).length;
    const decorRow = (it) => {
      const has = owned.indexOf(it.id) !== -1;
      const on = decor[it.slot] === it.id;
      return `<div class="p99-buy-row" style="background:${on ? '#fdf2f8' : '#fff'};border:1.5px solid ${on ? '#f9a8d4' : '#fbcfe866'}">
        ${this._pet99DecorIcon(it)}
        <div class="p99-buy-txt">
          <b style="font-size:13.5px">${it.n}<span style="font-size:10.5px;color:#a855f7;margin-left:5px">${{ hat: '帽子', neck: '颈部', face: '面部' }[it.slot]}</span></b>
          <div style="font-size:11.5px;color:#92709a;line-height:1.6;margin-top:2px">${it.d}</div>
        </div>
        ${has
          ? `<button class="btn btn-sm ${on ? 'btn-ghost' : 'btn-primary'}" style="margin:0;${on ? '' : 'background:linear-gradient(90deg,#ec4899,#f472b6);border:0'}" onclick="App.pet99WearDecor('${it.id}')">${on ? '脱下' : '戴上'}</button>`
          : `<button class="btn btn-sm btn-primary" style="margin:0;background:linear-gradient(90deg,#ec4899,#f472b6);border:0" onclick="App.pet99BuyDecor('${it.id}')">💎 ${it.cost}</button>`}
      </div>`;
    };
    let html = `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🛒</span>宠物商城 · 装扮与口粮
        <span class="sub" style="font-size:12px;color:#7c3aed;font-weight:800;margin-left:6px">💎 ${p.points} 颗</span>
        <button class="btn btn-ghost btn-sm p99-title-btn" onclick="App.navBack()">← 返回上一页</button>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">宝石来自你的真实自律行为（【独行信条】RPG 引擎：<b>当日累计打卡 15 个 +1 颗 / 30 个 +2 颗</b> · 阿福审核通过的合格分类记录 <b>每日 +1 颗</b>），<b>只增不减</b>；装扮与口粮都是外观与陪伴向内容，<b>无任何属性加成、无惩罚</b>。</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🎀</span>装扮衣柜（像素风 · ${owned.length}/${this._pet99DecorCatalog().length} 件 · 正在戴 ${wornCnt} 件）
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">帽子/颈部/面部各戴一件 · 买了永不清退</span>
      </div>
      ${this._pet99DecorCatalog().map(decorRow).join('')}
      <div style="font-size:11.5px;color:#94a3b8;margin-top:6px">装扮是小银的像素叠层——待机、舔爪、打盹、撒娇每个动作都戴着；小家里的小银也会同步换装。</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🍜</span>宠物口粮（三档 · 成长加速递增）</div>
      ${this._pet99Foods().map(f => `
      <div class="p99-buy-row" style="background:#fff7ed;border:1.5px solid #fed7aa">
        <span style="font-size:26px">${f.ico}</span>
        <div class="p99-buy-txt">
          <b style="font-size:13.5px">${f.name}</b>
          <div style="font-size:11.5px;color:#9a6b2f;line-height:1.6;margin-top:2px">${f.desc}</div>
        </div>
        <button class="btn btn-sm btn-primary" style="margin:0;background:linear-gradient(90deg,#f59e0b,#f97316);border:0" onclick="App.pet99Feed('${f.id}')">喂食 💎${f.cost}</button>
      </div>`).join('')}
      <div style="font-size:11.5px;color:#94a3b8;margin-top:6px">不喂食<b>不会带来任何负面效果</b>：小银不会变差、不会饿、不会限制任何交互功能。</div>
    </div>
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
});
