/**
 * Rotate a 3D point around the Y axis.
 */
export function rotatePointY(
  x: number,
  y: number,
  z: number,
  angle: number
): { x: number; y: number; z: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - z * sin, y, z: x * sin + z * cos };
}

/**
 * Rotate a 3D point around the X axis.
 */
export function rotatePointX(
  x: number,
  y: number,
  z: number,
  angle: number
): { x: number; y: number; z: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x, y: y * cos + z * sin, z: -y * sin + z * cos };
}

/**
 * Generate circular offsets for attribute strength nodes.
 */
export function createStrengthNodes(
  names: string[],
  radius = 115
): { name: string; dx: number; dy: number }[] {
  const count = names.length;
  return names.map((name, idx) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / count;
    return {
      name,
      dx: Math.round(radius * Math.cos(angle)),
      dy: Math.round(radius * Math.sin(angle))
    };
  });
}
