import type {
  ChatHandoffInput,
  ChatHandoffResult,
  ChatThreadSummary,
  ConversationScope,
  Issue,
} from "@geetorusai/shared";
import { api } from "./client";

export const agentChatsApi = {
  get: (companyId: string, agentRef: string) =>
    api.get<Issue | null>(
      `/companies/${companyId}/chats/${encodeURIComponent(agentRef)}`,
    ),
  ensure: (companyId: string, agentRef: string) =>
    api.post<Issue>(
      `/companies/${companyId}/chats/${encodeURIComponent(agentRef)}`,
      {},
    ),
  list: (
    companyId: string,
    filters?: {
      scope?: ConversationScope;
      agentId?: string;
      projectId?: string;
      taskId?: string;
    },
  ) => {
    const params = new URLSearchParams();
    if (filters?.scope) params.set("scope", filters.scope);
    if (filters?.agentId) params.set("agentId", filters.agentId);
    if (filters?.projectId) params.set("projectId", filters.projectId);
    if (filters?.taskId) params.set("taskId", filters.taskId);
    const query = params.toString();
    return api.get<ChatThreadSummary[]>(
      `/companies/${companyId}/chats${query ? `?${query}` : ""}`,
    );
  },
  createOrResolve: (
    companyId: string,
    payload: {
      agentId: string;
      scope?: ConversationScope;
      projectId?: string;
      taskId?: string;
      title?: string;
    },
  ) => api.post<Issue>(`/companies/${companyId}/chats`, payload),
  handoff: (companyId: string, issueId: string, payload: ChatHandoffInput) =>
    api.post<ChatHandoffResult>(
      `/companies/${companyId}/chats/${issueId}/handoff`,
      payload,
    ),
  getStreamUrl: (companyId: string, issueId: string) =>
    `/api/companies/${encodeURIComponent(companyId)}/chats/${encodeURIComponent(issueId)}/stream`,
};
