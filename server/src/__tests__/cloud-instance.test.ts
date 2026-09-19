import { describe, expect, it } from "vitest";
import {
  getCloudStackContext,
  isCloudManagedInstance,
  type CloudInstanceEnv,
} from "../services/cloud-instance.js";

describe("isCloudManagedInstance", () => {
  it("unifies both prior signals without weakening either restrictive floor", () => {
    const cases: CloudInstanceEnv[] = [
      {},
      { GEETORUS_CLOUD_TENANT_SERVER_TOKEN: "tenant-token" },
      { GEETORUS_MANAGED_CONFIG: "" },
      {
        GEETORUS_CLOUD_TENANT_SERVER_TOKEN: "tenant-token",
        GEETORUS_MANAGED_CONFIG: "managed-document",
      },
    ];

    for (const env of cases) {
      const priorTokenFloor = Boolean(env.GEETORUS_CLOUD_TENANT_SERVER_TOKEN?.trim());
      const priorManagedConfigFloor = env.GEETORUS_MANAGED_CONFIG !== undefined;
      const canonicalFloor = isCloudManagedInstance(env);

      expect(canonicalFloor).toBe(priorTokenFloor || priorManagedConfigFloor);
      expect(canonicalFloor || !priorTokenFloor).toBe(true);
      expect(canonicalFloor || !priorManagedConfigFloor).toBe(true);
    }
  });

  it("does not treat a blank tenant token alone as a managed signal", () => {
    expect(isCloudManagedInstance({ GEETORUS_CLOUD_TENANT_SERVER_TOKEN: "   " })).toBe(false);
  });
});

describe("getCloudStackContext", () => {
  it("returns null outside Geetorus Cloud even when stray stack metadata exists", () => {
    expect(getCloudStackContext({ GEETORUS_STACK_SLUG: "stray-stack" })).toBeNull();
  });

  it("returns normalized provisioner metadata for cloud instances", () => {
    expect(getCloudStackContext({
      GEETORUS_CLOUD_TENANT_SERVER_TOKEN: "tenant-token",
      GEETORUS_CLOUD_STACK_ID: " stack-1 ",
      GEETORUS_STACK_SLUG: " acme ",
      GEETORUS_CLOUD_ACCOUNT_GROUP_ID: " account-group-1 ",
      GEETORUS_PRIMARY_HOST: " acme.geetorus.app ",
      GEETORUS_CLOUD_API_ORIGIN: " https://app.geetorus.app ",
    })).toEqual({
      stackId: "stack-1",
      stackSlug: "acme",
      accountGroupId: "account-group-1",
      primaryHost: "acme.geetorus.app",
      cloudOrigin: "https://app.geetorus.app",
    });
  });

  it("represents missing managed metadata explicitly without failing health checks", () => {
    expect(getCloudStackContext({ GEETORUS_MANAGED_CONFIG: "managed-document" })).toEqual({
      stackId: null,
      stackSlug: null,
      accountGroupId: null,
      primaryHost: null,
      cloudOrigin: null,
    });
  });
});
