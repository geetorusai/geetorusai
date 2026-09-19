export type CloudInstanceEnv = Record<string, string | undefined>;

export type CloudStackContext = {
  stackId: string | null;
  stackSlug: string | null;
  accountGroupId: string | null;
  primaryHost: string | null;
  cloudOrigin: string | null;
};

function normalizeOptionalEnvValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

/**
 * The canonical Geetorus Cloud instance predicate.
 *
 * The tenant token is the signal injected on live cloud stacks. The managed
 * config document is the legacy/bootstrap signal used by managed feature and
 * plugin floors. Their union is intentionally monotonic: either prior signal
 * keeps every restrictive cloud floor enabled.
 */
export function isCloudManagedInstance(
  env: CloudInstanceEnv = process.env,
): boolean {
  return (
    normalizeOptionalEnvValue(env.GEETORUS_CLOUD_TENANT_SERVER_TOKEN) !== null ||
    env.GEETORUS_MANAGED_CONFIG !== undefined
  );
}

/**
 * Public stack metadata injected by the Geetorus Cloud provisioner.
 *
 * A managed signal can exist briefly before every metadata value is available,
 * so absent or blank values are represented as null rather than making health
 * checks fail. Self-hosted instances never expose a stack context.
 */
export function getCloudStackContext(
  env: CloudInstanceEnv = process.env,
): CloudStackContext | null {
  if (!isCloudManagedInstance(env)) return null;

  return {
    stackId: normalizeOptionalEnvValue(env.GEETORUS_CLOUD_STACK_ID),
    stackSlug: normalizeOptionalEnvValue(env.GEETORUS_STACK_SLUG),
    accountGroupId: normalizeOptionalEnvValue(env.GEETORUS_CLOUD_ACCOUNT_GROUP_ID),
    primaryHost: normalizeOptionalEnvValue(env.GEETORUS_PRIMARY_HOST),
    cloudOrigin: normalizeOptionalEnvValue(env.GEETORUS_CLOUD_API_ORIGIN),
  };
}
