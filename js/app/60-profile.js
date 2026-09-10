// 60-profile.js —— 个人档案 / 生活科普（自 app.js 机械拆分 · v2026.0905 模块化；文学欣赏已删除 v2026.0906）
// [功能组] G8-首页导航（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// v11.8：旧「空间·我」页 _wbMe 已删除——「空间」全面升级为「小家」（75-home99.js，gotoWb('me') 重定向 home99）；
//        个人档案 + BMI 迁入【数据中心 → 主人档案】（50-habit-data.js），系统运行日志迁入【同步页】（125-journal-sync.js）。
Object.assign(App, {
  // v3.99：BMI 科学建议（v11.8 自旧「空间·我」页保留，供数据中心「主人档案」页复用；营养/糖/钠/维生素分析统一并入【健康数据 → 消化代谢模型】）
  _wbMeBmiCard() {
    const profile = Store.getProfile();
    const height = +profile.height || 0, weight = +profile.weight || 0;
    if (!height || !weight) {
      return `<div class="card" style="margin-top:12px">
        <div class="card-title"><span class="ico">🥗</span>BMI 科学建议</div>
        <div style="font-size:13px;color:var(--text-soft);margin-top:6px">先在上方档案填写身高体重，保存后即可获得：BMI · 增肌/减脂建议。当日糖/脂肪/钠/维生素摄入分析已迁至【健康数据 → 消化代谢模型】。</div>
      </div>`;
    }
    const bmi = Store.getBMI();
    // 科学建议：BMI < 18.5 增肌增重；18.5-23.9 保持塑形；≥24 减脂
    let plan = '';
    if (bmi.value < 18.5) plan = `🍎 <b>科学增肌方案</b>：热量盈余 +300~500 kcal/天；蛋白质 1.6-2.2 g/kg（约 ${Math.round(weight*1.6)}-${Math.round(weight*2.2)} g/天）；力量训练 3-5 次/周（深蹲/硬拉/卧推），睡眠 ≥7.5h。`;
    else if (bmi.value < 24) plan = `💪 <b>科学塑形方案</b>：热量收支平衡；蛋白质 1.4-1.8 g/kg（约 ${Math.round(weight*1.4)}-${Math.round(weight*1.8)} g/天）；力量+有氧结合，保持体脂率稳定。`;
    else if (bmi.value < 28) plan = `🔥 <b>科学减脂方案</b>：热量缺口 300~500 kcal/天；蛋白质 1.6-2.0 g/kg（约 ${Math.round(weight*1.6)}-${Math.round(weight*2.0)} g/天）防掉肌肉；有氧 150+ min/周 + 力量 2-3 次；戒含糖饮料。`;
    else plan = `⚠️ <b>科学减脂方案（医学建议）</b>：建议先咨询医生；热量缺口 500 kcal/天起步；低 GI 饮食 + 每日步数 ≥8000；每周固定复测体重。`;
    return `<div class="card" style="margin-top:12px">
      <div class="card-title"><span class="ico">🥗</span>BMI · 科学增肌/减脂建议 <span class="sub">BMI = ${bmi.value.toFixed(1)}（${bmi.label}）</span></div>
      <div style="font-size:13px;line-height:1.9;margin-top:8px">${plan}</div>
      <div style="font-size:12px;color:var(--text-soft);margin-top:8px">当日糖/脂肪/钠/维生素摄入分析已升级并入【健康数据 → 消化代谢模型】（根据三餐打卡自动估算，无需手动填写）。</div>
    </div>`;
  },
  // ====== 记录板块·生活科普（每日0点刷新 6 张科普卡）；文学欣赏卡已删除（v2026.0906）======
  _wbLifeSci(wb, W) {
    const pool = Array.isArray(W.readScience) ? W.readScience : [];
    const items = Store.dailySeedPick('wb_lifesci_daily', pool, 6, { preferUniquePerDay: true });
    const today = Store.today();
    let html = `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🧪</span>生活科普 · 每日 6 张 · 0 点自动刷新
        <span class="sub" style="font-size:12px;color:#94a3b8;margin-left:6px">今天 ${today} · 题库池 ${pool.length} 条</span>
      </div>
      <div style="margin-top:8px;font-size:12px;color:#0f172a">📚 从食品/健康/心理/物理/运动/常识 6 个维度随机抽取，看完这 6 张才算今日学习任务完成。
        <button class="btn btn-sm btn-primary" style="margin-left:8px" onclick="App.gotoWb('read_sc')">📰 进入长文阅读页</button>
      </div>
    </div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">`;
    items.forEach((it, i) => {
      const title = it.title || ('科普 ' + (i+1));
      // v2.1.0 修复：题库实际字段为 topic/body（此前误用 summary/text 导致卡片正文空白）
      const sum = (it.topic || it.summary || it.subtitle || '').slice(0, 90);
      const body = (it.body || it.text || it.content || '').slice(0, 140);
      const url = (it.url || it.link || '').trim();
      const icoMap = ['🍎','🧠','❤️','🌍','⚡','🧘'];
      const ico = it.icon || it.ico || icoMap[i % icoMap.length];
      html += `<div class="card kp-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#dbeafe,#fae8ff);display:flex;align-items:center;justify-content:center;font-size:18px">${ico}</div>
          <div style="font-weight:900;color:#0f172a;font-size:13px">${this.esc(title)}</div>
        </div>
        <div class="kp-summary">${this.esc(sum)}</div>
        ${body?`<div style="margin-top:6px;font-size:12px;color:#475569;line-height:1.6">${this.esc(body)}${body.length>=140?'…':''}</div>`:''}
        ${url?`<div style="margin-top:8px"><a class="btn btn-sm" style="background:#ecfeff;color:#0e7490;border:1px solid #67e8f9" target="_blank" rel="noopener noreferrer" href="${this.esc(url)}">🔗 来源 / 扩展阅读</a></div>`:''}
      </div>`;
    });
    html += `</div>`;
    // 额外：科普小测试（3 道判断题，答对仅提示，无奖励）
    html += this._renderLifeSciMiniQuiz(items);
    return html;
  },
  _renderLifeSciMiniQuiz(items) {
    const today = Store.today();
    const stateKey = `wb_lifesci_quiz_${today}`;
    let state = { answered:{} };
    try {
      const raw = Store.getSetting(stateKey, null);
      if (raw) state = Object.assign(state, JSON.parse(raw));
    } catch(_){}
    let qs = [];
    items.forEach(it => {
      // v2.1.0 修复：题库无 truth/trivia/summary 字段，取正文第一句作为真命题来源
      const bodyFirst = ((it.body || '').split(/[。！？!?]/).filter(s => s.trim())[0]) || '';
      const truthy = (it.truth || it.trivia || it.summary || bodyFirst || it.title || '').toString().trim();
      if (!truthy) return;
      qs.push({ title: it.title || '科普', q: `判断："${truthy.slice(0,50)}${truthy.length>50?'…':''}" 是否正确？`, a: true, it });
    });
    // 补充：生成一道错误题
    if (items.length >= 2) {
      const a = items[0].title || '';
      const b = items[1].topic || items[1].summary || items[1].title || '';
      if (a && b) qs.push({ title: '易错辨析', q: `判断："${a.slice(0,10)} 就是 ${b.slice(0,30)}${b.length>30?'…':''}" 是否正确？`, a: false, it: {title:'易错辨析'} });
    }
    const chosen = qs.slice(0, 3);
    let html = `<div class="card" style="margin-top:16px"><div class="card-title"><span class="ico">✅</span>生活科普 · 小测（判断题 · 检验今日阅读成果）</div>`;
    chosen.forEach((q, i) => {
      const ans = state.answered[i];
      const done = ans !== undefined;
      const right = done && (!!ans.u === !!q.a);
      html += `<div class="kp-card" style="margin-top:10px">
        <div style="font-weight:800;color:#0f172a;margin-bottom:6px">Q${i+1} · ${this.esc(q.title)}</div>
        <div style="font-size:12px;color:#334155;margin-bottom:8px">${this.esc(q.q)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-sm btn-primary" ${done?'disabled':''} onclick="App._wbSciAns(${i},true)">✓ 对</button>
          <button class="btn btn-sm btn-warning" ${done?'disabled':''} onclick="App._wbSciAns(${i},false)">✗ 错</button>
          ${done?`<span class="chip ${right?'chip-green':'chip-red'}">${right?'✅ 正确':'❌ 错误 正确答案：'+(q.a?'对':'错')}</span>`:''}
        </div>
      </div>`;
    });
    html += `</div>`;
    this._wbSciQCache = { stateKey, chosen };
    return html;
  },
  _wbSciAns(i, u) {
    if (!this._wbSciQCache) return alert('页面已过期，请刷新后再作答');
    const { stateKey, chosen } = this._wbSciQCache;
    let state; try { state = JSON.parse(Store.getSetting(stateKey, '{"answered":{}}')) || {answered:{}}; } catch(_){ state = {answered:{}}; }
    if (state.answered[i] !== undefined) return;
    const q = chosen[i];
    const ok = !!u === !!q.a;
    state.answered[i] = { u, t: Date.now(), r: ok };
    Store.setSetting(stateKey, JSON.stringify(state));
    if (ok) {
      this._flash(`✅ 答对，继续保持！`);
    } else {
      this._flash(`❌ 答错，正确答案是 ${q.a?'对':'错'}`);
    }
    App.render_workbench();
  },
  wbClaim(id) {
    let r;
    if (id === 'ledger') r = Store.checkTodayLedgerReward(true);
    else if (id === 'diary') r = Store.checkTodayDiaryReward(true);
    else if (id === 'memory') r = Store.checkTodayMemoryReward(true);
    if (r && r.ok) {
      this._flash(r.msg);
    }
    else if (r) alert(r.msg || '条件未达成');
    this.render_workbench();
  },
  wbSettleRead() {
    const r = Store.settleReadProgress();
    if (r && r.ok) {
      this._flash(r.msg);
    }
    else if (r) this._flash(r.msg || '暂无可结算的阅读时长');
    this.render_workbench();
  },
  _wbLedger(wb, W) {
    // v12.9.46 经济数据页重做：不对称淡粉设计（画风对齐学习/运动数据的简约风 · 主色淡粉 #EC4899 与白渐变）
    // 数据口径与 v10.0 完全一致：收支双模式（_lgTab）· 管家 50/30/20 · 消费卡自动入账 · 违规标记
    const tab = this._lgTab || 'expense';
    const isIncome = tab === 'income';
    const sum = Store.ledgerSummary();
    const sumIn = Store.ledgerSummaryIncome();
    const listAll = Store.getLedger().filter(x => x.date === Store.today());
    const list = listAll.filter(x => isIncome ? x.type === 'income' : x.type !== 'income').slice(0, 30);
    const cats = isIncome ? (CONFIG.ledgerIncomeCategories || []) : CONFIG.ledgerCategories;
    const reward = Store.checkTodayLedgerReward(false);
    const monthBalance = sumIn.monthTotal - sum.monthTotal;
    const todayOut = listAll.filter(x => x.type !== 'income').reduce((a, x) => a + (+x.amount || 0), 0);
    const fmt = (v) => '¥' + (Math.round(v * 100) / 100).toFixed(2);
    const secT = (t, n) => `<div class="ec99-sec-t"><i class="ec99-sec-dot"></i>${t}<em>${n || ''}</em></div>`;
    // —— 不对称 Hero：今日任务（左数字右按钮 · 斜切装饰）——
    let html = `<div class="ec99-page">
      <div class="ec99-hero">
        <div class="ec99-hero-top">
          <div class="ec99-hero-meta">
            <div class="ec99-hero-tag">💰 经济数据</div>
            <div class="ec99-hero-desc">收支流水 · 管家 50/30/20 科学分配 · 消费卡自动入账</div>
          </div>
          <button class="ec99-hero-btn${reward.already ? ' ok' : ''}" onclick="App.wbClaim('ledger')" ${reward.already || !(reward.ok || reward.ready) ? 'disabled' : ''}>${reward.already ? '✓ 已达成' : '完成今日任务'}</button>
        </div>
        <div class="ec99-hero-kpi">
          <span>今日经济数据</span>
          <b>${reward.count || 0}<i>/${W.ledgerMinCount || 2} 条</i></b>
          <small>${this.esc(reward.msg || '')}</small>
        </div>
      </div>`;
    // —— 不对称 Bento 总览：本月支出占左侧大格（跨两行）· 收入/结余右侧错落 ——
    html += secT('本月总览') + `<div class="ec99-bento">
        <div class="ec99-cell big">
          <span class="ec99-cell-n">💸 本月支出</span>
          <b class="ec99-amt-out">${fmt(sum.monthTotal)}</b>
          <span class="ec99-cell-sub">今日已支出 ${fmt(todayOut)} · ${listAll.filter(x => x.type !== 'income').length} 笔</span>
        </div>
        <div class="ec99-cell">
          <span class="ec99-cell-n">💰 本月收入</span>
          <b class="ec99-amt-in">${fmt(sumIn.monthTotal)}</b>
        </div>
        <div class="ec99-cell">
          <span class="ec99-cell-n">${monthBalance >= 0 ? '🌹 本月结余' : '⚠️ 本月超支'}</span>
          <b style="color:${monthBalance >= 0 ? '#059669' : '#E11D48'}">${fmt(Math.abs(monthBalance))}</b>
        </div>
      </div>
      <div class="ec99-strip"><span>正常累计支出 <b>${fmt(sum.total - sum.violationTotal)}</b></span><span>累计收入 <b>${fmt(sumIn.total)}</b></span><span>违规支出 <b style="color:#E11D48">${fmt(sum.violationTotal)}</b></span></div>`;
    // —— 管家可支配收入分配（50/30/20 · 功能原样保留）——
    html += secT('管家' + this._butlerName + ' · 可支配收入分配') + this._butlerBudgetCard('wbIncomeInput', 'render_workbench');
    // —— 记一笔：不对称收支切换（左宽右窄）——
    html += secT(isIncome ? '记一笔 · 收入' : '记一笔 · 支出') + `<div class="ec99-form">
      <div class="ec99-tabs">
        <button type="button" class="ec99-tab${!isIncome ? ' on' : ''}" onclick="App._lgTab='expense';App.render_workbench()">💸 记支出<em>消费 · 自动入账</em></button>
        <button type="button" class="ec99-tab${isIncome ? ' on' : ''}" onclick="App._lgTab='income';App.render_workbench()">💰 记收入<em>工资 · 稿费…</em></button>
      </div>
      <div class="ec99-form-row">
        <label class="ec99-f-amt">${isIncome ? '收入金额(元)' : '支出金额(元)'}<input type="number" id="wbLgAmt" class="input" min="0.01" step="0.01" placeholder="输入金额"></label>
        <label class="ec99-f-date">日期<input type="date" id="wbLgDate" class="input" value="${Store.today()}"></label>
      </div>
      <label class="ec99-f-cat">${isIncome ? '收入分类（点击切换）' : '支出分类（点击切换）'}<div class="ec99-chips">
        ${cats.map(c => `<span class="ec99-chip${this._curCat === c.id ? ' on' : ''}" onclick="App.setLedgerCat('${c.id}')">${c.icon} ${this.esc(c.name)}</span>`).join('')}
      </div></label>
      <label class="ec99-f-note">备注(可选)<input type="text" id="wbLgNote" class="input" placeholder="${isIncome ? '如：10月工资 / 投稿稿费...' : '在哪消费的 / 购买什么...'}"></label>
      <button class="btn ec99-save" onclick="App.wbSaveLedger()">💾 记一笔${isIncome ? '收入' : ''}</button>
    </div>`;
    // —— 今日流水：左竖条 + 图标 + 双行文字 + 金额（不对称列表）——
    html += secT(`今日${isIncome ? '收入' : '支出'}流水`, `${list.length} 条`);
    if (!list.length) html += `<div class="ec99-empty">${isIncome ? '今天还没记收入，发工资时记得回来记一笔' : '今天还没记经济数据，先记两笔试试'}</div>`;
    list.forEach(l => {
      const cat = (cats || []).find(c => c.id === l.category) || {};
      const isInc = l.type === 'income';
      html += `<div class="ec99-li${isInc ? ' in' : ''}${l.violation ? ' bad' : ''}">
        <i></i>
        <span class="ec99-li-ico">${cat.icon || '💸'}</span>
        <span class="ec99-li-bd">
          <b>${this.esc(cat.name || l.category || '')}${l.violation ? ' <em class="ec99-bad-t">⚠违规</em>' : ''}</b>
          <small>${l.note ? this.esc(l.note) + ' · ' : ''}${l.date}</small>
          ${!isInc ? `<small class="ec99-li-say">${this._afu99AvatarHtml(13, 'pxafu-inline')}${this.esc(this._butlerSpendAdvice(l))}</small>` : ''}
        </span>
        <b class="ec99-li-amt${isInc ? ' in' : ''}">${isInc ? '+' : '-'}¥${Number(l.amount).toFixed(2)}</b>
      </div>`;
    });
    // 今日收入摘要（支出 tab 时也显示一笔收入概览，双向可见）
    if (!isIncome) {
      const todayIn = listAll.filter(x => x.type === 'income');
      if (todayIn.length) {
        html += secT('今日收入概览', `${todayIn.length} 条`);
        todayIn.forEach(l => {
          const cat = (CONFIG.ledgerIncomeCategories || []).find(c => c.id === l.category) || {};
          html += `<div class="ec99-li in">
            <i></i>
            <span class="ec99-li-ico">${cat.icon || '💰'}</span>
            <span class="ec99-li-bd"><b>${this.esc(cat.name || l.category || '')}</b><small>${l.note ? this.esc(l.note) + ' · ' : ''}${l.date}</small></span>
            <b class="ec99-li-amt in">+¥${Number(l.amount).toFixed(2)}</b>
          </div>`;
        });
      }
    }
    // v2026.0906 消费建议卡：科学消费 / 警惕消费主义（20 篇每日轮换，功能原样保留）
    html += this.renderFinanceArticle();
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div></div>`;
    return html;
  },
  wbSaveLedger() {
    const date = document.getElementById('wbLgDate').value || Store.today();
    const amt = parseFloat(document.getElementById('wbLgAmt').value);
    const note = (document.getElementById('wbLgNote').value || '').trim();
    if (!amt || amt <= 0) return alert('请输入金额');
    const isIncome = (this._lgTab || 'expense') === 'income';
    // 收入分类默认工资；支出分类默认餐饮（未选时）
    let cat = this._curCat || (isIncome ? 'salary' : 'meal');
    // 防：收入 tab 下误选了支出分类 id → 归入其他收入
    if (isIncome && !(CONFIG.ledgerIncomeCategories || []).some(c => c.id === cat)) cat = 'otherIn';
    if (!isIncome && (CONFIG.ledgerIncomeCategories || []).some(c => c.id === cat)) cat = 'meal';
    const violationCats = new Set(['game', 'lottery', 'adult']);
    Store.addLedger({ id: Store._id ? Store._id() : ('id'+Date.now().toString(36)), date, amount: amt, category: cat, note, violation: !isIncome && violationCats.has(cat), type: isIncome ? 'income' : 'expense' });
    if (isIncome) {
      this._flash(`💰 收入已记录 +¥${amt.toFixed(2)}，本月结余已更新`);
    } else {
      // 管家阿福对这笔支出的即时点评（如：奶茶→健康提醒）
      this._flash(this._butlerSpendAdvice({ amount: amt, category: cat, note }));
    }
    this.render_workbench();
  },
  // v2026.0906 日记页合并：旧「完整日记」特有功能（编辑/删除/附图/心情热力图/心理卡片/历史日记）并入新版
  _wbDiary(wb, W) {
    const diaries = Store.getDiaries();
    const todayDiaries = diaries.filter(d => d.date === Store.today());
    const moods = ['', '😢', '😕', '😐', '🙂', '😄'];
    const tags = CONFIG.diaryTags;
    const reward = Store.checkTodayDiaryReward(false);
    const chars = (reward && reward.chars !== undefined) ? reward.chars : todayDiaries.reduce((s, x) => s + (x.content ? String(x.content).length : 0), 0);
    const editing = this._diaryEditing ? (diaries.find(d => d.id === this._diaryEditing) || null) : null;
    let html = `<div class="card"><div class="card-title"><span class="ico">📔</span>今日日记 · ${chars}/${W.diaryMinChars||100} 字</div>
      <div style="margin-top:6px;color:${reward.already?'#15803d':'var(--text-soft)'};font-size:13px">${this.esc(reward.msg||'')}</div>
      <div style="margin-top:10px"><button class="btn ${reward.already?'btn-ghost':'btn-primary'}" onclick="App.wbClaim('diary')" ${reward.already||!(reward.ok||reward.ready)?'disabled':''}>${reward.already?'✓ 今日已达成':'完成今日日记任务'}</button></div>
    </div>`;
    // —— 写作/编辑表单（复用 dy* 元素 ID，setDiaryMood/toggleDiaryTag/saveDiary 通用）——
    html += `<div class="ledger-form">
      <div class="card-title" style="padding:0;margin:0 0 12px"><span class="ico">${editing ? '✏️' : '📝'}</span>${editing ? '编辑日记' : '写一篇日记 / 随笔'}</div>
      <div class="field"><label>日期</label><input type="date" id="dyDate" class="input" value="${editing ? editing.date : Store.today()}"></div>
      <div class="field"><label>标题（可选）</label><input type="text" id="dyTitle" class="input" placeholder="今天是有意义的一天..." value="${editing ? this.esc(editing.title) : ''}"></div>
      <div class="field"><label>今日心情</label>
        <div class="mood-row">
          ${moods.slice(1).map((m, i) => `<button class="mood-btn ${editing && editing.mood === i+1 ? 'active' : ''}" onclick="App.setDiaryMood(${i+1})" type="button" id="dyMood${i+1}">${m}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>标签（多选）</label>
        <div>
          ${tags.map(t => `<span class="tag-chip ${editing && editing.tags && editing.tags.includes(t) ? 'active' : ''}" onclick="App.toggleDiaryTag('${t}')" data-tag="${t}">#${this.esc(t)}</span>`).join('')}
        </div>
      </div>
      <div class="field"><label>正文</label><textarea class="textarea" id="dyContent" style="min-height:160px" placeholder="把今天的感受、身体变化、学习反思都写下来吧...">${editing ? this.esc(editing.content) : ''}</textarea>
        <div style="font-size:12px;color:var(--text-soft);margin-top:6px">实时字数：<b id="dyCharCount">0</b> / ${W.diaryMinChars||100}</div>
      </div>
      <div class="field"><label>附图（可选，最多 3 张，单张 ≤500KB）</label>
        <input type="file" id="dyImages" accept="image/*" multiple onchange="App.previewDiaryImages()" style="font-size:12px">
        <div id="dyImagesPreview" class="diary-img-preview"></div>
        ${editing && editing.images && editing.images.length ? `<div class="diary-img-preview"><div style="font-size:11px;color:var(--text-soft);margin-bottom:4px">已附图（编辑后保留）：</div>${editing.images.map((src, i) => `<div class="diary-img-thumb" role="img" style="background-image:url('${src.replace(/'/g, "\\'")}');background-size:cover;background-position:center"><button onclick="App.removeDiaryImg(${i})">×</button></div>`).join('')}</div>` : ''}
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="App.saveDiary()">${editing ? '💾 保存修改' : '💾 保存日记'}</button>
        ${editing ? `<button class="btn btn-ghost" onclick="App.cancelEditDiary()">取消编辑</button>` : ''}
      </div>
    </div>`;
    // 实时字数统计（innerHTML 内联 script 不执行，用事件绑定）
    setTimeout(() => {
      const el = document.getElementById('dyContent');
      const cc = document.getElementById('dyCharCount');
      if (el && cc) {
        const upd = () => { cc.textContent = String(el.value || '').length; };
        el.removeEventListener('input', upd); el.addEventListener('input', upd); upd();
      }
    }, 60);
    // —— 35 天心情热力图（旧完整日记迁入）——
    html += this.renderMoodHeatmap();
    html += `<div class="section-label">今日已写 (${todayDiaries.length})</div>`;
    if (!todayDiaries.length) html += `<div class="empty">今天还没写日记，写满 100 字即完成今日任务～</div>`;
    todayDiaries.forEach(d => { html += this._wbDiaryCard(d, moods); });
    html += `<div class="section-label">历史日记 (${diaries.length})</div>`;
    if (!diaries.length) html += `<div class="empty">📔 还没有日记，写下第一篇吧！</div>`;
    diaries.filter(d => d.date !== Store.today()).slice(0, 100).forEach(d => { html += this._wbDiaryCard(d, moods); });
    // —— 心理知识卡片（旧完整日记迁入，每日轮换）——
    html += this.renderPsychCard();
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  // 日记卡片渲染（附图 + 标签 + 编辑/删除操作）
  _wbDiaryCard(d, moods) {
    const m = moods[d.mood] || '😐';
    return `<div class="diary-card">
      <div class="diary-head"><div class="diary-date">${d.date} · ${new Date(d.updated).toLocaleString('zh-CN',{hour12:false})}</div><div class="diary-mood">${m}</div></div>
      ${d.title?`<div class="diary-title">${this.esc(d.title)}</div>`:''}
      <div class="diary-content">${this.esc(d.content)}</div>
      ${(d.images && d.images.length) ? `<div class="diary-img-list">${d.images.map(src => `<span class="diary-img" role="img" aria-label="附图" style="background-image:url('${src.replace(/'/g, "\\'")}')" onclick="App.openImage('${src.replace(/'/g, "\\'")}')"></span>`).join('')}</div>` : ''}
      ${(d.tags && d.tags.length)?`<div class="diary-tags">${d.tags.map(t=>`<span class="diary-tag">#${this.esc(t)}</span>`).join('')}</div>`:''}
      <div class="diary-actions">
        <button onclick="App.editDiary('${d.id}')">✏️ 编辑</button>
        <button class="del" onclick="App.deleteDiary('${d.id}')">🗑️ 删除</button>
      </div>
    </div>`;
  },
  // ===== v12.6 待办 · 重要四象限（艾森豪威尔矩阵）=====
  // q1 重要且紧急·立即做 / q2 重要不紧急·计划做 / q3 紧急不重要·快速处理 / q4 不重要不紧急·少做为妙
  _TODO_Q: {
    1: { ico: '🔥', name: '重要且紧急', act: '立即做',   color: '#b91c1c', bg: 'linear-gradient(160deg,#fef2f2 0%,#fee2e2 100%)', border: '#fecaca' },
    2: { ico: '🌱', name: '重要不紧急', act: '计划做',   color: '#047857', bg: 'linear-gradient(160deg,#f0fdf4 0%,#dcfce7 100%)', border: '#a7f3d0' },
    3: { ico: '🤝', name: '紧急不重要', act: '快速处理', color: '#b45309', bg: 'linear-gradient(160deg,#fffbeb 0%,#fef3c7 100%)', border: '#fde68a' },
    4: { ico: '🍃', name: '不重要不紧急', act: '少做为妙', color: '#475569', bg: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 100%)', border: '#e2e8f0' },
  },
  _wbTodo(wb, W) {
    const plans = wb.todoPlans || [];
    const Q = this._TODO_Q;
    let html = `<div class="card"><div class="card-title"><span class="ico">⏳</span>待办计划 · 重要四象限</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">按<b>重要 × 紧急</b>把事情放进四个象限：先做 <b style="color:#b91c1c">🔥 重要且紧急</b>，多留时间给 <b style="color:#047857">🌱 重要不紧急</b>（自我管理的主战场），<b style="color:#b45309">🤝 紧急不重要</b>快速处理掉，<b style="color:#475569">🍃 不重要不紧急</b>能少做就少做。点击待办右侧象限徽章可随时挪格子。需要按日期<b>倒计时</b>的日程（考试/假期/还款）请使用【<a href="javascript:void(0)" onclick="App.gotoWb('countdown')" style="color:var(--primary);font-weight:700">倒数日</a>】。</div>
      <div class="field" style="margin-top:8px"><label>事项标题</label><input type="text" id="wbTodoTitle" class="input" placeholder="如：买牛奶、交作业、给家里打电话..."></div>
      <div class="field" style="margin-top:6px"><label>目标日期</label><input type="date" id="wbTodoTarget" class="input" value="${Store.today()}"></div>
      <div class="field" style="margin-top:6px"><label>放入哪个象限</label>
        <div class="tq-picker">${[1,2,3,4].map(k => `
          <div class="tq-pick${k === 2 ? ' on' : ''}" id="tqPick${k}" onclick="App._todo99PickQ(${k})">
            <span>${Q[k].ico}</span><b>${Q[k].name}</b><i>${Q[k].act}</i>
          </div>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary" onclick="App.wbAddTodo()">➕ 添加待办</button>
    </div>`;
    // —— 四象限矩阵 ——
    const buckets = { 1: [], 2: [], 3: [], 4: [] };
    plans.forEach(p => buckets[(p.q >= 1 && p.q <= 4) ? p.q : 2].push(p)); // 旧存档无 q → 归入 q2
    const now0 = new Date(); now0.setHours(0,0,0,0);
    html += `<div class="section-label">重要四象限（${plans.length} 项 · 未完成 ${plans.filter(p => !p.done).length} 项）</div>`;
    html += `<div class="tq-matrix">
      <div class="tq-axis-top"><span>紧急 →</span><span>← 不紧急</span></div>
      <div class="tq-grid">`;
    const cell = (k) => {
      const list = buckets[k].sort((a, b) => new Date(a.target) - new Date(b.target));
      const rows = list.map(p => {
        const t = new Date(p.target); t.setHours(0,0,0,0);
        const days = Math.floor((t.getTime() - now0.getTime()) / 86400000);
        const tag = p.done ? '已完成' : (days < 0 ? `逾期 ${-days} 天` : (days === 0 ? '就是今天' : `剩 ${days} 天`));
        const dead = !p.done && days < 0;
        return `<div class="tq-item${p.done ? ' done' : ''}${dead ? ' dead' : ''}">
          <div class="tq-check${p.done ? ' on' : ''}" onclick="App.wbToggleTodo('${p.id}')">${p.done ? '✓' : ''}</div>
          <div class="tq-txt">
            <div class="tq-t">${this.esc(p.title)}</div>
            <div class="tq-d">📅 ${p.target} · ${tag}</div>
          </div>
          <button class="tq-qbtn q${k}" title="点击挪到下一象限" onclick="App.wbCycleTodoQ('${p.id}')">${Q[k].ico}</button>
          <button class="tq-del" onclick="App.wbDelTodo('${p.id}')">🗑️</button>
        </div>`;
      }).join('');
      const open = list.filter(p => !p.done).length;
      return `<div class="tq-cell q${k}">
        <div class="tq-head">
          <span class="tq-h-ico">${Q[k].ico}</span>
          <span class="tq-h-name">${Q[k].name}</span>
          <span class="tq-h-act">${Q[k].act}</span>
          <span class="tq-h-n">${open}/${list.length}</span>
        </div>
        <div class="tq-list">${rows || '<div class="tq-empty">空</div>'}</div>
      </div>`;
    };
    html += cell(1) + cell(2) + cell(3) + cell(4);
    html += `</div></div>`;
    // 统计条：未完成分布
    const openN = k => buckets[k].filter(p => !p.done).length;
    const tot = plans.filter(p => !p.done).length || 1;
    html += `<div class="tq-stats">
      ${[1,2,3,4].map(k => `<span class="tq-stat q${k}">${Q[k].ico} ${openN(k)}<i>${Math.round(openN(k) / tot * 100)}%</i></span>`).join('')}
    </div>`;
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  // 添加表单的象限选择（本地状态，默认 q2）
  _todo99PickQ(k) {
    this._todo99Q = k;
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById('tqPick' + i);
      if (el) el.classList.toggle('on', i === k);
    }
  },
  wbAddTodo() {
    const title = (document.getElementById('wbTodoTitle').value || '').trim();
    const target = (document.getElementById('wbTodoTarget').value || '').trim();
    const r = Store.addTodoPlan(title, target, this._todo99Q || 2);
    if (!r.ok) return alert(r.msg || '添加失败');
    this._flash(`⏳ 待办已加入 ${this._TODO_Q[r.plan.q].ico} ${this._TODO_Q[r.plan.q].name}`);
    this.render_workbench();
  },
  // 点击象限徽章：1→2→3→4→1 循环挪格
  wbCycleTodoQ(id) {
    const wb = Store.getWorkbench();
    const p = (wb.todoPlans || []).find(x => x.id === id);
    if (!p) return;
    const next = ((p.q || 2) % 4) + 1;
    Store.setTodoQuadrant(id, next);
    this._flash(`已挪到 ${this._TODO_Q[next].ico} ${this._TODO_Q[next].name} · ${this._TODO_Q[next].act}`);
    this.render_workbench();
  },
  wbToggleTodo(id) { Store.toggleTodoPlan(id); this.render_workbench(); },
  wbDelTodo(id) { if (!confirm('确认删除该待办？')) return; Store.delTodoPlan(id); this.render_workbench(); },
  _wbRead(type, list, W, opts) {
    const typeMap = { English: '四六级英语阅读', Science: '科普阅读' };
    const typeKey = { English:'read_en', Science:'read_sc' }[type] || 'read';
    const curIdx = this._wbReadIdx ? (this._wbReadIdx[type]||0) : 0;
    if (!this._wbReadIdx) this._wbReadIdx = {};
    const item = list[curIdx] || null;
    const wb = Store.getWorkbench();
    const r = wb.read || {};
    const totalMin = Math.floor((r.totalMs || 0) / 60000);
    const slots = Math.floor(totalMin / 15);
    const nextMin = (slots + 1) * 15 - totalMin;
    const clickable = opts && opts.clickableWords;
    let html = `<div class="card"><div class="card-title"><span class="ico">${type==='English'?'📰':type==='Science'?'🔬':'📖'}</span>${this.esc(typeMap[type]||type)} · 累计阅读 <b style="color:var(--primary)">${totalMin}</b> 分钟</div>
      <div style="font-size:13px;color:var(--text-soft);margin-top:6px">阅读进度计时中… 距离下一档（15 分钟）还差 <b>${nextMin}</b> 分钟。页面停留越久累计阅读时长越多（每15分钟结算一档，非线性）。${clickable?'<br><b style="color:#1d4ed8">💡 点任意英文词 → 弹出释义 + 音标 + 朗读（小词典）</b>':''}</div>
      <div style="margin-top:10px"><button class="btn btn-primary" onclick="App.wbSettleRead()">立即结算阅读时长</button>  <button class="btn btn-ghost" onclick="location.reload()">强制刷新阅读计时</button></div>
    </div>`;
    html += `<div class="section-label">文章列表（${list.length}篇 · 点击切换）</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:12px">
        ${list.map((it, i) => `
          <div class="card" style="padding:10px;margin:0;cursor:pointer;${i===curIdx?'border-color:var(--primary);box-shadow:0 0 0 2px var(--primary)':''}" onclick="App.setWbReadIdx('${type}',${i})">
            <div style="font-weight:700;font-size:13px">${this.esc(it.title||'未命名')}</div>
            <div style="font-size:11px;color:var(--text-soft);margin-top:4px">${this.esc((it.level||it.topic||it.author||typeMap[type]) + ' · ' + Math.round((it.body||'').length/500)+'分钟')}</div>
          </div>`).join('')}
      </div>`;
    if (item) {
      const renderPara = (p) => {
        if (!clickable) return `<p style="margin:0 0 14px 0;text-indent:2em">${this.esc(p)}</p>`;
        // 英文点词翻译：逐词包裹；保留标点。
        const tokens = p.split(/(\s+)/);
        const parts = tokens.map(tok => {
          // 识别纯字母+少量合法尾标点（'s, - , : ; . ! ? " ' ( )）
          if (!/[A-Za-z]/.test(tok)) return this.esc(tok);
          // 拆分：首词 + 尾标点
          const m = tok.match(/^([A-Za-z][A-Za-z\-'’]*)([^A-Za-z]*)$/);
          if (!m) return this.esc(tok);
          const word = m[1], punct = m[2] || '';
          const safe = word.replace(/'/g, '\\\'').replace(/"/g, '\\"');
          return `<span style="cursor:pointer;border-bottom:1px dotted #6366f1;color:#1e3a8a" onclick="App.wbLookupWord('${safe}')">${this.esc(word)}</span>${this.esc(punct)}`;
        });
        return `<p style="margin:0 0 14px 0;text-indent:2em;letter-spacing:.2px">${parts.join('')}</p>`;
      };
      html += `<div class="card"><div class="card-title"><span class="ico">📄</span>${this.esc(item.title||'阅读')}${item.level||item.topic?`<span class="ec-level" style="margin-left:6px">${this.esc(item.level||item.topic)}</span>`:''}${item.author?`<span style="margin-left:auto;font-size:12px;color:var(--text-soft);font-weight:500">作者：${this.esc(item.author)}</span>`:''}</div>
        <div style="font-size:12px;color:var(--text-soft);margin-top:4px">⏱ 当前文章会话：<span id="wbReadSessionMin">0</span> 分 <span id="wbReadSessionSec">0</span> 秒</div>
        <div style="font-size:12px;color:var(--text-soft);margin-top:2px">🧾 本次会话累计阅读时长，离开此页会自动计入总时长并结算。</div>
        ${item.url ? `<div style="margin:8px 0"><button class="btn btn-ghost" onclick="window.open('${item.url}','_blank')">🔗 前往原文阅读 ›</button></div>` : ''}
        <div class="ec-block" style="margin-top:12px;line-height:1.95;font-size:15px;padding:12px;border-radius:12px;background:${type==='English'?'linear-gradient(180deg,#eff6ff,#ffffff)':'linear-gradient(180deg,#fefce8,#ffffff)'}">
          ${(item.body||'').split(/\n/).filter(Boolean).map(renderPara).join('')}
        </div>
      </div>`;
    } else {
      html += `<div class="empty">暂无文章，请让管理员补充阅读库。</div>`;
    }
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    this._wbReadSession = `${typeKey}_${curIdx}_${Date.now()}`;
    this._wbReadLast = Date.now();
    return html;
  },
  // Step4：外刊点词翻译 + 朗读
  wbLookupWord(raw) {
    const word = String(raw || '').trim();
    if (!word) return;
    const base = word.toLowerCase();
    const dict = (CONFIG.workbench && CONFIG.workbench.englishMiniDict) || {};
    const entry = dict[base] || dict[base.replace(/[^a-z]/g, '')] || null;
    const speakIfCan = () => { try { this.speakWord(word); } catch (e) {} };
    const pron = entry && entry.p || '';
    const mean = entry && entry.m || '（未收录，继续加油积累～点击🔊尝试系统朗读）';
    const head = entry ? `${entry.w}${pron ? '  ' + pron : ''}` : `${word}`;
    this._modal({
      title: '📖 点词翻译',
      body: `
        <div style="padding:8px 12px;border-radius:10px;background:linear-gradient(180deg,#eff6ff,#fff);border:1px solid #dbeafe">
          <div style="font-size:22px;font-weight:900;color:#1e3a8a">${this.esc(head)}</div>
          <div style="margin-top:10px;padding:10px;background:#fff;border-radius:8px;color:#1e293b;line-height:1.85;font-size:14px">${this.esc(mean)}</div>
          <div style="margin-top:8px;font-size:12px;color:#64748b">💡 若发音不对，可再点一次🔊（需联网；浏览器支持 Web Speech）</div>
        </div>`,
      actions: [
        { label: '🔊 朗读单词', primary: true, onClick: speakIfCan, keep: true },
        { label: '关闭', onClick: null }
      ]
    });
    speakIfCan();
  },

  setWbReadIdx(type, idx) {
    if (!this._wbReadIdx) this._wbReadIdx = {};
    // 切换文章前结算上一篇的阅读时间
    this._flushReadSession();
    this._wbReadIdx[type] = idx;
    this.render_workbench();
  },
  _startWbReadTick() {
    this._stopWbReadTick();
    this._wbReadLast = Date.now();
    if (!this._wbReadSession) {
      const type = this._wbView.replace('read_', ''); // en/sc
      // 简洁映射：en→English, sc→Science
      const readMap = { en:'readEnglish', sc:'readScience' };
      const cfgKey = readMap[type];
      const list = (cfgKey && CONFIG.workbench && CONFIG.workbench[cfgKey]) ? CONFIG.workbench[cfgKey] : [];
      const typeMap2 = { en:'English', sc:'Science' };
      const idx = (this._wbReadIdx && this._wbReadIdx[typeMap2[type]]) || 0;
      this._wbReadSession = `read_${type}_${idx}_${Date.now()}`;
    }
    this._wbReadTick = setInterval(() => {
      const now = Date.now();
      const diff = now - (this._wbReadLast || now);
      this._wbReadLast = now;
      if (diff > 0 && diff < 60000) { // 防止页面隐藏后长间隔
        Store.accumulateReadTime(this._wbReadSession, diff);
      }
      const sEl = document.getElementById('wbReadSessionSec');
      const mEl = document.getElementById('wbReadSessionMin');
      if (sEl && mEl) {
        const wb = Store.getWorkbench();
        const curMs = (wb.read && wb.read.sessions && wb.read.sessions[this._wbReadSession]) || 0;
        const s = Math.floor(curMs / 1000);
        mEl.textContent = Math.floor(s / 60);
        sEl.textContent = s % 60;
      }
    }, 1000);
  },
  _stopWbReadTick() {
    if (this._wbReadTick) { clearInterval(this._wbReadTick); this._wbReadTick = null; }
    this._flushReadSession();
  },
  _flushReadSession() {
    if (!this._wbReadSession || !this._wbReadLast) return;
    const now = Date.now();
    const diff = now - this._wbReadLast;
    if (diff > 0 && diff < 60000) Store.accumulateReadTime(this._wbReadSession, diff);
    this._wbReadSession = null;
    this._wbReadLast = null;
  },
  _wbOutfit(W) {
    const outfit = (W && W.outfit) || {};
    const p = Store.getProfile();
    const bmi = Store.getBMI();
    // 从用户档案回填个性化数据
    const height = p.height || 170;
    const weight = p.weight || 55;
    let age = 21;
    if (p.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) {
      age = Math.max(16, Math.floor((Date.now() - new Date(p.birthDate + 'T00:00:00').getTime()) / (365.25 * 86400000)));
    }
    const gender = p.gender || '男';
    const season = { S:'夏季', W:'冬季', P:'春秋过渡' }[outfit.season || 'P'];
    const seasons = [
      { k:'spring', n:'春季', ico:'🌱' },
      { k:'summer', n:'夏季', ico:'☀️' },
      { k:'autumn', n:'秋季', ico:'🍂' },
      { k:'winter', n:'冬季', ico:'❄️' },
    ];
    const curSeason = this._wbOutfitSeason || (() => {
      const m = new Date().getMonth() + 1;
      if (m>=3 && m<=5) return 'spring';
      if (m>=6 && m<=8) return 'summer';
      if (m>=9 && m<=11) return 'autumn';
      return 'winter';
    })();
    const palette = outfit.palette || [];
    const looks = (outfit.seasonLooks && outfit.seasonLooks[curSeason]) || [];
    const rules = outfit.rules || [];
    // 个性化推荐：按 BMI + 身高/体重
    let bodyLabel = '标准身材', bodyColor = '#15803d', bodyTip = '清爽利落即可，多种风格都能驾驭。';
    if (bmi) {
      if (bmi.value < 18.5) { bodyLabel = '偏瘦矩形身材'; bodyColor = '#0369a1'; bodyTip = '层次叠穿显壮：短款上衣 + 高腰裤拉长比例；避免过度贴身。'; }
      else if (bmi.value < 24) { bodyLabel = '标准匀称身材'; bodyColor = '#15803d'; bodyTip = '标准身材基本通吃：衬衫/T恤/夹克搭配西裤或直筒牛仔裤都好看。'; }
      else if (bmi.value < 28) { bodyLabel = '微胖苹果/梨形'; bodyColor = '#b45309'; bodyTip = 'V领/深色上半身显瘦 + 高腰直筒裤；避免横向条纹和大图案。'; }
      else { bodyLabel = '高 BMI 壮硕体型'; bodyColor = '#b91c1c'; bodyTip = '优先选垂感面料、合身版型、纯色；竖条纹 + 深色上下同色系显精神。'; }
    }
    // 根据幸运色 + 档案（身高/体重/BMI）生成 2 条专属推荐
    const fort = Store.getTodayFortune();
    const luckyColor = fort ? (fort.luckyColor || '') : '';
    const heightTip = (height >= 180) ? '个子高：建议长款大衣/垂感风衣，避免上衣太短显腿长到夸张。'
                : (height <= 165) ? '个子偏矮：建议同色系顺色 + 上短下长（高腰裤），视觉增高 3-5cm。'
                : '身高适中：可自由尝试「上长下短」与「上短下长」多种风格。';
    const customLooksHeader = luckyColor ? `<div style="padding:10px 12px;border-radius:10px;background:#fffbeb;border:1px dashed #fde68a;color:#92400e;font-size:12.5px;line-height:1.7">🎲 <b>今日个性化推荐（来自档案 / 运势）</b>：① 今日幸运色 <b>${luckyColor}</b>，推荐加入一件 ${luckyColor} 单品（T恤/袜子/帽子都可）；② ${heightTip}；③ ${bodyTip}</div>` : '';
    let html = `<div class="card"><div class="card-title"><span class="ico">👕</span>个人穿搭档案（取自「生命征程卡·自填档案」）</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px">
        <div>身高：<b>${height} cm</b></div>
        <div>体重：<b>${weight} kg</b></div>
        <div>年龄：<b>${age} 岁</b></div>
        <div>性别：<b>${gender}</b></div>
        <div>BMI：<b>${bmi ? bmi.value.toFixed(1) + ' · '+bmi.label : (p.bmi||19.03).toFixed(2)}</b> · <span style="color:${bodyColor};font-weight:800">${bodyLabel}</span></div>
        <div>MBTI：<b>${(p.mbti||'未填') || '未填'}</b> · 今日幸运色：<b>${luckyColor || '（档案未完善）'}</b></div>
      </div>
      <div style="margin-top:10px;padding:10px;background:#fff7ed;border-radius:12px;color:#9a3412;font-size:13px;line-height:1.7">${this.esc(bodyTip)}</div>
      ${customLooksHeader}
    </div>`;
    html += `<div class="section-label">季节穿搭（点击切换）</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">
        ${seasons.map(s => `<button class="btn ${curSeason===s.k?'btn-primary':'btn-ghost'}" onclick="App.setWbOutfitSeason('${s.k}')">${s.ico} ${this.esc(s.n)}</button>`).join('')}
      </div>`;
    if (!looks.length) html += `<div class="empty">暂无当季穿搭推荐（可由档案数据自动生成个性化建议）</div>`;
    looks.forEach(l => {
      html += `<div class="card" style="margin-bottom:10px">
        <div class="card-title"><span class="ico">🎯</span>${this.esc(l.name||'Look')}</div>
        <ul style="margin:8px 0 0 0;padding-left:18px;line-height:1.9">
          ${(l.items||[]).map(x=>`<li>${this.esc(x)}</li>`).join('')}
        </ul>
        ${l.tip?`<div style="margin-top:8px;padding:10px;background:#ecfeff;border-radius:12px;color:#0c4a6e;font-size:12.5px;line-height:1.7">💡 ${this.esc(l.tip)}</div>`:''}
      </div>`;
    });
    html += `<div class="section-label">🎨 色彩搭配方案 (${palette.length})</div>`;
    palette.forEach(pa => {
      const colorMap = {'米白':'#fefefe','炭灰':'#3f3f46','黑色':'#18181b','雾霾蓝':'#64748b','卡其':'#b08968','驼色':'#a8794c','燕麦色':'#e7dcc6','深棕':'#5b3a22','克莱因蓝':'#1558d6','白色':'#ffffff','银色':'#cbd5e1','豆沙粉':'#c08497','橄榄绿':'#6b8e23','米灰':'#d6d3d1'};
      html += `<div class="card" style="margin-bottom:10px">
        <div class="card-title"><span class="ico">🎨</span>${this.esc(pa.name||'色彩方案')} <span style="margin-left:auto;font-size:12px;color:var(--text-soft);font-weight:500">场景：${this.esc(pa.scene||'通用')}</span></div>
        <div style="display:flex;gap:6px;margin:8px 0 6px 0">
          ${(pa.colors||[]).map(c=>`<div style="flex:1;height:44px;border-radius:10px;border:1px solid var(--border);background:${colorMap[c]||'#e7e5e4'};display:flex;align-items:end;justify-content:center;font-size:11px;padding-bottom:4px">${this.esc(c)}</div>`).join('')}
        </div>
        <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7">💡 ${this.esc(pa.tip||'')}</div>
      </div>`;
    });
    html += `<div class="section-label">📐 穿搭铁则 (${rules.length})</div><div class="card">`;
    rules.forEach((r, i) => html += `<div style="padding:8px 4px;border-bottom:${i===rules.length-1?'none':'1px dashed var(--border)'};font-size:13.5px;line-height:1.8">📌 ${this.esc(r)}</div>`);
    html += `</div>`;
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  setWbOutfitSeason(k) { this._wbOutfitSeason = k; this.render_workbench(); },
  _wbMemory(wb, W, subjectFilter /* 可选：数组或 null；为 null 时再看 this._wbMemSubject */) {
    const mem = Store.getTodayMemory();
    const reward = Store.checkTodayMemoryReward(false);
    const m = wb.memory || {};
    const today = Store.today();
    let all = (mem.daily||[]).concat(mem.review||[]);
    const filter = Array.isArray(subjectFilter) && subjectFilter.length ? subjectFilter
                 : (Array.isArray(this._wbMemSubject) && this._wbMemSubject.length ? this._wbMemSubject : null);
    if (filter) {
      const fset = new Set(filter);
      all = all.filter(x => fset.has(x._subject));
    }
    const done = all.filter(x => { const s = m.stats[x._k]; return s && s.lastDate === today; }).length;
    const subjects = mem.subjects || ((CONFIG.workbench && CONFIG.workbench.memoryCfg && CONFIG.workbench.memoryCfg.subjects) || []);
    // 各学科统计（若指定了 filter，则只展示 filter 中的学科）
    const subCounts = {};
    all.forEach(x => {
      const sk = x._subject || ('fallback_' + (x._type||'x'));
      subCounts[sk] = subCounts[sk] || { total: 0, done: 0, type: x._type };
      subCounts[sk].total += 1;
      const s = m.stats[x._k]; if (s && s.lastDate === today) subCounts[sk].done += 1;
    });
    const subLabelOf = (k) => {
      const s = subjects.find(x => x.k === k); return (s && s.label) || k;
    };
    const typeLabelOf = (t) => ({ w:'📘', cs:'💻', pol:'🏛️', math:'📐' }[t] || '📚');
    const subGridRows = [];
    Object.keys(subCounts).forEach(k => {
      const c = subCounts[k];
      subGridRows.push(`<div class="card" style="margin:0;padding:8px 10px">
        <div style="font-size:12px;font-weight:800;color:#0f172a">${typeLabelOf(c.type)} ${this.esc(subLabelOf(k))}</div>
        <div style="font-size:11px;color:var(--text-soft);margin-top:2px">${c.done}/${c.total}</div>
        <div style="margin-top:4px;width:100%;height:6px;background:#e7e5e4;border-radius:999px;overflow:hidden">
          <div style="width:${this.pct(c.done,c.total)}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--accent))"></div>
        </div>
      </div>`);
    });
    let html = `<div class="card"><div class="card-title"><span class="ico">🧠</span>每日记忆 · 艾宾浩斯曲线</div>
      <div style="margin-top:8px;font-size:13px">📚 共 ${all.length} 张：新词 ${(mem.daily||[]).length} · 🔁 艾宾浩斯复习 ${(mem.review||[]).length} · ✅ 总进度 <b>${done}</b>/${all.length} · 🚫 72h 去重已启用</div>
      ${subGridRows.length ? `<div style="margin-top:10px;display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${subGridRows.join('')}</div>` : ''}
      <div style="margin-top:6px;color:${reward.already?'#15803d':'var(--text-soft)'};font-size:13px">${this.esc(reward.msg||'')}</div>
      <div style="margin-top:10px"><button class="btn ${reward.already?'btn-ghost':'btn-primary'}" onclick="App.wbClaim('memory')" ${reward.already||!(reward.ok||reward.ready)?'disabled':''}>${reward.already?'✓ 今日已达成':'完成今日记忆任务'}</button></div>
    </div>`;
    const curIdx = this._wbMemIdx || 0;
    const cur = all[curIdx];
    html += `<div class="section-label">卡片 (${done}/${all.length})</div>`;
    if (cur) {
      const typeBadge = { w:'📘 英语', cs:'💻 计算机', pol:'🏛️ 政治', math:'📐 高数' }[cur._type] || '📚';
      const subBadge = cur._subject ? `<span style="margin-left:6px;padding:2px 6px;border-radius:999px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:700">${this.esc(subLabelOf(cur._subject))}</span>` : '';
      const s = m.stats[cur._k] || {};
      const learned = s.lastDate === today;
      html += `<div class="card" style="border:2px solid ${learned?'#15803d':'var(--primary)'};margin-bottom:10px">
        <div class="card-title"><span class="ico">${typeBadge}</span>${subBadge}${cur._review?'<span style="font-size:12px;color:#b45309;font-weight:700;margin-left:4px">🔁 艾宾浩斯复习</span>':''}
          <span style="margin-left:auto;font-size:12px;color:var(--text-soft);font-weight:500">第 ${curIdx+1}/${all.length} 张${learned?' · ✓ 已打卡':''}</span>
        </div>
        ${cur._type==='w' ? `
          <div style="margin-top:10px">
            <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
              <div style="font-size:32px;font-weight:900;color:var(--primary)">${this.esc(cur.w||cur.word||'')}</div>
              <div style="font-size:14px;color:var(--text-soft)">${this.esc(cur.p||cur.phonetic||'')}</div>
              <button class="btn btn-ghost" style="padding:4px 10px;font-size:13px" onclick="App.speakMemWord(${curIdx})">🔊 朗读</button>
            </div>
            <div style="margin-top:10px;padding:12px;background:#ecfeff;border-radius:12px;line-height:1.8;font-size:14px"><b style="color:#0c4a6e">释义：</b>${this.esc(cur.m||cur.meaning||'')}</div>
          </div>` : `
          <div style="margin-top:10px">
            <div style="font-size:17px;font-weight:800;color:var(--primary);padding:10px 12px;background:linear-gradient(90deg,#fef9c3,#fff);border-radius:12px">${this.esc(cur.k||cur.key||'考点')}</div>
            <div style="margin-top:10px;padding:12px;background:#eff6ff;border-radius:12px;line-height:1.85;font-size:14.5px">${this.esc(cur.d||cur.def||'')}</div>
          </div>`
        }
        ${s.step?`<div style="margin-top:10px;font-size:12px;color:var(--text-soft)">🧠 艾宾浩斯阶段：第${s.step}阶段 · 下次复习：${s.nextDate||'今日'}（已复习${s.learned||0}次）</div>`:''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
          <button class="btn" style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;font-weight:800" onclick="App.markWbMem(false)">❌ 再记一次（倒退1阶段）</button>
          <button class="btn btn-primary" onclick="App.markWbMem(true)">✅ 已记住（进阶 + 下一张）</button>
        </div>
        <div style="margin-top:8px">
          <button class="btn btn-ghost" onclick="App.setWbMemIdx(${Math.max(0,curIdx-1)})">← 上一张</button>
          <button class="btn btn-ghost" onclick="App.setWbMemIdx(${Math.min(all.length-1,curIdx+1)})">下一张 →</button>
        </div>
      </div>`;
    } else {
      html += `<div class="empty">今天没有记忆任务（题库可能为空）</div>`;
    }
    // 进度条
    html += `<div class="card"><div class="card-title"><span class="ico">📊</span>全部进度</div>
      <div style="width:100%;height:14px;background:#e7e5e4;border-radius:999px;overflow:hidden;margin-top:8px">
        <div style="width:${this.pct(done, all.length)}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--accent))"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:4px;margin-top:10px">
        ${all.map((x,i)=>{
          const s = m.stats[x._k]; const ok = s && s.lastDate === today;
          return `<div onclick="App.setWbMemIdx(${i})" title="${this.esc(subLabelOf(x._subject||'') + ' · ' + (x.w||x.k||x.key||'条目'))}" style="cursor:pointer;aspect-ratio:1;border-radius:8px;font-size:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;background:${ok?'#15803d':(i===curIdx?'var(--primary)':'#cbd5e1')}">${i+1}</div>`;
        }).join('')}
      </div>
    </div>`;
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  setWbMemIdx(i) { this._wbMemIdx = i; this.render_workbench(); },
  speakMemWord(i) {
    // 从今日记忆数据重新取值，避免 onclick 内 JSON.stringify 引号逃逸白屏
    try {
      const mem = Store.getTodayMemory();
      const all = (mem.daily||[]).concat(mem.review||[]);
      const cur = all[Number(i)];
      const w = cur && (cur.w || cur.word) || '';
      if (!w) return;
      this.speakWord(w);
    } catch(e) { try { alert('朗读失败：'+(e&&e.message||e)); } catch(_){} }
  },
  markWbMem(remembered) {
    const mem = Store.getTodayMemory();
    const all = (mem.daily||[]).concat(mem.review||[]);
    const idx = this._wbMemIdx || 0;
    const cur = all[idx];
    if (!cur) return;
    const r = Store.markMemoryLearned(cur._k, !!remembered);
    this._flash(remembered?'✅ 记住了，艾宾浩斯进阶':'❌ 再记一次，倒退一阶段');
    const next = Math.min(all.length - 1, idx + 1);
    this._wbMemIdx = next;
    this.render_workbench();
  },

  // ====== v6.8 倒数日（自【待办】拆出）+ 纪念日（记录 → 倒数日/纪念日 双入口）======
  // 数据存 Store.load().countdowns[{id,kind:'cd',title,date,ico,note}] 与 memorials[{id,kind:'mem',title,date,ico,repeat,note}]
  _wbCountdown(wb, W) {
    const d = Store.load();
    const cds = (d.countdowns || []);
    // 即将到来排序：按下一个出现日升序；已过期的排后
    const now0 = new Date(); now0.setHours(0,0,0,0);
    const withDays = cds.map(c => {
      const t = new Date(c.date + 'T00:00:00'); t.setHours(0,0,0,0);
      const days = Math.round((t - now0) / 86400000);
      return { ...c, days };
    });
    const coming = withDays.filter(x => x.days >= 0).sort((a, b) => a.days - b.days);
    const passed = withDays.filter(x => x.days < 0).sort((a, b) => b.days - a.days);
    let html = `<div class="card" style="margin-bottom:14px"><div class="card-title"><span class="ico">⏳</span>倒数日 · 倒计时日程</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">考试、假期、还款、纪念日礼物…… 值得期待的日子放这里，每天看一眼还剩多久。来自【待办】的倒数功能已升级独立。</div>
      <div class="field" style="margin-top:8px"><label>事项标题</label><input type="text" id="cdTitle" class="input" placeholder="如：专升本考试、放假回家、驾照路考..."></div>
      <div class="field" style="margin-top:6px"><label>目标日期</label><input type="date" id="cdDate" class="input" value="${Store.today()}"></div>
      <div class="field" style="margin-top:6px"><label>备注（可选）</label><input type="text" id="cdNote" class="input" placeholder="如：上午场 · 带准考证"></div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-primary" onclick="App.cdAdd()">➕ 添加倒数日</button>
        <button class="btn btn-ghost" onclick="App.gotoWb('memorial')">🎂 去纪念日</button>
        <button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button>
      </div>
    </div>`;
    if (coming.length) html += `<div class="section-label">⏰ 即将到来（${coming.length}）</div>`;
    coming.forEach(c => html += this._cdRow(c));
    if (passed.length) html += `<div class="section-label">📆 已过期（${passed.length}）</div>`;
    passed.forEach(c => html += this._cdRow(c));
    if (!withDays.length) html += `<div class="empty">还没有倒数日。添加第一个值得期待的日子吧～</div>`;
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  _cdRow(c) {
    const urgent = c.days <= 7 && c.days >= 0;
    const cls = c.days < 0 ? 'redline-row' : (urgent ? '' : '');
    const tag = c.days < 0 ? `已过期 ${-c.days} 天` : (c.days === 0 ? '就是今天' : `还剩 ${c.days} 天`);
    const color = c.days < 0 ? '#b91c1c' : (c.days === 0 ? '#15803d' : (urgent ? '#b45309' : '#0369a1'));
    return `<div class="log-row ${cls}" style="align-items:center">
      <div class="log-ico">${c.ico || '⏳'}</div>
      <div class="log-body" style="margin-left:8px">
        <div style="font-weight:700">${this.esc(c.title)}</div>
        <div style="font-size:12px;color:var(--text-soft)">📅 ${c.date}${c.note ? ' · ' + this.esc(c.note) : ''}</div>
      </div>
      <div class="log-amt" style="color:${color};font-size:${c.days === 0 ? '15px' : '13px'}">${tag}</div>
      <button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;margin-left:8px" onclick="App.cdDel('${c.id}')">🗑️</button>
    </div>`;
  },
  cdAdd() {
    const title = (document.getElementById('cdTitle').value || '').trim();
    const date = (document.getElementById('cdDate').value || '').trim();
    const note = (document.getElementById('cdNote').value || '').trim();
    if (!title) return this._flash('请填写事项标题');
    if (!date) return this._flash('请选择目标日期');
    const r = Store.addCountdown(title, date, note);
    if (!r.ok) return this._flash(r.msg || '添加失败');
    this._flash('⏳ 倒数日已添加');
    this.render_workbench();
  },
  cdDel(id) {
    if (!confirm('确认删除该倒数日？')) return;
    Store.delCountdown(id);
    this.render_workbench();
  },
  // ====== 纪念日 ======
  _wbMemorial(wb, W) {
    const d = Store.load();
    const mems = (d.memorials || []).map(m => {
      // 下次周年：今年（已过则明年）
      const y = new Date().getFullYear();
      const md = m.date.slice(5); // MM-DD
      let next = `${y}-${md}`;
      const now0 = new Date(); now0.setHours(0,0,0,0);
      if (new Date(next + 'T00:00:00') < now0) next = `${y + 1}-${md}`;
      const days = Math.round((new Date(next + 'T00:00:00') - now0) / 86400000);
      const years = y - Number(m.date.slice(0, 4));
      return { ...m, next, days, years: years > 0 ? years : (years === 0 ? null : 0) };
    }).sort((a, b) => a.days - b.days);
    let html = `<div class="card" style="margin-bottom:14px"><div class="card-title"><span class="ico">🎂</span>纪念日 · 每年都记得</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">生日、在一起的日子、领养三千的日子…… 重要的日子设为纪念日，自动按年倒数，周年自动加一岁。</div>
      <div class="field" style="margin-top:8px"><label>名称</label><input type="text" id="memTitle" class="input" placeholder="如：妈妈生日、和 TA 在一起、领养三千"></div>
      <div class="field" style="margin-top:6px"><label>起始日期（每年此日为纪念日）</label><input type="date" id="memDate" class="input" value="${Store.today()}"></div>
      <div class="field" style="margin-top:6px"><label>备注（可选）</label><input type="text" id="memNote" class="input" placeholder="如：记得订蛋糕"></div>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-primary" onclick="App.memAdd()">➕ 添加纪念日</button>
        <button class="btn btn-ghost" onclick="App.gotoWb('countdown')">⏳ 去倒数日</button>
        <button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button>
      </div>
    </div>`;
    if (mems.length) html += `<div class="section-label">🎂 纪念日（${mems.length}）</div>`;
    mems.forEach(m => {
      const tag = m.days === 0 ? `今天 ${m.years ? '· ' + m.years + ' 周年' : ''}` : `还有 ${m.days} 天`;
      const color = m.days === 0 ? '#15803d' : (m.days <= 30 ? '#b45309' : '#0369a1');
      html += `<div class="log-row" style="align-items:center">
        <div class="log-ico">${m.ico || '🎂'}</div>
        <div class="log-body" style="margin-left:8px">
          <div style="font-weight:700">${this.esc(m.title)}${m.years ? `<span style="font-size:11px;color:#92400e;background:#fef3c7;padding:1px 7px;border-radius:999px;margin-left:6px">已 ${m.years} 年</span>` : ''}</div>
          <div style="font-size:12px;color:var(--text-soft)">📅 起始 ${m.date} · 下次 ${m.next}${m.note ? ' · ' + this.esc(m.note) : ''}</div>
        </div>
        <div class="log-amt" style="color:${color}">${tag}</div>
        <button class="btn btn-ghost" style="padding:4px 8px;font-size:12px;margin-left:8px" onclick="App.memDel('${m.id}')">🗑️</button>
      </div>`;
    });
    if (!mems.length) html += `<div class="empty">还没有纪念日。把最重要的日子记在这里，每年都不会忘～</div>`;
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  memAdd() {
    const title = (document.getElementById('memTitle').value || '').trim();
    const date = (document.getElementById('memDate').value || '').trim();
    const note = (document.getElementById('memNote').value || '').trim();
    if (!title) return this._flash('请填写名称');
    if (!date) return this._flash('请选择起始日期');
    const r = Store.addMemorial(title, date, note);
    if (!r.ok) return this._flash(r.msg || '添加失败');
    this._flash('🎂 纪念日已添加');
    this.render_workbench();
  },
  memDel(id) {
    if (!confirm('确认删除该纪念日？')) return;
    Store.delMemorial(id);
    this.render_workbench();
  },
});
