import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  describeLocalInstancePaths,
  expandHomePrefix,
  resolveGeetorusHomeDir,
  resolveGeetorusInstanceId,
} from "../config/home.js";

const ORIGINAL_ENV = { ...process.env };

describe("home path resolution", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("defaults to ~/.geetorus and default instance", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "geetorus-home-paths-"));
    process.env.GEETORUS_HOME = home;
    delete process.env.GEETORUS_INSTANCE_ID;

    const paths = describeLocalInstancePaths();
    expect(paths.homeDir).toBe(home);
    expect(paths.instanceId).toBe("default");
    expect(paths.configPath).toBe(path.resolve(home, "instances", "default", "config.json"));
  });

  it("supports GEETORUS_HOME and explicit instance ids", () => {
    process.env.GEETORUS_HOME = "~/geetorus-home";

    const home = resolveGeetorusHomeDir();
    expect(home).toBe(path.resolve(os.homedir(), "geetorus-home"));
    expect(resolveGeetorusInstanceId("dev_1")).toBe("dev_1");
  });

  it("rejects invalid instance ids", () => {
    expect(() => resolveGeetorusInstanceId("bad/id")).toThrow(/Invalid GEETORUS_INSTANCE_ID/);
  });

  it("expands ~ prefixes", () => {
    expect(expandHomePrefix("~")).toBe(os.homedir());
    expect(expandHomePrefix("~/x/y")).toBe(path.resolve(os.homedir(), "x/y"));
  });
});
