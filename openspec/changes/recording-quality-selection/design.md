## Context

`useRecording` 中 `startRecording` 已支持通过 `options.videoBitsPerSecond` 传入码率（默认 2500000）。本变更新增用户可选画质档位，将档位映射为不同 `videoBitsPerSecond`（及可选的文档化边界），在 App 层持久化偏好。

## Goals / Non-Goals

**Goals:**

- 提供至少三档可区分画质的录屏选项，变更档位后**下一次开始录屏**即生效（无需重启应用）。
- 映射关系集中定义，便于调参与文档化。
- 与 VP8/VP9 预设、MP4 转码链路兼容（转码前 WebM 质量由录制码率决定）。

**Non-Goals:**

- 不在首版要求独立调节分辨率或自定义码率数字输入（可作为后续增强）。
- 不强制改变 FFmpeg 转码参数，除非为修复兼容性另有变更。

## Decisions

- 决策 1：以 `videoBitsPerSecond` 为主杠杆区分画质。  
  - 方案 A（采用）：高/中/低三档 + 明确 bps 常量表。  
  - 方案 B：仅改 `preset` 字符串。  
  - 理由：MediaRecorder 在 Chromium/Electron 下码率对体积与观感影响更直接、可测。

- 决策 2：状态存放于 `ref` + `localStorage`（键名如 `recording-quality`），在 `onMounted` 恢复，与录屏格式选择并列于设置区。

- 决策 3：档位命名对用户展示为「画质：高/中/低」或业务化文案，内部枚举使用 `high|mid|low` 或 `1|2|3`。

- 决策 4：区域录屏与整幅录屏共用同一 `startRecording` 参数路径，不单独设「区域更省流」子策略（首版简单一致）。

## Risks / Trade-offs

- [风险] 机器/源差异导致实际码率与标称有偏差 → [缓解] 文档说明为「目标码率」。
- [权衡] 高码率文件更大 → [收益] 由用户显式选择承担。

## Migration Plan

1. 增加 UI 与状态、持久化。  
2. 在 `toggleRecording` 调用 `startRecording` 时传入 `videoBitsPerSecond`。  
3. 手测三档在区域/整幅、WebM/MP4 下均可完成录制与保存。  

## Open Questions

- 是否需要在界面上以 KB/s 或 Mbps 展示当前档位的大致码率（可选）。
