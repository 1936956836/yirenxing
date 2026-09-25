// 109-voice99.js —— v12.9.61 【阿福语音 · 通话模式】（G5-情感陪伴 · 阿福语音形态）
// [功能组] G5-情感陪伴 / G8-首页导航（入口：首页右上角阿福图标长按 1000ms）
//
// v12.9.61 交互重做（用户指令：不再「一边说话一边按」）：
//   · 点一下「📞 开始对话」→ 连续通话：持续聆听 → 用户停顿（Vosk 静音断句 + 700ms 稳定窗）
//     → 整段送阿福 AI → 回复 TTS 朗读（期间暂停采集，防把阿福的话识别成用户输入）→
//     朗读完自动回到聆听；随时点「📴 挂断」结束通话（停识别 + 停朗读，全部释放）。
//   · 语音识别 = Vosk 离线中文（95-native99.js 统一适配层 _sr99Create · APK 内置 42MB 模型 ·
//     零网络零系统语音服务——@capacitor-community/speech-recognition 已按用户指令彻底移除）；
//     麦克风权限仅在点击「开始对话」的瞬间动态申请，页面加载绝不自动申请。
//   · 状态提示（用户指令）：🎧 正在聆听 / 阿福思考中 / 阿福说话中——全程可见，实时字幕。
//   · 回复推理 = 复用阿福文字聊天的现有 AI 通道（DeepSeek / 智谱 glm-4-flash，用户自己的 Key，
//     页内可一键切换）——不引入任何新模型；对话记录写入同一条 afu 时间线（语音/文字互通）。
//   · 朗读 = @capacitor-community/text-to-speech（系统 TTS，完成即 resolve）。
//   · Voxora 英语口语陪练（v12.9.62 全语音实装）：中文陪伴 / 英语陪练两模式 + 四场景；
//     英语模式 = Vosk 英文离线模型（首次使用联网下载约 40MB · 仅一次 · 之后完全离线）
//     识别英文 → 阿福英文回复（系统提示强制英文）→ 英文声线 TTS 朗读；🆘 中文求助保留。
//   · 异常全部友好提示（权限被拒 / 模型加载失败 / AI 报错 / TTS 失效）——
//     绝不弹「插件找不到」类调试弹窗（旧自造语音桥已随虚假插件体系整体下线）。
Object.assign(App, {

  // ==================== 入口：首页阿福图标长按 1000ms（复用全局长按范式）====================
  // 单击仍是 afuChatOpen()（文字聊天，一行未改）；长按 1000ms → gotoWb('voice99')。
  _vf99WireHeroIcon() {
    if (window.__vf99HeroWired) return;
    window.__vf99HeroWired = true;
    const findBtn = (e) => { try { return e.target && e.target.closest && e.target.closest('.hero99-ava'); } catch (_) { return null; } };
    let lp = null, sx = 0, sy = 0;
    const clear = () => { if (lp) { clearTimeout(lp); lp = null; } };
    document.addEventListener('pointerdown', (e) => {
      const btn = findBtn(e);
      if (!btn) return;
      sx = e.clientX; sy = e.clientY;
      try { this._sfx99 && this._sfx99('liquid'); } catch (_) {}
      lp = setTimeout(() => {
        lp = null;
        btn.__vf99Hold = true;                    // 吞掉紧随的 click（防误入文字聊天）
        try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
        // v12.9.60 圆形渐变过渡（与轻氧↔归心切换同款 mode99-reveal 机制）：
        //   阿福绿圆幕从长按触点铺满全屏 → 铺满瞬间进语音页 → 圆幕淡出
        try { this._vf99Reveal(e); } catch (err) { try { this.gotoWb('voice99'); } catch (e2) {} }
      }, 1000);                                    // 全局统一长按阈值：1000ms
    });
    document.addEventListener('pointermove', (e) => {
      if (!lp) return;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) clear();   // 手指滑动 = 取消
    });
    document.addEventListener('pointerup', clear);
    document.addEventListener('pointercancel', clear);
    document.addEventListener('click', (e) => {
      const btn = findBtn(e);
      if (btn && btn.__vf99Hold) { btn.__vf99Hold = false; e.stopPropagation(); e.preventDefault(); }
    }, true);
    document.addEventListener('contextmenu', (e) => { if (findBtn(e)) e.preventDefault(); });
  },

  // v12.9.60 长按入场的圆形渐变过渡（复用 80-mode99 的 .mode99-reveal 样式与手法）：
  //   阿福绿 #059669 圆幕从触点撑满 → 铺满瞬间进语音页 → 淡出（与轻氧→归心同款动画）
  _vf99Reveal(ev) {
    if (this._vf99Revealing) return;
    const W = window.innerWidth, H = window.innerHeight;
    const x = (ev && ev.clientX) || W / 2;
    const y = (ev && ev.clientY) || H / 2;
    const R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 4;
    this._vf99Revealing = true;
    const div = document.createElement('div');
    div.className = 'mode99-reveal';
    div.style.setProperty('--mx', x + 'px');
    div.style.setProperty('--my', y + 'px');
    div.style.setProperty('--mr', R + 'px');
    div.style.background = '#059669';              // 阿福语音绿（呼应语音页按钮主色）
    (document.body || document.documentElement).appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('run')));
    setTimeout(() => {
      try { this.gotoWb('voice99'); } catch (e) {}
      div.classList.add('fade');
      setTimeout(() => { try { div.remove(); } catch (e) {} this._vf99Revealing = false; }, 300);
    }, 500);
  },

  // ==================== Voxora 英语口语陪练（模式 + 场景 · v12.9.58 起保留）====================
  _vox99Scenes() {
    return {
      daily:    { n: '日常闲聊', ico: '💬', p: '轻松寒暄、近况、兴趣话题——自然对话' },
      cafe:     { n: '点咖啡',   ico: '☕', p: '在咖啡店点单：选豆、杯型、堂食外带、买单' },
      travel:   { n: '旅行问路', ico: '🧭', p: '机场、酒店入住、问路、买票等出行场景' },
      interview:{ n: '模拟面试', ico: '💼', p: '英文自我介绍与常见面试问答（友好面试官）' },
    };
  },
  _vox99Mode() { return this._vox99St && this._vox99St.mode || 'zh'; },
  _vox99Pick(mode, scene) {
    this._vox99St = this._vox99St || {};
    this._vox99St.mode = mode;
    if (scene) this._vox99St.scene = scene;
    if (this._vf99Phase && this._vf99Phase !== 'idle') this._vf99CallEnd(true);   // 切模式先挂断在途通话
    this._flash(mode === 'en' ? '🇬🇧 英语陪练——和阿福全程英文语音通话（英文识别模型首次使用时联网下载约 40MB，仅一次）' : '🇨🇳 中文陪伴——点一下开始通话');
    try { this.gotoWb('voice99'); } catch (e) {}   // 重渲染模式 chips
  },
  // 英语模式中文求助：用中文写下想说的话，阿福教你英文说法（走同一 AI 通道）
  _vox99AskCn() {
    this._modal('🆘 英语求助（中文问）', `
      <div style="font-size:12px;color:#475569;line-height:1.8;margin-bottom:8px">想表达但说不出口？用中文写下来——阿福会解释 + 教你英文说法，然后你可以开口练。</div>
      <input type="text" id="vox99AskInput" class="input" placeholder="例如：我想表达「这个可以打包吗」">
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="App._closeModal()">取消</button>
        <button class="btn btn-primary" onclick="App._vox99AskSend()">发送给阿福</button>
      </div>`, [{ label: '关闭', onClick: () => {} }]);
  },
  _vox99AskSend() {
    const inp = document.getElementById('vox99AskInput');
    const q = inp ? inp.value.trim() : '';
    if (!q) { this._flash('先写下想表达的意思'); return; }
    this._closeModal();
    this._vf99Ask('（英语陪练求助）' + q);
  },
  // 语音形态系统提示：中文陪伴 = 阿福人设 + 口语化要求；英语陪练 = 英文教练人设 + 场景
  _vf99SystemPrompt() {
    if (this._vox99Mode() === 'en') {
      const sc = this._vox99Scenes()[(this._vox99St && this._vox99St.scene) || 'daily'] || this._vox99Scenes().daily;
      // v12.9.62 铁律：全程英文回复（旧版「解释时可用中文」导致阿福动不动切中文——按用户反馈改硬）
      return 'You are a friendly English speaking coach in a voice call. Current scene: ' + sc.p +
        '. ALWAYS reply ONLY in simple, natural spoken English (1-3 short sentences) — even if the user ' +
        'speaks imperfect English or mixes in Chinese, and regardless of any Chinese in earlier chat history. ' +
        'Gently correct the user\'s mistakes in English. Use Chinese ONLY when the user explicitly asks ' +
        'for a Chinese explanation or translation. Keep it warm and conversational.';
    }
    let sys = (this._afuSystemPrompt && this._afuSystemPrompt()) || '你是一人行App的管家阿福。';
    sys += '\n现在正在语音通话：回复保持 1-3 句自然口语（会被朗读出来），不用列表、不用标题、不用 emoji 开头。';
    return sys;
  },

  // ==================== 页面 ====================
  _wbVoice99(wb, W) {
    this._vf99WireHeroIcon();                        // 任何路径进本页都确保长按入口已绑定
    this._vf99GuardStart();
    const voxMode = this._vox99Mode();
    const voxScene = (this._vox99St && this._vox99St.scene) || 'daily';
    const scenes = this._vox99Scenes();
    const cfg = (Store.afuAIConfig && Store.afuAIConfig()) || {};
    const preset = (this._afuAIPresetOf && this._afuAIPresetOf(cfg)) || 'deepseek';
    // 火山 Doubao-TTS 状态（v12.9.64）：密钥未配齐 → 音色下拉整体置灰不可选
    const db = this._db99Cfg();
    const dbOk = !!(db.appid && db.token);
    const busy = this._vf99Phase !== 'idle';
    return `<div class="vf99-page">
      <div class="vf99-head">
        <button class="btn btn-ghost btn-sm" onclick="App._vf99Leave()">← 返回</button>
        <div class="vf99-head-t"><b>阿福 · 语音对话</b><span>点一下开始 · 停顿即答 · 挂断结束</span></div>
        <span style="width:44px"></span>
      </div>
      <div class="vox99-bar">
        <button type="button" class="vox99-m${voxMode === 'zh' ? ' on' : ''}" onclick="App._vox99Pick('zh')">🇨🇳 中文陪伴</button>
        <button type="button" class="vox99-m${voxMode === 'en' ? ' on' : ''}" onclick="App._vox99Pick('en')">🇬🇧 英语陪练</button>
      </div>
      ${voxMode === 'en' ? `
      <div class="vox99-scenes">
        ${Object.keys(scenes).map(k => `<button type="button" class="vox99-sc${voxScene === k ? ' on' : ''}" onclick="App._vox99Pick('en','${k}')">${scenes[k].ico} ${scenes[k].n}</button>`).join('')}
      </div>
      <div class="vox99-hint">场景：${this.esc(scenes[voxScene].p)} · <button type="button" class="vox99-ask" onclick="App._vox99AskCn()">🆘 中文求助</button></div>` : ''}
      <div class="vf99-stage">
        <div class="vf99-ava${busy ? ' busy' : ''}" id="vf99Ava">
          <div class="vf99-ring"></div>
          <div class="vf99-face">${this._afu99AvatarHtml ? this._afu99AvatarHtml(64) : '🤵'}</div>
        </div>
        <div class="vf99-status" id="vf99Status">待机</div>
        <div class="vf99-sub" id="vf99Sub">点下方按钮开始通话——阿福全程聆听，你停顿他就接话</div>
      </div>
      <div class="vf99-trans" id="vf99Trans"></div>
      <div class="vf99-btns">
        <button type="button" class="vf99-btn call" id="vf99HoldBtn"
          onclick="App._vf99CallToggle()">📞 开始对话</button>
      </div>
      <div class="vf99-cfg">
        <div class="vf99-cfg-row">
          <span class="vf99-cfg-l">🧠 模型</span>
          <button type="button" class="vf99-mchip${preset === 'deepseek' ? ' on' : ''}" data-m="deepseek" onclick="App._vf99Model('deepseek')">🔌 DeepSeek</button>
          <button type="button" class="vf99-mchip${preset === 'zhipu' ? ' on' : ''}" data-m="zhipu" onclick="App._vf99Model('zhipu')">🧠 智谱 glm-4-flash</button>
        </div>
        <div class="vf99-cfg-row">
          <span class="vf99-cfg-l">🌋 火山引擎</span>
          <button type="button" class="vf99-mchip${dbOk ? ' on' : ''}" onclick="App._vf99DbCfg()">${dbOk ? '✅ 已配置 · 修改' : '⚙️ 配置 AppID / Token'}</button>
          <span class="vf99-dbflag${dbOk ? ' ok' : ''}">${dbOk ? '密钥已就绪' : '未配置'}</span>
        </div>
        <div class="vf99-cfg-row">
          <span class="vf99-cfg-l">🎙️ 阿福音色</span>
          <select class="vf99-vsel" id="vf99VoiceSel" ${dbOk ? '' : 'disabled'}
            onchange="App._vf99VoiceSel(this.value)">
            <option value="">${dbOk ? '选择音色…' : '请先配置火山引擎密钥'}</option>
            ${(this.DB99_VOICES || []).map(v => `<option value="${v.id}"${db.voice === v.id ? ' selected' : ''}>${v.label}</option>`).join('')}
          </select>
          <button type="button" class="vf99-mchip" onclick="App._vf99VoiceTest()">▶️ 测试当前音色</button>
        </div>
        <div class="vf99-cfg-note">朗读 = 火山引擎豆包 TTS 六款系统音色（自选不自动切换：前 4 款中文音色可读英文但非母语发音；Russell / 英式女声为英文专属，不适合中文）——密钥未配齐时下拉置灰，阿福暂用本机系统朗读。语音识别为本机离线引擎（中文模型随安装包内置；英文模型首次使用时联网下载约 40MB，仅一次）；思考走与阿福文字聊天共用的 AI 配置与记忆。</div>
      </div>
    </div>`;
  },

  // 模型切换（沿用阿福现有配置存储）
  _vf99Model(p) {
    try {
      const key = Store.afuKeySlot(p);
      if (p === 'zhipu') Store.afuApiSave('https://open.bigmodel.cn/api/paas/v4', key, 'glm-4-flash');
      else Store.afuApiSave('https://api.deepseek.com/v1', key, 'deepseek-chat');
      Store.afuKeySlotSave(p, key);
    } catch (e) {}
    document.querySelectorAll('.vf99-mchip').forEach(b => b.classList.toggle('on', b.dataset.m === p));
    this._flash('✅ 已切换模型（' + (p === 'zhipu' ? '智谱 glm-4-flash' : 'DeepSeek') + '）');
  },

  // ==================== 火山引擎 Doubao-TTS 配置与音色（v12.9.64 · 用户指令）====================
  // ① 密钥配置区：AppID / Access-Token 由用户手动填写（仅存 localStorage 配置变量，代码零硬编码）；
  //    未填完整 → 音色下拉整体置灰不可选。
  // ② 音色下拉 = 6 款火山 Uranus 系统音色，选中值保存到状态变量 selectedVoiceId；
  //    每次 ttsSpeak 必须显式传参：ttsSpeak(文本, selectedVoiceId)，不许省略。
  // ③ 「测试当前音色」：直接 ttsSpeak("测试音色，听听现在是什么声音", selectedVoiceId)，
  //    不经过对话/AI 链路，快速验证音色是否生效。
  // ④ voiceId 无效 → ttsSpeak 内部 console.error("无效voiceId：xxx")，不自动降级音色。
  // ⑤ 音频音色 100% 由请求 payload 的 speaker（audio.voice_type）决定，与提示词/人设文案无关。
  // ⑥ AI 对话/记忆/工具调用逻辑零改动（只动 TTS 合成相关片段）。
  // 开发者校验备注（仅注释）：请求 payload 的 speaker 字段跟随 selectedVoiceId 变化，无硬编码音色。
  _vf99DbCfg() {
    const c = this._db99Cfg();
    this._modal('🌋 火山引擎 · 豆包 TTS 配置', `
      <div style="font-size:12px;color:#475569;line-height:1.9;margin-bottom:8px">
        前往 <b>火山引擎控制台</b>（语音技术 · 语音合成大模型）创建应用获取
        <b>AppID</b> 与 <b>Access Token</b>——密钥只存在你本机，用于阿福朗读。
        新用户赠送 <b>2 万字符</b>免费额度（半年有效），之后按字符计费；六款系统音色无需单独授权。
      </div>
      <input type="text" id="db99Appid" class="input" placeholder="AppID（纯数字）" value="${this.esc(c.appid)}">
      <input type="password" id="db99Token" class="input" style="margin-top:8px" placeholder="Access Token" value="${this.esc(c.token)}">
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="App._vf99DbClear()">清除配置</button>
        <button class="btn btn-primary" onclick="App._vf99DbSave()">保存</button>
      </div>`, [{ label: '关闭', onClick: () => {} }]);
  },
  _vf99DbSave() {
    const a = document.getElementById('db99Appid');
    const t = document.getElementById('db99Token');
    if (!a || !t) return;
    const appid = String(a.value || '').trim(), token = String(t.value || '').trim();
    if (!appid || !token) { this._flash('⚠️ AppID 和 Access-Token 都要填完整'); return; }
    try {
      localStorage.setItem('db99_appid', appid);
      localStorage.setItem('db99_token', token);
    } catch (e) {}
    this._closeModal();
    this._flash('✅ 火山引擎密钥已保存——现在可以在「阿福音色」里选择音色了');
    this.gotoWb('voice99');                                  // 重渲染：解锁音色下拉
  },
  _vf99DbClear() {
    try {
      localStorage.removeItem('db99_appid');
      localStorage.removeItem('db99_token');
      localStorage.removeItem('db99_voice');
    } catch (e) {}
    this._closeModal();
    this._flash('已清除火山引擎配置——音色下拉已置灰');
    this.gotoWb('voice99');
  },
  // 音色下拉选中 → 保存状态变量 selectedVoiceId（页面渲染时经 _db99Cfg 镜像到 App.selectedVoiceId）
  _vf99VoiceSel(vid) {
    const v = (this.DB99_VOICES || []).find(x => x.id === vid);
    if (!v) return;
    try { localStorage.setItem('db99_voice', vid); } catch (e) {}
    this.selectedVoiceId = vid;
    this._flash('✅ 阿福音色 → ' + v.label);
  },
  // 【测试当前音色】：ttsSpeak(测试文本, selectedVoiceId) 直接调 TTS 接口，不经过对话/AI 链路
  async _vf99VoiceTest() {
    const c = this._db99Cfg();                               // selectedVoiceId 同步镜像
    const selectedVoiceId = this.selectedVoiceId || c.voice;
    if (!c.appid || !c.token) { this._flash('🌋 先在上方「火山引擎」填好 AppID / Access-Token，才能试音'); return; }
    if (!selectedVoiceId) { this._flash('🎙️ 先在「阿福音色」下拉里选一个音色'); return; }
    this._flash('🔊 正在用所选音色试音…');
    const r = await this.ttsSpeak('测试音色，听听现在是什么声音', selectedVoiceId);
    if (r === 'invalid') this._flash('⚠️ 无效音色（控制台已报错）——请重新在下拉里选择');
    else if (r === false) this._flash('⚠️ 试音没有成功——检查密钥 / 网络 / 免费额度（控制台有详细报错）');
  },

  // ==================== v12.9.61 通话模式（点一次开始 · 停顿即答 · 挂断即止）====================
  // 用户指令：不再「一边说话一边按」——点一下「开始对话」进入连续通话：
  //   持续聆听（Vosk 离线识别）→ 用户停顿（静音断句 + 700ms 稳定窗）→ 整段送阿福 AI →
  //   回复 TTS 朗读（期间暂停采集，防把阿福的话识别成用户输入）→ 朗读完自动回到聆听；
  //   随时点「挂断」结束通话（停识别 + 停朗读，全部资源释放）。
  _vf99Phase: 'idle',          // idle | loading | listening | thinking | speaking
  _vf99Rec: null,
  _vf99Pending: '',            // 停顿稳定窗内的已确认语句（用户这一轮的完整发言）
  _vf99StableT: null,          // 停顿稳定计时器（700ms 无新语音 = 这轮说完了）

  _vf99CallToggle() {
    if (this._vf99Phase === 'idle') { this._vf99CallStart(); return; }
    if (this._vf99Phase !== 'loading') this._vf99CallEnd();     // 准备中不许误触挂断
  },

  async _vf99CallStart() {
    if (this._vf99Phase !== 'idle') return;
    // ① AI 通道前置检查（没配好先去配，别让用户白说一通）
    const st = this._afuAIState ? this._afuAIState() : { ok: true };
    if (st && st.ok === false) {
      this._flash('⚠️ 阿福的 AI 通道还没配好——去阿福聊天点 ⚙️ 完成配置（一次性）');
      return;
    }
    const enMode = this._vox99Mode() === 'en';       // v12.9.62：英语陪练全面语音实装（英文模型按需下载）
    // ② 创建识别器（95 层统一适配：Vosk 离线 · 首次自动加载模型 + 申请话筒权限）
    const rec = this._sr99Create ? this._sr99Create() : null;
    if (!rec) {
      this._flash(!!window.__PHONE_EDITION__
        ? '🎤 本机暂不支持语音识别——可先在别处打字与阿福聊'
        : '🎤 当前浏览器不支持语音识别（Chrome / Edge 效果最佳）');
      return;
    }
    rec.lang = enMode ? 'en-US' : 'zh-CN';           // 适配层按此选 Vosk 模型（中/英）
    rec.continuous = true;
    rec.interimResults = true;
    this._vf99Pending = '';
    rec.onresult = (e) => {
      const r = (e.results && e.results[0]) || null;
      const t = (r && r[0] && r[0].transcript) || '';
      if (r && r.isFinal) {
        if (t) this._vf99Hear(t.trim());            // 一句完整话（Vosk 静音断句 = 用户停顿）
      } else if (t) {
        this._vf99Sub((this._vf99Pending ? this._vf99Pending : '') + t, true);   // 实时字幕
      }
    };
    rec.onprogress = (p) => {                        // 英文模型首次下载进度（仅英文模式出现）
      this._vf99Sub('⬇️ 正在下载英语识别模型（约 40MB · 仅此一次，之后完全离线）… ' + p + '%', true);
    };
    rec.onerror = (e) => {
      // 权限被拒/模型失败的友好提示由适配层负责——这里只静默收场复位
      this._vf99CallEnd(true);
    };
    this._vf99Rec = rec;
    this._vf99Phase = 'loading';
    this._vf99SetUI();
    this._vf99Sub(enMode
      ? '🎧 正在准备英语识别模型…首次需联网下载约 40MB（仅此一次），下载后完全离线'
      : '🎧 正在准备离线语音模型…首次约需 10 秒，之后秒开');
    const ok = await rec.start();                    // 适配层内部：权限 → 监听 → 模型 → 启动
    if (this._vf99Phase !== 'loading') { try { rec.stop(); } catch (e) {} return; }   // 已被挂断
    if (!ok) {
      this._vf99Rec = null;
      this._vf99Phase = 'idle';
      this._vf99SetUI();
      this._vf99Sub('点下方按钮开始和阿福通话');
      return;
    }
    this._vf99Phase = 'listening';
    this._vf99SetUI();
    this._vf99Sub('🎧 正在聆听——说话吧，停顿一下阿福就接话 · 随时点挂断结束');
  },

  // 收到一句完整话：累积进本轮发言 + 重置停顿稳定窗（用户可能接着说）
  _vf99Hear(text) {
    if (this._vf99Phase !== 'listening') return;
    this._vf99Pending = (this._vf99Pending + text).trim();
    if (this._vf99StableT) clearTimeout(this._vf99StableT);
    this._vf99StableT = setTimeout(() => this._vf99Send(), 700);
  },

  // 停顿稳定（700ms 无新语音）→ 本轮发言送阿福：先暂停采集再问（防把阿福的话识别进去）
  async _vf99Send() {
    if (this._vf99Phase !== 'listening') return;
    const text = this._vf99Pending.trim();
    this._vf99Pending = '';
    if (this._vf99StableT) { clearTimeout(this._vf99StableT); this._vf99StableT = null; }
    if (!text) return;
    this._vf99Phase = 'thinking';
    this._vf99SetUI();
    try { if (this._vf99Rec) await this._vf99Rec.pause(); } catch (e) {}
    this._vf99Ask(text, true);
  },

  // 挂断：停识别 + 停朗读 + 全部复位（quiet=true 静默收场，用于 onerror / 页面离开）
  _vf99CallEnd(quiet) {
    if (this._vf99StableT) { clearTimeout(this._vf99StableT); this._vf99StableT = null; }
    this._vf99Pending = '';
    const rec = this._vf99Rec;
    this._vf99Rec = null;
    if (rec) { try { rec.stop(); } catch (e) {} }
    this._tts99Stop();
    const wasLive = this._vf99Phase !== 'idle';
    this._vf99Phase = 'idle';
    this._vf99SetUI();
    this._vf99Sub('通话结束——点下方按钮可再次开始');
    if (wasLive && !quiet) this._flash('📴 通话已结束');
  },

  // ==================== 阿福 AI（复用文字聊天通道 · 记忆互通 · 友好报错）====================
  // resumeAfter=true：通话模式——回复朗读完后自动恢复聆听（继续下一轮）；false：单发（中文求助等）
  async _vf99Ask(text, resumeAfter) {
    if (!resumeAfter && this._vf99Rec) this._vf99CallEnd(true);   // 非通话单发插话：先挂断在途通话
    const st = this._afuAIState ? this._afuAIState() : { ok: true, cfg: (Store.afuAIConfig && Store.afuAIConfig()) || {} };
    if (st && st.ok === false) {
      this._vf99CallEnd(true);
      this._flash('⚠️ 阿福的 AI 通道还没配好——去阿福聊天点 ⚙️ 完成配置（一次性）');
      return;
    }
    const cfg = (st && st.cfg) || (Store.afuAIConfig && Store.afuAIConfig()) || {};
    if (!resumeAfter) {
      this._vf99Phase = 'thinking';
      this._vf99SetUI();
    }
    this._vf99Sub('💭 阿福思考中…');
    // 记录互通：写入同一条 afu 聊天时间线（语音/文字同一份记忆）
    const msgs = Store.afuChatLoad();
    msgs.push({ role: 'user', content: String(text).slice(0, 2000), ts: Date.now(), via: this._vox99Mode() === 'en' ? 'voice-en' : 'voice' });
    try { if (this._afu99MoodLog) this._afu99MoodLog(text); } catch (_) {}
    Store.afuChatSave(msgs);
    this._vf99Bubble('user', text);
    let status = 0;
    try {
      const isWorker = cfg.mode === 'worker';
      const headers = { 'Content-Type': 'application/json' };
      if (!isWorker) headers['Authorization'] = 'Bearer ' + cfg.key;
      const url = isWorker ? this._afuAIEndpoint(cfg) : cfg.base.replace(/\/+$/, '') + '/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: isWorker ? 'glm-4-flash' : (cfg.model || 'deepseek-chat'),
          messages: [{ role: 'system', content: this._vf99SystemPrompt() }].concat(
            msgs.slice(-20).filter(m => typeof m.content === 'string' && m.content).map(m => ({ role: m.role, content: m.content }))
          ),
          temperature: 0.7,
          max_tokens: 600,
        }),
      });
      status = res.status;
      const j = await res.json().catch(() => ({}));
      let reply = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      if (!reply) throw new Error((j && j.error && (j.error.message || j.error.msg)) || ('HTTP ' + res.status));
      reply = reply.trim();
      // 长回复截取朗读（完整文字都在气泡里）
      msgs.push({ role: 'assistant', content: reply.slice(0, 2000) });
      Store.afuChatSave(msgs);
      this._vf99Bubble('afu', reply);
      this._vf99Phase = 'speaking';
      this._vf99SetUI();
      this._vf99Sub('🗣️ 阿福在说——说完自动回到聆听');
      // —— 朗读（v12.9.64 火山 Doubao-TTS）：ttsSpeak(文本, selectedVoiceId) 显式传参，
      //    请求 payload 的 speaker（audio.voice_type）跟随 selectedVoiceId，无任何硬编码音色。
      //    未配置密钥/未选音色 → 本机系统朗读兜底（明示）；voiceId 无效 → 控制台报错、不降级、不出声。
      const lk = this._vox99Mode() === 'en' ? 'en' : 'zh';
      const dbc = this._db99Cfg();                           // selectedVoiceId 同步镜像
      const selectedVoiceId = this.selectedVoiceId || '';
      let spoke = null;                                       // null=没走火山 / true / false / 'invalid'
      if (dbc.appid && dbc.token && selectedVoiceId) {
        spoke = await this.ttsSpeak(reply.slice(0, 500), selectedVoiceId);
        if (spoke === 'invalid') {
          // voiceId 无效：ttsSpeak 内已 console.error("无效voiceId：xxx")——不降级，本次只显示文字
          this._flash('⚠️ 无效音色（控制台已报错）——本次不朗读，请在「阿福音色」里重选');
        } else if (spoke === false) {
          this._flash('⚠️ 火山朗读未成功（密钥/网络/额度）——已临时用本机系统朗读');
        }
      }
      if (spoke !== true && spoke !== 'invalid') {
        // 兜底：本机系统 TTS（未配置火山 / 火山请求失败——两次都失败则文字兜底）
        const ok2 = await this._tts99Speak(reply.slice(0, 500), {
          lang: lk === 'en' ? 'en-US' : 'zh-CN', rate: 0.98,
        });
        if (!ok2 && !this._tts99Ok()) this._vf99Sub('（本机暂无语音朗读——文字已显示在上面）');
      }
    } catch (e) {
      // AI 报错：复用阿福「说人话」友好文案（余额不足/Key无效/地址错……全部人话）
      const friendly = this._afu99ChatErr ? this._afu99ChatErr(e, status, cfg) : '（阿福暂时连不上模型——稍后再试一次）';
      this._vf99Bubble('afu', friendly);
      try { console.warn('[语音] 阿福AI请求失败：', (e && e.message) || e, status ? 'HTTP ' + status : ''); } catch (_) {}
    } finally {
      if (resumeAfter && this._vf99Rec && this._vf99Phase !== 'idle') {
        // 通话还在（没被挂断/离开）：阿福说完 → 麦克风恢复采集 → 回到聆听
        this._vf99Phase = 'listening';
        this._vf99SetUI();
        this._vf99Sub('🎧 正在聆听——继续说，停顿一下阿福就接话');
        try { await this._vf99Rec.resume(); } catch (e) {}
      } else {
        this._vf99Phase = 'idle';
        this._vf99SetUI();
        this._vf99Sub('点下方按钮开始和阿福通话');
      }
    }
  },

  // ==================== 离开释放（返回首页：停识别停朗读，全部资源释放）====================
  _vf99Leave() {
    this._vf99Cleanup();
    this.navigate('dashboard');
  },
  _vf99Cleanup() {
    this._vf99CallEnd(true);                         // 挂断通话（停识别 + 停 TTS + 全部复位）
  },
  // 安全网：从其他路径离开本页（dock 切换/深链）→ 2s 巡检自动释放
  _vf99GuardStart() {
    if (window.__vf99Guard) return;
    window.__vf99Guard = setInterval(() => {
      try {
        if (App._vf99Phase === 'idle' && !App._vf99Rec) return;
        if (App.currentView !== 'workbench' || App._wbView !== 'voice99') {
          App._vf99Cleanup();
        }
      } catch (e) {}
    }, 2000);
  },

  // ==================== UI 辅助（只改 DOM，不整页重渲染）====================
  _vf99SetUI() {
    const ph = this._vf99Phase;
    const st = document.getElementById('vf99Status');
    const btn = document.getElementById('vf99HoldBtn');
    const ava = document.getElementById('vf99Ava');
    if (btn) {
      btn.textContent = ph === 'idle' ? '📞 开始对话' : (ph === 'loading' ? '⏳ 准备中…' : '📴 挂断');
      btn.classList.toggle('hang', ph !== 'idle' && ph !== 'loading');   // 红色挂断样式（styles.css 已有）
      btn.disabled = ph === 'loading';
    }
    if (ava) ava.classList.toggle('busy', ph !== 'idle');
    if (st) {
      st.textContent = ph === 'listening' ? '🎧 正在聆听' : (ph === 'thinking' ? '💭 阿福思考中' : (ph === 'speaking' ? '🗣️ 阿福说话中' : (ph === 'loading' ? '⏳ 准备中' : '待机')));
      st.classList.toggle('listening', ph === 'listening');
    }
  },
  _vf99Sub(t, live) {
    const el = document.getElementById('vf99Sub');
    if (el) { el.textContent = t || ''; el.classList.toggle('live', !!live); }
  },
  _vf99Bubble(role, text) {
    const box = document.getElementById('vf99Trans');
    if (!box || !text) return;
    const div = document.createElement('div');
    div.className = 'vf99-b ' + (role === 'user' ? 'me' : 'afu');
    div.textContent = text;
    box.appendChild(div);
    while (box.children.length > 8) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  },
});
