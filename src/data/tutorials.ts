import type { TutorialModule } from '../types/tutorial';

const tutorialPath = (chapterId?: string) =>
  chapterId ? `/learn/fundamentals#${chapterId}` : '/learn/fundamentals';

const entryPath = (entryId: string) => `/entry/${entryId}`;
const experiencePath = (entryId: string) => `/experience/${entryId}`;

export const tutorials: TutorialModule[] = [
  {
    id: 'fundamentals',
    label: '乐理与乐器百科',
    title: '乐理知识卡片。',
    subtitle: '7 张基础乐理卡片，加上 12 件管弦乐器百科与声部入口。',
    description:
      '页面上半部分把节奏、音程、和弦、调式、升降号等基础知识整理成可直接阅读的卡片，下半部分保留 12 件管弦乐器的介绍、声部导赏和 3D 模型预览。',
    preface:
      '卡片内容按基础乐理知识点组织，适合快速查阅：先看定义和规律，再把这些概念带到展签、AR 和底座体验中使用。',
    homeTitle: '从乐理入门到 12 件乐器百科。',
    homeSummary:
      '这套导学页把基础乐理整理成 7 张知识卡片，并集中展示 12 件管弦乐器的介绍、声部导赏和百科模型预览。',
    heroNotes: ['7 张乐理知识卡', '12 件管弦乐器', '1 个百科模型预览区'],
    knowledgeCards: [
      {
        id: 'pitch-register',
        label: '基础速览',
        title: '乐理初学极简速览',
        summary:
          '先记住音名、唱名、基础时值、大调音阶和三和弦，后面的节奏、调式与和声都会更容易进入。',
        sections: [
          {
            title: '音名与唱名',
            items: [
              {
                label: '音名',
                text: '常用七个基本音名是 C、D、E、F、G、A、B。',
              },
              {
                label: '唱名',
                text: '对应的首调唱名可记为 do、re、mi、fa、sol、la、si。',
              },
              {
                label: '半音关系',
                text: 'E-F、B-C 之间是半音，其余相邻基本音之间通常隔一个全音。',
              },
            ],
          },
          {
            title: '节奏基础',
            items: [
              {
                label: '全音符',
                text: '在 4/4 拍中通常占 4 拍，是最常见的长时值单位。',
              },
              {
                label: '二分音符',
                text: '通常占 2 拍，两个二分音符可以填满一个 4/4 小节。',
              },
              {
                label: '四分音符',
                text: '通常占 1 拍，是初学数拍时最常用的基准单位。',
              },
            ],
          },
          {
            title: '大调与三和弦',
            items: [
              {
                label: '大调音阶',
                text: '大调音阶的全半音结构是：全、全、半、全、全、全、半。',
              },
              {
                label: '三和弦',
                text: '三和弦由根音、三音、五音叠置而成，例如 C 大三和弦是 C-E-G。',
              },
              {
                label: '大三和弦',
                text: '结构可理解为根音向上大三度，再向上小三度，整体听感较明亮稳定。',
              },
            ],
          },
        ],
        note: '这张卡只放最小记忆量：音叫什么、时值多长、音阶怎样排、和弦怎样叠。',
      },
      {
        id: 'rhythm-meter',
        label: '节奏',
        title: '节奏型知识点',
        summary:
          '节奏先看音符时值和拍号容量，再看强弱循环、切分、附点、三连音和休止如何改变律动。',
        sections: [
          {
            title: '音符时值',
            items: [
              {
                label: '全音符',
                text: '通常为 4 拍；符头空心、无符干。',
              },
              {
                label: '二分音符',
                text: '通常为 2 拍；符头空心、有符干。',
              },
              {
                label: '四分音符',
                text: '通常为 1 拍；符头实心、有符干。',
              },
              {
                label: '八分音符',
                text: '通常为 1/2 拍；带一条符尾或一条连音线。',
              },
              {
                label: '十六分音符',
                text: '通常为 1/4 拍；带两条符尾或两条连音线。',
              },
              {
                label: '三十二分音符',
                text: '通常为 1/8 拍；带三条符尾或三条连音线。',
              },
              {
                label: '附点',
                text: '写在音符右侧，使原时值延长一半；例如附点四分音符 = 1.5 拍。',
              },
            ],
          },
          {
            title: '常见节奏型',
            items: [
              {
                label: '基础节奏',
                text: '音符落在稳定拍点上，适合建立清楚的速度和重心。',
              },
              {
                label: '切分节奏',
                text: '把重音移到弱拍或拍与拍之间，让节奏产生错位和推动感。',
              },
              {
                label: '附点节奏',
                text: '前长后短，常形成更有弹性的“拉住再释放”效果。',
              },
              {
                label: '三连音',
                text: '把一个基本拍平均分成三份，形成不同于二等分的流动感。',
              },
              {
                label: '休止节奏',
                text: '用休止符制造空拍、停顿和再次进入前的准备。',
              },
            ],
          },
          {
            title: '拍号与强弱规律',
            items: [
              {
                label: '拍号读法',
                text: '上方数字表示每小节有几拍，下方数字表示以几分音符为一拍。',
              },
              {
                label: '2/4',
                text: '每小节 2 拍，以四分音符为一拍；强弱规律常为“强、弱”。',
              },
              {
                label: '3/4',
                text: '每小节 3 拍，以四分音符为一拍；强弱规律常为“强、弱、弱”。',
              },
              {
                label: '4/4',
                text: '每小节 4 拍，以四分音符为一拍；强弱规律常为“强、弱、次强、弱”。',
              },
              {
                label: '6/8',
                text: '每小节 6 拍，以八分音符为一拍；常听成“强、弱、弱、次强、弱、弱”。',
              },
            ],
          },
        ],
        note: '核对节奏时先数总时值，再看重音落点；复杂节奏也要回到拍号容量里检查。',
      },
      {
        id: 'harmony-texture',
        label: '音程与和弦',
        title: '音程与和弦基础',
        summary:
          '音程说明两个音之间的距离，和弦说明多个音怎样叠在一起；这是理解旋律、调式与和声的共同基础。',
        sections: [
          {
            title: '音程度数',
            items: [
              {
                label: '度数',
                text: '从一个音数到另一个音，包含起点和终点；C 到 E 是三度，C 到 G 是五度。',
              },
              {
                label: '常见音数',
                text: '以 C 为例：纯一度 0 半音，大二度 2，大三度 4，纯四度 5，纯五度 7，大六度 9，大七度 11，纯八度 12。',
              },
              {
                label: '自然音程',
                text: '由自然音级构成，可分为纯、大、小、增、减等性质。',
              },
              {
                label: '变化音程',
                text: '通过升降记号改变音高后形成，常见有增音程、减音程、倍增音程和倍减音程。',
              },
            ],
          },
          {
            title: '三和弦与转位',
            items: [
              {
                label: '大三和弦',
                text: '结构为 1-3-5，听感明亮、稳定；C 大三和弦是 C-E-G。',
              },
              {
                label: '小三和弦',
                text: '结构为 1-b3-5，听感柔和、暗淡或带忧郁色彩。',
              },
              {
                label: '减三和弦',
                text: '结构为 1-b3-b5，张力强，稳定感弱。',
              },
              {
                label: '增三和弦',
                text: '结构为 1-3-#5，色彩悬浮，常用于制造不确定感。',
              },
              {
                label: '转位',
                text: '根音在最低处是原位；三音在低音是第一转位，五音在低音是第二转位。',
              },
            ],
          },
          {
            title: '音阶与七和弦',
            items: [
              {
                label: '大调音阶',
                text: '全半音结构为：全、全、半、全、全、全、半。',
              },
              {
                label: '自然小调',
                text: '全半音结构为：全、半、全、全、半、全、全。',
              },
              {
                label: '七和弦',
                text: '在三和弦上再叠加七音，常见类型有大七、小七、属七、半减七、减七。',
              },
            ],
          },
        ],
        note: '先判断音程距离，再判断和弦结构；看谱和听和声都会更有抓手。',
      },
      {
        id: 'harmony-progressions',
        label: '和弦进行',
        title: '和弦进行核心规律',
        summary:
          '和弦进行不是随机换和弦，而是通过稳定、过渡、紧张、解决构成方向感。',
        sections: [
          {
            title: '功能关系',
            items: [
              {
                label: 'T 主功能',
                text: '以 I 级和弦为核心，提供稳定、归属和结束感。',
              },
              {
                label: 'S 下属功能',
                text: '以 IV 级或 ii 级为代表，常作为从稳定走向紧张前的过渡。',
              },
              {
                label: 'D 属功能',
                text: '以 V 级或 vii° 为代表，制造最强的回归倾向，通常导向主功能。',
              },
            ],
          },
          {
            title: '经典进行与连接',
            items: [
              {
                label: 'I-IV-V-I',
                text: '最基础的功能进行之一；在 C 大调中就是 C-F-G-C。',
              },
              {
                label: '共同音连接',
                text: '两个和弦共同音越多，连接越平滑；没有共同音时，听感更跳跃。',
              },
              {
                label: '正三和弦',
                text: 'I、IV、V 是调内最核心的三个三和弦，分别对应主、下属、属功能。',
              },
            ],
          },
          {
            title: '借用和弦与终止式',
            items: [
              {
                label: '借用和弦',
                text: '从同主音大小调或相关调式借来和弦，用来扩展色彩。',
              },
              {
                label: 'bIII',
                text: '常带浪漫、柔和或复古色彩。',
              },
              {
                label: 'bVI',
                text: '常带温暖、抒情或电影感色彩。',
              },
              {
                label: 'bVII',
                text: '常见于流行和摇滚语汇，带开放、梦幻或向外展开的感觉。',
              },
              {
                label: '完全终止',
                text: 'V-I，属功能解决到主功能，结束感最明确。',
              },
              {
                label: '半终止',
                text: '乐句停在 V 级，形成“还没结束”的悬念。',
              },
              {
                label: '变格终止',
                text: 'IV-I，常有庄重、平和或赞美诗式的收束感。',
              },
              {
                label: '阻碍终止',
                text: 'V-vi，属和弦没有回到 I，而是转向 vi，制造意外延续。',
              },
            ],
          },
        ],
        note: '练习时可先背 I-IV-V-I，再观察歌曲里怎样用借用和弦、V-vi-I 等方式制造变化。',
      },
      {
        id: 'western-modes',
        label: '调式',
        title: '西洋调式',
        summary:
          '调式以一个中心音为核心，通过不同音程排列形成不同色彩；大小调和中古调式都属于调式系统。',
        sections: [
          {
            title: '调式定义',
            items: [
              {
                label: '中心音',
                text: '调式需要有一个稳定中心音，旋律和和声围绕它建立方向。',
              },
              {
                label: '音程排列',
                text: '不同调式的差别主要来自全音、半音以及变化音级的位置。',
              },
              {
                label: '大调',
                text: 'Ionian 大调音阶结构是全、全、半、全、全、全、半。',
              },
              {
                label: '小调',
                text: '自然小调结构是全、半、全、全、半、全、全；和声小调常升高第 7 级，旋律小调上行常升高第 6、7 级。',
              },
            ],
          },
          {
            title: '七种中古调式',
            items: [
              {
                label: 'Ionian',
                text: '1 2 3 4 5 6 7；等同自然大调，明亮稳定。',
              },
              {
                label: 'Dorian',
                text: '1 2 b3 4 5 6 b7；小调色彩中保留明亮的第 6 级。',
              },
              {
                label: 'Phrygian',
                text: '1 b2 b3 4 5 b6 b7；半音下行感强，色彩紧张。',
              },
              {
                label: 'Lydian',
                text: '1 2 3 #4 5 6 7；升高第 4 级，带漂浮和明亮感。',
              },
              {
                label: 'Mixolydian',
                text: '1 2 3 4 5 6 b7；大调基础上降低第 7 级，常见于民谣、摇滚和流行。',
              },
              {
                label: 'Aeolian',
                text: '1 2 b3 4 5 b6 b7；等同自然小调，色彩柔和偏暗。',
              },
              {
                label: 'Locrian',
                text: '1 b2 b3 4 b5 b6 b7；含减五度，最不稳定。',
              },
            ],
          },
        ],
        note: '记调式时先抓特征音：Dorian 的 6、Lydian 的 #4、Mixolydian 的 b7 都很容易辨认。',
      },
      {
        id: 'accidentals-key-signatures',
        label: '调号',
        title: '升降号与调号',
        summary:
          '升降号改变单个音高，调号规定一整段音乐默认升降哪些音；先分清临时记号和调号，读谱会轻松很多。',
        sections: [
          {
            title: '基本记号',
            items: [
              {
                label: '升号 #',
                text: '把音升高半音，例如 F# 比 F 高半音。',
              },
              {
                label: '降号 b',
                text: '把音降低半音，例如 Bb 比 B 低半音。',
              },
              {
                label: '还原号',
                text: '取消之前的升降变化，使音回到自然音。',
              },
              {
                label: '重升号 x / ##',
                text: '把音升高两个半音，也就是升高一个全音。',
              },
              {
                label: '重降号 bb',
                text: '把音降低两个半音，也就是降低一个全音。',
              },
            ],
          },
          {
            title: '调号与临时记号',
            items: [
              {
                label: '调号',
                text: '写在谱号后，通常对整首或一大段音乐生效，说明固定要升或降的音。',
              },
              {
                label: '临时记号',
                text: '写在音符前，一般只在当前小节内对同音名、同八度音生效，到小节线后失效。',
              },
              {
                label: '区别',
                text: '调号是长期规则，临时记号是局部修改；还原号也属于临时记号的一种。',
              },
            ],
          },
          {
            title: '顺序与快速判断',
            items: [
              {
                label: '升号顺序',
                text: 'F-C-G-D-A-E-B，可用来记谱号后升号出现的固定顺序。',
              },
              {
                label: '降号顺序',
                text: 'B-E-A-D-G-C-F，正好是升号顺序反向。',
              },
              {
                label: '升号调判断',
                text: '最后一个升号再向上半音，通常就是对应大调的主音。',
              },
              {
                label: '降号调判断',
                text: '除 F 大调只有一个降号外，倒数第二个降号通常就是对应大调的主音。',
              },
              {
                label: '关系小调',
                text: '大调主音向下小三度，可找到同调号的关系小调。',
              },
            ],
          },
        ],
        note: '读谱先看调号，再看小节内有没有临时记号；不要把临时升降误认为整首都改变。',
      },
      {
        id: 'chinese-modes',
        label: '中国调式',
        title: '中国调式',
        summary:
          '中国传统调式常以五声音阶为基础，用宫、商、角、徵、羽五个音级建立旋律中心和民族色彩。',
        sections: [
          {
            title: '五声音阶',
            items: [
              {
                label: '五声音级',
                text: '宫、商、角、徵、羽可对应 do、re、mi、sol、la。',
              },
              {
                label: 'C 宫示例',
                text: 'C 宫五声音阶可写作 C-D-E-G-A，省略了 F 和 B 两个容易形成半音倾向的音。',
              },
              {
                label: '听感特点',
                text: '五声音阶半音冲突少，旋律常显得开阔、平稳、清晰。',
              },
            ],
          },
          {
            title: '五种基本调式',
            items: [
              {
                label: '宫调式',
                text: '以宫音为中心，常有稳定、庄重的感觉。',
              },
              {
                label: '商调式',
                text: '以商音为中心，常显得明朗、流动。',
              },
              {
                label: '角调式',
                text: '以角音为中心，常有柔和、清秀的色彩。',
              },
              {
                label: '徵调式',
                text: '以徵音为中心，常显得开阔、明亮。',
              },
              {
                label: '羽调式',
                text: '以羽音为中心，常带抒情、含蓄或沉静感。',
              },
            ],
          },
          {
            title: '与西洋大小调的区别',
            items: [
              {
                label: '音阶基础',
                text: '中国调式常从五声音阶出发，西洋大小调多以七声音阶和功能和声组织。',
              },
              {
                label: '半音倾向',
                text: '五声音阶常避开 4、7 等强半音倾向，旋律更强调线条与装饰。',
              },
              {
                label: '偏音',
                text: '六声、七声调式会在五声基础上加入清角、变徵、变宫等偏音，形成更丰富的色彩。',
              },
              {
                label: '学习方法',
                text: '先背宫商角徵羽，再练同一组音列换不同中心音，并多听民歌、戏曲和民族器乐作品。',
              },
            ],
          },
        ],
        note: '判断中国调式时，不只看用了哪些音，更要听旋律最后落在哪里、哪个音最像中心。',
      },
    ],
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
            audioLabel: '小提琴声部导赏',
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
        title: '先把节奏的骨架看清楚。',
        intro:
          '节奏乐理可以先抓五件事：音符时值、拍号读法、节拍强弱、常见节奏型和组合技巧。先会认全音符、二分音符、四分音符、八分音符这些时间单位，再去听音乐怎样通过重音、空拍、附点和切分形成律动。',
        concepts: [
          {
            id: 'duration',
            label: '音符时值',
            title: '音符时值是一套时间单位',
            summary:
              '以 4/4 拍为例：全音符 4 拍，二分音符 2 拍，四分音符 1 拍，八分音符 1/2 拍，十六分音符 1/4 拍，三十二分音符 1/8 拍。附点会把原时值延长 1/2，休止符则表示同样时长的空拍。',
            takeaway: '先把“长短比例”听清楚：一个长音、两个中等音、四个短音，组合起来就是节奏的基本材料。',
          },
          {
            id: 'meter',
            label: '拍号',
            title: '拍号告诉你每小节怎样数拍',
            summary:
              '拍号写成分数形式：上方数字表示每小节有几拍，下方数字表示以哪种音符为一拍。4/4 是每小节 4 拍、以四分音符为一拍；3/4 是每小节 3 拍；6/8 则是每小节 6 拍、以八分音符为一拍。',
            takeaway: '读谱时先看拍号，再数小节里的总时值有没有装满，这是判断节奏是否正确的第一步。',
          },
          {
            id: 'accent',
            label: '节拍强弱',
            title: '强弱规律决定音乐的重心',
            summary:
              '常见拍号都有自己的重音循环：2/4 是“强、弱”，3/4 是“强、弱、弱”，4/4 是“强、弱、次强、弱”，6/8 常听成“强、弱、弱、次强、弱、弱”。',
            takeaway: '不要把每一拍都听成一样重。重音决定落脚点，弱拍负责流动，次强拍让长句更有层次。',
          },
          {
            id: 'rhythm-pattern',
            label: '常见节奏型',
            title: '节奏型是音符时值的组合方式',
            summary:
              '基础节奏型把音符放在稳定拍点上；切分节奏会把重心推到弱拍或拍间；附点节奏把前一个音拉长、后一个音压短；三连音把一拍平均分成三份；休止节奏用空白制造停顿和蓄力。',
            takeaway: '听到节奏时，试着判断它是平稳推进、错开重音、拉长再收紧，还是用空拍制造停顿。',
          },
          {
            id: 'rest-breath',
            label: '组合技巧',
            title: '空拍、附点和连断让节奏更有表情',
            summary:
              '简单节奏可以叠加成复杂节奏：四分音符加两个八分音符会更有推动感；附点让节奏更有弹性；切分让音乐更跳跃；休止让下一次进入更清楚。节奏越复杂，越要先回到拍号和总时值核对。',
            takeaway: '练习时先数稳拍，再加入附点、切分、三连音和休止；先稳定，再变化，节奏才不会散。',
          },
        ],
        examples: [
          {
            id: 'flute-rhythm',
            label: '读谱例子',
            title: '先用一小节读出时值和拍号',
            description:
              '看到 4/4 拍时，可以先把一小节理解成 4 个四分音符的容量：1 个全音符、2 个二分音符、4 个四分音符，或 8 个八分音符，都能刚好占满一小节。',
            observation:
              '读节奏时先数总拍数，再看重音位置。遇到附点、切分或休止时，不要急着唱旋律，先把“停多久、从哪里进”数清楚。',
            relatedEntryIds: ['flute-color'],
            audioSrc: '/assets/audio/The Sleeping Beauty Waltz/Flute_睡美人圆舞曲.mp3',
            audioLabel: '长笛声部导赏',
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
            title: '用分轨听懂谁在负责节奏层',
            description:
              '合奏里并不是所有乐器都在做同一件事：低音和内声部常负责稳定拍点，高音乐器更容易做短句、装饰音或切分进入。分轨静音可以把这些功能拆开听。',
            observation:
              '先听完整合奏，再分别独奏低音、弦乐和木管。少掉支撑层时，重心会变轻；只听装饰层时，节奏会更碎、更灵动。',
            relatedEntryIds: ['ensemble-stage'],
            audioSrc: '/assets/audio/The Sleeping Beauty Waltz/Bass_睡美人圆舞曲.mp3',
            audioLabel: '低音提琴声部导赏',
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
          '节奏与拍号是音乐的时间骨架：时值决定长短，拍号决定容量，强弱决定重心，节奏型决定律动。',
        continueTitle: '继续看和声与织体',
        continueDescription:
          '当节奏层清楚之后，再听多件乐器怎样叠在一起，和声、声部和织体就会更容易分辨。',
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
            audioLabel: '大提琴声部导赏',
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
          '接下来可以按木管、铜管和弦乐三组浏览每件乐器，并聆听它在项目曲目中的声部。',
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
