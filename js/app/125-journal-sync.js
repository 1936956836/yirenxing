// 125-journal-sync.js —— 经济数据辅助 / 日记心情 / 系统日志 / 金币流水 / 多设备同步中心（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G4-数据洞察 / G7-云同步账户（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// v12.7：更新公告卡与版本历史库（含归档公告数据）已按用户要求整体删除——
//       更新公告唯一入口 = 用户与阿福聊天时阿福自动推送最新版本（见 68-focus-notes.js afuChatOpen）
Object.assign(App, {
  // ====== 经济数据（原记账）======
  // v2026.0906：旧「完整账本」视图（render_ledger/renderSpendingChart/toggleLedgerViol/addLedger/delLedgerItem）
  // 已整体删除——经济数据统一走【数据中心 → 经济数据】（_wbLedger），消费建议卡（renderFinanceArticle）已迁入该页。
  _curCat: 'meal', _curViolation: false,
  setLedgerCat(id) {
    this._curCat = id;
    // 违规分类自动开启违规标记
    const violationCats = new Set(['game', 'lottery', 'adult']);
    if (violationCats.has(id)) this._curViolation = true;
    this.render_workbench();
  },
  // ====== 日记心情 ======
  // v2026.0906：旧「完整日记」视图（render_diary）已删除——日记统一走记录板块·日记（_wbDiary），
  // 其特有功能（编辑/删除/附图/心情热力图/心理卡片/历史日记）已并入 _wbDiary；以下函数为两页通用逻辑。
  _diaryEditing: null,
  // ====== 系统运行日志（每日方格存储）======
  _logsSelectedDate: null,
  // v2026.0906：render_todo / render_outfit 旧视图包装已删除（无任何 navigate 调用方）——
  // 待办/穿搭统一走板块子页（gotoWb('todo') / gotoWb('outfit')），旧书签 navigate 安全重定向见 15-utils.js。
  // ====== v3.0 日志板块拆分：原「日志」tab 已取消 ======
  // 金币/钻石流水卡（_entCurrencyLogsCard/_flattenLogs/setLogsFilter）已按用户指令删除——
  // 娱乐台 v7.0 迁往「生命征程·虚拟」后此卡无任何调用方（死代码），金币余额展示走首页/档案
  // 更新公告 → 阿福聊天推送（v12.7 唯一入口）；系统运行日志(90天日历) → 设置页(_wbSystemLogCard)
  // （v12.6：开发者日志卡已按用户要求删除——AI 接班手册只存在于 AI 会话上下文，不再内嵌 App）
  // ====== 设置页 · 系统运行日志（近 90 天日历 + 明细，默认折叠）======
  _wbSystemLogCard() {
    const dates = Store.getSystemLogDates();
    const todayStr = Store.today();
    if (!this._logsSelectedDate) this._logsSelectedDate = todayStr;
    const sel = this._logsSelectedDate;
    const logs = Store.getSystemLogs(sel);
    const data = Store.load();
    const sl = (data.systemLogs && typeof data.systemLogs === 'object' && !Array.isArray(data.systemLogs)) ? data.systemLogs : {};
    const allDates = Object.keys(sl);
    let totalActions = 0;
    allDates.forEach(d => { const arr = sl[d] || []; if (Array.isArray(arr)) totalActions += arr.length; });
    // 近 90 天日历方格
    const cells = [];
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const start = new Date(today0);
    start.setDate(start.getDate() - 89);
    let curMonth = -1;
    const monthCells = [];
    let buf = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = Store.fmtDate(d);
      const cnt = (sl[key] || []).length;
      const isToday = key === todayStr;
      const isActive = key === sel;
      buf.push({ key, day: d.getDate(), cnt, isToday, isActive });
      if (d.getMonth() !== curMonth) {
        if (buf.length) monthCells.push({ month: curMonth, cells: buf });
        curMonth = d.getMonth();
        buf = [];
        buf.push({ key, day: d.getDate(), cnt, isToday, isActive });
      }
    }
    if (buf.length) monthCells.push({ month: curMonth, cells: buf });
    const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const gridHtml = monthCells.map(m => `
      <div>
        <div class="logs-month-label">${m.cells[0] ? monthNames[new Date(m.cells[0].key).getMonth()] : ''}</div>
        <div style="display:grid;grid-template-columns:repeat(15,1fr);gap:4px">
          ${m.cells.map(c => `
            <div class="logs-cell ${c.cnt > 0 ? 'has' : ''} ${c.isToday ? 'today' : ''} ${c.isActive ? 'active' : ''}"
                 onclick="App.selectLogDate('${c.key}')" title="${c.key} · ${c.cnt} 条">
              <span class="logs-cell-num">${c.day}</span>
              ${c.cnt > 0 ? `<span class="logs-cell-cnt">${c.cnt}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
    let listHtml = '';
    if (!logs.length) {
      listHtml = '<div class="logs-empty">📋 该日无系统日志记录</div>';
    } else {
      listHtml = `<div class="logs-list">` + logs.map(l => {
        const ts = l.ts ? new Date(l.ts).toLocaleTimeString('zh-CN', { hour12: false }) : '--';
        return `<div class="logs-item">
          <span class="logs-item-ts">${ts}</span>
          <span class="logs-item-act">${this.esc(l.action || '操作')}</span>
          <span>${this.esc(l.detail || '')}</span>
        </div>`;
      }).join('') + `</div>`;
    }
    return `<div class="card">
      <details style="width:100%">
        <summary style="cursor:pointer;list-style:none;outline:none;user-select:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="ico">📋</span>
          <span style="font-weight:900;font-size:15px;color:#0f172a">管家阿福 · 系统运行日志（近 90 天）</span>
          <span class="chip chip-gray">累计 ${allDates.length} 天 · ${totalActions} 次操作</span>
          <span style="font-size:11px;color:#94a3b8;font-weight:600;margin-left:auto">已折叠 · 点开展开</span>
        </summary>
        <div style="margin-top:10px">
          <div class="logs-stats">
            <div class="logs-stat"><div class="logs-stat-n">${allDates.length}</div><div class="logs-stat-l">有日志的天数</div></div>
            <div class="logs-stat"><div class="logs-stat-n">${totalActions}</div><div class="logs-stat-l">累计操作次数</div></div>
            <div class="logs-stat"><div class="logs-stat-n">${logs.length}</div><div class="logs-stat-l">${sel} 条数</div></div>
          </div>
          <div class="logs-grid" style="display:block;margin-top:10px">${gridHtml}</div>
          <div style="margin-top:10px;border-top:1px dashed var(--border);padding-top:8px">
            <div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:6px">📜 ${sel} 日志明细 ${sel === todayStr ? '· 今日' : ''}</div>
            ${listHtml}
          </div>
        </div>
      </details>
    </div>`;
  },
  selectLogDate(date) {
    this._logsSelectedDate = date;
    // v3.0：系统日志日历已迁入同步页
    if (this.currentView === 'workbench') this.render_workbench();
  },
  // （copyDevLog 已随开发者日志卡删除：v12.6 用户拍板退役）
  // 35 天心情热力图：用色彩表现情绪，未记录心情时按当日打卡完成度推断
  renderMoodHeatmap() {
    const diaries = Store.getDiaries();
    const data = Store.load();
    const today = new Date();
    const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = [];
    let monthAvg = 0, monthCnt = 0;
    for (let i = 34; i >= 0; i--) {
      const dd = new Date(today0);
      dd.setDate(dd.getDate() - i);
      const ds = Store.fmtDate(dd);
      const entry = diaries.find(d => d.date === ds);
      let mood = entry && entry.mood ? entry.mood : 0;
      let inferred = false;
      if (!mood) {
        const rec = data.records[ds];
        if (rec) {
          const p = this.dayCompletionPct(rec);
          if (p > 0) {
            mood = p >= 80 ? 5 : p >= 60 ? 4 : p >= 40 ? 3 : p >= 20 ? 2 : 1;
            inferred = mood > 0;
          }
        }
      }
      if (mood > 0) { monthAvg += mood; monthCnt++; }
      days.push({ date: ds, mood, inferred });
    }
    const monthAvgMood = monthCnt ? (monthAvg / monthCnt) : 0;
    const avgLabel = monthCnt ? ['','糟糕','低落','一般','愉快','愉悦'][Math.round(monthAvgMood)] : '无数据';
    const colorOf = m => m === 0 ? '#e5e7eb' : m === 1 ? '#ef4444' : m === 2 ? '#f97316' : m === 3 ? '#eab308' : m === 4 ? '#84cc16' : '#22c55e';
    const emoOf = m => m === 0 ? '' : ['😢','😕','😐','🙂','😄'][m - 1];
    const labelOf = m => m === 0 ? '无记录' : ['糟糕','低落','一般','愉快','愉悦'][m - 1];
    const cells = days.map(d => `<div class="mood-cell" style="background:${colorOf(d.mood)}" title="${d.date} · ${labelOf(d.mood)}${d.inferred ? '（由完成度推断）' : ''}">${emoOf(d.mood)}</div>`).join('');
    const legend = [
      { c: '#ef4444', t: '糟糕' }, { c: '#f97316', t: '低落' }, { c: '#eab308', t: '一般' },
      { c: '#84cc16', t: '愉快' }, { c: '#22c55e', t: '愉悦' }, { c: '#e5e7eb', t: '无' },
    ];
    return `
      <div class="card mood-hm-card">
        <div class="card-title"><span class="ico">🌈</span>35 天心情热力图 <span class="sub">近5周 · 月均${monthCnt ? monthAvgMood.toFixed(1) + '分(' + avgLabel + ')' : '无数据'}</span></div>
        <div class="mood-hm-legend">
          ${legend.map(l => `<span class="mood-hm-lg"><i style="background:${l.c}"></i>${l.t}</span>`).join('')}
        </div>
        <div class="mood-hm-grid">${cells}</div>
        <div class="mood-hm-tip">💡 若未记录心情，系统根据当日打卡完成度自动推断情绪色彩（80%↑愉悦 · 60%↑愉快 · 40%↑一般 · 20%↑低落 · 余糟糕）</div>
      </div>
    `;
  },
  _diaryMood: 0,
  _diaryTags: [],
  setDiaryMood(v) {
    this._diaryMood = v;
    for (let i = 1; i <= 5; i++) {
      const b = document.getElementById('dyMood' + i);
      if (b) b.classList.toggle('active', v === i);
    }
  },
  toggleDiaryTag(t) {
    if (!this._diaryEditing) {
      // 新建：使用全局数组
      if (!this._diaryTags) this._diaryTags = [];
      const idx = this._diaryTags.indexOf(t);
      if (idx >= 0) this._diaryTags.splice(idx, 1); else this._diaryTags.push(t);
      document.querySelectorAll('.tag-chip[data-tag]').forEach(el => {
        el.classList.toggle('active', this._diaryTags.includes(el.dataset.tag));
      });
    } else {
      // 编辑：直接更新再重绘
      const d = Store.getDiaries().find(x => x.id === this._diaryEditing);
      if (!d) return;
      d.tags = d.tags || [];
      const idx = d.tags.indexOf(t);
      if (idx >= 0) d.tags.splice(idx, 1); else d.tags.push(t);
      Store.updateDiary(d.id, { tags: d.tags });
      this.render_workbench();
    }
  },
  saveDiary() {
    const title = document.getElementById('dyTitle').value.trim();
    const content = document.getElementById('dyContent').value.trim();
    const date = document.getElementById('dyDate').value;
    if (!content && !title && !(this._diaryImages && this._diaryImages.length)) return alert('请填写标题、正文或附图');
    const mood = this._diaryMood || (document.querySelector('.mood-btn.active') ? parseInt(document.querySelector('.mood-btn.active').id.replace('dyMood', '')) : 0);
    const tags = this._diaryEditing ? (Store.getDiaries().find(x => x.id === this._diaryEditing)?.tags || []) : (this._diaryTags || []);
    // 合并已有图片与新选图
    let images = (this._diaryImages || []).slice(0, 3);
    if (this._diaryEditing) {
      const old = Store.getDiaries().find(x => x.id === this._diaryEditing);
      const oldImgs = (old && old.images) ? old.images.filter((_, i) => !(this._removedDiaryImgs || []).includes(i)) : [];
      images = oldImgs.concat(images).slice(0, 3);
    }
    if (this._diaryEditing) {
      Store.updateDiary(this._diaryEditing, { date, title, content, tags, mood, images });
      this._flash('✅ 日记修改已保存');
      this._diaryEditing = null;
    } else {
      Store.addDiary({ date, title, content, tags, mood, images });
      this._flash('✅ 日记已保存');
    }
    this._diaryMood = 0;
    this._diaryTags = [];
    this._diaryImages = [];
    this._removedDiaryImgs = [];
    this.render_workbench();
  },
  // 图片选择预览（FileReader base64）
  _diaryImages: [],
  _removedDiaryImgs: [],
  previewDiaryImages() {
    const input = document.getElementById('dyImages');
    if (!input || !input.files || !input.files.length) return;
    const files = Array.from(input.files).slice(0, 3);
    this._diaryImages = [];
    let processed = 0;
    const box = document.getElementById('dyImagesPreview');
    if (box) box.innerHTML = '⏳ 处理中...';
    files.forEach((f, idx) => {
      if (!f.type.startsWith('image/')) { processed++; return; }
      if (f.size > 500 * 1024) { alert(`${f.name} 超过 500KB，已跳过`); processed++; return; }
      const reader = new FileReader();
      reader.onload = e => {
        this._diaryImages.push(e.target.result);
        processed++;
        if (processed >= files.length) this._renderDiaryImgPreview();
      };
      reader.onerror = () => { processed++; if (processed >= files.length) this._renderDiaryImgPreview(); };
      reader.readAsDataURL(f);
    });
    if (processed >= files.length) this._renderDiaryImgPreview();
    input.value = '';
  },
  _renderDiaryImgPreview() {
    const box = document.getElementById('dyImagesPreview');
    if (!box) return;
    if (!this._diaryImages.length) { box.innerHTML = ''; return; }
    // v12.9.40 下载悬浮键修复：附图缩略图改背景图渲染（<img> 会触发手机浏览器原生「下载图片」悬浮键）
    box.innerHTML = this._diaryImages.map((src, i) => `<div class="diary-img-thumb" role="img" style="background-image:url('${src.replace(/'/g, "\\'")}');background-size:cover;background-position:center"><button onclick="App.removeDiaryNewImg(${i})">×</button></div>`).join('');
  },
  removeDiaryNewImg(i) {
    this._diaryImages.splice(i, 1);
    this._renderDiaryImgPreview();
  },
  removeDiaryImg(i) {
    this._removedDiaryImgs = this._removedDiaryImgs || [];
    if (!this._removedDiaryImgs.includes(i)) this._removedDiaryImgs.push(i);
    // 重新渲染编辑表单（v2026.0906：日记页已并入记录板块，重绘走 render_workbench）
    this.render_workbench();
  },
  openImage(src) {
    if (window.open) {
      const w = window.open('', '_blank');
      if (w) { w.document.write(`<title>图片预览</title><img src="${src}" style="max-width:100%;height:auto">`); w.document.close(); }
    }
  },
  editDiary(id) {
    this._diaryEditing = id;
    const d = Store.getDiaries().find(x => x.id === id);
    if (d) this._diaryMood = d.mood || 0;
    this.render_workbench();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  cancelEditDiary() {
    this._diaryEditing = null;
    this._diaryMood = 0;
    this._diaryTags = [];
    this.render_workbench();
  },
  deleteDiary(id) {
    if (!confirm('确认删除这篇日记？此操作不可恢复')) return;
    Store.delDiary(id);
    if (this._diaryEditing === id) this._diaryEditing = null;
    this.render_workbench();
  },
  // v12.9.22 同步版面已整体删除（登录后云同步全自动：启动恢复 + 落盘节流上传 + 踢下线锁屏）：
  //   · render_sync 版面 / syncSaveLocal / syncCreateBin / syncPush / syncPull / _syncFlash 已删
  //   · 账号云同步卡（cloud99Card）与系统日志卡（_wbSystemLogCard）迁至【设置页】render_data_protection
  //   · jsonbin 自填 Key 方案（Store.cloudPush/cloudPull/cloudCreateBin + CONFIG.sync）随 v7.0 前遗留一并清除
  //   · 旧入口 navigate('sync') 由 15-utils.js 安全重定向到设置页
});

