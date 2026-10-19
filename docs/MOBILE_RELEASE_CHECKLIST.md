# 华音拓影移动端 Release Candidate 真机验收

测试日期：________　测试人：________　iPhone 型号 / iOS：________
Safari 版本：________　部署 URL：________　部署 commit：________
网络（Wi-Fi / 蜂窝）：________　冷启动 / 已缓存：________

自动 QA 的 mock 生命周期通过不等于真实 iPhone 权限通过。请在候选 commit 部署后使用 Safari 完成本表；Vercel 登录页不能算业务页面加载成功。当前自动验收未调用真实 Suno。

## Safari 基础与连续主路径

- [ ] 首页卡片、全部/弦乐/木管/铜管筛选、扫码入口可操作。
- [ ] 首页试听 play → pause → resume；切换曲目旧声部停止。
- [ ] 首页播放 → 舞台 → 知识 → 乐理 → 编创 → 首页：active tab 正确，无白屏、状态错串、双重声音。
- [ ] 舞台播放 → 知识 / 编创：舞台停止；知识 flute → 首页、violin → 舞台、知识 → 编创：试听停止。
- [ ] 编创上传 → 回放 → 首页：旧动机停止；结果音频播放 → 首页：结果停止。
- [ ] 编创 queued / processing → 舞台：页面不继续轮询（Safari 远程检查 Network）。
- [ ] 竖屏、横屏、刘海、底部 Home indicator 无遮挡；没有伪造 iPhone 状态栏。
- [ ] 页面滚到底后所有操作可滚动到 BottomNav 上方；Knowledge 底部试听条不与导航重叠。
- [ ] Theory 01 → 02 回到顶部；Knowledge 滚到底 → 首页 → Knowledge 行为可接受。
- [ ] 打开系统“减弱动态效果”，核心页面不出现明显位移动画。
- [ ] VoiceOver / 外接键盘：按钮与 slider 有合理名称，focus 可见，详情 dialog 能关闭。

## Stage

- [ ] `/stage` 默认 12 人；Play 前 Network 不请求 12 条音频。
- [ ] 冷缓存首次 12 轨播放可成功，记录等待时间：________ 秒。
- [ ] pause / resume 保留进度；seek 正确；回到开头正确。
- [ ] `/stage?lineup=violin,cello`：播放中移除 violin、加入 flute；时钟不中断，新声部从当前进度加入。
- [ ] 琴台 → 青年园 → 排练厅 → 体育馆：palette / label 变化，阵容与音频进度不重置。
- [ ] 全屏按钮在支持时可进入/退出；不支持的 Safari 不应有失效入口。
- [ ] 点击 Play 后立即返回首页（音频尚在加载/恢复）：等待 10 秒仍无幽灵音频。

## Camera / WebAR

- [ ] 首次允许相机：Stage 出现实时后置画面。
- [ ] 拒绝权限：提示明确，音乐舞台仍可使用。
- [ ] 关闭后第二次打开可用；权限拒绝后去 Safari 设置允许并重试。
- [ ] 相机已开启 → 首页：系统摄像头指示灯关闭。
- [ ] 相机权限弹窗未返回时离开，再允许：不能遗留 stream 或重新打开旧页面。
- [ ] `/experience/violin-dialogue`、flute-color、ensemble-stage 可打开并返回展签。
- [ ] 启动真实 MindAR，扫描实际识别图，检查视频、模型位置、识别/丢失/重新识别。
- [ ] AR 退出、返回、二次进入后无相机占用；摄像头指示灯关闭。

## Compose microphone

- [ ] 允许麦克风 → 录制 5–30 秒 → 停止 → 回放，时长与声音正确。
- [ ] 拒绝权限有清晰提示，上传音频仍可用；授权后重试正常。
- [ ] 重新录音、替换上传、回放 pause / resume / seek 正常。
- [ ] 回放中开始录音，旧动机先暂停；对比耳机/外放是否串音。
- [ ] 真正 recording 状态 → 首页：录音停止，麦克风指示灯关闭。
- [ ] 请求授权、正在保存录音时分别离开：无晚到回调覆盖新页面，无 stream 残留。
- [ ] 录音格式可在当前 Safari 播放并上传；30MB 限制和错误提示正常。
- [ ] 多条结果原生播放器允许同页同时播放（已知行为）；确认现场展示可接受。
- [ ] 如需真实 Suno 验收，手动提交一项经授权的测试，核对 queued/processing/complete、结果回放与额度；不要把 mock 通过当成真实服务通过。

## Soft keyboard

- [ ] Prompt focus 后整个输入区可滚动至键盘与 BottomNav 上方。
- [ ] Style、Title、Negative tags 分别输入、选词、删除、多行编辑无遮挡。
- [ ] 键盘收起后布局恢复，无突然横向滚动、放大锁定或底部空白。
- [ ] 表单长内容、较大系统字号下仍可提交。

## 3D

- [ ] Violin detail 打开前无 GLB 请求；点击“查看 3D 模型”后加载。
- [ ] 拖动旋转、缩放（如支持）、滚动无冲突；加载失败提示合理。
- [ ] 离开模型页后交互正常，Safari 没有 reload / 内存回收白屏。

## NFC / QR / Legacy / Deep refresh

- [ ] 实体 NFC / QR（如有）：scan → 正确 deep link → lineup → camera。
- [ ] `/stage?source=nfc` 为 0 人；`/stage?source=nfc&lineup=violin,cello` 为 2 人。
- [ ] `/entry/violin-dialogue`、`/entry/flute-color`、`/entry/ensemble-stage` 的 query 来源与返回路径正确。
- [ ] `/demo/base` 落子、播放与 camera 正常；`/learn/fundamentals` 仍可浏览。
- [ ] 在真实部署地址直接打开并刷新下列路径，无 Vercel 404：
  `/stage`、`/knowledge/instruments`、`/knowledge/instruments/violin?section=strings`、`/knowledge/theory/02`、`/compose`、`/demo/base`、`/entry/violin-dialogue`、`/experience/violin-dialogue`、`/learn/fundamentals`。
- [ ] `/this-route-does-not-exist` 显示项目 NotFound；失效 `/assets/...` 仍是真正资源失败，API 未被 SPA rewrite 吞掉。

## 性能与现场持续运行

- [ ] 首页/舞台/知识/编创是否明显卡顿：________。
- [ ] 慢网下首次 Play 等待是否可接受；加载中切页不继续播放。
- [ ] 12 轨连续播放 10–20 分钟：发热、电量、音画同步：________。
- [ ] 3D 多次进入退出后 Safari 是否 reload：________。
- [ ] Compose 长短录音、停止/回放、上传是否稳定：________。
- [ ] 锁屏、切后台、切回、来电/音频打断后行为：________。
- [ ] 连续走完整主路径至少三次，无残留 camera、mic、音频或 polling。

发布判定：自动回归 0 failed + 当前 commit 线上刷新验证 + 真实 iPhone 必测项通过。
阻塞项 / 复现步骤：________________________________________________。
