// 99-weather99.js —— v12.9.46 【独行天气】页（首页天气键进入）
// [功能组] G8-首页导航（天气域：首页 hero 天气 chip → 本页）
//
// 设计（用户规则）：
//   · 参考市面天气预报 App：当前位置 + 实况大温度 + 今日逐小时预报 + 7 日预报
//   · 天气条件下的温馨提醒（下雨记得带伞 / 紫外线强防晒 / 大风防风 …）
//   · 当日气候数据四件套：风力（蒲福风级 + 风向）/ 湿度 / 紫外线强度 / 气压
//   · 24 节气倒数 + 每个节气的养生提示（通用推算公式 · 2000-2099 全覆盖）
//   · 央视天气播报卡片：跳转当日央视天气内容（weather.cctv.com）
// 数据：Open-Meteo（免 key）· 缓存 localStorage weather99_cache（30 分钟）
//      定位复用 25-home-cards.js 的 _geoLocate/_ipLocate（浏览器定位 → IP 兜底）
Object.assign(App, {

  // ==================== 24 节气（通用推算公式 · 21 世纪）====================
  // day = floor(y*0.2422 + C) - floor(y/4)，y = 年-2000；个别年份按例外表修正
  WEATHER99_TERMS: [
    { n: '小寒', ico: '🌨️', m: 1, C: 5.4055, d: '天渐寒，尚未大冷', t: '补肾防寒为要。食参芪炖汤忌生冷，头部足部保暖第一；早睡晚起，待日光而出。' },
    { n: '大寒', ico: '❄️', m: 1, C: 20.12, d: '一年中最冷的时期', t: '防风御寒。八宝饭温补脾胃，减少清晨户外活动；睡前温水泡脚15分钟，静待立春。' },
    { n: '立春', ico: '🌱', m: 2, C: 3.87, d: '春季开始，万物复苏', t: '助阳生发，养肝为先。早睡早起，多吃辛甘发散之品（韭菜、豆芽）；「春捂」防倒春寒。' },
    { n: '雨水', ico: '💧', m: 2, C: 18.73, d: '降雨开始，雨量渐增', t: '养脾祛湿。少酸多甘，山药薏米煲汤；湿气渐重，衣物常晒，谨防「倒春寒」。' },
    { n: '惊蛰', ico: '⚡', m: 3, C: 5.63, d: '春雷乍动，惊醒蛰虫', t: '顺肝之性。宜食梨润燥，忌辛辣；夜卧早起，舒展筋骨，踏青散步正当时。' },
    { n: '春分', ico: '🌸', m: 3, C: 20.646, d: '昼夜平分，寒温各半', t: '阴阳平衡。作息规律，饮食寒热均衡；春困时节多伸展，午间小憩 20 分钟。' },
    { n: '清明', ico: '🌿', m: 4, C: 4.81, d: '天清气明，春耕时节', t: '柔肝养肺。踏青舒缓情绪，青团适量；花粉过敏者出行戴口罩，勤开窗通风。' },
    { n: '谷雨', ico: '🌾', m: 4, C: 20.1, d: '雨生百谷，春将尽', t: '祛湿防病。湿气渐重，少食肥甘厚味；早睡早起精神好，早晚仍有凉意需添衣。' },
    { n: '立夏', ico: '☀️', m: 5, C: 5.52, d: '夏季开始，万物繁茂', t: '养心为要。晚睡早起加午休；食清淡易消化，午间避烈日，心境宜静。' },
    { n: '小满', ico: '🌡️', m: 5, C: 21.04, d: '麦类等夏熟作物籽粒渐满', t: '防湿热。苦菜当令清热，忌冷饮伤脾；保持心境平和，运动量适度收敛。' },
    { n: '芒种', ico: '🌾', m: 6, C: 5.678, d: '有芒作物成熟，忙收忙种', t: '清补防困。多喝水补水分，食瓜果杂粮；勤洗澡勤换衣，午睡解乏。' },
    { n: '夏至', ico: '🌞', m: 6, C: 21.37, d: '白昼最长，阳气至极', t: '护阳养心。阳气最旺，午间务必小憩；食面养胃，忌贪凉饮冷伤阳气。' },
    { n: '小暑', ico: '🥵', m: 7, C: 7.108, d: '天气开始炎热，尚未极热', t: '消暑宁心。绿豆汤解暑，避开 11-15 时烈日；心静自然凉，空调 26℃ 为宜。' },
    { n: '大暑', ico: '🔥', m: 7, C: 22.83, d: '一年中最热的时期', t: '防中暑。补水补盐，温水洗澡优于冷水；少动多静，老年学生群体尤防暑热。' },
    { n: '立秋', ico: '🍂', m: 8, C: 7.5, d: '秋季开始，暑去凉来', t: '润燥「贴秋膘」有度。芝麻糯米润肺；早卧早起与鸡俱兴，情绪忌悲秋。' },
    { n: '处暑', ico: '🍁', m: 8, C: 23.13, d: '暑气至此而止，天气转凉', t: '防秋燥。早睡早起，食银耳百合润肺；缓和运动，收敛神气，少辛增酸。' },
    { n: '白露', ico: '🌫️', m: 9, C: 7.646, d: '天气转凉，晨晚见露', t: '暖腰腹，不露体肤。「白露身不露」——桂圆红枣温补，晨晚添衣，睡前勿贪凉。' },
    { n: '秋分', ico: '🌗', m: 9, C: 23.042, d: '昼夜再度平分，凉意渐浓', t: '平补润燥。蟹肥正当时适量食酸甘；情绪防「悲秋」，多晒太阳多散步。' },
    { n: '寒露', ico: '🍁', m: 10, C: 8.318, d: '露水已寒，秋意渐深', t: '润肺益胃。芝麻核桃滋阴，睡前热水泡脚暖足；「朝盐晚蜜」，颈部脚踝莫外露。' },
    { n: '霜降', ico: '❄️', m: 10, C: 23.438, d: '天气渐冷，初霜出现', t: '平补防寒。栗子、萝卜当令；「春捂秋冻」有度，睡前泡脚，适度「秋冻」不僵冻。' },
    { n: '立冬', ico: '⛄', m: 11, C: 7.438, d: '冬季开始，万物收藏', t: '补冬养藏。温补牛羊肉萝卜汤，早睡晚起待日光；情志宜安静，少折腾。' },
    { n: '小雪', ico: '🌨️', m: 11, C: 22.36, d: '开始降雪，雪量尚小', t: '防「冬季抑郁」。多晒太阳多运动，食黑色食物补肾（黑豆、黑芝麻）；室内常通风。' },
    { n: '大雪', ico: '🌬️', m: 12, C: 7.18, d: '降雪增多，地面积雪', t: '温补驱寒。羊肉萝卜煲正当时；保暖重头足，帽子围巾戴起来，适度锻炼出汗即止。' },
    { n: '冬至', ico: '🥟', m: 12, C: 21.94, d: '白昼最短，一阳初生', t: '「冬至一阳生」。饺子汤圆进补，艾灸温阳；睡眠宜充足，静养蓄锐待春归。' },
  ],
  // 21 世纪已知例外修正（年份 → 天数偏移）
  WEATHER99_TERM_EXC: {
    '小寒': { 2019: -1 }, '大寒': { 2082: 1 }, '立春': { 2026: -1 }, '雨水': { 2026: 1, 2076: 1 },
    '春分': { 2084: 1 }, '立夏': { 2008: 1 }, '小满': { 2008: 1 }, '芒种': { 2002: 1, 2028: 1 },
    '小暑': { 2016: 1 }, '大暑': { 2004: 1 }, '立秋': { 2002: 1, 2042: 1 }, '秋分': { 2084: 1 },
    '寒露': { 2088: 1 }, '霜降': { 2089: 1 }, '立冬': { 2089: 1 }, '冬至': { 2021: -1 },
  },
  // 某年某节气日期（yyyy-mm-dd）
  _weather99TermDate(term, year) {
    const y = year - 2000;
    let day = Math.floor(y * 0.2422 + term.C) - Math.floor(y / 4);
    const exc = (this.WEATHER99_TERM_EXC[term.n] || {})[year];
    if (exc) day += exc;
    return year + '-' + String(term.m).padStart(2, '0') + '-' + String(Math.max(1, day)).padStart(2, '0');
  },
  // 从今天起找下一个节气（含今天当天）与再下一个
  _weather99NextTerms() {
    const today = Store.today();
    const out = [];
    for (let yr = parseInt(today.slice(0, 4), 10); yr <= parseInt(today.slice(0, 4), 10) + 1 && out.length < 2; yr++) {
      const list = this.WEATHER99_TERMS.map(t => ({ t, dk: this._weather99TermDate(t, yr) }))
        .filter(x => x.dk >= today).sort((a, b) => a.dk < b.dk ? -1 : 1);
      for (const x of list) { if (out.length < 2) out.push(x); }
    }
    return out;
  },
  _weather99DaysLeft(dk) {
    const today = Store.today();
    return Math.round((new Date(dk + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
  },

  // ==================== 气候数据解读 ====================
  _weather99Beaufort(ms) { // 蒲福风级（m/s → 级 + 名称）
    const B = [[0.3, '0级 · 无风'], [1.6, '1级 · 软风'], [3.4, '2级 · 轻风'], [5.5, '3级 · 微风'],
      [8.0, '4级 · 和风'], [10.8, '5级 · 清劲风'], [13.9, '6级 · 强风'], [17.2, '7级 · 疾风'],
      [20.8, '8级 · 大风'], [24.5, '9级 · 烈风'], [28.5, '10级 · 狂风'], [32.7, '11级 · 暴风']];
    for (let i = 0; i < B.length; i++) if (ms < B[i][0]) return B[i][1];
    return '12级+ · 飓风';
  },
  _weather99WindDir(deg) {
    const D = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
    return D[Math.round(((deg || 0) % 360) / 45) % 8];
  },
  _weather99UvLevel(uv) {
    if (uv == null) return { n: '—', tip: '暂无数据' };
    if (uv < 3) return { n: '最弱', tip: '一级 · 可正常户外活动' };
    if (uv < 5) return { n: '弱', tip: '二级 · 适当涂防晒霜' };
    if (uv < 7) return { n: '中等', tip: '三级 · 出门涂防晒 · 戴帽子' };
    if (uv < 10) return { n: '强', tip: '四级 · 防晒霜+遮阳伞+避开正午' };
    return { n: '很强', tip: '五级 · 尽量避免白天外出' };
  },
  _weather99HumLevel(h) {
    if (h == null) return { n: '—', tip: '暂无数据' };
    if (h < 30) return { n: '干燥', tip: '多喝水，皮肤注意保湿' };
    if (h <= 60) return { n: '舒适', tip: '体感舒适，不干不潮' };
    if (h <= 80) return { n: '偏湿', tip: '体感微闷，衣着透气' };
    return { n: '潮湿', tip: '湿气重，衣物难干注意防霉' };
  },
  _weather99PresLevel(p) {
    if (p == null) return { n: '—', tip: '暂无数据' };
    if (p >= 1015) return { n: '偏高', tip: '高压控制，多晴稳天气' };
    if (p >= 1005) return { n: '正常', tip: '气压平稳，体感无碍' };
    return { n: '偏低', tip: '低气压，天气多变敏感者注意' };
  },

  // ==================== 天气条件温馨提醒 ====================
  _weather99Tips(d) {
    const tips = [];
    const code = d.code, temp = d.temp, uv = d.uv, wind = d.wind, hum = d.humidity, rain = d.rain || 0, pres = d.pressure;
    if ([61, 63, 65, 66, 67, 51, 53, 55, 56, 57, 80, 81, 82].includes(code)) tips.push({ ico: '☂️', t: '今天有雨，出门记得带伞，路面湿滑慢行' });
    if ([95, 96, 99].includes(code)) tips.push({ ico: '⛈️', t: '雷雨大风预警：避免户外活动，远离大树与高处' });
    if ([71, 73, 75, 77, 85, 86].includes(code)) tips.push({ ico: '🧣', t: '今天有雪，注意保暖防滑，走路踩实步幅小' });
    if ([45, 48].includes(code)) tips.push({ ico: '🚗', t: '今天有雾，出行注意安全，驾车减速开雾灯' });
    if (temp != null && temp >= 35) tips.push({ ico: '🥵', t: '高温酷暑：多补水补盐，避开 11-15 时烈日' });
    if (temp != null && temp <= 0) tips.push({ ico: '🧤', t: '冰点以下：帽子围巾手套齐上阵，防冻疮' });
    if (uv != null && uv >= 8) tips.push({ ico: '🧴', t: '紫外线很强：防晒霜 + 遮阳伞 + 太阳镜全副武装' });
    else if (uv != null && uv >= 6) tips.push({ ico: '🧢', t: '紫外线较强：出门涂防晒霜，戴顶帽子' });
    if (wind != null && wind >= 10.8) tips.push({ ico: '🌬️', t: '风力 6 级以上：阳台花盆收回，出行远离广告牌' });
    if (hum != null && hum <= 30) tips.push({ ico: '💧', t: '空气干燥：多喝温水，皮肤涂保湿霜' });
    if (hum != null && hum >= 85) tips.push({ ico: '🌊', t: '空气很潮：关好门窗，注意衣物防霉' });
    if (pres != null && pres < 1000) tips.push({ ico: '📉', t: '气压偏低：天气多变，体感敏感者注意休息' });
    if (rain > 0 && rain < 0.5) tips.push({ ico: '🌦️', t: '有零星小雨：带把折叠伞有备无患' });
    if (!tips.length) tips.push({ ico: '😊', t: '今天天气不错，适合出门走走、晒晒太阳' });
    return tips.slice(0, 4);
  },

  // ==================== 数据获取（Open-Meteo · 30 分钟缓存）====================
  _weather99Read() {
    try {
      const c = JSON.parse(localStorage.getItem('weather99_cache') || 'null');
      if (c && c.data && (Date.now() - (c.ts || 0) < 30 * 60 * 1000)) return c.data;
    } catch (e) {}
    return null;
  },
  async _weather99Kick(force) {
    if (!force && this._weather99Read()) return; // 新鲜缓存命中
    // 失败退避：上次失败 10 分钟内不再请求（防限流刷屏）
    try {
      const bk = JSON.parse(localStorage.getItem('weather99_fail_backoff') || 'null');
      if (!force && bk && (Date.now() - (bk.ts || 0) < 10 * 60 * 1000)) return;
    } catch (e) {}
    const failBackoff = () => { try { localStorage.setItem('weather99_fail_backoff', JSON.stringify({ ts: Date.now() })); } catch (e) {} };
    // v12.9.46b 手动选址优先（用户规则）：客户端拿不到定位权限时不再静默回落北京——
    //   ① 用户设置过的地区（weather99_loc）最优先；② 浏览器 Geolocation；③ IP 兜底
    let lat = null, lon = null, locName = '当前位置';
    try {
      const m = JSON.parse(localStorage.getItem('weather99_loc') || 'null');
      if (m && m.lat != null && m.lon != null) { lat = m.lat; lon = m.lon; locName = m.name || '自定义地区'; }
    } catch (e) {}
    if (lat == null) {
      const geo = await this._geoLocate(8000).catch(() => null);
      if (geo && geo.lat != null) { lat = geo.lat; lon = geo.lon; locName = geo.name || '当前位置'; }
      else {
        const ip = await this._ipLocate().catch(() => null);
        if (ip && ip.lat != null) { lat = ip.lat; lon = ip.lon; locName = ip.name || '当前位置(IP)'; }
      }
    }
    if (lat == null || lon == null) { failBackoff(); this._weather99Paint(null, locName, '未获得定位权限——点右上【📍 地区】手动设置你的城市'); return; }
    // Open-Meteo：实况 + 逐小时 + 7 日（免 key）
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
        + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m`
        + `&hourly=temperature_2m,weather_code,precipitation_probability`
        + `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max`
        + `&timezone=auto&forecast_days=7`;
      const res = await fetch(url);
      const j = await res.json();
      if (!j || !j.current) throw new Error('天气数据为空');
      const data = {
        locName, lat, lon, ts: Date.now(),
        cur: {
          temp: j.current.temperature_2m, feels: j.current.apparent_temperature,
          humidity: j.current.relative_humidity_2m, code: j.current.weather_code,
          isDay: j.current.is_day === 1, rain: j.current.precipitation,
          pressure: j.current.surface_pressure, cloud: j.current.cloud_cover,
          wind: j.current.wind_speed_10m, gust: j.current.wind_gusts_10m, wdir: j.current.wind_direction_10m,
          time: j.current.time,
        },
        uv: j.daily && j.daily.uv_index_max ? j.daily.uv_index_max[0] : null,
        sun: { rise: j.daily && j.daily.sunrise ? j.daily.sunrise[0] : null, set: j.daily && j.daily.sunset ? j.daily.sunset[0] : null },
        hourly: (j.hourly && j.hourly.time) ? j.hourly : null,
        daily: (j.daily && j.daily.time) ? j.daily : null,
      };
      try { localStorage.setItem('weather99_cache', JSON.stringify({ ts: Date.now(), data })); localStorage.removeItem('weather99_fail_backoff'); } catch (e) {}
      // 同步刷新首页 hero chip（同源数据）
      try { this._renderWeatherData({ locName, temp: data.cur.temp, feels: data.cur.feels, code: data.cur.code, isDay: data.cur.isDay }); } catch (e) {}
      this._weather99Paint(data, locName);
    } catch (e) {
      failBackoff();
      this._weather99Paint(null, locName, e.message || '网络错误');
    }
  },
  _weather99Refresh() {
    this._flash('🔄 正在刷新天气…');
    this._weather99Kick(true);
  },

  // ==================== 页面 ====================
  weather99Page() {
    this._weather99Kick(false);
    const d = this._weather99Read();
    return `<div class="w99-wrap">${this._weather99Render(d)}</div>`;
  },
  // 渲染（数据可为 null：显示加载失败卡 + 重试按钮）
  _weather99Paint(d, locName, err) {
    const el = document.querySelector('#view-workbench .w99-wrap');
    if (!el) return;
    if (!d && !locName) d = this._weather99Read();
    el.innerHTML = this._weather99Render(d, locName, err);
  },
  _weather99Render(d, locName, err) {
    // —— 头部 ——
    const now = new Date();
    const WK = ['日', '一', '二', '三', '四', '五', '六'];
    const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 星期${WK[now.getDay()]}`;
    let hero = '';
    if (d && d.cur) {
      const w = this._weatherCodeMap(d.cur.code);
      const mins = Math.max(0, Math.round((Date.now() - (d.ts || Date.now())) / 60000));
      hero = `<div class="card w99-hero${d.cur.isDay ? '' : ' night'}">
        <div class="w99-hero-l">
          <div class="w99-loc">📍 ${this.esc(d.locName || locName || '当前位置')}</div>
          <div class="w99-big"><span class="w99-temp">${Math.round(d.cur.temp)}</span><span class="w99-unit">°C</span></div>
          <div class="w99-desc">${w.icon} ${w.desc} · 体感 ${Math.round(d.cur.feels)}°C</div>
          <div class="w99-meta">${dateStr} · ${mins < 1 ? '刚刚更新' : mins + ' 分钟前更新'}</div>
        </div>
        <div class="w99-hero-ico">${w.icon}</div>
      </div>`;
    } else {
      hero = `<div class="card w99-hero">
        <div class="w99-hero-l">
          <div class="w99-loc">📍 ${this.esc(locName || '当前位置')}</div>
          <div class="w99-desc" style="margin-top:14px">${err ? '☁️ 天气获取失败：' + this.esc(String(err).slice(0, 40)) : '🌤️ 正在获取当地天气…'}</div>
          <div class="w99-meta">请允许位置权限（或检查网络）后重试</div>
          <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="App._weather99Refresh()">🔄 重新获取</button>
        </div>
      </div>`;
    }
    // —— 温馨提醒 ——
    const tips = d && d.cur ? this._weather99Tips({ ...d.cur, uv: d.uv }) : null;
    const tipsHtml = tips ? `<div class="w99-sec-t">🧭 今日提醒</div><div class="w99-tips">${tips.map(x => `<div class="w99-tip"><span>${x.ico}</span>${this.esc(x.t)}</div>`).join('')}</div>` : '';
    // —— 气候数据四件套 ——
    const gridHtml = d && d.cur ? (() => {
      const uv = this._weather99UvLevel(d.uv);
      const hum = this._weather99HumLevel(d.cur.humidity);
      const pre = this._weather99PresLevel(d.cur.pressure);
      const bf = this._weather99Beaufort(d.cur.wind);
      const items = [
        { ico: '🌬️', n: '风力', v: `${Math.round(d.cur.wind)}<small>m/s</small>`, s: `${bf} · ${this._weather99WindDir(d.cur.wdir)}${d.cur.gust ? ' · 阵风 ' + Math.round(d.cur.gust) : ''}` },
        { ico: '💧', n: '湿度', v: `${Math.round(d.cur.humidity)}<small>%</small>`, s: `${hum.n} · ${hum.tip}` },
        { ico: '🕶️', n: '紫外线', v: d.uv == null ? '—' : `${Math.round(d.uv * 10) / 10}`, s: `${uv.n} · ${uv.tip}` },
        { ico: '🧭', n: '气压', v: d.cur.pressure == null ? '—' : `${Math.round(d.cur.pressure)}<small>hPa</small>`, s: `${pre.n} · ${pre.tip}` },
      ];
      return `<div class="w99-sec-t">📊 当日气候数据</div><div class="w99-grid">${items.map(i => `
        <div class="w99-cell"><div class="w99-c-h"><span>${i.ico}</span>${i.n}</div>
        <div class="w99-c-v">${i.v}</div><div class="w99-c-s">${i.s}</div></div>`).join('')}</div>`;
    })() : '';
    // —— 逐小时（今起 24h）——
    const hourHtml = d && d.hourly ? (() => {
      const nowH = (d.cur && d.cur.time ? d.cur.time : Store.today() + 'T00:00').slice(0, 13);
      let i0 = d.hourly.time.findIndex(t => t.slice(0, 13) >= nowH);
      if (i0 < 0) i0 = 0;
      const rows = [];
      for (let i = i0; i < Math.min(i0 + 24, d.hourly.time.length); i++) {
        const hh = parseInt(d.hourly.time[i].slice(11, 13), 10);
        const w = this._weatherCodeMap(d.hourly.weather_code[i]);
        const pp = d.hourly.precipitation_probability ? (d.hourly.precipitation_probability[i] || 0) : null;
        rows.push(`<div class="w99-hr"><span class="w99-hr-t">${i === i0 ? '现在' : hh + '时'}</span>
          <span class="w99-hr-i">${w.icon}</span><span class="w99-hr-v">${Math.round(d.hourly.temperature_2m[i])}°</span>
          ${pp != null && pp >= 30 ? `<span class="w99-hr-p">${pp}%</span>` : '<span class="w99-hr-p"></span>'}</div>`);
      }
      return `<div class="w99-sec-t">⏱️ 逐小时预报 · 未来 24 小时</div><div class="w99-hours">${rows.join('')}</div>`;
    })() : '';
    // —— 7 日预报 ——
    const dayHtml = d && d.daily ? (() => {
      const rows = [];
      for (let i = 0; i < d.daily.time.length; i++) {
        const t = d.daily.time[i];
        const w = this._weatherCodeMap(d.daily.weather_code[i]);
        const label = i === 0 ? '今天' : i === 1 ? '明天' : '周' + WK[new Date(t + 'T00:00:00').getDay()];
        const pp = d.daily.precipitation_probability_max ? (d.daily.precipitation_probability_max[i] || 0) : null;
        rows.push(`<div class="w99-day"><span class="w99-day-l">${label}<small>${parseInt(t.slice(5, 7), 10)}/${parseInt(t.slice(8, 10), 10)}</small></span>
          <span class="w99-day-i" title="${w.desc}">${w.icon}</span>
          ${pp != null ? `<span class="w99-day-p">${pp >= 30 ? pp + '%' : ''}</span>` : ''}
          <span class="w99-day-lo">${Math.round(d.daily.temperature_2m_min[i])}°</span>
          <span class="w99-day-bar"><i style="width:${Math.min(100, Math.max(8, Math.round((d.daily.temperature_2m_max[i] - d.daily.temperature_2m_min[i]) * 8)))}px"></i></span>
          <span class="w99-day-hi">${Math.round(d.daily.temperature_2m_max[i])}°</span></div>`);
      }
      return `<div class="w99-sec-t">📅 七日预报</div><div class="card w99-days">${rows.join('')}</div>`;
    })() : '';
    // —— 日出日落 ——
    const sunHtml = d && d.sun && d.sun.rise ? `<div class="w99-sun">🌅 日出 ${d.sun.rise.slice(11, 16)} &nbsp;·&nbsp; 🌇 日落 ${d.sun.set.slice(11, 16)}</div>` : '';
    // —— 24 节气倒数 + 养生提示 ——
    const terms = this._weather99NextTerms();
    const termHtml = (() => {
      if (!terms.length) return '';
      const a = terms[0], b = terms[1];
      const left = this._weather99DaysLeft(a.dk);
      return `<div class="w99-sec-t">🌾 二十四节气倒数</div>
      <div class="card w99-term">
        <div class="w99-term-main">
          <div class="w99-term-ico">${a.t.ico}</div>
          <div class="w99-term-mid">
            <div class="w99-term-name">${a.t.n}<small>${a.dk.replace(/-/g, '/')} · ${a.t.d}</small></div>
            <div class="w99-term-tip">${a.t.t}</div>
          </div>
          <div class="w99-term-cnt">${left === 0 ? '<b>今天</b>' : `<b>${left}</b><small>天</small>`}</div>
        </div>
        ${b ? `<div class="w99-term-next">接下来 · ${b.t.n}（${b.dk.slice(5).replace(/-/g, '/')}，还有 ${this._weather99DaysLeft(b.dk)} 天）</div>` : ''}
      </div>`;
    })();
    // —— 央视天气播报卡 ——
    const cctvHtml = `<div class="w99-sec-t">📺 央视天气播报</div>
      <div class="card w99-cctv" onclick="App._weather99Cctv()" role="button" title="进入央视天气">
        <div class="w99-cctv-badge">CCTV</div>
        <div class="w99-cctv-mid">
          <div class="w99-cctv-name">央视天气预报</div>
          <div class="w99-cctv-sub">每日 ${now.getHours() < 20 ? '19:31' : '19:31'} 新闻联播后播出 · 点击进入当日央视天气</div>
        </div>
        <div class="w99-cctv-go">进入 ›</div>
      </div>`;
    // —— 组装 ——
    return `
      <div class="w99-head">
        <div class="w99-head-t">🌦️ 独行天气</div>
        <div class="w99-head-s">${d && d.cur ? '今天用户所在地的全部天气/气候情况' : '所在地天气 · 气候数据 · 节气养生'}</div>
        <button class="btn btn-ghost btn-sm" onclick="App._weather99LocSet()" title="手动设置地区（精确到城区）">📍 地区</button>
        ${d && d.cur ? `<button class="btn btn-ghost btn-sm" onclick="App._weather99Refresh()">🔄 刷新</button>` : ''}
      </div>
      ${hero}${tipsHtml}${gridHtml}${sunHtml}${hourHtml}${dayHtml}${termHtml}${cctvHtml}`;
  },
  // v12.9.46b 手动选址（用户规则）：客户端未获位置权限时，用户可自行填写地区（精确到城区）
  //   Open-Meteo 地理编码（免 key · CORS ✓ · 中文）→ 选定后写入 weather99_loc 并强制重取数据
  _weather99LocSet() {
    try { this._sfx99('tap'); } catch (e) {}
    const cur = (() => { try { return JSON.parse(localStorage.getItem('weather99_loc') || 'null'); } catch (e) { return null; } })();
    this._modal('📍 设置观测地区', `
      <div style="font-size:12px;color:#64748b;line-height:1.7;margin-bottom:8px">输入城市或城区名（支持区县级精度，如「海淀」「南山」「滨江区」），搜索后点选你的位置——客户端未授权定位时尤其有用${cur ? '<br>当前已设：<b>' + this.esc(cur.name) + '</b>（' + cur.lat.toFixed(2) + ', ' + cur.lon.toFixed(2) + '）' : ''}</div>
      <div style="display:flex;gap:8px">
        <input id="w99LocKw" class="input" placeholder="输入地区名，回车搜索…" style="flex:1;min-width:0" onkeydown="if(event.key==='Enter')App._weather99LocSearch()">
        <button class="btn btn-primary btn-sm" onclick="App._weather99LocSearch()">🔍 搜索</button>
      </div>
      <div id="w99LocRes" style="margin-top:10px;max-height:260px;overflow:auto"></div>`,
      [{ label: '完成', primary: true }]);
    setTimeout(() => { try { document.getElementById('w99LocKw').focus(); } catch (e) {} }, 120);
  },
  async _weather99LocSearch() {
    const inp = document.getElementById('w99LocKw');
    const box = document.getElementById('w99LocRes');
    const kw = (inp ? inp.value : '').trim();
    if (!box) return;
    if (!kw) { box.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:8px 2px">先输入地区名</div>'; return; }
    box.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:8px 2px">🔎 正在搜索「' + this.esc(kw) + '」…</div>';
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 10000);
      const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(kw) + '&count=8&language=zh&format=json', { signal: ctrl.signal });
      clearTimeout(to);
      const j = await res.json();
      const list = (j && j.results) || [];
      if (!list.length) { box.innerHTML = '<div style="font-size:12px;color:#b45309;padding:8px 2px">没找到这个地区——试试只输城市名，或去掉「区/县」字样</div>'; return; }
      box.innerHTML = list.map((r, i) => `
        <button class="btn btn-ghost btn-sm" style="display:block;width:100%;text-align:left;margin:0 0 6px;padding:8px 10px" onclick="App._weather99LocPick(${i})">
          📍 <b>${this.esc(r.name)}</b>
          <span style="color:#64748b;font-size:11.5px"> ${this.esc([r.admin2, r.admin1, r.country].filter(Boolean).join(' · '))}</span>
          <small style="color:#94a3b8;float:right">${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)}</small>
        </button>`).join('');
      this.__w99LocList = list;
    } catch (e) {
      box.innerHTML = '<div style="font-size:12px;color:#b45309;padding:8px 2px">搜索失败（网络波动）——稍后再试，或用自动定位</div>';
    }
  },
  _weather99LocPick(i) {
    const r = (this.__w99LocList || [])[i];
    if (!r) return;
    try { this._sfx99('success'); } catch (e) {}
    const name = [r.name, r.admin1 && r.name !== r.admin1 ? r.admin1 : ''].filter(Boolean).join(' · ');
    try { localStorage.setItem('weather99_loc', JSON.stringify({ lat: r.latitude, lon: r.longitude, name: r.name, full: name, ts: Date.now() })); } catch (e) {}
    try { localStorage.removeItem('weather99_cache'); localStorage.removeItem('weather99_fail_backoff'); } catch (e) {}
    try { const ov = document.querySelector('.wild-overlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
    this._flash('📍 已设为「' + name + '」——正在更新天气数据');
    this._weather99Kick(true);
  },

  _weather99Cctv() {
    try { this._sfx99('tap'); } catch (e) {}
    const u = 'https://weather.cctv.com/';
    try { window.open(u, '_blank', 'noopener'); } catch (e) { try { location.href = u; } catch (e2) {} }
    this._flash('📺 已打开央视天气（网页版）');
  },

  // v12.9.46 入口接线：首页 hero 天气 chip → 本页（原缺失导致点击无响应）
  // v12.9.46b 关键修复：gotoWb() 后绝不能再 navigate('workbench')——navigate 会把
  //   _wbView 强制重置回 'habit'（旧书签防御逻辑），天气页刚渲染就被盖回习惯页，
  //   用户看到的是"点了没反应"。gotoWb 自带容器激活与渲染，单独调用即可。
  _weather99Go() {
    try { this._sfx99('tap'); } catch (e) {}
    this.gotoWb('weather99');
  },
});
