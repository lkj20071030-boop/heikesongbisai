/* 智析 AI · 教师工作台场景知识库
   本文件按《开发说明》18.6 教师数据契约编写，收录小学科学、初中数学、高中物理、
   大学数学、大学物理、计算机导论六个教学场景。来源、图谱、目标与教学流程均标注
   知识库来源；classProfile 为示例班级，仅用于展示共性断点与教学决策，不对应任何
   具体学生。 */

export const teacherTopics = [
  /* ------------------------------------------------------------------ */
  /* 1. 小学科学 · 简单电路 · 教科版六年级上册                          */
  /* ------------------------------------------------------------------ */
  {
    id: 'science-simple-circuit',
    stage: '小学',
    subject: '科学',
    grade: '六年级上册',
    textbook: '教科版',
    unit: '《能量》单元 · 简单电路（复习与衔接）',
    title: '简单电路',
    summary:
      '作为六年级上册《能量》单元的复习衔接课，以「一根导线点亮小灯泡」为任务，让学生在试错中建立闭合回路观念，进而识别通路、断路与短路，并迁移到串联、并联的电流路径分析。',
    needExamples: [
      '40 分钟新授课，班里 42 人，只有 12 套电路器材，两人一组还差 9 套，动手环节怎么安排？',
      '学生能把灯泡接亮，但一问「电流怎么走」就说「从正极走到灯泡」，怎么把闭合回路讲透？',
      '想用「灯泡不亮」的故障排查做应用，但担心学生乱接造成短路，怎样设计才安全？'
    ],
    sources: [
      {
        id: 'sci-s1',
        type: '教材',
        title: '《科学》（教科版）六年级上册',
        locator: '《能量》单元 · 电和磁、电能',
        excerpt:
          '电可以让小灯泡发光、让电动机转动；电源、导线、用电器和开关按一定方式连接，才能形成电流的通路。',
        confidence: 0.9
      },
      {
        id: 'sci-s2',
        type: '教材',
        title: '《科学》（教科版）四年级下册',
        locator: '第二单元《电路》· 第 3 课《简易电路》',
        excerpt:
          '用一根导线和一节电池把小灯泡接亮，需要让电流从电池正极出发，经过小灯泡，再回到负极，形成闭合回路；用简易符号画出电路连接图，并标出电流方向。',
        confidence: 0.93
      },
      {
        id: 'sci-s3',
        type: '课标',
        title: '义务教育科学课程标准（2022 年版）',
        locator: '核心概念 3「物质的运动与相互作用」· 3.2 电磁相互作用 · 3—4 年级内容要求',
        excerpt:
          '知道电源、导线、用电器和开关是构成电路的必要元件；说明形成电路的条件，切断闭合回路是控制电流的一种方法。',
        confidence: 0.96
      },
      {
        id: 'sci-s4',
        type: '解读',
        title: '《义务教育科学课程标准（2022 年版）解读》',
        locator: '核心概念 3「物质的运动与相互作用」· 教学建议',
        excerpt:
          '电路教学应让学生在动手连接中建立「闭合回路」观念，先做后说，避免直接给出电路定义。',
        confidence: 0.82
      },
      {
        id: 'sci-s5',
        type: '解读',
        title: '《科学》六年级上册教师教学用书（教科版）',
        locator: '《能量》单元 · 教材分析与课时建议',
        excerpt:
          '本单元把电与磁、电能与其他形式的能联系起来，教学时应先复习电路的基本连接，再进入电磁铁探究。',
        confidence: 0.8
      },
      {
        id: 'sci-s6',
        type: '校本',
        title: '科学组《简单电路》前测',
        locator: '第 1—6 题 · 前概念排查',
        excerpt:
          '前测显示，学生能认出电池和小灯泡，但常认为「导线碰到灯泡任意位置就能亮」，对电流路径缺少完整表象。',
        confidence: 0.74
      },
      {
        id: 'sci-s7',
        type: '校本',
        title: '科学组《简单电路》器材清单与安全提示',
        locator: '第 1 课时 · 分组材料',
        excerpt:
          '每组：1 节 1.5 V 干电池、2 根带鳄鱼夹导线、1 只 2.5 V/0.3 A 小灯泡、1 个灯座、1 个单刀开关；禁止用导线直接连接电池正负极。',
        confidence: 0.86
      },
      {
        id: 'sci-s8',
        type: '外部',
        title: '中国数字科技馆 · 电路的组成',
        locator: '展项说明「什么是电路」',
        excerpt:
          '电路是电流通过的路径，由电源、用电器、导线和开关等组成；开关断开时电路断路，用电器停止工作。',
        confidence: 0.68
      },
      {
        id: 'sci-s9',
        type: '外部',
        title: '国家中小学智慧教育平台 · 小学科学电路主题课例',
        locator: '小学科学 · 物质科学「电路」主题课例（六年级复习课）',
        excerpt:
          '课例用「一根导线点亮小灯泡」任务导入，再通过失败连接与成功连接的对比，归纳闭合回路条件。',
        confidence: 0.65
      },
      {
        id: 'sci-s10',
        type: '教材',
        title: '《科学》（教科版）四年级下册',
        locator: '第二单元《电路》·《电路出故障了》《里面是怎样连接的》《模拟安装照明电路》',
        excerpt:
          '电路出故障时，可按「电源—导线—开关—用电器」逐段检查，或用替换法、电路检测器排查；用电路检测器推测暗箱内元件的连接方式；在模拟安装照明电路中，用串联或并联的方式连接多个用电器。',
        confidence: 0.88
      }
    ],
    graph: {
      nodes: [
        {
          id: 'sci-battery',
          label: '电源（电池）',
          layer: 0,
          kind: 'prior',
          desc: '电池的两端是正极和负极，它为电路提供持续的电能，使电荷能够定向移动。',
          sourceIds: ['sci-s1', 'sci-s3']
        },
        {
          id: 'sci-bulb',
          label: '小灯泡的结构',
          layer: 0,
          kind: 'prior',
          desc: '小灯泡有金属螺纹壳（侧面接线点）和底部金属触点两个接线处，电流必须经过灯丝才能发光。',
          sourceIds: ['sci-s2', 'sci-s7']
        },
        {
          id: 'sci-conductor',
          label: '导体与绝缘体',
          layer: 0,
          kind: 'prior',
          desc: '铜、铝等容易导电的物体是导体；橡胶、塑料等不容易导电的是绝缘体，导线外部包有绝缘层。',
          sourceIds: ['sci-s3', 'sci-s8']
        },
        {
          id: 'sci-switch',
          label: '开关',
          layer: 1,
          kind: 'concept',
          desc: '开关串联在电路中，闭合时接通电路，断开时切断电路，用来控制用电器的工作状态。',
          sourceIds: ['sci-s1', 'sci-s3']
        },
        {
          id: 'sci-loop',
          label: '闭合回路',
          layer: 1,
          kind: 'concept',
          desc: '电流从电源正极出发，经过用电器和开关，再回到电源负极，形成不间断的路径，这样的电路叫闭合回路。',
          sourceIds: ['sci-s1', 'sci-s2', 'sci-s3']
        },
        {
          id: 'sci-current',
          label: '电流',
          layer: 2,
          kind: 'concept',
          desc: '电荷的定向移动形成电流；在简单电路中，电流沿闭合回路流动，小学阶段描述为「从正极流出，经过用电器，回到负极」。',
          sourceIds: ['sci-s1', 'sci-s8']
        },
        {
          id: 'sci-diagram',
          label: '电路图与元件符号',
          layer: 2,
          kind: 'concept',
          desc: '用规定的符号表示电池、灯泡、开关和导线，把实物连接抽象成电路图，便于交流和检查。',
          sourceIds: ['sci-s2', 'sci-s3']
        },
        {
          id: 'sci-series',
          label: '串联与并联',
          layer: 2,
          kind: 'concept',
          desc: '串联是把用电器逐个顺次连接，只有一条电流路径；并联是把用电器并列连接，有多条电流路径。',
          sourceIds: ['sci-s10']
        },
        {
          id: 'sci-short',
          label: '短路',
          layer: 3,
          kind: 'concept',
          desc: '导线不经过用电器直接连接电源两极，电路中电阻很小、电流很大，会发热甚至损坏电池，必须避免。',
          sourceIds: ['sci-s3', 'sci-s7']
        },
        {
          id: 'sci-fault',
          label: '电路故障判断',
          layer: 3,
          kind: 'concept',
          desc: '灯泡不亮时，按「电源—导线—开关—灯泡」逐段检查：电池是否有电、导线是否接牢、开关是否闭合、灯泡是否损坏。',
          sourceIds: ['sci-s10']
        },
        {
          id: 'sci-target',
          label: '简单电路',
          layer: 3,
          kind: 'target',
          desc: '由电源、导线、用电器和开关组成、能形成闭合回路的电路；闭合回路是用电器工作的必要条件。',
          sourceIds: ['sci-s2', 'sci-s3']
        },
        {
          id: 'sci-m-onewire',
          label: '导线碰到灯泡就会亮',
          layer: 1,
          kind: 'misconception',
          desc: '认为只要导线碰到灯泡，灯泡就会亮，忽略电流必须回到电池另一极。',
          sourceIds: ['sci-s6', 'sci-s2']
        },
        {
          id: 'sci-m-usedup',
          label: '电流会被用电器「用完」',
          layer: 2,
          kind: 'misconception',
          desc: '认为电流经过灯泡后就被消耗掉，不会再回到电池；实际上电流沿闭合回路流动，灯泡发光是因为有电流经过灯丝，电流本身要回到电池另一极。',
          sourceIds: ['sci-s8', 'sci-s2']
        },
        {
          id: 'sci-m-polarity',
          label: '电池接反就不亮',
          layer: 1,
          kind: 'misconception',
          desc: '认为电池正负极接反灯泡就不亮；小灯泡没有极性，反接仍然发光，只有发光二极管等有极性元件才需要区分正负极。',
          sourceIds: ['sci-s2', 'sci-s8']
        }
      ],
      edges: [
        {
          from: 'sci-battery',
          to: 'sci-loop',
          relation: 'prerequisite',
          confidence: 0.95,
          basis: '没有电源提供持续的电能，回路中不会形成持续电流。',
          sourceIds: ['sci-s1', 'sci-s3']
        },
        {
          from: 'sci-bulb',
          to: 'sci-loop',
          relation: 'prerequisite',
          confidence: 0.92,
          basis: '灯泡是用电器，电流必须经过灯丝，灯泡才能发光；在本课的单灯泡电路中，灯泡是回路的用电器环节。',
          sourceIds: ['sci-s2']
        },
        {
          from: 'sci-conductor',
          to: 'sci-loop',
          relation: 'prerequisite',
          confidence: 0.9,
          basis: '导线把各元件连接起来，导体让电流通过，绝缘层防止漏电和短路。',
          sourceIds: ['sci-s3', 'sci-s8']
        },
        {
          from: 'sci-switch',
          to: 'sci-loop',
          relation: 'supports',
          confidence: 0.88,
          basis: '开关串联在回路中，控制回路的通断，是闭合回路的可操作部件。',
          sourceIds: ['sci-s1', 'sci-s3']
        },
        {
          from: 'sci-loop',
          to: 'sci-current',
          relation: 'causes',
          confidence: 0.93,
          basis: '闭合回路为电荷定向移动提供连续路径，是产生持续电流的条件。',
          sourceIds: ['sci-s1', 'sci-s3']
        },
        {
          from: 'sci-current',
          to: 'sci-target',
          relation: 'supports',
          confidence: 0.9,
          basis: '有电流经过灯丝，灯泡才发光；简单电路的功能实现依赖电流。',
          sourceIds: ['sci-s1', 'sci-s2']
        },
        {
          from: 'sci-loop',
          to: 'sci-target',
          relation: 'prerequisite',
          confidence: 0.96,
          basis: '闭合回路是简单电路的核心判据，也是本课的目标概念。',
          sourceIds: ['sci-s2', 'sci-s3']
        },
        {
          from: 'sci-diagram',
          to: 'sci-target',
          relation: 'supports',
          confidence: 0.85,
          basis: '把实物连接画成电路图，能帮助学生检查回路是否闭合。',
          sourceIds: ['sci-s2', 'sci-s3']
        },
        {
          from: 'sci-series',
          to: 'sci-target',
          relation: 'leads-to',
          confidence: 0.8,
          basis: '在掌握单个回路后，比较串联与并联的多条路径，深化对回路结构的理解。',
          sourceIds: ['sci-s10']
        },
        {
          from: 'sci-short',
          to: 'sci-target',
          relation: 'contrasts',
          confidence: 0.87,
          basis: '短路是不经过用电器的最短路径，虽然构成闭合路径，但不能让用电器正常工作，用来强化「电流必须经过用电器」。',
          sourceIds: ['sci-s3', 'sci-s7']
        },
        {
          from: 'sci-fault',
          to: 'sci-target',
          relation: 'supports',
          confidence: 0.84,
          basis: '故障判断把闭合回路知识用于排查灯泡不亮的原因。',
          sourceIds: ['sci-s10']
        },
        {
          from: 'sci-m-onewire',
          to: 'sci-loop',
          relation: 'contrasts',
          confidence: 0.9,
          basis: '单线连接没有形成回到电源负极的完整路径，恰好反证闭合回路的必要性。',
          sourceIds: ['sci-s6', 'sci-s2']
        },
        {
          from: 'sci-m-usedup',
          to: 'sci-current',
          relation: 'contrasts',
          confidence: 0.82,
          basis: '「电流被用完」忽略了电流必须沿回路回到电池另一极，澄清后有助于建立闭合回路表象。',
          sourceIds: ['sci-s8', 'sci-s2']
        },
        {
          from: 'sci-m-polarity',
          to: 'sci-target',
          relation: 'contrasts',
          confidence: 0.78,
          basis: '澄清电池极性与灯泡极性的区别，避免把「不亮」错误归因于电池接反。',
          sourceIds: ['sci-s2', 'sci-s8']
        },
        {
          from: 'sci-battery',
          to: 'sci-short',
          relation: 'supports',
          confidence: 0.86,
          basis: '短路直接连接电源两极，电流很大，是电源使用中最需要防范的情形。',
          sourceIds: ['sci-s3', 'sci-s7']
        },
        {
          from: 'sci-bulb',
          to: 'sci-current',
          relation: 'supports',
          confidence: 0.85,
          basis: '灯丝发光是电流存在的可见证据，可用来反推回路中是否有电流。',
          sourceIds: ['sci-s2']
        }
      ]
    },
    objectives: [
      {
        text: '能说出电源、导线、用电器、开关是构成电路的必要元件，并指出小灯泡的两个接线处。',
        level: '理解',
        sourceIds: ['sci-s1', 'sci-s2', 'sci-s3']
      },
      {
        text: '能按实物或电路图连接简单电路，使小灯泡发光，并用开关控制亮灭。',
        level: '应用',
        sourceIds: ['sci-s2', 'sci-s7']
      },
      {
        text: '能用「闭合回路」解释只把导线搭在小灯泡一个接线处时灯泡不亮，并区分通路、断路和短路。',
        level: '理解',
        sourceIds: ['sci-s2', 'sci-s3']
      },
      {
        text: '能迁移到串联、并联连接，比较两种连接中灯泡亮灭的差异并说明电流路径。',
        level: '迁移',
        sourceIds: ['sci-s10']
      }
    ],
    keyPoints: [
      '电流从电源正极流出，经过用电器和开关，回到负极，形成闭合回路',
      '小灯泡必须两个接线处都接入电路，灯丝才有电流经过',
      '开关串联在回路中，断开即断路；导线不经过用电器直接连电源两极会短路'
    ],
    difficulties: [
      '把「灯泡亮」与「回路闭合」建立因果联系，而不是停留在「导线碰到灯泡」',
      '在实物连接中同时关注小灯泡的两个接线点，排除「接一处就能亮」的直觉',
      '区分断路与短路，并说明短路为什么危险'
    ],
    misconceptions: [
      {
        nodeId: 'sci-m-onewire',
        label: '导线碰到灯泡就会亮',
        misconception: '只要导线碰到小灯泡，灯泡就会亮，不需要回到电池另一极。',
        sourceIds: ['sci-s6', 'sci-s2']
      },
      {
        nodeId: 'sci-m-usedup',
        label: '电流会被用电器用完',
        misconception: '电流经过第一个灯泡后就被消耗掉，所以后面的灯不亮。',
        sourceIds: ['sci-s8', 'sci-s2']
      },
      {
        nodeId: 'sci-m-polarity',
        label: '电池接反就不亮',
        misconception: '电池正负极接反时小灯泡一定不亮，因此把不亮都归因于电池装反。',
        sourceIds: ['sci-s2', 'sci-s8']
      }
    ],
    flowTemplate: [
      {
        phase: '导入',
        minutes: 5,
        teacher:
          '出示一节电池、一根导线和一只小灯泡，提出挑战：「不用灯座，能不能让灯泡亮起来？」请两名学生上台尝试，其余学生把成功与失败的连接方式画在记录单上。',
        student: '观察并猜测；上台尝试；把两种连接方式画在记录单上。',
        evidence: '能说出自己尝试的连接方式，并对失败原因作出猜测。',
        sourceIds: ['sci-s2', 'sci-s9']
      },
      {
        phase: '探究',
        minutes: 12,
        teacher:
          '发放分组材料，明确安全要求：导线不得直接连接电池正负极。巡视时追问「电流从哪里出发，经过什么，回到哪里」，提示学生关注小灯泡的两个接线处。',
        student: '两人一组尝试连接，记录灯泡亮与不亮的连接图，并用箭头标出电流路径。',
        evidence: '每组至少记录 2 种连接，能标出电流从正极到负极的路径。',
        sourceIds: ['sci-s2', 'sci-s7']
      },
      {
        phase: '建构',
        minutes: 11,
        teacher:
          '选取成功与失败的连接图对比，引导学生归纳「闭合回路」；结合小灯泡结构说明两个接线处的作用，板书电流路径。',
        student: '比较连接图，圈出不闭合的地方；用自己的话说出灯泡发光的条件。',
        evidence: '能圈出只接一个接线处的连接缺少的回路部分，并说出「要回到电池另一极」。',
        sourceIds: ['sci-s2', 'sci-s3', 'sci-s4']
      },
      {
        phase: '应用',
        minutes: 10,
        teacher:
          '出示电路图，请学生判断通路、断路、短路；组织「故障排查」：三只不亮的灯泡，分别因开关断开、导线松脱、灯泡损坏；最后完成 3 道判断与解释题。',
        student: '判断电路状态；按「电源—导线—开关—灯泡」顺序排查并说明依据；独立完成 3 题。',
        evidence: '3 题正确率达到 80%，排查记录能写出检查顺序。',
        sourceIds: ['sci-s3', 'sci-s7', 'sci-s10']
      },
      {
        phase: '总结',
        minutes: 4,
        teacher:
          '发放出口条：画出一个能让灯泡发光的简单电路，并用箭头标出电流方向；回扣导入：为什么只把导线搭在灯泡一个接线处，灯泡不亮？布置课后观察家中的开关。',
        student: '独立完成出口条；用「闭合回路」回答；举例说出家里的开关控制哪盏灯。',
        evidence: '出口条回路闭合、箭头正确；能说出电流必须回到电池另一极。',
        sourceIds: ['sci-s2', 'sci-s3', 'sci-s8']
      }
    ],
    activities: {
      basic: [
        '识别电路元件：从电池、导线、灯泡、开关、塑料尺、回形针中选出能组成电路的材料，并说明理由。',
        '判断通路、断路、短路：给出 6 幅实物连接图，圈出不能使灯泡发光的图并写出原因。'
      ],
      advanced: [
        '比较串联与并联：用两盏灯泡分别连接两种电路，记录亮度以及取下一盏灯后另一盏的状态，画出电流路径。',
        '设计两灯两开关电路：用两个开关分别控制两盏灯，画出电路图并说明每个开关串在哪条支路上。'
      ],
      'hands-on': [
        '一根导线点亮小灯泡：只用一节电池、一根导线点亮灯泡，画出成功连接的示意图。',
        '做一个小开关：用回形针、图钉、硬纸板制作开关，接入电路检验能否控制灯泡。',
        '导体检测器：用电池、灯泡和两根导线组成检测装置，测试铅笔芯、橡皮、钥匙、塑料尺是否导电。'
      ]
    },
    assessment: [
      {
        type: '课堂观察',
        text: '分组连接时观察学生是否让电流回到电池负极、是否同时接入小灯泡的两个接线处。',
        criteria: '能独立完成连接并使灯泡发光；能在追问下指出完整的回路路径。'
      },
      {
        type: '出口条',
        text: '画出简单电路图并标注电流方向。',
        criteria: '回路闭合、元件符号正确、箭头从正极经灯泡回到负极。'
      },
      {
        type: '纸笔检测',
        text: '判断通路、断路、短路各 2 题，并解释短路为什么危险。',
        criteria: '6 题正确不少于 5 题；能用「电流很大、发热」解释短路。'
      }
    ],
    homework: {
      basic: [
        '在记录本上画出课堂上成功点亮灯泡的连接图，用箭头标出电流路径。',
        '列举家中 3 处用到开关的地方，说明每个开关控制什么。'
      ],
      advanced: [
        '设计「两盏灯、一个开关」的电路，要求闭合开关两灯都亮，画出电路图。',
        '用表格比较串联和并联：电流路径条数、取下一盏灯后另一盏是否发光。'
      ],
      remedial: [
        '补画完整回路：给出 3 幅缺一条导线的图，补线使灯泡发光。',
        '口头复述：电流从哪儿出发、经过什么、回到哪儿，再用一句话写下来。'
      ]
    },
    differentiation: {
      support: [
        '提供可吸附的电路板，先摆元件再画图，降低接线难度。',
        '给出只缺一条导线的半成品电路图，让学生补全并说明理由。'
      ],
      extension: [
        '探究电池数量与亮度：两节电池串联、并联分别接同一灯泡，比较亮度并说明原因，强调不得超过灯泡额定电压。',
        '用带限流电阻的发光二极管模块替代小灯泡，观察接反时不亮，讨论元件的极性。'
      ]
    },
    risks: [
      {
        risk: '短路导致电池发热、导线烫手',
        fallback:
          '课前检查导线绝缘层；教师示范短路只闭合 1 秒，并明确禁止学生自行短接；发现发热立即断开。'
      },
      {
        risk: '器材不足，无法两人一组',
        fallback:
          '改为「讲台示范 + 小组轮换」，或使用电路仿真软件与电路贴片，保证每名学生至少完成一次电流路径标注。'
      },
      {
        risk: '学生只关注「亮不亮」，说不出回路',
        fallback: '记录单强制要求画箭头；用「电流小人旅行」的口头支架复述路径。'
      }
    ],
    classProfile: {
      className: '六年级（2）班 · 科学（示例班级）',
      sampleSize: 42,
      term: '2026 秋季学期',
      weakPoints: [
        { label: '闭合回路与电流路径', ratio: 0.45, trend: 'up' },
        { label: '小灯泡两个接线处的连接', ratio: 0.38, trend: 'flat' },
        { label: '短路与断路的区分', ratio: 0.31, trend: 'up' },
        { label: '串联与并联的电流路径', ratio: 0.26, trend: 'flat' }
      ]
    }
  },

  /* ------------------------------------------------------------------ */
  /* 2. 初中数学 · 一次函数 · 北师大版八年级上册                        */
  /* ------------------------------------------------------------------ */
  {
    id: 'math-linear-function',
    stage: '初中',
    subject: '数学',
    grade: '八年级上册',
    textbook: '北师大版',
    unit: '第四章《一次函数》',
    title: '一次函数',
    summary:
      '从弹簧伸长、计费等均匀变化情境抽象出 y=kx+b，打通「情境—表达式—图象—性质—应用」的链条，重点澄清 k、b 与图象位置、增减性的对应关系。',
    needExamples: [
      '学生能背出「k 大于零就上升」，但一换到 y=−3x+2 就判断错，怎么讲才不靠记忆？',
      '40 分钟新授，既要画图、又要归纳性质、还要练待定系数法，时间怎么分配？',
      '班里没有平板，GeoGebra 用不了，怎么让学生看到 k、b 变化对图象的影响？'
    ],
    sources: [
      {
        id: 'math-s1',
        type: '教材',
        title: '《数学》（北师大版）八年级上册',
        locator: '第四章《一次函数》· 第 2 节',
        excerpt:
          '若两个变量 x、y 之间的关系可以表示成 y=kx+b（k、b 为常数，k≠0）的形式，则称 y 是 x 的一次函数；当 b=0 时，y=kx，y 是 x 的正比例函数。',
        confidence: 0.95
      },
      {
        id: 'math-s2',
        type: '教材',
        title: '《数学》（北师大版）八年级上册',
        locator: '第四章《一次函数》· 第 3 节《一次函数的图象》',
        excerpt:
          '一次函数 y=kx+b 的图象是一条直线；k>0 时 y 随 x 增大而增大，k<0 时 y 随 x 增大而减小；图象与 y 轴交于点 (0,b)。',
        confidence: 0.95
      },
      {
        id: 'math-s3',
        type: '教材',
        title: '《数学》（北师大版）八年级上册',
        locator: '第四章《一次函数》· 第 4 节《一次函数的应用》',
        excerpt:
          '先根据实际问题建立一次函数模型，再利用图象或表达式解决问题，并对结果的实际意义作出解释。',
        confidence: 0.9
      },
      {
        id: 'math-s4',
        type: '课标',
        title: '义务教育数学课程标准（2022 年版）',
        locator: '第四学段 · 数与代数 · 函数主题',
        excerpt:
          '结合具体情境体会一次函数的意义，能根据已知条件确定一次函数的表达式；会利用待定系数法确定一次函数的表达式；能画出一次函数的图象，根据图象和表达式 y=kx+b（k≠0）探索并理解 k>0 和 k<0 时图象的变化情况；理解正比例函数；能用一次函数解决简单实际问题。',
        confidence: 0.96
      },
      {
        id: 'math-s5',
        type: '解读',
        title: '《义务教育数学课程标准（2022 年版）解读》',
        locator: '数与代数 · 函数主题 · 教学建议',
        excerpt:
          '函数教学应让学生经历「具体情境—表达式—图象—性质」的过程，避免只做解析式运算。',
        confidence: 0.84
      },
      {
        id: 'math-s6',
        type: '校本',
        title: '八年级数学备课组《一次函数前测》',
        locator: '第 1—6 题',
        excerpt:
          '前测中，学生能由 x 求 y，但常把 b 说成「图象与 x 轴的交点」，对 k 的符号与增减性的对应关系不稳定。',
        confidence: 0.76
      },
      {
        id: 'math-s7',
        type: '校本',
        title: '《一次函数分层作业单》',
        locator: 'A 层第 1—4 题、B 层第 1—3 题、C 层第 1—2 题',
        excerpt: 'A 层以图象判断和待定系数法为主，B 层增加实际情境，C 层只要求画图与读图。',
        confidence: 0.8
      },
      {
        id: 'math-s8',
        type: '外部',
        title: '国家中小学智慧教育平台 · 初中数学八年级课例',
        locator: '《一次函数的图象与性质》第 1 课时',
        excerpt: '课例用几何画板拖动 k、b，让学生观察直线倾斜方向和与 y 轴交点的变化。',
        confidence: 0.66
      },
      {
        id: 'math-s9',
        type: '外部',
        title: 'GeoGebra 资源：直线 y=kx+b 的动态探索',
        locator: 'Slope-Intercept Form · 滑杆 k、b',
        excerpt: '拖动滑杆改变 k、b，实时显示直线与 y 轴交点及增减性。',
        confidence: 0.6
      },
      {
        id: 'math-s10',
        type: '教材',
        title: '《数学》（北师大版）七年级下册',
        locator: '第三章《变量之间的关系》',
        excerpt:
          '在具体情境中理解变量、自变量和因变量，能用表格、关系式和图象表示变量之间的关系。',
        confidence: 0.88
      }
    ],
    graph: {
      nodes: [
        {
          id: 'math-variable',
          label: '变量与函数',
          layer: 0,
          kind: 'prior',
          desc: '在一个变化过程中有两个变量 x、y，如果给定 x 的值，y 都有唯一确定的值与之对应，那么 y 是 x 的函数。',
          sourceIds: ['math-s10', 'math-s4']
        },
        {
          id: 'math-coord',
          label: '平面直角坐标系',
          layer: 0,
          kind: 'prior',
          desc: '用有序数对 (x,y) 表示平面内的点，横坐标、纵坐标分别对应到两轴的距离。',
          sourceIds: ['math-s2']
        },
        {
          id: 'math-equation',
          label: '一元一次方程',
          layer: 0,
          kind: 'prior',
          desc: '形如 ax+b=0（a≠0）的方程，移项、合并同类项即可求解；一次函数 y=kx+b 的零点就是对应方程的解。',
          sourceIds: ['math-s1', 'math-s5']
        },
        {
          id: 'math-proportional',
          label: '正比例函数',
          layer: 1,
          kind: 'concept',
          desc: 'y=kx（k≠0）的一次函数，图象是过原点的一条直线。',
          sourceIds: ['math-s1', 'math-s2']
        },
        {
          id: 'math-definition',
          label: '一次函数的概念',
          layer: 1,
          kind: 'concept',
          desc: '形如 y=kx+b（k、b 为常数，k≠0）的函数；k 是一次项系数，b 是常数项。',
          sourceIds: ['math-s1', 'math-s4']
        },
        {
          id: 'math-slope',
          label: 'k 与增减性',
          layer: 2,
          kind: 'concept',
          desc: 'k>0 时，y 随 x 增大而增大；k<0 时，y 随 x 增大而减小；|k| 越大，直线越陡。',
          sourceIds: ['math-s2', 'math-s4']
        },
        {
          id: 'math-intercept',
          label: 'b 与 y 轴交点',
          layer: 2,
          kind: 'concept',
          desc: '直线 y=kx+b 与 y 轴交于点 (0,b)；b 决定直线与 y 轴交点的位置。',
          sourceIds: ['math-s2']
        },
        {
          id: 'math-graph',
          label: '一次函数的图象',
          layer: 2,
          kind: 'concept',
          desc: '一次函数的图象是一条直线，两点确定一条直线，通常取 (0,b) 和 (-b/k,0) 或任意两个便于计算的点。',
          sourceIds: ['math-s2', 'math-s4']
        },
        {
          id: 'math-determine',
          label: '待定系数法',
          layer: 2,
          kind: 'concept',
          desc: '设 y=kx+b，代入两组对应值得到关于 k、b 的方程组，解出 k、b，从而确定表达式。',
          sourceIds: ['math-s1', 'math-s3']
        },
        {
          id: 'math-model',
          label: '一次函数模型',
          layer: 3,
          kind: 'concept',
          desc: '把行程、计费、水位等实际问题中的两个变量关系抽象为 y=kx+b，并用 k、b 的实际意义解释结果。',
          sourceIds: ['math-s3', 'math-s5']
        },
        {
          id: 'math-target',
          label: '一次函数',
          layer: 3,
          kind: 'target',
          desc: '形如 y=kx+b（k≠0）的函数，能用表达式、图象、性质三种方式刻画，并用于解决实际问题。',
          sourceIds: ['math-s1', 'math-s2', 'math-s4']
        },
        {
          id: 'math-m-intercept',
          label: 'b 是与 x 轴的交点',
          layer: 2,
          kind: 'misconception',
          desc: '把 b 误认为图象与 x 轴交点的横坐标；实际上 b 是与 y 轴交点的纵坐标。',
          sourceIds: ['math-s6', 'math-s2']
        },
        {
          id: 'math-m-slope',
          label: 'k<0 时 y 随 x 增大而增大',
          layer: 2,
          kind: 'misconception',
          desc: '把 k 的符号与增减性的对应关系记反；可取直线上两点比较函数值来验证。',
          sourceIds: ['math-s6', 'math-s2']
        },
        {
          id: 'math-m-proportional',
          label: '正比例函数不是一次函数',
          layer: 1,
          kind: 'misconception',
          desc: '认为正比例函数与一次函数是并列关系；实际上 b=0 时的一次函数就是正比例函数。',
          sourceIds: ['math-s1', 'math-s6']
        }
      ],
      edges: [
        {
          from: 'math-variable',
          to: 'math-definition',
          relation: 'prerequisite',
          confidence: 0.93,
          basis: '先理解两个变量之间的唯一对应关系，才能接受一次函数的定义。',
          sourceIds: ['math-s10', 'math-s4']
        },
        {
          from: 'math-coord',
          to: 'math-graph',
          relation: 'prerequisite',
          confidence: 0.96,
          basis: '描点、连线必须在平面直角坐标系中完成，坐标是图象的语言。',
          sourceIds: ['math-s2']
        },
        {
          from: 'math-equation',
          to: 'math-determine',
          relation: 'supports',
          confidence: 0.82,
          basis: '待定系数法要解关于 k、b 的二元一次方程组，方程变形能力是基础。',
          sourceIds: ['math-s1', 'math-s5']
        },
        {
          from: 'math-proportional',
          to: 'math-definition',
          relation: 'prerequisite',
          confidence: 0.9,
          basis: '正比例函数是 b=0 的特殊一次函数，先掌握它再推广到一般情形。',
          sourceIds: ['math-s1', 'math-s2']
        },
        {
          from: 'math-definition',
          to: 'math-target',
          relation: 'leads-to',
          confidence: 0.95,
          basis: '概念辨析是目标达成的第一层，能识别 k≠0 是判断一次函数的关键。',
          sourceIds: ['math-s1', 'math-s4']
        },
        {
          from: 'math-graph',
          to: 'math-target',
          relation: 'supports',
          confidence: 0.94,
          basis: '图象把解析式中的 k、b 转化为可见的倾斜方向与交点位置。',
          sourceIds: ['math-s2', 'math-s4']
        },
        {
          from: 'math-slope',
          to: 'math-graph',
          relation: 'part-of',
          confidence: 0.93,
          basis: 'k 决定直线的倾斜方向和增减性，是读图的核心要素。',
          sourceIds: ['math-s2']
        },
        {
          from: 'math-intercept',
          to: 'math-graph',
          relation: 'part-of',
          confidence: 0.93,
          basis: 'b 决定直线与 y 轴交点 (0,b)，是读图的另一核心要素。',
          sourceIds: ['math-s2']
        },
        {
          from: 'math-slope',
          to: 'math-target',
          relation: 'supports',
          confidence: 0.88,
          basis: '由 k 的符号判断增减性，是课标要求掌握的一次函数性质。',
          sourceIds: ['math-s2', 'math-s4']
        },
        {
          from: 'math-intercept',
          to: 'math-target',
          relation: 'supports',
          confidence: 0.85,
          basis: '由 b 确定图象与 y 轴交点，是画图与读图的基本技能。',
          sourceIds: ['math-s2']
        },
        {
          from: 'math-determine',
          to: 'math-target',
          relation: 'supports',
          confidence: 0.9,
          basis: '待定系数法是由条件求表达式的基本方法，直接支撑目标中的「确定表达式」。',
          sourceIds: ['math-s1', 'math-s3']
        },
        {
          from: 'math-model',
          to: 'math-target',
          relation: 'leads-to',
          confidence: 0.86,
          basis: '把实际问题抽象为一次函数，是目标中的迁移层级。',
          sourceIds: ['math-s3', 'math-s5']
        },
        {
          from: 'math-graph',
          to: 'math-model',
          relation: 'supports',
          confidence: 0.84,
          basis: '借助图象读取交点与变化趋势，能帮助解释实际问题的分界点。',
          sourceIds: ['math-s3']
        },
        {
          from: 'math-m-intercept',
          to: 'math-intercept',
          relation: 'contrasts',
          confidence: 0.88,
          basis: '把 b 误当 x 轴交点，是 b 的几何意义最常见的混淆，需要用 (0,b) 直接纠正。',
          sourceIds: ['math-s6', 'math-s2']
        },
        {
          from: 'math-m-slope',
          to: 'math-slope',
          relation: 'contrasts',
          confidence: 0.87,
          basis: '增减性判断错误多来自符号记忆，取点比较函数值可形成可检验的判断依据。',
          sourceIds: ['math-s6', 'math-s2']
        },
        {
          from: 'math-m-proportional',
          to: 'math-definition',
          relation: 'contrasts',
          confidence: 0.85,
          basis: '把正比例函数排除在一次函数之外，会破坏定义的包含关系，需用 b=0 澄清。',
          sourceIds: ['math-s1', 'math-s6']
        },
        {
          from: 'math-proportional',
          to: 'math-graph',
          relation: 'supports',
          confidence: 0.82,
          basis: '正比例函数图象过原点，是理解 b 引起平移的参照线。',
          sourceIds: ['math-s2']
        }
      ]
    },
    objectives: [
      {
        text: '能判断一个关系式是否为一次函数，指出 k、b 的值，并说明正比例函数与一次函数的关系。',
        level: '理解',
        sourceIds: ['math-s1', 'math-s4']
      },
      {
        text: '会用两点法画出一次函数图象，能根据 k、b 的符号说出增减性和图象经过的象限。',
        level: '应用',
        sourceIds: ['math-s2', 'math-s4']
      },
      {
        text: '会用待定系数法由两组对应值确定一次函数表达式。',
        level: '应用',
        sourceIds: ['math-s1', 'math-s3']
      },
      {
        text: '能把行程、计费等实际问题转化为一次函数模型，并解释 k、b 的实际意义。',
        level: '迁移',
        sourceIds: ['math-s3', 'math-s5']
      }
    ],
    keyPoints: [
      '一次函数 y=kx+b 中 k≠0，b 可以为 0；b=0 时是正比例函数',
      'k 的符号决定增减性，b 决定图象与 y 轴交点 (0,b)',
      '两点确定一条直线，画图取点要便于计算并落在坐标纸范围内'
    ],
    difficulties: [
      '在「解析式—图象—性质」之间双向转化，而不是只记结论',
      'k、b 的符号与图象经过象限的对应关系容易记混',
      '把实际情境中的初始量和变化率识别为 b 和 k'
    ],
    misconceptions: [
      {
        nodeId: 'math-m-intercept',
        label: 'b 是与 x 轴的交点',
        misconception: '把 b 当成图象与 x 轴交点的横坐标，画图时把 (b,0) 标成与 y 轴的交点。',
        sourceIds: ['math-s6', 'math-s2']
      },
      {
        nodeId: 'math-m-slope',
        label: 'k<0 时 y 仍随 x 增大',
        misconception: '只记住「直线上升」，看到 k<0 仍判断函数值随 x 增大而增大。',
        sourceIds: ['math-s6', 'math-s2']
      },
      {
        nodeId: 'math-m-proportional',
        label: '正比例函数不是一次函数',
        misconception: '认为正比例函数与一次函数是两类互不包含的函数。',
        sourceIds: ['math-s1', 'math-s6']
      }
    ],
    flowTemplate: [
      {
        phase: '导入',
        minutes: 5,
        teacher:
          '出示弹簧：原长 12 cm，每挂 1 kg 物体伸长 0.5 cm（弹性限度内）。写出长度 y 与质量 x 的关系式 y=0.5x+12，追问「它和 y=0.5x 有什么不同」。',
        student: '计算 2 kg、4 kg 时的弹簧长度，观察关系式的结构，说出常数 12 的含义。',
        evidence: '能写出 y=0.5x+12，并指出 12 是「没有挂物体时的长度」。',
        sourceIds: ['math-s1', 'math-s5']
      },
      {
        phase: '探究',
        minutes: 12,
        teacher:
          '组织学生在同一坐标系中列表、描点、连线，画出 y=2x 与 y=2x+3，观察两条直线的位置关系。',
        student: '完成列表与描点，用量角器或方格纸比较倾斜程度，发现两直线平行、后者由前者向上平移 3 个单位得到。',
        evidence: '图象为直线；能说出 k 相同则平行，b 不同则上下平移。',
        sourceIds: ['math-s2', 'math-s9']
      },
      {
        phase: '建构',
        minutes: 11,
        teacher:
          '用 GeoGebra 或透明胶片呈现 k、b 变化，归纳：k 定倾斜与增减，b 定与 y 轴交点 (0,b)；用 x=0 代入验证交点。',
        student: '记录 4 组 k、b 变化对应的图象，填「符号—草图—增减性」对照表。',
        evidence: '能由 y=−3x+2 判断直线下降、与 y 轴交于 (0,2)。',
        sourceIds: ['math-s2', 'math-s4', 'math-s8']
      },
      {
        phase: '应用',
        minutes: 12,
        teacher:
          '示范待定系数法：直线经过 (0,3) 与 (2,7)，求表达式；再给出计费情境，要求写出表达式并解释 k、b；最后完成 3 道当堂检测题。',
        student: '设 y=kx+b，代入两点解方程组得 y=2x+3；独立完成一道计费题并说明 k、b 的实际意义；完成 3 道检测题。',
        evidence: '方程组列式与求解正确；3 题全对为达标，错题能写出代入验证或画图依据。',
        sourceIds: ['math-s1', 'math-s3', 'math-s4', 'math-s7']
      },
      {
        phase: '总结',
        minutes: 3,
        teacher: '带学生画知识结构图：情境 → 表达式 → 图象 → 性质 → 应用，并回扣导入的弹簧问题。',
        student: '补全结构图，用一句话说出 k、b 各自管什么。',
        evidence: '结构图完整；能用「k 管倾斜、b 管截距」概括。',
        sourceIds: ['math-s1', 'math-s5']
      }
    ],
    activities: {
      basic: [
        '给出 6 个函数式，判断哪些是一次函数、哪些是正比例函数，并写出 k、b。',
        '在同一直角坐标系中画出 y=2x、y=2x+3、y=2x−3，观察三条直线的位置关系。'
      ],
      advanced: [
        '已知一次函数图象经过两点，求表达式，并判断图象经过哪些象限。',
        '用一次函数解决「两种手机套餐哪种更划算」的问题：写出两个表达式、画图、求分界点并解释。'
      ],
      'hands-on': [
        '用方格纸和直尺完成「两点画直线」操作，比较取 (0,b) 与 (-b/k,0) 和取任意两点的作图效率。',
        '用 GeoGebra 拖动 k、b 滑杆，记录 4 组变化并归纳规律；无设备时用两张透明胶片分别画不同 b 的直线叠放比较。',
        '用弹簧、钩码、刻度尺采集 5 组「质量—长度」数据，描点判断是否近似成直线，并估计表达式。'
      ]
    },
    assessment: [
      {
        type: '当堂检测',
        text: '3 题：判断一次函数、由 k、b 符号判断增减性、求与坐标轴交点。',
        criteria: '3 题全对为达标；错 1 题需在订正栏写出代入验证或画图依据。'
      },
      {
        type: '作图与表达',
        text: '画出 y=−2x+4 的图象，并结合图象说明 x 取何值时 y>0。',
        criteria: '直线过 (0,4) 与 (2,0)；由图象得出 x<2，且能说明边界点 x=2 时 y=0。'
      },
      {
        type: '建模任务',
        text: '根据弹簧伸长数据表求一次函数表达式，并预测挂 6 kg 时的长度（弹性限度内）。',
        criteria: '表达式形如 y=0.5x+12；预测值 15 cm；能说明 b、k 的实际意义。'
      }
    ],
    homework: {
      basic: [
        '教材第四章第 3 节随堂练习：画出 3 条一次函数图象并填空。',
        '已知 y=kx+2 的图象经过点 (3,8)，求 k 的值。'
      ],
      advanced: [
        '已知一次函数图象与 y 轴交于 (0,−3)，且经过 (2,1)，求表达式及与 x 轴的交点。',
        '设计一个能用一次函数描述的生活情境，写出表达式、画出图象，并说明 k、b 的意义。'
      ],
      remedial: [
        '填表：给出 y=3x−1 的 5 个 x 值，求对应 y，并描点连线。',
        '判断 y=2x+1、y=−x、y=5 是否为一次函数，说明理由。'
      ]
    },
    differentiation: {
      support: [
        '提供「k、b 符号—图象草图」对照卡，先判断再画图。',
        '用两点模板 (0,b) 与 (1,k+b) 降低取点难度。'
      ],
      extension: [
        '探究一次函数与一元一次方程、不等式的关系：由图象直接读出 kx+b=0 的解和 kx+b>0 的解集。',
        '比较 y=k₁x+b₁ 与 y=k₂x+b₂ 的交点坐标与对应方程组的解的关系。'
      ]
    },
    risks: [
      {
        risk: '描点作图耗时，性质归纳被压缩',
        fallback: '课前印发坐标纸，只要求画两条直线；其余变化用 GeoGebra 或预制幻灯片呈现。'
      },
      {
        risk: '学生把 b 当成与 x 轴交点',
        fallback: '每画一条直线都标出 (0,b)，并用 x=0 代入验证；把错例与正例并排对比。'
      },
      {
        risk: '实际建模时忽略自变量取值范围',
        fallback: '建模题强制写出 x 的取值范围，并回到情境检验端点是否符合实际。'
      }
    ],
    classProfile: {
      className: '八年级（5）班 · 数学（示例班级）',
      sampleSize: 44,
      term: '2026 秋季学期',
      weakPoints: [
        { label: '函数概念与自变量取值范围', ratio: 0.34, trend: 'flat' },
        { label: 'k、b 符号与图象性质', ratio: 0.42, trend: 'up' },
        { label: '待定系数法', ratio: 0.29, trend: 'flat' },
        { label: '实际情境建模', ratio: 0.37, trend: 'up' }
      ]
    }
  },

  /* ------------------------------------------------------------------ */
  /* 3. 高中物理 · 牛顿第二定律 · 人教版必修一                          */
  /* ------------------------------------------------------------------ */
  {
    id: 'physics-newton-second',
    stage: '高中',
    subject: '物理',
    grade: '高一（必修第一册）',
    textbook: '人教版',
    unit: '第四章《运动和力的关系》· 第 3 节《牛顿第二定律》',
    title: '牛顿第二定律',
    summary:
      '以「同一物体、相同拉力、不同质量」的对比实验切入，经控制变量探究得出 a∝F、a∝1/m，再建构 F合=ma，重点突破合力、方向与瞬时性。',
    needExamples: [
      '实验室打点计时器坏了 6 套，40 分钟新授课还要做探究，怎么保证学生看到 a 与 F、m 的关系？',
      '学生总把 F=ma 里的 F 当成拉力，做题时不做受力分析，怎么纠正？',
      '竖直上抛最高点速度为零、加速度却为 g，学生接受不了，用什么例子讲最有效？'
    ],
    sources: [
      {
        id: 'phy-s1',
        type: '教材',
        title: '《物理》（人教版）必修第一册',
        locator: '第四章《运动和力的关系》· 第 3 节《牛顿第二定律》',
        excerpt:
          '物体加速度的大小跟它受到的合力成正比、跟它的质量成反比，加速度的方向跟合力的方向相同；表达式 F合=ma。',
        confidence: 0.96
      },
      {
        id: 'phy-s2',
        type: '教材',
        title: '《物理》（人教版）必修第一册',
        locator: '第四章《运动和力的关系》· 第 2 节《实验：探究加速度与力、质量的关系》',
        excerpt:
          '用控制变量法：保持质量不变，改变拉力，得到 a-F 图象；保持拉力不变，改变质量，得到 a-1/m 图象。',
        confidence: 0.95
      },
      {
        id: 'phy-s3',
        type: '课标',
        title: '普通高中物理课程标准（2017 年版 2020 年修订）',
        locator: '必修课程 · 必修 1 · 主题 2「相互作用与运动定律」',
        excerpt:
          '通过实验，探究物体运动的加速度与物体受力、物体质量的关系。理解牛顿运动定律，能用牛顿运动定律解释生产生活中的有关现象、解决有关问题。',
        confidence: 0.96
      },
      {
        id: 'phy-s4',
        type: '解读',
        title: '《普通高中物理课程标准（2017 年版 2020 年修订）解读》',
        locator: '必修 1 · 主题 2 · 教学建议',
        excerpt: '教学应突出实验探究和矢量性，避免把 F=ma 简化为代数计算。',
        confidence: 0.85
      },
      {
        id: 'phy-s5',
        type: '校本',
        title: '物理组《牛顿运动定律前测》',
        locator: '第 1—6 题',
        excerpt:
          '前测中，约半数学生认为「物体速度为零时加速度一定为零」，并把 F=ma 中的 F 理解为某一个力而非合力。',
        confidence: 0.78
      },
      {
        id: 'phy-s6',
        type: '校本',
        title: '《无打点计时器条件下的探究方案》',
        locator: '第 2 课时 · 手机慢动作 + 刻度尺',
        excerpt:
          '用手机 240 帧慢动作拍摄小车在近似恒定拉力下的运动，量取相同时间间隔的位移，用逐差法求加速度；用弹簧测力计监测拉力，或用已知质量的重物提供近似恒力。',
        confidence: 0.82
      },
      {
        id: 'phy-s7',
        type: '外部',
        title: 'PhET 互动仿真 · Forces and Motion: Basics',
        locator: 'Net Force / Acceleration 模块',
        excerpt:
          '可改变拉力与质量，实时显示合力、加速度与速度，用于无法开展实体实验时的替代探究。',
        confidence: 0.7
      },
      {
        id: 'phy-s8',
        type: '外部',
        title: '国家中小学智慧教育平台 · 高中物理必修一课例',
        locator: '《牛顿第二定律》第 1 课时',
        excerpt: '课例先让学生定性感受「同一物体用力越大加速越快」，再进入定量探究。',
        confidence: 0.66
      },
      {
        id: 'phy-s9',
        type: '解读',
        title: '人教版教师教学用书 · 物理必修第一册',
        locator: '第四章第 3 节 · 教材分析与教学建议',
        excerpt:
          '本节课的重点是得出并理解 F=ma，难点是合力与加速度的方向关系及瞬时性；应通过例题示范受力分析。',
        confidence: 0.88
      }
    ],
    graph: {
      nodes: [
        {
          id: 'phy-inertia',
          label: '牛顿第一定律与惯性',
          layer: 0,
          kind: 'prior',
          desc: '一切物体总保持匀速直线运动状态或静止状态，直到有外力迫使它改变这种状态；力是改变运动状态的原因。',
          sourceIds: ['phy-s1', 'phy-s3']
        },
        {
          id: 'phy-force',
          label: '力与合力',
          layer: 0,
          kind: 'prior',
          desc: '力是矢量，多个力作用在同一物体上时，用平行四边形法则或正交分解求合力；F=ma 中的 F 指合力。',
          sourceIds: ['phy-s1', 'phy-s5']
        },
        {
          id: 'phy-accel',
          label: '加速度',
          layer: 0,
          kind: 'prior',
          desc: '加速度描述速度变化的快慢，a=Δv/Δt，方向与速度变化量的方向相同。',
          sourceIds: ['phy-s1', 'phy-s3']
        },
        {
          id: 'phy-mass',
          label: '质量与惯性',
          layer: 1,
          kind: 'concept',
          desc: '质量是惯性大小的量度，在经典力学中不随受力或运动状态改变。',
          sourceIds: ['phy-s1']
        },
        {
          id: 'phy-control',
          label: '控制变量法',
          layer: 1,
          kind: 'concept',
          desc: '研究三个量之间的关系时，先固定其中一个，改变另一个，观察第三个量的变化。',
          sourceIds: ['phy-s2', 'phy-s4']
        },
        {
          id: 'phy-explore',
          label: '实验探究 a 与 F、m 的关系',
          layer: 2,
          kind: 'concept',
          desc: '保持质量不变，a 与 F 成正比；保持拉力不变，a 与 m 成反比，即 a 与 1/m 成正比。',
          sourceIds: ['phy-s2', 'phy-s6']
        },
        {
          id: 'phy-formula',
          label: '牛顿第二定律 F=ma',
          layer: 3,
          kind: 'target',
          desc: '物体加速度的大小跟合力成正比、跟质量成反比，加速度方向与合力方向相同；表达式 F合=ma。',
          sourceIds: ['phy-s1', 'phy-s3']
        },
        {
          id: 'phy-direction',
          label: '加速度方向由合力方向决定',
          layer: 2,
          kind: 'concept',
          desc: '加速度与合力同向，与速度方向无必然联系；合力与速度反向时物体减速。',
          sourceIds: ['phy-s1', 'phy-s4']
        },
        {
          id: 'phy-instant',
          label: '瞬时性与同体性',
          layer: 2,
          kind: 'concept',
          desc: 'F=ma 中的 F、m、a 必须对应同一物体、同一时刻；合力改变，加速度同时改变。',
          sourceIds: ['phy-s1', 'phy-s9']
        },
        {
          id: 'phy-unit',
          label: '力学单位制与 1 N 的规定',
          layer: 2,
          kind: 'concept',
          desc: '使质量 1 kg 的物体产生 1 m/s² 加速度的力为 1 N，即 1 N=1 kg·m/s²。',
          sourceIds: ['phy-s1', 'phy-s3']
        },
        {
          id: 'phy-problems',
          label: '两类动力学问题',
          layer: 3,
          kind: 'concept',
          desc: '加速度是把受力与运动联系起来的桥梁：已知受力求运动时，先用 F=ma 求 a，再用运动学公式求 v、x；已知运动求受力时，先用运动学公式求 a，再用 F=ma 求力。',
          sourceIds: ['phy-s1', 'phy-s9']
        },
        {
          id: 'phy-m-zerovel',
          label: '速度为零则加速度为零',
          layer: 2,
          kind: 'misconception',
          desc: '把速度与加速度混为一谈；竖直上抛到最高点时速度为零，但合力仍为重力，加速度为 g。',
          sourceIds: ['phy-s5', 'phy-s1']
        },
        {
          id: 'phy-m-singleforce',
          label: 'F=ma 中的 F 是某一个力',
          layer: 2,
          kind: 'misconception',
          desc: '忽略合力，直接把某个拉力或重力代入公式。',
          sourceIds: ['phy-s5', 'phy-s1']
        },
        {
          id: 'phy-m-forcevelocity',
          label: '有力才有速度，撤力即停',
          layer: 1,
          kind: 'misconception',
          desc: '沿用「运动需要力维持」的直觉；实际上力改变运动状态，不是维持运动的原因。',
          sourceIds: ['phy-s5', 'phy-s8']
        }
      ],
      edges: [
        {
          from: 'phy-inertia',
          to: 'phy-force',
          relation: 'prerequisite',
          confidence: 0.88,
          basis: '理解力改变运动状态，才容易接受加速度由合力产生。',
          sourceIds: ['phy-s1', 'phy-s3']
        },
        {
          from: 'phy-force',
          to: 'phy-formula',
          relation: 'prerequisite',
          confidence: 0.95,
          basis: 'F=ma 中的 F 是合力，不会求合力就无法正确使用定律。',
          sourceIds: ['phy-s1', 'phy-s5']
        },
        {
          from: 'phy-accel',
          to: 'phy-formula',
          relation: 'prerequisite',
          confidence: 0.96,
          basis: '加速度是定律要定量求解的核心量，先理解其定义与方向。',
          sourceIds: ['phy-s1', 'phy-s3']
        },
        {
          from: 'phy-mass',
          to: 'phy-formula',
          relation: 'prerequisite',
          confidence: 0.9,
          basis: '质量是惯性大小的量度，决定相同合力下加速度的大小。',
          sourceIds: ['phy-s1']
        },
        {
          from: 'phy-control',
          to: 'phy-explore',
          relation: 'prerequisite',
          confidence: 0.94,
          basis: '探究 a、F、m 三个量的关系必须使用控制变量法。',
          sourceIds: ['phy-s2', 'phy-s4']
        },
        {
          from: 'phy-explore',
          to: 'phy-formula',
          relation: 'leads-to',
          confidence: 0.96,
          basis: '实验归纳出 a∝F、a∝1/m，是得出 F=ma 的证据基础。',
          sourceIds: ['phy-s2', 'phy-s6']
        },
        {
          from: 'phy-formula',
          to: 'phy-direction',
          relation: 'supports',
          confidence: 0.9,
          basis: '矢量式 F=ma 直接给出加速度与合力同向。',
          sourceIds: ['phy-s1', 'phy-s4']
        },
        {
          from: 'phy-formula',
          to: 'phy-instant',
          relation: 'supports',
          confidence: 0.86,
          basis: '合力与加速度同时存在、同时变化，体现定律的瞬时性。',
          sourceIds: ['phy-s1', 'phy-s9']
        },
        {
          from: 'phy-formula',
          to: 'phy-unit',
          relation: 'supports',
          confidence: 0.8,
          basis: '由 F=ma 规定力的单位，1 N 的定义与公式一致。',
          sourceIds: ['phy-s1', 'phy-s3']
        },
        {
          from: 'phy-formula',
          to: 'phy-problems',
          relation: 'leads-to',
          confidence: 0.92,
          basis: '两类动力学问题都以 F=ma 求加速度作为桥梁。',
          sourceIds: ['phy-s1', 'phy-s9']
        },
        {
          from: 'phy-direction',
          to: 'phy-problems',
          relation: 'supports',
          confidence: 0.84,
          basis: '解题时必须先定合力方向，再确定加速度方向，才能判断运动性质。',
          sourceIds: ['phy-s1', 'phy-s9']
        },
        {
          from: 'phy-mass',
          to: 'phy-inertia',
          relation: 'part-of',
          confidence: 0.9,
          basis: '质量是惯性大小的量度，是牛顿第一定律的定量补充。',
          sourceIds: ['phy-s1']
        },
        {
          from: 'phy-m-zerovel',
          to: 'phy-accel',
          relation: 'contrasts',
          confidence: 0.9,
          basis: '把速度为零等同于加速度为零，混淆了两个描述运动的不同物理量。',
          sourceIds: ['phy-s5', 'phy-s1']
        },
        {
          from: 'phy-m-singleforce',
          to: 'phy-force',
          relation: 'contrasts',
          confidence: 0.92,
          basis: '把某一个力当作合力，会导致加速度方向和大小都算错。',
          sourceIds: ['phy-s5', 'phy-s1']
        },
        {
          from: 'phy-m-forcevelocity',
          to: 'phy-inertia',
          relation: 'contrasts',
          confidence: 0.88,
          basis: '「有力才有速度」与牛顿第一定律直接冲突，需用惯性现象澄清。',
          sourceIds: ['phy-s5', 'phy-s8']
        },
        {
          from: 'phy-explore',
          to: 'phy-control',
          relation: 'supports',
          confidence: 0.85,
          basis: '实验过程反过来强化对控制变量法的理解。',
          sourceIds: ['phy-s2', 'phy-s6']
        },
        {
          from: 'phy-m-forcevelocity',
          to: 'phy-force',
          relation: 'contrasts',
          confidence: 0.83,
          basis: '认为撤去拉力物体立即停下，是把力当成维持运动的原因。',
          sourceIds: ['phy-s5', 'phy-s8']
        }
      ]
    },
    objectives: [
      {
        text: '能说出牛顿第二定律的内容，写出 F合=ma，并说明 F、m、a 的对应关系与单位。',
        level: '理解',
        sourceIds: ['phy-s1', 'phy-s3']
      },
      {
        text: '能从 a-F、a-1/m 图象分析实验数据，说明加速度与合力、质量的关系。',
        level: '应用',
        sourceIds: ['phy-s2', 'phy-s6']
      },
      {
        text: '能对水平面、斜面上的物体受力分析，求合力并计算加速度，判断加速度方向。',
        level: '应用',
        sourceIds: ['phy-s1', 'phy-s9']
      },
      {
        text: '能辨析「速度为零则加速度为零」「F 是某一个力」等错误认识，并用定律解释竖直上抛最高点、刹车等情境。',
        level: '迁移',
        sourceIds: ['phy-s5', 'phy-s1']
      }
    ],
    keyPoints: [
      'F=ma 中的 F 是合力，加速度方向与合力方向相同',
      'a 与 F 同时产生、同时变化、同时消失，具有瞬时性',
      '1 N=1 kg·m/s²，计算前统一到国际单位制'
    ],
    difficulties: [
      '求合力时的受力分析与正交分解',
      '区分速度、速度变化量与加速度，理解最高点加速度不为零',
      '把实际情境转化为「受力—加速度—运动」的链条'
    ],
    misconceptions: [
      {
        nodeId: 'phy-m-zerovel',
        label: '速度为零则加速度为零',
        misconception: '物体速度为零时就认为加速度也为零，忽略此时合力可能不为零。',
        sourceIds: ['phy-s5', 'phy-s1']
      },
      {
        nodeId: 'phy-m-singleforce',
        label: 'F 是某一个力',
        misconception: '把拉力或重力直接代入 F=ma，不做受力分析、不求合力。',
        sourceIds: ['phy-s5', 'phy-s1']
      },
      {
        nodeId: 'phy-m-forcevelocity',
        label: '有力才有速度，撤力即停',
        misconception: '认为运动必须靠力维持，撤去拉力物体就会立刻停下。',
        sourceIds: ['phy-s5', 'phy-s8']
      }
    ],
    flowTemplate: [
      {
        phase: '导入',
        minutes: 5,
        teacher:
          '两辆相同小车，一辆空载、一辆加砝码，用钩码通过滑轮提供近似相同的水平拉力，同时释放，请学生预测并观察谁先到达终点；追问「相同拉力下，为什么质量小的加速更快」。',
        student: '作出预测，观察现象，尝试用「惯性大小」解释。',
        evidence: '能说出质量越小越容易被拉动，并意识到加速度与质量有关。',
        sourceIds: ['phy-s1', 'phy-s8']
      },
      {
        phase: '探究',
        minutes: 12,
        teacher:
          '展示课前采集的 a-F 与 a-1/m 图象（手机慢动作数据或 PhET 数据），引导读斜率、看截距，强调两次实验分别控制了哪个量。',
        student: '读图求斜率，判断图线是否过原点，写出 a∝F、a∝1/m 的结论。',
        evidence: '能说明 a-F 图线斜率等于 1/m，a-1/m 图线近似为过原点的直线。',
        sourceIds: ['phy-s2', 'phy-s6', 'phy-s7']
      },
      {
        phase: '建构',
        minutes: 10,
        teacher:
          '由实验结论过渡到 F合=ma，逐一强调合力、同向、瞬时、同体；用 1 N 的定义说明单位的一致性。',
        student: '复述公式中三个量的含义，判断「F 是某一个力」为什么错。',
        evidence: '能指出 F 必须是合力，并能说出加速度方向与合力方向相同。',
        sourceIds: ['phy-s1', 'phy-s3', 'phy-s9']
      },
      {
        phase: '应用',
        minutes: 13,
        teacher:
          '例题：质量 2 kg 的物体在水平面上受 6 N 水平拉力、2 N 摩擦力，求加速度；再求从静止开始 3 s 末的速度。补充竖直上抛最高点的辨析，最后完成 2 道当堂检测题。',
        student: '画受力图，求合力 4 N，得 a=2 m/s²；由 v=at 得 6 m/s；讨论最高点 a=g；独立完成 2 道检测题。',
        evidence: '能正确求合力与加速度；能写出合力表达式与 a=F/m；最高点判断正确。',
        sourceIds: ['phy-s1', 'phy-s9', 'phy-s5']
      },
      {
        phase: '总结',
        minutes: 3,
        teacher: '板书知识链：受力分析 → 求合力 → F=ma 求 a → 运动学公式求 v、x；反向则由运动学求 a，再由 F=ma 求力；回扣导入的小车实验。',
        student: '补全知识链，用一句话说明「力如何改变运动」。',
        evidence: '能独立说出两类动力学问题的求解路径。',
        sourceIds: ['phy-s1', 'phy-s9']
      }
    ],
    activities: {
      basic: [
        '判断下列说法是否正确并说明理由：速度越大加速度越大；同一物体合力越大加速度越大；加速度方向总与速度方向相同。',
        '对水平面上受水平拉力和摩擦力的物体受力分析，求合力与加速度。'
      ],
      advanced: [
        '质量 m 的物体沿倾角 30° 的斜面下滑，动摩擦因数 0.2，求加速度（g 取 10 m/s²）。',
        '设计实验验证 a∝F：说明如何保证质量不变、如何测量加速度、如何用图象处理数据。'
      ],
      'hands-on': [
        '用手机慢动作拍摄小车在钩码拉动下的运动，量取位移，用逐差法求加速度。',
        '用 PhET 仿真改变拉力和质量，记录 5 组数据，画出 a-F 图象。',
        '用弹簧测力计拉同一小车提供不同拉力，用打点计时器或光电门测加速度。'
      ]
    },
    assessment: [
      {
        type: '当堂检测',
        text: '2 题：水平面受拉力求加速度；竖直上抛最高点判断加速度。',
        criteria: '能正确求合力、写出 a=F/m、说明方向；最高点答出 a=g、方向竖直向下。'
      },
      {
        type: '图象分析',
        text: '给出一条 a-F 直线，求斜率并说明其物理意义；若图线不过原点，解释截距的来源。',
        criteria: '斜率等于 1/m；能指出横轴截距对应摩擦力，图线不过原点是因为横轴记录的是拉力而非合力。'
      },
      {
        type: '实验报告',
        text: '提交 a 与 F、m 关系的探究报告，含数据表、图象与误差分析。',
        criteria: '控制变量明确、图象近似直线、结论与 F=ma 一致、能指出至少一条误差来源。'
      }
    ],
    homework: {
      basic: [
        '教材第四章第 3 节练习：已知受力求加速度 3 题。',
        '判断 4 条关于 F、m、a 关系的说法并说明理由。'
      ],
      advanced: [
        '质量 60 kg 的人站在电梯中的体重计上，电梯以 2 m/s² 加速上升，求体重计示数（g 取 10 m/s²）。',
        '滑块以 4 m/s 的初速度在粗糙水平面滑行，动摩擦因数 0.2，求滑行距离（g 取 10 m/s²）。'
      ],
      remedial: [
        '填表：m=2 kg，合力 F 分别为 2 N、4 N、6 N 时，求对应的加速度。',
        '复述 F=ma 中三个量的含义与单位，并举一个生活中的例子。'
      ]
    },
    differentiation: {
      support: [
        '提供受力分析步骤卡：定研究对象—画受力图—建坐标轴—求合力—代公式。',
        '先用一维水平情境，所有力共线，暂不引入斜面。'
      ],
      extension: [
        '探究电梯中的超重与失重：用体重计和手机加速度传感器记录电梯启动、匀速、制动三个阶段。',
        '讨论 F=ma 的适用条件（惯性参考系、宏观低速），并举例说明。'
      ]
    },
    risks: [
      {
        risk: '实验室打点计时器不足或损坏，探究无法开展',
        fallback: '改用手机慢动作 + 刻度尺，或 PhET 仿真；教师用课前采集的数据全班共享。'
      },
      {
        risk: '学生求合力时漏力、分解错误',
        fallback: '强制画受力图并标正方向；先练共线情形，再进入斜面。'
      },
      {
        risk: '把 F=ma 当纯代数公式，忽视方向与瞬时性',
        fallback: '每个例题都要求写出合力方向与加速度方向；用竖直上抛最高点做反例辨析。'
      }
    ],
    classProfile: {
      className: '高一（7）班 · 物理（示例班级）',
      sampleSize: 45,
      term: '2026 秋季学期',
      weakPoints: [
        { label: '速度、加速度与加速度方向', ratio: 0.51, trend: 'up' },
        { label: '合力与受力分析', ratio: 0.44, trend: 'flat' },
        { label: 'F=ma 的瞬时性与同体性', ratio: 0.33, trend: 'up' },
        { label: '图象法与实验数据处理', ratio: 0.28, trend: 'down' }
      ]
    }
  },

  /* ------------------------------------------------------------------ */
  /* 4. 大学数学 · 导数概念 · 同济版高等数学                            */
  /* ------------------------------------------------------------------ */
  {
    id: 'university-calculus',
    stage: '大学',
    subject: '数学',
    grade: '大一',
    textbook: '同济版',
    unit: '第二章 导数与微分',
    title: '导数概念',
    summary:
      '面向大一理工类大班的一次 90 分钟讲授：从平均速度与割线斜率出发，用差商的极限建立导数定义，打通几何切线、物理瞬时速度与一般变化率三种解释，并用 |x| 在原点不可导澄清「连续必可导」的误解。',
    course: {
      code: 'MATH101',
      credits: 4,
      hours: 64,
      audience: '大一理工类本科生（约 120 人）',
      assessment: '平时 20% + 期中 30% + 期末 50%'
    },
    needExamples: [
      '90 分钟大课、120 人、没有助教，推导、案例和课堂练习的时间怎么分配？',
      '学生能背出导数定义的式子，但作业里求 1/x 在 x=2 的导数时一半人直接套公式，怎么用定义把过程讲透？',
      '期中占 30%，想在本节结束前做一次 10 分钟形成性测验，题目怎么选才能同时覆盖定义、几何意义和可导与连续？'
    ],
    sources: [
      {
        id: 'uc-s1',
        type: '教材',
        title: '《高等数学》（第七版）上册，同济大学数学系编',
        locator: '第二章 导数与微分 · 第一节 导数概念',
        excerpt:
          '函数 y=f(x) 在点 x0 的某个邻域内有定义，当自变量 x 在 x0 处取得增量 Δx 时，相应地函数取得增量 Δy=f(x0+Δx)−f(x0)；若 Δy/Δx 当 Δx→0 时的极限存在，则称函数在 x0 处可导，该极限称为 f(x) 在 x0 处的导数，记作 f′(x0)。',
        confidence: 0.97
      },
      {
        id: 'uc-s2',
        type: '教材',
        title: '《数学分析》（第五版）上册，华东师范大学数学科学学院编',
        locator: '第五章 导数和微分 · §1 导数的概念',
        excerpt:
          '导数是差商的极限；函数在一点可导必在该点连续，反之不成立，例如 f(x)=|x| 在 x=0 处连续但不可导。',
        confidence: 0.95
      },
      {
        id: 'uc-s3',
        type: '大纲',
        title: '《MATH101 高等数学（理工类）课程教学大纲（2026 版）》',
        locator: '第二章 导数与微分 · 14 学时；课程目标 2（毕业要求 1.2）',
        excerpt:
          '掌握导数与微分的概念、几何意义和物理意义，能用导数描述变化率；第二章安排 14 学时，其中导数概念 2 学时。',
        confidence: 0.9
      },
      {
        id: 'uc-s4',
        type: '大纲',
        title: '《大学数学课程教学基本要求》（工科类）',
        locator: '微积分 · 导数与微分',
        excerpt:
          '要求理解导数的概念及其几何意义，了解可导性与连续性的关系，会用导数描述一些物理量。',
        confidence: 0.8
      },
      {
        id: 'uc-s5',
        type: '解读',
        title: '《高等数学附册 学习辅导与习题选解》（第七版）',
        locator: '第二章 导数与微分 · 概念辨析',
        excerpt:
          '初学者常把 Δx 很小时的差商当成导数；教学应强调导数是极限，而不是某个具体增量下的比值。',
        confidence: 0.82
      },
      {
        id: 'uc-s6',
        type: '校本',
        title: '数学学院《MATH101 2026 秋季前测》',
        locator: '第 3—7 题 · 极限与平均变化率',
        excerpt:
          '120 名修课学生中，约 42% 不能正确写出差商，约 35% 把「连续」与「可导」视为等价。',
        confidence: 0.76
      },
      {
        id: 'uc-s7',
        type: '外部',
        title: 'MIT OpenCourseWare 18.01 Single Variable Calculus',
        locator: 'Lecture 1: Derivatives, Slope, Velocity, Rate of Change',
        excerpt:
          'Derivative as the limit of difference quotients, interpreted as slope of the tangent line and instantaneous rate of change.',
        confidence: 0.75
      },
      {
        id: 'uc-s8',
        type: '论文',
        title: 'Grabiner, J. V. The Changing Concept of Change: The Derivative from Fermat to Weierstrass',
        locator: 'Mathematics Magazine, 1983, 56(4): 195–206 · 第 2—4 节',
        excerpt:
          '追踪导数概念从费马、牛顿、莱布尼茨到魏尔斯特拉斯的严格化，说明极限在导数定义中的核心地位。',
        confidence: 0.88
      }
    ],
    graph: {
      nodes: [
        {
          id: 'uc-limit',
          label: '函数极限',
          layer: 0,
          kind: 'prior',
          desc: '函数极限描述自变量趋近某点时函数值的趋势；导数定义中的极限是差商在 Δx→0 时的极限。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          id: 'uc-secant',
          label: '割线与平均变化率',
          layer: 0,
          kind: 'prior',
          desc: '曲线上两点连线的斜率 [f(x0+Δx)−f(x0)]/Δx 就是区间上的平均变化率，几何上是割线斜率。',
          sourceIds: ['uc-s1', 'uc-s7']
        },
        {
          id: 'uc-tangent',
          label: '切线',
          layer: 0,
          kind: 'prior',
          desc: '切线是割线在第二点趋近第一点时的极限位置；它不是与曲线只交于一点的直线。',
          sourceIds: ['uc-s1', 'uc-s5']
        },
        {
          id: 'uc-quotient',
          label: '差商',
          layer: 1,
          kind: 'concept',
          desc: '差商是函数增量与自变量增量之比，表示区间上的平均变化率，是导数定义的直接对象。',
          sourceIds: ['uc-s1', 'uc-s5']
        },
        {
          id: 'uc-derivative',
          label: '导数定义',
          layer: 3,
          kind: 'target',
          desc: 'f′(x0)=lim(Δx→0)[f(x0+Δx)−f(x0)]/Δx；也可写成 lim(x→x0)[f(x)−f(x0)]/(x−x0)。',
          sourceIds: ['uc-s1', 'uc-s2', 'uc-s3']
        },
        {
          id: 'uc-onesided',
          label: '单侧导数',
          layer: 2,
          kind: 'concept',
          desc: '左导数与右导数分别由 Δx→0− 与 Δx→0+ 定义；分段点可导当且仅当左右导数存在且相等。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          id: 'uc-geometry',
          label: '导数的几何意义',
          layer: 2,
          kind: 'concept',
          desc: 'f′(x0) 等于曲线 y=f(x) 在点 (x0,f(x0)) 处切线的斜率。',
          sourceIds: ['uc-s1', 'uc-s3']
        },
        {
          id: 'uc-velocity',
          label: '瞬时速度与变化率',
          layer: 2,
          kind: 'concept',
          desc: '位移对时间的导数等于瞬时速度；一般地，导数表示因变量对自变量的瞬时变化率。',
          sourceIds: ['uc-s1', 'uc-s7']
        },
        {
          id: 'uc-continuity',
          label: '可导与连续',
          layer: 2,
          kind: 'concept',
          desc: '可导必连续；连续不一定可导，如 |x| 在 x=0 处连续但左右导数分别为 −1 和 1。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          id: 'uc-linear',
          label: '局部线性化',
          layer: 2,
          kind: 'concept',
          desc: '可导等价于 Δy=f′(x0)Δx+o(Δx)，即函数在局部可用切线近似，主部系数就是导数。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          id: 'uc-skill',
          label: '用定义求导',
          layer: 2,
          kind: 'skill',
          desc: '按「写差商—化简—取极限」的步骤用定义求导，并处理通分、有理化等代数变形。',
          sourceIds: ['uc-s1', 'uc-s3']
        },
        {
          id: 'uc-m-delta',
          label: '导数就是很小的 Δx 对应的差商',
          layer: 1,
          kind: 'misconception',
          desc: '把导数理解成某个固定小增量下的差商值，忽略「极限」这一核心，导致把近似值当成定义。',
          sourceIds: ['uc-s5', 'uc-s6']
        },
        {
          id: 'uc-m-cont',
          label: '连续一定可导',
          layer: 2,
          kind: 'misconception',
          desc: '认为连续函数处处可导；|x| 在 x=0 处连续但左右导数不等，是直接反例。',
          sourceIds: ['uc-s2', 'uc-s6']
        },
        {
          id: 'uc-m-tangent',
          label: '切线与曲线只有一个交点',
          layer: 2,
          kind: 'misconception',
          desc: '认为切线与曲线只能交于一点；y=x³ 在 x=1 处的切线 y=3x−2 还与曲线交于 x=−2。',
          sourceIds: ['uc-s2', 'uc-s5']
        }
      ],
      edges: [
        {
          from: 'uc-limit',
          to: 'uc-quotient',
          relation: 'prerequisite',
          confidence: 0.95,
          basis: '差商本身是一个函数，导数是该差商在 Δx→0 时的极限，需要极限工具。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          from: 'uc-secant',
          to: 'uc-quotient',
          relation: 'prerequisite',
          confidence: 0.93,
          basis: '割线斜率就是差商的几何表示，平均变化率是导数概念的起点。',
          sourceIds: ['uc-s1', 'uc-s7']
        },
        {
          from: 'uc-quotient',
          to: 'uc-derivative',
          relation: 'prerequisite',
          confidence: 0.97,
          basis: '导数定义为差商当 Δx→0 时的极限。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          from: 'uc-secant',
          to: 'uc-tangent',
          relation: 'leads-to',
          confidence: 0.9,
          basis: '让第二点沿曲线趋近第一点，割线的极限位置就是切线。',
          sourceIds: ['uc-s1', 'uc-s5']
        },
        {
          from: 'uc-tangent',
          to: 'uc-geometry',
          relation: 'supports',
          confidence: 0.92,
          basis: '切线斜率是导数最直接的几何解释。',
          sourceIds: ['uc-s1', 'uc-s7']
        },
        {
          from: 'uc-derivative',
          to: 'uc-geometry',
          relation: 'supports',
          confidence: 0.95,
          basis: '导数定义中的极限值就是曲线在该点处切线的斜率。',
          sourceIds: ['uc-s1', 'uc-s3']
        },
        {
          from: 'uc-derivative',
          to: 'uc-velocity',
          relation: 'supports',
          confidence: 0.94,
          basis: '把位移看作时间的函数，导数就是瞬时速度。',
          sourceIds: ['uc-s1', 'uc-s7']
        },
        {
          from: 'uc-onesided',
          to: 'uc-derivative',
          relation: 'prerequisite',
          confidence: 0.92,
          basis: '分段点可导需要左右导数存在且相等。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          from: 'uc-derivative',
          to: 'uc-continuity',
          relation: 'leads-to',
          confidence: 0.96,
          basis: '由 f(x)−f(x0)=差商·(x−x0) 可证可导必连续。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          from: 'uc-derivative',
          to: 'uc-linear',
          relation: 'supports',
          confidence: 0.9,
          basis: '导数给出局部线性主部，余项为 o(Δx)。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          from: 'uc-derivative',
          to: 'uc-skill',
          relation: 'prerequisite',
          confidence: 0.93,
          basis: '定义是用定义求导的唯一依据。',
          sourceIds: ['uc-s1', 'uc-s3']
        },
        {
          from: 'uc-skill',
          to: 'uc-derivative',
          relation: 'supports',
          confidence: 0.88,
          basis: '按定义计算能反过来巩固对极限过程的理解。',
          sourceIds: ['uc-s1', 'uc-s5']
        },
        {
          from: 'uc-limit',
          to: 'uc-continuity',
          relation: 'prerequisite',
          confidence: 0.9,
          basis: '连续用极限定义，是讨论可导性的前提。',
          sourceIds: ['uc-s1', 'uc-s2']
        },
        {
          from: 'uc-m-delta',
          to: 'uc-derivative',
          relation: 'contrasts',
          confidence: 0.91,
          basis: '导数不是某个小增量下的近似值，而是差商的极限。',
          sourceIds: ['uc-s5', 'uc-s6']
        },
        {
          from: 'uc-m-cont',
          to: 'uc-continuity',
          relation: 'contrasts',
          confidence: 0.93,
          basis: '|x| 在 0 点连续但左右导数不等，反例直接推翻「连续必可导」。',
          sourceIds: ['uc-s2', 'uc-s6']
        },
        {
          from: 'uc-m-tangent',
          to: 'uc-geometry',
          relation: 'contrasts',
          confidence: 0.88,
          basis: '切线是局部逼近，可能与曲线再次相交，不能用交点个数定义。',
          sourceIds: ['uc-s2', 'uc-s5']
        },
        {
          from: 'uc-velocity',
          to: 'uc-derivative',
          relation: 'supports',
          confidence: 0.86,
          basis: '瞬时速度是导数概念的物理原型。',
          sourceIds: ['uc-s1', 'uc-s7']
        },
        {
          from: 'uc-geometry',
          to: 'uc-derivative',
          relation: 'supports',
          confidence: 0.86,
          basis: '切线问题是导数概念的几何原型。',
          sourceIds: ['uc-s1', 'uc-s7']
        }
      ]
    },
    objectives: [
      {
        text: '能写出函数在一点导数的两种等价定义（增量式与两点式），说明差商、极限与导数之间的关系。',
        level: '理解',
        sourceIds: ['uc-s1', 'uc-s3', 'uc-s4']
      },
      {
        text: '能用定义求 x²、1/x 等函数在指定点的导数，并用左右导数判断分段点是否可导。',
        level: '应用',
        sourceIds: ['uc-s1', 'uc-s2', 'uc-s5']
      },
      {
        text: '能分析 |x| 在 x=0 处连续但不可导的原因，说明「可导必连续、连续不一定可导」。',
        level: '分析',
        sourceIds: ['uc-s1', 'uc-s2', 'uc-s8']
      },
      {
        text: '能评价用差商近似瞬时变化率的适用条件，并针对速度、切线、边际成本等情境选择合适的导数解释。',
        level: '评价',
        sourceIds: ['uc-s3', 'uc-s7', 'uc-s8']
      }
    ],
    keyPoints: [
      '导数定义：f′(x0)=lim(Δx→0)[f(x0+Δx)−f(x0)]/Δx，核心是差商的极限',
      '几何意义是切线斜率，物理意义是瞬时速度，一般意义是瞬时变化率',
      '可导必连续，连续不一定可导；分段点需左右导数存在且相等',
      '切线是割线的极限位置，不是「与曲线只有一个交点」的直线'
    ],
    difficulties: [
      '从平均变化率过渡到瞬时变化率，理解 Δx→0 的极限过程而不是代入 Δx=0',
      '用定义求导时的代数变形，尤其是分式通分与根式有理化',
      '可导与连续关系的证明与反例构造',
      '把切线、速度、边际成本等情境统一到「变化率」的解释框架'
    ],
    misconceptions: [
      {
        nodeId: 'uc-m-delta',
        label: '导数就是很小的 Δx 对应的差商',
        misconception: '把导数理解为取一个很小的 Δx 算出的差商值，忽略极限，导致把近似值当成定义。',
        sourceIds: ['uc-s5', 'uc-s6']
      },
      {
        nodeId: 'uc-m-cont',
        label: '连续一定可导',
        misconception: '认为函数在某点连续就一定能求导，忽略尖点、垂直切线等情形。',
        sourceIds: ['uc-s2', 'uc-s6']
      },
      {
        nodeId: 'uc-m-tangent',
        label: '切线与曲线只有一个交点',
        misconception: '用交点个数判断切线，遇到 y=x³ 在 x=1 的切线再次与曲线相交时便认为不是切线。',
        sourceIds: ['uc-s2', 'uc-s5']
      }
    ],
    flowTemplate: [
      {
        phase: '问题导入',
        minutes: 8,
        teacher:
          '给出汽车刹车过程的位移—时间数据，列出 t=2 s 到 t=2.1 s、2.01 s、2.001 s 三个区间，问「如何定义 t=2 s 这一瞬间的速度」。不直接给定义，先让学生算平均速度。',
        student: '计算三个区间的平均速度，观察 Δt 变小时数值趋近哪个值，并说出平均速度依赖 Δt。',
        evidence: '能指出平均速度依赖所选区间，瞬时速度应取 Δt→0 的极限。',
        sourceIds: ['uc-s1', 'uc-s7']
      },
      {
        phase: '概念讲授',
        minutes: 15,
        teacher:
          '由平均速度过渡到一般函数：写出差商，给出导数定义与两种等价写法，解释记号 f′(x0) 与「点态」含义；对照切线斜率与瞬时速度两种解释。',
        student: '跟写定义，标出 Δx、Δy 与极限位置；用自己的话解释 f′(x0) 表示什么。',
        evidence: '能完整写出定义，明确指出 Δx→0 而不是 Δx=0。',
        sourceIds: ['uc-s1', 'uc-s3', 'uc-s5']
      },
      {
        phase: '推导/证明',
        minutes: 18,
        teacher:
          '板书推导 x² 在 x0 处的导数：差商为 2x0+Δx，取极限得 2x0；再算 1/x 在 x=2 处得 −1/4。随后证明可导必连续，并用 |x| 在 0 点的左右导数 −1、1 说明连续不一定可导。',
        student: '独立完成 1/x 的差商化简并与板书对照；回答 |x| 的左右导数及可导结论。',
        evidence: '1/x 化简正确、极限为 −1/4；能写出左右导数并判断不可导。',
        sourceIds: ['uc-s1', 'uc-s2', 'uc-s8']
      },
      {
        phase: '案例/应用',
        minutes: 15,
        teacher:
          '讲三个短案例：刹车瞬时速度、曲线 y=x³ 在 x=1 处的切线、边际成本。示范先解释量的含义与单位，再写导数；特别说明该切线与曲线还在 x=−2 处相交。',
        student: '分别说出三个情境中导数的含义与单位；求 y=x³ 在 x=1 处的切线方程。',
        evidence: '切线方程写成 y=3x−2；能解释切线与曲线再次相交并不矛盾。',
        sourceIds: ['uc-s1', 'uc-s3', 'uc-s7']
      },
      {
        phase: '小组讨论',
        minutes: 12,
        teacher:
          '抛出两个判断题：「连续函数一定可导」「切线与曲线只有一个交点」。4 人一组，要求每组给出一个反例或图形；随机抽 3 组汇报，教师只补关键句。',
        student: '组内交换反例，画图或写函数；记录本组结论与一个反例。',
        evidence: '每组至少给出一个正确反例，并能说明反例为什么满足条件。',
        sourceIds: ['uc-s5', 'uc-s6', 'uc-s8']
      },
      {
        phase: '课堂练习',
        minutes: 14,
        teacher:
          '发 4 题：用定义求 x² 在 x=−2 的导数；求 1/x 在 x=1 的导数；判断分段函数在连接点是否可导；求 y=x² 在 x=1 的切线。巡视时重点看差商化简与极限记号。',
        student: '独立完成，相邻两人互批，把错误步骤圈出并当堂订正。',
        evidence: '4 题中至少 3 题步骤完整；能定位通分或极限记号错误。',
        sourceIds: ['uc-s1', 'uc-s2', 'uc-s3']
      },
      {
        phase: '总结与作业',
        minutes: 8,
        teacher:
          '用一张结构图收束：差商→极限→导数→几何/物理/一般变化率；布置 Problem Set 2A/2B 与阅读任务，预告下一节求导法则，说明作业规范与学术诚信要求。',
        student: '补全结构图，记录作业与阅读页码，提出一个仍未解决的问题。',
        evidence: '能独立复述定义与可导/连续关系；作业要求记录完整。',
        sourceIds: ['uc-s1', 'uc-s3', 'uc-s8']
      }
    ],
    activities: {
      basic: [
        '用定义求 x² 在 x=1、x=−2 处的导数，写出差商化简的每一步。',
        '判断 |x|、分段函数等 4 个函数在指定点是否可导，并说明依据。'
      ],
      advanced: [
        '证明「可导必连续」，并构造一个连续但不可导的例子。',
        '讨论 f(x)=x²sin(1/x)（x≠0）、f(0)=0 在 x=0 处是否可导，提示用导数定义与夹逼。'
      ],
      'hands-on': [
        '用 Desmos 或 GeoGebra 取 Δx=0.1、0.01、0.001 计算差商，观察数值趋势并解释「极限不是代入 Δx=0」。',
        '用手机慢动作拍摄小车经过标记点，估算瞬时速度，并与导数定义的计算结果对照。',
        '白板活动：画三幅割线逼近切线的图，标注 Δx 与割线斜率，说明极限位置。'
      ]
    },
    assessment: [
      {
        type: '课堂测验（10 分钟）',
        text: '2 题：用定义求 1/x 在 x=2 的导数；判断 |x| 在 x=0 是否可导。',
        criteria: '差商化简正确、极限存在；能写出左右导数分别为 −1 和 1，结论为不可导。'
      },
      {
        type: '课后作业（Problem Set 2）',
        text: '教材第二章第一节习题：用定义求导 4 题、单侧导数 2 题、概念判断题 2 题，另加一道切线应用题。',
        criteria: '按「差商—化简—取极限」步骤书写；概念题须给反例或理由；迟交按大纲扣分。'
      },
      {
        type: '期末考试（占 50%）',
        text: '第二章相关试题：导数定义、可导与连续、切线方程，约 15 分。',
        criteria: '定义表述完整；能区分可导与连续；切线方程与计算无误。'
      }
    ],
    homework: {
      basic: [
        'Problem Set 2A：教材第二章第一节习题 1、2、3、5，用定义求导并写出差商化简过程。',
        '阅读同济版第二章第一节，整理「导数定义—几何意义—物理意义」三栏笔记。'
      ],
      advanced: [
        'Problem Set 2B：讨论 f(x)=x²sin(1/x)（x≠0）、f(0)=0 在 x=0 处是否可导，并说明导函数在 0 附近是否有极限。',
        '证明：若 f 在 x0 可导，则 f 在 x0 连续；举例说明逆命题不成立。'
      ],
      remedial: [
        '补做差商计算 6 题：给定 f 与 x0，写出 [f(x0+Δx)−f(x0)]/Δx 并化简。',
        '观看 MIT 18.01 Lecture 1 前 20 分钟，写 3 条要点，下次答疑带来提问。'
      ]
    },
    differentiation: {
      support: [
        '提供「用定义求导」worked example 步骤卡：写差商—通分或有理化—取极限—写结论。',
        '阅读指南：标注同济版第二章第一节的 3 个关键段落与 2 个例题，课前 15 分钟完成。',
        '每周固定答疑时段与同伴互助小组，重点补极限运算与代数变形。'
      ],
      extension: [
        '阅读 Grabiner 论文第 2—4 节，写 1 页 reading response：导数概念为什么需要极限？',
        '用 Python 或 Desmos 做数值实验：比较不同函数在 x0 附近差商随 Δx 的变化，讨论数值求导的误差。'
      ]
    },
    risks: [
      {
        risk: '120 人大班，讨论容易变成少数人发言',
        fallback:
          '采用 think-pair-share 与举手表决；每组 4 人固定角色，讨论结果随机抽取 3 组汇报，确保不同位置都有发言机会。'
      },
      {
        risk: '学生先修极限薄弱，差商化简和取极限卡住',
        fallback:
          '课前发布 10 分钟极限微课与诊断题；课上用 5 分钟复习 0/0 型处理；课后开放答疑并提供错题讲评。'
      },
      {
        risk: '作业出现直接套公式或抄袭',
        fallback:
          '作业分「定义推导」与「计算」两类；随机抽取学生口头讲解；明确引用与 AI 使用规范，按课程大纲处理学术不端。'
      }
    ],
    classProfile: {
      className: '2026 级理工类 MATH101 · 示例班级',
      sampleSize: 120,
      term: '2026 秋季学期',
      weakPoints: [
        { label: '极限与差商化简', ratio: 0.42, trend: 'up' },
        { label: '导数定义与记号', ratio: 0.35, trend: 'flat' },
        { label: '可导与连续的关系', ratio: 0.31, trend: 'up' },
        { label: '用定义证明与构造反例', ratio: 0.28, trend: 'flat' }
      ]
    }
  },

  /* ------------------------------------------------------------------ */
  /* 5. 大学物理 · 牛顿运动定律 · 马文蔚版                              */
  /* ------------------------------------------------------------------ */
  {
    id: 'university-physics',
    stage: '大学',
    subject: '物理',
    grade: '大一',
    textbook: '马文蔚版',
    unit: '第二章 牛顿运动定律',
    title: '牛顿运动定律',
    summary:
      '面向大一理工类大班的一次 90 分钟讲授 + 演示实验：由抽纸、急刹车等惯性现象和 FCI 概念题切入，讲清牛顿三定律与惯性参考系，推导 F=dp/dt 到 F=ma 的条件，并通过气垫导轨实验把受力分析与 a-F 图线连接起来。',
    course: {
      code: 'PHYS101',
      credits: 4,
      hours: 64,
      audience: '大一理工类本科生（约 120 人）',
      assessment: '平时 20% + 实验 20%（含实验报告）+ 期中 20% + 期末 40%'
    },
    needExamples: [
      '90 分钟讲授 + 演示实验，120 人大班只有 1 名助教、气垫导轨只有 4 套，怎么让后排看清并参与？',
      '学生高中背熟了 F=ma，但问「为什么第二定律只在惯性系成立」就答不上来，怎么用 10 分钟讲透？',
      '实验报告占 20%，本周的牛顿第二定律实验和理论课怎么对齐？rubric 里要写清哪些数据与误差分析？'
    ],
    sources: [
      {
        id: 'uph-s1',
        type: '教材',
        title: '《物理学》（第六版）上册，马文蔚主编',
        locator: '第二章 牛顿运动定律 · 2-1 牛顿第一定律、2-2 牛顿第二定律、2-3 牛顿第三定律',
        excerpt:
          '牛顿第一定律指出，任何物体都保持静止或匀速直线运动状态，直到有外力迫使它改变这种状态；牛顿第二定律可写成 F=dp/dt，当质量不变时 F=ma；牛顿第三定律指出作用力与反作用力大小相等、方向相反、作用在不同物体上。',
        confidence: 0.96
      },
      {
        id: 'uph-s2',
        type: '教材',
        title: '《普通物理学》（第七版）第一册，程守洙、江之永主编',
        locator: '第二章 牛顿运动定律 · 惯性系与非惯性系',
        excerpt:
          '牛顿运动定律只在惯性参考系中成立；在非惯性系中需引入惯性力，才能形式地沿用 F=ma。',
        confidence: 0.93
      },
      {
        id: 'uph-s3',
        type: '大纲',
        title: '《PHYS101 大学物理（A）课程教学大纲（2026 版）》',
        locator: '第二章 牛顿运动定律（10 学时）· 课程目标 1、2（毕业要求 2.1）；实验 20%',
        excerpt:
          '理解牛顿三定律及其适用条件，能进行受力分析和动力学计算；第二章 10 学时，含 1 次演示实验；成绩构成含实验报告 20%。',
        confidence: 0.9
      },
      {
        id: 'uph-s4',
        type: '大纲',
        title: '《理工科类大学物理课程教学基本要求》',
        locator: '力学 · 牛顿运动定律',
        excerpt:
          '理解牛顿运动定律及其适用条件，理解惯性参考系；能分析简单力学系统。',
        confidence: 0.8
      },
      {
        id: 'uph-s5',
        type: '解读',
        title: '《物理学（第六版）上册 学习指导》',
        locator: '第二章 牛顿运动定律 · 教材分析与典型错误',
        excerpt:
          '学生常把作用力与反作用力当成一对平衡力，或在非惯性系中直接套用 F=ma；教学应通过具体情境辨析。',
        confidence: 0.78
      },
      {
        id: 'uph-s6',
        type: '校本',
        title: '物理系《PHYS101 2026 秋季前测》',
        locator: '第 1—8 题 · 力与运动',
        excerpt:
          '120 名学生中约 48% 认为「物体运动需要力来维持」，约 36% 不能正确区分作用力反作用力与平衡力。',
        confidence: 0.77
      },
      {
        id: 'uph-s7',
        type: '校本',
        title: '《物理实验中心 · 牛顿第二定律演示实验清单与安全规范》',
        locator: '实验 2 · 气垫导轨、力传感器、光电门',
        excerpt:
          '每组用气垫导轨、滑块、力传感器与光电门测量 a 与 F；实验前调平导轨，检查传感器零点，滑块不得碰撞导轨端点。',
        confidence: 0.86
      },
      {
        id: 'uph-s8',
        type: '外部',
        title: 'PhET 互动仿真 · Forces and Motion: Basics',
        locator: 'Net Force / Motion / Friction 模块',
        excerpt:
          '可改变拉力、质量与摩擦，实时显示合力、加速度和速度，用于课堂演示的补充或设备不足时的替代。',
        confidence: 0.72
      },
      {
        id: 'uph-s9',
        type: '论文',
        title: 'Hestenes, D., Wells, M., & Swackhamer, G. Force Concept Inventory',
        locator: 'The Physics Teacher, 1992, 30(3): 141–158 · 力与运动概念诊断',
        excerpt:
          '用选择题诊断学生对力与运动关系的直觉，常见错误包括「运动需要力维持」「力大速度大」等。',
        confidence: 0.9
      }
    ],
    graph: {
      nodes: [
        {
          id: 'uph-kin',
          label: '运动学量',
          layer: 0,
          kind: 'prior',
          desc: '位置、位移、速度、加速度及其矢量性，是描述运动状态和建立动力学方程的基础。',
          sourceIds: ['uph-s1', 'uph-s3']
        },
        {
          id: 'uph-force',
          label: '力与矢量',
          layer: 0,
          kind: 'prior',
          desc: '力是物体间的相互作用，是矢量；多个力可按平行四边形法则合成，也可正交分解。',
          sourceIds: ['uph-s1', 'uph-s4']
        },
        {
          id: 'uph-mass',
          label: '质量与惯性',
          layer: 0,
          kind: 'prior',
          desc: '质量是惯性大小的量度，在经典力学中不随受力或运动状态改变。',
          sourceIds: ['uph-s1']
        },
        {
          id: 'uph-inertial',
          label: '惯性参考系',
          layer: 1,
          kind: 'concept',
          desc: '牛顿运动定律成立的参考系；相对惯性系做匀速直线运动的参考系仍是惯性系。',
          sourceIds: ['uph-s1', 'uph-s2']
        },
        {
          id: 'uph-first',
          label: '牛顿第一定律',
          layer: 1,
          kind: 'concept',
          desc: '任何物体都保持静止或匀速直线运动状态，除非受到外力作用；它定义了惯性系，并说明力是改变运动状态的原因。',
          sourceIds: ['uph-s1', 'uph-s3']
        },
        {
          id: 'uph-momentum',
          label: '动量',
          layer: 1,
          kind: 'concept',
          desc: 'p=mv 是矢量；力是动量对时间的变化率，即 F=dp/dt。',
          sourceIds: ['uph-s1', 'uph-s2']
        },
        {
          id: 'uph-second',
          label: '牛顿第二定律',
          layer: 2,
          kind: 'concept',
          desc: 'F=dp/dt；当质量不变时 F=ma。加速度与合力同向，且定律只在惯性系成立。',
          sourceIds: ['uph-s1', 'uph-s2', 'uph-s3']
        },
        {
          id: 'uph-third',
          label: '牛顿第三定律',
          layer: 2,
          kind: 'concept',
          desc: '作用力与反作用力大小相等、方向相反、性质相同、作用在不同物体上，同时产生、同时消失。',
          sourceIds: ['uph-s1', 'uph-s5']
        },
        {
          id: 'uph-components',
          label: '受力分析与正交分解',
          layer: 2,
          kind: 'skill',
          desc: '选定研究对象，画受力图，建立坐标系，把力分解到坐标轴上列方程。',
          sourceIds: ['uph-s1', 'uph-s3']
        },
        {
          id: 'uph-demo',
          label: '实验验证 F=ma',
          layer: 2,
          kind: 'skill',
          desc: '用气垫导轨、力传感器和光电门测量不同拉力下的加速度，作 a-F 图并检验线性关系。',
          sourceIds: ['uph-s7', 'uph-s8']
        },
        {
          id: 'uph-target',
          label: '牛顿定律综合应用',
          layer: 3,
          kind: 'target',
          desc: '综合运用牛顿三定律与受力分析，求解斜面、连接体、升降机等动力学问题，并说明适用条件。',
          sourceIds: ['uph-s1', 'uph-s3', 'uph-s4']
        },
        {
          id: 'uph-m-impetus',
          label: '力是维持运动的原因',
          layer: 1,
          kind: 'misconception',
          desc: '认为物体运动必须有力维持，把力当作速度的原因，而不是加速度的原因。',
          sourceIds: ['uph-s6', 'uph-s9']
        },
        {
          id: 'uph-m-third',
          label: '作用力与反作用力互相平衡',
          layer: 2,
          kind: 'misconception',
          desc: '把作用力与反作用力当成一对平衡力，误以为它们可以相互抵消。',
          sourceIds: ['uph-s5', 'uph-s6']
        },
        {
          id: 'uph-m-inertial',
          label: '非惯性系中可直接用 F=ma',
          layer: 2,
          kind: 'misconception',
          desc: '在加速电梯等非惯性系中直接套用 F=ma，忽略惯性力或参考系条件。',
          sourceIds: ['uph-s2', 'uph-s5']
        }
      ],
      edges: [
        {
          from: 'uph-kin',
          to: 'uph-second',
          relation: 'prerequisite',
          confidence: 0.95,
          basis: '第二定律中的加速度需要由运动学量描述和计算。',
          sourceIds: ['uph-s1', 'uph-s3']
        },
        {
          from: 'uph-force',
          to: 'uph-first',
          relation: 'prerequisite',
          confidence: 0.92,
          basis: '第一定律用「外力」说明运动状态改变的原因，需要先理解力的概念。',
          sourceIds: ['uph-s1']
        },
        {
          from: 'uph-mass',
          to: 'uph-first',
          relation: 'supports',
          confidence: 0.9,
          basis: '质量是惯性大小的量度，惯性是理解第一定律的核心。',
          sourceIds: ['uph-s1']
        },
        {
          from: 'uph-first',
          to: 'uph-inertial',
          relation: 'leads-to',
          confidence: 0.94,
          basis: '第一定律只在惯性系成立，并可作为惯性系的判据。',
          sourceIds: ['uph-s1', 'uph-s2']
        },
        {
          from: 'uph-inertial',
          to: 'uph-second',
          relation: 'prerequisite',
          confidence: 0.96,
          basis: '第二定律只在惯性参考系中成立，非惯性系需引入惯性力。',
          sourceIds: ['uph-s2', 'uph-s3']
        },
        {
          from: 'uph-momentum',
          to: 'uph-second',
          relation: 'prerequisite',
          confidence: 0.94,
          basis: '第二定律的普遍形式是 F=dp/dt，动量是定义力的基础。',
          sourceIds: ['uph-s1', 'uph-s2']
        },
        {
          from: 'uph-mass',
          to: 'uph-momentum',
          relation: 'supports',
          confidence: 0.88,
          basis: '动量 p=mv 中质量是惯性质量的体现。',
          sourceIds: ['uph-s1']
        },
        {
          from: 'uph-force',
          to: 'uph-third',
          relation: 'prerequisite',
          confidence: 0.93,
          basis: '第三定律描述物体间相互作用的成对性，需要先理解力的相互作用本质。',
          sourceIds: ['uph-s1']
        },
        {
          from: 'uph-second',
          to: 'uph-target',
          relation: 'prerequisite',
          confidence: 0.97,
          basis: '综合应用的核心是列 F=ma 或分量方程。',
          sourceIds: ['uph-s1', 'uph-s3']
        },
        {
          from: 'uph-third',
          to: 'uph-target',
          relation: 'supports',
          confidence: 0.88,
          basis: '连接体问题中需要正确识别作用力与反作用力，避免把内力当外力。',
          sourceIds: ['uph-s1', 'uph-s5']
        },
        {
          from: 'uph-components',
          to: 'uph-target',
          relation: 'supports',
          confidence: 0.94,
          basis: '受力分析与正交分解是列动力学方程的基本操作。',
          sourceIds: ['uph-s1', 'uph-s3']
        },
        {
          from: 'uph-demo',
          to: 'uph-second',
          relation: 'supports',
          confidence: 0.9,
          basis: '实验数据提供 a 与 F 关系的经验证据，帮助理解 F=ma。',
          sourceIds: ['uph-s7', 'uph-s8']
        },
        {
          from: 'uph-first',
          to: 'uph-target',
          relation: 'supports',
          confidence: 0.86,
          basis: '判断物体运动状态是否改变，是第一定律在综合问题中的直接应用。',
          sourceIds: ['uph-s1', 'uph-s3']
        },
        {
          from: 'uph-m-impetus',
          to: 'uph-first',
          relation: 'contrasts',
          confidence: 0.92,
          basis: '「力维持运动」与第一定律直接冲突，需用惯性概念纠正。',
          sourceIds: ['uph-s6', 'uph-s9']
        },
        {
          from: 'uph-m-third',
          to: 'uph-third',
          relation: 'contrasts',
          confidence: 0.91,
          basis: '作用力与反作用力作用在不同物体上，不能像平衡力那样求合力抵消。',
          sourceIds: ['uph-s5', 'uph-s6']
        },
        {
          from: 'uph-m-inertial',
          to: 'uph-inertial',
          relation: 'contrasts',
          confidence: 0.89,
          basis: '非惯性系中直接套用 F=ma 会漏掉惯性力，必须先说明参考系。',
          sourceIds: ['uph-s2', 'uph-s5']
        },
        {
          from: 'uph-force',
          to: 'uph-components',
          relation: 'prerequisite',
          confidence: 0.92,
          basis: '正交分解的对象是力矢量，需要先掌握力的合成与分解。',
          sourceIds: ['uph-s1', 'uph-s3']
        },
        {
          from: 'uph-kin',
          to: 'uph-demo',
          relation: 'supports',
          confidence: 0.86,
          basis: '由光电门时间与遮光宽度求速度，再由速度变化求加速度。',
          sourceIds: ['uph-s7']
        }
      ]
    },
    objectives: [
      {
        text: '能表述牛顿三定律，说明 F=dp/dt 与 F=ma 的关系，以及定律只在惯性系成立的条件。',
        level: '理解',
        sourceIds: ['uph-s1', 'uph-s3', 'uph-s4']
      },
      {
        text: '能对斜面、连接体、升降机等系统作受力分析，列分量方程求解加速度与相互作用力。',
        level: '应用',
        sourceIds: ['uph-s1', 'uph-s3', 'uph-s7']
      },
      {
        text: '能分析作用力与反作用力同平衡力的区别，并解释非惯性系中直接使用 F=ma 会出现什么问题。',
        level: '分析',
        sourceIds: ['uph-s2', 'uph-s5', 'uph-s9']
      },
      {
        text: '能评价实验数据与理论值的偏差来源（摩擦、导轨未调平、传感器零点），并提出改进方案。',
        level: '评价',
        sourceIds: ['uph-s7', 'uph-s8', 'uph-s9']
      }
    ],
    keyPoints: [
      '第一定律定义惯性系；力是改变运动状态的原因，不是维持运动的原因',
      '第二定律 F=dp/dt，质量不变时 F=ma；瞬时、矢量、同体，且只在惯性系成立',
      '第三定律：大小相等、方向相反、性质相同、作用在不同物体、同时产生',
      '受力分析加正交分解是求解动力学问题的基本方法'
    ],
    difficulties: [
      '区分「运动状态」与「运动状态的变化」，摆脱力维持运动的直觉',
      '作用力反作用力与平衡力的区分',
      '非惯性系与惯性力的理解',
      '多物体系统中内力、外力与方程联立'
    ],
    misconceptions: [
      {
        nodeId: 'uph-m-impetus',
        label: '力是维持运动的原因',
        misconception: '认为物体匀速运动也需要合力，把力当作速度的原因而不是加速度的原因。',
        sourceIds: ['uph-s6', 'uph-s9']
      },
      {
        nodeId: 'uph-m-third',
        label: '作用力与反作用力互相平衡',
        misconception: '把作用力与反作用力当成作用在同一物体上的一对平衡力，认为它们可以相互抵消。',
        sourceIds: ['uph-s5', 'uph-s6']
      },
      {
        nodeId: 'uph-m-inertial',
        label: '非惯性系中可直接用 F=ma',
        misconception: '在加速电梯等非惯性系中直接套用 F=ma，忽略惯性力或参考系条件。',
        sourceIds: ['uph-s2', 'uph-s5']
      }
    ],
    flowTemplate: [
      {
        phase: '问题导入',
        minutes: 8,
        teacher:
          '快速抽出压在杯子上的纸片，硬币落入杯中；再问急刹车时乘客为什么前倾。出示 2 道 FCI 风格判断题，让学生举手表决并说明理由。',
        student: '预测并观察现象，举手投票，用一句话说明自己的判断。',
        evidence: '能初步区分「运动需要力」与「运动状态改变需要力」。',
        sourceIds: ['uph-s1', 'uph-s6', 'uph-s9']
      },
      {
        phase: '概念讲授',
        minutes: 16,
        teacher:
          '由投票结果引出第一定律与惯性系；给出第二定律 F=dp/dt 与 F=ma，逐条强调瞬时、矢量、同体、惯性系；讲第三定律的成对性与同性质。',
        student: '记录三定律的表述与条件，比较 F=dp/dt 与 F=ma 的适用差别。',
        evidence: '能说出 F=ma 只在质量不变时成立，且定律只在惯性系成立。',
        sourceIds: ['uph-s1', 'uph-s2', 'uph-s3']
      },
      {
        phase: '推导/证明',
        minutes: 16,
        teacher:
          '由 F=dp/dt 在质量不变时推出 F=ma；写直角坐标分量式；以 m1、m2 连接体为例列方程，说明绳张力在不同研究对象中的内外力身份，提醒不能把作用力与反作用力相加。',
        student: '跟随推导写出分量式；为连接体画受力图并列 2 个方程。',
        evidence: '分量方程正确，能指出绳张力在整体与隔离体分析中的不同身份。',
        sourceIds: ['uph-s1', 'uph-s2', 'uph-s4']
      },
      {
        phase: '案例/应用',
        minutes: 16,
        teacher:
          '讲升降机体重计、斜面下滑、连接体三个案例；随后用气垫导轨演示：逐次改变拉力，记录加速度，现场作 a-F 图并讨论截距。',
        student: '计算体重计示数；观察实验数据，判断图线是否过原点并解释截距来源。',
        evidence: '能解释超重与失重；能从 a-F 图线斜率求滑块质量。',
        sourceIds: ['uph-s1', 'uph-s7', 'uph-s8']
      },
      {
        phase: '小组讨论',
        minutes: 12,
        teacher:
          '给出马拉车、电梯加速、两人互推三个情境，4 人一组判断哪些是作用力反作用力、哪些是平衡力，要求把力画在不同物体上；随机抽组汇报。',
        student: '画受力图，标出作用对象；组内争论并修正结论。',
        evidence: '能指出作用力与反作用力作用在不同物体，不能抵消。',
        sourceIds: ['uph-s5', 'uph-s6', 'uph-s9']
      },
      {
        phase: '课堂练习',
        minutes: 14,
        teacher:
          '发 3 题：电梯体重计、斜面加速度、连接体张力；巡视时检查受力图与坐标系，最后 2 分钟对答案并订正。',
        student: '独立完成，交换批改，重点订正受力图与正方向。',
        evidence: '受力图完整、坐标一致、单位正确；至少 2 题计算正确。',
        sourceIds: ['uph-s1', 'uph-s3', 'uph-s7']
      },
      {
        phase: '总结与作业',
        minutes: 8,
        teacher:
          '用概念图收束三定律与适用条件；说明实验报告 rubric、Problem Set 与阅读任务；强调原始数据、误差分析与学术诚信。',
        student: '补全概念图，记录实验报告要求与提交时间。',
        evidence: '能说出三定律各自解决什么问题，明确报告提交要求。',
        sourceIds: ['uph-s1', 'uph-s3', 'uph-s7']
      }
    ],
    activities: {
      basic: [
        '判断 5 条关于力与运动的说法是否正确，并用惯性或牛顿定律说明理由。',
        '对水平面上受拉力与摩擦力的物体作受力分析，求合力与加速度。'
      ],
      advanced: [
        '质量 m1、m2 的连接体跨过定滑轮，求加速度与绳张力（忽略绳与滑轮质量）。',
        '升降机以 a 加速上升，求体重计示数，并讨论超重与失重的受力图。'
      ],
      'hands-on': [
        '气垫导轨、力传感器与光电门：测不同拉力下的加速度，作 a-F 图并求滑块质量。',
        '抽纸硬币与急刹车情境：观察惯性现象，用第一定律解释。',
        'PhET Forces and Motion：改变质量与拉力，记录 5 组数据并与 F=ma 比较。'
      ]
    },
    assessment: [
      {
        type: '课堂测验（10 分钟）',
        text: '3 题：FCI 风格概念题 2 题，加 1 题斜面加速度计算。',
        criteria: '能排除「力维持运动」；正确分解重力；加速度计算误差在 10% 以内。'
      },
      {
        type: '实验报告（实验 2）',
        text: '牛顿第二定律实验：数据表、a-F 图、误差分析、结论。',
        criteria: '按 rubric：装置与步骤 20%、数据记录 30%、图像与拟合 25%、误差分析 15%、结论与规范 10%；须附原始数据。'
      },
      {
        type: '期末考试（占 40%）',
        text: '牛顿定律综合题：受力分析、连接体、非惯性系概念判断，约 20 分。',
        criteria: '受力图完整、方程与坐标系一致、方向与单位正确；概念题能说明惯性系条件。'
      }
    ],
    homework: {
      basic: [
        'Problem Set 3A：教材第二章习题中的受力分析与 F=ma 计算 4 题。',
        '阅读马文蔚版第二章 2-1 至 2-3，整理牛顿三定律的表述与适用条件。'
      ],
      advanced: [
        'Problem Set 3B：连接体与斜面综合题 2 题；画出电梯中超重与失重时的受力图。',
        '用 PhET 或手机传感器采集 5 组 a 与 F 数据，作 a-F 图并求滑块质量。'
      ],
      remedial: [
        '补做受力分析 6 题：只要求画受力图并标出合力，不代入计算。',
        '观看 MIT 8.01 牛顿定律讲座片段，写 3 条要点，并用一句话解释「为什么匀速运动不需要力维持」。'
      ]
    },
    differentiation: {
      support: [
        '提供受力分析 checklist：定对象—画重力—找接触力—建坐标—分解—列方程。',
        '先练单物体水平与斜面情境，再进入连接体；给出半成品方程。',
        '数学补救：矢量分解与三角函数 15 分钟微课。'
      ],
      extension: [
        '阅读 FCI 论文，选 3 道概念题分析常见错误，写 reading response。',
        '设计一个验证第三定律的实验（如两力传感器对拉），说明如何校准与减小误差。',
        '讨论非惯性系与等效原理，举例说明惯性力与引力的局部等效。'
      ]
    },
    risks: [
      {
        risk: '120 人大班，演示实验后排看不清',
        fallback:
          '用摄像头或手机投屏放大；先做教师演示，再让 4 组学生代表上台操作，其余组用 PhET 同步观察。'
      },
      {
        risk: '气垫导轨或力传感器故障、数量不足',
        fallback:
          '改用小车、弹簧测力计与手机慢动作；或使用 PhET 数据；提前一天检查设备并准备备用方案。'
      },
      {
        risk: '实验报告数据雷同、抄袭',
        fallback:
          '要求附原始数据与个人误差分析；随机抽取学生口头说明；按课程大纲的学术诚信条款处理。'
      }
    ],
    classProfile: {
      className: '2026 级理工类 PHYS101 · 示例班级',
      sampleSize: 120,
      term: '2026 秋季学期',
      weakPoints: [
        { label: '力与运动关系', ratio: 0.48, trend: 'up' },
        { label: '作用力反作用力与平衡力', ratio: 0.36, trend: 'flat' },
        { label: '矢量分解与受力分析', ratio: 0.41, trend: 'up' },
        { label: '实验误差分析', ratio: 0.33, trend: 'flat' }
      ]
    }
  },

  /* ------------------------------------------------------------------ */
  /* 6. 大学计算机 · 递归 · 计算机科学导论（自编讲义）                  */
  /* ------------------------------------------------------------------ */
  {
    id: 'university-cs',
    stage: '大学',
    subject: '计算机',
    grade: '大一',
    textbook: '自编讲义',
    unit: '第 4 章 递归与分治',
    title: '递归',
    summary:
      '面向大一计算机类大班的一次 90 分钟讲授 + 上机：以汉诺塔和文件夹遍历为问题情境，讲清递归的基线条件、递归条件与调用栈，用归纳法和递归式分析正确性与复杂度，再通过二分查找、归并排序和上机调试把「会读、会写、会分析」连起来。',
    course: {
      code: 'CS101',
      credits: 3,
      hours: 48,
      audience: '大一计算机类本科生（约 120 人）',
      assessment: '平时 20% + 编程作业 30% + 课程项目 20% + 期末 30%'
    },
    needExamples: [
      '90 分钟讲授 + 上机，120 人只有 2 间机房，机器上 Python 版本不一致，怎么安排上机任务？',
      '学生能照着写阶乘，但一遇到汉诺塔就不知道基线条件放哪，怎么让他们学会拆解而不是背代码？',
      '课程项目占 20%，想用递归与分治做一个小项目，rubric 怎么写才能既看功能又看复杂度分析和学术诚信？'
    ],
    sources: [
      {
        id: 'ucs-s1',
        type: '教材',
        title: '《计算机科学导论（自编讲义）》',
        locator: '第 4 章 递归与分治 · 4.1 递归定义、4.2 基线条件与递归条件、4.3 调用栈',
        excerpt:
          '递归函数在定义中调用自身；必须包含基线条件与递归条件，且每次递归调用都应使问题规模向基线条件靠近。',
        confidence: 0.9
      },
      {
        id: 'ucs-s2',
        type: '教材',
        title: '《算法导论》（第 4 版），Cormen 等著',
        locator: 'Chapter 4 Divide-and-Conquer · 4.1 最大子数组问题、4.3 代入法求解递归式',
        excerpt:
          '分治算法将问题分解为规模更小的子问题，递归求解后合并；递归式用于描述算法的运行时间。',
        confidence: 0.9
      },
      {
        id: 'ucs-s3',
        type: '大纲',
        title: '《CS101 计算机科学导论课程教学大纲（2026 版）》',
        locator: '第 4 章 递归与分治（6 学时）· 课程目标 3（毕业要求 3.2）；编程作业 30%、项目 20%',
        excerpt:
          '理解递归与分治的基本思想，能编写和调试递归程序，能分析简单递归算法的时间复杂度；第 4 章 6 学时，含 2 学时上机。',
        confidence: 0.9
      },
      {
        id: 'ucs-s4',
        type: '大纲',
        title: '《计算机类专业教学质量国家标准》',
        locator: '课程体系 · 程序设计基础、算法与复杂度',
        excerpt:
          '程序设计课程应覆盖递归、分治等基本算法设计策略，并训练复杂度分析能力。',
        confidence: 0.8
      },
      {
        id: 'ucs-s5',
        type: '解读',
        title: '《Think Python: How to Think Like a Computer Scientist》（第 2 版）',
        locator: 'Chapter 5 Conditionals and Recursion · 5.8 Recursion、5.9 Stack Diagrams for Recursive Functions',
        excerpt:
          '递归函数必须有一个基线条件，否则会无限递归；栈图可显示每次调用创建的栈帧。',
        confidence: 0.85
      },
      {
        id: 'ucs-s6',
        type: '校本',
        title: '计算机学院《CS101 2026 秋季前测》',
        locator: '第 5—9 题 · 函数与递归',
        excerpt:
          '120 名学生中约 46% 不能写出正确的基线条件，约 39% 无法画出阶乘递归的调用栈。',
        confidence: 0.76
      },
      {
        id: 'ucs-s7',
        type: '校本',
        title: '《CS101 上机实验手册 · 递归与分治》',
        locator: '实验 4 · Python 3.11 环境、在线评测 6 题、提交规范',
        excerpt:
          '上机任务：阶乘、列表求和、二分查找、归并排序、汉诺塔、全排列；使用统一 Python 3.11 环境，提交 .py 文件与运行截图。',
        confidence: 0.84
      },
      {
        id: 'ucs-s8',
        type: '外部',
        title: 'Python Tutor（pythontutor.com）',
        locator: 'Visualize Python · 递归调用栈示例',
        excerpt:
          '逐步可视化函数调用、栈帧与返回过程，适合讲解递归执行顺序。',
        confidence: 0.7
      },
      {
        id: 'ucs-s9',
        type: '外部',
        title: 'MIT OpenCourseWare 6.0001 Introduction to Computer Science and Programming in Python',
        locator: 'Lecture 6: Recursion and Dictionaries',
        excerpt:
          'Recursion: a function calls itself; need a base case; each call has its own scope and stack frame.',
        confidence: 0.75
      },
      {
        id: 'ucs-s10',
        type: '论文',
        title: 'Götschi, T., Sanders, I., & Galpin, V. Mental models of recursion',
        locator: 'Proceedings of SIGCSE 2003: 346–350 · 学生递归心智模型',
        excerpt:
          '学生常把递归理解为「循环」或「复制代码」，忽略调用栈与基线条件，导致追踪错误。',
        confidence: 0.86
      }
    ],
    graph: {
      nodes: [
        {
          id: 'ucs-function',
          label: '函数定义与调用',
          layer: 0,
          kind: 'prior',
          desc: '函数定义、参数、返回值与调用表达式；递归是函数调用自身的一种特殊形式。',
          sourceIds: ['ucs-s1', 'ucs-s5']
        },
        {
          id: 'ucs-condition',
          label: '条件分支',
          layer: 0,
          kind: 'prior',
          desc: 'if/else 等分支语句，用来表达基线条件与递归条件的分界。',
          sourceIds: ['ucs-s1', 'ucs-s5']
        },
        {
          id: 'ucs-list',
          label: '列表与序列',
          layer: 0,
          kind: 'prior',
          desc: '列表的索引、切片与长度；递归处理列表时常用切片或索引区间缩小规模。',
          sourceIds: ['ucs-s1', 'ucs-s7']
        },
        {
          id: 'ucs-recursion',
          label: '递归',
          layer: 2,
          kind: 'concept',
          desc: '函数在定义中直接或间接调用自身；每次调用都有独立的参数、局部变量与栈帧。',
          sourceIds: ['ucs-s1', 'ucs-s3', 'ucs-s5']
        },
        {
          id: 'ucs-base',
          label: '基线条件',
          layer: 1,
          kind: 'concept',
          desc: '递归终止的条件，必须可达；没有基线条件会导致无限递归，Python 最终抛出 RecursionError。',
          sourceIds: ['ucs-s1', 'ucs-s5']
        },
        {
          id: 'ucs-progress',
          label: '递归条件与规模递减',
          layer: 1,
          kind: 'concept',
          desc: '递归调用必须使问题规模严格减小或向基线推进，否则即使写了基线也可能到达不了。',
          sourceIds: ['ucs-s1', 'ucs-s7']
        },
        {
          id: 'ucs-stack',
          label: '调用栈',
          layer: 2,
          kind: 'concept',
          desc: '每次函数调用创建一个栈帧，保存参数、局部变量与返回地址；递归返回按后进先出顺序回退。',
          sourceIds: ['ucs-s1', 'ucs-s5']
        },
        {
          id: 'ucs-divide',
          label: '分治',
          layer: 2,
          kind: 'concept',
          desc: '分治三步：分解、递归求解子问题、合并结果；子问题通常相互独立。',
          sourceIds: ['ucs-s2', 'ucs-s3']
        },
        {
          id: 'ucs-merge',
          label: '归并排序',
          layer: 2,
          kind: 'concept',
          desc: '把序列分成两半，递归排序后线性合并；时间复杂度 O(n log n)。',
          sourceIds: ['ucs-s2', 'ucs-s7']
        },
        {
          id: 'ucs-complexity',
          label: '递归复杂度分析',
          layer: 2,
          kind: 'concept',
          desc: '用递归式描述递归算法的运行时间，如 T(n)=2T(n/2)+O(n)，再求解其量级。',
          sourceIds: ['ucs-s2', 'ucs-s3']
        },
        {
          id: 'ucs-trace',
          label: '递归追踪与栈图',
          layer: 2,
          kind: 'skill',
          desc: '手工或借助工具画出调用栈，追踪参数、返回值与执行顺序，定位基线或返回错误。',
          sourceIds: ['ucs-s7', 'ucs-s8']
        },
        {
          id: 'ucs-target',
          label: '用递归与分治解决问题',
          layer: 3,
          kind: 'target',
          desc: '能识别可用递归或分治的问题，写出正确的基线条件与递归条件，分析复杂度并通过测试。',
          sourceIds: ['ucs-s1', 'ucs-s3', 'ucs-s7']
        },
        {
          id: 'ucs-m-nobase',
          label: '忘记基线条件',
          layer: 1,
          kind: 'misconception',
          desc: '忘记写基线条件，或把不可能满足的条件当基线，导致无限递归或栈溢出。',
          sourceIds: ['ucs-s6', 'ucs-s10']
        },
        {
          id: 'ucs-m-return',
          label: '递归调用与 return 混淆',
          layer: 2,
          kind: 'misconception',
          desc: '只 print 递归结果而不 return，或忘记 return 递归调用的返回值，导致上层拿到 None。',
          sourceIds: ['ucs-s5', 'ucs-s10']
        },
        {
          id: 'ucs-m-faster',
          label: '递归一定更快或更优雅',
          layer: 2,
          kind: 'misconception',
          desc: '认为递归一定比循环快或一定更优雅，忽略函数调用开销、栈深度和重复子问题。',
          sourceIds: ['ucs-s6', 'ucs-s10']
        },
        {
          id: 'ucs-m-fib',
          label: '朴素 Fibonacci 是线性复杂度',
          layer: 2,
          kind: 'misconception',
          desc: '认为朴素 Fibonacci 是 O(n)；实际上 T(n)=T(n−1)+T(n−2)+O(1)，为指数级。',
          sourceIds: ['ucs-s2', 'ucs-s6']
        }
      ],
      edges: [
        {
          from: 'ucs-function',
          to: 'ucs-recursion',
          relation: 'prerequisite',
          confidence: 0.95,
          basis: '递归是函数调用自身，必须先掌握函数定义、参数与返回值。',
          sourceIds: ['ucs-s1', 'ucs-s5']
        },
        {
          from: 'ucs-condition',
          to: 'ucs-base',
          relation: 'prerequisite',
          confidence: 0.94,
          basis: '基线条件通常用 if 分支表达，条件判断是写出终止条件的基础。',
          sourceIds: ['ucs-s1', 'ucs-s5']
        },
        {
          from: 'ucs-base',
          to: 'ucs-recursion',
          relation: 'prerequisite',
          confidence: 0.97,
          basis: '没有基线条件的递归不会终止，基线是递归定义的必要组成部分。',
          sourceIds: ['ucs-s1', 'ucs-s5']
        },
        {
          from: 'ucs-progress',
          to: 'ucs-recursion',
          relation: 'prerequisite',
          confidence: 0.95,
          basis: '每次递归调用都必须使问题规模向基线靠近，否则基线不可达。',
          sourceIds: ['ucs-s1', 'ucs-s7']
        },
        {
          from: 'ucs-recursion',
          to: 'ucs-stack',
          relation: 'leads-to',
          confidence: 0.93,
          basis: '递归调用会逐层压栈，返回时逐层出栈，调用栈是理解执行顺序的关键。',
          sourceIds: ['ucs-s1', 'ucs-s5']
        },
        {
          from: 'ucs-recursion',
          to: 'ucs-trace',
          relation: 'prerequisite',
          confidence: 0.92,
          basis: '追踪递归需要先理解递归调用与返回的结构。',
          sourceIds: ['ucs-s1', 'ucs-s7']
        },
        {
          from: 'ucs-trace',
          to: 'ucs-target',
          relation: 'supports',
          confidence: 0.9,
          basis: '能画栈图才能定位基线错误、返回值丢失和栈溢出。',
          sourceIds: ['ucs-s7', 'ucs-s8']
        },
        {
          from: 'ucs-recursion',
          to: 'ucs-target',
          relation: 'prerequisite',
          confidence: 0.96,
          basis: '编写递归程序是本章的核心目标。',
          sourceIds: ['ucs-s1', 'ucs-s3']
        },
        {
          from: 'ucs-recursion',
          to: 'ucs-divide',
          relation: 'prerequisite',
          confidence: 0.93,
          basis: '分治算法通常用递归实现子问题的求解。',
          sourceIds: ['ucs-s2', 'ucs-s3']
        },
        {
          from: 'ucs-divide',
          to: 'ucs-merge',
          relation: 'prerequisite',
          confidence: 0.94,
          basis: '归并排序是分治思想的标准实例：分解、递归排序、合并。',
          sourceIds: ['ucs-s2', 'ucs-s7']
        },
        {
          from: 'ucs-merge',
          to: 'ucs-complexity',
          relation: 'supports',
          confidence: 0.92,
          basis: '归并排序的递归式 T(n)=2T(n/2)+O(n) 是复杂度分析的典型例子。',
          sourceIds: ['ucs-s2', 'ucs-s3']
        },
        {
          from: 'ucs-recursion',
          to: 'ucs-complexity',
          relation: 'supports',
          confidence: 0.9,
          basis: '递归算法的运行时间通常用递归式描述。',
          sourceIds: ['ucs-s2', 'ucs-s3']
        },
        {
          from: 'ucs-list',
          to: 'ucs-divide',
          relation: 'prerequisite',
          confidence: 0.88,
          basis: '对序列做分解与合并需要掌握索引、切片和长度。',
          sourceIds: ['ucs-s2', 'ucs-s7']
        },
        {
          from: 'ucs-m-nobase',
          to: 'ucs-base',
          relation: 'contrasts',
          confidence: 0.93,
          basis: '忘记或写错基线条件会直接导致无限递归，是基线概念的核心反例。',
          sourceIds: ['ucs-s6', 'ucs-s10']
        },
        {
          from: 'ucs-m-return',
          to: 'ucs-recursion',
          relation: 'contrasts',
          confidence: 0.9,
          basis: '递归调用必须把返回值向上传递，只打印不返回会破坏递归结果。',
          sourceIds: ['ucs-s5', 'ucs-s10']
        },
        {
          from: 'ucs-m-faster',
          to: 'ucs-recursion',
          relation: 'contrasts',
          confidence: 0.89,
          basis: '递归有调用开销和栈深限制，且可能重复计算，不能一概认为更快。',
          sourceIds: ['ucs-s6', 'ucs-s10']
        },
        {
          from: 'ucs-m-fib',
          to: 'ucs-complexity',
          relation: 'contrasts',
          confidence: 0.91,
          basis: '朴素 Fibonacci 的递归式呈指数增长，直接推翻「线性复杂度」的误判。',
          sourceIds: ['ucs-s2', 'ucs-s6']
        },
        {
          from: 'ucs-divide',
          to: 'ucs-target',
          relation: 'supports',
          confidence: 0.92,
          basis: '分治是递归的主要应用模式，能扩展问题求解的范围。',
          sourceIds: ['ucs-s2', 'ucs-s7']
        },
        {
          from: 'ucs-complexity',
          to: 'ucs-target',
          relation: 'supports',
          confidence: 0.89,
          basis: '能分析复杂度，才能判断递归方案是否可接受并做出取舍。',
          sourceIds: ['ucs-s3', 'ucs-s4']
        }
      ]
    },
    objectives: [
      {
        text: '能说明递归的定义、基线条件与递归条件，解释调用栈在递归执行中的增长与回退。',
        level: '理解',
        sourceIds: ['ucs-s1', 'ucs-s3', 'ucs-s5']
      },
      {
        text: '能编写并调试阶乘、列表求和、二分查找等递归程序，画出对应调用栈。',
        level: '应用',
        sourceIds: ['ucs-s1', 'ucs-s7', 'ucs-s8']
      },
      {
        text: '能分析朴素 Fibonacci 的重复子问题，写出递归式并说明其指数级时间复杂度及 memoization 的改进。',
        level: '分析',
        sourceIds: ['ucs-s2', 'ucs-s3', 'ucs-s10']
      },
      {
        text: '能评价递归与迭代、分治方案在可读性、栈深度和复杂度上的取舍，为给定问题选择方案并说明理由。',
        level: '评价',
        sourceIds: ['ucs-s2', 'ucs-s3', 'ucs-s4']
      }
    ],
    keyPoints: [
      '递归三要素：基线条件、递归条件、每次调用规模递减',
      '每次调用创建独立栈帧，返回按后进先出顺序回退',
      '分治：分解—递归求解—合并；归并排序 O(n log n)',
      '递归不必然更高效；朴素 Fibonacci 因重复子问题呈指数复杂度'
    ],
    difficulties: [
      '找到正确的基线条件并保证可达',
      '追踪多层递归的调用栈与返回值',
      '从递归式分析复杂度',
      '递归与迭代的取舍'
    ],
    misconceptions: [
      {
        nodeId: 'ucs-m-nobase',
        label: '忘记基线条件',
        misconception: '认为递归会自动停止，或把循环条件当成基线条件，导致无限递归与 RecursionError。',
        sourceIds: ['ucs-s6', 'ucs-s10']
      },
      {
        nodeId: 'ucs-m-return',
        label: '递归调用与 return 混淆',
        misconception: '只打印递归结果而不返回，或忘记 return 递归调用的返回值，导致上层得到 None。',
        sourceIds: ['ucs-s5', 'ucs-s10']
      },
      {
        nodeId: 'ucs-m-faster',
        label: '递归一定更快或更优雅',
        misconception: '认为递归总比循环好，忽略函数调用开销、栈深度限制与重复子问题。',
        sourceIds: ['ucs-s6', 'ucs-s10']
      },
      {
        nodeId: 'ucs-m-fib',
        label: '朴素 Fibonacci 是线性复杂度',
        misconception: '把朴素 Fibonacci 的递归调用次数当成 n 的量级，忽略重复子问题导致的指数增长。',
        sourceIds: ['ucs-s2', 'ucs-s6']
      }
    ],
    flowTemplate: [
      {
        phase: '问题导入',
        minutes: 8,
        teacher:
          '展示 3 层汉诺塔，提出问题：「64 层要移动多少次？」不直接讲代码，先让学生写出 2 层、3 层的移动步骤，引导观察「先把上面 n−1 个移到辅助柱」。',
        student: '尝试写出 3 层步骤，观察步骤之间的复用关系，猜测移动次数。',
        evidence: '能说出把 n 层问题化为 n−1 层问题，并给出 2 层、3 层的移动序列。',
        sourceIds: ['ucs-s1', 'ucs-s3']
      },
      {
        phase: '概念讲授',
        minutes: 16,
        teacher:
          '给出递归定义、基线条件与递归条件；以 factorial(4) 为例画调用栈，标出压栈与返回；强调每次调用有独立作用域，并指出缺少基线会抛出 RecursionError。',
        student: '跟画栈图，预测 factorial(3) 的返回值，标出基线条件所在行。',
        evidence: '能写出 factorial 的基线与递归条件，栈图顺序正确。',
        sourceIds: ['ucs-s1', 'ucs-s5', 'ucs-s9']
      },
      {
        phase: '推导/证明',
        minutes: 16,
        teacher:
          '用数学归纳法证明 factorial 的正确性；由 T(n)=T(n−1)+O(1) 得 O(n)；由 T(n)=T(n−1)+T(n−2)+O(1) 说明朴素 Fibonacci 为指数级；给出归并排序 T(n)=2T(n/2)+O(n)=O(n log n)。',
        student: '跟随归纳步骤，比较两个递归式的增长，记录指数与线性对数结论。',
        evidence: '能写出递归式并判断量级，能指出 Fibonacci 慢在重复子问题。',
        sourceIds: ['ucs-s2', 'ucs-s3', 'ucs-s5']
      },
      {
        phase: '案例/应用',
        minutes: 16,
        teacher:
          '现场实现二分查找与归并排序，用 Python Tutor 单步展示栈帧；分别指出两者的基线条件、递归区间与合并步骤。',
        student: '阅读代码并预测输出，指出 mid、递归区间与合并条件。',
        evidence: '能说出二分查找的基线（区间为空或命中）与归并排序的合并条件。',
        sourceIds: ['ucs-s2', 'ucs-s7', 'ucs-s8']
      },
      {
        phase: '小组讨论',
        minutes: 12,
        teacher:
          '给出 3 段代码：缺基线、基线不可达、忘记 return。4 人一组找 bug 并改正，再讨论何时用递归、何时用循环；随机抽 2 组汇报。',
        student: '定位 bug，写出修正版，形成至少 2 条递归与迭代的取舍规则。',
        evidence: '能指出 RecursionError 或 None 的成因，能说出至少 2 条递归适用条件。',
        sourceIds: ['ucs-s6', 'ucs-s10']
      },
      {
        phase: '课堂练习',
        minutes: 14,
        teacher:
          '发 3 题：写 sum_list 递归；画 factorial(3) 栈图；实现二分查找并测试空列表。巡视时重点看基线条件与返回值。',
        student: '独立编码或手写，同伴互测空列表、单元素等边界。',
        evidence: '基线条件正确；空列表与单元素测试通过；栈图无误。',
        sourceIds: ['ucs-s1', 'ucs-s7']
      },
      {
        phase: '总结与作业',
        minutes: 8,
        teacher:
          '用三要素收束；发布课程项目选题与 rubric；说明代码提交、引用规范与 AI 使用边界，强调学术诚信。',
        student: '记录项目要求，选择一个选题并说出初步的递归/分治思路。',
        evidence: '能复述三要素；明确项目提交物与截止时间。',
        sourceIds: ['ucs-s3', 'ucs-s4', 'ucs-s7']
      }
    ],
    activities: {
      basic: [
        '写出 factorial(n) 的基线条件与递归条件，并追踪 factorial(4) 的返回值。',
        '判断 3 段递归代码是否会终止，指出缺失或不可达的基线条件。'
      ],
      advanced: [
        '实现归并排序，写出递归式并说明为什么是 O(n log n)。',
        '用 memoization 改进朴素 Fibonacci，比较 n=35 时的调用次数。'
      ],
      'hands-on': [
        '上机：在 Python 3.11 环境完成阶乘、列表求和、二分查找 3 题，提交 .py 与运行截图。',
        '用 Python Tutor 单步观察 factorial(4) 的栈帧，截图标注压栈与出栈。',
        '小组实现汉诺塔并统计移动次数，验证 2^n−1。'
      ]
    },
    assessment: [
      {
        type: '课堂测验（10 分钟）',
        text: '2 题：给出一段递归代码，写出输出并画出调用栈；指出缺失的基线条件。',
        criteria: '栈帧顺序正确；能说明缺少基线会导致 RecursionError；返回值追踪无误。'
      },
      {
        type: '编程作业（第 4 章，计入 30%）',
        text: '4 道在线评测题：阶乘、列表求和、二分查找、汉诺塔；要求通过全部测试点并提交复杂度说明。',
        criteria: '按 rubric：正确性 50%、边界与基线 20%、代码规范 15%、复杂度说明 15%；禁止抄袭，需能口头解释。'
      },
      {
        type: '课程项目（20%）',
        text: '用递归或分治完成一个小项目（如迷宫求解、全排列、归并排序可视化），提交代码、README 与 5 分钟演示。',
        criteria: 'rubric：功能与正确性 40%、递归或分治设计 25%、复杂度与测试 20%、文档与学术诚信 15%。'
      }
    ],
    homework: {
      basic: [
        'Problem Set 4A：自编讲义第 4 章习题 1—4：写基线条件、追踪 factorial(4)、判断递归是否终止。',
        '阅读讲义 4.3 调用栈，画出 sum_list([1,2,3,4]) 的栈图。'
      ],
      advanced: [
        'Programming Assignment 4B：实现归并排序与二分查找，附递归式与复杂度分析。',
        '实现带 memoization 的 Fibonacci，比较 n=30 时朴素版与改进版的调用次数。'
      ],
      remedial: [
        '补做 3 道递归追踪题：给出代码，逐步写出每次调用的参数与返回值。',
        '观看 MIT 6.0001 Lecture 6 前 25 分钟，整理「基线条件—递归条件—栈帧」三栏笔记。'
      ]
    },
    differentiation: {
      support: [
        '提供递归模板与 worked example：def f(n): if 基线: return ...; return ... f(更小规模)。',
        '用 Python Tutor 逐步演示，先读代码再改写；采用同伴编程（driver/navigator）。',
        '为上机环境不熟的学生提供 10 分钟命令行与提交规范辅导。'
      ],
      extension: [
        '阅读 Götschi 等「Mental models of recursion」，写 1 页 reading response：你曾有过哪种错误心智模型？',
        '实现 N 皇后或迷宫求解，比较不同剪枝策略的搜索规模。',
        '分析尾递归在 Python 中为何不能自动优化，并改写为迭代。'
      ]
    },
    risks: [
      {
        risk: '机房设备或 Python 环境不一致，上机任务无法顺利运行',
        fallback:
          '统一提供 Python 3.11 便携环境与在线评测；课前一天检查机房；准备云端 IDE 作为备用。'
      },
      {
        risk: '编程作业抄袭或直接使用 AI 生成代码',
        fallback:
          '采用变式题与口头答辩；要求提交开发过程与测试；明确 AI 使用与引用规范，按课程学术诚信条款处理。'
      },
      {
        risk: '学生先修函数、列表薄弱，递归学习受阻',
        fallback:
          '课前发布函数与列表诊断题；安排 20 分钟补习微课；上机采用结对编程与分层任务。'
      }
    ],
    classProfile: {
      className: '2026 级计算机类 CS101 · 示例班级',
      sampleSize: 120,
      term: '2026 秋季学期',
      weakPoints: [
        { label: '基线条件与递归终止', ratio: 0.46, trend: 'up' },
        { label: '调用栈追踪', ratio: 0.39, trend: 'flat' },
        { label: '递归复杂度分析', ratio: 0.34, trend: 'up' },
        { label: '递归转迭代', ratio: 0.29, trend: 'flat' }
      ]
    }
  }
];

export function getTeacherTopic(id) {
  return teacherTopics.find((topic) => topic.id === id) || null;
}
