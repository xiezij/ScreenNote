@echo off
echo 正在刷新 Windows 图标缓存...
echo.

REM 停止 explorer.exe
taskkill /f /im explorer.exe >nul 2>&1

REM 清理图标缓存
del /a /q "%localappdata%\IconCache.db" >nul 2>&1
del /a /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*.db" >nul 2>&1

REM 重新启动 explorer.exe
start explorer.exe

echo.
echo 图标缓存已刷新！
echo 如果 exe 文件的图标仍未更新，请：
echo 1. 右键点击 exe 文件
echo 2. 选择"属性"
echo 3. 点击"更改图标"
echo 4. 浏览并选择 build\icon.ico
echo 5. 点击确定
pause


