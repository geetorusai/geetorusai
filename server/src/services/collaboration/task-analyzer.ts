import type {
  CollaborativeRole,
  PlannedSubtask,
  TaskAnalysisResult,
  TaskComplexity,
  TaskWorkload,
} from "@geetorusai/shared";

interface IssueInput {
  id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  originKind?: string | null;
}

const HIGH_COMPLEXITY_KEYWORDS = [
  "architect",
  "multi-agent",
  "orchestrat",
  "collaborat",
  "refactor",
  "infrastructure",
  "full-stack",
  "fullstack",
  "migration",
  "redesign",
  "distributed",
  "ecosystem",
  "security audit",
  "comprehensive",
];

const MEDIUM_COMPLEXITY_KEYWORDS = [
  "implement",
  "feature",
  "integrate",
  "endpoint",
  "component",
  "pipeline",
  "workflow",
  "optimize",
  "test suite",
  "validation",
  "dashboard",
  "service",
];

const LOW_COMPLEXITY_KEYWORDS = [
  "typo",
  "quick fix",
  "rename",
  "update readme",
  "bump version",
  "docs typo",
  "one line",
  "simple question",
  "color change",
];

export class TaskAnalyzer {
  public analyze(issue: IssueInput): TaskAnalysisResult {
    const text = `${issue.title} ${issue.description ?? ""}`.toLowerCase();
    const length = text.length;

    let highHits = HIGH_COMPLEXITY_KEYWORDS.filter((kw) => text.includes(kw)).length;
    let mediumHits = MEDIUM_COMPLEXITY_KEYWORDS.filter((kw) => text.includes(kw)).length;
    let lowHits = LOW_COMPLEXITY_KEYWORDS.filter((kw) => text.includes(kw)).length;

    // Detect structural indicators: multiple bullet points, acceptance criteria, sub-headers
    const bulletCount = (issue.description ?? "").split(/\n\s*[-*]\s+/).length - 1;
    const numberedCount = (issue.description ?? "").split(/\n\s*\d+\.\s+/).length - 1;
    const structuredItems = bulletCount + numberedCount;

    let complexity: TaskComplexity = "medium";

    if (lowHits > 0 && highHits === 0 && structuredItems < 3 && length < 300) {
      complexity = "low";
    } else if (highHits >= 2 || structuredItems >= 6 || length > 1200) {
      complexity = "high";
    } else if (highHits === 1 || mediumHits >= 2 || structuredItems >= 3) {
      complexity = "medium";
    } else if (length < 250) {
      complexity = "low";
    }

    const isMultiAgent = complexity !== "low";
    const recommendedStrategy = isMultiAgent ? "multi_agent_collaborative" : "single_agent";

    const workload: TaskWorkload = this.estimateWorkload(complexity, structuredItems, length);
    const requiredSkills = this.determineRequiredSkills(text, complexity);
    const requiredTools = this.determineRequiredTools(text, complexity);
    const estimatedCostUsd = Number(((workload.estimatedTokens / 1000) * 0.008).toFixed(2));

    const rationale = this.generateRationale(
      complexity,
      recommendedStrategy,
      workload,
      highHits,
      structuredItems,
    );

    const plannedSubtasks = this.generateSubtasks(
      issue,
      complexity,
      requiredSkills,
      workload,
    );

    return {
      taskId: issue.id,
      taskTitle: issue.title,
      complexity,
      workload,
      recommendedStrategy,
      rationale,
      requiredSkills,
      requiredTools,
      estimatedCostUsd,
      plannedSubtasks,
    };
  }

  private estimateWorkload(
    complexity: TaskComplexity,
    structuredItems: number,
    textLength: number,
  ): TaskWorkload {
    if (complexity === "low") {
      return {
        estimatedHours: 0.5,
        estimatedTokens: 8000,
        points: 1,
        subtaskCount: 1,
      };
    }

    if (complexity === "medium") {
      const subtaskCount = Math.min(5, Math.max(3, Math.ceil(structuredItems / 2) + 2));
      return {
        estimatedHours: 3.5,
        estimatedTokens: 35000,
        points: 5,
        subtaskCount,
      };
    }

    // High complexity
    const subtaskCount = Math.min(8, Math.max(5, Math.ceil(structuredItems / 2) + 3));
    return {
      estimatedHours: 12.0,
      estimatedTokens: 95000 + Math.min(40000, textLength * 15),
      points: 13,
      subtaskCount,
    };
  }

  private determineRequiredSkills(text: string, complexity: TaskComplexity): string[] {
    const skills = new Set<string>();

    if (complexity === "high") {
      skills.add("architecture_design");
      skills.add("system_coordination");
      skills.add("integration");
    }

    if (text.includes("test") || text.includes("qa") || text.includes("verification") || complexity !== "low") {
      skills.add("testing_and_qa");
    }

    if (text.includes("ui") || text.includes("component") || text.includes("frontend") || text.includes("dashboard")) {
      skills.add("frontend_development");
    }

    if (text.includes("api") || text.includes("route") || text.includes("backend") || text.includes("database") || text.includes("server")) {
      skills.add("backend_development");
    }

    if (text.includes("doc") || text.includes("readme") || text.includes("guide") || complexity === "high") {
      skills.add("documentation");
    }

    if (text.includes("security") || text.includes("auth") || text.includes("token")) {
      skills.add("security_review");
    }

    if (skills.size === 0) {
      skills.add("general_software_engineering");
    }

    return Array.from(skills);
  }

  private determineRequiredTools(text: string, complexity: TaskComplexity): string[] {
    const tools = ["git_workspace"];

    if (complexity !== "low") {
      tools.push("test_runner", "linter");
    }

    if (text.includes("search") || text.includes("research") || text.includes("investigate")) {
      tools.push("code_search", "web_search");
    }

    if (text.includes("db") || text.includes("database") || text.includes("schema")) {
      tools.push("db_client");
    }

    return tools;
  }

  private generateRationale(
    complexity: TaskComplexity,
    strategy: string,
    workload: TaskWorkload,
    highHits: number,
    structuredItems: number,
  ): string {
    if (strategy === "single_agent") {
      return "Task scope is concise and straightforward. Assigning to a single agent minimizes orchestration overhead and execution latency.";
    }

    return `Task exhibits ${complexity} complexity with estimated workload of ${workload.estimatedHours}h (${workload.points} pts) across ${workload.subtaskCount} distinct subtasks. Collaborative multi-agent workflow enables parallel execution of independent modules, specialized verification, and conflict-isolated integration.`;
  }

  private generateSubtasks(
    issue: IssueInput,
    complexity: TaskComplexity,
    skills: string[],
    workload: TaskWorkload,
  ): PlannedSubtask[] {
    if (complexity === "low") {
      return [
        {
          id: "subtask-1",
          title: issue.title,
          description: issue.description || issue.title,
          role: "implementer",
          requiredSkills: skills,
          estimatedTokens: workload.estimatedTokens,
          dependencies: [],
          targetFiles: [],
          acceptanceCriteria: ["Task requirement is satisfied and verified"],
        },
      ];
    }

    const subtasks: PlannedSubtask[] = [];

    // 1. Planner
    subtasks.push({
      id: "subtask-plan",
      title: "Requirements Analysis & Technical Architecture Plan",
      description: `Analyze requirements for "${issue.title}". Establish contract interfaces, file scope, and subtask dependencies.`,
      role: "planner",
      requiredSkills: ["architecture_design"],
      estimatedTokens: 8000,
      dependencies: [],
      targetFiles: ["doc/plans/execution-spec.md"],
      acceptanceCriteria: [
        "Component interfaces and shared data schemas are clearly specified",
        "Clear boundary separation identified to avoid merge conflicts",
      ],
    });

    // 2. Research / Existing Code Audit
    subtasks.push({
      id: "subtask-research",
      title: "Codebase & Dependency Investigation",
      description: "Audit current implementation, relevant models, existing design patterns, and constraints.",
      role: "researcher",
      requiredSkills: ["system_coordination"],
      estimatedTokens: 10000,
      dependencies: ["subtask-plan"],
      targetFiles: [],
      acceptanceCriteria: [
        "Audit existing services and models relevant to the task",
        "Document reusable patterns and potential pitfalls",
      ],
    });

    // 3. Implementation Subtasks (Parallel where independent)
    const hasFrontend = skills.includes("frontend_development");
    const hasBackend = skills.includes("backend_development");

    if (hasBackend || !hasFrontend) {
      subtasks.push({
        id: "subtask-impl-backend",
        title: "Backend Core Logic & API Services Implementation",
        description: `Implement core services, routes, and business rules for "${issue.title}".`,
        role: "implementer",
        requiredSkills: ["backend_development"],
        estimatedTokens: 25000,
        dependencies: ["subtask-research"],
        targetFiles: ["server/src/services/", "server/src/routes/"],
        acceptanceCriteria: [
          "Services and endpoints implemented following architecture contracts",
          "Proper error handling and input validation in place",
        ],
      });
    }

    if (hasFrontend) {
      subtasks.push({
        id: "subtask-impl-ui",
        title: "UI Components & Dashboard Integration",
        description: `Build user interface components and visual state tracking for "${issue.title}".`,
        role: "implementer",
        requiredSkills: ["frontend_development"],
        estimatedTokens: 22000,
        dependencies: ["subtask-research"],
        targetFiles: ["ui/src/components/", "ui/src/pages/"],
        acceptanceCriteria: [
          "Interactive components follow design tokens with smooth UX",
          "Real-time state and controls function seamlessly",
        ],
      });
    }

    // 4. Integration
    const implDependencies = subtasks
      .filter((s) => s.role === "implementer")
      .map((s) => s.id);

    subtasks.push({
      id: "subtask-integration",
      title: "Module Integration & Contract Verification",
      description: "Integrate implemented backend and frontend modules, harmonizing APIs and shared state.",
      role: "integrator",
      requiredSkills: ["integration"],
      estimatedTokens: 12000,
      dependencies: implDependencies,
      targetFiles: ["server/src/app.ts", "ui/src/"],
      acceptanceCriteria: [
        "Endpoints and UI components interface cleanly without runtime errors",
        "Shared state transitions resolve deterministically",
      ],
    });

    // 5. Testing & QA
    subtasks.push({
      id: "subtask-qa",
      title: "Automated Testing & Functionality Verification",
      description: "Run automated tests, identify edge cases, and ensure no regressions exist.",
      role: "tester",
      requiredSkills: ["testing_and_qa"],
      estimatedTokens: 12000,
      dependencies: ["subtask-integration"],
      targetFiles: ["tests/", "server/src/__tests__/"],
      acceptanceCriteria: [
        "Target test suites pass completely",
        "Edge cases and error conditions validated",
      ],
    });

    // 6. Review & Security Audit
    subtasks.push({
      id: "subtask-review",
      title: "Code Quality, Security & Performance Review",
      description: "Review implementation against security policies, token gates, and design guidelines.",
      role: "reviewer",
      requiredSkills: ["security_review"],
      estimatedTokens: 8000,
      dependencies: ["subtask-qa"],
      targetFiles: [],
      acceptanceCriteria: [
        "Code adheres to clean code standards and token gates",
        "No security vulnerabilities or resource leaks introduced",
      ],
    });

    // 7. Coordinator & Final Consolidation
    if (complexity === "high") {
      subtasks.push({
        id: "subtask-docs",
        title: "Operational Documentation & Knowledge Update",
        description: "Document system architecture, API capabilities, and user workflow.",
        role: "documenter",
        requiredSkills: ["documentation"],
        estimatedTokens: 7000,
        dependencies: ["subtask-integration"],
        targetFiles: ["docs/"],
        acceptanceCriteria: [
          "Documentation reflects actual operational behavior",
        ],
      });

      subtasks.push({
        id: "subtask-coordinator",
        title: "Final Verification & Consolidated Delivery",
        description: "Synthesize all completed work products, verify acceptance criteria, and deliver final outcome.",
        role: "coordinator",
        requiredSkills: ["system_coordination"],
        estimatedTokens: 6000,
        dependencies: ["subtask-review", "subtask-docs"],
        targetFiles: [],
        acceptanceCriteria: [
          "All subtasks confirmed completed and verified",
          "Consolidated summary report produced",
        ],
      });
    }

    return subtasks;
  }
}

export const taskAnalyzer = new TaskAnalyzer();
