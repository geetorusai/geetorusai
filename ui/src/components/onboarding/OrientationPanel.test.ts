// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { markOrientationSeen, shouldShowOrientation } from "./OrientationPanel";

afterEach(() => localStorage.clear());

describe("shouldShowOrientation", () => {
  it("shows for a fresh company that has at least one agent", () => {
    expect(shouldShowOrientation("co-1", 1)).toBe(true);
  });

  it("hides with no company or no agents (still mid-onboarding)", () => {
    expect(shouldShowOrientation(null, 3)).toBe(false);
    expect(shouldShowOrientation(undefined, 3)).toBe(false);
    expect(shouldShowOrientation("co-1", 0)).toBe(false);
  });

  it("stays hidden after it has been dismissed for that company", () => {
    markOrientationSeen("co-1");
    expect(shouldShowOrientation("co-1", 2)).toBe(false);
    // a different company is unaffected
    expect(shouldShowOrientation("co-2", 2)).toBe(true);
  });
});
