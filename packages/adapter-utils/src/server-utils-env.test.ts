import { describe, expect, it } from "vitest";
import { sanitizeInheritedGeetorusEnv } from "./server-utils.js";

describe("sanitizeInheritedGeetorusEnv", () => {
  it("drops the host-only Geetorus CLI command pointer", () => {
    expect(sanitizeInheritedGeetorusEnv({
      GEETORUSAI_CMD: "node /missing/geetorusai/dist/index.js",
      GEETORUS_RUNTIME_API_URL: "http://127.0.0.1:3100",
      PATH: "/usr/bin",
    })).toEqual({
      GEETORUS_RUNTIME_API_URL: "http://127.0.0.1:3100",
      PATH: "/usr/bin",
    });
  });
});
