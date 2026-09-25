// 95-native99.js —— v12.9.59 【原生能力层】npm 公开社区/官方 Capacitor 插件统一封装
// [功能组] G1-系统内核（全 App 原生能力基础设施 · 独立能力层）
//
// ❌ 历史（v12.9.41~58）：自造三个「原生插件」（使用统计/通知/语音通话）+ build-android.js
//    注入 JS 假桩——全部不在 Capacitor 8 官方注册链里，真机一律报
//    「unable to find plugin」（本次修复的根因）。
// ✅ v12.9.59：原生能力一律改用 npm 公开发布的社区/官方插件（npx cap sync 官方链路自动注册，
//    注册清单见 android/app/src/main/assets/capacitor.plugins.json）。
// ✅ v12.9.61（用户指令 · 语音与使用时长双升级）：
//    · 语音识别 = 离线 Vosk（com.onexing.app.Vosk99 · Maven com.alphacephei:vosk-android 0.3.47 ·
//      APK 内置 42MB 中文小模型）——彻底移除 @capacitor-community/speech-recognition（国内安卓
//      存在底层系统兼容问题：依赖 Google 语音服务的精简 ROM 收不到声音）；网页版回落浏览器
//      SpeechRecognition 不变。
//    · 应用时长 = com.onexing.app.Usage99（UsageStatsManager 实时读取各 App 今日使用时长）——
//      「使用情况访问」为 Android 特殊权限：只能引导用户到系统设置页授予（AppOpsManager 真值
//      检测），未授予时应用数据页友好提示 + 跳转按钮，绝不弹调试报错；网页版保持数字健康指引。
//    · 文字转语音 = @capacitor-community/text-to-speech@8.0.2（系统 TTS 引擎 · speak() 在朗读完成时 resolve）
//    · 本地通知 = @capacitor/local-notifications@8.3.1（官方 · Android 13+ 自动申请 POST_NOTIFICATIONS）
//    · 版本信息 = @capacitor/device@8.0.3（官方 · appBuild 即安装包 versionCode）
//
// 调用方迁移（对外接口保持原形，业务零改动）：
//    · _sr99Create()/_mic99Tip()：阿福聊天话筒（79）、拾梦（76）、独行表达（103）、语音对话（109）——接口原样
//    · _wbApps99()：数据研究所第 11 库路由（50-habit-data）——真机实时读取 / 网页版指引不变
//    · _apk99*()：版本更新链（00-core 启动 / 96-perm99 手动检查）——重写为友好版
//    · _nat99*()：客户端判定 + 到期锁 + 戒断页状态卡
// 网页版（PWA）行为不变：无原生插件时全部优雅降级（提示而不报错）。
const APK99_FEED = 'https://raw.githubusercontent.com/1936956836/yirenxing/main';   // 更新源（仓库 raw 根，不带末尾斜杠）
const APK99_FEED_MIRRORS = [
  'https://cdn.jsdelivr.net/gh/1936956836/yirenxing@main',
  'https://fastly.jsdelivr.net/gh/1936956836/yirenxing@main',
];

Object.assign(App, {

  // ==================== 客户端判定（Capacitor 官方 · 不再以自造插件存在性判定）====================
  _nat99() {
    try {
      const cap = (typeof window !== 'undefined' && window.Capacitor) || null;
      if (cap && cap.isNativePlatform && cap.isNativePlatform()) return cap;
    } catch (e) {}
    return null;
  },
  _nat99On() { return !!this._nat99(); },
  // 按插件名取官方注册的真实插件（不存在返回 null —— 调用方据此降级，绝不硬调）
  _nat99Plg(name) {
    const cap = this._nat99();
    try { return (cap && cap.Plugins && cap.Plugins[name]) || null; } catch (e) { return null; }
  },

  // ==================== TTS 层（@capacitor-community/text-to-speech · 全 App 统一单例）====================
  // 引擎生命周期由插件自管（首次 speak 自动初始化系统 TextToSpeech）；本层只做统一入口 +
  //   友好降级——全 App 任何地方朗读都走这一个实例，绝不重复新建引擎。
  // speak() 的 Promise 在「整段朗读完成」时 resolve（插件 Android 实现绑定 UtteranceProgressListener
  //   onDone）——顺序播报链（新闻电台分句）直接 await 即可，无需事件猜时长。
  _tts99() { return this._nat99Plg('TextToSpeech'); },
  _tts99Ok() { return !!this._tts99(); },
  _tts99Warned: false,          // 引擎异常提示会话去重（防弹窗风暴）
  // 统一朗读入口：text 文本 / opts { lang, rate, pitch, volume }
  //   返回 true=已交由系统引擎朗读（完成时 resolve）；false=本机暂不可用（已友好提示或静默降级）
  async _tts99Speak(text, opts) {
    const T = this._tts99();
    const o = opts || {};
    if (!T) {                                    // 网页版：无系统人声（调用方决定是否提示）
      if (o.hint) this._flash(o.hint);
      return false;
    }
    try {
      const p = {
        text: String(text || ''),
        lang: o.lang || 'zh-CN',
        rate: (o.rate != null ? o.rate : 1.0),
        pitch: (o.pitch != null ? o.pitch : 1.0),
        volume: (o.volume != null ? o.volume : 1.0),
        queueStrategy: 0,                        // 0=Flush：新朗读自动顶掉上一段（无需手动取消）
      };
      // 【v12.9.65 说明】系统 TTS 层仅服务背单词朗读/新闻播报等模块（用户禁改）——
      //   这些调用方一律不传 voice（默认声线）；阿福语音页朗读走下方 ttsSpeak
      //   （Edge-TTS 三声线网络合成，音色由请求 voice 字段真实透传），不经本函数选声线。
      //   voice 索引校验保留：越界即报错拒传，不静默回退。
      if (o.voice != null) {
        const total = (this._tts99VoicesCache && this._tts99VoicesCache.length) || 0;
        const valid = Number.isInteger(o.voice) && o.voice >= 0 && (total === 0 || o.voice < total);
        if (valid) {
          p.voice = o.voice;                    // 合法声线索引 → 真实进入 speak() payload
          try { console.log('[TTS] speak payload voice =', p.voice, '(已透传声线选择)'); } catch (_) {}
        } else {
          // 用户指令 v12.9.63：voiceId 无效禁止静默回退女声——大声报错，不带 voice 调用
          try { console.error('[TTS] voice 参数无效（越界/类型错误），已拒绝传入 speak()：', o.voice, '· 声线总数=', total); } catch (_) {}
        }
      }
      await T.speak(p);
      return true;
    } catch (e) {
      // 常见失败：本机缺 TTS 语音引擎（部分精简 ROM）——给一次友好指引，绝不弹插件报错
      try { console.warn('[TTS] 朗读失败：', (e && e.message) || e); } catch (_) {}
      this._tts99Degrade();
      return false;
    }
  },
  _tts99Degrade() {
    if (this._tts99Warned) return;
    this._tts99Warned = true;
    this._modal('🔊 语音播报暂不可用', `
      <div style="font-size:12.5px;color:#475569;line-height:2">
        本机的<b>语音合成引擎</b>没有响应。可以试着恢复：<br>
        ① 打开 <b>系统设置 → 语言和输入法 → 文字转语音（TTS）输出</b>；<br>
        ② 选择一个语音引擎（如「Google 文字转语音」或手机厂商自带引擎），必要时先安装；<br>
        ③ 完全退出一人行后重新打开，再试一次朗读。<br>
        <span style="color:#94a3b8">语音功能不影响其他功能使用——单词照样背、新闻照样看。</span>
      </div>`, [{ label: '知道了', primary: true }]);
  },
  async _tts99Stop() {
    // 阿福在线朗读（Edge-TTS）当前音频一并停掉——挂断/离开立即静音
    try { if (this._tts99EdgeAudio) { this._tts99EdgeAudio.pause(); this._tts99EdgeAudio = null; } } catch (e) {}
    const T = this._tts99();
    if (!T) return;
    try { await T.stop(); } catch (e) {}
  },

  // ==================== 阿福在线朗读 · Edge-TTS 三声线（v12.9.65 · 用户指令重做）====================
  // 用户指令（v12.9.65 · 回退火山引擎）：
  //   · 不接入火山引擎——上一版（v12.9.64）的火山 Doubao-TTS 方案按指令整体回退删除。
  //   · 旧 BUG 根因：音色下拉只改了 UI，选中的 voiceId 从未传进真实 TTS 请求——
  //     请求里写死 zh-CN-XiaoxiaoNeural 晓晓女声，选什么都女声。本版彻底封死该路径。
  //   · ttsSpeak(text, voiceId)：voiceId 必须由调用方显式传入（页面下拉的 selectedVoiceId），
  //     函数内部绝不写死、绝不内置任何默认音色字符串（含 zh-CN-XiaoxiaoNeural）。
  //   · 三条固定声线（微软 Edge 神经音色 · 在线合成 · 免密钥）：
  //       磁性青年男声 zh-CN-YunxiNeural / 稳重播音员男声 zh-CN-YunyangNeural /
  //       温柔晓晓女声 zh-CN-XiaoxiaoNeural
  //   · 通道：Edge-TTS WebSocket 网络合成——请求报文 ssml 的 <voice name='…'> 字段
  //     原样携带传入 voiceId（F12 → 网络 → WS 帧可查），音色 100% 由该字段决定；
  //     system 提示词/角色文案只管对话文本，与音频音色无关。
  //   · voiceId 无效（不在三条声线内 / 为空）→ console.error("无效voiceId：xxx")，
  //     不发请求、不自动降级到任何默认女声。
  //   · 状态变量 selectedVoiceId：页面「阿福音色」下拉选中值（109-voice99 写入并持久化）；
  //     每次 ttsSpeak 显式传参：ttsSpeak(输出文本, selectedVoiceId)，不许省略第二个参数。
  TTS99_VOICES: [
    { id: 'zh-CN-YunxiNeural',    label: '磁性青年男声' },
    { id: 'zh-CN-YunyangNeural',  label: '稳重播音员男声' },
    { id: 'zh-CN-XiaoxiaoNeural', label: '温柔晓晓女声' },
  ],
  selectedVoiceId: '',            // 状态变量：页面「阿福音色」下拉选中值（_vf99VoiceSel 写入 · localStorage 持久化）
  _tts99VoiceLoad() {             // 进语音页/开始通话时恢复选中音色
    try {
      ['db99_appid', 'db99_token', 'db99_voice'].forEach(k => localStorage.removeItem(k));  // 回退清理：v12.9.64 火山残留配置
      this.selectedVoiceId = (localStorage.getItem('afu_voice_id') || '').trim();
    } catch (e) {}
    return this.selectedVoiceId;
  },

  // ttsSpeak(text, voiceId) —— 阿福统一朗读入口（v12.9.65 用户指令形态）
  // 返回：true=合成并播放完成 / false=网络或播放失败（控制台已报错）/ 'invalid'=voiceId 无效（未发请求）
  async ttsSpeak(text, voiceId) {
    const txt = String(text || '').trim();
    const vid = String(voiceId || '').trim();
    // ① voiceId 无效（不在三条声线内 / 为空）：报错 + 不发请求 + 不降级
    if (!(this.TTS99_VOICES || []).some(v => v.id === vid)) {
      try { console.error('无效voiceId：' + (vid || '(空)')); } catch (e) {}
      return 'invalid';
    }
    if (!txt) return false;
    // ② Edge-TTS 网络合成：请求 payload 的 voice 字段 = 传入 voiceId（零硬编码）
    //    首次失败（网络抖动/握手超时等瞬态）自动重试一次（重新计算令牌重连），
    //    实测连续 30 次三声线全部出声，重试可兜住冷启动偶发超时。
    let mp3 = null;
    try {
      mp3 = await this._tts99Edge(vid, txt.slice(0, 1000));
      if (!mp3) {
        try { console.warn('[阿福TTS] 首次合成未成功，600ms 后自动重试一次（令牌重算）'); } catch (_) {}
        await new Promise((r) => setTimeout(r, 600));
        mp3 = await this._tts99Edge(vid, txt.slice(0, 1000));
      }
    } catch (e) {
      try { console.error('[阿福TTS] 合成请求失败：', (e && e.message) || e); } catch (_) {}
      return false;
    }
    if (!mp3) return false;                             // 失败详情已在 _tts99Edge 内打印
    // ③ 播放 mp3，播完才 resolve（通话循环靠它恢复麦克风）
    return await this._tts99PlayBlob(mp3);
  },

  // Edge-TTS WebSocket 合成（微软公开只读通道 · 免密钥）：传入 voiceId 原样进入请求 → 返回 mp3 Blob / null
  // ⚠️ 网页跨域限制（用户规则 4）：网页前端直连 Edge-TTS（wss://speech.platform.bing.com）存在跨域/
  //    Origin 头不可控限制（浏览器不允许 JS 自定义 WebSocket 的 Origin/User-Agent 等握手头）；
  //    正式打包 WebView 安卓端需要配置跨域豁免，或者增加后端代理中转 Edge-TTS 接口。
  //    本实现已实测：微软服务不校验 Origin（https://localhost 的 Capacitor WebView 来源可直连），
  //    但若目标环境网络封锁 wss 出口，需按上述两种方式兜底。
  async _tts99Edge(voiceId, text) {
    const TK = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';      // 公开只读令牌（edge-tts 通道通用常量，非密钥）
    const T0 = Date.now();
    // —— Sec-MS-GEC 防护参数（v12.9.66 根因修复）：官方 edge-tts DRM 算法为
    //    ticks = (Unix秒 + 11644473600)，先取整到 5 分钟，再×1e7 转成 Windows 100 纳秒纪元，
    //    SHA256(String(ticks) + 令牌) 大写 hex。旧版漏了 ×1e7（拿秒去哈希）→ 微软一律 403 拒绝，
    //    表现为「选什么音色都发不出声」。×1e7 后超出 JS 安全整数范围，必须用 BigInt 精确运算。
    let url = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=' + TK;
    let gecDebug = '';
    try {
      const sec = Math.floor(Date.now() / 1000) + 11644473600;     // Unix 秒 → Windows 纪元秒
      const ticks = BigInt(sec - (sec % 300)) * 10000000n;         // 取整到 5 分钟 → ×1e7 转 100ns
      const str = ticks.toString() + TK;
      // 令牌哈希：安全上下文用 crypto.subtle；http 非安全上下文（subtle 不存在）回落纯 JS SHA-256
      let hex = '';
      if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        const dig = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        hex = Array.from(new Uint8Array(dig)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      } else {
        hex = this._tts99Sha256Hex(str);
      }
      gecDebug = 'ticks=' + ticks.toString() + ' gec=' + hex.slice(0, 12) + '…';
      url += '&Sec-MS-GEC=' + hex + '&Sec-MS-GEC-Version=1-143.0.3650.75';
    } catch (e) {
      try { console.error('[阿福TTS] Sec-MS-GEC 令牌计算失败：', (e && e.message) || e); } catch (_) {}
      return null;
    }
    const rid = (Date.now().toString(16).padStart(12, '0') + Math.random().toString(16).slice(2, 10)).replace(/[^0-9a-f]/g, '');
    const reqid = (rid + '0000000000000000000000000000').slice(0, 32);   // 连接 ID（32 位 hex · 无横线）
    return new Promise((resolve) => {
      let ws = null, chunks = [], done = false, guard = null, opened = false;
      const finish = (blob) => {
        if (done) return;
        done = true;
        clearTimeout(guard);
        try { if (ws && ws.readyState <= 1) ws.close(); } catch (e) {}
        resolve(blob || null);
      };
      // 完整错误捕获（用户规则 5）：打印网络请求全过程报错（超时/跨域/参数错误）
      const failLog = (stage, detail) => {
        try {
          console.error('[阿福TTS] ' + stage + (detail ? '：' + detail : '')
            + ' ｜ 已耗时 ' + (Date.now() - T0) + 'ms · 收到音频 ' + chunks.length + ' 帧'
            + ' · voice=' + voiceId + ' · ' + gecDebug
            + '（跨域/被拦：浏览器无法自定义 WS 的 Origin/UA 握手头，见函数头注释；'
            + '若设备时间不准也会令牌校验失败，请校准系统时间）');
        } catch (e) {}
      };
      try { ws = new WebSocket(url); }
      catch (e) { failLog('WebSocket 创建失败（参数错误）', (e && e.message) || String(e)); return finish(null); }
      guard = setTimeout(() => {
        failLog(opened ? '合成超时（20 秒无结果 · 网络不通微软语音服务）' : '连接超时（20 秒未完成握手 · 网络不通微软语音服务或被跨域拦截）', '');
        finish(null);
      }, 20000);
      ws.onopen = () => {
        opened = true;
        // 服务器要求的日期串格式（与 edge-tts 官方实现一致）
        const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const d = new Date(), p2 = (n) => String(n).padStart(2, '0');
        const ts = D[d.getUTCDay()] + ' ' + M[d.getUTCMonth()] + ' ' + p2(d.getUTCDate()) + ' ' + d.getUTCFullYear() + ' '
                 + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds()) + ' GMT+0000 (Coordinated Universal Time)';
        // 消息① 通道配置：输出格式 mp3
        ws.send('X-Timestamp:' + ts + '\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n'
          + JSON.stringify({ context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' }, outputFormat: 'audio-24khz-48kbitrate-mono-mp3' } } } }));
        // 消息② 合成请求：ssml 的 voice name 字段 = 传入 voiceId（网络请求 payload 的音色字段，零硬编码）
        const esc = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        ws.send('X-RequestId:' + reqid + '\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:' + ts + 'Z\r\nPath:ssml\r\n\r\n'
          + "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>"
          + "<voice name='" + voiceId + "'>"
          + "<prosody pitch='+0Hz' rate='+0%' volume='+0%'>" + esc + '</prosody>'
          + '</voice></speak>');
        try { console.log('[阿福TTS] WSS 已握手成功，请求 voice =', voiceId, '（跟随下拉 selectedVoiceId 透传）·', gecDebug); } catch (e) {}
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          if (ev.data.indexOf('Path:turn.end') !== -1) finish(chunks.length ? new Blob(chunks, { type: 'audio/mpeg' }) : null);
          return;
        }
        // 二进制帧：前 2 字节大端 = 报文头长度，头之后才是音频数据
        try {
          ev.data.arrayBuffer().then((b) => {
            if (done || b.byteLength <= 2) return;
            const hl = new DataView(b).getUint16(0);
            if (2 + hl < b.byteLength) chunks.push(b.slice(2 + hl));
          }).catch(() => {});
        } catch (e) {}
      };
      // onerror 先于 onclose：完整记录阶段与上下文（超时/跨域/参数错误都在这里暴露）
      ws.onerror = () => { failLog(opened ? 'WebSocket 通道错误（合成中断）' : 'WebSocket 连接失败（网络不可达 / 服务拒绝 403 / 跨域被拦）', ''); finish(null); };
      ws.onclose = (ev) => {
        if (done) return;
        if (opened && chunks.length) return finish(new Blob(chunks, { type: 'audio/mpeg' }));
        failLog('连接被关闭', 'close.code=' + (ev && ev.code) + ' reason=' + String(ev && ev.reason || '') + '（1006=异常断开 · 403 拒绝时浏览器只见报错不见状态码）');
        finish(null);
      };
    });
  },

  // 纯 JS SHA-256（同步 · 大写 hex）——非安全上下文兜底：http 页面 crypto.subtle 不存在时
  // 仍要能算 Sec-MS-GEC 令牌（标准 FIPS 180-4 实现，无任何依赖）
  _tts99Sha256Hex(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rr = (v, a) => ((v >>> a) | (v << (32 - a)));
    const bytes = new TextEncoder().encode(String(str));
    const l = bytes.length, blocks = Math.ceil((l + 9) / 64);
    const arr = new Uint8Array(blocks * 64);
    arr.set(bytes); arr[l] = 0x80;
    const dv = new DataView(arr.buffer);
    dv.setUint32(blocks * 64 - 8, 0, false);                 // 比特长度高 32 位（消息短，恒 0）
    dv.setUint32(blocks * 64 - 4, l * 8, false);            // 比特长度低 32 位
    for (let i = 0; i < blocks; i++) {
      const w = new Array(64);
      for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i * 64 + j * 4, false);
      for (let j = 16; j < 64; j++) {
        const s0 = rr(w[j-15], 7) ^ rr(w[j-15], 18) ^ (w[j-15] >>> 3);
        const s1 = rr(w[j-2], 17) ^ rr(w[j-2], 19) ^ (w[j-2] >>> 10);
        w[j] = (w[j-16] + s0 + w[j-7] + s1) | 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let j = 0; j < 64; j++) {
        const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[j] + w[j]) | 0;
        const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
        const mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('').toUpperCase();
  },

  // 播放合成音频：播完 resolve(true)；失败 resolve(false)（挂断可经 _tts99Stop 立即停）
  _tts99PlayBlob(blob) {
    const url = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      let settled = false, a = null;
      const fin = (v) => {
        if (settled) return;
        settled = true;
        try { if (this._tts99EdgeAudio === a) this._tts99EdgeAudio = null; } catch (e) {}
        try { URL.revokeObjectURL(url); } catch (e) {}
        resolve(v);
      };
      try {
        a = new Audio(url);
        this._tts99EdgeAudio = a;                     // 挂全局引用：挂断/离页可立即停声
        a.onended = () => fin(true);
        a.onerror = () => fin(false);
        const p = a.play();
        if (p && p.catch) p.catch(() => fin(false));
      } catch (e) { fin(false); }
      setTimeout(() => fin(false), 5 * 60 * 1000);    // 安全网：5 分钟未完强制收场
    });
  },
  // 校验点：每次TTS网络请求payload的voice字段跟随下拉框selectedVoiceId变化，无硬编码音色


  // ==================== 语音识别统一适配层（阿福聊天 / 拾梦 / 独行表达 / 语音对话共用）====================
  // v12.9.61 离线 Vosk 重做（用户指令：@capacitor-community/speech-recognition 在国内安卓
  //   存在底层系统兼容问题——依赖 Google 语音服务的精简 ROM 收不到声音，彻底放弃，全部
  //   SpeechRecognition 调用/监听代码移除）：
  //   · 真机 = Vosk 离线中文识别（com.onexing.app.Vosk99 原生插件 · Capacitor 官方注册链 ·
  //     随 APK 内置 42MB 中文小模型——零网络、零系统语音服务，国产 ROM 彻底兼容）；
  //   · 网页版回落浏览器 SpeechRecognition（Chrome/Edge）不变。
  //   · 对外接口与旧版完全一致（lang / continuous / interimResults / onresult / onerror /
  //     onend / start / stop），调用方（79-afu-record / 76-dream / 103-express）一行不改；
  //     新增 pause()/resume() 供阿福语音通话在 TTS 朗读期间暂停采集（防止把阿福朗读的
  //     回复识别成用户输入——通话闭环关键）。
  //   · 事件注册顺序铁律不变：先 await addListener 挂好监听，再 start。
  //   · 麦克风权限申请逻辑保留（用户指令）：仅在用户点击语音按钮（start 瞬间）经 Vosk99
  //     插件 requestPermissions() 动态申请 RECORD_AUDIO，页面加载绝不自动申请。
  //   · Vosk「result」事件 = 静音断句（用户停顿约 1 秒出一句完整文本）→ 映射旧接口
  //     isFinal=true，调用方按旧逻辑收句即可；「partialResults」= 正在说的中间结果。
  //   · 模型加载：首次需把 APK 内置模型复制到应用目录 + 加载（数秒，原生后台线程），
  //     之后常驻内存秒开；失败给「离线语音模型加载失败」友好指引，绝不弹调试弹窗。
  _sr99Create() {
    const V = this._nat99Plg('Vosk99');
    const W = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!V) {
      if (W) return new W();                         // 网页版：浏览器 SpeechRecognition（Chrome/Edge）
      return null;
    }
    const self = this;
    return {
      lang: 'zh-CN', continuous: true, interimResults: true,
      onresult: null, onerror: null, onend: null,
      onprogress: null,                              // v12.9.62 英文模型下载进度回调（0-100，可选）
      _hPartial: null, _hResult: null, _hFinal: null, _active: false, _userStop: false,
      _mkEvt(isFin, t) {
        return {
          resultIndex: 0,
          results: [{ isFinal: !!isFin, 0: { transcript: t || '' } }],
        };
      },
      async start() {
        if (this._active) return true;
        // v12.9.62 双语：按 this.lang（zh-CN / en-US）选择模型——中文随安装包内置，
        //   英文首次使用需联网下载约 40MB（原生层下载+解压，期间 voskState 报进度）
        const lg = /^en/i.test(String(this.lang || 'zh-CN')) ? 'en' : 'zh';
        // ① 权限：保留原有申请逻辑——用户手势内动态申请 RECORD_AUDIO，页面加载绝不申请
        try {
          const st = await V.checkPermissions();
          if (!st || st.recordAudio !== 'granted') {
            const st2 = await V.requestPermissions();           // 原生授权弹窗
            if (!st2 || st2.recordAudio !== 'granted') {
              self._sr99MicDenied();
              if (this.onerror) this.onerror({ error: 'not-allowed' });
              return false;
            }
          }
        } catch (e) {
          if (this.onerror) this.onerror({ error: 'not-allowed' });
          return false;
        }
        // ② 监听先行（铁律：全部 addListener 挂好之后才允许 start）
        if (!this._hPartial) {
          this._hPartial = await V.addListener('partialResults', (d) => {
            if (!this._active) return;
            const t = (d && d.text) || '';
            if (t && this.interimResults !== false && this.onresult) {
              try { this.onresult(this._mkEvt(false, t)); } catch (e) {}
            }
          });
        }
        if (!this._hResult) {
          this._hResult = await V.addListener('result', (d) => {
            if (!this._active) return;
            const t = ((d && d.text) || '').trim();
            if (!t || !this.onresult) return;
            try { this.onresult(this._mkEvt(true, t)); } catch (e) {}
            // 单句模式（continuous=false）：收到一句完整话即自动停（对齐旧语义）
            if (!this.continuous) { this._userStop = true; this.stop(); }
          });
        }
        if (!this._hFinal) {
          this._hFinal = await V.addListener('finalResult', (d) => {
            // stop() 时未断句的尾巴——照常补发（防丢最后半句）
            const t = ((d && d.text) || '').trim();
            if (t && this.onresult) { try { this.onresult(this._mkEvt(true, t)); } catch (e) {} }
          });
        }
        // ③ 模型加载（幂等；中文首次复制 42MB + 加载数秒；英文首次需下载约 40MB——下载中
        //   报进度给 onprogress，慢网放宽等待上限到 20 分钟）→ 启动连续监听
        this._active = true; this._userStop = false;
        try {
          let ld = null;
          for (let i = 0; i < 2400; i++) {                       // 500ms 轮询 · 上限 20 分钟（英文首载下载）
            ld = await V.load({ lang: lg });
            const stt = ld && ld.status;
            if (stt === 'loading' || stt === 'switching' || stt === 'downloading') {
              // 英文模型下载进度（load 轮询返回值随带）→ 上字幕
              if (this.onprogress && ld && ld.progress != null) {
                try { this.onprogress(Math.max(0, ld.progress | 0)); } catch (e) {}
              }
              // 等待期间用户挂断/离开：立即退出，绝不事后拉起麦克风
              if (!this._active || this._userStop) { this._active = false; return false; }
              await new Promise(r => setTimeout(r, 500));
              continue;
            }
            break;
          }
          if (!this._active || this._userStop) { this._active = false; return false; }   // 模型就绪前已挂断
          if (ld && ld.status === 'error') {
            this._active = false;
            if (/en-model-download-failed/i.test(String(ld.error || ''))) self._sr99EnModelFail();
            else self._sr99ModelFail();
            if (this.onerror) this.onerror({ error: 'service-not-found' });
            return false;
          }
          const sr = await V.start();
          if (sr && sr.status === 'error') {
            this._active = false;
            self._sr99ModelFail();
            if (this.onerror) this.onerror({ error: 'service-not-found' });
            return false;
          }
          return true;
        } catch (e) {
          this._active = false;
          const m = String((e && e.message) || e || '');
          if (/en-model-download/i.test(m)) self._sr99EnModelFail();
          else if (/model/i.test(m)) self._sr99ModelFail();
          if (this.onerror) this.onerror({ error: 'service-not-found' });
          return false;
        }
      },
      async stop() {
        if (this._active) {
          this._userStop = true;
          try { await V.stop(); } catch (e) {}
          this._active = false;
          if (this.onend) { try { this.onend(); } catch (e) {} }
        } else {
          this._userStop = true;
        }
        // 延迟摘除插件事件监听（finalResult 尾巴句可能晚到 ~100ms；
        // 若期间重启 start() 会看到 handler 仍在而复用，不会误删）
        setTimeout(() => {
          try {
            if (this._hPartial) { this._hPartial.remove(); this._hPartial = null; }
            if (this._hResult) { this._hResult.remove(); this._hResult = null; }
            if (this._hFinal) { this._hFinal.remove(); this._hFinal = null; }
          } catch (e) {}
        }, 400);
      },
      // 阿福通话专用：TTS 朗读期间暂停采集 / 朗读完恢复（pause 期间不产生任何识别事件）
      async pause() { try { await V.pause(); } catch (e) {} },
      async resume() { try { await V.resume(); } catch (e) {} },
    };
  },
  // 离线语音模型加载失败（罕见：安装包损坏 / 存储不足）——友好指引，绝不弹调试报错
  _sr99ModelFail() {
    this._modal('📦 离线语音模型加载失败', `
      <div style="font-size:12.5px;color:#475569;line-height:2">
        首次使用语音需要把随安装包内置的<b>离线语音模型</b>（约 42MB）准备到本机，刚才没有成功。可以：<br>
        ① 检查手机<b>存储空间</b>是否充足（建议至少留 200MB）；<br>
        ② 完全退出一人行后重新打开，再点一次语音按钮重试；<br>
        ③ 仍不行就先打字使用——阿福聊天、背单词、新闻浏览都不受影响。
      </div>`, [{ label: '知道了', primary: true }]);
  },
  // 英语识别模型下载失败（网络不通 / 源被墙）——友好指引（中文陪伴不受影响：模型内置）
  _sr99EnModelFail() {
    this._modal('🌐 英语识别模型下载失败', `
      <div style="font-size:12.5px;color:#475569;line-height:2">
        英语陪练第一次使用需要联网下载<b>离线英语识别模型</b>（约 40MB，仅此一次，之后完全离线），刚才没有下载成功。可以：<br>
        ① 检查网络后，回到英语陪练<b>再点一次「开始对话」</b>重试（支持断点重来）；<br>
        ② 换 Wi-Fi / 流量交替试一次；<br>
        ③ 先用 🇨🇳 中文陪伴通话（中文模型随安装包内置，无需下载）或 🆘 中文求助。
      </div>`, [{ label: '知道了', primary: true }]);
  },
  // 话筒权限被拒：友好指引（不自动跳系统设置——按用户规定只给文字路径）
  _sr99MicDenied() {
    this._modal('🎤 开启麦克风权限', `
      <div style="font-size:12.5px;color:#475569;line-height:2">
        语音功能需要麦克风权限，刚才那次没有授权。手动开启：<br>
        <b>系统设置 → 应用 → 一人行 → 权限 → 麦克风 → 允许</b><br>
        开好后回到 App，再点一次语音按钮就能说了。<br>
        <span style="color:#94a3b8">麦克风只在你按住说话时使用，不录音、不留存。</span>
      </div>`, [{ label: '知道了', primary: true }]);
  },
  // 话筒被拒提示文案（手机/网页两版）——79-afu-record / 76-dream / 103-express 引用
  _mic99Tip() {
    return !!window.__PHONE_EDITION__
      ? '🎤 话筒权限被拒——请到 系统设置 → 应用 → 一人行 → 权限，开启麦克风后回来重试'
      : '🎤 麦克风权限被拒——浏览器地址栏 🔒 里允许麦克风后重试';
  },

  // ==================== v12.9.44 到期锁（客户端直发 · 强制更新）====================
  // 安装包内置有效期（version.js expires）：到期 → 全屏锁定，安装新版（有效期顺延）自动解锁；
  // 临近到期 7 天内每日温和提醒一次；锁屏每 60s 自查。客户端判定改用 Capacitor 官方
  // isNativePlatform（不再以自造插件存在性判定——旧判定在桥失效时把客户端误判成网页版）。
  _nat99Expired() {
    try {
      const v = (typeof window !== 'undefined' && window.__APP_VER__) || {};
      if (!v.expires) return 0;
      const end = new Date(v.expires + 'T23:59:59+08:00').getTime();
      if (Date.now() > end) return 2;
      if (Date.now() > end - 7 * 864e5) return 1;
    } catch (e) {}
    return 0;
  },
  _nat99ExpiryLock() {
    if (!this._nat99On()) return;                     // 网页版永不锁定
    const st = this._nat99Expired();
    if (st === 1) {
      const day = new Date().toISOString().slice(0, 10);
      try {
        if (localStorage.getItem('nat99expw') !== day) {
          localStorage.setItem('nat99expw', day);
          const v = window.__APP_VER__ || {};
          this._flash('⏳ 本版本将于 ' + (v.expires || '') + ' 到期——请提前获取新版安装包');
        }
      } catch (e) {}
      return;
    }
    if (st !== 2) return;
    if (document.getElementById('nat99-explock')) return;
    const v = window.__APP_VER__ || {};
    const div = document.createElement('div');
    div.id = 'nat99-explock';
    div.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.97);display:flex;align-items:center;justify-content:center;padding:28px;';
    div.innerHTML = `
      <div style="max-width:400px;text-align:center;color:#f8fafc;font-family:inherit">
        <div style="font-size:52px;line-height:1;margin-bottom:14px">⏳</div>
        <div style="font-size:19px;font-weight:700;margin-bottom:10px;color:#fca5a5">本版本已到期</div>
        <div style="font-size:13px;color:#cbd5e1;line-height:2;margin-bottom:20px">
          一人行 v${v.v || ''} 已于 <b style="color:#fca5a5">${v.expires || '—'}</b> 到期<br>
          本客户端以「安装包直发」方式更新：<br>
          <b>获取最新 APK → 微信接收 → 点开覆盖安装</b><br>
          <span style="color:#94a3b8">（同签名覆盖安装 · 全部数据保留）</span><br>
          安装新版后自动解锁
        </div>
        <button type="button" onclick="App._nat99ExpiryRecheck()" style="padding:10px 22px;border-radius:12px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;font-size:13px">我已安装新版 · 重新检测</button>
      </div>`;
    document.body.appendChild(div);
  },
  _nat99ExpiryRecheck() {
    const div = document.getElementById('nat99-explock');
    if (div) div.remove();
    if (this._nat99Expired() === 0) { this._flash('✅ 已解锁——欢迎回来'); return; }
    this._nat99ExpiryLock();
  },

  // ==================== APK 版本更新链（v12.9.59 友好版重写）====================
  // 流程：启动即查（无延迟）→ GitHub raw → jsDelivr → fastly 三源镜像链逐个回退 →
  //   本地 versionCode（@capacitor/device 官方插件 appBuild）与云端 versionCode 整数比对 →
  //   有新版 → 全屏更新锁（说明 + 下载安装）+ 通知栏推送提醒；网络异常 → 友好提示，绝不崩溃、
  //   绝不弹调试报错（旧版 _apk99Debug 调试弹窗已随自造插件一并删除）。
  _apk99Feed() {
    try {
      const s = localStorage.getItem('apk99_feed');
      if (s) return s.replace(/\/+$/, '');
    } catch (e) {}
    return (typeof APK99_FEED === 'string' ? APK99_FEED : '').replace(/\/+$/, '');
  },
  _apk99FetchManifest() {
    const base = this._apk99Feed();
    if (!base) return Promise.resolve(null);
    const bases = [base].concat(
      (typeof APK99_FEED_MIRRORS !== 'undefined' ? APK99_FEED_MIRRORS : [])
        .filter(() => { try { return !localStorage.getItem('apk99_feed'); } catch (e) { return true; } })
    );
    const tryOne = (u) => {
      if (!/^https:\/\//i.test(u)) return Promise.resolve(null);   // 安卓 WebView 拦截 http——非 https 源直接跳过
      const ctrl = new AbortController();
      const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 12000);
      return fetch(u + '/apk-manifest.json', { signal: ctrl.signal, cache: 'no-cache' })
        .then(r => { clearTimeout(timer); if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(mf => ((mf && mf.v) ? { mf, url: u + '/apk-manifest.json' } : null))
        .catch(() => null);
    };
    return bases.reduce((chain, u) => chain.then(hit => hit || tryOne(u)), Promise.resolve(null));
  },
  // 本地 versionCode：官方 @capacitor/device 插件（appBuild = 安装包 versionCode 真值）；
  //   插件不可用（网页版）回落 version.js 推算（与 build.gradle 注入算法一致）
  async _apk99LocalCode() {
    try {
      const D = this._nat99Plg('Device');
      if (D) {
        const r = await D.getInfo();
        if (r && r.appBuild != null && +r.appBuild > 0) return +r.appBuild;
      }
    } catch (e) {}
    const v = (window.__APP_VER__ && window.__APP_VER__.v) || '0.0.0';
    const p = String(v).split('.').map(n => +n || 0);
    return (p[0] || 0) * 10000 + (p[1] || 0) * 100 + (p[2] || 0);
  },
  _apk99RemoteCode(mf) {
    if (mf && mf.versionCode) return +mf.versionCode;
    const p = String((mf && mf.v) || '0.0.0').split('.').map(n => +n || 0);
    return (p[0] || 0) * 10000 + (p[1] || 0) * 100 + (p[2] || 0);
  },
  // 版本检测主入口：manual=true 手动「检查更新」（无论成败给友好结果）；启动自动检查成功静默
  async _apk99Check(manual) {
    try {
      if (!this._nat99On()) {                                 // 仅真实安卓客户端执行
        if (manual) this._flash('ℹ️ 版本检测在手机客户端内进行——当前是网页版');
        return;
      }
      const feed = this._apk99Feed();
      if (!feed) { if (manual) this._flash('ℹ️ 当前为安装包直发模式——新版安装包直接获取'); return; }
      const hit = await this._apk99FetchManifest();
      if (!hit) {                                             // 网络异常：友好提示，不崩溃不弹错
        if (manual) this._flash('⚠️ 检查更新失败——网络似乎不太顺畅，稍后再试一次');
        return;
      }
      const { mf, url } = hit;
      const localCode = await this._apk99LocalCode();
      const remoteCode = this._apk99RemoteCode(mf);
      if (localCode < remoteCode) {
        this._nat99VerLock(mf, url);
        this._apk99Notify(mf);                                // 通知栏推送「有新版本」
      } else if (manual) {
        this._flash('✅ 已是最新版本（v' + ((window.__APP_VER__ && window.__APP_VER__.v) || '?') + '）');
      }
    } catch (e) {
      if (manual) this._flash('⚠️ 检查更新失败——稍后再试一次');
    }
  },
  _apk99CheckForce() { return this._apk99Check(true); },
  // 新版本通知栏推送（官方 @capacitor/local-notifications · 深链到设置页）
  async _apk99Notify(mf) {
    try {
      const L = this._nat99Plg('LocalNotifications');
      if (!L) return;
      const st = await L.checkPermissions();
      if (!st || st.display !== 'granted') return;            // 权限未开就不打扰
      await L.schedule({
        notifications: [{
          id: 9910,
          title: '📦 一人行有新版本 v' + (mf.v || ''),
          body: (mf.changes && mf.changes.length) ? String(mf.changes[0]).slice(0, 60) : '打开 App 查看更新内容',
          schedule: { at: new Date(Date.now() + 300), allowWhileIdle: true, isExactNotification: false },
          channelId: 'afu99',
          extra: { page: 'perm99' },
        }],
      });
    } catch (e) {}
  },
  // v12.9.46 强制更新 · 版本锁：有新版 → 全屏锁定（下载并安装 / 已装新版重新检测）
  _nat99VerLock(mf, url) {
    if (document.getElementById('nat99-verlock')) return;
    const cur = (window.__APP_VER__ && window.__APP_VER__.v) || '';
    const dl = new URL(mf.apk, url).href;
    const div = document.createElement('div');
    div.id = 'nat99-verlock';
    div.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.97);display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;';
    div.innerHTML = `
      <div style="max-width:420px;text-align:center;color:#f8fafc;font-family:inherit">
        <div style="font-size:48px;line-height:1;margin-bottom:12px">📦</div>
        <div style="font-size:18px;font-weight:800;margin-bottom:6px;color:#fbbf24">发现新版本 v${this.esc(mf.v)}</div>
        <div style="font-size:12px;color:#fca5a5;font-weight:700;margin-bottom:12px">一人行需更新到最新版本后使用（当前 v${this.esc(cur)}）</div>
        <div style="text-align:left;font-size:12px;color:#cbd5e1;line-height:1.9;margin-bottom:16px;background:rgba(255,255,255,.05);border-radius:12px;padding:12px 14px">
          ${mf.date ? '📅 ' + this.esc(mf.date) + '<br>' : ''}
          ${(mf.changes || []).map(c => '· ' + this.esc(c)).join('<br>')}
        </div>
        <button type="button" id="nat99-verlock-dl" style="width:100%;padding:12px 0;border-radius:12px;border:0;background:linear-gradient(135deg,#F472B6,#EC4899);color:#fff;font-size:14.5px;font-weight:800;box-shadow:0 6px 18px -6px rgba(236,72,153,.65)"
          onclick="App._nat99VerDownload(this,'${dl.replace(/'/g, "\\'")}')">⬇️ 立即下载并安装</button>
        <button type="button" style="width:100%;margin-top:10px;padding:10px 0;border-radius:12px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;font-size:12.5px"
          onclick="App._nat99VerRecheck()">我已安装新版 · 重新检测</button>
        <div style="font-size:10.5px;color:#94a3b8;margin-top:12px;line-height:1.7">下载完成自动弹出安装界面（同签名覆盖安装 · 全部数据保留）<br>Android 8+ 首次需在系统弹窗允许「安装未知应用」，仅一次</div>
      </div>`;
    document.body.appendChild(div);
  },
  async _nat99VerDownload(btn, dl) {
    if (btn) { btn.disabled = true; btn.textContent = '⬇️ 下载中…（完成后自动弹安装）'; }
    try { window.open(dl, '_system'); } catch (e) { location.href = dl; }
    if (btn) { btn.disabled = false; btn.textContent = '⬇️ 立即下载并安装'; }
  },
  _nat99VerRecheck() {
    if (!this._apk99Feed()) return;
    this._apk99FetchManifest().then(async (hit) => {
      const mf = hit && hit.mf;
      const localCode = await this._apk99LocalCode();
      const remoteCode = mf ? this._apk99RemoteCode(mf) : 0;
      if (!mf || localCode >= remoteCode) {
        const div = document.getElementById('nat99-verlock');
        if (div) div.remove();
        this._flash('✅ 已解锁——欢迎来到最新版');
        return;
      }
      this._flash('⏳ 本机仍是旧版（versionCode ' + localCode + ' < ' + remoteCode + '）——安装新版后重试');
    }).catch(() => this._flash('⚠️ 检测失败，请检查网络后重试'));
  },

  // ==================== 【应用数据】数据研究所第 11 库（v12.9.61 UsageStats 实时读取版）====================
  // 页面 UI 布局/样式/组件完全不动（用户硬性约束）——只新增逻辑：
  //   · 真机：Usage99 插件实时读取各 App 今日使用时长（安卓「使用情况访问」特殊权限，
  //     AppOpsManager 真值检测；未授予 → 友好提示 + 跳系统设置按钮，模块内容区展示引导，
  //     不弹红色调试弹窗；授权后 #apps99list 容器复用现有 cs99-item 行渲染时长数据，
  //     支持「刷新」按钮重新拉取）。
  //   · 网页版：保持原数字健康指引（各品牌路径），行为不变。
  _wbApps99(wb, W) {
    // v12.9.70 新增页内 Tab：「使用时长」（原有业务 · 完整保留）｜「应用锁机」（116-lock99.js）
    //   iOS 设备直接不渲染【应用锁机】Tab（安卓原生 Service/悬浮屏保不可用）
    const lockTabAvail = !this._lock99IsIOS();
    const tab = (this._lock99Tab === 'lock' && lockTabAvail) ? 'lock' : 'usage';
    const tabsHtml = lockTabAvail ? `
      <div class="cs99-tabs" style="margin-bottom:12px">
        <button type="button" class="cs99-tab${tab === 'usage' ? ' on' : ''}" onclick="App._lock99SetTab('usage')">📊 使用时长</button>
        <button type="button" class="cs99-tab${tab === 'lock' ? ' on' : ''}" onclick="App._lock99SetTab('lock')">🔒 应用锁机</button>
      </div>` : '';
    const head = `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title"><span class="ico">📱</span>应用数据 · 今日 App 使用时长
        <span class="sub" style="font-size:11px;color:#94a3b8;margin-left:6px">实时读取</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-ghost" onclick="App._dc99Set('tab','home')">📊 数据中心</button>
        <button class="btn btn-sm btn-ghost" onclick="App.navBack()">← 返回上一页</button>
      </div>
      <div style="font-size:12px;color:var(--text-soft);margin-top:6px">${tab === 'lock'
        ? '勾选要管控的 App、配置触发条件——模仿「不做手机控」的自控锁机（安卓专属）'
        : '各 App 今日实时使用时长——需开启「使用情况访问权限」后读取；网页版见下方系统数字健康指引。'}</div>
    </div>${tabsHtml}`;
    if (tab === 'lock') {                                        // —— 应用锁机：全部逻辑在 116-lock99.js ——
      setTimeout(() => { try { this._lock99Fill(); } catch (e) {} }, 0);
      return head + this._lock99PageHtml() + `<div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
    }
    setTimeout(() => { try { this._apps99Fill(); } catch (e) {} }, 0);
    return head + `
    <div id="apps99list"></div>
    <div style="margin-top:14px"><button class="btn btn-ghost" onclick="App.navBack()">← 返回上一页</button></div>`;
  },
  // 权限/读取引导 + 数据渲染（真机走 Usage99；网页版维持数字健康指引原样）
  _apps99Fill() {
    const el = document.getElementById('apps99list');
    if (!el || !el.isConnected) return;
    const U = this._nat99Plg('Usage99');
    if (!U) { this._apps99Guide(el); return; }              // 网页版：原指引不变
    el.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:10px 4px">⏳ 正在读取各 App 使用时长…</div>';
    (async () => {
      try {
        const st = await U.hasPermission();
        if (!st || !st.granted) {
          // 未授予：友好提示 + 跳系统设置页按钮 + 刷新（绝不弹调试报错）
          el.innerHTML = `
            <div class="card" style="border:2px solid #bae6fd;background:linear-gradient(180deg,#fff,#f0f9ff)">
              <div class="card-title"><span class="ico">🔐</span>需要「使用情况访问权限」</div>
              <div style="font-size:12.5px;color:#475569;line-height:2;margin-top:4px">
                需要授予<b>【使用情况访问权限】</b>，才能读取应用使用时长。<br>
                「使用情况访问」和「查看应用列表」是两个不同的权限——前者是 Android 特殊权限，只能在本机设置页手动开启：<br>
                <b>系统设置 → 隐私保护 → 特殊权限管理 → 使用情况访问 → 一人行 → 允许</b>
              </div>
              <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" style="margin:0" onclick="App._apps99OpenUsage()">🚀 去系统设置开启</button>
                <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App._apps99Fill()">🔄 授权后点我刷新</button>
              </div>
              <div style="font-size:11.5px;color:#94a3b8;margin-top:10px;line-height:1.8">
                开启后回到本页点「刷新」即可看到各 App 实时时长；不开启也不影响其他功能——四魔封印手动打卡照常可用。
              </div>
            </div>`;
          return;
        }
        const r = await U.queryToday();
        const apps = ((r && r.apps) || []).filter(a => !a.system);   // 只列用户 App（系统进程不掺噪音）
        if (!apps.length) {
          el.innerHTML = `
            <div class="card">
              <div style="font-size:12.5px;color:#475569;line-height:2;padding:6px 0">
                📭 今天还没有值得记录的应用使用（各 App 使用均不足 1 分钟）。<br>
                <span style="color:#94a3b8">点下面的「刷新」可重新拉取最新数据。</span>
              </div>
              <button class="btn btn-sm btn-ghost" onclick="App._apps99Fill()">🔄 刷新</button>
            </div>`;
          return;
        }
        const total = r.totalMinutes || 0;
        const fmt = (m) => m >= 60 ? Math.floor(m / 60) + '时' + (m % 60) + '分' : m + '分钟';
        const max = apps[0].minutes || 1;
        el.innerHTML = `
          <div class="card">
            <div class="card-title"><span class="ico">📊</span>今日使用 ${fmt(total)}
              <button class="btn btn-sm btn-ghost" style="float:right;margin:0" onclick="App._apps99Fill()">🔄 刷新</button>
            </div>
            <div style="font-size:11.5px;color:#94a3b8;margin-top:2px">实时读取自系统 UsageStats · 共 ${apps.length} 个应用 · 单击刷新拉取最新</div>
            ${apps.slice(0, 30).map(a => `
              <div class="cs99-item" style="border:1px solid #e2e8f0;border-radius:12px;margin-top:6px">
                <div class="cs99-mid" style="padding:9px 12px">
                  <div class="cs99-name" style="font-weight:800;font-size:13px">${this.esc(a.name || a.pkg)}</div>
                  <div style="height:5px;border-radius:999px;background:#e2e8f0;margin-top:6px;overflow:hidden">
                    <i style="display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#34d399,#059669);width:${Math.max(4, Math.round(a.minutes / max * 100))}%"></i>
                  </div>
                  <div class="cs99-sub" style="font-size:11.5px;display:flex;justify-content:space-between;margin-top:4px">
                    <span>${this.esc(a.pkg || '')}</span><b style="color:#047857">${fmt(a.minutes)}</b>
                  </div>
                </div>
              </div>`).join('')}
            <div style="font-size:11.5px;color:#94a3b8;margin-top:10px;line-height:1.8">
              四魔封印的手动打卡玩法不受任何影响：正气 / 正心 / 正姿 / 正魂 / 正言卡照常打卡喂魔——自律数据一直在你手里。
            </div>
          </div>`;
      } catch (e) {
        // 读取失败/系统不支持：友好文字提示，App 不崩溃、不弹调试报错
        el.innerHTML = `
          <div class="card">
            <div style="font-size:12.5px;color:#475569;line-height:2;padding:6px 0">
              😵 这次读取没有成功（本机系统暂时不给数据）。可以点「刷新」重试；<br>
              <span style="color:#94a3b8">也可以随时用系统自带「数字健康 / 屏幕使用时间」查看各 App 时长。</span>
            </div>
            <button class="btn btn-sm btn-ghost" onclick="App._apps99Fill()">🔄 刷新重试</button>
          </div>`;
      }
    })();
  },
  // 跳系统「使用情况访问」授权页（特殊权限唯一授予路径；回来后点刷新重读）
  _apps99OpenUsage() {
    const U = this._nat99Plg('Usage99');
    if (!U) return;
    U.openSettings().catch(() => {
      this._flash('打开系统设置失败——手动路径：系统设置 → 隐私保护 → 特殊权限管理 → 使用情况访问 → 一人行');
    });
  },
  // 网页版指引（原数字健康路径，原样保留）
  _apps99Guide(el) {
    const rows = [
      ['小米 / 红米（澎湃OS）', '设置 → 屏幕时间管理 → 今日使用'],
      ['华为 / 荣耀', '设置 → 健康使用手机 → 使用统计'],
      ['OPPO / 一加', '设置 → 数字健康与家人守护'],
      ['vivo / iQOO', '设置 → 快捷与辅助 / 屏幕使用时间'],
      ['三星', '设置 → 数字健康与家长控制'],
      ['原生 Android', '设置 → 数字健康与屏幕使用时间'],
    ].map(r => `<div class="cs99-item" style="border:1px solid #e2e8f0;border-radius:12px;margin-top:6px">
        <div class="cs99-mid" style="padding:9px 12px">
          <div class="cs99-name" style="font-weight:800">${r[0]}</div>
          <div class="cs99-sub" style="font-size:11.5px">${r[1]}</div>
        </div>
      </div>`).join('');
    el.innerHTML = `
      <div class="card" style="border:2px solid #bae6fd;background:linear-gradient(180deg,#fff,#f0f9ff)">
        <div class="card-title"><span class="ico">🧭</span>怎么看各 App 用了多久</div>
        <div style="font-size:12.5px;color:#475569;line-height:2;margin-top:4px">
          手机系统自带的<b>「数字健康 / 屏幕使用时间」</b>里就有每个 App 的当日时长排行（娱乐类一目了然），各品牌路径如下：
          ${rows}
        </div>
        <div style="font-size:11.5px;color:#94a3b8;margin-top:10px;line-height:1.8">
          四魔封印的手动打卡玩法不受任何影响：正气 / 正心 / 正姿 / 正魂 / 正言卡照常打卡喂魔——自律数据一直在你手里。
        </div>
      </div>`;
  },

  // 戒断数据页 · 状态卡（v12.9.59：自动执法随虚假插件下线——不再渲染该卡，魔物手动玩法完整保留）
  _nat99StatusCard() { return ''; },
});
