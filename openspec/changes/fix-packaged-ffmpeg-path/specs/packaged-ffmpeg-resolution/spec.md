## ADDED Requirements

### Requirement: Packaged FFmpeg Path Resolution
应用在打包环境执行 WebM 转 MP4 时，MUST 能够解析到真实存在的 FFmpeg 可执行文件路径，并仅在该路径存在时调用转码进程。

#### Scenario: Fallback to asar.unpacked
- **WHEN** `ffmpeg-static` 返回的路径位于 `app.asar` 且该路径不可执行
- **THEN** 系统 MUST 尝试 `app.asar.unpacked` 对应路径并在存在时用于 `spawn`

#### Scenario: Fallback by resourcesPath
- **WHEN** `app.asar` 与替换后的 `app.asar.unpacked` 路径均不可用
- **THEN** 系统 MUST 尝试 `process.resourcesPath/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg(.exe)` 并在存在时用于 `spawn`

#### Scenario: Explicit failure when no executable found
- **WHEN** 所有候选 FFmpeg 路径均不存在
- **THEN** 系统 MUST 返回明确错误（未找到 FFmpeg），且 MUST NOT 调用 `spawn`
