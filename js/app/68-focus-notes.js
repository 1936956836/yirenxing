// 68-focus-notes.js —— v10.0 一人行新功能集：专注（冥想+番茄钟）/ 挑战中心 / 读感（原阅读笔记 · v12.9.5 改名）/ 管家阿福AI聊天
// [功能组] G6-专注模式（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
//   专注卡定义在 data.js habitCards（id:'focus'），打卡入口在 50-habit-data.js habit99OpenForm 的 focus 分支
Object.assign(App, {

  // ==================== 【专注】冥想 / 番茄钟 ====================
  // 选择界面（从习惯页专注卡进入；v12.1 新增聚神选项）
  focus99Choose() {
    const t = Store.focus99Today();
    this._modal('🧘 专注 · 选择模式', `
      <div style="font-size:12.5px;color:#475569;line-height:1.7;margin-bottom:12px">
        今日已完成 <b>${t.count}</b> 次专注（冥想 ${t.medMin} 分钟 · 聚神 ${t.jushenMin || 0} 分钟 · 番茄钟 ${t.pomoMin} 分钟）。选择一种模式开始：
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="padding:14px 12px;border:1px solid #d1fae5;border-radius:12px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);cursor:pointer" onclick="App.focus99Setup('meditate')">
          <div style="font-size:30px">🧘</div>
          <div style="font-weight:800;font-size:14px;margin-top:6px;color:#047857">冥想</div>
          <div style="font-size:12px;color:#475569;line-height:1.6;margin-top:4px">正计时 · 分心觉察<br>雨天白噪音 🌧️<br>可随时退出</div>
        </div>
        <div style="padding:14px 12px;border:1px solid #fee2e2;border-radius:12px;background:linear-gradient(135deg,#fef2f2,#fff7ed);cursor:pointer" onclick="App.focus99Setup('pomodoro')">
          <div style="font-size:30px">🍅</div>
          <div style="font-weight:800;font-size:14px;margin-top:6px;color:#b91c1c">番茄钟</div>
          <div style="font-size:12px;color:#475569;line-height:1.6;margin-top:4px">倒计时 · 全程锁定<br>篝火山风 🔥<br>开始前请谨慎</div>
        </div>
        <div style="grid-column:1 / -1;padding:14px 12px;border:1px solid #fde68a;border-radius:12px;background:linear-gradient(135deg,#fffbeb,#fef3c7);cursor:pointer" onclick="App.mode99EnterJushen()">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="font-size:30px">🌾</div>
            <div style="flex:1">
              <div style="font-weight:800;font-size:14px;color:#92400e">聚神 <span style="font-size:10px;font-weight:800;padding:1px 7px;border-radius:999px;background:#fef3c7;border:1px solid #fde68a;color:#b45309;vertical-align:1px">v12.1 新</span></div>
              <div style="font-size:12px;color:#475569;line-height:1.6;margin-top:3px">灼麦金麦田 · 正计时 · App 暂时只留一片麦浪，计时结束自动计入专注记录 · 点「回到轻氧」随时可出</div>
            </div>
          </div>
        </div>
      </div>`);
  },
  // 时长输入
  focus99Setup(mode) {
    this._closeModal();
    const isMed = mode === 'meditate';
    const presets = isMed ? [5, 10, 15, 20, 30] : [15, 25, 30, 45, 60];
    this._modal(`${isMed ? '🧘 冥想' : '🍅 番茄钟'} · 设置时长`, `
      <div style="font-size:12.5px;color:#475569;line-height:1.7;margin-bottom:10px">
        ${isMed
          ? '输入或选择冥想的持续时间（分钟）。冥想为<b>正计时</b>：开始后若与软件有任何交互，提示语会切换为分心觉察文案；时间到即完成，期间可随时退出。'
          : '<b style="color:#b91c1c">⚠️ 强制警告：番茄时刻无法进行任何操作，也无法退出（包括关闭本应用页面）！</b><br>番茄钟为<b>倒计时</b>锁定模式：开始后整个应用被锁定，直到倒计时结束才解锁。请确认你在这段时间内不需要使用手机上的其他功能，谨慎开始。'}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${presets.map(m => `<button class="btn btn-ghost btn-sm" style="margin:0" onclick="document.getElementById('fc99Min').value=${m}">${m} 分钟</button>`).join('')}
      </div>
      <label style="display:block;font-size:13px;color:#0f172a;font-weight:700;margin-bottom:6px">持续时间（分钟，1-180）</label>
      <input type="number" id="fc99Min" class="input" min="1" max="180" step="1" value="${isMed ? 10 : 25}" style="width:120px">
      <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="App.focus99SetupCancel()">取消</button>
        <button class="btn ${isMed ? 'btn-primary' : 'btn-danger'}" onclick="App.focus99StartPre('${mode}')">${isMed ? '🧘 开始准备' : '⚠️ 我已了解，开始'}</button>
      </div>`);
  },
  focus99SetupCancel() { this._closeModal(); },
  // 开始前 3 秒倒计时（两种模式共用；此阶段均可退出）
  focus99StartPre(mode) {
    const min = Math.round(parseFloat((document.getElementById('fc99Min') || {}).value || 0));
    if (!min || min < 1 || min > 180) { this._flash('请输入 1-180 之间的分钟数'); return; }
    this._closeModal();
    const durMs = min * 60 * 1000;
    const ov = document.createElement('div');
    ov.id = 'focus99Pre';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.92);z-index:2147483647;display:flex;align-items:center;justify-content:center;flex-direction:column;';
    ov.innerHTML = `
      <div id="focus99PreNum" style="font-size:110px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums">3</div>
      <div style="color:#94a3b8;font-size:14px;margin-top:6px">${mode === 'meditate' ? '🧘 冥想即将开始' : '🍅 番茄钟即将开始'}</div>
      <button class="btn btn-ghost" style="margin-top:26px;background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.3)" onclick="App.focus99Abort()">退出</button>`;
    document.body.appendChild(ov);
    let n = 3;
    this._fc99PreTimer = setInterval(() => {
      n--;
      const el = document.getElementById('focus99PreNum');
      if (n <= 0) {
        clearInterval(this._fc99PreTimer); this._fc99PreTimer = null;
        ov.remove();
        this.focus99Run(mode, durMs);
      } else if (el) el.textContent = n;
    }, 1000);
  },
  focus99Abort() {
    if (this._fc99PreTimer) { clearInterval(this._fc99PreTimer); this._fc99PreTimer = null; }
    const ov = document.getElementById('focus99Pre');
    if (ov) ov.remove();
    this._flash('已退出，专注未开始');
  },
  // —— 冥想主流程：正计时 + 分心检测（可随时退出）；v12.1 波纹动画 + 白噪音自动播放 ——
  focus99Run(mode, durMs) {
    const isMed = mode === 'meditate';
    const startTs = Date.now();
    const ov = document.createElement('div');
    ov.id = 'focus99Run';
    ov.style.cssText = 'position:fixed;inset:0;background:linear-gradient(180deg,#0f172a,#1e293b);z-index:2147483647;display:flex;align-items:center;justify-content:center;flex-direction:column;';
    // v12.1 白噪音：冥想=雨天（雨声+鸟啼）· 番茄=篝火+山风（Web Audio 全合成；不支持的浏览器静默跳过）
    const wnOK = !!(this._wn99Start && this._wn99Start(isMed ? 'rain' : 'fire'));
    ov.innerHTML = `
      <div class="fc99-ripple-wrap${isMed ? ' med' : ' pomo'}">
        <div class="fc99-ripple"><i></i><i></i><i></i></div>
        <div id="fc99Text" class="fc99-text">${isMed ? '每一次呼吸，把你带回此时此刻' : '不急于求成，一步一步推进'}</div>
      </div>
      <div id="fc99Clock" style="font-size:64px;font-weight:900;color:#fff;margin-top:30px;font-variant-numeric:tabular-nums">00:00</div>
      <div id="fc99Left" style="color:#64748b;font-size:13px;margin-top:6px">${isMed ? `目标 ${Math.round(durMs/60000)} 分钟` : `剩余 ${Math.round(durMs/60000)} 分钟`}</div>
      <div id="fc99Dist" style="color:#94a3b8;font-size:12px;margin-top:14px;height:16px"></div>
      ${wnOK
        ? '<button id="fc99Snd" class="fc99-snd on" onclick="App.wn99Toggle(this)">🔊 白噪音开着</button>'
        : '<div class="fc99-snd off">🎧 此浏览器不支持白噪音合成（专注不受影响）</div>'}
      ${isMed
        ? '<button class="btn btn-ghost" style="margin-top:18px;background:rgba(255,255,255,.08);color:#cbd5e1;border-color:rgba(255,255,255,.25)" onclick="App.focus99Quit()">退出冥想</button>'
        : '<div style="margin-top:18px;color:#475569;font-size:12px">🔒 番茄时刻锁定中 · 结束后自动解锁</div>'}`;
    document.body.appendChild(ov);
    // 冥想分心检测：任何交互（点击/触摸/按键/滚动）→ 切换文案
    let distracted = false;
    const onDist = () => {
      if (mode !== 'meditate' || distracted) return;
      distracted = true;
      const txt = document.getElementById('fc99Text');
      const dd = document.getElementById('fc99Dist');
      if (txt) txt.textContent = '分心不是失败，觉察，就是练习本身';
      if (dd) dd.textContent = ' detected · 已觉察到交互，回到呼吸就好';
    };
    if (isMed) {
      ['pointerdown','touchstart','keydown','wheel'].forEach(ev => window.addEventListener(ev, onDist, { passive: true }));
    } else {
      // 番茄钟：锁定一切交互（捕获阶段拦截 + 阻止滚动/返回）
      const blocker = (e) => { e.preventDefault(); e.stopPropagation(); };
      ov.addEventListener('pointerdown', blocker, true);
      ov.addEventListener('touchstart', blocker, true);
      document.body.style.overflow = 'hidden';
    }
    // 计时循环
    this._fc99Timer = setInterval(() => {
      const el = document.getElementById('fc99Clock');
      if (!el) { clearInterval(this._fc99Timer); this._fc99Timer = null; return; }
      const passed = Date.now() - startTs;
      let showMs, leftMs;
      if (isMed) { showMs = passed; leftMs = durMs - passed; }
      else { leftMs = Math.max(0, durMs - passed); showMs = leftMs; }
      const mm = Math.floor(showMs / 60000), ss = Math.floor((showMs % 60000) / 1000);
      el.textContent = String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
      const left = document.getElementById('fc99Left');
      if (left) left.textContent = isMed ? `已进行 ${Math.floor(passed/60000)} 分钟 · 目标 ${Math.round(durMs/60000)} 分钟` : `剩余 ${Math.ceil(leftMs/60000)} 分钟`;
      if (leftMs <= 0) {
        clearInterval(this._fc99Timer); this._fc99Timer = null;
        this.focus99Finish(mode, durMs, distracted);
      }
    }, 250);
    this._fc99State = { mode, startTs, durMs };
  },
  // 冥想中途退出（按已进行时间记录，不足 1 分钟不记）
  focus99Quit() {
    if (!this._fc99State) return;
    if (this._fc99Timer) { clearInterval(this._fc99Timer); this._fc99Timer = null; }
    if (this._wn99Stop) this._wn99Stop(); // v12.1 白噪音随退出淡出
    const { mode, startTs, durMs } = this._fc99State;
    const doneMs = Date.now() - startTs;
    const ov = document.getElementById('focus99Run');
    if (ov) ov.remove();
    const min = Math.floor(doneMs / 60000);
    this._fc99State = null;
    if (min >= 1) {
      Store.focus99Log(mode, min, true);
      Store.habit99Check(Store.today(), 'focus', { type: mode, durationMin: min, quitEarly: true });
      this._flash(`🧘 冥想进行 ${min} 分钟后退出——觉察本身已是练习`);
    } else {
      this._flash('本次冥想不足 1 分钟，未记录');
    }
    this._rerenderIfHabit();
  },
  // 正常完成
  focus99Finish(mode, durMs, distracted) {
    const ov = document.getElementById('focus99Run');
    if (ov) ov.remove();
    document.body.style.overflow = '';
    if (this._wn99Stop) this._wn99Stop(); // v12.1 白噪音随完成淡出
    const min = Math.round(durMs / 60000);
    this._fc99State = null;
    Store.focus99Log(mode, min, !!distracted);
    Store.habit99Check(Store.today(), 'focus', { type: mode, durationMin: min, distracted: !!distracted });
    this._modal(mode === 'meditate' ? '🧘 冥想完成' : '🍅 番茄钟完成', `
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:46px;margin-bottom:10px">${mode === 'meditate' ? '🧘' : '🍅'}</div>
        <div style="font-size:16px;font-weight:800;color:#0f172a">本次专注 ${min} 分钟</div>
        <div style="font-size:13px;color:#475569;margin-top:8px;line-height:1.7">
          ${mode === 'meditate'
            ? (distracted ? '期间曾有交互——「分心不是失败，觉察，就是练习本身」。<br>下次试试把手放在一边，只是呼吸。' : '全程安住当下，没有分心。每一次呼吸，都把你带回此时此刻。')
            : '不急于求成，一步一步推进。休息一下，或开始下一个番茄。'}
        </div>
      </div>`, [{ label: '好的', primary: true }]);
    this._rerenderIfHabit();
  },
  _rerenderIfHabit() {
    try { if (App.currentView === 'workbench' && App._wbView === 'habit') App.render_workbench(); } catch(_) {}
  },

  // ==================== 【挑战中心】（v12.9.46 重做：红绿白渐变底 · 双卡不对称 · 只留月度魔物+原生挑战）====================
  //   · 【今日精力负荷】卡片已按用户要求迁往主页（20-dashboard.js _load99HomeCard）
  //   · 旧「每日目标（必设）」横幅与相关限制文案全部删除
  challenge99Page() {
    const list = Store._challengesData ? Store._challengesData() : [];
    const active = list.filter(c => c.status === 'active');
    const done = list.filter(c => c.status === 'done');
    const quit = list.filter(c => c.status === 'quit');
    const today = Store.today();
    // 月度魔物状态（98-boss99.js）：入口卡显示削弱进度
    const bd = this._boss99Def ? this._boss99Def() : { n: '月度魔物', q: '' };
    const bt = this._boss99Tasks ? this._boss99Tasks() : [];
    const bwk = bt.filter(t => t.done).length;
    const bwin = this._boss99Data && this._boss99Data().wins[this._boss99Month()];
    const card = (c) => {
      const cnt = Object.keys(c.checkins || {}).length;
      const streak = Store.challengeStreak(c);
      const todayDone = !!(c.checkins || {})[today];
      const violated = !!((c.violations || {})[today]);
      const pct = c.targetDays > 0 ? Math.min(100, Math.round(cnt / c.targetDays * 100)) : 0;
      const typeName = { daily: '每日目标', weekly: '每周目标', monthly: '每月目标' }[c.goalType] || '每日目标';
      const EFF = { light: 8, mid: 18, heavy: 32 };
      const effName = { light: '轻量', mid: '适中', heavy: '高强度' }[c.effort] || '轻量';
      const share = c.goalType === 'weekly' ? (EFF[c.effort] || 8) / 7 : c.goalType === 'monthly' ? (EFF[c.effort] || 8) / 30 : (EFF[c.effort] || 8);
      const linkName = c.linkCard === 'fitness' ? '健身卡' : c.linkCard === 'study' ? '学习卡' : '';
      return `<div class="card" style="margin-bottom:10px;${c.status === 'quit' ? 'opacity:.55' : ''}">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:26px">${c.icon || '🏆'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:800;font-size:14.5px;color:#0f172a">
              ${c.status === 'done' ? '<span style="display:inline-block;margin-right:4px;padding:0 5px;border-radius:6px;background:#dcfce7;color:#15803d;font-size:10px;font-weight:800">挑战成功</span>' : ''}
              ${c.status === 'quit' ? '<span style="display:inline-block;margin-right:4px;padding:0 5px;border-radius:6px;background:#fee2e2;color:#b91c1c;font-size:10px;font-weight:800">已放弃</span>' : ''}
              ${violated && c.status === 'active' ? '<span style="display:inline-block;margin-right:4px;padding:0 5px;border-radius:6px;background:#fee2e2;color:#b91c1c;font-size:10px;font-weight:800">今日未达标</span>' : ''}
              ${this.esc(c.name)}
            </div>
            <div style="font-size:12px;color:#64748b;margin-top:3px">
              ${c.targetDays > 0 ? `进度 ${cnt}/${c.targetDays} 天（${pct}%）` : `永久挑战 · 已坚持 ${cnt} 天`} · 🌳连续 ${streak} 天 · 始于 ${c.startDate}
            </div>
            <div style="font-size:11.5px;color:#94a3b8;margin-top:2px">
              <span style="padding:1px 6px;border-radius:6px;background:#eef2ff;color:#4338ca;font-weight:800">${typeName}</span> · ${effName} · ⚡今日精力 ${Math.round(share * 10) / 10} 点${linkName ? ` · 🔗 已联动【${linkName}】（当日卡完成即自动打卡）` : ''}
            </div>
            ${violated && c.status === 'active' ? `<div style="font-size:11.5px;color:#dc2626;margin-top:4px">⛔ 今日已记录到「${this.esc((c.violations || {})[today].keyword || '相关')}」消费——戒断目标今日未达标，连续天数中断，明日重新开始。</div>` : ''}
          </div>
          ${c.status === 'active' ? (violated
            ? `<button class="btn btn-ghost btn-sm" style="margin:0;opacity:.55" onclick="App.challenge99Checkin('${c.id}')">⛔ 未达标</button>`
            : `<button class="btn ${todayDone ? 'btn-ghost' : 'btn-primary'} btn-sm" style="margin:0" onclick="App.challenge99Checkin('${c.id}')">${todayDone ? '✓今日已打' : '打卡'}</button>`) : ''}
        </div>
        ${c.targetDays > 0 ? `<div style="height:6px;border-radius:3px;background:#e2e8f0;margin-top:10px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#f59e0b,#f97316)"></div></div>` : ''}
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          ${todayDone && c.status === 'active' ? `<button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.challenge99Undo('${c.id}')">撤销今日</button>` : ''}
          ${c.status === 'active' ? `<button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.challenge99QuitAsk('${c.id}')">放弃挑战</button>` : ''}
          <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.challenge99DeleteAsk('${c.id}')">删除</button>
        </div>
      </div>`;
    };
    // —— 双卡不对称布局：左「月度魔物」暗黑入口 · 右「原生挑战」下移错位（头尾均不在同一直线）——
    let html = `<div class="chal99-hero">
      <div class="chal99-hero-t">🏆 挑战中心</div>
      <div class="chal99-hero-s">讨伐月度魔物 · 自设原生挑战</div>
    </div>
    <div class="chal99-duo">
      <div class="chal99-card chal99-boss" onclick="App.gotoWb('boss99')" role="button" title="进入月度魔物">
        <div class="chal99-boss-sky" id="chal99BossSky">
          <i class="chal99-bolt b1"></i><i class="chal99-bolt b2"></i><i class="chal99-flash"></i>
          <svg class="chal99-mtn" viewBox="0 0 200 90" preserveAspectRatio="none">
            <polygon points="0,90 34,26 58,90" fill="#15151f"></polygon>
            <polygon points="200,90 166,30 140,90" fill="#15151f"></polygon>
            <polygon points="40,90 78,40 118,90" fill="#101018"></polygon>
            <polygon points="86,90 100,58 116,90" fill="#0a0a10"></polygon>
          </svg>
          <div class="chal99-boss-mon">
            <img src="${this._boss99Px ? this._boss99Px(0) : ''}" alt="月度魔物" draggable="false">
            <i class="chal99-eye e1"></i><i class="chal99-eye e2"></i>
          </div>
        </div>
        <div class="chal99-boss-info">
          <div class="chal99-boss-mo">${(this._boss99Month ? this._boss99Month() : '').replace('-', ' 年 ')} 月</div>
          <div class="chal99-boss-nm">${this.esc(bd.n)}</div>
          <div class="chal99-boss-q">「${this.esc(bd.q)}」</div>
          <div class="chal99-boss-meta">
            <span>削弱 ${bwk * 10}%</span><span>${bwin ? '🏆 已讨伐' : '⚔️ 待讨伐'}</span>
          </div>
          <button class="chal99-boss-go" type="button">进入魔窟 ›</button>
        </div>
      </div>
      <div class="chal99-card chal99-native">
        <div class="card-title"><span class="ico">🚩</span>原生挑战
          <button class="btn btn-primary btn-sm p99-title-btn" onclick="App.challenge99New()">＋ 发起挑战</button>
        </div>
        <div style="font-size:12px;color:var(--text-soft);line-height:1.7;margin-top:6px">
          自己给自己设定的长期挑战：选<b>周期</b>（每日/每周/每月）与<b>强度</b>，逐日打卡。<b>固定天数挑战成功后自动转正为【习惯】小卡</b>。名称含健身/学习关键词时阿福会建议与对应小卡<b>强联动</b>；名称含<b>「戒XX」</b>时，当日记录到相关消费则该目标今日未达标。打卡计入【独行信条】经验。
        </div>
        <div class="section-label" style="margin-top:12px">⏳ 进行中 (${active.length})</div>
        ${active.length ? active.map(card).join('') : '<div class="empty">还没有进行中的挑战，点上方「发起挑战」开始第一个</div>'}
        ${done.length ? `<div class="section-label">🎉 挑战成功 (${done.length}) · 已转正为习惯小卡</div>` + done.map(card).join('') : ''}
        ${quit.length ? `<div class="section-label">🚫 已放弃 (${quit.length})</div>` + quit.map(card).join('') : ''}
      </div>
    </div>
    <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button>
      <button class="btn btn-ghost" onclick="App.gotoWb('pet99')">🐱 宠物与精力负荷</button>
    </div>`;
    return html;
  },
  challenge99New() {
    const icons = ['🏆','🏃','📖','🧘','💧','🌙','☀️','📚','🥗','💪','✍️','🎸','💰','🚭'];
    this._modal({
      title: '🏆 发起目标挑战',
      body: `
        <label class="hb99-lbl">目标名称（想坚持的事）<input type="text" id="chName" class="input" placeholder="如：每天读书 30 分钟 / 晨跑 / 戒奶茶" maxlength="20" oninput="App._chAfuDetect(this.value)"></label>
        <div id="chAfuBox" data-link="" style="display:none;margin-top:8px;padding:9px 11px;border-radius:10px;background:#eef2ff;border:1.5px solid #c7d2fe;font-size:12px;color:#4338ca;line-height:1.7"></div>
        <label class="hb99-lbl">周期类型（必选 · 决定精力份额：每日全额 / 每周 ÷7 / 每月 ÷30）
          <div class="hb99-opt" id="chGoal">
            <button type="button" class="hb99-chip on" data-v="daily" onclick="App._chDurPick(this)">每日目标</button>
            <button type="button" class="hb99-chip" data-v="weekly" onclick="App._chDurPick(this)">每周目标</button>
            <button type="button" class="hb99-chip" data-v="monthly" onclick="App._chDurPick(this)">每月目标</button>
          </div>
        </label>
        <label class="hb99-lbl">任务强度（影响今日精力负荷消耗）
          <div class="hb99-opt" id="chEffort">
            <button type="button" class="hb99-chip on" data-v="light" onclick="App._chDurPick(this)">轻量 ⚡8</button>
            <button type="button" class="hb99-chip" data-v="mid" onclick="App._chDurPick(this)">适中 ⚡18</button>
            <button type="button" class="hb99-chip" data-v="heavy" onclick="App._chDurPick(this)">高强度 ⚡32</button>
          </div>
        </label>
        <label class="hb99-lbl">持续时间
          <div class="hb99-opt" id="chDur">
            <button type="button" class="hb99-chip on" data-v="21" onclick="App._chDurPick(this)">21 天</button>
            <button type="button" class="hb99-chip" data-v="30" onclick="App._chDurPick(this)">30 天</button>
            <button type="button" class="hb99-chip" data-v="66" onclick="App._chDurPick(this)">66 天</button>
            <button type="button" class="hb99-chip" data-v="100" onclick="App._chDurPick(this)">100 天</button>
            <button type="button" class="hb99-chip" data-v="365" onclick="App._chDurPick(this)">365 天</button>
            <button type="button" class="hb99-chip" data-v="0" onclick="App._chDurPick(this)">永久</button>
          </div>
        </label>
        <div style="font-size:12px;color:var(--text-soft);line-height:1.7">打卡规则：每天一次，当日可撤销。固定天数挑战<b>漏打卡不补、不清零</b>——以累计满 N 天为完成标准（不必连续）；永久挑战以 🌳 连续天数见坚持。</div>`,
      actions: [
        { label: '取消' },
        { label: '🚀 发起', primary: true, onClick: () => {
            const name = (document.getElementById('chName').value || '').trim();
            if (!name) { App._flash('请填写目标名称'); return false; }
            // v11.0 精力负荷 100% 拦截：禁止新增今日任务
            const L = App.pet99Load ? App.pet99Load() : { pct: 0 };
            if (L.pct >= 100) { App._flash('⚡ 今日精力负荷已达 100%，禁止新增今日任务——建议精简计划，专注核心几件事，高效优于堆砌数量'); return false; }
            const icon = ((document.querySelector('#chIcons .hb99-chip.on') || {}).textContent || '🏆');
            const dv = (document.querySelector('#chDur .hb99-chip.on') || {}).dataset || {};
            const gv = (document.querySelector('#chGoal .hb99-chip.on') || {}).dataset || {};
            const ev = (document.querySelector('#chEffort .hb99-chip.on') || {}).dataset || {};
            const linkBox = document.getElementById('chAfuBox') || {};
            const linkEl = document.getElementById('chLink');
            const linkCard = (linkEl && linkEl.checked && linkBox.dataset) ? (linkBox.dataset.link || '') : '';
            Store.challengeSave({ name, icon, targetDays: +dv.v || 0, goalType: gv.v || 'daily', effort: ev.v || 'light', linkCard });
            try { App.load99Invalidate && App.load99Invalidate(); } catch (_) {}
            App._flash(`🏆 目标已发起，去打卡吧！${linkCard ? '（已与' + (linkCard === 'fitness' ? '【健身卡】' : '【学习卡】') + '强联动）' : ''}`);
            App.gotoWb('challenge99');
          } },
      ],
    });
  },
  // v11.0 阿福联动判断（规则式关键词识别，不涉及 AI 聊天代码）：
  // 名称含健身关键词 → 建议联动【健身卡】；含学习关键词 → 建议联动【学习卡】（当日卡打卡后目标自动打卡）
  _chAfuDetect(name) {
    const box = document.getElementById('chAfuBox');
    if (!box) return;
    const t = String(name || '').trim();
    const fitHit = /健身|运动|跑步|跑|锻炼|力量|有氧|胸|背|肩|腿|核心|肌肉|俯卧撑|深蹲|撸铁|引体|卷腹|拉伸|瑜伽/.test(t);
    const stuHit = /学习|读书|阅读|看书|背|单词|课程|刷题|复习|练习|英语|日语|编程|代码|写作|练字|算法/.test(t);
    if (!t || (!fitHit && !stuHit)) { box.style.display = 'none'; box.dataset.link = ''; box.innerHTML = ''; return; }
    const link = fitHit ? 'fitness' : 'study';
    const cardName = fitHit ? '健身' : '学习';
    box.dataset.link = link;
    box.style.display = 'block';
    box.innerHTML = `<label style="display:flex;gap:7px;align-items:flex-start;cursor:pointer">
      <input type="checkbox" id="chLink" checked style="margin-top:2px">
      <span>${this._afu99AvatarHtml(17, 'pxafu-inline')}<b>阿福判断</b>：名称含「${fitHit ? '健身' : '学习'}」关键词——建议与【${cardName}卡】<b>强联动</b>：当日${cardName}卡打卡后，本目标自动打卡（无需重复操作）。</span>
    </label>`;
  },
  _chDurPick(btn) {
    btn.parentNode.querySelectorAll('.hb99-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
  },
  challenge99Checkin(id) {
    // v11.0 违约拦截：戒X类目标当日已记录到相关消费 → 今日未达标，不可打卡
    const ch = (Store._challengesData ? Store._challengesData() : []).find(x => x.id === id);
    if (ch && (ch.violations || {})[Store.today()]) {
      const v = (ch.violations || {})[Store.today()] || {};
      this._flash(`⛔ 今日已记录到「${v.keyword || '相关'}」消费，「${ch.name}」今日未达标，明天继续加油`);
      return;
    }
    const r = Store.challengeCheckin(id);
    if (!r.ok) { this._flash(r.msg); return; }
    try { this.load99Invalidate && this.load99Invalidate(); } catch (e) {}
    if (r.justDone) {
      this._modal('🎉 挑战成功！', `<div style="text-align:center;padding:8px 0">
          <div style="font-size:50px">🏆</div>
          <div style="font-size:16px;font-weight:800;margin-top:8px">恭喜你，挑战完成！</div>
          <div style="font-size:13px;color:#475569;margin-top:8px;line-height:1.8">这个习惯坚持到了最后。<br>它已<b>转正为【习惯】小卡</b>（带「挑战」徽标），<br>往后继续在习惯页每天打卡。</div>
        </div>`, [{ label: '太棒了', primary: true }]);
    } else {
      this._flash(`✅ 打卡成功，累计 ${r.count} 天`);
    }
    this.gotoWb('challenge99');
  },
  challenge99Undo(id) {
    Store.challengeUndoToday(id);
    try { this.load99Invalidate && this.load99Invalidate(); } catch (e) {}
    this._flash('已撤销今日打卡');
    this.gotoWb('challenge99');
  },
  challenge99QuitAsk(id) {
    this._modal({ title: '🚫 放弃挑战？', body: '<div style="font-size:13px;color:#475569;line-height:1.8">确定放弃这个挑战吗？放弃后打卡记录保留，但不再出现在习惯小卡与打卡提醒里。</div>',
      actions: [ { label: '再想想' }, { label: '确定放弃', onClick: () => { Store.challengeQuit(id); try { App.load99Invalidate && App.load99Invalidate(); } catch (_) {} App._flash('已放弃（历史记录保留）'); App.gotoWb('challenge99'); } } ] });
  },
  challenge99DeleteAsk(id) {
    this._modal({ title: '🗑️ 删除挑战？', body: '<div style="font-size:13px;color:#475569;line-height:1.8">删除后<b>无法恢复</b>，全部打卡记录一并清除。</div>',
      actions: [ { label: '取消' }, { label: '删除', onClick: () => { Store.challengeDelete(id); try { App.load99Invalidate && App.load99Invalidate(); } catch (_) {} App._flash('已删除'); App.gotoWb('challenge99'); } } ] });
  },
  // 挑战小卡渲染（嵌入习惯页网格 · 进行中/已转正的挑战均显示，卡面带「挑战!」徽标并置顶）
  _challengeCardsHtml() {
    const list = (typeof Store !== 'undefined' && Store._challengesData) ? Store._challengesData() : [];
    const show = list.filter(c => c.status === 'active' || c.status === 'done');
    if (!show.length) return '';
    const today = Store.today();
    return show.map(c => {
      const cnt = Object.keys(c.checkins || {}).length;
      const streak = Store.challengeStreak(c);
      const todayDone = !!(c.checkins || {})[today];
      const violated = !!((c.violations || {})[today]);
      const done = c.status === 'done';
      const pct = c.targetDays > 0 ? Math.min(100, Math.round(cnt / c.targetDays * 100)) : 0;
      const badge = done
        ? '🏆 已转正 · 每日打卡'
        : (violated ? '⛔ 今日未达标（已记录相关消费）'
          : (todayDone ? `✅ 今日已打 · ${c.targetDays > 0 ? cnt + '/' + c.targetDays + ' 天' : cnt + ' 天'}` : (c.targetDays > 0 ? `今日未打 · ${cnt}/${c.targetDays} 天` : `今日未打 · 已坚持 ${cnt} 天`)));
      const linkName = c.linkCard === 'fitness' ? '健身卡' : c.linkCard === 'study' ? '学习卡' : '';
      const cycleName = { daily: '每日', weekly: '每周', monthly: '每月' }[c.goalType] || '每日';
      return `<div class="habit99-card${todayDone || done ? ' hb99-done' : ''} hb99-open" style="border-color:${violated && !done ? '#f87171' : done ? '#86efac' : '#fbbf24'}" onclick="App.challenge99Checkin('${c.id}')">
        <div class="hb99-top"><span class="hb99-ico">${c.icon || '🏆'}</span><span class="hb99-streak">${streak > 0 ? '🌳' + streak : ''}</span></div>
        <div class="hb99-name"><span style="display:inline-block;margin-right:3px;padding:0 4px;border-radius:6px;background:#fef3c7;color:#b45309;font-size:10px;font-weight:800">挑战!</span>${this.esc(c.name)}</div>
        <div class="hb99-win">${c.targetDays > 0 ? `⏰ ${c.targetDays} 天挑战${done ? ' · 已完成' : ''}` : '♾️ 永久挑战'} · ${cycleName}目标${linkName ? ' · 🔗' + linkName : ''}</div>
        <div class="hb99-badge"${violated && !done ? ' style="color:#dc2626"' : ''}>${badge}</div>
        ${c.targetDays > 0 && !done ? `<div style="height:5px;border-radius:3px;background:rgba(255,255,255,.5);margin-top:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#f59e0b,#f97316)"></div></div>` : ''}
      </div>`;
    }).join('');
  },
  // ==================== 【读感】（原「阅读笔记」· v12.9.5 改名并同步全部文案）====================
  readingNotesPage() {
    const rn = Store._readingNotesData ? Store._readingNotesData() : { books: [], notes: [] };
    const st = Store.readingNotesStats();
    const books = rn.books || [];
    const notes = rn.notes || [];
    const statusName = { reading: '在读', done: '读完', abandoned: '弃读' };
    const statusStyle = { reading: '#2563eb', done: '#16a34a', abandoned: '#94a3b8' };
    let html = `<div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">📖</span>读感 · 书架
        <button class="btn btn-primary btn-sm" style="float:right;margin:0" onclick="App.rn99BookEdit()">＋ 添加书</button>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);line-height:1.7;margin-top:6px">
        参考主流笔记 App 的结构化模板：<b>金句摘录（带页码）· 我的想法 · 行动清单 · 五星评分 · 标签</b>。先建书入架，阅读中随手记笔记。
      </div>
      <div style="display:flex;gap:14px;margin-top:12px;flex-wrap:wrap;font-size:12.5px">
        <span>📚 共 ${st.total} 本</span><span style="color:#2563eb">📖 在读 ${st.reading}</span><span style="color:#16a34a">✅ 读完 ${st.done}</span><span style="color:#94a3b8">🚫 弃读 ${st.abandoned}</span><span>📝 笔记 ${st.notes} 条</span>
      </div>
    </div>`;
    html += `<div class="section-label">📚 我的书架 (${books.length})</div>`;
    if (!books.length) html += '<div class="empty">书架空空——点上方「添加书」，从在读的第一本书开始</div>';
    books.forEach(b => {
      const nCount = (st.byBook[b.id] || 0);
      html += `<div class="card" style="margin-bottom:10px">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="width:44px;height:60px;border-radius:6px;background:linear-gradient(135deg,${b.status === 'done' ? '#dcfce7,#86efac' : b.status === 'abandoned' ? '#f1f5f9,#e2e8f0' : '#dbeafe,#bfdbfe'});display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📕</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:800;font-size:14.5px;color:#0f172a">${this.esc(b.title)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:3px">${this.esc(b.author || '佚名')}${b.category ? ' · ' + this.esc(b.category) : ''} · 始于 ${b.startedAt || '—'}${b.finishedAt ? ' · 毕于 ' + b.finishedAt : ''}</div>
            <div style="margin-top:5px;font-size:12px">
              <span style="color:${statusStyle[b.status] || '#475569'};font-weight:700">● ${statusName[b.status] || '在读'}</span>
              <span style="color:#94a3b8;margin-left:8px">📝 ${nCount} 条笔记</span>
              ${b.rating ? `<span style="color:#f59e0b;margin-left:8px">${'⭐'.repeat(Math.min(5, +b.rating))}</span>` : ''}
            </div>
            <div style="display:flex;gap:6px;margin-top:9px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" style="margin:0" onclick="App.rn99NoteEdit(null,'${b.id}')">📝 记笔记</button>
              <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.rn99BookEdit('${b.id}')">✏️ 编辑</button>
              <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.rn99BookCycle('${b.id}')">${b.status === 'reading' ? '✅ 读完' : b.status === 'done' ? '🚫 标记弃读' : '📖 重新在读'}</button>
              <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.rn99BookDeleteAsk('${b.id}')">🗑️</button>
            </div>
          </div>
        </div>
        ${nCount ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
          ${(notes.filter(n => n.bookId === b.id).slice(0, 2).map(n => `
            <div style="padding:6px 0;font-size:12.5px;cursor:pointer" onclick="App.rn99NoteEdit('${n.id}')">
              <span style="color:#94a3b8">P${this.esc(n.page || '?')}</span> 「${this.esc((n.quote || '').slice(0, 50))}${(n.quote || '').length > 50 ? '…' : ''}」
            </div>`)).join('')}
          ${nCount > 2 ? `<div style="font-size:12px;color:#059669;cursor:pointer" onclick="App.rn99BookNotes('${b.id}')">查看全部 ${nCount} 条笔记 ↓</div>` : ''}
        </div>` : ''}
      </div>`;
    });
    // 最近笔记流
    html += `<div class="section-label">✍️ 最近笔记 (${notes.length})</div>`;
    if (!notes.length) html += '<div class="empty">还没有笔记——读到心动处，就记一条</div>';
    notes.slice(0, 15).forEach(n => {
      const b = books.find(x => x.id === n.bookId) || {};
      html += `<div class="card" style="margin-bottom:10px">
        <div style="font-size:12px;color:#94a3b8">${this.esc(b.title || '未关联书籍')}${n.chapter ? ' · ' + this.esc(n.chapter) : ''}${n.page ? ' · P' + this.esc(n.page) : ''} · ${String(n.createdAt || '').slice(0, 10)}</div>
        ${n.quote ? `<div style="margin-top:6px;padding:8px 10px;background:#fefce8;border-left:3px solid #facc15;border-radius:4px;font-size:13px;color:#713f12;line-height:1.7">「${this.esc(n.quote)}」</div>` : ''}
        ${n.thoughts ? `<div style="margin-top:8px;font-size:13px;color:#0f172a;line-height:1.8">${this.esc(n.thoughts)}</div>` : ''}
        ${(n.actions && n.actions.filter(Boolean).length) ? `<div style="margin-top:8px;font-size:12.5px;color:#059669">📌 行动：${n.actions.filter(Boolean).map(this.esc).join(' · ')}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
          ${n.rating ? `<span style="color:#f59e0b;font-size:12px">${'⭐'.repeat(Math.min(5, +n.rating))}</span>` : ''}
          ${(n.tags || []).map(t => `<span style="font-size:11px;padding:1px 6px;border-radius:8px;background:#eff6ff;color:#1d4ed8">#${this.esc(t)}</span>`).join('')}
          <span style="flex:1"></span>
          <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.rn99NoteEdit('${n.id}')">✏️</button>
          <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.rn99NoteDeleteAsk('${n.id}')">🗑️</button>
        </div>
      </div>`;
    });
    html += `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    return html;
  },
  rn99BookEdit(id) {
    const b = id ? ((Store._readingNotesData().books || []).find(x => x.id === id) || {}) : {};
    this._modal({
      title: id ? '✏️ 编辑书籍' : '📖 添加书',
      body: `
        <label class="hb99-lbl">书名（必填）<input type="text" id="rnTitle" class="input" value="${this.esc(b.title || '')}" placeholder="如：被讨厌的勇气" maxlength="40"></label>
        <label class="hb99-lbl">作者<input type="text" id="rnAuthor" class="input" value="${this.esc(b.author || '')}" placeholder="如：岸见一郎" maxlength="30"></label>
        <label class="hb99-lbl">分类
          <div class="hb99-opt" id="rnCat">${['心理','成长','文学','社科','工具','专业','其他'].map(c => `<button type="button" class="hb99-chip ${b.category === c ? 'on' : ''}" onclick="this.parentNode.querySelectorAll('.hb99-chip').forEach(x=>x.classList.remove('on'));this.classList.add('on')">${c}</button>`).join('')}</div>
        </label>
        <label class="hb99-lbl">我的评分
          <div class="hb99-stars" id="rnStars">${[1,2,3,4,5].map(n => `<button type="button" class="hb99-star ${(+b.rating >= n) ? 'on' : ''}" data-n="${n}">⭐</button>`).join('')}</div>
        </label>`,
      actions: [
        { label: '取消' },
        { label: '💾 保存', primary: true, onClick: () => {
            const title = (document.getElementById('rnTitle').value || '').trim();
            if (!title) { App._flash('请填写书名'); return false; }
            const cat = (document.querySelector('#rnCat .hb99-chip.on') || {}).textContent || '';
            const starBtns = document.querySelectorAll('#rnStars .hb99-star');
            let rating = 0;
            starBtns.forEach(btn => { btn.onclick = () => { const n = +btn.dataset.n; starBtns.forEach(b2 => b2.classList.toggle('on', +b2.dataset.n <= n)); document.getElementById('rnStars').dataset.val = n; }; });
            rating = +(document.getElementById('rnStars').dataset.val || b.rating || 0);
            Store.readingBookSave(Object.assign({}, b, { title, author: (document.getElementById('rnAuthor').value || '').trim(), category: cat, rating }));
            App._flash(id ? '✅ 书籍已更新' : '📚 已加入书架');
            App.gotoWb('readingNotes');
          } },
      ],
    });
    // 星星点击（modal 渲染后绑定）
    setTimeout(() => {
      const starBtns = document.querySelectorAll('#rnStars .hb99-star');
      starBtns.forEach(btn => {
        btn.onclick = () => {
          const n = +btn.dataset.n;
          starBtns.forEach(b2 => b2.classList.toggle('on', +b2.dataset.n <= n));
          document.getElementById('rnStars').dataset.val = n;
        };
      });
    }, 50);
  },
  rn99BookCycle(id) {
    const b = (Store._readingNotesData().books || []).find(x => x.id === id);
    if (!b) return;
    const next = b.status === 'reading' ? 'done' : b.status === 'done' ? 'abandoned' : 'reading';
    Store.readingBookSetStatus(id, next);
    this._flash(next === 'done' ? '🎉 标记读完！' : next === 'reading' ? '📖 重新在读' : '已标记弃读');
    this.gotoWb('readingNotes');
  },
  rn99BookDeleteAsk(id) {
    const b = (Store._readingNotesData().books || []).find(x => x.id === id) || {};
    this._modal({ title: '🗑️ 删除书籍？', body: `<div style="font-size:13px;color:#475569;line-height:1.8">删除《${this.esc(b.title)}》将<b>连带删除该书全部笔记</b>，无法恢复。</div>`,
      actions: [ { label: '取消' }, { label: '删除', onClick: () => { Store.readingBookDelete(id); App._flash('已删除'); App.gotoWb('readingNotes'); } } ] });
  },
  rn99BookNotes(bookId) {
    const b = (Store._readingNotesData().books || []).find(x => x.id === bookId) || {};
    const notes = (Store._readingNotesData().notes || []).filter(n => n.bookId === bookId);
    this._modal(`📝 ${this.esc(b.title)} · 全部笔记（${notes.length} 条）`,
      notes.map(n => `<div style="padding:10px 0;border-bottom:1px dashed var(--border)">
          <div style="font-size:12px;color:#94a3b8">P${this.esc(n.page || '?')} · ${String(n.createdAt || '').slice(0, 10)}</div>
          ${n.quote ? `<div style="margin-top:5px;font-size:13px;color:#713f12">「${this.esc(n.quote)}」</div>` : ''}
          ${n.thoughts ? `<div style="margin-top:4px;font-size:12.5px;color:#0f172a">${this.esc(n.thoughts)}</div>` : ''}
        </div>`).join('') || '<div class="empty">暂无笔记</div>');
  },
  // —— 笔记编辑（专业模板：摘录/想法/行动/评分/标签）——
  rn99NoteEdit(id, bookId) {
    const rn = Store._readingNotesData();
    const n = id ? ((rn.notes || []).find(x => x.id === id) || {}) : {};
    const books = rn.books || [];
    if (!books.length) { this._flash('请先添加一本书再记笔记'); return; }
    const curBookId = n.bookId || bookId || (books[0] && books[0].id);
    const actHtml = (n.actions && n.actions.length ? n.actions : ['', '', '']).map((a, i) => `
      <input type="text" class="input rn-act" data-i="${i}" value="${this.esc(a || '')}" placeholder="行动 ${i+1}：读完想做的一件小事" style="margin-bottom:6px">`).join('');
    this._modal({
      title: id ? '✏️ 编辑笔记' : '📝 新笔记',
      body: `
        <label class="hb99-lbl">关联书籍（必选）
          <select id="rnNBook" class="input">
            ${books.map(b => `<option value="${b.id}" ${b.id === curBookId ? 'selected' : ''}>${this.esc(b.title)}</option>`).join('')}
          </select>
        </label>
        <div style="display:flex;gap:8px">
          <label class="hb99-lbl" style="flex:1">章节<input type="text" id="rnNChapter" class="input" value="${this.esc(n.chapter || '')}" placeholder="如：第三章" maxlength="20"></label>
          <label class="hb99-lbl" style="width:100px">页码<input type="text" id="rnNPage" class="input" value="${this.esc(n.page || '')}" placeholder="P128" maxlength="8"></label>
        </div>
        <label class="hb99-lbl">✨ 金句摘录（原文，尽量精简）<textarea id="rnNQuote" class="textarea" style="min-height:64px" placeholder="抄下打动你的那句话…">${this.esc(n.quote || '')}</textarea></label>
        <label class="hb99-lbl">💭 我的想法（为什么触动 / 联想到什么）<textarea id="rnNThoughts" class="textarea" style="min-height:80px" placeholder="写下你的理解、质疑、联想…">${this.esc(n.thoughts || '')}</textarea></label>
        <label class="hb99-lbl">📌 行动清单（最多 3 条，可留空）${actHtml}</label>
        <label class="hb99-lbl">⭐ 本条笔记评分
          <div class="hb99-stars" id="rnNStars">${[1,2,3,4,5].map(v => `<button type="button" class="hb99-star ${(+ (n.rating || 0) >= v) ? 'on' : ''}" data-n="${v}">⭐</button>`).join('')}</div>
        </label>
        <label class="hb99-lbl">标签（逗号分隔，如：勇气, 关系）<input type="text" id="rnNTags" class="input" value="${this.esc((n.tags || []).join(', '))}" placeholder="勇气, 成长"></label>`,
      actions: [
        { label: '取消' },
        { label: '💾 保存笔记', primary: true, onClick: () => {
            const quote = (document.getElementById('rnNQuote').value || '').trim();
            const thoughts = (document.getElementById('rnNThoughts').value || '').trim();
            if (!quote && !thoughts) { App._flash('摘录或想法至少填一项'); return false; }
            const actions = [];
            document.querySelectorAll('.rn-act').forEach(inp => { const v = (inp.value || '').trim(); if (v) actions.push(v); });
            const tags = (document.getElementById('rnNTags').value || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
            Store.readingNoteSave(Object.assign({}, n, {
              bookId: document.getElementById('rnNBook').value,
              chapter: (document.getElementById('rnNChapter').value || '').trim(),
              page: (document.getElementById('rnNPage').value || '').trim(),
              quote, thoughts, actions, tags,
              rating: +(document.getElementById('rnNStars').dataset.val || n.rating || 0),
            }));
            App._flash('💾 笔记已保存');
            App.gotoWb('readingNotes');
          } },
      ],
    });
    setTimeout(() => {
      const starBtns = document.querySelectorAll('#rnNStars .hb99-star');
      starBtns.forEach(btn => {
        btn.onclick = () => {
          const v = +btn.dataset.n;
          starBtns.forEach(b2 => b2.classList.toggle('on', +b2.dataset.n <= v));
          document.getElementById('rnNStars').dataset.val = v;
        };
      });
    }, 50);
  },
  rn99NoteDeleteAsk(id) {
    this._modal({ title: '🗑️ 删除笔记？', body: '<div style="font-size:13px;color:#475569">删除后无法恢复。</div>',
      actions: [ { label: '取消' }, { label: '删除', onClick: () => { Store.readingNoteDelete(id); App._flash('已删除'); App.gotoWb('readingNotes'); } } ] });
  },
});

// 阿福聊天模块独立挂载（DOM 全屏覆盖层，不走 _modal——需要常驻消息流）
// v11.7 双通道架构（总开关 afuAIToggle 一键启停）：
//   ① 直连模式（默认）：前端 → DeepSeek 等 OpenAI 兼容接口（用户自己的 Key 仅存本地，已充值继续可用）
//   ② Worker 代理模式：前端 →（用户自部署 Cloudflare Worker）→ 智谱 glm-4-flash
//      · 前端零密钥：智谱 API Key 只存 Worker 环境变量 ZHIPU_API_KEY
//      · 本地 file 协议（双击导出 HTML）打开时该模式 AI 置灰提示
//   · 会话上下文只存浏览器 localStorage，不上传外部服务器；数据摘要只发往用户自己配置的服务
Object.assign(App, {

  // ==================== 【管家阿福 · AI 聊天】====================
  // v11.7 可用性判定（双通道）：
  //   直连模式：总开关关 → off；未填 Key → key（DeepSeek 已充值用户继续用）
  //   Worker 模式：总开关关 → off；本地 file 协议 → file（AI 置灰）；未填 Worker 地址 → worker
  _afuAIFileMode() {
    try { return location.protocol === 'file:'; } catch (e) { return false; }
  },
  _afuAIState() {
    const cfg = Store.afuAIConfig();
    if (!cfg.enabled) return { ok: false, why: 'off', cfg };
    if (cfg.mode === 'worker') {
      if (this._afuAIFileMode()) return { ok: false, why: 'file', cfg };
      if (!cfg.worker) return { ok: false, why: 'worker', cfg };
      return { ok: true, cfg };
    }
    if (!cfg.key) return { ok: false, why: 'key', cfg };
    return { ok: true, cfg };
  },
  // Worker 端点拼接：兼容用户填 https://x.workers.dev / 带尾斜杠 / 已带 /v1 / 完整端点 四种写法
  _afuAIEndpoint(cfg) {
    let u = String((cfg && cfg.worker) || '').replace(/\/+$/, '');
    if (/\/chat\/completions$/.test(u)) return u;
    return u + '/chat/completions';
  },
  afuChatOpen() {
    if (document.getElementById('afuChatOverlay')) return;
    // v12.7：更新公告唯一入口——用户与阿福聊天时，阿福自动推送最新版本公告（每版只推一次）
    this._afu99PushNotice();
    const st = this._afuAIState();
    const ov = document.createElement('div');
    ov.id = 'afuChatOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;background:linear-gradient(180deg,#ecfdf5,#f8fafc);';
    const sub = st.ok ? (st.cfg.mode === 'worker' ? 'glm-4-flash · Worker 代理 · 懂你的打卡数据' : (st.cfg.model || 'deepseek-chat') + ' 直连 · 懂你的打卡数据')
      : st.why === 'file' ? '本地文件模式 · AI 不可用'
      : st.why === 'off' ? 'AI 助手已关闭'
      : st.why === 'worker' ? '未配置代理 Worker · 点击 ⚙️ 填入你的 Worker 网址'
      : '未配置 AI · 点击 ⚙️ 填入 API Key';
    ov.innerHTML = `
      <div style="padding:12px 14px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
        ${this._afu99AvatarHtml(30)}
        <div style="flex:1">
          <div style="font-weight:800;font-size:15px;color:#0f172a">管家阿福</div>
          <div style="font-size:11px;color:#64748b">${sub}</div>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.afuChatSettings()">⚙️</button>
        <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.afuChatClearAsk()">🧹</button>
        <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App.afuChatClose()">✕</button>
      </div>
      <div id="afuChatMsgs" style="flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px"></div>
      <div style="padding:10px 12px;background:#fff;border-top:1px solid #e2e8f0;display:flex;gap:8px;align-items:center">
        <button id="afuVoiceBtn" class="afu-voice-btn" title="语音输入" onclick="App.afuVoiceToggle()">🎤</button>
        <input id="afuChatInput" class="input" style="flex:1;margin:0" placeholder="${st.ok ? '说一句就帮你记录，如「喝了300ml水」「做了个梦…」' : '先点 ⚙️ 配置 AI 后即可对话'}" ${st.ok ? '' : 'disabled'}>
        <button class="btn btn-primary" style="margin:0" onclick="App.afuChatSend()" ${st.ok ? '' : 'disabled'}>发送</button>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById('afuChatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') App.afuChatSend(); });
    this._afuChatRender();
    // 缺配置时先弹设置（file 模式/总开关关闭不弹，尊重用户选择）
    if (!st.ok && (st.why === 'worker' || st.why === 'key')) setTimeout(() => this.afuChatSettings(), 300);
  },
  afuChatClose() {
    // v12.9.24 关窗时顺手停掉语音识别（若在录音）
    if (this._afuVRecOn) { this._afuVRecOn = false; try { this._afuVRec && this._afuVRec.stop(); } catch (e) {} }
    const ov = document.getElementById('afuChatOverlay');
    if (ov) ov.remove();
  },
  // v12.7：阿福推送最新版本公告（更新公告唯一入口；每版只推一次，localStorage 记忆已推版本）
  // v12.9.39 单一来源切换：改读 js/version.js（window.__APP_VER__）——与启动时版本弹窗同源；
  //   此前读 CONFIG.serverOpenNotice（停在 v12.7 的旧档案），聊天阿福永远推旧版内容（漏网之鱼）。
  //   兜底：无 version.js 数据时回落旧档案（不应发生，构建必含）。
  _afu99PushNotice() {
    try {
      const KEY = 'afu99_notice_pushed';
      const strip = (s) => String(s || '').replace(/<[^>]+>/g, '');
      const V = (typeof window !== 'undefined' && window.__APP_VER__) || null;
      if (V && V.v && V.changes && V.changes.length) {
        if (localStorage.getItem(KEY) === V.v) return; // 本版已推过
        localStorage.setItem(KEY, V.v);
        const lines = [`📣 一人行 v${V.v} 更新公告`];
        if (V.date) lines.push(`📅 ${V.date}`);
        V.changes.forEach(c => lines.push(`${c.ico || '✨'}【${c.cat || '优化'}】${c.t || ''}：${strip(c.d)}`));
        lines.push('', '（以后有新版本，阿福都会第一时间在这里告诉你；也可以直接问我「更新了什么」）');
        const msgs = Store.afuChatLoad();
        msgs.push({ role: 'assistant', content: lines.join('\n'), ts: new Date().toISOString() });
        Store.afuChatSave(msgs);
        return;
      }
      const cur = (typeof CONFIG !== 'undefined' && CONFIG.serverOpenNotice) || null;
      if (!cur || !cur.ver) return;
      if (localStorage.getItem(KEY) === cur.ver) return;
      localStorage.setItem(KEY, cur.ver);
      const lines = [ `📣 ${cur.title || ('一人行 v' + cur.ver + ' 更新公告')}` ];
      if (cur.date) lines.push(`📅 ${cur.date} · v${cur.ver}`);
      if (cur.intro) lines.push('', strip(cur.intro));
      (cur.sections || []).forEach(s => {
        lines.push('', `【${s.title || ''}】`);
        (s.items || []).forEach(it => lines.push(`· ${it.t || ''}：${strip(it.d)}`));
      });
      lines.push('', '（以后有新版本，阿福都会第一时间在这里告诉你）');
      const msgs = Store.afuChatLoad();
      msgs.push({ role: 'assistant', content: lines.join('\n'), ts: new Date().toISOString() });
      Store.afuChatSave(msgs);
    } catch (e) {}
  },
  afuChatClearAsk() {
    this._modal({ title: '🧹 清空聊天记录？', body: '<div style="font-size:13px;color:#475569">阿福会忘掉你们的全部对话（不影响你的打卡数据）。</div>',
      actions: [ { label: '取消' }, { label: '清空', onClick: () => { Store.afuChatClear(); App._afuChatRender(); } } ] });
  },
  _afuChatRender(loading) {
    const box = document.getElementById('afuChatMsgs');
    if (!box) return;
    const msgs = Store.afuChatLoad();
    // v11.7 AI 不可用时的置灰提示（总开关关闭 / 直连缺 Key / Worker 模式缺地址或 file 环境）
    const st = this._afuAIState();
    const notice = !st.ok
      ? `<div class="afu99-note">${st.why === 'file' ? '🔒 本地文件模式，管家阿福AI能力需要配置代理Worker才可使用'
          : st.why === 'off' ? '⏸️ AI 助手已关闭——⚙️ 里可开启【开启管家阿福AI助手】'
          : st.why === 'key' ? '🔑 直连模式还未填 API Key——点 ⚙️ 填入（DeepSeek 平台领取），或切到 Worker 代理模式'
          : '🛠️ 还未配置代理 Worker 地址——点 ⚙️ 填写你部署的 Cloudflare Worker 网址'}</div>`
      : '';
    // v12.7：旧版首页的阿福提示卡（问候/状态/夜巡/严重批评）全部迁入本聊天页顶部
    const pageCards = this._afu99PageCards ? this._afu99PageCards() : '';
    if (!msgs.length) {
      box.innerHTML = `${pageCards}${notice}<div style="text-align:center;color:#94a3b8;font-size:12.5px;padding:30px 16px;line-height:2">
        ${this._afu99AvatarHtml(44)}<br>我是管家阿福。<br>我看过你的习惯打卡、睡眠、饮食与经济数据——<br>可以问我「最近哪里松懈了」「给我一份本周小结」。<br>
        <b style="color:#059669">也可以直接让我帮你记录：</b><br>「今天喝了 300ml 水」「我做了个梦，梦见…」「花了 128」<br>（花销阿福会先问花在哪了，再帮你归类入账）<br>点 🎤 说给阿福听也行。<br>
        <span style="font-size:11.5px;color:#cbd5e1">（AI 回答由你配置的模型生成，会话仅存本地）</span></div>`;
      return;
    }
    box.innerHTML = pageCards + notice + msgs.map((m, i) => {
      // v12.9.24 对话式记录：动作消息（act/act_pending/act_cancel/act_undone/act_fail）渲染成卡片
      if (m.kind && this._afu99ActCard) {
        const card = this._afu99ActCard(m, i);
        if (card) return `<div style="display:flex;gap:8px"><div style="width:30px;height:30px;border-radius:50%;background:#fff;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">${this._afu99AvatarHtml(22)}</div><div style="flex:1;min-width:0">${card}</div></div>`;
      }
      return `
      <div style="display:flex;gap:8px;${m.role === 'user' ? 'flex-direction:row-reverse' : ''}">
        <div style="width:30px;height:30px;border-radius:50%;background:${m.role === 'user' ? '#059669' : '#fff'};border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">${m.role === 'user' ? '🙂' : this._afu99AvatarHtml(22)}</div>
        <div style="max-width:76%;padding:9px 12px;border-radius:12px;background:${m.role === 'user' ? '#059669' : '#fff'};color:${m.role === 'user' ? '#fff' : '#0f172a'};font-size:13.5px;line-height:1.7;border:1px solid ${m.role === 'user' ? '#059669' : '#e2e8f0'};white-space:pre-wrap;word-break:break-word">${App.esc(m.content)}</div>
      </div>`;
    }).join('') + (loading ? `<div style="display:flex;gap:8px"><div style="width:30px;height:30px;border-radius:50%;background:#fff;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden">${this._afu99AvatarHtml(22)}</div><div style="padding:9px 12px;border-radius:12px;background:#fff;border:1px solid #e2e8f0;font-size:13px;color:#64748b">阿福思考中…</div></div>` : '');
    box.scrollTop = box.scrollHeight;
  },
  // v11.7.1 阿福固定双模型：DeepSeek（直连·已充值）/ 智谱 glm-4-flash（直连·免费）——点卡即自动填地址+模型名，
  // 用户只需粘贴对应 Key；自定义接口与 Worker 代理收进「高级选项」（不删功能，低频收起）
  _afuAIPresetOf(cfg) {
    return /bigmodel/i.test(String((cfg && cfg.base) || '')) ? 'zhipu' : 'deepseek';
  },
  afuChatSettings() {
    const cfg = Store.afuAIConfig();
    const fileMode = this._afuAIFileMode();
    const cur = this._afuAIPresetOf(cfg);
    this._modal({
      title: '⚙️ 管家阿福 AI 设置',
      body: `
        <div style="font-size:12.5px;color:#475569;line-height:1.8;margin-bottom:10px">
          阿福 AI 固定两个模型（点卡片即切换，地址/模型名自动填好）：<br>
          <b>🔌 DeepSeek</b>——deepseek-chat 直连（你充值的额度继续用）；<br>
          <b>🧠 智谱</b>——glm-4-flash 直连（<b>免费</b>）。<br>
          <span style="color:#047857">✅ 两个模型的密钥已内置（<b>开箱即用</b>）——换自己的 Key 时改下方输入框即可。</span>
        </div>
        ${fileMode ? `<div style="font-size:12.5px;color:#b45309;background:#fffbeb;border:1px dashed #fde68a;border-radius:8px;padding:7px 10px;margin-bottom:10px;line-height:1.7">⚠️ 本地文件模式，管家阿福AI能力需要配置代理Worker才可使用（直连模式不受此限制）。</div>` : ''}
        <label class="hb99-lbl" style="display:flex;align-items:center;gap:9px;cursor:pointer;padding:9px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;margin-bottom:10px">
          <input type="checkbox" id="afuAIOn" ${cfg.enabled ? 'checked' : ''} onchange="App.afuAIToggle(this.checked)" style="width:18px;height:18px;accent-color:#059669;cursor:pointer">
          <b style="font-size:13px">开启管家阿福AI助手</b>
          <span style="font-size:11px;color:#94a3b8">一键开启 / 关闭整套 AI 功能</span>
        </label>
        <div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:6px">选择模型（二选一，点击即切换）</div>
        <div class="afu-preset-grid">
          <button type="button" class="afu-preset${cur === 'deepseek' ? ' on' : ''}" data-p="deepseek" onclick="App.afuAIPreset('deepseek')">
            <span style="font-size:22px;line-height:1">🔌</span>
            <span style="font-weight:800;font-size:13px;color:#0f172a">DeepSeek</span>
            <span style="font-size:11px;color:#64748b">deepseek-chat · 直连<br>已充值用户继续用</span>
          </button>
          <button type="button" class="afu-preset${cur === 'zhipu' ? ' on' : ''}" data-p="zhipu" onclick="App.afuAIPreset('zhipu')">
            <span style="font-size:22px;line-height:1">🧠</span>
            <span style="font-weight:800;font-size:13px;color:#0f172a">智谱</span>
            <span style="font-size:11px;color:#64748b">glm-4-flash · 直连<br>免费 · 更聪明</span>
          </button>
        </div>
        <div id="afuPresetInfo" style="font-size:11.5px;color:#047857;background:#ecfdf5;border:1px dashed #a7f3d0;border-radius:8px;padding:6px 10px;margin:8px 0 10px;line-height:1.7">✅ 当前：${this.esc(cfg.model)} · ${this.esc(cfg.base)}</div>
        <label class="hb99-lbl">API Key（${cur === 'zhipu' ? '智谱' : 'DeepSeek'} · 已内置可直接用）<input type="text" id="afuKey" class="input" value="${this.esc(cfg.key)}" placeholder="内置密钥已填好；换自己的 Key 时改这里（仅存本地）"></label>
        <div style="font-size:11.5px;color:#94a3b8;line-height:1.8;margin-top:6px">🔒 两个模型各有独立 Key 记忆（切换时自动带各自的）；改过的 Key 仅存本地 localStorage。</div>
        <details style="margin-top:10px;border:1px solid var(--border);border-radius:10px;padding:8px 12px;background:var(--card)">
          <summary style="cursor:pointer;font-size:12px;font-weight:800;color:#475569;user-select:none">▸ 高级选项（自定义接口 / Worker 代理）</summary>
          <div style="margin-top:10px">
            <div style="font-size:11.5px;color:#94a3b8;line-height:1.8;margin-bottom:8px">不修改上方预设时，以下自定义项仅在自行填写后生效（硅基流动/Ollama 等其他 OpenAI 兼容服务商）：</div>
            <label class="hb99-lbl">自定义 API 地址<input type="text" id="afuBase" class="input" value="${this.esc(cfg.base)}" placeholder="https://api.deepseek.com/v1（末尾不带 /chat/completions）"></label>
            <label class="hb99-lbl">自定义模型名<input type="text" id="afuModel" class="input" value="${this.esc(cfg.model)}" placeholder="deepseek-chat"></label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;margin:8px 0;border:1px solid #ddd6fe;border-radius:10px;background:#f5f3ff">
              <input type="checkbox" id="afuUseWorker" ${cfg.mode === 'worker' ? 'checked' : ''} style="width:16px;height:16px;accent-color:#7c3aed;cursor:pointer">
              <span style="font-size:12px;font-weight:800;color:#6d28d9">使用 Worker 代理（前端零密钥）</span>
              <span style="font-size:11px;color:#94a3b8">勾选后走你部署的 Cloudflare Worker 转发智谱</span>
            </label>
            <div id="afuModeWorker" style="${cfg.mode === 'worker' ? '' : 'display:none'}">
              <label class="hb99-lbl">Worker 代理地址<input type="text" id="afuWorker" class="input" value="${this.esc(cfg.worker)}" placeholder="https://你的worker.workers.dev"></label>
              <div style="font-size:11.5px;color:#475569;line-height:1.9;margin-top:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px">
                <b style="color:#7c3aed">三步部署（约 3 分钟）：</b><br>
                ① 打开项目里的 <b>worker/afu-glm-proxy.js</b>，复制全部代码；<br>
                ② Cloudflare Dashboard → Workers 创建新 Worker 粘贴部署，并在「设置 → 变量」添加 <b>ZHIPU_API_KEY = 你的智谱密钥</b>（open.bigmodel.cn 领取）；<br>
                ③ 把部署好的 Worker 网址填到上面保存即可（本地联调可填 http://localhost:8787）。
              </div>
              <div style="font-size:11.5px;color:#94a3b8;line-height:1.8;margin-top:6px">🔒 密钥只存 Worker 环境变量，前端与浏览器永不接触；AI 对话仅把「打卡摘要」发往你自己的 Worker，不上传任何第三方。</div>
            </div>
          </div>
        </details>`,
      actions: [
        { label: '取消' },
        { label: '💾 保存', primary: true, onClick: () => {
            const mode = document.getElementById('afuUseWorker') && document.getElementById('afuUseWorker').checked ? 'worker' : 'direct';
            const baseV = document.getElementById('afuBase').value;
            const keyV = document.getElementById('afuKey').value;
            Store.afuApiSave(baseV, keyV, document.getElementById('afuModel').value);
            Store.afuKeySlotSave(App._afuAIPresetOf({ base: baseV }), keyV); // 同步写入当前模型的 Key 槽位
            Store.afuWorkerUrlSave(document.getElementById('afuWorker').value);
            Store.afuAIModeSave(mode);
            const st = App._afuAIState();
            App._flash(st.ok ? '✅ 已保存，阿福 AI 接入完成' : '已保存（' + (st.why === 'key' ? '还没填 API Key' : st.why === 'worker' ? '未填 Worker 地址' : 'AI 已关闭') + '，暂不可用）');
            App.afuChatClose();
            App.afuChatOpen();
          } },
      ],
    });
    // Worker 勾选联动显示地址输入区
    setTimeout(() => {
      const cb = document.getElementById('afuUseWorker');
      if (cb) cb.addEventListener('change', () => {
        const w = document.getElementById('afuModeWorker');
        if (w) w.style.display = cb.checked ? '' : 'none';
      });
    }, 50);
  },
  // v11.7.2 模型预设（含内置密钥）：点卡片立即切换——地址/模型名自动填，Key 按模型各自携带
  // （输入框里的改动先存回旧模型的槽位，再载入新模型的 Key；出厂密钥已内置，开箱即用）
  afuAIPreset(p) {
    const keyEl = document.getElementById('afuKey');
    const cfg = Store.afuAIConfig();
    const prev = this._afuAIPresetOf(cfg);
    // ① 旧模型的 Key 槽位先存好（保留输入框里的编辑，不丢）
    Store.afuKeySlotSave(prev, keyEl ? keyEl.value : cfg.key);
    // ② 新模型：地址/模型名 + 各自槽位的 Key
    const newKey = Store.afuKeySlot(p);
    if (p === 'zhipu') Store.afuApiSave('https://open.bigmodel.cn/api/paas/v4', newKey, 'glm-4-flash');
    else Store.afuApiSave('https://api.deepseek.com/v1', newKey, 'deepseek-chat');
    Store.afuAIModeSave('direct'); // 点预设 = 回到直连（Worker 是高级选项）
    // ③ 刷新面板内的高亮与信息（不重开弹窗，避免丢 Key 输入）
    try {
      document.querySelectorAll('.afu-preset').forEach(btn => btn.classList.toggle('on', btn.dataset.p === p));
      const baseEl = document.getElementById('afuBase');
      const modelEl = document.getElementById('afuModel');
      if (baseEl) baseEl.value = p === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' : 'https://api.deepseek.com/v1';
      if (modelEl) modelEl.value = p === 'zhipu' ? 'glm-4-flash' : 'deepseek-chat';
      const info = document.getElementById('afuPresetInfo');
      if (info) info.innerHTML = `✅ 当前：${p === 'zhipu' ? 'glm-4-flash · https://open.bigmodel.cn/api/paas/v4' : 'deepseek-chat · https://api.deepseek.com/v1'}`;
      if (keyEl) { keyEl.value = newKey; keyEl.placeholder = p === 'zhipu' ? '内置密钥已填好，可直接用；换 Key 时改这里' : '内置密钥已填好，可直接用；换 Key 时改这里'; }
      const cb = document.getElementById('afuUseWorker');
      if (cb && cb.checked) { cb.checked = false; const w = document.getElementById('afuModeWorker'); if (w) w.style.display = 'none'; }
    } catch (_) {}
    this._flash(p === 'zhipu' ? '✅ 已切换到智谱 glm-4-flash（Key 已带好）——点「💾 保存」即可开聊' : '✅ 已切换到 DeepSeek（Key 已带好）——点「💾 保存」即可开聊');
  },
  // v11.7 总开关：一键开启/关闭整套 AI 功能（立即生效并记忆）
  afuAIToggle(on) {
    Store.afuAIEnabledSave(!!on);
    this._flash(on ? '✅ 已开启管家阿福AI助手' : '已关闭管家阿福AI助手（⚙️ 里可随时再开）');
  },
  // 阿福的 system prompt（v12.3 六重身份）：心理医生 + 老师 + 管家 + 朋友 + 亲人 + 百科全书
  // ① 心理医生：倾听优先、共情回应、不诊断不贴标签；持续低落/自伤念头出现时温和建议专业求助
  // ② 老师：学习答疑（专升本/四六级/考研/政治/计算机/高数等），讲原理不塞答案
  // ③ 管家：基于本地数据温和复盘（打卡/精力/支出），只提醒不说教
  // ④ 朋友：接得住玩笑也接得住低落，平等对话不端着
  // ⑤ 亲人：记得用户的长期目标与在意的事，像家人一样惦记
  // ⑥ 百科全书：生活常识（做饭收纳/营养作息/人情世故/租房工作）信手拈来，涉及就医的提醒看医生
  // 会话上下文只存 localStorage；阿福会记录发言并推理心情写进每日报告（用户知情）
  _afuSystemPrompt() {
    let brief = '';
    try {
      const today = Store.today();
      const t = Store.focus99Today();
      brief += `\n\n【用户近7日自律摘要】`;
      Object.keys(Store.getHabit99().days || {}).sort().slice(-7).forEach(dk => {
        const s = Store.habit99DailySummary(dk);
        brief += `\n${dk}：打卡 ${s.doneCount}/${s.total}张`;
      });
      const todayRec = Store.getDay ? Store.getDay(today) : null;
      if (todayRec) {
        brief += `\n今日饮水：${(todayRec.diet && todayRec.diet.water) || 0}ml（目标1300）`;
        brief += `；昨晚睡眠：${(todayRec.sleep && todayRec.sleep.night && todayRec.sleep.night.slept) ? '已记录' : '未记录'}`;
      }
      brief += `\n今日专注：冥想${t.medMin}分钟/番茄钟${t.pomoMin}分钟`;
      const ch = (Store._challengesData ? Store._challengesData() : []).filter(c => c.status === 'active');
      if (ch.length) brief += `\n进行中挑战：${ch.map(c => c.name + '(' + Object.keys(c.checkins || {}).length + '天)').join('、')}`;
      const sum = Store.ledgerSummary();
      brief += `\n本月支出 ¥${sum.monthTotal.toFixed(0)}${(Store.ledgerSummaryIncome && Store.ledgerSummaryIncome().monthTotal) ? ' · 收入 ¥' + Store.ledgerSummaryIncome().monthTotal.toFixed(0) : ''}`;
      const streak = Store.calcStreak ? Store.calcStreak() : 0;
      brief += `\n连续自律 ${streak} 天`;
      // v11.7 增补：情绪/日记/灵光/憾潮/精力负荷
      try {
        const data = Store.load();
        const MOOD = ['', '😢低落', '😕不佳', '😐一般', '🙂不错', '😄很好'];
        const diaries = data.diaries || [];
        if (diaries.length) {
          const last = diaries[0];
          brief += `\n日记：共 ${diaries.length} 篇，最近一篇 ${last.date || ''}${last.mood ? ' · 心情 ' + (MOOD[last.mood] || last.mood) : ''}`;
        }
        const sparks = (data.wbSparks99 || []).length;
        const regrets = (data.wbRegrets99 || []).length;
        if (sparks || regrets) brief += `\n灵光 ${sparks} 条 · 憾潮 ${regrets} 条`;
      } catch(_) {}
      try {
        const L = this.pet99Load ? this.pet99Load() : null;
        if (L) {
          const Z = this._pet99Zone ? this._pet99Zone(L.pct) : null;
          brief += `\n今日精力负荷：${L.pct}%（${Z ? Z.name : '容量' + L.cap}）`;
        }
      } catch(_) {}
      // v12.9.31b 独行信条：今日独行任务 + RPG 等级 + 宝箱/装备/宝石（阿福知晓任务卡内容，可温和提醒/鼓励）
      try {
        if (this._rpg99QuestsToday) {
          const qs = this._rpg99QuestsToday();
          if (qs.length) {
            const CAT = { grow: '成长', quit: '戒', life: '生活' };
            brief += `\n今日独行任务（个人中心 · 5 张卡 · 横滑可随时浏览 · 长按经阿福检验通过才算完成）：${qs.map(q => `[${CAT[q.cat] || '任务'}]${q.t}${q.done ? '(已通过检验)' : ''}`).join('、')}`;
          }
        }
        if (this._rpg99Data && this._rpg99ExpProg) {
          const r = this._rpg99Data();
          const prog = this._rpg99ExpProg(r.exp);
          brief += `\n独行等级：Lv.${prog.lv}（经验 ${prog.cur}/${prog.need}）`;
          if (this._rpg99ChestAvail) brief += `\n像素宝箱：还可开 ${this._rpg99ChestAvail()} 次（每完成 1 个今日任务开 1 次）`;
          if (this._rpg99GearOf) {
            const g = this._rpg99GearOf(r);
            brief += `\n战士装备：武器·${g.w.n} / 防具·${g.a.n} / 饰品·${g.t.n}（宝石商店与宝箱产出）`;
          }
          if (this._pet99Data) brief += `；宝石：${(this._pet99Data().points || 0)} 颗（家园/宠物/宝石商店共用的珍贵货币）`;
        }
      } catch(_) {}
      // v12.9.39 阿福知晓本版更新内容（单一来源 js/version.js）——用户问「更新了什么」「有什么新功能」
      //   时可直接答出本版条目，不再露怯（此前只读旧 v12.7 公告，对后续版本一无所知）
      try {
        const V = (typeof window !== 'undefined' && window.__APP_VER__) || null;
        if (V && V.v && V.changes && V.changes.length) {
          const strip = (s) => String(s || '').replace(/<[^>]+>/g, '');
          brief += `\n\n【本版更新（v${V.v}${V.date ? ' · ' + V.date : ''}）】`;
          V.changes.forEach(c => brief += `\n· ${c.ico || ''} ${c.cat || ''}｜${c.t || ''}：${strip(c.d)}`);
          brief += `\n（用户问起版本更新/新功能时，据此逐条简要介绍，鼓励用户去对应页面试用）`;
        }
      } catch(_) {}
    } catch(_) {}
    return `你是「一人行」App 的管家阿福——用户一个人生活时最稳定的陪伴。你身兼六重身份，随场景切换：
① 心理医生：用户情绪低落、焦虑、倾诉烦恼时，先倾听共情再温和回应——不诊断、不贴标签、不说教；若用户流露持续两周以上的低落或自伤念头，温和地建议寻求专业心理帮助（这是关心，不是转介冷漠）；
② 老师：学习疑问（专升本、四六级、考研、政治、计算机、高数等）讲清原理与思路，引导而不是直接塞答案；
③ 管家：基于文末数据温和复盘用户状态、解读精力负荷，给温和的自律建议——只提醒、不指责；
④ 朋友：接得住玩笑也接得住低落，平等、松弛，偶尔幽默，不端着；
⑤ 亲人：像家人一样惦记用户的长期目标与在意的事，记得他们说过的话；
⑥ 百科全书：生活常识（做饭收纳、营养作息、人情世故、租房工作、法律心理）信手拈来——涉及医疗的异常数据提醒就医，不替代医嘱。
另外你会默默记录用户的发言并推理当日心情、写进每日健康报告（用户对此知情），因此对话中留意情绪线索会让你的陪伴更贴心。
文字润色请求（日记/灵光/憾潮）保留原意与语气，优化表达。
    说话简洁（一般 3-6 句），善用 emoji 点缀。${brief}
    ${(this._afu99ActProtocol ? this._afu99ActProtocol() : '')}`;
  },
  async afuChatSend() {
    // v11.7 双通道：先判可用性（总开关 / 通道配置 / file 模式）
    const st = this._afuAIState();
    if (!st.ok) { if (st.why === 'worker' || st.why === 'key') this.afuChatSettings(); return; }
    const cfg = st.cfg;
    const inp = document.getElementById('afuChatInput');
    const text = (inp && inp.value || '').trim();
    if (!text) return;
    if (this._afuSending) return; // loading 期间防重复发送
    inp.value = '';
    const msgs = Store.afuChatLoad();
    msgs.push({ role: 'user', content: text });
    Store.afuChatSave(msgs);
    // v12.3 阿福心情观测：记录发言 → 推理心情 → 写入每日报告（84-afu-mood.js）
    try { if (this._afu99MoodLog) this._afu99MoodLog(text); } catch (_) {}
    this._afuSending = true;
    this._afuChatRender(true);
    const finish = (content) => {
      // v12.9.24 对话式记录：剥离 [[AFU_ACT]] 动作指令行（干净文本入聊天流），指令交给执行层
      let clean = String(content || '').trim();
      let acts = [];
      if (this._afu99ActParse) {
        const p = this._afu99ActParse(clean);
        clean = p.clean; acts = p.acts;
      }
      if (clean) msgs.push({ role: 'assistant', content: clean });
      Store.afuChatSave(msgs);
      this._afuSending = false;
      this._afuChatRender();
      if (acts.length) setTimeout(() => { try { acts.forEach(a => this._afu99ActRun(a)); } catch (e) {} }, 150);
    };
    let status = 0;
    try {
      const isWorker = cfg.mode === 'worker';
      // Worker 代理模式：不带 Authorization（密钥在 Worker 环境变量）；直连模式：带用户自己的 Key
      const headers = { 'Content-Type': 'application/json' };
      if (!isWorker) headers['Authorization'] = 'Bearer ' + cfg.key;
      const url = isWorker ? this._afuAIEndpoint(cfg) : cfg.base.replace(/\/+$/, '') + '/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: isWorker ? 'glm-4-flash' : (cfg.model || 'deepseek-chat'),
          messages: [{ role: 'system', content: this._afuSystemPrompt() }].concat(
            // v12.9.24 动作回执消息（kind:*，无 content）不进 LLM 上下文——用户发言本身都在，不会重复记录
            msgs.slice(-20).filter(m => typeof m.content === 'string' && m.content).map(m => ({ role: m.role, content: m.content }))
          ),
          temperature: 0.7,
          max_tokens: 600,
        }),
      });
      status = res.status;
      const j = await res.json().catch(() => ({}));
      const reply = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      if (!reply) throw new Error((j && j.error && (j.error.message || j.error.msg)) || ('HTTP ' + res.status));
      finish(reply.trim());
    } catch (e) {
      // 原始报错只进控制台，用户看到的永远是友好中文
      try { console.warn('[阿福AI] 请求失败：', (e && e.message) || e, status ? 'HTTP ' + status : ''); } catch(_) {}
      finish(this._afu99ChatErr(e, status, cfg));
    }
  },
  // v12.9.31 _afu99Reward（聊天随机奖励自律点）已删除——宝石来源统一由【独行信条】RPG 引擎发放（92-rpg99.js）
  // v11.7 阿福报错「说人话」：按通道分类，全部友好中文提示，不向用户抛原始报错码
  // 注：聊天渲染走 esc() 转义，此处文案一律纯文本（用「」强调，不用 HTML 标签）
  _afu99ChatErr(e, status, cfg) {
    const m = String((e && e.message) || e || '');
    const isWorker = !!(cfg && cfg.mode === 'worker');
    // ① 余额不足（直连：DeepSeek 等免费额度用完 / 直连智谱：额度耗尽 / Worker：智谱额度耗尽）——Key 和地址都没错！
    if (/Insufficient\s*Balance|insufficient|余额不足|402/.test(m) || status === 402) {
      if (isWorker) return '（阿福的账房空了：智谱账户「余额不足/额度用完」——你的 Worker 和密钥都没配错，去 open.bigmodel.cn 充值或领取额度即可。）';
      const isZhipu = /bigmodel/i.test(String((cfg && cfg.base) || ''));
      if (isZhipu) {
        return '（阿福的账房空了：智谱账户「余额不足/额度用完」——你的 Key、地址、模型名其实「都没配错」。glm-4-flash 本身免费：去 open.bigmodel.cn 查一下账户额度，或重新领取一个 Key 即可。）';
      }
      return '（阿福的账房空了：你的 AI 账户「余额不足」——你的 Key、地址、模型名其实「都没配错」，是免费额度用完了。\n两招任选：\n① 充值：DeepSeek 用户去 platform.deepseek.com → 左侧「充值」（很便宜，几块钱够聊很久）；\n② 换服务商：点 ⚙️ 把地址改成 https://api.siliconflow.cn/v1、模型名 deepseek-ai/DeepSeek-V3（硅基流动，新用户送免费额度），Key 换成它家的即可。）';
    }
    // ② Worker 模式专属：地址不对 / Worker 未部署
    if (isWorker && status === 404) {
      return '（阿福找不到你的代理 Worker：请到 ⚙️ 检查 Worker 地址是否复制完整（形如 https://xxx.workers.dev），并确认 Worker 已部署成功。）';
    }
    if (isWorker && (status === 401 || status === 403)) {
      return '（代理 Worker 拒绝了请求：请检查 Worker 的环境变量 ZHIPU_API_KEY 是否已配置并重新部署。）';
    }
    // ③ Key 无效（直连）
    if (status === 401 || status === 403 || /auth|invalid.*key|key.*invalid|无效/i.test(m)) {
      return '（阿福连不上模型：API Key 无效或未填写——去 ⚙️ 检查 Key 是否复制完整（sk- 开头），别混入空格。）';
    }
    // ④ 地址 / 模型名错（直连）
    if (status === 404 || /not\s*found|does\s*not\s*exist|model/i.test(m)) {
      return '（阿福连不上模型：地址或模型名不对——去 ⚙️ 检查 Base URL（末尾不带 /chat/completions）与模型名拼写。）';
    }
    // ⑤ 网络 / 其他：友好兜底
    return '（阿福AI暂时开小差了：请稍后重试；若一直失败，去 ⚙️ 检查' + (isWorker ? ' Worker 地址与部署状态' : ' API 地址/Key/模型名') + '。）';
  },
});

