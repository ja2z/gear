/**
 * Optional manual focal overrides for hero `background-position` (percent 0–100).
 * Key = image basename without extension (e.g. IMG_0406), same keys as
 * heroFocalPoints.generated.json. Overrides win over auto variance-based focal.
 *
 * Use when auto saliency is off (e.g. you want a face pinned even if texture
 * elsewhere pulls the crop).
 */
export const HERO_FOCAL_OVERRIDES = {
  // Example: IMG_1234: { x: 50, y: 28 },
};
