// 104-cost99.js —— v12.9.49 【物品使用成本】把买过的东西算清楚（经济数据子功能）
// [功能组] G4-数据洞察（经济数据域 · 入口：数据中心 → 经济数据 → 物品使用成本卡片）
//
// 设计（用户规则 · v12.9.49）：
//   · 两种算法一键切换：按次（总价÷累计使用次数 · 偶尔用的东西）/ 按天（总价÷已使用天数 · 数码家具家电）
//   · 录入：名称 / 价格 / 购入日期 / 分类（数码·交通·家具·电器·服装·箱包·房产 + 自定义新增）/
//     状态（使用中 / 已闲置 / 已出售）/ 照片（压缩 base64）或内置分类像素图标
//   · 列表页：横向分类标签（可滑）+ 顶部当前分类合计每日成本 + 点卡片即打卡一次使用（按次模式）
//   · 统计页：两模式汇总卡（件数/总投入/平均成本）+ 分类金额占比横条 + 使用最多/陪伴最久洞察 + CSV 导出
//   · 存储：本地 localStorage 裸键 cost99（离线可用 · 自动随云存档同步多设备）
//   · 养成联动：新增物品 +1 经验；打卡使用 +1 经验 +1 宝石（rpg99 / 宠物钱包）
//   · 隐私弹窗：首次进入提示数据同步规则（可关云同步后仅本机）
Object.assign(App, {

  // ==================== 数据层 ====================
  COST99_CATS: ['数码产品', '交通', '家具', '电器', '服装', '箱包', '房产'],
  COST99_ICONS: {
    '数码产品': ['📱', '💻', '⌚', '🎧', '📷', '🎮', '🖥️', '🖱️'],
    '交通': ['🚲', '🛵', '🚗', '🏍️', '🚆', '🛴', '🚌', '🚲'],
    '家具': ['🛋️', '🪑', '🛏️', '🗄️', '🪞', '🪟', '🧺', '🚪'],
    '电器': ['❄️', '📺', '🍳', '💡', '🔧', '🧊', '🫖', '♨️'],
    '服装': ['👕', '👖', '👟', '🧥', '🧢', '🧣', '🧦', '👗'],
    '箱包': ['🎒', '👜', '🧳', '👝', '💼', '🛍️', '🌂', '👝'],
    '房产': ['🏠', '🏢', '🏘️', '🏡', '🏗️', '🔑', '🚪', '🪟'],
  },
  COST99_STATUS: [
    { k: 'use', n: '使用中', ico: '✅' },
    { k: 'idle', n: '已闲置', ico: '💤' },
    { k: 'sold', n: '已出售', ico: '💸' },
  ],
  _cost99Data() {
    try {
      const raw = localStorage.getItem('cost99');
      if (raw) {
        const d = JSON.parse(raw);
        return { items: Array.isArray(d.items) ? d.items : [], customs: Array.isArray(d.customs) ? d.customs : [], mode: d.mode === 'time' ? 'time' : 'count', seen: !!d.seen };
      }
    } catch (e) {}
    return { items: [], customs: [], mode: 'count', seen: false };
  },
  _cost99Save(d) { try { localStorage.setItem('cost99', JSON.stringify(d)); } catch (e) {} },
  _cost99AllCats() { return this.COST99_CATS.concat(this._cost99Data().customs); },
  // 已使用天数（购入日 → 今天；同日购入算 1 天）
  _cost99Days(dateStr) {
    try {
      const t = new Date(dateStr + 'T00:00:00');
      if (isNaN(t.getTime())) return 1;
      return Math.max(1, Math.round((new Date(Store.today() + 'T00:00:00') - t) / 86400000) + 1);
    } catch (e) { return 1; }
  },
  _cost99PerUse(it) { const u = Math.max(1, it.uses || 0); return (+it.price || 0) / u; },
  _cost99PerDay(it) { return (+it.price || 0) / this._cost99Days(it.date); },
  // 养成联动（v12.9.49）：新增/打卡物品 → 经验 + 宝石
  _cost99Award(exp, gems, why) {
    try {
      if (this._dev99) return;
      const r = this._rpg99Data();
      r.exp += (exp || 0);
      this._rpg99Save(r);
      if ((gems || 0) > 0 && this._pet99Data) {
        const p = this._pet99Data();
        p.points += gems;
        this._pet99Save(p);
      }
      this._flash(`🧾 物品使用成本：${why} —— 经验 +${exp}${gems ? ` · 宝石 +${gems}` : ''}`);
    } catch (e) {}
  },

  // ==================== 页面 ====================
  _wbCost99(wb, W) {
    const d = this._cost99Data();
    // 首次进入：隐私弹窗（同意后不再弹）
    if (!d.seen) {
      d.seen = true;
      this._cost99Save(d);
      setTimeout(() => this._cost99Privacy(), 100);
    }
    // 后台巡检：过期归档（囤货模块负责自己，这里无过期逻辑）+ 养成签到只在动作时触发
    const tab = this._cost99Tab || 'list';
    const cat = this._cost99Cat || '全部';
    const cats = ['全部'].concat(this._cost99AllCats());
    if (cats.indexOf(cat) === -1) this._cost99Cat = cat = '全部';
    const items = d.items.filter(it => cat === '全部' || it.cat === cat);
    // 列表数据准备
    const isActive = (st) => st === 'use';
    const actives = items.filter(it => isActive(it.status));
    const daySum = actives.reduce((a, it) => a + this._cost99PerDay(it), 0);
    const fmt = (v) => '¥' + (Math.round(v * 100) / 100).toFixed(2);
    // —— 顶部页头（v12.9.57 轻氧白绿 · 标题「用多久」）——
    let html = `<div class="eco99-page eco99-pg-green">
      <div class="eco99-subhero h-green">
        <div class="eco99-subhero-top">
          <div>
            <h2>⏳ 用多久</h2>
            <p>价格 ÷ 使用天数或次数，看清一件东西的真实成本——植物感的轻盈账，替你判断值不值得买。</p>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="App.navBack()">← 返回</button>
        </div>
        <div class="eco99-subhero-kpi">
          <span>${this.esc(cat)} 合计每日成本</span>
          <b>${fmt(daySum)}</b>
          <small>${actives.length} 件使用中 · ${items.length} 件收录 · 值不值，数字说了算</small>
        </div>
        <div class="cs99-mode">
          <button type="button" class="cs99-mode-btn${d.mode === 'count' ? ' on' : ''}" onclick="App._cost99SetMode('count')">🔢 按次数算<small>偶尔使用</small></button>
          <button type="button" class="cs99-mode-btn${d.mode === 'time' ? ' on' : ''}" onclick="App._cost99SetMode('time')">📅 按时间算<small>长期陪伴</small></button>
        </div>
      </div>
      <div class="cs99-cats">${cats.map(c => `<button type="button" class="cs99-cat${c === cat ? ' on' : ''}" onclick="App._cost99SetCat('${this.esc(c)}')">${this.esc(c)}</button>`).join('')}</div>`;
    // —— 底部 Tab：物品列表 / 统计 ——
    html += `<div class="cs99-tabs">
      <button type="button" class="cs99-tab${tab === 'list' ? ' on' : ''}" onclick="App._cost99SetTab('list')">📦 物品列表</button>
      <button type="button" class="cs99-tab${tab === 'stats' ? ' on' : ''}" onclick="App._cost99SetTab('stats')">📊 统计看板</button>
    </div>`;
    if (tab === 'stats') {
      html += this._cost99StatsView(d);
    } else {
      if (!items.length) {
        html += `<div class="empty" style="margin:18px 0">还没有收录物品——点右下角 ➕ 把买过的东西记进来</div>`;
      } else {
        html += items.map(it => this._cost99Card(it, d)).join('');
      }
    }
    html += `</div>
    <button type="button" class="cs99-fab" onclick="App._cost99Add()" aria-label="添加物品">＋</button>`;
    return html;
  },

  _cost99Card(it, d) {
    const days = this._cost99Days(it.date);
    const st = this.COST99_STATUS.find(s => s.k === it.status) || this.COST99_STATUS[0];
    const big = d.mode === 'count'
      ? ((it.uses || 0) > 0 ? `单次 ¥${(Math.round(this._cost99PerUse(it) * 100) / 100).toFixed(2)}` : '还没用过')
      : `每日 ¥${(Math.round(this._cost99PerDay(it) * 100) / 100).toFixed(2)}`;
    const media = it.photo
      ? `<img class="cs99-ico" src="${it.photo}" alt="">`
      : `<span class="cs99-ico emoji">${it.icon || '📦'}</span>`;
    return `<div class="cs99-item${it.status !== 'use' ? ' dim' : ''}">
      ${media}
      <div class="cs99-mid">
        <div class="cs99-name">${this.esc(it.name)}<span class="cs99-st st-${it.status}">${st.ico} ${st.n}</span></div>
        <div class="cs99-sub">${this.esc(it.cat)} · ¥${(+it.price || 0).toFixed(2)} · 已陪伴 ${days} 天${d.mode === 'count' ? ` · 用过 ${it.uses || 0} 次` : ''}</div>
      </div>
      <div class="cs99-right">
        <div class="cs99-big">${big}</div>
        <div class="cs99-acts">
          <button type="button" class="btn btn-ghost btn-sm" onclick="App._cost99Punch('${it.id}')">打卡</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="App._cost99Edit('${it.id}')">编辑</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="App._cost99Del('${it.id}')">删除</button>
        </div>
      </div>
    </div>`;
  },

  _cost99StatsView(d) {
    const fmt = (v) => '¥' + (Math.round(v * 100) / 100).toFixed(2);
    const items = d.items;
    const all = items.length;
    const total = items.reduce((a, it) => a + (+it.price || 0), 0);
    // 按次统计：只用「使用中/已闲置」且 uses>0 的
    const usedItems = items.filter(it => (it.uses || 0) > 0);
    const usedTotal = usedItems.reduce((a, it) => a + (+it.price || 0), 0);
    const avgUse = usedItems.length ? usedTotal / usedItems.reduce((a, it) => a + (it.uses || 0), 0) : 0;
    // 按天统计
    const timeItems = items.filter(it => it.status !== 'sold');
    const timeTotal = timeItems.reduce((a, it) => a + (+it.price || 0), 0);
    const dayAll = timeItems.reduce((a, it) => a + this._cost99Days(it.date), 0);
    const avgDay = timeItems.length ? timeTotal / Math.max(1, dayAll / timeItems.length) : 0;
    // 分类占比横条（按购买金额）
    const catAgg = {};
    items.forEach(it => {
      const c = it.cat || '其他';
      catAgg[c] = catAgg[c] || { n: 0, amt: 0 };
      catAgg[c].n++;
      catAgg[c].amt += (+it.price || 0);
    });
    const catList = Object.keys(catAgg).map(k => ({ k, ...catAgg[k] })).sort((a, b) => b.amt - a.amt);
    const catTotal = catList.reduce((a, c) => a + c.amt, 0) || 1;
    const COLORS = ['#f472b6', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#2dd4bf', '#f97316', '#94a3b8'];
    // 洞察：使用最多 / 陪伴最久
    const mostUsed = items.slice().sort((a, b) => (b.uses || 0) - (a.uses || 0))[0];
    const oldest = items.slice().sort((a, b) => this._cost99Days(b.date) - this._cost99Days(a.date))[0];
    return `
    <div class="cs99-stat-grid">
      <div class="cs99-stat-card">
        <div class="cs99-stat-t">🔢 按次计算</div>
        <div class="cs99-stat-kv"><span>物品件数</span><b>${usedItems.length}<i>/${all}</i></b></div>
        <div class="cs99-stat-kv"><span>累计投入</span><b>${fmt(usedTotal)}</b></div>
        <div class="cs99-stat-kv"><span>平均单次成本</span><b class="warm">${fmt(avgUse)}</b></div>
      </div>
      <div class="cs99-stat-card">
        <div class="cs99-stat-t">📅 按时间计算</div>
        <div class="cs99-stat-kv"><span>物品件数</span><b>${timeItems.length}<i>/${all}</i></b></div>
        <div class="cs99-stat-kv"><span>累计投入</span><b>${fmt(timeTotal)}</b></div>
        <div class="cs99-stat-kv"><span>平均每日成本</span><b class="warm">${fmt(timeItems.length ? timeTotal / timeItems.length / Math.max(1, Math.round(dayAll / timeItems.length)) : 0)}</b></div>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="card-title"><span class="ico">📈</span>物品分布 · 按购买金额占比</div>
      ${catList.length ? `
      <div class="cs99-bars">${catList.map((c, i) => `
        <div class="cs99-bar-row">
          <span class="cs99-bar-name">${this.esc(c.k)}</span>
          <div class="cs99-bar"><i style="width:${(c.amt / catTotal * 100).toFixed(1)}%;background:${COLORS[i % COLORS.length]}"></i></div>
          <span class="cs99-bar-amt">${c.n} 件 · ${fmt(c.amt)} · ${(c.amt / catTotal * 100).toFixed(0)}%</span>
        </div>`).join('')}</div>`
      : '<div class="empty">还没有数据——先添加物品</div>'}
    </div>
    <div class="cs99-stat-grid" style="margin-top:14px">
      <div class="cs99-stat-card">
        <div class="cs99-stat-t">🔥 使用最多</div>
        ${mostUsed && (mostUsed.uses || 0) > 0 ? `
          <div class="cs99-ins">${mostUsed.icon || '📦'} ${this.esc(mostUsed.name)}</div>
          <div class="cs99-ins-sub">用过 ${mostUsed.uses} 次 · 单次 ${fmt(this._cost99PerUse(mostUsed))}</div>`
        : '<div class="cs99-ins-sub">还没有打卡记录——点物品卡上的「打卡」</div>'}
      </div>
      <div class="cs99-stat-card">
        <div class="cs99-stat-t">🕰️ 陪伴最久</div>
        ${oldest ? `
          <div class="cs99-ins">${oldest.icon || '📦'} ${this.esc(oldest.name)}</div>
          <div class="cs99-ins-sub">已陪伴 ${this._cost99Days(oldest.date)} 天 · 每日 ${fmt(this._cost99PerDay(oldest))}</div>`
        : '<div class="cs99-ins-sub">还没有收录物品</div>'}
      </div>
    </div>
    <div style="margin-top:14px;text-align:center">
      <button type="button" class="btn btn-primary" onclick="App._cost99Export()">📤 导出 CSV 备份</button>
    </div>`;
  },

  // ==================== 交互 ====================
  _cost99SetMode(m) { const d = this._cost99Data(); d.mode = m; this._cost99Save(d); this._sfx99('tap'); this.render_workbench(); },
  _cost99SetCat(c) { this._cost99Cat = c; this._sfx99('tap'); this.render_workbench(); },
  _cost99SetTab(t) { this._cost99Tab = t; this._sfx99('tap'); this.render_workbench(); },

  _cost99Punch(id) {
    const d = this._cost99Data();
    const it = d.items.find(x => x.id === id);
    if (!it) return;
    if (d.mode === 'time') { this._sfx99('back'); this._flash('📅 按时间模式无需打卡——已使用天数按购入日期自动实时计算'); return; }
    it.uses = (it.uses || 0) + 1;
    this._cost99Save(d);
    this._sfx99('cheer');
    this._flash(`✅ 已记录一次使用——「${it.name}」单次成本降到 ¥${(Math.round(this._cost99PerUse(it) * 100) / 100).toFixed(2)}`);
    this._cost99Award(1, 1, '打卡物品使用');
    this.render_workbench();
  },

  _cost99Add() {
    this._cost99EditId = null;   // 新增态（编辑流程在 _cost99Edit 里回填 id）
    this._cost99Photo = null;
    const d = this._cost99Data();
    const cats = this._cost99AllCats();
    this._modal('🧾 添加物品', `
      <div class="cs99-form">
        <div class="cs99-f-row">
          <label>物品名称 *</label>
          <input id="cs99-name" type="text" maxlength="30" placeholder="如：iPad Air / 羽毛球拍">
        </div>
        <div class="cs99-f-2col">
          <div class="cs99-f-row"><label>购入价格（¥）</label><input id="cs99-price" type="number" inputmode="decimal" min="0" placeholder="0.00"></div>
          <div class="cs99-f-row"><label>购入日期</label><input id="cs99-date" type="date" value="${Store.today()}"></div>
        </div>
        <div class="cs99-f-row">
          <label>物品分类 <button type="button" class="btn btn-ghost btn-sm" style="margin-left:8px" onclick="App._cost99AddCat()">＋ 自定义分类</button></label>
          <div class="cs99-sel-cats" id="cs99-cats">${cats.map((c, i) => `<button type="button" class="cs99-sel-cat${i === 0 ? ' on' : ''}" data-cat="${this.esc(c)}">${this.esc(c)}</button>`).join('')}</div>
        </div>
        <div class="cs99-f-row">
          <label>物品状态</label>
          <div class="cs99-sel-cats" id="cs99-sts">${this.COST99_STATUS.map((s, i) => `<button type="button" class="cs99-sel-cat${i === 0 ? ' on' : ''}" data-st="${s.k}">${s.ico} ${s.n}</button>`).join('')}</div>
        </div>
        <div class="cs99-f-row">
          <label>图片 / 图标</label>
          <div class="cs99-pick-tabs">
            <button type="button" class="cs99-pick-tab on" data-pt="icon" onclick="App._cost99PickTab(this,'icon')">🎨 选择图标</button>
            <button type="button" class="cs99-pick-tab" data-pt="photo" onclick="App._cost99PickTab(this,'photo')">📷 上传照片</button>
          </div>
          <div id="cs99-iconpick">${this._cost99IconPicker(cats[0])}</div>
          <div id="cs99-photopick" style="display:none">
            <input type="file" id="cs99-photo" accept="image/*" style="font-size:12px" onchange="App._cost99PhotoPick(this)">
            <div id="cs99-photo-pv" style="margin-top:8px"></div>
          </div>
        </div>
      </div>`,
      [
        { label: '完成保存', primary: true, onClick: () => this._cost99SaveItem(null) },
        { label: '取消' },
      ]);
    // 分类/图标联动
    setTimeout(() => {
      const catBox = document.getElementById('cs99-cats');
      if (catBox) catBox.querySelectorAll('.cs99-sel-cat').forEach(b => b.addEventListener('click', () => {
        catBox.querySelectorAll('.cs99-sel-cat').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        const ip = document.getElementById('cs99-iconpick');
        if (ip) ip.innerHTML = this._cost99IconPicker(b.dataset.cat);
      }));
      const stBox = document.getElementById('cs99-sts');
      if (stBox) stBox.querySelectorAll('.cs99-sel-cat').forEach(b => b.addEventListener('click', () => {
        stBox.querySelectorAll('.cs99-sel-cat').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
      }));
      const ip = document.getElementById('cs99-iconpick');
      if (ip) ip.querySelectorAll('.cs99-ic').forEach(b => b.addEventListener('click', () => {
        ip.querySelectorAll('.cs99-ic').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
      }));
    }, 50);
  },

  _cost99IconPicker(cat) {
    const icons = this.COST99_ICONS[cat] || ['📦', '⭐', '🎁', '🏷️', '🧸', '🔑'];
    return `<div class="cs99-icons">${icons.map((ic, i) => `<button type="button" class="cs99-ic${i === 0 ? ' on' : ''}" data-ic="${ic}">${ic}</button>`).join('')}
      <button type="button" class="cs99-ic" data-ic="⭐">⭐</button><button type="button" class="cs99-ic" data-ic="📦">📦</button></div>`;
  },

  _cost99PickTab(btn, which) {
    try {
      btn.parentElement.querySelectorAll('.cs99-pick-tab').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      document.getElementById('cs99-iconpick').style.display = which === 'icon' ? '' : 'none';
      document.getElementById('cs99-photopick').style.display = which === 'photo' ? '' : 'none';
    } catch (e) {}
  },

  _cost99PhotoPick(input) {
    const f = input && input.files && input.files[0];
    if (!f) return;
    // 压缩：最长边 320px · JPEG 0.7（裸键会随云存档同步，控制体积）
    const rd = new FileReader();
    rd.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          const scale = Math.min(1, 320 / Math.max(img.width, img.height));
          cv.width = Math.round(img.width * scale);
          cv.height = Math.round(img.height * scale);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          const data = cv.toDataURL('image/jpeg', 0.7);
          this._cost99Photo = data;
          const pv = document.getElementById('cs99-photo-pv');
          if (pv) pv.innerHTML = `<img src="${data}" style="width:86px;height:86px;object-fit:cover;border-radius:12px;border:2px solid #fbcfe8">`;
        } catch (err) { this._flash('⚠️ 这张图处理不了，换一张试试'); }
      };
      img.src = e.target.result;
    };
    rd.readAsDataURL(f);
  },

  _cost99AddCat() {
    const d = this._cost99Data();
    this._modal('🎨 新增自定义分类', `
      <div style="font-size:13px;color:#475569;line-height:1.9">
        分类名：<input id="cs99-newcat" type="text" maxlength="8" placeholder="如：运动装备" style="width:60%">
        <div style="margin-top:10px;font-size:12px;color:#94a3b8">图标从该分类的默认图标库选（保存后在添加页可选）</div>
      </div>`,
      [{ label: '添加', primary: true, onClick: () => {
          const v = (document.getElementById('cs99-newcat').value || '').trim();
          if (!v) { this._flash('❌ 分类名不能为空'); return; }
          if (this._cost99AllCats().indexOf(v) !== -1) { this._flash('❌ 这个分类已经存在啦'); return; }
          d.customs.push(v);
          this.COST99_ICONS[v] = ['⭐', '🎁', '🏷️', '🧸', '🛠️', '🎽'];
          this._cost99Save(d);
          this._flash('✅ 分类「' + v + '」已添加');
          setTimeout(() => this._cost99Add(), 60);
        } }, { label: '取消' }]);
  },

  _cost99SaveItem(passedId) {
    const editId = passedId || this._cost99EditId;
    const name = (document.getElementById('cs99-name').value || '').trim();
    if (!name) { this._sfx99('fail'); this._flash('❌ 物品名称必填'); return; }
    const price = Math.max(0, +document.getElementById('cs99-price').value || 0);
    const date = document.getElementById('cs99-date').value || Store.today();
    const catEl = document.querySelector('#cs99-cats .cs99-sel-cat.on');
    const stEl = document.querySelector('#cs99-sts .cs99-sel-cat.on');
    const cat = catEl ? catEl.dataset.cat : this._cost99AllCats()[0];
    const status = stEl ? stEl.dataset.st : 'use';
    // 图标 / 照片二选一（当前显示的 Tab 为准）
    const iconOn = document.getElementById('cs99-iconpick') && document.getElementById('cs99-iconpick').style.display !== 'none';
    const icEl = document.querySelector('#cs99-iconpick .cs99-ic.on');
    const d = this._cost99Data();
    const item = {
      id: editId || ('c' + Date.now().toString(36)),
      name, price, date, cat, status,
      icon: icEl ? icEl.dataset.ic : '⭐',
      photo: !iconOn ? (this._cost99Photo || '') : '',
      uses: 0, created: Date.now(),
    };
    if (editId) {
      const old = d.items.find(x => x.id === editId);
      if (old) { item.uses = old.uses; item.created = old.created; item.photo = item.photo || old.photo; d.items = d.items.map(x => x.id === editId ? item : x); }
    } else {
      d.items.unshift(item);
      this._cost99Award(1, 0, '新增物品');
    }
    this._cost99EditId = null;
    this._cost99Photo = null;
    this._cost99Save(d);
    this._sfx99('success');
    this._flash(`✅ 物品「${name}」已${editId ? '更新' : '收录'}——去点卡片打卡使用吧`);
    this.render_workbench();
  },

  _cost99Edit(id) {
    const d = this._cost99Data();
    const it = d.items.find(x => x.id === id);
    if (!it) return;
    this._cost99Add();
    setTimeout(() => {
      try {
        document.getElementById('cs99-name').value = it.name;
        document.getElementById('cs99-price').value = it.price;
        document.getElementById('cs99-date').value = it.date;
        // 分类 & 状态选中
        document.querySelectorAll('#cs99-cats .cs99-sel-cat').forEach(b => b.classList.toggle('on', b.dataset.cat === it.cat));
        document.querySelectorAll('#cs99-sts .cs99-sel-cat').forEach(b => b.classList.toggle('on', b.dataset.st === it.status));
        // 保存时带上 id：标记编辑态
        this._cost99EditId = id;
      } catch (e) {}
    }, 80);
  },

  _cost99Del(id) {
    const d = this._cost99Data();
    const it = d.items.find(x => x.id === id);
    if (!it) return;
    this._modal('🗑️ 删除物品', `<div style="font-size:13px;color:#475569;line-height:1.9">确定删除「<b>${this.esc(it.name)}</b>」吗？<br><span style="color:#94a3b8;font-size:12px">本地与云端记录会一并清除（多设备同步后生效）</span></div>`, [
      { label: '删除', primary: true, onClick: () => {
          d.items = d.items.filter(x => x.id !== id);
          this._cost99Save(d);
          this._flash('🗑️ 已删除（本地 + 云端）');
          this.render_workbench();
        } },
      { label: '取消' },
    ]);
  },

  _cost99Export() {
    const d = this._cost99Data();
    if (!d.items.length) return this._flash('还没有物品可导出');
    const rows = [['名称', '分类', '价格', '购入日期', '已使用天数', '使用次数', '单次成本', '每日成本', '状态']];
    d.items.forEach(it => rows.push([
      it.name, it.cat, (+it.price || 0).toFixed(2), it.date,
      String(this._cost99Days(it.date)), String(it.uses || 0),
      this._cost99PerUse(it).toFixed(2), this._cost99PerDay(it).toFixed(2),
      (this.COST99_STATUS.find(s => s.k === it.status) || {}).n || it.status,
    ]));
    const csv = '\ufeff' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '物品使用成本-' + Store.today() + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    this._flash('📤 CSV 已导出（Excel 可直接打开）');
  },

  // 隐私弹窗（首次进入）
  _cost99Privacy() {
    this._modal('🔒 数据与隐私说明', `
      <div style="font-size:12.5px;color:#475569;line-height:2">
        物品资产数据会同步至云端服务器，用于<b>多设备同步</b>；<br>
        您可以在设置中关闭云同步，关闭后数据仅保存在本机。<br>
        <b>我们不会向第三方分享你的资产信息。</b>
      </div>`, [{ label: '知道了', primary: true }]);
  },
});
