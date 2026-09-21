// Pure mapping layer for Geetorus 2D Virtual Office
// Zero DOM, Zero Canvas, Zero React dependencies. 100% unit-testable.

import type {
  Agent,
  AgentStatus,
  PauseReason,
  HeartbeatRunStatus,
  Approval,
  ApprovalStatus,
  Issue,
  IssueStatus,
} from '@geetorusai/shared';

import {
  OFFICE_CHARACTERS,
  CONFERENCE_SEATS,
  BREAKROOM_SEATS,
  type OfficeCharacter,
  type PresenceState,
  type OfficeEventKind,
} from './officeConstants';

export interface RunLike {
  id: string;
  agentId: string;
  status: string;
  currentToolName?: string | null;
  currentStatusMessage?: string | null;
  issueId?: string | null;
  createdAt?: string | Date;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
}

export interface OrgNodeLike {
  id: string;
  name: string;
  role: string;
  status: string;
  reports?: OrgNodeLike[];
}

export interface AgentSimState {
  agentId: string;
  characterId: string;
  presence: PresenceState;
  state: 'working' | 'walking' | 'idle_chat' | 'coffee' | 'meeting' | 'panic' | 'phone';
  targetTile: { x: number; y: number };
  facing?: 'up' | 'down' | 'left' | 'right';
  visible: boolean;
  greyed: boolean;
  badge?: string;
  bubbleText?: string;
  precedenceLevel: number;
  dwellUntilMs: number;
  assignedDesk: { x: number; y: number };
}

export interface NormalizedAgentInput {
  agent: Agent;
  activeRun?: RunLike | null;
  assignedIssue?: Issue | null;
  pendingApproval?: Approval | null;
  collaboratingWithAgentIds?: string[];
  now?: number;
}

// ── Precedence Levels ─────────────────────────────────────────────────────────
export const PRECEDENCE = {
  BUDGET_HARD_STOP: 10,
  RUN_FAILED: 9,
  TERMINATED: 8,
  PAUSED: 7,
  BLOCKED_OR_APPROVAL: 6,
  TOOL_CALL: 5,
  WORKING_RUNNING: 4,
  QUEUED_OR_WAKEUP: 3,
  COLLABORATING: 2,
  IDLE_OR_ACTIVE: 1,
  UNKNOWN_FALLBACK: 0,
} as const;

// ── Rate-limited logging for unknown statuses ─────────────────────────────────
const unknownStatusesLogged = new Set<string>();

export function logUnknownStatusOnce(kind: string, value: string) {
  const key = `${kind}:${value}`;
  if (!unknownStatusesLogged.has(key)) {
    unknownStatusesLogged.add(key);
    // Silent in production tests, logs once per session
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[OfficeMapping] Unknown ${kind} received: "${value}". Defaulting safely to idle.`);
    }
  }
}

export function resetUnknownStatusLogForTests() {
  unknownStatusesLogged.clear();
}

// ── Privacy & Least-Privilege Sanitization ───────────────────────────────────
export function sanitizeBubbleText(rawText: string | null | undefined, maxLen = 50): string {
  if (!rawText) return '';
  let clean = rawText
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[token]') // Redact high-entropy token strings
    .replace(/(bearer\s+)[^\s]+/gi, '$1[redacted]')
    .replace(/\{\{.*?\}\}/g, '') // Prompt brackets
    .trim();

  if (clean.length > maxLen) {
    clean = clean.slice(0, maxLen - 1) + '…';
  }
  return clean;
}

export function sanitizeToolName(toolName: string | null | undefined): string {
  if (!toolName) return 'tool';
  let clean = toolName.includes(':') ? toolName.split(':').pop()! : toolName;
  if (clean.includes('/')) clean = clean.split('/').pop()!;
  if (clean.startsWith('mcp__')) clean = clean.slice(5);
  return clean.slice(0, 32);
}

// ── Stable Deterministic Hash ────────────────────────────────────────────────
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ── Agent-to-Character Assignment ────────────────────────────────────────────
export function assignAgentsToCharacters(
  agents: Agent[],
  orgTree: OrgNodeLike[] = []
): Map<string, OfficeCharacter> {
  const assignment = new Map<string, OfficeCharacter>();
  if (agents.length === 0) return assignment;

  // 1. Identify CEO / top executive
  let ceoAgentId: string | null = null;

  // Check role first
  const ceoByRole = agents.find((a) => a.role === 'ceo' && a.status !== 'terminated');
  if (ceoByRole) {
    ceoAgentId = ceoByRole.id;
  } else if (orgTree.length > 0) {
    // Top root of org tree
    const root = orgTree[0];
    const candidate = agents.find((a) => a.id === root.id && a.status !== 'terminated');
    if (candidate) ceoAgentId = candidate.id;
  } else {
    // First agent without reportsTo
    const rootAgent = agents.find((a) => !a.reportsTo && a.status !== 'terminated');
    if (rootAgent) ceoAgentId = rootAgent.id;
  }

  const managerChar = OFFICE_CHARACTERS.find((c) => c.id === 'michael') ?? OFFICE_CHARACTERS[0];
  const remainingChars = OFFICE_CHARACTERS.filter((c) => c.id !== managerChar.id);

  // 2. Identify managers (agents with reports)
  const managerAgentIds = new Set<string>();
  agents.forEach((a) => {
    if (a.reportsTo) managerAgentIds.add(a.reportsTo);
  });

  // Assign CEO to manager's office
  if (ceoAgentId) {
    assignment.set(ceoAgentId, managerChar);
  }

  // Sort other agents deterministically: Managers first, then by role, then by ID hash
  const nonCeoAgents = agents
    .filter((a) => a.id !== ceoAgentId)
    .sort((a, b) => {
      const aIsMgr = managerAgentIds.has(a.id) ? 1 : 0;
      const bIsMgr = managerAgentIds.has(b.id) ? 1 : 0;
      if (aIsMgr !== bIsMgr) return bIsMgr - aIsMgr;
      const roleComp = (a.role || '').localeCompare(b.role || '');
      if (roleComp !== 0) return roleComp;
      return a.id.localeCompare(b.id);
    });

  // Assign remaining agents to remaining character definitions
  nonCeoAgents.forEach((agent, index) => {
    if (index < remainingChars.length) {
      assignment.set(agent.id, remainingChars[index]);
    } else {
      // Overflow (>16 agents): Deterministically assign a generic sprite based on index
      const baseChar = remainingChars[index % remainingChars.length];
      const overflowChar: OfficeCharacter = {
        ...baseChar,
        id: `overflow_${agent.id}`,
        displayName: agent.name || `Agent ${agent.id.slice(0, 6)}`,
        title: agent.title || agent.role,
        deskCoord: CONFERENCE_SEATS[index % CONFERENCE_SEATS.length],
      };
      assignment.set(agent.id, overflowChar);
    }
  });

  return assignment;
}

// ── State Mapping Engine ─────────────────────────────────────────────────────

export function mapAgentToSimState(
  input: NormalizedAgentInput,
  characterDef: OfficeCharacter,
  previousState?: AgentSimState | null
): AgentSimState {
  const {
    agent,
    activeRun,
    assignedIssue,
    pendingApproval,
    collaboratingWithAgentIds = [],
    now = Date.now(),
  } = input;

  const defaultDesk = characterDef.deskCoord;
  const defaultFacing = characterDef.deskFacing;

  // If in dwell period and new state has lower precedence, preserve previous state
  const isDwellLocked = previousState && now < previousState.dwellUntilMs;

  let candidatePrecedence: number = PRECEDENCE.IDLE_OR_ACTIVE;
  let candidatePresence: PresenceState = 'working';
  let candidateState: AgentSimState['state'] = 'working';
  let candidateTarget: { x: number; y: number } = defaultDesk;
  let candidateVisible = true;
  let candidateGreyed = false;
  let candidateBadge: string | undefined = undefined;
  let candidateBubble: string | undefined = undefined;
  let dwellDurationMs = 2000;

  // ── Precedence Rule 1: Budget Hard-Stop ───────────────────────────────────
  const isBudgetStopped =
    (agent.status === 'paused' && agent.pauseReason === 'budget') ||
    (agent.budgetMonthlyCents > 0 && agent.spentMonthlyCents >= agent.budgetMonthlyCents);

  if (isBudgetStopped) {
    candidatePrecedence = PRECEDENCE.BUDGET_HARD_STOP;
    candidatePresence = 'offline';
    candidateState = 'panic';
    candidateTarget = defaultDesk;
    candidateGreyed = true;
    candidateBadge = 'OVER BUDGET';
    candidateBubble = 'Budget hard-stop reached';
    dwellDurationMs = 5000;
  }
  // ── Precedence Rule 2: Run Failed / Interrupted / Timed Out ───────────────
  else if (
    activeRun &&
    (activeRun.status === 'failed' ||
      activeRun.status === 'interrupted' ||
      activeRun.status === 'timed_out')
  ) {
    candidatePrecedence = PRECEDENCE.RUN_FAILED;
    candidatePresence = 'focus';
    candidateState = 'panic';
    candidateTarget = defaultDesk;
    candidateBadge = 'FAILED';
    candidateBubble = sanitizeBubbleText(activeRun.currentStatusMessage || 'Run failed: checking errors');
    dwellDurationMs = 4000;
  }
  // ── Precedence Rule 3: Terminated ─────────────────────────────────────────
  else if (agent.status === 'terminated') {
    candidatePrecedence = PRECEDENCE.TERMINATED;
    candidatePresence = 'offline';
    candidateState = 'working';
    candidateVisible = false;
    dwellDurationMs = 5000;
  }
  // ── Precedence Rule 4: Paused (Manual / System) ───────────────────────────
  else if (agent.status === 'paused') {
    candidatePrecedence = PRECEDENCE.PAUSED;
    candidatePresence = 'away';
    candidateState = 'idle_chat';
    candidateGreyed = true;
    // Walk to break room table seat
    candidateTarget = BREAKROOM_SEATS[0];
    candidateBadge = 'PAUSED';
    candidateBubble = 'Agent paused';
    dwellDurationMs = 3000;
  }
  // ── Precedence Rule 5: Awaiting Approval or Blocked Dependency ────────────
  else if (
    (pendingApproval && pendingApproval.status === 'pending') ||
    (assignedIssue && assignedIssue.status === 'blocked')
  ) {
    candidatePrecedence = PRECEDENCE.BLOCKED_OR_APPROVAL;
    candidatePresence = 'meeting';
    candidateState = 'idle_chat';
    // Stand near manager office doorway [8, 8] or conference room
    candidateTarget = { x: 8, y: 8 };
    if (pendingApproval) {
      candidateBadge = 'APPROVAL';
      candidateBubble = sanitizeBubbleText(`Awaiting approval: ${pendingApproval.type}`);
    } else {
      candidateBadge = 'BLOCKED';
      candidateBubble = sanitizeBubbleText(`Blocked on: ${assignedIssue?.title || 'task'}`);
    }
    dwellDurationMs = 3000;
  }
  // ── Precedence Rule 6: Tool / MCP / External Call in Progress ────────────
  else if (activeRun && activeRun.status === 'running' && activeRun.currentToolName) {
    candidatePrecedence = PRECEDENCE.TOOL_CALL;
    candidatePresence = 'focus';
    candidateState = 'phone';
    candidateTarget = defaultDesk;
    candidateBadge = 'TOOL CALL';
    candidateBubble = `Tool: ${sanitizeToolName(activeRun.currentToolName)}`;
    dwellDurationMs = 2000;
  }
  // ── Precedence Rule 7: Active Running Task ────────────────────────────────
  else if (activeRun && activeRun.status === 'running') {
    candidatePrecedence = PRECEDENCE.WORKING_RUNNING;
    candidatePresence = 'working';
    candidateState = 'working';
    candidateTarget = defaultDesk;
    if (assignedIssue?.title) {
      candidateBubble = `Task: ${sanitizeBubbleText(assignedIssue.title, 40)}`;
    } else if (activeRun.currentStatusMessage) {
      candidateBubble = sanitizeBubbleText(activeRun.currentStatusMessage, 40);
    }
    dwellDurationMs = 2000;
  }
  // ── Precedence Rule 8: Queued / Scheduled Retry / Wakeup Pending ──────────
  else if (
    activeRun &&
    (activeRun.status === 'queued' || activeRun.status === 'scheduled_retry')
  ) {
    candidatePrecedence = PRECEDENCE.QUEUED_OR_WAKEUP;
    candidatePresence = 'focus';
    candidateState = 'working';
    candidateTarget = defaultDesk;
    candidateBadge = 'QUEUED';
    candidateBubble = 'Queued for execution';
    dwellDurationMs = 2000;
  }
  // ── Precedence Rule 9: Multi-Agent Collaboration ──────────────────────────
  else if (collaboratingWithAgentIds.length > 0) {
    candidatePrecedence = PRECEDENCE.COLLABORATING;
    candidatePresence = 'meeting';
    candidateState = 'meeting';
    candidateTarget = CONFERENCE_SEATS[0];
    candidateBubble = 'Group conference';
    dwellDurationMs = 4000;
  }
  // ── Precedence Rule 10: Idle / Active Agent ───────────────────────────────
  else if (agent.status === 'active' || agent.status === 'idle') {
    candidatePrecedence = PRECEDENCE.IDLE_OR_ACTIVE;
    const lastActive = agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).getTime() : 0;
    const idleDurationMs = now - lastActive;

    // After 5 minutes of inactivity without work, drift to breakroom for coffee
    if (lastActive > 0 && idleDurationMs > 5 * 60 * 1000) {
      candidatePresence = 'break';
      candidateState = 'coffee';
      candidateTarget = { x: 36, y: 5 }; // Coffee machine stand tile
      candidateBubble = 'Coffee break';
      dwellDurationMs = 6000;
    } else {
      candidatePresence = 'working';
      candidateState = 'working';
      candidateTarget = defaultDesk;
      dwellDurationMs = 2000;
    }
  }
  // ── Precedence Rule 11: Unknown or Error Status ────────────────────────────
  else {
    candidatePrecedence = PRECEDENCE.UNKNOWN_FALLBACK;
    logUnknownStatusOnce('AgentStatus', String(agent.status));
    candidatePresence = 'away';
    candidateState = 'working';
    candidateTarget = defaultDesk;
    dwellDurationMs = 2000;
  }

  // Anti-flicker dwell lock check:
  // If previously locked and new event has lower or equal precedence, maintain previous
  if (isDwellLocked && previousState && candidatePrecedence <= previousState.precedenceLevel) {
    return previousState;
  }

  return {
    agentId: agent.id,
    characterId: characterDef.id,
    presence: candidatePresence,
    state: candidateState,
    targetTile: candidateTarget,
    facing: defaultFacing,
    visible: candidateVisible,
    greyed: candidateGreyed,
    badge: candidateBadge,
    bubbleText: candidateBubble,
    precedenceLevel: candidatePrecedence,
    dwellUntilMs: now + dwellDurationMs,
    assignedDesk: defaultDesk,
  };
}

// ── Office-wide Event Detection ──────────────────────────────────────────────
export interface OfficeEventTriggerResult {
  event: OfficeEventKind;
  reason: string;
  responsibleAgentId?: string;
}

export function detectOfficeWideEvent(
  activityAction: string | null | undefined,
  entityType: string | null | undefined,
  details?: Record<string, unknown> | null,
  companyStatus?: string | null,
  companyPauseReason?: string | null
): OfficeEventTriggerResult | null {
  // Fire Drill: Company budget hard-stop or major incident
  if (
    (companyStatus === 'paused' && companyPauseReason === 'budget') ||
    activityAction === 'budget.hard_threshold_crossed'
  ) {
    return { event: 'fire_drill', reason: 'Company budget hard-stop reached' };
  }

  // All-Hands: Standup / Routine triggered
  if (
    entityType === 'routine' ||
    entityType === 'routine_run' ||
    activityAction === 'routine.triggered' ||
    activityAction === 'routine_run.created'
  ) {
    return { event: 'all_hands', reason: 'Scheduled routine execution underway' };
  }

  // Dundies: Goal achieved or major task completed
  if (
    activityAction === 'goal.updated' &&
    details?.status === 'achieved'
  ) {
    return { event: 'dundies', reason: 'Company goal achieved!' };
  }
  if (
    (activityAction === 'issue.updated' || activityAction === 'issue.status_decision_recorded') &&
    details?.status === 'done'
  ) {
    return { event: 'dundies', reason: 'Task completed successfully' };
  }

  // Birthday: Agent created
  if (activityAction === 'agent.created' || activityAction === 'agent.hired') {
    return { event: 'birthday', reason: 'New agent welcomed to the company!' };
  }

  return null;
}
