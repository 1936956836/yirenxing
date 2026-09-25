// 112-poop99.js —— v12.9.64 【如厕记录 · 拉了吗】独立页面（G2-生活基础 · 肠胃健康记录）
// [功能组] G2-生活基础（肠胃观察 · 手账治愈风 · 唯一一套 UI）
//
// 用户指令要点：
//   · 入口：长按【记录】页黏土沙盘场景中的房子（房子A/房子B 均可）1000ms 进入；
//     热区判定复用沙盘画布 81×72 网格坐标（与 91-record99.js 的点击交互同一套几何换算，
//     但零改动其代码——全局事件委托挂在本模块，按下点落在房子像素区才计时）。
//   · 独立新页面：本模块为全新文件；仅做最小注册（45-workbench 路由一行 case ·
//     index.html/sw.js 脚本清单），健康档案/体检翻书/感染科密码箱/病症网格/Padwise 内核/
//     Vosk 语音识别/背单词 TTS 全部零改动。
//   · 唯一 UI：手账治愈风（奶白底 · 薄荷浅绿主题 · 大圆角卡片 · 柔和软阴影），
//     主角为坐在白色马桶上的橙色小河马（SVG + CSS 帧动画，无位图资源）。
//   · 四状态：空闲待机 → 努力进行中（计时+用力动画）→ 记录填写表单 → 保存完成。
//   · 滑动结束（滑到阈值才生效，防误触）；超 5 分钟温和提醒；
//     「尽力了，没拉出来」允许无排便结束。
//   · 表单：开始时间微调 + 耗时自动回填 / 形状5 / 颜色8 / 数量5 / 感受4 / 气味选填；
//     校验：形状或感受至少选一项。
//   · 数据：localStorage 本账号键独立存储；保存时同步写入【健康档案】就医数据
//     （Store.addMedicalRecord 官方存储接口 · 35-health.js 展示层零改动）；
//     7 天肠胃简易折线趋势图 + 历史列表（详情/单条删除）。
//   · 隐私：仅账号 1936956836@qq.com 可进入（长按热区静默无效 · 页面路由守卫直接弹回），
//     与现有感染科白名单同一判定源（App._c99.user.email）。
Object.assign(App, {

  // ==================== 隐私门控（白名单 · 与健康敏感区同源判定）====================
  _po99Auth() {
    try {
      const u = this._c99 && this._c99.user;
      return !!(u && u.email && String(u.email).trim().toLowerCase() === '1936956836@qq.com');
    } catch (e) { return false; }
  },
  _po99Key() { return 'po99_recs_1936956836'; },     // 数据键（仅白名单账号可达本模块）
  _po99Load() {
    try { return JSON.parse(localStorage.getItem(this._po99Key()) || '[]') || []; } catch (e) { return []; }
  },
  _po99SaveList(list) {
    try { localStorage.setItem(this._po99Key(), JSON.stringify(list.slice(0, 2000))); } catch (e) {}
  },

  // ==================== 入口：长按沙盘房子 1 秒（全局事件委托 · 不改 91-record99 一行）====================
  _po99Wire() {
    if (window.__po99Wired) return;
    window.__po99Wired = true;
    // 房子热区（画布 81×72 网格 · 与沙盘绘制坐标对齐；房子B 下沿收到 44，避开邮筒 y44+ 热区）
    const HOUSES = [
      { x: 7,  y: 28, w: 18, h: 20 },   // 房子A（左）：x9-24 屋檐 · y30-46 墙体
      { x: 55, y: 29, w: 17, h: 15 },   // 房子B（右）：x56-72 屋檐 · y31-46 墙体（截到 y44）
    ];
    let lp = null, sx = 0, sy = 0, heldBox = null;
    const clear = () => { if (lp) { clearTimeout(lp); lp = null; } heldBox = null; };
    document.addEventListener('pointerdown', (e) => {
      const box = e.target && e.target.closest ? e.target.closest('#rec99DioBox') : null;
      if (!box) return;
      const c = box.querySelector('canvas.rec99-dio-canvas');
      if (!c) return;
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // 与 91-record99._rec99BindIo 相同的 contain 网格换算（只读几何，不改其代码）
      const sc = Math.min(r.width / 81, r.height / 72);
      const ox = (r.width - 81 * sc) / 2, oy = (r.height - 72 * sc) / 2;
      const gx = (e.clientX - r.left - ox) / sc, gy = (e.clientY - r.top - oy) / sc;
      const onHouse = HOUSES.some(h => gx >= h.x && gx < h.x + h.w && gy >= h.y && gy < h.y + h.h);
      if (!onHouse) return;
      sx = e.clientX; sy = e.clientY; heldBox = box;
      lp = setTimeout(() => {
        lp = null;
        if (!App._po99Auth()) return;                    // 非白名单账号：入口静默无效（模块对其不可见）
        heldBox.__po99Hold = true;                       // 吞掉紧随的 click（防误触发沙盘自带交互）
        try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
        try { App._sfx99 && App._sfx99('liquid'); } catch (_) {}
        try { App.gotoWb('poop99'); } catch (e2) {}
        setTimeout(() => { if (heldBox) heldBox.__po99Hold = false; }, 400);
      }, 1000);                                          // 全局统一长按阈值：1000ms
    });
    document.addEventListener('pointermove', (e) => {
      if (!lp) return;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) clear();   // 手指滑动 = 取消
    });
    document.addEventListener('pointerup', clear);
    document.addEventListener('pointercancel', clear);
    document.addEventListener('click', (e) => {
      const box = e.target && e.target.closest ? e.target.closest('#rec99DioBox') : null;
      if (box && box.__po99Hold) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  },

  // ==================== 状态机（idle 空闲 | run 进行中 | form 表单 | done 完成 | hist 历史）====================
  _po99Phase: 'idle',
  _po99StartTs: 0,             // 本次开始时间戳（ms）
  _po99Tick: null,             // 1s 计时器
  _po99Reminded: false,        // 5 分钟久坐提醒（每次记录只弹一次）
  _po99Draft: null,            // 表单草稿（形状/颜色/数量/感受/气味）
  _po99Last: null,             // 刚保存的记录（完成态展示）
  _po99SavedOk: true,          // 健康档案写入结果

  _wbPoop99(wb, W) {
    this._po99Wire();
    if (!this._po99Auth()) {                                   // 路由守卫：非白名单直接弹回记录页
      try { this.gotoWb('record'); } catch (e) {}
      return '';
    }
    const ph = this._po99Phase;
    if (ph === 'run') {
      this._po99TickStart();                                  // 重进页面恢复计时刷新
      setTimeout(() => this._po99SlideWire(), 0);              // 滑动按钮在 run 态渲染后才存在——渲染后绑定
    }
    const st = ph === 'hist' ? 'idle' : ph;                    // 河马动画态：hist 时回空闲
    return `<div class="po99-page">
      <div class="po99-head">
        <button class="btn btn-ghost btn-sm" onclick="App._po99Leave()">← 返回</button>
        <div class="po99-head-t"><b>如厕记录</b><span>LA LE MA · 肠胃手账</span></div>
        <button class="btn btn-ghost btn-sm" onclick="App._po99Hist()">查看历史</button>
      </div>

      <div class="po99-card po99-stage">
        <div class="po99-dio">
          ${this._po99Hippo(st)}
        </div>
        <div class="po99-time" id="po99Time">${this._po99TimeHtml()}</div>
        <div class="po99-tip" id="po99Tip">${this._po99TipHtml()}</div>
      </div>

      <div id="po99Body">${this._po99BodyHtml()}</div>
    </div>`;
  },

  // ==================== 河马 · 四态 SVG（空闲/努力/放松/开心 · CSS 帧动画驱动）====================
  _po99Hippo(st) {
    const cls = 'po99-hippo st-' + (st === 'run' ? 'effort' : st === 'form' ? 'relaxed' : st === 'done' ? 'happy' : 'idle');
    return `<svg class="${cls}" viewBox="0 0 200 170" role="img" aria-label="坐在马桶上的橙色小河马">
      <!-- 白色马桶：水箱 + 盖沿 + 便池（薄荷水色） -->
      <g class="toilet">
        <rect x="70" y="14" width="60" height="46" rx="9" fill="#FFFFFF" stroke="#E8E2D5" stroke-width="2.5"/>
        <rect x="76" y="20" width="11" height="34" rx="5" fill="#F3EFE6"/>
        <rect x="60" y="56" width="80" height="13" rx="6.5" fill="#FBF8F1" stroke="#E8E2D5" stroke-width="2"/>
        <path d="M62 68 Q60 96 78 104 L122 104 Q140 96 138 68 Z" fill="#FFFFFF" stroke="#E8E2D5" stroke-width="2.5"/>
        <ellipse cx="100" cy="86" rx="26" ry="9" fill="#CDEDE4"/>
        <path d="M82 104 L118 104 L112 126 Q100 132 88 126 Z" fill="#F7F3EA" stroke="#E8E2D5" stroke-width="2"/>
        <ellipse cx="100" cy="130" rx="30" ry="7" fill="#EAE4D6"/>
      </g>
      <!-- 橙色小河马（身体前倾由 .st-effort transform 控制） -->
      <g class="hippo">
        <circle cx="60" cy="46" r="8" fill="#F6A15C"/><circle cx="140" cy="46" r="8" fill="#F6A15C"/>
        <circle cx="60" cy="46" r="4" fill="#F2865C"/><circle cx="140" cy="46" r="4" fill="#F2865C"/>
        <ellipse cx="100" cy="84" rx="45" ry="40" fill="#F6A15C"/>
        <ellipse cx="100" cy="94" rx="30" ry="24" fill="#F8B87E"/>
        <rect x="76" y="56" width="48" height="27" rx="13" fill="#F8B87E"/>
        <ellipse cx="92" cy="67" rx="4" ry="5.5" fill="#E08A4F"/><ellipse cx="108" cy="67" rx="4" ry="5.5" fill="#E08A4F"/>
        <ellipse class="blush" cx="73" cy="66" rx="7.5" ry="4.5" fill="#F49E9E"/>
        <ellipse class="blush" cx="127" cy="66" rx="7.5" ry="4.5" fill="#F49E9E"/>
        <g class="eyes">
          <circle cx="84" cy="49" r="7" fill="#FFFFFF"/><circle cx="116" cy="49" r="7" fill="#FFFFFF"/>
          <circle class="pupil" cx="84" cy="50" r="3.2" fill="#3E3A38"/><circle class="pupil" cx="116" cy="50" r="3.2" fill="#3E3A38"/>
        </g>
        <g class="brows">
          <path class="brow" d="M77 40 L91 43" stroke="#3E3A38" stroke-width="3" stroke-linecap="round"/>
          <path class="brow" d="M123 40 L109 43" stroke="#3E3A38" stroke-width="3" stroke-linecap="round"/>
        </g>
        <g class="mouth"><path d="M92 77 Q100 82 108 77" stroke="#C97F5C" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>
        <rect x="78" y="116" width="17" height="14" rx="7" fill="#F6A15C"/>
        <rect x="105" y="116" width="17" height="14" rx="7" fill="#F6A15C"/>
      </g>
      <!-- 努力态：头顶动态小汗滴 -->
      <g class="sweat">
        <path d="M148 34 q4 6 0 9 q-4 -3 0 -9" fill="#9BD8E8"/>
        <path d="M56 30 q4 6 0 9 q-4 -3 0 -9" fill="#9BD8E8"/>
        <path d="M150 48 q3 5 0 7.5 q-3 -2.5 0 -7.5" fill="#9BD8E8"/>
      </g>
      <!-- 开心态：爱心与星光（向上飘浮） -->
      <g class="hearts">
        <text x="40" y="40" font-size="15">💗</text>
        <text x="148" y="30" font-size="12">✨</text>
        <text x="30" y="70" font-size="10">✨</text>
      </g>
    </svg>`;
  },

  // 计时/提示区（按状态）
  _po99TimeHtml() {
    if (this._po99Phase === 'run') return this._po99Fmt((Date.now() - this._po99StartTs) / 1000 | 0);
    return this._po99Phase === 'form' ? '刚刚完成一次记录' : this._po99Phase === 'done' ? '记录已保存' : '准备开始记录';
  },
  _po99TipHtml() {
    const ph = this._po99Phase;
    if (ph === 'run') return '小河马正在努力… 滑动下方按钮结束';
    if (ph === 'form') return '小河马休息啦——顺手把感受填一下吧';
    if (ph === 'done') return '小河马很满意，肠胃轻松了一格～';
    if (ph === 'hist') return '每一次记录，都是身体的悄悄话';
    return '轻轻一点，开始记录';
  },
  _po99Fmt(sec) {
    const s = Math.max(0, sec | 0);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(s / 3600 | 0)}:${p(s / 60 % 60 | 0)}:${p(s % 60)}`;
  },

  // ==================== 主体区（四状态 + 历史）====================
  _po99BodyHtml() {
    const ph = this._po99Phase;
    if (ph === 'run') {
      return `<button type="button" class="po99-start" onclick="App._po99Cancel()">不记了，结束</button>
        <div class="po99-note">尽力了，没拉出来也没关系——同样可以结束记录哦</div>
        <div class="po99-slide" id="po99Slide">
          <div class="po99-slide-fill"></div>
          <span class="po99-slide-txt">滑动结束</span>
          <div class="po99-knob" id="po99Knob">👉</div>
        </div>`;
    }
    if (ph === 'form') return this._po99FormHtml();
    if (ph === 'done') return this._po99DoneHtml();
    if (ph === 'hist') return this._po99HistHtml();
    return `<button type="button" class="po99-start" onclick="App._po99Begin()">开始记录</button>
      <div class="po99-note">记录会同步进健康档案，帮你看见 7 天的肠胃小趋势</div>`;
  },

  // —— ① 开始：立刻计时 + 切努力动画 ——
  _po99Begin() {
    if (this._po99Phase !== 'idle') return;
    this._po99StartTs = Date.now();
    this._po99Reminded = false;
    this._po99Phase = 'run';
    this._po99TickStart();
    this.gotoWb('poop99');
  },
  _po99TickStart() {
    if (this._po99Tick) return;
    this._po99Tick = setInterval(() => {
      const el = document.getElementById('po99Time');
      if (this._po99Phase === 'run') {
        const sec = (Date.now() - this._po99StartTs) / 1000 | 0;
        if (el) el.textContent = this._po99Fmt(sec);
        if (sec >= 300 && !this._po99Reminded) {              // 超 5 分钟温和提醒（每次记录一次）
          this._po99Reminded = true;
          this._modal('⏳ 坐得有点久，记得起来活动一下哦', `
            <div style="font-size:13px;color:#475569;line-height:2">
              已经 ${this._po99Fmt(sec).slice(3)} 啦——久坐容易腿麻，起身走走、喝口水，
              想继续记录的话随时回来，小河马不着急～
            </div>`, [{ label: '好，知道了', primary: true }]);
        }
      }
    }, 1000);
  },
  _po99TickStop() { if (this._po99Tick) { clearInterval(this._po99Tick); this._po99Tick = null; } },

  // —— ② 滑动到阈值 → 结束记录 → 进表单 ——
  _po99EndRec() {
    if (this._po99Phase !== 'run') return;
    this._po99TickStop();
    const st = new Date(this._po99StartTs);
    const p = (n) => String(n).padStart(2, '0');
    this._po99Draft = {
      date: `${st.getFullYear()}-${p(st.getMonth() + 1)}-${p(st.getDate())}`,
      sh: st.getHours(), sm: Math.floor(st.getMinutes() / 5) * 5,
      dur: Math.max(10, Math.round(((Date.now() - this._po99StartTs) / 1000) / 10) * 10),   // 耗时自动回填（10s 粒度）
      shape: '', color: '', amount: '', feeling: '', smell: '',
      startTs: this._po99StartTs, endTs: Date.now(),
    };
    this._po99Phase = 'form';
    this.gotoWb('poop99');
  },
  _po99Cancel() {                                             // 「不记了，结束」：放弃本次不保存
    if (this._po99Phase !== 'run') return;
    this._po99TickStop();
    this._po99Phase = 'idle';
    this._po99Draft = null;
    this.gotoWb('poop99');
  },

  // —— 滑动按钮（滑到 72% 阈值才生效 · 防误触）——
  _po99SlideWire() {
    const track = document.getElementById('po99Slide');
    const knob = document.getElementById('po99Knob');
    if (!track || !knob || knob.dataset.wired) return;
    knob.dataset.wired = '1';
    const max = () => Math.max(0, track.clientWidth - knob.clientWidth - 6);
    let drag = false, baseX = 0, cur = 0;
    const setX = (x) => {
      cur = x;
      knob.style.transform = `translateX(${x}px)`;
      track.classList.toggle('near', x >= max() * .72);
    };
    knob.addEventListener('pointerdown', (e) => {
      drag = true; baseX = e.clientX - cur;
      try { knob.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    knob.addEventListener('pointermove', (e) => {
      if (!drag) return;
      setX(Math.max(0, Math.min(max(), e.clientX - baseX)));
    });
    const done = () => {
      if (!drag) return;
      drag = false;
      const hit = cur >= max() * .72;                         // 必须滑到阈值
      setX(0);
      if (hit) App._po99EndRec();
    };
    knob.addEventListener('pointerup', done);
    knob.addEventListener('pointercancel', done);
  },

  // ==================== ③ 记录填写表单 ====================
  _po99Opt(field, val, ico, label) {
    const on = this._po99Draft && this._po99Draft[field] === val;
    return `<button type="button" class="po99-chip${on ? ' on' : ''}" onclick="App._po99Pick('${field}','${val}')">
      ${ico ? `<i class="po99-ci">${ico}</i>` : ''}<span>${label}</span></button>`;
  },
  _po99ColOpt(val, hex, label) {
    const on = this._po99Draft && this._po99Draft.color === val;
    return `<button type="button" class="po99-chip po99-col${on ? ' on' : ''}" onclick="App._po99Pick('color','${val}')">
      <i class="po99-dot" style="background:${hex}"></i><span>${label}</span></button>`;
  },
  _po99FormHtml() {
    const d = this._po99Draft || {};
    const p = (n) => String(n).padStart(2, '0');
    const hOpt = (h) => `<option value="${h}" ${d.sh === h ? 'selected' : ''}>${p(h)} 时</option>`;
    const mOpt = (m) => `<option value="${m}" ${d.sm === m ? 'selected' : ''}>${p(m)} 分</option>`;
    let hs = ''; for (let i = 0; i < 24; i++) hs += hOpt(i);
    let ms = ''; for (let i = 0; i < 60; i += 5) ms += mOpt(i);
    const dur = this._po99Fmt(d.dur || 0);
    const canSave = !!(d.shape || d.feeling);
    return `<div class="po99-card po99-form">
      <div class="po99-frow">
        <div class="po99-fl">🕐 时间信息</div>
        <div class="po99-timec">
          <select class="po99-sel" id="po99SelH">${hs}</select>
          <select class="po99-sel" id="po99SelM">${ms}</select>
          <div class="po99-dur">
            <span>耗时 <b id="po99Dur">${dur}</b></span>
            <button type="button" onclick="App._po99DurAdj(-60)">−1分</button>
            <button type="button" onclick="App._po99DurAdj(60)">+1分</button>
          </div>
        </div>
      </div>
      <div class="po99-frow"><div class="po99-fl">💩 便便形状</div><div class="po99-chips">
        ${this._po99Opt('shape', '硬球', '🍡', '一颗颗硬球')}
        ${this._po99Opt('shape', '结块', '🌭', '香肠状结块')}
        ${this._po99Opt('shape', '香蕉', '🍌', '光滑长条香蕉状')}
        ${this._po99Opt('shape', '软糊', '🥣', '软糊状')}
        ${this._po99Opt('shape', '稀水', '💧', '稀水样')}
      </div></div>
      <div class="po99-frow"><div class="po99-fl">🎨 颜色</div><div class="po99-chips">
        ${this._po99ColOpt('白色', '#F4F4F0', '白色')}
        ${this._po99ColOpt('淡黄', '#F0E3B0', '淡黄色')}
        ${this._po99ColOpt('浅棕', '#D8B98A', '浅棕')}
        ${this._po99ColOpt('褐色', '#B98D5F', '褐色')}
        ${this._po99ColOpt('深棕', '#8A6142', '深棕')}
        ${this._po99ColOpt('墨绿', '#55684A', '墨绿')}
        ${this._po99ColOpt('黑色', '#3A3A3C', '黑色')}
        ${this._po99ColOpt('红色', '#C25B4E', '红色')}
      </div></div>
      <div class="po99-frow"><div class="po99-fl">📈 数量</div><div class="po99-chips">
        ${this._po99Opt('amount', '极少', '·', '极少量')}
        ${this._po99Opt('amount', '偏少', '••', '偏少')}
        ${this._po99Opt('amount', '正常', '•••', '正常')}
        ${this._po99Opt('amount', '偏多', '••••', '偏多')}
        ${this._po99Opt('amount', '过量', '•••••', '过量')}
      </div></div>
      <div class="po99-frow"><div class="po99-fl">💭 排便感受</div><div class="po99-chips">
        ${this._po99Opt('feeling', '顺畅', '😌', '顺畅轻松')}
        ${this._po99Opt('feeling', '困难', '😣', '用力困难')}
        ${this._po99Opt('feeling', '急迫', '🚨', '急迫感强')}
        ${this._po99Opt('feeling', '未尽', '🤏', '意犹未尽')}
      </div></div>
      <div class="po99-frow"><div class="po99-fl">👃 气味 <em>（选填）</em></div><div class="po99-chips">
        ${this._po99Opt('smell', '无明显', '🌤', '无明显')}
        ${this._po99Opt('smell', '轻微', '🙂', '轻微')}
        ${this._po99Opt('smell', '明显', '😐', '明显')}
        ${this._po99Opt('smell', '浓烈', '😵', '浓烈')}
      </div></div>
      <div class="po99-fbtns">
        <button type="button" class="po99-btn ghost" onclick="App._po99Drop()">放弃</button>
        <button type="button" class="po99-btn main" id="po99Save" ${canSave ? '' : 'disabled'} onclick="App._po99Save()">保存记录</button>
      </div>
      <div class="po99-note">形状或感受至少选一项即可保存 · 其余都可留空</div>
    </div>`;
  },
  _po99Pick(field, val) {
    const d = this._po99Draft;
    if (!d) return;
    // 先把用户已微调的开始时间收进草稿（防局部重渲染丢失下拉选择）
    const sh = document.getElementById('po99SelH'), sm = document.getElementById('po99SelM');
    if (sh) d.sh = +sh.value;
    if (sm) d.sm = +sm.value;
    d[field] = (d[field] === val ? '' : val);                 // 再点一次 = 取消选择
    const box = document.getElementById('po99Body');
    if (box) box.innerHTML = this._po99FormHtml();             // 局部重渲染（保持表单即时反馈）
  },
  _po99DurAdj(delta) {
    const d = this._po99Draft;
    if (!d) return;
    d.dur = Math.max(10, (d.dur || 0) + delta);
    const el = document.getElementById('po99Dur');
    if (el) el.textContent = this._po99Fmt(d.dur);
  },
  _po99Drop() {                                                // 放弃：不保存回空闲
    this._po99Draft = null;
    this._po99Phase = 'idle';
    this.gotoWb('poop99');
  },

  // ==================== ④ 保存（本地列表 + 写入健康档案 + 7 天趋势）====================
  _po99Score(rec) {                                           // 肠胃舒适分（供趋势折线 · 0-100）
    const byShape = { '硬球': 32, '结块': 48, '香蕉': 88, '软糊': 55, '稀水': 26 };
    const byFeel = { '顺畅': 10, '困难': -12, '急迫': -6, '未尽': -4 };
    let s = (byShape[rec.shape] != null ? byShape[rec.shape] : 60) + (byFeel[rec.feeling] || 0);
    return Math.max(5, Math.min(100, Math.round(s)));
  },
  _po99Sev(rec) {                                             // 映射健康档案严重度 1-5（分越高越轻松）
    const s = this._po99Score(rec);
    return s >= 80 ? 1 : s >= 62 ? 2 : s >= 44 ? 3 : s >= 26 ? 4 : 5;
  },
  _po99Summary(rec) {                                         // 温柔肠胃小结（本地规则 · 不依赖网络）
    let t = '';
    if (rec.shape === '香蕉' && (!rec.feeling || rec.feeling === '顺畅')) t = '今天的肠胃表现很棒，一路绿灯——继续保持规律作息和充足水分呀～';
    else if (rec.shape === '硬球') t = '有点干硬费劲呢——多喝温水，加些蔬果粗粮，给肠胃一点温柔的时间。';
    else if (rec.shape === '结块') t = '稍微偏干了些——水分和膳食纤维再补一点点就好。';
    else if (rec.shape === '软糊') t = '稍微偏软，别太担心——吃点清淡好消化的，观察一两天。';
    else if (rec.shape === '稀水') t = '偏稀了——留意饮食卫生和腹部保暖，吃清淡些。若持续一两天，记得看医生。';
    else if (rec.feeling === '顺畅') t = '过程还算顺畅——规律的作息正在悄悄回报你。';
    else if (rec.feeling === '困难') t = '这次有点辛苦——别急，多喝水多走动，肠胃会慢慢找回节奏。';
    else t = '已经记下啦——每一次记录，都是在好好照顾自己。';
    if (rec.color === '黑色' || rec.color === '红色') t += '（这次颜色偏深——如果连续出现，建议就医看看，安心最重要。）';
    return t;
  },
  _po99Save() {
    const d = this._po99Draft;
    if (!d) return;
    if (!d.shape && !d.feeling) { this._flash('形状或排便感受至少选一项再保存哦'); return; }
    const sh = document.getElementById('po99SelH'), sm = document.getElementById('po99SelM');
    const hh = sh ? +sh.value : d.sh, mm = sm ? +sm.value : d.sm;    // 用户微调后的开始时间
    const rec = {
      id: 'po_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date: d.date, time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      startTs: d.startTs, endTs: d.endTs, dur: d.dur,
      shape: d.shape, color: d.color, amount: d.amount, feeling: d.feeling, smell: d.smell,
      score: 0, createdAt: Date.now(),
    };
    rec.score = this._po99Score(rec);
    const list = this._po99Load();
    list.unshift(rec);
    this._po99SaveList(list);
    // —— 同步写入【健康档案 · 就医数据】（Store 官方接口 · 展示层零改动）——
    const bits = [
      rec.shape && `形状：${rec.shape}`, rec.color && `颜色：${rec.color}`,
      rec.amount && `数量：${rec.amount}`, rec.feeling && `感受：${rec.feeling}`,
      rec.smell && `气味：${rec.smell}`, `耗时：${this._po99Fmt(rec.dur)}`,
    ].filter(Boolean).join('｜');
    let ok = true;
    try {
      const r = Store.addMedicalRecord({
        type: 'visit', disease: '如厕记录（拉了吗）',
        date: rec.date, time: rec.time, severity: this._po99Sev(rec),
        note: bits + '（来源：拉了吗 · 如厕记录）', tags: ['拉了吗'],
      });
      ok = !!(r && r.ok);
    } catch (e) { ok = false; }
    this._po99Last = rec;
    this._po99SavedOk = ok;
    this._po99Draft = null;
    this._po99Phase = 'done';
    this.gotoWb('poop99');
  },

  // —— 完成态：开心河马 + 小结 + 7 天折线 + 按钮 ——
  _po99DoneHtml() {
    const rec = this._po99Last;
    if (!rec) return this._po99BodyHtmlIdle();
    const chart = this._po99Chart();
    return `<div class="po99-card po99-done">
      <div class="po99-done-t">✨ 记录好啦</div>
      <div class="po99-summary">${this.esc(this._po99Summary(rec))}${this._po99SavedOk ? '' : '<br><span class="po99-warn">（同步健康档案暂时没成功——本地已保存，可稍后在历史里重试）</span>'}</div>
      ${chart}
      <div class="po99-fbtns">
        <button type="button" class="po99-btn ghost" onclick="App._po99Leave()">返回主页</button>
        <button type="button" class="po99-btn main" onclick="App._po99Hist()">查看全部记录</button>
      </div>
    </div>`;
  },
  _po99BodyHtmlIdle() { return `<button type="button" class="po99-start" onclick="App._po99Begin()">开始记录</button>`; },

  // 7 天肠胃趋势折线（SVG · 每日舒适分均值 + 当日次数）
  _po99Chart() {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      days.push({ key, label: i === 0 ? '今天' : i === 1 ? '昨天' : `${dt.getMonth() + 1}.${dt.getDate()}`, dt });
    }
    const list = this._po99Load();
    const stats = days.map(dy => {
      const rs = list.filter(r => r.date === dy.key);
      return { ...dy, n: rs.length, score: rs.length ? Math.round(rs.reduce((a, r) => a + (+r.score || 60), 0) / rs.length) : null };
    });
    const W = 300, H = 96, L = 26, R = 10, T = 12, B = 22;    // 绘图区
    const px = (i) => L + (W - L - R) * (stats.length === 1 ? 0 : i / (stats.length - 1));
    const py = (v) => T + (H - T - B) * (1 - v / 100);
    const pts = stats.map((s, i) => s.score == null ? null : [px(i), py(s.score)]);
    const seg = [];
    let cur = [];
    pts.forEach(pt => { if (pt) cur.push(pt); else if (cur.length) { seg.push(cur); cur = []; } });
    if (cur.length) seg.push(cur);
    const lines = seg.map(ss => ss.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')).join(' ');
    const dots = pts.filter(Boolean).map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="#3DA98F"/>`).join('');
    const xl = stats.map((s, i) => `<text x="${px(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#94a3b8">${s.label}</text>`).join('');
    const cnt = stats.map((s, i) => s.n ? `<text x="${px(i).toFixed(1)}" y="${py(s.score)}" text-anchor="middle" font-size="9" dy="-7" fill="#E28F44" font-weight="700">${s.n}</text>` : '').join('');
    const grids = [0, 50, 100].map(v => `<line x1="${L}" y1="${py(v)}" x2="${W - R}" y2="${py(v)}" stroke="#EAE4D6" stroke-width="1" stroke-dasharray="${v ? '3 3' : ''}"/>`).join('');
    return `<div class="po99-chart">
      <div class="po99-chart-t">🌱 近 7 天肠胃趋势 <em>（数字 = 当日次数 · 折线 = 舒适度）</em></div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="近7天肠胃趋势折线图">
        ${grids}
        ${lines ? `<path d="${lines}" fill="none" stroke="#3DA98F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>` : ''}
        ${dots}${cnt}${xl}
        ${pts.every(p => !p) ? `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="10" fill="#B7AF9E">近 7 天还没有记录</text>` : ''}
      </svg></div>`;
  },

  // ==================== 历史（列表 / 详情 / 删除）====================
  _po99Hist() { this._po99Phase = 'hist'; this.gotoWb('poop99'); },
  _po99HistHtml() {
    const list = this._po99Load();
    if (!list.length) return `<div class="po99-card po99-empty">🗓 还没有历史记录<br><span>长按沙盘房子进来，从第一次记录开始吧</span></div>`;
    const rows = list.slice(0, 100).map(r => `
      <button type="button" class="po99-hrow" onclick="App._po99Detail('${r.id}')">
        <i class="po99-hico">${{ '硬球': '🍡', '结块': '🌭', '香蕉': '🍌', '软糊': '🥣', '稀水': '💧' }[r.shape] || '📝'}</i>
        <div class="po99-hmid">
          <b>${this.esc(r.date)} ${this.esc(r.time || '')}</b>
          <span>${this.esc(r.shape ? { '硬球': '一颗颗硬球', '结块': '香肠状结块', '香蕉': '光滑香蕉状', '软糊': '软糊状', '稀水': '稀水样' }[r.shape] : '未记形状')}${r.feeling ? ' · ' + ({ '顺畅': '顺畅轻松', '困难': '用力困难', '急迫': '急迫感强', '未尽': '意犹未尽' }[r.feeling] || '') : ''}</span>
        </div>
        <em>${this._po99Fmt(r.dur || 0).slice(3)}</em>
      </button>`).join('');
    return `<div class="po99-card po99-hist"><div class="po99-chart-t">🗓 全部记录（${list.length} 条）</div>${rows}
      <div class="po99-note">点任意一条可查看详情 · 详情里可删除</div></div>`;
  },
  _po99Detail(id) {
    const r = this._po99Load().find(x => x.id === id);
    if (!r) { this._flash('这条记录不见了'); return; }
    const F = (v, unit) => v ? v + (unit || '') : '—';
    this._modal('📝 记录详情', `
      <div class="po99-detail">
        <div>🗓 <b>${this.esc(r.date)} ${this.esc(r.time || '')}</b>　⏱ 耗时 <b>${this._po99Fmt(r.dur || 0)}</b></div>
        <div>💩 形状：<b>${F({ '硬球': '一颗颗硬球', '结块': '香肠状结块', '香蕉': '光滑长条香蕉状', '软糊': '软糊状', '稀水': '稀水样' }[r.shape] || '')}</b></div>
        <div>🎨 颜色：<b>${F(r.color)}</b>　📈 数量：<b>${F(r.amount)}</b></div>
        <div>💭 感受：<b>${F({ '顺畅': '顺畅轻松', '困难': '用力困难', '急迫': '急迫感强', '未尽': '意犹未尽' }[r.feeling] || '')}</b></div>
        <div>👃 气味：<b>${F(r.smell)}</b>　🌱 舒适度：<b>${r.score || '—'} / 100</b></div>
      </div>`, [
      { label: '删除这条', onClick: () => this._po99Del(id) },
      { label: '关闭', primary: true },
    ]);
  },
  _po99Del(id) {
    this._modal('🗑️ 删除这条记录？', `
      <div style="font-size:13px;color:#475569;line-height:2">删除后无法恢复（健康档案里对应的那条就医记录需要手动删除）。</div>`, [
      { label: '取消' },
      { label: '删除', primary: true, onClick: () => {
        this._po99SaveList(this._po99Load().filter(x => x.id !== id));
        this._flash('已删除该条记录');
        this.gotoWb('poop99');
      } },
    ]);
  },

  // ==================== 离开（回记录页；进行中也不打断真实计时）====================
  _po99Leave() {
    if (this._po99Phase === 'hist' || this._po99Phase === 'done') {
      this._po99Phase = 'idle';                               // 历史/完成 → 回本页空闲态
      this._po99Last = null;
      this.gotoWb('poop99');
      return;
    }
    if (this._po99Phase === 'form') { this._po99Draft = null; this._po99Phase = 'idle'; }
    if (this._po99Phase === 'run') this._po99TickStop();       // 计时停止（startTs 保留，重进可继续）
    this.gotoWb('record');
  },
});
