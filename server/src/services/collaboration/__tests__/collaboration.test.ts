import { describe, it, expect, beforeEach } from "vitest";
import {
  taskAnalyzer,
  taskAllocator,
  sharedWorkspaceContext,
  collaborationSettings,
  MultiAgentOrchestrator,
  type AgentCandidate,
} from "../index.js";
import { subscribeCompanyLiveEvents } from "../../live-events.js";

describe("Intelligent Task Distribution and Collaborative Execution", () => {
  const sampleAgents: AgentCandidate[] = [
    {
      id: "agent-cto",
      name: "Marcus CTO",
      role: "cto",
      title: "Chief Technology Officer",
      capabilities: "architecture, planning, review, lead",
      adapterType: "process",
      status: "idle",
      adapterConfig: { model: "claude-3-7-sonnet" },
    },
    {
      id: "agent-coder",
      name: "Alex Dev",
      role: "senior-coder",
      title: "Senior Fullstack Engineer",
      capabilities: "backend, frontend, database, fullstack",
      adapterType: "process",
      status: "idle",
      adapterConfig: { model: "claude-3-7-sonnet" },
    },
    {
      id: "agent-qa",
      name: "Riley QA",
      role: "qa",
      title: "Lead QA Engineer",
      capabilities: "testing, test automation, regression, validation",
      adapterType: "process",
      status: "idle",
      adapterConfig: { model: "gemini-2.0-flash" },
    },
  ];

  describe("TaskAnalyzer", () => {
    it("classifies simple tasks as low complexity and recommends single_agent", () => {
      const result = taskAnalyzer.analyze({
        id: "issue-1",
        title: "Fix typo in README documentation",
        description: "Change word 'recieved' to 'received' on line 4.",
      });

      expect(result.complexity).toBe("low");
      expect(result.recommendedStrategy).toBe("single_agent");
      expect(result.plannedSubtasks.length).toBe(1);
    });

    it("classifies complex software development tasks as high complexity and recommends multi_agent_collaborative", () => {
      const result = taskAnalyzer.analyze({
        id: "issue-2",
        title: "Implement Intelligent Task Distribution and Collaborative Multi-Agent Execution",
        description: `Upgrade GeetorusAI so that all incoming tasks are intelligently distributed among multiple AI agents/employees.
1. Intelligent Task Analysis: Analyze complexity, workload, skills.
2. Dynamic Task Allocation: Orchestrator identifies best agents.
3. Collaborative Development Workflow: Planner, Research, Implementation, Integration, Testing, Review.
4. Shared Workspace and Communication: Shared context, contracts, file conflict prevention.
5. Reliable Execution and Integration: Run tests, handle retries, report blockers.
6. Performance and Token Optimization: Single agent for simple tasks, parallelize independent work.
7. Dashboard and Progress Tracking: UI reflecting execution states and metrics.`,
      });

      expect(result.complexity).toBe("high");
      expect(result.recommendedStrategy).toBe("multi_agent_collaborative");
      expect(result.plannedSubtasks.length).toBeGreaterThanOrEqual(5);

      const roles = result.plannedSubtasks.map((s) => s.role);
      expect(roles).toContain("planner");
      expect(roles).toContain("researcher");
      expect(roles).toContain("implementer");
      expect(roles).toContain("integrator");
      expect(roles).toContain("tester");
      expect(roles).toContain("reviewer");
    });
  });

  describe("TaskAllocator", () => {
    it("allocates roles according to agent capabilities and specialties", () => {
      const subtasks = [
        {
          id: "sub-1",
          title: "Technical Plan",
          description: "Architecture plan",
          role: "planner" as const,
          requiredSkills: ["architecture_design"],
          estimatedTokens: 5000,
          dependencies: [],
          targetFiles: [],
          acceptanceCriteria: [],
        },
        {
          id: "sub-2",
          title: "Code Implementation",
          description: "Write backend modules",
          role: "implementer" as const,
          requiredSkills: ["backend_development"],
          estimatedTokens: 10000,
          dependencies: ["sub-1"],
          targetFiles: [],
          acceptanceCriteria: [],
        },
        {
          id: "sub-3",
          title: "Automated Testing",
          description: "Run vitest test suites",
          role: "tester" as const,
          requiredSkills: ["testing_and_qa"],
          estimatedTokens: 5000,
          dependencies: ["sub-2"],
          targetFiles: [],
          acceptanceCriteria: [],
        },
      ];

      const allocations = taskAllocator.allocate(subtasks, sampleAgents);

      expect(allocations.get("sub-1")?.agentId).toBe("agent-cto");
      expect(allocations.get("sub-2")?.agentId).toBe("agent-coder");
      expect(allocations.get("sub-3")?.agentId).toBe("agent-qa");
    });

    it("gracefully falls back when only a single agent exists in the company", () => {
      const singleAgent = [sampleAgents[0]!];
      const subtasks = [
        {
          id: "sub-1",
          title: "Task Part 1",
          description: "Plan",
          role: "planner" as const,
          requiredSkills: [],
          estimatedTokens: 1000,
          dependencies: [],
          targetFiles: [],
          acceptanceCriteria: [],
        },
        {
          id: "sub-2",
          title: "Task Part 2",
          description: "Test",
          role: "tester" as const,
          requiredSkills: [],
          estimatedTokens: 1000,
          dependencies: ["sub-1"],
          targetFiles: [],
          acceptanceCriteria: [],
        },
      ];

      const allocations = taskAllocator.allocate(subtasks, singleAgent);
      expect(allocations.get("sub-1")?.agentId).toBe("agent-cto");
      expect(allocations.get("sub-2")?.agentId).toBe("agent-cto");
    });
  });

  describe("SharedWorkspaceContext", () => {
    beforeEach(() => {
      // fresh workflow id
    });

    it("tracks file locks and detects file modification conflicts between concurrent subtasks", () => {
      const wfId = "test-wf-1";

      const lock1 = sharedWorkspaceContext.acquireFileLock(
        wfId,
        "server/src/routes/api.ts",
        "agent-coder",
        "subtask-backend",
      );
      expect(lock1.acquired).toBe(true);

      const conflicts = sharedWorkspaceContext.detectFileConflicts(
        wfId,
        "subtask-frontend",
        ["server/src/routes/api.ts", "ui/src/App.tsx"],
      );

      expect(conflicts.length).toBe(1);
      expect(conflicts[0]).toContain('File "server/src/routes/api.ts" is currently locked');

      sharedWorkspaceContext.releaseFileLocksForSubtask(wfId, "subtask-backend");
      const conflictsAfterRelease = sharedWorkspaceContext.detectFileConflicts(
        wfId,
        "subtask-frontend",
        ["server/src/routes/api.ts"],
      );
      expect(conflictsAfterRelease.length).toBe(0);
    });

    it("publishes schemas and generates token-optimized context", () => {
      const wfId = "test-wf-2";
      sharedWorkspaceContext.publishContract(
        wfId,
        "UserProfilePayload",
        "interface UserProfilePayload { id: string; email: string; }",
      );
      sharedWorkspaceContext.recordArchitecturalNote(
        wfId,
        "Follow Drizzle schema patterns and use parameterized queries.",
      );

      const context = sharedWorkspaceContext.generateSubtaskPromptContext(
        wfId,
        "subtask-3",
        ["subtask-1"],
      );

      expect(context).toContain("UserProfilePayload");
      expect(context).toContain("Follow Drizzle schema patterns");
    });
  });

  describe("MultiAgentOrchestrator Lifecycle", () => {
    let orchestrator: MultiAgentOrchestrator;

    beforeEach(() => {
      orchestrator = new MultiAgentOrchestrator();
    });

    it("coordinates end-to-end multi-agent execution with dependencies, unblocking, and integration verification", () => {
      const issue = {
        id: "issue-collab-1",
        title: "Build Distributed Service with API and UI",
        description: `Build distributed service:
- Architecture and schema plan
- Backend endpoints implementation
- UI dashboard implementation
- Integration and testing`,
      };

      const wf = orchestrator.createWorkflow("comp-1", issue, sampleAgents, {
        concurrencyLimit: 2,
      });

      expect(wf.status).toBe("planned");
      expect(wf.subtasks.length).toBeGreaterThanOrEqual(4);

      // Independent tasks should be assigned, dependent tasks should be blocked
      const planSubtask = wf.subtasks.find((s) => s.id === "subtask-plan")!;
      expect(planSubtask.status).toBe("assigned");

      const researchSubtask = wf.subtasks.find((s) => s.id === "subtask-research")!;
      expect(researchSubtask.status).toBe("blocked");

      // Start workflow
      orchestrator.startOrStepWorkflow(wf.id);
      expect(wf.status).toBe("in_progress");
      expect(planSubtask.status).toBe("in_progress");

      // Complete planner
      orchestrator.completeSubtask(wf.id, "subtask-plan", "Created architectural blueprint.");
      expect(planSubtask.status).toBe("completed");

      // Research subtask should now be unblocked to assigned/in_progress
      expect(researchSubtask.status).toBe("in_progress");

      // Complete research
      orchestrator.completeSubtask(wf.id, "subtask-research", "Investigated existing systems.");

      // Now implementation subtasks should be running concurrently up to concurrencyLimit (2)
      const inProgressImpl = wf.subtasks.filter((s) => s.status === "in_progress");
      expect(inProgressImpl.length).toBeGreaterThanOrEqual(1);

      // Complete remaining subtasks sequentially
      for (const sub of wf.subtasks) {
        if (sub.status !== "completed") {
          orchestrator.completeSubtask(wf.id, sub.id, `Completed ${sub.title}`);
        }
      }

      // Once all subtasks complete, workflow verifies and completes
      expect(wf.status).toBe("completed");
      expect(wf.verification?.verified).toBe(true);
      expect(wf.finalConsolidatedOutput).toContain("Consolidated Collaborative Delivery");
      expect(wf.totalTokensUsed).toBeGreaterThan(0);
    });

    it("handles failure retries and reassignment to capable agents", () => {
      const issue = {
        id: "issue-fail-test",
        title: "Test Failure Handling",
        description: "Task for testing error recovery.",
      };

      const wf = orchestrator.createWorkflow("comp-1", issue, sampleAgents, {
        customStrategy: "single_agent",
      });

      orchestrator.startOrStepWorkflow(wf.id);
      const subtask = wf.subtasks[0]!;

      // First failure -> triggers retry
      orchestrator.failSubtask(wf.id, subtask.id, "Connection timeout", sampleAgents);
      expect(subtask.retryCount).toBe(1);
      expect(subtask.status).toBe("in_progress");

      // Second failure -> triggers retry 2
      orchestrator.failSubtask(wf.id, subtask.id, "API rate limit", sampleAgents);
      expect(subtask.retryCount).toBe(2);

      // Third failure -> reassigns to alternate agent
      const prevAgentId = subtask.assignedAgentId;
      orchestrator.failSubtask(wf.id, subtask.id, "Fatal failure on host", sampleAgents);

      // Successfully reassigned to fallback agent
      expect(subtask.assignedAgentId).not.toBe(prevAgentId);
    });

    it("supports pause, resume, and cancel workflow controls", () => {
      const issue = {
        id: "issue-control-test",
        title: "Control Test",
        description: "Task for testing pause/resume/cancel controls.",
      };

      const wf = orchestrator.createWorkflow("comp-1", issue, sampleAgents);
      orchestrator.startOrStepWorkflow(wf.id);
      expect(wf.status).toBe("in_progress");

      orchestrator.pauseWorkflow(wf.id);
      expect(wf.status).toBe("paused");

      orchestrator.resumeWorkflow(wf.id);
      expect(wf.status).toBe("in_progress");

      orchestrator.cancelWorkflow(wf.id);
      expect(wf.status).toBe("cancelled");
    });

    it("allocates dedicated per-subtask git branch worktree references and execution workspace IDs", () => {
      const issue = {
        id: "issue-git-worktree",
        title: "Feature with git worktree isolation",
      };
      const wf = orchestrator.createWorkflow("comp-git", issue, sampleAgents);

      expect(wf.subtasks.length).toBeGreaterThan(0);
      for (const sub of wf.subtasks) {
        expect(sub.gitBranch).toBeDefined();
        expect(sub.gitBranch).toMatch(/^collab\/issue-gi\//);
        expect(sub.executionWorkspaceId).toBeDefined();
        expect(typeof sub.executionWorkspaceId).toBe("string");
      }
    });

    it("dynamically synthesizes specialized virtual workers when company agents are scarce", () => {
      const issue = {
        id: "issue-synth-1",
        title: "Multi-Agent System with High Complexity Requirements",
        description: "1. Architect planning 2. Deep research 3. Fullstack implementation 4. QA testing",
      };
      const singleAgent = [sampleAgents[0]!]; // CTO only
      const wf = orchestrator.createWorkflow("comp-scarce", issue, singleAgent);

      expect(wf.strategy).toBe("multi_agent_collaborative");
      expect(wf.subtasks.length).toBeGreaterThanOrEqual(3);

      const synthesizedSubtasks = wf.subtasks.filter((s) => s.isSynthesizedSpecialist);
      expect(synthesizedSubtasks.length).toBeGreaterThan(0);
      const ctoSubtask = wf.subtasks.find((s) => s.assignedAgentId === "agent-cto");
      expect(ctoSubtask).toBeDefined();
    });

    it("streams real-time token consumption chunks via live events", () => {
      const issue = {
        id: "issue-token-stream",
        title: "Streaming tokens test",
      };
      const wf = orchestrator.createWorkflow("comp-stream", issue, sampleAgents);
      const subtask = wf.subtasks[0]!;

      const events: any[] = [];
      const unsubscribe = subscribeCompanyLiveEvents("comp-stream", (event) => {
        events.push(event);
      });

      const res = orchestrator.streamSubtaskTokens("comp-stream", wf.id, subtask.id, {
        inputTokens: 150,
        outputTokens: 75,
      });

      expect(res.totalWorkflowTokens).toBe(225);
      expect(res.subtaskTokens.inputTokens).toBe(150);
      expect(res.subtaskTokens.outputTokens).toBe(75);
      expect(res.subtaskTokens.totalTokens).toBe(225);

      expect(events.length).toBeGreaterThanOrEqual(1);
      const tokenEvent = events.find((e) => e.type === "collaboration.token.stream");
      expect(tokenEvent).toBeDefined();
      expect(tokenEvent.payload.workflowId).toBe(wf.id);
      expect(tokenEvent.payload.subtaskId).toBe(subtask.id);
      expect(tokenEvent.payload.totalTokens).toBe(225);

      unsubscribe();
    });

    it("handles resilient budget locking, downshifts model tiers, and resumes on budget override approval", () => {
      const issue = {
        id: "issue-budget-lock",
        title: "Expensive Task",
      };
      const wf = orchestrator.createWorkflow("comp-budget", issue, sampleAgents);

      // Request budget override
      orchestrator.requestBudgetOverride(wf.id, "Emergency feature deployment", 50.0);
      expect(wf.budgetOverrideRequested).toBe(true);
      expect(wf.budgetPolicyState).toBe("awaiting_approval");

      // Pause workflow while awaiting approval
      orchestrator.pauseWorkflow(wf.id);
      expect(wf.status).toBe("paused");

      // Approve override -> resumes workflow
      orchestrator.resolveBudgetOverride(wf.id, true);
      expect(wf.budgetPolicyState).toBe("normal");
      expect(wf.budgetOverrideRequested).toBe(false);
      expect(wf.status).toBe("in_progress");
    });
  });

  describe("CollaborationSettings", () => {
    it("reads and updates company settings", () => {
      const s1 = collaborationSettings.getSettings("comp-abc");
      expect(s1.maxParallelAgents).toBe(4);

      const updated = collaborationSettings.updateSettings("comp-abc", {
        maxParallelAgents: 6,
        taskBudgetUsd: 25.0,
      });

      expect(updated.maxParallelAgents).toBe(6);
      expect(updated.taskBudgetUsd).toBe(25.0);

      const s2 = collaborationSettings.getSettings("comp-abc");
      expect(s2.maxParallelAgents).toBe(6);
    });
  });
});
