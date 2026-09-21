import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AdapterSkillContext,
  AdapterSkillSnapshot,
} from "@geetorusai/adapter-utils";
import {
  buildPersistentSkillSnapshot,
  ensureGeetorusSkillSymlink,
  readGeetorusRuntimeSkillEntries,
  readInstalledSkillTargets,
  resolveLegacyGeetorusDesiredSkillNames,
} from "@geetorusai/adapter-utils/server-utils";

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function resolveOpenAICompatibleSkillsHome(config: Record<string, unknown>) {
  const env =
    typeof config.env === "object" && config.env !== null && !Array.isArray(config.env)
      ? (config.env as Record<string, unknown>)
      : {};
  const configuredHome = asString(env.HOME);
  const home = configuredHome ? path.resolve(configuredHome) : os.homedir();
  return path.join(home, ".claude", "skills");
}

async function buildOpenAICompatibleSkillSnapshot(config: Record<string, unknown>): Promise<AdapterSkillSnapshot> {
  const availableEntries = await readGeetorusRuntimeSkillEntries(config, __moduleDir);
  const desiredSkills = resolveLegacyGeetorusDesiredSkillNames(config, availableEntries);
  const skillsHome = resolveOpenAICompatibleSkillsHome(config);
  const installed = await readInstalledSkillTargets(skillsHome);
  return buildPersistentSkillSnapshot({
    adapterType: "openai_compatible_local",
    availableEntries,
    desiredSkills,
    installed,
    skillsHome,
    locationLabel: "~/.claude/skills",
    installedDetail: "Installed in the shared Claude/OpenAI Compatible skills home.",
    missingDetail: "Configured but not currently linked into the shared Claude/OpenAI Compatible skills home.",
    externalConflictDetail: "Skill name is occupied by an external installation in the shared skills home.",
    externalDetail: "Installed outside Geetorus management in the shared skills home.",
    warnings: [
      "OpenAI Compatible currently uses the shared Claude skills home (~/.claude/skills).",
    ],
  });
}

export async function listOpenAICompatibleSkills(ctx: AdapterSkillContext): Promise<AdapterSkillSnapshot> {
  return buildOpenAICompatibleSkillSnapshot(ctx.config);
}

export async function syncOpenAICompatibleSkills(
  ctx: AdapterSkillContext,
  desiredSkills: string[],
): Promise<AdapterSkillSnapshot> {
  const availableEntries = await readGeetorusRuntimeSkillEntries(ctx.config, __moduleDir);
  const desiredSet = new Set([
    ...resolveLegacyGeetorusDesiredSkillNames({}, availableEntries),
    ...desiredSkills,
  ]);
  const skillsHome = resolveOpenAICompatibleSkillsHome(ctx.config);
  await fs.mkdir(skillsHome, { recursive: true });
  const installed = await readInstalledSkillTargets(skillsHome);
  const availableByRuntimeName = new Map(availableEntries.map((entry) => [entry.runtimeName, entry]));

  for (const available of availableEntries) {
    if (!desiredSet.has(available.key)) continue;
    const target = path.join(skillsHome, available.runtimeName);
    await ensureGeetorusSkillSymlink(available.source, target);
  }

  for (const [name, installedEntry] of installed.entries()) {
    const available = availableByRuntimeName.get(name);
    if (!available) continue;
    if (desiredSet.has(available.key)) continue;
    if (installedEntry.targetPath !== available.source) continue;
    await fs.unlink(path.join(skillsHome, name)).catch(() => fs.rm(path.join(skillsHome, name), { recursive: true, force: true }));
  }

  return buildOpenAICompatibleSkillSnapshot(ctx.config);
}

export function resolveOpenAICompatibleDesiredSkillNames(
  config: Record<string, unknown>,
  availableEntries: Array<{ key: string }>,
) {
  return resolveLegacyGeetorusDesiredSkillNames(config, availableEntries);
}
