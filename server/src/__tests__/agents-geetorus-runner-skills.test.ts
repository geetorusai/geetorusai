import { describe, expect, it } from "vitest";
import {
  normalizeGeetorusOperationalSkillPreference,
  normalizeGeetorusRunnerAdapterConfig,
  GEETORUS_OPERATIONAL_SKILL_KEY,
  resolveLegacyGeetorusDesiredSkillNames,
} from "@geetorusai/adapter-utils/server-utils";

const legacyConfig = {
  geetorusSkillSync: {
    desiredSkills: [GEETORUS_OPERATIONAL_SKILL_KEY],
  },
};

describe("geetorus_runner operational skill normalization", () => {
  it("applies full-auto native runner defaults at persistence boundaries", () => {
    expect(normalizeGeetorusRunnerAdapterConfig("geetorus_runner", {})).toEqual({
      provider: "codex",
      model: "gpt-5.6-sol",
      codexPermissionMode: "never",
      lifecycleMode: "per_turn",
    });
  });

  it("repairs an existing blank model without replacing an explicit model", () => {
    expect(normalizeGeetorusRunnerAdapterConfig("geetorus_runner", { model: "" }))
      .toMatchObject({ model: "gpt-5.6-sol" });
    expect(normalizeGeetorusRunnerAdapterConfig("geetorus_runner", { model: "gpt-5.5" }))
      .toMatchObject({ model: "gpt-5.5" });
  });

  it("does not replace a non-Codex provider model with the Codex default", () => {
    expect(normalizeGeetorusRunnerAdapterConfig("geetorus_runner", {
      provider: "claude_managed",
      model: "claude-sonnet-5",
    })).toMatchObject({
      provider: "claude_managed",
      model: "claude-sonnet-5",
    });
  });

  it("removes the legacy operational skill while preserving optional skills", () => {
    const normalized = normalizeGeetorusOperationalSkillPreference("geetorus_runner", {
      geetorusSkillSync: {
        desiredSkills: [GEETORUS_OPERATIONAL_SKILL_KEY, "company-1/reviewer"],
      },
    });

    expect(normalized).toEqual({
      geetorusSkillSync: { desiredSkills: ["company-1/reviewer"] },
    });
  });

  it("restores the required operational skill through the legacy resolver after switching back", () => {
    const normalized = normalizeGeetorusOperationalSkillPreference("geetorus_runner", legacyConfig);
    expect(resolveLegacyGeetorusDesiredSkillNames(normalized, [{
      key: GEETORUS_OPERATIONAL_SKILL_KEY,
      runtimeName: "geetorus",
    }])).toEqual([GEETORUS_OPERATIONAL_SKILL_KEY]);
  });

  it("does not change direct adapter preferences", () => {
    expect(normalizeGeetorusOperationalSkillPreference("codex_local", legacyConfig)).toBe(legacyConfig);
  });
});
