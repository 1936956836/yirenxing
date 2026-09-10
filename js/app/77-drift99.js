// 77-drift99.js —— v12.0 【漂流】：烦恼封进漂流瓶，交给海（记录板块 · 释怀设计）
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   · 畅所欲言：这里只收烦恼与坏情绪——写下来那一刻，就轻了一半
//   · 封瓶即不见：装进漂流瓶后，内容连用户自己也看不到（b64 轻封存）——与憾潮的「可见可打」相反
//   · 漂流时长：1~100 天自选（滑杆 + 快捷档），最低 24 小时、最多 100 天，漂满才靠岸
//   · 随风而去：不装瓶的版本——写完即散、不留底稿（只记一笔次数，写本身就是放下）
//   · 海洋：内置生动大海美术卡——昼夜天光随北京时间流转、四层波浪滚动、漂流瓶浮沉、
//     已收集的海洋生物在浪里游、气泡上浮、浮标轻晃、星子/云/海鸥/月影按相位出现
//   · 打捞：随机捞起一只海洋生物（24 种 · 四档稀有度 · 纯情绪价值）或一个还在漂流的瓶子
//     （漂流期内的瓶可被打捞，但打捞后仍不可见内容；60 秒一网，节奏仪式感）
//   · 放生：还在漂流期的瓶子可放生——内容永远沉底删除，深海替你保管沉默
//   · 靠岸：漂满时长的瓶子自动靠岸，开不开由用户自己点（打开后随时可回看）
//   · 无压力：不催记录、不打分、不排行；数据存主存档 wbDrift99（活跃瓶上限 30）
Object.assign(App, {
  _dr99Days: 7,   // 当前选择的漂流天数（1~100）
  _dr99CD: 60,    // 打捞冷却秒数（海面平复时间）

  // ==================== 数据层（容错归一）====================
  _drift99Norm(d) {
    if (!d || typeof d !== 'object') return { bottles: [], creatures: {}, salvages: 0, lastSalvageTs: 0, discarded: 0 };
    if (!d.wbDrift99 || typeof d.wbDrift99 !== 'object' || Array.isArray(d.wbDrift99)) d.wbDrift99 = {};
    const o = d.wbDrift99;
    if (!Array.isArray(o.bottles)) o.bottles = [];
    if (!o.creatures || typeof o.creatures !== 'object' || Array.isArray(o.creatures)) o.creatures = {};
    if (typeof o.salvages !== 'number') o.salvages = 0;
    if (typeof o.lastSalvageTs !== 'number') o.lastSalvageTs = 0;
    if (typeof o.discarded !== 'number') o.discarded = 0;
    return o;
  },
  // 瓶子状态：漂流中（未放生且未到期）/ 已靠岸（未放生且到期）
  _dr99Drifting(b) { return !!b && !b.released && Date.now() < (b.endsAt || 0); },
  _dr99Ashore(b) { return !!b && !b.released && Date.now() >= (b.endsAt || 0); },
  _dr99RemainTxt(b) {
    const ms = (b.endsAt || 0) - Date.now();
    if (ms <= 0) return '已靠岸';
    const mins = Math.floor(ms / 60000);
    if (mins >= 2880) return '还要漂 ' + Math.ceil(mins / 1440) + ' 天';
    if (mins >= 60) return '还要漂 ' + Math.floor(mins / 60) + ' 小时';
    return '还要漂 ' + Math.max(1, mins) + ' 分钟';
  },
  _dr99Hash(s) { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; },

  // ==================== 封瓶轻编码（漂流期内渲染层不出现原文）====================
  _drift99Seal(t) {
    t = String(t || '');
    try {
      if (typeof btoa === 'function' && typeof unescape === 'function' && typeof encodeURIComponent === 'function')
        return 'b64:' + btoa(unescape(encodeURIComponent(t)));
    } catch (e) {}
    return 'raw:' + t;
  },
  _drift99Unseal(s) {
    s = String(s || '');
    if (s.indexOf('b64:') === 0) {
      try { return decodeURIComponent(escape(atob(s.slice(4)))); } catch (e) { return ''; }
    }
    return s.replace(/^raw:/, '');
  },

  // ==================== 漂流时长选择（不重渲染，保住输入框内容）====================
  drift99DaysPick(btn, v) {
    this._dr99Days = Math.min(100, Math.max(1, parseInt(v, 10) || 7));
    try {
      document.querySelectorAll('.dr99-day-chip').forEach(b => b.classList.toggle('on', parseInt(b.getAttribute('data-v'), 10) === this._dr99Days));
    } catch (e) {}
    const lbl = document.getElementById('dr99DaysLbl'); if (lbl) lbl.textContent = this._dr99Days + ' 天';
    const rg = document.getElementById('dr99Range'); if (rg) rg.value = this._dr99Days;
  },
  drift99DaysInput(el) {
    const v = Math.min(100, Math.max(1, parseInt(el && el.value, 10) || 7));
    this._dr99Days = v;
    const lbl = document.getElementById('dr99DaysLbl'); if (lbl) lbl.textContent = v + ' 天';
    try {
      document.querySelectorAll('.dr99-day-chip').forEach(b => b.classList.toggle('on', parseInt(b.getAttribute('data-v'), 10) === v));
    } catch (e) {}
  },

  // ==================== 写心事：封瓶 / 随风而去 ====================
  drift99Bottle() {
    const ta = document.getElementById('drift99Text');
    const text = ((ta && ta.value) || '').trim();
    if (!text) return this._flash('先把烦恼写下来——写出来，海就宽了一半 🌊');
    if (text.length > 2000) return this._flash('这瓶心事太重了（上限 2000 字）——拣最沉的那几句装吧');
    const d = Store.load();
    const o = this._drift99Norm(d);
    const active = o.bottles.filter(b => !b.released).length;
    if (active >= 30) return this._flash('海上已经有 30 个瓶子在漂了——等它们靠岸或放生几个，再装新的');
    let days = parseInt(this._dr99Days, 10);
    if (isNaN(days)) days = 7;
    days = Math.min(100, Math.max(1, days)); // 最低 24 小时，最多 100 天
    o.bottles.unshift({
      id: Store._id(), date: Store.today(), ts: new Date().toISOString(),
      days, endsAt: Date.now() + days * 86400000,
      seal: this._drift99Seal(text),
      released: false, releasedTs: '', opened: false, openedTs: '', salvages: 0,
    });
    Store.save(d);
    if (ta) ta.value = '';
    this._flash('🍾 心事已封进漂流瓶——从现在起 ' + days + ' 天里，你我都看不到它');
    this.render_workbench();
  },
  drift99Discard() {
    const ta = document.getElementById('drift99Text');
    const text = ((ta && ta.value) || '').trim();
    if (!text) return this._flash('先把它写下来——写完再决定装不装瓶 🌊');
    this._modal({
      title: '🍃 随风而去',
      body: '<div style="font-size:13px;color:#475569;line-height:1.9">不装进瓶子的话，这段文字将随海风散去——<b>不留底稿、无处寻回</b>。<br>不过写下来的那一刻，它最沉的部分已经卸下了。</div>',
      actions: [
        { label: '还是封进瓶吧', primary: true },
        { label: '让它去吧', onClick: () => {
            const d = Store.load();
            const o = this._drift99Norm(d);
            o.discarded = (o.discarded || 0) + 1;
            Store.save(d);
            const t2 = document.getElementById('drift99Text'); if (t2) t2.value = '';
            this._flash('🍃 海风带走了它——你看，轻了');
            this.render_workbench();
          } },
      ],
    });
  },

  // ==================== 打捞：随机捞起海洋生物 或 一个漂流中的瓶子 ====================
  // 生物图鉴（24 种 · 四档稀有度 · 纯情绪价值）：r 1常见/2少见/3稀有/4传说
  _drift99Creatures() {
    return [
      { id: 'clownfish', ico: '🐠', n: '小丑鱼',   r: 1, line: '它什么都怕，还是每天游出海葵看一看。' },
      { id: 'sardine',   ico: '🐟', n: '沙丁鱼',   r: 1, line: '单打独斗时是点心，抱团就是一整片银河。' },
      { id: 'hermit',    ico: '🦀', n: '寄居蟹',   r: 1, line: '房子是捡的，日子是自己的。' },
      { id: 'conch',     ico: '🐚', n: '海螺',     r: 1, line: '把它贴在耳边，能听到很远很远的海。' },
      { id: 'shrimp',    ico: '🦐', n: '樱花虾',   r: 1, line: '小有小的活法——它从不跟鲸鱼比个头。' },
      { id: 'puffer',    ico: '🐡', n: '气鼓鱼',   r: 1, line: '生闷气的时候会鼓成球——像极了你。' },
      { id: 'squid',     ico: '🦑', n: '小鱿鱼',   r: 1, line: '被吓到就喷一团墨——情绪总得有个出口。' },
      { id: 'coral',     ico: '🪸', n: '小珊瑚',   r: 1, line: '一年只长一厘米，它一点都不着急。' },
      { id: 'starfish',  ico: '⭐', n: '海星',     r: 1, line: '断掉的腕会自己长回来——你也会。' },
      { id: 'spray',     ico: '🌊', n: '浪花精',   r: 1, line: '它碎在礁石上，下一秒又聚成新的浪。' },
      { id: 'jelly',     ico: '🪼', n: '海月水母', r: 2, line: '没有心脏，也能在月光里浮浮沉沉。' },
      { id: 'turtle',    ico: '🐢', n: '小海龟',   r: 2, line: '一出生就往海里爬——没谁教它，它就是知道。' },
      { id: 'octo',      ico: '🐙', n: '章鱼先生', r: 2, line: '九个脑子各想各的，倒也活得挺明白。' },
      { id: 'seal',      ico: '🦭', n: '海豹',     r: 2, line: '晒太阳、打滚、什么都不干——这叫养生。' },
      { id: 'lobster',   ico: '🦞', n: '龙虾',     r: 2, line: '一辈子换很多次壳，每次都以为自己完了。' },
      { id: 'dolphin',   ico: '🐬', n: '近海海豚', r: 2, line: '它冲你跳了一下——没别的原因，就是高兴。' },
      { id: 'whale',     ico: '🐋', n: '座头鲸',   r: 3, line: '它的歌在海底能传一千公里——总有谁在听。' },
      { id: 'shark',     ico: '🦈', n: '鲸鲨',     r: 3, line: '海里最大的鱼，只吃最小的事。' },
      { id: 'mermaid',   ico: '🧜‍♀️', n: '月光人鱼', r: 3, line: '她朝你摆了摆尾——烦恼她会带去马里亚纳。' },
      { id: 'moai',      ico: '🗿', n: '深海石像', r: 3, line: '没人知道它怎么到的海底，它也不解释。' },
      { id: 'penguin',   ico: '🐧', n: '漂流企鹅', r: 3, line: '从南极一路漂过来的——人家是来旅游的。' },
      { id: 'dragon',    ico: '🐉', n: '东海龙',   r: 4, line: '龙说：这点心事，交给雨去下。' },
      { id: 'plesio',    ico: '🦕', n: '蛇颈龙',   r: 4, line: '它只是路过中生代——你的烦恼在它眼里是一瞬。' },
      { id: 'ghost',     ico: '👻', n: '深海小幽灵', r: 4, line: '它守着海底一万盏灯，其中一盏是你的。' },
    ];
  },
  _drift99Rarity() {
    return { 1: { n: '常见', w: 62 }, 2: { n: '少见', w: 25 }, 3: { n: '稀有', w: 10 }, 4: { n: '传说', w: 3 } };
  },
  _dr99RollCreature() {
    const roll = Math.random() * 100;
    let acc = 0, r = 4;
    for (const k of [1, 2, 3, 4]) { acc += this._drift99Rarity()[k].w; if (roll < acc) { r = k; break; } }
    const pool = this._drift99Creatures().filter(c => c.r === r);
    return pool[Math.floor(Math.random() * pool.length)];
  },
  // 打捞主入口（60 秒一网；有漂流瓶时 50% 捞到瓶，漂流期内的瓶可被打捞但内容不可见）
  drift99Salvage() {
    const d = Store.load();
    const o = this._drift99Norm(d);
    const now = Date.now();
    const cdMs = (this._dr99CD || 60) * 1000;
    if (o.lastSalvageTs && now - o.lastSalvageTs < cdMs) {
      const s = Math.ceil((cdMs - (now - o.lastSalvageTs)) / 1000);
      return this._flash(s >= 60 ? '🌊 海面还在平复——约 ' + Math.ceil(s / 60) + ' 分钟后再来' : '🌊 海面还在平复——' + s + ' 秒后再来');
    }
    o.lastSalvageTs = now;
    o.salvages = (o.salvages || 0) + 1;
    const drifting = o.bottles.filter(b => this._dr99Drifting(b));
    if (drifting.length && Math.random() < 0.5) {
      const b = drifting[Math.floor(Math.random() * drifting.length)];
      b.salvages = (b.salvages || 0) + 1;
      Store.save(d);
      const ago = Math.max(0, Math.round((now - (new Date(b.ts || '').getTime() || now)) / 86400000));
      this._modal({
        title: '🍾 打捞到一个漂流瓶',
        body: '<div style="text-align:center;padding:4px 2px">' + this._drift99BottleSvg()
          + '<div style="font-size:14.5px;font-weight:800;margin-top:8px">是 <span style="color:#0369a1">' + (ago <= 0 ? '今天' : ago + ' 天前') + '</span>的你抛出的</div>'
          + '<div style="font-size:12.5px;color:#64748b;margin-top:6px;line-height:1.9">还有 ' + this.esc(this._dr99RemainTxt(b)) + ' 才靠岸——瓶口封着，<b>漂流期内谁也看不到里面，包括你自己</b>。<br>放生 = 内容永远沉入深海，谁也再看不到。</div></div>',
        actions: [
          { label: '放回海洋', primary: true },
          { label: '🌊 放生它', onClick: () => this.drift99ReleaseDo(b.id) },
        ],
      });
    } else {
      const c = this._dr99RollCreature();
      o.creatures[c.id] = (o.creatures[c.id] || 0) + 1;
      Store.save(d);
      const n = o.creatures[c.id];
      const total = Object.keys(o.creatures).length;
      const rar = this._drift99Rarity()[c.r];
      this._modal({
        title: '🎣 打捞上来了——',
        body: '<div style="text-align:center;padding:4px 2px">'
          + '<div style="font-size:52px;line-height:1.15;filter:drop-shadow(0 6px 12px rgba(2,132,199,.3))">' + c.ico + '</div>'
          + '<div style="font-size:15px;font-weight:800;margin-top:8px">' + c.n + ' <span class="dr99-rar r' + c.r + '">' + rar.n + '</span></div>'
          + '<div style="font-size:13px;color:#64748b;margin-top:6px;line-height:1.9">' + c.line + '</div>'
          + '<div style="font-size:11.5px;color:#94a3b8;margin-top:8px">' + (n > 1 ? '第 ' + n + ' 次遇到它了——它好像认得你了' : '第一次遇到它') + ' · 图鉴 ' + total + '/24</div></div>',
        actions: [{ label: '收入图鉴', primary: true }],
      });
    }
  },

  // ==================== 放生（仅漂流期 · 内容永久沉底）====================
  drift99Release(id) {
    const d = Store.load();
    const o = this._drift99Norm(d);
    const b = (o.bottles || []).find(x => x.id === id);
    if (!b) return;
    if (!this._dr99Drifting(b)) return this._flash('它已不在漂流期——放生只属于还在漂的瓶子');
    this._modal({
      title: '🌊 放生这个瓶子？',
      body: '<div style="font-size:13px;color:#475569;line-height:1.9">放生后，这瓶心事将<b style="color:#0c4a6e">永远沉入深海</b>——包括你自己，都再也看不到它（内容会被彻底删除）。<br>海会替你保管沉默。</div>',
      actions: [
        { label: '再等等', primary: true },
        { label: '让它走吧', onClick: () => this.drift99ReleaseDo(id) },
      ],
    });
  },
  drift99ReleaseDo(id) {
    const d = Store.load();
    const o = this._drift99Norm(d);
    const b = (o.bottles || []).find(x => x.id === id);
    if (!b || b.released) return;
    b.released = true;
    b.releasedTs = new Date().toISOString();
    b.seal = ''; // 内容彻底删除——深海替你保管沉默
    Store.save(d);
    this._flash('🌊 它替你去了深海——愿你轻一点');
    this.render_workbench();
  },

  // ==================== 开瓶（仅靠岸后 · 开不开由用户自己点）====================
  drift99Open(id) {
    const d = Store.load();
    const o = this._drift99Norm(d);
    const b = (o.bottles || []).find(x => x.id === id);
    if (!b || b.released) return;
    if (Date.now() < (b.endsAt || 0)) return this._flash('它还在漂流——瓶子封着，还不到打开的时候 🌊');
    if (!b.opened) { b.opened = true; b.openedTs = new Date().toISOString(); Store.save(d); }
    this._modal({
      title: '🍾 漂了 ' + b.days + ' 天，靠岸了',
      body: '<div style="font-size:11.5px;color:#94a3b8;margin-bottom:8px">' + this.esc(b.date || '') + ' 抛出 · 漂流 ' + b.days + ' 天'
        + (b.salvages ? ' · 漂流中被你打捞过 ' + b.salvages + ' 次' : '') + '</div>'
        + '<div style="font-size:13.5px;color:#334155;line-height:2;white-space:pre-wrap">' + this.esc(this._drift99Unseal(b.seal)) + '</div>'
        + '<div style="margin-top:10px;font-size:11.5px;color:#94a3b8;line-height:1.7;border-top:1px dashed #e2e8f0;padding-top:8px">🌊 当时的你已经把这段心事托付给了海——现在的你只是来收个尾。</div>',
      actions: [{ label: '收下了', primary: true }],
    });
    this.render_workbench();
  },

  // ==================== 美术：漂流瓶单体（打捞弹窗用）====================
  _drift99BottleSvg() {
    return '<svg viewBox="0 0 60 92" style="width:54px;height:82px" xmlns="http://www.w3.org/2000/svg">'
      + '<rect x="24" y="4" width="12" height="10" rx="2.5" fill="#b45309"/>'
      + '<rect x="22" y="13" width="16" height="12" rx="3" fill="#bae6fd" stroke="#7dd3fc" stroke-width="1.5"/>'
      + '<rect x="13" y="24" width="34" height="56" rx="14" fill="rgba(224,242,254,.95)" stroke="#7dd3fc" stroke-width="2"/>'
      + '<rect x="20" y="36" width="20" height="34" rx="5" fill="#fef9c3" opacity=".95"/>'
      + '<rect x="23" y="42" width="14" height="2.5" rx="1.2" fill="#d6d2a4"/>'
      + '<rect x="23" y="49" width="11" height="2.5" rx="1.2" fill="#d6d2a4"/>'
      + '<rect x="23" y="56" width="13" height="2.5" rx="1.2" fill="#d6d2a4"/>'
      + '<rect x="17" y="28" width="6" height="46" rx="3" fill="#fff" opacity=".5"/>'
      + '</svg>';
  },

  // ==================== 美术：海洋场景（昼夜天光 + 四层波浪 + 瓶子浮沉 + 生物游动）====================
  _dr99Sky() {
    const hr = Store.beijingDate(Store.nowBeijing()).getHours();
    if (hr >= 5 && hr < 7) return { key: 'dawn', night: false, s1: '#fed7aa', s2: '#fecdd3', s3: '#fef3c7', orb: '#fb923c', ox: 640, oy: 84, glow: 'rgba(251,146,60,.55)', cloud: '#ffedd5' };
    if (hr >= 7 && hr < 17) return { key: 'day', night: false, s1: '#38bdf8', s2: '#7dd3fc', s3: '#e0f2fe', orb: '#fbbf24', ox: 640, oy: 68, glow: 'rgba(251,191,36,.5)', cloud: '#ffffff' };
    if (hr >= 17 && hr < 19) return { key: 'dusk', night: false, s1: '#7c3aed', s2: '#c084fc', s3: '#fda4af', orb: '#f97316', ox: 640, oy: 88, glow: 'rgba(249,115,22,.55)', cloud: '#e9d5ff' };
    return { key: 'night', night: true, s1: '#0f172a', s2: '#1e293b', s3: '#334155', orb: '#f1f5f9', ox: 640, oy: 64, glow: 'rgba(226,232,240,.4)', cloud: '#334155' };
  },
  // 图鉴里已收集的生物 → 场景里游（当日稳定挑 3 只）
  _dr99SceneCreatures(o, n) {
    const caught = this._drift99Creatures().filter(c => (o.creatures[c.id] || 0) > 0);
    if (!caught.length) return [];
    const seed = this._dr99Hash(Store.today() + '#dr99scene');
    const pool = caught.slice();
    const out = [];
    for (let i = 0; i < n && pool.length; i++) out.push(pool.splice((seed + i * 97) % pool.length, 1)[0]);
    return out;
  },
  _drift99Scene(o) {
    const sky = this._dr99Sky();
    const sea = {
      day:   ['#bae6fd', '#60a5fa', '#0284c7', '#075985'],
      dawn:  ['#b7c9ee', '#7b93d6', '#46589f', '#2c3a6b'],
      dusk:  ['#b9a7e8', '#8a76c9', '#5b4a9e', '#372a63'],
      night: ['#46536e', '#2f3a52', '#1c2436', '#0e1420'],
    }[sky.key];
    const foamC = { day: '#f0f9ff', dawn: '#eef2ff', dusk: '#ddd6fe', night: '#8fa3c4' }[sky.key];
    const wave = (y, a) => {
      let dd = 'M-400,' + y, up = true;
      for (let x = -400; x < 1400; x += 100) { dd += ' q50,' + (up ? -a : a) + ' 100,0'; up = !up; }
      return dd;
    };
    const layer = (cls, y, a, fill) => '<g class="' + cls + '"><path d="' + wave(y, a) + ' L1400,420 L-400,420 Z" fill="' + fill + '"/>'
      + (a >= 8 ? '<path d="' + wave(y, a) + '" fill="none" stroke="' + foamC + '" stroke-width="2.4" stroke-opacity=".5" stroke-linecap="round"/>' : '') + '</g>';
    // 星子（夜）
    let stars = '';
    if (sky.night) {
      const ST = [[60, 40, 1.4], [150, 88, 1], [240, 30, 1.6], [330, 64, 1.1], [420, 22, 1.4], [500, 76, 1], [560, 36, 1.5], [708, 52, 1.2], [760, 96, 1], [90, 120, 1.1], [280, 130, 1], [620, 26, 1.3], [372, 110, 1], [742, 30, 1.5]];
      stars = ST.map((s, i) => '<circle class="dr99-tw" style="animation-delay:-' + (i * 0.7 % 2.6) + 's" cx="' + s[0] + '" cy="' + s[1] + '" r="' + s[2] + '" fill="#f1f5f9"/>').join('');
    }
    // 云（白天/晨/昏）
    let clouds = '';
    if (!sky.night) {
      const CL = [[120, 60, -3], [340, 38, -7], [548, 96, 0]];
      clouds = CL.map(c => '<g transform="translate(' + c[0] + ',' + c[1] + ')"><g class="dr99-cloud" style="animation-delay:' + c[2] + 's" opacity=".85">'
        + '<ellipse cx="0" cy="0" rx="34" ry="13" fill="' + sky.cloud + '"/><ellipse cx="-22" cy="5" rx="20" ry="9" fill="' + sky.cloud + '"/><ellipse cx="22" cy="6" rx="24" ry="10" fill="' + sky.cloud + '"/>'
        + '</g></g>').join('');
    }
    // 海鸥（白天）
    let gulls = sky.key === 'day'
      ? '<g transform="translate(180,84)"><path class="dr99-cloud" d="M0,0 q7,-8 14,0 q7,-8 14,0" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round"/></g>'
        + '<g transform="translate(236,104)"><path class="dr99-cloud" style="animation-delay:-4s" d="M0,0 q6,-7 12,0 q6,-7 12,0" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round"/></g>'
      : '';
    // 月坑 / 星月倒影
    const craters = sky.night
      ? '<circle cx="' + (sky.ox - 8) + '" cy="' + (sky.oy - 6) + '" r="4" fill="#cbd5e1" opacity=".55"/><circle cx="' + (sky.ox + 8) + '" cy="' + (sky.oy + 4) + '" r="3" fill="#cbd5e1" opacity=".45"/><circle cx="' + (sky.ox) + '" cy="' + (sky.oy - 12) + '" r="2.2" fill="#cbd5e1" opacity=".4"/>' : '';
    const refl = sky.key === 'day' ? '' : '<path d="M' + (sky.ox - 16) + ',198 l10,3 -7,3 12,4 -9,3 13,4" stroke="' + sky.orb + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".3"/>';
    // 漂流瓶（最多显示 6 只，浮在 L2/L3 之间）
    const drifting = (o.bottles || []).filter(b => this._dr99Drifting(b));
    const BX = [136, 258, 380, 498, 612, 712], BY = [224, 276], BT = [-12, 8, -6, 11, -9, 5], BD = [0, -1.3, -2.2, -0.8, -1.9, -2.7];
    const bottles = drifting.slice(0, 6).map((b, i) => '<g transform="translate(' + BX[i % 6] + ',' + BY[i % 2] + ')"><g class="dr99-bob" style="--dr99-r:' + BT[i % 6] + 'deg;animation-delay:' + BD[i % 6] + 's">'
      + '<rect x="-4.5" y="-31" width="9" height="8" rx="2" fill="#b45309"/>'
      + '<rect x="-5" y="-24" width="10" height="7" rx="2" fill="#bae6fd" stroke="#7dd3fc" stroke-width="1"/>'
      + '<rect x="-10" y="-18" width="20" height="32" rx="8" fill="rgba(224,242,254,.93)" stroke="#7dd3fc" stroke-width="1.3"/>'
      + '<rect x="-6" y="-12" width="12" height="17" rx="3" fill="#fef9c3" opacity=".92"/>'
      + '<rect x="-7" y="-16" width="3.5" height="26" rx="1.8" fill="#fff" opacity=".5"/>'
      + '</g></g>').join('');
    // 已收集生物游过（最多 3 只）
    const CY = [306, 338, 366], CD = [26, 34, 30], CS = [24, 19, 21], CDL = [-5, -17, -11], CRev = [false, true, false];
    const cres = this._dr99SceneCreatures(o, 3).map((c, i) => '<g transform="translate(0,' + CY[i % 3] + ')"><text class="dr99-swim" style="animation-duration:' + CD[i % 3] + 's;animation-delay:' + CDL[i % 3] + 's' + (CRev[i % 3] ? ';animation-direction:reverse' : '') + '" font-size="' + CS[i % 3] + '">' + c.ico + '</text></g>').join('');
    // 气泡
    const BUB = [[180, 376, 3, 5, -1], [320, 382, 3.5, 5.5, -2.6], [452, 370, 2.4, 4.4, -0.5], [560, 384, 3, 6, -3.2], [680, 374, 2.6, 5, -1.8], [250, 388, 3.2, 4.8, -4]];
    const bubbles = BUB.map(bb => '<g transform="translate(' + bb[0] + ',' + bb[1] + ')"><circle class="dr99-bub" style="animation-duration:' + bb[3] + 's;animation-delay:' + bb[4] + 's" r="' + bb[2] + '" fill="none" stroke="' + foamC + '" stroke-opacity=".55" stroke-width="1.4"/></g>').join('');
    // 浮标
    const buoy = '<g transform="translate(74,246)"><g class="dr99-bob" style="--dr99-r:5deg;animation-delay:-2.4s">'
      + '<ellipse cx="0" cy="5" rx="15" ry="6" fill="#be123c"/><ellipse cx="0" cy="0" rx="15" ry="6" fill="#ef4444"/>'
      + '<rect x="-3" y="-12" width="6" height="9" rx="2" fill="#f8fafc"/><circle cx="0" cy="-15" r="3.6" fill="#fbbf24"/></g></g>';
    return '<svg viewBox="0 0 800 400" style="width:100%;height:auto;display:block" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="海洋">'
      + '<defs>'
      + '<linearGradient id="dr99SkyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky.s1 + '"/><stop offset=".55" stop-color="' + sky.s2 + '"/><stop offset="1" stop-color="' + sky.s3 + '"/></linearGradient>'
      + '<radialGradient id="dr99Glow"><stop offset="0" stop-color="' + sky.glow + '" stop-opacity=".9"/><stop offset="1" stop-color="' + sky.glow + '" stop-opacity="0"/></radialGradient>'
      + '</defs>'
      + '<rect x="0" y="0" width="800" height="190" fill="url(#dr99SkyG)"/>'
      + stars + clouds + gulls + refl
      + '<circle cx="' + sky.ox + '" cy="' + sky.oy + '" r="58" fill="url(#dr99Glow)"/>'
      + '<circle cx="' + sky.ox + '" cy="' + sky.oy + '" r="24" fill="' + sky.orb + '"/>' + craters
      + layer('dr99-w1', 185, 5, sea[0])
      + layer('dr99-w2', 232, 8, sea[1])
      + layer('dr99-w3', 286, 12, sea[2])
      + cres
      + bottles
      + layer('dr99-w4', 348, 15, sea[3])
      + bubbles + buoy
      + '</svg>';
  },

  // ==================== 页面：漂流 ====================
  _wbDrift99(wb, W) {
    const d = Store.load();
    const o = this._drift99Norm(d);
    const now = Date.now();
    const byTs = (a, b) => (b.ts || '').localeCompare(a.ts || '');
    const drifting = o.bottles.filter(b => this._dr99Drifting(b)).sort(byTs);
    const ashore = o.bottles.filter(b => this._dr99Ashore(b) && !b.opened).sort(byTs);
    const opened = o.bottles.filter(b => b.opened && !b.released).sort(byTs);
    const released = o.bottles.filter(b => b.released).sort(byTs);
    const cat = this._drift99Creatures();
    const caughtN = cat.filter(c => (o.creatures[c.id] || 0) > 0).length;
    const days = Math.min(100, Math.max(1, parseInt(this._dr99Days, 10) || 7));
    const cdMs = (this._dr99CD || 60) * 1000;
    const cooling = o.lastSalvageTs && now - o.lastSalvageTs < cdMs;

    // —— hero ——
    let html = `<div class="card dr99-hero">
      <div class="card-title"><span class="ico">🫙</span>漂流 · 把心事交给海</div>
      <div class="dr99-hero-sub">这里只收<b>烦恼与坏情绪</b>——畅所欲言，没人会看。写完两个去处：<b>🍾 封进漂流瓶</b>（封瓶后<b>连你自己也看不到</b>，漂满设定天数才靠岸，开不开再看）· <b>🍃 随风而去</b>（写完即散，不留痕迹）。与憾潮不同：这里不回看、不发泄——只是<b>交给海</b>。</div>
      <div class="dr99-stats">
        <span>🌊 漂流中 <b>${drifting.length}</b></span>
        <span>🏖️ 已靠岸 <b>${ashore.length}</b></span>
        <span>🔓 已打开 <b>${opened.length}</b></span>
        <span>🕯️ 已放生 <b>${released.length}</b></span>
        <span>🐚 图鉴 <b>${caughtN}/${cat.length}</b></span>
        <span>🍃 随风而去 <b>${o.discarded || 0}</b></span>
      </div>
    </div>`;

    // —— 海洋（美术卡 + 打捞）——
    html += `<div class="card dr99-ocean">
      <div class="card-title"><span class="ico">🌊</span>海洋 · 所有漂流瓶在这里漂泊
        <span class="sub" style="font-size:11px;color:#64748b;margin-left:6px">${drifting.length ? drifting.length + ' 个瓶子在漂' : '海面暂无漂流瓶'} · 天光随时辰流转</span>
      </div>
      <div class="dr99-scene">${this._drift99Scene(o)}</div>
      <div class="dr99-salvage-row">
        <button type="button" class="dr99-salvage" onclick="App.drift99Salvage()">🎣 打捞</button>
        <div class="dr99-cd">${cooling
          ? `海面平复中——${this._dr99CD || 60} 秒一网，稍等再来`
          : `随机捞起<b>海洋生物</b>（纯情绪价值）或一个<b>漂流中的瓶子</b>（捞上来也看不到内容）· ${this._dr99CD || 60} 秒一网`}</div>
      </div>
    </div>`;

    // —— 写心事 ——
    html += `<div class="ledger-form">
      <div class="card-title" style="padding:0;margin:0 0 12px"><span class="ico">🫙</span>写下来，交给海</div>
      <div class="dr99-note">烦恼写下来就轻了一半；剩下一半，交给海替你漂着。</div>
      <div class="field"><label>今天压在心口的事</label>
        <textarea id="drift99Text" class="textarea" style="min-height:110px" placeholder="烦、闷、堵、委屈、怕……什么都行——写出来那一刻，海就宽了"></textarea>
      </div>
      <div class="field"><label>漂流时长（封瓶后生效）：<b id="dr99DaysLbl" class="dr99-days-lbl">${days} 天</b><span class="dr99-days-cap">——封瓶后连你也看不到，漂满 ${days} 天靠岸</span></label>
        <div class="dr99-days-row">
          ${[1, 3, 7, 30, 100].map(v => `<button type="button" class="dr99-day-chip${days === v ? ' on' : ''}" data-v="${v}" onclick="App.drift99DaysPick(this,${v})">${v} 天</button>`).join('')}
          <input type="range" id="dr99Range" class="dr99-range" min="1" max="100" step="1" value="${days}" oninput="App.drift99DaysInput(this)">
        </div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" style="margin:0" onclick="App.drift99Bottle()">🍾 封进漂流瓶</button>
        <button type="button" class="btn btn-ghost" style="margin:0" onclick="App.drift99Discard()">🍃 随风而去</button>
      </div>
    </div>`;

    // —— 我的漂流瓶 ——
    const mine = drifting.length + ashore.length + opened.length;
    html += `<div class="section-label">我的漂流瓶 (${mine})</div>`;
    if (!mine) html += `<div class="empty">🌊 海上还没有你的瓶子——写一件心事，封进瓶里试试（也可以写完就让它随风而去）。</div>`;
    drifting.forEach(b => {
      html += `<div class="dr99-item drift">
        <div class="dr99-item-head">
          <span class="dr99-when">${this.esc(b.date || '')} 抛出 · 漂 ${b.days} 天</span>
          <span class="dr99-tag drift">🌊 漂流中</span>
          <span class="dr99-remain">${this.esc(this._dr99RemainTxt(b))}</span>
          <span class="dr99-ops"><button onclick="App.drift99Release('${b.id}')">🌊 放生</button></span>
        </div>
        <div class="dr99-sealed">🔒 心事封在瓶中——漂流期内谁也看不到（包括你自己）${b.salvages ? ' · 被打捞过 ' + b.salvages + ' 次' : ''}</div>
      </div>`;
    });
    ashore.forEach(b => {
      html += `<div class="dr99-item ashore">
        <div class="dr99-item-head">
          <span class="dr99-when">${this.esc(b.date || '')} 抛出 · 漂 ${b.days} 天</span>
          <span class="dr99-tag ashore">🏖️ 已靠岸</span>
          <span class="dr99-ops"><button onclick="App.drift99Open('${b.id}')">🍾 打开看看</button></span>
        </div>
        <div class="dr99-sealed">瓶塞还封着——它漂完了自己的一程，<b>开不开由你</b>（打开后随时可回看）</div>
      </div>`;
    });
    opened.forEach(b => {
      html += `<div class="dr99-item opened">
        <div class="dr99-item-head">
          <span class="dr99-when">${this.esc(b.date || '')} 抛出 · 漂 ${b.days} 天</span>
          <span class="dr99-tag opened">🔓 已打开</span>
        </div>
        <div class="dr99-item-text">${this.esc(this._drift99Unseal(b.seal))}</div>
      </div>`;
    });
    if (released.length) {
      html += `<details class="dr99-memorial"><summary>🕯️ 深海 · 已放生 ${released.length} 个瓶子（它们替你保管沉默）</summary>
        ${released.map(b => `<div class="dr99-mem-row">${this.esc(b.date || '')} 抛出 · 漂 ${b.days} 天 · 放生于 ${this.esc(String(b.releasedTs || '').slice(0, 10))} · 内容已永远沉底</div>`).join('')}
      </details>`;
    }

    // —— 海洋生物图鉴 ——
    const rar = this._drift99Rarity();
    html += `<div class="section-label">海洋生物图鉴 (${caughtN}/${cat.length})</div>
      <div class="dr99-cre-note">打捞随机获得——说白了就是一点情绪价值，没什么用（笑）。稀有度：<span class="dr99-rar r1">${rar[1].n}</span> <span class="dr99-rar r2">${rar[2].n}</span> <span class="dr99-rar r3">${rar[3].n}</span> <span class="dr99-rar r4">${rar[4].n}</span></div>
      <div class="dr99-cre-grid">`;
    cat.forEach(c => {
      const n = o.creatures[c.id] || 0;
      html += n
        ? `<div class="dr99-cre got r${c.r}" title="${this.esc(c.line)}"><div class="ico">${c.ico}</div><div class="n">${c.n}</div><div class="cnt">×${n}</div></div>`
        : `<div class="dr99-cre locked r${c.r}" title="还没遇到过"><div class="ico">❓</div><div class="n">？？</div><div class="cnt">${rar[c.r].n}</div></div>`;
    });
    html += `</div>`;

    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
});
