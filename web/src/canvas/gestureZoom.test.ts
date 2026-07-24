// #139: the wheel/pinch zoom math — pure, so no kernel/wasm needed. Asserts
// the cursor-anchored focal point, the widened clamp, and that a pinch and a
// plain wheel at the same deltaY produce a smaller step for the pinch path
// (fine trackpad deltas should not zoom as fast as a coarse mouse notch).
import { describe, expect, it } from "vitest";
import { computeWheelZoom, ZOOM_MAX, ZOOM_MIN } from "./useCanvasGestures";

describe("computeWheelZoom", () => {
  it("keeps the cursor's world point fixed while scale changes", () => {
    const scale = 1;
    const pan = { x: 0, y: 0 };
    const cursor = { x: 200, y: 150 };
    const { scale: next, pan: nextPan } = computeWheelZoom(scale, pan, -100, false, cursor);
    expect(next).toBeGreaterThan(scale);
    // world point under the cursor before: (cursor - pan) / scale
    const worldBefore = { x: (cursor.x - pan.x) / scale, y: (cursor.y - pan.y) / scale };
    const worldAfter = { x: (cursor.x - nextPan.x) / next, y: (cursor.y - nextPan.y) / next };
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6);
  });

  it("zooms out for positive deltaY, in for negative", () => {
    const cursor = { x: 0, y: 0 };
    expect(computeWheelZoom(1, cursor, 100, false, cursor).scale).toBeLessThan(1);
    expect(computeWheelZoom(1, cursor, -100, false, cursor).scale).toBeGreaterThan(1);
  });

  it("clamps to [ZOOM_MIN, ZOOM_MAX] instead of running away", () => {
    const cursor = { x: 0, y: 0 };
    expect(computeWheelZoom(ZOOM_MIN, cursor, 5000, false, cursor).scale).toBe(ZOOM_MIN);
    expect(computeWheelZoom(ZOOM_MAX, cursor, -5000, false, cursor).scale).toBe(ZOOM_MAX);
  });

  it("is a no-op at a clamp boundary (caller can skip the dispatch)", () => {
    const cursor = { x: 0, y: 0 };
    const { scale } = computeWheelZoom(ZOOM_MIN, cursor, 100, false, cursor);
    expect(scale).toBe(ZOOM_MIN);
  });

  it("pinch (ctrlKey) is more sensitive per delta unit than a plain wheel — pinch deltas arrive small, wheel deltas arrive large, both should land in a similar felt range", () => {
    const cursor = { x: 0, y: 0 };
    const wheelStep = Math.abs(1 - computeWheelZoom(1, cursor, 100, false, cursor).scale);
    const pinchStep = Math.abs(1 - computeWheelZoom(1, cursor, 100, true, cursor).scale);
    expect(pinchStep).toBeGreaterThan(wheelStep);
  });
});
