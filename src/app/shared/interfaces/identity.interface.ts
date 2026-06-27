export interface AttributeFragment {
  text: string;
  color: string;
  // Spherical Coordinates
  r: number;
  theta: number;
  phi: number;
  // Rotation speeds
  speed: number;
  phiSpeed: number;
}

export interface ProjectedFragment {
  text: string;
  color: string;
  transform: string;
  opacity: number;
  zIndex: number;
  vectorLength: number;
  vectorRotation: string;
}

export interface CoreParticle3D {
  x: number;
  y: number;
  z: number;
  r: number; // radius from center
  theta: number;
  phi: number;
  speed: number;
  size: number;
  colorRgb: string;
  opacity: number;
}
