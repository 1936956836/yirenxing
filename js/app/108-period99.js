// 108-period99.js —— v12.9.50 【经期数据】数据研究所第 12 库（仅女生 · 档案性别=女 才解锁）
// [功能组] G4-数据洞察 + G2-生活基础（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//
// 设计（参考 Flo / 美柚 / 大姨妈 / Clue 的女性周期管理）：
//   · 性别门控：主人档案 gender === '女' 才可见可用；男生看到锁定卡（不进入功能）——为上架女性用户适配
//   · 每日记录：流量（少/中/多）· 痛经（无/轻微/中度/重度）· 症状多选（经前综合征常见项）· 心情 · 备注
//   · 月历视图：当日可点记录；已记录=红实心 · 预测经期=粉环 · 排卵日=紫点 · 易孕期=绿底 · 今天金色描边
//   · 周期引擎：自动识别经期起点（连续记录断点）→ 周期长度 / 经期长度 / 规律性 → 预测下次经期与排卵窗口
//   · 周期分期：经期 / 卵泡期 / 排卵期 / 黄体期（按距上次经期起点与预测排卵日推算）
//   · 统计：近 6 次周期长度条形 · 症状频率 Top · 周期规律性（波动 ≤4 天=规律 / ≤7 天=基本规律）
//   · 经期护理知识卡 + 易孕窗口说明（仅作参考，非避孕/备孕医疗建议）
//   · 设置：周期长度 / 经期长度（无数据时预测用；有数据后自动按历史均值）
//   · 存储：Store.period99 { logs: [...], settings: { cycleLen, periodLen } }（随云账号同步隔离）
Object.assign(App, {
  // ==================== 数据层 ====================
  _period99() {
    const d = Store.load();
    const p = d.period99;
    const out = { logs: [], settings: { cycleLen: 28, periodLen: 5 } };
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      if (Array.isArray(p.logs)) out.logs = p.logs;
      if (p.settings && typeof p.settings === 'object') {
        const c = parseInt(p.settings.cycleLen, 10); if (c >= 18 && c <= 45) out.settings.cycleLen = c;
        const l = parseInt(p.settings.periodLen, 10); if (l >= 2 && l <= 10) out.settings.periodLen = l;
      }
    }
    return out;
  },
  _period99Save(p) {
    const d = Store.load();
    d.period99 = p;
    Store.save(d);
  },
  _period99Female() {
    try { return (Store.getProfile ? Store.getProfile() : {}).gender === '女'; } catch (e) { return false; }
  },
  // 某日记录（无则 null）
  _period99Day(date) {
    return this._period99().logs.find(x => x.date === date) || null;
  },
  // 是否经期的记录日（flow 有值且非「无」）
  _period99IsFlowDay(rec) { return !!(rec && rec.flow && rec.flow !== '无'); },
  // 经期起点：该日有经血 且 前一日没有（连续记录的断点 = 新一次经期开始）
  _period99Starts() {
    const logs = this._period99().logs.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const flowDays = new Set(logs.filter(x => this._period99IsFlowDay(x)).map(x => x.date));
    const starts = [];
    flowDays.forEach(d => {
      const prev = new Date(d + 'T00:00:00'); prev.setDate(prev.getDate() - 1);
      const pk = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0') + '-' + String(prev.getDate()).padStart(2, '0');
      if (!flowDays.has(pk)) starts.push(d);
    });
    return starts.sort();
  },
  // 周期分析：{ avgCycle, avgPeriod, cycles: [n], periodLens: [n], lastStart, nextStart, ovulation, regular }
  _period99Stats() {
    const st = this._period99().settings;
    const starts = this._period99Starts();
    const cycles = [];
    for (let i = 1; i < starts.length; i++) {
      const diff = Math.round((new Date(starts[i] + 'T00:00:00') - new Date(starts[i - 1] + 'T00:00:00')) / 86400000);
      if (diff >= 15 && diff <= 60) cycles.push(diff);   // 15~60 天之外视为异常点不计
    }
    const flowSet = new Set(this._period99().logs.filter(x => this._period99IsFlowDay(x)).map(x => x.date));
    const periodLens = [];
    const todayKey = Store.today();
    starts.forEach(s => {
      let n = 0; const d0 = new Date(s + 'T00:00:00');
      for (let i = 0; i < 15; i++) {
        const dd = new Date(d0); dd.setDate(d0.getDate() + i);
        const k = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
        if (flowSet.has(k)) n++; else break;
      }
      if (n >= 1 && n <= 12) {
        // 最近一次经期可能仍在进行中（起点+n 天 ≥ 今日）——未结束的经期不计入平均，防拉低均值
        const endDate = new Date(d0); endDate.setDate(d0.getDate() + n - 1);
        const endKey = endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0');
        if (endKey < todayKey) periodLens.push(n);
      }
    });
    const avgCycle = cycles.length ? Math.round(cycles.reduce((s, x) => s + x, 0) / cycles.length) : st.cycleLen;
    const avgPeriod = periodLens.length ? Math.round(periodLens.reduce((s, x) => s + x, 0) / periodLens.length) : st.periodLen;
    const lastStart = starts.length ? starts[starts.length - 1] : null;
    let nextStart = null, ovulation = null;
    if (lastStart) {
      const ns = new Date(lastStart + 'T00:00:00'); ns.setDate(ns.getDate() + avgCycle);
      nextStart = ns.getFullYear() + '-' + String(ns.getMonth() + 1).padStart(2, '0') + '-' + String(ns.getDate()).padStart(2, '0');
      const ov = new Date(lastStart + 'T00:00:00'); ov.setDate(ov.getDate() + avgCycle - 14);   // 黄体期固定 14 天反推排卵日
      ovulation = ov.getFullYear() + '-' + String(ov.getMonth() + 1).padStart(2, '0') + '-' + String(ov.getDate()).padStart(2, '0');
    }
    let regular = null;
    if (cycles.length >= 2) {
      const mean = cycles.reduce((s, x) => s + x, 0) / cycles.length;
      const sd = Math.sqrt(cycles.reduce((s, x) => s + (x - mean) * (x - mean), 0) / cycles.length);
      regular = sd <= 4 ? '规律' : (sd <= 7 ? '基本规律' : '波动较大');
    }
    return { avgCycle, avgPeriod, cycles, periodLens, lastStart, nextStart, ovulation, regular };
  },
  // 周期分期：经期 / 卵泡期 / 排卵期 / 黄体期
  _period99Phase(todayKey, stats) {
    if (!stats.lastStart) return null;
    const day = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
    const since = day(stats.lastStart, todayKey);
    if (since < 0) return null;
    if (since < stats.avgPeriod) {
      return { n: '经期', ico: '🩸', c: '#e11d48', d: `第 ${since + 1} 天（共约 ${stats.avgPeriod} 天）`, tip: '注意保暖休息，避免生冷辛辣与剧烈运动' };
    }
    const toOv = day(todayKey, stats.ovulation);   // 排卵日 - 今日（正=排卵在未来 / 负=已过去）
    if (toOv >= -1 && toOv <= 1) {
      return { n: '排卵期', ico: '💜', c: '#8b5cf6', d: '排卵日前后（受孕概率最高时段）', tip: '有备孕计划可把握窗口；无计划请做好防护' };
    }
    if (toOv > 1) {
      return { n: '卵泡期', ico: '🌱', c: '#10b981', d: '经期结束后卵泡发育阶段', tip: '精力回升，适合安排运动与高强度学习' };
    }
    return { n: '黄体期', ico: '🌙', c: '#f59e0b', d: '排卵后至下次经前期', tip: '部分人出现经前综合征（情绪波动/乳房胀痛），属正常生理现象' };
  },

  // ==================== 记录交互 ====================
  // 弹某日的记录表单（date = YYYY-MM-DD；dayRec = 已有记录）
  period99Form(date) {
    const rec = this._period99Day(date);
    const chip = (sel, o) => `<button type="button" class="cs99-sel-cat${sel === o ? ' on' : ''}" onclick="this.parentNode.querySelectorAll('.cs99-sel-cat').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${o}</button>`;
    const multiChip = (selArr, o) => `<button type="button" class="cs99-sel-cat${selArr.includes(o) ? ' on' : ''}" onclick="this.classList.toggle('on')">${o}</button>`;
    const SYMPTOMS = ['腹痛', '腰酸', '头痛', '乳房胀痛', '疲劳', '失眠', '情绪波动', '食欲变化', '腹胀', '痤疮', '腹泻', '便秘'];
    const MOODS = ['平静', '开心', '易怒', '低落', '焦虑', '敏感'];
    this._modal({
      title: `🌷 经期记录 · ${date}`,
      body: `<div style="font-size:13px;line-height:1.9;color:var(--text)">
        <label class="hb99-lbl">今日经血流量（四选一 · 选「无」= 非经期症状日）
          <div class="cs99-sel-cats" id="p99Flow">${['无', '少', '中', '多'].map(o => chip(rec && rec.flow, o)).join('')}</div>
        </label>
        <label class="hb99-lbl">痛经程度（四选一）
          <div class="cs99-sel-cats" id="p99Pain">${['无', '轻微', '中度', '重度'].map(o => chip(rec && rec.pain, o)).join('')}</div>
        </label>
        <label class="hb99-lbl">症状（可多选 · 经前/经期常见）
          <div class="cs99-sel-cats" id="p99Sym">${SYMPTOMS.map(o => multiChip(rec ? (rec.symptoms || []) : [], o)).join('')}</div>
        </label>
        <label class="hb99-lbl">心情（可多选）
          <div class="cs99-sel-cats" id="p99Mood">${MOODS.map(o => multiChip(rec ? (rec.moods || []) : [], o)).join('')}</div>
        </label>
        <label class="hb99-lbl">备注
          <textarea id="p99Note" class="textarea" rows="2" placeholder="如：服用了布洛芬 / 情绪原因 / 生活事件..." style="width:100%">${this.esc(rec ? (rec.note || '') : '')}</textarea>
        </label>
        <div style="font-size:11.5px;color:var(--text-soft)">流量「少及以上」会标记为经期的记录日，周期与预测自动按记录计算；连续记录自动识别为同一次经期。</div>
      </div>`,
      actions: [
        ...(rec ? [{ label: '🗑️ 删除本日', onClick: () => this.period99Del(date) }] : []),
        { label: '保存', primary: true, onClick: () => this.period99SaveDay(date) },
      ],
    });
  },
  _p99Chips(id) {
    return Array.from((document.getElementById(id) || {}).querySelectorAll?.('.cs99-sel-cat.on') || []).map(b => (b.textContent || '').trim());
  },
  period99SaveDay(date) {
    const flow = this._p99Chips('p99Flow')[0] || '无';
    const pain = this._p99Chips('p99Pain')[0] || '';
    const symptoms = this._p99Chips('p99Sym');
    const moods = this._p99Chips('p99Mood');
    const note = String((document.getElementById('p99Note') || {}).value || '').trim();
    if (flow === '无' && !pain && !symptoms.length && !moods.length && !note) {
      return this._flash('今日没有任何记录内容——选点流量 / 症状再保存');
    }
    const p = this._period99();
    const exist = p.logs.find(x => x.date === date);
    const rec = { date, flow, pain, symptoms, moods, note };
    if (exist) Object.assign(exist, rec); else p.logs.push(rec);
    if (p.logs.length > 800) p.logs = p.logs.slice(-800);
    this._period99Save(p);
    this._flash('🌷 已记录 ' + date + (flow !== '无' ? '（经期 · ' + flow + '）' : ''));
    try { this._closeModal(); } catch (e) {}
    this.render_workbench();
  },
  period99Del(date) {
    const p = this._period99();
    p.logs = p.logs.filter(x => x.date !== date);
    this._period99Save(p);
    this._flash('🗑️ 已删除 ' + date + ' 的记录');
    try { this._closeModal(); } catch (e) {}
    this.render_workbench();
  },
  // 设置：周期长度 / 经期长度
  period99SetCfg() {
    const c = parseInt((document.getElementById('p99CfgCycle') || {}).value, 10);
    const l = parseInt((document.getElementById('p99CfgLen') || {}).value, 10);
    if (!(c >= 18 && c <= 45)) return this._flash('周期长度请填 18~45 天');
    if (!(l >= 2 && l <= 10)) return this._flash('经期长度请填 2~10 天');
    const p = this._period99();
    p.settings = { cycleLen: c, periodLen: l };
    this._period99Save(p);
    this._flash('✅ 已保存——无历史数据时预测按此设置；记录 ≥2 次后自动按你的真实周期');
    this.render_workbench();
  },

  // ==================== 页面（数据研究所第 12 库 · 仅女生）====================
  _wbPeriod99(wb, W) {
    // 性别门控：非女生不可用（上架女性用户适配 · 男生显示锁定说明卡）
    if (!this._period99Female()) {
      return `<div class="card" style="margin-bottom:14px">
        <div class="card-title"><span class="ico">🌷</span>经期数据 <span class="sub">女生专属功能</span></div>
        <div class="empty" style="line-height:2;text-align:left">🌷 经期数据为女性用户专属的周期管理功能（月历记录 · 周期预测 · 排卵窗口 · 症状统计）。<br>当前档案性别为「男」——如需使用，请到【数据研究所 → 主人档案】将性别改为「女」。</div>
        <div style="margin:10px 0 4px"><button class="btn btn-ghost" onclick="App._map99OpenData('profile')">🧾 去主人档案</button></div>
      </div>
      <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    }
    const p = this._period99();
    const stats = this._period99Stats();
    const today = Store.today();
    const todayRec = this._period99Day(today);
    const phase = this._period99Phase(today, stats);

    // —— ① 周期状态 hero ——
    let heroHtml;
    if (stats.lastStart) {
      const nextDays = Math.round((new Date(stats.nextStart + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
      const inPeriod = phase && phase.n === '经期';
      heroHtml = `<div class="card" style="background:linear-gradient(135deg,#fdf2f8,#fce7f3 55%,#faf5ff);border:1px solid #fbcfe8">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div style="flex:1;min-width:150px">
            <div style="font-size:12px;font-weight:800;color:#9d174d;letter-spacing:2px">🩸 我的周期</div>
            <div style="font-size:26px;font-weight:900;color:${phase ? phase.c : '#be185d'};margin-top:2px">${phase ? phase.ico + ' ' + phase.n : '待记录'}</div>
            <div style="font-size:12px;color:#9f1239;margin-top:2px">${phase ? phase.d : '记录一次经期后，这里显示当前阶段与预测'}</div>
            <div style="font-size:11.5px;color:#a16207;background:#fef9c3;border-radius:8px;padding:6px 9px;margin-top:6px;display:inline-block">${phase ? '💡 ' + phase.tip : '💡 坚持记录，预测越准'}</div>
          </div>
          <div style="text-align:center;background:#fff;border-radius:14px;padding:10px 14px;border:1px solid #fbcfe8;box-shadow:0 2px 8px rgba(219,39,119,.08)">
            <div style="font-size:11px;color:#9f1239;font-weight:700">${inPeriod ? '经期进行中' : '距下次经期'}</div>
            <div style="font-size:24px;font-weight:900;color:#be185d">${inPeriod ? phase.d.replace(/[^0-9]/g, '') : Math.abs(nextDays)}</div>
            <div style="font-size:11px;color:#9f1239">${inPeriod ? '天' : (nextDays >= 0 ? '天' : '天（已推迟 ' + Math.abs(nextDays) + ' 天）')}</div>
          </div>
        </div>
      </div>`;
    } else {
      heroHtml = `<div class="card" style="background:linear-gradient(135deg,#fdf2f8,#fce7f3);border:1px solid #fbcfe8">
        <div class="card-title"><span class="io">🌷</span>欢迎使用经期数据</div>
        <div style="font-size:12.5px;color:#9f1239;line-height:1.8">点击下方月历中的任意日期（或「记录今日」）开始第一次记录——记录 2 次经期后，周期预测 / 排卵窗口 / 周期分析将自动启用。<br>默认按 28 天周期 / 5 天经期预测，可在下方设置修改。</div>
        <div style="margin-top:10px"><button class="btn btn-primary" onclick="App.period99Form(Store.today())">🩸 记录今日</button></div>
      </div>`;
    }

    // —— ② 月历（当月）——
    const now = Store.beijingDate ? Store.beijingDate(Store.nowBeijing()) : new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const monthKey = y + '-' + String(m + 1).padStart(2, '0');
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;   // 周一=0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const recMap = {}; p.logs.forEach(x => { recMap[x.date] = x; });
    // 预测经期日集合（未来 3 个月）
    const predictSet = new Set();
    if (stats.lastStart) {
      for (let k = 1; k <= 3; k++) {
        const s0 = new Date(stats.lastStart + 'T00:00:00');
        s0.setDate(s0.getDate() + stats.avgCycle * k);
        for (let i = 0; i < stats.avgPeriod; i++) {
          const dd = new Date(s0); dd.setDate(s0.getDate() + i);
          predictSet.add(dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
        }
      }
    }
    // 易孕期（排卵日前 5 天 ~ 后 1 天）
    const fertileSet = new Set();
    if (stats.ovulation) {
      const o0 = new Date(stats.ovulation + 'T00:00:00');
      for (let i = -5; i <= 1; i++) {
        const dd = new Date(o0); dd.setDate(o0.getDate() + i);
        fertileSet.add(dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
      }
    }
    let calHtml = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:8px">';
    ['一', '二', '三', '四', '五', '六', '日'].forEach(w => { calHtml += `<div style="text-align:center;font-size:11px;color:#9f1239;font-weight:800;padding:2px 0">${w}</div>`; });
    for (let i = 0; i < firstDow; i++) calHtml += '<div></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = monthKey + '-' + String(d).padStart(2, '0');
      const rec = recMap[dk];
      const isFlow = this._period99IsFlowDay(rec);
      const isPredict = predictSet.has(dk) && dk > today;
      const isOv = stats.ovulation === dk;
      const isFertile = fertileSet.has(dk);
      const isToday = dk === today;
      let cls = 'p99-day';
      if (isFlow) cls += ' flow';
      else if (isPredict) cls += ' predict';
      if (isOv) cls += ' ov';
      else if (isFertile && !isFlow) cls += ' fertile';
      if (isToday) cls += ' today';
      calHtml += `<div class="${cls}" onclick="App.period99Form('${dk}')"><span>${d}</span>${isOv ? '<i>💜</i>' : ''}</div>`;
    }
    calHtml += '</div>';
    const calCard = `<div class="card">
      <div class="card-title"><span class="ico">📅</span>${y} 年 ${m + 1} 月 · 周期月历 <span class="sub">点击日期记录</span></div>
      ${calHtml}
      <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--text-soft);margin-top:10px;line-height:1.6">
        <span><i class="p99-lg" style="background:#e11d48"></i>经期记录日</span>
        <span><i class="p99-lg" style="background:#fff;border:2px dashed #f472b6"></i>预测经期</span>
        <span><i class="p99-lg" style="background:#ede9fe;border:1px solid #c4b5fd"></i>易孕期</span>
        <span>💜 排卵日</span>
        <span><i class="p99-lg" style="border:2px solid #f59e0b"></i>今天</span>
      </div>
    </div>`;

    // —— ③ 今日速记 ——
    const todayCard = `<div class="card">
      <div class="card-title"><span class="ico">✍️</span>今日速记 <span class="sub">${today}</span></div>
      ${todayRec
        ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0">
            ${todayRec.flow !== '无' ? `<span class="badge red">经血 · ${this.esc(todayRec.flow)}</span>` : ''}
            ${todayRec.pain && todayRec.pain !== '无' ? `<span class="badge" style="background:#fee2e2;color:#b91c1c">痛经 · ${this.esc(todayRec.pain)}</span>` : ''}
            ${(todayRec.symptoms || []).map(s => `<span class="badge green">${this.esc(s)}</span>`).join('')}
            ${(todayRec.moods || []).map(s => `<span class="badge" style="background:#e0e7ff;color:#4338ca">${this.esc(s)}</span>`).join('')}
            <button class="btn btn-sm btn-ghost" style="margin-left:auto" onclick="App.period99Form('${today}')">编辑 ›</button>
          </div>${todayRec.note ? `<div style="font-size:12px;color:var(--text-soft);line-height:1.7">📝 ${this.esc(todayRec.note)}</div>` : ''}`
        : `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px">
            <span style="font-size:12.5px;color:var(--text-soft)">今天还没记录——</span>
            <button class="btn btn-primary" style="margin:0" onclick="App.period99Form(Store.today())">🩸 记录今日</button>
          </div>`}
    </div>`;

    // —— ④ 周期分析 ——
    const last6 = stats.cycles.slice(-6);
    const maxC = Math.max(28, ...last6);
    const bars = last6.map((v, i) => `<div style="flex:1;text-align:center">
      <div style="font-size:10.5px;color:#9f1239;font-weight:800;margin-bottom:3px">${v}天</div>
      <div style="height:${Math.max(8, Math.round(v / maxC * 64))}px;background:linear-gradient(180deg,#f472b6,#db2777);border-radius:6px 6px 0 0;margin:0 3px"></div>
      <div style="font-size:10px;color:var(--text-soft);margin-top:3px">第${stats.cycles.length - last6.length + i + 1}次</div>
    </div>`).join('');
    const symCount = {};
    p.logs.forEach(x => (x.symptoms || []).forEach(s => { symCount[s] = (symCount[s] || 0) + 1; }));
    const topSym = Object.entries(symCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const painCount = {};
    p.logs.forEach(x => { if (x.pain && x.pain !== '无') painCount[x.pain] = (painCount[x.pain] || 0) + 1; });
    const statCard = `<div class="card">
      <div class="card-title"><span class="ico">📊</span>周期分析 <span class="sub">${stats.lastStart ? '按 ' + stats.cycles.length + ' 个完整周期' : '记录 2 次经期后启用'}</span></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;text-align:center">
        <div style="background:#fdf2f8;border-radius:10px;padding:8px 4px"><b style="font-size:18px;color:#be185d">${stats.avgCycle}</b><div style="font-size:10.5px;color:var(--text-soft)">平均周期(天)</div></div>
        <div style="background:#fdf2f8;border-radius:10px;padding:8px 4px"><b style="font-size:18px;color:#be185d">${stats.avgPeriod}</b><div style="font-size:10.5px;color:var(--text-soft)">平均经期(天)</div></div>
        <div style="background:#fdf2f8;border-radius:10px;padding:8px 4px"><b style="font-size:18px;color:#be185d">${stats.regular || '—'}</b><div style="font-size:10.5px;color:var(--text-soft)">周期规律性</div></div>
        <div style="background:#fdf2f8;border-radius:10px;padding:8px 4px"><b style="font-size:18px;color:#be185d">${stats.lastStart ? stats.lastStart.slice(5) : '—'}</b><div style="font-size:10.5px;color:var(--text-soft)">上次经期开始</div></div>
      </div>
      ${last6.length ? `<div style="display:flex;align-items:flex-end;margin-top:14px">${bars}</div>` : ''}
      ${stats.nextStart ? `<div style="font-size:12px;color:#9f1239;background:#fce7f3;border-radius:10px;padding:8px 11px;margin-top:10px;line-height:1.8">🔮 下次经期预测：<b>${stats.nextStart}</b>（${stats.ovulation} 前后为排卵窗口）——预测基于历史周期均值，实际可能前后浮动几天。</div>` : ''}
      ${topSym.length || painCount ? `<div style="margin-top:12px;font-weight:800;font-size:12.5px">🩹 症状频率</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          ${Object.entries(painCount).map(([k, v]) => `<span class="badge red">痛经·${this.esc(k)} ×${v}</span>`).join('')}
          ${topSym.map(([k, v]) => `<span class="badge green">${this.esc(k)} ×${v}</span>`).join('')}
        </div>` : ''}
    </div>`;

    // —— ⑤ 经期护理知识 + 设置 ——
    const tipsCard = `<div class="card">
      <div class="card-title"><span class="ico">📖</span>经期护理小知识</div>
      <div style="font-size:12px;color:var(--text-soft);line-height:2">
        🌡️ <b>保暖第一</b>：腰腹保暖可缓解子宫平滑肌痉挛，痛经严重可用热敷袋敷下腹；<br>
        🍵 <b>饮食</b>：少生冷辛辣，适量温热水；补铁（瘦肉/菠菜）弥补经血流失；<br>
        🏃 <b>运动</b>：经期前 2 天避免剧烈运动与倒立体式，散步/拉伸有助缓解不适；<br>
        💊 <b>止痛药</b>：布洛芬等 NSAIDs 在疼痛初起时服用效果最好，按说明书剂量；<br>
        🩸 <b>卫生</b>：卫生巾 2~4 小时更换，棉条 4~8 小时务必更换，防感染；<br>
        ⚠️ <b>就医信号</b>：经期 >10 天、周期 <21 天或 >45 天、痛经影响生活、经量骤增——建议妇科就诊。
      </div>
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">⚙️</span>周期设置 <span class="sub">无历史数据时的预测基准</span></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:8px">
        <div class="field" style="margin:0"><label>周期长度（天）</label><input type="number" id="p99CfgCycle" class="input" min="18" max="45" value="${p.settings.cycleLen}" style="width:110px"></div>
        <div class="field" style="margin:0"><label>经期长度（天）</label><input type="number" id="p99CfgLen" class="input" min="2" max="10" value="${p.settings.periodLen}" style="width:110px"></div>
        <button class="btn btn-primary" style="margin:0" onclick="App.period99SetCfg()">保存设置</button>
      </div>
      <div style="font-size:11.5px;color:var(--text-soft);margin-top:8px;line-height:1.7">记录 2 次及以上经期后，预测自动改用你的真实周期均值。本功能为健康管理记录工具，预测与易孕窗口仅供参考，不构成医疗建议。</div>
    </div>`;

    return `
    <style>
      .p99-day{position:relative;height:38px;border-radius:9px;background:#fff;border:1px solid #f3e8ef;display:flex;align-items:center;justify-content:center;font-size:12.5px;cursor:pointer;color:var(--text);font-weight:700}
      .p99-day:hover{border-color:#f472b6}
      .p99-day.flow{background:linear-gradient(135deg,#fb7185,#e11d48);border-color:#e11d48;color:#fff}
      .p99-day.predict{background:#fff0f6;border:2px dashed #f472b6;color:#be185d}
      .p99-day.fertile{background:#ecfdf5;border-color:#a7f3d0}
      .p99-day.ov{background:#ede9fe;border:2px solid #a78bfa;color:#6d28d9}
      .p99-day.today{outline:2px solid #f59e0b;outline-offset:1px}
      .p99-day i{position:absolute;top:1px;right:2px;font-size:8px;font-style:normal}
      .p99-lg{display:inline-block;width:11px;height:11px;border-radius:4px;vertical-align:-1px;margin-right:3px}
    </style>
    <div class="card" style="margin-bottom:12px;display:flex;align-items:center;gap:10px">
      <div class="card-title" style="margin:0"><span class="ico">🌷</span>经期数据 <span class="sub">数据研究所第 12 库 · 女生专属</span></div>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.navBack()">← 返回</button>
    </div>
    ${heroHtml}
    ${calCard}
    ${todayCard}
    ${statCard}
    ${tipsCard}
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
  },
});
