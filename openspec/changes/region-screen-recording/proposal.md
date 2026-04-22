## Why

「框选区域」已用于截屏裁剪，但录屏仍始终录制整路画面源，与用户对「框了哪里就只录哪里」的直觉不一致。补齐录屏对框选区域的行为，可提升工作流一致性并减少后期裁剪成本。

## What Changes

- 当用户开启「框选区域」且已 Commit 有效矩形区域时，开始录屏应**仅录制该矩形内的画面内容**（与预览中框选语义一致），输出视频分辨率对应该区域尺寸。
- 当未开启框选、或未成功选定区域时，录屏行为保持**与现有一致**（整幅预览/流画面）。
- 在框选录屏与整幅录屏之间保持停止录屏、保存、转码等后续链路可用；必要时对性能与资源占用给出边界说明或降级策略。
- 更新界面文案或提示，避免用户误解「框选只影响截屏」。

## Capabilities

### New Capabilities

- `region-screen-recording`：在框选区域已提交的前提下，将录屏输出约束为该矩形区域，并与整幅录屏路径区分。

### Modified Capabilities

- （无）

## Impact

- 影响代码：`src/App.vue`、`src/composables/useRecording.js`（或新增/合并 composable）、可能与 `useScreenCapture.js` 或视频显示映射复用区域坐标逻辑。
- 影响范围：Electron 渲染进程录屏数据路径；不改动主进程转码/保存 IPC 合同除非需要新增参数。
- 依赖变化：无新 npm 包预期；以浏览器/ Electron 对 `MediaRecorder` 与 `canvas.captureStream` 等能力为主。
- 风险点：区域录屏的帧率、CPU 占用、与 `MediaRecorder` 码率/分辨率需验证；多显示器/高 DPI 下坐标与预览需与截屏区域逻辑一致。
