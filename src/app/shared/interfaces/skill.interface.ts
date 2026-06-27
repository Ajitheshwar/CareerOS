export interface Skill {
  id: string;
  name: string;
  isPrimary: boolean;
  description: string;
  stageIndex: number;
  angle: number;
  radius: number;
  color: string;
  colorRgb: string;
}

export interface ProjectedSkillNode {
  id: string;
  name: string;
  isPrimary: boolean;
  description: string;
  transform: string;
  opacity: number;
  zIndex: number;
  color: string;
  vectorLength: number;
  vectorRotation: string;
}

export interface CanvasParticle {
  x: number;
  y: number;
  z: number;
  speed: number;
  size: number;
  color: string;
  opacity: number;
  angle?: number;
}

export interface SidebarBlock {
  title: string;
  borderColorClass: string;
  textColorClass: string;
  items: string[];
}
