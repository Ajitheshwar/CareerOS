import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { JarvisService } from '../../../core/services/jarvis.service';
import { SceneEngineService } from '../../../core/services/scene-engine.service';
import { AnimationService } from '../../../core/services/animation.service';
import { JarvisPosition, Particle3D, Fragment3D, Spark3D, DepthSortedObject } from '../../interfaces/jarvis.interface';
import { SCENE_MESSAGES, CONTACT_NODES_LIST } from '../../constants/jarvis.constants';
import { JARVIS_COLOR_PALETTE } from '../../constants/theme.constants';
import { gsap } from 'gsap';

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

  public readonly currentSceneMessage = signal<string>('');
  private messageIndex = 0;
  private messageTimer: any = null;

  private idleResumeTimeout: any = null;
  public readonly isHovered = signal<boolean>(false);
  public readonly isIdleActive = signal<boolean>(false);

  // Compute if contact nodes are active/revealed
  public readonly isContactsActive = computed(() => {
    return this.position() === 'final' || (this.position() === 'floating' && this.isHovered());
  });

  private previousPosition: JarvisPosition = 'center';
  private isInitialized = false;

  private readonly sceneMessages = SCENE_MESSAGES;
  public readonly contactNodesList = CONTACT_NODES_LIST;

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

  // Level selector
  public readonly progressLevelClass = computed(() => {
    const prog = this.progress();
    if (prog >= 100) return 'level-5';
    if (prog >= 80) return 'level-4';
    if (prog >= 60) return 'level-3';
    if (prog >= 40) return 'level-2';
    if (prog >= 20) return 'level-1';
    return 'level-0';
  });

  // Canvas Simulation variables
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private particles: Particle3D[] = [];
  private fragments: Fragment3D[] = [];
  private sparks: Spark3D[] = [];
  private renderTime = 0;

  // Particle color channels matching accent theme
  private readonly colorPalette = JARVIS_COLOR_PALETTE;

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

    // Watch active scene to rotate scene messages
    effect(() => {
      this.updateSceneMessages();
    });

    // Watch position to trigger idle sequence or final reveal
    effect(() => {
      const pos = this.position();
      
      // Reset timer and timeline states
      this.isIdleActive.set(false);
      this.stopIdleAnimation();
      if (this.idleResumeTimeout) {
        clearTimeout(this.idleResumeTimeout);
        this.idleResumeTimeout = null;
      }

      if (pos === 'floating') {
        this.idleResumeTimeout = setTimeout(() => {
          this.isIdleActive.set(true);
        }, 1000);
      } else if (pos === 'final') {
        this.triggerFinalReveal();
      } else {
        this.resetNodesToCenter();
      }
    });

    // Watch contacts-active state to resize the particle canvas after transitions settle
    effect(() => {
      const active = this.isContactsActive();
      if (this.isInitialized) {
        // Trigger resize multiple times during size transition for smooth canvas scaling
        for (let i = 0; i <= 8; i++) {
          setTimeout(() => this.resizeCanvas(), i * 100);
        }
      }
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

    this.sparks = [];
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

    // 5. Spawn and Draw 3D Energy Sparks at 100% progress
    if (bootProgress >= 100 && this.sparks.length < 30 && Math.random() > 0.45) {
      this.sparks.push({
        r: Math.random() * 15 + 10,
        theta: Math.random() * Math.PI * 2,
        phi: Math.random() * Math.PI,
        speed: Math.random() * 5 + 3.5,
        length: Math.random() * 30 + 15,
        width: Math.random() * 1.4 + 0.6,
        life: 0,
        maxLife: Math.random() * 20 + 12,
        colorRgb: Math.random() > 0.35 ? '6, 182, 212' : '255, 255, 255'
      });
    }

    this.sparks = this.sparks.filter(s => {
      s.r += s.speed;
      s.life += 1;
      return s.life < s.maxLife;
    });

    this.sparks.forEach(s => {
      const currentR = s.r;
      const startX = currentR * Math.sin(s.phi) * Math.cos(s.theta);
      const startY = currentR * Math.cos(s.phi);
      const startZ = currentR * Math.sin(s.phi) * Math.sin(s.theta);

      const endR = Math.max(0, currentR - s.length);
      const endX = endR * Math.sin(s.phi) * Math.cos(s.theta);
      const endY = endR * Math.cos(s.phi);
      const endZ = endR * Math.sin(s.phi) * Math.sin(s.theta);

      const scaleStart = focalLength / (focalLength + startZ + 100);
      const scaleEnd = focalLength / (focalLength + endZ + 100);

      const scrStartX = centerX + startX * scaleStart;
      const scrStartY = centerY + startY * scaleStart;
      const scrEndX = centerX + endX * scaleEnd;
      const scrEndY = centerY + endY * scaleEnd;

      // Don't render out-of-bounds coords
      if (scrStartX < 0 || scrStartX > width || scrStartY < 0 || scrStartY > height) return;

      const opacity = (1 - s.life / s.maxLife) * 0.9;
      this.ctx!.beginPath();
      this.ctx!.moveTo(scrStartX, scrStartY);
      this.ctx!.lineTo(scrEndX, scrEndY);
      this.ctx!.strokeStyle = `rgba(${s.colorRgb}, ${opacity})`;
      this.ctx!.lineWidth = s.width * scaleStart;
      this.ctx!.lineCap = 'round';
      this.ctx!.stroke();
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
    if (this.isContactsActive()) {
      const isFinal = this.position() === 'final';
      const nodes = ['github', 'linkedin', 'phone', 'email'] as const;
      nodes.forEach(id => {
        const element = this.el.nativeElement.querySelector(`.node-${id}`);
        if (element) {
          const coords = this.getResponsiveCoords(id, isFinal);
          gsap.set(element, { x: coords.x, y: coords.y });
        }
      });
    }
  };

  /**
   * Captures mouse movements to tilt the central core and particle canvas, creating a 3D parallax depth effect
   */
  private readonly onMouseMove = (e: MouseEvent): void => {
    const core = this.el.nativeElement.querySelector('.core-layer');
    const canvas = this.el.nativeElement.querySelector('.jarvis-canvas');
    if (!core) return;

    const normX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    const normY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);

    const rotateX = -normY * 6;
    const rotateY = normX * 6;

    this.animationService.to(core, {
      rotateX: rotateX,
      rotateY: rotateY,
      duration: 0.8,
      ease: 'power2.out'
    });

    if (canvas) {
      this.animationService.to(canvas, {
        rotateX: rotateX * 0.7,
        rotateY: rotateY * 0.7,
        duration: 0.8,
        ease: 'power2.out'
      });
    }
  };

  /**
   * Returns tilt to origin when cursor exits the viewport
   */
  private readonly onMouseLeave = (): void => {
    const core = this.el.nativeElement.querySelector('.core-layer');
    const canvas = this.el.nativeElement.querySelector('.jarvis-canvas');
    
    if (core) {
      this.animationService.to(core, {
        rotateX: 0,
        rotateY: 0,
        duration: 1.0,
        ease: 'power2.out'
      });
    }
    if (canvas) {
      this.animationService.to(canvas, {
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
            ease: 'power3.inOut',
            transformOrigin: 'center'
          });
        }
        if (inner) {
          this.animationService.to(inner, {
            rotation: '+=360',
            duration: 2.4,
            ease: 'power3.inOut',
            transformOrigin: 'center'
          });
        }
        if (middle) {
          this.animationService.to(middle, {
            rotation: '+=720', // Spin the continuous ring twice as fast
            duration: 2.4,
            ease: 'power3.inOut',
            transformOrigin: 'center'
          });
        }
        if (energyField) {
          this.animationService.to(energyField, {
            rotation: '-=360',
            duration: 2.4,
            ease: 'power3.inOut',
            transformOrigin: 'center'
          });
        }
        if (progressRing) {
          this.animationService.to(progressRing, {
            rotation: '+=360',
            duration: 2.4,
            ease: 'power3.inOut',
            transformOrigin: 'center'
          });
        }
        break;
    }
  }

  /**
   * Scene Messages rotation logic
   */
  private updateSceneMessages(): void {
    if (!this.animationService.getIsBrowser()) return;
    
    const activeScene = this.sceneEngine.activeSceneId();
    const messages = this.sceneMessages[activeScene] || [];
    
    // Clear message rotation timer
    if (this.messageTimer) {
      clearInterval(this.messageTimer);
      this.messageTimer = null;
    }

    if (messages.length === 0) {
      this.currentSceneMessage.set('');
      return;
    }

    this.messageIndex = 0;
    this.currentSceneMessage.set(messages[0]);
    
    // Reset visual position of text
    const textEl = this.el.nativeElement.querySelector('.scene-message-text');
    if (textEl) {
      gsap.killTweensOf(textEl);
      gsap.set(textEl, { x: 0, y: 0, opacity: 1 });
    }
    
    // Rotate messages
    this.messageTimer = setInterval(() => {
      this.rotateMessage(messages);
    }, 3000);
  }

  private rotateMessage(messages: string[]): void {
    if (messages.length <= 1) return;

    const textEl = this.el.nativeElement.querySelector('.scene-message-text');
    if (!textEl) return;

    this.messageIndex = (this.messageIndex + 1) % messages.length;
    const nextMsg = messages[this.messageIndex];

    // Timeline for transition: 350-450ms total
    const tl = this.animationService.createTimeline();
    if (!tl) return;
    
    // 1. Current message: slide up (-10px) and fade out (200ms)
    tl.to(textEl, {
      y: -10,
      opacity: 0,
      duration: 0.2,
      onComplete: () => {
        this.currentSceneMessage.set(nextMsg);
        // Move to start position (slide in from left: x: -15px, y: 0)
        gsap.set(textEl, { x: -15, y: 0 });
      }
    });

    // 2. Next message: slide in from left (x: 0) and fade in (220ms)
    tl.to(textEl, {
      x: 0,
      opacity: 1,
      duration: 0.22,
      ease: 'power2.out'
    });
  }

  /**
   * Contact Nodes animation helpers
   */
  private getResponsiveDistance(isFinal: boolean): number {
    if (!this.animationService.getIsBrowser()) return 150;
    
    if (!isFinal) {
      return 115; // static floating mode distance
    }
    
    const width = window.innerWidth;
    let radius = 250; // default lg: 500px diameter / 2
    let offset = 150;  // default lg offset
    
    if (width <= 768) {
      // sm breakpoint
      radius = 140; // 280px diameter / 2
      offset = 70;
    } else if (width <= 1200) {
      // md breakpoint
      radius = 190; // 380px diameter / 2
      offset = 100;
    }
    
    // Add offset so nodes sit nicely outside the core (increased for final mode)
    return radius + offset;
  }

  private getResponsiveCoords(id: string, isFinal: boolean): { x: number; y: number } {
    const d = this.getResponsiveDistance(isFinal);
    
    if (isFinal) {
      const diag = Math.round(d * 0.7071);
      if (id === 'github') return { x: diag, y: -diag };
      if (id === 'linkedin') return { x: -diag, y: -diag };
      if (id === 'phone') return { x: -diag, y: diag };
      if (id === 'email') return { x: diag, y: diag };
    } else {
      // Static coordinates for floating mode
      if (id === 'github') return { x: 0, y: -115 };
      if (id === 'linkedin') return { x: -60, y: -116 };
      if (id === 'phone') return { x: -105, y: -46 };
      if (id === 'email') return { x: -115, y: 25 }; // shifted slightly down
    }
    return { x: 0, y: 0 };
  }

  public getConduitPath(id: string): string {
    const pos = this.position();
    const isFinal = pos === 'final';
    const d = this.getResponsiveDistance(isFinal);
    
    if (isFinal) {
      const diag = Math.round(d * 0.7071);
      if (id === 'github') return `M 0 0 L ${diag} ${-diag}`;
      if (id === 'linkedin') return `M 0 0 L ${-diag} ${-diag}`;
      if (id === 'phone') return `M 0 0 L ${-diag} ${diag}`;
      if (id === 'email') return `M 0 0 L ${diag} ${diag}`;
    } else {
      // Static curved paths for floating mode
      if (id === 'github') return 'M 0 0 L 0 -115';
      if (id === 'linkedin') return 'M 0 0 L 0 -40 Q 0 -55 -15 -62 L -60 -116';
      if (id === 'phone') return 'M 0 0 L 0 -15 Q 0 -30 -15 -35 L -105 -46';
      if (id === 'email') return 'M 0 0 L -115 25'; // shifted slightly down
    }
    return '';
  }

  private stopIdleAnimation(): void {
  }

  private resetNodesToCenter(): void {
    if (!this.animationService.getIsBrowser()) return;

    const nodes = ['github', 'linkedin', 'phone', 'email'] as const;
    nodes.forEach(id => {
      const element = this.el.nativeElement.querySelector(`.node-${id}`);
      const label = this.el.nativeElement.querySelector(`.node-${id} .node-label`);
      const rail = this.el.nativeElement.querySelector(`.conduit-group-${id}`);
      
      if (element) {
        gsap.killTweensOf(element);
        gsap.set(element, { x: 0, y: 0, scale: 0, opacity: 0, filter: 'none' });
      }
      if (label) {
        gsap.killTweensOf(label);
        gsap.set(label, { opacity: 0 });
      }
      if (rail) {
        gsap.killTweensOf(rail);
        gsap.set(rail, { opacity: 0 });
      }
    });
  }

  /**
   * Hover events
   */
  public onAssistantEnter(): void {
    const pos = this.position();
    if (pos !== 'floating') return;

    this.isHovered.set(true);
    this.isIdleActive.set(false); // Stop CSS idle jump animation immediately

    if (this.idleResumeTimeout) {
      clearTimeout(this.idleResumeTimeout);
      this.idleResumeTimeout = null;
    }

    // Trigger core pulse
    this.triggerCorePulse();

    const nodes = ['github', 'linkedin', 'phone', 'email'] as const;
    nodes.forEach((id, idx) => {
      const element = this.el.nativeElement.querySelector(`.node-${id}`);
      const label = this.el.nativeElement.querySelector(`.node-${id} .node-label`);
      const rail = this.el.nativeElement.querySelector(`.conduit-group-${id}`);
      const coords = this.getResponsiveCoords(id, false);

      if (!element) return;

      gsap.killTweensOf(element);
      if (label) gsap.killTweensOf(label);
      if (rail) gsap.killTweensOf(rail);

      // Animate line grow
      if (rail) {
        gsap.to(rail, {
          opacity: 0.6,
          duration: 0.4,
          delay: idx * 0.08
        });
      }

      // Animate node position
      gsap.to(element, {
        x: coords.x,
        y: coords.y,
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: 'back.out(1.5)',
        delay: idx * 0.08
      });

      // Fade in label
      if (label) {
        gsap.to(label, {
          opacity: 1,
          duration: 0.2,
          delay: idx * 0.08 + 0.4
        });
      }
    });
  }

  public onAssistantLeave(): void {
    const pos = this.position();
    if (pos !== 'floating') return;

    this.isHovered.set(false);

    const nodes = ['github', 'linkedin', 'phone', 'email'] as const;
    nodes.forEach((id, idx) => {
      const element = this.el.nativeElement.querySelector(`.node-${id}`);
      const label = this.el.nativeElement.querySelector(`.node-${id} .node-label`);
      const rail = this.el.nativeElement.querySelector(`.conduit-group-${id}`);

      if (!element) return;

      gsap.killTweensOf(element);
      if (label) gsap.killTweensOf(label);
      if (rail) gsap.killTweensOf(rail);

      // Fade out label first
      if (label) {
        gsap.to(label, {
          opacity: 0,
          duration: 0.15
        });
      }

      // Retract node back to center
      gsap.to(element, {
        x: 0,
        y: 0,
        scale: 0,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        delay: 0.1
      });

      // Retract lines
      if (rail) {
        gsap.to(rail, {
          opacity: 0,
          duration: 0.4,
          delay: 0.1
        });
      }
    });

    // Resume idle animation after 2-second delay
    this.idleResumeTimeout = setTimeout(() => {
      this.isIdleActive.set(true);
    }, 2000);
  }

  /**
   * Final Mode Reveal Sequence
   */
  private triggerFinalReveal(): void {
    if (!this.animationService.getIsBrowser()) return;

    this.stopIdleAnimation();
    this.resetNodesToCenter();

    // Wait 500ms before deploying nodes
    const nodes = ['github', 'linkedin', 'phone', 'email'] as const;
    nodes.forEach((id, idx) => {
      const element = this.el.nativeElement.querySelector(`.node-${id}`);
      const label = this.el.nativeElement.querySelector(`.node-${id} .node-label`);
      const rail = this.el.nativeElement.querySelector(`.conduit-group-${id}`);
      const coords = this.getResponsiveCoords(id, true);

      if (!element) return;

      gsap.killTweensOf(element);
      if (label) gsap.killTweensOf(label);
      if (rail) gsap.killTweensOf(rail);

      // Deploy line
      if (rail) {
        gsap.to(rail, {
          opacity: 0.6,
          duration: 0.5,
          delay: 0.5 + idx * 0.15
        });
      }

      // Deploy node with bounce
      gsap.to(element, {
        x: coords.x,
        y: coords.y,
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: 'back.out(1.5)',
        delay: 0.5 + idx * 0.15,
        onComplete: () => {
          // Glow pulse
          gsap.to(element, {
            filter: 'drop-shadow(0 0 15px rgba(0, 240, 255, 0.8)) brightness(1.25)',
            duration: 0.35,
            yoyo: true,
            repeat: 1
          });
        }
      });

      // Show label
      if (label) {
        gsap.to(label, {
          opacity: 1,
          duration: 0.25,
          delay: 0.5 + idx * 0.15 + 0.4
        });
      }
    });
  }

  /**
   * Node Specific Hover Animation
   */
  public onNodeHover(id: string): void {
    const element = this.el.nativeElement.querySelector(`.node-${id}`);
    const pulse = this.el.nativeElement.querySelector(`.conduit-group-${id} .conduit-pulse`);

    if (element) {
      gsap.to(element, {
        scale: 1.22,
        filter: 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.95)) brightness(1.3)',
        duration: 0.25,
        ease: 'power2.out'
      });
    }

    if (pulse) {
      gsap.to(pulse, {
        strokeWidth: 3,
        stroke: '#ffffff',
        duration: 0.15,
        yoyo: true,
        repeat: 1
      });
    }

    // Trigger core pulse
    this.triggerCorePulse();
  }

  public onNodeLeave(id: string): void {
    const element = this.el.nativeElement.querySelector(`.node-${id}`);
    if (element) {
      gsap.to(element, {
        scale: 1.0,
        filter: 'none',
        duration: 0.25,
        ease: 'power2.out'
      });
    }
  }

  /**
   * Interaction pulses
   */
  public onCoreClick(): void {
    // Click: Emit quick ripple & pulse
    this.triggerCorePulse();
    
    // Quick core glow reaction
    const heart = this.el.nativeElement.querySelector('.nucleus-heart');
    if (heart) {
      gsap.to(heart, {
        scale: 1.5,
        duration: 0.15,
        yoyo: true,
        repeat: 1
      });
    }
  }

  private triggerCorePulse(): void {
    const aura = this.el.nativeElement.querySelector('.nucleus-aura');
    if (aura) {
      gsap.to(aura, {
        scale: 1.35,
        opacity: 0.9,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      });
    }
    
    const ripple = this.el.nativeElement.querySelector('.jarvis-ripple');
    if (ripple) {
      gsap.killTweensOf(ripple);
      gsap.set(ripple, { scale: 0.4, opacity: 0.85 });
      gsap.to(ripple, {
        scale: 2.2,
        opacity: 0,
        duration: 0.65,
        ease: 'power2.out'
      });
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
    if (this.messageTimer) clearInterval(this.messageTimer);
    if (this.idleResumeTimeout) clearTimeout(this.idleResumeTimeout);
    this.stopIdleAnimation();
  }
}
