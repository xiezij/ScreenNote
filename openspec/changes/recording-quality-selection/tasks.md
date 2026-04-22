## 1. 状态与映射

- [x] 1.1 在 `useRecording` 或集中常量中定义高/中/低对应 `videoBitsPerSecond` 数值
- [x] 1.2 在 `src/App.vue` 中新增 `recordingQuality` 状态，并在开始录屏时传入 `startRecording`
- [x] 1.3 （可选）使用 `localStorage` 持久化 `recording-quality` 键并在启动时恢复

## 2. 界面

- [x] 2.1 在录屏相关选项区（如录屏保存格式旁）增加画质下拉或单选
- [x] 2.2 补充简短说明文案，区分三档适用场景

## 3. 验证

- [x] 3.1 三档在整幅录屏、区域录屏、VP8/VP9 下可完成录制
- [x] 3.2 对比同场景下三档文件大小或观感差异符合「高/中/低」预期
- [x] 3.3 运行 `npm run build` 通过
