import type {
  CollaborationSharedContext,
} from "@geetorusai/shared";

export class SharedWorkspaceContext {
  private contextMap = new Map<string, CollaborationSharedContext>();

  public getOrCreateContext(workflowId: string): CollaborationSharedContext {
    let ctx = this.contextMap.get(workflowId);
    if (!ctx) {
      ctx = {
        architecturalNotes: [],
        sharedSchemasAndContracts: {},
        fileLocks: {},
        findings: [],
        blockers: [],
      };
      this.contextMap.set(workflowId, ctx);
    }
    return ctx;
  }

  public recordArchitecturalNote(workflowId: string, note: string): void {
    const ctx = this.getOrCreateContext(workflowId);
    if (!ctx.architecturalNotes.includes(note)) {
      ctx.architecturalNotes.push(note);
    }
  }

  public publishContract(
    workflowId: string,
    contractName: string,
    contractDefinition: string,
  ): void {
    const ctx = this.getOrCreateContext(workflowId);
    ctx.sharedSchemasAndContracts[contractName] = contractDefinition;
  }

  public acquireFileLock(
    workflowId: string,
    filePath: string,
    agentId: string,
    subtaskId: string,
    _reason?: string,
  ): { acquired: boolean; currentOwner?: { agentId: string; subtaskId: string } } {
    const ctx = this.getOrCreateContext(workflowId);
    const existing = ctx.fileLocks[filePath];

    if (existing && existing.subtaskId !== subtaskId) {
      return { acquired: false, currentOwner: existing };
    }

    ctx.fileLocks[filePath] = {
      agentId,
      subtaskId,
      lockedAt: new Date().toISOString(),
    };
    return { acquired: true };
  }

  public releaseFileLock(workflowId: string, filePath: string, _agentId?: string): void {
    const ctx = this.getOrCreateContext(workflowId);
    delete ctx.fileLocks[filePath];
  }

  public releaseFileLocksForSubtask(workflowId: string, subtaskId: string): void {
    const ctx = this.getOrCreateContext(workflowId);
    for (const [file, lock] of Object.entries(ctx.fileLocks)) {
      if (lock.subtaskId === subtaskId) {
        delete ctx.fileLocks[file];
      }
    }
  }

  public addSharedContract(workflowId: string, name: string, content: string): void {
    this.publishContract(workflowId, name, content);
  }

  public addArchitecturalDirective(workflowId: string, directive: string): void {
    this.recordArchitecturalNote(workflowId, directive);
  }

  public detectFileConflicts(
    workflowId: string,
    subtaskId: string,
    targetFiles: string[],
  ): string[] {
    const ctx = this.getOrCreateContext(workflowId);
    const conflicts: string[] = [];

    for (const file of targetFiles) {
      const lock = ctx.fileLocks[file];
      if (lock && lock.subtaskId !== subtaskId) {
        conflicts.push(`File "${file}" is currently locked by agent ${lock.agentId} on subtask ${lock.subtaskId}`);
      }
    }

    return conflicts;
  }

  public publishFinding(
    workflowId: string,
    finding: { agentId: string; role: string; topic: string; content: string },
  ): void {
    const ctx = this.getOrCreateContext(workflowId);
    ctx.findings.push({
      ...finding,
      timestamp: new Date().toISOString(),
    });
  }

  public reportBlocker(
    workflowId: string,
    subtaskId: string,
    description: string,
  ): void {
    const ctx = this.getOrCreateContext(workflowId);
    ctx.blockers.push({
      subtaskId,
      description,
      resolved: false,
    });
  }

  public resolveBlockersForSubtask(workflowId: string, subtaskId: string): void {
    const ctx = this.getOrCreateContext(workflowId);
    for (const blocker of ctx.blockers) {
      if (blocker.subtaskId === subtaskId) {
        blocker.resolved = true;
      }
    }
  }

  /**
   * Token-optimized context generation for a specific subtask.
   * Produces only the necessary architectural guidance, contracts, and relevant findings,
   * avoiding massive context bloat.
   */
  public generateSubtaskPromptContext(
    workflowId: string,
    subtaskId: string,
    prerequisiteSubtaskIds: string[],
  ): string {
    const ctx = this.getOrCreateContext(workflowId);
    const sections: string[] = [];

    if (ctx.architecturalNotes.length > 0) {
      sections.push(
        `## Architectural Directives & Guidelines\n${ctx.architecturalNotes.map((n) => `- ${n}`).join("\n")}`,
      );
    }

    const contracts = Object.entries(ctx.sharedSchemasAndContracts);
    if (contracts.length > 0) {
      sections.push(
        `## Shared Schemas and API Contracts\n${contracts
          .map(([name, def]) => `### ${name}\n\`\`\`typescript\n${def}\n\`\`\``)
          .join("\n\n")}`,
      );
    }

    if (ctx.findings.length > 0) {
      sections.push(
        `## Shared Team Findings\n${ctx.findings
          .map((f) => `- [${f.role}]: ${f.topic} - ${f.content}`)
          .join("\n")}`,
      );
    }

    return sections.join("\n\n");
  }
}

export const sharedWorkspaceContext = new SharedWorkspaceContext();
