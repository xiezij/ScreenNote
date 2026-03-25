# 构建说明

## 构建时遇到的问题

如果在构建时遇到 winCodeSign 符号链接错误，这是正常的。这些错误不影响 Windows 构建，因为：

1. 错误来自 macOS (darwin) 文件的符号链接，Windows 不需要这些文件
2. electron-builder 会重试多次，即使有错误也会继续构建
3. 最终生成的 exe 文件可以正常使用

## 解决方案

### 方案 1：以管理员权限运行（推荐）

1. 右键点击 PowerShell
2. 选择"以管理员身份运行"
3. 运行 `npm run build:electron`

### 方案 2：忽略错误继续构建

即使看到符号链接错误，构建过程仍会继续。等待构建完成后检查 `dist-electron` 目录。

### 方案 3：手动修复缓存

运行修复脚本：
```powershell
powershell -ExecutionPolicy Bypass -File scripts\fix-winCodeSign.ps1
```

然后重新构建：
```bash
npm run build:electron
```

## 验证构建结果

构建完成后，检查：
```powershell
Test-Path "dist-electron\OBS Test 1.0.0.exe"
```

如果文件存在，说明构建成功！


