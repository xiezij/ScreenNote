<template>
  <div class="app-container">
    <div class="toast-stack" aria-live="polite">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast', `toast-${t.type}`]"
      >
        {{ t.message }}
      </div>
    </div>

    <div class="header">
      <div class="header-top">
        <h1>屏幕截屏和录屏工具</h1>
        <div v-if="isElectron && primaryDisplay" class="display-meta inline">
          <span class="display-meta-text">
            主显示器 {{ primaryDisplay.width }}×{{ primaryDisplay.height }}，缩放 {{ primaryDisplay.scaleFactor }}×
          </span>
          <span v-if="hotkeyHint" class="hotkey-hint-inline">{{ hotkeyHint }}</span>
        </div>
      </div>
      <p v-if="!isElectron" class="env-hint">
        当前在普通浏览器中打开，无法获取屏幕源。请关闭此页，在项目根目录运行 <code>npm run dev</code>，使用自动打开的 Electron 窗口操作。
      </p>
    </div>

    <div class="main-content themed-scroll">
      <div class="control-panel">
        <div class="panel-grid">
          <div class="panel-col panel-col-left">
            <div class="source-selector">
              <div class="source-toolbar">
                <h3>选择屏幕源</h3>
                <button type="button" class="btn-secondary btn-small" @click="refreshSources">刷新</button>
              </div>
              <p v-if="!sources.length && isElectron" class="hint-text">未获取到源，请点击刷新。</p>
              <div class="source-scroll themed-scroll">
                <div v-if="screenSources.length" class="source-group">
                  <h4 class="source-group-title">显示器</h4>
                  <div class="source-grid">
                    <button
                      v-for="source in screenSources"
                      :key="source.id"
                      type="button"
                      class="source-card"
                      :class="{ selected: selectedSourceId === source.id }"
                      @click="pickSource(source.id)"
                    >
                      <img :src="source.thumbnail" alt="" class="source-thumb" />
                      <span class="source-name">{{ source.name }}</span>
                    </button>
                  </div>
                </div>
                <div v-if="windowSources.length" class="source-group">
                  <h4 class="source-group-title">窗口</h4>
                  <div class="source-grid">
                    <button
                      v-for="source in windowSources"
                      :key="source.id"
                      type="button"
                      class="source-card"
                      :class="{ selected: selectedSourceId === source.id }"
                      @click="pickSource(source.id)"
                    >
                      <img :src="source.thumbnail" alt="" class="source-thumb" />
                      <span class="source-name">{{ source.name }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="panel-col panel-col-right">
        <div class="preview-area">
          <div class="preview-toolbar">
            <h3>预览</h3>
            <label class="toggle-label">
              <input v-model="regionMode" type="checkbox" @change="onRegionModeChange" />
              框选区域
            </label>
          </div>
          <div
            ref="videoContainerRef"
            class="video-container"
            :class="{ 'region-cursor': regionMode }"
          >
            <video ref="videoElement" autoplay muted playsinline></video>
            <canvas ref="canvasElement" class="hidden-canvas"></canvas>
            <div
              v-if="regionMode"
              class="region-layer"
              @pointerdown="onRegionPointerDown"
              @pointermove="onRegionPointerMove"
              @pointerup="onRegionPointerUp"
              @pointercancel="onRegionPointerCancel"
            ></div>
            <div
              v-if="dragPreview"
              class="region-marquee"
              :style="dragPreviewStyle"
            ></div>
            <div
              v-if="committedRegion && regionMode && !dragPreview"
              class="region-marquee committed"
              :style="committedOverlayStyle"
            ></div>
            <div v-if="countdown > 0" class="countdown-overlay">{{ countdown }}</div>
          </div>
        </div>

        <div class="capture-options">
          <div class="option-row">
            <label class="field-label">图片格式</label>
            <select v-model="imageFormat" class="field-input">
              <option value="png">PNG（无损）</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div v-if="imageFormat !== 'png'" class="option-row">
            <label class="field-label">质量 {{ Math.round(imageQuality * 100) }}%</label>
            <input v-model.number="imageQuality" type="range" min="0.5" max="1" step="0.05" class="field-range" />
          </div>
          <div class="option-row">
            <label class="field-label">延时截屏</label>
            <select v-model.number="delaySeconds" class="field-input narrow">
              <option :value="0">无</option>
              <option :value="3">3 秒</option>
              <option :value="5">5 秒</option>
            </select>
          </div>
          <div class="option-row checkbox-row">
            <label class="toggle-label">
              <input v-model="autoSaveEnabled" type="checkbox" />
              使用默认文件夹自动保存（跳过对话框）
            </label>
            <button
              type="button"
              class="btn-secondary btn-small"
              :disabled="!isElectron"
              @click="chooseDefaultFolder"
            >
              选择文件夹
            </button>
          </div>
          <p v-if="defaultSaveDir" class="hint-text path-hint">当前目录：{{ defaultSaveDir }}</p>
          <div class="option-row">
            <label class="field-label">录屏保存格式</label>
            <select
              v-model="recordingOutputFormat"
              class="field-input"
              :disabled="isRecording || isTranscoding"
            >
              <option value="webm_vp9">WebM（VP9 优先）</option>
              <option value="webm_vp8">WebM（VP8）</option>
              <option value="mp4">MP4（H.264，录制后转码，依赖 FFmpeg）</option>
            </select>
          </div>
          <p v-if="recordingOutputFormat === 'mp4'" class="hint-text mp4-hint">
            MP4 会先录制成 WebM，停止后由内置 FFmpeg 转码，大文件可能需等待数秒。
          </p>
        </div>

        <div class="controls">
          <button
            type="button"
            class="btn-primary"
            :disabled="!canCapture || captureBusy"
            @click="runCaptureSave"
          >
            {{ captureBusy ? '处理中…' : '截屏并保存' }}
          </button>
          <button
            type="button"
            class="btn-primary btn-outline"
            :disabled="!canCapture || captureBusy"
            @click="runCaptureCopy"
          >
            {{ captureBusy ? '处理中…' : '复制到剪贴板' }}
          </button>
          <button
            type="button"
            :disabled="!isSourceSelected || isTranscoding"
            :class="['btn-primary', { recording: isRecording }]"
            @click="toggleRecording"
          >
            {{ isRecording ? '停止录屏' : '开始录屏' }}
          </button>
        </div>

        <div v-if="recordingStatus" class="status">
          <div class="status-indicator" :class="{ active: isRecording || isTranscoding }"></div>
          <span>{{ recordingStatus }}</span>
        </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useScreenCapture } from './composables/useScreenCapture';
import { useRecording } from './composables/useRecording';
import { useToast } from './composables/useToast';
import { normalizeVideoRect, videoRectToOverlayStyle } from './utils/videoDisplayMap';

const videoElement = ref(null);
const canvasElement = ref(null);
const videoContainerRef = ref(null);
const sources = ref([]);
const selectedSourceId = ref('');
const isRecording = ref(false);
const recordingStatus = ref('');
const captureBusy = ref(false);
const primaryDisplay = ref(null);
const hotkeyHint = ref('');
const imageFormat = ref('png');
const imageQuality = ref(0.92);
const delaySeconds = ref(0);
const regionMode = ref(false);
const dragPreview = ref(null);
const committedRegion = ref(null);
const countdown = ref(0);
const autoSaveEnabled = ref(false);
const defaultSaveDir = ref('');
const recordingOutputFormat = ref('webm_vp9');
const isTranscoding = ref(false);

const { toasts, push: toast } = useToast();
const { startCapture, stopCapture, captureFrame } = useScreenCapture();
const { startRecording, stopRecording } = useRecording();

const LS_DEFAULT_DIR = 'screenshot-default-dir';
const LS_AUTO_SAVE = 'screenshot-auto-save';

const isElectron = computed(
  () => typeof window !== 'undefined' && !!window.electronAPI
);

const screenSources = computed(() => sources.value.filter((s) => s.kind === 'screen'));
const windowSources = computed(() => sources.value.filter((s) => s.kind === 'window'));
const isSourceSelected = computed(() => !!selectedSourceId.value);
const canCapture = computed(() => isSourceSelected.value);

const mimeForFormat = computed(() => {
  const m = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp'
  };
  return m[imageFormat.value] || 'image/png';
});

const dragPreviewStyle = computed(() => {
  if (!dragPreview.value || !videoContainerRef.value) return {};
  const r = videoContainerRef.value.getBoundingClientRect();
  const x0 = dragPreview.value.x0;
  const y0 = dragPreview.value.y0;
  const x1 = dragPreview.value.x1;
  const y1 = dragPreview.value.y1;
  const left = Math.min(x0, x1) - r.left;
  const top = Math.min(y0, y1) - r.top;
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${w}px`,
    height: `${h}px`
  };
});

const committedOverlayStyle = computed(() => {
  if (!committedRegion.value || !videoElement.value || !videoContainerRef.value) return {};
  const st = videoRectToOverlayStyle(
    videoElement.value,
    videoContainerRef.value,
    committedRegion.value.sx,
    committedRegion.value.sy,
    committedRegion.value.sw,
    committedRegion.value.sh
  );
  return st || {};
});

let regionPointerId = null;
let unlistenHotkey = null;
let unlistenMenu = null;

onMounted(async () => {
  if (typeof localStorage !== 'undefined') {
    defaultSaveDir.value = localStorage.getItem(LS_DEFAULT_DIR) || '';
    autoSaveEnabled.value = localStorage.getItem(LS_AUTO_SAVE) === '1';
  }
  await refreshSources();
  await loadPrimaryDisplay();
  const api = window.electronAPI;
  if (api?.getHotkeyStatus) {
    const st = await api.getHotkeyStatus();
    if (st.ok) {
      hotkeyHint.value = '全局快捷键：Ctrl+Shift+S（与截屏并保存相同）';
    } else if (st.error) {
      hotkeyHint.value = st.error;
    }
  }
  if (api?.onScreenshotHotkey) {
    unlistenHotkey = api.onScreenshotHotkey(() => {
      runCaptureSave();
    });
  }
  if (api?.onMenuAction) {
    unlistenMenu = api.onMenuAction((action) => {
      if (action === 'capture-copy') {
        runCaptureCopy();
      } else if (action === 'refresh-sources') {
        refreshSources();
      } else if (action === 'choose-default-folder') {
        chooseDefaultFolder();
      }
    });
  }
});

onUnmounted(() => {
  stopCapture();
  if (isRecording.value) {
    stopRecording();
  }
  if (unlistenHotkey) unlistenHotkey();
  if (unlistenMenu) unlistenMenu();
});

watch(autoSaveEnabled, (v) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LS_AUTO_SAVE, v ? '1' : '0');
  }
});

async function loadPrimaryDisplay() {
  try {
    const api = window.electronAPI;
    if (api?.getPrimaryDisplay) {
      primaryDisplay.value = await api.getPrimaryDisplay();
    }
  } catch (e) {
    console.error(e);
  }
}

async function refreshSources() {
  try {
    const api = window.electronAPI;
    if (!api?.getSources) {
      sources.value = [];
      return;
    }
    sources.value = await api.getSources();
    await loadPrimaryDisplay();
  } catch (error) {
    console.error('获取屏幕源失败:', error);
    toast('获取屏幕源失败：' + error.message, 'error');
  }
}

async function pickSource(id) {
  selectedSourceId.value = id;
  committedRegion.value = null;
  dragPreview.value = null;
  stopCapture();
  try {
    await startCapture(id, videoElement.value);
  } catch (e) {
    toast('开始预览失败：' + e.message, 'error');
  }
}

function onRegionModeChange() {
  committedRegion.value = null;
  dragPreview.value = null;
}

function clientToContainerRect(clientX, clientY) {
  if (!videoContainerRef.value) return { x: 0, y: 0 };
  const r = videoContainerRef.value.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

function onRegionPointerDown(e) {
  if (!regionMode.value || !videoElement.value) return;
  e.preventDefault();
  regionPointerId = e.pointerId;
  e.currentTarget.setPointerCapture(e.pointerId);
  dragPreview.value = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
  committedRegion.value = null;
}

function onRegionPointerMove(e) {
  if (regionPointerId == null || e.pointerId !== regionPointerId || !dragPreview.value) return;
  dragPreview.value = {
    ...dragPreview.value,
    x1: e.clientX,
    y1: e.clientY
  };
}

function onRegionPointerUp(e) {
  if (regionPointerId == null || e.pointerId !== regionPointerId) return;
  try {
    e.currentTarget.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  regionPointerId = null;
  const d = dragPreview.value;
  dragPreview.value = null;
  if (!d || !videoElement.value) return;
  const rect = normalizeVideoRect(videoElement.value, d.x0, d.y0, d.x1, d.y1);
  if (rect && rect.sw >= 2 && rect.sh >= 2) {
    committedRegion.value = rect;
    toast('已选定区域', 'success', 2000);
  } else {
    committedRegion.value = null;
    toast('请在视频画面内拖选矩形区域', 'error', 3000);
  }
}

function onRegionPointerCancel(e) {
  regionPointerId = null;
  dragPreview.value = null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extForFormat(fmt) {
  if (fmt === 'jpeg') return 'jpg';
  return fmt;
}

async function buildBlob() {
  const video = videoElement.value;
  const canvas = canvasElement.value;
  if (!video || !canvas) throw new Error('预览未就绪');

  const opts = {
    mimeType: mimeForFormat.value,
    quality: imageFormat.value === 'png' ? undefined : imageQuality.value
  };

  if (regionMode.value) {
    if (!committedRegion.value) {
      throw new Error('请先在预览区拖选区域，或关闭「框选区域」');
    }
    opts.region = committedRegion.value;
  }

  return captureFrame(video, canvas, opts);
}

async function saveBlobToFile(blob) {
  const api = window.electronAPI;
  if (!api?.showSaveDialog || !api?.saveFile) {
    toast('请在 Electron 窗口中使用保存功能', 'error');
    return;
  }

  const ext = extForFormat(imageFormat.value);
  const filters =
    imageFormat.value === 'png'
      ? [{ name: 'PNG', extensions: ['png'] }]
      : imageFormat.value === 'jpeg'
        ? [{ name: 'JPEG', extensions: ['jpg', 'jpeg'] }]
        : [{ name: 'WebP', extensions: ['webp'] }];

  if (autoSaveEnabled.value && defaultSaveDir.value && api.pathJoin) {
    const name = `screenshot-${Date.now()}.${ext}`;
    const filePath = await api.pathJoin(defaultSaveDir.value, name);
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Array.from(new Uint8Array(arrayBuffer));
    const res = await api.saveFile(filePath, buffer);
    if (res.success) {
      toast('已保存到默认文件夹', 'success');
    } else {
      toast('保存失败：' + (res.error || '未知错误'), 'error', 6000);
    }
    return;
  }

  const result = await api.showSaveDialog({
    title: '保存截屏',
    defaultPath: `screenshot-${Date.now()}.${ext}`,
    filters
  });

  if (!result.canceled && result.filePath) {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Array.from(new Uint8Array(arrayBuffer));
    const res = await api.saveFile(result.filePath, buffer);
    if (res.success) {
      toast('截屏已保存', 'success');
    } else {
      toast('保存失败：' + (res.error || '未知错误'), 'error', 6000);
    }
  }
}

async function copyBlobToClipboard(blob) {
  const api = window.electronAPI;
  if (!api?.clipboardWriteImage) {
    toast('剪贴板 API 不可用', 'error');
    return;
  }
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Array.from(new Uint8Array(arrayBuffer));
  const res = await api.clipboardWriteImage(buffer);
  if (res.success) {
    toast('已复制到剪贴板', 'success');
  } else {
    toast('复制失败：' + (res.error || '未知错误'), 'error', 6000);
  }
}

async function runWithDelay(mode) {
  if (captureBusy.value) return;
  captureBusy.value = true;
  try {
    const sec = delaySeconds.value;
    if (sec > 0) {
      for (let i = sec; i > 0; i--) {
        countdown.value = i;
        await sleep(1000);
      }
      countdown.value = 0;
    }
    const blob = await buildBlob();
    if (mode === 'save') {
      await saveBlobToFile(blob);
    } else {
      await copyBlobToClipboard(blob);
    }
  } catch (error) {
    console.error(error);
    countdown.value = 0;
    toast(error.message || String(error), 'error', 5000);
  } finally {
    captureBusy.value = false;
  }
}

function runCaptureSave() {
  runWithDelay('save');
}

function runCaptureCopy() {
  runWithDelay('copy');
}

async function chooseDefaultFolder() {
  const api = window.electronAPI;
  if (!api?.showOpenDialog) return;
  const r = await api.showOpenDialog({ title: '选择默认保存文件夹' });
  if (!r.canceled && r.filePaths?.length) {
    defaultSaveDir.value = r.filePaths[0];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_DEFAULT_DIR, defaultSaveDir.value);
    }
    toast('已设置默认保存文件夹', 'success');
  }
}

function recordingPresetForCapture() {
  if (recordingOutputFormat.value === 'webm_vp8') return 'vp8';
  return 'vp9';
}

const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording();
    isRecording.value = false;
    recordingStatus.value = '正在保存录屏…';
  } else {
    if (!videoElement.value) return;

    const stream = videoElement.value.srcObject;
    if (!stream) {
      toast('请先选择屏幕源', 'error');
      return;
    }

    try {
      const preset = recordingPresetForCapture();
      await startRecording(
        stream,
        async (chunks, meta) => {
          await saveRecording(chunks, meta);
        },
        { preset }
      );
      isRecording.value = true;
      recordingStatus.value = '正在录屏…';
    } catch (error) {
      console.error('开始录屏失败:', error);
      toast('开始录屏失败：' + error.message, 'error');
      recordingStatus.value = '';
    }
  }
};

const saveRecording = async (chunks, meta) => {
  const api = window.electronAPI;
  if (!api?.showSaveDialog) {
    toast('请在 Electron 窗口中使用保存功能', 'error');
    recordingStatus.value = '';
    return;
  }
  if (!chunks || chunks.length === 0) {
    toast('没有录制到有效数据', 'error');
    recordingStatus.value = '';
    return;
  }
  const mimeType = meta?.mimeType || 'video/webm';
  const wantMp4 = recordingOutputFormat.value === 'mp4';

  try {
    const webmBlob = new Blob(chunks, { type: mimeType });

    if (wantMp4) {
      if (!api.transcodeWebmToMp4) {
        toast('当前环境不支持 MP4 转码', 'error');
        recordingStatus.value = '';
        return;
      }
      isTranscoding.value = true;
      recordingStatus.value = '正在转码为 MP4…';
      const webmBuf = Array.from(new Uint8Array(await webmBlob.arrayBuffer()));
      const trans = await api.transcodeWebmToMp4(webmBuf);
      isTranscoding.value = false;
      if (!trans.success) {
        toast('转码失败：' + (trans.error || '未知错误'), 'error', 6000);
        recordingStatus.value = '';
        return;
      }
      const result = await api.showSaveDialog({
        title: '保存录屏',
        defaultPath: `recording-${Date.now()}.mp4`,
        filters: [{ name: 'MP4', extensions: ['mp4'] }]
      });
      if (!result.canceled && result.filePath) {
        const res = await api.saveFile(result.filePath, trans.buffer);
        if (res.success) {
          toast('录屏已保存（MP4）', 'success');
        } else {
          toast('保存失败：' + (res.error || ''), 'error');
        }
      }
      recordingStatus.value = '';
      return;
    }

    const result = await api.showSaveDialog({
      title: '保存录屏',
      defaultPath: `recording-${Date.now()}.webm`,
      filters: [{ name: 'WebM', extensions: ['webm'] }]
    });

    if (!result.canceled && result.filePath) {
      const arrayBuffer = await webmBlob.arrayBuffer();
      const buffer = Array.from(new Uint8Array(arrayBuffer));
      const res = await api.saveFile(result.filePath, buffer);
      if (res.success) {
        toast('录屏已保存', 'success');
      } else {
        toast('保存失败：' + (res.error || ''), 'error');
      }
    }
    recordingStatus.value = '';
  } catch (error) {
    console.error('保存录屏失败:', error);
    isTranscoding.value = false;
    toast('保存失败：' + error.message, 'error');
    recordingStatus.value = '';
  }
};
</script>

<style scoped>
.hidden-canvas {
  display: none;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(420px, 92vw);
  pointer-events: none;
}

.toast {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.45;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.toast-info {
  background: #1e293b;
  color: #f1f5f9;
}

.toast-success {
  background: #14532d;
  color: #dcfce7;
}

.toast-error {
  background: #7f1d1d;
  color: #fecaca;
}

.header {
  padding: 14px 20px 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.header-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 12px 20px;
}

.header h1 {
  color: white;
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

.display-meta.inline {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.45;
  max-width: 100%;
}

.display-meta-text {
  margin-right: 8px;
}

.hotkey-hint-inline {
  display: inline;
  opacity: 0.92;
}

@media (max-width: 640px) {
  .hotkey-hint-inline {
    display: block;
    margin-top: 4px;
  }
}

.env-hint {
  margin: 12px 0 0;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.5;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.env-hint code {
  padding: 2px 6px;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
}

.main-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 16px 20px 20px;
}

.themed-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(102, 126, 234, 0.65) rgba(15, 23, 42, 0.12);
}

.main-content.themed-scroll {
  scrollbar-color: rgba(199, 210, 254, 0.5) rgba(255, 255, 255, 0.12);
}

.themed-scroll::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

.themed-scroll::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.08);
  border-radius: 10px;
}

.main-content.themed-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.12);
}

.themed-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(102, 126, 234, 0.55), rgba(118, 75, 162, 0.55));
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.themed-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(102, 126, 234, 0.85), rgba(118, 75, 162, 0.85));
  background-clip: padding-box;
}

.control-panel {
  background: white;
  border-radius: 16px;
  padding: 22px 24px 26px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 1200px;
  width: 100%;
}

.panel-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 960px) {
  .panel-grid {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(360px, 1.2fr);
    gap: 24px;
    /* 与右列等高，避免左侧只有一截内容、下面大片留白 */
    align-items: stretch;
  }

  .panel-col-left {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel-col-left .source-selector {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel-col-left .source-scroll {
    flex: 1;
    min-height: 200px;
    max-height: none;
  }
}

.panel-col-left {
  min-width: 0;
}

.panel-col-right {
  min-width: 0;
}

.source-scroll {
  max-height: min(42vh, 420px);
  overflow-y: auto;
  padding-right: 4px;
  margin-right: -4px;
}

.source-selector {
  min-height: 0;
}

.mp4-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: -4px;
}

.source-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.source-toolbar h3 {
  margin: 0;
  color: #333;
}

.source-group {
  margin-bottom: 20px;
}

.source-group-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

@media (min-width: 960px) {
  .source-grid {
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 12px;
  }
}

.source-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.source-card:hover {
  border-color: #94a3b8;
}

.source-card.selected {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.25);
}

.source-thumb {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  background: #0f172a;
}

.source-name {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.35;
  color: #334155;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hint-text {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 8px;
}

.path-hint {
  word-break: break-all;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.preview-toolbar h3 {
  margin: 0;
  color: #333;
}

.preview-area {
  margin-bottom: 20px;
}

.video-container {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-container.region-cursor {
  cursor: crosshair;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.region-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  touch-action: none;
}

.region-marquee {
  position: absolute;
  z-index: 3;
  border: 2px solid #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  pointer-events: none;
  box-sizing: border-box;
}

.region-marquee.committed {
  border-color: #a78bfa;
  background: rgba(167, 139, 250, 0.12);
}

.countdown-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
  background: rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.capture-options {
  margin-bottom: 18px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.option-row:last-child {
  margin-bottom: 0;
}

.checkbox-row {
  align-items: center;
}

.checkbox-row .toggle-label {
  flex: 1;
  min-width: 0;
}

.field-label {
  min-width: 88px;
  font-size: 14px;
  color: #475569;
}

.field-input {
  flex: 1;
  min-width: 160px;
  padding: 8px 10px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.field-input.narrow {
  flex: 0;
  min-width: 120px;
}

.field-input:focus {
  outline: none;
  border-color: #667eea;
}

.field-range {
  flex: 1;
  min-width: 120px;
}

.toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #334155;
  cursor: pointer;
  user-select: none;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 15px;
}

button {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.controls .btn-primary {
  flex: 1;
  min-width: 140px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary.btn-outline {
  background: transparent;
  color: #5b21b6;
  border: 2px solid #7c3aed;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.35);
}

.btn-primary.btn-outline:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.08);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-primary.recording {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  animation: pulse 2s infinite;
}

.btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-small {
  padding: 8px 14px;
  font-size: 13px;
  flex: none;
}

.status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ccc;
}

.status-indicator.active {
  background: #f5576c;
  animation: blink 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
