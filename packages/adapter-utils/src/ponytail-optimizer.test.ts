import { describe, expect, it } from "vitest";
import {
  analyzeTaskComplexity,
  deduplicateContextChunks,
  compactExecutionHistory,
  renderPonytailOptimizationMandate,
} from "./ponytail-optimizer.js";

describe("Ponytail Always-On Optimization Engine", () => {
  describe("analyzeTaskComplexity", () => {
    it("identifies simple direct tasks and recommends lightweight verification without modes", () => {
      const analysis = analyzeTaskComplexity("Show me the current git branch name");
      expect(analysis.isSimple).toBe(true);
      expect(analysis.intent).toBe("simple_direct");
      expect(analysis.recommendedVerification).toBe("lightweight");
      expect(analysis.optimizationDirectives.some((d) => d.includes("YAGNI"))).toBe(true);
      expect(analysis.optimizationDirectives.some((d) => d.includes("Direct execution"))).toBe(true);
    });

    it("identifies code modification tasks and applies targeted diff directives", () => {
      const analysis = analyzeTaskComplexity("Refactor the model discovery router to support streaming metrics");
      expect(analysis.isSimple).toBe(false);
      expect(analysis.intent).toBe("code_modification");
      expect(analysis.optimizationDirectives.some((d) => d.includes("Targeted diffs"))).toBe(true);
      expect(analysis.optimizationDirectives.some((d) => d.includes("Audit existing utilities"))).toBe(true);
    });

    it("flags security-sensitive operations for security-gated verification", () => {
      const analysis = analyzeTaskComplexity("Update the RBAC permission check and sanitize auth token headers");
      expect(analysis.isSecuritySensitive).toBe(true);
      expect(analysis.recommendedVerification).toBe("security_gated");
    });

    it("identifies testing tasks and recommends narrow targeted test execution", () => {
      const analysis = analyzeTaskComplexity("Run vitest coverage benchmarks on adapter-utils");
      expect(analysis.intent).toBe("testing_validation");
      expect(analysis.optimizationDirectives.some((d) => d.includes("Narrowest test"))).toBe(true);
    });
  });

  describe("deduplicateContextChunks", () => {
    it("removes duplicated and overlapping instruction blocks to minimize tokens", () => {
      const chunks = [
        "Use standard library primitives over third-party packages.",
        "Always preserve error boundaries on network IO.",
        "Use standard library primitives over third-party packages.", // exact duplicate
        "   Use standard library primitives over third-party packages.   ", // whitespace duplicate
      ];

      const deduplicated = deduplicateContextChunks(chunks);
      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0]).toBe("Use standard library primitives over third-party packages.");
      expect(deduplicated[1]).toBe("Always preserve error boundaries on network IO.");
    });
  });

  describe("compactExecutionHistory", () => {
    it("compacts raw history turns into a structured summary ledger", () => {
      const history = [
        { action: "grep_search", outcome: "Found 2 matching files in src/routes" },
        { action: "replace_file_content", outcome: "Applied targeted diff cleanly" },
        { action: "run_command", error: "Connection timeout on port 54329" },
      ];

      const compacted = compactExecutionHistory(history);
      expect(compacted).toContain("### Compact Execution State");
      expect(compacted).toContain("Step 1 (grep_search): OK: Found 2 matching files");
      expect(compacted).toContain("Step 2 (replace_file_content): OK: Applied targeted diff cleanly");
      expect(compacted).toContain("Step 3 (run_command): FAILED: Connection timeout");
    });

    it("returns empty string when no history is present", () => {
      expect(compactExecutionHistory([])).toBe("");
    });
  });

  describe("renderPonytailOptimizationMandate", () => {
    it("renders canonical 5-step Decision Ladder without artificial modes", () => {
      const mandate = renderPonytailOptimizationMandate();
      expect(mandate).toContain("Ponytail Always-On Optimization Directive");
      expect(mandate).toContain("1. YAGNI");
      expect(mandate).toContain("2. Audit Before Authoring");
      expect(mandate).toContain("3. Native-First");
      expect(mandate).toContain("4. Clean & Direct");
      expect(mandate).toContain("5. Minimal Code & Diffs");
      expect(mandate).not.toContain("lite");
      expect(mandate).not.toContain("ultra");
    });
  });
});
