export type GeetorusRunnerProvider =
  "codex" | "opencode" | "claude_managed" | "aws_agentcore" | "acpx";

export type CodexPermissionMode = "never" | "on-request" | "untrusted";
export type OpenCodePermissionMode = "allow" | "ask" | "deny";
export type AcpxPermissionMode = "approve-all" | "approve-reads" | "deny-all";

export type GeetorusRunnerPermissionMode =
  CodexPermissionMode | OpenCodePermissionMode | AcpxPermissionMode;

export const GEETORUS_RUNNER_IDLE_TIMEOUT_DEFAULT_MS = 300_000;
export const GEETORUS_RUNNER_IDLE_TIMEOUT_MAX_MS = 86_400_000;
export const GEETORUS_RUNNER_DEFAULT_MODELS = {
  codex: "gpt-5.6-sol",
  acpx: "claude-sonnet-5",
  opencode: "openrouter/deepseek/deepseek-v4-flash-0731",
} as const;

export interface GeetorusRunnerPermissionOption<
  TMode extends string = string,
> {
  value: TMode;
  label: string;
  description: string;
}

export type GeetorusRunnerPermissionCapability =
  | {
      configurable: true;
      configKey:
        "codexPermissionMode" | "opencodePermissionMode" | "acpxPermissionMode";
      defaultMode: GeetorusRunnerPermissionMode;
      options: readonly GeetorusRunnerPermissionOption<GeetorusRunnerPermissionMode>[];
      description: string;
    }
  | {
      configurable: false;
      defaultMode: "provider-managed";
      options: readonly [];
      description: string;
    };

/**
 * Control-plane catalog for Geetorus Runner permission UX and validation.
 * Runtime contracts validate the same native values again at the process
 * boundary; this catalog must remain browser-safe.
 */
export const GEETORUS_RUNNER_PERMISSION_CAPABILITIES = {
  codex: {
    configurable: true,
    configKey: "codexPermissionMode",
    defaultMode: "never",
    // `never` disables provider approval pauses; it does not disable the
    // runner's independent security boundary. Native Codex may use this mode
    // only through the root-denied, workspace-scoped, network-disabled, and
    // environment-allowlisted profile assembled by codex-security-config.ts.
    description:
      "Codex runs automatically inside a root-denied, workspace-scoped, network-disabled Geetorus environment.",
    options: [
      {
        value: "never",
        label: "Automatic (isolated)",
        description:
          "Run without Codex approval pauses while Geetorus keeps its independent workspace, network, and environment restrictions.",
      },
    ],
  },
  opencode: {
    configurable: true,
    configKey: "opencodePermissionMode",
    defaultMode: "ask",
    description:
      "Controls OpenCode tool permissions inside the assigned Geetorus environment.",
    options: [
      {
        value: "allow",
        label: "Full auto (allow)",
        description: "Allow OpenCode operations without approval pauses.",
      },
      {
        value: "ask",
        label: "Ask for permission",
        description: "Prompt before protected OpenCode operations.",
      },
      {
        value: "deny",
        label: "Deny operations",
        description: "Reject protected OpenCode operations.",
      },
    ],
  },
  claude_managed: {
    configurable: false,
    defaultMode: "provider-managed",
    options: [],
    description:
      "Claude Managed runs non-interactively under its qualified provider profile and Geetorus policy.",
  },
  aws_agentcore: {
    configurable: false,
    defaultMode: "provider-managed",
    options: [],
    description:
      "AWS AgentCore runs non-interactively under its qualified harness profile and Geetorus policy.",
  },
  acpx: {
    configurable: true,
    configKey: "acpxPermissionMode",
    defaultMode: "approve-reads",
    description:
      "Controls ACPX agent operations inside the assigned Geetorus environment.",
    options: [
      {
        value: "approve-all",
        label: "Full auto (approve all)",
        description: "Approve ACPX operations without approval pauses.",
      },
      {
        value: "approve-reads",
        label: "Allow Geetorus reads",
        description:
          "Automatically allow assigned Geetorus read tools. Other operations stop with an approval-required message because this runner has no interactive approval handler.",
      },
      {
        value: "deny-all",
        label: "Deny all",
        description: "Reject harness permission requests.",
      },
    ],
  },
} as const satisfies Record<
  GeetorusRunnerProvider,
  GeetorusRunnerPermissionCapability
>;

export function isGeetorusRunnerProvider(
  value: unknown,
): value is GeetorusRunnerProvider {
  return (
    value === "codex" ||
    value === "opencode" ||
    value === "claude_managed" ||
    value === "aws_agentcore" ||
    value === "acpx"
  );
}

export function resolveGeetorusRunnerPermissionMode(
  provider: GeetorusRunnerProvider,
  value: unknown,
): GeetorusRunnerPermissionMode | "provider-managed" {
  const capability = GEETORUS_RUNNER_PERMISSION_CAPABILITIES[provider];
  if (!capability.configurable) return capability.defaultMode;
  return capability.options.some((option) => option.value === value)
    ? (value as GeetorusRunnerPermissionMode)
    : capability.defaultMode;
}

export function resolveGeetorusRunnerModel(
  provider: keyof typeof GEETORUS_RUNNER_DEFAULT_MODELS,
  value: unknown,
): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : GEETORUS_RUNNER_DEFAULT_MODELS[provider];
}

export function resolveGeetorusRunnerIdleTimeoutMs(value: unknown): number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= GEETORUS_RUNNER_IDLE_TIMEOUT_MAX_MS
    ? value
    : GEETORUS_RUNNER_IDLE_TIMEOUT_DEFAULT_MS;
}

/** Defaults for converting a local adapter; the operator may override the provider. */
export function geetorusRunnerTransitionConfig(
  previousAdapterType: string,
  previousModel: unknown,
  providerOverride?: unknown,
): Record<string, unknown> {
  const previousProvider =
    previousAdapterType === "claude_local"
      ? "acpx"
      : previousAdapterType === "opencode_local"
        ? "opencode"
        : "codex";
  const provider =
    providerOverride === "codex" ||
    providerOverride === "opencode" ||
    providerOverride === "acpx"
      ? providerOverride
      : previousProvider;
  return {
    provider,
    model: resolveGeetorusRunnerModel(
      provider,
      provider === previousProvider ? previousModel : undefined,
    ),
    ...(provider === "acpx" ? { acpxAgent: "claude" } : {}),
    [GEETORUS_RUNNER_PERMISSION_CAPABILITIES[provider].configKey]:
      GEETORUS_RUNNER_PERMISSION_CAPABILITIES[provider].defaultMode,
    lifecycleMode: "per_turn",
  };
}

/** Old ACPX Codex agent settings use native Codex on their next configuration write. */
export function normalizeLegacyRunnerProvider(
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (config.provider !== "acpx" || config.acpxAgent !== "codex") return config;
  const {
    acpxAgent: _agent,
    acpxPermissionMode: _permission,
    ...rest
  } = config;
  return { ...rest, provider: "codex", codexPermissionMode: "never" };
}
