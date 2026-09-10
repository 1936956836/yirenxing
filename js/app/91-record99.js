// 91-record99.js —— v12.9.5 【记录】首页改版 + 「记一笔」底部上拉面板 + 旅记
// [功能组] G4-数据洞察（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   · 首页（效果图 record-home-ui-v3 同款 · 非卡片形式 · 直接铺在轻氧氧气绿渐变上）：
//     顶栏（我的记录▾ + ＋记一笔）→ 大标题「一字一记，不负每段经历 ✍️」→ 爱心气泡卡（点击浮现爱心动画）
//     → 3D黏土像素风圆形沙盘插画（占版面 ≥40%，男生+小银树下同坐）→ 6 个圆形导航按钮（待办/倒数日/纪念日/穿搭/生活科普/经验宝库）
//     → 黑色大圆角「情侣空间」按钮（黄色房子爱心图标 → ta99）→ 三张功能卡（格物/致知/未尽之言）
//   · 上拉面板（效果图 record-panel-ui-v4 同款 · 无×键）：
//     拖拽条下拉收回（有未保存内容时弹「继续编辑/丢弃/保存」三选）· 文本输入区 + 当前分组胶囊
//     · 8 分类两行四列（灵光/憾潮/拾梦/足迹/铭记/漂流/读感/日记）：点击=选分组，长按 1 秒=进度环→按钮碎裂→进入对应页面
//     · 「记下」按分组写入对应数据仓（sparks99/wbRegrets99/wbDreams99/wbTravel99/wbNotes99/wbDrift99/readingNotes/diaries）
//   · 旅记：足迹页新增（记录旅行时发生的事 · d.wbTravel99）
Object.assign(App, {

  // ==================== 分类定义（上拉面板 8 分组 + 下拉菜单共用）====================
  _rec99Cats() {
    return [
      { k: 'sparks99',      ico: '💡', n: '灵光' },
      { k: 'regrets99',     ico: '🌊', n: '憾潮' },
      { k: 'dream99',       ico: '🌙', n: '拾梦' },
      { k: 'footprints99',  ico: '👣', n: '足迹' },
      { k: 'notes99',       ico: '🏛️', n: '铭记' },
      { k: 'drift99',       ico: '🍾', n: '漂流' },
      { k: 'readingNotes',  ico: '📖', n: '读感' },
      { k: 'diary',         ico: '📔', n: '日记' },
    ];
  },
  _rec99Cat(k) { return this._rec99Cats().find(c => c.k === k) || this._rec99Cats()[0]; },
  _rec99State() {
    if (!this._rec99St) this._rec99St = { cat: 'sparks99', open: false, pressRaf: 0, pressBtn: null, shattered: false, dragY: 0, dragOn: false, dragStartY: 0 };
    return this._rec99St;
  },

  // ==================== 【记录】首页（v12.9.5 改版 · 非卡片形式）====================
  _wbRecord(wb, W) {
    const navs = [
      { wb: 'todo',      ico: '✅', n: '待办' },
      { wb: 'countdown', ico: '⏳', n: '倒数日' },
      { wb: 'memorial',  ico: '🎂', n: '纪念日' },
      { wb: 'outfit',    ico: '👗', n: '穿搭' },
      { wb: 'wb_sci',    ico: '🧪', n: '生活科普' },
      { wb: 'wb_exp',    ico: '📦', n: '经验宝库' },
    ];
    return `
    <div class="rec99">
      <div class="rec99-topbar">
        <button type="button" class="rec99-sel" id="rec99SelBtn" onclick="App.rec99MenuToggle(event)">我的记录 <i>▾</i></button>
        <button type="button" class="rec99-add" onclick="App.rec99SheetOpen()" aria-label="记一笔">＋</button>
      </div>
      <h1 class="rec99-title">一字一记，不负每段经历 <span class="rec99-title-emo">✍️</span></h1>
      <div class="rec99-sub">一个人的文字，有温度 ☁️</div>
      <button type="button" class="rec99-bubble" id="rec99Bubble" onclick="App.rec99Hearts(this)">
        <span class="rec99-bubble-ico">♥</span>
        <span class="rec99-bubble-tx">写下日常，让记忆有迹可循</span>
        <span class="rec99-bubble-ar">›</span>
      </button>
      <div class="rec99-stage">${this._rec99Diorama()}</div>
      <div class="rec99-nav">
        ${navs.map(x => `<button type="button" class="rec99-navbtn" title="${x.n}" onclick="App.gotoWb('${x.wb}')">${x.ico}</button>`).join('')}
      </div>
      <button type="button" class="rec99-couple" onclick="App.gotoWb('ta99')">
        <span class="rec99-couple-ico">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
            <path d="M3.5 10.5 12 3.5l8.5 7" stroke="#FACC15" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5.5 9.6V19a1.2 1.2 0 0 0 1.2 1.2h10.6A1.2 1.2 0 0 0 18.5 19V9.6" stroke="#FACC15" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M12 17.2c-2.1-1.4-3.4-2.5-3.4-4a1.9 1.9 0 0 1 3.4-1.1 1.9 1.9 0 0 1 3.4 1.1c0 1.5-1.3 2.6-3.4 4Z" fill="#FACC15"/>
          </svg>
        </span>
        <span class="rec99-couple-tx">情侣空间</span>
        <span class="rec99-couple-ar">→</span>
      </button>
      <div class="rec99-feats">
        <button type="button" class="rec99-feat" onclick="App.gotoWb('gewu99')">
          <span class="rec99-feat-ico fi-gw">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
              <path d="M5 5.5h9.5v11a2.5 2.5 0 0 1-2.5 2.5H7.5A2.5 2.5 0 0 1 5 16.5v-11Z" stroke="#16A34A" stroke-width="2"/>
              <path d="M14.5 9h2.8a2 2 0 0 1 2 2v5.5a2.2 2.2 0 0 1-4.4 0" stroke="#16A34A" stroke-width="2"/>
              <path d="M7.6 9h4.3M7.6 12h4.3" stroke="#16A34A" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="rec99-feat-name">格物</span>
          <span class="rec99-feat-sub">图书馆 · 翻书阅读</span>
        </button>
        <button type="button" class="rec99-feat" onclick="App.gotoWb('zhizhi99')">
          <span class="rec99-feat-ico fi-zz">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
              <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="#2563EB" stroke-width="2"/>
              <path d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3" stroke="#2563EB" stroke-width="2" stroke-linecap="round"/>
              <circle cx="9" cy="13.5" r="1.1" fill="#2563EB"/><circle cx="12.5" cy="13.5" r="1.1" fill="#2563EB"/><circle cx="16" cy="13.5" r="1.1" fill="#2563EB"/>
              <circle cx="9" cy="16.5" r="1.1" fill="#2563EB"/><circle cx="12.5" cy="16.5" r="1.1" fill="#2563EB"/>
            </svg>
          </span>
          <span class="rec99-feat-name">致知</span>
          <span class="rec99-feat-sub">收音机 · 今日要闻</span>
        </button>
        <button type="button" class="rec99-feat" onclick="App.gotoWb('vault99')">
          <span class="rec99-feat-ico fi-vl">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
              <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" stroke="#DC2626" stroke-width="2"/>
              <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="15.2" r="1.6" fill="#DC2626"/>
              <path d="M12 16.4v1.8" stroke="#DC2626" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="rec99-feat-name">未尽之言</span>
          <span class="rec99-feat-sub">密码箱 · 秘密安放</span>
        </button>
      </div>
    </div>
    ${this._rec99MenuHtml()}
    ${this._rec99SheetHtml()}`;
  },

  // ==================== 黏土像素画 · 圆形沙盘插画（占版面 ≥40%）====================
  // v12.9.9 像素艺术：与像素猫小银（62-pixelcat.js）同一套画法——canvas 逐格 fillRect 精心绘制，
  //   每个色块都是设计出来的（不是把平滑图降采样成马赛克）；81×72 格，CSS pixelated 放大≈4px/格；
  //   canvas 元素直接显示（非 <img>，无浏览器"下载图片"悬浮按钮/长按保存）
  _rec99Diorama() {
    // 画布在 render_workbench 的 innerHTML 落地后绘制（setTimeout 0）
    setTimeout(() => { try { this._rec99Draw(); } catch (e) {} }, 0);
    return `
    <div class="rec99-dio-box" id="rec99DioBox">
      <div class="rec99-pxcloud pc1"></div>
      <div class="rec99-pxcloud pc2"></div>
      <span class="rec99-io-hint">👆 点点小人 · 果树 · 邮筒 · 小银</span>
    </div>`;
  },
  // 建 canvas（81×72 格）并绘制像素沙盘；canvas 不可用时回退直嵌矢量 SVG
  _rec99Draw() {
    const box = document.getElementById('rec99DioBox');
    if (!box || box.dataset.done) return;
    box.dataset.done = '1';
    try {
      const c = document.createElement('canvas');
      c.width = 81; c.height = 72;
      c.className = 'rec99-dio-canvas';
      c.setAttribute('aria-label', '黏土像素画沙盘：两栋房子、一间商铺、大树下的男生与小银（可点击小人/果树/邮筒/小银互动）');
      this._rec99DrawArt(c.getContext('2d'));
      box.appendChild(c);
      this._rec99Cv = c;
      this._rec99BindIo(box, c);      // v12.9.46 沙盘交互热区（canvas pointer-events:none · 热区绑在 box 上）
    } catch (e) {
      box.insertAdjacentHTML('beforeend', this._rec99DioSvg());
    }
  },
  // 像素画本体：R=矩形填格 · E=像素椭圆（阶梯边缘）· 色板取黏土暖色系
  // v12.9.46 skip：交互动画时跳过指定实体（tree/mail/boy/cat），由动画帧单独重绘
  _rec99DrawArt(ctx, skip) {
    const P = this._rec99Pal();
    const R = this._rec99Rect(ctx);
    const E = this._rec99Ell(ctx);
    // —— 底盘（悬空投影 + 台座 + 草地）——
    E(40.5, 59, 37, 11, P.sh);
    E(40.5, 57, 35, 10, P.baseD);
    E(40.5, 56, 34, 10, P.baseL);
    E(40.5, 55, 36, 11, P.grassD);
    E(40.5, 54, 36, 11, P.grass);
    E(35, 51, 16, 5, P.grassL);
    // —— 房子A（左）——
    R(10, 35, 13, 11, P.wall); R(10, 35, 2, 11, P.wallL); R(21, 35, 2, 11, P.wallD);
    R(13, 30, 7, 1, P.roofAL); R(12, 31, 9, 1, P.roofA); R(11, 32, 11, 1, P.roofA); R(10, 33, 13, 1, P.roofA); R(9, 34, 15, 1, P.roofAD);
    R(15, 39, 4, 7, P.frame); R(16, 40, 2, 6, P.door);
    R(11, 37, 4, 4, P.win); R(11, 37, 1, 1, '#FFFFFF');
    // —— 商铺（中 · 条纹遮阳棚）——
    R(34, 28, 13, 12, P.wall); R(34, 28, 2, 12, P.wallL); R(45, 28, 2, 12, P.wallD);
    for (let x = 32; x < 48; x++) R(x, 24, 1, 4, (Math.floor((x - 32) / 2) % 2 === 0) ? P.awn : P.cream);
    R(32, 28, 16, 1, P.awnD);
    R(39, 32, 4, 8, P.frame); R(40, 33, 2, 7, P.door);
    R(34, 32, 4, 5, '#B8DCE8'); R(34, 32, 1, 1, '#FFFFFF');
    R(44, 32, 3, 4, P.win);
    // —— 房子B（右）——
    R(58, 36, 12, 10, P.wall); R(58, 36, 2, 10, P.wallL); R(68, 36, 2, 10, P.wallD);
    R(61, 31, 7, 1, P.roofBL); R(60, 32, 9, 1, P.roofB); R(59, 33, 11, 1, P.roofB); R(58, 34, 13, 1, P.roofB); R(57, 35, 15, 1, P.roofBD);
    R(61, 38, 4, 4, P.win2); R(66, 37, 3, 3, P.win); R(59, 37, 1, 1, '#FFFFFF');
    // —— 大树（中偏右 · 实体化可摇曳）——
    if (!skip || !skip.has('tree')) this._rec99Tree(ctx, 0, null);
    // —— 小树（左前）——
    R(25, 44, 2, 5, P.trunk);
    E(26, 41, 4, 4, P.leaf); E(25, 40, 2, 2, P.leafL);
    // —— 长椅（左前 · 木质）——
    R(12, 50, 11, 1, P.bench); R(12, 52, 11, 1, P.bench);
    R(13, 53, 1, 2, P.benchD); R(21, 53, 1, 2, P.benchD);
    R(12, 50, 2, 1, '#E8C9A0');
    // —— 邮筒（右前 · 实体化可开盖）——
    if (!skip || !skip.has('mail')) this._rec99Mail(ctx, 0, 0, 1);
    // —— 男生（树下 · 实体化可跳可挥手）——
    if (!skip || !skip.has('boy')) this._rec99Boy(ctx, 0, -1);
    // —— 小银（男生身旁 · 实体化可跃起冒心）——
    if (!skip || !skip.has('cat')) this._rec99Cat(ctx, 0, 0, -1, 0);
    // —— 小草与花 ——
    R(30, 57, 1, 2, P.tuft); R(36, 60, 1, 2, P.tuft); R(50, 60, 1, 2, P.tuft); R(18, 62, 1, 2, P.tuft); R(66, 58, 1, 2, P.tuft);
    R(28, 58, 1, 1, P.fR); R(58, 62, 1, 1, P.fY); R(43, 63, 1, 1, P.fR);
  },
  // 色板（黏土暖色系 · 实体绘制函数共用）
  _rec99Pal() {
    return this._rec99P || (this._rec99P = {
      sh: 'rgba(110,148,107,.42)',                       // 草地投影
      baseD: '#E2D9C4', baseL: '#EDE5D4',                // 台座
      grassD: '#8BBF87', grass: '#A9D6A0', grassL: '#C4E4BA', tuft: '#7FB07C',
      wall: '#FCF3E5', wallL: '#FFFDF9', wallD: '#EFE1CB',
      roofA: '#EEAC7C', roofAL: '#F8D0A6', roofAD: '#E2955E',
      roofB: '#EA9C7E', roofBL: '#F4BEA4', roofBD: '#DB8563',
      awn: '#F0A75C', awnD: '#E28F44', cream: '#F7F0E0',
      leaf: '#A0CE97', leafL: '#BEE2B2', leafD: '#86B982',
      trunk: '#C9A27E', trunkD: '#B58B66',
      hair: '#3E3A38', skin: '#F5D2B4', blush: '#F2B8A0', mouth: '#C97F5C',
      shirt: '#F0A75C', shirtL: '#F8BA76', pants: '#59646E',
      catW: '#E9EAEE', catL: '#FBFBFD', earP: '#F2C4C4', eyeK: '#3B3B45', noseP: '#E4899B',
      bench: '#D4B08C', benchD: '#B58B66',
      mail: '#DE7B6C', mailL: '#E38B7D', mailD: '#C2604F', tag: '#FBF2E2',
      door: '#9FC4DA', win: '#F3D9A8', win2: '#D9C6E4', frame: '#C9BFA8',
      fR: '#E8654F', fY: '#F2C94C',
    });
  },
  _rec99Rect(ctx) { return (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }; },
  _rec99Ell(ctx) {
    return (cx, cy, rx, ry, c) => {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x - cx) / rx, dy = (y - cy) / ry;
          if (dx * dx + dy * dy <= 1.06) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
        }
      }
    };
  },
  // —— 果树实体（dx 摇曳偏移 · drops 落果 [{x,y,a}]）——
  _rec99Tree(ctx, dx, drops) {
    const P = this._rec99Pal(), R = this._rec99Rect(ctx), E = this._rec99Ell(ctx);
    R(48, 36, 3, 12, P.trunk); R(50, 36, 1, 12, P.trunkD);
    E(50 + dx, 25, 11, 10, P.leaf); E(44 + dx, 29, 8, 7, P.leaf); E(56 + dx, 28, 8, 7, P.leaf);
    E(50 + dx, 32, 10, 6, P.leaf); E(46 + dx, 22, 6, 5, P.leafL); E(53 + dx, 31, 7, 4, P.leafD);
    R(45 + dx, 20, 2, 1, '#FFFFFF'); R(49 + dx, 19, 1, 1, '#FFFFFF');
    R(44 + dx, 27, 1, 1, P.fR); R(52 + dx, 23, 1, 1, P.fR); R(56 + dx, 29, 1, 1, P.fR); R(48 + dx, 33, 1, 1, P.fR);
    if (drops && drops.length) {
      drops.forEach(d => { ctx.globalAlpha = d.a; R(d.x, d.y, 1, 1, P.fR); });
      ctx.globalAlpha = 1;
    }
  },
  // —— 邮筒实体（open 盖开 · ly 信纸升起 · a 信纸透明度）——
  _rec99Mail(ctx, open, ly, a) {
    const P = this._rec99Pal(), R = this._rec99Rect(ctx);
    R(60, 46, 5, 1, P.mailL); R(60, 47, 5, 1, P.mail);
    R(60, 48, 5, 8, P.mail); R(60, 48, 1, 8, P.mailL);
    R(61, 49, 3, 1, P.mailD); R(61, 52, 2, 3, P.tag); R(60, 56, 5, 1, P.mailD);
    if (open) {                                   // 盖子掀起露出投信口
      R(61, 44, 4, 1, P.mailD); R(64, 43, 1, 1, P.mailD);
      R(61, 47, 3, 1, '#4A3430');
    }
    if (ly > 0) {                                 // 信纸飘出
      ctx.globalAlpha = a;
      const bx = 61 + Math.round(Math.sin(ly * .9) * 1);
      R(bx, 47 - ly, 3, 2, '#FBF2E2'); R(bx + 1, 48 - ly, 1, 1, P.fR);
      ctx.globalAlpha = 1;
    }
  },
  // —— 男生实体（dy 跳跃 · wave 挥手相位：-1 垂手 / 0 高举 / 1 平举）——
  _rec99Boy(ctx, dy, wave) {
    const P = this._rec99Pal(), R = this._rec99Rect(ctx);
    R(41, 52, 7, 1, P.sh);
    R(42, 41 + dy, 5, 5, P.skin);
    R(42, 40 + dy, 5, 2, P.hair); R(41, 41 + dy, 1, 2, P.hair); R(47, 41 + dy, 1, 2, P.hair);
    R(43, 43 + dy, 1, 1, P.eyeK); R(46, 43 + dy, 1, 1, P.eyeK);
    R(44, 45 + dy, 2, 1, P.mouth);
    R(42, 44 + dy, 1, 1, P.blush); R(46, 44 + dy, 1, 1, P.blush);
    R(41, 46 + dy, 7, 5, P.shirt); R(41, 46 + dy, 2, 5, P.shirtL);
    R(41, 51 + dy, 3, 2, P.pants); R(45, 51 + dy, 3, 2, P.pants);
    R(43, 47 + dy, 1, 1, '#FFD9A8');
    if (wave === 0) { R(48, 42 + dy, 1, 2, P.skin); R(48, 44 + dy, 1, 1, P.shirt); }
    else if (wave === 1) { R(49, 44 + dy, 1, 2, P.skin); R(49, 46 + dy, 1, 1, P.shirt); }
  },
  // —— 小银实体（dy 跃起 · sq 压扁 · heartK 爱心升起 0-1（-1 无）· tw 尾巴相位）——
  _rec99Cat(ctx, dy, sq, heartK, tw) {
    const P = this._rec99Pal(), R = this._rec99Rect(ctx);
    R(49, 52, 6, 1, P.sh);
    R(49, 47 + sq, 6, 5 - sq, P.catW); R(49, 51, 6, 1, P.catL);
    R(49, 42 + dy, 6, 5, P.catW);
    R(49, 41 + dy, 1, 2, P.catW); R(49, 41 + dy, 1, 1, P.earP);
    R(54, 41 + dy, 1, 2, P.catW); R(54, 41 + dy, 1, 1, P.earP);
    R(50, 42 + dy, 2, 1, P.catL);
    R(50, 44 + dy, 1, 1, P.eyeK); R(53, 44 + dy, 1, 1, P.eyeK);
    R(51, 45 + dy, 2, 1, P.noseP);
    R(49, 45 + dy, 1, 1, P.earP); R(54, 45 + dy, 1, 1, P.earP);
    if (tw === 1) { R(55, 46 + dy, 1, 1, P.catW); R(56, 45 + dy, 1, 3, P.catW); }
    else { R(55, 48 + dy, 1, 1, P.catW); R(56, 47 + dy, 1, 2, P.catW); }
    if (heartK >= 0) {                            // 爱心升起渐隐
      ctx.globalAlpha = Math.max(0, 1 - heartK);
      const h1y = Math.round(38 - heartK * 5), h2y = Math.round(39 - heartK * 6);
      R(50, h1y, 1, 1, '#F2A9C4'); R(52, h1y, 1, 1, '#F2A9C4'); R(50, h1y + 1, 3, 1, '#F2A9C4'); R(51, h1y + 2, 1, 1, '#F2A9C4');
      R(54, h2y, 1, 1, '#F6BFD2'); R(55, h2y + 1, 1, 1, '#F6BFD2');
      ctx.globalAlpha = 1;
    }
  },
  // ==================== v12.9.46 沙盘交互：点击实体 → 动画 + 音效 + 台词气泡 ====================
  _rec99BindIo(box, c) {
    box.addEventListener('click', (e) => {
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const sc = Math.min(r.width / 81, r.height / 72);
      const ox = (r.width - 81 * sc) / 2, oy = (r.height - 72 * sc) / 2;
      const gx = (e.clientX - r.left - ox) / sc, gy = (e.clientY - r.top - oy) / sc;
      if (gx < 0 || gx >= 81 || gy < 0 || gy >= 72) return;
      const inR = (x, y, w, h) => gx >= x && gx < x + w && gy >= y && gy < y + h;
      if (inR(39, 38, 11, 17)) this._rec99Poke('boy');
      else if (inR(48, 39, 11, 15)) this._rec99Poke('cat');
      else if (inR(57, 44, 11, 15)) this._rec99Poke('mail');
      else if (inR(35, 13, 31, 37)) this._rec99Poke('tree');
    });
  },
  _rec99Poke(kind) {
    const LINES = {
      boy: ['今天也要加油哦！', '你回来啦～', '一起写点什么吧', '嘿嘿，被发现了'],
      cat: ['喵～', '喵呜❤', '蹭蹭你～', '呼噜呼噜…'],
      tree: ['果子熟啦🍎', '沙沙——', '风好舒服呀～'],
      mail: ['有一封新信✉️', '叮——来信啦', '信箱里有惊喜？'],
    }[kind] || ['…'];
    const SFX = { boy: 'hi', cat: 'meow', tree: 'rustle', mail: 'mail' }[kind] || 'tap';
    try { this._sfx99 && this._sfx99(SFX); } catch (e) {}
    this._rec99Say(kind, LINES[Math.floor(Math.random() * LINES.length)]);
    this._rec99Play(kind);
  },
  // 实体头顶台词气泡（按画布 contain 实际显示区定位）
  _rec99Say(kind, text) {
    const box = document.getElementById('rec99DioBox');
    if (!box) return;
    let b = box.querySelector('.rec99-say');
    if (!b) { b = document.createElement('div'); b.className = 'rec99-say'; box.appendChild(b); }
    const c = this._rec99Cv;
    if (c) {
      const r = c.getBoundingClientRect(), rb = box.getBoundingClientRect();
      if (r.width && r.height) {
        const sc = Math.min(r.width / 81, r.height / 72);
        const ox = (r.width - 81 * sc) / 2, oy = (r.height - 72 * sc) / 2;
        const pos = { boy: [44, 37], cat: [52, 39], tree: [50, 13], mail: [62, 41] }[kind] || [40, 40];
        b.style.left = (r.left - rb.left + ox + pos[0] * sc) + 'px';
        b.style.top = (r.top - rb.top + oy + pos[1] * sc) + 'px';
      }
    }
    b.textContent = text;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(this._rec99SayT);
    this._rec99SayT = setTimeout(() => b.classList.remove('show'), 1700);
  },
  // 交互动画（canvas 逐帧重绘：小人两跳挥手 / 小银跃起冒心 / 果树摇曳落果 / 邮筒开盖寄信）
  _rec99Play(kind) {
    const c = this._rec99Cv;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (this._rec99Raf) { cancelAnimationFrame(this._rec99Raf); this._rec99Raf = 0; }
    const DUR = { boy: 920, cat: 1000, tree: 840, mail: 940 }[kind] || 800;
    const skip = new Set([kind]);
    if (kind === 'tree') { skip.add('boy'); skip.add('cat'); }
    const t0 = performance.now();
    const frame = (t) => {
      const el = t - t0;
      const k = Math.min(1, el / DUR);
      ctx.clearRect(0, 0, 81, 72);
      this._rec99DrawArt(ctx, skip);
      if (kind === 'boy') {
        const hop = k < .35 ? -Math.round(Math.sin(Math.PI * k / .35) * 3)
          : k < .6 ? -Math.round(Math.sin(Math.PI * (k - .35) / .25) * 2) : 0;
        this._rec99Boy(ctx, hop, Math.floor(el / 140) % 2);
        if (k < .6) {                            // 头顶星光
          ctx.globalAlpha = .95 * (1 - k / .6);
          ctx.fillStyle = '#FFE9A8';
          ctx.fillRect(40, 36 + Math.round(Math.sin(el / 90) * 1), 1, 1);
          ctx.fillRect(48, 37, 1, 1);
          ctx.globalAlpha = 1;
        }
      } else if (kind === 'cat') {
        let dy = 0, sq = 0;
        if (k < .4) dy = -Math.round(Math.sin(Math.PI * k / .4) * 4);
        else if (k < .55) sq = 1;
        this._rec99Cat(ctx, dy, sq, k < .3 ? -1 : (k - .3) / .7, Math.floor(el / 200) % 2);
      } else if (kind === 'tree') {
        const dx = Math.round(Math.sin(el / 95) * 2 * (1 - k));   // 摇曳
        const drops = [];
        if (k > .15) {
          const dk = Math.min(1, (k - .15) / .75);
          const fade = k > .85 ? (1 - k) / .15 : 1;
          drops.push({ x: 45, y: Math.round(27 + 28 * dk * dk), a: fade });
          if (dk > .2) {
            const d2 = Math.min(1, (dk - .2) / .8);
            drops.push({ x: 53, y: Math.round(23 + 32 * d2 * d2), a: fade });
          }
        }
        this._rec99Tree(ctx, dx, drops);
        this._rec99Boy(ctx, 0, -1);
        this._rec99Cat(ctx, 0, 0, -1, 0);
      } else if (kind === 'mail') {
        let ly = 0, a = 1;
        if (k > .12 && k < .7) ly = Math.max(1, Math.round((k - .12) / .58 * 6));
        else if (k >= .7) { ly = 6; a = Math.max(0, 1 - (k - .7) / .3); }
        this._rec99Mail(ctx, 1, ly, a);
      }
      if (k < 1) this._rec99Raf = requestAnimationFrame(frame);
      else { this._rec99Raf = 0; ctx.clearRect(0, 0, 81, 72); this._rec99DrawArt(ctx); }
    };
    this._rec99Raf = requestAnimationFrame(frame);
  },
  // 矢量兜底（canvas 极端不可用时直嵌；黏土渐变 + 柔影 + 噪点手捏滤镜）
  _rec99DioSvg() {
    return `
    <svg class="rec99-dio" xmlns="http://www.w3.org/2000/svg" width="360" height="320" viewBox="0 0 360 320" preserveAspectRatio="xMidYMid meet">
      <defs>
        <!-- 基础材质渐变（多层：亮面→主体→暗缘） -->
        <radialGradient id="rcGrass" cx="42%" cy="28%" r="85%">
          <stop offset="0%" stop-color="#C4E4BA"/><stop offset="55%" stop-color="#A9D6A0"/><stop offset="100%" stop-color="#8BBF87"/>
        </radialGradient>
        <radialGradient id="rcRoofA" cx="38%" cy="24%" r="90%">
          <stop offset="0%" stop-color="#F8D0A6"/><stop offset="62%" stop-color="#EEAC7C"/><stop offset="100%" stop-color="#E2955E"/>
        </radialGradient>
        <radialGradient id="rcRoofB" cx="38%" cy="24%" r="90%">
          <stop offset="0%" stop-color="#F4BEA4"/><stop offset="62%" stop-color="#EA9C7E"/><stop offset="100%" stop-color="#DB8563"/>
        </radialGradient>
        <radialGradient id="rcWall" cx="38%" cy="16%" r="95%">
          <stop offset="0%" stop-color="#FFFDF9"/><stop offset="68%" stop-color="#FCF3E5"/><stop offset="100%" stop-color="#EFE1CB"/>
        </radialGradient>
        <radialGradient id="rcLeaf" cx="40%" cy="22%" r="85%">
          <stop offset="0%" stop-color="#BEE2B2"/><stop offset="60%" stop-color="#A0CE97"/><stop offset="100%" stop-color="#86B982"/>
        </radialGradient>
        <radialGradient id="rcCloud" cx="42%" cy="30%" r="78%">
          <stop offset="0%" stop-color="#FFFFFF"/><stop offset="72%" stop-color="#F6F8F5"/><stop offset="100%" stop-color="#E7ECE8"/>
        </radialGradient>
        <radialGradient id="rcCat" cx="38%" cy="24%" r="90%">
          <stop offset="0%" stop-color="#FBFBFD"/><stop offset="70%" stop-color="#E9EAEE"/><stop offset="100%" stop-color="#D4D7DE"/>
        </radialGradient>
        <linearGradient id="rcSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F9E0C8"/><stop offset="100%" stop-color="#ECC4A0"/>
        </linearGradient>
        <linearGradient id="rcOrange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F8BA76"/><stop offset="100%" stop-color="#EC9C48"/>
        </linearGradient>
        <!-- 墙体明暗 overlay：左侧受光/右侧背光 -->
        <linearGradient id="rcWallSh" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity=".34"/><stop offset="45%" stop-color="#FFFFFF" stop-opacity="0"/>
          <stop offset="100%" stop-color="#8A6F4E" stop-opacity=".16"/>
        </linearGradient>
        <!-- 高光/暗部通用 -->
        <radialGradient id="rcHi" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity=".85"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="rcWarm" cx="38%" cy="30%" r="70%">
          <stop offset="0%" stop-color="#FFDFAE" stop-opacity=".22"/><stop offset="100%" stop-color="#FFDFAE" stop-opacity="0"/>
        </radialGradient>

        <!-- 柔和投影（小物体用） -->
        <filter id="rcShBlur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2"/>
        </filter>
        <!-- 柔和投影（底盘/大物体用） -->
        <filter id="rcShBig" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6.5"/>
        </filter>

        <!-- 黏土质感滤镜链：手捏边缘（低频位移）+ 像素颗粒（高频噪点，仅图形内） -->
        <filter id="rcClayFx" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves="2" seed="11" result="warp"/>
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="warped"/>
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" seed="5" stitchTiles="stitch" result="fine"/>
          <feColorMatrix in="fine" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.20 0 0 0 0" result="grain"/>
          <feComposite in="grain" in2="warped" operator="in" result="grainClip"/>
          <feComposite in="grainClip" in2="warped" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
        </filter>

        <!-- 商铺遮阳棚条纹裁剪 -->
        <clipPath id="rcAwClip">
          <path d="M146 122c0 5 4 8 8 8s8-3 8-8c0 5 4 8 8 8s8-3 8-8c0 5 4 8 8 8s8-3 8-8c0 5 4 8 8 8s8-3 8-8c0 5 4 8 8 8s8-3 8-8c0 5 4 8 8 8s8-3 8-8l-6-12H152Z"/>
        </clipPath>
      </defs>


      <!-- ===== 沙盘主体（黏土滤镜组：手捏边缘 + 像素颗粒） ===== -->
      <g filter="url(#rcClayFx)">
        <!-- 底盘投影（悬空柔影） -->
        <ellipse cx="180" cy="256" rx="148" ry="40" fill="#7E9B7A" opacity=".34" filter="url(#rcShBig)"/>
        <!-- 圆形底盘：台座 + 草地 -->
        <ellipse cx="180" cy="252" rx="162" ry="55" fill="#EDE5D4"/>
        <ellipse cx="180" cy="246" rx="152" ry="50" fill="#E2D9C4"/>
        <ellipse cx="180" cy="242" rx="146" ry="46" fill="url(#rcGrass)"/>
        <ellipse cx="180" cy="238" rx="138" ry="40" fill="url(#rcWarm)"/>
        <ellipse cx="150" cy="226" rx="52" ry="13" fill="#FFFFFF" opacity=".12"/>

        <!-- 房子A（左） -->
        <g>
          <ellipse cx="72" cy="208" rx="36" ry="9" fill="#6E946B" opacity=".45" filter="url(#rcShBlur)"/>
          <rect x="42" y="156" width="60" height="48" rx="9" fill="url(#rcWall)"/>
          <rect x="42" y="156" width="60" height="48" rx="9" fill="url(#rcWallSh)"/>
          <path d="M38 160 72 132l34 28Z" fill="url(#rcRoofA)"/>
          <path d="M56 143l16-13 16 13Z" fill="url(#rcHi)" opacity=".5"/>
          <rect x="47" y="152" width="6" height="10" rx="3" fill="#D9A468"/>
          <rect x="91" y="152" width="6" height="10" rx="3" fill="#D9A468"/>
          <rect x="63" y="178" width="18" height="16" rx="4" fill="#C9BFA8"/>
          <rect x="65" y="180" width="14" height="14" rx="3" fill="#9FC4DA"/>
          <circle cx="71" cy="188" r="1.6" fill="#F7F4EA"/>
          <rect x="66" y="167" width="12" height="9" rx="4.5" fill="#F3D9A8"/>
          <!-- 像素风高光点 -->
          <rect x="47" y="161" width="4" height="4" fill="#FFFFFF" opacity=".8"/>
          <rect x="53" y="165" width="3" height="3" fill="#FFFFFF" opacity=".55"/>
        </g>

        <!-- 商铺（中后 · 条纹遮阳棚） -->
        <g>
          <ellipse cx="180" cy="180" rx="42" ry="9" fill="#6E946B" opacity=".45" filter="url(#rcShBlur)"/>
          <rect x="152" y="126" width="56" height="50" rx="8" fill="url(#rcWall)"/>
          <rect x="152" y="126" width="56" height="50" rx="8" fill="url(#rcWallSh)"/>
          <!-- 遮阳棚：米白底 + 橙色条纹（扇形裁剪） -->
          <path d="M146 122h68l-6-12H152Z" fill="#F7F0E0"/>
          <g clip-path="url(#rcAwClip)">
            <rect x="146" y="106" width="68" height="26" fill="#F7F0E0"/>
            <rect x="152" y="106" width="9" height="26" fill="url(#rcOrange)"/>
            <rect x="166" y="106" width="9" height="26" fill="url(#rcOrange)"/>
            <rect x="180" y="106" width="9" height="26" fill="url(#rcOrange)"/>
            <rect x="194" y="106" width="9" height="26" fill="url(#rcOrange)"/>
            <rect x="208" y="106" width="6" height="26" fill="url(#rcOrange)"/>
          </g>
          <rect x="146" y="118" width="68" height="6" rx="3" fill="#E28F44"/>
          <ellipse cx="180" cy="114" rx="16" ry="4" fill="url(#rcHi)" opacity=".6"/>
          <rect x="162" y="146" width="16" height="18" rx="4" fill="#C9BFA8"/>
          <rect x="164" y="148" width="12" height="16" rx="3" fill="#B8DCE8"/>
          <rect x="186" y="146" width="16" height="14" rx="4" fill="#F3D9A8"/>
          <circle cx="197" cy="153" r="1.4" fill="#E8B26B"/>
          <rect x="156" y="146" width="4" height="14" rx="2" fill="#E4D8C2"/>
          <rect x="200" y="146" width="4" height="14" rx="2" fill="#E4D8C2"/>
          <!-- 像素风高光点 -->
          <rect x="155" y="131" width="4" height="4" fill="#FFFFFF" opacity=".75"/>
          <rect x="160" y="135" width="3" height="3" fill="#FFFFFF" opacity=".5"/>
        </g>

        <!-- 房子B（右） -->
        <g>
          <ellipse cx="286" cy="210" rx="35" ry="9" fill="#6E946B" opacity=".45" filter="url(#rcShBlur)"/>
          <rect x="258" y="160" width="56" height="46" rx="9" fill="url(#rcWall)"/>
          <rect x="258" y="160" width="56" height="46" rx="9" fill="url(#rcWallSh)"/>
          <path d="M254 164l32-26 32 26Z" fill="url(#rcRoofB)"/>
          <path d="M270 152l16-13 16 13Z" fill="url(#rcHi)" opacity=".5"/>
          <rect x="263" y="156" width="6" height="10" rx="3" fill="#D9A468"/>
          <rect x="303" y="156" width="6" height="10" rx="3" fill="#D9A468"/>
          <rect x="276" y="180" width="17" height="15" rx="4" fill="#C9BFA8"/>
          <rect x="278" y="182" width="13" height="13" rx="3" fill="#D9C6E4"/>
          <rect x="279" y="169" width="11" height="8" rx="4" fill="#F3D9A8"/>
          <!-- 像素风高光点 -->
          <rect x="263" y="165" width="4" height="4" fill="#FFFFFF" opacity=".8"/>
          <rect x="269" y="169" width="3" height="3" fill="#FFFFFF" opacity=".55"/>
        </g>

        <!-- 大树（中偏右 · 树下坐着男生和小银） -->
        <g>
          <ellipse cx="226" cy="226" rx="48" ry="11" fill="#6E946B" opacity=".5" filter="url(#rcShBlur)"/>
          <rect x="218" y="164" width="15" height="52" rx="7" fill="#C9A27E"/>
          <path d="M222 164c-2 10-1 20 3 26" stroke="#B58B66" stroke-width="2.4" fill="none" stroke-linecap="round"/>
          <circle cx="207" cy="152" r="27" fill="url(#rcLeaf)"/>
          <circle cx="240" cy="146" r="31" fill="url(#rcLeaf)"/>
          <circle cx="224" cy="128" r="26" fill="url(#rcLeaf)"/>
          <circle cx="238" cy="158" r="20" fill="url(#rcLeaf)"/>
          <!-- 树冠高光（柔 + 像素点混合） -->
          <ellipse cx="216" cy="130" rx="18" ry="10" fill="url(#rcHi)" opacity=".55"/>
          <circle cx="198" cy="140" r="3" fill="#FFFFFF" opacity=".4"/>
          <circle cx="243" cy="132" r="4" fill="#FFFFFF" opacity=".35"/>
          <circle cx="218" cy="150" r="2.6" fill="#E8654F" opacity=".8"/>
          <circle cx="236" cy="148" r="2.6" fill="#E8654F" opacity=".8"/>
          <rect x="232" y="124" width="4" height="4" fill="#FFFFFF" opacity=".85"/>
          <rect x="238" y="128" width="3" height="3" fill="#FFFFFF" opacity=".6"/>
          <rect x="210" y="144" width="3" height="3" fill="#FFFFFF" opacity=".6"/>
        </g>

        <!-- 男生（用户形象 · 短黑发+暖橙上衣 · 树下坐姿） -->
        <g>
          <ellipse cx="206" cy="236" rx="18" ry="5.5" fill="#6E946B" opacity=".55" filter="url(#rcShBlur)"/>
          <circle cx="206" cy="196" r="12.5" fill="url(#rcSkin)"/>
          <path d="M194.5 193c1-9 6.5-13 11.5-13s10.5 4 11.5 13c-2.5-5-6.5-7-11.5-7s-9 2-11.5 7Z" fill="#3E3A38"/>
          <circle cx="201.5" cy="196.5" r="1.5" fill="#3B3B3B"/>
          <circle cx="210.5" cy="196.5" r="1.5" fill="#3B3B3B"/>
          <path d="M203.5 202.5c1.6 1.4 3.4 1.4 5 0" stroke="#C97F5C" stroke-width="1.7" fill="none" stroke-linecap="round"/>
          <circle cx="197.8" cy="200.8" r="2" fill="#F2B8A0" opacity=".8"/>
          <circle cx="214.2" cy="200.8" r="2" fill="#F2B8A0" opacity=".8"/>
          <rect x="194" y="208" width="24" height="19" rx="9" fill="url(#rcOrange)"/>
          <rect x="196" y="224" width="8.5" height="9" rx="4" fill="#59646E"/>
          <rect x="207.5" y="224" width="8.5" height="9" rx="4" fill="#59646E"/>
          <rect x="199" y="210" width="4" height="15" rx="2" fill="#FFFFFF" opacity=".24"/>
          <ellipse cx="202" cy="211" rx="6" ry="3" fill="url(#rcHi)" opacity=".5"/>
        </g>

        <!-- 小银（银白色小猫 · 树下坐姿） -->
        <g>
          <ellipse cx="236" cy="238" rx="14" ry="5" fill="#6E946B" opacity=".5" filter="url(#rcShBlur)"/>
          <path d="M228 236c0-7 3.5-11 8-11s8 4 8 11Z" fill="url(#rcCat)"/>
          <circle cx="236" cy="218" r="9" fill="url(#rcCat)"/>
          <path d="M229.5 213.5 228 206.5l6 3.2Z" fill="url(#rcCat)"/>
          <path d="M242.5 213.5 244 206.5l-6 3.2Z" fill="url(#rcCat)"/>
          <path d="M230.4 212.6 229.8 208.9l2.8 1.7Z" fill="#F2C4C4"/>
          <path d="M241.6 212.6 242.2 208.9l-2.8 1.7Z" fill="#F2C4C4"/>
          <circle cx="233" cy="217.5" r="1.3" fill="#3B3B45"/>
          <circle cx="239" cy="217.5" r="1.3" fill="#3B3B45"/>
          <path d="M235.2 220.6c.5.5 1.1.5 1.6 0" stroke="#3B3B45" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          <ellipse cx="236" cy="221.8" rx="1" ry=".7" fill="#E4899B"/>
          <path d="M231.6 219.2l-3.4-.9M232.4 220.6l-2.6 1.4M240.4 219.2l3.4-.9M239.6 220.6l2.6 1.4" stroke="#B9BAC4" stroke-width=".9" stroke-linecap="round"/>
          <path d="M244 232c3.5-.8 5-3.4 4.4-6" stroke="#D8DAE1" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="226.5" cy="231" r="1" fill="#E4899B" opacity=".7"/>
          <circle cx="246" cy="228" r="1" fill="#E4899B" opacity=".7"/>
          <ellipse cx="233.5" cy="214.5" rx="4" ry="2.2" fill="url(#rcHi)" opacity=".6"/>
        </g>

        <!-- 小树（左前） -->
        <g>
          <ellipse cx="128" cy="250" rx="16" ry="5.5" fill="#6E946B" opacity=".5" filter="url(#rcShBlur)"/>
          <rect x="124.5" y="228" width="7" height="20" rx="3.5" fill="#C9A27E"/>
          <circle cx="128" cy="220" r="15" fill="url(#rcLeaf)"/>
          <circle cx="124" cy="217" r="2.4" fill="#FFFFFF" opacity=".3"/>
          <ellipse cx="124" cy="216" rx="7" ry="4" fill="url(#rcHi)" opacity=".5"/>
          <rect x="132" y="214" width="3" height="3" fill="#FFFFFF" opacity=".7"/>
        </g>

        <!-- 长椅（左前 · 木质） -->
        <g>
          <ellipse cx="86" cy="254" rx="28" ry="7" fill="#6E946B" opacity=".5" filter="url(#rcShBlur)"/>
          <rect x="60" y="238" width="52" height="7" rx="3.5" fill="#C9A27E"/>
          <rect x="60" y="228" width="52" height="6" rx="3" fill="#D4B08C"/>
          <rect x="60" y="222" width="52" height="5" rx="2.5" fill="#D4B08C"/>
          <rect x="64" y="230" width="6" height="20" rx="2.5" fill="#B58B66"/>
          <rect x="102" y="230" width="6" height="20" rx="2.5" fill="#B58B66"/>
          <rect x="62" y="243" width="48" height="4" rx="2" fill="#B58B66"/>
          <rect x="62" y="223" width="48" height="2.5" rx="1.2" fill="#FFFFFF" opacity=".4"/>
        </g>

        <!-- 邮筒（右前 · 红色） -->
        <g>
          <ellipse cx="272" cy="258" rx="14" ry="5" fill="#6E946B" opacity=".5" filter="url(#rcShBlur)"/>
          <rect x="263" y="216" width="18" height="38" rx="7" fill="#DE7B6C"/>
          <rect x="263" y="216" width="18" height="12" rx="6" fill="#E38B7D"/>
          <rect x="267" y="228" width="10" height="3.4" rx="1.7" fill="#C2604F"/>
          <rect x="269" y="236" width="6" height="8" rx="3" fill="#FBF2E2"/>
          <rect x="264" y="208" width="16" height="9" rx="4.5" fill="#E38B7D"/>
          <rect x="265" y="205" width="14" height="6" rx="3" fill="#DE7B6C"/>
          <rect x="264.5" y="213" width="4" height="4" rx="1.6" fill="#C2604F"/>
          <rect x="265" y="219" width="4" height="4" fill="#FFFFFF" opacity=".7"/>
          <rect x="270" y="224" width="3" height="3" fill="#FFFFFF" opacity=".5"/>
        </g>

        <!-- 小草点缀 -->
        <path d="M148 252c1.5-3 4-4 6-3.6M156 256c1.5-3 4-4 6-3.6M226 258c1.5-3 4-4 6-3.6M98 262c1.5-3 4-4 6-3.6M306 248c1.5-3 4-4 6-3.6" stroke="#7FB07C" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle cx="140" cy="262" r="2.2" fill="#E8654F" opacity=".65"/>
        <circle cx="252" cy="264" r="2" fill="#F2C94C" opacity=".75"/>
        <circle cx="190" cy="268" r="2" fill="#E8654F" opacity=".55"/>
      </g>
    </svg>`;
  },

  // ==================== 「我的记录」下拉菜单 ====================
  _rec99MenuHtml() {
    return `<div class="rec99-menu" id="rec99Menu">
      <div class="rec99-menu-t">选择分类 · 直达</div>
      ${this._rec99Cats().map(c => `<button type="button" onclick="App.rec99MenuGo('${c.k}')">${c.ico} ${c.n}</button>`).join('')}
    </div>`;
  },
  rec99MenuToggle(e) {
    e.stopPropagation();
    const m = document.getElementById('rec99Menu');
    const sel = document.getElementById('rec99SelBtn');
    const open = m ? m.classList.toggle('open') : false;
    if (sel) sel.classList.toggle('active', open);
  },
  rec99MenuGo(k) {
    const m = document.getElementById('rec99Menu');
    if (m) m.classList.remove('open');
    this.gotoWb(k);
  },

  // ==================== 爱心气泡动画 ====================
  rec99Hearts(btn) {
    const emo = ['♥', '❤', '💗', '💕', '💖'];
    for (let i = 0; i < 7; i++) {
      const h = document.createElement('i');
      h.className = 'rec99-hfloat';
      h.textContent = emo[i % emo.length];
      h.style.left = (10 + Math.random() * 80) + '%';
      h.style.setProperty('--dx', (Math.random() * 36 - 18).toFixed(0) + 'px');
      h.style.setProperty('--dur', (0.9 + Math.random() * 0.9).toFixed(2) + 's');
      h.style.setProperty('--sc', (0.7 + Math.random() * 0.8).toFixed(2));
      btn.appendChild(h);
      setTimeout(() => { try { h.remove(); } catch (e) {} }, 2000);
    }
  },

  // ==================== 「记一笔」底部上拉面板 ====================
  _rec99SheetHtml() {
    return `<div class="rec99-mask" id="rec99Mask" onclick="App.rec99MaskTap(event)">
      <div class="rec99-sheet" id="rec99Sheet">
        <div class="rec99-grab" id="rec99Grab" onclick="App._rec99GrabTap()" title="下拉收回"><i></i><span>下拉收回</span></div>
        <div class="rec99-sheet-head">
          <div class="rec99-sheet-title">记一笔</div>
          <div class="rec99-sheet-tip">长按分类 1 秒 · 碎裂进入</div>
        </div>
        <div class="rec99-input">
          <span class="rec99-input-tag" id="rec99CatTag">灵光 💡</span>
          <textarea id="rec99Text" rows="4" placeholder="现在，记点什么…"></textarea>
        </div>
        <div class="rec99-cats" id="rec99Cats">
          ${this._rec99Cats().map(c => `<button type="button" class="rec99-cat${c.k === (this._rec99State().cat) ? ' on' : ''}" data-k="${c.k}" data-wb="${c.k}">
            <span class="rec99-cat-ico">${c.ico}</span><span class="rec99-cat-n">${c.n}</span>
          </button>`).join('')}
        </div>
        <div class="rec99-sheet-foot">
          <button type="button" class="rec99-save" onclick="App.rec99SheetSave()">记下</button>
          <span class="rec99-savenote">保存到当前分组</span>
        </div>
      </div>
    </div>`;
  },

  rec99SheetOpen() {
    const st = this._rec99State();
    st.open = true;
    st.shattered = false;
    const mask = document.getElementById('rec99Mask');
    const tag = document.getElementById('rec99CatTag');
    const c = this._rec99Cat(st.cat);
    if (mask) mask.classList.add('open');
    if (tag) tag.textContent = `${c.n} ${c.ico}`;
    // v12.9.5 修复：mask 渲染在 .app-layout（z-index:1 层叠上下文）内部，左下角悬浮 dock（body 直接子元素 z-index:50）会盖住面板底部「记下」按钮 —— 打开时暂时藏起 dock
    try { document.body.classList.add('rec99-sheet-open'); } catch (e) {}
    setTimeout(() => { try { const ta = document.getElementById('rec99Text'); if (ta) ta.focus({ preventScroll: true }); } catch (e) {} }, 380);
  },
  // 点遮罩收回（有内容 → 提醒是否保存）
  rec99MaskTap(e) {
    if (e.target && e.target.closest && e.target.closest('.rec99-sheet')) return;
    this.rec99SheetClose();
  },
  // 桌面端鼠标拖拽释放后浏览器会向拖拽条补发一次 click —— 拖拽刚结束的短窗口内忽略，避免双弹窗
  _rec99DragJustEnded() {
    const st = this._rec99State();
    return !!(st.dragEndedAt && (Date.now() - st.dragEndedAt) < 400);
  },
  rec99SheetClose(force) {
    const st = this._rec99State();
    if (!st.open) return;
    const ta = document.getElementById('rec99Text');
    const text = ((ta && ta.value) || '').trim();
    if (!force && text) {
      const c = this._rec99Cat(st.cat);
      this._modal({
        title: '💾 还有没记完的内容',
        body: `<div style="font-size:13px;color:var(--text-soft);line-height:1.8">面板要收起来了——这段文字要怎么处理？（当前分组：<b>${c.n} ${c.ico}</b>）</div>`,
        actions: [
          { label: '继续编辑', onClick: () => true },
          { label: '丢弃', onClick: () => { App._rec99SheetCloseNow(); } },
          { label: `保存到${c.n}`, primary: true, onClick: () => { App.rec99SheetSave(); } },
        ],
      });
      return;
    }
    this._rec99SheetCloseNow();
  },
  _rec99SheetCloseNow() {
    const st = this._rec99State();
    st.open = false;
    const mask = document.getElementById('rec99Mask');
    const sheet = document.getElementById('rec99Sheet');
    const ta = document.getElementById('rec99Text');
    if (mask) mask.classList.remove('open');
    if (sheet) sheet.style.transform = '';
    if (ta) ta.value = '';
    try { document.body.classList.remove('rec99-sheet-open'); } catch (e) {}
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
  },

  // —— 分类按钮：点击选分组 / 长按 1 秒碎裂进入 ——
  rec99Pick(k) {
    const st = this._rec99State();
    st.cat = k;
    const c = this._rec99Cat(k);
    const tag = document.getElementById('rec99CatTag');
    if (tag) tag.textContent = `${c.n} ${c.ico}`;
    document.querySelectorAll('#rec99Cats .rec99-cat').forEach(b => b.classList.toggle('on', b.getAttribute('data-k') === k));
  },
  _rec99PressStart(btn) {
    const st = this._rec99State();
    this._rec99PressCancel();
    st.shattered = false;
    btn.classList.add('holding');
    st.pressBtn = btn;
    const t0 = performance.now();
    const DUR = 1000;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / DUR);
      try { btn.style.setProperty('--a', Math.round(p * 360) + 'deg'); } catch (e) {}
      if (p < 1) { st.pressRaf = requestAnimationFrame(step); }
      else this._rec99Shatter(btn);
    };
    st.pressRaf = requestAnimationFrame(step);
  },
  _rec99PressCancel() {
    const st = this._rec99State();
    if (st.pressRaf) cancelAnimationFrame(st.pressRaf);
    st.pressRaf = 0;
    if (st.pressBtn) {
      st.pressBtn.classList.remove('holding');
      st.pressBtn.style.removeProperty('--a');
      st.pressBtn = null;
    }
  },
  // 长按满 1 秒：按钮碎裂（裂纹 + 碎片飞散）→ 进入对应页面
  _rec99Shatter(btn) {
    const st = this._rec99State();
    if (st.shattered) return;
    st.shattered = true;
    const wb = btn.getAttribute('data-wb');
    btn.classList.add('shatter');
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('i');
      s.className = 'rec99-shard';
      const ang = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
      s.style.setProperty('--tx', Math.round(Math.cos(ang) * (36 + Math.random() * 28)) + 'px');
      s.style.setProperty('--ty', Math.round(Math.sin(ang) * (30 + Math.random() * 24)) + 'px');
      s.style.setProperty('--r', Math.round(Math.random() * 240 - 120) + 'deg');
      s.style.setProperty('--sz', (4 + Math.random() * 5).toFixed(1) + 'px');
      btn.appendChild(s);
    }
    setTimeout(() => {
      const sheet = document.getElementById('rec99Sheet');
      if (sheet) sheet.style.transform = '';
      this._rec99SheetCloseNow();
      if (wb) this.gotoWb(wb);
    }, 430);
  },

  // —— 「记下」：按当前分组写入对应数据仓 ——
  rec99SheetSave(fromClose) {
    const st = this._rec99State();
    const ta = document.getElementById('rec99Text');
    const text = ((ta && ta.value) || '').trim();
    if (!text) { this._flash('先写点什么，再「记下」～'); return false; }
    const k = st.cat;
    const d = Store.load();
    let msg = '';
    const now = new Date().toISOString();
    if (k === 'sparks99') {
      if (!Array.isArray(d.wbSparks99)) d.wbSparks99 = [];
      d.wbSparks99.unshift({ id: Store._id(), date: Store.today(), ts: now, kind: 'idea', text, star: false });
      msg = '✨ 灵光已收进瓶子';
    } else if (k === 'regrets99') {
      if (!Array.isArray(d.wbRegrets99)) d.wbRegrets99 = [];
      d.wbRegrets99.unshift({ id: Store._id(), date: Store.today(), ts: now, text, hits: 0, healed: false });
      msg = '🌊 憾事已入憾潮——想发泄就去打它两拳';
    } else if (k === 'dream99') {
      if (!Array.isArray(d.wbDreams99)) d.wbDreams99 = [];
      d.wbDreams99.unshift({ id: Store._id(), date: Store.today(), ts: now, title: '', raw: text, text, mood: 0, lucid: false, wake: !!(this._dream99WakeWindow && this._dream99WakeWindow()), polished: false });
      msg = '🌙 已收进梦境本';
    } else if (k === 'footprints99') {
      if (!Array.isArray(d.wbTravel99)) d.wbTravel99 = [];
      d.wbTravel99.unshift({ id: Store._id(), date: Store.today(), place: '', title: '', text, ts: now });
      msg = '👣 旅记已存好——可去足迹页补上地点';
    } else if (k === 'notes99') {
      if (!Array.isArray(d.wbNotes99)) d.wbNotes99 = [];
      d.wbNotes99.unshift({ id: Store._id(), date: Store.today(), kind: '大事记', title: '', text, ts: now });
      msg = '🏛️ 大事已铭记';
    } else if (k === 'drift99') {
      let o = d.wbDrift99;
      if (!o || typeof o !== 'object' || Array.isArray(o)) o = d.wbDrift99 = { bottles: [], creatures: {}, salvages: 0, lastSalvageTs: 0, discarded: 0 };
      if (!Array.isArray(o.bottles)) o.bottles = [];
      const days = 7;
      o.bottles.unshift({ id: Store._id(), date: Store.today(), ts: now, days, endsAt: Date.now() + days * 86400000, seal: (this._drift99Seal ? this._drift99Seal(text) : ('raw:' + text)), released: false, releasedTs: '', opened: false, openedTs: '', salvages: 0 });
      msg = '🍾 心事已封进漂流瓶——7 天里你我都看不到它';
    } else if (k === 'readingNotes') {
      const rn = d.readingNotes || (d.readingNotes = { books: [], notes: [] });
      if (!Array.isArray(rn.notes)) rn.notes = [];
      rn.notes.unshift({ id: Store._id(), bookId: '', chapter: '', page: '', quote: '', thoughts: text, actions: [], rating: 0, tags: [], createdAt: now, updatedAt: now });
      msg = '📖 读感已记下——可去书架关联书籍';
    } else if (k === 'diary') {
      if (!Array.isArray(d.diaries)) d.diaries = [];
      d.diaries.unshift({ id: Store._id(), date: Store.today(), title: '', content: text, tags: [], mood: 0, images: [], updated: now });
      msg = '📔 今日日记已写好';
    }
    Store.save(d);
    this._flash(msg);
    this._rec99SheetCloseNow();
    // v12.9.31 独行信条：分类记录奖励（≥100 字 + 阿福审核通过 → 经验 +1 · 宝石 +1 · 每日一次；审核不通过不阻断保存）
    try { if (this.rpg99RecAward) this.rpg99RecAward(text, this._rec99Cat(k).n); } catch (e) {}
    return true;
  },

  // ==================== 旅记（足迹页 · 记录旅行时发生的事）====================
  travel99Add() {
    const date = ((document.getElementById('tv99Date') || {}).value) || Store.today();
    const place = (((document.getElementById('tv99Place') || {}).value) || '').trim();
    const text = (((document.getElementById('tv99Text') || {}).value) || '').trim();
    if (!place && !text) return this._flash('地点和内容至少填一个——旅行才有故事～');
    const d = Store.load();
    if (!Array.isArray(d.wbTravel99)) d.wbTravel99 = [];
    d.wbTravel99.unshift({ id: Store._id(), date, place, title: '', text, ts: new Date().toISOString() });
    Store.save(d);
    this._flash('✈️ 旅记已存好');
    this.render_workbench();
  },
  travel99Del(id) {
    if (!confirm('确认删除这段旅记？')) return;
    const d = Store.load();
    d.wbTravel99 = (d.wbTravel99 || []).filter(t => t.id !== id);
    Store.save(d);
    this.render_workbench();
  },
});

// ==================== 全局事件委托（面板分类按钮：点击选组 / 长按碎裂 / 拖拽收回）====================
(function () {
  const doc = document;
  // 长按开始（分类按钮）
  doc.addEventListener('pointerdown', (e) => {
    const cat = e.target.closest ? e.target.closest('#rec99Cats .rec99-cat') : null;
    if (cat && App && App._rec99PressStart) {
      App._rec99PressStart(cat);
      return;
    }
    // 面板拖拽收回：按住拖拽条（或面板头部空白区）
    const grab = e.target.closest ? e.target.closest('#rec99Grab, #rec99Sheet .rec99-sheet-head') : null;
    if (grab && App && App.rec99SheetDragStart) {
      App.rec99SheetDragStart(e);
    }
  }, { passive: true });
  // 长按取消（抬起 / 移出 / 移动超过阈值视为滑动而非长按）
  const cancelPress = (e) => {
    if (App && App._rec99PressCancel) App._rec99PressCancel();
  };
  doc.addEventListener('pointerup', cancelPress, { passive: true });
  doc.addEventListener('pointercancel', cancelPress, { passive: true });
  doc.addEventListener('pointermove', (e) => {
    if (App && App.rec99SheetDragMove) App.rec99SheetDragMove(e);
    const st = App && App._rec99State ? App._rec99State() : null;
    if (st && st.pressBtn && st.pressBtn.parentElement) {
      const r = st.pressBtn.getBoundingClientRect();
      if (e.clientX < r.left - 8 || e.clientX > r.right + 8 || e.clientY < r.top - 8 || e.clientY > r.bottom + 8) {
        if (App._rec99PressCancel) App._rec99PressCancel();
      }
    }
  }, { passive: true });
  // 分类按钮点击（短按 = 选分组；碎裂后忽略）
  doc.addEventListener('click', (e) => {
    const cat = e.target.closest ? e.target.closest('#rec99Cats .rec99-cat') : null;
    if (cat && App && App.rec99Pick) {
      if (cat.classList.contains('shatter')) return;
      App.rec99Pick(cat.getAttribute('data-k'));
      return;
    }
    // 点空白处收起「我的记录」下拉菜单
    const menu = document.getElementById('rec99Menu');
    const selBtn = e.target.closest ? e.target.closest('#rec99SelBtn') : null;
    if (menu && menu.classList.contains('open') && !selBtn) menu.classList.remove('open');
  });
  // 拖拽结束
  const endDrag = () => { if (App && App._rec99SheetDragEnd) App._rec99SheetDragEnd(); };
  doc.addEventListener('pointerup', endDrag, { passive: true });
  doc.addEventListener('pointercancel', endDrag, { passive: true });
})();

// 面板拖拽收回的实现（挂到 App 上，供上方委托调用）
Object.assign(App, {
  rec99SheetDragStart(e) {
    const st = this._rec99State();
    if (!st.open) return;
    st.dragOn = true;
    st.dragStartY = e.clientY || 0;
    st.dragY = 0;
    const sheet = document.getElementById('rec99Sheet');
    if (sheet) sheet.classList.add('dragging');
  },
  rec99SheetDragMove(e) {
    const st = this._rec99State();
    if (!st.dragOn) return;
    const dy = Math.max(0, (e.clientY || 0) - st.dragStartY);
    st.dragY = dy;
    const sheet = document.getElementById('rec99Sheet');
    if (sheet) sheet.style.transform = dy ? `translateY(${dy}px)` : '';
  },
  _rec99SheetDragEnd() {
    const st = this._rec99State();
    if (!st.dragOn) return;
    st.dragOn = false;
    const sheet = document.getElementById('rec99Sheet');
    if (sheet) sheet.classList.remove('dragging');
    if (st.dragY > 70) {  // 下拉超过阈值 → 收回（有内容会先弹三选提醒；先弹回原位再决定去留）
      st.dragEndedAt = Date.now();
      st.dragY = 0;
      if (sheet) sheet.style.transform = '';
      this.rec99SheetClose();
      return;
    }
    if (st.dragY > 8) st.dragEndedAt = Date.now();  // 拖动过但未达阈值：同样吞掉随后的补发 click
    st.dragY = 0;
    if (sheet) sheet.style.transform = '';
  },
  // 拖拽条单击（无拖拽位移时）：等同下拉收回
  _rec99GrabTap() {
    if (this._rec99DragJustEnded()) return;
    this.rec99SheetClose();
  },
});
