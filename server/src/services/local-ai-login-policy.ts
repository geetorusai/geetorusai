import type { DeploymentMode, DeploymentExposure } from "@geetorusai/shared";

/** Same server-host boundary as local stdio runtimes. */
export function supportsLocalAiLogin(options: {
  deploymentMode?: DeploymentMode;
  deploymentExposure?: DeploymentExposure;
  trustedLocalStdioRuntimeHost?: string | null;
}) {
  return options.deploymentMode !== "authenticated" || options.deploymentExposure !== "public" || Boolean(
    options.trustedLocalStdioRuntimeHost ?? process.env.GEETORUS_TRUSTED_MCP_RUNTIME_HOST ?? process.env.GEETORUS_TOOL_RUNTIME_TRUSTED_HOST,
  );
}
