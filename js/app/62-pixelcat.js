// 62-pixelcat.js —— v12.7 像素宠物精灵（8-bit 白猫·浅粉围巾）+ 像素管家阿福头像
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// 零图片资源：canvas 逐帧绘制 → toDataURL 拼 sprite sheet → CSS steps() 帧动画驱动
// 帧动画用 background-position 百分比定位，与显示尺寸解耦（同一套 keyframes 适配任意尺寸）
// 5 套动作（10 帧）：idle 待机（尾巴摆）/ lick 舔爪 / sleep 打盹（Zzz）/ coq 撒娇（歪头抬爪+摆尾）
//   / curled 蜷成一团睡觉（呼吸）——跑动帧已按用户要求删除（v12.9.36）
// 动作执行：全自动——宠物页自动循环（70-pet.js _pet99AutoStart）、小家行为引擎（75-home99.js）；
//   22:00–06:00 小银默认蜷在小窝睡觉（宠物页/小家同口径）
//   唯一手动触发的是彩蛋：点小银随机掉毛线球 / 主人像素手挥逗猫棒（__px99YarnUrl / __px99WandUrl）
(function () {
  const C = { W:'#ffffff', S:'#cfd6e4', K:'#2d2a32', P:'#f9a8d4', Q:'#ec8fc4', N:'#fbb6ce', T:'#f472b6', Z:'#8b98ae' };
  const W = 32, H = 34;
  // 姿态参数：dx dy 头偏移 | eyes open/closed/happy | tail up/down | paw 动作爪 | earTilt 耳抖 | zzz | curled 蜷睡 | squash 呼吸压低
  function drawCat(ctx, ox, oy, p) {
    const R = (x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(ox+x, oy+y, w, h); };
    const dx = p.dx||0, dy = p.dy||0;
    // —— 蜷缩睡（小窝里团成一团 · 两帧呼吸）：头蜷在右上，尾巴绕到身前 ——
    if (p.curled) {
      const q = p.squash ? 1 : 0; // 呼吸：压低 1px
      R(16,10,3,3,C.W); R(17,11,1,1,C.N);           // 耳朵
      R(22,10,3,3,C.W); R(23,11,1,1,C.N);
      R(14,12+q,12,9,C.W); R(15,11+q,10,1,C.W);    // 头
      R(14,13+q,1,7,C.S);
      R(16,16+q,3,1,C.K); R(21,16+q,3,1,C.K);       // 闭眼
      R(19,18+q,2,1,C.N);                            // 鼻
      R(15,18+q,1,1,C.N); R(24,18+q,1,1,C.N);        // 腮红
      R(14,21+q,11,2,C.P); R(14,22+q,11,1,C.Q);      // 围巾（下巴）
      R(8,16+q,16,2,C.W); R(6,18+q,20,2,C.W);       // 身体球（上缘收圆）
      R(4,20+q,24,10,C.W);
      R(5,29+q,22,1,C.S); R(4,21+q,1,8,C.S); R(27,21+q,1,8,C.S); // 球体阴影
      R(7,27+q,18,3,C.W); R(7,29+q,18,1,C.S);       // 尾巴绕到身前
      R(23,25+q,3,3,C.W); R(24,26+q,2,1,C.S);       // 尾尖
      if (p.zzz) { R(25,3,4,1,C.Z); R(27,4,1,1,C.Z); R(25,5,4,1,C.Z); }
      return;
    }
    // 尾巴（两帧摆动）
    if (p.tail === 'down') { R(21,26,8,2,C.W); R(28,27,2,4,C.W); R(21,27,7,1,C.S); }
    else { R(21,23,8,2,C.W); R(28,19,2,5,C.W); R(28,18,2,1,C.S); }
    // 身体
    R(8,19,14,10,C.W); R(9,29,12,2,C.W);
    R(9,29,12,2,C.S); R(8,28,14,1,C.S);
    // 围巾（浅粉 + 垂布）
    R(7,16,16,3,C.P); R(17,18,4,4,C.P); R(7,17,16,1,C.Q); R(17,19,4,1,C.Q);
    // 头
    const hx = 7+dx, hy = 2+dy;
    R(hx,hy,4,4,C.W); R(hx+1,hy+1,2,2,C.N);                       // 左耳+内耳
    const rt = p.earTilt ? 1 : 0;
    R(hx+12,hy+rt,4,4,C.W); R(hx+13,hy+1+rt,2,2,C.N);              // 右耳（可抖动）
    R(hx+1,hy+4,14,1,C.W); R(hx,hy+5,16,9,C.W); R(hx+1,hy+14,14,1,C.W); // 头主体
    // 眼睛
    if (p.eyes === 'closed') { R(hx+3,hy+9,3,1,C.K); R(hx+10,hy+9,3,1,C.K); }
    else if (p.eyes === 'happy') {
      R(hx+3,hy+9,1,1,C.K); R(hx+5,hy+9,1,1,C.K); R(hx+4,hy+10,1,1,C.K);
      R(hx+10,hy+9,1,1,C.K); R(hx+12,hy+9,1,1,C.K); R(hx+11,hy+10,1,1,C.K);
    } else { R(hx+3,hy+8,2,2,C.K); R(hx+11,hy+8,2,2,C.K); }
    // 鼻嘴腮红
    R(hx+7,hy+11,2,1,C.N);
    R(hx+6,hy+12,1,1,C.K); R(hx+9,hy+12,1,1,C.K); R(hx+7,hy+13,2,1,C.K);
    R(hx+2,hy+11,1,1,C.N); R(hx+13,hy+11,1,1,C.N);
    // 前爪动作
    if (p.paw === 'lick')  { R(hx+11,hy+11,3,3,C.W); R(hx+11,hy+10,2,1,C.T); }
    if (p.paw === 'lick2') { R(hx+11,hy+10,3,3,C.W); R(hx+11,hy+9,2,1,C.T); }
    if (p.paw === 'wave')  { R(hx+15,hy+10,3,3,C.W); }
    if (p.paw === 'wave2') { R(hx+15,hy+9,3,3,C.W); }
    // 坐姿前爪
    R(10,29,4,2,C.W); R(16,29,4,2,C.W);
    R(10,30,1,1,C.N); R(11,30,1,1,C.N); R(16,30,1,1,C.N); R(17,30,1,1,C.N);
    // Zzz
    if (p.zzz) { R(25,3,4,1,C.Z); R(27,4,1,1,C.Z); R(25,5,4,1,C.Z); }
  }
  // 10 帧 sprite：idle(0,1) lick(2,3) sleep(4,5) coq(6,7) curled(8,9)
  // coq 第 2 帧带 tail:'down' —— 撒娇时尾巴左右摇摆
  const FRAMES = [
    { tail:'up' },
    { tail:'down' },
    { dy:2, eyes:'closed', paw:'lick' },
    { dy:3, eyes:'closed', paw:'lick2' },
    { dy:1, eyes:'closed' },
    { dy:2, eyes:'closed', zzz:1 },
    { dx:-1, eyes:'happy', paw:'wave',  earTilt:1 },
    { dx:-1, eyes:'happy', paw:'wave2', earTilt:0, tail:'down' },
    { curled:1, squash:0, dx:7, dy:9 },            // 蜷睡 A（常态）
    { curled:1, squash:1, dx:7, dy:10, zzz:1 },    // 蜷睡 B（压低呼吸 + Zzz）
  ];
  // ===== v12.8 像素装扮叠层（帽子/颈部/眼镜）：坐标跟随头部姿态 dx/dy，帧动画也戴着 =====
  // DECOR[id] = (R, hx, hy)：R=画格函数；hx,hy=头部左上角（随帧偏移）
  const DECOR = {
    hat_beret: (R, hx, hy) => {          // 红贝雷帽
      R(hx + 3, hy, 10, 3, '#ef4444'); R(hx + 4, hy - 2, 7, 2, '#ef4444'); R(hx + 5, hy - 3, 4, 1, '#dc2626');
      R(hx + 5, hy - 1, 2, 1, '#fca5a5'); R(hx + 3, hy + 2, 10, 1, '#b91c1c');
    },
    hat_straw: (R, hx, hy) => {          // 像素小草帽
      R(hx + 1, hy + 2, 14, 1, '#eab308'); R(hx + 4, hy, 8, 2, '#facc15'); R(hx + 5, hy - 1, 6, 1, '#fde047');
      R(hx + 4, hy + 1, 8, 1, '#dc2626'); R(hx + 1, hy + 2, 2, 1, '#ca8a04'); R(hx + 13, hy + 2, 2, 1, '#ca8a04');
    },
    hat_crown: (R, hx, hy) => {          // 碎花头环
      R(hx + 2, hy + 2, 12, 1, '#16a34a');
      R(hx + 3, hy, 2, 2, '#f472b6'); R(hx + 6, hy - 1, 2, 2, '#fbbf24'); R(hx + 9, hy, 2, 2, '#a78bfa'); R(hx + 12, hy + 1, 2, 2, '#f9a8d4');
    },
    neck_bell: (R) => {                  // 金色铃铛圈（红带+铃铛）
      R(12, 17, 8, 1, '#dc2626'); R(14, 18, 4, 3, '#fbbf24'); R(14, 18, 4, 1, '#fde047');
      R(15, 20, 2, 1, '#92400e'); R(15, 19, 1, 1, '#fff7ed');
    },
    neck_bow: (R) => {                   // 蓝色蝴蝶结
      R(9, 16, 3, 3, '#3b82f6'); R(13, 16, 3, 3, '#3b82f6'); R(12, 17, 1, 2, '#1e40af');
      R(10, 19, 4, 1, '#2563eb'); R(9, 17, 1, 1, '#93c5fd'); R(14, 17, 1, 1, '#93c5fd');
    },
    face_glasses: (R, hx, hy) => {       // 圆框小眼镜
      const col = '#334155';
      R(hx + 2, hy + 7, 4, 1, col); R(hx + 2, hy + 10, 4, 1, col); R(hx + 2, hy + 7, 1, 4, col); R(hx + 5, hy + 7, 1, 4, col);
      R(hx + 10, hy + 7, 4, 1, col); R(hx + 10, hy + 10, 4, 1, col); R(hx + 10, hy + 7, 1, 4, col); R(hx + 13, hy + 7, 1, 4, col);
      R(hx + 6, hy + 8, 4, 1, col);
    },
  };
  function drawCatDecor(ctx, ox, oy, p, decor) {
    decor = decor || {};
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };
    const hx = 7 + (p.dx || 0), hy = 2 + (p.dy || 0);
    if (decor.hat && DECOR[decor.hat]) DECOR[decor.hat](R, hx, hy);
    if (decor.neck && DECOR[decor.neck]) DECOR[decor.neck](R, hx, hy);
    if (decor.face && DECOR[decor.face]) DECOR[decor.face](R, hx, hy);
  }
  function makeCatSprite(decor) {
    const cv = document.createElement('canvas');
    const cvW = W * FRAMES.length; cv.width = cvW; cv.height = H;
    const ctx = cv.getContext('2d');
    FRAMES.forEach((pose, i) => { drawCat(ctx, i * W, 0, pose); drawCatDecor(ctx, i * W, 0, pose, decor); });
    return cv.toDataURL();
  }
  // 单帧 idle 图（SVG <image> 场景嵌入用——小家房间等无法跑 CSS 帧动画的地方）
  function makeCatIdleUrl(decor) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    drawCat(ctx, 0, 0, FRAMES[0]);
    drawCatDecor(ctx, 0, 0, FRAMES[0], decor);
    return cv.toDataURL();
  }
  // ===== v12.9.35 逐帧独立 dataURL（小家 SVG 行为引擎用：小银蜷睡/舔爪/撒娇 + 夜间睡眠） =====
  function makeCatFrameUrl(i, decor) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    drawCat(ctx, 0, 0, FRAMES[i]);
    drawCatDecor(ctx, 0, 0, FRAMES[i], decor);
    return cv.toDataURL();
  }
  function makeCatFrameUrls(decor) { return FRAMES.map((_, i) => makeCatFrameUrl(i, decor)); }
  // ===== v12.9.35 彩蛋 sprite：毛线球 + 逗猫棒（尾端小鱼干）=====
  function makeYarnSprite() { // 12×14：粉色毛线球 + 散线
    const cv = document.createElement('canvas'); cv.width = 12; cv.height = 14;
    const ctx = cv.getContext('2d');
    const R = (x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); };
    R(3,1,6,1,'#f472b6'); R(2,2,8,1,'#f472b6'); R(1,3,10,1,'#f472b6');
    R(1,4,10,1,'#ec4899'); R(0,5,12,5,'#f472b6'); R(0,7,12,1,'#db2777');
    R(1,10,10,1,'#ec4899'); R(1,11,10,1,'#f472b6'); R(2,12,8,1,'#db2777'); R(3,13,6,1,'#f472b6');
    R(3,2,3,2,'#fbcfe8'); R(1,5,1,3,'#fbcfe8');    // 高光
    R(10,11,1,1,'#db2777'); R(11,12,1,2,'#db2777'); // 散出的线
    return cv.toDataURL();
  }
  function makeWandSprite() { // 16×26：主人像素手握木杆，末端线 + 小鱼干
    const cv = document.createElement('canvas'); cv.width = 16; cv.height = 26;
    const ctx = cv.getContext('2d');
    const R = (x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); };
    R(10,1,5,5,'#ffe0bd'); R(10,5,5,1,'#e8b98a'); R(9,3,1,2,'#ffe0bd'); // 像素手
    R(9,6,7,2,'#f8fafc'); R(9,7,7,1,'#cbd5e1');                         // 白袖口
    for (let i = 0; i < 12; i++) R(12 - Math.round(i * .82), 8 + i, 2, 1, i % 3 === 2 ? '#92400e' : '#b45309'); // 木杆斜向下
    R(2,20,1,3,'#94a3b8');                                               // 线
    R(1,23,5,2,'#c2410c'); R(1,23,1,1,'#fb923c'); R(6,23,2,2,'#9a3412'); R(2,23,1,1,'#fde68a'); // 小鱼干
    return cv.toDataURL();
  }
  // 像素阿福头像（24×24：深棕发 + 肤色脸 + 白衬衫绿领结的管家 · 透明底"白色阿福"）
  // v12.7c：全 App 的阿福形象统一用这一个 sprite（首页入口/聊天页/记录陪伴卡等）
  function makeAfuSprite() {
    const cv = document.createElement('canvas'); cv.width = 24; cv.height = 24;
    const ctx = cv.getContext('2d');
    const R = (x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); };
    R(4,2,16,4,'#4a3728'); R(3,5,3,5,'#4a3728'); R(18,5,3,5,'#4a3728');   // 深棕发
    R(5,6,14,11,'#ffe0bd');                                                 // 脸
    R(8,10,2,2,'#2d2a32'); R(14,10,2,2,'#2d2a32');                          // 眼
    R(10,14,4,1,'#b45309');                                                // 微笑
    R(3,17,18,5,'#ffffff'); R(4,19,16,3,'#ffffff');                        // 白衬衫
    R(10,17,4,3,'#2f6f4f'); R(11,20,2,2,'#2f6f4f');                         // 绿领结
    return cv.toDataURL();
  }
  // 注入 sprite（.pxcat / .pxafu 背景图全局一次生成；v12.8 起按存档装扮重生成 .pxcat）
  let __catDecorStyle = null;
  function applyDecor(decor) {
    try {
      if (!__catDecorStyle) { __catDecorStyle = document.createElement('style'); document.head.appendChild(__catDecorStyle); }
      __catDecorStyle.textContent = '.pxcat{background-image:url(' + makeCatSprite(decor) + ')}';
      window.__px99CatIdleUrl = makeCatIdleUrl(decor);
      window.__px99CatFrames = makeCatFrameUrls(decor); // 小家行为引擎逐帧换图
    } catch (e) {}
  }
  // 装扮单品小图标（商城/衣柜用，80×80 放大自 20×20 手绘格）
  const __decorIconCache = {};
  function decorIcon(id) {
    if (__decorIconCache[id]) return __decorIconCache[id];
    if (!DECOR[id]) return '';
    try {
      const cv = document.createElement('canvas'); cv.width = 20; cv.height = 20;
      const ctx = cv.getContext('2d');
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      const off = { hat: [-2, 4], neck: [-4, -8], face: [-1, -3] }[(id.split('_')[0]) || ''] || [0, 0];
      ctx.save(); ctx.translate(off[0], off[1]); DECOR[id](R, 4, 5); ctx.restore();
      const o = document.createElement('canvas'); o.width = 80; o.height = 80;
      const k = o.getContext('2d'); k.imageSmoothingEnabled = false;
      k.drawImage(cv, 0, 0, 80, 80);
      __decorIconCache[id] = o.toDataURL();
      return __decorIconCache[id];
    } catch (e) { return ''; }
  }
  try {
    const st = document.createElement('style');
    st.textContent = '.pxcat{background-image:url(' + makeCatSprite() + ')}.pxafu{background-image:url(' + makeAfuSprite() + ')}';
    document.head.appendChild(st);
    // 暴露给外部：SVG 场景（小家房间）用 <image> 嵌入帧图；装扮切换时全 App 同步换装
    window.__px99CatIdleUrl = makeCatIdleUrl();
    window.__px99CatFrames = makeCatFrameUrls();
    window.__px99YarnUrl = makeYarnSprite();
    window.__px99WandUrl = makeWandSprite();
    window.__px99ApplyDecor = applyDecor;
    window.__px99DecorIcon = decorIcon;
    // 启动即按宠物存档的装扮上装（独立 key，读失败 = 无装扮，静默）
    try {
      const p = JSON.parse(localStorage.getItem('one-xing-pet-v1') || '{}');
      if (p && p.decor && Object.keys(p.decor).length) applyDecor(p.decor);
    } catch (_) {}
  } catch (e) {}
})();

Object.assign(App, {
  // 像素猫 HTML：px = 显示宽度（高度按 34/32 比例自适应）；act = idle/lick/sleep/coq/curled
  _pet99CatHtml(o) {
    o = o || {};
    const act = ['idle','lick','sleep','coq','curled'].indexOf(o.act) >= 0 ? o.act : 'idle';
    const live = o.live ? ' data-live="1"' : '';
    const px = o.px || 96;
    const h = (px * 34 / 32).toFixed(1);
    return `<span class="pxcat"${live} data-act="${act}" style="width:${px}px;height:${h}px;background-size:calc(${px}px*10) ${h}px"></span>`;
  },
  // 像素阿福头像 HTML（cls 可选附加类：pxafu-inline 行内对齐 / 其他）
  _afu99AvatarHtml(px, cls) {
    px = px || 24;
    return `<span class="pxafu${cls ? ' ' + cls : ''}" style="width:${px}px;height:${px}px;background-size:${px}px ${px}px"></span>`;
  },
});
