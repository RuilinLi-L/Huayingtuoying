# 移动发布验收：修改前功能地图

基线：`521151ad74f6719ff62c6e7cf49fdaabd998e602`，分支 `codex/mobile-ui-v1`。
已完整检查请求指定的 Router、layout、页面、会话 hook、AudioEngine、NFC、Compose API、device、package 和 Vercel 配置，及其资源持有组件。附件视频仅作为用户提供的素材，本次验收范围以文字请求为准。

| 路径 | 入口 / 共享资源 | 生命周期边界 |
| --- | --- | --- |
| `/` | MobileShell / TopBar / BottomNav；Experience cards；SymphonyList 独立 AudioEngine | 列表卸载 dispose；筛选隐藏当前曲目时 stop；切换 preview 使用同一 engine |
| `/stage` | useOrchestraSession / AudioEngine；12 条 stage-mobile stems；NFC mock/reserved adapters；相机 stream；200ms 时钟 | hook 卸载 dispose、unsubscribe、disconnect、clearInterval、tracks.stop；晚到的相机 stream 检查 mounted；禁用预加载 |
| `/knowledge/instruments`、详情 | 壳层 KnowledgeAudioProvider 的单个 HTMLAudio；声部 query；懒加载 InstrumentModelViewer | 跨知识路径按乐器保留或停止，离开知识 stop；provider 卸载清 src；点击 3D 才加载 GLB |
| `/knowledge/theory/:id` | 同一壳层、章节数据、TheoryDial | 章节改变 scroll top；停止乐器试听；无相机/麦克风 |
| `/compose` | useComposeRecorder；ComposeAudioPreview；ObjectURL；AbortController；5 秒 polling；结果原生 audio | 页面卸载 abort / revoke；hook 卸载 stop recorder / tracks；试听组件暂停；结果播放器依赖原生 DOM 移除行为，需实际验证 |
| `/entry/:id` | Legacy AppShell；展签 manifest / QR；NFC、QR deep links | 无主动音频/相机；query 决定体验入口来源和 autostart |
| `/experience/:id` | Legacy AppShell；独立 AudioEngine；device 相机预检；MindArScene / placeholder | 音频卸载 dispose；预检 stream 立即 stop；MindAR 停止系统/视频/timers/listeners；真实追踪需真机 |
| `/demo/base` | Legacy AppShell；同一 useOrchestraSession | 默认空阵容、原 mobile stems / 预加载；沿用相同资源释放 |
| `/learn/fundamentals` | Legacy AppShell；知识数据、InstrumentModelViewer、原生 audio | 保留原导学行为，模型立即加载；仅移动新版详情使用按需 3D |
| 未知路由 | React Router `*` → NotFound | 原 Vercel 配置仅枚举已知路径，缺未知页面 rewrite，须单独验证 |

MobileShell main 以 pathname 为 key；Knowledge provider 位于 main 外；query 变化不重挂载 main。AudioEngine 实例互不共享，但实现被 Home / Stage / Experience 复用。API `/api/music/*` 只应在提交后请求，验收全部拦截。已有专项脚本保留，重新运行结果另存 release-qa 子目录。
