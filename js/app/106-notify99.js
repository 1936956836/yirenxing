// 106-notify99.js —— v12.9.59 【阿福提醒】手机系统通知栏推送 + 阿福消息中心
// [功能组] G1-系统内核（通知是全 App 提醒基础设施 · 入口：独行空间 → 阿福提醒设置）
//
// 设计（用户规则 · v12.9.49 · v12.9.59 插件官方化）：
//   · 五类提醒：习惯打卡（按预设时间推待打卡清单）/ 喝水（60·90·120 分钟间隔倒计时）/
//     三餐（早中晚餐各自定时间）/ 卫生（1·2·3 日频次 · 检测超期未洗头洗澡隐私洗）/ 睡眠（就寝到点）
//   · 推送引擎 = 官方 @capacitor/local-notifications（替换旧自造通知插件——
//     真机「unable to find plugin」根因之一；官方链路 npx cap sync 自动注册，权限/渠道/排期全官方）
//   · 权限逻辑：首次进入设置页申请【通知权限】（Android 13+ POST_NOTIFICATIONS 运行时授权）；
//     拒绝 → 弹窗「无法发送手机推送，仅APP内弹窗提醒」+ 手动开启路径（不自动跳系统设置）
//   · 独立渠道「阿福的提醒」（系统设置可单独控制铃声 / 震动）
//   · 通知交互：点击直达对应页面（打卡→习惯 · 喝水→习惯 · 三餐→习惯 · 卫生→习惯 · 睡眠→习惯 · 囤货→囤货页）
//   · 阿福口吻文案可自定义（每类一条）；推送记录进【阿福消息中心】（本地 50 条滚动）
//   · 网页版：无系统通知 → 自动降级为 App 内提醒（页面开着时准点弹提示 + 记消息中心）
//   · 存储：localStorage 裸键 notify99（自动随云存档同步多设备）
Object.assign(App, {

  // ==================== 数据层 ====================
  NOTIFY99_DEF() {
    return {
      on: true,
      habit: { on: true, time: '20:30' },
      water: { on: true, every: 90 },                 // 分钟：60 / 90 / 120
      meals: { on: true, b: '07:30', l: '11:30', d: '17:30' },
      hygiene: { on: true, every: 2, time: '20:30' }, // 频次：1 / 2 / 3 日
      sleep: { on: true, time: '22:30' },
      stock: { on: true },                            // 囤货临期（配合 105-stock99）
      custom: {                                       // 自定义文案（空 = 默认阿福口吻）
        habit: '', water: '', meals: '', hygiene: '', sleep: '', stock: '',
      },
      msgs: [],                                       // 消息中心（{ t, ts } · 50 条滚动）
      asked: false,                                   // 通知权限是否已申请过
      hygWarnDay: '',                                 // 卫生提醒当日已记（防重复）
    };
  },
  _notify99Data() {
    try {
      const raw = localStorage.getItem('notify99');
      if (raw) {
        const d = JSON.parse(raw);
        const def = this.NOTIFY99_DEF();
        // 逐字段补默认（老数据升级安全）
        ['habit', 'water', 'meals', 'hygiene', 'sleep', 'stock', 'custom'].forEach(k => {
          if (!d[k]) d[k] = def[k];
          else if (typeof d[k] === 'object' && !Array.isArray(d[k])) d[k] = Object.assign({}, def[k], d[k]);
        });
        if (!Array.isArray(d.msgs)) d.msgs = [];
        return Object.assign(def, d);
      }
    } catch (e) {}
    return this.NOTIFY99_DEF();
  },
  _notify99Save(d) { try { localStorage.setItem('notify99', JSON.stringify(d)); } catch (e) {} },

  // ==================== 推送通道（v12.9.59：官方 @capacitor/local-notifications）====================
  // 旧自造通知插件（AlarmManager + 自有接收器）已整体下线——真机「unable to find plugin」
  //   根因之一。官方插件能力映射：fireNow→schedule(at:now)、schedule/cancel→同名、
  //   canNotify→checkPermissions、askPerm→requestPermissions（Android 13+ POST_NOTIFICATIONS 运行时授权）。
  _notify99Bridge() {
    try {
      return (App._nat99Plg && App._nat99Plg('LocalNotifications')) || null;
    } catch (e) { return null; }
  },
  // 渠道（幂等创建）：独立渠道「阿福的提醒」——系统设置里可单独控制铃声/震动
  async _notify99Channel() {
    const L = this._notify99Bridge();
    if (!L || this.__notify99Ch) return;
    this.__notify99Ch = true;
    try {
      await L.createChannel({ id: 'afu99', name: '阿福的提醒', importance: 4, vibration: true, visibility: 'public' });
    } catch (e) {}
  },
  // 点击深链接线：通知栏点击（含冷启动）→ 直达对应页面
  async _notify99Wire() {
    const L = this._notify99Bridge();
    if (!L || this.__notify99Wired) return;
    this.__notify99Wired = true;
    try {
      await L.addListener('localNotificationActionPerformed', (ev) => {
        try {
          const page = ev && ev.notification && ev.notification.extra && ev.notification.extra.page;
          this._notify99Open(page);
        } catch (e) { try { this.navigate('dashboard'); } catch (e2) {} }
      });
    } catch (e) {}
  },

  // 默认文案（阿福口吻 · 温柔治愈）+ 自定义覆盖
  _notify99Text(kind, d) {
    const c = (d.custom || {})[kind] || '';
    if (c) return c;
    switch (kind) {
      case 'habit': return '阿福提醒你，今天还有待打卡的习惯，不要忘记啦✨';
      case 'water': return '阿福发现你很久没有喝水咯，记得补充水分';
      case 'mealB': return '阿福喊你吃早餐啦，好好照顾自己';
      case 'mealL': return '阿福喊你吃午餐啦，按时吃饭，好好照顾自己';
      case 'mealD': return '阿福喊你吃晚餐啦，按时吃饭，好好照顾自己';
      case 'hygiene': return '阿福提醒你及时卫生清洁，做个爱干净的宝宝';
      case 'sleep': return '阿福提醒，到休息时间啦，早点休息';
      case 'stock': return '阿福提醒，你有囤货马上要到期啦，记得尽快吃掉';
      default: return '阿福在想你啦';
    }
  },

  // 消息中心（阿福消息中心 · 50 条滚动）
  _notify99Log(text) {
    const d = this._notify99Data();
    d.msgs.unshift({ t: String(text || '').slice(0, 120), ts: Date.now() });
    if (d.msgs.length > 50) d.msgs.length = 50;
    this._notify99Save(d);
  },

  // ==================== 推送通道 ====================
  // 系统通知栏（客户端）+ 消息中心。网页版只进消息中心（降级 App 内提醒）
  async _notify99SystemPush(type, title, text, page) {
    this._notify99Log(text);
    const L = this._notify99Bridge();
    if (!L) return;                                   // 网页版：无系统通知
    await this._notify99Channel();
    try {
      await L.schedule({
        notifications: [{
          id: 9900 + Math.floor(Math.random() * 80000),   // 一次性通知：随机 id 不互相覆盖
          title: String(title || '阿福的提醒'),
          body: String(text || '').slice(0, 90),
          schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true, isExactNotification: false },
          channelId: 'afu99',
          extra: { page: page || 'habit' },
        }],
      });
    } catch (e) {}
  },

  // 通知点击深链（MainActivity page 参数 → 这里）：
  // 打卡/喝水/三餐/卫生/睡眠 → 习惯页 · 囤货 → 囤货页 · 情侣 → 情侣空间 · 物品成本 → 物品页
  _notify99Open(page) {
    const map = {
      habit: 'habit', water: 'habit', mealB: 'habit', mealL: 'habit', mealD: 'habit',
      sleep: 'habit', hygiene: 'habit', stock: 'stock99', ta99: 'ta99', cost99: 'cost99',
    };
    const target = map[page] || page || 'habit';
    try { this.gotoWb(target); } catch (e) { try { this.navigate('dashboard'); } catch (e2) {} }
  },

  // ==================== 排期引擎（官方插件 · 客户端）====================
  // 幂等重排全部提醒：设置变化 / 启动 / 回前台时调用。
  // 今天时间已过的排明天；喝水 = 间隔链（下一响 now+间隔）；卫生 = 每日检查点。
  // 每类固定数字 id——重排即同 id 覆盖，天然幂等；关闭的项主动 cancel。
  // v12.9.59 权限前置：force（用户主动触发）时先查通知权限，未授权先 requestPermissions
  //   弹系统授权（Android 13+ POST_NOTIFICATIONS 运行时授权），拒绝则友好提示（手动路径）。
  _notify99Ids: { habit: 9901, water: 9902, mealB: 9903, mealL: 9904, mealD: 9905, hygiene: 9906, sleep: 9907, stock: 9908 },
  async _notify99ApplyAll(force) {
    const L = this._notify99Bridge();
    if (!L) return;                                   // 网页版走 App 内提醒引擎
    const d = this._notify99Data();
    await this._notify99Channel();
    await this._notify99Wire();
    // 权限前置（用户主动触发时）：未授权 → 弹系统授权；仍拒绝 → 友好指引（不自动跳设置）
    if (force) {
      try {
        const st = await L.checkPermissions();
        if (!st || st.display !== 'granted') {
          const st2 = await L.requestPermissions();
          if (!st2 || st2.display !== 'granted') {
            this._flash('🔔 通知权限未开启——到 系统设置 → 应用 → 一人行 → 通知 打开后，阿福才能推送提醒');
            return;
          }
        }
      } catch (e) {}
    }
    try {
      const cancel = (id) => L.cancel({ notifications: [{ id }] }).catch(() => {});
      // 总开关关闭 → 全撤
      if (!d.on) {
        for (const id of Object.values(this._notify99Ids)) cancel(id);
        return;
      }
      const now = new Date();
      const nextAt = (hhmm) => {
        const [h, m] = String(hhmm || '12:00').split(':').map(Number);
        const at = new Date(); at.setHours(h || 0, m || 0, 0, 0);
        if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);   // 过点 → 明天
        return at.getTime();
      };
      const sch = (id, at, text, page) => L.schedule({
        notifications: [{
          id,
          title: '阿福提醒',
          body: String(text || '').slice(0, 90),
          schedule: { at: new Date(at), allowWhileIdle: true, isExactNotification: false },
          channelId: 'afu99',
          extra: { page: page || 'habit' },
        }],
      }).catch(() => {});
      const ids = this._notify99Ids;
      if (d.habit.on) sch(ids.habit, nextAt(d.habit.time), this._notify99Text('habit', d), 'habit');
      else cancel(ids.habit);
      if (d.water.on) sch(ids.water, Date.now() + (+d.water.every || 90) * 60000, this._notify99Text('water', d), 'water');
      else cancel(ids.water);
      const meals = [['mealB', d.meals.b, 'mealB'], ['mealL', d.meals.l, 'mealL'], ['mealD', d.meals.d, 'mealD']];
      for (const [t, tm, k] of meals) {
        if (d.meals.on) sch(ids[t], nextAt(tm), this._notify99Text(k, d), 'habit');
        else cancel(ids[t]);
      }
      if (d.hygiene.on) sch(ids.hygiene, nextAt(d.hygiene.time), this._notify99Text('hygiene', d), 'habit');
      else cancel(ids.hygiene);
      if (d.sleep.on) sch(ids.sleep, nextAt(d.sleep.time), this._notify99Text('sleep', d), 'habit');
      else cancel(ids.sleep);
      // 囤货临期：每日检查点（App 开着时 _stock99Sweep 实时判，这里兜底每日 09:00 一响）
      if (d.stock.on) {
        const at = new Date(); at.setHours(9, 0, 0, 0);
        if (at <= now) at.setDate(at.getDate() + 1);
        sch(ids.stock, at.getTime(), this._notify99Text('stock', d), 'stock99');
      } else cancel(ids.stock);
    } catch (e) {}
  },

  // ==================== 卫生检测（读取习惯库：洗头/洗澡/隐私洗）====================
  _notify99HygDue(d) {
    try {
      const every = Math.max(1, +d.hygiene.every || 2);
      const h99 = Store.getHabit99();
      const days = h99.days || {};
      for (let i = 0; i < every; i++) {
        const dk = this._hb99DkOff(-i);
        const day = days[dk] || {};
        if (day.hairWash || day.bath || day.privacyWash) return false;   // 窗口内洗过：不用提醒
      }
      return true;
    } catch (e) { return false; }
  },
  // 喝水检测：今天 water 卡有记录（宽口径）→ 已补水
  _notify99WaterDoneToday() {
    try {
      const day = ((Store.getHabit99().days || {})[Store.today()]) || {};
      return Array.isArray(day.water) ? day.water.length > 0 : !!day.water;
    } catch (e) { return false; }
  },

  // ==================== App 内提醒引擎（网页版降级 · 页面开着时准点弹）====================
  _notify99Tick() {
    if (this.__notify99TickOn) return;
    this.__notify99TickOn = true;
    const due = {};                                   // 当日已响记录（内存态）
    setInterval(() => {
      try {
        if (this._notify99Bridge()) return;            // 客户端：系统通知负责，不双响
        const d = this._notify99Data();
        if (!d.on) return;
        const now = new Date();
        const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const fire = (k, text) => {
          if (due[k]) return;
          due[k] = 1;
          this._notify99Log(text);
          this._flash('🔔 ' + text);
        };
        if (d.habit.on && hm >= d.habit.time) fire('habit', this._notify99Text('habit', d));
        if (d.meals.on) {
          if (hm >= d.meals.b) fire('mealB', this._notify99Text('mealB', d));
          if (hm >= d.meals.l) fire('mealL', this._notify99Text('mealL', d));
          if (hm >= d.meals.d) fire('mealD', this._notify99Text('mealD', d));
        }
        if (d.sleep.on && hm >= d.sleep.time) fire('sleep', this._notify99Text('sleep', d));
        if (d.hygiene.on && hm >= d.hygiene.time && this._notify99HygDue(d)) fire('hygiene', this._notify99Text('hygiene', d));
        if (d.water.on && !this._notify99WaterDoneToday()) {
          const key = 'water' + Math.floor(Date.now() / ((+d.water.every || 90) * 60000));
          if (due[key] === undefined) { due[key] = 1; this._notify99Log(this._notify99Text('water', d)); this._flash('🚰 ' + this._notify99Text('water', d)); }
        }
      } catch (e) {}
    }, 30000);
  },

  // ==================== 设置页（阿福 · 提醒设置）====================
  _wbRemind99(wb, W) {
    const d = this._notify99Data();
    // 首次进入：申请通知权限（拒绝 → 弹窗「仅APP内弹窗提醒」）
    if (!d.asked) setTimeout(() => { try { this._notify99Ask(); } catch (e) {} }, 300);
    const native = !!this._notify99Bridge();
    const tab = this._notify99Tab || 'set';
    const T = (k) => this._notify99Text(k, d);
    const timeInput = (id, v) => `<input type="time" id="${id}" value="${v}" onchange="App._notify99Set('${id.replace('n99-', '')}', this.value)">`;
    let html = `<div class="ec99-page">
      <div class="cs99-hero">
        <div class="cs99-hero-top">
          <div class="cs99-hero-meta">
            <div class="cs99-hero-tag">🔔 阿福 · 提醒设置</div>
            <div class="cs99-hero-desc">${native ? '系统通知栏推送（渠道「阿福的提醒」）' : '当前为网页版——App 内提醒模式'}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="App.navBack()">← 返回</button>
        </div>
        <div class="cs99-kpi">
          <span>总开关</span>
          <button type="button" class="perm99-sw${d.on ? ' on' : ''}" onclick="App._notify99ToggleMaster()" aria-label="总开关"></button>
          <small>${native ? '开启后阿福可推送系统通知' : '开启后页面开着时阿福准点提醒'}</small>
        </div>
      </div>
      <div class="cs99-tabs">
        <button type="button" class="cs99-tab${tab === 'set' ? ' on' : ''}" onclick="App._notify99SetTab('set')">⚙️ 提醒设置</button>
        <button type="button" class="cs99-tab${tab === 'msg' ? ' on' : ''}" onclick="App._notify99SetTab('msg')">📨 消息中心${d.msgs.length ? ` · ${d.msgs.length}` : ''}</button>
      </div>`;
    if (tab === 'msg') {
      html += d.msgs.length ? d.msgs.map(m => `
        <div class="cs99-item">
          <span class="cs99-ico emoji">🐶</span>
          <div class="cs99-mid">
            <div class="cs99-name">${this.esc(m.t)}</div>
            <div class="cs99-sub">${new Date(m.ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>`).join('') : '<div class="empty" style="margin:18px 0">阿福还没有给你发过消息</div>';
      html += `<div style="text-align:center;margin:14px 0"><button class="btn btn-ghost btn-sm" onclick="App._notify99ClearMsgs()">清空消息</button></div></div>`;
      return html;
    }
    // —— 设置页：分项卡片 ——
    html += `
      <div class="card" style="border:2px solid #bae6fd;background:linear-gradient(180deg,#fff,#f0f9ff)">
        <div class="card-title"><span class="ico">✅</span>习惯打卡提醒
          <button type="button" class="perm99-sw${d.habit.on ? ' on' : ''}" style="margin-left:auto" onclick="App._notify99Toggle('habit')" aria-label="打卡提醒开关"></button></div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">读取习惯打卡清单，在预设时间推送待打卡任务。<br>每日提醒时间 ${timeInput('n99-habitTime', d.habit.time)}</div>
        <div class="n99-text">文案：${this.esc(T('habit'))} <a href="javascript:void(0)" style="font-size:11.5px;color:#0284c7" onclick="App._notify99EditCustom('habit')">改文案</a></div>
      </div>
      <div class="card" style="border:2px solid #bae6fd;background:linear-gradient(180deg,#fff,#f0f9ff)">
        <div class="card-title"><span class="ico">🚰</span>喝水提醒
          <button type="button" class="perm99-sw${d.water.on ? ' on' : ''}" style="margin-left:auto" onclick="App._notify99Toggle('water')" aria-label="喝水提醒开关"></button></div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">检测长时间未喝水，按间隔倒计时推送（打卡过喝水会安静）。</div>
        <div class="cs99-sel-cats" style="margin-top:8px">${[60, 90, 120].map(m => `<button type="button" class="cs99-sel-cat${(+d.water.every === m) ? ' on' : ''}" onclick="App._notify99Set('waterEvery','${m}')">${m} 分钟</button>`).join('')}</div>
        <div class="n99-text">文案：${this.esc(T('water'))} <a href="javascript:void(0)" style="font-size:11.5px;color:#0284c7" onclick="App._notify99EditCustom('water')">改文案</a></div>
      </div>
      <div class="card" style="border:2px solid #bae6fd;background:linear-gradient(180deg,#fff,#f0f9ff)">
        <div class="card-title"><span class="ico">🍽️</span>三餐提醒
          <button type="button" class="perm99-sw${d.meals.on ? ' on' : ''}" style="margin-left:auto" onclick="App._notify99Toggle('meals')" aria-label="三餐提醒开关"></button></div>
        <div style="font-size:12.5px;color:#475569;line-height:2">早 ${timeInput('n99-mealsb', d.meals.b)} · 午 ${timeInput('n99-mealsl', d.meals.l)} · 晚 ${timeInput('n99-mealsd', d.meals.d)}<br>到点阿福喊你按时吃饭，好好照顾自己。</div>
        <div class="n99-text">文案示例：${this.esc(T('mealL'))} <a href="javascript:void(0)" style="font-size:11.5px;color:#0284c7" onclick="App._notify99EditCustom('meals')">改文案</a></div>
      </div>
      <div class="card" style="border:2px solid #bae6fd;background:linear-gradient(180deg,#fff,#f0f9ff)">
        <div class="card-title"><span class="ico">🧼</span>卫生提醒
          <button type="button" class="perm99-sw${d.hygiene.on ? ' on' : ''}" style="margin-left:auto" onclick="App._notify99Toggle('hygiene')" aria-label="卫生提醒开关"></button></div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">系统检测超期无 洗头 / 洗澡 / 隐私洗 记录时提醒。<br>检查时间 ${timeInput('n99-hygieneTime', d.hygiene.time)}</div>
        <div class="cs99-sel-cats" style="margin-top:8px">${[1, 2, 3].map(m => `<button type="button" class="cs99-sel-cat${(+d.hygiene.every === m) ? ' on' : ''}" onclick="App._notify99Set('hygieneEvery','${m}')">${m} 日一提</button>`).join('')}</div>
        <div class="n99-text">文案：${this.esc(T('hygiene'))} <a href="javascript:void(0)" style="font-size:11.5px;color:#0284c7" onclick="App._notify99EditCustom('hygiene')">改文案</a></div>
      </div>
      <div class="card" style="border:2px solid #bae6fd;background:linear-gradient(180deg,#fff,#f0f9ff)">
        <div class="card-title"><span class="ico">🌙</span>睡眠提醒
          <button type="button" class="perm99-sw${d.sleep.on ? ' on' : ''}" style="margin-left:auto" onclick="App._notify99Toggle('sleep')" aria-label="睡眠提醒开关"></button></div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">到设定的就寝时间推送休息提醒。<br>就寝时间 ${timeInput('n99-sleepTime', d.sleep.time)}</div>
        <div class="n99-text">文案：${this.esc(T('sleep'))} <a href="javascript:void(0)" style="font-size:11.5px;color:#0284c7" onclick="App._notify99EditCustom('sleep')">改文案</a></div>
      </div>
      <div class="card" style="border:2px solid #bae6fd;background:linear-gradient(180deg,#fff,#f0f9ff)">
        <div class="card-title"><span class="ico">📦</span>囤货临期提醒
          <button type="button" class="perm99-sw${d.stock.on ? ' on' : ''}" style="margin-left:auto" onclick="App._notify99Toggle('stock')" aria-label="囤货临期开关"></button></div>
        <div style="font-size:12.5px;color:#475569;line-height:1.9">囤货距到期 ≤7 天时，阿福推送提醒尽快消耗（配合【囤货保质期】页）。</div>
        <div class="n99-text">文案：${this.esc(T('stock'))} <a href="javascript:void(0)" style="font-size:11.5px;color:#0284c7" onclick="App._notify99EditCustom('stock')">改文案</a></div>
      </div>
      <div style="font-size:11.5px;color:#94a3b8;line-height:1.9;margin:14px 2px">
        开启通知权限后，阿福可以在手机通知栏给你推送提醒；关闭权限仅在 APP 内提示。<br>
        通知渠道「阿福的提醒」可在手机系统设置里单独控制铃声、震动；点通知直达对应页面，通知自带「稍后15分钟」。
      </div>
      <div style="text-align:center;margin:6px 0 20px">
        <button class="btn btn-ghost btn-sm" onclick="App._notify99Test()">🔔 发一条测试提醒</button>
        <button class="btn btn-ghost btn-sm" onclick="App._notify99ApplyAll(true)">🔄 重新排期</button>
      </div>
    </div>`;
    return html;
  },

  _notify99SetTab(t) { this._notify99Tab = t; this._sfx99('tap'); this.render_workbench(); },

  // 权限申请（首次进页）：拒绝 → 弹窗说明（不自动跳系统设置——按用户规定只给手动路径）
  async _notify99Ask() {
    const L = this._notify99Bridge();
    const d = this._notify99Data();
    if (!L || d.asked) return;
    d.asked = true;
    this._notify99Save(d);
    try {
      const st = await L.requestPermissions();          // 系统授权弹窗（Android 13+）
      if (!st || st.display !== 'granted') {
        this._modal('🔔 无法发送手机推送', `
          <div style="font-size:12.5px;color:#475569;line-height:2">
            通知权限没有开启——<b>仅 APP 内弹窗提醒</b>（页面开着时准点提示，消息都会进阿福消息中心）。<br>
            想要手机通知栏推送，手动开启：<br>
            <b>系统设置 → 应用 → 一人行 → 通知 → 允许</b>
          </div>`, [
          { label: '知道了' },
        ]);
        return;
      }
      await this._notify99ApplyAll(true);
    } catch (e) {}
  },

  // ==================== 交互 ====================
  async _notify99ToggleMaster() {
    const d = this._notify99Data();
    d.on = !d.on;
    this._notify99Save(d);
    this._sfx99(d.on ? 'on' : 'off');
    await this._notify99ApplyAll(true);
    this.render_workbench();
  },
  async _notify99Toggle(kind) {
    const d = this._notify99Data();
    d[kind].on = !d[kind].on;
    this._notify99Save(d);
    this._sfx99(d[kind].on ? 'on' : 'off');
    await this._notify99ApplyAll(true);
    this.render_workbench();
  },
  async _notify99Set(key, val) {
    const d = this._notify99Data();
    switch (key) {
      case 'habitTime': d.habit.time = val; break;
      case 'mealsb': d.meals.b = val; break;
      case 'mealsl': d.meals.l = val; break;
      case 'mealsd': d.meals.d = val; break;
      case 'hygieneTime': d.hygiene.time = val; break;
      case 'sleepTime': d.sleep.time = val; break;
      case 'waterEvery': d.water.every = +val; break;
      case 'hygieneEvery': d.hygiene.every = +val; break;
    }
    this._notify99Save(d);
    this._sfx99('tap');
    await this._notify99ApplyAll(true);
    this.render_workbench();
  },
  _notify99EditCustom(kind) {
    const d = this._notify99Data();
    this._modal('✍️ 自定义提醒文案', `
      <div style="font-size:12.5px;color:#475569;line-height:1.9">
        阿福的推送文字你想改成什么样？（留空 = 恢复默认）<br>
        <textarea id="n99-custom" maxlength="60" style="width:100%;margin-top:8px;min-height:64px;border-radius:10px;border:1px solid #cbd5e1;padding:8px;font-size:13px">${this.esc(d.custom[kind] || '')}</textarea>
      </div>`,
      [{ label: '保存', primary: true, onClick: () => {
          d.custom[kind] = (document.getElementById('n99-custom').value || '').trim();
          this._notify99Save(d);
          this._flash('✅ 文案已保存');
          this._notify99ApplyAll(true);
          this.render_workbench();
        } }, { label: '取消' }]);
  },
  async _notify99Test() {
    const d = this._notify99Data();
    const text = this._notify99Text('habit', d);
    // v12.9.59 权限前置：测试前先查通知权限，未授权先弹系统授权；拒绝 → 友好指引（手动路径）
    const L = this._notify99Bridge();
    if (L) {
      try {
        const st = await L.checkPermissions();
        if (!st || st.display !== 'granted') {
          const st2 = await L.requestPermissions();
          if (!st2 || st2.display !== 'granted') {
            this._flash('🔔 通知权限未开启——到 系统设置 → 应用 → 一人行 → 通知 打开后重试');
            return;
          }
        }
      } catch (e) {}
    }
    await this._notify99SystemPush('habit', '阿福的提醒（测试）', '这是一条测试提醒——阿福在你手机通知栏问候你 🐶', 'habit');
    this._flash('🔔 测试提醒已发出（通知栏 + 消息中心都有记录）');
  },
  _notify99ClearMsgs() {
    const d = this._notify99Data();
    d.msgs = [];
    this._notify99Save(d);
    this._flash('🗑️ 消息中心已清空');
    this.render_workbench();
  },
});

// ==================== 启动接线（客户端渠道 + 点击深链 + 重排 + 网页版 App 内提醒引擎）====================
// 首次进入【阿福提醒设置】页时 _wbRemind99 会调 _notify99Ask() 申请通知权限
// 注意：App 是顶层 const（未挂 window）——判存在用 typeof App，判 window.App 会永远为 false
(function () {
  const boot = () => {
    try {
      if (typeof App !== 'undefined' && App._notify99ApplyAll) {
        App._notify99Channel();                       // 渠道幂等创建
        App._notify99Wire();                          // 点击深链监听（含冷启动）
        App._notify99ApplyAll();
      }
    } catch (e) {}
  };
  setTimeout(boot, 4500);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(boot, 800);
  });
  // 网页版降级引擎（App 内提醒）：模块加载即常驻（30s 一轮 · 客户端自动跳过）
  setTimeout(() => { try { if (typeof App !== 'undefined' && App._notify99Tick) App._notify99Tick(); } catch (e) {} }, 6000);
  // v12.9.70 阿福·应用锁机习惯打卡条件调度（116-lock99.js · 60s 一轮 · 阿福模式才动作）
  setTimeout(() => { try { if (typeof App !== 'undefined' && App._afu99LockTick) App._afu99LockTick(); } catch (e) {} }, 8000);
})();
