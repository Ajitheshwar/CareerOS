import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneEngineService } from '../../core/services/scene-engine.service';
import { JarvisService } from '../../core/services/jarvis.service';
import { AnimationService } from '../../core/services/animation.service';
import { SceneLifecycle } from '../../core/types/scene.types';

interface AttributeNode {
  name: string;
  dx: number;
  dy: number;
}

interface SystemData {
  id: number;
  name: string;
  purpose: string;
  description: string;
  color: string;
  strengthNodes: AttributeNode[];
}

interface BgParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  opacity: number;
}

interface CoreSynapse {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  t: number;
  speed: number;
  color: string;
}

interface EnergyRipple {
  r: number;
  maxR: number;
  opacity: number;
  speed: number;
  color: string;
}

function createStrengthNodes(names: string[], radius = 115): AttributeNode[] {
  const count = names.length;
  return names.map((name, idx) => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / count;
    return {
      name,
      dx: Math.round(radius * Math.cos(angle)),
      dy: Math.round(radius * Math.sin(angle))
    };
  });
}

@Component({
  selector: 'app-ai-core',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-core.html',
  styleUrl: './ai-core.scss'
})
export class AiCore implements OnInit, AfterViewInit, OnDestroy, SceneLifecycle {
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly jarvisService = inject(JarvisService);
  private readonly animationService = inject(AnimationService);
  private readonly el = inject(ElementRef);

  // Active state and scroll progress normalized within Scene 5 (0.0 to 1.0)
  public readonly active = input<boolean>(false);
  public readonly progress = input<number>(0);

  // Determine whether this component should remain in DOM
  public readonly shouldRender = computed(() => {
    return this.active() || (this.progress() > 0 && this.progress() < 1.0);
  });

  // Fade-in opacity and blur filters when entering Scene 5
  public readonly sceneOpacity = computed(() => {
    const p = this.progress();
    if (p < 0.05) return p / 0.05;
    return 1.0;
  });

  public readonly sceneFilter = computed(() => {
    const p = this.progress();
    if (p < 0.05) return `blur(${(1.0 - p / 0.05) * 6}px)`;
    return 'none';
  });

  // Final sequence state (triggers at progress >= 0.90)
  public readonly isFinalActive = computed(() => this.progress() >= 0.90);

  public readonly finalOpacity = computed(() => {
    const p = this.progress();
    if (p < 0.90) return 0;
    const t = (p - 0.90) / 0.06;
    return Math.min(1.0, Math.max(0.0, t));
  });

  public readonly finalTranslateY = computed(() => {
    const p = this.progress();
    if (p < 0.90) return 20;
    const t = (p - 0.90) / 0.06;
    const clampedT = Math.min(1.0, Math.max(0.0, t));
    return 20 * (1.0 - clampedT);
  });

  public readonly finalScale = computed(() => {
    const p = this.progress();
    if (p < 0.90) return 0.6;
    const t = (p - 0.90) / 0.06;
    const clampedT = Math.min(1.0, Math.max(0.0, t));
    return 0.6 + 0.4 * clampedT;
  });

  // Reactive state signals
  public readonly activeIdx = signal<number>(0);
  public readonly currentPhi = signal<number>(Math.PI / 2);
  public readonly cameraZoomZ = signal<number>(0);
  public readonly viewportSize = signal({ width: 1920, height: 1080 });

  // Center coordinates of the AI Core and orbits
  public readonly centerCoords = computed(() => {
    const size = this.viewportSize();
    const width = size.width;
    const height = size.height;
    const isMobile = width < 1024;

    if (isMobile) {
      return {
        x: width / 2,
        y: height * 0.35
      };
    } else {
      // Desktop: Shifted to the top and left to make room for HUD and visually balance
      return {
        x: width * 0.43,
        y: height * 0.45
      };
    }
  });

  // Canvases
  private bgCanvas: HTMLCanvasElement | null = null;
  private bgCtx: CanvasRenderingContext2D | null = null;
  private coreCanvas: HTMLCanvasElement | null = null;
  private coreCtx: CanvasRenderingContext2D | null = null;

  // Animation variables
  private animationFrameId: number | null = null;
  private isSceneActive = false;
  private renderTime = 0;
  private prevTargetIdx = -2;
  private activeTween: any = null;

  // Parallax mouse movements
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  // Particle systems
  private bgParticles: BgParticle[] = [];
  private coreSynapses: CoreSynapse[] = [];
  private energyRipples: EnergyRipple[] = [];

  // Static systems details data
  public readonly systemsData: SystemData[] = [
    {
      id: 1,
      name: 'CareerOps Platform',
      purpose: 'What I Built',
      description: 'An AI-powered Career Operating System designed to help job seekers with job discovery, resume optimization, interview preparation, career guidance, and application tracking.',
      color: '#06b6d4', // Cyan
      strengthNodes: createStrengthNodes([
        'Resume Intelligence',
        'Job Discovery',
        'Interview Preparation',
        'Career Guidance',
        'Application Tracking'
      ], 150)
    },
    {
      id: 2,
      name: 'Multi-Agent Architecture',
      purpose: 'How I Built It',
      description: 'A multi-agent ecosystem where specialized AI agents collaborate through orchestration workflows to solve career-related tasks.',
      color: '#22c55e', // Green
      strengthNodes: createStrengthNodes([
        'Agent Orchestration',
        'Context Sharing',
        'Workflow Intelligence',
        'LangGraph',
        'Multi-Agent Systems'
      ], 150)
    },
    {
      id: 3,
      name: 'Engineering DNA',
      purpose: 'How I Think',
      description: 'The engineering principles and mindset that guide my approach to software design, problem solving, and product development.',
      color: '#3b82f6', // Blue
      strengthNodes: createStrengthNodes([
        'Ownership',
        'Execution',
        'Systems Thinking',
        'Performance First',
        'Product Mindset',
        'Continuous Learning'
      ], 160)
    },
    {
      id: 4,
      name: 'Current Exploration',
      purpose: 'What I Am Learning',
      description: 'The technologies, concepts, and ideas I am actively exploring to expand my capabilities as an engineer and AI builder.',
      color: '#fbbf24', // Gold
      strengthNodes: createStrengthNodes([
        'Agentic AI',
        'Automation',
        'AI Workflows',
        'Developer Productivity',
        'LLM Systems'
      ], 150)
    },
    {
      id: 5,
      name: 'Recruiter Snapshot',
      purpose: 'Quick Professional Summary',
      description: 'A concise overview of my experience, achievements, technical ownership, and current focus.',
      color: '#a855f7', // Purple
      strengthNodes: createStrengthNodes([
        '3+ Years Experience',
        'Enterprise Applications',
        'AI Builder',
        'SDE-II',
        '100+ Components Built',
        'Best Employee Award'
      ], 160)
    }
  ];

  // Static contact links configurations
  public readonly contactNodes = [
    {
      id: 'github',
      label: 'GitHub',
      url: 'https://github.com/Ajitheshwar',
      color: '#2dd4bf', // Teal
      dx: -125,
      dy: 70
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/vadla-ajitheshwar/',
      color: '#0ea5e9', // Blue
      dx: -45,
      dy: 125
    },
    {
      id: 'phone',
      label: 'Phone',
      url: 'tel:+919347966409',
      color: '#fb923c', // Orange/Coral
      dx: 45,
      dy: 125
    },
    {
      id: 'email',
      label: 'Email',
      url: 'mailto:ajitheshwar1923@gmail.com',
      color: '#8b5cf6', // Purple
      dx: 125,
      dy: 70
    }
  ];

  // Projects system nodes dynamically in 3D perspective space
  public readonly systemNodes = computed(() => {
    const activeIdx = this.activeIdx();
    const phi = this.currentPhi();
    const zoomZ = this.cameraZoomZ();
    const p = this.progress();
    const size = this.viewportSize();

    const finalFactor = p >= 0.90 ? (1.0 - (p - 0.90) / 0.10) : 1.0;

    const count = this.systemsData.length;
    const width = size.width;
    const height = size.height;
    const coords = this.centerCoords();
    const centerX = coords.x;
    const centerY = coords.y;

    const isMobile = width < 1024;
    const R_base = isMobile ? (width < 480 ? 120 : 160) : 280;
    const y_offset = isMobile ? 0 : 40;
    const focalLength = 800;
    const beta = 15 * Math.PI / 180; // 15 degree X-tilt

    return this.systemsData.map((sys, idx) => {
      const theta_i = (idx * 2 * Math.PI) / count;
      const alpha_i = theta_i + phi;

      const x_i = R_base * Math.cos(alpha_i);
      const y_i = R_base * Math.sin(alpha_i) * Math.sin(beta) + y_offset;
      const z_i = -R_base * Math.sin(alpha_i) * Math.cos(beta) + zoomZ;

      let scaleFactor = focalLength / (focalLength + z_i);
      scaleFactor = Math.min(1.35, Math.max(0.5, scaleFactor));

      const screenX = centerX + x_i * scaleFactor;
      const screenY = centerY + y_i * scaleFactor;

      const isActive = idx === activeIdx;
      const scaleMultiplier = isActive ? 1.05 : 0.70;

      let opacity = isActive ? 1.0 : (0.5 + 0.3 * (1.0 - (z_i + R_base) / (2 * R_base)));
      opacity *= finalFactor;
      if (opacity < 0.12 && finalFactor > 0.1) opacity = 0.12; // Keep always visible in background

      const scale = scaleMultiplier * scaleFactor;
      const transform = `translate(-50%, -50%) scale(${scale})`;
      const zIndex = Math.round(500 - z_i);

      return {
        ...sys,
        index: idx,
        screenX,
        screenY,
        zIndex,
        opacity,
        transform,
        scale,
        isActive
      };
    });
  });

  constructor() {
    // Watch scroll progress to snap rotate active system
    effect(() => {
      const p = this.progress();
      if (!this.active()) return;

      let targetIdx = 0;
      if (p < 0.15) {
        targetIdx = 0;
      } else if (p < 0.35) {
        targetIdx = 1;
      } else if (p < 0.55) {
        targetIdx = 2;
      } else if (p < 0.75) {
        targetIdx = 3;
      } else if (p < 0.90) {
        targetIdx = 4;
      } else {
        targetIdx = -1; // Final Sequence
      }

      this.updateActiveSystem(targetIdx);
    });

    // Auto initialize templates when rendering is true
    effect(() => {
      if (this.shouldRender()) {
        setTimeout(() => {
          this.initCanvases();
        }, 0);
      }
    });
  }

  ngOnInit(): void {
    this.sceneEngine.registerLifecycle('ai', this);

    if (this.animationService.getIsBrowser()) {
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('resize', this.onResize);
      this.viewportSize.set({ width: window.innerWidth, height: window.innerHeight });
    }
  }

  ngAfterViewInit(): void {
    if (this.animationService.getIsBrowser() && this.active()) {
      this.onEnter();
    }
  }

  onEnter(): void {
    console.log('[Scene: AI Core] Entered');
    this.isSceneActive = true;
    this.jarvisService.showMessage('Accessing Core Orchestration Terminal', 4000);

    if (this.animationService.getIsBrowser() && !this.animationFrameId) {
      this.startAnimationLoop();
    }
  }

  onLeave(): void {
    console.log('[Scene: AI Core] Leaved');
    this.isSceneActive = false;
  }

  onProgress(progress: number): void {
    // Handled reactively
  }

  private updateActiveSystem(newIdx: number): void {
    if (newIdx === this.prevTargetIdx) return;
    this.prevTargetIdx = newIdx;

    this.activeIdx.set(newIdx);

    if (this.activeTween) {
      this.activeTween.kill();
      this.activeTween = null;
    }

    if (newIdx === -1) {
      // Transition to final sequence
      const stateObj = { phi: this.currentPhi(), zoomZ: this.cameraZoomZ() };
      this.activeTween = this.animationService.to(stateObj, {
        phi: Math.PI / 2 - (4 * 2 * Math.PI) / 5, // keep same angle as last system
        zoomZ: 0,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          this.currentPhi.set(stateObj.phi);
          this.cameraZoomZ.set(stateObj.zoomZ);
        },
        onComplete: () => {
          this.currentPhi.set(Math.PI / 2 - (4 * 2 * Math.PI) / 5);
          this.cameraZoomZ.set(0);
        }
      });
      return;
    }

    // Dynamic camera and ring rotation transitions using GSAP
    const targetPhi = Math.PI / 2 - (newIdx * 2 * Math.PI) / 5;
    let diff = targetPhi - this.currentPhi();
    // Shortest path interpolation
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const finalTargetPhi = this.currentPhi() + diff;

    const stateObj = { phi: this.currentPhi(), zoomZ: this.cameraZoomZ() };
    this.activeTween = this.animationService.to(stateObj, {
      phi: finalTargetPhi,
      zoomZ: -60, // Slight forward zoom toward active system
      duration: 1.0,
      ease: 'power2.out',
      onUpdate: () => {
        this.currentPhi.set(stateObj.phi);
        this.cameraZoomZ.set(stateObj.zoomZ);
      },
      onComplete: () => {
        this.currentPhi.set(targetPhi);
        this.cameraZoomZ.set(-60);
      }
    });

    // Speak details on focus change
    const focusedTitle = this.systemsData[newIdx].name;
    this.jarvisService.showMessage(`Focusing: ${focusedTitle}`, 2500);
  }

  onNodeClick(idx: number): void {
    const localPs = [0.08, 0.25, 0.45, 0.65, 0.825];
    const localP = localPs[idx];

    const metadata = this.sceneEngine.scenesMetadata().find(m => m.id === 'ai');
    if (metadata) {
      const globalP = metadata.scrollStart + localP * (metadata.scrollEnd - metadata.scrollStart);
      const maxScroll = this.sceneEngine.totalScrollHeight() - (typeof window !== 'undefined' ? window.innerHeight : 0);
      const scrollPixel = globalP * maxScroll;
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: scrollPixel, behavior: 'smooth' });
      }
    }
  }

  private initCanvases(): void {
    const root = this.el.nativeElement;
    this.bgCanvas = root.querySelector('.ai-bg-canvas');
    if (this.bgCanvas) this.bgCtx = this.bgCanvas.getContext('2d');

    this.coreCanvas = root.querySelector('.ai-core-canvas');
    if (this.coreCanvas) this.coreCtx = this.coreCanvas.getContext('2d');

    this.resizeCanvases();
    this.initBgParticles();
  }

  private initBgParticles(): void {
    this.bgParticles = [];
    const colors = ['6, 182, 212', '139, 92, 246', '34, 197, 94', '251, 191, 36'];

    for (let i = 0; i < 60; i++) {
      this.bgParticles.push({
        x: (Math.random() - 0.5) * 1600,
        y: (Math.random() - 0.5) * 1000,
        z: Math.random() * 1800 - 300,
        size: Math.random() * 1.5 + 0.6,
        vx: (Math.random() * 0.4 - 0.2),
        vy: (Math.random() * 0.4 - 0.2),
        vz: -(Math.random() * 0.5 + 0.2),
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.45 + 0.15
      });
    }
  }

  private startAnimationLoop(): void {
    const tick = () => {
      if (!this.isSceneActive && this.progress() === 0) {
        this.animationFrameId = null;
        return;
      }
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  private renderFrame(): void {
    this.renderTime += 1;
    this.renderBgCanvas();
    this.renderCoreCanvas();
  }

  private renderBgCanvas(): void {
    if (!this.bgCanvas || !this.bgCtx) return;

    const width = this.bgCanvas.width / (window.devicePixelRatio || 1);
    const height = this.bgCanvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;

    this.bgCtx.clearRect(0, 0, width, height);

    // Apply mouse parallax target shifts
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    // Project coordinates
    const focalLength = 400;
    this.bgParticles.forEach(p => {
      p.z += p.vz;
      p.x += p.vx;
      p.y += p.vy;

      if (p.z < -300) {
        p.z = 1500; // wrap to back
      }

      const relativeZ = p.z;
      const scale = focalLength / (focalLength + relativeZ);
      const scrX = centerX + p.x * scale + this.mouseX * 25 * scale;
      const scrY = centerY + p.y * scale + this.mouseY * 25 * scale;

      if (scrX < 0 || scrX > width || scrY < 0 || scrY > height) return;

      const size = p.size * scale;
      let opacity = p.opacity * (1.0 - p.z / 1500);
      opacity = Math.max(0.01, Math.min(1.0, opacity));

      this.bgCtx!.beginPath();
      this.bgCtx!.arc(scrX, scrY, size, 0, Math.PI * 2);
      this.bgCtx!.fillStyle = `rgba(${p.color}, ${opacity})`;
      this.bgCtx!.fill();
    });

    // Draw connecting network lines in background
    this.bgCtx.save();
    this.bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    this.bgCtx.lineWidth = 0.5;
    for (let i = 0; i < this.bgParticles.length; i += 4) {
      for (let j = i + 1; j < i + 4; j++) {
        if (j >= this.bgParticles.length) break;
        const p1 = this.bgParticles[i];
        const p2 = this.bgParticles[j];
        
        const scale1 = focalLength / (focalLength + p1.z);
        const scale2 = focalLength / (focalLength + p2.z);
        const x1 = centerX + p1.x * scale1 + this.mouseX * 25 * scale1;
        const y1 = centerY + p1.y * scale1 + this.mouseY * 25 * scale1;
        const x2 = centerX + p2.x * scale2 + this.mouseX * 25 * scale2;
        const y2 = centerY + p2.y * scale2 + this.mouseY * 25 * scale2;

        this.bgCtx.beginPath();
        this.bgCtx.moveTo(x1, y1);
        this.bgCtx.lineTo(x2, y2);
        this.bgCtx.stroke();
      }
    }
    this.bgCtx.restore();
  }

  private renderCoreCanvas(): void {
    if (!this.coreCanvas || !this.coreCtx) return;

    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const size = this.coreCanvas.width / dpr;
    const center = size / 2;
    this.coreCtx.clearRect(0, 0, size, size);

    const activeIdx = this.activeIdx();
    const isFinal = this.isFinalActive();
    
    // Core color theme matches the focused system
    let coreColor = '6, 182, 212'; // Default Cyan
    let coreHex = '#06b6d4';
    if (activeIdx >= 0 && activeIdx < this.systemsData.length) {
      const data = this.systemsData[activeIdx];
      coreHex = data.color;
      // Convert hex to rgb
      if (coreHex === '#22c55e') coreColor = '34, 197, 94';
      else if (coreHex === '#3b82f6') coreColor = '59, 130, 246';
      else if (coreHex === '#fbbf24') coreColor = '251, 191, 36';
      else if (coreHex === '#a855f7') coreColor = '168, 85, 247';
    } else if (isFinal) {
      coreColor = '20, 184, 166'; // Golden teal
      coreHex = '#14b8a6';
    }

    // 1. Draw Expanding Energy Ripples
    if (this.renderTime % 70 === 0) {
      this.energyRipples.push({
        r: 30,
        maxR: 160,
        opacity: 0.45,
        speed: 0.9,
        color: coreHex
      });
    }

    this.coreCtx.save();
    this.energyRipples.forEach((rip, rIdx) => {
      rip.r += rip.speed;
      rip.opacity = 0.45 * (1.0 - rip.r / rip.maxR);

      if (rip.r >= rip.maxR) {
        this.energyRipples.splice(rIdx, 1);
        return;
      }

      this.coreCtx!.strokeStyle = rip.color;
      this.coreCtx!.globalAlpha = rip.opacity;
      this.coreCtx!.lineWidth = 0.6;
      this.coreCtx!.beginPath();
      this.coreCtx!.arc(center, center, rip.r, 0, Math.PI * 2);
      this.coreCtx!.stroke();
    });
    this.coreCtx.restore();

    // 2. Draw Concentric Rotating Rings (Alternating Directions)
    this.coreCtx.save();
    this.coreCtx.lineWidth = 1.0;

    const rings = [
      { r: 42, speed: 0.012 },
      { r: 65, speed: -0.007 },
      { r: 90, speed: 0.004 }
    ];

    rings.forEach((ring, idx) => {
      const angle = this.renderTime * ring.speed;
      this.coreCtx!.strokeStyle = idx === 1 ? `rgba(${coreColor}, 0.28)` : `rgba(255, 255, 255, 0.08)`;
      
      this.coreCtx!.beginPath();
      this.coreCtx!.arc(center, center, ring.r, 0, Math.PI * 2);
      this.coreCtx!.stroke();

      // Mechanical dashes/segments
      const dashCount = idx === 1 ? 8 : 4;
      this.coreCtx!.strokeStyle = idx === 1 ? `rgba(${coreColor}, 0.7)` : `rgba(255, 255, 255, 0.25)`;
      this.coreCtx!.lineWidth = idx === 1 ? 1.8 : 0.8;
      
      for (let d = 0; d < dashCount; d++) {
        const aStart = angle + (d * Math.PI * 2) / dashCount;
        const aEnd = aStart + Math.PI / 16;
        
        this.coreCtx!.beginPath();
        this.coreCtx!.arc(center, center, ring.r, aStart, aEnd);
        this.coreCtx!.stroke();
      }
    });
    this.coreCtx.restore();

    // 3. Draw Cognitive Synaptic Pulses
    if (this.renderTime % 12 === 0 && this.coreSynapses.length < 15) {
      const startAngle = Math.random() * Math.PI * 2;
      const endAngle = startAngle + (Math.random() - 0.5) * Math.PI * 0.8;
      const startR = 15 + Math.random() * 15;
      const endR = 40 + Math.random() * 25;

      this.coreSynapses.push({
        x: center + Math.cos(startAngle) * startR,
        y: center + Math.sin(startAngle) * startR,
        targetX: center + Math.cos(endAngle) * endR,
        targetY: center + Math.sin(endAngle) * endR,
        t: 0,
        speed: 0.02 + Math.random() * 0.03,
        color: coreHex
      });
    }

    this.coreCtx.save();
    this.coreSynapses.forEach((syn, sIdx) => {
      syn.t += syn.speed;
      if (syn.t >= 1.0) {
        this.coreSynapses.splice(sIdx, 1);
        return;
      }

      const curX = syn.x + (syn.targetX - syn.x) * syn.t;
      const curY = syn.y + (syn.targetY - syn.y) * syn.t;

      this.coreCtx!.fillStyle = syn.color;
      this.coreCtx!.globalAlpha = 0.8 * (1.0 - syn.t);
      this.coreCtx!.beginPath();
      this.coreCtx!.arc(curX, curY, 1.2, 0, Math.PI * 2);
      this.coreCtx!.fill();

      // Connector line
      this.coreCtx!.strokeStyle = syn.color;
      this.coreCtx!.globalAlpha = 0.12 * (1.0 - syn.t);
      this.coreCtx!.beginPath();
      this.coreCtx!.moveTo(syn.x, syn.y);
      this.coreCtx!.lineTo(curX, curY);
      this.coreCtx!.stroke();
    });
    this.coreCtx.restore();

    // 4. Draw Central Pulsing Quantum Holographic Core (Breathing Core)
    const baseCoreR = isFinal ? 38 : 28;
    const pulseAmp = isFinal ? 6 : 4.5;
    const pulseFreq = isFinal ? 0.055 : 0.035;
    const corePulseR = baseCoreR + Math.sin(this.renderTime * pulseFreq) * pulseAmp;

    this.coreCtx.save();
    const grad = this.coreCtx.createRadialGradient(center, center, 0, center, center, corePulseR * 2.2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.2, `rgba(${coreColor}, 0.8)`);
    grad.addColorStop(0.55, `rgba(${coreColor}, 0.2)`);
    grad.addColorStop(1, 'transparent');

    this.coreCtx.beginPath();
    this.coreCtx.arc(center, center, corePulseR * 2.2, 0, Math.PI * 2);
    this.coreCtx.fillStyle = grad;
    this.coreCtx.fill();
    
    // Core boundary ring
    this.coreCtx.strokeStyle = `rgba(${coreColor}, 0.55)`;
    this.coreCtx.lineWidth = 0.8;
    this.coreCtx.beginPath();
    this.coreCtx.arc(center, center, corePulseR, 0, Math.PI * 2);
    this.coreCtx.stroke();
    this.coreCtx.restore();
  }

  private resizeCanvases(): void {
    if (this.bgCanvas && this.bgCtx) {
      const rect = this.bgCanvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
      const dpr = window.devicePixelRatio || 1;
      this.bgCanvas.width = rect.width * dpr;
      this.bgCanvas.height = rect.height * dpr;
      this.bgCanvas.style.width = `${rect.width}px`;
      this.bgCanvas.style.height = `${rect.height}px`;
      this.bgCtx.resetTransform();
      this.bgCtx.scale(dpr, dpr);
    }

    if (this.coreCanvas && this.coreCtx) {
      const rect = this.coreCanvas.parentElement?.getBoundingClientRect() || { width: 340, height: 340 };
      const dpr = window.devicePixelRatio || 1;
      this.coreCanvas.width = rect.width * dpr;
      this.coreCanvas.height = rect.height * dpr;
      this.coreCanvas.style.width = `${rect.width}px`;
      this.coreCanvas.style.height = `${rect.height}px`;
      this.coreCtx.resetTransform();
      this.coreCtx.scale(dpr, dpr);
    }
  }

  private readonly onResize = (): void => {
    this.resizeCanvases();
    this.viewportSize.set({ width: window.innerWidth, height: window.innerHeight });
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    this.targetMouseX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    this.targetMouseY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  };

  ngOnDestroy(): void {
    this.sceneEngine.unregisterLifecycle('ai');

    if (this.animationService.getIsBrowser()) {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('resize', this.onResize);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
