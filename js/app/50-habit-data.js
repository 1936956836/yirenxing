// 50-habit-data.js —— 习惯 25 卡 / 数据中心 / 记录板块 / 日结中心（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G2-生活基础 / G4-数据洞察（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
Object.assign(App, {
  // ====== 习惯板块 v3.99：25 张小卡 · 长按 1 秒打卡（v6.9 由 3 秒优化）· 时间窗 · 连续天数 · 补卡中心 ======
  // v2026.0905：正气/正心/正魂/正言四卡走「未破连续天数」（Store.habit99CleanStreak）；
  //   喝水走「每日累计 1300ml 达标制」；健身走「自然周 ≥3 次达标制」（Store.habit99WeeklyStreak）
  _hb99ZhengIds() { return ['zhengqi','zhengxin','zhenghun','zhengyan','posture']; },
  _hb99WaterGoal() { return (CONFIG.habit99 && CONFIG.habit99.waterGoalMl) || 1300; },
  _hb99FitNeed() { return (CONFIG.habit99 && CONFIG.habit99.fitnessWeeklyNeed) || 3; },
  // 本自然周（周一~周日）7 个日期键
  _hb99WeekKeys() {
    const now = new Date();
    const off = (now.getDay() + 6) % 7; // 周一=0
    const keys = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(now.getDate() - off + i);
      keys.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
    }
    return keys;
  },
  _hb99WaterTotal(dk) {
    const arr = Store.habit99Get(dk || this._habit99Now(), 'water');
    return Array.isArray(arr) ? arr.reduce((s, x) => s + (parseInt(x.amount, 10) || 0), 0) : 0;
  },
  _hb99FitnessWeekCount() {
    return this._hb99WeekKeys().filter(k => Store.habit99Get(k, 'fitness')).length;
  },
  _hb99StreakOf(c) {
    if (c.noStreak) return 0; // v2026.0906 消费记录卡（痘清洁/牙清洁/发修剪/搓澡洗/足洗户/耳采洗）不计坚持天数
    if (c.id === 'fitness') return Store.habit99WeeklyStreak('fitness', this._hb99FitNeed());
    return this._hb99ZhengIds().includes(c.id) ? Store.habit99CleanStreak(c.id) : Store.habit99Streak(c.id);
  },
  // v2026.0906 健身餐前置：当日（dk）健身卡已完成打卡（含补卡）
  _hb99FitnessTodayDone(dk) {
    const rec = Store.habit99Get(dk || this._habit99Now(), 'fitness');
    return !!(rec && (rec.ts || rec.makeup));
  },
  // v2026.0906 医疗消前置：当日【健康】卡已打卡 且 未勾选「感觉良好」（小病缠身/大病复查均可）
  _hb99MedCostOpen(dk) {
    const rec = this._dev99 ? this._dev99Get(dk || this._habit99Now(), 'health') : Store.habit99Get(dk || this._habit99Now(), 'health');
    return !!(rec && (rec.ts || rec.makeup) && rec.status !== '感觉良好');
  },
  // ===== v12.9.50 账号级隐私过滤（用户指令 · 铁律）=====
  //   非授权账号：服药卡选项不出现「抗病毒」（其药名走自填清单 meds99）；健康卡无「大病复查」（HIV/HPV/TP 专项）；
  //   卡片描述不含任何 HIV/TP/HPV/抗病毒字样
  _hb99OptsForMe(c) {
    const opts = (c && c.opts) ? c.opts.slice() : [];
    if (this._isAuthorizedAccount && this._isAuthorizedAccount()) return opts;
    if (c && c.id === 'medicine') return this._myMeds99().list.map(m => m.name);   // 非授权账号：勾选自己填的药
    if (c && c.id === 'health') return opts.filter(o => o !== '大病复查');
    return opts;
  },
  _hb99DescForMe(c) {
    if (!c) return '';
    if (this._isAuthorizedAccount && this._isAuthorizedAccount()) return c.desc || '';
    if (c.id === 'medicine') return '勾选药物（可多选 · 来自【健康】页你自己的药物清单）· 记录各药今日已服次数';
    if (c.id === 'health') return '感觉良好 / 小病缠身 二选一；小病缠身勾选症状（可多选）同步【就医数据】急诊科 · 不可补卡';
    if (c.id === 'medCost') return '需先打卡当日【健康】卡且未勾「感觉良好」才开放 · 填写消费金额（用途自动关联健康卡状态）· 同步【经济数据】· 消费记录卡不计坚持天数';
    return c.desc || '';
  },
  _habit99Now() { return Store.today(); },
  _habit99CardState(c) {
    // v10.0 开发者模式：读沙箱数据（不触碰真实 Store）
    const d = this._dev99 ? this._dev99Get(this._habit99Now(), c.id) : Store.habit99Get(this._habit99Now(), c.id);
    // v2026.0905 喝水：每日累计达标制（默认 1300ml，累计达标才算打卡成功）
    if (c.id === 'water') {
      const total = Array.isArray(d) ? d.reduce((s, x) => s + (parseInt(x.amount, 10) || 0), 0) : 0;
      const goal = this._hb99WaterGoal();
      return { done: total >= goal, partial: total > 0 && total < goal, count: total, need: goal };
    }
    // v2026.0905 健身：自然周 ≥3 次达标制（无需每日打卡；今日是否已记录单独判定）
    if (c.id === 'fitness') {
      const n = this._hb99FitnessWeekCount();
      const need = this._hb99FitNeed();
      return { done: n >= need, partial: n > 0 && n < need, count: n, need, todayDone: !!(d && (d.ts || d.makeup)) };
    }
    // v2026.0906 心情：当日记录 ≥1 次即完成；多次记录间有冷却（coolMin=距下次可记录的剩余分钟）
    if (c.id === 'mood') {
      const arr = Array.isArray(d) ? d : [];
      const coolMin = this._hb99MoodCoolingMin(arr);
      return { done: arr.length >= 1, partial: false, count: arr.length, need: 1, cooling: coolMin > 0, coolMin };
    }
    // v10.0 专注：当日完成 ≥1 次冥想/番茄钟即完成（当日可多次）
    if (c.id === 'focus') {
      const arr = Array.isArray(d) ? d : [];
      return { done: arr.length >= 1, partial: false, count: arr.length, need: 1 };
    }
    // v2026.0906 健康：当日记录一次即完成（良好/小病均可再次改记录前需先完成当日首次）
    if (c.id === 'health') {
      return { done: !!(d && (d.ts || d.makeup)), partial: false, count: d ? 1 : 0, need: 1 };
    }
    // v2026.0906 健身餐：需先完成当日健身卡才开放打卡（locked=前置未满足）
    if (c.id === 'fitnessMeal') {
      return { done: !!(d && (d.ts || d.makeup)), partial: false, count: 0, need: 0, locked: !this._hb99FitnessTodayDone() };
    }
    // v2026.0906 医疗消：需先打卡当日健康卡且未勾「感觉良好」才开放（locked=前置未满足）
    if (c.id === 'medCost') {
      return { done: !!(d && (d.ts || d.makeup)), partial: false, count: 0, need: 0, locked: !this._hb99MedCostOpen() };
    }
    if (c.multi || c.study) {
      const arr = Array.isArray(d) ? d : [];
      if (c.study) return { done: arr.length >= 2, partial: arr.length === 1, count: arr.length, need: 2 };
      return { done: false, partial: false, count: arr.length, need: 0 };
    }
    if (c.id === 'noonNap') return { done: !!(d && d.end), partial: !!(d && d.start && !d.end), count: 0, need: 0 };
    return { done: !!(d && (d.ts || d.makeup)), partial: false, count: 0, need: 0 };
  },
  // v2026.0906 心情卡冷却：距上次记录不足 cooldownMin 分钟时返回剩余分钟，否则返回 0
  _hb99MoodCoolingMin(arr) {
    if (!Array.isArray(arr) || !arr.length) return 0;
    const last = arr[arr.length - 1] || {};
    const t = Date.parse(last.ts || '');
    if (isNaN(t) || t <= 0) return 0;
    const cdMs = ((CONFIG.habitCards || []).find(x => x.id === 'mood') || {}).cooldownMin || 60;
    const leftMin = Math.ceil((t + cdMs * 60000 - Date.now()) / 60000);
    return Math.max(0, leftMin);
  },
  _habit99InWindow(c) {
    // v10.0 开发者模式：全部卡片视为窗口内开放（任意时间可测）
    if (this._dev99) return true;
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    return m >= c.winMin[0] && m <= c.winMin[1];
  },
  // ===== v10.0 开发者模式（沙箱测试：Store 习惯层整体沙箱化，退出即重置）=====
  // 用途：测试任意卡片有无 bug——打卡/联动计算（三餐自动打卡、消费记账、就医同步、五大模型、雷达图）
  // 全部按内存沙箱数据运行，真实存档零污染；退出或刷新页面后沙箱及其联动产物全部清空。
  _dev99: false,
  _dev99Data: null,
  _dev99Ledger: null,
  _dev99Med: null,
  _dev99Notes: null,
  _dev99Real: null,
  dev99Toggle() {
    if (this._dev99) {
      this._modal({ title: '👨‍💻 退出开发者模式？', body: '<div style="font-size:13px;color:#475569;line-height:1.8">退出后本次测试数据（沙箱打卡/联动计算/模型数据）立即清空，不影响任何真实数据。</div>',
        actions: [ { label: '取消' }, { label: '退出并清空', onClick: () => { App._dev99Exit(); App._map99Sel = null; App._flash('👨‍💻 已退出开发者模式，沙箱数据（含联动计算）已全部清空'); App.gotoWb('habit'); } } ] });
    } else {
      this._modal({ title: '👨‍💻 进入开发者模式？', body: `<div style="font-size:13px;color:#475569;line-height:1.8">
          开发者模式用于<b>测试全部 ${ (CONFIG.habitCards || []).length } 张卡片</b>有无 bug：
          <br>· 所有卡片无视打卡窗口/前置条件，任意使用
          <br>· 打卡与数据填写<b>只进内存沙箱，不落盘</b>；<b>联动计算照常运行</b>（三餐自动打卡、消费记账、就医同步、三大模型与雷达图均按沙箱数据计算）
          <br>· <b>每次进入都从空白状态开始</b>，退出或刷新页面即清空（含联动产生的全部数据）
        </div>`,
        actions: [ { label: '取消' }, { label: '🚀 进入（数据重置）', primary: true, onClick: () => {
            App._dev99Enter();
            App._map99Sel = 'dev';
            App._flash('👨‍💻 开发者模式已开启——联动计算按沙箱数据运行，退出后清零');
            App.gotoWb('habit');
          } } ] });
    }
  },
  // 进入开发者模式：Store 习惯层沙箱化——读写/联动计算（含五大模型、雷达图、补卡）全部走沙箱
  _dev99Enter() {
    this._dev99 = true;
    this._dev99Data = { days: {}, makeups: [] };   // 沙箱 habit99
    this._dev99Ledger = [];                        // 沙箱记账（经济数据联动计算，不落真实流水）
    this._dev99Med = [];                           // 沙箱就医同步（健康卡→急诊/感染科）
    this._dev99Notes = [];                         // 沙箱反省书/随笔
    this._dev99Real = {
      getHabit99: Store.getHabit99,
      habit99Get: Store.habit99Get,
      habit99Check: Store.habit99Check,
      habit99Makeup: Store.habit99Makeup,
      addLedger: Store.addLedger,
      addMedicalRecord: Store.addMedicalRecord,
      _flash: this._flash,
    };
    const S = this._dev99Data;
    Store.getHabit99 = () => S;
    Store.habit99Get = (dk, cid) => ((S.days[dk] || {})[cid]);
    Store.habit99Check = (dk, cid, p) => this._dev99Check(dk, cid, p, false);
    Store.habit99Makeup = (dk, cid, reason, reflection, p) => this._dev99Check(dk, cid, Object.assign({}, p, { makeup: true }), true, reason, reflection);
    Store.addLedger = (rec) => { this._dev99Ledger.push(Object.assign({ id: 'dev99', ts: new Date().toISOString() }, rec)); return { ok: true, sandbox: true }; };
    Store.addMedicalRecord = (rec) => { this._dev99Med.push(Object.assign({ id: 'dev99', ts: new Date().toISOString() }, rec)); return { ok: true, sandbox: true }; };
    // 沙箱态下所有提示统一加 🧪 前缀，避免「已同步」字样误导为真实写入
    this._flash = (m) => this._dev99Real._flash.call(this, '🧪 ' + m);
  },
  // 退出开发者模式：恢复 Store 原函数 + 清空全部沙箱数据（含联动计算产物）
  _dev99Exit() {
    if (this._dev99Real) {
      Store.getHabit99 = this._dev99Real.getHabit99;
      Store.habit99Get = this._dev99Real.habit99Get;
      Store.habit99Check = this._dev99Real.habit99Check;
      Store.habit99Makeup = this._dev99Real.habit99Makeup;
      Store.addLedger = this._dev99Real.addLedger;
      Store.addMedicalRecord = this._dev99Real.addMedicalRecord;
      this._flash = this._dev99Real._flash;
    }
    this._dev99 = false;
    this._dev99Data = null; this._dev99Ledger = null; this._dev99Med = null; this._dev99Notes = null; this._dev99Real = null;
  },
  // 沙箱读写（开发者模式专用 · 亦作为补丁后的 habit99Check/habit99Makeup 实现）
  _dev99Get(dk, cardId) {
    if (!this._dev99Data) this._dev99Data = { days: {}, makeups: [] };
    return ((this._dev99Data.days[dk] || {})[cardId]);
  },
  _dev99Check(dk, cardId, payload, isMakeup, reason, reflection) {
    if (!this._dev99Data) this._dev99Data = { days: {}, makeups: [] };
    if (!this._dev99Data.days[dk]) this._dev99Data.days[dk] = {};
    const day = this._dev99Data.days[dk];
    const c = (CONFIG.habitCards || []).find(x => x.id === cardId) || {};
    const MULTI = ['poop','pee','water','mood','trafficCost','lifeCost','livingCost','socialCost','goodsCost','growthCost','focus','eatCost'];
    const rec = Object.assign({ ts: new Date().toISOString() }, payload, isMakeup ? { makeup: true } : {});
    if (MULTI.includes(cardId) || c.multi) {
      if (!Array.isArray(day[cardId])) day[cardId] = [];
      day[cardId].push(rec);
    } else {
      day[cardId] = rec;
    }
    if (isMakeup) this._dev99Data.makeups.push({ date: dk, cardId, reason: reason || '', reflection: reflection || '', ts: new Date().toISOString() });
    return { ok: true, sandbox: true };
  },
  _wbHabit(wb, W) {
    const cards = CONFIG.habitCards || [];
    const today = this._habit99Now();
    // v12.9.12 习惯页大改版：像素地图在 innerHTML 落地后绘制（setTimeout 0）
    setTimeout(() => { try { this._map99Draw(); } catch (e) {} }, 0);
    let html = `
    <div class="map99">
      <div class="map99-top">
        <div class="map99-minis">
          <button type="button" class="map99-mini" title="补卡中心" onclick="App.habit99MakeupCenter()">🎫</button>
          <button type="button" class="map99-mini" title="地图攻略" onclick="App.habit99Help()">🗺️</button>
          <button type="button" class="map99-mini map99-d3" title="切换 2D/3D 视角" onclick="App._map99Toggle3d(this,event)">${this._map99Is3d() ? '2D' : '3D'}</button>
        </div>
        <button type="button" class="map99-chal" onclick="App.gotoWb('challenge99')">🏆 挑战中心</button>
      </div>
      <h1 class="map99-title">你好，旅行者！</h1>
      <div class="map99-sub">步步扎根，日日成长</div>
      <div class="map99-box${this._map99Is3d() ? ' is3d' : ''}" id="map99Box">${this._map99Labels()}</div>
      ${this._map99Sel ? '' : '<div class="map99-hint">👆 点击地图上的区域，该区域的卡片会出现在地图下方</div>'}
    </div>`;
    const waterGoal = this._hb99WaterGoal();
    const fitNeed = this._hb99FitNeed();
    const renderCard = (c) => {
      const st = this._habit99CardState(c);
      const streak = this._hb99StreakOf(c);
      const inWin = this._habit99InWindow(c);
      const doneCls = st.done ? ' hb99-done' : (st.partial ? ' hb99-partial' : '');
      const winCls = inWin ? ' hb99-open' : ' hb99-closed';
      // v6.9 未完成卡的窗口提示文案：自律区可补卡卡显示补卡中心指引；心情/健康卡本身不可补卡；消费区保持原窗口提示
      const winHint = c.cost
        ? `窗口 ${c.win}`
        : (c.noMakeup ? `窗口 ${c.win} · 此卡不可补卡` : '若当日执行但忘记打卡，可在补卡中心补卡');
      let badge;
      if (c.id === 'water') {
        // v2026.0905 喝水达标制：每日累计 ≥1300ml 才算打卡成功
        badge = st.done ? `✅ 达标 ${st.count}ml` : `今日 ${st.count}/${waterGoal}ml`;
      } else if (c.id === 'fitness') {
        // v2026.0905 健身周卡制：自然周 ≥3 次即达标
        badge = st.done ? `✅ 本周达标 ${st.count} 次` : `${st.todayDone ? '今日已练 · ' : ''}本周 ${st.count}/${fitNeed} 次`;
      } else if (c.id === 'mood') {
        // v2026.0906 心情卡：当日可多次记录（间隔 ≥1 小时）；未完成/冷却中区分展示
        badge = st.count > 0
          ? (st.cooling ? `今日 ×${st.count} · ⏳${st.coolMin}分` : `今日 ×${st.count} · 可再记`)
          : (inWin ? '长按 1 秒打卡' : winHint);
      } else if (c.id === 'health') {
        // v2026.0906 健康卡：感觉良好 / 小病缠身 / 大病复查 三选一（当日一次）
        const hd = Store.habit99Get(this._habit99Now(), 'health') || {};
        badge = st.done
          ? (hd.status === '小病缠身' ? `🤒 小病缠身 ×${(hd.symptoms || []).length}` : (hd.status === '大病复查' ? `🔬 复查 ${hd.recheckDisease || ''}` : '✅ 感觉良好'))
          : (inWin ? '长按 1 秒打卡' : winHint);
      } else if (c.id === 'fitnessMeal') {
        // v2026.0906 健身餐：需先完成当日健身卡才开放
        badge = st.done ? '✅ 已打卡' : (st.locked ? '🔒 先完成健身卡' : (inWin ? '长按 1 秒打卡' : winHint));
      } else if (c.id === 'medCost') {
        // v2026.0906 医疗消：需先打卡健康卡且未勾「感觉良好」才开放
        const rec = Store.habit99Get(today, c.id) || {};
        badge = st.done ? `✅ 已记录 ¥${(+rec.amount || 0)}` : (st.locked ? '🔒 先打卡健康卡' : (inWin ? '长按 1 秒打卡' : winHint));
      } else if (c.id === 'posture') {
        // v2026.0906 正姿卡：未破姿/小破姿/大破姿 三选一（当日一次）
        const ps = Store.habit99Get(today, 'posture') || {};
        badge = st.done
          ? (ps.level === '未破姿' ? '✅ 未破姿' : (ps.level === '大破姿' ? '❌ 大破姿' : '⚠️ 小破姿'))
          : (inWin ? '长按 1 秒打卡' : winHint);
      } else if (c.multi && c.cost) {
        // v2026.0906 多次消费卡（交通消/生活消/居住消/人情消/用品消/培养消）：当日可多次记录，显示次数与当日累计
        const arr = Array.isArray(Store.habit99Get(today, c.id)) ? Store.habit99Get(today, c.id) : [];
        const total = arr.reduce((s, x) => s + (+x.amount || 0), 0);
        badge = arr.length ? `今日 ×${arr.length} · ¥${Math.round(total * 100) / 100}` : (inWin ? '长按 1 秒打卡' : winHint);
      } else if (c.cost) {
        // v2026.0906 消费记录卡：显示已记录金额（不计坚持天数）
        const rec = Store.habit99Get(today, c.id) || {};
        badge = st.done ? `✅ 已记录 ¥${(+rec.amount || 0)}` : (inWin ? '长按 1 秒打卡' : winHint);
      } else if (c.focus) {
        // v10.0 专注卡：显示今日冥想/番茄分钟数（当日可多次，完成任意一次即算当日完成）
        const t = Store.focus99Today();
        badge = t.count > 0
          ? `✅ 今日 ×${t.count} · 🧘${t.medMin}分 🍅${t.pomoMin}分`
          : (inWin ? '长按 1 秒开始' : winHint);
      } else if (c.id === 'privacyWash') {
        // v10.0 隐私洗：部位 + 不适症状提示
        const rec = this._dev99 ? this._dev99Get(today, 'privacyWash') : Store.habit99Get(today, 'privacyWash');
        badge = st.done
          ? `✅ ${(rec.parts || []).map(p => p === '清洗肛门' ? '肛门' : '私处').join('+')}${rec.symptom && rec.symptom !== '无' ? ` · ⚠${rec.symptom}` : ''}`
          : (inWin ? '长按 1 秒打卡' : winHint);
      } else if (st.done) {
        badge = c.multi ? `今日 ×${st.count}` : (c.study ? '2/2 完成' : (c.zheng ? '📋 已记录' : '✅ 已打卡'));
      } else {
        badge = st.partial ? (c.study ? `1/2 · ${c.id === 'noonNap' ? '待记录起床' : '45 分钟后开放第 2 次'}` : '半完成') : (inWin ? '长按 1 秒打卡' : winHint);
      }
      const streakHtml = c.id === 'fitness'
        ? (streak > 0 ? `💪${streak}周` : '')
        : (streak > 0 ? '🌳' + streak : '');
      // v12.9.12 卡面角标：地图区域分组标签（成长/消费/戒/生活）·「有界」= 需先完成前置打卡才开放的卡（健身餐/医疗消）
      const rk = this._map99RegionOf(c);
      // v12.9.54 用户指令：所有自律习惯（生活/成长/戒分类）卡片增加「已连续坚持 x 天」标识
      //   （消费类卡不计；健身为周卡口径 → 连续坚持 x 周；戒类 = 连续未破天数）
      const cont99Html = rk !== 'cost' && streak > 0
        ? `<div class="hb99-cont99">🔥 已连续坚持 ${streak}${c.id === 'fitness' ? ' 周' : ' 天'}</div>` : '';
      // v2026.0906 消费记录卡累计统计（全量历史：累计消费 x 元 · x 次）
      const costTotals = c.cost ? this._hb99CostTotals(c.id) : null;
      const tagRegionHtml = `<span class="hb99-tag hb99-tag-${rk}">${rk === 'zheng' ? '戒' : (rk === 'growth' ? '成长' : (rk === 'cost' ? '消费' : '生活'))}</span>`;
      const tagGated = c.gated ? '<span class="hb99-tag hb99-tag-gated">有界</span>' : '';
      return `
        <div class="habit99-card${doneCls}${winCls}" id="hb99-${c.id}" onclick="App.habit99Detail('${c.id}')"
             onpointerdown="App._habit99HoldStart('${c.id}')" onpointerup="App._habit99HoldEnd('${c.id}')" onpointerleave="App._habit99HoldEnd('${c.id}')"
             onpointercancel="App._habit99HoldEnd('${c.id}')">
          <div class="hb99-top">
            <span class="hb99-ico">${c.ico}</span>
            <span class="hb99-streak">${streakHtml}</span>
          </div>
          <div class="hb99-name">${tagRegionHtml}${tagGated}${this.esc(c.name)}</div>
          <div class="hb99-win">⏰ ${c.win}</div>
          <div class="hb99-badge">${badge}</div>
          ${cont99Html}
          ${costTotals && costTotals.cnt ? `<div style="font-size:10px;color:#b45309;font-weight:700;margin-top:2px">📈 累计消费${costTotals.total}元 · ${costTotals.cnt}次</div>` : ''}
          <div class="hb99-hold-ring"></div>
        </div>`;
    };
    // —— v12.9.12 开发者模式沙箱横幅（开发工厂开启时常显于地图下方）——
    if (this._dev99) {
      html += `<div class="card" style="margin-bottom:14px;border:2px dashed #6366f1;background:linear-gradient(135deg,#eef2ff,#faf5ff)">
        <div class="card-title"><span class="ico">⚙️</span>开发工厂 · 开发者模式测试中
          <button class="btn btn-sm btn-ghost" style="float:right;margin:0" onclick="App.dev99Toggle()">退出并清空</button>
        </div>
        <div style="font-size:12.5px;color:#4338ca;line-height:1.8;margin-top:6px">
          🧪 当前为<b>沙箱测试态</b>：全部 ${cards.length} 张卡片无视窗口/前置条件任意使用；打卡、填写与<b>联动计算</b>（三餐自动打卡 / 消费记账 / 就医同步 / 五脏六腑·消化代谢模型 / 雷达图）全部按<b>内存沙箱数据运行</b>，不写入真实存档；<b>退出或刷新页面即全部清零</b>（含联动产生的数据）。
          <br>📊 当前沙箱：已打卡 <b>${Object.keys((this._dev99Data && this._dev99Data.days[this._habit99Now()]) || {}).length}</b> 张卡 · 联动记账 <b>${(this._dev99Ledger || []).length}</b> 笔 · 就医同步 <b>${(this._dev99Med || []).length}</b> 条
        </div>
      </div>`;
    }
    // —— v12.9.12 区域卡片：点击地图区域后，地图下方出现该区域的小卡（折叠动画 + 长按打卡全保留）——
    const sel = this._map99Sel;
    if (['life', 'growth', 'cost', 'zheng'].indexOf(sel) >= 0) {
      const meta = this._map99Regions().find(r => r.k === sel) || {};
      const list = cards.filter(c => this._map99RegionOf(c) === sel);
      const done = list.filter(c => this._habit99CardState(c).done).length;
      const label = sel === 'cost' ? '已记' : '完成';
      const folded = this._habit99Fold('map99_' + sel);
      const SUBS = {
        life: '作息 · 三餐 · 清洁 · 身体记录 · 用药与健康（长按 1 秒打卡 · 单击查看详情）',
        growth: '健身 · 步数 · 健身餐 · 学习晨午晚 · 专注（挑战目标卡置顶）',
        cost: '按实际消费打卡 · 不计坚持天数 · 每笔自动同步【经济数据】',
        zheng: '正气 · 正心 · 正魂 · 正言 · 正姿（未破才计连续天数）',
      };
      html += `<div class="hb99-foldbar" data-fold="map99_${sel}" data-done="${done}" data-total="${list.length}" data-label="${label}" onclick="App._habit99ToggleFold('map99_${sel}', event)">
        <div class="hb99-fold-main">
          <span class="hb99-fold-arrow${folded ? '' : ' open'}">▼</span>
          <span style="font-size:15px">${meta.ico}</span><b style="font-size:13.5px">${meta.n} · ${list.length} 张小卡</b>
          <span class="hb99-fold-sum">${folded ? `今日 ${done}/${list.length} ${label}` : '点击折叠'}</span>
        </div>
        <div class="hb99-fold-sub">${SUBS[sel] || ''}</div>
      </div>`;
      // v11.0 挑战小卡置顶：挑战中心生成的目标卡（🔗 健身/学习）排成长海湾最前
      html += `<div class="habit99-grid hb99-fold-body${folded ? ' folded' : ''}${this._map99Is3d() ? ' is3d' : ''}" data-body="map99_${sel}">${sel === 'growth' && this._challengeCardsHtml ? this._challengeCardsHtml() : ''}${list.map(renderCard).join('')}</div>`;
    }
    // —— 数据研究所 = 数据中心九库（点击功能卡进入对应数据库）——
    if (sel === 'data') {
      const _female = this._period99Female && this._period99Female();
      const dcTabs = [
        { tab: 'habit',     ico: '📊', n: '习惯数据', d: '全部习惯的历史检索' },
        { tab: 'ledger',    ico: '💰', n: '经济数据', d: '记账 · 用多久 · 多久吃' },
        { tab: 'illness',   ico: '🩺', n: '就医数据', d: '病例记录 · 体检建议' },
        { tab: 'sport99',   ico: '🏃', n: '运动数据', d: '体测分析 · 动作教学' },
        { tab: 'study99',   ico: '🎓', n: '学习数据', d: '知识树 · 练习记录' },
        { tab: 'health99',  ico: '🍜', n: '饮食数据', d: '今天吃什么盲盒 · 健康指数 · 五脏六腑模型' },
        { tab: 'report99',  ico: '📰', n: '报告数据', d: '每日图文总结报告' },
        { tab: 'reflect99', ico: '🪞', n: '反省数据', d: '补卡留痕 · 反省书' },
        { tab: 'profile',   ico: '🧾', n: '主人档案', d: '信息 · BMI · 成就勋章 ×20' },
        { tab: 'quit99',    ico: '👹', n: '戒断数据', d: '四魔封印 · 反向打卡' },
        { tab: 'apps99',    ico: '📱', n: '应用数据', d: '各 App 使用时长 · 娱乐标红' },
        ...(_female ? [{ tab: 'period99', ico: '🌷', n: '经期数据', d: '女生专属 · 周期月历 · 排卵预测' }] : []),
      ];
      html += `<div class="hb99-foldbar" style="cursor:default">
        <div class="hb99-fold-main">
          <span style="font-size:15px">🔭</span><b style="font-size:13.5px">数据研究所 · 数据中心${_female ? '十二' : '十一'}库</b>
          <span class="hb99-fold-sum">${_female ? 12 : 11} 座数据库</span>
        </div>
        <div class="hb99-fold-sub">打卡数据的去向在这里汇总 · 点击卡片进入对应数据库</div>
      </div>
      <div class="wb-entry-grid${this._map99Is3d() ? ' is3d' : ''}">
        ${dcTabs.map(x => `<div class="card wb-entry-card" onclick="App._map99OpenData('${x.tab}')">
          <div class="wb-ico">${x.ico}</div><div class="wb-name">${x.n}</div><div class="wb-hint">${x.d}</div>
        </div>`).join('')}
      </div>`;
    }
    // v12.7：习惯页是 dock 直达页，「返回首页」按钮已删除（左下角 dock 常驻）
    return html;
  },
  // ==================== v12.9.12 像素地图（6 区域 · 与 62-pixelcat.js 小银同一套画法）====================
  // 96×64 低分辨率画布逐格 fillRect 手绘 + CSS pixelated 放大（每个色块都是设计出来的，非降采样马赛克）；
  // 区域完成度 → 亮度（未点亮=蒙灰 · 打卡越多越亮）；像素虚线=区域边界（选中区域金色）；区域名 HTML 叠层
  _map99Sel: null,
  // 卡片 → 地图区域：消费卡→消费都市 · 戒断卡→戒断寺庙 · 运动/学习/专注→成长海湾 · 其余自律卡→生活小镇
  _map99RegionOf(c) {
    if (c.cost) return 'cost';
    if (c.zheng) return 'zheng';
    if (c.study || c.focus || c.id === 'fitness' || c.id === 'steps' || c.id === 'fitnessMeal') return 'growth';
    return 'life';
  },
  _map99Regions() {
    return [
      { k: 'life',   n: '生活小镇',   ico: '🏘️', rect: [0, 0, 34, 26] },
      { k: 'growth', n: '成长海湾',   ico: '⛵', rect: [34, 0, 62, 26] },
      { k: 'cost',   n: '消费都市',   ico: '🏙️', rect: [0, 26, 30, 22] },
      { k: 'zheng',  n: '戒断寺庙',   ico: '🛕', rect: [30, 26, 22, 22] },
      { k: 'data',   n: '数据研究所', ico: '🔭', rect: [52, 26, 44, 22] },
      { k: 'dev',    n: '开发工厂',   ico: '⚙️', rect: [0, 48, 96, 16] },
    ];
  },
  // 区域完成度（0..1）：打卡/记录越多越亮 · 开发工厂=开发者模式开关灯 · 数据研究所=今日有数据即点亮
  _map99Prog(key) {
    if (key === 'dev') return this._dev99 ? 1 : 0;
    const cards = CONFIG.habitCards || [];
    if (key === 'data') return cards.some(c => this._habit99CardState(c).done) ? 1 : 0;
    const list = cards.filter(c => this._map99RegionOf(c) === key);
    return list.length ? list.filter(c => this._habit99CardState(c).done).length / list.length : 0;
  },
  // 区域名标签（仅显示区域名 · 点击穿透到 canvas）
  _map99Labels() {
    const sel = this._map99Sel;
    return this._map99Regions().map(g => {
      const [x, y, w, h] = g.rect;
      const cx = ((x + w / 2) / 96 * 100).toFixed(2), cy = ((y + h / 2) / 64 * 100).toFixed(2);
      return `<span class="map99-label${sel === g.k ? ' on' : ''}" style="left:${cx}%;top:${cy}%">${g.n}</span>`;
    }).join('');
  },
  // 建 canvas 并绘制像素地图（每次整页渲染后重绘 · 亮度随打卡进度实时变化）
  // v12.9.13b 双层画布：地面层 + 立体物层（2D 完全重合 · 3D 由 preserve-3d 抬升立体物出真实景深）
  _map99Draw() {
    const box = document.getElementById('map99Box');
    if (!box || box.dataset.done) return;
    box.dataset.done = '1';
    let c, lift;
    try { c = document.createElement('canvas'); lift = document.createElement('canvas'); } catch (e) { return; }
    c.width = 96; c.height = 64;
    c.className = 'map99-canvas';
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', '像素世界地图：生活小镇、成长海湾、消费都市、戒断寺庙、数据研究所、开发工厂');
    lift.width = 96; lift.height = 64;
    lift.className = 'map99-lift';
    lift.setAttribute('aria-hidden', 'true');
    const ctx = c.getContext && c.getContext('2d');
    const lctx = lift.getContext && lift.getContext('2d');
    if (!ctx || !lctx) return;
    this._map99Art(ctx, lctx);
    c.addEventListener('click', (e) => {
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = (e.clientX - r.left) / r.width * 96;
      const py = (e.clientY - r.top) / r.height * 64;
      const reg = this._map99Regions().find(g => { const q = g.rect; return px >= q[0] && px < q[0] + q[2] && py >= q[1] && py < q[1] + q[3]; });
      if (reg) this._map99Pick(reg.k);
    });
    box.insertBefore(c, box.firstChild);      // 地面层（接收点击）
    box.insertBefore(lift, c.nextSibling);    // 立体物层（穿透点击 · 3D 抬升）
    // v12.9.13 天气动画层（与地图同 96×64 像素网格 · 3D 悬浮在半空）
    try {
      const fx = document.createElement('canvas');
      fx.width = 96; fx.height = 64;
      fx.className = 'map99-fx';
      fx.setAttribute('aria-hidden', 'true');
      box.insertBefore(fx, lift.nextSibling);
      this._map99FxStart(fx);
    } catch (e) {}
    // v12.9.13 昼夜心跳：每分钟重绘（朝阳→正午→夕阳→黑夜→深夜→黎明的连续时间色罩）
    this._map99Ctx = { g: ctx, s: lctx };
    this._map99Tick();
    // 无天气缓存时静默补拉一次（复用 25-home-cards 的 loadWeather 定位+Open-Meteo 管线）
    try {
      const wc = JSON.parse(localStorage.getItem('weather_cache') || 'null');
      if (!wc || !wc.data || (Date.now() - (wc.ts || 0)) > 30 * 60 * 1000) {
        if (typeof this.loadWeather === 'function') this.loadWeather().catch(() => {});
      }
    } catch (e) {}
  },
  // v12.9.13 2D/3D 视图切换（内容不变 · 纯 CSS 透视变换 · localStorage 记忆）
  _map99Is3d() {
    try { return localStorage.getItem('map99_3d') === '1'; } catch (e) { return false; }
  },
  _map99Toggle3d(btn, ev) {
    const on = !this._map99Is3d();
    try { localStorage.setItem('map99_3d', on ? '1' : '0'); } catch (e) {}
    const box = document.getElementById('map99Box');
    if (box) box.classList.toggle('is3d', on);
    // v12.9.37 卡随图动：地图立起来的同时，下方区域小卡网格（自律打卡/消费记录）同步切 3D 立体卡
    // v12.9.39 数据研究所九库入口卡（wb-entry-grid）同步切 3D——此前漏了这张网格导致仍显示 2D
    document.querySelectorAll('.habit99-grid, .wb-entry-grid').forEach(g => g.classList.toggle('is3d', on));
    if (btn) btn.textContent = on ? '2D' : '3D';
    if (ev && ev.stopPropagation) ev.stopPropagation();
  },
  // v12.9.13 昼夜心跳：canvas 仍在文档中才重绘（整页渲染会自然换新 canvas）
  _map99Tick() {
    if (this._map99Timer) return;
    this._map99Timer = setInterval(() => {
      try {
        const cc = this._map99Ctx;
        if (!cc || !cc.g || !cc.g.canvas || !cc.g.canvas.isConnected) return;
        this._map99Art(cc.g, cc.s);
      } catch (e) {}
    }, 60000);
  },
  _map99Pick(key) {
    if (key === 'dev') { this.dev99Toggle(); return; }    // 开发工厂 = 开发者模式开关（确认弹窗内进/退）
    this._map99Sel = this._map99Sel === key ? null : key; // 再点一次同区域 = 收起
    this.render_workbench();
  },
  // 数据研究所功能卡 → 数据中心对应子库（gotoWb 会把 tab 重置回 home，故先导航再落 tab）
  _map99OpenData(tab) {
    if (!this._dc99) this._dc99 = { card: '_summary', metric: 'nightH', chart: 'line', range: 7, tab: 'home' };
    if (tab === 'sport99' && this._sp99) this._sp99.view = 'home';
    if (tab === 'study99' && this._st99) this._st99.view = 'home';
    this._map99DataTab = tab;      // gotoWb 后由 render_workbench 前落位
    this.gotoWb('datacenter99');
    if (this._dc99 && this._map99DataTab) { this._dc99.tab = this._map99DataTab; this._map99DataTab = null; this.render_workbench(); }
  },
  // 像素画本体：R=矩形填格（T=当前层）· adjOf=区域亮度调制（p=0 蒙灰 34% → p=1 提亮 24%）· dashed=像素虚线边界（地面层）
  // v12.9.13b 双层：ctxG=地面层（草地/海面/道路/虚线界）· ctxS=立体物层（房屋/树木/楼宇/寺庙等 · 3D 抬升出景深）
  _map99Art(ctxG, ctxS) {
    if (!ctxS) ctxS = ctxG;
    const hex2 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const DIM = hex2('#66717B'), WHT = [255, 255, 255];
    const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
    const adjOf = (p) => (h) => 'rgb(' + mix(mix(hex2(h), DIM, 0.34 * (1 - p)), WHT, 0.24 * p).join(',') + ')';
    let T = ctxG;
    const R = (x, y, w, h, col) => { T.fillStyle = col; T.fillRect(x, y, w, h); };
    const dashed = (x, y, w, h, col) => {
      ctxG.fillStyle = col;
      for (let i = x; i < x + w; i += 5) { const s = Math.min(3, x + w - i); ctxG.fillRect(i, y, s, 1); ctxG.fillRect(i, y + h - 1, s, 1); }
      for (let j = y; j < y + h; j += 5) { const s = Math.min(3, y + h - j); ctxG.fillRect(x, j, 1, s); ctxG.fillRect(x + w - 1, j, 1, s); }
    };
    // v12.9.13b 双层清屏（立体物层有透明区，每分钟重绘前必须清空避免残影堆叠）
    ctxG.clearRect(0, 0, 96, 64);
    if (ctxS !== ctxG) ctxS.clearRect(0, 0, 96, 64);

    // —— 生活小镇（草地 · 三栋小屋 · 大树 · 小路 · 篱笆 · 花草）——
    const life = adjOf(this._map99Prog('life'));
    R(0, 0, 34, 26, life('#A9D6A0'));
    R(1, 2, 9, 3, life('#C4E4BA')); R(21, 17, 10, 4, life('#C4E4BA')); R(5, 15, 6, 3, life('#96C58C'));
    R(3, 21, 29, 2, life('#E7D9B8')); R(15, 19, 3, 2, life('#E7D9B8'));
    T = ctxS;  // —— 立体物：三栋小屋 + 大树 ——
    R(4, 8, 8, 6, life('#FCF3E5')); R(4, 8, 1, 6, life('#FFFDF9'));
    R(3, 6, 10, 2, life('#E2955E')); R(4, 5, 8, 1, life('#EEAC7C')); R(5, 4, 6, 1, life('#F8D0A6'));
    R(7, 10, 2, 4, life('#9FC4DA')); R(4, 10, 2, 2, life('#F3D9A8'));
    R(17, 3, 9, 7, life('#FCF3E5')); R(17, 3, 1, 7, life('#FFFDF9'));
    R(16, 2, 11, 1, life('#7FA8D9')); R(17, 1, 9, 1, life('#9CC0E8')); R(18, 0, 7, 1, life('#B7D4F2'));
    R(19, 6, 2, 4, life('#9FC4DA')); R(23, 5, 2, 2, life('#F3D9A8'));
    R(26, 12, 6, 5, life('#FCF3E5')); R(25, 11, 8, 1, life('#EA9C7E'));
    R(28, 14, 2, 3, life('#9FC4DA'));
    R(31, 4, 2, 5, life('#C9A27E')); R(28, 1, 6, 4, life('#A0CE97')); R(29, 1, 4, 1, life('#BEE2B2'));
    T = ctxG;  // —— 地面：篱笆桩 + 花草 ——
    for (let x = 2; x < 32; x += 4) R(x, 24, 1, 2, life('#D9C29A'));
    R(12, 16, 1, 1, life('#E8654F')); R(13, 22, 1, 1, life('#F2C94C')); R(22, 14, 1, 1, life('#E8654F')); R(9, 6, 1, 1, life('#F2C94C'));

    // —— 成长海湾（海面 · 波浪 · 沙滩 · 码头 · 帆船 · 浮标 · 小岛棕榈 · 树苗）——
    const gro = adjOf(this._map99Prog('growth'));
    R(34, 0, 62, 20, gro('#7EC8E3'));
    R(34, 0, 62, 6, gro('#68BCDA')); R(34, 0, 62, 2, gro('#57AED0'));
    const WV = gro('#A8DCEF');
    R(40, 6, 4, 1, WV); R(52, 4, 3, 1, WV); R(62, 7, 4, 1, WV); R(74, 5, 3, 1, WV); R(85, 8, 4, 1, WV);
    R(44, 12, 4, 1, WV); R(58, 10, 3, 1, WV); R(72, 13, 4, 1, WV); R(83, 12, 3, 1, WV);
    R(34, 20, 62, 6, gro('#F2D9A4')); R(34, 20, 62, 1, gro('#FBEBC9'));
    T = ctxS;  // —— 立体物：树苗 · 码头 · 帆船 · 浮标 · 小岛棕榈 ——
    R(37, 22, 1, 3, gro('#7FB07C')); R(36, 20, 3, 2, gro('#86B982')); R(36, 20, 1, 1, gro('#A0CE97'));
    R(57, 10, 1, 5, gro('#8B5E3C')); R(58, 10, 2, 1, gro('#E8654F'));
    R(58, 13, 12, 2, gro('#D4B08C')); R(58, 15, 12, 1, gro('#B58B66'));
    R(59, 16, 1, 4, gro('#B58B66')); R(68, 16, 1, 4, gro('#B58B66'));
    R(46, 6, 1, 7, gro('#8B5E3C'));
    R(47, 7, 5, 1, gro('#FFFFFF')); R(47, 8, 4, 2, gro('#FFFFFF')); R(47, 10, 3, 1, gro('#E2E8F0'));
    R(44, 13, 7, 2, gro('#C2604F')); R(44, 13, 7, 1, gro('#DE7B6C'));
    R(38, 16, 2, 2, gro('#E8654F')); R(38, 16, 2, 1, gro('#FBF2E2'));
    R(87, 16, 8, 4, gro('#E8D5A8')); R(88, 15, 6, 1, gro('#F2D9A4'));
    R(90, 11, 1, 4, gro('#8B5E3C')); R(88, 9, 5, 2, gro('#66B08A')); R(87, 10, 1, 1, gro('#66B08A')); R(93, 10, 1, 1, gro('#66B08A'));

    // —— 消费都市（柏油路 · 高楼灯火 · 临街商铺 · 斑马线 · 金币）——
    const cst = adjOf(this._map99Prog('cost'));
    T = ctxG;  // —— 地面：柏油路 + 人行道 ——
    R(0, 26, 30, 16, cst('#8E99A6'));
    R(0, 42, 30, 6, cst('#A5AEB9')); R(0, 42, 30, 1, cst('#C4CBD3'));
    T = ctxS;  // —— 立体物：三栋楼宇 + 商铺遮阳棚 ——
    R(2, 28, 6, 14, cst('#9FB3C8')); R(2, 28, 6, 1, cst('#B8CBDC'));
    R(3, 30, 1, 1, cst('#F6D98A')); R(5, 30, 1, 1, cst('#F6D98A')); R(3, 33, 1, 1, cst('#F6D98A')); R(5, 33, 1, 1, cst('#7E96AE')); R(3, 36, 1, 1, cst('#F6D98A')); R(5, 36, 1, 1, cst('#F6D98A'));
    R(9, 26, 7, 16, cst('#8FA6BE')); R(9, 26, 7, 1, cst('#A8BDD2'));
    R(10, 29, 1, 1, cst('#F6D98A')); R(12, 29, 1, 1, cst('#F6D98A')); R(14, 29, 1, 1, cst('#F6D98A'));
    R(10, 32, 1, 1, cst('#F6D98A')); R(12, 32, 1, 1, cst('#7E96AE')); R(14, 32, 1, 1, cst('#F6D98A'));
    R(10, 35, 1, 1, cst('#F6D98A')); R(12, 35, 1, 1, cst('#F6D98A')); R(14, 35, 1, 1, cst('#F6D98A'));
    R(18, 32, 10, 10, cst('#FCF3E5')); R(18, 32, 1, 10, cst('#FFFDF9'));
    for (let x = 17; x < 27; x += 4) { R(x, 29, 2, 2, cst('#F0A75C')); R(x + 2, 29, 2, 2, cst('#F7F0E0')); }
    R(22, 36, 3, 6, cst('#9FC4DA')); R(19, 34, 2, 2, cst('#B8DCE8')); R(24, 34, 2, 2, cst('#F2C94C'));
    T = ctxG;  // —— 地面：斑马线 + 金币 ——
    for (let x = 2; x < 28; x += 4) R(x, 40, 2, 2, cst('#E2E8F0'));
    R(5, 44, 2, 2, cst('#F2C94C')); R(9, 45, 2, 2, cst('#F2C94C')); R(13, 44, 2, 2, cst('#F2C94C')); R(24, 45, 2, 2, cst('#F2C94C'));

    // —— 戒断寺庙（山林 · 红墙黛瓦 · 匾额石阶 · 鸟居 · 竹 · 香炉香烟）——
    const zh = adjOf(this._map99Prog('zheng'));
    T = ctxG;  // —— 地面：山林 ——
    R(30, 26, 22, 22, zh('#9DBE8F'));
    R(30, 26, 22, 4, zh('#8FB083'));
    R(31, 26, 5, 3, zh('#7E9B8A')); R(42, 26, 6, 2, zh('#8FAB97'));
    T = ctxS;  // —— 立体物：红墙黛瓦寺庙 + 石阶 + 鸟居 + 竹 + 香炉香烟 ——
    R(34, 33, 14, 9, zh('#C05A46')); R(34, 33, 1, 9, zh('#D06955'));
    R(32, 32, 18, 1, zh('#5C4A3D')); R(33, 31, 16, 1, zh('#6E594A')); R(35, 30, 12, 1, zh('#7E6754'));
    R(30, 32, 2, 1, zh('#5C4A3D')); R(48, 32, 2, 1, zh('#5C4A3D')); R(39, 29, 2, 1, zh('#8B6844'));
    R(39, 37, 4, 5, zh('#3E3A38')); R(39, 37, 4, 1, zh('#5C4A3D'));
    R(35, 36, 2, 2, zh('#F3D9A8')); R(45, 36, 2, 2, zh('#F3D9A8')); R(39, 34, 4, 1, zh('#F2C94C'));
    R(37, 42, 8, 1, zh('#C9CFC5')); R(36, 43, 10, 1, zh('#B8BFB4')); R(35, 44, 12, 1, zh('#C9CFC5'));
    R(47, 40, 1, 6, zh('#C05A46')); R(50, 40, 1, 6, zh('#C05A46')); R(46, 39, 6, 1, zh('#C05A46')); R(47, 38, 4, 1, zh('#A8452F'));
    R(31, 34, 1, 8, zh('#7FA86B')); R(33, 37, 1, 5, zh('#8FBB7A')); R(31, 34, 1, 1, zh('#A5CC8F')); R(33, 37, 1, 1, zh('#A5CC8F'));
    R(44, 42, 2, 1, zh('#8B6844'));
    R(45, 40, 1, 1, 'rgba(255,255,255,.55)'); R(44, 38, 1, 1, 'rgba(255,255,255,.4)'); R(46, 36, 1, 1, 'rgba(255,255,255,.3)');

    // —— 数据研究所（实验楼 · 天线信号 · 雷达 · 服务器指示灯 · 柱状图 · 数据流）——
    const da = adjOf(this._map99Prog('data'));
    T = ctxG;  // —— 地面：地坪 + 网格线 ——
    R(52, 26, 44, 22, da('#B9C9DC'));
    R(52, 26, 44, 3, da('#A7B9CF'));
    for (let x = 54; x < 95; x += 6) R(x, 45, 1, 3, da('#CBD8E6'));
    T = ctxS;  // —— 立体物：实验楼 + 天线 + 雷达 + 服务器 + 柱状图 + 数据流 ——
    R(56, 30, 16, 12, da('#F4F7FA')); R(56, 30, 16, 1, da('#FFFFFF'));
    R(58, 33, 3, 3, da('#9CC0E8')); R(63, 33, 3, 3, da('#9CC0E8')); R(68, 33, 3, 3, da('#9CC0E8'));
    R(58, 38, 3, 3, da('#9CC0E8')); R(63, 38, 3, 3, da('#9CC0E8')); R(68, 38, 3, 3, da('#9CC0E8'));
    R(63, 26, 1, 4, da('#64748B')); R(63, 26, 1, 1, da('#5EEAD4')); R(61, 27, 1, 1, da('#5EEAD4')); R(65, 27, 1, 1, da('#5EEAD4'));
    R(77, 40, 3, 1, da('#64748B')); R(78, 37, 1, 3, da('#64748B')); R(76, 34, 5, 3, da('#E2E8F0')); R(77, 33, 3, 1, da('#F8FAFC'));
    R(84, 32, 6, 10, da('#64748B')); R(84, 32, 6, 1, da('#94A3B8'));
    R(85, 34, 1, 1, da('#5EEAD4')); R(87, 34, 1, 1, da('#5EEAD4')); R(89, 34, 1, 1, da('#5EEAD4'));
    R(85, 36, 1, 1, da('#F2C94C')); R(85, 38, 1, 1, da('#5EEAD4')); R(87, 38, 1, 1, da('#5EEAD4'));
    R(57, 45, 10, 1, da('#8899AA')); R(58, 43, 2, 2, da('#34D399')); R(61, 42, 2, 3, da('#10B981')); R(64, 44, 2, 1, da('#6EE7B7'));
    R(73, 36, 1, 1, da('#5EEAD4')); R(74, 33, 1, 1, da('#5EEAD4')); R(75, 30, 1, 1, da('#5EEAD4'));

    // —— 开发工厂（锯齿顶厂房 · 烟囱 · 齿轮 · 扳手 · 终端）——
    const dv = adjOf(this._map99Prog('dev'));
    T = ctxG;  // —— 地面：厂区地坪 ——
    R(0, 48, 96, 16, dv('#9AA6B2'));
    R(0, 48, 96, 2, dv('#8895A3'));
    T = ctxS;  // —— 立体物：锯齿厂房 + 烟囱 + 齿轮 + 扳手 + 终端 ——
    R(4, 53, 26, 10, dv('#B48A5E')); R(4, 53, 1, 10, dv('#C69B72'));
    R(4, 52, 6, 1, dv('#8B6844')); R(10, 51, 6, 1, dv('#8B6844')); R(16, 52, 6, 1, dv('#8B6844')); R(22, 51, 6, 1, dv('#8B6844'));
    R(7, 56, 3, 3, dv('#F6D98A')); R(13, 56, 3, 3, dv('#7FA8D9')); R(19, 56, 3, 3, dv('#F6D98A'));
    R(24, 57, 4, 6, dv('#64748B'));
    R(9, 48, 3, 5, dv('#7E6754')); R(9, 48, 3, 1, dv('#6E594A'));
    R(13, 48, 1, 1, 'rgba(255,255,255,.5)'); R(16, 48, 1, 1, 'rgba(255,255,255,.35)');
    R(52, 54, 6, 6, dv('#C4CBD3')); R(54, 56, 2, 2, dv('#8895A3'));
    R(53, 52, 4, 1, dv('#C4CBD3')); R(53, 61, 4, 1, dv('#C4CBD3')); R(50, 55, 1, 4, dv('#C4CBD3')); R(59, 55, 1, 4, dv('#C4CBD3'));
    R(38, 57, 8, 2, dv('#C9B88E')); R(35, 55, 3, 4, dv('#C9B88E')); R(36, 56, 1, 2, dv('#9AA6B2'));
    R(70, 52, 14, 9, dv('#475569')); R(72, 54, 10, 5, dv('#0E2A1E')); R(75, 61, 4, 1, dv('#64748B'));
    R(73, 55, 1, 1, dv('#4ADE80')); R(74, 56, 1, 1, dv('#4ADE80')); R(75, 55, 1, 1, dv('#4ADE80')); R(78, 56, 2, 1, dv('#4ADE80'));

    // —— v12.9.13b 昼夜时间色罩：地面层 multiply 整层 · 立体物层 source-atop 只染不透明像素（不产生悬浮色块）——
    const dn = this._map99DayNight();
    if (dn.alpha > 0.004) {
      const tintCss = 'rgba(' + dn.tint.join(',') + ',' + dn.alpha.toFixed(3) + ')';
      ctxG.globalCompositeOperation = 'multiply';
      ctxG.fillStyle = tintCss;
      ctxG.fillRect(0, 0, 96, 64);
      ctxG.globalCompositeOperation = 'source-over';
      if (ctxS !== ctxG) {
        ctxS.globalCompositeOperation = 'source-atop';
        ctxS.fillStyle = tintCss;
        ctxS.fillRect(0, 0, 96, 64);
        ctxS.globalCompositeOperation = 'source-over';
      }
    }
    // —— v12.9.13b 夜间灯火（lighter · 绘于立体物层·窗户即灯）：四大区域灯火亮度 = 夜色 × (0.22 + 0.78 × 当日完成度)；
    //    研究所常亮 60% · 开发工厂随开发者模式点亮 ——
    if (dn.night > 0.06) {
      ctxS.globalCompositeOperation = 'lighter';
      const L = (x, y, inten) => {
        const a = dn.night * inten;
        if (a <= 0.02) return;
        ctxS.fillStyle = 'rgba(255,224,150,' + a.toFixed(3) + ')';
        ctxS.fillRect(x, y, 1, 1);
        ctxS.fillStyle = 'rgba(255,170,80,' + (a * 0.30).toFixed(3) + ')';
        ctxS.fillRect(x - 1, y, 3, 1); ctxS.fillRect(x, y - 1, 1, 3); // 像素光晕
      };
      const LIGHTS = {
        life: [[4,10],[5,10],[7,11],[7,12],[19,7],[19,8],[23,5],[24,5],[28,14],[29,14],[9,19],[25,19]],
        growth: [[46,12],[38,16],[38,17],[57,11],[58,11],[90,11]],
        cost: [[3,30],[5,30],[3,33],[3,36],[5,36],[10,29],[12,29],[14,29],[10,32],[14,32],[10,35],[12,35],[14,35],[19,34],[20,34],[24,34],[7,42],[15,42],[23,42]],
        zheng: [[35,36],[36,36],[45,36],[46,36],[39,34],[40,34],[41,34],[42,34],[46,42],[40,39],[41,39]],
        data: [[59,34],[64,34],[69,34],[59,39],[64,39],[69,39],[63,26],[78,34],[85,34],[87,34],[89,34]],
        dev: [[8,57],[14,57],[20,57],[73,56],[76,56],[79,56],[25,59]],
      };
      ['life', 'growth', 'cost', 'zheng'].forEach(k => {
        const inten = 0.22 + 0.78 * this._map99Prog(k);   // 完成度越高，亮灯越明显（参考足迹夜景）
        LIGHTS[k].forEach(p => L(p[0], p[1], inten));
      });
      const dataInten = 0.60;
      LIGHTS.data.forEach(p => L(p[0], p[1], dataInten));
      const devInten = this._dev99 ? 0.85 : 0.12;
      LIGHTS.dev.forEach(p => L(p[0], p[1], devInten));
      ctxS.globalCompositeOperation = 'source-over';
    }
    // —— 区域虚线边界（选中区域金色高亮 · 夜间提亮保证可见）——
    this._map99Regions().forEach(g => {
      const [x, y, w, h] = g.rect;
      const col = this._map99Sel === g.k ? '#FDE68A' : (dn.night > 0.3 ? 'rgba(214,229,255,.78)' : 'rgba(46,58,52,.6)');
      dashed(x, y, w, h, col);
    });
  },
  // v12.9.13 昼夜计算（北京时）：返回 { tint:[r,g,b], alpha, night }
  //   白天 08-18 无深罩（朝阳/正午/夕阳为暖色轻罩）· 夜间罩深夜蓝 · night 0(昼)→1(深夜) 为灯火系数
  _map99DayNight() {
    let h = 12;
    try {
      const t = new Date((Store.nowBeijing) ? Store.nowBeijing() : new Date());
      h = t.getHours() + t.getMinutes() / 60;
    } catch (e) {}
    // 色罩关键帧：[小时(0-32 环绕), [RGB], multiply 强度]
    const KF = [
      [8.0,  [255,226,184], 0.14],  // 朝阳
      [10.5, [255,255,255], 0.00],  // 正午（无罩）
      [15.5, [255,252,244], 0.02],  // 正午后
      [17.0, [255,196,128], 0.26],  // 夕阳
      [18.6, [132,112,150], 0.40],  // 黄昏渐入夜
      [20.5, [46,60,100],   0.50],  // 黑夜
      [23.5, [30,42,80],    0.57],  // 深夜
      [27.5, [30,42,80],    0.57],  // 深夜（凌晨 3:30）
      [29.3, [96,76,128],   0.50],  // 黎明前
      [30.6, [214,152,162], 0.30],  // 黎明
      [32.0, [255,226,184], 0.14],  // 环绕回 8:00 朝阳
    ];
    const hh = h < 8 ? h + 24 : h;
    let a = KF[0], b = KF[KF.length - 1];
    for (let i = 0; i < KF.length - 1; i++) {
      if (hh >= KF[i][0] && hh <= KF[i + 1][0]) { a = KF[i]; b = KF[i + 1]; break; }
    }
    const span = (b[0] - a[0]) || 1;
    const t = Math.max(0, Math.min(1, (hh - a[0]) / span));
    const tint = [0, 1, 2].map(i => Math.round(a[1][i] + (b[1][i] - a[1][i]) * t));
    const alpha = a[2] + (b[2] - a[2]) * t;
    // 夜色系数 night：18-20 渐入 0→0.85 · 20-23.5 → 1 · 23.5-3.5 深夜 1 · 3.5-6 黎明 1→0.5 · 6-8 → 0
    let night = 0;
    if (h >= 18 && h < 20) night = ((h - 18) / 2) * 0.85;
    else if (h >= 20 && h < 23.5) night = 0.85 + ((h - 20) / 3.5) * 0.15;
    else if (h >= 23.5 || h < 3.5) night = 1;
    else if (h >= 3.5 && h < 6) night = 1 - ((h - 3.5) / 2.5) * 0.5;
    else if (h >= 6 && h < 8) night = 0.5 * (1 - (h - 6) / 2);
    return { tint, alpha, night };
  },
  // v12.9.13 天气（复用 weather_cache · Open-Meteo WMO 编码）→ 动画类型
  _map99Weather() {
    try {
      const wc = JSON.parse(localStorage.getItem('weather_cache') || 'null');
      if (!wc || !wc.data || (Date.now() - (wc.ts || 0)) > 35 * 60 * 1000) return null;
      const d = wc.data, code = d.code;
      let type = null;
      if (code === 0 || code === 1) type = 'sun';
      else if (code === 2) type = 'suncloud';
      else if (code === 3 || code === 45 || code === 48) type = 'cloud';
      else if ([51,53,55,56,57,61,80].indexOf(code) >= 0) type = 'rain1';
      else if (code === 63 || code === 81) type = 'rain2';
      else if ([65,66,67,82].indexOf(code) >= 0) type = 'rain3';
      else if ([71,73,75,77,85,86].indexOf(code) >= 0) type = 'snow';
      else if ([95,96,99].indexOf(code) >= 0) type = 'thunder';
      if (!type) return null;
      if ((d.wind || 0) >= 10.8 && ['rain1','rain2','rain3','thunder','snow'].indexOf(type) < 0) type = 'wind';
      return { type, wind: d.wind || 0 };
    } catch (e) { return null; }
  },
  // v12.9.13 天气像素动画（96×64 · 90ms/帧 ≈ 11fps 保持像素颗粒感 · canvas 移出文档自动停）
  _map99FxStart(fx) {
    const ctx = fx.getContext && fx.getContext('2d');
    if (!ctx) return;
    const W = 96, H = 64;
    let w = this._map99Weather();
    let drops = [], flakes = [], clouds = [], streaks = [], sparkles = [];
    let t = 0, flashLeft = 0, bolt = null, boltLife = 0, nextFlash = 0;
    const rnd = (n) => Math.floor(Math.random() * n);
    const init = () => {
      drops = []; flakes = []; clouds = []; streaks = []; sparkles = [];
      if (!w) return;
      const type = w.type;
      const nd = type === 'rain1' ? 13 : type === 'rain2' ? 30 : type === 'rain3' || type === 'thunder' ? 48 : 0;
      for (let i = 0; i < nd; i++) drops.push({ x: rnd(W), y: rnd(H), v: (type === 'rain3' || type === 'thunder' ? 2.6 : type === 'rain2' ? 2.1 : 1.4) + Math.random() * 0.6, l: type === 'rain1' ? 2 : 3 });
      if (type === 'snow') for (let i = 0; i < 22; i++) flakes.push({ x: rnd(W), y: rnd(H), v: 0.4 + Math.random() * 0.4, ph: Math.random() * 6.28 });
      if (type === 'cloud' || type === 'suncloud') for (let i = 0; i < (type === 'cloud' ? 4 : 2); i++) clouds.push({ x: rnd(W) - 20, y: 2 + rnd(18), w: 7 + rnd(8), v: 0.14 + Math.random() * 0.12, dark: type === 'cloud' });
      if (type === 'wind') for (let i = 0; i < 11; i++) streaks.push({ x: rnd(W), y: rnd(H), v: 1.6 + Math.random() * 1.4, l: 3 + rnd(3), leaf: Math.random() < 0.4 });
      if (type === 'sun' || type === 'suncloud') for (let i = 0; i < 4; i++) sparkles.push({ x: rnd(W), y: rnd(H), ph: Math.random() * 6.28 });
      nextFlash = 30 + rnd(50);
    };
    init();
    const timer = setInterval(() => {
      if (!fx.isConnected) { clearInterval(timer); return; }
      t++;
      // 天气缓存每 ~9s 复查一次（类型变化则重建粒子）
      if (t % 100 === 0) {
        const nw = this._map99Weather();
        if ((nw && nw.type) !== (w && w.type)) { w = nw; init(); }
      }
      ctx.clearRect(0, 0, W, H);
      if (!w) return;
      const type = w.type;
      if (type === 'sun' || type === 'suncloud') {
        sparkles.forEach(s => {
          const a = Math.max(0, Math.sin(t / 16 + s.ph)) * 0.35;
          if (a > 0.05) { ctx.fillStyle = 'rgba(255,255,220,' + a.toFixed(3) + ')'; ctx.fillRect(s.x, s.y, 1, 1); }
        });
      }
      clouds.forEach(cl => {
        cl.x += cl.v; if (cl.x > W + 4) cl.x = -cl.w - 4;
        ctx.fillStyle = cl.dark ? 'rgba(150,158,170,.34)' : 'rgba(255,255,255,.5)';
        ctx.fillRect(Math.round(cl.x), cl.y, cl.w, 3);
        ctx.fillRect(Math.round(cl.x) + 2, cl.y - 1, cl.w - 4, 1);
        ctx.fillRect(Math.round(cl.x) + 2, cl.y + 3, cl.w - 5, 1);
      });
      if (type === 'cloud') { ctx.fillStyle = 'rgba(110,120,138,.10)'; ctx.fillRect(0, 0, W, H); }
      if (type === 'rain1' || type === 'rain2' || type === 'rain3' || type === 'thunder') {
        const slant = (type === 'rain3' || type === 'thunder') ? 0.45 : 0.2;
        ctx.fillStyle = type === 'rain1' ? 'rgba(178,214,255,.66)' : 'rgba(168,206,250,.8)';
        drops.forEach(d => {
          d.y += d.v; d.x += d.v * slant * 0.3;
          if (d.y > H) { d.y = -d.l; d.x = Math.random() * (W + 10) - 5; if (type !== 'rain1') { ctx.fillStyle = 'rgba(200,226,255,.5)'; ctx.fillRect(Math.round(d.x), H - 1, 1, 1); ctx.fillStyle = type === 'rain1' ? 'rgba(178,214,255,.66)' : 'rgba(168,206,250,.8)'; } }
          if (d.x > W) d.x -= W;
          ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, d.l);
        });
        if (type === 'rain3' || type === 'thunder') { ctx.fillStyle = 'rgba(38,54,84,.16)'; ctx.fillRect(0, 0, W, H); }
      }
      if (type === 'thunder' && --nextFlash <= 0) {
        flashLeft = 2; boltLife = 3; nextFlash = 35 + rnd(55);
        bolt = { x: 8 + rnd(W - 16), y2: 14 + rnd(26) };
      }
      if (type === 'thunder' && flashLeft > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (flashLeft === 2 ? 0.30 : 0.14) + ')';
        ctx.fillRect(0, 0, W, H);
        flashLeft--;
      }
      if (type === 'thunder' && boltLife > 0 && bolt) {
        ctx.fillStyle = boltLife === 3 ? '#FFFFFF' : '#BFE3FF';
        let bx = bolt.x;
        for (let yy = 0; yy < bolt.y2; yy++) {
          if (yy % 4 === 0 && Math.random() < 0.6) bx += Math.random() < 0.5 ? -1 : 1;
          ctx.fillRect(bx, yy, boltLife === 3 ? 2 : 1, 1);
        }
        boltLife--;
      }
      if (type === 'snow') {
        ctx.fillStyle = 'rgba(240,246,255,.85)';
        flakes.forEach(f => {
          f.y += f.v; f.x += Math.sin(t / 9 + f.ph) * 0.22;
          if (f.y > H) { f.y = -1; f.x = rnd(W); }
          if (f.x > W) f.x -= W; if (f.x < 0) f.x += W;
          ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
        });
      }
      if (type === 'wind') {
        streaks.forEach(s => {
          s.x += s.v;
          const yy = s.y + Math.sin(t / 7 + s.x / 12) * 1.2;
          if (s.x > W + 4) { s.x = -s.l - 4; s.y = rnd(H); }
          if (s.leaf) { ctx.fillStyle = 'rgba(150,168,120,.75)'; ctx.fillRect(Math.round(s.x), Math.round(yy), 1, 1); }
          else { ctx.fillStyle = 'rgba(222,230,238,.55)'; ctx.fillRect(Math.round(s.x), Math.round(yy), s.l, 1); }
        });
      }
    }, 90);
  },
  // v11.6 习惯页分区折叠状态（localStorage 记忆：'1'=折叠；默认展开）
  _habit99Fold(key) {
    try { return localStorage.getItem('habit99_fold_' + key) === '1'; } catch (_) { return false; }
  },
  // v12.9.10 折叠动画：点击只做本地高度过渡 + 箭头旋转 + 摘要更新（localStorage 记忆，不再整页重渲染）
  _habit99ToggleFold(key, ev) {
    const folded = this._habit99Fold(key);
    try {
      localStorage.setItem('habit99_fold_' + key, folded ? '0' : '1');
    } catch (_) {}
    const bar = (ev && ev.target && ev.target.closest) ? ev.target.closest('.hb99-foldbar') : document.querySelector(`.hb99-foldbar[data-fold="${key}"]`);
    const body = document.querySelector(`.hb99-fold-body[data-body="${key}"]`);
    if (!body || !bar) { this.render_workbench(); return; }  // 结构异常兜底：走老整页渲染
    const arrow = bar.querySelector('.hb99-fold-arrow');
    const sum = bar.querySelector('.hb99-fold-sum');
    const T = 'height .36s cubic-bezier(.4,0,.2,1), opacity .3s ease';
    body.style.transition = T;
    body.style.overflow = 'hidden';
    body.style.willChange = 'height, opacity';   // 帧率：动画期间提示合成器
    if (folded) {
      // 展开：先解除折叠态测出真实高度（height:0 时 grid 行高会塌缩导致测量失真）→
      //   再锁回 0 起点 → 过渡到真实高度（同步代码块内无渲染中断，不会闪现）
      body.classList.remove('folded');
      body.style.height = 'auto';
      const target = body.offsetHeight;
      body.style.height = '0px';
      body.style.opacity = '0';
      void body.offsetHeight;
      body.style.height = target + 'px';
      body.style.opacity = '1';
      if (arrow) arrow.classList.add('open');
      if (sum) sum.textContent = '点击折叠';
      const done = (e2) => {
        if (e2.propertyName !== 'height') return;
        body.style.height = ''; body.style.overflow = ''; body.style.willChange = '';
        body.removeEventListener('transitionend', done);
      };
      body.addEventListener('transitionend', done);
      setTimeout(() => { if (body.style.height && body.style.height !== '0px') { body.style.height = ''; body.style.overflow = ''; } }, 460);
    } else {
      // 收起：固定当前高度 → 过渡到 0 → 终态交给 .folded 类（高度/透明度/外距全归零）
      body.style.height = body.scrollHeight + 'px';
      body.style.opacity = '1';
      void body.offsetHeight;
      body.style.height = '0px';
      body.style.opacity = '0';
      if (arrow) arrow.classList.remove('open');
      if (sum) sum.textContent = `今日 ${bar.getAttribute('data-done') || 0}/${bar.getAttribute('data-total') || 0} ${bar.getAttribute('data-label') || '完成'}`;
      setTimeout(() => {
        body.classList.add('folded');
        body.style.height = ''; body.style.opacity = ''; body.style.overflow = ''; body.style.willChange = '';
      }, 400);
    }
  },
  // v2026.0906 消费记录卡累计统计：全量打卡日扫描（多次卡按次、单次卡按日计），返回 { cnt, total }
  _hb99CostTotals(cardId) {
    const h = Store.getHabit99();
    let cnt = 0, total = 0;
    Object.keys(h.days || {}).forEach(dk => {
      const v = (h.days[dk] || {})[cardId];
      if (!v) return;
      if (Array.isArray(v)) v.forEach(x => { if (+x.amount > 0) { cnt++; total += +x.amount; } });
      else if (+v.amount > 0) { cnt++; total += +v.amount; }
    });
    return { cnt, total: Math.round(total * 100) / 100 };
  },
  // —— 长按打卡（1 秒，带环形进度动画 · v6.9 由 3 秒优化）——
  _habit99HoldStart(cardId) {
    if (this._hb99Timer) { clearTimeout(this._hb99Timer); this._hb99Timer = null; }
    const c = (CONFIG.habitCards || []).find(x => x.id === cardId);
    if (!c) return;
    const st = this._habit99CardState(c);
    // v10.0 开发者模式：无视冷却/前置锁（健身餐/医疗消等），任意卡片随时可测
    if (!this._dev99) {
      if (c.id === 'fitness') {
        // v2026.0905 健身周卡：今日已记录则今日不可重复记录；本周达标后仍可继续记录当天训练
        if (st.todayDone) return;
      } else if (!c.multi && !c.study && st.done) return;      // 单次卡已完成
      if (c.study && st.done) return;                          // 学习卡 2/2
      if (c.id === 'mood' && st.cooling) {                     // v2026.0906 心情卡冷却中
        this._flash(`⏳ 心情冷却中：距下次可记录还需 ${st.coolMin} 分钟`);
        return;
      }
      if (c.id === 'fitnessMeal' && st.locked) {                // v2026.0906 健身餐前置：当日健身卡未完成
        this._flash('🔒 健身餐需先完成当日【健身】卡打卡，才能开放');
        return;
      }
      if (c.id === 'medCost' && st.locked) {                     // v2026.0906 医疗消前置：当日健康卡未打/勾了感觉良好
        this._flash('🔒 医疗消需先打卡当日【健康】卡且未勾选「感觉良好」（小病缠身/大病复查），才能开放');
        return;
      }
      if (!this._habit99InWindow(c)) return;                    // 窗口外（补卡走补卡中心）
    }
    const el = document.getElementById('hb99-' + cardId);
    const holdMs = (CONFIG.habit99 && CONFIG.habit99.holdMs) || 1000;
    if (el) {
      el.classList.add('hb99-holding');
      const ring = el.querySelector('.hb99-hold-ring');
      if (ring) ring.style.animationDuration = holdMs + 'ms'; // 环形进度与长按时长严格同步（v6.9 提速至 1 秒）
    }
    // v12.9.46 长按打卡音效：按住即播液体声（手势上下文内 · AudioContext 不被 suspend）
    try { this._sfx99 && this._sfx99('liquid'); } catch (_) {}
    this._hb99Timer = setTimeout(() => {
      this._hb99Timer = null;
      if (el) el.classList.remove('hb99-holding');
      this.habit99OpenForm(cardId);
    }, holdMs);
  },
  _habit99HoldEnd(cardId) {
    if (this._hb99Timer) { clearTimeout(this._hb99Timer); this._hb99Timer = null; }
    const el = document.getElementById('hb99-' + cardId);
    if (el) el.classList.remove('hb99-holding');
  },
  // —— 打卡表单（按卡片类型生成）——
  habit99OpenForm(cardId, dateKey) {
    const c = (CONFIG.habitCards || []).find(x => x.id === cardId);
    if (!c) return;
    // v10.0 专注卡：不走普通表单，直接进入冥想/番茄钟选择界面
    if (c.focus) { this.focus99Choose(); return; }
    const dk = dateKey || this._habit99Now();
    const starRow = (id) => `<div class="hb99-stars" id="${id}">${[1,2,3,4,5].map(n => `<button type="button" class="hb99-star" data-n="${n}" onclick="this.parentNode.querySelectorAll('.hb99-star').forEach(b=>b.classList.toggle('on',+b.dataset.n<=+n));this.parentNode.dataset.val=n">⭐</button>`).join('')}</div>`;
    let body = '';
    if (cardId === 'goodMorning') {
      body = `<label class="hb99-lbl">起床时间 <input type="time" id="hb99f-wake" class="input" value="${new Date().toTimeString().slice(0,5)}"></label>
              <label class="hb99-lbl">昨晚睡眠质量 <div class="hb99-stars" id="hb99f-q">${[1,2,3,4,5].map(n=>`<button type="button" class="hb99-star" onclick="this.parentNode.querySelectorAll('.hb99-star').forEach(b=>b.classList.toggle('on',+b.dataset.n<=${n}));this.parentNode.dataset.val=${n}" data-n="${n}">⭐</button>`).join('')}</div></label>`;
    } else if (cardId === 'goodNight') {
      body = `<label class="hb99-lbl">入睡时间 <input type="time" id="hb99f-sleep" class="input" value="${new Date().toTimeString().slice(0,5)}"></label>
              <label class="hb99-lbl">今日总状态 <div class="hb99-stars" id="hb99f-q">${[1,2,3,4,5].map(n=>`<button type="button" class="hb99-star" onclick="this.parentNode.querySelectorAll('.hb99-star').forEach(b=>b.classList.toggle('on',+b.dataset.n<=${n}));this.parentNode.dataset.val=${n}" data-n="${n}">⭐</button>`).join('')}</div></label>`;
    } else if (['breakfast','lunch','dinner'].includes(cardId)) {
      // v2026.0906 三餐卡：就餐类型（居家/外卖/堂食/被请客四选一）+ 外卖/堂食花费（同步记账）+ 被请客填东家名字
      body = `<label class="hb99-lbl">${c.name}时间 <input type="time" id="hb99f-time" class="input" value="${new Date().toTimeString().slice(0,5)}"></label>
              <label class="hb99-lbl">吃了什么（可多选）
                <div class="hb99-opt" id="hb99f-foods">${(c.foods||[]).map(f=>`<button type="button" class="hb99-chip" onclick="this.classList.toggle('on')">${f}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">就餐类型（四选一）
                <div class="hb99-opt" id="hb99f-mt">${(c.mealTypes||['居家','外卖','堂食','被请客']).map(t=>`<button type="button" class="hb99-chip" onclick="App._hb99MealType(this)">${t}</button>`).join('')}</div>
              </label>
              <div id="hb99f-mtcost" style="display:none">
                <label class="hb99-lbl">这顿花了多少钱（元，必填）
                  <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 15" style="width:120px">
                </label>
                <div style="font-size:12px;color:var(--text-soft)">花费将自动同步到【数据中心 → 经济数据】的支出流水。</div>
              </div>
              <div id="hb99f-mthost" style="display:none">
                <label class="hb99-lbl">东家的名字（必填 · 谁请的这顿）
                  <input type="text" id="hb99f-host" class="input" placeholder="如 王哥 / 李姐" style="width:100%">
                </label>
                <div style="font-size:12px;color:var(--text-soft)">这顿是别人买单——无需填写花费，人情记在【人情消】卡里（若你回请了对方，请在【人情消】记录）。</div>
              </div>
              <label class="hb99-lbl">${c.name}质量 <div class="hb99-stars" id="hb99f-q">${[1,2,3,4,5].map(n=>`<button type="button" class="hb99-star" onclick="this.parentNode.querySelectorAll('.hb99-star').forEach(b=>b.classList.toggle('on',+b.dataset.n<=${n}));this.parentNode.dataset.val=${n}" data-n="${n}">⭐</button>`).join('')}</div></label>`;
    } else if (cardId === 'noonNap') {
      const d = Store.habit99Get(dk, 'noonNap') || {};
      body = `<label class="hb99-lbl">入睡时间 <input type="time" id="hb99f-start" class="input" value="${d.start || new Date().toTimeString().slice(0,5)}"></label>
              <label class="hb99-lbl">起床时间 <input type="time" id="hb99f-end" class="input" value="${d.end || ''}" placeholder="醒后第二次打卡填写"></label>
              <label class="hb99-lbl">午觉质量 <div class="hb99-stars" id="hb99f-q">${[1,2,3,4,5].map(n=>`<button type="button" class="hb99-star" onclick="this.parentNode.querySelectorAll('.hb99-star').forEach(b=>b.classList.toggle('on',+b.dataset.n<=${n}));this.parentNode.dataset.val=${n}" data-n="${n}">⭐</button>`).join('')}</div></label>
              <div style="font-size:12px;color:var(--text-soft)">两段式打卡：先记录入睡，10-60 分钟后再次长按打卡填写起床时间，才算完成今日打卡。</div>`;
    } else if (cardId === 'poop') {
      body = `<label class="hb99-lbl">便便形态
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl"><input type="checkbox" id="hb99f-pain"> 排便时有肛门不适</label>`;
    } else if (cardId === 'pee') {
      body = `<label class="hb99-lbl">尿液颜色
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>`;
    } else if (cardId === 'water') {
      body = `<label class="hb99-lbl">本次饮水量
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}ml</button>`).join('')}</div>
              </label>
              <div style="font-size:12px;color:var(--text-soft)">今日可多次打卡，后台累计当日饮水总量。<b>当日累计 ≥ ${this._hb99WaterGoal()}ml 才算打卡成功。</b>当前${dateKey ? '（补卡日）' : ''}已累计 <b style="color:#0ea5e9">${this._hb99WaterTotal(dk)}ml</b> / 目标 ${this._hb99WaterGoal()}ml。</div>`;
    } else if (['faceWashM','mouthWashM','faceWashE','mouthWashE','hairWash','footWash','bath'].includes(cardId)) {
      // v3.99 第 7-13 张小卡：洁面/漱口/洗头/洗脚/洗澡（单选方式）
      body = `<label class="hb99-lbl">${c.name}方式（二选一）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              ${cardId === 'bath' ? `<div style="font-size:12px;color:var(--text-soft)">💡 提示：住酒店洗澡也算<b>居家洗</b>哦～</div>` : ''}`;
    } else if (cardId === 'fitness') {
      // v3.99 第 14 张小卡：健身（多选部位 + 训练分钟）
      body = `<label class="hb99-lbl">今日训练部位（可多选）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.classList.toggle('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">训练时间（分钟）<input type="number" id="hb99f-min" class="input" min="1" max="600" placeholder="如 45" style="width:110px"></label>
              <div style="font-size:12px;color:var(--text-soft)">本自然周已打卡 <b style="color:#16a34a">${this._hb99FitnessWeekCount()}</b>/${this._hb99FitNeed()} 次（周达标制：≥${this._hb99FitNeed()} 次/周即成功，无需每日打卡）。训练时长会计入当日运动数据（日律汇总）。</div>`;
    } else if (cardId === 'zhengqi') {
      // v2026.0905 第 22 张小卡：正气（三选一 + 破气明细 + 警示横幅）
      body = `<div style="margin-bottom:10px;padding:10px;border-radius:10px;background:#fef2f2;border:1.5px solid #fecaca;color:#b91c1c;font-weight:800;text-align:center;font-size:13.5px">⚠️ 绝对禁止进行性交性插入行为！</div>
              <label class="hb99-lbl">今日状态（三选一）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99ZhengRadio(this,'${cardId}')">${o}</button>`).join('')}</div>
              </label>
              <div id="hb99f-zq-broken" style="display:none">
                <label class="hb99-lbl">破气时间 <input type="time" id="hb99f-time" class="input" value="${new Date().toTimeString().slice(0,5)}"></label>
                <label class="hb99-lbl">破气方式（单选）
                  <div class="hb99-opt" id="hb99f-way">${['Blued等成人社交','想翻墙用X等平台','其他色情内容念头'].map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
                </label>
                <div id="hb99f-zq-big" style="display:none">
                  <label class="hb99-lbl">大破气次数 <input type="number" id="hb99f-count" class="input" min="1" max="20" placeholder="如 1" style="width:110px"></label>
                </div>
                <label class="hb99-lbl">破气理由（必填，如实记录）
                  <textarea id="hb99f-reason" class="input" rows="3" placeholder="写下当时的情境 / 触发点 / 想法..." style="width:100%"></textarea>
                </label>
              </div>
              <div style="font-size:12px;color:var(--text-soft)">小破气＝成人社交软件 / 想翻墙接触色情内容的念头；大破气＝自慰等自慰行为。勾选「未破气」将累计连续正气天数。</div>`;
    } else if (cardId === 'zhengxin') {
      // v2026.0905 第 23 张小卡：正心（三选一 + 使用时间）
      body = `<label class="hb99-lbl">今日状态（三选一）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99ZhengRadio(this,'${cardId}')">${o}</button>`).join('')}</div>
              </label>
              <div id="hb99f-zx-used" style="display:none">
                <label class="hb99-lbl">使用/浏览时间（分钟，如实填写）<input type="number" id="hb99f-min" class="input" min="1" max="1440" placeholder="如 30" style="width:110px"></label>
              </div>
              <div style="font-size:12px;color:var(--text-soft)">小破心＝当日浏览了游戏相关内容（如王者荣耀视频/直播）；大破心＝直接使用了游戏本身。勾选「未破心」将累计连续正心天数。</div>`;
    } else if (cardId === 'zhenghun') {
      // v2026.0905 第 24 张小卡：正魂（三选一 + 大破魂行为/时间）
      body = `<label class="hb99-lbl">今日状态（三选一）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99ZhengRadio(this,'${cardId}')">${o}</button>`).join('')}</div>
              </label>
              <div id="hb99f-zh-big" style="display:none">
                <label class="hb99-lbl">破魂具体行为（单选）
                  <div class="hb99-opt" id="hb99f-act">${['吸烟','喝酒','槟榔','rush'].map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
                </label>
                <label class="hb99-lbl">破魂时间 <input type="time" id="hb99f-time" class="input" value="${new Date().toTimeString().slice(0,5)}"></label>
              </div>
              <div style="font-size:12px;color:var(--text-soft)">破魂范围：吸烟（含二手烟等一切尼古丁/焦油产品）、喝酒（一切含酒精食品）、槟榔（含槟榔碱食品）、rush。小破魂＝非主观接收（如吸了二手烟）；大破魂＝主动行为。勾选「未破魂」将累计连续正魂天数。</div>`;
    } else if (cardId === 'zhengyan') {
      // v2026.0905 第 25 张小卡：正言（谨言慎行 · 尊重个体差异 · 事以密成）
      body = `<div style="margin-bottom:10px;padding:10px;border-radius:10px;background:#ecfdf5;border:1.5px solid #a7f3d0;color:#047857;font-weight:800;text-align:center;font-size:13px">🤐 事以密成，言以泄败——想做的事，在没做成之前，不要告诉别人！</div>
              <details style="margin-bottom:8px">
                <summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:#047857">📖 正言守则（点击展开 · 每日对照自省）</summary>
                <div style="font-size:12px;color:var(--text-soft);line-height:1.9;padding:8px 10px;background:#f8fafc;border-radius:8px;margin-top:6px">
                  <b>一、谨言慎行</b>：不打断他人话语 · 不嘲笑/贬低他人 · 做不到的不许诺、不说大话 · 不习惯性反问 · 不挑刺/怼人 · <b>不炫耀自身拥有的</b> · 不抱怨自身未有的<br>
                  <b>二、尊重个体差异</b>：每个人都是自由且不同的个体——不强制改变他人观念（认知由其教育与经历塑造，人只仰慕强者）；不极致追求一件事的对错（世界不是非黑即白，他人需要面子维护时，得体退让）<br>
                  <b>三、事以密成</b>：沉默是金，祸从口出——<b>学习备考全程保密，仅真正考上入学再公开</b>
                </div>
              </details>
              <label class="hb99-lbl">今日状态（三选一）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99ZhengRadio(this,'${cardId}')">${o}</button>`).join('')}</div>
              </label>
              <div id="hb99f-zy-broken" style="display:none">
                <label class="hb99-lbl">破言时间 <input type="time" id="hb99f-time" class="input" value="${new Date().toTimeString().slice(0,5)}"></label>
                <div id="hb99f-zy-small" style="display:none">
                  <label class="hb99-lbl">小破行为（可多选）
                    <div class="hb99-opt" id="hb99f-acts-s">${['打断他人话语','习惯性反问','挑刺/怼人','抱怨自身未有的'].map(o=>`<button type="button" class="hb99-chip" onclick="this.classList.toggle('on')">${o}</button>`).join('')}</div>
                  </label>
                </div>
                <div id="hb99f-zy-big" style="display:none">
                  <label class="hb99-lbl">大破行为（可多选）
                    <div class="hb99-opt" id="hb99f-acts-b">${['嘲笑/贬低他人','说大话/许空诺','炫耀自身拥有的','强制改变他人观念','极致争对错','泄露备考等未成之事'].map(o=>`<button type="button" class="hb99-chip" onclick="this.classList.toggle('on')">${o}</button>`).join('')}</div>
                  </label>
                </div>
                <label class="hb99-lbl">破言理由（必填，如实记录）
                  <textarea id="hb99f-reason" class="input" rows="3" placeholder="写下当时的情境 / 说了什么 / 事后反思..." style="width:100%"></textarea>
                </label>
              </div>
              <div style="font-size:12px;color:var(--text-soft)">小破言＝打断、习惯性反问、挑刺怼人、抱怨等口舌之失；大破言＝贬低他人、大话空诺、炫耀、强改观念、极致争对错、把没做成的事告诉了别人。勾选「未破言」将累计连续正言天数。</div>`;
    } else if (c.study) {
      const arr = Store.habit99Get(dk, cardId) || [];
      body = `<label class="hb99-lbl">学习方式（最多选二）
                <div class="hb99-opt" id="hb99f-opt" data-max="2">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99StudyChip(this)">${o}</button>`).join('')}</div>
              </label>
              <div style="font-size:12px;color:var(--text-soft)">这是 2 次卡：本次记为第 ${Math.min(arr.length + 1, 2)} 次；首次打卡 45 分钟后开放第 2 次打卡，完成 2 次才算本日打卡成功。</div>`;
    } else if (cardId === 'medicine') {
      // v12.9.50 账号级隐私：授权账号 = 固定选项（含抗病毒停药警示）；其他账号 = 自己填的药物清单（meds99）
      const owner = this._isAuthorizedAccount && this._isAuthorizedAccount();
      const medOpts = this._hb99OptsForMe(c);
      body = `<label class="hb99-lbl">今日已服药物（可多选${owner ? '' : ' · 来自【健康】页你自己的药物清单'}）
                <div class="hb99-opt" id="hb99f-opt">${medOpts.length ? medOpts.map(o=>`<button type="button" class="hb99-chip" onclick="this.classList.toggle('on');App._hb99MedSync()">${this.esc(o)}</button>`).join('') : '<span style="font-size:12px;color:var(--text-soft)">还没有药物——去【健康】页「每日药物服用」添加你每天要吃的药</span>'}</div>
              </label>
              <div id="hb99f-medcnt" style="display:none;margin-top:8px">
                <label class="hb99-lbl">${owner ? '除抗病毒外，各药今日已服次数' : '各药今日已服次数'}
                  <div class="hb99-opt" id="hb99f-cnts">${medOpts.filter(o=>o!=='抗病毒').map(o=>`<span style="display:inline-flex;align-items:center;gap:4px;margin:3px;font-size:12px">${this.esc(o)} ×<input type="number" class="input hb99-cnt" data-drug="${this.esc(o)}" min="0" max="9" value="0" style="width:52px;padding:4px 6px"></span>`).join('')}</div>
                </label>
              </div>
              ${owner ? `<div id="hb99f-avwarn" style="display:none;margin-top:8px;padding:10px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13px;font-weight:700">⚠️ 抗病毒药物不得随便停药！！！请填写未服用原因：
                <div class="hb99-opt" id="hb99f-avreason" style="margin-top:6px">${['忘带','需购买','消极情绪'].map(r=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${r}</button>`).join('')}</div>
              </div>` : ''}`;
    } else if (cardId === 'mood') {
      // v2026.0906 第 26 张小卡：心情（六选一 + 原因 · 当日可多次，间隔 ≥1 小时 · 不可补卡）
      const arr = Store.habit99Get(dk, 'mood') || [];
      const cool = this._hb99MoodCoolingMin(arr);
      body = `<label class="hb99-lbl">此刻心情（六选一）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">原因（必填 · 如实记录）
                <textarea id="hb99f-reason" class="input" rows="3" placeholder="写下当时的情境 / 发生了什么 / 事后感受..." style="width:100%"></textarea>
              </label>
              <div style="font-size:12px;color:var(--text-soft)">今日已记录 <b>${arr.length}</b> 次${cool > 0 ? ` · ⏳ 冷却中：距下次可记录还需 ${cool} 分钟` : ' · 现在可记录'}。当日可多次记录，每次需间隔 1 小时；该卡不可补卡。</div>`;
    } else if (cardId === 'health') {
      // v2026.0906 第 27 张小卡：健康（感觉良好/小病缠身/大病复查 三选一 · 小病症状同步急诊科 · 大病复查同步感染科 · 不可补卡）
      // v12.9.50 账号级隐私：非授权账号无「大病复查」（HIV/HPV/TP 专项），仅 感觉良好/小病缠身
      const owner = this._isAuthorizedAccount && this._isAuthorizedAccount();
      const hd = Store.habit99Get(dk, 'health') || {};
      const prev = (hd.symptoms || []).slice();
      const prevDisease = hd.recheckDisease || '';
      const prevActs = (hd.recheckActs || []).slice();
      const healthOpts = this._hb99OptsForMe(c);
      body = `<label class="hb99-lbl">今日身体状态（${owner ? '三' : '二'}选一）
                <div class="hb99-opt" id="hb99f-opt">${healthOpts.map(o=>`<button type="button" class="hb99-chip${hd.status===o?' on':''}" onclick="App._hb99HealthRadio(this)">${o}</button>`).join('')}</div>
              </label>
              <div id="hb99f-sickbox" style="display:${hd.status==='小病缠身'?'block':'none'}">
                <label class="hb99-lbl">症状（可多选 · 将同步到【就医数据】急诊科）
                  <div class="hb99-opt" id="hb99f-sym">${(c.symptoms||[]).map(o=>`<button type="button" class="hb99-chip${prev.includes(o)?' on':''}" onclick="this.classList.toggle('on')">${o}</button>`).join('')}</div>
                </label>
                <label class="hb99-lbl">疾病开始时间（就医数据模板必填项）
                  <input type="date" id="hb99f-onset" class="input" value="${hd.onsetDate || dk}">
                </label>
              </div>
              ${owner ? `<div id="hb99f-recheckbox" style="display:${hd.status==='大病复查'?'block':'none'}">
                <label class="hb99-lbl">复查病种（三选一 · 将同步到【就医数据】感染科）
                  <div class="hb99-opt" id="hb99f-rd">${(c.recheckDiseases||[]).map(o=>`<button type="button" class="hb99-chip${prevDisease===o?' on':''}" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
                </label>
                <label class="hb99-lbl">复查项目（可多选 · 体检/治疗/买药）
                  <div class="hb99-opt" id="hb99f-ra">${(c.recheckActs||[]).map(o=>`<button type="button" class="hb99-chip${prevActs.includes(o)?' on':''}" onclick="this.classList.toggle('on')">${o}</button>`).join('')}</div>
                </label>
                <label class="hb99-lbl">复查具体情况（如实填写 · 将存入【就医数据】感染科）
                  <textarea id="hb99f-rnote" class="textarea" rows="3" placeholder="如：CD4 + 病毒载量复查，指标稳定 / 医院开药 3 个月用量..." style="width:100%;min-height:64px">${this.esc(hd.recheckNote || '')}</textarea>
                </label>
                ${prevActs.includes('买药') ? `<div style="font-size:12px;color:#b45309">💊 提示：勾选了「买药」——当天可在【医疗消】卡记录购药花费，用途会自动关联到 ${prevDisease || '该病种'} 药物。</div>` : ''}
              </div>` : ''}
              <div style="font-size:12px;color:var(--text-soft)">打卡窗口 18:00-22:00，当日记录一次。选择「小病缠身」勾选症状（可多选），数据自动同步【数据中心 → 就医数据 → 急诊科】${owner ? '；选择「大病复查」依次选病种（HIV/HPV/TP）与复查项目（体检/治疗/买药，可多选）并填写情况，数据自动同步【数据中心 → 就医数据 → 感染科】' : ''}；日结后管家阿福会给出就医建议；该卡不可补卡。</div>`;
    } else if (cardId === 'steps') {
      // v2026.0906 第 28 张小卡：步数（20:00-22:00 · 以手机/智能手表数据为准，如实填写 · 计入健康数据健康分析）
      body = `<label class="hb99-lbl">今日步数（步）
                <input type="number" id="hb99f-count" class="input" min="0" max="100000" step="100" placeholder="如 6500" style="width:140px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">📱 请以<b>手机 / 智能手表</b>上显示的步数做参考，<b>如实填写</b>——步数将计入【健康数据】的健康分析（心肺与代谢评估），写虚高的数字只会骗到您自己的身体哦。</div>`;
    } else if (cardId === 'fitnessMeal') {
      // v2026.0906 第 29 张小卡：健身餐（需先完成当日健身卡 · 蛋白粉/肌酸/增肌粉可多选 · 同步三大模型）
      const fitDone = this._hb99FitnessTodayDone(dk);
      body = fitDone
        ? `<label class="hb99-lbl">今日补剂（可多选）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.classList.toggle('on')">${o}</button>`).join('')}</div>
              </label>
              <div style="font-size:12px;color:var(--text-soft)">🍗 健身餐指训练后摄入的运动营养补剂：蛋白粉（蛋白质支持肌肉修复）/ 肌酸（提升力量表现，需充分饮水）/ 增肌粉（碳水+蛋白，含糖较高）。数据将同步【五脏六腑模型】【消化代谢模型】。</div>`
        : `<div style="padding:12px;border-radius:12px;background:#fffbeb;border:1.5px solid #fde68a;color:#b45309;font-size:13px;line-height:1.9">🔒 <b>该卡片需先完成当日【健身】卡打卡</b>——完成当日健身打卡后，健身餐才会开放（训练后补充剂窗口）。<br>本${dateKey ? '补卡日' : '日'}健身卡：未完成 · 可先去【习惯 → 健身】打卡。</div>`;
    } else if (cardId === 'nutriMeal') {
      // v2026.0906 第 30 张小卡：营养餐（保健品摄入 · 维生素B/C/D/鱼油可多选）
      body = `<div style="margin-bottom:10px;padding:10px;border-radius:10px;background:#ecfdf5;border:1.5px solid #a7f3d0;color:#047857;font-weight:800;text-align:center;font-size:13px">💊 营养餐指的是<b>保健品摄入</b>（维生素 / 鱼油等），不是正餐！</div>
              <label class="hb99-lbl">今日已服保健品（可多选）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.classList.toggle('on')">${o}</button>`).join('')}</div>
              </label>
              <div style="font-size:12px;color:var(--text-soft)">数据将同步【五脏六腑模型】【消化代谢模型】，影响器官健康度与维生素覆盖评估。保健品不能替代均衡饮食，请按说明书的建议剂量服用。</div>`;
    } else if (cardId === 'acneClean') {
      // v2026.0906 第 31 张小卡：痘清洁（门店全脸清洁 · 消费方式三选一 + 金额 · 同步记账+消化代谢模型）
      body = `<div style="margin-bottom:10px;padding:10px;border-radius:10px;background:#fdf4ff;border:1.5px solid #f5d0fe;color:#86198f;font-weight:800;text-align:center;font-size:13px">🫧 痘清洁指的是在<b>门店进行专业的全脸清洁</b>（护理项目），不是自己在家洗脸！</div>
              <label class="hb99-lbl">消费方式（三选一）
                <div class="hb99-opt" id="hb99f-pay">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 88" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">💰 金额将自动同步到【数据中心 → 经济数据】的支出流水（个护美容类），并计入【消化代谢模型】的皮肤管理记录——高糖饮食会加重痘痘，模型会结合您的当日摄糖给出提示。</div>`;
    } else if (cardId === 'toothClean') {
      // v2026.0906 第 32 张小卡：牙清洁（专业洗牙 · 门店/医院二选一 + 金额 · 建议半年一次）
      body = `<div style="margin-bottom:10px;padding:10px;border-radius:10px;background:#f0f9ff;border:1.5px solid #bae6fd;color:#0369a1;font-weight:800;text-align:center;font-size:13px">🦷 牙清洁指的是在<b>门店进行专业的洗牙</b>（超声波洁牙），不是日常刷牙！建议<b>半年内洗一次</b>。</div>
              <label class="hb99-lbl">消费场所（二选一）
                <div class="hb99-opt" id="hb99f-pay">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 120" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">💰 金额将自动同步到【数据中心 → 经济数据】的支出流水（医药类）。</div>`;
    } else if (cardId === 'hairTrim') {
      // v2026.0906 第 33 张小卡：发修剪（理发/烫发/染发多选 + 消费方式三选一 + 金额）
      body = `<label class="hb99-lbl">今日项目（可多选）
                <div class="hb99-opt" id="hb99f-items">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.classList.toggle('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">消费方式（三选一）
                <div class="hb99-opt" id="hb99f-pay">${(c.payOpts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 45" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">💰 金额将自动同步到【数据中心 → 经济数据】的支出流水（个护美容类）。烫发/染发建议间隔 3 个月以上，减少对头发和头皮的损伤。</div>`;
    } else if (cardId === 'bodyScrub') {
      // v2026.0906 第 34 张小卡：搓澡洗（专业搓澡 · 填金额 · 自动完成洗澡卡）
      body = `<label class="hb99-lbl">消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 39" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">💰 金额将自动同步到【数据中心 → 经济数据】的支出流水（个护美容类）。打卡后系统会<b>自动完成当日【洗澡】卡</b>并勾选「消费洗」。</div>`;
    } else if (cardId === 'footSpa') {
      // v2026.0906 第 35 张小卡：足洗户（专业足浴 · 消费方式三选一 + 金额 · 自动完成洗脚卡）
      body = `<label class="hb99-lbl">消费方式（三选一）
                <div class="hb99-opt" id="hb99f-pay">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 68" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">💰 金额将自动同步到【数据中心 → 经济数据】的支出流水（个护美容类）。打卡后系统会<b>自动完成当日【洗脚】卡</b>并勾选「消费洗」。</div>`;
    } else if (cardId === 'earClean') {
      // v2026.0906 第 36 张小卡：耳采洗（门店专业采耳 · 消费方式三选一 + 金额）
      body = `<div style="margin-bottom:10px;padding:10px;border-radius:10px;background:#fffbeb;border:1.5px solid #fde68a;color:#b45309;font-weight:800;text-align:center;font-size:13px">👂 耳采洗指的是在<b>门店进行专业的采耳</b>（清理耳道），不要自己用棉签/挖耳勺深挖！</div>
              <label class="hb99-lbl">消费方式（三选一）
                <div class="hb99-opt" id="hb99f-pay">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 30" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">💰 金额将自动同步到【数据中心 → 经济数据】的支出流水（个护美容类）。采耳不宜过频，频繁采耳可能破坏耳道自洁能力。</div>`;
    } else if (cardId === 'medCost') {
      // v2026.0906 第 37 张小卡：医疗消（需先打卡健康卡且未勾「感觉良好」· 填金额 · 用途关联健康卡）
      const hd = Store.habit99Get(dk, 'health') || {};
      const st = hd.status || '';
      let useHint = '';
      if (st === '大病复查') {
        const acts = (hd.recheckActs || []).join('/');
        useHint = `今日健康卡：<b>大病复查 · ${hd.recheckDisease || '?'}${acts ? ' · ' + acts : ''}</b>——本次消费金额默认用于${acts.includes('买药') ? `购买 ${hd.recheckDisease} 药物` : (acts || '复查相关支出')}。`;
      } else if (st === '小病缠身') {
        useHint = `今日健康卡：<b>小病缠身 · ${(hd.symptoms || []).join('/') || '?'}</b>——本次消费金额默认用于相关就诊/买药支出。`;
      }
      body = `${useHint ? `<div style="margin-bottom:10px;padding:10px;border-radius:10px;background:#eff6ff;border:1.5px solid #bfdbfe;color:#1d4ed8;font-size:12.5px;line-height:1.7">💊 ${useHint}</div>` : ''}
              <label class="hb99-lbl">医疗消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 200" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">💰 金额将自动同步到【数据中心 → 经济数据】的支出流水（医药类），用途关联当日【健康】卡状态；消费记录卡不计坚持天数。</div>`;
    } else if (cardId === 'trafficCost') {
      // v2026.0906 第 38 张小卡：交通消（当日可多次 · 公共交通/网约车二选一 + 金额）
      const arr = Store.habit99Get(dk, 'trafficCost') || [];
      const total = arr.reduce((s, x) => s + (+x.amount || 0), 0);
      body = `<label class="hb99-lbl">出行方式（二选一）
                <div class="hb99-opt" id="hb99f-pay">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">本次消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 12" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">🚕 当日可多次记录（每次一条流水）。今日已记录 <b>${arr.length}</b> 次 · 累计 <b>${total}</b> 元；金额将自动同步到【数据中心 → 经济数据】的支出流水（交通类）。消费记录卡不计坚持天数。</div>`;
    } else if (['lifeCost','livingCost','goodsCost','growthCost'].includes(cardId)) {
      // v2026.0906 第 39/40/42/43 张小卡：生活消/居住消/用品消/培养消（三选一 + 金额 · 当日可多次）
      const arr = Store.habit99Get(dk, cardId) || [];
      const total = arr.reduce((s, x) => s + (+x.amount || 0), 0);
      body = `<label class="hb99-lbl">${c.name}类型（三选一）
                <div class="hb99-opt" id="hb99f-pay">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">本次消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 50" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">💰 当日可多次记录（每次一条流水）。今日已记录 <b>${arr.length}</b> 次 · 累计 <b>${Math.round(total * 100) / 100}</b> 元；金额将自动同步到【数据中心 → 经济数据】的支出流水。消费记录卡不计坚持天数。</div>`;
    } else if (cardId === 'socialCost') {
      // v2026.0906 第 41 张小卡：人情消（送礼/请客 二选一 + 金额 · 请客选餐段并联动三餐卡 · 当日可多次）
      const arr = Store.habit99Get(dk, 'socialCost') || [];
      const total = arr.reduce((s, x) => s + (+x.amount || 0), 0);
      body = `<label class="hb99-lbl">人情类型（二选一）
                <div class="hb99-opt" id="hb99f-pay">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99SocialType(this)">${o}</button>`).join('')}</div>
              </label>
              <div id="hb99f-treatbox" style="display:none">
                <label class="hb99-lbl">请客餐段（四选一）
                  <div class="hb99-opt" id="hb99f-meal">${['早餐','午餐','晚餐','其他'].map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99SocialMeal(this)">${o}</button>`).join('')}</div>
                </label>
                <div id="hb99f-eatwaybox" style="display:none">
                  <label class="hb99-lbl">就餐方式（二选一）
                    <div class="hb99-opt" id="hb99f-eatway">${['外卖','堂食'].map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
                  </label>
                  <div style="font-size:12px;color:var(--text-soft)">🍽️ 提交后对应的【早餐/午餐/晚餐】卡将自动打卡（就餐方式同步勾选，无需重复操作）。</div>
                </div>
              </div>
              <label class="hb99-lbl">本次消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 200" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">🧧 当日可多次记录（每次一条流水）。今日已记录 <b>${arr.length}</b> 次 · 累计 <b>${Math.round(total * 100) / 100}</b> 元；金额将自动同步到【数据中心 → 经济数据】的支出流水（应酬人情类）。消费记录卡不计坚持天数。</div>`;
    } else if (cardId === 'posture') {
      // v2026.0906 第 44 张小卡：正姿（未破姿/小破姿/大破姿 三选一 · 破姿填理由）
      body = `<label class="hb99-lbl">今日姿态（三选一）
                <div class="hb99-opt" id="hb99f-opt">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99PostureRadio(this)">${o}</button>`).join('')}</div>
              </label>
              <div id="hb99f-ps-broken" style="display:none">
                <label class="hb99-lbl">破姿理由（必填 · 如实记录）
                  <textarea id="hb99f-reason" class="input" rows="3" placeholder="如：写代码时无意识跷二郎腿 / 追剧时驼背了 20 分钟..." style="width:100%"></textarea>
                </label>
              </div>
              <div style="font-size:12px;color:var(--text-soft)">🧘 破姿指进行了<b>跷二郎腿/驼背</b>的行为：<b>小破姿</b>＝当日 ≤3 次或 ≤15 分钟；<b>大破姿</b>＝超过两项标准任一。勾选「未破姿」将累计连续天数。</div>`;
    } else if (cardId === 'privacyWash') {
      // v10.0 第 38 张小卡：隐私洗（清洗肛门/清洗私处 可多选 + 不适症状 · 同步健康分析/五脏六腑模型）
      body = `<label class="hb99-lbl">清洗部位（可多选）
                <div class="hb99-opt" id="hb99f-wash">${(c.washOpts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.classList.toggle('on')">${o}</button>`).join('')}</div>
              </label>
              <label class="hb99-lbl">有无不适反应症状（单选）
                <div class="hb99-opt" id="hb99f-opt">${(c.symptoms||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
              </label>
              <div style="font-size:12px;color:var(--text-soft)">🚿 私处卫生是泌尿/肛肠健康的第一道防线。若勾选了<b>瘙痒/疼痛/红肿/分泌物异常</b>等不适症状，数据将同步【健康数据】健康分析与<b>五脏六腑模型</b>（拉低对应系统评分并提示观察/就医），私密数据仅存本地。</div>`;
    } else if (cardId === 'eatCost') {
      // v10.0 第 45 张小卡：吃吃消（饮品/零食/水果 可多选 + 金额 · 奶茶/果汁填容量/糖度/实际饮用量 · 水果填名称/实际食用量 · 联动经济/代谢/五脏模型）
      const arr = this._dev99 ? (this._dev99Get(dk, 'eatCost') || []) : (Store.habit99Get(dk, 'eatCost') || []);
      const total = arr.reduce((s, x) => s + (+x.amount || 0), 0);
      body = `<label class="hb99-lbl">类别（可多选）
                <div class="hb99-opt" id="hb99f-kind">${(c.opts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99EatKind(this)">${o}</button>`).join('')}</div>
              </label>
              <div id="hb99f-drinkbox" style="display:none">
                <label class="hb99-lbl">饮品类型（可多选 · 奶茶/果汁/酸奶/水 均隶属饮品）
                  <div class="hb99-opt" id="hb99f-drink">${(c.drinkOpts||[]).map(o=>`<button type="button" class="hb99-chip" onclick="App._hb99EatDrink(this)">${o}</button>`).join('')}</div>
                </label>
                <div id="hb99f-sugarbox" style="display:none;padding:10px 12px;border-radius:12px;background:#fff7ed;border:1.5px solid #fed7aa">
                  <div style="font-weight:800;color:#c2410c;font-size:12.5px;margin-bottom:6px">🧋 奶茶/果汁必填 · 容量 / 糖度 / 实际饮用</div>
                  <label class="hb99-lbl">容量（单选）
                    <div class="hb99-opt" id="hb99f-cap">${(c.cupSizes||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}ml</button>`).join('')}</div>
                  </label>
                  <label class="hb99-lbl">几分糖（单选）
                    <div class="hb99-opt" id="hb99f-sugar">${(c.sugarLevels||[]).map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`).join('')}</div>
                  </label>
                  <label class="hb99-lbl">实际喝了多少（ml）<input type="number" id="hb99f-drank" class="input" min="0" step="10" placeholder="如 500" style="width:120px"></label>
                  <div style="font-size:11.5px;color:#c2410c">糖度×容量×实际饮用量将同步【消化代谢模型】与【五脏六腑模型】（肝/胰代谢负担）。</div>
                </div>
              </div>
              <div id="hb99f-fruitbox" style="display:none">
                <label class="hb99-lbl">买了什么水果（必填）<input type="text" id="hb99f-fruitname" class="input" placeholder="如 苹果 / 香蕉 / 西瓜" maxlength="12"></label>
                <label class="hb99-lbl">实际吃了多少（必填）<input type="text" id="hb99f-fruiteat" class="input" placeholder="如 2 个 / 300g / 半个" maxlength="16"></label>
                <div style="font-size:11.5px;color:var(--text-soft)">水果的<b>果糖与热量</b>将按食用量同步【消化代谢模型】（少量=纤维+维生素加分，大量=果糖加重肝胰负担）。</div>
              </div>
              <label class="hb99-lbl">本次消费金额（元，必填）
                <input type="number" id="hb99f-cost" class="input" min="0" step="0.5" placeholder="如 15" style="width:120px">
              </label>
              <div style="font-size:12px;color:var(--text-soft)">🧋 当日可多次记录（每次一条流水）。今日已记录 <b>${arr.length}</b> 次 · 累计 <b>${Math.round(total * 100) / 100}</b> 元；金额自动同步【数据中心 → 经济数据】（餐饮类）。</div>`;
    }
    // v2026.0905 修复：补卡必填项（漏卡原因 + 反省书）直接内嵌在补卡表单中。
    // 此前用原生 prompt() 收集，部分移动端浏览器/webview 会拦截 prompt()（直接返回 null），
    // 导致「补卡失败」「用户从未被要求填写原因和反省书」「反省书丢失」连锁 bug。
    if (dateKey) {
      const reasons = (CONFIG.habit99 && CONFIG.habit99.makeupReasons) || ['忘带', '需购买', '消极情绪', '忘记了', '其他'];
      body += `<div style="margin-top:12px;padding:12px;border-radius:12px;background:#fffbeb;border:1.5px solid #fde68a">
        <div style="font-weight:800;color:#b45309;font-size:13px">🎫 补卡必填 · 漏卡原因 + 反省书</div>
        <label class="hb99-lbl" style="margin-top:8px">漏卡原因（单选，必选）
          <div class="hb99-opt" id="hb99f-mkreason">${reasons.map(o=>`<button type="button" class="hb99-chip" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${this.esc(o)}</button>`).join('')}</div>
        </label>
        <label class="hb99-lbl" style="margin-top:8px">原因补充说明（可选）<input type="text" id="hb99f-mkreasonx" class="input" placeholder="如需补充具体情境可填写" style="width:100%"></label>
        <label class="hb99-lbl" style="margin-top:8px">反省书（必填，至少 5 个字 · 将存入【习惯】→【反省数据】）
          <textarea id="hb99f-reflect" class="textarea" rows="4" placeholder="写一段反省：为什么会漏卡？下次如何避免？" style="width:100%;min-height:76px"></textarea>
        </label>
      </div>`;
    }
    // v2026.0906 前置未满足只弹提示不给打卡按钮：健身餐（当日健身卡）/ 医疗消（当日健康卡已打且未勾「感觉良好」）
    const fmLocked = cardId === 'fitnessMeal' && !this._hb99FitnessTodayDone(dk);
    const mcLocked = cardId === 'medCost' && !this._hb99MedCostOpen(dk);
    this._modal({
      title: `${c.ico} ${c.name} · ${dateKey ? '补卡' : '长按打卡成功'}（${dk}）`,
      body: `<div class="hb99-form">${body}</div>`,
      actions: (fmLocked || mcLocked)
        ? [{ label: '知道了' }]
        : [
            { label: dateKey ? '提交补卡' : '完成打卡', primary: true, onClick: () => { this.habit99SubmitForm(cardId, dk, !!dateKey); return false; } },
            { label: '取消' },
          ],
    });
  },
  // v2026.0905 正气/正心/正魂：状态单选联动（勾选后显示对应明细填写区）
  _hb99ZhengRadio(btn, cardId) {
    const box = btn.parentNode;
    box.querySelectorAll('.hb99-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const lv = btn.textContent.trim();
    const broken = lv.indexOf('未破') !== 0;
    const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? 'block' : 'none'; };
    if (cardId === 'zhengqi') {
      show('hb99f-zq-broken', broken);
      show('hb99f-zq-big', lv === '大破气');
    } else if (cardId === 'zhengxin') {
      show('hb99f-zx-used', broken);
    } else if (cardId === 'zhenghun') {
      show('hb99f-zh-big', lv === '大破魂');
    } else if (cardId === 'zhengyan') {
      show('hb99f-zy-broken', broken);
      show('hb99f-zy-small', lv === '小破言');
      show('hb99f-zy-big', lv === '大破言');
    }
  },
  _hb99StudyChip(btn) {
    const box = btn.parentNode;
    const sel = box.querySelectorAll('.hb99-chip.on');
    if (!btn.classList.contains('on') && sel.length >= 2) { this._flash('最多选二'); return; }
    btn.classList.toggle('on');
  },
  // 服药表单联动：勾选抗病毒 → 隐藏停药警示；勾选其他药 → 显示次数填写
  // v12.9.50 账号级：非授权账号无抗病毒选项（无停药警示），仅次数填写联动
  _hb99MedSync() {
    const chips = document.querySelectorAll('#hb99f-opt .hb99-chip');
    if (!chips.length) return;
    const av = Array.from(chips).find(b => (b.textContent || '').trim() === '抗病毒');
    const anyOn = Array.from(chips).some(b => b.classList.contains('on'));
    const cnt = document.getElementById('hb99f-medcnt');
    const warn = document.getElementById('hb99f-avwarn');
    if (cnt) cnt.style.display = (anyOn && (!av || !av.classList.contains('on') || Array.from(chips).some(b => b !== av && b.classList.contains('on')))) ? 'block' : 'none';
    if (warn) warn.style.display = (av && av.classList.contains('on')) ? 'none' : 'block';
  },
  // v2026.0906 健康卡表单联动：单选状态 → 勾选「小病缠身」展开症状多选；勾选「大病复查」展开复查配置区
  _hb99HealthRadio(btn) {
    const box = btn.parentNode;
    box.querySelectorAll('.hb99-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const v = btn.textContent.trim();
    const sick = document.getElementById('hb99f-sickbox');
    if (sick) sick.style.display = v === '小病缠身' ? 'block' : 'none';
    const re = document.getElementById('hb99f-recheckbox');
    if (re) re.style.display = v === '大病复查' ? 'block' : 'none';
  },
  // v2026.0906 三餐卡表单联动：就餐类型单选 → 外卖/堂食展开花费填写；被请客展开东家名字（居家两者皆隐藏）
  _hb99MealType(btn) {
    const box = btn.parentNode;
    box.querySelectorAll('.hb99-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const t = btn.textContent.trim();
    const costBox = document.getElementById('hb99f-mtcost');
    if (costBox) costBox.style.display = (t === '外卖' || t === '堂食') ? 'block' : 'none';
    const hostBox = document.getElementById('hb99f-mthost');
    if (hostBox) hostBox.style.display = t === '被请客' ? 'block' : 'none';
  },
  // v2026.0906 人情消表单联动：送礼/请客单选 → 请客展开餐段选择（送礼隐藏）
  _hb99SocialType(btn) {
    const box = btn.parentNode;
    box.querySelectorAll('.hb99-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const t = btn.textContent.trim();
    const treatBox = document.getElementById('hb99f-treatbox');
    if (treatBox) treatBox.style.display = t === '请客' ? 'block' : 'none';
    if (t !== '请客') {
      const eatBox = document.getElementById('hb99f-eatwaybox');
      if (eatBox) eatBox.style.display = 'none';
      document.querySelectorAll('#hb99f-meal .hb99-chip, #hb99f-eatway .hb99-chip').forEach(b => b.classList.remove('on'));
    }
  },
  // v2026.0906 人情消表单联动：请客餐段单选 → 三餐之一展开就餐方式（外卖/堂食）；其他隐藏
  _hb99SocialMeal(btn) {
    const box = btn.parentNode;
    box.querySelectorAll('.hb99-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const t = btn.textContent.trim();
    const eatBox = document.getElementById('hb99f-eatwaybox');
    if (eatBox) {
      eatBox.style.display = ['早餐','午餐','晚餐'].includes(t) ? 'block' : 'none';
      if (!['早餐','午餐','晚餐'].includes(t)) document.querySelectorAll('#hb99f-eatway .hb99-chip').forEach(b => b.classList.remove('on'));
    }
  },
  // v2026.0906 正姿卡表单联动：未破姿/小破姿/大破姿单选 → 破姿展开理由填写
  _hb99PostureRadio(btn) {
    const box = btn.parentNode;
    box.querySelectorAll('.hb99-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const v = btn.textContent.trim();
    const psBox = document.getElementById('hb99f-ps-broken');
    if (psBox) psBox.style.display = v === '未破姿' ? 'none' : 'block';
  },
  // v10.0 吃吃消联动①：类别（饮品/零食/水果）多选切换 → 显隐饮品明细/水果明细区块
  _hb99EatKind(btn) {
    btn.classList.toggle('on');
    const kinds = Array.from(btn.parentNode.querySelectorAll('.hb99-chip.on')).map(b => b.textContent.trim());
    const drinkBox = document.getElementById('hb99f-drinkbox');
    const fruitBox = document.getElementById('hb99f-fruitbox');
    if (drinkBox) drinkBox.style.display = kinds.includes('饮品') ? 'block' : 'none';
    if (fruitBox) fruitBox.style.display = kinds.includes('水果') ? 'block' : 'none';
  },
  // v10.0 吃吃消联动②：饮品类型多选切换 → 勾了奶茶/果汁才显示「容量/糖度/实际饮用」区块
  _hb99EatDrink(btn) {
    btn.classList.toggle('on');
    const drinks = Array.from(btn.parentNode.querySelectorAll('.hb99-chip.on')).map(b => b.textContent.trim());
    const sugarBox = document.getElementById('hb99f-sugarbox');
    if (sugarBox) sugarBox.style.display = (drinks.includes('奶茶') || drinks.includes('果汁')) ? 'block' : 'none';
  },
  // v2026.0906 三餐花费 → 【数据中心·经济数据】同步：外卖/堂食花费写入支出流水（meal 分类）
  // 旧记录已有花费（重复提交/改卡）时不重复入账；返回实际入账金额（0 = 未入账）
  _hb99SyncMealCost(dk, cardId, payload, prev) {
    try {
      if (!['breakfast','lunch','dinner'].includes(cardId)) return 0;
      const cost = Math.round((+((payload || {}).cost) || 0) * 100) / 100;
      if (!(cost > 0)) return 0;
      if (prev && +prev.cost > 0) return 0; // 旧记录已入过账，防重复
      const c = (CONFIG.habitCards || []).find(x => x.id === cardId) || {};
      Store.addLedger({
        amount: cost,
        category: 'meal',
        note: `${(payload || {}).mealType || '就餐'} · ${c.name || cardId}${(payload || {}).foods && payload.foods.length ? '（' + payload.foods.join('/') + '）' : ''}`,
        date: dk,
      });
      return cost;
    } catch (e) { return 0; }
  },
  // v2026.0906 健康卡 → 就医数据联动：小病症状逐项写入【就医数据】急诊科（tags 标记 healthSync + 病种ID，同日去重）
  _hb99SyncHealthToMr(dk, payload) {
    const map = (CONFIG.habit99 && CONFIG.habit99.emergencySymptomIds) || {};
    let n = 0;
    (payload.symptoms || []).forEach(sym => {
      const id = map[sym] || sym;
      const dup = (Store.load().medicalRecords || []).some(r => r.date === dk && (r.tags || []).indexOf('healthSync') >= 0 && (r.tags || []).indexOf(id) >= 0);
      if (dup) return;
      const res = Store.addMedicalRecord({
        type: 'acute', disease: sym, symptoms: [sym], severity: 2,
        date: dk, onsetDate: payload.onsetDate || dk, hospital: '', doctor: '',
        treatment: '', diagnose: '', note: '由【健康】打卡卡自动同步（急诊科）',
        tags: [id, 'healthSync'],
      });
      if (res.ok) n++;
    });
    return n;
  },
  // v2026.0906 健康卡大病复查 →【就医数据·感染科】同步：HIV/HPV/TP 复查记录写入感染科慢性病档案（当日同病种不重复）
  _hb99SyncRecheckToMr(dk, payload) {
    try {
      const kind = { HIV: 'hiv', HPV: 'hpv', TP: 'tp' }[payload.recheckDisease] || '';
      if (!kind) return 0;
      const dup = (Store.load().medicalRecords || []).some(r => r.date === dk && (r.tags || []).indexOf('healthSync') >= 0 && (r.tags || []).indexOf(kind) >= 0);
      if (dup) return 0;
      const names = { hiv: 'HIV', hpv: 'HPV', tp: '梅毒TP' };
      const res = Store.addMedicalRecord({
        type: 'chronic', disease: names[kind] || kind, symptoms: [], severity: 1,
        date: dk, onsetDate: dk, hospital: '', doctor: '',
        treatment: (payload.recheckActs || []).join('/'),
        diagnose: '', note: `大病复查（${payload.recheckNote || ''}）——由【健康】打卡卡自动同步（感染科）`,
        tags: [kind, 'healthSync'],
      });
      return res.ok ? 1 : 0;
    } catch (e) { return 0; }
  },
  // v2026.0906 消费记录卡（痘清洁/牙清洁/发修剪/搓澡洗/足洗户/耳采洗/医疗消/交通消/生活消/居住消/人情消/用品消/培养消）→【数据中心·经济数据】同步：
  // 花费写入支出流水；旧记录已有花费（重复提交/改卡）不重复入账；多次卡（数组）每次提交各入账一条
  // cat 支持函数：培养消按勾选项动态分入 学习/健身 类
  _hb99CostCardMap() {
    return {
      acneClean: { cat: 'care', name: '痘清洁', note: (p) => `门店全脸清洁 · ${p.pay || ''}` },
      toothClean: { cat: 'med',  name: '牙清洁', note: (p) => `专业洗牙 · ${p.pay || ''}` },
      hairTrim:   { cat: 'care', name: '发修剪', note: (p) => `${(p.items || []).join('/') || '修剪'} · ${p.pay || ''}` },
      bodyScrub:  { cat: 'care', name: '搓澡洗', note: () => '门店专业搓澡' },
      footSpa:    { cat: 'care', name: '足洗户', note: (p) => `门店专业足浴 · ${p.pay || ''}` },
      earClean:   { cat: 'care', name: '耳采洗', note: (p) => `门店专业采耳 · ${p.pay || ''}` },
      medCost:    { cat: 'med',  name: '医疗消', note: (p) => p.healthStatus ? `健康卡：${p.healthStatus}` : '医疗支出' },
      trafficCost:{ cat: 'traffic', name: '交通消', note: (p) => p.pay || '出行' },
      lifeCost:   { cat: 'util',    name: '生活消', note: (p) => p.pay || '生活缴费' },
      livingCost: { cat: 'housing', name: '居住消', note: (p) => p.pay || '居住' },
      socialCost: { cat: 'social',  name: '人情消', note: (p) => p.type === '送礼' ? '送礼' : `请客${p.meal ? ' · ' + p.meal : ''}${p.eatWay ? ' · ' + p.eatWay : ''}` },
      goodsCost:  { cat: 'goods',   name: '用品消', note: (p) => p.pay || '用品' },
      growthCost: { cat: (p) => (p && p.pay === '健身私教付费') ? 'gym' : 'study', name: '培养消', note: (p) => p.pay || '知识付费' },
      // v10.0 吃吃消：零食/饮品/水果 → 餐饮类；奶茶/果汁/水果明细进消化代谢与五脏六腑模型
      eatCost:    { cat: 'meal',    name: '吃吃消', note: (p) => {
        const parts = [];
        if ((p.kinds || []).includes('饮品')) parts.push(`饮品${(p.drinks || []).length ? '（' + p.drinks.join('/') + '）' : ''}`);
        if ((p.kinds || []).includes('零食')) parts.push('零食');
        if ((p.kinds || []).includes('水果')) parts.push(`水果${p.fruit && p.fruit.name ? '（' + p.fruit.name + '）' : ''}`);
        return parts.join(' · ') || '零食饮品';
      } },
    };
  },
  _hb99SyncCost(dk, cardId, payload, prev) {
    try {
      const conf = this._hb99CostCardMap()[cardId];
      if (!conf) return 0;
      const cost = Math.round((+((payload || {}).amount) || 0) * 100) / 100;
      if (!(cost > 0)) return 0;
      if (prev && +prev.amount > 0) return 0; // 旧记录已入过账，防重复
      const cat = typeof conf.cat === 'function' ? conf.cat(payload || {}) : conf.cat;
      Store.addLedger({
        amount: cost,
        category: cat,
        note: `${conf.name} · ${conf.note(payload || {})}`,
        date: dk,
      });
      return cost;
    } catch (e) { return 0; }
  },
  // v2026.0906 搓澡洗/足洗户 自动联动：打卡后自动完成当日【洗澡】/【洗脚】卡并勾选「消费洗」
  _hb99AutoLinkWash(dk, cardId) {
    try {
      if (cardId === 'bodyScrub' && !Store.habit99Get(dk, 'bath')) {
        Store.habit99Check(dk, 'bath', { way: '消费洗', autoBy: '搓澡洗' });
        return '洗澡';
      }
      if (cardId === 'footSpa' && !Store.habit99Get(dk, 'footWash')) {
        Store.habit99Check(dk, 'footWash', { way: '消费洗', autoBy: '足洗户' });
        return '洗脚';
      }
    } catch (e) {}
    return '';
  },
  // v2026.0906 人情消·请客 自动联动三餐卡：请客-早餐/午餐/晚餐（+外卖/堂食）→ 对应三餐卡自动打卡
  // 已手动打卡的三餐卡不覆盖；自动打卡的花费记 0（金额已由人情消入账，防记账重复）
  _hb99SocialLinkMeal(dk, payload) {
    try {
      const map = { '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner' };
      const mid = map[payload.meal];
      if (!mid) return '';
      const prev = Store.habit99Get(dk, mid);
      if (prev && (prev.ts || prev.makeup)) return '';
      Store.habit99Check(dk, mid, {
        time: new Date().toTimeString().slice(0, 5),
        foods: [], quality: 0,
        mealType: payload.eatWay || '堂食',
        cost: 0, autoBy: '人情消（请客）',
      });
      return payload.meal;
    } catch (e) {}
    return '';
  },
  // 记录板块·随笔/反省书存储
  _addWbRecordNote(kind, text) {
    if (this._dev99) { this._dev99Notes.push({ kind: kind || '随笔', text: String(text || ''), ts: new Date().toISOString() }); return; } // 开发者模式：反省书进沙箱
    const d = Store.load();
    if (!Array.isArray(d.wbNotes99)) d.wbNotes99 = [];
    d.wbNotes99.unshift({ id: Store._id(), date: Store.today(), kind: kind || '随笔', text: String(text || ''), ts: new Date().toISOString() });
    if (d.wbNotes99.length > 500) d.wbNotes99.length = 500;
    Store.save(d);
  },
  habit99SubmitForm(cardId, dk, isMakeup) {
    // v10.0 开发者模式：不再短路——Store 已沙箱化（_dev99Enter 补丁），
    // 表单校验 + 写库 + 联动计算（三餐/记账/就医/模型）全流程照常运行，只是全部落在沙箱
    this._habit99SubmitInner(cardId, dk, isMakeup);
  },
  _habit99SubmitInner(cardId, dk, isMakeup) {
    const $ = (id) => document.getElementById(id);
    const val = (id) => { const el = $(id); return el ? el.value : ''; };
    const stars = (id) => { const el = $(id); return el && el.dataset.val ? +el.dataset.val : 0; };
    const selChips = (id) => { const el = $(id); return el ? Array.from(el.querySelectorAll('.hb99-chip.on')).map(b => b.textContent.replace('ml','').trim()) : []; };
    let payload = {};
    if (cardId === 'goodMorning') payload = { wake: val('hb99f-wake'), quality: stars('hb99f-q') };
    else if (cardId === 'goodNight') payload = { sleep: val('hb99f-sleep'), quality: stars('hb99f-q') };
    else if (['breakfast','lunch','dinner'].includes(cardId)) {
      // v2026.0906 三餐卡：就餐类型（居家/外卖/堂食/被请客）+ 外卖/堂食花费（同步记账）+ 被请客东家名字
      const mealType = selChips('hb99f-mt')[0] || '';
      if (!mealType) { this._flash('请先勾选就餐类型（居家/外卖/堂食/被请客）'); return; }
      let cost = 0, host = '';
      if (mealType === '外卖' || mealType === '堂食') {
        cost = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
        if (!(cost > 0)) { this._flash(`「${mealType}」需填写这一餐的花费金额（元）`); return; }
      } else if (mealType === '被请客') {
        host = (val('hb99f-host') || '').trim();
        if (!host) { this._flash('「被请客」需填写东家的名字（谁请的这顿）'); return; }
      }
      payload = { time: val('hb99f-time'), foods: selChips('hb99f-foods'), quality: stars('hb99f-q'), mealType, cost, host };
    }
    else if (cardId === 'steps') {
      // v2026.0906 步数卡：以手机/智能手表数据为准如实填写
      const count = parseInt(val('hb99f-count'), 10);
      if (!(count >= 0) || isNaN(count)) { this._flash('请填写今日步数（以手机/智能手表数据为准）'); return; }
      if (count > 200000) { this._flash('步数超过 20 万，请核对手机/手表数据后如实填写'); return; }
      payload = { count };
    }
    else if (cardId === 'noonNap') payload = { start: val('hb99f-start'), end: val('hb99f-end'), quality: stars('hb99f-q') };
    else if (cardId === 'poop') payload = { form: selChips('hb99f-opt')[0] || '', pain: !!($('hb99f-pain') && $('hb99f-pain').checked) };
    else if (cardId === 'pee') payload = { color: selChips('hb99f-opt')[0] || '' };
    else if (cardId === 'water') payload = { amount: parseInt(selChips('hb99f-opt')[0], 10) || 0 };
    else if (['faceWashM','mouthWashM','faceWashE','mouthWashE','hairWash','footWash','bath'].includes(cardId)) {
      const way = selChips('hb99f-opt')[0] || '';
      if (!way) { this._flash('请先勾选方式'); return; }
      payload = { way };
    }
    else if (cardId === 'fitness') {
      const parts = selChips('hb99f-opt');
      const minutes = parseInt(val('hb99f-min'), 10) || 0;
      if (!parts.length) { this._flash('请至少勾选 1 个训练部位'); return; }
      if (minutes < 1) { this._flash('请填写训练时间（分钟）'); return; }
      payload = { parts, minutes };
    }
    else if (cardId === 'medicine') {
      // v12.9.50 账号级隐私：授权账号 = 固定选项（含抗病毒停药警示）；其他账号 = 自己的药物清单（无抗病毒语义）
      const owner = this._isAuthorizedAccount && this._isAuthorizedAccount();
      const drugs = selChips('hb99f-opt');
      const cnts = {};
      document.querySelectorAll('.hb99-cnt').forEach(i => { const v = +i.value || 0; if (v > 0) cnts[i.dataset.drug] = v; });
      const avReason = selChips('hb99f-avreason')[0] || '';
      if (owner) {
        if (!drugs.includes('抗病毒') && !avReason) { this._flash('⚠️ 请先填写未服抗病毒的原因（停药警示）'); return; }
      } else {
        const myOpts = this._hb99OptsForMe(c);
        if (!myOpts.length) { this._flash('💊 还没有药物——先去【健康】页「每日药物服用」添加你每天要吃的药'); return; }
        if (!drugs.length) { this._flash('请至少勾选 1 种你已服用的药物'); return; }
      }
      payload = { drugs, counts: cnts, noAVReason: (owner && drugs.includes('抗病毒')) ? '' : avReason };
    }
    else if (cardId === 'zhengqi') {
      // v2026.0905 正气：三选一 + 破气明细（时间/方式/大破气次数/理由）
      const level = selChips('hb99f-opt')[0] || '';
      if (!level) { this._flash('请先勾选今日状态（三选一）'); return; }
      if (level === '未破气') {
        payload = { level, clean: true };
      } else {
        const time = val('hb99f-time');
        const way = selChips('hb99f-way')[0] || '';
        const reason = val('hb99f-reason').trim();
        if (!time) { this._flash('请填写破气时间'); return; }
        if (!way) { this._flash('请勾选破气方式'); return; }
        if (!reason) { this._flash(level === '大破气' ? '大破气必须交代行动理由' : '请填写破气理由'); return; }
        if (level === '大破气') {
          const count = parseInt(val('hb99f-count'), 10) || 0;
          if (count < 1) { this._flash('请填写大破气次数'); return; }
          payload = { level, time, way, count, reason, clean: false };
        } else {
          payload = { level, time, way, reason, clean: false };
        }
      }
    }
    else if (cardId === 'zhengxin') {
      // v2026.0905 正心：三选一 + 使用时间
      const level = selChips('hb99f-opt')[0] || '';
      if (!level) { this._flash('请先勾选今日状态（三选一）'); return; }
      if (level === '未破心') {
        payload = { level, clean: true };
      } else {
        const minutes = parseInt(val('hb99f-min'), 10) || 0;
        if (minutes < 1) { this._flash('请如实填写使用/浏览时间（分钟）'); return; }
        payload = { level, minutes, clean: false };
      }
    }
    else if (cardId === 'zhenghun') {
      // v2026.0905 正魂：三选一 + 大破魂行为/时间
      const level = selChips('hb99f-opt')[0] || '';
      if (!level) { this._flash('请先勾选今日状态（三选一）'); return; }
      if (level === '未破魂') {
        payload = { level, clean: true };
      } else if (level === '小破魂') {
        payload = { level, clean: false };
      } else {
        const act = selChips('hb99f-act')[0] || '';
        const time = val('hb99f-time');
        if (!act) { this._flash('请勾选大破魂的具体行为'); return; }
        if (!time) { this._flash('请填写破魂时间'); return; }
        payload = { level, act, time, clean: false };
      }
    }
    else if (cardId === 'zhengyan') {
      // v2026.0905 正言：三选一 + 破言时间/行为（分级多选）/理由
      const level = selChips('hb99f-opt')[0] || '';
      if (!level) { this._flash('请先勾选今日状态（三选一）'); return; }
      if (level === '未破言') {
        payload = { level, clean: true };
      } else {
        const time = val('hb99f-time');
        const acts = level === '小破言' ? selChips('hb99f-acts-s') : selChips('hb99f-acts-b');
        const reason = val('hb99f-reason').trim();
        if (!time) { this._flash('请填写破言时间'); return; }
        if (!acts.length) { this._flash(`请至少勾选 1 项${level === '大破言' ? '大' : '小'}破行为`); return; }
        if (!reason) { this._flash(level === '大破言' ? '大破言必须交代破言理由' : '请填写破言理由'); return; }
        payload = { level, time, acts, reason, clean: false };
      }
    }
    else if (['studyMorning','studyNoon','studyEvening'].includes(cardId)) payload = { ways: selChips('hb99f-opt') };
    else if (cardId === 'mood') {
      // v2026.0906 心情卡：六选一 + 原因（提交前再校验一次冷却，防表单长时间停留）
      const type = selChips('hb99f-opt')[0] || '';
      const reason = val('hb99f-reason').trim();
      if (!type) { this._flash('请先勾选心情类型（六选一）'); return; }
      if (!reason) { this._flash('请填写心情原因（如实记录）'); return; }
      const arr = Store.habit99Get(dk, 'mood') || [];
      const cool = this._hb99MoodCoolingMin(arr);
      if (cool > 0) { this._flash(`⏳ 心情冷却中：距下次可记录还需 ${cool} 分钟`); return; }
      payload = { type, reason };
    }
    else if (cardId === 'health') {
      // v2026.0906 健康卡：三选一（感觉良好/小病缠身/大病复查）+ 小病症状多选 / 大病复查病种+项目+情况
      const status = selChips('hb99f-opt')[0] || '';
      if (!status) { this._flash('请先勾选今日身体状态（三选一）'); return; }
      let symptoms = [], onsetDate = '', recheckDisease = '', recheckActs = [], recheckNote = '';
      if (status === '小病缠身') {
        symptoms = selChips('hb99f-sym');
        if (!symptoms.length) { this._flash('「小病缠身」需至少勾选 1 个症状'); return; }
        onsetDate = val('hb99f-onset') || dk;
      } else if (status === '大病复查') {
        recheckDisease = selChips('hb99f-rd')[0] || '';
        if (!recheckDisease) { this._flash(`「大病复查」需先选择复查病种（${(c.recheckDiseases||[]).join('/')} 三选一）`); return; }
        recheckActs = selChips('hb99f-ra');
        if (!recheckActs.length) { this._flash('「大病复查」需至少勾选 1 个复查项目（体检/治疗/买药）'); return; }
        recheckNote = (val('hb99f-rnote') || '').trim();
        if (!recheckNote) { this._flash('请填写复查的具体情况（如实记录，将存入【就医数据】感染科）'); return; }
        onsetDate = dk; // 复查日即当日
      }
      payload = { status, symptoms, onsetDate, recheckDisease, recheckActs, recheckNote };
    }
    // v2026.0906 第 29-36 张新卡
    else if (cardId === 'fitnessMeal') {
      // 健身餐：前置校验（当日健身卡已完成）+ 补剂多选
      if (!this._hb99FitnessTodayDone(dk)) { this._flash('🔒 需先完成当日【健身】卡打卡，才能打卡健身餐'); return; }
      const items = selChips('hb99f-opt');
      if (!items.length) { this._flash('请至少勾选 1 项补剂（蛋白粉/肌酸/增肌粉）'); return; }
      payload = { items };
    }
    else if (cardId === 'nutriMeal') {
      // 营养餐：保健品多选
      const items = selChips('hb99f-opt');
      if (!items.length) { this._flash('请至少勾选 1 项保健品（维生素B/C/D/鱼油）'); return; }
      payload = { items };
    }
    else if (cardId === 'acneClean' || cardId === 'footSpa' || cardId === 'earClean') {
      // 消费记录卡：消费方式三选一 + 金额
      const pay = selChips('hb99f-pay')[0] || '';
      if (!pay) { this._flash('请先勾选消费方式（三选一）'); return; }
      const amount = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
      if (!(amount > 0)) { this._flash('请填写消费金额（元）'); return; }
      payload = { pay, amount };
    }
    else if (cardId === 'toothClean') {
      // 牙清洁：场所二选一 + 金额
      const pay = selChips('hb99f-pay')[0] || '';
      if (!pay) { this._flash('请先勾选消费场所（门店消费/医院消费）'); return; }
      const amount = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
      if (!(amount > 0)) { this._flash('请填写消费金额（元）'); return; }
      payload = { pay, amount };
    }
    else if (cardId === 'hairTrim') {
      // 发修剪：项目多选 + 消费方式三选一 + 金额
      const items = selChips('hb99f-items');
      if (!items.length) { this._flash('请至少勾选 1 个项目（理发/烫发/染发）'); return; }
      const pay = selChips('hb99f-pay')[0] || '';
      if (!pay) { this._flash('请先勾选消费方式（三选一）'); return; }
      const amount = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
      if (!(amount > 0)) { this._flash('请填写消费金额（元）'); return; }
      payload = { items, pay, amount };
    }
    else if (cardId === 'bodyScrub') {
      // 搓澡洗：金额
      const amount = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
      if (!(amount > 0)) { this._flash('请填写消费金额（元）'); return; }
      payload = { amount };
    }
    else if (cardId === 'medCost') {
      // v2026.0906 医疗消：前置校验（健康卡已打卡且未勾「感觉良好」）+ 金额（用途关联健康卡）
      if (!this._hb99MedCostOpen(dk)) { this._flash('🔒 需先打卡当日【健康】卡且未勾选「感觉良好」（小病缠身/大病复查），才能打卡医疗消'); return; }
      const amount = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
      if (!(amount > 0)) { this._flash('请填写医疗消费金额（元）'); return; }
      const hd = Store.habit99Get(dk, 'health') || {};
      payload = { amount, healthStatus: hd.status || '' };
    }
    else if (cardId === 'trafficCost') {
      // v2026.0906 交通消：出行方式二选一 + 金额（当日可多次，每次一条流水）
      const pay = selChips('hb99f-pay')[0] || '';
      if (!pay) { this._flash('请先勾选出行方式（公共交通/网约车）'); return; }
      const amount = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
      if (!(amount > 0)) { this._flash('请填写本次消费金额（元）'); return; }
      payload = { pay, amount };
    }
    else if (['lifeCost','livingCost','goodsCost','growthCost'].includes(cardId)) {
      // v2026.0906 生活消/居住消/用品消/培养消：类型三选一 + 金额（当日可多次，每次一条流水）
      const cd = (CONFIG.habitCards || []).find(x => x.id === cardId) || {};
      const pay = selChips('hb99f-pay')[0] || '';
      if (!pay) { this._flash(`请先勾选${cd.name || '消费'}类型（${(cd.opts || []).join('/')}，三选一）`); return; }
      const amount = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
      if (!(amount > 0)) { this._flash('请填写本次消费金额（元）'); return; }
      payload = { pay, amount };
    }
    else if (cardId === 'socialCost') {
      // v2026.0906 人情消：送礼/请客 二选一 + 金额（请客联动三餐卡 · 当日可多次）
      const type = selChips('hb99f-pay')[0] || '';
      if (!type) { this._flash('请先勾选人情类型（送礼/请客，二选一）'); return; }
      let meal = '', eatWay = '';
      if (type === '请客') {
        meal = selChips('hb99f-meal')[0] || '';
        if (!meal) { this._flash('「请客」需再勾选餐段（早餐/午餐/晚餐/其他，四选一）'); return; }
        if (['早餐','午餐','晚餐'].includes(meal)) {
          eatWay = selChips('hb99f-eatway')[0] || '';
          if (!eatWay) { this._flash(`「请客 · ${meal}」需再勾选就餐方式（外卖/堂食）`); return; }
        }
      }
      const amount = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
      if (!(amount > 0)) { this._flash('请填写本次消费金额（元）'); return; }
      payload = { type, meal, eatWay, amount };
    }
    else if (cardId === 'posture') {
      // v2026.0906 正姿：未破姿/小破姿/大破姿 三选一 + 破姿理由
      const level = selChips('hb99f-opt')[0] || '';
      if (!level) { this._flash('请先勾选今日姿态（未破姿/小破姿/大破姿）'); return; }
      if (level === '未破姿') {
        payload = { level, clean: true };
      } else {
        const reason = val('hb99f-reason').trim();
        if (!reason) { this._flash(`${level}需填写进行理由（跷二郎腿/驼背的情境）`); return; }
        payload = { level, reason, clean: false };
      }
    }
    else if (cardId === 'privacyWash') {
      // v10.0 隐私洗：清洗部位多选 + 不适症状单选（同步健康分析/五脏六腑模型）
      const parts = selChips('hb99f-wash');
      if (!parts.length) { this._flash('请勾选清洗部位（清洗肛门/清洗私处，可多选）'); return; }
      const symptom = selChips('hb99f-opt')[0] || '';
      if (!symptom) { this._flash('请勾选有无不适反应症状（无/瘙痒/疼痛/红肿/分泌物异常/其他）'); return; }
      payload = { parts, symptom, clean: symptom === '无' };
    }
    else if (cardId === 'eatCost') {
      // v10.0 吃吃消：类别多选 + 饮品明细（奶茶/果汁：容量/糖度/实际饮用）+ 水果明细 + 金额（联动经济/代谢/五脏模型）
      const kinds = selChips('hb99f-kind');
      if (!kinds.length) { this._flash('请至少勾选一个类别（饮品/零食/水果）'); return; }
      const amount = Math.round((parseFloat(val('hb99f-cost')) || 0) * 100) / 100;
      if (!(amount > 0)) { this._flash('请填写本次消费金额（元）'); return; }
      let drinks = [], sugarInfo = null, fruit = null;
      if (kinds.includes('饮品')) {
        drinks = selChips('hb99f-drink');
        if (!drinks.length) { this._flash('勾选了「饮品」需再选饮品类型（奶茶/果汁/酸奶/水，可多选）'); return; }
        if (drinks.includes('奶茶') || drinks.includes('果汁')) {
          const capMl = parseInt(selChips('hb99f-cap')[0], 10) || 0;
          const sugarLvl = selChips('hb99f-sugar')[0] || '';
          const drankMl = parseInt(val('hb99f-drank'), 10);
          if (!capMl) { this._flash('奶茶/果汁需勾选容量（350/500/700/1000ml）'); return; }
          if (!sugarLvl) { this._flash('奶茶/果汁需勾选几分糖（无糖/三分糖/五分糖/七分糖/全糖）'); return; }
          if (isNaN(drankMl) || drankMl < 0) { this._flash('奶茶/果汁需填写实际喝了多少（ml，没喝完也如实填）'); return; }
          if (drankMl > capMl) { this._flash(`实际喝了 ${drankMl}ml 超过容量 ${capMl}ml，请核对后重填`); return; }
          sugarInfo = { capMl, sugarLvl, drankMl };
        }
      }
      if (kinds.includes('水果')) {
        const fruitName = (val('hb99f-fruitname') || '').trim();
        const fruitEat = (val('hb99f-fruiteat') || '').trim();
        if (!fruitName) { this._flash('勾选了「水果」需填写买了什么水果'); return; }
        if (!fruitEat) { this._flash('勾选了「水果」需填写实际吃了多少（如 2 个 / 300g）'); return; }
        fruit = { name: fruitName, ate: fruitEat };
      }
      payload = { kinds, drinks, sugarInfo, fruit, amount };
    }
    // v2026.0906 三餐/消费卡花费同步记账：记录写入前先取旧值（旧记录已有花费则不重复入账）
    // v10.0 开发者模式下：habit99Get/habit99Check/addLedger 均已被沙箱补丁接管，以下联动全走沙箱
    const isMealCard = ['breakfast','lunch','dinner'].includes(cardId);
    const isCostCard = !!this._hb99CostCardMap()[cardId];
    const mealPrev = (isMealCard || isCostCard) ? (Store.habit99Get(dk, cardId) || {}) : {};
    if (isMakeup) {
      // v2026.0905 修复：原因/反省书改从补卡表单内嵌字段读取（不再依赖原生 prompt()，避免被移动端拦截导致补卡失败）
      const reasonChip = (selChips('hb99f-mkreason')[0] || '').trim();
      const reasonExtra = (val('hb99f-mkreasonx') || '').trim();
      const reflection = (val('hb99f-reflect') || '').trim();
      if (!reasonChip) { this._flash('请先勾选漏卡原因'); return; }
      if (reflection.length < 5) { this._flash('反省书至少写 5 个字'); return; }
      const reason = reasonExtra ? `${reasonChip}（${reasonExtra}）` : reasonChip;
      const cd = (CONFIG.habitCards || []).find(x => x.id === cardId) || {};
      Store.habit99Makeup(dk, cardId, reason, reflection, payload);
      // v12.9.40 戒断数据钩子：戒卡补卡改判 → 四魔物活性同日改账（撤旧入新）
      try { this._quit99OnCheck && this._quit99OnCheck(dk, cardId, payload); } catch (e) {}
      // v2026.0906 三餐花费 + 消费记录卡花费同步【经济数据】（旧记录已有花费则不重复入账）
      const led = (this._hb99SyncMealCost(dk, cardId, payload, mealPrev) || 0) + (this._hb99SyncCost(dk, cardId, payload, mealPrev) || 0);
      // v2026.0905 修复：记录文本用卡片名（此前用 cardId 如 "补卡 goodMorning"，用户看不懂）
      this._addWbRecordNote('反省书', `【补卡】${cd.ico || '🎫'}${cd.name || cardId}（${dk}）\n漏卡原因：${reason}\n反省书：${reflection}`);
      this._flash(led ? `🎫 补卡成功，${led}元花费已同步【经济数据】` : '🎫 补卡成功，反省书已存入【习惯 → 反省数据】');
    } else {
      Store.habit99Check(dk, cardId, payload);
      // v12.9.40 戒断数据钩子：戒卡打卡（未破 -1 / 破 +1）→ 喂养或饿瘪对应魔物（93-quit99.js）
      try { this._quit99OnCheck && this._quit99OnCheck(dk, cardId, payload); } catch (e) {}
      // v2026.0906 三餐花费 + 消费记录卡花费同步【经济数据】（旧记录已有花费则不重复入账；交通消为多次卡，每次提交各入账一条）
      const led = (this._hb99SyncMealCost(dk, cardId, payload, mealPrev) || 0) + (this._hb99SyncCost(dk, cardId, payload, mealPrev) || 0);
      // v2026.0906 搓澡洗/足洗户自动联动：打卡后自动完成当日【洗澡】/【洗脚】卡并勾选「消费洗」
      const linked = this._hb99AutoLinkWash(dk, cardId);
      // v2026.0906 健康卡联动：小病缠身 → 症状逐项同步【就医数据】急诊科；大病复查 → 同步【就医数据】感染科
      if (cardId === 'health' && payload.status === '小病缠身') {
        const synced = this._hb99SyncHealthToMr(dk, payload);
        this._flash(synced > 0 ? `🎉 打卡成功！已同步 ${synced} 条急诊科记录，请到【数据中心 → 就医数据】完善治疗信息` : '🎉 打卡成功！继续坚持～');
      } else if (cardId === 'health' && payload.status === '大病复查') {
        const synced = this._hb99SyncRecheckToMr(dk, payload);
        this._flash(synced ? `🎉 打卡成功！大病复查记录已同步【数据中心 → 就医数据 → 感染科】，可在【医疗消】卡记录本次花费` : '🎉 打卡成功！该日感染科复查记录已存在，未重复同步');
      } else if (cardId === 'trafficCost') {
        const arr = Store.habit99Get(dk, 'trafficCost') || [];
        const total = arr.reduce((s, x) => s + (+x.amount || 0), 0);
        this._flash(`🎉 打卡成功！今日第 ${arr.length} 次出行已记录（累计 ${Math.round(total * 100) / 100} 元），已同步【数据中心 → 经济数据】`);
      } else if (cardId === 'medCost') {
        const hd = Store.habit99Get(dk, 'health') || {};
        const use = hd.status === '大病复查' ? `（用途：${hd.recheckDisease || ''}${(hd.recheckActs || []).includes('买药') ? ' 药物' : ' 复查'}）` : '';
        this._flash(`🎉 打卡成功！${led}元医疗消费已同步【数据中心 → 经济数据】${use}`);
      } else if (cardId === 'socialCost') {
        // v2026.0906 人情消：请客-三餐 自动联动打卡对应三餐卡
        const mealLinked = this._hb99SocialLinkMeal(dk, payload);
        const arr = Store.habit99Get(dk, 'socialCost') || [];
        const total = arr.reduce((s, x) => s + (+x.amount || 0), 0);
        this._flash(`🎉 打卡成功！今日第 ${arr.length} 次人情消费已记录（累计 ${Math.round(total * 100) / 100} 元），已同步【数据中心 → 经济数据】${mealLinked ? `；【${mealLinked}】卡已自动打卡（${payload.eatWay}）` : ''}`);
      } else if (['lifeCost','livingCost','goodsCost','growthCost'].includes(cardId)) {
        // v2026.0906 新多次消费卡：生活消/居住消/用品消/培养消
        const arr = Store.habit99Get(dk, cardId) || [];
        const total = arr.reduce((s, x) => s + (+x.amount || 0), 0);
        this._flash(`🎉 打卡成功！今日第 ${arr.length} 次消费已记录（累计 ${Math.round(total * 100) / 100} 元），已同步【数据中心 → 经济数据】`);
      } else if (cardId === 'eatCost') {
        // v10.0 吃吃消：奶茶/果汁/水果明细同步代谢模型 + 金额同步经济数据
        const arr = Store.habit99Get(dk, 'eatCost') || [];
        const total = arr.reduce((s, x) => s + (+x.amount || 0), 0);
        let extra = '';
        if (payload.sugarInfo) extra += `；${payload.drinks.join('/')} ${payload.sugarInfo.sugarLvl} ${payload.sugarInfo.drankMl}/${payload.sugarInfo.capMl}ml 已同步【消化代谢模型】【五脏六腑模型】`;
        if (payload.fruit) extra += `；水果「${payload.fruit.name} ${payload.fruit.ate}」的果糖/热量已同步【消化代谢模型】`;
        this._flash(`🎉 打卡成功！今日第 ${arr.length} 次吃吃消（累计 ${Math.round(total * 100) / 100} 元）已同步【经济数据】${extra}`);
      } else if (cardId === 'privacyWash') {
        // v10.0 隐私洗：不适症状同步健康分析/五脏六腑模型
        this._flash(payload.clean
          ? '🎉 打卡成功！私处卫生到位，继续保持～'
          : `⚠️ 已记录不适症状（${payload.symptom}）——已同步【健康数据】健康分析与五脏六腑模型；若症状持续 2 天以上或加重，请及时到皮肤科/肛肠科就诊`);
      } else if (cardId === 'posture') {
        this._flash(payload.level === '未破姿'
          ? '🎉 打卡成功！今日姿态端正，继续保持～'
          : `🎉 已记录${payload.level}——跷二郎腿/驼背会影响体态，明日注意坐姿站姿`);
      } else if (linked) {
        this._flash(led ? `🎉 打卡成功！${linked}卡已自动完成（消费洗），${led}元花费已同步【数据中心 → 经济数据】` : `🎉 打卡成功！${linked}卡已自动完成（消费洗）`);
      } else if (led) {
        this._flash(`🎉 打卡成功！${led}元花费已同步【数据中心 → 经济数据】`);
      } else {
        this._flash('🎉 打卡成功！继续坚持～');
      }
    }
    // v11.0 消费↔挑战违约联动：戒X类目标当日记录到相关消费（如「戒奶茶计划」+ 吃吃消记录奶茶）→ 当日未达标
    try { if (this._pet99ViolationScan) this._pet99ViolationScan(dk, cardId, payload); } catch (e) {}
    this._closeModal();
    this.render_workbench();
    // v12.9.46 精力负荷共享：健身卡/学习卡打卡会改变今日负荷——失效缓存；主页在屏时即时刷新卡片
    try { if (this.load99Invalidate) this.load99Invalidate(); } catch (e) {}
    // 打卡成功动画：弹跳光晕 + 种子阳光生根发芽（v12.4，形式参照憾潮 fx）
    const card = document.getElementById('hb99-' + cardId);
    if (card) {
      card.classList.add('hb99-burst');
      setTimeout(() => card.classList.remove('hb99-burst'), 900);
      this._habit99GrowFx(card);
    }
  },
  // v12.4 打卡成功：种子 → 阳光 → 生根 → 发芽 → 小树苗（DOM 局部特效，3.8s 后自清理）
  _habit99GrowFx(card) {
    try {
      const fx = document.createElement('div');
      fx.className = 'hb99-grow';
      fx.innerHTML = '<i class="hb99-grow-sun"></i><i class="hb99-grow-beam"></i>' +
        '<i class="hb99-grow-seed"></i><span class="hb99-grow-roots"><i></i><i></i><i></i><i></i></span>' +
        '<i class="hb99-grow-stem"></i><i class="hb99-grow-leaf l"></i><i class="hb99-grow-leaf r"></i>' +
        '<i class="hb99-grow-tree">🌳</i>';
      card.appendChild(fx);
      setTimeout(() => fx.remove(), 3800);
    } catch (e) {}
  },
  // —— 卡片详情（单击查看）——
  habit99Detail(cardId) {
    const c = (CONFIG.habitCards || []).find(x => x.id === cardId);
    if (!c) return;
    const h = Store.getHabit99();
    const streak = this._hb99StreakOf(c);
    const rows = [];
    const dates = Object.keys(h.days).sort().reverse().slice(0, 14);
    dates.forEach(dk => {
      const card = (h.days[dk] || {})[cardId];
      if (!card) return;
      let txt = '';
      if (Array.isArray(card)) txt = card.map(x => {
        if (cardId === 'water') return `${x.amount}ml${x.makeup ? '（补）' : ''}`;
        if (cardId === 'poop') return `${x.form || '?'}${x.pain ? '·不适' : ''}${x.makeup ? '（补）' : ''}`;
        if (cardId === 'pee') return `${x.color || '?'}${x.makeup ? '（补）' : ''}`;
        if (cardId === 'mood') return `${x.type || '?'}${x.reason ? ' · ' + x.reason : ''}${x.makeup ? '（补）' : ''}`;
        if (cardId === 'trafficCost') return `${x.pay || '?'} ${x.amount || '?'}元${x.makeup ? '（补）' : ''}`; // v2026.0906 交通消（当日多次）
        if (cardId === 'focus') return `${x.type === 'meditate' ? '🧘冥想' : '🍅番茄钟'} ${x.durationMin || '?'}分钟${x.quitEarly ? '（中途退出）' : ''}${x.makeup ? '（补）' : ''}`; // v10.0 专注卡
        if (cardId === 'eatCost') { // v10.0 吃吃消（当日多次）
          const bits = [];
          if ((x.drinks || []).length) bits.push(`${x.drinks.join('/')}${x.sugarInfo ? ` ${x.sugarInfo.sugarLvl}${x.sugarInfo.drankMl}/${x.sugarInfo.capMl}ml` : ''}`);
          if ((x.kinds || []).includes('零食')) bits.push('零食');
          if (x.fruit) bits.push(`水果${x.fruit.name} ${x.fruit.ate}`);
          return `${bits.join(' + ') || (x.kinds || []).join('/')} · ${x.amount || '?'}元${x.makeup ? '（补）' : ''}`;
        }
        if (['lifeCost','livingCost','goodsCost','growthCost'].includes(cardId)) return `${x.pay || '?'} ${x.amount || '?'}元${x.makeup ? '（补）' : ''}`; // v2026.0906 新多次消费卡
        if (cardId === 'socialCost') return `${x.type || '?'}${x.meal ? ' · ' + x.meal : ''}${x.eatWay ? ' · ' + x.eatWay : ''} · ${x.amount || '?'}元${x.makeup ? '（补）' : ''}`; // v2026.0906 人情消（当日多次）
        return `${(x.ways || []).join('/')}${x.makeup ? '（补）' : ''}`;
      }).join('，');
      else if (cardId === 'goodMorning') txt = `起床 ${card.wake || '?'} · 质量 ${card.quality || '-'}★${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'goodNight') txt = `入睡 ${card.sleep || '?'} · 状态 ${card.quality || '-'}★${card.makeup ? '（补）' : ''}`;
      else if (['breakfast','lunch','dinner'].includes(cardId)) txt = `${card.time || '?'} · ${(card.foods || []).join('/') || '?'} · ${card.quality || '-'}★ · ${card.mealType || '?'}${card.host ? ` · 东家：${card.host}` : ''}${+card.cost > 0 ? ` · ${card.cost}元` : ''}${card.autoBy ? `（由${card.autoBy}自动打卡）` : ''}${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'noonNap') txt = `${card.start || '?'} → ${card.end || '未记录起床'} · ${card.quality || '-'}★${card.makeup ? '（补）' : ''}`;
      else if (['faceWashM','mouthWashM','faceWashE','mouthWashE','hairWash','footWash','bath'].includes(cardId)) txt = `${card.way || '?'}${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'fitness') txt = `${(card.parts || []).join('/')} · ${card.minutes || 0} 分钟${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'medicine') txt = `${(card.drugs || []).join('/') || '?'}${card.noAVReason ? ' · 未服抗病毒：' + card.noAVReason : ''}${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'zhengqi') txt = card.clean ? '未破气 ✅' : `${card.level || '破气'}${card.count ? ' ×' + card.count : ''}${card.time ? ' · ' + card.time : ''}${card.way ? ' · ' + card.way : ''}${card.reason ? ' · 理由：' + card.reason : ''}${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'zhengxin') txt = card.clean ? '未破心 ✅' : `${card.level || '破心'} · ${card.minutes || '?'} 分钟${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'zhenghun') txt = card.clean ? '未破魂 ✅' : (card.level === '小破魂' ? `小破魂（被动接收）${card.makeup ? '（补）' : ''}` : `${card.level || '破魂'} · ${card.act || '?'} · ${card.time || '?'}${card.makeup ? '（补）' : ''}`);
      else if (cardId === 'zhengyan') txt = card.clean ? '未破言 ✅' : `${card.level || '破言'} · ${(card.acts || []).join('/') || '?'}${card.time ? ' · ' + card.time : ''}${card.reason ? ' · 理由：' + card.reason : ''}${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'posture') txt = card.clean ? '未破姿 ✅' : `${card.level || '破姿'} · 理由：${card.reason || '?'}${card.makeup ? '（补）' : ''}`; // v2026.0906 正姿
      else if (cardId === 'privacyWash') txt = `${(card.parts || []).join('/') || '?'}${card.symptom && card.symptom !== '无' ? ` · ⚠${card.symptom}` : ' · 无不适 ✅'}${card.makeup ? '（补）' : ''}`; // v10.0 隐私洗
      else if (cardId === 'health') txt = card.status === '小病缠身'
        ? `小病缠身：${(card.symptoms || []).join('/') || '?'}${card.onsetDate ? ' · 始于 ' + card.onsetDate : ''}${card.makeup ? '（补）' : ''}`
        : card.status === '大病复查'
          ? `大病复查：${card.recheckDisease || '?'} · ${(card.recheckActs || []).join('/') || '?'}${card.recheckNote ? ' · ' + card.recheckNote : ''}${card.makeup ? '（补）' : ''}`
          : `感觉良好 ✅${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'steps') txt = `${(+card.count || 0).toLocaleString()} 步 · ${+card.count >= 6000 ? '达标 ✅' : '未达 6000 步'}${card.makeup ? '（补）' : ''}`;
      // v2026.0906 第 29-36 张新卡详情
      else if (cardId === 'fitnessMeal') txt = `补剂：${(card.items || []).join('/') || '?'}${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'nutriMeal') txt = `保健品：${(card.items || []).join('/') || '?'}${card.makeup ? '（补）' : ''}`;
      else if (['acneClean','toothClean','footSpa','earClean'].includes(cardId)) txt = `${card.pay || '?'} · ${card.amount || '?'}元${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'hairTrim') txt = `${(card.items || []).join('/') || '?'} · ${card.pay || '?'} · ${card.amount || '?'}元${card.makeup ? '（补）' : ''}`;
      else if (cardId === 'bodyScrub') txt = `${card.amount || '?'}元${card.makeup ? '（补）' : ''}`;
      // v2026.0906 第 37 张小卡详情：医疗消（金额 + 关联健康卡状态）
      else if (cardId === 'medCost') txt = `${card.amount || '?'}元${card.healthStatus ? ' · 关联：' + card.healthStatus : ''}${card.makeup ? '（补）' : ''}`;
      if (txt) rows.push(`<div class="hb99-row"><b>${dk}</b><span>${this.esc(txt)}</span></div>`);
    });
    this._modal({
      title: `${c.ico} ${c.name} · 详情`,
      body: `<div style="font-size:13px;line-height:1.9">
        ${cardId === 'zhengqi' ? `<div style="padding:8px 10px;border-radius:10px;background:#fef2f2;border:1.5px solid #fecaca;color:#b91c1c;font-weight:800;text-align:center;font-size:13px;margin-bottom:8px">⚠️ 绝对禁止进行性交性插入行为！</div>` : ''}
        ${cardId === 'zhengyan' ? `<div style="padding:8px 10px;border-radius:10px;background:#ecfdf5;border:1.5px solid #a7f3d0;color:#047857;font-weight:800;text-align:center;font-size:13px;margin-bottom:8px">🤐 事以密成，言以泄败——想做的事，在没做成之前，不要告诉别人！</div>` : ''}
        <div>⏰ 打卡窗口：<b>${c.win}</b> · ${c.noStreak ? `📒 消费记录卡 · 不计坚持天数` : (c.zheng ? `🛡️ 连续未破 <b>${streak}</b> 天（勾选「破」当日即归零）` : (c.id === 'fitness' ? `📅 本周 <b>${this._hb99FitnessWeekCount()}/${this._hb99FitNeed()}</b> 次 · 💪 连续达标 <b>${streak}</b> 周` : (c.id === 'water' ? `💧 今日 <b>${this._hb99WaterTotal()}</b>ml / 目标 <b>${this._hb99WaterGoal()}</b>ml · 🌳 连续达标 <b>${streak}</b> 天` : `🌳 连续 <b>${streak}</b> 天`)))}</div>
        <div style="color:var(--text-soft);font-size:12px">${this.esc(this._hb99DescForMe ? this._hb99DescForMe(c) : (c.desc || ''))}</div>
        <div style="margin-top:10px;font-weight:700">近 14 日记录</div>
        <div style="max-height:300px;overflow:auto">${rows.length ? rows.join('') : '<div class="empty">暂无记录</div>'}</div>
      </div>`,
      actions: [{ label: '关闭' }],
    });
  },
  // —— 补卡中心（仅昨日/今日）——
  habit99MakeupCenter() {
    const cards = CONFIG.habitCards || [];
    const today = this._habit99Now();
    const yk = (() => { const t = new Date(today + 'T00:00:00'); t.setDate(t.getDate()-1); return t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0'); })();
    const h = Store.getHabit99();
    let rows = '';
    const missOf = (dk) => cards.filter(c => {
      // v2026.0905 健身为周卡：无每日必打要求，不进入漏卡清单
      if (c.id === 'fitness') return false;
      // v2026.0906 心情/健康卡为不可补卡卡片（时间窗口+冷却/当日状态客观记录，补卡无意义）
      if (c.noMakeup) return false;
      // v2026.0906 消费记录卡（痘清洁/牙清洁/发修剪/搓澡洗/足洗户/耳采洗）：按实际消费打卡，非每日必做，不进入漏卡清单
      if (c.cost) return false;
      // v2026.0906 健身餐：当日健身卡已完成才算漏卡（未完成健身则本就未开放）
      if (c.id === 'fitnessMeal') return this._hb99FitnessTodayDone(dk);
      const card = (h.days[dk] || {})[c.id];
      // v2026.0905 喝水达标制：当日累计 ≥1300ml 才算完成
      if (c.id === 'water') {
        const total = Array.isArray(card) ? card.reduce((s, x) => s + (parseInt(x.amount, 10) || 0), 0) : 0;
        return total < this._hb99WaterGoal();
      }
      const done = Array.isArray(card) ? card.length > 0 : !!(card && (card.ts || card.makeup));
      return !done;
    });
    const missToday = missOf(today), missYk = missOf(yk);
    [ [today, '今日', missToday], [yk, '昨日', missYk] ].forEach(([dk, label, miss]) => {
      rows += `<div style="margin-top:10px;font-weight:700">${label}（${dk}）${miss.length ? '' : ' ✅ 全部完成'}</div>`;
      miss.forEach(c => {
        rows += `<button class="btn btn-sm btn-ghost" style="margin:3px" onclick="App.habit99OpenForm('${c.id}','${dk}')">${c.ico} ${this.esc(c.name)}</button>`;
      });
    });
    // v2026.0906 阿福智慧参谋入驻补卡中心：漏卡健康影响评估 + 补卡优先级建议
    const afuMakeup = this._afuMakeupAdvice(missYk, missToday);
    // v2026.0905 修复：补卡中心显示明确的历史补卡记录（此前 makeups 只写不读，补卡后无据可查）
    const allMk = Array.isArray(h.makeups) ? h.makeups : [];
    const mks = allMk.slice().reverse().slice(0, 12);
    let mkHtml = '';
    if (mks.length) {
      mkHtml = `<div style="margin-top:16px;font-weight:700">🗂️ 最近补卡记录（共 ${allMk.length} 条）</div>
      <div style="max-height:200px;overflow:auto;font-size:12.5px;line-height:1.9">
        ${mks.map(m => {
          const cd = cards.find(x => x.id === m.cardId) || {};
          const t = String(m.ts || '').replace('T', ' ').slice(0, 16);
          const refl = String(m.reflection || '');
          return `<div style="padding:6px 10px;margin-top:6px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
            <div><b>${this.esc(m.date || '')}</b> · ${cd.ico || '🎫'} ${this.esc(cd.name || m.cardId || '')} <span style="color:#94a3b8;font-size:11.5px">补于 ${this.esc(t)}</span></div>
            <div style="color:#b45309">漏卡原因：${this.esc(m.reason || '未填写')}</div>
            ${refl ? `<div style="color:#475569">反省：${this.esc(refl.length > 50 ? refl.slice(0, 50) + '…' : refl)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:6px;font-size:12px;color:var(--text-soft)">完整反省书见【习惯】→【反省数据】。</div>`;
    } else {
      mkHtml = `<div style="margin-top:16px;font-size:12px;color:var(--text-soft)">暂无补卡记录。补卡后会在这里留痕，完整反省书可在【习惯】→【反省数据】查看。</div>`;
    }
    this._modal({
      title: '🎫 补卡中心（仅限昨日 / 今日）',
      body: `<div style="font-size:13px;line-height:1.9;color:var(--text)">
        <div style="color:var(--text-soft);font-size:12px">补卡需填写漏卡原因 + 反省书；反省书会集中存入【习惯】→【反省数据】。</div>
        ${afuMakeup}
        ${rows}
        ${mkHtml}
      </div>`,
      actions: [{ label: '关闭' }],
    });
  },
  // v2026.0906 阿福智慧参谋 · 补卡中心：漏卡健康影响评估 + 补卡优先级（补卡中心专属洞察）
  _afuMakeupAdvice(missYk, missToday) {
    const all = [...new Map([...missYk, ...missToday].map(c => [c.id, c])).values()];
    // 卡片 → 器官影响映射（与健康数据器官建模同口径）
    const impact = {
      breakfast: ['胃', '缺早餐伤胃黏膜，胆汁淤积'], lunch: ['胃', '缺午餐伤胃，血糖波动'], dinner: ['胃', '缺晚餐营养供给中断'],
      water: ['肾', '饮水不达标，肾排毒受阻'], goodMorning: ['脑', '睡眠数据缺失，脑修复无法评估'], goodNight: ['脑', '缺晚安卡，睡眠时长无法入账'],
      noonNap: ['脑', '缺午觉记录，脑疲劳恢复未知'], medicine: ['免疫', '服药未打卡，慢性病管理断档风险'],
      poop: ['肠', '缺排便记录，肠道毒素滞留未知'], pee: ['肾', '缺小便记录，水液代谢未知'],
      studyMorning: [], studyNoon: [], studyEvening: [],
      zhengqi: ['肾', '正气未记录，肾精管理断档'], zhengxin: [], zhenghun: ['肺', '正魂未记录，烟酒暴露未知'], zhengyan: [],
      faceWashM: [], mouthWashM: [], faceWashE: [], mouthWashE: [], hairWash: [], footWash: [], bath: [],
      steps: ['心', '缺步数记录，心肺活动量无法入账'],
    };
    const hits = all.map(c => ({ c, organ: (impact[c.id] || [])[0] || '' })).filter(x => x.organ);
    const organCnt = {};
    hits.forEach(x => { organCnt[x.organ] = (organCnt[x.organ] || 0) + 1; });
    const worst = Object.entries(organCnt).sort((a, b) => b[1] - a[1])[0];
    // 优先级：medicine > water > 三餐 > 睡眠 > 其他
    const prio = { medicine: 0, water: 1, breakfast: 2, lunch: 3, dinner: 4, goodMorning: 5, goodNight: 6 };
    const top = all.filter(c => prio[c.id] !== undefined).sort((a, b) => prio[a.id] - prio[b.id]).slice(0, 3);
    let body = '';
    if (!missYk.length && !missToday.length) {
      body = `<div style="font-size:12.5px;color:#15803d;line-height:1.8">✅ 昨日与今日卡片全部完成，没有需要补的卡。阿福提醒：补卡是兜底不是惯例——连续全勤的健康建模才最准确，去【健康数据】看您的器官趋势吧。</div>`;
    } else {
      body = `<div style="font-size:12.5px;line-height:1.8">
        <div>📉 <b>漏卡健康影响</b>：${hits.length ? `共 ${all.length} 张卡待补，波及 <b>${Object.keys(organCnt).map(o => organCnt[o] + ' 张打' + o).join('、')}</b>${worst ? `——其中<b>${worst[0]}</b>受影响最大。` : ''}` : `共 ${all.length} 张卡待补（多为记录型卡片，暂未触及器官建模，如实补上即可）。`}</div>
        ${top.length ? `<div style="margin-top:4px">🎯 <b>补卡优先级</b>：${top.map(c => c.ico + c.name).join(' → ')}——药不能断、水要跟上、三餐规律，先补影响健康的硬卡。</div>` : ''}
        <div style="margin-top:4px">${this._afu99AvatarHtml(17, 'pxafu-inline')}阿福提醒：补卡数据会进入当日结算与器官建模，请<b>如实补录</b>（漏了就写漏了，别编数据）——虚假的满分只会让健康分析失真。</div>
      </div>`;
    }
    return `<div style="margin-top:12px;padding:12px;border-radius:12px;background:#f0f9ff;border:1.5px solid #bae6fd">
      <div style="font-weight:800;color:#0369a1;font-size:13px">${this._afu99AvatarHtml(18, 'pxafu-inline')}管家阿福 · 智慧参谋</div>
      ${body}
    </div>`;
  },
  // ====== v3.3 数据中心（近 7 日 · 任意习惯卡片 × 任意指标 × 折线/柱状/热力图）======
  _dc99: { card: '_summary', metric: 'nightH', chart: 'line', range: 7 },
// v3.3：入口保留，跳转数据中心专页
  // 北京日期偏移（与打卡同口径，避免跨时区下数据中心/健康数据日期错位）
  _hb99DkOff(off) {
    const d = Store.beijingDate();
    d.setDate(d.getDate() + (off || 0));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  // 指标定义：每张卡可看的单一数据（get(day, dk, summary) → number|null）
  _hb99MetricDefs() {
    const min = (t) => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); if (isNaN(h)) return null; return h * 60 + (m || 0); };
    const mealDone = (k) => (day) => (day[k] && (day[k].ts || day[k].time || day[k].foods)) ? 1 : 0;
    const mealQ = (k) => (day) => day[k] ? (+day[k].quality || 0) : null;
    const washDone = (k) => (day) => (day[k] && (day[k].ts || day[k].way)) ? 1 : 0;
    const zheng = (k) => (day) => { const c = day[k]; if (!c) return null; if (c.clean === true) return 2; if ((c.level || '').startsWith('小破')) return 1; return 0; }; // 2未破/1小破/0大破
    const zhengClean = (k) => (day) => { const c = day[k]; return c ? (c.clean === true ? 1 : 0) : null; };
    const studyMin = (k) => (day) => { const arr = day[k] || []; const v = arr.filter(x => x.durationMin).reduce((a, x) => a + (+x.durationMin || 0), 0); return arr.length ? v : null; };
    const studyCnt = (k) => (day) => { const arr = day[k] || []; return arr.length ? arr.length : null; };
    // v11.2 数据中心补全：v2026.0906/v10.0 新卡指标定义（消费类卡当日一条/多条流水两种口径）
    const costOnce = (k, label) => [
      { key: 'done', name: `是否消费(${label})`, unit: '', kind: 'bool', get: (day) => day[k] ? 1 : 0 },
      { key: 'amount', name: `${label}金额`, unit: '元', kind: 'num', get: (day) => day[k] && +day[k].amount > 0 ? Math.round(+day[k].amount * 100) / 100 : null },
    ];
    const costMulti = (k, label) => [
      { key: 'cnt', name: `${label}次数`, unit: '次', kind: 'num', get: (day) => (Array.isArray(day[k]) ? day[k].length : 0) || null },
      { key: 'total', name: `${label}合计`, unit: '元', kind: 'num', get: (day) => { const arr = Array.isArray(day[k]) ? day[k] : []; const v = arr.reduce((a, x) => a + (+x.amount || 0), 0); return arr.length ? Math.round(v * 100) / 100 : null; } },
    ];
    return {
      _summary: [
        { key: 'nightH', name: '夜间睡眠时长', unit: 'h', kind: 'num', get: (day, dk, s) => s.nightH || null },
        { key: 'napMin', name: '午睡时长', unit: 'min', kind: 'num', get: (day, dk, s) => s.napMin || null },
        { key: 'meals', name: '吃饭顿数', unit: '顿', kind: 'num', get: (day, dk, s) => s.meals || null },
        { key: 'waterMl', name: '饮水量', unit: 'ml', kind: 'num', get: (day, dk, s) => s.waterMl || null },
        { key: 'poopCnt', name: '大便次数', unit: '次', kind: 'num', get: (day, dk, s) => s.poopCnt || null },
        { key: 'peeCnt', name: '小便次数', unit: '次', kind: 'num', get: (day, dk, s) => s.peeCnt || null },
        { key: 'studyMin', name: '学习时长', unit: 'min', kind: 'num', get: (day, dk, s) => s.studyMin || null },
        { key: 'sportMin', name: '运动时长', unit: 'min', kind: 'num', get: (day, dk, s) => s.sportMin || null },
        { key: 'wakeMin', name: '起床时刻', unit: '', kind: 'time', get: (day, dk, s) => s.wakeMin || null },
        { key: 'sleepAtMin', name: '入睡时刻', unit: '', kind: 'time', get: (day, dk, s) => s.sleepAtMin || null },
        { key: 'sleepQuality', name: '昨晚睡眠质量', unit: '星', kind: 'num', get: (day, dk, s) => s.sleepQuality || null },
        { key: 'dayQuality', name: '当日总状态', unit: '星', kind: 'num', get: (day, dk, s) => s.dayQuality || null },
        // v2026.0906 新卡：心情 / 健康 / 步数 / 三餐花费
        { key: 'moodCnt', name: '心情记录次数', unit: '次', kind: 'num', get: (day, dk, s) => s.moodCnt || null },
        { key: 'moodNeg', name: '负面心情次数', unit: '次', kind: 'num', get: (day, dk, s) => s.moodCnt ? (s.moodNeg || 0) : null },
        { key: 'healthSick', name: '是否小病缠身', unit: '', kind: 'bool', get: (day, dk, s) => s.healthStatus ? (s.healthSick ? 1 : 0) : null },
        { key: 'stepsCount', name: '步数', unit: '步', kind: 'num', get: (day, dk, s) => s.stepsDone && s.stepsCount > 0 ? s.stepsCount : null },
        { key: 'stepsGoal', name: '步数达标(6000步)', unit: '', kind: 'bool', get: (day, dk, s) => s.stepsDone && s.stepsCount > 0 ? (s.stepsCount >= 6000 ? 1 : 0) : null },
        { key: 'mealCost', name: '三餐外食花费', unit: '元', kind: 'num', get: (day, dk, s) => s.mealCost > 0 ? s.mealCost : null },
        { key: 'mealOutCnt', name: '外食顿数(外卖/堂食)', unit: '顿', kind: 'num', get: (day, dk, s) => s.mealOutCnt || null },
      ],
      _afu: (() => {
        // 阿福健康指数 + 九器官分值（与健康数据同口径；无打卡数据的日期返回 null，不参与折线）
        const A = this;
        const chronic = (() => { const mr = (Store.load().medicalRecords || []); return mr.some(r => (r.tags || []).includes('hiv') || (r.tags || []).includes('tp') || r.disease === 'hiv' || r.disease === 'tp'); })();
        const noData = (day) => !day || !Object.keys(day).length;
        const organ = (id, name) => ({ key: id, name, unit: '分', kind: 'num', get: (day, dk, s) => { if (noData(day)) return null; const o = A._afuOrganModel(s, chronic).find(x => x.id === id); return o ? o.score : null; } });
        return [
          { key: 'idx', name: '阿福健康指数', unit: '分', kind: 'num', get: (day, dk, s) => noData(day) ? null : A._afuHealthIndex(s, chronic).score },
          organ('brain', '🧠 脑'), organ('heart', '❤️ 心'), organ('lung', '🌬️ 肺'), organ('liver', '🍶 肝'),
          organ('stomach', '🍽 胃'), organ('spleen', '🟡 脾'), organ('kidney', '💧 肾'), organ('gut', '🌀 肠'), organ('immune', '🛡️ 免疫'),
        ];
      })(),
      goodMorning: [
        { key: 'wake', name: '起床时刻', unit: '', kind: 'time', get: (day) => day.goodMorning ? min(day.goodMorning.wake) : null },
        { key: 'quality', name: '昨晚睡眠质量', unit: '星', kind: 'num', get: (day) => day.goodMorning ? (+day.goodMorning.quality || 0) : null },
      ],
      breakfast: [
        { key: 'done', name: '是否完成', unit: '', kind: 'bool', get: mealDone('breakfast') },
        { key: 'quality', name: '早餐质量', unit: '星', kind: 'num', get: mealQ('breakfast') },
        { key: 'out', name: '是否外食(外卖/堂食)', unit: '', kind: 'bool', get: (day) => day.breakfast && (day.breakfast.mealType === '外卖' || day.breakfast.mealType === '堂食') ? 1 : (day.breakfast ? 0 : null) },
        { key: 'cost', name: '早餐花费', unit: '元', kind: 'num', get: (day) => day.breakfast && +day.breakfast.cost > 0 ? Math.round(+day.breakfast.cost * 100) / 100 : null },
      ],
      lunch: [
        { key: 'done', name: '是否完成', unit: '', kind: 'bool', get: mealDone('lunch') },
        { key: 'quality', name: '午餐质量', unit: '星', kind: 'num', get: mealQ('lunch') },
        { key: 'out', name: '是否外食(外卖/堂食)', unit: '', kind: 'bool', get: (day) => day.lunch && (day.lunch.mealType === '外卖' || day.lunch.mealType === '堂食') ? 1 : (day.lunch ? 0 : null) },
        { key: 'cost', name: '午餐花费', unit: '元', kind: 'num', get: (day) => day.lunch && +day.lunch.cost > 0 ? Math.round(+day.lunch.cost * 100) / 100 : null },
      ],
      dinner: [
        { key: 'done', name: '是否完成', unit: '', kind: 'bool', get: mealDone('dinner') },
        { key: 'quality', name: '晚餐质量', unit: '星', kind: 'num', get: mealQ('dinner') },
        { key: 'out', name: '是否外食(外卖/堂食)', unit: '', kind: 'bool', get: (day) => day.dinner && (day.dinner.mealType === '外卖' || day.dinner.mealType === '堂食') ? 1 : (day.dinner ? 0 : null) },
        { key: 'cost', name: '晚餐花费', unit: '元', kind: 'num', get: (day) => day.dinner && +day.dinner.cost > 0 ? Math.round(+day.dinner.cost * 100) / 100 : null },
      ],
      steps: [
        { key: 'count', name: '步数', unit: '步', kind: 'num', get: (day) => day.steps && +day.steps.count >= 0 ? +day.steps.count : null },
        { key: 'goal', name: '是否达标(6000步)', unit: '', kind: 'bool', get: (day) => day.steps ? (+day.steps.count >= 6000 ? 1 : 0) : null },
      ],
      noonNap: [
        { key: 'min', name: '午睡时长', unit: 'min', kind: 'num', get: (day) => { const n = day.noonNap; if (!n || !n.start || !n.end) return n ? 0 : null; const a = min(n.start), b = min(n.end); if (a == null || b == null) return null; return b <= a ? b + 1440 - a : b - a; } },
        { key: 'quality', name: '午睡质量', unit: '星', kind: 'num', get: (day) => day.noonNap ? (+day.noonNap.quality || 0) : null },
      ],
      goodNight: [
        { key: 'sleep', name: '入睡时刻', unit: '', kind: 'time', get: (day) => day.goodNight ? min(day.goodNight.sleep) : null },
        { key: 'quality', name: '今日总状态', unit: '星', kind: 'num', get: (day) => day.goodNight ? (+day.goodNight.quality || 0) : null },
      ],
      water: [
        { key: 'ml', name: '饮水量', unit: 'ml', kind: 'num', get: (day) => { const arr = day.water || []; return arr.length ? arr.reduce((s, x) => s + (+x.amount || 0), 0) : null; } },
        { key: 'cnt', name: '记录次数', unit: '次', kind: 'num', get: (day) => (day.water || []).length || null },
        { key: 'goal', name: '是否达标(1300ml)', unit: '', kind: 'bool', get: (day) => { const arr = day.water || []; return arr.length ? (arr.reduce((s, x) => s + (+x.amount || 0), 0) >= 1300 ? 1 : 0) : null; } },
      ],
      poop: [{ key: 'cnt', name: '大便次数', unit: '次', kind: 'num', get: (day) => (day.poop || []).length || null }],
      pee: [{ key: 'cnt', name: '小便次数', unit: '次', kind: 'num', get: (day) => (day.pee || []).length || null }],
      fitness: [
        { key: 'done', name: '是否训练', unit: '', kind: 'bool', get: (day) => day.fitness ? 1 : 0 },
        { key: 'min', name: '训练时长', unit: 'min', kind: 'num', get: (day) => day.fitness ? (+day.fitness.minutes || 0) : null },
      ],
      medicine: [
        { key: 'done', name: '是否服药打卡', unit: '', kind: 'bool', get: (day) => day.medicine ? 1 : 0 },
      ],
      studyMorning: [
        { key: 'min', name: '晨间学习时长', unit: 'min', kind: 'num', get: studyMin('studyMorning') },
        { key: 'cnt', name: '打卡次数', unit: '次', kind: 'num', get: studyCnt('studyMorning') },
      ],
      studyNoon: [
        { key: 'min', name: '午间学习时长', unit: 'min', kind: 'num', get: studyMin('studyNoon') },
        { key: 'cnt', name: '打卡次数', unit: '次', kind: 'num', get: studyCnt('studyNoon') },
      ],
      studyEvening: [
        { key: 'min', name: '晚间学习时长', unit: 'min', kind: 'num', get: studyMin('studyEvening') },
        { key: 'cnt', name: '打卡次数', unit: '次', kind: 'num', get: studyCnt('studyEvening') },
      ],
      zhengqi: [
        { key: 'lv', name: '正气状态(2未破/1小破/0大破)', unit: '', kind: 'lv', get: zheng('zhengqi') },
        { key: 'clean', name: '是否未破气', unit: '', kind: 'bool', get: zhengClean('zhengqi') },
      ],
      zhengxin: [
        { key: 'lv', name: '正心状态(2未破/1小破/0大破)', unit: '', kind: 'lv', get: zheng('zhengxin') },
        { key: 'clean', name: '是否未破心', unit: '', kind: 'bool', get: zhengClean('zhengxin') },
      ],
      zhenghun: [
        { key: 'lv', name: '正魂状态(2未破/1小破/0大破)', unit: '', kind: 'lv', get: zheng('zhenghun') },
        { key: 'clean', name: '是否未破魂', unit: '', kind: 'bool', get: zhengClean('zhenghun') },
      ],
      zhengyan: [
        { key: 'lv', name: '正言状态(2未破/1小破/0大破)', unit: '', kind: 'lv', get: zheng('zhengyan') },
        { key: 'clean', name: '是否未破言', unit: '', kind: 'bool', get: zhengClean('zhengyan') },
      ],
      mood: [
        { key: 'cnt', name: '心情记录次数', unit: '次', kind: 'num', get: (day, dk, s) => s.moodCnt || null },
        { key: 'neg', name: '负面心情次数(焦虑/悲伤/愤怒/疲惫)', unit: '次', kind: 'num', get: (day, dk, s) => s.moodCnt ? (s.moodNeg || 0) : null },
      ],
      health: [
        { key: 'done', name: '是否记录', unit: '', kind: 'bool', get: (day) => day.health ? 1 : 0 },
        { key: 'sick', name: '是否小病缠身', unit: '', kind: 'bool', get: (day, dk, s) => s.healthStatus ? (s.healthSick ? 1 : 0) : null },
      ],
      faceWashM: [{ key: 'done', name: '是否洁面(晨)', unit: '', kind: 'bool', get: washDone('faceWashM') }],
      mouthWashM: [{ key: 'done', name: '是否漱口(晨)', unit: '', kind: 'bool', get: washDone('mouthWashM') }],
      faceWashE: [{ key: 'done', name: '是否洁面(晚)', unit: '', kind: 'bool', get: washDone('faceWashE') }],
      mouthWashE: [{ key: 'done', name: '是否漱口(晚)', unit: '', kind: 'bool', get: washDone('mouthWashE') }],
      hairWash: [{ key: 'done', name: '是否洗头', unit: '', kind: 'bool', get: washDone('hairWash') }],
      footWash: [{ key: 'done', name: '是否洗脚', unit: '', kind: 'bool', get: washDone('footWash') }],
      bath: [{ key: 'done', name: '是否洗澡', unit: '', kind: 'bool', get: washDone('bath') }],
      // ===== v11.2 数据中心补全：v2026.0906/v10.0 新增 19 张卡（此前选卡后无指标可看） =====
      fitnessMeal: [
        { key: 'done', name: '是否打卡(健身餐)', unit: '', kind: 'bool', get: (day) => day.fitnessMeal ? 1 : 0 },
        { key: 'cnt', name: '补剂种数', unit: '种', kind: 'num', get: (day) => day.fitnessMeal ? (day.fitnessMeal.items || []).length : null },
      ],
      nutriMeal: [
        { key: 'done', name: '是否打卡(营养餐)', unit: '', kind: 'bool', get: (day) => day.nutriMeal ? 1 : 0 },
        { key: 'cnt', name: '保健品种数', unit: '种', kind: 'num', get: (day) => day.nutriMeal ? (day.nutriMeal.items || []).length : null },
      ],
      focus: [
        { key: 'cnt', name: '专注次数', unit: '次', kind: 'num', get: (day) => (day.focus || []).length || null },
        { key: 'min', name: '专注总时长', unit: 'min', kind: 'num', get: (day) => { const arr = day.focus || []; const v = arr.reduce((a, x) => a + (+x.durationMin || 0), 0); return arr.length ? v : null; } },
      ],
      privacyWash: [
        { key: 'done', name: '是否清洗(隐私洗)', unit: '', kind: 'bool', get: (day) => day.privacyWash ? 1 : 0 },
        { key: 'ok', name: '有无不适症状', unit: '', kind: 'bool', get: (day) => day.privacyWash ? (day.privacyWash.symptom === '无' ? 1 : 0) : null },
      ],
      posture: [
        { key: 'lv', name: '姿态状态(2未破/1小破/0大破)', unit: '', kind: 'lv', get: zheng('posture') },
        { key: 'clean', name: '是否未破姿', unit: '', kind: 'bool', get: zhengClean('posture') },
      ],
      acneClean: costOnce('acneClean', '痘清洁'),
      toothClean: costOnce('toothClean', '牙清洁'),
      bodyScrub: costOnce('bodyScrub', '搓澡洗'),
      footSpa: costOnce('footSpa', '足洗户'),
      earClean: costOnce('earClean', '耳采洗'),
      medCost: costOnce('medCost', '医疗消'),
      hairTrim: [
        { key: 'done', name: '是否消费(发修剪)', unit: '', kind: 'bool', get: (day) => day.hairTrim ? 1 : 0 },
        { key: 'cnt', name: '项目数', unit: '项', kind: 'num', get: (day) => day.hairTrim ? (day.hairTrim.items || []).length : null },
        { key: 'amount', name: '发修剪金额', unit: '元', kind: 'num', get: (day) => day.hairTrim && +day.hairTrim.amount > 0 ? Math.round(+day.hairTrim.amount * 100) / 100 : null },
      ],
      eatCost: [
        { key: 'cnt', name: '吃吃消次数', unit: '次', kind: 'num', get: (day) => (day.eatCost || []).length || null },
        { key: 'total', name: '吃吃消合计', unit: '元', kind: 'num', get: (day, dk, s) => s.eatCostTotal > 0 ? Math.round(s.eatCostTotal * 100) / 100 : null },
        { key: 'sugar', name: '饮品糖分摄入', unit: 'g', kind: 'num', get: (day, dk, s) => s.eatCostSugarG > 0 ? Math.round(s.eatCostSugarG * 10) / 10 : null },
        { key: 'fruit', name: '水果记录次数', unit: '次', kind: 'num', get: (day, dk, s) => (s.eatCostFruit || []).length || null },
      ],
      trafficCost: costMulti('trafficCost', '交通消'),
      lifeCost: costMulti('lifeCost', '生活消'),
      livingCost: costMulti('livingCost', '居住消'),
      socialCost: costMulti('socialCost', '人情消'),
      goodsCost: costMulti('goodsCost', '用品消'),
      growthCost: costMulti('growthCost', '培养消'),
    };
  },
  _dc99Set(k, v) {
    if (k === 'chart' && v === 'bar' && this._dc99 && this._dc99.range > 30) return; // 柱状图仅 30 日内可用
    if (k === 'tab') this._navPush(); // v12.9：数据中心子库切换入历史栈（返回上一页可回上一个库）
    this._dc99[k] = v;
    // v12.9 修复：重进运动数据总是从主界面开始（上次停留在分析站/教学站不再残留）
    if (k === 'tab' && v === 'sport99' && this._sp99) this._sp99.view = 'home';
    // v12.9 学习数据：同样重进从主界面开始
    if (k === 'tab' && v === 'study99' && this._st99) this._st99.view = 'home';
    if (k === 'card') { const ms = (this._hb99MetricDefs()[v] || []); this._dc99.metric = ms.length ? ms[0].key : ''; }
    this.render_workbench();
  },
  // 值格式化（time/num/bool/lv）
  _dc99Fmt(v, m) {
    if (v === null || v === undefined) return '—';
    if (m.kind === 'time') { const h = Math.floor(v / 60), mm = v % 60; return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
    if (m.kind === 'bool') return v === 1 ? '✓ 完成' : (v === 0 ? '✗ 未' : '—');
    if (m.kind === 'lv') return v === 2 ? '未破' : (v === 1 ? '小破' : (v === 0 ? '大破' : '—'));
    return v + (m.unit || '');
  },
  // 热力图颜色：bool(绿/灰) · lv(绿/黄/红) · num(浅绿→深绿) · time(浅绿→深绿)
  _dc99HeatColor(v, m, minV, maxV) {
    if (v === null || v === undefined) return '#e2e8f0';
    if (m.kind === 'bool') return v === 1 ? '#22c55e' : '#f87171';
    if (m.kind === 'lv') return v === 2 ? '#22c55e' : (v === 1 ? '#facc15' : '#ef4444');
    const r = (maxV > minV) ? (v - minV) / (maxV - minV) : 1;
    const t = Math.max(0, Math.min(1, r));
    return `rgba(34,197,94,${(0.25 + t * 0.75).toFixed(2)})`;
  },
  // v12.9.31 【共享中枢】卡片已按用户指令删除（Store.hub / Store.bus 引擎仍保留供跨域统计复用，
  // 仅删除数据中心底部的可视化展示卡 _dc99HubCard）

  _wbDataCenter99(wb, W) {
    if (!this._dc99) this._dc99 = { card: '_summary', metric: 'nightH', chart: 'line', range: 7, tab: 'home' };
    const st = this._dc99;
    // v6.9 数据中心三库整合：点击【数据中心】出现九张卡，再点卡进入对应库（各库返回键统一为「返回上一页」）
    // v12.9.11 三大迁移：健康数据→【健康数据】(health99) · 报告数据→【报告数据】(report99) · 反省数据→【反省数据】(reflect99)
    const tab = st.tab || 'home';
    if (tab === 'ledger') return this._wbLedger(wb, W);
    if (tab === 'illness') return this._wbIllness99(wb, W);
    // v12.9.51 主人档案重做：头像 Hero + 信息行点按编辑 + 成就勋章墙 ×20（档案保存后运势/BMI/穿搭自动联动）
    if (tab === 'profile') {
      return `<div class="card" style="margin-bottom:14px">
          <div class="card-title"><span class="ico">🧾</span>主人档案
            <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">信息 · 身体数据 · 成就勋章（点按编辑）</span>
            <button class="btn btn-ghost btn-sm p99-title-btn" onclick="App.navBack()">← 返回上一页</button>
          </div>
        </div>`
        + this.renderProfileCard()
        + this._wbMeBmiCard()
        + `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    }
    // v12.9 运动数据：分析站（数据/图表/日历）+ 教学站（动作库 · 动画演示）（86-sport99.js）
    if (tab === 'sport99') return this._wbSport99(wb, W);
    // v12.9 学习数据：记录站（知识点/图表/日历）+ 练习站（练习记录 · 正确率）（87-study99.js）
    if (tab === 'study99') return this._wbStudy99(wb, W);
    // v12.9.11 健康数据（原「健康数据」dailylog99 迁入 · 55-insight.js）
    if (tab === 'health99') return this._wbDailyLog99(wb, W);
    // v12.9.11 报告数据（原「报告数据」report99 迁入 · 56-report.js）
    if (tab === 'report99') return this._wbReport99(wb, W);
    // v12.9.11 反省数据（原「反省数据」reflect99 迁入）
    if (tab === 'reflect99') return this._wbReflect99(wb, W);
    // v12.9.40 戒断数据（四魔封印 · 反向打卡 · 93-quit99.js）
    if (tab === 'quit99') return this._wbQuit99(wb, W);
    // v12.9.46 应用数据（各 App 今日使用时长 · 95-native99.js）
    if (tab === 'apps99') return this._wbApps99(wb, W);
    // v12.9.50 经期数据（女生专属 · 108-period99.js）：档案性别=女 才解锁（页内对男生显示锁定卡）
    if (tab === 'period99') return this._wbPeriod99(wb, W);
    if (tab === 'home') {
      const female = this._period99Female && this._period99Female();
      const dc99Cards = [
        { tab: 'habit',    ico: '📊', n: '习惯数据', d: '全部习惯的全数据检索 · 卡片 × 指标 × 图表 · 近 7/30/90 日' },
        { tab: 'ledger',   ico: '💰', n: '经济数据', d: '三泡泡轻氧主页 · 记账（50/30/20）· 用多久 · 多久吃' },
        { tab: 'illness',  ico: '🩺', n: '就医数据', d: '感染科 / 急诊科 / 体检建议 · 病例记录 · 健康卡症状自动同步' },
        { tab: 'sport99',  ico: '🏃', n: '运动数据', d: '分析站 · 教学站 · 体测/围度/图表/日历 · 动作动画教学（v12.9 新增）' },
        { tab: 'study99',  ico: '🎓', n: '学习数据', d: '记录站 · 练习站 · 知识树·图表·日历 · 练习正确率（v12.9 新增）' },
        { tab: 'health99', ico: '🍜', n: '饮食数据', d: '今天吃什么盲盒 · 每日习惯结算 · 健康指数 · 五脏六腑/消化代谢模型（v12.9.46 更名并新增盲盒）' },
        { tab: 'report99', ico: '📰', n: '报告数据', d: '每日图文总结报告 · 历史归档 · 导出 PNG（原「报告数据」）' },
        { tab: 'reflect99',ico: '🪞', n: '反省数据', d: '补卡留痕 · 反省书集中存放（原「反省数据」）' },
        { tab: 'profile',  ico: '🧾', n: '主人档案', d: '生日 / MBTI / 身高体重 / 八字运势 · BMI 科学建议（v11.8 自「空间」迁入）' },
        { tab: 'quit99',   ico: '👹', n: '戒断数据', d: '四魔封印 · 反向打卡 · 活性/封印/对决/周结算（v12.9.40 新增）' },
        { tab: 'apps99',   ico: '📱', n: '应用数据', d: '各 App 今日使用时长 · 抖音/B站/微博…娱乐标红（v12.9.46 新增）' },
        ...(female ? [{ tab: 'period99', ico: '🌷', n: '经期数据', d: '女生专属 · 周期月历 · 经期/排卵预测 · 症状统计（v12.9.50 新增）' }] : []),
      ];
      return `<div class="card" style="margin-bottom:14px">
        <div class="card-title"><span class="ico">📊</span>数据中心 · ${female ? '十二' : '十一'}库一屏
          <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">习惯 / 经济 / 就医 / 运动 / 学习 / 饮食 / 报告 / 反省 / 档案 / 戒断 / 应用${female ? ' / 经期' : ''}</span>
        </div>
        <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">打卡数据的去向在这里汇总：【习惯数据】检索全部习惯的历史打卡，【经济数据】承接所有消费入账，【就医数据】承接健康卡同步的急诊科记录与【体检建议】，【运动数据】为体测分析与动作教学，【学习数据】为知识树与练习记录；v12.9.11 起【健康数据】（原健康数据）、【报告数据】（原报告数据）、【反省数据】（原反省数据）也迁入本中心；【主人档案】为个人信息与 BMI 建议；v12.9.40 起【戒断数据】反向记录四魔物活性（破戒喂养 · 未破饿瘪）。${female ? '【经期数据】为女生专属的周期管理库（月历记录 · 周期预测 · 排卵窗口 · 症状统计）。' : ''}</div>
      </div>
      <div class="wb-entry-grid">
        ${dc99Cards.map(x => `
          <div class="card wb-entry-card${x.tab === 'sport99' ? ' dc99-sport-card' : ''}" onclick="App._dc99Set('tab','${x.tab}')">
            <div class="wb-ico">${x.ico}</div>
            <div class="wb-name">${this.esc(x.n)}</div>
            <div class="wb-hint">${this.esc(x.d)}</div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    }
    // tab === 'habit'：原数据中心正文（近 N 日习惯数据检索）
    if (![7, 30, 90].includes(st.range)) st.range = 7;
    const defs = this._hb99MetricDefs();
    const cards = [{ id: '_summary', ico: '📊', name: '综合·日结' }, { id: '_afu', ico: '🧑‍⚕️', name: '阿福·健康' }, ...(CONFIG.habitCards || [])];
    const metrics = defs[st.card] || [];
    if (!metrics.find(m => m.key === st.metric)) st.metric = metrics.length ? metrics[0].key : '';
    const metric = metrics.find(m => m.key === st.metric);
    // 近 N 日数据（北京日期口径，与打卡一致；habit99 只加载一次，批量计算摘要避免逐日重复解析整库存档）
    const N = st.range;
    const h99 = Store.getHabit99();
    const days = [];
    for (let i = N - 1; i >= 0; i--) {
      const dk = this._hb99DkOff(-i);
      const t = Store.beijingDate(); t.setDate(t.getDate() - i);
      const wk = ['日','一','二','三','四','五','六'][t.getDay()];
      days.push({ dk, label: `${t.getMonth()+1}/${t.getDate()}`, wk, day: ((h99.days || {})[dk]) || {}, s: Store._habit99SummaryOf(h99, dk) });
    }
    const vals = days.map(d => metric ? metric.get(d.day, d.dk, d.s) : null);
    const nums = vals.filter(v => v !== null && v !== undefined && !isNaN(v));
    const minV = nums.length ? Math.min(...nums) : 0;
    const maxV = nums.length ? Math.max(...nums) : 0;
    const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
    const doneCnt = metric && (metric.kind === 'bool') ? vals.filter(v => v === 1).length
      : metric && metric.kind === 'lv' ? vals.filter(v => v === 2).length : 0;
    // —— SVG 图表（340×170）——
    const CW = 340, CH = 178, pad = 30;
    let chartSvg = '';
    const yMin = metric && metric.kind === 'time' ? 0 : Math.min(0, minV);
    const yMax = Math.max(1, maxV + (maxV === minV ? 1 : 0));
    const xOf = (i) => pad + i * (CW - pad * 2) / (N - 1 || 1);
    const labelEvery = N <= 7 ? 1 : N <= 30 ? 5 : 10;   // x 轴标签抽样（长跨度防拥挤）
    const showPtVal = N <= 14;                           // 数据点数值标签只在短跨度显示
    const effChart = (st.chart === 'bar' && N > 30) ? 'line' : st.chart; // 柱状图仅 30 日内可用，超出自动回退折线
    const yOf = (v) => CH - pad - ((v - yMin) / (yMax - yMin || 1)) * (CH - pad * 2);
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((r) => {
      const y = CH - pad - r * (CH - pad * 2);
      const gv = yMin + r * (yMax - yMin);
      const gt = metric && metric.kind === 'time' ? this._dc99Fmt(Math.round(gv), metric) : Math.round(gv * 10) / 10;
      return `<line x1="${pad}" y1="${y.toFixed(1)}" x2="${CW - pad / 2}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/><text x="${pad - 4}" y="${(y + 3).toFixed(1)}" font-size="8" text-anchor="end" fill="#94a3b8">${gt}</text>`;
    }).join('');
    const xLabels = days.map((d, i) => (i % labelEvery === 0 || i === days.length - 1) ? `<text x="${xOf(i).toFixed(1)}" y="${CH - pad + 12}" font-size="8.5" text-anchor="middle" fill="#64748b">${d.label}</text>` : '').join('');
    if (metric && effChart === 'line') {
      const pts = vals.map((v, i) => v === null ? null : [xOf(i), yOf(v)]);
      const segs = []; let cur = [];
      pts.forEach(p => { if (p) cur.push(p); else { if (cur.length) segs.push(cur); cur = []; } });
      if (cur.length) segs.push(cur);
      const paths = segs.map(seg => seg.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')).join(' ');
      const r = N > 14 ? 2.2 : 3.2;
      chartSvg = `<svg viewBox="0 0 ${CW} ${CH}" style="width:100%;background:#f8fafc;border-radius:12px">${gridLines}${xLabels}
        <path d="${paths}" fill="none" stroke="#6366f1" stroke-width="2.2" stroke-linejoin="round"/>
        ${pts.filter(Boolean).map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="#6366f1" stroke="#fff" stroke-width="1.2"/>`).join('')}
        ${showPtVal ? pts.map((p, i) => p ? `<text x="${p[0].toFixed(1)}" y="${(p[1] - 7).toFixed(1)}" font-size="8" text-anchor="middle" fill="#475569">${this._dc99Fmt(vals[i], metric).replace(/<[^>]+>/g, '')}</text>` : '').join('') : ''}
      </svg>`;
    } else if (metric && effChart === 'bar') {
      const bw = Math.max(1.5, (CW - pad * 2) / N - (N > 14 ? 2 : 6));
      chartSvg = `<svg viewBox="0 0 ${CW} ${CH}" style="width:100%;background:#f8fafc;border-radius:12px">${gridLines}${xLabels}
        ${vals.map((v, i) => { if (v === null) return ''; const bh = Math.max(2, ((v - yMin) / (yMax - yMin || 1)) * (CH - pad * 2)); const x = xOf(i) - bw / 2; const y = CH - pad - bh;
          return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3.5" fill="url(#dcBar)" opacity="0.88"/>
          ${showPtVal ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="8" text-anchor="middle" fill="#475569">${this._dc99Fmt(v, metric)}</text>` : ''}`; }).join('')}
        <defs><linearGradient id="dcBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs>
      </svg>`;
    } else if (metric) { // 热力图：≤7 日单行；>7 日 GitHub 风格 7 行网格（每列 7 天，悬停看明细）
      if (N <= 7) {
        const gw = (CW - pad * 2 - (N - 1) * 6) / N, gh = CH - pad * 2;
        chartSvg = `<svg viewBox="0 0 ${CW} ${CH}" style="width:100%;background:#f8fafc;border-radius:12px">${xLabels}
          ${vals.map((v, i) => { const x = pad + i * (gw + 6); const c = this._dc99HeatColor(v, metric, minV, maxV);
            return `<rect x="${x.toFixed(1)}" y="${pad}" width="${gw.toFixed(1)}" height="${gh}" rx="6" fill="${c}"/>
            <text x="${(x + gw / 2).toFixed(1)}" y="${(pad + gh / 2 - 2).toFixed(1)}" font-size="9.5" font-weight="700" text-anchor="middle" fill="${v === null ? '#94a3b8' : '#fff'}">${this._dc99Fmt(v, metric)}</text>
            <text x="${(x + gw / 2).toFixed(1)}" y="${(pad + gh / 2 + 11).toFixed(1)}" font-size="7.5" text-anchor="middle" fill="${v === null ? '#94a3b8' : 'rgba(255,255,255,.85)'}">周${days[i].wk}</text>`; }).join('')}
        </svg>`;
      } else {
        const cols = Math.ceil(N / 7), gap = 3;
        const cw = (CW - pad * 2 - (cols - 1) * gap) / cols;
        const chh = (CH - pad * 2 - 6 * gap) / 7;
        const showTxt = N <= 30 && cw >= 18;
        chartSvg = `<svg viewBox="0 0 ${CW} ${CH}" style="width:100%;background:#f8fafc;border-radius:12px">
          ${days.map((d, j) => { const v = vals[j]; const col = Math.floor(j / 7), row = j % 7;
            const x = pad + col * (cw + gap), y = pad + row * (chh + gap);
            const c = this._dc99HeatColor(v, metric, minV, maxV);
            return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cw.toFixed(1)}" height="${chh.toFixed(1)}" rx="${Math.min(3, cw / 4).toFixed(1)}" fill="${c}"><title>${d.dk} 周${d.wk}：${this._dc99Fmt(v, metric)}</title></rect>
            ${showTxt ? `<text x="${(x + cw / 2).toFixed(1)}" y="${(y + chh / 2 + 3).toFixed(1)}" font-size="8" font-weight="700" text-anchor="middle" fill="${v === null ? '#94a3b8' : '#fff'}">${this._dc99Fmt(v, metric)}</text>` : ''}`; }).join('')}
          <text x="${pad}" y="${CH - pad + 12}" font-size="8" fill="#94a3b8">${days[0].label}</text>
          <text x="${CW - pad / 2}" y="${CH - pad + 12}" font-size="8" text-anchor="end" fill="#94a3b8">${days[days.length - 1].label}</text>
        </svg>`;
      }
    }
    const curCardName = (cards.find(c => c.id === st.card) || {}).name || '';
    const hasNum = metric && (metric.kind === 'num' || metric.kind === 'time');
    let html = `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">📊</span>数据中心 · 习惯数据 · 近 ${N} 日全景
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">卡片 × 指标 × 图表 自由组合</span>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">选择任意习惯卡片与单一指标，用折线 / 柱状 / 热力图看它近 ${N} 日的表现——你想看的自律数据，这里都有。</div>
      <div class="dc99-sec">⏱ 时间范围</div>
      <div class="dc99-chips">
        <button class="hb99-chip${st.range === 7 ? ' on' : ''}" onclick="App._dc99Set('range',7)">近 7 日</button>
        <button class="hb99-chip${st.range === 30 ? ' on' : ''}" onclick="App._dc99Set('range',30)">近 30 日</button>
        <button class="hb99-chip${st.range === 90 ? ' on' : ''}" onclick="App._dc99Set('range',90)">近 90 日</button>
      </div>
      <div class="dc99-sec">① 选择习惯卡片</div>
      <div class="dc99-chips">
        ${cards.map(c => `<button class="hb99-chip${st.card === c.id ? ' on' : ''}" onclick="App._dc99Set('card','${c.id}')">${c.ico} ${this.esc(c.name)}</button>`).join('')}
      </div>
      ${metrics.length > 1 ? `<div class="dc99-sec">② 选择指标</div>
      <div class="dc99-chips">
        ${metrics.map(m => `<button class="hb99-chip${st.metric === m.key ? ' on' : ''}" onclick="App._dc99Set('metric','${m.key}')">${this.esc(m.name)}</button>`).join('')}
      </div>` : ''}
      <div class="dc99-sec">${metrics.length > 1 ? '③' : '②'} 选择图表类型${N > 30 ? '（90 日跨度下柱状图自动转为折线）' : ''}</div>
      <div class="dc99-chips">
        <button class="hb99-chip${st.chart === 'line' ? ' on' : ''}" onclick="App._dc99Set('chart','line')">📈 折线图</button>
        <button class="hb99-chip${st.chart === 'bar' ? ' on' : ''}"${N > 30 ? ' disabled style="opacity:.45;cursor:not-allowed"' : ''} onclick="App._dc99Set('chart','bar')">📊 柱状图</button>
        <button class="hb99-chip${st.chart === 'heat' ? ' on' : ''}" onclick="App._dc99Set('chart','heat')">🔥 热力图</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">📋</span>${curCardName} · ${metric ? this.esc(metric.name) : ''} · 近 ${N} 日${doneCnt ? ` · 达成 ${doneCnt}/${N} 天` : ''}</div>
      <div style="margin-top:8px">${chartSvg || '<div class="empty">该卡片暂无可用指标</div>'}</div>
      ${hasNum && nums.length ? `<div class="dc99-stats">
        <span>📊 均值 <b>${this._dc99Fmt(Math.round(avg * 10) / 10, metric)}</b></span>
        <span>⬆️ 最高 <b>${this._dc99Fmt(maxV, metric)}</b></span>
        <span>⬇️ 最低 <b>${this._dc99Fmt(minV, metric)}</b></span>
        <span>📅 有数据 <b>${nums.length}/${N} 天</b></span>
      </div>` : ''}
    </div>
    ${this._afuDataCenterAdvice(days, vals, metric, curCardName, N)}
    ${this._dc99RadarCard(days)}
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  // v10.0 六大板块雷达图（数据中心·习惯数据）：近 N 日各板块平均完成度（records 口径，与「今日待办」六大板块同源）
  _dc99RadarCard(days) {
    const groups = (CONFIG.coins && CONFIG.coins.rewardGroups) || [];
    if (groups.length < 3) return '';
    const N = days.length || 1;
    // 每板块：近 N 日「达成项数/总项数」的日均值 → 百分比
    const pcts = groups.map(g => {
      const ids = g.items || [];
      if (!ids.length) return 0;
      let sum = 0;
      days.forEach(d => {
        let rec = null;
        try { rec = Store.getDay(d.dk); } catch(_) { rec = null; }
        if (!rec) return;
        sum += ids.filter(id => this._achDone(id, rec)).length / ids.length;
      });
      return Math.round((sum / N) * 100);
    });
    const overall = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    // —— SVG 六边形雷达（320×320）——
    const S = 320, cx = S / 2, cy = S / 2 + 4, R = 102;
    const n = groups.length;
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n;
    const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
    const ringPts = (r) => groups.map((_, i) => pt(i, r).map(v => v.toFixed(1)).join(',')).join(' ');
    const rings = [0.25, 0.5, 0.75, 1].map(r =>
      `<polygon points="${ringPts(R * r)}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`).join('');
    const spokes = groups.map((_, i) => {
      const [x, y] = pt(i, R);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>`;
    }).join('');
    const valPts = groups.map((g, i) => pt(i, R * Math.max(0.04, pcts[i] / 100)).map(v => v.toFixed(1)).join(',')).join(' ');
    const dots = groups.map((_, i) => {
      const [x, y] = pt(i, R * Math.max(0.04, pcts[i] / 100));
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="#6366f1" stroke="#fff" stroke-width="1.4"/>`;
    }).join('');
    const labels = groups.map((g, i) => {
      const [x, y] = pt(i, R + 27);
      const c = pcts[i] >= 60 ? '#16a34a' : pcts[i] >= 30 ? '#d97706' : '#dc2626';
      return `<text x="${x.toFixed(1)}" y="${(y + 1).toFixed(1)}" font-size="11" font-weight="700" text-anchor="middle" fill="#334155">${g.icon}${g.name}</text>
        <text x="${x.toFixed(1)}" y="${(y + 13).toFixed(1)}" font-size="9.5" font-weight="800" text-anchor="middle" fill="${c}">${pcts[i]}%</text>`;
    }).join('');
    return `<div class="card" style="margin-top:12px">
      <div class="card-title"><span class="ico">🕸️</span>六大板块 · 雷达图 <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">近 ${N} 日平均完成度 · 综合 ${overall}%</span></div>
      <div style="margin-top:8px"><svg viewBox="0 0 ${S} ${S}" style="width:100%;max-width:340px;display:block;margin:0 auto;background:#f8fafc;border-radius:12px">
        ${rings}${spokes}
        <polygon points="${valPts}" fill="rgba(99,102,241,.20)" stroke="#6366f1" stroke-width="2" stroke-linejoin="round"/>
        ${dots}${labels}
      </svg></div>
      <div style="font-size:11.5px;color:#94a3b8;margin-top:8px">六轴 = 健康/睡眠/饮食/卫生/运动/学习（与「今日待办」的六大板块同源，按当日打卡实时判定）；图形越饱满，说明该板块越稳定；凹陷处就是该补的短板。</div>
    </div>`;
  },
  // v2026.0906 阿福智慧参谋 · 数据中心：对当前「卡片 × 指标 × 时间范围」的数据解读 + 下一步建议
  _afuDataCenterAdvice(days, vals, metric, cardName, N) {
    if (!metric) return '';
    const nums = vals.map(v => (v === null || v === undefined || isNaN(v)) ? null : v);
    const valid = nums.filter(v => v !== null);
    if (!valid.length) return `<div class="card" style="margin-top:14px">
      <div class="card-title"><span class="ico pxafu"></span>管家阿福 · 智慧参谋</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.8;margin-top:6px">「${this.esc(cardName)} · ${this.esc(metric.name)}」近 ${N} 日还没有数据。先回【习惯】打卡，数据进来了阿福才能替您读趋势。</div>
    </div>`;
    const lines = [];
    // ① 数据完整度
    const gap = N - valid.length;
    if (gap > 0) lines.push(`📅 数据完整度 <b>${valid.length}/${N}</b>（缺 ${gap} 天）——缺的天数不参与统计，连续记录才能让趋势可信。`);
    else lines.push(`📅 数据完整度 <b>${N}/${N}</b>，全勤记录，这份趋势阿福敢签字。`);
    // ② 走势：后半段 vs 前半段
    const half = Math.floor(valid.length / 2);
    if (valid.length >= 4 && half >= 2) {
      const avgA = valid.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const avgB = valid.slice(half).reduce((a, b) => a + b, 0) / (valid.length - half);
      const d = avgB - avgA;
      const pct = Math.abs(avgA) > 0.001 ? Math.round(Math.abs(d / avgA) * 100) : 0;
      const upGood = !(metric.key === 'wake' || metric.key === 'sleep' || metric.key === 'sleepAtMin' || /次数|是否小病|负面/.test(metric.name));
      if (Math.abs(d) < (Math.abs(avgA) * 0.05)) lines.push(`📈 近 ${N} 日走势平稳（前后半段均值差 ${d >= 0 ? '+' : ''}${(Math.round(d * 10) / 10)}），处于稳态。`);
      else if ((d > 0) === upGood) lines.push(`📈 走势向好：后半段较前半段${pct ? ` +${pct}%` : ''}，${metric.name}在往好的方向走，保持这个节奏。`);
      else lines.push(`📉 走势预警：后半段较前半段${pct ? ` -${pct}%` : ''}，${metric.name}在下滑——截到【健康数据】看它牵连的器官分。`);
    }
    // ③ 波动 / 极值
    const maxV = Math.max(...valid), minV = Math.min(...valid);
    if (metric.kind === 'num' || metric.kind === 'time') {
      const range = maxV - minV;
      const swing = Math.abs(maxV) > 0.001 ? Math.round(range / Math.abs(maxV) * 100) : 0;
      const lastV = [...nums].reverse().find(v => v !== null);
      if (swing >= 50) lines.push(`🎢 波动偏大：最低 ${this._dc99Fmt(minV, metric)} ↔ 最高 ${this._dc99Fmt(maxV, metric)}（振幅 ${swing}%）——稳定比偶尔的满分更养人。`);
      if (lastV !== undefined && valid.length >= 3 && maxV !== minV) {
        if (lastV === maxV) lines.push(`🆕 最近一次记录 <b>${this._dc99Fmt(lastV, metric)}</b>，是近 ${N} 日的最高值。`);
        else if (lastV === minV) lines.push(`🆕 最近一次记录 <b>${this._dc99Fmt(lastV, metric)}</b>，是近 ${N} 日的最低值——注意别让惯性滑下去。`);
      }
    }
    // ④ bool / lv 达成率
    if (metric.kind === 'bool' || metric.kind === 'lv') {
      const good = vals.filter(v => v === (metric.kind === 'bool' ? 1 : 2)).length;
      const rate = Math.round(good / valid.length * 100);
      lines.push(rate >= 80 ? `✅ 达成率 <b>${rate}%</b>（${good}/${valid.length} 天）——很稳，这就是复利的样子。`
        : rate >= 50 ? `🟡 达成率 <b>${rate}%</b>（${good}/${valid.length} 天）——过半但不到八成，用【补卡中心】找找漏在哪。`
        : `🔴 达成率仅 <b>${rate}%</b>（${good}/${valid.length} 天）——先别求完美，明天只求比今天多打一张卡。`);
    }
    // ⑤ 指标专属建议
    const tips = {
      nightH: '睡眠建议 7-9h；低于 6h 时肝/脑/免疫会被同时扣分。', napMin: '午觉 10-90 分钟最佳，超过 90 分钟会抢夜觉。', waterMl: '饮水目标 1300ml 起，肾排毒靠它，白开水少量多次。', meals: '一日三餐规律进食，缺餐直接伤胃建模。', studyMin: '每天 ≥60 分钟学习可进健康指数加分项。', sportMin: '每天 ≥30 分钟中等强度运动，心肺与代谢都受益。', moodNeg: '负面情绪连续出现时，去【日记】写下来，命名情绪本身就在降压。', sleepAtMin: '入睡时刻建议不晚于 24:00，越晚肝修复窗口被压缩越狠。',
    };
    if (tips[metric.key]) lines.push(`💡 ${tips[metric.key]}`);
    return `<div class="card" style="margin-top:14px">
      <div class="card-title"><span class="ico pxafu"></span>管家阿福 · 智慧参谋
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">解读 ${this.esc(cardName)} · ${this.esc(metric.name)}（近 ${N} 日）</span>
      </div>
      <div style="font-size:12.5px;line-height:1.9;margin-top:6px">${lines.map(l => `<div>${l}</div>`).join('')}</div>
      <div style="margin-top:8px"><button class="btn btn-sm btn-ghost" onclick="App.gotoWb('dailylog99')">📈 去健康数据看器官建模</button></div>
    </div>`;
  },
  // v6.9 【打卡说明】按 44 卡现状全量重写
  habit99Help() {
    // v12.9.12 打卡说明 → 地图攻略样式（内容保持不变，仅换攻略化排版）
    this._modal({
      title: `🗺️ 旅行者地图攻略（${(CONFIG.habitCards || []).length} 卡版）`,
      body: `<div class="map99-guide">
        <div>1️⃣ <b>基础操作</b>：<b>长按小卡 1 秒</b>打卡（带环形进度）；<b>单击</b>查看该卡详情、填报表单与近 14 日记录。每张卡有打卡时间窗（卡面 ⏰ 所示）；窗口外无法直接打卡。</div>
        <div>2️⃣ <b>漏卡补救</b>：若当日已执行但忘记打卡，可在<b>补卡中心</b>补卡（仅限昨日/今日，需填写原因与反省书，留痕于【反省数据】）。心情、健康与消费记录卡不可补卡。</div>
        <div>3️⃣ <b>卡面角标</b>：🌳 连续坚持天数（今天未打不打断连续）；「<b>戒</b>」为戒断自律卡（未破才计连续天数）；「<b>有界</b>」为前置卡——需先完成指定打卡才开放（健身餐需当日已完成<b>健身</b>卡；医疗消需当日已打卡<b>健康</b>卡且未勾「感觉良好」）。</div>
        <div>4️⃣ <b>作息卡</b>：早安填起床时间 + 昨晚睡眠质量；晚安填入睡时间 + 今日总状态；午安为两段式——先记入睡，醒后再记起床时间 + 质量。</div>
        <div>5️⃣ <b>三餐卡</b>：填内容 + 质量 1-5 星 + 就餐类型（居家/外卖/堂食/被请客四选一）；外卖/堂食需填花费并自动同步【数据中心 → 经济数据】，被请客填东家名字。健身餐勾选补剂（蛋白粉/肌酸/增肌粉）；营养餐勾选保健品（维生素 B/C/D、鱼油）。</div>
        <div>6️⃣ <b>学习卡</b>：学习·晨/午/晚为 2 次卡——首次打卡后 45 分钟开放第 2 次，完成 2 次才算当日成功，方式最多选二（英语/政治/计算机/高数/阅读）。</div>
        <div>7️⃣ <b>身体记录卡</b>：大便/小便当日可多次（自动累计）；喝水为达标制——当日累计 ≥1300ml 才算成功；步数 20:00-22:00 填写，以手机/智能手表数据为准；心情当日可多次记录（每次间隔 ≥1 小时，不可补卡）。</div>
        <div>8️⃣ <b>健康卡</b>（不可补卡）：${this._isAuthorizedAccount && this._isAuthorizedAccount() ? '三选一——「感觉良好」；「小病缠身」勾选症状（可多选，自动同步【数据中心 → 就医数据】急诊科）；「大病复查」依次选病种 HIV/HPV/TP → 复查项目 体检/治疗/买药（可多选）→ 填写复查情况（自动同步【就医数据】感染科）。' : '二选一——「感觉良好」或「小病缠身」；小病缠身勾选症状（可多选，自动同步【数据中心 → 就医数据】急诊科）。'}<b>医疗消</b>金额用途自动关联健康卡状态。</div>
        <div>9️⃣ <b>戒断四正卡</b>：正气/正心/正魂/正言——勾选「未破」累计连续未破天数；勾「破」仅表示当日已记录（连续天数当日归零，如实记录本身就是自律）。正气卡内含禁止性交性插入行为警示；正心破心需填使用分钟；正魂大破魂需勾选具体行为（烟/酒/槟榔/rush）与时间；正言破言需勾选分级行为（小破：打断/反问/挑刺/抱怨；大破：贬低/大话/炫耀/强改观念/争对错/泄密未成之事）并填写理由——谨言慎行，尊重个体差异，事以密成。正姿同理：未破/小破/大破姿三选一。</div>
        <div>🔟 <b>消费记录卡</b>（不计坚持天数、不进补卡清单）：痘清洁/牙清洁/发修剪/搓澡洗/足洗户/耳采洗为门店消费；交通消/生活消/居住消/人情消/用品消/培养消当日可多次记录——每笔花费自动同步【数据中心 → 经济数据】；搓澡洗/足洗户会自动完成当日洗澡/洗脚卡；人情消请客可联动自动打卡三餐卡。</div>
        <div>1️⃣1️⃣ <b>数据去向</b>：每日 24 点结算——【习惯 → 健康数据】看健康分析与五脏六腑建模；【数据中心】三库一屏：<b>习惯数据</b>检索任意卡片近 7/30/90 日指标（折线/柱状/热力图）、<b>经济数据</b>（原记账）管收支、<b>就医数据</b>（原病历）管病历；【报告数据】看每日图文总结。</div>
      </div>`,
      actions: [{ label: '收起攻略' }],
    });
  },
  // ====== 记录板块首页：v12.9.5 已全面改版 → 由 91-record99.js 的 _wbRecord 提供
  //   （顶栏「我的记录」下拉 + 「＋」记一笔上拉面板 + 黏土沙盘插画 + 6 导航 + 情侣空间 + 格物/致知/未尽之言）======
  // ====== v11.2 灵光：记录自己每一次灵光乍现的时刻 ======
  // 与【挑战中心】的目标不同：灵光不需要完成、没有打卡/周期/连续天数/违约——
  // 它是孩子式的憧憬未来：念头闪过时轻轻接住，收进灵光瓶就好。
  _spark99Kinds() {
    return [
      { k:'dream', ico:'🌟', n:'梦想',   afu:'梦想不怕远——先把它写下来，它就开始真实地存在了。' },
      { k:'do',    ico:'🎈', n:'想做的事', afu:'想做的事不用立刻去做，先让它在纸上安心发光。' },
      { k:'learn', ico:'📚', n:'想学',   afu:'想学的东西是心里透进来的光，记下来就是在擦亮它。' },
      { k:'go',    ico:'🗺️', n:'想去',   afu:'世界很大，先把远方收进灵光瓶，总有一天会启程。' },
      { k:'be',    ico:'🦋', n:'想成为',  afu:'你想成为的那个自己，正在前方不急不慢地等你走近。' },
      { k:'idea',  ico:'💡', n:'小点子',  afu:'点子稍纵即逝，抓进瓶子里就再也跑不掉了。' },
    ];
  },
  _spark99KindInfo(k) { return this._spark99Kinds().find(x => x.k === k) || { ico:'✨', n:'灵光' }; },
  _wbSparks99(wb, W) {
    const d = Store.load();
    const sparks = (Array.isArray(d.wbSparks99) ? d.wbSparks99 : []).slice().sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    const kinds = this._spark99Kinds();
    if (!this._spark99Kind) this._spark99Kind = 'dream';
    // 统计：累计 / 本月 / 覆盖天数 / 收藏
    const nowBJ = Store.beijingDate(Store.nowBeijing());
    const monthKey = `${nowBJ.getFullYear()}-${String(nowBJ.getMonth() + 1).padStart(2, '0')}`;
    const monthN = sparks.filter(s => (s.date || '').startsWith(monthKey)).length;
    const daySet = new Set(sparks.map(s => s.date).filter(Boolean));
    const starN = sparks.filter(s => s.star).length;
    // 阿福回响：以日期为种子的伪随机，翻一条 ≥7 天前的旧灵光（当日稳定不跳变）
    let echo = null;
    const old = sparks.filter(s => s.ts && (Date.now() - new Date(s.ts).getTime()) >= 7 * 86400000);
    if (old.length) {
      let seed = 0; const dk = Store.today();
      for (let i = 0; i < dk.length; i++) seed = (seed * 31 + dk.charCodeAt(i)) >>> 0;
      echo = old[seed % old.length];
    }
    const daysAgo = (s) => Math.floor((Date.now() - new Date(s.ts || s.date).getTime()) / 86400000);
    let html = `<div class="card spark99-hero">
      <div class="card-title"><span class="ico">✨</span>灵光 · 记录自己每一次灵光乍现的时刻</div>
      <div class="spark99-hero-sub">灵光不是目标——<b>不需要完成、没有打卡、没有周期与截止</b>。像孩子憧憬未来那样，把闪过的念头轻轻收进瓶子：想做的事、想学的东西、想去的远方、想成为的自己。哪天真去做了，是惊喜；一直没做，它也是你心里亮过的一颗星。</div>
      <div class="spark99-stats">
        <span>✨ 累计 <b>${sparks.length}</b> 条</span>
        <span>📅 本月 <b>${monthN}</b> 条</span>
        <span>🌙 覆盖 <b>${daySet.size}</b> 天</span>
        <span>⭐ 收藏 <b>${starN}</b> 条</span>
      </div>
    </div>`;
    // —— 记录表单 ——
    html += `<div class="ledger-form">
      <div class="card-title" style="padding:0;margin:0 0 12px"><span class="ico">🫙</span>接住一道灵光</div>
      <div class="field"><label>灵光类型</label>
        <div class="spark99-chip-row">
          ${kinds.map(x => `<button type="button" class="spark99-chip ${this._spark99Kind === x.k ? 'on' : ''}" onclick="App._spark99Pick(this, '${x.k}')"><span>${x.ico}</span>${x.n}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>灵光内容（一句话或一段话都好）</label>
        <textarea id="spark99Text" class="textarea" style="min-height:88px" placeholder="如：想学自由潜，去看一次海底的星空 / 想开一家深夜书房，留一盏灯给晚归的人..."></textarea>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="App.spark99Add()">✨ 收进灵光瓶</button>
      </div>
    </div>`;
    // —— 阿福回响 ——
    html += `<div class="card spark99-echo">
      <div class="card-title" style="font-size:14px"><span class="ico pxafu"></span>阿福 · 灵光回响</div>
      ${echo
        ? `<div class="spark99-echo-body">还记得吗？<b>${daysAgo(echo)} 天前</b>的你灵光乍现：${this._spark99KindInfo(echo.kind).ico} <b>${this.esc(echo.text)}</b><div class="spark99-echo-note">${daysAgo(echo)} 天过去了，这道光还亮着。不催你去做——只是替你记得：你心里装着这样一件美好的事。</div></div>`
        : `<div class="spark99-echo-body">灵光瓶还空着（或都还太新鲜）。攒满 7 天，阿福会随机翻出一条旧灵光给你回看——不催完成，只帮你记得自己憧憬过什么。</div>`}
    </div>`;
    // —— 灵光卡片流 ——
    html += `<div class="section-label">灵光瓶 (${sparks.length})</div>`;
    if (!sparks.length) html += `<div class="empty">✨ 还没有灵光——下一次心里亮起来的时候，回到这里接住它。</div>`;
    sparks.forEach(s => {
      const ki = this._spark99KindInfo(s.kind);
      const ago = daysAgo(s);
      const agoTxt = ago <= 0 ? '今天' : (ago === 1 ? '昨天' : `${ago} 天前`);
      html += `<div class="spark99-item ${s.star ? 'starred' : ''}">
        <div class="spark99-item-head">
          <span class="spark99-kind">${ki.ico} ${ki.n}</span>
          <span class="spark99-when">${this.esc(s.date || '')} · ${agoTxt}</span>
          <span class="spark99-ops">
            <button class="${s.star ? 'on' : ''}" title="收藏" onclick="App.spark99Star('${s.id}')">${s.star ? '⭐' : '☆'}</button>
            <button title="删除" onclick="App.spark99Del('${s.id}')">🗑️</button>
          </span>
        </div>
        <div class="spark99-item-text">${this.esc(s.text || '')}</div>
      </div>`;
    });
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  _spark99Pick(btn, k) {
    this._spark99Kind = k;
    document.querySelectorAll('.spark99-chip').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
  },
  spark99Add() {
    const ta = document.getElementById('spark99Text');
    const text = ((ta && ta.value) || '').trim();
    if (!text) return this._flash('灵光内容不能为空～接住它再保存');
    const d = Store.load();
    if (!Array.isArray(d.wbSparks99)) d.wbSparks99 = [];
    if (d.wbSparks99.length >= 2000) return this._flash('灵光瓶已满（2000 条）——先清理一些旧灵光吧');
    d.wbSparks99.unshift({ id: Store._id(), date: Store.today(), ts: new Date().toISOString(), kind: this._spark99Kind || 'dream', text, star: false });
    Store.save(d);
    this._flash('✨ ' + this._spark99KindInfo(this._spark99Kind || 'dream').afu);
    this.render_workbench();
  },
  spark99Star(id) {
    const d = Store.load();
    const s = (d.wbSparks99 || []).find(x => x.id === id);
    if (!s) return;
    s.star = !s.star;
    Store.save(d);
    this.render_workbench();
  },
  spark99Del(id) {
    if (!confirm('确认删除这条灵光？')) return;
    const d = Store.load();
    d.wbSparks99 = (d.wbSparks99 || []).filter(s => s.id !== id);
    Store.save(d);
    this._flash('🌱 灵光已放归星空');
    this.render_workbench();
  },
  // ====== v11.3 憾潮：灵光乍现，憾潮汹涌（后悔的事 · 殴打发泄） ======
  // 与【灵光】相对：灵光收藏心里的光，憾潮安放心里的刺。后悔的事写成卡片，
  // 点它、揍它、把不满砸在它身上——每打一拳潮水退一寸，88 拳后自动"释怀"碎成星光。
  _rg99BruiseSlots() {
    return [[16, 70], [58, 76], [38, 58], [76, 48], [24, 42], [52, 28]];
  },
  _rg99State(r) {
    const h = r.hits || 0;
    if (r.healed) return { t: '💗 已释怀 · 继续打也没关系', k: 'healed' };
    if (h === 0) return { t: '心里的刺 · 点卡片开揍', k: 'fresh' };
    if (h < 30) return { t: '还在痛 · 继续打', k: 'hot' };
    if (h < 60) return { t: '正在泄洪 · 越打越轻', k: 'drain' };
    return { t: '快要退潮 · 再来几拳', k: 'ebb' };
  },
  _wbRegrets99(wb, W) {
    const d = Store.load();
    const regrets = (Array.isArray(d.wbRegrets99) ? d.wbRegrets99 : []).slice().sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    const nowBJ = Store.beijingDate(Store.nowBeijing());
    const monthKey = `${nowBJ.getFullYear()}-${String(nowBJ.getMonth() + 1).padStart(2, '0')}`;
    const monthN = regrets.filter(r => (r.date || '').startsWith(monthKey)).length;
    const totalHits = regrets.reduce((a, r) => a + (r.hits || 0), 0);
    const healedN = regrets.filter(r => r.healed).length;
    const daysAgo = (r) => Math.floor((Date.now() - new Date(r.ts || r.date).getTime()) / 86400000);
    let html = `<div class="card rg99-hero">
      <div class="card-title"><span class="ico">🌊</span>憾潮 · 灵光乍现，憾潮汹涌</div>
      <div class="rg99-hero-sub">灵光收藏心里的光，憾潮安放心里的刺。后悔做过的事写下来，它就从心口的刺变成一张沙袋卡——<b>点它、揍它、把不满都砸在它身上</b>。每打一拳，潮水退一寸；<b>88 拳后它会"释怀"</b>，碎成一地星光。不催你放下，也不劝你原谅——只是别让刺一直扎在心口。</div>
      <div class="rg99-stats">
        <span>🌊 累计 <b>${regrets.length}</b> 件</span>
        <span>📅 本月 <b>${monthN}</b> 件</span>
        <span>👊 发泄 <b>${totalHits}</b> 拳</span>
        <span>💗 已释怀 <b>${healedN}</b> 件</span>
      </div>
    </div>`;
    // —— 记录表单 ——
    html += `<div class="ledger-form">
      <div class="card-title" style="padding:0;margin:0 0 12px"><span class="ico">🥊</span>把那件后悔的事做成沙袋</div>
      <div class="field"><label>后悔的事（一句话或一段话都好）</label>
        <textarea id="rg99Text" class="textarea" style="min-height:88px" placeholder="如：后悔没在爷爷还在时多陪他说说话 / 后悔当年没敢告白 / 后悔冲动买了那台单反吃灰三年..."></textarea>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="App.regret99Add()">🌊 记入憾潮</button>
      </div>
    </div>`;
    // —— 阿福陪打 ——
    html += `<div class="card rg99-echo">
      <div class="card-title" style="font-size:14px"><span class="ico pxafu"></span>阿福 · 陪打</div>
      <div class="rg99-echo-body">打累了吗？悔意不是用来惩罚自己的——它只是提醒你：下次走到同样的岔路口，你会认得这条路。快速连点有 <b>COMBO 连击</b>特效，打满 88 拳卡片会碎成星光。</div>
    </div>`;
    // —— 沙袋卡片流 ——
    html += `<div class="section-label">憾潮沙袋 (${regrets.length})</div>`;
    if (!regrets.length) html += `<div class="empty">🌊 憾潮暂平——下一件后悔的事涌上来时，回到这里把它做成沙袋。</div>`;
    regrets.forEach(r => {
      const ago = daysAgo(r);
      const agoTxt = ago <= 0 ? '今天' : (ago === 1 ? '昨天' : `${ago} 天前`);
      const st = this._rg99State(r);
      const bruiseN = Math.min(6, Math.floor((r.hits || 0) / 8));
      const bruises = this._rg99BruiseSlots().slice(0, bruiseN)
        .map(([l, t]) => `<i class="rg99-bruise" style="left:${l}%;top:${t}%"></i>`).join('');
      html += `<div class="rg99-item ${r.healed ? 'healed' : ''}" id="rg99-${r.id}" onclick="App.regret99Hit('${r.id}', event)" title="点击 = 揍它一拳">
        ${r.healed ? '<span class="rg99-heal-stamp">释怀</span>' : ''}
        <div class="rg99-item-head">
          <span class="rg99-kind">🌊 憾事</span>
          <span class="rg99-when">${this.esc(r.date || '')} · ${agoTxt}</span>
          <span class="rg99-ops">
            <button title="删除" onclick="event.stopPropagation(); App.regret99Del('${r.id}')">🗑️</button>
          </span>
        </div>
        <div class="rg99-item-text">${this.esc(r.text || '')}</div>
        <div class="rg99-bruises">${bruises}</div>
        <div class="rg99-item-foot">
          <span class="rg99-hits">👊 <b id="rg99-hits-${r.id}">${r.hits || 0}</b> 拳</span>
          <span class="rg99-state ${st.k}" id="rg99-state-${r.id}">${st.t}</span>
        </div>
      </div>`;
    });
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  regret99Add() {
    const ta = document.getElementById('rg99Text');
    const text = ((ta && ta.value) || '').trim();
    if (!text) return this._flash('先写下那件后悔的事——写下来才能开始拔刺');
    const d = Store.load();
    if (!Array.isArray(d.wbRegrets99)) d.wbRegrets99 = [];
    if (d.wbRegrets99.length >= 2000) return this._flash('憾潮已满（2000 件）——先清理一些旧憾事吧');
    d.wbRegrets99.unshift({ id: Store._id(), date: Store.today(), ts: new Date().toISOString(), text, hits: 0, healed: false });
    Store.save(d);
    this._flash('🌊 已记入憾潮——现在，尽情地揍它吧');
    this.render_workbench();
  },
  // 殴打交互：hits+1 + 抖动/淤青/拳头特效/COMBO/释怀判定（DOM 局部更新，不整页重渲染）
  // 防抖窗口内 Store.load 读不到未落盘数据 → 用内存累加器 _rg99HitsMem[id] 跨拳累加，
  // 落盘成功后清空（下次 hit 从已落盘值重新起算）
  regret99Hit(id, ev) {
    const d = Store.load();
    const r = (d.wbRegrets99 || []).find(x => x.id === id);
    if (!r) return;
    if (!this._rg99HitsMem) this._rg99HitsMem = {};
    const base = this._rg99HitsMem[id] || { hits: r.hits || 0, healed: !!r.healed, healedTs: r.healedTs };
    base.hits += 1;
    const justHealed = !base.healed && base.hits >= 88;
    if (justHealed) { base.healed = true; base.healedTs = new Date().toISOString(); }
    this._rg99HitsMem[id] = base;
    // 防抖持久化：重新 load 合并写入（避免覆盖期间其他模块的 save），成功后清内存累加器
    clearTimeout(this._rg99SaveT);
    this._rg99SaveT = setTimeout(() => {
      try {
        const dd = Store.load();
        const rr = (dd.wbRegrets99 || []).find(x => x.id === id);
        if (rr) {
          rr.hits = base.hits; rr.healed = base.healed;
          if (base.healedTs) rr.healedTs = base.healedTs;
          Store.save(dd);
          if (this._rg99HitsMem && this._rg99HitsMem[id] && this._rg99HitsMem[id].hits === base.hits) delete this._rg99HitsMem[id];
        }
      } catch (_) {}
    }, 500);
    const hits = base.hits, healed = !!base.healed;
    // —— DOM 特效 ——
    const card = document.getElementById('rg99-' + id);
    const hitsEl = document.getElementById('rg99-hits-' + id);
    if (hitsEl) hitsEl.textContent = hits;
    const stateEl = document.getElementById('rg99-state-' + id);
    const st = this._rg99State({ hits, healed });
    if (stateEl) { stateEl.textContent = st.t; stateEl.className = 'rg99-state ' + st.k; }
    if (card) {
      // 随机方向抖动
      card.classList.remove('rg99-shake');
      void card.offsetWidth;
      card.style.setProperty('--rg99-dx', (Math.random() * 10 - 5).toFixed(1) + 'px');
      card.style.setProperty('--rg99-dy', (Math.random() * 6 - 3).toFixed(1) + 'px');
      card.classList.add('rg99-shake');
      // 淤青（每 8 拳一块，最多 6 块；释怀后不再新增）
      if (!healed) {
        const n = Math.min(6, Math.floor(hits / 8));
        const have = card.querySelectorAll('.rg99-bruise').length;
        if (n > have) {
          const slot = this._rg99BruiseSlots()[Math.min(have, 5)];
          const b = document.createElement('i');
          b.className = 'rg99-bruise rg99-bruise-pop';
          b.style.left = slot[0] + '%'; b.style.top = slot[1] + '%';
          const holder = card.querySelector('.rg99-bruises');
          if (holder) holder.appendChild(b);
        }
      }
      if (justHealed) this._rg99Shatter(card);
    }
    // 拳头/拟声词特效（点击坐标迸发）
    this._rg99FxBurst(ev);
    // COMBO 连击（900ms 窗口）
    const now = Date.now();
    this._rg99Combo = (now - (this._rg99ComboAt || 0) < 900) ? (this._rg99Combo || 0) + 1 : 1;
    this._rg99ComboAt = now;
    if (this._rg99Combo >= 2) this._rg99ComboFx(ev, this._rg99Combo);
    if (justHealed) this._flash('💗 第 88 拳——它碎成星光了。潮水退了，你也轻了。');
  },
  _rg99FxBurst(ev) {
    if (!ev) return;
    const FX = ['👊', '💥', '💢', '🥊', '⚡', '💫'];
    const ONO = ['啪！', '砰！', '哈！', '嘿！', '解气！', '噗！', '呼！'];
    const x = ev.clientX, y = ev.clientY;
    const mk = (txt, cls) => {
      const s = document.createElement('span');
      s.className = 'rg99-fx ' + cls;
      s.textContent = txt;
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--dx', (Math.random() * 90 - 45).toFixed(0) + 'px');
      s.style.setProperty('--dy', (-(40 + Math.random() * 70)).toFixed(0) + 'px');
      s.style.setProperty('--rot', (Math.random() * 80 - 40).toFixed(0) + 'deg');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 700);
    };
    mk(FX[Math.floor(Math.random() * FX.length)], 'rg99-fx-fist');
    if (Math.random() < .6) mk(FX[Math.floor(Math.random() * FX.length)], 'rg99-fx-fist');
    mk(ONO[Math.floor(Math.random() * ONO.length)], 'rg99-fx-ono');
  },
  _rg99ComboFx(ev, n) {
    if (!ev) return;
    const s = document.createElement('span');
    s.className = 'rg99-combo';
    s.textContent = `COMBO ×${n}`;
    s.style.left = ev.clientX + 'px';
    s.style.top = (ev.clientY - 34) + 'px';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 800);
  },
  // 释怀碎裂：16 片星光碎片飞散 + 卡片转入 healed 态
  _rg99Shatter(card) {
    card.classList.add('healed');
    const rect = card.getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const sh = document.createElement('i');
      sh.className = 'rg99-shard';
      sh.style.left = (rect.left + Math.random() * rect.width) + 'px';
      sh.style.top = (rect.top + Math.random() * rect.height) + 'px';
      sh.style.setProperty('--dx', (Math.random() * 260 - 130).toFixed(0) + 'px');
      sh.style.setProperty('--dy', (Math.random() * 200 - 60).toFixed(0) + 'px');
      sh.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      document.body.appendChild(sh);
      setTimeout(() => sh.remove(), 900);
    }
  },
  regret99Del(id) {
    if (!confirm('确认删除这件憾事？删除后无法再打它。')) return;
    const d = Store.load();
    d.wbRegrets99 = (d.wbRegrets99 || []).filter(r => r.id !== id);
    Store.save(d);
    this._flash('🌊 憾事已随潮水退去');
    this.render_workbench();
  },
  // ====== v11.3 足迹：走过的中国（34 省级行政区 · 地理蜂窝地图点亮） ======
  // 地图为"类3D"地理蜂窝模型：34 省按真实经纬度投影落位、按面积定六边形尺寸，
  // 叠加低多边形中国轮廓底图；可点击省份/填城市点亮，按时间顺序逐省点亮动画，
  // 省会足迹 = 高亮（lit-cap），非省会足迹 = 中亮（lit-city）；黑夜模式看"灯火里的中国"。
  _fp99Provinces() {
    // lon/lat = 省级行政区地理中心（hex 落位）；r = 六边形半径（面积档）
    return [
      { id: 'hlj', name: '黑龙江', short: '黑', capital: '哈尔滨', lon: 127.0, lat: 47.0, r: 26 },
      { id: 'jl',  name: '吉林',   short: '吉', capital: '长春',   lon: 125.5, lat: 43.6, r: 24 },
      { id: 'ln',  name: '辽宁',   short: '辽', capital: '沈阳',   lon: 123.0, lat: 41.5, r: 24 },
      { id: 'nmg', name: '内蒙古', short: '蒙', capital: '呼和浩特', lon: 113.5, lat: 43.5, r: 28 },
      { id: 'bj',  name: '北京',   short: '京', capital: '北京',   lon: 116.0, lat: 40.2, r: 19 },
      { id: 'tj',  name: '天津',   short: '津', capital: '天津',   lon: 117.8, lat: 38.8, r: 19 },
      { id: 'heb', name: '河北',   short: '冀', capital: '石家庄', lon: 114.8, lat: 38.2, r: 23 },
      { id: 'sx',  name: '山西',   short: '晋', capital: '太原',   lon: 112.3, lat: 37.6, r: 21 },
      { id: 'sd',  name: '山东',   short: '鲁', capital: '济南',   lon: 118.0, lat: 36.4, r: 21 },
      { id: 'hen', name: '河南',   short: '豫', capital: '郑州',   lon: 113.5, lat: 33.9, r: 23 },
      { id: 'js',  name: '江苏',   short: '苏', capital: '南京',   lon: 119.5, lat: 33.0, r: 20 },
      { id: 'ah',  name: '安徽',   short: '皖', capital: '合肥',   lon: 117.0, lat: 31.8, r: 20 },
      { id: 'sh',  name: '上海',   short: '沪', capital: '上海',   lon: 121.5, lat: 31.2, r: 19 },
      { id: 'zj',  name: '浙江',   short: '浙', capital: '杭州',   lon: 120.1, lat: 29.2, r: 20 },
      { id: 'jx',  name: '江西',   short: '赣', capital: '南昌',   lon: 115.9, lat: 27.6, r: 23 },
      { id: 'fj',  name: '福建',   short: '闽', capital: '福州',   lon: 118.3, lat: 26.0, r: 20 },
      { id: 'hb',  name: '湖北',   short: '鄂', capital: '武汉',   lon: 112.3, lat: 30.9, r: 23 },
      { id: 'hun', name: '湖南',   short: '湘', capital: '长沙',   lon: 111.8, lat: 27.6, r: 23 },
      { id: 'gd',  name: '广东',   short: '粤', capital: '广州',   lon: 113.7, lat: 23.8, r: 23 },
      { id: 'gx',  name: '广西',   short: '桂', capital: '南宁',   lon: 108.8, lat: 23.7, r: 23 },
      { id: 'hi',  name: '海南',   short: '琼', capital: '海口',   lon: 109.8, lat: 19.2, r: 19 },
      { id: 'cq',  name: '重庆',   short: '渝', capital: '重庆',   lon: 107.3, lat: 29.7, r: 21 },
      { id: 'sc',  name: '四川',   short: '川', capital: '成都',   lon: 102.5, lat: 30.2, r: 26 },
      { id: 'gz',  name: '贵州',   short: '黔', capital: '贵阳',   lon: 106.7, lat: 26.7, r: 22 },
      { id: 'yn',  name: '云南',   short: '滇', capital: '昆明',   lon: 101.5, lat: 24.8, r: 26 },
      { id: 'xj',  name: '新疆',   short: '新', capital: '乌鲁木齐', lon: 85.3, lat: 41.5, r: 30 },
      { id: 'xz',  name: '西藏',   short: '藏', capital: '拉萨',   lon: 88.4, lat: 31.1, r: 30 },
      { id: 'qh',  name: '青海',   short: '青', capital: '西宁',   lon: 96.0, lat: 35.7, r: 27 },
      { id: 'gs',  name: '甘肃',   short: '甘', capital: '兰州',   lon: 100.0, lat: 37.2, r: 24 },
      { id: 'nx',  name: '宁夏',   short: '宁', capital: '银川',   lon: 106.2, lat: 37.3, r: 19 },
      { id: 'sn',  name: '陕西',   short: '陕', capital: '西安',   lon: 108.9, lat: 34.4, r: 23 },
      { id: 'tw',  name: '台湾',   short: '台', capital: '台北',   lon: 121.0, lat: 23.7, r: 19 },
      { id: 'hk',  name: '香港',   short: '港', capital: '香港',   lon: 114.8, lat: 22.4, r: 15 },
      { id: 'mo',  name: '澳门',   short: '澳', capital: '澳门',   lon: 113.1, lat: 21.8, r: 15 },
    ];
  },
  _fp99Cities() {
    // 省份 → 城市表（首位为省会；含地级市与常去城镇）
    return {
      hlj: ['哈尔滨', '齐齐哈尔', '牡丹江', '佳木斯', '大庆', '鸡西', '鹤岗', '双鸭山', '伊春', '七台河', '黑河', '绥化', '漠河', '大兴安岭'],
      jl: ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延吉', '延边'],
      ln: ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛'],
      nmg: ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '满洲里', '锡林郭勒', '阿拉善'],
      bj: ['北京'],
      tj: ['天津', '滨海新区'],
      heb: ['石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水'],
      sx: ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁', '平遥'],
      sd: ['济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽', '曲阜'],
      hen: ['郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店'],
      js: ['南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁'],
      ah: ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城'],
      sh: ['上海'],
      zj: ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水', '义乌', '乌镇', '西塘'],
      jx: ['南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶', '婺源'],
      fj: ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德', '武夷山', '鼓浪屿'],
      hb: ['武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '孝感', '荆州', '荆门', '黄冈', '咸宁', '随州', '恩施', '仙桃', '潜江', '神农架'],
      hun: ['长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西', '凤凰'],
      gd: ['广州', '深圳', '珠海', '汕头', '佛山', '韶关', '江门', '湛江', '茂名', '肇庆', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮'],
      gx: ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左', '阳朔'],
      hi: ['海口', '三亚', '三沙', '儋州', '五指山', '琼海', '文昌', '万宁', '东方', '澄迈', '陵水', '西沙'],
      cq: ['重庆', '万州', '涪陵'],
      sc: ['成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳', '阿坝', '甘孜', '凉山', '西昌', '稻城', '九寨沟'],
      gz: ['贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁', '凯里', '黔东南', '黔南', '黔西南', '荔波', '黄果树'],
      yn: ['昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆', '香格里拉', '泸沽湖'],
      xj: ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '库尔勒', '阿克苏', '喀什', '和田', '伊犁', '伊宁', '塔城', '阿勒泰', '石河子', '独山子'],
      xz: ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里'],
      qh: ['西宁', '海东', '海北', '黄南', '果洛', '玉树', '海西', '格尔木', '德令哈', '茶卡'],
      gs: ['兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏', '甘南', '敦煌'],
      nx: ['银川', '石嘴山', '吴忠', '固原', '中卫'],
      sn: ['西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛', '华山'],
      tw: ['台北', '新北', '桃园', '台中', '台南', '高雄', '基隆', '新竹', '嘉义', '垦丁', '花莲'],
      hk: ['香港'],
      mo: ['澳门'],
    };
  },
  // 简单投影：等距圆柱（中纬度 cos35° 修正），viewBox 1160×880
  _fp99Project(lon, lat) { return [Math.round((lon - 73) * 18), Math.round((53.5 - lat) * 24)]; },
  _fp99HexPoints(r) {
    const w = (r * 0.866).toFixed(1);
    return `0,${-r} ${w},${(-r / 2).toFixed(1)} ${w},${(r / 2).toFixed(1)} 0,${r} ${-w},${(r / 2).toFixed(1)} ${-w},${(-r / 2).toFixed(1)}`;
  },
  // 低多边形中国轮廓（含海南/台湾），配合 hex 阵的"数字化中国"美学
  _fp99Outline() {
    const MAIN = 'M923,329 L925,322 L875,350 L886,307 L839,324 L805,348 L830,377 L871,382 L896,386 L851,418 L837,434 L835,449 L851,482 L864,516 L875,526 L868,554 L875,566 L871,598 L859,614 L842,638 L842,660 L823,686 L812,696 L792,725 L767,737 L733,749 L700,761 L673,775 L670,799 L657,770 L630,768 L581,725 L515,746 L504,775 L484,756 L472,730 L441,708 L463,665 L450,624 L441,605 L342,617 L335,619 L250,614 L221,605 L130,552 L122,504 L103,502 L63,432 L36,401 L27,391 L15,338 L36,360 L94,329 L130,240 L171,199 L178,163 L225,151 L266,127 L317,137 L414,257 L558,283 L684,235 L765,204 L806,96 L837,84 L859,29 L889,0 L936,7 L954,36 L1103,125 L1112,122 L1096,187 L1078,197 L1048,204 L1037,266 L1033,266 Z';
    const HAINAN = 'M643,806 L659,802 L679,809 L684,838 L667,847 L648,842 Z';
    const TAIWAN = 'M864,677 L880,684 L875,708 L862,756 L850,742 L853,715 Z';
    return { MAIN, HAINAN, TAIWAN };
  },
  _fp99Stars() {
    // 固定种子伪随机星点（黑夜模式"灯火里的中国"背景）
    let s = 42;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    let out = '';
    for (let i = 0; i < 46; i++) {
      out += `<circle cx="${(rnd() * 1160).toFixed(0)}" cy="${(rnd() * 860).toFixed(0)}" r="${(rnd() * 1.3 + 0.6).toFixed(1)}" style="animation-delay:${(rnd() * 3).toFixed(1)}s"></circle>`;
    }
    return out;
  },
  _fp99LitMap() {
    const d = Store.load();
    const map = {};
    (Array.isArray(d.wbFootprints99) ? d.wbFootprints99 : []).forEach(f => {
      const m = map[f.prov] || (map[f.prov] = { cap: false, cities: new Set(), n: 0 });
      m.n++;
      if (f.isCapital) m.cap = true;
      if (f.city) m.cities.add(f.city);
    });
    return map;
  },
  _wbFootprints99(wb, W) {
    const d = Store.load();
    const fps = Array.isArray(d.wbFootprints99) ? d.wbFootprints99 : [];
    const litMap = this._fp99LitMap();
    const provs = this._fp99Provinces();
    const cities = this._fp99Cities();
    const litProvN = provs.filter(p => litMap[p.id]).length;
    const cityN = new Set(fps.filter(f => f.city).map(f => f.prov + '|' + f.city)).size;
    const sorted = fps.slice().sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
    const firstDate = sorted.length ? sorted[0].date : '';
    const night = !!this._fp99Night;
    if (!this._fp99View) this._fp99View = 'tilt';
    const viewName = { flat: '平面', tilt: '立体', top: '俯瞰' }[this._fp99View];
    // —— 地图 SVG ——
    const ol = this._fp99Outline();
    const hexes = provs.map(p => {
      const [x, y] = this._fp99Project(p.lon, p.lat);
      const m = litMap[p.id];
      const cls = m ? (m.cap ? 'lit-cap' : 'lit-city') : '';
      const fs = p.r <= 15 ? 9 : (p.r <= 20 ? 11 : 13);
      return `<g class="fp99-hex ${cls}" data-prov="${p.id}" transform="translate(${x},${y})" onclick="App._fp99Pick('${p.id}')">
        <polygon points="${this._fp99HexPoints(p.r)}"/>
        ${m ? `<circle class="fp99-halo" r="${(p.r * 1.55).toFixed(1)}"></circle>` : ''}
        <text style="font-size:${fs}px" y="${(fs * 0.36).toFixed(1)}">${p.short}</text>
        ${m && m.cap ? `<text class="fp99-cap-star" x="${(p.r * 0.42).toFixed(1)}" y="${(-p.r * 0.52).toFixed(1)}">★</text>` : ''}
      </g>`;
    }).join('');
    let html = `<div class="card fp99-hero">
      <div class="card-title"><span class="ico">🗺️</span>足迹 · 走过的中国</div>
      <div class="fp99-hero-sub">把去过的地方点亮在地图上：选择省级行政区，或直接填写城市自动识别。点亮按时间顺序回放——<b>省会足迹高亮 ★，非省会中亮 ●</b>；打开黑夜模式，看灯火里的中国。</div>
      <div class="fp99-stats">
        <span>🇨🇳 走过 <b>${litProvN}/34</b> 省</span>
        <span>🏙️ 城市 <b>${cityN}</b> 座</span>
        <span>📍 足迹 <b>${fps.length}</b> 条</span>
        ${firstDate ? `<span>🧭 始于 <b>${this.esc(firstDate)}</b></span>` : ''}
      </div>
      <div class="fp99-toolbar">
        <button id="fp99NightBtn" class="btn ${night ? 'btn-primary' : 'btn-ghost'}" onclick="App.fp99ToggleNight()">${night ? '☀️ 白昼模式' : '🌙 黑夜模式'}</button>
        <button id="fp99ViewBtn" class="btn btn-ghost" onclick="App.fp99ToggleView()">🧊 视角：${viewName}</button>
        <button class="btn btn-ghost" onclick="App.fp99Replay()">▶ 重走一遍</button>
      </div>
    </div>`;
    // —— 3D 地图舞台 ——
    html += `<div class="card fp99-map-card">
      <div class="fp99-stage ${night ? 'night' : ''}">
        <div class="fp99-plane" id="fp99Plane">
          <svg viewBox="0 0 1160 880" class="fp99-svg" preserveAspectRatio="xMidYMid meet">
            <g class="fp99-stars">${this._fp99Stars()}</g>
            <path class="fp99-outline" d="${ol.MAIN}"></path>
            <path class="fp99-outline fp99-island" d="${ol.HAINAN}"></path>
            <path class="fp99-outline fp99-island" d="${ol.TAIWAN}"></path>
            ${hexes}
          </svg>
        </div>
      </div>
      <div class="fp99-map-tip">💡 点击省份六边形可快速点亮（弹窗选城市）；手机上<b>左右滑动地图</b>可查看全图（v11.5 修复）。省会足迹 ★ 高亮，非省会 ● 中亮。</div>
    </div>`;
    // —— 添加足迹表单 ——
    const cityOptions = provs.map(p => (cities[p.id] || []).map(c =>
      `<option value="${this.esc(c)}">${p.name}${c === p.capital ? ' · 省会' : ''}</option>`).join('')).join('');
    html += `<div class="ledger-form">
      <div class="card-title" style="padding:0;margin:0 0 12px"><span class="ico">📍</span>点亮足迹</div>
      <div class="field"><label>省级行政区（34 个）</label>
        <select id="fp99Prov" class="input">
          <option value="">— 选择省份（也可只填城市自动识别）—</option>
          ${provs.map(p => `<option value="${p.id}">${this.esc(p.name)}${litMap[p.id] ? ' ✓' : ''}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>城市（可留空 = 只点亮省份）</label>
        <input id="fp99City" class="input" list="fp99CityList" placeholder="输入城市名自动识别省份，如：杭州 / 丽江 / 敦煌">
        <datalist id="fp99CityList">${cityOptions}</datalist>
      </div>
      <div class="field"><label>去过的时间（点亮动画按时间排序）</label><input type="date" id="fp99Date" class="input" value="${Store.today()}"></div>
      <div class="btn-row"><button class="btn btn-primary" onclick="App.fp99Add()">📍 点亮</button></div>
    </div>`;
    // —— 省级行政区网格（手机友好快速点亮） ——
    html += `<div class="section-label">省级行政区 (${litProvN}/34 已点亮)</div>
    <div class="fp99-chip-grid">
      ${provs.map(p => {
        const m = litMap[p.id];
        return `<button class="fp99-chip ${m ? (m.cap ? 'lit-cap' : 'lit-city') : ''}" onclick="App._fp99Pick('${p.id}')">${this.esc(p.name)}${m && m.cap ? ' ★' : (m ? ' ●' : '')}</button>`;
      }).join('')}
    </div>`;
    // —— 足迹时间轴 ——
    html += `<div class="section-label">足迹时间轴 (${fps.length})</div>`;
    if (!fps.length) html += `<div class="empty">🗺️ 还没有足迹——点亮你的第一站吧。</div>`;
    sorted.slice().reverse().forEach(f => {
      const p = provs.find(x => x.id === f.prov);
      if (!p) return;
      html += `<div class="fp99-log-item">
        <span class="fp99-log-date">${this.esc(f.date || '')}</span>
        <span class="fp99-log-prov">${this.esc(p.name)}</span>
        ${f.city ? `<b class="fp99-log-city">${this.esc(f.city)}${f.isCapital ? ' ★省会' : ''}</b>` : '<b class="fp99-log-city fp99-log-provonly">（仅省份）</b>'}
        <button title="删除足迹" onclick="App.fp99Del('${f.id}')">🗑️</button>
      </div>`;
    });
    // —— 旅记（v12.9.5：供用户记录旅行时发生的事 · 记一笔上拉面板选「足迹」分组也存到这里）——
    const travels = Array.isArray(d.wbTravel99) ? d.wbTravel99 : [];
    html += `<div class="section-label">✈️ 旅记 · 行走中的故事 (${travels.length})</div>`;
    html += `<div class="ledger-form">
      <div class="card-title" style="padding:0;margin:0 0 12px"><span class="ico">✈️</span>记一段旅记</div>
      <div class="field"><label>日期</label><input type="date" id="tv99Date" class="input" value="${Store.today()}"></div>
      <div class="field" style="margin-top:8px"><label>地点（如：杭州 · 西湖）</label><input type="text" id="tv99Place" class="input" placeholder="这次旅行去了哪儿"></div>
      <div class="field" style="margin-top:8px"><label>发生了什么</label><textarea id="tv99Text" class="textarea" style="min-height:88px" placeholder="旅途中的人、事、风景与心情..."></textarea></div>
      <div class="btn-row"><button class="btn btn-primary" onclick="App.travel99Add()">✈️ 存入旅记</button></div>
    </div>`;
    if (!travels.length) html += `<div class="empty">✈️ 还没有旅记——下一次出发，把路上的故事带回来（【记录】首页「＋」选「足迹」分组，随手的旅记也会存到这里）。</div>`;
    travels.forEach(t => {
      html += `<div class="diary-card">
        <div class="diary-head"><div class="diary-date">${this.esc(t.date || '')} · 旅记${t.place ? ' · ' + this.esc(t.place) : ''}</div><button class="btn btn-ghost btn-sm" onclick="App.travel99Del('${t.id}')">删除</button></div>
        <div class="diary-content" style="white-space:pre-wrap">${this.esc(t.text || '')}</div>
      </div>`;
    });
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  fp99ToggleNight() {
    this._fp99Night = !this._fp99Night;
    const stage = document.querySelector('.fp99-stage');
    if (stage) stage.classList.toggle('night', this._fp99Night);
    const btn = document.getElementById('fp99NightBtn');
    if (btn) {
      btn.innerHTML = this._fp99Night ? '☀️ 白昼模式' : '🌙 黑夜模式';
      btn.className = 'btn ' + (this._fp99Night ? 'btn-primary' : 'btn-ghost');
    }
  },
  fp99ToggleView() {
    const order = ['flat', 'tilt', 'top'];
    this._fp99View = order[(order.indexOf(this._fp99View || 'tilt') + 1) % 3];
    this._fp99ApplyView();
    const btn = document.getElementById('fp99ViewBtn');
    if (btn) btn.textContent = '🧊 视角：' + { flat: '平面', tilt: '立体', top: '俯瞰' }[this._fp99View];
  },
  _fp99ApplyView() {
    const plane = document.getElementById('fp99Plane');
    if (!plane) return;
    const deg = { flat: 0, tilt: 30, top: 52 }[this._fp99View || 'tilt'];
    plane.style.transform = `rotateX(${deg}deg) rotateZ(-1.2deg)`;
  },
  // 按去过的时间顺序逐省点亮（回放动画）
  fp99Replay() {
    const d = Store.load();
    const fps = (Array.isArray(d.wbFootprints99) ? d.wbFootprints99 : []).slice()
      .sort((a, b) => (a.ts || '').localeCompare(b.ts || ''));
    if (!fps.length) return this._flash('还没有足迹——先点亮你的第一站');
    const litMap = this._fp99LitMap();
    const seq = []; const seen = new Set();
    fps.forEach(f => { if (!seen.has(f.prov)) { seen.add(f.prov); seq.push(f.prov); } });
    // 全熄灭
    document.querySelectorAll('.fp99-hex').forEach(g => {
      g.classList.remove('lit-cap', 'lit-city');
      const halo = g.querySelector('.fp99-halo'); if (halo) halo.remove();
      const star = g.querySelector('.fp99-cap-star'); if (star) star.remove();
    });
    const provs = this._fp99Provinces();
    seq.forEach((pid, i) => setTimeout(() => {
      const g = document.querySelector(`.fp99-hex[data-prov="${pid}"]`);
      if (!g) return;
      g.classList.add(litMap[pid] && litMap[pid].cap ? 'lit-cap' : 'lit-city');
      const p = provs.find(x => x.id === pid);
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('class', 'fp99-halo');
      halo.setAttribute('r', (p.r * 1.55).toFixed(1));
      g.insertBefore(halo, g.firstChild);
      if (litMap[pid] && litMap[pid].cap) {
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        star.setAttribute('class', 'fp99-cap-star');
        star.setAttribute('x', (p.r * 0.42).toFixed(1));
        star.setAttribute('y', (-p.r * 0.52).toFixed(1));
        star.textContent = '★';
        g.appendChild(star);
      }
    }, 500 + i * 360));
    this._flash(`▶ 重走一遍：按时间顺序点亮 ${seq.length} 个省级行政区`);
  },
  _fp99Pick(id) {
    const p = this._fp99Provinces().find(x => x.id === id);
    if (!p) return;
    const d = Store.load();
    const recs = (d.wbFootprints99 || []).filter(f => f.prov === id);
    const visited = new Set(recs.filter(r => r.city).map(r => r.city));
    const cityList = this._fp99Cities()[id] || [];
    const chips = cityList.map(c => {
      const on = visited.has(c);
      return `<button class="fp99-city-chip ${c === p.capital ? 'is-cap' : ''} ${on ? 'on' : ''}" onclick="App.fp99Add('${id}', '${c.replace(/'/g, "\\'")}')">${c === p.capital ? '★' : ''}${this.esc(c)}${on ? ' ✓' : ''}</button>`;
    }).join('');
    const recList = recs.length
      ? recs.map(r => `<div class="fp99-rec-row">${this.esc(r.date || '')} · ${r.city ? this.esc(r.city) + (r.isCapital ? ' ★' : '') : '仅省份'} <button onclick="App.fp99Del('${r.id}')">🗑️</button></div>`).join('')
      : '<div style="font-size:12.5px;color:#94a3b8">还未点亮——点击下方城市（记为今天）或用表单填写具体时间。</div>';
    const body = `
      <div style="font-size:12.5px;color:#475569;line-height:1.7;margin-bottom:10px">
        省会 <b>${this.esc(p.capital)}</b> 的足迹点亮后为 <b style="color:#b45309">★ 高亮</b>；其他城市为 <b style="color:#d97706">● 中亮</b>。
      </div>
      <div class="fp99-city-grid">${chips}</div>
      <div style="margin-top:12px"><button class="btn btn-ghost" onclick="App.fp99Add('${id}', '')">📍 只点亮${this.esc(p.name)}（不记城市）</button></div>
      <div style="margin-top:14px;font-weight:700;font-size:13px;color:#0f172a">本省足迹 (${recs.length})</div>
      <div style="max-height:30vh;overflow:auto;margin-top:6px">${recList}</div>`;
    this._modal(`📍 ${this.esc(p.name)}${recs.length ? ` · 走过 ${visited.size} 城` : ' · 未点亮'}`, body);
  },
  _fp99CityMatch(name) {
    if (!name) return null;
    const cities = this._fp99Cities();
    const provs = this._fp99Provinces();
    let hit = null;
    provs.forEach(p => {
      (cities[p.id] || []).forEach(c => { if (!hit && c === name) hit = { prov: p.id, city: c, exact: true }; });
    });
    if (hit) return hit;
    provs.forEach(p => {
      (cities[p.id] || []).forEach(c => {
        if (!hit && name.length >= 2 && (name.indexOf(c) >= 0 || c.indexOf(name) >= 0)) hit = { prov: p.id, city: c, exact: false };
      });
    });
    return hit;
  },
  // 点亮足迹：表单提交（无参）或省份弹窗快速点亮（带参：provId, city, date）
  fp99Add(provId, city, date) {
    const fromForm = provId === undefined;
    if (fromForm) {
      provId = (document.getElementById('fp99Prov') || {}).value || '';
      city = ((document.getElementById('fp99City') || {}).value || '').trim();
      date = (document.getElementById('fp99Date') || {}).value || Store.today();
    } else {
      city = city === undefined ? '' : String(city);
      date = date || Store.today();
    }
    if (!provId && city) {
      const m = this._fp99CityMatch(city);
      if (m) { provId = m.prov; if (!m.exact) city = m.city; }
    }
    if (!provId) return this._flash('请选择省份，或输入可识别的城市名');
    let p = this._fp99Provinces().find(x => x.id === provId);
    if (!p) return this._flash('省份无效');
    let isCapital = false;
    if (city) {
      const m = this._fp99CityMatch(city);
      if (m && m.prov !== provId) {
        const right = this._fp99Provinces().find(x => x.id === m.prov);
        if (right && confirm(`「${city}」属于${right.name}——改为点亮${right.name}吗？`)) { provId = m.prov; p = right; }
        else city = '';
      }
      if (city && city === p.capital) isCapital = true;
    }
    const d = Store.load();
    if (!Array.isArray(d.wbFootprints99)) d.wbFootprints99 = [];
    if (d.wbFootprints99.length >= 500) return this._flash('足迹已达上限（500 条）');
    d.wbFootprints99.push({ id: Store._id(), prov: provId, city: city || '', isCapital, date, ts: new Date().toISOString() });
    Store.save(d);
    this._flash(`📍 ${p.name}${city ? ' · ' + city + (isCapital ? '（省会 ★ 高亮）' : '') : ''} 已点亮`);
    if (this._modal && this._closeModal) this._closeModal();
    this.render_workbench();
    // 新点亮省份播放一次升腾动画
    setTimeout(() => {
      const g = document.querySelector(`.fp99-hex[data-prov="${provId}"]`);
      if (g) { g.classList.add('fp99-just'); setTimeout(() => g.classList.remove('fp99-just'), 1600); }
    }, 60);
  },
  fp99Del(id) {
    if (!confirm('确认删除这条足迹？')) return;
    const d = Store.load();
    d.wbFootprints99 = (d.wbFootprints99 || []).filter(f => f.id !== id);
    Store.save(d);
    this._flash('🗺️ 足迹已移除');
    if (this._closeModal) this._closeModal();
    this.render_workbench();
  },
  // —— 铭记（原「记事」· 人生大事 · 无需每日记录 · v12.9.5 改名并同步全部文案）——
  // v2026.0905 修复：反省书已独立为【反省书】专页（reflect99），铭记页只显示大事记，避免混杂导致"反省书丢失"的观感
  _wbNotes99(wb, W) {
    const d = Store.load();
    const notes = (Array.isArray(d.wbNotes99) ? d.wbNotes99 : []).filter(n => (n.kind || '') !== '反省书');
    let html = `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🏛️</span>铭记 · 人生大事</div>
      <div class="field" style="margin-top:8px"><label>日期</label><input type="date" id="note99Date" class="input" value="${Store.today()}"></div>
      <div class="field" style="margin-top:8px"><label>标题</label><input type="text" id="note99Title" class="input" placeholder="如：拿到录取通知书 / 第一次手术 / 家人团聚..."></div>
      <div class="field" style="margin-top:8px"><label>内容</label><textarea id="note99Text" class="textarea" style="min-height:100px" placeholder="记录这件大事的来龙去脉..."></textarea></div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-primary" onclick="App.note99Add()">💾 保存大事记</button>
        <button class="btn btn-ghost" onclick="App.gotoWb('reflect99')">🪞 去反省数据（习惯板块）</button>
        <button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button>
      </div>
    </div>
    <div class="section-label">📜 大事记（${notes.length}）</div>`;
    if (!notes.length) html += `<div class="empty">还没有记录大事，人生值得被记住的瞬间都存这里～</div>`;
    notes.forEach(n => {
      html += `<div class="diary-card">
        <div class="diary-head"><div class="diary-date">${n.date} · ${(n.kind || '随笔')}</div><button class="btn btn-ghost btn-sm" onclick="App.note99Del('${n.id}')">删除</button></div>
        ${n.title ? `<div class="diary-title">${this.esc(n.title)}</div>` : ''}
        <div class="diary-content" style="white-space:pre-wrap">${this.esc(n.text)}</div>
      </div>`;
    });
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  // —— 反省数据（v3.3 自【记录·反省书】迁入习惯板块：补卡留痕 + 自我反省）——
  // 数据源仍是 wbNotes99（kind='反省书'），补卡时自动写入，功能保持不变。
  _wbReflect99(wb, W) {
    const d = Store.load();
    const notes = (Array.isArray(d.wbNotes99) ? d.wbNotes99 : []).filter(n => (n.kind || '') === '反省书');
    let html = `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🪞</span>反省数据 · 补卡留痕与自我反省</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">在【习惯】→【补卡中心】补卡时填写的漏卡原因与反省书，会集中存放在这里。</div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="App.gotoWb('habit')">🎫 去补卡中心</button>
        <button class="btn btn-sm btn-ghost" onclick="App.navBack()">← 返回上一页</button>
      </div>
    </div>
    <div class="section-label">🪞 反省书（${notes.length}）</div>`;
    if (!notes.length) html += `<div class="empty">还没有反省书～在【习惯】→【补卡中心】补卡时填写漏卡原因与反省书，即会出现在这里。</div>`;
    notes.forEach(n => {
      html += `<div class="diary-card">
        <div class="diary-head"><div class="diary-date">${n.date} · 反省书</div><button class="btn btn-ghost btn-sm" onclick="App.note99Del('${n.id}')">删除</button></div>
        <div class="diary-content" style="white-space:pre-wrap">${this.esc(n.text)}</div>
      </div>`;
    });
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  note99Add() {
    const date = (document.getElementById('note99Date') || {}).value || Store.today();
    const title = ((document.getElementById('note99Title') || {}).value || '').trim();
    const text = (document.getElementById('note99Text') || {}).value || '';
    if (!title && !text.trim()) return this._flash('标题和内容至少填一个～');
    const d = Store.load();
    if (!Array.isArray(d.wbNotes99)) d.wbNotes99 = [];
    d.wbNotes99.unshift({ id: Store._id(), date, kind: '大事记', title, text: text.trim(), ts: new Date().toISOString() });
    Store.save(d);
    this._flash('✅ 大事已记录');
    this.render_workbench();
  },
  note99Del(id) {
    if (!confirm('确认删除这条记录？')) return;
    const d = Store.load();
    d.wbNotes99 = (d.wbNotes99 || []).filter(n => n.id !== id);
    Store.save(d);
    this.render_workbench();
  },
  // —— 就医数据（感染科 / 急诊科）——
  // v2026.0906 就医数据双科室改造：感染科（HIV/HPV/梅毒TP 慢性传染病）+ 急诊科（健康打卡卡同步的 12 种常见病症）；v6.9 自【记录】迁入【数据中心】
  _wbIllness99(wb, W) {
    const groups = [
      // v12.2：感染科三卡（HIV/HPV/梅毒TP）已迁往【记录 → 密码箱】健康隐私分区（未解锁时不可见）
      { name: '急诊科', ico: '🚑', color: '#0891b2', items: [
        { id: 'mouthUlcer',     name: '口腔溃疡', ico: '👄', hint: '发作频率 / 愈合时间' },
        { id: 'diarrhea',       name: '腹泻',     ico: '🚻', hint: '次数 / 诱因 / 用药' },
        { id: 'constipation',    name: '便秘',     ico: '🧻', hint: '排便间隔 / 干预措施' },
        { id: 'migraine',       name: '偏头痛',   ico: '🤕', hint: '发作频率 / 诱因 / 用药' },
        { id: 'fever',          name: '发烧',     ico: '🌡️', hint: '体温 / 持续时间 / 用药' },
        { id: 'soreThroat',     name: '咽痛',     ico: '😮‍💨', hint: '程度 / 发热 / 用药' },
        { id: 'hypoglycemia',   name: '低血糖',   ico: '🍬', hint: '发作时间 / 处理 / 复发' },
        { id: 'urticaria',      name: '荨麻疹',   ico: '🌿', hint: '诱因 / 用药 / 喉头水肿警示' },
        { id: 'fungalInfection',name: '真菌感染', ico: '🍄', hint: '部位 / 疗程 / 复发记录' },
        { id: 'otitisMedia',    name: '中耳炎',   ico: '👂', hint: '听力 / 进水史 / 用药' },
        { id: 'conjunctivitis', name: '结膜炎',   ico: '👁️', hint: '分泌物 / 传染性 / 用药' },
        { id: 'bleeding',       name: '流血',     ico: '🩸', hint: '部位 / 血量 / 止血处理' },
      ]},
    ];
    let html = `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🩺</span>就医数据 · 急诊科</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">急诊科承接【习惯 · 健康】打卡卡同步的 12 种常见病症，记录疾病开始时间、治疗场所与治疗方式。</div>
      <div style="margin-top:8px"><button class="btn btn-sm btn-ghost" onclick="App.navigate('medical')">📋 打开完整就医数据时间线</button></div>
    </div>`;
    // v12.9.11【体检建议】卡自「五脏六腑模型」迁入：按档案定制体检清单（器官建模弱项触发 · 55-insight.js _afuCheckupCard）
    try {
      const h99 = Store.getHabit99();
      const td = Store.today();
      const yd = this._hb99DkOff(-1);
      const aDk = (h99.days[td] && Object.keys(h99.days[td]).length) ? td : ((h99.days[yd] && Object.keys(h99.days[yd]).length) ? yd : td);
      const sSum = Store.habit99DailySummary(aDk);
      const mrRecs = (Store.load().medicalRecords || []);
      const chronic = mrRecs.some(r => (r.tags || []).includes('hiv') || (r.tags || []).includes('tp') || r.disease === 'hiv' || r.disease === 'tp');
      html += this._afuCheckupCard(this._afuOrganModel(sSum, chronic), chronic);
    } catch (e) {}
    // v12.9.50 账号级门控：感染科分区（HIV/HPV/TP）仅授权账号存在；其他账号不显示此卡（无相关描述）
    if (this._isAuthorizedAccount && this._isAuthorizedAccount()) {
    html += `<div class="card" style="margin-bottom:14px;cursor:pointer" onclick="App.gotoWb('vault99')">
      <div class="card-title"><span class="ico">🔐</span>感染科已移入密码箱 <span class="sub">HIV / HPV / 梅毒TP</span></div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">这三类健康隐私记录的卡片已迁至【密码箱 · 健康隐私分区】统一看管——未解锁密码箱时，任何页面都不显示具体内容。点击前往 →</div>
    </div>`;
    }
    groups.forEach(g => {
      html += `<div class="section-label">${g.ico} ${g.name}</div><div class="wb-entry-grid">`;
      g.items.forEach(it => {
        html += `<div class="card wb-entry-card" onclick="App.illness99Open('${it.id}')">
          <div class="wb-ico">${it.ico}</div>
          <div class="wb-name">${this.esc(it.name)}</div>
          <div class="wb-hint">${this.esc(it.hint)}</div>
        </div>`;
      });
      html += `</div>`;
    });
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  illness99Open(kind) {
    const d = Store.load();
    const recs = (d.medicalRecords || []).filter(r => (r.tags || []).includes(kind) || r.disease === kind);
    const names = { hiv:'HIV', hpv:'HPV', tp:'梅毒TP', mouthUlcer:'口腔溃疡', diarrhea:'腹泻', constipation:'便秘', migraine:'偏头痛', fever:'发烧', soreThroat:'咽痛', hypoglycemia:'低血糖', urticaria:'荨麻疹', fungalInfection:'真菌感染', otitisMedia:'中耳炎', conjunctivitis:'结膜炎', bleeding:'流血' };
    const grp = ['hiv','hpv','tp'].includes(kind) ? '感染科' : '急诊科';
    const rows = recs.slice().reverse().map(r => `<div class="hb99-row"><b>${r.date || '?'}</b><span>${this.esc(
      `${r.onsetDate ? '始于 ' + r.onsetDate + ' · ' : ''}${r.symptoms ? (Array.isArray(r.symptoms) ? r.symptoms.join(',') : r.symptoms) : (r.note || '记录')}`
      + `${r.severity ? ' · 程度' + r.severity : ''}`
      + `${r.hospital ? ' · 就诊：' + r.hospital : ''}`
      + `${r.treatment ? ' · 治疗：' + r.treatment : ''}`
      + `${r.medicines && r.medicines.length ? ' · 用药：' + r.medicines.join('/') : ''}`
    )}</span></div>`).join('');
    this._modal({
      title: `🩺 ${names[kind] || kind} · ${grp}病例记录`,
      body: `<div style="font-size:13px;line-height:1.9;color:var(--text)">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="App._closeModal();App._mrKind='${kind}';App.navigate('medical')">➕ 新增${names[kind] || kind}记录</button>
        </div>
        <div style="margin-top:8px;font-size:12px;color:var(--text-soft)">就医数据模板：疾病开始时间 / 症状 / 治疗的医疗场所 / 治疗方式 / 用药 / 程度。【健康】打卡卡的小病症状会自动同步到急诊科。</div>
        <div style="margin-top:10px;font-weight:700">历史记录（${recs.length}）</div>
        <div style="max-height:320px;overflow:auto">${rows || '<div class="empty">暂无记录，点击上方按钮新增</div>'}</div>
      </div>`,
      actions: [{ label: '关闭' }],
    });
  },
  // ====== v3.3 健康数据（原【记录·日律】迁入习惯 + 管家阿福健康分析 + 五脏六腑医学建模 · v2026.0906 由「日结中心」更名）======
  // 器官健康度颜色：85+绿 · 70-84 浅绿 · 55-69 黄 · 40-54 橙 · <40 红
  _afuOrganColor(sc) { return sc >= 85 ? '#22c55e' : sc >= 70 ? '#84cc16' : sc >= 55 ? '#eab308' : sc >= 40 ? '#f97316' : '#ef4444'; },
  _afuOrganLevel(sc) { return sc >= 85 ? '健康' : sc >= 70 ? '良好' : sc >= 55 ? '轻度受损' : sc >= 40 ? '中度受损' : '重度警报'; },
  // 五脏六腑建模：根据当日习惯数据推算各器官健康度（100 起扣分；结合疾病数据加重漏药影响）
  _afuOrganModel(s, hasChronic) {
    const O = [];
    const organ = (id, ico, name, hits) => {
      const w = hits.reduce((a, b) => a + b.w, 0);
      O.push({ id, ico, name, score: Math.max(0, Math.min(100, 100 - w)), hits: hits.filter(x => x.w > 0).map(x => x.t) });
    };
    const stayedUp = s.nightH > 0 && s.nightH < 6; // 熬夜：夜间睡眠不足 6h
    // v2026.0906 步数卡数据接入：s.stepsDone=当日步数卡已记录，s.stepsCount=步数值（以手机/智能手表为准如实填写）
    const stepsKnown = s.stepsDone && s.stepsCount > 0;
    // 🧠 脑：熬夜伤脑
    { const h = [];
      if (stayedUp) h.push({ w: Math.min(40, Math.round((6 - s.nightH) * 20)), t: `熬夜：仅睡 ${s.nightH}h（伤脑，认知与记忆修复受阻）` });
      if (s.sleepQuality > 0 && s.sleepQuality <= 2) h.push({ w: 10, t: `睡眠质量仅 ${s.sleepQuality} 星` });
      if (s.nightH > 6 && s.nightH < 7) h.push({ w: 5, t: `睡眠 ${s.nightH}h 略低于建议 7-9h` });
      organ('brain', '🧠', '脑', h);
    }
    // ❤️ 心：缺乏运动伤心（步数 ≥8000 抵扣 / <3000 久坐扣分）
    { const h = [];
      if (!s.fitnessDone && !s.sportMin) h.push({ w: 15, t: '今日无运动（心血管缺乏锻炼刺激）' });
      else if (!s.fitnessDone && s.sportMin < 20) h.push({ w: 8, t: `运动仅 ${s.sportMin}min，强度偏低` });
      if (stepsKnown) {
        if (s.stepsCount >= 8000) h.push({ w: -4, t: `步数 ${s.stepsCount.toLocaleString()} 步（日常活动量优秀）` });
        else if (s.stepsCount < 3000) h.push({ w: 10, t: `步数仅 ${s.stepsCount.toLocaleString()} 步（久坐风险，心功能得不到日常刺激）` });
        else if (s.stepsCount < 6000) h.push({ w: 5, t: `步数 ${s.stepsCount.toLocaleString()} 步，低于 6000 步活动量基准` });
      }
      organ('heart', '❤️', '心', h);
    }
    // 🌬️ 肺：吸烟饮酒伤肺（步数 ≥8000 同步护肺）
    { const h = [];
      if (s.zhenghunBreak) h.push({ w: 28, t: '大破魂：主动吸烟/饮酒（伤肺）' });
      else if (s.zhenghunSmall) h.push({ w: 10, t: '小破魂：被动吸入（二手烟）' });
      if (!s.fitnessDone && !s.sportMin) h.push({ w: 10, t: '缺乏有氧运动，肺活量无刺激' });
      if (stepsKnown) {
        if (s.stepsCount >= 8000) h.push({ w: -3, t: `步数 ${s.stepsCount.toLocaleString()} 步（呼吸循环得到充分锻炼）` });
        else if (s.stepsCount < 3000) h.push({ w: 5, t: `步数仅 ${s.stepsCount.toLocaleString()} 步（呼吸系统日常刺激不足）` });
      }
      organ('lung', '🌬️', '肺', h);
    }
    // 🍶 肝：熬夜伤肝 · 饮酒伤肝 · 漏药加重代谢负担 · v10.0 吃吃消奶茶/果汁糖分
    { const h = [];
      if (stayedUp) h.push({ w: Math.min(35, Math.round((6 - s.nightH) * 18)), t: `熬夜：仅睡 ${s.nightH}h（肝夜间排毒修复中断）` });
      if (s.zhenghunBreak) h.push({ w: 20, t: '大破魂：酒精摄入（肝代谢负担加重）' });
      if (hasChronic && s.medicineAVMissed) h.push({ w: 10, t: '漏服药物，肝代谢节律紊乱' });
      if (s.eatCostSugarG >= 40) h.push({ w: 12, t: `奶茶/果汁糖分约 ${Math.round(s.eatCostSugarG)}g（果糖直接经肝代谢，脂肪肝风险）` });
      else if (s.eatCostSugarG >= 20) h.push({ w: 6, t: `奶茶/果汁糖分约 ${Math.round(s.eatCostSugarG)}g（肝果糖代谢负担上升）` });
      if ((s.eatCostFruit || []).length >= 3) h.push({ w: 5, t: `水果 ${s.eatCostFruit.length} 份（大量果糖集中摄入，肝代谢压力）` });
      organ('liver', '🍶', '肝', h);
    }
    // 🍽 胃：不吃饭伤胃
    { const h = [];
      if (s.meals < 3) h.push({ w: Math.min(50, (3 - s.meals) * 25), t: `今日仅 ${s.meals}/3 餐（胃酸空转伤胃黏膜）` });
      organ('stomach', '🍽', '胃', h);
    }
    // 🟡 脾：不吃饭伤脾
    { const h = [];
      if (s.meals < 3) h.push({ w: Math.min(40, (3 - s.meals) * 15), t: `缺 ${3 - s.meals} 餐，脾运化无源` });
      if (s.waterMl > 0 && s.waterMl < 800) h.push({ w: 5, t: '饮水偏少，脾湿运化减弱' });
      organ('spleen', '🟡', '脾', h);
    }
    // 🫘 肾：熬夜/喝水少/大破气（手淫）伤肾 · v10.0 隐私洗不适（泌尿生殖区预警）
    { const h = [];
      if (stayedUp) h.push({ w: Math.min(30, Math.round((6 - s.nightH) * 15)), t: `熬夜：仅睡 ${s.nightH}h（肾精耗损）` });
      if (s.waterMl === 0) h.push({ w: 15, t: '今日几乎未饮水（肾排毒受阻）' });
      else if (s.waterMl < 800) h.push({ w: 8, t: `饮水仅 ${s.waterMl}ml（低于 800ml）` });
      if (s.zhengqiLevel === '大破气') h.push({ w: 18, t: '大破气（自慰）：肾精外泄' });
      else if (s.zhengqiLevel === '小破气') h.push({ w: 6, t: '小破气' });
      if (s.privacyWashSymptom) h.push({ w: s.privacyWashSymptom === '分泌物异常' ? 14 : 9, t: `隐私洗记录不适：${s.privacyWashSymptom}（泌尿/肛肠预警，持续 2 天请就医）` });
      else if (s.privacyWashDone) h.push({ w: -3, t: `隐私洗已完成（${(s.privacyWashParts || []).map(p => p === '清洗肛门' ? '肛门' : '私处').join('+') || '局部'}卫生到位）` });
      organ('kidney', '💧', '肾', h);
    }
    // 🌀 肠：未排便/憋便伤肠
    { const h = [];
      if (s.poopCnt === 0 && s.meals > 0) h.push({ w: 15, t: '今日未排便（毒素滞留肠道）' });
      else if (s.poopCnt > 3) h.push({ w: 8, t: `排便 ${s.poopCnt} 次偏多，留意肠道刺激` });
      organ('gut', '🌀', '肠', h);
    }
    // 🛡 免疫：漏服药物（结合疾病数据）重创免疫
    { const h = [];
      if (hasChronic && s.medicineAVMissed) h.push({ w: 45, t: '⚠️ 漏服抗病毒药物（病毒反弹风险，免疫防线最危险的行为）' });
      else if (hasChronic && !s.medicineTaken) h.push({ w: 25, t: '⚠️ 服药卡未打卡（疑似漏服，免疫防线风险）' });
      if (stayedUp) h.push({ w: 12, t: `熬夜 ${s.nightH}h（免疫细胞修复受阻）` });
      if (s.sleepQuality > 0 && s.sleepQuality <= 2) h.push({ w: 6, t: '睡眠质量差，免疫力下滑' });
      if (s.fitnessDone || s.sportMin >= 30) h.push({ w: -3, t: '' }); // 运动加分在分数中体现
      organ('immune', '🛡️', '免疫', h);
    }
    return O;
  },
  // 管家阿福 · 当日健康指数（0-100，基于当日习惯数据推理）
  _afuHealthIndex(s, hasChronic) {
    let sc = 60; const pts = []; // 60 基础分
    if (s.nightH >= 7 && s.nightH <= 9.5) { sc += 15; pts.push('睡眠充足'); }
    else if (s.nightH >= 6) { sc += 8; pts.push('睡眠基本够'); }
    else if (s.nightH > 0) { sc -= Math.round((6 - s.nightH) * 12); pts.push(`熬夜 ${s.nightH}h`); }
    if (s.meals === 3) { sc += 10; pts.push('三餐规律'); }
    else if (s.meals === 2) sc += 4;
    else if (s.meals <= 1) { sc -= (3 - s.meals) * 6; pts.push(`仅 ${s.meals} 餐`); }
    if (s.waterMl >= 1300) { sc += 8; pts.push('饮水达标'); }
    else if (s.waterMl >= 800) sc += 4;
    else if (s.waterMl > 0) sc -= 3;
    if (s.poopCnt >= 1) sc += 4;
    if (s.studyMin >= 60) sc += 4;
    if (s.sportMin >= 30 || s.fitnessDone) { sc += 5; pts.push('有运动'); }
    // v2026.0906 步数卡：≥6000 步计入健康指数（以手机/智能手表数据如实填写为前提）
    if (s.stepsDone && s.stepsCount >= 6000) { sc += 3; pts.push(`步数 ${s.stepsCount.toLocaleString()} 步`); }
    else if (s.stepsDone && s.stepsCount > 0 && s.stepsCount < 3000) sc -= 3;
    if (s.napMin >= 10 && s.napMin <= 90) sc += 3;
    // v2026.0906 健康卡·大病复查：按时随访是积极管理（+3），复查记录同步感染科
    if (s.healthRecheck) { sc += 3; pts.push(`${s.healthRecheck.disease} 复查已随访`); }
    if (s.zhengqiClean) sc += 4;
    else if (s.zhengqiLevel === '大破气') sc -= 8;
    if (s.sleepQuality >= 4) sc += 3;
    if (hasChronic) {
      if (s.medicineAVMissed) { sc -= 20; pts.push('漏服药物'); }
      else if (!s.medicineTaken) { sc -= 10; pts.push('服药未打卡'); }
      else if (s.medicineTaken && !s.medicineAVMissed) sc += 6;
    }
    return { score: Math.max(0, Math.min(100, Math.round(sc))), pts };
  },
  _afuHealthAnalysis(s, organs) {
    const idx = this._afuHealthIndex(s, organs.hasChronic);
    const lv = idx.score >= 90 ? '优秀' : idx.score >= 75 ? '良好' : idx.score >= 60 ? '及格' : idx.score >= 40 ? '亚健康' : '亮红灯';
    const worst = organs.list.filter(o => o.score < 85).sort((a, b) => a.score - b.score).slice(0, 3);
    const facts = [];
    facts.push(s.nightH > 0 ? `昨晚睡了 ${s.nightH} 小时` : '早安卡未记录起床时间');
    facts.push(`吃了 ${s.meals}/3 餐`);
    facts.push(`喝了 ${s.waterMl || 0}ml 水`);
    if (s.poopCnt > 0) facts.push(`排便 ${s.poopCnt} 次`);
    if (s.sportMin > 0 || s.fitnessDone) facts.push(`运动 ${s.sportMin || 0} 分钟${s.fitnessDone ? '（含健身）' : ''}`);
    if (s.stepsDone && s.stepsCount > 0) facts.push(`步行 ${s.stepsCount.toLocaleString()} 步`);
    if (s.studyMin > 0) facts.push(`学习 ${s.studyMin} 分钟`);
    facts.push(s.zhengqiClean === true ? '正气未破' : (s.zhengqiLevel ? `正气${s.zhengqiLevel}` : '正气未记录'));
    // v2026.0906 新卡事实：心情 / 健康
    if (s.moodCnt > 0) facts.push(`心情记录 ${s.moodCnt} 次${s.moodLastType ? '（最近：' + s.moodLastType + '）' : ''}`);
    if (s.healthStatus) facts.push(s.healthSick ? `健康：小病缠身${s.healthSymptoms && s.healthSymptoms.length ? '（' + s.healthSymptoms.join('、') + '）' : ''}` : (s.healthRecheck ? `健康：大病复查 ${s.healthRecheck.disease}（${(s.healthRecheck.acts || []).join('、') || '复查'}）${s.medCostAmount > 0 ? ' · 医疗消费 ' + s.medCostAmount + ' 元' : ''}` : '健康：感觉良好'));
    let worstTxt = worst.length
      ? worst.map(o => `${o.ico}${o.name} ${o.score} 分（${this._afuOrganLevel(o.score)}${o.hits.length ? '：' + o.hits[0] : ''}）`).join('；')
      : '各器官状态良好，继续保持';
    const goodPts = idx.pts.filter(p => p !== '').slice(0, 3);
    const tips = [];
    if (s.nightH > 0 && s.nightH < 7) tips.push('今晚 23:00 前熄灯补回睡眠债');
    if (s.meals < 3) tips.push('下一餐按时吃，胃经不起折腾');
    if (s.waterMl < 1300) tips.push('把水杯续上，小口多次喝到 1300ml');
    if (!s.sportMin && !s.fitnessDone) tips.push('饭后快走 20 分钟也算运动');
    if (worst.some(o => o.hits.some(h => h.includes('漏服')))) tips.push('⚠️ 立即补服今晚的药物并设好每日闹钟');
    if (!tips.length) tips.push('节奏很好，保持当前作息即可');
    const chain = `推理链：${facts.join('，')} → 阿福为您推算今日健康指数 ${idx.score} 分（${lv}）。`;
    return { idx: idx.score, lv, chain, worst: worstTxt, good: goodPts, tips: tips.slice(0, 3) };
  },
  // v2026.0906 阿福就医建议：健康卡「小病缠身」症状 → 分级就医指导（健康数据数据同步后展示）
  // lv：3=紧急（症状可能快速恶化，优先急诊）/ 2=警示（按加重条件转专科）/ 1=自护（先居家观察，限期不愈再就诊）
  _afuMedAdvice(symptoms) {
    const M = {
      '发烧':     { lv: 2, ico: '🌡️', t: '监测体温多饮水休息；≥38.5℃ 或持续 3 天以上 → 发热门诊' },
      '腹泻':     { lv: 2, ico: '🚻', t: '口服补液盐防脱水；水样便 >5 次/日或带血 → 急诊' },
      '便秘':     { lv: 1, ico: '🧻', t: '增加膳食纤维与饮水，顺时针揉腹；>3 天不缓解 → 消化内科' },
      '偏头痛':   { lv: 2, ico: '🤕', t: '暗室休息避免声光刺激；反复发作 → 神经内科' },
      '咽痛':     { lv: 2, ico: '😮‍💨', t: '温盐水漱口多休息；扁桃体化脓或伴高热 → 呼吸内科' },
      '口腔溃疡': { lv: 1, ico: '👄', t: '淡盐水漱口，补充维生素 B 族；2 周不愈 → 口腔科' },
      '低血糖':   { lv: 3, ico: '🍬', t: '立即进食 15g 快糖（糖果/果汁），15 分钟后复测；意识模糊 → 急诊' },
      '荨麻疹':   { lv: 3, ico: '🌿', t: '口服抗组胺药；出现喉头发紧/呼吸困难 → 立即急诊（过敏性休克风险）' },
      '真菌感染': { lv: 1, ico: '🍄', t: '患处保持干燥透气，规范使用抗真菌药足疗程；反复 → 皮肤科' },
      '中耳炎':   { lv: 2, ico: '👂', t: '避免耳道进水；耳痛加剧或听力下降 → 耳鼻喉科' },
      '结膜炎':   { lv: 2, ico: '👁️', t: '毛巾单独使用防传染；分泌物多或畏光 → 眼科' },
      '流血':     { lv: 3, ico: '🩸', t: '清洁后持续按压 5-10 分钟；无法止血或大量出血 → 立即急诊' },
    };
    const list = (symptoms || []).map(s => Object.assign({ s }, M[s] || { lv: 1, ico: '🩺', t: '注意休息观察；症状加重或持续不退 → 及时就诊' }));
    list.sort((a, b) => b.lv - a.lv);
    return { list, urgent: list.some(x => x.lv >= 3) };
  },
  // 近 7 日 vs 前 7 日：器官均分对比 → 恶化器官 + 主因统计（健康数据周趋势洞察用）
  _afuOrganTrend() {
    const h = Store.getHabit99();
    const mr = (Store.load().medicalRecords || []);
    const hasChronic = mr.some(r => (r.tags || []).includes('hiv') || (r.tags || []).includes('tp') || r.disease === 'hiv' || r.disease === 'tp');
    const bucket = (from, to) => {
      const acc = {}; const hits = []; let cnt = 0, idxSum = 0;
      for (let i = from; i <= to; i++) {
        const dk = this._hb99DkOff(i);
        const day = (h.days || {})[dk];
        if (!day || !Object.keys(day).length) continue;
        const s = Store._habit99SummaryOf(h, dk);
        cnt++; idxSum += this._afuHealthIndex(s, hasChronic).score;
        this._afuOrganModel(s, hasChronic).forEach(o => { acc[o.id] = (acc[o.id] || 0) + o.score; (o.hits || []).forEach(t => hits.push(t)); });
      }
      return { cnt, idx: cnt ? Math.round(idxSum / cnt) : null, acc, hits };
    };
    const cur = bucket(-6, 0), prev = bucket(-13, -7);
    if (!cur.cnt || !prev.cnt) return null; // 两周都有打卡数据才可比
    const names = {};
    for (let i = 0; i >= -13; i--) {
      const dk = this._hb99DkOff(i);
      const day = (h.days || {})[dk];
      if (day && Object.keys(day).length) { this._afuOrganModel(Store._habit99SummaryOf(h, dk), hasChronic).forEach(o => names[o.id] = { ico: o.ico, name: o.name }); break; }
    }
    const drops = [];
    Object.keys(names).forEach(id => {
      const c = cur.acc[id] / cur.cnt, p = (prev.acc[id] || 0) / prev.cnt;
      if (c - p <= -4) drops.push({ id, d: Math.round(c - p), ...names[id] }); // 均分下滑 ≥4 分才提示
    });
    drops.sort((a, b) => a.d - b.d);
    const cntOf = (re) => cur.hits.filter(t => re.test(t)).length;
    const reasons = [];
    const lateNights = cntOf(/熬夜/), missed = cntOf(/漏服|服药卡未打卡/), noMove = cntOf(/无运动|缺乏/), lessMeals = cntOf(/餐（|餐，/), lessWater = cntOf(/饮水|未饮水/), smoke = cntOf(/吸烟|酒精|破魂/);
    if (lateNights) reasons.push(`熬夜${lateNights}次`);
    if (missed) reasons.push(`漏药${missed}次`);
    if (lessMeals) reasons.push(`缺餐${lessMeals}次`);
    if (noMove) reasons.push(`缺乏运动${noMove}次`);
    if (lessWater) reasons.push(`饮水不足${lessWater}次`);
    if (smoke) reasons.push(`烟酒${smoke}次`);
    return { drops: drops.slice(0, 2), reasons: reasons.slice(0, 3), idxDelta: cur.idx - prev.idx, curIdx: cur.idx };
  },
});
