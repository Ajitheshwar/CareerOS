import { Component, inject, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Layout / Shared components
import { FuturisticBg } from './shared/components/futuristic-bg/futuristic-bg';
import { JarvisCore } from './shared/components/jarvis-core/jarvis-core';

// Scene components
import { BootSequence } from './features/boot-sequence/boot-sequence';
import { IdentityCore } from './features/identity-core/identity-core';
import { SkillsEngine } from './features/skills-engine/skills-engine';
import { ExperienceDatabase } from './features/experience-database/experience-database';
import { EnterpriseOperations } from './features/enterprise-operations/enterprise-operations';
import { ProjectNetwork } from './features/project-network/project-network';
import { AchievementVault } from './features/achievement-vault/achievement-vault';
import { AiCore } from './features/ai-core/ai-core';
import { ContactTerminal } from './features/contact-terminal/contact-terminal';

// Services
import { SceneEngineService } from './core/services/scene-engine.service';
import { AnimationService } from './core/services/animation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FuturisticBg,
    JarvisCore,
    BootSequence,
    IdentityCore,
    SkillsEngine,
    ExperienceDatabase,
    EnterpriseOperations,
    ProjectNetwork,
    AchievementVault,
    AiCore,
    ContactTerminal
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly animationService = inject(AnimationService);

  // Expose state signals
  public readonly isBooting = computed(() => this.sceneEngine.isBooting());
  public readonly sceneState = computed(() => this.sceneEngine.scenesState());

  constructor() {
    // Setup ScrollTrigger once boot sequence completes and scroll element is rendered
    effect(() => {
      const booting = this.isBooting();
      if (!booting) {
        setTimeout(() => {
          this.setupScrollTrigger();
        }, 50);
      }
    });
  }

  /**
   * Setup GSAP ScrollTrigger to capture natural page scroll and pipe progress to the Scene Engine
   */
  private setupScrollTrigger(): void {
    if (!this.animationService.getIsBrowser()) return;

    this.animationService.createScrollTrigger({
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        this.sceneEngine.updateScrollProgress(self.progress);
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up GSAP ScrollTriggers & Timelines
    this.animationService.cleanup();
  }
}
