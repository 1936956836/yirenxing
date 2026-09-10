// 88-quiz99-data.js —— v12.9.3 【练习站】题库 · 核心四科（英语/政治/高数/计算机）
// [功能组] G3-学习成长（相近功能跨分区归组 · 改动牵连排查与数据共享请按组检索）
// 面向专升本（兼考研/四六级/计算机二级）大学生，按【题型】组织（非难度分级）：
//   · 每题元信息：适用阶段（题组级）、是否真题、考察频次、考察知识点（作答后展示）
//   · 紧凑元组格式：[题干, 选项A, 选项B, 选项C, 选项D, 答案索引0-3, 解析, 知识点, 真题0|1, 频次]
//   · 词汇题组由 data.js 记忆词池（CONFIG.workbench.memoryWords_*）运行时生成（词义四选一，干扰项确定性取样）
//   · 综合小测题组直接复用 data.js subjectBanks（专升本四科 12 题/科，含解析）
// 90-study99-quiz.js 负责解析与渲染；专业课题库见 89-quiz99-major.js。
window.QZ99 = {

  // 阶段标签（题组级 badge）
  stages: { zb:'专升本', cet4:'四级', cet6:'六级', ky:'考研', cs2:'计算机二级', prof:'专业课' },

  // ==================== 科目与题型 ====================
  core: {
    en:   { name:'英语', icon:'🔤', types:[
      { t:'vocab', n:'词汇' }, { t:'read', n:'阅读' }, { t:'listen', n:'听力' }, { t:'trans', n:'翻译' }, { t:'write', n:'作文' }] },
    pol:  { name:'政治', icon:'🏛️', types:[
      { t:'my', n:'马原' }, { t:'mzd', n:'毛中特' }, { t:'sx', n:'思修法基' }, { t:'sz', n:'时政' }] },
    math: { name:'高数', icon:'📐', types:[
      { t:'lim', n:'极限' }, { t:'der', n:'导数' }, { t:'int', n:'积分' }, { t:'ode', n:'微分方程' }, { t:'ser', n:'级数' }] },
    cs:   { name:'计算机', icon:'💻', types:[
      { t:'base', n:'计算机基础' }, { t:'os', n:'操作系统' }, { t:'net', n:'网络' }, { t:'prog', n:'编程' },
      { t:'db', n:'数据库' }, { t:'ds', n:'数据结构' }, { t:'office', n:'办公软件' }] },
  },

  // ==================== 核心四科题组 ====================
  sets: [

    // ---------- 英语 · 词汇（运行时由记忆词池生成：61+57+60+60 = 238 题） ----------
    { id:'en_vocab_zb',   sub:'en', type:'vocab', stage:'zb',   name:'专升本核心词汇', ico:'📘', desc:'词义四选一', gen:{ pool:'memoryWords_ZB' } },
    { id:'en_vocab_cet4', sub:'en', type:'vocab', stage:'cet4', name:'四级高频词汇',    ico:'📗', desc:'词义四选一', gen:{ pool:'memoryWords_CET4' } },
    { id:'en_vocab_cet6', sub:'en', type:'vocab', stage:'cet6', name:'六级核心词汇',    ico:'📙', desc:'词义四选一', gen:{ pool:'memoryWords_CET6' } },
    { id:'en_vocab_ky',   sub:'en', type:'vocab', stage:'ky',   name:'考研核心词汇',    ico:'📕', desc:'词义四选一', gen:{ pool:'memoryWords_KY' } },

    // ---------- 英语 · 阅读（短文 + 3 题） ----------
    { id:'en_read_zb', sub:'en', type:'read', stage:'zb', name:'专升本 · 阅读理解', ico:'📄', desc:'3 篇短文 × 3 题', reads:[
      { p:'For many college students, memorizing English words is the biggest headache. Researchers have found that spaced repetition—reviewing a word at longer and longer intervals—is much more effective than cramming. When you review a word right before you are about to forget it, the memory becomes stronger and lasts longer. Experts suggest reviewing new words after one day, three days, one week and one month. Besides, using a word in your own sentences helps turn passive vocabulary into active vocabulary.', qs:[
        ['According to the passage, which method is more effective for memorizing words?','Cramming the night before the exam.','Spaced repetition with longer and longer intervals.','Reading the word list once a week.','Copying every word ten times.',1,'第一段第二句直接指出 spaced repetition（间隔重复）比 cramming（突击背诵）有效得多。','主旨细节',1,'高频'],
        ['According to the passage, when is the best time to review a word?','Right after you have just learned it.','When the teacher asks you to do so.','Right before you are about to forget it.','After the final exam is over.',2,'原文：When you review a word right before you are about to forget it, the memory becomes stronger。','细节理解',1,'高频'],
        ['What helps turn passive vocabulary into active vocabulary?','Using the word in your own sentences.','Listening to English songs every day.','Reading the dictionary from cover to cover.','Writing down the word twenty times.',0,'原文末句：using a word in your own sentences helps turn passive vocabulary into active vocabulary。','细节理解',0,'中频'],
      ]},
      { p:'The school library has changed its opening hours. From March 1st, it will open at 8:00 a.m. and close at 10:00 p.m. on weekdays. On weekends, it opens from 9:00 a.m. to 5:00 p.m. Students must show their student ID cards when entering. Borrowed books should be returned within 30 days; otherwise, a fine of 0.2 yuan per day will be charged. Food and drinks are not allowed in the reading rooms.', qs:[
        ['On weekdays, the library closes at _____.','8:00 p.m.','9:00 p.m.','10:00 p.m.','5:00 p.m.',2,'原文：close at 10:00 p.m. on weekdays（工作日晚十点闭馆）。','细节理解',0,'高频'],
        ['If a book is returned late, the student will be fined _____.','0.2 yuan in total','0.2 yuan per day','2 yuan per day','30 yuan in total',1,'原文：a fine of 0.2 yuan per day will be charged（每天罚 0.2 元）。','细节理解',0,'高频'],
        ['Which of the following is TRUE according to the notice?','Students may drink water in the reading rooms.','The library opens at 9:00 a.m. on weekdays.','Students must show student ID cards to enter.','Books can be kept for 60 days.',2,'原文：Students must show their student ID cards when entering；食物饮料禁止入内；工作日 8 点开门；借期 30 天。','细节判断',0,'中频'],
      ]},
      { p:'More and more college students take part-time jobs. Working part-time helps students gain work experience and improve communication skills. It also allows them to earn some pocket money and understand how hard it is to make a living. However, spending too much time on part-time jobs may affect study. Experts believe that students should not work more than 20 hours a week and should always put study first.', qs:[
        ['What may happen if students spend too much time on part-time jobs?','Their study may be affected.','They will lose all their friends.','They cannot graduate at all.','They will earn much more money.',0,'原文：spending too much time on part-time jobs may affect study。','细节理解',0,'高频'],
        ['According to experts, students should work at most _____ a week.','10 hours','15 hours','20 hours','40 hours',2,'原文：students should not work more than 20 hours a week。','细节理解',1,'高频'],
        ['What do experts suggest students should put first?','Part-time jobs.','Study.','Pocket money.','Work experience.',1,'原文末句：should always put study first。','细节理解',0,'中频'],
      ]},
    ]},
    { id:'en_read_ky', sub:'en', type:'read', stage:'ky', name:'考研 · 阅读理解', ico:'📑', desc:'3 篇文章 × 3 题', reads:[
      { p:'The sharing economy has changed the way people consume services. Platforms connect those who have idle resources with those who need them, making use of cars, rooms and skills that would otherwise be wasted. Supporters say it raises efficiency and creates jobs. Critics, however, point out that it pushes costs and risks onto workers, who enjoy neither the security of employment nor the protection of labor laws. Whether the sharing economy benefits society depends largely on how it is regulated.', qs:[
        ['The essence of the sharing-economy model lies in _____.','replacing all traditional industries','connecting idle resources with those who need them','making every worker self-employed','reducing the price of everything',1,'第一段第二句：Platforms connect those who have idle resources with those who need them。','主旨细节',1,'中频'],
        ['Critics of the sharing economy are worried that _____.','it wastes too many resources','it creates no jobs at all','workers lack security and legal protection','platforms earn too little profit',2,'原文：pushes costs and risks onto workers, who enjoy neither the security of employment nor the protection of labor laws。','观点态度',1,'中频'],
        ['According to the author, the key factor deciding whether the sharing economy benefits society is _____.','technology','regulation','market size','advertising',1,'末句：depends largely on how it is regulated。','推理判断',0,'中频'],
      ]},
      { p:'Contrary to the popular belief that multitasking saves time, studies show that the human brain cannot truly perform two attention-demanding tasks at once. What we call multitasking is in fact rapid switching between tasks, and every switch carries a cost: refocusing takes time and errors become more likely. Heavy media multitaskers are often worse at filtering out irrelevant information than light multitaskers. To work more efficiently, researchers suggest batching similar tasks and turning off notifications.', qs:[
        ['According to the passage, what people call "multitasking" is actually _____.','doing two things perfectly at the same time','rapid switching between tasks','a skill that everyone can master','a way to avoid all errors',1,'原文：What we call multitasking is in fact rapid switching between tasks。','细节理解',0,'中频'],
        ['According to the passage, every switch between tasks brings _____.','better memory and focus','extra time and more errors','stronger attention muscles','lower energy consumption',1,'原文：every switch carries a cost: refocusing takes time and errors become more likely。','细节理解',0,'中频'],
        ['To work more efficiently, researchers suggest _____.','doing as many tasks as possible at once','batching similar tasks and turning off notifications','working late into the night','avoiding all kinds of technology',1,'末句：researchers suggest batching similar tasks and turning off notifications。','细节理解',0,'低频'],
      ]},
      { p:'In an age of algorithms, people tend to read what they already agree with. Recommendation systems learn our preferences and keep feeding us similar content, which quietly narrows the range of ideas we meet. Scholars call these "filter bubbles": we live inside a personalized information environment without realizing it. Breaking the bubble requires deliberate effort—reading sources we disagree with, and noticing when a feed makes us feel comfortable all the time. Comfort, in this sense, may be a warning sign rather than a blessing.', qs:[
        ['A "filter bubble" refers to _____.','a tool that filters spam emails','a personalized information environment that narrows the ideas we meet','a library with limited books','a social network of old friends',1,'原文：we live inside a personalized information environment without realizing it，且它 narrows the range of ideas。','词义理解',0,'中频'],
        ['According to the passage, filter bubbles are mainly caused by _____.','the decline of printing','recommendation systems learning our preferences','poor reading habits of the elderly','expensive books',1,'原文：Recommendation systems learn our preferences and keep feeding us similar content。','因果细节',0,'中频'],
        ['The author implies that feeling comfortable with a feed all the time may be _____.','a sign that the bubble exists','proof of high-quality content','a blessing for learners','the goal of reading',0,'末句：Comfort ... may be a warning sign rather than a blessing（舒适感可能是警示信号）。','推理判断',0,'低频'],
      ]},
    ]},

    // ---------- 英语 · 听力（对话文字版，暂无音频） ----------
    { id:'en_listen_zb', sub:'en', type:'listen', stage:'zb', name:'专升本 · 听力对话', ico:'🎧', desc:'短对话理解（文字版）', reads:[
      { p:'M: The lecture starts at 9 o\'clock, right?\nW: It was, but it\'s been moved to 10.', qs:[
        ['When will the lecture start?','At 9:00.','At 10:00.','At 9:30.','It has been cancelled.',1,'女士说"it\'s been moved to 10"——讲座改到 10 点。','时间细节',0,'高频'] ]},
      { p:'W: I\'d like to return this shirt.\nM: Is there anything wrong with it?\nW: No, it\'s just too small for me.', qs:[
        ['Why does the woman want to return the shirt?','It is broken.','It is too expensive.','It is too small.','She doesn\'t like its color.',2,'女士说"it\'s just too small for me"——尺码太小。','原因细节',0,'高频'] ]},
      { p:'M: Shall we take the bus or walk?\nW: It\'s only two stops away. Let\'s walk.', qs:[
        ['How will they get to the place?','By bus.','On foot.','By taxi.','By bike.',1,'女士说"It\'s only two stops away. Let\'s walk"——步行前往。','方式细节',0,'中频'] ]},
      { p:'W: Did you finish the report?\nM: Not yet. I\'ll hand it in tomorrow morning.', qs:[
        ['When will the man hand in the report?','This afternoon.','Tomorrow morning.','Tomorrow evening.','Next week.',1,'男士说"I\'ll hand it in tomorrow morning"——明早交。','时间细节',0,'高频'] ]},
      { p:'M: Would you like coffee or tea?\nW: Coffee, please. Without sugar.', qs:[
        ['What does the woman want?','Tea with sugar.','Coffee with sugar.','Coffee without sugar.','Nothing to drink.',2,'女士要咖啡，且"Without sugar"——不加糖的咖啡。','细节理解',0,'中频'] ]},
      { p:'W: The museum is free on Mondays.\nM: Great! Let\'s go next Monday then.', qs:[
        ['When will they go to the museum?','This Friday.','This Monday.','Next Monday.','Next weekend.',2,'男士说"Let\'s go next Monday then"——下周一去。','时间细节',0,'中频'] ]},
      { p:'M: I missed the last bus.\nW: You can take a taxi or call your brother.\nM: A taxi is too expensive.', qs:[
        ['What will the man probably do?','Take a taxi.','Call his brother.','Walk home.','Stay at school.',1,'出租车太贵被排除，剩下"call your brother"。','推理判断',0,'中频'] ]},
      { p:'W: How was the interview?\nM: I think I did well, but they said they would call me in a week.', qs:[
        ['When will the man know the result?','Right away.','In three days.','In a week.','In a month.',2,'男士说"they would call me in a week"——一周内通知。','时间细节',0,'中频'] ]},
      { p:'M: It\'s raining again.\nW: The weather report says it will be sunny tomorrow.', qs:[
        ['What will the weather be like tomorrow?','Rainy.','Sunny.','Windy.','Snowy.',1,'女士转述天气预报"it will be sunny tomorrow"——明天晴。','细节理解',0,'高频'] ]},
      { p:'W: Professor Wang\'s office hour is from 2 to 4 this afternoon.\nM: Oh, I have a class at 3.\nW: Then you\'d better go at 2.', qs:[
        ['When should the man go to Professor Wang\'s office?','At 2.','At 3.','At 4.','Tomorrow morning.',0,'男士 3 点有课，女士建议"you\'d better go at 2"。','时间推理',0,'中频'] ]},
    ]},

    // ---------- 英语 · 翻译（选择正确译文） ----------
    { id:'en_trans_zb', sub:'en', type:'trans', stage:'zb', name:'专升本 · 翻译', ico:'🌐', desc:'中译英 · 选出正确译文', qs:[
      ['只有通过努力工作，我们才能成功。','Only through hard work we can succeed.','Only through hard work can we succeed.','Only if hard work we can succeed.','Only by hard work we will succeed.',1,'Only + 状语置于句首时，主句需部分倒装：can 提到主语 we 之前。','倒装句',1,'高频'],
      ['这本书比我预想的有趣得多。','This book is very more interesting than I expected.','This book is far more interesting than I expected.','This book is much interesting than I expected.','This book is more much interesting than expected.',1,'修饰比较级用 much/far/a lot；"much interesting"错误（interesting 是多音节形容词）。','比较结构',0,'高频'],
      ['直到昨天我才知道这个消息。','Until yesterday I knew the news.','It was not until yesterday that I learned the news.','Not until yesterday I learned the news.','I didn\'t know the news until yesterday that it was.',1,'"It is not until...that..."是强调句型；若用 Not until 开头则句子需倒装（Not until yesterday did I learn...）。','强调句/倒装',1,'高频'],
      ['他不仅聪明而且勤奋。','He not only is clever but also diligent.','He is not only clever but also diligent.','Not only he is clever but also diligent.','He is not only clever but diligent also.',1,'not only...but also 连接两个并列的表语时应放在表语之前；放句首时才需倒装。','并列结构',0,'中频'],
      ['我越想越喜欢这个主意。','The more I think, the more I like the idea.','More I think, more I like this idea.','When I think more, I like the idea more.','The much I think, the much I like it.',0,'"the + 比较级, the + 比较级"固定句型，前后分句都必须带 the。','比较句型',1,'高频'],
      ['这座桥是十年前建造的。','This bridge built ten years ago.','This bridge was built ten years ago.','This bridge has built for ten years.','This bridge is built ten years before.',1,'一般过去时的被动语态 was built（十年前建造）。','被动语态',0,'高频'],
      ['我习惯每天早起。','I am used to get up early every day.','I am used to getting up early every day.','I used to getting up early every day.','I use to get up early every day.',1,'be used to doing（习惯于做）与 used to do（过去常常做）的区别；to 是介词，后接动名词。','固定搭配',1,'高频'],
      ['他花了三个小时做完作业。','He spent three hours to finish his homework.','It took him three hours finish his homework.','It took him three hours to finish his homework.','He cost three hours finishing his homework.',2,'It takes sb. some time to do sth.；spend 需用 spend...doing 结构。','句型辨析',0,'高频'],
      ['没有你的帮助，我不可能完成这项工作。','Without your help, I can\'t have finished the work.','Without your help, I couldn\'t have finished the work.','Without your help, I couldn\'t finish the work yesterday.','If no your help, I couldn\'t finish it.',1,'对过去的虚拟：couldn\'t have done（过去做不到却做到了）。','虚拟语气',1,'高频'],
      ['她建议我们早点出发。','She suggested us to set off early.','She suggested that we set off early.','She suggested that we would set off early.','She suggested that we will set off early.',1,'suggest 后接虚拟语气：that + 主语 + (should) + 动词原形。','虚拟语气',1,'高频'],
      ['一回到家，他就开始做作业。','As soon as arriving home, he began his homework.','On arriving home, he began to do his homework.','He had hardly arrived home than he began his homework.','When arrived home, he did homework.',1,'"on + 动名词"表"一……就"；hardly...when（不是 than，than 配 no sooner）。','固定结构',0,'中频'],
      ['这是我看过的最好的电影。','This is the best movie I have ever seen.','This is the best movie I have never seen.','This is the best movie which I have ever seen it.','This is a best movie I have seen.',0,'最高级 best + 定语从句（关系词省略），ever 与完成时连用加强"迄今为止"。','定语从句/最高级',1,'中频'],
    ]},

    // ---------- 英语 · 作文（框架与方法） ----------
    { id:'en_write_mix', sub:'en', type:'write', stage:'zb', name:'作文 · 框架与模板', ico:'✍️', desc:'谋篇布局 · 主题句 · 应用文格式', qs:[
      ['议论文开头段的主要作用是 _____.','罗举所有论据','引出话题并表明观点','详细介绍作者背景','给出全部数据',1,'开头段：引入话题 + 亮明立场，为下文论证张本。','篇章结构',0,'高频'],
      ['图表作文（图画/表格作文）第一段通常应写 _____.','自己的心情','对图表主要数据或趋势的客观描述','对出题人的猜测','完全照抄图表所有数字',1,'图表作文首段须概述图表反映的核心信息/趋势。','图表作文',1,'高频'],
      ['"On the one hand..., on the other hand..."用于 _____.','表示时间顺序','从正反/两方面展开论述','表示因果关系','总结全文',1,'该衔接词组引出问题的两个方面，用于对比论述。','衔接词',0,'高频'],
      ['议论文结尾段的作用不包括 _____.','总结重申观点','提出建议或展望','呼应开头','引入一个全新的争议话题',3,'结尾段收束全文；引入全新话题属于跑题。','篇章结构',0,'中频'],
      ['下列哪一句是有效的主题句（topic sentence）？','For example, I get up at six.','Regular exercise benefits both body and mind.','It is very very important, I think.','There are many things in the world.',1,'主题句应是概括段落大意的完整判断句；其余是细节、空话或例子。','段落写作',0,'高频'],
      ['英文书信中 "Yours sincerely" 属于 _____.','称谓（salutation）','正文（body）','结尾敬语（complimentary close）','信内地址（inside address）',2,'"Yours sincerely"是信末的结束语/敬语，位于签名之上。','应用文格式',0,'中频'],
      ['传统英文书信的日期通常写在信件的 _____.','左上角','右上角','正中央','右下角',1,'英文书信 heading（地址与日期）位于右上角。','应用文格式',0,'低频'],
      ['下列哪种手段最能提升文章的连贯性（coherence）？','多用生僻大词','合理使用过渡词（first, however, therefore 等）','把所有句子写成一样长','每句都用感叹号',1,'过渡词标示逻辑关系，是衔接句段的核心手段。','写作技巧',0,'中频'],
    ]},

    // ---------- 政治 ----------
    { id:'pol_my_zb', sub:'pol', type:'my', stage:'zb', name:'马原 · 哲学与政经', ico:'🧭', desc:'唯物论 · 辩证法 · 政治经济学', qs:[
      ['哲学的基本问题是 _____.','理论和实践的关系问题','思维和存在的关系问题','物质和运动的关系问题','个人和社会的关系问题',1,'恩格斯：全部哲学，特别是近代哲学的重大的基本问题，是思维和存在的关系问题。','哲学基本问题',1,'高频'],
      ['马克思主义哲学的直接理论来源是 _____.','古希腊朴素唯物主义','德国古典哲学','英国经验论','法国空想社会主义',1,'马哲批判吸收黑格尔辩证法与费尔巴哈唯物主义的合理内核。','马克思主义来源',0,'高频'],
      ['物质的唯一特性是 _____.','运动','可知性','客观实在性','广延性',2,'列宁物质定义：物质是标志客观实在的哲学范畴，客观实在性是唯一特性。','物质观',1,'高频'],
      ['运动和物质的关系是 _____.','运动是物质的载体','物质是运动的形式','运动是物质的根本属性和存在方式','物质是运动的主体和形式',2,'物质都是运动着的物质，运动是物质的根本属性与存在方式。','物质与运动',0,'高频'],
      ['矛盾的两个基本属性是 _____.','普遍性和特殊性','同一性和斗争性','绝对性和相对性','客观性和主观性',1,'矛盾双方既对立（斗争性）又统一（同一性）。','矛盾论',1,'高频'],
      ['量变质变规律揭示了事物发展的 _____.','源泉和动力','形式和状态','方向和道路','结构和功能',1,'质变互变揭示发展过程中的渐进与飞跃——形式与状态。','三大规律',0,'中频'],
      ['认识的本质是主体对客体的 _____.','直观反映','能动反映','消极接受','绝对摹写',1,'马克思主义认识论：能动的反映论（包含选择、建构与创造）。','认识论',0,'中频'],
      ['实践的基本形式中，最基本的是 _____.','生产实践','阶级斗争','科学实验','教育实践',0,'物质生产实践是人类最基本的实践活动，是其他实践的基础。','实践观',0,'高频'],
      ['社会存在与社会意识的关系是 _____.','社会意识决定社会存在','社会存在决定社会意识','二者相互决定','二者毫无关系',1,'历史唯物主义基本原理：社会存在决定社会意识。','唯物史观',1,'高频'],
      ['生产力中最活跃的因素是 _____.','劳动资料','劳动对象','劳动者','生产工具',2,'劳动者是生产力中最活跃、能动的要素；生产工具是发展水平的标志。','生产力',0,'中频'],
      ['商品经济的基本规律是 _____.','价值规律','剩余价值规律','竞争规律','供求规律',0,'价值规律（价格围绕价值波动）是商品经济的基本规律。','政治经济学',0,'高频'],
      ['剩余价值的唯一源泉是 _____.','不变资本','可变资本（雇佣工人的剩余劳动）','机器设备','流通领域',1,'剩余价值由雇佣工人剩余劳动创造；不变资本只转移价值。','剩余价值',1,'高频'],
      ['资本主义经济危机的实质是 _____.','生产绝对过剩','生产相对过剩','需求绝对不足','通货膨胀',1,'危机实质是生产相对于劳动人民有支付能力需求的过剩。','经济危机',0,'中频'],
      ['共产主义社会个人消费品的分配原则是 _____.','按劳分配','各尽所能、按需分配','平均分配','按资分配',1,'共产主义高级阶段实行"各尽所能、按需分配"。','科学社会主义',0,'中频'],
    ]},
    { id:'pol_mzd_zb', sub:'pol', type:'mzd', stage:'zb', name:'毛中特 · 理论体系', ico:'📖', desc:'毛泽东思想 · 中国特色社会主义', qs:[
      ['毛泽东思想活的灵魂的三个基本方面是 _____.','武装斗争、统一战线、党的建设','实事求是、群众路线、独立自主','土地革命、武装夺权、根据地建设','理论联系实际、密切联系群众、批评与自我批评',1,'1981 年历史决议概括：实事求是、群众路线、独立自主。','毛泽东思想',1,'高频'],
      ['毛泽东思想的精髓是 _____.','群众路线','独立自主','实事求是','武装斗争',2,'实事求是是马克思主义中国化理论成果的精髓。','毛泽东思想',1,'高频'],
      ['中国革命的三大法宝是 _____.','统一战线、武装斗争、党的建设','土地革命、武装斗争、根据地建设','理论建设、组织建设、作风建设','政治领导、思想领导、组织领导',0,'毛泽东在《〈共产党人〉发刊词》中提出三大法宝。','新民主主义革命',1,'高频'],
      ['新民主主义革命的领导阶级是 _____.','农民阶级','民族资产阶级','无产阶级（通过中国共产党）','小资产阶级',2,'新民主主义革命是无产阶级领导的、人民大众的反帝反封建革命。','新民主主义革命',0,'高频'],
      ['"工农武装割据"的基本内容是 _____.','武装斗争','土地革命','农村革命根据地','党的领导',1,'土地革命是基本内容，武装斗争是主要形式，根据地是战略阵地。','革命道路',0,'中频'],
      ['我国对个体农业进行社会主义改造遵循的原则是 _____.','自愿互利、典型示范、国家帮助','强制入社、统一分配','保存富农经济','先机械化后集体化',0,'农业合作化坚持自愿互利、典型示范、国家帮助原则。','社会主义改造',0,'中频'],
      ['党的十一届三中全会作出的历史性决策是 _____.','开展土地改革','把工作重心转移到经济建设上来、实行改革开放','发动大跃进','建立人民公社',1,'1978 年十一届三中全会：工作重心转移+改革开放。','改革开放',1,'高频'],
      ['邓小平理论首要的基本理论问题是 _____.','什么是社会主义、怎样建设社会主义','建设什么样的党、怎样建设党','实现什么样的发展、怎样发展','什么是和谐社会',0,'邓小平理论系统回答了"什么是社会主义、怎样建设社会主义"。','邓小平理论',1,'高频'],
      ['新时代之前，我国社会主要矛盾是 _____.','人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾','人民日益增长的物质文化需要同落后的社会生产之间的矛盾','无产阶级和资产阶级的矛盾','经济发展与生态保护的矛盾',1,'旧主要矛盾（八大提法）：物质文化需要 vs 落后的社会生产。','社会主要矛盾',1,'高频'],
      ['新时代我国社会主要矛盾是 _____.','人民日益增长的物质文化需要同落后的社会生产之间的矛盾','人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾','生产力与生产关系的矛盾','改革与稳定的矛盾',1,'十九大提出：美好生活需要 vs 不平衡不充分的发展。','社会主要矛盾',1,'高频'],
      ['"五位一体"总体布局是指 _____.','经济建设、政治建设、文化建设、社会建设、生态文明建设','工业、农业、国防、科技、教育现代化','改革、发展、稳定、创新、开放','政治、经济、军事、外交、党建',0,'五位一体：经济、政治、文化、社会、生态文明。','总体布局',1,'高频'],
      ['全面深化改革的总目标是 _____.','全面建成小康社会','完善和发展中国特色社会主义制度、推进国家治理体系和治理能力现代化','实现共同富裕','建成社会主义现代化强国',1,'十八届三中全会提出全面深化改革总目标。','全面深化改革',1,'高频'],
    ]},
    { id:'pol_sx_zb', sub:'pol', type:'sx', stage:'zb', name:'思修与法律基础', ico:'⚖️', desc:'人生观 · 道德 · 法治', qs:[
      ['人生观的核心是 _____.','人生态度','人生目的','人生价值','人生理想',1,'人生目的决定人生态度与价值评判，是人生观的核心。','人生观',0,'高频'],
      ['中国精神是 _____.','以爱国主义为核心的民族精神和以改革创新为核心的时代精神','以集体主义为核心的民族精神','以艰苦奋斗为核心的创业精神','以诚信为核心的道德精神',0,'伟大创造/奋斗/团结/梦想精神凝聚为以爱国主义为核心的民族精神+以改革创新为核心的时代精神。','中国精神',1,'高频'],
      ['社会主义核心价值观中属于国家层面的价值目标是 _____.','自由、平等、公正、法治','富强、民主、文明、和谐','爱国、敬业、诚信、友善','创新、协调、绿色、开放',1,'国家层面：富强民主文明和谐；社会层面：自由平等公正法治；个人层面：爱国敬业诚信友善。','核心价值观',1,'高频'],
      ['社会主义道德建设的核心是 _____.','集体主义','为人民服务','诚实守信','爱祖国',1,'为人民服务是核心，集体主义是原则。','道德建设',0,'中频'],
      ['我国宪法的地位是 _____.','普通法律','国家的根本法、具有最高法律效力','政府规章','行政法规',1,'宪法是根本法，一切法律法规不得与其相抵触。','宪法',1,'高频'],
      ['全面依法治国的总目标是 _____.','建设中国特色社会主义法治体系、建设社会主义法治国家','有法可依、有法必依','执法必严、违法必究','依法行政',0,'总目标：法治体系+法治国家。','法治建设',1,'高频'],
      ['职业道德的基本要求不包括 _____.','爱岗敬业','诚实守信','办事公道','好逸恶劳',3,'职业道德：爱岗敬业、诚实守信、办事公道、热情服务、奉献社会。','职业道德',0,'中频'],
      ['家庭美德的基本规范不包括 _____.','尊老爱幼','男女平等','夫妻和睦','锱铢必较',3,'家庭美德：尊老爱幼、男女平等、夫妻和睦、勤俭持家、邻里团结。','家庭美德',0,'低频'],
      ['《中华人民共和国民法典》被誉为 _____.','治国安邦的总章程','社会生活的百科全书','权利的宣言书','经济宪法',1,'民法典调整平等主体间人身财产关系，被称为"社会生活的百科全书"。','法律常识',0,'中频'],
      ['理想信念的基本特征是 _____.','现实性、具体性、稳定性','超越性、时代性、实践性','主观性、随意性、短暂性','抽象性、绝对性、永恒性',1,'理想具有超越性、时代性、实践性。','理想信念',0,'中频'],
    ]},
    { id:'pol_sz_zb', sub:'pol', type:'sz', stage:'zb', name:'时政 · 新思想要点', ico:'🇨🇳', desc:'中国式现代化 · 新发展理念', qs:[
      ['实现中华民族伟大复兴的正确道路是 _____.','西方现代化道路','中国式现代化','计划经济道路','闭关锁国',1,'中国式现代化是强国建设、民族复兴的康庄大道。','中国式现代化',1,'高频'],
      ['全面建设社会主义现代化国家的首要任务是 _____.','高质量发展','高速增长','扩大出口','规模扩张',0,'二十大报告：高质量发展是全面建设社会主义现代化国家的首要任务。','高质量发展',1,'高频'],
      ['新发展理念的内容是 _____.','创新、协调、绿色、开放、共享','改革、发展、稳定、创新、开放','富强、民主、文明、和谐、美丽','自由、平等、公正、法治、爱国',0,'五大新发展理念：创新协调绿色开放共享。','新发展理念',1,'高频'],
      ['到 2035 年，我国人均国内生产总值预计达到 _____.','发达国家水平','中等发达国家水平','发展中国家平均水平','最发达国家水平',1,'2035 远景目标：人均 GDP 达到中等发达国家水平。','远景目标',0,'中频'],
      ['乡村振兴战略的总要求是 _____.','生产发展、生活宽裕、乡风文明','产业兴旺、生态宜居、乡风文明、治理有效、生活富裕','农业现代化、农村城市化','增产增收',1,'二十字总要求：产业兴旺、生态宜居、乡风文明、治理有效、生活富裕。','乡村振兴',0,'高频'],
      ['我国的根本政治制度是 _____.','人民代表大会制度','多党合作和政治协商制度','民族区域自治制度','基层群众自治制度',0,'人大制度是根本政治制度；后三项为基本政治制度。','政治制度',1,'高频'],
      ['"绿水青山就是金山银山"理念强调 _____.','先发展后治理','生态环境保护与经济发展的辩证统一','完全禁止开发','以牺牲环境换取增长',1,'"两山"理念揭示保护生态就是保护生产力。','生态文明',1,'高频'],
      ['构建新发展格局的关键在于 _____.','扩大对外开放规模','经济循环的畅通无阻','增加外汇储备','完全依赖出口',1,'新发展格局：以国内大循环为主体、国内国际双循环相互促进，关键在经济循环畅通无阻。','新发展格局',0,'中频'],
    ]},
    { id:'pol_mix_zb', sub:'pol', type:'my', stage:'zb', name:'政治 · 综合小测', ico:'📝', desc:'跨题型综合 · 每日轮换', gen:{ bank:'politics' } },

    // ---------- 高数 ----------
    { id:'math_lim_zb', sub:'math', type:'lim', stage:'zb', name:'极限 · 计算与概念', ico:'➡️', desc:'重要极限 · 无穷小比较', qs:[
      ['lim(x→0) sin3x / x = _____.','1/3','1','3','∞',2,'sin3x ~ 3x，故 sin3x/x → 3。','等价无穷小',1,'高频'],
      ['lim(x→0) (1 - cos x) / x² = _____.','0','1/2','1','2',1,'1-cosx ~ x²/2。','等价无穷小',1,'高频'],
      ['lim(x→∞) (3x² + 1) / (x² + 2x) = _____.','0','1','3','∞',2,'分子分母同除 x²，得 3。','无穷远极限',0,'高频'],
      ['lim(x→0) ln(1 + 2x) / x = _____.','0','1','2','e²',2,'ln(1+2x) ~ 2x。','等价无穷小',1,'高频'],
      ['lim(x→0) (e^x - 1) / x = _____.','0','1/2','1','e',2,'e^x - 1 ~ x。','等价无穷小',0,'高频'],
      ['lim(x→2) (x² - 4) / (x - 2) = _____.','0','2','4','不存在',2,'约去零因子：x²-4=(x-2)(x+2)，极限为 2+2=4。','零因子约去',0,'高频'],
      ['lim(x→∞) (1 + 1/x)^x = _____.','1','e','∞','0',1,'第二重要极限：→ e。','重要极限',1,'高频'],
      ['lim(x→0) tan 2x / 3x = _____.','2/3','1','3/2','1/3',0,'tan2x ~ 2x，2x/3x = 2/3。','等价无穷小',0,'中频'],
      ['lim(x→1) (x³ - 1) / (x - 1) = _____.','1','2','3','∞',2,'x³-1=(x-1)(x²+x+1)，极限 = 3。','零因子约去',0,'中频'],
      ['当 x→0 时，x 与 2x 相比是 _____.','等价无穷小','同阶但不等价的无穷小','高阶无穷小','低阶无穷小',1,'lim x/2x = 1/2 ≠ 1：同阶不等价。','无穷小比较',0,'中频'],
      ['lim(x→0⁺) 1/x = _____.','0','1','+∞','-∞',2,'x→0⁺ 时 1/x → +∞（右极限不存在于有限值）。','单侧极限',0,'中频'],
      ['lim(x→0) (sin x - x) / x³ = _____.','0','-1/6','1/6','1',1,'泰勒展开 sinx = x - x³/6 + o(x³)，故 (sinx-x)/x³ → -1/6。','泰勒展开',0,'低频'],
    ]},
    { id:'math_der_zb', sub:'math', type:'der', stage:'zb', name:'导数 · 求导与应用', ico:'📐', desc:'求导公式 · 切线 · 单调性', qs:[
      ['(sin x)\' = _____.','cos x','-cos x','sin x','-sin x',0,'基本求导公式。','基本导数',1,'高频'],
      ['(x³)\' = _____.','x²','3x','3x²','2x³',2,'幂函数：(xⁿ)\' = n·xⁿ⁻¹。','基本导数',0,'高频'],
      ['(e^{2x})\' = _____.','e^{2x}','2e^{2x}','e^{2x}/2','2xe^{2x}',1,'复合求导：外层 e^u 导 e^u，内层 2x 导 2。','复合函数求导',1,'高频'],
      ['(ln x)\' = _____.','1/x','ln x','x','1/ln x',0,'(lnx)\' = 1/x（x>0）。','基本导数',0,'高频'],
      ['(cos 2x)\' = _____.','sin 2x','-2 sin 2x','2 sin 2x','-sin 2x',1,'复合求导：-sin2x · 2。','复合函数求导',0,'高频'],
      ['曲线 y = x² 在点 (1, 1) 处切线的斜率是 _____.','1','2','3','1/2',1,'y\' = 2x，x=1 时斜率 = 2。','切线斜率',1,'高频'],
      ['(arctan x)\' = _____.','1/(1+x²)','1/(1-x²)','1/x','-1/(1+x²)',0,'反三角求导公式。','基本导数',0,'中频'],
      ['(x·ln x)\' = _____.','1 + ln x','ln x','x','1/x',0,'乘积求导：1·lnx + x·(1/x) = lnx + 1。','乘法求导',0,'高频'],
      ['(tan x)\' = _____.','sec²x','csc²x','sec x tan x','-sec²x',0,'(tanx)\' = sec²x = 1/cos²x。','基本导数',0,'中频'],
      ['函数 f(x) = x² - 4x 的单调递增区间是 _____.','(-∞, 2)','(2, +∞)','(-∞, -2)','(-2, +∞)',1,'f\' = 2x - 4 > 0 → x > 2。','单调性',1,'高频'],
      ['(a^x)\' = _____.','a·x^{a-1}','a^x','a^x ln a','x ln a',2,'指数函数求导：(a^x)\' = a^x ln a。','基本导数',0,'中频'],
      ['设 y = x ln x，则 dy = _____.','dx','ln x dx','(ln x + 1) dx','x dx',2,'dy = y\'dx = (lnx + 1)dx。','微分计算',0,'中频'],
    ]},
    { id:'math_int_zb', sub:'math', type:'int', stage:'zb', name:'积分 · 不定与定积分', ico:'∫', desc:'基本积分 · 牛顿-莱布尼茨', qs:[
      ['∫₀¹ 2x dx = _____.','1/2','1','2','3/2',1,'原函数 x²，代入得 1² - 0² = 1。','定积分计算',1,'高频'],
      ['∫ 1/x dx = _____.','ln x + C','ln|x| + C','1/x² + C','x/1 + C',1,'∫1/x dx = ln|x| + C（注意绝对值）。','基本积分',1,'高频'],
      ['∫ cos x dx = _____.','sin x + C','-sin x + C','cos x + C','-cos x + C',0,'基本积分公式。','基本积分',0,'高频'],
      ['∫₀^{π/2} sin x dx = _____.','0','1/2','1','π/2',2,'原函数 -cosx：-cos(π/2) + cos0 = 0 + 1 = 1。','定积分计算',1,'高频'],
      ['∫ e^x dx = _____.','e^x + C','e^{x+1} + C','x e^x + C','e^x · x + C',0,'基本积分公式。','基本积分',0,'高频'],
      ['∫ x·e^{x²} dx = _____.','e^{x²} + C','(1/2)e^{x²} + C','2e^{x²} + C','e^{2x} + C',1,'凑微分 x dx = d(x²)/2，得 (1/2)e^{x²} + C。','凑微分法',0,'高频'],
      ['∫₀¹ 1/(1+x²) dx = _____.','π/4','π/2','1','ln 2',0,'原函数 arctanx：arctan1 - arctan0 = π/4。','定积分计算',1,'高频'],
      ['∫ sec²x dx = _____.','tan x + C','sec x + C','cot x + C','-tan x + C',0,'基本积分公式。','基本积分',0,'中频'],
      ['∫₁^e (1/x) dx = _____.','0','1','e','1/e',1,'原函数 lnx：lne - ln1 = 1 - 0 = 1。','定积分计算',0,'高频'],
      ['∫ (2x + 1) dx = _____.','x² + x + C','2x² + x + C','x² + C','2 + C',0,'逐项积分。','不定积分',0,'高频'],
      ['∫₀¹ x·e^x dx = _____.','0','1','e','e - 1',1,'分部积分：xe^x - e^x |₀¹ = (e - e) - (0 - 1) = 1。','分部积分',0,'中频'],
      ['∫₀^{π/2} sin²x dx = _____.','1/2','π/4','π/2','1',1,'降幂 sin²x = (1-cos2x)/2，积分为 π/4。','定积分计算',0,'低频'],
    ]},
    { id:'math_ode_zb', sub:'math', type:'ode', stage:'zb', name:'微分方程', ico:'〰️', desc:'一阶/二阶方程 · 特征方程', qs:[
      ['方程 y\' = 2x 的通解是 _____.','y = x² + C','y = 2 + C','y = x + C','y = 2x² + C',0,'两边积分：y = ∫2x dx = x² + C。','一阶方程',0,'高频'],
      ['方程 y\'\' + y = 0 的通解是 _____.','y = C₁e^x + C₂e^{-x}','y = C₁cos x + C₂sin x','y = (C₁ + C₂x)e^x','y = C₁e^{2x}',1,'特征方程 r² + 1 = 0 → r = ±i，通解为正余弦组合。','二阶常系数齐次',1,'高频'],
      ['方程 dy/dx = y 的通解是 _____.','y = e^x + C','y = Ce^x','y = x + C','y = Cx',1,'可分离变量：dy/y = dx → ln|y| = x + C₁ → y = Ce^x。','可分离变量',1,'高频'],
      ['方程 y\'\' - 2y\' + y = 0 的通解是 _____.','y = C₁e^x + C₂e^{-x}','y = (C₁ + C₂x)e^x','y = C₁cos x + C₂sin x','y = C₁ + C₂e^x',1,'特征方程 r²-2r+1=0 有二重根 r=1，通解乘 x。','二阶常系数齐次',1,'高频'],
      ['方程 y\' = e^x 的通解是 _____.','y = e^x + C','y = xe^x + C','y = C e^x','y = e^x/x + C',0,'直接积分。','一阶方程',0,'中频'],
      ['方程 y\' + y = 0 的通解是 _____.','y = Ce^x','y = Ce^{-x}','y = C₁ + C₂e^{-x}','y = Cx',1,'dy/y = -dx → y = Ce^{-x}。','一阶线性',0,'高频'],
      ['方程 y\'\' + 2y\' = 0 的通解是 _____.','y = C₁ + C₂e^{-2x}','y = C₁e^{2x} + C₂e^{-2x}','y = (C₁ + C₂x)e^{-2x}','y = C₁cos2x + C₂sin2x',0,'特征根 r = 0, -2 → C₁ + C₂e^{-2x}。','二阶常系数齐次',0,'中频'],
      ['一阶线性微分方程的标准形式是 _____.','y\' + P(x)y = Q(x)','y\' + Q(x)y = P(x)','y\' · P(x) = Q(x)','y\' = P(x) + Q(x)',0,'一阶线性方程标准形与通解公式的基础。','方程分类',0,'中频'],
    ]},
    { id:'math_ser_zb', sub:'math', type:'ser', stage:'zb', name:'级数 · 敛散与求和', ico:'♾️', desc:'p级数 · 几何级数 · 判别法', qs:[
      ['级数 Σ 1/n² (n=1→∞) 是 _____.','发散的','收敛的','条件收敛','无法判断',1,'p = 2 > 1，p-级数收敛。','p级数',1,'高频'],
      ['级数 Σ 1/n (调和级数) 是 _____.','收敛的','发散的','条件收敛','绝对收敛',1,'p = 1 的调和级数发散。','p级数',1,'高频'],
      ['级数 Σ (1/2)ⁿ (n=1→∞) 是 _____.','发散的','收敛的','条件收敛','振荡的',1,'几何级数 |q| = 1/2 < 1 收敛。','几何级数',0,'高频'],
      ['级数 Σ (1/2)ⁿ (n=0→∞) 的和是 _____.','1','2','1/2','∞',1,'首项 1，公比 1/2：S = 1/(1-1/2) = 2。','几何级数求和',1,'高频'],
      ['p-级数 Σ 1/n^p 收敛的条件是 _____.','p > 1','p ≥ 1','p > 0','p < 1',0,'p > 1 收敛，p ≤ 1 发散。','p级数',1,'高频'],
      ['级数 Σ 1/√n 是 _____.','收敛的','发散的','条件收敛','绝对收敛',1,'p = 1/2 ≤ 1，发散。','p级数',0,'中频'],
      ['级数收敛的必要条件是 _____.','aₙ > 0','lim aₙ = 0','aₙ 单调递增','aₙ ≤ 1/n',1,'通项趋于 0 是必要非充分条件（如调和级数）。','级数性质',0,'中频'],
      ['级数 Σ (-1)ⁿ/n 是 _____.','绝对收敛','发散','条件收敛','无法判断',2,'交错级数收敛（莱布尼茨），但 Σ1/n 发散 → 条件收敛。','交错级数',1,'中频'],
    ]},
    { id:'math_mix_zb', sub:'math', type:'lim', stage:'zb', name:'高数 · 综合小测', ico:'📝', desc:'跨题型综合 · 每日轮换', gen:{ bank:'math' } },

    // ---------- 计算机 ----------
    { id:'cs_base_zb', sub:'cs', type:'base', stage:'zb', name:'计算机基础', ico:'🖥️', desc:'硬件 · 数制 · 软件', qs:[
      ['计算机的中央处理器（CPU）主要由 _____.','运算器和控制器组成','运算器和存储器组成','控制器和输入设备组成','存储器和显示器组成',0,'CPU = 运算器（ALU）+ 控制器（CU）。','计算机组成',1,'高频'],
      ['计算机中存储信息的最小单位是 _____.','字节（Byte）','位（bit）','字（Word）','KB',1,'一个二进制位 bit 是最小单位；1 Byte = 8 bit。','数制与单位',1,'高频'],
      ['1 Byte 等于 _____.','4 bit','8 bit','16 bit','1024 bit',1,'1 字节 = 8 位。','数制与单位',0,'高频'],
      ['RAM 的特点是 _____.','断电后信息仍长期保存','断电后信息丢失','只能读不能写','存取速度最慢',1,'随机存取存储器 RAM 是易失性存储。','存储器',0,'高频'],
      ['计算机硬件系统的五大部件是 _____.','CPU、内存、硬盘、键盘、鼠标','运算器、控制器、存储器、输入设备、输出设备','主机、显示器、键盘、打印机、音箱','控制器、总线、接口、软件、电源',1,'冯·诺依曼结构五大部件。','计算机组成',1,'高频'],
      ['冯·诺依曼体系结构的核心思想是 _____.','采用二进制并存储程序','采用高级语言','采用图形界面','分布式计算',0,'存储程序、程序控制（二进制表示）。','体系结构',1,'高频'],
      ['十进制数 25 对应的二进制数是 _____.','10011','11001','10101','11100',1,'25 = 16+8+1 = 11001B。','数制转换',0,'高频'],
      ['二进制数 1011 对应的十进制数是 _____.','10','11','12','13',1,'8+0+2+1 = 11。','数制转换',0,'高频'],
      ['下列属于系统软件的是 _____.','操作系统','微信','Photoshop','王者荣耀',0,'操作系统、编译程序等属系统软件。','软件分类',0,'高频'],
      ['字长是指 CPU 一次能处理的 _____.','十进制位数','二进制位数','字符个数','字节数',1,'字长即一次并行处理的二进制位数（如 64 位 CPU）。','性能指标',0,'中频'],
    ]},
    { id:'cs_os_zb', sub:'cs', type:'os', stage:'zb', name:'操作系统', ico:'⚙️', desc:'进程 · 存储 · 调度', qs:[
      ['操作系统的作用是 _____.','管理计算机的硬件和软件资源','仅用于打字','只负责显示画面','编译高级语言',0,'OS 是管理资源、控制程序执行的系统软件。','操作系统概念',0,'高频'],
      ['进程是 _____.','程序本身','程序的一次执行过程，是资源分配的基本单位','一段数据','一种编程语言',1,'进程 = 程序 + 资源 + 执行；线程才是调度单位。','进程管理',1,'高频'],
      ['线程是 _____.','资源分配的基本单位','CPU 调度和分派的基本单位','一种文件','一种硬件',1,'线程拥有少量私有资源，是调度基本单位。','进程管理',0,'中频'],
      ['产生死锁的四个必要条件不包括 _____.','互斥条件','请求和保持','不剥夺条件','时间片轮转',3,'四条件：互斥、请求保持、不剥夺、循环等待。','死锁',1,'高频'],
      ['虚拟存储技术的主要作用是 _____.','提高 CPU 主频','扩充可用的逻辑地址空间','增加硬盘物理容量','加快网卡速度',1,'虚拟内存用外存扩充逻辑地址空间。','存储管理',0,'高频'],
      ['分时操作系统的主要特点是 _____.','交互性','单用户独占','无中断','批处理优先',0,'分时系统：多用户交互式共享 CPU。','操作系统类型',0,'中频'],
      ['下列不属于进程调度算法的是 _____.','先来先服务（FCFS）','短作业优先（SJF）','时间片轮转','二分查找',3,'二分查找是数据结构算法，非调度算法。','调度算法',0,'中频'],
    ]},
    { id:'cs_net_zb', sub:'cs', type:'net', stage:'zb', name:'计算机网络', ico:'🌐', desc:'体系结构 · 协议 · IP', qs:[
      ['OSI 参考模型中负责路由选择（选择传输路径）的是 _____.','物理层','数据链路层','网络层','传输层',2,'网络层通过 IP 协议进行路由选择。','OSI 模型',1,'高频'],
      ['关于 TCP 与 UDP，下列说法正确的是 _____.','TCP 无连接、UDP 面向连接','TCP 面向连接、可靠；UDP 无连接、不可靠','二者都面向连接','二者都不可靠',1,'TCP 提供可靠字节流服务，UDP 简单高效但不保证可靠。','传输层协议',1,'高频'],
      ['HTTP 协议的默认端口号是 _____.','21','25','80','443',2,'HTTP 默认 80 端口；HTTPS 443；FTP 21；SMTP 25。','常用端口',0,'高频'],
      ['DNS 的主要作用是 _____.','分配 IP 地址','将域名解析为 IP 地址','传输文件','发送邮件',1,'域名系统把域名翻译成 IP 地址。','应用层协议',1,'高频'],
      ['发送电子邮件使用的标准协议是 _____.','SMTP','FTP','HTTP','TFTP',0,'发送用 SMTP，接收用 POP3/IMAP。','应用层协议',0,'中频'],
      ['IPv6 地址的长度是 _____.','32 位','48 位','64 位','128 位',3,'IPv4 32 位，IPv6 128 位。','IP 地址',0,'中频'],
      ['网络交换机（Switch）工作在 OSI 的 _____.','物理层','数据链路层','网络层','应用层',1,'交换机基于 MAC 地址转发，属数据链路层。','网络设备',0,'中频'],
      ['WWW 服务器与浏览器之间传输网页使用的协议是 _____.','FTP','HTTP','SMTP','Telnet',1,'万维网以 HTTP/HTTPS 传输超文本。','应用层协议',0,'高频'],
    ]},
    { id:'cs_prog_zb', sub:'cs', type:'prog', stage:'zb', name:'程序设计基础', ico:'👨‍💻', desc:'C 语言 · 算法结构', qs:[
      ['一个 C 语言程序的执行总是从 _____.','程序第一个函数开始','main 函数开始','自定义函数开始','#include 开始',1,'C 程序从 main() 开始执行。','C 语言',1,'高频'],
      ['算法的三种基本结构是 _____.','输入、处理、输出','顺序、选择（分支）、循环','树、图、表','递归、迭代、并行',1,'结构化程序设计三大基本结构。','算法',0,'高频'],
      ['在 32 位系统中，int 型变量通常占用 _____.','1 字节','2 字节','4 字节','8 字节',2,'常见 32 位平台 int 为 4 字节。','数据类型',0,'中频'],
      ['C 语言中数组下标是从 _____ 开始的。','-1','0','1','任意',1,'C 数组下标从 0 开始。','数组',0,'高频'],
      ['for(int i = 0; i < 5; i++) 循环体共执行 _____ 次。','4','5','6','不确定',1,'i 取 0~4 共 5 次。','循环结构',0,'高频'],
      ['结构化程序设计的基本原则是 _____.','自顶向下、逐步求精、模块化','越快越好','尽量多用 goto','一个函数写完全部功能',0,'结构化程序设计原则。','程序设计方法',0,'中频'],
    ]},
    { id:'cs_db_zb', sub:'cs', type:'db', stage:'zb', name:'数据库基础', ico:'🗄️', desc:'SQL · 关系模型', qs:[
      ['SQL 中用于查询数据的语句是 _____.','SELECT','INSERT','UPDATE','DELETE',0,'查询用 SELECT。','SQL 语句',0,'高频'],
      ['关系数据库中，二维表的一行称为 _____.','字段','属性','记录（元组）','域',2,'行为元组/记录，列为属性/字段。','关系模型',1,'高频'],
      ['主键（Primary Key）的作用是 _____.','加密数据','唯一标识表中的每一条记录','连接网络','压缩数据',1,'主键取值唯一且非空，标识记录。','关系模型',0,'高频'],
      ['SQL 中向表插入数据的语句是 _____.','INSERT INTO','ADD INTO','UPDATE SET','PUT INTO',0,'INSERT INTO ... VALUES ...。','SQL 语句',0,'高频'],
      ['事务的 ACID 特性不包括 _____.','原子性（Atomicity）','一致性（Consistency）','隔离性（Isolation）','可移植性（Portability）',3,'ACID = 原子、一致、隔离、持久。','事务',0,'中频'],
      ['数据库设计的三大范式的主要目标是 _____.','消除数据冗余和操作异常','增加数据量','加快网络速度','美化表格',0,'规范化主要解决冗余与插入/删除/更新异常。','范式',0,'中频'],
    ]},
    { id:'cs_ds_zb', sub:'cs', type:'ds', stage:'zb', name:'数据结构', ico:'🌲', desc:'线性表 · 树 · 排序', qs:[
      ['栈的特点是 _____.','先进先出','后进先出（LIFO）','随机存取','无序',1,'栈：后进先出；队列：先进先出。','栈与队列',1,'高频'],
      ['队列的特点是 _____.','先进先出（FIFO）','后进先出','二分存取','只能从中间取',0,'队列：先进先出。','栈与队列',1,'高频'],
      ['对有序数组进行二分查找的前提条件是 _____.','元素个数大于 100','顺序存储且关键字有序','链式存储','元素为字符型',1,'二分查找要求随机存取（顺序存储）+ 有序。','查找',1,'高频'],
      ['n 个结点的完全二叉树的深度（高度）为 _____.','⌊log₂n⌋ + 1','n/2','n - 1','⌈n/2⌉',0,'完全二叉树深度公式。','二叉树',0,'中频'],
      ['二叉树的第 i 层最多有 _____ 个结点。','2i','2^(i-1)','2^i - 1','i²',1,'第 i 层最多 2^(i-1) 个结点。','二叉树',0,'中频'],
      ['冒泡排序的平均时间复杂度是 _____.','O(n)','O(n log n)','O(n²)','O(log n)',2,'冒泡排序平均/最坏均为 O(n²)。','排序',1,'高频'],
      ['快速排序在最坏情况下的时间复杂度是 _____.','O(n log n)','O(n²)','O(n)','O(log n)',1,'每次划分极不平衡时退化为 O(n²)。','排序',1,'中频'],
    ]},
    { id:'cs_office_cs2', sub:'cs', type:'office', stage:'cs2', name:'办公软件（计算机二级）', ico:'📊', desc:'Word · Excel · PPT', qs:[
      ['Word 中"样式"的主要作用是 _____.','改变文件大小','统一管理段落和字符格式','加密文档','插入图片',1,'样式统一控制格式，修改样式即全文联动。','Word',0,'高频'],
      ['Excel 中单元格地址 $A$1 属于 _____.','相对引用','混合引用','绝对引用','三维引用',2,'$ 行 $ 列 = 绝对引用，复制公式时不改变。','Excel',1,'高频'],
      ['Excel 中求平均值的函数是 _____.','SUM','AVERAGE','COUNT','MAX',1,'AVERAGE 求平均值。','Excel 函数',0,'高频'],
      ['Excel 中 =IF(A1>=60, "及格", "不及格") 的功能是 _____.','A1≥60 显示"及格"，否则显示"不及格"','A1=60 时显示"及格"','统计及格人数','删除不及格记录',0,'IF 条件判断函数。','Excel 函数',0,'高频'],
      ['Excel 中 VLOOKUP 函数的功能是 _____.','垂直查找','求和','排序','生成图表',0,'VLOOKUP 按列垂直查找匹配值。','Excel 函数',0,'中频'],
      ['Excel 中按条件计数的函数是 _____.','SUMIF','COUNTIF','IFERROR','RANK',1,'COUNTIF(区域, 条件) 统计满足条件的个数。','Excel 函数',1,'高频'],
      ['展示数据随时间变化的趋势，最合适的图表类型是 _____.','饼图','折线图','柱形图','雷达图',1,'折线图突出趋势变化；饼图突出占比。','Excel 图表',0,'高频'],
      ['展示各部分占总体的比例，最合适的图表是 _____.','饼图','折线图','散点图','面积图',0,'饼图表达占比构成。','Excel 图表',0,'高频'],
      ['PowerPoint 中"幻灯片母版"的主要作用是 _____.','放映幻灯片','统一设置幻灯片的版式与格式','打印讲义','压缩图片',1,'母版统一控制版式、字体、占位符格式。','PPT',1,'高频'],
      ['Word 中插入分页符的快捷键是 _____.','Ctrl + Enter','Ctrl + Shift','Alt + Enter','Shift + Space',0,'Ctrl+Enter 插入分页符。','Word',0,'中频'],
      ['Excel 中对数据排序时，"主要关键字"和"次要关键字"的关系是 _____.','同时生效','主关键字相同时按次要关键字排序','只按次要关键字排序','二者无关',1,'多级排序依次生效。','Excel',0,'中频'],
      ['Word 的"查找和替换"功能 _____ 用通配符进行模糊查找。','可以','不可以','只能查找英文','只能替换数字',0,'Word 查找替换支持 * ? 等通配符。','Word',0,'低频'],
    ]},
    { id:'cs_mix_zb', sub:'cs', type:'base', stage:'zb', name:'计算机 · 综合小测', ico:'📝', desc:'跨题型综合 · 每日轮换', gen:{ bank:'cs' } },
  ],
};
