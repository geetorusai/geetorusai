export type GeetorusSemanticActionId =
  | "search_api"
  | "call_api"
  | "get_task_context"
  | "get_task_history"
  | "list_documents"
  | "read_document"
  | "list_document_revisions"
  | "report_progress"
  | "answer_status_question"
  | "write_document"
  | "request_human_input"
  | "register_deliverable"
  | "finish_task"
  | "block_task"
  | "request_review"
  | "list_agents"
  | "get_agent"
  | "search_tasks"
  | "list_approvals"
  | "get_approval"
  | "get_approval_context"
  | "get_workspace_runtime"
  | "control_workspace_service"
  | "set_dependencies"
  | "create_skill"
  | "create_project"
  | "list_project_repositories"
  | "list_projects"
  | "create_task"
  | "request_approval"
  | "decide_approval"
  | "comment_on_approval"
  | "schedule_wake";

export type GeetorusSemanticActionPlacement = "always" | "optional";
export type GeetorusSemanticActionMode =
  "standard" | "ask" | "planning" | "skill_test";
export type GeetorusSemanticActionEffect = "read" | "write" | "governance";

export type GeetorusJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly GeetorusJsonValue[]
  | { readonly [key: string]: GeetorusJsonValue };

/** The JSON Schema subset used by the v1 semantic action catalog. */
export interface GeetorusJsonSchema {
  readonly type?: string | readonly string[];
  readonly title?: string;
  readonly description?: string;
  readonly properties?: Readonly<Record<string, GeetorusJsonSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | GeetorusJsonSchema;
  readonly items?: GeetorusJsonSchema;
  readonly enum?: readonly GeetorusJsonValue[];
  readonly oneOf?: readonly GeetorusJsonSchema[];
  readonly anyOf?: readonly GeetorusJsonSchema[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly uniqueItems?: boolean;
  readonly pattern?: string;
  readonly format?: string;
  readonly default?: GeetorusJsonValue;
}

/**
 * A transport-neutral declaration. Catalog membership never grants discovery
 * or invocation authority; a run-scoped authorization layer must do that.
 */
export interface GeetorusSemanticActionDescriptor {
  readonly schema: "geetorus.semantic-action.v1";
  readonly operationId: GeetorusSemanticActionId;
  readonly version: 1;
  readonly title: string;
  readonly description: string;
  readonly placement: GeetorusSemanticActionPlacement;
  readonly effect: GeetorusSemanticActionEffect;
  readonly requiredClaims: readonly string[];
  readonly allowedModes: readonly GeetorusSemanticActionMode[];
  readonly allowedRoles?: readonly string[];
  readonly inputSchema: GeetorusJsonSchema;
  readonly outputSchema: GeetorusJsonSchema;
}
