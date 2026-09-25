// 80-mode99.js —— v12.1 【模式状态】：轻氧 / 聚神 / 归心（首页状态卡 + 灼麦金聚神模式 + 星空归心模式 + 白噪音引擎）
// [功能组] G6-专注模式（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   · 模式状态卡（首页）：三枚模式 chip——🌿 轻氧（默认：App 现有清爽渐变 UI）/ 🌾 聚神 / 🧘 归心
//   · 聚神模式：点击后整个 App 进入「灼麦金」单一色调的麦田场景——小麦在风中吹拂（前/后两排麦穗错拍摇摆、
//     光尘漂浮、麦浪渐层），聚神期间无法与 App 的任何功能交互（全屏覆盖锁定），唯一的出口是「回到轻氧」按钮；
//     时长自动联动【习惯 → 专注】记录（type:'jushen'，≥1 分钟计一次，与冥想/番茄同一本账）
//   · 归心模式：星空深色模式——整个 App 背景化作星空（42 颗星子闪烁 + 7 道流星不时划过），
//     顶栏月亮高悬 + 顶栏/底栏紫色填充，底栏萤火虫飞舞；界面固定在首页（navigate/gotoWb 一律拦下，
//     点「轻氧」随时回到日常）；进入时临时借用深色配色（不写 localStorage），退出还原用户原主题
//   · 白噪音引擎（Web Audio 全合成 · 零音频文件 · 零网络）：
//     冥想 = 雨天（白噪过滤成雨声 + 远处阵雨起伏 + 随机鸟啼三两声）；
//     番茄 = 篝火（棕噪隆隆底火 + 高频爆裂噼啪 + 山风掠过）；
//     声底叠加 40Hz 伽马波幅值调制（γ 波段与专注/平静相关，轻度共振引导）——白噪音由 App 现场合成，
//     冥想开始自动播放，界面上有开关随时关
Object.assign(App, {

  // ==================== 模式状态卡（首页）====================
  _mode99Info() {
    return {
      qingyang: { ico: '🌿', n: '轻氧模式', d: '默认 · 清爽渐变', hint: '现在的样子——轻氧常在，一切如常' },
      jushen:   { ico: '🌾', n: '聚神模式', d: '灼麦金 · 深度专注', hint: '三种聚神任选：原生麦田 / 运动（活力蓝）/ 学习（活力橙）' },
      guixin:   { ico: '🧘', n: '归心模式', d: '星空夜色 · 静守首页', hint: '整个 App 化作星空（流星·萤火虫·月亮），界面停在首页' },
    };
  },
  _mode99HomeCard() {
    const t = Store.focus99Today ? Store.focus99Today() : { medMin: 0, jushenMin: 0, pomoMin: 0 };
    const cur = this._mode99 || 'qingyang';
    const chip = (key) => {
      const m = this._mode99Info()[key];
      const on = cur === key;
      return `<button type="button" class="mode99-chip ${key}${on ? ' on' : ''}" onclick="App.mode99Pick('${key}', event)" title="${this.esc(m.hint)}">${m.ico} ${m.n}</button>`;
    };
    return `<div class="mode99-row">
      ${chip('qingyang')}${chip('jushen')}${chip('guixin')}
      <span class="mode99-stat">今日专注 ${t.medMin + t.jushenMin + t.pomoMin} 分</span>
    </div>`;
  },
  mode99Pick(key, ev) {
    if (key === 'qingyang') {
      if (this._mode99 === 'jushen') {
        // v12.9：聚神可能是麦田 / 运动进行页 / 学习进行页——逐一收尾
        if (this._sp99Ses) return this.sp99SesEndAsk();
        return this.mode99ExitJushen();
      }
      // v12.9.10 归心→轻氧：触点圆形揭示（氧气绿圆铺满 → 切换 → 淡出）
      if (this._mode99 === 'guixin') return this._mode99Reveal(ev, 'qingyang', () => this.mode99ExitGuixin());
      this._mode99 = 'qingyang';
      this._flash('🌿 已在轻氧模式——一切如常');
      this.render_dashboard && this.render_dashboard();
      return;
    }
    if (key === 'jushen') return this.mode99ShowJushenPicker();
    // v12.9.10 轻氧→归心：触点圆形揭示（星夜深色圆铺满 → 切换 → 淡出）
    if (key === 'guixin') return this._mode99Reveal(ev, 'guixin', () => this.mode99EnterGuixin());
  },
  // ==================== v12.9.10 模式切换圆形揭示过渡 ====================
  // 从用户触点为圆心撑成一个圆铺满全屏：颜色按目标模式（归心=星夜深 #0b0620 / 轻氧=氧气绿 #34d399）；
  // 半径 = 触点到页面最远角的距离；clip-path 纯裁切不缩放；圆铺满瞬间底层完成真实切换，随后圆淡出
  _mode99Reveal(ev, to, apply) {
    if (this._mode99Revealing) return;
    const W = window.innerWidth, H = window.innerHeight;
    const x = (ev && ev.clientX) || W / 2;
    const y = (ev && ev.clientY) || H / 2;
    const R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 4;
    const color = to === 'guixin' ? '#0b0620' : '#34d399';
    this._mode99Revealing = true;
    const div = document.createElement('div');
    div.className = 'mode99-reveal';
    div.style.setProperty('--mx', x + 'px');
    div.style.setProperty('--my', y + 'px');
    div.style.setProperty('--mr', R + 'px');
    div.style.background = color;
    (document.body || document.documentElement).appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('run')));
    setTimeout(() => {
      try { apply(); } catch (e) {}
      div.classList.add('fade');
      setTimeout(() => { try { div.remove(); } catch (e) {} this._mode99Revealing = false; }, 300);
    }, 500);
  },

  // ==================== v12.9 聚神选择弹窗：原生麦田 / 运动（活力蓝）/ 学习（活力橙）====================
  // focus: 'sport' | 'study' | undefined（运动数据页「聚神·运动」入口直达运动项并预选时长）
  mode99ShowJushenPicker(focus) {
    if (document.getElementById('sp99Ses')) { this._flash('⏱ 进行页已开着——先结束当前这一次'); return; }
    if (document.getElementById('mode99Jushen')) { this._flash('🌾 已在聚神麦田中——点「回到轻氧」退出'); return; }
    this._js99PickTarget = focus === 'sport' ? 'sport' : (focus === 'study' ? 'study' : '');
    const target = this._js99PickTarget || 'native';
    const durChips = (arr, kind, on) => `<div class="sp99-chips js99-durs" data-k="${kind}" style="${on ? '' : 'display:none'}">${arr.map(m => `<button type="button" class="sp99-chip${m === on ? ' on' : ''}" onclick="App._js99PickDur('${kind}',${m},this)">${m} 分钟</button>`).join('')}</div>`;
    const opt = (k, ico, n, d, grad) => `
      <button type="button" class="js99-opt" data-k="${k}" onclick="App._js99PickOpt('${k}',this)" style="${k === target ? 'border-color:' + grad : ''}">
        <span class="js99-opt-ico">${ico}</span>
        <span class="js99-opt-main"><b>${n}</b><i>${d}</i></span>
        <span class="js99-opt-go">›</span>
      </button>`;
    const body = `
      <div style="font-size:12.5px;color:#64748b;line-height:1.7;margin-bottom:10px">三种聚神，同一份专注——进入后全屏锁定（运动/学习进行页支持屏幕锁定与组间休息），唯一的出口是完成或「回到轻氧」。</div>
      <div class="js99-opts">
        ${opt('native', '🌾', '聚神 · 原生', '灼麦金麦田 · 此刻只此一事', '#b8922c')}
        ${opt('sport',  '🏃', '聚神 · 运动', '活力蓝 · 运动进行页（计时/热量/组数）', '#2F6BFF')}
        ${opt('study',  '📖', '聚神 · 学习', '活力橙 · 学习进行页（番茄式专注）', '#F97316')}
      </div>
      ${durChips([15, 30, 45, 60], 'sport', target === 'sport' ? 30 : 0)}
      ${durChips([15, 25, 45, 60], 'study', target === 'study' ? 25 : 0)}
      <div style="font-size:11.5px;color:#94a3b8;margin-top:10px">运动/学习需要先选目标时长（环形进度的分母）；结束后自动写入【数据中心 → 运动数据】。</div>`;
    this._modal({
      title: '🌾 聚神模式 · 选一种',
      body,
      actions: [
        { label: '取消' },
        {
          label: '进入聚神 ▸', primary: true, keep: false,
          onClick: () => {
            const k = this._js99PickOpt_ || target;
            const dur = this._js99PickDur_ || (k === 'sport' ? 30 : k === 'study' ? 25 : 0);
            if (k === 'native') return this.mode99EnterJushen();
            if (k === 'sport') { this.sp99StartSession('sport', dur); return; }
            if (k === 'study') { this.sp99StartSession('study', dur); return; }
          },
        },
      ],
    });
    // 默认选中项高亮
    this._js99PickOpt_ = target;
    this._js99PickDur_ = target === 'sport' ? 30 : target === 'study' ? 25 : 0;
  },
  _js99PickOpt(k, btn) {
    this._js99PickOpt_ = k;
    this._js99PickDur_ = k === 'sport' ? 30 : k === 'study' ? 25 : 0;
    try {
      document.querySelectorAll('.js99-opt').forEach(b => { b.style.borderColor = ''; b.style.background = ''; });
      const grads = { native: '#b8922c', sport: '#2F6BFF', study: '#F97316' };
      btn.style.borderColor = grads[k];
      btn.style.background = k === 'sport' ? '#F5F9FF' : k === 'study' ? '#FFF7EF' : '#FFFCF3';
      document.querySelectorAll('.js99-durs').forEach(d => { d.style.display = d.dataset.k === k ? '' : 'none'; });
      document.querySelectorAll('.js99-durs .sp99-chip').forEach(c => c.classList.remove('on'));
      const def = k === 'sport' ? '30' : k === 'study' ? '25' : '';
      if (def) {
        const chips = Array.from((document.querySelector('.js99-durs[data-k="' + k + '"]') || { children: [] }).children);
        chips.forEach(c => { if (String(c.textContent).trim().startsWith(def)) c.classList.add('on'); });
      }
    } catch (e) {}
  },
  _js99PickDur(kind, m, btn) {
    this._js99PickDur_ = m;
    try { document.querySelectorAll('.js99-durs .sp99-chip').forEach(c => c.classList.remove('on')); btn.classList.add('on'); } catch (e) {}
  },

  // ==================== 聚神模式：灼麦金麦田 ====================
  mode99EnterJushen() {
    if (document.getElementById('mode99Jushen')) return;
    try { if (this._closeModal) this._closeModal(); } catch (e) {} // 从专注选择弹窗进入时先合上弹窗
    this._mode99 = 'jushen';
    const t = Store.focus99Today ? Store.focus99Today() : {};
    const ov = document.createElement('div');
    ov.id = 'mode99Jushen';
    ov.className = 'js99-overlay';
    ov.innerHTML = `
      <div class="js99-sky"></div>
      <div class="js99-halo"></div>
      <div class="js99-top">
        <div class="js99-label">🌾 聚神模式</div>
        <div class="js99-hint">此刻，只此一事</div>
      </div>
      <div class="js99-sub" id="js99Sub">今日已聚神 ${t.jushenMin || 0} 分钟 · 结束后自动计入【专注】记录</div>
      <button type="button" class="js99-exit" onclick="App.mode99ExitJushen()">🌾 回到轻氧</button>
      <div class="js99-field">${this._mode99WheatField()}</div>`;
    document.body.appendChild(ov);
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
    // v12.5：窗口尺寸变化（旋转屏/拖宽浏览器）时按新宽高比重建麦田，穗头永远完整（防抖 250ms）
    this._js99OnResize = () => {
      clearTimeout(this._js99ResizeT);
      this._js99ResizeT = setTimeout(() => {
        const field = ov.querySelector('.js99-field');
        if (field) field.innerHTML = this._mode99WheatField();
      }, 250);
    };
    try { window.addEventListener('resize', this._js99OnResize); } catch (e) {}
    // v12.2：已删除聚神界面的跳动计时钟（时间压力与「此刻只此一事」相悖，违背无压力设计）——
    // 只留进入时间戳，退出时温和结算本次时长并计入专注账本
    this._js99Start = Date.now();
    // v12.9.59 聚神防切走（使用统计事件流轮询）已随自造插件下线——聚神/四魔玩法不受影响
  },
  mode99ExitJushen() {
    const ov = document.getElementById('mode99Jushen');
    if (!ov) return;
    try { if (this._js99OnResize) window.removeEventListener('resize', this._js99OnResize); } catch (e) {}
    this._js99OnResize = null;
    clearTimeout(this._js99ResizeT); this._js99ResizeT = null;
    ov.remove();
    try { document.body.style.overflow = ''; } catch (e) {}

    const doneMs = Date.now() - (this._js99Start || Date.now());
    this._js99Start = null;
    this._mode99 = 'qingyang';
    const min = Math.floor(doneMs / 60000);
    if (min >= 1) {
      Store.focus99Log('jushen', min, false);
      Store.habit99Check(Store.today(), 'focus', { type: 'jushen', durationMin: min });
      const t = Store.focus99Today();
      this._flash(`🌾 本次聚神 ${min} 分钟已计入专注记录（今日聚神共 ${t.jushenMin} 分钟）`);
    } else {
      this._flash('🌾 本次聚神不足 1 分钟，未记录——下次多待一会儿吧');
    }
    this._rerenderIfHabit && this._rerenderIfHabit();
    try { if (App.currentView === 'dashboard') App.render_dashboard(); } catch (e) {}
  },
  // ==================== 归心模式：星空深色 ====================
  // 星空 HTML：42 颗星子闪烁 + 7 道流星不时划过（随机位置/延迟/时长，纯 CSS 动画）
  // v12.7 极光：进入归心时约 1/3 概率出现——三条光带缓慢摇曳（_gx99AuroraOn 控制，退出重掷）
  _guixinSkyHtml() {
    const rnd = (seed) => { const x = Math.sin(seed * 91.7 + 47.3) * 8191.3; return x - Math.floor(x); };
    let stars = '';
    for (let i = 0; i < 42; i++) {
      const sz = (1 + rnd(i + 120) * 1.5).toFixed(1);
      stars += `<i class="gx99-star" style="left:${(rnd(i) * 100).toFixed(1)}%;top:${(rnd(i + 60) * 64).toFixed(1)}%;width:${sz}px;height:${sz}px;animation-delay:-${(rnd(i + 180) * 3).toFixed(1)}s;animation-duration:${(2 + rnd(i + 240) * 3.2).toFixed(1)}s"></i>`;
    }
    let meteors = '';
    for (let i = 0; i < 7; i++) {
      meteors += `<i class="gx99-meteor" style="left:${(14 + rnd(i + 300) * 80).toFixed(0)}%;top:${(rnd(i + 340) * 26).toFixed(0)}%;animation-delay:${(rnd(i + 380) * 16).toFixed(1)}s;animation-duration:${(5 + rnd(i + 420) * 4.5).toFixed(1)}s"></i>`;
    }
    let aurora = '';
    if (this._gx99AuroraOn) {
      aurora = `<i class="gx99-aurora" style="animation-duration:16s"></i>` +
        `<i class="gx99-aurora b" style="animation-duration:23s;animation-delay:-8s"></i>` +
        `<i class="gx99-aurora c" style="animation-duration:29s;animation-delay:-15s"></i>`;
    }
    return stars + meteors + aurora;
  },
  // 萤火虫 HTML：5 只，随机位置/节奏（飞舞 + 呼吸辉光）
  _guixinFliesHtml() {
    const rnd = (seed) => { const x = Math.sin(seed * 77.13 + 31.7) * 6151.9; return x - Math.floor(x); };
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += `<i class="gx99-fly" style="left:${(6 + rnd(i + 500) * 88).toFixed(0)}%;animation-delay:-${(rnd(i + 540) * 8).toFixed(1)}s;animation-duration:${(6.5 + rnd(i + 580) * 6).toFixed(1)}s"></i>`;
    }
    return html;
  },
  mode99EnterGuixin() {
    if (this._mode99 === 'guixin') return;
    try { if (this._closeModal) this._closeModal(); } catch (e) {}
    this._mode99 = 'guixin';
    // v12.7 极光掷骰：约 1/3 概率的夜晚有极光
    this._gx99AuroraOn = Math.random() < 0.34;
    // 记住用户主题 → 临时借用深色配色（复用全套深色适配；不写 localStorage，退出还原）
    this._gx99PrevTheme = (this._theme === 'dark') ? 'dark' : 'light';
    try { document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) {}
    try { document.body.classList.add('mode-guixin'); } catch (e) {}
    const body = document.body || document.documentElement;
    // 星空层（星子 + 流星 + 可能的极光，fixed 于内容之下）
    const sky = document.createElement('div');
    sky.id = 'guixinSky';
    sky.innerHTML = this._guixinSkyHtml();
    try { body.appendChild(sky); } catch (e) {}
    // v12.7b：月亮已按用户要求删除（曾与首页右上角阿福按钮重叠）
    // 底部萤火虫
    const flies = document.createElement('div');
    flies.id = 'guixinFireflies';
    flies.innerHTML = this._guixinFliesHtml();
    try { body.appendChild(flies); } catch (e) {}
    // 界面固定在首页
    if (this.currentView !== 'dashboard') {
      try { this.navigate('dashboard'); } catch (e) {}
    }
    this.render_dashboard && this.render_dashboard();
    this._flash('🌙 归心模式——星空陪你，界面停在首页；点「轻氧」随时回来');
  },
  mode99ExitGuixin() {
    this._mode99 = 'qingyang';
    // 还原用户原主题（归心只是借用，不改动 localStorage 里的偏好）
    try { document.documentElement.setAttribute('data-theme', this._gx99PrevTheme || 'light'); } catch (e) {}
    try { document.body.classList.remove('mode-guixin'); } catch (e) {}
    ['guixinSky', 'guixinFireflies'].forEach(id => {
      try { const el = document.getElementById(id); if (el && el.remove) el.remove(); } catch (e) {}
    });
    this._gx99PrevTheme = null;
    this._gx99AuroraOn = false;
    this.render_dashboard && this.render_dashboard();
    this._flash('🌿 回到轻氧——星星先收进抽屉了');
  },

  // 麦田 SVG：前后两排麦穗错拍摇摆 + 光尘漂浮 + 麦浪渐层
  // v12.5 修复「小麦形象未完全表现」：
  //   ① viewBox 宽度按视口宽高比动态扩展——slice 缩放永远以高度为基准，宽屏下穗头不再被顶部裁掉一截；
  //   ② 麦芒改为自穗身向上斜出（超出茎顶约 15 单位），符合真实小麦「穗顶带芒」的形象；
  //   ③ 麦粒 6 对 → 8 对（小穗更饱满），穗身占整株比例更真实；
  //   ④ 后排调暗成逆光剪影、前排麦粒提亮，与灼麦金背景拉开对比，前后层次分明；
  //   ⑤ 窗口尺寸变化时由 mode99EnterJushen 挂的 resize 监听重建麦田（见上）
  _mode99WheatField() {
    const rnd = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    // 动态 viewBox 宽度：保证 W/300 ≥ 容器宽高比 → slice 以高度撑满，垂直方向永远完整显示
    let W = 800;
    try {
      const cw = window.innerWidth || 800;
      const mobile = window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
      const ch = Math.min((window.innerHeight || 700) * (mobile ? 0.34 : 0.42), 340) || 300;
      const need = Math.ceil((cw / Math.max(ch, 1)) * 300);
      if (need > W) W = Math.min(need, 2600); // 上限防超宽屏把麦子拉得过疏
    } catch (e) {}
    const sx = W / 800; // 麦子水平铺排系数（viewBox 加宽后等比铺满）
    const stalk = (x, h, stem, grain, awn, amp, dur, delay, op) => `
      <g transform="translate(${x},300)">
        <g class="js99-wheat" style="--js99-a:${amp}deg;animation-duration:${dur}s;animation-delay:${delay}s;opacity:${op}">
          <path d="M0,2 C ${3},-${Math.round(h*.32)} -${3},-${Math.round(h*.66)} 0,-${h}" fill="none" stroke="${stem}" stroke-width="${h > 200 ? 3.4 : 2.6}" stroke-linecap="round"/>
          <path d="M0,-${Math.round(h*.42)} C -10,-${Math.round(h*.48)} -16,-${Math.round(h*.55)} -20,-${Math.round(h*.6)}" fill="none" stroke="${stem}" stroke-width="1.8" opacity=".75"/>
          <g>
            ${[0,1,2,3,4,5,6,7].map(i => {
              const gy = -(h - 6 - i * 9);
              return `<ellipse cx="-3.6" cy="${gy}" rx="4" ry="7" fill="${grain}" transform="rotate(-24 -3.6 ${gy})"/>
                      <ellipse cx="3.6" cy="${gy - 3}" rx="4" ry="7" fill="${grain}" transform="rotate(24 3.6 ${gy - 3})"/>`;
            }).join('')}
            ${[-18,-8,8,18].map(a => `<line x1="0" y1="-${h - 12}" x2="${a}" y2="-${h + 15}" stroke="${awn}" stroke-width="1" opacity=".85"/>`).join('')}
          </g>
        </g>
      </g>`;
    let back = '', front = '';
    const nBack = Math.max(30, Math.round(30 * sx)), nFront = Math.max(20, Math.round(20 * sx));
    for (let i = 0; i < nBack; i++) {
      const x = -20 * sx + i * ((850 * sx) / nBack) + rnd(i) * 14;
      back += stalk(x, 128 + Math.round(rnd(i + 40) * 56), '#6d5214', '#9c7425', '#57400e', (3 + rnd(i + 80) * 4).toFixed(1), (3.2 + rnd(i + 120) * 1.8).toFixed(2), (-rnd(i + 160) * 4).toFixed(2), .85);
    }
    for (let i = 0; i < nFront; i++) {
      const x = -30 * sx + i * ((890 * sx) / nFront) + rnd(i + 300) * 20;
      front += stalk(x, 196 + Math.round(rnd(i + 340) * 62), '#b8922c', '#eec268', '#7c5c14', (5 + rnd(i + 380) * 5).toFixed(1), (2.4 + rnd(i + 420) * 1.4).toFixed(2), (-rnd(i + 460) * 3).toFixed(2), 1);
    }
    const motes = [0, 1, 2, 3, 4, 5, 6, 7].map(i =>
      `<circle class="js99-mote" style="animation-delay:-${(rnd(i + 500) * 9).toFixed(1)}s;animation-duration:${(7 + rnd(i + 540) * 7).toFixed(1)}s" cx="${20 + rnd(i + 580) * (W - 40)}" cy="${60 + rnd(i + 620) * 200}" r="${1.6 + rnd(i + 660) * 1.8}" fill="#f4df9e"/>`).join('');
    return `<svg viewBox="0 0 ${W} 300" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="js99Ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8f6a1c" stop-opacity="0"/>
          <stop offset="1" stop-color="#6e4f13" stop-opacity=".85"/>
        </linearGradient>
      </defs>
      <rect x="0" y="250" width="${W}" height="50" fill="url(#js99Ground)"/>
      ${back}${motes}${front}
    </svg>`;
  },

});
