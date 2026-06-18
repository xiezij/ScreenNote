import { ref } from 'vue';

/** 录屏画质档位对应目标 videoBitsPerSecond（bps）；实际码率由浏览器/编码器决定。 */
export const RECORDING_VIDEO_BPS = {
  high: 8_000_000,
  mid: 2_500_000,
  low: 1_000_000
};

export function videoBitsPerSecondForQuality(quality) {
  if (quality === 'high' || quality === 'low') {
    return RECORDING_VIDEO_BPS[quality];
  }
  return RECORDING_VIDEO_BPS.mid;
}

const PRESET_CANDIDATES = {
  vp9: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
  vp8: ['video/webm;codecs=vp8', 'video/webm']
};

function pickMimeType(preset) {
  const list = PRESET_CANDIDATES[preset] || PRESET_CANDIDATES.vp9;
  for (const c of list) {
    if (MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return 'video/webm';
}

export function useRecording() {
  const mediaRecorder = ref(null);
  const recordedChunks = ref([]);
  let stopCallback = null;
  let activeMimeType = 'video/webm';

  const startRecording = async (stream, onStop, options = {}) => {
    try {
      recordedChunks.value = [];
      stopCallback = onStop;
      const preset = options.preset === 'vp8' ? 'vp8' : 'vp9';
      activeMimeType = pickMimeType(preset);

      const recorderOptions = {
        mimeType: activeMimeType,
        videoBitsPerSecond: options.videoBitsPerSecond ?? RECORDING_VIDEO_BPS.mid
      };

      mediaRecorder.value = new MediaRecorder(stream, recorderOptions);

      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.value.push(event.data);
        }
      };

      mediaRecorder.value.onstop = () => {
        if (stopCallback) {
          stopCallback(recordedChunks.value, { mimeType: activeMimeType });
        }
      };

      mediaRecorder.value.start(100);
    } catch (error) {
      console.error('开始录屏失败:', error);
      throw error;
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
      mediaRecorder.value.stop();
    }
  };

  return {
    mediaRecorder,
    recordedChunks,
    startRecording,
    stopRecording
  };
}
