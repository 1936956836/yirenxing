// 56-report.js —— 报告数据（v2026.0906 新增）：每日图文总结报告 · 图文卡片 + 历史报告归档
// [功能组] G4-数据洞察（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// 定位：与【数据中心 / 补卡中心 / 健康数据】齐平的习惯子页（App.gotoWb('report99')）
// 报告形态：报告式排版 —— 报头（日期/星期/天气感）+ 健康指数环 + 打卡矩阵 + 器官透视 + 生活数据 + 阿福评语
// 图片能力：inline SVG（与健康数据同源）→ 渲染进报告；支持导出 PNG 保存
Object.assign(App, {
  // ============ 报告 ============ 中心 · 主入口 ============
  _wbReport99(wb, W) {
    const h = Store.getHabit99();
    const today = Store.today();
    // 报告数据日：当日优先，无打卡回退最近 1 个有数据的日子（报告永远有内容可看）
    const analyzeDk = this._rptPickDate(h, 0) || today;
    const cur = this._rptBuild(analyzeDk);
    // 近 30 日历史（有打卡数据的日期）
    const hist = [];
    for (let i = 0; i < 30 && hist.length < 30; i++) {
      const dk = this._hb99DkOff(-i);
      if ((h.days || {})[dk] && Object.keys(h.days[dk]).length) hist.push(dk);
    }
    return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">📰</span>报告数据 · 每日图文总结
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">当日情况一报尽览 · 支持导出图片</span>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">
        每日自动汇总：打卡完成度、健康指数、五脏六腑建模、心情与健康、三餐/步数/饮水等生活数据，
        由管家阿福撰写当日评语，排版成一份图文报告；点击【导出报告图片】可生成 PNG 长图保存分享。
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="App.gotoWb('habit')">🌿 去打卡</button>
        <button class="btn btn-sm btn-ghost" onclick="App.gotoWb('datacenter99')">📊 数据中心</button>
        <button class="btn btn-sm btn-ghost" onclick="App.gotoWb('dailylog99')">📈 健康数据</button>
        <button class="btn btn-sm btn-ghost" onclick="App._rptExport()">🖼️ 导出报告图片</button>
      </div>
    </div>
    ${cur.html}
    <div class="card">
      <div class="card-title"><span class="ico">🗂️</span>历史报告（近 30 个数据日）
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">${hist.length} 期可回看</span>
      </div>
      ${hist.length ? `<div style="overflow:auto;margin-top:8px"><table class="hb99-table"><thead><tr>
        <th>日期</th><th>星期</th><th>打卡</th><th>健康指数</th><th>最弱器官</th><th>心情/健康</th><th>阿福观测</th><th></th>
      </tr></thead><tbody>
        ${hist.map(dk => { const r = this._rptBuild(dk); return `<tr>
          <td>${dk.slice(5)}</td><td>${r.wk}</td><td>${r.doneCnt}/${r.cardCnt}</td>
          <td><b style="color:${r.idxColor}">${r.idx}</b> ${r.lv}</td>
          <td>${r.worstTxt}</td>
          <td>${r.moodTxt}</td>
          <td>${r.moodObsTxt}</td>
          <td><button class="btn btn-sm btn-ghost" onclick="App._rptView('${dk}')">查看</button></td>
        </tr>`; }).join('')}
      </tbody></table></div>` : '<div class="empty">还没有打卡数据，先去【习惯】打卡，报告就有内容啦～</div>'}
    </div>
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
  },

  // 选第 off 天（含今日）往前找最近一个有打卡数据的日期；无则 null
  _rptPickDate(h, off) {
    for (let i = off; i >= off - 13; i--) {
      const dk = this._hb99DkOff(i);
      const raw = (h.days || {})[dk];
      if (raw && Object.keys(raw).length) return dk;
    }
    return null;
  },

  // ============ 报告构建：返回 { html, ...摘要字段 } ============
  _rptBuild(dk) {
    const h = Store.getHabit99();
    const s = Store.habit99DailySummary(dk);
    const mr = (Store.load().medicalRecords || []);
    const hasChronic = mr.some(r => (r.tags || []).includes('hiv') || (r.tags || []).includes('tp') || r.disease === 'hiv' || r.disease === 'tp');
    const organs = this._afuOrganModel(s, hasChronic);
    const afu = this._afuHealthAnalysis(s, { list: organs, hasChronic });
    const idxColor = afu.idx >= 75 ? '#16a34a' : afu.idx >= 60 ? '#ca8a04' : afu.idx >= 40 ? '#ea580c' : '#dc2626';
    const cfgCards = CONFIG.habitCards || [];
    // 打卡矩阵：每张卡 当日是否完成（card.id 与 day 键对齐；数组卡有元素、对象卡有 ts/done/count/status/way/level、数值卡有值）
    const day = (h.days || {})[dk] || {};
    const cardCnt = cfgCards.length || 1;
    const doneCnt = cfgCards.filter(c => {
      const v = day[c.id];
      if (!v) return false;
      if (Array.isArray(v)) return v.length > 0;               // water/poop/pee/study*/mood
      if (typeof v === 'object') return !!(v.ts || v.done || v.count > 0 || v.status || v.way || v.level || v.sleep || v.wake || v.start || v.clean !== undefined);
      return true;                                              // 数值/布尔直接算
    }).length;
    const wk = ['日','一','二','三','四','五','六'][new Date(dk + 'T00:00:00').getDay()];
    // 最弱器官
    const worst = organs.filter(o => o.score < 100).sort((a, b) => a.score - b.score)[0] || organs[0];
    const worstTxt = worst ? `${worst.ico}${worst.name} ${worst.score}` : '—';
    // 心情/健康摘要
    const moodTxt = `${s.moodCnt ? (s.moodLastType || '记') + '×' + s.moodCnt : '—'} / ${s.healthStatus ? (s.healthSick ? '🤒小病' : (s.healthRecheck ? '🔬复查' : '✅良好')) : '—'}`;
    // ===== 报告版式 =====
    const html = `<div class="card" style="margin-bottom:14px;background:linear-gradient(160deg,#f0f9ff 0%,#fdf4ff 55%,#f0fdfa 100%);border:1.5px solid #e0f2fe" id="rpt-card">
      <!-- 报头 -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:6px;border-bottom:2px solid #bae6fd;padding-bottom:10px">
        <div>
          <div style="font-size:17px;font-weight:900;color:#0c4a6e">📰 每日健康报告</div>
          <div style="font-size:11.5px;color:#0284c7;margin-top:3px">编号 HB-${dk.replace(/-/g, '')} · 管家阿福 出品</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;font-weight:800;color:#0c4a6e">${parseInt(dk.slice(5, 7), 10)} 月 ${parseInt(dk.slice(8, 10), 10)} 日 · 周${wk}</div>
          <div style="font-size:11px;color:#0284c7">${dk === Store.today() ? '当日实时' : '历史存档'}</div>
        </div>
      </div>
      <!-- 指数环 + 打卡完成度 -->
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:14px 0 6px">
        <div class="afu-idx-wrap" style="margin:0">
          <div class="afu-idx-ring" style="background:conic-gradient(${idxColor} ${afu.idx * 3.6}deg, #e2e8f0 0deg)">
            <div class="afu-idx-num" style="color:${idxColor}">${afu.idx}</div>
          </div>
        </div>
        <div style="flex:1;min-width:220px">
          <div style="font-size:15px;font-weight:900;color:${idxColor}">当日健康指数 · ${afu.lv}</div>
          <div style="font-size:12px;color:#475569;line-height:1.8;margin-top:4px">${this.esc(afu.chain)}</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;font-size:12px">
            <span>打卡 <b>${doneCnt}/${cardCnt}</b> 卡</span>
            <span>三餐 <b>${s.meals}/3</b> 餐</span>
            <span>饮水 <b>${s.waterMl || 0}ml</b></span>
            <span>睡眠 <b>${s.nightH || 0}h</b></span>
            ${s.stepsDone && s.stepsCount > 0 ? `<span>步数 <b>${s.stepsCount.toLocaleString()}</b></span>` : ''}
            ${s.mealCost > 0 ? `<span>外食花费 <b>¥${s.mealCost}</b></span>` : ''}
          </div>
        </div>
      </div>
      <!-- 器官透视（图片：inline SVG 人体建模，与健康数据同源） -->
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;border-top:1px dashed #bae6fd;padding-top:12px;margin-top:8px">
        <div style="flex:0 0 218px;max-width:100%">
          <div style="font-weight:800;font-size:12.5px;color:#0c4a6e;margin-bottom:6px">🫀 五脏六腑透视</div>
          ${this._rptOrganSvg(organs)}
        </div>
        <div style="flex:1;min-width:230px">
          <div style="font-weight:800;font-size:12.5px;color:#0c4a6e;margin-bottom:6px">📊 器官健康度</div>
          ${organs.map(o => { const c = this._afuOrganColor(o.score);
            return `<div style="display:flex;align-items:center;gap:8px;margin:5px 0">
              <span style="width:44px;font-size:11.5px;font-weight:700;color:#334155">${o.ico}${o.name}</span>
              <div style="flex:1;height:8px;border-radius:4px;background:#e2e8f0;overflow:hidden"><i style="display:block;height:100%;width:${o.score}%;background:${c};border-radius:4px"></i></div>
              <b style="width:26px;text-align:right;font-size:11.5px;color:${c}">${o.score}</b>
            </div>`; }).join('')}
          <div style="font-size:11.5px;color:#b45309;margin-top:8px;line-height:1.7">🫀 最需关照：${this.esc(afu.worst)}</div>
        </div>
      </div>
      <!-- 生活数据 + 评语 -->
      <!-- v11.0 管家六维评价（健康/睡眠/饮食/卫生/运动/学习 · 当日 24 点定级） -->
      ${this._pet99Grade ? (() => { const g = this._pet99Grade(dk); const isToday = dk === Store.today(); return `
      <div style="border-top:1px dashed #bae6fd;margin-top:12px;padding-top:12px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="font-weight:800;font-size:12.5px;color:#0c4a6e">${this._afu99AvatarHtml(17, 'pxafu-inline')}管家六维评价</div>
          <span style="padding:1px 9px;border-radius:999px;font-size:11.5px;font-weight:800;color:${g.color};background:${g.color}14">${g.lv} · ${g.score} 分</span>
          <span style="font-size:10.5px;color:#0284c7;margin-left:auto">${isToday ? '当日实时（24 点定级）' : '已定级（历史）'}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px 18px;margin-top:8px">
          ${g.dims.map(d => `<div style="display:flex;align-items:center;gap:8px">
            <span style="width:50px;font-size:11.5px;font-weight:700;color:#334155;flex-shrink:0">${d.ico} ${d.name}</span>
            <div style="flex:1;height:7px;border-radius:4px;background:#e2e8f0;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(d.done / d.total * 100)}%;background:${d.done / d.total >= 1 ? '#16a34a' : d.done / d.total >= .5 ? '#f59e0b' : '#f87171'}"></i></div>
            <b style="width:32px;text-align:right;font-size:11px;color:#64748b">${d.done}/${d.total}</b>
          </div>`).join('')}
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-top:6px">综合 ≥85 分为「优秀」——优秀的一天，是对自己最好的盖章。</div>
      </div>`; })() : ''}
      <div style="border-top:1px dashed #bae6fd;margin-top:12px;padding-top:12px">
        <div style="font-weight:800;font-size:12.5px;color:#0c4a6e">📈 当日生活数据</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px">
          ${this._rptStat('🍚', '三餐', `${s.meals}/3 餐${s.mealOutCnt ? ` · 外食 ${s.mealOutCnt} 顿` : ''}`)}
          ${this._rptStat('💧', '饮水', `${s.waterMl || 0}ml`)}
          ${this._rptStat('🌙', '睡眠', s.nightH ? `${s.nightH}h（质量 ${s.sleepQuality || '—'}星）` : '未记录')}
          ${this._rptStat('🚻', '排便/小便', `${s.poopCnt} / ${s.peeCnt} 次`)}
          ${this._rptStat('💪', '运动', s.sportMin || s.fitnessDone ? `${s.sportMin}min${s.fitnessDone ? ' · 含健身' : ''}` : '无')}
          ${this._rptStat('👟', '步数', s.stepsDone && s.stepsCount > 0 ? s.stepsCount.toLocaleString() + ' 步' : '未记录')}
          ${this._rptStat('📖', '学习', s.studyMin ? `${s.studyMin}min` : '无')}
          ${this._rptStat('🛡', '正气', s.zhengqiClean === true ? '未破' : (s.zhengqiLevel || '未记录'))}
        </div>
      </div>
      ${(() => { // v12.9.21 跨域共享数据（Store.hub 单一事实源）：学习会话/训练/经济/日记/梦境/灵光——打破板块孤岛，一报告尽览
        try {
          if (!Store.hub) return '';
          const h = Store.hub.today(dk);
          const rows = [];
          if (h.study.min > 0) rows.push(this._rptStat('🧘', '聚神学习', `${h.study.min}min · ${h.study.sessions} 次会话`));
          if (h.workout.count > 0) rows.push(this._rptStat('🏋️', '训练记录', `${h.workout.count} 次 · ${h.workout.min}min${h.workout.kcal ? ` · ${h.workout.kcal}kcal` : ''}`));
          if (h.ledger.income > 0 || h.ledger.expense > 0) rows.push(this._rptStat('💰', '经济收支', `收 ¥${h.ledger.income} · 支 ¥${h.ledger.expense}`));
          if (h.diary.count > 0) rows.push(this._rptStat('📓', '日记', `${h.diary.count} 篇`));
          if (h.dream.count > 0) rows.push(this._rptStat('💭', '拾梦', `${h.dream.count} 条`));
          if (h.spark.count > 0) rows.push(this._rptStat('✨', '灵光', `${h.spark.count} 条`));
          if (h.coins.granted > 0 || h.coins.spent > 0) rows.push(this._rptStat('🪙', '金币', `+${h.coins.granted} / -${h.coins.spent}`));
          if (!rows.length) return '';
          return `<div style="border-top:1px dashed #bae6fd;margin-top:12px;padding-top:12px">
            <div style="font-weight:800;font-size:12.5px;color:#0c4a6e">🔗 跨域共享数据
              <span style="font-size:10.5px;color:#94a3b8;font-weight:400;margin-left:4px">（学习·运动·经济·日记·梦境·灵光全域汇总）</span></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px">${rows.join('')}</div>
          </div>`;
        } catch (_) { return ''; }
      })()}
      ${s.moodCnt || s.healthStatus ? `<div style="border-top:1px dashed #bae6fd;margin-top:12px;padding-top:12px">
        <div style="font-weight:800;font-size:12.5px;color:#0c4a6e">🩺 心情与健康</div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9;margin-top:6px">
          ${s.moodCnt ? `<div>😊 心情记录 <b>${s.moodCnt}</b> 次${s.moodLastType ? ` · 最近「${this.esc(s.moodLastType)}」` : ''}${s.moodLastReason ? ` · ${this.esc(s.moodLastReason)}` : ''}</div>` : ''}
          ${s.healthStatus ? (s.healthSick
            ? `<div>🤒 健康卡：<b style="color:#dc2626">小病缠身</b>${s.healthSymptoms.length ? `（${this.esc(s.healthSymptoms.join('、'))}）` : ''}</div>`
            : (s.healthRecheck
              ? `<div>🔬 健康卡：<b style="color:#7c3aed">大病复查</b> · ${this.esc(s.healthRecheck.disease)}${s.healthRecheck.acts.length ? `（${this.esc(s.healthRecheck.acts.join('、'))}）` : ''}${s.medCostAmount > 0 ? ` · 医疗消费 ${s.medCostAmount} 元` : ''}</div>`
              : `<div>💚 健康卡：<b style="color:#16a34a">感觉良好</b></div>`)) : ''}
        </div>
      </div>` : ''}
      <!-- v12.3 阿福心情观测：聊天发言 → 心情推理（84-afu-mood.js） -->
      ${this._rptAfuMoodSection ? this._rptAfuMoodSection(dk) : ''}
      <div style="margin-top:12px;padding:12px;border-radius:12px;background:#fffbeb;border:1.5px solid #fde68a">
        <div style="font-weight:800;color:#b45309;font-size:13px">${this._afu99AvatarHtml(17, 'pxafu-inline')}阿福评语</div>
        <div style="font-size:12.5px;color:#78350f;line-height:1.9;margin-top:6px">
          ${afu.good.length ? `<div>✅ 今日亮点：${afu.good.map(x => this.esc(x)).join('、')}。</div>` : ''}
          <div>💡 明日建议：${afu.tips.map(t => this.esc(t)).join('；')}。</div>
          <div style="color:#92400e;margin-top:4px">—— 管家阿福，${parseInt(dk.slice(5, 7), 10)} 月 ${parseInt(dk.slice(8, 10), 10)} 日</div>
        </div>
      </div>
      <!-- 报尾 -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;border-top:2px solid #bae6fd;margin-top:12px;padding-top:10px">
        <span style="font-size:10.5px;color:#0284c7">数据来源：习惯 27 卡实时打卡 · 器官医学建模 · 阿福健康指数引擎</span>
        <button class="btn btn-sm btn-ghost" onclick="App._rptExport()">🖼️ 导出图片</button>
      </div>
    </div>`;
    return { html, dk, wk, doneCnt, cardCnt, idx: afu.idx, lv: afu.lv, idxColor, worstTxt, moodTxt,
      moodObsTxt: (() => { try { const ms = this.afuMoodSummary ? this.afuMoodSummary(dk) : { has: false }; return ms.has && ms.topMood ? `${ms.topMood.ico}${ms.topMood.n}×${ms.count}` : '—'; } catch (e) { return '—'; } })() };
  },

  // 报告用紧凑器官 SVG（复用健康数据人体建模，缩至报告栏内）
  _rptOrganSvg(organs) {
    const g = (id) => (organs.find(o => o.id === id) || { score: 100, name: id });
    const col = (id) => this._afuOrganColor(g(id).score);
    const F = (id, d) => `<path d="${d}" fill="${col(id)}" opacity="0.9" stroke="#ffffff" stroke-width="1.2"/>`;
    const D = (id, d, w) => `<path d="${d}" fill="none" stroke="${col(id)}" stroke-width="${w}" stroke-linecap="round" opacity="0.9"/>`;
    const L = (d) => `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.55" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 260 334" style="width:100%;background:#f8fafc;border-radius:12px;display:block">
      <ellipse cx="130" cy="42" rx="30" ry="35" fill="#fdfefe" stroke="#cbd5e1" stroke-width="2"/>
      <path d="M130,74 C110,76 96,80 84,88 C66,98 56,114 54,136 L54,238 C54,272 76,296 112,304 L148,304 C184,296 206,272 206,238 L206,136 C204,114 194,98 176,88 C164,80 150,76 130,74 Z" fill="#fdfefe" stroke="#cbd5e1" stroke-width="2"/>
      <path d="M130,96 L130,272" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/>
      ${F('brain', 'M103,38 C103,26 111,15 126,14 C128,10 134,10 136,14 C149,16 157,25 157,38 C157,50 149,58 139,61 C135,62 126,62 122,61 C111,58 103,50 103,38 Z')}
      ${L('M109,33 C114,29 117,36 122,32 C127,28 130,36 136,32 C140,29 144,35 149,32')}
      ${L('M108,46 C113,42 116,49 121,45 C126,41 129,49 134,45 C138,42 142,47 146,45')}
      <path d="M130,74 L130,94 M130,94 C125,98 120,102 116,106 M130,94 C135,98 140,102 144,106" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
      ${F('lung', 'M118,104 C108,100 96,102 88,110 C80,118 76,132 76,148 C76,164 80,176 88,182 C94,186 102,184 106,176 C110,168 110,150 110,132 C110,116 112,108 118,104 Z')}
      ${F('lung', 'M142,104 C152,100 164,102 172,110 C180,118 184,132 184,148 C184,164 180,176 172,182 C166,186 158,184 154,176 C150,168 150,150 150,132 C150,116 148,108 142,104 Z')}
      <path d="M124,108 C120,102 116,98 114,92" fill="none" stroke="${col('heart')}" stroke-width="3.5" stroke-linecap="round" opacity="0.9"/>
      ${F('heart', 'M128,116 C124,110 116,108 110,112 C104,116 102,124 105,132 C108,142 118,154 126,162 C130,166 134,164 136,158 C142,146 152,136 154,126 C156,116 150,108 142,108 C136,108 131,112 128,116 Z')}
      ${F('liver', 'M76,158 C80,150 96,146 112,145 C132,144 148,150 155,156 C158,159 157,163 151,165 C138,169 124,171 114,172 C106,173 100,178 95,184 C88,192 78,194 73,188 C69,183 71,166 76,158 Z')}
      <ellipse cx="86" cy="195" rx="4.5" ry="6.5" fill="${col('liver')}" opacity="0.75"/>
      ${D('stomach', 'M163,166 C173,159 184,164 186,175 C188,187 180,197 168,198 C160,199 155,193 155,186 C155,181 159,178 163,178', 11)}
      ${F('spleen', 'M196,176 C202,172 206,178 205,185 C204,192 199,195 195,192 C191,189 190,181 196,176 Z')}
      ${F('kidney', 'M108,206 C102,202 94,204 91,212 C88,220 89,230 95,234 C101,238 108,235 110,227 C111,220 113,210 108,206 Z')}
      ${F('kidney', 'M152,206 C158,202 166,204 169,212 C172,220 171,230 165,234 C159,238 152,235 150,227 C149,220 147,210 152,206 Z')}
      ${D('kidney', 'M100,234 C100,242 104,248 110,252 M160,234 C160,242 156,248 150,252', 2)}
      ${D('gut', 'M94,266 L94,240 C94,231 101,225 110,225 L150,225 C159,225 166,231 166,240 L166,266', 7)}
      ${D('gut', 'M104,236 C112,230 120,242 128,236 C136,230 144,242 152,236', 4.5)}
      ${D('gut', 'M104,248 C112,242 120,254 128,248 C136,242 144,254 152,248', 4.5)}
      ${D('gut', 'M106,259 C112,255 118,263 128,259 C138,255 144,263 150,259', 4.5)}
      ${D('gut', 'M130,266 L130,277', 5)}
      ${F('immune', 'M130,278 C138,278 148,280 154,282 C154,294 146,304 130,308 C114,304 106,294 106,282 C112,280 122,278 130,278 Z')}
    </svg>`;
  },

  _rptStat(ico, name, val) {
    return `<div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.75);border:1px solid #e0f2fe">
      <div style="font-size:11px;color:#0284c7">${ico} ${name}</div>
      <div style="font-size:13px;font-weight:800;color:#0c4a6e;margin-top:2px">${this.esc(String(val))}</div>
    </div>`;
  },

  // 历史报告弹层
  _rptView(dk) {
    const r = this._rptBuild(dk);
    this._modal({
      title: `📰 ${dk} 日报`,
      body: r.html,
      actions: [{ label: '关闭' }],
    });
  },

  // 导出 PNG：SVG 序列化 → canvas 绘制 → a[download]
  _rptExport() {
    try {
      const card = document.getElementById('rpt-card');
      if (!card) { this._modal({ title: '🖼️ 导出报告图片', body: '<div class="empty">请先打开一份报告（当日报告或历史报告），再点击导出。</div>', actions: [{ label: '知道了' }] }); return; }
      const svg = card.querySelector('svg');
      const W = 720, H = 1280;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      // 背景渐变
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#f0f9ff'); grad.addColorStop(0.55, '#fdf4ff'); grad.addColorStop(1, '#f0fdfa');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      // 标题
      ctx.fillStyle = '#0c4a6e'; ctx.font = '900 30px sans-serif';
      ctx.fillText('每日健康报告', 32, 56);
      ctx.fillStyle = '#0284c7'; ctx.font = '12px sans-serif';
      ctx.fillText('管家阿福 出品 · 数据来源：习惯 27 卡打卡 · 器官医学建模', 32, 78);
      // 器官图（SVG → Image 绘制）
      if (svg) {
        const ser = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, W - 300, 90, 260, 334);
          _finish();
        };
        img.onerror = () => _finish();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ser);
      } else _finish();
      const _finish = () => {
        // 指数环
        const m = card.querySelector('.afu-idx-num');
        if (m) {
          const v = parseInt(m.textContent, 10) || 0;
          const colr = v >= 75 ? '#16a34a' : v >= 60 ? '#ca8a04' : v >= 40 ? '#ea580c' : '#dc2626';
          ctx.beginPath(); ctx.arc(90, 160, 46, 0, Math.PI * 2);
          ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 10; ctx.stroke();
          ctx.beginPath(); ctx.arc(90, 160, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v / 100);
          ctx.strokeStyle = colr; ctx.lineWidth = 10; ctx.stroke();
          ctx.fillStyle = colr; ctx.font = '900 34px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(String(v), 90, 172); ctx.textAlign = 'left';
          ctx.fillStyle = '#0c4a6e'; ctx.font = '700 16px sans-serif';
          ctx.fillText('健康指数', 150, 150);
          // 底部数据行
          const rows = [...card.querySelectorAll('.rpt-stat, div')].slice(0, 0); // 数据以报告卡可见文本为准
        }
        // 打卡数据（从报告卡提取文本）
        const texts = [];
        card.querySelectorAll('div').forEach(d => {
          if (d.children.length === 0 && d.textContent.trim()) texts.push(d.textContent.trim());
        });
        ctx.fillStyle = '#334155'; ctx.font = '13px sans-serif';
        let y = 240;
        texts.slice(0, 40).forEach(t => {
          if (y > H - 40) return;
          ctx.fillText(t.length > 44 ? t.slice(0, 43) + '…' : t, 32, y);
          y += 22;
        });
        // 落款
        ctx.fillStyle = '#0284c7'; ctx.font = '11px sans-serif';
        ctx.fillText('— 管家阿福 · 每日图文报告 —', W / 2 - 80, H - 24);
        // 下载
        const a = document.createElement('a');
        const dk = (App._rptLastDk || Store.today()).replace(/-/g, '');
        a.download = `健康报告_${dk}.png`;
        a.href = c.toDataURL('image/png');
        a.click();
      };
      App._rptLastDk = App._rptLastDk || null;
    } catch (e) { console.warn('report export failed', e); }
  },
});
