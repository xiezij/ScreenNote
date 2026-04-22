## Why

录屏目前使用固定码率等参数，用户无法在「更省空间」与「更清晰」之间按场景选择。增加画质档位可降低大文件、弱机器场景下的压力，同时满足希望高清晰留档时的需求。

## What Changes

- 在界面上提供录屏**画质/预设**选择（如高 / 中 / 低，或「自动」等命名），与现有「录屏保存格式（WebM/MP4）」组合使用。
- 将所选画质映射到可观察的编码参数（至少包含目标视频码率，必要时含帧率或分辨率策略的说明边界）。
- 在「整幅录屏」与「区域录屏」两种路径上均生效，且不改变非录屏相关行为。
- 可选：将用户上次选择的画质持久化到本地，重启后恢复（若实现则写入设计）。

## Capabilities

### New Capabilities

- `recording-quality`: 用户可选择录屏画质档位，系统 SHALL 在录制时应用对应编码强度或码率策略。

### Modified Capabilities

- （无）

## Impact

- 影响代码：`src/App.vue`（或 UI 与状态）、`src/composables/useRecording.js`（`MediaRecorder` 的 `videoBitsPerSecond` 等）。
- 影响范围：仅录屏开始时的参数，保存与 MP4 转码流程保持兼容。
- 依赖变化：无新 npm 包预期。
