/**
 * officeMailbox.ts
 *
 * Pure, framework-free Hive Mailbox and CEO Task Splitting engine for the
 * Geetorus 2D Virtual Office, implementing the exact multi-agent coordination
 * model from Munder Difflin (Chaitanya Giri):
 *
 *   1. FIPA-lite Speech Acts (request, inform, propose, query, agree, refuse, done)
 *   2. CEO Plan Decomposition / Task Splitting: breaks high-level goals into
 *      discrete specialist subtasks matched to agent roles and capabilities.
 *   3. Flying Envelope Trajectory Math: Parabolic arc physics with speech-act
 *      tinting and arrival sparkle bursts desk-to-desk across the office floor.
 */

export type MessageAct =
  | 'request'
  | 'inform'
  | 'propose'
  | 'query'
  | 'agree'
  | 'refuse'
  | 'done';

/** Speech-act -> envelope tint (hex string for 2D canvas). */
export const ACT_COLORS: Record<MessageAct, string> = {
  request: '#38bdf8', // Sky Blue
  query: '#c084fc',   // Lilac
  propose: '#facc15', // Lemon
  inform: '#fef08a',  // Cream
  agree: '#4ade80',   // Mint
  done: '#22c55e',    // Emerald / Mint
  refuse: '#f87171',  // Coral / Red
};

export interface HiveMessage {
  id: string;
  fromAgentId: string;
  fromName: string;
  toAgentId: string;
  toName: string;
  act: MessageAct;
  subject: string;
  body: string;
  timestamp: number;
  conversationId: string;
  needsHuman?: boolean;
}

export interface TaskSplitSpec {
  id: string;
  title: string;
  description: string;
  requiredRole: 'engineering' | 'frontend' | 'backend' | 'design' | 'qa' | 'product' | 'research';
  act: MessageAct;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assigneeAgentId: string;
  assigneeName: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
}

export interface AgentRosterCandidate {
  id: string;
  name: string;
  role?: string;
}

/**
 * CEO Plan Decomposition / Task Splitter
 *
 * Decomposes a high-level user objective or feature brief into 2-4 discrete,
 * actionable subtasks, matching each subtask to the most qualified specialist
 * agent on the floor based on their role and name.
 */
export function decomposeObjective(
  objective: string,
  roster: AgentRosterCandidate[],
  ceoAgentId = 'michael'
): TaskSplitSpec[] {
  const cleanObj = objective.trim();
  if (!cleanObj) return [];

  // Filter out CEO from candidate worker pool if others exist
  const workerPool = roster.filter((a) => a.id !== ceoAgentId);
  const candidates = workerPool.length > 0 ? workerPool : roster;

  // Role matching helper
  const findBestAgent = (
    preferredKeywords: string[],
    fallbackIndex: number
  ): AgentRosterCandidate => {
    for (const kw of preferredKeywords) {
      const match = candidates.find(
        (a) =>
          a.role?.toLowerCase().includes(kw) ||
          a.name.toLowerCase().includes(kw)
      );
      if (match) return match;
    }
    return candidates[fallbackIndex % candidates.length]!;
  };

  const tasks: TaskSplitSpec[] = [];
  const lowerObj = cleanObj.toLowerCase();

  // 1. Architecture & Backend / Core Logic Task
  const backendAgent = findBestAgent(['back', 'api', 'core', 'engine', 'dwight', 'lead'], 0);
  tasks.push({
    id: `task-${Date.now()}-1`,
    title: `Core Implementation & Services`,
    description: `Design schema, endpoints, and backend business logic for: ${cleanObj}`,
    requiredRole: 'backend',
    act: 'request',
    priority: lowerObj.includes('urgent') || lowerObj.includes('fix') ? 'urgent' : 'high',
    assigneeAgentId: backendAgent.id,
    assigneeName: backendAgent.name,
    status: 'todo',
  });

  // 2. User Interface & Client Experience Task
  const frontendAgent = findBestAgent(['front', 'ui', 'ux', 'design', 'pam', 'web'], 1);
  tasks.push({
    id: `task-${Date.now()}-2`,
    title: `Interface & Visual Integration`,
    description: `Build reactive UI components, states, and responsive styling for: ${cleanObj}`,
    requiredRole: 'frontend',
    act: 'request',
    priority: 'medium',
    assigneeAgentId: frontendAgent.id,
    assigneeName: frontendAgent.name,
    status: 'todo',
  });

  // 3. QA, Validation & Security Review Task
  const qaAgent = findBestAgent(['qa', 'test', 'security', 'angela', 'toby', 'audit'], 2);
  tasks.push({
    id: `task-${Date.now()}-3`,
    title: `Validation & Automated Test Suite`,
    description: `Write unit/integration tests and verify security & edge-case handling for: ${cleanObj}`,
    requiredRole: 'qa',
    act: 'request',
    priority: 'medium',
    assigneeAgentId: qaAgent.id,
    assigneeName: qaAgent.name,
    status: 'todo',
  });

  // 4. Product, Review & Documentation (Optional: for larger objectives > 50 chars)
  if (cleanObj.length > 50 || lowerObj.includes('launch') || lowerObj.includes('deploy')) {
    const productAgent = findBestAgent(['product', 'doc', 'jim', 'ryan', 'manager'], 3);
    tasks.push({
      id: `task-${Date.now()}-4`,
      title: `Documentation & Staging Release`,
      description: `Draft release notes, verify user flows, and coordinate staging deployment.`,
      requiredRole: 'product',
      act: 'request',
      priority: 'low',
      assigneeAgentId: productAgent.id,
      assigneeName: productAgent.name,
      status: 'todo',
    });
  }

  return tasks;
}

export const TASK_SPLIT_PRESETS = [
  {
    title: 'Q4 AI Paper Catalog Deployment',
    objective: 'Deploy the new AI-powered interactive Paper Catalog with real-time pricing and stock alerts.',
  },
  {
    title: 'Fix Critical WebSocket Race Condition',
    objective: 'Investigate and resolve high-traffic WebSocket token refresh race condition and patch reconnect logic.',
  },
  {
    title: 'Organize 8th Annual Dundie Awards',
    objective: 'Coordinate Dundie award nominations, venue reservations at Chili’s, sound equipment, and engraved trophies.',
  },
  {
    title: 'Diversity Day Corporate Training',
    objective: 'Prepare Diversity Day role-reversal cards, keynote slide deck, and branch team coordination.',
  },
  {
    title: 'Customer Loyalty & Hammermill Campaign',
    objective: 'Roll out Q4 corporate customer discount bundles and Hammermill exclusive paper deals.',
  },
];

// ─── Flying Envelope Particle Model ──────────────────────────────────────────

export const FLY_HEIGHT = 22;       // px above desk anchor
export const ARC_LIFT = 42;         // peak of the parabolic flight arc
export const SPEED = 250;           // px per second
export const MIN_DURATION = 0.75;
export const MAX_DURATION = 2.2;
export const FADE_IN = 0.12;
export const FADE_OUT = 0.2;
export const BURST_DURATION = 0.35; // arrival sparkle ring duration

export interface FlyingEnvelope {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  act: MessageAct;
  needsHuman: boolean;
  subject: string;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  duration: number;
  elapsed: number;
  bursting: boolean;
  burstElapsed: number;
  finished: boolean;
  currentX: number;
  currentY: number;
  rotation: number;
  alpha: number;
  burstRadius: number;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Initialize a new flying envelope from a sender coordinate to recipient coordinate
 */
export function createFlyingEnvelope(
  fromAgentId: string,
  toAgentId: string,
  startCoord: { x: number; y: number },
  endCoord: { x: number; y: number },
  act: MessageAct = 'request',
  subject = '',
  needsHuman = false
): FlyingEnvelope {
  const sx = startCoord.x;
  const sy = startCoord.y - FLY_HEIGHT;
  const ex = endCoord.x;
  const ey = endCoord.y - FLY_HEIGHT;
  const dist = Math.hypot(ex - sx, ey - sy);
  const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, dist / SPEED));

  return {
    id: `env-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fromAgentId,
    toAgentId,
    act,
    needsHuman,
    subject,
    sx,
    sy,
    ex,
    ey,
    duration,
    elapsed: 0,
    bursting: false,
    burstElapsed: 0,
    finished: false,
    currentX: sx,
    currentY: sy,
    rotation: 0,
    alpha: 0,
    burstRadius: 0,
  };
}

/**
 * Advance envelope physics and state by dt seconds.
 * Returns true when the envelope animation is completely finished.
 */
export function updateFlyingEnvelope(env: FlyingEnvelope, dt: number): boolean {
  if (env.finished) return true;

  if (!env.bursting) {
    env.elapsed += dt;
    const t = Math.min(env.elapsed / env.duration, 1);
    const e = easeInOut(t);

    // Quadratic parabolic arc
    env.currentX = env.sx + (env.ex - env.sx) * e;
    const lift = -ARC_LIFT * Math.sin(Math.PI * e);
    env.currentY = env.sy + (env.ey - env.sy) * e + lift;

    // Fade-in and fade-out near endpoints
    const fadeIn = Math.min(env.elapsed / FADE_IN, 1);
    const fadeOut =
      t > 1 - FADE_OUT / env.duration
        ? Math.max(0, (1 - t) / (FADE_OUT / env.duration))
        : 1;
    env.alpha = Math.min(fadeIn, fadeOut);

    // Gentle aerial tilt/bobbing
    env.rotation = Math.sin(env.elapsed * 7) * 0.12;

    if (t >= 1) {
      env.bursting = true;
      env.currentX = env.ex;
      env.currentY = env.ey;
      env.alpha = 1;
    }
    return false;
  }

  // Arrival burst expansion
  env.burstElapsed += dt;
  const bt = Math.min(env.burstElapsed / BURST_DURATION, 1);
  env.burstRadius = 4 + bt * 16;
  env.alpha = Math.max(0, 1 - bt);

  if (bt >= 1) {
    env.finished = true;
    return true;
  }

  return false;
}
