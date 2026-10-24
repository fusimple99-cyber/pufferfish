/**
 * Pure logic and math calculations for Pufferfish Sugar Blowing & Rotation
 * Decoupled from DOM/WebGL for unit testing with node:test
 */

export interface MotionConfig {
  minScale: number;
  maxScale: number;
  inflateDurationMs: number;
  deflateDurationMs: number;
  dragThresholdPx: number;
}

export const DEFAULT_MOTION_CONFIG: MotionConfig = {
  minScale: 1.0,
  maxScale: 1.35,
  inflateDurationMs: 2000,
  deflateDurationMs: 1200,
  dragThresholdPx: 6,
};

/**
 * Smooth Hermite / S-Curve easing function
 */
export function smoothStep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Elastic ease-out for natural sugar rebound
 */
export function elasticEaseOut(t: number): number {
  if (t === 0 || t === 1) return t;
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
}

/**
 * Scale Motion Controller with bounce-back and continuous hold
 */
export class ScaleMotionController {
  public scale: number = 1.0;
  public fromScale: number = 1.0;
  public targetScale: number = 1.0;
  public startTime: number = 0;
  public duration: number = 0;
  public isHeld: boolean = false;
  private config: MotionConfig;

  constructor(config: Partial<MotionConfig> = {}) {
    this.config = { ...DEFAULT_MOTION_CONFIG, ...config };
  }

  public setHeld(held: boolean, now: number): void {
    const target = held ? this.config.maxScale : this.config.minScale;
    if (held === this.isHeld && target === this.targetScale) return;

    this.fromScale = this.update(now);
    this.targetScale = target;
    this.startTime = now;
    this.isHeld = held;

    const span = Math.abs(this.targetScale - this.fromScale);
    const maxSpan = this.config.maxScale - this.config.minScale;
    const ratio = maxSpan > 0 ? span / maxSpan : 1;

    this.duration = (held ? this.config.inflateDurationMs : this.config.deflateDurationMs) * ratio;
  }

  public update(now: number): number {
    if (this.duration <= 0) {
      this.scale = this.targetScale;
      return this.scale;
    }

    const elapsed = now - this.startTime;
    const progress = Math.min(1, Math.max(0, elapsed / this.duration));

    if (this.isHeld) {
      // Gentle soft inflation easing
      const eased = smoothStep(progress);
      this.scale = this.fromScale + (this.targetScale - this.fromScale) * eased;
    } else {
      // Gentle release with subtle natural deceleration
      const eased = smoothStep(progress);
      this.scale = this.fromScale + (this.targetScale - this.fromScale) * eased;
      if (progress >= 1) {
        // Enforce exact boundary
        this.scale = this.config.minScale;
      }
    }

    return this.scale;
  }

  public reset(): void {
    this.scale = this.config.minScale;
    this.fromScale = this.config.minScale;
    this.targetScale = this.config.minScale;
    this.startTime = 0;
    this.duration = 0;
    this.isHeld = false;
  }
}

/**
 * Checks whether pointer movement exceeds drag threshold
 */
export function isDragMovement(dx: number, dy: number, threshold = DEFAULT_MOTION_CONFIG.dragThresholdPx): boolean {
  return Math.sqrt(dx * dx + dy * dy) >= threshold;
}

/**
 * Calculates rotation damping with inertia
 */
export function applyDamping(
  velocity: { x: number; y: number },
  dampingFactor = 0.92,
  minVelocity = 0.0001
): { velocity: { x: number; y: number }; isMoving: boolean } {
  const vx = velocity.x * dampingFactor;
  const vy = velocity.y * dampingFactor;
  const speed = Math.sqrt(vx * vx + vy * vy);
  const isMoving = speed > minVelocity;

  return {
    velocity: {
      x: isMoving ? vx : 0,
      y: isMoving ? vy : 0,
    },
    isMoving,
  };
}

/**
 * Clamp pitch angle in radians to prevent model flipping upside-down
 */
export function clampPitch(pitch: number, minRad = -Math.PI * 0.42, maxRad = Math.PI * 0.42): number {
  return Math.max(minRad, Math.min(maxRad, pitch));
}
