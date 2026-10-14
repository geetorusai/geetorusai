import { beforeEach, describe, expect, it } from "vitest";
import { MemoryService } from "../memory-service.js";

describe("MemoryService", () => {
  let memoryService: MemoryService;
  const companyId = "company-memory-test-123";

  beforeEach(() => {
    memoryService = new MemoryService();
  });

  describe("Secret Scrubbing", () => {
    it("scrubs secrets in title and content on createMemory", async () => {
      const apiKeySecret = "sk-ant-api03-abcdef1234567890abcdef1234567890";
      const { memory } = await memoryService.createMemory(companyId, {
        title: `Credentials for deployment with key ${apiKeySecret}`,
        content: `Store secret token ${apiKeySecret} in safe environment variables.`,
      });

      expect(memory.title).not.toContain(apiKeySecret);
      expect(memory.content).not.toContain(apiKeySecret);
      expect(memory.title).toContain("REDACTED");
      expect(memory.content).toContain("REDACTED");
    });

    it("scrubs secrets in updates", async () => {
      const { memory } = await memoryService.createMemory(companyId, {
        title: "Clean title",
        content: "Clean content",
      });

      const updated = await memoryService.updateMemory(companyId, memory.id, {
        content: "New content with token ghp_111122223333444455556666777788889999",
      });

      expect(updated).not.toBeNull();
      expect(updated?.content).not.toContain("ghp_111122223333444455556666777788889999");
      expect(updated?.content).toContain("REDACTED");
    });
  });

  describe("Write Policy Enforcement", () => {
    it("auto-saves proposals when writePolicy is auto_save", async () => {
      await memoryService.updateSettings(companyId, { writePolicy: "auto_save" });

      const res = await memoryService.proposeMemory(companyId, {
        title: "Database Indexing Insight",
        content: "Always index company_id on multi-tenant tables.",
        scope: "company",
        type: "lesson",
      });

      expect(res.status).toBe("saved");
      expect(res.memory).not.toBeNull();
      expect(res.memory?.status).toBe("active");
    });

    it("queues proposals for approval when writePolicy is require_approval", async () => {
      await memoryService.updateSettings(companyId, { writePolicy: "require_approval" });

      const res = await memoryService.proposeMemory(companyId, {
        title: "Proposed Architecture Decision",
        content: "Adopt micro-frontends for partner portal.",
        scope: "project",
        type: "decision",
      });

      expect(res.status).toBe("pending_approval");
      expect(res.memory).not.toBeNull();
      expect(res.memory?.status).toBe("pending_approval");

      // Verify it does NOT show in active list by default
      const activeList = await memoryService.listMemories(companyId, { status: "active" });
      expect(activeList.find((m) => m.id === res.memory?.id)).toBeUndefined();

      // Verify it DOES show in pending_approval review list
      const reviewList = await memoryService.listMemories(companyId, { status: "pending_approval" });
      expect(reviewList.find((m) => m.id === res.memory?.id)).toBeDefined();
    });

    it("rejects proposals when writePolicy is off", async () => {
      await memoryService.updateSettings(companyId, { writePolicy: "off" });

      const res = await memoryService.proposeMemory(companyId, {
        title: "Disabled Memory",
        content: "This should not be saved.",
      });

      expect(res.status).toBe("rejected_by_policy");
      expect(res.memory).toBeNull();
    });
  });

  describe("Review Queue (Approve / Reject)", () => {
    it("approves pending proposal and changes status to active", async () => {
      await memoryService.updateSettings(companyId, { writePolicy: "require_approval" });

      const { memory } = await memoryService.proposeMemory(companyId, {
        title: "Pending Guideline",
        content: "All code must be verified with narrow unit test.",
      });
      expect(memory?.status).toBe("pending_approval");

      const approved = await memoryService.approveMemory(companyId, memory!.id);
      expect(approved?.status).toBe("active");

      const activeList = await memoryService.listMemories(companyId, { status: "active" });
      expect(activeList.find((m) => m.id === memory!.id)).toBeDefined();
    });

    it("rejects proposal and sets status to archived", async () => {
      await memoryService.updateSettings(companyId, { writePolicy: "require_approval" });

      const { memory } = await memoryService.proposeMemory(companyId, {
        title: "Obsolete Rule",
        content: "Run full typecheck on every single keystroke.",
      });

      const rejected = await memoryService.rejectMemory(companyId, memory!.id);
      expect(rejected?.status).toBe("archived");

      const reviewList = await memoryService.listMemories(companyId, { status: "pending_approval" });
      expect(reviewList.find((m) => m.id === memory!.id)).toBeUndefined();
    });
  });

  describe("Duplicate Detection and Merging", () => {
    it("detects near-duplicates when saving similar memories", async () => {
      const original = await memoryService.createMemory(companyId, {
        title: "Vite build assets directory config",
        content: "Ensure output assets directory is ui-dist in root package configuration.",
      });

      const duplicateProposal = await memoryService.createMemory(companyId, {
        title: "Vite build assets directory config",
        content: "Ensure output assets directory is ui-dist in root package configuration.",
      });

      expect(duplicateProposal.duplicates.hasDuplicate).toBe(true);
      expect(duplicateProposal.duplicates.duplicates[0]?.item.id).toBe(original.memory.id);
    });

    it("merges duplicates by superseding duplicate items and updating survivor", async () => {
      const { memory: m1 } = await memoryService.createMemory(companyId, {
        title: "Old PostgreSQL note",
        content: "Port 5432 is used.",
      });
      const { memory: m2 } = await memoryService.createMemory(companyId, {
        title: "New PostgreSQL note",
        content: "Port 5432 with embedded runtime is used.",
      });

      const mergeRes = await memoryService.mergeMemories(companyId, {
        survivorId: m2.id,
        duplicateIds: [m1.id],
        mergedTitle: "Consolidated PostgreSQL note",
        mergedContent: "Port 5432 embedded runtime used across all test harnesses.",
      });

      expect(mergeRes.supersededCount).toBe(1);
      expect(mergeRes.survivor?.title).toBe("Consolidated PostgreSQL note");

      const oldItem = await memoryService.getMemory(companyId, m1.id);
      expect(oldItem?.status).toBe("superseded");
      expect(oldItem?.supersedesId).toBe(m2.id);
    });
  });

  describe("Markdown Import and Export", () => {
    it("imports Markdown text divided by headings and creates searchable items", async () => {
      const markdown = `
## Coding Guidelines
All functions must have proper error handling and input sanitization.

### Deployment Process
Deployments must execute DB migrations before switching traffic.
      `.trim();

      const { importedCount, items } = await memoryService.importMarkdown(companyId, markdown, {
        defaultTags: ["imported", "sop"],
      });

      expect(importedCount).toBe(2);
      expect(items[0]?.title).toBe("Coding Guidelines");
      expect(items[0]?.content).toContain("All functions must have proper error handling");
      expect(items[1]?.title).toBe("Deployment Process");
      expect(items[1]?.tags).toContain("imported");
    });

    it("exports active memories as structured Markdown", async () => {
      await memoryService.createMemory(companyId, {
        title: "Exported Knowledge Item",
        content: "Export verification content.",
        type: "fact",
        tags: ["export-test"],
      });

      const exportedMd = await memoryService.exportMarkdown(companyId);
      expect(exportedMd).toContain("# Geetorus Knowledge Base Export");
      expect(exportedMd).toContain("## [FACT] Exported Knowledge Item");
      expect(exportedMd).toContain("Export verification content.");
      expect(exportedMd).toContain("export-test");
    });
  });

  describe("Run Injection", () => {
    it("injects matching active memories for a task within token budget", async () => {
      await memoryService.createMemory(companyId, {
        title: "Release Procedure",
        content: "Always run npm test before publishing a release.",
        type: "lesson",
        scope: "company",
      });

      const injection = await memoryService.injectMemoriesForRun(
        companyId,
        {
          query: "release procedure and publish steps",
          tokenBudget: 1500,
        },
        "run-test-uuid",
      );

      expect(injection.injectedItems.length).toBeGreaterThan(0);
      expect(injection.formattedContext).toContain("Release Procedure");
      expect(injection.formattedContext).toContain("<memory_context");
      expect(injection.totalTokens).toBeGreaterThan(0);
      expect(injection.totalTokens).toBeLessThan(1500);
    });
  });
});
