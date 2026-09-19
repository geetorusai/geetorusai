import { afterEach, describe, expect, it } from "vitest";
import { buildGeetorusEnv } from "../adapters/utils.js";

const ORIGINAL_GEETORUS_RUNTIME_API_URL = process.env.GEETORUS_RUNTIME_API_URL;
const ORIGINAL_GEETORUS_API_URL = process.env.GEETORUS_API_URL;
const ORIGINAL_GEETORUS_LISTEN_HOST = process.env.GEETORUS_LISTEN_HOST;
const ORIGINAL_GEETORUS_LISTEN_PORT = process.env.GEETORUS_LISTEN_PORT;
const ORIGINAL_HOST = process.env.HOST;
const ORIGINAL_PORT = process.env.PORT;

afterEach(() => {
  if (ORIGINAL_GEETORUS_RUNTIME_API_URL === undefined) delete process.env.GEETORUS_RUNTIME_API_URL;
  else process.env.GEETORUS_RUNTIME_API_URL = ORIGINAL_GEETORUS_RUNTIME_API_URL;

  if (ORIGINAL_GEETORUS_API_URL === undefined) delete process.env.GEETORUS_API_URL;
  else process.env.GEETORUS_API_URL = ORIGINAL_GEETORUS_API_URL;

  if (ORIGINAL_GEETORUS_LISTEN_HOST === undefined) delete process.env.GEETORUS_LISTEN_HOST;
  else process.env.GEETORUS_LISTEN_HOST = ORIGINAL_GEETORUS_LISTEN_HOST;

  if (ORIGINAL_GEETORUS_LISTEN_PORT === undefined) delete process.env.GEETORUS_LISTEN_PORT;
  else process.env.GEETORUS_LISTEN_PORT = ORIGINAL_GEETORUS_LISTEN_PORT;

  if (ORIGINAL_HOST === undefined) delete process.env.HOST;
  else process.env.HOST = ORIGINAL_HOST;

  if (ORIGINAL_PORT === undefined) delete process.env.PORT;
  else process.env.PORT = ORIGINAL_PORT;
});

describe("buildGeetorusEnv", () => {
  it("prefers an explicit GEETORUS_API_URL override over the derived runtime URL", () => {
    process.env.GEETORUS_RUNTIME_API_URL = "http://203.0.113.42:3102";
    process.env.GEETORUS_API_URL = "http://localhost:4100";
    process.env.GEETORUS_LISTEN_HOST = "127.0.0.1";
    process.env.GEETORUS_LISTEN_PORT = "3101";

    const env = buildGeetorusEnv({ id: "agent-1", companyId: "company-1" });

    expect(env.GEETORUS_API_URL).toBe("http://localhost:4100");
  });

  it("falls back to GEETORUS_RUNTIME_API_URL when no explicit override is set", () => {
    process.env.GEETORUS_RUNTIME_API_URL = "http://203.0.113.42:3102";
    delete process.env.GEETORUS_API_URL;
    process.env.GEETORUS_LISTEN_HOST = "127.0.0.1";
    process.env.GEETORUS_LISTEN_PORT = "3101";

    const env = buildGeetorusEnv({ id: "agent-1", companyId: "company-1" });

    expect(env.GEETORUS_API_URL).toBe("http://203.0.113.42:3102");
  });

  it("falls back to GEETORUS_API_URL when no runtime URL is configured", () => {
    delete process.env.GEETORUS_RUNTIME_API_URL;
    process.env.GEETORUS_API_URL = "http://localhost:4100";
    process.env.GEETORUS_LISTEN_HOST = "127.0.0.1";
    process.env.GEETORUS_LISTEN_PORT = "3101";

    const env = buildGeetorusEnv({ id: "agent-1", companyId: "company-1" });

    expect(env.GEETORUS_API_URL).toBe("http://localhost:4100");
  });

  it("uses runtime listen host/port when explicit URL is not set", () => {
    delete process.env.GEETORUS_RUNTIME_API_URL;
    delete process.env.GEETORUS_API_URL;
    process.env.GEETORUS_LISTEN_HOST = "0.0.0.0";
    process.env.GEETORUS_LISTEN_PORT = "3101";
    process.env.PORT = "3100";

    const env = buildGeetorusEnv({ id: "agent-1", companyId: "company-1" });

    expect(env.GEETORUS_API_URL).toBe("http://localhost:3101");
  });

  it("formats IPv6 hosts safely in fallback URL generation", () => {
    delete process.env.GEETORUS_RUNTIME_API_URL;
    delete process.env.GEETORUS_API_URL;
    process.env.GEETORUS_LISTEN_HOST = "::1";
    process.env.GEETORUS_LISTEN_PORT = "3101";

    const env = buildGeetorusEnv({ id: "agent-1", companyId: "company-1" });

    expect(env.GEETORUS_API_URL).toBe("http://[::1]:3101");
  });
});
