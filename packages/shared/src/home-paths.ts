import os from "node:os";
import path from "node:path";

export const DEFAULT_GEETORUS_INSTANCE_ID = "default";
export const GEETORUS_CONFIG_BASENAME = "config.json";
export const GEETORUS_ENV_FILENAME = ".env";

const PATH_SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;

export function expandHomePrefix(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.resolve(os.homedir(), value.slice(2));
  return value;
}

export function resolveGeetorusHomeDir(homeOverride?: string): string {
  const raw = homeOverride?.trim() || process.env.GEETORUS_HOME?.trim();
  if (raw) return path.resolve(expandHomePrefix(raw));
  return path.resolve(os.homedir(), ".geetorus");
}

export function resolveGeetorusInstanceId(instanceIdOverride?: string): string {
  const raw = instanceIdOverride?.trim() || process.env.GEETORUS_INSTANCE_ID?.trim() || DEFAULT_GEETORUS_INSTANCE_ID;
  if (!PATH_SEGMENT_RE.test(raw)) {
    throw new Error(`Invalid GEETORUS_INSTANCE_ID '${raw}'.`);
  }
  return raw;
}

export function resolveGeetorusInstanceRoot(input: {
  homeDir?: string;
  instanceId?: string;
} = {}): string {
  return path.resolve(resolveGeetorusHomeDir(input.homeDir), "instances", resolveGeetorusInstanceId(input.instanceId));
}

export function resolveGeetorusInstanceConfigPath(input: {
  homeDir?: string;
  instanceId?: string;
} = {}): string {
  return path.resolve(resolveGeetorusInstanceRoot(input), GEETORUS_CONFIG_BASENAME);
}

export function resolveGeetorusConfigPathForInstance(input: {
  homeDir?: string;
  instanceId?: string;
} = {}): string {
  return resolveGeetorusInstanceConfigPath(input);
}

export function resolveGeetorusEnvPathForConfig(configPath: string): string {
  return path.resolve(path.dirname(configPath), GEETORUS_ENV_FILENAME);
}

export function resolveDefaultEmbeddedPostgresDir(input: {
  homeDir?: string;
  instanceId?: string;
} = {}): string {
  return path.resolve(resolveGeetorusInstanceRoot(input), "db");
}

export function resolveDefaultLogsDir(input: {
  homeDir?: string;
  instanceId?: string;
} = {}): string {
  return path.resolve(resolveGeetorusInstanceRoot(input), "logs");
}

export function resolveDefaultSecretsKeyFilePath(input: {
  homeDir?: string;
  instanceId?: string;
} = {}): string {
  return path.resolve(resolveGeetorusInstanceRoot(input), "secrets", "master.key");
}

export function resolveDefaultStorageDir(input: {
  homeDir?: string;
  instanceId?: string;
} = {}): string {
  return path.resolve(resolveGeetorusInstanceRoot(input), "data", "storage");
}

export function resolveDefaultBackupDir(input: {
  homeDir?: string;
  instanceId?: string;
} = {}): string {
  return path.resolve(resolveGeetorusInstanceRoot(input), "data", "backups");
}

export function resolveHomeAwarePath(value: string): string {
  return path.resolve(expandHomePrefix(value));
}
