import { useState } from "react";
import { MessageSquare, Bot, Folder, CheckSquare, Plus, Loader2 } from "lucide-react";
import type { Agent, ConversationScope, Project } from "@geetorusai/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NewChatThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
  projects: Project[];
  onSubmit: (data: {
    agentId: string;
    scope: ConversationScope;
    projectId?: string;
    title?: string;
  }) => Promise<void>;
}

export function NewChatThreadDialog({
  open,
  onOpenChange,
  agents,
  projects,
  onSubmit,
}: NewChatThreadDialogProps) {
  const [agentId, setAgentId] = useState(agents[0]?.id || "");
  const [scope, setScope] = useState<ConversationScope>("agent");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId) return;
    setSubmitting(true);
    try {
      await onSubmit({
        agentId,
        scope,
        projectId: scope === "project" ? projectId : undefined,
        title: title.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>New Conversation</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Start a persistent thread with an agent, optionally scoped to a project or task.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="thread-agent" className="text-xs font-medium">
                Agent
              </Label>
              <select
                id="thread-agent"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                required
                className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Thread Scope</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={scope === "agent" ? "secondary" : "outline"}
                  onClick={() => setScope("agent")}
                  className="h-8 text-xs gap-1"
                >
                  <Bot className="h-3 w-3" />
                  <span>Agent 1:1</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scope === "project" ? "secondary" : "outline"}
                  onClick={() => setScope("project")}
                  className="h-8 text-xs gap-1"
                >
                  <Folder className="h-3 w-3" />
                  <span>Project</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scope === "task" ? "secondary" : "outline"}
                  onClick={() => setScope("task")}
                  className="h-8 text-xs gap-1"
                >
                  <CheckSquare className="h-3 w-3" />
                  <span>Task</span>
                </Button>
              </div>
            </div>

            {scope === "project" && (
              <div className="space-y-1">
                <Label htmlFor="thread-project" className="text-xs font-medium">
                  Associated Project
                </Label>
                <select
                  id="thread-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                  className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="thread-title" className="text-xs font-medium">
                Thread Topic (Optional)
              </Label>
              <Input
                id="thread-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Planning Q4 Roadmap"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !agentId}
              className="text-xs h-8 gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Starting…</span>
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  <span>Start Chat</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
