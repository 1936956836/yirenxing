// 90-study99-quiz.js —— v12.9.3 【练习站】刷题站（题库见 88/89-quiz99-*.js）
// [功能组] G3-学习成长（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   · 首页（效果图同款）：今日战绩条 + 搜索 + 科目胶囊（英语/政治/高数/计算机/专业课）+ 题型胶囊 + 双列题组卡
//   · 题组详情 → 逐题作答（提交即判分：解析 + 考察知识点 + 阶段/真题/频次标注）→ 完成页（本次战绩 + 错题回顾）
//   · 错题本：答错自动归档，重做答对自动移出（storage.quiz99WrongIds 按最近一次作答推导）
//   · 专业课：按【主人档案 · 所学专业】匹配 89-quiz99-major.js 的专业课组（可多门）
//   · 每答一题写一条流水（storage.quiz99Log）→「今日已练 N 题 · 正确率 P%」即 requirement⑤
//   · 快速直达：App.st99PZGo('en'|'pol'|'math'|'cs') 供【链接】四科直达按钮 / 格物书架跳转
Object.assign(App, {

  // ==================== 状态与导航 ====================
  _st99PZInit() {
    if (!this._st99PZSt) this._st99PZSt = { page: 'home', sub: 'en', type: '', q: '', setId: '', run: null };
    return this._st99PZSt;
  },
  // 练习站总路由（87-study99.js 的 _wbStudy99 在 view==='practice' 时调用）
  _st99PZ() {
    const pz = this._st99PZInit();
    if (pz.page === 'set' && pz.setId) return this._st99PZSetPage();
    if (pz.page === 'run' && pz.run) return this._st99PZRunPage();
    if (pz.page === 'done' && pz.run) return this._st99PZDonePage();
    return this._st99PZHome();
  },
  // 外部快速直达（链接页四科按钮 / 格物书架跳卡）
  st99PZGo(sub) {
    const st = this._st99Init();
    st.view = 'practice';
    const pz = this._st99PZInit();
    pz.page = 'home'; pz.sub = (QZ99.core[sub] ? sub : 'en'); pz.type = ''; pz.q = ''; pz.setId = ''; pz.run = null;
    this.gotoWb('study99');
  },

  // ==================== 题库解析（88/89 数据 → 统一题组对象）====================
  _qz99Tuple(set, i, t, pre) {
    return { qid: set.id + '#' + i, q: t[0], opts: [t[1], t[2], t[3], t[4]], ans: t[5], exp: t[6], kp: t[7], real: t[8] ? 1 : 0, freq: t[9] || '中频', pre: pre || '' };
  },
  _qz99Resolve(set) {
    const out = { id: set.id, sub: set.sub, type: set.type || '', stage: set.stage || 'prof', name: set.name, ico: set.ico || '📘', desc: set.desc || '', qs: [] };
    if (set.gen && set.gen.pool) {
      // 词汇组：从记忆词池生成词义四选一（干扰项确定性取样，选项位置按 i%4 轮转）
      const pool = (CONFIG.workbench || {})[set.gen.pool] || [];
      const n = pool.length || 1;
      pool.forEach((w, i) => {
        const dis = [pool[(i + 7) % n], pool[(i + 13) % n], pool[(i + 29) % n]].map(x => (x && x.m) || '其他含义');
        const pos = i % 4, opts = [];
        let d = 0;
        for (let k = 0; k < 4; k++) opts.push(k === pos ? w.m : dis[d++]);
        out.qs.push({ qid: set.id + '#' + i, q: `选出「${w.w}」${w.p || ''} 的正确含义`, opts, ans: pos, exp: `${w.w} ${w.m}`, kp: '词汇辨析', real: 0, freq: '高频', pre: '' });
      });
    } else if (set.gen && set.gen.bank) {
      // 综合小测：复用 data.js subjectBanks（含解析）
      const bank = (CONFIG.subjectBanks || {})[set.gen.bank] || {};
      (bank.questions || []).forEach(b => {
        out.qs.push({ qid: set.id + '#' + b.id, q: b.q, opts: b.opts, ans: b.ans, exp: b.exp, kp: '综合考点', real: 0, freq: '中频', pre: '' });
      });
    } else if (set.reads) {
      // 阅读/听力：短文（pre）+ 题组
      set.reads.forEach((r, ri) => r.qs.forEach((t, qi) => out.qs.push(this._qz99Tuple(set, ri + '_' + qi, t, r.p))));
    } else if (set.qs) {
      set.qs.forEach((t, i) => out.qs.push(this._qz99Tuple(set, i, t)));
    }
    return out;
  },
  // 专业课：档案专业 → 89 题库匹配
  st99Major() {
    const m = (Store.getProfile().major || '').trim();
    if (!m) return null;
    const group = (window.QZ99 && QZ99.majors || []).find(g => g.match.some(k => m.includes(k)));
    return group ? { name: m, group } : { name: m, group: null };
  },
  _st99MajorCourses() {
    const mj = this.st99Major();
    if (!mj || !mj.group) return [];
    return mj.group.courses.map(c => ({ id: c.id, sub: 'prof', type: c.name, stage: c.stage || 'prof', name: c.name, ico: c.ico, desc: '专业课题库', qs: c.qs }));
  },
  // 全部题组（核心四科 + 专业课）——带解析缓存
  qz99AllSets() {
    if (!this._qz99Sets) {
      const list = [];
      (QZ99.sets || []).forEach(s => list.push(this._qz99Resolve(s)));
      this._st99MajorCourses().forEach(c => list.push(this._qz99Resolve(c)));
      this._qz99Sets = list;
    }
    return this._qz99Sets;
  },
  // 按 id 取题组（含虚拟组：zz_wrong_<sub> 错题巩固 / zz_real_<sub> 真题精选——每次实时取）
  qz99SetById(id) {
    const mv = String(id || '').match(/^zz_(wrong|real)_([a-z]+)$/);
    if (mv) {
      const kind = mv[1], sub = mv[2];
      const wrongSet = kind === 'wrong' ? new Set(Store.quiz99WrongIds()) : null;
      const qs = [];
      this.qz99AllSets().forEach(s => {
        if (s.sub !== sub) return;
        s.qs.forEach(q => { if (kind === 'real' ? q.real : wrongSet.has(q.qid)) qs.push(q); });
      });
      const c = QZ99.core[sub] || { name: (sub === 'prof' ? ((this.st99Major() || {}).name || '专业课') : sub) };
      return { id, sub, type: 'zz', stage: kind, name: (kind === 'wrong' ? '错题巩固' : '真题精选') + ' · ' + c.name, ico: kind === 'wrong' ? '♻️' : '📜', desc: '', qs };
    }
    return this.qz99AllSets().find(s => s.id === id) || null;
  },
  _qz99StageLabel(stage) {
    return (QZ99.stages || {})[stage] || (stage === 'wrong' ? '错题重练' : stage === 'real' ? '真题' : stage);
  },
  _qz99TypeName(set) {
    if (set.type === 'zz') return set.stage === 'wrong' ? '错题本' : '真题';
    const c = QZ99.core[set.sub];
    const t = c && c.types.find(x => x.t === set.type);
    return set.sub === 'prof' ? set.type : (t ? t.n : set.type);
  },

  // ==================== 首页（效果图同款）====================
  _st99PZHome() {
    const pz = this._st99PZInit();
    const t = Store.quiz99Today();
    const wrongN = Store.quiz99WrongIds().length;
    const subPill = (k, n) => `<button type="button" class="st99-chip${pz.sub === k ? ' on' : ''}" onclick="App.st99PZPickSub('${k}')">${n}</button>`;
    const gw99Go = id => `App._gw99RedirectShelf('${id}');App.gotoWb('gewu99')`;
    return `<div class="st99-page">
      <div class="st99-topbar">
        <button class="st99-back" onclick="App.navBack()">‹</button>
        <div class="st99-title">练习站</div>
        <button class="st99-editbtn plus" title="补录一次纸面练习" onclick="App.st99PracticeModal()">＋</button>
      </div>
      <div class="pz-strip">
        <span>🎯 今日已练 <b>${t.count}</b> 题 · 正确率 <b>${t.acc}%</b> · 待消灭错题 <b>${wrongN}</b></span>
      </div>
      <div class="pz-search">
        <span class="pz-search-ico">🔍</span>
        <input id="pz99Q" type="search" placeholder="输入题组名称搜索" value="${this.esc(pz.q)}" oninput="App._st99PZSearch(this.value)">
      </div>
      <div class="st99-chips" style="margin-top:10px">
        ${subPill('en', '🔤 英语')}${subPill('pol', '🏛️ 政治')}${subPill('math', '📐 高数')}${subPill('cs', '💻 计算机')}${subPill('prof', '🎓 专业课')}
      </div>
      <div id="pz99Grid" style="margin-top:10px">${this._st99PZGrid()}</div>
      <div class="pz-quick">
        <span class="pz-quick-t">📖 课本知识（格物图书馆）</span>
        <button type="button" onclick="${gw99Go('en')}">英语</button>
        <button type="button" onclick="${gw99Go('pol')}">政治</button>
        <button type="button" onclick="${gw99Go('math')}">高数</button>
        <button type="button" onclick="${gw99Go('cs')}">计算机</button>
      </div>
      <div class="pz-foot">点任意卡片进入题组 · 计次打卡 · 错题自动归档到错题本</div>
    </div>`;
  },
  // 题组卡片网格（首页局部重绘单元）
  _st99PZGrid() {
    const pz = this._st99PZInit();
    const tints = ['#FFE4D6', '#DBEAFE', '#DCFCE7', '#EDE9FE', '#FEF3C7', '#FCE7F3', '#CFFAFE', '#FEE2E2'];
    const card = (s, tint) => {
      const n = s.qs.length;
      if (!n) return '';
      const realN = s.qs.filter(q => q.real).length;
      return `<div class="pz-card" onclick="App.st99PZOpen('${s.id}')">
        <div class="pz-card-ico" style="background:${tint}">${s.ico}</div>
        <div class="pz-card-name">${this.esc(s.name)}</div>
        <div class="pz-card-tags">
          <i>${this._qz99StageLabel(s.stage)}</i><i>${this._qz99TypeName(s)}</i>${realN ? '<i class="real">真题 ' + realN + '</i>' : ''}<i>${n} 题</i>
        </div>
      </div>`;
    };
    // 专业课未配置
    if (pz.sub === 'prof') {
      const mj = this.st99Major();
      if (!mj) return `<div class="pz-tip-card">🎓 还不知道你的专业——去【主人档案】填写「所学专业」，练习站会自动生成你的专业课题库（常见专业可多门专业课）。
        <div style="margin-top:10px"><button class="st99-mini-btn" onclick="App.st99PZGoProfile()">去填写所学专业 ›</button></div></div>`;
      if (!mj.group) return `<div class="pz-tip-card">📌 你的专业「${this.esc(mj.name)}」暂未收录专业课题库。可尝试填写常见专业名（如：计算机科学与技术 / 护理学 / 会计学 / 学前教育 / 汉语言文学 / 法学 / 电气工程及其自动化 / 土木工程 / 药学 / 工商管理 / 电子商务…），四科公共题库不受影响。</div>`;
    }
    // 类型胶囊（题型分类，非难度）
    const core = QZ99.core[pz.sub];
    const typePill = (k, n) => `<button type="button" class="st99-chip${pz.type === k ? ' on' : ''}" onclick="App.st99PZPickType('${k}')">${n}</button>`;
    let pills = `<div class="st99-chips" style="margin-bottom:10px">${typePill('', '全部')}`;
    if (pz.sub === 'prof') {
      this._st99MajorCourses().forEach(c => { pills += typePill(c.type, this.esc(c.name)); });
    } else {
      core.types.forEach(t => { pills += typePill(t.t, t.n); });
    }
    const wrongN = Store.quiz99WrongIds().length;
    const realN = this.qz99AllSets().filter(s => s.sub === pz.sub).reduce((a, s) => a + s.qs.filter(q => q.real).length, 0);
    pills += `${typePill('zzwrong', '♻️ 错题本' + (wrongN ? ' ' + wrongN : ''))}${typePill('zzreal', '📜 真题' + (realN ? ' ' + realN : ''))}</div>`;
    // 卡片
    let cards = '';
    if (pz.type === '' || pz.type === 'zzwrong') {
      if (wrongN) cards += card(this.qz99SetById('zz_wrong_' + pz.sub), tints[6]);
      else if (pz.type === 'zzwrong') cards += `<div class="pz-tip-card">♻️ 错题本是空的——答错的题会自动收进来，重做答对自动移出。先去刷一组题吧。</div>`;
    }
    if (pz.type === '' || pz.type === 'zzreal') {
      if (realN) cards += card(this.qz99SetById('zz_real_' + pz.sub), tints[5]);
      else if (pz.type === 'zzreal') cards += `<div class="pz-tip-card">📜 该科目暂无真题标注题（非真题组同样有解析与知识点标注）。</div>`;
    }
    const kw = pz.q.trim().toLowerCase();
    const list = this.qz99AllSets().filter(s => {
      if (s.sub !== pz.sub) return false;
      if (pz.type && pz.type !== 'zzwrong' && pz.type !== 'zzreal' && s.type !== pz.type) return false;
      if (kw && !(s.name.toLowerCase().includes(kw) || this._qz99TypeName(s).toLowerCase().includes(kw))) return false;
      return true;
    });
    cards += list.map((s, i) => card(s, tints[i % tints.length])).join('');
    if (!cards) cards = `<div class="pz-tip-card">没有匹配的题组——换个关键词或切回「全部」看看。</div>`;
    return pills + `<div class="pz-grid">${cards}</div>`;
  },
  st99PZPickSub(k) { const pz = this._st99PZInit(); pz.sub = k; pz.type = ''; this.render_workbench(); },
  st99PZPickType(t) { const pz = this._st99PZInit(); pz.type = t; this.render_workbench(); },
  _st99PZSearch(q) {
    const pz = this._st99PZInit();
    pz.q = q;
    const el = document.getElementById('pz99Grid');
    if (el) el.innerHTML = this._st99PZGrid(); // 只重绘网格，输入框不丢焦点
  },
  st99PZGoProfile() {
    this.gotoWb('datacenter99');
    this._dc99Set('tab', 'profile');
  },

  // ==================== 题组详情页 ====================
  st99PZOpen(id) {
    const s = this.qz99SetById(id);
    if (!s || !s.qs.length) { this._flash('该题组暂时没有题目'); return; }
    this._navPush();
    const pz = this._st99PZInit();
    pz.setId = id; pz.page = 'set'; pz.run = null;
    this.render_workbench();
  },
  _st99PZSetPage() {
    const pz = this._st99PZInit();
    const s = this.qz99SetById(pz.setId);
    if (!s) { pz.page = 'home'; return this._st99PZHome(); }
    const logs = Store.getQuiz99().logs.filter(l => l.set === s.id);
    const realN = s.qs.filter(q => q.real).length;
    const last20 = logs.slice(-20);
    const acc = last20.length ? Math.round(last20.filter(l => l.ok).length / last20.length * 100) : null;
    return `<div class="st99-page">
      <div class="st99-topbar">
        <button class="st99-back" onclick="App.navBack()">‹</button>
        <div class="st99-title">题组详情</div><span></span>
      </div>
      <div class="pz-sethead">
        <div class="pz-set-ico">${s.ico}</div>
        <div style="min-width:0">
          <div class="pz-set-name">${this.esc(s.name)}</div>
          <div class="pz-set-meta">${this._qz99StageLabel(s.stage)} · ${this._qz99TypeName(s)} · ${s.qs.length} 题${realN ? ` · 真题 ${realN} 题` : ''}${s.desc ? ' · ' + this.esc(s.desc) : ''}</div>
        </div>
      </div>
      <div class="st99-card" style="margin-top:12px">
        <div class="st99-ct"><span class="st99-ct-ico">📊</span>练习档案</div>
        <div class="st99-li"><b>累计</b><span>已作答 ${logs.length} 题次</span><i class="st99-li-sub">${s.qs.length} 题/组</i></div>
        <div class="st99-li"><b>最近</b><span>${acc === null ? '还没有练过——从这里开始' : '近 20 题次正确率 ' + acc + '%'}</span></div>
        <div class="st99-li"><b>标注</b><span>每题附：阶段 · 真题/模拟 · 考察频次 · 知识点（点题干可看考点）</span></div>
      </div>
      <button class="pz-start" onclick="App.st99PZStart()">▶ 开始练习（${s.qs.length} 题）</button>
      <div class="pz-foot">提交即判分入当日战绩 · 错题自动归档错题本</div>
    </div>`;
  },

  // ==================== 答题页 ====================
  st99PZStart() {
    const pz = this._st99PZInit();
    const s = this.qz99SetById(pz.setId);
    if (!s || !s.qs.length) { this._flash('该题组暂时没有题目'); return; }
    this._navPush();
    pz.run = { setId: s.id, sub: s.sub, qs: s.qs, i: 0, pick: -1, judged: false, right: 0, results: [] };
    pz.page = 'run';
    this.render_workbench();
  },
  st99PZQuit() { // 答题页 ← 放弃本次（已提交的题保留战绩）
    this._flash('已退出本次练习，已提交的题保留战绩');
    this.navBack();
  },
  _st99PZRunPage() {
    const pz = this._st99PZInit();
    const r = pz.run, s = this.qz99SetById(r.setId);
    const q = r.qs[r.i];
    const AB = ['A', 'B', 'C', 'D'];
    const t = Store.quiz99Today();
    const opts = q.opts.map((o, i) => {
      let cls = 'pz-opt';
      if (r.judged) {
        if (i === q.ans) cls += ' ok';
        else if (i === r.pick) cls += ' bad';
      } else if (r.pick === i) cls += ' on';
      return `<div class="${cls}" onclick="App._st99PZPick(${i})"><b>${AB[i]}</b><span>${this.esc(o)}</span></div>`;
    }).join('');
    return `<div class="st99-page">
      <div class="st99-topbar">
        <button class="st99-back" onclick="App.st99PZQuit()">‹</button>
        <div class="st99-title">${this.esc(s ? s.name : '练习')}</div>
        <span class="pz-today-chip">今日 ${t.count} 题</span>
      </div>
      <div class="pz-prog"><i style="width:${Math.round((r.i + 1) / r.qs.length * 100)}%"></i></div>
      <div class="pz-count">第 ${r.i + 1} / ${r.qs.length} 题 · 本次已对 <b>${r.right}</b></div>
      <div class="pz-qmeta">
        <i>${this._qz99StageLabel(r.stage || (s && s.stage))}</i>
        <i class="${q.real ? 'real' : ''}">${q.real ? '📜 真题' : '模拟题'}</i>
        <i>${this.esc(q.freq || '中')}频考点</i>
      </div>
      ${q.pre ? `<div class="pz-pre">${this.esc(q.pre)}</div>` : ''}
      <div class="pz-q" onclick="App._st99PZHint()" title="点击查看考察知识点">${this.esc(q.q)}</div>
      <div class="pz-opts">${opts}</div>
      ${r.judged ? `
        <div class="pz-judge ${r.pick === q.ans ? 'ok' : 'bad'}">${r.pick === q.ans ? '✅ 回答正确' : '❌ 回答错误 · 正确答案 ' + AB[q.ans]}</div>
        <div class="pz-exp"><b>💭 解析</b>${this.esc(q.exp)}</div>
        <div class="pz-kp"><b>💡 考察知识点</b>${this.esc(q.kp)}</div>
        <button class="pz-start" onclick="App._st99PZNext()">${r.i + 1 >= r.qs.length ? '🏁 完成本组练习' : '下一题 ›'}</button>
      ` : `
        <button class="pz-start${r.pick < 0 ? ' wait' : ''}" ${r.pick < 0 ? 'disabled' : ''} onclick="App._st99PZSubmit()">提交答案</button>
      `}
      <div class="pz-foot">点题干可提前查看考察知识点 · 放弃本次练习已提交的题也计入战绩</div>
    </div>`;
  },
  _st99PZPick(i) {
    const r = this._st99PZInit().run;
    if (!r || r.judged) return;
    r.pick = i;
    this.render_workbench();
  },
  _st99PZHint() {
    const r = this._st99PZInit().run;
    if (!r) return;
    const q = r.qs[r.i];
    this._flash(`💡 本题考察：${q.kp}`);
  },
  _st99PZSubmit() {
    const pz = this._st99PZInit();
    const r = pz.run;
    if (!r || r.judged || r.pick < 0) return;
    const q = r.qs[r.i];
    const ok = r.pick === q.ans ? 1 : 0;
    r.judged = true;
    r.right += ok;
    r.results.push({ q, ok });
    Store.quiz99Log({ sub: r.sub, set: r.setId, qid: q.qid, ok }); // 每题一条流水（requirement⑤）
    this.render_workbench();
  },
  _st99PZNext() {
    const pz = this._st99PZInit();
    const r = pz.run;
    if (!r) return;
    if (r.i + 1 >= r.qs.length) { pz.page = 'done'; }
    else { r.i++; r.pick = -1; r.judged = false; }
    this.render_workbench();
  },

  // ==================== 完成页 ====================
  _st99PZDonePage() {
    const pz = this._st99PZInit();
    const r = pz.run, s = this.qz99SetById(r.setId);
    const n = r.results.length, right = r.right;
    const acc = n ? Math.round(right / n * 100) : 0;
    const wrongs = r.results.filter(x => !x.ok);
    const t = Store.quiz99Today();
    return `<div class="st99-page">
      <div class="st99-topbar">
        <button class="st99-back" onclick="App.navBack()">‹</button>
        <div class="st99-title">练习完成</div><span></span>
      </div>
      <div class="pz-done-hero">
        <div class="pz-done-emoji">${acc >= 80 ? '🎉' : acc >= 60 ? '💪' : '🌱'}</div>
        <div class="pz-done-name">${this.esc(s ? s.name : '')}</div>
        <div class="pz-done-stats">本次 <b>${n}</b> 题 · 答对 <b>${right}</b> · 正确率 <b>${acc}%</b></div>
        <div class="pz-done-sub">今日累计已练 ${t.count} 题 · 正确率 ${t.acc}%</div>
      </div>
      <div class="st99-card" style="margin-top:12px">
        <div class="st99-ct"><span class="st99-ct-ico">♻️</span>本次错题（${wrongs.length}）· 已自动归档错题本</div>
        ${wrongs.length ? wrongs.map(x => `<div class="st99-li"><b>❌</b><span>${this.esc(x.q.q.length > 34 ? x.q.q.slice(0, 34) + '…' : x.q.q)}</span><i class="st99-li-sub">${this.esc(x.q.kp)}</i></div>`).join('')
          : '<div class="st99-empty">本次全对，一棵树都没长歪 🌳✨</div>'}
      </div>
      <button class="pz-start" onclick="App.st99PZRetry()">🔁 再练一遍</button>
      <div style="margin-top:10px;text-align:center"><button class="btn btn-ghost" onclick="App.navBack()">← 返回题组详情</button></div>
    </div>`;
  },
  st99PZRetry() {
    const pz = this._st99PZInit();
    if (!pz.run) return;
    const s = this.qz99SetById(pz.run.setId);
    if (!s) return;
    pz.run = { setId: s.id, sub: s.sub, qs: s.qs, i: 0, pick: -1, judged: false, right: 0, results: [] };
    pz.page = 'run';
    this.render_workbench();
  },
});
