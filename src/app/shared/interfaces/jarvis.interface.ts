import { SceneId } from './scene.interface';

export type JarvisMode = 'booting' | 'idle' | 'scanning' | 'loading' | 'speaking' | 'interacting';

export type JarvisPosition = 'center' | 'floating' | 'final';

export interface JarvisMessage {
  text: string;
  duration?: number; // Optional duration in milliseconds
  showProgressBar?: boolean;
}

export interface JarvisState {
  mode: JarvisMode;
  position: JarvisPosition;
  currentMessage: string | null;
  progress: number; // Overall progress or scanning progress (0 to 100)
  activeSceneId: SceneId;
}

export interface Particle3D {
  r: number;       // base sphere radius
  theta: number;   // longitude angle
  phi: number;     // latitude angle
  speed: number;   // orbital speed
  phiSpeed: number;// vertical float speed
  size: number;    // physical base size
  colorRgb: string;// color channel representation
  pulsePhase: number;
  pulseSpeed: number;
  // Computed 3D Coordinates
  x: number;
  y: number;
  z: number;
}

export interface Fragment3D {
  r: number;
  theta: number;
  phi: number;
  speed: number;
  phiSpeed: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  type: 'triangle' | 'square' | 'line';
  colorRgb: string;
  // Computed 3D Coordinates
  x: number;
  y: number;
  z: number;
}

export interface Spark3D {
  r: number;        // distance from center
  theta: number;    // angle in XY plane
  phi: number;      // angle in Z plane
  speed: number;    // radial speed outwards
  length: number;   // tail length
  width: number;    // spark line thickness
  life: number;     // current life ticks
  maxLife: number;  // max life ticks
  colorRgb: string;
}

export type DepthSortedObject =
  | { type: 'particle'; obj: Particle3D; z: number }
  | { type: 'fragment'; obj: Fragment3D; z: number };
