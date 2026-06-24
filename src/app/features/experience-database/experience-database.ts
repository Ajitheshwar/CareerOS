import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneEngineService } from '../../core/services/scene-engine.service';
import { JarvisService } from '../../core/services/jarvis.service';
import { AnimationService } from '../../core/services/animation.service';
import { SceneLifecycle } from '../../core/types/scene.types';

interface Milestone {
  id: number;
  year: string;
  title: string;
  designation?: string;
  company?: string;
  project?: string;
  story: string;
  tech: string[];
  contributions: string[];
  challenges: string[];
  impact: string[];
  learnings: string[];
  side: 'left' | 'right';
  x: number;
  y: number;
  z: number;
  color: string;
  colorRgb: string;
}


interface CameraKeyframe {
  p: number;         // global scroll progress (0.0 to 1.0)
  z: number;         // camera Z coordinate
  x: number;         // camera X coordinate (drift)
  y: number;         // camera Y coordinate
  activeIdx: number; // which milestone is in focus (-1 if none)
  focusWeight: number; // weight of active focus (0.0 to 1.0)
}

interface AmbientStar {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
}

interface WindingParticle {
  startIdx: number;
  endIdx: number;
  t: number;          // progression 0.0 to 1.0
  speed: number;
  color: string;
  size: number;
  angleOffset: number;
}

@Component({
  selector: 'app-experience-database',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience-database.html',
  styleUrl: './experience-database.scss'
})
export class ExperienceDatabase implements OnInit, AfterViewInit, OnDestroy, SceneLifecycle {
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly jarvisService = inject(JarvisService);
  private readonly animationService = inject(AnimationService);
  private readonly el = inject(ElementRef);

  // Active state and scroll progress normalized within Scene 4 limits (0.0 to 1.0)
  public readonly active = input<boolean>(false);
  public readonly progress = input<number>(0);

  // Determine whether this component should remain in DOM
  public readonly shouldRender = computed(() => {
    return this.active() || (this.progress() > 0 && this.progress() < 1.0);
  });

  // Focus window intervals for the 8 milestones
  public readonly focusWindows = [
    { pStart: 0.05, pEnd: 0.13 }, // Milestone 1
    { pStart: 0.18, pEnd: 0.26 }, // Milestone 2
    { pStart: 0.31, pEnd: 0.39 }, // Milestone 3
    { pStart: 0.44, pEnd: 0.56 }, // Milestone 4 (Hero)
    { pStart: 0.61, pEnd: 0.69 }, // Milestone 5
    { pStart: 0.74, pEnd: 0.82 }, // Milestone 6
    { pStart: 0.86, pEnd: 0.90 }, // Milestone 7
    { pStart: 0.93, pEnd: 0.97 }  // Milestone 8 (Hero AI / CareerOps)
  ];

  // Computes active milestone info, local progress, active phase, and transition metrics
  public readonly activeMilestoneInfo = computed(() => {
    const p = this.progress();
    const windows = this.focusWindows;
    
    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      if (p >= w.pStart && p <= w.pEnd) {
        const milestone = this.milestonesList[i];
        const t_milestone = (p - w.pStart) / (w.pEnd - w.pStart);
        
        let phase = 1;
        if (t_milestone >= 0.78) {
          phase = 4;
        } else if (t_milestone >= 0.52) {
          phase = 3;
        } else if (t_milestone >= 0.26) {
          phase = 2;
        }

        // Keep binary indicators for template compatibility or transitions
        const t1 = phase >= 1 ? 1 : 0;
        const t2 = phase >= 2 ? 1 : 0;
        const t3 = phase >= 3 ? 1 : 0;
        const t4 = phase >= 4 ? 1 : 0;

        return {
          index: i,
          id: milestone.id,
          milestone,
          t: t_milestone,
          phase,
          t1,
          t2,
          t3,
          t4,
          isEven: i % 2 === 1
        };
      }
    }
    return null;
  });

  // UI state computed signal to keep the milestone details visible and animated during transitions between corridors
  public readonly milestoneUIState = computed(() => {
    const p = this.progress();
    const windows = this.focusWindows;
    const count = windows.length;
    
    // Find closest milestone index
    let closestIdx = 0;
    for (let i = 0; i < count - 1; i++) {
      const midpoint = (windows[i].pEnd + windows[i + 1].pStart) / 2;
      if (p >= midpoint) {
        closestIdx = i + 1;
      }
    }
    
    const milestone = this.milestonesList[closestIdx];
    const w = windows[closestIdx];
    
    let opacity = 1.0;
    let scale = 1.0;
    let translateY = 0;
    let phase = 1;
    let isTransition = false;
    
    if (p < w.pStart) {
      isTransition = true;
      let pMin = 0.0;
      if (closestIdx > 0) {
        pMin = (windows[closestIdx - 1].pEnd + w.pStart) / 2;
      }
      const range = w.pStart - pMin;
      const t = range > 0 ? (p - pMin) / range : 1.0;
      const clampedT = Math.min(1.0, Math.max(0.0, t));
      
      opacity = clampedT;
      scale = 0.85 + 0.15 * clampedT;
      translateY = 40 * (1.0 - clampedT);
      phase = 1;
    } else if (p > w.pEnd) {
      isTransition = true;
      let pMax = 1.0;
      if (closestIdx < count - 1) {
        pMax = (w.pEnd + windows[closestIdx + 1].pStart) / 2;
      }
      const range = pMax - w.pEnd;
      const t = range > 0 ? (p - w.pEnd) / range : 1.0;
      const clampedT = Math.min(1.0, Math.max(0.0, t));
      
      opacity = 1.0 - clampedT;
      scale = 1.0 - 0.15 * clampedT;
      translateY = -40 * clampedT;
      phase = 4;
    } else {
      const t_milestone = (p - w.pStart) / (w.pEnd - w.pStart);
      if (t_milestone >= 0.78) {
        phase = 4;
      } else if (t_milestone >= 0.52) {
        phase = 3;
      } else if (t_milestone >= 0.26) {
        phase = 2;
      }
    }
    
    const t1 = phase >= 1 ? 1 : 0;
    const t2 = phase >= 2 ? 1 : 0;
    const t3 = phase >= 3 ? 1 : 0;
    const t4 = phase >= 4 ? 1 : 0;
    
    return {
      index: closestIdx,
      id: milestone.id,
      milestone,
      phase,
      opacity,
      scale,
      translateY,
      isTransition,
      t1,
      t2,
      t3,
      t4,
      isEven: closestIdx % 2 === 1
    };
  });

  // Scroll Indicator Signals
  public readonly showScrollIndicator = signal<Record<string, boolean>>({});

  // Track the active milestone index based on progress interpolation
  public readonly activeMilestoneIndex = computed(() => {
    const info = this.activeMilestoneInfo();
    return info ? info.index : -1;
  });

  public readonly activeMilestoneTitle = computed(() => {
    const info = this.activeMilestoneInfo();
    if (info) {
      return info.milestone.title;
    }
    const p = this.progress();
    const windows = this.focusWindows;
    for (let i = 0; i < windows.length; i++) {
      if (p < windows[i].pStart) {
        return this.milestonesList[i].title;
      }
    }
    return 'Transitioning: AI Core';
  });

  // Camera coordinates computed signals
  public readonly cameraZ = computed(() => this.cameraState().z);
  public readonly cameraX = computed(() => this.cameraState().x);
  public readonly focusWeight = computed(() => this.cameraState().focusWeight);

  // 3D camera projection config
  private readonly focalLength = 350;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  // Canvas context and rendering fields
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private isSceneActive = false;
  private renderTime = 0;
  private camZoomOffset = 0;

  // Background environment visual items
  private ambientStars: AmbientStar[] = [];
  private windingParticles: WindingParticle[] = [];
  private prevActiveIdx = -1;
  private lastPhase = 0;
  private lastMilestoneId = -1;
  private scrollTimeoutId: any = null;

  // Expanded Milestone Database
  public readonly milestonesList: Milestone[] = [
    {
      id: 1,
      year: '2022',
      title: 'Engineering Foundation',
      designation: 'MEAN Stack Learner',
      story: 'Started learning full-stack web development and software engineering fundamentals. Built multiple projects while learning frontend development, backend systems, databases, APIs, and software architecture concepts. This phase laid the foundation for the engineering journey.',
      tech: ['Angular', 'TypeScript', 'JavaScript', 'Node.js', 'Express', 'MongoDB', 'HTML5', 'CSS3', 'Git', 'REST APIs'],
      contributions: [
        'Learned Angular framework fundamentals.',
        'Built frontend applications using TypeScript.',
        'Developed backend APIs using Node.js.',
        'Worked with MongoDB databases.',
        'Learned Express.js application development.',
        'Practiced REST API integration.',
        'Built multiple end-to-end learning projects.',
        'Learned software development lifecycle concepts.',
        'Explored Git and collaborative workflows.'
      ],
      challenges: [
        'Understanding frontend architecture.',
        'Learning backend development concepts.',
        'Building complete applications independently.',
        'Learning database design.',
        'Connecting frontend and backend systems.'
      ],
      impact: [
        'Established strong engineering fundamentals.',
        'Built confidence in full-stack development.',
        'Learned software architecture concepts.',
        'Prepared for professional software development.'
      ],
      learnings: [
        'Full-stack thinking.',
        'Problem solving.',
        'Application architecture.',
        'Software engineering fundamentals.'
      ],
      side: 'left',
      x: -240,
      y: -80,
      z: 400,
      color: '#06b6d4',
      colorRgb: '6, 182, 212'
    },
    {
      id: 2,
      year: 'Jan 2023 – May 2023',
      title: 'Software Development Intern',
      project: 'Vegetable Vendor Application',
      designation: 'Software Development Intern',
      story: 'Worked on the Vegetable Vendor Application using the MEAN stack and gained first-hand experience building business applications in a professional environment. Contributed to dashboards, workflows, and analytics systems while learning production-grade development practices.',
      tech: ['Angular', 'Node.js', 'Express', 'MongoDB', 'Highcharts', 'TypeScript', 'REST APIs', 'WebSockets'],
      contributions: [
        'Developed frontend modules using Angular.',
        'Implemented dashboard functionality.',
        'Worked on analytics visualizations.',
        'Built reusable UI components.',
        'Integrated APIs with frontend systems.',
        'Participated in feature development.',
        'Improved application workflows.',
        'Collaborated with mentors and team members.',
        'Contributed to business-focused product development.'
      ],
      challenges: [
        'First production-level development experience.',
        'Understanding business requirements.',
        'Building maintainable frontend code.',
        'Learning collaborative development practices.',
        'Working within deadlines.'
      ],
      impact: [
        'Delivered production features.',
        'Improved dashboard experiences.',
        'Built real-world development experience.',
        'Learned enterprise development workflows.'
      ],
      learnings: [
        'Professional software development.',
        'Product thinking.',
        'Team collaboration.',
        'Business workflow understanding.'
      ],
      side: 'right',
      x: 240,
      y: -80,
      z: 1000,
      color: '#10b981',
      colorRgb: '16, 185, 129'
    },
    {
      id: 3,
      year: 'May 2023',
      title: 'Software Engineer',
      company: 'Darwinbox',
      designation: 'Software Engineer',
      story: 'Joined Darwinbox as a full-time Software Engineer and started contributing to multiple enterprise-grade HR technology products used by large organizations. Worked across different modules and gained exposure to large-scale software systems.',
      tech: ['Angular', 'TypeScript', 'RxJS', 'NGXS', 'REST APIs', 'SCSS', 'Git'],
      contributions: [
        'Developed enterprise Angular applications.',
        'Worked across multiple product modules.',
        'Delivered customer-facing features.',
        'Integrated backend services.',
        'Collaborated with product managers.',
        'Participated in architecture discussions.',
        'Improved frontend maintainability.',
        'Worked with production-scale applications.',
        'Contributed to enterprise workflows.'
      ],
      challenges: [
        'Understanding enterprise business logic.',
        'Working with large codebases.',
        'Managing production-scale features.',
        'Learning cross-functional collaboration.',
        'Adapting to enterprise architecture.'
      ],
      impact: [
        'Delivered multiple features.',
        'Supported enterprise customers.',
        'Improved application functionality.',
        'Expanded product knowledge.'
      ],
      learnings: [
        'Enterprise software engineering.',
        'Collaboration at scale.',
        'Production ownership.',
        'Product architecture.'
      ],
      side: 'left',
      x: -240,
      y: -80,
      z: 1600,
      color: '#3b82f6',
      colorRgb: '59, 130, 246'
    },
    {
      id: 4,
      year: 'Dec 2023 – Jun 2024',
      title: 'Time Management Revamp',
      designation: 'Frontend Engineer',
      project: 'Time Management Revamp',
      story: 'Owned and delivered the frontend revamp of Darwinbox\'s largest and most business-critical Time Management module. The revamp modernized a legacy system into a scalable Angular-based architecture while supporting attendance, leave, shift, overtime, dashboard, and timesheet workflows used daily across enterprise customers.',
      tech: ['Angular', 'TypeScript', 'RxJS', 'NGXS', 'REST APIs', 'SCSS', 'Highcharts', 'Git', 'Performance Optimization', 'State Management'],
      contributions: [
        'Sole frontend engineer for the revamp.',
        'Built 100+ reusable components.',
        'Designed scalable Angular architecture.',
        'Created reusable state management patterns.',
        'Established standards adopted by future revamps.',
        'Collaborated with 13+ backend engineers, QA, PMs and UX.',
        'Implemented attendance workflows.',
        'Implemented leave management workflows.',
        'Implemented shift management workflows.',
        'Implemented timesheet systems.',
        'Built dashboard experiences.',
        'Led frontend ownership from design to production.'
      ],
      challenges: [
        'Migrating a legacy system.',
        'Large-scale frontend architecture.',
        'Complex enterprise workflows.',
        'High performance requirements.',
        'Thousands of rendered components.',
        'Cross-team coordination.',
        'Scalability concerns.'
      ],
      impact: [
        '100+ components delivered.',
        '5s → <1s performance improvement.',
        'Foundation for future module revamps.',
        'Improved maintainability.',
        'Increased developer productivity.',
        'Reusable architecture adoption.',
        'Enterprise-scale reliability.',
        'Better user experience.',
        'Faster feature development.'
      ],
      learnings: [
        'Technical ownership.',
        'Architecture design.',
        'Enterprise systems.',
        'Performance engineering.',
        'Leadership through execution.'
      ],
      side: 'right',
      x: 300,
      y: -85,
      z: 2400,
      color: '#ef4444',
      colorRgb: '239, 68, 68'
    },
    {
      id: 5,
      year: '2024',
      title: 'Best Employee Award',
      story: 'Recognized for exceptional contribution, ownership, and execution during the Time Management Revamp. Celebrated inside Darwinbox engineering for architectural execution and product impact.',
      tech: [],
      contributions: [
        'Delivered critical revamp milestones.',
        'Maintained high quality standards.',
        'Solved complex technical challenges.',
        'Demonstrated ownership.',
        'Collaborated effectively across teams.',
        'Contributed beyond assigned responsibilities.',
        'Supported successful project delivery.'
      ],
      challenges: [],
      impact: [
        'Best Employee Award.',
        'Organizational recognition.',
        'Engineering excellence.',
        'Strong team contribution.'
      ],
      learnings: [],
      side: 'left',
      x: -240,
      y: -80,
      z: 3200,
      color: '#fbbf24',
      colorRgb: '251, 191, 36'
    },
    {
      id: 6,
      year: 'April 2025',
      title: 'Promotion to SDE-II',
      story: 'Promoted to Software Development Engineer II based on technical contributions, ownership, consistency, and impact across modular frontend projects.',
      tech: [],
      contributions: [
        'Consistent delivery.',
        'Technical ownership.',
        'Cross-team collaboration.',
        'Feature leadership.',
        'Architecture contributions.',
        'Product impact.',
        'Engineering excellence.'
      ],
      challenges: [],
      impact: [
        'SDE-II Promotion.',
        'Increased responsibilities.',
        'Greater technical ownership.',
        'Leadership opportunities.'
      ],
      learnings: [],
      side: 'right',
      x: 240,
      y: -80,
      z: 3800,
      color: '#a855f7',
      colorRgb: '168, 85, 247'
    },
    {
      id: 7,
      year: '2025',
      title: 'Scheduling Point',
      designation: 'SDE-II',
      project: 'Scheduling Point',
      story: 'Led frontend development for Scheduling Point and contributed to workforce scheduling, planning systems, and enterprise scheduling workflows.',
      tech: ['Angular', 'TypeScript', 'RxJS', 'NGXS', 'REST APIs', 'System Design'],
      contributions: [
        'Led frontend implementation.',
        'Built scheduling workflows.',
        'Implemented planning systems.',
        'Developed reusable interfaces.',
        'Collaborated with stakeholders.',
        'Improved workflow efficiency.',
        'Delivered enterprise functionality.'
      ],
      challenges: [],
      impact: [
        'Enterprise scheduling platform.',
        'Workforce planning support.',
        'Improved operational workflows.',
        'Scalable scheduling systems.'
      ],
      learnings: [],
      side: 'left',
      x: -240,
      y: -80,
      z: 4400,
      color: '#06b6d4',
      colorRgb: '6, 182, 212'
    },
    {
      id: 8,
      year: '2026',
      title: 'CareerOps',
      designation: 'Creator & Engineer',
      project: 'CareerOps',
      story: 'Built CareerOps, an AI-powered Career Operating System that helps job seekers through resume optimization, job discovery, interview preparation, career guidance, and application tracking. Designed and implemented a multi-agent architecture powered by AI workflows and orchestration systems.',
      tech: ['Angular', 'Node.js', 'MongoDB Atlas', 'LangGraph', 'AI Agents', 'Prompt Engineering', 'Agentic Workflows', 'LLM Integration', 'AI Assisted Development'],
      contributions: [
        'Built CareerOps from scratch.',
        'Designed AI-powered workflows.',
        'Developed multi-agent architecture.',
        'Built resume intelligence systems.',
        'Built job matching systems.',
        'Developed interview preparation workflows.',
        'Implemented career guidance systems.',
        'Built application tracking functionality.',
        'Designed LangGraph orchestration.',
        'Integrated multiple job sources.',
        'Created AI-powered user experiences.'
      ],
      challenges: [],
      impact: [
        '10+ AI Agents.',
        'AI Career Operating System.',
        'Resume Intelligence.',
        'Job Matching.',
        'Interview Preparation.',
        'Career Guidance.',
        'Application Tracking.',
        'Built in 7 Days.',
        'End-to-end AI platform.'
      ],
      learnings: [
        'AI Product Development.',
        'Agentic Systems.',
        'Workflow Orchestration.',
        'Rapid Product Development.',
        'AI Engineering.'
      ],
      side: 'right',
      x: 300,
      y: -85,
      z: 5200,
      color: '#14b8a6',
      colorRgb: '20, 184, 166'
    }
  ];

  // Camera flight keyframes tracking camera depth, panning offsets, and active focus points (spaced out on 5000px timeline)
  private readonly cameraKeyframes: CameraKeyframe[] = [
    { p: 0.00, z: 0, x: 0, y: 0, activeIdx: -1, focusWeight: 0 },
    { p: 0.04, z: 320, x: 0, y: 0, activeIdx: 0, focusWeight: 0 },
    { p: 0.07, z: 400, x: -180, y: -15, activeIdx: 0, focusWeight: 1 },
    { p: 0.10, z: 400, x: -180, y: -15, activeIdx: 0, focusWeight: 1 },
    { p: 0.14, z: 480, x: 0, y: 0, activeIdx: 0, focusWeight: 0 },
    
    { p: 0.17, z: 920, x: 0, y: 0, activeIdx: 1, focusWeight: 0 },
    { p: 0.20, z: 1000, x: 180, y: -15, activeIdx: 1, focusWeight: 1 },
    { p: 0.23, z: 1000, x: 180, y: -15, activeIdx: 1, focusWeight: 1 },
    { p: 0.27, z: 1080, x: 0, y: 0, activeIdx: 1, focusWeight: 0 },
    
    { p: 0.30, z: 1520, x: 0, y: 0, activeIdx: 2, focusWeight: 0 },
    { p: 0.33, z: 1600, x: -180, y: -15, activeIdx: 2, focusWeight: 1 },
    { p: 0.36, z: 1600, x: -180, y: -15, activeIdx: 2, focusWeight: 1 },
    { p: 0.40, z: 1680, x: 0, y: 0, activeIdx: 2, focusWeight: 0 },
    
    // Milestone 4: Time Revamp (Hero - longer pause/focus space)
    { p: 0.43, z: 2300, x: 0, y: 0, activeIdx: 3, focusWeight: 0 },
    { p: 0.47, z: 2400, x: 210, y: -15, activeIdx: 3, focusWeight: 1 },
    { p: 0.53, z: 2400, x: 210, y: -15, activeIdx: 3, focusWeight: 1 },
    { p: 0.57, z: 2500, x: 0, y: 0, activeIdx: 3, focusWeight: 0 },
    
    { p: 0.60, z: 3120, x: 0, y: 0, activeIdx: 4, focusWeight: 0 },
    { p: 0.63, z: 3200, x: -180, y: -15, activeIdx: 4, focusWeight: 1 },
    { p: 0.66, z: 3200, x: -180, y: -15, activeIdx: 4, focusWeight: 1 },
    { p: 0.70, z: 3280, x: 0, y: 0, activeIdx: 4, focusWeight: 0 },
    
    { p: 0.71, z: 3720, x: 0, y: 0, activeIdx: 5, focusWeight: 0 },
    { p: 0.74, z: 3800, x: 180, y: -15, activeIdx: 5, focusWeight: 1 },
    { p: 0.77, z: 3800, x: 180, y: -15, activeIdx: 5, focusWeight: 1 },
    { p: 0.80, z: 3880, x: 0, y: 0, activeIdx: 5, focusWeight: 0 },
    
    { p: 0.83, z: 4320, x: 0, y: 0, activeIdx: 6, focusWeight: 0 },
    { p: 0.86, z: 4400, x: -180, y: -15, activeIdx: 6, focusWeight: 1 },
    { p: 0.89, z: 4400, x: -180, y: -15, activeIdx: 6, focusWeight: 1 },
    { p: 0.91, z: 4480, x: 0, y: 0, activeIdx: 6, focusWeight: 0 },
    
    // Milestone 8: CareerOps AI (Hero - final culmination before exit blur)
    { p: 0.92, z: 5100, x: 0, y: 0, activeIdx: 7, focusWeight: 0 },
    { p: 0.93, z: 5200, x: 210, y: -15, activeIdx: 7, focusWeight: 1 },
    { p: 0.95, z: 5200, x: 210, y: -15, activeIdx: 7, focusWeight: 1 },
    { p: 0.97, z: 5350, x: 0, y: 0, activeIdx: 7, focusWeight: 0 },
    { p: 1.00, z: 5800, x: 0, y: 0, activeIdx: -1, focusWeight: 0 }
  ];

  // Interpolated Camera State computed from progress
  private readonly cameraState = computed(() => {
    const p = this.progress();
    const keyframes = this.cameraKeyframes;
    
    if (p <= keyframes[0].p) {
      return { ...keyframes[0] };
    }
    if (p >= keyframes[keyframes.length - 1].p) {
      return { ...keyframes[keyframes.length - 1] };
    }

    for (let i = 0; i < keyframes.length - 1; i++) {
      const k1 = keyframes[i];
      const k2 = keyframes[i + 1];
      if (p >= k1.p && p <= k2.p) {
        const t = (p - k1.p) / (k2.p - k1.p);
        const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        return {
          p,
          z: k1.z + (k2.z - k1.z) * easedT,
          x: k1.x + (k2.x - k1.x) * easedT,
          y: k1.y + (k2.y - k1.y) * easedT,
          activeIdx: t < 0.5 ? k1.activeIdx : k2.activeIdx,
          focusWeight: k1.focusWeight + (k2.focusWeight - k1.focusWeight) * easedT
        };
      }
    }
    return { p, z: 0, x: 0, y: 0, activeIdx: -1, focusWeight: 0 };
  });

  // Eased scene backdrop fade-in / fade-out styles
  public readonly containerStyle = computed(() => {
    const prog = this.progress();
    let opacity = 1;
    let filter = 'none';

    // Fade in from Scene 3
    if (prog < 0.05) {
      opacity = prog / 0.05;
    } 
    // Fade out towards Scene 5 (triggers after all stages of CareerOps are fully completed at 0.97 progress)
    else if (prog > 0.97) {
      const range = 1.0 - 0.97;
      opacity = (1.0 - prog) / range;
      filter = `blur(${(prog - 0.97) / range * 6}px)`;
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

    // Handle dissolve triggers
    effect(() => {
      const activeIdx = this.activeMilestoneIndex();
      if (activeIdx !== this.prevActiveIdx && activeIdx >= 0) {
        this.triggerDissolveBurst(this.prevActiveIdx, activeIdx);
        this.prevActiveIdx = activeIdx;
      }
    });

    // Handle scroll overflow checks and auto scroll-into-view when milestone/phase updates
    effect(() => {
      const info = this.activeMilestoneInfo();
      if (info) {
        this.checkAllOverflows();

        const currentPhase = info.phase;
        const currentMilestoneId = info.id;
        
        if (currentMilestoneId !== this.lastMilestoneId) {
          // Reset scroll to top when switching milestones
          this.lastMilestoneId = currentMilestoneId;
          this.lastPhase = currentPhase;
          if (this.scrollTimeoutId) {
            clearTimeout(this.scrollTimeoutId);
          }
          this.scrollTimeoutId = setTimeout(() => {
            const container = this.el.nativeElement.querySelector('.info-zone-inner');
            if (container) {
              container.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }, 100);
        } else if (currentPhase > this.lastPhase) {
          // A new stage has been unlocked within the same milestone, scroll it into view!
          this.lastPhase = currentPhase;
          
          if (this.scrollTimeoutId) {
            clearTimeout(this.scrollTimeoutId);
          }
          this.scrollTimeoutId = setTimeout(() => {
            let targetSelector = '';
            if (currentPhase === 3) {
              targetSelector = '.phase-3-tech-challenges';
            } else if (currentPhase === 4) {
              targetSelector = '.phase-4-impact-learnings';
            } else if (currentPhase === 2) {
              const container = this.el.nativeElement.querySelector('.info-zone-inner');
              if (container) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }

            if (targetSelector) {
              const container = this.el.nativeElement.querySelector('.info-zone-inner');
              const el = this.el.nativeElement.querySelector(targetSelector);
              if (container && el) {
                const header = container.querySelector('.phase-status-indicator');
                const headerHeight = header ? (header as HTMLElement).offsetHeight : 70;
                // Since container has position: relative, el.offsetTop is relative to container
                const scrollOffset = el.offsetTop - headerHeight;
                container.scrollTo({ top: Math.max(0, scrollOffset), behavior: 'smooth' });
              }
            }
          }, 1000); // Shorter timeout for immediate responsive scrolling as DOM settles
        } else if (currentPhase < this.lastPhase) {
          // User scrolled backward
          this.lastPhase = currentPhase;
          if (this.scrollTimeoutId) {
            clearTimeout(this.scrollTimeoutId);
          }
        }
      } else {
        this.lastMilestoneId = -1;
        this.lastPhase = 0;
        if (this.scrollTimeoutId) {
          clearTimeout(this.scrollTimeoutId);
        }
      }
    });
  }

  ngOnInit(): void {
    this.sceneEngine.registerLifecycle('experience', this);

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
    console.log('[Scene: Experience Timeline] Entered');
    this.isSceneActive = true;
    this.jarvisService.showMessage('Accessing Engineering Memory Archives', 4000);

    if (this.animationService.getIsBrowser() && !this.animationFrameId) {
      this.startAnimationLoop();
    }
  }

  onLeave(): void {
    console.log('[Scene: Experience Timeline] Leaved');
    this.isSceneActive = false;
  }

  onProgress(progress: number): void {
    // Computed signals handle reactively
  }

  private initCanvasAndAmbient(): void {
    this.canvas = this.el.nativeElement.querySelector('.experience-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Populate ambient star field in corridor depth
    this.ambientStars = [];
    for (let i = 0; i < 120; i++) {
      this.ambientStars.push({
        x: (Math.random() - 0.5) * 1600,
        y: (Math.random() - 0.5) * 1000,
        z: Math.random() * 6000,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }

  private triggerDissolveBurst(oldIdx: number, newIdx: number): void {
    if (oldIdx < 0 || oldIdx >= this.milestonesList.length) return;
    const startPoint = this.milestonesList[oldIdx];
    
    // Spawn energy particles spiraling from old milestone coordinate to new one
    const pCount = 35;
    for (let i = 0; i < pCount; i++) {
      this.windingParticles.push({
        startIdx: oldIdx,
        endIdx: newIdx,
        t: 0,
        speed: 0.015 + Math.random() * 0.012,
        color: startPoint.color,
        size: Math.random() * 2.0 + 1.2,
        angleOffset: Math.random() * Math.PI * 2
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

    // Apply mouse parallax easing
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.08;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.08;

    // Apply camera zoom offset interpolation based on phase active status
    const info = this.activeMilestoneInfo();
    const targetZoom = (info && info.phase > 0) ? 60 : 0;
    this.camZoomOffset += (targetZoom - this.camZoomOffset) * 0.08;

    const camZ = this.cameraZ() + this.camZoomOffset;
    const camX = this.cameraX();
    const activeIdx = this.activeMilestoneIndex();
    const fWeight = this.focusWeight();

    // 3D projection formulas relative to camera coordinates
    const project3D = (x: number, y: number, z: number) => {
      const relX = x - camX;
      const relY = y;
      const relZ = z - camZ;

      const denom = this.focalLength + relZ;
      if (denom <= 5) return null;

      const scale = this.focalLength / denom;
      
      // Parallax shifts on mouse movement
      const px = relX + this.mouseX * 30;
      const py = relY + this.mouseY * 30;

      return {
        x: centerX + px * scale,
        y: centerY + py * scale,
        scale,
        depth: relZ
      };
    };

    // 1. Draw Ambient Corridor Star Field
    this.ctx.save();
    this.ambientStars.forEach(s => {
      const screenPt = project3D(s.x, s.y, s.z);
      if (!screenPt) return;

      // Wrap stars around Z depth when passed
      if (s.z < camZ - 200) {
        s.z += 6000;
      }

      const size = s.size * screenPt.scale;
      const opacity = s.opacity * Math.min(1, Math.max(0, 1.0 - (s.z - camZ) / 5000));

      this.ctx!.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      this.ctx!.beginPath();
      this.ctx!.arc(screenPt.x, screenPt.y, size, 0, Math.PI * 2);
      this.ctx!.fill();
    });
    this.ctx.restore();

    // 2. Draw Corridor wire frames (Perspective receding rings)
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.035)';
    this.ctx.lineWidth = 0.8;
    
    const ringInterval = 300;
    const ringCount = 12;
    const startRingZ = Math.floor(camZ / ringInterval) * ringInterval - 300;

    for (let r = 0; r < ringCount; r++) {
      const rZ = startRingZ + r * ringInterval;
      
      // Project corridor rectangle vertices
      const w = 550;
      const h = 320;
      const tl = project3D(-w, -h, rZ);
      const tr = project3D(w, -h, rZ);
      const bl = project3D(-w, h, rZ);
      const br = project3D(w, h, rZ);

      if (tl && tr && bl && br) {
        this.ctx.beginPath();
        this.ctx.moveTo(tl.x, tl.y);
        this.ctx.lineTo(tr.x, tr.y);
        this.ctx.lineTo(br.x, br.y);
        this.ctx.lineTo(bl.x, bl.y);
        this.ctx.closePath();
        
        // Faint glow on grid ring
        const fade = Math.max(0, Math.min(1.0, 1.0 - (rZ - camZ) / 2500));
        this.ctx.strokeStyle = `rgba(6, 182, 212, ${fade * 0.05})`;
        this.ctx.stroke();
      }
    }
    
    // Draw longitudinal wire lines
    const corners = [
      { x: -550, y: -320 },
      { x: 550, y: -320 },
      { x: -550, y: 320 },
      { x: 550, y: 320 }
    ];
    corners.forEach(c => {
      const ptStart = project3D(c.x, c.y, camZ - 200);
      const ptEnd = project3D(c.x, c.y, camZ + 3000);
      if (ptStart && ptEnd) {
        this.ctx!.beginPath();
        this.ctx!.moveTo(ptStart.x, ptStart.y);
        this.ctx!.lineTo(ptEnd.x, ptEnd.y);
        this.ctx!.strokeStyle = 'rgba(6, 182, 212, 0.02)';
        this.ctx!.stroke();
      }
    });
    this.ctx.restore();

    // 3. Draw winding Neon energy path linking milestones
    this.ctx.save();
    this.ctx.lineWidth = 1.6;
    
    // Form winding path coordinates
    const windingCoords: { x: number; y: number; z: number; color: string }[] = [
      { x: 0, y: 0, z: 0, color: '#06b6d4' }
    ];
    this.milestonesList.forEach(m => {
      windingCoords.push({ x: m.x * 0.4, y: m.y + 120, z: m.z, color: m.color });
    });
    windingCoords.push({ x: 0, y: 120, z: 5800, color: '#14b8a6' });

    // Draw lines connecting segments in 3D
    for (let k = 0; k < windingCoords.length - 1; k++) {
      const pt1 = project3D(windingCoords[k].x, windingCoords[k].y, windingCoords[k].z);
      const pt2 = project3D(windingCoords[k + 1].x, windingCoords[k + 1].y, windingCoords[k + 1].z);

      if (pt1 && pt2) {
        const grad = this.ctx.createLinearGradient(pt1.x, pt1.y, pt2.x, pt2.y);
        grad.addColorStop(0, windingCoords[k].color + '44');
        grad.addColorStop(1, windingCoords[k + 1].color + '44');

        this.ctx.strokeStyle = grad;
        this.ctx.beginPath();
        this.ctx.moveTo(pt1.x, pt1.y);
        this.ctx.lineTo(pt2.x, pt2.y);
        this.ctx.stroke();
      }
    }
    this.ctx.restore();

    // 4. Draw unique milestone visuals on canvas
    this.milestonesList.forEach((m, idx) => {
      this.drawMilestoneGraphics(m, idx, activeIdx, fWeight, project3D);
    });

    // 5. Draw Winding transition energy particles
    this.ctx.save();
    this.windingParticles.forEach((p, pIdx) => {
      p.t += p.speed;
      if (p.t >= 1.0) {
        this.windingParticles.splice(pIdx, 1);
        return;
      }

      const mStart = this.milestonesList[p.startIdx];
      const mEnd = this.milestonesList[p.endIdx];

      // Spiral interpolation path formula
      const interpZ = mStart.z + (mEnd.z - mStart.z) * p.t;
      const spiralRadius = 50 * (1.0 - Math.sin(p.t * Math.PI)); // pinch in the middle
      const angle = p.angleOffset + p.t * Math.PI * 5;
      
      const interpX = mStart.x + (mEnd.x - mStart.x) * p.t + Math.cos(angle) * spiralRadius;
      const interpY = mStart.y + (mEnd.y - mStart.y) * p.t + Math.sin(angle) * spiralRadius;

      const screenPt = project3D(interpX, interpY, interpZ);
      if (!screenPt) return;

      const size = p.size * screenPt.scale;
      this.ctx!.fillStyle = p.color;
      this.ctx!.beginPath();
      this.ctx!.arc(screenPt.x, screenPt.y, size, 0, Math.PI * 2);
      this.ctx!.fill();
    });
    this.ctx.restore();
  }

  /**
   * Renders the custom visual graphics in 3D around the milestones on the canvas
   */
  private drawMilestoneGraphics(
    m: Milestone, 
    idx: number, 
    activeIdx: number, 
    fWeight: number, 
    project3D: (x: number, y: number, z: number) => { x: number; y: number; scale: number } | null
  ): void {
    const isFocused = idx === activeIdx;
    const focusAlpha = isFocused ? fWeight : 0.15;
    if (focusAlpha <= 0.01) return;

    this.ctx!.save();
    this.ctx!.lineWidth = 1.0;

    switch (m.id) {
      case 1: {
        // --- Milestone 1: Blueprint knowledge assembly ---
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const r = 40 * ptCenter.scale;
          this.ctx!.strokeStyle = `rgba(6, 182, 212, ${focusAlpha * 0.3})`;
          this.ctx!.beginPath();
          this.ctx!.arc(ptCenter.x, ptCenter.y, r, 0, Math.PI * 2);
          this.ctx!.stroke();

          // Draw blueprint crosshairs
          this.ctx!.strokeStyle = `rgba(6, 182, 212, ${focusAlpha * 0.15})`;
          this.ctx!.beginPath();
          this.ctx!.moveTo(ptCenter.x - r * 1.5, ptCenter.y);
          this.ctx!.lineTo(ptCenter.x + r * 1.5, ptCenter.y);
          this.ctx!.moveTo(ptCenter.x, ptCenter.y - r * 1.5);
          this.ctx!.lineTo(ptCenter.x, ptCenter.y + r * 1.5);
          this.ctx!.stroke();
        }
        break;
      }
      case 2: {
        // --- Milestone 2: Vendor network ecosystem ---
        // Draw interconnected inventory circles
        const nodes = [
          { dx: -35, dy: 90 }, { dx: 35, dy: 90 },
          { dx: 0, dy: 140 }, { dx: -45, dy: 140 }, { dx: 45, dy: 140 }
        ];
        this.ctx!.strokeStyle = `rgba(16, 185, 129, ${focusAlpha * 0.35})`;
        this.ctx!.fillStyle = `rgba(16, 185, 129, ${focusAlpha * 0.08})`;

        const projNodes = nodes.map(n => project3D(m.x + n.dx, m.y + n.dy, m.z)).filter(n => n !== null) as { x: number; y: number; scale: number }[];
        
        projNodes.forEach((pn, nodeI) => {
          this.ctx!.beginPath();
          this.ctx!.arc(pn.x, pn.y, 6 * pn.scale, 0, Math.PI * 2);
          this.ctx!.fill();
          this.ctx!.stroke();

          // Connect adjacent nodes
          if (nodeI > 0) {
            const prev = projNodes[nodeI - 1];
            this.ctx!.beginPath();
            this.ctx!.moveTo(prev.x, prev.y);
            this.ctx!.lineTo(pn.x, pn.y);
            this.ctx!.stroke();
          }
        });
        break;
      }
      case 3: {
        // --- Milestone 3: Enterprise HR networks ---
        const ptCenter = project3D(m.x, m.y + 110, m.z);
        if (ptCenter) {
          const w = 70 * ptCenter.scale;
          const h = 40 * ptCenter.scale;
          this.ctx!.strokeStyle = `rgba(59, 130, 246, ${focusAlpha * 0.3})`;
          this.ctx!.strokeRect(ptCenter.x - w / 2, ptCenter.y - h / 2, w, h);
          this.ctx!.fillStyle = `rgba(59, 130, 246, ${focusAlpha * 0.05})`;
          this.ctx!.fillRect(ptCenter.x - w / 2, ptCenter.y - h / 2, w, h);

          // Flow lines on sides
          this.ctx!.strokeStyle = `rgba(59, 130, 246, ${focusAlpha * 0.15})`;
          this.ctx!.beginPath();
          this.ctx!.moveTo(ptCenter.x - w, ptCenter.y);
          this.ctx!.lineTo(ptCenter.x + w, ptCenter.y);
          this.ctx!.stroke();
        }
        break;
      }
      case 4: {
        // --- Milestone 4: Massive system module revamp (Attendance, Leaves, Shifts...) ---
        // Draw large reconfiguring systems ring
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const mainRad = 65 * ptCenter.scale;
          
          this.ctx!.beginPath();
          this.ctx!.arc(ptCenter.x, ptCenter.y, mainRad, 0, Math.PI * 2);
          this.ctx!.strokeStyle = `rgba(239, 68, 68, ${focusAlpha * 0.35})`;
          this.ctx!.lineWidth = 1.5;
          this.ctx!.stroke();

          // Draw orbital module nodes
          const modCount = 7;
          this.ctx!.lineWidth = 1.0;
          for (let i = 0; i < modCount; i++) {
            const angle = (this.renderTime * 0.004) + (i * Math.PI * 2) / modCount;
            const mx = ptCenter.x + Math.cos(angle) * mainRad;
            const my = ptCenter.y + Math.sin(angle) * mainRad;
            
            this.ctx!.beginPath();
            this.ctx!.arc(mx, my, 4 * ptCenter.scale, 0, Math.PI * 2);
            this.ctx!.strokeStyle = `rgba(239, 68, 68, ${focusAlpha * 0.8})`;
            this.ctx!.fillStyle = `rgba(239, 68, 68, ${focusAlpha * 0.25})`;
            this.ctx!.fill();
            this.ctx!.stroke();

            // lines connecting nodes back to core
            this.ctx!.strokeStyle = `rgba(239, 68, 68, ${focusAlpha * 0.12})`;
            this.ctx!.beginPath();
            this.ctx!.moveTo(ptCenter.x, ptCenter.y);
            this.ctx!.lineTo(mx, my);
            this.ctx!.stroke();
          }
        }
        break;
      }
      case 5: {
        // --- Milestone 5: Crystal trophy & award chamber ---
        const ptBase = project3D(m.x, m.y + 150, m.z);
        const ptTop = project3D(m.x, m.y + 80, m.z);
        if (ptBase && ptTop) {
          const w = 24 * ptBase.scale;
          this.ctx!.strokeStyle = `rgba(251, 191, 36, ${focusAlpha * 0.5})`;
          this.ctx!.fillStyle = `rgba(251, 191, 36, ${focusAlpha * 0.08})`;

          // Draw triangular crystal shape
          this.ctx!.beginPath();
          this.ctx!.moveTo(ptBase.x - w, ptBase.y);
          this.ctx!.lineTo(ptBase.x + w, ptBase.y);
          this.ctx!.lineTo(ptTop.x, ptTop.y);
          this.ctx!.closePath();
          this.ctx!.fill();
          this.ctx!.stroke();

          // Upward light rays
          this.ctx!.strokeStyle = `rgba(251, 191, 36, ${focusAlpha * 0.25})`;
          this.ctx!.beginPath();
          this.ctx!.moveTo(ptTop.x, ptTop.y);
          this.ctx!.lineTo(ptTop.x, ptTop.y - 45 * ptTop.scale);
          this.ctx!.stroke();
        }
        break;
      }
      case 6: {
        // --- Milestone 6: Futuristic gateway opening ---
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const relativeZ = m.z - this.cameraZ();
          // Open door dynamically when camera gets close (depth < 400)
          const openFactor = Math.max(0, Math.min(1.0, (400 - relativeZ) / 300));
          const w = 45 * ptCenter.scale;
          const h = 55 * ptCenter.scale;
          const slide = w * openFactor * 0.95;

          this.ctx!.strokeStyle = `rgba(168, 85, 247, ${focusAlpha * 0.4})`;
          this.ctx!.fillStyle = `rgba(168, 85, 247, ${focusAlpha * 0.05})`;

          // Left door panel
          this.ctx!.strokeRect(ptCenter.x - w - slide, ptCenter.y - h / 2, w, h);
          this.ctx!.fillRect(ptCenter.x - w - slide, ptCenter.y - h / 2, w, h);

          // Right door panel
          this.ctx!.strokeRect(ptCenter.x + slide, ptCenter.y - h / 2, w, h);
          this.ctx!.fillRect(ptCenter.x + slide, ptCenter.y - h / 2, w, h);
        }
        break;
      }
      case 7: {
        // --- Milestone 7: Planning grids / schedules ---
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const w = 70 * ptCenter.scale;
          const h = 30 * ptCenter.scale;
          this.ctx!.strokeStyle = `rgba(6, 182, 212, ${focusAlpha * 0.3})`;
          this.ctx!.strokeRect(ptCenter.x - w / 2, ptCenter.y - h / 2, w, h);

          // Grid rows
          this.ctx!.strokeStyle = `rgba(6, 182, 212, ${focusAlpha * 0.15})`;
          this.ctx!.beginPath();
          this.ctx!.moveTo(ptCenter.x - w / 2, ptCenter.y);
          this.ctx!.lineTo(ptCenter.x + w / 2, ptCenter.y);
          this.ctx!.moveTo(ptCenter.x - w / 6, ptCenter.y - h / 2);
          this.ctx!.lineTo(ptCenter.x - w / 6, ptCenter.y + h / 2);
          this.ctx!.moveTo(ptCenter.x + w / 6, ptCenter.y - h / 2);
          this.ctx!.lineTo(ptCenter.x + w / 6, ptCenter.y + h / 2);
          this.ctx!.stroke();
        }
        break;
      }
      case 8: {
        // --- Milestone 8: AI Agent Network (Golden/Teal brain) ---
        // Renders neural network lines
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const rCore = 12 * ptCenter.scale;
          
          // Core brain node
          this.ctx!.beginPath();
          this.ctx!.arc(ptCenter.x, ptCenter.y, rCore, 0, Math.PI * 2);
          this.ctx!.strokeStyle = `rgba(20, 184, 166, ${focusAlpha * 0.9})`;
          this.ctx!.fillStyle = `rgba(20, 184, 166, ${focusAlpha * 0.3})`;
          this.ctx!.fill();
          this.ctx!.stroke();

          // Surrounding agent nodes
          const agentCount = 6;
          const radius = 55 * ptCenter.scale;
          for (let i = 0; i < agentCount; i++) {
            const angle = (this.renderTime * -0.0035) + (i * Math.PI * 2) / agentCount;
            const ax = ptCenter.x + Math.cos(angle) * radius;
            const ay = ptCenter.y + Math.sin(angle) * radius;

            // Connect lines
            this.ctx!.strokeStyle = `rgba(20, 184, 166, ${focusAlpha * 0.25})`;
            this.ctx!.beginPath();
            this.ctx!.moveTo(ptCenter.x, ptCenter.y);
            this.ctx!.lineTo(ax, ay);
            this.ctx!.stroke();

            // Draw agent dot
            this.ctx!.beginPath();
            this.ctx!.arc(ax, ay, 4 * ptCenter.scale, 0, Math.PI * 2);
            this.ctx!.strokeStyle = `rgba(20, 184, 166, ${focusAlpha * 0.75})`;
            this.ctx!.fillStyle = `rgba(251, 191, 36, ${focusAlpha * 0.25})`;
            this.ctx!.fill();
            this.ctx!.stroke();
          }
        }
        break;
      }
    }

    this.ctx!.restore();
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
    this.checkAllOverflows();
  };

  public checkOverflow(element: HTMLElement | null, key: string): void {
    if (!element) return;
    const hasOverflow = element.scrollHeight > element.clientHeight + 4;
    const isAtTop = element.scrollTop < 10;
    const show = hasOverflow && isAtTop;
    
    const currentVal = this.showScrollIndicator()[key];
    if (currentVal !== show) {
      this.showScrollIndicator.update(prev => ({
        ...prev,
        [key]: show
      }));
    }
  }

  public checkAllOverflows(): void {
    if (!this.animationService.getIsBrowser()) return;
    setTimeout(() => {
      const infoEl = this.el.nativeElement.querySelector('.info-zone-inner');
      const contribEl = this.el.nativeElement.querySelector('.visual-content ul');
      this.checkOverflow(infoEl, 'info');
      this.checkOverflow(contribEl, 'contrib');
    }, 150);
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    this.targetMouseX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    this.targetMouseY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  };

  ngOnDestroy(): void {
    this.sceneEngine.unregisterLifecycle('experience');

    if (this.animationService.getIsBrowser()) {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('resize', this.onResize);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
