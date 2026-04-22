## 1. 录屏启动分支与数据路径

- [x] 1.1 在 `src/App.vue`（或 composable）中根据 `regionMode` 与 `committedRegion` 区分整幅录屏与区域录屏
- [x] 1.2 实现基于 canvas 的区域画面抽取与 `captureStream` 的录制输入流
- [x] 1.3 保证区域坐标与现有截屏/区域叠加使用同一套 `committedRegion` 语义

## 2. 生命周期与清理

- [x] 2.1 停止录屏时停止 `MediaRecorder` 并结束区域绘制的 rAF/定时器
- [x] 2.2 停止后停止并释放 `canvas` 与 `captureStream` 的 track，不破坏主预览 `video` 流

## 3. 交互与体验

- [x] 3.1 在框选开启但未选区时，对「开始录屏」与截屏选区要求保持一致（提示或禁止）
- [x] 3.2 视需要增加简短说明文案：框选时录屏仅录框内

## 4. 验证

- [x] 4.1 整幅录屏、区域录屏、未选区框选、MP4/WebM 保存路径手测
- [x] 4.2 多次开始/停止区域录屏无卡顿或流残留
