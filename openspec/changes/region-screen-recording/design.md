## Context

当前录屏对 `HTMLVideoElement` 的 `srcObject`（桌面捕获流）整路录制；截屏已支持通过 `committedRegion` 在 canvas 上裁剪。本变更要求框选且已 Commit 时，录屏仅包含该区域像素，与截屏几何语义一致。

## Goals / Non-Goals

**Goals:**

- 框选模式开启且存在有效 `committedRegion` 时，录屏输出仅包含区域内画面，视频尺寸与区域一致（或经明确缩放策略后一致）。
- 无框选或未 Commit 时，行为与现版全画面录屏一致。
- 停止录屏时正确释放为区域录制创建的额外资源（如 canvas stream、动画帧循环）。

**Non-Goals:**

- 不新增系统级「仅录屏某应用窗口内子区域」的独立 API；仍以预览视频坐标系为准。
- 不强制在第一个版本支持音频与区域录制的组合（若当前流无音频，行为不变）。

## Decisions

- 决策 1：区域录屏通过「离屏/隐藏 canvas + 周期性 `drawImage` 源视频子矩形 + `canvas.captureStream`」供 `MediaRecorder` 使用。
  - 方案 A（采用）：`requestAnimationFrame` 或 `setInterval` 与视频帧率对齐，将 `video` 的 `(sx, sy, sw, sh)` 绘入与区域同尺寸的 canvas，对 `canvas.captureStream(fps)` 调用 `startRecording`。
  - 方案 B（未采用）：继续对整路流录制，后期用 FFmpeg 裁剪。  
  - 理由：避免主进程与打包 FFmpeg 的强耦合，与现有仅渲染层实现一致；失败面更小。

- 决策 2：区域坐标与截屏一致，复用 `normalizeVideoRect` / `committedRegion` 与 `video` 的 `videoWidth`/`videoHeight` 空间。

- 决策 3：当 `regionMode` 为真但未 Commit 时，**不允许**开始录屏或给出与截屏一致的错误提示（与「框选截屏需先选区」一致）。

- 决策 4：码率/分辨率在区域较小时可沿用全局 `videoBitsPerSecond` 或按区域像素数比例调整（实现阶段择一，以肉眼质量与文件大小平衡为准）。

## Risks / Trade-offs

- [风险] 高帧率+高分辨率区域仍靠 JS 画帧，CPU 占用上升 → [缓解] 合理设置 `captureStream` 帧率、避免超额 canvas 尺寸。
- [风险] 视频暂停/失帧导致录制卡顿 → [缓解] 在 `drawImage` 前检查 `readyState`。
- [权衡] canvas 录屏与整流录屏两条路径需维护 → [收益] 用户语义清晰，不依赖后处理。

## Migration Plan

1. 在录屏启动处分支：全流 vs 区域 canvas 流。
2. 在停止录屏时统一停止并清理两条路径上的 track 与 rAF。
3. 手测：整幅、小区域、大区域、框选开但未选、VP9/MP4 转存链路。

## Open Questions

- 区域录屏时预览区外是否显示明确「将仅录制框内」的条带提示（可选 UI）。
