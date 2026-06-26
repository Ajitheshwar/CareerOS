import { Injectable, signal, computed } from '@angular/core';
import { SceneId, SceneMetadata, SceneState, SceneLifecycle } from '../types/scene.types';

@Injectable({
  providedIn: 'root'
})
export class SceneEngineService {
  // Configurable threshold for Boot Sequence scroll range (0.0 to bootThreshold)
  // This can be adjusted at runtime to change the length of the exit animation
  public readonly bootThreshold = signal<number>(0.10);

  private readonly scenesList: { id: SceneId; name: string }[] = [
    { id: 'boot', name: 'Boot Sequence' },
    { id: 'identity', name: 'Identity Core' },
    { id: 'skills', name: 'Skills Engine' },
    { id: 'experience', name: 'Experience Database' },
    { id: 'ai', name: 'AI Core' }
  ];

  // Track viewport height to calculate vh-based heights dynamically
  public readonly viewportHeight = signal<number>(
    typeof window !== 'undefined' ? window.innerHeight : 1080
  );

  // Configurable heights per scene (mixing relative and absolute pixel heights)
  private readonly sceneHeights: Record<SceneId, (viewportHeight: number) => number> = {
    boot: (vh) => vh * 0.5,
    identity: (vh) => vh * 0.75,
    skills: (vh) => 1250, // 5 stages * 250px = 1250px
    experience: (vh) => 6400,
    ai: (vh) => vh
  };

  // Compute the total page scroll height dynamically in pixels
  public readonly totalScrollHeight = computed(() => {
    const vh = this.viewportHeight();
    return this.scenesList.reduce((sum, scene) => sum + this.sceneHeights[scene.id](vh), 0);
  });

  // Dynamically compute scroll starts and ends mapped to normalized 0.0 - 1.0 ranges
  public readonly scenesMetadata = computed<SceneMetadata[]>(() => {
    const vh = this.viewportHeight();
    const totalHeight = this.totalScrollHeight();
    
    let currentScrollPixel = 0;

    return this.scenesList.map((scene, idx) => {
      const height = this.sceneHeights[scene.id](vh);
      const startPixel = currentScrollPixel;
      const endPixel = currentScrollPixel + height;
      currentScrollPixel = endPixel;

      return {
        id: scene.id,
        name: scene.name,
        index: idx,
        scrollStart: totalHeight > 0 ? startPixel / totalHeight : 0,
        scrollEnd: totalHeight > 0 ? endPixel / totalHeight : 0
      };
    });
  });

  // Registry for active scene lifecycle hooks (registered by components)
  private readonly sceneLifecycles = new Map<SceneId, SceneLifecycle>();

  // State Signals
  public readonly isBooting = signal<boolean>(true);
  public readonly globalScrollProgress = signal<number>(0); // 0.0 to 1.0
  public readonly activeSceneId = signal<SceneId>('boot');

  // Compute active scene metadata
  public readonly activeSceneMetadata = computed(() => 
    this.scenesMetadata().find(s => s.id === this.activeSceneId()) || null
  );

  // Compute states for all scenes so components can reactively bind to them
  public readonly scenesState = computed<Record<SceneId, SceneState>>(() => {
    const activeId = this.activeSceneId();
    const globalProgress = this.globalScrollProgress();
    const booting = this.isBooting();

    const states = {} as Record<SceneId, SceneState>;

    this.scenesMetadata().forEach(meta => {
      if (booting) {
        states[meta.id] = {
          id: meta.id,
          isActive: meta.id === 'boot',
          progress: meta.id === 'boot' ? 0.0 : 0.0
        };
      } else {
        const isActive = meta.id === activeId;
        let progress = 0;

        if (globalProgress >= meta.scrollEnd) {
          progress = 1.0;
        } else if (globalProgress <= meta.scrollStart) {
          progress = 0.0;
        } else {
          // Normalize local progress within the scene's scroll boundaries
          progress = (globalProgress - meta.scrollStart) / (meta.scrollEnd - meta.scrollStart);
        }

        states[meta.id] = {
          id: meta.id,
          isActive,
          progress: Math.min(Math.max(progress, 0), 1)
        };
      }
    });

    return states;
  });

  // Event handlers for locking scroll
  private readonly preventScroll = (e: Event): void => {
    e.preventDefault();
  };

  private readonly preventKeyboardScroll = (e: KeyboardEvent): void => {
    const keys = ['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
    if (keys.includes(e.code)) {
      e.preventDefault();
    }
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResize);
    }
  }

  private readonly onResize = (): void => {
    this.viewportHeight.set(window.innerHeight);
  };

  /**
   * Disables all wheel, touch, keyboard, and trackpad scrolling.
   */
  public lockScroll(): void {
    if (typeof window === 'undefined') return;

    // Apply native overflow hidden
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Block interactive hardware events
    window.addEventListener('wheel', this.preventScroll, { passive: false });
    window.addEventListener('touchmove', this.preventScroll, { passive: false });
    window.addEventListener('keydown', this.preventKeyboardScroll, { passive: false });
  }

  /**
   * Restores clean scrolling to the page.
   */
  public unlockScroll(): void {
    if (typeof window === 'undefined') return;

    // Restore standard overflow configurations
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    // Remove hardware scroll block listeners
    window.removeEventListener('wheel', this.preventScroll);
    window.removeEventListener('touchmove', this.preventScroll);
    window.removeEventListener('keydown', this.preventKeyboardScroll);
  }

  /**
   * Register a scene's lifecycle hooks
   */
  public registerLifecycle(id: SceneId, hooks: SceneLifecycle): void {
    this.sceneLifecycles.set(id, hooks);
    
    // If the registered scene is already active, trigger its enter hook
    if (this.activeSceneId() === id) {
      hooks.onEnter?.();
    }
  }

  /**
   * Unregister a scene's lifecycle hooks
   */
  public unregisterLifecycle(id: SceneId): void {
    this.sceneLifecycles.delete(id);
  }

  /**
   * Complete the boot sequence and unlock scrolling
   */
  public completeBoot(): void {
    if (this.isBooting()) {
      this.isBooting.set(false);
      this.activeSceneId.set('boot'); // Set active to boot at scroll position 0.0
      this.unlockScroll();
    }
  }

  /**
   * Synchronize the scroll progress (driven by GSAP ScrollTrigger or scroll events)
   * @param progress Normalized global scroll progress (0.0 to 1.0)
   */
  public updateScrollProgress(progress: number): void {
    if (this.isBooting()) return;

    // Clamp progress
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    this.globalScrollProgress.set(clampedProgress);

    // Identify active scene based on current scroll position
    let newActiveId: SceneId = 'boot';
    
    for (const meta of this.scenesMetadata()) {
      // If scroll falls within the scene range, set it as active
      if (clampedProgress >= meta.scrollStart && clampedProgress <= meta.scrollEnd) {
        newActiveId = meta.id;
        break;
      }
    }

    const previousActiveId = this.activeSceneId();

    // If active scene changed, handle enter/leave hooks
    if (newActiveId !== previousActiveId) {
      // Leave old scene
      const prevHooks = this.sceneLifecycles.get(previousActiveId);
      prevHooks?.onLeave?.();

      // Set new active scene
      this.activeSceneId.set(newActiveId);

      // Enter new scene
      const nextHooks = this.sceneLifecycles.get(newActiveId);
      nextHooks?.onEnter?.();
    }

    // Trigger local progress hooks for the active scene
    const activeMeta = this.activeSceneMetadata();
    if (activeMeta) {
      const state = this.scenesState()[activeMeta.id];
      const hooks = this.sceneLifecycles.get(activeMeta.id);
      hooks?.onProgress?.(state.progress);
    }
  }

  /**
   * Get all registered scenes metadata for navigation
   */
  public getScenesMetadata(): SceneMetadata[] {
    return [...this.scenesMetadata()];
  }
}
