// 111-qwerty99.js —— v12.9.58 【Qwerty 背单词】四六级/考研 · 打字拼写默写 · 艾宾浩斯复习（G3-学习成长）
// [功能组] G3-学习成长（练习站 ⌨️ 背单词）+ G2-生活基础（习惯打卡联动）+ G5（问阿福）
//
// 移植开源 Qwerty-Learner（RealKai42 · Apache-2.0）核心玩法：看中文释义 → 键盘敲英文拼写，
//   逐字母比对（对绿错红·错即重输）；剥离其 demo 页面，仅保留词库/拼写/复习算法核心。
//   词库运行时从 jsDelivr CDN 拉取官方 dict（CET4_T / CET6_T / 2025KaoYanHongBaoShu），
//   localStorage 缓存；离线时回落内置种子词表（每种 16 词，保底可练）。
//
// 单词朗读：@capacitor-community/text-to-speech（en-US · 复用项目全局统一 TTS 实例
//   95-native99.js 的 _tts99Speak——不重复新建引擎；按用户处方禁用浏览器 SpeechSynthesis；
//   引擎不可用时友好提示，绝不弹「插件找不到」报错弹窗）。
// 联动：① 每日 20 词完成 → 自动习惯打卡（studyMorning/Noon/Evening 按时段）；② 词卡「问阿福」
//   唤起管家讲解（复用 afuChatOpen + afuChatSend）；③ 统计并入练习站今日条。
Object.assign(App, {

  // ==================== 词库注册（CDN + 缓存 + 种子兜底）====================
  qw99Dicts() {
    return [
      { id: 'cet4',   n: '四级核心',   ico: '📗', cnt: 0, url: 'https://cdn.jsdelivr.net/gh/RealKai42/qwerty-learner@master/public/dicts/CET4_T.json' },
      { id: 'cet6',   n: '六级核心',   ico: '📘', cnt: 0, url: 'https://cdn.jsdelivr.net/gh/RealKai42/qwerty-learner@master/public/dicts/CET6_T.json' },
      { id: 'kaoyan', n: '考研红包书', ico: '📕', cnt: 0, url: 'https://cdn.jsdelivr.net/gh/RealKai42/qwerty-learner@master/public/dicts/2025KaoYanHongBaoShu.json' },
    ];
  },
  // 离线种子（CDN 不可达时的保底词表 · 每库 16 词）
  _QW99_SEED: {
    cet4: [['abandon','v. 放弃，抛弃；放纵'],['ability','n. 能力，才能'],['absorb','vt. 吸收；使专心'],['abstract','adj. 抽象的 n. 摘要'],['academic','adj. 学院的，学术的'],['access','n. 通道；接近 vt. 存取'],['accompany','vt. 陪伴，伴随'],['achieve','vt. 达到，完成'],['acquire','vt. 获得，取得'],['adapt','vt. 使适应；改编'],['adequate','adj. 足够的，适当的'],['adjust','vt. 调整，调节'],['admire','vt. 钦佩，赞赏'],['admit','vt. 承认；准许进入'],['adopt','vt. 采用；收养'],['advance','vi. 前进 n. 进步']],
    cet6: [['abolish','vt. 废除，取消'],['absurd','adj. 荒谬的，荒唐的'],['abundant','adj. 丰富的，充裕的'],['accelerate','v. 加速，促进'],['accessible','adj. 可接近的，可进入的'],['accommodate','vt. 容纳；向…提供'],['accumulate','v. 积累，堆积'],['acknowledge','vt. 承认；致谢'],['administer','vt. 管理；施行'],['adolescent','n. 青少年'],['advocate','vt. 提倡，主张'],['aggravate','vt. 加重，恶化'],['alleviate','vt. 减轻，缓解'],['ambiguous','adj. 模棱两可的'],['ample','adj. 充足的，宽敞的'],['analogy','n. 类比，类似']],
    kaoyan: [['embrace','v. 拥抱；欣然接受'],['embed','v. 嵌入，使深印'],['embody','v. 体现，使具体化'],['elicit','v. 引出，诱出'],['elite','n. 精英，上层人物'],['thorough','adj. 彻底的，细致的'],['compensate','v. 补偿，弥补'],['comprehensive','adj. 全面的，综合的'],['conceive','v. 构想，设想'],['deteriorate','v. 恶化，变坏'],['eliminate','vt. 消除，淘汰'],['facilitate','vt. 促进，使便利'],['hypothesis','n. 假设，前提'],['implement','vt. 实施，执行'],['incentive','n. 动机，激励'],['subtle','adj. 微妙的，精细的']],
  },
  // 词库条目统一形如 { w, m, p }（word / meaning / usphone）
  async _qw99LoadDict(dictId) {
    const ck = 'qw99_d_' + dictId;
    try {
      const raw = JSON.parse(localStorage.getItem(ck) || 'null');
      if (raw && raw.list && raw.list.length) return raw;
    } catch (e) {}
    const def = this.qw99Dicts().find(d => d.id === dictId);
    if (!def) return { list: [] };
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 15000);
      const res = await fetch(def.url, { signal: ctrl.signal, cache: 'no-cache' });
      clearTimeout(timer);
      if (!res.ok) throw new Error('http ' + res.status);
      const j = await res.json();
      if (!Array.isArray(j) || !j.length) throw new Error('bad payload');
      const list = j.filter(x => x && x.name && x.trans && x.trans.length)
        .map(x => ({ w: String(x.name), m: x.trans.join('；').slice(0, 60), p: String(x.usphone || x.ukphone || '') }))
        .filter(x => x.w.length <= 20);
      if (!list.length) throw new Error('empty after filter');
      const data = { v: 1, ts: Date.now(), list };
      try { localStorage.setItem(ck, JSON.stringify(data)); } catch (e) {}
      this._qw99LogAdd('词库 ' + def.n + ' 已在线拉取（' + list.length + ' 词）· 已缓存', dictId);
      return data;
    } catch (e) {
      // CDN 不可达：种子词表兜底（离线保底可练）
      const seed = (this._QW99_SEED[dictId] || []).map(a => ({ w: a[0], m: a[1], p: '' }));
      this._qw99LogAdd('词库 ' + def.n + ' 在线拉取失败（' + String((e && e.message) || e) + '）→ 内置种子 16 词兜底', dictId);
      return { v: 0, ts: Date.now(), seed: true, list: seed };
    }
  },

  // ==================== 艾宾浩斯复习记忆（间隔分钟：5m→30m→12h→1d→2d→4d→7d→15d）====================
  _qw99Vocab() {
    try { return JSON.parse(localStorage.getItem('qw99_vocab_v1') || '{}'); } catch (e) { return {}; }
  },
  _qw99SaveVocab(v) { try { localStorage.setItem('qw99_vocab_v1', JSON.stringify(v)); } catch (e) {} },
  _qw99Gaps: [5, 30, 720, 1440, 2880, 5760, 10080, 21600],
  _qw99Recall(word, ok) {
    const v = this._qw99Vocab();
    const e = v[word] || { s: 0, r: 0, w: 0 };
    if (ok) { e.s = Math.min(7, e.s + 1); e.r++; } else { e.s = 0; e.w++; }
    e.nextAt = Date.now() + (this._qw99Gaps[e.s] || 21600) * 60000;
    v[word] = e;
    this._qw99SaveVocab(v);
  },
  // 练习队列：到期复习词优先，再补新词（每日目标 20）
  _qw99Queue(list, dictId) {
    const now = Date.now();
    const v = this._qw99Vocab();
    const due = [], fresh = [];
    list.forEach(x => {
      const e = v[x.w];
      if (e && e.nextAt && e.nextAt <= now) due.push(x);
      else if (!e) fresh.push(x);
    });
    due.sort((a, b) => (v[a.w].nextAt || 0) - (v[b.w].nextAt || 0));
    const st = this._qw99State();
    const goal = 20, done = (st.today && st.today.d === (Store && Store.today ? Store.today() : '')) ? st.today.done : 0;
    return due.concat(fresh).slice(0, Math.max(0, goal - done) + due.length);
  },

  // ==================== 状态与统计 ====================
  _qw99State() {
    try {
      const s = JSON.parse(localStorage.getItem('qw99_state_v1') || 'null');
      if (s) return s;
    } catch (e) {}
    return { dict: 'cet4', run: null, today: null, total: { right: 0, wrong: 0, words: 0 } };
  },
  _qw99SaveState(s) { try { localStorage.setItem('qw99_state_v1', JSON.stringify(s)); } catch (e) {} },
  _qw99Today() {
    const s = this._qw99State();
    const dk = (Store && Store.today) ? Store.today() : '';
    if (!s.today || s.today.d !== dk) { s.today = { d: dk, done: 0, right: 0, wrong: 0 }; this._qw99SaveState(s); }
    return s.today;
  },
  _qw99LogAdd(line, tag) {
    this._qw99Log = this._qw99Log || [];
    const t = new Date();
    this._qw99Log.push(`[${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}]${tag ? '[' + tag + ']' : ''} ${line}`);
    if (this._qw99Log.length > 80) this._qw99Log.splice(0, this._qw99Log.length - 80);
  },

  // ==================== 页面（练习站 · pz.sub === 'qw' 分支渲染）====================
  qw99Page() {
    const s = this._qw99State();
    const dicts = this.qw99Dicts();
    const t = this._qw99Today();
    const v = this._qw99Vocab();
    const learned = Object.keys(v).length;
    const dueN = Object.keys(v).filter(w => v[w].nextAt && v[w].nextAt <= Date.now()).length;
    const dPill = (d) => `<button type="button" class="st99-chip${s.dict === d.id ? ' on' : ''}" onclick="App.qw99PickDict('${d.id}')">${d.ico} ${d.n}</button>`;
    return `<div class="qw99-page">
      <div class="pz-strip"><span>⌨️ 今日背词 <b>${t.done}</b>/20 · 对 <b>${t.right}</b> 错 <b>${t.wrong}</b> · 复习到期 <b>${dueN}</b> 词 · 已学 <b>${learned}</b> 词</span></div>
      <div class="st99-chips" style="margin:10px 0 12px">${dicts.map(dPill).join('')}</div>
      <div class="qw99-cta">
        <button type="button" class="qw99-start" onclick="App.qw99Start()">🃏 开始卡片背词</button>
        <div class="qw99-tip">听音频 → 敲出英文单词 → 提交翻卡核对 → 滑动下一张 · 不会可看答案</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button type="button" class="btn btn-ghost btn-sm" style="margin:0" onclick="App.qw99ClearAsk()">🧹 重置学习进度</button>
      </div>
      <div class="pz-foot">词库来自开源 Qwerty-Learner（CDN 在线拉取 · 离线内置兜底）· 复习按艾宾浩斯间隔：5分→30分→12时→1天→2天→4天→7天→15天 · 完成每日 20 词自动计入习惯打卡</div>
    </div>`;
  },
  qw99PickDict(id) {
    const s = this._qw99State();
    s.dict = id;
    this._qw99SaveState(s);
    this.render_workbench();
  },
  qw99ClearAsk() {
    this._modal('🧹 重置背词进度？', '<div style="font-size:13px;color:#475569">将清空艾宾浩斯记忆与今日统计（词库缓存保留）。</div>',
      [{ label: '取消' }, { label: '重置', onClick: () => { try { localStorage.removeItem('qw99_vocab_v1'); } catch (e) {} this._flash('已重置——从第一个词重新开始'); this.render_workbench(); } }]);
  },

  // ==================== 卡片式拼写练习（v12.9.60 重做）====================
  // 一摞单词卡（侧边窥视 · 后面的卡露出一点）：
  //   正面 = 上方「播放听写音频」+ 中文释义/音标 + 下方输入框（提交答案 / 不会·看答案）；
  //   提交 → 卡片 3D 翻转至背面核对（逐字母比对着色 + 正确答案 + 释义 + 再听/问阿福）；
  //   确认后滑动（左右滑 / 点按钮）切换下一张（飞出 + 新卡居中完全打开）。
  async qw99Start() {
    const s = this._qw99State();
    this._flash('⏳ 正在准备词库…');
    const d = await this._qw99LoadDict(s.dict);
    const queue = this._qw99Queue(d.list || [], s.dict);
    if (!queue.length) { this._flash('🎉 今日 20 词已完成——明天再来复习吧'); return; }
    s.run = { i: 0, queue, phase: 'front', input: '', lastOk: null, started: Date.now() };
    this._qw99SaveState(s);
    this.render_workbench();
    this._qw99FocusInput();
    setTimeout(() => { try { this.qw99Speak(); } catch (e) {} }, 300);   // 开场读第一个词
  },
  _qw99RunUI() {
    const s = this._qw99State();
    const r = s.run;
    if (!r) return this.qw99Page();
    const cur = r.queue[r.i];
    const onBack = r.phase === 'back';
    const t = this._qw99Today();
    // 背面：逐字母比对（输入 vs 正确答案，对绿错红）
    const cmp = onBack ? cur.w.split('').map((ch, i) => {
      const got = (r.input || '')[i] || '·';
      const ok = got.toLowerCase() === ch.toLowerCase();
      return `<i class="${ok ? 'ok' : 'bad'}">${this.esc(got)}</i>`;
    }).join('') : '';
    return `<div class="qw99-run">
      <div class="qw99-progress"><i style="width:${Math.round(r.i / r.queue.length * 100)}%"></i></div>
      <div class="qw99-deck${onBack ? ' flip' : ''}" id="qw99Deck">
        <div class="qw99-behind b2"></div>
        <div class="qw99-behind b1"></div>
        <div class="qw99-card3d">
          <div class="qw99-face qw99-front">
            <button type="button" class="qw99-audio" onclick="App.qw99Speak()">🔊<span>播放听写音频</span></button>
            <div class="qw99-meaning">${this.esc(cur.m)}</div>
            ${cur.p ? `<div class="qw99-phone">/${this.esc(cur.p)}/</div>` : '<div class="qw99-phone" style="opacity:.35">听音 · 默写</div>'}
            <input type="text" id="qw99Input" class="qw99-input" placeholder="拼出这个单词"
              autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
              value="${this.esc(r.input || '')}"
              oninput="App.qw99Input(this.value)"
              onkeydown="if(event.key==='Enter'){event.preventDefault();App.qw99Submit();}">
            <div class="qw99-front-btns">
              <button type="button" class="qw99-mini" onclick="App.qw99Reveal()">🙈 不会 · 看答案</button>
              <button type="button" class="qw99-mini" onclick="App.qw99AskAfu()">🤔 问阿福</button>
            </div>
          </div>
          <div class="qw99-face qw99-back">
            <div class="qw99-judge ${r.lastOk ? 'ok' : 'no'}">${r.lastOk ? '✔ 拼对了' : '✘ 拼错了'}</div>
            ${onBack ? `<div class="qw99-word-final">${cmp}</div>` : ''}
            <div class="qw99-ans">${this.esc(cur.w)}</div>
            <div class="qw99-meaning">${this.esc(cur.m)}</div>
            ${cur.p ? `<div class="qw99-phone">/${this.esc(cur.p)}/</div>` : ''}
            <div class="qw99-acts">
              <button type="button" class="qw99-mini" onclick="App.qw99Speak()">🔊 再听</button>
              <button type="button" class="qw99-mini" onclick="App.qw99AskAfu()">🤔 问阿福</button>
            </div>
            <button type="button" class="qw99-next" onclick="App.qw99Next(1)">下一张 ›</button>
            <div class="qw99-swipe-tip">左右滑动也可以切换</div>
          </div>
        </div>
      </div>
      <div class="qw99-status">第 ${r.i + 1} / ${r.queue.length} 词 · 今日 ${t.done}/20</div>
      <button type="button" class="qw99-exit" onclick="App.qw99Exit()">← 暂停退出</button>
    </div>`;
  },
  // 输入框实时记录（不重渲染——避免输入框失焦；界面状态在提交/翻面时统一刷新）
  qw99Input(v) {
    const s = this._qw99State();
    if (!s.run) return;
    s.run.input = String(v || '').slice(0, 40);
    this._qw99SaveState(s);
  },
  // 提交答案：校验 → 翻面核对（正确=今日+1，错误=记一次错——都翻面看清答案）
  qw99Submit() {
    const s = this._qw99State();
    const r = s.run;
    if (!r || r.phase !== 'front') return;
    const cur = r.queue[r.i];
    const input = String(r.input || '').trim();
    if (!input) { this._flash('✍️ 先把单词敲进输入框再提交'); return; }
    const ok = input.toLowerCase() === cur.w.toLowerCase();
    r.lastOk = ok;
    r.phase = 'back';
    this._qw99Recall(cur.w, ok);                 // 艾宾浩斯：对晋级 · 错清零
    const t = this._qw99Today();
    if (ok) { t.right++; t.done++; s.total.right++; s.total.words++; }
    else { t.wrong++; s.total.wrong++; }
    this._qw99SaveState(s);
    this._sfx99 && this._sfx99(ok ? 'success' : 'fail');
    // 翻面动画：先给当前卡加 .flip（原地 3D 翻转），动画结束再重渲染（保持背面态）
    const deck = document.getElementById('qw99Deck');
    if (deck) deck.classList.add('flip');
    setTimeout(() => this._qw99Rerun(), 500);
  },
  // 不会 · 看答案：直接翻面（记一次错 · 不计今日完成）
  qw99Reveal() {
    const s = this._qw99State();
    const r = s.run;
    if (!r || r.phase !== 'front') return;
    const cur = r.queue[r.i];
    r.lastOk = false;
    r.phase = 'back';
    this._qw99Recall(cur.w, false);
    const t = this._qw99Today();
    t.wrong++; s.total.wrong++;
    this._qw99SaveState(s);
    this._sfx99 && this._sfx99('fail');
    const deck = document.getElementById('qw99Deck');
    if (deck) deck.classList.add('flip');
    setTimeout(() => this._qw99Rerun(), 500);
  },
  // 确认后切换下一张（背面按钮 / 左右滑动）：当前卡飞出 → 下一张居中完全打开
  qw99Next(dir) {
    const s = this._qw99State();
    const r = s.run;
    if (!r || r.phase !== 'back') return;        // 未核对确认不允许滑走
    const card = document.querySelector('#qw99Deck .qw99-card3d');
    if (card) card.classList.add(dir < 0 ? 'fly-left' : 'fly-right');
    setTimeout(() => {
      r.i++;
      r.phase = 'front'; r.input = ''; r.lastOk = null;
      this._qw99SaveState(s);
      if (r.i >= r.queue.length) { this.qw99Finish(); return; }
      this._qw99Rerun();
      this._qw99FocusInput();
      setTimeout(() => { try { this.qw99Speak(); } catch (e) {} }, 250);   // 下一词自动朗读
    }, 320);
  },
  // 输入框聚焦（听写主路径：进卡即打字）
  _qw99FocusInput() {
    setTimeout(() => {
      try {
        const s = this._qw99State();
        if (!s.run || s.run.phase !== 'front') return;
        if (App.currentView !== 'workbench' || App._wbView !== 'study99') return;
        const el = document.getElementById('qw99Input');
        if (el) el.focus({ preventScroll: true });
      } catch (e) {}
    }, 120);
  },
  // 桌面键盘兼容（练习进行中：字母直达输入框 · Enter 提交 · Esc 暂停）
  _qw99WireKeys() {
    if (window.__qw99KeyWired) return;
    window.__qw99KeyWired = true;
    // 滑动手势（背面确认后左右滑切换下一张）
    let tsx = 0, tsy = 0, tst = 0;
    document.addEventListener('touchstart', (e) => {
      try {
        const s = App._qw99State();
        if (!s.run || App.currentView !== 'workbench' || App._wbView !== 'study99') return;
        if (!e.touches || !e.touches[0]) return;
        if (!(e.target && e.target.closest && e.target.closest('#qw99Deck'))) return;
        tsx = e.touches[0].clientX; tsy = e.touches[0].clientY; tst = Date.now();
      } catch (err) {}
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      try {
        const s = App._qw99State();
        if (!s.run || s.run.phase !== 'back' || !tst) return;
        if (App.currentView !== 'workbench' || App._wbView !== 'study99') return;
        const t = (e.changedTouches || [])[0];
        if (!t) return;
        const dx = t.clientX - tsx, dy = t.clientY - tsy;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          App.qw99Next(dx < 0 ? 1 : -1);
        }
        tst = 0;
      } catch (err) {}
    }, { passive: true });
    document.addEventListener('keydown', (e) => {
      try {
        const s = App._qw99State();
        if (!s.run || App.currentView !== 'workbench' || App._wbView !== 'study99') return;
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (document.activeElement && document.activeElement.id === 'qw99Input') return;   // 输入框自己处理
        const k = e.key;
        const r = s.run;
        if (r.phase === 'front' && /^[a-zA-Z]$/.test(k)) {
          e.preventDefault();
          r.input = (r.input || '') + k.toLowerCase();
          App._qw99SaveState(s);
          const el = document.getElementById('qw99Input');
          if (el) el.value = r.input;
        } else if (k === 'Backspace' && r.phase === 'front') {
          e.preventDefault();
          r.input = String(r.input || '').slice(0, -1);
          App._qw99SaveState(s);
          const el = document.getElementById('qw99Input');
          if (el) el.value = r.input;
        } else if (k === 'Enter') {
          e.preventDefault();
          if (r.phase === 'front') App.qw99Submit(); else App.qw99Next(1);
        } else if (k === 'Escape') {
          e.preventDefault();
          App.qw99Exit();
        }
      } catch (err) {}
    });
  },
  qw99Finish() {
    const s = this._qw99State();
    s.run = null;
    this._qw99SaveState(s);
    const t = this._qw99Today();
    // 习惯打卡联动：今日满 20 词 → 按时段自动学习卡打卡一次
    let synced = false;
    try {
      if (t.done >= 20) {
        const h = new Date().getHours();
        const card = h < 12 ? 'studyMorning' : (h < 18 ? 'studyNoon' : 'studyEvening');
        Store.habit99Check(Store.today(), card, { type: 'qw99背单词', words: t.done, autoBy: '背词完成' });
        synced = true;
      }
    } catch (e) {}
    this._modal('🎉 本轮背词完成', `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:44px">⌨️</div>
        <div style="font-size:15px;font-weight:800;color:#0f172a;margin-top:8px">今日已背 <b style="color:#059669">${t.done}</b> / 20 词 · 对 ${t.right} 错 ${t.wrong}</div>
        <div style="font-size:12.5px;color:#475569;margin-top:8px;line-height:1.8">
          ${t.done >= 20 ? '✅ 每日目标达成——已自动计入习惯打卡（学习卡）' : '还差 ' + (20 - t.done) + ' 词达成每日目标'}<br>
          到期复习词会按艾宾浩斯间隔自动排进下一轮
        </div>
      </div>`, [{ label: '好的', primary: true }]);
    this.render_workbench();
  },
  qw99Exit() {
    const s = this._qw99State();
    s.run = null;
    this._qw99SaveState(s);
    this._flash('⏸ 已暂停——进度已保存，随时回来接着背');
    this.render_workbench();
  },
  _qw99Rerun() {
    const el = document.getElementById('view-workbench');
    if (el && App.currentView === 'workbench' && App._wbView === 'study99') {
      try { App.render_workbench(); } catch (e) {}
    }
  },

  // ==================== 单词朗读（en-US · 全局 TTS 实例 · 禁浏览器 SpeechSynthesis）====================
  // 复用 95-native99.js 统一封装：真机走 @capacitor-community/text-to-speech（同一引擎实例，
  //   绝不重复新建）；引擎不可用/失败 → 友好提示一次（95 层会话去重），绝不弹插件报错弹窗。
  async qw99Speak() {
    const s = this._qw99State();
    const cur = s.run && s.run.queue[s.run.i];
    if (!cur) return;
    await this._tts99Speak(cur.w, {
      lang: 'en-US', rate: 0.8, pitch: 1.0,
      hint: '🔊 单词朗读走手机系统人声——在手机客户端可用',
    });
  },

  // ==================== 联动：问阿福（唤起管家讲释义/例句）====================
  qw99AskAfu() {
    const s = this._qw99State();
    const cur = s.run && s.run.queue[s.run.i];
    if (!cur) return;
    try {
      this.afuChatOpen();
      setTimeout(() => {
        try {
          const inp = document.getElementById('afuChatInput');
          if (inp) {
            inp.value = `给我讲讲这个单词：${cur.w}（${cur.m}）——释义、常见用法和一个例句`;
            this.afuChatSend();
          }
        } catch (e) {}
      }, 350);
    } catch (e) { this._flash('🤔 阿福正在别处忙——稍后再问'); }
  },
});
