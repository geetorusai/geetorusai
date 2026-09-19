import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCodexSkillsInjected } from "@geetorusai/adapter-codex-local/server";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createGeetorusRepoSkill(root: string, skillName: string) {
  await fs.mkdir(path.join(root, "server"), { recursive: true });
  await fs.mkdir(path.join(root, "packages", "adapter-utils"), { recursive: true });
  await fs.mkdir(path.join(root, "skills", skillName), { recursive: true });
  await fs.writeFile(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");
  await fs.writeFile(path.join(root, "package.json"), '{"name":"geetorus"}\n', "utf8");
  await fs.writeFile(
    path.join(root, "skills", skillName, "SKILL.md"),
    `---\nname: ${skillName}\n---\n`,
    "utf8",
  );
}

async function createCustomSkill(root: string, skillName: string) {
  await fs.mkdir(path.join(root, "custom", skillName), { recursive: true });
  await fs.writeFile(
    path.join(root, "custom", skillName, "SKILL.md"),
    `---\nname: ${skillName}\n---\n`,
    "utf8",
  );
}

describe("codex local adapter skill injection", () => {
  const geetorusKey = "geetorusai/geetorus/geetorus";
  const createAgentKey = "geetorusai/geetorus/geetorus-create-agent";
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("repairs a Codex Geetorus skill symlink that still points at another live checkout", async () => {
    const currentRepo = await makeTempDir("geetorus-codex-current-");
    const oldRepo = await makeTempDir("geetorus-codex-old-");
    const skillsHome = await makeTempDir("geetorus-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(oldRepo);
    cleanupDirs.add(skillsHome);

    await createGeetorusRepoSkill(currentRepo, "geetorus");
    await createGeetorusRepoSkill(currentRepo, "geetorus-create-agent");
    await createGeetorusRepoSkill(oldRepo, "geetorus");
    await fs.symlink(path.join(oldRepo, "skills", "geetorus"), path.join(skillsHome, "geetorus"));

    const logs: Array<{ stream: "stdout" | "stderr"; chunk: string }> = [];
    await ensureCodexSkillsInjected(
      async (stream, chunk) => {
        logs.push({ stream, chunk });
      },
      {
        skillsHome,
        skillsEntries: [
          {
            key: geetorusKey,
            runtimeName: "geetorus",
            source: path.join(currentRepo, "skills", "geetorus"),
          },
          {
            key: createAgentKey,
            runtimeName: "geetorus-create-agent",
            source: path.join(currentRepo, "skills", "geetorus-create-agent"),
          },
        ],
      },
    );

    expect(await fs.realpath(path.join(skillsHome, "geetorus"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "geetorus")),
    );
    expect(await fs.realpath(path.join(skillsHome, "geetorus-create-agent"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "geetorus-create-agent")),
    );
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Repaired Codex skill "geetorus"'),
      }),
    );
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Injected Codex skill "geetorus-create-agent"'),
      }),
    );
  });

  it("preserves a custom Codex skill symlink outside Geetorus repo checkouts", async () => {
    const currentRepo = await makeTempDir("geetorus-codex-current-");
    const customRoot = await makeTempDir("geetorus-codex-custom-");
    const skillsHome = await makeTempDir("geetorus-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(customRoot);
    cleanupDirs.add(skillsHome);

    await createGeetorusRepoSkill(currentRepo, "geetorus");
    await createCustomSkill(customRoot, "geetorus");
    await fs.symlink(path.join(customRoot, "custom", "geetorus"), path.join(skillsHome, "geetorus"));

    await ensureCodexSkillsInjected(async () => {}, {
      skillsHome,
      skillsEntries: [{
        key: geetorusKey,
        runtimeName: "geetorus",
        source: path.join(currentRepo, "skills", "geetorus"),
      }],
    });

    expect(await fs.realpath(path.join(skillsHome, "geetorus"))).toBe(
      await fs.realpath(path.join(customRoot, "custom", "geetorus")),
    );
  });

  it("prunes broken symlinks for unavailable Geetorus repo skills before Codex starts", async () => {
    const currentRepo = await makeTempDir("geetorus-codex-current-");
    const oldRepo = await makeTempDir("geetorus-codex-old-");
    const skillsHome = await makeTempDir("geetorus-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(oldRepo);
    cleanupDirs.add(skillsHome);

    await createGeetorusRepoSkill(currentRepo, "geetorus");
    await createGeetorusRepoSkill(oldRepo, "agent-browser");
    const staleTarget = path.join(oldRepo, "skills", "agent-browser");
    await fs.symlink(staleTarget, path.join(skillsHome, "agent-browser"));
    await fs.rm(staleTarget, { recursive: true, force: true });

    const logs: Array<{ stream: "stdout" | "stderr"; chunk: string }> = [];
    await ensureCodexSkillsInjected(
      async (stream, chunk) => {
        logs.push({ stream, chunk });
      },
      {
        skillsHome,
        skillsEntries: [{
          key: geetorusKey,
          runtimeName: "geetorus",
          source: path.join(currentRepo, "skills", "geetorus"),
        }],
      },
    );

    await expect(fs.lstat(path.join(skillsHome, "agent-browser"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Removed stale Codex skill "agent-browser"'),
      }),
    );
  });

  it("preserves other live Geetorus skill symlinks in the shared workspace skill directory", async () => {
    const currentRepo = await makeTempDir("geetorus-codex-current-");
    const skillsHome = await makeTempDir("geetorus-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(skillsHome);

    await createGeetorusRepoSkill(currentRepo, "geetorus");
    await createGeetorusRepoSkill(currentRepo, "agent-browser");
    await fs.symlink(
      path.join(currentRepo, "skills", "agent-browser"),
      path.join(skillsHome, "agent-browser"),
    );

    await ensureCodexSkillsInjected(async () => {}, {
      skillsHome,
      skillsEntries: [{
        key: geetorusKey,
        runtimeName: "geetorus",
        source: path.join(currentRepo, "skills", "geetorus"),
      }],
    });

    expect((await fs.lstat(path.join(skillsHome, "geetorus"))).isSymbolicLink()).toBe(true);
    expect((await fs.lstat(path.join(skillsHome, "agent-browser"))).isSymbolicLink()).toBe(true);
    expect(await fs.realpath(path.join(skillsHome, "agent-browser"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "agent-browser")),
    );
  });
});
