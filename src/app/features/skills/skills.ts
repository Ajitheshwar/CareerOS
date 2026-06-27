import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneEngineService } from '../../core/services/scene-engine.service';
import { JarvisService } from '../../core/services/jarvis.service';
import { AnimationService } from '../../core/services/animation.service';
import { CursorService } from '../../core/services/cursor.service';
import { SceneLifecycle } from '../../core/types/scene.types';
import { BREAKPOINTS } from '../../core/constants/breakpoints';
import { Skill, ProjectedSkillNode, CanvasParticle, SidebarBlock } from '../../shared/interfaces/skill.interface';
import { SKILLS_DATA, SIDEBAR_BLOCKS } from '../../shared/constants/skills.constants';
import { SKILLS_CAMERA } from '../../shared/constants/camera.constants';
import { smoothstep } from '../../shared/utils/math.utils';
import { rotatePointX, rotatePointY } from '../../shared/utils/geometry.utils';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills.html',
  styleUrl: './skills.scss'
})
export class SkillsComponent implements OnInit, AfterViewInit, OnDestroy, SceneLifecycle {
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly jarvisService = inject(JarvisService);
  private readonly animationService = inject(AnimationService);
  private readonly cursorService = inject(CursorService);
  private readonly el = inject(ElementRef);

  // Stage accent colors (mirrors the reactor core colors in renderFrame)
  private readonly STAGE_COLORS = ['#00f0ff', '#00ffaa', '#c0c1ff', '#ffaa00', '#e2e1ee'] as const;

  public readonly sidebarBlocks = SIDEBAR_BLOCKS;

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
  private readonly focalLength = SKILLS_CAMERA.FOCAL_LENGTH;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  // Background environment ambient particles
  private ambientParticles: CanvasParticle[] = [];
  private readonly ambientCount = SKILLS_CAMERA.AMBIENT_COUNT;

  // Skills static configuration data
  private readonly skillsData = SKILLS_DATA;

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

    // Keep cursor color in sync with the active stage
    effect(() => {
      const color = this.STAGE_COLORS[this.activeStageIndex()];
      if (this.isSceneActive) {
        this.cursorService.setSceneColor(color);
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
    // Apply stage color immediately on enter
    this.cursorService.setSceneColor(this.STAGE_COLORS[this.activeStageIndex()]);

    if (this.animationService.getIsBrowser() && !this.animationFrameId) {
      this.startAnimationLoop();
    }
  }

  onLeave(): void {
    console.log('[Scene: Skills Engine] Leaved');
    this.isSceneActive = false;
    // Reset cursor to default when leaving skills scene
    this.cursorService.setSceneColor(null);
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
    const colors = ['0, 240, 255', '0, 255, 170', '192, 193, 255', '255, 170, 0'];

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
    const isMobile = width < BREAKPOINTS.MD;

    this.ctx.clearRect(0, 0, width, height);

    // Apply mouse parallax target easing
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.08;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.08;

    const prog = this.progress();
    const localScroll = prog * 1000;

    // 1. Forward camera motion with plateau-based step-and-hold pacing around stage midpoints
    let cameraZ = prog * 2000 - 200;

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
      // Move particles slowly forward
      p.z -= p.speed;
      if (p.z < -200) {
        p.z = 1800; // wrap around to back
      }

      const screenPt = project3D(p.x, p.y, p.z);
      if (!screenPt) return;

      const size = p.size * screenPt.scale;
      let opacity = p.opacity * (1.0 - Math.abs(p.z - (cameraZ + 150)) / 900);
      opacity = Math.max(0.01, Math.min(0.8, opacity));

      this.ctx!.beginPath();
      this.ctx!.arc(screenPt.x, screenPt.y, size, 0, Math.PI * 2);
      this.ctx!.fillStyle = `rgba(${p.color}, ${opacity})`;
      this.ctx!.fill();
    });

    // 3. Draw Persistent reactor centerpiece
    const reactorWorldZ = cameraZ + 50;
    const reactorScreen = project2D(0, 0, reactorWorldZ);
    
    if (reactorScreen) {
      this.ctx!.save();
      const rx = reactorScreen.x;
      const ry = reactorScreen.y;
      const rScale = reactorScreen.scale * (isMobile ? 0.65 : 1.0);

      // Pulse reactor core based on time and stage intensity
      const pulsePeriod = activeIdx === 3 ? 0.05 : activeIdx === 0 ? 0.025 : activeIdx === 1 ? 0.015 : activeIdx === 2 ? 0.01 : 0.005;
      const pulseAmp = activeIdx === 3 ? 12 : activeIdx === 0 ? 8 : activeIdx === 1 ? 6 : activeIdx === 2 ? 5 : 2;
      const coreRadius = (45 + Math.sin(this.renderTime * pulsePeriod) * pulseAmp) * rScale;

      // Select reactor colors based on active stage
      let gradStart = 'rgba(255, 255, 255, 0.9)';
      let gradMid = 'rgba(0, 240, 255, 0.6)';   // default cyan
      let gradOuter = 'rgba(0, 219, 233, 0.15)'; // default outer teal
      let themeColor = '#00f0ff';

      if (activeIdx === 1) { // Backend
        gradMid = 'rgba(0, 255, 170, 0.6)';     // Neon Mint-Teal
        gradOuter = 'rgba(0, 105, 70, 0.15)';   // deep neon green
        themeColor = '#00ffaa';
      } else if (activeIdx === 2) { // Data
        gradMid = 'rgba(192, 193, 255, 0.6)';    // indigo
        gradOuter = 'rgba(49, 49, 192, 0.15)'; // deep indigo
        themeColor = '#c0c1ff';
      } else if (activeIdx === 3) { // AI
        gradMid = 'rgba(255, 170, 0, 0.7)';    // Neon Orange
        gradOuter = 'rgba(150, 80, 0, 0.2)';   // deep orange glow
        themeColor = '#ffaa00';
      } else if (activeIdx === 4) { // Foundations
        gradMid = 'rgba(226, 225, 238, 0.6)';   // soft white
        gradOuter = 'rgba(59, 73, 75, 0.15)';  // slate line outline
        themeColor = '#e2e1ee';
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
        const orbitRadius = 220 * (isMobile ? 0.6 : 1.0);
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
          this.ctx!.strokeStyle = tIdx === 0 ? `rgba(0, 240, 255, ${sWeight * 0.15})` : `rgba(0, 219, 233, ${sWeight * 0.15})`;
          this.ctx!.stroke();
        });

      } else if (s === 1) {
        // --- Stage 2: Backend Layer (API Grid pipelines) ---
        const gridScale = isMobile ? 0.6 : 1.0;
        const gridLinesY = [-180, -90, 0, 90, 180].map(y => y * gridScale);
        const gridLength = 500 * gridScale;

        this.ctx!.strokeStyle = `rgba(0, 255, 170, ${sWeight * 0.15})`;
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
          { x: -90 * gridScale, y: -90 * gridScale }, { x: 90 * gridScale, y: -90 * gridScale },
          { x: -90 * gridScale, y: 90 * gridScale }, { x: 90 * gridScale, y: 90 * gridScale }
        ];
        boxes.forEach(box => {
          const pt = project3D(box.x, box.y, stageZ);
          if (pt) {
            const bSize = 14 * pt.scale * gridScale;
            this.ctx!.strokeStyle = `rgba(0, 105, 70, ${sWeight * 0.5})`;
            this.ctx!.strokeRect(pt.x - bSize / 2, pt.y - bSize / 2, bSize, bSize);
            this.ctx!.fillStyle = `rgba(0, 255, 170, ${sWeight * 0.08})`;
            this.ctx!.fillRect(pt.x - bSize / 2, pt.y - bSize / 2, bSize, bSize);
          }
        });

        // Small data packets pulsing through pipelines
        const packetCount = 8;
        this.ctx!.fillStyle = `rgba(0, 255, 170, ${sWeight * 0.85})`;
        for (let k = 0; k < packetCount; k++) {
          const pathPercent = ((this.renderTime * 0.004 + k / packetCount) % 1.0);
          const px = -gridLength / 2 + pathPercent * gridLength;
          const py = gridLinesY[k % gridLinesY.length];

          const pt = project3D(px, py, stageZ);
          if (pt) {
            this.ctx!.beginPath();
            this.ctx!.arc(pt.x, pt.y, 2 * pt.scale * gridScale, 0, Math.PI * 2);
            this.ctx!.fill();
          }
        }

      } else if (s === 2) {
        // --- Stage 3: Data Layer (Cylinder cluster storage) ---
        const clusterScale = isMobile ? 0.6 : 1.0;
        const clusters = [
          { x: -180 * clusterScale, y: -120 * clusterScale }, { x: 180 * clusterScale, y: -120 * clusterScale },
          { x: -200 * clusterScale, y: 140 * clusterScale }, { x: 200 * clusterScale, y: 140 * clusterScale }
        ];

        clusters.forEach((c, idx) => {
          const baseHeight = 50 * clusterScale;
          const ptBase = project3D(c.x, c.y + baseHeight, stageZ);
          const ptTop = project3D(c.x, c.y - baseHeight, stageZ);

          if (ptBase && ptTop) {
            const rWidth = 24 * ptBase.scale * clusterScale;
            const cyHeight = ptBase.y - ptTop.y;

            // Gradient for database cylinder
            const cGrad = this.ctx!.createLinearGradient(ptBase.x - rWidth, 0, ptBase.x + rWidth, 0);
            cGrad.addColorStop(0, `rgba(192, 193, 255, ${sWeight * 0.15})`);
            cGrad.addColorStop(0.5, `rgba(49, 49, 192, ${sWeight * 0.28})`);
            cGrad.addColorStop(1, `rgba(192, 193, 255, ${sWeight * 0.15})`);

            this.ctx!.fillStyle = cGrad;
            this.ctx!.fillRect(ptTop.x - rWidth, ptTop.y, rWidth * 2, cyHeight);

            // Draw stacked cylinder outlines (slots)
            this.ctx!.strokeStyle = `rgba(49, 49, 192, ${sWeight * 0.4})`;
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
        const aiScale = isMobile ? 0.6 : 1.0;
        // Render interconnected nodes web
        const netNodes = [
          { x: -150 * aiScale, y: -150 * aiScale, z: stageZ - 50 },
          { x: 160 * aiScale, y: -100 * aiScale, z: stageZ + 40 },
          { x: -120 * aiScale, y: 120 * aiScale, z: stageZ - 20 },
          { x: 180 * aiScale, y: 150 * aiScale, z: stageZ + 60 },
          { x: 0 * aiScale, y: -220 * aiScale, z: stageZ - 80 },
          { x: -240 * aiScale, y: 0 * aiScale, z: stageZ + 20 },
          { x: 240 * aiScale, y: -40 * aiScale, z: stageZ - 30 }
        ];

        // Draw connections
        this.ctx!.strokeStyle = `rgba(255, 170, 0, ${sWeight * 0.18})`;
        for (let i = 0; i < netNodes.length; i++) {
          for (let j = i + 1; j < netNodes.length; j++) {
            const distSq = Math.pow(netNodes[i].x - netNodes[j].x, 2) + Math.pow(netNodes[i].y - netNodes[j].y, 2);
            if (distSq < 130000 * aiScale * aiScale) {
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
            this.ctx!.fillStyle = `rgba(255, 170, 0, ${sWeight * 0.7})`;
            this.ctx!.fill();
          }
        });

      } else {
        // --- Stage 5: System Foundations (Symmetrical blueprint framework) ---
        const fScale = isMobile ? 0.6 : 1.0;
        const boxRadius = 240 * fScale;
        
        // Large background diagnostic circle
        const cPt = project3D(0, 0, stageZ);
        if (cPt) {
          this.ctx!.beginPath();
          this.ctx!.arc(cPt.x, cPt.y, boxRadius * cPt.scale, 0, Math.PI * 2);
          this.ctx!.stroke();

          // Diagnostic crosshairs
          const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
            const pt1 = project3D(x1, y1, stageZ);
            const pt2 = project3D(x2, y2, stageZ);
            if (pt1 && pt2) {
              this.ctx!.beginPath();
              this.ctx!.moveTo(pt1.x, pt1.y);
              this.ctx!.lineTo(pt2.x, pt2.y);
              this.ctx!.stroke();
            }
          };

          drawLine(-boxRadius, 0, boxRadius, 0);
          drawLine(0, -boxRadius, 0, boxRadius);
        }
      }
      this.ctx!.restore();
    }

    // 5. Project HTML Active Stage Skills Nodes
    const activeZ = stagesZ[activeIdx];
    const projectedNodesList: ProjectedSkillNode[] = [];

    // Filter skills matching the current depth stage
    const currentSkills = this.skillsData.filter(s => s.stageIndex === activeIdx);

    currentSkills.forEach(skill => {
      // Revolve skill nodes in the 2D plane (X & Y) to keep them legible
      // 0.70 multiplier keeps nodes close to the reactor core (matches original behaviour)
      const spinAngle = this.renderTime * 0.0015 + skill.angle;
      const orbitRadius = skill.radius * 0.70;
      const sx = orbitRadius * Math.cos(spinAngle) * (isMobile ? 0.55 : 1.0);
      const sy = orbitRadius * Math.sin(spinAngle) * (isMobile ? 0.55 : 1.0);

      // Projects coordinates at target World Stage Z depth
      const screenPt = project2D(sx, sy, activeZ);
      if (!screenPt) return;

      // Scale node down slightly if mobile
      const scale = screenPt.scale * (isMobile ? 0.75 : 1.0);
      const relativeX = screenPt.x - centerX;
      const relativeY = screenPt.y - centerY;

      // Translate matrix relative to container center
      const transform = `translate3d(${relativeX}px, ${relativeY}px, 0px) translate(-50%, -50%) scale(${scale})`;
      const zIndex = Math.round(500 - activeZ);

      // HUD connection vector calculations
      const length = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
      const angle = Math.atan2(relativeY, relativeX);
      const vectorRotation = `rotate(${angle + Math.PI}rad)`;

      // Fade out nodes that are too far in front or behind the active camera view
      let opacity = 1.0 - Math.abs(activeZ - cameraZ) / 380;
      opacity = Math.max(0, Math.min(1.0, opacity));

      projectedNodesList.push({
        id: skill.id,
        name: skill.name,
        isPrimary: skill.isPrimary,
        description: skill.description,
        transform,
        opacity,
        zIndex,
        color: skill.color,
        vectorLength: length - 24, // stop short of the text block slightly
        vectorRotation
      });
    });

    this.projectedSkills.set(projectedNodesList);
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
    // Normalize coordinates relative to viewport center
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
