export interface CameraKeyframe {
  p: number;          // global scroll progress (0.0 to 1.0)
  z: number;          // camera Z coordinate
  x: number;          // camera X coordinate (drift)
  y: number;          // camera Y coordinate
  activeIdx: number;  // which milestone is in focus (-1 if none)
  focusWeight: number;// weight of active focus (0.0 to 1.0)
}
