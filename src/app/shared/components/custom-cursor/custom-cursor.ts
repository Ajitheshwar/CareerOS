import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CursorService, CursorState } from '../../../core/services/cursor.service';
import { AnimationService } from '../../../core/services/animation.service';

interface CursorParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

@Component({
  selector: 'app-custom-cursor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-cursor.html',
  styleUrl: './custom-cursor.scss'
})
export class CustomCursor implements OnInit, AfterViewInit, OnDestroy {
  public readonly cursorService = inject(CursorService);
  private readonly animationService = inject(AnimationService);

  // Expose signals from service
  public readonly state = computed(() => this.cursorService.state());
  public readonly themeColor = computed(() => this.cursorService.themeColor());
  public readonly isScrolling = computed(() => this.cursorService.isScrolling());

  // Screen layout limits (for hiding custom cursor on mobile/touch viewports)
  public readonly isVisible = computed(() => {
    if (typeof window === 'undefined') return false;
    const isMobile = window.innerWidth < 1024;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    return !isMobile && !isTouch;
  });

  // Smooth position signals driven by requestAnimationFrame ticks
  public readonly smoothX = signal<number>(0);
  public readonly smoothY = signal<number>(0);

  // Computes the container translation matrix
  public readonly cursorTransform = computed(() => {
    return `translate3d(${this.smoothX().toFixed(1)}px, ${this.smoothY().toFixed(1)}px, 0px)`;
  });

  // Track active trail particles
  public readonly particles = signal<CursorParticle[]>([]);

  private frameId: number | null = null;
  private currentX = 0;
  private currentY = 0;
  private lastSpawnX = 0;
  private lastSpawnY = 0;
  private particleIdCounter = 0;

  constructor() {
    // Sync initial position when visible triggers
    effect(() => {
      if (this.isVisible()) {
        this.currentX = this.cursorService.mouseX();
        this.currentY = this.cursorService.mouseY();
        this.smoothX.set(this.currentX);
        this.smoothY.set(this.currentY);
      }
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.animationService.getIsBrowser()) {
      this.startLoop();
    }
  }

  private startLoop(): void {
    if (this.frameId) return;

    const tick = () => {
      if (!this.isVisible()) {
        this.frameId = requestAnimationFrame(tick);
        return;
      }

      this.updatePositions();
      this.updateParticles();
      this.frameId = requestAnimationFrame(tick);
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private updatePositions(): void {
    const targetX = this.cursorService.mouseX();
    const targetY = this.cursorService.mouseY();
    const lerpFactor = 0.16;

    this.currentX += (targetX - this.currentX) * lerpFactor;
    this.currentY += (targetY - this.currentY) * lerpFactor;

    this.smoothX.set(this.currentX);
    this.smoothY.set(this.currentY);
  }

  private updateParticles(): void {
    const currentList = this.particles();
    const updatedList: CursorParticle[] = [];

    // 1. Move and fade existing particles
    currentList.forEach(p => {
      const nextOpacity = p.opacity - 0.04;
      const nextSize = p.size * 0.95;
      if (nextOpacity > 0.01 && nextSize > 0.2) {
        updatedList.push({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          opacity: nextOpacity,
          size: nextSize
        });
      }
    });

    // 2. Determine if we should spawn new trail particles
    const distSq = Math.pow(this.currentX - this.lastSpawnX, 2) + Math.pow(this.currentY - this.lastSpawnY, 2);
    const cursorMoved = distSq > 36; // 6px threshold
    const isDragging = this.state() === 'DRAG';
    const isScrollingActive = this.isScrolling();

    if (cursorMoved || isDragging || isScrollingActive) {
      this.lastSpawnX = this.currentX;
      this.lastSpawnY = this.currentY;

      // Spawn 1 particle (or 2 if dragging/scrolling)
      const count = (isDragging || isScrollingActive) ? 2 : 1;
      const activeColor = this.themeColor();

      for (let i = 0; i < count; i++) {
        // Particles drift slightly backwards
        const angle = Math.random() * Math.PI * 2;
        const driftSpeed = isDragging ? 2.5 : (isScrollingActive ? 2.0 : 0.8);
        const vx = Math.cos(angle) * (Math.random() * 0.5 + 0.1) - (isScrollingActive ? 0 : Math.cos(angle) * driftSpeed);
        const vy = Math.sin(angle) * (Math.random() * 0.5 + 0.1) - (isScrollingActive ? (Math.random() * 2 + 1) : 0); // drift upwards on scroll

        updatedList.push({
          id: this.particleIdCounter++,
          x: this.currentX + (Math.random() - 0.5) * 8,
          y: this.currentY + (Math.random() - 0.5) * 8,
          vx,
          vy,
          size: Math.random() * 4 + 2, // 2px to 6px
          opacity: 0.8,
          color: activeColor
        });
      }
    }

    // Limit active particles count to prevent memory leaks (max 30)
    if (updatedList.length > 30) {
      updatedList.splice(0, updatedList.length - 30);
    }

    this.particles.set(updatedList);
  }

  ngOnDestroy(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
