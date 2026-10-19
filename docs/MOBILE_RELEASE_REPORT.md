# 移动端发布验收报告

分支：`codex/mobile-ui-v1`。基线：`521151ad74f6719ff62c6e7cf49fdaabd998e602`。
本报告与修复、脚本、截图统一进入一个收口 commit。QA JSON 的 localHeadAtTest 表示测试启动时的基线 HEAD，workingTreeDiff 表示测试时尚未提交的修复；不把基线 SHA 冒充修复后部署 SHA。

## 结论与边界

完整主路径已用真实 Chromium Web Audio / HTMLAudio 和 mock camera、MediaRecorder、Compose API 验收。没有新增模块、依赖或大规模 UI 改造。可作为待真机与新部署复核的 Release Candidate；真实 iPhone / WebAR / NFC 与修复后 Vercel 部署仍须完成 checklist，不能把自动化通过视作这些项目通过。

## 修复

1. **P1：Stage 恢复音频期间离开页面仍会启动旧 12 轨。** 延迟 `AudioContext.resume()` → Stage 切 Home → resolve 旧 promise，基线实际留下 12 个活动 AudioBufferSource。`useOrchestraSession` 在 `init` 与 `setActiveStems` 两个 await 之后检查 mounted 和 engine identity，阻止旧会话继续。修复前/后证据见 `screenshots/release-qa/regression-evidence.json`。Stage 与 Legacy Demo 共用此 hook。
2. **P1：未知 deep link 返回 Vercel 404。** 生产别名 `/this-route-does-not-exist` 实际返回 404 / `404: NOT_FOUND`。仅在 vercel.json 末尾追加排除 `/api`、`/assets` 的 SPA fallback，保留既有 headers / rewrites。新配置已静态验证、本地项目 NotFound 已实测；修复后的线上行为须部署后重验。

业务逻辑：仅共享 Stage 会话的异步播放生命周期发生修改。**AudioEngine、NFC 协议与 query 解析、Music Compose API/后端、AR 实现均未修改。** Compose result 的同页多播放器行为保留。

## 自动验收结果

| 套件 | Passed | Failed | Warnings |
| --- | ---: | ---: | --- |
| Release | 68 | 0 | 3 类，见下文 |
| Knowledge | 58 | 0 | 见专项 JSON |
| Compose | 29 | 0 | 见专项 JSON |
| 原生产版本 smoke | 20 | 0 | 2 类，见线上 JSON |

Release warnings：
- Compose 同页两个 result audio 可同时播放（实测）；本阶段按要求保留原生 controls。
- 11 navigation / playback-aborted requests retained in diagnostics (ERR_ABORTED).
- 模拟 camera / MediaRecorder 生命周期通过不等于真实 iPhone 权限通过；Experience 仅页面加载 smoke，未认证 WebAR 追踪。

- 320 / 360 / 393 / 430 × 852：Home、Stage、Knowledge、Theory、Compose，检查 horizontal overflow、BottomNav active、末端操作可滚动到导航上方、fixed preview 与 nav 不碰撞。
- 393 × 852 五张基准截图已人工查看；没有发现需要修改的明显遮挡或不可读文字。横向 Experience rail 是有意的容器滚动。
- 首页 cards / filters / scan / play-pause-resume / 切 preview；Stage 12 轨同一 scheduledTime、pause-resume、seek、restart、动态 lineup 当前 offset 加入、移除后停止；四场景 palette 和 label 改变但时钟/阵容保留；Chromium 全屏通过。
- Stage NFC query 分别 12 / 0 / 2 人；opened 和 late permission camera 均验证 tracks ended。
- Knowledge 单实例、懒 3D 继续有效；GLB 在明确点击前为 0，请求后成功。Theory 01 → 02 回顶保留。
- Compose queued / processing / pending response 均验证 abort 与超过一个 5 秒轮询周期后无新 status 请求；真正 recording 中切页验证 recorder.stop 与所有 tracks.stop。
- 资源审计覆盖 manifest / instrument / orchestra / theory catalog 及 glTF buffers、textures 的 dist 存在性和 HTTP 非 HTML 内容；实际业务请求同时监听 HTTP >=400。
- Home 首屏无 Stage 音轨、GLB/MindAR/AR、Compose API；Stage Play 前无音频；Compose 未提交无 API。
- 核心页面无 button 嵌套 / link 嵌 button；键盘 focus、dialog Tab/Escape、reduced-motion smoke 通过。保留现有 safe-area env，真实 inset 与软键盘列手动；缩小为 393 × 480 后四个 Compose 输入均可滚动至 nav 上方。
- 没有新增 title 框架，保留 `华音拓影 · NFC + WebAR 古典音乐美育系统`。无单独 Stage QA 脚本，Stage 回归由 Release QA 覆盖。

## 跨页面生命周期

| 路径 | 结果 / 证据 |
| --- | --- |
| Home audio → Stage | 旧 source 停止，旧 AudioContext closed；Stage 可启动独立 12 轨 |
| Stage audio → Knowledge / Compose | 12 个 source 停止，全部旧 contexts closed |
| Knowledge audio → Home / Stage / Compose | HTMLAudio paused，无活动旧音频；Stage 可正常开始 |
| Compose preview → Home | 原生 audio paused、ObjectURL revoke、无活动残留 |
| Compose result audio → Home | 两条原生结果音频都停止 |
| Compose polling → Stage | AbortSignal aborted；5.5 秒内无新增 status 请求 |
| Camera → Home | 模拟打开和晚到 stream 的所有 tracks ended |
| Mic recording → Home | 确认先进入 recording；recorder inactive 且 stop 一次；tracks ended |

同时观察所有已播放 HTMLAudio 与 AudioContext source，跨业务音频并发采样为 0。Compose 同页两个结果 `<audio controls>` **实测可同时播放**，按本阶段范围保留并记录；未扩展统一播放器。

## 实际 deep link / refresh

以下路径均在 `http://127.0.0.1:4173` 构建产物和 `https://huayingtuoying.vercel.app` 原生产版本直接打开并刷新：

- `/stage`
- `/knowledge/instruments`
- `/knowledge/instruments/violin?section=strings`
- `/knowledge/theory/02`
- `/compose`
- `/demo/base`
- `/entry/violin-dialogue`
- `/entry/flute-color`
- `/entry/ensemble-stage`
- `/experience/violin-dialogue`
- `/experience/flute-color`
- `/experience/ensemble-stage`
- `/learn/fundamentals`

另实际访问 `/`、`/knowledge/theory/01` 并完成 Home → Stage → Knowledge → Compose → Home 线上导航。未知路由本地已进入项目 NotFound；生产旧版未知路由 404 证据保留在 `production-alias-probe.json`。

## Vercel 版本区分

GitHub deployment statuses 给出基线 Preview `huayingtuoying-qnf60zr2z-ruilinli-ls-projects.vercel.app` 与 main Production `huayingtuoying-hayfdyzis-ruilinli-ls-projects.vercel.app`；二者实际均跳转 **Login – Vercel**，不能计为业务验收通过。

可访问生产别名 `https://huayingtuoying.vercel.app` 实测 20 passed / 0 failed（核心 393 布局、13 条 deep refresh、连续导航、无非预期错误）。加载的 `index-CCGJB4RJ.js` / `index-DaTbZBWE.css` 与本地基线构建一致；GitHub main 部署 `771de5c8b7abff7f5a77659344c4c04000de9fbf` 与 `521151a` 文件树无差异。**这是原生产版本测试，不是本次收口 commit 的部署测试。** 本次仅提交到本地分支，未推送、未发布；新 commit 的线上刷新和未知路径修复尚未测试。

## 资源体积

| 目录 | 总大小 MiB | 文件数 |
| --- | ---: | ---: |
| public/assets/ui | 10.21 | 60 |
| public/assets/audio | 208.30 | 45 |
| public/assets/models | 263.94 | 32 |
| dist/assets | 289.60 | 1145 |

Public Top 10 最大资源：

| 文件 | MiB |
| --- | ---: |
| public/assets/models/violin/scene.glb | 57.70 |
| public/assets/models/viola/scene.glb | 27.40 |
| public/assets/models/oboe/scene.glb | 26.86 |
| public/assets/models/bass/scene.glb | 23.20 |
| public/assets/models/trombone/scene.glb | 23.17 |
| public/assets/models/cello/scene.glb | 16.63 |
| public/assets/models/bassoon/scene.glb | 15.50 |
| public/assets/models/flute/scene.glb | 14.18 |
| public/assets/models/horn/scene.glb | 12.65 |
| public/assets/audio/The Sleeping Beauty Waltz/Bass_睡美人圆舞曲.mp3 | 11.22 |


单位 MiB（1024² 字节），各目录 Top 20 与完整请求清单保存在 Release QA JSON。public/models 最大的原始 GLB 已由现有 prune 脚本排除于 dist；不应把 public 总量当成首屏下载量。音频包含原始、mobile、stage-mobile 与 fixture，未在本阶段强行重压缩。

## 日志分类与已知限制

- pageerror / console.error / 非预期 HTTP >=400 / 非预期 requestfailed：以最终 Release JSON 为准，均要求 0。
- `ERR_ABORTED` 仅对音频卸载/替换、blob revoke 与明确 pending-status 取消场景分类为预期，原始 URL / case / 错误全部保留；其他失败不忽略。
- 构建仍提示 lazy InstrumentModelViewer JS 约 645 kB（gzip 166 kB），保持按需加载；未为消除 warning 引入重构。
- 真实 iPhone Safari microphone、camera、WebAR、实体 NFC、真实 Suno、长时间后台/锁屏/发热未自动认证。Experience 只页面加载与返回 smoke；没有以 mock 宣称 MindAR 识别通过。
- Chrome 视口压缩只能验证可滚动空间，不能认证 iOS 键盘、刘海 inset 和权限提示行为。

## 文件与复跑

- 新脚本 `scripts/mobile-release-qa.mjs`；旧 Knowledge / Compose 脚本未改。
- 主报告 `screenshots/release-qa/qa-report.json`；专项结果分别在 `knowledge/qa-report.json`、`compose/qa-report.json`；线上结果在 `production/qa-report.json`。
- 最终图片：`release-home-393.png`、`release-stage-393.png`、`release-knowledge-393.png`、`release-theory-393.png`、`release-compose-393.png`。
- 原有 `screenshots/stage-*`、`knowledge-phase-3/`、`compose-phase-4/` 完整保留。
- iPhone 操作清单：`docs/MOBILE_RELEASE_CHECKLIST.md`。

本机 shell 无 npm，使用工作区 Node 分别执行 build 与 check 等价序列：`tsc -b && vite build && node scripts/prune-dist-assets.mjs`；package.json 中 check 正是再次执行 build。两次最终构建均通过。没有安装新的依赖。

在正常 Node/npm 环境复跑：

```sh
npm run build
npm run check
npm run serve:dist
# 在另一个终端运行：
RELEASE_BASE_URL=http://127.0.0.1:4173 node scripts/mobile-release-qa.mjs
KNOWLEDGE_BASE_URL=http://127.0.0.1:4173 KNOWLEDGE_SCREENSHOT_DIR=screenshots/release-qa/knowledge node scripts/knowledge-mobile-qa.mjs
COMPOSE_BASE_URL=http://127.0.0.1:4173 COMPOSE_SCREENSHOT_DIR=screenshots/release-qa/compose node scripts/compose-mobile-qa.mjs
```

只跑线上只读页面与导航 smoke（API 仍全部 mock）：

```sh
RELEASE_BASE_URL=https://YOUR-DEPLOYMENT RELEASE_SMOKE_ONLY=1 RELEASE_FILTER='393px|deep link|Home → Stage' RELEASE_SCREENSHOT_DIR=screenshots/release-qa/production node scripts/mobile-release-qa.mjs
```
