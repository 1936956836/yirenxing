// 79-afu-record.js —— v11.5 管家阿福 · 记录板块全子页陪伴卡
// [功能组] G5-情感陪伴（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// 设计原则（与灵光「阿福回响」/ 憾潮「阿福陪打」一脉相承）：
//   · 无处不在的陪伴：记录板块每个子页顶部都有阿福的一张小卡——先跟你打个招呼，再递上今天的专属服务
//   · 只陪伴不催促：每张卡 = 角色化身份（随行管家/心事管家/书友…）+ 数据感知的一句陪伴 + 一个轻服务
//     （足迹荐「下一站」· 铭记翻「最早一条」· 倒数日替你「数日子」· 待办荐「先做最小那件」…）
//   · 当日稳定：随机推荐用「日期 + 页面」做种子（同一天不跳变，第二天自然换新，与灵光回响同算法）
//   · 零干扰：注入点在 _wbBody 路由（一处生效全板块）；任何异常静默返回空串，绝不影响页面渲染
//   · 灵光（回响）与憾潮（陪打）已有各自深度定制的阿福卡，不重复注入
//   · v12.9.5：记录首页已改版为新插画首页（91-record99.js），不再注入阿福卡——移出清单
Object.assign(App, {
  // 注入清单：记录板块全部子页（_wbBody 原样返回其余视图；v11.9 新增 dream99 拾梦 / v12.0 新增 drift99 漂流）
  _afu99RecPages: ['footprints99', 'notes99', 'diary', 'readingNotes', 'todo', 'countdown', 'memorial', 'outfit', 'wb_sci', 'wb_exp', 'gewu99', 'zhizhi99', 'dream99', 'drift99', 'vault99'],

  // 当日稳定随机：日期 + 盐 做种（同一天内多次渲染结果一致）
  _afu99Pick(arr, salt) {
    if (!Array.isArray(arr) || !arr.length) return null;
    let seed = 0; const dk = Store.today() + '#' + (salt || '');
    for (let i = 0; i < dk.length; i++) seed = (seed * 31 + dk.charCodeAt(i)) >>> 0;
    return arr[seed % arr.length];
  },
  // 距今天数（'YYYY-MM-DD' → 当天=0 / 未来=正 / 已过=负）
  _afu99DaysUntil(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null;
    const t = new Date(dateStr + 'T00:00:00').getTime();
    const n = new Date(Store.today() + 'T00:00:00').getTime();
    return Math.round((t - n) / 86400000);
  },
  // 距下一个周年还有 N 天（每年循环）
  _afu99AnnivDays(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null;
    const now = new Date(Store.today() + 'T00:00:00');
    const m = +dateStr.slice(5, 7) - 1, day = +dateStr.slice(8, 10);
    let d = new Date(now.getFullYear(), m, day);
    if (d.getTime() < now.getTime()) d = new Date(now.getFullYear() + 1, m, day);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  },
  _afu99DaysAgo(tsOrDate) {
    const t = new Date(tsOrDate || '').getTime();
    if (isNaN(t)) return 0;
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
  },

  // ===== 卡片渲染（入口；异常静默）=====
  _afu99Rec(view, W) {
    try {
      const c = this._afu99RecData(view, W || {});
      if (!c || !c.role || !c.text) return '';
      return `<div class="card afu99-rec">
        <div class="afu99-ava">${this._afu99AvatarHtml(34)}</div>
        <div style="flex:1;min-width:0">
          <div class="afu99-tt">管家阿福 · ${c.role}</div>
          <div class="afu99-tx">${c.text}</div>
          ${c.service ? `<div class="afu99-sv">${c.service}</div>` : ''}
        </div>
      </div>`;
    } catch (_) { return ''; }
  },

  // ===== 各页数据感知内容 =====
  _afu99RecData(view, W) {
    const d = Store.load();
    switch (view) {
      // —— 记录主页：全局盘点 + 陪伴导航 ——
      case 'record': {
        const notes = (d.wbNotes99 || []).filter(n => (n.kind || '') !== '反省书').length;
        const diaries = (d.diaries || []).length;
        const sparks = (d.wbSparks99 || []).length;
        const regrets = (d.wbRegrets99 || []).length;
        const dreams = (d.wbDreams99 || []).length;
        const provs = new Set((d.wbFootprints99 || []).map(f => f.prov).filter(Boolean)).size;
        const todoN = (((d.workbench || {}).todoPlans) || []).filter(t => !t.done).length;
        const parts = [];
        if (notes) parts.push(`大事记 ${notes} 条`);
        if (diaries) parts.push(`日记 ${diaries} 篇`);
        if (sparks) parts.push(`灵光 ${sparks} 条`);
        if (regrets) parts.push(`憾潮 ${regrets} 张沙袋`);
        if (dreams) parts.push(`梦境 ${dreams} 个`);
        if (provs) parts.push(`足迹 ${provs}/34 省`);
        const text = parts.length
          ? `阿福替你数过：你在记录里留下了 ${parts.join(' · ')}${todoN ? `，还有 ${todoN} 件待办在路上` : ''}。这些不是数据，是你认真活过的证据。`
          : `这里是给自己留痕的地方——灵光、憾潮、足迹、记事、日记、待办……你只管记，剩下的交给阿福。`;
        return { role: '记录板块管家', text,
          service: `🧭 每个页面里阿福都在：灵光有「回响」· 憾潮有「陪打」· 足迹荐「下一站」· 记事翻「旧大事」· 倒数日替你「数日子」——随便逛逛。` };
      }
      // —— 足迹：随行管家 + 下一站建议 ——
      case 'footprints99': {
        const fps = d.wbFootprints99 || [];
        const litSet = new Set(fps.map(f => f.prov).filter(Boolean));
        const cityN = new Set(fps.filter(f => f.city).map(f => f.prov + '|' + f.city)).size;
        const provs = (this._fp99Provinces ? this._fp99Provinces() : []);
        const unvisited = provs.filter(p => !litSet.has(p.id));
        if (!fps.length) return { role: '随行管家',
          text: `地图还一片空白。第一站阿福建议点亮你的<b>家乡</b>——人是从知道自己从哪里来，才开始走远的。`,
          service: `🧭 上方选省份、或直接填城市（自动识别省份）即可点亮；点亮的一刻，地图就活了。` };
        if (!unvisited.length) return { role: '随行管家',
          text: `<b>34/34！</b>中国的省级行政区你已经走全——灯火里的每一格，都是你亲身站过的土地。`,
          service: `🎩 阿福把敬意鞠给你。开着黑夜模式再逛一遍地图吧——那是你一个人的山河。` };
        const next = this._afu99Pick(unvisited, 'fp99');
        const why = this._afu99NextStopLines()[next.id] || '远方永远值得一次说走就走';
        return { role: '随行管家',
          text: `你已经走过 <b>${litSet.size}/34</b> 个省级行政区、${cityN} 座城市——每一点亮，都是你亲身站过的土地。`,
          service: `🧭 阿福荐下一站：<b>${this.esc(next.name)}</b>——${this.esc(why)}
            <button class="btn btn-sm btn-primary" onclick="App._fp99Pick('${next.id}')">去点亮</button>` };
      }
      // —— 记录主页陪伴卡：v12.9.5 首页改版后已不再注入（_afu99RecPages 移除 record），此处保留 case 兼容
      case 'record': {
        return null;
      }
      // —— 铭记（原记事）：大事记管家 + 翻最早一条 ——
      case 'notes99': {
        const notes = (d.wbNotes99 || []).filter(n => (n.kind || '') !== '反省书');
        if (!notes.length) return { role: '大事记管家',
          text: `拿到录取通知书、第一次远行、家人的好消息……人生值得被记住的瞬间，发生了就存进来。`,
          service: `🖊️ 阿福替你保管一辈子——这些大事记只存在你自己的设备里，随备份一并带走。` };
        const oldest = notes[notes.length - 1]; // unshift 入列 → 末位最旧
        const ago = this._afu99DaysAgo(oldest.ts || oldest.date);
        const t = oldest.title ? `「${this.esc(oldest.title)}」` : '那条没写标题的大事';
        return { role: '大事记管家',
          text: `阿福替你数着：大事记共 <b>${notes.length}</b> 条。最早的一条是 ${ago} 天前的${t}——那件事的细节，你还记得多少？`,
          service: `📜 偶尔回来看看这些瞬间——人是靠记住的事，慢慢变厚的。` };
      }
      // —— 日记：心事管家 + 今晚树洞 ——
      case 'diary': {
        const diaries = d.diaries || [];
        const wroteToday = diaries.some(x => x.date === Store.today());
        if (!diaries.length) return { role: '心事管家',
          text: `日记还空着。开心要记下来放大快乐，难过也要写下来给情绪一个出口——阿福做你的树洞。`,
          service: `🌙 今晚睡前写两笔试试？哪怕只有「今天有点累」五个字，也算数的。` };
        const text = wroteToday
          ? `今天的日记已经落笔——把情绪交给纸面，是很好的习惯。攒下这 ${diaries.length} 篇，回头看时你会感谢现在记录的自己。`
          : `已有 <b>${diaries.length}</b> 篇日记。今晚睡前写两笔也好——情绪要有出口，阿福做你的树洞。`;
        return { role: '心事管家', text,
          service: `🔒 日记只存在你自己的设备里，想写什么都可以——这里没有读者，只有阿福。` };
      }
      // —— 读感（原阅读笔记）：书友 + 荐读 ——
      case 'readingNotes': {
        const st = (Store.readingNotesStats && Store.readingNotesStats()) || { total: 0, reading: 0, notes: 0 };
        const books = ((d.readingNotes || {}).books) || [];
        const reading = books.filter(b => b.status === 'reading');
        if (reading.length) {
          const b = this._afu99Pick(reading, 'rn99');
          return { role: '书友',
            text: `书架上 <b>${st.total}</b> 本书（在读 ${st.reading} 本），笔记 <b>${st.notes}</b> 条。《${this.esc(b.title || '无题')}》还在读——书签替你留着位置呢。`,
            service: `📖 每天读十页也好——读到哪儿，金句和想法随手记进来，阿福帮你攒着。` };
        }
        if (st.total) return { role: '书友',
          text: `书架上有 <b>${st.total}</b> 本书、${st.notes} 条笔记，但还没有「在读」状态的书——把正在看的那本标记为在读吧。`,
          service: `📖 读一页也算数。阿福帮你把金句、想法、行动清单都收进笔记里。` };
        return { role: '书友',
          text: `书架还空着——从你最想读的那一本开始，不用选「有用的」，选「想读的」。`,
          service: `📖 加一本书进书架，读到哪儿笔记记到哪儿；弃读了也没关系，书友不评判。` };
      }
      // —— 待办：待办管家 + 荐先做最小那件 ——
      case 'todo': {
        const todos = (((d.workbench || {}).todoPlans) || []);
        const undone = todos.filter(t => !t.done);
        if (!todos.length) return { role: '待办管家',
          text: `清单还空着——往里放一件今天想完成的小事吧，勾掉的那一刻很治愈。`,
          service: `✅ 阿福经验：一次只放 3 件以内，完成率最高。` };
        if (!undone.length) return { role: '待办管家',
          text: `清单全勾完了——${todos.length} 件，一件不落。阿福敬你今天的清爽，剩下的时间好好休息。`,
          service: `🍵 去看看【记录】里今天的日记写了吗？或者什么都不做，也很好。` };
        const pick = this._afu99Pick(undone, 'todo99');
        return { role: '待办管家',
          text: `还有 <b>${undone.length}</b> 件事没勾——先挑最小、最快能完成的那件做，剩下的会跟着顺起来。`,
          service: `🎯 阿福荐先做：「${this.esc(pick.title || '未命名待办')}」——做完回来勾掉它。` };
      }
      // —— 倒数日：倒数管家 + 替你数日子 ——
      case 'countdown': {
        const cds = (d.countdowns || []).map(c => ({ c, days: this._afu99DaysUntil(c.date) }))
          .filter(x => x.days !== null && x.days >= 0).sort((a, b) => a.days - b.days);
        if (!cds.length) return { role: '倒数管家',
          text: `考试、假期、还款日——重要的日子存进来，阿福替你一天一天数着。`,
          service: `⏳ 倒数日的意义：让「盼头」变成看得见的进度条。` };
        const { c, days } = cds[0];
        const dtxt = days === 0 ? `<b>就是今天！</b>` : `还有 <b>${days}</b> 天`;
        return { role: '倒数管家',
          text: `「${this.esc(c.title || '未命名倒数')}」${dtxt}——阿福替你数着日子，一天都不会数错。`,
          service: days === 0 ? `🎉 大日子到了！今天值得被认真对待。` : `⏳ 越近的日子越要稳住节奏——按部就班，就是最快。` };
      }
      // —— 纪念日：纪念管家 + 周年倒数 ——
      case 'memorial': {
        const mems = (d.memorials || []).map(c => ({ c, days: this._afu99AnnivDays(c.date) }))
          .filter(x => x.days !== null).sort((a, b) => a.days - b.days);
        if (!mems.length) return { role: '纪念管家',
          text: `生日、在一起的日子、领养三千的那天——值得每年都记起的日子，交给阿福。`,
          service: `🎂 纪念日按年倒数，周年自动 +1——时间往前走，惦记不会淡。` };
        const { c, days } = mems[0];
        const dtxt = days === 0 ? `<b>就是今天！</b>` : `的周年还有 <b>${days}</b> 天`;
        return { role: '纪念管家',
          text: `「${this.esc(c.title || '未命名纪念')}」${dtxt}——去年的这天你在盼着它，它也一直记得你。`,
          service: days === 0 ? `🎂 今天是个好日子，替阿福也庆祝一下。` : `💝 到了那天，记得对相关的人（或自己）说句话。` };
      }
      // —— 穿搭：衣橱管家 + 幸运色/身材建议 ——
      case 'outfit': {
        const p = Store.getProfile ? Store.getProfile() : {};
        const bmi = Store.getBMI ? Store.getBMI() : null;
        const fort = Store.getTodayFortune ? Store.getTodayFortune() : null;
        const lucky = fort ? (fort.luckyColor || '') : '';
        if (!p.height || !p.weight) return { role: '衣橱管家',
          text: `把【空间 → 个人档案】里的生日、身高、体重填全——阿福好结合 BMI 和运势，替你配今天这一身。`,
          service: `👔 档案填得越全，穿搭建议越合身。` };
        const bodyTip = !bmi ? '' : (bmi.value < 18.5 ? '层次叠穿显壮' : bmi.value < 24 ? '标准身材基本通吃' : bmi.value < 28 ? 'V领深色显瘦' : '垂感面料 + 同色系显精神');
        return { role: '衣橱管家',
          text: `身高 ${p.height}cm · 体重 ${p.weight}kg${bmi ? ` · BMI ${bmi.value.toFixed(1)}` : ''}${bodyTip ? `——${this.esc(bodyTip)}` : ''}。`,
          service: lucky ? `🎲 今日幸运色 <b>${this.esc(lucky)}</b>——哪怕只是一双袜子，也算应了今天的运。` : `🎲 档案与运势联动后，每天阿福都替你配一身。` };
      }
      // —— 生活科普：学伴 + 小测提醒 ——
      case 'wb_sci': {
        let answered = 0;
        try {
          const raw = Store.getSetting('wb_lifesci_quiz_' + Store.today(), null);
          if (raw) answered = Object.keys(JSON.parse(raw).answered || {}).length;
        } catch (_) {}
        return { role: '科普学伴',
          text: `今天的 6 张科普卡阿福已经备好——食品、健康、心理、物理、运动、常识，每天换新。`,
          service: answered > 0
            ? `✅ 今天的小测已完成 ${answered} 题——学过的东西，明天还是你的。`
            : `🧪 看完 6 张别走——页面下方的小测等着你，检验一下今日阅读成果。` };
      }
      // —— 经验宝库：经验向导 + 今日荐读 ——
      case 'wb_exp': {
        let identity = '大学生';
        try { identity = localStorage.getItem('exp_identity') || '大学生'; } catch (_) {}
        const exp = (this._expData ? this._expData() : []);
        if (exp.length) {
          const e = this._afu99Pick(exp, 'exp99');
          return { role: '经验向导',
            text: `你现在的身份是「${this.esc(identity)}」——宝库里的经验按身份优先推荐，都是别人替你踩过的坑。`,
            service: `💡 今日荐读：《${this.esc(e.title || '经验包')}》${e.summary ? '——' + this.esc(String(e.summary).slice(0, 40)) : ''}` };
        }
        return { role: '经验向导',
          text: `经验宝库按你的身份（${this.esc(identity)}）优先推荐经验包——选好「我目前是」，阿福把对的经验推到你面前。`,
          service: `💡 每个经验包按「时间轴 / 技巧清单 / 避坑提醒」组织，重点已标红。` };
      }
      // —— 格物：图书馆长 + 伴读（v12.3）——
      case 'gewu99': {
        const prog = (typeof LIB99_SHELVES !== 'undefined') ? (() => {
          try { return JSON.parse(localStorage.getItem('gw99_read_v1') || '{}'); } catch (e) { return {}; }
        })() : {};
        const readBooks = Object.keys(prog).length;
        const readMin = Object.values(prog).reduce((s, p) => s + ((p && p.sec) || 0), 0);
        return { role: '图书馆长',
          text: readBooks
            ? `你已经在图书馆读过 ${readBooks} 本书${readMin ? `，累计 ${Math.round(readMin / 60)} 分钟` : ''}——书页翻过的声音，是我听过最安静的努力。`
            : `八座书架十九本书都上架了：英语、政治、高数、计算机、法律、医学、心理学、生活学——每本翻开都有书角计时，读到哪里，下次从哪里继续。`,
          service: `📚 每个书架下保留了每日速推知识卡和 10 题小测——书是体系，卡与题是每天的温故。` };
      }
      // —— 致知：电台主播 + 导听（v12.3）——
      case 'zhizhi99': {
        return { role: '电台主播',
          text: `一人行电台，正在为你播音——七个电台：今日播报 + 六类新闻。点一个频段，世界就进来了。`,
          service: `📡 今日播报台会尝试拉取实时新闻（失败自动换本地新闻池）；支持语音朗读的设备会自动播报，不支持的也能看文字流。` };
      }
      // —— 拾梦：解梦书童 + 醒后黄金窗口提醒（v11.9）——
      case 'dream99': {
        const dm = (d.wbDreams99 || []);
        const lucidN = dm.filter(x => x.lucid).length;
        const todayHas = dm.some(x => x.date === Store.today());
        const inWin = !!(this._dream99WakeWindow && this._dream99WakeWindow());
        let text;
        if (!dm.length) {
          text = inWin
            ? `现在正是「醒后黄金时间」——梦的边缘还没化掉。梦境本还空着，今晨这个梦要不要成为第一页？`
            : `梦境本还是空的。不用天天记——哪天醒来梦还热乎，回来说给阿福听就好。`;
        } else if (inWin && !todayHas) {
          text = `现在正是「醒后黄金时间」——你已经攒了 ${dm.length} 个梦，今天这个要不要也接住？（语音说一遍，一分钟就够）`;
        } else {
          text = `你已经收了 ${dm.length} 个梦${lucidN ? `（其中 ${lucidN} 个清醒梦——你在梦里醒着，很了不起）` : ''}。一个月后翻回来，潜意识会自己开口说话。`;
        }
        return { role: '解梦书童', text,
          service: `🌙 记不清细节时看记录框上方阿福的引导问题（每天换一个）；攒够 3 个梦点「潜意识月报」，阿福帮你把反复出现的意象挑出来。` };
      }
      // —— 漂流：心事摆渡人 + 海的宽慰（v12.0）——
      case 'drift99': {
        const dr = (d.wbDrift99 || {});
        const bottles = Array.isArray(dr.bottles) ? dr.bottles : [];
        const now = Date.now();
        const drifN = bottles.filter(b => b && !b.released && now < (b.endsAt || 0)).length;
        const shoreN = bottles.filter(b => b && !b.released && !b.opened && now >= (b.endsAt || 0)).length;
        const relN = bottles.filter(b => b && b.released).length;
        const creN = Object.keys(dr.creatures || {}).length;
        const goneN = dr.discarded || 0;
        let text;
        if (!bottles.length && !creN && !goneN) {
          text = `这片海还空着。有烦恼的时候，写下来封进瓶里——封上软木塞那一刻，就轻了一半。`;
        } else {
          const parts = [];
          if (drifN) parts.push(`${drifN} 个瓶子还在漂`);
          if (shoreN) parts.push(`${shoreN} 个已靠岸`);
          if (relN) parts.push(`${relN} 个已放归深海`);
          if (creN) parts.push(`图鉴收了 ${creN} 只海洋生物`);
          if (goneN) parts.push(`${goneN} 件随海风散去了`);
          text = `海上：${parts.join(' · ')}。烦恼交给海——海不催你，也不评判你。`;
        }
        return { role: '心事摆渡人', text,
          service: `🫙 封瓶后内容连你自己也看不到，漂满才靠岸、开不开由你；点「打捞」随机捞起海洋生物或一个漂流中的瓶子；还在漂的瓶子可「放生」——内容永远沉底。` };
      }
      // —— 密码箱：守匣人 + 上锁的安心（v12.2）——
      case 'vault99': {
        const hasPwd = !!(this._vault99HasPwd && this._vault99HasPwd());
        const unlocked = !!(this._vault99Unlocked && this._vault99Unlocked());
        const sensN = this._vault99SensRecords ? this._vault99SensRecords().length : 0;
        const secN = this._vault99Data ? this._vault99Data().secrets.length : 0;
        let text;
        if (!hasPwd) {
          text = `密码箱还没上锁——第一次来，先设一个只有你知道的密码。从此心事与健康隐私，都归这把锁管。`;
        } else if (!unlocked) {
          text = `箱子锁着${secN ? `（里面有你存的 ${secN} 条秘密` + (sensN ? `和 ${sensN} 条健康隐私` : '') + `）` : sensN ? `（里面收着 ${sensN} 条健康隐私）` : ''}——它不问密码对不对，只等你想起来的时候。`;
        } else {
          text = `箱子开着，${secN} 条秘密${sensN ? ` · ${sensN} 条健康隐私` : ''}都在。看完记得随手「立即上锁」——习惯上锁的人，秘密才守得住。`;
        }
        return { role: '守匣人', text,
          service: `🔐 每个用户的密码不同：首次进入时设置；这把密码也接管健康隐私解锁（旧密码 2004 作废）。解锁 30 分钟内免输，关闭页面自动上锁。` };
      }
      default: return null;
    }
  },

  // 下一站推荐文案（34 省级行政区各一句；当日稳定随机挑一个未点亮的）
  _afu99NextStopLines() {
    return {
      hlj: '漠河的极光和中央大街的雪，都在等你',
      jl: '长白山天池的蓝，值得一次专程奔赴',
      ln: '大连的海风会把心事吹散',
      nmg: '呼伦贝尔的风，吹过整片草原',
      bj: '胡同深处有人间烟火',
      tj: '相声和煎饼果子的快乐老家',
      heb: '承德避暑山庄，藏着皇家的清凉',
      sx: '平遥古城的墙上落着晋商的黄昏',
      sd: '泰山的日出会告诉你什么叫值得',
      hen: '洛阳的牡丹已经开了一千多年',
      js: '南京的梧桐和苏州的园林都念旧',
      ah: '黄山的云海，要爬上去才懂',
      sh: '外滩的钟声一响，百年就过去了',
      zj: '杭州的西湖，是雨天的一幅水墨',
      jx: '婺源的油菜花田，春天限定的金色',
      fj: '鼓浪屿的琴声混着海浪声',
      hb: '武汉过早的热干面，清晨的仪式感',
      hun: '凤凰古城的沱江边，灯火会唱歌',
      gd: '广州的早茶可以从早喝到中午',
      gx: '桂林山水，人民币背面那片绿',
      hi: '三亚的海有七种蓝',
      cq: '山城的夜色和火锅一样滚烫',
      sc: '成都的茶馆里，时间可以慢下来',
      gz: '黄果树的瀑布声，盖得过心事',
      yn: '丽江的星空和大理的风，都在等你',
      xj: '喀纳斯的秋天，是上帝打翻的调色盘',
      xz: '布达拉宫前，信仰有形状',
      qh: '青海湖的蓝，是天空掉下来的',
      gs: '敦煌的风里都是故事',
      nx: '贺兰山下，藏着塞上江南',
      sn: '西安的城墙，记得十三个王朝',
      tw: '阿里山的云雾和垦丁的海',
      hk: '维港的夜风，很市井也很浪漫',
      mo: '大三巴的石阶上，光阴走得很慢',
    };
  },

  // ==================== v12.9.23 阿福晨报（每日首次打开：天气 + 待办要点 + 昨日完成度 + 一句健康提醒）====================
  // 管家身份的日常存在感：把「阿福知晓所有数据」落到每天可感知的一段话。
  // 触发：init 时 last_greet_date !== today → 延迟 2.8s（等开屏播完）经登录门禁队列出弹（00-core.js showDailyGreeting 委托至此）
  async showAfuMorningBrief() {
    // 天气先等一手：缓存 30 分钟内直接命中；首次定位给 2.2s 窗口，超时用旧缓存/省略
    try { await Promise.race([
      (this.loadWeather ? this.loadWeather() : Promise.resolve()),
      new Promise(r => setTimeout(r, 2200)),
    ]); } catch (_) {}
    const now = new Date();
    const h = now.getHours();
    const today = Store.today();

    // —— 开场（时段问候）——
    let hello = '';
    if (h < 6) hello = '夜深了，这个点醒着的你辛苦了 🌙';
    else if (h < 11) hello = '早上好，新的一天开始了 🌅';
    else if (h < 14) hello = '中午好，记得吃饭和午睡 ☀️';
    else if (h < 18) hello = '下午好，保持节奏继续加油 🌤️';
    else if (h < 22) hello = '晚上好，今天的努力都记录了吗 🌇';
    else hello = '夜深了，23:00 前入睡为佳 😴';

    // —— ① 今日天气 ——
    let weatherLine = '🌤️ 天气还没拿到——稍后首页的天气标会自动刷新';
    try {
      const wc = JSON.parse(localStorage.getItem('weather_cache') || 'null');
      if (wc && wc.data && wc.data.temp != null) {
        const d = wc.data, wm = this._weatherCodeMap(d.code);
        const t = Math.round(d.temp);
        const rainCodes = [51,53,55,56,57,61,63,65,66,67,80,81,82,85,86,95,96,99];
        let adv = '适合户外走走 🌤️';
        if (rainCodes.includes(+d.code)) adv = '出门带伞 ☔';
        else if (t < 5) adv = '注意保暖 ❄️';
        else if (t > 30) adv = '防晒补水，避免正午外出 🥵';
        weatherLine = `${wm.icon} ${wm.desc} <b>${t}°C</b>（体感 ${Math.round(d.feels)}°C · ${this.esc(d.locName || '当前位置')}）—— ${adv}`;
      }
    } catch (_) {}

    // —— ② 待办要点（四象限 q1 优先，只列今天到期/无日期的前 3 件）——
    const plans = ((Store.getWorkbench ? Store.getWorkbench() : {}) || {}).todoPlans || [];
    const pendingAll = plans.filter(p => !p.done);
    const due = pendingAll.filter(p => !p.target || p.target <= today)
      .sort((a, b) => ((a.q || 2) - (b.q || 2)) || (a.target < b.target ? -1 : 1));
    const top = due.slice(0, 3);
    const QN = { 1: '🔥', 2: '🌱', 3: '🤝', 4: '🍃' };
    let todoHtml = '';
    if (!pendingAll.length) {
      todoHtml = '<div class="afu-brief-tx">清单是空的——轻装上阵，想做什么由今天的你说了算。</div>';
    } else {
      const overdue = pendingAll.filter(p => p.target && p.target < today).length;
      const head = `共 <b>${pendingAll.length}</b> 件未完成${overdue ? ` · <b style="color:#b91c1c">${overdue} 件已逾期</b>` : ''}`;
      const rows = top.length
        ? top.map(p => {
            const dueLbl = !p.target ? '无日期' : (p.target === today ? '今天到期' : `逾期 ${Math.round((new Date(today) - new Date(p.target)) / 86400000)} 天`);
            return `<div class="afu-brief-todo"><span>${QN[p.q >= 1 && p.q <= 4 ? p.q : 2] || '🌱'}</span><b style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.esc(p.title || '')}</b><span class="afu-brief-due">${dueLbl}</span></div>`;
          }).join('')
        : '<div class="afu-brief-tx">今天没有到期的待办，远期的事阿福替你记着呢。</div>';
      todoHtml = `<div class="afu-brief-tx" style="margin-bottom:4px">${head}</div>${rows}`;
    }

    // —— ③ 昨日完成度（打卡卡数 / 习惯总卡数 + 亮点摘要）——
    let doneN = 0, totalN = 0, pct = 0, yhl = '';
    try {
      const yd = this._hb99DkOff(-1);
      const h99 = Store.getHabit99();
      doneN = Object.keys((h99.days || {})[yd] || {}).length;
      totalN = (CONFIG.habitCards || []).length;
      pct = totalN ? Math.round(doneN / totalN * 100) : 0;
      const ys = Store.habit99DailySummary(yd) || {};
      const parts = [];
      if (ys.meals) parts.push(`三餐 ${ys.meals}/3`);
      if (ys.waterL) parts.push(`水 ${ys.waterL}L`);
      if (ys.studyMin) parts.push(`学习 ${ys.studyMin} 分钟`);
      if (ys.sportMin) parts.push(`运动 ${ys.sportMin} 分钟`);
      if (ys.nightH) parts.push(`夜睡 ${ys.nightH} 小时`);
      yhl = parts.join(' · ');
      var yNightH = ys.nightH || 0; // 供健康提醒引用
    } catch (_) {}
    const pctComment = pct >= 80 ? '非常漂亮的一天，今天照这个节奏来 ✨'
      : pct >= 50 ? '扎实的进度，今天再推一把就稳了'
      : doneN > 0 ? '昨天起了个头，今天接着来'
      : '昨天是休息日——休息也是计划的一部分';

    // —— ④ 一句健康提醒（按当下状态择一，绝不刷屏）——
    let waterNow = 0;
    try { waterNow = (this.todayRec().diet || {}).water || 0; } catch (_) {}
    const FALLBACK_TIPS = [
      '久坐一小时就起来接杯水、伸个懒腰。',
      '今天记得记录三餐——数据越全，阿福的建议越准。',
      '给眼睛放个假：每看屏幕 40 分钟，望远处 20 秒。',
      '今晚睡前把手机放远一点，让入睡更干脆。',
    ];
    let healthTip;
    if (h >= 20) healthTip = '💊 22:00 前记得 HIV 抗病毒药（齐拉米夫双定 + 艾诺韦林）——今晚最不能漏的一顿。';
    else if (h >= 15 && waterNow < 1000) healthTip = `💧 今天只喝了 ${waterNow}ml 水——睡前还有时间补一补（目标 1300ml）。`;
    else if (yNightH && yNightH < 6) healthTip = `😴 昨晚只睡了 ${yNightH} 小时——今天尽量 23:00 前躺下，把免疫黄金修复期睡回来。`;
    else if (h < 10) healthTip = '🍊 早餐后把维生素 B/C/D 一起吃了；转移因子胶囊随餐三顿也别忘。';
    else healthTip = FALLBACK_TIPS[today.split('-').reduce((s, x) => s + +x, 0) % FALLBACK_TIPS.length];

    // —— 渲染 ——
    const overlay = document.createElement('div');
    overlay.className = 'afu-brief-ov';
    overlay.id = 'afuBrief';
    overlay.innerHTML = `
      <div class="afu-brief">
        <div class="afu-brief-hd">
          <div class="afu99-ava">${this._afu99AvatarHtml(30)}</div>
          <div style="flex:1;min-width:0">
            <div class="afu-brief-name">管家阿福 · 晨报</div>
            <div class="afu-brief-sub">${today} · ${hello}</div>
          </div>
        </div>
        <div class="afu-brief-sec"><div class="afu-brief-lab">🌤️ 今日天气</div><div class="afu-brief-tx">${weatherLine}</div></div>
        <div class="afu-brief-sec"><div class="afu-brief-lab">⏳ 待办要点</div>${todoHtml}</div>
        <div class="afu-brief-sec">
          <div class="afu-brief-lab">📊 昨日完成度 · ${doneN}/${totalN} 张卡（${pct}%）</div>
          <div class="afu-brief-bar"><i style="width:${Math.min(100, pct)}%"></i></div>
          ${yhl ? `<div class="afu-brief-mini">${this.esc(yhl)}</div>` : ''}
          <div class="afu-brief-mini" style="color:#92400e">${pctComment}</div>
        </div>
        <div class="afu-brief-sec" style="border-color:#fde68a;background:#fffbeb"><div class="afu-brief-lab">🩺 一句健康提醒</div><div class="afu-brief-tx">${this.esc(healthTip)}</div></div>
        <div class="afu-brief-btns">
          <button class="btn btn-primary" style="flex:1" onclick="App._afuBriefClose()">🌤️ 开始今天</button>
          <button class="btn btn-ghost" onclick="App._afuBriefClose();try{App.afuChatOpen()}catch(e){}">💬 找阿福聊聊</button>
        </div>
      </div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._afuBriefClose(); });
    const esc = (ev) => { if (ev.key === 'Escape') { this._afuBriefClose(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
    (document.body || document.documentElement).appendChild(overlay);
  },
  _afuBriefClose() {
    try {
      const el = document.getElementById('afuBrief');
      if (el && el.parentNode) el.parentNode.removeChild(el);
    } catch (_) {}
  },

  // ==================== v12.9.24 阿福对话式记录（聊天里说一句 → 阿福帮你打卡/记档）====================
  // 协议：LLM 回复末尾追加 [[AFU_ACT]]{json} 动作指令 → 本地解析剥离 → 校验/置信分流：
  //   conf ≥ 0.8 且字段齐全 → 直接写库（回执绿卡 + 可撤销）；否则出黄色确认卡，用户点「确认」才执行。
  // 执行全部复用既有写入路径（Store.habit99Check / addDiary / addTodoPlan / wbDreams99），零新增表结构。
  // 聊天消息 kind：act（已记录）/ act_pending（待确认）/ act_cancel（已取消）/ act_undone（已撤销）
  _AFU99_ACT_LABEL: {
    water: '💧 喝水', meal: '🍚 三餐', mood: '😊 心情', study: '📚 学习', fitness: '💪 健身',
    steps: '👟 步数', nap: '🛌 午睡', goodNight: '🌙 入睡', goodMorning: '🌅 起床',
    dream: '🌀 梦境', diary: '📖 日记', todo: '⏳ 待办',
    expense: '💸 花销', income: '💰 收入',
  },
  // 给 LLM 的协议文本（拼进系统提示词，见 68-focus-notes.js _afuSystemPrompt）
  _afu99ActProtocol() {
    return [
      '',
      '【记录代理协议】用户消息里若陈述了明确的生活事实（喝了多少水、吃了哪餐、心情如何、做了梦、想记日记、加待办、学习/运动时长、入睡起床时间等），你在正常回复（1-2 句简短确认）之外，必须在回复最后一行追加动作指令，格式严格为单行：',
      '[[AFU_ACT]]{"act":"water","ml":300,"conf":0.95}',
      '可用动作及字段：',
      '- water 喝水：ml=毫升数',
      '- meal 三餐：which=breakfast|lunch|dinner，mealType=居家|外卖|堂食|被请客，cost=元（外卖/堂食必填）',
      '- mood 心情：type=开心|平静|焦虑|悲伤|愤怒|疲惫，reason=原因',
      '- study 学习：minutes=分钟',
      '- fitness 运动健身：minutes=分钟，parts=部位数组（如["胸","三头"]，可选）',
      '- steps 步数：count=步数',
      '- nap 午睡：start=HH:MM，end=HH:MM（可空=还没醒）',
      '- goodNight 入睡：sleep=HH:MM',
      '- goodMorning 起床：wake=HH:MM',
      '- dream 梦境：content=梦的内容（尽量保留用户原话）',
      '- diary 日记：title=标题（可空），content=正文',
      '- todo 待办：title=事项，date=YYYY-MM-DD（可空=今天）',
      '- expense 花销：amount=元，cat=分类id（见下表），note=备注（买了什么/在哪里）',
      '- income 收入：amount=元，cat=分类id，note=备注',
      '花销分类表（cat 只能取以下 id）：',
      'med=医药💊(看病买药) · meal=餐饮🍽️ · groceries=日用品🧴(超市百货) · gym=健身💪 · study=学习📚(书课文具) · traffic=交通🚗(打车地铁加油) · util=生活缴费🧾(水电燃气物业) · housing=居住🏠(房租房贷) · goods=用品🛍️(数码电器家具) · phone=通讯云盘📱(话费网费会员) · clothes=衣物👕 · care=个护美容🧖(理发护肤) · social=应酬人情🧧(红包随礼聚餐) · game=游戏充值🎮(违规) · lottery=彩票盲盒🎰(违规) · adult=成人消费⛔(违规) · other=其他📦',
      '收入分类表：salary=工资 · bonus=奖金 · side=副业 · invest=投资收益 · redpack=红包 · refund=退款 · otherIn=其他收入',
      '规则：1) 仅在用户陈述事实时生成，闲聊/提问/倾诉不生成；2) 时间一律 24 小时制 HH:MM，金额与数量用数字；3) 信息完整明确 → conf≥0.9；含糊或缺字段（如"喝了点水"没说量）→ conf<0.6 且在正文里追问缺失信息；4) 指令必须单行合法 JSON，放在回复最末；5) 一次最多 2 个动作；6) 梦境/日记的内容字段保留用户原话，不要改写。',
      '【花销多轮追问 · 铁律】用户说「花了/消费/买了 X 元」但没说用途时：不要生成 expense 指令，先自然地问他「花在哪里了/买了什么」；等他回答后，对照上面的分类表推断 cat 并生成指令。若他的回答仍然含糊（如「就买了点东西」）→ 继续追问确认，宁可多问一句也不要瞎猜分类；只有能明确对上某个分类时才生成。三餐的吃喝（早餐/午饭/外卖）走 meal 指令不走 expense。',
    ].join('\n');
  },
  // 从 LLM 回复中剥离动作指令行 → { clean, acts }
  _afu99ActParse(reply) {
    const acts = [];
    let clean = String(reply || '');
    try {
      clean = clean.replace(/\[\[AFU_ACT\]\]\s*(\{[^\n}]*\})/g, (_, j) => {
        try {
          const a = JSON.parse(j);
          if (a && a.act) acts.push(a);
        } catch (e) {}
        return '';
      }).replace(/\n{3,}/g, '\n\n').trim();
    } catch (e) {}
    return { clean, acts: acts.slice(0, 2) };
  },
  // 字段校验：通过 → null（合法）；不通过 → 缺失说明
  _afu99ActInvalid(a) {
    const T = (s) => String(s == null ? '' : s).trim();
    const TM = /^([01]\d|2[0-3]):[0-5]\d$/;
    switch (a.act) {
      case 'water': { const n = +a.ml; return (n >= 50 && n <= 5000) ? null : '喝水毫升数需在 50~5000 之间'; }
      case 'meal': {
        if (!['breakfast', 'lunch', 'dinner'].includes(a.which)) return '分不清是哪一餐';
        if (['外卖', '堂食'].includes(a.mealType) && !(+a.cost > 0)) return '外卖/堂食需要花费金额';
        return null;
      }
      case 'mood': return (['开心', '平静', '焦虑', '悲伤', '愤怒', '疲惫'].includes(a.type) && T(a.reason)) ? null : '心情类型或原因不完整';
      case 'study': { const n = +a.minutes; return (n >= 1 && n <= 600) ? null : '学习分钟数需在 1~600 之间'; }
      case 'fitness': { const n = +a.minutes; return (n >= 1 && n <= 600) ? null : '运动分钟数需在 1~600 之间'; }
      case 'steps': { const n = +a.count; return (n >= 0 && n <= 200000) ? null : '步数不像是真的（0~20 万）'; }
      case 'nap': return (TM.test(T(a.start)) && (!T(a.end) || TM.test(T(a.end)))) ? null : '午睡时间格式不对（HH:MM）';
      case 'goodNight': return TM.test(T(a.sleep)) ? null : '入睡时间格式不对（HH:MM）';
      case 'goodMorning': return TM.test(T(a.wake)) ? null : '起床时间格式不对（HH:MM）';
      case 'dream': return (T(a.content) && T(a.content).length <= 2000) ? null : '梦的内容不能为空';
      case 'diary': return T(a.content) ? null : '日记内容不能为空';
      case 'todo': return T(a.title) ? null : '待办事项不能为空';
      case 'expense': {
        const n = +a.amount;
        if (!(n > 0 && n <= 1000000)) return '金额需在 0.01~100 万之间';
        const EXP = ['med','meal','groceries','gym','study','traffic','util','housing','goods','phone','clothes','care','social','game','lottery','adult','other'];
        if (!EXP.includes(a.cat)) return '花销分类没对上号';
        return null;
      }
      case 'income': {
        const n = +a.amount;
        if (!(n > 0 && n <= 10000000)) return '金额需在 0.01~1000 万之间';
        const INC = ['salary','bonus','side','invest','redpack','refund','otherIn'];
        if (!INC.includes(a.cat)) return '收入分类没对上号';
        return null;
      }
      default: return '暂不支持这类记录';
    }
  },
  // 动作摘要（确认卡/回执上显示）
  _afu99ActSummary(a) {
    const T = (s) => String(s == null ? '' : s).trim();
    switch (a.act) {
      case 'water': return `喝水 ${Math.round(+a.ml)}ml`;
      case 'meal': { const W = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }[a.which] || '餐';
        return `${W}${a.mealType ? ' · ' + a.mealType : ''}${+a.cost > 0 ? ' · ' + a.cost + ' 元' : ''}`; }
      case 'mood': return `心情「${a.type}」${T(a.reason) ? ' · ' + T(a.reason) : ''}`;
      case 'study': return `学习 ${+a.minutes} 分钟`;
      case 'fitness': return `运动 ${+a.minutes} 分钟${Array.isArray(a.parts) && a.parts.length ? '（' + a.parts.join('/') + '）' : ''}`;
      case 'steps': return `步行 ${+a.count} 步`;
      case 'nap': return `午睡 ${T(a.start)}${T(a.end) ? ' → ' + T(a.end) : ' 起（还没醒）'}`;
      case 'goodNight': return `昨晚 ${T(a.sleep)} 入睡`;
      case 'goodMorning': return `今天 ${T(a.wake)} 起床`;
      case 'dream': return '记一个梦：' + (T(a.content).length > 40 ? T(a.content).slice(0, 40) + '…' : T(a.content));
      case 'diary': return '写一篇日记：' + (T(a.content).length > 40 ? T(a.content).slice(0, 40) + '…' : T(a.content));
      case 'todo': return `待办「${T(a.title)}」${T(a.date) ? ' · ' + T(a.date) : ''}`;
      case 'expense': {
        const c = (CONFIG.ledgerCategories || []).find(x => x.id === a.cat) || {};
        return `花销 ${c.icon || '💸'}${c.name || a.cat} · ¥${(+a.amount).toFixed(2)}${T(a.note) ? ' · ' + T(a.note) : ''}`;
      }
      case 'income': {
        const c = (CONFIG.ledgerIncomeCategories || []).find(x => x.id === a.cat) || {};
        return `收入 ${c.icon || '💰'}${c.name || a.cat} · ¥${(+a.amount).toFixed(2)}${T(a.note) ? ' · ' + T(a.note) : ''}`;
      }
      default: return JSON.stringify(a).slice(0, 60);
    }
  },
  // 入口：一个动作指令 → 直接执行（写回执消息）或出确认卡
  _afu99ActRun(a) {
    const msgs = Store.afuChatLoad();
    const bad = this._afu99ActInvalid(a);
    const conf = Math.min(1, Math.max(0, +a.conf || 0));
    if (bad || conf < 0.8) {
      msgs.push({ role: 'assistant', kind: 'act_pending', act: a, why: bad || '信息略有含糊', ts: new Date().toISOString() });
      Store.afuChatSave(msgs);
      this._afuChatRender();
      return;
    }
    this._afu99ActExec(a, msgs);
  },
  // 确认卡 →「确认记录」
  _afu99ActConfirm(idx) {
    const msgs = Store.afuChatLoad();
    const m = msgs[idx];
    if (!m || m.kind !== 'act_pending' || !m.act) return;
    this._afu99ActExec(m.act, msgs, idx);
  },
  // 确认卡 →「不是」
  _afu99ActCancel(idx) {
    const msgs = Store.afuChatLoad();
    const m = msgs[idx];
    if (!m || m.kind !== 'act_pending') return;
    m.kind = 'act_cancel';
    Store.afuChatSave(msgs);
    this._afuChatRender();
  },
  // 执行写库（统一入口）→ 回执消息（含 undo 令牌，可撤销）
  _afu99ActExec(a, msgs, replaceIdx) {
    msgs = msgs || Store.afuChatLoad();
    const dk = this._habit99Now ? this._habit99Now() : Store.today();
    const now = new Date().toTimeString().slice(0, 5);
    let receipt = '', undo = null;
    try {
      switch (a.act) {
        case 'water': {
          const ml = Math.round(+a.ml);
          const arr = Store.habit99Get(dk, 'water') || [];
          const prev = arr.reduce((s, x) => s + (+x.amount || 0), 0);
          Store.habit99Check(dk, 'water', { amount: ml });
          undo = { kind: 'arr', dk, cardId: 'water', idx: arr.length };
          receipt = `已记入习惯 · 喝水卡：本次 ${ml}ml，今日累计 ${prev + ml}ml（目标 ${this._hb99WaterGoal ? this._hb99WaterGoal() : 1300}ml）`;
          break;
        }
        case 'meal': {
          const payload = { time: now, foods: [], quality: 0, mealType: String(a.mealType || '居家'), cost: Math.round((+a.cost || 0) * 100) / 100, host: '' };
          Store.habit99Check(dk, a.which, payload);
          try { if (payload.cost > 0) this._hb99SyncMealCost(dk, a.which, payload, {}); } catch (e) {}
          undo = { kind: 'day', dk, cardId: a.which };
          const W = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }[a.which];
          receipt = `已打卡习惯 · ${W}卡（${payload.mealType}${payload.cost > 0 ? ' · ' + payload.cost + ' 元已同步经济数据' : ''}）`;
          break;
        }
        case 'mood': {
          const arr = Store.habit99Get(dk, 'mood') || [];
          Store.habit99Check(dk, 'mood', { type: String(a.type), reason: String(a.reason || '').slice(0, 100) });
          undo = { kind: 'arr', dk, cardId: 'mood', idx: arr.length };
          receipt = `已记入习惯 · 心情卡：「${a.type}」${a.reason ? ' · ' + a.reason : ''}`;
          break;
        }
        case 'study': {
          const h = new Date().getHours();
          const cardId = h < 12 ? 'studyMorning' : (h < 18 ? 'studyNoon' : 'studyEvening');
          const arr = Store.habit99Get(dk, cardId) || [];
          Store.habit99Check(dk, cardId, { durationMin: Math.round(+a.minutes) });
          undo = { kind: 'arr', dk, cardId, idx: arr.length };
          receipt = `已记入习惯 · 学习卡（${h < 12 ? '晨' : (h < 18 ? '午' : '晚')}段）：${Math.round(+a.minutes)} 分钟`;
          break;
        }
        case 'fitness': {
          Store.habit99Check(dk, 'fitness', { parts: Array.isArray(a.parts) && a.parts.length ? a.parts.map(String) : ['综合'], minutes: Math.round(+a.minutes) });
          undo = { kind: 'day', dk, cardId: 'fitness' };
          receipt = `已打卡习惯 · 健身卡：${Math.round(+a.minutes)} 分钟${Array.isArray(a.parts) && a.parts.length ? '（' + a.parts.join('/') + '）' : ''}`;
          break;
        }
        case 'steps': {
          Store.habit99Check(dk, 'steps', { count: Math.round(+a.count) });
          undo = { kind: 'day', dk, cardId: 'steps' };
          receipt = `已记入习惯 · 步数卡：${Math.round(+a.count).toLocaleString()} 步`;
          break;
        }
        case 'nap': {
          Store.habit99Check(dk, 'noonNap', { start: String(a.start), end: String(a.end || ''), quality: 0 });
          undo = { kind: 'day', dk, cardId: 'noonNap' };
          receipt = `已记入习惯 · 午睡卡：${a.start}${a.end ? ' → ' + a.end : ' 入睡（醒后再补起床时间）'}`;
          break;
        }
        case 'goodNight': {
          Store.habit99Check(dk, 'goodNight', { sleep: String(a.sleep), quality: +a.quality || 0 });
          undo = { kind: 'day', dk, cardId: 'goodNight' };
          receipt = `已打卡习惯 · 晚安卡：${a.sleep} 入睡，好梦 🌙`;
          break;
        }
        case 'goodMorning': {
          Store.habit99Check(dk, 'goodMorning', { wake: String(a.wake), quality: +a.quality || 0 });
          undo = { kind: 'day', dk, cardId: 'goodMorning' };
          receipt = `已打卡习惯 · 早安卡：${a.wake} 起床，新的一天 🌅`;
          break;
        }
        case 'dream': {
          const d = Store.load();
          if (!Array.isArray(d.wbDreams99)) d.wbDreams99 = [];
          const text = String(a.content || '').slice(0, 2000);
          d.wbDreams99.unshift({
            id: Store._id(), date: Store.today(), ts: new Date().toISOString(),
            title: '', raw: text, text,
            mood: 0, lucid: !!a.lucid, wake: this._dream99WakeWindow ? this._dream99WakeWindow() : false,
            polished: false, byAfu: true,
          });
          Store.save(d);
          undo = { kind: 'dream', id: d.wbDreams99[0].id };
          receipt = '已收进【记录 → 梦境本】——醒来第一句就告诉阿福，这个习惯很棒 🌙';
          break;
        }
        case 'diary': {
          const entry = Store.addDiary({ date: Store.today(), title: String(a.title || '').slice(0, 60), content: String(a.content || '').slice(0, 5000), tags: [], mood: 0, images: [] });
          if (!entry) throw new Error('日记内容为空');
          undo = { kind: 'diary', id: entry.id };
          receipt = '已存入【记录 → 日记】——想改排版可以去日记页编辑 ✏️';
          break;
        }
        case 'todo': {
          const date = String(a.date || '') && /^\d{4}-\d{2}-\d{2}$/.test(String(a.date || '')) ? a.date : Store.today();
          const r = Store.addTodoPlan(String(a.title).slice(0, 60), date, 2);
          if (!r.ok) throw new Error(r.msg || '添加失败');
          undo = { kind: 'todo', id: r.plan.id };
          receipt = `已加入【记录 → 待办】（${date}${a.date ? '' : ' · 今天'} · 🌱 重要不紧急象限）`;
          break;
        }
        case 'expense': {
          // 违规分类（游戏/彩票/成人）自动打警示标——与手动记账一致
          const VIO = ['game', 'lottery', 'adult'];
          const e = Store.addLedger({
            amount: Math.round(+a.amount * 100) / 100,
            category: String(a.cat),
            note: String(a.note || '').slice(0, 60),
            violation: VIO.includes(a.cat),
            type: 'expense',
          });
          if (!e) throw new Error('金额无效');
          undo = { kind: 'ledger', id: e.id };
          const c = (CONFIG.ledgerCategories || []).find(x => x.id === a.cat) || {};
          const sum = Store.ledgerSummary();
          let tip = '';
          if (VIO.includes(a.cat)) tip = '——这笔属于违规消费，已打 ⚠ 警示标，阿福不多说，但账都记着';
          else if (a.cat === 'meal') tip = '（三餐吃喝走三餐打卡会自动同步，直接说的花销也给你记上了）';
          receipt = `已记入【经济数据 · 支出】：${c.icon || '💸'}${c.name || a.cat} ¥${(+a.amount).toFixed(2)}，本月支出 ¥${sum.monthTotal.toFixed(2)}${tip}`;
          break;
        }
        case 'income': {
          const e = Store.addLedger({
            amount: Math.round(+a.amount * 100) / 100,
            category: String(a.cat),
            note: String(a.note || '').slice(0, 60),
            type: 'income',
          });
          if (!e) throw new Error('金额无效');
          undo = { kind: 'ledger', id: e.id };
          const c = (CONFIG.ledgerIncomeCategories || []).find(x => x.id === a.cat) || {};
          const sumIn = Store.ledgerSummaryIncome();
          receipt = `已记入【经济数据 · 收入】：${c.icon || '💰'}${c.name || a.cat} +¥${(+a.amount).toFixed(2)}，本月收入 ¥${sumIn.monthTotal.toFixed(2)} 💰`;
          break;
        }
        default: throw new Error('暂不支持的动作');
      }
    } catch (e) {
      const m = { role: 'assistant', kind: 'act_fail', text: '记录时出了点问题：' + ((e && e.message) || '请稍后再试'), ts: new Date().toISOString() };
      if (replaceIdx != null) msgs[replaceIdx] = m; else msgs.push(m);
      Store.afuChatSave(msgs);
      this._afuChatRender();
      return;
    }
    const m = { role: 'assistant', kind: 'act', act: a, text: receipt, undo, ts: new Date().toISOString() };
    if (replaceIdx != null) msgs[replaceIdx] = m; else msgs.push(m);
    Store.afuChatSave(msgs);
    this._afuChatRender();
    // 联动刷新当前视图（如在首页则打卡卡即时更新）
    try { if (this.currentView === 'dashboard' && this.render_dashboard) this.render_dashboard(); } catch (e) {}
  },
  // 撤销（仅逆向本条记录本身；三餐花费已入账的流水不自动回滚，回执有提示）
  _afu99ActUndo(idx) {
    const msgs = Store.afuChatLoad();
    const m = msgs[idx];
    if (!m || m.kind !== 'act' || !m.undo) return;
    try {
      const u = m.undo;
      if (u.kind === 'arr' || u.kind === 'day') {
        const d = Store.load();
        const day = ((d.habit99 || {}).days || {})[u.dk] || {};
        if (u.kind === 'arr') { if (Array.isArray(day[u.cardId])) day[u.cardId].splice(u.idx, 1); }
        else delete day[u.cardId];
        Store.save(d);
      } else if (u.kind === 'dream') {
        const d = Store.load();
        d.wbDreams99 = (d.wbDreams99 || []).filter(x => x.id !== u.id);
        Store.save(d);
      } else if (u.kind === 'diary') {
        Store.delDiary(u.id);
      } else if (u.kind === 'todo') {
        Store.delTodoPlan(u.id);
      } else if (u.kind === 'ledger') {
        const d = Store.load();
        d.ledger = (d.ledger || []).filter(x => x.id !== u.id);
        Store.save(d);
      }
      m.kind = 'act_undone';
      Store.afuChatSave(msgs);
      this._afuChatRender();
      this._flash('↩️ 已撤销刚才那条记录');
      try { if (this.currentView === 'dashboard' && this.render_dashboard) this.render_dashboard(); } catch (e) {}
    } catch (e) { this._flash('撤销失败：' + ((e && e.message) || '请手动到对应板块删除')); }
  },
  // 动作卡 HTML（_afuChatRender 调用；i = 消息下标）
  _afu99ActCard(m, i) {
    const lab = (this._AFU99_ACT_LABEL || {})[m.act && m.act.act] || '📋 记录';
    if (m.kind === 'act_pending') {
      return `<div class="afu-act afu-act-pending">
        <div class="afu-act-hd">${lab} · 需要确认</div>
        <div class="afu-act-bd">阿福理解你要记录：<b>${this.esc(this._afu99ActSummary(m.act))}</b></div>
        <div class="afu-act-why">${this.esc(m.why || '信息略有含糊，确认一下再记')}</div>
        <div class="afu-act-btns">
          <button class="btn btn-primary btn-sm" style="margin:0" onclick="App._afu99ActConfirm(${i})">✓ 确认记录</button>
          <button class="btn btn-ghost btn-sm" style="margin:0" onclick="App._afu99ActCancel(${i})">不是</button>
        </div></div>`;
    }
    if (m.kind === 'act') {
      return `<div class="afu-act afu-act-done">
        <div class="afu-act-hd">✅ ${lab}</div>
        <div class="afu-act-bd">${this.esc(m.text || '')}</div>
        <div class="afu-act-btns"><button class="afu-act-undo" onclick="App._afu99ActUndo(${i})">↩️ 撤销</button></div></div>`;
    }
    if (m.kind === 'act_cancel') {
      return `<div class="afu-act afu-act-off">🚫 已取消：${this.esc(this._afu99ActSummary(m.act || {}))}</div>`;
    }
    if (m.kind === 'act_undone') {
      return `<div class="afu-act afu-act-off">↩️ 已撤销：${this.esc(this._afu99ActSummary(m.act || {}))}</div>`;
    }
    if (m.kind === 'act_fail') {
      return `<div class="afu-act afu-act-fail">⚠️ ${this.esc(m.text || '记录失败')}</div>`;
    }
    return '';
  },

  // ==================== v12.9.24 聊天语音输入（🎤 点按说话 → 实时转写进输入框 → 用户确认发送）====================
  // 复用拾梦页（76-dream99.js）的成熟模式：SpeechRecognition zh-CN + 静音自动续听；
  // 文字先进输入框由用户确认发送——这就是语音的天然二次确认。
  _afuVoiceBtnState(on) {
    const b = document.getElementById('afuVoiceBtn');
    if (!b) return;
    b.classList.toggle('rec', !!on);
    b.textContent = on ? '⏺️' : '🎤';
    b.title = on ? '正在听…点击结束' : '语音输入';
    const inp = document.getElementById('afuChatInput');
    if (inp && on) inp.placeholder = '🎧 正在听你说…（说完点 ⏺️ 结束，再发送）';
    else if (inp) inp.placeholder = '说一句就帮你记录，如「喝了300ml水」「做了个梦…」';
  },
  afuVoiceToggle() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return this._flash('🎤 当前浏览器不支持语音识别（Chrome / Edge / 安卓微信内置浏览器效果最佳）');
    if (this._afuVRecOn) {
      this._afuVRecOn = false;
      try { this._afuVRec && this._afuVRec.stop(); } catch (e) {}
      return;
    }
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.continuous = true;
    rec.interimResults = true;
    const inp = () => document.getElementById('afuChatInput');
    let base = (inp() && inp().value) || '';
    rec.onresult = (e) => {
      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (final) base += final;
      const el = inp();
      if (el) el.value = (base + interim).slice(0, 2000);
    };
    rec.onerror = (e) => {
      if (e && e.error === 'not-allowed') { this._afuVRecOn = false; this._afuVoiceBtnState(false); this._flash('🎤 麦克风权限被拒绝——请在浏览器地址栏允许麦克风后重试'); }
    };
    rec.onend = () => {
      if (this._afuVRecOn && inp()) { try { rec.start(); return; } catch (e) {} } // 静音期自动续听
      this._afuVRecOn = false;
      this._afuVoiceBtnState(false);
    };
    this._afuVRec = rec;
    this._afuVRecOn = true;
    try { rec.start(); } catch (e) { this._afuVRecOn = false; return this._flash('🎤 语音识别启动失败——再点一次试试'); }
    this._afuVoiceBtnState(true);
  },
});
