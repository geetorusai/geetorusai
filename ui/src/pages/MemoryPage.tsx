import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  Upload,
  Download,
  Settings,
  GitMerge,
  Tag,
  Clock,
  Layers,
  Sparkles,
  AlertTriangle,
  FileText,
  Trash2,
  Edit2,
  Info,
} from "lucide-react";
import { useParams } from "react-router-dom";
import type {
  CompanyMemorySettings,
  MemoryItem,
  MemoryScope,
  MemoryType,
} from "@geetorusai/shared";
import { memoryApi } from "../api/memory";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export function MemoryPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"all" | "queue" | "settings">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<MemoryItem | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newScope, setNewScope] = useState<MemoryScope>("company");
  const [newType, setNewType] = useState<MemoryType>("fact");
  const [newTags, setNewTags] = useState("");

  const [importText, setImportText] = useState("");

  const effectiveCompanyId = companyId ?? "";

  // 1. Fetch memories
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["memories", effectiveCompanyId, activeTab, selectedScope, selectedType],
    queryFn: () =>
      memoryApi.listMemories(effectiveCompanyId, {
        scope: selectedScope !== "all" ? selectedScope : undefined,
        type: selectedType !== "all" ? selectedType : undefined,
        status: activeTab === "queue" ? "pending_approval" : "active",
      }),
    enabled: Boolean(effectiveCompanyId),
  });

  // 2. Fetch settings
  const { data: settings } = useQuery({
    queryKey: ["memory-settings", effectiveCompanyId],
    queryFn: () => memoryApi.getSettings(effectiveCompanyId),
    enabled: Boolean(effectiveCompanyId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["memories", effectiveCompanyId] });
    queryClient.invalidateQueries({ queryKey: ["memory-settings", effectiveCompanyId] });
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string; scope: MemoryScope; type: MemoryType; tags: string[] }) =>
      memoryApi.createMemory(effectiveCompanyId, data),
    onSuccess: (res) => {
      setIsCreateOpen(false);
      setNewTitle("");
      setNewContent("");
      setNewTags("");
      invalidate();
      if (res.duplicates.hasDuplicate) {
        setMergeTarget(res.memory);
        setIsMergeOpen(true);
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => memoryApi.approveMemory(effectiveCompanyId, id),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => memoryApi.rejectMemory(effectiveCompanyId, id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => memoryApi.deleteMemory(effectiveCompanyId, id),
    onSuccess: invalidate,
  });

  const importMutation = useMutation({
    mutationFn: (text: string) =>
      memoryApi.importMarkdown(effectiveCompanyId, { markdownText: text }),
    onSuccess: () => {
      setIsImportOpen(false);
      setImportText("");
      invalidate();
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<CompanyMemorySettings>) =>
      memoryApi.updateSettings(effectiveCompanyId, newSettings),
    onSuccess: invalidate,
  });

  // Filter memories locally by search keyword
  const filteredMemories = memories.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q) ||
      m.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  });

  const pendingCount = activeTab === "queue" ? memories.length : 0;

  return (
    <div className="container max-w-6xl mx-auto py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <Brain className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Durable Knowledge & Memory Base
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Curate facts, decisions, preferences, and lessons scoped to company, project, or agents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            id="btn-import-memory"
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            className="text-xs gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Markdown
          </Button>

          <Button
            id="btn-export-memory"
            variant="outline"
            size="sm"
            asChild
            className="text-xs gap-1.5"
          >
            <a href={memoryApi.exportMarkdownUrl(effectiveCompanyId)} download>
              <Download className="h-3.5 w-3.5" />
              Export
            </a>
          </Button>

          <Button
            id="btn-new-memory"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Knowledge
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 text-xs">
        <button
          id="tab-memory-all"
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-4 py-2 font-medium border-b-2 -mb-px transition-colors",
            activeTab === "all"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          Active Knowledge ({memories.length})
        </button>

        <button
          id="tab-memory-queue"
          onClick={() => setActiveTab("queue")}
          className={cn(
            "px-4 py-2 font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "queue"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <span>Review Queue</span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-(length:--text-micro)">
              {pendingCount}
            </Badge>
          )}
        </button>

        <button
          id="tab-memory-settings"
          onClick={() => setActiveTab("settings")}
          className={cn(
            "px-4 py-2 font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "settings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          Governance Settings
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === "settings" ? (
        <Card className="p-6 border border-border/80 bg-card/60 space-y-6 max-w-2xl">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Company Memory Governance & Write Policies
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure how agent-discovered memories are saved, reviewed, and injected into task contexts.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <label className="font-medium text-foreground">Write Policy</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "auto_save", label: "Auto-Save", desc: "Instantly persists proposed memories as active" },
                  { value: "require_approval", label: "Require Approval", desc: "Routes proposals to the human review queue" },
                  { value: "off", label: "Disabled", desc: "Ignores agent memory proposals" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      updateSettingsMutation.mutate({ writePolicy: opt.value as any })
                    }
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      settings?.writePolicy === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 hover:bg-muted/40 text-muted-foreground",
                    )}
                  >
                    <div className="font-semibold text-foreground">{opt.label}</div>
                    <div className="text-(length:--text-micro) text-muted-foreground mt-1">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Injection Token Budget</label>
              <Input
                type="number"
                value={settings?.injectionTokenBudget ?? 2000}
                onChange={(e) =>
                  updateSettingsMutation.mutate({
                    injectionTokenBudget: parseInt(e.target.value, 10) || 2000,
                  })
                }
                className="max-w-xs"
              />
              <p className="text-(length:--text-micro) text-muted-foreground">
                Maximum tokens injected into prompt contexts before heartbeat runs.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Deduplication Threshold</label>
              <Input
                type="number"
                step="0.05"
                min="0.5"
                max="1.0"
                value={settings?.dedupThreshold ?? 0.88}
                onChange={(e) =>
                  updateSettingsMutation.mutate({
                    dedupThreshold: parseFloat(e.target.value) || 0.88,
                  })
                }
                className="max-w-xs"
              />
              <p className="text-(length:--text-micro) text-muted-foreground">
                Embedding cosine similarity threshold to trigger duplicate merge alerts.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search knowledge by keyword or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Scope filter */}
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground"
              >
                <option value="all">All Scopes</option>
                <option value="company">Company</option>
                <option value="project">Project</option>
                <option value="agent">Agent</option>
                <option value="issue">Issue</option>
              </select>

              {/* Type filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground"
              >
                <option value="all">All Types</option>
                <option value="fact">Fact</option>
                <option value="decision">Decision</option>
                <option value="preference">Preference</option>
                <option value="lesson">Lesson</option>
                <option value="document-chunk">Document Chunk</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          {isLoading ? (
            <Card className="p-8 text-center text-xs text-muted-foreground">
              Loading knowledge items...
            </Card>
          ) : filteredMemories.length === 0 ? (
            <Card className="p-10 text-center space-y-3 border-dashed border-border/80">
              <Brain className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  {activeTab === "queue" ? "No Proposals Awaiting Approval" : "No Knowledge Items Found"}
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {activeTab === "queue"
                    ? "Agent proposed memories requiring human approval will appear here."
                    : "Add your first durable fact, decision, or import markdown notes."}
                </p>
              </div>
              {activeTab === "all" && (
                <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add First Knowledge Item
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredMemories.map((m) => {
                const typeIcon =
                  m.type === "decision"
                    ? Layers
                    : m.type === "lesson"
                    ? Brain
                    : m.type === "preference"
                    ? Sparkles
                    : m.type === "document-chunk"
                    ? FileText
                    : Sparkles;
                const TypeIcon = typeIcon;

                return (
                  <Card
                    key={m.id}
                    className={cn(
                      "p-4 border transition-all flex flex-col justify-between space-y-3",
                      m.status === "pending_approval"
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border/70 bg-card/60 hover:border-border",
                    )}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0 mt-0.5">
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="text-xs uppercase">{m.type}</Badge>
                              <Badge variant="secondary" className="text-xs">{m.scope}</Badge>
                            </div>
                            <h3 className="text-sm font-semibold text-foreground leading-tight">
                              {m.title}
                            </h3>
                          </div>
                        </div>

                      {activeTab === "queue" ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveMutation.mutate(m.id)}
                            disabled={approveMutation.isPending}
                            className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(m.id)}
                            disabled={rejectMutation.isPending}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(m.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {m.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-(length:--text-micro) text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Source: <strong className="text-foreground">{m.source}</strong></span>
                      <span>•</span>
                      <span>By: <strong className="text-foreground">{m.createdBy}</strong></span>
                    </div>

                    {m.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {m.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-xs font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg p-6 space-y-4 border border-border shadow-xl bg-card">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Add Durable Knowledge Item
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Title</label>
                <Input
                  placeholder="e.g., PostgreSQL connection pool size constraint"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as MemoryType)}
                    className="w-full text-xs bg-background border border-border rounded-md px-2.5 py-2 text-foreground"
                  >
                    <option value="fact">Fact</option>
                    <option value="decision">Decision</option>
                    <option value="preference">Preference</option>
                    <option value="lesson">Lesson</option>
                    <option value="document-chunk">Document Chunk</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-foreground">Scope</label>
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value as MemoryScope)}
                    className="w-full text-xs bg-background border border-border rounded-md px-2.5 py-2 text-foreground"
                  >
                    <option value="company">Company</option>
                    <option value="project">Project</option>
                    <option value="agent">Agent</option>
                    <option value="issue">Issue</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Content</label>
                <textarea
                  rows={4}
                  placeholder="Detailed knowledge, decision rationale, or policy description..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Tags (comma-separated)</label>
                <Input
                  placeholder="database, architecture, production"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!newTitle.trim() || !newContent.trim() || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    title: newTitle,
                    content: newContent,
                    scope: newScope,
                    type: newType,
                    tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
                  })
                }
              >
                {createMutation.isPending ? "Saving..." : "Save Knowledge"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg p-6 space-y-4 border border-border shadow-xl bg-card">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Bulk Import Markdown Knowledge
              </h3>
              <button onClick={() => setIsImportOpen(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                Paste markdown text. Headings (## or ###) will be split into individual curated memory items.
              </p>
              <textarea
                rows={8}
                placeholder="## Database Pool Size&#10;Keep maximum connections below 20.&#10;&#10;## API Retry Rules&#10;Exponential backoff up to 3 attempts."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!importText.trim() || importMutation.isPending}
                onClick={() => importMutation.mutate(importText)}
              >
                {importMutation.isPending ? "Importing..." : "Import Knowledge"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
