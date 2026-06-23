import { Component, OnInit, OnDestroy, inject, input } from '@angular/core';
import { SceneEngineService } from '../../core/services/scene-engine.service';
import { SceneLifecycle } from '../../core/types/scene.types';

@Component({
  selector: 'app-skills-engine',
  standalone: true,
  template: `
    @if (active()) {
      <div class="scene-placeholder flex flex-col items-center justify-center absolute inset-0 text-white">
        <h2 class="text-2xl font-mono text-accent-purple tracking-wider">Skills Engine</h2>
        <p class="text-sm opacity-50 mt-2">Scroll progress: {{ (progress() * 100).toFixed(0) }}%</p>
      </div>
    }
  `
})
export class SkillsEngine implements OnInit, OnDestroy, SceneLifecycle {
  private readonly sceneEngine = inject(SceneEngineService);
  
  public readonly active = input<boolean>(false);
  public readonly progress = input<number>(0);

  ngOnInit(): void {
    this.sceneEngine.registerLifecycle('skills', this);
  }

  onEnter(): void {
    console.log('[Scene: Skills Engine] Entered');
  }

  onLeave(): void {
    console.log('[Scene: Skills Engine] Leaved');
  }

  onProgress(progress: number): void {
  }

  ngOnDestroy(): void {
    this.sceneEngine.unregisterLifecycle('skills');
  }
}
