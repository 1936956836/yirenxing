// 87-study99.js —— v12.9.3 【数据中心 · 学习数据】：记录站（知识点/图表/日历）+ 练习站（刷题站 · 90-study99-quiz.js）
// [功能组] G3-学习成长 / G4-数据洞察（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   · 入口：数据中心「学习数据」卡 → 单卡双区斜线导航（记录站 📚 / 练习站 ✏️）——方案 2：一张大卡、中间只留一条斜线
//   · 记录站（三页 Tab）：
//     - 数据页：三 KPI（知识点/已掌握/掌握率）+ 知识树·科目生长（枝干=科目：英语/政治/高数/计算机+专业课，橙叶=已掌握，灰圈=待生长）
//               + 科目筛选 + 知识点列表（点行编辑 · 掌握切换 · 删除）
//     - 图表页：科目分布柱状（橙=已掌握 / 浅橙=待生长）+ 掌握趋势折线（日/周/月/年）+ 最新/较上期/平均三小卡
//     - 日历页：新增掌握 / 新增知识点 × 月份日历（日期下显示数量）+ 当月记录卡
//   · 练习站（v12.9.3 全面重构，题库见 88/89-quiz99）：分题型刷题（英语/政治/高数/计算机 + 按专业生成的专业课）
//     + 阶段/真题/频次/知识点标注 + 错题本 + 当日题量与正确率；本文件仅保留「＋ 补录纸面练习」弹窗（st99PracticeModal）
//   · 数据：Store.getStudy99()（points 知识点 / practices 补录练习）；刷题流水走 Store.quiz99*（storage.js v12.9.3）
//     —— 学习会话（聚神·学习）仍在 sport99.studies，此处不重复建账
// UI 规范：白底 #F7F9FC · 主色 #F97316 活力橙 · 辅助 #FFF7ED · 圆角卡片 · 弱阴影 · 数据优先（空状态不造假）

// ===== 科目体系（专升本方向）：核心四科 + 按档案专业生成的专业课（90-study99-quiz.js 提供 _st99MajorCourses）=====
Object.assign(App, {

  // ==================== 路由与状态 ====================
  _st99Init() {
    if (!this._st99) {
      const now = new Date();
      this._st99 = {
        view: 'home',          // home | record | practice
        page: 'data',          // record: data | chart | calendar
        chartKind: 'subs',     // chart: subs（科目分布）| trend（掌握趋势）
        span: 'day',           // trend: day | week | month | year
        calMetric: 'mastered', // calendar: mastered（新增掌握）| added（新增知识点）
        calY: now.getFullYear(), calM: now.getMonth(),
        sub: '',               // 数据页科目筛选（'' = 全部）
      };
    }
    return this._st99;
  },
  // 科目白名单：英语/政治/高数/计算机 + 专业课课程名（专升本/考研方向，不再是高中六科）
  _st99Subs() {
    const base = ['英语', '政治', '高数', '计算机'];
    const prof = (this._st99MajorCourses ? this._st99MajorCourses() : []).map(c => c.name);
    return base.concat(prof);
  },
  _st99Set(k, v) { if (k === 'view' || k === 'page') this._navPush(); this._st99Init()[k] = v; this.render_workbench(); },
  _wbStudy99(wb, W) {
    const st = this._st99Init();
    if (st.view === 'record') return this._st99Record();
    if (st.view === 'practice') return this._st99PZ(); // v12.9.3 刷题站（90-study99-quiz.js）
    return this._st99Home();
  },

  // ==================== 主页：单卡双区斜线导航（方案 2）====================
  _st99Data() {
    const s = Store.getStudy99();
    const pts = s.points || [];
    const ps = s.practices || [];
    const mastered = pts.filter(x => x.mastered).length;
    const totalQ = ps.reduce((a, x) => a + (+x.total || 0), 0);
    const totalC = ps.reduce((a, x) => a + (+x.correct || 0), 0);
    return { s, pts, ps, mastered, totalQ, totalC };
  },
  _st99Home() {
    const { s, pts, ps, mastered, totalQ, totalC } = this._st99Data();
    const rate = pts.length ? Math.round(mastered / pts.length * 100) : 0;
    const acc = totalQ ? Math.round(totalC / totalQ * 100) : 0;
    const kpi = (n, v, u) => `<div class="st99-kpi"><span class="st99-kpi-n">${n}</span><b>${v}<i>${u}</i></b></div>`;
    const recentP = pts.slice(0, 3);
    const recentQ = ps.slice(0, 3);
    return `<div class="st99-page">
      <div class="card" style="margin-bottom:12px;background:linear-gradient(135deg,#F97316,#EA580C);border:0">
        <div class="card-title" style="color:#fff"><span class="ico">🎓</span>学习数据
          <span class="sub" style="color:rgba(255,255,255,.75);font-size:11px;margin-left:6px">记录站 + 练习站</span>
        </div>
        <div style="font-size:12.5px;color:rgba(255,255,255,.9);line-height:1.7;margin-top:4px">知识点在记录站长成一棵科目知识树（英语/政治/高数/计算机+专业课），题在练习站按题型刷。所有数据由你录入后才开始生长——现在的空白，正是待填的进度条。</div>
        <div class="st99-kpirow" style="margin-top:12px">
          ${kpi('知识点', pts.length ? pts.length + ' 个' : '0', '个')}
          ${kpi('已掌握', mastered ? mastered + ' 个' : '0', '个')}
          ${kpi('掌握率', rate + '', '%')}
          ${kpi('平均正确率', acc + '', '%')}
        </div>
      </div>
      <div class="st99-navwrap">
        <div class="st99-nav a" onclick="App._st99Set('view','record')">
          <span class="st99-nav-ico">📚</span>
          <span class="st99-nav-meta">
            <span class="st99-nav-name">记录站</span>
            <span class="st99-nav-sub">知识点·图表·日历</span>
            <span class="st99-nav-go">进入 ›</span>
          </span>
        </div>
        <div class="st99-nav b" onclick="App._st99Set('view','practice')">
          <span class="st99-nav-ico">✏️</span>
          <span class="st99-nav-meta">
            <span class="st99-nav-name">练习站</span>
            <span class="st99-nav-sub">分题型刷题·真题·错题本</span>
            <span class="st99-nav-go">进入 ›</span>
          </span>
        </div>
        <svg class="st99-nav-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="63" y1="0" x2="41" y2="100" stroke="rgba(255,255,255,.55)" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>
      </div>
      <div class="st99-card" style="margin-top:12px">
        <div class="st99-ct"><span class="st99-ct-ico">🌳</span>最近知识点<span class="st99-ct-more" onclick="App._st99Set('view','record')">记录站 ›</span></div>
        ${recentP.length ? recentP.map(p => `<div class="st99-li"><b>${p.mastered ? '✅' : '⭕'}</b><span style="color:#1F2937;font-weight:600">${this.esc(p.name)}</span><i class="st99-li-sub">${this.esc(p.subject)}</i></div>`).join('')
          : '<div class="st99-empty">还没有知识点——进记录站点右上角「＋」，种下第一颗种子吧</div>'}
      </div>
      <div class="st99-card" style="margin-top:10px">
        <div class="st99-ct"><span class="st99-ct-ico">✏️</span>最近练习（练习站刷题自动累计 · 亦可＋补录纸面）<span class="st99-ct-more" onclick="App._st99Set('view','practice')">练习站 ›</span></div>
        ${recentQ.length ? recentQ.map(q => `<div class="st99-li"><b>${q.date}</b><span style="color:#1F2937;font-weight:600">${this.esc(q.practice)}</span><i class="st99-li-sub">${this.esc(q.subject)} · ${q.correct}/${q.total}</i></div>`).join('')
          : '<div class="st99-empty">暂无练习记录——做完一套题就来练习站记一笔</div>'}
      </div>
      <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>
    </div>`;
  },

  // ==================== 记录站（数据 / 图表 / 日历）====================
  _st99Record() {
    const st = this._st99Init();
    const tab = (p, n) => `<button type="button" class="st99-tab${st.page === p ? ' on' : ''}" onclick="App._st99Set('page','${p}')">${n}</button>`;
    let body = '';
    if (st.page === 'chart') body = this._st99PageChart();
    else if (st.page === 'calendar') body = this._st99PageCalendar();
    else body = this._st99PageData();
    return `<div class="st99-page">
      <div class="st99-topbar">
        <button class="st99-back" onclick="App.navBack()">‹</button>
        <div class="st99-title">记录站</div>
        <button class="st99-editbtn plus" onclick="App.st99PointModal()">＋</button>
      </div>
      ${body}
      <div class="st99-tabbar" style="margin-top:12px">${tab('data', '数据')}${tab('chart', '图表')}${tab('calendar', '日历')}</div>
    </div>`;
  },

  // ---------- 数据页：三 KPI + 知识树·六科生长 + 科目筛选 + 知识点列表 ----------
  _st99PageData() {
    const st = this._st99Init();
    const { pts, mastered } = this._st99Data();
    const rate = pts.length ? Math.round(mastered / pts.length * 100) : 0;
    const kpi = (n, v, u) => `<div class="st99-kpi st99-kpi-lite"><span class="st99-kpi-n">${n}</span><b>${v}<i>${u}</i></b></div>`;
    const chip = (k, n) => `<button type="button" class="st99-chip${st.sub === k ? ' on' : ''}" onclick="App._st99Set('sub','${k}')">${n}</button>`;
    const list = st.sub ? pts.filter(p => p.subject === st.sub) : pts;
    return `
      <div class="st99-kpirow">
        ${kpi('知识点', pts.length + '', '个')}
        ${kpi('已掌握', mastered + '', '个')}
        ${kpi('掌握率', rate + '', '%')}
      </div>
      <div class="st99-card" style="margin-top:12px">
        <div class="st99-ct"><span class="st99-ct-ico">🌳</span>知识树 · 科目生长<span class="st99-ct-more">${pts.length} 个知识点</span></div>
        ${this._st99Tree()}
        ${pts.length ? '' : '<div class="st99-empty" style="margin-top:4px">添加知识点并标记掌握后，树上会慢慢长出橙叶</div>'}
      </div>
      <div class="st99-card" style="margin-top:10px">
        <div class="st99-ct"><span class="st99-ct-ico">📋</span>知识点<span class="st99-ct-more" onclick="App.st99PointModal()">＋ 添加</span></div>
        <div class="st99-chips">${chip('', '全部')}${this._st99Subs().map(x => chip(x, x)).join('')}</div>
        <div style="margin-top:6px">
          ${list.length ? list.map(p => `<div class="st99-pt" onclick="App.st99PointModal('${p.id}')">
            <span class="st99-pt-ic${p.mastered ? ' on' : ''}">${p.mastered ? '✓' : ''}</span>
            <span class="st99-pt-body"><b>${this.esc(p.name)}</b><i>${this.esc(p.subject)} · ${p.mastered ? '已掌握' : '待生长'}</i></span>
            <span class="st99-pt-go">›</span>
          </div>`).join('')
            : `<div class="st99-empty">${st.sub ? '该科目还没有知识点' : '还没有知识点——点上角「＋」添加第一个'}</div>`}
        </div>
      </div>`;
  },

  // 知识树 SVG：枝干=科目（核心四科 + 专业课，4-8 根自适应均布）· 橙叶=已掌握 · 灰圈=待生长（每科最多画 5 叶 + 2 圈，超出以 +N 标注）
  _st99Tree() {
    const { pts } = this._st99Data();
    const subs = this._st99Subs();
    const stat = {};
    subs.forEach(x => stat[x] = { m: 0, t: 0 });
    pts.forEach(p => { if (stat[p.subject]) { stat[p.subject].t++; if (p.mastered) stat[p.subject].m++; } });
    // 枝干端点：树干顶 (170,150) 为中心 · 半径 95 · 角度从 165° 到 15° 均匀分布
    const N = Math.max(subs.length, 1);
    const OX = 170, OY = 150, R = 95;
    const ends = subs.map((name, i) => {
      const deg = N > 1 ? 165 - i * (150 / (N - 1)) : 90;
      const rad = deg * Math.PI / 180;
      return [name, Math.round(OX + R * Math.cos(rad)), Math.round(OY - R * Math.sin(rad))];
    });
    let branches = '', leaves = '', names = '';
    const slots = [[-16, -6], [-8, -14], [0, -18], [8, -14], [16, -6], [22, -12], [24, -2]];
    ends.forEach(([n, ex, ey]) => {
      const cx = (OX + ex) / 2 + (ex - OX) * 0.08, cy = (OY + ey) / 2 - 6;
      branches += `<path d="M${OX},${OY} Q${cx},${cy} ${ex},${ey}" fill="none" stroke="#C2703D" stroke-width="4" stroke-linecap="round"/>`;
      const st = stat[n];
      const leafN = Math.min(st.m, 5);
      const grayN = st.t > st.m ? Math.min(st.t - st.m, 2) : 0;
      for (let i = 0; i < leafN; i++) {
        const dx = slots[i][0], dy = slots[i][1];
        const rot = dx < -4 ? -30 : dx > 4 ? 30 : 0;
        leaves += `<ellipse cx="${ex + dx}" cy="${ey + dy}" rx="5.5" ry="8" transform="rotate(${rot} ${ex + dx} ${ey + dy})" fill="#F97316" stroke="#EA580C" stroke-width="1"/>`;
      }
      for (let i = 0; i < grayN; i++) {
        const dx = slots[5 + i][0], dy = slots[5 + i][1];
        leaves += `<circle cx="${ex + dx}" cy="${ey + dy}" r="4.5" fill="#fff" stroke="#D1D5DB" stroke-width="1.5"/>`;
      }
      if (st.m > 5) leaves += `<text x="${ex + 19}" y="${ey - 4}" font-size="9.5" font-weight="700" fill="#EA580C">+${st.m - 5}</text>`;
      names += `<text x="${ex}" y="${ey + 14}" font-size="10.5" font-weight="700" text-anchor="middle" fill="#4B5563">${n}</text>
        <text x="${ex}" y="${ey + 25}" font-size="9" font-weight="700" text-anchor="middle" fill="${st.m ? '#EA580C' : '#B6BDC9'}">${st.m}/${st.t}</text>`;
    });
    return `<svg viewBox="0 0 340 214" xmlns="http://www.w3.org/2000/svg" style="width:100%;background:#FFFDF9;border-radius:12px" aria-hidden="true">
      <ellipse cx="170" cy="207" rx="54" ry="6" fill="#FFF3E4"/>
      <path d="M170,206 C167,190 173,172 170,152" fill="none" stroke="#B45309" stroke-width="9" stroke-linecap="round"/>
      ${branches}${leaves}${names}
      <text x="170" y="14" font-size="9.5" text-anchor="middle" fill="#94A3B8">🟠 已掌握 · ○ 待生长</text>
    </svg>`;
  },

  // ---------- 图表页 ----------
  _st99PageChart() {
    const st = this._st99Init();
    const kindTab = (k, n) => `<button type="button" class="st99-chip${st.chartKind === k ? ' on' : ''}" onclick="App._st99Set('chartKind','${k}')">${n}</button>`;
    const spanTab = (k, n) => `<button type="button" class="st99-chip${st.span === k ? ' on' : ''}" onclick="App._st99Set('span','${k}')">${n}</button>`;
    return st.chartKind === 'trend'
      ? `<div class="st99-chips">${kindTab('subs', '科目分布')}${kindTab('trend', '掌握趋势')}</div>
         <div class="st99-chips" style="margin-top:8px">${spanTab('day', '日')}${spanTab('week', '周')}${spanTab('month', '月')}${spanTab('year', '年')}</div>
         ${this._st99ChartTrend()}`
      : `<div class="st99-chips">${kindTab('subs', '科目分布')}${kindTab('trend', '掌握趋势')}</div>
         ${this._st99ChartSubs()}`;
  },

  // 科目分布柱状（动态科目：核心四科 + 专业课）：整柱=该科知识点总数 · 下段橙=已掌握 · 上段浅橙=待生长
  _st99ChartSubs() {
    const { pts, mastered } = this._st99Data();
    const subs = this._st99Subs();
    const stat = {};
    subs.forEach(x => stat[x] = { m: 0, t: 0 });
    pts.forEach(p => { if (stat[p.subject]) { stat[p.subject].t++; if (p.mastered) stat[p.subject].m++; } });
    const CW = 340, CH = 175, pad = 28, baseY = CH - pad - 12;
    const maxT = Math.max(1, ...subs.map(x => stat[x].t));
    const colW = (CW - pad * 2 - 14) / subs.length;
    const barW = Math.min(22, Math.max(12, colW * 0.52));
    let bars = '', lbls = '', names = '';
    subs.forEach((n, i) => {
      const x = pad + 7 + i * colW + colW / 2;
      const tH = stat[n].t ? (baseY - 20) * stat[n].t / maxT : 0;
      const mH = stat[n].t ? tH * stat[n].m / stat[n].t : 0;
      if (tH > 0) {
        bars += `<rect x="${(x - barW / 2).toFixed(1)}" y="${(baseY - mH).toFixed(1)}" width="${barW.toFixed(1)}" height="${mH.toFixed(1)}" rx="4" fill="#F97316"/>`;
        if (tH - mH > 1.5) bars += `<rect x="${(x - barW / 2).toFixed(1)}" y="${(baseY - tH).toFixed(1)}" width="${barW.toFixed(1)}" height="${(tH - mH).toFixed(1)}" rx="3" fill="#FDE4CF"/>`;
        lbls += `<text x="${x}" y="${(baseY - tH - 5).toFixed(1)}" font-size="9" font-weight="700" text-anchor="middle" fill="#EA580C">${stat[n].m}</text>`;
      }
      names += `<text x="${x}" y="${CH - 12}" font-size="${subs.length > 6 ? 8 : 9.5}" font-weight="700" text-anchor="middle" fill="#6B7280">${n.length > 4 ? n.slice(0, 4) : n}</text>`;
    });
    const grid = [0, .5, 1].map(r => {
      const y = baseY - r * (baseY - 20);
      const gv = Math.round(maxT * r);
      return `<line x1="${pad}" y1="${y}" x2="${CW - 12}" y2="${y}" stroke="#F3E8DC" stroke-width="1"/><text x="${pad - 4}" y="${y + 3}" font-size="8" text-anchor="end" fill="#94A3B8">${gv}</text>`;
    }).join('');
    return `<div class="st99-card" style="margin-top:10px">
      <div class="st99-ct"><span class="st99-ct-ico">📊</span>科目知识点分布<span class="st99-ct-more">共 ${pts.length} · 已掌握 ${mastered}</span></div>
      <svg viewBox="0 0 ${CW} ${CH}" style="width:100%;background:#FFFDF9;border-radius:12px" aria-hidden="true">${grid}${bars}${lbls}${names}</svg>
      <div style="font-size:11.5px;color:#94A3B8;margin-top:6px;line-height:1.7">柱高=该科知识点总数；橙色段=已掌握，浅橙段=待生长；柱顶数字为已掌握数。</div>
    </div>`;
  },

  // 掌握趋势折线：当期新增掌握知识点数（日=近30天 / 周=近12周 / 月=近12月 / 年=全部）
  _st99ChartTrend() {
    const st = this._st99Init();
    const series = this._st99TrendSeries();
    const spanName = { day: '日', week: '周', month: '月', year: '年' }[st.span];
    const has = series.length > 0;
    const last = has ? series[series.length - 1][1] : 0;
    const prev = has && series.length > 1 ? series[series.length - 2][1] : 0;
    const avg = has ? series.reduce((a, x) => a + x[1], 0) / series.length : 0;
    const diff = has && series.length > 1 ? last - prev : 0;
    const CW = 340, CH = 170, pad = 30;
    let chart = '';
    if (has) {
      const vs = series.map(x => x[1]);
      const mn = Math.min(...vs), mx = Math.max(...vs);
      const yMin = mn - (mx - mn || 1) * 0.15, yMax = mx + (mx - mn || 1) * 0.15;
      const xOf = i => pad + i * (CW - pad * 2) / (series.length - 1 || 1);
      const yOf = v => CH - pad - ((v - yMin) / (yMax - yMin || 1)) * (CH - pad * 2);
      const pts2 = series.map((x, i) => [xOf(i), yOf(x[1])]);
      const path = pts2.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      const grid = [0, .5, 1].map(r => {
        const y = CH - pad - r * (CH - pad * 2);
        const gv = yMin + r * (yMax - yMin);
        return `<line x1="${pad}" y1="${y}" x2="${CW - 10}" y2="${y}" stroke="#F3E8DC" stroke-width="1"/><text x="${pad - 4}" y="${y + 3}" font-size="8" text-anchor="end" fill="#94A3B8">${Math.round(gv * 10) / 10}</text>`;
      }).join('');
      const lblEvery = Math.max(1, Math.ceil(series.length / 6));
      const xl = series.map((x, i) => (i % lblEvery === 0 || i === series.length - 1) ? `<text x="${xOf(i)}" y="${CH - pad + 13}" font-size="8.5" text-anchor="middle" fill="#94A3B8">${x[0]}</text>` : '').join('');
      const area = path + ` L${pts2[pts2.length - 1][0].toFixed(1)},${CH - pad} L${pts2[0][0].toFixed(1)},${CH - pad} Z`;
      chart = `<svg viewBox="0 0 ${CW} ${CH}" style="width:100%;background:#FFFDF9;border-radius:12px" aria-hidden="true">
        <defs><linearGradient id="st99Area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#F97316" stop-opacity=".18"/><stop offset="1" stop-color="#F97316" stop-opacity="0"/>
        </linearGradient></defs>
        ${grid}${xl}
        <path d="${area}" fill="url(#st99Area)"/>
        <path d="${path}" fill="none" stroke="#F97316" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
        ${pts2.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#F97316" stroke="#fff" stroke-width="1.4"/>`).join('')}
      </svg>`;
    } else {
      chart = `<div class="st99-chart-empty"><svg viewBox="0 0 340 170" style="width:100%">
        ${[0, .5, 1].map(r => `<line x1="30" y1="${140 - r * 100}" x2="330" y2="${140 - r * 100}" stroke="#F3E8DC" stroke-width="1"/>`).join('')}
      </svg><span>还没有已掌握的知识点</span></div>`;
    }
    const small = (n, v, u, c) => `<div class="st99-mini"><span>${n}</span><b style="${c ? 'color:' + c : ''}">${v}<i>${u}</i></b></div>`;
    const fmtV = v => has ? (Math.round(v * 10) / 10) : '—';
    return `<div class="st99-card" style="margin-top:10px">
      <div class="st99-ct"><span class="st99-ct-ico">📈</span>掌握趋势（按${spanName} · 个）</div>
      ${chart}
    </div>
    <div class="st99-kpirow" style="margin-top:10px">
      ${small('最新一期', fmtV(last), '个')}
      ${small('较上期', has && series.length > 1 ? (diff > 0 ? '+' + diff : String(diff)) : '—', '个', diff > 0 ? '#EA580C' : diff < 0 ? '#9CA3AF' : '')}
      ${small('平均每期', fmtV(avg), '个')}
    </div>`;
  },
  // 趋势分桶：按 mTs（掌握日）计数
  _st99TrendSeries() {
    const st = this._st99Init();
    const pts = (Store.getStudy99().points || []).filter(p => p.mastered && p.mTs);
    const byDay = {};
    pts.forEach(p => { const dk = String(p.mTs || '').slice(0, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(dk)) byDay[dk] = (byDay[dk] || 0) + 1; });
    const dayKeys = Object.keys(byDay).sort();
    const out = [];
    if (st.span === 'day') {
      dayKeys.slice(-30).forEach(dk => out.push([dk.slice(5).replace('-', '/'), byDay[dk]]));
    } else if (st.span === 'week') {
      const weeks = {};
      dayKeys.forEach(dk => {
        const [y, m, d] = dk.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const wk = Store.fmtDate ? Store.fmtDate(new Date(dt.getTime() - ((dt.getDay() + 6) % 7) * 864e5)) : dk;
        weeks[wk] = (weeks[wk] || 0) + byDay[dk];
      });
      Object.keys(weeks).sort().slice(-12).forEach(wk => out.push([wk.slice(5).replace('-', '/'), weeks[wk]]));
    } else if (st.span === 'month') {
      const months = {};
      dayKeys.forEach(dk => { const mo = dk.slice(0, 7); months[mo] = (months[mo] || 0) + byDay[dk]; });
      Object.keys(months).sort().slice(-12).forEach(mo => out.push([mo.slice(2).replace('-', '/'), months[mo]]));
    } else {
      const years = {};
      dayKeys.forEach(dk => { const y = dk.slice(0, 4); years[y] = (years[y] || 0) + byDay[dk]; });
      Object.keys(years).sort().forEach(y => out.push([y, years[y]]));
    }
    return out;
  },

  // ---------- 日历页 ----------
  _st99PageCalendar() {
    const st = this._st99Init();
    const { pts } = this._st99Data();
    const metricTab = (k, n) => `<button type="button" class="st99-chip${st.calMetric === k ? ' on' : ''}" onclick="App._st99Set('calMetric','${k}')">${n}</button>`;
    const y = st.calY, m = st.calM;
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7; // 周一为第一列
    const days = new Date(y, m + 1, 0).getDate();
    const today = Store.today();
    const sel = this._st99CalSel || monthKey + '-01';
    // 按日计数：mastered=掌握日(mTs) · added=添加日(ts)
    const byDay = {}, namesByDay = {};
    pts.forEach(p => {
      const dk = st.calMetric === 'mastered' ? (p.mastered ? String(p.mTs || '').slice(0, 10) : '') : String(p.ts || '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dk)) {
        byDay[dk] = (byDay[dk] || 0) + 1;
        (namesByDay[dk] = namesByDay[dk] || []).push(p.name);
      }
    });
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="st99-cal-cell"></div>';
    for (let d = 1; d <= days; d++) {
      const dk = `${monthKey}-${String(d).padStart(2, '0')}`;
      const v = byDay[dk] || 0;
      const isSel = sel === dk, isToday = today === dk;
      cells += `<div class="st99-cal-cell${isSel ? ' sel' : ''}${isToday ? ' today' : ''}" onclick="App._st99CalPick('${dk}')">
        <span class="st99-cal-d">${d}</span>
        ${v ? `<span class="st99-cal-v">${v}</span>` : ''}
      </div>`;
    }
    const monthKeys = Object.keys(byDay).filter(dk => dk.startsWith(monthKey)).sort().reverse();
    const W = ['一', '二', '三', '四', '五', '六', '日'];
    return `
      <div class="st99-chips">${metricTab('mastered', '新增掌握')}${metricTab('added', '新增知识点')}</div>
      <div class="st99-card" style="margin-top:10px">
        <div class="st99-cal-head">
          <button class="st99-cal-nav" onclick="App._st99CalMove(-1)">‹</button>
          <div class="st99-cal-month">${y} ${String(m + 1).padStart(2, '0')}</div>
          <button class="st99-cal-nav" onclick="App._st99CalMove(1)">›</button>
        </div>
        <div class="st99-cal-grid">${W.map(w => `<div class="st99-cal-wk">${w}</div>`).join('')}${cells}</div>
      </div>
      <div class="st99-card" style="margin-top:10px">
        <div class="st99-ct"><span class="st99-ct-ico">📋</span>当月${st.calMetric === 'mastered' ? '掌握' : '新增'}记录<span class="st99-ct-more">${monthKeys.length} 天</span></div>
        ${monthKeys.length ? monthKeys.map(dk => `<div class="st99-li">
          <b>${dk.slice(5).replace('-', '/')}</b>
          <span>${byDay[dk]} 个：${namesByDay[dk].slice(0, 3).map(n => this.esc(n)).join('、')}${namesByDay[dk].length > 3 ? '…' : ''}</span>
        </div>`).join('') : '<div class="st99-empty">这个月还没有记录</div>'}
      </div>`;
  },
  _st99CalPick(dk) { this._st99CalSel = dk; this.render_workbench(); },
  _st99CalMove(d) {
    const st = this._st99Init();
    let y = st.calY, m = st.calM + d;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    st.calY = y; st.calM = m;
    this.render_workbench();
  },

  // ---------- 知识点弹窗（新增 / 编辑）----------
  st99PointModal(id) {
    const s = Store.getStudy99();
    const rec = id ? (s.points || []).find(x => x.id === id) : null;
    const subs = this._st99Subs();
    const sel = rec ? rec.subject : (subs.includes(this._st99Init().sub) ? this._st99Init().sub : subs[0]);
    this._st99Sub = sel;
    const body = `
      <div style="font-size:12px;font-weight:800;color:#6B7280;margin:0 0 6px">科目（英语/政治/高数/计算机${subs.length > 4 ? '/专业课' : ''}）</div>
      <div class="st99-chips" id="st99p-cats">${subs.map(x => `<button type="button" class="st99-chip${x === sel ? ' on' : ''}" onclick="App._st99PickSub('${x}',this)">${x}</button>`).join('')}</div>
      <label class="st99-fld wide" style="margin-top:10px"><span>知识点名称</span><input id="st99p-n" type="text" maxlength="40" placeholder="如：二次函数图像与性质" value="${rec ? this.esc(rec.name) : ''}"></label>
      ${rec ? `<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#FFF7ED;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12.5px;color:#9A3412;font-weight:700">当前状态：${rec.mastered ? '✅ 已掌握' : '⭕ 待生长'}</span>
        <button type="button" class="st99-mini-btn" onclick="App.st99TogglePoint('${rec.id}')">${rec.mastered ? '标记待生长' : '标记已掌握'}</button>
      </div>` : ''}
      <div style="font-size:11.5px;color:#94A3B8;margin-top:10px;line-height:1.7">💡 知识点掌握后标记「已掌握」，知识树上会多一片橙叶。</div>`;
    this._modal({
      title: rec ? '编辑知识点' : '＋ 新增知识点',
      body,
      actions: [
        ...(rec ? [{ label: '🗑 删除', onClick: () => { Store.study99DelPoint(rec.id); this._flash('已删除该知识点'); this.render_workbench(); } }] : []),
        { label: '保存', primary: true, onClick: () => this.st99SavePoint(rec ? rec.id : '') },
      ],
    });
  },
  _st99PickSub(k, btn) {
    this._st99Sub = k;
    try { document.querySelectorAll('#st99p-cats .st99-chip').forEach(b => b.classList.remove('on')); btn.classList.add('on'); } catch (e) {}
  },
  st99SavePoint(id) {
    const s = Store.getStudy99();
    const old = id ? (s.points || []).find(x => x.id === id) : null;
    const nEl = document.getElementById('st99p-n');
    const name = nEl ? nEl.value.trim() : '';
    if (!name) { this._flash('请填写知识点名称'); return false; }
    Store.study99SavePoint({
      id: id || '',
      subject: this._st99Sub || '英语',
      name,
      mastered: old ? old.mastered : 0,
      mTs: old ? old.mTs : '',
    });
    this._flash('✅ 知识点已保存——知识树已更新');
    this.render_workbench();
  },
  st99TogglePoint(id) {
    Store.study99TogglePoint(id);
    this._flash('状态已切换');
    this.render_workbench();
  },

  // ==================== 练习站 ====================
  // v12.9.3 全面重构：刷题站 UI 已迁至 90-study99-quiz.js（_st99PZ 系列方法，题库见 88/89-quiz99）。
  // 此处仅保留「＋ 补录纸面练习」弹窗：线下整卷刷完后手动记一笔成绩（走 study99.practices，与练习站自动流水并存互不干扰）。

  // ---------- 补录练习弹窗（新增 / 编辑：编辑=删旧存新）----------
  st99PracticeModal(id) {
    const s = Store.getStudy99();
    const rec = id ? (s.practices || []).find(x => x.id === id) : null;
    const subs = this._st99Subs();
    const sel = rec ? rec.subject : (subs.includes(this._st99Init().sub) ? this._st99Init().sub : subs[0]);
    this._st99Sub = sel;
    const body = `
      <div class="st99-fld-grid">
        <label class="st99-fld wide"><span>日期</span><input id="st99q-date" type="date" value="${rec ? rec.date : Store.today()}" max="${Store.today()}"></label>
        <label class="st99-fld wide"><span>练习名称</span><input id="st99q-n" type="text" maxlength="40" placeholder="如：数学必修一第 2 章题组" value="${rec ? this.esc(rec.practice) : ''}"></label>
      </div>
      <div style="font-size:12px;font-weight:800;color:#6B7280;margin:10px 0 6px">科目</div>
      <div class="st99-chips" id="st99p-cats">${subs.map(x => `<button type="button" class="st99-chip${x === sel ? ' on' : ''}" onclick="App._st99PickSub('${x}',this)">${x}</button>`).join('')}</div>
      <div class="st99-fld-grid" style="margin-top:10px">
        <label class="st99-fld"><span>总题数</span><input id="st99q-total" type="number" inputmode="numeric" min="1" placeholder="如 25" value="${rec ? rec.total : ''}"></label>
        <label class="st99-fld"><span>正确数</span><input id="st99q-correct" type="number" inputmode="numeric" min="0" placeholder="如 21" value="${rec ? rec.correct : ''}"></label>
      </div>
      <label class="st99-fld wide" style="margin-top:8px"><span>备注</span><input id="st99q-note" type="text" maxlength="200" placeholder="如：错题集中在立体几何（选填）" value="${rec ? this.esc(rec.note) : ''}"></label>
      <div style="font-size:11.5px;color:#94A3B8;margin-top:10px;line-height:1.7">💡 正确率 = 正确数 ÷ 总题数，自动参与趋势统计。</div>`;
    this._modal({
      title: rec ? '编辑练习' : '＋ 记一次练习',
      body,
      actions: [
        ...(rec ? [{ label: '🗑 删除', onClick: () => { Store.study99DelPractice(rec.id); this._flash('已删除该条练习'); this.render_workbench(); } }] : []),
        { label: '保存', primary: true, onClick: () => this.st99SavePractice(rec ? rec.id : '') },
      ],
    });
  },
  st99SavePractice(id) {
    const g = k => { const el = document.getElementById('st99q-' + k); return el ? el.value.trim() : ''; };
    const date = g('date'), practice = g('n'), total = parseInt(g('total'), 10), correct = parseInt(g('correct'), 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { this._flash('请选择正确的日期'); return false; }
    if (!practice) { this._flash('请填写练习名称'); return false; }
    if (!isFinite(total) || total < 1) { this._flash('总题数至少为 1'); return false; }
    if (!isFinite(correct) || correct < 0 || correct > total) { this._flash('正确数需在 0 ~ 总题数之间'); return false; }
    if (id) Store.study99DelPractice(id); // 编辑 = 删旧存新（storage 仅支持 unshift 新增）
    Store.study99SavePractice({ date, practice, subject: this._st99Sub || '英语', total, correct, note: g('note') });
    this._flash('✅ 已补录这次练习——学习数据首页已更新');
    this.render_workbench();
  },
});
