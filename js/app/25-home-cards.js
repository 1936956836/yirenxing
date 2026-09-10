// 25-home-cards.js —— 天气（hero chip）/ 健康隐私锁（自 app.js 机械拆分 · v2026.0905 模块化）
// [功能组] G8-首页导航（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// v12.7：天气并入首页 hero chip（#hero99W）；旧「天气卡/今日核心/健康趋势/每周洞察」
//       首页卡已删除（renderTodayCore/renderHealthTrend/renderWeeklyInsights 无调用方，死代码清理）
Object.assign(App, {
  // ====== 今日天气卡：定位 → Open-Meteo 实时天气 ======
  // 天气编码(WMO) → {icon,desc},
  _weatherCodeMap(code) {
    const m = {
      0: { icon: '☀️', desc: '晴' },
      1: { icon: '🌤️', desc: '少云' },
      2: { icon: '⛅', desc: '多云' },
      3: { icon: '☁️', desc: '阴' },
      45: { icon: '🌫️', desc: '雾' },
      48: { icon: '🌫️', desc: '冻雾' },
      51: { icon: '🌦️', desc: '小毛雨' },
      53: { icon: '🌦️', desc: '毛雨' },
      55: { icon: '🌧️', desc: '大毛雨' },
      56: { icon: '🌧️', desc: '冻毛雨' },
      57: { icon: '🌧️', desc: '冻雨' },
      61: { icon: '🌦️', desc: '小雨' },
      63: { icon: '🌧️', desc: '中雨' },
      65: { icon: '🌧️', desc: '大雨' },
      66: { icon: '🌧️', desc: '冻雨' },
      67: { icon: '🌧️', desc: '强冻雨' },
      71: { icon: '🌨️', desc: '小雪' },
      73: { icon: '🌨️', desc: '中雪' },
      75: { icon: '❄️', desc: '大雪' },
      77: { icon: '🌨️', desc: '冰粒' },
      80: { icon: '🌦️', desc: '小阵雨' },
      81: { icon: '🌧️', desc: '阵雨' },
      82: { icon: '⛈️', desc: '强阵雨' },
      85: { icon: '🌨️', desc: '小阵雪' },
      86: { icon: '❄️', desc: '强阵雪' },
      95: { icon: '⛈️', desc: '雷暴' },
      96: { icon: '⛈️', desc: '雷暴冰雹' },
      99: { icon: '⛈️', desc: '强雷暴冰雹' },
    };
    return m[code] || { icon: '🌡️', desc: '未知' };
  },
  // v12.7 天气 chip：仅写入首页 hero 的 #hero99W（图标 + 温度）；
  // 详细天气界面暂未上线（用户：先不讨论），chip 暂为纯展示
  _renderWeatherData(d) {
    const el = document.getElementById('hero99W');
    if (!el) return;
    const w = this._weatherCodeMap(d.code);
    el.textContent = `${w.icon} ${Math.round(d.temp)}°C`;
    el.title = `今日天气 · ${w.desc}${d.isDay ? '' : '（夜间）'} · ${d.locName || '当前位置'} · 体感 ${Math.round(d.feels)}°C`;
  },
  _renderWeatherError(msg) {
    const el = document.getElementById('hero99W');
    if (!el) return;
    el.textContent = '🌤️ —°';
    el.title = '天气获取失败：' + (msg || '');
  },
  async loadWeather() {
    // 30 分钟内缓存命中
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem('weather_cache') || 'null'); } catch(e){}
    const fresh = cache && (Date.now() - (cache.ts || 0) < 30 * 60 * 1000);
    if (fresh) { this._renderWeatherData(cache.data); return; }
    // v12.9.16 失败退避：上次失败后 10 分钟内不再请求（外部 API 限流 429 时每次渲染都打，
    //   控制台被 fetch 报错刷屏——负面结果也缓存，安静等待重试窗口）
    try {
      const bk = JSON.parse(localStorage.getItem('weather_fail_backoff') || 'null');
      if (bk && (Date.now() - (bk.ts || 0)) < 10 * 60 * 1000) return;
    } catch(e){}
    const failBackoff = () => { try { localStorage.setItem('weather_fail_backoff', JSON.stringify({ ts: Date.now() })); } catch(e){} };
    // 1) 优先 Geolocation（浏览器原生，最准）
    let lat = null, lon = null, locName = '当前位置';
    const geoResult = await this._geoLocate(8000).catch(() => null);
    if (geoResult && geoResult.lat != null) {
      lat = geoResult.lat; lon = geoResult.lon;
      locName = geoResult.name || '当前位置';
    } else {
      // 2) 回退：IP 定位（https://ipwho.is/ 无 key）
      const ip = await this._ipLocate().catch(() => null);
      if (ip && ip.lat != null) { lat = ip.lat; lon = ip.lon; locName = ip.name || '当前位置(IP)'; }
    }
    if (lat == null || lon == null) {
      this._renderWeatherError('无法获取定位，请允许位置权限或检查网络');
      failBackoff();
      return;
    }
    // 3) Open-Meteo 取实时天气（免 key）
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      const j = await res.json();
      if (!j || !j.current) throw new Error('天气数据为空');
      const data = {
        locName, lat, lon,
        temp: j.current.temperature_2m,
        feels: j.current.apparent_temperature,
        humidity: j.current.relative_humidity_2m,
        wind: j.current.wind_speed_10m,
        code: j.current.weather_code,
        isDay: j.current.is_day === 1,
      };
      // 缓存（成功同时清失败退避）
      try { localStorage.setItem('weather_cache', JSON.stringify({ ts: Date.now(), data })); localStorage.removeItem('weather_fail_backoff'); } catch(e){}
      this._renderWeatherData(data);
    } catch (e) {
      this._renderWeatherError('天气获取失败：' + (e.message || '网络错误'));
      failBackoff();
    }
  },
  // 浏览器 Geolocation → {lat, lon, name}
  _geoLocate(timeout) {
    return new Promise((resolve, reject) => {
      if (!navigator || !navigator.geolocation) { reject(new Error('no geo')); return; }
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; reject(new Error('geo timeout')); } }, timeout || 8000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (done) return;
          done = true; clearTimeout(t);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: '当前位置' });
        },
        (err) => {
          if (done) return;
          done = true; clearTimeout(t);
          reject(new Error('geo error: ' + err.message));
        },
        { enableHighAccuracy: false, timeout: timeout || 8000, maximumAge: 10 * 60 * 1000 }
      );
    });
  },
  // IP 定位回退 → {lat, lon, name}（用 ipwho.is，免 key，https）
  async _ipLocate() {
    const res = await fetch('https://ipwho.is/');
    const j = await res.json();
    if (!j || j.success === false) return null;
    const parts = [j.city, j.region, j.country].filter(Boolean);
    return { lat: j.latitude, lon: j.longitude, name: parts.join(' · ') || '当前位置' };
  },
  // 某日记录的完成度百分比（null-safe，用于热力图 / 首页小树卡）
  dayCompletionPct(rec) {
    if (!rec) return 0;
    let total = 0, done = 0;
    try {
      (CONFIG.medications || []).forEach(m => { total++; if (rec.medications && rec.medications[m.id] && rec.medications[m.id].done) done++; });
      total += 2; if (rec.sleep && rec.sleep.night && rec.sleep.night.slept) done++; if (rec.sleep && rec.sleep.noon && rec.sleep.noon.slept) done++;
      total += 4; if (rec.diet && rec.diet.meals && rec.diet.meals.breakfast) done++; if (rec.diet && rec.diet.meals && rec.diet.meals.lunch) done++; if (rec.diet && rec.diet.meals && rec.diet.meals.dinner) done++; if (rec.diet && rec.diet.water >= (CONFIG.diet ? CONFIG.diet.waterMin : 0)) done++;
      ['face','oral','private','foot','bed','desk'].forEach(k => { total++; if (rec.hygiene && rec.hygiene[k]) done++; });
      total += 2; if (rec.exercise && rec.exercise.steps >= (CONFIG.exercise ? CONFIG.exercise.stepMin : 0)) done++; if (rec.exercise && rec.exercise.anaerobicCount >= (CONFIG.exercise ? CONFIG.exercise.minAnaerobic : 0)) done++;
      total++; if (rec.learning && (rec.learning.totalHours >= (CONFIG.learning ? CONFIG.learning.minHours : 0) || rec.learning.meditateMin >= 30)) done++;
    } catch(e){}
    return total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
  },
  // 读取/初始化体检复查设置（内存优先，localStorage 持久化；81-vault99.js 健康隐私分区读取）
  _getCheckup() {
    if (this._checkup === undefined) {
      // v2.0.6：敏感病名默认不再显示具体字串，改为泛称，防止被身边人瞟到
      this._checkup = { name: '🗓️ 年度个人专项复查', date: '' };
      try {
        const ln = localStorage.getItem('checkup_name'); if (ln) this._checkup.name = ln;
        const ld = localStorage.getItem('checkup_date'); if (ld) this._checkup.date = ld;
      } catch(e){}
    }
    return this._checkup;
  },
  // v2.0.6：隐私文本统一泛化 —— 未解锁时命中敏感关键词一律显示为 "🔒 个人隐私项"，绝不外泄具体病名
  _SENS_RE: /HIV|HPV|梅毒|性病|艾滋|尖锐湿疣|乙肝|丙肝|淋病|生殖道|衣原体|支原体|hiv|hpv|\bTP\b|tpab|tppa|rpr/i,
  _healthSensMatch(text) {
    if (text == null) return false;
    return this._SENS_RE.test(String(text));
  },
  // unlock:true(已解锁) 还原原文；unlock:false 命中则 mask
  _sensBlur(text, alt) {
    if (text == null) return '';
    const s = String(text);
    if (this._isHealthUnlocked()) return s;
    if (!this._healthSensMatch(s)) return s;
    return alt || '🔒 个人隐私项';
  },
  _isHealthUnlocked() {
    try {
      const ss = +(sessionStorage.getItem('hiv_unlocked') || 0);
      if (ss > Date.now()) return true;
      const ts = +localStorage.getItem('health_sensitive_unlock_ts') || 0;
      if (ts && Date.now() - ts < 30*60*1000) {
        sessionStorage.setItem('hiv_unlocked', String(Date.now() + 30*60*1000));
        return true;
      }
    } catch(e){}
    return false;
  },
  // ===== v2.0.6：健康隐私强锁（不提示密码具体值）=====
  //   用户点击用药/复查区域时，若未解锁，弹窗要求输入密码；不对密码做任何提示。
  //   与 healthSensitiveUnlock() 共用同一个 sessionStorage key 'hiv_unlocked' 与密码 2004。
  _requireHealthUnlock(onOk) {
    if (this._isHealthUnlocked()) { try { onOk && onOk(); } catch(_){} return true; }
    const modal = (labelEl, placeholderText) => {
      this._modal({
        title:'🔐 隐私保护',
        body:`<div style="padding:10px 12px 4px">
          <div style="font-size:13.5px;line-height:1.9;color:#0f172a">当前内容为个人隐私项，需解锁后查看或操作（会话级，关页失效）。</div>
          <div class="field" style="margin-top:10px"><label>${labelEl}</label>
            <input type="password" class="input" id="healthLockInputPwd" value="" placeholder="${placeholderText}" onkeydown="if(event.key==='Enter')App._healthLockDoOk()">
          </div>
        </div>`,
        actions:[
          { label:'取消' },
          { label:'🔓 解锁', primary:true, onClick: () => this._healthLockDoOk(onOk) }
        ]
      });
    };
    modal('密码', '请输入密码');
    return false;
  },
  _healthLockDoOk(onOk) {
    // v12.2：密码统一走密码箱（用户自设；未设置过密码箱密码时兼容旧默认 2004）
    const el = document.getElementById('healthLockInputPwd');
    const pwd = String((el && el.value) || '').trim();
    if (!this._vault99PwdOk(pwd)) { alert('密码错误（密码由你的【密码箱】管理）'); return false; }
    const until = Date.now() + 30*60*1000;
    try {
      sessionStorage.setItem('hiv_unlocked', String(until));
      localStorage.setItem('health_sensitive_unlock_ts', String(Date.now()));
    } catch(e){}
    try { onOk && onOk(); } catch(_){}
    return true;
  },
  // Step4：健康 / 就医数据 敏感项统一解锁入口（opts.onDone：解锁成功回调，供就医数据页刷新用）
  healthSensitiveUnlock(opts) {
    opts = opts || {};
    this._modal({
      title:'🔐 敏感隐私解锁（会话级，关页自动失效）',
      body:`<div style="padding:10px">
        <div style="font-size:13.5px;line-height:1.8;color:#0f172a">用于查看 / 编辑被系统自动识别的健康隐私记录。比对在本机浏览器会话内存完成，关闭页面立即失效。</div>
        <div class="field" style="margin-top:10px"><label>请输入密码</label>
          <input type="password" class="input" id="hivPassInput2" value="" placeholder="4 位数字" onkeydown="if(event.key==='Enter')App._hivUnlockDo()">
        </div>
      </div>`,
      actions:[
        { label:'取消' },
        { label:'🔓 解锁 30 分钟', primary:true, onClick: () => {
            const ok = this._hivUnlockDo();
            if (ok && typeof opts.onDone === 'function') try { opts.onDone(); } catch(_){}
        } }
      ]
    });
  },
  _hivUnlockDo() {
    const el = document.getElementById('hivPassInput2');
    const pwd = String((el && el.value) || '').trim();
    if (!this._vault99PwdOk(pwd)) { alert('密码错误，请重试（密码由你的【密码箱】管理）'); return false; }
    // 会话级解锁（关浏览器自动失效，避免遗留泄露）
    try { sessionStorage.setItem('hiv_unlocked', String(Date.now() + 30*60*1000)); } catch(e){
      try { localStorage.setItem('health_sensitive_unlock_ts', String(Date.now())); } catch(e2){}
    }
    this._closeModal();
    this._flash('🔓 敏感项已解锁，30 分钟内可自由查看（关闭页面自动失效）');
    if (typeof this.render_health === 'function') this.render_health();
    return true;
  },
  healthSensitiveLock() {
    try { sessionStorage.removeItem('hiv_unlocked'); } catch(e){}
    try { localStorage.removeItem('health_sensitive_unlock_ts'); } catch(e){}
    this._flash('🔒 敏感项已重新锁定');
    if (typeof this.render_health === 'function') this.render_health();
  },
});
