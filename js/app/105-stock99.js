// 105-stock99.js —— v12.9.49 【囤货保质期】记录囤积的食物饮品（经济数据子功能）
// [功能组] G4-数据洞察（经济数据域 · 入口：数据中心 → 经济数据 → 囤货保质期卡片）
//
// 设计（用户规则 · v12.9.49）：
//   · 录入：名称 / 分类（饮品·生鲜·零食·罐头·调味品·其他）/ 数量 / 价格 / 生产日期 /
//     到期日或保质期天数（二选一）/ 存放位置（冰箱·储物柜·常温货架）/ 备注 / 图片
//   · 状态标签自动判定：✅正常(>30天) / ⚠️即将到期(≤30天) / 🔴临期预警(≤7天) / ❌已过期（灰色置底）
//     列表排序：临期预警 → 即将到期 → 正常 → 已过期（最急的排最前）
//   · 消耗登记：点【消耗】选数量，库存自动减；全部消耗自动归档「已吃完」
//   · 过期自动归档：进页即检——过期物品移入历史归档，浪费金额 = 单价×未消耗数量
//   · 看板（嵌入经济数据总览）：囤货总数 · 总花费 · 临期件数 · 累计浪费 · 本月食品浪费总额 · 本月消耗价值
//   · 提醒联动【阿福通知推送】：临期 7 天 → 阿福推送系统通知「囤货马上要到期啦」（设置页可开关）
//   · 存储：本地 localStorage 裸键 stock99（离线可用 · 自动随云存档同步多设备）
//   · 养成联动：登记囤货 +1 经验；消耗登记 +1 经验 +1 宝石
Object.assign(App, {

  // ==================== 数据层 ====================
  STOCK99_CATS: ['饮品', '生鲜', '零食', '罐头', '调味品', '其他'],
  STOCK99_STORES: ['冰箱', '储物柜', '常温货架'],
  _stock99Data() {
    try {
      const raw = localStorage.getItem('stock99');
      if (raw) {
        const d = JSON.parse(raw);
        return { items: Array.isArray(d.items) ? d.items : [], archive: Array.isArray(d.archive) ? d.archive : [], seen: !!d.seen, lastWarnDay: d.lastWarnDay || '' };
      }
    } catch (e) {}
    return { items: [], archive: [], seen: false, lastWarnDay: '' };
  },
  _stock99Save(d) { try { localStorage.setItem('stock99', JSON.stringify(d)); } catch (e) {} },
  // 距到期天数（正数=还剩 N 天；0=今天到期；负数=已过期 |N| 天）
  _stock99Left(it) {
    try { return Math.round((new Date(it.expDate + 'T00:00:00') - new Date(Store.today() + 'T00:00:00')) / 86400000); }
    catch (e) { return 9999; }
  },
  _stock99Status(it) {
    const L = this._stock99Left(it);
    if (L < 0) return { k: 'expired', n: '❌ 已过期', cls: 'expired' };
    if (L <= 7) return { k: 'soon7', n: '🔴 临期预警', cls: 'soon7' };
    if (L <= 30) return { k: 'soon30', n: '⚠️ 即将到期', cls: 'soon30' };
    return { k: 'ok', n: '✅ 正常', cls: 'ok' };
  },
  // 排序权重：临期预警(0) → 即将到期(1) → 正常(2) → 已过期(3)；同组内剩天数升序
  _stock99SortScore(it) {
    const L = this._stock99Left(it);
    const w = L < 0 ? 3 : (L <= 7 ? 0 : (L <= 30 ? 1 : 2));
    return w * 100000 + (L < 0 ? 1e6 + (-L) : L);   // 过期组内置底（天数越大越后）
  },
  _stock99Unit(it) { return (+it.price || 0) / Math.max(1, it.qty || 1); },
  _stock99Award(exp, gems, why) {
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
      this._flash(`📦 囤货保质期：${why} —— 经验 +${exp}${gems ? ` · 宝石 +${gems}` : ''}`);
    } catch (e) {}
  },

  // ==================== 过期自动归档 + 临期提醒（进页巡检）====================
  _stock99Sweep() {
    const d = this._stock99Data();
    let expired = 0;
    const stay = [];
    d.items.forEach(it => {
      if (this._stock99Left(it) < 0) {
        expired++;
        d.archive.unshift({
          ...it, doneAt: Date.now(), doneWhy: 'expired',
          waste: Math.round(this._stock99Unit(it) * (it.qty || 0) * 100) / 100,
        });
      } else stay.push(it);
    });
    if (expired) {
      d.items = stay;
      d.archive = d.archive.slice(0, 200);
      this._stock99Save(d);
      this._flash(`❌ 有 ${expired} 件囤货已过期——自动归档进历史，浪费已计入统计`);
    }
    // 临期 7 天提醒（每日一次 · 阿福通知推送 + 消息中心）
    const soon7 = d.items.filter(it => this._stock99Left(it) >= 0 && this._stock99Left(it) <= 7);
    const today = Store.today();
    if (soon7.length && d.lastWarnDay !== today) {
      d.lastWarnDay = today;
      this._stock99Save(d);
      const names = soon7.slice(0, 3).map(x => x.name).join('、');
      const text = `阿福提醒，你有 ${soon7.length} 件囤货马上要到期啦（${names}${soon7.length > 3 ? '…' : ''}），记得尽快吃掉`;
      // 原生系统通知（客户端 · 阿福的提醒渠道）+ App 内消息中心
      if (this._notify99SystemPush) this._notify99SystemPush('stock', '囤货临期提醒', text, 'stock99');
      if (this._notify99Log) this._notify99Log('📦 ' + text);
    }
    return expired;
  },

  // ==================== 页面 ====================
  _wbStock99(wb, W) {
    const d = this._stock99Data();
    if (!d.seen) {
      d.seen = true;
      this._stock99Save(d);
      setTimeout(() => this._stock99Privacy(), 100);
    }
    this._stock99Sweep();
    const tab = this._stock99Tab || 'list';
    const fmt = (v) => '¥' + (Math.round(v * 100) / 100).toFixed(2);
    // 看板统计
    const items = d.items.slice().sort((a, b) => this._stock99SortScore(a) - this._stock99SortScore(b));
    const soon7 = items.filter(it => this._stock99Left(it) >= 0 && this._stock99Left(it) <= 7).length;
    const totalN = items.reduce((a, it) => a + (it.qty || 0), 0);
    const totalCost = items.reduce((a, it) => a + (+it.price || 0), 0);
    const wasteAll = d.archive.filter(x => x.doneWhy === 'expired').reduce((a, x) => a + (x.waste || 0), 0);
    const month = Store.today().slice(0, 7);
    const wasteMonth = d.archive.filter(x => x.doneWhy === 'expired' && (x.doneAt && new Date(x.doneAt).toISOString().slice(0, 7) === month)).reduce((a, x) => a + (x.waste || 0), 0);
    // 本月消耗价值：log 里本月消耗数量 × 单价
    let usedMonth = 0;
    items.forEach(it => (it.log || []).forEach(l => {
      if (new Date(l.ts).toISOString().slice(0, 7) === month) usedMonth += (this._stock99Unit(it) * (l.n || 0));
    }));
    let html = `<div class="eco99-page eco99-pg-orange">
      <div class="eco99-subhero h-orange">
        <div class="eco99-subhero-top">
          <div>
            <h2>🧺 多久吃</h2>
            <p>囤的食品饮品记下来——保鲜贴纸式状态墙，阿福临期轻声提醒，每一口都不浪费。</p>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="App.navBack()">← 返回</button>
        </div>
        <div class="eco99-subhero-kpi">
          <span>囤货概览</span>
          <b>${items.length} 种 / ${totalN} 件</b>
          <small>${soon7 ? `🔴 ${soon7} 件临期预警 · 优先吃掉` : '✅ 无临期 · 全部新鲜'} · 累计浪费 ${fmt(wasteAll)}</small>
        </div>
      </div>
      <div class="cs99-bars" style="padding:10px 12px;background:rgba(255,255,255,.75);border-radius:14px">
        <div class="cs99-bar-row"><span class="cs99-bar-name">囤货总花费</span><div class="cs99-bar"><i style="width:100%;background:#38bdf8"></i></div><span class="cs99-bar-amt">${fmt(totalCost)}</span></div>
        <div class="cs99-bar-row"><span class="cs99-bar-name">本月食品浪费</span><div class="cs99-bar"><i style="width:${wasteMonth && totalCost ? Math.min(100, wasteMonth / totalCost * 100) : 2}%;background:#fb7185"></i></div><span class="cs99-bar-amt">${fmt(wasteMonth)}</span></div>
        <div class="cs99-bar-row"><span class="cs99-bar-name">本月消耗价值</span><div class="cs99-bar"><i style="width:${usedMonth && totalCost ? Math.min(100, usedMonth / totalCost * 100) : 2}%;background:#34d399"></i></div><span class="cs99-bar-amt">${fmt(usedMonth)}</span></div>
      </div>
      <div class="cs99-tabs" style="margin-top:14px">
        <button type="button" class="cs99-tab${tab === 'list' ? ' on' : ''}" onclick="App._stock99SetTab('list')">🧺 囤货卡片墙</button>
        <button type="button" class="cs99-tab${tab === 'hist' ? ' on' : ''}" onclick="App._stock99SetTab('hist')">🗂️ 历史归档</button>
      </div>`;
    if (tab === 'hist') {
      html += d.archive.length ? d.archive.map(x => `
        <div class="cs99-item dim">
          <span class="cs99-ico emoji">${x.icon || (this.STOCK99_CATS.indexOf(x.cat) !== -1 ? ['🥤', '🥬', '🍪', '🥫', '🧂', '🧺'][this.STOCK99_CATS.indexOf(x.cat)] : '📦')}</span>
          <div class="cs99-mid">
            <div class="cs99-name">${this.esc(x.name)}<span class="cs99-st ${x.doneWhy === 'expired' ? 'st-sold' : 'st-use'}">${x.doneWhy === 'expired' ? '❌ 过期归档' : '✅ 已吃完'}</span></div>
            <div class="cs99-sub">${this.esc(x.cat || '')} · ${new Date(x.doneAt || Date.now()).toISOString().slice(0, 10)} 归档${x.doneWhy === 'expired' ? ` · 浪费 ${fmt(x.waste || 0)}` : ''}</div>
          </div>
        </div>`).join('') : '<div class="empty" style="margin:18px 0">历史归档还是空的</div>';
    } else {
      html += items.length ? items.map(it => {
        const L = this._stock99Left(it);
        const st = this._stock99Status(it);
        const media = it.photo
          ? `<img class="cs99-ico" src="${it.photo}" alt="">`
          : `<span class="cs99-ico emoji">${it.icon || (['🥤', '🥬', '🍪', '🥫', '🧂', '🧺'][this.STOCK99_CATS.indexOf(it.cat)] || '📦')}</span>`;
        return `<div class="cs99-item ${st.cls === 'expired' ? 'dim' : ''} sk-${st.cls}">
        ${media}
        <div class="cs99-mid">
          <div class="cs99-name">${this.esc(it.name)}<span class="cs99-st sk-st-${st.cls}">${st.n}</span></div>
          <div class="cs99-sub">${this.esc(it.cat)} · 剩 ${it.qty || 0} 件 · 存放 ${this.esc(it.store || '常温货架')}${it.note ? ' · ' + this.esc(it.note) : ''}</div>
          <div class="cs99-countdown">${L < 0 ? `已过期 ${-L} 天` : (L === 0 ? '今天到期！' : `距到期 ${L} 天`)} · 到期日 ${it.expDate}</div>
        </div>
        <div class="cs99-right">
          <div class="cs99-big">${it.qty || 0}<i>件</i></div>
          <div class="cs99-acts">
            <button type="button" class="btn btn-ghost btn-sm" onclick="App._stock99Use('${it.id}')">消耗</button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="App._stock99Edit('${it.id}')">编辑</button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="App._stock99Archive('${it.id}','manual')">归档</button>
          </div>
        </div>
      </div>`;
      }).join('') : '<div class="empty" style="margin:18px 0">还没有囤货记录——点右下角 ➕ 添加第一件</div>';
    }
    html += `</div>
    <button type="button" class="cs99-fab" onclick="App._stock99Add()" aria-label="添加囤货">＋</button>`;
    return html;
  },

  _stock99SetTab(t) { this._stock99Tab = t; this._sfx99('tap'); this.render_workbench(); },

  // ==================== 添加 / 编辑 ====================
  _stock99Add() {
    this._stock99EditId = null;
    this._stock99Photo = null;
    this._modal('📦 添加囤货', `
      <div class="cs99-form">
        <div class="cs99-f-row"><label>物品名称 *</label><input id="sk99-name" type="text" maxlength="30" placeholder="如：纯牛奶 / 全麦面包 / 午餐肉罐头"></div>
        <div class="cs99-f-2col">
          <div class="cs99-f-row"><label>分类</label>
            <div class="cs99-sel-cats" id="sk99-cats">${this.STOCK99_CATS.map((c, i) => `<button type="button" class="cs99-sel-cat${i === 0 ? ' on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
          </div>
          <div class="cs99-f-row"><label>存放位置</label>
            <div class="cs99-sel-cats" id="sk99-stores">${this.STOCK99_STORES.map((c, i) => `<button type="button" class="cs99-sel-cat${i === 0 ? ' on' : ''}" data-store="${c}">${c}</button>`).join('')}</div>
          </div>
        </div>
        <div class="cs99-f-2col">
          <div class="cs99-f-row"><label>购入数量（件）</label><input id="sk99-qty" type="number" inputmode="numeric" min="1" value="1"></div>
          <div class="cs99-f-row"><label>购入价格（¥ · 可选）</label><input id="sk99-price" type="number" inputmode="decimal" min="0" placeholder="计入浪费统计"></div>
        </div>
        <div class="cs99-f-row"><label>生产日期（可选）</label><input id="sk99-prod" type="date"></div>
        <div class="cs99-f-2col">
          <div class="cs99-f-row"><label>方式A：到期日</label><input id="sk99-exp" type="date"></div>
          <div class="cs99-f-row"><label>方式B：保质期天数</label><input id="sk99-days" type="number" inputmode="numeric" min="1" placeholder="与A二选一"></div>
        </div>
        <div class="cs99-f-row"><label>备注（可选）</label><input id="sk99-note" type="text" maxlength="50" placeholder="如：需要冷藏 · 开封尽快吃完"></div>
        <div class="cs99-f-row"><label>物品图片（可选）</label>
          <input type="file" id="sk99-photo" accept="image/*" style="font-size:12px" onchange="App._stock99PhotoPick(this)">
          <div id="sk99-photo-pv" style="margin-top:8px"></div>
        </div>
      </div>`,
      [{ label: '完成保存', primary: true, onClick: () => this._stock99SaveItem() }, { label: '取消' }]);
    setTimeout(() => {
      ['#sk99-cats', '#sk99-stores'].forEach(sel => {
        const box = document.querySelector(sel);
        if (box) box.querySelectorAll('.cs99-sel-cat').forEach(b => b.addEventListener('click', () => {
          box.querySelectorAll('.cs99-sel-cat').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
        }));
      });
    }, 50);
  },

  _stock99PhotoPick(input) {
    const f = input && input.files && input.files[0];
    if (!f) return;
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
          this._stock99Photo = cv.toDataURL('image/jpeg', 0.7);
          const pv = document.getElementById('sk99-photo-pv');
          if (pv) pv.innerHTML = `<img src="${this._stock99Photo}" style="width:86px;height:86px;object-fit:cover;border-radius:12px;border:2px solid #bae6fd">`;
        } catch (err) { this._flash('⚠️ 这张图处理不了，换一张试试'); }
      };
      img.src = e.target.result;
    };
    rd.readAsDataURL(f);
  },

  _stock99SaveItem() {
    const name = (document.getElementById('sk99-name').value || '').trim();
    if (!name) { this._sfx99('fail'); this._flash('❌ 物品名称必填'); return; }
    const qty = Math.max(1, Math.round(+document.getElementById('sk99-qty').value || 1));
    const price = Math.max(0, +document.getElementById('sk99-price').value || 0);
    const prod = document.getElementById('sk99-prod').value || '';
    const exp = document.getElementById('sk99-exp').value || '';
    const days = +document.getElementById('sk99-days').value || 0;
    const note = (document.getElementById('sk99-note').value || '').trim();
    const catEl = document.querySelector('#sk99-cats .cs99-sel-cat.on');
    const storeEl = document.querySelector('#sk99-stores .cs99-sel-cat.on');
    const cat = catEl ? catEl.dataset.cat : '其他';
    const store = storeEl ? storeEl.dataset.store : '常温货架';
    // 到期日：方式A直取；方式B = 生产日期/今天 + 天数
    let expDate = exp;
    if (!expDate && days > 0) {
      const base = prod ? new Date(prod + 'T00:00:00') : new Date(Store.today() + 'T00:00:00');
      if (!isNaN(base.getTime())) { base.setDate(base.getDate() + days); expDate = base.toISOString().slice(0, 10); }
    }
    if (!expDate) { this._sfx99('fail'); this._flash('❌ 到期日与保质期天数至少填一个（不然没法提醒你）'); return; }
    const d = this._stock99Data();
    const editId = this._stock99EditId;
    const item = {
      id: editId || ('s' + Date.now().toString(36)),
      name, cat, qty, price, prod, expDate, store, note,
      photo: this._stock99Photo || (editId ? ((d.items.find(x => x.id === editId) || {}).photo || '') : ''),
      log: [], created: Date.now(),
    };
    if (editId) {
      const old = d.items.find(x => x.id === editId);
      if (old) { item.log = old.log || []; item.created = old.created; d.items = d.items.map(x => x.id === editId ? item : x); }
      this._flash(`✅ 囤货「${name}」已更新`);
    } else {
      d.items.unshift(item);
      this._stock99Award(1, 0, '登记囤货');
    }
    this._stock99EditId = null;
    this._stock99Photo = null;
    this._stock99Save(d);
    this._sfx99('success');
    this.render_workbench();
  },

  _stock99Edit(id) {
    const d = this._stock99Data();
    const it = d.items.find(x => x.id === id);
    if (!it) return;
    this._stock99Add();
    setTimeout(() => {
      try {
        document.getElementById('sk99-name').value = it.name;
        document.getElementById('sk99-qty').value = it.qty;
        document.getElementById('sk99-price').value = it.price;
        document.getElementById('sk99-prod').value = it.prod || '';
        document.getElementById('sk99-exp').value = it.expDate;
        document.getElementById('sk99-note').value = it.note || '';
        document.querySelectorAll('#sk99-cats .cs99-sel-cat').forEach(b => b.classList.toggle('on', b.dataset.cat === it.cat));
        document.querySelectorAll('#sk99-stores .cs99-sel-cat').forEach(b => b.classList.toggle('on', b.dataset.store === it.store));
        this._stock99EditId = id;
      } catch (e) {}
    }, 80);
  },

  // ==================== 消耗 / 归档 ====================
  _stock99Use(id) {
    const d = this._stock99Data();
    const it = d.items.find(x => x.id === id);
    if (!it) return;
    this._modal(`🍽️ 消耗「${this.esc(it.name)}」`, `
      <div style="font-size:13px;color:#475569;line-height:2">
        当前剩余 <b>${it.qty || 0}</b> 件 · 这次消耗掉几件？
        <input id="sk99-use-n" type="number" inputmode="numeric" min="1" max="${it.qty || 1}" value="1" style="width:80px;margin-left:8px">
      </div>`,
      [{ label: '确认消耗', primary: true, onClick: () => {
          const n = Math.max(1, Math.min(it.qty || 1, Math.round(+document.getElementById('sk99-use-n').value || 1)));
          it.qty = Math.max(0, (it.qty || 0) - n);
          it.log = it.log || [];
          it.log.push({ ts: Date.now(), n });
          this._sfx99('cheer');
          if (it.qty <= 0) {
            // 全部消耗完：自动归档「已吃完」（无浪费）
            d.items = d.items.filter(x => x.id !== id);
            d.archive.unshift({ ...it, qty: 0, doneAt: Date.now(), doneWhy: 'eaten', waste: 0 });
            this._stock99Save(d);
            this._stock99Award(1, 1, '囤货消耗完归档「已吃完」');
            this._flash(`✅ 「${it.name}」全部消耗完——已自动归档「已吃完」，干得漂亮不浪费 🎉`);
          } else {
            this._stock99Save(d);
            this._stock99Award(1, 1, '登记囤货消耗');
            this._flash(`✅ 已消耗 ${n} 件——「${it.name}」还剩 ${it.qty} 件`);
          }
          this.render_workbench();
        } }, { label: '取消' }]);
  },

  _stock99Archive(id, why) {
    const d = this._stock99Data();
    const it = d.items.find(x => x.id === id);
    if (!it) return;
    d.items = d.items.filter(x => x.id !== id);
    d.archive.unshift({
      ...it, doneAt: Date.now(), doneWhy: why === 'manual' ? 'manual' : 'expired',
      waste: why === 'manual' ? Math.round(this._stock99Unit(it) * (it.qty || 0) * 100) / 100 : Math.round(this._stock99Unit(it) * (it.qty || 0) * 100) / 100,
    });
    this._stock99Save(d);
    this._flash(`🗂️ 「${it.name}」已归档${why === 'manual' ? '（剩余按浪费计入统计）' : ''}`);
    this.render_workbench();
  },

  _stock99Privacy() {
    this._modal('🔒 数据与隐私说明', `
      <div style="font-size:12.5px;color:#475569;line-height:2">
        囤货记录会同步至云端服务器，用于<b>多设备同步</b>；<br>
        您可以在设置中关闭云同步，关闭后数据仅保存在本机。<br>
        <b>我们不会向第三方分享你的资产信息。</b><br>
        <span style="color:#94a3b8;font-size:12px">临期提醒走「阿福的提醒」通知渠道，可在阿福提醒设置里单独开关。</span>
      </div>`, [{ label: '知道了', primary: true }]);
  },
});
