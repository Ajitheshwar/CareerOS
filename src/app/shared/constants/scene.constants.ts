import { SceneId } from '../interfaces/scene.interface';

export const SCENES_LIST: { id: SceneId; name: string }[] = [
  { id: 'boot', name: 'Boot Sequence' },
  { id: 'identity', name: 'Identity Core' },
  { id: 'skills', name: 'Skills Engine' },
  { id: 'experience', name: 'Experience Database' },
  { id: 'ai', name: 'AI Core' }
];

export const SCENE_HEIGHTS: Record<SceneId, (viewportHeight: number) => number> = {
  boot: (vh) => vh * 0.5,
  identity: (vh) => vh * 0.75,
  skills: () => 1250, // 5 stages * 250px = 1250px
  experience: () => 6400,
  ai: (vh) => vh
};
