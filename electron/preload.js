const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  getPrimaryDisplay: () => ipcRenderer.invoke('get-primary-display'),
  saveFile: (filePath, buffer) => ipcRenderer.invoke('save-file', { filePath, buffer }),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  clipboardWriteImage: (buffer) => ipcRenderer.invoke('clipboard-write-image', { buffer }),
  getHotkeyStatus: () => ipcRenderer.invoke('get-hotkey-status'),
  onScreenshotHotkey: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('screenshot-hotkey', handler);
    return () => ipcRenderer.removeListener('screenshot-hotkey', handler);
  },
  onMenuAction: (callback) => {
    const handler = (_e, action) => callback(action);
    ipcRenderer.on('menu-action', handler);
    return () => ipcRenderer.removeListener('menu-action', handler);
  },
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),
  pathJoin: (dir, fileName) => ipcRenderer.invoke('path-join', dir, fileName),
  transcodeWebmToMp4: (buffer, recordingQuality) =>
    ipcRenderer.invoke('transcode-webm-to-mp4', { buffer, recordingQuality })
});
