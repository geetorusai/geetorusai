import { useQuery } from "@tanstack/react-query";
import { Brain, ShieldCheck, Tag, Info, FileText } from "lucide-react";
import { memoryApi } from "../api/memory";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface TaskMemoryUsedPanelProps {
  companyId: string;
  runId: string;
}

export function TaskMemoryUsedPanel({ companyId, runId }: TaskMemoryUsedPanelProps) {
  const { data: usages, isLoading } = useQuery({
    queryKey: ["task-memories", companyId, runId],
    queryFn: () => memoryApi.getRunMemories(companyId, runId),
    enabled: Boolean(companyId && runId),
  });

  if (isLoading) {
    return (
      <Card className="p-3 border border-border/60 bg-muted/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span>Loading retrieved memory context...</span>
        </div>
      </Card>
    );
  }

  if (!usages || usages.length === 0) {
    return (
      <Card className="p-3 border border-border/60 bg-muted/10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <span>No durable memory items were injected on this run.</span>
        </div>
      </Card>
    );
  }

  const totalInjectedTokens = usages.reduce((acc, u) => acc + (u.injectedTokens || 0), 0);

  return (
    <Card className="p-4 border border-border/80 bg-card/60 space-y-3">
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
            <Brain className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">
              Durable Memory Context Injected
            </h4>
            <p className="text-(length:--text-micro) text-muted-foreground">
              {usages.length} knowledge item(s) • ~{totalInjectedTokens.toLocaleString()} tokens
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-(length:--text-micro) border-primary/20 text-primary">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Verified Context
        </Badge>
      </div>

      <div className="space-y-2">
        {usages.map((u) => {
          const item = u.item;
          if (!item) return null;

          return (
            <div
              key={u.id}
              className="rounded-md border border-border/50 bg-background/50 p-2.5 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <span className="uppercase text-(length:--text-micro) font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground">
                    {item.type}
                  </span>
                  <span>{item.title}</span>
                </div>
                <span className="text-(length:--text-micro) text-muted-foreground font-mono">
                  Score: {(u.score * 100).toFixed(0)}%
                </span>
              </div>

              <p className="text-(length:--text-micro) text-muted-foreground line-clamp-2">
                {item.content}
              </p>

              <div className="flex items-center gap-2 pt-1 text-(length:--text-micro) text-muted-foreground border-t border-border/30">
                <span>Scope: <strong className="text-foreground">{item.scope}</strong></span>
                <span>•</span>
                <span>Source: <strong className="text-foreground">{item.source}</strong></span>
                {item.tags.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-2.5 w-2.5" />
                      {item.tags.slice(0, 3).join(", ")}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
