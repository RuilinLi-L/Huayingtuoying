import type { TutorialModule } from '../types/tutorial';

const tutorialPath = (chapterId?: string) =>
  chapterId ? `/learn/fundamentals#${chapterId}` : '/learn/fundamentals';

const entryPath = (entryId: string) => `/entry/${entryId}`;
const experiencePath = (entryId: string) => `/experience/${entryId}`;

export const tutorials: TutorialModule[] = [
  {
    id: 'fundamentals',
    label: '节奏与乐理',
    title: '跟着乐器小人，把节奏与基础乐理先听懂。',
    subtitle: '不是脱离展陈的课堂，而是围绕现有实体入口展开的一条数字导学路径。',
    description:
      '先用小提琴、长笛和合奏底座这三个现有实体入口建立听感，再把拍点、拍号、音高、和声与织体串成一条零基础也能跟上的理解路径。',
    preface:
      '你现在看到的不是另一套独立课程，而是一层贴着实体小人和底座展陈生长出来的导学内容。先把耳朵准备好，再回到条目页和 AR 舞台，会更容易听出它们为什么值得停留。',
    homeTitle: '从乐器小人出发，先把节奏与基础乐理听懂。',
    homeSummary:
      '这套导学页把现有的小提琴、长笛与合奏底座变成三个知识入口。先理解拍点、时值、音高和织体，再回到展签、AR 与底座 Demo，会更容易听出结构差异。',
    heroNotes: ['5 章导学路径', '21 个入门概念', '3 个现有实体入口'],
    entrySpotlights: [
      {
        entryId: 'violin-dialogue',
        chapterId: 'pulse-and-gesture',
        label: '小提琴小人',
        title: '先从拍点、强弱和句法感受旋律为什么会“说话”',
        summary:
          '小提琴的线条最适合拿来理解脉冲、拍点和乐句推进。它像一张可被听见的导览卡，把抽象的节奏感落回到一条清晰旋律上。',
      },
      {
        entryId: 'flute-color',
        chapterId: 'rhythm-extension',
        label: '长笛小人',
        title: '把呼吸、速度和表情变化听成一条会流动的节奏线',
        summary:
          '长笛更适合承接附点、连音、速度和力度这些“会改变气息感”的概念。它让节奏不只剩下数拍，也能被感受到轻重和松紧。',
      },
      {
        entryId: 'ensemble-stage',
        chapterId: 'ensemble-observation',
        label: '合奏底座',
        title: '回到全编制去听拍号、层次、织体和和声怎样彼此支撑',
        summary:
          '底座示例最适合把前面学过的概念重新装回完整舞台。你会开始听见谁在带拍、谁在铺底、谁负责把色彩抬起来。',
      },
    ],
    chapters: [
      {
        id: 'pulse-and-gesture',
        shortLabel: '01 节奏入口',
        title: '先听见脉冲，再谈节奏。',
        intro:
          '很多人第一次接触音乐时，会把节奏理解成“快慢”或“敲得齐不齐”。但在展陈里，真正最先需要建立的是身体能不能感到一条稳定脉冲。',
        concepts: [
          {
            id: 'pulse',
            label: '脉冲',
            title: '脉冲像地板，不像装饰',
            summary:
              '脉冲是音乐里持续出现的均匀跳动，它不一定总被大声演奏，但它会在你心里形成一个稳定的落脚点。',
            takeaway:
              '当你能在心里跟住这条“地板”，后面听拍点、旋律和合奏层次都会容易很多。',
          },
          {
            id: 'beat',
            label: '拍点',
            title: '拍点是脉冲被组织之后的落点',
            summary:
              '脉冲像连续的心跳，拍点则是演奏者和听者约定好“哪一步算一步”的位置。拍点一旦清晰，旋律就不容易漂。',
            takeaway:
              '听不懂一段音乐时，先别急着找旋律，先找能反复踩到的拍点。',
          },
          {
            id: 'accent',
            label: '强弱',
            title: '强弱会告诉你哪里该被注意到',
            summary:
              '同样是连续拍点，强拍与弱拍会制造出重心。它让音乐不再是平铺直叙，而是带有朝向和动作感。',
            takeaway:
              '当你感觉某一拍“更站得住”，那往往就是强拍在帮你建立方向。',
          },
          {
            id: 'counting',
            label: '数拍',
            title: '数拍不是考试动作，而是建立共同时间感',
            summary:
              '数拍的目的不是背口诀，而是把个人听感变成可共享的时间语言。乐队里每个人都靠它确认自己何时进入、何时让位。',
            takeaway:
              '零基础时只要能稳定数到“1、2、3、4”，已经在为后面的拍号和合奏观察打底。',
          },
        ],
        examples: [
          {
            id: 'violin-pulse',
            label: '实体例子 A',
            title: '看小提琴小人怎样把拍点拉成会说话的旋律',
            description:
              '小提琴条目最适合作为第一个入口，因为它的线条清楚，拍点一旦站稳，旋律就会立刻显得更像一句完整的话，而不是一串随意的音。',
            observation:
              '先不要急着理解旋律高低，先听每个弓法落下去时，拍点有没有像脚步一样稳定地推动前进。',
            relatedEntryIds: ['violin-dialogue'],
            audioSrc: '/assets/audio/violin-rhythm.wav',
            audioLabel: '小提琴节奏示意',
            links: [
              {
                label: '打开小提琴展签',
                to: entryPath('violin-dialogue'),
                variant: 'ghost',
              },
              {
                label: '进入小提琴体验',
                to: experiencePath('violin-dialogue'),
              },
            ],
          },
          {
            id: 'ensemble-pulse',
            label: '实体例子 B',
            title: '在合奏底座里确认“大家一起往前”的共同脉搏',
            description:
              '当多位乐器小人同时进入舞台时，你会更清楚地感到脉冲不是某一个乐器专属的动作，而是整组编制共享的时间框架。',
            observation:
              '如果你能在底座示例里感到一条大家共同踩着的内部步伐，那就已经开始听见合奏最重要的秩序了。',
            relatedEntryIds: ['ensemble-stage'],
            audioSrc: '/assets/audio/ensemble-percussion.wav',
            audioLabel: '合奏底座节奏支撑',
            links: [
              {
                label: '打开合奏展签',
                to: entryPath('ensemble-stage'),
                variant: 'ghost',
              },
              {
                label: '查看底座 Demo',
                to: '/demo/base',
              },
            ],
          },
        ],
        reflection:
          '如果第一章只记住一件事，那就是：节奏先让你站稳，再让你觉得好听。实体小人不是摆件，而是帮你找到这条脉冲的入口。',
        continueTitle: '继续往下看什么？',
        continueDescription:
          '下一章把“拍点为什么长短不同、为什么会有 3/4 和 4/4”讲清楚，再回到《睡美人圆舞曲》的组织方式。',
        continueLinks: [
          {
            label: '跳到时值与拍号',
            to: tutorialPath('values-and-meter'),
          },
          {
            label: '先去看看小提琴条目',
            to: entryPath('violin-dialogue'),
            variant: 'ghost',
          },
        ],
      },
      {
        id: 'values-and-meter',
        shortLabel: '02 时值与拍号',
        title: '把长短关系和拍号读成一张时间地图。',
        intro:
          '当脉冲稳定之后，下一步不是记名词，而是理解不同音符时值怎样占用时间，以及拍号怎样决定一组拍点的重心分布。',
        concepts: [
          {
            id: 'durations',
            label: '时值',
            title: '时值是在说“这一步要占多久”',
            summary:
              '全音符、二分音符、四分音符和八分音符，本质上是在同一条时间线上占据不同长度。它们不是不同素材，而是不同的停留时间。',
            takeaway:
              '一旦能把长短关系听清，乐句为什么会显得舒展或紧凑就不再神秘。',
          },
          {
            id: 'rests',
            label: '休止',
            title: '休止不是空白，而是被安排好的沉默',
            summary:
              '音乐里停一下并不代表什么都没有发生。休止会让前后的动作更清楚，也让听者有机会感到呼吸和重心变化。',
            takeaway:
              '当某一拍突然“留白”，往往正是在强调下一次进入。',
          },
          {
            id: 'meter',
            label: '拍号',
            title: '拍号告诉你一组拍点怎样被打包',
            summary:
              '2/4、3/4、4/4、6/8 不只是数字差别，而是在决定“每几拍形成一个小单位、哪一拍更重”。这会直接改变音乐的走路方式。',
            takeaway:
              '拍号听懂之后，你会发现同样快慢的音乐，走起来也可能完全不同。',
          },
          {
            id: 'waltz',
            label: '圆舞感',
            title: '3/4 拍的圆舞感来自重心轮转',
            summary:
              '圆舞曲并不是每一拍都一样重。第一拍更稳，后两拍更轻，像一个转身动作里的落脚、带起和滑开。',
            takeaway:
              '听《睡美人圆舞曲》时，先抓第一拍的落脚感，整个舞步就会浮出来。',
          },
        ],
        examples: [
          {
            id: 'ensemble-waltz',
            label: '实体例子 A',
            title: '在合奏底座里听 3/4 拍怎样把圆舞感托起来',
            description:
              '全编制示例最适合用来理解拍号，因为不同声部会把同一拍号的不同功能分担开来：有人落脚，有人衔接，有人把舞步抬起来。',
            observation:
              '试着把“强、弱、弱”默念出来，再听底座里的每个层次是不是都在帮助第一拍站得更稳。',
            relatedEntryIds: ['ensemble-stage'],
            audioSrc: '/assets/audio/ensemble-strings.wav',
            audioLabel: '合奏底座弦乐层',
            links: [
              {
                label: '打开合奏展签',
                to: entryPath('ensemble-stage'),
                variant: 'ghost',
              },
              {
                label: '进入合奏体验',
                to: experiencePath('ensemble-stage'),
              },
            ],
          },
          {
            id: 'violin-duration',
            label: '实体例子 B',
            title: '小提琴的长短线条会让时值差异变得特别明显',
            description:
              '单独观察小提琴时，你会更容易听见某些音为什么像“站住”，某些音为什么像“掠过”。这就是时值在塑造动作感。',
            observation:
              '把注意力放在“音到底拉了多久”，而不是“它有多高”，你会更快听出时值如何影响句法。',
            relatedEntryIds: ['violin-dialogue'],
            audioSrc: '/assets/audio/violin-melody.wav',
            audioLabel: '小提琴旋律示意',
            links: [
              {
                label: '回到小提琴展签',
                to: entryPath('violin-dialogue'),
                variant: 'ghost',
              },
              {
                label: '继续学下一章',
                to: tutorialPath('rhythm-extension'),
              },
            ],
          },
        ],
        reflection:
          '实体展陈中的每一个小人都像在帮你占一个时间位置。拍号和时值听懂后，你会更容易判断谁在落脚、谁在铺垫、谁在牵引舞步。',
        continueTitle: '继续往下延伸',
        continueDescription:
          '再往下就不是“怎么数”这么简单了，而是开始理解附点、连音、切分、速度和力度怎样改变节奏的表情。',
        continueLinks: [
          {
            label: '跳到节奏延伸',
            to: tutorialPath('rhythm-extension'),
          },
          {
            label: '查看底座 Demo',
            to: '/demo/base',
            variant: 'ghost',
          },
        ],
      },
      {
        id: 'rhythm-extension',
        shortLabel: '03 节奏延伸',
        title: '当节奏开始带表情，音乐才真正活起来。',
        intro:
          '节奏不是只有整齐和准确。附点、连音、切分、速度和力度，会让同样的拍子长出松紧、呼吸和情绪方向。',
        concepts: [
          {
            id: 'dotted',
            label: '附点',
            title: '附点会把重心往后轻轻拉开',
            summary:
              '附点最常见的感受不是“多出一个点”，而是原本规整的步伐被稍微拉长，产生一种更有弹性的摆动。',
            takeaway:
              '听到有些音像被稍稍拖住一下，再顺势滑开，那通常就是附点在参与塑形。',
          },
          {
            id: 'tie',
            label: '连音',
            title: '连音会让两步动作像一口气完成',
            summary:
              '连音把本来分开的落点连成一条线，让音乐少一点棱角，多一点流动。它对木管和弦乐的句法感影响尤其明显。',
            takeaway:
              '当声音听起来不是一颗颗落下，而像一整段气息推过去，通常就能从连音的角度去理解。',
          },
          {
            id: 'syncopation',
            label: '切分',
            title: '切分会故意把注意力移到你没想到的地方',
            summary:
              '切分并不是乱，而是把本该弱的位置推到前台，让人产生一点失重和提拉感。这会让节奏更有悬念。',
            takeaway:
              '当你突然觉得音乐“往前探了一下”，可以试着把它理解成重心被挪动。',
          },
          {
            id: 'tempo-dynamics',
            label: '速度与力度',
            title: '速度和力度是在调节节奏的体感温度',
            summary:
              '同样的节奏，如果更轻、更慢，会显得更像悬浮；更强、更快，则更像推进。它们不是额外装饰，而是在重塑同一套拍点的气质。',
            takeaway:
              '节奏一旦和速度、力度绑在一起，听感就会从“会数”变成“会感受”。',
          },
        ],
        examples: [
          {
            id: 'flute-breath',
            label: '实体例子 A',
            title: '长笛小人最适合拿来理解呼吸怎样改变节奏线条',
            description:
              '长笛不像打击乐那样强调边界，它更容易把附点、连音和速度变化表现成一条呼吸线。对零基础用户来说，这个入口最能感到“节奏也有气口”。',
            observation:
              '先听句子是不是像一口气吹出去，再观察它在哪些位置放松、在哪些位置重新抬头。',
            relatedEntryIds: ['flute-color'],
            audioSrc: '/assets/audio/flute-air.wav',
            audioLabel: '长笛呼吸示意',
            links: [
              {
                label: '打开长笛展签',
                to: entryPath('flute-color'),
                variant: 'ghost',
              },
              {
                label: '进入长笛体验',
                to: experiencePath('flute-color'),
              },
            ],
          },
          {
            id: 'flute-tempo',
            label: '实体例子 B',
            title: '同一条长笛线在不同速度和力度下会像完全不同的动作',
            description:
              '如果把长笛理解成一支会移动的画笔，那么速度和力度就是在改笔触。它们不会改变拍号，却会改变整个段落的情绪温度。',
            observation:
              '当声音更轻更松时，它更像擦过空气；当声音更亮更集中时，它又会把节奏边缘勾得更清楚。',
            relatedEntryIds: ['flute-color', 'ensemble-stage'],
            audioSrc: '/assets/audio/flute-pulse.wav',
            audioLabel: '长笛脉冲示意',
            links: [
              {
                label: '查看合奏里的长笛位置',
                to: entryPath('ensemble-stage'),
                variant: 'ghost',
              },
              {
                label: '跳到乐理基础',
                to: tutorialPath('theory-basics'),
              },
            ],
          },
        ],
        reflection:
          '节奏一旦和呼吸、速度、力度结合，实体小人就不再只是“哪件乐器”的说明，而会变成“这段动作是怎么活起来的”示范件。',
        continueTitle: '接下来补哪块基础？',
        continueDescription:
          '下一章把音高、音阶、音程、和弦和织体这些常见乐理词汇，用和展陈场景更接近的语言重新讲一遍。',
        continueLinks: [
          {
            label: '跳到乐理基础',
            to: tutorialPath('theory-basics'),
          },
          {
            label: '回到长笛条目',
            to: entryPath('flute-color'),
            variant: 'ghost',
          },
        ],
      },
      {
        id: 'theory-basics',
        shortLabel: '04 乐理基础',
        title: '把音高、和弦和织体从术语变成听得见的关系。',
        intro:
          '前面三章解决的是时间问题，这一章开始处理“声音彼此怎样站位”。音高、音阶、音程、和弦和织体，其实都在回答关系，而不只是名词。',
        concepts: [
          {
            id: 'pitch',
            label: '音高',
            title: '音高是在说声音站得更高还是更低',
            summary:
              '音高不是抽象刻度，而是声音位置的上下关系。旋律之所以会有起伏感，就是因为这些位置变化被组织起来了。',
            takeaway:
              '当你觉得旋律“抬起来了”或“落下来了”，其实已经在感受音高关系。',
          },
          {
            id: 'scale',
            label: '音阶',
            title: '音阶像一套常用的台阶顺序',
            summary:
              '作曲家不会在每一段都随意挑音，音阶提供了一套更常用的上下移动范围，让旋律既自由又不至于失去语言习惯。',
            takeaway:
              '把音阶理解成“常走的路”，比把它背成单词表更有帮助。',
          },
          {
            id: 'interval',
            label: '音程',
            title: '音程是在测两点之间隔了多远',
            summary:
              '两个音之间的距离决定了它听起来更贴近、更舒展还是更张开。音程越会被感到，旋律性格就越鲜明。',
            takeaway:
              '当你感觉某次跳进很明显，那往往就是音程差在塑造性格。',
          },
          {
            id: 'chord',
            label: '和弦',
            title: '和弦是在同一时刻把多个位置叠在一起',
            summary:
              '和弦的意义不只是“同时响”。它会给旋律提供背景重心，让前景线条有依托，也让听感更厚。',
            takeaway:
              '旋律像前台人物，和弦则像决定光线和空气的空间背景。',
          },
          {
            id: 'texture',
            label: '织体',
            title: '织体是在看谁在前、谁在后、谁在填满空间',
            summary:
              '当多个声部同时存在时，重要的不只是“有几个声部”，还包括它们如何分层、如何互相让位、如何共同撑出场面。',
            takeaway:
              '织体听懂之后，合奏不会再像一团声音，而会变成有前后关系的景深。',
          },
        ],
        examples: [
          {
            id: 'violin-pitch',
            label: '实体例子 A',
            title: '小提琴让音高和音程的起伏最容易被直接听见',
            description:
              '因为小提琴旋律线清晰，它特别适合拿来理解音高如何上行、下行，以及较大的跳进为什么会制造情绪转折。',
            observation:
              '试着把旋律当作一条会起伏的线，而不是一个个单点，你会更快听到音高关系。',
            relatedEntryIds: ['violin-dialogue'],
            audioSrc: '/assets/audio/violin-melody.wav',
            audioLabel: '小提琴旋律线',
            links: [
              {
                label: '打开小提琴条目',
                to: entryPath('violin-dialogue'),
                variant: 'ghost',
              },
              {
                label: '去看合奏里的层次',
                to: tutorialPath('ensemble-observation'),
              },
            ],
          },
          {
            id: 'ensemble-harmony',
            label: '实体例子 B',
            title: '合奏底座最适合拿来听和弦与织体如何托住前景',
            description:
              '底座里的多条音轨会让和弦、背景织体和前景旋律的关系变得特别明显。你可以直接听见“少一个层次以后，空间为什么会塌一点”。',
            observation:
              '不要只盯着最显眼的旋律，试着问自己：是谁在铺底、是谁在补色、是谁在把场面撑开？',
            relatedEntryIds: ['ensemble-stage'],
            audioSrc: '/assets/audio/ensemble-winds.wav',
            audioLabel: '合奏和声层示意',
            links: [
              {
                label: '打开合奏条目',
                to: entryPath('ensemble-stage'),
                variant: 'ghost',
              },
              {
                label: '进入合奏体验',
                to: experiencePath('ensemble-stage'),
              },
            ],
          },
        ],
        reflection:
          '当这些术语和现有实体入口连在一起时，它们就不再是“考试词汇”，而是帮助你在展陈里辨认层次和关系的观察工具。',
        continueTitle: '把概念装回完整舞台',
        continueDescription:
          '最后一章会把前面学过的脉冲、拍号、音高、和弦和织体，全部放回到实体小人与底座同场出现的听觉场景里。',
        continueLinks: [
          {
            label: '跳到合奏观察',
            to: tutorialPath('ensemble-observation'),
          },
          {
            label: '先看合奏条目',
            to: entryPath('ensemble-stage'),
            variant: 'ghost',
          },
        ],
      },
      {
        id: 'ensemble-observation',
        shortLabel: '05 合奏观察',
        title: '回到舞台，开始听谁在前进、谁在支撑、谁在发光。',
        intro:
          '这一章不再新增很多术语，而是把前面的概念重新装回完整展陈。你会发现现有的小提琴、长笛和合奏底座，其实已经足够构成一套清楚的观察路径。',
        concepts: [
          {
            id: 'melody-role',
            label: '旋律',
            title: '旋律像带路的人，负责把注意力牵向前方',
            summary:
              '旋律通常最容易被先听到，因为它承担了最直接的叙事线。但旋律能不能成立，取决于后面的时间和和声有没有托住它。',
            takeaway:
              '在完整舞台里，先听谁在“说话”，再听谁在替它开路。',
          },
          {
            id: 'support-role',
            label: '支撑层',
            title: '支撑层不抢前景，却决定整段音乐站不站得住',
            summary:
              '有些声部并不显眼，但会一直维持拍感、和声或空间厚度。它们像展陈底座本身，看似安静，却在撑住整体结构。',
            takeaway:
              '当你觉得音乐有地基，通常就是支撑层工作得很清楚。',
          },
          {
            id: 'timbre-role',
            label: '色彩层',
            title: '色彩层负责把场景照亮，而不一定总站在中央',
            summary:
              '木管、弦乐和其他声部的音色差异，会让同一个拍号和和声呈现出不同光感。它们像把空间从黑白变成有层次的彩色。',
            takeaway:
              '当某一层不是最响却让画面更明亮，那往往就是音色层在发挥作用。',
          },
          {
            id: 'listening-path',
            label: '聆听路径',
            title: '好的导览不是一次听完全部，而是知道先听哪里',
            summary:
              '在实体展陈环境里，用户停留时间有限，所以最重要的是给出一条清楚的听觉路径：先抓节奏，再看前景，再回头辨认支撑和织体。',
            takeaway:
              '这也是为什么教程要和乐器小人绑定，而不是另起一套孤立课程。',
          },
        ],
        examples: [
          {
            id: 'violin-role',
            label: '实体例子 A',
            title: '让小提琴小人负责把旋律线先点亮',
            description:
              '回到现有实体时，小提琴最适合扮演第一视角。它帮助用户快速找到“谁在说话”，再逐步分辨其他层次。',
            observation:
              '当你已经学过拍点和音高之后，小提琴不再只是好听，而是会像一条把注意力牵出来的路线。',
            relatedEntryIds: ['violin-dialogue'],
            audioSrc: '/assets/audio/violin-harmony.wav',
            audioLabel: '小提琴支撑与旋律关系',
            links: [
              {
                label: '打开小提琴展签',
                to: entryPath('violin-dialogue'),
                variant: 'ghost',
              },
              {
                label: '进入小提琴体验',
                to: experiencePath('violin-dialogue'),
              },
            ],
          },
          {
            id: 'flute-role',
            label: '实体例子 B',
            title: '让长笛小人负责把色彩和呼吸感带进来',
            description:
              '长笛在完整场景里不一定永远最前，但它很擅长让空间变亮，让节奏听起来更像会呼吸的动作，而不是硬边框。',
            observation:
              '如果旋律像线条，长笛更像一层光。它提醒我们：音乐里的支撑不只有拍点，也包括气息和色彩。',
            relatedEntryIds: ['flute-color'],
            audioSrc: '/assets/audio/flute-pad.wav',
            audioLabel: '长笛色彩层示意',
            links: [
              {
                label: '打开长笛展签',
                to: entryPath('flute-color'),
                variant: 'ghost',
              },
              {
                label: '进入长笛体验',
                to: experiencePath('flute-color'),
              },
            ],
          },
          {
            id: 'ensemble-role',
            label: '实体例子 C',
            title: '最后回到底座，听整组小人怎样把结构拼成完整舞台',
            description:
              '到底座 Demo 时，前面所有概念都会重新站到位。你会更容易判断哪些音轨是骨架，哪些音轨负责气氛，哪些音轨让舞台真正有了层次。',
            observation:
              '试着先听脉冲，再找主线，最后去听少一层之后哪里变薄。那一刻，乐理就已经从文字变成了经验。',
            relatedEntryIds: ['ensemble-stage'],
            audioSrc: '/assets/audio/ensemble-strings.wav',
            audioLabel: '合奏整体结构示意',
            links: [
              {
                label: '打开合奏展签',
                to: entryPath('ensemble-stage'),
                variant: 'ghost',
              },
              {
                label: '查看底座 Demo',
                to: '/demo/base',
              },
            ],
          },
        ],
        reflection:
          '这套导学模块的意义，不是把用户留在教程页，而是让他们在回到展签、AR 和底座时，开始真正听见每个实体入口各自承担的知识角色。',
        continueTitle: '继续回到项目里看',
        continueDescription:
          '当你准备好了，就把这套导学重新接回现有项目路径：先看展签，再进 AR，最后到底座里听完整结构。',
        continueLinks: [
          {
            label: '回到项目首页',
            to: '/',
            variant: 'ghost',
          },
          {
            label: '直接查看底座 Demo',
            to: '/demo/base',
          },
        ],
      },
    ],
  },
];
