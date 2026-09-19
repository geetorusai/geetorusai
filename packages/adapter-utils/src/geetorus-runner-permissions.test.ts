import { describe, expect, it } from "vitest";

import {
  GEETORUS_RUNNER_DEFAULT_MODELS,
  isGeetorusRunnerProvider,
  resolveGeetorusRunnerModel,
  resolveGeetorusRunnerPermissionMode,
} from "./geetorus-runner-permissions.js";

describe("Geetorus Runner permission defaults", () => {
  it("defaults Codex to the only qualified non-interactive mode", () => {
    expect(resolveGeetorusRunnerPermissionMode("codex", undefined)).toBe(
      "never",
    );
    expect(resolveGeetorusRunnerPermissionMode("codex", "on-request")).toBe("never");
    expect(resolveGeetorusRunnerPermissionMode("codex", "untrusted")).toBe("never");
  });

  it("uses interactive defaults for dormant non-Codex providers", () => {
    expect(resolveGeetorusRunnerPermissionMode("opencode", undefined)).toBe(
      "ask",
    );
    expect(resolveGeetorusRunnerPermissionMode("acpx", undefined)).toBe(
      "approve-reads",
    );
  });

  it("recognizes only exact provider identifiers", () => {
    expect(isGeetorusRunnerProvider("codex")).toBe(true);
    expect(isGeetorusRunnerProvider("opencode")).toBe(true);
    expect(isGeetorusRunnerProvider("claude_managed")).toBe(true);
    expect(isGeetorusRunnerProvider("aws_agentcore")).toBe(true);
    expect(isGeetorusRunnerProvider("acpx")).toBe(true);
    expect(isGeetorusRunnerProvider("toString")).toBe(false);
    expect(isGeetorusRunnerProvider("__proto__")).toBe(false);
  });

  it("keeps managed provider permissions under the qualified profile", () => {
    expect(resolveGeetorusRunnerPermissionMode("claude_managed", "never"))
      .toBe("provider-managed");
    expect(resolveGeetorusRunnerPermissionMode("aws_agentcore", "approve-all"))
      .toBe("provider-managed");
  });

  it("uses the Codex default for missing or blank models", () => {
    expect(resolveGeetorusRunnerModel("codex", undefined)).toBe(
      GEETORUS_RUNNER_DEFAULT_MODELS.codex,
    );
    expect(resolveGeetorusRunnerModel("codex", "   ")).toBe(
      GEETORUS_RUNNER_DEFAULT_MODELS.codex,
    );
  });

  it("preserves an explicit Codex model", () => {
    expect(resolveGeetorusRunnerModel("codex", "gpt-5.5")).toBe("gpt-5.5");
    expect(resolveGeetorusRunnerModel("codex", "  gpt-5.5  ")).toBe("gpt-5.5");
  });
});
