// 10-goal-report.js —— 目标系统 / 周·月报 / 训练模板 / 营养素（自 app.js 机械拆分 · v2026.0905 模块化；v12.9.20 已删错题本与知识卡懒加载旧体系）
// [功能组] G3-学习成长（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
Object.assign(App, {
  // ====== 目标系统：30/90/365 天 ======
  render_goals() {
    const goals = Store.getGoals();
    let html = `
      <div class="hero">
        <div class="hero-title">🎯 目标系统</div>
        <div class="hero-sub">设定 30/90/365 天目标，追踪进度，预测达成日期</div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">⚡</span>一键套用目标模板</div>
        <div class="goal-tpl-grid">
          ${(CONFIG.goalTemplates || []).map(t => `
            <div class="goal-tpl" onclick="App.addGoalFromTpl('${this.esc(t.name)}','${t.type}',${t.target},'${this.esc(t.unit)}')">
              <div class="gt-name">${this.esc(t.name)}</div>
              <div class="gt-desc">${this.esc(t.desc)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">➕</span>自定义新目标</div>
        <div class="field"><label>目标名称</label><input id="goalName" class="input" placeholder="如：90 天读完 30 本书"></div>
        <div class="field"><label>周期</label>
          <select id="goalType" class="input">
            <option value="30">30 天</option>
            <option value="90" selected>90 天</option>
            <option value="365">365 天</option>
          </select>
        </div>
        <div class="field"><label>目标值</label><input id="goalTarget" type="number" class="input" placeholder="如 30"></div>
        <div class="field"><label>单位</label><input id="goalUnit" class="input" placeholder="如 本 / kg / h"></div>
        <button class="btn btn-primary" onclick="App.addCustomGoal()">创建目标</button>
      </div>
    `;
    goals.forEach(g => {
      const latest = (g.progressLog && g.progressLog.length) ? g.progressLog[g.progressLog.length - 1].value : 0;
      const pct = g.target > 0 ? Math.min(100, Math.round(latest / g.target * 100)) : 0;
      const daysLeft = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline) - new Date(Store.today() + 'T00:00:00')) / 86400000)) : '-';
      const dailyNeed = (g.target > 0 && daysLeft > 0) ? ((g.target - latest) / daysLeft).toFixed(1) : 0;
      const estFinish = (g.target > 0 && latest > 0 && g.progressLog.length > 1) ? (() => {
        const first = g.progressLog[0].date;
        const daysPassed = Math.max(1, Math.ceil((new Date(Store.today() + 'T00:00:00') - new Date(first + 'T00:00:00')) / 86400000));
        const rate = latest / daysPassed;
        const remain = Math.max(0, g.target - latest);
        return rate > 0 ? `预计 ${Math.ceil(remain / rate)} 天后达成` : '进度停滞';
      })() : '数据不足';
      html += `
        <div class="card goal-card ${g.done ? 'done' : ''}">
          <div class="goal-head">
            <div>
              <div class="goal-name">${g.done ? '✅ ' : ''}${this.esc(g.name)}</div>
              <div class="goal-meta">${g.type} 天 · 起 ${g.start}${g.deadline ? ' · 止 ' + g.deadline : ''} · 剩 ${daysLeft} 天</div>
            </div>
            <button class="btn btn-danger" style="font-size:12px;padding:6px 10px" onclick="App.delGoal('${g.id}')">删除</button>
          </div>
          <div class="goal-bar"><div class="goal-fill" style="width:${pct}%"></div></div>
          <div class="goal-stats">
            <div><b>${latest}</b> / ${g.target} ${this.esc(g.unit || '')} · ${pct}%</div>
            <div>每日需 +${dailyNeed} · ${estFinish}</div>
          </div>
          <div class="goal-update">
            <input id="goalVal_${g.id}" type="number" class="input" placeholder="更新当前进度" value="${latest}">
            <button class="btn btn-primary" onclick="App.updateGoal('${g.id}')">更新进度</button>
          </div>
        </div>
      `;
    });
    document.getElementById('view-sync').innerHTML = html;
  },
  addGoalFromTpl(name, type, target, unit) {
    const g = Store.addGoal({ name, type, target, unit, deadline: this._calcDeadline(type) });
    this._flash('🎯 已创建目标：' + name);
    this.render_goals();
  },
  addCustomGoal() {
    const name = document.getElementById('goalName').value.trim();
    if (!name) { this._flash('请填目标名称'); return; }
    const type = document.getElementById('goalType').value;
    const target = parseFloat(document.getElementById('goalTarget').value) || 0;
    const unit = document.getElementById('goalUnit').value;
    Store.addGoal({ name, type, target, unit, deadline: this._calcDeadline(type) });
    this._flash('🎯 已创建目标');
    this.render_goals();
  },
  _calcDeadline(type) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(type));
    return Store.fmtDate(d);
  },
  updateGoal(id) {
    const v = parseFloat(document.getElementById('goalVal_' + id).value) || 0;
    Store.updateGoalProgress(id, v);
    this._flash('📊 已更新进度');
    this.render_goals();
  },
  delGoal(id) {
    if (!confirm('确定删除该目标？')) return;
    Store.delGoal(id);
    this.render_goals();
  },
  // ====== 周/月报自动生成 ======
  render_weekly_report() {
    const days = Store.getRecentDays(7);
    const stats = this._aggregateWeek(days);
    const moodList = Store.getDiaries().slice(0, 7).map(d => ({ date: d.date, mood: d.mood, title: d.title }));
    const topCat = Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    let html = `
      <div class="hero">
        <div class="hero-title">📊 本周复盘报告</div>
        <div class="hero-sub">${stats.start} ~ ${stats.end} · 共 ${days.length} 天</div>
      </div>
      <div class="card report-card">
        <div class="card-title"><span class="ico">📈</span>核心数据汇总</div>
        <div class="report-grid">
          <div class="rp-metric"><div class="rp-num">${stats.completeDays}/${days.length}</div><div class="rp-lbl">达标天数</div></div>
          <div class="rp-metric"><div class="rp-num">${stats.totalSleep.toFixed(1)}h</div><div class="rp-lbl">总睡眠</div></div>
          <div class="rp-metric"><div class="rp-num">${stats.totalSteps}</div><div class="rp-lbl">总步数</div></div>
          <div class="rp-metric"><div class="rp-num">${stats.totalLearn.toFixed(1)}h</div><div class="rp-lbl">学习时长</div></div>
          <div class="rp-metric"><div class="rp-num">¥${stats.totalSpend}</div><div class="rp-lbl">本周消费</div></div>
          <div class="rp-metric"><div class="rp-num">${stats.trainDays}</div><div class="rp-lbl">训练次数</div></div>
        </div>
      </div>
      <div class="card report-card">
        <div class="card-title"><span class="ico">😌</span>心情曲线（本周）</div>
        <svg class="mood-chart" viewBox="0 0 700 160" xmlns="http://www.w3.org/2000/svg">
          ${this._renderMoodChartSVG(days)}
        </svg>
        <div class="report-mood-list">
          ${moodList.length === 0 ? '<div class="empty">本周暂无日记</div>' : moodList.map(d => `
            <div class="mood-row"><span class="mood-date">${d.date.slice(5)}</span><span class="mood-emotion">${this._moodEmoji(d.mood)}</span><span class="mood-title">${this.esc(d.title || '无标题')}</span></div>
          `).join('')}
        </div>
      </div>
      <div class="card report-card">
        <div class="card-title"><span class="ico">💸</span>消费分类 TOP3</div>
        ${topCat.length === 0 ? '<div class="empty">本周无消费记录</div>' : topCat.map(([k, v]) => {
          const cat = (CONFIG.ledgerCategories || []).find(c => c.id === k);
          return `<div class="cat-row"><span>${cat ? cat.icon : '📦'} ${cat ? cat.name : k}</span><b>¥${v}</b></div>`;
        }).join('')}
      </div>
      <div class="card report-card">
        <div class="card-title"><span class="ico">🤖</span>AI 复盘建议</div>
        <ul class="report-tips">
          ${this._generateReportTips(stats).map(t => `<li>${t}</li>`).join('')}
        </ul>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">📤</span>导出分享</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="App.exportReportImage()">🖼️ 导出为长图</button>
          <button class="btn btn-ghost" onclick="App.copyReportText()">📋 复制文字版</button>
        </div>
      </div>
    `;
    document.getElementById('view-sync').innerHTML = html;
  },
  _aggregateWeek(days) {
    let completeDays = 0, totalSleep = 0, totalSteps = 0, totalLearn = 0, trainDays = 0;
    const byCat = {};
    let totalSpend = 0;
    days.forEach(d => {
      const r = d.record;
      if (r) {
        if (Store.isDayComplete(r)) completeDays++;
        if (r.sleep) {
          totalSleep += this._inferSleepHours(r.sleep.night) + this._inferSleepHours(r.sleep.noon);
        }
        if (r.exercise) {
          totalSteps += r.exercise.steps || 0;
          if (r.exercise.gymCheckin) trainDays++;
        }
        if (r.learning) totalLearn += r.learning.totalHours || 0;
      }
    });
    // 本周消费
    const ledger = Store.getLedger();
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    ledger.forEach(e => {
      const d = new Date(e.date + 'T00:00:00');
      if (d >= weekAgo) {
        totalSpend += e.amount;
        byCat[e.category] = (byCat[e.category] || 0) + e.amount;
      }
    });
    return {
      completeDays, totalSleep, totalSteps, totalLearn, trainDays, totalSpend, byCat,
      start: days[days.length - 1].date,
      end: days[0].date,
    };
  },
  _moodEmoji(m) {
    if (m >= 4) return '😄'; if (m >= 3) return '🙂'; if (m >= 2) return '😐'; if (m >= 1) return '😔'; return '😢';
  },
  _renderMoodChartSVG(days) {
    // x: 7 个点，y: 0-5 心情
    const w = 700, h = 160, padL = 40, padR = 20, padT = 20, padB = 30;
    const cw = w - padL - padR, ch = h - padT - padB;
    const pts = days.slice().reverse().map((d, i) => {
      let m = d.record ? (d.record.mood || 0) : 0;
      if (!m && d.record) m = Store.isDayComplete(d.record) ? 4 : 2; // 推算
      const x = padL + (cw / 6) * i;
      const y = padT + ch - (m / 5) * ch;
      return { x, y, m, date: d.date };
    });
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
    const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#059669"/><text x="${p.x}" y="${h - 8}" text-anchor="middle" font-size="10" fill="#64748b">${p.date.slice(5)}</text>`).join('');
    const lines = [0,1,2,3,4,5].map(i => { const y = padT + ch - (i/5)*ch; return `<line x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`; }).join('');
    return `${lines}<path d="${path}" stroke="#059669" stroke-width="2" fill="none"/>${dots}`;
  },
  _generateReportTips(stats) {
    const tips = [];
    if (stats.completeDays >= 6) tips.push('🌟 本周达标率 ' + Math.round(stats.completeDays / 7 * 100) + '%，状态极佳，继续保持！');
    else if (stats.completeDays >= 4) tips.push('👍 达标 ' + stats.completeDays + ' 天，还有提升空间，找找漏项');
    else tips.push('⚠️ 本周仅达标 ' + stats.completeDays + ' 天，需要复盘哪项最低额度未完成');
    if (stats.totalSleep / 7 < 7) tips.push('😴 平均睡眠 ' + (stats.totalSleep / 7).toFixed(1) + 'h，不足 7h 影响免疫与记忆');
    if (stats.totalSteps / 7 < 6000) tips.push('🚶 日均步数 ' + Math.round(stats.totalSteps / 7) + '，低于 6000，建议多走动');
    if (stats.totalSpend > 500) tips.push('💸 本周消费 ¥' + stats.totalSpend + '，检查是否有违规消费');
    if (stats.trainDays < 3) tips.push('💪 训练 ' + stats.trainDays + ' 次，未达每周 3 次目标');
    if (stats.totalLearn < 14) tips.push('📚 学习 ' + stats.totalLearn.toFixed(1) + 'h，日均不足 2h');
    if (tips.length === 0) tips.push('🎉 各项数据均衡良好，继续保持！');
    return tips;
  },
  copyReportText() {
    const days = Store.getRecentDays(7);
    const stats = this._aggregateWeek(days);
    const txt = `【生命征程 · 周报 ${stats.start}~${stats.end}】
✅ 达标 ${stats.completeDays}/7 天
😴 总睡眠 ${stats.totalSleep.toFixed(1)}h
🚶 总步数 ${stats.totalSteps}
📚 学习 ${stats.totalLearn.toFixed(1)}h
💪 训练 ${stats.trainDays} 次
💸 消费 ¥${stats.totalSpend}`;
    navigator.clipboard.writeText(txt).then(() => this._flash('📋 已复制到剪贴板')).catch(() => alert(txt));
  },
  async exportReportImage() {
    // 用 SVG → PNG 长图（仅核心指标卡）
    const days = Store.getRecentDays(7);
    const stats = this._aggregateWeek(days);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#ecfdf5"/>
      <text x="300" y="50" text-anchor="middle" font-size="24" font-weight="700" fill="#047857">📊 生命征程 · 周报</text>
      <text x="300" y="80" text-anchor="middle" font-size="13" fill="#64748b">${stats.start} ~ ${stats.end}</text>
      <text x="60" y="140" font-size="16" fill="#059669">✅ 达标 ${stats.completeDays}/7 天</text>
      <text x="60" y="180" font-size="16" fill="#059669">😴 总睡眠 ${stats.totalSleep.toFixed(1)}h</text>
      <text x="60" y="220" font-size="16" fill="#059669">🚶 总步数 ${stats.totalSteps}</text>
      <text x="60" y="260" font-size="16" fill="#059669">📚 学习 ${stats.totalLearn.toFixed(1)}h</text>
      <text x="60" y="300" font-size="16" fill="#059669">💪 训练 ${stats.trainDays} 次</text>
      <text x="60" y="340" font-size="16" fill="#059669">💸 消费 ¥${stats.totalSpend}</text>
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `生命征程-周报-${Store.today()}.svg`;
    document.body.appendChild(a); a.click(); a.remove();
    this._flash('🖼️ 已导出周报长图（SVG）');
  },
  // ====== 训练计划模板 ======
  renderTrainingTemplates() {
    const tpls = CONFIG.trainingTemplates || [];
    const activeTpl = Store.getSetting('active_training_tpl', '');
    let html = `
      <div class="card tpl-card">
        <div class="card-title"><span class="ico">📋</span>训练计划模板 <span class="sub">选模板后今日部位自动按计划着色</span></div>
        <div class="tpl-list">
          ${tpls.map(t => {
            const isActive = activeTpl === t.id;
            return `
            <div class="tpl-item ${isActive ? 'active' : ''}" onclick="App.setTrainingTpl('${t.id}')">
              <div class="tpl-head">
                <span class="tpl-ico">${t.icon}</span>
                <div class="tpl-head-info">
                  <span class="tpl-name">${this.esc(t.name)}</span>
                  <span class="tpl-tags">
                    <span class="tpl-tag tpl-tag-level">${this.esc(t.level)}</span>
                    <span class="tpl-tag tpl-tag-days">${t.days}天/周</span>
                    ${isActive ? '<span class="tpl-tag tpl-tag-on">✓ 已套用</span>' : ''}
                  </span>
                </div>
              </div>
              <div class="tpl-desc">${this.esc(t.desc)}</div>
              <div class="tpl-schedule">
                ${t.schedule.map(s => `<div class="tpl-day"><span class="tpl-day-num">D${s.day}</span><span class="tpl-day-label">${this.esc(s.label)}</span><span class="tpl-day-groups">${s.groups.join(' + ')}</span></div>`).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
        ${activeTpl ? `<button class="btn btn-ghost" style="margin-top:10px" onclick="App.setTrainingTpl('')">✕ 取消当前模板</button>` : ''}
      </div>
    `;
    return html;
  },
  setTrainingTpl(id) {
    if (id) Store.setSetting('active_training_tpl', id);
    else {
      const d = Store.load();
      delete d.settings.active_training_tpl;
      Store.save(d);
    }
    this._flash(id ? '📋 已套用训练模板' : '已取消模板');
    this.render_exercise();
  },
  // ====== 营养素三宏量追踪（蛋白/碳水/脂肪） ======
  renderNutrientTracker(cals) {
    const u = this._calUser();
    const weight = u.weight;
    const proteinGoal = Math.round(weight * 1.8); // 增肌 1.6-2.2g/kg，取 1.8
    const carbGoal = Math.round(weight * 4);     // 4-7g/kg
    const fatGoal = Math.round(weight * 1);       // 0.8-1.2g/kg
    let pTot = 0, cTot = 0, fTot = 0;
    ['breakfast','lunch','dinner','snacks'].forEach(k => {
      (cals[k] || []).forEach(f => {
        if (f.matched !== false && f.gram > 0) {
          const n = CONFIG.getNutri(f.name, f.gram);
          pTot += n.p; cTot += n.c; fTot += n.f;
        }
      });
    });
    pTot = Math.round(pTot * 10) / 10;
    cTot = Math.round(cTot * 10) / 10;
    fTot = Math.round(fTot * 10) / 10;
    const pPct = Math.min(100, Math.round(pTot / proteinGoal * 100));
    const cPct = Math.min(100, Math.round(cTot / carbGoal * 100));
    const fPct = Math.min(100, Math.round(fTot / fatGoal * 100));
    return `
      <div class="card nutrient-card">
        <div class="card-title"><span class="ico">🥗</span>三大宏量营养素追踪 <span class="sub">增肌期 · 蛋白${proteinGoal}g / 碳水${carbGoal}g / 脂肪${fatGoal}g</span></div>
        <div class="nutri-grid">
          <div class="nutri-item">
            <div class="nutri-head"><span class="nutri-ico p">🥩</span><span class="nutri-name">蛋白质</span><span class="nutri-val">${pTot}/${proteinGoal}g</span></div>
            <div class="nutri-bar"><div class="nutri-fill p" style="width:${pPct}%"></div></div>
            <div class="nutri-tip">${pPct >= 100 ? '✅ 已达增肌蛋白需求' : '需补充蛋白（鸡胸/鸡蛋/牛奶）'}</div>
          </div>
          <div class="nutri-item">
            <div class="nutri-head"><span class="nutri-ico c">🍚</span><span class="nutri-name">碳水化合物</span><span class="nutri-val">${cTot}/${carbGoal}g</span></div>
            <div class="nutri-bar"><div class="nutri-fill c" style="width:${cPct}%"></div></div>
            <div class="nutri-tip">${cPct >= 100 ? '✅ 碳水充足，训练有燃料' : '碳水不足，影响训练表现'}</div>
          </div>
          <div class="nutri-item">
            <div class="nutri-head"><span class="nutri-ico f">🥑</span><span class="nutri-name">脂肪</span><span class="nutri-val">${fTot}/${fatGoal}g</span></div>
            <div class="nutri-bar"><div class="nutri-fill f" style="width:${fPct}%"></div></div>
            <div class="nutri-tip">${fPct >= 100 ? '⚠️ 脂肪偏多，控制油脂' : '脂肪摄入适中'}</div>
          </div>
        </div>
        <div class="nutri-total">
          三大宏量合计热量：${Math.round(pTot*4 + cTot*4 + fTot*9)} kcal
          （蛋白 ${Math.round(pTot*4)} + 碳水 ${Math.round(cTot*4)} + 脂肪 ${Math.round(fTot*9)}）
        </div>
        <div class="tip-box" style="margin-top:8px">💡 增肌黄金比：蛋白 30% / 碳水 40% / 脂肪 30%；蛋白 1.6-2.2g/kg 优先满足，碳水分训练日/休息日调整</div>
      </div>
    `;
  },
});
