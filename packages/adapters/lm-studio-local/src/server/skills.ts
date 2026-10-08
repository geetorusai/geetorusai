import type { AdapterSkillContext, AdapterSkillSnapshot } from "@geetorusai/adapter-utils";
import {
  listOpenAICompatibleSkills,
  syncOpenAICompatibleSkills,
} from "@geetorusai/adapter-openai-compatible-local/server";

function asLmStudioSnapshot(snapshot: AdapterSkillSnapshot): AdapterSkillSnapshot {
  return { ...snapshot, adapterType: "lm_studio_local" };
}

export async function listLmStudioSkills(ctx: AdapterSkillContext): Promise<AdapterSkillSnapshot> {
  return asLmStudioSnapshot(await listOpenAICompatibleSkills(ctx));
}

export async function syncLmStudioSkills(
  ctx: AdapterSkillContext,
  desiredSkills: string[],
): Promise<AdapterSkillSnapshot> {
  return asLmStudioSnapshot(await syncOpenAICompatibleSkills(ctx, desiredSkills));
}
