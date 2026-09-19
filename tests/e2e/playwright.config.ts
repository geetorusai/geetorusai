import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

// Use a dedicated port so e2e tests always start their own server in local_trusted mode,
// even when the dev server is running on :3100 in authenticated mode.
const PORT = Number(process.env.GEETORUS_E2E_PORT ?? 3199);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const GEETORUS_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "geetorus-e2e-home-"));
const GEETORUS_INSTANCE_ID = "playwright-e2e";
const GEETORUS_CONFIG = path.join(GEETORUS_HOME, "instances", GEETORUS_INSTANCE_ID, "config.json");
const GEETORUS_AGENT_JWT_SECRET = process.env.GEETORUS_AGENT_JWT_SECRET ?? "playwright-e2e-agent-jwt-secret";
const GEETORUS_DECISION_SIGNING_SECRET =
  process.env.GEETORUS_DECISION_SIGNING_SECRET ?? "playwright-e2e-decision-signing-secret";
const GEETORUS_TOOL_ACTION_SIGNING_SECRET =
  process.env.GEETORUS_TOOL_ACTION_SIGNING_SECRET ?? "playwright-e2e-tool-action-signing-secret";
const PLAYWRIGHT_CHANNEL = process.env.GEETORUS_PLAYWRIGHT_CHANNEL;

process.env.GEETORUS_HOME = GEETORUS_HOME;
process.env.GEETORUS_CONFIG = GEETORUS_CONFIG;
// Worker processes reload this config; retain the main process's server path
// for specs that seed historical database state in the throwaway instance.
process.env.GEETORUS_E2E_SERVER_CONFIG ??= GEETORUS_CONFIG;
// Specs that mint agent JWTs in-process (via createLocalAgentJwt) must derive
// the same per-instance signing key as the webServer, or verification fails
// with a 401 instead of authenticating as the agent.
process.env.GEETORUS_INSTANCE_ID = GEETORUS_INSTANCE_ID;
process.env.GEETORUS_AGENT_JWT_SECRET = GEETORUS_AGENT_JWT_SECRET;
process.env.GEETORUS_DECISION_SIGNING_SECRET = GEETORUS_DECISION_SIGNING_SECRET;
process.env.GEETORUS_TOOL_ACTION_SIGNING_SECRET = GEETORUS_TOOL_ACTION_SIGNING_SECRET;

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  // These suites target dedicated multi-user configurations/ports and are
  // intentionally not part of the default local_trusted e2e run.
  testIgnore: ["in-feed-native/**", "multi-user.spec.ts", "multi-user-authenticated.spec.ts"],
  timeout: 60_000,
  retries: 0,
  // All specs share one throwaway server, and several toggle instance-level
  // state (the `enableConferenceRoomChat` experimental flag) that changes
  // which UI variant renders. Run files serially so a flag flip in one spec
  // can't change the wizard/thread under another spec mid-flight.
  workers: 1,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        ...(PLAYWRIGHT_CHANNEL ? { channel: PLAYWRIGHT_CHANNEL } : {}),
      },
    },
  ],
  // The webServer directive bootstraps a throwaway instance and then starts it.
  // `onboard --yes --run` works in a non-interactive temp GEETORUS_HOME.
  webServer: {
    command: `pnpm geetorusai onboard --yes --run`,
    url: `${BASE_URL}/api/health`,
    // Always boot a dedicated throwaway instance for e2e so browser tests
    // never attach to the developer's active Geetorus home/server.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "test",
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${path.resolve(import.meta.dirname, "fixtures/agent-chat-github.mjs")}`,
      PORT: String(PORT),
      GEETORUS_OPEN_ON_LISTEN: "false",
      GEETORUS_API_URL: BASE_URL,
      GEETORUS_HOME,
      GEETORUS_INSTANCE_ID,
      GEETORUS_CONFIG,
      GEETORUS_AGENT_JWT_SECRET,
      GEETORUS_DECISION_SIGNING_SECRET,
      GEETORUS_TOOL_ACTION_SIGNING_SECRET,
      GEETORUS_BIND: "loopback",
      GEETORUS_DEPLOYMENT_MODE: "local_trusted",
      GEETORUS_DEPLOYMENT_EXPOSURE: "private",
    },
  },
  outputDir: "./test-results",
  reporter: [["list"], ["html", { open: "never", outputFolder: "./playwright-report" }]],
});
