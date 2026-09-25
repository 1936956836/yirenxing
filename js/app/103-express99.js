// 103-express99.js —— v12.9.47 【独行表达】口语表达训练舱（长按底部【家园】旋钮 1 秒进入）
// [功能组] G5-情感陪伴 / G6-专注模式（表达域：治愈像素风 · 青绿深空 · 液态玻璃）
//
// 设计（用户规则 · 独行表达）：
//   · 入口：底部导航【家园】旋钮长按 1 秒（液体音 + 青绿圆幕渐变过渡，与地球/视频一致）
//   · 实时语音转文字：Web Speech API 连续识别（Chrome / Android WebView 原生支持，中英混合 zh-CN），
//     实时生成字幕；口头禅（然后 / 就是 / 那个 / 很多…）自动标红高亮；
//     不支持语音识别的浏览器 → ⌨️ 打字模式走同一套分析管线（全端可用）
//   · 实时反馈：① 词语精确度——模糊词自动提示替换词（想→渴望/期待/向往 · 很多→大量/海量/充裕…）
//     + 大连理工大学情感词汇本体库（7 大情感分类：乐/好/怒/哀/惧/恶/惊）情绪词捕捉；
//     ② 表达问题检测——11 条规则引擎实时扫描：重复/结论缺失/缺乏例子/前后矛盾/时间感知/
//     金句捕捉/比喻举例/主题跑偏/立场模糊/填充词超频/语速密度
//   · 分析报告：录音结束自动生成——本地统计（总时长/总字数/语速/表达密度/填充词频率/犹豫词占比/
//     直接性评分）+ 阿福 AI 直连（117 行内置 prompt · DeepSeek / 智谱 glm-4-flash）生成
//     总评（评分+一句话定位）/亮点/逐句分析/可替换词语/情绪分析/行为模式（填充词模式/冲突回避/
//     犹豫模式/直接性/说服力结构）/下次练习重点；AI 未配置时降级为本地规则报告
//   · 报告导出：复制全文 / 导出 Markdown 文件（本地下载）/ 系统分享
//   · 存储：练习记录与报告存 localStorage；情感词汇库存 IndexedDB（首启种子 · 离线可用）
//   · 合规：首次打开弹合规声明（所有数据仅存本地）；AI 报告仅在用户自行配置密钥时使用，
//     该过程只把转写文本发往用户自己配置的 AI 服务
Object.assign(App, {

  // ==================== 常量 ====================
  EXPRESS99_OKKEY: 'express99_ok',
  EXPRESS99_RKEY: 'express99_recs',

  // 口头禅 / 填充词（标红 + 统计）
  EXPRESS99_FILLERS: ['然后', '就是说', '就是', '那个', '这个', '那么', '其实', '基本上', '反正', '怎么说呢', '然后呢', '对吧', '对不对', '是吧', '的话', '简单来说', '说实话', '老实讲', '你懂的', '懂我意思吧', '之类的', '什么的', '等等'],
  // 犹豫词（犹豫模式分析）
  EXPRESS99_HESIT: ['嗯', '呃', '啊', '嘛', '怎么说', '让我想想', '等一下', '我想一下'],
  // 立场模糊（hedge）
  EXPRESS99_HEDGE: ['可能', '也许', '差不多', '看情况', '都行', '随便', '还好', '再说吧', '大概', '应该是'],
  // 冲突回避
  EXPRESS99_AVOID: ['算了', '无所谓', '不想说了', '就这样吧', '没事的', '没什么', '不好说', '不想提'],
  // 模糊词 → 替换建议（词语精确度提示）
  EXPRESS99_VAGUE: {
    '想': '渴望 / 期待 / 向往', '很多': '大量 / 海量 / 充裕', '挺好': '出色 / 优秀 / 令人满意',
    '非常好': '格外 / 无比 / 十分', '特别': '尤其 / 格外 / 非常', '超级': '极其 / 万分',
    '不错': '优秀 / 出色 / 值得肯定', '还行': '尚可 / 达标（说清标准）', '一般': '中等 / 平常（说清比较对象）',
    '东西': '（换成具体名词）', '事情': '（换成具体事件）', '弄': '（换成明确动词）', '搞': '（换成明确动词）',
    '做': '（换成具体动作）', '有点': '轻微 / 略微（说清程度）', '挺多的': '相当多（给出数量级）',
  },
  // 大连理工大学情感词汇本体库（7 大类）· 内置精选核心子集（分类口径与大工本体对齐：乐/好/怒/哀/惧/恶/惊；
  // 存 IndexedDB 离线使用，可在设置里查看状态）
  EXPRESS99_DUT_LEX: {
    '乐': '开心 快乐 高兴 欢喜 愉悦 欣喜 兴奋 激动 满足 舒心 舒畅 畅快 惬意 欢乐 快活 乐观 开怀 痛快 喜悦 喜洋洋 兴高采烈 心花怒放 欢欣鼓舞 沾沾自喜 得意 满意 庆幸 幸运 甜蜜 幸福 享受 放松 安心 踏实 舒坦 愉快 欢畅 喜出望外 乐不可支 心旷神怡 如释重负 欢腾 欢快 美滋滋 乐呵呵 笑 哈哈 微笑 大笑 欢笑 高兴坏 惬意 舒适 畅意 开心果 偷着乐 喜上眉梢 眉开眼笑 心情好 痛快淋漓 尽兴 尽情 酣畅',
    '好': '喜欢 喜爱 爱 挚爱 热爱 钟爱 偏爱 宠爱 敬爱 爱护 爱惜 同情 怜惜 珍惜 敬佩 尊敬 赞赏 赞美 称赞 赞叹 钦佩 佩服 欣赏 肯定 认可 支持 信任 信赖 期待 盼望 希望 渴望 向往 憧憬 喜好 中意 满意 顺心 称心 如意 给力 优秀 出色 卓越 精彩 完美 感动 温暖 温柔 贴心 幸运 感激 感恩 舒服 安逸 妙 美好 和谐 友好 善良 真诚 坦诚 靠谱 用心 尽心 尽力 负责 担当 勇敢 坚强 坚持 努力 勤奋 聪明 智慧 睿智 大方 幽默 有趣 可爱 漂亮 美丽 帅 俊 标致 利落 干净 整洁 讲究 品味',
    '怒': '生气 愤怒 恼怒 恼火 气愤 气恼 愤慨 愤恨 憎恨 仇恨 怨恨 恼恨 大怒 震怒 暴怒 狂怒 气炸 火冒三丈 恼羞成怒 怒斥 怒吼 怒视 瞪眼 翻脸 憋气 憋屈 气不过 咬牙切齿 愤愤不平 不满 抱怨 埋怨 怨 怨气 鄙视 蔑视 轻蔑 讨厌 厌恶 憎恶 反感 作呕 恶心 呵斥 骂 责骂 诅咒 翻白眼 阴阳怪气 冷嘲热讽 呛人 找茬 挑刺 冒犯 惹恼 激怒 触怒 讨嫌 来气 窝火 窝囊 面红耳赤 怒气冲冲',
    '哀': '难过 伤心 悲伤 悲哀 悲痛 哀伤 哀痛 忧伤 沮丧 失落 失望 绝望 无助 孤独 寂寞 落寞 凄凉 凄惨 悲惨 悲观 郁闷 忧郁 忧愁 愁 苦恼 苦闷 痛苦 悲叹 哀叹 叹息 叹气 心疼 心酸 辛酸 酸楚 委屈 惆怅 苍凉 黯然 伤感 哭 流泪 掉泪 泪水 眼泪 呜咽 抽泣 心碎 沉重 压抑 阴郁 提不起劲 灰心 泄气 颓丧 颓然 无力感 空落落 怅然若失 志忑低落 闷闷不乐',
    '惧': '害怕 惧怕 畏惧 畏缩 恐惧 恐慌 惊恐 惊慌 慌张 慌乱 心慌 发慌 胆怯 胆寒 惊吓 惊惧 忐忑 不安 担心 担忧 忧虑 焦虑 焦急 着急 紧张 紧绷 提心吊胆 惶恐 惶惶 惊惶 战栗 发抖 冒冷汗 头皮发麻 心惊胆战 毛骨悚然 不寒而栗 畏难 发怵 怵 心里没底 手足无措 六神无主 乱阵脚 怯场 腿软 心虚 忐忑不安 悬着 心提到嗓子眼',
    '恶': '厌恶 讨厌 嫌弃 嫌恶 反感 作呕 呕吐 鄙夷 鄙弃 唾弃 厌烦 不耐烦 烦 烦躁 烦闷 厌倦 倦怠 无聊 腻 腻烦 憋闷 不屑 嗤之以鼻 看不上 瞧不起 挑剔 挑理 挑刺 冷漠 冷淡 无视 漠然 隔应 膈应 不得劲 别扭 难受 恶心坏了 无语 服了 醉了 头大 头疼 崩溃 无奈 没辙 受不了 敬而远之',
    '惊': '惊讶 惊奇 惊异 吃惊 诧异 惊愕 震惊 震撼 震动 惊叹 惊艳 意外 出乎意料 没想到 突然 蓦然 愕然 惊呆 目瞪口呆 瞠目结舌 大吃一惊 惊疑 纳闷 疑惑 好奇 新奇 新鲜 眼前一亮 大开眼界 不可思议 难以置信 始料未及 猝不及防 一愣 一怔 回过神 恍然 恍惚 大跌眼镜 刮目相看',
  },

  // 11 条表达问题检测规则（tone: warn 提醒 / good 亮点 / info 建议）
  EXPRESS99_RULES: [
    { k: 'filler', n: '填充词超频', ico: '🫧', tone: 'warn' },
    { k: 'repeat', n: '重复表达', ico: '🔁', tone: 'warn' },
    { k: 'noconcl', n: '结论缺失', ico: '🧭', tone: 'warn' },
    { k: 'noexample', n: '缺乏例子', ico: '🌰', tone: 'warn' },
    { k: 'contra', n: '前后矛盾', ico: '⚡', tone: 'warn' },
    { k: 'drift', n: '主题跑偏', ico: '🎯', tone: 'warn' },
    { k: 'vague', n: '立场模糊', ico: '🌫️', tone: 'warn' },
    { k: 'timeline', n: '时间感知', ico: '⏳', tone: 'info' },
    { k: 'dense', n: '语速与密度', ico: '⏱️', tone: 'info' },
    { k: 'metaphor', n: '比喻与举例', ico: '🪄', tone: 'good' },
    { k: 'golden', n: '金句捕捉', ico: '✨', tone: 'good' },
  ],

  // 内置 117 行 prompt（阿福 AI 直连 · 生成独行表达分析报告）
  EXPRESS99_PROMPT: [
    '你是「一人行」App【独行表达】功能的表达教练：一位温和、专业、克制的中文表达训练师。',
    '你的唯一任务：基于用户一段口述的语音转写文本与本地统计数据，生成一份能让他下次说得更好的分析报告。',
    '总原则：对事不对人——只评价表达，不评价人格；鼓励但不浮夸；每条建议都必须具体、可立刻执行。',
    '',
    '# 一、输入说明',
    '- 「转写」：用户口述的语音转文字，含口语碎词、口头禅、重复与语法瑕疵，这很正常，不要嘲笑。',
    '- 「统计」：本地引擎算好的数据（时长、字数、语速、填充词频率、直接性评分等），供你参考与交叉印证。',
    '- 统计只供参考：你的观察以转写原文为准；两者矛盾时在 stats_check 里点一句即可。',
    '- 本地已把口头禅标红并计数，但你要自行判断这些词是否承担了真实语义，不要机械照抄统计。',
    '',
    '# 二、输出格式（硬性要求）',
    '- 只输出一个 JSON 对象：不要 markdown 代码块、不要前后缀解释、不要任何 JSON 之外的文字。',
    '- 输出必须能被 JSON.parse 直接解析；字符串内禁止未转义的引号与换行。',
    '- 任何字段缺失时给空字符串或空数组，禁止 null。',
    '- 全部使用简体中文；专业术语可保留英文原文。',
    '',
    '# JSON 结构定义',
    '{',
    '  "score": 0-100 的整数，综合表达力评分，',
    '  "position": "16-30 字的一句话定位，概括他的表达风格",',
    '  "verdict": "60-120 字总评：先肯定一个真实优点，再指出最值得改进的一点",',
    '  "highlights": ["2-4 条亮点，每条 20-50 字，必须源于转写中的真实内容"],',
    '  "sentences": [',
    '    { "quote": "转写原句摘录(20字内)", "advice": "下次怎么说的示范(30字内)", "reason": "为什么这样改(40字内)" }',
    '  ],',
    '  "replacements": [',
    '    { "from": "转写中真实出现的模糊词", "to": "替换词1 / 替换词2", "why": "理由(20字内)" }',
    '  ],',
    '  "emotion": { "main": "主导情绪", "trend": "从开头到结尾的情绪走向", "note": "40 字内的情绪观察" },',
    '  "behavior": {',
    '    "filler": "填充词模式(40字内)",',
    '    "avoid": "冲突回避倾向(40字内)",',
    '    "hesitate": "犹豫模式(40字内)",',
    '    "direct": "直接性评价(40字内)",',
    '    "persuade": "说服力结构(40字内)"',
    '  },',
    '  "focus": ["2-3 条下次练习重点，每条 15-40 字，具体到动作"],',
    '  "stats_check": "对本地统计的补充解读(40字内)"',
    '}',
    '',
    '# 三、评分标准（0-100）',
    '- 90-100：观点清晰有结论，例子或比喻信手拈来，填充词极少，逻辑闭环。',
    '- 75-89：结构完整，偶有口头禅，观点基本明确，说服链条有小缺口。',
    '- 60-74：能说清事情，但主题易跑偏、结论弱、例子少，填充词可感知。',
    '- 40-59：信息散、重复多、立场模糊，听者难以记住重点。',
    '- 0-39：极度散乱或过短，未构成有效表达；低于 30 字直接给低分并建议先列提纲。',
    '- 评分权重：结构完整 30 分，观点明确 25 分，证据支撑 20 分，语言效率 15 分，感染力 10 分。',
    '',
    '# 四、逐句分析规则（sentences，挑 5-10 句）',
    '- 必选：开头第一句（定调）、结尾最后一句（收束）；再挑最长句、口头禅最密句、有金句潜质的句。',
    '- quote 必须是转写原文的连续片段（可截断，不得改写）。',
    '- advice 是「下次可以这样说」的正面示范句，不是批评的复述。',
    '- 好句与差句都要有：至少 1 条亮点句、至少 2 条改进句。',
    '- reason 说清「为什么这样改」，从听众视角出发。',
    '',
    '# 五、可替换词语规则（replacements）',
    '- 只列转写中真实出现的词，每条给 2 个替换选项。',
    '- 常见方向：想→渴望/期待/向往；很多→大量/海量/充裕；挺好→出色/令人满意；弄/搞→具体动词；东西/事情→具体名词。',
    '- 最多 10 条，优先高频与影响理解的词。',
    '- 若转写没有模糊词：给空数组，并在 verdict 里改为肯定他的用词具体。',
    '',
    '# 六、情绪分析规则（emotion）',
    '- 参考大连理工大学情感词汇本体的七大类：乐、好、怒、哀、惧、恶、惊。',
    '- main 用一个词概括主导情绪；trend 描述从开头到结尾的变化（如「由焦虑转向释然」）。',
    '- 只描述不诊断：不贴病理标签，不做心理判断。',
    '- 情绪词汇很少时：emotion.note 写「文本情绪中性，判断依据不足」。',
    '',
    '# 七、行为模式分析规则（behavior）',
    '- filler：他习惯用什么词补气口（然后/就是/那个…），出现在句首还是句中，有无规律。',
    '- avoid：是否用「算了/无所谓/都行」回避表态；在什么话题上回避。',
    '- hesitate：哪里像是在边想边说（嗯/怎么说呢/重复起头）。',
    '- direct：敢不敢直接给判断、提要求、表达不同意见。',
    '- persuade：是否呈现「观点→依据→例子→结论」的完整链；缺哪一环。',
    '',
    '# 八、下次练习重点（focus）',
    '- 每条都要具体到动作：如「说结论前先停一秒」「每个观点后跟一个例子」。',
    '- 不超过 3 条；与 verdict 指出的问题呼应，不另起炉灶。',
    '',
    '# 九、金句与比喻的识别',
    '- 金句：8-30 字、结构对称或有转折（不是…而是…/越…越…/真正的…）的句子 → 在 highlights 里点出。',
    '- 比喻：出现像/仿佛/如同/好比 → 视为亮点；比喻贴切与否要给出判断。',
    '- 金句捕捉到时给一句打磨建议，让它成为他的表达名片。',
    '',
    '# 十、特殊情况',
    '- 转写少于 50 字：如实给低分，highlights 可为空，focus 建议先列提纲再开口。',
    '- 中英混合：正常分析，quote 原样保留英文。',
    '- 通篇只有碎词无完整句：score 给 0-20，建议改用打字模式先梳理。',
    '- 统计与原文矛盾（如语速显示快但文本松散）：在 stats_check 指出，以原文为准。',
    '',
    '# 十一、红线（违反任何一条即不合格）',
    '- 不得编造转写中不存在的内容。',
    '- 不得对人格做评判（「你这个人」「你的性格」类表述禁止出现）。',
    '- 不得使用侮辱性、歧视性、冒犯性表述。',
    '- 不得给出医疗、心理诊断类结论或用药建议。',
    '- 不得输出 JSON 之外的任何文字。',
    '',
    '# 十二、语气示范',
    '- verdict 示例：「你的开头很有画面感，但结尾停在了事实层面——下次试着用一句『所以我认为…』把观点钉住。」',
    '- advice 示例：「把『我觉得可能还行吧』换成『我认为可行，理由有两条』。」',
    '- 禁止的语气：「太棒了！！」「你有惊人的天赋！」「你这个表达是完全失败的」。',
    '- 全文感叹号不超过 3 个；不使用「绝了」「无敌」类网络夸张语。',
    '',
    '# 十三、长度与密度',
    '- verdict 60-120 字；每条 highlight 20-50 字；sentences 5-10 条；replacements 最多 10 条。',
    '- 信息宁缺毋滥：没有把握的判断宁可不写。',
    '',
    '# 十四、最终检查（输出前自查）',
    '- 是纯 JSON 吗？能被 parse 吗？',
    '- score 与 verdict 一致吗？',
    '- 每条 quote 都在转写里吗？',
    '- 每条 advice 都具体到「下次怎么说」吗？',
    '- focus 是否具体到动作？',
    '- 有人格评判吗？（有则删）',
    '- 有编造内容吗？（有则删）',
    '- 语气克制吗？感叹号超标吗？',
    '- 亮点句与改进句都覆盖了吗？',
    '- 红线全部确认无误后，输出最终 JSON，结束。',
  ].join('\n'),

  // ==================== 状态 ====================
  _express99Rt: null,

  // ==================== 页面 ====================
  render_express99() {
    const v = document.getElementById('view-express99');
    if (!v) return;
    const rt = this._express99Rt = this._express99Rt || {
      recOn: false, sr: null, t0: 0, timerInt: 0, typing: false,
      sentences: [], interim: '', fb: null, lex: null,
      agreed: localStorage.getItem(this.EXPRESS99_OKKEY) === '1',
    };
    v.innerHTML = `
      <div class="ex99-stage" id="ex99Stage">
        <div class="ex99-top">
          <button class="ex99-gbtn" onclick="App.navBack()" title="返回">←</button>
          <div class="ex99-title">🎙️ 独行表达<small>把想说的话，先说给自己听</small></div>
          <button class="ex99-gbtn" onclick="App._express99Settings()" title="设置（含 AI 密钥配置）">⚙️</button>
        </div>
        <div class="ex99-hero">
          <button class="ex99-mic" id="ex99Mic" onclick="App._express99RecToggle()" title="开始 / 结束">🎤</button>
          <div class="ex99-timer" id="ex99Timer" style="display:none">00:00</div>
          <div class="ex99-status" id="ex99Status">点麦克风开口练习 · 口头禅会自动标红</div>
          <button class="ex99-type" id="ex99TypeBtn" onclick="App._express99TypeToggle()">⌨️ 打字模式</button>
        </div>
        <div class="ex99-main" id="ex99Main">
          <div class="ex99-caps" id="ex99Caps"></div>
          <div class="ex99-fbs" id="ex99Fbs"></div>
        </div>
        <div class="ex99-recs" id="ex99Recs"></div>
      </div>`;
    this._express99LexLoad().then(lex => { try { this._express99Rt.lex = lex; } catch (e) {} });
    this._express99PaintCaps();
    this._express99PaintFb();
    this._express99PaintRecs();
    this._express99BindSwipe();
    if (!rt.agreed) this._express99Disclaimer();
  },

  // ==================== 词典（IndexedDB 种子 · 大连理工 7 大类）====================
  _express99DB() {
    return new Promise((ok) => {
      try {
        const rq = indexedDB.open('one-xing-express99', 1);
        rq.onupgradeneeded = () => { try { rq.result.createObjectStore('lex', { keyPath: 'k' }); } catch (e) {} };
        rq.onsuccess = () => ok(rq.result);
        rq.onerror = () => ok(null);
      } catch (e) { ok(null); }
    });
  },
  async _express99LexLoad() {
    const db = await this._express99DB();
    if (!db) return this.EXPRESS99_DUT_LEX;
    return new Promise((ok) => {
      try {
        const rq = db.transaction('lex').objectStore('lex').get('dut');
        rq.onsuccess = () => {
          if (rq.result && rq.result.cats) return ok(rq.result.cats);
          try {
            const tx = db.transaction('lex', 'readwrite');
            tx.objectStore('lex').put({ k: 'dut', cats: this.EXPRESS99_DUT_LEX, at: Date.now() });
          } catch (e) {}
          ok(this.EXPRESS99_DUT_LEX);
        };
        rq.onerror = () => ok(this.EXPRESS99_DUT_LEX);
      } catch (e) { ok(this.EXPRESS99_DUT_LEX); }
    });
  },
  async _express99LexCount() {
    const cats = (this._express99Rt && this._express99Rt.lex) || this.EXPRESS99_DUT_LEX;
    let n = 0;
    Object.values(cats).forEach(s => { n += String(s).split(/[,\s，、]+/).filter(Boolean).length; });
    return n;
  },

  // ==================== 录音（Web Speech 实时转写）====================
  _express99RecToggle() {
    const rt = this._express99Rt;
    if (!rt) return;
    try { this._sfx99('tap'); } catch (e) {}
    if (rt.recOn) this._express99RecStop();
    else this._express99RecStart();
  },

  _express99RecStart() {
    const rt = this._express99Rt;
    // v12.9.49 语音适配层 / v12.9.61 起：客户端走 Vosk 离线语音识别（95 层统一适配），网页版回落浏览器 SpeechRecognition
    const sr = this._sr99Create ? this._sr99Create() : null;
    if (!sr) {
      this._flash(!!window.__PHONE_EDITION__ ? '语音识别启动失败——再点一次试试，或切 ⌨️ 打字模式' : '当前浏览器不支持语音识别——试试 ⌨️ 打字模式，分析一样全');
      this._express99TypeToggle();
      return;
    }
    try {
      rt.sr = sr;
      rt.sr.lang = 'zh-CN';                       // 中英混合识别
      rt.sr.continuous = true;
      rt.sr.interimResults = true;
      rt.sr.onresult = (ev) => this._express99OnResult(ev);
      rt.sr.onend = () => { if (rt.recOn) { try { rt.sr.start(); } catch (e) {} } };   // 长录音自动续
      rt.sr.onerror = (e) => {
        if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) {
          rt.recOn = false;
          this._express99PaintHero();
          this._flash(this._mic99Tip ? this._mic99Tip() : '🎤 麦克风权限被拒');
        }
      };
      rt.sr.start();
    } catch (e) {
      this._flash('语音识别启动失败——试试 ⌨️ 打字模式');
      return;
    }
    rt.recOn = true;
    rt.typing = false;
    rt.t0 = Date.now();
    rt.sentences = [];
    rt.interim = '';
    this._express99PaintHero();
    this._express99PaintCaps();
    this._express99PaintFb();
    // 计时器（mm:ss）
    rt.timerInt = setInterval(() => {
      const el = document.getElementById('ex99Timer');
      if (!el || !rt.t0) return;
      const s = Math.max(0, Math.floor((Date.now() - rt.t0) / 1000));
      el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 500);
  },

  _express99RecStop(quiet) {
    const rt = this._express99Rt;
    if (!rt) return;
    rt.recOn = false;
    if (rt.timerInt) { clearInterval(rt.timerInt); rt.timerInt = 0; }
    try { rt.sr && rt.sr.stop(); } catch (e) {}
    this._express99PaintHero();
    const text = rt.sentences.map(s => s.text).join('');
    if (text.replace(/\s/g, '').length < 10) {
      if (!quiet) this._flash('说得太短——至少说两句再结束，报告才有意义');
      return;
    }
    this._express99Report(quiet);
  },

  _express99OnResult(ev) {
    const rt = this._express99Rt;
    if (!rt) return;
    let interim = '';
    try {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = String(r[0] && r[0].transcript || '').trim();
        if (r.isFinal) { if (t) rt.sentences.push({ t: Date.now(), text: t }); }
        else interim += t;
      }
    } catch (e) {}
    rt.interim = interim;
    this._express99PaintCaps();
    clearTimeout(this.__ex99AnaT);
    this.__ex99AnaT = setTimeout(() => this._express99Analyze(), 700);
  },

  _express99PaintHero() {
    const rt = this._express99Rt;
    const mic = document.getElementById('ex99Mic');
    const st = document.getElementById('ex99Status');
    const tm = document.getElementById('ex99Timer');
    if (!rt || !mic || !st) return;
    mic.classList.toggle('on', !!rt.recOn);
    if (rt.recOn) {
      st.textContent = '正在聆听…说完再点一次，自动生成报告';
      if (tm) { tm.style.display = ''; tm.classList.add('on'); }
    } else {
      st.textContent = '点麦克风开口练习 · 口头禅会自动标红';
      if (tm) { tm.style.display = 'none'; tm.classList.remove('on'); }
    }
  },

  // ==================== 打字模式（不支持语音识别的浏览器 / 想静静写）====================
  _express99TypeToggle() {
    const rt = this._express99Rt;
    if (!rt) return;
    if (rt.recOn) this._express99RecStop(true);
    try { this._sfx99('popup'); } catch (e) {}
    this._modal('⌨️ 打字模式 · 同一套分析管线', `
      <div style="font-size:12px;color:#64748b;line-height:1.8;margin-bottom:8px">把想说的话写下来（语音识别不可用时的平替；时长按 240 字/分钟折算）。写完点「开始分析」，一样生成完整报告。</div>
      <textarea id="ex99TypeIn" class="input" style="width:100%;min-height:180px;font-size:13px;line-height:1.8;box-sizing:border-box" placeholder="把刚才想说的、或者平时不敢说的，写在这里……"></textarea>`,
      [
        { label: '开始分析', primary: true, onClick: () => {
            const ta = document.getElementById('ex99TypeIn');
            const text = String(ta ? ta.value : '').trim();
            if (text.replace(/\s/g, '').length < 10) { this._flash('再写两句——太短生成不了报告'); return false; }
            const parts = text.split(/[。！？!?\n]+/).map(s => s.trim()).filter(Boolean);
            rt.sentences = parts.map(p => ({ t: Date.now(), text: p }));
            rt.interim = '';
            rt.typing = true;
            this._express99PaintCaps();
            this._express99Analyze();
            this._express99Report();
            return true;
          } },
        { label: '取消' },
      ]);
  },

  // ==================== 字幕区（口头禅标红）====================
  _express99Hl(text) {
    let out = this.esc(text);
    for (const f of this.EXPRESS99_FILLERS) {
      try {
        out = out.replace(new RegExp('(' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'g'), '<b class="ex99-fill">$1</b>');
      } catch (e) {}
    }
    return out;
  },

  _express99PaintCaps() {
    const rt = this._express99Rt;
    const box = document.getElementById('ex99Caps');
    if (!rt || !box) return;
    if (!rt.sentences.length && !rt.interim) {
      box.innerHTML = `<div class="ex99-cap-t">📝 实时字幕<small>口头禅自动标红</small></div>
        <div class="ex99-empty">开口后字幕会实时出现在这里<br><small>「然后 / 就是 / 那个…」会自动标红，提醒你它们出现了多少次</small></div>`;
      return;
    }
    box.innerHTML = `<div class="ex99-cap-t">📝 实时字幕<small>口头禅自动标红</small></div>
      <div class="ex99-caps-list">${rt.sentences.map(s => `<p class="ex99-sent">${this._express99Hl(s.text)}</p>`).join('')}</div>
      ${rt.interim ? `<p class="ex99-interim">${this._express99Hl(rt.interim)}<i>▍</i></p>` : ''}`;
    try { box.scrollTop = box.scrollHeight; } catch (e) {}
  },

  // ==================== 实时分析（词精度 + 11 规则）====================
  _express99Analyze() {
    const rt = this._express99Rt;
    if (!rt) return;
    const text = rt.sentences.map(s => s.text).join('');
    if (!text) return;
    const clean = text.replace(/\s/g, '');
    // —— 词语精确度 ——
    const words = [];
    for (const [w, to] of Object.entries(this.EXPRESS99_VAGUE)) {
      const n = clean.split(w).length - 1;
      if (n > 0) words.push({ w, to, n });
    }
    const fillCnt = {};
    for (const f of this.EXPRESS99_FILLERS) {
      const n = clean.split(f).length - 1;
      if (n > 0) fillCnt[f] = n;
    }
    const topFillers = Object.entries(fillCnt).sort((a, b) => b[1] - a[1]).slice(0, 5);
    // —— 11 条规则 ——
    const rules = [];
    const push = (k, detail, extra) => {
      const def = this.EXPRESS99_RULES.find(r => r.k === k);
      if (def) rules.push(Object.assign({ k, def, detail }, extra || {}));
    };
    // 1 填充词超频
    const fillChars = Object.entries(fillCnt).reduce((a, [w, n]) => a + w.length * n, 0);
    if (clean.length > 40 && fillChars / clean.length > 0.08) {
      push('filler', `填充词密度 ${Math.round(fillChars / clean.length * 100)}%——${topFillers.slice(0, 3).map(x => '「' + x[0] + '」×' + x[1]).join(' ')}；试着用停顿代替它们`);
    }
    // 2 重复表达（2-4 字短语出现 ≥3 次）
    let repHit = null;
    const seen = {};
    for (let n = 4; n >= 2 && !repHit; n--) {
      for (let i = 0; i + n <= clean.length; i++) {
        const g = clean.slice(i, i + n);
        if (/[，。！？、,.!?]/.test(g)) continue;
        seen[g] = (seen[g] || 0) + 1;
      }
    }
    for (const [g, n] of Object.entries(seen)) { if (n >= 3 && g.length >= 2 && !/^[嗯啊呃嘛]+$/.test(g)) { if (!repHit || n > repHit.n) repHit = { g, n }; } }
    if (repHit) push('repeat', `「${repHit.g}」出现了 ${repHit.n} 次——合并成一次完整表述会更有力`);
    // 3 结论缺失
    if (clean.length > 60 && !/(所以|总之|因此|我认为|综上|我的结论|我的看法|说到底|归根结底)/.test(clean)) {
      push('noconcl', '说了不少事实，但缺一句「所以我认为…」——结尾把观点钉住');
    }
    // 4 缺乏例子
    if (clean.length > 80 && !/(比如|例如|举个例子|打个比方|就像|好比|拿.{1,6}来说)/.test(clean)) {
      push('noexample', '观点后没有例子支撑——每个观点跟一个「比如…」，说服力翻倍');
    }
    // 5 前后矛盾（肯定词与其否定形式同时出现）
    const contraPairs = [['喜欢', '不喜欢'], ['想', '不想'], ['应该', '不应该'], ['打算', '不打算'], ['觉得', '不觉得'], ['同意', '不同意'], ['支持', '不支持'], ['可以', '不可以'], ['需要', '不需要'], ['重要', '不重要']];
    for (const [a, b] of contraPairs) {
      if (clean.includes(a) && clean.includes(b)) { push('contra', `「${a}」与「${b}」都出现了——先想清楚立场，再开口`); break; }
    }
    // 6 主题跑偏（前 1/3 的关键词在后半段消失）
    if (clean.length > 120 && rt.sentences.length >= 4) {
      const head = rt.sentences.slice(0, Math.max(1, Math.floor(rt.sentences.length / 3))).map(s => s.text).join('');
      const tail = rt.sentences.slice(-Math.max(2, Math.floor(rt.sentences.length / 2))).map(s => s.text).join('');
      const grams = {};
      for (let i = 0; i + 2 <= head.length; i++) { const g = head.slice(i, i + 2); if (!/[，。！？、,.!?]/.test(g)) grams[g] = 1; }
      const overlap = Object.keys(grams).filter(g => tail.includes(g)).length;
      if (overlap < 3) push('drift', '后半段和开头的话题重叠很少——记得把主线拉回来');
    }
    // 7 立场模糊
    const hedgeN = this.EXPRESS99_HEDGE.reduce((a, w) => a + (clean.split(w).length - 1), 0);
    if (hedgeN >= 3) push('vague', `「可能/也许/看情况」类出现 ${hedgeN} 次——试着给一次明确判断`);
    // 8 时间感知
    if (/(以后|将来|未来|计划|打算|总有一天)/.test(clean) && !/(今年|明年|下个月|下周|明天|今天|\d+年|\d+月|\d+天|\d+小时|周内|月底|年前)/.test(clean)) {
      push('timeline', '提到了计划但时间点模糊——加上「什么时候做、多久完成」');
    }
    // 9 语速与密度
    const dens = 1 - fillChars / Math.max(1, clean.length);
    if (dens < 0.55 && clean.length > 60) push('dense', `实词密度约 ${Math.round(dens * 100)}%——放慢语速、减少碎词，同样时长能装下更多内容`);
    // 10 比喻与举例（亮点）
    const mMatch = clean.match(/(就像|仿佛|如同|好比|宛如|像一[个只条颗团片])/);
    if (mMatch) push('metaphor', `用了比喻（${mMatch[0]}…）——画面感强，继续保持`, { good: true });
    // 11 金句捕捉（亮点）
    const golden = rt.sentences.map(s => s.text).find(t => {
      const L = t.replace(/\s/g, '').length;
      return L >= 8 && L <= 30 && (/(不是|而是)|越.{1,6}越|真正的|所谓|其实.{2,10}是/.test(t));
    });
    if (golden) push('golden', `「${golden.slice(0, 24)}${golden.length > 24 ? '…' : ''}」有金句潜质——打磨成你的表达名片`, { good: true });
    // —— 情绪捕捉（DUT 7 大类）——
    const emo = this._express99Emotions(clean);
    rt.fb = { words, topFillers, rules, emo };
    this._express99PaintFb();
  },

  _express99Emotions(clean) {
    const cats = (this._express99Rt && this._express99Rt.lex) || this.EXPRESS99_DUT_LEX;
    const out = {};
    let total = 0;
    for (const [k, wordsStr] of Object.entries(cats)) {
      let n = 0;
      const ws = String(wordsStr).split(/[,\s，、]+/).filter(Boolean);
      for (const w of ws) { if (w.length > 1 && clean.includes(w)) n++; }
      if (n) { out[k] = n; total += n; }
    }
    const sorted = Object.entries(out).sort((a, b) => b[1] - a[1]);
    return { hits: sorted.slice(0, 3), total };
  },

  _express99PaintFb() {
    const rt = this._express99Rt;
    const box = document.getElementById('ex99Fbs');
    if (!rt || !box) return;
    if (!rt.fb) {
      box.innerHTML = `
        <div class="ex99-board"><div class="ex99-bt amber">🎯 词语精确度<small>大工情感词汇库 · 7 大类</small></div>
          <div class="ex99-empty">模糊词与口头禅的替换建议会实时出现在这里</div></div>
        <div class="ex99-board"><div class="ex99-bt">🚦 表达问题检测<small>11 条规则实时扫描</small></div>
          <div class="ex99-empty">重复 / 结论缺失 / 缺例子 / 金句捕捉…<br><small>说出口的每一句都在被温柔地检阅</small></div></div>`;
      return;
    }
    const fb = rt.fb;
    const wordHtml = fb.words.length
      ? fb.words.map(x => `<button class="ex99-fi amber" onclick="App._express99FiDetail('w','${this.esc(x.w)}')"><b>「${this.esc(x.w)}」×${x.n}</b><span>→ ${this.esc(x.to)}</span></button>`).join('')
      : '<div class="ex99-empty small">暂无模糊词——用词挺具体，保持</div>';
    const fillHtml = fb.topFillers.length
      ? `<div class="ex99-fillrow">${fb.topFillers.map(x => `<i>「${this.esc(x[0])}」×${x[1]}</i>`).join('')}</div>` : '';
    const rulesHtml = fb.rules.length
      ? fb.rules.map((r, i) => `<button class="ex99-fi ${r.def.tone}" onclick="App._express99FiDetail('r',${i})"><b>${r.def.ico} ${r.def.n}</b><span>${this.esc(r.detail)}</span></button>`).join('')
      : '<div class="ex99-empty small">✅ 11 条规则暂无提醒——继续说下去</div>';
    const emoHtml = fb.emo && fb.emo.total
      ? `<div class="ex99-emochips">${fb.emo.hits.map(([k, n]) => `<i class="emo-${k}">${k} ×${n}</i>`).join('')}</div>` : '';
    box.innerHTML = `
      <div class="ex99-board">
        <div class="ex99-bt amber">🎯 词语精确度<small>大工情感词汇库 · 7 大类</small></div>
        ${wordHtml}${fillHtml}${emoHtml}
      </div>
      <div class="ex99-board">
        <div class="ex99-bt">🚦 表达问题检测<small>11 条规则实时扫描</small></div>
        ${rulesHtml}
      </div>`;
  },

  _express99FiDetail(kind, key) {
    const rt = this._express99Rt;
    if (!rt || !rt.fb) return;
    try { this._sfx99('popup'); } catch (e) {}
    let title = '反馈详情', body = '';
    if (kind === 'w') {
      const x = rt.fb.words.find(w => w.w === key);
      if (!x) return;
      title = '🎯 词语精确度';
      body = `<div class="ex99-dtl"><p><b>「${this.esc(x.w)}」</b>出现了 ${x.n} 次。</p>
        <p>更精确的表达：<b class="ex99-rep">${this.esc(x.to)}</b></p>
        <p class="tip">精确的词让听众一下就看见你要说的画面——这是表达里最划算的升级。</p></div>`;
    } else {
      const r = rt.fb.rules[key];
      if (!r) return;
      title = r.def.ico + ' ' + r.def.n;
      const toneMap = { warn: '提醒', good: '亮点', info: '建议' };
      body = `<div class="ex99-dtl"><p>${this.esc(r.detail)}</p>
        <p class="tip">${toneMap[r.def.tone] || '反馈'}来自「独行表达」11 条规则引擎的实时扫描——它只看表达方式，不评价你这个人。</p></div>`;
    }
    this._modal(title, body, [{ label: '继续', primary: true }]);
  },

  // ==================== 统计（本地报告数据）====================
  _express99Stats(text, durMs) {
    const clean = String(text || '').replace(/\s/g, '');
    const chars = clean.length;
    const mins = Math.max(0.2, durMs / 60000);
    const cnt = (w) => clean.split(w).length - 1;
    const fillCnt = {};
    let fillChars = 0;
    for (const f of this.EXPRESS99_FILLERS) { const n = cnt(f); if (n) { fillCnt[f] = n; fillChars += f.length * n; } }
    const hesitN = this.EXPRESS99_HESIT.reduce((a, w) => a + cnt(w), 0);
    const avoidN = this.EXPRESS99_AVOID.reduce((a, w) => a + cnt(w), 0);
    const hedgeN = this.EXPRESS99_HEDGE.reduce((a, w) => a + cnt(w), 0);
    const topFillers = Object.entries(fillCnt).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const density = chars ? Math.max(0, Math.min(1, (chars - fillChars - hesitN * 2) / chars)) : 0;
    const direct = Math.max(0, Math.min(100, Math.round(100 - hedgeN * 6 - avoidN * 8 - (density < 0.5 ? 8 : 0) + (/(我认为|我建议|我的结论|一定要|必须|明确)/.test(clean) ? 6 : 0))));
    const emo = this._express99Emotions(clean);
    return {
      chars, durMs,
      speed: Math.round(chars / mins),                    // 字/分钟
      density: +density.toFixed(2),                       // 表达密度（实词占比）
      fillN: Object.values(fillCnt).reduce((a, b) => a + b, 0),
      fillPct: chars ? Math.round(fillChars / chars * 100) : 0,
      hesitN, hesitPct: chars ? Math.round(hesitN / Math.max(1, Math.round(chars / 2.2)) * 100) : 0,
      avoidN, hedgeN, direct,
      topFillers, emotions: emo,
    };
  },

  // ==================== 报告（本地 + 阿福 AI 直连）====================
  _express99Recs() { try { return JSON.parse(localStorage.getItem(this.EXPRESS99_RKEY) || '[]'); } catch (e) { return []; } },
  _express99RecsSave(list) { try { localStorage.setItem(this.EXPRESS99_RKEY, JSON.stringify(list.slice(0, 50))); } catch (e) {} },

  async _express99Report(quiet) {
    const rt = this._express99Rt;
    if (!rt) return;
    const text = rt.sentences.map(s => s.text).join('');
    const durMs = rt.typing ? Math.round(text.replace(/\s/g, '').length / 4 * 1000) : (rt.t0 ? Date.now() - rt.t0 : 60000);
    const rec = { id: 'e' + Date.now(), at: Date.now(), durMs, text, stats: this._express99Stats(text, durMs), ai: null };
    const list = this._express99Recs();
    list.unshift(rec);
    this._express99RecsSave(list);
    rt.lastRec = rec;
    this._express99PaintRecs();
    if (!quiet) {
      const st = document.getElementById('ex99Status');
      if (st) st.textContent = '🤖 正在生成分析报告…';
    }
    const ai = await this._express99AIReport(rec);
    if (ai) {
      rec.ai = ai;
      this._express99RecsSave(this._express99Recs().map(r => r.id === rec.id ? rec : r));
      this._express99PaintRecs();
    }
    if (!quiet) {
      const st2 = document.getElementById('ex99Status');
      if (st2) st2.textContent = ai ? '✅ 报告已生成' : '✅ 本地报告已生成（AI 未配置——⚙️ 里可开启完整版）';
      this._express99ReportShow(rec);
    }
  },

  // 阿福 AI 直连（与阿福聊天同一套配置：DeepSeek / 智谱 / 自定义 OpenAI 兼容 · Worker 代理）
  async _express99AIReport(rec) {
    const st = this._afuAIState ? this._afuAIState() : { ok: false };
    if (!st.ok) return null;
    const cfg = st.cfg;
    const isWorker = cfg.mode === 'worker';
    const headers = { 'Content-Type': 'application/json' };
    if (!isWorker) headers['Authorization'] = 'Bearer ' + cfg.key;
    const url = isWorker ? this._afuAIEndpoint(cfg) : cfg.base.replace(/\/+$/, '') + '/chat/completions';
    const user = '【转写】\n' + String(rec.text || '').slice(0, 5000) + '\n\n【本地统计】\n' + JSON.stringify(rec.stats);
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, 60000);
      const res = await fetch(url, {
        method: 'POST', headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          model: isWorker ? 'glm-4-flash' : (cfg.model || 'deepseek-chat'),
          messages: [{ role: 'system', content: this.EXPRESS99_PROMPT }, { role: 'user', content: user }],
          temperature: 0.4, max_tokens: 2600,
        }),
      });
      clearTimeout(to);
      const j = await res.json().catch(() => ({}));
      const reply = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
      const m = reply.match(/\{[\s\S]*\}/);
      if (!m) return null;
      const ai = JSON.parse(m[0]);
      return (ai && typeof ai === 'object') ? ai : null;
    } catch (e) { return null; }
  },

  // 本地降级报告（AI 未配置时：规则引擎 + 统计拼装）
  _express99LocalReport(rec) {
    const s = rec.stats || {};
    const rt = this._express99Rt;
    const fillTop = (s.topFillers || []).map(x => '「' + x[0] + '」×' + x[1]).join(' ');
    const direct = s.direct == null ? 70 : s.direct;
    const score = Math.max(20, Math.min(95, Math.round(
      (s.density || 0.5) * 40 + Math.min(30, (s.chars || 0) / 8) + (direct / 100) * 30 - (s.fillPct || 0) / 2
    )));
    return {
      score,
      position: '口语真诚、边想边说的表达者',
      verdict: `这次说了 ${s.chars || 0} 字、约 ${Math.round((s.durMs || 0) / 60000)} 分钟${fillTop ? '，最常补气口的词是 ' + fillTop : ''}。内容是真实的，接下来练习把「想到哪说到哪」升级为「一句观点 + 一个例子」——报告里的重点已经帮你列好了。`,
      highlights: (rt && rt.fb && rt.fb.rules || []).filter(r => r.def.tone === 'good').map(r => r.detail).slice(0, 3),
      sentences: [],
      replacements: (rt && rt.fb && rt.fb.words || []).slice(0, 8).map(x => ({ from: x.w, to: x.to, why: '更精确的画面感' })),
      emotion: { main: (s.emotions && s.emotions.hits[0]) ? ('以「' + s.emotions.hits[0][0] + '」为主') : '中性', trend: '（本地引擎仅统计词频，情绪走向请看 AI 报告）', note: '' },
      behavior: {
        filler: fillTop || '无明显填充词模式',
        avoid: (s.avoidN || 0) > 0 ? `出现 ${s.avoidN} 次回避式表述（算了/无所谓…）` : '未检测到明显回避表述',
        hesitate: (s.hesitN || 0) > 0 ? `犹豫词 ${s.hesitN} 次，多在换话题处` : '无明显犹豫',
        direct: `直接性 ${direct}/100——${direct > 70 ? '敢给判断' : '判断偏保守，试着把「可能」换成明确表态'}`,
        persuade: '（说服力结构分析需 AI 报告）',
      },
      focus: [
        '每个观点后跟一个「比如…」',
        '说结论前停一秒，用「所以我认为…」收束',
        (s.fillPct || 0) > 8 ? '用停顿代替「' + ((s.topFillers || [])[0] || ['然后'])[0] + '」' : '保持当前语速与节奏',
      ],
      stats_check: '',
    };
  },

  // 报告浮层（分模块折叠 · 导出）
  _express99ReportShow(rec) {
    if (!rec) return;
    try { this._sfx99('success'); } catch (e) {}
    try { const old = document.getElementById('ex99Report'); if (old) old.remove(); } catch (e) {}
    const ai = rec.ai || this._express99LocalReport(rec);
    const s = rec.stats || {};
    const dt = new Date(rec.at);
    const sec = (t, inner, open) => `<div class="ex99-rsec${open ? '' : ' fold'}"><button class="ex99-rs-t" onclick="this.parentNode.classList.toggle('fold')">${t}<i>▾</i></button><div class="ex99-rs-b">${inner}</div></div>`;
    const EMOC = { '乐': '#34d399', '好': '#60a5fa', '怒': '#f87171', '哀': '#a78bfa', '惧': '#fbbf24', '恶': '#94a3b8', '惊': '#f472b6' };
    const ov = document.createElement('div');
    ov.id = 'ex99Report';
    ov.className = 'ex99-report';
    ov.innerHTML = `
      <div class="ex99-rp-head">
        <button class="ex99-gbtn" onclick="try{document.getElementById('ex99Report').remove()}catch(e){}">✕</button>
        <div class="ex99-rp-t">📄 表达分析报告<small>${dt.toLocaleDateString()} ${dt.toTimeString().slice(0, 5)} · ${rec.ai ? 'AI 完整版' : '本地规则版'}</small></div>
        <div class="ex99-score">${ai.score == null ? '—' : ai.score}<small>分</small></div>
      </div>
      <div class="ex99-rp-body">
        <div class="ex99-pos">${this.esc(ai.position || '')}</div>
        ${sec('🧭 总评', `<p class="ex99-verdict">${this.esc(ai.verdict || '')}</p>`, true)}
        ${ai.highlights && ai.highlights.length ? sec('✨ 亮点', ai.highlights.map(h => `<div class="ex99-li good">· ${this.esc(h)}</div>`).join(''), true) : ''}
        ${ai.sentences && ai.sentences.length ? sec('📝 逐句分析', ai.sentences.map(x => `
          <div class="ex99-snt"><span class="q">“${this.esc(x.quote || '')}”</span>
          <span class="a">→ ${this.esc(x.advice || '')}</span><span class="r">${this.esc(x.reason || '')}</span></div>`).join('')) : ''}
        ${ai.replacements && ai.replacements.length ? sec('🔁 可替换词语', `
          <div class="ex99-rtb"><div class="ex99-rth"><span>原词</span><span>替换</span><span>理由</span></div>
          ${ai.replacements.map(x => `<div class="ex99-rtr"><span>「${this.esc(x.from || '')}」</span><span>${this.esc(x.to || '')}</span><span>${this.esc(x.why || '')}</span></div>`).join('')}</div>`) : ''}
        ${sec('🎨 情绪分析', `
          <div class="ex99-emochips big">${(s.emotions && s.emotions.hits || []).map(([k, n]) => `<i style="background:${EMOC[k] || '#64748b'}22;color:${EMOC[k] || '#94a3b8'};border:1px solid ${(EMOC[k] || '#64748b')}55">${k} ×${n}</i>`).join('') || '<i>未检测到明显情绪词</i>'}</div>
          <p class="ex99-verdict" style="margin-top:8px">${this.esc((ai.emotion && (ai.emotion.main ? ('主导：' + ai.emotion.main + ' · ' + ai.emotion.trend) : ai.emotion.note)) || '情绪中性')}</p>`)}
        ${ai.behavior ? sec('🧠 行为模式分析', `
          <div class="ex99-bhv">
            <div><b>填充词模式</b><span>${this.esc(ai.behavior.filler || '—')}</span></div>
            <div><b>冲突回避</b><span>${this.esc(ai.behavior.avoid || '—')}</span></div>
            <div><b>犹豫模式</b><span>${this.esc(ai.behavior.hesitate || '—')}</span></div>
            <div><b>直接性</b><span>${this.esc(ai.behavior.direct || '—')}</span></div>
            <div><b>说服力结构</b><span>${this.esc(ai.behavior.persuade || '—')}</span></div>
          </div>`) : ''}
        ${sec('📊 数据统计', `
          <div class="ex99-stat9">
            <div><b>${Math.round((s.durMs || 0) / 1000)}s</b><span>总时长</span></div>
            <div><b>${s.chars || 0}</b><span>总字数</span></div>
            <div><b>${s.speed || 0}</b><span>语速(字/分)</span></div>
            <div><b>${Math.round((s.density || 0) * 100)}%</b><span>表达密度</span></div>
            <div><b>${s.fillPct || 0}%</b><span>填充词频率</span></div>
            <div><b>${s.hesitPct || 0}%</b><span>犹豫词占比</span></div>
            <div><b>${s.direct == null ? '—' : s.direct}</b><span>直接性评分</span></div>
          </div>`)}
        ${ai.focus && ai.focus.length ? sec('🎯 下次练习重点', ai.focus.map(f => `<div class="ex99-li">· ${this.esc(f)}</div>`).join(''), true) : ''}
        ${!rec.ai ? `<div class="ex99-aiup"><button class="ex99-big" onclick="App._express99Regen('${rec.id}')">🤖 用 AI 重新分析（需在 ⚙️ 配置密钥 · 与阿福共用）</button></div>` : ''}
        <div class="ex99-exports">
          <button class="ex99-big" onclick="App._express99Copy('${rec.id}')">📋 复制全文</button>
          <button class="ex99-big" onclick="App._express99Download('${rec.id}')">⬇️ 导出 Markdown</button>
          <button class="ex99-big" onclick="App._express99Share('${rec.id}')">🔗 分享</button>
        </div>
      </div>`;
    (document.body || document.documentElement).appendChild(ov);
  },

  _express99Regen(id) {
    const rec = this._express99Recs().find(r => r.id === id);
    if (!rec) return;
    const st = this._afuAIState ? this._afuAIState() : { ok: false };
    if (!st.ok) { this._flash('先点右上 ⚙️ 配置 AI（与阿福聊天共用一套密钥）'); this._express99Settings(); return; }
    this._flash('🤖 AI 分析中…');
    this._express99AIReport(rec).then(ai => {
      if (!ai) { this._flash('AI 分析失败——稍后再试，本地报告仍然保存着'); return; }
      rec.ai = ai;
      this._express99RecsSave(this._express99Recs().map(r => r.id === rec.id ? rec : r));
      this._express99ReportShow(rec);
    });
  },

  // ==================== 导出（复制 / Markdown / 分享）====================
  _express99Md(rec) {
    const ai = rec.ai || this._express99LocalReport(rec);
    const s = rec.stats || {};
    const L = [];
    L.push('# 独行表达 · 分析报告', '', `> ${new Date(rec.at).toLocaleString()} · ${rec.ai ? 'AI 完整版' : '本地规则版'} · 综合评分 **${ai.score == null ? '—' : ai.score}**`, '', `**定位**：${ai.position || '—'}`, '');
    L.push('## 总评', '', ai.verdict || '—', '');
    if (ai.highlights && ai.highlights.length) { L.push('## 亮点', ''); ai.highlights.forEach(h => L.push('- ' + h)); L.push(''); }
    if (ai.sentences && ai.sentences.length) {
      L.push('## 逐句分析', '');
      ai.sentences.forEach((x, i) => L.push(`${i + 1}. “${x.quote || ''}”`, `   - 建议：${x.advice || ''}`, `   - 原因：${x.reason || ''}`));
      L.push('');
    }
    if (ai.replacements && ai.replacements.length) {
      L.push('## 可替换词语', '', '| 原词 | 替换 | 理由 |', '| --- | --- | --- |');
      ai.replacements.forEach(x => L.push(`| ${x.from || ''} | ${x.to || ''} | ${x.why || ''} |`));
      L.push('');
    }
    L.push('## 情绪分析', '', `- 主导：${(ai.emotion && ai.emotion.main) || '中性'}`, `- 走向：${(ai.emotion && ai.emotion.trend) || '—'}`, `- 观察：${(ai.emotion && ai.emotion.note) || '—'}`, '');
    if (ai.behavior) {
      L.push('## 行为模式分析', '', `- 填充词模式：${ai.behavior.filler || '—'}`, `- 冲突回避：${ai.behavior.avoid || '—'}`, `- 犹豫模式：${ai.behavior.hesitate || '—'}`, `- 直接性：${ai.behavior.direct || '—'}`, `- 说服力结构：${ai.behavior.persuade || '—'}`, '');
    }
    L.push('## 数据统计', '',
      `- 总时长：${Math.round((s.durMs || 0) / 1000)} 秒`, `- 总字数：${s.chars || 0}`, `- 语速：${s.speed || 0} 字/分钟`,
      `- 表达密度：${Math.round((s.density || 0) * 100)}%`, `- 填充词频率：${s.fillPct || 0}%`, `- 犹豫词占比：${s.hesitPct || 0}%`,
      `- 直接性评分：${s.direct == null ? '—' : s.direct}`, '');
    if (ai.focus && ai.focus.length) { L.push('## 下次练习重点', ''); ai.focus.forEach(f => L.push('- ' + f)); L.push(''); }
    L.push('---', '', '由「一人行 · 独行表达」生成 —— 一个人，也要把想说的话说得漂亮。');
    return L.join('\n');
  },
  _express99Copy(id) {
    const rec = this._express99Recs().find(r => r.id === id);
    if (!rec) return;
    const md = this._express99Md(rec);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(md).then(() => this._flash('📋 报告全文已复制'), () => this._flash(md.slice(0, 120) + '…'));
        return;
      }
    } catch (e) {}
    this._flash(md.slice(0, 120) + '…');
  },
  _express99Download(id) {
    const rec = this._express99Recs().find(r => r.id === id);
    if (!rec) return;
    try {
      const d = new Date(rec.at);
      const name = '独行表达-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '.md';
      const url = URL.createObjectURL(new Blob([this._express99Md(rec)], { type: 'text/markdown;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = name;
      (document.body || document.documentElement).appendChild(a);
      a.click();
      setTimeout(() => { try { a.remove(); URL.revokeObjectURL(url); } catch (e) {} }, 800);
      this._flash('⬇️ 已导出：' + name);
    } catch (e) { this._flash('导出失败：' + (e.message || '')); }
  },
  _express99Share(id) {
    const rec = this._express99Recs().find(r => r.id === id);
    if (!rec) return;
    const md = this._express99Md(rec);
    if (navigator.share) { navigator.share({ title: '独行表达 · 分析报告', text: md.slice(0, 1200) }).catch(() => {}); return; }
    this._express99Copy(id);
  },

  // ==================== 练习记录 ====================
  _express99PaintRecs() {
    const box = document.getElementById('ex99Recs');
    if (!box) return;
    const recs = this._express99Recs();
    box.innerHTML = !recs.length ? '' : `
      <div class="ex99-sec-t">🕘 最近练习（${recs.length}）</div>` + recs.slice(0, 8).map(r => {
        const sc = r.ai ? (r.ai.score == null ? '—' : r.ai.score) : '本地';
        const d = new Date(r.at);
        return `<button class="ex99-rec" onclick="App._express99ReportShow2('${r.id}')">
          <b>${d.toLocaleDateString()} ${d.toTimeString().slice(0, 5)}</b>
          <span>${(r.stats && r.stats.chars) || 0} 字 · ${Math.round((r.durMs || 0) / 1000)}s · ${r.ai ? 'AI' : '本地'}报告</span>
          <i>${sc}</i></button>`;
      }).join('');
  },
  _express99ReportShow2(id) {
    const rec = this._express99Recs().find(r => r.id === id);
    if (rec) this._express99ReportShow(rec);
  },

  // ==================== 手势（左右滑动切换字幕/反馈焦点）====================
  _express99BindSwipe() {
    const main = document.getElementById('ex99Main');
    if (!main || main.dataset.ex99swipe) return;
    main.dataset.ex99swipe = '1';
    let sx = 0;
    main.addEventListener('touchstart', (e) => { sx = (e.touches[0] || {}).clientX || 0; }, { passive: true });
    main.addEventListener('touchend', (e) => {
      const dx = ((e.changedTouches[0] || {}).clientX || 0) - sx;
      if (Math.abs(dx) > 60) main.classList.toggle('focus-fb');
    }, { passive: true });
  },

  // ==================== 设置 / 合规 =====================
  _express99Settings() {
    const rt = this._express99Rt;
    if (!rt) return;
    try { this._sfx99('tap'); } catch (e) {}
    const st = this._afuAIState ? this._afuAIState() : { ok: false };
    this._modal('⚙️ 独行表达 · 设置', `
      <div class="ex99-setbox">
        <div class="ex99-setrow">
          <div><b>🤖 AI 报告引擎</b><small>${st.ok ? ('已配置（' + (st.cfg.mode === 'worker' ? 'Worker 代理 · glm-4-flash' : ((st.cfg.model || 'deepseek-chat') + ' 直连')) + '）') : '未配置——当前为本地规则报告'}</small></div>
          <button class="ex99-mini" onclick="App.afuChatSettings()">⚙️ 配置密钥</button>
        </div>
        <div class="ex99-setrow">
          <div><b>📚 情感词汇库</b><small>大连理工大学本体 · 7 大情感分类 · 存 IndexedDB 离线使用</small></div>
          <span class="ex99-mini static">${this.EXPRESS99_FILLERS ? '内置核心版' : ''}</span>
        </div>
        <div class="ex99-setrow">
          <div><b>🎤 语音识别引擎</b><small>Web Speech（Chrome / 安卓 WebView 原生）· 其余浏览器走 ⌨️ 打字模式</small></div>
          <span class="ex99-mini static">本地引擎</span>
        </div>
        <div class="ex99-setrow">
          <div><b>🕘 练习记录</b><small>仅存本机 localStorage（最多 50 条）· 不上传任何服务器</small></div>
          <button class="ex99-mini" onclick="App._express99Clear()">🗑 清空</button>
        </div>
        <div class="ex99-setrow">
          <div><b>📜 合规声明</b><small>所有数据仅存本地；AI 报告仅在你自行配置密钥时使用</small></div>
          <button class="ex99-mini" onclick="App._express99Disclaimer()">重看</button>
        </div>
      </div>`, [{ label: '完成', primary: true }]);
  },
  _express99Clear() {
    try { localStorage.setItem(this.EXPRESS99_RKEY, '[]'); } catch (e) {}
    this._express99PaintRecs();
    try { const ov = document.querySelector('.wild-overlay'); if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch (e) {}
    this._flash('🕘 练习记录已清空');
  },

  _express99Disclaimer() {
    const rt = this._express99Rt;
    this._modal('📜 独行表达 · 合规声明', `
      <div class="ex99-law">
        <p>本功能仅用于个人表达训练，所有数据均存储在本地，不会上传到任何服务器。情感词汇库来自大连理工大学，仅供个人学习使用。</p>
        <p class="tip">补充说明：生成「AI 完整版报告」需要你在设置里自行配置 API 密钥——该过程只会把本次转写文本发往你自己配置的 AI 服务，不配置则始终使用本地规则报告。</p>
      </div>`, [
      {
        label: '✅ 同意并开始', primary: true, onClick: () => {
          if (rt) rt.agreed = true;
          try { localStorage.setItem(this.EXPRESS99_OKKEY, '1'); } catch (e) {}
        },
      },
    ]);
  },

  // ==================== 离开（停录音 · 静默存档）====================
  _express99Leave() {
    const rt = this._express99Rt;
    if (!rt) return;
    if (rt.recOn) {
      const n = rt.sentences.length;
      this._express99RecStop(n >= 2);   // ≥2 句静默生成存档，否则丢弃
    }
    try { const old = document.getElementById('ex99Report'); if (old) old.remove(); } catch (e) {}
  },

  // ==================== 入口（长按【家园】旋钮 1 秒 · 液体音 + 青绿圆幕）====================
  _express99Enter(ev) {
    const btn = document.querySelector('.dock99-btn[data-view="space"]');
    const r = btn ? btn.getBoundingClientRect() : null;
    const x = (ev && ev.clientX) || (r ? r.left + r.width / 2 : 40);
    const y = (ev && ev.clientY) || (r ? r.top + r.height / 2 : window.innerHeight - 40);
    const veil = document.createElement('div');
    veil.className = 'perm99-veil ex99-veil';
    veil.style.setProperty('--vx', x + 'px');
    veil.style.setProperty('--vy', y + 'px');
    (document.body || document.documentElement).appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('run')));
    setTimeout(() => { try { this.navigate('express99'); } catch (e) {} }, 950);
    setTimeout(() => {
      veil.classList.add('fade');
      setTimeout(() => { try { veil.remove(); } catch (e) {} }, 380);
    }, 1080);
  },
  // 长按绑定（挂在【家园】旋钮上；bindNav 末尾统一调用）
  _express99BindEntry() {
    const hb = document.querySelector('.dock99-btn[data-view="space"]');
    if (!hb || hb.dataset.ex99Wired) return;
    hb.dataset.ex99Wired = '1';
    let lp = null, sx = 0, sy = 0;
    const clear = () => { if (lp) { clearTimeout(lp); lp = null; } };
    hb.addEventListener('pointerdown', (e) => {
      sx = e.clientX; sy = e.clientY;
      try { hb.setPointerCapture(e.pointerId); } catch (_) {}
      try { App._sfx99 && App._sfx99('liquid'); } catch (_) {}   // 液体音在按下瞬间（手势上下文内必出声）
      lp = setTimeout(() => {
        lp = null;
        App.__holdNav99 = true;   // 长按已触发：吞掉紧随的 click，不再进家园页
        try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
        try { this._express99Enter(e); } catch (_) {}
      }, 1000);
    });
    hb.addEventListener('pointermove', (e) => {
      if (!lp) return;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) clear();   // 手指滑动 = 取消
    });
    hb.addEventListener('pointerup', clear);
    hb.addEventListener('pointercancel', clear);
    hb.addEventListener('contextmenu', (e) => e.preventDefault());
  },
});
