## Context

当前转码逻辑通过 `require('ffmpeg-static')` 获取可执行文件路径并直接 `spawn`。在开发环境下该路径指向真实 `node_modules`，可以正常执行；在打包环境下，路径可能指向 `resources/app.asar/...`，而二进制实际位于 `resources/app.asar.unpacked/...`，导致 `ENOENT`。

## Goals / Non-Goals

**Goals:**
- 在打包环境中正确解析 FFmpeg 可执行文件路径。
- 对候选路径做存在性校验，避免无效 `spawn`。
- 保持开发环境行为不变，不引入新依赖。

**Non-Goals:**
- 不修改转码参数与编码策略（如 `libx264`、`preset`）。
- 不替换 `ffmpeg-static` 方案。
- 不覆盖非本问题相关的录屏链路改造。

## Decisions

- 决策 1：保留 `ffmpeg-static` 原始返回路径作为首选候选。  
  理由：开发环境与部分运行场景仍可直接使用，兼容性最好。

- 决策 2：打包环境下若路径包含 `app.asar`，增加 `app.asar.unpacked` 替换候选。  
  理由：符合 electron-builder 对二进制文件的解包落盘方式，是本次故障的主因修复点。

- 决策 3：增加 `process.resourcesPath + app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg(.exe)` 兜底候选。  
  理由：避免不同安装目录、启动方式下的相对路径差异，提升正式包稳定性。

- 决策 4：从候选列表中选择第一个存在路径，否则返回 `null`。  
  理由：行为可预测，且与上层“未找到 FFmpeg”错误提示契合。

## Risks / Trade-offs

- [风险] 打包配置变动导致二进制落点变化 → [缓解] 保留多候选路径并在验证中覆盖 NSIS 与 portable。
- [风险] 平台差异导致文件名不同 → [缓解] 通过 `process.platform` 区分 `ffmpeg.exe`/`ffmpeg`。
- [权衡] 增加少量路径判断复杂度 → [收益] 显著降低正式包转码失败率。
