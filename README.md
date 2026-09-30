# 华音拓影 WebAR 一期

基于 `AR + NFC` 的高校古典音乐美育交互系统一期技术底座，当前聚焦：

- `/?entry=<entryId>` 深链入口，可用于安卓 NFC 标签和二维码；
- `MindAR + A-Frame` 的 WebAR 识别场景；
- `Web Audio API` 分轨播放、静音 / 独奏 / 总音量控制；
- `EntryManifest` 配置化内容清单，便于后续扩展到 12 乐器。

## 本地运行

```bash
npm install
npm run sync:demo-assets
npm run generate:demo-audio
npm run export:links
npm run dev
```

默认开发地址：`http://localhost:5173`

## 音乐编创 API

`/compose` 页面会把用户录制或上传的哼唱动机提交到服务端代理，再由代理调用第三方 Suno API。密钥只放在服务端环境变量中，不要写入 `VITE_*` 前端变量。

需要配置：

```bash
SUNO_API_KEY=你的第三方SunoToken
SUNO_API_BASE_URL=https://api.sunoapi.org
SUNO_UPLOAD_BASE_URL=https://sunoapiorg.redpandaai.co
PUBLIC_APP_URL=http://localhost:5173
```

默认接口路径按 `file-stream-upload -> upload-cover -> record-info` 流程实现，文件上传目录默认传 `uploadPath=audio/user-uploads`，提交生成任务时默认传 `callBackUrl=${PUBLIC_APP_URL}/api/music/callback`；如果你拿到的第三方 API 路径、上传目录或回调地址不同，可以用 `.env.example` 里的 `SUNO_UPLOAD_URL`、`SUNO_COVER_URL`、`SUNO_STATUS_URL`、`SUNO_FILE_UPLOAD_PATH`、`SUNO_CALLBACK_URL` 覆盖。前端用 Vite 开发时只负责页面预览，完整 API 流程建议用 Vercel 部署环境或 `vercel dev` 验证。

## 主要目录

- `src/data/entries.ts`：条目内容清单
- `src/lib/audio/AudioEngine.ts`：分轨音频引擎
- `src/components/ar/MindArScene.tsx`：WebAR 场景组件
- `scripts/sync-demo-assets.mjs`：同步 MindAR vendor 与示例识别资源
- `scripts/generate-links.mjs`：导出 NFC 深链和二维码
- `generated/nfc-links.json`：导出的 NFC / 二维码映射结果

## 入口策略

- 安卓：将 `generated/nfc-links.json` 中的 `nfcUrl` 写入 NFC 标签
- iPhone：使用 `generated/qrcodes/*.svg` 提供扫码入口
- 桌面：直接访问 `/?entry=violin-dialogue` 这类深链进行调试

## 当前示例

- `violin-dialogue`
- `flute-color`
- `ensemble-stage`

## 后续扩展建议

- 为每个正式文创条目替换独立的 `.mind` 识别文件与海报资源
- 将占位音频替换为真实分轨录音
- 引入正式 3D 乐手 / 乐器模型和校园场景背景
- 二期新增 12 乐器编制组合、分享页和试点数据采集

## 双簧管人物 3D / AR

- `/stage` 默认保留乐团；切换“双簧管 3D”后才下载人物模型。支持旋转、缩放、恢复视角和失败重试。
- 顶部扫描按钮、“更多舞台体验”和人物预览里的“扫描体验”均进入 `/experience/oboe-player`。
- 下载页面提供的测试卡，打印或放在第二块屏幕上，平放后扫描；点击“双簧管试听”才播放声音。
- 首版识别的是 `public/assets/markers/default-card.png`，配套识别文件为 `default-card.mind`。它不能直接识别无标记摆件。正式图案变更时必须重新编译 `.mind`。
- 模型脚底位于原点、Y 轴向上、高度为 1；AR 配置旋转 X=90°，人物高度为识别卡宽度的 0.45 倍。卡片平放时请从斜上方观察，正上方俯拍主要看到头顶。
- 人物资产与百科的纯乐器资产分开：`public/assets/models/characters/oboe/scene.mobile.glb`。原始 GLB 不改动、不打包进站点。

重新生成移动端模型（输入文件不可与输出文件相同）：

```bash
npm run prepare:oboe-player -- /absolute/path/双簧管.glb
```

生成结果约 **3.77 MB / 46,106 三角面 / 6 张 2K JPEG**，无压缩扩展、无动画。脚本保留作者署名，详细数据见同目录 `asset-report.json`。贴图转换针对本次不透明材质；其他模型需单独检查透明通道。

AR 复用本地 MindAR 1.1.5 / A-Frame，先加载识别核心再加载 A-Frame 适配层。每次扫描使用同源独立 iframe，只有该容器请求相机；关闭、导航离开或失败后销毁整个容器，释放相机、识别线程和 WebGL 上下文。模型、识别文件、权限错误均有重试入口。音频在宿主页播放，不随短暂目标丢失而中断。

正式使用要求 HTTPS；手机直接访问电脑的 HTTP 局域网地址不能作为相机验收环境。首选 iPhone Safari 与安卓 Chrome，微信内提供外部浏览器指引。此版本不接 NFC 硬件，也不提供人物演奏动画。

### 验证

```bash
npm run build
PORT=4178 npm run serve:dist
OBOE_BASE_URL=http://127.0.0.1:4178 npm run test:oboe-player
```

测试脚本需要 Playwright 和 Chrome（可用 `CHROME_EXECUTABLE` 指定路径，也支持 Codex 附带的 Playwright）。输出写入 `.runtime/oboe-qa/`，用真实 MindAR 引擎识别生成的测试卡视频，覆盖发现、丢失、重新识别、五次开关后相机释放、权限拒绝、资源失败重试、普通预览和移动布局。桌面模拟不代表手机实测通过。

手机验收仍需分别记录设备/系统/浏览器版本、网络、冷启动时间、扫描帧率，并测试斜拍、弱光、反光、遮挡、横竖屏、锁屏返回及退出后的相机指示灯；目标为交互稳定并接近 30 FPS，实测后再确认。
