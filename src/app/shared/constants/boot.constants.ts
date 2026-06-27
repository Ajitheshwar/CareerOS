import { BootStep } from '../interfaces/boot.interface';

export const BOOT_STEPS: BootStep[] = [
  { text: 'Analyzing Profile...', progress: 20 },
  { text: 'Exploring Systems Built...', progress: 40 },
  { text: 'Mapping Career Journey...', progress: 60 },
  { text: 'Preparing Guided Experience...', progress: 80 },
  { text: 'Ready.', progress: 100 }
];

export const BOOT_DELAYS = {
  STARTUP: 300,
  STEP_PACE: 600,
  READY_PACE: 1400,
  GLIDE_FRAME: 40
};
