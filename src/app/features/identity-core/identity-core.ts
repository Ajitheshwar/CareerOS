import { Component, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneEngineService } from '../../core/services/scene-engine.service';
import { JarvisService } from '../../core/services/jarvis.service';
import { AnimationService } from '../../core/services/animation.service';
import { SceneLifecycle } from '../../core/types/scene.types';
import { BREAKPOINTS } from '../../core/constants/breakpoints';

interface AttributeFragment {
  text: string;
  color: string;
  // Spherical Coordinates
  r: number;
  theta: number;
  phi: number;
  // Rotation speeds
  speed: number;
  phiSpeed: number;
}

interface ProjectedFragment {
  text: string;
  color: string;
  transform: string;
  opacity: number;
  zIndex: number;
  vectorLength: number;
  vectorRotation: string;
}

interface CoreParticle3D {
  x: number;
  y: number;
  z: number;
  r: number; // radius from center
  theta: number;
  phi: number;
  speed: number;
  size: number;
  colorRgb: string;
  opacity: number;
}

@Component({
  selector: 'app-identity-core',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './identity-core.html',
  styleUrl: './identity-core.scss'
})
export class IdentityCore implements OnInit, AfterViewInit, OnDestroy, SceneLifecycle {
  private readonly sceneEngine = inject(SceneEngineService);
  private readonly jarvisService = inject(JarvisService);
  private readonly animationService = inject(AnimationService);
  private readonly el = inject(ElementRef);

  // Active status and local scroll progress from SceneEngine (0.0 to 1.0)
  public readonly active = input<boolean>(false);
  public readonly progress = input<number>(0);

  // Should we render the scene in DOM (based on active status and transitions)
  public readonly shouldRender = computed(() => {
    return this.active() || (this.progress() > 0 && this.progress() < 1.0);
  });

  constructor() {
    effect(() => {
      if (this.shouldRender()) {
        setTimeout(() => {
          this.initCanvasParticles();
        }, 0);
      }
    });
  }

  // Dynamic projected fragments signal for template binding
  public readonly projectedFragments = signal<ProjectedFragment[]>([]);

  // 3D Canvas variables
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private isSceneActive = false;
  private renderTime = 0;

  // Particle Swarm
  private particles: CoreParticle3D[] = [];
  private readonly particleCount = 130;
  private readonly baseSphereRadius = 115;

  // Interactive mouse tilt parallax variables
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  // 3D Camera Configuration
  private readonly focalLength = 340;

  // Orbit configuration for custom shape (Ellipse/Egg instead of Sphere)
  private readonly orbitScaleX = 1.35;
  private readonly orbitScaleY = 0.85;
  private readonly orbitScaleZ = 1.25;
  private readonly eggAsymmetry = 0.35; // 0 for perfect ellipse, >0 for egg shape (wider at the bottom)

  // Orbiting Attribute Fragments (placed in 3D around centerpiece)
  private readonly rawFragments: AttributeFragment[] = [
    { text: '3+ Years Experience', color: '#00f0ff', r: 445, theta: 0, phi: Math.PI / 2 - 0.2, speed: 0.002, phiSpeed: 0.006 },
    { text: 'Angular Specialist', color: '#00dbe9', r: 455, theta: (2 * Math.PI) / 6, phi: Math.PI / 2 + 0.3, speed: -0.0018, phiSpeed: -0.008 },
    { text: 'Enterprise Applications', color: '#c0c1ff', r: 435, theta: (4 * Math.PI) / 6, phi: Math.PI / 2 - 0.4, speed: 0.0022, phiSpeed: 0.005 },
    { text: 'Performance Engineering', color: '#ddb7ff', r: 460, theta: Math.PI, phi: Math.PI / 2 + 0.1, speed: -0.0015, phiSpeed: -0.004 },
    { text: 'AI Product Builder', color: '#00f0ff', r: 450, theta: (8 * Math.PI) / 6, phi: Math.PI / 2 - 0.1, speed: 0.0025, phiSpeed: 0.007 },
    { text: 'Multi-Agent Architecture', color: '#c0c1ff', r: 485, theta: 5 * Math.PI / 4, phi: Math.PI / 2 - 0.25, speed: -0.002, phiSpeed: 0.005 },
    { text: 'SDE-II', color: '#00f0ff', r: 440, theta: (10 * Math.PI) / 6, phi: Math.PI / 2 + 0.4, speed: 0.0021, phiSpeed: -0.006 },
    { text: 'Production Scale Delivery', color: '#ddb7ff', r: 410, theta: 7 * Math.PI / 4, phi: Math.PI / 2 + 0.2, speed: -0.0018, phiSpeed: -0.005 }
  ];

  // // Inner Orbit (320-380)
  //   { text: 'SDE-II', color: '#06b6d4', r: 330, theta: 0, phi: Math.PI / 2 - 0.15, speed: 0.002, phiSpeed: 0.0005 },
  //   { text: 'Angular Specialist', color: '#14b8a6', r: 345, theta: Math.PI / 2, phi: Math.PI / 2 + 0.2, speed: -0.0015, phiSpeed: -0.0004 },
  //   { text: 'AI Product Builder', color: '#10b981', r: 360, theta: Math.PI, phi: Math.PI / 2 - 0.25, speed: 0.0018, phiSpeed: 0.0006 },
  //   { text: 'Technical Ownership', color: '#8b5cf6', r: 375, theta: 3 * Math.PI / 2, phi: Math.PI / 2 + 0.1, speed: -0.0022, phiSpeed: -0.0005 },

  //   // Middle Orbit (420-500)
  //   { text: 'Enterprise Scale Systems', color: '#2563eb', r: 430, theta: Math.PI / 6, phi: Math.PI / 2 + 0.35, speed: 0.0014, phiSpeed: 0.0004 },
  //   { text: 'Time Management Revamp', color: '#06b6d4', r: 450, theta: 5 * Math.PI / 6, phi: Math.PI / 2 - 0.3, speed: -0.0016, phiSpeed: -0.0006 },
  //   { text: 'Design Systems', color: '#14b8a6', r: 470, theta: 7 * Math.PI / 6, phi: Math.PI / 2 + 0.25, speed: 0.002, phiSpeed: 0.0005 },
  //   { text: 'CareerOps Creator', color: '#8b5cf6', r: 490, theta: 11 * Math.PI / 6, phi: Math.PI / 2 - 0.2, speed: -0.0018, phiSpeed: -0.0004 },

  //   // Outer Orbit (520-620)
  //   { text: '100+ Components Built', color: '#10b981', r: 535, theta: Math.PI / 4, phi: Math.PI / 2 - 0.35, speed: 0.0012, phiSpeed: 0.0003 },
  //   { text: '5s → <1s Performance', color: '#06b6d4', r: 560, theta: 3 * Math.PI / 4, phi: Math.PI / 2 + 0.3, speed: -0.0014, phiSpeed: -0.0005 },

  // Easing helper
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // Compute container entry/exit transformations
  public readonly containerStyle = computed(() => {
    const prog = this.progress();
    let opacity = 1;
    if (prog > 0.8) {
      opacity = Math.max(0, 1 - (prog - 0.8) / 0.2);
    }
    return {
      opacity: `${opacity}`,
      display: opacity <= 0 ? 'none' : 'flex'
    };
  });

  // Nucleus styling transitions
  public readonly nucleusStyle = computed(() => {
    const prog = this.progress();
    let scale = 1;
    let translateZ = 0;
    let opacity = 1;

    if (prog <= 0.3) {
      const t = this.easeOutCubic(prog / 0.3);
      scale = 0.3 + 0.7 * t;
      translateZ = -500 + 500 * t;
      opacity = t;
    } else if (prog > 0.7) {
      const t = (prog - 0.7) / 0.3;
      scale = 1.0 + t * 2.2;
      translateZ = t * 300;
      opacity = Math.max(0, 1 - t * 1.3);
    }

    return {
      transform: `translate3d(-50%, -50%, ${translateZ}px) scale(${scale})`,
      opacity: `${opacity}`,
      filter: prog > 0.7 ? `blur(${(prog - 0.7) / 0.3 * 8}px)` : 'none'
    };
  });

  // Primary text style transitions
  public readonly contentStyle = computed(() => {
    const prog = this.progress();
    let translateZ = 0;
    let opacity = 1;
    let blur = 0;

    if (prog <= 0.3) {
      const t = this.easeOutCubic(prog / 0.3);
      translateZ = -300 + 300 * t;
      opacity = t;
    } else if (prog > 0.7) {
      const t = (prog - 0.7) / 0.3;
      translateZ = t * 450;
      opacity = Math.max(0, 1 - t * 1.8);
      blur = t * 10;
    }

    return {
      transform: `translate3d(-50%, -50%, ${translateZ}px)`,
      opacity: `${opacity}`,
      filter: blur > 0 ? `blur(${blur}px)` : 'none'
    };
  });

  ngOnInit(): void {
    this.sceneEngine.registerLifecycle('identity', this);
    
    if (this.animationService.getIsBrowser()) {
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('resize', this.onResize);
    }
  }

  ngAfterViewInit(): void {
    console.log(this.animationService.getIsBrowser())
    if (this.animationService.getIsBrowser()) {
      // If scene is active initially (e.g. page refreshed on scroll spot)
      if (this.active()) {
        this.onEnter();
      }
    }
  }

  // Scene Lifecycle Hooks
  onEnter(): void {
    console.log('[Scene: Identity Core] Entered');
    this.isSceneActive = true;
    this.jarvisService.showMessage('Engineer Profile Loaded', 4500);

    if (this.animationService.getIsBrowser() && !this.animationFrameId) {
      this.startAnimationLoop();
    }
  }

  onLeave(): void {
    console.log('[Scene: Identity Core] Leaved');
    this.isSceneActive = false;
  }

  onProgress(progress: number): void {
    // Component reacts to the progress() input directly via computed signals
  }

  /**
   * Initializes the 3D core particle swarm
   */
  private initCanvasParticles(): void {
    this.canvas = this.el.nativeElement.querySelector('.identity-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Populate particles on a 3D spherical shell
    this.particles = [];
    const colors = ['0, 240, 255', '0, 219, 233', '221, 183, 255'];

    for (let i = 0; i < this.particleCount; i++) {
      // Golden ratio spacing for relatively uniform sphere distribution
      const theta = Math.acos(1 - (2 * (i + 0.5)) / this.particleCount);
      const phi = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      this.particles.push({
        x: 0,
        y: 0,
        z: 0,
        r: this.baseSphereRadius,
        theta,
        phi,
        speed: (Math.random() * 0.008 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 1.5 + 0.8,
        colorRgb: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.3
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

  /**
   * Performs 3D math projections, draws canvas visual layers, and projects HTML nodes
   */
  private renderFrame(): void {
    if (!this.canvas || !this.ctx) return;

    this.renderTime += 1;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;

    this.ctx.clearRect(0, 0, width, height);

    // Eased mouse tilt
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.08;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.08;

    const prog = this.progress();

    // 1. Establish Camera Matrix Variables
    // Camera Z path
    let cameraZ = -420;
    let dissolveProgress = 0.0;
    
    if (prog <= 0.3) {
      const t = this.easeOutCubic(prog / 0.3);
      cameraZ = -950 + 530 * t; // move camera from -950 to -420
    } else if (prog > 0.3 && prog <= 0.7) {
      // Pause zoom in the middle range (0.38 to 0.62) at the optimal position (-400)
      if (prog <= 0.38) {
        const t = (prog - 0.3) / 0.08;
        const eased = Math.sin(t * Math.PI / 2);
        cameraZ = -420 + 20 * eased;
      } else if (prog > 0.38 && prog <= 0.62) {
        cameraZ = -400; // Plateau: Zooming is paused
      } else {
        const t = (prog - 0.62) / 0.08;
        const eased = Math.sin(t * Math.PI / 2);
        cameraZ = -400 + 20 * eased;
      }
    } else { // Exit phase
      const t = (prog - 0.7) / 0.3;
      cameraZ = -380 + 520 * t; // camera zooms past core up to +140
      dissolveProgress = t;
    }

    // Camera Orbit angle (yaw and pitch)
    let orbitYaw = 0;
    let orbitPitch = 0;
    if (prog > 0.3 && prog <= 0.7) {
      const t = (prog - 0.3) / 0.4;
      orbitYaw = t * 0.25; // 0 to 14 degrees
      orbitPitch = Math.sin(t * Math.PI) * 0.06; // subtle lift up and down
    } else if (prog > 0.7) {
      orbitYaw = 0.25;
    }

    const camAngleY = orbitYaw + this.mouseX * 0.16;
    const camAngleX = orbitPitch + this.mouseY * 0.16;

    // Helper functions for 3D rotation around Origin
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

    // Helper to project 3D to 2D screen coordinate relative to Camera
    const project = (x: number, y: number, z: number) => {
      // 1. Apply camera rotations
      let r = rotatePointY(x, y, z, camAngleY);
      r = rotatePointX(r.x, r.y, r.z, camAngleX);

      // 2. Relative to camera coordinate (Camera is at 0, 0, cameraZ)
      const relativeZ = r.z - cameraZ;
      const denom = this.focalLength + relativeZ;

      if (denom <= 8) {
        return null; // clipped behind camera
      }

      const scale = this.focalLength / denom;
      return {
        x: centerX + r.x * scale,
        y: centerY + r.y * scale,
        scale,
        depth: r.z
      };
    };

    // 2. Draw 3D Orbit Ring Paths
    // const drawRing3D = (radius: number, rotX: number, rotY: number, color: string, alpha: number) => {
    //   this.ctx!.save();
    //   this.ctx!.strokeStyle = color;
    //   this.ctx!.lineWidth = 0.8;
    //   this.ctx!.beginPath();

    //   const segments = 60;
    //   let firstPoint = true;

    //   for (let j = 0; j <= segments; j++) {
    //     const a = (j * Math.PI * 2) / segments;
    //     // Ring lies in X-Z plane originally
    //     let rx = radius * Math.cos(a);
    //     let ry = 0;
    //     let rz = radius * Math.sin(a);

    //     // Rotate ring around local X and Y for tilt orientation
    //     let pt = rotatePointX(rx, ry, rz, rotX);
    //     pt = rotatePointY(pt.x, pt.y, pt.z, rotY);

    //     // Project relative to camera
    //     const screenPt = project(pt.x, pt.y, pt.z);
    //     if (!screenPt) continue;

    //     if (firstPoint) {
    //       this.ctx!.moveTo(screenPt.x, screenPt.y);
    //       firstPoint = false;
    //     } else {
    //       this.ctx!.lineTo(screenPt.x, screenPt.y);
    //     }
    //   }
    //   this.ctx!.stroke();
    //   this.ctx!.restore();
    // };

    // Render outer rings with rotation relative to time
    const tRing1 = this.renderTime * 0.004;
    const tRing2 = -this.renderTime * 0.003;
    
    // Scale down rings and fade them out on dissolve
    const ringsScale = 1 - dissolveProgress * 0.65;
    const ringsAlpha = Math.max(0, 0.45 - dissolveProgress * 0.5);

    if (ringsAlpha > 0.01) {
      // drawRing3D(340 * ringsScale, Math.PI / 2, tRing1, `rgba(6, 182, 212, ${ringsAlpha})`, ringsAlpha);
      // drawRing3D(365 * ringsScale, Math.PI / 3, tRing2, `rgba(139, 92, 246, ${ringsAlpha * 0.7})`, ringsAlpha * 0.7);
    }

    // Scale factor for orbit radius based on viewport width
    let orbitRadiusScale = 1.0;
    let sphereRadiusScale = 1.0;
    if (width < BREAKPOINTS.SM) {
      orbitRadiusScale = 0.32; // Mobile (fits snug in viewport)
      sphereRadiusScale = 0.65;
    } else if (width < BREAKPOINTS.LG) {
      orbitRadiusScale = 0.65; // Tablet
      sphereRadiusScale = 0.85;
    }

    // 3. Update & Draw Core Particles Swarm
    const sphereRadius = this.baseSphereRadius * (1 + dissolveProgress * 3.5) * sphereRadiusScale; // expand sphere on exit
    const particleAlpha = Math.max(0, 1.0 - dissolveProgress * 1.2); // fade out on exit

    this.particles.forEach(p => {
      // Rotate particle on sphere
      p.phi += p.speed * 0.4;
      
      const px = sphereRadius * Math.sin(p.theta) * Math.cos(p.phi);
      const py = sphereRadius * Math.cos(p.theta);
      const pz = sphereRadius * Math.sin(p.theta) * Math.sin(p.phi);

      const screenPt = project(px, py, pz);
      if (!screenPt) return;

      const size = p.size * screenPt.scale;
      let opacity = p.opacity * (1.2 - (screenPt.depth + 150) / 300) * particleAlpha;
      opacity = Math.max(0.02, Math.min(0.9, opacity));

      // Draw particle dot
      this.ctx!.beginPath();
      this.ctx!.arc(screenPt.x, screenPt.y, size, 0, Math.PI * 2);
      this.ctx!.fillStyle = `rgba(${p.colorRgb}, ${opacity})`;
      this.ctx!.fill();

      // Halo for larger foreground particles
      if (size > 1.4) {
        this.ctx!.beginPath();
        this.ctx!.arc(screenPt.x, screenPt.y, size * 2.2, 0, Math.PI * 2);
        this.ctx!.fillStyle = `rgba(${p.colorRgb}, ${opacity * 0.22})`;
        this.ctx!.fill();
      }
    });

    // 4. Project HTML Metadata Fragments
    // Compute dispersion distance and opacity of fragments on dissolve
    const fragRadiusMultiplier = 1 + dissolveProgress * 3.0; // fly apart
    const fragAlpha = Math.max(0, 1.0 - dissolveProgress * 1.5); // fade out

    // Calculate aspect ratio adaptive constraints (safeguards from crossing screen edge)
    const maxX = Math.max(120, centerX); // 115px safety margin on X (fits text width)
    const maxY = Math.max(80, centerY );  // 60px safety margin on Y
    
    const projectedList: ProjectedFragment[] = [];

    this.rawFragments.forEach(f => {
      // Slowly rotate fragments around the Y and X orbital axis
      f.theta += f.speed * 0.35;
      f.phi += f.phiSpeed * 0.35;

      const relativeScale = f.r / 450; // Normalize relative to original orbit size
      const baseRadiusX = maxX * relativeScale;
      const baseRadiusY = maxY * relativeScale;
      
      const cosPhi = Math.cos(f.phi);
      const sinPhi = Math.sin(f.phi);
      const cosTheta = Math.cos(f.theta);
      const sinTheta = Math.sin(f.theta);

      // Egg shape asymmetry: wider at the bottom (positive cosPhi), narrower at top (negative cosPhi)
      const eggFactor = 1.0 + this.eggAsymmetry * cosPhi;

      // Project as screen aspect ratio adaptive ellipse (landscape on wide screens, portrait on tall screens)
      const fx = baseRadiusX * fragRadiusMultiplier * sinPhi * cosTheta * eggFactor;
      const fy = baseRadiusY * fragRadiusMultiplier * cosPhi;
      const fz = baseRadiusX * fragRadiusMultiplier * sinPhi * sinTheta * eggFactor;

      const screenPt = project(fx, fy, fz);
      if (!screenPt) return;

      // Project coordinates relative to center (0,0 is center of screen container)
      const relativeX = screenPt.x - centerX;
      const relativeY = screenPt.y - centerY;

      // Calculate HUD connection vector length and angle
      const length = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
      const angle = Math.atan2(relativeY, relativeX);
      const vectorRotation = `rotate(${angle + Math.PI}rad)`;

      // Map scale factor to sizes
      const scale = screenPt.scale;
      const transform = `translate3d(${relativeX}px, ${relativeY}px, 0px) translate(-50%, -50%) scale(${scale})`;
      
      // Calculate opacity based on Z depth & fade transitions
      let opacity = (0.2 + (1.0 - (screenPt.depth + 300) / 600) * 0.8) * fragAlpha;
      opacity = Math.max(0, Math.min(1.0, opacity));

      // Calculate zIndex (closer to viewer = smaller depth value = higher z-index)
      const zIndex = Math.round(500 - screenPt.depth);

      projectedList.push({
        text: f.text,
        color: f.color,
        transform,
        opacity,
        zIndex,
        vectorLength: length - 20, // stop short of fragment box slightly
        vectorRotation
      });
    });

    // Update projected list signal
    this.projectedFragments.set(projectedList);
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
    // Normalize coordinates from -1.0 to 1.0 relative to viewport center
    this.targetMouseX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    this.targetMouseY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  };

  ngOnDestroy(): void {
    this.sceneEngine.unregisterLifecycle('identity');
    
    if (this.animationService.getIsBrowser()) {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('resize', this.onResize);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
