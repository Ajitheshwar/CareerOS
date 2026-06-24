import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneEngineService } from '../../core/services/scene-engine.service';
import { JarvisService } from '../../core/services/jarvis.service';
import { AnimationService } from '../../core/services/animation.service';
import { SceneLifecycle } from '../../core/types/scene.types';

interface Skill {
  id: string;
  name: string;
  isPrimary: boolean;
  description: string;
  stageIndex: number;
  angle: number;
  radius: number;
  color: string;
  colorRgb: string;
}

interface ProjectedSkillNode {
  id: string;
  name: string;
  isPrimary: boolean;
  description: string;
  transform: string;
  opacity: number;
  zIndex: number;
  color: string;
  vectorLength: number;
  vectorRotation: string;
}

interface CanvasParticle {
  x: number;
  y: number;
  z: number;
  speed: number;
  size: number;
  color: string;
  opacity: number;
  angle?: number;
}

interface SidebarBlock {
  title: string;
  borderColorClass: string;
  textColorClass: string;
  items: string[];
}

@Component({
  selector: 'app-skills-engine',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills-engine.html',
  styleUrl: './skills-engine.scss'
})
export class SkillsEngine implements OnInit, AfterViewInit, OnDestroy, SceneLifecycle {
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly jarvisService = inject(JarvisService);
  private readonly animationService = inject(AnimationService);
  private readonly el = inject(ElementRef);

  public readonly sidebarBlocks: SidebarBlock[] = [
    {
      title: 'FRAGMENTS_LOADED:',
      borderColorClass: 'border-accent-cyan/20',
      textColorClass: 'text-accent-cyan',
      items: [
        '// 100+ Components Built',
        '// Enterprise Applications',
        '// Reusable Architecture',
        '// Performance Optimization',
        '// Design Systems'
      ]
    },
    {
      title: 'NETWORK_PIPES:',
      borderColorClass: 'border-accent-green/20',
      textColorClass: 'text-accent-green',
      items: [
        '// REST Architecture',
        '// Async Packet Streams',
        '// Auth Token Handshakes',
        '// Secure Cryptography'
      ]
    },
    {
      title: 'STORAGE_SECTORS:',
      borderColorClass: 'border-accent-blue/20',
      textColorClass: 'text-accent-blue',
      items: [
        '// Document Aggregations',
        '// Optimized Query Latency',
        '// Real-time Cloud Sync',
        '// Normalized Data Structures'
      ]
    },
    {
      title: 'COGNITIVE_NET:',
      borderColorClass: 'border-accent-yellow/20',
      textColorClass: 'text-accent-yellow',
      items: [
        '// Autonomous Agents',
        '// Prompt Graph Loops',
        '// Memory Abstractions',
        '// LLM Assisted Workflows'
      ]
    },
    {
      title: 'FOUNDRY_CORE:',
      borderColorClass: 'border-accent-purple/20',
      textColorClass: 'text-accent-purple',
      items: [
        '// Scalable Architectures',
        '// Clean Code Standards',
        '// Team Agile Sprints',
        '// Domain Driven Design'
      ]
    }
  ];

  // Active state and scroll progress normalized within Scene 3 limits (0.0 to 1.0)
  public readonly active = input<boolean>(false);
  public readonly progress = input<number>(0);

  // Determine whether this component should remain in DOM
  public readonly shouldRender = computed(() => {
    return this.active() || (this.progress() > 0 && this.progress() < 1.0);
  });

  // Track the active stage index from 0 to 4 based on progress
  public readonly activeStageIndex = computed(() => {
    const localScroll = this.progress() * 1000;
    if (localScroll < 200) return 0;
    if (localScroll < 400) return 1;
    if (localScroll < 600) return 2;
    if (localScroll < 800) return 3;
    return 4;
  });

  public readonly activeStageTitle = computed(() => {
    const titles = [
      'Frontend Runtime',
      'Backend Processing Layer',
      'Data & Analytics Layer',
      'AI Operating Layer',
      'Engineering Foundations'
    ];
    return titles[this.activeStageIndex()];
  });

  public readonly systemStatus = computed(() => {
    const statuses = [
      'RENDERING RUNTIME / ONLINE',
      'PIPELINE ROUTING / ACTIVE',
      'CLUSTER SHARDS / READY',
      'AGENT NETWORK / COGNITIVE',
      'SYSTEM FOUNDATIONS / STABLE'
    ];
    return statuses[this.activeStageIndex()];
  });

  public readonly reactorTemp = computed(() => {
    const idx = this.activeStageIndex();
    const temps = [782, 846, 620, 954, 420];
    return temps[idx];
  });

  public readonly reactorRotSpeed = computed(() => {
    const idx = this.activeStageIndex();
    const speeds = [1.8, 1.2, 0.6, 2.5, 0.2];
    return speeds[idx];
  });

  // Signal holding projected HTML skill node parameters
  public readonly projectedSkills = signal<ProjectedSkillNode[]>([]);

  // Canvas context and animation fields
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private isSceneActive = false;
  private renderTime = 0;

  // 3D Camera Projection variables
  private readonly focalLength = 350;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  // Background environment ambient particles
  private ambientParticles: CanvasParticle[] = [];
  private readonly ambientCount = 80;

  // Skills static configuration data
  private readonly skillsData: Skill[] = [
    // Stage 0: Frontend (7 skills)
    { id: 'angular', name: 'Angular', isPrimary: true, description: 'Builds scalable enterprise frontends with modular architecture and reusable components.', stageIndex: 0, angle: 0, radius: 250, color: '#f43f5e', colorRgb: '244, 63, 94' },
    { id: 'typescript', name: 'TypeScript', isPrimary: true, description: 'Develops type-safe applications with improved maintainability and developer productivity.', stageIndex: 0, angle: (2 * Math.PI) / 7, radius: 280, color: '#38bdf8', colorRgb: '56, 189, 248' },
    { id: 'rxjs', name: 'RxJS', isPrimary: true, description: 'Implements reactive data flows and complex asynchronous workflows.', stageIndex: 0, angle: (4 * Math.PI) / 7, radius: 280, color: '#ec4899', colorRgb: '236, 72, 153' },
    { id: 'javascript', name: 'JavaScript', isPrimary: false, description: 'Strong understanding of modern ES6+ patterns and browser runtime behavior.', stageIndex: 0, angle: (6 * Math.PI) / 7, radius: 420, color: '#fbbf24', colorRgb: '251, 191, 36' },
    { id: 'ngxs', name: 'NGXS', isPrimary: false, description: 'Manages scalable application state using predictable reactive patterns.', stageIndex: 0, angle: (8 * Math.PI) / 7, radius: 420, color: '#0ea5e9', colorRgb: '14, 165, 233' },
    { id: 'html5', name: 'HTML5', isPrimary: false, description: 'Creates semantic, accessible, and standards-compliant web interfaces.', stageIndex: 0, angle: (10 * Math.PI) / 7, radius: 440, color: '#f97316', colorRgb: '249, 115, 22' },
    { id: 'css3', name: 'CSS3', isPrimary: false, description: 'Builds responsive, animated, and visually polished user experiences.', stageIndex: 0, angle: (12 * Math.PI) / 7, radius: 440, color: '#06b6d4', colorRgb: '6, 182, 212' },

    // Stage 1: Backend (7 skills)
    { id: 'nodejs', name: 'Node.js', isPrimary: true, description: 'Develops high-performance backend services and APIs using JavaScript.', stageIndex: 1, angle: 0, radius: 250, color: '#22c55e', colorRgb: '34, 197, 94' },
    { id: 'express', name: 'Express', isPrimary: true, description: 'Creates lightweight and scalable RESTful application backends.', stageIndex: 1, angle: (2 * Math.PI) / 7, radius: 280, color: '#a8a29e', colorRgb: '168, 162, 158' },
    { id: 'restapis', name: 'REST APIs', isPrimary: true, description: 'Designs and integrates secure and maintainable API contracts.', stageIndex: 1, angle: (4 * Math.PI) / 7, radius: 280, color: '#10b981', colorRgb: '16, 185, 129' },
    { id: 'apidesign', name: 'API Design', isPrimary: false, description: 'Structures scalable service interfaces for long-term maintainability.', stageIndex: 1, angle: (6 * Math.PI) / 7, radius: 420, color: '#34d399', colorRgb: '52, 211, 153' },
    { id: 'auth', name: 'Authentication', isPrimary: false, description: 'Implements secure user access and authorization workflows.', stageIndex: 1, angle: (8 * Math.PI) / 7, radius: 420, color: '#fb7185', colorRgb: '251, 113, 133' },
    { id: 'serviceint', name: 'Service Integration', isPrimary: false, description: 'Coordinates data communication between external software and services.', stageIndex: 1, angle: (10 * Math.PI) / 7, radius: 440, color: '#38bdf8', colorRgb: '56, 189, 248' },
    { id: 'backcomm', name: 'Backend Comm.', isPrimary: false, description: 'Manages data transfer protocols and socket connections.', stageIndex: 1, angle: (12 * Math.PI) / 7, radius: 440, color: '#6366f1', colorRgb: '99, 102, 241' },

    // Stage 2: Data (8 skills)
    { id: 'mongodb', name: 'MongoDB', isPrimary: true, description: 'Designs flexible document databases for modern applications.', stageIndex: 2, angle: 0, radius: 260, color: '#10b981', colorRgb: '16, 185, 129' },
    { id: 'mysql', name: 'MySQL', isPrimary: true, description: 'Works with relational data models and optimized query design.', stageIndex: 2, angle: Math.PI / 4, radius: 260, color: '#0284c7', colorRgb: '2, 132, 199' },
    { id: 'firebase', name: 'Firebase', isPrimary: true, description: 'Builds real-time cloud-connected application features.', stageIndex: 2, angle: Math.PI / 2, radius: 280, color: '#f59e0b', colorRgb: '245, 158, 11' },
    { id: 'highcharts', name: 'Highcharts', isPrimary: true, description: 'Creates interactive dashboards and business intelligence visualizations.', stageIndex: 2, angle: 3 * Math.PI / 4, radius: 280, color: '#8b5cf6', colorRgb: '139, 92, 246' },
    { id: 'datamodeling', name: 'Data Modeling', isPrimary: false, description: 'Designs efficient structures for scalable data storage and retrieval.', stageIndex: 2, angle: Math.PI, radius: 420, color: '#6366f1', colorRgb: '99, 102, 241' },
    { id: 'queryopt', name: 'Query Optimization', isPrimary: false, description: 'Improves application performance through efficient database operations.', stageIndex: 2, angle: 5 * Math.PI / 4, radius: 420, color: '#ec4899', colorRgb: '236, 72, 153' },
    { id: 'analytics', name: 'Analytics', isPrimary: false, description: 'Tracks, aggregates, and visualizes application performance metrics.', stageIndex: 2, angle: 6 * Math.PI / 4, radius: 440, color: '#06b6d4', colorRgb: '6, 182, 212' },
    { id: 'dashboards', name: 'Dashboards', isPrimary: false, description: 'Builds interactive visualizations and controls for complex data.', stageIndex: 2, angle: 7 * Math.PI / 4, radius: 440, color: '#3b82f6', colorRgb: '59, 130, 246' },

    // Stage 3: AI (9 skills)
    { id: 'cursorai', name: 'Cursor AI', isPrimary: true, description: 'Accelerates software delivery through AI-assisted engineering workflows.', stageIndex: 3, angle: 0, radius: 250, color: '#fbbf24', colorRgb: '251, 191, 36' },
    { id: 'antigravity', name: 'Antigravity IDE', isPrimary: true, description: 'Leverages intelligent development environments for rapid prototyping.', stageIndex: 3, angle: 2 * Math.PI / 9, radius: 270, color: '#a855f7', colorRgb: '168, 85, 247' },
    { id: 'prompteng', name: 'Prompt Engineering', isPrimary: true, description: 'Designs effective prompts for reliable AI-assisted outcomes.', stageIndex: 3, angle: 4 * Math.PI / 9, radius: 270, color: '#f43f5e', colorRgb: '244, 63, 94' },
    { id: 'agenticflows', name: 'Agentic Workflows', isPrimary: true, description: 'Builds autonomous workflows using multi-step AI orchestration.', stageIndex: 3, angle: 6 * Math.PI / 9, radius: 270, color: '#06b6d4', colorRgb: '6, 182, 212' },
    { id: 'langgraph', name: 'LangGraph', isPrimary: false, description: 'Orchestrates stateful agent workflows and reasoning pipelines.', stageIndex: 3, angle: 8 * Math.PI / 9, radius: 420, color: '#3b82f6', colorRgb: '59, 130, 246' },
    { id: 'multiagent', name: 'Multi-Agent', isPrimary: false, description: 'Coordinates specialized AI agents to solve complex tasks.', stageIndex: 3, angle: 10 * Math.PI / 9, radius: 420, color: '#ec4899', colorRgb: '236, 72, 153' },
    { id: 'aiassisted', name: 'AI Assisted Dev', isPrimary: false, description: 'Leverages AI code generation and refinement for rapid delivery.', stageIndex: 3, angle: 12 * Math.PI / 9, radius: 440, color: '#10b981', colorRgb: '16, 185, 129' },
    { id: 'workfloworch', name: 'Workflow Orch.', isPrimary: false, description: 'Designs and coordinates multi-step automated development flows.', stageIndex: 3, angle: 14 * Math.PI / 9, radius: 440, color: '#6366f1', colorRgb: '99, 102, 241' },
    { id: 'careerops', name: 'CareerOps', isPrimary: false, description: 'Automates professional operations and growth tracking systems.', stageIndex: 3, angle: 16 * Math.PI / 9, radius: 440, color: '#14b8a6', colorRgb: '20, 184, 166' },

    // Stage 4: Foundations (9 skills)
    { id: 'dsa', name: 'DSA', isPrimary: true, description: 'Applies algorithmic thinking and data structures to solve problems efficiently.', stageIndex: 4, angle: 0, radius: 250, color: '#06b6d4', colorRgb: '6, 182, 212' },
    { id: 'sysdesign', name: 'System Design', isPrimary: true, description: 'Designs scalable, maintainable, and resilient software architectures.', stageIndex: 4, angle: 2 * Math.PI / 9, radius: 270, color: '#3b82f6', colorRgb: '59, 130, 246' },
    { id: 'oop', name: 'OOP', isPrimary: true, description: 'Designs maintainable systems using object-oriented principles.', stageIndex: 4, angle: 4 * Math.PI / 9, radius: 270, color: '#8b5cf6', colorRgb: '139, 92, 246' },
    { id: 'patterns', name: 'Design Patterns', isPrimary: true, description: 'Uses proven architectural patterns to solve recurring engineering problems.', stageIndex: 4, angle: 6 * Math.PI / 9, radius: 270, color: '#ec4899', colorRgb: '236, 72, 153' },
    { id: 'sdlc', name: 'SDLC', isPrimary: false, description: 'Applies structured software development and delivery practices.', stageIndex: 4, angle: 8 * Math.PI / 9, radius: 420, color: '#10b981', colorRgb: '16, 185, 129' },
    { id: 'agile', name: 'Agile/Scrum', isPrimary: false, description: 'Delivers software iteratively within cross-functional product teams.', stageIndex: 4, angle: 10 * Math.PI / 9, radius: 420, color: '#f59e0b', colorRgb: '245, 158, 11' },
    { id: 'scalability', name: 'Scalability', isPrimary: false, description: 'Builds systems capable of handling growth and increasing complexity.', stageIndex: 4, angle: 12 * Math.PI / 9, radius: 440, color: '#f43f5e', colorRgb: '244, 63, 94' },
    { id: 'ownership', name: 'Technical Ownership', isPrimary: false, description: 'Drives architecture, implementation, and delivery of critical features.', stageIndex: 4, angle: 14 * Math.PI / 9, radius: 440, color: '#38bdf8', colorRgb: '56, 189, 248' },
    { id: 'problemsolving', name: 'Problem Solving', isPrimary: false, description: 'Transforms complex requirements into practical engineering solutions.', stageIndex: 4, angle: 16 * Math.PI / 9, radius: 440, color: '#14b8a6', colorRgb: '20, 184, 166' }
  ];

  // Easing function for smooth cinematic animations
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Eased container fade-in / fade-out styles
  public readonly containerStyle = computed(() => {
    const prog = this.progress();
    let opacity = 1;
    let filter = 'none';

    // Fade in from Scene 2
    if (prog < 0.05) {
      opacity = prog / 0.05;
    } 
    // Fade out towards Scene 4
    else if (prog > 0.95) {
      opacity = (1 - prog) / 0.05;
      filter = `blur(${(prog - 0.95) / 0.05 * 6}px)`;
    }

    return {
      opacity: `${opacity}`,
      filter: filter,
      display: opacity <= 0.001 ? 'none' : 'flex'
    };
  });

  constructor() {
    effect(() => {
      if (this.shouldRender()) {
        setTimeout(() => {
          this.initCanvasAndAmbient();
        }, 0);
      }
    });
  }

  ngOnInit(): void {
    this.sceneEngine.registerLifecycle('skills', this);

    if (this.animationService.getIsBrowser()) {
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('resize', this.onResize);
    }
  }

  ngAfterViewInit(): void {
    if (this.animationService.getIsBrowser() && this.active()) {
      this.onEnter();
    }
  }

  onEnter(): void {
    console.log('[Scene: Skills Engine] Entered');
    this.isSceneActive = true;
    this.jarvisService.showMessage('Core Skills Engine Online', 4000);

    if (this.animationService.getIsBrowser() && !this.animationFrameId) {
      this.startAnimationLoop();
    }
  }

  onLeave(): void {
    console.log('[Scene: Skills Engine] Leaved');
    this.isSceneActive = false;
  }

  onProgress(progress: number): void {
    // Computed signals handle reactively, no operations needed in progress hook
  }

  onStageClick(idx: number): void {
    const localPs = [0.10, 0.30, 0.50, 0.70, 0.90];
    const localP = localPs[idx];

    const metadata = this.sceneEngine.scenesMetadata().find(m => m.id === 'skills');
    if (metadata) {
      const globalP = metadata.scrollStart + localP * (metadata.scrollEnd - metadata.scrollStart);
      const maxScroll = this.sceneEngine.totalScrollHeight() - (typeof window !== 'undefined' ? window.innerHeight : 0);
      const scrollPixel = globalP * maxScroll;
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: scrollPixel, behavior: 'smooth' });
      }
    }
  }

  private initCanvasAndAmbient(): void {
    this.canvas = this.el.nativeElement.querySelector('.skills-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Populate ambient particles mapping the continuous space
    this.ambientParticles = [];
    const colors = ['6, 182, 212', '34, 197, 94', '59, 130, 246', '168, 85, 247'];

    for (let i = 0; i < this.ambientCount; i++) {
      this.ambientParticles.push({
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 1200,
        z: Math.random() * 2000 - 200,
        speed: Math.random() * 0.4 + 0.1,
        size: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.4 + 0.1
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
    if (!this.canvas || !this.ctx) return;

    this.renderTime += 1;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;

    this.ctx.clearRect(0, 0, width, height);

    // Apply mouse parallax target easing
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.08;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.08;

    const prog = this.progress();
    const localScroll = prog * 1000;

    // 1. Forward camera motion with plateau-based step-and-hold pacing around stage midpoints
    let cameraZ = prog * 2000 - 200;
    const smoothstep = (x: number) => {
      const clamped = Math.min(1.0, Math.max(0.0, x));
      return clamped * clamped * (3 - 2 * clamped);
    };

    if (localScroll < 50) {
      const t = localScroll / 50;
      cameraZ = -200 + 120 * smoothstep(t);
    } else if (localScroll >= 50 && localScroll < 150) {
      cameraZ = -80;
    } else if (localScroll >= 150 && localScroll < 250) {
      const t = (localScroll - 150) / 100;
      cameraZ = -80 + 400 * smoothstep(t);
    } else if (localScroll >= 250 && localScroll < 350) {
      cameraZ = 320;
    } else if (localScroll >= 350 && localScroll < 450) {
      const t = (localScroll - 350) / 100;
      cameraZ = 320 + 400 * smoothstep(t);
    } else if (localScroll >= 450 && localScroll < 550) {
      cameraZ = 720;
    } else if (localScroll >= 550 && localScroll < 650) {
      const t = (localScroll - 550) / 100;
      cameraZ = 720 + 400 * smoothstep(t);
    } else if (localScroll >= 650 && localScroll < 750) {
      cameraZ = 1120;
    } else if (localScroll >= 750 && localScroll < 850) {
      const t = (localScroll - 750) / 100;
      cameraZ = 1120 + 400 * smoothstep(t);
    } else if (localScroll >= 850 && localScroll < 950) {
      cameraZ = 1520;
    } else {
      const t = (localScroll - 950) / 50;
      cameraZ = 1520 + 280 * smoothstep(t);
    }
    const camAngleX = this.mouseY * 0.12;
    const camAngleY = this.mouseX * 0.12;

    // Helper functions for 3D rotations
    const rotatePointY = (x: number, y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x: x * cos - z * sin, y, z: x * sin + z * cos };
    };

    const rotatePointX = (x: number, y: number, z: number, angle: number) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { x, y: y * cos + z * sin, z: -y * sin + z * cos };
    };

    // Projection matrix mapping Z relative to camera with full 3D rotation (grids, environment)
    const project3D = (x: number, y: number, z: number) => {
      let r = rotatePointY(x, y, z, camAngleY);
      r = rotatePointX(r.x, r.y, r.z, camAngleX);

      // Relative to camera position
      const relativeZ = r.z - cameraZ;
      const denom = this.focalLength + relativeZ;
      if (denom <= 5) return null;

      const scale = this.focalLength / denom;
      return {
        x: centerX + r.x * scale,
        y: centerY + r.y * scale,
        scale,
        depth: r.z
      };
    };

    // Projection matrix for flat 2D orbits & centerpiece translations (skills & reactor)
    const project2D = (x: number, y: number, z: number) => {
      // Relative to camera position
      const relativeZ = z - cameraZ;
      const denom = this.focalLength + relativeZ;
      if (denom <= 5) return null;

      const scale = this.focalLength / denom;
      
      // Simple mouse tilt translation parallax instead of full 3D rotation matrix
      // This ensures skills revolve strictly in X-Y and don't tilt in depth
      const px = x + this.mouseX * 35;
      const py = y + this.mouseY * 35;

      return {
        x: centerX + px * scale,
        y: centerY + py * scale,
        scale,
        depth: z
      };
    };

    // Get current stage details
    const activeIdx = this.activeStageIndex();
    
    // 2. Draw Ambient Environment Background Particles
    this.ambientParticles.forEach(p => {
      // Move particles slowly forward (Z shifts backwards relative to camera)
      p.z -= p.speed;
      if (p.z < -200) {
        p.z = 1800; // wrap around to back
      }

      const screenPt = project3D(p.x, p.y, p.z);
      if (!screenPt) return;

      const size = p.size * screenPt.scale;
      // Fade particles as they get extremely close or far
      let opacity = p.opacity * (1.0 - Math.abs(p.z - (cameraZ + 150)) / 900);
      opacity = Math.max(0.01, Math.min(0.8, opacity));

      this.ctx!.beginPath();
      this.ctx!.arc(screenPt.x, screenPt.y, size, 0, Math.PI * 2);
      this.ctx!.fillStyle = `rgba(${p.color}, ${opacity})`;
      this.ctx!.fill();
    });

    // 3. Draw Persistent reactor centerpiece (drawn at cameraZ depth to lock position in screen center)
    // The reactor is simulated at world Z position identical to cameraZ + 50 (fixed offset in front of camera)
    const reactorWorldZ = cameraZ + 50;
    const reactorScreen = project2D(0, 0, reactorWorldZ);
    
    if (reactorScreen) {
      this.ctx!.save();
      const rx = reactorScreen.x;
      const ry = reactorScreen.y;
      const rScale = reactorScreen.scale;

      // Pulse reactor core based on time and stage intensity
      const pulsePeriod = activeIdx === 3 ? 0.05 : activeIdx === 0 ? 0.025 : activeIdx === 1 ? 0.015 : activeIdx === 2 ? 0.01 : 0.005;
      const pulseAmp = activeIdx === 3 ? 12 : activeIdx === 0 ? 8 : activeIdx === 1 ? 6 : activeIdx === 2 ? 5 : 2;
      const coreRadius = (45 + Math.sin(this.renderTime * pulsePeriod) * pulseAmp) * rScale;

      // Select reactor colors based on active stage
      let gradStart = 'rgba(255, 255, 255, 0.9)';
      let gradMid = 'rgba(6, 182, 212, 0.6)';   // default cyan
      let gradOuter = 'rgba(37, 99, 235, 0.15)'; // default blue
      let themeColor = '#06b6d4';

      if (activeIdx === 1) { // Backend
        gradMid = 'rgba(34, 197, 94, 0.6)';     // green
        gradOuter = 'rgba(16, 185, 129, 0.15)'; // teal
        themeColor = '#22c55e';
      } else if (activeIdx === 2) { // Data
        gradMid = 'rgba(59, 130, 246, 0.6)';    // blue
        gradOuter = 'rgba(139, 92, 246, 0.15)'; // purple
        themeColor = '#3b82f6';
      } else if (activeIdx === 3) { // AI
        gradMid = 'rgba(251, 191, 36, 0.7)';    // gold
        gradOuter = 'rgba(244, 63, 94, 0.2)';   // rose
        themeColor = '#fbbf24';
      } else if (activeIdx === 4) { // Foundations
        gradMid = 'rgba(148, 163, 184, 0.5)';   // slate/silver
        gradOuter = 'rgba(71, 85, 105, 0.12)';  // steel blue
        themeColor = '#94a3b8';
      }

      // Draw Volumetric Glow core radial gradient
      const coreGrad = this.ctx!.createRadialGradient(rx, ry, 0, rx, ry, coreRadius * 2.8);
      coreGrad.addColorStop(0, gradStart);
      coreGrad.addColorStop(0.15, gradMid);
      coreGrad.addColorStop(0.55, gradOuter);
      coreGrad.addColorStop(1, 'transparent');

      this.ctx!.beginPath();
      this.ctx!.arc(rx, ry, coreRadius * 2.8, 0, Math.PI * 2);
      this.ctx!.fillStyle = coreGrad;
      this.ctx!.fill();

      // Outer reconfiguring rings (Gears)
      const ringCount = 3;
      const speeds = [0.012, -0.008, 0.004];
      const radii = [68, 92, 115];

      for (let r = 0; r < ringCount; r++) {
        const ringRadius = radii[r] * rScale;
        const angleOffset = this.renderTime * speeds[r] * (activeIdx === 3 ? 1.8 : 1.0);

        this.ctx!.beginPath();
        this.ctx!.arc(rx, ry, ringRadius, 0, Math.PI * 2);
        this.ctx!.strokeStyle = `${themeColor}2b`; // transparent border
        this.ctx!.lineWidth = 1.0;
        this.ctx!.stroke();

        // Draw mechanical tick segments on the ring
        const tickCount = 45;
        this.ctx!.strokeStyle = `${themeColor}7f`;
        this.ctx!.lineWidth = r === 1 ? 2.0 : 1.0;
        
        for (let t = 0; t < tickCount; t++) {
          // Dash gap patterns
          if (r === 0 && t % 3 === 0) continue;
          if (r === 1 && (t % 5 === 0 || t % 5 === 1)) continue;
          if (r === 2 && t % 4 !== 0) continue;

          const a = angleOffset + (t * Math.PI * 2) / tickCount;
          const cos = Math.cos(a);
          const sin = Math.sin(a);

          const tickLen = r === 1 ? 7 * rScale : 4 * rScale;
          const xStart = rx + ringRadius * cos;
          const yStart = ry + ringRadius * sin;
          const xEnd = rx + (ringRadius + tickLen) * cos;
          const yEnd = ry + (ringRadius + tickLen) * sin;

          this.ctx!.beginPath();
          this.ctx!.moveTo(xStart, yStart);
          this.ctx!.lineTo(xEnd, yEnd);
          this.ctx!.stroke();
        }
      }

      this.ctx!.restore();
    }

    // 4. Render Surrounding Stage Graphics
    // Stage systems Z position configurations
    const stagesZ = [0, 400, 800, 1200, 1600];

    for (let s = 0; s < 5; s++) {
      const stageZ = stagesZ[s];
      // Compute stage active weight based on scroll progress
      let sWeight = 0;
      const startP = s * 200;
      const endP = (s + 1) * 200;

      if (localScroll >= startP - 50 && localScroll <= endP + 50) {
        if (localScroll < startP) {
          sWeight = (localScroll - (startP - 50)) / 50;
        } else if (localScroll > endP) {
          sWeight = ((endP + 50) - localScroll) / 50;
        } else {
          sWeight = 1.0;
        }
      }

      if (sWeight <= 0.01) continue;

      this.ctx!.save();
      this.ctx!.strokeStyle = `rgba(255, 255, 255, ${sWeight * 0.15})`;
      this.ctx!.lineWidth = 0.8;

      if (s === 0) {
        // --- Stage 1: Frontend Runtime (Orbital rings system) ---
        const orbitRadius = 220;
        const segmentCount = 60;
        const tilts = [0, 0]; // Orbit rings strictly flat in 2D

        tilts.forEach((tilt, tIdx) => {
          this.ctx!.beginPath();
          let firstPt = true;
          const rotSpeed = this.renderTime * 0.0025 * (tIdx === 0 ? 1 : -1);

          for (let j = 0; j <= segmentCount; j++) {
            const a = (j * Math.PI * 2) / segmentCount;
            let px = orbitRadius * Math.cos(a + rotSpeed);
            let py = orbitRadius * Math.sin(a + rotSpeed);
            let pz = stageZ;

            const pt = project2D(px, py, pz);
            if (!pt) continue;

            if (firstPt) {
              this.ctx!.moveTo(pt.x, pt.y);
              firstPt = false;
            } else {
              this.ctx!.lineTo(pt.x, pt.y);
            }
          }
          this.ctx!.strokeStyle = tIdx === 0 ? `rgba(244, 63, 94, ${sWeight * 0.12})` : `rgba(56, 189, 248, ${sWeight * 0.12})`;
          this.ctx!.stroke();
        });

      } else if (s === 1) {
        // --- Stage 2: Backend Layer (API Grid pipelines) ---
        // Draw grid pipelines at Z = 400
        const gridLinesY = [-180, -90, 0, 90, 180];
        const gridLength = 500;

        this.ctx!.strokeStyle = `rgba(34, 197, 94, ${sWeight * 0.15})`;
        gridLinesY.forEach(gy => {
          // Horizontal pipes
          const ptLeft = project3D(-gridLength / 2, gy, stageZ);
          const ptRight = project3D(gridLength / 2, gy, stageZ);
          if (ptLeft && ptRight) {
            this.ctx!.beginPath();
            this.ctx!.moveTo(ptLeft.x, ptLeft.y);
            this.ctx!.lineTo(ptRight.x, ptRight.y);
            this.ctx!.stroke();
          }

          // Vertical pipes
          const ptTop = project3D(gy, -gridLength / 2, stageZ);
          const ptBot = project3D(gy, gridLength / 2, stageZ);
          if (ptTop && ptBot) {
            this.ctx!.beginPath();
            this.ctx!.moveTo(ptTop.x, ptTop.y);
            this.ctx!.lineTo(ptBot.x, ptBot.y);
            this.ctx!.stroke();
          }
        });

        // Draw processing boxes at grid intersections
        const boxes = [
          { x: -90, y: -90 }, { x: 90, y: -90 },
          { x: -90, y: 90 }, { x: 90, y: 90 }
        ];
        boxes.forEach(box => {
          const pt = project3D(box.x, box.y, stageZ);
          if (pt) {
            const bSize = 14 * pt.scale;
            this.ctx!.strokeStyle = `rgba(16, 185, 129, ${sWeight * 0.5})`;
            this.ctx!.strokeRect(pt.x - bSize / 2, pt.y - bSize / 2, bSize, bSize);
            this.ctx!.fillStyle = `rgba(34, 197, 94, ${sWeight * 0.08})`;
            this.ctx!.fillRect(pt.x - bSize / 2, pt.y - bSize / 2, bSize, bSize);
          }
        });

        // Small data packets pulsing through pipelines
        const packetCount = 8;
        this.ctx!.fillStyle = `rgba(34, 197, 94, ${sWeight * 0.85})`;
        for (let k = 0; k < packetCount; k++) {
          const pathPercent = ((this.renderTime * 0.004 + k / packetCount) % 1.0);
          const px = -gridLength / 2 + pathPercent * gridLength;
          const py = gridLinesY[k % gridLinesY.length];

          const pt = project3D(px, py, stageZ);
          if (pt) {
            this.ctx!.beginPath();
            this.ctx!.arc(pt.x, pt.y, 2 * pt.scale, 0, Math.PI * 2);
            this.ctx!.fill();
          }
        }

      } else if (s === 2) {
        // --- Stage 3: Data Layer (Cylinder cluster storage) ---
        const clusters = [
          { x: -180, y: -120 }, { x: 180, y: -120 },
          { x: -200, y: 140 }, { x: 200, y: 140 }
        ];

        clusters.forEach((c, idx) => {
          const baseHeight = 50;
          const ptBase = project3D(c.x, c.y + baseHeight, stageZ);
          const ptTop = project3D(c.x, c.y - baseHeight, stageZ);

          if (ptBase && ptTop) {
            const rWidth = 24 * ptBase.scale;
            const cyHeight = ptBase.y - ptTop.y;

            // Gradient for database cylinder
            const cGrad = this.ctx!.createLinearGradient(ptBase.x - rWidth, 0, ptBase.x + rWidth, 0);
            cGrad.addColorStop(0, `rgba(59, 130, 246, ${sWeight * 0.15})`);
            cGrad.addColorStop(0.5, `rgba(139, 92, 246, ${sWeight * 0.28})`);
            cGrad.addColorStop(1, `rgba(59, 130, 246, ${sWeight * 0.15})`);

            this.ctx!.fillStyle = cGrad;
            this.ctx!.fillRect(ptTop.x - rWidth, ptTop.y, rWidth * 2, cyHeight);

            // Draw stacked cylinder outlines (slots)
            this.ctx!.strokeStyle = `rgba(139, 92, 246, ${sWeight * 0.4})`;
            const slots = 3;
            for (let sl = 0; sl <= slots; sl++) {
              const sy = ptTop.y + (cyHeight / slots) * sl;
              this.ctx!.beginPath();
              this.ctx!.ellipse(ptTop.x, sy, rWidth, 6 * ptTop.scale, 0, 0, Math.PI * 2);
              this.ctx!.stroke();
            }
          }
        });

      } else if (s === 3) {
        // --- Stage 4: AI Layer (Agent network and comets) ---
        // Render interconnected nodes web
        const netNodes = [
          { x: -150, y: -150, z: stageZ - 50 },
          { x: 160, y: -100, z: stageZ + 40 },
          { x: -120, y: 120, z: stageZ - 20 },
          { x: 180, y: 150, z: stageZ + 60 },
          { x: 0, y: -220, z: stageZ - 80 },
          { x: -240, y: 0, z: stageZ + 20 },
          { x: 240, y: -40, z: stageZ - 30 }
        ];

        // Draw connections
        this.ctx!.strokeStyle = `rgba(251, 191, 36, ${sWeight * 0.18})`;
        for (let i = 0; i < netNodes.length; i++) {
          for (let j = i + 1; j < netNodes.length; j++) {
            // Only connect nearby nodes
            const distSq = Math.pow(netNodes[i].x - netNodes[j].x, 2) + Math.pow(netNodes[i].y - netNodes[j].y, 2);
            if (distSq < 130000) {
              const pt1 = project3D(netNodes[i].x, netNodes[i].y, netNodes[i].z);
              const pt2 = project3D(netNodes[j].x, netNodes[j].y, netNodes[j].z);
              if (pt1 && pt2) {
                this.ctx!.beginPath();
                this.ctx!.moveTo(pt1.x, pt1.y);
                this.ctx!.lineTo(pt2.x, pt2.y);
                this.ctx!.stroke();
              }
            }
          }
        }

        // Draw glowing intersection dots
        netNodes.forEach(nn => {
          const pt = project3D(nn.x, nn.y, nn.z);
          if (pt) {
            this.ctx!.beginPath();
            this.ctx!.arc(pt.x, pt.y, 4 * pt.scale, 0, Math.PI * 2);
            this.ctx!.fillStyle = `rgba(251, 191, 36, ${sWeight * 0.7})`;
            this.ctx!.fill();
            this.ctx!.beginPath();
            this.ctx!.arc(pt.x, pt.y, 8 * pt.scale, 0, Math.PI * 2);
            this.ctx!.fillStyle = `rgba(251, 191, 36, ${sWeight * 0.18})`;
            this.ctx!.fill();
          }
        });

      } else if (s === 4) {
        // --- Stage 5: Foundations (Solid geometric bottom grids) ---
        const floorY = 220;
        const gridRange = 600;
        const gridInterval = 60;

        this.ctx!.strokeStyle = `rgba(148, 163, 184, ${sWeight * 0.22})`;

        // Longitudinal lines
        for (let gx = -gridRange; gx <= gridRange; gx += gridInterval) {
          const ptNear = project3D(gx, floorY, stageZ - 200);
          const ptFar = project3D(gx, floorY, stageZ + 400);
          if (ptNear && ptFar) {
            this.ctx!.beginPath();
            this.ctx!.moveTo(ptNear.x, ptNear.y);
            this.ctx!.lineTo(ptFar.x, ptFar.y);
            this.ctx!.stroke();
          }
        }

        // Latitudinal lines
        for (let gz = stageZ - 200; gz <= stageZ + 400; gz += gridInterval) {
          const ptLeft = project3D(-gridRange, floorY, gz);
          const ptRight = project3D(gridRange, floorY, gz);
          if (ptLeft && ptRight) {
            this.ctx!.beginPath();
            this.ctx!.moveTo(ptLeft.x, ptLeft.y);
            this.ctx!.lineTo(ptRight.x, ptRight.y);
            this.ctx!.stroke();
          }
        }

        // Draw pillar cuboid outlines
        const pillars = [
          { x: -280, y: floorY, size: 50, height: 120 },
          { x: 280, y: floorY, size: 50, height: 120 }
        ];

        pillars.forEach(pil => {
          const ptBase = project3D(pil.x, pil.y, stageZ + 100);
          const ptTop = project3D(pil.x, pil.y - pil.height, stageZ + 100);

          if (ptBase && ptTop) {
            const w = pil.size * ptBase.scale;
            this.ctx!.strokeStyle = `rgba(148, 163, 184, ${sWeight * 0.4})`;
            this.ctx!.strokeRect(ptTop.x - w / 2, ptTop.y, w, ptBase.y - ptTop.y);
            this.ctx!.fillStyle = `rgba(148, 163, 184, ${sWeight * 0.05})`;
            this.ctx!.fillRect(ptTop.x - w / 2, ptTop.y, w, ptBase.y - ptTop.y);
          }
        });
      }

      this.ctx!.restore();
    }

    // 5. Update and project HTML Skill nodes
    const projectedList: ProjectedSkillNode[] = [];

    this.skillsData.forEach(sk => {
      // Determine if skills' stage index is close to active stage for rendering
      let stageOffset = sk.stageIndex - activeIdx;
      
      // Determine local progress t of the skill's stage:
      const startP = sk.stageIndex * 200;
      const endP = (sk.stageIndex + 1) * 200;
      let t = 0;

      if (localScroll >= startP && localScroll <= endP) {
        t = (localScroll - startP) / 200; // local progress from 0.0 to 1.0
      } else if (localScroll < startP) {
        t = 0; // future stage
      } else {
        t = 1.0; // past stage
      }

      // Hide nodes that are far in the future or past
      if (Math.abs(stageOffset) > 1) return;

      // Stage opacity bounds
      let opacityFactor = 0;
      if (localScroll >= startP - 40 && localScroll <= endP + 40) {
        if (localScroll < startP) {
          opacityFactor = (localScroll - (startP - 40)) / 40;
        } else if (localScroll > endP) {
          opacityFactor = ((endP + 40) - localScroll) / 40;
        } else {
          opacityFactor = 1.0;
        }
      }

      if (opacityFactor <= 0.01) return;

      // Handle Assembly / Disassembly scaling and positioning offset:
      let assembleMultiplier = 1.0;
      let radiusMultiplier = 1.0;
      let isDisassembling = false;
      let disFactor = 0;

      if (t < 0.25) {
        // Assembly phase
        assembleMultiplier = t / 0.25;
        radiusMultiplier = t / 0.25;
      } else if (t > 0.75) {
        // Disassembly phase
        assembleMultiplier = (1.0 - t) / 0.25;
        radiusMultiplier = 1.0; // Keep full radius on disassembly/exit to fade out in place
        isDisassembling = true;
        disFactor = (t - 0.75) / 0.25;
      }

      // Scale coordinates back to center (0,0) based on assembly factor
      const effectiveRadius = sk.radius * 0.70 * radiusMultiplier;
      
      // Slow rotation on the orbit ring
      const orbitSpeed = this.renderTime * 0.0015;
      const targetAngle = sk.angle + orbitSpeed;

      const sx = effectiveRadius * Math.cos(targetAngle);
      const sy = effectiveRadius * Math.sin(targetAngle);
      const sz = stagesZ[sk.stageIndex];

      const screenPt = project2D(sx, sy, sz);
      if (!screenPt) return;

      const relativeX = screenPt.x - centerX;
      const relativeY = screenPt.y - centerY;

      // Calculate HUD connection vector details
      const length = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
      const angle = Math.atan2(relativeY, relativeX);
      const vectorRotation = `rotate(${angle + Math.PI}rad)`;

      // Project sizing and depth styles
      let scale = screenPt.scale;
      if (sk.isPrimary) {
        scale *= 1.15; // Primary nodes are slightly larger
        if (sk.id === 'angular') scale *= 1.12; // Angular is the largest node
      }
      
      const transform = `translate3d(${relativeX}px, ${relativeY}px, 0px) translate(-50%, -50%) scale(${scale})`;
      
      // Calculate opacity relative to camera depth: clip if past camera
      const nodeRelativeZ = sz - cameraZ;
      let opacity = opacityFactor * assembleMultiplier;
      if (nodeRelativeZ < -50) {
        // Fade out node as it moves behind the camera plane
        opacity *= Math.max(0, 1.0 - (Math.abs(nodeRelativeZ) - 50) / 100);
      }
      opacity = Math.max(0, Math.min(1.0, opacity));

      // Closer depth -> larger depth index -> higher zIndex
      const zIndex = Math.round(500 - nodeRelativeZ);

      projectedList.push({
        id: sk.id,
        name: sk.name,
        isPrimary: sk.isPrimary,
        description: sk.description,
        transform,
        opacity,
        zIndex,
        color: sk.color,
        vectorLength: length - 22,
        vectorRotation
      });

      // 6. Draw Disassembly/Assembly particles flowing to/from the reactor core on canvas
      if (isDisassembling && disFactor > 0.05) {
        this.ctx!.save();
        this.ctx!.fillStyle = `rgba(${sk.colorRgb}, ${opacity * 0.8})`;

        const streamCount = 3;
        for (let k = 0; k < streamCount; k++) {
          // Stagger progress of stream particles
          const pK = Math.max(0, Math.min(1, (disFactor * 1.4) - k * 0.15));
          if (pK > 0.01 && pK < 0.99) {
            // Spiral inwards
            const pAngle = targetAngle + pK * Math.PI * 1.5;
            const pRadius = sk.radius * 0.70 * (1.0 - pK);
            
            const px = pRadius * Math.cos(pAngle);
            const py = pRadius * Math.sin(pAngle);
            const pz = sz;

            const pt = project2D(px, py, pz);
            if (pt) {
              this.ctx!.beginPath();
              this.ctx!.arc(pt.x, pt.y, (1.8 + (1 - pK) * 1.5) * pt.scale, 0, Math.PI * 2);
              this.ctx!.fill();
            }
          }
        }
        this.ctx!.restore();
      } else if (t < 0.25 && t > 0.02) {
        // Assembly particle streams
        this.ctx!.save();
        this.ctx!.fillStyle = `rgba(${sk.colorRgb}, ${opacity * 0.8})`;

        const streamCount = 3;
        for (let k = 0; k < streamCount; k++) {
          const pK = Math.max(0, Math.min(1, (t / 0.25 * 1.4) - k * 0.15));
          if (pK > 0.01 && pK < 0.99) {
            // Spiral outwards from core
            const pAngle = sk.angle + (1.0 - pK) * Math.PI * 1.5;
            const pRadius = sk.radius * 0.70 * pK;
            
            const px = pRadius * Math.cos(pAngle);
            const py = pRadius * Math.sin(pAngle);
            const pz = sz;

            const pt = project2D(px, py, pz);
            if (pt) {
              this.ctx!.beginPath();
              this.ctx!.arc(pt.x, pt.y, (1.8 + pK * 1.5) * pt.scale, 0, Math.PI * 2);
              this.ctx!.fill();
            }
          }
        }
        this.ctx!.restore();
      }
    });

    // Update the signal for template rendering
    this.projectedSkills.set(projectedList);
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.ctx || !this.el) return;
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
    this.targetMouseX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    this.targetMouseY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  };

  ngOnDestroy(): void {
    this.sceneEngine.unregisterLifecycle('skills');

    if (this.animationService.getIsBrowser()) {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('resize', this.onResize);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
