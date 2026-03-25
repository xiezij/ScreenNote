# 修复 winCodeSign 解压问题
$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
if (Test-Path $cacheDir) {
    $7zFiles = Get-ChildItem "$cacheDir\*.7z" -Recurse -ErrorAction SilentlyContinue
    $7zaPath = "$PSScriptRoot\..\node_modules\7zip-bin\win\x64\7za.exe"
    
    foreach ($7zFile in $7zFiles) {
        $extractDir = $7zFile.DirectoryName
        Write-Host "解压: $($7zFile.Name) 到 $extractDir"
        # 使用 -y 参数自动确认，忽略符号链接错误
        & $7zaPath x "-o$extractDir" "-y" $7zFile.FullName 2>&1 | Out-Null
        Write-Host "完成"
    }
}


