// 05-reminder-safety.js —— 统一提醒调度中心 + 数据安全（备份引导/存储配额）+ 数据保护中心（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G2-生活基础 / G7-云同步账户（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
Object.assign(App, {
  // ===== 统一提醒调度中心：关键药 / 入睡 / 晨起 / 三餐窗口，全部走同一调度器 =====
  // v3.99：取代原单发 setTimeout 式入睡提醒——每分钟 tick 一次，规则化检查 + 当日去重 + 条件实时评估
  // （漏服关键药在器官建模里是重罪，系统必须主动喊用户吃药，补上逻辑闭环）
  _reminderTimer: null,
  startReminderLoop() {
    if (this._reminderTimer) return;
    try { this._reminderLoopTick(); } catch (e) { console.warn('reminder tick failed', e); }
    this._reminderTimer = setInterval(() => {
      try { this._reminderLoopTick(); } catch (e) { console.warn('reminder tick failed', e); }
    }, 60000);
    // 屏幕常亮防睡死（PWA Wake Lock API）
    if ('wakeLock' in navigator) {
      try { navigator.wakeLock.request('screen').then(() => {}).catch(() => {}); } catch (e) {}
    }
  },
  _reminderFiredToday(id) { return Store.getSetting('rem_' + id, '') === Store.today(); },
  _reminderFire(id, icon, title, body) {
    if (this._reminderFiredToday(id)) return;
    Store.setSetting('rem_' + id, Store.today());
    this._flash(`${icon} ${title}`);
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('生命征程 · ' + title, { body }); } catch (e) {}
    }
  },
  _reminderLoopTick() {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const day = (Store.getHabit99().days || {})[Store.today()] || {};
    const medTaken = !!(day.medicine && (day.medicine.ts || (day.medicine.drugs || []).length));
    const hasCritical = (CONFIG.medications || []).some(m => m.critical);
    const mealDone = (k) => !!(day[k] && (day[k].ts || day[k].done));
    // ① 关键药 21:30 预提醒（未服药才提）
    if (hasCritical && mins >= 1290 && mins < 1320 && !medTaken)
      this._reminderFire('med_pre', '💊', '晚间关键药预提醒', '30 分钟后是关键药时间（22:00 前），请提前备好药与温水');
    // ② 关键药超时跟进：22:00 后每 30 分钟一次直到打卡（免疫防线重罪，值得追到底）
    if (hasCritical && mins >= 1320 && mins < 1439 && !medTaken) {
      const step = Math.floor((mins - 1320) / 30);
      this._reminderFire('med_over_' + step, '⚠️', `关键药未服（超时 ${mins - 1320} 分钟）`, '漏服药物对免疫防线是重罪——请立即服药并在【习惯·服药】打卡');
    }
    // ③ 入睡提醒：目标入睡时刻起 30 分钟窗口内提一次
    const target = (CONFIG.sleep && CONFIG.sleep.night && CONFIG.sleep.night.targetSleep) || '23:00';
    const [sh, sm] = target.split(':').map(Number);
    if (mins >= sh * 60 + (sm || 0) && mins < sh * 60 + (sm || 0) + 30)
      this._reminderFire('sleep', '😴', '该准备入睡了', `${target} 前后是免疫黄金修复期（23:00-03:00），请熄灯入睡`);
    // ④ 晨起提醒：07:00 早安卡未打卡（有打卡则静默）
    if (mins >= 420 && mins < 450 && !(day.goodMorning && day.goodMorning.wake))
      this._reminderFire('morning', '🌅', '晨起打卡', '新的一天开始了，去【习惯·早安】记录起床时刻与睡眠质量');
    // ⑤ 三餐窗口关闭前 30 分钟（未打卡才提；与日程锚点同口径：早 09:30 / 午 14:30 / 晚 20:30 关窗）
    const mealWin = [['breakfast', 570, '早餐', '09:30'], ['lunch', 870, '午餐', '14:30'], ['dinner', 1230, '晚餐', '20:30']];
    for (const [k, closeMin, name, closeStr] of mealWin) {
      if (mins >= closeMin - 30 && mins < closeMin && !mealDone(k))
        this._reminderFire('meal_' + k, name === '早餐' ? '🌅' : name === '午餐' ? '🍽️' : '🌙', `${name}窗口即将关闭`, `${closeStr} 后补卡需走补卡中心（要写原因+反省书），趁现在还在窗口内快去【习惯】打卡`);
    }
  },
  // ===== 数据安全：备份引导（>7 天未备份）+ 存储配额预警（≥85%/95%） =====
  checkBackupReminder() {
    try {
      const alert = this._storageAlertDue();
      if (alert) setTimeout(() => this.showStorageAlert(alert.usage), 2600);
      if (alert && alert.level === 'critical') return; // 告急时只谈存储
      const guide = this._backupGuideDue();
      if (guide) setTimeout(() => this.showBackupGuide(guide.days), 2600);
    } catch (e) { console.warn('backup check failed', e); }
  },
  // 返回 {days} 表示应弹备份引导；null 表示不用（判定同步执行，便于测试）
  _backupGuideDue() {
    const days = Store.daysSinceBackup();
    const hasData = Object.keys(Store.getHabit99().days || {}).length >= 3;
    if (days == null && !hasData) return null;
    if (days != null && days < 7) return null;
    if (Store.getSetting('backup_guide_last', '') === Store.today()) return null;
    Store.setSetting('backup_guide_last', Store.today()); // 当日最多弹一次
    return { days };
  },
  // 返回 {level,usage} 表示应弹存储预警；null 表示不用
  _storageAlertDue() {
    const h = Store.storageHealth();
    if (h.level === 'ok') return null;
    if (Store.getSetting('storage_alert_' + h.level, '') === Store.today()) return null;
    Store.setSetting('storage_alert_' + h.level, Store.today());
    return h;
  },
  showBackupGuide(days) {
    const u = Store.storageUsage();
    const daysTxt = (days == null || days > 3650) ? '<b style="color:#b91c1c">从未备份</b>' : `<b style="color:#b45309">${days} 天</b>`;
    this._modal({
      title: '💾 该备份啦',
      body: `<div style="font-size:13.5px;line-height:1.9">
        <div>距上次完整备份已 ${daysTxt}，当前存档 <b>${u.mb} MB</b>（配额占用 <b>${u.pct}%</b>）。</div>
        <div style="font-size:12.5px;color:var(--text-soft,#64748b);margin-top:6px">数据 100% 存在本机 localStorage——换设备、清浏览器缓存、误删站点数据都会<b>全部丢失</b>。导出一份 JSON 存到云盘/U盘，只要 10 秒钟。</div>
      </div>`,
      actions: [
        { label: '⬇️ 一键导出备份', primary: true, onClick: () => this.dataExportDownload() },
        { label: '明天再说' },
      ],
    });
  },
  showStorageAlert(u) {
    const critical = u.pct >= 95;
    this._modal({
      title: critical ? '🚨 存储空间告急' : '⚠️ 存储空间偏满',
      body: `<div style="font-size:13.5px;line-height:1.9">
        <div>localStorage 已用 <b>${u.mb} MB / 5 MB</b>（<b>${u.pct}%</b>）。${critical ? '再增长写入可能失败，数据有丢失风险！' : '建议尽快瘦身。'}</div>
        <div style="font-size:12.5px;color:var(--text-soft,#64748b);margin-top:6px">三步自救：① 导出 JSON 备份保底 → ② 清理旧快照（每周自动快照很占空间）→ ③ 180 天前的打卡明细系统已自动归档压缩，无需手动处理。</div>
      </div>`,
      actions: [
        { label: '⬇️ 先导出备份', primary: true, onClick: () => this.dataExportDownload() },
        { label: '🧹 清理旧快照（保留2份）', onClick: () => {
            const n = Store.trimSnapshots(2);
            this._flash(n > 0 ? `已清理 ${n} 份旧快照，释放存储` : '快照本来就很少，无需清理');
          } },
        { label: '知道了' },
      ],
    });
  },
  // v2026.0906-8 写入失败应急响应（Store.save 三级瘦身后的分级告警，钩子注册见 00-core.js init）
  //   slim：快照已剥离换空间，核心数据已保住 → 轻提示
  //   core：流水日志也裁了，核心数据仍保住 → 强提示 + 引导导出
  //   fatal：本地已无法落盘 → 自动下载内存中最新完整数据（最后一次机会）+ 告警弹窗
  _storeWriteFailAlarm(level, fullData) {
    try {
      if (level === 'fatal') {
        let downloaded = false;
        try {
          const json = JSON.stringify(fullData || Store.load());
          const blob = new Blob([json], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `生命征程-应急导出-${Store.today()}.json`;
          document.body.appendChild(a); a.click(); a.remove();
          downloaded = true;
        } catch (_) {}
        this._modal({
          title: '🚨 本地存储写入失败',
          body: `<div style="font-size:13.5px;line-height:1.9">
            <div>浏览器已 <b>无法写入</b> 本地存储（配额耗尽 / 隐私模式禁写 / 存储被禁用），刚才的操作 <b>不会保存</b>。</div>
            ${downloaded
              ? '<div style="margin-top:6px">已自动下载 <b>应急导出文件</b>（含内存中全部最新数据）——<b>请立即妥善保存</b>，换浏览器或清理空间后从「数据保护中心」导入恢复。</div>'
              : '<div style="margin-top:6px">自动下载被浏览器拦截，请点击下方按钮手动导出（数据此刻仍在内存中，<b>刷新/关闭页面前务必导出</b>）。</div>'}
          </div>`,
          actions: [
            { label: '⬇️ 手动导出备份', primary: true, onClick: () => this.dataExportDownload() },
            { label: '知道了' },
          ],
        });
      } else {
        // slim / core：数据已落盘（降级形态），轻提示引导瘦身导出，不打断操作
        this._flash(level === 'core'
          ? '⚠️ 存储配额告急：已裁剪流水日志保住核心数据，请尽快导出备份并清理'
          : '⚠️ 存储配额告急：已自动剥离旧快照保住数据，请尽快导出备份');
      }
    } catch (e) { console.warn('write-fail alarm failed', e); }
  },
  // ====== 数据保护中心：导出/导入/快照/加密 ======
  render_data_protection() {
    const snaps = Store.listSnapshots();
    let html = `
      <div class="hero">
        <div class="hero-title">🔐 数据保护中心</div>
        <div class="hero-sub">localStorage 一旦清空数据全没，请定期 <b>导出 JSON 备份</b> 并存到云盘</div>
      </div>
      ${this.cloud99Card()} <!-- v12.9.22 云账户卡自同步版面迁入（方案⓪：账号云同步·登录后全自动） -->
      ${(() => {
        const u = Store.storageUsage();
        const days = Store.daysSinceBackup();
        const h99 = Store.getHabit99();
        const liveDays = Object.keys(h99.days || {}).length;
        const archDays = Object.keys(h99.archive || {}).length;
        const snapCnt = (snaps || []).length;
        const pctColor = u.pct >= 95 ? '#dc2626' : u.pct >= 85 ? '#d97706' : 'var(--primary,#2563eb)';
        return `
      <div class="card">
        <div class="card-title"><span class="ico">📊</span>存储空间体检</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
          <b>${u.mb} MB / 5 MB</b><span style="color:${pctColor};font-weight:700">${u.pct}%</span>
        </div>
        <div style="height:10px;border-radius:6px;background:#e2e8f0;overflow:hidden">
          <div style="height:100%;width:${Math.min(100, u.pct)}%;background:${pctColor};border-radius:6px"></div>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--text-soft,#64748b);margin-top:10px">
          <span>打卡明细（近180天）：<b>${liveDays}</b> 天</span>
          <span>归档冷存（180天前）：<b>${archDays}</b> 天</span>
          <span>版本快照：<b>${snapCnt}</b> 份</span>
          <span>上次备份：<b>${days == null ? '从未' : days + ' 天前'}</b></span>
        </div>
        ${u.pct >= 85
          ? `<div class="tip-box" style="margin-top:10px">⚠️ 存储已用 ${u.pct}%，建议先导出备份、再清理旧快照；180 天前的明细系统已自动归档压缩。</div>`
          : `<div class="hint" style="font-size:12px;color:#64748b;margin-top:8px">localStorage 上限 5MB；180 天前的打卡明细会自动归档压缩，快照只保留最近 12 周。建议每周导出一份 JSON 备份。</div>`}
      </div>`;
      })()}
      <div class="card">
        <div class="card-title"><span class="ico">💾</span>方案 ①：导出 / 导入 JSON（推荐 · 最稳）</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn btn-primary" onclick="App.dataExportDownload()">⬇️ 下载 JSON 备份</button>
          <button class="btn btn-ghost" onclick="document.getElementById('dpFile').click()">📂 导入 JSON 文件</button>
          <input id="dpFile" type="file" accept=".json,application/json" style="display:none" onchange="App.dataImportFile(event)">
        </div>
        <div class="hint" style="font-size:12px;color:#64748b">建议每周导出 1 次，命名格式 <code>一人行-备份-2026-09-01.json</code>，存到云盘 / U盘 / 邮件</div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">🔒</span>方案 ②：AES-256-GCM 加密导出（健康数据隐私）</div>
        <div class="field">
          <label>加密密码</label>
          <input id="encPwd" type="password" class="input" placeholder="输入加密密码（请牢记，丢了无法解密）">
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn btn-primary" onclick="App.dataExportEncrypted()">🔒 加密导出 .txt</button>
          <button class="btn btn-ghost" onclick="document.getElementById('encFile').click()">📂 解密导入</button>
          <input id="encFile" type="file" accept=".txt,.enc" style="display:none" onchange="App.dataImportEncrypted(event)">
        </div>
        <div id="enc-msg" style="font-size:13px;color:#475569;min-height:18px"></div>
        <div class="hint" style="font-size:12px;color:#64748b;margin-top:8px">使用 Web Crypto API（PBKDF2 10 万次迭代 + AES-GCM 256），离线本地加密，密码不上传</div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">📷</span>方案 ③：每周版本快照 + 一键回滚</div>
        <div class="hint" style="font-size:12px;color:#64748b;margin-bottom:10px">每周一自动创建一次快照（保留最近 12 周）；可手动创建；回滚前会自动再存一份"还原前快照"</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          <button class="btn btn-primary" onclick="App.snapCreate()">📷 立即创建快照</button>
        </div>
        ${snaps.length === 0 ? '<div class="empty">暂无快照</div>' : snaps.map(s => `
          <div class="snap-row">
            <div class="snap-ico">📷</div>
            <div class="snap-body">
              <div class="snap-name">${this.esc(s.label)}</div>
              <div class="snap-meta">${s.ts ? new Date(s.ts).toLocaleString('zh-CN') : ''} · ${s.weekKey}</div>
            </div>
            <button class="btn btn-ghost" style="font-size:12px;padding:6px 10px" onclick="App.snapRestore('${s.id}')">↩️ 回滚</button>
            <button class="btn btn-danger" style="font-size:12px;padding:6px 10px" onclick="App.snapDel('${s.id}')">🗑</button>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">🎨</span>个性化主题色</div>
        <div class="palette-grid">
          ${(CONFIG.themes || []).map(t => `
            <div class="palette-item ${this._palette === t.id ? 'active' : ''}" onclick="App.setPalette('${t.id}')">
              <div class="palette-swatch" style="background:${t.primary}"></div>
              <div class="palette-name">${t.icon} ${t.name}</div>
            </div>
          `).join('')}
        </div>
        <div class="tip-box" style="margin-top:10px">🎨 切换主题色后整 App 跟随变化；深浅色模式在下方单独切换</div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">${this._theme === 'dark' ? '☀️' : '🌙'}</span>深浅色模式</div>
        <div class="hint" style="font-size:12px;color:#64748b;margin-bottom:10px">当前：<b>${this._theme === 'dark' ? '深色（夜间护眼）' : '浅色（日间清爽）'}</b> · 切换后整 App 跟随并自动记住</div>
        <button class="btn ${this._theme === 'dark' ? 'btn-ghost' : 'btn-primary'}" onclick="App.toggleTheme();App.render_data_protection()">🌗 切换到${this._theme === 'dark' ? '浅色' : '深色'}模式</button>
      </div>
      ${this._wbSystemLogCard()} <!-- v12.9.22 系统运行日志卡自同步版面迁入（近 90 天日历 · 默认折叠） -->
    `;
    document.getElementById('view-sync').innerHTML = html;
  },
  async dataExportDownload() {
    const json = Store.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `一人行-备份-${Store.today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    Store.markBackupDone();
    this._flash('💾 已导出 JSON 备份文件');
  },
  dataImportFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const res = Store.importAll(r.result, 'merge');
      if (res.ok) {
        this._flash('✅ 导入成功，已合并');
        this.navigate(this.currentView);
      } else {
        alert('导入失败：' + res.msg);
      }
    };
    r.readAsText(f);
  },
  async dataExportEncrypted() {
    const pwd = document.getElementById('encPwd').value;
    if (!pwd) { this._flash('请输入加密密码'); return; }
    const r = await Store.encryptExport(pwd);
    const msg = document.getElementById('enc-msg');
    if (!r.ok) { if (msg) msg.textContent = '❌ ' + r.msg; return; }
    const blob = new Blob([r.payload], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `生命征程-加密-${Store.today()}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    if (msg) msg.textContent = '✅ 已加密导出（请牢记密码）';
    Store.markBackupDone();
  },
  dataImportEncrypted(e) {
    const f = e.target.files[0];
    if (!f) return;
    const pwd = prompt('请输入解密密码：');
    if (!pwd) return;
    const r = new FileReader();
    r.onload = async () => {
      const res = await Store.decryptImport(r.result, pwd);
      const msg = document.getElementById('enc-msg');
      if (!res.ok) { if (msg) msg.textContent = '❌ ' + res.msg; return; }
      const ir = Store.importAll(res.json, 'merge');
      if (ir.ok) {
        if (msg) msg.textContent = '✅ 解密并导入成功';
        this._flash('✅ 加密数据已导入');
        this.navigate(this.currentView);
      } else {
        if (msg) msg.textContent = '❌ ' + ir.msg;
      }
    };
    r.readAsText(f);
  },
  snapCreate() {
    Store.createSnapshot('手动快照 · ' + new Date().toLocaleString('zh-CN'));
    this._flash('📷 已创建快照');
    this.render_data_protection();
  },
  snapRestore(id) {
    if (!confirm('确定回滚到该快照？当前数据会先自动存为快照')) return;
    const r = Store.restoreSnapshot(id);
    if (r.ok) {
      this._flash('↩️ 已回滚到：' + r.label);
      this.navigate(this.currentView);
    } else {
      alert(r.msg || '回滚失败');
    }
  },
  snapDel(id) {
    if (!confirm('确定删除该快照？')) return;
    Store.delSnapshot(id);
    this.render_data_protection();
  },
});
