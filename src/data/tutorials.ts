import type { TutorialModule } from '../types/tutorial';

const tutorialPath = (chapterId?: string) =>
  chapterId ? `/learn/fundamentals#${chapterId}` : '/learn/fundamentals';

const entryPath = (entryId: string) => `/entry/${entryId}`;
const experiencePath = (entryId: string) => `/experience/${entryId}`;

export const tutorials: TutorialModule[] = [
  {
    id: 'fundamentals',
    label: '乐理与乐器百科',
    title: '先懂一点乐理，再认识 12 件管弦乐器。',
    subtitle: '把基础乐理、分轨试听和 3D 模型预览放在同一条数字导览路径里。',
    description:
      '页面上半部分用音高、节奏、和声三组概念建立听感，下半部分把本项目用到的 12 件管弦乐器逐件展开，让观众能在同一个入口里完成“先听懂、再看懂”。',
    preface:
      '这不是一套脱离展陈的百科词条，而是服务于 NFC 底座、AR 体验和《睡美人圆舞曲》分轨演示的导览层。先抓住概念，再选择乐器，最后回到底座里听它们如何同场工作。',
    homeTitle: '从乐理入门到 12 件乐器百科。',
    homeSummary:
      '这套导学页把基础乐理压缩为 3 组听觉线索，并集中展示 12 件管弦乐器的介绍、分轨试听和百科模型预览。',
    heroNotes: ['3 组乐理线索', '12 件管弦乐器', '1 个百科模型预览区'],
    entrySpotlights: [
      {
        entryId: 'violin-dialogue',
        chapterId: 'pitch-register',
        label: '小提琴小人',
        title: '先从音高、音区和旋律前景理解小提琴为什么容易被听见',
        summary:
          '小提琴的线条清楚、音区明亮，适合作为认识旋律前景与弦乐家族的第一个入口。',
      },
      {
        entryId: 'flute-color',
        chapterId: 'rhythm-meter',
        label: '长笛小人',
        title: '从气息、拍点和轻盈色彩理解木管乐器的听感',
        summary:
          '长笛让节奏不只剩下数拍，也能被感受到呼吸、速度和明亮音色。',
      },
      {
        entryId: 'ensemble-stage',
        chapterId: 'harmony-texture',
        label: '合奏底座',
        title: '回到全编制去听声部、织体和配器怎样互相支撑',
        summary:
          '底座示例最适合把乐理概念和 12 件乐器放回同一舞台，直接听见谁在前景、谁在铺底、谁在增色。',
      },
    ],
    chapters: [
      {
        id: 'pitch-register',
        shortLabel: '01 音高与音区',
        title: '先分清声音站在哪里。',
        intro:
          '音高和音区决定一件乐器在听觉空间里的位置。认识 12 件乐器时，先判断它偏高、偏中还是偏低，很多角色关系就会变清楚。',
        concepts: [
          {
            id: 'pitch',
            label: '音高',
            title: '音高是在说声音更高还是更低',
            summary:
              '旋律的起伏、乐器的明暗和声部的前后，很多都从音高关系开始。',
            takeaway: '听一件乐器时，先问：它是在上方发光，还是在下方托住重心？',
          },
          {
            id: 'register',
            label: '音区',
            title: '音区决定乐器在舞台上的听觉位置',
            summary:
              '同一件乐器进入高音区或低音区，性格会变化；不同乐器也常因音区不同而承担不同任务。',
            takeaway: '长笛、小提琴更容易在上方被听见，大号、低音提琴更像地基。',
          },
          {
            id: 'timbre',
            label: '音色',
            title: '音色让相同音高变成不同角色',
            summary:
              '木管、铜管和弦乐即使演奏相近音高，也会因为发声方式不同而呈现不同质感。',
            takeaway: '辨认乐器时，不只听高低，也听它是气息、金属还是琴弦在发声。',
          },
          {
            id: 'melody',
            label: '旋律前景',
            title: '旋律常常由最容易被跟随的声音带出',
            summary:
              '前景旋律不一定总是最高或最响，但它通常最能让听者形成一条可跟随的线。',
            takeaway: '先抓住“谁在说话”，再去听后面有哪些声部在帮它成立。',
          },
        ],
        examples: [
          {
            id: 'violin-pitch',
            label: '实体例子',
            title: '小提琴适合用来认识明亮音区和旋律前景',
            description:
              '小提琴分轨能帮助观众快速听见音高起伏与主线推进，是进入弦乐百科的自然起点。',
            observation:
              '把旋律想成一条会升降的线，听它何时抬起、何时落下，再回头听其他声部如何托住它。',
            relatedEntryIds: ['violin-dialogue'],
            audioSrc: '/assets/audio/The Sleeping Beauty Waltz/Violin_睡美人圆舞曲.mp3',
            audioLabel: '小提琴分轨试听',
            links: [
              {
                label: '打开小提琴展签',
                to: entryPath('violin-dialogue'),
                variant: 'ghost',
              },
              {
                label: '跳到乐器百科',
                to: tutorialPath('instrument-encyclopedia'),
              },
            ],
          },
        ],
        reflection:
          '音高、音区和音色是进入乐器百科的第一层地图：它们告诉你一件乐器大概站在听觉空间的哪里。',
        continueTitle: '继续看节奏与拍号',
        continueDescription:
          '当你知道声音站在哪里，下一步就是判断它怎样在时间里移动。',
        continueLinks: [
          {
            label: '跳到节奏与拍号',
            to: tutorialPath('rhythm-meter'),
          },
          {
            label: '进入乐器百科',
            to: tutorialPath('instrument-encyclopedia'),
            variant: 'ghost',
          },
        ],
      },
      {
        id: 'rhythm-meter',
        shortLabel: '02 节奏与拍号',
        title: '听见音乐怎样在时间里走动。',
        intro:
          '节奏不只是速度快慢，而是音符停留多久、重心怎样循环、哪里停顿、哪里提前进入。听《睡美人圆舞曲》时，先抓住 3/4 拍的“强、弱、弱”，再去感受长短音和气口怎样让舞步摇曳起来。',
        concepts: [
          {
            id: 'duration',
            label: '时值',
            title: '时值决定每个音停留多久',
            summary:
              '在常见的 4/4 拍里，全音符大约占 4 拍，二分音符占 2 拍，四分音符占 1 拍；八分音符、十六分音符继续把一拍切得更细。',
            takeaway: '先听长音和短音怎样交替，就能感到旋律是舒展、紧凑，还是带着停顿。',
          },
          {
            id: 'meter',
            label: '拍号',
            title: '拍号规定重心怎样循环',
            summary:
              '拍号上方数字说明每小节有几拍，下方数字说明以什么音符为一拍。2/4、3/4、4/4、6/8 的循环不同，音乐的步伐也会不同。',
            takeaway: '看到 3/4 拍，可以先在心里数“一、二、三”，把第一拍当成落脚点。',
          },
          {
            id: 'accent',
            label: '强弱规律',
            title: '强弱规律让拍子有方向',
            summary:
              '2/4 常听成“强、弱”，3/4 常听成“强、弱、弱”，4/4 里第三拍会有次强，6/8 则像两组三拍连在一起。',
            takeaway: '不要把每一拍都听成一样重，重音一出来，舞步、行进感和摇摆感就清楚了。',
          },
          {
            id: 'rhythm-pattern',
            label: '节奏型',
            title: '节奏型让音乐形成可辨认的步伐',
            summary:
              '四分音符、八分音符、附点、切分、三连音和休止组合在一起，就会形成进行曲、流行律动、抒情慢歌或舞曲的不同性格。',
            takeaway: '试着听哪些音提前、延后、连在一起或突然停住，节奏的表情就会浮出来。',
          },
          {
            id: 'rest-breath',
            label: '休止与呼吸',
            title: '空拍也是节奏的一部分',
            summary:
              '休止不是没有内容，它会让下一次进入更清楚。木管和弦乐还会把停顿、换气、连断和轻重处理成自然的句法。',
            takeaway: '听到空白时，留意它是在蓄力、换气，还是让下一拍的重音更醒目。',
          },
        ],
        examples: [
          {
            id: 'flute-rhythm',
            label: '长笛试听',
            title: '用长笛听见圆舞曲的轻重与呼吸',
            description:
              '长笛分轨适合用来观察 3/4 拍里的轻重关系：第一拍像脚步落下，后两拍带出更轻的摇曳感。',
            observation:
              '先跟着“强、弱、弱”轻轻点拍，再听短音、长音、停顿和气口如何让旋律像一口气一样浮起来。',
            relatedEntryIds: ['flute-color'],
            audioSrc: '/assets/audio/The Sleeping Beauty Waltz/Flute_睡美人圆舞曲.mp3',
            audioLabel: '长笛分轨试听',
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
            id: 'ensemble-rhythm',
            label: '底座合奏',
            title: '用 12 轨静音听懂节奏支撑',
            description:
              '合奏底座能把节奏从“知识点”变成可操作的听觉体验：单独打开或关闭某个声部，就能听见谁在稳定拍点、谁在上方装饰。',
            observation:
              '先保持完整合奏，再尝试独奏木管、弦乐或低音声部。少掉支撑层时，舞步会变轻；只听高音乐器时，节奏更像一条会呼吸的线。',
            relatedEntryIds: ['ensemble-stage'],
            audioSrc: '/assets/audio/The Sleeping Beauty Waltz/Bass_睡美人圆舞曲.mp3',
            audioLabel: '低音提琴分轨试听',
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
          '节奏与拍号让乐器不只是“发出声音”，而是在同一条时间线上形成步伐、重心、停顿和呼吸。',
        continueTitle: '继续看和声与织体',
        continueDescription:
          '当你能听见谁在稳住拍点、谁在制造摇曳，下一步就可以判断多件乐器同时出现时怎样分层工作。',
        continueLinks: [
          {
            label: '跳到和声与织体',
            to: tutorialPath('harmony-texture'),
          },
          {
            label: '查看底座 Demo',
            to: '/demo/base',
            variant: 'ghost',
          },
        ],
      },
      {
        id: 'harmony-texture',
        shortLabel: '03 和声与织体',
        title: '最后听它们怎样同场工作。',
        intro:
          '当 12 件乐器一起出现时，关键不是把每个声音都听成主角，而是理解谁在铺底、谁在带线、谁在补色。',
        concepts: [
          {
            id: 'harmony',
            label: '和声',
            title: '和声像旋律背后的空间',
            summary:
              '和声给旋律提供背景重心，让前景线条有地方站住。',
            takeaway: '当音乐听起来更厚、更稳，往往是和声层在工作。',
          },
          {
            id: 'section',
            label: '声部',
            title: '声部是乐队里的功能分工',
            summary:
              '木管、铜管和弦乐并不是只按材质分类，也代表着不同的音色和功能位置。',
            takeaway: '看百科时，可以先按声部分组，再逐件认识。',
          },
          {
            id: 'texture',
            label: '织体',
            title: '织体是在看谁前谁后',
            summary:
              '多个声部同时存在时，织体决定它们怎样分层、让位、互相支撑。',
            takeaway: '织体听懂后，合奏会从一团声音变成有景深的舞台。',
          },
          {
            id: 'orchestration',
            label: '配器',
            title: '配器是在决定哪件乐器说哪句话',
            summary:
              '同一段旋律交给不同乐器，颜色、重量和情绪都会变化。',
            takeaway: '12 件乐器百科的意义，就是让你听见这些选择为什么不同。',
          },
        ],
        examples: [
          {
            id: 'ensemble-texture',
            label: '实体例子',
            title: '合奏底座适合把 12 件乐器放回同一张关系图',
            description:
              '在底座 Demo 中，观众可以通过静音、独奏和组合聆听，理解每件乐器怎样进入完整织体。',
            observation:
              '先找主线，再关心低音支撑和色彩层；少听一层之后，哪里变薄，哪里就是那件乐器的功能。',
            relatedEntryIds: ['ensemble-stage'],
            audioSrc: '/assets/audio/The Sleeping Beauty Waltz/Cello_睡美人圆舞曲.mp3',
            audioLabel: '大提琴分轨试听',
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
          '当乐理概念和 12 件乐器百科连在一起，用户回到 AR 与底座时，就不只是看见模型，而是能理解它们各自承担的音乐角色。',
        continueTitle: '进入 12 件乐器百科',
        continueDescription:
          '接下来可以按木管、铜管和弦乐三组浏览每件乐器，并试听它在项目曲目中的分轨。',
        continueLinks: [
          {
            label: '进入乐器百科',
            to: tutorialPath('instrument-encyclopedia'),
          },
          {
            label: '直接查看底座 Demo',
            to: '/demo/base',
            variant: 'ghost',
          },
        ],
      },
    ],
  },
];
