## 1. 路径解析修复

- [x] 1.1 在 `electron/main.js` 中调整 `getFfmpegPath`，加入 `app.asar.unpacked` 候选路径
- [x] 1.2 增加 `process.resourcesPath` 兜底路径并按平台区分可执行文件名
- [x] 1.3 使用候选列表 + `existsSync` 选择可用路径，避免对不存在路径 `spawn`
- [x] 1.4 修正打包环境候选优先级：优先 `app.asar.unpacked`，避免 `app.asar` 路径被误选后 `ENOENT`

## 2. 验证与回归

- [ ] 2.1 打包 NSIS 安装版并验证录屏转 MP4 成功
- [ ] 2.2 打包 portable 版并验证录屏转 MP4 成功
- [ ] 2.3 验证失败分支：缺失 FFmpeg 时返回明确错误且无崩溃
