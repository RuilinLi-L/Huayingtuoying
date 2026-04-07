# 底座 Demo 与 NFC 接口说明

## 1. 当前 Demo 入口

- 首页：`/`
- 底座演示页：`/demo/base`

当前底座 Demo 已统一接入《睡美人圆舞曲》12 条分轨，支持通过查询参数直接进入预设组合：

```text
/demo/base?lineup=violin,viola,cello,bass
```

也支持模拟 NFC 入口直达：

```text
/demo/base?source=nfc&autostart=1&lineup=flute,clarinet,oboe,bassoon,horn
```

兼容说明：

- 旧参数 `double-bass` 仍可被识别，并会在内部归一化为 `bass`
- 文件名中的 `Trumbone` 在代码层统一按 `trombone` / `长号` 处理

## 2. 当前已实现的玩法结构

- 单人独奏：放置 1 位演奏家，进入单人高亮模式
- 自由组合：放置 2 位及以上但不满足固定编制规则时，进入创意探索模式
- 提琴家族四件套：小提琴、中提琴、大提琴、低音提琴（Bass）全部在场时解锁
- 木管五重奏：长笛、单簧管、双簧管、巴松、圆号全部在场时解锁
- 全员合奏：集齐 12 位演奏家时解锁

## 3. 这版 Demo 的实现边界

- 已有：相机背景、虚拟舞台、12 位演奏家落子、分轨同步播放、场景切换、数字名片、百科占位和 NFC mock 适配器
- 暂未接入：真实 NFC 读卡、真实视觉锚定、真实 3D 乐手模型和正式百科内容

## 4. NFC 预留接口

当前页面不是把 NFC 逻辑写死在组件里，而是通过适配器接口接入：

```ts
interface NfcSessionAdapter {
  connect(): Promise<void>
  disconnect(): void
  getSnapshot(): Promise<NfcSessionSnapshot>
  subscribe(listener): () => void
}
```

当前仓库中已有两种实现：

- `createMockNfcSessionAdapter`：用于前端演示和玩法联调
- `createReservedNfcSessionAdapter`：用于保留未来真实硬件接入位

相关文件：

- `src/lib/nfcSession.ts`
- `src/pages/OrchestraDemoPage.tsx`

## 5. 后续接真实硬件时怎么改

1. 保留现有页面和玩法规则不变。
2. 新增真实 `NfcSessionAdapter` 实现。
3. 把硬件读到的演奏家 ID 列表转成 `NfcSessionSnapshot`。
4. 用真实适配器替换页面里的 mock 适配器。

这样可以避免把“硬件接入”和“玩法页面”耦合在一起。
