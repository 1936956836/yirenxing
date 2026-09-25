// 存储层 - 基于 localStorage 的数据持久化
// [功能组] G1-系统内核（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）

const Store = {
  KEY: 'life_tracker_data_v3', // v3: 重置存档（男巫周末战斗 + 种子倒计时）

  // 读取全部数据
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this._empty();
      const d = JSON.parse(raw);
      return this._migrate(d);
    } catch (e) {
      console.error('读取数据失败', e);
      return this._empty();
    }
  },

  // 空数据骨架
  _empty() {
    return {
      records: {}, streak: 0, settings: {},
      coins: { balance: 0, dailyGranted: {} }, // 金币余额、每日发放记录（v3.5：cashVoucher 现金券字段已移除；v3.99：旧 lottery 字段已移除）
      coinLogs: [],      // [{id, date, type:'grant'|'exchange', amount, reason}]
      // v3.5：exchanges（金币→现金券兑换历史）已随现金券体系移除
      ledger: [],        // [{id,date,amount,category,note,violation}]
      diaries: [],       // [{id,date,title,content,tags[],mood}]
      tickets: 0,      // 钻石余额（历史遗留字段：当前无产出/消耗，仅随存档同步保留）
      ticketLogs: [],   // 钻石流水
      profile: { birthDate:'', mbti:'', height:0, weight:0, zodiac:'', starSign:'', major:'' }, // NewReq 3 用户可自填个性档案（空字符串=未填；v12.9.3 major=所学专业→练习站专业课题库）
      systemLogs: {},    // 系统运行日志 { 'YYYY-MM-DD': [{ts,action,detail}] }
      snapshots: [],     // 每周快照
      goals: [],         // 目标系统
      // v2.0.5：就医数据/就诊时间线（v6.9 原【病历】更名）—— 支持慢性病定期复诊 & 突发症状快速记录；按病症自动统计发作次数
      medicalRecords: [
        // {id, date:YYYY-MM-DD, time:HH:MM, disease, type:'chronic'|'acute'|'visit',
        //  severity:1~5 (1轻微 2一般 3中等 4严重 5紧急),
        //  symptoms:[], medicines:[], hospital:'', doctor:'', diagnose:'',
        //  temperature:'', bloodPressure:'', heartRate:'', weight:'',
        //  note:'', createdAt, updatedAt, tags:[]}
      ],
      workbench: {       // 板块子页共用状态容器（习惯/记录等子页；_ensureWbToday 按日期重置）
        date: '',
        todoPlans: [],   // [{id,title,target,createdAt,done}]
        memory: { daily: [], review: [], stats: {}, doneToday: false, lastDate: '' }, // 艾宾浩斯记录
        read: { totalMs: 0, lastSettleMs: 0, sessions: {}, date: '' }, // 阅读计时
        rewards: { ledgerGiven: false, diaryGiven: false, memoryGiven: false, readGivenTotal: 0, date: '' },
      },
      // ===== v3.99 习惯打卡（13 张小卡 · days[YYYY-MM-DD][cardId]）=====
      habit99: { days: {}, archive: {}, makeups: [] }, // archive：>180 天旧明细的压缩冷存（数据安全）
      // v3.99 记录板块·记事/反省书
      wbNotes99: [],
      // ===== v11.2 记录板块·灵光（灵光乍现时刻 · 无需完成的憧憬）=====
      // [{id,date:'YYYY-MM-DD',ts:ISOString,kind:'dream|do|learn|go|be|idea',text,star:bool}]
      wbSparks99: [],
      // ===== v11.3 记录板块·憾潮（灵光乍现，憾潮汹涌 · 后悔的事 + 殴打发泄）=====
      // [{id,date,ts,text,hits:int(发泄拳数),healed:bool(≥88拳后已释怀),healedTs}]
      wbRegrets99: [],
      // ===== v11.9 记录板块·拾梦（醒来速记梦境 · 语音/文字 · 阿福AI整理）=====
      // [{id,date:'YYYY-MM-DD',ts:ISOString,title,raw:原始速记,text:整理后正文(未整理时=raw),
      //   mood:int(0未选/1-5),lucid:bool(清醒梦),wake:bool(醒后黄金时段记录),polished:bool,polishedTs}] 上限 500 条
      wbDreams99: [],
      // ===== v12.0 记录板块·漂流（烦恼负面情绪 · 封瓶后自己也不可见 · 海洋打捞/放生释怀）=====
      // {bottles:[{id,date:'YYYY-MM-DD',ts:ISOString,days:int(1-100),endsAt:ts,seal:封瓶内容(b64轻封存),
      //            released:bool(已放生·内容已删),releasedTs,opened:bool(已开瓶),openedTs,salvages:int(被捞次数)}] 活跃瓶上限 30,
      //  creatures:{生物id:遇到次数},salvages:int(总打捞次数),lastSalvageTs:ms,discarded:int(随风而去次数)}
      wbDrift99: { bottles: [], creatures: {}, salvages: 0, lastSalvageTs: 0, discarded: 0 },
      // ===== v11.3 记录板块·足迹（走过的中国 · 34 省级行政区点亮）=====
      // [{id,prov:'省id',city:'城市名',isCapital:bool,date:'YYYY-MM-DD',ts}] 上限 500 条
      wbFootprints99: [],
      // ===== v6.8 记录板块·倒数日/纪念日（自待办拆出，数据分离存储）=====
      countdowns: [],  // [{id,kind:'cd',title,date,note,createdAt}] 目标日期倒计时
      memorials: [],   // [{id,kind:'mem',title,date,note,createdAt}] 按年倒数·周年自动+1
      // ===== v12.9 数据中心·运动数据（分析站体测记录 + 聚神运动/学习会话）=====
      // measures: [{id,date:'YYYY-MM-DD',ts,weight,fat, neck,shoulder,chest,waist,hip,lArm,rArm,lThigh,rThigh,lCalf,rCalf,note}]
      //   同日多次测量按时间倒序保留全部（图表取每日最新值）；上限 500 条
      // workouts: [{id,date,ts,endTs,durMin,mode:'cardio'|'strength',cal,hr,sets,dist,note}] 上限 500 条
      // studies:  [{id,date,ts,endTs,durMin,subject,note}] 上限 500 条
      // settings: {targetWeight:0,calMetric:'weight'}
      sport99: { measures: [], workouts: [], studies: [], settings: { targetWeight: 0 } },
      // ===== v12.9 数据中心·学习数据（87-study99.js 专用）=====
      // points: [{id,subject,name,mastered:0|1,ts,mTs}] 知识点（mTs=掌握时间戳）上限 500
      // practices: [{id,date,ts,practice,subject,total,correct,note}] 练习记录 上限 500
      // 学习会话不在 study99——直接复用 sport99.studies（聚神·学习结束写入），一处数据两处可用
      study99: { points: [], practices: [] },
      // ===== v12.9.50 个人用药清单 meds99（非授权账号自定义 · 随云账号同步隔离）=====
      // list: [{id, name, dose, time, perDay, icon, custom:true}] 自填药物（默认空——吃什么药自己填）
      // checkinOn: bool 「吃药」习惯打卡手动开启（默认关，不开启不生效）
      meds99: { list: [], checkinOn: false },
      // ===== v12.9.50 经期数据 period99（女生专属 · 档案性别=女 才解锁 · 随云账号同步隔离）=====
      // logs: [{date:'YYYY-MM-DD', flow:'无|少|中|多', pain:'无|轻微|中度|重度', symptoms:[], moods:[], note}] 上限 800 条
      // settings: { cycleLen: 28, periodLen: 5 } 无历史数据时的预测基准
      period99: { logs: [], settings: { cycleLen: 28, periodLen: 5 } },
    };
  },

  // 数据升级（向后兼容旧结构）
  _migrate(d) {
    const e = this._empty();
    const out = Object.assign({}, e, d || {});
    if (!out.records) out.records = {};
    if (!out.settings) out.settings = {};
    if (!out.coins) out.coins = e.coins;
    if (!out.coinLogs) out.coinLogs = [];
    // v3.5 货币体系迁移：彻底清理老存档中已下线货币体系的遗留字段；v3.99：同步清理旧彩票系统字段；
    // v12.6 大扫除：历史版本已下线功能残存在存档里的死数据一并清除——无人读它，还给存档瘦身
    ['points','pointsLogs','medals','medalLogs','honors','fx','exchanges','lottery',
     'corgi','hiddenTask','witch','farm','wilderness','pasture','restaurant','guessGame','stocks','events',
     'launchRewarded','neighbors','blog','entTasks'].forEach(k => {
      if (k in out) { try { delete out[k]; } catch(_) {} }
    });
    if (out.coins && 'cashVoucher' in out.coins) { try { delete out.coins.cashVoucher; } catch(_) {} }
    if (!out.ledger) out.ledger = [];
    if (!out.diaries) out.diaries = [];
    if (out.tickets === undefined) out.tickets = 0;
    if (!out.ticketLogs) out.ticketLogs = [];
    // NewReq 3 个性档案（v3.5：fx 汇率字段已随旧货币体系移除）
    if (!out.profile) out.profile = {};
    const pDef = e.profile || { birthDate:'', mbti:'', height:0, weight:0 };
    ['birthDate','mbti','zodiac','starSign','gender','major'].forEach(k => { if (typeof out.profile[k] !== 'string') out.profile[k] = (pDef[k] || ''); });
    ['height','weight'].forEach(k => { if (typeof out.profile[k] !== 'number') { const v = pDef[k]; out.profile[k] = typeof v === 'number' ? v : 0; } });
    if ('fx' in out) try { delete out.fx; } catch(_) {}
    if (!out.systemLogs) out.systemLogs = {};
    if (!out.snapshots) out.snapshots = [];
    if (!out.goals) out.goals = [];
    if (!out.medicalRecords || !Array.isArray(out.medicalRecords)) out.medicalRecords = [];
    const eb = e.workbench;
    if (!out.workbench) out.workbench = eb;
    else {
      const w = out.workbench;
      if (!w.todoPlans) w.todoPlans = [];
      if (!w.memory) w.memory = eb.memory;
      // 清理旧版的 news / rewards.newsGiven，避免字段冗余导致的异常
      try { if ('news' in w) delete w.news; } catch(_) {}
      if (!w.read) w.read = eb.read;
      if (!w.rewards) { w.rewards = eb.rewards; }
      else {
        if ('newsGiven' in w.rewards) try { delete w.rewards.newsGiven; } catch(_){}
        if (w.rewards.ledgerGiven === undefined) w.rewards.ledgerGiven = false;
        if (w.rewards.diaryGiven === undefined) w.rewards.diaryGiven = false;
        if (w.rewards.memoryGiven === undefined) w.rewards.memoryGiven = false;
        if (w.rewards.readGivenTotal === undefined) w.rewards.readGivenTotal = 0;
        if (w.rewards.date === undefined) w.rewards.date = '';
      }
      // v3.5：任务宝箱字段（w.chests）已随旧货币体系移除，不再迁移
      if ('chests' in w) try { delete w.chests; } catch(_) {}
    }
    // v12.9.50 个人用药清单 meds99：自填药物 + 「吃药」打卡开关（非授权账号专用）
    if (!out.meds99 || typeof out.meds99 !== 'object' || Array.isArray(out.meds99)) out.meds99 = e.meds99;
    else {
      if (!Array.isArray(out.meds99.list)) out.meds99.list = [];
      if (typeof out.meds99.checkinOn !== 'boolean') out.meds99.checkinOn = false;
    }
    // v12.9.50 经期数据 period99（女生专属）：日志 + 预测基准设置
    if (!out.period99 || typeof out.period99 !== 'object' || Array.isArray(out.period99)) out.period99 = e.period99;
    else {
      if (!Array.isArray(out.period99.logs)) out.period99.logs = [];
      if (!out.period99.settings || typeof out.period99.settings !== 'object') out.period99.settings = { cycleLen: 28, periodLen: 5 };
      const c = parseInt(out.period99.settings.cycleLen, 10); if (!(c >= 18 && c <= 45)) out.period99.settings.cycleLen = 28;
      const l = parseInt(out.period99.settings.periodLen, 10); if (!(l >= 2 && l <= 10)) out.period99.settings.periodLen = 5;
    }
    return out;
  },

  // 生成唯一ID
  _id() {
    return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // 保存全部数据
  // v2026.0906-8 配额兜底：写入失败（QuotaExceededError 等）此前只 console.error 静默吞掉——
  // 用户继续操作产生「假保存」，进程结束即整段丢失。现三级自救（瘦身降级保核心数据）+
  // 状态跃迁时经 _onWriteFail 钩子通知 App 层自动导出兜底：
  //   ① 剥离 snapshots（12 份全量快照 = 最大体积户）重试 → _writeFailed='slim'
  //   ② 再剥流水日志（coinLogs/ticketLogs 只留近 30 条）重试    → _writeFailed='core'
  //   ③ 仍失败：置 'fatal'，App 层弹告警 + 自动下载内存中最新完整数据
  // 恢复正常写入后标志自动复位（_writeFailed=null），App 层可据此解除告警。
  save(data) {
    try {
      // v12.9.21 数据总线：落盘前取旧串 → 落盘后按登记域 diff 广播（跨模块联动统一走 bus，不再散落直调）
      // 性能：① 新旧整串相等快速跳过；② 只 diff DOMAIN_GROUPS 已登记域（snapshots 等大冷数据不参与，防移动端卡顿）
      let rawOld = null;
      try { rawOld = localStorage.getItem(this.KEY); } catch (_) {}
      const newStr = JSON.stringify(data);
      localStorage.setItem(this.KEY, newStr);
      this._writeFailed = null;
      // v11.4 云账户钩子：落盘成功后通知云同步引擎（更新本地 mtime + 节流自动上传；
      // 未登录/未配置时此钩子内部直接 return，零开销不影响本地）
      try { if (typeof App !== 'undefined' && App.cloud99OnSave) App.cloud99OnSave(); } catch (_) {}
      // v12.9.21 广播变更域（无旧值=首次写入视为 records+habit99 初始化）
      try {
        if (rawOld !== newStr) {
          let changed = [];
          if (rawOld == null) {
            changed = ['records', 'habit99'];
          } else {
            let old = null;
            try { old = JSON.parse(rawOld); } catch (_) {}
            if (old) {
              Object.keys(this.DOMAIN_GROUPS).forEach(k => {
                try { if (JSON.stringify(data[k]) !== JSON.stringify(old[k])) changed.push(k); } catch (_) { changed.push(k); }
              });
            }
          }
          if (changed.length) this.bus.emit(changed);
        }
      } catch (_) {}
      return true;
    } catch (e) {
      console.error('保存数据失败', e);
      // 状态跃迁才通知（避免每次失败调用都重复弹窗/下载）
      const prev = this._writeFailed || null;
      // ① 剥离快照重试（快照可在低占用时重建，核心 records 优先保住）
      try {
        const slim = JSON.parse(JSON.stringify(data));
        delete slim.snapshots;
        localStorage.setItem(this.KEY, JSON.stringify(slim));
        this._writeFailed = 'slim';
        if (prev !== 'slim') this._emitWriteFail('slim', data);
        return 'slim';
      } catch (e2) {}
      // ② 再剥流水日志重试（日志为可再生的运行数据）
      try {
        const core = JSON.parse(JSON.stringify(data));
        delete core.snapshots;
        if (Array.isArray(core.coinLogs)) core.coinLogs = core.coinLogs.slice(0, 30);
        if (Array.isArray(core.ticketLogs)) core.ticketLogs = core.ticketLogs.slice(0, 30);
        localStorage.setItem(this.KEY, JSON.stringify(core));
        this._writeFailed = 'core';
        if (prev !== 'core') this._emitWriteFail('core', data);
        return 'core';
      } catch (e3) {}
      // ③ 回天乏术：本地无法落盘，交 App 层自动导出内存完整数据
      this._writeFailed = 'fatal';
      if (prev !== 'fatal') this._emitWriteFail('fatal', data);
      return false;
    }
  },
  // 写入失败通知（storage 层不依赖 DOM，经钩子解耦；fullData = 内存中最新完整状态）
  _emitWriteFail(level, fullData) {
    try {
      if (typeof this._onWriteFail === 'function') this._onWriteFail(level, fullData);
    } catch (_) {}
  },

  // 统一取"北京时间毫秒 / Date / YYYY-MM-DD / HH:MM:SS"
  // 用户系统时区如果不是 UTC+8，会换算，避免跨国跨时区打卡越界
  nowBeijing() {
    // 把本地 Date 的 UTC 毫秒 + 8h 偏移后按本地时区解析，这样用户本地 Date.getHours() 拿到的就是北京时间的小时
    const utcMs = Date.now() + (new Date()).getTimezoneOffset() * 60000; // epoch in UTC
    const bjMs = utcMs + 8 * 3600 * 1000; // UTC+8
    return bjMs;
  },
  beijingDate(ms) { return new Date(ms == null ? this.nowBeijing() : ms); },
  todayBJ() {
    const d = this.beijingDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
  today() {
    // 强烈建议新代码调用 todayBJ()；这里为了兼容老数据保留 today() 但内部升级为北京时间
    return this.todayBJ();
  },

  fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // ===== 打卡时间窗（北京时间）——所有窗都用 [startMinuteOfDay, endMinuteOfDay) 左闭右开 =====
  // window name -> [{start:'HH:MM', end:'HH:MM'}, ...] 多段
  PUNCH_WINDOWS: {
    breakfast: [{ start: '06:30', end: '09:30' }],
    lunch:     [{ start: '11:30', end: '14:30' }],
    dinner:    [{ start: '17:30', end: '20:30' }],
    // snack 已删除（用户认为加餐概念太模糊）；留仅注释占位，未来恢复可再加
    // snack:     [{ start: '21:00', end: '24:00' }, { start: '00:00', end: '04:00' }],
    sleepNight: [{ start: '21:00', end: '23:00' }],   // 晚安卡
    sleepMorning: [{ start: '06:00', end: '08:00' }], // 早安卡
    sleepNoon:   [{ start: '13:00', end: '14:00' }],  // 午安卡
    // 卫生 6 小窗
    hygFace:    [{ start: '06:00', end: '09:00' }],
    hygOral:    [{ start: '06:30', end: '08:30' }, { start: '20:00', end: '22:00' }],
    hygPrivate: [{ start: '21:00', end: '23:00' }],
    hygFoot:    [{ start: '21:00', end: '23:00' }],
    hygSheet:   [{ start: '00:00', end: '24:00', onlyWeekday: [6,0] }], // 只周六(6)日(0)
    hygDesk:    [{ start: '20:00', end: '22:00' }],
    // 运动 6 小窗
    exSteps:    [{ start: '06:00', end: '22:00' }],
    exCardio:   [{ start: '06:00', end: '22:00' }],
    exAnaerobic:[{ start: '17:00', end: '21:00' }],
    exWarmup:   [{ start: '20:00', end: '22:00' }],
    exStretch:  [{ start: '20:00', end: '22:00' }],
    exStand:    [{ start: '09:00', end: '18:00' }],
    // 学习 6 小窗
    lnListen:   [{ start: '06:00', end: '23:00' }],
    lnRead:     [{ start: '06:00', end: '23:00' }],
    lnPol:      [{ start: '06:00', end: '23:00' }],
    lnMath:     [{ start: '06:00', end: '23:00' }],
    lnCs:       [{ start: '06:00', end: '23:00' }],
    lnMeditate: [{ start: '06:00', end: '23:00' }],
    // 健康 6 小窗
    hlMedMorn:  [{ start: '06:00', end: '08:00' }],
    hlMedNoon:  [{ start: '11:00', end: '13:00' }],
    hlMedNight: [{ start: '19:00', end: '21:00' }],
    hlBp:       [{ start: '07:00', end: '09:00' }, { start: '20:00', end: '22:00' }],
    hlWater:    [{ start: '06:00', end: '23:00' }], // 达标式：饮水≥goal才算
    hlTemp:     [{ start: '20:00', end: '22:00' }],
  },

  _hmToMin(hm) {
    const [h, m] = hm.split(':').map(Number);
    return h * 60 + m;
  },
  _minOfDayBJ(nowMs) {
    const d = this.beijingDate(nowMs);
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  },
  _startOfTodayBJ(nowMs) {
    const d = this.beijingDate(nowMs);
    d.setHours(0,0,0,0);
    // d 是"北京时间 00:00 时用本地时间坐标的 Date"→返回 ms 要和 nowBeijing() 在同一坐标系下
    return d.getTime();
  },

  // 返回 {open, waitMs, nextKind:'open'|'closed', windowLabel, closeLeftMs, todayMs}
  punchWindowStatus(name, nowMs) {
    if (nowMs === undefined) nowMs = this.nowBeijing();
    const wins = (this.PUNCH_WINDOWS[name] || []).slice();
    if (wins.length === 0) return { open: true, waitMs: 0, nextKind: 'open', windowLabel: '全天可打卡', closeLeftMs: Infinity };
    const startOfToday = this._startOfTodayBJ(nowMs); // 北京时间 00:00（本地时间坐标下的 Date.getTime()）
    const moday = this._minOfDayBJ(nowMs); // 0~1440 连续分钟（含小数）
    // 把 snack 跨天段处理：[{21,24},{0,4}] → [{21,28}]，下一天 21-24 继续
    const flat = wins.map(w => {
      const s = this._hmToMin(w.start), e = this._hmToMin(w.end === '24:00' ? '23:59' : w.end) + (w.end === '24:00' ? 1 : 0);
      return Object.assign({}, w, { s, e });
    });
    // onlyWeekday 过滤：如果只在周末但今天不是周末，视为 0 段
    const todayWeekday = this.beijingDate(nowMs).getDay();
    const realFlat = flat.filter(w => !w.onlyWeekday || w.onlyWeekday.indexOf(todayWeekday) >= 0);
    // 是否命中某个段：s <= moday < e
    for (const w of realFlat) {
      if (moday >= w.s && moday < w.e) {
        return {
          open: true,
          waitMs: 0,
          nextKind: 'closed',
          windowLabel: '打卡开放中',
          closeLeftMs: Math.round((w.e - moday) * 60 * 1000),
        };
      }
    }
    // 没命中 -> 找"最近下一个打开的起点"（可能是今天的，也可能明天首个）
    let candidate = null;
    // 今日剩余段中最早的 s
    for (const w of realFlat) {
      if (s_closedBefore(w.s, moday)) {
        const wait = Math.max(0, (w.s - moday) * 60 * 1000);
        if (candidate == null || wait < candidate.waitMs) candidate = { waitMs: wait, label: `距开放 ${msToHMS(wait)}` };
      }
    }
    // 明天的最早一段（取 wins 里的最小 s，+ 1 天）
    const tomorrowEarliest = Math.min(...wins.map(w => this._hmToMin(w.start)));
    const waitTomorrow = (1440 - moday + tomorrowEarliest) * 60 * 1000;
    if (candidate == null || waitTomorrow < candidate.waitMs) {
      candidate = { waitMs: Math.round(waitTomorrow), label: `距开放 ${msToHMS(waitTomorrow)}` };
    }
    return { open: false, waitMs: candidate.waitMs, nextKind: 'open', windowLabel: candidate.label, closeLeftMs: 0 };
    function s_closedBefore(s, m) { return s >= m; }
    function msToHMS(ms) {
      ms = Math.max(0, Math.round(ms));
      const s = Math.floor(ms / 1000);
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
      return (h > 0 ? (h + ':') : '') + String(m).padStart(h > 0 ? 2 : 1, '0') + ':' + String(ss).padStart(2, '0');
    }
  },

  // 规范化记录：补齐后续版本新增的缺失字段（兼容旧数据）
  normalize(rec) {
    if (!rec) return rec;
    if (!rec.habit) rec.habit = { relapsed: false, time: '', note: '' };
    if (!rec.achievements) rec.achievements = {};
    if (!rec.medications) rec.medications = {};
    if (!rec.sleep) rec.sleep = { night: { slept: false }, noon: { slept: false } };
    if (!rec.diet) rec.diet = { water: 0, meals: {} };
    if (!rec.diet.bowel) rec.diet.bowel = { count: 0, type: '' };
    if (!rec.hygiene) rec.hygiene = {};
    if (!rec.exercise) rec.exercise = { steps: 0, groups: [] };
    if (!rec.learning) rec.learning = { subjects: {} };
    // 迁移旧学习学科结构：subjects[学科] 为数字 → { hours, notes } 对象
    if (rec.learning && rec.learning.subjects) {
      Object.keys(rec.learning.subjects).forEach(k => {
        const v = rec.learning.subjects[k];
        if (typeof v === 'number') {
          rec.learning.subjects[k] = { hours: v, notes: '' };
        } else if (v && typeof v === 'object' && !('notes' in v)) {
          v.notes = v.notes || '';
        }
      });
    }
    return rec;
  },

  // 获取指定日期记录（不存在则创建）
  getDay(dateStr) {
    dateStr = dateStr || this.today();
    const data = this.load();
    if (!data.records[dateStr]) {
      data.records[dateStr] = createDayRecord(dateStr);
      this.save(data);
    } else {
      // 兼容旧数据：补齐后续版本新增的缺失字段
      const hadHabit = !!data.records[dateStr].habit;
      this.normalize(data.records[dateStr]);
      if (!hadHabit) this.save(data);
    }
    return data.records[dateStr];
  },

  // 更新指定日期记录
  updateToday(patch) {
    const data = this.load();
    const today = this.today();
    if (!data.records[today]) data.records[today] = createDayRecord(today);
    Object.assign(data.records[today], patch);
    this.save(data);
  },

  // 更新今日某模块
  updateTodayModule(module, patch) {
    const data = this.load();
    const today = this.today();
    if (!data.records[today]) data.records[today] = createDayRecord(today);
    const rec = data.records[today];
    if (!rec[module]) rec[module] = {};
    Object.assign(rec[module], patch);
    this.save(data);
    return rec[module];
  },

  // 切换布尔状态（用于勾选项）
  getRecentDays(n) {
    const data = this.load();
    const arr = [];
    const d = new Date();
    for (let i = 0; i < n; i++) {
      const ds = this.fmtDate(d);
      arr.push({ date: ds, record: data.records[ds] || null });
      d.setDate(d.getDate() - 1);
    }
    return arr;
  },

  // 计算连续达标天数
  calcStreak() {
    const data = this.load();
    const d = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const ds = this.fmtDate(d);
      const rec = data.records[ds];
      if (rec && this.isDayComplete(rec)) {
        streak++;
      } else if (i > 0) {
        // 允许今日未完成，但从昨日开始计算
        break;
      }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  },

  // 判断某日是否达标（最低额度全部完成）
  isDayComplete(rec) {
    if (!rec) return false;
    const achs = rec.achievements || {};
    const minAchievements = CONFIG.achievements.filter(a => a.type === 'min');
    return minAchievements.every(a => achs[a.id]);
  },

  // 获取累计达标天数
  getHabitWeeklyCount() {
    const data = this.load();
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const ds = this.fmtDate(d);
      const rec = data.records[ds];
      if (rec && rec.habit && rec.habit.relapsed) count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  },

  // 戒手冲：连续戒断天数（从今日往前数到最近一次破戒）
  getHabitStreak() {
    const data = this.load();
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = this.fmtDate(d);
      const rec = data.records[ds];
      if (rec && rec.habit && rec.habit.relapsed) {
        return i; // 今日算第0天，破戒当天不计入戒断
      }
      d.setDate(d.getDate() - 1);
    }
    return 365; // 一年内无记录，视为长期戒断
  },

  // 戒手冲：最近 N 次破戒记录（用于历史回顾）
  getHabitHistory(n) {
    const data = this.load();
    const arr = [];
    const d = new Date();
    for (let i = 0; i < 90; i++) {
      const ds = this.fmtDate(d);
      const rec = data.records[ds];
      if (rec && rec.habit && rec.habit.relapsed) {
        arr.push({ date: ds, ...rec.habit });
      }
      d.setDate(d.getDate() - 1);
    }
    return arr.slice(0, n);
  },

  // ===================== 金币系统（原子事务） =====================
  getCoins() { const d = this.load(); return d.coins; },

  // 发放金币（用于奖励、每日发放等），同一 reason+date 不会重复发放
  grantCoins(amount, reason, dateStr) {
    if (!amount || amount <= 0) return false;
    dateStr = dateStr || this.today();
    const d = this.load();
    const key = (dateStr + '::' + reason);
    if (d.coins.dailyGranted[key]) return { ok: false, msg: '今日该奖励已发放过', duplicate: true };
    d.coins.balance = (d.coins.balance || 0) + amount;
    d.coins.dailyGranted[key] = true;
    d.coinLogs.unshift({ id: this._id(), date: dateStr, type: 'grant', amount, reason: reason || '' });
    if (d.coinLogs.length > 500) d.coinLogs.length = 500;
    this.save(d);
    return { ok: true, balance: d.coins.balance };
  },

  // 通用金币增减（游戏等场景，无去重保护；amount 正为增、负为减）
  REWARD_GROUPS: {
    diet:    { label: '饮食', miniMin: 1, miniMax: 3, fullMin: 20, fullMax: 30, keys: ['breakfast','lunch','dinner','waterDiet','vegetable'] },
    sleep:   { label: '睡眠', miniMin: 2, miniMax: 4, fullMin: 20, fullMax: 30, keys: ['sleepMorning','sleepNoon','sleepNight','napQuality','beforeNoScreen','sleepSchedule'] },
    hygiene: { label: '卫生', miniMin: 1, miniMax: 3, fullMin: 10, fullMax: 20, keys: ['hygFace','hygOral','hygPrivate','hygFoot','hygSheet','hygDesk'] },
    exercise:{ label: '运动', miniMin: 3, miniMax: 5, fullMin: 25, fullMax: 40, keys: ['exSteps','exCardio','exAnaerobic','exWarmup','exStretch','exStand'] },
    learning:{ label: '学习', miniMin: 3, miniMax: 5, fullMin: 30, fullMax: 50, keys: ['lnListen','lnRead','lnPol','lnMath','lnCs','lnMeditate'] },
    health:  { label: '健康', miniMin: 3, miniMax: 5, fullMin: 30, fullMax: 50, keys: ['hlMedMorn','hlMedNoon','hlMedNight','hlBp','hlWater','hlTemp'] },
  },

  // 判定某小任务今天是否"完成"（仅从 records 中取；用于奖励面板展示进度、全勤按钮激活）
  _isMiniDone(group, key, rec) {
    rec = rec || this.getDay();
    const dietMealDone = (n) => rec && rec.diet && rec.diet.meals && rec.diet.meals[n] === true;
    switch (group) {
      case 'diet':
        switch (key) {
          case 'breakfast': return !!dietMealDone('breakfast');
          case 'lunch':     return !!dietMealDone('lunch');
          case 'dinner':    return !!dietMealDone('dinner');
          // snack：功能已删除，为了不破坏过去记录，兼容旧 records.diet.snack=true 也视为完成；但新阈值不再计入 snack 键
          case 'snack':     return !!(rec && rec.diet && (dietMealDone('snack') || rec.diet.snack === true));
          case 'waterDiet': return (rec && rec.diet && (rec.diet.water || 0) >= (CONFIG.diet && CONFIG.diet.waterMin || 1500));
          case 'vegetable': return (rec && rec.diet && (rec.diet.vegetableDays || 0) > 0) ? true : (rec && rec.diet && rec.diet.vegetable === true);
        }
        break;
      case 'sleep':
        switch (key) {
          case 'sleepMorning': return rec && rec.sleep && rec.sleep.morning && rec.sleep.morning.wake;
          case 'sleepNoon':    return rec && rec.sleep && rec.sleep.noon && rec.sleep.noon.slept;
          case 'sleepNight':   return rec && rec.sleep && rec.sleep.night && rec.sleep.night.slept;
          case 'napQuality':   return rec && rec.sleep && rec.sleep.quality >= 3;
          case 'beforeNoScreen': return rec && rec.sleep && rec.sleep.beforeNoScreen === true;
          case 'sleepSchedule': return rec && rec.sleep && rec.sleep.night && rec.sleep.night.inBedBefore23 === true;
        }
        break;
      case 'hygiene':
        switch (key) {
          case 'hygFace':    return rec && rec.hygiene && rec.hygiene.face;
          case 'hygOral':    return rec && rec.hygiene && rec.hygiene.brushTimes >= 2;
          case 'hygPrivate': return rec && rec.hygiene && rec.hygiene.private;
          case 'hygFoot':    return rec && rec.hygiene && rec.hygiene.foot;
          case 'hygSheet':   return rec && rec.hygiene && rec.hygiene.bed;
          case 'hygDesk':    return rec && rec.hygiene && rec.hygiene.desk;
        }
        break;
      case 'exercise': {
        const e = rec && rec.exercise;
        if (!e) return false;
        switch (key) {
          case 'exSteps':     return (e.steps || 0) >= (CONFIG.exercise && CONFIG.exercise.stepMin || 8000);
          case 'exCardio':    return (e.cardioMinutes || 0) >= 20;
          case 'exAnaerobic': return (e.anaerobicCount || 0) >= (CONFIG.exercise && CONFIG.exercise.minAnaerobic || 3);
          case 'exWarmup':    return !!e.warmup;
          case 'exStretch':   return !!e.stretch;
          case 'exStand':     return (e.standHours || 0) >= 6;
        }
        break;
      }
      case 'learning': {
        const L = rec && rec.learning;
        if (!L) return false;
        switch (key) {
          case 'lnListen':   return (L.listenMinutes || 0) >= 15;
          case 'lnRead':     return (L.readMinutes || 0) >= 30;
          case 'lnPol':      return (L.polMinutes || 0) >= 20;
          case 'lnMath':     return (L.mathMinutes || 0) >= 30;
          case 'lnCs':       return (L.csMinutes || 0) >= 20;
          case 'lnMeditate': return (L.meditateMin || 0) >= 10;
        }
        break;
      }
      case 'health': {
        const H = rec && rec.medications && rec.health;
        // 简化：如果 medications 存在，则吃药是完成态
        switch (key) {
          case 'hlMedMorn':  return rec && rec.medications && Object.keys(rec.medications).every(id => rec.medications[id].morning);
          case 'hlMedNoon':  return rec && rec.medications && Object.keys(rec.medications).every(id => rec.medications[id].noon);
          case 'hlMedNight': return rec && rec.medications && Object.keys(rec.medications).every(id => rec.medications[id].night);
          case 'hlBp':       return H && typeof H.systolic === 'number';
          case 'hlWater':    return rec && rec.diet && (rec.diet.water || 0) >= (CONFIG.diet && CONFIG.diet.waterMin || 1500);
          case 'hlTemp':     return H && typeof H.temp === 'number';
        }
        break;
      }
    }
    return false;
  },

  getRewardGroupState(group, dateStr) {
    dateStr = dateStr || this.todayBJ();
    const G = this.REWARD_GROUPS[group];
    if (!G) return null;
    const rec = this.getDay(dateStr);
    const doneKeys = [];
    const keyStates = {};
    for (const k of G.keys) {
      const done = this._isMiniDone(group, k, rec);
      keyStates[k] = done;
      if (done) doneKeys.push(k);
    }
    // 小任务预期金币 1~5（按难度：难度=GROUP miniMax 取高=更难，按 group key 哈希固定到 [miniMin,miniMax]）
    const miniCoins = {};
    for (const k of G.keys) {
      miniCoins[k] = this._hashRandInt(`mini::${group}::${k}::${dateStr}`, G.miniMin, G.miniMax);
    }
    const fullExpected = this._hashRandInt(`full::${group}::${dateStr}`, G.fullMin, G.fullMax);
    const data = this.load();
    const fullClaimed = !!data.coins.dailyGranted[`${dateStr}::groupfull::${group}`];
    const miniClaimed = {};
    for (const k of G.keys) miniClaimed[k] = !!data.coins.dailyGranted[`${dateStr}::mini::${group}::${k}`];
    const allDone = doneKeys.length === G.keys.length;
    const progressPct = Math.round(doneKeys.length / G.keys.length * 100);
    return { group, label: G.label, keys: G.keys, keyStates, miniCoins, fullExpected, fullClaimed, miniClaimed, allDone, progressPct, doneCount: doneKeys.length, totalCount: G.keys.length, dateStr };
  },

  // 稳定的按日期哈希的"伪随机整数"，保证同一天同一任务金币额度稳定、跨天变化
  _hashRandInt(seedStr, min, max) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const r = (h >>> 0) / 4294967295;
    return Math.floor(min + r * (max - min + 1));
  },

  claimMiniTask(group, key) {
    const today = this.todayBJ();
    const S = this.getRewardGroupState(group, today);
    if (!S) return { ok: false, msg: '分组不存在' };
    if (!S.keyStates[key]) return { ok: false, msg: '任务未完成，先去完成打卡' };
    if (S.miniClaimed[key]) return { ok: false, msg: '今日已领取过该奖励', duplicate: true };
    const amount = S.miniCoins[key];
    return this.grantCoins(amount, `mini::${group}::${key}`, today);
  },

  getProfile() {
    const d = this.load();
    return d.profile;
  },
  setProfile(patch) {
    if (!patch || typeof patch !== 'object') return { ok:false, msg:'参数为空' };
    const d = this.load();
    d.profile = d.profile || {};
    if (typeof patch.birthDate === 'string') d.profile.birthDate = patch.birthDate.slice(0,10);
    if (typeof patch.mbti === 'string') {
      const up = patch.mbti.toUpperCase().replace(/[^IESTJPNF]/g,'').slice(0,4);
      d.profile.mbti = (['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'].includes(up)) ? up : '';
    }
    if (patch.height !== undefined) { const h = parseFloat(patch.height); d.profile.height = isFinite(h) ? Math.max(0, h) : 0; }
    if (patch.weight !== undefined) { const w = parseFloat(patch.weight); d.profile.weight = isFinite(w) ? Math.max(0, w) : 0; }
    // v12.9.50 性别持久化修复：saveProfileFromForm 一直有传 gender，但此处从未写入——
    //   导致「改为女生后仍显示男生」（形象/首页头像/像素战士全部跟随档案性别）。现补上落盘。
    if (patch.gender !== undefined) d.profile.gender = (patch.gender === '女') ? '女' : '男';
    if (typeof patch.major === 'string') d.profile.major = patch.major.trim().slice(0, 20); // v12.9.3 所学专业 → 练习站专业课题库
    // 自动推算生肖 + 星座
    if (d.profile.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(d.profile.birthDate)) {
      const dt = new Date(d.profile.birthDate + 'T00:00:00');
      const Y = dt.getFullYear(), M = dt.getMonth()+1, D = dt.getDate();
      const zodiacs = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
      d.profile.zodiac = zodiacs[((Y - 4) % 12 + 12) % 12];
      const stars = [[1,20,'水瓶座♒'],[2,19,'双鱼座♓'],[3,21,'白羊座♈'],[4,20,'金牛座♉'],[5,21,'双子座♊'],[6,22,'巨蟹座♋'],[7,23,'狮子座♌'],[8,23,'处女座♍'],[9,23,'天秤座♎'],[10,24,'天蝎座♏'],[11,23,'射手座♐'],[12,22,'摩羯座♑']];
      let pick = stars[0][2];
      for (let i = stars.length - 1; i >= 0; i--) {
        if ((M > stars[i][0]) || (M === stars[i][0] && D >= stars[i][1])) { pick = stars[i][2]; break; }
      }
      d.profile.starSign = pick;
    } else {
      d.profile.zodiac = ''; d.profile.starSign = '';
    }
    this.save(d);
    return { ok:true, profile: d.profile };
  },
  // 计算 BMI + 建议
  getBMI() {
    const p = this.getProfile();
    if (!p.height || !p.weight) return null;
    const m = p.height / 100;
    const v = (p.weight) / (m * m);
    const bmi = Math.round(v * 10) / 10;
    let label = '偏瘦', color = '#38bdf8', tip = '建议适量增肌，高蛋白饮食';
    if (bmi >= 18.5 && bmi < 24) { label = '正常'; color = '#10b981'; tip = '体重健康，保持规律作息与饮食'; }
    else if (bmi >= 24 && bmi < 28) { label = '偏胖'; color = '#f59e0b'; tip = '建议控制热量并增加有氧运动'; }
    else if (bmi >= 28) { label = '肥胖'; color = '#ef4444'; tip = '建议在医生指导下减脂控重'; }
    return { value: bmi, label, color, tip, height: p.height, weight: p.weight };
  },
  // 基础代谢率（Mifflin-St Jeor，简化）
  getBMR(sex /* 'M'|'F' ，默认 M */) {
    const p = this.getProfile();
    if (!p.height || !p.weight) return null;
    const Y = p.birthDate ? Math.max(16, Math.floor((Date.now() - new Date(p.birthDate + 'T00:00:00').getTime()) / (365.25*86400000))) : 22;
    const s = (sex === 'F') ? -161 : 5;
    return Math.round(10 * p.weight + 6.25 * p.height - 5 * Y + s);
  },
  // 生辰八字：返回简化八字字符串 + 生肖 + 五行元素（按日期哈希 → 简化）
  getBazi() {
    const p = this.getProfile();
    if (!p.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) return null;
    const dt = new Date(p.birthDate + 'T12:00:00');
    const Y = dt.getFullYear(), M = dt.getMonth()+1, D = dt.getDate();
    // 简化天干地支：用哈希到 10天干 / 12地支
    const TG = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const TG_ELE = ['木','木','火','火','土','土','金','金','水','水'];
    const DZ_ELE = ['水','土','木','木','土','火','火','土','金','金','土','水'];
    const h = (s) => { let r = 0; for (let i=0;i<s.length;i++) r = (r*131 + s.charCodeAt(i)) >>> 0; return r; };
    const yT = TG[ h(`${Y}T`) % 10 ], yD = DZ[ h(`${Y}D`) % 12 ];
    const mT = TG[ h(`${Y}-${M}T`) % 10 ], mD = DZ[ h(`${Y}-${M}D`) % 12 ];
    const dT = TG[ h(`${Y}-${M}-${D}T`) % 10 ], dD = DZ[ h(`${Y}-${M}-${D}D`) % 12 ];
    const hT = TG[ h(`${Y}-${M}-${D}H`) % 10 ], hD = DZ[ h(`${Y}-${M}-${D}H2`) % 12 ];
    const bazi = `${yT}${yD}年 ${mT}${mD}月 ${dT}${dD}日 ${hT}${hD}时`;
    const ele = [TG_ELE[TG.indexOf(yT)],DZ_ELE[DZ.indexOf(yD)],TG_ELE[TG.indexOf(mT)],DZ_ELE[DZ.indexOf(mD)],TG_ELE[TG.indexOf(dT)],DZ_ELE[DZ.indexOf(dD)],TG_ELE[TG.indexOf(hT)],DZ_ELE[DZ.indexOf(hD)]];
    const eleCount = { 金:0, 木:0, 水:0, 火:0, 土:0 };
    ele.forEach(e => eleCount[e] = (eleCount[e]||0)+1);
    const lack = Object.keys(eleCount).filter(k => eleCount[k]===0).join('、') || '五行俱全';
    return { bazi, elements: eleCount, lack, zodiac: p.zodiac };
  },
  // 当日运势：按用户八字的 hash + 当日日期，生成稳定值（每日 0 点刷新）
  getTodayFortune() {
    const today = this.todayBJ();
    const bazi = this.getBazi() || { bazi: '未知', lack:'', elements:{}, zodiac:'' };
    const p = this.getProfile();
    const seed = `fortune::${today}::${p.birthDate||'nodate'}::${p.mbti||'X'}::${bazi.bazi}`;
    const r = (n) => this._hashRandInt(seed + '::' + n, 0, 100);
    const overall = r('overall');
    const love = r('love'); const career = r('career'); const wealth = r('wealth'); const health = r('health');
    const colorIdx = this._hashRandInt(seed+'::color',0,10);
    const colors = ['正红','明黄','翠绿','湖蓝','浅紫','银灰','奶白','香槟','粉橘','藏青','樱花粉'];
    const luckyColor = colors[colorIdx % colors.length];
    const numIdx = this._hashRandInt(seed+'::num',0,9);
    const luckyNumber = [1,2,3,5,6,7,8,9,0,4][numIdx];
    const L1 = ['今天心情舒畅，小事皆顺','宜专注学习，忌熬夜刷手机','适合整理书桌，梳理待办','今日适合出门散步，阳光是你的养料','建议主动关心 1 位朋友','今日灵感爆表，把想法写下来','宜做 2 周规划，忌拖延','宜清淡饮食，注意饮水','今日适合复盘错题，别嫌麻烦','今日适合完成一个难啃的任务'][this._hashRandInt(seed+'::L1',0,9)];
    const L2 = ['忌冲动消费，理财三思','忌深夜emo，早睡养精','忌在饥饿时做决策','忌盲目比较，按自己节奏来','忌冷饮冷食，肠胃小心','忌久坐不动，起身拉伸','忌打游戏无度，自律即自由','忌八卦嘴碎，保持友善','忌熬夜学习，效率反降','忌吃撑，七分饱为宜'][this._hashRandInt(seed+'::L2',0,9)];
    const summary = overall >= 90 ? '大吉 ☀️' : overall >= 75 ? '中吉 🌤️' : overall >= 60 ? '小吉 🌥️' : overall >= 40 ? '平 🟰' : overall >= 20 ? '小凶 🌧️' : '慎行 ⛈️';
    const mbti = p.mbti || '未填';
    const mbtiTip = {
      INTJ:'今天适合做 1 个深度思考，写下来更清晰。',INTP:'好奇心是你最大的武器，选 1 个方向深入。',
      ENTJ:'今日适合攻克 1 个大任务，拆成小块即可。',ENTP:'善用你的脑洞，把它落到纸面变成行动。',
      INFJ:'独处是充电，做一些让自己安静的事。',INFP:'做你喜欢的事，比追求正确更重要。',
      ENFJ:'你的鼓励很有力量，今天夸奖 1 个人吧。',ENFP:'灵感爆棚的一天，记录下来，别让它们逃走。',
      ISTJ:'今天适合打勾清单，按部就班最稳。',   ISFJ:'照顾好自己再照顾别人，你也很重要。',
      ESTJ:'今日适合安排/执行，节奏交给你掌控。',  ESFJ:'温暖是你的超能力，今天和朋友吃顿好的。',
      ISTP:'动手能力拉满，适合修理/做手工。',     ISFP:'审美在线的一天，去拍照/画画/听歌。',
      ESTP:'行动派的一天，想到就做，注意别莽。',   ESFP:'派对小太阳，今天多微笑，感染力爆表。'
    }[mbti] || '填好 MBTI 后，我每天给你专属的性格日签～';
    return { date: today, summary, overall, love, career, wealth, health, luckyColor, luckyNumber, yi: L1, ji: L2, mbti, mbtiTip, bazi: bazi.bazi, elements: bazi.elements, lack: bazi.lack, zodiac: bazi.zodiac };
  },

  // ===== 系统运行日志（每日方格存储 · 单日 200 条封顶）=====
  log(action, detail) {
    const d = this.load();
    d.systemLogs = d.systemLogs || {};
    const today = this.today();
    if (!d.systemLogs[today]) d.systemLogs[today] = [];
    d.systemLogs[today].unshift({ ts: new Date().toISOString(), action, detail: detail || '' });
    if (d.systemLogs[today].length > 200) d.systemLogs[today].length = 200;
    this.save(d);
  },
  getSystemLogs(dateStr) {
    dateStr = dateStr || this.today();
    return (this.load().systemLogs || {})[dateStr] || [];
  },
  getSystemLogDates() {
    return Object.keys(this.load().systemLogs || {}).sort().reverse();
  },

  // v3.5：现金券体系（exchangeCoins/cashOut/adjCashVoucherAndProperty）已随旧货币概念整体移除

  // 获取最近 N 条金币流水
  addLedger({ amount, category, note, date, violation, type }) {
    if (!amount || amount <= 0) return null;
    const d = this.load();
    const entry = {
      id: this._id(),
      date: date || this.today(),
      amount: Number(amount),
      category: category || 'other',
      note: note || '',
      violation: !!violation,   // 违规消费（如游戏充值/彩票等，会被标记警示）
      type: type === 'income' ? 'income' : 'expense',  // v10.0 收入/支出（旧数据无 type 字段视为支出）
    };
    d.ledger.unshift(entry);
    if (d.ledger.length > 1000) d.ledger.length = 1000;
    this.save(d);
    return entry;
  },
  getLedger() { return this.load().ledger; },
  // 账本汇总（当月+总计 · 支出口径；旧数据无 type 字段视为支出）
  ledgerSummary() {
    const arr = this.load().ledger;
    const today = new Date();
    const ym = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    let monthTotal = 0, total = 0, monthViolation = 0, violationTotal = 0;
    const byCat = {};
    arr.forEach(e => {
      if (e.type === 'income') return;   // v10.0 收入不计入支出汇总
      total += e.amount;
      if (e.violation) violationTotal += e.amount;
      if (e.date.startsWith(ym)) {
        monthTotal += e.amount;
        if (e.violation) monthViolation += e.amount;
      }
      byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    });
    return { monthTotal, total, monthViolation, violationTotal, byCat };
  },
  // v10.0 收入汇总（当月+累计）
  ledgerSummaryIncome() {
    const arr = this.load().ledger;
    const today = new Date();
    const ym = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    let monthTotal = 0, total = 0;
    const byCat = {};
    arr.forEach(e => {
      if (e.type !== 'income') return;
      total += e.amount;
      if (e.date.startsWith(ym)) monthTotal += e.amount;
      byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    });
    return { monthTotal, total, byCat };
  },

  // ===================== 日记/心情随笔 =====================
  addDiary({ date, title, content, tags, mood, images }) {
    if (!content && !title && !(images && images.length)) return null;
    const d = this.load();
    const entry = {
      id: this._id(),
      date: date || this.today(),
      title: title || '',
      content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      mood: Number(mood) || 0,
      images: Array.isArray(images) ? images : [],
      updated: new Date().toISOString(),
    };
    d.diaries.unshift(entry);
    if (d.diaries.length > 500) d.diaries.length = 500;
    this.save(d);
    return entry;
  },
  updateDiary(id, patch) {
    const d = this.load();
    const i = d.diaries.findIndex(x => x.id === id);
    if (i < 0) return null;
    d.diaries[i] = Object.assign({}, d.diaries[i], patch, { updated: new Date().toISOString() });
    this.save(d);
    return d.diaries[i];
  },
  delDiary(id) {
    const d = this.load();
    d.diaries = d.diaries.filter(x => x.id !== id);
    this.save(d);
  },
  getDiaries() { return this.load().diaries; },
  diaryOverview() {
    const list = this.getDiaries() || [];
    const byMood = {};
    list.forEach(d => { const m = d.mood || 0; byMood[m] = (byMood[m] || 0) + 1; });
    return {
      total: list.length,
      uniqueDays: new Set(list.map(d => d.date)).size,
      byMood,
      lastAt: list.length ? list[0].createdAt : null,
    };
  },

  // 设置
  getSetting(key, def) {
    const data = this.load();
    return data.settings && data.settings[key] !== undefined ? data.settings[key] : def;
  },
  setSetting(key, value) {
    const data = this.load();
    if (!data.settings) data.settings = {};
    data.settings[key] = value;
    this.save(data);
  },

  // ===== 多设备数据互通：导出 / 导入（剪贴板 + JSON 文件 + 二维码） =====
  exportAll() {
    const data = this.load();
    return JSON.stringify({
      app: 'life-journey',
      version: 1,
      exportedAt: new Date().toISOString(),
      payload: data,
      bare: this._bareCollect(), // v2026.0906-11 裸键一并备份（游戏存档/倒计时/偏好），见 _bareCollect
      // v12.8.1 校验码改用「规范化序列化」（递归键排序，键序无关）：
      // Supabase jsonb 列会按键长重排对象键序，云端往返后原始 JSON.stringify 必然对不上 → 误报「校验码不一致」。
      // 规范化后云端往返（jsonb 键序重排/数字规范化）不影响校验结果。
      checksum: this._checksum(this._canonStringify(data)),
    });
  },
  importAll(jsonStr, strategy = 'merge') {
    // strategy: 'merge'(默认，新的冲突字段以导入为准) / 'replace'(完全覆盖，慎用)
    let obj;
    try { obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr; }
    catch (e) { return { ok: false, msg: '解析失败，JSON 格式不合法：' + e.message.slice(0, 80) }; }
    if (!obj || obj.app !== 'life-journey' || !obj.payload) {
      return { ok: false, msg: '不是本App导出的数据包（缺少 app/life-journey 标记）' };
    }
    // v12.8.1 双通道校验：新包=规范化（键序无关，Supabase jsonb 往返安全）；
    // 旧包=原始 JSON.stringify 键序（本地备份文件未经过云端往返，键序保留，此通道仍成立）
    if (obj.checksum !== this._checksum(this._canonStringify(obj.payload))
        && obj.checksum !== this._checksum(JSON.stringify(obj.payload))) {
      return { ok: false, msg: '数据包可能损坏（校验码不一致）' };
    }
    let current = this.load();
    if (strategy === 'replace') {
      current = this.normalize(obj.payload);
    } else {
      // merge：按"日期合并 + 其他字段取 payload 覆盖"
      const incoming = this.normalize(obj.payload);
      current.days = Object.assign({}, current.days || {}, incoming.days || {});
      Object.keys(incoming).forEach(k => {
        if (k !== 'days') current[k] = incoming[k];
      });
      current = this.normalize(current);
    }
    this.save(current);
    // v2026.0906-11 裸键恢复：旧格式备份（升级前导出）无 bare 字段则自然跳过，不影响兼容
    const bareRestored = this._bareRestore(obj.bare);
    return { ok: true, strategy, at: obj.exportedAt, bareRestored };
  },
  // ===== v2026.0906-11 备份完整性：裸 localStorage 键纳入导出/导入 =====
  // 背景：游戏进度（story/bj/ms/monopoly/三国杀等）与用户设置（考试倒计时/体检日期/主题配色/
  // 阅读偏移/快穿偏移）直接存裸键，不在主存档 Store.KEY 里——旧 exportAll 只打包主存档，
  // 换机/误删后导入备份，这些数据全部丢失（游戏从头来过、倒计时清零）。
  // 采集策略 = 全量枚举 − 设备本地临时键（未来新增的游戏存档键自动被覆盖，无需登记）：
  //   精确排除：weather_cache（缓存可重建）/ onboarded、last_greet_date、dismiss_dl_banner（一次性 UX 标记）
  //             / health_sensitive_unlock_ts（8h 时间锁，随备份迁移可绕过等待，故意排除）
  //   前缀排除：world_guide_（每视图一次性引导）/ news_（资讯批次缓存）
  //   主存档 KEY 即 payload 自身，同样排除。
  _bareDenyExact: ['weather_cache', 'onboarded', 'last_greet_date', 'dismiss_dl_banner', 'health_sensitive_unlock_ts'],
  _bareDenyPrefix: ['world_guide_', 'news_'],
  _bareAllowed(k) {
    if (k === this.KEY) return false;
    if (this._bareDenyExact.indexOf(k) >= 0) return false;
    for (let i = 0; i < this._bareDenyPrefix.length; i++) {
      if (k.lastIndexOf(this._bareDenyPrefix[i], 0) === 0) return false;
    }
    return true;
  },
  _bareCollect() {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !this._bareAllowed(k)) continue;
        out[k] = localStorage.getItem(k);
      }
    } catch (_) {}
    return out;
  },
  // 恢复裸键：非 string 值丢弃（localStorage 只存 string）；denylist 键拒绝写入——
  // 防篡改备份借 bare 字段偷渡 health_sensitive_unlock_ts 之类的时间锁/缓存污染。
  _bareRestore(bare) {
    if (!bare || typeof bare !== 'object') return 0;
    let n = 0;
    Object.keys(bare).forEach(k => {
      if (!this._bareAllowed(k) || typeof bare[k] !== 'string') return;
      try { localStorage.setItem(k, bare[k]); n++; } catch (_) {}
    });
    return n;
  },
  _checksum(s) {
    // 简单 32bit FNV-1a，够用
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  },
  // v12.8.1 规范化序列化：递归按键排序后再序列化 → 同一份数据无论键序如何（本机导出/云端 jsonb 往返重排），
  // 产出的字符串与校验码完全一致。数组保序（jsonb 数组本身保序）；数字经 JS 值最短往返表示，两端一致。
  _canonStringify(v) {
    if (v === undefined) v = null;
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(x => this._canonStringify(x)).join(',') + ']';
    return '{' + Object.keys(v).sort()
      .map(k => JSON.stringify(k) + ':' + this._canonStringify(v[k])).join(',') + '}';
  },

  // v12.9.22 jsonbin 云同步（cloudPush/cloudPull/cloudCreateBin + CONFIG.sync + sync_binId/sync_apiKey
  // 设置键）已随 v7.0 前遗留整体清除——云同步唯一方案 = Supabase 账号（App.cloud99Push/cloud99Pull，
  // 登录后全自动：启动恢复 + 落盘节流上传），见 js/app/78-cloud-auth.js
  // ===== 自动备份提醒（每日首次打开时检查） =====
  lastBackupDate() {
    return this.getSetting('last_backup_date', '');
  },
  markBackupDone() {
    this.setSetting('last_backup_date', this.today());
  },
  // 距上次备份天数（从未备份返回 null）
  daysSinceBackup() {
    const last = this.lastBackupDate();
    if (!last) return null;
    const a = new Date(last + 'T00:00:00').getTime();
    const b = new Date(this.today() + 'T00:00:00').getTime();
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  },
  // ===== 存储配额监控（localStorage 主流上限 5MB，按 UTF-16 字符计） =====
  storageUsage() {
    let total = 0, main = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        total += (k ? k.length : 0) + (localStorage.getItem(k) || '').length;
      }
      main = (localStorage.getItem(this.KEY) || '').length;
    } catch (_) {}
    const limit = 5 * 1024 * 1024;
    return {
      limit,
      chars: total,
      mainChars: main,
      pct: Math.min(100, Math.round(total / limit * 1000) / 10),
      mb: Math.round(total / 1024 / 1024 * 100) / 100,
    };
  },
  storageHealth() {
    const u = this.storageUsage();
    if (u.pct >= 95) return { level: 'critical', usage: u };
    if (u.pct >= 85) return { level: 'warn', usage: u };
    return { level: 'ok', usage: u };
  },

  // ===== 每周数据版本快照（自动 + 手动） =====
  // 存储结构：snapshots: [{ id, ts, weekKey, label, data }]
  listSnapshots() {
    const d = this.load();
    if (!d.snapshots) d.snapshots = [];
    return d.snapshots;
  },
  createSnapshot(label) {
    const d = this.load();
    if (!d.snapshots) d.snapshots = [];
    const now = new Date();
    // ISO 周序号
    const yStart = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - yStart) / 86400000 + yStart.getDay() + 1) / 7);
    const weekKey = `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
    const snap = {
      id: this._id(),
      ts: now.toISOString(),
      weekKey,
      label: label || `快照 ${weekKey}`,
      data: JSON.parse(JSON.stringify(d)),
    };
    // 移除嵌套 snapshots 防止递归膨胀
    delete snap.data.snapshots;
    d.snapshots.unshift(snap);
    if (d.snapshots.length > 12) d.snapshots.length = 12; // 保留最近 12 周
    this.save(d);
    return snap;
  },
  restoreSnapshot(id) {
    const d = this.load();
    const snap = (d.snapshots || []).find(s => s.id === id);
    if (!snap) return { ok: false, msg: '快照不存在' };
    // 先创建当前状态的快照（便于反悔）
    this.createSnapshot('还原前自动快照');
    // 用快照数据覆盖（保留 snapshots 自身）
    const backupSnaps = d.snapshots;
    const merged = Object.assign({}, this._empty(), snap.data);
    merged.snapshots = backupSnaps;
    this.save(merged);
    return { ok: true, label: snap.label };
  },
  delSnapshot(id) {
    const d = this.load();
    d.snapshots = (d.snapshots || []).filter(s => s.id !== id);
    this.save(d);
  },
  // 快照瘦身（存储告急时用）：只保留最近 n 份
  trimSnapshots(n) {
    const keep = Math.max(1, n || 2);
    const d = this.load();
    if (!d.snapshots || d.snapshots.length <= keep) return 0;
    const removed = d.snapshots.length - keep;
    d.snapshots.length = keep;
    this.save(d);
    return removed;
  },
  // 每周一首次打开自动快照
  autoWeeklySnapshot() {
    const today = this.today();
    const lastAuto = this.getSetting('last_auto_snapshot', '');
    // 取本周一日期
    const d = new Date();
    const day = d.getDay() || 7; // 周日=7
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    const mondayKey = this.fmtDate(monday);
    if (lastAuto === mondayKey) return false;
    this.createSnapshot(`每周自动 · ${mondayKey}`);
    this.setSetting('last_auto_snapshot', mondayKey);
    return true;
  },

  // ====== P6：四大学科题库 & 知识点 每日 0 点刷新 ======
  // 策略：
  //  1. 若联网可用，尝试 fetch(题库URL, {cache:no-cache}) 拉取 JSON，失败立即降级到本地内置
  //  2. 离线兜底：使用 CONFIG.subjectBanks[subject] 内置题库
  //  3. 每日以 today 为种子做 Fisher-Yates 稳定轮换（题目顺序 + 选项顺序轮换），保证每日感觉刷新
  //  4. 取今日的题目切片：N-5题，不够则复用
  _seededShuffle(arr, seedStr) {
    let h = 2166136261 >>> 0;
    for (let i=0;i<seedStr.length;i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    h = h >>> 0;
    const a = (arr || []).slice();
    for (let i=a.length-1;i>0;i--) {
      h = (h * 1664525 + 1013904223) >>> 0;
      const j = h % (i+1);
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  },
  // P6：通用每日种子挑 N 条；key 用作 namespace；preferUniquePerDay 按今日日期种子切片取连续 N
  dailySeedPick(key, arr, n, opts) {
    opts = opts || {};
    const list = Array.isArray(arr) ? arr.slice() : [];
    if (list.length === 0 || n <= 0) return [];
    const seed = (this.today() + '@' + (key || ''));
    const shuffled = this._seededShuffle(list, seed);
    const res = [];
    for (let i = 0; i < n; i++) res.push(shuffled[i % shuffled.length]);
    return res;
  },

  // 取某科今日题库（含选项顺序按日种子稳定轮换）
  getTodaySubjectQuiz(subject, optsPerDay) {
    optsPerDay = Number(optsPerDay) || 10;
    const d = this.load();
    const builtin = (CONFIG.subjectBanks && CONFIG.subjectBanks[subject]) ? CONFIG.subjectBanks[subject] : null;
    const remote = (d.subjectBanksDaily && d.subjectBanksDaily[subject]) ? d.subjectBanksDaily[subject] : null;
    const src = remote || builtin || { label: subject, questions: [], knowledge: [] };
    let qs = Array.isArray(src.questions) ? src.questions.slice() : [];
    let ks = Array.isArray(src.knowledge) ? src.knowledge.slice() : [];
    if (qs.length < 10 && builtin && builtin.questions) qs = qs.concat(builtin.questions);
    if (ks.length < 10 && builtin && builtin.knowledge) ks = ks.concat(builtin.knowledge);
    // 按日期种子稳定排序
    const seed = this.today() + '@' + subject;
    const qToday = this._seededShuffle(qs, seed + ':Q');
    const kToday = this._seededShuffle(ks, seed + ':K');
    // 选项顺序也按日种子旋转（保证正确答案索引随之改变，但不会破坏正确率）
    const shuffled = qToday.map(q => {
      const opts = (q.opts || []).slice();
      const correct = q.opts ? q.opts[q.ans] : '';
      const s2 = seed + (q.id || q.q);
      const ro = this._seededShuffle(opts, s2);
      return {
        id: q.id || null,
        q: q.q,
        opts: ro,
        ans: Math.max(0, ro.indexOf(correct)),
        exp: q.exp || ''
      };
    });
    const pickedQ = shuffled.slice(0, Math.min(optsPerDay, shuffled.length));
    // 若不够，循环补齐（不会让单日出现空）
    for (let i=0; pickedQ.length < optsPerDay && shuffled.length>0; i++) pickedQ.push(shuffled[i % shuffled.length]);
    return {
      label: src.label || subject,
      questions: pickedQ,
      knowledge: kToday.slice(0, Math.min(12, kToday.length)),
      source: remote ? '今日联网刷新' : '内置题库·每日按日种子轮换',
      date: this.today(),
    };
  },
  // 题库答题记录：对/错计数；同题当天只记一次
  answerSubjectQuiz(subject, qid, correct) {
    const today = this.today();
    const d = this.load();
    const key = 'quiz_' + subject + '_' + today;
    const bag = d.settings && d.settings[key] ? d.settings[key] : { done: {}, right:0, wrong:0 };
    if (qid && bag.done[qid]) return { ok:false, msg:'这道题今天已经答过了哦', bag };
    if (correct) { bag.right++; } else { bag.wrong++; }
    if (qid) bag.done[qid] = correct ? 1 : 0;
    d.settings = d.settings || {};
    d.settings[key] = bag;
    this.save(d);
    // v3.5：题库不再发积分（原 pts 计分已随旧货币体系移除）
    return { ok:true, bag };
  },
  getSubjectQuizBag(subject) {
    const today = this.today();
    const key = 'quiz_' + subject + '_' + today;
    return (this.getSetting(key, null)) || { done:{}, right:0, wrong:0 };
  },

  // ===== AES-GCM 加密导出（Web Crypto API） =====
  async encryptExport(password) {
    const json = this.exportAll();
    if (!password) return { ok: false, msg: '请输入加密密码' };
    try {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
      );
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(json)
      );
      // 打包 salt + iv + 密文 → base64
      const buf = new Uint8Array(salt.length + iv.length + ct.byteLength);
      buf.set(salt, 0);
      buf.set(iv, salt.length);
      buf.set(new Uint8Array(ct), salt.length + iv.length);
      const b64 = btoa(String.fromCharCode(...buf));
      return { ok: true, payload: `LJENC1:${b64}` };
    } catch (e) {
      return { ok: false, msg: '加密失败：' + String(e).slice(0, 80) };
    }
  },
  async decryptImport(b64, password) {
    if (!b64 || !password) return { ok: false, msg: '请粘贴密文并输入密码' };
    if (!b64.startsWith('LJENC1:')) return { ok: false, msg: '不是加密格式（需 LJENC1: 前缀）' };
    try {
      const raw = b64.slice(7);
      const bin = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      const salt = bin.slice(0, 16);
      const iv = bin.slice(16, 28);
      const ct = bin.slice(28);
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      const json = new TextDecoder().decode(pt);
      return { ok: true, json };
    } catch (e) {
      return { ok: false, msg: '解密失败（密码错或文件损坏）' };
    }
  },

  // ===== 目标系统（30/90/365 天） =====
  // 结构：goals: [{ id, name, type, target, unit, start, deadline, progressLog:[{date,value}], done }]
  getGoals() {
    const d = this.load();
    if (!d.goals) d.goals = [];
    return d.goals;
  },
  addGoal({ name, type, target, unit, deadline }) {
    const d = this.load();
    if (!d.goals) d.goals = [];
    const g = {
      id: this._id(),
      name: name || '新目标',
      type: type || '30', // 30/90/365
      target: Number(target) || 1,
      unit: unit || '',
      start: this.today(),
      deadline: deadline || '',
      progressLog: [],
      done: false,
    };
    d.goals.unshift(g);
    if (d.goals.length > 50) d.goals.length = 50;
    this.save(d);
    return g;
  },
  updateGoalProgress(id, value) {
    const d = this.load();
    const g = (d.goals || []).find(x => x.id === id);
    if (!g) return;
    g.progressLog = g.progressLog || [];
    const today = this.today();
    const exist = g.progressLog.find(p => p.date === today);
    if (exist) exist.value = Number(value);
    else g.progressLog.push({ date: today, value: Number(value) });
    if (g.target > 0 && Number(value) >= g.target) g.done = true;
    this.save(d);
    return g;
  },
  delGoal(id) {
    const d = this.load();
    d.goals = (d.goals || []).filter(g => g.id !== id);
    this.save(d);
  },

  // ===== 板块子页：每日状态初始化（按日期重置）=====
  _ensureWbToday(d, today) {
    d = d || this.load();
    today = today || this.today();
    const w = d.workbench;
    let changed = false;
    if (w.date !== today) {
      w.date = today;
      // 重置每日任务达标标志
      w.rewards = { ledgerGiven: false, diaryGiven: false, memoryGiven: false, readGivenTotal: 0, date: today };
      changed = true;
    }
    if (!w.todoPlans) w.todoPlans = [];
    if (!w.memory) w.memory = { daily: [], review: [], stats: {}, doneToday: false, lastDate: '' };
    if (!w.read) w.read = { totalMs: 0, lastSettleMs: 0, sessions: {}, date: today };
    if (w.read.date !== today) {
      w.read.date = today;
      // 不重置 totalMs（累计），但重置 sessions
      w.read.sessions = {};
      changed = true;
    }
    if (changed) this.save(d);
    return { d, w, today };
  },
  getWorkbench() {
    const { d, w } = this._ensureWbToday();
    return w;
  },

  // ===== 记录板块：经济数据任务（原记账 · 当日累计≥2条达标，无奖励发放）=====
  checkTodayLedgerReward(forceGrant) {
    const today = this.today();
    const d = this.load();
    const { w } = this._ensureWbToday(d, today);
    if (w.rewards.ledgerGiven) return { ok: false, already: true, msg: '今日经济数据已达标' };
    const list = (d.ledger || []).filter(x => x.date === today);
    const ok = list.length >= 2;
    if (!ok) return { ok: false, count: list.length, need: 2, msg: `今日经济数据 ${list.length}/2 条` };
    if (forceGrant) {
      w.rewards.ledgerGiven = true;
      this.save(d);
      this.log('记录·经济数据', '今日经济数据≥2条，任务达成');
      return { ok: true, count: list.length, msg: '🎉 经济数据任务完成！' };
    }
    return { ok: false, ready: true, count: list.length, msg: `经济数据已完成(${list.length}条)` };
  },

  // ===== 记录板块：日记任务（当日日记≥100字）=====
  checkTodayDiaryReward(forceGrant) {
    const today = this.today();
    const d = this.load();
    const { w } = this._ensureWbToday(d, today);
    if (w.rewards.diaryGiven) return { ok: false, already: true, msg: '今日日记已达标' };
    const dy = (d.diaries || []).filter(x => x.date === today);
    const totalChars = dy.reduce((s, x) => s + (x.content ? String(x.content).length : 0), 0);
    const ok = totalChars >= 100;
    if (!ok) return { ok: false, chars: totalChars, need: 100, msg: `今日日记字数 ${totalChars}/100` };
    if (forceGrant) {
      w.rewards.diaryGiven = true;
      this.save(d);
      this.log('记录·日记', `今日日记 ${totalChars}字，任务达成`);
      return { ok: true, chars: totalChars, msg: '🎉 日记任务完成！' };
    }
    return { ok: false, ready: true, chars: totalChars, msg: `日记已完成(${totalChars}字)` };
  },

  // ===== 记录板块：阅读计时（每满15分钟结算一次进度，无奖励发放）=====
  // sessionKey 如 'read_en_0'，caller 先 accumulateReadTime(ms) 再 settleReadProgress()
  accumulateReadTime(sessionKey, ms) {
    if (!ms || ms <= 0) return { ok: false };
    const { d, w } = this._ensureWbToday();
    const r = w.read;
    r.totalMs = (r.totalMs || 0) + ms;
    r.sessions[sessionKey] = (r.sessions[sessionKey] || 0) + ms;
    this.save(d);
    return { ok: true, totalMs: r.totalMs };
  },
  settleReadProgress() {
    const { d, w } = this._ensureWbToday();
    const r = w.read;
    const totalMin = Math.floor((r.totalMs || 0) / 60000);
    const slots = Math.floor(totalMin / 15);
    const already = w.rewards.readGivenTotal || 0;
    const newSlots = Math.max(0, slots - already);
    if (newSlots <= 0) return { ok: false, totalMin, slots, already, msg: `累计阅读 ${totalMin} 分钟，已结算 ${already} 次，暂无新结算` };
    w.rewards.readGivenTotal = slots;
    this.save(d);
    this.log('记录·阅读', `累计阅读 ${totalMin} 分钟，新增结算 ${newSlots} 次`);
    return { ok: true, totalMin, newSlots, slotsAwarded: newSlots, msg: `📚 阅读累计 ${totalMin} 分钟，结算 ${newSlots} 次` };
  },

  // ===== 记录板块：记忆任务（艾宾浩斯 多学科混合 + 72h 去重）=====
  _pickDaily(arr, seed, n) {
    if (!arr || !arr.length) return [];
    arr = arr.slice();
    const rnd = (i) => {
      const x = Math.sin(seed * 7919 + i * 617) * 10000;
      return x - Math.floor(x);
    };
    arr.sort((a, b) => rnd(arr.indexOf(a)) - rnd(arr.indexOf(b)));
    return arr.slice(0, n);
  },
  // Step4: 取学科题目列表，合并原小池与扩充池（indexOf 保持稳定 以便 _k 确定）
  _memoryPool(subjectKey) {
    const W = CONFIG.workbench || {};
    switch (subjectKey) {
      case 'english_zb':   return (W.memoryWords_ZB || []);
      case 'english_cet4': return (W.memoryWords_CET4 || []).concat(W.memoryWords || []);
      case 'english_cet6': return (W.memoryWords_CET6 || []);
      case 'english_ky':   return (W.memoryWords_KY || []);
      case 'pol_zb':       return (W.memoryPOL || []);
      case 'pol_ky':       return (W.memoryPOL_EX || []);
      case 'math_zb':
      case 'math_ky':      return (W.memoryMATH || []);
      case 'cs_zb':        return (W.memoryCS || []);
      case 'cs_ky':        return (W.memoryCS_EX || []);
      default: return [];
    }
  },
  // 取科目统一类型标签（w 单词 / pol 政治 / math 数学 / cs 计算机）
  _memoryTrim72(d, hours) {
    const nowMs = Date.now();
    const threshold = nowMs - (hours || 72) * 3600 * 1000;
    const pool = d.memorySeen72 || (d.memorySeen72 = {});
    Object.keys(pool).forEach(k => { if (+pool[k] <= threshold) delete pool[k]; });
    return pool;
  },
  getTodayMemory() {
    const today = this.today();
    const d = this.load();
    const { w } = this._ensureWbToday(d, today);
    const m = w.memory;
    const W = CONFIG.workbench || {};
    const cfg = (W.memoryCfg) || {};
    const intervals = cfg.easing || [1, 2, 4, 7, 15, 30];
    const dedupeHours = cfg.dedupeHours || 72;
    const dailyCfg = cfg.daily || {};
    const subjects = cfg.subjects || [
      { k:'english_zb', label:'专升本英语', type:'w' },
      { k:'english_cet4', label:'四级', type:'w' },
      { k:'english_cet6', label:'六级', type:'w' },
      { k:'english_ky', label:'考研英语', type:'w' },
      { k:'pol_zb', label:'专升本政治', type:'pol' },
      { k:'pol_ky', label:'考研政治', type:'pol' },
      { k:'math_zb', label:'专升本高数', type:'math' },
      { k:'math_ky', label:'考研高数', type:'math' },
      { k:'cs_zb', label:'专升本计算机', type:'cs' },
      { k:'cs_ky', label:'考研计算机', type:'cs' },
    ];
    if (m.lastDate !== today || !m.daily || !m.daily.length) {
      const seen = this._memoryTrim72(d, dedupeHours);
      const seed = today.split('-').reduce((s, x) => s + Number(x), 0) * 2654435761 >>> 0;
      // 复习：根据艾宾浩斯找到期项（覆盖所有学科 key）
      const stats = m.stats || {};
      const reviewList = [];
      Object.keys(stats).forEach(k => {
        const s = stats[k] || {};
        if (!s.nextDate || s.nextDate > today) return;
        const [type, idRaw] = k.split('::');
        if (!idRaw) return;
        // idRaw 形如 "english_cet4|achieve" 或 "english_cet4|2"
        const pipe = idRaw.indexOf('|');
        const subKey = pipe > 0 ? idRaw.slice(0, pipe) : '';
        const id = pipe > 0 ? idRaw.slice(pipe + 1) : idRaw;
        const pool = subKey ? this._memoryPool(subKey) : [];
        let item = null;
        if (pool.length) {
          if (type === 'w') item = pool.find(x => x.w === id || x.word === id);
          else if (type === 'pol' || type === 'math' || type === 'cs') {
            const idx = parseInt(id, 10); item = Number.isFinite(idx) ? pool[idx] : pool.find(x => x.k === id);
          }
        }
        if (item) reviewList.push(Object.assign({}, item, { _k: k, _type: type, _review: true, _subject: subKey, _step: s.step || 0, _intervals: intervals }));
      });
      // 新任务：按 cfg.daily 逐学科抽量，跳过 72h 内已推过
      const dailyList = [];
      subjects.forEach((sub, sIdx) => {
        const pool = this._memoryPool(sub.k);
        if (!pool.length) return;
        const quota = dailyCfg[sub.k] || 5;
        // 整体洗牌再取前面的候选；候选中剔除 72h 已见；若不够再放宽
        const shuffled = this._pickDaily(pool, seed + sIdx * 7 + 11, Math.min(pool.length, quota * 4));
        const picked = [];
        for (let i = 0; i < shuffled.length && picked.length < quota; i++) {
          const x = shuffled[i];
          const idPart = (sub.type === 'w') ? (x.w || x.word || '') : (x.k || String(pool.indexOf(x)));
          const key = `${sub.type}::${sub.k}|${idPart}`;
          if (seen[key]) continue;
          picked.push(Object.assign({}, x, { _k: key, _type: sub.type, _subject: sub.k }));
        }
        // 若 72h 过滤后不足 quota：兜底不跳过，保证每天题量达标
        if (picked.length < quota) {
          for (let i = 0; i < shuffled.length && picked.length < quota; i++) {
            const x = shuffled[i];
            const idPart = (sub.type === 'w') ? (x.w || x.word || '') : (x.k || String(pool.indexOf(x)));
            const key = `${sub.type}::${sub.k}|${idPart}`;
            if (picked.find(p => p._k === key)) continue;
            picked.push(Object.assign({}, x, { _k: key, _type: sub.type, _subject: sub.k }));
          }
        }
        // 推入今日并写入 72h 池
        picked.forEach(p => { seen[p._k] = Date.now(); dailyList.push(p); });
      });
      m.daily = dailyList;
      m.review = reviewList;
      m.lastDate = today;
      m.doneToday = false;
      this.save(d);
    }
    return { daily: m.daily, review: m.review, stats: m.stats, doneToday: m.doneToday, subjects: subjects };
  },
  markMemoryLearned(key, remembered) {
    const today = this.today();
    const d = this.load();
    const { w } = this._ensureWbToday(d, today);
    const m = w.memory;
    const cfg = (CONFIG.workbench && CONFIG.workbench.memoryCfg) || {};
    const intervals = cfg.easing || [1, 2, 4, 7, 15, 30];
    const stats = m.stats || {};
    let s = stats[key] || { step: 0, learned: 0, lastDate: '', nextDate: '' };
    if (remembered) {
      s.step = Math.min((s.step || 0) + 1, intervals.length);
      const gap = s.step > 0 ? intervals[Math.min(s.step - 1, intervals.length - 1)] : 1;
      s.learned = (s.learned || 0) + 1;
      s.lastDate = today;
      const nd = new Date(); nd.setDate(nd.getDate() + gap);
      s.nextDate = this.fmtDate(nd);
    } else {
      s.step = Math.max(0, (s.step || 0) - 1);
      s.lastDate = today;
      const gap = intervals[Math.max(0, s.step)] || 1;
      const nd = new Date(); nd.setDate(nd.getDate() + gap);
      s.nextDate = this.fmtDate(nd);
    }
    stats[key] = s;
    m.stats = stats;
    // 记住了 → 加一笔 72h 去重命中，避免近期反复推送
    if (remembered) {
      const seen = this._memoryTrim72(d, cfg.dedupeHours || 72);
      seen[key] = Date.now();
    }
    this.save(d);
    return { ok: true, key, step: s.step, nextDate: s.nextDate };
  },
  checkTodayMemoryReward(forceGrant) {
    const mem = this.getTodayMemory();
    const { d, w } = this._ensureWbToday();
    const m = w.memory;
    const total = (mem.daily || []).length + (mem.review || []).length;
    if (w.rewards.memoryGiven) return { ok: false, already: true, msg: '今日记忆积分已领取' };
    const today = this.today();
    const all = (mem.daily || []).concat(mem.review || []);
    const done = all.filter(x => {
      const s = m.stats[x._k];
      return s && s.lastDate === today;
    });
    const ok = all.length > 0 && done.length === all.length;
    if (!ok) return { ok: false, done: done.length, total: all.length, msg: `记忆进度 ${done.length}/${all.length}` };
    if (forceGrant) {
      w.rewards.memoryGiven = true;
      m.doneToday = true;
      this.save(d);
      this.log('记录·记忆', `完成全部 ${done.length} 项记忆任务`);
      return { ok: true, msg: '🧠 每日记忆任务完成！' };
    }
    return { ok: false, ready: true, done: done.length, total: all.length, msg: '记忆任务已全部完成' };
  },

  // v3.5：任务宝箱体系（_wbChestInit/bumpTaskChestDoneSeed/getTaskChestState/openTaskChest）
  // 已随旧货币概念整体移除（宝箱奖励 = 金币+积分+勋章，均属已下线的货币体系）

  // ===== v2.0.5：就医数据 / 就诊 / 突发症状时间线（v6.9 原【病历】更名【就医数据】）=====
  MR_TYPE_LABELS: { chronic:'🩺 慢性病复诊', acute:'⚡ 突发症状', visit:'🏥 就诊/检查' },
  MR_SEV_LABELS: ['','轻微','一般','中等','严重','🆘 紧急'],
  _normMR(r) {
    r = r || {};
    const today = this.today();
    const now = new Date();
    const pad = (n) => String(n).padStart(2,'0');
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return {
      id: r.id || ('mr_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7)),
      date: r.date || today,
      time: r.time || hhmm,
      disease: String(r.disease || '').trim().slice(0, 60),
      type: ({chronic:1,acute:1,visit:1})[r.type] ? r.type : 'acute',
      severity: Math.min(5, Math.max(1, (+r.severity) || 1)),
      symptoms: Array.isArray(r.symptoms) ? r.symptoms.map(x=>String(x).slice(0,30)).filter(Boolean) : (typeof r.symptoms === 'string' ? String(r.symptoms).split(/[,，、\s]+/).map(x=>x.trim()).filter(Boolean).slice(0,20) : []),
      medicines: Array.isArray(r.medicines) ? r.medicines.map(x=>String(x).slice(0,40)).filter(Boolean) : (typeof r.medicines === 'string' ? String(r.medicines).split(/[,，、\s]+/).map(x=>x.trim()).filter(Boolean).slice(0,20) : []),
      hospital: String(r.hospital || '').trim().slice(0, 60),
      doctor: String(r.doctor || '').trim().slice(0, 40),
      // v2026.0906 科学的就医数据模板：疾病开始时间 + 治疗方式（医疗场所即 hospital）
      onsetDate: String(r.onsetDate || '').trim().slice(0, 10),
      treatment: String(r.treatment || '').trim().slice(0, 40),
      diagnose: String(r.diagnose || '').trim().slice(0, 500),
      temperature: String(r.temperature || '').trim().slice(0, 12),
      bloodPressure: String(r.bloodPressure || '').trim().slice(0, 16),
      heartRate: String(r.heartRate || '').trim().slice(0, 12),
      weight: String(r.weight || '').trim().slice(0, 10),
      note: String(r.note || '').trim().slice(0, 1000),
      tags: Array.isArray(r.tags) ? r.tags.map(x=>String(x).slice(0,20)).filter(Boolean) : [],
      createdAt: +r.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  },
  listMedicalRecords(opts) {
    opts = opts || {};
    const d = this.load();
    let list = Array.isArray(d.medicalRecords) ? d.medicalRecords.slice() : [];
    if (opts.type) list = list.filter(r => r.type === opts.type);
    if (opts.disease) {
      const kw = String(opts.disease).toLowerCase();
      list = list.filter(r => (r.disease||'').toLowerCase().indexOf(kw) >= 0 || (r.tags||[]).some(t => String(t).toLowerCase().indexOf(kw) >= 0));
    }
    // 按 日期+时间 倒序
    list.sort((a,b) => {
      const ka = `${a.date} ${a.time||'00:00'}`; const kb = `${b.date} ${b.time||'00:00'}`;
      return ka < kb ? 1 : (ka > kb ? -1 : ((+b.createdAt||0) - (+a.createdAt||0)));
    });
    // 按病症统计发作次数
    const byDisease = {};
    list.forEach(r => {
      const key = r.disease || '(未填写病症)';
      if (!byDisease[key]) byDisease[key] = { disease: key, total: 0, acute: 0, chronic: 0, visit: 0, latest: null, severitySum: 0, sevMax: 0 };
      const o = byDisease[key];
      o.total += 1;
      if (r.type === 'acute') o.acute += 1;
      else if (r.type === 'chronic') o.chronic += 1;
      else if (r.type === 'visit') o.visit += 1;
      o.severitySum += (+r.severity || 0);
      o.sevMax = Math.max(o.sevMax, (+r.severity || 0));
      if (!o.latest || `${r.date} ${r.time||'00:00'}` > `${o.latest.date} ${o.latest.time||'00:00'}`) o.latest = r;
    });
    const stats = Object.values(byDisease).sort((a,b) => b.total - a.total || b.severitySum - a.severitySum);
    // 月度趋势（最近 6 个月每月发作条数量，供柱状图）
    const trend = [];
    const cur = new Date();
    for (let i = 5; i >= 0; i--) {
      const d2 = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const y = d2.getFullYear(); const m = d2.getMonth();
      const key = `${y}-${String(m+1).padStart(2,'0')}`;
      const count = list.filter(r => (r.date||'').startsWith(key)).length;
      trend.push({ key, label: `${m+1}月`, count });
    }
    const total = list.length;
    const acuteCount = list.filter(r => r.type === 'acute').length;
    const sev4plus = list.filter(r => +r.severity >= 4).length;
    return {
      total, acuteCount, sev4plus,
      list: opts.limit ? list.slice(0, +opts.limit) : list,
      stats, trend,
    };
  },
  addMedicalRecord(partial) {
    const rec = this._normMR(partial);
    if (!rec.disease) return { ok:false, msg:'⚠️ 请至少填写「病症名称」（例：头痛 / 胃痛 / 过敏性鼻炎）' };
    const d = this.load();
    d.medicalRecords = Array.isArray(d.medicalRecords) ? d.medicalRecords : [];
    d.medicalRecords.unshift(rec);
    if (d.medicalRecords.length > 2000) d.medicalRecords = d.medicalRecords.slice(0, 2000);
    this.save(d);
    this.log('健康·病历', `${this.MR_TYPE_LABELS[rec.type]||'记录'} · ${rec.disease} · 程度${this.MR_SEV_LABELS[rec.severity]||''}`);
    return { ok:true, record: rec, msg:`✅ 已记录 ${this.MR_TYPE_LABELS[rec.type]||''}：${rec.disease}` };
  },
  updateMedicalRecord(id, patch) {
    const d = this.load();
    const list = Array.isArray(d.medicalRecords) ? d.medicalRecords : [];
    const idx = list.findIndex(r => r.id === id);
    if (idx < 0) return { ok:false, msg:'记录不存在' };
    const merged = Object.assign({}, list[idx], patch || {}, { id, updatedAt: Date.now() });
    const rec = this._normMR(merged);
    if (!rec.disease) return { ok:false, msg:'⚠️ 病症名称必填' };
    list[idx] = rec;
    this.save(d);
    return { ok:true, record: rec, msg:'✅ 已更新' };
  },
  removeMedicalRecord(id) {
    const d = this.load();
    const before = (d.medicalRecords||[]).length;
    d.medicalRecords = (d.medicalRecords||[]).filter(r => r.id !== id);
    if (d.medicalRecords.length === before) return { ok:false, msg:'记录不存在' };
    this.save(d);
    return { ok:true, msg:'🗑️ 已删除该条病历' };
  },
  // 快速记录一次「突发症状」：一行按钮即创建
  quickAcuteAttack(disease, symptomText, severity) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2,'0');
    return this.addMedicalRecord({
      type:'acute',
      disease,
      symptoms: symptomText ? [symptomText] : [],
      severity: Math.min(5, Math.max(1, severity|0 || 2)),
      date: this.today(),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      note: (symptomText||'') + (severity>=4 ? '\n⚠️ 紧急建议：必要时及时就医' : ''),
    });
  },

  // ===== 记录板块：待办计划（倒计时日程 + 重要四象限）=====
  // 四象限 q：1=重要且紧急(立即做) 2=重要不紧急(计划做) 3=紧急不重要(快速处理) 4=不重要不紧急(少做为妙)
  // 旧存档 todoPlans 无 q 字段 → 渲染层按 2 处理（重要不紧急是自我管理的主战场，不打扰用户补录）
  addTodoPlan(title, targetDate, q) {
    if (!title || !targetDate) return { ok: false, msg: '标题与目标日期必填' };
    const { d, w } = this._ensureWbToday();
    const plan = { id: this._id(), title: String(title).slice(0, 60), target: String(targetDate), createdAt: new Date().toISOString(), done: false, q: Math.min(4, Math.max(1, +q || 2)) };
    w.todoPlans.push(plan);
    this.save(d);
    return { ok: true, plan };
  },
  setTodoQuadrant(id, q) {
    const n = Math.min(4, Math.max(1, +q || 2));
    const { d, w } = this._ensureWbToday();
    const p = w.todoPlans.find(x => x.id === id);
    if (!p) return { ok: false };
    p.q = n;
    this.save(d);
    return { ok: true, plan: p };
  },
  toggleTodoPlan(id, done) {
    const { d, w } = this._ensureWbToday();
    const p = w.todoPlans.find(x => x.id === id);
    if (!p) return { ok: false };
    p.done = done === undefined ? !p.done : !!done;
    this.save(d);
    return { ok: true, plan: p };
  },
  delTodoPlan(id) {
    const { d, w } = this._ensureWbToday();
    w.todoPlans = w.todoPlans.filter(x => x.id !== id);
    this.save(d);
    return { ok: true };
  },

  // ===== v6.8 倒数日（自待办拆出）+ 纪念日（顶层字段，不随 workbench 日期重置）=====
  addCountdown(title, date, note) {
    if (!title || !date) return { ok: false, msg: '标题与目标日期必填' };
    const d = this.load();
    if (!Array.isArray(d.countdowns)) d.countdowns = [];
    const item = { id: this._id(), kind: 'cd', title: String(title).slice(0, 60), date: String(date), note: String(note || '').slice(0, 120), createdAt: new Date().toISOString() };
    d.countdowns.push(item);
    this.save(d);
    return { ok: true, item };
  },
  delCountdown(id) {
    const d = this.load();
    d.countdowns = (d.countdowns || []).filter(x => x.id !== id);
    this.save(d);
    return { ok: true };
  },
  addMemorial(title, date, note) {
    if (!title || !date) return { ok: false, msg: '名称与起始日期必填' };
    const d = this.load();
    if (!Array.isArray(d.memorials)) d.memorials = [];
    const item = { id: this._id(), kind: 'mem', title: String(title).slice(0, 60), date: String(date), note: String(note || '').slice(0, 120), createdAt: new Date().toISOString() };
    d.memorials.push(item);
    this.save(d);
    return { ok: true, item };
  },
  delMemorial(id) {
    const d = this.load();
    d.memorials = (d.memorials || []).filter(x => x.id !== id);
    this.save(d);
    return { ok: true };
  },
  // v3.5：勋章/荣誉/积分兑现体系（_grantPointsDaily/getMedals/grantMedal/spendMedal/medalToPoints/getHonors/grantHonor/pointsToCashVoucher）
  // 已随旧货币概念整体移除（积分、勋章、荣誉、积分→现金券通道全部下线）
  // ===== 月度收入预算（经济数据页设置 · 管家消费节奏点评用）=====
  getLedgerIncomePlan() {
    const v = this.getSetting('ledgerIncomeMonthly', 0);
    return (typeof v === 'number' && v > 0) ? v : 0;
  },
  setLedgerIncomePlan(amount) {
    const n = Number(amount);
    this.setSetting('ledgerIncomeMonthly', (n > 0) ? Math.round(n * 100) / 100 : 0);
    return this.getLedgerIncomePlan();
  },
  // 本月预算执行情况（管家点评用）：返回各桶预算/已用/剩余 + 消费节奏
  ledgerBudgetStatus() {
    const income = this.getLedgerIncomePlan();
    const sum = this.ledgerSummary();
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const today = now.getDate();
    // 必要类目：餐饮/日用品/交通/通讯/医药；成长类目：健身/学习；其余归弹性
    const NECESSARY = new Set(['meal', 'groceries', 'traffic', 'phone', 'med']);
    const GROWTH = new Set(['gym', 'study']);
    let necessaryUsed = 0, growthUsed = 0, flexibleUsed = 0;
    Object.entries(sum.byCat).forEach(([cid, amt]) => {
      if (NECESSARY.has(cid)) necessaryUsed += amt;
      else if (GROWTH.has(cid)) growthUsed += amt;
      else flexibleUsed += amt;
    });
    const plan = { necessary: 0.5, growth: 0.2, flexible: 0.3 };
    const out = { income, daysInMonth, today, monthTotal: sum.monthTotal, necessaryUsed, growthUsed, flexibleUsed };
    if (income > 0) {
      out.necessaryBudget = income * plan.necessary;
      out.growthBudget = income * plan.growth;
      out.flexibleBudget = income * plan.flexible;
      out.necessaryLeft = out.necessaryBudget - necessaryUsed;
      out.growthLeft = out.growthBudget - growthUsed;
      out.flexibleLeft = out.flexibleBudget - flexibleUsed;
      // 消费节奏：按时间进度对比支出进度
      out.timePct = Math.round(today / daysInMonth * 100);
      out.spendPct = income > 0 ? Math.round(sum.monthTotal / income * 100) : 0;
      out.pace = out.spendPct - out.timePct; // >10 超前消费，<-10 偏保守
    }
    return out;
  },
  // ====== v2.0.6 新增：🍬 控糖日记 —— 记录每日糖摄入，帮助防治糖尿病 ======
  _sugarKey() { return 'sugar_diary'; },
  _sugarLoad() {
    try { const raw = localStorage.getItem(this._sugarKey()); return raw ? JSON.parse(raw) : { targetG: 25, records: [], settings:{warnThresholdPct:80} }; } catch(_) { return { targetG: 25, records: [], settings:{warnThresholdPct:80} }; }
  },
  _sugarSave(o) { try { localStorage.setItem(this._sugarKey(), JSON.stringify(o)); } catch(_){} },
  getSugarDiary() { return this._sugarLoad(); },
  setSugarTarget(g) {
    const d = this._sugarLoad();
    d.targetG = Math.max(1, Math.min(200, Number(g) || 25));
    this._sugarSave(d); return d;
  },
  addSugarRecord({ grams, food, note, time, date }) {
    const d = this._sugarLoad();
    const rec = {
      id: 'sugar_' + Date.now() + '_' + Math.floor(Math.random()*1e6),
      grams: Math.max(0, Math.round(Number(grams)||0)),
      food: (food||'').trim(),
      note: (note||'').trim(),
      time: time || new Date().toTimeString().slice(0,5),
      date: date || this.today(),
      createdAt: new Date().toISOString()
    };
    if (rec.grams <= 0 && !rec.food) return null;
    d.records.unshift(rec);
    this._sugarSave(d); return rec;
  },
  delSugarRecord(id) {
    const d = this._sugarLoad();
    d.records = d.records.filter(r => String(r.id) !== String(id));
    this._sugarSave(d); return { ok:true };
  },
  // 统计某天糖摄入（默认今日），返回 { totalG, targetG, pct, exceed, records }
  getSugarDay(date) {
    date = date || this.today();
    const d = this._sugarLoad();
    const recs = d.records.filter(r => r.date === date);
    const total = recs.reduce((s,r) => s + (r.grams||0), 0);
    return { totalG: total, targetG: d.targetG || 25, pct: Math.round(total / (d.targetG||25) * 100), exceed: total > (d.targetG||25), records: recs.sort((a,b)=>(a.time||'').localeCompare(b.time||'')) };
  },
  // 近 7 天
  getSugarWeek() {
    const d = this._sugarLoad();
    const days = [];
    const today = new Date();
    for (let i=6; i>=0; i--) {
      const t = new Date(today.getTime() - i*86400000);
      const key = this.todayBJ ? this.todayBJ(new Date(t)) : this.today(new Date(t));
      if (!key) {
        const y=t.getFullYear(), m=String(t.getMonth()+1).padStart(2,'0'), dd=String(t.getDate()).padStart(2,'0');
        days.push({ date: `${y}-${m}-${dd}`, totalG:0, targetG:d.targetG||25 });
      } else {
        days.push({ date:key, totalG:(d.records||[]).filter(r=>r.date===key).reduce((s,r)=>s+(r.grams||0),0), targetG:d.targetG||25 });
      }
    }
    return days;
  },
  // ====== v3.99 习惯打卡（13 张小卡 · 长按打卡 · 时间窗 · 补卡）======
  // 卡片定义在 data.js CONFIG.habitCards；存储结构：
  // habit99: { days: { 'YYYY-MM-DD': { <cardId>: {...打卡数据}, ... } }, makeups: [ {date, cardId, reason, reflection, ts} ] }
  getHabit99() {
    const d = this.load();
    if (!d.habit99) d.habit99 = { days: {}, archive: {}, makeups: [] };
    if (!d.habit99.days) d.habit99.days = {};
    if (!d.habit99.archive || typeof d.habit99.archive !== 'object') d.habit99.archive = {};
    if (!Array.isArray(d.habit99.makeups)) d.habit99.makeups = [];
    return d.habit99;
  },
  // —— v2026.09 数据安全：旧打卡明细归档冷存 ——
  // 规则：>180 天的旧明细压缩为「连击语义级」摘要存入 habit99.archive（详情弹窗/补卡/90日数据中心均只碰近期，不受影响）。
  // 语义保留：water 保留达标总量；计数卡保留「当日有记录」；对象卡保留 done；未破日保留 level（破戒日丢弃→连击正确中断）。
  _h99DayRead(h, k) {
    if (h.days && Object.prototype.hasOwnProperty.call(h.days, k)) return h.days[k];
    if (h.archive && Object.prototype.hasOwnProperty.call(h.archive, k)) return h.archive[k];
    return undefined;
  },
  _compactH99Day(day) {
    const out = {};
    for (const cid in day) {
      const v = day[cid];
      if (Array.isArray(v)) {
        if (cid === 'water') {
          const total = v.reduce((s, x) => s + (parseInt(x.amount, 10) || 0), 0);
          if (total > 0) out[cid] = [{ amount: total }];
        } else if (v.length > 0) out[cid] = [{}];
      } else if (v && typeof v === 'object') {
        const lv = String(v.level || '');
        if (lv.indexOf('未破') === 0) out[cid] = { level: lv };
        else if (lv) { /* 破戒日：不保留 → 连击正确中断 */ }
        else out[cid] = { done: true };
      }
    }
    return out;
  },
  archiveH99OldDays() {
    const d = this.load();
    if (!d.habit99 || !d.habit99.days) return 0;
    if (!d.habit99.archive || typeof d.habit99.archive !== 'object') d.habit99.archive = {};
    const cutoff = new Date(this.nowBeijing() - 180 * 86400000);
    const cutoffKey = cutoff.getFullYear() + '-' + String(cutoff.getMonth()+1).padStart(2,'0') + '-' + String(cutoff.getDate()).padStart(2,'0');
    let moved = 0;
    for (const k of Object.keys(d.habit99.days)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) === false || k >= cutoffKey) continue;
      const compact = this._compactH99Day(d.habit99.days[k]);
      if (Object.keys(compact).length) d.habit99.archive[k] = compact;
      delete d.habit99.days[k];
      moved++;
    }
    if (moved) this.save(d);
    return moved;
  },
  habit99Get(dateKey, cardId) {
    const h = this.getHabit99();
    return (h.days[dateKey] || {})[cardId] || null;
  },
  // 打卡（写入当日数据）
  habit99Check(dateKey, cardId, payload) {
    const d = this.load();
    if (!d.habit99) d.habit99 = { days: {}, makeups: [] };
    if (!d.habit99.days) d.habit99.days = {};
    if (!d.habit99.days[dateKey]) d.habit99.days[dateKey] = {};
    const day = d.habit99.days[dateKey];
    if (cardId === 'poop' || cardId === 'pee' || cardId === 'water' || cardId === 'mood' || cardId === 'trafficCost'
      || cardId === 'lifeCost' || cardId === 'livingCost' || cardId === 'socialCost' || cardId === 'goodsCost' || cardId === 'growthCost'
      || cardId === 'focus' || cardId === 'eatCost') {
      // 可多次打卡：累计次数/总量（心情卡当日可多次记录，冷却由 App 层校验；v2026.0906 新消费卡均为当日多次）
      if (!Array.isArray(day[cardId])) day[cardId] = [];
      day[cardId].push(Object.assign({ ts: new Date().toISOString() }, payload));
    } else if (cardId === 'studyMorning' || cardId === 'studyNoon' || cardId === 'studyEvening') {
      // 学习卡：2 次打卡才算完成（第1次后 45 分钟开放第 2 次）
      if (!Array.isArray(day[cardId])) day[cardId] = [];
      day[cardId].push(Object.assign({ ts: new Date().toISOString() }, payload));
    } else if (cardId === 'noonNap') {
      // 午安卡：两段式（入睡 + 起床）
      const cur = day[cardId] || {};
      day[cardId] = Object.assign({}, cur, payload, { updated: new Date().toISOString() });
    } else {
      day[cardId] = Object.assign({ ts: new Date().toISOString() }, payload);
    }
    this.save(d);
    return { ok: true };
  },
  // 计算某卡连续打卡天数（今天未打不打断连续，从昨天起算）
  habit99Streak(cardId) {
    const h = this.getHabit99();
    const key = (dt) => dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
    // v2026.0905 喝水达标制：当日累计 ≥ 目标 ml 才算完成（连续天数同口径）
    const waterGoal = (typeof CONFIG !== 'undefined' && CONFIG.habit99 && CONFIG.habit99.waterGoalMl) || 1300;
    const isDone = (card) => {
      if (cardId === 'water') {
        return Array.isArray(card) && card.reduce((s, x) => s + (parseInt(x.amount, 10) || 0), 0) >= waterGoal;
      }
      return Array.isArray(card) ? card.length > 0 : !!(card && (card.done || card.ts || card.start || card.firstTs || card.makeup));
    };
    const dt = new Date();
    if (!isDone((this._h99DayRead(h, key(dt)) || {})[cardId])) dt.setDate(dt.getDate() - 1);
    let streak = 0;
    for (let j = 0; j < 3650; j++) {
      const k = key(dt);
      if (isDone((this._h99DayRead(h, k) || {})[cardId])) { streak++; dt.setDate(dt.getDate() - 1); } else break;
    }
    return streak;
  },
  // v2026.0905 健身周卡：连续达标自然周数（本周已达标则计入，未达标不打断从上周回溯；中途任一周 <need 即中断）
  habit99WeeklyStreak(cardId, need) {
    const h = this.getHabit99();
    const key = (dt) => dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
    const mondayOf = (dt) => { const d = new Date(dt); d.setHours(0,0,0,0); d.setDate(d.getDate() - (d.getDay()+6)%7); return d; };
    const countWeek = (monday) => { let n = 0; for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); if ((this._h99DayRead(h, key(d)) || {})[cardId]) n++; } return n; };
    const n = need || 3;
    let cur = mondayOf(new Date());
    let streak = 0;
    if (countWeek(cur) >= n) streak++; // 本周已达标则计入
    cur.setDate(cur.getDate() - 7);
    for (let j = 0; j < 520; j++) {
      if (countWeek(cur) >= n) { streak++; cur.setDate(cur.getDate() - 7); } else break;
    }
    return streak;
  },
  // v2026.0905 正气/正心/正魂：连续「未破」天数（只有 clean=true 的记录才累计）
  // 规则：当日记录为「破」→ 归 0；当日未记录 → 从昨日起算（不打断）；连途中任何一天「破」或缺卡 → 中断
  habit99CleanStreak(cardId) {
    const h = this.getHabit99();
    const key = (dt) => dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
    const isClean = (card) => !!(card && !Array.isArray(card) && typeof card.level === 'string' && card.level.indexOf('未破') === 0);
    const dt = new Date();
    const todayCard = (this._h99DayRead(h, key(dt)) || {})[cardId];
    if (todayCard) {
      // 今日已记录：破 → 0；未破 → 从今日起累计
      if (!isClean(todayCard)) return 0;
    } else {
      dt.setDate(dt.getDate() - 1); // 今日尚未记录：从昨日回溯（连续不被打断）
    }
    let streak = 0;
    for (let j = 0; j < 3650; j++) {
      const k = key(dt);
      if (isClean((this._h99DayRead(h, k) || {})[cardId])) { streak++; dt.setDate(dt.getDate() - 1); } else break;
    }
    return streak;
  },
  // 补卡（仅昨日/今日）：填写原因 + 反省书（反省书返回给 app 层存入记录板块）
  // v2026.0905：补卡支持携带表单 payload（喝水补卡可计入 ml、各卡补卡保留明细字段）
  habit99Makeup(dateKey, cardId, reason, reflection, payload) {
    // v2026.0906 防补卡机制：心情/健康等 noMakeup 卡片禁止补卡（存储层兜底，UI 层补卡中心已过滤）
    try {
      const noMakeupIds = ((typeof CONFIG !== 'undefined' && CONFIG.habitCards) || []).filter(c => c && c.noMakeup).map(c => c.id);
      if (noMakeupIds.includes(cardId)) return { ok: false, msg: '该卡片不支持补卡' };
    } catch (_) {}
    const d = this.load();
    if (!d.habit99) d.habit99 = { days: {}, makeups: [] };
    if (!Array.isArray(d.habit99.makeups)) d.habit99.makeups = [];
    if (!d.habit99.days) d.habit99.days = {};
    if (!d.habit99.days[dateKey]) d.habit99.days[dateKey] = {};
    const day = d.habit99.days[dateKey];
    const pl = payload || {};
    if (cardId === 'poop' || cardId === 'pee' || cardId === 'water') {
      if (!Array.isArray(day[cardId])) day[cardId] = [];
      day[cardId].push(Object.assign({ makeup: true, ts: new Date().toISOString() }, pl));
    } else if (cardId === 'studyMorning' || cardId === 'studyNoon' || cardId === 'studyEvening') {
      if (!Array.isArray(day[cardId])) day[cardId] = [];
      day[cardId].push(Object.assign({ makeup: true, ts: new Date().toISOString() }, pl));
    } else {
      day[cardId] = Object.assign({}, day[cardId] || {}, pl, { makeup: true, ts: new Date().toISOString() });
    }
    d.habit99.makeups.push({ date: dateKey, cardId, reason, reflection, ts: new Date().toISOString() });
    this.save(d);
    return { ok: true, reflection };
  },
  // 日律：汇总某日习惯数据（供【记录】板块展示）
  habit99DailySummary(dateKey) { return this._habit99SummaryOf(this.getHabit99(), dateKey); },
  // 内部：基于已加载的 habit99 计算单日摘要（批量场景避免逐日重复解析整库存档）
  _habit99SummaryOf(h, dateKey) {
    const day = this._h99DayRead(h, dateKey) || {};
    const meals = ['breakfast','lunch','dinner'].filter(k => day[k] && (day[k].ts || day[k].done)).length;
    const waterMl = (day.water || []).reduce((s, x) => s + (parseInt(x.amount, 10) || 0), 0);
    const poopCnt = (day.poop || []).length;
    const peeCnt = (day.pee || []).length;
    const studyMin = ['studyMorning','studyNoon','studyEvening'].reduce((s, k) => {
      const arr = day[k] || [];
      return s + arr.filter(x => x.durationMin).reduce((a, x) => a + (+x.durationMin || 0), 0);
    }, 0);
    // v3.99 健身卡：训练分钟计入当日运动时长
    const fit = day.fitness;
    const sportMin = (fit && +fit.minutes > 0) ? (+fit.minutes) : 0;
    // 午睡时长：入睡/起床时间差
    let napMin = 0;
    const nap = day.noonNap;
    if (nap && nap.start && nap.end) {
      const [sh, sm] = String(nap.start).split(':').map(Number);
      const [eh, em] = String(nap.end).split(':').map(Number);
      if (!isNaN(sh) && !isNaN(eh)) {
        let a = sh*60+sm, b = eh*60+em;
        if (b <= a) b += 24*60;
        napMin = Math.round(b - a);
      }
    }
    // 夜间睡眠：昨日晚安入睡 → 今日早安起床
    let nightH = 0;
    const gm = day.goodMorning;
    if (gm && gm.wake) {
      const yk = (() => { const t = new Date(dateKey + 'T00:00:00'); t.setDate(t.getDate()-1); return t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0'); })();
      const gn = (this._h99DayRead(h, yk) || {}).goodNight;
      if (gn && gn.sleep) {
        const [sh, sm] = String(gn.sleep).split(':').map(Number);
        const [eh, em] = String(gm.wake).split(':').map(Number);
        if (!isNaN(sh) && !isNaN(eh)) {
          let a = sh*60+sm, b = eh*60+em;
          if (b <= a) b += 24*60;
          nightH = Math.round((b - a) / 60 * 10) / 10;
        }
      }
    }
    // v3.3 智慧中心（原日结中心）扩展：健身/正气/正魂/服药/睡眠质量/昨日入睡时刻
    const fitnessDone = !!(fit && (fit.ts || fit.minutes > 0));
    const zhengqi = day.zhengqi || {};
    const zhenghun = day.zhenghun || {};
    const medicineTaken = !!(day.medicine && (day.medicine.ts || (day.medicine.drugs || []).length));
    const medicineAVMissed = !!(day.medicine && day.medicine.noAVReason); // 有打卡但未服抗病毒（填了停药原因）
    const wakeMin = (gm && gm.wake) ? (() => { const [a, b] = String(gm.wake).split(':').map(Number); return isNaN(a) ? 0 : a * 60 + (b || 0); })() : 0;
    let sleepAtMin = 0;
    { const yk2 = (() => { const t = new Date(dateKey + 'T00:00:00'); t.setDate(t.getDate()-1); return t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0'); })();
      const gn2 = (this._h99DayRead(h, yk2) || {}).goodNight; if (gn2 && gn2.sleep) { const [a, b] = String(gn2.sleep).split(':').map(Number); if (!isNaN(a)) sleepAtMin = a * 60 + (b || 0); } }
    // v2026.0906 新卡摘要：心情（当日次数 + 最近一次类型/原因 + 距下次可记录的分钟数）/ 健康（状态 + 症状）
    const moodArr = Array.isArray(day.mood) ? day.mood : [];
    const moodLast = moodArr.length ? moodArr[moodArr.length - 1] : null;
    const moodNextMin = (() => {
      if (!moodLast) return 0;
      const el = Date.now() - Date.parse(moodLast.ts || '');
      if (isNaN(el) || el < 0) return 0;
      return Math.max(0, 60 - Math.floor(el / 60000)); // 距离冷却结束剩余分钟（App 层以 ms 精确校验）
    })();
    const healthCard = (!Array.isArray(day.health) && day.health) || null;
    const healthStatus = (healthCard && healthCard.status) || '';
    const healthSymptoms = (healthCard && Array.isArray(healthCard.symptoms)) ? healthCard.symptoms : [];
    // v2026.0906 三餐就餐类型/花费 + 步数卡
    const mealIds = ['breakfast','lunch','dinner'];
    const mealOutCnt = mealIds.filter(k => day[k] && (day[k].mealType === '外卖' || day[k].mealType === '堂食')).length;
    const mealCost = mealIds.reduce((s, k) => s + (day[k] && +day[k].cost > 0 ? +day[k].cost : 0), 0);
    const stepsCard = !Array.isArray(day.steps) && day.steps ? day.steps : null;
    const stepsCount = stepsCard ? (+stepsCard.count || 0) : 0;
    return { meals, waterL: Math.round(waterMl / 100) / 10, waterMl, poopCnt, peeCnt, studyMin, sportMin, napMin, nightH,
      fitnessDone, zhengqiLevel: zhengqi.level || '', zhengqiClean: zhengqi.clean === true, zhengqiBreak: zhengqi.clean === false,
      zhenghunLevel: zhenghun.level || '', zhenghunBreak: zhenghun.clean === false && (zhenghun.level || '').startsWith('大破'), zhenghunSmall: (zhenghun.level || '').startsWith('小破'),
      medicineTaken, medicineAVMissed, wakeMin, sleepAtMin,
      sleepQuality: (gm && +gm.quality) || 0, dayQuality: ((day.goodNight || {}).quality || 0),
      moodCnt: moodArr.length, moodLastType: (moodLast && moodLast.type) || '', moodLastReason: (moodLast && moodLast.reason) || '', moodNextMin,
      healthStatus, healthSymptoms, healthSick: healthStatus === '小病缠身', healthGood: healthStatus === '感觉良好',
      // v2026.0906 大病复查（HIV/HPV/TP → 体检/治疗/买药）+ 医疗消/交通消摘要（供模型与记账读取）
      healthRecheck: healthStatus === '大病复查' ? { disease: healthCard.recheckDisease || '', acts: (Array.isArray(healthCard.recheckActs) ? healthCard.recheckActs : []), note: healthCard.recheckNote || '' } : null,
      medCostAmount: (day.medCost && +day.medCost.amount > 0) ? +day.medCost.amount : 0,
      trafficCostCnt: Array.isArray(day.trafficCost) ? day.trafficCost.length : 0,
      trafficCostTotal: (Array.isArray(day.trafficCost) ? day.trafficCost : []).reduce((s, x) => s + (+x.amount || 0), 0),
      // v2026.0906 正姿卡摘要（未破姿/小破姿/大破姿 · 供每日结算表与报告读取）
      postureLevel: (!Array.isArray(day.posture) && day.posture && day.posture.level) || '',
      postureClean: !!(day.posture && day.posture.level === '未破姿'),
      postureBroken: !!(day.posture && (day.posture.level === '小破姿' || day.posture.level === '大破姿')),
      postureBig: !!(day.posture && day.posture.level === '大破姿'),
      mealOutCnt, mealCost, stepsCount, stepsDone: !!(stepsCard && (stepsCard.ts || stepsCard.makeup || stepsCard.count)),
      // v2026.0906 新卡摘要：健身餐补剂 / 营养餐保健品 / 痘清洁（供三大模型读取）
      fitnessMealItems: (day.fitnessMeal && Array.isArray(day.fitnessMeal.items)) ? day.fitnessMeal.items : [],
      nutriMealItems: (day.nutriMeal && Array.isArray(day.nutriMeal.items)) ? day.nutriMeal.items : [],
      acneCleanDone: !!(day.acneClean && (day.acneClean.ts || day.acneClean.makeup)),
      // v10.0 隐私洗摘要（部位 + 不适症状 · 供五脏六腑模型/健康分析读取）
      privacyWashDone: !!(day.privacyWash && (day.privacyWash.ts || day.privacyWash.makeup)),
      privacyWashParts: (day.privacyWash && Array.isArray(day.privacyWash.parts)) ? day.privacyWash.parts : [],
      privacyWashSymptom: (day.privacyWash && day.privacyWash.symptom && day.privacyWash.symptom !== '无') ? day.privacyWash.symptom : '',
      // v10.0 吃吃消摘要（奶茶/果汁糖分 · 水果明细 · 供消化代谢/五脏六腑模型读取）
      eatCostCnt: Array.isArray(day.eatCost) ? day.eatCost.length : 0,
      eatCostSugarG: Array.isArray(day.eatCost) ? day.eatCost.reduce((s, x) => {
        if (!x.sugarInfo) return s;
        const perMl = { '无糖': 0, '三分糖': 0.035, '五分糖': 0.055, '七分糖': 0.075, '全糖': 0.10 }[x.sugarInfo.sugarLvl] || 0.05;
        const ratio = Math.min(1, (+x.sugarInfo.drankMl || 0) / (+x.sugarInfo.capMl || 1));
        return s + (+x.sugarInfo.capMl || 0) * perMl * ratio;
      }, 0) : 0,
      eatCostFruit: Array.isArray(day.eatCost) ? day.eatCost.filter(x => x.fruit).map(x => ({ name: x.fruit.name || '', ate: x.fruit.ate || '' })) : [],
      eatCostTotal: (Array.isArray(day.eatCost) ? day.eatCost : []).reduce((s, x) => s + (+x.amount || 0), 0),
      date: dateKey };
  },
  _readingNotesData() {
    const d = this.load();
    if (!d.readingNotes) d.readingNotes = { books: [], notes: [] };
    if (!Array.isArray(d.readingNotes.books)) d.readingNotes.books = [];
    if (!Array.isArray(d.readingNotes.notes)) d.readingNotes.notes = [];
    return d.readingNotes;
  },
  readingBookSave(book) {
    // 统一「一次 load() → 修改 → save()」单副本模式（与 _readingNotesData 同一副本，保证引用一致）
    const d = this.load();
    if (!d.readingNotes) d.readingNotes = { books: [], notes: [] };
    if (!Array.isArray(d.readingNotes.books)) d.readingNotes.books = [];
    if (!Array.isArray(d.readingNotes.notes)) d.readingNotes.notes = [];
    const rn2 = d.readingNotes;
    book.updatedAt = new Date().toISOString();
    if (book.id) {
      const i = rn2.books.findIndex(b => b.id === book.id);
      if (i >= 0) { rn2.books[i] = Object.assign({}, rn2.books[i], book); this.save(d); return rn2.books[i]; }
    }
    book.id = this._id();
    book.createdAt = new Date().toISOString();
    if (!book.status) book.status = 'reading';
    if (!book.startedAt) book.startedAt = this.today();
    rn2.books.unshift(book);
    this.save(d);
    return book;
  },
  readingBookDelete(id) {
    const d = this.load();
    const rn = d.readingNotes || (d.readingNotes = { books: [], notes: [] });
    rn.books = (rn.books || []).filter(b => b.id !== id);
    rn.notes = (rn.notes || []).filter(n => n.bookId !== id);  // 级联删除该书全部笔记
    this.save(d);
    return { ok: true };
  },
  readingBookSetStatus(id, status) {
    const d = this.load();
    const rn = d.readingNotes || (d.readingNotes = { books: [], notes: [] });
    const b = (rn.books || []).find(x => x.id === id);
    if (!b) return { ok: false, msg: '书籍不存在' };
    b.status = status;
    if (status === 'done' && !b.finishedAt) b.finishedAt = this.today();
    this.save(d);
    return { ok: true };
  },
  readingNoteSave(note) {
    const d = this.load();
    const rn = d.readingNotes || (d.readingNotes = { books: [], notes: [] });
    if (!Array.isArray(rn.notes)) rn.notes = [];
    note.updatedAt = new Date().toISOString();
    if (note.id) {
      const i = rn.notes.findIndex(n => n.id === note.id);
      if (i >= 0) { rn.notes[i] = Object.assign({}, rn.notes[i], note); this.save(d); return rn.notes[i]; }
    }
    note.id = this._id();
    note.createdAt = new Date().toISOString();
    if (!note.rating) note.rating = 0;
    if (!Array.isArray(note.actions)) note.actions = [];
    if (!Array.isArray(note.tags)) note.tags = [];
    rn.notes.unshift(note);
    this.save(d);
    return note;
  },
  readingNoteDelete(id) {
    const d = this.load();
    const rn = d.readingNotes || (d.readingNotes = { books: [], notes: [] });
    rn.notes = (rn.notes || []).filter(n => n.id !== id);
    this.save(d);
    return { ok: true };
  },
  readingNotesStats() {
    const rn = this._readingNotesData();
    const byBook = {};
    rn.notes.forEach(n => { byBook[n.bookId] = (byBook[n.bookId] || 0) + 1; });
    return {
      total: rn.books.length,
      reading: rn.books.filter(b => b.status === 'reading').length,
      done: rn.books.filter(b => b.status === 'done').length,
      abandoned: rn.books.filter(b => b.status === 'abandoned').length,
      notes: rn.notes.length,
      byBook,
    };
  },

  // —— 【挑战中心】用户自定义长期挑战 ——
  // d.challenges = [{id,name,icon,targetDays(0=永久),startDate,checkins:{'YYYY-MM-DD':true},status:'active'|'done'|'quit',createdAt,doneAt}]
  _challengesData() {
    const d = this.load();
    if (!Array.isArray(d.challenges)) d.challenges = [];
    return d.challenges;
  },
  challengeSave(ch) {
    const d = this.load();
    if (!Array.isArray(d.challenges)) d.challenges = [];
    ch.updatedAt = new Date().toISOString();
    if (ch.id) {
      const i = d.challenges.findIndex(x => x.id === ch.id);
      if (i >= 0) { d.challenges[i] = Object.assign({}, d.challenges[i], ch); this.save(d); return d.challenges[i]; }
    }
    ch.id = this._id();
    ch.createdAt = new Date().toISOString();
    if (!ch.icon) ch.icon = '🏆';
    if (!ch.targetDays) ch.targetDays = 0;
    if (!ch.startDate) ch.startDate = this.today();
    if (!ch.checkins) ch.checkins = {};
    if (!ch.status) ch.status = 'active';
    d.challenges.unshift(ch);
    this.save(d);
    return ch;
  },
  challengeDelete(id) {
    const d = this.load();
    d.challenges = (d.challenges || []).filter(c => c.id !== id);
    this.save(d);
    return { ok: true };
  },
  challengeCheckin(id) {
    const d = this.load();
    const ch = (d.challenges || []).find(c => c.id === id);
    if (!ch) return { ok: false, msg: '挑战不存在' };
    if (ch.status !== 'active') return { ok: false, msg: '挑战已结束' };
    const today = this.today();
    if (ch.checkins[today]) return { ok: false, msg: '今日已打卡' };
    ch.checkins[today] = true;
    // 达标检测：固定天数挑战满 targetDays 个打卡日 → 自动转正（status='done'，卡面保留「挑战」徽标）
    let justDone = false;
    if (ch.targetDays > 0 && Object.keys(ch.checkins).length >= ch.targetDays) {
      ch.status = 'done';
      ch.doneAt = today;
      justDone = true;
    }
    this.save(d);
    return { ok: true, justDone, count: Object.keys(ch.checkins).length };
  },
  challengeUndoToday(id) {
    const d = this.load();
    const ch = (d.challenges || []).find(c => c.id === id);
    if (!ch) return { ok: false, msg: '挑战不存在' };
    delete ch.checkins[this.today()];
    // 若撤销导致不达标，回退状态（刚转正又撤销当日打卡的场景）
    if (ch.status === 'done' && ch.targetDays > 0 && Object.keys(ch.checkins).length < ch.targetDays) {
      ch.status = 'active';
      delete ch.doneAt;
    }
    this.save(d);
    return { ok: true };
  },
  challengeQuit(id) {
    const d = this.load();
    const ch = (d.challenges || []).find(c => c.id === id);
    if (!ch) return { ok: false, msg: '挑战不存在' };
    ch.status = 'quit';
    this.save(d);
    return { ok: true };
  },
  // v11.0 挑战违约：戒X类目标当日记录到相关消费 → 当日未达标（撤销当日打卡，连续天数自然中断）
  // info = { cardId, text, keyword }（违约来源与证据文本）
  challengeViolate(id, dk, info) {
    const d = this.load();
    const ch = (d.challenges || []).find(c => c.id === id);
    if (!ch || ch.status !== 'active') return { ok: false, msg: '挑战不存在或已结束' };
    if (!ch.violations) ch.violations = {};
    ch.violations[dk] = info || { cardId: '', text: '', keyword: '' };
    // 当日已有打卡一并撤销（当日已破戒，打卡不再成立）
    if (ch.checkins && ch.checkins[dk]) delete ch.checkins[dk];
    this.save(d);
    return { ok: true };
  },
  // 挑战连续打卡天数（今天未打不打断连续）
  challengeStreak(ch) {
    const keys = new Set(Object.keys(ch.checkins || {}));
    const dt = new Date();
    const fmt = (d) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    if (!keys.has(fmt(dt))) dt.setDate(dt.getDate() - 1);
    let streak = 0;
    while (keys.has(fmt(dt))) { streak++; dt.setDate(dt.getDate() - 1); }
    return streak;
  },

  // —— 【专注】冥想/番茄钟 记录（habit99 体系外挂：d.focus99 = {logs:[{date,type,durationMin,distracted,ts}],totalMin}）——
  focus99Log(type, durationMin, distracted) {
    const d = this.load();
    if (!d.focus99) d.focus99 = { logs: [], totalMin: 0 };
    d.focus99.logs.unshift({ date: this.today(), type, durationMin, distracted, ts: new Date().toISOString() });
    if (d.focus99.logs.length > 500) d.focus99.logs.length = 500;
    d.focus99.totalMin = (d.focus99.totalMin || 0) + durationMin;
    this.save(d);
    return { ok: true };
  },
  focus99Today() {
    const d = this.load();
    const today = this.today();
    const logs = ((d.focus99 && d.focus99.logs) || []).filter(x => x.date === today);
    return {
      count: logs.length,
      medMin: logs.filter(x => x.type === 'meditate').reduce((s, x) => s + (+x.durationMin || 0), 0),
      jushenMin: logs.filter(x => x.type === 'jushen').reduce((s, x) => s + (+x.durationMin || 0), 0), // v12.1 聚神模式时长
      pomoMin: logs.filter(x => x.type === 'pomodoro').reduce((s, x) => s + (+x.durationMin || 0), 0),
    };
  },

  // —— v12.9 【数据中心 · 运动数据】（86-sport99.js 专用存取口）——
  _sport99Norm(d) {
    if (!d.sport99) d.sport99 = { measures: [], workouts: [], studies: [], settings: { targetWeight: 0 } };
    const s = d.sport99;
    if (!Array.isArray(s.measures)) s.measures = [];
    if (!Array.isArray(s.workouts)) s.workouts = [];
    if (!Array.isArray(s.studies)) s.studies = [];
    if (!s.settings) s.settings = {};
    if (typeof s.settings.targetWeight !== 'number') s.settings.targetWeight = 0;
    return s;
  },
  getSport99() { return this._sport99Norm(this.load()); },
  // 体测记录：新增/覆盖（同 id 覆盖；无 id 新建）；weight/fat 单位公斤/%，围度单位厘米
  sport99SaveMeasure(rec) {
    const d = this.load();
    const s = this._sport99Norm(d);
    const num = (v) => { const x = parseFloat(v); return isFinite(x) && x > 0 ? Math.round(x * 10) / 10 : 0; };
    const r = {
      id: rec.id || ('m' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)),
      date: (rec.date || this.today()).slice(0, 10),
      ts: rec.ts || new Date().toISOString(),
      weight: num(rec.weight), fat: num(rec.fat),
      neck: num(rec.neck), shoulder: num(rec.shoulder), chest: num(rec.chest),
      waist: num(rec.waist), hip: num(rec.hip),
      lArm: num(rec.lArm), rArm: num(rec.rArm),
      lThigh: num(rec.lThigh), rThigh: num(rec.rThigh),
      lCalf: num(rec.lCalf), rCalf: num(rec.rCalf),
      note: String(rec.note || '').slice(0, 200),
    };
    const i = s.measures.findIndex(x => x.id === r.id);
    if (i >= 0) s.measures[i] = r; else s.measures.unshift(r);
    s.measures.sort((a, b) => (b.date + b.ts).localeCompare(a.date + a.ts)); // 新→旧
    if (s.measures.length > 500) s.measures.length = 500;
    // 最新体重同步主人档案（身高体重同源，一处录入两处可用）
    const w0 = s.measures[0] && s.measures[0].weight;
    if (w0) { d.profile = d.profile || {}; d.profile.weight = w0; }
    this.save(d);
    return { ok: true, rec: r };
  },
  sport99DelMeasure(id) {
    const d = this.load();
    const s = this._sport99Norm(d);
    s.measures = s.measures.filter(x => x.id !== id);
    this.save(d);
    return { ok: true };
  },
  // 聚神·运动 会话记录（durMin 向下取整分钟；cal/hav hr/sets/dist 可空）
  sport99SaveWorkout(w) {
    const d = this.load();
    const s = this._sport99Norm(d);
    s.workouts.unshift({
      id: 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      date: this.today(),
      ts: new Date().toISOString(),
      durMin: Math.max(0, Math.round((+w.durMin || 0))),
      mode: w.mode === 'strength' ? 'strength' : 'cardio',
      cal: Math.max(0, Math.round(+w.cal || 0)),
      hr: Math.max(0, Math.round(+w.hr || 0)),
      sets: Math.max(0, Math.round(+w.sets || 0)),
      dist: Math.max(0, Math.round((+w.dist || 0) * 10) / 10),
      note: String(w.note || '').slice(0, 200),
    });
    if (s.workouts.length > 500) s.workouts.length = 500;
    this.save(d);
    return { ok: true };
  },
  // 聚神·学习 会话记录
  sport99SaveStudy(w) {
    const d = this.load();
    const s = this._sport99Norm(d);
    s.studies.unshift({
      id: 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      date: this.today(),
      ts: new Date().toISOString(),
      durMin: Math.max(0, Math.round((+w.durMin || 0))),
      subject: String(w.subject || '').slice(0, 60),
      note: String(w.note || '').slice(0, 200),
    });
    if (s.studies.length > 500) s.studies.length = 500;
    this.save(d);
    return { ok: true };
  },
  sport99SetTargetWeight(v) {
    const d = this.load();
    const s = this._sport99Norm(d);
    const x = parseFloat(v);
    s.settings.targetWeight = isFinite(x) && x > 0 ? Math.round(x * 10) / 10 : 0;
    this.save(d);
    return { ok: true };
  },

  // —— v12.9 【数据中心 · 学习数据】（87-study99.js 专用存取口）——
  _study99Norm(d) {
    if (!d.study99) d.study99 = { points: [], practices: [] };
    const s = d.study99;
    if (!Array.isArray(s.points)) s.points = [];
    if (!Array.isArray(s.practices)) s.practices = [];
    return s;
  },
  getStudy99() { return this._study99Norm(this.load()); },
  // 知识点：新增/覆盖（同 id 覆盖；subject 限六科白名单外也放行，名称截 40 字）
  study99SavePoint(rec) {
    const d = this.load();
    const s = this._study99Norm(d);
    const r = {
      id: rec.id || ('p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)),
      subject: String(rec.subject || '英语').slice(0, 12),
      name: String(rec.name || '').slice(0, 40).trim(),
      mastered: rec.mastered ? 1 : 0,
      ts: rec.ts || new Date().toISOString(),
      mTs: rec.mastered ? (rec.mTs || new Date().toISOString()) : '',
    };
    if (!r.name) return { ok: false, err: 'empty-name' };
    const i = s.points.findIndex(x => x.id === r.id);
    if (i >= 0) s.points[i] = r; else s.points.unshift(r);
    if (s.points.length > 500) s.points.length = 500;
    this.save(d);
    return { ok: true, rec: r };
  },
  // 知识点：切换掌握状态（返回切换后状态）
  study99TogglePoint(id) {
    const d = this.load();
    const s = this._study99Norm(d);
    const p = s.points.find(x => x.id === id);
    if (!p) return { ok: false };
    p.mastered = p.mastered ? 0 : 1;
    p.mTs = p.mastered ? new Date().toISOString() : '';
    this.save(d);
    return { ok: true, mastered: p.mastered };
  },
  study99DelPoint(id) {
    const d = this.load();
    const s = this._study99Norm(d);
    s.points = s.points.filter(x => x.id !== id);
    this.save(d);
    return { ok: true };
  },
  // 练习记录：新增（practice=练习名 · subject=科目 · total/correct=题数/正确数）
  study99SavePractice(rec) {
    const d = this.load();
    const s = this._study99Norm(d);
    s.practices.unshift({
      id: 'q' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      date: (rec.date || this.today()).slice(0, 10),
      ts: new Date().toISOString(),
      practice: String(rec.practice || '').slice(0, 40),
      subject: String(rec.subject || '').slice(0, 12),
      total: Math.max(0, Math.round(+rec.total || 0)),
      correct: Math.max(0, Math.round(+rec.correct || 0)),
      note: String(rec.note || '').slice(0, 200),
    });
    if (s.practices.length > 500) s.practices.length = 500;
    this.save(d);
    return { ok: true };
  },
  study99DelPractice(id) {
    const d = this.load();
    const s = this._study99Norm(d);
    s.practices = s.practices.filter(x => x.id !== id);
    this.save(d);
    return { ok: true };
  },

  // —— v12.9.3 【练习站】刷题流水（88/90-quiz99 专用）：每答一题记一条，当日题量/正确率/错题本全部由此推导 ——
  // logs: [{id, date:YYYY-MM-DD, ts, sub:'en|pol|math|cs|prof', set:setId, qid, ok:0|1}] 上限 3000（超出裁旧）
  _quiz99Norm(d) {
    if (!d.quiz99) d.quiz99 = { logs: [] };
    if (!Array.isArray(d.quiz99.logs)) d.quiz99.logs = [];
    return d.quiz99;
  },
  getQuiz99() { return this._quiz99Norm(this.load()); },
  quiz99Log(rec) {
    const d = this.load();
    const s = this._quiz99Norm(d);
    s.logs.push({
      id: 'z' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      date: (rec.date || this.today()).slice(0, 10),
      ts: new Date().toISOString(),
      sub: String(rec.sub || '').slice(0, 8),
      set: String(rec.set || '').slice(0, 40),
      qid: String(rec.qid || '').slice(0, 60),
      ok: rec.ok ? 1 : 0,
    });
    if (s.logs.length > 3000) s.logs.splice(0, s.logs.length - 3000);
    this.save(d);
    return { ok: true };
  },
  // 当日战绩：{count, right, acc}
  quiz99Today(dateStr) {
    const s = this._quiz99Norm(this.load());
    const dk = (dateStr || this.today()).slice(0, 10);
    const ls = s.logs.filter(l => l.date === dk);
    const right = ls.filter(l => l.ok).length;
    return { count: ls.length, right, acc: ls.length ? Math.round(right / ls.length * 100) : 0 };
  },
  // 错题本：最近一次作答仍为错的题（重做答对自动移出）
  quiz99WrongIds() {
    const s = this._quiz99Norm(this.load());
    const latest = {};
    s.logs.forEach(l => { latest[l.qid] = l.ok; }); // 后写覆盖 → 每题取最近一次
    return Object.keys(latest).filter(k => !latest[k]);
  },

  // —— 【管家阿福 · AI 聊天】配置存 settings；消息记录独立存储（防撑爆主存档）——
  // settings: afu_ai_enabled（总开关）/ afu_ai_mode（direct|worker）/ afu_worker_url / afu_api_base / afu_api_key / afu_api_model
  //   以及 afu_key_deepseek / afu_key_zhipu（v11.7.2 每模型独立 Key 槽位，切换模型自动带各自的 Key）
  // v11.7.2 内置出厂密钥（用户本人提供的自有密钥，应本人要求内置实现「部署即用」）：
  //   ⚠️⚠️⚠️ 仅适用于【私人部署】：任何拿到部署网址/单文件 HTML 的人都能从前端代码提取这两个密钥！
  //   ⚠️ 切勿公开分享部署地址或单文件版；若已泄露，立即去对应平台吊销并更换新 Key 后改这里。
  // v13.3.29 本仓库是【公开镜像】——内置出厂密钥已在此清空：
  //   ① 公开仓库的推送保护（secret scanning）会直接拒绝含密钥的提交（实测拦截）；
  //   ② 本仓库只承载 apk/ 与更新清单，镜像网页上的阿福请在 App 内「设置」自填 Key。
  //   主仓库（源码/构建产物）不受影响，仍按上面的原规则使用内置出厂密钥。
  AFU99_BAKED_KEYS: {
    deepseek: '',
    zhipu: '',
  },
  // v11.7 管家阿福 AI 双通道（总开关 afu_ai_enabled 一键启停整套 AI）：
  //   ① 直连模式（默认，DeepSeek / 智谱 双预设，点卡即切换；Key 未自定义时用内置出厂密钥）
  //   ② Worker 代理模式（glm-4-flash：密钥只存用户自部署的 Cloudflare Worker 环境变量，前端零密钥；
  //      本地 file 协议打开时该模式置灰提示）
  afuAIConfig() {
    const base = this.getSetting('afu_api_base', 'https://api.deepseek.com/v1') || 'https://api.deepseek.com/v1';
    const defKey = /bigmodel/i.test(base) ? this.AFU99_BAKED_KEYS.zhipu : this.AFU99_BAKED_KEYS.deepseek;
    return {
      enabled: this.getSetting('afu_ai_enabled', '1') !== '0', // 总开关默认开
      mode: this.getSetting('afu_ai_mode', 'direct') === 'worker' ? 'worker' : 'direct',
      worker: (this.getSetting('afu_worker_url', '') || '').trim(), // 不内置写死地址，由用户填入
      base,
      key: this.getSetting('afu_api_key', defKey), // 未自定义时用内置出厂密钥（存过空串=用户主动清空）
      model: this.getSetting('afu_api_model', 'deepseek-chat') || 'deepseek-chat',
    };
  },
  // v11.7.2 每模型 Key 槽位：读取（未自定义时回退出厂密钥）
  afuKeySlot(preset) {
    const k = preset === 'zhipu' ? 'afu_key_zhipu' : 'afu_key_deepseek';
    return this.getSetting(k, preset === 'zhipu' ? this.AFU99_BAKED_KEYS.zhipu : this.AFU99_BAKED_KEYS.deepseek);
  },
  afuKeySlotSave(preset, key) {
    this.setSetting(preset === 'zhipu' ? 'afu_key_zhipu' : 'afu_key_deepseek', (key || '').trim());
    return { ok: true };
  },
  afuAIEnabledSave(on) {
    this.setSetting('afu_ai_enabled', on ? '1' : '0');
    return { ok: true };
  },
  afuAIModeSave(mode) {
    this.setSetting('afu_ai_mode', mode === 'worker' ? 'worker' : 'direct');
    return { ok: true };
  },
  afuWorkerUrlSave(u) {
    this.setSetting('afu_worker_url', (u || '').trim());
    return { ok: true };
  },
  afuApiSave(base, key, model) {
    this.setSetting('afu_api_base', (base || '').trim());
    this.setSetting('afu_api_key', (key || '').trim());
    this.setSetting('afu_api_model', (model || '').trim());
    return { ok: true };
  },
  afuChatLoad() {
    try { return JSON.parse(localStorage.getItem('afu_chat_v1') || '[]'); } catch(_) { return []; }
  },
  afuChatSave(msgs) {
    try { localStorage.setItem('afu_chat_v1', JSON.stringify(msgs.slice(-200))); } catch(_) {}
  },
  afuChatClear() {
    try { localStorage.removeItem('afu_chat_v1'); } catch(_) {}
  },

  // ===== v12.9.21 数据变更事件总线（Data Bus）=====
  // 背景：跨模块联动此前靠散落各处的直接调用（写死耦合）——某板块出问题牵连面靠人脑记忆。
  // 用法：Store.bus.on('habit99', fn) 订阅某域变更；Store.save 落盘时自动 diff 顶层键 → 按域广播。
  //       fn(payload) 收到 { domains:[变更域], date }；返回值忽略；异常吞掉不传染。
  bus: {
    _subs: {},
    on(domain, fn) {
      if (!domain || typeof fn !== 'function') return () => {};
      const m = this._subs;
      (m[domain] = m[domain] || []).push(fn);
      return () => { const a = m[domain] || []; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); };
    },
    emit(domains) {
      const list = Array.isArray(domains) ? domains : [domains];
      const seen = new Set();
      list.concat(['*']).forEach(dm => { // '*' = 全域监听（调试/总刷新用）
        if (seen.has(dm)) return; seen.add(dm);
        (this._subs[dm] || []).forEach(fn => { try { fn({ domains: list }); } catch (_) {} });
      });
    },
  },

  // 跨域共享层写入口的统一域标签：save 时 diff 出「哪些顶层键变了」→ 映射到功能组广播
  // 新增数据域时在此登记一行（组别与 _manifest.json 的 G1~G8 对齐），牵连排查/数据共享都按这张表走
  DOMAIN_GROUPS: {
    records: 'G2-生活基础', coinLogs: 'G2-生活基础', coins: 'G2-生活基础', ledger: 'G4-数据洞察',
    diaries: 'G5-情感陪伴', profile: 'G8-首页导航', medicalRecords: 'G2-生活基础',
    habit99: 'G2-生活基础', workbench: 'G2-生活基础', sport99: 'G4-数据洞察', study99: 'G3-学习成长',
    goals: 'G3-学习成长', snapshots: 'G4-数据洞察', settings: 'G1-系统内核', systemLogs: 'G1-系统内核',
    wbNotes99: 'G5-情感陪伴', wbSparks99: 'G5-情感陪伴', wbRegrets99: 'G5-情感陪伴',
    wbDreams99: 'G5-情感陪伴', wbDrift99: 'G5-情感陪伴', wbFootprints99: 'G5-情感陪伴',
    countdowns: 'G8-首页导航', memorials: 'G8-首页导航',
  },

  // ===== v12.9.21 跨域数据共享枢纽（Data Hub · 单一事实源）=====
  // 背景（用户需求：数据孤岛优化）：首页/报告/洞察/宠物各自聚合跨域数据，口径漂移且互相不可见。
  // 约定：跨域统计只允许在 hub 计算一次，消费方一律取 hub——换口径只改一处，全端一致。
  // 口径说明：recordPct = 记录板块（records·旧习惯）完成度；habitPct = 习惯 25 卡（habit99）完成度——两套口径并存，按名取用。
  hub: {
    // 域注册表：新增功能先在此查归属组与共享口径（与 _manifest.json groups 对齐）
    domains() {
      return {
        records:        { group: 'G2-生活基础',  desc: '记录板块·睡眠/饮食/卫生/运动/学习/服药', accessor: 'Store.getDay(dk)' },
        habit99:        { group: 'G2-生活基础',  desc: '习惯 25 卡打卡', accessor: 'Store.getHabit99() / habit99DailySummary(dk)' },
        sport99:        { group: 'G4-数据洞察',  desc: '体测/训练/学习会话（聚神写入）', accessor: 'Store.getSport99()' },
        study99:        { group: 'G3-学习成长',  desc: '知识点掌握/练习记录', accessor: 'Store.getStudy99()' },
        goals:          { group: 'G3-学习成长',  desc: '30/90/365 天目标', accessor: 'Store.getGoals()' },
        coins:          { group: 'G2-生活基础',  desc: '金币余额+流水', accessor: 'Store.getCoins()' },
        ledger:         { group: 'G4-数据洞察',  desc: '经济账本（记一笔）', accessor: 'Store.getLedger()' },
        diaries:        { group: 'G5-情感陪伴',  desc: '日记', accessor: 'Store.getDiaries()' },
        wbDreams99:     { group: 'G5-情感陪伴',  desc: '拾梦（梦境速记）', accessor: 'Store.load().wbDreams99' },
        wbSparks99:     { group: 'G5-情感陪伴',  desc: '灵光乍现', accessor: 'Store.load().wbSparks99' },
        medicalRecords: { group: 'G2-生活基础',  desc: '就医数据/病历时间线', accessor: 'Store.load().medicalRecords' },
        snapshots:      { group: 'G4-数据洞察',  desc: '每周快照', accessor: 'Store.load().snapshots' },
      };
    },
    // 某域被哪些组消费（牵连排查：改这域之前先看这张表）
    links(domainKey) {
      const table = {
        habit99:  ['G4-数据洞察(报告/健康数据/洞察)', 'G5-情感陪伴(宠物宝石/管家评价)', '独行信条(RPG经验引擎)', 'G8-首页导航(今日习惯网格)'],
        records:  ['G8-首页导航(连续自律/本周平均)', 'G4-数据洞察(报告)'],
        sport99:  ['G3-学习成长(练习站读会话)', 'G4-数据洞察(运动数据)'],
        coins:    ['G4-数据洞察(金币流水)', 'G5-情感陪伴(宠物/小家消耗)'],
        study99:  ['G3-学习成长(学习数据)', 'G4-数据洞察(报告)'],
      };
      return table[domainKey] || ['（未登记消费方——新功能接入时请登记）'];
    },
    // 跨域当日快照：一次 load 聚合全部域的「今日」切片（消费方禁止自算同类口径）
    // 注意：hub 方法内 this = Store.hub，Store 方法一律显式 Store. 引用
    today(dk) {
      dk = dk || Store.today();
      const d = Store.load();
      const s = Store.habit99DailySummary(dk);
      const sp = Store._sport99Norm(d);
      const day = (d.habit99 && d.habit99.days || {})[dk] || {};
      const cards = (typeof CONFIG !== 'undefined' && CONFIG.habitCards) || [];
      const habitDone = cards.filter(c => {
        const v = day[c.id];
        if (!v) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object') return !!(v.ts || v.done || v.count > 0 || v.status || v.way || v.level || v.sleep || v.wake || v.start || v.clean !== undefined);
        return true;
      }).length;
      const studies = (sp.studies || []).filter(x => x.date === dk);
      const workouts = (sp.workouts || []).filter(x => x.date === dk);
      const coinLogs = (d.coinLogs || []).filter(x => x.date === dk);
      const ledgerRows = (d.ledger || []).filter(x => x.date === dk);
      return {
        date: dk,
        habit: { done: habitDone, total: cards.length, pct: cards.length ? Math.round(habitDone / cards.length * 100) : 0, summary: s },
        study:  { min: studies.reduce((a, x) => a + (+x.durMin || 0), 0), sessions: studies.length },
        workout: { min: workouts.reduce((a, x) => a + (+x.durMin || 0), 0), kcal: Math.round(workouts.reduce((a, x) => a + (+x.cal || 0), 0)), count: workouts.length },
        coins: { granted: coinLogs.filter(x => x.type === 'grant').reduce((a, x) => a + (+x.amount || 0), 0),
                 spent: coinLogs.filter(x => x.type !== 'grant').reduce((a, x) => a - (+x.amount || 0), 0) },
        ledger: { income: ledgerRows.filter(x => +x.amount > 0).reduce((a, x) => a + (+x.amount || 0), 0),
                  expense: ledgerRows.filter(x => +x.amount < 0).reduce((a, x) => a + (-x.amount || 0), 0) },
        diary: { count: (d.diaries || []).filter(x => x.date === dk).length },
        dream: { count: (d.wbDreams99 || []).filter(x => x.date === dk).length },
        spark: { count: (d.wbSparks99 || []).filter(x => x.date === dk).length },
      };
    },
    // 跨域区间聚合（周报/月报/趋势）：fromDk~toDk 闭区间；recordPct 复用 App.dayCompletionPct（单一事实源）
    range(fromDk, toDk) {
      toDk = toDk || Store.today();
      const d = Store.load();
      const sp = Store._sport99Norm(d);
      const days = [];
      const cur = new Date(fromDk + 'T00:00:00');
      const end = new Date(toDk + 'T00:00:00');
      for (; cur <= end && days.length < 400; cur.setDate(cur.getDate() + 1)) {
        days.push(Store.fmtDate(cur));
      }
      let habitPctSum = 0, recordPctSum = 0, waterSum = 0, nightHSum = 0, nH = 0;
      const dks = days;
      dks.forEach(dk => {
        const hday = ((d.habit99 && d.habit99.days) || {})[dk] || {};
        const keys = Object.keys(hday);
        if (keys.length) {
          nH++;
          const s = Store._habit99SummaryOf(d.habit99, dk);
          waterSum += s.waterMl || 0; nightHSum += s.nightH || 0;
        }
        const rec = (d.records || {})[dk];
        recordPctSum += (typeof App !== 'undefined' && App.dayCompletionPct) ? App.dayCompletionPct(rec) : 0;
        const cards = (typeof CONFIG !== 'undefined' && CONFIG.habitCards) || [];
        const done = cards.filter(c => {
          const v = hday[c.id];
          if (!v) return false;
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === 'object') return !!(v.ts || v.done || v.count > 0 || v.status || v.way || v.level || v.sleep || v.wake || v.start || v.clean !== undefined);
          return true;
        }).length;
        habitPctSum += cards.length ? Math.round(done / cards.length * 100) : 0;
      });
      const studies = (sp.studies || []).filter(x => x.date >= fromDk && x.date <= toDk);
      const workouts = (sp.workouts || []).filter(x => x.date >= fromDk && x.date <= toDk);
      const ledgerRows = (d.ledger || []).filter(x => x.date >= fromDk && x.date <= toDk);
      const coinLogs = (d.coinLogs || []).filter(x => x.date >= fromDk && x.date <= toDk);
      const n = dks.length || 1;
      return {
        from: fromDk, to: toDk, days: n,
        habitPct: Math.round(habitPctSum / n),
        recordPct: Math.round(recordPctSum / n),
        studyMin: studies.reduce((a, x) => a + (+x.durMin || 0), 0),
        workoutMin: workouts.reduce((a, x) => a + (+x.durMin || 0), 0),
        workoutKcal: Math.round(workouts.reduce((a, x) => a + (+x.cal || 0), 0)),
        waterAvgMl: nH ? Math.round(waterSum / nH) : 0,
        nightHAvg: nH ? +(nightHSum / nH).toFixed(1) : 0,
        ledgerNet: +(ledgerRows.reduce((a, x) => a + (+x.amount || 0), 0)).toFixed(2),
        coinsGranted: coinLogs.filter(x => x.type === 'grant').reduce((a, x) => a + (+x.amount || 0), 0),
        diaryCount: (d.diaries || []).filter(x => x.date >= fromDk && x.date <= toDk).length,
        dreamCount: (d.wbDreams99 || []).filter(x => x.date >= fromDk && x.date <= toDk).length,
        sparkCount: (d.wbSparks99 || []).filter(x => x.date >= fromDk && x.date <= toDk).length,
      };
    },
  },
};
