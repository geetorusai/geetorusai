import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  HONEYCOMB_RUN_HASH_ATTRIBUTE,
  buildHoneycombRunQueryUrl,
  hashGeetorusRunId,
} from "./honeycomb-run-link";

describe("Honeycomb run links", () => {
  it("uses the same 12-character SHA-256 run hash as the tracer", async () => {
    await expect(
      hashGeetorusRunId("abc", webcrypto.subtle as unknown as SubtleCrypto),
    ).resolves.toBe("ba7816bf8f01");
  });

  it("builds an exact task.run query with clickable trace-id breakdowns", () => {
    const url = new URL(buildHoneycombRunQueryUrl("ba7816bf8f01"));
    const query = JSON.parse(url.searchParams.get("query") ?? "null") as {
      calculations: Array<{ op: string }>;
      breakdowns: string[];
      filters: Array<{ column: string; op: string; value: string }>;
    };

    expect(url.origin).toBe("https://ui.honeycomb.io");
    expect(url.pathname).toBe(
      "/geetorus/environments/test/datasets/geetorus/",
    );
    expect(query.calculations).toEqual([{ op: "COUNT" }]);
    expect(query.breakdowns).toEqual(["trace.trace_id"]);
    expect(query.filters).toEqual([
      { column: "service.name", op: "=", value: "geetorus" },
      { column: "name", op: "=", value: "task.run" },
      {
        column: HONEYCOMB_RUN_HASH_ATTRIBUTE,
        op: "=",
        value: "ba7816bf8f01",
      },
    ]);
  });
});
