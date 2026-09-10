// 75-home99.js —— v11.8 【小家】：用户的小家（原「空间」板块全面重构）
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   v12.7c 美术统一：小家全面像素风（与小银像素猫/像素阿福/个人形象头像同风格）——
//   家具/花/商品图标 = 低分辨率画布作画 + 最近邻放大（8-bit 硬边颗粒感，canvas 生成，零图片资源）；
//   墙纸/地板/窗景 = SVG 大格子像素 pattern；旧的高精度平滑 SVG 绘制代码已整体删除。
//   · 主场景：像素房间（壁纸/地板/窗景随真实时间昼夜流转/像素家具/小银入住/花盆列）
//   · 养花：6 种花种子（宝石购买）→ 种子→发芽→幼苗→花苞→盛开；浇水当日 1.6× 加速；不浇水不枯萎（无压力设计）
//   · 小家商城：壁纸 × 地板 × 家具 × 花盆位 + 花种子（宝石只增不减，此处仅消耗）
//   · 数据：独立 localStorage 键 one-xing-home-v1（不进主存档，随浏览器数据一并清理，不参与云同步——与宠物同策略）
// ==================== 像素绘制引擎 ====================
// 在 w×h 的低分辨率格子画布上作画，再禁用平滑放大 scale 倍 → 真·像素风 sprite（硬边颗粒）
(function () {
  try {
    const SPRITE = {};
    const px = (w, h, scale, draw) => {
      const s = document.createElement('canvas'); s.width = w; s.height = h;
      draw(s.getContext('2d'));
      const o = document.createElement('canvas'); o.width = w * scale; o.height = h * scale;
      const k = o.getContext('2d');
      k.imageSmoothingEnabled = false;
      k.drawImage(s, 0, 0, o.width, o.height);
      return o.toDataURL();
    };
    const dot = (c, col, x, y, r) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };

    // —— 家具 ——
    SPRITE.clock = px(13, 13, 4, (c) => {
      dot(c, '#a0622d', 6.5, 6, 5.5); dot(c, '#fde68a', 6.5, 6, 4.3);
      c.fillStyle = '#2d2a32';
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.fillRect(Math.round(6.5 + Math.cos(a) * 3.8) - (i % 3 === 0 ? 1 : 0), Math.round(6 + Math.sin(a) * 3.8) - (i % 3 === 0 ? 1 : 0), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1); }
      c.strokeStyle = '#2d2a32'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(6.5, 6); c.lineTo(6.5, 3.2); c.stroke();          // 时针
      c.beginPath(); c.moveTo(6.5, 6.2); c.lineTo(9.2, 6.2); c.stroke();        // 分针
      dot(c, '#a0622d', 6.5, 6, 0.8);
      c.fillStyle = '#8a5a2e'; c.fillRect(5.5, 11, 2, 2);                        // 布谷鸟门
    });
    SPRITE.painting = px(18, 13, 5, (c) => {
      c.fillStyle = '#a0622d'; c.fillRect(0, 0, 18, 13);
      c.fillStyle = '#bae6fd'; c.fillRect(2, 2, 14, 9);
      dot(c, '#fbbf24', 13, 4, 1.5);                                             // 太阳
      c.fillStyle = '#65a30d'; c.fillRect(2, 6, 4, 5); c.fillStyle = '#84cc16'; c.fillRect(6, 4, 4, 7);
      c.fillStyle = '#7dd3fc'; c.fillRect(10, 8, 6, 1);                         // 河流
    });
    SPRITE.rug = px(26, 10, 12, (c) => {
      dot(c, '#c084fc', 13, 5, 9); dot(c, '#ddd6fe', 13, 5, 7); dot(c, '#c4b5fd', 13, 5, 4.5);
      c.fillStyle = '#fef9c3';
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.fillRect(Math.round(13 + Math.cos(a) * 5.8), Math.round(5 + Math.sin(a) * 5.8), 1, 1); }
    });
    SPRITE.lamp = px(11, 26, 7, (c) => {
      c.fillStyle = '#8a5a2e'; c.fillRect(1, 24, 9, 2); c.fillRect(5, 11, 1, 13);
      c.fillStyle = '#fde68a'; c.beginPath(); c.moveTo(2, 1); c.lineTo(9, 1); c.lineTo(10, 11); c.lineTo(1, 11); c.closePath(); c.fill();
      c.fillStyle = '#fdba74'; c.fillRect(2, 0, 7, 1);
      c.fillStyle = '#b45309'; c.fillRect(1, 11, 9, 1);
    });
    SPRITE.cushion = px(20, 7, 6, (c) => {
      dot(c, '#f472b6', 10, 3.5, 9); dot(c, '#fbcfe8', 10, 3.5, 7); dot(c, '#f9a8d4', 10, 3.5, 4.5);
      c.fillStyle = '#fdf6ec'; c.fillRect(8, 2, 4, 3);                           // 爪印中心
      c.fillRect(7, 0, 2, 2); c.fillRect(11, 0, 2, 2); c.fillRect(7, 5, 2, 2); c.fillRect(11, 5, 2, 2);
    });
    SPRITE.teaset = px(22, 13, 6, (c) => {
      c.fillStyle = '#a0622d'; c.fillRect(1, 3, 20, 2);                          // 桌面
      c.fillStyle = '#8a5a2e'; c.fillRect(2, 5, 2, 7); c.fillRect(18, 5, 2, 7);  // 桌腿
      c.fillStyle = '#f8fafc'; c.fillRect(7, 0, 6, 3);                            // 茶壶
      c.fillStyle = '#94a3b8'; c.fillRect(13, 1, 2, 1); c.fillRect(8, 0, 1, 1);
      c.fillStyle = '#f8fafc'; c.fillRect(16, 2, 3, 2);                           // 茶杯
      c.fillStyle = '#cbd5e1'; c.fillRect(8, -0, 4, 1);                           // 蒸汽位
    });
    SPRITE.bookshelf = px(15, 22, 7, (c) => {
      c.fillStyle = '#a0622d'; c.fillRect(0, 0, 15, 22);
      c.fillStyle = '#b07840'; c.fillRect(1, 1, 13, 20);
      const cols = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777'];
      for (let row = 0; row < 3; row++) {
        const y = 1 + row * 7;
        c.fillStyle = '#8a5a2e'; c.fillRect(1, y + 5, 13, 1);
        for (let i = 0; i < 7; i++) { const h = 3 + (i * 7 + row * 5) % 3; c.fillStyle = cols[(i + row) % 7]; c.fillRect(2 + i * 2, y + 5 - h, 1.4, h); }
      }
    });
    SPRITE.sofa = px(26, 15, 6, (c) => {
      c.fillStyle = '#bbf7d0'; c.fillRect(2, 5, 22, 5);                           // 坐垫
      c.fillStyle = '#4ade80'; c.fillRect(0, 1, 4, 11); c.fillRect(22, 1, 4, 11); // 扶手
      c.fillStyle = '#86efac'; c.fillRect(4, 1, 18, 4);                           // 靠背
      c.fillStyle = '#16a34a'; c.fillRect(3, 13, 3, 2); c.fillRect(20, 13, 3, 2); // 腿
    });
    SPRITE.fishtank = px(13, 11, 8, (c) => {
      c.fillStyle = '#a0622d'; c.fillRect(0, 9, 13, 2);
      c.fillStyle = '#bae6fd'; c.fillRect(0, 0, 13, 9);
      c.fillStyle = '#fde68a'; c.fillRect(0, 7, 13, 2);                           // 沙底
      c.fillStyle = '#5eaae7'; c.fillRect(3, 3, 3, 2);                            // 蓝鱼
      c.fillStyle = '#fb923c'; c.fillRect(8, 4, 2, 2);                            // 橙鱼
      c.fillStyle = '#fff'; c.fillRect(0, 0, 13, 1);                              // 水面高光
    });
    // —— v12.9.34 家具变体（商城新款；初始五件套用原款，这里卖不同风格/配色）——
    SPRITE.bookshelf2 = px(15, 22, 7, (c) => {
      c.fillStyle = '#5c3a21'; c.fillRect(0, 0, 15, 22);                          // 胡桃木深壳
      c.fillStyle = '#6d4827'; c.fillRect(1, 1, 13, 20);
      const cols = ['#0e7490', '#65a30d', '#f59e0b', '#7c3aed', '#0284c7', '#15803d', '#dc2626'];
      for (let row = 0; row < 3; row++) {
        const y = 1 + row * 7;
        c.fillStyle = '#4a2e18'; c.fillRect(1, y + 5, 13, 1);
        for (let i = 0; i < 7; i++) { const hh = 3 + (i * 5 + row * 3) % 3; c.fillStyle = cols[(i + row * 2) % 7]; c.fillRect(2 + i * 2, y + 5 - hh, 1.4, hh); }
      }
    });
    SPRITE.painting2 = px(18, 13, 5, (c) => {
      c.fillStyle = '#5c3a21'; c.fillRect(0, 0, 18, 13);                          // 深木框 · 海浪
      c.fillStyle = '#a5f3fc'; c.fillRect(2, 2, 14, 9);
      c.fillStyle = '#0891b2'; c.fillRect(2, 7, 14, 4);                          // 海
      c.fillStyle = '#67e8f9'; c.fillRect(3, 6, 4, 1); c.fillRect(9, 8, 5, 1);    // 浪尖
      c.fillStyle = '#fff'; c.fillRect(8, 2, 3, 5); c.fillRect(9, 3, 1, 4);       // 帆
      c.fillRect(7, 7, 5, 1);
    });
    SPRITE.lamp2 = px(11, 26, 7, (c) => {
      c.fillStyle = '#5c3a21'; c.fillRect(1, 24, 9, 2); c.fillRect(5, 11, 1, 13); // 月光落地灯
      c.fillStyle = '#e0f2fe'; c.beginPath(); c.moveTo(2, 1); c.lineTo(9, 1); c.lineTo(10, 11); c.lineTo(1, 11); c.closePath(); c.fill();
      c.fillStyle = '#bae6fd'; c.fillRect(2, 0, 7, 1);
      c.fillStyle = '#38bdf8'; c.fillRect(1, 11, 9, 1);
    });
    SPRITE.rug2 = px(26, 10, 12, (c) => {                                          // 苔原圆毯：绿系
      dot(c, '#4ade80', 13, 5, 9); dot(c, '#bbf7d0', 13, 5, 7); dot(c, '#86efac', 13, 5, 4.5);
      c.fillStyle = '#fef9c3';
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.fillRect(Math.round(13 + Math.cos(a) * 5.8), Math.round(5 + Math.sin(a) * 5.8), 1, 1); }
    });
    SPRITE.cushion2 = px(20, 7, 6, (c) => {                                        // 蓝莓软垫
      dot(c, '#60a5fa', 10, 3.5, 9); dot(c, '#bfdbfe', 10, 3.5, 7); dot(c, '#93c5fd', 10, 3.5, 4.5);
      c.fillStyle = '#eff6ff'; c.fillRect(8, 2, 4, 3);
      c.fillRect(7, 0, 2, 2); c.fillRect(11, 0, 2, 2); c.fillRect(7, 5, 2, 2); c.fillRect(11, 5, 2, 2);
    });
    SPRITE.pot = px(10, 9, 5, (c) => {
      c.fillStyle = '#c2724b'; c.fillRect(1, 2, 8, 6);
      c.fillStyle = '#a05a3a'; c.fillRect(2, 3, 6, 1);
      c.fillStyle = '#6b4a32'; c.fillRect(0, 1, 10, 2);                          // 沿口土面
      c.fillStyle = '#8a5a2e'; c.fillRect(1, 8, 2, 1); c.fillRect(7, 8, 2, 1);
    });
    // —— 花头（6 种；也作商城种子图标）——
    const HEAD = {
      daisy: (c) => { c.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; dot(c, '#fff', 5.5 + Math.cos(a) * 3.4, 5.5 + Math.sin(a) * 3.4, 1.7); } dot(c, '#facc15', 5.5, 5.5, 2.2); dot(c, '#eab308', 5.5, 5.5, 1); },
      tulip: (c) => { c.fillStyle = '#fb7185'; c.beginPath(); c.moveTo(2, 3); c.quadraticCurveTo(2, 9.5, 5.5, 9.5); c.quadraticCurveTo(9, 9.5, 9, 3); c.lineTo(7.5, 1); c.lineTo(5.5, 3); c.lineTo(3.5, 1); c.closePath(); c.fill(); c.fillStyle = '#fda4af'; c.fillRect(3, 3, 1, 4); },
      sunflower: (c) => { c.fillStyle = '#fbbf24'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; dot(c, '#fbbf24', 5.5 + Math.cos(a) * 4, 5.5 + Math.sin(a) * 4, 1.4); } dot(c, '#78350f', 5.5, 5.5, 2.8); dot(c, '#92400e', 5.5, 5.5, 1.6); },
      lavender: (c) => { for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#a78bfa' : '#8b5cf6'; c.fillRect(4 - Math.round(i * 0.5) / 2, 1 + i * 1.7, 3 + i * 0.4, 1.6); } c.fillStyle = '#c4b5fd'; c.fillRect(5, 9, 1, 2); },
      rose: (c) => { dot(c, '#be123c', 5.5, 5.5, 4.5); dot(c, '#e11d48', 5.5, 5.5, 3.2); dot(c, '#f43f5e', 5.5, 5.5, 2); c.fillStyle = '#fecdd3'; c.fillRect(4, 4, 1, 1); c.fillRect(6, 6, 1, 1); },
      sakura: (c) => { c.fillStyle = '#f9a8d4'; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; dot(c, i % 2 ? '#fbcfe8' : '#f9a8d4', 5.5 + Math.cos(a) * 3.4, 5.5 + Math.sin(a) * 3.4, 2); } dot(c, '#fde68a', 5.5, 5.5, 1.4); },
    };
    Object.keys(HEAD).forEach(k => { SPRITE['head_' + k] = px(11, 11, 4, HEAD[k]); });
    // —— 壁纸/地板像素预览块（16×16 格 ×3 放大；商城图标 + 与房间 pattern 同色系）——
    SPRITE.wall_honey = px(16, 16, 3, (c) => {
      c.fillStyle = '#fef3c7'; c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#fde68a'; c.fillRect(3, 0, 3, 16); c.fillRect(11, 0, 3, 16);
    });
    SPRITE.floor_pine = px(16, 16, 3, (c) => {
      c.fillStyle = '#d6a26f'; c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#c2895a'; c.fillRect(0, 5, 16, 1); c.fillRect(0, 11, 16, 1); c.fillRect(5, 0, 1, 5); c.fillRect(11, 6, 1, 5);
    });
    SPRITE.wall_cream = px(16, 16, 3, (c) => {
      c.fillStyle = '#fdf6ec'; c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#f3e2c9'; c.fillRect(3, 3, 2, 2); c.fillRect(11, 10, 2, 2); c.fillRect(6, 13, 1, 1);
    });
    SPRITE.wall_mint = px(16, 16, 3, (c) => {
      c.fillStyle = '#ecfdf5'; c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#a7f3d0'; c.fillRect(3, 4, 6, 2); c.fillRect(6, 5, 1, 2); c.fillRect(11, 11, 2, 2);
      c.fillStyle = '#6ee7b7'; c.fillRect(11, 3, 2, 2); c.fillRect(3, 12, 1, 1);
    });
    SPRITE.wall_sunset = px(16, 16, 3, (c) => {
      c.fillStyle = '#fff7ed'; c.fillRect(0, 0, 16, 8); c.fillStyle = '#ffe4e6'; c.fillRect(0, 8, 16, 8);
      c.fillStyle = '#fda4af'; c.fillRect(3, 3, 2, 2); c.fillRect(11, 12, 2, 2); c.fillRect(8, 6, 1, 1);
      c.fillStyle = '#fdba74'; c.fillRect(12, 4, 2, 2); c.fillRect(4, 11, 1, 1);
    });
    SPRITE.wall_starry = px(16, 16, 3, (c) => {
      c.fillStyle = '#312e81'; c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#fef9c3'; c.fillRect(3, 4, 1, 1); c.fillRect(11, 2, 1, 1); c.fillRect(13, 10, 2, 1); c.fillRect(5, 12, 1, 2);
      c.fillStyle = '#c7d2fe'; c.fillRect(7, 7, 1, 1); c.fillRect(2, 9, 1, 1);
    });
    SPRITE.floor_wood = px(16, 16, 3, (c) => {
      c.fillStyle = '#d9a066'; c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#c98a52'; c.fillRect(0, 0, 7, 7); c.fillRect(8, 8, 7, 7); c.fillRect(8, 0, 7, 7); c.fillRect(0, 8, 7, 7);
      c.fillStyle = '#b07840'; c.fillRect(7, 0, 1, 16); c.fillRect(0, 7, 16, 1);
    });
    SPRITE.floor_plaid = px(16, 16, 3, (c) => {
      c.fillStyle = '#fef3c7'; c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#fde68a'; c.fillRect(0, 0, 8, 8); c.fillRect(8, 8, 8, 8);
      c.fillStyle = '#fbbf24'; c.fillRect(0, 7, 16, 1); c.fillRect(7, 0, 1, 16);
    });
    SPRITE.floor_carpet = px(16, 16, 3, (c) => {
      c.fillStyle = '#fce7f3'; c.fillRect(0, 0, 16, 16);
      c.fillStyle = '#fbcfe8'; c.fillRect(0, 0, 16, 2); c.fillRect(0, 14, 16, 2);
      c.fillStyle = '#f9a8d4'; c.fillRect(2, 5, 2, 2); c.fillRect(12, 9, 2, 2); c.fillRect(6, 11, 1, 1);
    });
    window.__px99Home = SPRITE;
  } catch (e) { try { window.__px99Home = window.__px99Home || {}; } catch (_) {} }
})();

Object.assign(App, {
  _home99Key: 'one-xing-home-v1',
  _home99Data() {
    let d = null;
    try {
      const raw = localStorage.getItem(this._home99Key);
      if (raw) d = JSON.parse(raw);
    } catch (e) {}
    const h = Object.assign({ pots: 3, wallpaper: 'wp_honey', floor: 'fl_pine', ownedDecor: [], seedStock: {}, flowers: [] }, d || {});
    // v12.9.33 初始据点迁移：新档直接、旧档补齐「效果图同款」初始布置——
    //   暖黄条纹墙纸 + 暖木条纹地板 + 五件套家具（壁画/落地灯/书架/圆花地毯/猫爪软垫）+ 3 个花盆位。
    //   老用户已花钱换过的壁纸/地板保留不覆盖（旧默认款同时视为已拥有，商城可随时换回，权益不缩水）。
    if (!h.initV2) {
      const own = new Set(h.ownedDecor || []);
      if (!d || !h.wallpaper || h.wallpaper === 'wp_cream') { own.add('wp_cream'); h.wallpaper = 'wp_honey'; }
      if (!d || !h.floor || h.floor === 'fl_wood') { own.add('fl_wood'); h.floor = 'fl_pine'; }
      own.add('wp_honey'); own.add('fl_pine');
      ['painting', 'lamp', 'bookshelf', 'rug', 'cushion'].forEach(x => own.add(x));
      h.ownedDecor = Array.from(own);
      h.pots = Math.max(h.pots || 0, 3);
      h.initV2 = 1;
      this._home99Save(h);
    }
    // v12.9.34 家具槽位（furnOn）：初始五件套是"自带款"（catalog 标 init，不计繁荣度）；
    //   商城卖变体（base 指向原款 id），买了可随时切换摆哪款
    if (!h.initV3) {
      h.furnOn = h.furnOn || {};
      ['painting', 'lamp', 'bookshelf', 'rug', 'cushion'].forEach(b => { if (!h.furnOn[b]) h.furnOn[b] = b; });
      h.initV3 = 1;
      this._home99Save(h);
    }
    return h;
  },
  // 家具槽位解析：返回该槽位当前摆放的款式 id（未拥有 → null）
  _home99FurnCur(h, base) {
    const own = h.ownedDecor || [];
    const on = (h.furnOn || {})[base];
    if (on && own.indexOf(on) !== -1) return on;
    return own.indexOf(base) !== -1 ? base : null;
  },
  _home99Save(d) {
    try { localStorage.setItem(this._home99Key, JSON.stringify(d)); } catch (e) {}
  },

  // ==================== 昼夜 · 窗景（按北京时间流转）====================
  _home99Sky() {
    const hr = Store.beijingDate(Store.nowBeijing()).getHours();
    const t = Store.beijingDate(Store.nowBeijing());
    if (hr >= 5 && hr < 7) return { key: 'dawn', night: false, lbl: '清晨', hi: `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`, top: '#fbcfe8', mid: '#fda4af', bot: '#fed7aa', orb: '#fb7185', orbY: 150, orbX: 60 };
    if (hr >= 7 && hr < 17) return { key: 'day', night: false, lbl: '白天', hi: `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`, top: '#38bdf8', mid: '#7dd3fc', bot: '#e0f2fe', orb: '#fbbf24', orbY: 55, orbX: 120 };
    if (hr >= 17 && hr < 19) return { key: 'dusk', night: false, lbl: '黄昏', hi: `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`, top: '#a78bfa', mid: '#f0abfc', bot: '#fdba74', orb: '#f97316', orbY: 160, orbX: 170 };
    return { key: 'night', night: true, lbl: '夜晚', hi: `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`, top: '#1e1b4b', mid: '#312e81', bot: '#4338a8', orb: '#fef9c3', orbY: 60, orbX: 150 };
  },

  // ==================== 装饰目录（壁纸/地板/家具/花盆位）====================
  // v12.7c：ico=emoji 兜底；px=像素 sprite 键（window.__px99Home，canvas 生成，与小银同风格）
  _home99DecorCatalog() {
    return [
      { id: 'wp_honey', slot: 'wallpaper', n: '暖黄条纹墙纸', ico: '🍯', px: 'wall_honey', cost: 0, init: 1, d: '初始款 · 独行据点同款暖光' },
      { id: 'wp_cream', slot: 'wallpaper', n: '奶油暖白墙纸', ico: '🏠', px: 'wall_cream', cost: 80, init: 1, d: '温柔的米白' },
      { id: 'wp_mint', slot: 'wallpaper', n: '薄荷奶绿墙纸', ico: '🟢', px: 'wall_mint', cost: 80, d: '清凉一整面墙' },
      { id: 'wp_sunset', slot: 'wallpaper', n: '暖黄昏墙纸', ico: '🟠', px: 'wall_sunset', cost: 80, d: '把落日贴在墙上' },
      { id: 'wp_starry', slot: 'wallpaper', n: '星夜墙纸', ico: '🌌', px: 'wall_starry', cost: 120, d: '墙上永远有星星' },
      { id: 'fl_pine', slot: 'floor', n: '暖木条纹地板', ico: '🪵', px: 'floor_pine', cost: 0, init: 1, d: '初始款 · 据点同款木色' },
      { id: 'fl_wood', slot: 'floor', n: '原木方格地板', ico: '🟫', px: 'floor_wood', cost: 60, init: 1, d: '温润方格拼木' },
      { id: 'fl_plaid', slot: 'floor', n: '格纹地垫', ico: '🧺', px: 'floor_plaid', cost: 70, d: '田园格子纹' },
      { id: 'fl_carpet', slot: 'floor', n: '奶油长绒地毯', ico: '🤍', px: 'floor_carpet', cost: 90, d: '踩上去软软的' },
      { id: 'clock', slot: 'furn', n: '布谷鸟挂钟', ico: '🕰️', px: 'clock', cost: 50, init: 0, d: '走的可是真实时间' },
      { id: 'painting', slot: 'furn', n: '田园壁画', ico: '🖼️', px: 'painting', cost: 60, init: 1, d: '初始款 · 山与太阳的风景' },
      { id: 'painting2', slot: 'furn', base: 'painting', n: '海浪壁画', ico: '🌊', px: 'painting2', cost: 70, d: '白帆与浪尖' },
      { id: 'rug', slot: 'furn', n: '圆形花地毯', ico: '🟣', px: 'rug', cost: 80, init: 1, d: '初始款 · 客厅中央的柔软' },
      { id: 'rug2', slot: 'furn', base: 'rug', n: '苔原圆毯', ico: '🟩', px: 'rug2', cost: 100, d: '草原色的一圈温柔' },
      { id: 'lamp', slot: 'furn', n: '暖光落地灯', ico: '💡', px: 'lamp', cost: 100, init: 1, d: '初始款 · 夜晚点亮小家' },
      { id: 'lamp2', slot: 'furn', base: 'lamp', n: '月光落地灯', ico: '🌙', px: 'lamp2', cost: 130, d: '夜里落一地清辉' },
      { id: 'cushion', slot: 'furn', n: '猫爪软垫', ico: '🛏️', px: 'cushion', cost: 120, init: 1, d: '初始款 · 小银午睡最爱' },
      { id: 'cushion2', slot: 'furn', base: 'cushion', n: '蓝莓软垫', ico: '🫐', px: 'cushion2', cost: 150, d: '蓝莓奶油色猫窝' },
      { id: 'teaset', slot: 'furn', n: '原木茶几', ico: '🍵', px: 'teaset', cost: 140, d: '热茶永远冒着香气' },
      { id: 'bookshelf', slot: 'furn', n: '实木书架', ico: '📚', px: 'bookshelf', cost: 180, init: 1, d: '初始款 · 放你读过的书' },
      { id: 'bookshelf2', slot: 'furn', base: 'bookshelf', n: '胡桃木书架', ico: '📖', px: 'bookshelf2', cost: 200, d: '深木壳配冷色书脊' },
      { id: 'sofa', slot: 'furn', n: '云朵小沙发', ico: '🛋️', px: 'sofa', cost: 150, d: '陷进去就不想起来' },
      { id: 'fishtank', slot: 'furn', n: '梦幻鱼缸', ico: '🐠', px: 'fishtank', cost: 220, d: '两条小金鱼游来游去' },
      { id: 'pot3', slot: 'pot', n: '3 号花盆位', ico: '🪴', px: 'pot', cost: 50, d: '多一盆花的位置' },
      { id: 'pot4', slot: 'pot', n: '4 号花盆位', ico: '🪴', px: 'pot', cost: 50, d: '多一盆花的位置' },
      { id: 'pot5', slot: 'pot', n: '5 号花盆位', ico: '🪴', px: 'pot', cost: 50, d: '多一盆花的位置' },
      { id: 'pot6', slot: 'pot', n: '6 号花盆位', ico: '🪴', px: 'pot', cost: 60, d: '多一盆花的位置' },
    ];
  },
  // ==================== 花种子目录（6 种）====================
  _home99FlowerKinds() {
    return [
      { id: 'daisy', n: '小雏菊', ico: '🌼', px: 'head_daisy', cost: 10, days: 3, d: '三天就开花的小白菊' },
      { id: 'tulip', n: '郁金香', ico: '🌷', px: 'head_tulip', cost: 15, days: 4, d: '亭亭玉立的杯状花' },
      { id: 'sunflower', n: '向日葵', ico: '🌻', px: 'head_sunflower', cost: 20, days: 5, d: '朝着太阳的方向' },
      { id: 'lavender', n: '薰衣草', ico: '💜', px: 'head_lavender', cost: 20, days: 4, d: '一整株紫色浪漫' },
      { id: 'rose', n: '玫瑰', ico: '🌹', px: 'head_rose', cost: 25, days: 6, d: '层层叠叠的红' },
      { id: 'sakura', n: '樱花枝', ico: '🌸', px: 'head_sakura', cost: 30, days: 7, d: '等一周，换一树粉色' },
    ];
  },
  _home99KindInfo(id) { return this._home99FlowerKinds().find(k => k.id === id) || { id: 'daisy', n: '小花', ico: '🌼', days: 3 }; },

  // ==================== 养花引擎 ====================
  // 生长推进：elapsed×(今日已浇水?1.6:1) / 品种总时长；盛开封顶 1；不浇水不枯萎（无压力）
  _home99Tick() {
    const h = this._home99Data();
    const now = Date.now();
    const today = Store.today();
    let changed = false;
    (h.flowers || []).forEach(f => {
      if (!f || f.growth >= 1) { if (f) f.lastTick = now; return; }
      const kind = this._home99KindInfo(f.kind);
      const totalMs = (kind.days || 3) * 86400000;
      const watered = (f.wateredOn || []).indexOf(today) !== -1;
      const rate = watered ? 1.6 : 1;
      const add = (now - (f.lastTick || now)) / totalMs * rate;
      if (add > 0) { f.growth = Math.min(1, (f.growth || 0) + add); changed = true; }
      f.lastTick = now;
    });
    if (changed) this._home99Save(h);
    return h;
  },
  _home99Stage(g) {
    const v = Math.min(1, Math.max(0, g || 0));
    if (v >= 1) return 4;
    if (v >= 0.75) return 3;
    if (v >= 0.5) return 2;
    if (v >= 0.25) return 1;
    return 0;
  },
  _home99StageName(i) { return ['种子', '发芽', '幼苗', '花苞', '盛开'][i]; },
  _home99Plant(kind) {
    const h = this._home99Data();
    const stock = (h.seedStock || {})[kind] || 0;
    if (stock <= 0) return this._flash('先去小家商城买一包「' + this._home99KindInfo(kind).n + '」种子吧 🛒');
    // 找第一个空盆位（flowers 初始是 []，findIndex 会误判全满——必须循环扫描）
    let slot = -1;
    for (let i = 0; i < h.pots; i++) { if (!h.flowers[i]) { slot = i; break; } }
    if (slot === -1) return this._flash('花盆位都满啦——去商城买一个新花盆位 🪴');
    h.seedStock[kind] = stock - 1;
    h.flowers[slot] = { id: 'fl' + now99(), kind, plantedTs: Date.now(), growth: 0, lastTick: Date.now(), wateredOn: [] };
    this._home99Save(h);
    this._flash('🌱 ' + this._home99KindInfo(kind).n + '的种子埋进了土里——浇浇水，它会长得更快');
    this.render_workbench();
  },
  _home99WaterAt(i) {
    const h = this._home99Tick();
    const f = h.flowers[i];
    if (!f) return;
    const today = Store.today();
    if (f.growth >= 1) return this._flash('🌸 已经盛开啦，不用再浇水了');
    if ((f.wateredOn || []).indexOf(today) !== -1) return this._flash('💧 今天浇过水了——明天再来，让它慢慢长');
    f.wateredOn = (f.wateredOn || []).slice(-30); f.wateredOn.push(today);
    this._home99Save(h);
    this._flash('💧 浇水完成：今天它将以 1.6 倍的速度生长');
    this.render_workbench();
  },
  _home99RemoveAt(i) {
    const h = this._home99Data();
    const f = h.flowers[i];
    if (!f) return;
    const k = this._home99KindInfo(f.kind);
    this._modal({
      title: '🌿 收起这盆' + k.n + '？',
      body: `<div style="font-size:13px;color:#475569;line-height:1.8">${f.growth >= 1 ? '它已经<b>盛开</b>了。' : '它还在<b>' + this._home99StageName(this._home99Stage(f.growth)) + '</b>阶段。'}收起后花盆位会空出来（种子不退还）——花不会枯萎，只是换个位置待着。</div>`,
      actions: [{ label: '再想想' }, { label: '收起', onClick: () => { h.flowers[i] = null; App._home99Save(h); App._flash('🌷 花香留在了小家里'); App.render_workbench(); } }],
    });
  },
  _home99BuySeed(kind) {
    const k = this._home99KindInfo(kind);
    const p = this._pet99Data();
    if (p.points < k.cost) return this._flash(`宝石不足（需要 ${k.cost}，当前 ${p.points}）——宝石来自每日打卡 15/30 个与阿福审核通过的合格记录（见【个人中心 · 独行信条】）`);
    p.points -= k.cost;
    this._pet99Save(p);
    const h = this._home99Data();
    h.seedStock[kind] = (h.seedStock[kind] || 0) + 1;
    this._home99Save(h);
    this._flash('🌱 ' + k.n + '种子 ×1 已放进小口袋——去【花园】种下它吧');
    this.render_workbench();
  },
  _home99BuyDecor(id) {
    const it = this._home99DecorCatalog().find(x => x.id === id);
    if (!it) return;
    const h = this._home99Data();
    const p = this._pet99Data();
    if (it.cost === 0 || (h.ownedDecor || []).indexOf(id) !== -1) return this._home99UseDecor(id);
    if (p.points < it.cost) return this._flash(`宝石不足（需要 ${it.cost}，当前 ${p.points}）——宝石来自每日打卡 15/30 个与阿福审核通过的合格记录（见【个人中心 · 独行信条】）`);
    p.points -= it.cost;
    this._pet99Save(p);
    h.ownedDecor.push(id);
    if (it.slot === 'wallpaper') h.wallpaper = id;
    if (it.slot === 'floor') h.floor = id;
    if (it.slot === 'pot') h.pots = Math.min(6, h.pots + 1);
    if (it.slot === 'furn' && it.base) h.furnOn = Object.assign({}, h.furnOn, { [it.base]: id }); // 变体买回即摆上
    this._home99Save(h);
    this._flash('🛋️ ' + it.n + '已搬进小家' + (it.slot === 'pot' ? '——花园多了一个花盆位' : ''));
    this.render_workbench();
  },
  _home99UseDecor(id) {
    const it = this._home99DecorCatalog().find(x => x.id === id);
    if (!it) return;
    const h = this._home99Data();
    if ((h.ownedDecor || []).indexOf(id) === -1 && it.cost > 0) return;
    if (it.slot === 'wallpaper') h.wallpaper = id;
    else if (it.slot === 'floor') h.floor = id;
    else if (it.slot === 'furn' && (it.base || this._home99DecorCatalog().some(x => x.base === it.id))) { // 变体或基准款（可被变体替换的初始款）都可切换摆放
      h.furnOn = Object.assign({}, h.furnOn, { [it.base || it.id]: id });
      this._home99Save(h); this._flash('✨ 已换上「' + it.n + '」'); this.render_workbench(); return;
    }
    else return this._flash('家具买回来自动摆好，不用手动切换～');
    this._home99Save(h);
    this._flash('✨ 已换上「' + it.n + '」');
    this.render_workbench();
  },

  // ==================== 小银入住小家 ====================
  // v12.7：像素猫 idle 帧 <image> 嵌入房间（SVG 场景跑不了 CSS 帧动画）
  // v12.9.36 行为引擎：帧由 _home99CatEngineStart 的 rAF 循环逐帧换图——
  //   小银安家在猫爪软垫上：时而蜷成一团睡觉 / 舔爪 / 撒娇摆尾（跑动已按用户要求删除）
  //   22:00–06:00 夜间默认蜷在小窝睡觉（与宠物页同口径）
  //   彩蛋（唯一手动触发）：单击小银 → 随机掉毛线球 / 主人像素手挥逗猫棒（尾端小鱼干）
  _home99CatG(L) {
    try {
      const frames = (typeof window !== 'undefined' && window.__px99CatFrames) || [];
      const url = frames[0] || (typeof window !== 'undefined' && window.__px99CatIdleUrl) || '';
      if (!url) return '';
      // 32×34 像素猫放大 3 倍（100×106），坐在猫爪软垫上
      return `<g id="home99Cat" data-home="${L.cat[0]},${L.cat[1]}" transform="translate(${L.cat[0]},${L.cat[1]})" style="cursor:pointer" onclick="App._home99CatTap()">
        <g id="home99CatFlip"><image id="home99CatImg" href="${url}" width="100" height="106" style="image-rendering:pixelated"></image></g>
      </g>`;
    } catch (_) { return ''; }
  },
  _home99CatTap() {
    const eng = this.__home99CatEngine;
    if (!eng || eng.busy()) return;
    // v12.9.45 猫叫音效：点小银喵一声（合成喵 · 音效引擎 96-perm99.js）
    try { this._sfx99 && this._sfx99('meow'); } catch (e) {}
    const kind = Math.random() < 0.5 ? 'yarn' : 'wand';
    eng.start(kind);
    this._flash(kind === 'yarn'
      ? ['🧶 一个毛线球骨碌碌掉了下来——小银的眼睛一下子亮了', '🧶 毛线球骨碌骨碌滚，小银一爪接一爪拍得不亦乐乎'][Math.floor(Math.random() * 2)]
      : ['🎣 主人拿出逗猫棒——小鱼干在末端晃呀晃', '🎣 小银盯着小鱼干，屁股蓄力……扑！'][Math.floor(Math.random() * 2)]);
  },
  // ---------- 行为引擎（渲染后由 render_workbench 绑定；场景重渲染自动重启） ----------
  _home99CatEngineStop() {
    if (this.__home99CatRaf) { cancelAnimationFrame(this.__home99CatRaf); this.__home99CatRaf = 0; }
    this.__home99CatEngine = null;
  },
  _home99CatEngineStart() {
    this._home99CatEngineStop();
    const catEl = document.getElementById('home99Cat');
    if (!catEl) return;
    const frames = (typeof window !== 'undefined' && window.__px99CatFrames) || [];
    if (frames.length < 10) return;
    const imgEl = catEl.querySelector('#home99CatImg');
    const flipEl = catEl.querySelector('#home99CatFlip');
    if (!imgEl || !flipEl) return;
    const svgRoot = catEl.ownerSVGElement;
    if (!svgRoot) return;
    const home = (catEl.dataset.home || '').split(',').map(Number);
    if (home.length < 2 || home.some(isNaN)) return;
    const YARN = window.__px99YarnUrl || '', WAND = window.__px99WandUrl || '';
    const CATW = 100, CATH = 106, CURLED_DY = 3; // 蜷睡球比坐姿爪底高 1px → 3 倍图 +3
    const rnd = (a, b) => a + Math.random() * (b - a);
    // 夜间口径：22:00–06:00 小银默认蜷在小窝睡觉（宠物页同口径）
    const isNight = () => { const h = new Date().getHours(); return h >= 22 || h < 6; };
    // 动作帧表：idle(0,1) lick(2,3) coq(6,7) curled(8,9)
    const ACT = {
      idle:   { f: [0, 1], ms: 600 },
      lick:   { f: [2, 3], ms: 340 },
      coq:    { f: [6, 7], ms: 380 },
      curled: { f: [8, 9], ms: 1150 },
    };
    const DUR = { idle: [2200, 4200], lick: [2800, 5200], coq: [2400, 4200], curled: [7000, 14000] };
    const S = {
      act: 'curled', until: performance.now() + (isNight() ? 1800000 : 5000),
      fi: 8, frameT: 0,
      y: home[1] + CURLED_DY, dir: 1, hop: 0,
      egg: null,
    };
    const render = (now) => {
      const a = ACT[S.act] || ACT.idle;
      if (now - S.frameT >= a.ms) {
        S.frameT = now;
        const i = a.f.indexOf(S.fi);
        S.fi = a.f[i >= 0 ? (i + 1) % a.f.length : 0];
      }
      if (imgEl.getAttribute('href') !== frames[S.fi]) imgEl.setAttribute('href', frames[S.fi]);
      catEl.setAttribute('transform', 'translate(' + home[0].toFixed(1) + ',' + (S.y - S.hop).toFixed(1) + ')');
      flipEl.setAttribute('transform', S.dir < 0 ? 'translate(' + CATW + ',0) scale(-1,1)' : '');
    };
    const sitAct = (k) => {
      S.act = k;
      S.y = home[1] + (k === 'curled' ? CURLED_DY : 0);
      S.until = performance.now() + rnd(DUR[k][0], DUR[k][1]);
      if (k === 'coq') S.dir = Math.random() < .5 ? 1 : -1;   // 撒娇随机朝向主人
    };
    const nextAct = () => {
      if (isNight()) {                                        // 夜间：蜷在小窝睡觉
        S.act = 'curled'; S.y = home[1] + CURLED_DY; S.dir = 1;
        S.until = performance.now() + 1800000;                // 半小时后再查（跨过 06:00 自然醒）
        return;
      }
      const r = Math.random();
      let k = r < .45 ? 'curled' : r < .68 ? 'lick' : r < .86 ? 'coq' : 'idle';
      if (k === S.act) k = (k === 'curled') ? 'lick' : 'curled';
      sitAct(k);
    };
    // ---------- 彩蛋 ----------
    const mkEggEl = (url, w, h) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      el.setAttribute('href', url);
      el.setAttribute('width', w); el.setAttribute('height', h);
      el.setAttribute('style', 'image-rendering:pixelated;pointer-events:none');
      svgRoot.appendChild(el);
      return el;
    };
    const eggStart = (kind) => {
      if (S.egg || !YARN || !WAND) return;
      const now = performance.now();
      S.egg = { kind, t0: now, el: null, x: 0, y: 0, vx: 0, rot: 0, swatT: 0 };
      S.hop = 0;
      if (kind === 'yarn') {
        // 毛线球掉落在小银身旁（小银原地拍打——跑动已删）
        S.egg.x = home[0] + (Math.random() < .5 ? CATW - 16 : -20);
        S.egg.y = home[1] + CATH - 200;                       // 空中掉落起点
        S.egg.ground = home[1] + CATH - 42;                  // 球底贴地（球高 42）
        S.egg.el = mkEggEl(YARN, 36, 42);
        S.act = 'idle'; S.until = now + 380;                   // 先一愣：诶？什么声音
      } else {
        S.egg.el = mkEggEl(WAND, 48, 78);
        S.dir = 1;                                            // 面向右侧的逗猫棒
        sitAct('coq'); S.until = now + 99999;                 // 互动期间锁行为
      }
    };
    const eggTick = (now) => {
      const E = S.egg, t = (now - E.t0) / 1000;
      if (E.kind === 'yarn') {
        // 阶段：0-0.75 空中掉落 → 0.75-1.15 弹跳 → 之后原地拍打（球滚动）→ 4.2s 淡出
        if (t < 0.75) E.y = E.ground - (1 - Math.pow(t / 0.75, 2)) * 158;
        else if (t < 1.15) E.y = E.ground - Math.sin(Math.PI * (t - 0.75) / 0.4) * 24;
        else E.y = E.ground;
        if (t >= 1.15 && t < 4.1) {
          if (now - E.swatT > 720) {                           // 小银一爪拍过去：球被击飞
            E.swatT = now;
            E.vx = (E.x + 18 >= home[0] + 50 ? -1 : 1) * rnd(30, 60);
            E.y = E.ground - 12;                               // 击飞小跳
          }
          E.x += E.vx * 0.016;
          E.vx *= 0.972;
          E.rot += E.vx * 0.35;
          S.act = 'coq';                                       // 开心拍打（眯眯眼 + 抬爪）
          S.dir = (E.x + 18 >= home[0] + 50) ? 1 : -1;        // 朝向球
          S.hop = Math.abs(Math.sin(now / 260)) * 6;          // 兴奋的小碎步
        }
        if (t >= 4.1) { try { E.el.style.opacity = Math.max(0, 1 - (t - 4.1) / 0.7); } catch (_) {} }
        E.el.setAttribute('transform', 'translate(' + E.x.toFixed(1) + ',' + E.y.toFixed(1) + ')' + (E.rot ? ' rotate(' + E.rot.toFixed(0) + ' 18 21)' : ''));
        if (t >= 4.9) {
          E.el.remove(); S.egg = null; S.hop = 0; nextAct();
        }
      } else {
        // 逗猫棒：0-0.6 右上入场 → 甩动小鱼干，小银开心蹦跳拍抓 → 4.6-5.2 收回
        let wx = home[0] + 76, wy = home[1] - 44, rot = Math.sin(t * 4.2) * 13, op = 1;
        if (t < 0.6) { const p = t / 0.6; wx += (1 - p) * 150; wy -= (1 - p) * 60; op = p; rot = 26 * (1 - p); }
        if (t > 4.6) { const p = (t - 4.6) / 0.6; wx += p * 170; wy -= p * 90; op = 1 - p; }
        E.el.setAttribute('transform', 'translate(' + wx.toFixed(1) + ',' + wy.toFixed(1) + ') rotate(' + rot.toFixed(1) + ' 34 10)');
        try { E.el.style.opacity = op; } catch (_) {}
        S.act = 'coq'; S.dir = 1;
        S.hop = Math.abs(Math.sin(now / 240)) * 7;             // 蹦跳着够小鱼干
        if (t >= 5.2) {
          E.el.remove(); S.egg = null; S.hop = 0; nextAct();
        }
      }
    };
    const loop = (now) => {
      if (!catEl.isConnected) { raf = 0; return; }             // 场景被重渲染/离开页面：自动停
      if (S.egg) eggTick(now);
      else if (now >= S.until) nextAct();
      render(now);
      raf = requestAnimationFrame(loop);
    };
    let raf = 0;
    this.__home99CatEngine = { busy: () => !!S.egg, start: eggStart };
    raf = requestAnimationFrame(loop);
    this.__home99CatRaf = raf;
  },

  // ==================== 主场景 SVG（小家房间 · 高精度）====================
  _home99Scene() {
    const h = this._home99Tick();
    const sky = this._home99Sky();
    const owned = h.ownedDecor || [];
    // v12.9.39 手机适配改版：删除 520×760 竖版构图——所有视口统一 800×560 横版房间。
    //   手机竖屏时房间按宽度缩放成「横屏比例卡片」置于页顶（与其他卡片同语言），
    //   整间全貌一屏可见（窗/壁画/灯/茶几/沙发/书架/鱼缸/软垫小银/花盆列），仿效果图。
    const L = {
      W: 800, wallH: 360, skirtY: 352, floorY: 360, floorH: 200, vb: '0 0 800 560',
      winT: '',
      clock: [686, 80, 65, 65], clockText: [718, 166],
      painting: [556, 88, 108, 78],
      lamp: [28, 210, 88, 208],
      lampGlow: '<ellipse cx="72" cy="320" rx="120" ry="90" fill="#fbbf24" opacity=".18"/><ellipse cx="72" cy="290" rx="70" ry="60" fill="#fde68a" opacity=".2"/>',
      rug: [313, 447, 234, 90],
      tea: [185, 391, 154, 91], steam: [[248, 378, 3, 3, '2.4s', 368], [255, 375, 2, 2, '3s', 364]],
      shelf: [636, 216, 120, 176],
      sofa: [366, 360, 208, 120],
      tank: [640, 396, 130, 110], fish: [[660, 430, '660;712;660', 6, 4, '#5eaae7'], [700, 446, '700;662;700', 5, 3, '#fb923c']],
      cushion: [450, 427, 140, 49], cat: [470, 346],
      potY: 428, potXs: [64, 158, 252, 346, 628, 700],
      fly: (i) => [100 + (i * 130) % 600, 300 + (i * 47) % 150],
      mote: (i) => [180 + i * 120, 140 + (i * 67) % 160],
      nightW: 'width="800" height="360"', nightF: 'y="360" width="800" height="200"',
    };
    // 家具槽位：变体系统（v12.9.34）——每槽位显示当前摆放的款式
    const K = (b) => this._home99FurnCur(h, b);
    const defs = [];
    // —— 窗景天空 ——
    defs.push(`<linearGradient id="h99sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${sky.top}"/><stop offset="55%" stop-color="${sky.mid}"/><stop offset="100%" stop-color="${sky.bot}"/></linearGradient>`);
    // —— 壁纸（5 款）——
    let wall = '';
    if (h.wallpaper === 'wp_honey') {
      // v12.9.33 初始款 · 效果图同款：暖黄底 + 蜜色竖条纹（独行据点暖光）
      defs.push(`<pattern id="h99wp" width="17" height="360" patternUnits="userSpaceOnUse"><rect width="17" height="360" fill="#fef3c7"/><rect x="4" width="3" height="360" fill="#fde68a"/></pattern>`);
      wall = `<rect width="${L.W}" height="${L.wallH}" fill="url(#h99wp)"/>`;
    } else if (h.wallpaper === 'wp_mint') {
      defs.push(`<pattern id="h99wp" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="#ecfdf5"/><path d="M8,20 q4,-8 8,0" stroke="#a7f3d0" stroke-width="2" fill="none"/><circle cx="24" cy="10" r="1.6" fill="#6ee7b7"/></pattern>`);
      wall = `<rect width="${L.W}" height="${L.wallH}" fill="url(#h99wp)"/>`;
    } else if (h.wallpaper === 'wp_sunset') {
      defs.push(`<linearGradient id="h99wp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff7ed"/><stop offset="100%" stop-color="#ffe4e6"/></linearGradient><pattern id="h99wpd" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="1.2" fill="#fda4af"/><circle cx="19" cy="19" r="1.2" fill="#fdba74"/></pattern>`);
      wall = `<rect width="${L.W}" height="${L.wallH}" fill="url(#h99wp)"/><rect width="${L.W}" height="${L.wallH}" fill="url(#h99wpd)"/>`;
    } else if (h.wallpaper === 'wp_starry') {
      defs.push(`<pattern id="h99wp" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#312e81"/><circle cx="8" cy="12" r="1.4" fill="#fef9c3" opacity=".9"/><circle cx="30" cy="6" r="1" fill="#e0e7ff" opacity=".8"/><circle cx="22" cy="30" r="1.6" fill="#c7d2fe" opacity=".9"/><circle cx="4" cy="34" r="1" fill="#fef9c3" opacity=".7"/></pattern>`);
      wall = `<rect width="${L.W}" height="${L.wallH}" fill="url(#h99wp)"/>`;
    } else {
      defs.push(`<pattern id="h99wp" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#fdf6ec"/><circle cx="7" cy="7" r="1.3" fill="#f3e2c9"/><circle cx="22" cy="21" r="1.3" fill="#f3e2c9"/></pattern>`);
      wall = `<rect width="${L.W}" height="${L.wallH}" fill="url(#h99wp)"/>`;
    }
    // —— 踢脚线 + 地板（4 款）——
    let floor = '';
    if (h.floor === 'fl_pine') {
      // v12.9.33 初始款 · 效果图同款：暖木底 + 横板缝线（错缝短竖线）
      defs.push(`<pattern id="h99fl" width="64" height="21" patternUnits="userSpaceOnUse"><rect width="64" height="21" fill="#d6a26f"/><rect y="6" width="64" height="1" fill="#c2895a" opacity=".85"/><rect y="13" width="64" height="1" fill="#c2895a" opacity=".85"/><rect y="20" width="64" height="1" fill="#c2895a" opacity=".85"/><rect x="22" width="1" height="6" fill="#c2895a" opacity=".7"/><rect x="48" y="7" width="1" height="6" fill="#c2895a" opacity=".7"/><rect x="10" y="14" width="1" height="6" fill="#c2895a" opacity=".7"/></pattern>`);
      floor = `<rect y="${L.floorY}" width="${L.W}" height="${L.floorH}" fill="url(#h99fl)"/>`;
    } else if (h.floor === 'fl_plaid') {
      defs.push(`<pattern id="h99fl" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="#fef3c7"/><rect width="22" height="22" fill="#fde68a"/><rect x="22" y="22" width="22" height="22" fill="#fde68a"/></pattern>`);
      floor = `<rect y="${L.floorY}" width="${L.W}" height="${L.floorH}" fill="url(#h99fl)"/>`;
    } else if (h.floor === 'fl_carpet') {
      floor = `<rect y="${L.floorY}" width="${L.W}" height="${L.floorH}" fill="#fce7f3"/><rect y="${L.floorY}" width="${L.W}" height="14" fill="#fbcfe8"/><ellipse cx="${L.W / 2}" cy="${L.floorY + 110}" rx="${L.W * 0.41}" ry="60" fill="#fbcfe8" opacity=".5"/>`;
    } else {
      defs.push(`<pattern id="h99fl" width="120" height="40" patternUnits="userSpaceOnUse"><rect width="120" height="40" fill="#d9a066"/><rect width="118" height="38" x="1" y="1" rx="3" fill="#c98a52"/><path d="M1,20 h118" stroke="#b07840" stroke-width="1" opacity=".5"/></pattern>`);
      floor = `<rect y="${L.floorY}" width="${L.W}" height="${L.floorH}" fill="url(#h99fl)"/>`;
    }
    const skirting = `<rect y="${L.skirtY}" width="${L.W}" height="12" fill="#b07840" opacity=".85"/><rect y="${L.skirtY}" width="${L.W}" height="4" fill="#8a5a2e" opacity=".6"/>`;
    // —— 窗（含昼夜窗景：云/星/日月）——
    const stars = sky.night ? [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle class="h99-tw" style="animation-delay:${i * 0.4}s" cx="${36 + (i * 31) % 168}" cy="${18 + (i * 23) % 70}" r="${1.2 + (i % 3) * 0.5}" fill="#fef9c3"/>`).join('') : '';
    const windowSky = `<g transform="${L.winT}">
      <rect x="92" y="52" width="206" height="206" rx="14" fill="url(#h99sky)"/>
      ${sky.night
        ? `<circle cx="${sky.orbX + 60}" cy="${sky.orbY}" r="17" fill="#fef9c3"/><circle cx="${sky.orbX + 53}" cy="${sky.orbY - 6}" r="3.5" fill="#e7e5c8" opacity=".6"/>${stars}`
        : `<circle cx="${sky.orbX + 60}" cy="${sky.orbY}" r="${sky.key === 'day' ? 15 : 20}" fill="${sky.orb}" opacity="${sky.key === 'dusk' ? .95 : 1}"/><ellipse class="h99-cloud" style="animation-duration:26s" cx="150" cy="80" rx="26" ry="9" fill="#fff" opacity=".9"/><ellipse class="h99-cloud" style="animation-duration:34s;animation-delay:-12s" cx="220" cy="130" rx="20" ry="7" fill="#fff" opacity=".75"/>`}
      <rect x="92" y="52" width="206" height="206" rx="14" fill="none" stroke="#a0622d" stroke-width="9"/>
      <rect x="190" y="56" width="8" height="198" fill="#a0622d"/><rect x="96" y="148" width="198" height="8" fill="#a0622d"/>
      <rect x="80" y="252" width="230" height="14" rx="7" fill="#b07840"/><rect x="86" y="262" width="10" height="16" fill="#8a5a2e"/><rect x="294" y="262" width="10" height="16" fill="#8a5a2e"/>
      <path d="M92,52 q22,-16 44,0 l0,206 q-22,-14 -44,0 Z" fill="#fbcfe8" opacity=".55" stroke="#f9a8d4" stroke-width="2"/>
      <path d="M298,52 q-22,-16 -44,0 l0,206 q22,-14 44,0 Z" fill="#fbcfe8" opacity=".55" stroke="#f9a8d4" stroke-width="2"/>
    </g>`;
    // —— v12.8 像素家具：canvas sprite 以 <image> 嵌入（最近邻硬边，与小银/像素阿福同一美术体系）——
    const PIMG = (key, x, y, w, h, extra) => {
      try {
        const url = (window.__px99Home || {})[key];
        if (!url) return '';
        return `<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" style="image-rendering:pixelated"${extra || ''}/>`;
      } catch (_) { return ''; }
    };
    // —— 挂钟（像素 sprite + 真实时间文字）——
    const ck = K('clock');
    const clockG = ck ? `${PIMG(ck, L.clock[0], L.clock[1], L.clock[2], L.clock[2])}
      <text x="${L.clockText[0]}" y="${L.clockText[1]}" text-anchor="middle" font-size="14" font-weight="800" fill="#8a5a2e">${sky.hi}</text>` : '';
    // —— 壁画（槽位款式：田园 / 海浪变体）——
    const pg = K('painting');
    const paintingG = pg ? PIMG(pg, L.painting[0], L.painting[1], L.painting[2], L.painting[3]) : '';
    // —— 落地灯（槽位款式：暖光 / 月光变体；夜晚发光）——
    const lg = K('lamp');
    const lampG = lg ? `
      <g>
        ${sky.night ? L.lampGlow : ''}
        ${PIMG(lg, L.lamp[0], L.lamp[1], L.lamp[2], L.lamp[3])}
      </g>` : '';
    // —— 地毯（槽位款式：花毯 / 苔原变体）——
    const rg = K('rug');
    const rugG = rg ? PIMG(rg, L.rug[0], L.rug[1], L.rug[2], L.rug[3]) : '';
    // —— 茶几 + 热茶（像素 sprite + 像素蒸汽向上飘）——
    const teaG = K('teaset') ? `
      <g>
        ${PIMG('teaset', L.tea[0], L.tea[1], L.tea[2], L.tea[3])}
        <g fill="#e2e8f0">
          <rect x="${L.steam[0][0]}" y="${L.steam[0][1]}" width="${L.steam[0][2]}" height="${L.steam[0][3]}" opacity=".9"><animate attributeName="y" values="${L.steam[0][1]};${L.steam[0][5]};${L.steam[0][1]}" dur="${L.steam[0][4]}" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;.3;.9" dur="${L.steam[0][4]}" repeatCount="indefinite"/></rect>
          <rect x="${L.steam[1][0]}" y="${L.steam[1][1]}" width="${L.steam[1][2]}" height="${L.steam[1][3]}" opacity=".7"><animate attributeName="y" values="${L.steam[1][1]};${L.steam[1][5]};${L.steam[1][1]}" dur="${L.steam[1][4]}" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;.2;.7" dur="${L.steam[1][4]}" repeatCount="indefinite"/></rect>
        </g>
      </g>` : '';
    // —— 书架（槽位款式：实木 / 胡桃木变体）——
    const sg = K('bookshelf');
    const shelfG = sg ? PIMG(sg, L.shelf[0], L.shelf[1], L.shelf[2], L.shelf[3]) : '';
    // —— 沙发 ——
    const sofaG = K('sofa') ? PIMG('sofa', L.sofa[0], L.sofa[1], L.sofa[2], L.sofa[3]) : '';
    // —— 鱼缸（像素 sprite + 两条像素小鱼游动）——
    const tankG = K('fishtank') ? `
      <g>
        ${PIMG('fishtank', L.tank[0], L.tank[1], L.tank[2], L.tank[3])}
        <rect x="${L.fish[0][0]}" y="${L.fish[0][1]}" width="${L.fish[0][3]}" height="${L.fish[0][4]}" fill="${L.fish[0][5]}"><animate attributeName="x" values="${L.fish[0][2]}" dur="5s" repeatCount="indefinite"/></rect>
        <rect x="${L.fish[1][0]}" y="${L.fish[1][1]}" width="${L.fish[1][3]}" height="${L.fish[1][4]}" fill="${L.fish[1][5]}"><animate attributeName="x" values="${L.fish[1][2]}" dur="6.5s" repeatCount="indefinite"/></rect>
      </g>` : '';
    // —— 猫爪软垫（槽位款式：猫爪 / 蓝莓变体）+ 小银 ——
    const cug = K('cushion');
    const cushionG = cug ? PIMG(cug, L.cushion[0], L.cushion[1], L.cushion[2], L.cushion[3]) : '';
    const catG = cug ? this._home99CatG(L) : '';
    // —— 花盆列（真实花园状态，点击浇水）——
    let potsG = '';
    for (let i = 0; i < h.pots; i++) {
      const x = L.potXs[i], y = L.potY;
      const f = h.flowers[i];
      if (f) {
        potsG += `<g transform="translate(${x},${y})" style="cursor:pointer" onclick="App._home99WaterAt(${i})">${this._home99FlowerSvg(f)}</g>`;
      } else {
        potsG += `<g transform="translate(${x},${y})" style="cursor:pointer" onclick="App.gotoWb('garden99')">
          <path d="M-24,2 h48 l-7,42 h-34 Z" fill="#e7d9c6" opacity=".8" stroke="#cbb99f" stroke-width="2" stroke-dasharray="5 4"/>
          <ellipse cx="0" cy="2" rx="24" ry="6" fill="#efe3d3" stroke="#cbb99f" stroke-width="2" stroke-dasharray="5 4"/>
          <text y="-8" text-anchor="middle" font-size="18" fill="#a89277">＋</text>
        </g>`;
      }
    }
    // —— 夜色氛围 + 萤火虫（每朵盛开的花引来一只）——
    let nightG = '', fireflyG = '';
    if (sky.night) {
      nightG = `<rect ${L.nightW} fill="#1e1b4b" opacity="${lg ? '.22' : '.38'}"/><rect ${L.nightF} fill="#1e1b4b" opacity=".3"/>`;
      const bloomed = (h.flowers || []).filter(f => f && f.growth >= 1).length;
      const n = Math.min(6, bloomed);
      fireflyG = Array.from({ length: n }, (_, i) => `<circle class="h99-fly" style="animation-delay:${i * 0.9}s" cx="${L.fly(i)[0]}" cy="${L.fly(i)[1]}" r="3" fill="#fde047"><animate attributeName="opacity" values=".2;1;.2" dur="${2 + i * 0.4}s" repeatCount="indefinite"/></circle>`).join('');
    }
    // —— 浮尘光斑（白天氛围）——
    const motes = sky.night ? '' : [0, 1, 2, 3, 4].map(i => `<circle class="h99-mote" style="animation-delay:${i * 1.6}s" cx="${L.mote(i)[0]}" cy="${L.mote(i)[1]}" r="2" fill="#fff" opacity=".55"/>`).join('');
    // v12.9.36b 尺寸交给 CSS（.h99r-scene svg）——inline width:100% 会压过媒体查询的
    // 手机比例自适应规则（竖屏按可用高缩放/横屏整间可见），故此处不再写 inline 宽高
    return `<svg viewBox="${L.vb}" xmlns="http://www.w3.org/2000/svg">
      <defs>${defs.join('')}</defs>
      ${wall}${floor}${skirting}${windowSky}
      ${clockG}${paintingG}
      ${rugG}${teaG}${sofaG}${shelfG}${tankG}${lampG}
      ${nightG}${cushionG}${catG}${potsG}${fireflyG}${motes}
    </svg>`;
  },

  // ==================== 花盆 SVG（v12.8 像素风：canvas sprite 盆 + 像素茎叶花头）====================
  // 本地坐标：盆顶中心为原点；盆 sprite 50×45（y 0..45），花从 y=0 向上生长
  _home99PxImg(key, x, y, w, h) {
    try {
      const url = (window.__px99Home || {})[key];
      if (!url) return '';
      return `<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" style="image-rendering:pixelated"/>`;
    } catch (_) { return ''; }
  },
  _home99FlowerSvg(f) {
    const kind = this._home99KindInfo(f.kind);
    const st = this._home99Stage(f.growth);
    const watered = (f.wateredOn || []).indexOf(Store.today()) !== -1;
    let s = this._home99PxImg('pot', -25, 0, 50, 45) || `<path d="M-24,2 h48 l-7,42 h-34 Z" fill="#c2724b"/><ellipse cx="0" cy="2" rx="24" ry="6" fill="#6b4a32"/>`;
    if (st === 0) {
      // 种子：土面上的浅痕
      s += `<rect x="-4" y="-3" width="8" height="2" fill="#6b4a32"/><rect x="-1" y="-5" width="3" height="2" fill="#8a5a2e"/>`;
    } else {
      const stemH = [0, 8, 20, 32, 42][st];
      // 像素茎（2 格宽的条）
      s += `<rect x="-1" y="${-stemH}" width="2" height="${stemH + 3}" fill="#4d7c0f"/>`;
      if (st >= 2) {
        // 两片像素叶
        s += `<rect x="-7" y="${-Math.round(stemH * 0.5)}" width="6" height="3" fill="#65a30d"/><rect x="-6" y="${-Math.round(stemH * 0.5) - 2}" width="3" height="2" fill="#84cc16"/>`;
        s += `<rect x="1" y="${-Math.round(stemH * 0.72)}" width="6" height="3" fill="#65a30d"/><rect x="3" y="${-Math.round(stemH * 0.72) - 2}" width="3" height="2" fill="#84cc16"/>`;
      }
      if (st === 3) {
        // 花苞：品种色像素块 + 高光
        const bud = this._home99KindBudColor(f.kind);
        s += `<g class="h99-sway" style="transform-box:fill-box;transform-origin:50% 100%"><rect x="-4" y="${-stemH - 8}" width="8" height="8" fill="${bud}"/><rect x="-3" y="${-stemH - 7}" width="2" height="2" fill="#fff" opacity=".55"/></g>`;
      } else if (st === 4) {
        // 盛开：像素花头 sprite（11×11 格 ×4 = 44×44 原生）
        s += `<g class="h99-sway" style="transform-box:fill-box;transform-origin:50% 100%">${this._home99PxImg('head_' + f.kind, -22, -stemH - 38, 44, 44)}</g>`;
        s += `<text x="20" y="${-stemH - 34}" font-size="12" style="animation:h99-twk 2s ease-in-out infinite">✨</text>`;
      }
    }
    // 今日已浇水：像素水滴
    if (watered && st < 4) s += `<rect x="-21" y="6" width="3" height="3" fill="#38bdf8"/><rect x="-17" y="10" width="2" height="2" fill="#7dd3fc"/>`;
    s += `<text y="62" text-anchor="middle" font-size="10" fill="#8a6d57" style="font-weight:700">${kind.ico} ${st === 4 ? '盛开' : this._home99StageName(st)}</text>`;
    return s;
  },
  _home99KindBudColor(kind) {
    return { daisy: '#fef08a', tulip: '#fb7185', sunflower: '#facc15', lavender: '#a78bfa', rose: '#e11d48', sakura: '#f9a8d4' }[kind] || '#fef08a';
  },

  // ==================== 页面：小家主页（v12.9.32「独行据点」RPG 化 · 游戏画面式布局）====================
  // 设计语言与个人中心（92-rpg99.js）同源：红白渐变整页（body.bg-rpg-red · RPG99_SKIN_VIEWS 白名单挂载）
  // · HUD 悬浮在场景上方（半透明黑条 · 游戏血条式）——不占版面
  // · 主视觉 = 像素房间场景直接铺满（_home99Scene 原样复用，小银坐在软垫上，绝不与文字层重叠）
  // · DQ 式对话框（深黑底白双线框 + 名字牌 + ▼ 光标）台词由真实花况/时段生成
  // · 灵植图鉴 = 游戏道具栏槽位 · 据点日常 = 任务条 · hotbar = 真实子页直达
  // · 底栏 dock 圆形导航保持 app 原样，不引入任何底边栏
  _wbHome99(wb, W) {
    const h = this._home99Tick();
    const sky = this._home99Sky();
    const p = this._pet99Data();
    const flowers = (h.flowers || []).filter(Boolean);
    const growing = flowers.filter(f => f.growth < 1).length;
    const bloomed = flowers.filter(f => f.growth >= 1).length;
    const owned = h.ownedDecor || [];
    const cat = this._home99DecorCatalog();
    // 据点繁荣度/等级：全部真实存量推导（装修投入总值 + 每朵盛开 +20），无虚构数值
    // v12.9.34 初始自带款（init 标记）不计入——繁荣度只算真实花宝石买的，开局 Lv.1
    const spent = owned.reduce((s, id) => { const it = cat.find(x => x.id === id); return s + (it && !it.init ? it.cost : 0); }, 0);
    const prosperity = spent + bloomed * 20;
    const lvNeed = 200, lv = Math.floor(prosperity / lvNeed) + 1, lvProg = prosperity % lvNeed;
    const LV_NAMES = ['荒地小屋', '一个人的家', '温暖小居', '安神小院', '自在居所', '四季家园', '独行据点', '风息驿站', '风息驿站', '风息驿站', '月下庄园', '月下庄园'];
    const lvName = LV_NAMES[Math.min(lv - 1, LV_NAMES.length - 1)] || '独行据点';
    const comfort = owned.filter(id => { const it = cat.find(x => x.id === id); return it && !it.init; }).length; // 舒适度 = 商城添置件数（自带款不计）
    const affinity = Math.max(0, Math.min(100, Math.round(p.joy || 0))); // 亲和度 = 小银愉悦值
    // HUD：据点等级 + 繁荣度条 + 宝石（宝石可点直达杂货铺）
    const hud = `
      <div class="h99r-hud">
        <div class="h99r-hud-lv">
          <b>据点 Lv.${lv}</b><span class="nx">${this.esc(lvName)}</span>
          <div class="h99r-hud-bar"><i style="width:${Math.round(lvProg / lvNeed * 100)}%"></i></div>
          <div class="h99r-hud-row"><span>繁荣度</span><span>${prosperity} / ${lv * lvNeed}</span></div>
        </div>
        <button class="h99r-hud-gem" onclick="App.gotoWb('homeShop99')" aria-label="宝石 · 去杂货铺">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="6" y="1" width="4" height="1" fill="#f472b6"/><rect x="5" y="2" width="6" height="1" fill="#f9a8d4"/><rect x="4" y="3" width="8" height="3" fill="#ec4899"/><rect x="4" y="3" width="3" height="1" fill="#fbcfe8"/><rect x="3" y="6" width="10" height="4" fill="#db2777"/><rect x="3" y="6" width="2" height="2" fill="#f9a8d4"/><rect x="4" y="10" width="8" height="2" fill="#be185d"/><rect x="5" y="12" width="6" height="1" fill="#9d174d"/><rect x="6" y="13" width="4" height="1" fill="#831843"/><rect x="7" y="14" width="2" height="1" fill="#831843"/></svg>
          <b>${p.points}</b>
        </button>
      </div>`;
    // DQ 式对话框台词：真实花况 + 时段（关键词高亮 .h99r-hl）
    const unwatered = [];
    (h.flowers || []).forEach((f, i) => { if (f && f.growth < 1 && (f.wateredOn || []).indexOf(Store.today()) === -1) unwatered.push(i); });
    const nearBloom = (h.flowers || []).find(f => f && f.growth >= 0.75 && f.growth < 1);
    const dqHtml = nearBloom
      ? `主人，「${this._home99KindInfo(nearBloom.kind).n}」的花苞鼓鼓的了——<b class="h99r-hl">浇浇水，明天就开</b>。盛开之后，它就一直开在这里陪你。`
      : unwatered.length
        ? `主人，还有 <b class="h99r-hl">${unwatered.length} 盆花</b>今天没喝水。浇过水的当天长得快一点，不浇也没关系——它们不会枯，只是慢慢长。`
        : bloomed
          ? `主人，今天的花都喝饱啦。现在有 <b class="h99r-hl">${bloomed} 朵</b>开着，夜里它们会替你把萤火虫引来。`
          : { dawn: '主人，天刚亮，小家先醒了。要不要先去花园埋一颗种子？', day: '主人，阳光正好。这个家是你一点点攒起来的，每一件都是。', dusk: '主人，黄昏了。今天也把自己照顾得很好，了不起。', night: '主人，夜深了。灯留着，花睡着，我守着。' }[sky.key];
    // 小银立绘：对话框右侧完整脸（32×34 canvas 像素猫 · 与场景内同一只；文字区预留右侧空间，零遮挡）
    let catPortrait = '';
    try {
      const url = (typeof window !== 'undefined' && window.__px99CatIdleUrl) || '';
      // v12.9.40 下载悬浮键修复：小银立绘改背景图渲染（<img> 会触发手机浏览器原生「下载图片」悬浮键）
      if (url) catPortrait = `<span class="h99r-dq-cat" role="img" aria-label="小银" style="background-image:url('${url}')"></span>`;
    } catch (_) {}
    // 灵植图鉴：道具栏槽位（盆位即槽位 · 快捷键角标 · 增益 tag 仅盛开显示）
    let inv = '';
    for (let i = 0; i < h.pots; i++) {
      const f = h.flowers[i];
      if (f) {
        const st = this._home99Stage(f.growth);
        const k = this._home99KindInfo(f.kind);
        inv += `<div class="h99r-slot${st === 4 ? ' bloom' : ''}" onclick="App._home99WaterAt(${i})">
          <span class="h99r-key">${i + 1}</span>
          ${st === 4 ? '<span class="h99r-buff">增益·常驻</span>' : ''}
          <svg viewBox="-42 -86 84 154" preserveAspectRatio="xMidYMid meet">${this._home99FlowerSvg(f)}</svg>
          <div class="h99r-slot-nm">${k.n}</div>
          <div class="h99r-slot-st">${st === 4 ? '盛开' : this._home99StageName(st) + ' ' + Math.round(Math.min(1, f.growth) * 100) + '%'}</div>
        </div>`;
      } else {
        inv += `<div class="h99r-slot empty" onclick="App.gotoWb('garden99')">
          <span class="h99r-key">${i + 1}</span>
          <svg viewBox="-42 -50 84 108"><path d="M-24,2 h48 l-7,42 h-34 Z" fill="rgba(255,255,255,.55)" stroke="#b91c1c" stroke-width="2" stroke-dasharray="5 4"/><ellipse cx="0" cy="2" rx="24" ry="6" fill="none" stroke="#b91c1c" stroke-width="2" stroke-dasharray="5 4"/><text y="30" text-anchor="middle" font-size="26" fill="#b91c1c">＋</text></svg>
          <div class="h99r-slot-nm">空盆位</div>
          <div class="h99r-slot-st">去花园播种</div>
        </div>`;
      }
    }
    // 据点日常：浇水（第一盆未浇）/ 陪伴小银 / 打理据点（与效果图同三条）
    const today = Store.today();
    const firstUnwatered = unwatered[0];
    const wateredToday = flowers.filter(f => f.growth < 1 && (f.wateredOn || []).indexOf(today) !== -1).length;
    const seedTotal = Object.keys(h.seedStock || {}).reduce((s, k) => s + (h.seedStock[k] || 0), 0);
    const chores = `
      <div class="h99r-chores">
        <div class="h99r-chore">
          <span class="h99r-ch-em">💧</span>
          <div class="h99r-ch-txt">
            <div class="h99r-ch-t">浇灌灵植 ${growing ? `<span class="h99r-ch-ok">今日已浇 ${wateredToday}/${growing} 盆</span>` : ''}</div>
            <div class="h99r-ch-d">当日生长 ×1.6 · 不浇也不会枯萎</div>
          </div>
          ${firstUnwatered !== undefined
            ? `<button class="h99r-ch-go" onclick="App._home99WaterAt(${firstUnwatered})">浇 灌</button>`
            : (seedTotal ? `<button class="h99r-ch-go" onclick="App.gotoWb('garden99')">播 种</button>` : `<button class="h99r-ch-go" onclick="App.gotoWb('homeShop99')">购 种</button>`)}
        </div>
        <div class="h99r-chore">
          <span class="h99r-ch-em">🐱</span>
          <div class="h99r-ch-txt">
            <div class="h99r-ch-t">陪伴小银 <span class="h99r-ch-ok">愉悦 ${affinity}/100</span></div>
            <div class="h99r-ch-d">听它说句话 · 去宠物页摸摸它</div>
          </div>
          <button class="h99r-ch-go" onclick="App._home99CatTap()">听 听</button>
        </div>
        <div class="h99r-chore">
          <span class="h99r-ch-em">🧹</span>
          <div class="h99r-ch-txt">
            <div class="h99r-ch-t">打理据点 <span class="h99r-ch-ok">舒适度 ${comfort} 件</span></div>
            <div class="h99r-ch-d">添一件家具 · 繁荣度随装修累积上升</div>
          </div>
          <button class="h99r-ch-go" onclick="App.gotoWb('homeShop99')">去装修</button>
        </div>
      </div>`;
    return `
    <div class="h99r-wrap">
      <div class="h99r-stage">
        ${hud}
        <div class="h99r-scene">${this._home99Scene()}</div>
      </div>
      <div class="h99r-dq">
        <span class="h99r-dq-name">小 银</span>
        ${catPortrait}
        <div class="h99r-dq-txt">${dqHtml}</div>
        <span class="h99r-dq-next">▼</span>
      </div>
      <div class="h99r-stats">
        <div class="h99r-stat"><span class="h99r-stat-ico">⚔️</span><div><div><b>${prosperity}</b><i>繁荣度</i></div><div class="h99r-mini"><span style="width:${Math.round(lvProg / lvNeed * 100)}%"></span></div></div></div>
        <div class="h99r-stat"><span class="h99r-stat-ico">🛋️</span><div><div><b>${comfort}</b><i>舒适度·件</i></div><div class="h99r-mini"><span style="width:${Math.min(100, Math.round(comfort / 19 * 100))}%"></span></div></div></div>
        <div class="h99r-stat"><span class="h99r-stat-ico">💗</span><div><div><b>${affinity}</b><i>亲和度</i></div><div class="h99r-mini"><span style="width:${affinity}%"></span></div></div></div>
      </div>
      <div class="h99r-sec-t"><b>🌿 灵植图鉴</b><span>HERB CODEX</span><em>盛开提供常驻好心情 · 点盆位浇水</em></div>
      <div class="h99r-inv">${inv}</div>
      ${chores}
      <div class="h99r-hotbar">
        <button class="h99r-hb" onclick="App.gotoWb('garden99')"><span>🌱</span><b>花 园</b></button>
        <button class="h99r-hb" onclick="App.gotoWb('homeShop99')"><span>🛒</span><b>杂货铺</b></button>
        <button class="h99r-hb" onclick="App.gotoWb('pet99')"><span>🐱</span><b>小 银</b></button>
        <button class="h99r-hb" onclick="App.gotoWb('rpg99')"><span>⚔️</span><b>独行者</b></button>
      </div>
    </div>`;
  },

  // ==================== 页面：花园（养花）====================
  _wbGarden99(wb, W) {
    const h = this._home99Tick();
    const kinds = this._home99FlowerKinds();
    const bloomed = (h.flowers || []).filter(f => f && f.growth >= 1).length;
    const wateredToday = (h.flowers || []).filter(f => f && (f.wateredOn || []).indexOf(Store.today()) !== -1).length;
    const stockHtml = kinds.filter(k => (h.seedStock || {})[k.id] > 0)
      .map(k => `<button class="btn btn-sm" style="margin:2px;background:#ecfdf5;border:1px solid #86efac;color:#166534" onclick="App._home99Plant('${k.id}')">${k.ico} ${k.n} ×${h.seedStock[k.id]}</button>`).join('') || '<span style="font-size:12px;color:#94a3b8">口袋里还没有种子——去小家商城买一包吧</span>';
    let slots = '';
    for (let i = 0; i < h.pots; i++) {
      const f = h.flowers[i];
      if (f) {
        const st = this._home99Stage(f.growth);
        const pct = Math.round(Math.min(1, f.growth) * 100);
        const k = this._home99KindInfo(f.kind);
        const watered = (f.wateredOn || []).indexOf(Store.today()) !== -1;
        slots += `<div class="h99-pot-card">
          <div class="h99-pot-svg">${this._home99FlowerSvg(f)}</div>
          <div class="h99-pot-name">${k.ico} ${k.n} <span class="h99-stage-tag s${st}">${st === 4 ? '🌸 盛开' : this._home99StageName(st) + ' ' + pct + '%'}</span></div>
          ${st < 4 ? `<div class="h99-bar"><i style="width:${pct}%"></i></div>` : '<div class="h99-bar done"><i style="width:100%"></i></div>'}
          <div class="h99-pot-btns">
            ${st < 4 ? `<button class="btn btn-sm ${watered ? 'btn-ghost' : 'btn-primary'}" style="margin:0" ${watered ? 'disabled' : ''} onclick="App._home99WaterAt(${i})">${watered ? '💧 今日已浇' : '💧 浇水'}</button>` : '<span class="h99-bloom-tag">已盛开，好好欣赏</span>'}
            <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App._home99RemoveAt(${i})">收起</button>
          </div>
        </div>`;
      } else {
        slots += `<div class="h99-pot-card empty">
          <div class="h99-pot-svg"><div class="h99-peek-empty big">＋</div></div>
          <div class="h99-pot-name" style="color:#a89277">空花盆位 ${i + 1}</div>
          <div class="h99-pot-btns">${((h.seedStock || {})[Object.keys(h.seedStock || {}).find(kk => (h.seedStock || {})[kk] > 0) || ''] || 0) > 0 ? `<button class="btn btn-sm btn-primary" style="margin:0" onclick="App._home99Plant('${Object.keys(h.seedStock).find(kk => h.seedStock[kk] > 0)}')">🌱 播种</button>` : '<span style="font-size:11px;color:#94a3b8">买包种子来种下吧</span>'}</div>
        </div>`;
      }
    }
    return `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🌱</span>花园 · 养花
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">盛开 ${bloomed} 朵 · 今日已浇 ${wateredToday} 盆</span>
        <button class="btn btn-ghost btn-sm p99-title-btn" onclick="App.gotoWb('homeShop99')">🛒 买种子</button>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">种下种子，每天<b>浇一次水</b>（当日生长 <b>1.6 倍</b>加速）；忘记浇水也不会枯萎——花只是慢慢长。盛开的花会一直开在你的小家里，夜里还会引来萤火虫 ✨</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🎒</span>种子口袋</div>
      <div style="display:flex;flex-wrap:wrap;margin-top:8px">${stockHtml}</div>
    </div>
    <div class="h99-pot-grid">${slots}</div>
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.gotoWb('home99')">🏠 回小家</button></div>`;
  },

  // ==================== 页面：小家商城 ====================
  // v12.8：商品图标全面像素化（canvas sprite；壁纸/地板=16×16 预览块，花种子=花头 sprite，家具=场景同款）
  _home99GoodsIco(px, ico) {
    try {
      const url = (window.__px99Home || {})[px];
      // v12.9.40 下载悬浮键修复：商品图标禁长按菜单（尺寸自适应 sprite 原生大小，pointer-events:none 彻底压掉下载键）
      if (url) return `<img class="h99-pxi" src="${url}" alt="${this.esc(ico || '')}" draggable="false" oncontextmenu="return false;" ondragstart="return false;" style="-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;pointer-events:none;">`;
    } catch (_) {}
    return `<span style="font-size:24px">${ico || '🪴'}</span>`;
  },
  _wbHomeShop99(wb, W) {
    const h = this._home99Data();
    const p = this._pet99Data();
    const owned = h.ownedDecor || [];
    const cat = this._home99DecorCatalog();
    const bySlot = (s) => cat.filter(x => x.slot === s);
    const decorCard = (it) => {
      const has = it.cost === 0 || owned.indexOf(it.id) !== -1;
      const variantBase = it.slot === 'furn' ? (it.base || (cat.some(x => x.base === it.id) ? it.id : null)) : null; // 变体槽位键（变体或基准款）
      const on = (it.slot === 'wallpaper' && h.wallpaper === it.id)
        || (it.slot === 'floor' && h.floor === it.id)
        || (variantBase && ((h.furnOn || {})[variantBase] === it.id)); // 当前摆放中
      return `<div class="h99-goods${on ? ' on' : ''}">
        ${this._home99GoodsIco(it.px, it.ico)}
        <div class="h99-goods-t"><b>${it.n}</b><div>${it.d}</div></div>
        ${has
          ? (it.slot === 'wallpaper' || it.slot === 'floor' || variantBase)
            ? `<button class="btn btn-sm ${on ? 'btn-ghost' : 'btn-primary'}" style="margin:0" onclick="App._home99UseDecor('${it.id}')">${on ? '使用中' : '换上'}</button>`
            : '<span class="h99-owned-tag">已摆放 ✓</span>'
          : `<button class="btn btn-sm btn-primary" style="margin:0" onclick="App._home99BuyDecor('${it.id}')">💎 ${it.cost}</button>`}
      </div>`;
    };
    const seedCard = (k) => `<div class="h99-goods">
      ${this._home99GoodsIco('head_' + k.id, k.ico)}
      <div class="h99-goods-t"><b>${k.n}</b><div>${k.d} · 约 ${k.days} 天盛开</div></div>
      <button class="btn btn-sm btn-primary" style="margin:0" onclick="App._home99BuySeed('${k.id}')">💎 ${k.cost}</button>
    </div>`;
    return `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🛒</span>小家商城
        <span class="sub" style="font-size:12px;color:#7c3aed;font-weight:800;margin-left:6px">💎 ${p.points} 颗</span>
        <button class="btn btn-ghost btn-sm p99-title-btn" onclick="App.gotoWb('home99')">🏠 回小家</button>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">宝石来自你的真实自律行为（【独行信条】RPG 引擎：<b>当日累计打卡 15 个 +1 颗 / 30 个 +2 颗</b> · 阿福审核通过的合格分类记录 <b>每日 +1 颗</b>），<b>只增不减</b>；这里的一切都是外观与陪伴向内容，<b>无任何属性加成、无惩罚</b>。</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🌱</span>花种子（买回自动进口袋，去花园种下）</div>
      <div class="h99-goods-grid">${this._home99FlowerKinds().map(seedCard).join('')}</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🧵</span>壁纸（${bySlot('wallpaper').length} 款）</div>
      <div class="h99-goods-grid">${bySlot('wallpaper').map(decorCard).join('')}</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🟫</span>地板（${bySlot('floor').length} 款）</div>
      <div class="h99-goods-grid">${bySlot('floor').map(decorCard).join('')}</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🛋️</span>家具（买回自动摆进小家 · ${owned.filter(id => cat.find(x => x.id === id && x.slot === 'furn')).length}/${bySlot('furn').length} 件）</div>
      <div class="h99-goods-grid">${bySlot('furn').map(decorCard).join('')}</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🪴</span>花盆位（${h.pots}/6 · 每买一个多一盆花）</div>
      <div class="h99-goods-grid">${bySlot('pot').map((it, i) => { const used = h.pots >= (3 + i); return used ? `<div class="h99-goods">${this._home99GoodsIco(it.px, it.ico)}<div class="h99-goods-t"><b>${it.n}</b><div>${it.d}</div></div><span class="h99-owned-tag">已启用 ✓</span></div>` : decorCard(it); }).join('')}</div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">🍜</span>小银口粮与装扮（宠物商城）</div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">给小银加餐、给小银买像素装扮——都是这个宝石钱包（宠物商城：🎀 装扮衣柜 + 🍜 口粮）。</div>
      <div style="margin-top:8px"><button class="btn btn-primary btn-sm" style="margin:0" onclick="App.gotoWb('pet99Shop')">前往宠物商城 →</button></div>
    </div>
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.gotoWb('home99')">🏠 回小家</button></div>`;
  },
});

// 花盆 id 生成（避免与 Store._id 耦合）
function now99() { return Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
