export function useScreenCapture() {
  let stream = null;

  const startCapture = async (sourceId, videoElement) => {
    try {
      // 获取屏幕流
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        }
      });

      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
      }

      return stream;
    } catch (error) {
      console.error('开始捕获失败:', error);
      throw error;
    }
  };

  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  };

  const captureFrame = async (videoElement, canvasElement, options = {}) => {
    const { mimeType = 'image/png', quality, region } = options;
    return new Promise((resolve, reject) => {
      try {
        const video = videoElement;
        const canvas = canvasElement;

        if (region) {
          const { sx, sy, sw, sh } = region;
          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
        } else {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const q =
          mimeType === 'image/png' ? undefined : quality ?? 0.92;
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('无法创建图片'));
            }
          },
          mimeType,
          q
        );
      } catch (error) {
        reject(error);
      }
    });
  };

  return {
    startCapture,
    stopCapture,
    captureFrame
  };
}

