// 86-sport99.js —— v12.9 【数据中心 · 运动数据】：分析站（数据/图表/日历）+ 教学站（动作库 · 动画演示）
// [功能组] G4-数据洞察（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   · 入口：数据中心新增「运动数据」卡 → 本页两张斜线切割导航卡（分析站 / 教学站）
//   · 分析站：三张 KPI（当前体重/目标体重/体脂率）+ 人体围度剪影（11 个蓝色标记点）+ 底部胶囊 Tab（数据/图表/日历）
//     —— 体测数据全部来自用户在「编辑」弹窗的录入；新用户显示 0.0 / 暂无数据（空状态不造假）
//   · 图表页：体重/体脂/围度 × 日/周/月/年 折线图 + 最新/较上次/平均三小卡 + 开始/结束日期筛选
//   · 日历页：体重/体脂 × 月份日历（日期下显示数值）+ 当月记录卡
//   · 教学站：搜索 + 自定义动作 + 横向分类标签 + 两列动作卡（示意图/名称/浅蓝胶囊标签）
//     —— 点卡片进详情：纯 CSS 关键帧驱动的 SVG 火柴人动画演示 + 动作要点
//   · 聚神 · 运动/学习（80-mode99.js 的选择弹窗调用本文件）：
//     运动进行页（活力蓝 · 环形计时/目标进度/2×2 数据卡/暂停/结束 + 力量模式组间休息与下一组）
//     学习进行页（活力橙 · 同构设计 · 科目/今日累计/次数/连续天数）
//     结束确认后写入 sport99.workouts / sport99.studies（storage.js v12.9 存取口）
// UI 规范：白底 #F7F9FC · 主色 #2F6BFF · 辅助 #EAF1FF · 圆角卡片 · 弱阴影 · 细线线性 icon · 数据优先

// ===== 分类（教学站横向标签）=====
const SP99_CATS = [
  { k: 'upper',    n: '上身' }, { k: 'lchest', n: '中下胸' }, { k: 'shoulder', n: '肩' },
  { k: 'serra',    n: '前锯肌' }, { k: 'trap',   n: '斜方肌' }, { k: 'biceps',  n: '肱二头' },
  { k: 'triceps',  n: '三头' }, { k: 'calf',    n: '小腿' }, { k: 'neck',    n: '颈' },
  { k: 'func',     n: '功能性' },
];

// ===== 动作库（fig = 示意图类型；tags 浅蓝胶囊；tips 动作要点）=====
const SP99_EX = [
  { id: 'bb-bench',    n: '杠铃卧推',     cat: 'upper',    fig: 'bench',    tags: ['胸', '杠铃'], tips: ['肩胛后缩下沉，背部贴紧凳面', '杠铃落点在乳头线附近，小臂垂直地面', '双脚踩实地面，臀部不离凳'] },
  { id: 'bb-close',    n: '窄距杠铃卧推', cat: 'upper',    fig: 'bench',    tags: ['三头', '杠铃'], tips: ['握距与肩同宽或更窄', '肘部贴近躯干下放', '顶端主动收缩三头'] },
  { id: 'bb-incline',  n: '上斜杠铃卧推', cat: 'upper',    fig: 'incline',  tags: ['上胸', '杠铃'], tips: ['凳面调至 30°–45°', '杠铃落点在锁骨下方', '避免过度弓腰借力'] },
  { id: 'bb-decline',  n: '下斜杠铃卧推', cat: 'upper',    fig: 'decline',  tags: ['下胸', '杠铃'], tips: ['双脚固定于下斜凳尾端', '杠铃落点在胸骨下缘', '下放速度放慢，控制离心'] },
  { id: 'db-bench',    n: '哑铃卧推',     cat: 'upper',    fig: 'dbbench',  tags: ['胸', '哑铃'], tips: ['哑铃沿弧线下放至胸两侧', '顶端不完全锁死，保持胸肌张力', '手腕保持中立位'] },
  { id: 'db-fly',      n: '哑铃飞鸟',     cat: 'upper',    fig: 'dbfly',    tags: ['胸', '哑铃'], tips: ['肘部微屈固定角度', '沿弧线开合，想象环抱树干', '下放至胸口有牵拉感即回'] },
  { id: 'pushup',      n: '俯卧撑',       cat: 'upper',    fig: 'pushup',   tags: ['胸', '自重'], tips: ['从头到脚呈一条直线', '核心收紧，臀部不塌不翘', '下放至胸口离地一拳'] },
  { id: 'dip',         n: '双杠臂屈伸',   cat: 'upper',    fig: 'dip',      tags: ['下胸', '三头'], tips: ['身体前倾侧重下胸，直立侧重三头', '下降至大臂平行地面即可', '肩膀下沉远离耳朵'] },
  { id: 'db-incline',  n: '上斜哑铃卧推', cat: 'lchest',   fig: 'incline',  tags: ['上胸', '哑铃'], tips: ['凳面 30° 左右刺激上胸最佳', '哑铃顶端轻微内旋靠拢', '控制离心 2–3 秒'] },
  { id: 'db-decline',  n: '下斜哑铃卧推', cat: 'lchest',   fig: 'decline',  tags: ['下胸', '哑铃'], tips: ['下斜角度不超过 20°', '专注下胸外侧沿收缩', '安全起见用轻重量找感觉'] },
  { id: 'cable-fly',   n: '绳索夹胸',     cat: 'lchest',   fig: 'dbfly',    tags: ['下胸', '绳索'], tips: ['滑轮略高于肩，向前下夹', '顶端双手靠近时停顿 1 秒', '全程保持胸肌发力，手臂只做传导'] },
  { id: 'db-ohp',      n: '哑铃肩推',     cat: 'shoulder', fig: 'ohp',      tags: ['三角肌', '哑铃'], tips: ['坐姿背部贴稳靠背', '哑铃下放至耳侧高度', '顶端不锁肘，肩部持续张力'] },
  { id: 'lat-raise',   n: '侧平举',       cat: 'shoulder', fig: 'lateral',  tags: ['中束', '哑铃'], tips: ['肘部微屈，用肘带动抬起', '抬至与肩同高即可', '下放时放慢，不自由落体'] },
  { id: 'front-raise', n: '前平举',       cat: 'shoulder', fig: 'front',    tags: ['前束', '哑铃'], tips: ['大拇指朝上握哑铃', '抬至与地面平行', '避免耸肩借力'] },
  { id: 'rear-fly',    n: '俯身飞鸟',     cat: 'shoulder', fig: 'rear',     tags: ['后束', '哑铃'], tips: ['俯身 45° 以上，背部平直', '向两侧后方打开，想象展翅', '轻重量高次数更适合后束'] },
  { id: 'pullover',    n: '仰卧哑铃上拉', cat: 'serra',    fig: 'pullover', tags: ['前锯肌', '哑铃'], tips: ['仰卧凳上，双手托哑铃一端', '沿弧线向头顶后方下放', '拉回时感受肋间与前锯肌收缩'] },
  { id: 'rollout',     n: '健腹轮',       cat: 'serra',    fig: 'rollout',  tags: ['核心', '轮式'], tips: ['跪姿开始，核心全程收紧', '向前滚动到能控制的极限', '回拉时呼气，腰椎不塌陷'] },
  { id: 'bear',        n: '熊式支撑',     cat: 'serra',    fig: 'plank',    tags: ['前锯肌', '自重'], tips: ['四点支撑，膝盖离地一拳', '肩胛主动前伸推离地面', '自然呼吸，坚持 20–40 秒'] },
  { id: 'bb-shrug',    n: '杠铃耸肩',     cat: 'trap',     fig: 'shrug',    tags: ['斜方肌', '杠铃'], tips: ['双肩垂直向上耸向耳朵', '顶端停顿 1 秒再下放', '不转肩圈，保护肩关节'] },
  { id: 'db-shrug',    n: '哑铃耸肩',     cat: 'trap',     fig: 'shrug',    tags: ['斜方肌', '哑铃'], tips: ['哑铃贴大腿两侧', '耸肩时头保持中立', '下放时斜方肌充分拉长'] },
  { id: 'upright-row', n: '直立划船',     cat: 'trap',     fig: 'upright',  tags: ['斜方肌', '杠铃'], tips: ['握距与肩同宽偏窄', '沿身体前侧上拉至胸口高度', '肘部始终高于手腕'] },
  { id: 'bb-curl',     n: '杠铃弯举',     cat: 'biceps',    fig: 'curl',     tags: ['肱二头', '杠铃'], tips: ['肘部固定在身体两侧', '举至前臂贴近二头即停', '下放 2–3 秒控制离心'] },
  { id: 'db-curl',     n: '哑铃交替弯举', cat: 'biceps',    fig: 'curl',     tags: ['肱二头', '哑铃'], tips: ['掌心向上旋至顶点', '两侧交替，节奏稳定', '身体不前后摇摆借力'] },
  { id: 'hammer',      n: '锤式弯举',     cat: 'biceps',    fig: 'curl',     tags: ['肱肌', '哑铃'], tips: ['掌心相对握哑铃', '沿身体两侧直上直下', '同时强化前臂与肱肌'] },
  { id: 'pushdown',    n: '绳索下压',     cat: 'triceps',  fig: 'pushdown', tags: ['三头', '绳索'], tips: ['大臂夹紧身体两侧', '下压到底端充分伸直', '回放只到 90° 保持张力'] },
  { id: 'close-pushup',n: '窄距俯卧撑',   cat: 'triceps',  fig: 'pushup',   tags: ['三头', '自重'], tips: ['双手置于胸口正下方', '肘部贴身后向下', '身体保持一条直线'] },
  { id: 'db-ext',      n: '哑铃颈后臂屈伸', cat: 'triceps', fig: 'ovext',  tags: ['三头', '哑铃'], tips: ['双手托哑铃举过头顶', '沿颈后下放至耳侧', '肘尖朝前，只动小臂'] },
  { id: 'calf-std',    n: '站姿提踵',     cat: 'calf',     fig: 'calf',     tags: ['小腿', '自重'], tips: ['前脚掌踩实，脚跟悬空', '踮至最高点停 1 秒', '下放时脚跟低于脚掌充分拉伸'] },
  { id: 'calf-sit',    n: '坐姿提踵',     cat: 'calf',     fig: 'calf',     tags: ['比目鱼肌', '器械'], tips: ['坐姿，膝盖放重物（杠铃片）', '比目鱼肌慢肌占比高，适合慢速多次', '每组 15–20 次'] },
  { id: 'calf-donkey', n: '骡式提踵',     cat: 'calf',     fig: 'calf',     tags: ['小腿', '俯身'], tips: ['俯身扶凳，髋部固定', '踮起幅度尽可能大', '俯身位小腿拉伸更充分'] },
  { id: 'neck-flex',   n: '颈部前屈抗阻', cat: 'neck',     fig: 'neck',     tags: ['颈前', '抗阻'], tips: ['手掌抵额缓慢对抗', '颈部发力而非推手', '每次保持 5–10 秒'] },
  { id: 'neck-ext',    n: '颈部后伸抗阻', cat: 'neck',     fig: 'neck',     tags: ['颈后', '抗阻'], tips: ['双手托枕部向后对抗', '动作缓慢，幅度小', '改善体态，缓解颈前伸'] },
  { id: 'neck-side',   n: '颈部侧屈抗阻', cat: 'neck',     fig: 'neck',     tags: ['颈侧', '抗阻'], tips: ['手掌抵同侧太阳穴', '头颈同时发力保持稳定', '左右各保持 5–10 秒'] },
  { id: 'burpee',      n: '波比跳',       cat: 'func',     fig: 'burpee',   tags: ['全身', '自重'], tips: ['下蹲—后跳—俯卧撑—收腿—纵跳', '落地屈膝缓冲', '按体能控制节奏，宁慢勿断'] },
  { id: 'jump-jack',   n: '开合跳',       cat: 'func',     fig: 'jack',     tags: ['热身', '有氧'], tips: ['跳起分腿、双臂头顶击掌', '脚尖先落地，保持弹性', '持续 30–60 秒为一组'] },
  { id: 'plank',       n: '平板支撑',     cat: 'func',     fig: 'plank',    tags: ['核心', '自重'], tips: ['肘部位于肩部正下方', '腹部臀部收紧，身体成直线', '自然呼吸，不憋气'] },
  { id: 'mountain',    n: '登山跑',       cat: 'func',     fig: 'plank',    tags: ['核心', '有氧'], tips: ['俯撑姿势，交替提膝向胸口', '髋部保持稳定不上下晃', '速度由慢到快'] },
];

// 围度字段（分析站剪影标记点 + 图表/编辑表单共用）
const SP99_GIRTHS = [
  ['neck', '脖围'], ['shoulder', '肩宽'], ['chest', '胸围'], ['lArm', '左臂'], ['rArm', '右臂'],
  ['waist', '腰围'], ['hip', '臀围'], ['lThigh', '左腿'], ['rThigh', '右腿'], ['lCalf', '左小腿'], ['rCalf', '右小腿'],
];

Object.assign(App, {

  // ==================== 路由与状态 ====================
  _sp99Init() {
    if (!this._sp99) {
      const now = new Date();
      this._sp99 = {
        view: 'home',        // home | analysis | teach
        page: 'data',        // analysis: data | chart | calendar
        metric: 'weight',    // chart: weight | fat | girth
        girth: 'chest',      // chart 围度部位
        span: 'day',         // day | week | month | year
        rangeStart: '', rangeEnd: '',
        calMetric: 'weight', // calendar: weight | fat
        calY: now.getFullYear(), calM: now.getMonth(),
        teachCat: 'upper', teachQ: '',
      };
    }
    return this._sp99;
  },
  _sp99Set(k, v) { if (k === 'view') this._navPush(); this._sp99Init()[k] = v; this.render_workbench(); },
  _wbSport99(wb, W) {
    const st = this._sp99Init();
    if (st.view === 'analysis') return this._sp99Analysis();
    if (st.view === 'teach') return this._sp99Teach();
    return this._sp99Home();
  },

  // ==================== 主页：斜切双导航卡 ====================
  _sp99Data() {
    const s = Store.getSport99();
    const p = Store.getProfile() || {};
    const latest = (s.measures || [])[0] || null;
    const wkStart = this._sp99WeekStartDk();
    const wkW = (s.workouts || []).filter(x => x.date >= wkStart);
    const wkS = (s.studies || []).filter(x => x.date >= wkStart);
    return {
      s, latest,
      curW: latest ? latest.weight : (p.weight || 0),
      curFat: latest ? latest.fat : 0,
      targetW: (s.settings || {}).targetWeight || 0,
      wkW, wkS,
    };
  },
  _sp99WeekStartDk() {
    const d = Store.beijingDate();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // 本周一
    return Store.fmtDate ? Store.fmtDate(d) : d.toISOString().slice(0, 10);
  },
  _sp99Home() {
    const { s, latest, curW, curFat, targetW, wkW } = this._sp99Data();
    // v12.9.51 第一卡片第 4 指标：本周学习 → BMI 指数（同步【主人档案】身高体重）
    const bmi = Store.getBMI();
    const kpi = (n, v, u) => `<div class="sp99-kpi"><span class="sp99-kpi-n">${n}</span><b>${v}<i>${u}</i></b></div>`;
    const recentM = (s.measures || []).slice(0, 3);
    const recentW = (s.workouts || []).slice(0, 3);
    return `<div class="sp99-page">
      <div class="card" style="margin-bottom:12px;background:linear-gradient(135deg,#2F6BFF,#5B8DFF);border:0">
        <div class="card-title" style="color:#fff"><span class="ico">🏃</span>运动数据
          <span class="sub" style="color:rgba(255,255,255,.75);font-size:11px;margin-left:6px">分析站 + 教学站</span>
        </div>
        <div style="font-size:12.5px;color:rgba(255,255,255,.9);line-height:1.7;margin-top:4px">体测围度、体重体脂趋势在这里记录与分析；动作教学配动画演示。所有数据由你录入后才开始生长——现在的空白，正是待填的进度条。</div>
        <div class="sp99-kpirow" style="margin-top:12px">
          ${kpi('最新体重', curW ? this._f1(curW) : '0.0', '公斤')}
          ${kpi('体脂率', curFat ? this._f1(curFat) : '0.0', '%')}
          ${kpi('本周运动', wkW.length ? wkW.length + ' 次' : '0', '次')}
          ${kpi('BMI 指数', bmi ? bmi.value.toFixed(1) : '—', bmi ? bmi.label : '待填档案')}
        </div>
      </div>
      <div class="sp99-navrow">
        <div class="sp99-navcard a" onclick="App._sp99Set('view','analysis')">
          <div class="sp99-nav-ico">📐</div>
          <div class="sp99-nav-name">分析站</div>
          <div class="sp99-nav-sub">体测数据 · 图表 · 日历</div>
        </div>
        <div class="sp99-navcard b" onclick="App._sp99Set('view','teach')">
          <div class="sp99-nav-ico">📚</div>
          <div class="sp99-nav-name">教学站</div>
          <div class="sp99-nav-sub">动作库 · 动画演示</div>
        </div>
      </div>
      <div class="sp99-card" style="margin-top:12px">
        <div class="sp99-ct"><span class="sp99-ct-ico">📊</span>最近体测<span class="sp99-ct-more" onclick="App._sp99Set('view','analysis')">分析站 ›</span></div>
        ${recentM.length ? recentM.map(m => `<div class="sp99-li"><b>${m.date}</b><span>${m.weight ? m.weight + ' 公斤' : '—'}${m.fat ? ' · 体脂 ' + m.fat + '%' : ''}${m.waist ? ' · 腰围 ' + m.waist + 'cm' : ''}</span></div>`).join('')
          : '<div class="sp99-empty">暂无体测记录——进分析站点右上角「编辑」，录入第一次体重吧</div>'}
      </div>
      <div class="sp99-card" style="margin-top:10px">
        <div class="sp99-ct"><span class="sp99-ct-ico">🏃‍♂️</span>最近运动<span class="sp99-ct-more" onclick="App._sp99HomeGoJushen()">聚神·运动 ›</span></div>
        ${recentW.length ? recentW.map(w => `<div class="sp99-li"><b>${w.date}</b><span>${w.mode === 'strength' ? '力量' : '有氧'} ${w.durMin} 分${w.cal ? ' · ' + w.cal + ' kcal' : ''}${w.sets ? ' · ' + w.sets + ' 组' : ''}</span></div>`).join('')
          : '<div class="sp99-empty">暂无运动记录——从「聚神」进入运动进行页，结束自动入账</div>'}
      </div>
      <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>
    </div>`;
  },
  _sp99HomeGoJushen() { this.mode99ShowJushenPicker && this.mode99ShowJushenPicker('sport'); },

  // ==================== 分析站 ====================
  _sp99Analysis() {
    const st = this._sp99Init();
    const tab = (p, n) => `<button type="button" class="sp99-tab${st.page === p ? ' on' : ''}" onclick="App._sp99Set('page','${p}')">${n}</button>`;
    let body = '';
    if (st.page === 'chart') body = this._sp99PageChart();
    else if (st.page === 'calendar') body = this._sp99PageCalendar();
    else body = this._sp99PageData();
    return `<div class="sp99-page">
      <div class="sp99-topbar">
        <button class="sp99-back" onclick="App.navBack()">‹</button>
        <div class="sp99-title">分析站</div>
        <button class="sp99-editbtn" onclick="App.sp99EditModal()">编辑</button>
      </div>
      ${body}
      <div class="sp99-tabbar" style="margin-top:12px">${tab('data', '数据')}${tab('chart', '图表')}${tab('calendar', '日历')}</div>
    </div>`;
  },

  // ---------- 数据页：三 KPI + 人体围度剪影 ----------
  _sp99PageData() {
    const { s, latest, curW, curFat, targetW } = this._sp99Data();
    const kpi = (n, v, u) => `<div class="sp99-kpi sp99-kpi-lite"><span class="sp99-kpi-n">${n}</span><b>${v}<i>${u}</i></b></div>`;
    return `
      <div class="sp99-kpirow">
        ${kpi('当前体重', curW ? this._f1(curW) : '0.0', '公斤')}
        ${kpi('目标体重', targetW ? this._f1(targetW) : '0.0', '公斤')}
        ${kpi('体脂率', curFat ? this._f1(curFat) : '0.0', '%')}
      </div>
      <div class="sp99-card" style="margin-top:12px">
        <div class="sp99-ct"><span class="sp99-ct-ico">🧍</span>围度指标<span class="sp99-ct-more" onclick="App.sp99EditModal()">＋ 记一次</span></div>
        ${this._sp99Silhouette(latest)}
      </div>
      <div class="sp99-card" style="margin-top:10px">
        <div class="sp99-ct"><span class="sp99-ct-ico">📋</span>体测记录<span class="sp99-ct-more">${(s.measures || []).length} 条</span></div>
        ${(s.measures || []).length ? (s.measures || []).slice(0, 8).map(m => `<div class="sp99-li">
          <b>${m.date}</b>
          <span>${m.weight ? m.weight + ' 公斤' : '—'}${m.fat ? ' · 体脂 ' + m.fat + '%' : ''}${m.waist ? ' · 腰 ' + m.waist : ''}${m.chest ? ' · 胸 ' + m.chest : ''}</span>
          <i class="ta99-x" onclick="App.sp99EditModal('${m.id}')">✎</i>
        </div>`).join('') : '<div class="sp99-empty">暂无体测记录——点右上角「编辑」，从第一次体重开始记录</div>'}
      </div>`;
  },

  // 人体剪影（照参考图重绘：成年男性正面站姿 · 浅灰扁平 #E2E8F0 · 单层轮廓无重影）
  //   结构：头(椭圆)+颈(圆角矩形)+躯干(肩→胸→腰→臀一条路径)+左右臂各一条+左右腿各一条(互不重叠)+双脚
  //   旧版腿部重影根因：右腿路径内缘坐标(161,402)/(159,322)横跨两腿间隙，形成多余的"第三条腿"
  _sp99Silhouette(latest) {
    const val = (k) => (latest && latest[k] ? latest[k] : '');
    const mk = (x, y, lx, ly, name, key, anchor) => {
      const v = val(key);
      return `<line x1="${x}" y1="${y}" x2="${lx}" y2="${ly}" stroke="#2F6BFF" stroke-width="1"/>
        <circle cx="${x}" cy="${y}" r="3.5" fill="#2F6BFF"/>
        <text x="${lx < x ? lx - 4 : lx + 4}" y="${ly + 3.5}" font-size="11" fill="#1F2937" text-anchor="${lx < x ? 'end' : 'start'}">${name}${v ? ` <tspan fill="#2F6BFF" font-weight="700">${v}</tspan>` : ''}</text>`;
    };
    return `<svg viewBox="0 0 340 430" style="width:100%;max-width:360px;display:block;margin:2px auto 0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="170" cy="416" rx="84" ry="8" fill="#E5E7EB" opacity=".55"/>
      <ellipse cx="170" cy="38" rx="16.5" ry="19" fill="#E2E8F0"/>
      <rect x="160" y="51" width="20" height="12" rx="5" fill="#E2E8F0"/>
      <path d="M161,62 C150,62 132,62 121,68 C112,73 109,84 110,96 C112,110 117,130 123,152 C128,170 133,182 136,194 C137,206 135,220 133,232 C131,242 132,248 135,252 C145,258 158,261 170,261 C182,261 195,258 205,252 C208,248 209,242 207,232 C205,220 203,206 204,194 C207,182 212,170 217,152 C223,130 228,110 230,96 C231,84 228,73 219,68 C208,62 190,62 179,62 Z" fill="#E2E8F0"/>
      <path d="M114,64 C106,68 100,80 98,96 C95,110 94,124 94,138 C93,152 94,168 96,180 C97,189 99,195 102,198 C106,200 110,197 111,189 C112,175 113,158 114,144 C115,128 118,112 122,98 C124,88 126,74 127,64 Z" fill="#E2E8F0"/>
      <path d="M226,64 C234,68 240,80 242,96 C245,110 246,124 246,138 C247,152 246,168 244,180 C243,189 241,195 238,198 C234,200 230,197 229,189 C228,175 227,158 226,144 C225,128 222,112 218,98 C216,88 214,74 213,64 Z" fill="#E2E8F0"/>
      <ellipse cx="101" cy="203" rx="7" ry="11" fill="#E2E8F0"/>
      <ellipse cx="239" cy="203" rx="7" ry="11" fill="#E2E8F0"/>
      <path d="M135,246 C132,264 130,284 130,302 C130,320 130,338 131,356 C131,372 132,384 133,392 L155,392 C157,384 158,372 159,356 C160,338 161,320 161,302 C162,284 163,264 165,250 C155,253 145,252 135,246 Z" fill="#E2E8F0"/>
      <path d="M205,246 C208,264 210,284 210,302 C210,320 210,338 209,356 C209,372 208,384 207,392 L185,392 C183,384 182,372 181,356 C180,338 179,320 179,302 C178,284 177,264 175,250 C185,253 195,252 205,246 Z" fill="#E2E8F0"/>
      <path d="M133,392 C132,398 131,404 132,408 C139,411 149,411 155,409 C156,404 156,398 155,392 Z" fill="#E2E8F0"/>
      <path d="M207,392 C208,398 209,404 208,408 C201,411 191,411 185,409 C184,404 184,398 185,392 Z" fill="#E2E8F0"/>
      ${mk(170, 53, 224, 30, '脖围', 'neck')}
      ${mk(116, 66, 52, 50, '肩宽', 'shoulder')}
      ${mk(224, 97, 276, 82, '胸围', 'chest')}
      ${mk(97, 130, 40, 118, '左臂', 'lArm')}
      ${mk(243, 130, 296, 118, '右臂', 'rArm')}
      ${mk(139, 190, 44, 176, '腰围', 'waist')}
      ${mk(201, 238, 278, 224, '臀围', 'hip')}
      ${mk(146, 284, 48, 272, '左腿', 'lThigh')}
      ${mk(194, 284, 290, 272, '右腿', 'rThigh')}
      ${mk(136, 352, 44, 340, '左小腿', 'lCalf')}
      ${mk(204, 352, 292, 340, '右小腿', 'rCalf')}
    </svg>
    ${latest ? '' : '<div class="sp99-empty" style="margin-top:4px">录入第一次体测后，各围度数值会显示在标记点上</div>'}`;
  },

  // ---------- 图表页 ----------
  _sp99PageChart() {
    const st = this._sp99Init();
    const { s } = this._sp99Data();
    const mName = { weight: '体重', fat: '体脂', girth: '围度' }[st.metric];
    const unit = st.metric === 'weight' ? '公斤' : st.metric === 'fat' ? '%' : 'cm';
    const metricTab = (k, n) => `<button type="button" class="sp99-chip${st.metric === k ? ' on' : ''}" onclick="App._sp99Set('metric','${k}')">${n}</button>`;
    const spanTab = (k, n) => `<button type="button" class="sp99-chip${st.span === k ? ' on' : ''}" onclick="App._sp99Set('span','${k}')">${n}</button>`;
    const girthRow = st.metric === 'girth' ? `<div class="sp99-chips">${SP99_GIRTHS.map(([k, n]) => `<button type="button" class="sp99-chip${st.girth === k ? ' on' : ''}" onclick="App._sp99Set('girth','${k}')">${n}</button>`).join('')}</div>` : '';
    // —— 数据序列（按 日/周/月/年 分桶）——
    const series = this._sp99Series(s.measures || [], st);
    const has = series.length > 0;
    const last = has ? series[series.length - 1][1] : 0;
    const prev = has && series.length > 1 ? series[series.length - 2][1] : 0;
    const avg = has ? series.reduce((a, x) => a + x[1], 0) / series.length : 0;
    const diff = has && series.length > 1 ? Math.round((last - prev) * 10) / 10 : 0;
    // —— SVG 折线 ——
    const CW = 340, CH = 170, pad = 30;
    let chart = '';
    if (has) {
      const vs = series.map(x => x[1]);
      const mn = Math.min(...vs), mx = Math.max(...vs);
      const yMin = mn - (mx - mn || 1) * 0.15, yMax = mx + (mx - mn || 1) * 0.15;
      const xOf = i => pad + i * (CW - pad * 2) / (series.length - 1 || 1);
      const yOf = v => CH - pad - ((v - yMin) / (yMax - yMin || 1)) * (CH - pad * 2);
      const pts = series.map((x, i) => [xOf(i), yOf(x[1])]);
      const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      const grid = [0, .5, 1].map(r => {
        const y = CH - pad - r * (CH - pad * 2);
        const gv = yMin + r * (yMax - yMin);
        return `<line x1="${pad}" y1="${y}" x2="${CW - 10}" y2="${y}" stroke="#EEF2F7" stroke-width="1"/><text x="${pad - 4}" y="${y + 3}" font-size="8" text-anchor="end" fill="#94A3B8">${Math.round(gv * 10) / 10}</text>`;
      }).join('');
      const lblEvery = Math.max(1, Math.ceil(series.length / 6));
      const xl = series.map((x, i) => (i % lblEvery === 0 || i === series.length - 1) ? `<text x="${xOf(i)}" y="${CH - pad + 13}" font-size="8.5" text-anchor="middle" fill="#94A3B8">${x[0]}</text>` : '').join('');
      const area = path + ` L${pts[pts.length - 1][0].toFixed(1)},${CH - pad} L${pts[0][0].toFixed(1)},${CH - pad} Z`;
      chart = `<svg viewBox="0 0 ${CW} ${CH}" style="width:100%;background:#FAFCFF;border-radius:12px">
        <defs><linearGradient id="sp99Area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2F6BFF" stop-opacity=".18"/><stop offset="1" stop-color="#2F6BFF" stop-opacity="0"/>
        </linearGradient></defs>
        ${grid}${xl}
        <path d="${area}" fill="url(#sp99Area)"/>
        <path d="${path}" fill="none" stroke="#2F6BFF" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
        ${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#2F6BFF" stroke="#fff" stroke-width="1.4"/>`).join('')}
      </svg>`;
    } else {
      const empty = { weight: '暂无体重数据', fat: '暂无体脂数据', girth: '暂无围度数据' }[st.metric];
      chart = `<div class="sp99-chart-empty"><svg viewBox="0 0 340 170" style="width:100%">
        ${[0, .5, 1].map(r => `<line x1="30" y1="${140 - r * 100}" x2="330" y2="${140 - r * 100}" stroke="#EEF2F7" stroke-width="1"/>`).join('')}
      </svg><span>${empty}</span></div>`;
    }
    const small = (n, v, u, c) => `<div class="sp99-mini"><span>${n}</span><b style="${c ? 'color:' + c : ''}">${v}<i>${u}</i></b></div>`;
    const fmtV = v => has ? (Math.round(v * 10) / 10) : '—';
    return `
      <div class="sp99-chips">${metricTab('weight', '体重')}${metricTab('fat', '体脂')}${metricTab('girth', '围度')}</div>
      ${girthRow}
      <div class="sp99-chips">${spanTab('day', '日')}${spanTab('week', '周')}${spanTab('month', '月')}${spanTab('year', '年')}</div>
      <div class="sp99-card" style="margin-top:10px">
        <div class="sp99-ct"><span class="sp99-ct-ico">📈</span>${mName}（${unit}）</div>
        ${chart}
      </div>
      <div class="sp99-kpirow" style="margin-top:10px">
        ${small('最新' + mName, fmtV(last), unit)}
        ${small('较上次', has && series.length > 1 ? (diff > 0 ? '+' + diff : String(diff)) : '—', unit, diff && diff !== '—' ? (diff > 0 ? '#EF4444' : '#22C55E') : '')}
        ${small('平均' + mName, fmtV(avg), unit)}
      </div>
      <div class="sp99-card" style="margin-top:10px">
        <div class="sp99-ct"><span class="sp99-ct-ico">🔎</span>自定义区间</div>
        <div class="sp99-range">
          <label>开始<input type="date" value="${st.rangeStart}" onchange="App._sp99SetRange('rangeStart',this.value)"></label>
          <label>结束<input type="date" value="${st.rangeEnd}" onchange="App._sp99SetRange('rangeEnd',this.value)"></label>
          <button type="button" class="sp99-clearbtn" onclick="App._sp99SetRange('clear')">清除</button>
        </div>
      </div>`;
  },
  _sp99SetRange(k, v) {
    const st = this._sp99Init();
    if (k === 'clear') { st.rangeStart = ''; st.rangeEnd = ''; }
    else st[k] = v;
    this.render_workbench();
  },
  // 按指标取值
  _sp99ValOf(m, metric, girth) {
    if (metric === 'weight') return m.weight || 0;
    if (metric === 'fat') return m.fat || 0;
    return m[girth] || 0;
  },
  // 分桶：日（近 30 天每日最新值）/ 周（近 12 周均值）/ 月（近 12 月均值）/ 年（按年均值）；再按开始/结束日期过滤
  _sp99Series(measures, st) {
    let ms = measures.slice();
    if (st.rangeStart) ms = ms.filter(m => m.date >= st.rangeStart);
    if (st.rangeEnd) ms = ms.filter(m => m.date <= st.rangeEnd);
    const val = m => this._sp99ValOf(m, st.metric, st.girth);
    ms = ms.filter(m => val(m) > 0);
    if (!ms.length) return [];
    const byDay = {}; // 同日取最新（measures 已按新→旧排序）
    ms.forEach(m => { if (byDay[m.date] === undefined) byDay[m.date] = val(m); });
    const dayKeys = Object.keys(byDay).sort();
    const out = [];
    const pad = n => String(n).padStart(2, '0');
    if (st.span === 'day') {
      dayKeys.slice(-30).forEach(dk => out.push([dk.slice(5).replace('-', '/'), byDay[dk]]));
    } else if (st.span === 'week') {
      const weeks = {};
      dayKeys.forEach(dk => {
        const [y, m, d] = dk.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const wk = Store.fmtDate ? Store.fmtDate(new Date(dt.getTime() - ((dt.getDay() + 6) % 7) * 864e5)) : dk;
        (weeks[wk] = weeks[wk] || []).push(byDay[dk]);
      });
      Object.keys(weeks).sort().slice(-12).forEach(wk => {
        const arr = weeks[wk];
        out.push([wk.slice(5).replace('-', '/'), Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10]);
      });
    } else if (st.span === 'month') {
      const months = {};
      dayKeys.forEach(dk => { const mo = dk.slice(0, 7); (months[mo] = months[mo] || []).push(byDay[dk]); });
      Object.keys(months).sort().slice(-12).forEach(mo => {
        const arr = months[mo];
        out.push([mo.slice(2).replace('-', '/'), Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10]);
      });
    } else {
      const years = {};
      dayKeys.forEach(dk => { const y = dk.slice(0, 4); (years[y] = years[y] || []).push(byDay[dk]); });
      Object.keys(years).sort().forEach(y => {
        const arr = years[y];
        out.push([y, Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10]);
      });
    }
    return out;
  },

  // ---------- 日历页 ----------
  _sp99PageCalendar() {
    const st = this._sp99Init();
    const { s } = this._sp99Data();
    const measures = s.measures || [];
    const metricTab = (k, n) => `<button type="button" class="sp99-chip${st.calMetric === k ? ' on' : ''}" onclick="App._sp99Set('calMetric','${k}')">${n}</button>`;
    const y = st.calY, m = st.calM;
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7; // 周一为第一列
    const days = new Date(y, m + 1, 0).getDate();
    const today = Store.today();
    const sel = this._sp99CalSel || monthKey + '-01';
    // 同日最新值
    const byDay = {};
    measures.forEach(x => { if (x.date.startsWith(monthKey) && byDay[x.date] === undefined) byDay[x.date] = x; });
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="sp99-cal-cell"></div>';
    for (let d = 1; d <= days; d++) {
      const dk = `${monthKey}-${String(d).padStart(2, '0')}`;
      const rec = byDay[dk];
      const v = rec ? this._sp99ValOf(rec, st.calMetric, 'chest') : 0;
      const isSel = sel === dk, isToday = today === dk;
      cells += `<div class="sp99-cal-cell${isSel ? ' sel' : ''}${isToday ? ' today' : ''}" onclick="App._sp99CalPick('${dk}')">
        <span class="sp99-cal-d">${d}</span>
        ${rec && v ? `<span class="sp99-cal-v">${v}</span>` : ''}
      </div>`;
    }
    const monthRecs = measures.filter(x => x.date.startsWith(monthKey));
    const W = ['一', '二', '三', '四', '五', '六', '日'];
    return `
      <div class="sp99-chips">${metricTab('weight', '体重')}${metricTab('fat', '体脂')}</div>
      <div class="sp99-card" style="margin-top:10px">
        <div class="sp99-cal-head">
          <button class="sp99-cal-nav" onclick="App._sp99CalMove(-1)">‹</button>
          <div class="sp99-cal-month">${y} ${String(m + 1).padStart(2, '0')}</div>
          <button class="sp99-cal-nav" onclick="App._sp99CalMove(1)">›</button>
        </div>
        <div class="sp99-cal-grid">${W.map(w => `<div class="sp99-cal-wk">${w}</div>`).join('')}${cells}</div>
      </div>
      <div class="sp99-card" style="margin-top:10px">
        <div class="sp99-ct"><span class="sp99-ct-ico">📋</span>当月记录<span class="sp99-ct-more">${monthRecs.length} 条</span></div>
        ${monthRecs.length ? monthRecs.map(r => `<div class="sp99-reccard">
          <div class="sp99-rec-row"><span class="sp99-rec-k">日期</span><b>${r.date}</b></div>
          <div class="sp99-rec-row"><span class="sp99-rec-k">体重</span><b>${r.weight ? r.weight + ' 公斤' : '—'}</b></div>
          <div class="sp99-rec-row"><span class="sp99-rec-k">体脂</span><b>${r.fat ? r.fat + ' %' : '—'}</b></div>
          ${r.note ? `<div class="sp99-rec-row"><span class="sp99-rec-k">记录</span><b class="sp99-rec-note">${this.esc(r.note)}</b></div>` : ''}
          <i class="ta99-x" onclick="App.sp99EditModal('${r.id}')">✎</i>
        </div>`).join('') : '<div class="sp99-empty">这个月还没有体测记录</div>'}
      </div>`;
  },
  _sp99CalPick(dk) { this._sp99CalSel = dk; this.render_workbench(); },
  _sp99CalMove(d) {
    const st = this._sp99Init();
    let y = st.calY, m = st.calM + d;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    st.calY = y; st.calM = m;
    this.render_workbench();
  },

  // ---------- 体测编辑弹窗 ----------
  sp99EditModal(id) {
    const { s } = this._sp99Data();
    const rec = id ? (s.measures || []).find(x => x.id === id) : null;
    const fld = (k, n, u, v, ph) => `<label class="sp99-fld"><span>${n}<i>${u || ''}</i></span><input id="sp99f-${k}" type="number" step="0.1" inputmode="decimal" placeholder="${ph || ''}" value="${v || ''}"></label>`;
    const today = Store.today();
    const body = `
      <div class="sp99-fld-grid">
        <label class="sp99-fld wide"><span>日期</span><input id="sp99f-date" type="date" value="${rec ? rec.date : today}" max="${today}"></label>
        ${fld('weight', '体重', '公斤', rec && rec.weight, '如 65.5')}
        ${fld('fat', '体脂率', '%', rec && rec.fat, '如 18.0')}
        ${fld('target', '目标体重', '公斤', (s.settings || {}).targetWeight, '如 62.0')}
      </div>
      <div style="font-size:12px;font-weight:800;color:#6B7280;margin:12px 0 6px">围度（厘米 · 选填）</div>
      <div class="sp99-fld-grid">
        ${SP99_GIRTHS.map(([k, n]) => fld(k, n, 'cm', rec && rec[k])).join('')}
      </div>
      <label class="sp99-fld wide" style="margin-top:8px"><span>备注</span><input id="sp99f-note" type="text" maxlength="200" placeholder="如：晨起空腹测量" value="${rec ? this.esc(rec.note) : ''}"></label>
      <div style="font-size:11.5px;color:#94A3B8;margin-top:10px;line-height:1.7">💡 体重建议<b>晨起空腹、如厕后</b>测量；围度用软尺贴身绕一周，松紧以能滑动一根手指为宜。最新体重会自动同步【主人档案】。</div>`;
    this._modal({
      title: rec ? '编辑体测 · ' + rec.date : '记录一次体测',
      body,
      actions: [
        ...(rec ? [{ label: '🗑 删除', onClick: () => { Store.sport99DelMeasure(rec.id); this._flash('已删除该条体测记录'); this.render_workbench(); } }] : []),
        { label: '保存', primary: true, onClick: () => this.sp99SaveMeasure(rec ? rec.id : '') },
      ],
    });
  },
  sp99SaveMeasure(id) {
    const g = k => { const el = document.getElementById('sp99f-' + k); return el ? el.value.trim() : ''; };
    const rec = { id: id || '' };
    ['date', 'weight', 'fat', 'note'].forEach(k => rec[k] = g(k));
    SP99_GIRTHS.forEach(([k]) => rec[k] = g(k));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rec.date)) { this._flash('请选择正确的日期'); return false; }
    const hasNum = rec.weight || rec.fat || SP99_GIRTHS.some(([k]) => rec[k]);
    if (!hasNum) { this._flash('至少填一项数值（体重/体脂/围度）'); return false; }
    Store.sport99SaveMeasure(rec);
    const tw = parseFloat(g('target'));
    if (isFinite(tw)) Store.sport99SetTargetWeight(tw);
    this._flash('✅ 体测已记录——图表与日历已更新');
    this.render_workbench();
  },

  // ==================== 教学站 ====================
  _sp99Teach() {
    const st = this._sp99Init();
    const custom = this._sp99CustomList();
    const catChip = c => `<button type="button" class="sp99-chip${st.teachCat === c.k ? ' on' : ''}" onclick="App._sp99Set('teachCat','${c.k}')">${c.n}</button>`;
    return `<div class="sp99-page">
      <div class="sp99-topbar">
        <button class="sp99-back" onclick="App.navBack()">‹</button>
        <div class="sp99-title">教学站</div>
        <button class="sp99-editbtn plus" onclick="App.sp99ExAddModal()">＋</button>
      </div>
      <div class="sp99-search">
        <input id="sp99TeachQ" type="search" placeholder="输入动作名字搜索" value="${this.esc(st.teachQ)}" oninput="App._sp99TeachSearch(this.value)">
      </div>
      <div class="sp99-cats">${SP99_CATS.map(catChip).join('')}</div>
      <div id="sp99ExGrid" style="margin-top:12px">${this._sp99ExGrid(st.teachCat, st.teachQ, custom)}</div>
    </div>`;
  },
  // 搜索只重绘网格，输入框不丢焦点
  _sp99TeachSearch(q) {
    const st = this._sp99Init();
    st.teachQ = q;
    const el = document.getElementById('sp99ExGrid');
    if (el) el.innerHTML = this._sp99ExGrid(st.teachCat, q, this._sp99CustomList());
  },
  _sp99CustomList() {
    try { return JSON.parse(Store.getSetting('sp99_custom', '[]') || '[]'); } catch (e) { return []; }
  },
  _sp99ExGrid(cat, q, custom) {
    const all = SP99_EX.concat(custom.map(c => ({ id: c.id, n: c.n, cat: c.cat, fig: 'stand', tags: ['自定义'], tips: ['自定义动作', '长按卡片可编辑（开发中）'], custom: true })));
    let list = all;
    if (q) list = list.filter(x => x.n.toLowerCase().includes(String(q).toLowerCase()) || (x.tags || []).join('').includes(q));
    else list = list.filter(x => x.cat === cat);
    if (!list.length) return `<div class="sp99-card"><div class="sp99-empty">没有找到动作${q ? '——换个关键词试试' : ''}</div></div>`;
    return `<div class="sp99-exgrid">${list.map(x => `
      <div class="sp99-excard" onclick="App.sp99ExDetail('${x.id}')">
        <div class="sp99-exfig sp99-still">${this._sp99Fig(x.fig)}</div>
        <div class="sp99-exname">${this.esc(x.n)}</div>
        <div class="sp99-extags">${(x.tags || []).map(t => `<span class="sp99-extag">${this.esc(t)}</span>`).join('')}</div>
      </div>`).join('')}</div>`;
  },
  // 动作详情：动画演示 + 要点
  sp99ExDetail(id) {
    const custom = this._sp99CustomList();
    const x = SP99_EX.find(e => e.id === id) || custom.find(e => e.id === id);
    if (!x) return;
    const body = `
      <div class="sp99-fig-wrap">${this._sp99Fig(x.fig)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${(x.tags || []).map(t => `<span class="sp99-extag">${this.esc(t)}</span>`).join('')}</div>
      <div style="font-size:12.5px;font-weight:800;color:#1F2937;margin:14px 0 6px">动作要点</div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${(x.tips || []).map((t, i) => `<div style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:#4B5563;line-height:1.7"><b style="color:#2F6BFF;flex:none">${i + 1}.</b>${this.esc(t)}</div>`).join('')}
      </div>
      <div style="font-size:11.5px;color:#94A3B8;margin-top:12px;line-height:1.7">动画为示意节奏，实际训练请放慢速度、先掌握动作再上重量。</div>`;
    this._modal({
      title: '🏃 ' + x.n,
      body,
      actions: x.custom ? [
        { label: '🗑 删除', onClick: () => { Store.setSetting('sp99_custom', JSON.stringify(custom.filter(c => c.id !== x.id))); this._flash('已删除自定义动作'); this.render_workbench(); } },
      ] : [],
    });
  },
  // 自定义动作
  sp99ExAddModal() {
    const body = `
      <label class="sp99-fld wide"><span>动作名称</span><input id="sp99ex-n" type="text" maxlength="20" placeholder="如：弹力带侧向走"></label>
      <div style="font-size:12px;font-weight:800;color:#6B7280;margin:10px 0 6px">归类到</div>
      <div class="sp99-chips" id="sp99ex-cats">${SP99_CATS.map((c, i) => `<button type="button" class="sp99-chip${i === 0 ? ' on' : ''}" onclick="App._sp99ExPickCat('${c.k}',this)">${c.n}</button>`).join('')}</div>`;
    this._modal({
      title: '＋ 自定义动作',
      body,
      actions: [{ label: '添加', primary: true, onClick: () => {
        const nEl = document.getElementById('sp99ex-n');
        const n = nEl ? nEl.value.trim() : '';
        if (!n) { this._flash('请填写动作名称'); return false; }
        const cat = this._sp99ExCat || SP99_CATS[0].k;
        const list = this._sp99CustomList();
        list.push({ id: 'c' + Date.now().toString(36), n, cat });
        Store.setSetting('sp99_custom', JSON.stringify(list));
        this._sp99Init().teachCat = cat;
        this._flash('✅ 已添加自定义动作「' + n + '」');
        this.render_workbench();
      } }],
    });
  },
  _sp99ExPickCat(k, btn) {
    this._sp99ExCat = k;
    try { document.querySelectorAll('#sp99ex-cats .sp99-chip').forEach(b => b.classList.remove('on')); btn.classList.add('on'); } catch (e) {}
  },

  // ==================== 动作示意图（SVG 火柴人 + CSS 动画）====================
  // 返回 <svg>：身体深灰 #334155 / 器材主蓝 #2F6BFF / 家具浅灰 #CBD5E1；动画类 a-* 见 styles.css
  _sp99Fig(fig) {
    const S = (inner, extra) => `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="none" stroke="#334155" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${inner}</g>${extra || ''}</svg>`;
    const HEAD = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r || 9}" fill="#334155" stroke="none"/>`;
    const BAR = (y, x1, x2) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#2F6BFF" stroke-width="5"/><circle cx="${x1}" cy="${y}" r="7" fill="none" stroke="#2F6BFF" stroke-width="4"/><circle cx="${x2}" cy="${y}" r="7" fill="none" stroke="#2F6BFF" stroke-width="4"/>`;
    const DB = (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#2F6BFF" stroke-width="4"/>`;
    switch (fig) {
      case 'bench': return S(`
        <line x1="42" y1="108" x2="158" y2="108" stroke="#CBD5E1" stroke-width="7"/>
        <line x1="60" y1="108" x2="60" y2="142" stroke="#CBD5E1" stroke-width="6"/><line x1="140" y1="108" x2="140" y2="142" stroke="#CBD5E1" stroke-width="6"/>
        <circle cx="52" cy="90" r="9" fill="#334155" stroke="none"/>
        <path d="M62,92 L128,94"/><path d="M128,94 L150,112 L150,142"/>
        <g class="a-press" style="transform-origin:100px 92px">
          <path d="M68,92 L96,66" stroke="#334155"/><path d="M96,66 L104,50" stroke="#334155"/>
          <line x1="70" y1="50" x2="136" y2="50" stroke="#2F6BFF" stroke-width="5"/>
          <circle cx="70" cy="50" r="8" fill="none" stroke="#2F6BFF" stroke-width="4.5"/><circle cx="136" cy="50" r="8" fill="none" stroke="#2F6BFF" stroke-width="4.5"/>
        </g>`);
      case 'incline':
      case 'decline': {
        const rot = fig === 'incline' ? -13 : 13;
        return S(`
        <g transform="rotate(${rot} 100 95)">
          <line x1="42" y1="108" x2="158" y2="108" stroke="#CBD5E1" stroke-width="7"/>
          <line x1="60" y1="108" x2="60" y2="142" stroke="#CBD5E1" stroke-width="6"/><line x1="140" y1="108" x2="140" y2="142" stroke="#CBD5E1" stroke-width="6"/>
          <circle cx="52" cy="90" r="9" fill="#334155" stroke="none"/>
          <path d="M62,92 L128,94"/><path d="M128,94 L150,112 L150,142"/>
          <g class="a-press" style="transform-origin:100px 92px">
            <path d="M68,92 L96,64" stroke="#334155"/><path d="M96,64 L104,48" stroke="#334155"/>
            <line x1="70" y1="48" x2="136" y2="48" stroke="#2F6BFF" stroke-width="5"/>
            <circle cx="70" cy="48" r="8" fill="none" stroke="#2F6BFF" stroke-width="4.5"/><circle cx="136" cy="48" r="8" fill="none" stroke="#2F6BFF" stroke-width="4.5"/>
          </g>
        </g>`);
      }
      case 'dbbench': return S(`
        <line x1="42" y1="108" x2="158" y2="108" stroke="#CBD5E1" stroke-width="7"/>
        <line x1="60" y1="108" x2="60" y2="142" stroke="#CBD5E1" stroke-width="6"/><line x1="140" y1="108" x2="140" y2="142" stroke="#CBD5E1" stroke-width="6"/>
        <circle cx="52" cy="90" r="9" fill="#334155" stroke="none"/>
        <path d="M62,92 L128,94"/><path d="M128,94 L150,112 L150,142"/>
        <g class="a-press" style="transform-origin:100px 92px">
          <path d="M68,92 L84,64" stroke="#334155"/><path d="M84,64 L80,50" stroke="#334155"/>
          <path d="M68,92 L108,68" stroke="#334155" opacity=".55"/><path d="M108,68 L112,52" stroke="#334155" opacity=".55"/>
          ${DB(80, 46)}${DB(112, 48)}
        </g>`);
      case 'dbfly': return S(`
        <line x1="42" y1="108" x2="158" y2="108" stroke="#CBD5E1" stroke-width="7"/>
        <line x1="60" y1="108" x2="60" y2="142" stroke="#CBD5E1" stroke-width="6"/><line x1="140" y1="108" x2="140" y2="142" stroke="#CBD5E1" stroke-width="6"/>
        <circle cx="52" cy="90" r="9" fill="#334155" stroke="none"/>
        <path d="M62,92 L128,94"/><path d="M128,94 L150,112 L150,142"/>
        <g class="a-flyl" style="transform-origin:70px 90px"><path d="M70,90 L46,60" stroke="#334155"/>${DB(42, 54)}</g>
        <g class="a-flyr" style="transform-origin:96px 88px"><path d="M96,88 L122,58" stroke="#334155"/>${DB(126, 52)}</g>`);
      case 'pushup': return S(`
        <line x1="24" y1="138" x2="176" y2="138" stroke="#CBD5E1" stroke-width="6"/>
        <g class="a-bob" style="transform-origin:100px 110px">
          <path d="M58,104 L150,122"/><circle cx="48" cy="98" r="9" fill="#334155" stroke="none"/>
          <path d="M58,104 L58,134"/><path d="M58,104 L66,74" opacity=".0"/>
        </g>
        <path d="M150,122 L176,134"/>`);
      case 'dip': return S(`
        <line x1="62" y1="86" x2="86" y2="86" stroke="#2F6BFF" stroke-width="5"/><line x1="114" y1="86" x2="138" y2="86" stroke="#2F6BFF" stroke-width="5"/>
        <line x1="68" y1="86" x2="68" y2="142" stroke="#CBD5E1" stroke-width="6"/><line x1="132" y1="86" x2="132" y2="142" stroke="#CBD5E1" stroke-width="6"/>
        <g class="a-dip" style="transform-origin:100px 86px">
          <path d="M86,86 L92,64"/><circle cx="92" cy="52" r="9" fill="#334155" stroke="none"/>
          <path d="M92,64 L92,110"/><path d="M92,110 L80,132"/><path d="M80,132 L86,138"/>
          <path d="M92,64 L100,86 L114,86" opacity=".0"/>
          <path d="M86,86 L100,70" opacity=".55"/>
        </g>`);
      case 'ohp': return S(`
        <path d="M100,58 L100,96"/><path d="M100,96 L88,122 L88,144"/><path d="M100,96 L112,122 L112,144"/>
        ${HEAD(100, 42)}
        <g class="a-press" style="transform-origin:100px 58px">
          <path d="M100,58 L86,40 L86,22"/><path d="M100,58 L114,40 L114,22" opacity=".55"/>
          <line x1="74" y1="22" x2="126" y2="22" stroke="#2F6BFF" stroke-width="5"/>
          <circle cx="74" cy="22" r="7" fill="none" stroke="#2F6BFF" stroke-width="4"/><circle cx="126" cy="22" r="7" fill="none" stroke="#2F6BFF" stroke-width="4"/>
        </g>`);
      case 'lateral': return S(`
        <path d="M100,58 L100,96"/><path d="M100,96 L88,122 L88,144"/><path d="M100,96 L112,122 L112,144"/>
        ${HEAD(100, 42)}
        <g class="a-raisel" style="transform-origin:100px 58px"><path d="M100,58 L80,88"/>${DB(78, 93)}</g>
        <g class="a-raiser" style="transform-origin:100px 58px"><path d="M100,58 L120,88"/>${DB(122, 93)}</g>`);
      case 'front': return S(`
        <path d="M100,58 L100,96"/><path d="M100,96 L88,122 L88,144"/><path d="M100,96 L112,122 L112,144"/>
        ${HEAD(100, 42)}
        <g class="a-front" style="transform-origin:100px 58px"><path d="M100,58 L134,62"/>${DB(140, 62)}</g>`);
      case 'rear': return S(`
        <path d="M130,96 L74,82"/><circle cx="64" cy="78" r="9" fill="#334155" stroke="none"/>
        <path d="M130,96 L128,120 L134,144"/><path d="M130,96 L142,120 L138,144"/>
        <g class="a-raisel" style="transform-origin:74px 82px"><path d="M74,82 L58,108"/>${DB(55, 113)}</g>
        <g class="a-raiser" style="transform-origin:74px 82px"><path d="M74,82 L92,106"/>${DB(95, 110)}</g>`);
      case 'shrug': return S(`
        <path d="M100,58 L100,96"/><path d="M100,96 L88,122 L88,144"/><path d="M100,96 L112,122 L112,144"/>
        ${HEAD(100, 40)}
        <g class="a-shrug" style="transform-origin:100px 60px">
          <path d="M100,58 L84,80 L84,98" opacity=".9"/><path d="M100,58 L116,80 L116,98" opacity=".55"/>
          <line x1="72" y1="100" x2="128" y2="100" stroke="#2F6BFF" stroke-width="5"/>
          <circle cx="72" cy="100" r="8" fill="none" stroke="#2F6BFF" stroke-width="4"/><circle cx="128" cy="100" r="8" fill="none" stroke="#2F6BFF" stroke-width="4"/>
        </g>`);
      case 'upright': return S(`
        <path d="M100,58 L100,96"/><path d="M100,96 L88,122 L88,144"/><path d="M100,96 L112,122 L112,144"/>
        ${HEAD(100, 42)}
        <g class="a-upright" style="transform-origin:100px 58px">
          <path d="M100,58 L78,64 L80,78"/><path d="M100,58 L122,64 L120,78" opacity=".55"/>
          <line x1="80" y1="82" x2="120" y2="82" stroke="#2F6BFF" stroke-width="5"/>
          <circle cx="80" cy="82" r="6" fill="none" stroke="#2F6BFF" stroke-width="4"/><circle cx="120" cy="82" r="6" fill="none" stroke="#2F6BFF" stroke-width="4"/>
        </g>`);
      case 'curl': return S(`
        <path d="M100,58 L100,96"/><path d="M100,96 L88,122 L88,144"/><path d="M100,96 L112,122 L112,144"/>
        ${HEAD(100, 42)}
        <path d="M100,58 L100,86" opacity=".9"/>
        <g class="a-curl" style="transform-origin:100px 86px">
          <path d="M100,86 L124,70"/>${DB(129, 66)}
        </g>`);
      case 'pushdown': return S(`
        <rect x="76" y="12" width="48" height="10" rx="4" fill="#CBD5E1" stroke="none"/>
        <circle cx="100" cy="30" r="8" fill="none" stroke="#94A3B8" stroke-width="4"/>
        <line x1="100" y1="30" x2="100" y2="58" stroke="#94A3B8" stroke-width="2.5"/>
        <path d="M100,58 L100,96"/><path d="M100,96 L88,122 L88,144"/><path d="M100,96 L112,122 L112,144"/>
        ${HEAD(100, 42)}
        <path d="M100,58 L100,88" opacity=".9"/>
        <g class="a-push" style="transform-origin:100px 88px">
          <path d="M100,88 L126,88"/><line x1="126" y1="80" x2="126" y2="96" stroke="#2F6BFF" stroke-width="5"/>
        </g>`);
      case 'ovext': return S(`
        <path d="M100,58 L100,96"/><path d="M100,96 L88,122 L88,144"/><path d="M100,96 L112,122 L112,144"/>
        ${HEAD(100, 42)}
        <path d="M100,58 L100,38" opacity=".9"/>
        <g class="a-ovext" style="transform-origin:100px 38px">
          <path d="M100,38 L118,50"/>${DB(122, 55)}
        </g>`);
      case 'calf': return S(`
        <g class="a-heel" style="transform-origin:100px 144px">
          <path d="M100,50 L100,96"/><path d="M100,96 L92,124 L92,136"/>
          ${HEAD(100, 34)}
          <path d="M100,58 L82,82 L82,92" opacity=".55"/><path d="M100,58 L118,82 L118,92" opacity=".55"/>
          <line x1="70" y1="92" x2="126" y2="92" stroke="#2F6BFF" stroke-width="5"/>
          <circle cx="70" cy="92" r="7" fill="none" stroke="#2F6BFF" stroke-width="4"/><circle cx="126" cy="92" r="7" fill="none" stroke="#2F6BFF" stroke-width="4"/>
        </g>
        <path d="M84,144 L112,144" stroke="#CBD5E1"/>`);
      case 'neck': return S(`
        <path d="M64,112 L136,112"/><path d="M84,112 L84,136"/><path d="M116,112 L116,136"/>
        <g class="a-neck" style="transform-origin:100px 100px">
          <path d="M100,100 L100,84"/><circle cx="100" cy="72" r="10" fill="#334155" stroke="none"/>
        </g>
        <circle cx="118" cy="76" r="6" fill="none" stroke="#2F6BFF" stroke-width="4"/>
        <path d="M124,66 L136,56" stroke="#2F6BFF" stroke-width="3"/>`);
      case 'plank': return S(`
        <line x1="24" y1="138" x2="176" y2="138" stroke="#CBD5E1" stroke-width="6"/>
        <g class="a-plankb" style="transform-origin:110px 120px">
          <path d="M70,126 L148,118"/><circle cx="58" cy="122" r="9" fill="#334155" stroke="none"/>
          <path d="M70,126 L96,132"/>
        </g>
        <path d="M148,118 L174,134"/>`);
      case 'burpee': return S(`
        <g class="a-burpee" style="transform-origin:100px 100px">
          <path d="M100,54 L100,96"/><circle cx="100" cy="38" r="9" fill="#334155" stroke="none"/>
          <path d="M100,54 L78,30"/><path d="M100,54 L122,30"/>
          <path d="M100,96 L88,122 L88,144"/><path d="M100,96 L112,122 L112,144"/>
        </g>`);
      case 'jack': return S(`
        ${HEAD(100, 34)}
        <path d="M100,50 L100,92"/>
        <g class="a-jacka" style="transform-origin:100px 54px"><path d="M100,54 L80,80"/>${DB(78, 85)}</g>
        <g class="a-jacka2" style="transform-origin:100px 54px"><path d="M100,54 L120,80"/>${DB(122, 85)}</g>
        <g class="a-jackl" style="transform-origin:100px 92px"><path d="M100,92 L88,120 L88,144"/></g>
        <g class="a-jackl2" style="transform-origin:100px 92px"><path d="M100,92 L112,120 L112,144"/></g>`);
      case 'pullover': return S(`
        <line x1="42" y1="108" x2="158" y2="108" stroke="#CBD5E1" stroke-width="7"/>
        <line x1="60" y1="108" x2="60" y2="142" stroke="#CBD5E1" stroke-width="6"/><line x1="140" y1="108" x2="140" y2="142" stroke="#CBD5E1" stroke-width="6"/>
        <circle cx="52" cy="90" r="9" fill="#334155" stroke="none"/>
        <path d="M62,92 L128,94"/><path d="M128,94 L150,112 L150,142"/>
        <g class="a-pull" style="transform-origin:70px 90px">
          <path d="M70,90 L44,64"/>${DB(40, 60)}
        </g>`);
      case 'rollout': return S(`
        <line x1="24" y1="138" x2="176" y2="138" stroke="#CBD5E1" stroke-width="6"/>
        <path d="M128,134 L128,116"/>
        <g class="a-roll" style="transform-origin:128px 116px">
          <path d="M128,116 L74,96"/><circle cx="62" cy="90" r="9" fill="#334155" stroke="none"/>
          <path d="M74,96 L54,112"/>
        </g>
        <g class="a-rollw" style="transform-origin:54px 112px">
          <circle cx="44" cy="120" r="11" fill="none" stroke="#2F6BFF" stroke-width="4.5"/>
          <line x1="36" y1="120" x2="52" y2="120" stroke="#2F6BFF" stroke-width="2.5"/>
        </g>`);
      default: // stand（自定义动作默认形象）
        return S(`
          <path d="M100,56 L100,98"/><path d="M100,98 L88,124 L88,146"/><path d="M100,98 L112,124 L112,146"/>
          ${HEAD(100, 40)}
          <path d="M100,58 L82,84"/><path d="M100,58 L118,84"/>
          <g class="a-plankb" style="transform-origin:100px 84px"><path d="M82,84 L76,86"/><path d="M118,84 L124,86"/></g>`);
    }
  },

  // ==================== 聚神 · 运动 / 学习 进行页（80-mode99.js 选择弹窗进入）====================
  // kind: 'sport' | 'study'；targetMin：目标分钟（环形进度分母）
  sp99StartSession(kind, targetMin) {
    if (document.getElementById('sp99Ses')) return;
    try { if (this._closeModal) this._closeModal(); } catch (e) {}
    this._mode99 = 'jushen';
    targetMin = Math.max(5, Math.round(+targetMin || 30));
    const study = kind === 'study';
    this._sp99Ses = {
      kind, targetMin,
      mode: 'cardio', subject: '',
      startTs: Date.now(), accMs: 0, paused: false,
      sets: 0, cal: 0, hr: 0, dist: 0,
      restUntil: 0, restTotal: 0,
      lastTick: Date.now(),
    };
    const ov = document.createElement('div');
    ov.id = 'sp99Ses';
    ov.className = 'sp99-ses' + (study ? ' study' : '');
    ov.innerHTML = `
      <div class="sp99-ses-top">
        <button type="button" class="sp99-ses-back" onclick="App.sp99SesEndAsk()">‹</button>
        <div class="sp99-ses-title">${study ? '📖 学习中' : '🏃 运动中'}</div>
        <button type="button" class="sp99-ses-lock" onclick="App.sp99SesLock()" title="屏幕锁定">${study ? '🔒' : '🔒'}</button>
      </div>
      <div class="sp99-ses-modes">
        ${study
          ? ['高数', '英语', '政治', '计算机', '专业课', '其他'].map(s => `<button type="button" class="sp99-ses-mode" data-s="${s}" onclick="App.sp99StudySubject('${s}')">${s}</button>`).join('')
          : `<button type="button" class="sp99-ses-mode on" data-m="cardio" onclick="App.sp99SesSetMode('cardio')">有氧模式</button>
             <button type="button" class="sp99-ses-mode" data-m="strength" onclick="App.sp99SesSetMode('strength')">力量模式</button>`}
      </div>
      <div class="sp99-ses-ringwrap">
        <svg viewBox="0 0 200 200" class="sp99-ring">
          <circle cx="100" cy="100" r="86" fill="none" stroke="#E8EEF6" stroke-width="12"/>
          <circle id="sp99SesRing" cx="100" cy="100" r="86" fill="none" stroke="${study ? '#F97316' : '#2F6BFF'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="540.35" stroke-dashoffset="540.35" transform="rotate(-90 100 100)"/>
        </svg>
        <div class="sp99-ses-center">
          <div id="sp99SesTime" class="sp99-ses-time">00:00:00</div>
          <div id="sp99SesTarget" class="sp99-ses-target">目标 ${targetMin} 分 · ${(targetMin / 60 * 100).toFixed(0)}%</div>
        </div>
      </div>
      <div class="sp99-ses-stats">
        ${study ? `
          <div class="sp99-ses-stat" onclick="App.sp99SesStatInfo('todayMin')"><span>今日累计</span><b id="sp99St-todayMin">—</b></div>
          <div class="sp99-ses-stat" onclick="App.sp99SesStatInfo('count')"><span>今日次数</span><b id="sp99St-count">—</b></div>
          <div class="sp99-ses-stat" onclick="App.sp99SesStatInfo('streak')"><span>连续天数</span><b id="sp99St-streak">—</b></div>
          <div class="sp99-ses-stat" onclick="App.sp99SesStatInfo('subject')"><span>当前科目</span><b id="sp99St-subject">—</b></div>
        ` : `
          <div class="sp99-ses-stat" onclick="App.sp99SesStatInfo('cal')"><span>消耗热量</span><b id="sp99St-cal">—</b></div>
          <div class="sp99-ses-stat" onclick="App.sp99SesStatTap('hr')"><span>心率</span><b id="sp99St-hr">—</b></div>
          <div class="sp99-ses-stat" onclick="App.sp99SesStatInfo('sets')"><span>组数</span><b id="sp99St-sets">—</b></div>
          <div class="sp99-ses-stat" onclick="App.sp99SesStatTap('dist')"><span>运动距离</span><b id="sp99St-dist">—</b></div>
        `}
      </div>
      <div id="sp99SesRest" class="sp99-ses-rest" style="display:none">
        <div class="sp99-ses-restbar"><i id="sp99SesRestFill"></i></div>
        <div class="sp99-ses-restrow"><span id="sp99SesRestTxt">组间休息 1:30</span><button type="button" class="sp99-ses-skip" onclick="App.sp99SesRestSkip()">跳过休息</button></div>
      </div>
      <div class="sp99-ses-btnrow">
        <button type="button" class="sp99-ses-btn pause" id="sp99SesPauseBtn" onclick="App.sp99SesToggle()">⏸ 暂停</button>
        <button type="button" class="sp99-ses-btn end" onclick="App.sp99SesEndAsk()">■ 结束${study ? '学习' : '运动'}</button>
      </div>
      ${study ? '' : `<button type="button" class="sp99-ses-nextset" onclick="App.sp99SesNextSet()">＋ 下一组</button>`}`;
    document.body.appendChild(ov);
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
    this._sp99Wake();
    this._sp99SesRefreshStats();
    this._sp99SesT = setInterval(() => this._sp99SesTick(), 500);
  },
  // 计时核心：暂停时不累计
  _sp99SesTick() {
    const S = this._sp99Ses;
    if (!S) return clearInterval(this._sp99SesT);
    const now = Date.now();
    if (!S.paused) S.accMs += now - S.lastTick;
    S.lastTick = now;
    const el = document.getElementById('sp99SesTime');
    if (el) {
      const s = Math.floor(S.accMs / 1000);
      el.textContent = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(x => String(x).padStart(2, '0')).join(':');
    }
    const ring = document.getElementById('sp99SesRing');
    if (ring) {
      const C = 540.35;
      const p = Math.min(1, S.accMs / (S.targetMin * 60000));
      ring.setAttribute('stroke-dashoffset', (C * (1 - p)).toFixed(2));
    }
    const tg = document.getElementById('sp99SesTarget');
    if (tg) {
      const p = Math.min(100, Math.round(S.accMs / (S.targetMin * 60000) * 100));
      tg.textContent = `目标 ${S.targetMin} 分 · ${p}%`;
    }
    // 消耗热量实时估算（MET：有氧 8 / 力量 6 × 体重）
    const calEl = document.getElementById('sp99St-cal');
    if (calEl) calEl.textContent = this._sp99SesCal(S) + ' kcal';
    // 组间休息倒计时
    const rest = document.getElementById('sp99SesRest');
    if (rest && S.restUntil > 0) {
      const left = S.restUntil - now;
      if (left <= 0) { S.restUntil = 0; rest.style.display = 'none'; this._flash('💪 休息结束——下一组走起'); }
      else {
        rest.style.display = '';
        const fill = document.getElementById('sp99SesRestFill');
        const txt = document.getElementById('sp99SesRestTxt');
        const m = Math.floor(left / 60000), sec = Math.floor(left % 60000 / 1000);
        if (txt) txt.textContent = `组间休息 ${m}:${String(sec).padStart(2, '0')}`;
        if (fill) fill.style.width = (100 - left / S.restTotal * 100) + '%';
      }
    }
  },
  _sp99SesCal(S) {
    const { curW } = this._sp99Data();
    const w = curW || 60;
    const met = S.mode === 'strength' ? 6 : 8;
    return Math.round(met * w * (S.accMs / 3600000));
  },
  _sp99SesRefreshStats() {
    const S = this._sp99Ses;
    if (!S) return;
    if (S.kind === 'study') {
      const s = Store.getSport99();
      const today = Store.today();
      const todays = (s.studies || []).filter(x => x.date === today);
      const set = (k, v) => { const el = document.getElementById('sp99St-' + k); if (el) el.textContent = v; };
      set('todayMin', todays.reduce((a, x) => a + (+x.durMin || 0), 0) + ' 分');
      set('count', todays.length ? '第 ' + (todays.length + 1) + ' 次' : '第 1 次');
      // 连续天数：按有学习记录的日期连算
      const daySet = new Set((s.studies || []).map(x => x.date));
      let streak = 0; const d = new Date();
      for (;;) {
        const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (daySet.has(dk)) { streak++; d.setDate(d.getDate() - 1); } else break;
        if (streak > 999) break;
      }
      set('streak', streak + ' 天');
      set('subject', S.subject || '未选');
    } else {
      const set = (k, v) => { const el = document.getElementById('sp99St-' + k); if (el) el.textContent = v; };
      set('cal', this._sp99SesCal(S) + ' kcal');
      set('hr', S.hr ? S.hr + ' bpm' : '—');
      set('sets', S.sets ? S.sets + ' 组' : '—');
      set('dist', S.dist ? S.dist + ' km' : '—');
    }
  },
  sp99SesSetMode(m) {
    const S = this._sp99Ses;
    if (!S) return;
    S.mode = m;
    try { document.querySelectorAll('.sp99-ses-mode').forEach(b => b.classList.toggle('on', b.dataset.m === m)); } catch (e) {}
    this._sp99SesRefreshStats();
  },
  sp99StudySubject(s) {
    const S = this._sp99Ses;
    if (!S) return;
    S.subject = S.subject === s ? '' : s;
    try { document.querySelectorAll('.sp99-ses-mode').forEach(b => b.classList.toggle('on', b.dataset.s === S.subject)); } catch (e) {}
    this._sp99SesRefreshStats();
  },
  sp99SesToggle() {
    const S = this._sp99Ses;
    if (!S) return;
    S.paused = !S.paused;
    if (!S.paused) S.lastTick = Date.now();
    const btn = document.getElementById('sp99SesPauseBtn');
    if (btn) { btn.innerHTML = S.paused ? '▶ 继续' : '⏸ 暂停'; btn.classList.toggle('paused', S.paused); }
  },
  sp99SesNextSet() {
    const S = this._sp99Ses;
    if (!S) return;
    if (S.kind !== 'sport') return;
    S.sets++;
    if (S.mode !== 'strength') { S.mode = 'strength'; this.sp99SesSetMode('strength'); } // 按下一组自动切入力量模式
    S.restTotal = 90 * 1000;
    S.restUntil = Date.now() + S.restTotal;
    this._sp99SesRefreshStats();
  },
  sp99SesRestSkip() {
    const S = this._sp99Ses;
    if (S) S.restUntil = 0;
    const rest = document.getElementById('sp99SesRest');
    if (rest) rest.style.display = 'none';
  },
  sp99SesStatTap(key) {
    const S = this._sp99Ses;
    if (!S) return;
    const cfg = { hr: { t: '心率', u: 'bpm', v: S.hr, ph: '如 132' }, dist: { t: '运动距离', u: 'km', v: S.dist, ph: '如 5.2' } }[key];
    if (!cfg) return;
    const body = `<label class="sp99-fld wide"><span>${cfg.t}（${cfg.u}）</span><input id="sp99sesv" type="number" step="0.1" inputmode="decimal" placeholder="${cfg.ph}" value="${cfg.v || ''}"></label>
      <div style="font-size:11.5px;color:#94A3B8;margin-top:8px">手表/手环上的数字为准，随时可改；结束运动时一并存入记录。</div>`;
    this._modal({
      title: '填入' + cfg.t,
      body,
      actions: [{ label: '保存', primary: true, onClick: () => {
        const el = document.getElementById('sp99sesv');
        const v = el ? parseFloat(el.value) : NaN;
        if (!isFinite(v) || v < 0) { this._flash('请输入正确的数字'); return false; }
        if (key === 'hr') S.hr = Math.round(v); else S.dist = Math.round(v * 10) / 10;
        this._sp99SesRefreshStats();
      } }],
    });
  },
  sp99SesStatInfo(key) {
    const tips = {
      cal: '消耗热量按 MET 估算（有氧≈8 · 力量≈6 × 体重 × 时长），仅供参考。',
      sets: '力量模式下点「＋ 下一组」自动累加，并开启 90 秒组间休息。',
      todayMin: '今日已保存的学习时长（不含本次进行中的）。',
      count: '今日已保存的学习次数；本次将是第 N 次。',
      streak: '连续有学习记录的天数（含今日已保存的）。',
      subject: '上方选好科目，结束学习会一起存入记录。',
    };
    if (tips[key]) this._flash(tips[key]);
  },
  sp99SesEndAsk() {
    const S = this._sp99Ses;
    if (!S) return;
    const study = S.kind === 'study';
    const min = Math.floor(S.accMs / 60000);
    this._modal({
      title: study ? '结束这次学习？' : '结束这次运动？',
      body: `<div style="font-size:13.5px;color:#475569;line-height:1.9">本次${study ? '学习' : '运动'} <b style="color:${study ? '#F97316' : '#2F6BFF'}">${min} 分钟</b>${study ? (S.subject ? ' · 科目 ' + S.subject : '') : (S.mode === 'strength' ? ' · 力量模式' + (S.sets ? ' · ' + S.sets + ' 组' : '') : ' · 有氧模式')}。<br>确认后保存记录并回到轻氧。</div>`,
      actions: [
        { label: '继续' + (study ? '学习' : '运动') },
        { label: '保存并结束', primary: true, onClick: () => this.sp99SesEnd() },
      ],
    });
  },
  sp99SesEnd() {
    const S = this._sp99Ses;
    if (!S) return;
    clearInterval(this._sp99SesT);
    this._sp99SesT = null;
    const ov = document.getElementById('sp99Ses');
    if (ov) ov.remove();
    try { document.body.style.overflow = ''; } catch (e) {}
    this._sp99Unwake();
    this._sp99Ses = null;
    this._mode99 = 'qingyang';
    const min = Math.floor(S.accMs / 60000);
    if (min >= 1) {
      if (S.kind === 'study') {
        Store.sport99SaveStudy({ durMin: min, subject: S.subject, note: '' });
        this._flash(`📖 本次学习 ${min} 分钟${S.subject ? '（' + S.subject + '）' : ''}已保存`);
      } else {
        Store.sport99SaveWorkout({ durMin: min, mode: S.mode, cal: this._sp99SesCal(S), hr: S.hr, sets: S.sets, dist: S.dist, note: '' });
        this._flash(`🏃 本次${S.mode === 'strength' ? '力量' : '有氧'}运动 ${min} 分钟已保存——去【运动数据】看记录`);
      }
    } else {
      this._flash('本次不足 1 分钟，未记录——下次多坚持一会儿');
    }
    this._rerenderIfHabit && this._rerenderIfHabit();
    try { if (this.currentView === 'dashboard') this.render_dashboard(); } catch (e) {}
  },
  // 屏幕锁定：透明遮罩吃掉所有误触，长按 800ms 解锁（出汗手指友好）
  sp99SesLock() {
    if (document.getElementById('sp99SesLockOv')) return this.sp99SesUnlock();
    const lock = document.createElement('div');
    lock.id = 'sp99SesLockOv';
    lock.className = 'sp99-ses-lockov';
    lock.innerHTML = `<div class="sp99-ses-lockbox"><div style="font-size:34px">🔒</div><div style="font-size:14px;font-weight:800;color:#fff;margin-top:8px">屏幕已锁定</div><div style="font-size:12px;color:rgba(255,255,255,.85);margin-top:4px">长按任意位置解锁</div></div>`;
    let timer = null;
    const start = (e) => { e.preventDefault(); timer = setTimeout(() => this.sp99SesUnlock(), 800); };
    const cancel = () => { clearTimeout(timer); timer = null; };
    lock.addEventListener('touchstart', start, { passive: false });
    lock.addEventListener('mousedown', start);
    ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(ev => lock.addEventListener(ev, cancel));
    document.body.appendChild(lock);
  },
  sp99SesUnlock() {
    const el = document.getElementById('sp99SesLockOv');
    if (el) el.remove();
  },
  // 屏幕常亮（Wake Lock API；不支持的设备静默降级）
  _sp99Wake() {
    try {
      if (navigator.wakeLock) {
        navigator.wakeLock.request('screen').then(l => {
          this._sp99WakeLock = l;
          this._sp99WakeRel = () => { try { this._sp99WakeLock = null; this._sp99Wake(); } catch (e) {} };
          document.addEventListener('visibilitychange', this._sp99WakeRel);
        }).catch(() => {});
      }
    } catch (e) {}
  },
  _sp99Unwake() {
    try {
      if (this._sp99WakeLock) this._sp99WakeLock.release().catch(() => {});
      if (this._sp99WakeRel) document.removeEventListener('visibilitychange', this._sp99WakeRel);
    } catch (e) {}
    this._sp99WakeLock = null; this._sp99WakeRel = null;
  },
});
