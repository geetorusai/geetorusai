/**
 * Development shim for the package-local runner runtime.
 *
 * Source-mode server entry points do not build workspace dependencies first,
 * so this shim loads the package source through the TypeScript runtime. The
 * server build replaces the emitted shim with the package's compiled `dist`
 * tree so published server packages have no workspace runtime dependency.
 * Keep server imports pointed at this relative boundary.
 */
type RunnerModule = typeof import("@geetorusai/geetorus-runner");

export type {
  GeetorusJsonValue,
  GeetorusQuestionResponse,
  GeetorusSemanticActionBinding,
  GeetorusSemanticActionId,
  GeetorusSemanticAuthorizationRecord,
  GeetorusSemanticRunContext,
  GeetorusSemanticToolCall,
  GeetorusSemanticToolDefinition,
  GeetorusSemanticToolResult,
  GeetorusRunnerAuthorizedToolSet,
  GeetorusQuestionSet,
  GeetorusRuntimeInputRequest,
  CompleteControlPlaneRunInput,
  ControlPlanePort,
  HarnessRuntimeRequestKind,
  HarnessRuntimeRequestResolution,
  NativeAcpxAgent,
  NativeAcpxPermissionMode,
  NativeCodexApprovalPolicy,
  NativeExecutionInput,
  NativeExecutionInputV4,
  NativeInteractionResponseEnvelope,
  NativeOpenCodePermissionMode,
  NativePlanningContext,
  NativeRunEvent,
  NativeRunResult,
  NativeRuntimeAssetReference,
  NativeRuntimeContextSnapshot,
  NativeSession,
  NativeSessionBackend,
  NativeSessionGoalControl,
  OpenControlPlaneRunInput,
  PersistedNativeSession,
  PrpEvent,
  PrpIgnoredAttentionRequest,
  PrpNormalizedAttentionRequest,
  PrpStructuredRunResult,
  PrpTerminalState,
  PrpVerificationReasonCode,
  PrpWireConnection,
  ReplayControlPlaneEventsInput,
  RunnerProcessHandle,
  RunnerProcessLaunchSpec,
  StrictCompletionContractInput,
  TransportCloseReason,
} from "@geetorusai/geetorus-runner";
export type DurablePrpControlPlane =
  import("@geetorusai/geetorus-runner").DurablePrpControlPlane;
export type GeetorusSemanticDispatcher =
  import("@geetorusai/geetorus-runner").GeetorusSemanticDispatcher;

const sourceUrl = new URL(
  "../../../../packages/geetorus-runner/src/index.ts",
  import.meta.url,
);
const runner = (await import(sourceUrl.href)) as RunnerModule;

export const DurablePrpControlPlane = runner.DurablePrpControlPlane;
export const inspectWarmRunTransition = runner.inspectWarmRunTransition;
export const readRunnerdArtifactBinding = runner.readRunnerdArtifactBinding;
export const NativeSessionCleanupQuarantinedError =
  runner.NativeSessionCleanupQuarantinedError;
export const NativeSessionProtocolIntegrityError =
  runner.NativeSessionProtocolIntegrityError;
export const GeetorusSemanticDispatcher = runner.GeetorusSemanticDispatcher;
export const CAPABILITY_SEMANTIC_TOOL_CATALOG =
  runner.CAPABILITY_SEMANTIC_TOOL_CATALOG;
export const HarnessRuntimeRequestResolutionError =
  runner.HarnessRuntimeRequestResolutionError;
export const NATIVE_RUNTIME_ASSET_SCHEMA = runner.NATIVE_RUNTIME_ASSET_SCHEMA;
export const GEETORUS_EXECUTION_PROMPT = runner.GEETORUS_EXECUTION_PROMPT;
export const GEETORUS_EXECUTION_PROMPT_REVISION =
  runner.GEETORUS_EXECUTION_PROMPT_REVISION;
export const acpxRuntimeSessionDirectoryName =
  runner.acpxRuntimeSessionDirectoryName;
export const canonicalNativeRuntimeContextDigest =
  runner.canonicalNativeRuntimeContextDigest;
export const createNativeSessionBackend = runner.createNativeSessionBackend;
export const createGeetorusRunnerAuthorizedToolSet =
  runner.createGeetorusRunnerAuthorizedToolSet;
export const createRunnerdCodexTransport: (
  options?: import("@geetorusai/geetorus-runner").RunnerdCodexTransportOptions,
) => import("@geetorusai/geetorus-runner").RunnerdCodexTransport =
  runner.createRunnerdCodexTransport;
export const defaultCapabilityRunnerdBinary =
  runner.defaultCapabilityRunnerdBinary;
export const executeNativeSession = runner.executeNativeSession;
export const applyNativeSessionGoalControl =
  runner.applyNativeSessionGoalControl;
export const completeRetainedNativeSessionCleanup = runner.completeRetainedNativeSessionCleanup;
export const settleRetainedRunnerdSession = runner.settleRetainedRunnerdSession;
export const retainedRunnerdMaintenanceIsIdle =
  runner.retainedRunnerdMaintenanceIsIdle;
export const drainRetainedRunnerdMaintenanceOperations =
  runner.drainRetainedRunnerdMaintenanceOperations;
export const nativeRuntimePromptDigest = runner.nativeRuntimePromptDigest;
export const normalizePrpResultSignals = runner.normalizePrpResultSignals;
export const parseCodexTurnDiff = runner.parseCodexTurnDiff;
export const parseHarnessRuntimeRequestResolution =
  runner.parseHarnessRuntimeRequestResolution;
export const parseNativeExecutionInput = runner.parseNativeExecutionInput;
export const parseNativeRuntimeContext = runner.parseNativeRuntimeContext;
export const parseGeetorusQuestionSet = runner.parseGeetorusQuestionSet;
export const parseGeetorusQuestionResponse =
  runner.parseGeetorusQuestionResponse;
export const resolveQualifiedAcpxProfile = runner.resolveQualifiedAcpxProfile;
export const resolveSourceCodexHome = runner.resolveSourceCodexHome;
export const validatePrpEvent = runner.validatePrpEvent;
export const validatePrpStructuredRunResult =
  runner.validatePrpStructuredRunResult;

export const NativeProviderTerminalFailure = runner.NativeProviderTerminalFailure;

export const completeTerminatedRemoteNativeSessionCleanup = runner.completeTerminatedRemoteNativeSessionCleanup;
export const completeTerminatedLocalNativeSessionCleanup = runner.completeTerminatedLocalNativeSessionCleanup;
