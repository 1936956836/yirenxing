// 97-food99.js —— v12.9.46 【今天吃什么】像素盲盒（饮食数据页置顶）
// [功能组] G4-数据洞察（饮食域：数据中心 · 饮食数据页）
//
// 设计（用户规则）：
//   · 1 个像素盲盒：点击开盒随机决定今天吃什么（火锅/炒菜/港式/日式/烤肉/卤味/烧烤/韩餐/泰餐/
//     西餐/烤鱼/煲类/粥粉面/麻辣烫/快餐便当/小龙虾/炸串/轻食甜品 共 18 种）
//   · 每种食物配像素风格画面（低分辨率画布手绘 + 最近邻放大 · 与小银/小家同一套像素画法 · 零图片资源）
//   · 专属音效：开盒摇晃（box 木壳咯咯）→ 开出（reveal 上行琶音 + 闪光）· 由 96-perm99.js 音效引擎合成
//   · 开启动画：摇晃 0.62s → 爆开闪光 → 结果卡弹入；可「换一个」重开（当日结果覆盖记录）
// 数据：localStorage one-xing-food99-v1（独立键 · 重置主存档不影响）
(function () {
  // ==================== 像素绘制引擎（低分辨率作画 + 禁平滑放大 = 8-bit 硬边颗粒）====================
  const px = (w, h, scale, draw) => {
    const s = document.createElement('canvas'); s.width = w; s.height = h;
    const c2 = s.getContext('2d');
    // v12.9.54 守卫：canvas 2d 上下文不可用（极端环境）时返回占位，不让加载期绘制中断整个 App 脚本
    if (!c2) return '';
    draw(c2);
    const o = document.createElement('canvas'); o.width = w * scale; o.height = h * scale;
    const k = o.getContext('2d');
    if (!k) return '';
    k.imageSmoothingEnabled = false;
    k.drawImage(s, 0, 0, o.width, o.height);
    return o.toDataURL();
  };
  const dot = (c, col, x, y, r) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };

  // —— 盲盒本体（16×16：粉色礼盒 + 金丝带 + 问号）——
  const BOX_IMG = px(16, 16, 5, (c) => {
    const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    R(2, 6, 12, 8, '#F9A8D4');  R(2, 6, 12, 1, '#FBCFE8'); R(2, 13, 12, 1, '#EC4899');
    R(1, 4, 14, 3, '#FBCFE8');  R(1, 6, 14, 1, '#EC4899'); // 盒盖
    R(7, 6, 2, 8, '#FCD34D');   R(2, 9, 12, 2, '#FCD34D'); // 金丝带
    R(5, 1, 2, 2, '#FCD34D');   R(9, 1, 2, 2, '#FCD34D');  R(7, 2, 2, 2, '#F59E0B'); R(6, 0, 4, 1, '#F59E0B'); // 蝴蝶结
    // 问号（白）
    R(6, 7, 4, 1, '#fff'); R(5, 8, 2, 1, '#fff'); R(9, 8, 2, 2, '#fff'); R(8, 10, 2, 1, '#fff'); R(8, 12, 2, 1, '#fff');
    R(2, 14, 12, 1, '#BE185D'); // 底影
  });

  // —— 18 种食物像素画（16×12 · 每格 1px 画布坐标）——
  const FOODS = {
    hotpot: { n: '火锅', d: '热气腾腾，涮出今天的好心情', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(2, 4, 12, 6, '#DC2626'); R(2, 4, 12, 1, '#FCA5A5'); R(1, 6, 1, 3, '#7F1D1D'); R(14, 6, 1, 3, '#7F1D1D'); // 锅
      R(4, 5, 8, 2, '#F97316'); R(7, 5, 2, 2, '#FDBA74'); // 红汤鸳鸯
      R(5, 6, 1, 1, '#4ADE80'); R(10, 6, 1, 1, '#4ADE80'); R(7, 7, 2, 1, '#FDE68A'); // 葱花豆腐
      R(4, 1, 1, 2, '#E2E8F0'); R(7, 0, 1, 3, '#F8FAFC'); R(11, 1, 1, 2, '#E2E8F0'); // 蒸汽
      R(3, 10, 10, 1, '#B91C1C'); R(2, 11, 12, 1, '#94A3B8'); // 锅底影
    }) },
    stirfry: { n: '炒菜', d: '家常烟火气，最抚凡人心', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(3, 3, 10, 4, '#334155'); R(3, 3, 10, 1, '#64748B'); R(1, 6, 14, 2, '#1E293B'); // 黑锅+锅沿
      R(4, 2, 2, 2, '#4ADE80'); R(7, 1, 3, 3, '#22C55E'); R(11, 2, 2, 2, '#FB923C'); R(6, 3, 1, 1, '#4ADE80'); // 菜
      R(5, 7, 2, 2, '#FBBF24'); R(9, 7, 2, 2, '#F59E0B'); R(3, 8, 1, 1, '#FDE68A'); // 火苗
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    hk: { n: '港式', d: '一盅两件，慢下来叹生活', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(3, 2, 10, 3, '#D9A066'); R(3, 2, 10, 1, '#F0C894'); // 蒸笼盖
      for (let i = 4; i < 13; i += 3) R(i, 3, 1, 2, '#B45309'); // 竹纹
      R(2, 5, 12, 5, '#B45309'); R(2, 5, 12, 1, '#D9A066'); // 笼身
      R(4, 6, 3, 2, '#FEF9C3'); R(8, 6, 3, 2, '#FEF9C3'); // 饺皮
      R(5, 6, 1, 1, '#F87171'); R(9, 6, 1, 1, '#F87171'); // 虾仁
      R(4, 1, 1, 1, '#E2E8F0'); R(8, 0, 1, 1, '#F8FAFC'); R(11, 1, 1, 1, '#E2E8F0'); // 蒸汽
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    jp: { n: '日式', d: '仪式感满满的精致一餐', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(2, 7, 12, 4, '#F8FAFC'); R(2, 7, 12, 1, '#CBD5E1'); R(2, 10, 12, 1, '#E2E8F0'); // 白盘
      R(4, 6, 4, 2, '#FDE68A'); R(9, 6, 4, 2, '#FDE68A'); // 米饭
      R(4, 5, 4, 1, '#FB923C'); R(9, 5, 4, 1, '#FB923C'); R(6, 5, 1, 1, '#F87171'); R(11, 5, 1, 1, '#F87171'); // 三文鱼
      R(6, 6, 1, 1, '#22C55E'); R(11, 6, 1, 1, '#22C55E'); // 芥末
      R(1, 4, 2, 1, '#0F172A'); R(13, 4, 2, 1, '#0F172A'); // 海苔筷
      R(2, 11, 12, 1, '#94A3B8');
    }) },
    bbq: { n: '烤肉', d: '滋滋作响，肉香四溢', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(1, 5, 14, 3, '#475569'); for (let i = 2; i < 14; i += 2) R(i, 6, 1, 1, '#334155'); // 烤网
      R(3, 3, 4, 2, '#92400E'); R(8, 2, 4, 3, '#B45309'); R(12, 3, 2, 2, '#92400E'); // 肉片
      R(4, 3, 1, 1, '#DC2626'); R(9, 3, 1, 1, '#DC2626'); // 生肉边
      R(5, 8, 2, 1, '#F97316'); R(9, 8, 2, 1, '#FBBF24'); R(3, 9, 1, 1, '#FDBA74'); // 炭火
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    braised: { n: '卤味', d: '酱香入魂，越嚼越香', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(2, 6, 12, 4, '#F1F5F9'); R(2, 6, 12, 1, '#CBD5E1'); // 白盘
      R(3, 4, 4, 3, '#78350F'); R(4, 3, 2, 1, '#92400E'); // 卤鸡腿形
      R(8, 5, 3, 2, '#92400E'); R(11, 4, 3, 3, '#A16207'); // 卤蛋+豆干
      R(3, 4, 4, 1, '#531108'); R(8, 5, 3, 1, '#650f12');
      R(6, 5, 1, 1, '#FCD34D'); R(11, 5, 1, 1, '#FCD34D'); // 高光
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    skewer: { n: '烧烤', d: '炭火与孜然的深夜之约', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(3, 1, 1, 9, '#A16207'); R(7, 1, 1, 9, '#A16207'); R(11, 1, 1, 9, '#A16207'); // 竹签
      R(2, 2, 3, 2, '#B45309'); R(2, 5, 3, 2, '#92400E'); R(2, 8, 3, 1, '#B45309'); // 串1
      R(6, 2, 3, 2, '#92400E'); R(6, 5, 3, 2, '#B45309'); R(6, 8, 3, 1, '#92400E'); // 串2
      R(10, 2, 3, 2, '#B45309'); R(10, 5, 3, 2, '#92400E'); R(10, 8, 3, 1, '#B45309'); // 串3
      R(3, 2, 1, 1, '#FCD34D'); R(7, 2, 1, 1, '#FCD34D'); R(11, 2, 1, 1, '#FCD34D'); // 孜然粒
      R(1, 10, 14, 1, '#94A3B8');
    }) },
    korean: { n: '韩餐', d: '辣酱拌出韩式热情', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(2, 4, 12, 6, '#1E293B'); R(2, 4, 12, 1, '#334155'); R(1, 5, 1, 4, '#0F172A'); R(14, 5, 1, 4, '#0F172A'); // 黑石锅
      R(3, 4, 10, 2, '#F8FAFC'); // 米饭
      R(5, 4, 3, 1, '#DC2626'); R(9, 4, 3, 1, '#DC2626'); // 红酱
      R(7, 3, 2, 2, '#FDE047'); // 蛋黄
      R(4, 4, 1, 1, '#4ADE80'); R(11, 4, 1, 1, '#FB923C'); // 蔬菜粒
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    thai: { n: '泰餐', d: '酸辣鲜香的东南亚风情', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(2, 5, 12, 5, '#F8FAFC'); R(2, 5, 12, 1, '#CBD5E1'); R(2, 9, 12, 1, '#E2E8F0'); // 白碗
      R(3, 6, 10, 2, '#DC2626'); R(4, 6, 8, 1, '#EF4444'); // 冬阴功红汤
      R(5, 5, 3, 2, '#FB923C'); R(9, 5, 3, 2, '#FB923C'); // 虾
      R(4, 5, 1, 1, '#22C55E'); R(11, 5, 1, 1, '#22C55E'); // 柠檬叶
      R(7, 6, 1, 1, '#4ADE80'); R(9, 6, 1, 1, '#4ADE80'); // 辣椒香菜
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    western: { n: '西餐', d: '刀叉之间的优雅时光', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(3, 4, 10, 6, '#F8FAFC'); R(3, 4, 10, 1, '#CBD5E1'); R(3, 9, 10, 1, '#E2E8F0'); R(4, 5, 8, 1, '#EFF6FF'); // 白盘
      R(5, 5, 6, 3, '#7C2D12'); R(5, 5, 6, 1, '#9A3412'); R(6, 6, 4, 1, '#531C0C'); // 牛排
      R(7, 6, 2, 1, '#DC2626'); // 酱汁
      R(4, 8, 2, 1, '#4ADE80'); R(10, 8, 2, 1, '#86EFAC'); // 配菜
      R(1, 3, 1, 6, '#94A3B8'); R(14, 3, 1, 6, '#94A3B8'); // 刀叉
      R(2, 11, 12, 1, '#94A3B8');
    }) },
    fish: { n: '烤鱼', d: '麻辣鲜香，一条鱼的狂欢', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(3, 4, 9, 4, '#92400E'); R(3, 4, 9, 1, '#B45309'); R(12, 5, 3, 2, '#78350F'); R(14, 4, 1, 1, '#78350F'); R(14, 7, 1, 1, '#78350F'); // 鱼身+尾
      R(4, 5, 1, 1, '#fff'); // 鱼眼
      R(6, 4, 1, 4, '#DC2626'); R(8, 4, 1, 4, '#DC2626'); R(10, 4, 1, 4, '#DC2626'); // 红辣段
      R(5, 8, 8, 1, '#F97316'); R(4, 9, 1, 1, '#FBBF24'); R(9, 9, 1, 1, '#FBBF24'); // 底部火
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    claypot: { n: '煲类', d: '小火慢煨，温暖治愈', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(3, 3, 10, 2, '#B45309'); R(3, 3, 10, 1, '#D97706'); R(4, 2, 8, 1, '#92400E'); R(7, 1, 2, 1, '#D97706'); // 砂煲盖+钮
      R(2, 5, 12, 5, '#92400E'); R(2, 5, 12, 1, '#B45309'); R(1, 6, 1, 3, '#78350F'); R(14, 6, 1, 3, '#78350F'); // 煲身+耳
      R(4, 6, 8, 2, '#F8FAFC'); R(6, 6, 4, 1, '#FDE68A'); // 米饭
      R(5, 7, 1, 1, '#4ADE80'); R(9, 7, 1, 1, '#FB923C'); R(7, 7, 1, 1, '#DC2626'); // 浇头
      R(4, 1, 1, 1, '#E2E8F0'); R(8, 0, 1, 1, '#F8FAFC'); R(11, 1, 1, 1, '#E2E8F0'); // 蒸汽
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    noodle: { n: '粥粉面', d: '一碗落胃，简单满足', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(2, 4, 12, 6, '#F8FAFC'); R(2, 4, 12, 1, '#CBD5E1'); R(2, 9, 12, 1, '#E2E8F0'); R(1, 5, 1, 4, '#E2E8F0'); R(14, 5, 1, 4, '#E2E8F0'); // 白碗
      R(4, 4, 8, 1, '#FDE047'); R(5, 5, 6, 1, '#FACC15'); // 面条
      R(6, 3, 3, 1, '#B45309'); // 叉烧
      R(5, 3, 1, 1, '#4ADE80'); R(10, 3, 1, 1, '#4ADE80'); R(8, 4, 1, 1, '#4ADE80'); // 葱花
      R(12, 1, 1, 3, '#B45309'); R(14, 1, 1, 3, '#B45309'); // 筷子
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    malatang: { n: '麻辣烫', d: '自由搭配的快乐冒菜', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(2, 5, 12, 5, '#DC2626'); R(2, 5, 12, 1, '#EF4444'); R(1, 6, 1, 3, '#B91C1C'); R(14, 6, 1, 3, '#B91C1C'); // 红碗
      R(3, 5, 10, 2, '#F97316'); R(4, 5, 3, 1, '#FDBA74'); // 红油汤
      R(5, 4, 2, 2, '#F8FAFC'); R(9, 4, 2, 2, '#FDE047'); R(12, 5, 1, 2, '#A16207'); // 丸子+豆腐串
      R(4, 4, 1, 1, '#22C55E'); R(11, 4, 1, 1, '#22C55E'); // 青菜
      R(6, 4, 1, 1, '#fff'); R(10, 4, 1, 1, '#fff'); // 芝麻
      R(2, 10, 12, 1, '#94A3B8');
    }) },
    bento: { n: '快餐便当', d: '高效能量，即刻补给', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(1, 3, 14, 7, '#F8FAFC'); R(1, 3, 14, 1, '#CBD5E1'); R(1, 9, 14, 1, '#E2E8F0'); // 盒
      R(1, 5, 14, 1, '#CBD5E1'); R(7, 3, 1, 7, '#CBD5E1'); // 分格
      R(2, 6, 5, 3, '#F8FAFC'); R(3, 6, 3, 1, '#E2E8F0'); // 米饭格
      R(8, 4, 6, 2, '#B45309'); R(9, 4, 1, 1, '#DC2626'); R(12, 4, 1, 1, '#DC2626'); // 肉格
      R(8, 6, 6, 3, '#4ADE80'); R(9, 7, 1, 1, '#DC2626'); R(12, 7, 1, 1, '#FDE047'); // 菜格
      R(1, 10, 14, 1, '#94A3B8');
    }) },
    crayfish: { n: '小龙虾', d: '剥壳的快乐，停不下来', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(4, 4, 8, 4, '#DC2626'); R(4, 4, 8, 1, '#EF4444'); R(5, 5, 6, 2, '#B91C1C'); // 虾身
      R(2, 2, 3, 3, '#EF4444'); R(11, 2, 3, 3, '#EF4444'); // 大钳
      R(6, 3, 4, 1, '#B91C1C'); // 头
      R(6, 8, 4, 1, '#DC2626'); R(5, 9, 6, 1, '#B91C1C'); R(4, 10, 8, 1, '#7F1D1D'); // 尾扇
      R(7, 5, 1, 1, '#fff'); R(9, 5, 1, 1, '#fff'); // 眼
      R(2, 11, 12, 1, '#94A3B8');
    }) },
    fried: { n: '炸串', d: '咔嚓一口，罪恶但快乐', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(4, 1, 1, 10, '#A16207'); R(11, 1, 1, 10, '#A16207'); // 签
      R(3, 2, 3, 3, '#FBBF24'); R(3, 6, 3, 3, '#F59E0B'); // 串1（金黄）
      R(10, 2, 3, 3, '#FDE047'); R(10, 6, 3, 3, '#FBBF24'); // 串2
      R(4, 2, 1, 1, '#FDE68A'); R(11, 2, 1, 1, '#FEF3C7'); // 高光
      R(3, 9, 4, 1, '#D97706'); R(10, 9, 4, 1, '#D97706'); // 底油
      R(1, 10, 14, 1, '#94A3B8');
    }) },
    dessert: { n: '轻食甜品', d: '清爽轻盈，甜一点也无妨', img: px(16, 12, 5, (c) => {
      const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
      R(4, 3, 8, 6, '#F9A8D4'); R(4, 3, 8, 1, '#FBCFE8'); R(4, 8, 8, 1, '#EC4899'); // 粉蛋糕
      R(4, 2, 8, 1, '#FDA4AF'); R(7, 0, 2, 2, '#FDA4AF'); // 奶油+草莓
      R(5, 5, 1, 1, '#FDE047'); R(10, 5, 1, 1, '#FDE047'); // 装饰粒
      R(3, 9, 10, 1, '#E2E8F0'); R(2, 10, 12, 1, '#94A3B8'); // 盘
      R(13, 1, 1, 2, '#4ADE80'); R(14, 0, 1, 1, '#4ADE80'); // 薄荷
    }) },
  };
  const KEYS = Object.keys(FOODS);

  Object.assign(App, {
    _food99Key: 'one-xing-food99-v1',
    _food99Data() {
      try { const r = JSON.parse(localStorage.getItem(this._food99Key) || 'null'); if (r) return r; } catch (e) {}
      return { picks: {} };   // { picks: { 'YYYY-MM-DD': { k: 'hotpot', ts: 1234567890 } } }
    },
    _food99Save(d) { try { localStorage.setItem(this._food99Key, JSON.stringify(d)); } catch (e) {} },

    // 盲盒卡（饮食数据页置顶 · 结果随日期走）
    _food99BoxCard() {
      const d = this._food99Data();
      const today = (Store && Store.today) ? Store.today() : '';
      const pick = d.picks && d.picks[today];
      const hasPick = pick && FOODS[pick.k];
      const picked = hasPick ? FOODS[pick.k] : null;
      const ts = hasPick ? new Date(pick.ts) : null;
      const tsStr = ts ? String(ts.getHours()).padStart(2, '0') + ':' + String(ts.getMinutes()).padStart(2, '0') : '';
      return `
      <div class="card food99-card">
        <div class="card-title"><span class="ico">🎁</span>今天吃什么？
          <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">v12.9.46 · 像素盲盒 18 种美食</span>
        </div>
        <div class="food99-stage">
          <div class="food99-box-col">
            <img class="food99-box" id="food99box" src="${BOX_IMG}" alt="美食盲盒" draggable="false">
            <div class="food99-box-hint">${hasPick ? '再开一次换一个' : '点盲盒 · 决定今天吃什么'}</div>
          </div>
          <div class="food99-res" id="food99res">
            ${picked ? `
              <img class="food99-res-img" src="${picked.img}" alt="${picked.n}" draggable="false">
              <div class="food99-res-name">${picked.n}</div>
              <div class="food99-res-desc">${picked.d}</div>
              <div class="food99-res-ts">今日选择 · ${tsStr}${pick.count > 1 ? ` · 第 ${pick.count} 次开盒` : ''}</div>
            ` : `
              <div class="food99-res-empty">？？？</div>
              <div class="food99-res-desc">18 种美食等你翻牌<br>火锅 · 烤肉 · 日式 · 小龙虾 …</div>
            `}
          </div>
        </div>
        <div class="food99-btns">
          <button class="btn btn-primary food99-open-btn" id="food99open" onclick="App._food99Open()">🎁 开盲盒</button>
        </div>
      </div>`;
    },

    // 开盒交互：摇晃音+动画 → 爆开 → 开出音 + 结果弹入 → 存当日选择
    _food99Open() {
      const box = document.getElementById('food99box');
      const btn = document.getElementById('food99open');
      if (!box || box.dataset.busy === '1') return;
      box.dataset.busy = '1';
      if (btn) btn.disabled = true;
      this._sfx99('box');                          // 木壳咯咯摇晃
      box.classList.add('shake');
      setTimeout(() => {
        box.classList.remove('shake');
        box.classList.add('burst');                 // 爆开闪光
        const k = KEYS[Math.floor(Math.random() * KEYS.length)];
        const d = this._food99Data();
        const today = (Store && Store.today) ? Store.today() : '';
        const prev = (d.picks || {})[today] || {};
        d.picks = d.picks || {};
        d.picks[today] = { k, ts: Date.now(), count: (prev.count || 0) + 1 };
        this._food99Save(d);
        this._sfx99('reveal');                      // 上行琶音惊喜
        setTimeout(() => {
          try { this.render_workbench(); } catch (e) {}   // 重渲染显示结果（保持 tab）
          const stg = document.querySelector('.food99-stage');
          if (stg) stg.classList.add('popped');
        }, 320);
      }, 640);
    },
  });
})();
