## Why

正式包在执行 WebM 转 MP4 时出现 `spawn .../app.asar/.../ffmpeg.exe ENOENT`，导致录屏导出失败；但本地开发环境正常。该问题直接影响核心功能可用性，需要尽快修复并形成可追溯说明。

## What Changes

- 修复打包环境下 FFmpeg 可执行文件路径解析，兼容 `app.asar.unpacked`。
- 增加基于 `process.resourcesPath` 的兜底路径，避免不同安装形态导致路径失效。
- 明确转码路径选择与验证逻辑，确保 `spawn` 仅对存在的可执行文件调用。
- 补充任务与验证清单，覆盖打包与运行时回归。

## Capabilities

### New Capabilities
- `packaged-ffmpeg-resolution`: 应用在打包环境中能够稳定定位并调用 FFmpeg 可执行文件完成转码。

### Modified Capabilities
- （无）

## Impact

- 影响代码：`electron/main.js`（`getFfmpegPath` 路径决策逻辑）
- 影响场景：Windows 正式包（NSIS/portable）录屏转 MP4
- 外部依赖：`ffmpeg-static`（继续使用，无新增依赖）
- 风险点：仅在打包环境生效的路径分支需通过真实安装包验证
