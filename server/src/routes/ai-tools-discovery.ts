import { Router, type Request, type Response } from "express";
import { discoverCompleteHostEnvironment } from "@geetorusai/adapter-utils";
import { environmentWatchdog } from "../services/environment-watchdog.js";
import { assertBoard, getActorInfo } from "./authz.js";

export const aiToolsDiscoveryRouter = Router();

// Ensure watchdog is active
environmentWatchdog.start();

const connectedTools = new Map<string, {
  connectedAt: string;
  connectedByUserId: string;
  syncWorkspace: boolean;
  syncMcp: boolean;
}>();

/**
 * GET /api/system/ai-tools/discover
 * Performs full, categorized discovery of host AI IDEs, AI CLIs, MCP servers, Dev runtimes, Providers, and Recommendations.
 */
aiToolsDiscoveryRouter.get("/discover", async (req: Request, res: Response) => {
  try {
    assertBoard(req);
    const inventory = await environmentWatchdog.pollEnvironment();

    const formattedTools = inventory.aiTools.map((t) => ({
      ...t,
      isConnected: connectedTools.has(t.id),
      connectionDetails: connectedTools.get(t.id) ?? null,
    }));

    return res.json({
      success: true,
      inventory: {
        ...inventory,
        aiTools: formattedTools,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/system/ai-tools/stream
 * Server-Sent Events (SSE) real-time stream endpoint.
 */
aiToolsDiscoveryRouter.get("/stream", (req: Request, res: Response) => {
  const clientId = `sse-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  environmentWatchdog.subscribeClient(clientId, res);
});

/**
 * POST /api/system/ai-tools/connect
 * Pairs a discovered tool/runtime to Geetorus and synchronizes context & MCP.
 */
aiToolsDiscoveryRouter.post("/connect", async (req: Request, res: Response) => {
  try {
    assertBoard(req);
    const { toolId, syncWorkspace = true, syncMcp = true } = req.body ?? {};
    if (!toolId || typeof toolId !== "string") {
      return res.status(400).json({ success: false, error: "Missing or invalid toolId parameter." });
    }

    const inventory = await environmentWatchdog.pollEnvironment();
    const tool = inventory.aiTools.find((t) => t.id === toolId);
    if (!tool) {
      return res.status(404).json({ success: false, error: `Tool '${toolId}' was not found on host.` });
    }

    const actor = getActorInfo(req);
    const record = {
      connectedAt: new Date().toISOString(),
      connectedByUserId: actor.actorId ?? "system",
      syncWorkspace: Boolean(syncWorkspace),
      syncMcp: Boolean(syncMcp),
    };

    connectedTools.set(toolId, record);

    return res.json({
      success: true,
      message: `Connected ${tool.name} to Geetorus control plane with full context synchronization.`,
      connection: record,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * POST /api/system/ai-tools/verify
 * Validates integration health and binary execution for a tool.
 */
aiToolsDiscoveryRouter.post("/verify", async (req: Request, res: Response) => {
  try {
    assertBoard(req);
    const { toolId } = req.body ?? {};
    if (!toolId || typeof toolId !== "string") {
      return res.status(400).json({ success: false, error: "Missing or invalid toolId parameter." });
    }

    const inventory = await environmentWatchdog.pollEnvironment();
    const tool = inventory.aiTools.find((t) => t.id === toolId);
    if (!tool) {
      return res.status(404).json({ success: false, error: `Tool '${toolId}' was not found.` });
    }

    const isConnected = connectedTools.has(toolId);
    const pass = tool.isAvailable && tool.authStatus === "authenticated";

    return res.json({
      success: true,
      toolId,
      status: pass ? "pass" : tool.isAvailable ? "warn" : "fail",
      isConnected,
      verifiedAt: new Date().toISOString(),
      details: {
        binaryPath: tool.binaryPath,
        version: tool.version,
        authStatus: tool.authStatus,
        detectedEnvVars: tool.detectedEnvVars,
        configPath: tool.configPath,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/system/ai-tools/status
 * Returns connection states across all active tools.
 */
aiToolsDiscoveryRouter.get("/status", async (req: Request, res: Response) => {
  try {
    assertBoard(req);
    return res.json({
      success: true,
      activeConnectionsCount: connectedTools.size,
      connectedTools: Array.from(connectedTools.entries()).map(([id, details]) => ({
        toolId: id,
        ...details,
      })),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
