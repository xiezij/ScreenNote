const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 设置环境变量使用淘宝镜像
process.env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
process.env.ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/';
// 完全禁用代码签名
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
// 跳过代码签名工具下载
process.env.SKIP_CODE_SIGNING = 'true';
// 明确删除代码签名相关的环境变量
if (process.env.WIN_CSC_LINK) delete process.env.WIN_CSC_LINK;
if (process.env.WIN_CSC_KEY_PASSWORD) delete process.env.WIN_CSC_KEY_PASSWORD;
if (process.env.WIN_CSC_IDENTITY_FILE) delete process.env.WIN_CSC_IDENTITY_FILE;
if (process.env.CSC_LINK) delete process.env.CSC_LINK;
if (process.env.CSC_KEY_PASSWORD) delete process.env.CSC_KEY_PASSWORD;

// 修复 winCodeSign 解压问题（忽略符号链接错误）
function fixWinCodeSign() {
  try {
    const cacheDir = path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE, 'electron-builder', 'Cache', 'winCodeSign');
    if (!fs.existsSync(cacheDir)) return;
    
    const sevenZipPath = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
    if (!fs.existsSync(sevenZipPath)) return;
    
    // 查找所有 .7z 文件
    const files = fs.readdirSync(cacheDir);
    const zipFiles = files.filter(f => f.endsWith('.7z'));
    
    if (zipFiles.length === 0) return;
    
    console.log(`发现 ${zipFiles.length} 个 winCodeSign 压缩包，正在修复...`);
    
    zipFiles.forEach(file => {
      const filePath = path.join(cacheDir, file);
      const extractDir = path.join(cacheDir, file.replace('.7z', ''));
      
      // 如果目录已存在且不为空，跳过
      if (fs.existsSync(extractDir)) {
        try {
          const dirFiles = fs.readdirSync(extractDir);
          // 检查是否有 win 目录（Windows 需要的文件）
          const hasWinDir = dirFiles.some(f => {
            try {
              const fullPath = path.join(extractDir, f);
              return fs.statSync(fullPath).isDirectory() && f === 'win';
            } catch {
              return false;
            }
          });
          if (hasWinDir) {
            console.log(`  ✓ ${file} 已解压`);
            return;
          }
        } catch (e) {
          // 忽略错误，继续解压
        }
      }
      
      try {
        // 使用 -y 参数自动确认，-bd 后台模式，忽略符号链接错误
        // 重定向 stderr 到 null 以忽略符号链接错误
        const result = execSync(`"${sevenZipPath}" x -o"${extractDir}" -y -bd "${filePath}" 2>nul`, {
          cwd: cacheDir,
          shell: true,
          stdio: 'pipe'
        });
        console.log(`  ✓ ${file} 解压完成`);
      } catch (e) {
        // 即使有错误，也尝试继续（符号链接错误不影响 Windows 构建）
        console.log(`  ⚠ ${file} 解压时出现警告（可忽略）`);
      }
    });
  } catch (e) {
    // 忽略错误
    console.log('  ⚠ 修复缓存时出现警告，将继续构建...');
  }
}

console.log('📦 使用淘宝镜像源进行打包...');
console.log('Electron 镜像:', process.env.ELECTRON_MIRROR);
console.log('Electron Builder 镜像:', process.env.ELECTRON_BUILDER_BINARIES_MIRROR);
console.log('');

// 修复 winCodeSign 解压问题的函数
function extractWinCodeSign(zipPath, extractDir) {
  try {
    const sevenZipPath = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
    if (!fs.existsSync(sevenZipPath)) return false;
    
    // 创建目标目录
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    
    // 创建一个临时批处理文件来解压，忽略错误退出码
    const batFile = path.join(extractDir, 'extract.bat');
    const batContent = `@echo off
"${sevenZipPath}" x -o"${extractDir}" -y -bd "${zipPath}" "win/*" >nul 2>&1
exit 0
`;
    fs.writeFileSync(batFile, batContent);
    
    try {
      // 运行批处理文件（总是返回成功退出码）
      execSync(`"${batFile}"`, {
        shell: true,
        stdio: 'pipe',
        timeout: 30000
      });
    } catch (e) {
      // 忽略错误
    } finally {
      // 删除临时批处理文件
      try {
        if (fs.existsSync(batFile)) {
          fs.unlinkSync(batFile);
        }
      } catch (e) {
        // 忽略错误
      }
    }
    
    // 验证 win 目录是否存在
    const winDir = path.join(extractDir, 'win');
    if (fs.existsSync(winDir)) {
      // 检查 win 目录是否有文件
      try {
        const winFiles = fs.readdirSync(winDir);
        if (winFiles.length > 0) {
          return true;
        }
      } catch (e) {
        // 忽略错误
      }
    }
    return false;
  } catch (e) {
    // 即使有错误，也尝试检查是否已经解压了 win 目录
    const winDir = path.join(extractDir, 'win');
    if (fs.existsSync(winDir)) {
      try {
        const winFiles = fs.readdirSync(winDir);
        if (winFiles.length > 0) {
          return true;
        }
      } catch (e2) {
        // 忽略错误
      }
    }
    return false;
  }
}

// 预先解压所有 winCodeSign 文件
function preExtractAllWinCodeSign() {
  const cacheDir = path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE, 'electron-builder', 'Cache', 'winCodeSign');
  
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    return;
  }
  
  const files = fs.readdirSync(cacheDir);
  const zipFiles = files.filter(f => f.endsWith('.7z'));
  
  if (zipFiles.length === 0) return;
  
  console.log(`  预先解压 ${zipFiles.length} 个 winCodeSign 文件...`);
  
  zipFiles.forEach(file => {
    const filePath = path.join(cacheDir, file);
    const extractDir = path.join(cacheDir, file.replace('.7z', ''));
    
    // 检查是否已解压
    const winDir = path.join(extractDir, 'win');
    if (fs.existsSync(winDir)) {
      return; // 已解压，跳过
    }
    
    // 解压
    if (extractWinCodeSign(filePath, extractDir)) {
      console.log(`    ✓ ${file}`);
    } else {
      console.log(`    ⚠ ${file} 解压失败，将在构建时重试`);
    }
  });
}

// 监控并修复 winCodeSign 解压问题
function watchAndFixWinCodeSign() {
  const cacheDir = path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE, 'electron-builder', 'Cache', 'winCodeSign');
  
  // 确保目录存在
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  // 定期检查新的 .7z 文件并解压
  const checkInterval = setInterval(() => {
    try {
      if (!fs.existsSync(cacheDir)) return;
      
      const files = fs.readdirSync(cacheDir);
      const zipFiles = files.filter(f => f.endsWith('.7z'));
      
      zipFiles.forEach(file => {
        const filePath = path.join(cacheDir, file);
        const extractDir = path.join(cacheDir, file.replace('.7z', ''));
        
        // 检查是否已解压（检查 win 目录是否存在）
        if (fs.existsSync(extractDir)) {
          try {
            const dirFiles = fs.readdirSync(extractDir);
            const hasWinDir = dirFiles.some(f => {
              try {
                return fs.statSync(path.join(extractDir, f)).isDirectory() && f === 'win';
              } catch {
                return false;
              }
            });
            if (hasWinDir) return; // 已解压，跳过
          } catch {
            // 继续解压
          }
        }
        
        // 尝试解压
        if (extractWinCodeSign(filePath, extractDir)) {
          console.log(`  ✓ 自动修复: ${file}`);
        }
      });
    } catch (e) {
      // 忽略错误
    }
  }, 1000); // 每秒检查一次
  
  // 返回清理函数
  return () => clearInterval(checkInterval);
}

console.log('🔧 预先解压 winCodeSign 文件...');
preExtractAllWinCodeSign();

// 运行 PowerShell 修复脚本
console.log('🔧 运行 PowerShell 修复脚本...');
try {
  const psScript = path.join(__dirname, 'fix-winCodeSign.ps1');
  if (fs.existsSync(psScript)) {
    execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, {
      shell: true,
      stdio: 'inherit'
    });
  }
} catch (e) {
  console.log('  ⚠ PowerShell 修复脚本执行失败，将继续构建...');
}

console.log('🔧 启动 winCodeSign 自动修复监控...');
const stopWatching = watchAndFixWinCodeSign();

// 创建干净的环境变量对象，确保没有签名相关的变量
const cleanEnv = { ...process.env };
delete cleanEnv.WIN_CSC_LINK;
delete cleanEnv.WIN_CSC_KEY_PASSWORD;
delete cleanEnv.WIN_CSC_IDENTITY_FILE;
delete cleanEnv.CSC_LINK;
delete cleanEnv.CSC_KEY_PASSWORD;
cleanEnv.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
cleanEnv.SKIP_CODE_SIGNING = 'true';

// 勿传 win.sign=false（会被解析成路径 .../false 导致报错）；未配置证书时省略 sign 即可跳过签名
const electronBuilder = spawn('npx', ['electron-builder'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
  env: cleanEnv
});

electronBuilder.on('close', (code) => {
  stopWatching(); // 停止监控
  process.exit(code);
});

electronBuilder.on('error', (err) => {
  console.error('打包失败:', err);
  process.exit(1);
});

