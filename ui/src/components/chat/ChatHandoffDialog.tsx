import { useState } from "react";
import { CheckSquare, ArrowRight, Loader2 } from "lucide-react";
import type { Agent, Project } from "@geetorusai/shared";
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

interface ChatHandoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle: string;
  defaultPlan?: string;
  agents: Agent[];
  projects: Project[];
  defaultAgentId?: string;
  defaultProjectId?: string;
  onSubmit: (data: {
    title: string;
    assigneeAgentId?: string;
    projectId?: string;
    priority: "low" | "medium" | "high" | "urgent";
    initialPlan?: string;
  }) => Promise<void>;
}

export function ChatHandoffDialog({
  open,
  onOpenChange,
  defaultTitle,
  defaultPlan = "",
  agents,
  projects,
  defaultAgentId,
  defaultProjectId,
  onSubmit,
}: ChatHandoffDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [assigneeAgentId, setAssigneeAgentId] = useState(defaultAgentId || "");
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [plan, setPlan] = useState(defaultPlan);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        assigneeAgentId: assigneeAgentId || undefined,
        projectId: projectId || undefined,
        priority,
        initialPlan: plan.trim() || undefined,
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
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>Turn into a Task</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Hand off this discussion to an assigned task. The new task will link directly back to this conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="task-title" className="text-xs font-medium">
                Task Title
              </Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement user authentication"
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="task-assignee" className="text-xs font-medium">
                  Assignee
                </Label>
                <select
                  id="task-assignee"
                  value={assigneeAgentId}
                  onChange={(e) => setAssigneeAgentId(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background"
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="task-project" className="text-xs font-medium">
                  Project
                </Label>
                <select
                  id="task-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background"
                >
                  <option value="">No Project</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-priority" className="text-xs font-medium">
                Priority
              </Label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-plan" className="text-xs font-medium">
                Initial Plan / Instructions (Markdown)
              </Label>
              <textarea
                id="task-plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="Include initial requirements or approved plan..."
                rows={3}
                className="w-full p-2 text-xs rounded-md border border-input bg-background font-mono resize-none"
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
              disabled={submitting || !title.trim()}
              className="text-xs h-8 gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Creating…</span>
                </>
              ) : (
                <>
                  <span>Create Task</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
