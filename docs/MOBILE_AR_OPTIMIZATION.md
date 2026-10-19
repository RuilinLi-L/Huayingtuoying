# 新版入口、分段音频与空间 AR

本轮代码实现完成；iPhone Safari / 安卓 Chrome 的空间稳定性仍待 HTTPS 真机验收。桌面模拟结果不能证明真实平面识别、传感器授权或绕行定位稳定。

## 页面与兼容

| 入口 | 当前行为 |
| --- | --- |
| `/knowledge/guide` | 7 个乐理章节、12 件乐器的轻量目录 |
| `/knowledge/theory/01` 至 `/07` | 按章复用原知识卡内容 |
| `/learn/fundamentals#章节ID` | 替换历史记录并进入相应新章节；乐器锚点进入乐器目录 |
| `/demo/base` | 新版舞台，未指定阵容时保留原来的空阵容默认值 |
| `/experience/oboe-player` | 舞台内实景 AR |
| 其他有效 `/experience/:entryId` | 舞台内对应识别卡测试 |
| `/?entry=...`、`/home?...`、展签、QR / NFC | 保留条目、阵容、场景、来源和高亮参数 |

正式路由只挂载 MobileShell。旧页面源文件留在仓库供参考，不再打包到正式路由。舞台保留阵容选择、数字名片、场景、进度、独奏、音量和底座 payload 查看。

AR 使用舞台 URL 的 `view=ar`，识别卡为 `view=image-test`。舞台会话保持挂载；进入体验立即暂停合奏，关闭后保留进度、阵容和场景，由用户恢复播放。顶部返回和关闭按钮共用舞台返回语义；浏览器返回也销毁当前相机容器。

## 音频

- 12 个声部保留完整约 294.024 秒。原 MP3 经 FFmpeg 解码后按相同采样边界切片，44.1 kHz、双声道、16 bit FLAC；每段 8 秒，最后一段按实际长度截取。
- 首次每声部下载一段，共 4,014,813 字节；加清单约 4.06 MB。以前要下载约 17.65 MB 的整曲音轨并全部解码。
- 清单记录 `startFrame`、`frameCount`、`trimStartFrames`、采样率和字节数。FLAC 没有编码预延迟，当前 trim 为 0。独立解码后按统一 AudioContext 时钟安排播放，已验证相邻节点时间边界连续。
- 后续滚动加载约 12 秒前方内容，回收窗口外 PCM。所有活跃声部共用可播放边界；缓冲不足时同步暂停，有明确提示。拖动先加载目标位置；新增声部先保持当前进度并缓冲，再统一加入。
- 切换、暂停和离开页面中止过期下载；迟到的结果不会启动播放。加载失败可以再次点击播放重试。
- `AudioStem.segmentManifest` 是可选字段，原单文件接口仍由 FullFileAudioEngine 兼容。首页、百科和 AR 单声部试听使用原生渐进式 HTMLAudio。

## 3D 与 AR

- 双簧管人物发布模型为 **1,837,172 字节（1.84 MB）**，原移动版约 3.78 MB；保留原素材、署名、静态姿态、脚底原点及 Y 轴朝上。
- 模型和音频用版本化 URL。普通页面不预取音频、GLB 或追踪运行时；仅进入 3D 或相机体验时请求相应内容。
- `npm run dev` / `build` 将锁定的 `@8thwall/engine-binary@1.0.0` 复制到 `/vendor/8thwall-1.0.0/`，保留原始文件内容及 LICENSE。运行时仅加载 `slam`，发布目录去掉未用的 face / sky 资源。页面显示作者和许可链接。
- `/ar/world.html` 独占空间追踪；`/ar/scene.html` 独占 MindAR 卡片追踪。模式切换先释放旧容器的相机，再创建新容器；容器销毁同时清理线程和 WebGL 上下文。
- 空间放置使用 XR8 的相机姿态和真实世界特征点，拟合附近有足够面积的水平区域，排除稀疏、低置信度和共线墙面点；稳定后允许点击放置。没有使用任意高度的固定虚拟地板作为兜底。
- 支持缩放、旋转、重新放置；追踪丢失隐藏人物并提示，恢复后保留会话位置。桌面或地面太光滑、光线太暗、缺少纹理时可能不能拟合平面，可重新寻找或使用普通 3D。
- 模型下载进度、解析、引擎准备、授权、找平面、已放置、追踪丢失均有独立状态。SDK 与模型并行准备；SLAM 加载完成后才启用相机授权按钮。
- 页面隐藏时销毁相机容器；返回后用户手动重启并重新放置。不保留跨打开的位置，不提供现实物体遮挡或演奏动画。

官方依据：[引擎加载与 SLAM 模块](https://8thwall.org/docs/engine/overview)、[世界坐标和特征点配置](https://8thwall.org/docs/api/engine/xrcontroller/configure)、[追踪状态与世界点输出](https://8thwall.org/docs/api/engine/xrcontroller/pipelinemodule)、[发行包及许可](https://github.com/8thwall/engine)。

## 复现

已生成的移动资源在仓库中，正常运行不需要重新转码：

```sh
npm install
npm run dev
# 或发布构建
npm run build
PORT=4190 npm run serve:dist
```

更换原模型或音轨后再生成资源（需要 FFmpeg）：

```sh
FFMPEG=/path/to/ffmpeg npm run prepare:mobile-assets
npm run build
```

`src/data/mediaAssets.json` 是生成的资源索引。`prepare-mobile-assets.mjs` 保留原素材；`prune-dist-assets.mjs` 只在 dist 排除未引用原稿、旧音轨和重复衍生资源。空间引擎由安装依赖生成，不重复提交 vendor 文件。

测试需要 Playwright + Chrome；脚本支持 `CHROME_EXECUTABLE` 和项目安装的 Playwright，也能使用 Codex bundled runtime：

```sh
QA_BASE_URL=http://127.0.0.1:4190 npm run test:mobile-optimization
QA_BASE_URL=http://127.0.0.1:4190 node scripts/world-ar-qa.mjs
OBOE_BASE_URL=http://127.0.0.1:4190 npm run test:oboe-player
COMPOSE_BASE_URL=http://127.0.0.1:4190 node scripts/compose-mobile-qa.mjs
QA_BASE_URL=http://127.0.0.1:4190 npm run test:mobile-performance
FFMPEG=/path/to/ffmpeg node scripts/audio-assets-qa.mjs
```

浏览器结果、截图、基线与性能数据写入 `.runtime/optimization-qa/`；识别卡结果在 `.runtime/oboe-qa/`。编曲回归的第三方 API 全部使用本地模拟，没有提交真实生成任务。

## 固定网络性能记录

本机桌面 Chrome，393 × 852 视口，冷缓存，10 Mbps / 150 ms，CPU 4 倍降速。新版每项 3 次，表内为中位数；基线为改造前单次记录。计时从用户点击开始；音频记录 12 声部完成首轮同步调度，设备音频输出延迟未计入。AR 截止引擎、SLAM 和模型全部就绪，授权等待和寻找平面另外记录。

| 项目 | 改造前 | 新版中位数 | 新版范围 | 初步目标 |
| --- | ---: | ---: | ---: | ---: |
| 12 声部首播准备 | 17.55 秒 | 3.91 秒 | 3.91–4.04 秒 | ≤4 秒，单次仍略超 |
| 双簧管人物 3D 可见 | 未记录同口径基线 | 2.81 秒 | 2.81–2.82 秒 | ≤5 秒 |
| 小提琴百科 3D 可见 | 8.76 秒 | 4.81 秒 | 4.81–4.84 秒 | 对照项 |
| 空间 AR 资源准备 | 未实现 | 8.83 秒 | 8.83–8.84 秒 | ≤10 秒 |

首播音频网络量从约 17.65 MB 降至约 4.06 MB。音频目标接近达成，不能宣称所有网络或手机都稳定小于 4 秒。原始记录：`.runtime/optimization-qa/baseline.json`、`performance.json`。

## 验收边界

已通过：构建和类型检查；7 组新版入口/懒加载/音频浏览器回归；音频调度与平面拟合单元检查；12 条整曲 FLAC 拼接后解码 PCM 与原曲逐字节哈希相同；4 组空间 AR 生命周期模拟；真实 MindAR 测试视频的识别/丢失/重新识别、五次开关、权限拒绝和失败重试；编曲页 29 项回归。

空间 AR 自动化使用真实浏览器相机流和确定性的模拟 SDK 姿态。实际 SDK 的下载、只加载 SLAM 和资源就绪另有浏览器检查。必须补做的真机验收：

1. HTTPS 下 iPhone Safari、安卓 Chrome 分别授权相机和运动传感器，在有纹理的桌面和地面各放置一次。
2. 绕行、前后移动、旋转屏幕、缩放、重新放置，检查脚底贴合、位置漂移和追踪恢复。
3. 拒绝授权、慢网、资源失败、暗光/光滑平面、锁屏返回、连续五次开关，确认相机指示灯关闭、没有残留声音。
4. 实机试听 12 声部跨片段是否有可闻断音，检查拖动、增减乐手；记录实际首次起播、模型可见和 AR 资源准备时间。授权等待和寻找平面的耗时单列。

浏览器模拟没有验证手机传感器或真实空间锚定质量，不应据此宣称双端 AR 已验收通过。
