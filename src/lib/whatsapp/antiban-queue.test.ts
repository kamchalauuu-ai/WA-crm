import { describe, expect, it } from "vitest";
import { getRandomJitterMs, shouldPauseBatch } from "./antiban-queue";

describe("antiban-queue", () => {
  it("generates random jitter within specified range", () => {
    for (let i = 0; i < 50; i++) {
      const jitterMs = getRandomJitterMs(10, 30);
      expect(jitterMs).toBeGreaterThanOrEqual(10000);
      expect(jitterMs).toBeLessThanOrEqual(30000);
    }
  });

  it("identifies batch pause intervals correctly", () => {
    expect(shouldPauseBatch(35, 35)).toBe(true);
    expect(shouldPauseBatch(70, 35)).toBe(true);
    expect(shouldPauseBatch(20, 35)).toBe(false);
    expect(shouldPauseBatch(0, 35)).toBe(false);
  });
});
