import { describe, it, expect } from 'vitest';
import {
  decomposeObjective,
  createFlyingEnvelope,
  updateFlyingEnvelope,
  ACT_COLORS,
  type AgentRosterCandidate,
} from './officeMailbox';

describe('officeMailbox', () => {
  const sampleRoster: AgentRosterCandidate[] = [
    { id: 'michael', name: 'Michael Scott', role: 'Regional Manager' },
    { id: 'dwight', name: 'Dwight Schrute', role: 'Lead Backend Engineer' },
    { id: 'pam', name: 'Pam Beesly', role: 'Frontend UI Designer' },
    { id: 'angela', name: 'Angela Martin', role: 'QA & Security Auditor' },
    { id: 'jim', name: 'Jim Halpert', role: 'Product Manager' },
  ];

  describe('decomposeObjective', () => {
    it('returns empty array for empty or whitespace objective', () => {
      expect(decomposeObjective('', sampleRoster)).toEqual([]);
      expect(decomposeObjective('   ', sampleRoster)).toEqual([]);
    });

    it('splits a goal into specialist subtasks with correct roles and assignees', () => {
      const tasks = decomposeObjective(
        'Build OAuth2 user authentication with token revocation',
        sampleRoster,
        'michael'
      );

      expect(tasks.length).toBeGreaterThanOrEqual(3);
      // Backend task assigned to Dwight
      const backendTask = tasks.find((t) => t.requiredRole === 'backend');
      expect(backendTask).toBeDefined();
      expect(backendTask?.assigneeAgentId).toBe('dwight');
      expect(backendTask?.act).toBe('request');

      // Frontend task assigned to Pam
      const frontendTask = tasks.find((t) => t.requiredRole === 'frontend');
      expect(frontendTask).toBeDefined();
      expect(frontendTask?.assigneeAgentId).toBe('pam');

      // QA task assigned to Angela
      const qaTask = tasks.find((t) => t.requiredRole === 'qa');
      expect(qaTask).toBeDefined();
      expect(qaTask?.assigneeAgentId).toBe('angela');
    });

    it('marks urgent priority when keywords like urgent or fix appear', () => {
      const tasks = decomposeObjective('URGENT fix broken billing webhook', sampleRoster);
      const backendTask = tasks.find((t) => t.requiredRole === 'backend');
      expect(backendTask?.priority).toBe('urgent');
    });

    it('adds product/documentation task for comprehensive objectives', () => {
      const longObjective =
        'Comprehensive enterprise workspace overhaul with migration guides, deployment staging and user acceptance testing';
      const tasks = decomposeObjective(longObjective, sampleRoster);
      expect(tasks.length).toBe(4);
      expect(tasks.some((t) => t.requiredRole === 'product')).toBe(true);
    });
  });

  describe('createFlyingEnvelope', () => {
    it('initializes flight parameters within bounds', () => {
      const start = { x: 100, y: 100 };
      const end = { x: 300, y: 200 };
      const env = createFlyingEnvelope('michael', 'dwight', start, end, 'request', 'New task');

      expect(env.fromAgentId).toBe('michael');
      expect(env.toAgentId).toBe('dwight');
      expect(env.act).toBe('request');
      expect(env.duration).toBeGreaterThanOrEqual(0.75);
      expect(env.duration).toBeLessThanOrEqual(2.2);
      expect(env.finished).toBe(false);
      expect(env.bursting).toBe(false);
    });
  });

  describe('updateFlyingEnvelope', () => {
    it('advances trajectory along parabolic arc and terminates cleanly', () => {
      const start = { x: 100, y: 100 };
      const end = { x: 200, y: 100 };
      const env = createFlyingEnvelope('michael', 'pam', start, end, 'request');

      // Mid-flight check
      const midFinished = updateFlyingEnvelope(env, env.duration * 0.5);
      expect(midFinished).toBe(false);
      expect(env.currentX).toBeGreaterThan(100);
      expect(env.currentX).toBeLessThan(200);
      // Lift should cause Y to be elevated (lower coordinate in canvas)
      expect(env.currentY).toBeLessThan(start.y);

      // Advance past duration to trigger burst
      const arrival = updateFlyingEnvelope(env, env.duration * 0.6);
      expect(arrival).toBe(false);
      expect(env.bursting).toBe(true);

      // Advance through burst
      const burstFinished = updateFlyingEnvelope(env, 0.4);
      expect(burstFinished).toBe(true);
      expect(env.finished).toBe(true);
    });
  });

  describe('speech-act palettes', () => {
    it('defines colors for all valid speech acts', () => {
      expect(ACT_COLORS.request).toBe('#38bdf8');
      expect(ACT_COLORS.done).toBe('#22c55e');
      expect(ACT_COLORS.query).toBe('#c084fc');
      expect(ACT_COLORS.propose).toBe('#facc15');
      expect(ACT_COLORS.inform).toBe('#fef08a');
      expect(ACT_COLORS.refuse).toBe('#f87171');
    });
  });
});
