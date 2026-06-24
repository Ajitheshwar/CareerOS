import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, effect } from '@angular/core';
import { JarvisService } from '../../../core/services/jarvis.service';
import { AnimationService } from '../../../core/services/animation.service';
import { SceneEngineService } from '../../../core/services/scene-engine.service';

interface BgParticle3D {
  x: number;
  y: number;
  z: number;
  prevX: number;
  prevY: number;
  prevZ: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  colorRgb: string;
  opacity: number;
  type: 'tunnel' | 'stream-left' | 'stream-right' | 'ambient';
  phase: number;
  phaseSpeed: number;
  oscRadius: number;
}

@Component({
  selector: 'app-futuristic-bg',
  standalone: true,
  templateUrl: './futuristic-bg.html',
  styleUrl: './futuristic-bg.scss'
})
export class FuturisticBg implements OnInit, AfterViewInit, OnDestroy {
  private readonly jarvisService = inject(JarvisService);
  private readonly animationService = inject(AnimationService);
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly el = inject(ElementRef);

  // Expose progress signal
  public readonly progress = this.jarvisService.progress;
  public readonly activeSceneId = this.sceneEngine.activeSceneId;

  // 3D Canvas Particle Swarm variables
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private bgParticles: BgParticle3D[] = [];
  
  // Interactive mouse parallax variables
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  // Particle speed multiplier to control pacing
  private readonly speedMultiplier = 0.25;

  private readonly colorPalette = [
    '34, 211, 238',  // Cyan (#22d3ee)
    '139, 92, 246', // Purple (#8b5cf6)
    '45, 212, 191', // Teal (#2dd4bf)
    '255, 255, 255' // White
  ];

  constructor() {
    // Watch progress for spatial camera shockwaves
    effect(() => {
      const prog = this.progress();
      if (prog > 0) {
        this.triggerSpatialReaction(prog);
      }
    });
  }

  ngOnInit(): void {
    if (this.animationService.getIsBrowser()) {
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('resize', this.onResize);
    }
  }

  ngAfterViewInit(): void {
    if (this.animationService.getIsBrowser()) {
      this.initCanvasSimulation();
    }
  }

  private getRandomColor(): string {
    const chance = Math.random();
    if (chance > 0.85) return this.colorPalette[1]; // Purple
    if (chance > 0.60) return this.colorPalette[2]; // Teal
    if (chance > 0.50) return this.colorPalette[3]; // White
    return this.colorPalette[0]; // Cyan default
  }

  /**
   * Initializes the 3D background particle canvas simulation
   */
  private initCanvasSimulation(): void {
    this.canvas = this.el.nativeElement.querySelector('.bg-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Populate particles (approx 350 particles)
    this.bgParticles = [];
    
    // 1. Tunnel Particles (approx 180): Forms a 3D depth cylinder rushing at camera
    for (let i = 0; i < 180; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 450 + 130;
      const z = Math.random() * -1600;
      this.bgParticles.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: z,
        prevX: Math.cos(angle) * radius,
        prevY: Math.sin(angle) * radius,
        prevZ: z,
        vx: 0,
        vy: 0,
        vz: (Math.random() * 18 + 12) * this.speedMultiplier, // High-speed rushing velocity for clear depth movement
        size: Math.random() * 2.0 + 1.2,
        colorRgb: this.getRandomColor(),
        opacity: Math.random() * 0.7 + 0.3,
        type: 'tunnel',
        phase: 0,
        phaseSpeed: 0,
        oscRadius: 0
      });
    }

    // 2. Horizontal Stream Particles (approx 120): Flowing out from the core sides
    for (let i = 0; i < 120; i++) {
      const isLeft = Math.random() > 0.5;
      const xStart = (Math.random() * 80 + 140) * (isLeft ? -1 : 1);
      const z = Math.random() * -400 - 100;
      this.bgParticles.push({
        x: xStart,
        y: 0,
        z: z,
        prevX: xStart,
        prevY: 0,
        prevZ: z,
        vx: (Math.random() * 14.0 + 10.0) * (isLeft ? -1 : 1) * this.speedMultiplier, // Fast horizontal flow
        vy: 0,
        vz: 0,
        size: Math.random() * 1.6 + 1.0,
        colorRgb: Math.random() > 0.4 ? '34, 211, 238' : '45, 212, 191',
        opacity: Math.random() * 0.8 + 0.2,
        type: isLeft ? 'stream-left' : 'stream-right',
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: (Math.random() * 0.06 + 0.02) * this.speedMultiplier,
        oscRadius: Math.random() * 40 + 20
      });
    }

    // 3. Ambient Space Dust Particles (approx 50): Slowly drifting ambient layer
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 2000 - 1000;
      const y = Math.random() * 1200 - 600;
      const z = Math.random() * -1000;
      this.bgParticles.push({
        x: x,
        y: y,
        z: z,
        prevX: x,
        prevY: y,
        prevZ: z,
        vx: (Math.random() * 3.6 - 1.8) * this.speedMultiplier, // Active drift
        vy: (Math.random() * 3.6 - 1.8) * this.speedMultiplier,
        vz: (Math.random() * 3.6 - 1.8) * this.speedMultiplier,
        size: Math.random() * 1.5 + 0.8,
        colorRgb: this.getRandomColor(),
        opacity: Math.random() * 0.4 + 0.1,
        type: 'ambient',
        phase: 0,
        phaseSpeed: 0,
        oscRadius: 0
      });
    }

    this.startAnimation();
  }

  private startAnimation(): void {
    const tick = () => {
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  private renderFrame(): void {
    if (!this.canvas || !this.ctx) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;

    this.ctx.clearRect(0, 0, width, height);

    const focalLength = 300;

    // Smoothly ease interactive camera coordinates
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.06;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.06;

    this.bgParticles.forEach(p => {
      // Store current as previous coordinates for lines/streaks
      p.prevX = p.x;
      p.prevY = p.y;
      p.prevZ = p.z;

      if (p.type === 'tunnel') {
        p.z += p.vz;
        
        // Wrap around once past camera viewport
        if (p.z >= 200) {
          p.z = -1600;
          p.prevZ = -1600;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 450 + 130;
          p.x = Math.cos(angle) * radius;
          p.y = Math.sin(angle) * radius;
          p.prevX = p.x;
          p.prevY = p.y;
        }
      } else if (p.type === 'stream-left' || p.type === 'stream-right') {
        p.x += p.vx;
        p.phase += p.phaseSpeed;
        
        // Curve the horizontal flow to match reference HUD geometry
        p.y = Math.sin(p.x * 0.005 + p.phase) * p.oscRadius;

        // Wrap stream particles once off-screen bounds
        if (Math.abs(p.x) > centerX + 300) {
          p.x = (p.type === 'stream-left' ? -140 : 140);
          p.prevX = p.x;
          p.y = 0;
          p.prevY = 0;
        }
      } else { // ambient
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (Math.abs(p.x) > width || Math.abs(p.y) > height || p.z > 200 || p.z < -1200) {
          p.x = Math.random() * width - centerX;
          p.y = Math.random() * height - centerY;
          p.z = -1000;
          p.prevX = p.x;
          p.prevY = p.y;
          p.prevZ = p.z;
        }
      }

      // 3D Perspective calculations
      const scale = focalLength / (focalLength + p.z);
      const absScale = Math.abs(scale);
      const scrX = centerX + p.x * scale + this.mouseX * 0.25 * scale;
      const scrY = centerY + p.y * scale + this.mouseY * 0.25 * scale;

      const prevScale = focalLength / (focalLength + p.prevZ);
      const prevAbsScale = Math.abs(prevScale);
      const prevScrX = centerX + p.prevX * prevScale + this.mouseX * 0.25 * prevScale;
      const prevScrY = centerY + p.prevY * prevScale + this.mouseY * 0.25 * prevScale;

      // Skip out-of-bounds rendering
      if (scrX < 0 || scrX > width || scrY < 0 || scrY > height) return;

      // Opacity scales down as elements get deeper or too close
      let opacity = p.opacity * (1 - (p.z + 1600) / 2000);
      if (p.z > 0) opacity *= (1 - p.z / 200);
      opacity = Math.max(0.01, Math.min(1.0, opacity));

      this.ctx!.beginPath();

      // Draw normal 3D spherical dust particle
      this.ctx!.arc(scrX, scrY, p.size * absScale, 0, Math.PI * 2);
      this.ctx!.fillStyle = `rgba(${p.colorRgb}, ${opacity})`;
      this.ctx!.fill();

      // Extra emissive glow for larger midground elements
      if (p.size * absScale > 1.8) {
        this.ctx!.beginPath();
        this.ctx!.arc(scrX, scrY, p.size * absScale * 2.5, 0, Math.PI * 2);
        this.ctx!.fillStyle = `rgba(${p.colorRgb}, ${opacity * 0.22})`;
        this.ctx!.fill();
      }
    });
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  private readonly onResize = (): void => {
    this.resizeCanvas();
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    // Convert to centered coordinates
    this.targetMouseX = (e.clientX - window.innerWidth / 2);
    this.targetMouseY = (e.clientY - window.innerHeight / 2);
  };

  /**
   * Displaces environmental layout frames along the Z-axis (shockwave effect)
   */
  private triggerSpatialReaction(progress: number): void {
    if (!this.animationService.getIsBrowser()) return;

    const tunnel = this.el.nativeElement.querySelector('.depth-tunnel-container');
    const streams = this.el.nativeElement.querySelector('.data-streams-layer');

    const duration = progress === 100 ? 0.8 : 0.4;
    const intensity = progress === 100 ? -45 : -20;

    // Displace Depth Tunnel Corridor along the Z-axis
    if (tunnel) {
      this.animationService.to(tunnel, {
        z: intensity,
        duration: duration * 0.4,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
        clearProps: 'transform'
      });

      // Special 100% staggered sweep down the rings
      if (progress === 100) {
        const rings = this.el.nativeElement.querySelectorAll('.tunnel-ring.wake');
        if (rings.length > 0) {
          this.animationService.to(rings, {
            filter: 'brightness(1.5)',
            duration: 0.15,
            stagger: 0.08,
            yoyo: true,
            repeat: 1,
            ease: 'power1.inOut'
          });
        }
      }
    }

    // Shift data streams out of sync
    if (streams) {
      this.animationService.to(streams, {
        z: intensity * 0.6,
        duration: duration * 0.4,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
        clearProps: 'transform'
      });
    }
  }

  ngOnDestroy(): void {
    if (this.animationService.getIsBrowser()) {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('resize', this.onResize);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
