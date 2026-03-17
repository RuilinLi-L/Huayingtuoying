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

## 主要目录

- `src/data/entries.json`：条目内容清单
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
