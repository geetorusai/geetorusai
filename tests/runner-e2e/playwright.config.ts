import path from "node:path";
import { defineConfig } from "@playwright/test";
import {
  runnerE2EWebServerCommand,
  runnerE2EWebServerGracefulShutdown,
} from "./web-server-command.js";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const port = Number(required("GEETORUS_RUNNER_E2E_PORT"));
const temporaryRoot = required("GEETORUS_RUNNER_E2E_TEMP_ROOT");
const privateDir = required("GEETORUS_RUNNER_E2E_PRIVATE_DIR");
const geetorusHome = required("GEETORUS_HOME");
const configPath = required("GEETORUS_CONFIG");
const baseURL = `http://127.0.0.1:${port}`;
const playwrightChannel = process.env.GEETORUS_PLAYWRIGHT_CHANNEL?.trim();
const chromiumExecutable =
  process.env.GEETORUS_RUNNER_E2E_CHROMIUM_EXECUTABLE?.trim();
if (playwrightChannel && chromiumExecutable) {
  throw new Error(
    "GEETORUS_PLAYWRIGHT_CHANNEL and GEETORUS_RUNNER_E2E_CHROMIUM_EXECUTABLE are mutually exclusive",
  );
}
if (chromiumExecutable && !path.isAbsolute(chromiumExecutable)) {
  throw new Error(
    "GEETORUS_RUNNER_E2E_CHROMIUM_EXECUTABLE must be an absolute path",
  );
}
required("GEETORUS_INSTANCE_ID");
required("GEETORUS_AGENT_JWT_SECRET");
required("GEETORUS_DECISION_SIGNING_SECRET");
required("GEETORUS_TOOL_ACTION_SIGNING_SECRET");
required("BETTER_AUTH_SECRET");
if (
  !geetorusHome.startsWith(`${temporaryRoot}${path.sep}`) ||
  !configPath.startsWith(`${temporaryRoot}${path.sep}`)
) {
  throw new Error("Geetorus server paths escape the isolated temporary root");
}
const repositoryRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig({
  testDir: ".",
  testMatch: "runner.spec.ts",
  timeout: Number(process.env.GEETORUS_RUNNER_E2E_TEST_TIMEOUT_MS ?? 600_000),
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    browserName: "chromium",
    ...(playwrightChannel ? { channel: playwrightChannel } : {}),
    ...(chromiumExecutable
      ? { launchOptions: { executablePath: chromiumExecutable } }
      : {}),
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    // A developer-supplied system Chromium keeps the local smoke loop
    // installation-free; CI's managed browser retains failure video as usual.
    video: chromiumExecutable ? "off" : "retain-on-failure",
  },
  webServer: {
    // Do not put an env object here: Playwright serializes webServer config in
    // blob reports. The wrapper inherits the test process and strips provider
    // keys before spawning the real Geetorus process.
    command: runnerE2EWebServerCommand(repositoryRoot),
    gracefulShutdown: runnerE2EWebServerGracefulShutdown,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  outputDir: path.join(privateDir, "playwright-output"),
  reporter: [
    ["list"],
    ["blob", { outputDir: path.join(privateDir, "blob-report") }],
    ["junit", { outputFile: path.join(privateDir, "junit.xml") }],
    [
      "html",
      { open: "never", outputFolder: path.join(privateDir, "html-report") },
    ],
  ],
});
