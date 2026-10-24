import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ScaleMotionController,
  smoothStep,
  isDragMovement,
  applyDamping,
  clampPitch,
  DEFAULT_MOTION_CONFIG,
} from './motion';

test('smoothStep clamps and evaluates smoothly', () => {
  assert.equal(smoothStep(0), 0);
  assert.equal(smoothStep(1), 1);
  assert.equal(smoothStep(-0.5), 0);
  assert.equal(smoothStep(1.5), 1);
  assert.equal(smoothStep(0.5), 0.5);
  // Test monotonic increase
  assert.ok(smoothStep(0.3) < smoothStep(0.7));
});

test('ScaleMotionController inflates smoothly on hold', () => {
  const controller = new ScaleMotionController({
    minScale: 1.0,
    maxScale: 1.35,
    inflateDurationMs: 2000,
    deflateDurationMs: 1200,
  });

  assert.equal(controller.scale, 1.0);
  controller.setHeld(true, 1000);
  assert.equal(controller.isHeld, true);
  assert.equal(controller.targetScale, 1.35);

  // Midway at 1s (50% progress)
  const midway = controller.update(2000);
  assert.ok(midway > 1.0 && midway < 1.35);
  // At midpoint of smoothstep, value should be 1.0 + 0.35 * 0.5 = 1.175
  assert.ok(Math.abs(midway - 1.175) < 0.001);

  // At 2000ms elapsed (complete)
  const full = controller.update(3000);
  assert.equal(full, 1.35);
});

test('ScaleMotionController deflates smoothly on release and resets exactly to 1.0', () => {
  const controller = new ScaleMotionController({
    minScale: 1.0,
    maxScale: 1.35,
    inflateDurationMs: 2000,
    deflateDurationMs: 1200,
  });

  // Hold to full
  controller.setHeld(true, 0);
  controller.update(2000);
  assert.equal(controller.scale, 1.35);

  // Release
  controller.setHeld(false, 2000);
  assert.equal(controller.isHeld, false);
  assert.equal(controller.targetScale, 1.0);

  // Partial release
  const midway = controller.update(2600); // 600ms = 50% of 1200ms
  assert.ok(midway > 1.0 && midway < 1.35);

  // Complete release
  const rested = controller.update(3200);
  assert.equal(rested, 1.0, 'Must accurately restore to 1.0 without drift');
});

test('ScaleMotionController handles mid-inflation interrupt and release', () => {
  const controller = new ScaleMotionController();
  controller.setHeld(true, 0);
  controller.update(1000); // reached partway

  const current = controller.scale;
  assert.ok(current > 1.0 && current < 1.35);

  // User releases early
  controller.setHeld(false, 1000);
  assert.equal(controller.fromScale, current);
  assert.equal(controller.targetScale, 1.0);
  assert.ok(controller.duration < DEFAULT_MOTION_CONFIG.deflateDurationMs);

  // Updates back to 1.0
  const afterDeflate = controller.update(1000 + controller.duration);
  assert.equal(afterDeflate, 1.0);
});

test('isDragMovement distinguishes clicking/holding from drag rotation', () => {
  assert.equal(isDragMovement(0, 0), false);
  assert.equal(isDragMovement(2, 3), false); // sqrt(4+9) = 3.6 < 6
  assert.equal(isDragMovement(5, 5), true); // sqrt(25+25) = 7.07 >= 6
  assert.equal(isDragMovement(0, 8), true);
});

test('applyDamping slows down velocity and stops at threshold', () => {
  let vel = { x: 0.1, y: 0.05 };
  let res = applyDamping(vel, 0.5);
  assert.equal(res.velocity.x, 0.05);
  assert.equal(res.velocity.y, 0.025);
  assert.equal(res.isMoving, true);

  // Very small velocity stops
  const stopped = applyDamping({ x: 0.00005, y: 0.00005 });
  assert.equal(stopped.isMoving, false);
  assert.equal(stopped.velocity.x, 0);
  assert.equal(stopped.velocity.y, 0);
});

test('clampPitch keeps rotation within visible angle bounds', () => {
  const max = Math.PI * 0.42;
  assert.equal(clampPitch(0), 0);
  assert.equal(clampPitch(Math.PI), max);
  assert.equal(clampPitch(-Math.PI), -max);
});
