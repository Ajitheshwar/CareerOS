export interface Milestone {
  id: number;
  year: string;
  title: string;
  designation?: string;
  company?: string;
  project?: string;
  story: string;
  tech: string[];
  contributions: string[];
  challenges: string[];
  impact: string[];
  learnings: string[];
  side: 'left' | 'right';
  x: number;
  y: number;
  z: number;
  color: string;
  colorRgb: string;
}

export interface AmbientStar {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
}

export interface WindingParticle {
  startIdx: number;
  endIdx: number;
  t: number;          // progression 0.0 to 1.0
  speed: number;
  color: string;
  size: number;
  angleOffset: number;
}
