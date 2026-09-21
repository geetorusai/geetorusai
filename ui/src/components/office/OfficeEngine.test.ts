// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfficeEngine } from './OfficeEngine';
import {
  OFFICE_PLANTS,
  OFFICE_ERRAND_SPOTS,
  DOORWAY_THRESHOLDS,
} from './officeConstants';
import { TASK_SPLIT_PRESETS } from './officeMailbox';

function setupCanvasMock() {
  const mockContext = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    quadraticCurveTo: vi.fn(),
    ellipse: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    drawImage: vi.fn(),
    createImageData: vi.fn((w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
    })),
    putImageData: vi.fn(),
  };

  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

describe('OfficeEngine - Munder Difflin Simulation Features', () => {
  let canvas: HTMLCanvasElement;
  let engine: OfficeEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    setupCanvasMock();
    canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    engine = new OfficeEngine(canvas);
  });

  describe('Constants & World Specifications', () => {
    it('defines rich potted plants across office departments', () => {
      expect(OFFICE_PLANTS.length).toBeGreaterThanOrEqual(4);
      expect(OFFICE_PLANTS.some((p) => p.type === 'ficus')).toBe(true);
      expect(OFFICE_PLANTS.some((p) => p.type === 'potted_palm')).toBe(true);
      expect(OFFICE_PLANTS.some((p) => p.type === 'fern')).toBe(true);
      expect(OFFICE_PLANTS.some((p) => p.type === 'monstera')).toBe(true);
    });

    it('defines doorway portals for room thresholds', () => {
      expect(DOORWAY_THRESHOLDS.length).toBeGreaterThanOrEqual(4);
      expect(DOORWAY_THRESHOLDS.some((d) => d.id === 'door_manager')).toBe(true);
      expect(DOORWAY_THRESHOLDS.some((d) => d.id === 'door_conference')).toBe(true);
      expect(DOORWAY_THRESHOLDS.some((d) => d.id === 'door_breakroom')).toBe(true);
    });

    it('includes pre-configured goal presets for task splitting', () => {
      expect(TASK_SPLIT_PRESETS.length).toBeGreaterThanOrEqual(3);
      expect(TASK_SPLIT_PRESETS[0].objective).toBeDefined();
    });
  });

  describe('Task Splitting & Delegation Flow', () => {
    it('decomposes master objective into subtasks and dispatches flying envelopes', () => {
      const taskSplitCallback = vi.fn();
      engine.onTaskSplitComplete = taskSplitCallback;

      const tasks = engine.splitAndDelegateTask(
        'Deploy the new AI-powered interactive Paper Catalog with real-time pricing and stock alerts.'
      );

      expect(tasks.length).toBeGreaterThanOrEqual(3);
      expect(taskSplitCallback).toHaveBeenCalledWith(tasks);
      expect(engine.activeTasks).toEqual(tasks);

      // Fast-forward fake timers to execute staggered envelope dispatches
      vi.advanceTimersByTime(2500);

      // Verify flying envelopes were spawned
      expect(engine.envelopes.length).toBeGreaterThanOrEqual(3);
      expect(engine.messageHistory.length).toBeGreaterThanOrEqual(3);

      // Check first dispatched message
      const firstMsg = engine.messageHistory[engine.messageHistory.length - 1];
      expect(firstMsg.act).toBe('request');
      expect(firstMsg.fromAgentId).toBe('michael');
    });

    it('allows direct peer-to-peer mail envelope dispatch', () => {
      const messageCallback = vi.fn();
      engine.onMessageSent = messageCallback;

      engine.sendDirectMail('dwight', 'jim', 'Bears, Beets, Battlestar Galactica inquiry', 'query');

      expect(engine.envelopes.length).toBe(1);
      expect(engine.envelopes[0].fromAgentId).toBe('dwight');
      expect(engine.envelopes[0].toAgentId).toBe('jim');
      expect(engine.envelopes[0].act).toBe('query');
      expect(messageCallback).toHaveBeenCalled();
    });
  });

  describe('Cigarette / Cigar Smoke Break', () => {
    it('navigates character to window and engages smoking state', () => {
      engine.startSmoking('michael', 10);
      const michael = engine.characters.find((c) => c.def.id === 'michael')!;

      expect(michael.presence).toBe('break');
      // Should have path toward window
      expect(michael.path.length).toBeGreaterThan(0);

      // Simulate character arriving at window
      michael.tileX = 5;
      michael.tileY = 3;
      michael.path = [];
      if (michael.onSmokeDone) {
        michael.onSmokeDone();
      }

      expect(michael.isSmoking).toBe(true);
      expect(michael.state).toBe('smoking');
      expect(michael.facing).toBe('up');
      expect(michael.bubble?.text).toBeDefined();
    });

    it('stops smoking and returns character to desk cleanly', () => {
      engine.startSmoking('michael', 10);
      engine.stopSmoking('michael');
      const michael = engine.characters.find((c) => c.def.id === 'michael')!;

      expect(michael.isSmoking).toBe(false);
      expect(michael.state).toBe('working');
      expect(michael.presence).toBe('working');
    });
  });

  describe('Plant Watering Routine', () => {
    it('navigates character to plant and triggers watering droplets', () => {
      engine.startWatering('pam', 'plant_reception', 6);
      const pam = engine.characters.find((c) => c.def.id === 'pam')!;

      expect(pam.presence).toBe('break');
      expect(pam.targetPlantId).toBe('plant_reception');

      // Simulate arrival at reception fern stand tile
      pam.tileX = 4;
      pam.tileY = 15;
      pam.path = [];
      if (pam.onWaterDone) {
        pam.onWaterDone();
      }

      expect(pam.isWatering).toBe(true);
      expect(pam.state).toBe('watering');
      expect(pam.bubble?.text).toContain('Feeding Reception Welcome Fern');

      // Finish watering timer
      if (pam.onWaterDone) {
        pam.onWaterDone();
      }
      expect(engine.wateredPlantIds.has('plant_reception')).toBe(true);
    });
  });

  describe('Coffee Economy & Window Gazing', () => {
    it('initiates coffee run and carries steaming mug', () => {
      engine.grabCoffee('jim', 8);
      const jim = engine.characters.find((c) => c.def.id === 'jim')!;

      expect(jim.presence).toBe('break');
      expect(jim.state).toBe('coffee');
    });

    it('navigates to north window for skyline window gaze', () => {
      engine.gazeWindow('pam', 7);
      const pam = engine.characters.find((c) => c.def.id === 'pam')!;

      expect(pam.presence).toBe('away');
      expect(pam.path.length).toBeGreaterThan(0);
    });
  });
});
