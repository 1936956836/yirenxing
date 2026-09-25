// 93-quit99.js —— v12.9.40 【戒断数据】四魔封印：反向打卡 · 体素 3D 四魔物 · 冲破封印对决 · 周结算
// [功能组] G4-数据洞察 + G9-独行信条（戒断域：数据中心第 10 库 · 入口在数据研究所）
//
// 设计（用户规则）：
//   · 四魔物 = 人心中的四种执念：淫魔（淫欲熏心）/ 娱魔（娱乐至死）/ 惰魔（怠惰因循）/ 贪魔（贪慕迷心）
//   · 页面只有四只魔物在天空中飞（体素 3D 实体建模 · 拖拽旋转 / 单击挑逗 / 长按 1 秒查看属性）
//   · 每只魔物初始活性 3，上限 5：破戒 +1 · 当日未破打卡 -1（反向打卡：正常记录未破天数，这里反向记魔物活性）
//   · 活性到达 5 → 立即冲破封印（表情猖狂 +「我又回来了」气泡），必须用自己的战士与它对决
//   · 每周一 0 点统计：每有一只魔物活性最后保持为 0 → +5 宝石（宠物钱包入账）
//   · 惰魔额外绑成长：次日回顾时前一日无运动/学习打卡 → 活性 +1
//   · 贪魔额外绑消费：前一日花销超过 200 元 → 活性 +1
// 数据：localStorage one-xing-quit99-v1（沙箱开发者模式不入档）
(function () {
  const MW = 22, MH = 26;                       // 魔物 sprite 网格
  // 四魔物色板（m 主色 / d 暗部 / l 亮部 / a 点缀 / w 翼）
  const QPAL = {
    yin: { m: '#f472b6', d: '#be185d', l: '#fbcfe8', a: '#e11d8f', w: '#9d174d' },
    yu:  { m: '#8b5cf6', d: '#4c1d95', l: '#ddd6fe', a: '#fde047', w: '#3b0764' },
    duo: { m: '#84cc16', d: '#3f6212', l: '#d9f99d', a: '#bef264', w: '#365314' },
    tan: { m: '#f59e0b', d: '#b45309', l: '#fde68a', a: '#fde047', w: '#713f12' },
  };
  const EYE_R = '#dc2626', WHT = '#ffffff';

  // ===== 四魔物像素绘制（分层：back 翼尾 / body 躯干 / head 头 · expr: calm | mad）=====
  function drawQMon(ctx, kind, expr, layer) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const P = QPAL[kind];
    const mad = expr === 'mad';
    if (layer === 'back') {
      if (kind === 'duo') {          // 惰魔：破小翼 + Zzz
        R(0, 10, 4, 1, P.w); R(1, 11, 3, 1, P.w); R(0, 12, 2, 1, P.d);
        R(18, 10, 4, 1, P.w); R(18, 11, 3, 1, P.w); R(20, 12, 2, 1, P.d);
        R(14, 1, 3, 1, '#fef9c3'); R(15, 2, 1, 1, '#fef9c3'); R(14, 3, 3, 1, '#fef9c3');
        R(18, 0, 3, 1, '#fef9c3'); R(19, 1, 1, 1, '#fef9c3'); R(18, 2, 3, 1, '#fef9c3');
      } else {                        // 其余：蝙蝠翼 + 各自尾
        R(0, 8, 5, 1, P.w); R(0, 9, 4, 2, P.w); R(0, 11, 3, 2, P.w); R(1, 13, 3, 1, P.d);
        R(17, 8, 5, 1, P.w); R(18, 9, 4, 2, P.w); R(19, 11, 3, 2, P.w); R(18, 13, 3, 1, P.d);
        R(1, 8, 3, 1, P.m); R(18, 8, 3, 1, P.m);
        if (kind === 'yin') {         // 心形尾
          R(16, 19, 2, 1, P.d); R(17, 20, 1, 2, P.d);
          R(16, 22, 1, 1, P.a); R(18, 22, 1, 1, P.a); R(16, 23, 3, 1, P.a); R(17, 24, 1, 1, P.a);
        } else if (kind === 'yu') {   // 铃铛尾
          R(16, 20, 2, 1, P.d); R(17, 21, 1, 2, P.d);
          R(16, 23, 3, 2, P.a); R(17, 24, 1, 1, P.d);
        } else {                      // 贪魔：金币尾
          R(16, 19, 2, 2, P.d); R(17, 21, 2, 1, P.d);
          R(16, 22, 3, 2, P.a); R(17, 23, 1, 1, P.d);
        }
      }
    } else if (layer === 'body') {
      if (kind === 'duo') {           // 塌腰宽躯
        R(6, 13, 10, 8, P.m);
        R(8, 16, 6, 3, P.l);
        R(4, 14, 2, 7, P.m); R(16, 14, 2, 7, P.m);
        R(4, 20, 2, 1, P.d); R(16, 20, 2, 1, P.d);
        R(8, 21, 3, 2, P.d); R(12, 21, 3, 2, P.d);
      } else if (kind === 'tan') {    // 宽躯 + 金币胸 + 利爪
        R(6, 12, 10, 9, P.m);
        R(9, 14, 4, 4, P.a); R(10, 15, 2, 2, P.d);
        R(4, 13, 2, 6, P.m); R(16, 13, 2, 6, P.m);
        R(3, 19, 2, 1, P.d); R(17, 19, 2, 1, P.d);
        R(8, 21, 3, 2, P.d); R(12, 21, 3, 2, P.d);
      } else {
        R(7, 12, 8, 9, P.m);
        R(7, 12, 8, 1, P.l);
        if (kind === 'yin') {          // 心形胸饰
          R(10, 14, 1, 1, P.a); R(12, 14, 1, 1, P.a); R(9, 15, 4, 1, P.a); R(10, 16, 2, 1, P.a);
        } else {                      // 娱魔：菱形纹
          R(10, 13, 2, 1, P.l); R(9, 14, 4, 1, P.l); R(10, 15, 2, 1, P.l);
          R(8, 17, 1, 1, P.l); R(13, 18, 1, 1, P.l);
        }
        R(5, 13, 2, 6, P.m); R(15, 13, 2, 6, P.m);
        R(5, 19, 2, 1, P.d); R(15, 19, 2, 1, P.d);
        R(8, 21, 2, 2, P.d); R(12, 21, 2, 2, P.d);
      }
    } else if (layer === 'head') {
      if (kind === 'yu') {            // 小丑双叉帽
        R(6, 4, 10, 2, P.d);
        R(5, 3, 2, 1, P.d); R(4, 2, 2, 1, P.d); R(3, 1, 2, 1, P.d); R(3, 0, 2, 1, P.a);
        R(15, 3, 2, 1, P.d); R(16, 2, 2, 1, P.d); R(17, 1, 2, 1, P.d); R(17, 0, 2, 1, P.a);
        R(6, 6, 10, 5, P.m);
        R(7, 7, 8, 3, P.l);
        if (mad) {
          R(7, 6, 2, 1, '#1e1b4b'); R(13, 6, 2, 1, '#1e1b4b');
          R(8, 7, 2, 2, EYE_R); R(12, 7, 2, 2, EYE_R);
          R(8, 7, 1, 1, WHT); R(12, 7, 1, 1, WHT);
          R(9, 9, 4, 2, '#1e1b4b'); R(9, 9, 1, 1, WHT); R(11, 9, 1, 1, WHT);
        } else {
          R(8, 7, 2, 2, '#1e1b4b'); R(12, 7, 2, 2, '#1e1b4b');
          R(8, 7, 1, 1, P.a); R(12, 7, 1, 1, P.a);
          R(8, 9, 1, 1, '#1e1b4b'); R(9, 9, 4, 1, '#1e1b4b'); R(13, 9, 1, 1, '#1e1b4b');
        }
      } else if (kind === 'duo') {    // 塌眼昏睡头
        R(7, 5, 8, 7, P.m);
        R(8, 6, 6, 5, P.l);
        if (mad) {
          R(8, 6, 2, 1, P.d); R(12, 6, 2, 1, P.d);
          R(8, 7, 2, 2, EYE_R); R(12, 7, 2, 2, EYE_R);
          R(8, 7, 1, 1, WHT); R(12, 7, 1, 1, WHT);
          R(9, 9, 4, 2, P.d); R(9, 9, 1, 1, WHT); R(11, 9, 1, 1, WHT);
        } else {
          R(8, 7, 2, 1, P.m); R(12, 7, 2, 1, P.m);
          R(8, 8, 2, 1, P.d); R(12, 8, 2, 1, P.d);
          R(10, 10, 2, 1, P.d);
          R(11, 11, 1, 1, '#ecfccb');
        }
      } else if (kind === 'tan') {    // 金币眼 + 血盆大口
        R(6, 3, 2, 2, P.d); R(14, 3, 2, 2, P.d);
        R(6, 5, 10, 6, P.m);
        R(7, 6, 8, 4, P.l);
        R(9, 8, 4, 2, '#7c2d12');
        R(9, 8, 1, 1, WHT); R(11, 8, 1, 1, WHT); R(13, 8, 1, 1, WHT);
        if (mad) {
          R(7, 5, 2, 1, P.d); R(13, 5, 2, 1, P.d);
          R(8, 6, 2, 2, EYE_R); R(12, 6, 2, 2, EYE_R);
          R(9, 6, 1, 1, WHT); R(13, 6, 1, 1, WHT);
        } else {
          R(8, 6, 2, 2, P.a); R(12, 6, 2, 2, P.a);
          R(9, 7, 1, 1, P.d); R(13, 7, 1, 1, P.d);
        }
      } else {                        // 淫魔：弯角 + 媚眼
        R(5, 1, 1, 2, P.d); R(6, 2, 2, 2, P.d);
        R(16, 1, 1, 2, P.d); R(14, 2, 2, 2, P.d);
        R(7, 3, 8, 1, P.m);
        R(6, 4, 10, 7, P.m);
        R(7, 5, 8, 5, P.l);
        if (mad) {
          R(7, 5, 2, 1, '#831843'); R(13, 5, 2, 1, '#831843');
          R(8, 6, 2, 2, EYE_R); R(12, 6, 2, 2, EYE_R);
          R(8, 6, 1, 1, WHT); R(12, 6, 1, 1, WHT);
          R(9, 8, 4, 2, '#7f1d1d'); R(9, 8, 4, 1, WHT); R(10, 8, 1, 1, '#7f1d1d'); R(12, 8, 1, 1, '#7f1d1d');
        } else {
          R(8, 6, 2, 1, '#831843'); R(12, 6, 2, 1, '#831843');
          R(8, 7, 2, 1, '#831843'); R(12, 7, 2, 1, '#831843');
          R(9, 7, 1, 1, WHT); R(13, 7, 1, 1, WHT);
          R(7, 8, 1, 1, '#f9a8d4'); R(14, 8, 1, 1, '#f9a8d4');
          R(10, 9, 2, 1, '#9d174d');
        }
      }
    }
  }
  // 2D 立绘（属性面板肖像 · 背景图渲染：无 <img> 下载悬浮键）
  window.__quit99Url = function (kind, expr) {
    try {
      const cv = document.createElement('canvas');
      cv.width = MW; cv.height = MH;
      const ctx = cv.getContext('2d');
      ['back', 'body', 'head'].forEach(k => drawQMon(ctx, kind, expr || 'calm', k));
      return cv.toDataURL();
    } catch (e) { return ''; }
  };
  // ===== 体素 3D（与像素战士同一套六面长方体建模：同色横段 = 六面实体 · 面剔除 · 受光微调）=====
  window.__quit99Voxels = function (kind, expr, S) {
    try {
      S = S || 5;
      const Z = { back: [-1.7, -0.6], body: [-1.0, 0.9], head: [-1.1, 1.4] };
      const cap = (v) => Math.max(0, Math.min(255, Math.round(v)));
      const sh = (c, f) => 'rgb(' + cap(c[0] * f) + ',' + cap(c[1] * f) + ',' + cap(c[2] * f) + ')';
      let html = '';
      ['back', 'body', 'head'].forEach(k => {
        const cv = document.createElement('canvas');
        cv.width = MW; cv.height = MH;
        const ctx = cv.getContext('2d');
        drawQMon(ctx, kind, expr === 'mad' ? 'mad' : 'calm', k);
        const d = ctx.getImageData(0, 0, MW, MH).data;
        const a = (x, y) => x >= 0 && x < MW && y >= 0 && y < MH && d[(y * MW + x) * 4 + 3] > 8;
        const cAt = (x, y) => { const i = (y * MW + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
        for (let y = 0; y < MH; y++) {
          for (let x = 0; x < MW;) {
            if (!a(x, y)) { x++; continue; }
            const c = cAt(x, y);
            let x1 = x;
            while (x1 + 1 < MW && a(x1 + 1, y)) {
              const c2 = cAt(x1 + 1, y);
              if (c2[0] !== c[0] || c2[1] !== c[1] || c2[2] !== c[2]) break;
              x1++;
            }
            const zk = Z[k];
            const D = ((zk[1] - zk[0]) * S).toFixed(2), Z0 = (zk[0] * S).toFixed(2);
            const w = x1 - x + 1, WS = (w * S).toFixed(2);
            let tH = 1, bH = 1;
            for (let i = 0; i < w; i++) { if (!a(x + i, y - 1)) tH = 0; if (!a(x + i, y + 1)) bH = 0; }
            const lH = a(x - 1, y) ? 0 : 1, rH = a(x1 + 1, y) ? 0 : 1;
            html += `<b style="left:${(x * S).toFixed(2)}px;top:${(y * S).toFixed(2)}px;width:${WS}px;height:${S.toFixed(2)}px;transform:translateZ(${Z0}px);background:${sh(c, .96)}">`
              + `<i class="f" style="background:${sh(c, 1)};transform:translateZ(${D}px)"></i>`
              + (tH ? `<i class="e t" style="width:${WS}px;height:${D}px;background:${sh(c, 1.16)}"></i>` : '')
              + (bH ? `<i class="e b" style="width:${WS}px;height:${D}px;background:${sh(c, .78)}"></i>` : '')
              + (lH ? `<i class="e l" style="width:${D}px;height:${S.toFixed(2)}px;background:${sh(c, 1.05)}"></i>` : '')
              + (rH ? `<i class="e r" style="width:${D}px;height:${S.toFixed(2)}px;background:${sh(c, .88)}"></i>` : '')
              + '</b>';
            x = x1 + 1;
          }
        }
      });
      return html;
    } catch (e) { return ''; }
  };
})();

Object.assign(App, {
  // ===== 存档 =====
  _quit99Key: 'one-xing-quit99-v1',
  _quit99Data() {
    const def = { v: 1, mons: {}, days: {}, settled: '', daily: '', weeks: [] };
    ['yin', 'yu', 'duo', 'tan'].forEach(k => { def.mons[k] = { act: 3, broke: false }; });
    try {
      const raw = localStorage.getItem(this._quit99Key);
      if (raw) {
        const d = JSON.parse(raw);
        d.mons = d.mons || {}; d.days = d.days || {}; d.weeks = Array.isArray(d.weeks) ? d.weeks : [];
        ['yin', 'yu', 'duo', 'tan'].forEach(k => { d.mons[k] = Object.assign({ act: 3, broke: false }, d.mons[k] || {}); });
        return Object.assign(def, d);
      }
    } catch (e) {}
    return def;
  },
  _quit99Save(d) { try { localStorage.setItem(this._quit99Key, JSON.stringify(d)); } catch (e) {} },

  // ===== 定义（四魔物档案）=====
  _quit99Defs() {
    return {
      yin: { k: 'yin', n: '淫魔', tag: '淫欲熏心', ico: '💗',
        d: '以欲念为食。每一次正气卡的破戒（成人社交·翻墙念头·自慰）都在喂养它。',
        cards: ['zhengqi'], cardNote: '正气卡：小破气 / 大破气 → 活性 +1；未破气 → -1',
        taunts: ['别忍了嘛～', '我等你很久了哦～', '就一次，没人会知道～'] },
      yu: { k: 'yu', n: '娱魔', tag: '娱乐至死', ico: '🎮',
        d: '以多巴胺为食。浏览游戏内容与直接开玩，都在为它充能。',
        cards: ['zhengxin'], cardNote: '正心卡：小破心 / 大破心 → 活性 +1；未破心 → -1',
        taunts: ['来玩呀，就一把～', '新版本上线了哦～', '刷会儿视频放松下嘛～'] },
      duo: { k: 'duo', n: '惰魔', tag: '怠惰因循', ico: '🦥',
        d: '以停滞为食。跷二郎腿 / 驼背的每一个懒散姿态、一整天不动不学，都是它的养分。',
        cards: ['posture'], cardNote: '正姿卡：小破姿 / 大破姿 → 活性 +1；未破姿 → -1',
        growNote: '成长绑定：次日回顾时，前一日无任何 运动/学习（健身·学习晨午晚·专注）打卡 → 活性 +1',
        taunts: ['明天再做吧～', '先睡个回笼觉～', '躺着多舒服呀～'] },
      tan: { k: 'tan', n: '贪魔', tag: '贪慕迷心', ico: '💰',
        d: '以物欲为食。烟酒贪瘾、炫耀大话的虚荣、超额消费，都在喂养它。',
        cards: ['zhenghun', 'zhengyan'], cardNote: '正魂卡（烟·酒·槟榔）+ 正言卡（炫耀·大话）：破 → 活性 +1；未破 → -1',
        costNote: '消费绑定：次日回顾时，前一日花销超过 200 元 → 活性 +1',
        taunts: ['就抽一根～', '就喝一杯～', '吹个牛又不上税～'] },
    };
  },

  // ===== 打卡钩子（正气/正心/正姿/正魂/正言 卡打卡与补卡后调用 · 同日改判先撤旧账再入新账）=====
  //   日账按「卡片」记（非按魔物）——正魂/正言两卡同喂贪魔时互不覆盖，各自独立撤改
  _quit99OnCheck(dk, cardId, payload) {
    try {
      if (this._dev99) return;
      const MAP = { zhengqi: 'yin', zhengxin: 'yu', posture: 'duo', zhenghun: 'tan', zhengyan: 'tan' };
      const mon = MAP[cardId];
      if (!mon || !payload || typeof payload.clean !== 'boolean') return;
      const d = this._quit99Data();
      const m = d.mons[mon];
      d.days[dk] = d.days[dk] || {};
      const now = payload.clean ? 0 : 1;
      const has = Object.prototype.hasOwnProperty.call(d.days[dk], cardId);
      const prev = has ? d.days[dk][cardId] : null;
      if (prev === now) return;                       // 同日重复同结果：幂等
      if (prev === 1) m.act = Math.max(0, m.act - 1);  // 撤销该卡旧「破」
      else if (prev === 0) m.act = Math.min(5, m.act + 1); // 撤销该卡旧「未破」
      m.act = Math.max(0, Math.min(5, m.act + (now ? 1 : -1)));
      d.days[dk][cardId] = now;
      if (m.act >= 5) m.broke = true;                  // 冲破封印：唯有对决能重新封印
      this._quit99Save(d);
      const def = this._quit99Defs()[mon];
      if (m.broke && now === 1) setTimeout(() => this._flash(`🔥 ${def.n}冲破封印——「我又回来了」！速去【戒断数据】与它对决`), 350);
      else if (now === 1) setTimeout(() => this._flash(`⚠️ ${def.n}活性 +1（${m.act}/5）——别喂养它`), 350);
      else if (m.act === 0) setTimeout(() => this._flash(`💤 ${def.n}活性归零——保持住，周一 0 点结算 +5 宝石`), 350);
      else setTimeout(() => this._flash(`✅ ${def.n}活性 -1（${m.act}/5）`), 350);
    } catch (e) {}
  },

  // ===== 周结算（周一 0 点：每只活性保持 0 → +5 宝石 · 首启不追溯）=====
  _quit99MondayKey(dt) {
    const d = new Date(dt); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _quit99NextDk(dk) {
    const d = new Date(dk + 'T00:00:00'); d.setDate(d.getDate() + 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _quit99Settle() {
    try {
      if (this._dev99) return;
      const d = this._quit99Data();
      const monday = this._quit99MondayKey(new Date());
      if (!d.settled) { d.settled = monday; this._quit99Save(d); return; }   // 首次启用：从本周起算
      if (d.settled >= monday) return;                                      // 本周已结算
      let gems = 0; const zeros = [];
      Object.keys(d.mons).forEach(k => {
        const m = d.mons[k];
        if (!m.broke && m.act <= 0) { zeros.push(k); gems += 5; }
      });
      if (gems > 0 && this._pet99Data) { const p = this._pet99Data(); p.points = (p.points || 0) + gems; this._pet99Save(p); }
      d.weeks.unshift({ wk: d.settled, gems, zeros: zeros.join(','), ts: new Date().toISOString() });
      if (d.weeks.length > 12) d.weeks.length = 12;
      d.settled = monday;
      this._quit99Save(d);
      if (gems > 0) setTimeout(() => this._flash(`💎 周结算：${zeros.length} 只魔物活性保持 0，+${gems} 宝石已入账`), 1500);
    } catch (e) {}
  },
  // ===== 日结算（v12.9.54 通用规定：当日联动卡无任何打卡 → 对应魔物 +1 · 惰魔：前一日无运动/学习 → +1 · 贪魔：前一日花销 > 200 → +1 · 首启不追溯 · 逐日补账最多 7 天）=====
  _quit99Touched(dk, cardId) {
    try {
      const v = ((Store.getHabit99().days || {})[dk] || {})[cardId];
      return Array.isArray(v) ? v.length > 0 : !!v;
    } catch (e) { return false; }
  },
  _quit99DaySpend(dk) {
    try {
      return (Store.getLedger() || []).filter(e => e && e.date === dk && e.type !== 'income')
        .reduce((s, e) => s + (+e.amount || 0), 0);
    } catch (e) { return 0; }
  },
  _quit99Bump(d, mon, dk) {
    const m = d.mons[mon];
    m.act = Math.max(0, Math.min(5, m.act + 1));
    if (m.act >= 5) m.broke = true;
    return m.act;
  },
  _quit99Daily() {
    try {
      if (this._dev99) return;
      const d = this._quit99Data();
      const today = Store.today();
      if (!d.daily) { d.daily = today; this._quit99Save(d); return; }       // 首次启用不追溯
      let cur = d.daily;
      const notes = [];
      for (let i = 0; i < 7; i++) {
        const next = this._quit99NextDk(cur);
        if (next >= today) break;
        const day = d.days[next] = d.days[next] || {};
        day.pass = day.pass || {};
        // v12.9.54 通用规定（用户指令）：系统检测不到当日联动内容的打卡 → 对应魔物 +1 活性
        //   联动卡按魔物档案 cards 字段（淫←正气 · 娱←正心 · 惰←正姿 · 贪←正魂+正言）；幂等 flag miss_<mon>
        const defs = this._quit99Defs();
        ['yin', 'yu', 'duo', 'tan'].forEach(mon => {
          const mkey = 'miss_' + mon;
          if (day.pass[mkey]) return;
          const cards = (defs[mon] && defs[mon].cards) || [];
          const any = cards.some(id => this._quit99Touched(next, id));
          if (!any) {
            day.pass[mkey] = 1;
            const a = this._quit99Bump(d, mon, next);
            const cardNames = cards.map(id => {
              const hc = ((typeof CONFIG !== 'undefined' && CONFIG.habitCards) || []).find(x => x.id === id);
              return hc ? hc.name : id;
            }).join('/');
            notes.push(`${defs[mon].ico} ${defs[mon].n}趁你 ${next} 未打卡「${cardNames}」，活性 +1（${a}/5）`);
          }
        });
        // 惰魔：前一日无运动/学习
        if (!day.pass.duo) {
          const grew = ['fitness', 'studyMorning', 'studyNoon', 'studyEvening', 'focus'].some(id => this._quit99Touched(next, id));
          if (!grew) { day.pass.duo = 1; const a = this._quit99Bump(d, 'duo', next); notes.push(`🦥 惰魔趁你 ${next} 未运动/学习，活性 +1（${a}/5）`); }
        }
        // 贪魔：前一日花销 > 200
        if (!day.pass.tan) {
          const sp = this._quit99DaySpend(next);
          if (sp > 200) { day.pass.tan = 1; const a = this._quit99Bump(d, 'tan', next); notes.push(`💰 贪魔趁你 ${next} 消费 ${Math.round(sp)} 元超额，活性 +1（${a}/5）`); }
        }
        cur = next;
      }
      if (cur !== d.daily) {
        d.daily = cur;
        this._quit99Save(d);
        if (notes.length) setTimeout(() => this._flash(notes.join('　')), 900);
        const broke = Object.keys(d.mons).filter(k => d.mons[k].broke);
        if (broke.length) setTimeout(() => this._flash(`🔥 ${broke.map(k => this._quit99Defs()[k].n).join('、')}已冲破封印——速去【戒断数据】对决`), 2400);
      }
    } catch (e) {}
  },

  // ==================== 页面：戒断数据 · 四魔封印（天空飞行场景） ====================
  _wbQuit99(wb, W) {
    try { this._quit99Settle(); } catch (e) {}
    const d = this._quit99Data();
    const defs = this._quit99Defs();
    const cloud = window.__rpg99CloudUrl ? window.__rpg99CloudUrl() : '';
    // 星空
    let stars = '';
    [[7,10],[15,24],[24,7],[32,28],[41,12],[49,26],[57,9],[65,22],[73,15],[81,29],[89,11],[94,25],
     [11,40],[29,52],[47,44],[67,50],[85,42],[19,60],[55,62],[77,58],[91,52],[5,70],[39,68],[63,66],[87,70]]
      .forEach(([x, y], i) => { stars += `<i class="q99-star" style="left:${x}%;top:${y}%;animation-delay:${(i % 7) * .4}s"></i>`; });
    // 四魔物（位置 / 尺寸 / 姿态）
    const POS = { yin: [4, 16], yu: [62, 6], duo: [8, 55], tan: [58, 58] };
    const SZ = { yin: 92, yu: 102, duo: 88, tan: 98 };
    const PIP = { yin: 1.2, yu: 2.4, duo: 3.1, tan: 2.8 };   // 浮动相位差
    let mons = '';
    Object.values(defs).forEach(def => {
      const m = d.mons[def.k];
      const px = SZ[def.k];
      const S = px / 22;
      const h = Math.round(S * 26);
      const expr = m.broke ? 'mad' : 'calm';
      window.__quit99VoxCache = window.__quit99VoxCache || {};
      const ck = def.k + expr + px;
      let vox = window.__quit99VoxCache[ck];
      if (!vox) { vox = window.__quit99Voxels ? window.__quit99Voxels(def.k, expr, S) : ''; window.__quit99VoxCache[ck] = vox; }
      const pips = '<i class="on"></i>'.repeat(m.act) + '<i></i>'.repeat(5 - m.act);
      mons += `<div class="q99-mon${m.broke ? ' broke' : ''}" data-mon="${def.k}" style="left:${POS[def.k][0]}%;top:${POS[def.k][1]}%;animation-delay:${PIP[def.k]}s">
        <div class="q99-mon-3d" style="width:${px}px;height:${h}px" role="img" aria-label="${def.n} · 拖拽旋转，单击挑逗，长按查看属性" title="拖拽旋转 · 单击挑逗 · 长按 1 秒查属性">
          <div class="q99-mon-in">${vox}</div>
        </div>
        <div class="q99-bubble${m.broke ? ' show' : ''}">${m.broke ? '我又回来了！' : ''}</div>
        <div class="q99-mon-tag"><b>${def.ico} ${def.n}</b><span class="q99-pips${m.act >= 4 ? ' hi' : ''}">${pips}</span></div>
        ${m.broke ? `<button class="q99-duel" onclick="event.stopPropagation();App.quit99Battle('${def.k}')">⚔️ 对决</button>` : ''}
      </div>`;
    });
    // 概况 / 结算
    const zeroN = Object.values(d.mons).filter(m => !m.broke && m.act <= 0).length;
    const brokeN = Object.values(d.mons).filter(m => m.broke).length;
    const dow = (new Date().getDay() + 6) % 7;          // 周一=0
    const cd = 7 - dow;                                  // 距下次周一 0 点
    const lastW = (d.weeks || [])[0];
    let statRows = '';
    Object.values(defs).forEach(def => {
      const m = d.mons[def.k];
      statRows += `<div class="q99-row">
        <span class="q99-row-n">${def.ico} ${def.n}<i>${def.tag}</i></span>
        <span class="q99-pips${m.act >= 4 ? ' hi' : ''}">${'<i class="on"></i>'.repeat(m.act)}${'<i></i>'.repeat(5 - m.act)}</span>
        <span class="q99-row-st${m.broke ? ' broke' : m.act <= 0 ? ' zero' : ''}">${m.broke ? '🔥 冲破封印' : m.act <= 0 ? '💤 沉眠' : '🚫 封印中'}</span>
      </div>`;
    });
    let weekRows = '';
    (d.weeks || []).slice(0, 4).forEach(w => {
      const names = (w.zeros || '').split(',').filter(Boolean).map(k => (defs[k] || {}).n || k).join('、');
      weekRows += `<div class="q99-wk"><span>${w.wk} 周</span><b>${w.gems > 0 ? '+' + w.gems + ' 宝石' : '—'}</b><span class="q99-wk-z">${w.gems > 0 ? names + ' 沉眠' : '无魔物沉眠'}</span></div>`;
    });
    if (!weekRows) weekRows = '<div class="q99-wk"><span>本周进行中</span><b>—</b><span class="q99-wk-z">周一 0 点首次结算</span></div>';
    return `
    <style>
      .q99-wrap{font-family:ui-monospace,'Courier New',monospace}
      .q99-sky{position:relative;height:440px;border-radius:14px;overflow:hidden;
        background:linear-gradient(180deg,#1e1b4b 0%,#312e81 46%,#4c1d95 78%,#5b21b6 100%);
        border:3px solid #312e81;box-shadow:inset 0 0 60px rgba(129,140,248,.18),0 10px 26px rgba(30,27,75,.35)}
      .q99-moon{position:absolute;top:20px;right:22px;width:52px;height:52px;border-radius:50%;
        background:#fde68a;box-shadow:0 0 26px rgba(253,230,138,.55),inset -9px -6px 0 #f0c85f;opacity:.95}
      .q99-star{position:absolute;width:3px;height:3px;background:#fff;border-radius:50%;animation:q99twk 2.6s ease-in-out infinite}
      @keyframes q99twk{0%,100%{opacity:.15}50%{opacity:.95}}
      .q99-cloud{position:absolute;image-rendering:pixelated;opacity:.5;background-size:100% 100%;background-repeat:no-repeat;
        animation:q99drift 11s ease-in-out infinite alternate}
      @keyframes q99drift{from{transform:translateX(0)}to{transform:translateX(18px)}}
      .q99-hint{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:9;white-space:nowrap;
        font-size:10px;font-weight:800;color:#e9d5ff;background:rgba(76,29,149,.72);border:2px solid rgba(233,213,255,.65);
        padding:3px 10px;letter-spacing:1px}
      /* —— 魔物 —— */
      .q99-mon{position:absolute;z-index:3;animation:q99bob 3.4s ease-in-out infinite}
      @keyframes q99bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
      .q99-mon.broke{animation:q99bob 1.7s ease-in-out infinite;z-index:6}
      .q99-mon-3d{position:relative;perspective:640px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
      .q99-mon-3d:active{cursor:grabbing}
      .q99-mon-in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .25s ease-out}
      .q99-mon-3d.drag .q99-mon-in{transition:none}
      .q99-mon.poke .q99-mon-3d{animation:q99poke .5s ease}
      @keyframes q99poke{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px) rotate(-2deg)}50%{transform:translateX(4px) rotate(2deg)}80%{transform:translateX(-2px)}}
      .q99-mon.broke .q99-mon-3d{filter:drop-shadow(0 0 10px rgba(220,38,38,.85))}
      .q99-mon.broke .q99-mon-in{animation:q99rage 1s ease-in-out infinite}
      @keyframes q99rage{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
      /* 体素段（六面长方体 · 与像素战士同款建模） */
      .q99-mon-in b,.q99-vg b{position:absolute;transform-style:preserve-3d}
      .q99-mon-in b i,.q99-vg b i{position:absolute;left:0;top:0;display:block}
      .q99-mon-in b i.f,.q99-vg b i.f{width:100%;height:100%}
      .q99-mon-in b i.e,.q99-vg b i.e{transform-origin:0 0}
      .q99-mon-in b i.t,.q99-vg b i.t{top:.01px;transform:rotateX(90deg)}
      .q99-mon-in b i.b,.q99-vg b i.b{top:calc(100% - .01px);transform:rotateX(90deg)}
      .q99-mon-in b i.l,.q99-vg b i.l{left:.01px;transform:rotateY(-90deg)}
      .q99-mon-in b i.r,.q99-vg b i.r{left:calc(100% - .01px);transform:rotateY(-90deg)}
      .q99-mon-tag{position:absolute;left:50%;transform:translateX(-50%);top:100%;margin-top:7px;white-space:nowrap;
        background:rgba(30,27,75,.82);border:2px solid rgba(233,213,255,.5);color:#f5f3ff;
        font-size:10px;font-weight:800;padding:3px 8px;letter-spacing:.5px;display:flex;align-items:center;gap:7px}
      .q99-mon.broke .q99-mon-tag{background:#7f1d1d;border-color:#fecaca;color:#fff}
      .q99-pips{display:inline-flex;gap:2px}
      .q99-pips i{width:6px;height:6px;border-radius:50%;background:rgba(233,213,255,.22);border:1px solid rgba(233,213,255,.4)}
      .q99-pips i.on{background:#fbbf24;border-color:#fde68a}
      .q99-pips.hi i.on{background:#f87171;border-color:#fecaca}
      .q99-bubble{position:absolute;left:50%;bottom:100%;transform:translateX(-50%) translateY(6px) scale(.7);transform-origin:0 100%;
        margin-bottom:6px;background:#fff;color:#7f1d1d;font-size:11px;font-weight:900;padding:5px 10px;white-space:nowrap;
        border:2px solid #dc2626;border-radius:10px;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;z-index:8}
      .q99-bubble::after{content:'';position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:-3px;
        width:9px;height:9px;background:#fff;border-right:2px solid #dc2626;border-bottom:2px solid #dc2626;transform:translateX(-50%) rotate(45deg)}
      .q99-bubble.show{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}
      .q99-mon.broke .q99-bubble{background:#fef2f2;color:#b91c1c;border-color:#dc2626;font-size:12px}
      .q99-mon.broke .q99-bubble::after{background:#fef2f2;border-color:#dc2626}
      .q99-duel{position:absolute;left:50%;transform:translateX(-50%);top:calc(100% + 40px);z-index:9;
        font-size:11px;font-weight:900;color:#fff;background:linear-gradient(90deg,#dc2626,#b91c1c);
        border:2px solid #fecaca;padding:5px 13px;cursor:pointer;border-radius:0;
        box-shadow:3px 3px 0 rgba(127,29,29,.55);animation:q99btnp 1.1s ease-in-out infinite}
      .q99-duel:active{transform:translateX(-50%) translate(1px,1px);box-shadow:1px 1px 0 rgba(127,29,29,.55)}
      @keyframes q99btnp{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.07)}}
      /* —— 概况卡 —— */
      .q99-row{display:flex;align-items:center;gap:10px;padding:9px 11px;margin-bottom:7px;
        background:linear-gradient(180deg,#fff,#fef2f2);border:2px solid #fecaca}
      .q99-row-n{flex:1;min-width:0;font-size:13px;font-weight:900;color:#7f1d1d;display:flex;align-items:baseline;gap:7px}
      .q99-row-n i{font-style:normal;font-size:9.5px;color:#b91c1c;letter-spacing:1px}
      .q99-row-st{font-size:10px;font-weight:900;color:#b91c1c;white-space:nowrap}
      .q99-row-st.broke{color:#dc2626}
      .q99-row-st.zero{color:#059669}
      .q99-wk{display:flex;align-items:center;gap:10px;font-size:11.5px;color:#7f1d1d;padding:7px 0;border-bottom:1px dashed #fecaca}
      .q99-wk:last-child{border-bottom:0}
      .q99-wk b{font-size:12.5px;color:#b91c1c}
      .q99-wk-z{flex:1;text-align:right;color:#b91c1c;font-size:10px}
      .q99-note{font-size:11.5px;color:#b91c1c;line-height:2;padding:10px 12px;background:#fef2f2;border:2px dashed #fca5a5}
      .q99-banner{display:flex;align-items:center;gap:12px;margin-top:12px;padding:12px 14px;
        background:linear-gradient(90deg,#fef2f2,#fee2e2);border:3px solid #dc2626}
      .q99-banner b{color:#b91c1c;font-size:13.5px}
      .q99-banner p{font-size:10.5px;color:#b91c1c;margin-top:3px;line-height:1.6}
      /* —— 对决战场（v12.9.46 重做：独行信条统一红白渐变 · 参考市面 JRPG 对决 UI：
            红白天幕 + 日光/流云/光点 + 像素红条纹地坪 + 血条 HUD + 斩击白环 + 受击踉跄 + 胜负横幅）—— */
      .q99-bt{position:relative;font-family:ui-monospace,'Courier New',monospace}
      .q99-bt-stage{position:relative;height:238px;overflow:hidden;border:3px solid #7f1d1d;
        background:linear-gradient(180deg,#f87171 0%,#fb9a8b 14%,#fecaca 30%,#fee2e2 48%,#ffffff 70%,#fff1f2 100%)}
      .q99-bt-stage.shake{animation:q99btshake .34s ease}
      @keyframes q99btshake{0%,100%{transform:translate(0,0)}20%{transform:translate(-4px,2px)}
        45%{transform:translate(4px,-2px)}70%{transform:translate(-3px,-1px)}}
      .q99-bt-sun{position:absolute;top:14px;left:16px;width:30px;height:30px;background:#fde047;border:3px solid #7f1d1d;
        box-shadow:3px 3px 0 rgba(127,29,29,.25);animation:q99btbob 3.4s ease-in-out infinite;z-index:1}
      .q99-bt-cloud{position:absolute;image-rendering:pixelated;opacity:.9;background-size:100% 100%;
        background-repeat:no-repeat;animation:q99btdrift 9s ease-in-out infinite alternate;z-index:1}
      .q99-bt-dot{position:absolute;width:5px;height:5px;background:rgba(255,255,255,.85);
        animation:q99bttwk 2.6s ease-in-out infinite;z-index:1}
      @keyframes q99btbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      @keyframes q99btdrift{from{transform:translateX(0)}to{transform:translateX(16px)}}
      @keyframes q99bttwk{0%,100%{opacity:.2}50%{opacity:.9}}
      .q99-bt-grd{position:absolute;left:0;right:0;bottom:0;height:24px;border-top:4px solid #7f1d1d;
        background:repeating-linear-gradient(90deg,#f87171 0 14px,#ef4444 14px 28px);opacity:.92}
      .q99-bt-grd::after{content:'';position:absolute;left:0;right:0;top:-9px;height:5px;
        background:repeating-linear-gradient(90deg,#fff 0 5px,transparent 5px 10px);opacity:.55}
      .q99-bt-mon3d{position:absolute;left:14%;bottom:27px;perspective:640px;z-index:4}
      .q99-bt-mon3d::after,.q99-bt-hero::after{content:'';position:absolute;left:6%;width:88%;bottom:-8px;height:14px;
        border-radius:50%;background:radial-gradient(closest-side,rgba(80,20,20,.3),rgba(80,20,20,0) 74%)}
      .q99-bt-monin{position:relative;transform-style:preserve-3d;animation:q99btsway 2.8s ease-in-out infinite}
      @keyframes q99btsway{0%,100%{transform:translateY(0) rotateY(-8deg)}50%{transform:translateY(-7px) rotateY(8deg)}}
      .q99-bt-mon3d.atk .q99-bt-monin{animation:q99btatk .42s ease}
      @keyframes q99btatk{0%,100%{transform:translateX(0)}45%{transform:translateX(46px) rotateY(0)}}
      .q99-bt-mon3d.hit .q99-bt-monin{animation:q99bthurt .3s ease}
      @keyframes q99bthurt{0%,100%{transform:translateX(0) rotateY(0)}30%{transform:translateX(10px) rotateY(-6deg)}
        60%{transform:translateX(-6px) rotateY(4deg)}}
      .q99-bt-hero{position:absolute;right:12%;bottom:27px;perspective:640px;z-index:4}
      .q99-bt-heroin{position:relative;transform-style:preserve-3d;animation:q99btsway2 2.8s ease-in-out infinite}
      @keyframes q99btsway2{0%,100%{transform:translateY(0) rotateY(8deg)}50%{transform:translateY(-7px) rotateY(-8deg)}}
      .q99-bt-heroin.hit{animation:q99bthit .34s ease}
      @keyframes q99bthit{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}60%{transform:translateX(5px)}}
      .q99-vg,.q99-vg-arm{position:absolute;inset:0;transform-style:preserve-3d;pointer-events:none}
      .q99-vg-arm{transform-origin:76% 42%}
      .q99-vg-arm.swing{animation:q99swing .6s cubic-bezier(.25,.9,.3,1)}
      @keyframes q99swing{0%{transform:translateZ(0) rotate(0)}38%{transform:translateZ(22px) rotate(-100deg)}
        60%{transform:translateZ(22px) rotate(22deg)}100%{transform:translateZ(0) rotate(0)}}
      .q99-bt-slash{position:absolute;z-index:8;width:26px;height:26px;border-radius:50%;pointer-events:none;
        border:5px solid rgba(255,255,255,.95);animation:q99btslash .45s ease-out forwards}
      @keyframes q99btslash{0%{opacity:.95;transform:scale(.3)}100%{opacity:0;transform:scale(2.8)}}
      .q99-bt-vs{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%) rotate(-4deg);z-index:6;
        font-size:18px;font-weight:900;color:#fff;background:#dc2626;border:3px solid #fff;padding:4px 13px;
        letter-spacing:3px;box-shadow:3px 3px 0 rgba(127,29,29,.35);text-shadow:1px 1px 0 rgba(127,29,29,.6)}
      .q99-hp{position:absolute;top:12px;z-index:6;width:40%}
      .q99-hp.mon{left:3%}.q99-hp.hero{right:3%}
      .q99-hp .nm{font-size:10px;font-weight:900;color:#7f1d1d;letter-spacing:1px;margin-bottom:3px;display:flex;justify-content:space-between}
      .q99-hp .bar{height:13px;background:#450a0a;border:2px solid #7f1d1d;position:relative;box-shadow:2px 2px 0 rgba(127,29,29,.25)}
      .q99-hp .bar i{display:block;height:100%;transition:width .3s ease}
      .q99-hp.mon .bar i{background:linear-gradient(90deg,#f87171,#dc2626)}
      .q99-hp.hero .bar i{background:linear-gradient(90deg,#fde047,#f59e0b);float:right}
      .q99-hp .bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        font-size:8.5px;font-weight:900;color:#fff;text-shadow:1px 1px 0 rgba(0,0,0,.5)}
      .q99-dmg{position:absolute;z-index:9;font-size:14px;font-weight:900;color:#fff;background:#dc2626;
        border:2px solid #fff;padding:1px 7px;box-shadow:2px 2px 0 rgba(127,29,29,.4);pointer-events:none;
        animation:q99dmg 1s ease-out forwards;transform:rotate(-6deg);text-shadow:1px 1px 0 rgba(127,29,29,.6)}
      @keyframes q99dmg{0%{opacity:0;transform:translateY(0) rotate(-6deg) scale(.5)}
        18%{opacity:1;transform:translateY(-10px) rotate(-6deg) scale(1.15)}
        100%{opacity:0;transform:translateY(-56px) rotate(-6deg) scale(1)}}
      .q99-bt-fin{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-4deg);z-index:10;
        font-size:22px;font-weight:900;letter-spacing:4px;color:#fff;background:#7f1d1d;border:3px solid #fff;
        padding:7px 18px;box-shadow:4px 4px 0 rgba(127,29,29,.4);pointer-events:none;white-space:nowrap;
        animation:q99btfin .9s ease-out forwards}
      .q99-bt-fin.win{background:linear-gradient(90deg,#f59e0b,#d97706)}
      @keyframes q99btfin{0%{opacity:0;transform:translate(-50%,-50%) rotate(-4deg) scale(.4)}
        18%{opacity:1;transform:translate(-50%,-50%) rotate(-4deg) scale(1.15)}
        30%,100%{opacity:1;transform:translate(-50%,-50%) rotate(-4deg) scale(1)}}
      .q99-bt-acts{display:flex;gap:9px;margin-top:11px}
      .q99-bt-acts button{flex:1;font-size:13px;font-weight:900;padding:9px 0;border-radius:0;cursor:pointer}
      .q99-bt-atk{background:linear-gradient(90deg,#dc2626,#b91c1c);color:#fff;border:2px solid #7f1d1d;
        box-shadow:3px 3px 0 rgba(127,29,29,.3)}
      .q99-bt-atk:active{transform:translate(1px,1px);box-shadow:1px 1px 0 rgba(127,29,29,.3)}
      .q99-bt-flee{background:#fff;color:#b91c1c;border:2px solid #dc2626;box-shadow:3px 3px 0 rgba(220,38,38,.18)}
      .q99-bt-flee:active{transform:translate(1px,1px)}
      .q99-bt-log{margin-top:9px;font-size:10.5px;font-weight:800;color:#7f1d1d;text-align:center;min-height:16px;
        background:#fff;border:2px dashed #fca5a5;padding:5px 8px}
    </style>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">👹</span>戒断数据 · 四魔封印
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">反向打卡 · 魔物活着 = 执念活着</span>
        <button class="btn btn-ghost btn-sm p99-title-btn" onclick="App.navBack()">← 返回上一页</button>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">正常打卡记录你<b>未破戒了多少天</b>；这里<b>反向记录</b>——四只魔物的活性：破戒喂养它（+1），当日未破打卡饿瘪它（-1）。活性涨到 5，魔物立即冲破封印，你必须用自己的战士与它对决；每周一 0 点，每只活性保持 0 的魔物为你赢得 <b>5 宝石</b>。</div>
    </div>
    <div class="q99-wrap">
      <div class="q99-sky" id="q99Sky">
        <span class="q99-hint">🌙 四魔封印台 · 拖拽旋转 / 单击挑逗 / 长按 1 秒查属性</span>
        <span class="q99-moon"></span>
        ${stars}
        ${cloud ? `<i class="q99-cloud" style="top:14%;left:6%;width:52px;height:17px;background-image:url('${cloud}')"></i>
        <i class="q99-cloud" style="top:30%;right:9%;width:40px;height:13px;background-image:url('${cloud}');animation-delay:2.2s"></i>
        <i class="q99-cloud" style="top:66%;left:38%;width:46px;height:15px;background-image:url('${cloud}');animation-delay:4s;opacity:.34"></i>` : ''}
        ${mons}
      </div>
      ${brokeN ? `<div class="q99-banner">
        <span style="font-size:26px">🔥</span>
        <div style="flex:1"><b>${brokeN} 只魔物已冲破封印！</b><p>表情猖狂、活性满格——封印已被打破，唯有对决能重铸。点魔物下方「⚔️ 对决」出战你的战士。</p></div>
      </div>` : ''}
      <div class="card" style="margin-top:14px">
        <div class="card-title"><span class="ico">🚫</span>封印概况</div>
        ${statRows}
        <div class="q99-note">💧 活性 0–5 · 初始 3：破戒 +1 / 当日未破打卡 −1 · 满 5 冲破封印（唯有对决重铸）<br>
        🦥 惰魔：次日回顾时前一日<b>无运动/学习</b>打卡 → 活性 +1<br>
        💰 贪魔：前一日<b>花销超 200 元</b> → 活性 +1<br>
        💎 每周一 0 点：每只活性保持 0 的魔物 → <b>+5 宝石</b>（当前 ${zeroN}/4 只沉眠）</div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-title"><span class="ico">💎</span>周结算 · 距下次 ${cd} 天</div>
        ${weekRows}
        <div style="font-size:10.5px;color:#b91c1c;margin-top:6px">结算时快照各魔物活性（冲破封印中的魔物不计）· 宝石入宠物钱包</div>
      </div>
      ${this._nat99StatusCard ? this._nat99StatusCard() : ''}
      <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>
    </div>`;
  },

  // ===== 页面交互绑定（渲染后调用）：拖拽旋转 / 单击挑逗 / 长按 1 秒属性 =====
  quit99Bind() {
    const sky = document.getElementById('q99Sky');
    if (!sky) return;
    const states = [];
    sky.querySelectorAll('.q99-mon-3d').forEach(box => {
      if (box.dataset.bound === '1') return;
      box.dataset.bound = '1';
      const root = box.closest('.q99-mon');
      const mon = root.dataset.mon;
      const inner = box.querySelector('.q99-mon-in');
      const st = { ry: 0, rx: 0, drag: false, moved: 0, sx: 0, sy: 0, t0: 0, last: performance.now(), lp: 0, ph: Math.random() * 6.28 };
      states.push({ st, box, inner });
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const apply = () => { inner.style.transform = 'rotateX(' + st.rx.toFixed(1) + 'deg) rotateY(' + st.ry.toFixed(1) + 'deg)'; };
      const cancelLp = () => { if (st.lp) { clearTimeout(st.lp); st.lp = 0; } };
      box.addEventListener('pointerdown', (e) => {
        st.drag = true; st.moved = 0; st.sx = e.clientX; st.sy = e.clientY; st.t0 = performance.now(); st.last = st.t0;
        box.classList.add('drag'); cancelLp();
        st.lp = setTimeout(() => {         // 长按 1 秒 → 属性面板
          st.lp = 0; if (!st.drag) return;
          st.drag = false; box.classList.remove('drag');
          App._quit99Info(mon);
        }, 1000);
        try { box.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      });
      box.addEventListener('pointermove', (e) => {
        if (!st.drag) return;
        const dx = e.clientX - st.sx, dy = e.clientY - st.sy;
        st.moved += Math.abs(dx) + Math.abs(dy);
        if (st.moved > 10) cancelLp();
        st.ry += dx * .55; st.rx = clamp(st.rx - dy * .28, -24, 24);
        st.sx = e.clientX; st.sy = e.clientY; st.last = performance.now();
        apply();
      });
      const end = () => {
        cancelLp();
        if (!st.drag) return;
        st.drag = false; box.classList.remove('drag');
        if (st.moved < 7 && performance.now() - st.t0 < 400) App._quit99Poke(mon, root);  // 单击 → 挑逗
      };
      box.addEventListener('pointerup', end);
      box.addEventListener('pointercancel', () => { cancelLp(); st.drag = false; box.classList.remove('drag'); });
      box.addEventListener('contextmenu', (e) => e.preventDefault());
      apply();
    });
    // 闲置：缓慢环视 + 轻微摇摆（离开页面自动停）
    const loop = (t) => {
      if (!document.getElementById('q99Sky')) return;
      states.forEach(o => {
        if (!o.st.drag && t - o.st.last > 2800) {
          const ty = Math.sin(t / 1700 + o.st.ph) * 13, tx = Math.sin(t / 2900 + o.st.ph) * 4;
          o.st.ry += (ty - o.st.ry) * .022; o.st.rx += (tx - o.st.rx) * .022;
          o.inner.style.transform = 'rotateX(' + o.st.rx.toFixed(1) + 'deg) rotateY(' + o.st.ry.toFixed(1) + 'deg)';
        }
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  // 单击挑逗：抖动 + 随机台词气泡（冲破封印中的魔物只会狞叫）+ 各魔专属恶魔音效
  _quit99Poke(mon, root) {
    try {
      const d = this._quit99Data();
      const def = this._quit99Defs()[mon];
      const m = d.mons[mon];
      const line = m.broke ? '放我出来！！' : def.taunts[Math.floor(Math.random() * def.taunts.length)];
      // v12.9.46 四魔专属恶魔音效：淫妖媚语 / 娱狂笑 / 惰低吼 / 贪嘶吼（冲破封印 = 叫声 + 狞笑闷响）
      try { this._sfx99 && this._sfx99('mon-' + mon); } catch (e) {}
      if (m.broke) { try { this._sfx99 && this._sfx99('thud'); } catch (e) {} }
      root.classList.remove('poke'); void root.offsetWidth; root.classList.add('poke');
      const b = root.querySelector('.q99-bubble');
      if (b) {
        b.textContent = line;
        b.classList.add('show');
        clearTimeout(root._qbt);
        root._qbt = setTimeout(() => b.classList.remove('show'), 2100);
      }
    } catch (e) {}
  },
  // ===== 长按属性面板 =====
  _quit99Info(mon) {
    const d = this._quit99Data();
    const def = this._quit99Defs()[mon];
    if (!def) return;
    const m = d.mons[mon];
    const today = Store.today();
    const url = window.__quit99Url ? window.__quit99Url(mon, m.broke ? 'mad' : 'calm') : '';
    const streak = (cid) => { try { return Store.habit99CleanStreak(cid); } catch (e) { return 0; } };
    const todayCard = (cid) => { try { const v = Store.habit99Get(today, cid); return !!(v && v.clean); } catch (e) { return false; } };
    let srcRows = '';
    def.cards.forEach(cid => {
      const c = ((CONFIG.habitCards || []).find(x => x.id === cid)) || {};
      srcRows += `<div class="q99-row" style="margin-bottom:6px">
        <span class="q99-row-n">${c.ico || '🎴'} ${c.name || cid}<i>未破连续 ${streak(cid)} 天</i></span>
        <span class="q99-row-st${todayCard(cid) ? ' zero' : ''}">${todayCard(cid) ? '✅ 今日未破' : '今日未记录'}</span>
      </div>`;
    });
    if (def.k === 'duo') {
      const grew = ['fitness', 'studyMorning', 'studyNoon', 'studyEvening', 'focus'].some(id => this._quit99Touched(today, id));
      srcRows += `<div class="q99-row" style="margin-bottom:6px">
        <span class="q99-row-n">🏃 运动 / 学习<i>成长绑定</i></span>
        <span class="q99-row-st${grew ? ' zero' : ' broke'}">${grew ? '✅ 今日已打卡' : '⚠️ 今日未打卡'}</span>
      </div>`;
    }
    if (def.k === 'tan') {
      const sp = this._quit99DaySpend(today);
      srcRows += `<div class="q99-row" style="margin-bottom:6px">
        <span class="q99-row-n">💰 今日消费<i>上限 200 元</i></span>
        <span class="q99-row-st${sp > 200 ? ' broke' : ' zero'}">${Math.round(sp * 100) / 100} 元${sp > 200 ? ' · 超额 ⚠️' : ''}</span>
      </div>`;
    }
    this._modal({
      title: `${def.ico} ${def.n} · ${def.tag}`,
      body: `
      <div style="display:flex;gap:13px;align-items:flex-start">
        ${url ? `<span role="img" aria-label="${def.n}" style="display:block;width:92px;height:109px;flex-shrink:0;image-rendering:pixelated;background:url('${url}') center/100% 100% no-repeat"></span>` : ''}
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;color:#7f1d1d;line-height:1.75;font-family:ui-monospace,monospace">${def.d}</div>
          <div style="margin-top:9px;display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;font-weight:900;color:#b91c1c">活性</span>
            <span class="q99-pips${m.act >= 4 ? ' hi' : ''}" style="display:inline-flex;gap:3px">${'<i class="on"></i>'.repeat(m.act)}${'<i></i>'.repeat(5 - m.act)}</span>
            <b style="font-size:12px;color:#b91c1c">${m.act} / 5</b>
          </div>
          <div style="margin-top:8px;font-size:11px;font-weight:900;color:${m.broke ? '#dc2626' : m.act <= 0 ? '#059669' : '#b91c1c'}">
            ${m.broke ? '🔥 状态：冲破封印——表情猖狂，正在叫嚣' : m.act <= 0 ? '💤 状态：沉眠（周一 0 点结算 +5 宝石）' : '🚫 状态：封印中'}
          </div>
        </div>
      </div>
      <style>
        .q99-row{display:flex;align-items:center;gap:10px;padding:8px 10px;background:linear-gradient(180deg,#fff,#fef2f2);border:2px solid #fecaca}
        .q99-row-n{flex:1;min-width:0;font-size:12.5px;font-weight:900;color:#7f1d1d;display:flex;align-items:baseline;gap:6px}
        .q99-row-n i{font-style:normal;font-size:9.5px;color:#b91c1c}
        .q99-row-st{font-size:10px;font-weight:900;color:#b91c1c;white-space:nowrap}
        .q99-row-st.broke{color:#dc2626}.q99-row-st.zero{color:#059669}
        .q99-pips{display:inline-flex;gap:2px}
        .q99-pips i{width:7px;height:7px;border-radius:50%;background:#fee2e2;border:1px solid #fca5a5}
        .q99-pips i.on{background:#fbbf24;border-color:#fde68a}
        .q99-pips.hi i.on{background:#f87171;border-color:#fecaca}
      </style>
      <div style="margin-top:12px;font-size:11px;font-weight:900;color:#b91c1c">⛓ 破戒源（喂养 / 饿瘪它）</div>
      <div style="margin-top:7px">${srcRows}</div>
      <div class="q99-note" style="font-size:10.5px;color:#b91c1c;line-height:1.9;padding:9px 11px;background:#fef2f2;border:2px dashed #fca5a5;margin-top:9px">
        ${def.cardNote}${def.growNote ? '<br>' + def.growNote : ''}${def.costNote ? '<br>' + def.costNote : ''}<br>
        通用规定：当日联动卡无任何打卡记录 → 次日回顾时活性 +1（懈怠即喂养）<br>
        活性满 5 立即冲破封印 → 必须与你的战士对决（胜利后重新封印，活性回落 3）
      </div>`,
      actions: m.broke
        ? [{ label: '⚔️ 立即对决', primary: true, onClick: () => { setTimeout(() => this.quit99Battle(mon), 60); } }, { label: '关闭' }]
        : [{ label: '关闭' }],
    });
  },

  // ===== 冲破封印 · 对决（用你自己的战士：RPG 等级/属性/装备 · 胜利重铸封印 +10 经验）=====
  quit99Battle(mon) {
    const d = this._quit99Data();
    const def = this._quit99Defs()[mon];
    const m = d.mons[mon];
    if (!m || !m.broke) { this._flash('该魔物仍在封印中，无需对决'); return; }
    const r = this._rpg99Data();
    const prog = this._rpg99ExpProg(r.exp);
    const at = this._rpg99Attrs(prog.lv);
    const gb = this._rpg99GearBonus(r);
    const H = { hp: at.hp + gb.hp, max: at.hp + gb.hp, atk: at.atk + gb.atk, def: at.def + gb.def };
    const M = { hp: 0, max: 80 + prog.lv * 4, atk: 6 + Math.floor(prog.lv * .5) };
    M.hp = M.max;
    // 魔物（狂暴态）+ 战士体素
    const MS = 5, pxM = Math.round(MS * 22), hM = Math.round(MS * 26);
    window.__quit99VoxCache = window.__quit99VoxCache || {};
    let monVox = window.__quit99VoxCache[mon + 'mad' + pxM];
    if (!monVox) { monVox = window.__quit99Voxels ? window.__quit99Voxels(mon, 'mad', MS) : ''; window.__quit99VoxCache[mon + 'mad' + pxM] = monVox; }
    let heroHtml = '';
    try {
      const p = Store.getProfile ? Store.getProfile() : {};
      const female = p.gender === '女';
      const S = 5, px = Math.round(S * 24), hh = Math.round(S * 32);
      const vox = window.__rpg99HeroVoxels ? window.__rpg99HeroVoxels(!!female, this._rpg99HeroPal(), S) : null;
      if (vox) heroHtml = `<div class="q99-bt-hero" style="width:${px}px;height:${hh}px"><div class="q99-bt-heroin" id="q99BtHero">
          <div class="q99-vg">${vox.body}</div><div class="q99-vg q99-vg-arm" id="q99BtArm">${vox.arm}</div>
        </div></div>`;
    } catch (e) {}
    if (!heroHtml) heroHtml = `<div class="q99-bt-hero"><div class="q99-bt-heroin" id="q99BtHero" style="font-size:40px">🧙</div></div>`;
    // v12.9.46 战场布景：独行信条红白渐变天幕 + 日光/流云/光点（与个人中心同款像素装饰）
    const btCloud = window.__rpg99CloudUrl ? window.__rpg99CloudUrl() : '';
    this._modal({
      title: `⚔️ 封印对决 · ${def.n}`,
      body: `
      <div class="q99-bt">
        <div class="q99-bt-stage" id="q99BtStage">
          <span class="q99-bt-sun"></span>
          ${btCloud ? `<i class="q99-bt-cloud" style="top:30%;left:7%;width:46px;height:15px;background-image:url('${btCloud}')"></i>
          <i class="q99-bt-cloud" style="top:18%;right:9%;width:36px;height:12px;background-image:url('${btCloud}');animation-delay:2.6s"></i>` : ''}
          <span class="q99-bt-dot" style="top:9%;left:49%"></span>
          <span class="q99-bt-dot" style="top:15%;left:53%;animation-delay:.9s"></span>
          <span class="q99-bt-dot" style="top:24%;left:47%;animation-delay:1.7s"></span>
          <div class="q99-hp mon"><div class="nm"><span>${def.n}</span><span id="q99MmHpTxt">${M.hp}/${M.max}</span></div>
            <div class="bar"><i id="q99MmHpBar" style="width:100%"></i><span>活性 5 · 狂暴</span></div></div>
          <div class="q99-hp hero"><div class="nm"><span id="q99HrHpTxt">${H.hp}/${H.max}</span><span>战士 Lv.${prog.lv}</span></div>
            <div class="bar"><i id="q99HrHpBar" style="width:100%"></i><span>HP</span></div></div>
          <div class="q99-bt-mon3d" id="q99BtMon" style="width:${pxM}px;height:${hM}px"><div class="q99-bt-monin">${monVox}</div></div>
          ${heroHtml}
          <span class="q99-bt-vs">VS</span>
          <span class="q99-bt-grd"></span>
        </div>
        <div class="q99-bt-acts">
          <button class="q99-bt-atk" id="q99BtAtk">⚔️ 攻击</button>
          <button class="q99-bt-flee" id="q99BtFlee">🏃 撤退（魔物保持狂暴）</button>
        </div>
        <div class="q99-bt-log" id="q99BtLog">魔物已冲破封印——点「攻击」挥出你的剑！（魔物每 3 次攻击会反击一次）</div>
      </div>`,
      actions: [],
    });
    // v12.9.46 对决开场：魔物专属恶魔咆哮（四魔叫声各不同 · 音效引擎合成）
    try { this._sfx99 && this._sfx99('mon-' + mon); } catch (e) {}
    // —— 战斗逻辑（模态框为同步 DOM，渲染后直接绑定）——
    const stage = document.getElementById('q99BtStage');
    if (!stage) return;
    const monBox = document.getElementById('q99BtMon');
    const heroBox = document.getElementById('q99BtHero');
    const arm = document.getElementById('q99BtArm');
    const log = document.getElementById('q99BtLog');
    const atkBtn = document.getElementById('q99BtAtk');
    const fleeBtn = document.getElementById('q99BtFlee');
    let lock = false, over = false, hits = 0;
    const bar = (id, v, mx) => { const el = document.getElementById(id); if (el) el.style.width = Math.max(0, Math.round(v / mx * 100)) + '%'; };
    const txt = (id, s) => { const el = document.getElementById(id); if (el) el.textContent = s; };
    const upd = () => { bar('q99MmHpBar', M.hp, M.max); bar('q99HrHpBar', H.hp, H.max); txt('q99MmHpTxt', Math.max(0, M.hp) + '/' + M.max); txt('q99HrHpTxt', Math.max(0, H.hp) + '/' + H.max); };
    const dmgPop = (left, dmg) => {
      const s = document.createElement('span');
      s.className = 'q99-dmg';
      s.textContent = '-' + dmg;
      s.style.left = left;
      s.style.top = (80 + Math.random() * 50) + 'px';
      stage.appendChild(s);
      setTimeout(() => s.remove(), 1000);
    };
    // v12.9.46 胜负横幅（市面游戏结算式弹入：🏆 封印重铸 / 💔 战士倒下）
    const finPop = (txt, win) => {
      const b = document.createElement('span');
      b.className = 'q99-bt-fin' + (win ? ' win' : '');
      b.textContent = txt;
      stage.appendChild(b);
    };
    // v12.9.46 斩击白环（打击反馈三件套之二）
    const slashPop = () => {
      const sl = document.createElement('span');
      sl.className = 'q99-bt-slash';
      sl.style.left = (monBox.offsetLeft + monBox.offsetWidth * .5 - 13) + 'px';
      sl.style.top = (monBox.offsetTop + monBox.offsetHeight * .26) + 'px';
      stage.appendChild(sl);
      setTimeout(() => sl.remove(), 470);
    };
    const closeBattle = () => { const ov = stage.closest('.wild-overlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); };
    const win = () => {
      over = true; lock = true;
      const d2 = this._quit99Data();
      d2.mons[mon].act = 3; d2.mons[mon].broke = false;
      this._quit99Save(d2);
      const r2 = this._rpg99Data();
      r2.exp = (r2.exp || 0) + 10;
      this._rpg99Save(r2);
      if (log) log.textContent = `🏆 封印重铸！${def.n}活性回落至 3 · 战士经验 +10`;
      finPop('🏆 封印重铸', true);
      this._flash(`🏆 ${def.n}被重新封印！经验 +10`);
      setTimeout(() => { closeBattle(); try { this.render_workbench(); } catch (e) {} }, 1000);
    };
    const lose = () => {
      over = true; lock = true;
      if (log) log.textContent = `💔 战士倒下了……${def.n}仍在狂暴中，养好伤再来（等级/装备越高越稳）`;
      finPop('💔 战士倒下', false);
      this._flash(`💔 对决失败——${def.n}保持狂暴，可再次挑战`);
      setTimeout(closeBattle, 1100);
    };
    atkBtn.addEventListener('click', () => {
      if (lock || over) return;
      lock = true;
      hits++;
      // v12.9.45 战斗音效：挥剑"嗖"（音效引擎 96-perm99.js · 总开关在权限管理页）
      try { this._sfx99 && this._sfx99('swing'); } catch (e) {}
      if (arm) { arm.classList.remove('swing'); void arm.offsetWidth; arm.classList.add('swing'); }
      const dmg = Math.max(1, H.atk + Math.floor(Math.random() * Math.max(2, Math.floor(H.atk * .5))));
      M.hp -= dmg;
      // v12.9.46 打击反馈：斩击白环 + 魔物受击踉跄（跟在挥剑音效后 · 市面 JRPG 三件套）
      slashPop();
      monBox.classList.remove('hit'); void monBox.offsetWidth; monBox.classList.add('hit');
      // v12.9.46 魔物受击：专属恶魔惨叫（延迟跟在挥剑声后）
      setTimeout(() => { try { this._sfx99 && this._sfx99('mon-' + mon); } catch (e) {} }, 300);
      dmgPop((monBox.offsetLeft + monBox.offsetWidth * .55 + (Math.random() * 24 - 12)) + 'px', dmg);
      upd();
      setTimeout(() => {
        if (M.hp <= 0) return win();
        if (hits % 3 === 0) {                       // 魔物反击
          monBox.classList.add('atk');
          stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');  // 战场震屏
          try { this._sfx99 && this._sfx99('mon-' + mon); } catch (e) {}   // v12.9.46 反击咆哮
          const md = Math.max(1, M.atk + Math.floor(Math.random() * 3) - H.def);
          H.hp -= md;
          setTimeout(() => {
            try { this._sfx99 && this._sfx99('thud'); } catch (e) {}    // v12.9.45 受击闷响
            if (heroBox) { heroBox.classList.remove('hit'); void heroBox.offsetWidth; heroBox.classList.add('hit'); }
            dmgPop((heroBox ? heroBox.offsetLeft + heroBox.offsetWidth * .5 : 220) + 'px', md);
            upd();
            monBox.classList.remove('atk');
            if (H.hp <= 0) return lose();
            if (log) log.textContent = `⚔️ 你挥剑造成 ${dmg} 伤害 · ${def.n}反击 ${md} 伤害`;
            lock = false;
          }, 240);
        } else {
          if (log) log.textContent = `⚔️ 你挥剑造成 ${dmg} 伤害（魔物 HP ${Math.max(0, M.hp)}/${M.max}）`;
          lock = false;
        }
      }, 360);
    });
    fleeBtn.addEventListener('click', () => {
      if (over) return;
      this._flash(`🏃 已撤退——${def.n}保持狂暴，随时可再战`);
      closeBattle();
    });
    upd();
  },
});
