import { eq } from "drizzle-orm";
import type { Db } from "@geetorusai/db";
import { companyCollaborationSettings } from "@geetorusai/db";
import type { CompanyCollaborationSettings } from "@geetorusai/shared";

export class CollaborationSettingsService {
  private settingsMap = new Map<string, CompanyCollaborationSettings>();

  private defaultSettings: CompanyCollaborationSettings = {
    maxParallelAgents: 4,
    taskBudgetUsd: 15.0,
    tokenBudgetPerTask: 250000,
    autoDecompositionEnabled: true,
    preferredPlannerModel: "claude-3-7-sonnet",
    preferredImplementerModel: "claude-3-7-sonnet",
    preferredTestingModel: "gemini-2.0-flash",
  };

  public getSettings(companyId: string, _db?: Db): CompanyCollaborationSettings {
    const existing = this.settingsMap.get(companyId);
    return existing ? { ...existing } : { ...this.defaultSettings };
  }

  public updateSettings(
    companyId: string,
    updates: Partial<CompanyCollaborationSettings>,
    db?: Db,
  ): CompanyCollaborationSettings {
    const current = this.getSettings(companyId);
    const updated: CompanyCollaborationSettings = {
      ...current,
      ...updates,
      maxParallelAgents: Math.max(1, Math.min(10, updates.maxParallelAgents ?? current.maxParallelAgents)),
      taskBudgetUsd: Math.max(1, updates.taskBudgetUsd ?? current.taskBudgetUsd),
      tokenBudgetPerTask: Math.max(10000, updates.tokenBudgetPerTask ?? current.tokenBudgetPerTask),
    };

    this.settingsMap.set(companyId, updated);

    if (db && typeof db.insert === "function") {
      const costStr = updated.taskBudgetUsd.toFixed(2);
      try {
        db.insert(companyCollaborationSettings)
          .values({
            companyId,
            autoCollaborationEnabled: updated.autoDecompositionEnabled,
            defaultMaxParallelAgents: updated.maxParallelAgents,
            costThresholdDollars: costStr,
            requireApprovalForMultiAgent: false,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: companyCollaborationSettings.companyId,
            set: {
              autoCollaborationEnabled: updated.autoDecompositionEnabled,
              defaultMaxParallelAgents: updated.maxParallelAgents,
              costThresholdDollars: costStr,
              updatedAt: new Date(),
            },
          })
          .catch(() => {});
      } catch {}
    }

    return updated;
  }
}

export const collaborationSettings = new CollaborationSettingsService();
