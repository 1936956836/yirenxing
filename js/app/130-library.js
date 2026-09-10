// 130-library.js —— 控糖日记 / 经验宝库（自 app.js 机械拆分 · v2026.0905 模块化；书架模块已删除 v2026.0906）
// [功能组] G2-生活基础 / G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
Object.assign(App, {
  // ====== v2.0.6 新增：🍬 控糖日记 —— 预防糖尿病 · 每日糖摄入记录 ======
  // ====== v2.0.6 控糖日记卡（饮食板块 · 自旧聚合页迁入）======
  renderDietSugarCard() {
    const d = Store.getSugarDiary();
    const today = Store.getSugarDay();
    const week = Store.getSugarWeek();
    const target = d.targetG || 25;
    const pct = Math.min(100, today.pct);
    const color = today.exceed ? '#dc2626' : (pct >= 80 ? '#f59e0b' : '#16a34a');
    let h = `<div class="card" style="margin-top:14px">
      <div class="card-title"><span class="ico">🍬</span>控糖日记 · 每日糖摄入（WHO 建议 ≤ ${target}g/日）</div>
      <div class="mp-sub" style="margin-top:6px">长期高糖是 2 型糖尿病主要诱因。每天记录糖摄入，预防慢性疾病。</div>
      <div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
        <div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;text-align:center"><div style="font-size:24px;font-weight:900;color:${color}">${today.totalG}</div><div style="font-size:11px;color:#64748b">今日摄入(g)</div></div>
        <div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;text-align:center"><div style="font-size:24px;font-weight:900;color:#0f172a">${target}</div><div style="font-size:11px;color:#64748b">每日目标(g)</div></div>
        <div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;text-align:center"><div style="font-size:24px;font-weight:900;color:${today.exceed?'#dc2626':'#16a34a'}">${today.pct}%</div><div style="font-size:11px;color:#64748b">${today.exceed?'⚠️ 超标':'✅ 目标内'}</div></div>
      </div>
      <div style="margin-top:10px">
        <div style="height:10px;background:#e2e8f0;border-radius:999px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${color};border-radius:999px"></div></div>
        <div style="margin-top:4px;font-size:11px;color:#64748b;text-align:right">${today.exceed?'⚠️ 已超 '+(today.totalG-target)+'g':'还能 '+Math.max(0,target-today.totalG)+'g'}</div>
      </div>
      <div style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px">
        <div class="field" style="margin:0"><label>食物名</label><input class="input" id="sd_food" placeholder="如 可乐/面包"></div>
        <div class="field" style="margin:0"><label>糖(g)*</label><input class="input" id="sd_g" type="number" min="0" placeholder="如 25"></div>
        <div class="field" style="margin:0"><label>备注</label><input class="input" id="sd_note" placeholder="可选"></div>
      </div>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-primary btn-sm" onclick="App._dietSugarAdd()">💾 记录</button>
        <span style="font-size:11px;color:#64748b">💡 可乐 14g/100ml · 面包 15g/片 · 蛋糕 30g/块 · 蜂蜜 80g/100g · 米饭 1g/100g</span>
        <div class="field" style="margin:0;display:flex;gap:6px;align-items:center;margin-left:auto"><label>目标(g)</label><input class="input" id="sd_target" type="number" min="1" max="200" value="${target}" style="width:70px"><button class="btn btn-sm" onclick="Store.setSugarTarget(+document.getElementById('sd_target').value||${target});App._flash('✅ 目标已更新');App.render_diet()">💾</button></div>
      </div>`;
    if (today.records.length) {
      h += `<div style="margin-top:12px"><div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:6px">📋 今日记录（${today.records.length}）</div>`;
      h += `<div style="display:flex;flex-direction:column;gap:4px">`;
      today.records.forEach(r => {
        h += `<div style="display:flex;align-items:center;gap:8px;padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;font-size:12px">
          <span style="color:#64748b">${r.time||''}</span>
          <b style="color:#dc2626">${r.grams}g</b>
          <span style="flex:1;color:#0f172a">${this.esc(r.food||'')}</span>
          <button class="btn btn-sm" style="padding:1px 6px;font-size:10px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca" onclick="if(confirm('删除？')){Store.delSugarRecord('${r.id}');App.render_diet();}">🗑️</button>
        </div>`;
      });
      h += `</div></div>`;
    }
    // 近 7 天趋势
    h += `<div style="margin-top:12px"><div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:6px">📈 近 7 天</div>`;
    const maxG = Math.max(10, ...week.map(x=>x.totalG), target);
    h += `<div style="display:flex;align-items:flex-end;gap:4px;height:90px">`;
    week.forEach(x => {
      const barH = Math.round(x.totalG / maxG * 100);
      const ok = x.totalG <= x.targetG;
      h += `<div style="flex:1;min-width:22px;display:flex;flex-direction:column;align-items:center">
        <div style="font-size:10px;color:${ok?'#16a34a':'#dc2626'};font-weight:900">${x.totalG}</div>
        <div style="width:100%;height:${Math.max(barH,3)}px;background:${ok?'#86efac':'#fca5a5'};border-radius:3px 3px 0 0;border:1px solid ${ok?'#22c55e':'#ef4444'};border-bottom:none"></div>
        <div style="font-size:9px;color:#64748b;margin-top:1px">${x.date.slice(5)}</div>
      </div>`;
    });
    h += `</div></div>`;
    h += `<div class="tip-box" style="margin-top:10px;border-color:#fecaca;background:#fef2f2">⚠️ 糖尿病患者每日精制糖 ≤ 10g；普通人 ≤ 25g。一瓶 500ml 可乐 ≈ 54g 糖 = 超目标 2 倍。</div>`;
    h += `</div>`;
    return h;
  },
  _dietSugarAdd() {
    const food = (document.getElementById('sd_food')||{}).value || '';
    const g = Number((document.getElementById('sd_g')||{}).value);
    const note = (document.getElementById('sd_note')||{}).value || '';
    if (!food.trim() && !(g>=0)) { this._flash('❌ 请填写食物名或糖克数'); return; }
    if (!(g>=0)) { this._flash('❌ 糖克数无效'); return; }
    Store.addSugarRecord({ grams:g, food:food.trim(), note:note.trim() });
    this._flash('✅ 已记录');
    this.render_diet();
  },
  // ====== v2.0.6 经验宝库（记录板块 · 用户匹配身份自动推荐经验流）======
  _wbExp(wb, W) {
    const identity = this._expIdentity();
    const exp = this._expData();
    // 根据身份过滤 + 排序（identityMatch 包含当前身份的优先）
    const ranked = exp.map(e => ({ ...e, _score: (e.identityMatch||[]).includes(identity) ? 10 : 0 }))
      .sort((a,b) => b._score - a._score);
    let h = `<div class="card"><div class="card-title"><span class="ico">💡</span>经验宝库 · AI 精选 ${exp.length} 条经验</div>
      <div class="mp-sub" style="margin-top:6px">根据你当前的身份标签，为你优先推荐相关经验包。每个经验包按"时间轴/技巧清单/避坑提醒"组织，重点会标红。</div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span style="font-weight:800;font-size:13px;color:#0f172a">👤 我目前是：</span>
        <select class="input" style="max-width:180px" id="expIdentitySel" onchange="App._expSetIdentity(this.value)">
          ${['大学生','专科生','考研党','求职者','毕业生','打工人','旅行者','妈妈','其他'].map(id => `<option value="${id}" ${id===identity?'selected':''}>${id}</option>`).join('')}
        </select>
        <span style="font-size:11px;color:#64748b" id="expIdentityHint">${this._expIdentityHint(identity)}</span>
      </div>
    </div>`;

    // 经验包网格
    h += `<div style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">`;
    ranked.forEach(e => {
      const matched = (e.identityMatch||[]).includes(identity);
      h += `<div class="card" style="margin:0;cursor:pointer;transition:transform .15s" onclick="App._expOpen('${e.id}')" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:36px">${e.icon||'💡'}</div>
          <div style="flex:1">
            <div style="font-weight:900;color:#0f172a;font-size:15px">${this.esc(e.title)}</div>
            <div style="font-size:11.5px;color:#64748b;margin-top:2px">${this.esc(e.summary||'')}</div>
          </div>
          ${matched ? `<span style="font-size:10px;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;padding:2px 8px;border-radius:999px">🎯 为你推荐</span>` : ''}
        </div>
        <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">
          ${(e.tags||[]).slice(0,4).map(t => `<span style="font-size:10px;color:#7c3aed;background:#eef2ff;border:1px solid #c7d2fe;padding:1px 6px;border-radius:999px">${this.esc(t)}</span>`).join('')}
        </div>
      </div>`;
    });
    h += `</div>`;
    return h;
  },
  _expIdentity() {
    try { return localStorage.getItem('exp_identity') || '大学生'; } catch(_){ return '大学生'; }
  },
  _expSetIdentity(v) { try { localStorage.setItem('exp_identity', v); } catch(_){} App.gotoWb('wb_exp'); },
  _expIdentityHint(id) {
    const map = {
      '大学生':'🎓 你的身份是在校大学生 · 专升本/四六级/考研 优先',
      '专科生':'🏫 你的身份是专科生 · 江西专升本/学历提升 优先',
      '考研党':'📚 你正在考研准备 · 英语/政治/专业课 经验优先',
      '求职者':'💼 你正在求职 · 简历/面试/Offer 谈判 优先',
      '毕业生':'🎓 你刚毕业 · 求职/租房/职场入门 优先',
      '打工人':'💼 已进入职场 · 攒钱/理财/租房 优先',
      '旅行者':'✈️ 你爱旅行 · 打包清单/省钱技巧 优先',
      '妈妈':'👩‍👧 宝妈 · 育儿/家庭/理财 经验优先',
      '其他':'💡 通用经验流'
    };
    return map[id] || '';
  },
  // ====== 经验详情页（独立渲染 · 三列时间轴表 · 参考用户上传的专升本图片）======
  _expOpen(id) {
    const e = (this._expData()||[]).find(x => x.id === id);
    if (!e) { this._flash('❌ 经验包不存在'); return; }
    const identity = this._expIdentity();
    let h = this._renderWbHeader('wb_exp', { skipHome: true });
    h += `<div class="card"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <button class="btn btn-sm" onclick="App.gotoWb('wb_exp')">← 回到经验宝库</button>
      <button class="btn btn-sm" onclick="App._expCopyAll('${e.id}')">📋 复制全文</button>
      <span style="margin-left:auto;font-size:11px;color:#64748b">你的身份：${identity} · ${(e.identityMatch||[]).includes(identity)?'🎯 为你推荐':'👀 通用经验'}</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="font-size:44px">${e.icon||'💡'}</div>
      <div>
        <div style="font-weight:900;font-size:20px;color:#0f172a">${this.esc(e.title)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">${this.esc(e.summary||'')}</div>
        <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">${(e.tags||[]).map(t => `<span style="font-size:10px;color:#7c3aed;background:#eef2ff;border:1px solid #c7d2fe;padding:1px 6px;border-radius:999px">${this.esc(t)}</span>`).join('')}</div>
      </div>
    </div></div>`;

    // 关键提醒（如果有）
    if (e.warnings && e.warnings.length) {
      h += `<div class="card" style="margin-top:14px;background:#fef2f2;border:1px solid #fecaca">
        <div class="card-title" style="color:#b91c1c"><span class="ico">⚠️</span>关键提醒（${e.warnings.length}）</div>
        <ul style="margin:8px 0 0 0;padding-left:20px;color:#991b1b;font-size:13px;line-height:1.9">${e.warnings.map(w => `<li>${this.esc(w)}</li>`).join('')}</ul>
      </div>`;
    }

    // 时间轴表（参考用户上传图的三列结构）
    if (e.sections && e.sections.length) {
      h += `<div class="card" style="margin-top:14px">
        <div class="card-title"><span class="ico">📅</span>${e.sectionsLabel || '时间轴 / 关键节点'}</div>
        <div style="margin-top:8px;overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f1f5f9">
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;width:32%">⏰ 时间</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0;width:28%">📌 事件</th>
              <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0">💡 注意事项</th>
            </tr></thead>
            <tbody>`;
      e.sections.forEach(s => {
        const rowBg = s.highlight ? 'background:#fff7ed' : '';
        const border = s.highlight ? 'border-left:3px solid #dc2626' : '';
        h += `<tr style="${rowBg};${border}">
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;color:${s.highlight?'#b91c1c':'#0f172a'};font-weight:${s.highlight?900:700}">${this.esc(s.time||'')}</td>
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;font-weight:${s.highlight?900:600};color:${s.highlight?'#b91c1c':'#0f172a'}">${this.esc(s.event||'')}</td>
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;color:#334155">${(s.tips||[]).map((t,i) => `<div style="${i>0?'margin-top:2px':''}${this._tipIsRed(t)?'color:#b91c1c;font-weight:700':''}">${this.esc(t)}</div>`).join('')}</td>
        </tr>`;
      });
      h += `</tbody></table></div>
        <div style="margin-top:6px;font-size:11px;color:#94a3b8">${e.sectionsFooter||'⚠️ 红色行/红色文字 = 重点 / 容易踩坑'}</div>
      </div>`;
    }

    // 技巧清单
    if (e.tips && e.tips.length) {
      h += `<div class="card" style="margin-top:14px">
        <div class="card-title"><span class="ico">🧠</span>${e.tipsLabel || '核心技巧'}</div>
        <ul style="margin:8px 0 0 0;padding-left:20px;color:#334155;font-size:13px;line-height:2">${e.tips.map(t => `<li>${this.esc(t)}</li>`).join('')}</ul>
      </div>`;
    }

    // 避坑 / FAQ
    if (e.faqs && e.faqs.length) {
      h += `<div class="card" style="margin-top:14px">
        <div class="card-title"><span class="ico">⚠️</span>${e.faqsLabel || '常见坑 / FAQ'}</div>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">${e.faqs.map(q => `<details style="border:1px solid #e2e8f0;border-radius:8px;padding:4px 10px;background:#fff"><summary style="cursor:pointer;font-weight:700;color:#0f172a;padding:4px 0">Q：${this.esc(q.q)}</summary><div style="margin-top:6px;padding:6px 0;color:#334155;font-size:13px;line-height:1.7">A：${this.esc(q.a)}</div></details>`).join('')}</div>
      </div>`;
    }

    this.currentView = 'workbench';
    document.getElementById('view-workbench').innerHTML = h;
  },
  _tipIsRed(t) {
    if (typeof t !== 'string') return false;
    return /⚠️|❗|‼️|‼️|重要|注意|必须|一定|别忘|记得|⚠|❗/.test(t);
  },
  _expCopyAll(id) {
    const e = (this._expData()||[]).find(x => x.id === id); if (!e) return;
    let text = `【${e.title}】\n${e.summary||''}\n\n`;
    if (e.warnings) { text += '== 关键提醒 ==\n' + e.warnings.map(w => '⚠️ ' + w).join('\n') + '\n\n'; }
    if (e.sections) {
      text += '== 时间轴 ==\n';
      e.sections.forEach(s => {
        text += `\n${s.time}  ${s.event}\n`;
        (s.tips||[]).forEach(t => text += '  · ' + t + '\n');
      });
      text += '\n';
    }
    if (e.tips) { text += '== 核心技巧 ==\n' + e.tips.map((t,i)=>`${i+1}. ${t}`).join('\n') + '\n\n'; }
    if (e.faqs) { text += '== 常见坑 ==\n'; e.faqs.forEach(q => text += `Q：${q.q}\nA：${q.a}\n\n`); }
    try { navigator.clipboard && navigator.clipboard.writeText(text).then(()=>this._flash('📋 经验全文已复制到剪贴板'), ()=>this._flash('❌ 复制失败')); } catch(e2){ this._flash('❌ 复制失败'); }
  },
  // ====== 经验数据（AI 精选 · 可不断补充）======
  _expData() {
    return [
      // —— 1. 用户上传原图：江西专升本 2025 ——
      { id:'jzsb_jx_2025', icon:'🎓', title:'江西专升本 · 2025 全年时间轴 + 避坑清单', tags:['专升本','江西','学历提升','专科','2025'], identityMatch:['专科生','大学生','毕业生'], summary:'参考官方招生简章整理的 2025 年江西专升本完整时间轴，每一步都有具体注意事项。',
        sectionsLabel:'📅 2025 年江西专升本时间轴', sectionsFooter:'⚠️ 红色行/红色文字 = 重点 / 容易踩坑',
        sections:[
          { time:'1月6日 9:00-17:00', event:'网上报名', tips:['核对身份/专科专业代码/专项证明/手机号','报名期间每天检查一次，别错过修改机会'] },
          { time:'2月28日前', event:'招生高校发布招生简章', tips:['逐校核对计划/学费/校区/限制条件','重点看有没有"不招收跨专业"的专业'] },
          { time:'3月6日 9:00-9日 17:00', event:'选报类别、填志愿、缴费', tips:['缴费 130 元','每日 9:00-21:00 缴费','⚠️ 志愿期内仅可修改一次（必须仔细填）'], highlight:true },
          { time:'考前 3 天内', event:'打印准考证', tips:['⚠️ 多打几张备用','核对考点/交通/身份证','禁带物品：手机/电子表/草稿纸'] },
          { time:'3月29日 9:00-11:30', event:'公共基础课综合卷', tips:['政治 + 英语 + 信息技术','300 分 · 150 分钟','⚠️ 信息技术是"拉分项"，别忽视'], highlight:true },
          { time:'3月29日 15:00-17:00', event:'专业基础及技能知识课', tips:['九大专业类选 1 类对应 1 科','150 分 · 120 分钟','⚠️ 考前确认自己选的专业类'], highlight:true },
          { time:'4月14日后', event:'成绩查询', tips:['及时登录江西专升本管理系统','⚠️ 查分前别乱点不明链接'] },
          { time:'4月14-15日', event:'成绩复核申请', tips:['仅查漏改/漏统，不复核评分宽严','⚠️ 只有 2 天窗口期'] },
          { time:'4月17日', event:'查询复核结果', tips:['⚠️ 保存截图！复核结果可能影响录取'] },
          { time:'4月20日起', event:'大/国工匠/专项/普通计划依次录取', tips:['逐批关注录取和征集时间'] },
          { time:'4月29日 9:00-15:00', event:'普通计划征集志愿', tips:['⚠️ 仅未录取者参与','重新核对缺额和目录','别放过最后机会'], highlight:true },
          { time:'4月30日', event:'普通计划征集录取完成', tips:['⚠️ 录取结果以系统为准，以学校通知书为最终凭证'] },
        ],
        tips:[
          '公共基础课（政治+英语+信息技术）占 300 分，是拉分主力，信息技术别放掉',
          '志愿期内仅可修改一次！填前反复核对学校、专业、批次',
          '考前 3 天踩点考点，看清楚是哪个校门进、哪栋楼、哪个考场',
          '准考证多打 2-3 张，手机存电子档备用',
          '查分/复核阶段不要关闭系统通知，及时查自己的状态变化',
        ],
        faqs:[
          { q:'可以跨专业报考吗？', a:'大部分专业允许跨专业，但部分学校/专业有"限相同或相近专业"的限制 —— 一定要看目标学校的招生简章！' },
          { q:'基础课考什么？', a:'政治（约 100 分）+ 英语（约 100 分）+ 信息技术（约 100 分），合卷 150 分钟。' },
          { q:'没过线还能读本科吗？', a:'普通计划没过还有大/国工匠、专项计划、征集志愿三次机会，千万别放弃到 4 月底！' },
        ],
      },

      // —— 2. 四六级 ——
      { id:'cet_4_6', icon:'📝', title:'四六级备考经验 · 报名/时间/技巧全攻略', tags:['四六级','英语','备考','大学生'], identityMatch:['大学生','专科生','考研党'], summary:'CET-4/6 报考全流程 + 各模块提分技巧 + 蒙题玄学（救急）',
        sectionsLabel:'📅 四六级关键时间点',
        sections:[
          { time:'3月/9月（考前 2 个月）', event:'报名开放', tips:['⚠️ 4/6 月考试 → 3 月报名；12 月考试 → 9 月报名','学校教务处统一组织，留意班长/学习委员通知'], highlight:true },
          { time:'考前 2 周', event:'打印准考证', tips:['登录四六级官网打印','⚠️ 多打几张备用'] },
          { time:'6月/12月 第二个周六', event:'笔试（9:00-11:20 / 15:00-17:25）', tips:['⚠️ 8:40 开始入场，10:00 后禁入','带身份证+准考证+2B 铅笔','手机必须关机放书包，别侥幸'] },
          { time:'笔试当天 14:30（或 21:00）', event:'口试（可选）', tips:['⚠️ 口试名额有限，先到先得','口语 C 及以上才有资格报考六级口语'] },
          { time:'考试后 2-3 个月', event:'查分', tips:['官网/中国教育考试网','⚠️ 425 分及以上算过','⚠️ 没过可以无限次重考'] },
        ],
        warnings:[
          '大一第一学期不能考四级！一般大一下学期开始开放',
          '⚠️ 425 分是"过"的门槛，但保研/申研/大厂可能要求 500+',
          '六级比四级难 2 倍，先把四级 500+ 再碰六级',
        ],
        tips:[
          '听力：四六级听力占比 35%（248.5 分），是最大拉分项！每天听 30 分钟真题',
          '阅读："定位法"——看题目 → 划关键词 → 原文定位 → 选同义替换',
          '翻译：踩点翻译，不求华丽只求准确；不会的词换简单词',
          '作文：背模板 + 万能句型，考前写 2-3 篇练手。CET-4 是议论文/书信，CET-6 是说明文/议论文',
          '蒙题玄学（仅救命用）：听力选 "B" 概率高于 ACD；阅读 "All of above" 正确率高；完形选高频词',
        ],
        faqs:[
          { q:'四级没过能直接考六级吗？', a:'不能，必须四级 ≥ 425 才能报考六级；六级也 ≥ 425 才算过。' },
          { q:'考多少分有用？', a:'保研/申研：500+ 才有竞争力；找工作：过 425 就行；大厂/外企：六级 500+ 加分。' },
        ],
      },

      // —— 3. 旅行要带什么 ——
      { id:'travel_pack', icon:'✈️', title:'旅行打包清单 · 按场景分类', tags:['旅行','出行','打包'], identityMatch:['旅行者','大学生','打工人'], summary:'海岛/雪山/商务/背包徒步四种场景的打包清单 + 省钱技巧',
        sectionsLabel:'🎒 按场景打包',
        sections:[
          { time:'海岛（三亚/巴厘岛/普吉岛）', event:'核心清单', tips:['防晒霜 SPF50+（1 瓶不够用，带 2 瓶）','泳衣（至少 2 套轮换）、防水手机袋、洞洞鞋','墨镜、遮阳帽、薄外套（海风大）','⚠️ 潜水镜可以自备（船上租贵且不卫生）'] },
          { time:'雪山/高原（丽江/稻城/香格里拉）', event:'核心清单', tips:['冲锋衣/抓绒/羽绒服（-10℃ 也可能）','葡萄糖/红景天/高原安（提前一周吃）','登山杖、护膝、厚袜子（2 双）','⚠️ 身份证 + 现金 + 充电宝 20000mAh','⚠️ 带点常用药：感冒药/肠胃药'] },
          { time:'商务出差（北京/上海/深圳）', event:'核心清单', tips:['正装一套（西装+衬衫+皮鞋）','电子设备：笔记本/鼠标/充电线/转接头','名片、合同打印件、U盘备份','⚠️ 行李箱别超过 20×40×55cm（免费托运行李）'] },
          { time:'背包徒步（川西/西藏/青海）', event:'核心清单', tips:['背包 45-60L + 防雨罩','睡袋（-5℃ 建议 0℃ 睡袋）、防潮垫','头灯+充电宝 20000mAh','登山杖、速干衣、冲锋衣裤','⚠️ 身份证 + 边防证（藏区/新疆必办）'] },
        ],
        tips:[
          '打包原则：50% 行李重量放背包下部，重心贴背最省力',
          '电子设备统一放一个包袋（充电宝/充电器/相机/数据线），方便过安检',
          '所有液体 ≤ 100ml，装透明密封袋；多了就托运',
          '贵重物品分散放（护照在身上，钱夹+银行卡在另一个口袋）',
          '目的地当地买更便宜的东西：海岛的泳衣（三亚比大陆便宜）、西藏的氧气瓶',
        ],
        faqs:[
          { q:'国内旅行需要带护照吗？', a:'国内不需要，但身份证必须随身。出国需要护照 + 签证（部分免签）。' },
        ],
      },

      // —— 4. 毕业找好工作 ——
      { id:'job_hunt', icon:'💼', title:'毕业找好工作 · 简历/面试/Offer 谈判', tags:['求职','简历','面试','毕业生','offer'], identityMatch:['求职者','毕业生','大学生'], summary:'从 9 月秋招开始到拿 Offer 的完整路线图 + 面试官视角的避坑',
        sectionsLabel:'📅 求职关键时间轴',
        sections:[
          { time:'9-10 月（大四上）', event:'秋招黄金期', tips:['⚠️ 大厂秋招集中在 9-10 月，过了就没了','关注 BOSS 直聘/牛客/应届生求职网','每天投 10-20 份简历'] },
          { time:'11-12 月', event:'补录 + 实习转正', tips:['大厂补录、中小厂春招前补位','⚠️ 有实习的同学优先争取转正'] },
          { time:'次年 2-4 月', event:'春招', tips:['⚠️ 春招岗位少但机会仍在','211/985 春招优势不明显，普通本科春招反而有逆袭机会','关注地方国企/银行/事业单位'] },
          { time:'4-5 月', event:'三方协议 + 签 Offer', tips:['⚠️ 签前一定问清楚：试用期/五险一金/调薪/加班强度','三方协议不是最终合同，但有法律效力'] },
        ],
        warnings:[
          '⚠️ 简历 HR 只看 10 秒！一页纸足够，多了直接不看',
          '⚠️ 面试前 3 天准备自我介绍 + STAR 法则 + 公司调研',
          '⚠️ Offer 别急着签，至少等 2-3 家再做决定',
          '⚠️ 调薪时："我的期望薪资是 X，请问薪资范围是？" — 别先开价',
        ],
        tips:[
          '简历模板：学校名称+专业 → 实习/项目经历（STAR 法则写）→ 技能栈',
          'STAR 法则：Situation（背景）→ Task（任务）→ Action（你做了什么）→ Result（结果 + 数据）',
          '内推比海投高 10 倍命中率！找学长学姐内推',
          '面试自我介绍 1 分钟版本：你是谁 + 你擅长什么 + 你为什么匹配',
          '面试后 24 小时内发感谢信邮件，提一下你印象深刻的点',
        ],
        faqs:[
          { q:'没实习怎么办？', a:'做项目！毕业设计/个人项目/开源贡献都算；GitHub 上 star 50+ 的项目 > 没含金量的实习。' },
          { q:'薪资怎么谈？', a:'先问薪资范围（"请问这个岗位的薪资范围是？"），再报一个合理区间的中位值偏上。别先开价。' },
          { q:'校招和社招区别？', a:'校招只招应届毕业生，门槛低但名额固定；社招看 3 年以上经验，起薪通常更高。' },
        ],
      },

      // —— 5. 考研经验 ——
      { id:'kaoyan', icon:'📚', title:'考研备考经验 · 政治/英语/专业课', tags:['考研','备考','硕士','学历提升'], identityMatch:['考研党','大学生','毕业生'], summary:'考研各科目备考时间轴 + 推荐资料 + 高分策略',
        sectionsLabel:'📅 备考时间轴',
        sections:[
          { time:'3-6 月（基础期）', event:'英语 + 专业课第一轮', tips:['英语：背红宝书/恋练有词单词 + 刷阅读真题','专业课：过教材 + 做课后题','⚠️ 政治先不用看，9 月再开始'] },
          { time:'7-8 月（强化期）', event:'英语 + 政治 + 专业课第二轮', tips:['英语：刷英语一/二真题（05-20 年）','政治：听徐涛强化班 + 刷 1000 题','专业课：整理笔记 + 做真题'] },
          { time:'9-10 月（提升期）', event:'真题 + 政治背诵', tips:['英语：近 10 年真题刷 2 遍','政治：背肖八 + 腿姐冲刺班','⚠️ 开始研究目标院校专业课出题风格'] },
          { time:'11-12 月（冲刺期）', event:'全真模拟 + 押题', tips:['英语：背作文模板 + 模拟考试','政治：肖四必背！全背！','专业课：模拟考试 + 查漏补缺','⚠️ 每天按考试时间学习（上午政治/专业一，下午英语/专业二）'] },
          { time:'12 月下旬', event:'考试', tips:['提前 1 天去考点踩点','带身份证/准考证/笔/尺子','⚠️ 别忘订酒店（考点附近酒店会涨价）'] },
        ],
        tips:[
          '英语单词：艾宾浩斯遗忘曲线，每天 200-300 个新词 + 复习旧词',
          '专业课笔记：用思维导图 / XMind，方便背诵和回忆',
          '政治大题："马原/毛概/史纲/思修法基/时政" 各自有答题模板，背模板 + 结合材料',
          '考研不要一个人，找研友互相监督（但要找靠谱的！）',
          '身体是革命本钱！每周至少 3 次 30 分钟运动',
        ],
      },

      // —— 6. 租房/独居 ——
      { id:'rent', icon:'🏠', title:'租房/独居经验 · 避坑清单', tags:['租房','独居','生活','毕业'], identityMatch:['毕业生','打工人','求职者'], summary:'第一次租房怎么找房 + 合同要注意什么 + 搬家清单',
        sectionsLabel:'💡 找房渠道（按靠谱度排序）',
        sections:[
          { time:'⭐⭐⭐⭐⭐', event:'公司/单位提供的员工宿舍', tips:['最便宜、最安全、室友大概率是同事','⚠️ 但可能远、可能贵（看公司政策）'] },
          { time:'⭐⭐⭐⭐', event:'贝壳找房/链家（正规中介）', tips:['房源真实、合同规范','⚠️ 中介费 = 一个月租金（可以谈价！）'] },
          { time:'⭐⭐⭐', event:'豆瓣租房小组', tips:['个人房源无中介费','⚠️ 警惕假房东/二房东，一定看房产证'] },
          { time:'⭐⭐', event:'群租房/隔断间', tips:['便宜但隔音差、安全隐患大','⚠️ 北京市 2024 年起严查群租房'] },
          { time:'⭐', event:'Airbnb 长租', tips:['短期住可以（1-2 周）','长期比租房贵 2-3 倍'] },
        ],
        warnings:[
          '⚠️ 签合同前一定看"房产证"和"房主身份证"原件（二房东看房主授权书）',
          '⚠️ 合同要写清楚：租期/租金/付款方式/提前退租违约金/维修责任/转租条款',
          '⚠️ 押金 = 一个月租金，房东不能扣！退租时必须全额退还',
          '⚠️ 入住前拍照录像！家具/家电/墙面/水电，有破损要告诉房东',
        ],
        tips:[
          '搬家清单：身份证/银行卡/钥匙/充电器/电脑/洗漱用品 → 随身带',
          '独居安全：反锁门、装门挡阻、楼道灯坏了报修、别随便开门',
          '合租室友：提前沟通作息、空调温度、公共区域使用',
          '第一次租房优先近公司 > 近地铁 > 房租便宜',
        ],
      },

      // —— 7. 理财入门 ——
      { id:'finance_starter', icon:'💰', title:'攒钱/理财入门 · 月薪 5k 也能存下钱', tags:['理财','攒钱','储蓄','入门'], identityMatch:['打工人','毕业生','妈妈','其他'], summary:'从"月光"到"能存下"的 4 步 + 低风险理财入门',
        sectionsLabel:'🚨 先还债',
        sections:[
          { time:'Step 1', event:'先算出你每月能存多少', tips:['收入 - 固定支出（房租/交通/水电/手机）= 可支配','可支配 × 30-50% = 应该存的钱（雷打不动）'] },
          { time:'Step 2', event:'强制储蓄', tips:['⚠️ 发工资当天先把 30% 转到"攒钱卡"（只进不出）','剩下的钱才是"生活费"','养成"先存后花"而不是"先花后存"'] },
          { time:'Step 3', event:'还债（如果有）', tips:['信用卡/花呗 → 先还清（年利率 18%+！）','⚠️ 最低还款 = 利滚利，绝对不要最低还款'] },
          { time:'Step 4', event:'学习理财（等有 3 万应急金之后）', tips:['⚠️ 月薪 5k 以下先"强制储蓄"，理财放一放','3 万应急金 = 至少 6 个月生活费'] },
        ],
        tips:[
          '记账：每月花在哪一目了然（微信/支付宝账单 → 月度报告）',
          '3 个账户划分：日常消费卡 / 攒钱卡 / 理财卡',
          '低风险入门：货币基金（余额宝）→ 指数基金定投（沪深 300）',
          '高风险（别碰！）：P2P、加密货币、"稳赚不赔"的项目',
          '⚠️ 理财的第一原则：别亏！第二原则：别想赚快钱',
        ],
        faqs:[
          { q:'基金定投是什么？', a:'每月固定时间投固定金额到某只基金（比如沪深 300 指数），摊低成本，长期（5 年+）大概率赚钱。' },
          { q:'余额宝安全吗？', a:'安全！天弘基金货币基金，几乎不会亏本，但收益也低（年化 2% 左右）。适合放应急金。' },
          { q:'大学生该攒钱吗？', a:'该！但优先级是：先保障学费/生活费 → 存 1 万应急金 → 学习理财 → 不碰高风险。每月存 500 元，毕业时能有 2-3 万。' },
        ],
      },
    ];
  },
});
