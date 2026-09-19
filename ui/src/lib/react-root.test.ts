import { describe, expect, it, vi } from "vitest";
import type { Root } from "react-dom/client";
import {
  getOrCreateGeetorusReactRoot,
  type GeetorusReactRootHost,
} from "./react-root";

describe("getOrCreateGeetorusReactRoot", () => {
  it("reuses the existing root when the entry module runs again", () => {
    const host: GeetorusReactRootHost = {};
    const container = {} as Parameters<typeof getOrCreateGeetorusReactRoot>[1];
    const root = { render: vi.fn(), unmount: vi.fn() } as unknown as Root;
    const createRoot = vi.fn(() => root);

    expect(getOrCreateGeetorusReactRoot(host, container, createRoot)).toBe(root);
    expect(getOrCreateGeetorusReactRoot(host, container, createRoot)).toBe(root);
    expect(createRoot).toHaveBeenCalledTimes(1);
    expect(createRoot).toHaveBeenCalledWith(container);
  });
});
