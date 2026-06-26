import { SceneId } from './scene.types';

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
