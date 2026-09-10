// 101-earth99.js —— v12.9.46 【独行地球】宇宙观测模块（长按底部【习惯】旋钮 1 秒进入）
// [功能组] G5-情感陪伴 / G6-专注模式（观测域：治愈系太空漫游 · 参考 ORBIT 式深空观测界面）
//
// 设计（用户规则 · 独行地球）：
//   · 入口：底部导航【习惯】圆形旋钮长按 1 秒（液体音 + 深蓝圆幕渐变过渡，与独行音乐/独行空间一致）
//   · 五地质年代地球：现代 / 恐龙时代（盘古大陆）/ 冰川期（雪球地球）/ 原始海洋（太古宙）/ 熔岩地球（冥古宙）
//     —— 板块以经纬椭圆建模，按年代配置插值 → 切换年代时大陆真实「漂移」 morph 动画
//   · 实时数据叠加（现代地球）：NASA/开源接口——ISS 实时位置（wheretheiss.at）·
//     全球 24h 地震脉冲（USGS）· 真实晨昏线（当日太阳赤纬/时角计算）· 城市夜灯（45 城）
//   · 交互探索：拖动旋转（惯性）· 双指缩放 · 点击任意点 → 该地信息卡（地形/气候/最近城市/当地太阳时）
//   · 时间轴演化：46 亿年 → 现在，拖动观看大陆漂移；11 个关键节点科普弹窗
//   · 宇宙层级：地球 → 太阳系（八大行星轨道运行 · 可点选）→ 银河系（旋涡星系 · 你在这里）
//   · 行星轮播：底部太阳→海王星选择器，点选即查看对应天体档案（ORBIT 式诗意文案 + 数据）
//   · 技术说明：与全 App 一致的零依赖原生 JS + Canvas（自研正交球面投影像素渲染器，
//     Three.js 不引入——APK 离线零体积增加，移动端 WebGL 无需初始化即流畅）
//   · 数据合规：NASA/USGS/wheretheiss 开放接口免 key；离线或接口失败自动降级为模拟轨道
Object.assign(App, {

  // ==================== 常量 ====================
  EARTH99_KEY: 'one-xing-earth99-v1',

  // 城市夜灯（纬度,经度,名称,人口百万）
  EARTH99_CITIES: [
    [35.7, 139.7, '东京', 37], [28.6, 77.2, '德里', 33], [31.2, 121.5, '上海', 29], [-23.5, -46.6, '圣保罗', 22],
    [19.4, -99.1, '墨西哥城', 22], [30.0, 31.2, '开罗', 22], [23.8, 90.4, '达卡', 22], [19.1, 72.9, '孟买', 21],
    [39.9, 116.4, '北京', 21], [34.7, 135.5, '大阪', 19], [40.7, -74.0, '纽约', 19], [24.9, 67.0, '卡拉奇', 17],
    [-34.6, -58.4, '布宜诺斯艾利斯', 15], [29.6, 106.5, '重庆', 17], [41.0, 28.9, '伊斯坦布尔', 16],
    [22.6, 88.4, '加尔各答', 15], [14.6, 121.0, '马尼拉', 14], [6.5, 3.4, '拉各斯', 15], [-22.9, -43.2, '里约热内卢', 13],
    [-4.3, 15.3, '金沙萨', 15], [23.1, 113.3, '广州', 13], [34.1, -118.2, '洛杉矶', 13], [55.8, 37.6, '莫斯科', 13],
    [22.5, 114.1, '深圳', 13], [48.9, 2.3, '巴黎', 11], [4.7, -74.1, '波哥大', 11], [-6.2, 106.8, '雅加达', 11],
    [-12.0, -77.0, '利马', 11], [13.8, 100.5, '曼谷', 11], [37.6, 127.0, '首尔', 10], [51.5, -0.1, '伦敦', 10],
    [35.7, 51.4, '德黑兰', 9], [41.9, -87.6, '芝加哥', 9], [30.7, 104.1, '成都', 9], [30.6, 114.3, '武汉', 8],
    [10.8, 106.7, '胡志明市', 9], [-33.9, 151.2, '悉尼', 5], [1.35, 103.8, '新加坡', 6], [37.8, -122.4, '旧金山', 4],
    [22.3, 114.2, '香港', 7], [-1.3, 36.8, '内罗毕', 5], [25.2, 55.3, '迪拜', 3], [21.3, -157.9, '檀香山', 1],
    [61.2, -149.9, '安克雷奇', 0.3], [64.1, -21.9, '雷克雅未克', 0.1], [29.7, 91.1, '拉萨', 0.9],
  ],

  // 板块建模：名称 → 椭圆簇 [dLon,dLat,rx,ry]（相对板块中心的偏移 + 半径，单位：度）
  EARTH99_PLATES: {
    na: { n: '北美洲', blobs: [[0, 0, 24, 12], [16, 3, 12, 8], [55, 16, 10, 6], [6, -24, 8, 6]] },
    gr: { n: '格陵兰', blobs: [[0, 0, 12, 8]] },
    sa: { n: '南美洲', blobs: [[2, 15, 10, 8], [0, 0, 8, 9], [-4, -14, 7, 12]] },
    af: { n: '非洲', blobs: [[-3, 12, 18, 11], [4, -13, 11, 12], [28, -22, 2, 5]] },
    eu: { n: '欧洲', blobs: [[-10, -2, 12, 7], [12, 0, 15, 8], [0, 10, 8, 6]] },
    as: { n: '亚洲', blobs: [[5, 13, 30, 12], [-15, -5, 18, 10], [-40, -18, 11, 8], [25, -13, 13, 9]] },
    in: { n: '印度次大陆', blobs: [[0, 0, 7, 9]] },
    sea: { n: '东南亚群岛', blobs: [[-8, 0, 6, 4], [8, -2, 7, 5], [18, 3, 8, 4]] },
    au: { n: '澳大利亚', blobs: [[0, 0, 16, 10]] },
    jp: { n: '日本列岛', blobs: [[0, 0, 2.5, 7]] },
    nz: { n: '新西兰', blobs: [[0, 0, 2.5, 6]] },
    uk: { n: '英伦三岛', blobs: [[0, 0, 3.5, 4]] },
  },
  // 各年代板块位置（lon,lat）——null = 该年代尚不存在该板块
  EARTH99_ERAPOS: {
    modern:   { na: [-100, 45], gr: [-42, 72], sa: [-60, -15], af: [18, 2],   eu: [18, 50],  as: [90, 47],  in: [78, 20],  sea: [113, -2], au: [134, -25], jp: [138, 37], nz: [172, -42], uk: [-3, 54] },
    mesozoic: { na: [-35, 28],  gr: [-18, 42], sa: [-32, -22], af: [5, -12],  eu: [-2, 38],  as: [35, 42],  in: [18, -25], sea: [52, -8],  au: [38, -38],  jp: [45, 38],  nz: [45, -52],  uk: [-10, 44] },
    cryo:    { na: [-60, 12],   gr: [-30, 35], sa: [-30, -25], af: [45, -8],  eu: [20, 42],  as: [125, 25], in: [85, -18], sea: [135, -3], au: [150, -30], jp: [128, 38], nz: [160, -48], uk: [15, 50] },
    archean: { na: [-80, 20],   gr: null,      sa: [-40, -10], af: [30, 0],   eu: [10, 48],  as: [100, 35], in: [65, -5],  sea: null,      au: [135, -20], jp: null,      nz: null,      uk: null },
    hadean:  {},
  },

  // 年代定义（myr = 距今百万年区间，用于时间轴定位）
  EARTH99_ERAS: [
    { k: 'hadean', n: '熔岩地球', ico: '🌋', age: '冥古宙 · 46–40 亿年前', myrMin: 3900,
      poem: '没有大地，没有海洋，只有熔融的岩石与永不停歇的陨石坠落。',
      facts: [['地貌', '全球岩浆海覆盖，无固态地壳，陨石撞击不断'], ['气候', '表面温度 1500–4000°C，天空是炽热的红'],
              ['大气', '氢氦与火山气体，几乎没有氧气'], ['生物', '无生命——有机分子尚未形成']],
      pal: { ocean: [[26, 8, 6], [58, 16, 8]], land: [[92, 26, 16], [255, 107, 53], [255, 210, 63]], atmo: 'rgba(239,68,68,', lava: true } },
    { k: 'archean', n: '原始海洋', ico: '🌊', age: '太古宙 · 40–25 亿年前', myrMin: 725,
      poem: '铁色的海沸腾着，第一缕生命在黑暗的海底悄然点灯。',
      facts: [['地貌', '陨石大轰炸后冷却，玄武岩小陆核漂浮于原始海洋'], ['气候', '温热的甲烷温室，天空呈橙红色'],
              ['大气', '无氧：CO₂ · CH₄ · N₂ 火山排气'], ['生物', '38 亿年前最早生命——海底热泉古菌']],
      pal: { ocean: [[8, 40, 48], [12, 58, 68]], land: [[93, 74, 54], [110, 90, 62], [125, 106, 69]], atmo: 'rgba(251,146,60,', haze: true } },
    { k: 'cryo', n: '冰川期地球', ico: '❄️', age: '成冰纪「雪球地球」· 7.2–6.35 亿年前', myrMin: 630,
      poem: '整颗星球沉入白色的长眠，只有火山还记得温暖的模样。',
      facts: [['地貌', '全球冰封，连赤道也覆盖海冰，火山岛链在冰原露出黑色脊线'], ['气候', '均温约 -50°C，反照率失控循环'],
              ['大气', '氧气缓慢上升，二氧化碳被冰川封存'], ['生物', '海冰之下的生命于黑暗中蛰伏']],
      pal: { ocean: [[128, 176, 214], [158, 199, 230]], land: [[226, 240, 250], [201, 223, 240], [168, 198, 221]], atmo: 'rgba(186,230,253,', snow: true } },
    { k: 'mesozoic', n: '恐龙时代', ico: '🦕', age: '中生代 · 2.3 亿–6600 万年前', myrMin: 66,
      poem: '大地上回响着巨兽的脚步，盘古大陆正缓缓裂开第一道缝隙。',
      facts: [['地貌', '盘古大陆聚合，随后缓慢裂解，内陆广阔干旱'], ['气候', '均温比今天高约 10°C，CO₂ 是现在 4–8 倍'],
              ['大气', '高二氧化碳 · 无极地冰盖'], ['生物', '恐龙统治地球 1.6 亿年，始祖鸟飞向天空']],
      pal: { ocean: [[14, 78, 96], [18, 100, 122]], land: [[74, 124, 47], [107, 143, 58], [169, 141, 95]], atmo: 'rgba(94,234,212,' } },
    { k: 'modern', n: '现代地球', ico: '🌍', age: '全新世 · 1 万年前至今', myrMin: 0,
      poem: '越过朦胧的大气层，看见云海之下的万家灯火——这是夜晚给予我们的答案。',
      facts: [['地貌', '七大洲四大洋，人类城市灯火彻夜不熄'], ['气候', '均温 15°C，四季分明'],
              ['大气', 'N₂ 78% · O₂ 21% · CO₂ 0.04%'], ['生物', '约 870 万物种 · 82 亿人类文明']],
      pal: { ocean: [[14, 54, 128], [23, 84, 176]], land: [[46, 125, 50], [77, 143, 69], [154, 162, 91], [139, 111, 71], [232, 242, 250]], atmo: 'rgba(96,165,250,', capIce: true, clouds: true, lights: true, live: true } },
  ],

  // 时间轴关键节点（距今百万年）：拖动跨越时弹科普窗（每节点每次会话一次）
  EARTH99_NODES: [
    { t: 4600, n: '🌍 地球诞生', d: '46 亿年前，原始星云在引力中坍缩，尘埃与岩石碰撞聚成胚胎——太阳系第三颗行星就此成形。' },
    { t: 4500, n: '💥 忒伊亚大撞击', d: '一颗火星大小的行星斜向撞上地球，飞溅的碎片在轨道上凝聚——月球就此诞生，地球自转轴也被撞歪 23.4°。' },
    { t: 4000, n: '🌋 岩浆海洋冷却', d: '撞击能量耗散，炽热的岩浆海逐渐凝固出最早的玄武岩地壳，水汽开始凝结成雨。' },
    { t: 3800, n: '🧬 最早的生命', d: '深海热泉的黑烟囱旁，第一批依靠化学能生存的古菌出现——所有地球生命的共同祖先。' },
    { t: 2400, n: '💨 大氧化事件', d: '蓝细菌几十亿年的光合作用终于改变大气——氧气涌入海洋与天空，铁锈沉底，为复杂生命铺路。' },
    { t: 720, n: '❄️ 雪球地球', d: '全球冰封两千万年，赤道的海冰厚达千米。火山喷发的 CO₂ 攒了百万年终破冰封——随后就是寒武纪大爆发。' },
    { t: 541, n: '🐟 寒武纪大爆发', d: '解冻后的海洋在短短几百万年涌现出几乎所有动物门类——眼睛、脊柱与掠食，从此演化加速。' },
    { t: 250, n: '🦖 盘古大陆与恐龙', d: '大陆聚合成盘古，气候温暖湿润。主龙类崛起，恐龙开始了长达 1.6 亿年的统治。' },
    { t: 66, n: '☄️ 希克苏鲁伯撞击', d: '一颗直径 10 km 的小行星撞进尤卡坦半岛，遮天蔽日的尘幕终结了恐龙时代——小型哺乳动物迎来了黎明。' },
    { t: 2.6, n: '🔪 石器与火', d: '能人敲出第一块石核，直立人学会了保存火种。人类的黎明，在非洲草原的晨光里到来。' },
    { t: 0, n: '🏙️ 现代文明', d: '农业、城市、文字、工业、互联网——800 万年演化史最后的 1 万年，人类把灯火点亮了整颗星球的夜晚。' },
  ],

  // 天体档案（轮播 + 太阳系视图）r=相对半径 · au=轨道半径 · yr=公转地球日 · day=自转
  EARTH99_BODIES: [
    { k: 'sun', n: '太阳', ico: '☀️', c: '#fbbf24', r: 11, poem: '万物此刻的光，都由它亲手点燃。',
      dia: '139.2 万 km', day: '自转 25–35 天', yr: '绕银心 2.3 亿年',
      fact: '占太阳系总质量的 99.86%，核心每秒聚变 6 亿吨氢' },
    { k: 'mercury', n: '水星', ico: '☿️', c: '#b5a1a0', r: 3.2, au: 0.39, yr: 88, day: '58.6 天',
      dia: '4,879 km', fact: '最靠近太阳，昼夜温差 600°C，一年只有 88 天' },
    { k: 'venus', n: '金星', ico: '♀️', c: '#e8c88a', r: 5.4, au: 0.72, yr: 225, day: '243 天（逆）',
      dia: '12,104 km', fact: '逆向自转——在金星上，一天比一年还长' },
    { k: 'earth', n: '地球', ico: '🌍', c: '#5b8fd9', r: 5.7, au: 1.0, yr: 365.25, day: '23时56分',
      dia: '12,742 km', fact: '目前已知唯一有生命的星球 · 轨道速度 29.8 km/s' },
    { k: 'moon', n: '月球', ico: '🌙', c: '#cbd5e1', r: 2.6, dia: '3,474 km', day: '27.3 天（潮汐锁定）', yr: '绕地球 27.3 天',
      fact: '正以每年 3.8cm 远离地球；1969 年阿波罗 11 号首次踏足',
      poem: '越过寂静的月海与环形山，沿被冻结的星尘轨迹——月球，是距离我们最近的一个世界。' },
    { k: 'mars', n: '火星', ico: '♂️', c: '#d1683f', r: 4.2, au: 1.52, yr: 687, day: '24时37分',
      dia: '6,779 km', fact: '奥林帕斯山高 21 km，是太阳系最高的火山' },
    { k: 'jupiter', n: '木星', ico: '🟠', c: '#d9a066', r: 13, au: 5.2, yr: 4333, day: '9时56分',
      dia: '139,820 km', fact: '大红斑是一场刮了 300 多年的风暴，能装下整个地球' },
    { k: 'saturn', n: '土星', ico: '🪐', c: '#e0c084', r: 11, au: 9.5, yr: 10759, day: '10时42分', ring: true,
      dia: '116,460 km', fact: '平均密度低于水——若有足够大的海洋，它能浮起来' },
    { k: 'uranus', n: '天王星', ico: '🔵', c: '#9fd4d9', r: 7.5, au: 19.2, yr: 30687, day: '17时14分（侧躺）',
      dia: '50,724 km', fact: '自转轴倾角 98°——它是躺着绕太阳打滚的冰巨星' },
    { k: 'neptune', n: '海王星', ico: '🔷', c: '#4b6fd9', r: 7.3, au: 30.1, yr: 60190, day: '16时6分',
      dia: '49,244 km', fact: '风速达 2,100 km/h，是太阳系最狂暴的风' },
  ],

  EARTH99_GAL_FACTS: [
    ['直径', '约 10 万光年'], ['恒星数量', '1,000–4,000 亿颗'], ['我们的位置', '猎户臂 · 距银心 2.6 万光年'],
    ['银河年', '太阳绕银心一圈约 2.3 亿年'], ['中心黑洞', '人马座 A* · 约 400 万倍太阳质量'],
    ['未来', '45 亿年后与仙女座星系相撞'],
  ],
  EARTH99_GAL_POEM: '一千亿颗恒星汇成的旋涡，我们只是旋臂上一粒会思考的尘埃。',

  // ==================== 状态 ====================
  _earth99Rt: null,

  // ==================== 页面 ====================
  render_earth99() {
    const v = document.getElementById('view-earth99');
    if (!v) return;
    const d = this._earth99Data();
    this._earth99NoiseInit();
    v.innerHTML = `
      <div class="earth99-stage" id="earth99Stage">
        <canvas id="earth99Cv"></canvas>
        <div class="earth99-top">
          <button class="earth99-gbtn-s" onclick="App.navBack()" title="返回">←</button>
          <div class="earth99-tabs">
            <button class="earth99-tab${d.set.view === 'earth' ? ' on' : ''}" data-v="earth" onclick="App._earth99View('earth')">🌍 地球</button>
            <button class="earth99-tab${d.set.view === 'solar' ? ' on' : ''}" data-v="solar" onclick="App._earth99View('solar')">☀️ 太阳系</button>
            <button class="earth99-tab${d.set.view === 'galaxy' ? ' on' : ''}" data-v="galaxy" onclick="App._earth99View('galaxy')">🌌 银河系</button>
          </div>
          <button class="earth99-gbtn-s" onclick="App._earth99Settings()" title="设置">⚙️</button>
        </div>
        <div class="earth99-acts">
          <button class="earth99-act" onclick="App._earth99FavShow()" title="收藏">⭐</button>
          <button class="earth99-act" onclick="App._earth99Share()" title="分享">🔗</button>
        </div>
        <div class="earth99-eras" id="earth99Eras"></div>
        <div class="earth99-tl" id="earth99TlBox">
          <div class="earth99-tl-bar"><input type="range" id="earth99Tl" class="earth99-range" min="0" max="4600" step="5" value="${this._earth99Rt ? this._earth99Rt.myr : 0}"></div>
          <div class="earth99-tl-lab" id="earth99TlLab"></div>
        </div>
        <div class="earth99-info" id="earth99Info"></div>
        <div class="earth99-carousel" id="earth99Car"></div>
        <div class="earth99-badge" id="earth99Badge"></div>
      </div>`;
    this._earth99Rt = this._earth99Rt || {
      view: d.set.view || 'earth', era: 'modern', myr: 0,
      camLon: 105, tilt: 0.35, zoom: 1, spin: true, dragging: false,
      vx: 0, vy: 0, pinch: null, pts: null,
      eraFrom: 'modern', eraTo: 'modern', morphT: 1e9, bm: null, bmKey: '',
      hits: [], live: { iss: null, issOk: false, quakes: [], liveTried: false },
      sel: null, t0: performance.now(),
    };
    this._earth99PaintEras();
    this._earth99PaintCar();
    this._earth99Resize();
    this._earth99BindCanvas();
    [300, 1000].forEach(ms => setTimeout(() => { try { this._earth99Resize(); } catch (e) {} }, ms));   // 动画结束补测
    this._earth99WatchStage();
    this._earth99CardEra(this._earth99EraDef(this._earth99Rt.era));
    this._earth99Loop(performance.now());
    if (!this._earth99Rt.live.liveTried) { this._earth99Rt.live.liveTried = true; this._earth99Live(); }
    // 时间轴拖动：大陆漂移 + 节点科普
    const tl = document.getElementById('earth99Tl');
    if (tl) tl.addEventListener('input', () => this._earth99Timeline(+tl.value));
  },

  _earth99Data() {
    try {
      const raw = localStorage.getItem(this.EARTH99_KEY);
      if (raw) { const d = JSON.parse(raw); if (d && d.set) return d; }
    } catch (e) {}
    return { favs: [], set: { view: 'earth', cloud: 1, lights: 1, quakes: 1, spin: 1 } };
  },
  _earth99Save(d) { try { localStorage.setItem(this.EARTH99_KEY, JSON.stringify(d)); } catch (e) {} },
  _earth99Set(k, v) {
    const d = this._earth99Data();
    d.set[k] = (v === undefined) ? !d.set[k] : v;
    this._earth99Save(d);
    return d.set[k];
  },

  _earth99EraDef(k) { return this.EARTH99_ERAS.find(e => e.k === k) || this.EARTH99_ERAS[4]; },

  // 年代切换（板块漂移 morph）
  _earth99EraSet(k, silent) {
    const rt = this._earth99Rt;
    if (!rt || rt.era === k) return;
    if (!silent) { try { this._sfx99('cosmos'); } catch (e) {} }
    rt.eraFrom = rt.era; rt.eraTo = k; rt.morphT = 0; rt.era = k;
    rt.bm = null;
    this._earth99PaintEras();
    // 时间轴同步到该年代中点
    const def = this._earth99EraDef(k);
    const mid = def.myrMin + (k === 'hadean' ? 350 : k === 'archean' ? 1500 : k === 'cryo' ? 45 : k === 'mesozoic' ? 90 : 5);
    rt.myr = mid;
    const tl = document.getElementById('earth99Tl');
    if (tl) tl.value = mid;
    this._earth99TlLab();
    this._earth99CardEra(def);
  },

  _earth99Timeline(myr) {
    const rt = this._earth99Rt;
    if (!rt) return;
    rt.myr = myr;
    // 年代归属
    let def = this.EARTH99_ERAS[0];
    for (const e of this.EARTH99_ERAS) { if (myr >= e.myrMin) { def = e; break; } }
    // 显示为「距今 X」
    this._earth99TlLab(myr);
    if (def.k !== rt.era) {
      rt.eraFrom = rt.era; rt.eraTo = def.k; rt.morphT = 0; rt.era = def.k;
      rt.bm = null;
      this._earth99PaintEras();
      this._earth99CardEra(def);
      try { this._sfx99('tap'); } catch (e) {}
    }
    // 节点科普（每次会话每节点一次；v12.9.47 先清旧弹窗，快速拖动不叠加多层）
    for (const nd of this.EARTH99_NODES) {
      if (Math.abs(myr - nd.t) <= 30 && !this['__earth99Node' + nd.t]) {
        this['__earth99Node' + nd.t] = 1;
        try { this._sfx99('popup'); } catch (e) {}
        try { const ov = document.querySelector('.wild-overlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
        this._modal(nd.n, `<div class="earth99-node">${nd.d}</div>`, [{ label: '继续漫游', primary: true }]);
        break;
      }
    }
  },
  _earth99TlLab(myr) {
    const rt = this._earth99Rt;
    if (myr === undefined) myr = rt ? rt.myr : 0;
    const lab = document.getElementById('earth99TlLab');
    if (lab) lab.textContent = myr >= 1000 ? `⏳ ${Math.round(myr / 100) / 10} 亿年前` : myr > 0 ? `⏳ ${Math.round(myr)} 万年前` : '⏳ 此刻 · 现代';
  },

  _earth99View(v) {
    const rt = this._earth99Rt;
    if (!rt || rt.view === v) return;
    rt.view = v;
    this._earth99Set('view', v);
    document.querySelectorAll('.earth99-tab').forEach(t => t.classList.toggle('on', t.dataset.v === v));
    const tlBox = document.getElementById('earth99TlBox');
    const eras = document.getElementById('earth99Eras');
    if (tlBox) tlBox.style.display = v === 'earth' ? '' : 'none';
    if (eras) eras.style.display = v === 'earth' ? '' : 'none';
    try { this._sfx99('cosmos'); } catch (e) {}
    if (v === 'solar') this._earth99CardBody(this.EARTH99_BODIES.find(b => b.k === (rt.sel || 'earth')));
    else if (v === 'galaxy') this._earth99CardGal();
    else this._earth99CardEra(this._earth99EraDef(rt.era));
  },

  // ==================== 画布与交互 ====================
  _earth99Resize() {
    const cv = document.getElementById('earth99Cv');
    const st = document.getElementById('earth99Stage');
    if (!cv || !st) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = st.clientWidth || 320, h = st.clientHeight || 480;
    const rt = this._earth99Rt;
    if (rt && rt.W === w && rt.H === h && rt.cx && cv.width) return;   // 尺寸未变不重置（防重复 scale）
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    if (rt) { rt.cx = cv.getContext('2d'); rt.cx.setTransform(dpr, 0, 0, dpr, 0, 0); rt.W = w; rt.H = h; }
  },
  // v12.9.48 手机全屏修复：入场动画期间 view 带 transform，fixed 舞台会取错包含块（342×0 → 高走 480 兜底），
  // 且动画结束后不再有 resize 事件 → 画布永久卡在半屏。动画后补测两轮 + ResizeObserver 盯舞台尺寸变化。
  _earth99WatchStage() {
    try {
      if (this.__e99RO) { try { this.__e99RO.disconnect(); } catch (e) {} this.__e99RO = null; }
      const st = document.getElementById('earth99Stage');
      if (st && window.ResizeObserver) {
        this.__e99RO = new ResizeObserver(() => {
          if (App.currentView === 'earth99') { try { App._earth99Resize(); } catch (e) {} }
        });
        this.__e99RO.observe(st);
      }
    } catch (e) {}
  },

  _earth99BindCanvas() {
    const cv = document.getElementById('earth99Cv');
    if (!cv || cv.dataset.e99wired) return;
    cv.dataset.e99wired = '1';
    const rt = () => this._earth99Rt;
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', (e) => {
      const r = rt(); if (!r) return;
      cv.setPointerCapture(e.pointerId);
      r.pts = r.pts || {};
      r.pts[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0 };
      r.dragging = true; r.vx = 0; r.vy = 0;
      if (Object.keys(r.pts).length === 2) {
        const [a, b] = Object.values(r.pts);
        r.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: r.zoom };
      }
    });
    cv.addEventListener('pointermove', (e) => {
      const r = rt(); if (!r || !r.pts || !r.pts[e.pointerId]) return;
      const p = r.pts[e.pointerId];
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.moved += Math.abs(dx) + Math.abs(dy);
      p.x = e.clientX; p.y = e.clientY;
      if (r.pinch && Object.keys(r.pts).length === 2) {
        const [a, b] = Object.values(r.pts);
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 10) r.zoom = Math.min(3.2, Math.max(0.65, r.pinch.z * d / r.pinch.d));
        return;
      }
      r.camLon -= dx * 0.32 / r.zoom;
      r.tilt = Math.max(-1.25, Math.min(1.25, r.tilt + dy * 0.006));
      r.vx = -dx * 0.32 / r.zoom; r.vy = dy * 0.006;
    });
    const up = (e) => {
      const r = rt(); if (!r || !r.pts || !r.pts[e.pointerId]) return;
      const p = r.pts[e.pointerId];
      delete r.pts[e.pointerId];
      if (!Object.keys(r.pts).length) { r.pinch = null; r.dragging = false; }
      if (p && p.moved < 9 && performance.now() - p.t < 600) this._earth99Pick(e);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    // 滚轮缩放（桌面）
    cv.addEventListener('wheel', (e) => {
      const r = rt(); if (!r) return;
      e.preventDefault();
      r.zoom = Math.min(3.2, Math.max(0.65, r.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
    }, { passive: false });
    if (!this.__e99resize) {
      this.__e99resize = 1;
      window.addEventListener('resize', () => {
        if (App.currentView === 'earth99') { try { App._earth99Resize(); } catch (e) {} }
      });
    }
  },

  // 点击拾取：地球视图 → 经纬度地点卡；太阳系/银河系 → 天体命中
  _earth99Pick(e) {
    const rt = this._earth99Rt;
    const cv = document.getElementById('earth99Cv');
    if (!rt || !cv) return;
    const rect = cv.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    try { this._sfx99('tap'); } catch (e2) {}
    if (rt.view !== 'earth') {
      let best = null, bd = 1e9;
      for (const h of rt.hits) {
        const d = Math.hypot(h.x - x, h.y - y);
        if (d < h.r + 10 && d < bd) { bd = d; best = h; }
      }
      if (best) { best.go(); return; }
      if (rt.view === 'galaxy') this._earth99CardGal();
      else this._earth99CardBody(this.EARTH99_BODIES.find(b => b.k === (rt.sel || 'earth')));
      return;
    }
    // 球面反投影
    const R = Math.min(rt.W, rt.H) * 0.34 * rt.zoom;
    const cx0 = rt.W / 2, cy0 = rt.H * 0.46;
    const dx = (x - cx0) / R, dy = -(y - cy0) / R;
    const rr = dx * dx + dy * dy;
    // 月球命中
    if (rt.moonHit && Math.hypot(rt.moonHit.x - x, rt.moonHit.y - y) < 18) { this._earth99CardBody(this.EARTH99_BODIES.find(b => b.k === 'moon')); return; }
    if (rr > 1) { this._earth99CardEra(this._earth99EraDef(rt.era)); return; }   // 点到太空 → 回年代卡
    const z = Math.sqrt(1 - rr);
    const T = rt.tilt;
    const y0 = dy * Math.cos(T) + z * Math.sin(T);
    const z0 = -dy * Math.sin(T) + z * Math.cos(T);
    const lat = Math.asin(Math.max(-1, Math.min(1, y0))) * 180 / Math.PI;
    const lon = rt.camLon + Math.atan2(dx, z0) * 180 / Math.PI;
    this._earth99CardLoc(lat, lon);
  },

  // ==================== 噪声与地形 ====================
  _earth99NoiseInit() {
    if (this.__e99noise) return;
    this.__e99noise = 1;
    const rnd = (seed) => { let s = seed; return () => { s = (s * 16807 + 49297) % 233280; return s / 233280; }; };
    // 高程噪声 64×32
    const r1 = rnd(20260910);
    this.__e99elev = Array.from({ length: 65 }, () => Array.from({ length: 65 }, () => r1()));
    // 云噪声 96×48
    const r2 = rnd(777);
    this.__e99cloud = Array.from({ length: 49 }, () => Array.from({ length: 97 }, () => r2()));
    // 板块海岸扰动（每板块 12 向）
    const r3 = rnd(4242);
    this.__e99coast = {};
    for (let i = 0; i < 12; i++) this.__e99coast[i] = Array.from({ length: 12 }, () => 0.84 + 0.32 * r3());
  },
  _earth99Smooth(g, u, v) {   // 双线性
    const i = Math.max(0, Math.min(g.length - 2, Math.floor(u)));
    const j = Math.max(0, Math.min(g[0].length - 2, Math.floor(v)));
    const fu = u - i, fv = v - j;
    const a = g[i][j], b = g[i + 1][j], c = g[i][j + 1], d = g[i + 1][j + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  },
  _earth99Elev(lat, lon) {
    const u = (lat + 90) / 180 * 63, v = ((lon + 180) / 360) * 63;
    const a = this._earth99Smooth(this.__e99elev, u, v);
    const b = this._earth99Smooth(this.__e99elev, u * 2.7 % 63, v * 2.7 % 63);
    return a * 0.68 + b * 0.32;
  },
  _earth99CloudV(lat, lon, t) {
    const v = ((lon + 180 + t * 4) % 360 + 360) % 360 / 360 * 95;
    const u = (lat + 90) / 180 * 47;
    const a = this._earth99Smooth(this.__e99cloud, u, v);
    const b = this._earth99Smooth(this.__e99cloud, (u * 2.2) % 47, (v * 2.2) % 95);
    return a * 0.7 + b * 0.3;
  },
  // 当前 morph 板块位置（含插值）
  _earth99Pos() {
    const rt = this._earth99Rt;
    const from = this.EARTH99_ERAPOS[rt.eraFrom] || {}, to = this.EARTH99_ERAPOS[rt.eraTo] || {};
    const mt = Math.min(1, rt.morphT / 1400);                       // 1.4s morph
    const e = mt < 0.5 ? 2 * mt * mt : 1 - Math.pow(-2 * mt + 2, 2) / 2;
    const scaleF = { hadean: 0, archean: 0.5, cryo: 1, mesozoic: 1, modern: 1 };
    const s0 = scaleF[rt.eraFrom] !== undefined ? scaleF[rt.eraFrom] : 1;
    const s1 = scaleF[rt.eraTo] !== undefined ? scaleF[rt.eraTo] : 1;
    const sc = s0 + (s1 - s0) * e;
    const out = {};
    for (const k of Object.keys(this.EARTH99_PLATES)) {
      const a = from[k], b = to[k];
      if (!a && !b) { out[k] = null; continue; }
      if (!a) { out[k] = { lon: b[0], lat: b[1], s: e * sc }; continue; }
      if (!b) { out[k] = { lon: a[0], lat: a[1], s: (1 - e) * sc }; continue; }
      out[k] = { lon: a[0] + (b[0] - a[0]) * e, lat: a[1] + (b[1] - a[1]) * e, s: sc };
    }
    return out;
  },
  // 点是否陆地 → 板块 key（用实时位置，供渲染与点选共用）
  _earth99LandAt(lon, lat, pos) {
    for (const k of Object.keys(this.EARTH99_PLATES)) {
      const P = pos[k];
      if (!P || !P.s) continue;
      const def = this.EARTH99_PLATES[k];
      for (let bi = 0; bi < def.blobs.length; bi++) {
        const b = def.blobs[bi];
        const bx = P.lon + b[0] * P.s, by = P.lat + b[1] * P.s;
        let dLon = lon - bx;
        while (dLon > 180) dLon -= 360; while (dLon < -180) dLon += 360;
        const dLat = lat - by;
        const rx = b[2] * P.s, ry = b[3] * P.s;
        if (rx <= 0.5 || ry <= 0.5) continue;
        if (Math.abs(dLon) > rx * 1.35 || Math.abs(dLat) > ry * 1.35) continue;
        const ang = Math.atan2(dLat, dLon) + Math.PI;                // 0..2π
        const ci = (this.__e99coast[bi] || [])[Math.floor(ang / (Math.PI / 6)) % 12] || 1;
        const q = (dLon / rx) * (dLon / rx) + (dLat / ry) * (dLat / ry);
        if (q < ci * ci) return k;
      }
    }
    return null;
  },

  // ==================== 渲染循环 ====================
  _earth99Loop(ts) {
    const rt = this._earth99Rt;
    const cv = document.getElementById('earth99Cv');
    if (!rt || !cv || !cv.isConnected || this.currentView !== 'earth99') { this.__e99raf = 0; return; }
    const dt = Math.min(50, ts - (rt.lastTs || ts)); rt.lastTs = ts;
    rt.morphT += dt;
    // 惯性 + 自转
    if (!rt.dragging) {
      rt.camLon += rt.vx; rt.tilt = Math.max(-1.25, Math.min(1.25, rt.tilt + rt.vy));
      rt.vx *= 0.94; rt.vy *= 0.92;
      if (Math.abs(rt.vx) < 0.005) rt.vx = 0;
      const d = this._earth99Data();
      if (d.set.spin) rt.camLon += dt * 0.0038;                     // ~3.8°/s 自转
    }
    rt.camLon = ((rt.camLon + 180) % 360 + 360) % 360 - 180;
    try { this._earth99Draw(ts, dt); } catch (e) {}
    this.__e99raf = requestAnimationFrame((t) => this._earth99Loop(t));
  },

  _earth99Draw(ts, dt) {
    const rt = this._earth99Rt;
    const c = rt.cx, W = rt.W, H = rt.H;
    // 深空底 + 星尘
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#030712'); bg.addColorStop(0.6, '#020617'); bg.addColorStop(1, '#01030a');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    if (!this.__e99stars) {
      const r = (s => () => { s = (s * 16807 + 49297) % 233280; return s / 233280; })(99);
      this.__e99stars = Array.from({ length: 150 }, () => ({ x: r(), y: r(), b: 0.3 + r() * 0.7, p: r() * 6.28 }));
    }
    const tt = ts / 1000;
    for (let i = 0; i < this.__e99stars.length; i++) {
      const s = this.__e99stars[i];
      const a = s.b * (0.55 + 0.45 * Math.sin(tt * 1.3 + s.p));
      c.fillStyle = `rgba(226,232,240,${a.toFixed(3)})`;
      c.fillRect((s.x * W) | 0, (s.y * H) | 0, i % 17 === 0 ? 2 : 1, i % 17 === 0 ? 2 : 1);
    }
    rt.hits = [];
    if (rt.view === 'earth') this._earth99DrawEarth(c, W, H, tt, dt);
    else if (rt.view === 'solar') this._earth99DrawSolar(c, W, H, tt, dt);
    else this._earth99DrawGalaxy(c, W, H, tt);
  },

  _earth99DrawEarth(c, W, H, tt, dt) {
    const rt = this._earth99Rt;
    const d = this._earth99Data();
    const def = this._earth99EraDef(rt.era);
    const pal = def.pal;
    const R = Math.min(W, H) * 0.34 * rt.zoom;
    const cx0 = W / 2, cy0 = H * 0.46;
    const T = rt.tilt;
    // —— 太阳方向（真实晨昏线：当日赤纬 + 时角）——
    const now = new Date();
    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    const dec = -23.44 * Math.cos(2 * Math.PI * (doy + 10) / 365.25) * Math.PI / 180;
    const sunLon0 = -(now.getUTCHours() + now.getUTCMinutes() / 60 - 12) * 15;
    const sunLonC = (sunLon0 - rt.camLon) * Math.PI / 180;
    const L = [Math.cos(dec) * Math.sin(sunLonC), Math.sin(dec), Math.cos(dec) * Math.cos(sunLonC)];
    const LT = [L[0], L[1] * Math.cos(T) - L[2] * Math.sin(T), L[1] * Math.sin(T) + L[2] * Math.cos(T)];
    // —— 大气辉光 ——
    const glow = c.createRadialGradient(cx0, cy0, R * 0.96, cx0, cy0, R * 1.22);
    glow.addColorStop(0, pal.atmo + '0)');
    glow.addColorStop(0.42, pal.atmo + '0.32)');
    glow.addColorStop(1, pal.atmo + '0)');
    c.fillStyle = glow;
    c.fillRect(cx0 - R * 1.3, cy0 - R * 1.3, R * 2.6, R * 2.6);
    // —— 月球（后半程画在地球后面）——
    const mA = tt * 0.72;
    const mx = cx0 + Math.cos(mA) * R * 2.05, my = cy0 - Math.sin(mA) * R * 0.62;
    const mBehind = Math.sin(mA) > 0.5;
    const drawMoon = () => {
      const mr = Math.max(7, R * 0.12);
      c.fillStyle = '#94a3b8';
      c.beginPath(); c.arc(mx, my, mr, 0, 6.28); c.fill();
      c.fillStyle = '#64748b';
      c.fillRect(mx - mr * 0.35, my - mr * 0.2, mr * 0.32, mr * 0.32);
      c.fillRect(mx + mr * 0.1, my + mr * 0.25, mr * 0.26, mr * 0.26);
      rt.moonHit = { x: mx, y: my };
    };
    if (mBehind) drawMoon();
    rt.moonHit = null;
    // —— 海洋圆盘 ——
    const og = c.createRadialGradient(cx0 - R * 0.3, cy0 - R * 0.3, R * 0.1, cx0, cy0, R);
    og.addColorStop(0, `rgb(${pal.ocean[1]})`);
    og.addColorStop(0.7, `rgb(${pal.ocean[0]})`);
    og.addColorStop(1, `rgb(${(pal.ocean[0][0] * 0.5) | 0},${(pal.ocean[0][1] * 0.5) | 0},${(pal.ocean[0][2] * 0.6) | 0})`);
    c.fillStyle = og;
    c.beginPath(); c.arc(cx0, cy0, R, 0, 6.28); c.fill();
    // —— 像素格子（3°）——
    const pos = this._earth99Pos();
    const step = W < 380 ? 4 : 3;
    const hStep = step / 2;
    const shadeCache = {};
    const shade = (rgb, b) => {
      const q = Math.round(b * 12) / 12;
      const key = rgb.join(',') + '|' + q;
      if (!shadeCache[key]) shadeCache[key] = `rgb(${Math.min(255, rgb[0] * q) | 0},${Math.min(255, rgb[1] * q) | 0},${Math.min(255, rgb[2] * q) | 0})`;
      return shadeCache[key];
    };
    const cloudOn = pal.clouds && d.set.cloud;
    for (let lat = -90 + hStep; lat < 90; lat += step) {
      const cosLat = Math.cos(lat * Math.PI / 180);
      if (cosLat <= 0.02) continue;
      for (let lon = -180 + hStep; lon < 180; lon += step) {
        const lonC = (lon - rt.camLon) * Math.PI / 180;
        const x0 = cosLat * Math.sin(lonC), y0 = Math.sin(lat * Math.PI / 180), z0 = cosLat * Math.cos(lonC);
        const y1 = y0 * Math.cos(T) - z0 * Math.sin(T), z1 = y0 * Math.sin(T) + z0 * Math.cos(T);
        if (z1 < 0.045) continue;
        const ndl = Math.max(0, x0 * LT[0] + y1 * LT[1] + z1 * LT[2]);
        let col;
        const land = this._earth99LandAt(lon, lat, pos);
        const elev = this._earth99Elev(lat, lon);
        if (land) {
          if (pal.lava) {
            col = elev > 0.78 ? pal.land[2] : elev > 0.6 ? pal.land[1] : pal.land[0];
          } else if (def.pal.snow || (pal.capIce && Math.abs(lat) > 74)) {
            col = elev > 0.55 ? pal.land[pal.land.length - 1] : pal.land[(elev * pal.land.length) | 0] || pal.land[0];
          } else if (pal.capIce && Math.abs(lat) > 72) {
            col = pal.land[pal.land.length - 1];
          } else {
            const idx = Math.min(pal.land.length - 1, (elev * pal.land.length) | 0);
            col = pal.land[idx];
          }
        } else {
          col = elev > 0.62 ? pal.ocean[1] : pal.ocean[0];
          if (pal.capIce && Math.abs(lat) > 76) col = [226, 240, 250];
        }
        const b = (0.22 + 0.78 * ndl) * (0.5 + 0.5 * Math.sqrt(z1));
        // 投影四角
        const p2 = (la, lo) => {
          const cl = Math.cos(la * Math.PI / 180), lc = (lo - rt.camLon) * Math.PI / 180;
          const xx = cl * Math.sin(lc), yy = Math.sin(la * Math.PI / 180), zz = cl * Math.cos(lc);
          const y2 = yy * Math.cos(T) - zz * Math.sin(T);
          return [cx0 + xx * R, cy0 - y2 * R];
        };
        const q1 = p2(lat - hStep, lon - hStep), q2 = p2(lat - hStep, lon + hStep);
        const q3 = p2(lat + hStep, lon + hStep), q4 = p2(lat + hStep, lon - hStep);
        c.fillStyle = shade(col, b);
        c.beginPath();
        c.moveTo(q1[0], q1[1]); c.lineTo(q2[0], q2[1]); c.lineTo(q3[0], q3[1]); c.lineTo(q4[0], q4[1]);
        c.closePath(); c.fill();
        // 熔岩地壳裂缝发光
        if (pal.lava && elev > 0.8 && z1 > 0.3) {
          c.fillStyle = `rgba(255,214,102,${(0.35 * z1).toFixed(2)})`;
          c.fillRect((q1[0] + q3[0]) / 2 - 1, (q1[1] + q3[1]) / 2 - 1, 2, 2);
        }
      }
    }
    // —— 云层（现代/太古）——
    if (cloudOn && !pal.haze) {
      c.fillStyle = 'rgba(248,250,252,0.42)';
      for (let lat = -88; lat < 88; lat += step) {
        const cosLat = Math.cos(lat * Math.PI / 180);
        if (cosLat <= 0.02) continue;
        for (let lon = -178; lon < 180; lon += step) {
          if (this._earth99CloudV(lat, lon, tt) < 0.6) continue;
          const lonC = (lon - rt.camLon) * Math.PI / 180;
          const x0 = cosLat * Math.sin(lonC), y0 = Math.sin(lat * Math.PI / 180), z0 = cosLat * Math.cos(lonC);
          const y1 = y0 * Math.cos(T) - z0 * Math.sin(T), z1 = y0 * Math.sin(T) + z0 * Math.cos(T);
          if (z1 < 0.06) continue;
          c.fillRect(cx0 + x0 * R * 1.02 - 2.5, cy0 - y1 * R * 1.02 - 2.5, 5, 5);
        }
      }
    }
    if (pal.haze) {   // 太古橙色雾霾
      c.fillStyle = 'rgba(251,146,60,0.13)';
      c.beginPath(); c.arc(cx0, cy0, R * 0.99, 0, 6.28); c.fill();
    }
    // —— 城市夜灯（现代 · 夜半球）——
    if (pal.lights && d.set.lights) {
      const proj = (lat, lon) => {
        const lonC = (lon - rt.camLon) * Math.PI / 180;
        const x0 = Math.cos(lat * Math.PI / 180) * Math.sin(lonC), y0 = Math.sin(lat * Math.PI / 180), z0 = Math.cos(lat * Math.PI / 180) * Math.cos(lonC);
        const y1 = y0 * Math.cos(T) - z0 * Math.sin(T), z1 = y0 * Math.sin(T) + z0 * Math.cos(T);
        return { x: cx0 + x0 * R, y: cy0 - y1 * R, z: z1, n: x0 * LT[0] + y1 * LT[1] + z1 * LT[2] };
      };
      for (const ct of this.EARTH99_CITIES) {
        const p = proj(ct[0], ct[1]);
        if (p.z < 0.06 || p.n > 0.02) continue;
        const a = (0.9 - p.n * 8) * Math.min(1, ct[3] / 14);
        if (a <= 0.08) continue;
        const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 4.2);
        g.addColorStop(0, `rgba(253,224,71,${a.toFixed(2)})`);
        g.addColorStop(1, 'rgba(253,224,71,0)');
        c.fillStyle = g;
        c.fillRect(p.x - 4.5, p.y - 4.5, 9, 9);
      }
      // 地震脉冲（USGS 24h）
      if (d.set.quakes && rt.live.quakes.length) {
        for (const q of rt.live.quakes) {
          const p = proj(q.lat, q.lon);
          if (p.z < 0.06) continue;
          const ph = ((tt - q.t) % 2.4 + 2.4) % 2.4;
          const rr = 2 + ph * 7;
          c.strokeStyle = `rgba(248,113,113,${(0.75 * (1 - ph / 2.4)).toFixed(2)})`;
          c.lineWidth = 1.5;
          c.beginPath(); c.arc(p.x, p.y, rr, 0, 6.28); c.stroke();
          c.fillStyle = 'rgba(239,68,68,.95)';
          c.fillRect(p.x - 1, p.y - 1, 2, 2);
        }
      }
      // ISS 实时卫星
      if (rt.live.iss) {
        const p = proj(rt.live.iss[0], rt.live.iss[1]);
        if (p.z > 0.05) {
          c.fillStyle = '#e2e8f0';
          c.fillRect(p.x - 2, p.y - 2, 4, 4);
          c.strokeStyle = 'rgba(125,211,252,.85)'; c.lineWidth = 1;
          c.strokeRect(p.x - 4.5, p.y - 4.5, 9, 9);
          c.fillStyle = 'rgba(186,230,253,.95)';
          c.font = '9px ui-monospace,monospace';
          c.fillText('ISS', p.x + 7, p.y + 3);
          rt.hits.push({ x: p.x, y: p.y, r: 12, go: () => { this._flash('🛰️ 国际空间站此刻正在你头顶约 400 km 的轨道上，以 7.66 km/s 飞行' + (rt.live.issOk ? '' : '（离线模拟轨道）')); } });
        }
      }
    }
    if (!mBehind) drawMoon();
    // —— 轨道环 + 卫星点缀（现代地球 · ORBIT 式）——
    if (rt.era === 'modern') {
      c.strokeStyle = 'rgba(125,211,252,.16)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(cx0, cy0, R * 1.45, R * 0.5, -0.12, 0, 6.28); c.stroke();
      c.beginPath(); c.ellipse(cx0, cy0, R * 1.72, R * 0.62, 0.1, 0, 6.28); c.stroke();
      for (let i = 0; i < 3; i++) {
        const a = tt * (0.5 + i * 0.23) + i * 2.1;
        const ex = R * (1.45 + i * 0.135), ey = R * (0.5 + i * 0.06), rot = [-0.12, 0, 0.1][i];
        const px = cx0 + Math.cos(a) * ex * Math.cos(rot) - Math.sin(a) * ey * Math.sin(rot);
        const py = cy0 + Math.cos(a) * ex * Math.sin(rot) + Math.sin(a) * ey * Math.cos(rot);
        c.fillStyle = 'rgba(186,230,253,.9)';
        c.fillRect(px - 1.5, py - 1.5, 3, 3);
      }
    }
  },

  _earth99DrawSolar(c, W, H, tt) {
    const rt = this._earth99Rt;
    const cx0 = W / 2, cy0 = H * 0.5;
    const maxR = Math.min(W, H) * 0.44;
    // 太阳
    const sg = c.createRadialGradient(cx0, cy0, 2, cx0, cy0, 44);
    sg.addColorStop(0, '#fff7ed'); sg.addColorStop(0.35, '#fbbf24'); sg.addColorStop(0.8, 'rgba(251,146,60,.55)'); sg.addColorStop(1, 'rgba(251,146,60,0)');
    c.fillStyle = sg;
    c.beginPath(); c.arc(cx0, cy0, 44, 0, 6.28); c.fill();
    for (let i = 0; i < 8; i++) {  // 日冕像素闪
      const a = tt * 0.7 + i * 0.785;
      const rr = 30 + Math.sin(tt * 2 + i) * 5;
      c.fillStyle = 'rgba(254,215,170,.8)';
      c.fillRect(cx0 + Math.cos(a) * rr - 1, cy0 + Math.sin(a) * rr - 1, 2, 2);
    }
    rt.hits.push({ x: cx0, y: cy0, r: 30, go: () => this._earth99CardBody(this.EARTH99_BODIES[0]) });
    // 行星
    const bodies = this.EARTH99_BODIES.filter(b => b.au);
    const rOf = (au) => 34 + maxR * Math.pow(au / 30.1, 0.46) * 0.92;
    for (const b of bodies) {
      const r = rOf(b.au);
      const speed = 0.32 / Math.pow(b.au, 0.9);
      const ang = speed * tt * 1.6 + (b.k === 'earth' ? 2.1 : 0.7);
      const ox = Math.cos(ang) * r, oy = Math.sin(ang) * r * 0.42;
      c.strokeStyle = 'rgba(148,180,205,.14)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(cx0, cy0, r, r * 0.42, 0, 0, 6.28); c.stroke();
      const px = cx0 + ox, py = cy0 - oy;
      const pr = Math.max(3, Math.min(15, b.r));
      c.fillStyle = b.c;
      c.beginPath(); c.arc(px, py, pr, 0, 6.28); c.fill();
      if (b.ring) { c.strokeStyle = 'rgba(224,192,132,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(px, py, pr * 1.9, pr * 0.55, -0.3, 0, 6.28); c.stroke(); }
      if (rt.sel === b.k) {
        c.strokeStyle = 'rgba(125,211,252,.95)'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(px, py, pr + 5, 0, 6.28); c.stroke();
      }
      c.fillStyle = 'rgba(148,163,184,.95)';
      c.font = '9px ui-monospace,monospace';
      c.fillText(b.n, px - 8, py - pr - 6);
      rt.hits.push({ x: px, y: py, r: pr + 8, go: () => { rt.sel = b.k; this._earth99CardBody(b); this._earth99PaintCar(); } });
    }
    // 小行星带（火星与木星之间）
    for (let i = 0; i < 46; i++) {
      const seed = i * 37.7;
      const r = rOf(2.2 + (i % 7) * 0.32) + Math.sin(seed) * 4;
      const a = tt * 0.18 + i * 0.41;
      c.fillStyle = 'rgba(161,155,148,.6)';
      c.fillRect(cx0 + Math.cos(a) * r - 1, cy0 - Math.sin(a) * r * 0.42 - 1, 1.6, 1.6);
    }
    c.fillStyle = 'rgba(148,163,184,.75)';
    c.font = '10px ui-monospace,monospace';
    c.fillText('☀️ 拖动旋转 · 双指缩放 · 点击行星查看档案', 12, H - 14);
  },

  _earth99DrawGalaxy(c, W, H, tt) {
    const rt = this._earth99Rt;
    const cx0 = W / 2, cy0 = H * 0.52;
    const maxR = Math.min(W, H) * 0.44;
    if (!this.__e99gal) {
      const r = (s => () => { s = (s * 16807 + 49297) % 233280; return s / 233280; })(31415);
      const pts = [];
      for (let i = 0; i < 1300; i++) {
        const th = i * 0.055;
        const arm = i % 2;
        const rr = 8 + th * 15 + (r() - 0.5) * 9;
        const a = th + arm * Math.PI + (r() - 0.5) * 0.35;
        pts.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: (r() - 0.5) * 4.5 * (1 - rr / 90), k: r() });
      }
      for (let i = 0; i < 220; i++) {  // 核球
        const a = r() * 6.28, rr = Math.pow(r(), 0.6) * 26;
        pts.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: (r() - 0.5) * 7, k: r() });
      }
      this.__e99gal = pts;
    }
    const rot = tt * 0.05;
    const tilt = 1.02;
    const sc = maxR / 95;
    for (const p of this.__e99gal) {
      const x1 = p.x * Math.cos(rot) - p.z * Math.sin(rot);
      const z1 = p.x * Math.sin(rot) + p.z * Math.cos(rot);
      const y2 = p.y * Math.cos(tilt) - z1 * Math.sin(tilt);
      const sx = cx0 + x1 * sc, sy = cy0 - y2 * sc;
      const dep = (p.y * Math.sin(tilt) + z1 * Math.cos(tilt)) / 100;
      const b = 0.45 + 0.55 * Math.max(0, 1 - Math.abs(dep));
      let col;
      const rr = Math.hypot(p.x, p.z);
      if (rr < 26) col = `rgba(255,214,166,${(b * 0.85).toFixed(2)})`;
      else if (p.k < 0.06) col = `rgba(244,114,182,${(b * 0.8).toFixed(2)})`;      // HII 区粉
      else if (p.k < 0.5) col = `rgba(191,219,254,${(b * 0.75).toFixed(2)})`;
      else col = `rgba(226,232,240,${(b * 0.7).toFixed(2)})`;
      c.fillStyle = col;
      const sz = rr < 26 ? 2 : 1.6;
      c.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
    }
    // 你在这里（太阳 · 猎户臂）
    const sunA = 2.36, sunR = 40;
    const sxx = cx0 + Math.cos(sunA + rot) * sunR * sc, syy = cy0 - (Math.sin(sunA + rot) * sunR * Math.cos(tilt)) * sc;
    const pulse = 4 + Math.sin(tt * 2.4) * 2.2;
    c.strokeStyle = 'rgba(253,224,71,.9)'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(sxx, syy, pulse + 3, 0, 6.28); c.stroke();
    c.fillStyle = '#fde047';
    c.fillRect(sxx - 1.5, syy - 1.5, 3, 3);
    c.fillStyle = 'rgba(253,224,71,.95)';
    c.font = '9.5px ui-monospace,monospace';
    c.fillText('☉ 你在这里 · 猎户臂', sxx + 9, syy + 3);
    rt.hits.push({ x: sxx, y: syy, r: 18, go: () => this._flash('☀️ 太阳系位于猎户臂，距银河系中心约 2.6 万光年，绕银心一圈需 2.3 亿年') });
    // 仙女座
    const agx = W * 0.82, agy = H * 0.16;
    const ag = c.createRadialGradient(agx, agy, 0, agx, agy, 16);
    ag.addColorStop(0, 'rgba(186,230,253,.5)'); ag.addColorStop(1, 'rgba(186,230,253,0)');
    c.fillStyle = ag;
    c.beginPath(); c.ellipse(agx, agy, 16, 6, 0.5, 0, 6.28); c.fill();
    c.fillStyle = 'rgba(148,163,184,.8)';
    c.font = '9px ui-monospace,monospace';
    c.fillText('仙女座星系 · 254 万光年', agx - 46, agy - 12);
  },

  // ==================== 面板渲染 ====================
  _earth99PaintEras() {
    const box = document.getElementById('earth99Eras');
    const rt = this._earth99Rt;
    if (!box || !rt) return;
    box.innerHTML = this.EARTH99_ERAS.slice().reverse().map(e =>
      `<button class="earth99-era${rt.era === e.k ? ' on' : ''}" onclick="App._earth99EraSet('${e.k}')" title="${e.n}">${e.ico}<span>${e.n}</span></button>`).join('');
  },
  _earth99PaintCar() {
    const box = document.getElementById('earth99Car');
    const rt = this._earth99Rt;
    if (!box || !rt) return;
    box.innerHTML = this.EARTH99_BODIES.map(b =>
      `<button class="earth99-car${(rt.view === 'solar' && rt.sel === b.k) || (rt.view === 'earth' && b.k === 'earth') ? ' on' : ''}" onclick="App._earth99Body('${b.k}')" title="${b.n}"><i style="background:${b.c}${b.ring ? ';box-shadow:0 0 0 2.5px rgba(224,192,132,.55)' : ''}"></i><span>${b.n}</span></button>`).join('');
  },
  _earth99Body(k) {
    const rt = this._earth99Rt;
    const b = this.EARTH99_BODIES.find(x => x.k === k);
    if (!b) return;
    rt.sel = k;
    if (k === 'earth') { this._earth99View('earth'); }
    else if (k !== 'moon' && rt.view === 'earth') { this._earth99View('solar'); }
    this._earth99CardBody(b);
    this._earth99PaintCar();
  },
  _earth99Info(html) {
    const el = document.getElementById('earth99Info');
    if (el) el.innerHTML = html;
  },
  _earth99CardEra(e) {
    if (!e) return;
    const rows = e.facts.map(f => `<div class="earth99-irow"><b>${f[0]}</b><span>${f[1]}</span></div>`).join('');
    let live = '';
    if (e.pal.live) {
      const rt = this._earth99Rt;
      live = `<div class="earth99-ilive">
        <div class="earth99-ilive-t">📡 实时观测数据</div>
        <div class="earth99-irow"><b>平均温度</b><span>15°C（2024 为 +1.55°C 最热年）</span></div>
        <div class="earth99-irow"><b>人口</b><span>≈ 82 亿 · 城市灯火 ${this.EARTH99_CITIES.length} 城已点亮</span></div>
        <div class="earth99-irow"><b>ISS</b><span>${rt && rt.live.issOk ? '在线追踪中 ✅' : rt && rt.live.iss ? '模拟轨道（离线降级）' : '正在获取…'}</span></div>
        <div class="earth99-irow"><b>地震</b><span>${rt && rt.live.quakes.length ? `近 24h ${rt.live.quakes.length} 次 4.0+ 脉冲标注中` : 'USGS 数据获取中'}</span></div>
      </div>`;
    }
    this._earth99Info(`
      <div class="earth99-ic-top"><span class="earth99-ic-era">${e.ico} ${e.n}</span><span class="earth99-ic-age">${e.age}</span></div>
      <div class="earth99-ic-poem">${e.poem}</div>
      ${rows}${live}
      <div class="earth99-ic-tip">👆 点击星球任意位置查看该地档案</div>`);
  },
  _earth99CardLoc(lat, lon) {
    const rt = this._earth99Rt;
    const pos = this._earth99Pos();
    const plate = this._earth99LandAt(lon, lat, pos);
    const elev = this._earth99Elev(lat, lon);
    // 海洋判定
    let region = plate ? this.EARTH99_PLATES[plate].n : null;
    if (!region) {
      if (lat < -60) region = '南大洋';
      else if (lat > 66) region = '北冰洋';
      else if (lon >= -70 && lon < 20) region = '大西洋';
      else if (lon >= 20 && lon < 147) region = '印度洋';
      else region = '太平洋';
    }
    const aLat = Math.abs(lat).toFixed(1) + '°' + (lat >= 0 ? 'N' : 'S');
    const aLon = Math.abs(lon).toFixed(1) + '°' + (lon >= 0 ? 'E' : 'W');
    // 最近城市
    let best = null, bd = 1e9;
    for (const ct of this.EARTH99_CITIES) {
      const dx = (ct[1] - lon) * Math.cos(lat * Math.PI / 180) * 111, dy = (ct[0] - lat) * 111;
      const dd = Math.hypot(dx, dy);
      if (dd < bd) { bd = dd; best = ct; }
    }
    const near = best ? `${best[2]}（约 ${bd < 1 ? '<1' : Math.round(bd)} km · ${best[3]} 万人）` : '—';
    // 当地太阳时
    const utcH = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
    let lt = (utcH + lon / 15 + 24) % 24;
    const ltStr = `${String(Math.floor(lt)).padStart(2, '0')}:${String(Math.round((lt % 1) * 60) % 60).padStart(2, '0')}`;
    const terrain = plate ? (elev > 0.75 ? '山地 · 高原' : elev > 0.5 ? '丘陵' : '平原 · 盆地') : (elev > 0.62 ? '深海海盆' : '大陆架 · 深海平原');
    const aL = Math.abs(lat);
    const climate = aL < 15 ? '热带' : aL < 35 ? '亚热带' : aL < 55 ? '温带' : aL < 66 ? '亚寒带' : '极地冰原';
    this._earth99Info(`
      <div class="earth99-ic-top"><span class="earth99-ic-era">📍 观测点</span><span class="earth99-ic-age">${aLat}, ${aLon}</span></div>
      <div class="earth99-irow"><b>区域</b><span>${region}</span></div>
      <div class="earth99-irow"><b>地形</b><span>${terrain}</span></div>
      <div class="earth99-irow"><b>气候带</b><span>${climate}</span></div>
      <div class="earth99-irow"><b>最近城市</b><span>${near}</span></div>
      <div class="earth99-irow"><b>当地太阳时</b><span>≈ ${ltStr}</span></div>
      <div class="earth99-irow"><b>年代</b><span>${this._earth99EraDef(rt.era).n}</span></div>
      <div class="earth99-ic-btns">
        <button class="earth99-mini" onclick="App._earth99FavAdd(${lat.toFixed(3)},${lon.toFixed(3)},'${this.esc(region)}')">⭐ 收藏此地</button>
        <button class="earth99-mini" onclick="App._earth99CardEra(App._earth99EraDef(App._earth99Rt.era))">🌍 年代档案</button>
      </div>`);
  },
  _earth99CardBody(b) {
    if (!b) { b = this.EARTH99_BODIES[3]; }
    const rows = [
      b.dia ? ['直径', b.dia] : null,
      b.day ? ['自转', b.day] : null,
      b.yr ? ['公转', b.yr] : null,
      ['档案', b.fact],
    ].filter(Boolean).map(f => `<div class="earth99-irow"><b>${f[0]}</b><span>${f[1]}</span></div>`).join('');
    this._earth99Info(`
      <div class="earth99-ic-top"><span class="earth99-ic-era">${b.ico} ${b.n}</span><span class="earth99-ic-age">${b.au ? b.au + ' AU' : ''}</span></div>
      ${b.poem ? `<div class="earth99-ic-poem">${b.poem}</div>` : ''}
      ${rows}
      <div class="earth99-ic-tip">👆 点击画面中的天体查看详情</div>`);
  },
  _earth99CardGal() {
    const rows = this.EARTH99_GAL_FACTS.map(f => `<div class="earth99-irow"><b>${f[0]}</b><span>${f[1]}</span></div>`).join('');
    this._earth99Info(`
      <div class="earth99-ic-top"><span class="earth99-ic-era">🌌 银河系</span><span class="earth99-ic-age">SBc 型棒旋星系</span></div>
      <div class="earth99-ic-poem">${this.EARTH99_GAL_POEM}</div>
      ${rows}
      <div class="earth99-ic-tip">☉ 黄点标记是太阳的位置——你在这里</div>`);
  },

  // ==================== 实时数据（ISS · USGS 地震）====================
  async _earth99Live() {
    // ISS 实时位置（失败 → 模拟轨道）
    const fetchIss = async () => {
      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 10000);
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', { signal: ctrl.signal });
        clearTimeout(to);
        const j = await res.json();
        if (j && typeof j.latitude === 'number') return [j.latitude, j.longitude, true];
      } catch (e) {}
      return null;
    };
    const applyIss = () => {
      const rt = this._earth99Rt;
      if (!rt || this.currentView !== 'earth99') return;
      const t = Date.now() / 1000;
      rt.live.iss = [51.6 * Math.sin(t * 0.0011), ((t * 0.26) % 360) - 180, false];   // 模拟轨道兜底
      rt.live.issOk = false;
      fetchIss().then(r => {
        if (!r) return;
        const rt2 = this._earth99Rt;
        if (!rt2) return;
        rt2.live.iss = r; rt2.live.issOk = true;
        if (this.currentView === 'earth99' && rt2.view === 'earth' && rt2.era === 'modern') this._earth99CardEra(this._earth99EraDef('modern'));
      });
    };
    applyIss();
    if (!this.__e99issInt) { this.__e99issInt = setInterval(applyIss, 30000); }
    // USGS 24h 地震（≥4.0）
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 12000);
      const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson', { signal: ctrl.signal });
      clearTimeout(to);
      const j = await res.json();
      const rt = this._earth99Rt;
      if (j && Array.isArray(j.features) && rt) {
        rt.live.quakes = j.features.slice(0, 40).map(f => ({
          lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
          mag: f.properties.mag || 4.5,
          t: ((Date.now() - (f.properties.time || Date.now())) / 3600000) % 2.4,
        }));
        if (this.currentView === 'earth99' && rt.view === 'earth' && rt.era === 'modern') this._earth99CardEra(this._earth99EraDef('modern'));
      }
    } catch (e) {}
  },

  // ==================== 分享 / 收藏 / 设置 ====================
  _earth99Share() {
    const rt = this._earth99Rt;
    if (!rt) return;
    try { this._sfx99('tap'); } catch (e) {}
    const vn = { earth: '🌍 独行地球', solar: '☀️ 太阳系', galaxy: '🌌 银河系' }[rt.view];
    const era = this._earth99EraDef(rt.era);
    const txt = `【一人行 · 独行地球】我正在${vn}漫游${rt.view === 'earth' ? `，此刻驻足「${era.n}」（${era.age}）` : ''}——${era.poem}`;
    if (navigator.share) { navigator.share({ title: '独行地球 · 一人行', text: txt }).catch(() => {}); return; }
    try {
      navigator.clipboard.writeText(txt).then(() => this._flash('🔗 观测报告已复制到剪贴板'), () => this._flash(txt));
    } catch (e) { this._flash(txt); }
  },
  _earth99FavAdd(lat, lon, name) {
    const d = this._earth99Data();
    const rt = this._earth99Rt;
    d.favs.push({ t: Date.now(), lat: +lat, lon: +lon, name: String(name || '').slice(0, 20), era: rt ? rt.era : 'modern', view: rt ? rt.view : 'earth' });
    if (d.favs.length > 60) d.favs = d.favs.slice(-60);
    this._earth99Save(d);
    try { this._sfx99('success'); } catch (e) {}
    this._flash('⭐ 已收藏「' + name + '」——右上 ⭐ 可查看星图');
  },
  _earth99FavShow() {
    const d = this._earth99Data();
    try { this._sfx99('tap'); } catch (e) {}
    const list = (d.favs || []).slice().reverse().map(f =>
      `<button class="earth99-fav" onclick="App._earth99FavGo(${f.lat},${f.lon},'${f.era}')">📍 ${this.esc(f.name)} · ${Math.abs(f.lat).toFixed(0)}°${f.lat >= 0 ? 'N' : 'S'} ${Math.abs(f.lon).toFixed(0)}°${f.lon >= 0 ? 'E' : 'W'}<small>${this._earth99EraDef(f.era).ico} ${new Date(f.t).toLocaleDateString()}</small></button>`).join('');
    this._modal('⭐ 我的观测收藏', list ? `<div class="earth99-favlist">${list}</div>` : '<div style="text-align:center;color:#94a3b8;padding:20px 0;font-size:13px">还没有收藏——点击地球任意位置，收藏你的观测点</div>', [{ label: '关闭', primary: true }]);
  },
  _earth99FavGo(lat, lon, era) {
    const rt = this._earth99Rt;
    if (!rt) return;
    try { this._sfx99('cosmos'); } catch (e) {}
    try { const ov = document.querySelector('.wild-overlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
    this._earth99View('earth');
    if (rt.era !== era) this._earth99EraSet(era, true);
    rt.camLon = lon; rt.tilt = lat * Math.PI / 180 * 0.55; rt.zoom = 1.8;
    this._earth99CardLoc(lat, lon);
  },
  _earth99Settings() {
    const d = this._earth99Data();
    try { this._sfx99('tap'); } catch (e) {}
    const sw = (k, n, des) => `<button class="earth99-sw${d.set[k] ? ' on' : ''}" onclick="App._earth99SetToggle(this,'${k}')"><i></i><em>${n}</em><small>${des}</small></button>`;
    this._modal('⚙️ 观测设置', `
      <div class="earth99-setbox">
        ${sw('spin', '自动旋转', '无人操作时地球缓慢自转')}
        ${sw('cloud', '云层显示', '现代地球的实时云海')}
        ${sw('lights', '城市夜灯', '夜半球 45 城灯火')}
        ${sw('quakes', '地震标注', 'USGS 近 24h 4.5+ 级脉冲')}
      </div>
      <div class="earth99-src">📡 数据源：wheretheiss.at（ISS 实时）· USGS 地震馈线 · 晨昏线按当日太阳赤纬实时计算 · 离线自动降级</div>`,
      [{ label: '完成', primary: true }]);
  },
  _earth99SetToggle(btn, k) {
    const v = this._earth99Set(k);
    btn.classList.toggle('on', !!v);
    try { this._sfx99(v ? 'on' : 'off'); } catch (e) {}
  },

  // ==================== 入场（长按【习惯】旋钮 1 秒 · 液体音 + 深蓝圆幕）====================
  _earth99Enter(ev) {
    const btn = document.querySelector('.dock99-btn[data-view="habit"]');
    const r = btn ? btn.getBoundingClientRect() : null;
    const x = (ev && ev.clientX) || (r ? r.left + r.width / 2 : 40);
    const y = (ev && ev.clientY) || (r ? r.top + r.height / 2 : window.innerHeight - 40);
    const veil = document.createElement('div');
    veil.className = 'perm99-veil earth99-veil';
    veil.style.setProperty('--vx', x + 'px');
    veil.style.setProperty('--vy', y + 'px');
    (document.body || document.documentElement).appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('run')));
    setTimeout(() => { try { this.navigate('earth99'); } catch (e) {} }, 950);
    setTimeout(() => {
      veil.classList.add('fade');
      setTimeout(() => { try { veil.remove(); } catch (e) {} }, 380);
    }, 1080);
  },
  // 长按绑定（挂在【习惯】旋钮上；bindNav 末尾统一调用）
  _earth99BindEntry() {
    const hb = document.querySelector('.dock99-btn[data-view="habit"]');
    if (!hb || hb.dataset.earth99Wired) return;
    hb.dataset.earth99Wired = '1';
    let lp = null, sx = 0, sy = 0;
    const clear = () => { if (lp) { clearTimeout(lp); lp = null; } };
    hb.addEventListener('pointerdown', (e) => {
      sx = e.clientX; sy = e.clientY;
      try { hb.setPointerCapture(e.pointerId); } catch (_) {}
      try { App._sfx99 && App._sfx99('liquid'); } catch (_) {}   // 液体音在按下瞬间（手势上下文内必出声）
      lp = setTimeout(() => {
        lp = null;
        App.__holdNav99 = true;   // 长按已触发：吞掉紧随的 click，不再进习惯页
        try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
        try { this._earth99Enter(e); } catch (_) {}
      }, 1000);
    });
    hb.addEventListener('pointermove', (e) => {
      if (!lp) return;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) clear();   // 手指滑动 = 取消
    });
    hb.addEventListener('pointerup', clear);
    hb.addEventListener('pointercancel', clear);
    hb.addEventListener('contextmenu', (e) => e.preventDefault());
  },
});
