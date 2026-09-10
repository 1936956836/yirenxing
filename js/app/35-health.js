// 35-health.js —— 戒手冲 / 健康·药物 / 就医数据时间线（自 app.js 机械拆分 · v2026.0905 模块化 · v6.9 原【病历】更名【就医数据】）
// [功能组] G2-生活基础（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
Object.assign(App, {
  // ====== 戒手冲 ======
  render_habit() {
    // 戒断已合并入健康板块，重定向到健康
    this.navigate('health');
  },
  toggleHabit(relapsed) {
    const rec = this.todayRec();
    rec.habit.relapsed = relapsed;
    if (relapsed && !rec.habit.time) {
      const d = new Date();
      rec.habit.time = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }
    if (!relapsed) rec.habit.time = '';
    Store.updateToday({ habit: rec.habit });
    Store.log('戒断打卡', relapsed ? `记录今日「有」 · 戒断天数 ${Store.getHabitStreak()}` : `记录今日「无」 · 戒断天数 ${Store.getHabitStreak()}`);
    this.render_health();
  },
  saveHabitField(f, v) {
    const rec = this.todayRec();
    rec.habit[f] = v;
    Store.updateToday({ habit: rec.habit });
    this.render_health();
  },
  // ====== 健康/药物 ======
  render_health() {
    const rec = this.todayRec();
    const H = CONFIG.habitQuit;
    const habitStreak = Store.getHabitStreak();
    const habitWeek = Store.getHabitWeeklyCount();
    const habitHistory = Store.getHabitHistory(8);
    // v2.0.6：健康隐私（用药 / 复查 / 慢性提示）统一 2004 会话锁
    const hivUnlocked = this._isHealthUnlocked();
    const p5Back = `<div style="margin:14px 0 8px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    let html = p5Back + `
      ${hivUnlocked
        ? `<div class="tip-box danger">🚨 重要提醒：当前疾病均为慢性传染性疾病，治疗是长期战线。请每日按时定量服药，将病毒压制至可监控的健康水平。</div>`
        : `<div class="tip-box" style="background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3">🔒 健康隐私保护中：服药打卡、复查项目、每日药物清单、依从率指标均已隐藏。解锁后可查看与操作（会话级，关页失效）。</div>`}
      <!-- 戒断（合并入健康）-->
      <div class="habit-hero ${rec.habit.relapsed ? 'broken' : 'clean'}">
        <div class="hh-num">${habitStreak}</div>
        <div class="hh-lbl">戒断天数（从 0 起计）</div>
        <div class="hh-sub">${rec.habit.relapsed ? '今日：有 · 已记录' : '今日：无 · 保持中'}</div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">💊</span>健康 6 项 · 北京时间窗口打卡${hivUnlocked?'':' · 🔒 隐私区'}（每项 3~5 金币）</div>
        ${hivUnlocked ? `
        ${this._punchBtnHTML({windowName:'hlMedMorn',  done: Store._isMiniDone('health','hlMedMorn'),  btnText:'💊 吃药（早）', onclick:"App.toggleMedAll('morning')"})}
        ${this._punchBtnHTML({windowName:'hlMedNoon',  done: Store._isMiniDone('health','hlMedNoon'),  btnText:'💊 吃药（午）', onclick:"App.toggleMedAll('noon')"})}
        ${this._punchBtnHTML({windowName:'hlMedNight', done: Store._isMiniDone('health','hlMedNight'), btnText:'💊 吃药（晚）', onclick:"App.toggleMedAll('night')"})}
        ` : `
          <div class="empty" style="text-align:left;margin:12px 0 0;line-height:1.9">
            🔒 隐私项 · 吃药打卡（早/午/晚）已保护。
            <button class="btn btn-primary" style="margin-top:8px" onclick="App._requireHealthUnlock(function(){ App.render_health && App.render_health(); })">🔓 解锁后打卡</button>
          </div>
        `}
        ${this._punchBtnHTML({windowName:'hlBp',       done: Store._isMiniDone('health','hlBp'),       btnText:'🫀 测血压',     onclick:"void 0", extraLabel:'在下方血压记录卡填写'})}
        ${this._punchBtnHTML({windowName:'hlWater',    done: Store._isMiniDone('health','hlWater'),    btnText:`💧 饮水达标 ≥${CONFIG.diet.waterMin||1500}ml`, onclick:"void 0", extraLabel:`当前 ${rec.diet.water||0}ml`})}
        ${this._punchBtnHTML({windowName:'hlTemp',     done: Store._isMiniDone('health','hlTemp'),     btnText:'🌡️ 测温',       onclick:"void 0", extraLabel:'在下方体温记录卡填写'})}
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">🛡️</span>戒断打卡 · 今日有 / 无</div>
        <div class="habit-stats">
          <div class="habit-stat"><div class="hs-num">${habitWeek}/${H.weeklyLimit}</div><div class="hs-lbl">本周次数(上限)</div></div>
          <div class="habit-stat"><div class="hs-num">${habitStreak}</div><div class="hs-lbl">戒断天数</div></div>
        </div>
        <div class="habit-week-bar"><div class="habit-week-fill" style="width:${this.pct(habitWeek, H.weeklyLimit)}%"></div></div>
        <div class="mp-sub" style="margin-top:8px">记录今日「有 / 无」该行为；戒断数从 0 起计，便于客观自我观察。</div>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn ${rec.habit.relapsed ? 'btn-primary' : 'btn-ghost'}" onclick="App.toggleHabit(${!rec.habit.relapsed})">
            ${rec.habit.relapsed ? '✓ 改为今日「无」' : '📝 记录今日「有」'}
          </button>
        </div>
        <div class="field" style="margin-top:12px">
          <label>发生时间（可选）</label>
          <input type="time" class="input" id="habitTime" value="${rec.habit.time}" onchange="App.saveHabitField('time',this.value)">
        </div>
        <div class="field" style="margin-top:12px">
          <label>反思备注</label>
          <textarea class="textarea" id="habitNote" placeholder="记录触发情境、情绪、应对方法...">${this.esc(rec.habit.note)}</textarea>
          <button class="btn btn-primary" style="margin-top:8px" onclick="App.saveHabitField('note',document.getElementById('habitNote').value)">保存备注</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">📜</span>戒除准则</div>
    `;
    H.rules.forEach(r => {
      html += `<div class="check-item done" style="cursor:default"><div class="cbox">✓</div><div class="info"><div class="ds">${this.esc(r)}</div></div></div>`;
    });
    html += '</div>';
    // 戒除收益
    html += `<div class="card"><div class="card-title"><span class="ico">🌟</span>戒除收益</div>`;
    H.benefits.forEach(b => {
      html += `<div class="list-row"><div class="li-ico">✨</div><div class="li-body"><div class="li-ds">${this.esc(b)}</div></div></div>`;
    });
    html += '</div>';
    // 近 90 天「有」记录历史
    html += `<div class="card"><div class="card-title"><span class="ico">📊</span>「有」记录历史(近90天)</div>`;
    if (habitHistory.length === 0) {
      html += '<div class="empty">🎉 暂无「有」记录，继续保持！</div>';
    } else {
      habitHistory.forEach(h => {
        html += `<div class="list-row"><div class="li-ico">⚠️</div><div class="li-body"><div class="li-nm">${h.date}${h.time ? ' ' + h.time : ''}</div><div class="li-ds">${this.esc(h.note || '无备注')}</div></div></div>`;
      });
    }
    html += '</div>';
    html += `
      <div class="card">
        <div class="card-title"><span class="ico">💊</span>每日药物服用${hivUnlocked?'':' · 🔒 隐私项'}</div>
    `;
    if (!hivUnlocked) {
      html += `<div class="empty" style="line-height:2;text-align:left;margin:6px 4px 14px">
          🔒 个人隐私项（每日药物清单、药名、剂量、频次、时段均已保护）。
          <div style="margin-top:8px"><button class="btn btn-primary" onclick="App._requireHealthUnlock(function(){ App.render_health && App.render_health(); })">🔓 解锁后查看 / 打卡</button></div>
        </div>`;
    } else {
      CONFIG.medications.forEach(m => {
        const state = rec.medications[m.id] || { times: [], done: false };
        const perDay = m.perDay || 1;
        // 构建多次服用勾选（如转移因子3次）
        let timesHtml = '';
        if (perDay > 1) {
          timesHtml = '<div style="display:flex;gap:6px;margin-top:6px">';
          for (let i = 0; i < perDay; i++) {
            const checked = state.times && state.times[i];
            timesHtml += `<button onclick="App.toggleMedTime('${m.id}',${i})" style="padding:4px 10px;border-radius:6px;border:1.5px solid ${checked?'var(--primary)':'var(--border)'};background:${checked?'var(--primary-soft)':'#fff'};font-size:12px;cursor:pointer">第${i+1}次 ${checked?'✓':'○'}</button>`;
          }
          timesHtml += '</div>';
        }
        html += `
          <div class="check-item ${state.done ? 'done' : ''} ${m.critical ? 'crit' : ''}" onclick="App.toggleMed('${m.id}')">
            <div class="cbox">${state.done ? '✓' : ''}</div>
            <div class="info">
              <div class="nm">${m.icon} ${this.esc(m.name)} <span class="badge ${m.critical?'red':'green'}">${this.esc(m.category)}</span></div>
              <div class="ds">${this.esc(m.dose)} · ${this.esc(m.time)}${m.note ? ' · ' + this.esc(m.note) : ''}</div>
              ${timesHtml}
            </div>
          </div>
        `;
      });
    }
    html += '</div>';
    // 突发症状处理速查
    html += `
      <div class="card">
        <div class="card-title"><span class="ico">🩹</span>突发症状速查</div>
        <div class="list-row"><div class="li-ico">🩸</div><div class="li-body"><div class="li-nm">痔疮破溃出血</div><div class="li-ds">立即服用3粒柑桔黄酮片</div></div></div>
        <div class="list-row"><div class="li-ico">🤕</div><div class="li-body"><div class="li-nm">偏头痛发作</div><div class="li-ds">立即服止痛药并静卧休息；连续用屏超60分钟须休息20分钟</div></div></div>
        <div class="list-row"><div class="li-ico">👄</div><div class="li-body"><div class="li-nm">口腔溃疡</div><div class="li-ds">西瓜霜喷破溃面 ≥3次/日；多摄入维B维C</div></div></div>
        <div class="list-row"><div class="li-ico">🌿</div><div class="li-body"><div class="li-nm">特应性皮炎(湿疹/荨麻疹)</div><div class="li-ds">皮炎平/丁酸氢化可的松乳膏 + 枸地氯雷他定</div></div></div>
        <div class="list-row"><div class="li-ico">🦶</div><div class="li-body"><div class="li-nm">真菌性皮炎(足藓/股藓)</div><div class="li-ds">立即使用达克宁</div></div></div>
        <div class="list-row"><div class="li-ico">⚠️</div><div class="li-body"><div class="li-nm">低血糖征兆</div><div class="li-ds">心慌/头晕/冷汗时立即补充糖类</div></div></div>
      </div>
    `;
    // 季度复查提醒（敏感复查条目内容默认隐藏，30min 会话级解锁，关页自动失效）
    // （hivUnlocked 在 render_health 开头已声明，此处直接复用）
    const checkupsAll = CONFIG.checkups || [];
    const normal = checkupsAll.filter(c => !this._healthSensMatch(c.name + ' ' + (c.note || '')));
    const sensitive = checkupsAll.filter(c => this._healthSensMatch(c.name + ' ' + (c.note || '')));
    html += `
      <div class="card">
        <div class="card-title"><span class="ico">🏥</span>季度复查提醒${sensitive.length ? ` · <span style="color:#b91c1c">🔒 敏感隐私项 ${sensitive.length} 条</span>` : ''}</div>
    `;
    normal.forEach(c => {
      html += `<div class="list-row"><div class="li-ico">📅</div><div class="li-body"><div class="li-nm">${this.esc(c.name)}</div><div class="li-ds">${this.esc(c.cycle)} · ${this.esc(c.hospital)}<br>${this.esc(c.note)}</div></div></div>`;
    });
    if (sensitive.length) {
      if (hivUnlocked) {
        sensitive.forEach(c => {
          html += `<div class="list-row" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin:6px 4px;padding:10px"><div class="li-ico">🔒</div><div class="li-body"><div class="li-nm" style="color:#b91c1c">${this.esc(c.name)}</div><div class="li-ds">${this.esc(c.cycle)} · ${this.esc(c.hospital)}<br>${this.esc(c.note)}</div></div></div>`;
        });
        html += `<div style="padding:8px 12px;margin-top:6px"><button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" onclick="App.healthSensitiveLock()">🔒 立即重新锁定</button></div>`;
      } else {
        html += `<div class="list-row" style="background:#fef2f2;border:1px dashed #fecaca;border-radius:10px;margin:6px 4px;padding:12px">
          <div class="li-ico">🔐</div>
          <div class="li-body">
            <div class="li-nm" style="color:#b91c1c">健康隐私专项复查已隐藏（共 ${sensitive.length} 条）</div>
            <div class="li-ds">为防止借手机 / 公共场合被他人瞟到，系统自动识别的个人健康隐私记录默认锁定。会话级解锁 · 关闭页面立即失效。</div>
            <div style="margin-top:8px"><button class="btn btn-sm" style="background:#b91c1c;color:#fff" onclick="App.healthSensitiveUnlock()">🔑 输入密码解锁</button></div>
          </div>
        </div>`;
      }
    }
    html += '</div>';
    // 体检项目（同步隐藏敏感专项的具体病名，未解锁只显示"专项复查"占位）
    html += `
      <div class="card">
        <div class="card-title"><span class="ico">🔬</span>年度体检项目 ${hivUnlocked?'':'· 专项隐私项已保护'}</div>
        <div class="list-row"><div class="li-body"><div class="li-nm">无痛胃镜</div><div class="li-ds">肠息肉、病变筛查</div></div></div>
        <div class="list-row"><div class="li-body"><div class="li-nm">胸部低剂量CT</div><div class="li-ds">早期肺癌筛查</div></div></div>
        <div class="list-row"><div class="li-body"><div class="li-nm">乳腺B超/钼靶</div><div class="li-ds">40岁以上钼靶X光</div></div></div>
        <div class="list-row"><div class="li-body"><div class="li-nm">颈动脉B超</div><div class="li-ds">斑块/内膜增厚/血管狭窄</div></div></div>
        <div class="list-row"><div class="li-body"><div class="li-nm">综合检查</div><div class="li-ds">肺部螺旋CT · 胃肠镜 · 呼气实验 · 尿酸血脂 · 甲状腺超声 ${hivUnlocked?'· 感染相关血清联检 + 妇科分型/细胞学联合筛查':''}</div></div>
        ${hivUnlocked?'':'<div class="list-row" style="background:#fafafa;border:1px dashed #e2e8f0;border-radius:10px;margin:6px 4px"><div class="li-body"><div class="li-nm" style="color:#64748b">🔒 专项隐私体检项</div><div class="li-ds">健康隐私专项体检条目已保护，解锁后可查看完整项目清单。</div></div></div>'}
      </div>
    `;
    // 健康风险提示（生活中常见安全/饮食风险）
    const risks = CONFIG.healthRisks || [];
    if (risks.length) {
      html += `
        <div class="card hr-card">
          <div class="card-title"><span class="ico">⚠️</span>健康风险提示 · 生活安全与饮食禁忌</div>
          <div class="mp-sub">日常容易被忽视的安全/饮食风险，规避可显著降低意外和慢性损伤。</div>
          <div class="hr-grid">
            ${risks.map(r => `
              <div class="hr-item">
                <div class="hr-ico">${r.icon}</div>
                <div>
                  <div class="hr-nm">${this.esc(r.title)}</div>
                  <div class="hr-ds">${this.esc(r.desc)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    // v2.0.5：📋 就医数据 / 就诊时间线（入口卡 · v6.9 原【病历】更名，完整功能已迁入【数据中心 → 就医数据】）
    try {
      const mr = Store.listMedicalRecords ? Store.listMedicalRecords({ limit: 5 }) : { total:0, acuteCount:0, sev4plus:0, list:[], stats:[], trend:[] };
      const top3 = mr.stats.slice(0,3);
      html += `<div class="card" style="cursor:pointer" onclick="App.navigate('medical')">
        <div class="card-title"><span class="ico">📋</span>就医数据 / 就诊时间线 <span class="sub">慢性病定期复诊 · 突发症状秒记录 · 按病症自动统计发作次数</span>
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();App.navigate('medical')">打开就医数据 ›</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px">
          <div class="habit-stat"><div class="hs-num">${mr.total||0}</div><div class="hs-lbl">累计记录</div></div>
          <div class="habit-stat"><div class="hs-num" style="color:#be123c">${mr.acuteCount||0}</div><div class="hs-lbl">突发症状</div></div>
          <div class="habit-stat"><div class="hs-num" style="color:#b91c1c">${mr.sev4plus||0}</div><div class="hs-lbl">严重/紧急</div></div>
          <div class="habit-stat"><div class="hs-num" style="color:#7c3aed">${mr.stats.length}</div><div class="hs-lbl">不同病症</div></div>
        </div>
        ${top3.length ? `<div class="mp-sub" style="margin-top:12px;font-weight:800;color:#0f172a">📊 发作次数 TOP3 病症</div>
          <div style="margin-top:8px">${top3.map(s => `
            <div class="list-row" style="padding:8px 10px;margin:4px 0;border-radius:12px;background:#f8fafc">
              <div class="li-ico">${s.sevMax>=4?'🚨':'🩺'}</div>
              <div class="li-body">
                <div class="li-nm" style="font-weight:800">${this.esc(s.disease)}</div>
                <div class="li-ds">共发作 <b style="color:#b45309">${s.total}</b> 次 · 突发${s.acute} / 复诊${s.chronic} / 就诊${s.visit} · 最高程度 ${Store ? (Store.MR_SEV_LABELS ? Store.MR_SEV_LABELS[s.sevMax]||'':'') : ''}${s.latest?` · 最近 ${this.esc(s.latest.date)}`:""}</div>
              </div>
            </div>`).join('')}</div>` : `<div class="empty" style="margin-top:10px">还没有就医数据记录。遇到头痛/胃痛等突发情况时，打开就医数据页一键记录 ⚡</div>`}
      </div>`;
    } catch(e){}
    document.getElementById('view-health').innerHTML = html;
  },
  // ========== v2.0.5：📋 就医数据 / 就诊 / 突发症状 时间线（v6.9 原【病历】更名）==========
  render_medical() {
    const TL = Store.MR_TYPE_LABELS || { chronic:'🩺 慢性病复诊', acute:'⚡ 突发症状', visit:'🏥 就诊/检查' };
    const SL = Store.MR_SEV_LABELS || ['','轻微','一般','中等','严重','🆘 紧急'];
    const data = Store.listMedicalRecords();
    const back = `<div style="margin:14px 0 8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button>
      <span style="margin-left:auto;font-size:13px;color:#64748b">💡 系统自动识别的隐私记录会默认打码保护；需要查看输入会话级密码解锁（关页立即失效）。</span>
    </div>`;
    // ========== A. 突发症状快速记录（8 个常见病快捷按钮）==========
    const QUICK = [
      {d:'头痛', sym:'头部胀痛/搏动痛'}, {d:'胃痛', sym:'胃部不适/反酸/胀气'},
      {d:'头晕', sym:'眩晕/站立不稳'}, {d:'发热', sym:'体温升高/畏寒'},
      {d:'腹泻', sym:'腹痛/排便次数多'}, {d:'喉咙痛', sym:'咽痛/咽干/咳嗽'},
      {d:'失眠', sym:'入睡困难/易醒'}, {d:'过敏', sym:'皮疹/瘙痒/喷嚏'},
    ];
    const html_quick = `<div class="card" style="background:linear-gradient(135deg,#fff1f2,#fef2f2 35%,#fef9c3);border:1px solid #fecaca">
      <div class="card-title"><span class="ico">⚡</span>突发症状 · 一键秒记录
        <span class="sub">点击下方标签自动创建记录，默认"一般"程度 · 可用滑条改程度</span>
        <button class="btn btn-sm btn-primary" onclick="App.medicalQuickDo()">秒记录 ▶</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px" id="mrQuickTags">
        ${QUICK.map(q => `<label style="cursor:pointer;display:block;padding:8px 6px;border-radius:12px;background:rgba(255,255,255,.7);border:1px solid #fecdd3;text-align:center;user-select:none" title="${this.esc(q.sym)}">
          <input type="radio" name="mrQuick" value="${this.esc(q.d)}" data-sym="${this.esc(q.sym)}" style="vertical-align:middle">
          <span style="font-weight:800;font-size:12.5px;margin-left:2px;color:#9f1239">${this.esc(q.d)}</span>
        </label>`).join('')}
      </div>
      <div style="margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.6);border:1px dashed #fca5a5">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:800;color:#9f1239">程度：<span id="mrSevLabel">${SL[2]||'一般'}</span></span>
          <input id="mrSevRange" type="range" min="1" max="5" step="1" value="2" style="flex:1;min-width:160px" oninput="document.getElementById('mrSevLabel').textContent=(['','轻微','一般','中等','严重','🆘紧急'])[+this.value||1]">
          <input class="input" id="mrQuickCustom" placeholder="自定义病症（上一行没选到时用）" style="max-width:220px;font-size:13px;padding:6px 10px" />
          <input class="input" id="mrQuickSym" placeholder="伴随症状（可选，逗号分隔）" style="max-width:260px;font-size:13px;padding:6px 10px" />
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          <span style="font-size:12px;color:#7f1d1d">示例：突然头痛 + 恶心想吐 → 选"头痛"标签 + 症状填"恶心,呕吐" + 调成"严重"</span>
        </div>
      </div>
    </div>`;
    // ========== B. TOP 病症 + 6 月柱状图 ==========
    const trendMax = Math.max(1, ...data.trend.map(t=>+t.count||0));
    const trendHTML = data.trend.length ? `<div style="display:grid;grid-template-columns:repeat(${data.trend.length},1fr);gap:10px;margin-top:12px;align-items:end;min-height:110px">
      ${data.trend.map(t => {
        const h = Math.max(4, Math.round((+t.count||0)/trendMax*80));
        return `<div style="text-align:center">
          <div style="font-size:11px;font-weight:800;color:#1d4ed8;margin-bottom:4px;height:14px">${t.count||0}</div>
          <div style="background:linear-gradient(180deg,#60a5fa,#2563eb);height:${h}px;border-radius:10px 10px 0 0;box-shadow:inset 0 2px 0 rgba(255,255,255,.4);margin:0 2px;min-height:4px"></div>
          <div style="font-size:12px;color:#334155;margin-top:4px;font-weight:700">${t.label}</div>
        </div>`;
      }).join('')}
    </div>` : '';
    const statsHTML = data.stats.length
      ? `<div style="margin-top:10px">${data.stats.slice(0,8).map((s,i)=>{
          const maxT = Math.max(1,...data.stats.map(x=>x.total));
          const bar = Math.round(s.total/maxT*100);
          const sevColor = s.sevMax>=4? '#dc2626':(s.sevMax>=3?'#ea580c':'#059669');
          const maskedName = this._sensBlur(s.disease, '🔒 个人隐私项');
          const isSens = this._healthSensMatch(s.disease);
          return `<div class="rew-row" style="padding:8px 10px">
            <div class="rew-ico" style="width:30px;height:30px;min-width:30px;line-height:30px;text-align:center;border-radius:8px;background:${isSens?'#fff1f2':'#f1f5f9'};color:${isSens?'#881337':'#0f172a'}">${isSens?'🔐':(i+1)}</div>
            <div class="rew-info" style="flex:1">
              <div class="rew-name" style="font-weight:800">${this.esc(maskedName)} <span style="color:${sevColor};font-weight:900;font-size:11px;margin-left:4px">${SL[s.sevMax]||''}</span></div>
              <div class="rew-crit">共 <b>${s.total}</b> 次 · 突发 ${s.acute} / 复诊 ${s.chronic} / 就诊 ${s.visit} · 平均程度 ${(s.severitySum/Math.max(1,s.total)).toFixed(1)}/5 · 最近 ${this.esc(s.latest?s.latest.date:'-')}</div>
              <div style="margin-top:4px;height:6px;background:#e2e8f0;border-radius:999px"><div style="width:${bar}%;height:100%;background:linear-gradient(90deg,#10b981,#0ea5e9);border-radius:999px"></div></div>
            </div>
            ${isSens && !hivUnlocked
              ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:#b91c1c" onclick="App.healthSensitiveUnlock({onDone:()=>App.render_medical()})">🔑 解锁后才能筛选</button>`
              : `<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="App.navigate('medical');App._mrFilter=${JSON.stringify(s.disease)};App.render_medical()">筛选</button>`}
          </div>`;
        }).join('')}</div>`
      : `<div class="empty">暂无统计。去记录第一条吧 →</div>`;
    const html_stats = `<div class="card">
      <div class="card-title"><span class="ico">📊</span>发作次数 TOP 病症 · 近 6 个月趋势
        <span class="sub">累计 ${data.total||0} 条 · 突发 ${data.acuteCount||0} · 严重/紧急 ${data.sev4plus||0}</span>
        ${this._mrFilter?`<button class="btn btn-ghost" onclick="App._mrFilter=null;App.render_medical()" style="font-size:11px;padding:3px 10px">清除筛选「${this.esc(this._mrFilter)}」</button>`:''}
      </div>
      ${trendHTML || '<div class="empty">暂无月度发作数据</div>'}
      <div style="margin-top:16px;border-top:1px dashed #e2e8f0;padding-top:6px">
        <div style="font-weight:800;color:#0f172a;margin-bottom:4px">🏆 不同病症累计次数排名</div>
        ${statsHTML}
      </div>
    </div>`;
    // ========== C. 完整记录（新建/编辑表单） & 倒序时间线 ==========
    // 系统自动识别的隐私病名（命中关键词）未解锁一律 mask，绝不外泄具体病种
    // （变量名复用：hivUnlocked 本函数独立声明，与 render_health 不同 scope）
    const hivUnlocked = this._isHealthUnlocked();
    const buildForm = (preset) => {
      preset = preset || { type:'chronic', date: Store.todayBJ ? Store.todayBJ() : Store.today(), disease:'', symptoms:'', medicines:'', hospital:'', doctor:'', severity: 2, temperature:'', bloodPressure:'', heartRate:'', weight:'', diagnose:'', note:'', onsetDate:'', treatment:'' };
      const sevOpts = [1,2,3,4,5].map(i => `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;cursor:pointer"><input type="radio" name="mrForm_sev" value="${i}" ${(+preset.severity === i)?'checked':''}>${SL[i]||i}</label>`).join('');
      // 修改时敏感字段：已解锁才还原原文，否则只显示掩码占位（保存时检测空值不覆盖原敏感内容）
      const editingSensitive = preset.id && this._healthSensMatch(`${preset.disease||''} ${preset.symptoms||''} ${preset.diagnose||''} ${preset.note||''}`);
      const maskOr = (val) => ((editingSensitive && !hivUnlocked) ? '' : (val||''));
      return `<div class="card" id="mrFormCard" style="background:linear-gradient(135deg,#eff6ff,#f0f9ff 50%,#faf5ff);border:1px solid #bfdbfe">
        <div class="card-title"><span class="ico">${preset.id?'🛠️ 修改':'✍️ 新建'}就医数据</span><span class="sub">支持慢性病复诊 / 突发症状 / 就诊检查 三种类型
          ${editingSensitive && !hivUnlocked?'<span style="color:#b91c1c;margin-left:6px">🔒 本条涉及健康隐私，未解锁只显示占位；请先解锁后再修改（避免空保存清空敏感内容）</span>':''}
        </span></div>
        <input type="hidden" id="mrForm_id" value="${preset.id||''}">
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px">
          <div class="field"><label>类型</label>
            <select class="input" id="mrForm_type">
              ${['acute','chronic','visit'].map(t => `<option value="${t}" ${preset.type===t?'selected':''}>${TL[t]||t}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>程度</label><div style="padding-top:4px">${sevOpts}</div></div>
          <div class="field"><label>日期</label><input class="input" type="date" id="mrForm_date" value="${preset.date||''}"></div>
          <div class="field"><label>时间</label><input class="input" type="time" id="mrForm_time" value="${preset.time||''}"></div>
          <div class="field"><label>🤒 疾病开始时间</label><input class="input" type="date" id="mrForm_onset" value="${this.esc(preset.onsetDate||'')}" title="症状首次出现/确诊的日期，科学就医数据模板必填项"></div>
          <div class="field"><label>💊 治疗方式</label><input class="input" id="mrForm_treatment" value="${this.esc(maskOr(preset.treatment||''))}" placeholder="如：口服药物/外用药/输液/手术/休息观察"></div>
          <div class="field" style="grid-column:1/-1"><label>病症名称 * <span style="font-size:11px;color:#64748b">（例：过敏性鼻炎/偏头痛/反流性胃炎/高血压复诊）</span></label>
            <input class="input" id="mrForm_disease" value="${this.esc(maskOr(preset.disease||''))}" placeholder="必填">
          </div>
          <div class="field" style="grid-column:1/-1"><label>症状（逗号分隔）</label><input class="input" id="mrForm_symptoms" value="${this.esc(maskOr(Array.isArray(preset.symptoms)?preset.symptoms.join(', '):(preset.symptoms||'')))}" placeholder="例：鼻塞, 打喷嚏, 流涕"></div>
          <div class="field" style="grid-column:1/-1"><label>用药（逗号分隔，可选）</label><input class="input" id="mrForm_medicines" value="${this.esc(maskOr(Array.isArray(preset.medicines)?preset.medicines.join(', '):(preset.medicines||'')))}" placeholder="例：氯雷他定 10mg, 布地奈德鼻喷剂"></div>
          <div class="field"><label>🏥 医院/机构</label><input class="input" id="mrForm_hospital" value="${this.esc(maskOr(preset.hospital||''))}"></div>
          <div class="field"><label>👨‍⚕️ 医生</label><input class="input" id="mrForm_doctor" value="${this.esc(preset.doctor||'')}"></div>
          <div class="field"><label>🌡️ 体温 ℃</label><input class="input" id="mrForm_temperature" value="${this.esc(preset.temperature||'')}" placeholder="如 36.5"></div>
          <div class="field"><label>🫀 血压</label><input class="input" id="mrForm_bp" value="${this.esc(preset.bloodPressure||'')}" placeholder="如 120/80"></div>
          <div class="field"><label>❤️ 心率 bpm</label><input class="input" id="mrForm_hr" value="${this.esc(preset.heartRate||'')}" placeholder="如 72"></div>
          <div class="field"><label>⚖️ 体重 kg</label><input class="input" id="mrForm_weight" value="${this.esc(preset.weight||'')}" placeholder="如 58"></div>
          <div class="field" style="grid-column:1/-1"><label>医生诊断 / 检查结论（可选）</label><textarea class="input" id="mrForm_diagnose" rows="2">${this.esc(maskOr(preset.diagnose||''))}</textarea></div>
          <div class="field" style="grid-column:1/-1"><label>个人备注（诱因、处理方式、下次复诊提醒等）</label><textarea class="input" id="mrForm_note" rows="3">${this.esc(maskOr(preset.note||''))}</textarea></div>
        </div>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn btn-primary" onclick="App.medicalFormSubmit()">${preset.id?'💾 保存修改':'✅ 新增记录'}</button>
          ${preset.id?`<button class="btn btn-ghost" onclick="App.render_medical()">取消修改</button>`:''}
        </div>
      </div>`;
    };
    const list = this._mrFilter ? data.list.filter(r => (r.disease||'').indexOf(this._mrFilter)>=0) : data.list;
    const TIMELINE = list.length === 0
      ? `<div class="empty">还没有就医数据。试试上方「⚡ 突发症状」或「✍️ 新建就医数据」——系统会按病症名自动汇总发作次数 ✨</div>`
      : list.map((r, idx) => {
          const diseaseSens = this._healthSensMatch(`${r.disease||''} ${r.symptoms||''} ${r.diagnose||''} ${r.note||''} ${r.hospital||''}`);
          const needLock = (diseaseSens && !hivUnlocked);
          const sevColor = ['','#22c55e','#65a30d','#ca8a04','#ea580c','#dc2626'][r.severity] || '#64748b';
          const mb = (val, alt) => this._sensBlur(val, alt || '🔒 个人隐私项（会话级已保护）');
          return `<div class="log-row" style="margin:8px 0;padding:14px;border-radius:16px;background:linear-gradient(135deg,#fff,${r.type==='acute'?'#fef2f2':'#f0f9ff'} 40%,#fff);border:1px solid ${r.type==='acute'?'#fecdd3':'#bae6fd'};position:relative">
            <div style="position:absolute;left:20px;top:-1px;bottom:-1px;width:4px;border-radius:999px;background:linear-gradient(180deg,${sevColor},#e0e7ff)"></div>
            <div class="log-ico" style="align-self:flex-start;margin-top:2px">${TL[r.type]?TL[r.type].slice(0,2):'📋'}</div>
            <div class="log-body" style="padding-left:10px">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <div style="font-weight:900;color:#0f172a;font-size:14.5px">${this.esc(mb(r.disease))}</div>
                <span style="background:${sevColor};color:#fff;font-size:11px;font-weight:800;padding:2px 10px;border-radius:999px">${SL[r.severity]||''}</span>
                <span style="font-size:11px;color:#64748b">${this.esc(r.date)} ${this.esc(r.time||'')}</span>
                <span style="font-size:11px;color:#0284c7">${TL[r.type]||''}</span>
                ${diseaseSens?`<span style="font-size:11px;color:#b91c1c;background:#fff1f2;border:1px solid #fecdd3;border-radius:999px;padding:1px 8px">🔒 隐私保护</span>`:''}
              </div>
              <div style="font-size:12px;color:#475569;margin-top:4px;line-height:1.65">
                ${r.symptoms&&r.symptoms.length?`<div>🩹 症状：${this.esc(mb(r.symptoms.join('、'), '🔒 症状已保护（会话级）'))}</div>`:''}
                ${r.onsetDate?`<div>🤒 始于：${this.esc(r.onsetDate)}</div>`:''}
                ${r.treatment?`<div>💉 治疗方式：${this.esc(r.treatment)}</div>`:''}
                ${r.medicines&&r.medicines.length?`<div>💊 用药：${this.esc(r.medicines.join('、'))}</div>`:''}
                ${r.hospital?`<div>🏥 医院/医生：${this.esc(mb(r.hospital, '🔒 就诊机构已保护（会话级）'))}${r.doctor?' · '+this.esc(r.doctor):''}</div>`:''}
                ${r.temperature||r.bloodPressure||r.heartRate||r.weight?`<div>📐 指标：${r.temperature?`🌡️ ${this.esc(r.temperature)}℃  `:''}${r.bloodPressure?`🫀 ${this.esc(r.bloodPressure)}  `:''}${r.heartRate?`❤️ ${this.esc(r.heartRate)}bpm  `:''}${r.weight?`⚖️ ${this.esc(r.weight)}kg`:''}</div>`:''}
                ${r.diagnose?`<div>🧑‍⚕️ 诊断：${this.esc(mb(r.diagnose))}</div>`:''}
                ${r.note?`<div style="white-space:pre-wrap">📝 备注：${this.esc(mb(r.note))}</div>`:''}
                ${needLock?`<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <span style="font-size:12px;color:#9f1239;background:#fff1f2;border-radius:10px;padding:4px 10px">系统自动识别为健康隐私，未解锁仅显示占位。</span>
                    <button class="btn btn-sm" style="background:#b91c1c;color:#fff" onclick="App.healthSensitiveUnlock({onDone:()=>App.render_medical()})">🔑 会话级解锁</button>
                  </div>`:''}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-left:6px;white-space:nowrap">
              <button class="btn btn-sm btn-ghost" onclick="App.medicalFillForm('${r.id}')">✏️ 改</button>
              <button class="btn btn-sm btn-ghost" style="color:#b91c1c" onclick="App.medicalDel('${r.id}')">🗑️ 删</button>
            </div>
          </div>`;
        }).join('');
    const html_form = buildForm(null);
    const html_timeline = `<div class="card">
      <div class="card-title"><span class="ico">⏳</span>就医数据时间线（倒序）<span class="sub">共 ${data.total||0} 条 ${this._mrFilter?` · 筛选:${this.esc(this._mrFilter)} (匹配 ${list.length} 条)`:''}</span>
        ${this._mrFilter?`<button class="btn btn-ghost" onclick="App._mrFilter=null;App.render_medical()" style="font-size:11px;padding:3px 10px">清除筛选</button>`:''}
      </div>
      ${TIMELINE}
    </div>`;
    const html = back + html_quick + html_stats + html_form + html_timeline;
    const el = document.getElementById('view-medical');
    if (el) el.innerHTML = html;
  },
  // 突发一键记录（无敏感判断，根据内容后续在时间线显示时自动检测打码）
  medicalQuickDo() {
    const r = document.querySelector('input[name="mrQuick"]:checked');
    const custom = String((document.getElementById('mrQuickCustom')||{}).value||'').trim();
    const disease = custom || (r && r.value);
    if (!disease) { this._flash('请先选择一个病症标签，或在"自定义病症"里填写'); return; }
    const sym = String((document.getElementById('mrQuickSym')||{}).value||'').trim();
    const symFromTag = r && r.getAttribute ? r.getAttribute('data-sym') : '';
    const symptoms = (symFromTag + (sym ? ', ' + sym : sym)).split(/[,，、\s]+/).map(x=>x.trim()).filter(Boolean);
    const severity = +(document.getElementById('mrSevRange')||{}).value || 2;
    const res = Store.quickAcuteAttack(disease, symptoms.join(','), severity);
    this._flash(res.msg || (res.ok?'✅ OK':'❌ 失败'));
    this.render_medical();
  },
  // 把某条记录填回"新建/修改"表单，便于改
  medicalFillForm(id) {
    const all = Store.listMedicalRecords();
    const r = all.list.find(x => x.id === id);
    if (!r) return;
    this._mrEditing = r;
    document.getElementById('mrFormCard') && this.render_medical();
    // 填完 render 后再赋值字段
    this._renderDone = () => {
      try {
        const setV = (sel, v) => { const e = document.getElementById(sel); if (e) e.value = v ?? ''; };
        setV('mrForm_id', r.id);
        setV('mrForm_type', r.type);
        document.getElementsByName('mrForm_sev').forEach(x => { x.checked = (+x.value === +r.severity); });
        setV('mrForm_date', r.date);
        setV('mrForm_time', r.time||'');
        setV('mrForm_onset', r.onsetDate||'');
        setV('mrForm_treatment', r.treatment||'');
        setV('mrForm_disease', r.disease);
        setV('mrForm_symptoms', Array.isArray(r.symptoms)?r.symptoms.join(', '):(r.symptoms||''));
        setV('mrForm_medicines', Array.isArray(r.medicines)?r.medicines.join(', '):(r.medicines||''));
        setV('mrForm_hospital', r.hospital||'');
        setV('mrForm_doctor', r.doctor||'');
        setV('mrForm_temperature', r.temperature||'');
        setV('mrForm_bp', r.bloodPressure||'');
        setV('mrForm_hr', r.heartRate||'');
        setV('mrForm_weight', r.weight||'');
        setV('mrForm_diagnose', r.diagnose||'');
        setV('mrForm_note', r.note||'');
      } catch(_){}
    };
    setTimeout(()=>{ if (typeof this._renderDone === 'function') { this._renderDone(); this._renderDone = null; } }, 80);
  },
  // 表单提交（新增 or 修改）
  medicalFormSubmit() {
    const id = (document.getElementById('mrForm_id')||{}).value || '';
    const get = (sel) => (document.getElementById(sel)||{}).value || '';
    const sevNode = document.querySelector('input[name="mrForm_sev"]:checked');
    const payload = {
      id: id || undefined,
      type: get('mrForm_type') || 'acute',
      severity: +(sevNode && sevNode.value) || 2,
      date: get('mrForm_date') || Store.today(),
      time: get('mrForm_time') || '',
      onsetDate: get('mrForm_onset') || '',
      treatment: get('mrForm_treatment') || '',
      disease: get('mrForm_disease'),
      symptoms: get('mrForm_symptoms'),
      medicines: get('mrForm_medicines'),
      hospital: get('mrForm_hospital'),
      doctor: get('mrForm_doctor'),
      temperature: get('mrForm_temperature'),
      bloodPressure: get('mrForm_bp'),
      heartRate: get('mrForm_hr'),
      weight: get('mrForm_weight'),
      diagnose: get('mrForm_diagnose'),
      note: get('mrForm_note'),
    };
    const res = id ? Store.updateMedicalRecord(id, payload) : Store.addMedicalRecord(payload);
    this._flash(res.msg || (res.ok?'✅ 已保存':'❌ 失败'));
    this._mrEditing = null;
    if (res.ok) this.render_medical();
  },
  // 删除单条
  medicalDel(id) {
    if (!confirm('确定删除这条就医数据吗？此操作不可撤销。')) return;
    const res = Store.removeMedicalRecord(id);
    this._flash(res.msg || (res.ok?'🗑️ 已删除':'❌ 失败'));
    if (res.ok) this.render_medical();
  },
  toggleMed(id) {
    // v2.0.6 隐私保护前置：每日药物打卡属于健康隐私项，未解锁一律拦截（UI 层已隐藏，这里防控制台手动调用绕过）
    if (!this._isHealthUnlocked()) {
      this._requireHealthUnlock(function(){ App.render_health(); });
      return false;
    }
    const rec = this.todayRec();
    const m = CONFIG.medications.find(x => x.id === id);
    if (!m) return;
    const state = rec.medications[id] || { times: [], done: false };
    const perDay = m.perDay || 1;
    // ====== v2.0.3 修复：单药点击也必须遵守「早/中/晚」时间窗（按药物 time 字段匹配 slot）======
    const slot = this._inferMedSlotFromLabel(m.time);
    if (slot) {
      const winMap = { morning: 'hlMedMorn', noon: 'hlMedNoon', night: 'hlMedNight' };
      const w = Store.punchWindowStatus(winMap[slot]);
      const alreadySlotDone = !!state[slot];
      if (!state.done && !alreadySlotDone && !w.open) {
        this._flash(`⏳ ${m.name} 建议时段 ${m.time}，当前不在打卡窗口（${w.windowLabel}）`);
        return;
      }
      // 写入 slot 标记（保证 Store._isMiniDone 能正确识别 hlMedMorn/Noon/Night 三件小任务）
      state[slot] = true;
    }
    const wasDone = !!state.done;
    state.done = !state.done;
    if (state.done && perDay > 1) {
      state.times = state.times.map(v => !!v);
      while (state.times.length < perDay) state.times.push(true);
    } else if (!state.done && perDay > 1) {
      state.times = (state.times || []).map(() => false);
    }
    Store.updateTodayModule('medications', { [id]: state });
    // 若 slot 存在且从 未打卡→已打卡，则给对应 mini task 发一次奖励（防重复由 claimMiniTask 内保证）
    if (slot && !wasDone && state.done) {
      const winMap2 = { morning: 'hlMedMorn', noon: 'hlMedNoon', night: 'hlMedNight' };
      const labelMap2 = { morning: `早晨：${m.name}`, noon: `午间：${m.name}`, night: `晚间：${m.name}` };
      setTimeout(() => this._onPunchReward('health', winMap2[slot], labelMap2[slot]), 60);
    }
    this.render_health();
  },
  toggleMedTime(id, idx) {
    // v2.0.6 隐私保护前置
    if (!this._isHealthUnlocked()) {
      this._requireHealthUnlock(function(){ App.render_health(); });
      return false;
    }
    event && event.stopPropagation && event.stopPropagation();
    const rec = this.todayRec();
    const m = CONFIG.medications.find(x => x.id === id);
    if (!m) return;
    const state = rec.medications[id] || { times: [], done: false };
    if (!state.times) state.times = [];
    while (state.times.length < (m.perDay || 1)) state.times.push(false);
    state.times[idx] = !state.times[idx];
    // perDay=3 时：第 0/1/2 次 对应 morning/noon/night → 同步更新 slot 标记
    if ((m.perDay || 1) === 3) {
      const slotMap = ['morning','noon','night'];
      const slot = slotMap[idx];
      if (slot) {
        state[slot] = !!state.times[idx];
        // 时间窗校验（只有"从 未→已"时校验；用户取消时允许任意时刻取消）
        if (state.times[idx]) {
          const winMap = { morning: 'hlMedMorn', noon: 'hlMedNoon', night: 'hlMedNight' };
          const w = Store.punchWindowStatus(winMap[slot]);
          if (!w.open) {
            this._flash(`⏳ 第${idx+1}次(${slot==='morning'?'早':slot==='noon'?'午':'晚'})服药不在窗口（${w.windowLabel}）`);
            state.times[idx] = false;
            state[slot] = false;
            Store.updateTodayModule('medications', { [id]: state });
            this.render_health();
            return;
          }
        }
      }
    }
    const prevDone = !!state.done;
    state.done = state.times.filter(Boolean).length >= (m.perDay || 1);
    Store.updateTodayModule('medications', { [id]: state });
    // perDay === 3 且某 slot 从 false→true 且最终 done=true 时，发对应 mini task 奖励
    if ((m.perDay || 1) === 3 && !prevDone && state.done) {
      const winMap = { morning: 'hlMedMorn', noon: 'hlMedNoon', night: 'hlMedNight' };
      const slotMap = ['morning','noon','night'];
      slotMap.forEach(slot => {
        if (state[slot]) setTimeout(() => this._onPunchReward('health', winMap[slot], `${slot==='morning'?'早':slot==='noon'?'午':'晚'}：${m.name}`), 60);
      });
    }
    this.render_health();
  },
  /**
   * v2.0.3 修复：toggleMedAll 统一走「时间窗校验 → 写 slot+done → 给 mini task 发奖励」链路
   * 若不在时间窗：直接 flash 提示并 return（不写入、不发奖）—— 恢复"打卡时间限制"
   */
  toggleMedAll(slot) {
    // v2.0.6 隐私保护前置：早晨/午间/晚间服药打卡属于健康隐私项，未解锁一律拦截
    if (!this._isHealthUnlocked()) {
      this._requireHealthUnlock(function(){ App.render_health(); });
      return false;
    }
    const winMap = { morning: 'hlMedMorn', noon: 'hlMedNoon', night: 'hlMedNight' };
    const labelMap = { morning: '早晨吃药打卡', noon: '午间吃药打卡', night: '晚间吃药打卡' };
    const winName = winMap[slot];
    // 1) 强校验：不在窗口 → 拒绝（用户看到"开放中·剩余倒计时/未到时间"的预期行为）
    if (winName) {
      const w = Store.punchWindowStatus(winName);
      if (!w.open) {
        this._flash(`⏳ ${labelMap[slot]} 时间窗口未到（${w.windowLabel}），请耐心等待。`);
        return;
      }
    }
    const rec = this.todayRec();
    const meds = CONFIG.medications || [];
    // 2) 过滤"这个时段需要吃的药"：药物 time 标签包含 slot 语义，或 perDay=3 的一律按时段打卡
    const slotKeywords = {
      morning: ['早', '晨', '起', '空腹', '早饭', '早餐', '6:00', '7:00', '8:00'],
      noon:    ['午', '中', '饭前', '饭后', '饭间', '午餐', '午饭', '11:00', '12:00', '13:00'],
      night:   ['晚', '夜', '睡前', '临睡', '晚餐', '晚饭', '19:00', '20:00', '21:00', '22:00'],
    };
    const need = meds.filter(m => {
      if ((m.perDay || 1) === 3) return true;
      const t = String(m.time || '');
      return (slotKeywords[slot] || []).some(k => t.indexOf(k) >= 0) || meds.length <= 4;
      // 药物数量 ≤4 时视为「每日都该吃的一组」，按时段一键全部打卡（兼容用户自定义）
    });
    if (need.length === 0) {
      this._flash(`ℹ️ 本时段没有匹配「${labelMap[slot]}」的药物；请在下方单药卡片手动勾选。`);
      return;
    }
    const patch = {};
    let anyNew = false;
    need.forEach(m => {
      const cur = rec.medications[m.id] || { times: [], done: false };
      const wasDone = !!cur[slot];
      cur[slot] = true;
      const perDay = m.perDay || 1;
      if (perDay > 1 && !Array.isArray(cur.times)) cur.times = [];
      while (cur.times.length < perDay) cur.times.push(false);
      if (perDay === 3) {
        const idxMap = { morning: 0, noon: 1, night: 2 };
        if (idxMap[slot] !== undefined) cur.times[idxMap[slot]] = true;
      }
      // 如果是单剂量药，这顿吃完直接 done=true；多剂量药至少当前 slot 已完成
      if (perDay === 1) cur.done = true;
      else cur.done = cur.times.filter(Boolean).length >= perDay || cur.done;
      if (!wasDone) anyNew = true;
      patch[m.id] = cur;
    });
    Object.keys(patch).forEach(id => {
      Store.updateTodayModule('medications', { [id]: patch[id] });
    });
    // 3) 发奖（anyNew=true 才发，避免刷屏）
    if (anyNew && winName) setTimeout(() => this._onPunchReward('health', winName, labelMap[slot]), 80);
    this.render_health();
  },
  /** 工具：从药物 time 标签推断早/午/晚 slot（用于 slot 写入 + 时间窗校验）*/
  _inferMedSlotFromLabel(timeLabel) {
    const t = String(timeLabel || '');
    if (/早|晨起?|空腹|早餐|早饭|6:00|7:00|8:00/.test(t)) return 'morning';
    if (/晚|睡前|临睡|晚餐|晚饭|19:00|20:00|21:00|22:00/.test(t)) return 'night';
    if (/午|中|午餐|午饭|饭前|饭后|11:00|12:00|13:00/.test(t)) return 'noon';
    return null;
  },
});
