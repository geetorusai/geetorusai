# Geetorus MCP Server

Model Context Protocol server for Geetorus.

This package is a thin MCP wrapper over the existing Geetorus REST API. It does
not talk to the database directly and it does not reimplement business logic.

## Authentication

The server reads its configuration from environment variables:

- `GEETORUS_API_URL` - Geetorus base URL, for example `http://localhost:3100`
- `GEETORUS_API_KEY` - bearer token used for `/api` requests
- `GEETORUS_COMPANY_ID` - optional default company for company-scoped tools
- `GEETORUS_AGENT_ID` - optional default agent for checkout helpers
- `GEETORUS_RUN_ID` - optional run id forwarded on mutating requests

Inside an active heartbeat, Geetorus also injects `GEETORUS_RUNTIME_TOOLS_*` variables. They enable the run-scoped `connections_search` and `connection_request` tools and expire with the run.

## Usage

```sh
npx -y @geetorusai/mcp-server
```

Or locally in this repo:

```sh
pnpm --filter @geetorusai/mcp-server build
node packages/mcp-server/dist/stdio.js
```

## Tool Surface

Run-scoped connection tools:

- `connections_search`
- `connection_request`

Read tools:

- `geetorusMe`
- `geetorusInboxLite`
- `geetorusListAgents`
- `geetorusGetAgent`
- `geetorusListIssues`
- `geetorusGetIssue`
- `geetorusGetHeartbeatContext`
- `geetorusListComments`
- `geetorusGetComment`
- `geetorusListIssueApprovals`
- `geetorusListDocuments`
- `geetorusGetDocument`
- `geetorusListDocumentRevisions`
- `geetorusListProjects`
- `geetorusGetProject`
- `geetorusGetIssueWorkspaceRuntime`
- `geetorusWaitForIssueWorkspaceService`
- `geetorusListGoals`
- `geetorusGetGoal`
- `geetorusListApprovals`
- `geetorusGetApproval`
- `geetorusGetApprovalIssues`
- `geetorusListApprovalComments`

Write tools:

- `geetorusCreateIssue`
- `geetorusUpdateIssue`
- `geetorusCheckoutIssue`
- `geetorusReleaseIssue`
- `geetorusAddComment`
- `geetorusSuggestTasks`
- `geetorusAskUserQuestions`
- `geetorusRequestConfirmation`
- `geetorusUpsertIssueDocument`
- `geetorusRestoreIssueDocumentRevision`
- `geetorusControlIssueWorkspaceServices`
- `geetorusCreateApproval`
- `geetorusLinkIssueApproval`
- `geetorusUnlinkIssueApproval`
- `geetorusApprovalDecision`
- `geetorusAddApprovalComment`

Escape hatch:

- `geetorusApiRequest`

`geetorusApiRequest` is limited to paths under `/api` and JSON bodies. It is
meant for endpoints that do not yet have a dedicated MCP tool.
