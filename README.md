# 华音拓影 WebAR 一期

基于 `AR + NFC` 的高校古典音乐美育交互系统一期技术底座，当前聚焦：

- `/?entry=<entryId>` 深链入口，可用于安卓 NFC 标签和二维码；
- 新版舞台内 `8thwall` 空间 AR，以及独立 `MindAR + A-Frame` 识别卡测试；
- 按需分段加载的 `Web Audio API` 同步分轨播放，以及渐进式单轨试听；
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

## 新版界面、加载优化与双簧管 AR

`/knowledge/guide` 提供全部 7 个乐理章节和 12 件乐器入口。旧导览、旧舞台与原体验链接自动进入新版；NFC / QR 的阵容、场景和来源参数保留。

`/stage` 内可切换“双簧管 3D”或“实景 AR”，识别卡位于“更多舞台体验”。双簧管移动模型约 1.84 MB；12 声部先准备约 8 秒，再滚动加载。进入 AR 暂停合奏，关闭后保留舞台进度，手动继续播放。

开发和构建会自动同步空间引擎及许可证。手机相机体验需要 HTTPS。**空间位置稳定性仍待 iPhone Safari / 安卓 Chrome 真机验收，桌面模拟不能替代。**

实现细节、测试命令、性能记录与真机验收项见 [新版与 AR 实施说明](docs/MOBILE_AR_OPTIMIZATION.md)。原人物归一化脚本仍可用：`npm run prepare:oboe-player -- /absolute/path/双簧管.glb`，之后运行 `FFMPEG=/path/to/ffmpeg npm run prepare:mobile-assets` 更新发布资源。
