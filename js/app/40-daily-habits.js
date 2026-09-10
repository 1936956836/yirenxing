// 40-daily-habits.js —— 睡眠 / 三安卡 / 饮食 / 热量统计 / 卫生 / 运动 / 学习 / 奖励 / 红线自检（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G2-生活基础（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
Object.assign(App, {
  // ====== 睡眠 ======
  render_sleep() {
    const rec = this.todayRec();
    const n = CONFIG.sleep.night;
    // 推算睡眠时长：优先用 hours；若未填但有 start/end，则按时间差自动推算
    const nightH = this._inferSleepHours(rec.sleep.night);
    const noonH = this._inferSleepHours(rec.sleep.noon);
    const totalH = nightH + noonH;
    const p5Back = `<div style="margin:14px 0 8px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    let html = p5Back + `
      <div class="tip-box info">💤 23:00-03:00是免疫黄金修复期，建议23:00前入睡。长期熬夜会直接降低特定抵抗力，请重视规律作息。</div>
      ${this.render3DBrain(totalH, nightH, noonH)}
      <div class="card">
        <div class="card-title"><span class="ico">🌙</span>晚间睡眠<span class="sub">目标${n.bedStart}-${n.bedEnd}</span></div>
        <div class="field">
          <label>入睡时间</label>
          <input type="time" class="input" id="nsStart" value="${rec.sleep.night.start}" onchange="App.saveSleep('night')">
        </div>
        <div class="field">
          <label>起床时间</label>
          <input type="time" class="input" id="nsEnd" value="${rec.sleep.night.end}" onchange="App.saveSleep('night')">
        </div>
        <div class="field">
          <label>睡眠时长(小时)${nightH !== (rec.sleep.night.hours||0) ? ' · 已按时间自动推算为 '+nightH+'h' : ''}</label>
          <input type="number" class="input" id="nsHours" step="0.5" min="0" max="14" value="${rec.sleep.night.hours}" onchange="App.saveSleep('night')">
        </div>
        <div class="field">
          <label>睡眠质量(1-5)</label>
          <input type="number" class="input" id="nsQuality" min="1" max="5" value="${rec.sleep.night.quality || 3}" onchange="App.saveSleep('night')">
        </div>
        <button class="btn ${rec.sleep.night.slept?'btn-ghost':'btn-primary'}" onclick="App.toggleSlept('night')">${rec.sleep.night.slept?'✓ 已记录':'标记已睡'}</button>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">☀️</span>午间睡眠<span class="sub">${CONFIG.sleep.noon.start}-${CONFIG.sleep.noon.end} 0.5-1h</span></div>
        <div class="field">
          <label>入睡时间</label>
          <input type="time" class="input" id="noStart" value="${rec.sleep.noon.start}" onchange="App.saveSleep('noon')">
        </div>
        <div class="field">
          <label>起床时间</label>
          <input type="time" class="input" id="noEnd" value="${rec.sleep.noon.end}" onchange="App.saveSleep('noon')">
        </div>
        <div class="field">
          <label>睡眠时长(小时)${noonH !== (rec.sleep.noon.hours||0) && noonH > 0 ? ' · 已按时间自动推算为 '+noonH+'h' : ''}</label>
          <input type="number" class="input" id="noHours" step="0.5" min="0" max="3" value="${rec.sleep.noon.hours}" onchange="App.saveSleep('noon')">
        </div>
        <button class="btn ${rec.sleep.noon.slept?'btn-ghost':'btn-primary'}" onclick="App.toggleSlept('noon')">${rec.sleep.noon.slept?'✓ 已记录':'标记已睡'}</button>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">📜</span>睡眠准则</div>
    `;
    CONFIG.sleep.rules.forEach(r => {
      html += `<div class="list-row"><div class="li-ico">✓</div><div class="li-body"><div class="li-ds">${this.esc(r)}</div></div></div>`;
    });
    html += '</div>';
    // 三安卡窗口打卡（6 小任务）
    html += `
      <div class="card">
        <div class="card-title"><span class="ico">🛌</span>三安卡 · 北京时间窗口打卡</div>
        ${this._punchBtnHTML({windowName:'sleepMorning', done: rec.sleep.morning && rec.sleep.morning.wake, btnText:'🌅 早安打卡', onclick:"App.wakeSleepMorning()", extraLabel:'记录起床'})}
        ${this._punchBtnHTML({windowName:'sleepNoon',   done: rec.sleep.noon && rec.sleep.noon.slept,  btnText:'😴 午安打卡', onclick:"App.toggleNoonSleep()", extraLabel:'午睡 15~45 分钟为佳'})}
        ${this._punchBtnHTML({windowName:'sleepNight',  done: rec.sleep.night && rec.sleep.night.slept, btnText:'🌙 晚安打卡', onclick:"App.toggleNightSleepDone()", extraLabel:'记录入睡时间'})}
        ${this._punchBtnHTML({windowName:'sleepNight',  done: rec.sleep.beforeNoScreen===true, btnText:'📵 睡前 30 分钟不看屏幕', onclick:"App.toggleSleepBeforeNoScreen()", extraLabel:'和晚安卡共用 21:00-23:00 窗口'})}
        ${this._punchBtnHTML({windowName:'sleepNoon',   done: Number(rec.sleep.quality||0)>=3, btnText:'⭐ 睡眠质量≥3 星', onclick:"void 0", extraLabel:`当前 ${rec.sleep.quality||0}/5`})}
        ${this._punchBtnHTML({windowName:'sleepNight',  done: rec.sleep.night && rec.sleep.night.inBedBefore23===true, btnText:'⏰ 23:00 前上床', onclick:"void 0", extraLabel:'记录在睡眠打卡内'})}
      </div>
    `;
    document.getElementById('view-sleep').innerHTML = html;
  },
  // 由入睡/起床时间自动推算睡眠小时数（处理跨夜，如 23:00→07:00 = 8h）
  _inferSleepHours(seg) {
    if (!seg) return 0;
    if (seg.hours && seg.hours > 0) return Number(seg.hours);
    if (!seg.start || !seg.end) return 0;
    const [sh, sm] = seg.start.split(':').map(Number);
    const [eh, em] = seg.end.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return 0;
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin <= startMin) endMin += 24 * 60; // 跨夜
    return Math.round((endMin - startMin) / 60 * 10) / 10;
  },
  // 3D 大脑：按总睡眠时长驱动状态（充足发光 / 不足灰暗）
  // 拟态 CSS3D + 多层 SVG（左右半球 + 沟回 + 高光）
  _brainState(totalH) {
    // < 5h 严重不足（红暗）；5-7h 不足（黄）；7-9h 充足（绿发光）；>9h 过度（蓝亮）
    if (totalH <= 0) return { level: 0, label: '未记录', color: '#94a3b8', glow: 0, hue: 'gray', mood: '😴 等待入睡数据' };
    if (totalH < 5) return { level: 1, label: '严重不足', color: '#ef4444', glow: 4, hue: 'red', mood: '🤯 脑雾·反应迟钝·免疫崩溃' };
    if (totalH < 7) return { level: 2, label: '不足', color: '#f59e0b', glow: 8, hue: 'amber', mood: '😵 疲倦·注意力下降' };
    if (totalH < 9) return { level: 3, label: '充足', color: '#22c55e', glow: 18, hue: 'green', mood: '🧠 神清气爽·记忆巩固' };
    return { level: 4, label: '过补', color: '#3b82f6', glow: 22, hue: 'blue', mood: '💎 脑力满格·注意别赖床' };
  },
  render3DBrain(totalH, nightH, noonH) {
    const st = this._brainState(totalH);
    // 大脑沟回路径（拟态，多层 SVG，旋转时会显出立体感）
    // 主脑色按状态变；充足时加 glow 滤镜；不足时灰暗 + 抖动
    const brainFill = st.hue === 'gray' ? '#cbd5e1'
      : st.hue === 'red' ? '#fca5a5'
      : st.hue === 'amber' ? '#fcd34d'
      : st.hue === 'green' ? '#86efac'
      : '#93c5fd';
    const brainStroke = st.hue === 'gray' ? '#64748b'
      : st.hue === 'red' ? '#b91c1c'
      : st.hue === 'amber' ? '#b45309'
      : st.hue === 'green' ? '#15803d'
      : '#1d4ed8';
    const glowFilter = st.glow > 0
      ? `filter: drop-shadow(0 0 ${st.glow}px ${st.color}) drop-shadow(0 0 ${st.glow*1.6}px ${st.color});`
      : '';
    const animClass = st.level === 1 ? ' brain-shake' : st.level === 2 ? ' brain-slow' : ' brain-float';
    // 沟回（gyri）随机拟态线条
    const gyri = `
      <path d="M70,40 Q80,50 75,60 Q70,70 80,78" stroke="${brainStroke}" stroke-width="1.4" fill="none" opacity="0.5"/>
      <path d="M68,55 Q78,62 72,72 Q66,80 76,86" stroke="${brainStroke}" stroke-width="1.2" fill="none" opacity="0.45"/>
      <path d="M130,40 Q120,50 125,60 Q130,70 120,78" stroke="${brainStroke}" stroke-width="1.4" fill="none" opacity="0.5"/>
      <path d="M132,55 Q122,62 128,72 Q134,80 124,86" stroke="${brainStroke}" stroke-width="1.2" fill="none" opacity="0.45"/>
      <path d="M85,30 Q90,42 82,52" stroke="${brainStroke}" stroke-width="1" fill="none" opacity="0.4"/>
      <path d="M115,30 Q110,42 118,52" stroke="${brainStroke}" stroke-width="1" fill="none" opacity="0.4"/>
    `;
    return `
      <div class="card brain-card brain-${st.hue}">
        <div class="card-title"><span class="ico">🧠</span>3D 脑水平建模 <span class="sub">睡眠时长 → 大脑修复状态</span></div>
        <div class="brain-stage">
          <div class="brain-3d${animClass}" style="${glowFilter}">
            <svg class="brain-svg" viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="brainGrad" cx="40%" cy="35%" r="70%">
                  <stop offset="0%" stop-color="#fff" stop-opacity="0.6"/>
                  <stop offset="60%" stop-color="${brainFill}" stop-opacity="0.95"/>
                  <stop offset="100%" stop-color="${brainStroke}" stop-opacity="0.9"/>
                </radialGradient>
                <radialGradient id="brainShine" cx="35%" cy="25%" r="30%">
                  <stop offset="0%" stop-color="#fff" stop-opacity="0.85"/>
                  <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
                </radialGradient>
              </defs>
              <!-- 左半球 -->
              <path d="M100,38 C75,30 50,38 48,58 C42,72 52,92 70,96 C82,98 92,92 98,82 C100,72 96,55 100,42 Z"
                fill="url(#brainGrad)" stroke="${brainStroke}" stroke-width="2"/>
              <!-- 右半球 -->
              <path d="M100,38 C125,30 150,38 152,58 C158,72 148,92 130,96 C118,98 108,92 102,82 C100,72 104,55 100,42 Z"
                fill="url(#brainGrad)" stroke="${brainStroke}" stroke-width="2"/>
              <!-- 中线裂 -->
              <path d="M100,38 Q98,58 100,82 Q101,90 100,96" stroke="${brainStroke}" stroke-width="1.4" fill="none" opacity="0.7"/>
              <!-- 沟回 -->
              ${gyri}
              <!-- 高光 -->
              <ellipse cx="78" cy="52" rx="14" ry="9" fill="url(#brainShine)"/>
              <ellipse cx="124" cy="52" rx="14" ry="9" fill="url(#brainShine)"/>
              <!-- 脑干 -->
              <path d="M94,96 Q96,108 92,118 L108,118 Q104,108 106,96 Z" fill="${brainStroke}" opacity="0.8"/>
            </svg>
          </div>
        </div>
        <div class="brain-meta">
          <div class="bm-stat">
            <div class="bm-stat-l">总睡眠</div>
            <div class="bm-stat-v" style="color:${st.color}">${totalH.toFixed(1)}<small>h</small></div>
          </div>
          <div class="bm-stat">
            <div class="bm-stat-l">夜间</div>
            <div class="bm-stat-v">${nightH.toFixed(1)}<small>h</small></div>
          </div>
          <div class="bm-stat">
            <div class="bm-stat-l">午间</div>
            <div class="bm-stat-v">${noonH.toFixed(1)}<small>h</small></div>
          </div>
          <div class="bm-stat">
            <div class="bm-stat-l">脑状态</div>
            <div class="bm-stat-v" style="color:${st.color}">${st.label}</div>
          </div>
        </div>
        <div class="brain-meter">
          <div class="brain-meter-bar brain-meter-fill-${st.level}" style="width:${Math.min(100, (totalH/9)*100)}%"></div>
        </div>
        <div class="brain-mood">${st.mood}</div>
        <div class="tip-box" style="margin-top:8px">🧪 推算依据：填写入睡/起床时间 → 自动按跨夜时间差算时长（无需手填小时）；时长驱动脑色与发光（充足：绿+发光 / 不足：黄暗 / 严重不足：红暗抖动）。手机端可通过 PWA 接入屏幕使用时长，本地用时间记录近似。</div>
      </div>
    `;
  },
  saveSleep(type) {
    const prefix = type === 'night' ? 'ns' : 'no';
    const startStr = document.getElementById(prefix + 'Start').value;
    const patch = {
      start: startStr,
      end: document.getElementById(prefix + 'End').value,
      hours: parseFloat(document.getElementById(prefix + 'Hours').value) || 0,
      quality: type === 'night' ? (parseInt(document.getElementById(prefix + 'Quality').value) || 3) : 0,
      slept: true,
    };
    // night：判断是否 23:00 前上床
    if (type === 'night' && startStr) {
      const [sh, sm] = startStr.split(':').map(Number);
      patch.inBedBefore23 = (sh * 60 + (sm || 0)) <= (23 * 60);
    }
    const upPatch = { [type]: patch };
    // 顶层 quality：夜间质量评分同步到 rec.sleep.quality（napQuality 判定用）
    if (type === 'night') {
      upPatch.quality = patch.quality;
    }
    Store.updateTodayModule('sleep', upPatch);
    this.render_sleep();
    // 触发对应窗口奖励（只在完成态尝试领取，claim 内部会做去重）
    if (type === 'night') {
      setTimeout(() => this._onPunchReward('sleep', 'sleepNight', '晚安打卡'), 80);
      setTimeout(() => this._onPunchReward('sleep', 'napQuality', '睡眠质量≥3 星'), 120);
      if (patch.inBedBefore23) setTimeout(() => this._onPunchReward('sleep', 'sleepSchedule', '23:00 前上床'), 160);
    } else if (type === 'noon') {
      setTimeout(() => this._onPunchReward('sleep', 'sleepNoon', '午安打卡'), 80);
    }
  },
  toggleSlept(type) {
    const rec = this.todayRec();
    const cur = rec.sleep[type];
    cur.slept = !cur.slept;
    Store.updateTodayModule('sleep', { [type]: cur });
    this.render_sleep();
    // 触发对应奖励
    const keyMap = { night: 'sleepNight', noon: 'sleepNoon' };
    const labelMap = { night: '晚安打卡', noon: '午安打卡' };
    if (cur.slept && keyMap[type]) {
      setTimeout(() => this._onPunchReward('sleep', keyMap[type], labelMap[type]), 80);
    }
  },
  // ====== 三安卡窗口打卡动作 ======
  // 早安打卡：记录 morning.wake = true（无需填时间，记录起床动作）
  wakeSleepMorning() {
    const rec = this.todayRec();
    if (!rec.sleep.morning) rec.sleep.morning = {};
    rec.sleep.morning.wake = !rec.sleep.morning.wake;
    if (rec.sleep.morning.wake) {
      const d = Store.beijingDate();
      rec.sleep.morning.wakeTime = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    Store.updateTodayModule('sleep', { morning: rec.sleep.morning });
    this.render_sleep();
    if (rec.sleep.morning.wake) setTimeout(() => this._onPunchReward('sleep', 'sleepMorning', '早安打卡'), 80);
  },
  // 午安打卡：等价于 toggleSlept('noon')
  toggleNoonSleep() {
    this.toggleSlept('noon');
  },
  // 晚安打卡：等价于 toggleSlept('night')
  toggleNightSleepDone() {
    this.toggleSlept('night');
  },
  // 睡前不看屏幕
  toggleSleepBeforeNoScreen() {
    const rec = this.todayRec();
    rec.sleep.beforeNoScreen = !rec.sleep.beforeNoScreen;
    Store.updateTodayModule('sleep', { beforeNoScreen: rec.sleep.beforeNoScreen });
    this.render_sleep();
    if (rec.sleep.beforeNoScreen) setTimeout(() => this._onPunchReward('sleep', 'beforeNoScreen', '睡前 30 分钟不看屏幕'), 80);
  },
  // ====== 饮食 ======
  render_diet() {
    const rec = this.todayRec();
    const wPct = this.pct(rec.diet.water, CONFIG.diet.waterGoal);
    const p5Back = `<div style="margin:14px 0 8px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    let html = p5Back + `
      <div class="tip-box">💧 每日饮水≥2000ml(最低1000ml)，少量多次，单次不超300ml。多补水可加速肌肉增长，防止口干/尿液深黄。</div>
      <div class="card">
        <div class="card-title"><span class="ico">💧</span>今日饮水</div>
        <div class="water-wrap">
          <div class="water-bar"><div class="water-fill" style="width:${wPct}%"></div></div>
          <div class="water-val">${rec.diet.water}ml</div>
        </div>
        <div style="font-size:12px;color:var(--text-soft);margin-top:6px">目标${CONFIG.diet.waterGoal}ml · 最低${CONFIG.diet.waterMin}ml</div>
        <div class="water-btns">
          <button onclick="App.addWater(100)">+100ml</button>
          <button onclick="App.addWater(200)">+200ml</button>
          <button onclick="App.addWater(300)">+300ml</button>
          <button onclick="App.addWater(500)">+500ml</button>
          <button onclick="App.addWater(-100)">-100ml</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">🍽️</span>一日三餐 · 北京时间窗口打卡（打卡成功立即发 2~3 金币）</div>
        ${this._punchBtnHTML({windowName:'breakfast', done: !!rec.diet.meals.breakfast, btnText:'☕ 早餐打卡', onclick:"App.toggleMeal('breakfast')"})}
        ${this._punchBtnHTML({windowName:'lunch',     done: !!rec.diet.meals.lunch,     btnText:'🍚 午餐打卡', onclick:"App.toggleMeal('lunch')"})}
        ${this._punchBtnHTML({windowName:'dinner',    done: !!rec.diet.meals.dinner,    btnText:'🥗 晚餐打卡', onclick:"App.toggleMeal('dinner')"})}
        ${this._punchBtnHTML({windowName:'hlWater',   done: (rec.diet.water||0) >= (CONFIG.diet && CONFIG.diet.waterMin||1500), btnText:'💧 饮水达标（≥1500ml）', onclick:"void 0", extraLabel:`当前 ${rec.diet.water||0}ml`})}
        ${this._punchBtnHTML({windowName:'dinner',    done: !!rec.diet.vegetable,       btnText:'🥬 蔬菜/水果打卡', onclick:"App.toggleDietField('vegetable')", extraLabel:'额外窗口=晚餐窗口复用 · supplement（蛋白粉）也可在此时段打卡'})}
      </div>
    `;
    // 饮食禁忌
    html += `
      <div class="card">
        <div class="card-title"><span class="ico">🚫</span>饮食禁忌</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
    `;
    CONFIG.diet.forbidden.forEach(f => {
      html += `<span class="badge red">${this.esc(f)}</span>`;
    });
    html += '</div></div>';
    // 排便记录卡
    const bowel = rec.diet.bowel || { count: 0, type: '' };
    const bTypes = [
      { id: 'normal', label: '正常便便', icon: '🟫', desc: '成形软硬适中' },
      { id: 'diarrhea', label: '腹泻稀便', icon: '💧', desc: '水样/糊状' },
      { id: 'constipation', label: '便秘硬便', icon: '🪨', desc: '干硬/羊粪状' },
      { id: 'none', label: '今日未排', icon: '⬜', desc: '记录无排便' },
    ];
    html += `
      <div class="card bowel-card">
        <div class="card-title"><span class="ico">🚽</span>今日排便记录</div>
        <div class="field">
          <label>排便次数</label>
          <div class="bowel-count-wrap">
            <button class="bowel-btn" onclick="App.adjBowelCount(-1)">−</button>
            <span class="bowel-count" id="bowelCount">${bowel.count}</span>
            <button class="bowel-btn" onclick="App.adjBowelCount(1)">+</button>
          </div>
        </div>
        <div class="field">
          <label>便便类型</label>
          <div class="bowel-types">
            ${bTypes.map(t => `
              <div class="bowel-type ${bowel.type === t.id ? 'selected' : ''}" onclick="App.setBowelType('${t.id}')">
                <div class="bt-ico">${t.icon}</div>
                <div class="bt-label">${this.esc(t.label)}</div>
                <div class="bt-desc">${this.esc(t.desc)}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="tip-box" style="margin-top:8px">💡 布里斯托分类：正常为第 3-4 型（香肠/光滑软条）。腹泻注意补水补电解质；便秘多吃纤维多喝水多动。</div>
      </div>
    `;
    html += this.renderCalorieTracker();
    // 营养素追踪（依赖热量追踪器已写入的 cals）
    const _rec2 = this.todayRec();
    const _cals2 = this._ensureFoodList(_rec2.diet.calories || {});
    html += this.renderNutrientTracker(_cals2);
    html += this.renderDietSugarCard();
    document.getElementById('view-diet').innerHTML = html;
  },
  adjBowelCount(d) {
    const rec = this.todayRec();
    const bowel = rec.diet.bowel || (rec.diet.bowel = { count: 0, type: '' });
    bowel.count = Math.max(0, (bowel.count || 0) + d);
    Store.updateTodayModule('diet', { bowel });
    this.render_diet();
  },
  setBowelType(t) {
    const rec = this.todayRec();
    const bowel = rec.diet.bowel || (rec.diet.bowel = { count: 0, type: '' });
    bowel.type = (bowel.type === t) ? '' : t;
    Store.updateTodayModule('diet', { bowel });
    this.render_diet();
  },
  // ====== 饮食热量统计 / 增肌追踪 ======
  // 模型：rec.diet.calories = { breakfast:[], lunch:[], dinner:[], snacks:[] },
  // 每条目 { id, text, name, icon, qty, unit, gram, cal },
  // 用户只输入"吃了什么"，后台用 CONFIG.parseFood 解析算热量
  _calUser() {
    const p = Store.getProfile();
    let age = 22;
    if (p.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) {
      age = Math.max(16, Math.floor((Date.now() - new Date(p.birthDate + 'T00:00:00').getTime()) / (365.25 * 86400000)));
    }
    return {
      height: p.height || 170,
      weight: p.weight || 55,
      target: 65,
      age,
      gender: p.gender || 'male',
      bmi: Store.getBMI(),
      mbti: p.mbti || '',
      bmr: Store.getBMR() || 1600,
    };
  },
  _calBmr(u) { return u.gender === 'male' ? (10*u.weight + 6.25*u.height - 5*u.age + 5) : (10*u.weight + 6.25*u.height - 5*u.age - 161); },
  _calMeals() {
    return [
      { id: 'breakfast', label: '早餐', icon: '🌅' },
      { id: 'lunch', label: '午餐', icon: '☀️' },
      { id: 'dinner', label: '晚餐', icon: '🌙' },
      { id: 'snacks', label: '加餐', icon: '🍎' },
    ];
  },
  _ensureFoodList(cals) {
    // 把旧的"每餐一个数字"结构迁移成"每餐一个食物列表"
    if (!cals) cals = {};
    ['breakfast','lunch','dinner','snacks'].forEach(k => {
      const v = cals[k];
      if (v == null) cals[k] = [];
      else if (typeof v === 'number') {
        // 旧数字 → 列表（0 留空，非 0 保留为"自定义"项）
        cals[k] = v > 0 ? [{ id: Store._id(), text: '自定义', name: '自定义', icon: '🍴', qty: 1, unit: '份', gram: 0, cal: v }] : [];
      } else if (!Array.isArray(v)) {
        cals[k] = [];
      }
    });
    return cals;
  },
  _sumMealCal(cals) {
    let total = 0;
    ['breakfast','lunch','dinner','snacks'].forEach(k => {
      (cals[k] || []).forEach(f => { total += Number(f.cal) || 0; });
    });
    return total;
  },
  renderCalorieTracker() {
    const rec = this.todayRec();
    const cals = this._ensureFoodList(rec.diet.calories || {});
    rec.diet.calories = cals;
    const u = this._calUser();
    const bmi = u.weight / Math.pow(u.height / 100, 2);
    const bmr = this._calBmr(u);
    const tdee = bmr * 1.55;          // 中度活动量（训练日）
    const surplusGoal = 300;          // 增肌盈余目标 +300kcal
    const targetCal = tdee + surplusGoal;
    const total = this._sumMealCal(cals);
    const surplus = total - tdee;
    const progress = Math.max(0, Math.min(100, (surplus / surplusGoal) * 100));
    const bmiStatus = bmi < 18.5 ? '偏瘦' : bmi < 24 ? '正常' : bmi < 28 ? '超重' : '肥胖';
    const needGain = u.weight < u.target;
    const meals = this._calMeals();
    const surplusColor = surplus >= surplusGoal ? 'var(--primary)' : surplus > 0 ? '#f59e0b' : 'var(--danger)';
    const surplusText = surplus >= surplusGoal ? '✅ 已达增肌盈余目标！' : surplus > 0 ? '🔥 有热量盈余，继续加油' : needGain ? '⚠️ 热量不足，需多吃以增肌' : '当前为热量缺口';
    // 常见食物速查（取自 foodDB，每类挑几个高频）
    const quickFoods = ['米饭','鸡蛋','鸡胸肉','瘦牛肉','猪里脊','牛奶','酸奶','豆腐','燕麦','红薯','苹果','香蕉','西兰花','面条','馒头','面包']
      .map(n => CONFIG.foodDB.find(f => f.name === n)).filter(Boolean)
      .map(f => ({ name: f.name, unit: `${f.defQty}${f.defUnit}(${(f.defQty*f.pieceGram)}g)`, cal: Math.round(f.kCalPer100g*f.defQty*f.pieceGram/100), icon: f.icon }));
    return `
      <div class="card calorie-tracker">
        <div class="card-title"><span class="ico">🍽️</span>热量与增肌追踪 <span class="sub">身高${u.height} · 体重${u.weight}kg · 目标${u.target}kg</span></div>
        <div class="cal-metrics">
          <div class="cal-m"><div class="cal-m-l">BMI</div><div class="cal-m-v">${bmi.toFixed(1)}</div><div class="cal-m-d">${bmiStatus} · 正常18.5-23.9</div></div>
          <div class="cal-m"><div class="cal-m-l">基础代谢 BMR</div><div class="cal-m-v">${Math.round(bmr)}<small>kcal</small></div><div class="cal-m-d">Mifflin-St Jeor</div></div>
          <div class="cal-m"><div class="cal-m-l">日均消耗 TDEE</div><div class="cal-m-v">${Math.round(tdee)}<small>kcal</small></div><div class="cal-m-d">活动系数1.55</div></div>
          <div class="cal-m"><div class="cal-m-l">增肌目标</div><div class="cal-m-v">${Math.round(targetCal)}<small>kcal</small></div><div class="cal-m-d">TDEE+${surplusGoal}盈余</div></div>
        </div>
        <div class="cal-tip-bar">
          <span class="cal-tip-ico">🧠</span>
          <span>只需写下"我这一餐吃了什么"，后台自动算热量。例：<code>米饭 100g</code> · <code>鸡蛋 2个</code> · <code>牛奶</code>（不写份量按默认 1 份算）</span>
        </div>
        <div class="cal-meals">
          ${meals.map(m => {
            const list = cals[m.id] || [];
            const mealCal = list.reduce((a,b)=>a+(Number(b.cal)||0),0);
            return `
            <div class="cal-meal">
              <div class="cal-meal-h">${m.icon} ${m.label} <span class="cal-meal-cal">${mealCal}kcal</span></div>
              <div class="cal-meal-input">
                <input type="text" class="input cal-food-input" id="foodIn_${m.id}" placeholder="如：米饭100g + 鸡腿1个" onkeydown="if(event.key==='Enter')App.addFood('${m.id}')">
                <button class="btn btn-primary cal-add-btn" onclick="App.addFood('${m.id}')">添加</button>
              </div>
              <div class="cal-food-list">
                ${list.map(f => `
                  <div class="cal-food-item ${f.matched===false?'unmatched':''}">
                    <span class="cf-ico">${f.icon||'🍴'}</span>
                    <span class="cf-name">${this.esc(f.text)}</span>
                    <span class="cf-detail">${f.matched===false ? '未识别(可手填热量)' : (this.esc(f.name) + (f.qty ? f.qty + (f.unit||'') + '·' + f.gram + 'g' : ''))}</span>
                    <span class="cf-cal">${f.cal}kcal</span>
                    <button class="cf-del" onclick="App.removeFood('${m.id}','${f.id}')" title="删除">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
        <div class="cal-sum-row">
          <div>今日合计：<b id="calTotal">${Math.round(total)}</b> kcal</div>
          <div>目标 ${Math.round(targetCal)} kcal</div>
        </div>
        <div class="cal-surplus">
          <div class="cal-surplus-h">增肌热量盈余（目标 +${surplusGoal}kcal）</div>
          <div class="cal-bar"><div class="cal-bar-fill" id="calSbFill" style="width:${progress.toFixed(0)}%;background:${surplusColor}"></div></div>
          <div class="cal-surplus-v"><span id="calSbVal">${surplus > 0 ? '+' : ''}${Math.round(surplus)}kcal (${progress.toFixed(0)}%)</span> · <span style="color:${surplusColor}">${surplusText}</span></div>
        </div>
        <div class="cal-foods">
          <div class="cal-foods-h">📚 常见食物热量速查（点击可填入早餐栏，可改份量）</div>
          <div class="cal-foods-grid">
            ${quickFoods.map(f => `<div class="cal-food" title="${f.name} ${f.unit} 约 ${f.cal}kcal，点击填入早餐" onclick="App.quickFillFood('${this.esc(f.name)}')">${f.icon} ${this.esc(f.name)} <small>${f.unit}</small> <b>${f.cal}</b></div>`).join('')}
          </div>
        </div>
        <div class="tip-box" style="margin-top:10px">💡 增肌核心：每日热量盈余 250-500kcal + 蛋白质 1.6-2.2g/kg（约 88-121g）+ 力量训练。当前体重${u.weight}kg→目标${u.target}kg，预计需增重${u.target - u.weight}kg。</div>
      </div>
    `;
  },
  // 解析一行"早餐文本"——支持空格/逗号/顿号/+号 分隔多种食物
  _parseFoodLine(text) {
    if (!text) return [];
    // 用 , ， 、 + 空格(只在数字与中文之间)/分号切分
    const parts = String(text).split(/[,，、+；;]+/).map(s => s.trim()).filter(Boolean);
    // 如果上面没切出多段，再尝试按"空格+数字"边界切（如"米饭100g 鸡蛋2个"）
    let arr = [];
    if (parts.length > 1) {
      arr = parts;
    } else {
      // 用正则把"食物名+数字+单位"切成段
      const re = /([^\d一二两三四五六七八九十半]*?)(\d+(?:\.\d+)?|[一二两三四五六七八九十半]+)\s*(克|g|公斤|kg|斤|两|毫升|ml|升|l|个|只|根|块|片|碗|盘|份|杯|袋|包|瓶|罐|把|串|勺|球|条|段)?/gi;
      const matches = [];
      let m;
      let lastIdx = 0;
      while ((m = re.exec(text)) !== null) {
        const seg = m[0].trim();
        if (seg) matches.push(seg);
        lastIdx = re.lastIndex;
      }
      if (matches.length > 1) arr = matches;
      else arr = [text.trim()];
    }
    return arr.map(seg => {
      const r = CONFIG.parseFood(seg);
      // 保留原始输入文本 + matched 标志
      return Object.assign({ text: seg }, r || { matched: false, text: seg, name: seg, cal: 0 });
    });
  },
  addFood(meal) {
    const inp = document.getElementById('foodIn_' + meal);
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    const parsed = this._parseFoodLine(text);
    const rec = this.todayRec();
    const cals = this._ensureFoodList(rec.diet.calories || {});
    rec.diet.calories = cals;
    let added = [];
    parsed.forEach(p => {
      const entry = {
        id: Store._id(),
        text: p.text,
        name: p.name || p.text,
        icon: p.icon || '🍴',
        qty: p.qty || 0,
        unit: p.unit || '',
        gram: p.gram || 0,
        cal: Number(p.cal) || 0,
        matched: p.matched !== false,
      };
      cals[meal] = cals[meal] || [];
      cals[meal].push(entry);
      added.push(entry);
    });
    Store.updateTodayModule('diet', { calories: cals });
    // 局部刷新盈余条 + 当前餐栏（避免整页重绘失焦）
    this._refreshCalorieBars();
    // 清空输入框，并把这一餐列表也刷新（重渲整张卡，但保留滚动位置）
    inp.value = '';
    // 把这一餐的食物列表局部刷新（不重渲整页）
    this._refreshMealList(meal);
  },
  removeFood(meal, id) {
    const rec = this.todayRec();
    const cals = this._ensureFoodList(rec.diet.calories || {});
    cals[meal] = (cals[meal] || []).filter(f => f.id !== id);
    rec.diet.calories = cals;
    Store.updateTodayModule('diet', { calories: cals });
    this._refreshCalorieBars();
    this._refreshMealList(meal);
  },
  quickFillFood(name) {
    // 把速查食物填入"早餐"输入框并聚焦
    const inp = document.getElementById('foodIn_breakfast');
    if (!inp) return;
    inp.value = (inp.value ? inp.value + '，' : '') + name;
    inp.focus();
  },
  _refreshCalorieBars() {
    const rec = this.todayRec();
    const cals = this._ensureFoodList(rec.diet.calories || {});
    const u = this._calUser();
    const bmr = this._calBmr(u);
    const tdee = bmr * 1.55;
    const surplusGoal = 300;
    const total = this._sumMealCal(cals);
    const surplus = total - tdee;
    const progress = Math.max(0, Math.min(100, (surplus / surplusGoal) * 100));
    const color = surplus >= surplusGoal ? 'var(--primary)' : surplus > 0 ? '#f59e0b' : 'var(--danger)';
    const fill = document.getElementById('calSbFill');
    const val = document.getElementById('calSbVal');
    const tot = document.getElementById('calTotal');
    if (fill) { fill.style.width = progress.toFixed(0) + '%'; fill.style.background = color; }
    if (val) val.textContent = `${surplus > 0 ? '+' : ''}${Math.round(surplus)}kcal (${progress.toFixed(0)}%)`;
    if (tot) tot.textContent = Math.round(total);
    // 同时刷新每餐的小计
    this._calMeals().forEach(m => {
      const list = cals[m.id] || [];
      const sub = list.reduce((a,b)=>a+(Number(b.cal)||0),0);
      const el = document.querySelector(`#foodIn_${m.id}`)?.closest('.cal-meal')?.querySelector('.cal-meal-cal');
      if (el) el.textContent = sub + 'kcal';
    });
  },
  _refreshMealList(meal) {
    const mealBox = document.getElementById('foodIn_' + meal)?.closest('.cal-meal');
    if (!mealBox) return;
    const listEl = mealBox.querySelector('.cal-food-list');
    const calEl = mealBox.querySelector('.cal-meal-cal');
    const rec = this.todayRec();
    const cals = this._ensureFoodList(rec.diet.calories || {});
    const list = cals[meal] || [];
    if (listEl) {
      listEl.innerHTML = list.map(f => `
        <div class="cal-food-item ${f.matched===false?'unmatched':''}">
          <span class="cf-ico">${f.icon||'🍴'}</span>
          <span class="cf-name">${this.esc(f.text)}</span>
          <span class="cf-detail">${f.matched===false ? '未识别(可手填热量)' : (this.esc(f.name) + (f.qty ? f.qty + (f.unit||'') + '·' + f.gram + 'g' : ''))}</span>
          <span class="cf-cal">${f.cal}kcal</span>
          <button class="cf-del" onclick="App.removeFood('${meal}','${f.id}')" title="删除">✕</button>
        </div>
      `).join('');
    }
    if (calEl) {
      const sub = list.reduce((a,b)=>a+(Number(b.cal)||0),0);
      calEl.textContent = sub + 'kcal';
    }
  },
  addWater(ml) {
    const rec = this.todayRec();
    let w = Math.max(0, rec.diet.water + ml);
    Store.updateTodayModule('diet', { water: w });
    setTimeout(() => this._onPunchReward('health', 'hlWater', '饮水达标打卡'), 80);
    this.render_diet();
  },
  toggleMeal(id) {
    const rec = this.todayRec();
    rec.diet.meals[id] = !rec.diet.meals[id];
    Store.updateTodayModule('diet', { meals: rec.diet.meals });
    this.render_diet();
    if (rec.diet.meals[id]) {
      const labels = { breakfast: '早餐打卡', lunch: '午餐打卡', dinner: '晚餐打卡' };
      setTimeout(() => this._onPunchReward('diet', id, labels[id] || (id + '打卡')), 80);
    }
  },
  toggleDietField(f) {
    // P9：已删除「加餐」打卡（用户说"加餐太过于模糊"）；toggleDietField('snack') 直接忽略，避免留后门触发奖励
    if (f === 'snack') return;
    const rec = this.todayRec();
    rec.diet[f] = !rec.diet[f];
    Store.updateTodayModule('diet', { [f]: rec.diet[f] });
    this.render_diet();
    if (rec.diet[f]) {
      // vegetable / supplement 对应奖励 key（snack 已移除）
      const keyMap = { vegetable: 'vegetable', supplement: 'vegetable' };
      const labelMap = { vegetable: '蔬菜/水果打卡', supplement: '蔬菜/水果打卡' };
      const key = keyMap[f];
      if (key) setTimeout(() => this._onPunchReward('diet', key, labelMap[f] || (f + '打卡')), 80);
    }
  },
  // ====== 卫生 ======
  render_hygiene() {
    const rec = this.todayRec();
    const H = CONFIG.hygiene;
    const p5Back = `<div style="margin:14px 0 8px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    let html = p5Back + `
      <div class="tip-box">🧼 做好头发、面部、口腔、私处、足部卫生，防止细菌增生。穿搭以舒适为前提，潮流朝气为重心。</div>
      <div class="card">
        <div class="card-title"><span class="ico">🧼</span>卫生 6 项 · 北京时间窗口打卡（每项 1~3 金币）</div>
        ${this._punchBtnHTML({windowName:'hygFace',    done: Store._isMiniDone('hygiene','hygFace'),    btnText:'🧼 洗脸',       onclick:"App.toggleHygField('face')"})}
        ${this._punchBtnHTML({windowName:'hygOral',    done: Store._isMiniDone('hygiene','hygOral'),    btnText:'🦷 刷牙×2次',   onclick:"App.toggleHygField('brushTimes')", extraLabel:'早/晚各一次'})}
        ${this._punchBtnHTML({windowName:'hygPrivate', done: Store._isMiniDone('hygiene','hygPrivate'), btnText:'🚿 私处清洁', onclick:"App.toggleHygField('private')"})}
        ${this._punchBtnHTML({windowName:'hygFoot',    done: Store._isMiniDone('hygiene','hygFoot'),    btnText:'🦶 泡脚',       onclick:"App.toggleHygField('foot')"})}
        ${this._punchBtnHTML({windowName:'hygSheet',   done: Store._isMiniDone('hygiene','hygSheet'),   btnText:'🛏️ 换床单',    onclick:"App.toggleHygField('bed')", extraLabel:'仅周六/日开放'})}
        ${this._punchBtnHTML({windowName:'hygDesk',    done: Store._isMiniDone('hygiene','hygDesk'),    btnText:'🖥️ 整理桌面', onclick:"App.toggleHygField('desk')"})}
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">🧴</span>每日清洁清单</div>
    `;
    const items = [
      ['face', H.face, '早晚', true],
      ['oral', H.oral, '早晚', true],
      ['private', H.private, '晚', true],
      ['foot', H.foot, '晚', true],
      ['hair', H.hair, '1-2日1次', false],
      ['bed', H.bed, '离开床铺时', false],
      ['desk', H.desk, '每日', false],
    ];
    items.forEach(([k, cfg, freq, crit]) => {
      const done = rec.hygiene[k];
      html += `
        <div class="check-item ${done?'done':''} ${crit?'crit':''}" onclick="App.toggleHygField('${k}')">
          <div class="cbox">${done?'✓':''}</div>
          <div class="info">
            <div class="nm">${this.esc(cfg.name)}</div>
            <div class="ds">${this.esc(cfg.freq)} · ${this.esc(cfg.steps)}</div>
          </div>
          <div class="tag">${this.esc(freq)}</div>
        </div>
      `;
    });
    html += '</div>';
    // 每周项目
    html += `<div class="card"><div class="card-title"><span class="ico">📅</span>每周/定期项目</div>`;
    H.weekly.forEach(w => {
      html += `<div class="list-row"><div class="li-ico">🗓️</div><div class="li-body"><div class="li-nm">${this.esc(w.name)}</div><div class="li-ds">${this.esc(w.freq)}</div></div></div>`;
    });
    html += '</div>';
    document.getElementById('view-hygiene').innerHTML = html;
  },
  toggleHygField(k) {
    const rec = this.todayRec();
    const k2rewardKeyMap = { face:'hygFace', brushTimes:'hygOral', private:'hygPrivate', foot:'hygFoot', bed:'hygSheet', desk:'hygDesk', oral:'hygOral' };
    if (k === 'brushTimes' || k === 'oral') {
      // 刷牙齿数：0→1→2→0 循环，_isMiniDone 判定 ≥2 完成
      const key = 'brushTimes';
      rec.hygiene[key] = ((rec.hygiene[key] || 0) >= 2) ? 0 : (rec.hygiene[key] || 0) + 1;
      // 同时保持 oral 布尔项同步（供清洁清单勾选显示）
      rec.hygiene.oral = rec.hygiene[key] >= 1;
      Store.updateTodayModule('hygiene', { [key]: rec.hygiene[key], oral: rec.hygiene.oral });
      setTimeout(()=>App._onPunchReward('hygiene', 'hygOral', '刷牙×2次打卡'), 60);
    } else {
      rec.hygiene[k] = !rec.hygiene[k];
      Store.updateTodayModule('hygiene', { [k]: rec.hygiene[k] });
      const rewardKey = k2rewardKeyMap[k];
      const labelMap = { face:'洗脸打卡', private:'私处清洁打卡', foot:'泡脚打卡', bed:'换床单打卡', desk:'整理桌面打卡', hair:'洗头打卡' };
      if (rewardKey && rec.hygiene[k]) setTimeout(()=>App._onPunchReward('hygiene', rewardKey, labelMap[k] || (k+'打卡')), 60);
    }
    this.render_hygiene();
  },
  // ====== 运动 ======
  // 2D 男性身体建模：按近 30 天各部位训练次数着色（次数越多颜色越深）
  _partIntensity() {
    const data = Store.load();
    const today0 = new Date(); today0.setHours(0,0,0,0);
    const counts = { '胸': 0, '肩': 0, '背': 0, '腹': 0, '腿': 0, '臀': 0 };
    for (let i = 0; i < 30; i++) {
      const dd = new Date(today0); dd.setDate(dd.getDate() - i);
      const rec = data.records[Store.fmtDate(dd)];
      if (rec && rec.exercise && Array.isArray(rec.exercise.groups)) {
        rec.exercise.groups.forEach(g => { if (counts[g] !== undefined) counts[g]++; });
      }
    }
    return counts;
  },
  _intensityColor(n) {
    // 0 次=灰，1-3=浅绿，4-7=中绿，8+=深绿
    if (n <= 0) return '#e5e7eb';
    if (n <= 2) return '#bbf7d0';
    if (n <= 4) return '#86efac';
    if (n <= 6) return '#4ade80';
    if (n <= 9) return '#22c55e';
    return '#15803d';
  },
  renderBodyModel() {
    const c = this._partIntensity();
    const col = { '肩': this._intensityColor(c['肩']), '胸': this._intensityColor(c['胸']), '背': this._intensityColor(c['背']), '腹': this._intensityColor(c['腹']), '腿': this._intensityColor(c['腿']), '臀': this._intensityColor(c['臀']) };
    const parts = [
      { key: '胸', label: '👕 胸' },
      { key: '肩', label: '💪 肩' },
      { key: '背', label: '👔 背' },
      { key: '腹', label: '🫃 腹' },
      { key: '腿', label: '🦵 腿' },
      { key: '臀', label: '🍑 臀' },
    ];
    const legend = parts.map(p => `
      <div class="bm-leg-item">
        <span class="bm-swatch" style="background:${col[p.key]}"></span>
        <span class="bm-leg-label">${p.label}</span>
        <span class="bm-leg-count">${c[p.key]}次</span>
      </div>
    `).join('');
    // 3D 身体：用 CSS perspective + rotateY 旋转，鼠标拖动/触摸可转
    return `
      <div class="card bodymodel-card">
        <div class="card-title"><span class="ico">🧍</span>3D 男性训练建模 <span class="sub">拖动可旋转</span></div>
        <div class="bm-sub">近 30 天各部位训练次数着色（颜色越深训练越充分）</div>
        <div class="bm-wrap">
          <div class="bm-3d-stage" id="bmStage">
            <div class="bm-3d-body" id="bmBody">
              <svg class="bm-svg" viewBox="0 0 120 250" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="skinGrad" cx="40%" cy="30%" r="70%">
                    <stop offset="0%" stop-color="#fff5e6"/>
                    <stop offset="100%" stop-color="#fde2c4"/>
                  </radialGradient>
                  <radialGradient id="muscleGrad" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stop-color="rgba(255,255,255,0.5)"/>
                    <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
                  </radialGradient>
                </defs>
                <!-- 头 -->
                <circle cx="60" cy="22" r="14" fill="url(#skinGrad)" stroke="#d4a373" stroke-width="1.5" filter="drop-shadow(1px 1px 2px rgba(0,0,0,0.2))"/>
                <!-- 颈 -->
                <rect x="54" y="34" width="12" height="8" rx="3" fill="#fde2c4" stroke="#d4a373" stroke-width="1.2" filter="drop-shadow(1px 1px 1px rgba(0,0,0,0.15))"/>
                <!-- 肩（左右三角肌）—— 用更立体的弧形 -->
                <path d="M30,46 Q22,54 24,64 L42,58 L42,46 Q36,44 30,46 Z" fill="${col['肩']}" stroke="#047857" stroke-width="1.2" filter="drop-shadow(1px 1px 2px rgba(0,0,0,0.2))"/>
                <path d="M90,46 Q98,54 96,64 L78,58 L78,46 Q84,44 90,46 Z" fill="${col['肩']}" stroke="#047857" stroke-width="1.2" filter="drop-shadow(-1px 1px 2px rgba(0,0,0,0.2))"/>
                <!-- 背（上背 lat 框架，躯干两侧） -->
                <path d="M42,52 L42,98 L34,96 L32,60 Z" fill="${col['背']}" stroke="#047857" stroke-width="1.2" opacity="0.92" filter="drop-shadow(1px 0 2px rgba(0,0,0,0.15))"/>
                <path d="M78,52 L78,98 L86,96 L88,60 Z" fill="${col['背']}" stroke="#047857" stroke-width="1.2" opacity="0.92" filter="drop-shadow(-1px 0 2px rgba(0,0,0,0.15))"/>
                <!-- 胸（胸肌）—— 加内层渐变增立体感 -->
                <path d="M42,52 Q60,50 78,52 L78,86 Q60,90 42,86 Z" fill="${col['胸']}" stroke="#047857" stroke-width="1.4" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.2))"/>
                <path d="M44,54 Q60,52 76,54 L76,84 Q60,88 44,84 Z" fill="url(#muscleGrad)" opacity="0.5"/>
                <line x1="60" y1="52" x2="60" y2="86" stroke="#047857" stroke-width="0.8" opacity="0.5"/>
                <!-- 腹（腹肌）—— 6 块腹肌拟态 -->
                <path d="M44,88 L76,88 L74,128 L46,128 Z" fill="${col['腹']}" stroke="#047857" stroke-width="1.4" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.2))"/>
                <line x1="60" y1="88" x2="60" y2="128" stroke="#047857" stroke-width="0.7" opacity="0.5"/>
                <line x1="46" y1="100" x2="74" y2="100" stroke="#047857" stroke-width="0.5" opacity="0.4"/>
                <line x1="46" y1="114" x2="74" y2="114" stroke="#047857" stroke-width="0.5" opacity="0.4"/>
                <ellipse cx="52" cy="106" rx="6" ry="5" fill="url(#muscleGrad)" opacity="0.6"/>
                <ellipse cx="68" cy="106" rx="6" ry="5" fill="url(#muscleGrad)" opacity="0.6"/>
                <!-- 臀（骨盆/臀大肌） -->
                <path d="M44,128 L76,128 L80,150 Q60,160 40,150 Z" fill="${col['臀']}" stroke="#047857" stroke-width="1.4" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.2))"/>
                <line x1="60" y1="128" x2="60" y2="155" stroke="#047857" stroke-width="0.7" opacity="0.5"/>
                <!-- 腿（左右腿）—— 加内侧阴影增立体 -->
                <path d="M44,150 L54,150 L52,230 L44,232 Z" fill="${col['腿']}" stroke="#047857" stroke-width="1.4" filter="drop-shadow(1px 0 2px rgba(0,0,0,0.2))"/>
                <path d="M66,150 L76,150 L76,232 L68,230 Z" fill="${col['腿']}" stroke="#047857" stroke-width="1.4" filter="drop-shadow(-1px 0 2px rgba(0,0,0,0.2))"/>
                <path d="M44,150 L54,150 L52,230 L44,232 Z" fill="url(#muscleGrad)" opacity="0.4"/>
                <path d="M66,150 L76,150 L76,232 L68,230 Z" fill="url(#muscleGrad)" opacity="0.4"/>
              </svg>
            </div>
          </div>
          <div class="bm-legend">${legend}</div>
        </div>
        <div class="tip-box" style="margin-top:8px">🖱️ 电脑端按住鼠标左右拖动旋转 / 📱 手机端左右滑动旋转；颜色按近 30 天训练次数：灰(0)→浅绿(1-2)→中绿(3-4)→深绿(5+)</div>
      </div>
    `;
  },
  // 3D 身体拖动旋转：绑定到 #bmStage 的指针/触摸事件
  _bmDragState: null,
  attachBodyModelDrag() {
    const stage = document.getElementById('bmStage');
    const body = document.getElementById('bmBody');
    if (!stage || !body || stage._bmBound) return;
    stage._bmBound = true;
    let rotY = 18, auto = true;
    body.style.transform = `rotateY(${rotY}deg)`;
    const setRot = (y) => { rotY = Math.max(-80, Math.min(80, y)); body.style.transform = `rotateY(${rotY}deg) rotateX(5deg)`; };
    let startX = null, startRot = rotY;
    const onDown = (e) => {
      auto = false;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      startX = x; startRot = rotY;
      body.style.animation = 'none';
      stage.style.cursor = 'grabbing';
    };
    const onMove = (e) => {
      if (startX == null) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      setRot(startRot + (x - startX) * 0.6);
    };
    const onUp = () => { startX = null; stage.style.cursor = 'grab'; };
    stage.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    stage.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    // 自动慢速摆动（直到用户拖动）
    // v2026.0905c 手机端崩溃修复：舞台节点脱离文档（切走视图）时终止循环——
    // 此前每次进入运动页都新增一个永不停止的 rAF 循环并持有已销毁的 SVG 节点，
    // 长期使用会累积几十个循环，手机端表现为越用越卡直至标签页被系统杀掉
    let t0 = performance.now();
    const tick = (t) => {
      if (!stage.isConnected) return; // 视图已切走：终止循环
      if (auto && !startX) {
        const dt = (t - t0) / 1000;
        setRot(18 + Math.sin(dt * 0.6) * 22);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
  render_exercise() {
    const rec = this.todayRec();
    const E = CONFIG.exercise;
    const sPct = this.pct(rec.exercise.steps, E.stepGoal);
    const p5Back = `<div style="margin:14px 0 8px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    let html = p5Back + `
      <div class="tip-box info">🏋️ 力量训练只能在健身房进行。增肌阶段(体重≤130斤)不建议有氧，用弹力绳热身。负重循序渐进，力竭范围内。</div>
      <div class="card">
        <div class="card-title"><span class="ico">🏃</span>运动 6 项 · 北京时间窗口打卡（每项 3~5 金币）</div>
        ${this._punchBtnHTML({windowName:'exSteps',     done: Store._isMiniDone('exercise','exSteps'),     btnText:`👣 步数 ≥ 目标`, onclick:"void 0", extraLabel: `当前 ${rec.exercise.steps||0}/${CONFIG.exercise.stepMin||8000}`})}
        ${this._punchBtnHTML({windowName:'exCardio',    done: Store._isMiniDone('exercise','exCardio'),    btnText:'🚴 有氧 ≥20分钟', onclick:"App.exerciseAdd('cardioMinutes', 20)", extraLabel:'点击即记 20 分钟打卡'})}
        ${this._punchBtnHTML({windowName:'exAnaerobic', done: Store._isMiniDone('exercise','exAnaerobic'), btnText:'🏋️ 无氧 ≥3组',   onclick:"App.exerciseAdd('anaerobicCount', 3)"})}
        ${this._punchBtnHTML({windowName:'exWarmup',    done: Store._isMiniDone('exercise','exWarmup'),    btnText:'🔥 热身',       onclick:"App.toggleExFlag('warmup')"})}
        ${this._punchBtnHTML({windowName:'exStretch',   done: Store._isMiniDone('exercise','exStretch'),   btnText:'🧘 拉伸',       onclick:"App.toggleExFlag('stretch')"})}
        ${this._punchBtnHTML({windowName:'exStand',     done: Store._isMiniDone('exercise','exStand'),     btnText:'🧍 日站立 ≥6h', onclick:"void 0", extraLabel:`当前 ${rec.exercise.standHours||0}h`})}
      </div>
      ${this.renderTrainingTemplates()}
      ${this.renderBodyModel()}
      <div class="card">
        <div class="card-title"><span class="ico">🚶</span>步数</div>
        <div class="water-wrap">
          <div class="water-bar"><div class="water-fill" style="width:${sPct}%"></div></div>
          <div class="water-val">${rec.exercise.steps}步</div>
        </div>
        <div style="font-size:12px;color:var(--text-soft);margin-top:6px">目标${E.stepGoal}步 · 最低${E.stepMin}步</div>
        <div class="water-btns">
          <button onclick="App.addSteps(500)">+500</button>
          <button onclick="App.addSteps(1000)">+1000</button>
          <button onclick="App.addSteps(2000)">+2000</button>
          <button onclick="App.addSteps(-500)">-500</button>
        </div>
        <div class="field" style="margin-top:12px">
          <label>手动输入步数</label>
          <input type="number" class="input" id="stepInput" placeholder="输入步数" onblur="App.setSteps(this.value)">
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">💪</span>今日训练</div>
        <div class="check-item ${rec.exercise.gymCheckin?'done':''}" onclick="App.toggleEx('gymCheckin')">
          <div class="cbox">${rec.exercise.gymCheckin?'✓':''}</div>
          <div class="info"><div class="nm">🏋️ 健身房打卡</div><div class="ds">乐刻 · 每周${E.gymPerWeek}次 · 季卡目标${E.gymCardTarget}次</div></div>
        </div>
        <div class="field" style="margin-top:12px">
          <label>有氧运动(分钟) · 最低${E.minCardio}min</label>
          <input type="number" class="input" id="cardioMin" value="${rec.exercise.cardioMin}" onchange="App.saveExField('cardioMin',this.value)">
        </div>
        <div class="field">
          <label>无氧动作次数 · 最低${E.minAnaerobic}次</label>
          <input type="number" class="input" id="anaerobicCount" value="${rec.exercise.anaerobicCount}" onchange="App.saveExField('anaerobicCount',this.value)">
        </div>
        <div class="field">
          <label>训练部位(多选)</label>
          <div class="btn-row">
            ${E.muscleGroups.map(g => `<button class="btn ${rec.exercise.groups.includes(g.group)?'btn-primary':'btn-ghost'}" onclick="App.toggleMuscleGroup('${g.group}')">${g.emoji} ${g.group}</button>`).join('')}
          </div>
        </div>
        <div class="check-item ${rec.exercise.supplement?'done':''}" onclick="App.toggleEx('supplement')">
          <div class="cbox">${rec.exercise.supplement?'✓':''}</div>
          <div class="info"><div class="nm">🥤 补剂服用</div><div class="ds">${this.esc(E.supplements.protein)} + ${this.esc(E.supplements.creatine)} · ${this.esc(E.supplements.deadline)}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">📋</span>训练规则</div>
        <div class="list-row"><div class="li-body"><div class="li-ds">${this.esc(E.trainingRule)}</div></div></div>
        <div class="list-row"><div class="li-body"><div class="li-ds">热身：${this.esc(E.warmup.band)}<br>${this.esc(E.warmup.aerobic)}<br>${this.esc(E.warmup.stretch)}</div></div></div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">🎯</span>肌群动作库</div>
    `;
    E.muscleGroups.forEach(g => {
      html += `<div class="list-row"><div class="li-ico">${g.emoji || '💪'}</div><div class="li-body"><div class="li-nm">${this.esc(g.group)}</div><div class="li-ds">${g.exercises.map(e=>this.esc(e)).join(' · ')}</div></div></div>`;
    });
    html += '</div>';
    document.getElementById('view-exercise').innerHTML = html;
    // 绑定 3D 身体拖动旋转
    if (typeof this.attachBodyModelDrag === 'function') {
      try { this.attachBodyModelDrag(); } catch(e){}
    }
  },
  addSteps(n) {
    const rec = this.todayRec();
    let s = Math.max(0, rec.exercise.steps + n);
    Store.updateTodayModule('exercise', { steps: s });
    setTimeout(() => this._onPunchReward('exercise', 'exSteps', '步数达标打卡'), 80);
    this.render_exercise();
  },
  setSteps(v) {
    if (!v) return;
    Store.updateTodayModule('exercise', { steps: parseInt(v) || 0 });
    setTimeout(() => this._onPunchReward('exercise', 'exSteps', '步数达标打卡'), 80);
    this.render_exercise();
  },
  toggleEx(f) {
    const rec = this.todayRec();
    rec.exercise[f] = !rec.exercise[f];
    Store.updateTodayModule('exercise', { [f]: rec.exercise[f] });
    this.render_exercise();
  },
  saveExField(f, v) {
    Store.updateTodayModule('exercise', { [f]: parseInt(v) || 0 });
    // 同步奖励检测：cardioMin → 也累加到 cardioMinutes（mini-task 字段），anaerobicCount 直接使用
    if (f === 'cardioMin') {
      const cm = parseInt(v) || 0;
      Store.updateTodayModule('exercise', { cardioMinutes: cm });
      setTimeout(() => this._onPunchReward('exercise', 'exCardio', '有氧打卡'), 80);
    }
    if (f === 'anaerobicCount') setTimeout(() => this._onPunchReward('exercise', 'exAnaerobic', '无氧打卡'), 80);
    this.render_exercise();
  },
  toggleMuscleGroup(g) {
    const rec = this.todayRec();
    let arr = rec.exercise.groups || [];
    if (arr.includes(g)) arr = arr.filter(x => x !== g);
    else arr.push(g);
    Store.updateTodayModule('exercise', { groups: arr });
    this.render_exercise();
  },
  exerciseAdd(field, amount) {
    const rec = this.todayRec();
    const cur = rec.exercise[field] || 0;
    const nv = Math.max(0, cur + amount);
    Store.updateTodayModule('exercise', { [field]: nv });
    const rewardMap = { cardioMinutes:['exCardio','有氧打卡'], anaerobicCount:['exAnaerobic','无氧打卡'] };
    const r = rewardMap[field];
    if (r) setTimeout(() => this._onPunchReward('exercise', r[0], r[1]), 80);
    this.render_exercise();
  },
  toggleExFlag(flag) {
    const rec = this.todayRec();
    rec.exercise[flag] = !rec.exercise[flag];
    Store.updateTodayModule('exercise', { [flag]: rec.exercise[flag] });
    const rewardMap = { warmup:['exWarmup','热身打卡'], stretch:['exStretch','拉伸打卡'] };
    const r = rewardMap[flag];
    if (r && rec.exercise[flag]) setTimeout(() => this._onPunchReward('exercise', r[0], r[1]), 80);
    this.render_exercise();
  },
  // ====== 学习 ======
  render_learning() {
    const rec = this.todayRec();
    const L = CONFIG.learning;
    const p5Back = `<div style="margin:14px 0 8px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    let html = p5Back + `
      <div class="tip-box info">📖 每日学习${L.minHours}-${L.maxHours}小时(最低${L.meditateMin}h冥想)。备考期建议${L.examHours[0]}-${L.examHours[1]}小时。学历是敲门砖，坚持长线作战。</div>
      <div class="card">
        <div class="card-title"><span class="ico">📚</span>学习 6 项 · 北京时间窗口打卡（每项 3~5 金币）</div>
        ${this._punchBtnHTML({windowName:'lnListen',   done: Store._isMiniDone('learning','lnListen'),   btnText:'🎧 英语听力 ≥15min', onclick:"App.learningAdd('listenMinutes', 15)"})}
        ${this._punchBtnHTML({windowName:'lnRead',     done: Store._isMiniDone('learning','lnRead'),     btnText:'📖 英语阅读 ≥30min', onclick:"App.learningAdd('readMinutes', 30)"})}
        ${this._punchBtnHTML({windowName:'lnPol',      done: Store._isMiniDone('learning','lnPol'),      btnText:'🗳️ 政治 ≥20min', onclick:"App.learningAdd('polMinutes', 20)"})}
        ${this._punchBtnHTML({windowName:'lnMath',     done: Store._isMiniDone('learning','lnMath'),     btnText:'📐 高数 ≥30min', onclick:"App.learningAdd('mathMinutes', 30)"})}
        ${this._punchBtnHTML({windowName:'lnCs',       done: Store._isMiniDone('learning','lnCs'),       btnText:'💻 计算机 ≥20min', onclick:"App.learningAdd('csMinutes', 20)"})}
        ${this._punchBtnHTML({windowName:'lnMeditate', done: Store._isMiniDone('learning','lnMeditate'), btnText:'🧘‍♂️ 冥想 ≥10min', onclick:"App.learningAdd('meditateMin', 10)"})}
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">⏱️</span>今日学习时长</div>
        <div class="field">
          <label>学习总时长(小时)</label>
          <input type="number" class="input" id="learnHours" step="0.5" min="0" max="14" value="${rec.learning.totalHours}" onchange="App.saveLearn('totalHours',this.value)">
        </div>
        <div class="field">
          <label>冥想学习时长(分钟) · 最低30min</label>
          <input type="number" class="input" id="meditateMin" step="5" min="0" value="${rec.learning.meditateMin}" onchange="App.saveLearn('meditateMin',this.value)">
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">📚</span>学科记录（学时 + 今日所学备注）</div>
    `;
    L.subjects.forEach(s => {
      const subj = rec.learning.subjects[s.name];
      const hours = (subj && typeof subj === 'object') ? (subj.hours || 0) : (typeof subj === 'number' ? subj : 0);
      const notes = (subj && typeof subj === 'object') ? (subj.notes || '') : '';
      html += `
        <div class="field learn-subj-field">
          <label>${this.esc(s.name)} <span style="color:var(--text-faint);font-weight:400">(小时)</span></label>
          <input type="number" class="input" step="0.5" min="0" value="${hours}" onchange="App.saveSubject('${this.esc(s.name)}','hours',this.value)">
          <label style="margin-top:8px">${this.esc(s.name)} · 今日学了什么 <span style="color:var(--text-faint);font-weight:400">(像日记一样记录具体内容)</span></label>
          <textarea class="textarea learn-subj-notes" placeholder="例：复习了定积分换元法 + 做 20 道习题，错 3 题（罗尔定理应用不熟）…"
            onblur="App.saveSubject('${this.esc(s.name)}','notes',this.value)">${this.esc(notes)}</textarea>
        </div>
      `;
    });
    html += `
        <div class="tip-box" style="margin-top:8px">单日学习限定卡：单词50个 + 多邻国连胜 + 高数/计算机/政治任意30分钟(每3日三科都学)</div>
      </div>
      ${this.renderKnowledgeCards()}
      <div class="card">
        <div class="card-title"><span class="ico">🎯</span>学习目标</div>
        <div class="list-row"><div class="li-ico">🎓</div><div class="li-body"><div class="li-nm">专升本</div><div class="li-ds">${this.esc(L.goals['专升本'])} · 备考开始${L.examStart}</div></div></div>
        <div class="list-row"><div class="li-ico">📈</div><div class="li-body"><div class="li-nm">考研</div><div class="li-ds">${this.esc(L.goals['考研'])}</div></div></div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ico">👩‍🏫</span>师资与课程</div>
    `;
    L.subjects.forEach(s => {
      html += `<div class="list-row"><div class="li-ico">📘</div><div class="li-body"><div class="li-nm">${this.esc(s.name)}</div><div class="li-ds">${Object.entries(s.teachers).map(([k,v])=>`${k}:${v}`).join(' · ')}</div></div></div>`;
    });
    html += '</div>';
    html += `
      <div class="card">
        <div class="card-title"><span class="ico">📝</span>学习备注</div>
        <textarea class="textarea" id="learnNotes" placeholder="记录今日学习心得...">${this.esc(rec.learning.notes)}</textarea>
        <button class="btn btn-primary" style="margin-top:10px" onclick="App.saveLearnNotes()">保存</button>
      </div>
    `;
    document.getElementById('view-learning').innerHTML = html;
  },

  saveLearn(f, v) {
    Store.updateTodayModule('learning', { [f]: parseFloat(v) || 0 });
    if (f === 'meditateMin') setTimeout(() => this._onPunchReward('learning', 'lnMeditate', '冥想打卡'), 80);
    this.render_learning();
  },
  saveSubject(name, field, v) {
    const rec = this.todayRec();
    if (!rec.learning.subjects[name] || typeof rec.learning.subjects[name] !== 'object') {
      const old = rec.learning.subjects[name];
      rec.learning.subjects[name] = { hours: (typeof old === 'number' ? old : 0), notes: '' };
    }
    rec.learning.subjects[name][field] = (field === 'hours') ? (parseFloat(v) || 0) : v;
    Store.updateTodayModule('learning', { subjects: rec.learning.subjects });
  },
  saveLearnNotes() {
    const v = document.getElementById('learnNotes').value;
    Store.updateTodayModule('learning', { notes: v });
  },
  learningAdd(field, minutes) {
    const rec = this.todayRec();
    const cur = rec.learning[field] || 0;
    const nv = Math.max(0, cur + minutes);
    Store.updateTodayModule('learning', { [field]: nv });
    const rewardMap = {
      listenMinutes:['lnListen','英语听力打卡'],
      readMinutes:  ['lnRead',  '英语阅读打卡'],
      polMinutes:   ['lnPol',   '政治打卡'],
      mathMinutes:  ['lnMath',  '高数打卡'],
      csMinutes:    ['lnCs',    '计算机打卡'],
      meditateMin:  ['lnMeditate','冥想打卡'],
    };
    const r = rewardMap[field];
    if (r) setTimeout(() => this._onPunchReward('learning', r[0], r[1]), 80);
    this.render_learning();
  },
  // ====== 奖励系统 ======
  // 成就完成判定：返回 id→boolean 的映射（基于今日记录自动检测）
  _medsDone(rec) {
    const meds = CONFIG.medications || [];
    return meds.length > 0 && meds.every(m => rec.medications[m.id] && rec.medications[m.id].done);
  },
  _subjectMaxMin(rec) {
    // 学习单科最长学习分钟数（subjects[name]={hours,notes}）
    let max = 0;
    const s = rec.learning.subjects || {};
    Object.values(s).forEach(v => { const h = (v && typeof v === 'object') ? (v.hours || 0) : (typeof v === 'number' ? v : 0); const min = h * 60; if (min > max) max = min; });
    return max;
  },
  _achChecks(rec) {
    return {
      'ach_health_intake': (rec.diet.water || 0) >= (CONFIG.diet.waterMin || 1000) && this._medsDone(rec),
      'ach_health_habit': !rec.habit.relapsed,
      'ach_health_mood': (rec.mood || 0) >= 4,
      'ach_sleep_night': rec.sleep.night.slept && (rec.sleep.night.hours || 0) >= 8,
      'ach_sleep_noon': rec.sleep.noon.slept && (rec.sleep.noon.hours || 0) >= 0.5,
      'ach_sleep_quality': (rec.sleep.night.quality || 0) >= 3,
      'ach_diet_breakfast': !!rec.diet.meals.breakfast,
      'ach_diet_lunch': !!rec.diet.meals.lunch,
      'ach_diet_dinner': !!rec.diet.meals.dinner,
      'ach_hyg_face': !!rec.hygiene.face,
      'ach_hyg_oral': !!rec.hygiene.oral,
      'ach_hyg_body': !!(rec.hygiene.private || rec.hygiene.foot || rec.hygiene.hair),
      'ach_ex_steps': (rec.exercise.steps || 0) >= (CONFIG.exercise.stepMin || 6000),
      'ach_ex_cardio': (rec.exercise.cardioMin || 0) >= 15,
      'ach_ex_anaerobic': (rec.exercise.anaerobicCount || 0) >= 150,
      'ach_learn_total': (rec.learning.totalHours || 0) >= 1,
      'ach_learn_subject': this._subjectMaxMin(rec) >= 30,
      'ach_learn_meditate': (rec.learning.meditateMin || 0) >= 10,
    };
  },
  _achDone(id, rec) {
    // 戒断任务用 habit 字段判定；其余用自动检测
    if (id === 'ach_health_habit') return !rec.habit.relapsed;
    const checks = this._achChecks(rec);
    return !!checks[id];
  },
  render_achievements() {
    const rec = this.todayRec();
    const achs = rec.achievements || {};
    const checks = this._achChecks(rec);
    const total = CONFIG.achievements.length;
    const doneCount = CONFIG.achievements.filter(a => this._achDone(a.id, rec)).length;
    let html = `
      <div class="overview">
        <div class="overview-head">
          <div><h2>今日奖励达成</h2>
          <div style="font-size:12px;color:var(--text-soft);margin-top:2px">6 大组 × 3 小任务 = ${total} 项 · 已达成 ${doneCount}/${total}</div></div>
          <div class="overview-pct">${doneCount}<span>/${total}</span></div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${this.pct(doneCount, total)}%"></div></div>
      </div>
    `;
    // 按 6 大组渲染（每组 3 小任务）
    (CONFIG.coins.rewardGroups || []).forEach(g => {
      const items = (g.items || []).map(id => CONFIG.achievements.find(a => a.id === id)).filter(Boolean);
      const groupDone = items.filter(a => this._achDone(a.id, rec)).length;
      const allDone = groupDone === items.length && items.length > 0;
      html += `<div class="section-label">${g.icon} ${this.esc(g.name)}（${groupDone}/${items.length}）${allDone ? '<span class="badge green" style="margin-left:6px">全完成</span>' : ''}</div>`;
      html += `<div class="ach-grid">`;
      items.forEach(a => {
        const unlocked = !!achs[a.id] || this._achDone(a.id, rec);
        const canAuto = checks[a.id];
        html += `
          <div class="ach-card ${unlocked?'unlocked':'locked'}" onclick="App.toggleAch('${a.id}')">
            ${unlocked?'<div class="ach-check">✓</div>':''}
            <div class="ach-ico">${a.icon}</div>
            <div class="ach-nm">${this.esc(a.name)}</div>
            <span class="ach-type-tag min">+${a.coins}🪙</span>
            <div class="ach-cat">${this.esc(g.name)}</div>
            <div class="ach-crit">${this.esc(a.criteria)}${canAuto && !unlocked ? '<br><span class="badge green" style="margin-top:4px">已满足·可勾选</span>' : ''}</div>
          </div>
        `;
      });
      html += `</div>`;
    });
    // 自动检测建议
    html += `
      <div class="card">
        <div class="card-title"><span class="ico">🤖</span>自动达标检测</div>
        <div style="font-size:13px;color:var(--text-soft);line-height:1.7">
    `;
    CONFIG.achievements.forEach(a => {
      const ok = this._achDone(a.id, rec);
      html += `<div>${ok?'<span class="badge green">✓ 已满足</span>':'<span class="badge red">未满足</span>'} ${a.icon} ${this.esc(a.name)}</div>`;
    });
    html += `
        </div>
        <button class="btn btn-primary" style="margin-top:12px" onclick="App.autoCheckAch()">自动勾选已满足项</button>
      </div>
    `;
    // 历史达标统计
    const recent = Store.getRecentDays(7);
    html += `
      <div class="card">
        <div class="card-title"><span class="ico">📊</span>近7天达标情况</div>
        <div style="display:flex;gap:6px;justify-content:space-between">
    `;
    recent.reverse().forEach(r => {
      const complete = r.record && Store.isDayComplete(r.record);
      const cnt = r.record ? CONFIG.achievements.filter(a => r.record.achievements && r.record.achievements[a.id]).length : 0;
      const d = r.date.slice(5);
      html += `<div style="text-align:center;flex:1">
        <div style="width:100%;height:48px;background:${complete?'var(--primary)':'var(--border)'};border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px">${cnt}</div>
        <div style="font-size:10px;color:var(--text-faint);margin-top:3px">${d}</div>
      </div>`;
    });
    html += '</div></div>';
    document.getElementById('view-achievements').innerHTML = html;
  },
  toggleAch(id) {
    const rec = this.todayRec();
    if (!rec.achievements) rec.achievements = {};
    rec.achievements[id] = !rec.achievements[id];
    Store.updateToday({ achievements: rec.achievements });
    this.render_achievements();
  },
  autoCheckAch() {
    const rec = this.todayRec();
    if (!rec.achievements) rec.achievements = {};
    const checks = this._achChecks(rec);
    Object.entries(checks).forEach(([id, ok]) => {
      if (ok) rec.achievements[id] = true;
    });
    Store.updateToday({ achievements: rec.achievements });
    this.render_achievements();
  },
  // ====== 原则禁止板块 ======
  render_forbidden() {
    const today = Store.today();
    const violSettings = Store.getSetting('violations_' + today, {});
    const back = `<div style="margin:14px 0 8px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    let html = back + `
      <div class="tip-box danger">🚨 以下是你给自己立下的原则红线。每一次坚守都是意志力的锻炼，每一次破戒都要在这里诚实登记——只有直面自己，才能真正改变。</div>
    `;
    // ---------- 每晚红线自检（f7）----------
    html += this.renderRedlineCheck();
    CONFIG.forbidden.categories.forEach(cat => {
      html += `<div class="forbid-cat">
        <div class="forbid-cat-head ${cat.examOnly ? 'exam' : ''}">
          <span>${cat.icon} ${this.esc(cat.name)}</span>
          ${cat.note ? `<span class="fc-note">${this.esc(cat.note)}</span>` : ''}
        </div><div class="forbid-list">`;
      cat.items.forEach((it, i) => {
        const key = cat.id + '_' + i;
        const v = violSettings[key] || 0;
        const violated = !!v;
        html += `<div class="forbid-row ${violated ? 'violated' : ''}" onclick="App.toggleViolation('${cat.id}','${i}')">
          <div class="fr-check">${violated ? '✗' : ''}</div>
          <div class="fr-body">
            <div class="fr-title">${it.strict ? '<span class="badge red">严格</span>' : ''}${this.esc(it.title)}${v > 1 ? ' × ' + v : ''}</div>
            <div class="fr-detail">${this.esc(it.detail)}</div>
          </div>
          ${violated ? `<div class="fr-count">登记 ${v} 次</div>` : ''}
        </div>`;
      });
      html += `</div></div>`;
    });
    document.getElementById('view-forbidden').innerHTML = html;
  },
  toggleViolation(catId, idx) {
    const today = Store.today();
    const key = 'violations_' + today;
    const obj = Store.getSetting(key, {});
    const k = catId + '_' + idx;
    obj[k] = (obj[k] || 0) + 1;
    Store.setSetting(key, obj);
    this.render_forbidden();
  },
  // ====== 每晚红线自检（f7）======
  // 5 条最关键的红线，每晚睡前对照勾选；勾选状态每日独立持久化
  renderRedlineCheck() {
    const today = Store.today();
    const checks = Store.getSetting('redline_' + today, {});
    const items = [
      { id: 'no_smoke',   text: '今日未接触尼古丁/酒精/槟榔/毒品', ico: '🚬' },
      { id: 'no_porn',    text: '今日未访问色情/擦边内容，未用VPN翻墙', ico: '⚠️' },
      { id: 'no_gamble',  text: '今日无赌博/彩票/盲盒/违规充值', ico: '🎰' },
      { id: 'med_on_time', text: '今日关键药按时按量服用（22:00前）', ico: '💊' },
      { id: 'sleep_before_23', text: '今晚 23:00 前熄灯入睡（免疫黄金期）', ico: '😴' },
    ];
    const doneCount = items.filter(it => checks[it.id]).length;
    const allDone = doneCount === items.length;
    const statusCls = allDone ? 'ok' : '';
    const statusText = allDone ? '✓ 已完成 ' + doneCount + '/' + items.length
      : '待完成 ' + doneCount + '/' + items.length;
    const rowsHtml = items.map(it => {
      const checked = !!checks[it.id];
      return `<div class="redline-row ${checked ? 'checked' : ''}" onclick="App.toggleRedline('${it.id}')">
        <div class="redline-check-btn">${checked ? '✓' : ''}</div>
        <div class="redline-row-text">${it.ico} ${this.esc(it.text)}</div>
      </div>`;
    }).join('');
    return `
      <div class="redline-check">
        <div class="redline-head">
          <div class="rh-ico">🌙</div>
          <div>
            <div class="rh-title">每晚红线自检</div>
            <div class="rh-sub">睡前对照 5 条底线勾选 · 每日独立记录</div>
          </div>
          <div class="redline-status ${statusCls}">${statusText}</div>
        </div>
        <div class="redline-checklist">${rowsHtml}</div>
        <div class="redline-foot">📝 全部勾选视为今日红线守住；任一项未达成，请于次日按"原则禁止"板块如实登记破戒次数。</div>
      </div>
    `;
  },
  toggleRedline(id) {
    const today = Store.today();
    const key = 'redline_' + today;
    const obj = Store.getSetting(key, {});
    obj[id] = !obj[id];
    Store.setSetting(key, obj);
    this.render_forbidden();
  },
});
