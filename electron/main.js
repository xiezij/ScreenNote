const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  screen,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  shell
} = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

function getFfmpegPath() {
  try {
    const p = require('ffmpeg-static');
    return p && fs.existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

// 开发时修改 main/preload 后自动重启主进程，否则仅 HMR 渲染进程会导致 IPC 未注册（如 transcode-webm-to-mp4）
try {
  if (!app.isPackaged) {
    require('electron-reloader')(module, { watchRenderer: false });
  }
} catch {
  /* electron-reloader 未安装时忽略 */
}

const APP_CN_NAME = '屏幕截屏和录屏工具';

let mainWindow;
let tray = null;
let hotkeyError = null;
app.isQuitting = false;

function focusMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

function sendMenuAction(action) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('menu-action', action);
  }
}

function showAboutDialog() {
  const { dialog } = require('electron');
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  dialog.showMessageBox(win || undefined, {
    type: 'info',
    title: `关于 ${APP_CN_NAME}`,
    message: APP_CN_NAME,
    detail: `版本 ${app.getVersion()}\n\n支持显示器/窗口预览、区域截屏、剪贴板与自动保存目录、桌面录屏（WebM / MP4 转码）等功能。\n\n全局截屏快捷键：Ctrl+Shift+S`
  });
}

function showShortcutsHelpDialog() {
  const { dialog } = require('electron');
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  dialog.showMessageBox(win || undefined, {
    type: 'info',
    title: '快捷键与提示',
    message: '常用操作',
    detail:
      '• 截屏并保存（全局）：Ctrl+Shift+S，将唤起本窗口并执行与按钮相同的保存流程\n\n' +
      '• 刷新屏幕源：Ctrl+Alt+R，或菜单「截屏与录屏」\n\n' +
      '• 强制重新加载：Ctrl+Shift+R（忽略缓存，排查界面异常时可用）\n\n' +
      '• 菜单还可：复制截屏到剪贴板、选择默认保存文件夹、打开系统临时目录等\n\n' +
      '• 关闭窗口时若已启用托盘，应用将最小化到托盘而非退出'
  });
}

function buildApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const devViewItems = isDev()
    ? [
        { type: 'separator' },
        {
          label: '切换开发者工具',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    : [];

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { label: `关于 ${app.name}`, click: () => showAboutDialog() },
              { type: 'separator' },
              { role: 'services', label: '服务' },
              { type: 'separator' },
              { role: 'hide', label: `隐藏 ${app.name}` },
              { role: 'hideOthers', label: '隐藏其他' },
              { role: 'unhide', label: '显示全部' },
              { type: 'separator' },
              { role: 'quit', label: '退出' }
            ]
          }
        ]
      : []),
    {
      label: '文件',
      submenu: [
        {
          label: '打开临时文件夹',
          click: async () => {
            const err = await shell.openPath(os.tmpdir());
            if (err) {
              const { dialog } = require('electron');
              dialog.showErrorBox('无法打开文件夹', err);
            }
          }
        },
        {
          label: '打开应用数据目录',
          click: async () => {
            const err = await shell.openPath(app.getPath('userData'));
            if (err) {
              const { dialog } = require('electron');
              dialog.showErrorBox('无法打开文件夹', err);
            }
          }
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit', label: '退出' }])
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle', label: '粘贴并匹配样式' },
              { role: 'delete', label: '删除' },
              { role: 'selectAll', label: '全选' }
            ]
          : [
              { role: 'delete', label: '删除' },
              { type: 'separator' },
              { role: 'selectAll', label: '全选' }
            ])
      ]
    },
    {
      label: '截屏与录屏',
      submenu: [
        {
          label: '截屏并保存（全局 Ctrl+Shift+S）',
          click: () => {
            focusMainWindow();
            mainWindow?.webContents.send('screenshot-hotkey');
          }
        },
        {
          label: '复制截屏到剪贴板',
          click: () => {
            focusMainWindow();
            sendMenuAction('capture-copy');
          }
        },
        { type: 'separator' },
        {
          label: '刷新屏幕源列表',
          accelerator: 'CommandOrControl+Alt+R',
          click: () => {
            focusMainWindow();
            sendMenuAction('refresh-sources');
          }
        },
        {
          label: '选择默认保存文件夹…',
          click: () => {
            focusMainWindow();
            sendMenuAction('choose-default-folder');
          }
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '重新加载',
          accelerator: 'CommandOrControl+R',
          click: (item, focusedWindow) => {
            focusedWindow?.reload();
          }
        },
        {
          label: '强制重新加载（忽略缓存）',
          accelerator: 'CommandOrControl+Shift+R',
          click: (item, focusedWindow) => {
            focusedWindow?.webContents?.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        {
          label: '切换全屏',
          accelerator: isMac ? 'Ctrl+Command+F' : 'F11',
          role: 'togglefullscreen'
        },
        ...devViewItems
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front', label: '前置全部窗口' }]
          : [{ role: 'close', label: '关闭' }])
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: '快捷键说明…', click: () => showShortcutsHelpDialog() },
        ...(isMac ? [] : [{ type: 'separator' }, { label: `关于 ${APP_CN_NAME}`, click: () => showAboutDialog() }])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function isDev() {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

// 检查 Vite 服务器是否就绪
function waitForServer(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    let attempts = 0;

    const checkServer = () => {
      attempts++;
      const req = http.get(
        {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: '/',
          timeout: 1000
        },
        () => {
          resolve();
        }
      );

      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('Vite server not ready after maximum attempts'));
        } else {
          setTimeout(checkServer, 500);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error('Vite server timeout'));
        } else {
          setTimeout(checkServer, 500);
        }
      });
    };

    checkServer();
  });
}

function registerScreenshotHotkey() {
  globalShortcut.unregisterAll();
  hotkeyError = null;
  const acc = 'CommandOrControl+Shift+S';
  const ok = globalShortcut.register(acc, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('screenshot-hotkey');
    }
  });
  if (!ok) {
    hotkeyError = `全局快捷键 ${acc} 注册失败，可能与其他应用冲突`;
  }
}

function createTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, '../build/icon.png');
  let image;
  try {
    image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) image = null;
  } catch {
    image = null;
  }
  if (!image) {
    console.warn('托盘图标不可用，已跳过系统托盘');
    return;
  }
  tray = new Tray(image);
  const menu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '截屏',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('screenshot-hotkey');
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        globalShortcut.unregisterAll();
        app.quit();
      }
    }
  ]);
  tray.setToolTip('屏幕截屏和录屏工具');
  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableWebSQL: false,
      webSecurity: true
    },
    icon: path.join(__dirname, '../build/icon.png'),
    show: false
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    if (!app.isQuitting && tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  if (isDev()) {
    const startUrl = 'http://localhost:5173';

    mainWindow.webContents.on('did-fail-load', () => {
      setTimeout(() => {
        mainWindow.loadURL(startUrl);
      }, 1000);
    });

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page loaded successfully');
    });

    mainWindow.webContents.on('console-message', (event, level, message) => {
      console.log(`[Console ${level}]:`, message);
    });

    mainWindow.loadURL(startUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  app.setName(APP_CN_NAME);
  app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
  buildApplicationMenu();

  if (isDev()) {
    try {
      console.log('Waiting for Vite server...');
      await waitForServer('http://localhost:5173');
      console.log('Vite server is ready!');
    } catch (error) {
      console.error('Vite server not ready:', error.message);
      console.log('Will try to load anyway...');
    }
  }

  setTimeout(() => {
    createWindow();
    createTray();
    registerScreenshotHotkey();
  }, 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// 获取屏幕源列表
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 300, height: 200 }
  });
  return sources.map((source) => {
    const kind = source.id.startsWith('screen:') ? 'screen' : 'window';
    return {
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      kind
    };
  });
});

ipcMain.handle('get-primary-display', () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height,
    scaleFactor: primaryDisplay.scaleFactor,
    bounds: primaryDisplay.bounds
  };
});

ipcMain.handle('save-file', async (event, { filePath, buffer }) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const { dialog } = require('electron');
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  const result = await dialog.showSaveDialog(win, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const { dialog } = require('electron');
  const win = BrowserWindow.getFocusedWindow() || mainWindow;
  return dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    ...options
  });
});

ipcMain.handle('clipboard-write-image', async (event, { buffer }) => {
  try {
    const { clipboard } = require('electron');
    const img = nativeImage.createFromBuffer(Buffer.from(buffer));
    if (img.isEmpty()) {
      return { success: false, error: '无法从缓冲区创建图像' };
    }
    clipboard.writeImage(img);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-hotkey-status', () => ({
  ok: !hotkeyError,
  error: hotkeyError
}));

ipcMain.handle('path-join', (event, dir, fileName) => path.join(dir, fileName));

ipcMain.handle('transcode-webm-to-mp4', async (event, { buffer }) => {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath) {
    return { success: false, error: '未找到 FFmpeg（请确认已安装 ffmpeg-static）' };
  }
  const id = crypto.randomBytes(8).toString('hex');
  const inPath = path.join(os.tmpdir(), `cap-rec-${id}.webm`);
  const outPath = path.join(os.tmpdir(), `cap-rec-${id}.mp4`);
  try {
    fs.writeFileSync(inPath, Buffer.from(buffer));
    const code = await new Promise((resolve, reject) => {
      const proc = spawn(
        ffmpegPath,
        [
          '-y',
          '-i',
          inPath,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          outPath
        ],
        { stdio: 'ignore' }
      );
      proc.on('error', reject);
      proc.on('close', (c) => resolve(c));
    });
    if (code !== 0) {
      return { success: false, error: `FFmpeg 退出码 ${code}` };
    }
    if (!fs.existsSync(outPath)) {
      return { success: false, error: '未生成 MP4 文件' };
    }
    const outBuf = fs.readFileSync(outPath);
    return { success: true, buffer: Array.from(outBuf) };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  } finally {
    try {
      if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
    } catch {
      /* ignore */
    }
    try {
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch {
      /* ignore */
    }
  }
});
