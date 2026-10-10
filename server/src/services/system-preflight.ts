/**
 * One source of truth for "is this instance ready to onboard on?" — surfaced to
 * the web onboarding wizard (front-door readiness panel) and reusable by any
 * scripted setup path. Mirrors the shape of the CLI's `checks/` module so the
 * two stay conceptually aligned (see cli/src/checks).
 *
 * Every check returns an actionable line, never a silent pass/fail — that is the
 * whole point of running it before the user hits a dead end mid-wizard.
 */
import fs from "node:fs/promises";
import { sql } from "drizzle-orm";
import type { Db } from "@geetorusai/db";
import { companies } from "@geetorusai/db";
import { isSupportedNodeVersion, MINIMUM_NODE_VERSION } from "@geetorusai/shared/node-version";
import type { DeploymentExposure, DeploymentMode } from "@geetorusai/shared";
import { resolveGeetorusInstanceRootForAdapter } from "@geetorusai/adapter-utils/server-utils";

export type PreflightStatus = "pass" | "warn" | "fail";

export interface PreflightCheck {
  id: string;
  name: string;
  status: PreflightStatus;
  message: string;
  /** actionable next step when status !== "pass" */
  hint?: string;
}

export interface PreflightReport {
  status: PreflightStatus;
  checks: PreflightCheck[];
  generatedAt: string;
}

function rollup(checks: PreflightCheck[]): PreflightStatus {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
}

export interface SystemPreflightOptions {
  deploymentMode: DeploymentMode;
  deploymentExposure: DeploymentExposure;
  authReady: boolean;
  /** where instance data (embedded PG, storage) lives — for the writability probe */
  instanceRoot?: string;
}

export async function runSystemPreflight(
  db: Db | undefined,
  opts: SystemPreflightOptions,
): Promise<PreflightReport> {
  const checks: PreflightCheck[] = [];

  // 1. Node.js runtime
  checks.push(
    isSupportedNodeVersion(process.versions.node)
      ? { id: "node", name: "Node.js runtime", status: "pass", message: `Node.js ${process.versions.node}` }
      : {
          id: "node",
          name: "Node.js runtime",
          status: "fail",
          message: `Node.js ${process.versions.node} is below the required ${MINIMUM_NODE_VERSION}.`,
          hint: `Install Node.js ${MINIMUM_NODE_VERSION} or newer (nvm: \`nvm install 24 && nvm use 24\`) and restart the server.`,
        },
  );

  // 2. Database connectivity + 3. schema
  if (!db) {
    checks.push({
      id: "database",
      name: "Database",
      status: "fail",
      message: "The server has no database connection.",
      hint: "Check DATABASE_URL, or let the embedded PostgreSQL start (unset DATABASE_URL) and restart.",
    });
  } else {
    try {
      await db.execute(sql`SELECT 1`);
      checks.push({ id: "database", name: "Database", status: "pass", message: "Database is reachable." });
      try {
        await db.select({ n: sql<number>`count(*)` }).from(companies);
        checks.push({ id: "schema", name: "Schema", status: "pass", message: "Core schema is present." });
      } catch (err) {
        checks.push({
          id: "schema",
          name: "Schema",
          status: "fail",
          message: `Core tables are missing or malformed: ${err instanceof Error ? err.message : String(err)}`,
          hint: "Run `pnpm db:migrate`, or restart `pnpm dev` (it auto-applies pending migrations on first run).",
        });
      }
    } catch (err) {
      checks.push({
        id: "database",
        name: "Database",
        status: "fail",
        message: `Database probe failed: ${err instanceof Error ? err.message : String(err)}`,
        hint: "Restart the server so the embedded PostgreSQL is (re)started, or point DATABASE_URL at a running instance.",
      });
    }
  }

  // 4. Instance data directory is writable
  const instanceRoot = opts.instanceRoot ?? safeResolveInstanceRoot();
  if (instanceRoot) {
    try {
      await fs.mkdir(instanceRoot, { recursive: true });
      await fs.access(instanceRoot, fs.constants.W_OK);
      checks.push({
        id: "data_dir",
        name: "Data directory",
        status: "pass",
        message: `Writable: ${instanceRoot}`,
      });
    } catch (err) {
      checks.push({
        id: "data_dir",
        name: "Data directory",
        status: "fail",
        message: `Not writable: ${instanceRoot} (${err instanceof Error ? err.message : String(err)})`,
        hint: "Fix permissions on that directory, or set GEETORUS_HOME to a writable location and restart.",
      });
    }
  }

  // 5. Deployment / auth readiness
  if (opts.deploymentMode === "authenticated" && !opts.authReady) {
    checks.push({
      id: "auth",
      name: "Authentication",
      status: "warn",
      message: "Authenticated mode is selected but auth is not ready yet.",
      hint: "Complete auth configuration (BETTER_AUTH_SECRET, base URL) — or use local_trusted mode for a single-machine setup.",
    });
  } else {
    checks.push({
      id: "auth",
      name: "Deployment mode",
      status: "pass",
      message:
        opts.deploymentMode === "local_trusted"
          ? "local_trusted (single machine, no login required)."
          : "authenticated mode is ready.",
    });
  }

  return { status: rollup(checks), checks, generatedAt: new Date().toISOString() };
}

function safeResolveInstanceRoot(): string | null {
  try {
    return resolveGeetorusInstanceRootForAdapter();
  } catch {
    return null;
  }
}
