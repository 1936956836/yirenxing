// ============================================================================
// 116-lock99.js —— 【应用锁机】（v12.9.70 · 数据研究所第 11 库 Tab 增量）
// ============================================================================
// 增量边界（不改动原有业务）：
//   · 【应用数据】页新增 Tab：「使用时长」（原有 · 原样）｜「应用锁机」（本文件全部）
//   · iOS 设备直接隐藏整个【应用锁机】Tab（安卓原生 Service / 悬浮窗 / UsageEvents 均不可用）
//   · 权限复用独行空间权限中心（悬浮窗 / 使用情况访问 / 忽略电池优化），不新增权限页
//
// ── 锁机规则数据模型（TS 定义 · 前后端共用形状）──────────────────────────
//   interface Lock99Rules {
//     apps: string[];                 // 勾选上锁的目标 App 包名列表
//     minutes: number;                 // 上锁持续时长（1-480 分钟）
//     allowManualUnlock: boolean;      // 手动模式：锁机期间是否允许手动提前解锁
//     afuMode: boolean;                // 交给阿福管控（true=阿福自动管控 · 自控增强）
//     timeCond:  { on: boolean; time: string };          // 时间条件 HH:mm 到点自动锁
//     usageCond: { on: boolean; minutes: number };        // 当日累计使用达阈值自动锁
//     habitCond: { on: boolean; key: string; after: string }; // 指定习惯未打卡自动锁（检查时点）
//   }
//   interface Lock99Session {          // 锁机会话（原生持有 · 前端只读）
//     on: boolean; mode: 'manual'|'afu'; allowUnlock: boolean;
//     started: number; until: number; minutes: number;
//     reason: string; apps: string[]; unlockedBy?: 'manual'|'auto'|'force'; endT?: number;
//   }
//   interface Lock99HistoryItem {      // 上锁日志（最近 100 条）
//     t: number; mode: 'manual'|'afu'; reason: string; minutes: number;
//     unlockedBy: string; endT: number; apps: string[];
//   }
// ── 两种模式硬性区分（原生层兜底）────────────────────────────────────────
//   模式A 手动上锁：立即上锁按钮触发；allowManualUnlock 决定屏保是否出【立即解锁】
//   模式B 阿福自控：afuMode 开启后由条件自动触发；屏保无任何解锁按钮，只能等倒计时走完；
//                   就算退出一人行 / 划掉后台，计时在原生 Service 继续走；
//                   唯一逃生出口 = 独行空间权限中心关「悬浮窗权限」App内开关 → stopAll()
// ============================================================================
Object.assign(App, {

  _lock99Tab: 'usage',               // 应用数据页 Tab：'usage'（原有）｜'lock'（新增）
  _lock99Apps: null,                 // 本机 App 列表缓存 [{pkg,name}]
  _lock99Hist: null,                 // 上锁日志缓存
  _lock99St: null,                   // 原生 status 缓存 {locking,remainSec,running,beatGapMin,...}

  // iOS 检测：整个【应用锁机】Tab 只在安卓原生端渲染
  _lock99IsIOS() {
    try {
      const cap = this._nat99();
      return !!(cap && cap.getPlatform && cap.getPlatform() === 'ios');
    } catch (e) { return false; }
  },
  _lock99Plg() { return this._nat99Plg('Lock99'); },
  _lock99Native() { return !!this._lock99Plg() && !this._lock99IsIOS(); },

  // ==================== 规则存取（localStorage 单一来源 · 保存时同步原生）====================

  _lock99Rules() {
    try { return JSON.parse(localStorage.getItem('lock99_rules') || '') || null; } catch (e) { return null; }
  },
  _lock99RulesDef() {
    return {
      apps: [], minutes: 30, allowManualUnlock: true, afuMode: false,
      timeCond: { on: false, time: '23:00' },
      usageCond: { on: false, minutes: 120 },
      habitCond: { on: false, key: '', after: '21:00' },
    };
  },
  _lock99RulesMerged() {
    const d = this._lock99RulesDef();
    const s = this._lock99Rules() || {};
    return Object.assign(d, s, {
      timeCond: Object.assign(d.timeCond, s.timeCond || {}),
      usageCond: Object.assign(d.usageCond, s.usageCond || {}),
      habitCond: Object.assign(d.habitCond, s.habitCond || {}),
    });
  },

  // Tab 切换（95-native99.js _wbApps99 头部调用）
  _lock99SetTab(t) {
    this._lock99Tab = t;
    this._sfx99('tap');
    const wb = this._wb && this._wb.apps99 ? 'apps99' : null;
    this.render();                                   // 走既有 whiteboard 重渲染
  },

  // ==================== 权限门禁（复用权限中心真值 · 不新增权限页）====================

  // 返回 {ok, overlaySys, usageSys, overlayApp, reason}
  //   overlaySys/usageSys：系统真值（权限中心 _perm99St / Lock99.status 双源）
  //   overlayApp：权限中心「悬浮窗权限」App内调度开关
  _lock99Gate() {
    const r = { ok: false, overlaySys: false, usageSys: false, overlayApp: false, reason: '' };
    if (!this._lock99Native()) { r.reason = 'web'; return r; }
    const appSw = this._perm99AppSw || this._perm99AppSwDef();
    try {
      const st = (this._perm99St || {});
      r.overlaySys = !!(this._lock99St && this._lock99St.overlayPerm) || !!st.overlay;
      r.usageSys = !!(this._lock99St && this._lock99St.usagePerm) || !!st.usage;
    } catch (e) {}
    r.overlayApp = !!appSw.overlay;
    if (!r.overlaySys) { r.reason = 'overlay-sys'; return r; }     // 悬浮窗系统未授予 → 整体置灰
    if (!r.usageSys) { r.reason = 'usage-sys'; return r; }         // 使用情况访问未授予 → 无法监听前台
    if (!r.overlayApp) { r.reason = 'overlay-app'; return r; }      // App内开关关闭 → 功能停用
    r.ok = true;
    return r;
  },

  // ==================== 页面渲染（【应用锁机】Tab 正文）====================

  _lock99PageHtml() {
    if (!this._lock99Native()) {
      return `<div class="card"><div style="font-size:12.5px;color:#475569;line-height:2;padding:6px 0">
        🌐 当前为网页版${this._lock99IsIOS() ? ' / iOS 设备' : ''}——【应用锁机】仅安卓手机客户端可用（悬浮屏保 + 前台监听为安卓原生能力）。
      </div></div>`;
    }
    const R = this._lock99RulesMerged();
    const gate = this._lock99Gate();
    const L = (this._lock99St && this._lock99St.locking) || {};
    const afuRunning = !!(L.on && L.mode === 'afu');
    const manualRunning = !!(L.on && L.mode === 'manual');

    // —— 置灰门禁卡（悬浮窗/使用情况访问未授予 · 或 App内开关关闭）——
    if (!gate.ok) {
      const map = {
        'overlay-sys': { ico: '🪟', t: '需要「悬浮窗权限」', d: '锁机屏保要悬浮在其他 App 上才能盖住目标应用。点击下面按钮去系统设置开启后回来刷新。', k: 'overlay' },
        'usage-sys':   { ico: '📊', t: '需要「使用情况访问权限」', d: '锁机需要监听「哪个 App 在前台」才能在切入的一瞬间弹屏保。去系统设置开启后回来刷新。', k: 'usage' },
        'overlay-app': { ico: '🔒', t: '应用锁机已停用', d: '你在独行空间 · 权限中心关闭了「悬浮窗权限」的App内开关——整套锁机已停止。回到权限中心重新打开即可恢复。', k: null },
      };
      const m = map[gate.reason] || map['overlay-sys'];
      return `
        <div class="card" style="border:2px solid #fde68a;background:linear-gradient(180deg,#fff,#fffbeb);opacity:.95">
          <div class="card-title"><span class="ico">${m.ico}</span>${m.t}
            <span class="lk99-sys sys-chip" style="background:#fef3c7;color:#92400e;border-color:#fde68a">功能置灰</span>
          </div>
          <div style="font-size:12.5px;color:#475569;line-height:2;margin-top:4px">${m.d}</div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            ${m.k ? `<button class="btn btn-primary btn-sm" style="margin:0" onclick="App._perm99JumpSetting('${m.k}')">🚀 去系统设置开启</button>` : ''}
            <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App._lock99Fill(true)">🔄 授权后点我刷新</button>
          </div>
        </div>`;
    }

    // —— 进行中状态卡 ——
    let statusCard = '';
    if (afuRunning) {
      statusCard = `<div class="card" style="border:2px solid #fde68a;background:linear-gradient(180deg,#fffbeb,#fef3c7)">
        <div class="card-title"><span class="ico">🐕</span>阿福自控锁进行中
          <span class="perm99-tag" style="background:#fef3c7;color:#92400e;border-color:#fde68a">自控增强</span>
        </div>
        <div id="lock99-cd" style="font-size:34px;font-weight:800;color:#92400e;text-align:center;padding:8px 0">--:--</div>
        <div style="font-size:12.5px;color:#78350f;text-align:center">阿福自控模式，剩余 <b id="lock99-cd-min">--</b> 分钟 · 不可手动解除<br>
          <span style="font-size:11.5px;color:#a16207">只能等待时间结束自动解锁 · 逃生出口在独行空间权限中心（关闭悬浮窗App内开关）</span></div>
      </div>`;
    } else if (manualRunning) {
      statusCard = `<div class="card" style="border:2px solid #a7f3d0;background:linear-gradient(180deg,#f0fdf4,#d1fae5)">
        <div class="card-title"><span class="ico">🔒</span>手动锁机进行中</div>
        <div id="lock99-cd" style="font-size:34px;font-weight:800;color:#047857;text-align:center;padding:8px 0">--:--</div>
        <div style="font-size:12.5px;color:#065f46;text-align:center">剩余 <b id="lock99-cd-min">--</b> 分钟 · ${
          L.allowUnlock ? '屏保上可点【立即解锁】' : '本次锁机未开启手动解锁，需等待结束'
        }</div>
      </div>`;
    }

    const habitOpts = (CONFIG.habitCards || []).map(c =>
      `<option value="${c.id}" ${R.habitCond.key === c.id ? 'selected' : ''}>${c.ico} ${this.esc(c.name)}</option>`).join('');

    return `
      ${statusCard}
      <div id="lock99-svcdie" style="display:none" class="perm99-banner" >⚠️ 后台进程被系统终止，锁机暂时失效，请检查忽略电池优化权限（权限中心 → 忽略电池优化）</div>

      <div class="card">
        <div class="card-title"><span class="ico">🎯</span>上锁目标 App（${R.apps.length}）
          <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">勾选需要管控的 App</span>
        </div>
        <div id="lock99-applist" style="max-height:260px;overflow:auto;margin-top:6px">
          <div style="font-size:12px;color:#94a3b8;padding:8px 2px">⏳ 正在读取本机应用列表…</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ico">⚙️</span>全局配置</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
          <span style="font-size:12.5px;color:#475569">上锁持续时长</span>
          <input id="lock99-min" class="input" type="number" min="1" max="480" value="${R.minutes}" style="width:76px"
                 onchange="App._lock99SetCfg('minutes', Math.min(480, Math.max(1, +this.value||30)))">
          <span style="font-size:12px;color:#94a3b8">分钟（1-480）</span>
        </div>
        <div class="lock99-row" style="margin-top:10px">
          <div class="lock99-mid">
            <div style="font-weight:700;font-size:13px">锁机期间允许手动提前解锁</div>
            <div style="font-size:11.5px;color:#94a3b8;line-height:1.7">开启：屏保上有【立即解锁】按钮 · 关闭：只能等计时结束（阿福模式下本项被强制忽略）</div>
          </div>
          <button type="button" class="perm99-sw${R.allowManualUnlock ? ' on' : ''}" onclick="App._lock99SetCfg('allowManualUnlock', !App._lock99RulesMerged().allowManualUnlock)"></button>
        </div>
        <div class="lock99-row" style="margin-top:10px;border:1px solid #fde68a;border-radius:12px;padding:10px;background:linear-gradient(180deg,#fffbeb,#fff)">
          <div class="lock99-mid">
            <div style="font-weight:700;font-size:13px">交给阿福（智慧管家）管控
              <span class="perm99-tag" style="background:#fef3c7;color:#92400e;border-color:#fde68a">自控增强</span>
            </div>
            <div style="font-size:11.5px;color:#a16207;line-height:1.7">开启后由阿福按下方触发条件自动上锁——<b>一旦触发，强制屏蔽手动解锁，只能等时间走完</b>。关闭 = 手动模式（自己点【立即上锁】）。</div>
          </div>
          <button type="button" class="perm99-sw${R.afuMode ? ' on' : ''}" onclick="App._lock99SetCfg('afuMode', !App._lock99RulesMerged().afuMode)"></button>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ico">⚡</span>上锁触发条件
          <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">可多选组合（手动/阿福模式共用）</span>
        </div>
        <div class="lock99-row" style="margin-top:8px">
          <div class="lock99-mid">
            <div style="font-weight:700;font-size:13px">🕐 时间条件</div>
            <div style="font-size:11.5px;color:#94a3b8">到达指定时间自动上锁（原生后台判定，App 关着也触发）</div>
          </div>
          <input type="time" value="${R.timeCond.time}" style="border:1px solid #e2e8f0;border-radius:8px;padding:4px 6px;background:#fff"
                 onchange="App._lock99SetCfg('timeCond.time', this.value)">
          <button type="button" class="perm99-sw${R.timeCond.on ? ' on' : ''}" onclick="App._lock99SetCfg('timeCond.on', !App._lock99RulesMerged().timeCond.on)"></button>
        </div>
        <div class="lock99-row" style="margin-top:8px">
          <div class="lock99-mid">
            <div style="font-weight:700;font-size:13px">⏳ 使用时长阈值</div>
            <div style="font-size:11.5px;color:#94a3b8">勾选 App 当日累计前台使用达到阈值 → 自动上锁</div>
          </div>
          <input type="number" min="1" max="720" value="${R.usageCond.minutes}" style="width:64px;border:1px solid #e2e8f0;border-radius:8px;padding:4px 6px;background:#fff"
                 onchange="App._lock99SetCfg('usageCond.minutes', Math.max(1, +this.value||120))">
          <span style="font-size:11px;color:#94a3b8">分钟</span>
          <button type="button" class="perm99-sw${R.usageCond.on ? ' on' : ''}" onclick="App._lock99SetCfg('usageCond.on', !App._lock99RulesMerged().usageCond.on)"></button>
        </div>
        <div class="lock99-row" style="margin-top:8px">
          <div class="lock99-mid">
            <div style="font-weight:700;font-size:13px">✅ 习惯打卡条件</div>
            <div style="font-size:11.5px;color:#94a3b8">到检查时点，指定习惯今日未打卡 → 阿福自动上锁（App 开着时判定）</div>
          </div>
          <select style="border:1px solid #e2e8f0;border-radius:8px;padding:4px 6px;background:#fff;max-width:120px"
                  onchange="App._lock99SetCfg('habitCond.key', this.value)">
            <option value="">选择习惯</option>${habitOpts}
          </select>
          <input type="time" value="${R.habitCond.after}" style="border:1px solid #e2e8f0;border-radius:8px;padding:4px 6px;background:#fff"
                 onchange="App._lock99SetCfg('habitCond.after', this.value)">
          <button type="button" class="perm99-sw${R.habitCond.on ? ' on' : ''}" onclick="App._lock99SetCfg('habitCond.on', !App._lock99RulesMerged().habitCond.on)"></button>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">
          <button class="btn btn-primary btn-sm" style="margin:0;background:linear-gradient(90deg,#34d399,#059669)" ${R.afuMode ? 'disabled style="margin:0;opacity:.5"' : ''}
                  onclick="App._lock99LockNow()">🔒 立即上锁（手动）</button>
          <button class="btn btn-primary btn-sm" style="margin:0;background:linear-gradient(90deg,#f59e0b,#d97706)" ${R.afuMode ? '' : 'disabled style="margin:0;opacity:.5"'}
                  onclick="App._lock99SaveAfuRules()">🐕 保存阿福自动规则</button>
          <span style="font-size:11.5px;color:#94a3b8;align-self:center">${
            R.afuMode ? '阿福管控已开启——立即上锁按钮停用，由条件自动触发' : '手动模式——需要自己点【立即上锁】'
          }</span>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-top:8px;line-height:1.8">
          立即上锁仅手动模式可用；阿福规则保存后由原生后台持续判定（时间/使用时长）+ 阿福 App 内判定（习惯打卡）。
          计时走原生 Service——退出一人行、划掉后台都不中断。
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span class="ico">📜</span>上锁历史日志
          <button class="btn btn-sm btn-ghost" style="float:right;margin:0" onclick="App._lock99Fill(true)">🔄 刷新</button>
        </div>
        <div id="lock99-hist" style="margin-top:6px"><div style="font-size:12px;color:#94a3b8;padding:6px 2px">⏳ 读取中…</div></div>
      </div>`;
  },

  // ==================== 交互：配置修改 / 应用勾选 / 操作 ====================

  _lock99SetCfg(path, val) {
    const R = this._lock99RulesMerged();
    const seg = path.split('.');
    let o = R;
    for (let i = 0; i < seg.length - 1; i++) o = o[seg[i]];
    o[seg[seg.length - 1]] = val;
    localStorage.setItem('lock99_rules', JSON.stringify(R));
    this._sfx99(val ? 'on' : 'off');
    this._lock99PushRules(R, false);      // 轻推原生（不弹提示，页面局部刷新）
    this.render();
  },

  _lock99ToggleApp(pkg) {
    const R = this._lock99RulesMerged();
    const i = R.apps.indexOf(pkg);
    if (i >= 0) R.apps.splice(i, 1); else R.apps.push(pkg);
    localStorage.setItem('lock99_rules', JSON.stringify(R));
    this._sfx99(i >= 0 ? 'off' : 'on');
    this._lock99PushRules(R, false);
    // 局部刷新（避免列表滚动位置丢失）
    const el = document.getElementById('lock99-applist');
    if (el && this._lock99Apps) {
      const R2 = this._lock99RulesMerged();
      el.innerHTML = this._lock99AppRowsHtml(this._lock99Apps, R2);
      const t = document.querySelector('.card-title .sub');
      if (t) t.textContent = `勾选需要管控的 App`;
    }
    const n = document.getElementById('lock99-appcount');
    if (n) n.textContent = R.apps.length;
  },

  _lock99AppRowsHtml(apps, R) {
    if (!apps || !apps.length) {
      return `<div style="font-size:12px;color:#94a3b8;padding:8px 2px">📭 没读到可上锁的用户 App（需要「读取应用列表」相关权限或本机无第三方 App）</div>`;
    }
    return apps.map(a => {
      const on = R.apps.indexOf(a.pkg) >= 0;
      return `<div class="lock99-row" style="cursor:pointer" onclick="App._lock99ToggleApp('${a.pkg}')">
        <label style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer">
          <input type="checkbox" ${on ? 'checked' : ''} onclick="event.stopPropagation();App._lock99ToggleApp('${a.pkg}')">
          <span style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(a.name || a.pkg)}</span>
        </label>
        <span style="font-size:10px;color:#cbd5e1;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(a.pkg)}</span>
      </div>`;
    }).join('');
  },

  // 立即上锁（手动模式 · 按钮仅在 afuMode 关闭时可用）
  async _lock99LockNow() {
    const P = this._lock99Plg();
    if (!P) return;
    const R = this._lock99RulesMerged();
    if (!R.apps.length) { this._flash('❌ 先勾选要上锁的 App'); return; }
    if (!this._lock99Gate().ok) { this._flash('❌ 权限未就绪——先开启悬浮窗/使用情况访问'); return; }
    try {
      await P.lockNow({ minutes: R.minutes });
      this._sfx99('ok');
      this._flash('🔒 已上锁 ' + R.minutes + ' 分钟——切到被锁 App 即刻弹屏保');
      this._lock99Fill(true);
    } catch (e) { this._flash('❌ 上锁没有成功——稍后再试'); }
  },

  // 保存阿福自动规则（开启交给阿福管控后整套下发）
  async _lock99SaveAfuRules() {
    const R = this._lock99RulesMerged();
    if (!R.afuMode) { this._flash('❗ 先打开「交给阿福管控」开关'); return; }
    if (!R.apps.length) { this._flash('❌ 先勾选要上锁的 App'); return; }
    const ok = await this._lock99PushRules(R, true);
    if (ok) this._flash('🐕 阿福已接管——时间/使用时长条件由原生后台判定，习惯打卡条件 App 内判定');
  },

  // 规则下发原生（保存到 sp + Service 在跑则重载 + 有 App 则确保守护已启动）
  async _lock99PushRules(R, loud) {
    const P = this._lock99Plg();
    if (!P) return false;
    try {
      await P.saveRules({ rules: R });
      if (loud) this._sfx99('ok');
      return true;
    } catch (e) {
      if (loud) this._flash('❌ 保存没有成功——稍后再试');
      return false;
    }
  },

  // ==================== 页面数据填充（应用列表 / 状态 / 日志）====================

  async _lock99Fill(force) {
    if (!this._lock99Native()) return;
    const P = this._lock99Plg();
    if (!P) return;
    // 状态（含权限真值 · 心跳）
    try {
      const st = await P.status();
      this._lock99St = st || null;
      const beatGap = st && st.beatGapMin;
      const die = document.getElementById('lock99-svcdie');
      if (die) die.style.display = (beatGap != null && beatGap > 5) ? 'block' : 'none';
    } catch (e) {}
    // 应用列表
    const listEl = document.getElementById('lock99-applist');
    if ((force || !this._lock99Apps) && listEl) {
      try {
        const r = await P.listApps();
        this._lock99Apps = (r && r.apps) || [];
      } catch (e) { this._lock99Apps = []; }
      listEl.innerHTML = this._lock99AppRowsHtml(this._lock99Apps, this._lock99RulesMerged());
    }
    // 日志
    const histEl = document.getElementById('lock99-hist');
    if (histEl) {
      try {
        const r = await P.history();
        this._lock99Hist = (r && r.list) || [];
      } catch (e) { this._lock99Hist = []; }
      histEl.innerHTML = this._lock99HistHtml(this._lock99Hist);
    }
    this._lock99CdTick();
  },

  _lock99HistHtml(list) {
    if (!list || !list.length) return `<div class="empty" style="font-size:12px;color:#94a3b8;padding:8px 2px">还没有上锁记录——阿福和你的第一次自律封锁会记在这里</div>`;
    return list.slice(0, 30).map(h => {
      const t = new Date(h.t);
      const hh = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      const d = (t.getMonth() + 1) + '/' + t.getDate();
      const reasonMap = { manual: '手动上锁', time: '时间条件', usage: '使用时长超限', habit: '习惯未打卡' };
      const endMap = { manual: '手动解锁', auto: '倒计时结束', force: '权限中心终止', '': '进行中' };
      return `<div class="lock99-row" style="margin-top:6px;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <b style="font-size:12.5px">${d} ${hh}</b>
          <span style="display:flex;gap:6px;align-items:center">
            <span class="perm99-tag" style="${h.mode === 'afu' ? 'background:#fef3c7;color:#92400e;border-color:#fde68a' : 'background:#d1fae5;color:#047857;border-color:#a7f3d0'}">${h.mode === 'afu' ? '阿福自控' : '手动'}</span>
            <span style="font-size:11px;color:#94a3b8">${reasonMap[h.reason] || h.reason} · ${h.minutes || 0}分钟 · ${endMap[h.unlockedBy] != null ? endMap[h.unlockedBy] : ''}</span>
          </span>
        </div>
        <div style="font-size:11.5px;color:#475569;margin-top:3px">${(h.apps || []).map(n => this.esc(String(n))).join('、') || '—'}</div>
      </div>`;
    }).join('');
  },

  // 进行中倒计时（页面开着时每秒走字 · 真值来自原生 status）
  _lock99CdTick() {
    const cd = document.getElementById('lock99-cd');
    const mn = document.getElementById('lock99-cd-min');
    if (!cd) return;
    const st = this._lock99St;
    const L = st && st.locking;
    if (!st || !L || !L.on) { if (mn) mn.textContent = '--'; return; }
    let remain = Math.max(0, st.remainSec || 0);
    const paint = () => {
      const el = document.getElementById('lock99-cd');
      if (!el) { clearInterval(iv); return; }
      const s = remain;
      const txt = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      el.textContent = txt;
      const m = document.getElementById('lock99-cd-min');
      if (m) m.textContent = Math.ceil(s / 60);
      if (s <= 0) {
        clearInterval(iv);
        this._flash('✅ 锁机时间到——已自动解锁');
        setTimeout(() => { this._lock99Fill(true); this.render(); }, 1200);
      }
      remain = Math.max(0, remain - 1);
    };
    paint();
    const iv = setInterval(paint, 1000);
  },

  // ==================== 阿福（智慧管家）对接：习惯打卡条件调度 ====================
  // 时间条件 / 使用时长阈值：原生 Lock99Service 后台判定（App 关着也触发）
  // 习惯打卡条件：习惯库数据在前端 Store（本机 JS）——App 活着时由本 tick 判定后
  //   经插件 afuLock() 下发（原生强制 mode=afu：无解锁按钮 · 只能等倒计时走完）
  _afu99LockTick() {
    if (this.__afu99LockT) return;
    this.__afu99LockT = setInterval(async () => {
      try {
        const P = this._lock99Plg();
        if (!P) return;
        const R = this._lock99RulesMerged();
        if (!R.afuMode || !R.habitCond.on || !R.habitCond.key || !R.apps.length) return;
        if (!this._lock99Gate().ok) return;                 // 权限不齐：阿福不触发
        const st = await P.status();
        if (st && st.locking && st.locking.on) return;      // 已在锁机中：不叠加
        // 检查时点（到点才评估 · 默认 21:00）
        const now = new Date();
        const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        if (hm < (R.habitCond.after || '21:00')) return;
        // 当日只触发一次
        const today = Store.beijingDate();
        const dayKey = today.toISOString ? today.toISOString().slice(0, 10) : String(today);
        if (localStorage.getItem('lock99_habit_fired') === dayKey) return;
        // 指定习惯今日未打卡（宽口径：该卡当日无记录）
        const day = ((Store.getHabit99().days || {})[Store.today()]) || {};
        const rec = day[R.habitCond.key];
        const done = rec != null && (Array.isArray(rec) ? rec.length > 0 : true);
        if (done) return;
        localStorage.setItem('lock99_habit_fired', dayKey);
        await P.afuLock({ minutes: R.minutes, reason: 'habit' });
        this._flash('🐕 阿福自控锁已触发：指定习惯今日未打卡');
      } catch (e) {}
    }, 60_000);
  },

  // ==================== 权限中心联动入口（96-perm99.js 调用）====================

  // 权限中心关「悬浮窗」App内开关 → 停止锁机 Service + 销毁屏保（唯一逃生出口）
  async _lock99PermStopAll() {
    const P = this._lock99Plg();
    if (!P) return;
    try {
      await P.stopAll();
      this._flash('🛑 应用锁机已全量停止（权限中心悬浮窗开关已关闭）');
    } catch (e) {}
  },

  // 权限中心重开「悬浮窗」App内开关 → 若有已保存规则，恢复守护
  async _lock99PermResume() {
    const P = this._lock99Plg();
    if (!P) return;
    const R = this._lock99RulesMerged();
    if (!R.apps.length) return;
    try { await P.saveRules({ rules: R }); } catch (e) {}
  },
});
