import type { AdapterExecutionContext, AdapterExecutionResult } from "@geetorusai/adapter-utils";
import { execute as executeOpenAICompatible } from "@geetorusai/adapter-openai-compatible-local/server";
import { withLmStudioDefaults } from "./config.js";

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const result = await executeOpenAICompatible({
    ...ctx,
    config: withLmStudioDefaults(ctx.config),
  });
  return {
    ...result,
    provider: "lm_studio",
    biller: "lm_studio",
    billingType: "unknown",
  };
}
