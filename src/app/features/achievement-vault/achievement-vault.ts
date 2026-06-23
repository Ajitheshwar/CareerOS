import { Component, OnInit, OnDestroy, inject, input } from '@angular/core';
import { SceneEngineService } from '../../core/services/scene-engine.service';
import { SceneLifecycle } from '../../core/types/scene.types';

@Component({
  selector: 'app-achievement-vault',
  standalone: true,
  template: `
    @if (active()) {
      <div class="scene-placeholder flex flex-col items-center justify-center absolute inset-0 text-white">
        <h2 class="text-2xl font-mono text-accent-purple tracking-wider">Achievement Vault</h2>
        <p class="text-sm opacity-50 mt-2">Scroll progress: {{ (progress() * 100).toFixed(0) }}%</p>
      </div>
    }
  `
})
export class AchievementVault implements OnInit, OnDestroy, SceneLifecycle {
  private readonly sceneEngine = inject(SceneEngineService);
  
  public readonly active = input<boolean>(false);
  public readonly progress = input<number>(0);

  ngOnInit(): void {
    this.sceneEngine.registerLifecycle('achievements', this);
  }

  onEnter(): void {
    console.log('[Scene: Achievement Vault] Entered');
  }

  onLeave(): void {
    console.log('[Scene: Achievement Vault] Leaved');
  }

  onProgress(progress: number): void {
  }

  ngOnDestroy(): void {
    this.sceneEngine.unregisterLifecycle('achievements');
  }
}
