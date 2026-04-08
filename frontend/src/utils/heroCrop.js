import focalGenerated from '../config/heroFocalPoints.generated.json';
import { HERO_FOCAL_OVERRIDES } from '../config/heroFocalOverrides';

/**
 * Hero `background-size: cover` is aggressive. The layer is drawn this much larger
 * than the visible box (centered, parent clips) so photos feel slightly less “zoomed in.”
 * 1.09 ≈ ~8–9% more scene visible on each axis vs plain cover.
 */
export const HERO_COVER_RELAX_FACTOR = 1.09;

/** @param {string} imagePath public URL e.g. /images/IMG_0406.png or .webp */
function basenameKey(imagePath) {
  const base = imagePath.split('/').pop() || '';
  return base.replace(/\.[^.]+$/, '');
}

/**
 * CSS background-position for `background-size: cover` hero images.
 * Prefers manual overrides, then build-time variance saliency, then a mild top bias
 * for unknown keys (common phone portraits with the subject high in frame).
 */
export function getHeroBackgroundPosition(imagePath) {
  if (!imagePath) return '50% 42%';

  const key = basenameKey(imagePath);
  const manual = HERO_FOCAL_OVERRIDES[key];
  if (manual && typeof manual.x === 'number' && typeof manual.y === 'number') {
    return `${manual.x}% ${manual.y}%`;
  }

  const auto = focalGenerated[key];
  if (auto && typeof auto.x === 'number' && typeof auto.y === 'number') {
    return `${auto.x}% ${auto.y}%`;
  }

  return '50% 42%';
}
