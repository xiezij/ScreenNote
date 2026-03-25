@echo off
chcp 65001 >nul
echo 正在使用淘宝镜像源进行打包...
echo.

set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
set CSC_IDENTITY_AUTO_DISCOVERY=false

call npm run build:electron

pause

