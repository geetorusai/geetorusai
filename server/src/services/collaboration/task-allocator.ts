import { randomUUID } from "node:crypto";
import type {
  CollaborativeRole,
  PlannedSubtask,
} from "@geetorusai/shared";

export interface AgentCandidate {
  id: string;
  name: string;
  role: string;
  title?: string | null;
  capabilities?: string | null;
  adapterType: string;
  status: string;
  adapterConfig?: Record<string, unknown> | null;
  isSynthesizedSpecialist?: boolean;
}

export interface AllocatedSubtaskAssignment {
  subtaskId: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  model: string | null;
  score: number;
  isSynthesizedSpecialist?: boolean;
}

export const SYNTHESIZED_ROLE_TEMPLATES: Record<
  CollaborativeRole,
  { name: string; title: string; capabilities: string; preferredModel: string }
> = {
  planner: {
    name: "Synthesized Lead Architect",
    title: "Virtual Systems Architect & Planner",
    capabilities: "architecture_design, technical_planning, decomposition, system_contracts, cto, lead",
    preferredModel: "claude-3-7-sonnet",
  },
  researcher: {
    name: "Synthesized Deep Researcher",
    title: "Virtual Research & Intelligence Specialist",
    capabilities: "deep_research, dependency_analysis, tech_evaluation, discovery, audit",
    preferredModel: "gemini-2.0-flash",
  },
  implementer: {
    name: "Synthesized Senior Engineer",
    title: "Virtual Implementation Engineer",
    capabilities: "code_implementation, refactoring, api_development, database_schema, senior-coder",
    preferredModel: "claude-3-7-sonnet",
  },
  integrator: {
    name: "Synthesized Systems Integrator",
    title: "Virtual Cross-Module Integration Lead",
    capabilities: "system_integration, api_contracts, conflict_resolution, branch_merging, lead",
    preferredModel: "claude-3-7-sonnet",
  },
  tester: {
    name: "Synthesized QA Verification Specialist",
    title: "Virtual Quality & Test Automation Engineer",
    capabilities: "test_automation, unit_testing, regression_suite, vitest, verification, qa",
    preferredModel: "gemini-2.0-flash",
  },
  reviewer: {
    name: "Synthesized Security & Code Reviewer",
    title: "Virtual Peer Review & Security Auditor",
    capabilities: "code_review, security_audit, lint_compliance, quality_standards, lead",
    preferredModel: "claude-3-7-sonnet",
  },
  documenter: {
    name: "Synthesized Technical Writer",
    title: "Virtual Technical Documentation Specialist",
    capabilities: "api_docs, user_documentation, architectural_runbooks, changelogs, doc",
    preferredModel: "gemini-2.0-flash",
  },
  coordinator: {
    name: "Synthesized Delivery Coordinator",
    title: "Virtual Orchestration & Workflow Coordinator",
    capabilities: "workflow_coordination, dependency_tracking, bottleneck_resolution, pm",
    preferredModel: "gemini-2.0-flash",
  },
};

export class TaskAllocator {
  public allocate(
    subtasks: PlannedSubtask[],
    agents: AgentCandidate[],
    activeWorkloadMap: Map<string, number> = new Map(),
  ): Map<string, AllocatedSubtaskAssignment> {
    const assignments = new Map<string, AllocatedSubtaskAssignment>();
    if (agents.length === 0) return assignments;

    // Filter available agents: prefer idle or active non-paused agents
    const eligibleAgents = agents.filter(
      (a) => a.status !== "terminated" && a.status !== "paused",
    );
    const candidatePool = eligibleAgents.length > 0 ? eligibleAgents : agents;

    // Keep track of planned workload in this allocation run to prevent dog-piling
    const currentRunLoads = new Map<string, number>();
    for (const a of candidatePool) {
      currentRunLoads.set(a.id, activeWorkloadMap.get(a.id) ?? 0);
    }

    for (const subtask of subtasks) {
      let bestCandidate: AgentCandidate | null = null;
      let highestScore = -Infinity;

      for (const agent of candidatePool) {
        const score = this.calculateAffinityScore(
          subtask,
          agent,
          currentRunLoads.get(agent.id) ?? 0,
        );

        if (score > highestScore) {
          highestScore = score;
          bestCandidate = agent;
        }
      }

      const assigned = bestCandidate ?? candidatePool[0]!;
      const load = currentRunLoads.get(assigned.id) ?? 0;
      currentRunLoads.set(assigned.id, load + 1);

      const resolvedModel = this.extractModel(assigned);

      assignments.set(subtask.id, {
        subtaskId: subtask.id,
        agentId: assigned.id,
        agentName: assigned.name,
        agentRole: assigned.role,
        model: resolvedModel,
        score: highestScore,
        isSynthesizedSpecialist: Boolean(assigned.isSynthesizedSpecialist),
      });
    }

    return assignments;
  }

  public synthesizeSpecialistPool(
    subtasks: PlannedSubtask[],
    existingAgents: AgentCandidate[],
  ): AgentCandidate[] {
    const pool = [...existingAgents.filter((a) => a.status !== "terminated" && a.status !== "paused")];
    const neededRoles = new Set(subtasks.map((s) => s.role));

    for (const role of neededRoles) {
      const hasCoverage = pool.some(
        (a) =>
          a.role.toLowerCase().includes(role) ||
          (a.capabilities && a.capabilities.toLowerCase().includes(role)),
      );

      if (!hasCoverage || pool.length < Math.min(subtasks.length, 4)) {
        const template = SYNTHESIZED_ROLE_TEMPLATES[role] ?? {
          name: `Synthesized ${role.toUpperCase()} Specialist`,
          title: `Virtual ${role} Specialist`,
          capabilities: `${role}, collaborative_worker`,
          preferredModel: "gemini-2.0-flash",
        };

        const synthAgent: AgentCandidate = {
          id: `synth-${role}-${randomUUID().slice(0, 8)}`,
          name: template.name,
          role,
          title: template.title,
          capabilities: template.capabilities,
          adapterType: "process",
          status: "idle",
          isSynthesizedSpecialist: true,
          adapterConfig: { model: template.preferredModel },
        };
        pool.push(synthAgent);
      }
    }

    return pool;
  }

  private calculateAffinityScore(
    subtask: PlannedSubtask,
    agent: AgentCandidate,
    currentLoad: number,
  ): number {
    let score = 50; // base score

    const agentText = `${agent.name} ${agent.role} ${agent.title ?? ""} ${agent.capabilities ?? ""}`.toLowerCase();
    const role = subtask.role;

    // 1. Role-specific affinity
    switch (role) {
      case "planner":
        if (agentText.includes("cto") || agentText.includes("architect") || agentText.includes("lead")) score += 40;
        if (agentText.includes("plan") || agentText.includes("strategy")) score += 25;
        break;
      case "researcher":
        if (agentText.includes("research") || agentText.includes("investigat") || agentText.includes("explore")) score += 40;
        if (agentText.includes("analyst") || agentText.includes("audit")) score += 20;
        break;
      case "implementer":
        if (agentText.includes("senior-coder") || agentText.includes("coder") || agentText.includes("developer") || agentText.includes("engineer")) score += 40;
        if (agentText.includes("software") || agentText.includes("fullstack")) score += 20;
        break;
      case "integrator":
        if (agentText.includes("cto") || agentText.includes("senior-coder") || agentText.includes("lead") || agentText.includes("integrat")) score += 35;
        break;
      case "tester":
        if (agentText.includes("qa") || agentText.includes("test") || agentText.includes("quality")) score += 45;
        if (agentText.includes("verification") || agentText.includes("automation")) score += 20;
        break;
      case "reviewer":
        if (agentText.includes("cto") || agentText.includes("lead") || agentText.includes("review") || agentText.includes("security")) score += 35;
        break;
      case "documenter":
        if (agentText.includes("doc") || agentText.includes("writer") || agentText.includes("content") || agentText.includes("tech writer")) score += 40;
        break;
      case "coordinator":
        if (agentText.includes("coordinator") || agentText.includes("cto") || agentText.includes("lead") || agentText.includes("pm") || agentText.includes("manager")) score += 40;
        break;
    }

    // 2. Skill overlap
    for (const skill of subtask.requiredSkills) {
      if (agentText.includes(skill.replace(/_/g, " "))) {
        score += 15;
      }
    }

    // 3. Status bonus
    if (agent.status === "idle") {
      score += 10;
    }

    // 4. Workload penalty (load balancing across available agents)
    score -= currentLoad * 15;

    return score;
  }

  private extractModel(agent: AgentCandidate): string | null {
    if (!agent.adapterConfig || typeof agent.adapterConfig !== "object") return null;
    const config = agent.adapterConfig as Record<string, unknown>;
    if (typeof config.model === "string") return config.model;
    if (typeof config.preferredModel === "string") return config.preferredModel;
    if (typeof config.defaultModel === "string") return config.defaultModel;
    return null;
  }
}

export const taskAllocator = new TaskAllocator();
