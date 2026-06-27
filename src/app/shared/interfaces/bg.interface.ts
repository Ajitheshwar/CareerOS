export interface BgParticle3D {
  x: number;
  y: number;
  z: number;
  prevX: number;
  prevY: number;
  prevZ: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  colorRgb: string;
  opacity: number;
  type: 'tunnel' | 'stream-left' | 'stream-right' | 'ambient';
  phase: number;
  phaseSpeed: number;
  oscRadius: number;
}
