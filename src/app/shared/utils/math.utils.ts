/**
 * Easing function: fast start, slow end.
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Standard smoothstep interpolation clamped between 0 and 1.
 */
export function smoothstep(x: number): number {
  const clamped = Math.min(1.0, Math.max(0.0, x));
  return clamped * clamped * (3 - 2 * clamped);
}
