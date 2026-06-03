import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 390;
const HEIGHT = 844;
const FPS = 60;
const FRAMES = 240;
const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'assets',
  'animations',
  'symphony-vision-splash.json',
);

const palette = {
  canvas: '#f8f5ee',
  canvasWarm: '#eceae0',
  paper: '#f4efe5',
  sage: '#5f7d72',
  sageDeep: '#28463a',
  sageSoft: '#dce6dd',
  ink: '#27302d',
  inkMuted: '#6a746f',
  white: '#fffdf8',
  champagne: '#b59663',
  champagneSoft: '#eadac2',
};

const css = (hex, alpha = 1) => {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  return [r, g, b, alpha];
};

const p = (k, ix = 0) => ({ a: 0, k, ix });

const ease = (length, outX = 0.16, outY = 1, inX = 0.22, inY = 1) => ({
  i: { x: Array(length).fill(inX), y: Array(length).fill(inY) },
  o: { x: Array(length).fill(outX), y: Array(length).fill(outY) },
});

const arr = (value) => (Array.isArray(value) ? value : [value]);

const key = (t, s, e, easing = ease(arr(s).length)) => ({
  t,
  s: arr(s),
  e: arr(e),
  ...easing,
});

const last = (t, s) => ({ t, s: arr(s) });

const ap = (keys, ix = 0) => ({ a: 1, k: keys, ix });

const transform = ({
  opacity = 100,
  position = [0, 0, 0],
  anchor = [0, 0, 0],
  scale = [100, 100, 100],
  rotation = 0,
  animated = {},
} = {}) => ({
  o: animated.opacity ?? p(opacity, 11),
  r: animated.rotation ?? p(rotation, 10),
  p: animated.position ?? p(position, 2),
  a: animated.anchor ?? p(anchor, 1),
  s: animated.scale ?? p(scale, 6),
});

const groupTransform = ({
  position = [0, 0],
  anchor = [0, 0],
  scale = [100, 100],
  rotation = 0,
  opacity = 100,
} = {}) => ({
  ty: 'tr',
  p: p(position, 2),
  a: p(anchor, 1),
  s: p(scale, 3),
  r: p(rotation, 6),
  o: p(opacity, 7),
  sk: p(0, 4),
  sa: p(0, 5),
  nm: 'Transform',
});

const fill = (color, opacity = 100) => ({
  ty: 'fl',
  c: p(color.slice(0, 3), 4),
  o: p(opacity * (color[3] ?? 1), 5),
  r: 1,
  bm: 0,
  nm: 'Fill',
  mn: 'ADBE Vector Graphic - Fill',
  hd: false,
});

const stroke = (color, width = 1, opacity = 100) => ({
  ty: 'st',
  c: p(color.slice(0, 3), 3),
  o: p(opacity * (color[3] ?? 1), 4),
  w: p(width, 5),
  lc: 2,
  lj: 2,
  ml: 4,
  bm: 0,
  nm: 'Stroke',
  mn: 'ADBE Vector Graphic - Stroke',
  hd: false,
});

const rect = (size, roundness = 0, position = [0, 0]) => ({
  ty: 'rc',
  d: 1,
  s: p(size, 2),
  p: p(position, 3),
  r: p(roundness, 4),
  nm: 'Rectangle Path',
  mn: 'ADBE Vector Shape - Rect',
  hd: false,
});

const ellipse = (size, position = [0, 0]) => ({
  ty: 'el',
  d: 1,
  s: p(size, 2),
  p: p(position, 3),
  nm: 'Ellipse Path',
  mn: 'ADBE Vector Shape - Ellipse',
  hd: false,
});

const path = (vertices, closed = false) => ({
  ty: 'sh',
  ix: 1,
  ks: p(
    {
      i: vertices.map(() => [0, 0]),
      o: vertices.map(() => [0, 0]),
      v: vertices,
      c: closed,
    },
    2,
  ),
  nm: 'Path',
  mn: 'ADBE Vector Shape - Group',
  hd: false,
});

const bezier = (vertices, inTangents, outTangents, closed = false) => ({
  ty: 'sh',
  ix: 1,
  ks: p(
    {
      i: inTangents,
      o: outTangents,
      v: vertices,
      c: closed,
    },
    2,
  ),
  nm: 'Bezier Path',
  mn: 'ADBE Vector Shape - Group',
  hd: false,
});

const group = (name, items, options = {}) => ({
  ty: 'gr',
  it: [...items, groupTransform(options)],
  nm: name,
  np: items.length,
  cix: 2,
  bm: 0,
  ix: 1,
  mn: 'ADBE Vector Group',
  hd: false,
});

let layerIndex = 1;

const shapeLayer = (name, shapes, options = {}) => ({
  ddd: 0,
  ind: layerIndex++,
  ty: 4,
  nm: name,
  sr: 1,
  ks: transform(options.transform),
  ao: 0,
  shapes,
  ip: options.ip ?? 0,
  op: options.op ?? FRAMES,
  st: 0,
  bm: options.blendMode ?? 0,
});

const textLayer = (name, text, options = {}) => {
  const color = css(options.color ?? palette.ink);

  return {
    ddd: 0,
    ind: layerIndex++,
    ty: 5,
    nm: name,
    sr: 1,
    ks: transform(options.transform),
    ao: 0,
    t: {
      d: {
        k: [
          {
            s: {
              sz: options.box ?? [WIDTH, 120],
              ps: options.ps ?? [0, 0],
              s: options.size ?? 32,
              f: options.font ?? 'NotoSerifSC-SemiBold',
              t: text,
              j: options.align ?? 2,
              tr: options.tracking ?? 0,
              lh: options.lineHeight ?? Math.round((options.size ?? 32) * 1.25),
              ls: 0,
              fc: color.slice(0, 3),
            },
            t: 0,
          },
        ],
      },
      p: {},
      m: {
        g: 1,
        a: p([0, 0], 1),
      },
      a: [],
    },
    ip: options.ip ?? 0,
    op: options.op ?? FRAMES,
    st: 0,
    bm: 0,
  };
};

const solidRect = (name, color) =>
  shapeLayer(name, [
    group(name, [rect([WIDTH, HEIGHT]), fill(css(color), 100)], {
      position: [WIDTH / 2, HEIGHT / 2],
    }),
  ]);

const animatedOpacity = (...stops) =>
  ap(
    stops.map((stop, index) => {
      const [t, value] = stop;
      const next = stops[index + 1];
      return next ? key(t, [value], [next[1]]) : last(t, [value]);
    }),
    11,
  );

const animatedPosition = (...stops) =>
  ap(
    stops.map((stop, index) => {
      const [t, value] = stop;
      const next = stops[index + 1];
      return next ? key(t, value, next[1]) : last(t, value);
    }),
    2,
  );

const animatedScale = (...stops) =>
  ap(
    stops.map((stop, index) => {
      const [t, value] = stop;
      const next = stops[index + 1];
      return next ? key(t, value, next[1]) : last(t, value);
    }),
    6,
  );

const backgroundLayers = () => [
  solidRect('warm paper base', palette.canvas),
  shapeLayer(
    'ambient sage and champagne light',
    [
      group(
        'top sage wash',
        [ellipse([560, 430]), fill(css(palette.sage, 0.42), 100)],
        { position: [58, 40] },
      ),
      group(
        'right champagne wash',
        [ellipse([420, 340]), fill(css(palette.champagneSoft, 0.36), 100)],
        { position: [388, 138] },
      ),
      group(
        'lower paper glow',
        [ellipse([520, 350]), fill(css(palette.white, 0.72), 100)],
        { position: [195, 575] },
      ),
    ],
    {
      transform: {
        animated: {
          opacity: animatedOpacity([0, 0], [38, 100], [240, 100]),
        },
      },
    },
  ),
  shapeLayer(
    'slow gallery light sweep',
    [
      group(
        'diagonal translucent sweep',
        [rect([120, 920], 40), fill(css(palette.white, 0.36), 100)],
        { position: [0, 0], rotation: -20 },
      ),
    ],
    {
      transform: {
        position: [0, 0, 0],
        animated: {
          opacity: animatedOpacity([0, 0], [28, 70], [136, 32], [240, 18]),
          position: animatedPosition(
            [0, [-130, 430, 0]],
            [156, [470, 430, 0]],
            [240, [520, 430, 0]],
          ),
        },
      },
    },
  ),
];

const paperTextureLayer = () => {
  let seed = 13;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const dots = Array.from({ length: 52 }, (_, index) => {
    const x = Math.round(random() * WIDTH);
    const y = Math.round(random() * HEIGHT);
    const size = 1 + random() * 1.6;
    const color = index % 5 === 0 ? palette.champagne : palette.sage;

    return group(
      `paper grain ${index + 1}`,
      [ellipse([size, size]), fill(css(color, index % 5 === 0 ? 0.16 : 0.1), 100)],
      { position: [x, y] },
    );
  });

  return shapeLayer('subtle paper grain', dots, {
    transform: {
      animated: {
        opacity: animatedOpacity([0, 0], [42, 46], [240, 46]),
      },
    },
  });
};

const staffLayer = () => {
  const staffLines = Array.from({ length: 5 }, (_, index) =>
    group(
      `staff line ${index + 1}`,
      [
        path([
          [-186, -24 + index * 12],
          [-104, -46 + index * 12],
          [0, -56 + index * 12],
          [134, -34 + index * 12],
          [210, -22 + index * 12],
        ]),
        stroke(css(palette.white, 0.6), 1.2, 100),
      ],
      {},
    ),
  );

  return shapeLayer('drifting staff lines', staffLines, {
    transform: {
      position: [195, 214, 0],
      rotation: -11,
      animated: {
        opacity: animatedOpacity([0, 0], [28, 68], [144, 42], [240, 22]),
        position: animatedPosition(
          [0, [180, 230, 0]],
          [118, [198, 214, 0]],
          [240, [214, 204, 0]],
        ),
      },
    },
  });
};

const glassLayer = () =>
  shapeLayer(
    'curatorial glass panels',
    [
      group(
        'left glass card',
        [
          rect([88, 238], 42),
          fill(css(palette.white, 0.28), 100),
          stroke(css(palette.white, 0.52), 1, 100),
        ],
        { position: [-18, 468] },
      ),
      group(
        'title glass capsule',
        [
          rect([218, 86], 32),
          fill(css(palette.white, 0.22), 100),
          stroke(css(palette.white, 0.42), 1.2, 100),
        ],
        { position: [195, 436] },
      ),
      group(
        'top navigation echo',
        [
          rect([168, 42], 21),
          fill(css(palette.white, 0.3), 100),
          stroke(css(palette.white, 0.54), 1.1, 100),
        ],
        { position: [86, 50] },
      ),
    ],
    {
      transform: {
        animated: {
          opacity: animatedOpacity([0, 0], [48, 72], [150, 42], [240, 18]),
        },
      },
    },
  );

const noteLayer = (name, note, position, size, start, drift, rotation = 0) =>
  textLayer(name, note, {
    size,
    font: 'NotoSerifSC-SemiBold',
    color: palette.champagne,
    box: [80, 80],
    tracking: 0,
    transform: {
      position: [...position, 0],
      rotation,
      animated: {
        opacity: animatedOpacity([0, 0], [start, 0], [start + 18, 82], [150, 74], [222, 36], [240, 24]),
        position: animatedPosition(
          [0, [...position, 0]],
          [start, [...position, 0]],
          [start + 42, [position[0] + drift[0], position[1] + drift[1], 0]],
          [240, [position[0] + drift[0] * 1.22, position[1] + drift[1] * 1.22, 0]],
        ),
        scale: animatedScale(
          [0, [88, 88, 100]],
          [start, [88, 88, 100]],
          [start + 16, [108, 108, 100]],
          [start + 32, [100, 100, 100]],
          [240, [100, 100, 100]],
        ),
      },
    },
  });

const musicNotes = () => [
  noteLayer('champagne note upper right', '♪', [318, 166], 27, 36, [16, -22], -8),
  noteLayer('small note left pickup', '♩', [80, 284], 19, 48, [-12, -18], 10),
  noteLayer('floating duet note', '♫', [322, 314], 22, 64, [24, -10], 6),
  noteLayer('soft note near title', '♪', [92, 388], 17, 84, [-22, -8], -12),
];

const violinLayer = () =>
  shapeLayer(
    'violin silhouette',
    [
      group('violin body left', [ellipse([44, 54]), fill(css(palette.sage, 0.18), 100), stroke(css(palette.sageDeep, 0.42), 1.4, 100)], {
        position: [-18, 12],
        rotation: -16,
      }),
      group('violin body right', [ellipse([44, 54]), fill(css(palette.sage, 0.16), 100), stroke(css(palette.sageDeep, 0.42), 1.4, 100)], {
        position: [18, 12],
        rotation: 16,
      }),
      group('violin waist', [ellipse([34, 32]), fill(css(palette.white, 0.5), 100), stroke(css(palette.sageDeep, 0.3), 1, 100)], {
        position: [0, 8],
      }),
      group('violin neck', [rect([9, 78], 4), fill(css(palette.sageDeep, 0.34), 100)], {
        position: [0, -44],
      }),
      group('violin head', [ellipse([20, 15]), fill(css(palette.sageDeep, 0.32), 100)], {
        position: [0, -86],
        rotation: -18,
      }),
      group('violin strings', [path([[0, -88], [0, 44]]), stroke(css(palette.white, 0.62), 0.8, 100)], {}),
      group('violin bow', [path([[-54, -70], [52, 58]]), stroke(css(palette.champagne, 0.58), 1.2, 100)], {}),
    ],
    {
      transform: {
        position: [84, 530, 0],
        rotation: -13,
        animated: {
          opacity: animatedOpacity([0, 0], [38, 0], [78, 76], [150, 44], [210, 18], [240, 0]),
          position: animatedPosition(
            [0, [-50, 568, 0]],
            [38, [-50, 568, 0]],
            [82, [84, 530, 0]],
            [154, [74, 512, 0]],
            [240, [64, 500, 0]],
          ),
          scale: animatedScale([0, [82, 82, 100]], [38, [82, 82, 100]], [82, [100, 100, 100]], [240, [100, 100, 100]]),
        },
      },
    },
  );

const pianoLayer = () =>
  shapeLayer(
    'piano silhouette',
    [
      group(
        'piano lid',
        [
          bezier(
            [
              [-52, -22],
              [18, -40],
              [64, -8],
              [44, 24],
              [-56, 24],
            ],
            [
              [0, 0],
              [-26, 4],
              [-18, -20],
              [10, -14],
              [0, 0],
            ],
            [
              [26, -10],
              [26, -4],
              [15, 14],
              [-18, 8],
              [0, 0],
            ],
            true,
          ),
          fill(css(palette.sageDeep, 0.2), 100),
          stroke(css(palette.sageDeep, 0.48), 1.3, 100),
        ],
        {},
      ),
      group('keyboard base', [rect([102, 24], 7), fill(css(palette.white, 0.52), 100), stroke(css(palette.sageDeep, 0.36), 1, 100)], {
        position: [-6, 26],
      }),
      ...Array.from({ length: 6 }, (_, index) =>
        group(`piano key ${index + 1}`, [rect([7, 22], 2), fill(css(palette.sageDeep, 0.28), 100)], {
          position: [-44 + index * 16, 27],
        }),
      ),
    ],
    {
      transform: {
        position: [302, 256, 0],
        rotation: 9,
        animated: {
          opacity: animatedOpacity([0, 0], [46, 0], [86, 68], [156, 42], [214, 18], [240, 0]),
          position: animatedPosition(
            [0, [438, 230, 0]],
            [46, [438, 230, 0]],
            [88, [302, 256, 0]],
            [156, [314, 246, 0]],
            [240, [324, 240, 0]],
          ),
          scale: animatedScale([0, [84, 84, 100]], [46, [84, 84, 100]], [88, [100, 100, 100]], [240, [100, 100, 100]]),
        },
      },
    },
  );

const hornLayer = () =>
  shapeLayer(
    'horn silhouette',
    [
      group('horn coil outer', [ellipse([72, 72]), stroke(css(palette.champagne, 0.62), 5, 100)], {}),
      group('horn coil inner', [ellipse([42, 42]), stroke(css(palette.champagne, 0.52), 3, 100)], {}),
      group(
        'horn bell',
        [
          bezier(
            [
              [34, -8],
              [84, -35],
              [88, 30],
              [36, 14],
            ],
            [
              [0, 0],
              [-16, -7],
              [12, -24],
              [18, 4],
            ],
            [
              [19, -18],
              [26, 22],
              [-20, 4],
              [0, 0],
            ],
            true,
          ),
          fill(css(palette.champagneSoft, 0.35), 100),
          stroke(css(palette.champagne, 0.62), 1.5, 100),
        ],
        {},
      ),
      group('horn mouthpipe', [path([[-70, 6], [-28, 0], [0, -4]]), stroke(css(palette.sageDeep, 0.46), 2.2, 100)], {}),
      group('horn valves', [rect([10, 24], 4), fill(css(palette.sageDeep, 0.32), 100)], { position: [-18, -32], rotation: -8 }),
      group('horn valves two', [rect([10, 22], 4), fill(css(palette.sageDeep, 0.28), 100)], { position: [0, -36], rotation: -8 }),
    ],
    {
      transform: {
        position: [296, 568, 0],
        rotation: -8,
        animated: {
          opacity: animatedOpacity([0, 0], [58, 0], [98, 70], [160, 44], [216, 18], [240, 0]),
          position: animatedPosition(
            [0, [460, 640, 0]],
            [58, [460, 640, 0]],
            [100, [296, 568, 0]],
            [160, [306, 552, 0]],
            [240, [316, 542, 0]],
          ),
          scale: animatedScale([0, [84, 84, 100]], [58, [84, 84, 100]], [100, [100, 100, 100]], [240, [100, 100, 100]]),
        },
      },
    },
  );

const titleLayers = () => [
  textLayer('app name title', '交响视界', {
    size: 45,
    color: palette.ink,
    box: [360, 74],
    font: 'NotoSerifSC-SemiBold',
    tracking: 16,
    lineHeight: 58,
    transform: {
      position: [15, 386, 0],
      animated: {
        opacity: animatedOpacity([0, 0], [78, 0], [138, 100], [210, 100], [240, 96]),
        position: animatedPosition([0, [15, 406, 0]], [78, [15, 406, 0]], [138, [15, 386, 0]], [240, [15, 384, 0]]),
      },
    },
  }),
  textLayer('app subtitle', '校园古典音乐数字展厅', {
    size: 14,
    color: palette.champagne,
    box: [360, 40],
    font: 'NotoSansSC-Regular',
    tracking: 28,
    lineHeight: 24,
    transform: {
      position: [15, 452, 0],
      animated: {
        opacity: animatedOpacity([0, 0], [98, 0], [150, 88], [218, 88], [240, 78]),
        position: animatedPosition([0, [15, 462, 0]], [98, [15, 462, 0]], [150, [15, 452, 0]], [240, [15, 450, 0]]),
      },
    },
  }),
];

const stageLayers = () => {
  const ring = (name, size, opacity, strokeWidth = 1.2) =>
    shapeLayer(
      name,
      [
        group(
          name,
          [ellipse([size, size]), fill(css(palette.white, 0.12), 100), stroke(css(palette.champagne, 0.42), strokeWidth, opacity)],
          {},
        ),
      ],
      {
        transform: {
          position: [195, 392, 0],
          animated: {
            opacity: animatedOpacity([0, 0], [176, 0], [214, opacity], [240, opacity]),
            scale: animatedScale([0, [62, 62, 100]], [176, [62, 62, 100]], [224, [100, 100, 100]], [240, [100, 100, 100]]),
          },
        },
      },
    );

  return [
    shapeLayer(
      'stage warm halo',
      [group('stage halo', [ellipse([260, 260]), fill(css(palette.white, 0.62), 100)], {})],
      {
        transform: {
          position: [195, 392, 0],
          animated: {
            opacity: animatedOpacity([0, 0], [172, 0], [218, 82], [240, 82]),
            scale: animatedScale([0, [54, 54, 100]], [172, [54, 54, 100]], [224, [100, 100, 100]], [240, [100, 100, 100]]),
          },
        },
      },
    ),
    ring('stage outer ring', 236, 70, 1.1),
    ring('stage middle ring', 178, 58, 1.05),
    ring('stage inner ring', 118, 54, 1),
    shapeLayer(
      'stage conductor mark',
      [
        group('conductor head', [ellipse([12, 12]), fill(css(palette.sageDeep, 0.72), 100)], { position: [0, -23] }),
        group('conductor body', [path([[0, -13], [0, 18]]), stroke(css(palette.sageDeep, 0.72), 4, 100)], {}),
        group('conductor arms', [path([[-22, -4], [0, 2], [22, -6]]), stroke(css(palette.sageDeep, 0.72), 4, 100)], {}),
        group('conductor legs', [path([[0, 18], [-16, 38], [0, 18], [17, 38]]), stroke(css(palette.sageDeep, 0.72), 4, 100)], {}),
      ],
      {
        transform: {
          position: [195, 392, 0],
          animated: {
            opacity: animatedOpacity([0, 0], [184, 0], [222, 100], [240, 100]),
            scale: animatedScale([0, [80, 80, 100]], [184, [80, 80, 100]], [222, [100, 100, 100]], [240, [100, 100, 100]]),
          },
        },
      },
    ),
  ];
};

const ctaLayers = () => [
  shapeLayer(
    'enter gallery pill',
    [
      group(
        'pill surface',
        [rect([214, 56], 28), fill(css(palette.sageDeep, 0.96), 100), stroke(css(palette.white, 0.18), 1, 100)],
        { position: [0, 0] },
      ),
      group(
        'play mark',
        [
          path([
            [-5, -9],
            [-5, 9],
            [10, 0],
          ], true),
          fill(css(palette.white, 0.94), 100),
        ],
        { position: [62, 0] },
      ),
    ],
    {
      transform: {
        position: [195, 690, 0],
        animated: {
          opacity: animatedOpacity([0, 0], [190, 0], [226, 100], [240, 100]),
          scale: animatedScale([0, [94, 94, 100]], [190, [94, 94, 100]], [226, [100, 100, 100]], [240, [100, 100, 100]]),
        },
      },
    },
  ),
  textLayer('enter gallery label', '进入展厅', {
    size: 18,
    color: palette.white,
    box: [150, 32],
    font: 'NotoSansSC-Medium',
    tracking: 12,
    lineHeight: 24,
    transform: {
      position: [120, 678, 0],
      animated: {
        opacity: animatedOpacity([0, 0], [194, 0], [228, 100], [240, 100]),
      },
    },
  }),
];

const reducedMotionReference = () =>
  shapeLayer(
    'reduced motion final-frame anchor',
    [
      group('invisible final anchor', [rect([2, 2]), fill(css(palette.canvas, 0.01), 100)], {
        position: [195, 392],
      }),
    ],
    { transform: { opacity: 1 } },
  );

const lottie = {
  v: '5.12.2',
  fr: FPS,
  ip: 0,
  op: FRAMES,
  w: WIDTH,
  h: HEIGHT,
  nm: 'Symphony Vision Splash - 交响视界',
  ddd: 0,
  assets: [],
  fonts: {
    list: [
      {
        fName: 'NotoSerifSC-SemiBold',
        fFamily: 'Noto Serif SC',
        fStyle: 'SemiBold',
        ascent: 88,
      },
      {
        fName: 'NotoSansSC-Regular',
        fFamily: 'Noto Sans SC',
        fStyle: 'Regular',
        ascent: 86,
      },
      {
        fName: 'NotoSansSC-Medium',
        fFamily: 'Noto Sans SC',
        fStyle: 'Medium',
        ascent: 86,
      },
    ],
  },
  markers: [
    { tm: 0, cm: 'intro_light', dr: 48 },
    { tm: 36, cm: 'note_pickup', dr: 60 },
    { tm: 78, cm: 'brand_reveal', dr: 84 },
    { tm: 180, cm: 'stage_ready', dr: 42 },
    { tm: 222, cm: 'handoff_home', dr: 18 },
  ],
  layers: [
    ...ctaLayers(),
    ...titleLayers(),
    ...stageLayers(),
    ...musicNotes(),
    hornLayer(),
    pianoLayer(),
    violinLayer(),
    glassLayer(),
    staffLayer(),
    paperTextureLayer(),
    ...backgroundLayers().reverse(),
    reducedMotionReference(),
  ],
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(lottie)}\n`, 'utf8');

console.log(`Wrote ${OUT_PATH}`);
