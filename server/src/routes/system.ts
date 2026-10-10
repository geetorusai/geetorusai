import { Router } from "express";
import type { Db } from "@geetorusai/db";
import type { DeploymentExposure, DeploymentMode } from "@geetorusai/shared";
import { runSystemPreflight } from "../services/system-preflight.js";
import { logger } from "../middleware/logger.js";

export interface SystemRoutesOptions {
  deploymentMode: DeploymentMode;
  deploymentExposure: DeploymentExposure;
  authReady: boolean;
}

/**
 * GET /api/system/preflight
 *
 * Environment readiness for the onboarding wizard: Node version, database +
 * schema, data-dir writability, deployment/auth state. Every non-pass check
 * carries a `hint` with the concrete next step.
 *
 * In `authenticated` mode this is board-only (it names local paths); in
 * `local_trusted` mode (the default single-machine setup, which is where the
 * web wizard runs) it is open to the local board principal.
 */
export function systemRoutes(db: Db | undefined, opts: SystemRoutesOptions): Router {
  const router = Router();

  router.get("/system/preflight", async (req, res) => {
    if (opts.deploymentMode === "authenticated") {
      const actorType = "actor" in req ? (req as { actor?: { type?: string } }).actor?.type : null;
      if (actorType !== "board" && actorType !== "agent") {
        res.status(403).json({ error: "board_access_required" });
        return;
      }
    }
    try {
      const report = await runSystemPreflight(db, {
        deploymentMode: opts.deploymentMode,
        deploymentExposure: opts.deploymentExposure,
        authReady: opts.authReady,
      });
      res.json(report);
    } catch (err) {
      logger.error({ err }, "system preflight failed");
      res.status(500).json({
        status: "fail",
        checks: [
          {
            id: "preflight",
            name: "Preflight",
            status: "fail",
            message: "The readiness check itself failed to run.",
            hint: "Check the server logs.",
          },
        ],
        generatedAt: new Date().toISOString(),
      });
    }
  });

  return router;
}
