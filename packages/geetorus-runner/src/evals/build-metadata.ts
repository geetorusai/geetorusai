import { createHash } from "node:crypto";

import { GEETORUS_RUNNER_COMPATIBILITY } from "../compatibility.js";
import {
  PRP_PROTOCOL_MIN_VERSION,
  PRP_PROTOCOL_NAME,
  PRP_PROTOCOL_VERSION,
} from "../protocol/replay-contract.js";
import { canonicalCapabilitySemanticCatalog } from "../semantic-tools/catalog.js";

export const GEETORUS_RUNNER_BUILD_METADATA_SCHEMA =
  "geetorus-runner/build-metadata/v1" as const;
export const GEETORUS_RUNNER_NATIVE_EXECUTION_SCHEMA =
  "geetorus-runner/native-execution/v1" as const;
export const GEETORUS_RUNNER_EVAL_INTEGRATION_SCHEMA =
  "geetorus-runner/evals-integration/v1" as const;
export const GEETORUS_RUNNERD_BUILD_METADATA_SCHEMA =
  "geetorus-runner/runnerd-build-metadata/v1" as const;

export const GEETORUS_RUNNER_SEMANTIC_CATALOG_SHA256 =
  `sha256:${createHash("sha256")
    .update(canonicalCapabilitySemanticCatalog())
    .digest("hex")}` as const;

/**
 * App-owned release metadata that Evals pins beside every native attempt.
 * Contract versions are independent from package semver so consumers can give
 * a precise mismatch instead of guessing from a package version.
 */
export const GEETORUS_RUNNER_BUILD_METADATA = Object.freeze({
  schema: GEETORUS_RUNNER_BUILD_METADATA_SCHEMA,
  package: Object.freeze({
    name: GEETORUS_RUNNER_COMPATIBILITY.packageName,
    version: GEETORUS_RUNNER_COMPATIBILITY.packageVersion,
  }),
  contracts: Object.freeze({
    evalIntegration: GEETORUS_RUNNER_COMPATIBILITY.components.evalIntegration,
    nativeExecution: GEETORUS_RUNNER_COMPATIBILITY.components.nativeExecution,
    runnerdArtifact: GEETORUS_RUNNER_COMPATIBILITY.components.runnerdBinary,
    prp: PRP_PROTOCOL_VERSION,
    semanticCatalog: GEETORUS_RUNNER_COMPATIBILITY.components.catalog,
    harnessDriver: GEETORUS_RUNNER_COMPATIBILITY.components.harnessDriver,
    controlPlaneAdapter: GEETORUS_RUNNER_COMPATIBILITY.components.controlPlaneAdapter,
    testkit: GEETORUS_RUNNER_COMPATIBILITY.components.testkit,
  }),
  prp: Object.freeze({
    name: PRP_PROTOCOL_NAME,
    minimumVersion: PRP_PROTOCOL_MIN_VERSION,
    maximumVersion: PRP_PROTOCOL_VERSION,
  }),
  semanticCatalog: Object.freeze({
    version: GEETORUS_RUNNER_COMPATIBILITY.components.catalog,
    sha256: GEETORUS_RUNNER_SEMANTIC_CATALOG_SHA256,
  }),
  runnerd: Object.freeze({
    binaryName: "geetorus-runnerd" as const,
    metadataSchema: GEETORUS_RUNNERD_BUILD_METADATA_SCHEMA,
    digestAlgorithm: "sha256" as const,
  }),
});

export type GeetorusRunnerBuildMetadata = typeof GEETORUS_RUNNER_BUILD_METADATA;
