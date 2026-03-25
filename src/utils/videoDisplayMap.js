/**
 * 将相对于 video 元素可视区域内的坐标映射到视频原始像素坐标（object-fit: contain）
 */
export function clientPointToVideoPixel(videoEl, clientX, clientY) {
  const rect = videoEl.getBoundingClientRect();
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  if (!vw || !vh || rect.width === 0 || rect.height === 0) return null;

  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const scale = Math.min(rect.width / vw, rect.height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const offX = (rect.width - dw) / 2;
  const offY = (rect.height - dh) / 2;

  if (x < offX || x > offX + dw || y < offY || y > offY + dh) return null;

  const vx = (x - offX) / scale;
  const vy = (y - offY) / scale;
  return {
    x: Math.max(0, Math.min(vw - 1, Math.round(vx))),
    y: Math.max(0, Math.min(vh - 1, Math.round(vy)))
  };
}

/**
 * 将两角点规范为视频像素空间内的矩形 { sx, sy, sw, sh }
 */
export function normalizeVideoRect(videoEl, x1, y1, x2, y2) {
  const p1 = clientPointToVideoPixel(videoEl, x1, y1);
  const p2 = clientPointToVideoPixel(videoEl, x2, y2);
  if (!p1 || !p2) return null;

  const sx = Math.min(p1.x, p2.x);
  const sy = Math.min(p1.y, p2.y);
  const sw = Math.max(1, Math.abs(p2.x - p1.x));
  const sh = Math.max(1, Math.abs(p2.y - p1.y));

  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  return {
    sx: Math.max(0, sx),
    sy: Math.max(0, sy),
    sw: Math.min(vw - sx, sw),
    sh: Math.min(vh - sy, sh)
  };
}

/**
 * 视频像素矩形 → 相对 overlay 父元素的 CSS 像素位置（用于绘制选框）
 */
export function videoRectToOverlayStyle(videoEl, overlayParentEl, sx, sy, sw, sh) {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  if (!vw || !vh) return null;

  const vRect = videoEl.getBoundingClientRect();
  const pRect = overlayParentEl.getBoundingClientRect();
  const scale = Math.min(vRect.width / vw, vRect.height / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const offX = vRect.left - pRect.left + (vRect.width - dw) / 2;
  const offY = vRect.top - pRect.top + (vRect.height - dh) / 2;

  return {
    left: `${offX + sx * scale}px`,
    top: `${offY + sy * scale}px`,
    width: `${sw * scale}px`,
    height: `${sh * scale}px`
  };
}
