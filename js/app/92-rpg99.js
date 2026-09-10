// 92-rpg99.js —— v12.9.31 【独行信条】RPG 引擎：经验 / 等级 / 属性 / 宝石 + 【个人中心】像素战士
// [功能组] 独行信条（v12.9.31 新分组：RPG 游戏机制——如果人生是一款 RPG 游戏，每天的小坚持都变成经验值）
// 架构（只增不减 · 业务数据只读 · 幂等结算）：
//   · 经验值（exp）：① 每日每成功打卡一个自律习惯/消费记录 +1
//                   ② 同一习惯从连续第 2 天起每天额外 +1；连续 7/15/30/60/100 天时再额外 +7/15/30/60/100（各奖一次）
//                   ③ 当日累计打卡 15 个 → 额外 +3 经验 +1 宝石；累计 30 个 → 额外 +6 经验 +2 宝石
//                   ④ 记录分类（灵光/憾潮/拾梦/足迹/日记/铭记/漂流/读感）≥100 字且阿福审核通过 → +1 经验 +1 宝石（每日一次）
//                   ⑤ 记录连续 7/15/30/60/100 天 → 额外 +7/15/30/60/100（各奖一次）
//   · 等级（1-30 满级）：1-10 级每 100 经验升 1 级 · 10-20 级每 200 · 20-30 级每 300——到达阈值自动升级
//   · 属性（生命/攻击/防御）：基础 5 点；每升 1 级 +1（1-10 级）/ +3（10-20 级）/ +5（20-30 级）
//   · 宝石（原「自律点」v12.9.31 更名）：沿用宠物钱包 points 存储，来源仅 ③④（旧的打卡/里程碑/评价/聊天奖励已全部删除）
//   · 每日独行任务卡：每日 5 张（3 成长 + 1~2 戒 + 0~1 生活）· 横滑随时浏览（与完成无关）· 长按 1.5 秒阿福检验通过才完成；每完成 1 张可开 1 次像素宝箱
//   · 像素宝箱（v12.9.31 补充）：每完成 1 个每日任务开 1 次 · 2 秒金光开启动画 → 弹出奖励像素图案
//     掉落：70% 经验 1-3 点 · 20% 宝石 1-3 个 · 10% 随机武器/防具/饰品
//   · 装备系统：武器+攻击 / 防具+防御 / 饰品+生命 · 每类 5 件（宝箱随机掉落 + 宝石商店购买）· 开出更强即自动换装（像素战士配色随装备变化）
//   · 【个人中心】（gotoWb('rpg99')）：全程像素风——独行资料卡（像素战士 + 属性面板 + 经验条 + 宝石）+ 右上角 📖 成长指南
// 像素战士（零图片资源）：canvas 逐格 fillRect 绘制（与像素猫小银同一套画法）→ dataURL → CSS pixelated 放大
//   基础形象：手持一把普通小刃（武器）· 穿着最简陋的背心（防具）· 戴着草帽（饰品）；男/女两版
(function () {
  // ===== 像素战士绘制（24×32 格 · 男/女 · 支持装备配色）=====
  const HERO_W = 24, HERO_H = 32;
  window.__rpg99HeroSize = { W: HERO_W, H: HERO_H };
  const SKIN = '#ffe0bd', SKIN_D = '#e8b98a';
  const HAIR_M = '#4a3728', HAIR_F = '#7c4a2d';   // 男深棕 / 女棕红
  const VEST_M = '#cbd5e1', VEST_F = '#f9a8d4';  // 男浅灰背心 / 女浅粉背心（最简陋的防具）
  const PANT_M = '#3b4a6b', SKIRT_F = '#d9534f'; // 男深蓝裤 / 女红裙
  const SHOE = '#8a5a2b';
  const HAT_Y = '#facc15', HAT_YL = '#fde047', HAT_YD = '#ca8a04', HAT_R = '#dc2626'; // 草帽
  const BLADE = '#e2e8f0', BLADE_D = '#94a3b8', HILT = '#92400e', GUARD = '#64748b';   // 小刃
  const EYE = '#2d2a32', BLUSH = '#f9a8d4', MOUTH = '#b45309';

  // pal: { w:{blade,hi,D,guard,hilt}, v:{v,hi}, t:{y,yl,yd,band} }——装备配色（缺省=基础形象）
  // v12.9.35 分层绘制（伪 3D）：back 女生披肩长发 / armL 左臂 / body 躯干+下装 / head 头 / armR 右臂+武器
  //   各层矩形互不重叠 → 分层后平铺合成与旧版 drawHero 逐像素等价；3D 模式按 z 值拉开纵深
  function drawHeroLayer(ctx, ox, oy, female, pal, layer) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };
    const P = pal || {};
    const W = P.w || {}, V = P.v || {}, T = P.t || {};
    const HAIR = female ? HAIR_F : HAIR_M;
    const VEST = V.v || (female ? VEST_F : VEST_M);
    const VHI = V.hi || (female ? '#fbcfe8' : '#e2e8f0');
    const BL = W.blade || BLADE, BLH = W.hi || '#f8fafc', BLD = W.D || BLADE_D;
    const GD = W.guard || GUARD, HL = W.hilt || HILT;
    const H1 = T.y || HAT_Y, H2 = T.yl || HAT_YL, H3 = T.yd || HAT_YD, H4 = T.band || HAT_R;
    if (layer === 'back') {
      // —— 长发（女生披肩 · 身体后层）——
      if (female) { R(5, 7, 2, 10, HAIR); R(17, 7, 2, 10, HAIR); R(5, 16, 2, 1, '#8f5a36'); R(17, 16, 2, 1, '#8f5a36'); }
    } else if (layer === 'armL') {
      // —— 左臂（肤色）——
      R(5, 13, 2, 6, SKIN); R(5, 18, 2, 1, SKIN_D);
    } else if (layer === 'body') {
      // —— 背心/护甲（防具槽）——
      R(7, 13, 10, 6, VEST); R(7, 13, 10, 1, VHI);
      R(11, 13, 2, 1, SKIN);                                   // 领口
      // —— 腰带 ——
      R(7, 19, 10, 1, '#6b4423'); R(11, 19, 2, 1, '#facc15');  // 皮带 + 铜扣
      // —— 下装 ——
      if (female) {
        R(7, 20, 10, 3, SKIRT_F);                              // 裙
        R(6, 23, 12, 2, SKIRT_F); R(6, 24, 12, 1, '#b03a36');  // 裙摆展开
        R(9, 25, 2, 4, SKIN); R(13, 25, 2, 4, SKIN);           // 腿
        R(8, 29, 4, 2, SHOE); R(12, 29, 4, 2, SHOE);           // 鞋
      } else {
        R(7, 20, 10, 5, PANT_M); R(7, 20, 10, 1, '#2d3a54');   // 裤
        R(9, 25, 2, 4, PANT_M); R(13, 25, 2, 4, PANT_M);       // 腿
        R(8, 29, 4, 2, SHOE); R(12, 29, 4, 2, SHOE);            // 鞋
      }
    } else if (layer === 'head') {
      // —— 草帽/头饰（饰品槽）——
      R(9, 0, 6, 1, H2); R(8, 1, 8, 2, H1);           // 帽顶
      R(4, 3, 16, 2, H1); R(4, 3, 16, 1, H2);         // 宽帽檐
      R(4, 4, 16, 1, H3); R(8, 2, 8, 1, H4);          // 檐影 + 红帽带
      // —— 头发（露出部分）——
      R(6, 5, 12, 2, HAIR); R(7, 5, 10, 1, female ? '#8f5a36' : '#5d4632');
      // —— 脸 ——
      R(7, 7, 10, 6, SKIN); R(7, 7, 1, 6, SKIN_D); R(16, 7, 1, 6, SKIN_D);
      R(9, 9, 2, 2, EYE); R(13, 9, 2, 2, EYE);               // 眼睛
      R(11, 11, 2, 1, MOUTH);                                 // 嘴
      if (female) { R(7, 10, 1, 1, BLUSH); R(16, 10, 1, 1, BLUSH); } // 女生腮红
    } else if (layer === 'armR') {
      // —— 右臂 + 武器（武器槽 · 竖握 · 挥砍层）——
      R(17, 13, 2, 6, SKIN); R(17, 18, 2, 1, SKIN_D);
      R(20, 6, 2, 9, BL); R(20, 6, 1, 9, BLH);                // 刀刃（高光）
      R(20, 14, 2, 1, BLD);
      R(19, 15, 4, 1, GD);                                    // 护手
      R(20, 16, 2, 3, HL);                                    // 刀柄
    }
  }
  // 平铺合成（与旧版 drawHero 逐像素等价）：层序即绘制序
  function drawHero(ctx, ox, oy, female, pal) {
    ['back', 'armL', 'body', 'head', 'armR'].forEach(k => drawHeroLayer(ctx, ox, oy, female, pal, k));
  }
  // ===== 像素宝箱绘制（22×18 格 · 关/开两态）=====
  function drawChest(ctx, open) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const WOOD = '#b45309', WOOD_D = '#92400e', WOOD_L = '#d97706', EDGE = '#451a03';
    const GOLD = '#facc15', GOLD_L = '#fde047', GOLD_D = '#ca8a04';
    if (open) {
      // 抬起的箱盖
      R(1, 0, 20, 5, WOOD); R(1, 0, 20, 1, WOOD_L); R(1, 4, 20, 1, WOOD_D);
      R(1, 0, 1, 5, EDGE); R(20, 0, 1, 5, EDGE);
      R(5, 0, 2, 5, GOLD); R(15, 0, 2, 5, GOLD);
      // 金光缝隙
      R(2, 6, 18, 1, GOLD_L);
      // 箱身
      R(1, 7, 20, 10, WOOD); R(1, 7, 20, 1, WOOD_L); R(1, 16, 20, 1, EDGE);
      R(1, 7, 1, 10, EDGE); R(20, 7, 1, 10, EDGE);
      R(5, 7, 2, 10, GOLD); R(15, 7, 2, 10, GOLD);
      // 箱内微光（钻石/金币/宝石）
      R(4, 8, 2, 2, '#7dd3fc'); R(10, 8, 2, 2, GOLD_L); R(16, 8, 2, 2, '#f472b6');
      R(7, 10, 1, 1, '#fff'); R(14, 11, 1, 1, '#fff');
    } else {
      // 箱盖
      R(1, 0, 20, 7, WOOD); R(1, 0, 20, 1, WOOD_L); R(1, 6, 20, 1, WOOD_D);
      R(1, 0, 1, 7, EDGE); R(20, 0, 1, 7, EDGE);
      R(5, 0, 2, 7, GOLD); R(15, 0, 2, 7, GOLD); R(5, 0, 2, 1, GOLD_L); R(15, 0, 2, 1, GOLD_L);
      // 箱身
      R(1, 7, 20, 10, WOOD); R(1, 7, 20, 1, WOOD_L); R(1, 16, 20, 1, EDGE);
      R(1, 7, 1, 10, EDGE); R(20, 7, 1, 10, EDGE);
      R(5, 7, 2, 10, GOLD); R(15, 7, 2, 10, GOLD);
      // 锁扣
      R(9, 5, 4, 5, GOLD); R(9, 5, 4, 1, GOLD_L); R(9, 9, 4, 1, GOLD_D);
      R(10, 7, 2, 2, EDGE); // 钥匙孔
    }
  }
  window.__rpg99HeroUrl = function (female, pal) {
    try {
      const cv = document.createElement('canvas');
      cv.width = HERO_W; cv.height = HERO_H;
      drawHero(cv.getContext('2d'), 0, 0, !!female, pal);
      return cv.toDataURL();
    } catch (e) { return ''; }
  };
  // ===== v12.9.38 战士实体建模（体素 3D）：逐层 canvas 取像素 → 同色横段 = 六面长方体（CSS 3D）=====
  // 旧「分层平面」各层是一张张透明贴片：旋转到侧面时贴片侧对视线（近乎不可见）→ 整个人物消失。
  // 体素化后每个色段都是真实长方体（前/背/左/右/顶/底六面），任意角度旋转始终可见、有厚度有体积。
  //   · 同层相邻色段互相覆盖的面剔除（省 DOM · 消共面闪烁）；生成面微缩 0.01px 入体防相邻共面争抢
  //   · 各层 z 区间在 x/y 像素重叠处互斥（女生长发×左臂），零面穿插
  //   · 面色按受光方向微调：顶 +16% / 左 +5% / 右 -12% / 底 -22% / 背 -4%（体素明暗体积感）
  // 返回 { body, arm }：arm = 持武右臂的体素（独立分组，供挥砍动画整体摆动）
  window.__rpg99HeroVoxels = function (female, pal, S) {
    try {
      S = S || 6.25;   // 每像素的显示尺寸（150px 宽 / 24px）
      // 层 z 区间（sprite 像素单位 · ×S 即显示 px）：披肩发最后 · 左臂 · 躯干 · 头 · 持武右臂最前
      const Z = { back: [-2.3, -0.9], armL: [-0.6, 0.5], body: [-1.0, 0.8], head: [-1.1, 1.45], armR: [-0.35, 1.75] };
      // v12.9.39 武器实体厚度修复：armR 层 x≥19 的像素（刀刃/护手/刀柄）单独加深 z 区间——
      //   此前武器与手臂同层厚度（~13px），侧向旋转时刀刃大面对视线（近乎不可见）→「武器建模丢失」；
      //   加深为 26px 厚的实体剑身，任意角度旋转都是清晰立体的厚重刀刃（与身体/头 x 不重叠，零穿插）
      const WEAP_Z = [-1.4, 2.8];
      const cap = (v) => Math.max(0, Math.min(255, Math.round(v)));
      const sh = (c, f) => 'rgb(' + cap(c[0] * f) + ',' + cap(c[1] * f) + ',' + cap(c[2] * f) + ')';
      let bodyH = '', armH = '';
      ['back', 'armL', 'body', 'head', 'armR'].filter(k => k !== 'back' || female).forEach(k => {
        const cv = document.createElement('canvas');
        cv.width = HERO_W; cv.height = HERO_H;
        const ctx = cv.getContext('2d');
        drawHeroLayer(ctx, 0, 0, !!female, pal, k);
        const d = ctx.getImageData(0, 0, HERO_W, HERO_H).data;
        const a = (x, y) => x >= 0 && x < HERO_W && y >= 0 && y < HERO_H && d[(y * HERO_W + x) * 4 + 3] > 8;
        const cAt = (x, y) => { const i = (y * HERO_W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
        for (let y = 0; y < HERO_H; y++) {
          for (let x = 0; x < HERO_W;) {
            if (!a(x, y)) { x++; continue; }
            const c = cAt(x, y);
            let x1 = x;
            while (x1 + 1 < HERO_W && a(x1 + 1, y)) {
              const c2 = cAt(x1 + 1, y);
              if (c2[0] !== c[0] || c2[1] !== c[1] || c2[2] !== c[2]) break;
              x1++;
            }
            // 武器像素（x≥19 的色段）单独用加深 z 区间——见 WEAP_Z 注释
            const zk = (k === 'armR' && x >= 19) ? WEAP_Z : Z[k];
            const D = ((zk[1] - zk[0]) * S).toFixed(2), Z0 = (zk[0] * S).toFixed(2);
            const w = x1 - x + 1, WS = (w * S).toFixed(2);
            // 面剔除：上下/左右全被同层像素贴住的面不生成（前后两面始终生成——人物的正反表面）
            let tH = 1, bH = 1;
            for (let i = 0; i < w; i++) { if (!a(x + i, y - 1)) tH = 0; if (!a(x + i, y + 1)) bH = 0; }
            const lH = a(x - 1, y) ? 0 : 1, rH = a(x1 + 1, y) ? 0 : 1;
            const seg = `<b style="left:${(x * S).toFixed(2)}px;top:${(y * S).toFixed(2)}px;width:${WS}px;height:${S.toFixed(2)}px;transform:translateZ(${Z0}px);background:${sh(c, .96)}">`
              + `<i class="f" style="background:${sh(c, 1)};transform:translateZ(${D}px)"></i>`
              + (tH ? `<i class="e t" style="width:${WS}px;height:${D}px;background:${sh(c, 1.16)}"></i>` : '')
              + (bH ? `<i class="e b" style="width:${WS}px;height:${D}px;background:${sh(c, .78)}"></i>` : '')
              + (lH ? `<i class="e l" style="width:${D}px;height:${S.toFixed(2)}px;background:${sh(c, 1.05)}"></i>` : '')
              + (rH ? `<i class="e r" style="width:${D}px;height:${S.toFixed(2)}px;background:${sh(c, .88)}"></i>` : '')
              + '</b>';
            if (k === 'armR') armH += seg; else bodyH += seg;
            x = x1 + 1;
          }
        }
      });
      return { body: bodyH, arm: armH };
    } catch (e) { return null; }
  };
  window.__rpg99ChestUrl = function (open) {
    try {
      const cv = document.createElement('canvas');
      cv.width = 22; cv.height = 18;
      drawChest(cv.getContext('2d'), !!open);
      return cv.toDataURL();
    } catch (e) { return ''; }
  };
  // ===== 奖励像素图案（16×16：宝石/经验 · 武器/防具/饰品按装备配色）=====
  function drawItem(ctx, kind, pal) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const P = pal || {};
    if (kind === 'gem') { // 💎 宝石（切面钻石）
      const L = '#a5f3fc', M = '#22d3ee', E = '#155e75', W = '#f0fdfa';
      R(6, 2, 4, 1, L); R(5, 3, 6, 1, M); R(4, 4, 8, 1, M);
      R(3, 5, 10, 3, M); R(3, 5, 3, 3, L); R(10, 5, 3, 3, E);   // 冠部刻面
      R(4, 8, 8, 1, E); R(5, 9, 6, 1, E); R(6, 10, 4, 1, E); R(7, 11, 2, 1, E); // 亭部
      R(6, 3, 2, 2, W);                                          // 高光
    } else if (kind === 'exp') { // ⭐ 经验（金色四芒星）
      const G = '#fde047', GD = '#eab308', W = '#fffbeb';
      R(7, 1, 2, 2, G); R(6, 3, 4, 2, G); R(5, 5, 6, 2, G);
      R(1, 7, 14, 2, G);                                          // 横芒
      R(5, 9, 6, 2, G); R(6, 11, 4, 2, G); R(7, 13, 2, 2, G);
      R(8, 1, 1, 2, GD); R(8, 13, 1, 2, GD); R(12, 7, 2, 1, GD); R(2, 8, 2, 1, GD); // 暗面
      R(7, 7, 2, 2, W);                                           // 中心高光
    } else if (kind === 'w') { // ⚔️ 武器（竖剑 · 按装备配色）
      const WP = P.w || {};
      const BL = WP.blade || '#e2e8f0', BLH = WP.hi || '#f8fafc', BLD = WP.D || '#94a3b8';
      const GD = WP.guard || '#ca8a04', HL = WP.hilt || '#78350f';
      R(7, 0, 2, 2, BL); R(7, 0, 1, 2, BLH);                       // 剑尖
      R(7, 2, 2, 8, BL); R(7, 2, 1, 8, BLH); R(8, 2, 1, 8, BLD);   // 剑身
      R(5, 10, 6, 2, GD); R(5, 10, 6, 1, '#fde047');               // 护手
      R(7, 12, 2, 3, HL);                                          // 剑柄
      R(6, 15, 4, 1, GD);                                          // 柄首
    } else if (kind === 'a') { // 🛡️ 防具（护甲 · 按装备配色）
      const VP = P.v || {};
      const V = VP.v || '#94a3b8', VH = VP.hi || '#e2e8f0', VD = VP.D || '#64748b';
      R(3, 3, 4, 3, V); R(9, 3, 4, 3, V); R(3, 3, 1, 3, VH); R(12, 3, 1, 3, VH); // 肩甲
      R(4, 4, 8, 10, V); R(4, 4, 8, 1, VH);                        // 胸甲主体
      R(6, 3, 4, 2, '#1c1917');                                    // 领口
      R(6, 6, 1, 8, VD); R(9, 6, 1, 8, VD);                        // 甲纹
      R(4, 13, 8, 1, VD);                                          // 下摆
    } else { // 👑 饰品（帽子/头冠 · 按装备配色）
      const TP = P.t || {};
      const Y = TP.y || '#facc15', YL = TP.yl || '#fde047', YD = TP.yd || '#ca8a04', B = TP.band || '#dc2626';
      R(5, 2, 6, 1, YL); R(5, 3, 6, 3, Y); R(5, 3, 6, 1, YL);       // 冠体
      R(5, 5, 6, 1, B);                                            // 冠带
      R(2, 6, 12, 2, Y); R(2, 6, 12, 1, YL); R(2, 7, 12, 1, YD);    // 帽檐
    }
  }
  window.__rpg99ItemUrl = function (kind, pal) {
    try {
      const cv = document.createElement('canvas');
      cv.width = 16; cv.height = 16;
      drawItem(cv.getContext('2d'), kind, pal);
      return cv.toDataURL();
    } catch (e) { return ''; }
  };
  // ===== 像素云（30×10 · 个人中心舞台背景装饰）=====
  window.__rpg99CloudUrl = function () {
    try {
      const cv = document.createElement('canvas');
      cv.width = 30; cv.height = 10;
      const ctx = cv.getContext('2d');
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      R(4, 4, 22, 5, '#fff'); R(9, 1, 10, 4, '#fff'); R(7, 2, 6, 2, '#fff'); R(2, 6, 26, 3, '#fff');
      R(4, 8, 22, 1, '#fecaca');
      return cv.toDataURL();
    } catch (e) { return ''; }
  };
  // 全局动画 keyframes（宝箱弹出/抖动——modal 在 .rpg99 作用域之外也要能用）
  try {
    const st = document.createElement('style');
    st.textContent =
      '@keyframes rpg99chestpop{0%{transform:scale(.4) rotate(-6deg);opacity:0}60%{transform:scale(1.12) rotate(2deg)}100%{transform:scale(1) rotate(0)}}'
      + '@keyframes rpg99chestshake{0%,100%{transform:rotate(0)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}'
      + '@keyframes rpg99float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}';
    document.head.appendChild(st);
  } catch (e) {}
})();

Object.assign(App, {
  // ===== RPG 存档（只增不减 · 幂等守卫）=====
  _rpg99Key: 'one-xing-rpg99-v1',
  _rpg99Data() {
    try {
      const raw = localStorage.getItem(this._rpg99Key);
      if (raw) return Object.assign({ exp: 0, habitBase: {}, streakB: {}, mile: {}, dayCnt: {}, recDays: {}, recMile: {}, quests: {}, gear: {} }, JSON.parse(raw));
    } catch (e) {}
    return { exp: 0, habitBase: {}, streakB: {}, mile: {}, dayCnt: {}, recDays: {}, recMile: {}, quests: {}, gear: {} };
  },
  _rpg99Save(r) { try { localStorage.setItem(this._rpg99Key, JSON.stringify(r)); } catch (e) {} },

  // ===== 等级 / 属性（1-30 级 · 到达阈值自动升级）=====
  // 1→10 每级 100 经验 · 10→20 每级 200 · 20→30 每级 300（满级 30）
  _rpg99Level(exp) {
    let lv = 1, remain = Math.max(0, +exp || 0);
    while (lv < 30) {
      const need = lv < 10 ? 100 : (lv < 20 ? 200 : 300);
      if (remain >= need) { remain -= need; lv++; } else break;
    }
    return lv;
  },
  // 当前级内进度 { cur, need, pct }（满级返回满）
  _rpg99ExpProg(exp) {
    let lv = 1, remain = Math.max(0, +exp || 0);
    while (lv < 30) {
      const need = lv < 10 ? 100 : (lv < 20 ? 200 : 300);
      if (remain >= need) { remain -= need; lv++; } else return { lv, cur: remain, need, pct: Math.round(remain / need * 100) };
    }
    return { lv: 30, cur: 300, need: 300, pct: 100 };
  },
  // 属性：基础 5 · 每升 1 级 +1（1-10 级）/ +3（10-20 级）/ +5（20-30 级）
  _rpg99Attrs(lv) {
    const ups = Math.max(0, (lv || 1) - 1);
    const a = Math.min(ups, 9);                          // 1→10 区间升级次数
    const b = Math.max(0, Math.min(ups - 9, 10));        // 10→20 区间
    const c = Math.max(0, Math.min(ups - 19, 10));       // 20→30 区间
    const add = a * 1 + b * 3 + c * 5;
    return { hp: 5 + add, atk: 5 + add, def: 5 + add };
  },
  _rpg99RankName(lv) {
    if (lv >= 30) return '独行传说';
    if (lv >= 25) return '独行宗师';
    if (lv >= 20) return '独行豪侠';
    if (lv >= 15) return '独行行者';
    if (lv >= 10) return '独行剑客';
    if (lv >= 5) return '独行学徒';
    return '独行新人';
  },

  // ===== 当日打卡项（习惯卡 + 消费记录条目）=====
  _rpg99LedgerN(dk) {
    try {
      return (Store.getLedger() || []).filter(e => e && e.date === dk && e.type !== 'income').length;
    } catch (e) { return 0; }
  },
  _rpg99HabitCards(dk) {
    const out = [];
    try {
      (CONFIG.habitCards || []).forEach(c => { if (this._rpg99Touched(dk, c.id)) out.push(c.id); });
    } catch (e) {}
    return out;
  },
  _rpg99Touched(dk, cardId) { // 宽口径：有任意记录即算（复用宠物口径）
    try {
      const v = ((Store.getHabit99().days || {})[dk] || {})[cardId];
      return Array.isArray(v) ? v.length > 0 : !!v;
    } catch (e) { return false; }
  },
  _rpg99PrevDk(dk) {
    const d = new Date(dk + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  // 严口径连续（复用宠物 _pet99StreakDone / _pet99StreakAt 的判定标准）
  _rpg99StreakAt(dk, cardId) {
    try { return this._pet99StreakAt ? this._pet99StreakAt(dk, cardId) : 0; } catch (e) { return 0; }
  },

  // ===== 经验结算引擎（幂等 · 近 60 天扫描 · 打卡/记账后随 render_workbench 自动触发）=====
  rpg99Sync() {
    if (this._dev99) return { gained: 0, gems: 0 }; // 沙箱态不结算
    try {
      const r = this._rpg99Data();
      const today = Store.today();
      const lv0 = this._rpg99Level(r.exp);
      let gained = 0, gems = 0;
      const notes = [];
      const dates = [];
      for (let i = 60; i >= 0; i--) dates.push(this._hb99DkOff(-i));
      dates.forEach(dk => {
        if (dk > today) return;
        // ① 基础经验：每日每个已打卡习惯卡 +1 · 每条消费记录 +1
        r.habitBase[dk] = r.habitBase[dk] || {};
        this._rpg99HabitCards(dk).forEach(cid => {
          if (!r.habitBase[dk][cid]) { r.habitBase[dk][cid] = 1; gained += 1; }
        });
        const ledN = this._rpg99LedgerN(dk);
        if (ledN > 0 && !r.habitBase[dk]['_led']) { r.habitBase[dk]['_led'] = ledN; gained += ledN; }
        else if (ledN > (r.habitBase[dk]['_led'] || 0)) { gained += ledN - (r.habitBase[dk]['_led'] || 0); r.habitBase[dk]['_led'] = ledN; }
        // ② 连续经验：同一习惯从第 2 天起每天额外 +1；连续 7/15/30/60/100 天再额外 +同额
        (CONFIG.habitCards || []).forEach(c => {
          if (c.noStreak) return;
          if (!this._rpg99Touched(dk, c.id)) return;
          const s = this._rpg99StreakAt(dk, c.id);
          if (s >= 2) {
            r.streakB[c.id] = r.streakB[c.id] || {};
            if (!r.streakB[c.id][dk]) { r.streakB[c.id][dk] = 1; gained += 1; }
          }
          [7, 15, 30, 60, 100].forEach(m => {
            if (s === m) {
              r.mile[c.id] = r.mile[c.id] || {};
              if (!r.mile[c.id][m]) { r.mile[c.id][m] = dk; gained += m; notes.push(`${c.name} 连续 ${m} 天 +${m}`); }
            }
          });
        });
        // ③ 当日总量：累计 15 个 → +3 经验 +1 宝石；累计 30 个 → +6 经验 +2 宝石
        const n = this._rpg99HabitCards(dk).length + this._rpg99LedgerN(dk);
        r.dayCnt[dk] = r.dayCnt[dk] || {};
        if (n >= 15 && !r.dayCnt[dk].b15) { r.dayCnt[dk].b15 = 1; gained += 3; gems += 1; notes.push('当日打卡 15 个 +3经验 +1宝石'); }
        if (n >= 30 && !r.dayCnt[dk].b30) { r.dayCnt[dk].b30 = 1; gained += 6; gems += 2; notes.push('当日打卡 30 个 +6经验 +2宝石'); }
        // ⑤ 记录连续里程碑（recDays 由阿福审核通过后标记）
        const rs = this._rpg99RecStreak(dk, r);
        [7, 15, 30, 60, 100].forEach(m => {
          if (rs === m && !r.recMile[m]) { r.recMile[m] = dk; gained += m; notes.push(`记录连续 ${m} 天 +${m}`); }
        });
      });
      r.exp += gained;
      // 宝石发放（沿用宠物钱包 points · v12.9.31 更名宝石）
      if (gems > 0 && this._pet99Data) {
        const p = this._pet99Data();
        p.points += gems;
        this._pet99Save(p);
      }
      this._rpg99Save(r);
      // 升级检测
      const lv1 = this._rpg99Level(r.exp);
      if (gained > 0) this._flash(`⚔️ 独行信条：经验 +${gained}${gems ? ` · 宝石 +${gems}` : ''}${notes.length ? '（' + notes.slice(0, 2).join('；') + (notes.length > 2 ? '…' : '') + '）' : ''}`);
      if (lv1 > lv0) {
        const at = this._rpg99Attrs(lv1);
        this._flash(`🎊 升级！独行等级 Lv.${lv1} ${this._rpg99RankName(lv1)} —— 生命/攻击/防御全部提升至 ${at.hp} 点`);
      }
      return { gained, gems };
    } catch (e) { return { gained: 0, gems: 0 }; }
  },
  // 记录连续天数（含 dk 当日 · recDays 标记日）
  _rpg99RecStreak(dk, r) {
    let s = 0, cur = dk;
    for (let i = 0; i < 400; i++) {
      if (r.recDays[cur]) { s++; cur = this._rpg99PrevDk(cur); } else break;
    }
    return s;
  },

  // ===== 记录奖励（阿福审核 → 经验 + 宝石 → 标记 recDays）=====
  // 返回 true=已受理（奖励到账或今日已发），false=未达标（不阻断保存，只不发奖励）
  async rpg99RecAward(text, catName) {
    if (this._dev99) return false;
    const today = Store.today();
    const r = this._rpg99Data();
    if (r.recDays[today]) { this._flash('⚔️ 今天的记录经验已发过啦——明天继续'); return true; }
    // 本地门槛：≥100 字
    if (!text || text.length < 100) { this._flash(`📝 记录已保存（经验未到账：${catName}分类的奖励需 ≥100 字，本次 ${text ? text.length : 0} 字）`); return false; }
    // 阿福审核（LLM 判定符合主题 + 逻辑通畅）
    const verdict = await this._rpg99RecReview(text, catName);
    if (verdict === 'ok') {
      r.exp += 1;
      r.recDays[today] = 1;
      // 连续里程碑（次日结算也行，这里即时更爽快）
      const rs = this._rpg99RecStreak(today, r);
      let bonus = 0;
      [7, 15, 30, 60, 100].forEach(m => { if (rs === m && !r.recMile[m]) { r.recMile[m] = today; bonus += m; } });
      r.exp += bonus;
      this._rpg99Save(r);
      let gemN = 1;
      if (this._pet99Data) { const p = this._pet99Data(); p.points += gemN; this._pet99Save(p); }
      this._flash(`⚔️ 独行信条：阿福审核通过——经验 +${1 + bonus} · 宝石 +${gemN}${bonus ? `（记录连续奖励 +${bonus}）` : ''}`);
      const lv0 = this._rpg99Level(r.exp - 1 - bonus);
      const lv1 = this._rpg99Level(r.exp);
      if (lv1 > lv0) this._flash(`🎊 升级！独行等级 Lv.${lv1} ${this._rpg99RankName(lv1)}`);
      return true;
    }
    this._flash('📝 记录已保存（阿福觉得内容与「' + catName + '」主题不太相符或未认真书写——经验未到账，认真写满一段就好啦）');
    return false;
  },
  // 阿福 LLM 审核：符合分类主题 + 内容逻辑通畅（非胡编乱造凑字）
  async _rpg99RecReview(text, catName) {
    try {
      const st = this._afuAIState ? this._afuAIState() : { ok: false };
      if (!st.ok) return 'len-only'; // AI 未配置：字数达标即放行（不因 AI 缺席卡死奖励）
      const cfg = st.cfg;
      const THEME = {
        '灵光': '憧憬念头、想做的事、想学的东西、想去的远方（不需要完成）',
        '憾潮': '后悔的事、遗憾与反思',
        '拾梦': '梦境内容、醒来速记',
        '足迹': '旅行见闻、路上发生的事',
        '日记': '当日生活记录',
        '铭记': '人生大事、重要时刻',
        '漂流': '烦恼与坏情绪、想交给海的心事',
        '读感': '读书感想、阅读体会',
      };
      const sys = '你是「一人行」App 的记录审核员。判断用户提交的记录是否符合「' + (catName || '记录') + '」分组的主题（' + (THEME[catName] || '生活记录') + '），且内容逻辑通畅、认真书写（不是乱码、不是凑字、不是胡编乱造）。只回复 JSON：{"ok":true} 或 {"ok":false}，不要有多余文字。';
      const isWorker = cfg.mode === 'worker';
      const headers = { 'Content-Type': 'application/json' };
      if (!isWorker) headers['Authorization'] = 'Bearer ' + cfg.key;
      const url = isWorker ? this._afuAIEndpoint(cfg) : cfg.base.replace(/\/+$/, '') + '/chat/completions';
      const res = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({
          model: isWorker ? 'glm-4-flash' : (cfg.model || 'deepseek-chat'),
          messages: [{ role: 'system', content: sys }, { role: 'user', content: text.slice(0, 600) }],
          temperature: 0.1, max_tokens: 30,
        }),
      });
      const j = await res.json().catch(() => ({}));
      const reply = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      try { const v = JSON.parse(reply.match(/\{[\s\S]*\}/)[0]); return v.ok ? 'ok' : 'no'; } catch (e) {}
      return /true/i.test(reply) ? 'ok' : 'no';
    } catch (e) { return 'len-only'; } // 网络/AI 异常：字数达标即放行（宽容降级）
  },

  // ===== v12.9.31c 每日独行任务卡（每日 5 张 · 确定性生成 · 层叠卡堆 · 横滑浏览 + 长按检验）=====
  // 类型：grow 成长（运动/学习 · 内容具体到某一个行为）/ quit 戒（正心）/ life 生活（少数）
  // 分布：3 成长 + 1~2 戒 + 0~1 生活（按日期种子确定性变化）；同一天内内容稳定，次日自动刷新
  // 数据共享：当日任务写入 rpg99 存档（quests 域）——阿福的系统提示词会读取（68-focus-notes.js）
  _rpg99QuestPool() {
    return {
      grow: [
        { t: '练腹 15 分钟', d: '卷腹/反向卷腹/蹬车，每组间休息 30 秒' },
        { t: '做 20 个仰卧起坐', d: '分 2 组完成，动作标准比数量重要' },
        { t: '深蹲 30 个', d: '脚尖朝前、膝盖对齐脚尖，可分组完成' },
        { t: '平板支撑 90 秒', d: '肘撑于肩正下方，核心收紧不塌腰' },
        { t: '跳绳 500 个', d: '可分 5 组 × 100 个，间歇 30 秒' },
        { t: '俯卧撑 20 个', d: '可跪姿降阶，胸口尽量贴近地面' },
        { t: '开合跳 100 个', d: '分 4 组 × 25 个，落地轻缓护膝盖' },
        { t: '靠墙静蹲 60 秒', d: '大腿与地面平行，膝盖不超过脚尖' },
        { t: '弓步蹲 左右各 15 个', d: '后腿膝盖接近地面即算一次' },
        { t: '高抬腿 60 秒', d: '原地快速交替，大腿抬至水平' },
        { t: '背 20 个英语单词', d: '用词根/例句记忆，睡前再过一遍' },
        { t: '精读 1 篇短文并做笔记', d: '摘 3 个好句 + 1 个观点' },
        { t: '做 10 道数学题', d: '错题当场弄懂，不留到明天' },
        { t: '复习错题 15 分钟', d: '只看错因与思路，不重抄题干' },
        { t: '练字 20 分钟', d: '一笔一画写慢一点，求准不求快' },
        { t: '默写 1 篇古诗文', d: '先默写再对照原文标出错字' },
        { t: '刷 1 组考证题（30 题）', d: '限时完成，正确率 ≥80% 为过关' },
        { t: '阅读 30 页书', d: '随手划线，读完写 3 行小结' },
      ],
      quit: [
        { t: '今日不喝奶茶', d: '想喝时先喝一大杯温水' },
        { t: '今日不喝含糖饮料', d: '气泡水/柠檬水都是好替身' },
        { t: '短视频累计不超 30 分钟', d: '刷之前定好闹钟，铃响即停' },
        { t: '23:00 前放下手机入睡', d: '手机放远一点，明早再聊' },
        { t: '今日不点外卖', d: '自己做 / 食堂 / 便利店现食' },
        { t: '今日不冲动消费', d: '想买的东西先进购物车放 24 小时' },
        { t: '游戏累计不超 1 小时', d: '开局前定好收手时间' },
        { t: '今日不跷二郎腿', d: '脚平放地面，腰背自然直立' },
      ],
      life: [
        { t: '收拾书桌 10 分钟', d: '桌面清空，只留正在用的东西' },
        { t: '给绿植浇一次水', d: '看看叶子，顺便擦一擦灰' },
        { t: '晒一次被子', d: '睡前收回来，带着阳光味入睡' },
        { t: '整理衣柜一角', d: '只整理一格，10 分钟就够' },
        { t: '擦一遍桌面和键盘', d: '湿巾一擦，桌面焕然一新' },
        { t: '出门散步 15 分钟', d: '不带耳机也行，让脑子放空' },
      ],
    };
  },
  // 以日期为种子的确定性伪随机（同一天刷新内容不变 · 阿福与用户看到同一副牌）
  _rpg99SeedRand(dk) {
    let h = 0;
    for (const ch of String(dk)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  },
  // 每日 5 张任务（确定性）：3 grow + 1~2 quit + 0~1 life（抽后移除，保证 5 张不重复）
  _rpg99QuestsGen(dk) {
    const rnd = this._rpg99SeedRand(dk);
    const pool = this._rpg99QuestPool();
    const take = (arr) => arr.splice(Math.floor(rnd() * arr.length), 1)[0]; // 抽一张并从池中移除
    const mix = Math.floor(rnd() * 3); // 0：3+1+1 · 1：3+2 · 2：3+2（life 并入次日再说）
    let cats = ['grow', 'grow', 'grow'];
    if (mix === 0) cats.push('quit', 'life');
    else cats.push('quit', 'quit');
    const pools = { grow: pool.grow.slice(), quit: pool.quit.slice(), life: pool.life.slice() };
    const out = [];
    cats.forEach(cat => out.push(Object.assign({ cat, id: 'q_' + dk.replace(/-/g, '') + '_' + out.length }, take(pools[cat]))));
    return out;
  },
  // 当日任务完成态（r.quests[dk] = { done: { id: 1 } }）
  _rpg99QuestMark(id) {
    const r = this._rpg99Data();
    const dk = Store.today();
    r.quests = r.quests || {};
    r.quests[dk] = r.quests[dk] || { done: {} };
    r.quests[dk].done[id] = 1;
    this._rpg99Save(r);
  },
  // 当日任务（生成 + 完成态合并 · 阿福系统提示词也读这里）
  _rpg99QuestsToday() {
    try {
      const dk = Store.today();
      const list = this._rpg99QuestsGen(dk);
      const done = (((this._rpg99Data().quests || {})[dk] || {}).done) || {};
      return list.map(q => Object.assign({ done: !!done[q.id] }, q));
    } catch (e) { return []; }
  },
  // ===== v12.9.31c 任务卡交互（两层分离）：=====
  //   横滑 = 随时浏览（任何卡、任何时候都可滑，只是换看下一张，不影响完成状态）
  //   长按 1.5 秒 = 阿福检验时刻（唯一完成途径：回答细节 → LLM 判定 → 通过才标记完成）
  _rpg99PressT: null,
  _rpg99PressX: null,
  _rpg99PressY: null,
  _rpg99PressStart(e) {
    this._rpg99PressEnd();
    this._rpg99PressX = (e && e.clientX) || 0;
    this._rpg99PressY = (e && e.clientY) || 0;
    const top = document.querySelector('.rpg99-card.top');
    if (top) top.classList.add('pressing');
    this._rpg99PressT = setTimeout(() => {
      this._rpg99PressEnd();
      this.rpg99Verify();
    }, 1500);
  },
  // 取消长按（保留拖动跟踪——缓慢横拖也能累计触发滑动）
  _rpg99PressCancel() {
    if (this._rpg99PressT) { clearTimeout(this._rpg99PressT); this._rpg99PressT = null; }
    const top = document.querySelector('.rpg99-card.top');
    if (top) top.classList.remove('pressing');
  },
  _rpg99PressEnd() {
    this._rpg99PressCancel();
    this._rpg99PressX = null;
    this._rpg99PressY = null;
  },
  // 拖动：>10px 取消长按；横向 >56px（且横向明显大于纵向，不误伤竖向滚屏）= 滑动浏览换下一张
  _rpg99PressMove(e) {
    if (this._rpg99PressX == null) return;
    const dx = ((e && e.clientX) || 0) - this._rpg99PressX;
    const dy = ((e && e.clientY) || 0) - this._rpg99PressY;
    if (this._rpg99PressT && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) this._rpg99PressCancel();
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      this._rpg99PressEnd();
      const id = this._rpg99DeckIds()[0];
      if (id) this._rpg99QuestFly(id); // 滑走 = 纯浏览：卡片沉回堆底，随时可再滑回来
    }
  },
  // 卡堆顺序（顶层 = ids[0]；检验/划走都作用于顶层卡）
  _rpg99DeckIds() {
    const list = this._rpg99QuestsToday();
    if (!list.length) return [];
    const byId = {}; list.forEach(q => { byId[q.id] = q; });
    let ids = (this._rpg99DeckOrder && this._rpg99DeckOrder.dk === Store.today() && this._rpg99DeckOrder.ids)
      ? this._rpg99DeckOrder.ids.filter(id => byId[id]) : list.map(q => q.id);
    list.forEach(q => { if (ids.indexOf(q.id) < 0) ids.push(q.id); }); // 兜底补全
    return ids;
  },
  // 检验弹窗：阿福针对任务具体细节提问
  rpg99Verify() {
    const ids = this._rpg99DeckIds();
    if (!ids.length) return;
    const id = ids[0];
    const q = this._rpg99QuestsToday().find(x => x.id === id);
    if (!q) return;
    if (q.done) { this._rpg99QuestFly(id); return; } // 已验证的卡：直接划走换下一张
    // 按任务类型出题（具体到只有真正做过才答得上的细节）
    const QS = {
      grow: [
        `「${q.t}」刚做完是什么感觉？说一个只有真正做过才知道的细节（组数 / 页数 / 时长 / 身体感受都行）`,
        `你刚完成了「${q.t}」？过程里哪一步最累 / 最难？说个具体细节`,
      ],
      quit: [
        `今天忍住「${q.t}」了吗？哪个时刻最想破戒，你是怎么扛过去的？`,
        `「${q.t}」坚持到现在的感觉如何？说说今天具体是怎么做到的`,
      ],
      life: [
        `「${q.t}」完成得怎么样？说说过程中的一个小细节（整理了哪里 / 浇了几盆 / 走了多远）`,
        `「${q.t}」做完之后有什么不一样？描述一个具体的场景`,
      ],
    };
    const pool = QS[q.cat] || QS.life;
    const question = pool[Math.floor(Math.random() * pool.length)];
    this._rpg99Verifying = { id, t: q.t, d: q.d, cat: q.cat };
    const afu = this._afu99AvatarHtml ? this._afu99AvatarHtml(17, 'pxafu-inline') : '🤵';
    this._modal('🔍 阿福检验时刻', `
      <style>
        .rpg99v-q{display:flex;gap:8px;align-items:flex-start;font-size:13px;font-weight:800;color:#7f1d1d;line-height:1.8;margin-bottom:10px}
        .rpg99v-task{font-size:11px;color:#b91c1c;border:2px dashed #fecaca;background:#fff1f2;padding:6px 10px;margin-bottom:10px;line-height:1.6}
        .rpg99v textarea{width:100%;min-height:88px;border:3px solid #7f1d1d;background:#fff;padding:10px;font-size:13px;
          font-family:inherit;line-height:1.7;resize:vertical;border-radius:0;box-sizing:border-box}
        .rpg99v-btns{display:flex;gap:10px;margin-top:12px}
        .rpg99v-btns .btn{flex:1;border-radius:0!important;border:2px solid #7f1d1d!important;box-shadow:3px 3px 0 0 rgba(127,29,29,.3)!important}
        .rpg99v-hint{font-size:10.5px;color:#b91c1c;margin-top:8px;line-height:1.6}
      </style>
      <div class="rpg99v">
        <div class="rpg99v-task">今日任务 · ${this.esc(q.t)}<br><span style="color:#9f1239">${this.esc(q.d)}</span></div>
        <div class="rpg99v-q">${afu}<span>${question}</span></div>
        <textarea id="rpg99vAns" placeholder="如实回答阿福的问题……"></textarea>
        <div class="rpg99v-btns">
          <button class="btn btn-ghost" onclick="App._closeModal()">取消</button>
          <button class="btn btn-primary" onclick="App.rpg99VerifySubmit()">提交回答</button>
        </div>
        <div class="rpg99v-hint">阿福会结合回答推断你是否真的完成——只有检验通过，任务才算成功，宝箱次数 +1</div>
      </div>`);
    try { const el = document.getElementById('rpg99vAns'); if (el) el.focus(); } catch (e) {}
  },
  async rpg99VerifySubmit() {
    const v = this._rpg99Verifying;
    if (!v) { this._closeModal(); return; }
    const el = document.getElementById('rpg99vAns');
    const ans = ((el && el.value) || '').trim();
    if (!ans) { this._flash('先回答阿福的问题哦——这是检验时刻'); return; }
    if (this._dev99) { // 沙箱：字数达标即过（不调 AI）
      if (ans.length >= 10) { this._rpg99QuestMark(v.id); this._closeModal(); this._flash('✅ 阿福检验通过——任务完成，宝箱可开 +1'); this._rpg99QuestFly(v.id); }
      else this._flash('回答太简短啦——再具体一点');
      return;
    }
    const verdict = await this._rpg99VerifyJudge(v, ans);
    if (verdict === 'ok') {
      this._rpg99QuestMark(v.id);
      this._closeModal();
      this._flash('✅ 阿福检验通过——任务完成，宝箱可开 +1');
      this._rpg99QuestFly(v.id);
    } else if (verdict === 'len-only') { // AI 未配置：信任门槛（≥10 字）
      if (ans.length >= 10) {
        this._rpg99QuestMark(v.id);
        this._closeModal();
        this._flash('✅ 已记录（未配置阿福AI，按信任通过）——宝箱可开 +1');
        this._rpg99QuestFly(v.id);
      } else {
        this._flash('阿福觉得回答太简短啦——再具体一点点');
      }
    } else {
      this._flash('🤵 阿福觉得这个回答还不足以证明任务完成——认真做完再来检验吧');
    }
  },
  // LLM 判定：结合回答推断是否真的完成（与记录审核同一套 AI 通道）
  async _rpg99VerifyJudge(v, ans) {
    try {
      const st = this._afuAIState ? this._afuAIState() : { ok: false };
      if (!st.ok) return 'len-only';
      const cfg = st.cfg;
      const CATN = { grow: '成长（运动/学习）', quit: '戒（正心）', life: '生活' };
      const sys = '你是「一人行」App 的管家阿福，正在主持【阿福检验时刻】。用户长按了今日独行任务卡，声称完成了任务。'
        + '任务：「' + v.t + '」（要求：' + v.d + '）。类别：' + (CATN[v.cat] || '任务') + '。'
        + '请根据用户的回答判断他是否真的完成了这个任务——回答要具体可信、与任务相关；含糊敷衍、明显编造或答非所问则不通过。'
        + '只回复 JSON：{"ok":true} 或 {"ok":false}，不要有多余文字。';
      const isWorker = cfg.mode === 'worker';
      const headers = { 'Content-Type': 'application/json' };
      if (!isWorker) headers['Authorization'] = 'Bearer ' + cfg.key;
      const url = isWorker ? this._afuAIEndpoint(cfg) : cfg.base.replace(/\/+$/, '') + '/chat/completions';
      const res = await fetch(url, {
        method: 'POST', headers,
        body: JSON.stringify({
          model: isWorker ? 'glm-4-flash' : (cfg.model || 'deepseek-chat'),
          messages: [{ role: 'system', content: sys }, { role: 'user', content: ans.slice(0, 600) }],
          temperature: 0.1, max_tokens: 30,
        }),
      });
      const j = await res.json().catch(() => ({}));
      const reply = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      try { const x = JSON.parse(reply.match(/\{[\s\S]*\}/)[0]); return x.ok ? 'ok' : 'no'; } catch (e) {}
      return /true/i.test(reply) ? 'ok' : 'no';
    } catch (e) { return 'len-only'; } // 网络/AI 异常：信任降级
  },
  // 划走动画：顶层卡飞出淡出 → 移到堆底 → 重渲染（下一张内容露出）
  _rpg99QuestFly(id) {
    const deckEl = document.querySelector('.rpg99-deck');
    const top = deckEl ? deckEl.querySelector('.rpg99-card.top') : null;
    const done = () => {
      this._rpg99DeckOrder = this._rpg99DeckRotate(id);
      try { this.render_workbench(); } catch (e) {}
    };
    if (top) {
      top.classList.add('fly');
      setTimeout(done, 460);
    } else done();
  },
  // 堆序轮转（内存态 · 同日内有效；渲染顺序 = 生成顺序 + 已划走的沉底）
  _rpg99DeckOrder: null,
  _rpg99DeckRotate(flyId) {
    const list = this._rpg99QuestsToday();
    const order = (this._rpg99DeckOrder && this._rpg99DeckOrder.dk === Store.today() && this._rpg99DeckOrder.ids)
      ? this._rpg99DeckOrder.ids.slice() : list.map(q => q.id);
    const i = order.indexOf(flyId);
    if (i >= 0) order.push(order.splice(i, 1)[0]);
    return { dk: Store.today(), ids: order };
  },

  // ===== v12.9.31 装备系统（武器+攻击 / 防具+防御 / 饰品+生命 · 每类 5 件商品 + 基础款）=====
  // 来源：像素宝箱随机掉落（10%）+ 宝石商店购买；开出/买到更强即自动换装，像素战士配色随装备变化
  _rpg99RAR() { return [['凡品', '#9ca3af'], ['精良', '#2563eb'], ['稀有', '#7c3aed'], ['上乘', '#ea580c'], ['史诗', '#dc2626'], ['传说', '#ca8a04']]; },
  _rpg99GearPool() {
    return {
      w: [ // 武器（攻击 +）
        { id: 'w0', n: '普通小刃', atk: 0, rar: 0, price: 0, pal: {} },
        { id: 'w1', n: '铁短剑', atk: 1, rar: 1, price: 30, pal: { w: { blade: '#cbd5e1', hi: '#f1f5f9', D: '#94a3b8', guard: '#64748b', hilt: '#78350f' } } },
        { id: 'w2', n: '精钢长剑', atk: 2, rar: 2, price: 60, pal: { w: { blade: '#a5b4fc', hi: '#e0e7ff', D: '#6366f1', guard: '#4f46e5', hilt: '#3730a3' } } },
        { id: 'w3', n: '绯红之刃', atk: 3, rar: 3, price: 120, pal: { w: { blade: '#f87171', hi: '#fecaca', D: '#dc2626', guard: '#b91c1c', hilt: '#7f1d1d' } } },
        { id: 'w4', n: '烈焰魔剑', atk: 4, rar: 4, price: 200, pal: { w: { blade: '#fb923c', hi: '#fed7aa', D: '#ea580c', guard: '#c2410c', hilt: '#7c2d12' } } },
        { id: 'w5', n: '曜金龙刃', atk: 5, rar: 5, price: 350, pal: { w: { blade: '#fde047', hi: '#fef9c3', D: '#eab308', guard: '#a16207', hilt: '#78350f' } } },
      ],
      a: [ // 防具（防御 +）
        { id: 'a0', n: '粗布背心', def: 0, rar: 0, price: 0, pal: {} },
        { id: 'a1', n: '皮质护胸', def: 1, rar: 1, price: 30, pal: { v: { v: '#a8a29e', hi: '#d6d3d1', D: '#78716c' } } },
        { id: 'a2', n: '锁子甲', def: 2, rar: 2, price: 60, pal: { v: { v: '#94a3b8', hi: '#e2e8f0', D: '#64748b' } } },
        { id: 'a3', n: '赤铜胸铠', def: 3, rar: 3, price: 120, pal: { v: { v: '#c2410c', hi: '#fdba74', D: '#9a3412' } } },
        { id: 'a4', n: '龙鳞战铠', def: 4, rar: 4, price: 200, pal: { v: { v: '#059669', hi: '#6ee7b7', D: '#047857' } } },
        { id: 'a5', n: '圣殿白铠', def: 5, rar: 5, price: 350, pal: { v: { v: '#fef08a', hi: '#fffbeb', D: '#eab308' } } },
      ],
      t: [ // 饰品（生命 +）
        { id: 't0', n: '草帽', hp: 0, rar: 0, price: 0, pal: {} },
        { id: 't1', n: '忍者头巾', hp: 1, rar: 1, price: 30, pal: { t: { y: '#475569', yl: '#64748b', yd: '#334155', band: '#ef4444' } } },
        { id: 't2', n: '精铁战盔', hp: 2, rar: 2, price: 60, pal: { t: { y: '#94a3b8', yl: '#cbd5e1', yd: '#64748b', band: '#dc2626' } } },
        { id: 't3', n: '赤铁重盔', hp: 3, rar: 3, price: 120, pal: { t: { y: '#dc2626', yl: '#f87171', yd: '#991b1b', band: '#facc15' } } },
        { id: 't4', n: '秘银法冠', hp: 4, rar: 4, price: 200, pal: { t: { y: '#e0e7ff', yl: '#f8fafc', yd: '#a5b4fc', band: '#f472b6' } } },
        { id: 't5', n: '曜金圣冠', hp: 5, rar: 5, price: 350, pal: { t: { y: '#fde047', yl: '#fef9c3', yd: '#eab308', band: '#dc2626' } } },
      ],
    };
  },
  // 当前装备（缺省=基础款）
  _rpg99GearOf(r) {
    const pool = this._rpg99GearPool();
    const g = ((r || this._rpg99Data()).gear) || {};
    const find = (slot) => pool[slot].find(x => x.id === g[slot]) || pool[slot][0];
    return { w: find('w'), a: find('a'), t: find('t') };
  },
  _rpg99GearStat(slot, it) { return slot === 'w' ? (it.atk || 0) : slot === 'a' ? (it.def || 0) : (it.hp || 0); },
  _rpg99GearBonus(r) {
    const g = this._rpg99GearOf(r);
    return { atk: g.w.atk || 0, def: g.a.def || 0, hp: g.t.hp || 0 };
  },
  // 自动换装（严格更强才换）
  _rpg99GearEquipBetter(r, slot, item) {
    r.gear = r.gear || {};
    const pool = this._rpg99GearPool();
    const cur = pool[slot].find(x => x.id === r.gear[slot]) || pool[slot][0];
    const better = this._rpg99GearStat(slot, item) > this._rpg99GearStat(slot, cur);
    if (better) r.gear[slot] = item.id;
    return better;
  },

  // ===== v12.9.31 像素宝箱（每完成 1 个每日任务开 1 次 · 2 秒金光开启动画 → 弹出奖励图案）=====
  // 掉落：70% 经验 1-3 点 · 20% 宝石 1-3 个 · 10% 随机武器/防具/饰品
  _rpg99ChestAvail() {
    const r = this._rpg99Data();
    const q = ((r.quests || {})[Store.today()]) || {};
    return Math.max(0, Object.keys(q.done || {}).length - (q.opened || 0));
  },
  rpg99ChestOpen() {
    if (this._dev99) { this._flash('📦 沙箱模式不开宝箱'); return; }
    if (this._rpg99ChestAvail() <= 0) { this._flash('📦 先去完成今日的独行任务——每完成 1 个任务，就能开 1 次宝箱'); return; }
    const r = this._rpg99Data();
    const dk = Store.today();
    r.quests = r.quests || {}; r.quests[dk] = r.quests[dk] || { done: {} };
    r.quests[dk].opened = (r.quests[dk].opened || 0) + 1;
    // 掷骰掉落：70% 经验 1-3 · 20% 宝石 1-3 · 10% 随机装备
    const roll = Math.random();
    let reward;
    if (roll < 0.10) {
      const pool = this._rpg99GearPool();
      const slot = ['w', 'a', 't'][Math.floor(Math.random() * 3)];
      const list = pool[slot].slice(1); // 基础款不掉落
      const item = list[Math.floor(Math.random() * list.length)];
      r.gearOwn = r.gearOwn || {};
      r.gearOwn[item.id] = 1;
      const better = this._rpg99GearEquipBetter(r, slot, item);
      reward = { kind: 'gear', slot, item, better };
    } else if (roll < 0.30) {
      reward = { kind: 'gem', n: 1 + Math.floor(Math.random() * 3) };
      if (this._pet99Data) { const p = this._pet99Data(); p.points += reward.n; this._pet99Save(p); }
    } else {
      reward = { kind: 'exp', n: 1 + Math.floor(Math.random() * 3) };
    }
    const lv0 = this._rpg99Level(r.exp);
    if (reward.kind === 'exp') r.exp += reward.n;
    this._rpg99Save(r);
    const lv1 = this._rpg99Level(r.exp);
    this._rpg99ChestModal(reward);
    if (lv1 > lv0) setTimeout(() => this._flash(`🎊 升级！独行等级 Lv.${lv1} ${this._rpg99RankName(lv1)}`), 2400);
    setTimeout(() => { try { this.render_workbench(); } catch (e) {} }, 2500);
  },
  // 开箱动画 modal：0-0.8s 抖动 → 0.82s 开盖 → 金光 + 像素火花 2 秒 → 奖励图案弹出
  _rpg99ChestModal(reward) {
    const chest = (o) => (window.__rpg99ChestUrl ? window.__rpg99ChestUrl(o) : '');
    const itemUrl = (k, p) => (window.__rpg99ItemUrl ? window.__rpg99ItemUrl(k, p) : '');
    let icon = '', line = '', sub = '';
    if (reward.kind === 'gem') {
      icon = itemUrl('gem');
      line = `💎 宝石 +${reward.n}`;
      sub = '已存入宝石钱包——宝石很珍贵，家园与宠物也要用它哦';
    } else if (reward.kind === 'exp') {
      icon = itemUrl('exp');
      line = `⭐ 经验值 +${reward.n}`;
      sub = '每一点小坚持，都在让战士变强';
    } else {
      const RAR = this._rpg99RAR();
      const rn = RAR[reward.item.rar] || RAR[0];
      const SN = { w: '攻击', a: '防御', t: '生命' }[reward.slot];
      icon = itemUrl(reward.slot, reward.item.pal);
      line = `获得【${reward.item.n}】`;
      sub = `<span style="color:${rn[1]};font-weight:900">${rn[0]}</span> · ${SN} +${this._rpg99GearStat(reward.slot, reward.item)}${reward.better ? ' —— 已自动换装，战士形象更新' : ' —— 当前装备更强，先珍藏起来'}`;
    }
    this._modal('📦 独行宝箱', `
      <style>
        .rpg99c-stage{position:relative;height:200px;overflow:hidden;border:3px solid #dc2626;margin-bottom:12px;
          background:linear-gradient(180deg,#fff1f2,#ffe4e6 60%,#fecdd3)}
        .rpg99c-chest{position:absolute;left:50%;bottom:16px;width:136px;height:111px;margin-left:-68px;image-rendering:pixelated;background-size:100% 100%;background-repeat:no-repeat}
        .rpg99c-chest.closed{animation:rpg99chestshake .13s linear 6, rpg99c-fade .1s linear .8s forwards}
        .rpg99c-chest.open{opacity:0;animation:rpg99c-openin .22s ease-out .82s forwards}
        .rpg99c-light{position:absolute;left:50%;bottom:86px;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;opacity:0;
          background:radial-gradient(circle,#fffbeb 0%,#fde047 45%,rgba(253,224,71,0) 72%);animation:rpg99c-light 1.15s ease-out .82s forwards}
        .rpg99c-spark{position:absolute;width:5px;height:5px;background:#fff;opacity:0;animation:rpg99c-spark .55s ease-out .9s forwards}
        .rpg99c-reward{position:absolute;left:50%;bottom:104px;width:78px;height:78px;margin-left:-39px;image-rendering:pixelated;opacity:0;background-size:100% 100%;background-repeat:no-repeat;
          animation:rpg99c-reward .55s cubic-bezier(.2,1.4,.4,1) 2s forwards, rpg99float 1.8s ease-in-out 2.55s infinite}
        .rpg99c-line{opacity:0;animation:rpg99c-txt .4s ease 2.2s forwards;text-align:center;font-size:16px;font-weight:900;color:#7f1d1d}
        .rpg99c-sub{opacity:0;animation:rpg99c-txt .4s ease 2.4s forwards;text-align:center;font-size:12px;color:#b91c1c;margin-top:6px;line-height:1.7}
        @keyframes rpg99c-fade{to{opacity:0}}
        @keyframes rpg99c-openin{0%{opacity:0;transform:scale(.7) translateY(10px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes rpg99c-light{0%{opacity:0;transform:scale(.15)}30%{opacity:.95;transform:scale(3)}100%{opacity:0;transform:scale(6.5)}}
        @keyframes rpg99c-spark{0%{opacity:0;transform:translateY(0)}35%{opacity:1}100%{opacity:0;transform:translateY(-26px)}}
        @keyframes rpg99c-reward{0%{opacity:0;transform:translateY(34px) scale(.25)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes rpg99c-txt{to{opacity:1}}
      </style>
      <div class="rpg99c-stage">
        <div class="rpg99c-light"></div>
        <div class="rpg99c-spark" style="left:32%;bottom:92px"></div>
        <div class="rpg99c-spark" style="left:62%;bottom:112px;width:7px;height:7px;background:#fde047;animation-delay:1.05s"></div>
        <div class="rpg99c-spark" style="left:47%;bottom:134px;animation-delay:1.25s"></div>
        <div class="rpg99c-spark" style="left:68%;bottom:98px;background:#fca5a5;animation-delay:1.45s"></div>
        <div class="rpg99c-spark" style="left:28%;bottom:120px;width:4px;height:4px;animation-delay:1.6s"></div>
        <div class="rpg99c-chest closed" style="background-image:url('${chest(false)}')"></div>
        <div class="rpg99c-chest open" style="background-image:url('${chest(true)}')"></div>
        <div class="rpg99c-reward" style="background-image:url('${icon}')"></div>
      </div>
      <div class="rpg99c-line">${line}</div>
      <div class="rpg99c-sub">${sub}</div>`);
  },

  // ===== v12.9.31 宝石商店（宝箱旁入口 · 花宝石购武器/防具/饰品 · 每类 5 件）=====
  rpg99Shop() { this._rpg99ShopRender(); },
  _rpg99ShopRender() {
    const pool = this._rpg99GearPool();
    const r = this._rpg99Data();
    const gems = (this._pet99Data ? this._pet99Data().points : 0) || 0;
    const own = r.gearOwn = r.gearOwn || {};
    const RAR = this._rpg99RAR();
    const SLOT = { w: ['⚔️ 武器', '攻击'], a: ['🛡️ 防具', '防御'], t: ['👑 饰品', '生命'] };
    const body = ['w', 'a', 't'].map(slot => {
      const items = pool[slot].slice(1); // 基础款为初始装备，不出售
      return `<div style="margin-bottom:16px">
        <div style="font-weight:900;font-size:13px;color:#7f1d1d;margin-bottom:8px;border-bottom:2px dashed #fecaca;padding-bottom:4px">${SLOT[slot][0]}<span style="font-weight:400;color:#b91c1c;font-size:11px;margin-left:6px">加成 ${SLOT[slot][1]}</span></div>
        ${items.map(it => {
          const eq = ((r.gear || {})[slot]) === it.id;
          const has = !!own[it.id];
          const st = this._rpg99GearStat(slot, it);
          const rn = RAR[it.rar] || RAR[0];
          const afford = gems >= it.price;
          const btn = eq
            ? '<span style="font-size:11px;font-weight:900;color:#059669;border:2px solid #10b981;padding:4px 10px;background:#ecfdf5">已装备 ✓</span>'
            : has
              ? `<button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.rpg99GearEquip('${it.id}')">换装</button>`
              : `<button class="btn btn-primary btn-sm" style="margin:0${afford ? '' : ';opacity:.55'}" onclick="App.rpg99GearBuy('${it.id}')">💎 ${it.price}</button>`;
          return `<div style="display:flex;align-items:center;gap:10px;border:2px solid #fecaca;background:linear-gradient(180deg,#fff,#fef2f2);padding:8px 10px;margin-bottom:6px">
            <span style="display:block;width:34px;height:34px;image-rendering:pixelated;flex-shrink:0;background:url('${window.__rpg99ItemUrl ? window.__rpg99ItemUrl(slot, it.pal) : ''}') center/100% 100% no-repeat"></span>
            <div style="flex:1;min-width:0">
              <b style="font-size:12.5px;color:#7f1d1d">${it.n}</b>
              <span style="font-size:10.5px;font-weight:900;color:${rn[1]};margin-left:6px">${rn[0]}</span>
              <div style="font-size:11px;color:#9f1239">${SLOT[slot][1]} +${st}</div>
            </div>
            ${btn}
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
    this._modal('💎 宝石商店', `
      <div style="font-size:12px;color:#b91c1c;line-height:1.7;margin-bottom:10px">
        当前宝石：<b style="color:#dc2626">${gems}</b>——宝石在家园与宠物里同样要消费，每一颗都很珍贵。装备也可由宝箱随机开出（10%）。
      </div>
      ${body}`);
  },
  rpg99GearBuy(id) {
    if (this._dev99) { this._flash('💎 沙箱模式不出售'); return; }
    const pool = this._rpg99GearPool();
    let item = null, slot = '';
    ['w', 'a', 't'].forEach(s => { const f = pool[s].find(x => x.id === id); if (f) { item = f; slot = s; } });
    if (!item) return;
    const r = this._rpg99Data();
    r.gearOwn = r.gearOwn || {};
    if (r.gearOwn[id] || ((r.gear || {})[slot]) === id) { this._flash('已拥有这件装备啦'); this._rpg99ShopRender(); return; }
    let pts = 0;
    if (this._pet99Data) pts = this._pet99Data().points || 0;
    if (pts < item.price) { this._flash(`💎 宝石不足（现有 ${pts} · 需要 ${item.price}）——宝石可由打卡 15/30 个、合格记录与宝箱获得`); this._rpg99ShopRender(); return; }
    if (this._pet99Data) { const p = this._pet99Data(); p.points -= item.price; this._pet99Save(p); }
    r.gearOwn[id] = 1;
    const better = this._rpg99GearEquipBetter(r, slot, item);
    this._rpg99Save(r);
    this._flash(`💎 购入【${item.n}】（宝石 -${item.price}）${better ? '——已换装，战士形象更新' : '——已收藏（当前装备更强，可在商店换装）'}`);
    this._rpg99ShopRender();
    try { this.render_workbench(); } catch (e) {}
  },
  rpg99GearEquip(id) {
    const pool = this._rpg99GearPool();
    let item = null, slot = '';
    ['w', 'a', 't'].forEach(s => { const f = pool[s].find(x => x.id === id); if (f) { item = f; slot = s; } });
    if (!item) return;
    const r = this._rpg99Data();
    r.gear = r.gear || {};
    r.gear[slot] = id;
    this._rpg99Save(r);
    this._flash(`已换装【${item.n}】——战士形象与属性已更新`);
    this._rpg99ShopRender();
    try { this.render_workbench(); } catch (e) {}
  },

  // ===== v12.9.31b 📖 成长指南（个人中心右上角 · 经验/宝石/宝箱/检验获取方法全览）=====
  rpg99Rules() {
    this._modal('📖 独行信条 · 成长指南', `
      <div style="font-size:12.5px;color:#7f1d1d;line-height:2.1">
        <b>🔍 阿福检验时刻（任务完成方式）</b><br>
        · 横滑任务卡 = 随时浏览其他任务（不需要完成，滑走只换下一张看）<br>
        · 长按顶部任务卡 1.5 秒（或点卡上按钮）进入检验——阿福会针对任务的具体细节提问<br>
        · 回答具体可信、通过阿福推断，任务才算完成（完成与浏览互不影响）<br>
        · 每通过 1 个任务，宝箱可开次数 +1<br>
        <b>⭐ 经验值获取</b><br>
        ① 每日每成功打卡一个自律习惯 / 消费记录，经验 +1<br>
        ② 同一习惯连续打卡，从第二天起每天额外经验 +1；连续 7 / 15 / 30 / 60 / 100 天时，再额外奖励同额经验（各一次）<br>
        ③ 当日累计打卡 15 个 → 额外经验 +3 · 宝石 +1；累计 30 个 → 额外经验 +6 · 宝石 +2<br>
        ④ 当日完成 1 次分类记录（灵光 / 憾潮 / 拾梦 / 足迹 / 日记 / 铭记 / 漂流 / 读感）且 ≥100 字、阿福审核通过 → 经验 +1 · 宝石 +1<br>
        ⑤ 记录连续 7 / 15 / 30 / 60 / 100 天 → 额外奖励同额经验（各一次）<br>
        ⑥ 像素宝箱开出：经验 1-3 点（70% 概率）<br>
        <b>💎 宝石获取（很珍贵——家园与宠物都靠它）</b><br>
        · 当日累计打卡 15 / 30 个：宝石 +1 / +2<br>
        · 合格的分类记录（≥100 字且阿福审核通过）：宝石 +1 / 天<br>
        · 像素宝箱开出：宝石 1-3 个（20% 概率）<br>
        <b>📦 像素宝箱掉落</b><br>
        · ⭐ 经验值 1-3 点（70%）· 💎 宝石 1-3 个（20%）· 随机武器 / 防具 / 饰品（10%）<br>
        · 装备也可在【宝石商店】直接购买——武器加攻击 · 防具加防御 · 饰品加生命<br>
        <b>⚔️ 等级与属性</b><br>
        · 1-10 级每 100 经验升 1 级 · 10-20 级每 200 · 20-30 级每 300（满级 30，到达阈值自动升级）<br>
        · 生命 / 攻击 / 防御基础 5 点，每升 1 级 +1（1-10 级）/ +3（10-20 级）/ +5（20-30 级）
      </div>`);
  },

  // ===== 7 天周足迹（点线相连 · 今日红色高光放大）=====
  _rpg99CalHtml() {
    const t = new Date(Store.today() + 'T00:00:00');
    const dow = (t.getDay() + 6) % 7;                                    // 周一=0
    const monday = new Date(t); monday.setDate(t.getDate() - dow);
    const WK = ['一', '二', '三', '四', '五', '六', '日'];
    let cells = '';
    WK.forEach((w, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const dk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const isToday = dk === Store.today();
      const past = dk < Store.today();
      cells += `<div class="rpg99-day${isToday ? ' today' : past ? ' past' : ''}"><i>${w}</i>${d.getDate()}</div>`;
    });
    return `<div class="rpg99-week">
      <span class="rpg99-week-tag">本周足迹 · WEEK</span>
      <div class="rpg99-week-path">${cells}</div>
    </div>`;
  },

  // ===== 任务卡堆 HTML（5 张随机倾角散落 · 横滑随时浏览 · 顶层长按检验）=====
  _rpg99DeckHtml() {
    const list = this._rpg99QuestsToday();
    if (!list.length) return '';
    const byId = {}; list.forEach(q => { byId[q.id] = q; });
    const ids = this._rpg99DeckIds();
    const CAT = { grow: ['成长', '#2563eb'], quit: ['戒', '#dc2626'], life: ['生活', '#16a34a'] };
    const ROT = [-5, 3, -2, 1.5, -1];   // 堆底→堆顶的倾角（真实感散落）
    const TY = [14, 7, 2, 0, 0];
    const cards = ids.map((id, i) => {
      const q = byId[id];
      const [catName, catColor] = CAT[q.cat] || CAT.life;
      const top = i === 0;
      const rot = ROT[4 - i] || 0, ty = TY[4 - i] || 0, z = 5 - i;
      if (top) {
        return `<div class="rpg99-card top${q.done ? ' done' : ''}" data-id="${id}"
          style="transform:rotate(${rot}deg) translateY(${ty}px);z-index:${z}"
          onpointerdown="App._rpg99PressStart(event)" onpointerup="App._rpg99PressEnd()"
          onpointerleave="App._rpg99PressEnd()" onpointercancel="App._rpg99PressEnd()"
          onpointermove="App._rpg99PressMove(event)" oncontextmenu="return false">
          <span class="rpg99-press"><i></i></span>
          ${q.done ? '<div class="rpg99-card-ok">✓ 已通过检验</div>' : ''}
          <div class="rpg99-card-cat" style="background:${catColor}">${catName}${q.cat === 'grow' ? ' · 成长' : ''}</div>
          <div class="rpg99-card-t">${this.esc(q.t)}</div>
          <div class="rpg99-card-d">${this.esc(q.d)}</div>
          <button class="rpg99-swipe" onclick="event.stopPropagation();App.rpg99Verify()">${q.done ? '✓ 已完成 · 横滑看下一张 ➜' : '长按 1.5 秒 · 阿福检验 ➜'}</button>
        </div>`;
      }
      return `<div class="rpg99-card under" data-id="${id}" style="transform:rotate(${rot}deg) translateY(${ty}px);z-index:${z}">
        <div class="rpg99-card-cat" style="background:${catColor}">${catName}</div>
        <div class="rpg99-card-t">${this.esc(q.t)}</div>
      </div>`;
    }).join('');
    const doneN = list.filter(q => q.done).length;
    return `<div class="rpg99-deck-wrap">
      <span class="rpg99-deck-flag">今日 ${doneN} / ${list.length}</span>
      <div class="rpg99-deck">${cards}</div>
      <div class="rpg99-deck-note">横滑卡片随时浏览其他任务（不需要完成）· 长按 1.5 秒开始阿福检验 · 每日 0 点刷新</div>
    </div>`;
  },

  // ===== 像素战士（gender: '男'/'女' · px 显示宽度 · 配色随当前装备实时绘制）=====
  _rpg99HeroPal() {
    const gear = this._rpg99GearOf();
    return {
      w: gear.w && gear.w.pal ? gear.w.pal.w : undefined,
      v: gear.a && gear.a.pal ? gear.a.pal.v : undefined,
      t: gear.t && gear.t.pal ? gear.t.pal.t : undefined,
    };
  },
  _rpg99HeroHtml(px, female) {
    px = px || 96;
    const SZ = window.__rpg99HeroSize || { W: 24, H: 32 };
    const h = Math.round(px * SZ.H / SZ.W);
    const url = window.__rpg99HeroUrl ? window.__rpg99HeroUrl(!!female, this._rpg99HeroPal()) : '';
    if (!url) return '';
    return `<span style="display:inline-block;width:${px}px;height:${h}px;image-rendering:pixelated;background:url(${url}) no-repeat;background-size:100% 100%"></span>`;
  },
  // ===== v12.9.38 3D 战士（体素实体建模 · preserve-3d）：拖拽旋转 / 点击攻击 + 伤害数字 =====
  _rpg99Hero3dHtml(px, female) {
    px = px || 150;
    const SZ = window.__rpg99HeroSize || { W: 24, H: 32 };
    const h = Math.round(px * SZ.H / SZ.W);
    const pal = this._rpg99HeroPal();
    // 体素缓存：性别+装备+尺寸任一变化才重建（getImageData 扫描有开销，避免整页渲染重复扫）
    const key = (female ? 'f' : 'm') + px + JSON.stringify(pal || {});
    window.__rpg99VoxCache = window.__rpg99VoxCache || {};
    let vox = window.__rpg99VoxCache[key];
    if (!vox) {
      vox = window.__rpg99HeroVoxels ? window.__rpg99HeroVoxels(!!female, pal, px / SZ.W) : null;
      if (vox) window.__rpg99VoxCache[key] = vox;
    }
    if (!vox || (!vox.body && !vox.arm)) return this._rpg99HeroHtml(px, female);   // 体素失败兜底平面图
    return `<div class="rpg99-hero3d" id="rpg99Hero3d" style="width:${px}px;height:${h}px" role="img" aria-label="像素战士 · 拖拽旋转，点击攻击" title="拖拽旋转 · 点击攻击">
      <div class="rpg99-h3d-in">
        <i class="rpg99-vg-sh"></i>
        <div class="rpg99-vg">${vox.body}</div>
        <div class="rpg99-vg rpg99-vg-arm" id="rpg99HeroArm">${vox.arm}</div>
      </div>
      <span class="rpg99-h3d-tip">🔄 拖拽旋转 · 点击攻击</span>
    </div>`;
  },
  // 3D 交互绑定（渲染后调用）：水平拖 = rotateY 360° 自由旋转；垂直拖 = 俯仰 ±24°；
  // 点击（非拖动）= 挥砍攻击：武器臂层绕肩关节摆动 + 伤害数字上飘 + 剑光扩散 + 舞台微震
  rpg99Hero3dBind() {
    const box = document.getElementById('rpg99Hero3d');
    if (!box || box.dataset.bound === '1') return;
    box.dataset.bound = '1';
    const inner = box.querySelector('.rpg99-h3d-in');
    const arm = document.getElementById('rpg99HeroArm');
    let ry = 0, rx = 0, drag = false, moved = 0, sx = 0, sy = 0, t0 = 0, last = performance.now();
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const apply = () => { inner.style.transform = 'rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg)'; };
    const attack = () => {
      if (arm && arm.dataset.on === '1') return;
      if (arm) { arm.dataset.on = '1'; arm.classList.add('swing'); }
      // v12.9.45 挥剑音效：短促"嗖"（音效引擎 96-perm99.js · 总开关在权限管理页）
      try { this._sfx99 && this._sfx99('swing'); } catch (e) {}
      const stage = box.parentElement;
      if (stage) {
        const dmg = 6 + Math.floor(Math.random() * 30);
        const cx = box.offsetLeft, cy = box.offsetTop;
        const d = document.createElement('span');
        d.className = 'rpg99-dmg';
        d.textContent = '⚔ -' + dmg;
        d.style.left = (cx + box.offsetWidth * .62 + (Math.random() * 30 - 15)) + 'px';
        d.style.top = (cy + 30) + 'px';
        const sl = document.createElement('span');
        sl.className = 'rpg99-slash';
        sl.style.left = (cx + box.offsetWidth * .82) + 'px';
        sl.style.top = (cy + 52) + 'px';
        stage.appendChild(sl); stage.appendChild(d);
        setTimeout(() => { d.remove(); sl.remove(); }, 1050);
      }
      box.classList.add('hit');
      setTimeout(() => {
        box.classList.remove('hit');
        if (arm) { arm.classList.remove('swing'); arm.dataset.on = ''; }
      }, 640);
    };
    box.addEventListener('pointerdown', (e) => {
      drag = true; moved = 0; sx = e.clientX; sy = e.clientY; t0 = performance.now(); last = t0;
      box.classList.add('drag');
      try { box.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    box.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      moved += Math.abs(dx) + Math.abs(dy);
      ry += dx * .55; rx = clamp(rx - dy * .28, -24, 24);
      sx = e.clientX; sy = e.clientY; last = performance.now();
      apply();
    });
    const end = () => {
      if (!drag) return;
      drag = false; box.classList.remove('drag');
      if (moved < 7 && performance.now() - t0 < 400) attack();  // 没怎么动 = 点击 → 攻击
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', () => { drag = false; box.classList.remove('drag'); });
    apply();
    const loop = (t) => {
      if (!document.getElementById('rpg99Hero3d')) return;    // 离开页面自动停
      if (!drag && t - last > 2800) {                          // 闲置：缓慢回正 + 轻微摇摆环视
        const ty = Math.sin(t / 1700) * 13, tx = Math.sin(t / 2900) * 4;
        ry += (ty - ry) * .022; rx += (tx - rx) * .022;
        apply();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  // ===== 【个人中心】页面（v12.9.31b 重设计：游戏 HUD 式排版 · 整页热力红×白渐变即背景）=====
  // 版式：无逐行卡片——顶部悬浮按钮 / 开放舞台（战士+名牌+宝石袋）/ 交错属性徽章 / 悬浮经验条 /
  //       点线周足迹 / 随机倾角任务卡堆（长按检验）/ 底部奖励坞（宝箱+商店）
  _wbRpg99(wb, W) {
    const p = (Store.getProfile ? Store.getProfile() : {}) || {};
    const female = p.gender === '女';
    const r = this._rpg99Data();
    const prog = this._rpg99ExpProg(r.exp);
    const at = this._rpg99Attrs(prog.lv);
    const gear = this._rpg99GearOf(r);
    const gb = this._rpg99GearBonus(r);
    const gems = (this._pet99Data ? this._pet99Data().points : 0) || 0;
    const maxed = prog.lv >= 30;
    const barW = Math.max(2, Math.round(prog.pct * 0.98));
    const avail = this._rpg99ChestAvail();
    const q = ((r.quests || {})[Store.today()]) || {};
    const doneN = Object.keys(q.done || {}).length;
    const chestUrl = window.__rpg99ChestUrl ? window.__rpg99ChestUrl(false) : '';
    const cloudUrl = window.__rpg99CloudUrl ? window.__rpg99CloudUrl() : '';
    const gemUrl = window.__rpg99ItemUrl ? window.__rpg99ItemUrl('gem') : '';
    return `
    <div class="rpg99">
      <style>
        /* ===== 容器：背景由 body.bg-rpg-red 承担（styles.css · 独行者同款红白渐变铺满整页），此处只负责任版式 ===== */
        .rpg99{--rpg-red:#dc2626;--rpg-red-d:#b91c1c;--rpg-line:#7f1d1d;
          font-family:ui-monospace,'Courier New',monospace;position:relative;
          margin:0 -12px;padding:0 0 6px}
        @keyframes rpg99drift{from{transform:translateX(0)}to{transform:translateX(16px)}}
        @keyframes rpg99bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes rpg99twk{0%,100%{opacity:.2}50%{opacity:.9}}
        /* 顶栏：悬浮按钮 */
        .rpg99-topbar{display:flex;justify-content:space-between;align-items:center;padding:14px 14px 0;position:relative;z-index:20}
        .rpg99-fbtn{width:42px;height:42px;font-size:19px;line-height:1;background:rgba(255,255,255,.92);color:var(--rpg-line);
          border:3px solid var(--rpg-line);box-shadow:3px 3px 0 rgba(127,29,29,.35);cursor:pointer;
          display:flex;align-items:center;justify-content:center;border-radius:0;padding:0}
        .rpg99-fbtn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 rgba(127,29,29,.35)}
        .rpg99-fbtn.book{transform:rotate(3deg);animation:rpg99bob 3s ease-in-out infinite}
        .rpg99-topbar .t{font-size:11px;font-weight:900;color:#fff;letter-spacing:4px;text-shadow:1px 1px 0 rgba(127,29,29,.6)}
        /* 舞台（无卡片框 · 战士立于渐变背景上） */
        .rpg99-stage{position:relative;height:330px}
        .rpg99-cloud{position:absolute;image-rendering:pixelated;opacity:.92;animation:rpg99drift 9s ease-in-out infinite alternate;background-size:100% 100%;background-repeat:no-repeat}
        .rpg99-sun{position:absolute;top:18px;left:24px;width:34px;height:34px;background:#fde047;border:3px solid var(--rpg-line);
          box-shadow:3px 3px 0 rgba(127,29,29,.25);animation:rpg99bob 3.4s ease-in-out infinite}
        .rpg99-dot{position:absolute;width:5px;height:5px;background:rgba(255,255,255,.78);animation:rpg99twk 2.6s ease-in-out infinite}
        .rpg99-nameplate{position:absolute;left:50%;transform:translateX(-50%) rotate(-2deg);top:22px;z-index:5;
          background:var(--rpg-line);color:#fff;font-size:12px;font-weight:900;letter-spacing:1px;padding:7px 13px;
          border:3px solid #fff;box-shadow:4px 4px 0 rgba(127,29,29,.35);white-space:nowrap}
        .rpg99-nameplate::after{content:'';position:absolute;left:34px;bottom:-9px;width:12px;height:12px;background:var(--rpg-line);
          border-right:3px solid #fff;border-bottom:3px solid #fff;transform:rotate(45deg) skew(6deg,6deg)}
        .rpg99-nameplate .rp{display:block;font-size:9px;color:#fecaca;letter-spacing:2px;margin-top:2px}
        /* v12.9.38 体素战士（实体建模）：同色像素段 = 六面长方体，任意角度旋转始终可见
           （旧分层贴片旋转到侧面即消失）· b=体素段容器（其背景=背面）· i.f=前面 · i.e=四个侧面 */
        .rpg99-hero3d{position:absolute;left:50%;bottom:24px;transform:translateX(-58%);z-index:3;
          perspective:520px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
        .rpg99-hero3d:active{cursor:grabbing}
        .rpg99-h3d-in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .25s ease-out}
        .rpg99-hero3d.drag .rpg99-h3d-in{transition:none}
        .rpg99-vg,.rpg99-vg-arm{position:absolute;inset:0;transform-style:preserve-3d;pointer-events:none}
        .rpg99-vg b{position:absolute;transform-style:preserve-3d}
        .rpg99-vg b i{position:absolute;left:0;top:0;display:block}
        .rpg99-vg b i.f{width:100%;height:100%}
        .rpg99-vg b i.e{transform-origin:0 0}
        .rpg99-vg b i.t{top:.01px;transform:rotateX(90deg)}
        .rpg99-vg b i.b{top:calc(100% - .01px);transform:rotateX(90deg)}
        .rpg99-vg b i.l{left:.01px;transform:rotateY(-90deg)}
        .rpg99-vg b i.r{left:calc(100% - .01px);transform:rotateY(-90deg)}
        .rpg99-vg-arm{transform-origin:76% 42%} /* 肩关节为挥砍轴心 */
        .rpg99-vg-arm.swing{animation:rpg99swing .6s cubic-bezier(.25,.9,.3,1)}
        @keyframes rpg99swing{0%{transform:translateZ(0) rotate(0)}
          38%{transform:translateZ(22px) rotate(-100deg)}
          60%{transform:translateZ(22px) rotate(22deg)}
          100%{transform:translateZ(0) rotate(0)}}
        .rpg99-vg-sh{position:absolute;left:3%;width:94%;top:calc(100% - 5px);height:26px;border-radius:50%;
          background:radial-gradient(closest-side,rgba(80,20,20,.3),rgba(80,20,20,0) 74%);transform:rotateX(90deg)}
        .rpg99-h3d-tip{position:absolute;left:50%;bottom:-26px;transform:translateX(-50%);white-space:nowrap;
          font-size:9px;font-weight:800;color:#fff;background:rgba(127,29,29,.78);border:2px solid #fff;
          padding:2px 8px;letter-spacing:1px;box-shadow:2px 2px 0 rgba(127,29,29,.3)}
        .rpg99-dmg{position:absolute;z-index:9;font-size:15px;font-weight:900;color:#fff;background:var(--rpg-red);
          border:2px solid #fff;padding:2px 8px;box-shadow:3px 3px 0 rgba(127,29,29,.4);pointer-events:none;
          animation:rpg99dmg 1s ease-out forwards;transform:rotate(-6deg)}
        @keyframes rpg99dmg{0%{opacity:0;transform:translateY(0) rotate(-6deg) scale(.5)}
          18%{opacity:1;transform:translateY(-10px) rotate(-6deg) scale(1.2)}
          100%{opacity:0;transform:translateY(-60px) rotate(-6deg) scale(1)}}
        .rpg99-slash{position:absolute;z-index:8;width:26px;height:26px;border-radius:50%;pointer-events:none;
          border:5px solid rgba(255,255,255,.95);animation:rpg99slash .45s ease-out forwards}
        @keyframes rpg99slash{0%{opacity:.95;transform:scale(.3)}100%{opacity:0;transform:scale(2.8)}}
        .rpg99-hero3d.hit{animation:rpg99shake .32s}
        @keyframes rpg99shake{0%,100%{transform:translateX(-58%)}
          20%{transform:translateX(-55%) rotate(-1deg)}50%{transform:translateX(-61%) rotate(1deg)}80%{transform:translateX(-57%)}}
        .rpg99-gembag{position:absolute;right:14px;top:64px;transform:rotate(4deg);z-index:15;
          background:#fff;border:3px solid var(--rpg-line);box-shadow:4px 4px 0 rgba(127,29,29,.3);
          padding:8px 12px;display:flex;align-items:center;gap:8px}
        .rpg99-gembag b{font-size:17px;color:var(--rpg-red-d)}
        .rpg99-gembag span{font-size:10px;color:#9f1239;font-weight:700}
        .rpg99-gembag::before{content:'珍贵';position:absolute;top:-9px;right:-7px;font-size:8px;font-weight:900;
          color:#fff;background:var(--rpg-red);padding:2px 5px;letter-spacing:1px;transform:rotate(4deg)}
        .rpg99-ground{position:absolute;left:0;right:0;bottom:0;height:26px;border-top:4px solid var(--rpg-line);
          background:repeating-linear-gradient(90deg,#f87171 0 14px,#ef4444 14px 28px);opacity:.92}
        .rpg99-ground::after{content:'';position:absolute;left:0;right:0;top:-9px;height:5px;
          background:repeating-linear-gradient(90deg,#fff 0 5px,transparent 5px 10px);opacity:.55}
        /* HUD 属性徽章（交错悬浮） */
        .rpg99-hud{display:flex;justify-content:center;align-items:flex-end;gap:10px;margin:-26px 16px 0;position:relative;z-index:12}
        .rpg99-stat{flex:1;background:rgba(255,255,255,.96);border:3px solid var(--rpg-line);box-shadow:4px 4px 0 rgba(127,29,29,.3);
          padding:9px 6px 7px;text-align:center}
        .rpg99-stat b{display:block;font-size:19px}
        .rpg99-stat .n{display:block;font-size:10px;font-weight:800;color:#9f1239;margin-top:2px;letter-spacing:1px}
        .rpg99-stat .eq{display:block;font-size:8.5px;color:#b91c1c;margin-top:3px;border-top:2px dashed #fecaca;padding-top:3px}
        .rpg99-stat.hp{transform:rotate(-2.5deg);margin-bottom:14px} .rpg99-stat.hp b{color:#dc2626}
        .rpg99-stat.atk{margin-bottom:26px} .rpg99-stat.atk b{color:#ea580c}
        .rpg99-stat.def{transform:rotate(2.5deg);margin-bottom:8px} .rpg99-stat.def b{color:#b91c1c}
        /* 经验条（游戏式悬浮条） */
        .rpg99-exp{margin:14px 22px 0;background:rgba(127,29,29,.9);border:3px solid #fff;box-shadow:4px 4px 0 rgba(127,29,29,.3);
          padding:8px 10px;transform:rotate(-.6deg)}
        .rpg99-exp .lbl{display:flex;justify-content:space-between;font-size:9.5px;color:#fecaca;font-weight:800;letter-spacing:1px;margin-bottom:5px}
        .rpg99-exp .bar{height:15px;background:#450a0a;border:2px solid #fff;position:relative}
        .rpg99-exp .bar i{display:block;height:100%;background:repeating-linear-gradient(90deg,#fca5a5 0 6px,#f87171 6px 12px)}
        .rpg99-exp .bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-size:9px;font-weight:900;color:#fff;text-shadow:1px 1px 0 var(--rpg-line)}
        /* 周足迹（点线相连） */
        .rpg99-week{margin:22px 22px 0;text-align:center}
        .rpg99-week-tag{display:inline-block;font-size:10px;font-weight:900;color:var(--rpg-line);background:#fff;
          border:2px solid var(--rpg-line);padding:2px 10px;letter-spacing:2px;box-shadow:2px 2px 0 rgba(127,29,29,.25);margin-bottom:10px}
        .rpg99-week-path{display:flex;justify-content:space-between;align-items:center;position:relative;padding:16px 0 4px}
        .rpg99-week-path::before{content:'';position:absolute;left:16px;right:16px;top:50%;border-top:3px dashed #f87171}
        .rpg99-day{position:relative;width:34px;height:34px;background:#fff;border:3px solid #fca5a5;border-radius:50%;
          display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:var(--rpg-line)}
        .rpg99-day i{font-style:normal;position:absolute;top:-16px;font-size:8.5px;color:#b91c1c;font-weight:700;white-space:nowrap}
        .rpg99-day.past{background:#fee2e2}
        .rpg99-day.today{background:var(--rpg-red);border-color:var(--rpg-line);color:#fff;
          box-shadow:3px 3px 0 rgba(127,29,29,.35);transform:scale(1.16)}
        .rpg99-day.today i{color:#b91c1c;font-weight:900}
        /* 任务卡堆（随机倾角散落 · 顶层长按检验） */
        .rpg99-deck-wrap{position:relative;margin:26px auto 0;width:min(340px,86%)}
        .rpg99-deck-flag{position:absolute;right:-6px;top:-12px;z-index:9;font-size:10px;font-weight:900;color:#fff;
          background:var(--rpg-line);padding:4px 10px;letter-spacing:1px;transform:rotate(3deg);box-shadow:3px 3px 0 rgba(127,29,29,.3)}
        .rpg99-deck{position:relative;height:236px}
        .rpg99-card{position:absolute;left:0;right:0;top:0;height:196px;background:linear-gradient(180deg,#fff,#fff1f2);
          border:3px solid var(--rpg-line);box-shadow:5px 5px 0 rgba(127,29,29,.28);padding:13px 15px;
          transition:transform .25s ease,opacity .25s ease;border-radius:0;user-select:none;-webkit-user-select:none}
        .rpg99-card.under{pointer-events:none;opacity:.55}
        .rpg99-card.under .rpg99-card-t{font-size:13px}
        .rpg99-card.top{cursor:pointer;touch-action:pan-y}
        .rpg99-card.top.pressing{transform:rotate(-1deg) scale(1.02)!important}
        .rpg99-card.fly{transition:transform .42s ease-in,opacity .42s ease-in!important;
          transform:translateX(130%) rotate(9deg)!important;opacity:0!important}
        .rpg99-deck .rpg99-card:last-child{animation:rpg99fadein .55s ease}
        @keyframes rpg99fadein{from{opacity:0}to{opacity:1}}
        .rpg99-press{position:absolute;top:-3px;left:-3px;right:-3px;height:5px;background:rgba(127,29,29,.15);overflow:hidden;opacity:0}
        .rpg99-card.top.pressing .rpg99-press{opacity:1}
        .rpg99-card.top.pressing .rpg99-press i{display:block;height:100%;width:0;background:var(--rpg-red);
          animation:rpg99fill 1.5s linear forwards}
        @keyframes rpg99fill{to{width:100%}}
        .rpg99-card-cat{display:inline-block;font-size:10px;font-weight:900;color:#fff;padding:3px 10px;letter-spacing:1px;
          box-shadow:2px 2px 0 rgba(127,29,29,.4)}
        .rpg99-card-t{font-size:16.5px;font-weight:900;color:var(--rpg-line);margin-top:9px;line-height:1.35}
        .rpg99-card-d{font-size:11px;color:#9f1239;margin-top:7px;line-height:1.65;border-top:2px dashed #fecaca;padding-top:7px}
        .rpg99-card-ok{position:absolute;top:9px;right:9px;font-size:10px;font-weight:900;color:#b91c1c;
          border:2px solid var(--rpg-red);padding:2px 6px;background:#fff1f2}
        .rpg99-swipe{position:absolute;right:12px;bottom:11px;font-size:11px;font-weight:900;color:#fff;
          background:linear-gradient(90deg,#dc2626,#b91c1c);border:2px solid var(--rpg-line);
          padding:5px 12px;cursor:pointer;border-radius:0;box-shadow:2px 2px 0 rgba(127,29,29,.5)}
        .rpg99-swipe:active{transform:translate(1px,1px);box-shadow:1px 1px 0 rgba(127,29,29,.5)}
        .rpg99-deck-note{text-align:center;font-size:10.5px;color:#b91c1c;margin-top:10px;font-weight:700}
        /* 底部奖励坞（宝箱 + 商店） */
        .rpg99-dock{display:flex;align-items:center;gap:12px;margin:24px 18px 0;background:rgba(255,255,255,.55);
          border:3px dashed #f87171;padding:12px 14px;position:relative}
        .rpg99-dock.ready{background:linear-gradient(90deg,rgba(254,252,232,.9),rgba(254,240,138,.75),rgba(255,255,255,.6))}
        .rpg99-chestwrap{position:relative;flex-shrink:0;cursor:pointer}
        .rpg99-chest{width:96px;height:78px;image-rendering:pixelated;display:block;background-size:100% 100%;background-repeat:no-repeat}
        .rpg99-dock.ready .rpg99-chest{animation:rpg99bob 2.4s ease-in-out infinite}
        .rpg99-cnt{position:absolute;top:-7px;right:-11px;font-size:10px;font-weight:900;color:#fff;background:var(--rpg-red);
          border:2px solid var(--rpg-line);padding:2px 7px;transform:rotate(6deg);white-space:nowrap}
        .rpg99-dock-info{flex:1;min-width:0}
        .rpg99-dock-info b{font-size:13px;color:var(--rpg-line)}
        .rpg99-dock-info p{font-size:9.5px;color:#b91c1c;line-height:1.6;margin-top:4px;font-weight:700}
        .rpg99-shopbtn{flex-shrink:0;width:62px;height:62px;background:#fff;border:3px solid var(--rpg-line);
          box-shadow:3px 3px 0 rgba(127,29,29,.3);font-size:10px;font-weight:900;color:var(--rpg-line);
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;
          border-radius:0;padding:0;line-height:1.4}
        .rpg99-shopbtn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 rgba(127,29,29,.3)}
        .rpg99-shopbtn .si{font-size:20px}
        .rpg99-foot{text-align:center;font-size:9px;color:#b91c1c;letter-spacing:3px;margin-top:18px;opacity:.75}
      </style>
      <div class="rpg99-topbar">
        <button class="rpg99-fbtn" onclick="App.navBack()">←</button>
        <span class="t">个 人 中 心</span>
        <button class="rpg99-fbtn book" onclick="App.rpg99Rules()" title="成长指南 · 经验与宝石获取方法">📖</button>
      </div>
      <div class="rpg99-stage">
        <div class="rpg99-cloud" style="top:60px;right:8%;width:58px;height:19px;background-image:url('${cloudUrl}')"></div>
        <div class="rpg99-cloud" style="top:130px;left:6%;width:44px;height:15px;animation-delay:2s;background-image:url('${cloudUrl}')"></div>
        <span class="rpg99-sun"></span>
        <span class="rpg99-dot" style="top:180px;left:12%;"></span>
        <span class="rpg99-dot" style="top:90px;right:22%;animation-delay:.8s;"></span>
        <span class="rpg99-dot" style="top:250px;right:14%;animation-delay:1.6s;"></span>
        <span class="rpg99-dot" style="top:300px;left:20%;animation-delay:.4s;"></span>
        <div class="rpg99-nameplate">${female ? '女战士' : '男战士'} · Lv.${prog.lv}<span class="rp">${this._rpg99RankName(prog.lv)} ⚔ RPG MODE</span></div>
        ${this._rpg99Hero3dHtml(150, female)}
        <div class="rpg99-gembag"><span style="display:block;width:22px;height:22px;image-rendering:pixelated;background:url('${gemUrl}') center/100% 100% no-repeat"></span><span><b>${gems}</b> 宝石</span></div>
        <span class="rpg99-ground"></span>
      </div>
      <div class="rpg99-hud">
        <div class="rpg99-stat hp"><b>${at.hp + gb.hp}</b><span class="n">❤ 生命</span><span class="eq">${gear.t.n}${gb.hp ? ' +' + gb.hp : ''}</span></div>
        <div class="rpg99-stat atk"><b>${at.atk + gb.atk}</b><span class="n">⚔ 攻击</span><span class="eq">${gear.w.n}${gb.atk ? ' +' + gb.atk : ''}</span></div>
        <div class="rpg99-stat def"><b>${at.def + gb.def}</b><span class="n">🛡 防御</span><span class="eq">${gear.a.n}${gb.def ? ' +' + gb.def : ''}</span></div>
      </div>
      <div class="rpg99-exp">
        <div class="lbl"><span>${maxed ? 'LV.30 已满级' : `LV.${prog.lv} → LV.${prog.lv + 1}`}</span><span>经验 ${prog.cur} / ${prog.need}</span></div>
        <div class="bar"><i style="width:${maxed ? 100 : barW}%"></i><span>${maxed ? 'MAX' : prog.pct + '%'}</span></div>
      </div>
      ${this._rpg99CalHtml()}
      ${this._rpg99DeckHtml()}
      <div class="rpg99-dock${avail > 0 ? ' ready' : ''}">
        <div class="rpg99-chestwrap" onclick="App.rpg99ChestOpen()">
          <div class="rpg99-chest" style="background-image:url('${chestUrl}')"></div>
          <span class="rpg99-cnt">${avail > 0 ? '可开 ' + avail + ' 次' : '已开完'}</span>
        </div>
        <div class="rpg99-dock-info">
          <b>独行宝箱</b>
          <p>每完成 1 个今日任务开 1 次（任务 ${doneN} 已通过检验）<br>⭐经验 70% · 💎宝石 20% · ⚔装备 10%</p>
        </div>
        <button class="rpg99-shopbtn" onclick="App.rpg99Shop()"><span class="si">🏪</span>宝石<br>商店</button>
      </div>
      <div class="rpg99-foot">— 独行信条 · SOLO CODE —</div>
    </div>`;
  },
});
