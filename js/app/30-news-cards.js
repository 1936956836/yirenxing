// 30-news-cards.js —— 消费建议科普 / 心理卡片 / 专升本考点（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G3-学习成长（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// v2026.0906 删除：renderFinanceNewsCard/refreshFinanceNews/_setFinanceTip（随旧完整账本删除）；
//              renderEnglishCard/nextEnglishWord、renderNewsCard/refreshNews/_setNewsTip（无调用方的死代码，且调用了不存在的 this.render()）。
Object.assign(App, {
  // ====== 消费建议 · 科学消费 / 警惕消费主义 科普文章（【数据中心 → 经济数据】消费建议卡，每日轮换，固定 20 篇）======
  renderFinanceArticle() {
    const arts = CONFIG.financeArticles || [];
    if (!arts.length) return '';
    // 按当日轮换：一年中的第几天 % 文库长度
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    let idx = dayOfYear % arts.length;
    if (this.finArtOffset == null) {
      this.finArtOffset = 0;
      try { this.finArtOffset = parseInt(localStorage.getItem('fin_art_offset') || '0', 10) || 0; } catch(e){}
    }
    idx = ((idx + this.finArtOffset) % arts.length + arts.length) % arts.length;
    const a = arts[idx];
    return `
      <div class="card finart-card">
        <div class="finart-head">
          <div class="finart-title"><span class="finart-ico">${a.icon}</span>${this.esc(a.title)}</div>
          <span class="finart-tag">${this.esc(a.tag)}</span>
        </div>
        <div class="finart-body">${this.esc(a.body)}</div>
        <div class="finart-foot">
          <span class="finart-stamp">📚 消费建议 · 第 ${idx + 1}/${arts.length} 篇 · 每日轮换</span>
          <span class="finart-nav">
            <button class="fab-quick" style="padding:4px 8px" onclick="App.nextFinanceArticle(-1)" title="上一篇">‹ 上一篇</button>
            <button class="fab-quick" style="padding:4px 8px" onclick="App.nextFinanceArticle(1)" title="下一篇">下一篇 ›</button>
          </span>
        </div>
      </div>
    `;
  },
  nextFinanceArticle(dir) {
    this.finArtOffset = (this.finArtOffset || 0) + dir;
    try { localStorage.setItem('fin_art_offset', String(this.finArtOffset)); } catch(e){}
    this.render_workbench();
  },
  // ====== 心理知识卡片（记录板块·日记，每日固定轮换）======
  renderPsychCard() {
    const cards = CONFIG.psychCards || [];
    if (!cards.length) return '';
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    let idx = dayOfYear % cards.length;
    if (this.psychOffset == null) {
      this.psychOffset = 0;
      try { this.psychOffset = parseInt(localStorage.getItem('psych_offset') || '0', 10) || 0; } catch(e){}
    }
    idx = ((idx + this.psychOffset) % cards.length + cards.length) % cards.length;
    const c = cards[idx];
    return `
      <div class="card psych-card">
        <div class="psych-head">
          <div class="psych-title"><span class="psych-ico">${c.icon}</span>${this.esc(c.title)}</div>
          <span class="psych-tag">${this.esc(c.tag)}</span>
        </div>
        <div class="psych-body">${this.esc(c.body)}</div>
        <div class="psych-foot">
          <span class="psych-stamp">🧠 今日心理学 · 第 ${idx + 1}/${cards.length} 张 · 每日轮换</span>
          <span class="psych-nav">
            <button class="fab-quick" style="padding:4px 8px" onclick="App.nextPsychCard(-1)" title="上一张">‹ 上一张</button>
            <button class="fab-quick" style="padding:4px 8px" onclick="App.nextPsychCard(1)" title="下一张">下一张 ›</button>
          </span>
        </div>
      </div>
    `;
  },
  nextPsychCard(dir) {
    this.psychOffset = (this.psychOffset || 0) + dir;
    try { localStorage.setItem('psych_offset', String(this.psychOffset)); } catch(e){}
    this.render_workbench();
  },
  // ====== 江西专升本 · 知识考点卡（学习板块，4 学科分组，每日轮换）======
  renderKnowledgeCards() {
    const KC = CONFIG.knowledgeCards || {};
    const subjects = ['英语', '高数', '政治', '计算机'];
    const subjIcon = { '英语': '📕', '高数': '📐', '政治': '📕', '计算机': '💻' };
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    if (this.kcOffset == null) {
      this.kcOffset = {};
      try { const raw = localStorage.getItem('kc_offset'); if (raw) this.kcOffset = JSON.parse(raw) || {}; } catch(e){}
    }
    const subjectIcons = { '英语': '🇬🇧', '高数': '➗', '政治': '🇨🇳', '计算机': '💻' };
    let html = `
      <div class="card kcard-wrap">
        <div class="card-title"><span class="ico">🎓</span>江西专升本 · 知识考点卡（每日轮换）</div>
        <div class="kcard-sub">按学科分组的高频 / 易错考点，点击"上一张/下一张"浏览全部；英语卡为语法点详解（非单词）</div>
    `;
    subjects.forEach(s => {
      const cards = KC[s] || [];
      if (!cards.length) return;
      let baseIdx = dayOfYear % cards.length;
      const off = this.kcOffset[s] || 0;
      const idx = ((baseIdx + off) % cards.length + cards.length) % cards.length;
      const c = cards[idx];
      html += `
        <div class="kcard-section">
          <div class="kcard-head">
            <div class="kcard-subj">${subjectIcons[s] || '📘'} ${s} <span class="kcard-freq ${c.freq === '必考' ? 'freq-must' : c.freq === '高频' ? 'freq-high' : c.freq === '易错' ? 'freq-err' : 'freq-mid'}">${this.esc(c.freq || '高频')}</span></div>
            <span class="kcard-nav">
              <button class="fab-quick" style="padding:4px 8px" onclick="App.nextKnowledgeCard('${s}',-1)" title="上一张">‹</button>
              <span class="kcard-idx">${idx + 1}/${cards.length}</span>
              <button class="fab-quick" style="padding:4px 8px" onclick="App.nextKnowledgeCard('${s}',1)" title="下一张">›</button>
            </span>
          </div>
          <div class="kcard-title"><span class="kcard-ico">${c.icon}</span>${this.esc(c.title)}</div>
          <div class="kcard-tag">${this.esc(c.tag)}</div>
          <ul class="kcard-points">
            ${c.points.map(p => `<li>${this.esc(p)}</li>`).join('')}
          </ul>
          <div class="kcard-tip">💡 ${this.esc(c.examTip)}</div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },
  nextKnowledgeCard(subject, dir) {
    if (this.kcOffset == null) this.kcOffset = {};
    this.kcOffset[subject] = (this.kcOffset[subject] || 0) + dir;
    try { localStorage.setItem('kc_offset', JSON.stringify(this.kcOffset)); } catch(e){}
    this.render_learning();
  },
  // v12.9.59 朗读英语单词（@capacitor-community/text-to-speech · 复用全局统一 TTS 实例）
  // 网页 speechSynthesis 在安卓 WebView 不存在（旧版弹「当前浏览器不支持语音朗读」）——
  //   真机一律走系统 TTS 引擎（95-native99.js 统一封装，朗读失败友好提示，不弹插件报错）。
  async speakWord(word) {
    if (!word) return;
    await this._tts99Speak(String(word), {
      lang: 'en-US', rate: 0.85, pitch: 1.0,
      hint: '🔊 单词朗读走手机系统人声——请在一人行手机客户端使用',
    });
  },

});
