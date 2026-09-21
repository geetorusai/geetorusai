import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Agent, Issue, Approval } from '@geetorusai/shared';
import {
  mapAgentToSimState,
  assignAgentsToCharacters,
  detectOfficeWideEvent,
  sanitizeBubbleText,
  sanitizeToolName,
  PRECEDENCE,
  resetUnknownStatusLogForTests,
  type RunLike,
} from './officeMapping';
import { OFFICE_CHARACTERS } from './officeConstants';

function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1234',
    companyId: 'company-test',
    name: 'Alice Agent',
    urlKey: 'alice',
    role: 'engineer',
    title: 'Senior Engineer',
    icon: 'bot',
    status: 'active',
    reportsTo: null,
    capabilities: null,
    adapterType: 'codex_local',
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 10000,
    spentMonthlyCents: 2000,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: new Date(Date.now() - 10_000),
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('officeMapping: mapAgentToSimState', () => {
  const charDef = OFFICE_CHARACTERS[1]; // Dwight ({ x: 21, y: 17 })

  beforeEach(() => {
    resetUnknownStatusLogForTests();
  });

  it('maps running run to working state at desk with task bubble', () => {
    const agent = createMockAgent({ status: 'running' });
    const activeRun: RunLike = {
      id: 'run-1',
      agentId: agent.id,
      status: 'running',
    };
    const assignedIssue = {
      id: 'issue-1',
      title: 'Fix Redis memory overflow in indexing pipeline',
    } as Issue;

    const result = mapAgentToSimState(
      { agent, activeRun, assignedIssue },
      charDef
    );

    expect(result.presence).toBe('working');
    expect(result.state).toBe('working');
    expect(result.targetTile).toEqual(charDef.deskCoord);
    expect(result.visible).toBe(true);
    expect(result.greyed).toBe(false);
    expect(result.bubbleText).toContain('Fix Redis memory overflow');
    expect(result.precedenceLevel).toBe(PRECEDENCE.WORKING_RUNNING);
  });

  it('maps active tool call in running run to phone state at desk', () => {
    const agent = createMockAgent({ status: 'running' });
    const activeRun: RunLike = {
      id: 'run-1',
      agentId: agent.id,
      status: 'running',
      currentToolName: 'mcp_server:github_create_pull_request',
    };

    const result = mapAgentToSimState({ agent, activeRun }, charDef);

    expect(result.presence).toBe('focus');
    expect(result.state).toBe('phone');
    expect(result.targetTile).toEqual(charDef.deskCoord);
    expect(result.bubbleText).toBe('Tool: github_create_pull_request');
    expect(result.precedenceLevel).toBe(PRECEDENCE.TOOL_CALL);
  });

  it('maps failed run to panic state at desk', () => {
    const agent = createMockAgent({ status: 'error' });
    const activeRun: RunLike = {
      id: 'run-failed',
      agentId: agent.id,
      status: 'failed',
      currentStatusMessage: 'API rate limit exceeded on Claude provider',
    };

    const result = mapAgentToSimState({ agent, activeRun }, charDef);

    expect(result.presence).toBe('focus');
    expect(result.state).toBe('panic');
    expect(result.badge).toBe('FAILED');
    expect(result.bubbleText).toContain('API rate limit exceeded');
    expect(result.precedenceLevel).toBe(PRECEDENCE.RUN_FAILED);
  });

  it('maps budget hard-stop to panic, greyed and over budget badge', () => {
    const agent = createMockAgent({
      status: 'paused',
      pauseReason: 'budget',
      budgetMonthlyCents: 5000,
      spentMonthlyCents: 5500,
    });

    const result = mapAgentToSimState({ agent }, charDef);

    expect(result.presence).toBe('offline');
    expect(result.state).toBe('panic');
    expect(result.greyed).toBe(true);
    expect(result.badge).toBe('OVER BUDGET');
    expect(result.bubbleText).toBe('Budget hard-stop reached');
    expect(result.precedenceLevel).toBe(PRECEDENCE.BUDGET_HARD_STOP);
  });

  it('maps terminated agent to hidden', () => {
    const agent = createMockAgent({ status: 'terminated' });

    const result = mapAgentToSimState({ agent }, charDef);

    expect(result.visible).toBe(false);
    expect(result.presence).toBe('offline');
    expect(result.precedenceLevel).toBe(PRECEDENCE.TERMINATED);
  });

  it('maps paused agent to break room with greyed sprite', () => {
    const agent = createMockAgent({ status: 'paused', pauseReason: 'manual' });

    const result = mapAgentToSimState({ agent }, charDef);

    expect(result.presence).toBe('away');
    expect(result.state).toBe('idle_chat');
    expect(result.greyed).toBe(true);
    expect(result.badge).toBe('PAUSED');
    expect(result.targetTile).toEqual({ x: 38, y: 7 }); // BREAKROOM_SEATS[0]
    expect(result.precedenceLevel).toBe(PRECEDENCE.PAUSED);
  });

  it('maps pending approval to meeting zone near manager office', () => {
    const agent = createMockAgent({ status: 'idle' });
    const pendingApproval = {
      id: 'app-1',
      status: 'pending',
      type: 'hire_agent',
    } as Approval;

    const result = mapAgentToSimState({ agent, pendingApproval }, charDef);

    expect(result.presence).toBe('meeting');
    expect(result.state).toBe('idle_chat');
    expect(result.targetTile).toEqual({ x: 8, y: 8 });
    expect(result.badge).toBe('APPROVAL');
    expect(result.bubbleText).toContain('Awaiting approval');
    expect(result.precedenceLevel).toBe(PRECEDENCE.BLOCKED_OR_APPROVAL);
  });

  it('maps queued run to focus at desk', () => {
    const agent = createMockAgent({ status: 'idle' });
    const activeRun: RunLike = {
      id: 'run-q',
      agentId: agent.id,
      status: 'queued',
    };

    const result = mapAgentToSimState({ agent, activeRun }, charDef);

    expect(result.presence).toBe('focus');
    expect(result.state).toBe('working');
    expect(result.badge).toBe('QUEUED');
    expect(result.bubbleText).toBe('Queued for execution');
    expect(result.precedenceLevel).toBe(PRECEDENCE.QUEUED_OR_WAKEUP);
  });

  it('maps agent idle > 5 minutes to coffee break at coffee machine', () => {
    const now = Date.now();
    const agent = createMockAgent({
      status: 'idle',
      lastHeartbeatAt: new Date(now - 6 * 60 * 1000), // 6 minutes ago
    });

    const result = mapAgentToSimState({ agent, now }, charDef);

    expect(result.presence).toBe('break');
    expect(result.state).toBe('coffee');
    expect(result.targetTile).toEqual({ x: 36, y: 5 }); // coffee machine anchor
    expect(result.bubbleText).toBe('Coffee break');
  });

  it('handles unknown agent status gracefully without crashing', () => {
    const agent = createMockAgent({ status: 'non_existent_status' as any });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = mapAgentToSimState({ agent }, charDef);

    expect(result.presence).toBe('away');
    expect(result.state).toBe('working');
    expect(result.precedenceLevel).toBe(PRECEDENCE.UNKNOWN_FALLBACK);
    expect(warnSpy).toHaveBeenCalledOnce();

    // Second call should not warn again (rate-limited)
    mapAgentToSimState({ agent }, charDef);
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });
});

describe('officeMapping: Precedence & Anti-Flicker Dwell Logic', () => {
  const charDef = OFFICE_CHARACTERS[2]; // Jim

  it('rejects lower precedence transition during active dwell lock', () => {
    const now = 100_000;
    const agent = createMockAgent({ status: 'running' });

    // Step 1: Agent in RUN_FAILED state (precedence 9, dwell until 104_000)
    const failedState = mapAgentToSimState(
      {
        agent,
        activeRun: { id: 'r1', agentId: agent.id, status: 'failed' },
        now,
      },
      charDef
    );
    expect(failedState.precedenceLevel).toBe(PRECEDENCE.RUN_FAILED);
    expect(failedState.dwellUntilMs).toBe(104_000);

    // Step 2: 1000ms later, a QUEUED run arrives (precedence 3) while still in dwell window
    const queuedState = mapAgentToSimState(
      {
        agent,
        activeRun: { id: 'r2', agentId: agent.id, status: 'queued' },
        now: now + 1000,
      },
      charDef,
      failedState
    );

    // Should maintain failedState due to anti-flicker dwell lock
    expect(queuedState).toBe(failedState);
  });

  it('allows higher precedence transition immediately during active dwell lock', () => {
    const now = 100_000;
    const agent = createMockAgent();

    // Step 1: Agent in WORKING state (precedence 4, dwell until 102_000)
    const workingState = mapAgentToSimState(
      {
        agent,
        activeRun: { id: 'r1', agentId: agent.id, status: 'running' },
        now,
      },
      charDef
    );
    expect(workingState.precedenceLevel).toBe(PRECEDENCE.WORKING_RUNNING);

    // Step 2: 500ms later, budget hard stop occurs (precedence 10)
    const budgetState = mapAgentToSimState(
      {
        agent: { ...agent, status: 'paused', pauseReason: 'budget' },
        now: now + 500,
      },
      charDef,
      workingState
    );

    // Higher precedence preempts immediately
    expect(budgetState.precedenceLevel).toBe(PRECEDENCE.BUDGET_HARD_STOP);
    expect(budgetState.badge).toBe('OVER BUDGET');
  });
});

describe('officeMapping: assignAgentsToCharacters', () => {
  it('assigns CEO to Michael Scott manager slot', () => {
    const agents = [
      createMockAgent({ id: 'eng-1', name: 'Dev 1', role: 'engineer' }),
      createMockAgent({ id: 'ceo-1', name: 'Boss', role: 'ceo' }),
      createMockAgent({ id: 'qa-1', name: 'QA Tester', role: 'qa' }),
    ];

    const assignments = assignAgentsToCharacters(agents);

    expect(assignments.get('ceo-1')?.id).toBe('michael');
    expect(assignments.get('ceo-1')?.deskCoord).toEqual({ x: 7, y: 6 });
  });

  it('is stable and deterministic across multiple runs', () => {
    const agents = Array.from({ length: 8 }, (_, i) =>
      createMockAgent({ id: `agent-${i}`, name: `Agent ${i}`, role: i === 0 ? 'ceo' : 'engineer' })
    );

    const run1 = assignAgentsToCharacters(agents);
    const run2 = assignAgentsToCharacters(agents);

    for (const agent of agents) {
      expect(run1.get(agent.id)?.id).toBe(run2.get(agent.id)?.id);
    }
  });

  it('handles fewer than 16 agents without gaps in mapping', () => {
    const agents = [createMockAgent({ id: 'agent-1' }), createMockAgent({ id: 'agent-2' })];
    const assignments = assignAgentsToCharacters(agents);

    expect(assignments.size).toBe(2);
    expect(assignments.has('agent-1')).toBe(true);
    expect(assignments.has('agent-2')).toBe(true);
  });

  it('handles more than 16 agents with overflow assignment', () => {
    // 25 agents: 1 CEO + 24 others. 1 CEO gets michael, 15 get remainingChars (indices 0..14),
    // and 9 agents (indices 15..23) become overflow agents.
    const agents = Array.from({ length: 25 }, (_, i) =>
      createMockAgent({ id: `agent-${String(i).padStart(3, '0')}`, name: `Agent ${i}`, role: i === 0 ? 'ceo' : 'engineer' })
    );

    const assignments = assignAgentsToCharacters(agents);

    expect(assignments.size).toBe(25);
    // Agent at index 20 will definitely be an overflow agent
    const overflowAgent = agents[20];
    const overflowChar = assignments.get(overflowAgent.id);
    expect(overflowChar).toBeDefined();
    expect(overflowChar?.id).toContain('overflow_');
  });
});

describe('officeMapping: detectOfficeWideEvent', () => {
  it('detects fire drill on company budget hard stop', () => {
    const event = detectOfficeWideEvent(
      'budget.hard_threshold_crossed',
      'cost_event',
      null,
      'paused',
      'budget'
    );
    expect(event?.event).toBe('fire_drill');
  });

  it('detects all hands on routine execution', () => {
    const event = detectOfficeWideEvent('routine.triggered', 'routine');
    expect(event?.event).toBe('all_hands');
  });

  it('detects dundies on goal achieved or issue done', () => {
    const goalEvent = detectOfficeWideEvent('goal.updated', 'goal', { status: 'achieved' });
    expect(goalEvent?.event).toBe('dundies');

    const issueEvent = detectOfficeWideEvent('issue.updated', 'issue', { status: 'done' });
    expect(issueEvent?.event).toBe('dundies');
  });

  it('detects birthday on agent created', () => {
    const event = detectOfficeWideEvent('agent.created', 'agent');
    expect(event?.event).toBe('birthday');
  });
});

describe('officeMapping: sanitizeBubbleText & sanitizeToolName', () => {
  it('strips high-entropy token strings and bearer credentials', () => {
    const text = 'Authorization: Bearer sk-ant-api03-secret123456789012345678 and token abcd1234efgh5678ijkl9012';
    const clean = sanitizeBubbleText(text);
    expect(clean).not.toContain('sk-ant-api03');
    expect(clean).not.toContain('secret123456789012345678');
  });

  it('strips prompt brackets and truncates long text', () => {
    const text = '{{user_prompt}} Working on a very long descriptive task that definitely exceeds the character limit';
    const clean = sanitizeBubbleText(text, 30);
    expect(clean).not.toContain('user_prompt');
    expect(clean.length).toBeLessThanOrEqual(30);
    expect(clean.endsWith('…')).toBe(true);
  });

  it('sanitizes tool names cleanly', () => {
    expect(sanitizeToolName('mcp__github__create_issue')).toBe('github__create_issue');
    expect(sanitizeToolName('execute_command')).toBe('execute_command');
    expect(sanitizeToolName('provider:fetch_data')).toBe('fetch_data');
    expect(sanitizeToolName(null)).toBe('tool');
  });
});
