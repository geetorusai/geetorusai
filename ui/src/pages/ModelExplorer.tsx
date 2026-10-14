import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Cpu,
  CheckCircle2,
  XCircle,
  Eye,
  Wrench,
  Zap,
  Code2,
  ShieldCheck,
  Server,
  Layers,
  ArrowRight,
  RotateCcw,
  Play,
  Cloud,
  AlertTriangle,
  Terminal,
  Bot,
  SlidersHorizontal,
  Check,
  Activity,
  Boxes,
} from "lucide-react";
import { modelDiscoveryApi } from "@/api/model-discovery";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DiscoveredModel } from "@geetorusai/shared";

function formatTokens(count: number | null | undefined): string {
  if (!count) return "—";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`;
  return `${count}`;
}

interface AdapterSummary {
  id: string;
  name: string;
  category: "local" | "cloud" | "cli" | "gateway";
  description: string;
  badge?: string;
  defaultHost?: string;
}

const SUPPORTED_ADAPTERS: AdapterSummary[] = [
  {
    id: "lmstudio_local",
    name: "LM Studio",
    category: "local",
    description: "Local developer server (127.0.0.1:1234/v1) for running open-source models privately.",
    badge: "Local-LLM",
  },
  {
    id: "ollama_local",
    name: "Ollama Local",
    category: "local",
    description: "High-performance local inference daemon (127.0.0.1:11434) with zero API costs.",
    badge: "Open-Weight",
  },
  {
    id: "ollama_cloud",
    name: "Ollama Cloud",
    category: "cloud",
    description: "Remote authenticated Ollama endpoint with bearer token access.",
    badge: "Cloud-Routed",
  },
  {
    id: "claude_local",
    name: "Claude Code",
    category: "cli",
    description: "Anthropic Claude Code CLI runtime with native tool calling and MCP.",
    badge: "Native MCP",
  },
  {
    id: "codex_local",
    name: "OpenAI Codex",
    category: "cli",
    description: "Codex CLI agent with native device auth and prompt streaming.",
    badge: "Device Auth",
  },
  {
    id: "gemini_local",
    name: "Gemini CLI",
    category: "cli",
    description: "Google Gemini CLI agent with native multi-modal support.",
    badge: "Multi-Modal",
  },
  {
    id: "opencode_local",
    name: "OpenCode",
    category: "cli",
    description: "Open-source coding agent connecting to OpenRouter, DeepSeek, and local LLMs.",
    badge: "Multi-Provider",
  },
  {
    id: "pi_local",
    name: "Pi Agent",
    category: "cli",
    description: "Minimalist autonomous coding agent runner.",
    badge: "Autonomous",
  },
  {
    id: "cursor",
    name: "Cursor",
    category: "local",
    description: "Native Cursor agent local subprocess integration.",
    badge: "Editor Agent",
  },
  {
    id: "cursor_cloud",
    name: "Cursor Cloud",
    category: "cloud",
    description: "Cursor Cloud workspace gateway.",
    badge: "Cloud Gateway",
  },
  {
    id: "grok_local",
    name: "Grok Build",
    category: "cli",
    description: "xAI Grok Build agent with device authentication.",
    badge: "Reasoning",
  },
  {
    id: "kimi_local",
    name: "Kimi Code",
    category: "cli",
    description: "Moonshot AI Kimi Code agent with long-context reasoning.",
    badge: "Long Context",
  },
  {
    id: "openclaw_gateway",
    name: "OpenClaw",
    category: "gateway",
    description: "OpenClaw WebSocket gateway for decentralized autonomous operations.",
    badge: "WebSocket",
  },
  {
    id: "hermes_local",
    name: "Hermes Agent",
    category: "local",
    description: "Hermes autonomous task runner and subagent engine.",
    badge: "Subagent",
  },
  {
    id: "hermes_gateway",
    name: "Hermes Gateway",
    category: "gateway",
    description: "Hermes distributed gateway coordinator.",
    badge: "Distributed",
  },
  {
    id: "geetorus_runner",
    name: "Geetorus Runner",
    category: "local",
    description: "Native Rust runner and authenticated PRP transport.",
    badge: "High-Speed",
  },
];

const LOCAL_STORAGE_ADAPTER_KEY = "geetorus_selected_adapter";
const LOCAL_STORAGE_MODEL_KEY = "geetorus_selected_model";

export function ModelExplorer() {
  const queryClient = useQueryClient();

  // ── Step 1 & 3: Adapter & Model State ──────────────────────────────────
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_ADAPTER_KEY) || "ollama_local";
  });
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_MODEL_KEY) || "";
  });
  const [modelSearch, setModelSearch] = useState("");
  const [modelWarning, setModelWarning] = useState<string | null>(null);

  // ── Step 4 & 5: Validation & Task Execution State ───────────────────────
  const [validationResult, setValidationResult] = useState<{
    status: "pass" | "warn" | "fail";
    checks: Array<{ code: string; level: string; message: string }>;
    testedAt: string;
  } | null>(null);

  const [taskPrompt, setTaskPrompt] = useState(
    "Analyze the current workspace files, find optimization opportunities, and implement a concise patch following best coding practices.",
  );
  const [taskResult, setTaskResult] = useState<{
    success: boolean;
    exitCode: number;
    adapterType: string;
    modelUsed: string;
    provider: string;
    summary?: string;
    response?: string;
    usage?: { inputTokens?: number; outputTokens?: number };
    errorMessage?: string;
    optimizationApplied?: { layer: string; alwaysOn: boolean; mandateInjected: boolean };
  } | null>(null);

  // ── Step 2: Dynamic Adapter Model Query ────────────────────────────────
  const actualAdapterType = selectedAdapterId === "ollama_cloud" ? "ollama_local" : selectedAdapterId;
  const isOllamaCloud = selectedAdapterId === "ollama_cloud";

  const {
    data: adapterModelsData,
    isLoading: isModelsLoading,
    isFetching: isModelsFetching,
    refetch: refetchAdapterModels,
  } = useQuery({
    queryKey: ["adapter-models", actualAdapterType, isOllamaCloud],
    queryFn: async () => {
      try {
        const res = await modelDiscoveryApi.getAdapterModels(actualAdapterType);
        return res;
      } catch {
        return {
          adapterType: actualAdapterType,
          models: [],
          liveDiscovered: false,
        };
      }
    },
    staleTime: 30_000,
  });

  const availableModels = adapterModelsData?.models ?? [];

  // Update selection and sync with persistence
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ADAPTER_KEY, selectedAdapterId);
  }, [selectedAdapterId]);

  useEffect(() => {
    if (selectedModelId) {
      localStorage.setItem(LOCAL_STORAGE_MODEL_KEY, selectedModelId);
    }
  }, [selectedModelId]);

  // Model synchronization when adapter models change
  useEffect(() => {
    if (!isModelsLoading && availableModels.length > 0) {
      const savedModel = localStorage.getItem(LOCAL_STORAGE_MODEL_KEY);
      const exists = availableModels.some((m) => m.id === selectedModelId || m.id === savedModel);

      if (exists) {
        if (!selectedModelId && savedModel) {
          setSelectedModelId(savedModel);
        }
        setModelWarning(null);
      } else {
        // Saved model is no longer available in this adapter
        if (selectedModelId && !availableModels.some((m) => m.id === selectedModelId)) {
          setModelWarning(
            `Saved model "${selectedModelId}" is not currently reported by ${selectedAdapterId}. Please select a verified model from the list below.`,
          );
        }
        // Auto-select first available verified model
        setSelectedModelId(availableModels[0].id);
      }
    }
  }, [availableModels, isModelsLoading, selectedAdapterId]);

  // ── Adapter Validation Mutation ─────────────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: () => {
      const config: Record<string, unknown> = {
        model: selectedModelId,
      };
      if (isOllamaCloud) {
        config.host = "https://ollama.com";
      }
      return modelDiscoveryApi.validateAdapter(actualAdapterType, config);
    },
    onSuccess: (data) => {
      setValidationResult(data);
    },
    onError: (err: any) => {
      setValidationResult({
        status: "fail",
        checks: [
          {
            code: "validation_failed",
            level: "error",
            message: err.message || "Adapter validation failed.",
          },
        ],
        testedAt: new Date().toISOString(),
      });
    },
  });

  // ── Task Execution Mutation ─────────────────────────────────────────────
  const executeTaskMutation = useMutation({
    mutationFn: () => {
      const config: Record<string, unknown> = {
        model: selectedModelId,
      };
      if (isOllamaCloud) {
        config.host = "https://ollama.com";
      }
      return modelDiscoveryApi.executeAdapterTask(actualAdapterType, {
        model: selectedModelId,
        prompt: taskPrompt,
        config,
      });
    },
    onSuccess: (data) => {
      setTaskResult(data);
    },
    onError: (err: any) => {
      setTaskResult({
        success: false,
        exitCode: 1,
        adapterType: actualAdapterType,
        modelUsed: selectedModelId,
        provider: actualAdapterType,
        errorMessage: err.message || "Execution failed",
      });
    },
  });

  // ── Legacy Catalog Query for Compatibility ──────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [filterToolCalling, setFilterToolCalling] = useState(false);
  const [filterVision, setFilterVision] = useState(false);
  const [filterStreaming, setFilterStreaming] = useState(false);
  const [filterJson, setFilterJson] = useState(false);

  const { data: catalog, isFetching: isCatalogFetching, refetch: refetchCatalog } = useQuery({
    queryKey: ["model-catalog", selectedProvider],
    queryFn: () => modelDiscoveryApi.getCatalog(selectedProvider === "all" ? "openai" : selectedProvider),
  });

  const { data: tokenData, refetch: refetchTokens } = useQuery({
    queryKey: ["model-token-usage"],
    queryFn: () => modelDiscoveryApi.getTokenUsage(),
    refetchInterval: 10000,
  });

  const [testPrompt, setTestPrompt] = useState("Perform multi-step intelligent code review and optimization analysis");
  const [simGlmFail, setSimGlmFail] = useState(false);
  const [simDeepseekFail, setSimDeepseekFail] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const testExecutionMutation = useMutation({
    mutationFn: (params: { prompt: string; simulateFailures: string[] }) =>
      modelDiscoveryApi.executeRouted(params),
    onSuccess: (data) => {
      setSimulationResult(data);
      refetchTokens();
    },
  });

  const resetTokensMutation = useMutation({
    mutationFn: (modelId?: string) => modelDiscoveryApi.resetTokens(modelId),
    onSuccess: () => {
      refetchTokens();
    },
  });

  const rawModels: DiscoveredModel[] = catalog?.models ?? [];
  const filteredCatalogModels = rawModels.filter((model) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = model.id.toLowerCase().includes(q) || model.name.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (selectedProvider !== "all" && model.provider.toLowerCase() !== selectedProvider.toLowerCase()) {
      return false;
    }
    if (filterToolCalling && !model.capabilities.toolCalling) return false;
    if (filterVision && !model.capabilities.vision) return false;
    if (filterStreaming && !model.capabilities.streaming) return false;
    if (filterJson && !model.capabilities.jsonOutput) return false;
    return true;
  });

  // Filter adapter models by search
  const filteredAdapterModels = availableModels.filter((m) => {
    if (!modelSearch.trim()) return true;
    const q = modelSearch.toLowerCase();
    return m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 pb-12">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Boxes className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Adapter-First Model Selection & Execution
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Dynamic AI Model Discovery with direct adapter routing, zero silent failovers, and always-on execution optimization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Zap className="h-3.5 w-3.5 text-emerald-500" />
            Ponytail Optimization Active
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchAdapterModels();
              refetchCatalog();
            }}
            disabled={isModelsFetching || isCatalogFetching}
            className="font-mono text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", (isModelsFetching || isCatalogFetching) && "animate-spin")} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* ── 5-Step Adapter & Model Workflow Container ───────────────────── */}
      <div className="space-y-6">
        {/* ── STEP 1: SELECT ADAPTER ────────────────────────────────────── */}
        <Card className="p-5 border border-border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-mono font-bold text-xs">
                1
              </span>
              <h2 className="text-sm font-semibold text-foreground">
                Select Adapter Engine
              </h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {SUPPORTED_ADAPTERS.length} Supported Adapters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {SUPPORTED_ADAPTERS.map((adapter) => {
              const isSelected = selectedAdapterId === adapter.id;
              return (
                <button
                  key={adapter.id}
                  onClick={() => {
                    if (selectedAdapterId !== adapter.id) {
                      setSelectedAdapterId(adapter.id);
                      setSelectedModelId("");
                      setValidationResult(null);
                      setTaskResult(null);
                      setModelWarning(null);
                    }
                  }}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between hover:border-primary/50",
                    isSelected
                      ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20"
                      : "bg-muted/20 border-border hover:bg-muted/40",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                        {adapter.name}
                      </span>
                      {adapter.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                          {adapter.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {adapter.description}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span className="uppercase">{adapter.category}</span>
                    <span className={cn(isSelected ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {isSelected ? "Active" : "Select"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── STEP 2 & 3: LOAD MODELS AUTOMATICALLY & SELECT MODEL ──────── */}
        <Card className="p-5 border border-border bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-mono font-bold text-xs">
                2 & 3
              </span>
              <h2 className="text-sm font-semibold text-foreground">
                Discovered Models for{" "}
                <span className="text-primary font-mono">
                  {SUPPORTED_ADAPTERS.find((a) => a.id === selectedAdapterId)?.name}
                </span>
              </h2>
              {adapterModelsData?.liveDiscovered && (
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Live Discovered
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Filter models…"
                  className="pl-8 h-8 text-xs font-mono"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchAdapterModels()}
                disabled={isModelsFetching}
                className="h-8 font-mono text-xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isModelsFetching && "animate-spin")} />
                Refresh Models
              </Button>
            </div>
          </div>

          {/* Model Warning / Alert */}
          {modelWarning && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>{modelWarning}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {isModelsLoading ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span>Querying live models from {selectedAdapterId}…</span>
            </div>
          ) : filteredAdapterModels.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground font-mono text-xs rounded-lg border border-dashed border-border">
              {availableModels.length === 0
                ? `No models discovered for ${selectedAdapterId}. Verify daemon or provider credentials.`
                : "No models match your search filter."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {filteredAdapterModels.map((model) => {
                const isSelected = selectedModelId === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModelId(model.id);
                      setModelWarning(null);
                    }}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all flex flex-col justify-between hover:border-primary/50",
                      isSelected
                        ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20"
                        : "bg-muted/20 border-border hover:bg-muted/30",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-xs font-semibold text-foreground truncate max-w-[180px]">
                          {model.id}
                        </span>
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {model.label || model.id}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span className="capitalize">{actualAdapterType.split("_")[0]}</span>
                      <span className={cn(isSelected ? "text-primary font-semibold" : "")}>
                        {isSelected ? "Selected" : "Pick"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Current Selection Confirmation */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div>
              <span className="text-muted-foreground">Target Execution Binding: </span>
              <span className="font-bold text-foreground">
                {selectedAdapterId}
              </span>{" "}
              <span className="text-muted-foreground">→</span>{" "}
              <span className="font-bold text-primary">
                {selectedModelId || "(Select a model)"}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Authentic backend dispatch · No silent fallbacks
            </div>
          </div>
        </Card>

        {/* ── STEP 4 & 5: VALIDATE & EXECUTE TASK ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Step 4: Connect & Validate */}
          <Card className="p-5 border border-border bg-card shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-mono font-bold text-xs">
                    4
                  </span>
                  <h2 className="text-sm font-semibold text-foreground">
                    Connect & Validate Adapter
                  </h2>
                </div>
                {validationResult && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-mono rounded border uppercase",
                      validationResult.status === "pass"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : validationResult.status === "warn"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
                    )}
                  >
                    {validationResult.status}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Validate connectivity, model availability, and authorization prior to task execution.
              </p>

              {validationResult ? (
                <div className="space-y-2 font-mono text-xs">
                  {validationResult.checks.map((c, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-2.5 rounded border text-xs flex items-start gap-2",
                        c.level === "error"
                          ? "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
                          : c.level === "warn"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
                            : "bg-muted/40 border-border text-foreground",
                      )}
                    >
                      {c.level === "error" ? (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      ) : c.level === "warn" ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">{c.code}</div>
                        <div className="text-[11px] opacity-90">{c.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/20 border border-border text-xs font-mono text-muted-foreground text-center">
                  Click Validate below to run an environment probe on {selectedAdapterId}.
                </div>
              )}
            </div>

            <Button
              onClick={() => validateMutation.mutate()}
              disabled={validateMutation.isPending || !selectedModelId}
              variant="outline"
              className="w-full font-mono text-xs mt-3"
            >
              <Activity className={cn("h-3.5 w-3.5 mr-1.5", validateMutation.isPending && "animate-spin")} />
              {validateMutation.isPending ? "Validating Environment…" : `Validate ${selectedAdapterId}`}
            </Button>
          </Card>

          {/* Step 5: Run My Task */}
          <Card className="p-5 border border-border bg-card shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-mono font-bold text-xs">
                    5
                  </span>
                  <h2 className="text-sm font-semibold text-foreground">
                    Run Task with Selected Target
                  </h2>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  Model: {selectedModelId || "None"}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-muted-foreground">Task Prompt:</label>
                <Textarea
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="Describe your task…"
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>

              {taskResult && (
                <div
                  className={cn(
                    "p-3 rounded-lg border font-mono text-xs space-y-2 animate-in fade-in",
                    taskResult.success
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-red-500/5 border-red-500/20",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      {taskResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      Execution via: <span className="text-primary">{taskResult.modelUsed}</span>
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Exit: {taskResult.exitCode}
                    </span>
                  </div>

                  {taskResult.errorMessage && (
                    <div className="text-red-600 dark:text-red-400 text-xs">
                      {taskResult.errorMessage}
                    </div>
                  )}

                  {taskResult.response && (
                    <div className="p-2 rounded bg-card border border-border text-xs max-h-36 overflow-y-auto whitespace-pre-wrap text-foreground">
                      {taskResult.response}
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Tokens: {taskResult.usage?.inputTokens ?? 0} in / {taskResult.usage?.outputTokens ?? 0} out</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Ponytail Layer Applied</span>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => executeTaskMutation.mutate()}
              disabled={executeTaskMutation.isPending || !selectedModelId || !taskPrompt.trim()}
              className="w-full font-mono text-xs mt-3"
            >
              <Play className={cn("h-3.5 w-3.5 mr-1.5", executeTaskMutation.isPending && "animate-spin")} />
              {executeTaskMutation.isPending
                ? "Executing Task via " + selectedModelId + "…"
                : `Run Task with ${selectedModelId || "Selected Model"}`}
            </Button>
          </Card>
        </div>
      </div>

      {/* ── Auto-Failover Telemetry & Catalog View ──────────────────────── */}
      <Card className="p-5 border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-foreground">
              Intelligent Hybrid Cloud Failover Pipeline
            </h2>
            <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Zero Downtime Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetTokensMutation.mutate(undefined)}
              disabled={resetTokensMutation.isPending}
              className="font-mono text-xs h-7"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset Token Quotas
            </Button>
          </div>
        </div>

        {/* 3-Tier Failover Ladder Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Tier 1: glm-5.3-flash:cloud */}
          {(() => {
            const usage = tokenData?.usage?.find((u) => u.modelId === "glm-5.3-flash:cloud") || {
              totalTokens: 0,
              tokenLimit: 100000,
              limitReached: false,
              requestCount: 0,
            };
            const pct = Math.min(100, Math.round((usage.totalTokens / (usage.tokenLimit || 1)) * 100));

            return (
              <div
                className={cn(
                  "p-3 rounded-lg border transition-all relative flex flex-col justify-between",
                  usage.limitReached ? "bg-amber-500/5 border-amber-500/30" : "bg-muted/40 border-border",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-mono uppercase font-semibold text-primary">
                      Tier 1: Primary Ollama
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-xs font-mono rounded",
                        usage.limitReached
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {usage.limitReached ? "Limit Reached" : "Active"}
                    </span>
                  </div>

                  <div className="font-mono text-xs font-semibold text-foreground">
                    glm-5.3-flash:cloud
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Default fast inference model via Ollama
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground">
                      <span>Tokens Consumed:</span>
                      <span className="font-semibold text-foreground">
                        {usage.totalTokens.toLocaleString()} / {usage.tokenLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          usage.limitReached ? "bg-amber-500" : "bg-primary",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Reqs: {usage.requestCount}</span>
                  <span className="flex items-center gap-1 text-primary">
                    Auto-rollover <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Tier 2: deepseek-v4.1-flash:cloud */}
          {(() => {
            const usage = tokenData?.usage?.find((u) => u.modelId === "deepseek-v4.1-flash:cloud") || {
              totalTokens: 0,
              tokenLimit: 100000,
              limitReached: false,
              requestCount: 0,
            };
            const pct = Math.min(100, Math.round((usage.totalTokens / (usage.tokenLimit || 1)) * 100));

            return (
              <div
                className={cn(
                  "p-3 rounded-lg border transition-all relative flex flex-col justify-between",
                  usage.limitReached ? "bg-amber-500/5 border-amber-500/30" : "bg-muted/40 border-border",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-xs font-mono uppercase font-semibold text-primary">
                      Tier 2: Secondary Ollama
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-xs font-mono rounded",
                        usage.limitReached
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      )}
                    >
                      {usage.limitReached ? "Limit Reached" : "Auto Standby"}
                    </span>
                  </div>

                  <div className="font-mono text-xs font-semibold text-foreground">
                    deepseek-v4.1-flash:cloud
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Seamless fallback when Tier 1 quota exhausted
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground">
                      <span>Tokens Consumed:</span>
                      <span className="font-semibold text-foreground">
                        {usage.totalTokens.toLocaleString()} / {usage.tokenLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          usage.limitReached ? "bg-amber-500" : "bg-blue-500",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Reqs: {usage.requestCount}</span>
                  <span className="flex items-center gap-1 text-primary">
                    Cloud rollover <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Tier 3: Cloud Fallback */}
          <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-mono uppercase font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Cloud className="h-3.5 w-3.5" /> Tier 3: Cloud Fallback
                </span>
                <span className="px-1.5 py-0.5 text-xs font-mono rounded bg-purple-500/20 text-purple-600 dark:text-purple-400">
                  Always Ready
                </span>
              </div>

              <div className="font-mono text-xs font-semibold text-foreground">
                gpt-4o-mini / claude-3-5 / gemini
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Automatic cloud execution when both Ollama quotas are reached
              </div>

              <div className="mt-3 space-y-1 text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>OpenAI gpt-4o-mini</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Anthropic claude-3-5-sonnet</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>OpenRouter Auto-Routing</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-purple-500/20 flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span className="text-purple-600 dark:text-purple-400">Fail-safe Guard</span>
              <span>100% Uptime SLA</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Dynamic AI Model Discovery Filter & Catalog ───────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Dynamic AI Model Discovery
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discovered models by identifier, name, or family…"
                className="pl-9 font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["all", "openai", "anthropic", "google", "openrouter", "ollama"].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProvider(p)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono rounded-md border transition-colors capitalize",
                    selectedProvider === p
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono overflow-x-auto">
            <span className="text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3" /> Filters:
            </span>

            <button
              onClick={() => setFilterToolCalling((v) => !v)}
              className={cn(
                "px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5",
                filterToolCalling
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <Wrench className="h-3 w-3" /> Tools
            </button>

            <button
              onClick={() => setFilterVision((v) => !v)}
              className={cn(
                "px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5",
                filterVision
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <Eye className="h-3 w-3" /> Vision
            </button>

            <button
              onClick={() => setFilterStreaming((v) => !v)}
              className={cn(
                "px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5",
                filterStreaming
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <Zap className="h-3 w-3" /> Streaming
            </button>

            <button
              onClick={() => setFilterJson((v) => !v)}
              className={cn(
                "px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5",
                filterJson
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <Code2 className="h-3 w-3" /> JSON Output
            </button>
          </div>
        </div>

        {/* Catalog Cards */}
        {filteredCatalogModels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCatalogModels.map((model) => (
              <Card key={model.id} className="p-4 border border-border bg-card flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                        {model.provider}
                      </span>
                      <h3 className="text-sm font-semibold font-mono text-foreground break-all mt-0.5">
                        {model.name}
                      </h3>
                    </div>

                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-mono font-medium rounded border shrink-0",
                        model.provider === "ollama" && (model.rawMetadata?.isLocal === false || model.id.includes(":cloud") || model.name.includes("Cloud"))
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                          : model.source === "live_api"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border",
                      )}
                    >
                      {model.provider === "ollama" && (model.rawMetadata?.isLocal === false || model.id.includes(":cloud") || model.name.includes("Cloud"))
                        ? "CLOUD"
                        : model.provider === "ollama"
                          ? "LOCAL"
                          : model.source === "live_api"
                            ? "LIVE"
                            : "CACHED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono p-2.5 rounded bg-muted/40 border border-border">
                    <div>
                      <span className="text-muted-foreground block text-xs">Context Window</span>
                      <span className="text-foreground font-semibold">
                        {model.contextWindow ? `${formatTokens(model.contextWindow)} tokens` : "Not reported"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Max Output</span>
                      <span className="text-foreground font-semibold">
                        {model.maxOutputTokens ? `${formatTokens(model.maxOutputTokens)} tokens` : "Standard"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {model.capabilities.toolCalling && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-muted text-foreground border border-border">
                        <Wrench className="h-2.5 w-2.5" /> Tools
                      </span>
                    )}
                    {model.capabilities.vision && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-muted text-foreground border border-border">
                        <Eye className="h-2.5 w-2.5" /> Vision
                      </span>
                    )}
                    {model.capabilities.streaming && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-muted text-foreground border border-border">
                        <Zap className="h-2.5 w-2.5" /> Stream
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground font-mono text-xs rounded-lg border border-dashed border-border">
            No models found in current catalog view.
          </div>
        )}
      </div>
    </div>
  );
}
