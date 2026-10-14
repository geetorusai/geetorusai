// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollaborativeExecutionDashboard } from "./CollaborativeExecutionDashboard";
import type { CollaborationWorkflow } from "@geetorusai/shared";

const mockCollaborationApi = vi.hoisted(() => ({
  getWorkflow: vi.fn(),
  startWorkflow: vi.fn(),
  pauseWorkflow: vi.fn(),
  resumeWorkflow: vi.fn(),
  cancelWorkflow: vi.fn(),
  planWorkflow: vi.fn(),
  completeSubtask: vi.fn(),
  retrySubtask: vi.fn(),
  reassignSubtask: vi.fn(),
  analyzeTask: vi.fn(),
}));

vi.mock("../api/collaboration", () => ({
  collaborationApi: mockCollaborationApi,
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("CollaborativeExecutionDashboard", () => {
  let container: HTMLDivElement;
  let queryClient: QueryClient;

  const mockWorkflow: CollaborationWorkflow = {
    id: "wf-123",
    companyId: "comp-1",
    parentIssueId: "issue-1",
    strategy: "multi_agent_collaborative",
    status: "in_progress",
    concurrencyLimit: 4,
    totalEstimatedCostUsd: 12.5,
    totalTokensUsed: 45000,
    subtasks: [
      {
        id: "sub-1",
        title: "Architecture and Schema Plan",
        description: "Plan component breakdown and database schemas.",
        role: "planner",
        status: "completed",
        requiredSkills: ["architecture_design"],
        dependencies: [],
        targetFiles: ["doc/plans/spec.md"],
        acceptanceCriteria: ["Specs written"],
        assignedAgentId: "agent-1",
        assignedAgentName: "Marcus CTO",
        assignedAgentRole: "cto",
        assignedModel: "claude-3-7-sonnet",
        subtaskIssueId: null,
        startedAt: "2026-10-12T10:00:00Z",
        completedAt: "2026-10-12T10:15:00Z",
        error: null,
        retryCount: 0,
        outputNotes: "Architecture blueprint created.",
        tokenUsage: { inputTokens: 5000, outputTokens: 2000, totalTokens: 7000 },
        estimatedTokens: 8000,
      },
      {
        id: "sub-2",
        title: "Backend Core Logic Implementation",
        description: "Implement API endpoints and services.",
        role: "implementer",
        status: "in_progress",
        requiredSkills: ["backend_development"],
        dependencies: ["sub-1"],
        targetFiles: ["server/src/routes/api.ts"],
        acceptanceCriteria: ["Endpoints working"],
        assignedAgentId: "agent-2",
        assignedAgentName: "Alex Dev",
        assignedAgentRole: "senior-coder",
        assignedModel: "claude-3-7-sonnet",
        subtaskIssueId: null,
        startedAt: "2026-10-12T10:16:00Z",
        completedAt: null,
        error: null,
        retryCount: 0,
        outputNotes: null,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        estimatedTokens: 25000,
      },
      {
        id: "sub-3",
        title: "Automated QA Verification",
        description: "Run test suites and report edge cases.",
        role: "tester",
        status: "blocked",
        requiredSkills: ["testing_and_qa"],
        dependencies: ["sub-2"],
        targetFiles: ["tests/"],
        acceptanceCriteria: ["Tests passing"],
        assignedAgentId: "agent-3",
        assignedAgentName: "Riley QA",
        assignedAgentRole: "qa",
        assignedModel: "gemini-2.0-flash",
        subtaskIssueId: null,
        startedAt: null,
        completedAt: null,
        error: null,
        retryCount: 0,
        outputNotes: null,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        estimatedTokens: 12000,
      },
    ],
    sharedContext: {
      architecturalNotes: ["Use Drizzle ORM and transactional mutations."],
      sharedSchemasAndContracts: {},
      fileLocks: {
        "server/src/routes/api.ts": {
          agentId: "agent-2",
          subtaskId: "sub-2",
          lockedAt: "2026-10-12T10:16:00Z",
        },
      },
      findings: [],
      blockers: [],
    },
    verification: null,
    finalConsolidatedOutput: null,
    logs: [
      {
        id: "log-1",
        timestamp: "2026-10-12T10:00:00Z",
        agentId: null,
        agentName: "Orchestrator",
        role: "orchestrator",
        level: "info",
        message: "Multi-agent collaborative workflow initiated.",
      },
    ],
    createdAt: "2026-10-12T10:00:00Z",
    updatedAt: "2026-10-12T10:16:00Z",
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData(["issues", "collaboration", "issue-1"], mockWorkflow);
    mockCollaborationApi.getWorkflow.mockResolvedValue(mockWorkflow);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  function renderDashboard() {
    const root = createRoot(container);
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CollaborativeExecutionDashboard
            companyId="comp-1"
            issueId="issue-1"
            issueTitle="Multi-Agent Task"
          />
        </QueryClientProvider>,
      );
    });
    return root;
  }

  it("renders workflow header, metrics cards, and subtasks list", async () => {
    const root = renderDashboard();
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Collaborative Multi-Agent Execution");
    expect(container.textContent).toContain("in_progress");
    expect(container.textContent).toContain("Architecture and Schema Plan");
    expect(container.textContent).toContain("Backend Core Logic Implementation");
    expect(container.textContent).toContain("Automated QA Verification");

    // Agent assignments
    expect(container.textContent).toContain("Marcus CTO");
    expect(container.textContent).toContain("Alex Dev");
    expect(container.textContent).toContain("Riley QA");

    // Progress metrics
    expect(container.textContent).toContain("1 / 3");

    act(() => {
      root.unmount();
    });
  });

  it("switches to Shared Workspace & Contracts tab and displays active file locks", async () => {
    const root = renderDashboard();
    await act(async () => {
      await Promise.resolve();
    });

    const contextTab = container.querySelector("#tab-context") as HTMLButtonElement;
    expect(contextTab).not.toBeNull();

    act(() => {
      contextTab.click();
    });

    expect(container.textContent).toContain("File Locks & Collision Prevention");
    expect(container.textContent).toContain("server/src/routes/api.ts");
    expect(container.textContent).toContain("Use Drizzle ORM");

    act(() => {
      root.unmount();
    });
  });

  it("switches to Live Activity Feed tab and displays logs", async () => {
    const root = renderDashboard();
    await act(async () => {
      await Promise.resolve();
    });

    const logsTab = container.querySelector("#tab-logs") as HTMLButtonElement;
    expect(logsTab).not.toBeNull();

    act(() => {
      logsTab.click();
    });

    expect(container.textContent).toContain("Multi-agent collaborative workflow initiated.");

    act(() => {
      root.unmount();
    });
  });

  it("invokes pause workflow mutation when pause button is clicked", async () => {
    mockCollaborationApi.pauseWorkflow.mockResolvedValue({
      ...mockWorkflow,
      status: "paused",
    });
    const root = renderDashboard();
    await act(async () => {
      await Promise.resolve();
    });

    const pauseBtn = container.querySelector("#btn-collab-pause") as HTMLButtonElement;
    expect(pauseBtn).not.toBeNull();

    await act(async () => {
      pauseBtn.click();
      await Promise.resolve();
    });

    expect(mockCollaborationApi.pauseWorkflow).toHaveBeenCalledWith("comp-1", "issue-1");

    act(() => {
      root.unmount();
    });
  });
});
