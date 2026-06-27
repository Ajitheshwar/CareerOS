import { CameraKeyframe } from '../interfaces/animation.interface';

export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
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
  
  // Milestone 4: Time Revamp (Hero - longer focus space)
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
  
  // Milestone 8: CareerOps AI (Hero - final culmination)
  { p: 0.92, z: 5100, x: 0, y: 0, activeIdx: 7, focusWeight: 0 },
  { p: 0.93, z: 5200, x: 210, y: -15, activeIdx: 7, focusWeight: 1 },
  { p: 0.95, z: 5200, x: 210, y: -15, activeIdx: 7, focusWeight: 1 },
  { p: 0.97, z: 5350, x: 0, y: 0, activeIdx: 7, focusWeight: 0 },
  { p: 1.00, z: 5800, x: 0, y: 0, activeIdx: -1, focusWeight: 0 }
];
