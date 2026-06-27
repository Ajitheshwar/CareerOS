export interface AttributeNode {
  name: string;
  dx: number;
  dy: number;
}

export interface SystemData {
  id: number;
  name: string;
  purpose: string;
  description: string;
  color: string;
  strengthNodes: AttributeNode[];
}

export interface ProjectedSystemNode extends SystemData {
  index: number;
  screenX: number;
  screenY: number;
  zIndex: number;
  opacity: number;
  transform: string;
  scale: number;
  isActive: boolean;
  nodeCenter: number;
  pillOffset: number;
  scaledStrengthNodes: (AttributeNode & { scaledDx: number; scaledDy: number })[];
}

export interface BgParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  opacity: number;
}

export interface CoreSynapse {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  t: number;
  speed: number;
  color: string;
}

export interface EnergyRipple {
  r: number;
  maxR: number;
  opacity: number;
  speed: number;
  color: string;
}
