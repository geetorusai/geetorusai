import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { runSystemPreflight } from "../services/system-preflight.js";
import { systemRoutes } from "../routes/system.js";

describe("runSystemPreflight", () => {
  it("returns report with expected checks when db is undefined", async () => {
    const report = await runSystemPreflight(undefined, {
      deploymentMode: "local_trusted",
      deploymentExposure: "private",
      authReady: true,
    });

    expect(report.generatedAt).toBeDefined();
    expect(report.status).toBe("fail"); // db is undefined -> fail
    const dbCheck = report.checks.find((c) => c.id === "database");
    expect(dbCheck).toBeDefined();
    expect(dbCheck?.status).toBe("fail");
    expect(dbCheck?.hint).toContain("DATABASE_URL");

    const nodeCheck = report.checks.find((c) => c.id === "node");
    expect(nodeCheck).toBeDefined();
    expect(nodeCheck?.status).toBe("pass");

    const authCheck = report.checks.find((c) => c.id === "auth");
    expect(authCheck?.status).toBe("pass");
  });

  it("warns with actionable hint when deploymentMode is authenticated but auth is not ready", async () => {
    const report = await runSystemPreflight(undefined, {
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      authReady: false,
    });

    const authCheck = report.checks.find((c) => c.id === "auth");
    expect(authCheck).toBeDefined();
    expect(authCheck?.status).toBe("warn");
    expect(authCheck?.hint).toContain("BETTER_AUTH_SECRET");
  });

  it("every non-pass check has a hint", async () => {
    const report = await runSystemPreflight(undefined, {
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      authReady: false,
    });

    for (const check of report.checks) {
      if (check.status !== "pass") {
        expect(check.hint).toBeDefined();
        expect(check.hint?.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("systemRoutes", () => {
  it("GET /system/preflight returns preflight report in local_trusted mode", async () => {
    const app = express();
    app.use(
      "/api",
      systemRoutes(undefined, {
        deploymentMode: "local_trusted",
        deploymentExposure: "private",
        authReady: true,
      }),
    );

    const res = await request(app).get("/api/system/preflight");
    expect(res.status).toBe(200);
    expect(res.body.status).toBeDefined();
    expect(Array.isArray(res.body.checks)).toBe(true);
    expect(res.body.checks.length).toBeGreaterThanOrEqual(3);
  });

  it("GET /system/preflight requires board/agent actor in authenticated mode", async () => {
    const app = express();
    app.use(
      "/api",
      systemRoutes(undefined, {
        deploymentMode: "authenticated",
        deploymentExposure: "private",
        authReady: true,
      }),
    );

    const res = await request(app).get("/api/system/preflight");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("board_access_required");
  });
});
