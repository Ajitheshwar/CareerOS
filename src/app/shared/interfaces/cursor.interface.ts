export type CursorState =
  | 'DEFAULT'
  | 'HOVER'
  | 'CLICK'
  | 'DRAG'
  | 'LOADING'
  | 'PRECISION'
  | 'LINK'
  | 'DISABLED';

export interface CursorParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}
