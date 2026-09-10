// 78-cloud-auth.js —— v11.4 云账户：Supabase 邮箱注册/登录 + 存档云端多设备同步
// [功能组] G7-云同步账户（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// 架构：纯前端 + Supabase 免费版（Auth 邮箱密码 + Postgres jsonb 存档 + RLS 行级隔离）
//   · 每个账号一行存档（saves 表：user_id 主键 + data + updated_at），数据互不可见
//   · 存档复用 Store.exportAll()/importAll() 完整包（主存档 + 裸键 + checksum，换机零损失）
//   · 本地写盘钩子（Store.save → cloud99OnSave）节流 8s 自动上传，切后台/关页前 flush
//   · SDK 经 CDN 引入（index.html）；单文件离线打开时 window.supabase 不存在 → 云卡显示"需联网"
// v12.7c（用户指令 · 铁律）：官方 Supabase Project URL + anon key 已内置进 App——
//   用户打开同步页即是已连接状态，直接注册/登录自己的账号即可；此密钥对无论任何情况都不得删除。
// v12.9.20（用户指令 · 底线）：① 强制登录门禁——启动即校验，未登录全屏锁定不可用；
//   ② 单设备登录——sessions 表（user_id 主键 + session_id）登录即占领，45s 心跳 + 推送前校验，
//   新设备登录使旧设备锁屏下线（锁屏后停心跳/停上传/登出会话，杜绝双端并发写云端导致的数据冲突）。
Object.assign(App, {
  // ===== 云账户运行态 =====
  _c99: {
    client: null,   // supabase-js client
    user: null,     // { id, email } 登录态
    cfg: null,      // { url, key } 项目配置（localStorage 可覆盖；默认 = 内置官方项目）
    state: 'idle',  // idle | sdk-missing | offline | online
  },
  _c99Mode: 'login',            // 登录表单模式：login | signup
  _c99PushTimer: null,          // 自动上传节流器
  _c99CompareTip: '',           // 云端/本地对比提示条（html）
  _c99HbTimer: null,            // v12.9.20 单设备心跳定时器（45s）
  C99_CFG_KEY: 'one_xing_cloud99_cfg',    // 项目配置 {url,key}（自建项目可覆盖内置）
  C99_MTIME_KEY: 'one_xing_cloud99_mtime', // 本地存档最后修改毫秒（云对比用）
  C99_SID_KEY: 'one_xing_c99_sid',         // v12.9.20 本机会话 id（同一设备刷新不被自己踢）
  C99_HEARTBEAT_MS: 45000,      // v12.9.20 单设备心跳间隔
  C99_THROTTLE_MS: 8000,
  // ===== 内置项目（v12.9.18 按用户指令切换为用户自建 Supabase 项目）=====
  // 原官方项目（v12.7c 内置 · 备注保留可随时回切）：url https://ggctxxoxfhrxshtsxpih.supabase.co / key sb_publishable_xVlD2yC7Y59g1YKaGj1AFQ_ha4DOP_7
  C99_BAKED: {
    url: 'https://wuphicbubtimvmhqbhzw.supabase.co',
    key: 'sb_publishable_fi5xVrOb7SuxQcU3XesUjA_hQXrUIMd',
  },

  // Supabase 建表 SQL（用户复制到 Supabase SQL Editor 一次执行）
  // v12.9.20：新增 sessions 表——单设备登录（同一账号同一时间仅一台设备在线）
  C99_SQL: [
    '-- 一人行 · 账号云同步建表（在 Supabase 的 SQL Editor 里整段粘贴执行一次）',
    'create table if not exists public.saves (',
    '  user_id uuid primary key references auth.users on delete cascade,',
    '  data jsonb not null,',
    '  updated_at timestamptz not null default now(),',
    '  size integer,',
    '  device text',
    ');',
    'alter table public.saves enable row level security;',
    'drop policy if exists "own_row_r" on public.saves;',
    'create policy "own_row_r" on public.saves',
    '  for all to authenticated',
    '  using (auth.uid() = user_id)',
    '  with check (auth.uid() = user_id);',
    '',
    '-- v12.9.20 单设备登录：每账号一行当前在线会话（登录占领 / 心跳校验 / 新设备踢旧设备）',
    'create table if not exists public.sessions (',
    '  user_id uuid primary key references auth.users on delete cascade,',
    '  session_id text not null,',
    '  device text,',
    '  updated_at timestamptz not null default now()',
    ');',
    'alter table public.sessions enable row level security;',
    'drop policy if exists "own_row_s" on public.sessions;',
    'create policy "own_row_s" on public.sessions',
    '  for all to authenticated',
    '  using (auth.uid() = user_id)',
    '  with check (auth.uid() = user_id);',
  ].join('\n'),

  // ===== 启动初始化（App.init 末尾调用；一切守卫容错，绝不抛错）=====
  // v12.9.20：启动即校验登录态——先上「检查中」门禁锁屏，会话恢复成功才解锁（强制登录门禁）
  cloud99Init() {
    try {
      this._c99.cfg = this._c99ReadCfg();
      if (!this._c99.cfg || !this._c99.cfg.url || !this._c99.cfg.key) { this._c99.state = 'idle'; this.cloud99GateShow(); return; }
      if (typeof supabase === 'undefined') { this._c99.state = 'sdk-missing'; this.cloud99GateShow(); return; } // 离线打开单文件版
      this._c99.client = supabase.createClient(this._c99.cfg.url, this._c99.cfg.key);
      this.cloud99GateShow('checking'); // 先锁屏：登录态确认前不可用
      // 恢复登录会话（session 持久化在 supabase 自己的 localStorage 键里）
      this._c99.client.auth.getSession().then(({ data }) => {
        try {
          if (data && data.session && data.session.user) {
            this._c99.user = { id: data.session.user.id, email: data.session.user.email || '' };
            this._c99.state = 'online';
            this.cloud99GateDismiss();   // 会话有效 → 解锁
            this.cloud99SessionClaim();  // 单设备占领 + 启动心跳
            this.cloud99Compare(); // 静默对比云端/本地 → 提示条
          } else {
            this._c99.state = 'offline';
            this.cloud99GateShow();      // 未登录 → 登录门禁（底线：不可用）
          }
          // 设置页打开时刷新云账户卡显示（v12.9.22 同步版面已删，云账户卡在设置页）
          try { this._c99CardRefresh(); } catch(_) {}
        } catch(_) { this.cloud99GateShow(); }
      }).catch(() => { this._c99.state = 'offline'; this.cloud99GateShow(); });
      // 切后台/关页前把挂起的自动上传立刻发出
      try {
        window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.cloud99Flush(); });
        window.addEventListener('beforeunload', () => this.cloud99Flush());
      } catch(_) {}
      // v12.9.20b 同设备多标签页登出同步：任一标签页登出（SIGNED_OUT）→ 其余标签页立即锁屏
      //（同一设备各标签页共享 supabase localStorage 会话，心跳无法互踢自己，需走事件同步）
      try {
        this._c99.client.auth.onAuthStateChange((ev) => {
          if (ev === 'SIGNED_OUT' && this._c99.user) {
            this._c99HeartbeatStop();
            if (this._c99PushTimer) { clearTimeout(this._c99PushTimer); this._c99PushTimer = null; }
            this._c99.user = null;
            this._c99.state = 'offline';
            this._c99CompareTip = '';
            this.cloud99GateShow(); // 底线：会话没了必须锁
          }
        });
      } catch(_) {}
    } catch (e) {
      // 底线兜底：初始化任何环节崩溃也必须锁屏——宁可错锁，不可漏登（fail-closed）
      console.warn('[cloud99] init failed', e);
      this.cloud99GateShow();
    }
  },

  // ===== v12.9.20 单设备登录引擎 =====
  // 本机会话 id：持久化 localStorage——同一设备刷新页面仍是同一会话，不会被自己踢
  _c99SessionId() {
    try {
      let sid = localStorage.getItem(this.C99_SID_KEY);
      if (!sid) {
        sid = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(this.C99_SID_KEY, sid);
      }
      this._c99.sessionId = sid;
      return sid;
    } catch (_) {
      this._c99.sessionId = this._c99.sessionId || ('sid_' + Math.random().toString(36).slice(2));
      return this._c99.sessionId;
    }
  },
  // 登录占领：把本机 session_id 写入 sessions 行（后登录的设备覆盖先登录的 → 先登录的会被心跳/推送校验发现并锁屏）
  async cloud99SessionClaim(afterLogin) {
    if (!this._c99.client || !this._c99.user) return;
    const sid = this._c99SessionId();
    try {
      const { error } = await this._c99.client.from('sessions').upsert({
        user_id: this._c99.user.id,
        session_id: sid,
        device: String(navigator.userAgent || '').slice(0, 150),
        updated_at: new Date().toISOString(),
      });
      if (error) {
        const noTable = /relation .* does not exist|Could not find the table/i.test(error.message || '');
        if (afterLogin) this.cloud99Msg(noTable
          ? '⚠️ 单设备登录需要 sessions 表：请到「同步」页展开建表 SQL，在 Supabase 执行一次（此前仅本机登录，踢不掉其他设备）'
          : '⚠️ 单设备会话写入失败：' + (error.message || ''), false);
      }
    } catch (_) {}
    this._c99HeartbeatStart();
  },
  _c99HeartbeatStart() {
    this._c99HeartbeatStop();
    try { this._c99HbTimer = setInterval(() => this._c99Heartbeat(), this.C99_HEARTBEAT_MS); } catch (_) {}
  },
  _c99HeartbeatStop() {
    if (this._c99HbTimer) { clearInterval(this._c99HbTimer); this._c99HbTimer = null; }
  },
  // 45s 心跳：读 sessions 行——session_id 不是本机 → 账号已在其他设备登录 → 本机锁屏下线
  async _c99Heartbeat() {
    if (!this._c99.client || !this._c99.user) return;
    try {
      const { data, error } = await this._c99.client.from('sessions')
        .select('session_id').eq('user_id', this._c99.user.id).maybeSingle();
      if (error || !data) return; // 网络失败/表未建/行不存在：不误伤（表未建时 claim 已提示过建表）
      if (data.session_id && data.session_id !== this._c99SessionId()) {
        this.cloud99Kick();
      }
    } catch (_) {}
  },
  // 推送前校验：本机仍是唯一在线会话才允许上传（防旧设备覆盖新设备数据——数据冲突的根源）
  async _c99SessionOk() {
    if (!this._c99.client || !this._c99.user) return true;
    try {
      const { data, error } = await this._c99.client.from('sessions')
        .select('session_id').eq('user_id', this._c99.user.id).maybeSingle();
      if (error || !data || !data.session_id) return true; // 表未建/网络失败：降级放行（不堵死老项目）
      return data.session_id === this._c99SessionId();
    } catch (_) { return true; }
  },
  // 被踢下线锁屏：停心跳 + 停挂起上传 + 登出会话 + 全屏锁定（重新登录 = 刷新页面，最干净的状态复位）
  cloud99Kick() {
    this._c99HeartbeatStop();
    if (this._c99PushTimer) { clearTimeout(this._c99PushTimer); this._c99PushTimer = null; }
    try { if (this._c99.client) this._c99.client.auth.signOut(); } catch (_) {}
    this._c99.user = null;
    this._c99.state = 'offline';
    this._c99CompareTip = '';
    try { this._c99CardRefresh(); } catch (_) {}
    this.cloud99GateShow('kick');
  },
  // v12.9.22 云账户卡刷新：卡挂在设置页（render_data_protection）——仅当用户正停在设置页时局部重绘
  _c99CardRefresh() {
    try { if (this.currentView === 'data_protection') this.render_data_protection(); } catch (_) {}
  },

  // ===== v12.9.20 强制登录门禁（全屏遮罩；表单复用 cloud99Auth / cloud99ResetPw / cloud99Msg 的 DOM id）=====
  // v12.9.21b 开屏让路：开屏动画（splash99，2s+淡出，z-index 99999）在场时门禁延迟 2.8s 再显示——
  // 否则门禁（z-index 极值+不透明背景）启动瞬间就盖死开屏，用户永远看不到小猫舔爪。
  // 延迟期间登录态恢复成功 → cloud99GateDismiss 清掉 pending，门禁永不出现；后到的 mode 覆盖先到的（kick 优先于 checking）。
  cloud99GateShow(mode) {
    try {
      if (document.getElementById('splash99')) {
        clearTimeout(this._c99GateDelayT);
        this._c99GatePendingMode = mode;
        this._c99GateDelayed = true;
        this._c99GateDelayT = setTimeout(() => {
          this._c99GateDelayed = false;
          const m = this._c99GatePendingMode;
          this._c99GatePendingMode = null;
          this._c99GateRender(m);
        }, 2800);
        return;
      }
      this._c99GateRender(mode);
    } catch (_) { try { this._c99GateRender(mode); } catch (_) {} }
  },
  _c99GateRender(mode) {
    try {
      let el = document.getElementById('c99-gate');
      if (!el) {
        el = document.createElement('div');
        el.id = 'c99-gate';
        (document.body || document.documentElement).appendChild(el);
      }
      const c = this._c99;
      const isSignup = this._c99Mode === 'signup';
      let body = '';
      if (mode === 'checking') {
        body = '<div style="text-align:center;color:#94a3b8;font-size:14px;padding:30px 0">⏳ 正在检查登录状态…</div>';
      } else if (mode === 'kick') {
        body = '<div style="text-align:center;padding:8px 0 4px">'
          + '<div style="font-size:44px">🔒</div>'
          + '<div style="font-size:16px;font-weight:900;color:#b91c1c;margin-top:10px">账号已在其他设备登录</div>'
          + '<div style="font-size:13px;color:#64748b;margin-top:8px;line-height:1.8">为保证数据不冲突，同一账号同一时间仅允许一台设备在线。<br>如确认是本人操作，请在本机重新登录。</div>'
          + '<button class="btn btn-primary" style="margin-top:16px;width:100%" onclick="location.reload()">🔄 重新登录</button>'
          + '</div>';
      } else if (c.state === 'sdk-missing') {
        body = '<div style="text-align:center;padding:8px 0 4px">'
          + '<div style="font-size:44px">📡</div>'
          + '<div style="font-size:16px;font-weight:900;margin-top:10px">需要联网登录</div>'
          + '<div style="font-size:13px;color:#64748b;margin-top:8px;line-height:1.8">一人行需登录账号后使用（单设备在线 · 防数据冲突）。<br>当前处于离线模式，请联网后刷新页面。</div>'
          + '<button class="btn btn-primary" style="margin-top:16px;width:100%" onclick="location.reload()">🔄 联网后重试</button>'
          + '</div>';
      } else {
        body = '<div style="text-align:center;margin-bottom:6px">'
          + '<div style="font-size:15px;font-weight:900">🔐 登录一人行</div>'
          + '<div style="font-size:12px;color:#64748b;margin-top:6px">账号登录后使用 · 同一账号仅允许一台设备同时在线</div></div>'
          + '<div class="sync-field"><label>邮箱</label>'
          + '<input id="c99-email" type="email" class="input" placeholder="you@example.com" autocomplete="username"></div>'
          + '<div class="sync-field"><label>密码（至少 6 位）</label>'
          + '<input id="c99-pw" type="password" class="input" placeholder="你的密码" autocomplete="current-password" onkeydown="if(event.key===\'Enter\')App.cloud99Auth()"></div>'
          + '<button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="App.cloud99Auth()">' + (isSignup ? '🆕 注册并登录' : '🔐 登 录') + '</button>'
          + '<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12.5px">'
          + '<a href="javascript:void(0)" style="color:#6366f1" onclick="App.cloud99GateSwitch()">' + (isSignup ? '已有账号？去登录' : '没有账号？去注册') + '</a>'
          + '<a href="javascript:void(0)" style="color:#6366f1" onclick="App.cloud99ResetPw()">忘记密码</a></div>'
          + '<div id="c99-msg" style="margin-top:10px"></div>';
      }
      const dark = false;
      try { dark = document.documentElement.getAttribute('data-theme') === 'dark'; } catch (_) {}
      // z-index 用 int32 极值：必须盖过 modal(2147483600) 等一切既有弹层层级——门禁是最高优先级
      el.innerHTML = '<div style="position:fixed;inset:0;z-index:2147483647;'
        + (dark ? 'background:linear-gradient(160deg,#0b0620,#1e1b4b);' : 'background:linear-gradient(160deg,#f8fafc,#eef2ff);')
        + 'display:flex;align-items:center;justify-content:center;padding:22px;overflow:auto">'
        + '<div style="width:100%;max-width:400px;'
        + (dark ? 'background:#171333;border:1px solid #312e81;' : 'background:#fff;border:1px solid #e2e8f0;')
        + 'border-radius:18px;box-shadow:0 18px 50px rgba(2,6,23,.35);padding:24px 22px;max-height:92vh;overflow:auto">'
        + '<div style="text-align:center;margin-bottom:10px"><span style="font-size:28px">🌌</span>'
        + '<div style="font-size:20px;font-weight:900;letter-spacing:2px;margin-top:2px;color:' + (dark ? '#f1f5f9' : '#0f172a') + '">一 人 行</div>'
        + '<div style="font-size:11px;color:#94a3b8;letter-spacing:3px;margin-top:2px">ONE · XING</div></div>'
        + body + '</div></div>';
    } catch (_) {}
  },
  cloud99GateDismiss() {
    // v12.9.21b 开屏让路配套：清掉延迟中的门禁（登录态已恢复成功 → 门禁永不出现，开屏播完直接进 App）
    clearTimeout(this._c99GateDelayT);
    this._c99GateDelayed = false;
    this._c99GatePendingMode = null;
    try { const el = document.getElementById('c99-gate'); if (el) el.remove(); } catch (_) {}
    // v12.9.20 延迟弹窗队列：解锁后把启动期间排队的新手引导/版本欢迎/每日问候依次放出（错开间隔防叠弹）
    const q = this._c99GateQueue || [];
    this._c99GateQueue = [];
    q.forEach((fn, i) => setTimeout(() => { try { fn(); } catch (_) {} }, 500 + i * 700));
  },
  // 启动期弹窗统一经此入队：门禁在场或延迟等待中 → 挂起；已解锁 → 直放
  _c99GateDefer(fn) {
    if (this._c99GateDelayed || document.getElementById('c99-gate')) {
      this._c99GateQueue = this._c99GateQueue || [];
      this._c99GateQueue.push(fn);
      return;
    }
    try { fn(); } catch (_) {}
  },
  cloud99GateSwitch() {
    this._c99Mode = this._c99Mode === 'signup' ? 'login' : 'signup';
    this.cloud99GateShow();
  },

  // ===== 项目配置（v12.7c：内置官方项目开箱即连；localStorage 里的自建配置可覆盖）=====
  _c99ReadCfg() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.C99_CFG_KEY) || 'null');
      if (saved && saved.url && saved.key) return saved;
    } catch (_) {}
    return { url: this.C99_BAKED.url, key: this.C99_BAKED.key };
  },
  // v12.7c：cloud99SaveCfg / cloud99ClearCfg（自填 URL/Key 配置流）已删除——
  // 官方项目密钥内置（C99_BAKED），用户打开同步页即已连接，直接注册/登录。

  // ===== 认证 =====
  // 表单元素解析：门禁在场时优先取门禁内的输入/提示（与同步页登录卡共用 DOM id，防读错隐藏表单）
  _c99Field(id) {
    try {
      const gate = document.getElementById('c99-gate');
      if (gate) { const el = gate.querySelector('#' + id); if (el) return el; }
    } catch (_) {}
    return document.getElementById(id);
  },
  async cloud99Auth() {
    if (!this._c99.client) return this.cloud99Msg('❌ 云端连接未就绪（离线模式请联网后刷新页面）', false);
    const email = ((this._c99Field('c99-email') || {}).value || '').trim();
    const pw = ((this._c99Field('c99-pw') || {}).value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.cloud99Msg('❌ 邮箱格式不对', false);
    if (pw.length < 6) return this.cloud99Msg('❌ 密码至少 6 位', false);
    this.cloud99Msg('⏳ ' + (this._c99Mode === 'signup' ? '注册中...' : '登录中...'), true);
    try {
      let res, err;
      if (this._c99Mode === 'signup') {
        ({ data: res, error: err } = await this._c99.client.auth.signUp({ email, password: pw }));
        // Supabase 默认开启邮箱确认：注册成功但无 session → 提示去邮箱点链接
        if (!err && (!res || !res.session)) {
          return this.cloud99Msg('📧 注册成功！请去邮箱点击确认链接后再回来登录（或在 Supabase 后台 Authentication → 关闭 Confirm email 可跳过此步）', true);
        }
      } else {
        ({ data: res, error: err } = await this._c99.client.auth.signInWithPassword({ email, password: pw }));
      }
      if (err) {
        const m = String(err.message || err);
        return this.cloud99Msg('❌ ' + (this._c99Mode === 'signup' ? '注册失败：' : '登录失败：') + m, false);
      }
      if (res && res.user) {
        this._c99.user = { id: res.user.id, email: res.user.email || email };
        this._c99.state = 'online';
        this.cloud99Msg('✅ ' + (this._c99Mode === 'signup' ? '注册并登录成功！' : '欢迎回来，') + this._c99.user.email, true);
        this.cloud99GateDismiss();        // v12.9.20 登录成功 → 撤门禁解锁
        await this.cloud99SessionClaim(true); // v12.9.20 单设备占领 + 启动心跳
        await this.cloud99Compare(true);
        this._c99CardRefresh();
      }
    } catch (e) { this.cloud99Msg('❌ 网络异常：' + (e.message || '请检查网络'), false); }
  },
  cloud99SwitchMode() {
    this._c99Mode = this._c99Mode === 'signup' ? 'login' : 'signup';
    this._c99CardRefresh();
  },
  async cloud99ResetPw() {
    if (!this._c99.client) return this.cloud99Msg('❌ 请先配置项目连接', false);
    const email = ((this._c99Field('c99-email') || {}).value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.cloud99Msg('❌ 先在邮箱框填写你的邮箱，再点忘记密码', false);
    const { error } = await this._c99.client.auth.resetPasswordForEmail(email);
    this.cloud99Msg(error ? '❌ 发送失败：' + (error.message || '') : '📧 重置邮件已发送到 ' + email + '，去邮箱按提示操作', !error);
  },
  async cloud99Logout() {
    if (!confirm('退出登录？\n（本机数据保留；退出后需重新登录才能继续使用）')) return;
    this._c99HeartbeatStop(); // v12.9.20 停单设备心跳
    try { if (this._c99.user) await this._c99.client.from('sessions').delete().eq('user_id', this._c99.user.id); } catch (_) {}
    try { await this._c99.client.auth.signOut(); } catch (_) {}
    this._c99.user = null;
    this._c99.state = 'offline';
    this._c99CompareTip = '';
    this._c99CardRefresh();
    this.cloud99GateShow(); // v12.9.20 底线：登出后必须重新登录
  },

  // ===== 同步引擎 =====
  // Store.save 落盘钩子：更新本地 mtime + 节流自动上传（登录态 + 自动开关开着才动）
  cloud99OnSave() {
    try { localStorage.setItem(this.C99_MTIME_KEY, String(Date.now())); } catch (_) {}
    if (!this._c99.user || !this._c99.client) return;
    if (Store.getSetting('cloud99_auto', '1') !== '1') return;
    if (this._c99PushTimer) return; // 已有挂起上传
    this._c99PushTimer = setTimeout(() => {
      this._c99PushTimer = null;
      this.cloud99Push(true); // 静默自动上传
    }, this.C99_THROTTLE_MS);
  },
  // 立刻发出挂起的自动上传（切后台/关页前）
  cloud99Flush() {
    if (this._c99PushTimer) {
      clearTimeout(this._c99PushTimer);
      this._c99PushTimer = null;
      this.cloud99Push(true);
    }
  },
  // 上传：整包 exportAll()（主存档+裸键+checksum）upsert 到自己那一行
  async cloud99Push(silent) {
    if (!this._c99.client || !this._c99.user) { if (!silent) this.cloud99Msg('❌ 请先登录', false); return; }
    // v12.9.20 单设备：推送前校验本机仍是唯一在线会话——防止旧设备把新设备的数据覆盖掉（数据冲突根源）
    if (!(await this._c99SessionOk())) {
      if (this._c99.user) this.cloud99Kick();
      return;
    }
    if (!silent) this.cloud99Msg('⏳ 上传中...', true);
    try {
      const raw = Store.exportAll();
      const row = {
        user_id: this._c99.user.id,
        data: JSON.parse(raw), // jsonb 存完整导出包对象（app=life-journey/payload/bare/checksum）
        updated_at: new Date().toISOString(),
        size: raw.length,
        device: String((navigator.userAgent || '')).slice(0, 150),
      };
      const { error } = await this._c99.client.from('saves').upsert(row);
      if (error) {
        // PGRST301/42P01 等表级错误：多半是没执行建表 SQL
        const m = /relation .* does not exist|Could not find the table/i.test(error.message || '')
          ? '云端还没建表：请复制下方 SQL 到 Supabase SQL Editor 执行一次' : (error.message || String(error));
        if (!silent) this.cloud99Msg('❌ 上传失败：' + m, false);
        return;
      }
      Store.setSetting('last_cloud99_push', new Date().toISOString());
      try { localStorage.setItem(this.C99_MTIME_KEY, String(Date.now())); } catch (_) {}
      if (!silent) this.cloud99Msg('✅ 已上传到云端（' + (raw.length / 1024).toFixed(1) + ' KB）— 其他设备登录同一账号即可拉取', true);
      this._c99CompareTip = ''; // 本地已是最新，对比提示清空
    } catch (e) {
      if (!silent) this.cloud99Msg('❌ 上传异常：' + (e.message || '网络问题'), false);
    }
  },
  // 拉取：云端整包恢复到本机（replace 完全覆盖，先自动导出一份安全备份）
  async cloud99Pull() {
    if (!this._c99.client || !this._c99.user) return this.cloud99Msg('❌ 请先登录', false);
    this.cloud99Msg('⏳ 从云端拉取中...', true);
    try {
      const { data: row, error } = await this._c99.client
        .from('saves').select('data, updated_at').eq('user_id', this._c99.user.id).maybeSingle();
      if (error) return this.cloud99Msg('❌ 拉取失败：' + (error.message || String(error)), false);
      if (!row || !row.data) return this.cloud99Msg('❌ 云端还没有存档：先在旧设备点「立即同步到云端」上传一次', false);
      // 安全网：覆盖前自动下载一份当前本地备份（误操作可回滚）
      try {
        const s = Store.exportAll();
        const blob = new Blob([s], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '一人行-覆盖前安全备份-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } catch (_) {}
      const r = Store.importAll(JSON.stringify(row.data), 'replace');
      if (!r.ok) {
        // v12.8.1 旧版上传的云存档：校验码按旧键序计算，经 jsonb 往返后两条校验通道都不匹配（误报，数据本身完好）
        if (/校验码不一致/.test(r.msg || '')) {
          return this.cloud99Msg('⚠️ 云端存档是旧版校验格式（Supabase 键序重排导致的误报，云端与本机数据都没有损坏，本机也未被改动）。请在数据最新的设备上点「立即同步到云端」覆盖一次，之后所有设备即可正常拉取', false);
        }
        return this.cloud99Msg('❌ 恢复失败：' + r.msg, false);
      }
      try { localStorage.setItem(this.C99_MTIME_KEY, String(new Date(row.updated_at).getTime())); } catch (_) {}
      Store.setSetting('last_cloud99_pull', new Date().toISOString());
      this._c99CompareTip = '';
      this.cloud99Msg('✅ 已从云端恢复到本机（云端数据时间：' + new Date(row.updated_at).toLocaleString('zh-CN') + '）', true);
      this._c99CardRefresh();
    } catch (e) {
      this.cloud99Msg('❌ 拉取异常：' + (e.message || '网络问题'), false);
    }
  },
  // 登录后/启动时静默对比云端 vs 本地 → 提示条（云端新：恢复？本地新：静默自动上传）
  async cloud99Compare(afterLogin) {
    if (!this._c99.client || !this._c99.user) return;
    try {
      const { data: row, error } = await this._c99.client
        .from('saves').select('updated_at, size').eq('user_id', this._c99.user.id).maybeSingle();
      if (error) { if (afterLogin) this.cloud99Msg('⚠️ 云端读不到存档（首次使用请先执行建表 SQL）：' + (error.message || ''), false); return; }
      if (!row) {
        // 云端空：首次使用 → 提示上传（不自动覆盖云端，防止误把空数据传上去盖掉）
        this._c99CompareTip = '';
        if (afterLogin) this.cloud99Msg('💡 云端还没有存档。这台设备的数据要上云，请点「立即同步到云端」', true);
        return;
      }
      const cloudMs = new Date(row.updated_at).getTime() || 0;
      const localMs = +(localStorage.getItem(this.C99_MTIME_KEY) || 0) || 0;
      const cloudStr = new Date(row.updated_at).toLocaleString('zh-CN');
      const kb = row.size ? (row.size / 1024).toFixed(1) + ' KB' : '';
      if (cloudMs > localMs + 2000) {
        // 云端明显更新（换设备/另一台机器传过）→ 恢复提示条
        this._c99CompareTip =
          '<div class="c99-conflict">☁️ 云端有更新存档（' + cloudStr + (kb ? ' · ' + kb : '') +
          '）比本机数据新：<button class="btn btn-sm btn-primary" onclick="App.cloud99Pull()">⬇️ 恢复到本机</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="App.cloud99KeepLocal()">以本机为准，覆盖云端</button></div>';
      } else {
        this._c99CompareTip = ''; // 本地新/持平：自动同步会上传，不打扰
      }
      try { if (document.getElementById('c99-conflict')) document.getElementById('c99-conflict').innerHTML = this._c99CompareTip; } catch (_) {}
    } catch (_) {}
  },
  cloud99KeepLocal() {
    this._c99CompareTip = '';
    try { const el = document.getElementById('c99-conflict'); if (el) el.innerHTML = ''; } catch (_) {}
    this.cloud99Push(false); // 立刻用本机数据覆盖云端
  },
  toggleCloudAuto() {
    const cur = Store.getSetting('cloud99_auto', '1') === '1';
    Store.setSetting('cloud99_auto', cur ? '0' : '1');
    this._c99CardRefresh();
  },

  // ===== UI =====
  // 同步中心顶部「方案⓪：账号云同步」卡片（v12.7c：官方项目密钥已内置，两态：未登录/已登录）
  cloud99Card() {
    const c = this._c99;
    const lastPush = Store.getSetting('last_cloud99_push', '');
    const lastPull = Store.getSetting('last_cloud99_pull', '');
    const auto = Store.getSetting('cloud99_auto', '1') === '1';
    // 状态徽标
    let badge = '<span class="sync-badge">推荐 · 真账号</span>';
    let stateLine = '';
    if (c.state === 'sdk-missing') {
      stateLine = '<div style="margin-top:8px;font-size:12.5px;color:#b45309">⚠️ 当前处于离线模式（单文件版未联网）——App 本地功能不受影响，联网刷新后即可登录云账户。</div>';
    }
    let html = '<div class="card" style="border:1.5px solid #a5b4fc">'
      + '<div class="card-title"><span class="ico">🔐</span>账号云同步 <span style="font-size:12px;color:var(--text-soft);font-weight:400">邮箱注册 · 独立账号 · 数据互不可见</span> ' + badge + '</div>'
      + '<div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:4px">'
      + '注册你自己的账号，存档自动上云——<b>换手机 / 清缓存 / 多设备</b>都不丢数据。每人一个账号，云端数据互相隔离（Supabase 行级安全）。</div>'
      + stateLine;

    if (!c.user) {
      // —— 态1：未登录（官方项目已内置连接，直接注册/登录）——
      const isSignup = this._c99Mode === 'signup';
      html += '<div class="sync-field"><label>邮箱</label>'
        + '<input id="c99-email" type="email" class="input" placeholder="you@example.com" autocomplete="username"></div>'
        + '<div class="sync-field"><label>密码（至少 6 位）</label>'
        + '<input id="c99-pw" type="password" class="input" placeholder="你的密码" autocomplete="current-password" onkeydown="if(event.key===\'Enter\')App.cloud99Auth()"></div>'
        + '<div class="sync-btns">'
        + '<button class="btn btn-primary" onclick="App.cloud99Auth()">' + (isSignup ? '🆕 注册并登录' : '🔐 登录') + '</button>'
        + '<button class="btn btn-ghost" onclick="App.cloud99SwitchMode()">' + (isSignup ? '已有账号？去登录' : '没有账号？去注册') + '</button>'
        + '<button class="btn btn-ghost" onclick="App.cloud99ResetPw()">忘记密码</button>'
        + '</div>'
        + '<div class="sync-last">✅ 云端已内置连接（' + this.esc((c.cfg && c.cfg.url || this.C99_BAKED.url).replace(/^https:\/\//, '')) + '）——直接注册 / 登录你的账号即可'
        + ' · <a href="javascript:void(0)" onclick="App.cloud99ToggleSQL()">建表 SQL</a></div>'
        + '<div id="c99-sql-box" style="display:none"><pre class="c99-sql">' + this.esc(this.C99_SQL) + '</pre></div>';
    } else {
      // —— 态3：已登录 ——
      html += '<div class="c99-userbar">👤 <b>' + this.esc(c.user.email) + '</b>'
        + '<span class="c99-ok">已登录</span></div>'
        + '<div style="font-size:12px;color:var(--text-soft);margin-top:2px">🔒 单设备在线：同一账号同一时间仅一台设备可用，其他设备登录后本机会自动锁定</div>'
        + '<div id="c99-conflict">' + this._c99CompareTip + '</div>'
        + '<label class="c99-auto" onclick="App.toggleCloudAuto()" style="cursor:pointer">'
        + '<input type="checkbox" ' + (auto ? 'checked' : '') + ' onchange="void(0)"> 自动云同步（本机改动 8 秒后自动上传，推荐开启）</label>'
        + '<div class="sync-btns">'
        + '<button class="btn btn-primary" onclick="App.cloud99Push()">☁️ 立即同步到云端</button>'
        + '<button class="btn btn-ghost" onclick="App.cloud99Pull()">⬇️ 从云端恢复到本机</button>'
        + '<button class="btn btn-ghost" onclick="App.cloud99Logout()">退出登录</button>'
        + '</div>'
        + '<div class="sync-last">最近上传：' + (lastPush ? new Date(lastPush).toLocaleString('zh-CN') : '—')
        + ' · 最近恢复：' + (lastPull ? new Date(lastPull).toLocaleString('zh-CN') : '—') + '</div>'
        + '<div class="sync-last" style="color:#94a3b8">自动恢复策略：登录时若云端比本机新会提示恢复；本机更新则自动上传。存档含主数据+游戏进度+偏好，整包同步。</div>';
    }
    html += '<div id="c99-msg" class="sync-msg"></div></div>';
    return html;
  },
  // 展开/收起建表 SQL（换自建项目或排查建表问题时用）
  cloud99ToggleSQL() {
    try {
      const el = document.getElementById('c99-sql-box');
      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    } catch (_) {}
  },
  cloud99Msg(text, ok) {
    try {
      const el = this._c99Field('c99-msg');
      if (el) { el.innerHTML = '<div class="' + (ok ? 'c99-ok-msg' : 'c99-err-msg') + '">' + text + '</div>'; }
    } catch (_) {}
    console.log('[cloud99]', text.replace(/<[^>]+>/g, ''));
  },
});
