export type CropPoint = { x: number; y: number };
export type CropSize = { width: number; height: number };

export const PROFILE_CROP_MIN_ZOOM = 1;
export const PROFILE_CROP_MAX_ZOOM = 4;
export const PROFILE_CROP_ZOOM_STEP = 0.2;

export const PROFILE_CROP_OUTPUT_SIZES = {
  avatar: { width: 512, height: 512 },
  cover: { width: 1500, height: 500 },
} as const;

export type ProfileCropKind = keyof typeof PROFILE_CROP_OUTPUT_SIZES;

export function clampCropValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Position is stored as a fraction of the crop viewport. That keeps the
 * visible framing identical when the responsive editor and output canvas
 * have different pixel sizes but the same aspect ratio.
 */
export function getProfileImageLayout(
  image: CropSize,
  crop: CropSize,
  zoom: number,
  position: CropPoint
) {
  const safeZoom = clampCropValue(
    zoom,
    PROFILE_CROP_MIN_ZOOM,
    PROFILE_CROP_MAX_ZOOM
  );
  const baseScale = Math.max(crop.width / image.width, crop.height / image.height);
  const width = image.width * baseScale * safeZoom;
  const height = image.height * baseScale * safeZoom;
  const maxX = Math.max(0, (width - crop.width) / (2 * crop.width));
  const maxY = Math.max(0, (height - crop.height) / (2 * crop.height));
  const safePosition = {
    x: clampCropValue(position.x, -maxX, maxX),
    y: clampCropValue(position.y, -maxY, maxY),
  };

  return {
    zoom: safeZoom,
    width,
    height,
    left: (crop.width - width) / 2 + safePosition.x * crop.width,
    top: (crop.height - height) / 2 + safePosition.y * crop.height,
    position: safePosition,
    limits: { x: maxX, y: maxY },
  };
}

/** Keeps the image point beneath an interaction anchor stationary as zoom changes. */
export function zoomProfileImageAtPoint(
  image: CropSize,
  crop: CropSize,
  currentZoom: number,
  currentPosition: CropPoint,
  nextZoom: number,
  anchor: CropPoint = { x: crop.width / 2, y: crop.height / 2 }
) {
  const current = getProfileImageLayout(image, crop, currentZoom, currentPosition);
  const safeNextZoom = clampCropValue(
    nextZoom,
    PROFILE_CROP_MIN_ZOOM,
    PROFILE_CROP_MAX_ZOOM
  );
  const imageX = (anchor.x - current.left) / current.width;
  const imageY = (anchor.y - current.top) / current.height;
  const nextWidth = (current.width / current.zoom) * safeNextZoom;
  const nextHeight = (current.height / current.zoom) * safeNextZoom;
  const nextLeft = anchor.x - imageX * nextWidth;
  const nextTop = anchor.y - imageY * nextHeight;
  const nextPosition = {
    x: (nextLeft - (crop.width - nextWidth) / 2) / crop.width,
    y: (nextTop - (crop.height - nextHeight) / 2) / crop.height,
  };

  const next = getProfileImageLayout(image, crop, safeNextZoom, nextPosition);
  return { zoom: next.zoom, position: next.position };
}
