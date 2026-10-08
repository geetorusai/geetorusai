// @vitest-environment jsdom

import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { LiveEvent, Agent } from '@geetorusai/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOfficeLiveSync } from './useOfficeLiveSync';
import type { OfficeEngine } from './OfficeEngine';
import type { CompanyLiveEventHandler } from '@/context/LiveUpdatesProvider';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function act(cb: () => void) {
  flushSync(cb);
}

const mockSubscribers = new Set<CompanyLiveEventHandler>();

vi.mock('@/context/LiveUpdatesProvider', () => ({
  useCompanyLiveEvent: (handler: CompanyLiveEventHandler) => {
    mockSubscribers.add(handler);
  },
}));

vi.mock('@/lib/page-visibility', () => ({
  usePageVisibility: () => ({ visible: true }),
}));

const mockAgents: Agent[] = [
  {
    id: 'agent-ceo',
    companyId: 'comp-1',
    name: 'Boss Agent',
    urlKey: 'boss',
    role: 'ceo',
    title: 'Chief Executive Officer',
    icon: 'crown',
    status: 'active',
    reportsTo: null,
    capabilities: null,
    adapterType: 'claude_local',
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 50000,
    spentMonthlyCents: 10000,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: true },
    lastHeartbeatAt: new Date(),
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'agent-eng',
    companyId: 'comp-1',
    name: 'Coder Agent',
    urlKey: 'coder',
    role: 'engineer',
    title: 'Lead Engineer',
    icon: 'code',
    status: 'active',
    reportsTo: 'agent-ceo',
    capabilities: null,
    adapterType: 'codex_local',
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 30000,
    spentMonthlyCents: 5000,
    pauseReason: null,
    pausedAt: null,
    permissions: { canCreateAgents: false },
    lastHeartbeatAt: new Date(),
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

vi.mock('@/api/agents', () => ({
  agentsApi: {
    list: vi.fn(async () => mockAgents),
    org: vi.fn(async () => [
      { id: 'agent-ceo', name: 'Boss Agent', role: 'ceo', status: 'active', reports: [] },
    ]),
  },
}));

vi.mock('@/api/heartbeats', () => ({
  heartbeatsApi: {
    liveRunsForCompany: vi.fn(async () => []),
  },
}));

vi.mock('@/api/approvals', () => ({
  approvalsApi: {
    list: vi.fn(async () => []),
  },
}));

vi.mock('@/api/issues', () => ({
  issuesApi: {
    list: vi.fn(async () => []),
  },
}));

import { OFFICE_CHARACTERS } from './officeConstants';
import type { SimCharacter } from './OfficeEngine';

function createMockEngine(): Partial<OfficeEngine> & Record<string, unknown> {
  const michael = OFFICE_CHARACTERS.find((c) => c.id === 'michael')!;
  const dwight = OFFICE_CHARACTERS.find((c) => c.id === 'dwight')!;
  const jim = OFFICE_CHARACTERS.find((c) => c.id === 'jim')!;
  return {
    characters: [
      { def: michael, visible: true } as unknown as SimCharacter,
      { def: dwight, visible: true } as unknown as SimCharacter,
      { def: jim, visible: true } as unknown as SimCharacter,
    ],
    setLiveMode: vi.fn(),
    setAgentPresence: vi.fn(),
    setAgentTarget: vi.fn(),
    setAgentBubble: vi.fn(),
    setAgentVisibility: vi.fn(),
    setAgentGreyed: vi.fn(),
    setAgentBadge: vi.fn(),
    upsertCharacter: vi.fn(),
    resetToDemoCharacters: vi.fn(),
    triggerEvent: vi.fn(),
  };
}

describe('useOfficeLiveSync hook', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockSubscribers.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
  });

  it('engages live mode and applies initial snapshot to engine', async () => {
    const mockEngine = createMockEngine();
    let hookResult: ReturnType<typeof useOfficeLiveSync> | undefined;

    function TestComponent() {
      hookResult = useOfficeLiveSync(mockEngine as unknown as OfficeEngine, 'comp-1', {
        mode: 'live',
      });
      return null;
    }

    root = createRoot(container);
    act(() => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );
    });

    expect(mockEngine.setLiveMode).toHaveBeenCalledWith(true);
    expect(hookResult?.mode).toBe('live');

    // Wait for queries to resolve
    await vi.waitFor(() => {
      expect(mockEngine.setAgentPresence).toHaveBeenCalled();
    });

    // CEO assigned to Michael
    expect(mockEngine.setAgentVisibility).toHaveBeenCalledWith('michael', true);
    // Unassigned character (e.g. jim) hidden in live mode
    expect(mockEngine.setAgentVisibility).toHaveBeenCalledWith('jim', false);
  });

  it('resets to demo characters when mode toggled to demo', async () => {
    const mockEngine = createMockEngine();
    let hookResult: ReturnType<typeof useOfficeLiveSync> | undefined;

    function TestComponent() {
      hookResult = useOfficeLiveSync(mockEngine as unknown as OfficeEngine, 'comp-1', {
        mode: 'live',
      });
      return null;
    }

    root = createRoot(container);
    act(() => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );
    });

    act(() => {
      hookResult?.setMode('demo');
    });

    expect(mockEngine.setLiveMode).toHaveBeenCalledWith(false);
    expect(mockEngine.resetToDemoCharacters).toHaveBeenCalled();
  });

  it('coalesces incoming live events and triggers event animation on activity.logged', async () => {
    vi.useFakeTimers();
    const mockEngine = createMockEngine();

    function TestComponent() {
      useOfficeLiveSync(mockEngine as unknown as OfficeEngine, 'comp-1', { mode: 'live' });
      return null;
    }

    root = createRoot(container);
    act(() => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );
    });

    // Dispatch office-wide routine execution event
    const liveEvent: LiveEvent = {
      id: 1,
      companyId: 'comp-1',
      type: 'activity.logged',
      createdAt: new Date().toISOString(),
      payload: {
        entityType: 'routine_run',
        action: 'routine.triggered',
      },
    };

    act(() => {
      mockSubscribers.forEach((handler) => handler(liveEvent));
    });

    // Fast-forward coalescing batch window (250ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockEngine.triggerEvent).toHaveBeenCalledWith('all_hands');
    vi.useRealTimers();
  });

  it('drops out-of-order live events with older timestamps', async () => {
    vi.useFakeTimers();
    const mockEngine = createMockEngine();

    function TestComponent() {
      useOfficeLiveSync(mockEngine as unknown as OfficeEngine, 'comp-1', { mode: 'live' });
      return null;
    }

    root = createRoot(container);
    act(() => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );
    });

    const now = Date.now();

    // Event 1: timestamp now
    const newerEvent: LiveEvent = {
      id: 2,
      companyId: 'comp-1',
      type: 'activity.logged',
      createdAt: new Date(now).toISOString(),
      payload: {
        entityId: 'test-entity',
        entityType: 'routine_run',
        action: 'routine.triggered',
      },
    };

    act(() => {
      mockSubscribers.forEach((handler) => handler(newerEvent));
      vi.advanceTimersByTime(300);
    });

    expect(mockEngine.triggerEvent).toHaveBeenCalledTimes(1);

    // Event 2: older timestamp for same entity (out of order delivery)
    const olderEvent: LiveEvent = {
      id: 3,
      companyId: 'comp-1',
      type: 'activity.logged',
      createdAt: new Date(now - 10000).toISOString(),
      payload: {
        entityId: 'test-entity',
        entityType: 'routine_run',
        action: 'routine.triggered',
      },
    };

    act(() => {
      mockSubscribers.forEach((handler) => handler(olderEvent));
      vi.advanceTimersByTime(300);
    });

    // Should NOT have triggered a second time
    expect(mockEngine.triggerEvent).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('triggers polling fallback on silent intervals', async () => {
    vi.useFakeTimers();
    const mockEngine = createMockEngine();

    function TestComponent() {
      useOfficeLiveSync(mockEngine as unknown as OfficeEngine, 'comp-1', { mode: 'live' });
      return null;
    }

    root = createRoot(container);
    act(() => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );
    });

    // Advance 4500ms (beyond INITIAL_POLL_INTERVAL_MS = 4000ms)
    act(() => {
      vi.advanceTimersByTime(4500);
    });

    // Heartbeats or query refetches triggered
    expect(mockEngine.setLiveMode).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('tears down state when switching companies', async () => {
    const mockEngine = createMockEngine();

    function TestComponent({ compId }: { compId: string }) {
      useOfficeLiveSync(mockEngine as unknown as OfficeEngine, compId, { mode: 'live' });
      return null;
    }

    root = createRoot(container);
    act(() => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <TestComponent compId="comp-1" />
        </QueryClientProvider>
      );
    });

    // Switch company
    act(() => {
      root!.render(
        <QueryClientProvider client={queryClient}>
          <TestComponent compId="comp-2" />
        </QueryClientProvider>
      );
    });

    expect(mockEngine.resetToDemoCharacters).toHaveBeenCalled();
  });
});
