import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneEngineService } from '../../core/services/scene-engine.service';
import { JarvisService } from '../../core/services/jarvis.service';
import { AnimationService } from '../../core/services/animation.service';
import { CursorService } from '../../core/services/cursor.service';
import { SceneLifecycle } from '../../core/types/scene.types';
import { Milestone, AmbientStar, WindingParticle } from '../../shared/interfaces/timeline.interface';
import { CameraKeyframe } from '../../shared/interfaces/animation.interface';
import { FOCUS_WINDOWS, MILESTONES_LIST } from '../../shared/constants/timeline.constants';
import { CAMERA_KEYFRAMES } from '../../shared/constants/animation.constants';
import { EXPERIENCE_CAMERA } from '../../shared/constants/camera.constants';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience.html',
  styleUrl: './experience.scss'
})
export class ExperienceComponent implements OnInit, AfterViewInit, OnDestroy, SceneLifecycle {
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly jarvisService = inject(JarvisService);
  private readonly animationService = inject(AnimationService);
  private readonly cursorService = inject(CursorService);
  private readonly el = inject(ElementRef);

  // Active state and scroll progress normalized within Scene 4 limits (0.0 to 1.0)
  public readonly active = input<boolean>(false);
  public readonly progress = input<number>(0);

  // Determine whether this component should remain in DOM
  public readonly shouldRender = computed(() => {
    return this.active() || (this.progress() > 0 && this.progress() < 1.0);
  });

  // Focus window intervals for the 8 milestones
  public readonly focusWindows = FOCUS_WINDOWS;

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
        if (t_milestone >= 0.69) {
          phase = 4;
        } else if (t_milestone >= 0.46) {
          phase = 3;
        } else if (t_milestone >= 0.23) {
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
      const clampedT = Math.min(0.8, Math.max(0.0, t));
      
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
      const clampedT = Math.min(0.8, Math.max(0.0, t));
      
      opacity = 0.8 - clampedT;
      scale = 1.0 - 0.3 * clampedT;
      translateY = -40 * clampedT;
      phase = 4;
    } else {
      const t_milestone = (p - w.pStart) / (w.pEnd - w.pStart);
      if (t_milestone >= 0.69) {
        phase = 4;
      } else if (t_milestone >= 0.46) {
        phase = 3;
      } else if (t_milestone >= 0.23) {
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
  private readonly focalLength = EXPERIENCE_CAMERA.FOCAL_LENGTH;
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
  public readonly milestonesList = MILESTONES_LIST;

  // Camera flight keyframes tracking camera depth, panning offsets, and active focus points (spaced out on 5000px timeline)
  private readonly cameraKeyframes = CAMERA_KEYFRAMES;

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
    else if (prog > 0.98) {
      const range = 1.0 - 0.98;
      opacity = (1.0 - prog) / range;
      filter = `blur(${(prog - 0.98) / range * 6}px)`;
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

    // Keep cursor color synced to the active milestone color
    effect(() => {
      const info = this.activeMilestoneInfo();
      if (this.isSceneActive && info) {
        this.cursorService.setSceneColor(info.milestone.color);
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
                const scrollOffset = el.offsetTop - headerHeight;
                container.scrollTo({ top: Math.max(0, scrollOffset), behavior: 'smooth' });
              }
            }
          }, 850);
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
    // Apply current milestone color on scene enter
    const info = this.activeMilestoneInfo();
    this.cursorService.setSceneColor(info ? info.milestone.color : '#e2e1ee');

    if (this.animationService.getIsBrowser() && !this.animationFrameId) {
      this.startAnimationLoop();
    }
  }

  onLeave(): void {
    console.log('[Scene: Experience Timeline] Leaved');
    this.isSceneActive = false;
    this.cursorService.setSceneColor(null);
  }

  onProgress(progress: number): void {
    // Computed signals handle reactively
  }

  onMilestoneClick(idx: number): void {
    const midpoints = [0.09, 0.22, 0.35, 0.50, 0.65, 0.78, 0.88, 0.95];
    const localP = midpoints[idx];

    const metadata = this.sceneEngine.scenesMetadata().find(m => m.id === 'experience');
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

    // 2. Draw Corridor wire frames
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.035)';
    this.ctx.lineWidth = 0.8;
    
    const ringInterval = 300;
    const ringCount = 12;
    const startRingZ = Math.floor(camZ / ringInterval) * ringInterval - 300;

    for (let r = 0; r < ringCount; r++) {
      const rZ = startRingZ + r * ringInterval;
      
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
        
        const fade = Math.max(0, Math.min(1.0, 1.0 - (rZ - camZ) / 2500));
        this.ctx.strokeStyle = `rgba(0, 240, 255, ${fade * 0.05})`;
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
        this.ctx!.strokeStyle = 'rgba(0, 240, 255, 0.02)';
        this.ctx!.stroke();
      }
    });
    this.ctx.restore();

    // 3. Draw winding Neon energy path linking milestones
    this.ctx.save();
    this.ctx.lineWidth = 1.6;
    
    const windingCoords: { x: number; y: number; z: number; color: string }[] = [
      { x: 0, y: 0, z: 0, color: '#06b6d4' }
    ];
    this.milestonesList.forEach(m => {
      windingCoords.push({ x: m.x * 0.4, y: m.y + 120, z: m.z, color: m.color });
    });
    windingCoords.push({ x: 0, y: 120, z: 5800, color: '#14b8a6' });

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
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const r = 40 * ptCenter.scale;
          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.3})`;
          this.ctx!.beginPath();
          this.ctx!.arc(ptCenter.x, ptCenter.y, r, 0, Math.PI * 2);
          this.ctx!.stroke();

          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.15})`;
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
        const nodes = [
          { dx: -35, dy: 90 }, { dx: 35, dy: 90 },
          { dx: 0, dy: 140 }, { dx: -45, dy: 140 }, { dx: 45, dy: 140 }
        ];
        this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.35})`;
        this.ctx!.fillStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.08})`;

        const projNodes = nodes.map(n => project3D(m.x + n.dx, m.y + n.dy, m.z)).filter(n => n !== null) as { x: number; y: number; scale: number }[];
        
        projNodes.forEach((pn, nodeI) => {
          this.ctx!.beginPath();
          this.ctx!.arc(pn.x, pn.y, 6 * pn.scale, 0, Math.PI * 2);
          this.ctx!.fill();
          this.ctx!.stroke();

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
        const ptCenter = project3D(m.x, m.y + 110, m.z);
        if (ptCenter) {
          const w = 70 * ptCenter.scale;
          const h = 40 * ptCenter.scale;
          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.3})`;
          this.ctx!.strokeRect(ptCenter.x - w / 2, ptCenter.y - h / 2, w, h);
          this.ctx!.fillStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.05})`;
          this.ctx!.fillRect(ptCenter.x - w / 2, ptCenter.y - h / 2, w, h);

          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.15})`;
          this.ctx!.beginPath();
          this.ctx!.moveTo(ptCenter.x - w, ptCenter.y);
          this.ctx!.lineTo(ptCenter.x + w, ptCenter.y);
          this.ctx!.stroke();
        }
        break;
      }
      case 4: {
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const mainRad = 65 * ptCenter.scale;
          
          this.ctx!.beginPath();
          this.ctx!.arc(ptCenter.x, ptCenter.y, mainRad, 0, Math.PI * 2);
          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.35})`;
          this.ctx!.lineWidth = 1.5;
          this.ctx!.stroke();

          const modCount = 7;
          this.ctx!.lineWidth = 1.0;
          for (let i = 0; i < modCount; i++) {
            const angle = (this.renderTime * 0.004) + (i * Math.PI * 2) / modCount;
            const mx = ptCenter.x + Math.cos(angle) * mainRad;
            const my = ptCenter.y + Math.sin(angle) * mainRad;
            
            this.ctx!.beginPath();
            this.ctx!.arc(mx, my, 4 * ptCenter.scale, 0, Math.PI * 2);
            this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.8})`;
            this.ctx!.fillStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.25})`;
            this.ctx!.fill();
            this.ctx!.stroke();

            this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.12})`;
            this.ctx!.beginPath();
            this.ctx!.moveTo(ptCenter.x, ptCenter.y);
            this.ctx!.lineTo(mx, my);
            this.ctx!.stroke();
          }
        }
        break;
      }
      case 5: {
        const ptBase = project3D(m.x, m.y + 150, m.z);
        const ptTop = project3D(m.x, m.y + 80, m.z);
        if (ptBase && ptTop) {
          const w = 24 * ptBase.scale;
          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.5})`;
          this.ctx!.fillStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.08})`;

          this.ctx!.beginPath();
          this.ctx!.moveTo(ptBase.x - w, ptBase.y);
          this.ctx!.lineTo(ptBase.x + w, ptBase.y);
          this.ctx!.lineTo(ptTop.x, ptTop.y);
          this.ctx!.closePath();
          this.ctx!.fill();
          this.ctx!.stroke();

          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.25})`;
          this.ctx!.beginPath();
          this.ctx!.moveTo(ptTop.x, ptTop.y);
          this.ctx!.lineTo(ptTop.x, ptTop.y - 45 * ptTop.scale);
          this.ctx!.stroke();
        }
        break;
      }
      case 6: {
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const relativeZ = m.z - this.cameraZ();
          const openFactor = Math.max(0, Math.min(1.0, (400 - relativeZ) / 300));
          const w = 45 * ptCenter.scale;
          const h = 55 * ptCenter.scale;
          const slide = w * openFactor * 0.95;

          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.4})`;
          this.ctx!.fillStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.05})`;

          this.ctx!.strokeRect(ptCenter.x - w - slide, ptCenter.y - h / 2, w, h);
          this.ctx!.fillRect(ptCenter.x - w - slide, ptCenter.y - h / 2, w, h);

          this.ctx!.strokeRect(ptCenter.x + slide, ptCenter.y - h / 2, w, h);
          this.ctx!.fillRect(ptCenter.x + slide, ptCenter.y - h / 2, w, h);
        }
        break;
      }
      case 7: {
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const w = 70 * ptCenter.scale;
          const h = 30 * ptCenter.scale;
          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.3})`;
          this.ctx!.strokeRect(ptCenter.x - w / 2, ptCenter.y - h / 2, w, h);

          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.15})`;
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
        const ptCenter = project3D(m.x, m.y + 120, m.z);
        if (ptCenter) {
          const rCore = 12 * ptCenter.scale;
          
          this.ctx!.beginPath();
          this.ctx!.arc(ptCenter.x, ptCenter.y, rCore, 0, Math.PI * 2);
          this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.9})`;
          this.ctx!.fillStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.3})`;
          this.ctx!.fill();
          this.ctx!.stroke();

          const agentCount = 6;
          const radius = 55 * ptCenter.scale;
          for (let i = 0; i < agentCount; i++) {
            const angle = (this.renderTime * -0.0035) + (i * Math.PI * 2) / agentCount;
            const ax = ptCenter.x + Math.cos(angle) * radius;
            const ay = ptCenter.y + Math.sin(angle) * radius;

            this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.25})`;
            this.ctx!.beginPath();
            this.ctx!.moveTo(ptCenter.x, ptCenter.y);
            this.ctx!.lineTo(ax, ay);
            this.ctx!.stroke();

            this.ctx!.beginPath();
            this.ctx!.arc(ax, ay, 4 * ptCenter.scale, 0, Math.PI * 2);
            this.ctx!.strokeStyle = `rgba(${m.colorRgb}, ${focusAlpha * 0.75})`;
            this.ctx!.fillStyle = `rgba(192, 193, 255, ${focusAlpha * 0.25})`;
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
