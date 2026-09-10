// 95-usage99.js —— v12.9.41 【使用统计】四魔自动执法引擎（APK 客户端专属 · 网页版优雅降级）
// [功能组] G4-数据洞察 + G9-独行信条（RPG 惩罚从「自觉申报制」升级「自动执法制」）
//
// 双形态运行：
//   · APK 客户端（Capacitor + Usage99Plugin 原生桥）：读当日各 App 前台时长 + 前台切换事件流
//       - 娱魔：娱乐类 App（抖音/B站/游戏…）当日总时长 > 阈值（默认 60 分钟）→ 活性 +1
//       - 惰魔：全天屏幕总时长 > 8 小时 → 活性 +1
//       - 聚神模式：切走手机 = 事件流抓到非白名单 App 转前台 → 自动判破戒（魔物活性 +1 · 模式惩罚同步）
//   · PWA 网页版：Usage99 桥不存在 → 自动执法开关隐藏/标记「仅客户端可用」，原有手动打卡完全不变
//
// 隐私：使用数据仅在设备本机读取，不写入 localStorage 之外的任何地方（不进云同步）。

// v12.9.42 APK 更新链 v2 · 更新源（部署站点根地址，不带末尾斜杠）：
//   部署 deploy-netlify/ 后，该站点下有 apk-manifest.json + apk/yirenxing-v*.apk，
//   App 打开时自动拉清单比对版本 → 弹窗 → 应用内下载 → 系统安装器覆盖安装。
//   可用 localStorage.apk99_feed 覆盖（换托管域名无需重出包）。
// v12.9.48 更新源切换：Netlify 免费额度耗尽不再可靠 → GitHub 仓库 raw 直链（永久免费 · CORS 全开）
//   旧版 App 内置 netlify 源仍可用（额度过月重置）；新版装机起走 GitHub
const APK99_FEED = 'https://raw.githubusercontent.com/1936956836/yirenxing/main';   // 更新源（仓库 raw 根，不带末尾斜杠）

Object.assign(App, {
  // ==================== 桥接状态 ====================
  _u99Bridge() {
    try {
      const cap = (typeof window !== 'undefined' && window.Capacitor) || null;
      if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Usage99) {
        return cap.Plugins.Usage99;
      }
    } catch (e) {}
    return null;
  },
  _u99Available() { return !!this._u99Bridge(); },

  // 娱乐类 App 识别（包名/应用名关键词 · 命中即计入娱乐时长）
  _u99ENT_PKGS: ['tv.danmaku.bili', 'com.smile.gifmaker', 'com.ss.android.ugc.aweme', 'com.ss.android.article.video',
    'com.tencent.tmgp', 'com.netease.dwrg', 'com.miHoYo', 'com.hypergryph', 'com.tencent.mobileqqapp', 'com.kwai.video',
    'com.xunmeng.pinduoduo.xiaomi', 'com.ss.android.article.lite'],
  _u99ENT_KEYS: ['抖音', '快手', '哔哩', 'bili', 'B站', '微博', '贴吧', '王者', '原神', '米哈游', '和平精英',
    '蛋仔', '第五人格', '恋与', '网易', '斗鱼', '虎牙', '番茄', '七猫', '起点', '小红书'],
  _u99IsEnt(pkg, name) {
    const s = String(pkg || '') + ' ' + String(name || '');
    if (this._u99ENT_PKGS.some(p => s.indexOf(p) !== -1)) return true;
    return this._u99ENT_KEYS.some(k => s.indexOf(k) !== -1);
  },

  // ==================== 拉取当日使用数据（APK 桥 · 网页版返回 null）====================
  async _u99Today() {
    const b = this._u99Bridge();
    if (!b) return null;
    try {
      const r = await b.today();
      if (!r || !r.ok) return r && r.needPerm ? { needPerm: true } : null;
      let entMs = 0;
      (r.apps || []).forEach(a => { if (this._u99IsEnt(a.pkg, a.name)) entMs += (+a.ms || 0); });
      return { ok: true, totalMs: r.totalMs || 0, entMs, apps: r.apps || [], ts: Date.now() };
    } catch (e) { return null; }
  },

  // ==================== 四魔自动执法（每日一次判定 · 页面渲染时懒触发）====================
  // 娱魔：娱乐总时长 > 阈值（默认 60 分钟）→ +1；惰魔：全天屏幕 > 8h → +1（同日幂等 · 逐日只记一次）
  async _u99AutoJustice() {
    try {
      if (!this._u99Available()) return;
      const day = (Store && Store.today) ? Store.today() : '';
      if (!day) return;
      const d = this._quit99Data();
      d.auto = d.auto || {};
      const a = (d.auto[day] = d.auto[day] || {});
      const done = (m) => !!a[m];
      const need = !done('yu') || !done('duo');
      if (!need) return;
      const t = await this._u99Today();
      if (!t || !t.ok) return;
      const notes = [];
      // 娱魔：娱乐类总时长 > 60 分钟
      const ENT_LIMIT = 60 * 60 * 1000;
      if (!done('yu') && t.entMs > ENT_LIMIT) {
        const dm = d.mons.yu.act = Math.max(0, Math.min(5, d.mons.yu.act + 1));
        if (dm >= 5) d.mons.yu.broke = true;
        a.yu = 1; a.yuMs = t.entMs;
        notes.push(`🎵 娱魔活性 +1（娱乐 App 今日 ${Math.round(t.entMs / 60000)} 分钟 > 60 分钟上限）`);
      } else if (!done('yu')) {
        a.yu = 0; a.yuMs = t.entMs;   // 未超标：记录在案（不涨活性）
      }
      // 惰魔：全天屏幕 > 8 小时
      const DAY_LIMIT = 8 * 60 * 60 * 1000;
      if (!done('duo') && t.totalMs > DAY_LIMIT) {
        const dm = d.mons.duo.act = Math.max(0, Math.min(5, d.mons.duo.act + 1));
        if (dm >= 5) d.mons.duo.broke = true;
        a.duo = 1; a.duoMs = t.totalMs;
        notes.push(`🦥 惰魔活性 +1（全天屏幕 ${Math.round(t.totalMs / 3600000)} 小时 > 8 小时上限）`);
      } else if (!done('duo')) {
        a.duo = 0; a.duoMs = t.totalMs;
      }
      this._quit99Save(d);
      if (notes.length) {
        setTimeout(() => this._flash(notes.join('　')), 1200);
        const broke = Object.keys(d.mons).filter(k => d.mons[k].broke);
        if (broke.length) setTimeout(() => this._flash(`🔥 ${broke.map(k => this._quit99Defs()[k].n).join('、')}已冲破封印——速去【戒断数据】对决`), 2600);
      }
    } catch (e) {}
  },

  // ==================== 聚神防切走（实时事件流轮询）====================
  // 聚神（80-mode99）开启时调用：启动轮询，抓到「非一人行的 App 转前台」= 破戒
  //   → 魔物活性 +1（贪魔：切去购物/短视频；否则计入娱魔）+ 模式侧自动判破（_mode99BreakHook）
  _u99WatchStart() {
    if (!this._u99Available() || this._u99WatchTimer) return;
    this._u99WatchSince = Date.now();
    this._u99WatchTimer = setInterval(() => this._u99WatchPoll(), 5000);   // 5s 轮询事件流
    this._u99WatchPoll();
  },
  _u99WatchStop() {
    if (this._u99WatchTimer) { clearInterval(this._u99WatchTimer); this._u99WatchTimer = null; }
    this._u99WatchSince = null;
  },
  async _u99WatchPoll() {
    try {
      const b = this._u99Bridge();
      if (!b) return this._u99WatchStop();
      const since = this._u99WatchSince || (Date.now() - 60000);
      const r = await b.watch({ since });
      this._u99WatchSince = r && r.now ? r.now : Date.now();
      if (!r || !r.ok || !(r.events || []).length) return;
      // 抓到切走：逐事件判破（贪魔：购物/短视频类；其余计入娱魔）
      const d = this._quit99Data();
      let fedYu = 0, fedTan = 0;
      const names = [];
      (r.events || []).forEach(ev => {
        if (this._u99IsEnt(ev.pkg, ev.name)) fedYu++; else fedTan++;
        if (names.length < 3) names.push(ev.name || ev.pkg);
      });
      const notes = [];
      if (fedYu) {
        d.mons.yu.act = Math.max(0, Math.min(5, d.mons.yu.act + 1));
        if (d.mons.yu.act >= 5) d.mons.yu.broke = true;
        notes.push(`🎵 娱魔活性 +1（聚神期间切去娱乐 App）`);
      }
      if (fedTan) {
        d.mons.tan.act = Math.max(0, Math.min(5, d.mons.tan.act + 1));
        if (d.mons.tan.act >= 5) d.mons.tan.broke = true;
        notes.push(`💰 贪魔活性 +1（聚神期间切去 ${names.join('、')}）`);
      }
      this._quit99Save(d);
      this._mode99BreakHook && this._mode99BreakHook(`聚神期间切走手机（${names.join('、')}）`);
      setTimeout(() => this._flash('🚫 检测到聚神期间切走手机——已自动判破戒，魔物活性上涨'), 400);
    } catch (e) {}
  },

  // ==================== 权限引导（小米：使用情况访问）====================
  // 「使用情况访问」属 AppOps 特殊权限——Android 明令禁止弹窗索取（连微信也弹不了），
  // 只能用户在系统设置里手动开启；openPerm() 一键跳到授权列表页，用户只需找到 一行人 → 允许
  async _u99AskPerm() {
    const b = this._u99Bridge();
    if (!b) { this._flash('📱 使用统计为客户端专属——网页版请继续使用手动打卡'); return; }
    try {
      const r = await b.hasPerm();
      if (r && r.ok) { this._flash('✅ 使用统计权限已就绪，自动执法已开启'); this._u99AutoJustice(); return; }
      this._u99PermModal();
    } catch (e) { this._flash('❌ 桥接异常'); }
  },

  // 授权引导弹窗（「一键跳转」按钮调原生 openPerm 直达系统授权列表）
  _u99PermModal() {
    const b = this._u99Bridge();
    this._modal('📱 开启「四魔自动执法」', `
      <div style="font-size:12.5px;color:#475569;line-height:2">
        需要授予<b>「使用情况访问」</b>权限。这是 Android 的<b>特殊权限，系统不允许任何 App 弹窗索取</b>（微信也做不到），
        只能由你在系统设置里亲手开启——点下方按钮我直接带你过去：<br>
        <b>找到「一人行」→ 打开允许</b>，回来后自动生效（无需重启 App）。<br>
        <span style="color:#94a3b8">手动路径（备用）：设置 → 隐私保护 → 特殊权限管理 → 使用情况访问</span><br>
        授权后（系统只读接口 · 仅本机读取各 App 使用时长 · 数据不出设备）：<br>
        · 🎵 娱魔自动绑定<b>娱乐 App（抖音/B站/游戏等）当日总时长 > 60 分钟</b><br>
        · 🦥 惰魔自动绑定<b>全天屏幕总时长 > 8 小时</b><br>
        · 🧘 聚神模式期间<b>切走手机 = 自动判破戒</b>（事件流实时抓取，退出 App 就在喂魔）
      </div>`,
      [
        { label: '🚀 一键跳转授权页', primary: true, onClick: async () => {
            try { await b.openPerm(); } catch (e) {}
            setTimeout(() => this._u99AskPerm(), 400);   // 回到前台后自动复检
          } },
        { label: '稍后再说' },
      ]);
  },

  // v12.9.43 启动主动提醒（客户端 · 未授权时每日一次）：授权后永不再弹
  async _u99PermNudge() {
    if (!this._u99Available()) return;
    try {
      const r = await this._u99Bridge().hasPerm();
      if (r && r.ok) return;
      const day = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem('u99nudge') === day) return;
      localStorage.setItem('u99nudge', day);
      setTimeout(() => this._u99PermModal(), 600);
    } catch (e) {}
  },

  // ==================== v12.9.44 到期锁（客户端直发 · 强制更新）====================
  // 交付模式变更：不走线上更新源——安装包由开发者直发（微信传输 · 覆盖安装），
  // 「强制更新」以版本到期实现：每个安装包内置有效期（version.js 的 expires 字段），
  // 到期 → 全屏锁定（仅客户端锁 · 网页版不受影响），安装新版（有效期顺延）自动解锁；
  // 临近到期 7 天内每日提醒一次；锁屏每 60s 自查（跨天使用也不放过）。
  // 返回：0=未到期 1=7 天内到期 2=已到期（无 expires 字段 → 0，旧版兼容）
  _u99Expired() {
    try {
      const v = (typeof window !== 'undefined' && window.__APP_VER__) || {};
      if (!v.expires) return 0;
      const end = new Date(v.expires + 'T23:59:59+08:00').getTime();
      if (Date.now() > end) return 2;
      if (Date.now() > end - 7 * 864e5) return 1;
    } catch (e) {}
    return 0;
  },
  _u99ExpiryLock() {
    if (!this._u99Available()) return;                 // 网页版永不锁定
    const st = this._u99Expired();
    if (st === 1) {                                    // 临近到期：每日一次温和提醒
      const day = new Date().toISOString().slice(0, 10);
      try {
        if (localStorage.getItem('u99expw') !== day) {
          localStorage.setItem('u99expw', day);
          const v = window.__APP_VER__ || {};
          this._flash('⏳ 本版本将于 ' + (v.expires || '') + ' 到期——请提前联系开发者获取新版安装包');
        }
      } catch (e) {}
      return;
    }
    if (st !== 2) return;
    if (document.getElementById('u99-explock')) return;
    const v = window.__APP_VER__ || {};
    const div = document.createElement('div');
    div.id = 'u99-explock';
    div.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.97);display:flex;align-items:center;justify-content:center;padding:28px;';
    div.innerHTML = `
      <div style="max-width:400px;text-align:center;color:#f8fafc;font-family:inherit">
        <div style="font-size:52px;line-height:1;margin-bottom:14px">⏳</div>
        <div style="font-size:19px;font-weight:700;margin-bottom:10px;color:#fca5a5">本版本已到期</div>
        <div style="font-size:13px;color:#cbd5e1;line-height:2;margin-bottom:20px">
          一人行 v${v.v || ''} 已于 <b style="color:#fca5a5">${v.expires || '—'}</b> 到期<br>
          本客户端以「安装包直发」方式更新：<br>
          <b>联系开发者获取最新 APK → 微信接收 → 点开覆盖安装</b><br>
          <span style="color:#94a3b8">（同签名覆盖安装 · 全部数据保留）</span><br>
          安装新版后自动解锁
        </div>
        <button type="button" onclick="App._u99ExpiryRecheck()" style="padding:10px 22px;border-radius:12px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;font-size:13px">我已安装新版 · 重新检测</button>
      </div>`;
    document.body.appendChild(div);
  },
  _u99ExpiryRecheck() {
    const div = document.getElementById('u99-explock');
    if (div) div.remove();
    if (this._u99Expired() === 0) { this._flash('✅ 已解锁——欢迎回来'); return; }
    this._u99ExpiryLock();
  },

  // ==================== APK 自动更新（v12.9.42 应用内更新链 v2）====================
  // 更新源 = 部署站点（apk-manifest.json + apk/ 随 deploy-netlify 发布，与网页版同源）；
  // 发现新版 → 弹窗 → 应用内下载（原生 DownloadManager · 免存储权限）→ 完成自动弹系统安装器
  // （同签名覆盖安装 · 数据保留；Android 8+ 首次需在系统弹窗允许「安装未知应用」，仅一次）
  _apk99Feed() {
    try {
      const s = localStorage.getItem('apk99_feed');
      if (s) return s.replace(/\/+$/, '');
    } catch (e) {}
    return (typeof APK99_FEED === 'string' ? APK99_FEED : '').replace(/\/+$/, '');
  },
  _apk99Check() {
    try {
      // 仅客户端检查（网页版走 version.js 推送链）
      if (!this._u99Available()) return;
      const base = this._apk99Feed();
      if (!base) return;                              // 更新源未配置（部署后出包/手动设置）
      const url = base + '/apk-manifest.json';
      const ctrl = new AbortController();
      // v12.9.46b 更新推送加固：超时 6s → 15s——部分移动网络到部署站首跳 TLS+TTFB 超 6s，
      //   旧超时会把"慢"当"失败"静默吞掉（用户端表现：永远收不到更新推送）
      const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 15000);
      fetch(url, { signal: ctrl.signal, cache: 'no-store' })
        .then(r => r.json())
        .then(mf => {
          clearTimeout(timer);
          if (!mf || !mf.v) return;
          const cur = (typeof window !== 'undefined' && window.__APP_VER__ && window.__APP_VER__.v) || '';
          if (cur && mf.v !== cur && this._apk99Newer(mf.v, cur)) {
            // v12.9.46 强制更新（用户指令 · 三强制门槛之一）：持有旧版本无法使用——
            //   线上有新版 → 全屏版本锁（不可关闭 · 无「下次再说」），仅提供「下载并安装」；
            //   装上新版（cur === mf.v）自动解锁。断网由联网门禁兜底锁，更新源拉取失败不锁（防误伤），
            //   长期不更新由版本到期锁兜底。
            this._u99VerLock(mf, url);
          }
        })
        .catch(() => {});
    } catch (e) {}
  },

  // ==================== v12.9.46 强制更新 · 版本锁（三强制门槛之一）====================
  // 持有旧版本 → 全屏锁定（仅客户端 · z-index 高于一切）：
  //   「⬇️ 下载并安装」（应用内下载 → 自动弹系统安装器 · 同签名覆盖数据保留）
  //   「我已安装新版 · 重新检测」（检测通过自动解锁）
  _u99VerLock(mf, url) {
    if (document.getElementById('u99-verlock')) return;
    const cur = (window.__APP_VER__ && window.__APP_VER__.v) || '';
    const dl = new URL(mf.apk, url).href;
    const div = document.createElement('div');
    div.id = 'u99-verlock';
    div.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.97);display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;';
    div.innerHTML = `
      <div style="max-width:420px;text-align:center;color:#f8fafc;font-family:inherit">
        <div style="font-size:48px;line-height:1;margin-bottom:12px">📦</div>
        <div style="font-size:18px;font-weight:800;margin-bottom:6px;color:#fbbf24">发现新版本 v${this.esc(mf.v)}</div>
        <div style="font-size:12px;color:#fca5a5;font-weight:700;margin-bottom:12px">一人行需更新到最新版本后使用（当前 v${this.esc(cur)}）</div>
        <div style="text-align:left;font-size:12px;color:#cbd5e1;line-height:1.9;margin-bottom:16px;background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px">
          ${mf.date ? '📅 ' + this.esc(mf.date) + '<br>' : ''}
          ${(mf.changes || []).map(c => '· ' + this.esc(c)).join('<br>')}
        </div>
        <button type="button" id="u99-verlock-dl" style="width:100%;padding:12px 0;border-radius:12px;border:0;background:linear-gradient(135deg,#F472B6,#EC4899);color:#fff;font-size:14.5px;font-weight:800;box-shadow:0 6px 18px -6px rgba(236,72,153,.65)"
          onclick="App._u99VerDownload(this,'${dl.replace(/'/g, "\\'")}')">⬇️ 立即下载并安装</button>
        <button type="button" style="width:100%;margin-top:10px;padding:10px 0;border-radius:12px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;font-size:12.5px"
          onclick="App._u99VerRecheck()">我已安装新版 · 重新检测</button>
        <div style="font-size:10.5px;color:#94a3b8;margin-top:12px;line-height:1.7">下载完成自动弹出安装界面（同签名覆盖安装 · 全部数据保留）<br>Android 8+ 首次需在系统弹窗允许「安装未知应用」，仅一次</div>
      </div>`;
    document.body.appendChild(div);
  },
  async _u99VerDownload(btn, dl) {
    if (btn) { btn.disabled = true; btn.textContent = '⬇️ 下载中…（完成后自动弹安装）'; }
    try {
      const b = this._u99Bridge();
      const r = await b.downloadAndInstall({ url: dl });
      if (r && r.ok) return;
    } catch (e) {}
    // 桥不可用/失败：回落浏览器下载（旧版 App / 异常兜底）
    try { window.open(dl, '_system'); } catch (e) { location.href = dl; }
    if (btn) { btn.disabled = false; btn.textContent = '⬇️ 立即下载并安装'; }
  },
  _u99VerRecheck() {
    const base = this._apk99Feed();
    if (!base) return;
    fetch(base + '/apk-manifest.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(mf => {
        const cur = (window.__APP_VER__ && window.__APP_VER__.v) || '';
        if (!mf || !mf.v || !cur || mf.v === cur || !this._apk99Newer(mf.v, cur)) {
          const div = document.getElementById('u99-verlock');
          if (div) div.remove();
          this._flash('✅ 已解锁——欢迎来到最新版');
          return;
        }
        this._flash('⏳ 检测到本机仍是旧版本 v' + cur + '——请安装新版后重试');
      })
      .catch(() => this._flash('⚠️ 检测失败，请检查网络后重试'));
  },

  // 手动检查（v12.9.46 强制更新模式下）：已是最新 → 提示；旧版 → 触发版本锁推送安装包
  _apk99CheckForce() {
    const v = (typeof window !== 'undefined' && window.__APP_VER__) || {};
    const info = `📦 当前 v${v.v || '?'} · 有效期至 ${v.expires || '—'}`;
    const base = this._apk99Feed();
    if (!base || !this._u99Available()) { this._flash(info + '\n（直发模式：新版安装包请联系开发者获取）'); return; }
    fetch(base + '/apk-manifest.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(mf => {
        const cur = v.v || '';
        if (!mf || !mf.v) return this._flash(info + '\n（直发模式：新版安装包请联系开发者获取）');
        if (mf.v === cur || !this._apk99Newer(mf.v, cur)) return this._flash('✅ 当前已经是最新版本了 · v' + cur);
        this._u99VerLock(mf, base + '/apk-manifest.json');   // 旧版本 → 推送新版安装包
      })
      .catch(() => this._flash(info + '\n（直发模式：新版安装包请联系开发者获取）'));
  },
  _apk99Newer(a, b) {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) { const x = pa[i] || 0, y = pb[i] || 0; if (x !== y) return x > y; }
    return false;
  },

  // ==================== v12.9.46 【应用数据】数据研究所第 11 库 ====================
  // 授权「使用量权限」后可查看手机上所有 App 的今日使用时长（抖音/B站/微博…），娱乐类自动标红。
  // 未授权 / 网页版：显示引导卡（跳独行空间页授权）。
  _apps99Sort: 'ms',
  async _wbApps99(wb, W) {
    const client = this._u99Available();
    const fmt = (ms) => {
      ms = Math.max(0, Math.round(ms / 60000));
      return ms >= 60 ? (ms / 60).toFixed(1) + ' 小时' : ms + ' 分钟';
    };
    const d = await this._u99Today();
    const wrap = document.getElementById('apps99list');
    const renderList = () => {
      const el = wrap;
      if (!el) return;
      if (!client) {
        el.innerHTML = `<div class="perm99-banner" style="margin-top:0">📱 应用数据为客户端专属——网页版无法读取手机使用统计</div>`;
        return;
      }
      if (!d || d.needPerm) {
        el.innerHTML = `<div class="card" style="border:2px solid #fde68a;background:linear-gradient(180deg,#fff,#fffbeb)">
          <div class="card-title"><span class="ico">🔓</span>需要「使用量」权限</div>
          <div style="font-size:12.5px;color:#92400e;line-height:1.9;margin-top:4px">
            授予「使用情况访问」后，这里会列出手机上所有 App 的今日使用时长（抖音 / 哔哩哔哩 / 微博 / 游戏…），娱乐类自动标红——看看时间都去哪了。
          </div>
          <div style="margin-top:10px"><button class="btn btn-primary" onclick="App._u99AskPerm()">🚀 一键跳转授权</button>
          <button class="btn btn-ghost" onclick="App.navigate('perm99')">🛡️ 独行空间</button></div>
        </div>`;
        return;
      }
      const apps = (d.apps || []).slice();
      const total = d.totalMs || 0;
      const ent = d.entMs || 0;
      const bars = apps.slice(0, 30).map((a, i) => {
        const isEnt = this._u99IsEnt(a.pkg, a.name);
        const pct = total ? Math.min(100, (a.ms / total) * 100) : 0;
        return `<div class="apps99-row ${isEnt ? 'ent' : ''}">
          <span class="apps99-rk">${i + 1}</span>
          <div class="apps99-mid">
            <div class="apps99-name">${this.esc(a.name || a.pkg || '未知应用')}${isEnt ? '<span class="apps99-tag">娱乐</span>' : ''}</div>
            <div class="apps99-bar"><i style="width:${pct.toFixed(1)}%"></i></div>
          </div>
          <span class="apps99-ms">${fmt(a.ms)}</span>
        </div>`;
      }).join('');
      el.innerHTML = `
        <div class="apps99-hero">
          <div class="apps99-hero-main">
            <div class="apps99-hero-l">今日总屏幕</div>
            <div class="apps99-hero-n">${fmt(total)}</div>
          </div>
          <div class="apps99-hero-side ${ent > 60 * 60000 ? 'bad' : ''}">
            <div class="apps99-hero-l">${ent > 60 * 60000 ? '娱乐超标' : '娱乐时长'}</div>
            <div class="apps99-hero-v">${fmt(ent)}</div>
            <div class="apps99-hero-sub">娱魔阈值 60 分钟${ent > 60 * 60000 ? ' · 已自动执法' : ''}</div>
          </div>
        </div>
        ${bars || '<div class="empty">今天还没有其他 App 使用记录</div>'}
        ${apps.length > 30 ? `<div class="perm99-foot" style="margin-top:8px">仅显示前 30 个 App · 共 ${apps.length} 个</div>` : ''}`;
    };
    // 首次渲染骨架 + 异步填充
    setTimeout(renderList, 0);
    return `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">📱</span>应用数据 · 今日 App 使用时长
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">v12.9.46 · 需「使用量」权限</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="App._u99AppsRefresh()">🔄 重新读取</button>
        <button class="btn btn-sm btn-ghost" onclick="App._dc99Set('tab','home')">📊 数据中心</button>
        <button class="btn btn-sm btn-ghost" onclick="App.navBack()">← 返回上一页</button>
      </div>
      <div style="font-size:12px;color:var(--text-soft);margin-top:6px">抖音 / 哔哩哔哩 / 微博等手机上所有软件的使用时间一目了然——娱乐类自动标红，全天屏幕超 8 小时惰魔活性 +1。</div>
    </div>
    <div id="apps99list"><div class="empty">正在读取使用统计…</div></div>
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
  },
  async _u99AppsRefresh() {
    const el = document.getElementById('apps99list');
    if (el) el.innerHTML = '<div class="empty">正在读取使用统计…</div>';
    await this._u99Today();                    // 预热（触发自动执法懒结算）
    try { this.render_workbench(); } catch (e) {}   // 走完整渲染管线（保持 tab 状态）
  },

  // ==================== 戒断数据页：自动执法状态卡（仅客户端显示）====================
  _u99StatusCard() {
    if (!this._u99Available()) return '';
    const d = this._quit99Data();
    const day = (Store && Store.today) ? Store.today() : '';
    const a = ((d.auto || {})[day]) || {};
    const fmt = (ms) => ms >= 3600000 ? (ms / 3600000).toFixed(1) + ' 小时' : Math.round(ms / 60000) + ' 分钟';
    return `
    <div class="card" style="margin-top:14px;border:2px solid #fca5a5;background:linear-gradient(180deg,#fff,#fef2f2)">
      <div class="card-title"><span class="ico">🤖</span>自动执法 · 使用统计
        <span>
          <button class="btn btn-ghost btn-sm p99-title-btn" onclick="App._apk99CheckForce()">检查更新</button>
          <button class="btn btn-ghost btn-sm p99-title-btn" onclick="App._u99AskPerm()">权限 / 检测</button>
        </span>
      </div>
      <div style="font-size:12px;color:#7f1d1d;line-height:2;margin-top:6px">
        ${a.yu === 1 ? `🎵 娱乐 App 今日 <b style="color:#dc2626">${fmt(a.yuMs || 0)}</b> — 已超标，娱魔活性 +1` : a.yuMs !== undefined ? `🎵 娱乐 App 今日 <b>${fmt(a.yuMs || 0)}</b> / 60 分钟 — 未超标` : '🎵 娱乐 App 时长：待读取'}
        <br>${a.duo === 1 ? `🦥 全天屏幕 <b style="color:#dc2626">${fmt(a.duoMs || 0)}</b> — 已超标，惰魔活性 +1` : a.duoMs !== undefined ? `🦥 全天屏幕 <b>${fmt(a.duoMs || 0)}</b> / 8 小时 — 未超标` : '🦥 全天屏幕时长：待读取'}
        <br>🧘 聚神期间切走手机 = 事件流实时抓取 = 自动判破戒
      </div>
    </div>`;
  },
});
