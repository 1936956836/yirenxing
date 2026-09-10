// 55-insight.js —— 阿福主动洞察（异常模式预警）（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G4-数据洞察 / G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
Object.assign(App, {
  // ===== 阿福主动洞察：启动时扫描近 8 个数据日的异常模式（被动问答 → 主动预警） =====
  // 数据日口径：当日有任意打卡才算（完全没打卡的日子不参与，避免"没用 App"被误判成"没喝水"）；
  // 今日尚未结束不参与判定（否则凌晨启动必误报熬夜）。命中才弹卡，当日最多弹一次。
  _afuInsightScan() {
    const h = Store.getHabit99();
    const mr = (Store.load().medicalRecords || []);
    const hasChronic = mr.some(r => (r.tags || []).includes('hiv') || (r.tags || []).includes('tp') || r.disease === 'hiv' || r.disease === 'tp');
    const waterGoal = this._hb99WaterGoal();
    const days = [];
    for (let i = 1; i <= 8; i++) {
      const dk = this._hb99DkOff(-i);
      const raw = (h.days || {})[dk];
      if (raw && Object.keys(raw).length) days.push({ dk, s: Store._habit99SummaryOf(h, dk) });
    }
    const head = days.slice(0, 3); // 最近 3 个数据日
    const alerts = [];
    // ① 连续 3 天熬夜（夜间睡眠 <6h）
    if (head.length === 3 && head.every(x => x.s.nightH > 0 && x.s.nightH < 6)) {
      const avg = (head.reduce((a, x) => a + x.s.nightH, 0) / 3).toFixed(1);
      alerts.push({ ico: '🌙', t: `连续 3 天熬夜（平均仅 ${avg}h）`, d: '肝/脑/免疫在持续失血——连续熬夜的恢复成本远高于单日。今晚 23:00 前熄灯，把周期掰回来。' });
    }
    // ② 连续 2 天漏药（有慢性病时才判：漏药在器官建模是重罪）
    if (hasChronic && head.length >= 2 && head.slice(0, 2).every(x => x.s.medicineAVMissed || !x.s.medicineTaken)) {
      alerts.push({ ico: '💊', t: '连续 2 天漏服药物', d: '免疫防线每日 -45 分级别的重罪，病毒反弹风险窗口已经打开。现在补服一次，并到【习惯·服药】打卡。' });
    }
    // ③ 连续 3 天饮水不达标
    if (head.length === 3 && head.every(x => x.s.waterMl < waterGoal)) {
      const avg = Math.round(head.reduce((a, x) => a + x.s.waterMl, 0) / 3);
      alerts.push({ ico: '💧', t: `连续 3 天饮水不达标（平均 ${avg}ml / 目标 ${waterGoal}ml）`, d: '肾排毒持续受阻。从现在起每 90 分钟喝 200ml，今晚睡前把今日份额补完。' });
    }
    // ④ 健康指数连续走低：最近 4 个数据日指数逐日下滑且累计跌幅 ≥8 分
    if (days.length >= 4) {
      const idx = days.slice(0, 4).map(x => this._afuHealthIndex(x.s, hasChronic).score);
      if (idx[0] < idx[1] && idx[1] < idx[2] && idx[2] < idx[3] && (idx[3] - idx[0]) >= 8)
        alerts.push({ ico: '📉', t: `健康指数连续走低（${idx[3]} → ${idx[0]} 分）`, d: '整体状态在持续恶化。去【习惯·健康数据】看周趋势与器官恶化主因，找一根能先拽住的线头。' });
    }
    return alerts;
  },
  checkAfuInsights() {
    try {
      if (Store.getSetting('afu_insight_last', '') === Store.today()) return;
      const alerts = this._afuInsightScan();
      if (!alerts.length) return;
      Store.setSetting('afu_insight_last', Store.today());
      setTimeout(() => {
        this._modal({
          title: '🧑‍⚕️ 阿福主动预警',
          body: `<div style="font-size:12.5px;color:#64748b;margin-bottom:10px">阿福扫了近 8 个打卡日的模式，发现 ${alerts.length} 个正在变坏的趋势：</div>` +
            alerts.map(a => `
              <div style="display:flex;gap:10px;padding:10px 12px;border-radius:12px;background:#fef2f2;border:1.5px solid #fecaca;margin-bottom:8px">
                <div style="font-size:20px;line-height:1.2">${a.ico}</div>
                <div>
                  <div style="font-weight:800;color:#b91c1c;font-size:13.5px">${this.esc(a.t)}</div>
                  <div style="font-size:12.5px;color:#64748b;margin-top:3px;line-height:1.6">${this.esc(a.d)}</div>
                </div>
              </div>`).join(''),
          actions: [{ label: '收到，马上调整' }],
        });
      }, 4200);
    } catch (e) { console.warn('afu insights failed', e); }
  },
  _wbDailyLog99(wb, W) {
    const h = Store.getHabit99();
    // 找最近有打卡数据的一天（当日优先，回退昨日，保证分析有据 · 北京日期口径）
    const today = Store.today();
    const yk = this._hb99DkOff(-1);
    const analyzeDk = (h.days[today] && Object.keys(h.days[today]).length) ? today : ((h.days[yk] && Object.keys(h.days[yk]).length) ? yk : today);
    const s = Store.habit99DailySummary(analyzeDk);
    // 疾病数据：就医数据中有需长期用药的慢性病（HIV/梅毒等）时，漏服药物将重创免疫
    const mr = (Store.load().medicalRecords || []);
    const hasChronic = mr.some(r => (r.tags || []).includes('hiv') || (r.tags || []).includes('tp') || r.disease === 'hiv' || r.disease === 'tp');
    const organs = this._afuOrganModel(s, hasChronic);
    const afu = this._afuHealthAnalysis(s, { list: organs, hasChronic });
    const idxColor = afu.idx >= 75 ? '#16a34a' : afu.idx >= 60 ? '#ca8a04' : afu.idx >= 40 ? '#ea580c' : '#dc2626';
    // v2026.0906 心情/健康卡数据 + 阿福就医建议（健康卡「小病缠身」时按症状分级给出就诊指导）
    const moodHealthCard = (() => {
      if (!s.moodCnt && !s.healthStatus) return '';
      const moodArr = Array.isArray((h.days[analyzeDk] || {}).mood) ? h.days[analyzeDk].mood : [];
      const moodEls = moodArr.slice(-4).reverse().map(m => `<div class="hb99-row"><b>${String(m.ts || '').replace('T', ' ').slice(11, 16) || '--:--'}</b><span>${this.esc(m.type || '?')}${m.reason ? ' · ' + this.esc(m.reason) : ''}</span></div>`).join('');
      let adviceHTML = '';
      if (s.healthSick && s.healthSymptoms.length) {
        const adv = this._afuMedAdvice(s.healthSymptoms);
        const lvBadge = (lv) => lv >= 3 ? '<span style="background:#dc2626;color:#fff;font-size:11px;font-weight:800;padding:1px 8px;border-radius:999px">紧急 · 优先急诊</span>'
          : (lv === 2 ? '<span style="background:#ea580c;color:#fff;font-size:11px;font-weight:800;padding:1px 8px;border-radius:999px">警示 · 按加重条件转诊</span>'
          : '<span style="background:#65a30d;color:#fff;font-size:11px;font-weight:800;padding:1px 8px;border-radius:999px">自护 · 限期观察</span>');
        adviceHTML = `<div style="margin-top:10px;padding:12px;border-radius:12px;background:${adv.urgent ? '#fef2f2' : '#fffbeb'};border:1.5px solid ${adv.urgent ? '#fecaca' : '#fde68a'}">
          <div style="font-weight:800;color:${adv.urgent ? '#b91c1c' : '#b45309'};font-size:13.5px">${this._afu99AvatarHtml(17, 'pxafu-inline')}阿福就医建议${adv.urgent ? ' · ⚠️ 存在紧急症状' : ''}</div>
          <div style="margin-top:6px;font-size:12.5px;line-height:1.9;color:#475569">
            ${adv.list.map(a => `<div>${a.ico} <b>${this.esc(a.s)}</b> ${lvBadge(a.lv)}<div style="margin:2px 0 6px">${this.esc(a.t)}</div></div>`).join('')}
          </div>
          ${adv.urgent ? `<div style="font-size:12px;color:#b91c1c;font-weight:700;margin-top:4px">出现症状进展（喉头发紧/无法止血/意识模糊等）请立即前往急诊，不要等待观察！</div>` : ''}
          <div style="font-size:11.5px;color:#64748b;margin-top:4px">以上症状已自动同步至【数据中心 → 就医数据 → 急诊科】，请到就医数据中完善疾病开始时间、治疗场所与治疗方式。</div>
        </div>`;
      }
      return `<div class="card" style="margin-bottom:14px">
        <div class="card-title"><span class="ico">🩺</span>心情 / 健康卡 · 当日记录${adviceHTML ? '与就医建议' : ''}</div>
        <div style="font-size:12.5px;line-height:1.9;margin-top:6px">
          ${s.moodCnt ? `<div>😊 心情：今日记录 <b>${s.moodCnt}</b> 次${s.moodLastType ? ` · 最近「${this.esc(s.moodLastType)}」` : ''}${s.moodLastReason ? ` · ${this.esc(s.moodLastReason)}` : ''}</div>` : ''}
          ${s.healthStatus ? (s.healthSick
            ? `<div>🤒 健康：<b style="color:#dc2626">小病缠身</b>${s.healthSymptoms.length ? `（${this.esc(s.healthSymptoms.join('、'))}）` : ''}</div>`
            : (s.healthRecheck
              ? `<div>🔬 健康：<b style="color:#7c3aed">大病复查</b> · ${this.esc(s.healthRecheck.disease)}${s.healthRecheck.acts.length ? `（${this.esc(s.healthRecheck.acts.join('、'))}）` : ''}——复查记录已同步【数据中心 → 就医数据 → 感染科】${s.medCostAmount > 0 ? ` · 当日医疗消费 ${s.medCostAmount} 元` : ' · 可在【医疗消】卡记录本次花费'}</div>`
              : `<div>💚 健康：<b style="color:#16a34a">感觉良好</b>，继续保持～</div>`)) : ''}
        </div>
        ${moodEls ? `<div style="margin-top:8px;font-weight:700;font-size:12.5px">今日心情记录（最近 4 次）</div><div style="max-height:150px;overflow:auto">${moodEls}</div>` : ''}
        ${adviceHTML}
      </div>`;
    })();
    // v2026.0906 健康模型小卡导航：健康数据首页只保留小卡，点击进入对应模型专页（不再整页滑动很久）
    //   v12.9：健身六分化模型已删除（运动分析迁至【数据中心 → 运动数据 · 分析站】）
    // —— 模型 1：五脏六腑（取最弱器官做小卡摘要）——
    const weakOrgan = organs.slice().sort((a, b) => a.score - b.score)[0] || null;
    const organAvg = Math.round(organs.reduce((s2, o) => s2 + o.score, 0) / Math.max(1, organs.length));
    // —— 模型 2：消化代谢（糖/钠/脂肪摄入状态）——
    const meta = this._afuMetaModel(analyzeDk);
    const dates = Object.keys(h.days).sort().reverse().slice(0, 60);
    // v12.9.46 「今天吃什么」盲盒卡（97-food99.js · 页面置顶）
    let html = (this._food99BoxCard ? this._food99BoxCard() : '');
    html += `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🍜</span>饮食数据 · 每日习惯结算 + 两大健康模型
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">v12.9.46 更名（原「健康数据」）· 分析 ${analyzeDk === today ? '当日' : '昨日（当日暂无打卡）'}</span>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">每日 24 点自动结算，管家阿福结合习惯数据推算健康指数；两大模型已收进下方小卡，点击进入专页：<b>五脏六腑模型</b>（器官健康度透视）· <b>消化代谢模型</b>（糖/脂肪/钠/维生素摄入分析）；运动与体脂数据见【数据中心 → 运动数据】。</div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="App.gotoWb('habit')">🌿 去打卡</button>
        <button class="btn btn-sm btn-ghost" onclick="App._dc99Set('tab','home')">📊 数据中心</button>
        <button class="btn btn-sm btn-ghost" onclick="App.navBack()">← 返回上一页</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico pxafu"></span>管家阿福 · 当日健康指数分析</div>
      <div class="afu-idx-wrap">
        <div class="afu-idx-ring" style="background:conic-gradient(${idxColor} ${afu.idx * 3.6}deg, #e2e8f0 0deg)">
          <div class="afu-idx-num" style="color:${idxColor}">${afu.idx}</div>
        </div>
        <div class="afu-idx-info">
          <div style="font-size:15px;font-weight:900;color:${idxColor}">${afu.lv}</div>
          <div style="font-size:12px;color:var(--text-soft);line-height:1.7;margin-top:4px">${this.esc(afu.chain)}</div>
          ${afu.good.length ? `<div style="font-size:12px;color:#16a34a;margin-top:4px">✅ 亮点：${afu.good.map(x => this.esc(x)).join('、')}</div>` : ''}
        </div>
      </div>
      <div class="afu-worst"><b>🫀 最需要关照的器官：</b>${this.esc(afu.worst)}</div>
      <div class="afu-tips"><b>${this._afu99AvatarHtml(16, 'pxafu-inline')}阿福的建议：</b>${afu.tips.map(t => this.esc(t)).join('；')}。</div>
      ${(() => { const tr = this._afuOrganTrend(); if (!tr) return '';
        if (!tr.drops.length) return `<div style="font-size:12px;color:#15803d;margin-top:8px">📈 近 7 日趋势：各器官均分平稳（阿福指数均值 ${tr.curIdx}），无恶化迹象。</div>`;
        return `<div style="font-size:12px;color:#b45309;margin-top:8px">📉 近 7 日趋势：${tr.drops.map(d => `${d.ico}${d.name} ${d.d} 分`).join('、')}${tr.reasons.length ? `（主因 ${tr.reasons.join('、')}）` : ''}；阿福指数均值 ${tr.curIdx}，较前一周 ${tr.idxDelta > 0 ? '+' : ''}${tr.idxDelta}。</div>`;
      })()}
    </div>
    ${moodHealthCard}
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🧠</span>两大健康模型 · 点击小卡进入专页
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">专页内含完整建模图与逐项分析</span>
      </div>
      <div class="model-nav-grid">
        <div class="model-nav-card" style="background:linear-gradient(150deg,#fef2f2,#fff)" onclick="App.gotoWb('modelOrgan')">
          <div class="mn-ico">🫀</div>
          <div class="mn-name">五脏六腑模型</div>
          <div class="mn-desc">器官健康度透视</div>
          <div class="mn-stat" style="color:${this._afuOrganColor(organAvg)}">均分 ${organAvg} · 弱项 ${weakOrgan ? weakOrgan.name : '—'}</div>
          <div class="mn-go">进入模型 →</div>
        </div>
        <div class="model-nav-card" style="background:linear-gradient(150deg,#f0fdfa,#fff)" onclick="App.gotoWb('modelMeta')">
          <div class="mn-ico">🍜</div>
          <div class="mn-name">消化代谢模型</div>
          <div class="mn-desc">糖/脂肪/钠/维生素分析</div>
          <div class="mn-stat" style="color:${meta.load.color}">糖负荷 ${meta.load.lv} · ${meta.naPct >= 100 ? '钠超标' : '钠正常'}</div>
          <div class="mn-go">进入模型 →</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><span class="ico">📋</span>每日结算历史（近 60 天）</div>
      ${dates.length ? `<div style="overflow:auto;margin-top:8px"><table class="hb99-table"><thead><tr><th>日期</th><th>吃饭</th><th>喝水</th><th>大便</th><th>小便</th><th>运动</th><th>学习</th><th>午觉</th><th>晚觉</th><th>健身</th><th>正气</th><th>心情</th><th>健康</th></tr></thead><tbody>
        ${dates.map(dk => { const r = Store.habit99DailySummary(dk);
          return `<tr><td>${r.date.slice(5)}</td><td>${r.meals}/3 餐</td><td>${r.waterL} L</td><td>${r.poopCnt} 次</td><td>${r.peeCnt} 次</td><td>${r.sportMin || 0} min</td><td>${r.studyMin} min</td><td>${r.napMin} min</td><td>${r.nightH} h</td><td>${r.fitnessDone ? '💪' : '—'}</td><td>${r.zhengqiClean === true ? '未破' : (r.zhengqiLevel || '—')}</td><td>${r.moodCnt ? (r.moodLastType || '') + '×' + r.moodCnt : '—'}</td><td>${r.healthStatus ? (r.healthSick ? '🤒小病' : (r.healthRecheck ? '🔬复查' : '✅良好')) : '—'}</td></tr>`; }).join('')}
      </tbody></table></div>` : '<div class="empty">还没有习惯打卡数据，先去【习惯】打卡吧～</div>'}
    </div>
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  // v2026.0906 模型专页 1：五脏六腑模型（器官 SVG + 列表 + 趋势 + 体检建议，自健康数据首页拆出）
  _wbModelOrgan(wb, W) {
    const h = Store.getHabit99();
    const today = Store.today();
    const yk = this._hb99DkOff(-1);
    const analyzeDk = (h.days[today] && Object.keys(h.days[today]).length) ? today : ((h.days[yk] && Object.keys(h.days[yk]).length) ? yk : today);
    const s = Store.habit99DailySummary(analyzeDk);
    const mr = (Store.load().medicalRecords || []);
    const hasChronic = mr.some(r => (r.tags || []).includes('hiv') || (r.tags || []).includes('tp') || r.disease === 'hiv' || r.disease === 'tp');
    const organs = this._afuOrganModel(s, hasChronic);
    // —— 器官建模 SVG（人体解剖式透视图：真实器官形态）——
    const organSvg = (() => {
      const g = (id) => (organs.find(o => o.id === id) || { score: 100, hits: [], name: id });
      const col = (id) => this._afuOrganColor(g(id).score);
      const tip = (id) => { const o = g(id); return `${o.name}：${o.score} 分（${this._afuOrganLevel(o.score)}）${o.hits.length ? '\n' + o.hits.join('\n') : ''}`; };
      const F = (id, d) => `<path d="${d}" fill="${col(id)}" opacity="0.9" stroke="#ffffff" stroke-width="1.2"><title>${tip(id)}</title></path>`;                // 填充形器官
      const D = (id, d, w) => `<path d="${d}" fill="none" stroke="${col(id)}" stroke-width="${w}" stroke-linecap="round" opacity="0.9"><title>${tip(id)}</title></path>`; // 线条形器官（气管/肠）
      const L = (d) => `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.55" stroke-linecap="round"/>`;                                    // 器官内部细节（沟回/胃纹/肾门）
      const lb = (id, x, y, anchor) => { const o = g(id); return `<text x="${x}" y="${y}" font-size="10" font-weight="800" text-anchor="${anchor}" fill="${col(id)}">${o.name} ${o.score}</text>`; };
      const ld = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cbd5e1" stroke-width="0.8" stroke-dasharray="2,2"/>`;
      return `<svg viewBox="0 0 260 334" style="width:100%;max-width:360px;background:#f8fafc;border-radius:14px;display:block;margin:0 auto">
        <!-- 人体轮廓（头+躯干） -->
        <ellipse cx="130" cy="42" rx="30" ry="35" fill="#fdfefe" stroke="#cbd5e1" stroke-width="2"/>
        <path d="M130,74 C110,76 96,80 84,88 C66,98 56,114 54,136 L54,238 C54,272 76,296 112,304 L148,304 C184,296 206,272 206,238 L206,136 C204,114 194,98 176,88 C164,80 150,76 130,74 Z" fill="#fdfefe" stroke="#cbd5e1" stroke-width="2"/>
        <!-- 脊柱 -->
        <path d="M130,96 L130,272" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/>
        <!-- 脑（沟回） -->
        ${F('brain', 'M103,38 C103,26 111,15 126,14 C128,10 134,10 136,14 C149,16 157,25 157,38 C157,50 149,58 139,61 C135,62 126,62 122,61 C111,58 103,50 103,38 Z')}
        ${L('M109,33 C114,29 117,36 122,32 C127,28 130,36 136,32 C140,29 144,35 149,32')}
        ${L('M108,46 C113,42 116,49 121,45 C126,41 129,49 134,45 C138,42 142,47 146,45')}
        ${L('M117,20 C115,26 118,32 116,38')}
        ${L('M141,20 C143,26 140,32 142,38')}
        <!-- 气管与支气管树 -->
        <path d="M130,74 L130,94 M130,94 C125,98 120,102 116,106 M130,94 C135,98 140,102 144,106" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
        <!-- 肺（左右两叶） -->
        ${F('lung', 'M118,104 C108,100 96,102 88,110 C80,118 76,132 76,148 C76,164 80,176 88,182 C94,186 102,184 106,176 C110,168 110,150 110,132 C110,116 112,108 118,104 Z')}
        ${F('lung', 'M142,104 C152,100 164,102 172,110 C180,118 184,132 184,148 C184,164 180,176 172,182 C166,186 158,184 154,176 C150,168 150,150 150,132 C150,116 148,108 142,104 Z')}
        ${L('M96,118 C92,128 92,146 96,160')}
        ${L('M164,118 C168,128 168,146 164,160')}
        <!-- 心（心房+心尖+主动脉） -->
        <path d="M124,108 C120,102 116,98 114,92" fill="none" stroke="${col('heart')}" stroke-width="3.5" stroke-linecap="round" opacity="0.9"><title>${tip('heart')}</title></path>
        ${F('heart', 'M128,116 C124,110 116,108 110,112 C104,116 102,124 105,132 C108,142 118,154 126,162 C130,166 134,164 136,158 C142,146 152,136 154,126 C156,116 150,108 142,108 C136,108 131,112 128,116 Z')}
        ${L('M110,124 C116,128 124,130 130,128')}
        ${L('M112,146 C120,150 128,152 134,150')}
        <!-- 肝（右叶厚左叶薄楔形+镰状韧带+胆囊） -->
        ${F('liver', 'M76,158 C80,150 96,146 112,145 C132,144 148,150 155,156 C158,159 157,163 151,165 C138,169 124,171 114,172 C106,173 100,178 95,184 C88,192 78,194 73,188 C69,183 71,166 76,158 Z')}
        ${L('M112,146 C109,155 109,163 112,172')}
        <ellipse cx="86" cy="195" rx="4.5" ry="6.5" fill="${col('liver')}" opacity="0.75"><title>${tip('liver')}</title></ellipse>
        <!-- 胃（J形：食管入胃底→胃大弯→幽门十二指肠） -->
        ${D('stomach', 'M167,148 C167,153 168,158 170,162', 4.5)}
        ${D('stomach', 'M163,166 C173,159 184,164 186,175 C188,187 180,197 168,198 C160,199 155,193 155,186 C155,181 159,178 163,178', 11)}
        ${D('stomach', 'M155,186 C153,191 150,194 146,194', 5.5)}
        <!-- 脾 -->
        ${F('spleen', 'M196,176 C202,172 206,178 205,185 C204,192 199,195 195,192 C191,189 190,181 196,176 Z')}
        <!-- 肾（双肾豆形+肾门+输尿管） -->
        ${F('kidney', 'M108,206 C102,202 94,204 91,212 C88,220 89,230 95,234 C101,238 108,235 110,227 C111,220 113,210 108,206 Z')}
        ${F('kidney', 'M152,206 C158,202 166,204 169,212 C172,220 171,230 165,234 C159,238 152,235 150,227 C149,220 147,210 152,206 Z')}
        ${L('M97,218 C99,220 103,220 105,218')}
        ${L('M155,218 C157,220 161,220 163,218')}
        ${D('kidney', 'M100,234 C100,242 104,248 110,252 M160,234 C160,242 156,248 150,252', 2)}
        <!-- 肠（结肠框架+小肠盘曲+直肠） -->
        ${D('gut', 'M94,266 L94,240 C94,231 101,225 110,225 L150,225 C159,225 166,231 166,240 L166,266', 7)}
        ${D('gut', 'M104,236 C112,230 120,242 128,236 C136,230 144,242 152,236', 4.5)}
        ${D('gut', 'M104,248 C112,242 120,254 128,248 C136,242 144,254 152,248', 4.5)}
        ${D('gut', 'M106,259 C112,255 118,263 128,259 C138,255 144,263 150,259', 4.5)}
        ${D('gut', 'M130,266 L130,277', 5)}
        <!-- 免疫（淋巴盾+散布淋巴结） -->
        ${F('immune', 'M130,278 C138,278 148,280 154,282 C154,294 146,304 130,308 C114,304 106,294 106,282 C112,280 122,278 130,278 Z')}
        <circle cx="120" cy="287" r="2.6" fill="#ffffff" opacity="0.85"><title>${tip('immune')}</title></circle>
        <circle cx="140" cy="287" r="2.6" fill="#ffffff" opacity="0.85"><title>${tip('immune')}</title></circle>
        <circle cx="130" cy="296" r="2.6" fill="#ffffff" opacity="0.85"><title>${tip('immune')}</title></circle>
        <circle cx="114" cy="296" r="2.2" fill="#ffffff" opacity="0.7"><title>${tip('immune')}</title></circle>
        <circle cx="146" cy="296" r="2.2" fill="#ffffff" opacity="0.7"><title>${tip('immune')}</title></circle>
        <!-- 标签与引线 -->
        ${ld(158,36,210,32)}${lb('brain', 212, 35, 'start')}
        ${ld(76,120,52,116)}${lb('lung', 50, 119, 'end')}
        ${ld(104,140,52,152)}${lb('heart', 50, 155, 'end')}
        ${ld(74,172,52,170)}${lb('liver', 50, 173, 'end')}
        ${ld(186,168,210,168)}${lb('stomach', 212, 171, 'start')}
        ${ld(205,184,212,200)}${lb('spleen', 212, 203, 'start')}
        ${ld(172,216,210,220)}${lb('kidney', 212, 223, 'start')}
        ${ld(92,250,52,254)}${lb('gut', 50, 257, 'end')}
        ${ld(130,309,130,317)}${lb('immune', 130, 327, 'middle')}
      </svg>`;
    })();
    // —— 器官健康度列表 ——
    const organList = organs.map(o => {
      const c = this._afuOrganColor(o.score);
      return `<div class="afu-organ-row">
        <span class="ao-ico">${o.ico}</span>
        <div class="ao-main">
          <div class="ao-top"><b>${o.name}</b><span style="color:${c};font-weight:800">${o.score} · ${this._afuOrganLevel(o.score)}</span></div>
          <div class="ao-bar"><i style="width:${o.score}%;background:${c}"></i></div>
          ${o.hits.length ? `<div class="ao-hits">${o.hits.map(t => this.esc(t)).join('；')}</div>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🫀</span>五脏六腑模型 · 器官健康度透视
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">分析 ${analyzeDk === today ? '当日' : '昨日（当日暂无打卡）'} · 绿=健康 · 黄=轻度 · 橙=中度 · 红=重度</span>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">把每日习惯数据（吃饭/喝水/睡眠/运动/心情/健康卡）映射到 <b>心 / 肝 / 脾 / 肺 / 肾 / 胃 / 肠 / 脑 / 免疫</b> 9 大器官，逐项给出健康度评分；点击器官图可查看损伤原因明细。</div>
      ${organSvg}
      <div style="margin-top:10px">${organList}</div>
      ${hasChronic ? `<div style="font-size:11.5px;color:#b45309;margin-top:8px">⚠️ 已结合您的就医数据（感染科慢性病）：漏服药物对免疫系统的损伤已按重症计。</div>` : ''}
    </div>
    ${this._afuOrganTrend7Card()}
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    // v12.9.11：【体检建议】卡已迁至【数据中心 → 就医数据】（50-habit-data.js _wbIllness99）——本页不再展示
  },
  // v12.9：原「模型专页 2：健身六分化模型」已删除——运动/体脂分析迁至【数据中心 → 运动数据 · 分析站】（86-sport99.js）
  // v2026.0906 模型专页 3：消化代谢模型（第二大模型 · 参考主流饮食健康 App 的当日摄入分析）
  _wbModelMeta(wb, W) {
    const h = Store.getHabit99();
    const today = Store.today();
    const yk = this._hb99DkOff(-1);
    const analyzeDk = (h.days[today] && Object.keys(h.days[today]).length) ? today : ((h.days[yk] && Object.keys(h.days[yk]).length) ? yk : today);
    const m = this._afuMetaModel(analyzeDk);
    const day = h.days[analyzeDk] || {};
    // —— 三餐食物明细 ——
    const MEALS = [['breakfast', '早餐'], ['lunch', '午餐'], ['dinner', '晚餐']];
    const mealRows = MEALS.map(([k, n]) => {
      const rec = day[k];
      if (!rec) return `<div class="hb99-row"><b>${n}</b><span style="color:#94a3b8">未打卡</span></div>`;
      const foods = (rec.foods || []);
      const nutri = foods.map(f => (this._afuFoodNutriTable()[f] || this._afuFoodNutriTable()['其他']));
      const cal = nutri.reduce((s, x) => s + x.cal, 0);
      return `<div class="hb99-row"><b>${n} · ${rec.time || '--:--'}</b><span>${foods.join('/') || '—'} · 约 ${cal} kcal · ${rec.quality || '-'}★</span></div>`;
    }).join('');
    // —— 消化四器官影响分析 ——
    const sysRow = (o) => `
      <div class="afu-organ-row">
        <span class="ao-ico">${o.ico}</span>
        <div class="ao-main">
          <div class="ao-top"><b>${o.name}</b><span style="color:${o.color};font-weight:800">${o.score} · ${o.lv}</span></div>
          <div class="ao-bar"><i style="width:${o.score}%;background:${o.color}"></i></div>
          <div class="ao-hits">${o.hits.map(t => this.esc(t)).join('；')}</div>
        </div>
      </div>`;
    const sysRows = m.systems.map(sysRow).join('');
    // —— 维生素覆盖 ——
    const vitDots = m.vitamins.map(v => `
      <div style="flex:1;min-width:86px;padding:10px 6px;border-radius:12px;text-align:center;background:${v.cover ? '#f0fdf4' : '#fef2f2'};border:1.5px solid ${v.cover ? '#bbf7d0' : '#fecaca'}">
        <div style="font-size:18px">${v.cover ? '✅' : '❌'}</div>
        <div style="font-size:12px;font-weight:800;color:${v.cover ? '#166534' : '#b91c1c'};margin-top:2px">${v.name}</div>
        <div style="font-size:10.5px;color:#64748b;margin-top:2px">${v.src || '未覆盖'}</div>
      </div>`).join('');
    // —— 糖/脂肪/钠进度条 ——
    const bar = (label, val, ref, unit, color, over) => {
      const pct = Math.min(100, Math.round(val / ref * 100));
      return `<div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:12.5px"><b>${label}</b><span style="color:${over ? color : '#475569'};font-weight:800">${Math.round(val)}${unit} / 参考上限 ${ref}${unit}（${pct >= 100 ? '超标' : pct + '%'}）</span></div>
        <div class="ao-bar" style="margin-top:4px"><i style="width:${pct}%;background:${color}"></i></div>
      </div>`;
    };
    // —— 补剂 / 保健品当日记录 ——
    const fmRec = day.fitnessMeal, nmRec = day.nutriMeal, acRec = day.acneClean;
    // v10.0 吃吃消 / 隐私洗 当日记录（明细同步展示）
    const eatArr = Array.isArray(day.eatCost) ? day.eatCost : [];
    const eatRows = eatArr.map(e => {
      const bits = [];
      if (e.sugarInfo) bits.push(`${(e.drinks || []).join('/')} ${e.sugarInfo.sugarLvl} ${e.sugarInfo.drankMl}/${e.sugarInfo.capMl}ml`);
      if ((e.kinds || []).includes('零食')) bits.push('零食');
      if (e.fruit) bits.push(`水果${e.fruit.name} ${e.fruit.ate}`);
      return `<div class="hb99-row"><b>🧋 吃吃消</b><span>${bits.join(' · ') || (e.kinds || []).join('/')} · ${e.amount || '?'}元</span></div>`;
    }).join('');
    const pwRec = (!Array.isArray(day.privacyWash) && day.privacyWash) ? day.privacyWash : null;
    const pwRow = pwRec ? `<div class="hb99-row"><b>🚿 隐私洗</b><span>${(pwRec.parts || []).join('/') || '?'}${pwRec.symptom && pwRec.symptom !== '无' ? ` · ⚠${pwRec.symptom}（已计入肾系统评分）` : ' · 无不适'}</span></div>` : '';
    const suppRows = [
      fmRec ? `<div class="hb99-row"><b>🍗 健身餐补剂</b><span>${(fmRec.items || []).join(' / ')}</span></div>` : '',
      nmRec ? `<div class="hb99-row"><b>💊 营养餐保健品</b><span>${(nmRec.items || []).join(' / ')}</span></div>` : '',
      acRec ? `<div class="hb99-row"><b>🫧 痘清洁</b><span>门店全脸清洁 · ${acRec.pay || ''}${acRec.amount ? ' · ' + acRec.amount + '元' : ''}</span></div>` : '',
    ].filter(Boolean).join('') || `<div class="empty" style="padding:8px 0">今日暂无补剂 / 保健品 / 皮肤护理记录——在【习惯】打卡健身餐 / 营养餐 / 痘清洁后，数据会自动同步到本模型。</div>`;
    return `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🍜</span>消化代谢模型 · 当日摄入分析
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">分析 ${analyzeDk === today ? '当日' : '昨日（当日暂无打卡）'}</span>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">参考主流饮食健康 App 的做法：根据您在【习惯】打卡的三餐食物，自动估算当日 <b>糖 / 脂肪 / 钠 / 维生素</b> 摄入，分析其对 <b>胃 / 肠 / 肝 / 胰</b> 等消化系统的影响，并关联皮肤状态。数据为每份常规估算，仅供饮食结构调整参考。</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:12px">
        <div style="text-align:center;min-width:96px">
          <div class="afu-idx-ring" style="background:conic-gradient(${m.calColor} ${Math.min(100, m.calPct)}%, #e2e8f0 0);width:84px;height:84px">
            <div class="afu-idx-num" style="color:${m.calColor};font-size:15px">${m.calPct}%</div>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">热量 ${Math.round(m.cal)} / ${m.calRef} kcal${m.bmr ? '（按您的 BMR×1.375）' : '（通用参考，去【空间】填档案可个性化）'}</div>
        </div>
        <div style="flex:1;min-width:220px">
          ${bar('🍬 糖（当日估算）', m.sugar, 50, 'g', m.sugarPct >= 100 ? '#dc2626' : m.sugarPct >= 70 ? '#ea580c' : '#16a34a', m.sugarPct >= 100)}
          ${bar('🧈 脂肪（当日估算）', m.fat, 70, 'g', m.fatPct >= 100 ? '#dc2626' : m.fatPct >= 70 ? '#ea580c' : '#16a34a', m.fatPct >= 100)}
          ${bar('🧂 钠（当日估算）', m.na, 2000, 'mg', m.naPct >= 100 ? '#dc2626' : m.naPct >= 70 ? '#ea580c' : '#16a34a', m.naPct >= 100)}
        </div>
      </div>
      <div style="margin-top:8px;padding:9px 12px;background:${m.load.bg};border:1.5px solid ${m.load.border};border-radius:10px;font-size:12px;color:${m.load.text};line-height:1.7">⚖️ <b>综合负荷：${m.load.lv}</b> —— ${m.load.tip}</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🍽️</span>三餐食物 · 营养明细（当日打卡）</div>
      <div style="margin-top:8px">${mealRows}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:6px">估算表按每份常规做法计（如「米饭+两荤一素」≈750kcal/钠1500mg）；「其他」类按均值估算。想更精确可优先勾选列表内食物。</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🧬</span>消化系统 · 影响建模（胃 / 肠 / 肝 / 胰）</div>
      <div style="margin-top:8px">${sysRows}</div>
      ${m.skinNote ? `<div style="margin-top:10px;padding:10px 12px;background:#fdf4ff;border:1.5px solid #f5d0fe;border-radius:10px;font-size:12px;color:#86198f;line-height:1.8">🫧 <b>皮肤关联</b>：${this.esc(m.skinNote)}</div>` : ''}
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">💊</span>维生素覆盖（食物 + 保健品 + 补剂）</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${vitDots}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:8px">食物来源为估算覆盖；【营养餐】打卡的保健品按剂型直接计入覆盖（鱼油计入 D+E）。</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">💉</span>补剂 / 保健品 / 皮肤管理（当日同步）</div>
      <div style="margin-top:8px">${suppRows}</div>
      ${eatRows || pwRow ? `<div class="card-title" style="padding:0;margin:14px 0 0;font-size:13px"><span class="ico">🧋</span>吃吃消 / 隐私洗（当日同步）</div><div style="margin-top:8px">${eatRows}${pwRow}</div>` : ''}
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico pxafu"></span>阿福 · 饮食结构调整建议</div>
      <div class="afu-tips">${m.tips.map(t => this.esc(t)).join('；')}。</div>
    </div>
    ${this._afuRecipeCard(m, analyzeDk)}
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
  },
  // v10.0 科学食谱推送：按 BMI 定主题（增肌/减脂/维持）+ BMR/TDEE 定热量蛋白目标 + 抗炎抗组胺适配
  // 数据源：「空间」个人档案（身高/体重/性别/年龄）经 Store.getBMI/getBMR 计算；每日种子轮换换菜谱
  _afuRecipeCard(m, dk) {
    const profile = Store.getProfile();
    const bmi = m.bmi;
    const theme = !bmi ? 'maintain' : bmi.value < 18.5 ? 'gain' : bmi.value >= 24 ? 'cut' : 'maintain';
    const themeName = { gain: '增肌增重', cut: '减脂控重', maintain: '维持塑形' }[theme];
    const themeIco = { gain: '💪', cut: '🔥', maintain: '⚖️' }[theme];
    const tdee = m.tdee || 2000;
    const targetCal = theme === 'gain' ? tdee + 300 : theme === 'cut' ? tdee - 400 : tdee;
    const protein = bmi && bmi.weight ? Math.round(bmi.weight * (theme === 'gain' ? 1.8 : 1.6)) : null;   // g/天
    const POOL = {
      gain: {
        breakfast: ['燕麦牛奶 + 水煮蛋×2 + 香蕉', '全麦面包 + 花生酱 + 牛奶 + 煎蛋', '杂粮粥 + 鸡蛋 + 坚果一小把', '酸奶 + 燕麦 + 蓝莓', '豆浆 + 菜包 + 鸡蛋'],
        lunch: ['米饭 + 鸡胸肉 + 西兰花（橄榄油）', '牛肉 + 糙米饭 + 芦笋', '三文鱼 + 藜麦 + 彩椒', '虾仁 + 意面 + 菠菜', '鸡腿去皮 + 杂粮饭 + 时蔬'],
        dinner: ['清蒸鱼 + 红薯 + 深色蔬菜', '豆腐牛肉煲 + 小白菜 + 米饭', '虾仁蒸蛋 + 玉米 + 生菜', '瘦猪肉 + 山药 + 西兰花', '鸡蛋羹 + 杂粮饭 + 番茄（熟）'],
        snack: ['牛奶 250ml + 坚果', '酸奶 + 苹果', '蛋白粉/增肌粉（【健身餐】打卡）', '全麦面包 + 鸡蛋', '香蕉 + 牛奶'],
      },
      cut: {
        breakfast: ['水煮蛋 + 无糖豆浆 + 黄瓜', '燕麦 50g + 脱脂奶 + 莓果', '全麦面包 1 片 + 鸡蛋 + 黑咖啡', '鸡蛋羹 + 小番茄', '无糖酸奶 + 蓝莓'],
        lunch: ['糙米饭 + 清蒸鱼 + 大量绿叶菜', '鸡胸沙拉（油醋汁）', '荞麦面 + 虾仁 + 西兰花', '杂粮饭 + 白灼虾 + 冬瓜汤', '牛肉 + 蒸南瓜 + 青菜'],
        dinner: ['魔芋面 + 鸡胸 + 蔬菜', '豆腐海带汤 + 小份杂粮饭', '清炒时蔬 + 虾仁 + 半根玉米', '蔬菜蛋花汤 + 紫薯', '清蒸鳕鱼 + 西兰花'],
        snack: ['无糖酸奶 + 蓝莓', '小番茄 / 黄瓜', '苹果 1 个（槲皮素）', '无糖茶', '水煮蛋 1 个'],
      },
      maintain: {
        breakfast: ['燕麦牛奶 + 鸡蛋 + 蓝莓', '全麦三明治（鸡蛋+生菜）', '杂粮粥 + 鸡蛋 + 小菜', '豆浆 + 全麦包 + 坚果'],
        lunch: ['米饭 + 鱼肉 + 双份蔬菜', '糙米饭 + 鸡腿去皮 + 时蔬', '意面 + 虾仁 + 蔬菜沙拉', '牛肉 + 杂粮饭 + 西兰花'],
        dinner: ['清蒸鱼 + 红薯 + 绿叶菜', '豆腐蔬菜汤 + 小份米饭', '虾仁蒸蛋 + 玉米 + 生菜', '鸡蛋羹 + 杂粮 + 时蔬'],
        snack: ['酸奶 + 苹果', '坚果一小把', '香蕉 + 牛奶', '小番茄 / 黄瓜'],
      },
    };
    const pool = POOL[theme];
    const pick = (arr, n) => (Store.dailySeedPick ? Store.dailySeedPick('meta_recipe_' + theme + '_' + dk, arr, n, { preferUniquePerDay: true }) : arr.slice(0, n));
    const meals = [
      { ico: '🌅', n: '早餐', items: pick(pool.breakfast, 2) },
      { ico: '☀️', n: '午餐', items: pick(pool.lunch, 2) },
      { ico: '🌙', n: '晚餐', items: pick(pool.dinner, 2) },
      { ico: '🥜', n: '加餐', items: pick(pool.snack, 2) },
    ];
    const anti = ['🍎 苹果（槲皮素天然抗组胺）', '🥦 西兰花（萝卜硫素抗炎）', '🐟 新鲜深海鱼（Omega-3）', '🫒 橄榄油 / 姜黄（抗炎烹调）', '🫐 蓝莓/莓果（花青素）', '🍗 新鲜白肉（低组胺蛋白）'];
    const avoid = ['菠菜/番茄/茄子（高组胺，抗组胺期间少碰）', '腌制/加工肉（亚硝酸盐+组胺释放剂）', '酒精（组胺放大器，伤肝伤免疫）', '奶酪/久置剩菜（组胺随储存升高）'];
    return `<div class="card" style="margin-bottom:14px;border:1.5px solid #bbf7d0;background:linear-gradient(180deg,#f0fdf4,#fff)">
      <div class="card-title"><span class="ico">🍱</span>科学食谱 · 今日推送（${themeIco} ${themeName}）
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">按您的 BMI/BMR 定制 · 每日轮换</span>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">
        基于【空间】档案计算：${bmi ? `BMI <b>${bmi.value}</b>（${bmi.label}）` : '未填写身高体重（<b>去【空间】补档案可精确定制</b>）'} · BMR <b>${m.bmr ? Math.round(m.bmr) : '≈' + Math.round(tdee / 1.375)}</b> kcal · 日消耗 TDEE <b>${tdee}</b> kcal
        → ${theme === 'gain' ? '增肌目标热量 <b style="color:#2563eb">TDEE+300</b>' : theme === 'cut' ? '减脂目标热量 <b style="color:#ea580c">TDEE-400</b>' : '维持热量 <b style="color:#16a34a">= TDEE</b>'} ≈ <b>${targetCal}</b> kcal${protein ? ` · 蛋白质 <b>${protein}g/天</b>（1.6-1.8g/kg）` : ''}。
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px">
        ${meals.map(x => `<div style="padding:10px 12px;border-radius:12px;background:#fff;border:1px solid #dcfce7">
          <div style="font-weight:800;font-size:13px;color:#166534">${x.ico} ${x.n}</div>
          ${x.items.map(i => `<div style="font-size:12.5px;color:#334155;margin-top:4px;line-height:1.6">· ${this.esc(i)}</div>`).join('')}
        </div>`).join('')}
      </div>
      <div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#ecfeff;border:1.5px solid #a5f3fc">
        <div style="font-weight:800;font-size:12.5px;color:#0e7490">🌿 抗炎抗组胺加成（长期服用抗组胺者适用）</div>
        <div style="font-size:12px;color:#155e75;line-height:1.8;margin-top:4px">优选：${anti.map(a => this.esc(a)).join(' ｜ ')}</div>
        <div style="font-size:12px;color:#9f1239;line-height:1.8;margin-top:2px">回避：${avoid.map(a => this.esc(a)).join(' ｜ ')}</div>
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-top:8px">食谱为通用科学搭配参考（非医疗建议）；过敏体质/慢性病请遵医嘱调整。完成当日三餐打卡后，本页摄入分析会实时对照目标热量评估盈亏。</div>
    </div>`;
  },
  // v2026.0906 健康数据 · 近 7 日人体部位健康度趋势卡：9 器官逐日分值折线 + 逐器官变化解读
  _afuOrganTrend7Card() {
    const h = Store.getHabit99();
    const mr = (Store.load().medicalRecords || []);
    const hasChronic = mr.some(r => (r.tags || []).includes('hiv') || (r.tags || []).includes('tp') || r.disease === 'hiv' || r.disease === 'tp');
    // 近 7 日（含今日）逐日器官分值；无打卡数据的日子记 null（折线断开，不参与趋势判断）
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dk = this._hb99DkOff(-i);
      const raw = (h.days || {})[dk];
      const has = !!(raw && Object.keys(raw).length);
      const s = has ? Store._habit99SummaryOf(h, dk) : null;
      days.push({
        dk, has,
        label: `${parseInt(dk.slice(5, 7), 10)}/${parseInt(dk.slice(8, 10), 10)}`,
        organs: has ? this._afuOrganModel(s, hasChronic) : null,
      });
    }
    const dataCnt = days.filter(d => d.has).length;
    if (dataCnt < 2) return `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">📉</span>近 7 日 · 人体部位健康度趋势</div>
      <div class="empty">近 7 日打卡数据不足（${dataCnt}/7 天）——器官趋势线需要至少 2 个打卡日才能画出来，先去【习惯】打卡吧。</div>
    </div>`;
    const OCFG = [
      { id: 'brain',  ico: '🧠', name: '脑',   color: '#7c3aed' }, { id: 'heart', ico: '❤️', name: '心',  color: '#ef4444' },
      { id: 'lung',   ico: '🌬️', name: '肺',   color: '#0ea5e9' }, { id: 'liver', ico: '🍶', name: '肝',  color: '#f59e0b' },
      { id: 'stomach',ico: '🍽', name: '胃',   color: '#10b981' }, { id: 'spleen',ico: '🟡', name: '脾',  color: '#ca8a04' },
      { id: 'kidney', ico: '💧', name: '肾',   color: '#06b6d4' }, { id: 'gut',   ico: '🌀', name: '肠',  color: '#f97316' },
      { id: 'immune', ico: '🛡️', name: '免疫', color: '#6366f1' },
    ];
    // —— SVG 多线折线图（340×170）——
    const CW = 340, CH = 170, padL = 26, padR = 8, padT = 10, padB = 20;
    const yOf = (v) => padT + (100 - v) / 100 * (CH - padT - padB);
    const xOf = (i) => padL + i * (CW - padL - padR) / 6;
    const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${padL}" y1="${yOf(v).toFixed(1)}" x2="${CW - padR}" y2="${yOf(v).toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/><text x="${padL - 4}" y="${(yOf(v) + 3).toFixed(1)}" font-size="7.5" text-anchor="end" fill="#94a3b8">${v}</text>`).join('');
    const xLabels = days.map((d, i) => `<text x="${xOf(i).toFixed(1)}" y="${CH - 6}" font-size="8" text-anchor="middle" fill="${d.has ? '#64748b' : '#cbd5e1'}">${d.label}</text>`).join('');
    const lines = OCFG.map(o => {
      const pts = days.map((d, i) => { if (!d.has) return null; const org = d.organs.find(x => x.id === o.id); return org ? [xOf(i), yOf(org.score)] : null; });
      const segs = []; let cur = [];
      pts.forEach(p => { if (p) cur.push(p); else { if (cur.length) segs.push(cur); cur = []; } });
      if (cur.length) segs.push(cur);
      const path = segs.map(seg => seg.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')).join(' ');
      const dots = pts.filter(Boolean).map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.1" fill="${o.color}" stroke="#fff" stroke-width="0.8"/>`).join('');
      return `<path d="${path}" fill="none" stroke="${o.color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
    }).join('');
    const chart = `<svg viewBox="0 0 ${CW} ${CH}" style="width:100%;background:#f8fafc;border-radius:12px">${grid}${xLabels}${lines}</svg>`;
    // —— 逐器官趋势解读（后 3 日均值 - 前 3 日均值）——
    const rows = OCFG.map(o => {
      const seq = days.map(d => { if (!d.has) return null; const org = d.organs.find(x => x.id === o.id); return org ? org.score : null; }).filter(v => v !== null);
      const avg = Math.round(seq.reduce((a, b) => a + b, 0) / seq.length);
      const head = seq.slice(0, 3), tail = seq.slice(-3);
      const headAvg = head.length ? head.reduce((a, b) => a + b, 0) / head.length : avg;
      const tailAvg = tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : avg;
      const delta = Math.round(tailAvg - headAvg);
      const c = this._afuOrganColor(avg);
      const trendTxt = delta >= 3 ? `<span style="color:#15803d">▲ +${delta}</span>` : delta <= -3 ? `<span style="color:#dc2626">▼ ${delta}</span>` : `<span style="color:#94a3b8">— 持平</span>`;
      return `<div class="hb99-row"><b style="color:${c};min-width:64px;display:inline-block">${o.ico} ${o.name} ${avg}</b><span>${trendTxt} · 7 日 ${seq.map(v => `<i style="font-style:normal;color:${this._afuOrganColor(v)};font-size:11px">${v}</i>`).join(' ')}</span></div>`;
    }).join('');
    return `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">📉</span>近 7 日 · 人体部位健康度趋势
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">${dataCnt}/7 天有打卡 · ▲▼ 为后半周 vs 前半周变化</span>
      </div>
      <div style="margin-top:8px">${chart}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:8px;font-size:11px;color:#475569">
        ${OCFG.map(o => `<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${o.color};margin-right:3px;vertical-align:-1px"></i>${o.ico} ${o.name}</span>`).join('')}
      </div>
      <div style="max-height:220px;overflow:auto;margin-top:8px">${rows}</div>
      <div style="font-size:11.5px;color:var(--text-soft);margin-top:6px">分值由每日打卡数据实时推算（缺卡当天该部位不参与），器官连续走低时优先补睡眠 / 饮水 / 三餐这三根支柱。</div>
    </div>`;
  },
  // v2026.0906 健康数据 · 体检建议卡：按【我】档案的性别/年龄 + 器官建模分值生成个性化体检清单
  _afuCheckupCard(organs, hasChronic) {
    // —— 档案：性别 + 年龄（与穿搭档案同口径，出生日期缺省按 21 岁兜底）——
    const p = Store.getProfile();
    const gender = p.gender || '男';
    let age = 21;
    if (p.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) age = Math.max(16, Math.floor((Date.now() - new Date(p.birthDate + 'T00:00:00').getTime()) / (365.25 * 86400000)));
    const isF = gender === '女';
    // —— ① 基础项目（人人必查）——
    const base = [
      { n: '血常规', d: '贫血 / 感染 / 血小板第一道筛查' },
      { n: '尿常规', d: '泌尿系统与肾脏的入门镜' },
      { n: '血压', d: '高血压年轻化，每年至少测一次' },
      { n: '身高体重 + BMI', d: '体重轨迹比单次数值更重要' },
      { n: '视力 + 口腔检查', d: '近视发展与龋齿都靠早发现' },
    ];
    // —— ② 性别专属 ——
    const byGender = isF ? [
      { n: '妇科彩超（子宫附件）', d: '年轻女性高发的囊肿 / 结节排查' },
      { n: '乳腺彩超', d: age >= 40 ? '40 岁后建议彩超 + 钼靶交替做' : '建议每年一次，经期后 7-10 天检查最准' },
      { n: '宫颈癌筛查（TCT，有性生活后）', d: age >= 30 ? '30 岁后建议 TCT + HPV 联合筛查，每 3-5 年一次' : '建议每 3 年一次' },
      { n: '性激素六项（月经紊乱时）', d: '周期乱 / 痘痘爆发 / 备孕前的关键检查' },
      ...(age >= 50 ? [{ n: '骨密度', d: '绝经后骨量流失加速，防骨质疏松' }] : []),
    ] : [
      { n: '肝功能 + 乙肝两对半', d: '了解抗体水平，不足时补种疫苗' },
      { n: '泌尿系统彩超（肾 / 输尿管 / 膀胱）', d: '久坐 + 少水人群结石高发' },
      ...(age >= 45 ? [{ n: '前列腺彩超 + PSA', d: '45 岁起每年查一次，有家族史提前到 40' }] : []),
      ...(age < 26 ? [{ n: '睾丸彩超', d: '年轻男性睾丸肿瘤早期治愈率极高，自检+超声双保险' }] : []),
    ];
    // —— ③ 年龄分层 ——
    const byAge = age <= 25 ? [
      { n: '乙肝表面抗体滴度', d: '疫苗抗体随年月衰减，滴度低要补种' },
      { n: '甲状腺彩超', d: '熬夜与情绪压力人群的甲状腺结节筛查' },
    ] : age <= 35 ? [
      { n: '肝功能 + 肾功能 + 血脂血糖', d: '外卖/熬夜时代的"四件套"，每年一次' },
      { n: '甲状腺彩超', d: '甲状腺结节检出率随年岁上升，早查早安心' },
      { n: '幽门螺杆菌呼气试验', d: '共餐制传播，与胃炎/胃溃疡直接相关' },
    ] : age <= 45 ? [
      { n: '血脂血糖 + 糖化血红蛋白', d: '代谢综合征的早期信号' },
      { n: '腹部彩超（肝胆胰脾肾）', d: '脂肪肝与内脏问题的常规窗口' },
      { n: '心电图', d: '运动后胸闷 / 家族心脏病史者必查' },
      { n: '低剂量胸部CT（吸烟者）', d: '每年一次，替代普通胸片' },
    ] : [
      { n: '胃肠镜', d: '45 岁以上每 3-5 年一次，消化道肿瘤早筛金标准' },
      { n: '颈动脉彩超', d: '心脑血管风险的第一扇窗' },
      { n: '肿瘤标志物联合筛查', d: '每年一次，指标异常需专科复诊' },
      { n: '心脏彩超', d: '评估结构与射血功能' },
    ];
    // —— ④ 器官建模联动（分值 <85 的器官触发定向检查）——
    const weak = (organs || []).filter(o => o.score < 85).sort((a, b) => a.score - b.score);
    const organMap = {
      liver: { n: '肝功能全套 + 腹部彩超', d: '建模显示肝负担偏重——熬夜/饮酒人群加查肝弹性' },
      kidney: { n: '肾功能 + 尿微量白蛋白', d: '建模显示肾排毒承压——少熬夜多喝水后复查' },
      stomach: { n: '幽门螺杆菌 + 胃功能三项', d: '建模显示胃黏膜风险——三餐规律后复评' },
      spleen: { n: '血常规 + 腹部彩超', d: '建模显示脾运化偏弱——中医消化科可选' },
      lung: { n: '肺功能 + 低剂量胸部CT', d: '建模提示肺暴露风险——吸烟者必须做' },
      heart: { n: '心电图 + 心脏彩超', d: '建模提示心血管缺乏锻炼刺激' },
      brain: { n: '血压 + 颈动脉彩超', d: '建模提示睡眠修复不足——先补觉，再筛查' },
      gut: { n: '便常规 + 潜血', d: '建模提示肠道毒素滞留——膳食纤维加量后复查' },
      immune: hasChronic
        ? { n: '感染科随访：CD4 + 病毒载量', d: '就医数据显示慢性感染——按时服药基础上每 3-6 个月复查' }
        : { n: '免疫全套（反复感冒时）', d: '建模提示免疫承压——优先补睡眠再查血' },
    };
    const byOrgan = weak.slice(0, 3).map(o => organMap[o.id]).filter(Boolean).map(x => ({ ...x, weak: true }));
    const sec = (title, sub, items) => `<div style="margin-top:10px;font-weight:800;font-size:12.5px">${title}<span style="font-weight:400;color:#94a3b8;font-size:11px;margin-left:6px">${sub}</span></div>` +
      items.map(x => `<div class="hb99-row"><b>${this.esc(x.n)}</b><span>${this.esc(x.d)}${x.weak ? ' <span style="color:#b45309">（器官建模触发）</span>' : ''}</span></div>`).join('');
    const total = base.length + byGender.length + byAge.length + byOrgan.length;
    return `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🩻</span>体检建议 · 按档案定制
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">${gender} · ${age} 岁 · 共 ${total} 项</span>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">依据【我】中填写的性别与年龄 + 当前器官建模分值生成；档案更新后建议自动随之刷新。</div>
      ${sec('① 基础项目（每年一次）', '', base)}
      ${sec('② 性别专属', `${gender}性适用`, byGender)}
      ${sec('③ 年龄分层', `${age} 岁档`, byAge)}
      ${byOrgan.length ? sec('④ 器官建模触发', '当前弱项定向加查', byOrgan) : ''}
      <div style="margin-top:10px;padding:10px;border-radius:12px;background:#f0fdf4;border:1.5px solid #bbf7d0;font-size:12px;color:#166534;line-height:1.8">${this._afu99AvatarHtml(16, 'pxafu-inline')}<b>阿福体检贴士</b>：抽血项目需空腹 8-12 小时（前一晚 20:00 后禁食，可少量喝白水）；体检前 3 天忌酒、避免剧烈运动；女性经期勿做尿检与妇科检查；报告异常指标请带原件到专科复诊，勿自行网络问诊对号入座。</div>
      ${hasChronic ? `<div style="margin-top:6px;font-size:11.5px;color:#b45309">⚠️ 已结合就医数据：慢性感染随访优先级高于常规体检，请按时到感染科复查。</div>` : ''}
    </div>`;
  },
  // ====== v2026.0906 消化代谢模型（第三大模型）======
  // 食物营养估算表：每份常规做法（糖g/脂肪g/钠mg/热量kcal/维生素覆盖），口径参考主流饮食健康 App 的常用食物库
  _afuFoodNutriTable() {
    return {
      '粥+鸡蛋':       { cal: 300, sugar: 3,  fat: 8,  na: 350,  v: ['B'] },
      '包子+豆浆':     { cal: 420, sugar: 12, fat: 10, na: 680,  v: ['B'] },
      '牛奶+面包':     { cal: 450, sugar: 22, fat: 14, na: 500,  v: ['B', 'D'] },
      '面条':          { cal: 550, sugar: 8,  fat: 12, na: 1300, v: [] },
      '燕麦':          { cal: 280, sugar: 6,  fat: 6,  na: 120,  v: ['B', 'E'] },
      '煎饼':          { cal: 520, sugar: 10, fat: 18, na: 900,  v: [] },
      '米粉':          { cal: 480, sugar: 5,  fat: 8,  na: 1100, v: [] },
      '玉米':          { cal: 220, sugar: 14, fat: 2,  na: 5,    v: ['B', 'E'] },
      '米饭+两荤一素': { cal: 750, sugar: 10, fat: 22, na: 1500, v: ['A', 'C'] },
      '饺子':          { cal: 620, sugar: 8,  fat: 20, na: 1200, v: ['C'] },
      '麻辣烫':        { cal: 700, sugar: 10, fat: 28, na: 2600, v: ['C'] },
      '外卖便当':      { cal: 800, sugar: 14, fat: 30, na: 1900, v: [] },
      '自煮轻食':      { cal: 450, sugar: 8,  fat: 12, na: 600,  v: ['A', 'B', 'C'] },
      '沙拉':          { cal: 260, sugar: 8,  fat: 10, na: 280,  v: ['A', 'C', 'E'] },
      '清淡少油':      { cal: 420, sugar: 8,  fat: 10, na: 700,  v: ['A', 'C'] },
      '米饭+菜':       { cal: 560, sugar: 10, fat: 16, na: 1100, v: ['C'] },
      '水果代餐':      { cal: 300, sugar: 45, fat: 2,  na: 30,   v: ['C'] },
      '其他':          { cal: 550, sugar: 12, fat: 18, na: 1200, v: [] },
    };
  },
  // 消化代谢模型：当日三餐食物 → 糖/脂肪/钠/维生素估算 + 胃/肠/肝/胰影响建模 + 皮肤关联（健身餐/营养餐/痘清洁数据同步）
  _afuMetaModel(dk) {
    dk = dk || Store.today();
    const h = Store.getHabit99();
    const day = h.days[dk] || {};
    const table = this._afuFoodNutriTable();
    // —— 三餐营养累加 ——
    let cal = 0, sugar = 0, fat = 0, na = 0, mealCnt = 0, heavy = false, fiber = false, takeout = false;
    const vFromFood = new Set();
    ['breakfast','lunch','dinner'].forEach(k => {
      const rec = day[k];
      if (!rec || !(rec.ts || rec.makeup)) return;
      mealCnt++;
      (rec.foods || []).forEach(f => {
        const n = table[f] || table['其他'];
        cal += n.cal; sugar += n.sugar; fat += n.fat; na += n.na;
        (n.v || []).forEach(x => vFromFood.add(x));
        if (['麻辣烫','外卖便当','煎饼'].includes(f)) heavy = true;      // 重油重辣
        if (['沙拉','自煮轻食','玉米','燕麦','清淡少油','水果代餐'].includes(f)) fiber = true; // 高纤维
      });
      if (rec.mealType === '外卖') takeout = true;
    });
    // —— v6.9 新卡数据同步：健身餐补剂 / 营养餐保健品 / 痘清洁 ——
    const fmItems = (day.fitnessMeal && Array.isArray(day.fitnessMeal.items)) ? day.fitnessMeal.items : [];
    const nmItems = (day.nutriMeal && Array.isArray(day.nutriMeal.items)) ? day.nutriMeal.items : [];
    const acneDone = !!(day.acneClean && (day.acneClean.ts || day.acneClean.makeup));
    if (fmItems.includes('增肌粉')) { sugar += 25; cal += 260; }
    if (fmItems.includes('蛋白粉')) { cal += 120; }
    if (fmItems.includes('肌酸')) { cal += 10; }
    const vAll = new Set(vFromFood);
    nmItems.forEach(x => {
      if (x === '维生素B') vAll.add('B');
      else if (x === '维生素C') vAll.add('C');
      else if (x === '维生素D') vAll.add('D');
      else if (x === '鱼油') { vAll.add('D'); vAll.add('E'); }
    });
    // —— v10.0 吃吃消数据接入：奶茶/果汁（糖度×容量×实际饮用→糖/热量）+ 水果（果糖/热量按实际食用量）——
    let drinkNote = '', fruitNote = '', fruitCal = 0, fruitFructose = 0;
    const FRUIT_TABLE = { '苹果':[52,10.4],'香蕉':[89,12.3],'橙':[47,9.4],'橘子':[47,9.4],'西瓜':[26,6.2],'葡萄':[69,16.3],'草莓':[32,5.4],'梨':[42,11.4],'桃':[39,8.4],'蓝莓':[57,10],'猕猴桃':[61,9],'菠萝':[50,9.9],'芒果':[60,9.9],'荔枝':[66,15],'龙眼':[71,15],'樱桃':[63,12],'火龙果':[55,8.7],'哈密瓜':[34,7.9],'柚子':[42,6.9] };
    const fruitGrams = (ate) => {
      const s = String(ate || '');
      const numM = s.match(/[\d.]+/);
      const n = numM ? parseFloat(numM[0]) : 1;
      if (/g|克/i.test(s)) return n;
      if (/斤/.test(s)) return n * 500;
      if (/半/.test(s) && !numM) return 100;
      if (/个|只|根|瓣|块|片/.test(s)) return n * 180;
      if (/串/.test(s)) return n * 250;
      if (/盒|杯/.test(s)) return n * 200;
      return n * 150;
    };
    (Array.isArray(day.eatCost) ? day.eatCost : []).forEach(e => {
      if (e.sugarInfo) {
        const perMl = { '无糖': 0, '三分糖': 0.035, '五分糖': 0.055, '七分糖': 0.075, '全糖': 0.10 }[e.sugarInfo.sugarLvl] || 0.05;
        const ratio = Math.min(1, (+e.sugarInfo.drankMl || 0) / (+e.sugarInfo.capMl || 1));
        const sg = Math.round((+e.sugarInfo.capMl || 0) * perMl * ratio);
        sugar += sg;
        cal += Math.round(sg * 4 + (+e.sugarInfo.drankMl || 0) * 0.30);   // 糖 4kcal/g + 奶/果浆基底
        drinkNote += `${drinkNote ? '；' : ''}${(e.drinks || []).join('/')}${e.sugarInfo.sugarLvl} ${e.sugarInfo.drankMl}/${e.sugarInfo.capMl}ml（+约${sg}g 糖）`;
      }
      if (e.fruit && e.fruit.name) {
        const g = fruitGrams(e.fruit.ate);
        const key = Object.keys(FRUIT_TABLE).find(k => (e.fruit.name || '').includes(k));
        const [fCal, fFr] = FRUIT_TABLE[key] || [50, 10];
        const c = Math.round(g / 100 * fCal), fr = Math.round(g / 100 * fFr);
        cal += c; sugar += fr; fruitCal += c; fruitFructose += fr;
        fruitNote += `${fruitNote ? '；' : ''}${e.fruit.name} ${e.fruit.ate}（约${g}g → ${c}kcal / 果糖${fr}g）`;
      }
    });
    // —— v10.0 参考值接入用户 BMI/BMR（「空间」档案计算；无档案回落通用值）——
    // TDEE = BMR × 1.375（轻体力活动）；BMR 用 Mifflin-St Jeor（Store.getBMR）
    const _profile = Store.getProfile();
    const _bmr = (Store.getBMR && Store.getBMR(_profile.gender === 'female' ? 'F' : 'M')) || null;
    const _bmi = (Store.getBMI && Store.getBMI()) || null;
    const calRef = _bmr ? Math.round(_bmr * 1.375) : 2000;
    const sugarRef = 50, fatRef = 70, naRef = 2000;
    const calPct = Math.min(999, Math.round(cal / calRef * 100));
    const sugarPct = Math.min(999, Math.round(sugar / sugarRef * 100));
    const fatPct = Math.min(999, Math.round(fat / fatRef * 100));
    const naPct = Math.min(999, Math.round(na / naRef * 100));
    // —— 综合负荷（钠权重最高）——
    const loadScore = Math.round(sugarPct * 0.35 + naPct * 0.4 + fatPct * 0.25);
    const load = loadScore >= 130
      ? { lv: '重度负荷', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', tip: '糖/脂肪/钠全面偏高，消化系统正超负荷运转——优先减少外卖与重口味，多喝水，近两日饮食尽量清淡。' }
      : loadScore >= 100
        ? { lv: '中度负荷', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', tip: '部分指标超标，胃肠负担加重——下一餐选择清淡做法，控制盐和添加糖。' }
        : loadScore >= 70
          ? { lv: '轻度负荷', color: '#ca8a04', bg: '#fefce8', border: '#fde68a', text: '#a16207', tip: '接近参考上限——继续保持，注意别再加含糖饮料和重口味宵夜。' }
          : { lv: '代谢舒适', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', tip: '当日摄入在各参考范围内，消化系统运转轻松，继续保持～' };
    // —— 消化系统四器官建模（胃/肠/肝/胰）——
    const waterMl = (() => { const w = day.water; return Array.isArray(w) ? w.reduce((s, x) => s + (parseInt(x.amount, 10) || 0), 0) : 0; })();
    const nightH = (day.goodNight && parseFloat(day.goodNight.sleep)) || 0;
    const poopCnt = Array.isArray(day.poop) ? day.poop.length : 0;
    const cap = (x) => Math.max(20, Math.min(100, Math.round(x)));
    // 胃：重油辣/高钠/外卖/三餐不规律损伤
    const stomachHits = [];
    let stomach = 92;
    if (heavy) { stomach -= 18; stomachHits.push('重油重辣刺激胃黏膜'); }
    if (naPct >= 100) { stomach -= 12; stomachHits.push(`钠摄入超标（${Math.round(na)}mg）损伤胃壁`); }
    else if (naPct >= 70) { stomach -= 6; stomachHits.push('钠摄入偏高'); }
    if (mealCnt === 0) { stomach -= 20; stomachHits.push('三餐均未打卡（进食不规律）'); }
    else if (mealCnt === 1) { stomach -= 10; stomachHits.push('仅 1 餐记录（空腹时间长，胃酸刺激）'); }
    else if (mealCnt === 2) { stomach -= 4; }
    if (takeout) { stomach -= 6; stomachHits.push('外卖油脂多，胃排空慢'); }
    if (!stomachHits.length) stomachHits.push('三餐规律 · 负荷在参考范围内');
    stomach = cap(stomach);
    // 肠：高纤维/饮水/排便加成，外卖损伤
    const gutHits = [];
    let gut = 90;
    if (fiber) { gut += 8; gutHits.push('高纤维食物促进肠道蠕动'); }
    if (waterMl >= 1300) { gut += 6; gutHits.push(`饮水达标（${(waterMl / 1000).toFixed(1)}L）软化粪便`); }
    else if (waterMl > 0 && waterMl < 800) { gut -= 8; gutHits.push('饮水偏少，肠道水分不足'); }
    else if (waterMl === 0) { gut -= 6; gutHits.push('当日未记录饮水'); }
    if (poopCnt === 0) { gut -= 12; gutHits.push('当日未排便（毒素滞留风险）'); }
    else if (poopCnt >= 1) gutHits.push(`排便 ${poopCnt} 次`);
    if (takeout) { gut -= 6; gutHits.push('外卖低纤维，肠道菌群承压'); }
    if (!gutHits.length) gutHits.push('运转平稳');
    gut = cap(gut);
    // 肝：脂肪/果糖/熬夜损伤
    const liverHits = [];
    let liver = 92;
    if (fatPct >= 100) { liver -= 15; liverHits.push(`脂肪摄入超标（${Math.round(fat)}g），脂肪肝风险上升`); }
    else if (fatPct >= 70) { liver -= 8; liverHits.push('脂肪摄入偏高'); }
    if (sugar >= 60) { liver -= 8; liverHits.push(`糖摄入 ${Math.round(sugar)}g，果糖加重肝脏代谢负担`); }
    if (nightH > 0 && nightH < 6.5) { liver -= 10; liverHits.push(`仅睡 ${nightH}h，夜间修复不足`); }
    if (nmItems.includes('鱼油')) { liver += 4; liverHits.push('鱼油 Omega-3 辅助调节血脂'); }
    if (!liverHits.length) liverHits.push('脂肪/糖负荷正常');
    liver = cap(liver);
    // 胰：糖负荷主战场
    const pancreasHits = [];
    let pancreas = 92;
    if (sugarPct >= 100) { pancreas -= 18; pancreasHits.push(`糖摄入超标（${Math.round(sugar)}g），血糖波动大，胰岛负担重`); }
    else if (sugarPct >= 70) { pancreas -= 10; pancreasHits.push('糖摄入偏高，注意含糖饮料'); }
    if (fmItems.includes('增肌粉')) pancreasHits.push('增肌粉碳水较高，已计入糖负荷');
    if (mealCnt > 0 && mealCnt < 3) { pancreas -= 4; pancreasHits.push('进餐不规律，血糖曲线波动'); }
    if (fmItems.includes('蛋白粉')) pancreasHits.push('蛋白粉对血糖友好');
    if (!pancreasHits.length) pancreasHits.push('糖负荷在参考范围内');
    pancreas = cap(pancreas);
    const systems = [
      { id: 'stomach', ico: '胃', name: '胃', score: stomach, hits: stomachHits },
      { id: 'gut',      ico: '肠', name: '肠道', score: gut, hits: gutHits },
      { id: 'liver',    ico: '肝', name: '肝', score: liver, hits: liverHits },
      { id: 'pancreas', ico: '胰', name: '胰腺', score: pancreas, hits: pancreasHits },
    ].map(o => ({ ...o, color: this._afuOrganColor(o.score), lv: this._afuOrganLevel(o.score) }));
    // —— 维生素覆盖（食物估算 + 保健品）——
    const vName = { A: '维生素A', B: '维生素B', C: '维生素C', D: '维生素D', E: '维生素E' };
    const vSrc = { A: '深色蔬菜/蛋类', B: '全谷物/蛋奶', C: '果蔬', D: '奶类/日晒', E: '坚果/植物油' };
    const vitamins = ['A','B','C','D','E'].map(k => ({
      name: vName[k], cover: vAll.has(k),
      src: vAll.has(k) ? (vFromFood.has(k) && !nmItems.length ? vSrc[k] : (nmItems.length ? `${vSrc[k]} + 营养餐补充` : vSrc[k])) : '未覆盖',
    }));
    // —— 皮肤关联（糖 × 痘清洁）——
    let skinNote = '';
    if (sugar >= 50 && !acneDone) skinNote = `当日糖摄入约 ${Math.round(sugar)}g（超过 50g 参考上限）——高糖饮食会刺激皮脂分泌、加重痘痘；建议控糖，并到门店做专业全脸清洁（痘清洁卡）护理。`;
    else if (acneDone) skinNote = '今日已完成门店专业全脸清洁（痘清洁）——配合控糖饮食，皮肤状态会更稳定。';
    else if (sugar < 30) skinNote = `当日糖摄入约 ${Math.round(sugar)}g，处于较低水平——对皮肤友 好，继续保持控糖习惯。`;
    // —— 阿福饮食建议 ——
    const tips = [];
    if (naPct >= 100) tips.push(`钠摄入 ${Math.round(na)}mg 超标——减少外卖、加工食品与重口味酱料（参考上限 2000mg）`);
    if (sugarPct >= 100) tips.push(`糖摄入 ${Math.round(sugar)}g 超标——拒绝含糖饮料与甜品，水果适量`);
    if (fatPct >= 100) tips.push(`脂肪摄入 ${Math.round(fat)}g 超标——下一餐选清淡做法（蒸煮炖优于煎炸）`);
    if (!vAll.has('C')) tips.push('维生素C未覆盖——补一份果蔬或在【营养餐】打卡维生素C');
    if (!vAll.has('B')) tips.push('维生素B未覆盖——全谷物/蛋奶或在【营养餐】打卡维生素B');
    if (!vAll.has('D')) tips.push('维生素D未覆盖——晒太阳 15 分钟，或在【营养餐】打卡维生素D/鱼油');
    if (waterMl > 0 && waterMl < 800) tips.push('饮水偏少——肠胃蠕动和钠代谢都需要水，目标 1300ml+');
    // v10.0 吃吃消/隐私洗 派生建议
    if (drinkNote) tips.push(`今日饮品：${drinkNote}——奶茶/果汁的糖已计入糖负荷（肝胰负担），能换无糖茶/水更佳`);
    if (fruitFructose >= 40) tips.push(`水果果糖约 ${fruitFructose}g（约 ${fruitCal}kcal）——大量集中摄入会加重肝代谢，建议一天水果控制在 200-350g`);
    else if (fruitNote && fruitFructose > 0 && fruitFructose < 40) tips.push(`水果（${fruitNote}）——适量果糖+纤维+维生素，这个量对代谢友好`);
    const pwSym = day.privacyWash && day.privacyWash.symptom && day.privacyWash.symptom !== '无' ? day.privacyWash.symptom : '';
    if (pwSym) tips.push(`隐私洗记录不适（${pwSym}）——已同步五脏六腑模型肾系统；症状持续 2 天以上请就医`);
    if (!tips.length) tips.push('当日糖/脂肪/钠/维生素摄入均衡，消化代谢运转良好，继续保持～');
    return { cal, calRef, calPct, sugar, sugarPct, fat, fatPct, na, naPct, load, systems, vitamins, skinNote, tips,
      calColor: calPct < 60 ? '#0ea5e9' : calPct <= 110 ? '#16a34a' : '#dc2626',
      // v10.0：BMI/BMR 接入（空间档案计算）+ 吃吃消明细（供食谱推送与模型页展示）
      bmi: _bmi, bmr: _bmr, tdee: calRef,
      drinkNote, fruitNote, fruitCal, fruitFructose, privacyWashSymptom: pwSym };
  },
});
