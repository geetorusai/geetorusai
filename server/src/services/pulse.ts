import {
  heartbeatService,
  resolveHeartbeatSchedulingSuppression,
  type HeartbeatServiceOptions,
} from "./heartbeat.js";

export type PulseServiceOptions = HeartbeatServiceOptions;

/**
 * Pulse service is the canonical name for the agent execution engine (formerly heartbeatService).
 * Delegates directly to heartbeatService for backward compatibility and gradual migration.
 */
export const pulseService = heartbeatService;
export const resolvePulseSchedulingSuppression = resolveHeartbeatSchedulingSuppression;
