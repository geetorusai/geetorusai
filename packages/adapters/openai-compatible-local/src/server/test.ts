import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@geetorusai/adapter-utils";
import type { AdapterExecutionTarget } from "@geetorusai/adapter-utils/execution-target";
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  parseObject,
  ensurePathInEnv,
} from "@geetorusai/adapter-utils/server-utils";
import {
  ensureAdapterExecutionTargetCommandResolvable,
  maybeRunSandboxInstallCommand,
  ensureAdapterExecutionTargetDirectory,
  runAdapterExecutionTargetProcess,
  describeAdapterExecutionTarget,
  resolveAdapterExecutionTargetCwd,
  prepareAdapterExecutionTargetRuntime,
  overrideAdapterExecutionTargetRemoteCwd,
} from "@geetorusai/adapter-utils/execution-target";
import { discoverOpenAICompatibleModels, ensureOpenAICompatibleModelConfiguredAndAvailable } from "./models.js";
import { parseOpenAICompatibleJsonl } from "./parse.js";
import { DEFAULT_OPENAI_COMPATIBLE_LOCAL_MODEL, SANDBOX_INSTALL_COMMAND } from "../index.js";
import { prepareOpenAICompatibleRuntimeConfig, prepareManagedOpenAICompatibleRemoteHomes } from "./runtime-config.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

function firstNonEmptyLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

function summarizeProbeDetail(stdout: string, stderr: string, parsedError: string | null): string | null {
  const raw = parsedError?.trim() || firstNonEmptyLine(stderr) || firstNonEmptyLine(stdout);
  if (!raw) return null;
  const clean = raw.replace(/\s+/g, " ").trim();
  const max = 240;
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function normalizeEnv(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string") env[key] = value;
  }
  return env;
}

const OPENAI_COMPATIBLE_AUTH_REQUIRED_RE =
  /(?:auth(?:entication)?\s+required|api\s*key|invalid\s*api\s*key|not\s+logged\s+in|openai_compatible\s+auth\s+login|free\s+usage\s+exceeded)/i;

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const command = asString(config.command, "opencode");
  const target = ctx.executionTarget ?? null;
  const targetIsRemote = target?.kind === "remote";
  const targetIsSandbox = target?.kind === "remote" && target.transport === "sandbox";
  const cwd = resolveAdapterExecutionTargetCwd(target, asString(config.cwd, ""), process.cwd());
  const targetLabel = targetIsRemote
    ? ctx.environmentName ?? describeAdapterExecutionTarget(target)
    : null;
  const runId = `openai_compatible-envtest-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  if (targetLabel) {
    checks.push({
      code: "openai_compatible_environment_target",
      level: "info",
      message: `Probing inside environment: ${targetLabel}`,
    });
  }

  try {
    await ensureAdapterExecutionTargetDirectory(runId, target, cwd, {
      cwd,
      env: {},
      createIfMissing: false,
    });
    checks.push({
      code: "openai_compatible_cwd_valid",
      level: "info",
      message: `Working directory is valid: ${cwd}`,
    });
  } catch (err) {
    checks.push({
      code: "openai_compatible_cwd_invalid",
      level: "error",
      message: err instanceof Error ? err.message : "Invalid working directory",
      detail: cwd,
    });
  }

  const envConfig = parseObject(config.env);
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(envConfig)) {
    if (typeof value === "string") env[key] = value;
  }

  const baseUrl = asString(config.baseUrl, "").trim();
  const apiKey = asString(config.apiKey, "").trim();
  if (baseUrl) env.OPENAI_BASE_URL = baseUrl;
  if (apiKey) env.OPENAI_API_KEY = apiKey;

  const preparedRuntimeConfig = await prepareOpenAICompatibleRuntimeConfig({ env, config, cwd });
  const localRuntimeConfigHome =
    preparedRuntimeConfig.notes.length > 0 ? preparedRuntimeConfig.env.XDG_CONFIG_HOME : "";
  if (asBoolean(config.dangerouslySkipPermissions, true)) {
    checks.push({
      code: "openai_compatible_headless_permissions_enabled",
      level: "info",
      message: "Headless OpenAI Compatible external-directory permissions are auto-approved for unattended runs.",
    });
  }
  let restoreWorkspace: (() => Promise<void>) | null = null;
  let preparedRuntimeWorkspaceLocalDir: string | null = null;
  try {
    let runtimeTarget: AdapterExecutionTarget | null = target ?? null;
    let runtimeCwd = cwd;
    if (targetIsRemote) {
      preparedRuntimeWorkspaceLocalDir = await fs.mkdtemp(path.join(os.tmpdir(), `geetorus-openai_compatible-envtest-${runId}-`));
      const preparedExecutionTargetRuntime = await prepareAdapterExecutionTargetRuntime({
        runId,
        target,
        adapterKey: "openai_compatible",
        workspaceLocalDir: preparedRuntimeWorkspaceLocalDir,
        workspaceRemoteDir: cwd,
        installCommand: SANDBOX_INSTALL_COMMAND,
        detectCommand: command,
        assets: localRuntimeConfigHome
          ? [{
            key: "xdgConfig",
            localDir: localRuntimeConfigHome,
          }]
          : [],
      });
      restoreWorkspace = async () => {
        await preparedExecutionTargetRuntime.restoreWorkspace().catch(() => {});
        if (preparedRuntimeWorkspaceLocalDir) {
          await fs.rm(preparedRuntimeWorkspaceLocalDir, { recursive: true, force: true }).catch(() => {});
        }
      };
      runtimeCwd = preparedExecutionTargetRuntime.workspaceRemoteDir ?? runtimeCwd;
      runtimeTarget = overrideAdapterExecutionTargetRemoteCwd(target ?? null, runtimeCwd) ?? null;
      if (localRuntimeConfigHome && preparedExecutionTargetRuntime.assetDirs.xdgConfig) {
        preparedRuntimeConfig.env.XDG_CONFIG_HOME = preparedExecutionTargetRuntime.assetDirs.xdgConfig;
      }
      prepareManagedOpenAICompatibleRemoteHomes({
        env: preparedRuntimeConfig.env,
        config,
        runtimeRootDir: preparedExecutionTargetRuntime.runtimeRootDir,
        runId,
        configDir: preparedExecutionTargetRuntime.assetDirs.xdgConfig,
      });
    }
    const runtimeEnv = normalizeEnv(ensurePathInEnv({ ...process.env, ...preparedRuntimeConfig.env }));

    const cwdInvalid = checks.some((check) => check.code === "openai_compatible_cwd_invalid");
    if (cwdInvalid) {
      checks.push({
        code: "openai_compatible_command_skipped",
        level: "warn",
        message: "Skipped command check because working directory validation failed.",
        detail: command,
      });
    } else {
      const installCheck = await maybeRunSandboxInstallCommand({
        runId,
        target,
        adapterKey: "openai_compatible",
        installCommand: SANDBOX_INSTALL_COMMAND,
        detectCommand: command,
        env,
      });
      if (installCheck) checks.push(installCheck);
      try {
        await ensureAdapterExecutionTargetCommandResolvable(command, runtimeTarget, runtimeCwd, runtimeEnv);
        checks.push({
          code: "openai_compatible_command_resolvable",
          level: "info",
          message: `Command is executable: ${command}`,
        });
      } catch (err) {
        checks.push({
          code: "openai_compatible_command_unresolvable",
          level: "error",
          message: err instanceof Error ? err.message : "Command is not executable",
          detail: command,
        });
      }
    }

    const canRunProbe =
      checks.every((check) => check.code !== "openai_compatible_cwd_invalid" && check.code !== "openai_compatible_command_unresolvable");

    const configuredModel = asString(config.model, DEFAULT_OPENAI_COMPATIBLE_LOCAL_MODEL).trim();

    if (canRunProbe && configuredModel) {
      const extraArgs = (() => {
        const fromExtraArgs = asStringArray(config.extraArgs);
        if (fromExtraArgs.length > 0) return fromExtraArgs;
        return asStringArray(config.args);
      })();
      const variant = asString(config.variant, "").trim();

      const args = ["run", "--format", "json"];
      if (asBoolean(config.dangerouslySkipPermissions, true)) {
        args.push("--auto");
      }
      if (preparedRuntimeConfig.modelFlag) {
        args.push("--model", preparedRuntimeConfig.modelFlag);
      }
      if (variant) args.push("--variant", variant);
      if (extraArgs.length > 0) args.push(...extraArgs);

      const helloProbeTimeoutSec = Math.max(
        1,
        asNumber(config.helloProbeTimeoutSec, targetIsSandbox ? 90 : 60),
      );

      try {
        const probe = await runAdapterExecutionTargetProcess(
          runId,
          runtimeTarget,
          command,
          args,
          {
            cwd: runtimeCwd,
            env: runtimeEnv,
            timeoutSec: helloProbeTimeoutSec,
            graceSec: 5,
            stdin: "Respond with hello.",
            onLog: async () => {},
          },
        );

        const parsed = parseOpenAICompatibleJsonl(probe.stdout);
        const detail = summarizeProbeDetail(probe.stdout, probe.stderr, parsed.errorMessage);
        const authEvidence = `${parsed.errorMessage ?? ""}\n${probe.stdout}\n${probe.stderr}`.trim();

        if (probe.timedOut) {
          checks.push({
            code: "openai_compatible_hello_probe_timed_out",
            level: "warn",
            message: "OpenAI Compatible hello probe timed out.",
            hint: "Retry the probe. If this persists, verify your Base URL and API key.",
          });
        } else if ((probe.exitCode ?? 1) === 0 && !parsed.errorMessage) {
          checks.push({
            code: "openai_compatible_hello_probe_passed",
            level: "info",
            message: "OpenAI Compatible hello probe succeeded.",
            ...(parsed.summary ? { detail: parsed.summary.replace(/\s+/g, " ").trim().slice(0, 240) } : {}),
          });
        } else if (/ProviderModelNotFoundError/i.test(authEvidence)) {
          checks.push({
            code: "openai_compatible_hello_probe_model_unavailable",
            level: "warn",
            message: "The configured model was not found by the provider.",
            ...(detail ? { detail } : {}),
            hint: "Check that the model name exists on your provider.",
          });
        } else if (OPENAI_COMPATIBLE_AUTH_REQUIRED_RE.test(authEvidence)) {
          checks.push({
            code: "openai_compatible_hello_probe_auth_required",
            level: "warn",
            message: "Provider authentication failed or API key is invalid.",
            ...(detail ? { detail } : {}),
            hint: "Check that your API key and Base URL are correct.",
          });
        } else {
          checks.push({
            code: "openai_compatible_hello_probe_failed",
            level: "error",
            message: "OpenAI Compatible hello probe failed.",
            ...(detail ? { detail } : {}),
            hint: "Verify your API Key, Base URL, and Model in the adapter configuration.",
          });
        }
      } catch (err) {
        checks.push({
          code: "openai_compatible_hello_probe_failed",
          level: "error",
          message: "OpenAI Compatible hello probe failed.",
          detail: err instanceof Error ? err.message : String(err),
          hint: "Verify your API Key, Base URL, and Model in the adapter configuration.",
        });
      }
    }
  } finally {
    await restoreWorkspace?.();
    if (!restoreWorkspace && preparedRuntimeWorkspaceLocalDir) {
      await fs.rm(preparedRuntimeWorkspaceLocalDir, { recursive: true, force: true }).catch(() => {});
    }
    await preparedRuntimeConfig.cleanup();
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
