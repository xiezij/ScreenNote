# 屏幕截屏和录屏工具

基于 Electron + Vue 开发的屏幕截屏和录屏工具，适用于 Windows 环境。

## 功能特性

- 📸 屏幕截屏
- 🎥 屏幕录制
- 🖥️ 多屏幕源选择
- 💾 文件保存

## 技术栈

- Electron 28
- Vue 3
- Vite
- MediaRecorder API

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
npm run dev
```

## 构建应用

```bash
# 构建前端
npm run build

# 构建 Electron 应用
npm run build:electron
```

## 使用说明

1. 启动应用后，选择要捕获的屏幕源
2. 点击"截屏"按钮进行屏幕截图
3. 点击"开始录屏"按钮开始录制屏幕
4. 点击"停止录屏"按钮结束录制并保存文件

## 注意事项

- 首次使用需要授予屏幕录制权限
- 录屏格式为 WebM，可以使用 VLC 等播放器播放
- 建议在 Windows 10/11 环境下使用

