/**
 * Shared math for placing a screenshot inside the frame with "object-fit: cover"
 * behavior, while zooming toward an arbitrary focal point (fraction 0-1 of the
 * image's natural size). Overlay markers (e.g. a highlight ring) are positioned
 * using the same box so they track the image exactly through the zoom.
 */

export type CoverBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function computeCoverBox(params: {
  frameWidth: number;
  frameHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  focalX: number; // 0-1
  focalY: number; // 0-1
  zoom: number; // 1 = just covers the frame, >1 = zoomed in further
  anchorX?: number; // 0-1, where in the frame the focal point should sit
  anchorY?: number;
}): CoverBox {
  const {
    frameWidth,
    frameHeight,
    naturalWidth,
    naturalHeight,
    focalX,
    focalY,
    zoom,
    anchorX = 0.5,
    anchorY = 0.5,
  } = params;

  const coverScale = Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight);
  const totalScale = coverScale * zoom;

  const width = naturalWidth * totalScale;
  const height = naturalHeight * totalScale;

  let left = frameWidth * anchorX - focalX * width;
  let top = frameHeight * anchorY - focalY * height;

  // Clamp so we never reveal empty space beyond the image edges.
  left = Math.min(0, Math.max(frameWidth - width, left));
  top = Math.min(0, Math.max(frameHeight - height, top));

  return { left, top, width, height };
}

export function mapPointToScreen(box: CoverBox, fx: number, fy: number) {
  return {
    x: box.left + fx * box.width,
    y: box.top + fy * box.height,
  };
}
