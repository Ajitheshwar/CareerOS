import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, computed, effect } from '@angular/core';
import { JarvisService } from '../../../core/services/jarvis.service';
import { SceneEngineService } from '../../../core/services/scene-engine.service';
import { AnimationService } from '../../../core/services/animation.service';
import { JarvisPosition } from '../../../core/types/jarvis.types';

interface Particle3D {
  r: number;       // base sphere radius
  theta: number;   // longitude angle
  phi: number;     // latitude angle
  speed: number;   // orbital speed
  phiSpeed: number;// vertical float speed
  size: number;    // physical base size
  colorRgb: string;// color channel representation
  pulsePhase: number;
  pulseSpeed: number;
  // Computed 3D Coordinates
  x: number;
  y: number;
  z: number;
}

interface Fragment3D {
  r: number;
  theta: number;
  phi: number;
  speed: number;
  phiSpeed: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  type: 'triangle' | 'square' | 'line';
  colorRgb: string;
  // Computed 3D Coordinates
  x: number;
  y: number;
  z: number;
}

type DepthSortedObject = 
  | { type: 'particle'; obj: Particle3D; z: number }
  | { type: 'fragment'; obj: Fragment3D; z: number };

@Component({
  selector: 'app-jarvis-core',
  standalone: true,
  templateUrl: './jarvis-core.html',
  styleUrl: './jarvis-core.scss'
})
export class JarvisCore implements OnInit, AfterViewInit, OnDestroy {
  private readonly jarvisService = inject(JarvisService);
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly animationService = inject(AnimationService);
  private readonly el = inject(ElementRef);

  // Expose signals
  public readonly state = this.jarvisService.state;
  public readonly mode = this.jarvisService.mode;
  public readonly position = this.jarvisService.position;
  public readonly progress = this.jarvisService.progress;

  private previousPosition: JarvisPosition = 'center';
  private isInitialized = false;

  // Compute offset for the progress circle (circumference = 2 * Math.PI * 72px ≈ 452.4)
  public readonly progressOffset = computed(() => {
    const prog = this.progress();
    const circumference = 452.4;
    return circumference - (prog / 100) * circumference;
  });

  // Compute boot scene local scroll progress (0.0 to 1.0)
  public readonly bootScrollProgress = computed(() => {
    const states = this.sceneEngine.scenesState();
    return states['boot'] ? states['boot'].progress : 0;
  });

  // Compute translation, opacity, and blur matching the boot scene scroll exit (up to 50%)
  public readonly jarvisStyle = computed(() => {
    const pos = this.position();
    const prog = this.bootScrollProgress();

    if (pos === 'center' && prog > 0 && prog < 0.5) {
      const normProg = prog / 0.5; // Normalizes progress from 0..0.5 to 0..1
      const opacity = 1 - normProg * 0.4; // Fade out slightly
      const translateZ = normProg * 150; // Sync with boot container Z shift
      const blur = normProg * 4; // Sync with boot container blur

      return {
        opacity: `${opacity}`,
        transform: `translate3d(0, 0, ${translateZ}px)`,
        filter: `blur(${blur}px)`
      };
    }

    return {};
  });

  // Reactive classes
  public readonly containerClass = computed(() => {
    const pos = this.position();
    const activeMode = this.mode();
    return `jarvis-${pos} ${activeMode}`;
  });

  // Canvas Simulation variables
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private particles: Particle3D[] = [];
  private fragments: Fragment3D[] = [];
  private renderTime = 0;

  // Particle color channels matching accent theme
  private readonly colorPalette = [
    '6, 182, 212',  // Electric Cyan
    '20, 184, 166', // Subtle Teal
    '139, 92, 246', // Soft Violet
    '255, 255, 255' // Soft White
  ];

  constructor() {
    // Watch position signal for FLIP transitions
    effect(() => {
      const currentPos = this.position();
      const prevPos = this.previousPosition;
      
      if (currentPos !== prevPos) {
        if (this.isInitialized) {
          this.animatePositionChange(prevPos, currentPos);
        } else {
          this.isInitialized = true;
        }
        this.previousPosition = currentPos;
        
        // Resize canvas after layout shifts settle
        setTimeout(() => this.resizeCanvas(), 100);
        setTimeout(() => this.resizeCanvas(), 1200);
      }
    });

    // Watch progress for micro-interaction reactions
    effect(() => {
      const prog = this.progress();
      this.triggerReaction(prog);
    });
  }

  ngOnInit(): void {
    if (this.animationService.getIsBrowser()) {
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseleave', this.onMouseLeave);
      window.addEventListener('resize', this.onResize);
    }
  }

  ngAfterViewInit(): void {
    if (this.animationService.getIsBrowser()) {
      this.initCanvasSimulation();
    }
  }

  /**
   * Initializes the 3D Canvas Particle Swarm and Data Fragment Engine
   */
  private initCanvasSimulation(): void {
    this.canvas = this.el.nativeElement.querySelector('.jarvis-canvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Populate particles swarms (~160 particles for performance and density)
    this.particles = [];
    for (let i = 0; i < 160; i++) {
      const colorChance = Math.random();
      let colorRgb = this.colorPalette[0]; // Cyan default
      if (colorChance > 0.85) colorRgb = this.colorPalette[2]; // Purple
      else if (colorChance > 0.60) colorRgb = this.colorPalette[1]; // Teal
      else if (colorChance > 0.50) colorRgb = this.colorPalette[3]; // White

      this.particles.push({
        r: Math.random() * 95 + 40, // spread radius from center core
        theta: Math.random() * Math.PI * 2,
        phi: Math.random() * Math.PI,
        speed: (Math.random() * 0.012 + 0.0035) * (Math.random() > 0.5 ? 1 : -1),
        phiSpeed: (Math.random() * 0.003 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 1.5 + 0.9, // 0.9px to 2.4px base size
        colorRgb,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        x: 0,
        y: 0,
        z: 0
      });
    }

    // Populate data fragments (~22 holographic shards)
    this.fragments = [];
    const fragmentTypes: ('triangle' | 'square' | 'line')[] = ['triangle', 'square', 'line'];
    for (let i = 0; i < 22; i++) {
      const type = fragmentTypes[Math.floor(Math.random() * fragmentTypes.length)];
      const colorRgb = Math.random() > 0.4 ? this.colorPalette[0] : this.colorPalette[1]; // Cyan or Teal

      this.fragments.push({
        r: Math.random() * 80 + 55,
        theta: Math.random() * Math.PI * 2,
        phi: Math.random() * Math.PI,
        speed: (Math.random() * 0.006 + 0.0025) * (Math.random() > 0.5 ? 1 : -1),
        phiSpeed: (Math.random() * 0.0024 + 0.0006) * (Math.random() > 0.5 ? 1 : -1),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 0.015 + 0.006) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 4 + 3.5, // 3.5px to 7.5px base shape bounds
        type,
        colorRgb,
        x: 0,
        y: 0,
        z: 0
      });
    }

    this.startAnimation();
  }

  /**
   * Animation tick loop
   */
  private startAnimation(): void {
    const tick = () => {
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * Performs Z-depth sorting and projects 3D coords to the 2D Canvas context
   */
  private renderFrame(): void {
    if (!this.canvas || !this.ctx) return;
    
    this.renderTime += 1;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear frame
    this.ctx.clearRect(0, 0, width, height);

    // Sync speed and radius parameters with current states
    const activeMode = this.mode();
    const isScanning = activeMode === 'scanning';
    const isBooting = activeMode === 'booting';
    const bootProgress = this.progress();

    // Speed multiplier scales up during scanning transitions
    let speedMultiplier = 1.0;
    if (isScanning) speedMultiplier = 2.4;
    else if (isBooting) speedMultiplier = 0.5 + (bootProgress / 100) * 0.5;

    // Compression scaling factor (particles pull closer during scanning)
    const radiusMultiplier = isScanning ? 0.75 : 1.0;

    // 1. Update Particles 3D Position
    this.particles.forEach(p => {
      p.theta += p.speed * speedMultiplier;
      p.phi += p.phiSpeed * speedMultiplier;
      p.pulsePhase += p.pulseSpeed;

      // Add a subtle wave oscillation to sphere radius to create organic fluid drift
      const wave = Math.sin(p.theta * 3 + this.renderTime * 0.015) * 8;
      const currentRadius = (p.r + wave) * radiusMultiplier;

      // Spherical projection to 3D Cartesian
      p.x = currentRadius * Math.sin(p.phi) * Math.cos(p.theta);
      p.y = currentRadius * Math.cos(p.phi);
      p.z = currentRadius * Math.sin(p.phi) * Math.sin(p.theta);
    });

    // 2. Update Fragments 3D Position
    this.fragments.forEach(f => {
      f.theta += f.speed * speedMultiplier;
      f.phi += f.phiSpeed * speedMultiplier;
      f.rotation += f.rotSpeed * speedMultiplier;

      const wave = Math.cos(f.theta * 2 + this.renderTime * 0.01) * 6;
      const currentRadius = (f.r + wave) * radiusMultiplier;

      f.x = currentRadius * Math.sin(f.phi) * Math.cos(f.theta);
      f.y = currentRadius * Math.cos(f.phi);
      f.z = currentRadius * Math.sin(f.phi) * Math.sin(f.theta);
    });

    // 3. Build combined array & sort by Z (Z goes into screen, so larger Z = further back)
    const renderList: DepthSortedObject[] = [];
    this.particles.forEach(p => renderList.push({ type: 'particle', obj: p, z: p.z }));
    this.fragments.forEach(f => renderList.push({ type: 'fragment', obj: f, z: f.z }));

    renderList.sort((a, b) => b.z - a.z);

    // 4. Draw sorted elements using perspective projection
    const focalLength = 220; // 3D projection focal distance

    renderList.forEach(item => {
      // Perspective projection factor
      // Shift Z by +180 to prevent division by zero or clipping issues
      const scaleFactor = focalLength / (focalLength + item.z + 100);
      
      const scrX = centerX + item.obj.x * scaleFactor;
      const scrY = centerY + item.obj.y * scaleFactor;

      // Don't render out-of-bounds coords
      if (scrX < 0 || scrX > width || scrY < 0 || scrY > height) return;

      if (item.type === 'particle') {
        const p = item.obj as Particle3D;
        const size = p.size * scaleFactor;
        
        // Base opacity + pulsating phase modulation
        const pulse = Math.sin(p.pulsePhase) * 0.15 + 0.85;
        let opacity = (0.1 + (1 - (p.z + 100) / 300) * 0.7) * pulse;
        
        // Clamp opacity safely
        opacity = Math.min(Math.max(opacity, 0.08), 0.95);

        // Fade in based on progress during boot
        if (isBooting) {
          opacity *= (0.15 + (bootProgress / 100) * 0.85);
        }

        // Draw main core particle
        this.ctx!.beginPath();
        this.ctx!.arc(scrX, scrY, size, 0, Math.PI * 2);
        this.ctx!.fillStyle = `rgba(${p.colorRgb}, ${opacity})`;
        this.ctx!.fill();

        // Volumetric halo glow (2.5x larger, extremely faint)
        this.ctx!.beginPath();
        this.ctx!.arc(scrX, scrY, size * 2.5, 0, Math.PI * 2);
        this.ctx!.fillStyle = `rgba(${p.colorRgb}, ${opacity * 0.16})`;
        this.ctx!.fill();

      } else {
        const f = item.obj as Fragment3D;
        const size = f.size * scaleFactor;
        let opacity = 0.12 + (1 - (f.z + 100) / 300) * 0.5;
        opacity = Math.min(Math.max(opacity, 0.05), 0.7);

        // Fade in based on progress during boot
        if (isBooting) {
          opacity *= (0.15 + (bootProgress / 100) * 0.85);
        }

        this.ctx!.save();
        this.ctx!.translate(scrX, scrY);
        this.ctx!.rotate(f.rotation);
        this.ctx!.strokeStyle = `rgba(${f.colorRgb}, ${opacity})`;
        this.ctx!.lineWidth = 0.75;

        // Render wireframe outline based on type
        this.ctx!.beginPath();
        if (f.type === 'triangle') {
          this.ctx!.moveTo(0, -size);
          this.ctx!.lineTo(size * 0.86, size * 0.5);
          this.ctx!.lineTo(-size * 0.86, size * 0.5);
          this.ctx!.closePath();
        } else if (f.type === 'square') {
          this.ctx!.rect(-size/2, -size/2, size, size);
        } else {
          // simple tick line shard
          this.ctx!.moveTo(-size, 0);
          this.ctx!.lineTo(size, 0);
        }
        this.ctx!.stroke();
        this.ctx!.restore();
      }
    });
  }

  /**
   * Dynamic Retina bounds resizing
   */
  private resizeCanvas(): void {
    if (!this.canvas || !this.ctx || !this.el) return;
    const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: 400, height: 400 };
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

  /**
   * Captures mouse movements to tilt the JARVIS wrapper, creating a 3D parallax depth effect
   */
  private readonly onMouseMove = (e: MouseEvent): void => {
    const wrapper = this.el.nativeElement.querySelector('.jarvis-wrapper');
    if (!wrapper) return;

    const normX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    const normY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);

    const rotateX = -normY * 4.5;
    const rotateY = normX * 4.5;

    this.animationService.to(wrapper, {
      rotateX: rotateX,
      rotateY: rotateY,
      duration: 0.8,
      ease: 'power2.out'
    });
  };

  /**
   * Returns tilt to origin when cursor exits the viewport
   */
  private readonly onMouseLeave = (): void => {
    const wrapper = this.el.nativeElement.querySelector('.jarvis-wrapper');
    if (wrapper) {
      this.animationService.to(wrapper, {
        rotateX: 0,
        rotateY: 0,
        duration: 1.0,
        ease: 'power2.out'
      });
    }
  };

  /**
   * FLIP (First, Last, Invert, Play) transition helper for layout scaling/moving
   */
  private animatePositionChange(oldPos: JarvisPosition, newPos: JarvisPosition): void {
    if (!this.animationService.getIsBrowser()) return;

    const container = this.el.nativeElement.querySelector('.jarvis-container');
    if (!container) return;

    const startRect = container.getBoundingClientRect();

    setTimeout(() => {
      const endRect = container.getBoundingClientRect();

      const dx = startRect.left - endRect.left;
      const dy = startRect.top - endRect.top;
      
      const scaleX = startRect.width / endRect.width;
      const scaleY = startRect.height / endRect.height;

      this.animationService.set(container, {
        x: dx,
        y: dy,
        scaleX: scaleX,
        scaleY: scaleY,
        transformOrigin: 'center'
      });

      this.animationService.to(container, {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 1.2,
        ease: 'power4.out',
        clearProps: 'transform'
      });
    }, 0);
  }

  /**
   * Triggers a specific animated reaction on the JARVIS layers matching the progress thresholds
   */
  private triggerReaction(progress: number): void {
    if (!this.animationService.getIsBrowser()) return;

    switch (progress) {
      case 20: // Milestone 1: Pulse core
        const aura = this.el.nativeElement.querySelector('.nucleus-aura');
        if (aura) {
          this.animationService.to(aura, {
            scale: 1.3,
            duration: 0.25,
            yoyo: true,
            repeat: 1,
            ease: 'power2.out',
            transformOrigin: 'center'
          });
        }
        break;

      case 40: // Milestone 2: Glow pulse
        const heart = this.el.nativeElement.querySelector('.nucleus-heart');
        if (heart) {
          this.animationService.to(heart, {
            scale: 1.4,
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut',
            transformOrigin: 'center'
          });
        }
        break;

      case 60: // Milestone 3: Ring shift
        const outer = this.el.nativeElement.querySelector('.ring-broken-layer');
        if (outer) {
          this.animationService.to(outer, {
            scale: 1.15,
            z: 22,
            duration: 0.35,
            yoyo: true,
            repeat: 1,
            ease: 'back.out(1.4)',
            transformOrigin: 'center'
          });
        }
        break;

      case 80: // Milestone 4: Energy ripple
        const ripple = this.el.nativeElement.querySelector('.jarvis-ripple');
        if (ripple) {
          this.animationService.set(ripple, { scale: 0.4, opacity: 0.85 });
          this.animationService.to(ripple, {
            scale: 2.1,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
          });
        }
        break;

      case 100: // Milestone 5 (Ready): Full Calibration Rotation
        const wrapper = this.el.nativeElement.querySelector('.jarvis-wrapper');
        const broken = this.el.nativeElement.querySelector('.ring-broken-layer');
        const inner = this.el.nativeElement.querySelector('.ring-inner-layer');
        const middle = this.el.nativeElement.querySelector('.ring-middle-layer');
        const energyField = this.el.nativeElement.querySelector('.ring-energy-field');
        const progressRing = this.el.nativeElement.querySelector('.ring-progress-layer');

        // Spin the entire wrapper 360 degrees
        if (wrapper) {
          this.animationService.to(wrapper, {
            rotateZ: '+=360',
            duration: 2.2,
            ease: 'power4.inOut'
          });
        }

        // Spin individual rings in alternating directions for visual kinetic feedback
        if (broken) {
          this.animationService.to(broken, {
            rotation: '-=360',
            duration: 2.4,
            ease: 'power3.inOut'
          });
        }
        if (inner) {
          this.animationService.to(inner, {
            rotation: '+=360',
            duration: 2.4,
            ease: 'power3.inOut'
          });
        }
        if (middle) {
          this.animationService.to(middle, {
            rotation: '+=720', // Spin the continuous ring twice as fast
            duration: 2.4,
            ease: 'power3.inOut'
          });
        }
        if (energyField) {
          this.animationService.to(energyField, {
            rotation: '-=360',
            duration: 2.4,
            ease: 'power3.inOut'
          });
        }
        if (progressRing) {
          this.animationService.to(progressRing, {
            rotation: '+=360',
            duration: 2.4,
            ease: 'power3.inOut'
          });
        }
        break;
    }
  }

  ngOnDestroy(): void {
    if (this.animationService.getIsBrowser()) {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseleave', this.onMouseLeave);
      window.removeEventListener('resize', this.onResize);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
