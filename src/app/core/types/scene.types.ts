export type SceneId =
  | 'boot'
  | 'identity'
  | 'skills'
  | 'experience'
  | 'ai';

export interface SceneMetadata {
  id: SceneId;
  name: string;
  index: number;
  scrollStart: number; // Normalized start point (0.0 to 1.0) in the scroll range
  scrollEnd: number;   // Normalized end point (0.0 to 1.0) in the scroll range
}

export interface SceneState {
  id: SceneId;
  isActive: boolean;
  progress: number; // Normalized local progress within this specific scene (0.0 to 1.0)
}

export interface SceneLifecycle {
  /**
   * Hook called when the scene enters the viewport (becomes active).
   */
  onEnter?(): void;

  /**
   * Hook called when the scene exits the viewport (becomes inactive).
   */
  onLeave?(): void;

  /**
   * Hook called when the scene's local scroll progress updates.
   * @param progress A value between 0.0 (start) and 1.0 (end).
   */
  onProgress?(progress: number): void;
}
