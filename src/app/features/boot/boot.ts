import { Component, ElementRef, OnInit, OnDestroy, inject, input, signal, computed } from '@angular/core';
import { SceneEngineService } from '../../core/services/scene-engine.service';
import { JarvisService } from '../../core/services/jarvis.service';
import { AnimationService } from '../../core/services/animation.service';
import { SceneLifecycle } from '../../core/types/scene.types';
import { MessageState } from '../../shared/interfaces/boot.interface';
import { BOOT_STEPS, BOOT_DELAYS } from '../../shared/constants/boot.constants';

@Component({
  selector: 'app-boot',
  standalone: true,
  templateUrl: './boot.html',
  styleUrl: './boot.scss'
})
export class BootComponent implements OnInit, OnDestroy, SceneLifecycle {
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly jarvisService = inject(JarvisService);
  private readonly animationService = inject(AnimationService);
  private readonly el = inject(ElementRef);

  // Active status and local scroll progress from SceneEngine (0.0 to 1.0)
  public readonly active = input<boolean>(false);
  public readonly progress = input<number>(0);

  // Active typed message list
  public readonly activeMessages = signal<MessageState[]>([]);

  private readonly bootTimeouts: any[] = [];

  // Compute 3D translation styles based on local scroll exit progress
  public readonly containerStyle = computed(() => {
    const prog = this.progress();
    const opacity = 1 - prog;
    
    // Subtle Z translation (up to 200px) and slight blur to avoid distortion on exit
    const translateZ = prog * 200; 
    const blur = prog * 6; 

    return {
      opacity: `${opacity}`,
      transform: `translate3d(0, 0, ${translateZ}px)`,
      filter: `blur(${blur}px)`,
      display: opacity <= 0 ? 'none' : 'flex'
    };
  });

  ngOnInit(): void {
    this.sceneEngine.registerLifecycle('boot', this);
    
    // Lock scrolling on initialization (completely freeze viewport inputs)
    this.sceneEngine.lockScroll();
    
    if (this.animationService.getIsBrowser()) {
      this.runStartupAnimation();
    }
  }

  /**
   * Fades in the container and triggers the progressive boot sequence
   */
  private runStartupAnimation(): void {
    this.jarvisService.setMode('booting');
    this.jarvisService.setProgress(0);

    const container = this.el.nativeElement.querySelector('.boot-container');
    if (container) {
      this.animationService.from(container, {
        opacity: 0,
        z: -100, // emerge from deeper plane
        duration: 1.0,
        ease: 'power2.out',
        onComplete: () => {
          this.runBootFlow();
        }
      });
    } else {
      this.runBootFlow();
    }
  }

  /**
   * Coordinates the accumulating text stack timesteps and progress thresholds
   */
  private runBootFlow(): void {
    const steps = BOOT_STEPS;
    let currentStep = 0;

    const executeStep = () => {
      if (currentStep >= steps.length) {
        // Complete the boot sequence, restore page scrolling
        this.jarvisService.setMode('idle');
        this.sceneEngine.completeBoot();
        
        // Fade in scroll instruction prompt
        const prompt = this.el.nativeElement.querySelector('.prompt-text');
        if (prompt) {
          prompt.classList.add('show-prompt');
        }
        return;
      }

      const step = steps[currentStep];
      this.jarvisService.setProgress(step.progress);
      
      if (step.text === 'Ready.') {
        this.jarvisService.setMode('scanning');
      } else {
        this.jarvisService.setMode('loading');
      }

      // Add message to stack and animate
      this.pushMessageToStack(step.text);

      currentStep++;
      const delay = step.text === 'Ready.' ? BOOT_DELAYS.READY_PACE : BOOT_DELAYS.STEP_PACE;
      const timeout = setTimeout(executeStep, delay);
      this.bootTimeouts.push(timeout);
    };

    // First message triggers shortly after load finishes
    const startupTimeout = setTimeout(executeStep, BOOT_DELAYS.STARTUP);
    this.bootTimeouts.push(startupTimeout);
  }

  /**
   * Pushes a message onto the stack, adjusting opacities of older messages
   */
  private pushMessageToStack(text: string): void {
    const current = this.activeMessages();
    
    // Fade out previous messages completely (non-active messages fade out)
    const updated = current.map(m => ({
      ...m,
      opacity: 0
    }));

    // Push new message with entry shift offset (slides up from 16px)
    updated.push({
      text,
      opacity: 1.0,
      transform: 'translate3d(0, 16px, 0)'
    });

    // Keep only the last 2 items in the list (fading out and fading in) to keep DOM clean
    const cleaned = updated.slice(-2);
    this.activeMessages.set(cleaned);

    // Trigger smooth vertical entry glide in the next frame
    setTimeout(() => {
      this.activeMessages.update(list => {
        if (list.length === 0) return list;
        const lastIdx = list.length - 1;
        list[lastIdx] = { ...list[lastIdx], transform: 'translate3d(0, 0, 0)' };
        return [...list];
      });
    }, BOOT_DELAYS.GLIDE_FRAME);
  }

  // Scene Lifecycle Hooks
  onEnter(): void {
    console.log('[Boot Sequence Scene] Active');
  }

  onLeave(): void {
    console.log('[Boot Sequence Scene] Inactive');
  }

  onProgress(progress: number): void {
    // Scroll progress updates trigger computed styling changes
  }

  ngOnDestroy(): void {
    this.sceneEngine.unregisterLifecycle('boot');
    
    // Ensure scroll lock is ALWAYS lifted on destroy
    this.sceneEngine.unlockScroll();

    // Clear timeouts
    this.bootTimeouts.forEach(t => clearTimeout(t));
  }
}
