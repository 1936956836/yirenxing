// 115-lookus99.js —— v12.9.68 【ta的近况 · 此时此刻】情侣空间设备状态同步（Lookus 同款）
// [功能组] G5-情感陪伴（情侣空间 moments 子页）+ G1-系统内核（权限中心 lookus 开关 · 真停采桥接）
//
// 三层架构（用户指令）：
//   ① 安卓原生逻辑：Lookus99Service（前台采集 Service：充电/电量/亮熄屏/通话广播 + 后台定位 +
//      UsageStats 轮询 + 夜间 23:00-06:00 亮屏统计）+ Lookus99 插件（权限真值/跳设置/启停/query 桥接）。
//   ② 前端业务逻辑（本文件）：权限中心双状态开关（系统授予只读 + App内启停）→ 桥接真停采；
//      采集快照（按开关过滤）+ 运动/学习内部业务数据 → 并入 couples99.share_x.lookus 上传；
//      对方数据渲染（板块级置灰：对方未授权的板块不显示）。
//   ③ 后端接口字段：复用情侣空间既有 couples99.share_a/share_b（jsonb）+ RPC ta99_write(target,data)，
//      零改表结构——share_x.lookus = { ts, perms, now, timeline, night, sport, study }。
//
// 平台边界：仅安卓原生客户端可用（iOS 不开放系统 API → 【此时此刻】tab 直接隐藏，情侣空间其余
//   互通数据不受影响）；网页版同样隐藏该 tab（浏览器测试可 localStorage['lk99_force']='1' 强制显示）。
// 合规红线：双方设备持有人完全知情、主动手动授予全部系统权限；权限中心随时可关（真停采，非仅隐藏）。
Object.assign(App, {

  // ==================== 平台与开关 ====================

  // 仅安卓原生可用（iOS 隐藏【此时此刻】；网页版默认隐藏——测试钩子可强制显示）
  _lk99On() {
    try {
      if (localStorage.getItem('lk99_force') === '1') return true;   // 浏览器实测专用
      const cap = this._nat99();
      if (!cap) return false;
      const plat = cap.getPlatform ? cap.getPlatform() : 'android';
      return plat === 'android';
    } catch (e) { return false; }
  },
  _lk99Plg() { return this._nat99Plg('Lookus99'); },

  // App 内「功能启用/停用」开关（独立于系统权限 · localStorage 持久化 · 权限中心可随时切换）
  _lk99Sw() {
    const def = { usage: false, notifs: false, battery: false, location: false };
    try { return Object.assign(def, JSON.parse(localStorage.getItem('lk99_sw_v1') || '{}')); } catch (e) { return def; }
  },
  _lk99SwSave(sw) { try { localStorage.setItem('lk99_sw_v1', JSON.stringify(sw)); } catch (e) {} },
  // 任一开关开启（= 有采集需求）
  _lk99AnyOn() { const s = this._lk99Sw(); return !!(s.usage || s.notifs || s.battery || s.location); },

  // ==================== 权限（检测 + 跳系统设置引导）====================

  // 四项特殊权限真值（原生只读检测；无插件环境全 false）
  async _lk99Perms() {
    const zero = { usage: false, notifs: false, battery: false, location: false, running: false };
    const P = this._lk99Plg();
    if (!P) return zero;
    try { return Object.assign(zero, await P.checkPerms()); } catch (e) { return zero; }
  },
  // 跳对应系统设置页（特殊权限唯一授予路径：不弹窗索取，只引导手动开启）
  async _lk99OpenSetting(k) {
    const P = this._lk99Plg();
    if (!P) { this._flash('📱 请在手机客户端上开启该权限'); return; }
    try {
      await P.openSetting({ k });
      this._flash('已跳转系统设置——开启后返回 App 自动生效');
    } catch (e) { this._flash('⚠️ 该 ROM 没有对应设置页——参考权限中心的手动路径开启'); }
  },

  // ==================== 采集启停（桥接真停采）====================

  // 开关变化后同步原生 Service：任一开 → 按开关启动；全关 → 停止（采集真正停止，非仅前端隐藏）
  async _lk99SyncService(silent) {
    if (!this._lk99On()) return;
    const P = this._lk99Plg();
    if (!P) return;
    const sw = this._lk99Sw();
    if (!this._lk99AnyOn()) {
      try { await P.stop(); if (!silent) this._flash('已停止设备状态采集'); } catch (e) {}
      return;
    }
    try {
      await P.start(sw);   // 原生层先申请运行时权限（定位/读手机状态），再按开关项注册监听
      if (!silent) this._flash('📡 设备状态采集中（权限中心可随时关闭）');
    } catch (e) {
      const m = String((e && e.message) || e);
      if (/perm/i.test(m)) this._flash('⚠️ 定位/手机状态运行时权限未授予——请允许后再开启');
      else this._flash('⚠️ 采集服务启动失败（控制台有详细报错）');
    }
  },

  // 读取本机采集数据（原生 SharedPreferences → 桥接）
  async _lk99Query() {
    const P = this._lk99Plg();
    if (!P) return null;
    try { return await P.query(); } catch (e) { return null; }
  },

  // ==================== 快照（系统采集 + 运动/学习内部业务 · 按开关过滤）====================
  // share_x.lookus 结构（后端接口字段定义 · 存 couples99.share_a/share_b jsonb）：
  //   { ts, perms:{usage,notifs,battery,location},      ← 对方板块置灰判定依据
  //     now:{ bat:{pct,charging}, fg:{app,sinceMin}, pos:{name,lat,lng,ts}, call:{state,sinceMin} },
  //     timeline:[{t,type:'app|loc|call|charge',app,min,name,dir,lat,lng,on,pct}],   ← 近24h 倒序 ≤120
  //     night:{ d, ons, apps:[..] },                    ← 昨夜 23:00-06:00 亮屏统计
  //     sport:{ parts, min, recs }, study:{ min, subjects, notes } }                 ← App 内部业务数据
  async _lk99Snapshot() {
    if (!this._lk99On()) return null;
    const sw = this._lk99Sw();
    const out = { ts: new Date().toISOString(), perms: { usage: false, notifs: false, battery: false, location: false } };
    let any = false;
    // —— 系统采集（开关开的项才写入快照：关闭的项不采集、不上传、不展示）——
    if (this._lk99AnyOn()) {
      try {
        const [q, perms] = await Promise.all([this._lk99Query(), this._lk99Perms()]);
        if (q) {
          out.perms = {
            usage: sw.usage && !!perms.usage,
            notifs: sw.notifs && !!perms.notifs,
            battery: sw.battery && !!perms.battery,
            location: sw.location && !!perms.location,
          };
          const now = q.now || {};
          out.now = {
            bat: out.perms.battery ? (now.bat || null) : null,
            fg: out.perms.usage ? (now.fg || null) : null,
            pos: out.perms.location ? (now.pos || null) : null,
            call: out.perms.notifs ? (now.call || null) : null,
          };
          const keep = { app: out.perms.usage, loc: out.perms.location, call: out.perms.notifs, charge: out.perms.battery };
          out.timeline = (Array.isArray(q.timeline) ? q.timeline : []).filter(e => keep[e && e.type]);
          out.night = out.perms.usage ? (q.night || null) : null;
          out.gapMin = q.beatGapMin != null ? q.beatGapMin : -1;   // 心跳断档（ROM 杀后台检测）
          any = out.perms.usage || out.perms.notifs || out.perms.battery || out.perms.location;
        }
      } catch (e) {}
    }
    if (!any) out.now = out.now || null;
    // —— 运动 / 学习（App 内部业务数据 · 不依赖系统权限 · 双方直接同步）——
    const ss = this._lk99SportStudy();
    out.sport = ss.sport;
    out.study = ss.study;
    return out;
  },

  // 运动/学习今日摘要（本地业务库：习惯卡 fitness 部位/分钟 + 聚神会话 + 学习卡）
  _lk99SportStudy() {
    const today = Store.today();
    let sport = { parts: '', min: 0, recs: '' };
    let study = { min: 0, subjects: '', notes: '' };
    try {
      const fit = Store.habit99Get(today, 'fitness');
      if (fit && Array.isArray(fit.parts) && fit.parts.length) {
        sport.parts = fit.parts.join('/');
        sport.min = +fit.minutes || 0;
      }
      const sp = Store.getSport99 ? Store.getSport99() : null;
      if (sp) {
        const ws = (sp.workouts || []).filter(w => (w.date || '') === today);
        if (ws.length) {
          sport.min += ws.reduce((s, w) => s + (+w.durMin || 0), 0);
          sport.recs = ws.slice(0, 3).map(w => (w.mode === 'strength' ? '力量' : '有氧') + (w.cal ? '·' + w.cal + 'kcal' : '')).join('，');
        }
      }
    } catch (e) {}
    try {
      const hub = Store.hub && Store.hub.today ? Store.hub.today(today) : null;
      if (hub) study.min = +(hub.study && hub.study.min) || 0;
      const sp = Store.getSport99 ? Store.getSport99() : null;
      const sts = (sp && sp.studies || []).filter(s => (s.date || '') === today);
      if (sts.length) {
        const subs = [];
        sts.forEach(s => { if (s.subject && subs.indexOf(s.subject) < 0) subs.push(s.subject); });
        study.subjects = subs.join('、');
        study.notes = (sts[sts.length - 1].note || '').slice(0, 60);
      }
    } catch (e) {}
    return { sport, study };
  },

  // ==================== 【此时此刻】板块视图（挂情侣空间 moments 子页）====================

  _lk99View(row, myPos) {
    const which = this._ta99.moments === 'me' ? 'me' : 'ta';
    const myShare = myPos === 'a' ? row.share_a : row.share_b;
    const taShare = myPos === 'a' ? row.share_b : row.share_a;
    const share = which === 'me' ? myShare : taShare;
    const lk = share && share.lookus;
    const isTa = which === 'ta';
    let html = `
    <div class="lk99-law">⚠️ 本功能需要双方设备持有人完全知情、主动手动授予全部系统权限；禁止在对方不知情的情况下采集、查看他人设备信息，违规使用将承担法律责任</div>`;
    // —— 我的权限 / 采集控制（两态卡：仅本人视角显示）——
    if (which === 'me') html += this._lk99MineHtml();
    // —— 对方数据（板块级置灰：对方未授权的板块不渲染内容）——
    html += this._lk99TaHtml(lk, isTa);
    html += `<div class="lk99-upd">${isTa ? 'Ta' : '我'}的设备状态更新于 ${lk && lk.ts ? new Date(lk.ts).toLocaleString('zh-CN') : '—'} · 手动刷新按钮在【Ta】主页 ↻</div>`;
    return html;
  },

  // 我的采集控制卡（权限引导 + 开关状态 + 开启按钮）
  _lk99MineHtml() {
    const sw = this._lk99Sw();
    const running = this._lk99Running();
    const any = this._lk99AnyOn();
    return `<div class="card lk99-ctrl">
      <div class="card-title"><span class="ico">📡</span>我的采集${running ? ' · <span style="color:#059669">运行中</span>' : ''}</div>
      <div style="font-size:12px;color:var(--text-soft);line-height:1.8">
        ${any ? '已开启：' + this._lk99SwNames().join(' · ') + '——采集本机设备状态，与Ta互相可见（Ta同样开启后才可看到Ta的）。'
              : '未开启采集。开启前需在【独行空间 · 权限中心】授权对应系统权限并打开开关。'}
      </div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="App.navigate('perm99')">🛡️ 去权限中心开启</button>
        <button class="btn btn-ghost btn-sm" onclick="App._lk99Refresh()">🔄 刷新数据</button>
      </div>
    </div>`;
  },
  _lk99Running() {
    const st = this._lk99PermsSt;
    return !!(st && st.running && this._lk99AnyOn());
  },
  _lk99SwNames() {
    const sw = this._lk99Sw();
    const n = [];
    if (sw.usage) n.push('App 使用');
    if (sw.location) n.push('位置');
    if (sw.notifs) n.push('通话');
    if (sw.battery) n.push('充电');
    return n;
  },

  // 对方/我的数据渲染（real = share.lookus；isTa=对方视角）
  _lk99TaHtml(lk, isTa) {
    const who = isTa ? 'Ta' : '我';
    if (!lk || !lk.ts) {
      return `<div class="card lk99-grey"><div class="lk99-grey-t">📡 ${who}的设备状态还看不到</div>
        <div class="lk99-grey-d">${isTa ? 'Ta还没有开启【此时此刻】采集（安卓客户端 · 权限中心授权后开启）' : '你还没有开启采集——到权限中心打开开关'}</div></div>`;
    }
    const p = lk.perms || {};
    let s = '';
    // —— 实时卡片（四项 · 对应板块置灰）——
    s += `<div class="card">
      <div class="card-title"><span class="ico">🫧</span>${who}的此刻<span class="sub" style="font-size:11px;color:#94a3b8">实时状态</span></div>
      <div class="lk99-now">
        ${this._lk99NowCell(p.battery, '🔋', '电量', lk.now && lk.now.bat ? `${lk.now.bat.pct}%${lk.now.bat.charging ? ' · 充电中' : ''}` : null, '电量/充电状态（需对方开启充电同步）')}
        ${this._lk99NowCell(p.usage, '📱', '前台App', lk.now && lk.now.fg ? `${lk.now.fg.app} · 已用 ${lk.now.fg.sinceMin} 分钟` : null, '正在使用的App与持续时长（需对方开启使用同步）')}
        ${this._lk99NowCell(p.location, '📍', '位置', lk.now && lk.now.pos ? `${lk.now.pos.name}` : null, '此刻停留地点（需对方开启位置同步）')}
        ${this._lk99NowCell(p.notifs, '📞', '通话', lk.now && lk.now.call && lk.now.call.state !== 'idle' ? (lk.now.call.state === 'ringing' ? '正在响铃' : `通话中 · ${lk.now.call.sinceMin} 分钟`) : '空闲', '通话状态（需对方开启通话同步）')}
      </div>
    </div>`;
    // —— 时间轴（近24h 倒序）——
    const tl = Array.isArray(lk.timeline) ? lk.timeline : [];
    s += `<div class="card">
      <div class="card-title"><span class="ico">🧭</span>${who}的时间轴<span class="sub" style="font-size:11px;color:#94a3b8">近 24 小时 · 倒序</span></div>
      ${tl.length ? tl.slice(0, 60).map(e => this._lk99EvHtml(e)).join('') : '<div class="empty" style="padding:12px 0">暂无记录</div>'}
    </div>`;
    // —— 夜间睡眠检测统计（23:00-06:00 · 单独统计卡 · 时间轴底部）——
    const n = lk.night;
    if (p.usage) {
      const ons = n ? (+n.ons || 0) : 0;
      const apps = (n && Array.isArray(n.apps)) ? n.apps : [];
      const uniq = Array.from(new Set(apps));
      s += `<div class="card lk99-night">
        <div class="card-title"><span class="ico">🌙</span>夜间亮屏统计<span class="sub" style="font-size:11px;color:#94a3b8">${n && n.d ? n.d : '昨夜'} 23:00 - 06:00</span></div>
        ${ons === 0 ? '<div class="empty" style="padding:12px 0">昨夜没有点亮过手机——睡得很安稳 🎉</div>' : `
        <div class="lk99-night-n">夜间一共点亮手机 <b>${ons}</b> 次${uniq.length ? '，分别打开 <b>' + uniq.map(a => this.esc(String(a))).join('、') + '</b> 应用' : ''}</div>`}
      </div>`;
    } else {
      s += `<div class="card lk99-grey"><div class="lk99-grey-t">🌙 夜间统计不可见</div><div class="lk99-grey-d">对方未授予设备权限，无法查看该部分内容</div></div>`;
    }
    // —— 运动 / 学习（App 内部业务数据 · 不依赖系统权限）——
    const sp = lk.sport || { parts: '', min: 0, recs: '' };
    const st = lk.study || { min: 0, subjects: '', notes: '' };
    s += `<div class="card">
      <div class="card-title"><span class="ico">🏃</span>${who}的运动 · 今日</div>
      ${sp.min > 0 || sp.parts ? `<div class="lk99-kv"><span>部位：<b>${this.esc(sp.parts || '未记录')}</b></span><span>时长：<b>${sp.min} 分钟</b></span>${sp.recs ? `<span>${this.esc(sp.recs)}</span>` : ''}</div>` : '<div class="empty" style="padding:12px 0">今天还没有运动记录</div>'}
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">📚</span>${who}的学习 · 今日</div>
      ${st.min > 0 ? `<div class="lk99-kv"><span>时长：<b>${st.min} 分钟</b></span>${st.subjects ? `<span>科目：<b>${this.esc(st.subjects)}</b></span>` : ''}</div>${st.notes ? `<div class="lk99-note">📝 ${this.esc(st.notes)}</div>` : ''}` : '<div class="empty" style="padding:12px 0">今天还没有学习记录</div>'}
    </div>`;
    // —— 国产 ROM 后台被杀提示（心跳断档 > 15 分钟）——
    if (isTa && lk.gapMin != null && lk.gapMin > 15) {
      s += `<div class="lk99-gap">⚠️ ${who}的设备后台可能被系统终止，部分时段数据缺失——请${who}检查「忽略电池优化」权限（小米/vivo/oppo 易杀后台）</div>`;
    }
    return s;
  },
  // 实时状态格子（granted=false → 置灰提示；value=null → 未采集）
  _lk99NowCell(granted, ico, name, value, why, okForce) {
    const ok = granted || okForce;
    return `<div class="lk99-cell ${ok ? '' : 'off'}">
      <div class="lk99-cell-ico">${ico}</div>
      <div class="lk99-cell-b">
        <b>${name}</b>
        <span>${ok ? (value || '—') : (why || '对方未授予设备权限，无法查看该部分内容')}</span>
      </div>
    </div>`;
  },
  // 时间轴事件行（类型标签：位置｜App使用｜充电｜通话）
  _lk99EvHtml(e) {
    const t = new Date(+e.t || 0);
    const hm = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    const M = {
      app:   ['📱', 'App使用', `<b>${this.esc(String(e.app || ''))}</b> · 使用 ${e.min || 1} 分钟`],
      loc:   ['📍', '位置', `到达 <b>${this.esc(String(e.name || ''))}</b>`],
      call:  ['📞', '通话', `${e.dir === 'in' ? '呼入' : '呼出'} · 通话 ${e.min || 1} 分钟`],
      charge:['🔋', '充电', e.on ? `开始充电（电量 ${e.pct}%）` : `停止充电（电量 ${e.pct}%）`],
    };
    const m = M[e.type] || ['📌', '记录', ''];
    return `<div class="lk99-ev t-${e.type}">
      <span class="lk99-ev-ico">${m[0]}</span>
      <span class="lk99-ev-t">${hm}</span>
      <span class="lk99-ev-tx">${m[2]}</span>
      <span class="lk99-ev-tag">${m[1]}</span>
    </div>`;
  },

  // 页面刷新（重推快照 → 重渲染 moments）
  async _lk99Refresh() {
    this._flash('🔄 正在同步设备状态…');
    try {
      const row = this._ta99 && this._ta99.row;
      if (row && this._ta99PushShare) await this._ta99PushShare(row, true);
      await this.ta99Refresh(true);
    } catch (e) { this._ta99Rerender(); }
  },

  // ==================== 权限中心集成（v12.9.69 去重版）====================
  // usage / battery 已合并到权限中心顶部（PERM99 上半区），
  //   LOOKUS99_PERM 仅保留【此时此刻】独有的 2 项：通知使用权 + 后台位置
  //   （系统真值 / App内开关 / 跳转系统设置 三态交互逻辑由 96-perm99 的新架构统一处理）
  LOOKUS99_PERM: [
    { k: 'notifs',  ico: '🔔', n: '通知使用权',   d: '识别来电/通话状态与时长，用于【此时此刻】通话记录' },
    { k: 'location',ico: '📍', n: '后台位置权限', d: '生成位置轨迹时间轴，用于【此时此刻】位置同步' },
  ],
  _lk99PermsSt: null,   // 权限真值缓存（checkPerms / checkAllPerms 结果）

  // 权限中心：双状态开关行 HTML（系统权限只读点 + App内启停开关）
  _lk99PermRowsHtml(st) {
    const sw = this._lk99Sw();
    return this.LOOKUS99_PERM.map(p => {
      const sysOk = !!(st && st[p.k]);
      const on = !!sw[p.k];
      return `<div class="perm99-card lk99-row ${on && sysOk ? 'on' : ''}" id="lk99row-${p.k}">
        <div class="perm99-ico">${p.ico}</div>
        <div class="perm99-mid">
          <div class="perm99-name">${p.n}<span class="lk99-sys ${sysOk ? 'ok' : ''}">${sysOk ? '系统已授予' : '系统未授予'}</span></div>
          <div class="perm99-desc">${p.d}</div>
        </div>
        <button type="button" class="perm99-sw lk99-sw ${on ? 'on' : ''}" data-lk="${p.k}" aria-label="${p.n} 启停"></button>
      </div>`;
    }).join('');
  },
  // 权限中心开关切换（三态处理：开+未授予→跳设置；开+已授予→运行；关→真停采）
  async _lk99SwToggle(k) {
    const sw = this._lk99Sw();
    const now = !sw[k];
    sw[k] = now;
    this._lk99SwSave(sw);
    this._sfx99(now ? 'on' : 'off');
    if (!now) {
      // 关闭：该功能整体停用——不再采集/上传/展示，桥接真停采
      await this._lk99SyncService(true);
      this._flash('已停用「' + (this.LOOKUS99_PERM.find(p => p.k === k) || {}).n + '」采集——对应数据停止采集与同步');
      this._lk99RerenderPerm99();
      return;
    }
    // 开启：系统权限未授予 → 跳系统设置引导；已授予 → 直接生效
    const st = await this._lk99Perms();
    this._lk99PermsSt = st;
    if (!st[k]) {
      this._lk99RerenderPerm99();
      this._flash('开关已打开——去系统设置授予「' + (this.LOOKUS99_PERM.find(p => p.k === k) || {}).n + '」后返回');
      await this._lk99OpenSetting(k);
      return;
    }
    await this._lk99SyncService(true);
    this._lk99RerenderPerm99();
    this._flash('✅ 已开启并开始采集（数据仅双方可见，权限中心随时可关）');
  },
  // 权限中心局部重绘（开关状态 + 系统权限点）
  _lk99RerenderPerm99() {
    try {
      const sw = this._lk99Sw();
      const st = this._lk99PermsSt || {};
      this.LOOKUS99_PERM.forEach(p => {
        const rowEl = document.getElementById('lk99row-' + p.k);
        const swEl = document.querySelector('.lk99-sw[data-lk="' + p.k + '"]');
        if (swEl) swEl.classList.toggle('on', !!sw[p.k]);
        if (rowEl) rowEl.classList.toggle('on', !!(sw[p.k] && st[p.k]));
        const sys = rowEl && rowEl.querySelector('.lk99-sys');
        if (sys) { sys.classList.toggle('ok', !!st[p.k]); sys.textContent = st[p.k] ? '系统已授予' : '系统未授予'; }
      });
      // 与【此时此刻】页面实时同步：权限中心切换 → 情侣空间 moments 页立即重渲染（板块置灰即时生效）
      if (this.currentView === 'workbench' && this._wbView === 'ta99') this._ta99Rerender();
    } catch (e) {}
  },
});
