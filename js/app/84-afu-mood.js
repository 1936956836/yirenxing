// 84-afu-mood.js —— v12.3 阿福心情观测：聊天发言 → 心情推理 → 每日报告
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   · 用户与阿福聊天时，每条发言即时经过本地心情引擎（关键词规则 + 强度词加权）
//   · 结果按日聚合存独立 localStorage 键 afu_mood_v1：条数 / 心情分布 / 高频词 / 发言摘录
//   · 报告数据【每日健康报告】新增「阿福心情观测」板块（心理医生视角的观察与评语）
//   · 引擎纯本地、零依赖：AI 通道关闭时照常工作（阿福的人设升级见 68-focus-notes.js）
// 定位：阿福是心理医生、是老师、是管家、是朋友、是亲人、是百科全书——
//       而观测，是每一位陪伴者的第一职责。
Object.assign(App, {
  _AFU99_MOOD_KEY: 'afu_mood_v1',
  _AFU99_MOOD_KEEP_DAYS: 90,

  // ==================== 心情词库（本地规则引擎）====================
  _afu99MoodDict() {
    return [
      { m: 'happy', ico: '😄', n: '开心',  ws: ['开心','高兴','快乐','兴奋','太好了','哈哈','棒','太棒了','喜欢','幸福','满意','顺利','好运','爽','舒服','笑死','有意思','好玩','不错','赞'] },
      { m: 'sad',   ico: '😢', n: '低落',  ws: ['难过','伤心','沮丧','失落','想哭','眼泪','悲伤','委屈','心疼','空虚','遗憾','可惜','emo','破防','心碎','哭'] },
      { m: 'anx',   ico: '😰', n: '焦虑',  ws: ['焦虑','紧张','害怕','担心','压力','慌','烦','不安','心慌','胡思乱想','怕','睡不着','忐忑','压力大'] },
      { m: 'angry', ico: '😤', n: '愤怒',  ws: ['生气','愤怒','气死','烦死','讨厌','受不了','火大','恼火','崩溃','崩了','爆炸','气人','无语'] },
      { m: 'tired', ico: '😪', n: '疲惫',  ws: ['累','疲惫','疲倦','困','没劲','无力','熬夜','失眠','好困','撑不住','耗尽','乏','提不起劲'] },
      { m: 'lonely',ico: '🫥', n: '孤独',  ws: ['孤独','一个人','没人陪','无人','寂寞','孤单','冷清','没人懂'] },
      { m: 'calm',  ico: '😌', n: '平静',  ws: ['平静','还行','一般','还好','安稳','淡定','慢慢来','无所谓','挺好','普通','正常'] },
    ];
  },

  // ==================== 单条文本分析：{ mood, ico, n, level, words } ====================
  _afu99MoodAnalyze(text) {
    const s = String(text || '');
    const hits = []; // { m, n, ico, cnt, words }
    this._afu99MoodDict().forEach(d => {
      const words = [];
      let cnt = 0;
      d.ws.forEach(w => { if (s.includes(w)) { cnt++; words.push(w); } });
      if (cnt) hits.push({ m: d.m, n: d.n, ico: d.ico, cnt, words });
    });
    if (!hits.length) return { mood: null, n: '未明', ico: '🤔', level: 0, words: [] };
    // 强度：命中类别数 + 强化词 + 长文本
    let boost = 0;
    ['非常','特别','超级','真的','好','太','特别地','巨','极其','十分'].forEach(w => { if (s.includes(w)) boost++; });
    hits.forEach(h => { boost += h.cnt - 1; });
    if (s.length > 80) boost++;
    const level = Math.max(1, Math.min(5, 1 + Math.floor(boost / 2)));
    // 主心情：按命中词数加权（负面优先记录——观测的谨慎原则）
    const neg = ['sad', 'anx', 'angry', 'tired', 'lonely'];
    hits.sort((a, b) => (neg.includes(b.m) ? b.cnt * 1.5 : b.cnt) - (neg.includes(a.m) ? a.cnt * 1.5 : a.cnt));
    const top = hits[0];
    return { mood: top.m, n: top.n, ico: top.ico, level, words: hits.reduce((x, h) => x.concat(h.words), []).slice(0, 8), all: hits.map(h => h.n) };
  },

  // ==================== 数据层（afu_mood_v1 独立键）====================
  _afu99MoodData() {
    try {
      const o = JSON.parse(localStorage.getItem(this._AFU99_MOOD_KEY) || '{}');
      return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
    } catch (e) { return {}; }
  },
  _afu99MoodSave(o) {
    try {
      // 只保留最近 90 天，防撑爆
      const keys = Object.keys(o);
      if (keys.length > this._AFU99_MOOD_KEEP_DAYS) {
        keys.sort().slice(0, keys.length - this._AFU99_MOOD_KEEP_DAYS).forEach(k => delete o[k]);
      }
      localStorage.setItem(this._AFU99_MOOD_KEY, JSON.stringify(o));
    } catch (e) {}
  },

  // 聊天发言记录（由 afuChatSend 调用）：分析 + 按日聚合
  _afu99MoodLog(text) {
    try {
      const a = this._afu99MoodAnalyze(text);
      const today = (typeof Store !== 'undefined' && Store.today) ? Store.today() : String(new Date().toISOString()).slice(0, 10);
      const o = this._afu99MoodData();
      const day = o[today] || { count: 0, moods: {}, keywords: {}, excerpts: [] };
      day.count++;
      if (a.mood) day.moods[a.mood] = (day.moods[a.mood] || 0) + 1;
      (a.words || []).forEach(w => { day.keywords[w] = (day.keywords[w] || 0) + 1; });
      if (day.excerpts.length < 3) day.excerpts.push(String(text).slice(0, 30) + (String(text).length > 30 ? '…' : ''));
      o[today] = day;
      this._afu99MoodSave(o);
      return a;
    } catch (e) { return null; }
  },

  // ==================== 日摘要（供报告数据读取）====================
  // 返回 { has, count, topMood {m,n,ico}, mix [{m,n,ico,cnt}], keywords [[词,次数]], excerpts [] } 或 { has:false }
  afuMoodSummary(dk) {
    const day = this._afu99MoodData()[dk || ((typeof Store !== 'undefined' && Store.today) ? Store.today() : '')];
    if (!day || !day.count) return { has: false };
    const dict = {};
    this._afu99MoodDict().forEach(d => { dict[d.m] = d; });
    const mix = Object.keys(day.moods || {}).map(m => ({
      m, n: (dict[m] || {}).n || m, ico: (dict[m] || {}).ico || '•', cnt: day.moods[m],
    })).sort((a, b) => b.cnt - a.cnt);
    const keywords = Object.keys(day.keywords || {}).map(k => [k, day.keywords[k]]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { has: true, count: day.count, topMood: mix[0] || null, mix, keywords, excerpts: day.excerpts || [] };
  },

  // ==================== 报告板块：阿福心情观测（心理医生视角）====================
  _rptAfuMoodSection(dk) {
    const s = this.afuMoodSummary(dk);
    if (!s.has) return '';
    const moodBar = s.mix.map(x => `
      <span class="am99-pill" style="--c:${this._afu99MoodColor(x.m)}">${x.ico} ${this.esc(x.n)} ×${x.cnt}</span>`).join('');
    const kwHtml = s.keywords.length
      ? `<div class="am99-kws">${s.keywords.map(([k, c]) => `<span class="am99-kw">${this.esc(k)}<i>${c}</i></span>`).join('')}</div>` : '';
    const exHtml = s.excerpts.length
      ? `<div class="am99-ex">「${s.excerpts.map(x => this.esc(x)).join('」「')}」</div>` : '';
    return `<div style="border-top:1px dashed #bae6fd;margin-top:12px;padding-top:12px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="font-weight:800;font-size:12.5px;color:#0c4a6e">🧠 阿福心情观测</div>
        <span style="font-size:10.5px;color:#0284c7">今日与阿福聊天 ${s.count} 次</span>
      </div>
      <div class="am99-bar">${moodBar}</div>
      ${kwHtml}
      ${exHtml}
      <div style="font-size:12px;color:#475569;line-height:1.8;margin-top:6px">${this._afu99AvatarHtml(16, 'pxafu-inline')}阿福观察：${this.esc(this._afu99MoodComment(s))}</div>
    </div>`;
  },

  // 观测评语（规则生成：主导心情 × 强度 × 混合度）
  _afu99MoodComment(s) {
    if (!s.has || !s.topMood) return '今天你还没怎么和阿福说话——想说的时候，我都在。';
    const M = {
      happy: ['今天的字里行间都是亮色，这份好心情记得分给明天的自己一点。',
              '情绪很好，好状态最怕「透支」——尽兴之余按时睡觉，让开心可持续。'],
      calm:  ['语气平稳，是一种「日子在正轨上」的平静——平稳本身就是很好的状态。',
              '没什么大起伏，平淡的日子里藏着坚持的力量。'],
      sad:   ['今天的情绪偏沉。难过不需要立刻被解决，先被看见就够——它已经被看见并记录下来了。',
              '低落的痕迹在字里都有。如果持续两周以上，别一个人扛，考虑找专业人士聊聊，那是勇敢不是软弱。'],
      anx:   ['焦虑的词汇今天出现得比较多。焦虑通常指向「还没发生的事」——写下来、拆小它，能驯服一大半。',
              '紧张感能听见。先把睡眠守住：焦虑在疲惫的大脑里会被放大数倍。'],
      angry: ['怒气值能感觉到。愤怒往往是「边界被越过」的信号——找到那条边界，比压住火更重要。',
              '气话里藏着在意。等浪头过去，值得回头看一眼真正让你在意的点。'],
      tired: ['疲惫写在了每一句话里。困了就早点睡——今天的待办，没有你的身体重要。',
              '精力账户余额不足。降低今天的标准不是认输，是止损。'],
      lonely:['今天的话语里有些孤单。一个人生活是选择，但孤独不必是标配——把想说的留下来，这里永远有人接着。',
              '独处的分量感在字里。孤独感持续且沉重时，主动约一个具体的人做一件具体的小事，比等待有效。'],
    }[s.topMood.m] || ['你的情绪我都记下了。'];
    let c = M[s.count % 2];
    // 混合情绪提示
    if (s.mix.length >= 3) c += '另外，今天的情绪不止一种——复杂的日子更要对自己温柔些。';
    return c;
  },

  _afu99MoodColor(m) {
    return ({ happy: '#16a34a', sad: '#3b82f6', anx: '#ca8a04', angry: '#dc2626', tired: '#7c3aed', lonely: '#64748b', calm: '#0891b2' })[m] || '#64748b';
  },
});
