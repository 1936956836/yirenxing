// 08-afu-night.js —— 管家阿福·夜巡（v11.1）：00:00–05:00 使用监测 → 熬夜 / 通宵判定
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// 需求操作化口径（全部公开在 v11.1 更新公告里，判定透明可自查）：
//  · 监测窗口：北京时间 00:00–05:00（含 04:59:59）；只有真实交互（pointerdown/keydown/input）才计时，
//    挂机亮屏不算；1 秒内多次交互去重为 1 次（防同一次手势触发双事件灌水）。
//  · 「一次使用」：相邻交互间隔 ≤3 分钟并入同一次；单次时长 >2 分钟且交互 ≥3 次才算「有效使用」。
//  · 违规熬夜（判定当日该时段并未睡眠）：有效使用 >2 次（≥3 次），或当晚累计使用 >5 分钟。
//  · 通宵（严重损害健康的行为）：有效使用分布在 ≥3 个不同小时时段（00–01/01–02/02–03/03–04/04–05）
//    → 首页置顶严重批评卡（_afu99SevereCard，render_dashboard 第一张卡），自判定时刻起持续 24 小时，
//      期间不可关闭（惩罚性质）。
//  · 数据独立 localStorage key one-xing-afu-night-v1：{ days:{dk:{ev:[ts]}}, verdicts:{dk:{level,at,...}} }；
//    事件留 14 天 / 判定留 90 天 / 单日事件上限 600（防脚本灌水）；不影响业务存档，不参与云同步。
//  · 开发者沙箱（App._dev99）期间不记录，避免测试污染真实判定。
Object.assign(App, {
  _afu99Key: 'one-xing-afu-night-v1',
  _afu99Rules: {
    gapMs: 3 * 60 * 1000,       // 相邻交互 ≤3 分钟 → 同一次使用
    singleMs: 2 * 60 * 1000,    // 单次使用时长须 >2 分钟
    minEvents: 3,               // 单次使用内交互须 ≥3 次（多次交互）
    sessions: 3,                // 有效使用 >2 次（即 ≥3 次）→ 熬夜
    totalMs: 5 * 60 * 1000,     // 或累计使用 >5 分钟 → 熬夜
    segsAllNight: 3,            // 有效使用横跨 ≥3 个小时时段 → 通宵
    dedupeMs: 1000,             // 1 秒内交互去重
    evCap: 600,                 // 单日事件上限（防灌水）
    keepDays: 14,               // 事件保留天数
    keepVerdicts: 90,           // 判定保留天数
  },

  // ---------- 数据层 ----------
  _afu99Data() {
    if (this._afu99Store) return this._afu99Store;
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this._afu99Key) || 'null'); } catch (_) {}
    if (!d || typeof d !== 'object') d = {};
    if (!d.days || typeof d.days !== 'object') d.days = {};
    if (!d.verdicts || typeof d.verdicts !== 'object') d.verdicts = {};
    this._afu99Prune(d);
    return (this._afu99Store = d);
  },
  _afu99Prune(d) {
    try {
      const dk = Object.keys(d.days).sort();       // YYYY-MM-DD 字典序 = 时间序
      while (dk.length > this._afu99Rules.keepDays) delete d.days[dk.shift()];
      const vk = Object.keys(d.verdicts).sort();
      while (vk.length > this._afu99Rules.keepVerdicts) delete d.verdicts[vk.shift()];
    } catch (_) {}
  },
  _afu99Save() {
    try { localStorage.setItem(this._afu99Key, JSON.stringify(this._afu99Store || {})); } catch (_) {}
  },
  _afu99SaveSoon() {
    if (this._afu99SaveT) return;
    this._afu99SaveT = setTimeout(() => { this._afu99SaveT = null; this._afu99Save(); }, 2000);
  },

  // ---------- 启动监听（App.init 调用） ----------
  _afu99StartWatch() {
    if (this._afu99Watching) return;
    this._afu99Watching = true;
    const rec = () => { try { App._afu99Track(); } catch (_) {} };
    document.addEventListener('pointerdown', rec, { capture: true, passive: true });
    document.addEventListener('keydown', rec, true);
    document.addEventListener('input', rec, true);
    // 退到后台 / 关页时强制落盘（节流写可能丢最后 2 秒）
    const flush = () => {
      try {
        if (App._afu99SaveT) { clearTimeout(App._afu99SaveT); App._afu99SaveT = null; }
        App._afu99Save();
      } catch (_) {}
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  },

  // ---------- 记录一拍交互 ----------
  _afu99Track() {
    if (this._dev99) return;                        // 开发者沙箱：不记录
    const bjMs = Store.nowBeijing();
    const h = Store.beijingDate(bjMs).getHours();
    if (h >= 5) return;                             // 仅 00:00–04:59 记录
    const data = this._afu99Data();
    const dk = Store.todayBJ();
    const day = data.days[dk] || (data.days[dk] = { ev: [] });
    const evs = day.ev;
    if (evs.length >= this._afu99Rules.evCap) return;
    const last = evs.length ? evs[evs.length - 1] : 0;
    if (bjMs - last < this._afu99Rules.dedupeMs) return;   // 1 秒内交互去重
    evs.push(bjMs);
    const r = this._afu99Analyze(evs);
    const old = data.verdicts[dk];
    const oldLv = old ? (old.level || 0) : 0;
    if (r.level > oldLv) {
      // 判定升级（只升不降）：0→1 熬夜；0/1→2 通宵
      data.verdicts[dk] = {
        level: r.level, at: bjMs,
        sessions: r.qualified.length, totalMs: r.totalMs, events: evs.length,
        segs: r.segStats,
      };
      this._afu99Save();
      const mins = Math.max(1, Math.round(r.totalMs / 60000));
      if (r.level >= 2) {
        this._flash(`🚨 管家阿福：判定今夜「通宵」——${r.segStats.length} 个不同时段均有使用，严重损害健康！首页批评卡已置顶 24 小时`);
      } else {
        this._flash(`🌙 管家阿福：今日凌晨已记录 ${r.qualified.length} 次使用、累计约 ${mins} 分钟——判定该时段你并未入睡，违规熬夜！`);
      }
    } else {
      this._afu99SaveSoon();
    }
  },

  // ---------- 分析器（纯计算，_btest/afu-night-test.js 覆盖） ----------
  // 返回 { sessions:[{s,e,n}], qualified:[...], totalMs, segStats:[{h,ms,n}], level }
  _afu99Analyze(evs) {
    const R = this._afu99Rules;
    const sorted = (evs || []).slice().sort((a, b) => a - b);
    const sessions = [];
    let cur = null;
    for (const t of sorted) {
      if (cur && t - cur.e <= R.gapMs) { cur.e = t; cur.n++; }
      else { cur = { s: t, e: t, n: 1 }; sessions.push(cur); }
    }
    // 有效使用：单次 >2 分钟 且 交互 ≥3 次
    const qualified = sessions.filter(s => (s.e - s.s) > R.singleMs && s.n >= R.minEvents);
    // 累计使用：所有次使用时长之和（含未达标的小段——诚实计时）
    const totalMs = sessions.reduce((a, s) => a + (s.e - s.s), 0);
    // 小时时段分布（按有效使用的起始时刻归属）
    const segMap = {};
    qualified.forEach(s => {
      const hh = Store.beijingDate(s.s).getHours();
      const seg = segMap[hh] || (segMap[hh] = { h: hh, ms: 0, n: 0 });
      seg.ms += (s.e - s.s); seg.n += s.n;
    });
    const segStats = Object.keys(segMap).map(Number).sort((a, b) => a - b).map(h => segMap[h]);
    let level = 0;
    if (qualified.length >= R.sessions || totalMs > R.totalMs) level = 1;   // 违规熬夜
    if (segStats.length >= R.segsAllNight) level = 2;                      // 通宵
    return { sessions, qualified, totalMs, segStats, level };
  },

  // ---------- 展示：通宵严重批评卡（首页置顶，判定时刻起 24 小时） ----------
  _afu99SevereCard() {
    try {
      const data = this._afu99Data();
      const now = Store.nowBeijing();
      let hit = null;
      Object.keys(data.verdicts).forEach(dk => {
        const v = data.verdicts[dk];
        if (v && v.level === 2 && now < v.at + 86400000 && (!hit || v.at > hit.v.at)) hit = { dk, v };
      });
      if (!hit) return '';
      const v = hit.v;
      const segTxt = (v.segs || []).map(s =>
        `${String(s.h).padStart(2, '0')}–${String(s.h + 1).padStart(2, '0')} 时段 ${(s.ms / 60000).toFixed(1)} 分钟`).join(' · ');
      const end = Store.beijingDate(v.at + 86400000);
      const endStr = `${end.getMonth() + 1}月${end.getDate()}日 ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      return `
        <div class="card afu99-severe">
          <div class="afu99-severe-head">🚨 管家阿福 · 严重批评（置顶 24 小时）</div>
          <div class="afu99-severe-body">
            判定：${this.esc(hit.dk)} 凌晨 <b>通宵</b>。00:00–05:00 期间检测到你在 <b>${(v.segs || []).length} 个不同时段</b>持续使用 App${segTxt ? `（${this.esc(segTxt)}）` : ''}，有效使用 <b>${v.sessions || 0} 次</b>、累计 <b>${((v.totalMs || 0) / 60000).toFixed(1)} 分钟</b>——这不是晚睡，是整夜未眠，<b>严重损害健康的行为</b>。
          </div>
          <div class="afu99-severe-note">
            通宵会击穿免疫防线、内分泌与心血管系统，阿福已把这次记录在案。本批评将置顶至 <b>${this.esc(endStr)}</b>，期间不可关闭。今夜请务必 23:00 前入睡；睡不着也请放下手机闭眼养神——床是用来睡觉的，不是用来熬夜的。
          </div>
        </div>`;
    } catch (_) { return ''; }
  },

  // ---------- 展示：阿福首页卡·夜巡状态行 ----------
  _afu99NightLine() {
    try {
      const data = this._afu99Data();
      const dk = Store.todayBJ();
      const v = data.verdicts[dk];
      const h = Store.beijingDate(Store.nowBeijing()).getHours();
      if (v && v.level >= 2) return `<div class="afu99-line afu99-line-bad">🚨 今日凌晨判定「通宵」——严重批评已置顶首页 24 小时</div>`;
      if (v && v.level === 1) return `<div class="afu99-line afu99-line-warn">⛔ 今日凌晨熬夜违规：${v.sessions || 0} 次使用 · 累计 ${((v.totalMs || 0) / 60000).toFixed(1)} 分钟（判定 00:00–05:00 未入睡）</div>`;
      if (h < 5) {
        const evs = ((data.days[dk] || {}).ev) || [];
        return evs.length
          ? `<div class="afu99-line afu99-line-warn">🌙 夜巡监测中：已记录 ${evs.length} 次交互——凌晨使用会累计判定熬夜/通宵，请放下手机去睡觉</div>`
          : `<div class="afu99-line">🌙 夜巡监测中（00:00–05:00 使用 App 会被记录并判定）</div>`;
      }
      // 已过凌晨时段：有轻微使用但未达违规标准 → 透明反馈；完全无使用 → 静默（不打扰）
      const day = data.days[dk];
      if (day && (day.ev || []).length) {
        const r = this._afu99Analyze(day.ev);
        return `<div class="afu99-line afu99-line-ok">🌙 今日凌晨夜巡：有轻微使用（累计 ${(r.totalMs / 60000).toFixed(1)} 分钟），未达熬夜标准，继续保持</div>`;
      }
      return '';
    } catch (_) { return ''; }
  },
});
