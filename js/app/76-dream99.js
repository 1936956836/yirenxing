// 76-dream99.js —— v11.9 【拾梦】：醒来速记梦境（记录板块 · 无压力设计）
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   · 语音速记：浏览器原生 SpeechRecognition（zh-CN 连续听写），说完直接保存；不支持的浏览器自动降级为纯文字
//   · 文字速记：敲几个字、一个画面、半句话都算——梦的碎片值得被接住
//   · 阿福引导：记录框上方每天换一个引导问题（日期做种子，当日稳定；可点「换一个」）
//   · 阿福整理成文：每条梦可点「整理成文」——AI 把碎碎念理成通顺短文并起小标题（原始速记永远保留可回看）
//   · 潜意识月报：攒够 3 个梦，阿福读最近 30 个梦，温柔复述反复出现的意象与情绪主题（不占卜、不诊断、只陪伴）
//   · 醒后黄金时段：北京时间 4:00–10:30 记录的梦盖「☀️ 醒后速记」小标（梦最清楚的头几分钟）
//   · 无压力：不要求天天记、没有连续天数、没有打卡；数据存主存档 wbDreams99（上限 500 条）
Object.assign(App, {
  _dm99Mood: 0,        // 正在记录的梦醒心情（1-5，0=未选）
  _dm99Lucid: false,   // 正在记录的梦是否清醒梦
  _dm99GuideOffset: 0, // 引导问题换一个的偏移
  _dm99Rec: null,      // 语音识别实例
  _dm99RecOn: false,   // 是否正在听

  // ==================== 引导问题（日期做种子，当日稳定）====================
  _dream99Prompts() {
    return [
      '梦的开头是什么？你睁眼时记得的第一个画面是——',
      '梦里你在哪里？有没有一个似曾相识的地方？',
      '梦里出现的人，现实中你多久没见过 TA 了？',
      '梦里的光是什么样的？白昼、黄昏，还是说不清的亮？',
      '有没有一句梦里的对话，现在还回响在耳边？',
      '梦里的你在跑、在飞、在游，还是站着不动？',
      '梦里最强烈的一秒是什么感觉？慌、甜、钝痛，还是空？',
      '梦里有没有反复出现的东西？（它上次出现是什么时候？）',
      '如果给这个梦配一种颜色，是什么颜色？',
      '梦的结尾怎么了？你是在哪里醒过来的？',
      '梦里有没有什么声音——音乐、雨声、有人喊你的名字？',
      '一半是梦、一半是想起来的？混在一起也没关系，都记下来。',
      '醒来的头一分钟，身体是什么感觉？沉、轻、麻，还是心跳很快？',
      '这个梦让你想起最近发生的什么事了吗？',
    ];
  },
  _dream99Guide() {
    const pool = this._dream99Prompts();
    let seed = 0; const dk = Store.today() + '#dream99';
    for (let i = 0; i < dk.length; i++) seed = (seed * 31 + dk.charCodeAt(i)) >>> 0;
    return pool[(seed + (this._dm99GuideOffset || 0)) % pool.length];
  },
  dream99GuideNext() {
    this._dm99GuideOffset = (this._dm99GuideOffset || 0) + 1;
    this.render_workbench();
  },

  // ==================== 梦醒心情 / 清醒梦 / 醒后黄金时段 ====================
  _dream99Moods() {
    return [
      { v: 1, ico: '🌫️', n: '说不清' },
      { v: 2, ico: '😨', n: '噩梦感' },
      { v: 3, ico: '😐', n: '平静' },
      { v: 4, ico: '🙂', n: '轻快' },
      { v: 5, ico: '🤩', n: '奇妙' },
    ];
  },
  _dream99MoodInfo(v) { return this._dream99Moods().find(m => m.v === v) || null; },
  dream99MoodPick(btn, v) {
    this._dm99Mood = (this._dm99Mood === v) ? 0 : v; // 再点一次取消
    document.querySelectorAll('.dm99-chip').forEach(b => b.classList.remove('on'));
    if (btn && this._dm99Mood) btn.classList.add('on');
  },
  dream99LucidToggle(btn) {
    this._dm99Lucid = !this._dm99Lucid;
    if (btn) btn.classList.toggle('on', this._dm99Lucid);
  },
  // 醒后黄金时段：北京时间 4:00–10:30（多数人的「梦还没化掉」窗口）
  _dream99WakeWindow() {
    try {
      const b = Store.beijingDate(Store.nowBeijing());
      const hm = b.getHours() * 60 + b.getMinutes();
      return hm >= 240 && hm <= 630;
    } catch (e) { return false; }
  },

  // ==================== 语音速记（浏览器原生 SpeechRecognition）====================
  _dream99SR() {
    try { return (typeof window !== 'undefined' && window) ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null; }
    catch (e) { return null; }
  },
  // 必须在用户点击事件栈内调用（浏览器安全策略）；再点一次停止
  _dream99Voice(btn) {
    const SR = this._dream99SR();
    if (!SR) return this._flash('此浏览器不支持语音识别（试试 Chrome / Edge / iOS Safari / 微信）——用键盘把梦敲下来也一样 🌙');
    if (this._dm99RecOn && this._dm99Rec) {
      this._dm99RecOn = false; // 先清标志再 stop，防 onend 里自动重启
      try { this._dm99Rec.stop(); } catch (e) {}
      return;
    }
    const ta = document.getElementById('dream99Text');
    if (!ta) return;
    let rec;
    try { rec = new SR(); } catch (e) { return this._flash('语音识别启动失败——试试刷新页面，或直接用文字记录 🌙'); }
    rec.lang = 'zh-CN';
    rec.continuous = true;
    rec.interimResults = true;
    this._dm99Rec = rec;
    this._dm99RecOn = true;
    const stat = (t) => { const el = document.getElementById('dream99VoiceStat'); if (el) el.textContent = t; if (btn) btn.classList.add('rec'); };
    const done = (t) => { const el = document.getElementById('dream99VoiceStat'); if (el) el.textContent = t || ''; if (btn) btn.classList.remove('rec'); };
    rec.onresult = (e) => {
      let fin = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript;
      }
      if (fin) {
        const cur = ta.value || '';
        ta.value = (cur && !/\s$/.test(cur) ? cur + ' ' : cur) + fin;
      }
      stat('🎧 正在听…' + (interim || '（把梦说出来就好）'));
    };
    rec.onerror = (e) => {
      const k = (e && e.error) || '';
      this._dm99RecOn = false;
      if (k === 'not-allowed' || k === 'service-not-allowed') this._flash('🎤 麦克风权限被拒绝了——浏览器地址栏 🔒 里允许麦克风后重试');
      else if (k === 'no-speech') this._flash('🎤 没听到声音——再点一次开始说');
      else if (k === 'network') this._flash('🎤 语音识别需要联网（离线时请用文字记录）');
      else if (k !== 'aborted') this._flash('🎤 语音识别开小差了（' + (k || '未知错误') + '）——已说的内容还在输入框里');
      done('🎤 语音已停止——点按钮继续，或直接保存');
    };
    rec.onend = () => {
      // 离开拾梦页（输入框没了）或用户已停止：彻底收工
      if (!this._dm99RecOn || !document.getElementById('dream99Text')) {
        this._dm99RecOn = false;
        done('🎤 语音速记已结束——内容都在输入框里，点「收进梦境本」保存');
        return;
      }
      try { rec.start(); return; } catch (e) {} // 静默期自动续听（Chrome 每段静音会自动停）
      this._dm99RecOn = false;
      done('🎤 语音速记已结束——点按钮继续，或直接保存');
    };
    try { rec.start(); } catch (e) { this._dm99RecOn = false; return this._flash('🎤 语音识别启动失败——再点一次试试'); }
    stat('🎧 正在听…把梦说出来，说完点「收进梦境本」');
  },

  // ==================== 保存 / 删除 ====================
  dream99Add() {
    const ta = document.getElementById('dream99Text');
    const text = ((ta && ta.value) || '').trim();
    if (!text) return this._flash('梦的内容不能为空——哪怕只记一个画面、半句话也好 🌙');
    // 保存时顺手停掉语音
    if (this._dm99RecOn && this._dm99Rec) { this._dm99RecOn = false; try { this._dm99Rec.stop(); } catch (e) {} }
    const d = Store.load();
    if (!Array.isArray(d.wbDreams99)) d.wbDreams99 = [];
    if (d.wbDreams99.length >= 500) return this._flash('梦境本已满（500 条）——清一清最旧的梦吧');
    const wake = this._dream99WakeWindow();
    d.wbDreams99.unshift({
      id: Store._id(), date: Store.today(), ts: new Date().toISOString(),
      title: '', raw: text, text,
      mood: this._dm99Mood || 0, lucid: !!this._dm99Lucid, wake,
      polished: false,
    });
    Store.save(d);
    this._dm99Mood = 0; this._dm99Lucid = false;
    this._flash(wake
      ? '☀️ 醒后速记收好了——趁梦还热乎，点「阿福 · 整理成文」让阿福帮你理顺'
      : '🌙 梦已收进梦境本——不记得的日子不用勉强，记得的日子才值得记录');
    this.render_workbench();
  },
  dream99Del(id) {
    if (!confirm('确认删除这个梦？（删了就找不回了）')) return;
    const d = Store.load();
    d.wbDreams99 = (d.wbDreams99 || []).filter(x => x.id !== id);
    Store.save(d);
    this._flash('🌱 梦已放归夜空');
    this.render_workbench();
  },

  // ==================== 阿福 AI：整理成文 / 潜意识月报（复用 v11.7 双通道）====================
  // 通用调用：返回 {ok:true,text} 或 {ok:false,why,?text(友好报错)}
  async _dream99AiCall(sysPrompt, userContent, maxTokens) {
    const st = this._afuAIState();
    if (!st.ok) return { ok: false, why: st.why };
    const cfg = st.cfg;
    let status = 0;
    try {
      const isWorker = cfg.mode === 'worker';
      const headers = { 'Content-Type': 'application/json' };
      if (!isWorker) headers['Authorization'] = 'Bearer ' + cfg.key;
      const url = isWorker ? this._afuAIEndpoint(cfg) : cfg.base.replace(/\/+$/, '') + '/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: isWorker ? 'glm-4-flash' : (cfg.model || 'deepseek-chat'),
          messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userContent }],
          temperature: 0.6,
          max_tokens: maxTokens || 800,
        }),
      });
      status = res.status;
      const j = await res.json().catch(() => ({}));
      const reply = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      if (!reply) throw new Error((j && j.error && (j.error.message || j.error.msg)) || ('HTTP ' + res.status));
      return { ok: true, text: reply.trim() };
    } catch (e) {
      // 原始报错只进控制台，用户看到的永远是友好中文（复用阿福报错分类）
      try { console.warn('[拾梦AI] 请求失败：', (e && e.message) || e, status ? 'HTTP ' + status : ''); } catch (_) {}
      return { ok: false, text: this._afu99ChatErr(e, status, cfg) };
    }
  },
  _dream99WhyText(why) {
    return {
      off: '⏸️ 管家阿福AI助手已关闭——打开阿福聊天面板 ⚙️ 里的【开启管家阿福AI助手】即可',
      key: '🔑 还未配置 AI——找阿福聊天的 ⚙️ 填入 API Key（智谱 glm-4-flash 免费）',
      worker: '🛠️ Worker 代理模式还没填地址——阿福聊天 ⚙️ 里配置你的 Worker 网址',
      file: '🔒 本地文件模式下 AI 不可用——部署到 https 或用直连模式即可',
    }[why] || '🌙 AI 暂时不可用';
  },
  // 整理成文：把碎碎念理成通顺短文 + 起小标题（原始速记 raw 永远保留）
  async dream99Polish(id) {
    const d = Store.load();
    const it = (d.wbDreams99 || []).find(x => x.id === id);
    if (!it) return;
    const btn = document.getElementById('dm99pb-' + id);
    if (btn) { btn.disabled = true; btn.textContent = '整理中…'; }
    const SYS = '你是「阿福」，一位温柔的梦境整理师。用户刚醒来，用碎片化的口语速记了一个梦。你的任务：'
      + '1) 把它整理成一段通顺、有画面感的短文（第一人称，保留用户记录的全部细节与意象，绝不添加没提到的情节）；'
      + '2) 起一个 10 字以内的小标题；3) 语气克制温柔，不做任何梦的解读与占卜。'
      + '只输出一个 JSON 对象：{"title":"小标题","text":"整理后的短文"}，不要输出任何其他文字。';
    const r = await this._dream99AiCall(SYS, '这是用户速记的梦（可能零碎、颠倒、口语化）：\n' + (it.raw || it.text || ''), 700);
    if (!r.ok) {
      if (btn) { btn.disabled = false; btn.textContent = '阿福 · 整理成文'; }
      return this._flash(r.why ? this._dream99WhyText(r.why) : r.text);
    }
    // 解析 JSON（容错：剥代码围栏 / 取第一个 {...} / 失败则整段当正文）
    let title = '', text = r.text;
    const m = r.text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const j = JSON.parse(m[0]);
        title = String(j.title || '').slice(0, 24).trim();
        text = String(j.text || r.text).trim();
      } catch (e) {}
    }
    it.title = title || it.title || '';
    it.text = text;
    it.polished = true;
    it.polishedTs = new Date().toISOString();
    Store.save(d);
    this._flash('🌙 阿福把这个梦轻轻理顺了——原始速记也替你留着');
    this.render_workbench();
  },
  // 潜意识月报：读最近 30 个梦，温柔复述反复出现的意象与情绪主题
  async dream99Report() {
    const d = Store.load();
    const all = (Array.isArray(d.wbDreams99) ? d.wbDreams99 : []).slice().sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    const recent = all.slice(0, 30);
    if (recent.length < 3) return this._flash('至少攒 3 个梦，阿福才能看出潜意识的纹路 🌙（现在有 ' + recent.length + ' 个）');
    this._modal({
      title: '🌙 阿福 · 潜意识月报',
      body: '<div style="text-align:center;padding:14px 6px;font-size:13.5px;color:#475569">🌙 阿福正在翻你的梦境本…</div>',
    });
    const SYS = '你是「阿福」，一位温柔的解梦陪伴者——像一位懂荣格的朋友，不是算命先生。用户会给你 TA 最近记录的一批梦。请：'
      + '1) 用 3~6 句话温柔地复述这些梦里反复出现的意象、情绪与主题（潜意识喜欢用重复说话）；'
      + '2) 给 1~2 句贴心的生活观察（基于梦境的情绪底色，如压力、向往、怀念——只描述，不诊断、不说教、不占卜）；'
      + '3) 结尾一句轻柔的祝福。语气像深夜替朋友守灯的人。直接输出正文，不要标题、不要 JSON。';
    const user = recent.map((x, i) => {
      const mo = this._dream99MoodInfo(x.mood);
      return (i + 1) + '. ' + x.date + (x.lucid ? '（清醒梦）' : '') + (mo ? '（醒时' + mo.ico + mo.n + '）' : '') + '：' + String(x.text || x.raw || '').slice(0, 300);
    }).join('\n');
    const r = await this._dream99AiCall(SYS, '以下是用户最近的梦境记录（新→旧）：\n' + user, 900);
    if (!r.ok) {
      return this._modal({
        title: '🌙 阿福 · 潜意识月报',
        body: '<div style="font-size:13px;color:#475569;line-height:1.8">' + this.esc(r.why ? this._dream99WhyText(r.why) : r.text) + '</div>',
        actions: [{ label: '知道了', primary: true }],
      });
    }
    this._modal({
      title: '🌙 潜意识月报 · 最近 ' + recent.length + ' 个梦',
      body: '<div style="font-size:13.5px;color:#334155;line-height:2;white-space:pre-wrap">' + this.esc(r.text) + '</div>'
        + '<div style="margin-top:10px;font-size:11.5px;color:#94a3b8;line-height:1.7;border-top:1px dashed #e2e8f0;padding-top:8px">🌙 月报由你配置的 AI 生成、每次现读现写（不落盘）；只描述意象与情绪，不构成任何诊断或占卜。</div>',
      actions: [{ label: '合上梦境本', primary: true }],
    });
  },

  // ==================== 页面：拾梦 ====================
  _wbDream99(wb, W) {
    const d = Store.load();
    const dreams = (Array.isArray(d.wbDreams99) ? d.wbDreams99 : []).slice().sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    const nowBJ = Store.beijingDate(Store.nowBeijing());
    const monthKey = nowBJ.getFullYear() + '-' + String(nowBJ.getMonth() + 1).padStart(2, '0');
    const monthN = dreams.filter(x => (x.date || '').startsWith(monthKey)).length;
    const wakeN = dreams.filter(x => x.wake).length;
    const lucidN = dreams.filter(x => x.lucid).length;
    const daySet = new Set(dreams.map(x => x.date).filter(Boolean));
    const inWin = this._dream99WakeWindow();
    const todayHas = dreams.some(x => x.date === Store.today());
    const srOK = !!this._dream99SR();
    const guide = this._dream99Guide();
    const moods = this._dream99Moods();
    const daysAgo = (x) => Math.max(0, Math.floor((Date.now() - new Date(x.ts || x.date).getTime()) / 86400000));

    // —— hero ——
    let html = `<div class="card dm99-hero${inWin ? ' dawn' : ''}">
      <div class="card-title"><span class="ico">🌙</span>拾梦 · 记下你的潜意识</div>
      <div class="dm99-hero-sub">梦是夜晚写给白天的信——<b>醒来头几分钟记得最清楚</b>：语音说一遍，或敲几个字都好（一个画面、半句话也算）。<b>不要求天天记、没有连续天数、没有打卡</b>；哪天不记得了，梦境本也一直开着。</div>
      ${inWin && !todayHas ? `<div class="dm99-wake-hint">☀️ 现在正是「醒后黄金时间」（北京时间 4:00–10:30）——梦的边缘还没化掉，先记下来再开始今天。</div>` : ''}
      <div class="dm99-stats">
        <span>🌙 累计 <b>${dreams.length}</b> 个梦</span>
        <span>📅 本月 <b>${monthN}</b> 个</span>
        <span>✏️ 覆盖 <b>${daySet.size}</b> 天</span>
        <span>☀️ 醒后速记 <b>${wakeN}</b></span>
        <span>🌀 清醒梦 <b>${lucidN}</b></span>
      </div>
    </div>`;

    // —— 记录表单 ——
    html += `<div class="ledger-form">
      <div class="card-title" style="padding:0;margin:0 0 12px"><span class="ico">🛏️</span>记一个刚醒的梦</div>
      <div class="dm99-guide">${this._afu99AvatarHtml(17, 'pxafu-inline')}<b>阿福的引导：</b>${this.esc(guide)} <button type="button" class="dm99-guide-next" onclick="App.dream99GuideNext()">换一个</button></div>
      <div class="field"><label>梦的内容（语音说出来 / 敲下来都好）</label>
        <textarea id="dream99Text" class="textarea" style="min-height:110px" placeholder="如：梦里在一条很长的走廊里跑，尽头是一扇亮着的窗……想到什么写什么，零碎也完全没关系"></textarea>
      </div>
      <div class="field"><label>梦醒心情（可不选）</label>
        <div class="dm99-chip-row">
          ${moods.map(m => `<button type="button" class="dm99-chip${this._dm99Mood === m.v ? ' on' : ''}" onclick="App.dream99MoodPick(this, ${m.v})"><span>${m.ico}</span>${m.n}</button>`).join('')}
          <button type="button" class="dm99-chip lucid${this._dm99Lucid ? ' on' : ''}" onclick="App.dream99LucidToggle(this)"><span>🌀</span>清醒梦</button>
        </div>
      </div>
      <div class="btn-row" style="align-items:center;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn dm99-voice" onclick="App._dream99Voice(this)">🎤 语音速记</button>
        <button type="button" class="btn btn-primary" style="margin:0" onclick="App.dream99Add()">🌙 收进梦境本</button>
        <span class="dm99-voice-cap">${srOK ? '🎤 长在听写：点一下开始，再点停止（说完点「收进梦境本」）' : '（当前浏览器不支持语音识别——用键盘敲下来也一样 🌙）'}</span>
      </div>
      <div class="dm99-voice-stat" id="dream99VoiceStat"></div>
    </div>`;

    // —— 潜意识回看 ——
    if (dreams.length) {
      const last30 = dreams.filter(x => (Date.now() - new Date(x.ts || x.date).getTime()) <= 30 * 86400000).length;
      html += `<div class="card" style="margin-bottom:14px">
        <div class="card-title"><span class="ico">🔮</span>潜意识回看
          <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">最近 30 天 ${last30} 个梦</span>
        </div>
        <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">攒够 <b>3 个梦</b>后，可以让阿福读一读你最近的梦——潜意识喜欢用重复说话：<b>反复出现的意象、情绪底色</b>，往往比单个梦更有意思（只陪伴描述，不占卜、不诊断）。</div>
        <div style="margin-top:10px">
          <button type="button" class="btn btn-primary btn-sm" style="margin:0${dreams.length < 3 ? ';opacity:.55' : ''}" onclick="App.dream99Report()">🌙 潜意识月报${dreams.length < 3 ? `（还差 ${3 - dreams.length} 个）` : ''}</button>
        </div>
      </div>`;
    }

    // —— 梦境本卡片流 ——
    html += `<div class="section-label">梦境本 (${dreams.length})</div>`;
    if (!dreams.length) html += `<div class="empty">🌙 还没有梦——今夜若有梦，醒来记得回来说给阿福听。</div>`;
    dreams.forEach(x => {
      const ago = daysAgo(x);
      const agoTxt = ago <= 0 ? '今天' : (ago === 1 ? '昨天' : ago + ' 天前');
      const mo = this._dream99MoodInfo(x.mood);
      html += `<div class="dm99-item${x.polished ? ' polished' : ''}">
        <div class="dm99-item-head">
          <span class="dm99-when">${this.esc(x.date || '')} · ${agoTxt}</span>
          ${x.wake ? '<span class="dm99-tag wake">☀️ 醒后速记</span>' : ''}
          ${x.lucid ? '<span class="dm99-tag lucid">🌀 清醒梦</span>' : ''}
          ${mo ? `<span class="dm99-tag">${mo.ico} ${mo.n}</span>` : ''}
          <span class="dm99-ops">
            <button id="dm99pb-${x.id}" title="阿福整理成文" onclick="App.dream99Polish('${x.id}')">${x.polished ? '↻ 再整理' : '阿福 · 整理成文'}</button>
            <button title="删除" onclick="App.dream99Del('${x.id}')">🗑️</button>
          </span>
        </div>
        ${x.title ? `<div class="dm99-item-title">${this.esc(x.title)}</div>` : ''}
        <div class="dm99-item-text">${this.esc(x.text || x.raw || '')}</div>
        ${x.polished && x.raw && x.raw !== x.text ? `<details class="dm99-raw"><summary>原始速记</summary><div>${this.esc(x.raw)}</div></details>` : ''}
      </div>`;
    });

    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
});
