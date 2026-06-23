import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SceneEngineService } from './scene-engine.service';
import { JarvisState, JarvisMode, JarvisPosition } from '../types/jarvis.types';

@Injectable({
  providedIn: 'root'
})
export class JarvisService {
  private readonly sceneEngine = inject(SceneEngineService);

  // Core JARVIS State Signal
  private readonly stateSignal = signal<JarvisState>({
    mode: 'booting',
    position: 'center',
    currentMessage: null,
    progress: 0,
    activeSceneId: 'boot'
  });

  // Expose read-only state and individual computed properties
  public readonly state = this.stateSignal.asReadonly();
  public readonly mode = computed(() => this.state().mode);
  public readonly position = computed(() => this.state().position);
  public readonly currentMessage = computed(() => this.state().currentMessage);
  public readonly progress = computed(() => this.state().progress);

  private messageTimeout: any = null;

  constructor() {
    // Automatically keep JARVIS aware of Scene Engine changes
    effect(() => {
      const activeSceneId = this.sceneEngine.activeSceneId();
      const isBooting = this.sceneEngine.isBooting();
      const bootState = this.sceneEngine.scenesState()['boot'];
      const bootScrollProgress = bootState ? bootState.progress : 0;

      this.stateSignal.update(current => {
        let newPosition: JarvisPosition = current.position;
        let newMode: JarvisMode = current.mode;

        // Keep Jarvis in the center during booting or while still early in the boot scene scroll (under 50%)
        if (isBooting || (activeSceneId === 'boot' && bootScrollProgress < 0.5)) {
          newPosition = 'center';
          newMode = isBooting ? 'booting' : 'scanning';
        } else {
          // Transition to float-right once we scroll past 50% or enter other scenes
          if (current.position === 'center') {
            newPosition = 'float-right';
            newMode = 'idle';
          }
        }

        return {
          ...current,
          activeSceneId,
          position: newPosition,
          mode: newMode
        };
      });
    });
  }

  /**
   * Set JARVIS's current operating mode
   */
  public setMode(mode: JarvisMode): void {
    this.stateSignal.update(state => ({ ...state, mode }));
  }

  /**
   * Set JARVIS's relative position (center, float-right, float-bottom)
   */
  public setPosition(position: JarvisPosition): void {
    this.stateSignal.update(state => ({ ...state, position }));
  }

  /**
   * Set companion progress indicator (0 to 100)
   */
  public setProgress(progress: number): void {
    const clampedProgress = Math.min(Math.max(Math.round(progress), 0), 100);
    this.stateSignal.update(state => ({ ...state, progress: clampedProgress }));
  }

  /**
   * Display a guidance message from JARVIS Core.
   * @param text The text message to display.
   * @param duration Optional duration in milliseconds after which the message clears.
   */
  public showMessage(text: string, duration?: number): void {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }

    this.stateSignal.update(state => ({
      ...state,
      currentMessage: text
    }));

    if (duration && duration > 0) {
      this.messageTimeout = setTimeout(() => {
        this.clearMessage();
      }, duration);
    }
  }

  /**
   * Clear the active message
   */
  public clearMessage(): void {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }

    this.stateSignal.update(state => ({
      ...state,
      currentMessage: null
    }));
  }

  /**
   * Trigger a custom action or system update sequence
   */
  public triggerSystemScan(): void {
    this.setMode('scanning');
    this.setProgress(0);
    
    // Simulate scan progression for core feedback loop
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      this.setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        this.setMode('idle');
      }
    }, 50);
  }
}
