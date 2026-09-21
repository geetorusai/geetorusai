import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LiveEvent, Agent, Issue, Approval } from '@geetorusai/shared';
import { queryKeys } from '@/lib/queryKeys';
import { agentsApi } from '@/api/agents';
import { heartbeatsApi, type LiveRunForIssue } from '@/api/heartbeats';
import { approvalsApi } from '@/api/approvals';
import { issuesApi } from '@/api/issues';
import { useCompanyLiveEvent } from '@/context/LiveUpdatesProvider';
import { usePageVisibility } from '@/lib/page-visibility';
import {
  assignAgentsToCharacters,
  mapAgentToSimState,
  detectOfficeWideEvent,
  type AgentSimState,
  type NormalizedAgentInput,
  type RunLike,
  type OrgNodeLike,
} from './officeMapping';
import type { OfficeEngine } from './OfficeEngine';
import type { OfficeCharacter, OfficeEventKind } from './officeConstants';

export type OfficeMode = 'live' | 'demo';
export type OfficeConnectionStatus = 'connected' | 'reconnecting' | 'disconnected' | 'idle';

export interface UseOfficeLiveSyncOptions {
  mode?: OfficeMode;
  enabled?: boolean;
}

export interface UseOfficeLiveSyncResult {
  mode: OfficeMode;
  setMode: (mode: OfficeMode) => void;
  connectionStatus: OfficeConnectionStatus;
  agentStates: Map<string, AgentSimState>;
  assignments: Map<string, OfficeCharacter>;
  agents: Agent[];
  issues: Issue[];
  activeEvent: OfficeEventKind;
  activeEventReason: string | null;
  triggerSimulationEvent: (event: OfficeEventKind) => void;
  refetchSnapshot: () => void;
}

const BATCH_WINDOW_MS = 250;
const INITIAL_POLL_INTERVAL_MS = 4000;
const MAX_POLL_INTERVAL_MS = 15000;

export function useOfficeLiveSync(
  engine: OfficeEngine | null,
  companyId: string | null,
  options: UseOfficeLiveSyncOptions = {}
): UseOfficeLiveSyncResult {
  const { mode: initialMode = 'live', enabled = true } = options;
  const [mode, setMode] = useState<OfficeMode>(initialMode);
  const [connectionStatus, setConnectionStatus] = useState<OfficeConnectionStatus>('idle');
  const [activeEvent, setActiveEvent] = useState<OfficeEventKind>('normal');
  const [activeEventReason, setActiveEventReason] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { visible } = usePageVisibility();

  // Internal state caches
  const agentStatesRef = useRef<Map<string, AgentSimState>>(new Map());
  const assignmentsRef = useRef<Map<string, OfficeCharacter>>(new Map());
  const lastEventTimestampRef = useRef<Map<string, number>>(new Map());
  const coalescingTimerRef = useRef<number | null>(null);
  const eventQueueRef = useRef<LiveEvent[]>([]);
  const pollTimerRef = useRef<number | null>(null);
  const pollBackoffMsRef = useRef<number>(INITIAL_POLL_INTERVAL_MS);
  const isSubscribedRef = useRef<boolean>(false);

  // 1. Fetch Real Server State (Snapshot)
  const isLiveEnabled = enabled && mode === 'live' && !!companyId;

  const {
    data: agentsData,
    refetch: refetchAgents,
    isError: isAgentsError,
  } = useQuery({
    queryKey: queryKeys.agents.list(companyId ?? ''),
    queryFn: () => (companyId ? agentsApi.list(companyId) : Promise.resolve([])),
    enabled: isLiveEnabled,
    staleTime: 5000,
  });

  const { data: orgData } = useQuery({
    queryKey: queryKeys.org(companyId ?? ''),
    queryFn: () => (companyId ? agentsApi.org(companyId) : Promise.resolve([])),
    enabled: isLiveEnabled,
    staleTime: 10000,
  });

  const { data: liveRunsData, refetch: refetchRuns } = useQuery({
    queryKey: queryKeys.liveRuns(companyId ?? ''),
    queryFn: () => (companyId ? heartbeatsApi.liveRunsForCompany(companyId) : Promise.resolve([])),
    enabled: isLiveEnabled,
    staleTime: 2000,
  });

  const { data: pendingApprovalsData, refetch: refetchApprovals } = useQuery({
    queryKey: queryKeys.approvals.list(companyId ?? '', 'pending'),
    queryFn: () => (companyId ? approvalsApi.list(companyId, 'pending') : Promise.resolve([])),
    enabled: isLiveEnabled,
    staleTime: 5000,
  });

  const { data: issuesData, refetch: refetchIssues } = useQuery({
    queryKey: queryKeys.issues.list(companyId ?? ''),
    queryFn: () => (companyId ? issuesApi.list(companyId) : Promise.resolve([])),
    enabled: isLiveEnabled,
    staleTime: 5000,
  });

  const refetchSnapshot = useCallback(() => {
    if (!companyId) return;
    void Promise.all([
      refetchAgents(),
      refetchRuns(),
      refetchApprovals(),
      refetchIssues(),
    ]);
  }, [companyId, refetchAgents, refetchRuns, refetchApprovals, refetchIssues]);

  // Handle Demo Mode vs Live Mode switch in engine
  useEffect(() => {
    if (!engine) return;

    if (mode === 'demo' || !companyId) {
      engine.setLiveMode(false);
      engine.resetToDemoCharacters();
      setConnectionStatus('idle');
      agentStatesRef.current.clear();
      assignmentsRef.current.clear();
    } else {
      engine.setLiveMode(true);
      setConnectionStatus(isAgentsError ? 'disconnected' : 'connected');
    }
  }, [engine, mode, companyId, isAgentsError]);

  // Clean teardown on company change
  const prevCompanyIdRef = useRef(companyId);
  useEffect(() => {
    if (prevCompanyIdRef.current !== companyId) {
      prevCompanyIdRef.current = companyId;
      agentStatesRef.current.clear();
      assignmentsRef.current.clear();
      lastEventTimestampRef.current.clear();
      eventQueueRef.current = [];
      if (engine) {
        engine.resetToDemoCharacters();
        if (mode === 'live') {
          engine.setLiveMode(true);
        }
      }
      refetchSnapshot();
    }
  }, [companyId, engine, mode, refetchSnapshot]);

  // Apply state snapshot to engine
  const applySnapshotToEngine = useCallback(() => {
    if (!engine || mode !== 'live' || !companyId || !agentsData) return;

    const agents: Agent[] = agentsData ?? [];
    const org: OrgNodeLike[] = (orgData ?? []) as OrgNodeLike[];
    const liveRuns: LiveRunForIssue[] = (liveRunsData ?? []) as LiveRunForIssue[];
    const approvals: Approval[] = (pendingApprovalsData ?? []) as Approval[];
    const issues: Issue[] = (issuesData ?? []) as Issue[];

    // Deterministically assign characters
    const newAssignments = assignAgentsToCharacters(agents, org);
    assignmentsRef.current = newAssignments;

    const nextAgentStates = new Map<string, AgentSimState>();
    const assignedCharIds = new Set<string>();

    agents.forEach((agent) => {
      const charDef = newAssignments.get(agent.id);
      if (!charDef) return;

      assignedCharIds.add(charDef.id);

      // Match active run
      const activeRun = liveRuns.find(
        (r) => r.agentId === agent.id && (r.status === 'running' || r.status === 'queued')
      );

      // Match assigned issue
      const assignedIssue = issues.find(
        (i) => i.assigneeAgentId === agent.id && i.status !== 'done' && i.status !== 'cancelled'
      );

      // Match pending approval
      const pendingApproval = approvals.find((a) => a.requestedByAgentId === agent.id);

      const prevState = agentStatesRef.current.get(agent.id);
      const input: NormalizedAgentInput = {
        agent,
        activeRun,
        assignedIssue,
        pendingApproval,
        now: Date.now(),
      };

      const nextState = mapAgentToSimState(input, charDef, prevState);
      nextAgentStates.set(agent.id, nextState);

      // Apply to engine
      if (charDef.id.startsWith('overflow_')) {
        engine.upsertCharacter(charDef);
      }

      engine.setAgentVisibility(charDef.id, nextState.visible);
      engine.setAgentPresence(charDef.id, nextState.presence);
      engine.setAgentGreyed(charDef.id, nextState.greyed);
      engine.setAgentBadge(charDef.id, nextState.badge);

      if (nextState.bubbleText) {
        engine.setAgentBubble(charDef.id, nextState.bubbleText);
      }

      engine.setAgentTarget(charDef.id, nextState.targetTile, nextState.state);
    });

    // Hide any unassigned standard Scranton cast characters in Live Mode
    engine.characters.forEach((c) => {
      if (!assignedCharIds.has(c.def.id)) {
        engine.setAgentVisibility(c.def.id, false);
      }
    });

    agentStatesRef.current = nextAgentStates;
  }, [engine, mode, companyId, agentsData, orgData, liveRunsData, pendingApprovalsData, issuesData]);

  // Flush snapshot when data arrives
  useEffect(() => {
    applySnapshotToEngine();
  }, [applySnapshotToEngine]);

  // 2. Coalescing Batch Processor for Live Events
  const flushEventQueue = useCallback(() => {
    coalescingTimerRef.current = null;
    const events = eventQueueRef.current;
    if (events.length === 0) return;
    eventQueueRef.current = [];

    let needsSnapshotRefresh = false;

    for (const evt of events) {
      const payload = evt.payload ?? {};
      const createdAtEpoch = new Date(evt.createdAt).getTime();

      // Check event monotonicity per agent/run
      const entityId = (payload.agentId || payload.runId || payload.entityId) as string | undefined;
      if (entityId) {
        const lastSeen = lastEventTimestampRef.current.get(entityId) ?? 0;
        if (createdAtEpoch < lastSeen) {
          // Out of order event: ignore
          continue;
        }
        lastEventTimestampRef.current.set(entityId, createdAtEpoch);
      }

      // Check office-wide event trigger
      if (evt.type === 'activity.logged') {
        const action = payload.action as string | undefined;
        const entityType = payload.entityType as string | undefined;
        const details = payload.details as Record<string, unknown> | undefined;

        const officeEvent = detectOfficeWideEvent(action, entityType, details);
        if (officeEvent && engine) {
          setActiveEvent(officeEvent.event);
          setActiveEventReason(officeEvent.reason);
          engine.triggerEvent(officeEvent.event);
        }
      }

      if (
        evt.type === 'heartbeat.run.queued' ||
        evt.type === 'heartbeat.run.status' ||
        evt.type === 'agent.status' ||
        evt.type === 'activity.logged'
      ) {
        needsSnapshotRefresh = true;
      }
    }

    if (needsSnapshotRefresh) {
      refetchSnapshot();
    }
  }, [engine, refetchSnapshot]);

  // 3. Shared WebSocket Listener via useCompanyLiveEvent
  const handleLiveEvent = useCallback(
    (event: LiveEvent) => {
      if (mode !== 'live' || !companyId || event.companyId !== companyId) return;

      isSubscribedRef.current = true;
      setConnectionStatus('connected');
      pollBackoffMsRef.current = INITIAL_POLL_INTERVAL_MS;

      eventQueueRef.current.push(event);

      if (coalescingTimerRef.current === null) {
        coalescingTimerRef.current = window.setTimeout(flushEventQueue, BATCH_WINDOW_MS);
      }
    },
    [mode, companyId, flushEventQueue]
  );

  useCompanyLiveEvent(handleLiveEvent);

  // 4. Polling Fallback (when socket is silent or disconnected)
  useEffect(() => {
    if (mode !== 'live' || !companyId || !visible) return;

    const schedulePoll = () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
      }

      pollTimerRef.current = window.setTimeout(() => {
        refetchSnapshot();
        // Increase backoff slightly
        pollBackoffMsRef.current = Math.min(MAX_POLL_INTERVAL_MS, pollBackoffMsRef.current * 1.5);
        schedulePoll();
      }, pollBackoffMsRef.current);
    };

    schedulePoll();

    return () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [mode, companyId, visible, refetchSnapshot]);

  // 5. Page Visibility Re-sync
  useEffect(() => {
    if (visible && mode === 'live' && companyId) {
      refetchSnapshot();
    }
  }, [visible, mode, companyId, refetchSnapshot]);

  // Trigger local simulation events
  const triggerSimulationEvent = useCallback(
    (evtKind: OfficeEventKind) => {
      if (engine) {
        engine.triggerEvent(evtKind);
        setActiveEvent(evtKind);
        setActiveEventReason('Manual visual simulation');
      }
    },
    [engine]
  );

  return {
    mode,
    setMode,
    connectionStatus,
    agentStates: agentStatesRef.current,
    assignments: assignmentsRef.current,
    agents: agentsData ?? [],
    issues: issuesData ?? [],
    activeEvent,
    activeEventReason,
    triggerSimulationEvent,
    refetchSnapshot,
  };
}
