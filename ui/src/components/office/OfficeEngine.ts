// Dunder Mifflin 2D Office Engine
// 60FPS Canvas Animation Loop, Grid Pathfinding, State Machine & Audio FX

import {
  OFFICE_CHARACTERS,
  ROOM_ZONES,
  OFFICE_ANCHORS,
  CONFERENCE_SEATS,
  BREAKROOM_SEATS,
  OFFICE_PLANTS,
  OFFICE_ERRAND_SPOTS,
  DOORWAY_THRESHOLDS,
  TILE_SIZE,
  WORLD_TILES_X,
  WORLD_TILES_Y,
  type OfficeCharacter,
  type OfficeEventKind,
  type PresenceState,
  type OfficePlant,
  type OfficeErrandSpot,
} from './officeConstants';

import {
  getCharacterSprites,
  drawOfficeBackground,
  drawRoomBoundary,
  drawOfficeDesk,
  drawWhiteboard,
  drawConferenceTable,
  drawBreakroomTable,
  drawOfficeWindow,
  drawOfficeDoorway,
  drawCoffeeMachine,
  drawWaterCooler,
  drawVendingMachine,
  drawCopier,
  drawSpeechBubble,
  drawFlyingEnvelope,
  drawOfficePlant,
  drawCigaretteSmoking,
  drawWateringCanAndStream,
  drawCarriedCoffeeMug,
  type CharacterSpriteSet,
} from './officeArt';

import {
  createFlyingEnvelope,
  updateFlyingEnvelope,
  decomposeObjective,
  type FlyingEnvelope,
  type MessageAct,
  type TaskSplitSpec,
  type HiveMessage,
} from './officeMailbox';

export interface SimCharacter {
  def: OfficeCharacter;
  sprites: CharacterSpriteSet;
  x: number; // pixel coords
  y: number;
  tileX: number;
  tileY: number;
  targetTile: { x: number; y: number } | null;
  path: { x: number; y: number }[];
  facing: 'down' | 'up' | 'left' | 'right';
  state: 'working' | 'walking' | 'idle_chat' | 'coffee' | 'meeting' | 'panic' | 'phone' | 'smoking' | 'watering' | 'coffee_carry' | 'window_gaze';
  presence: PresenceState;
  stepPhase: number;
  walkTick: number;
  actionTimer: number;
  bubble?: { text: string; timer: number; isThought?: boolean };
  visible?: boolean;
  greyed?: boolean;
  badge?: string;
  isSmoking?: boolean;
  smokePhase?: number;
  smokeTimer?: number;
  onSmokeDone?: () => void;
  isWatering?: boolean;
  waterPhase?: number;
  waterTimer?: number;
  targetPlantId?: string;
  onWaterDone?: () => void;
  carryingCup?: boolean;
  cupPhase?: number;
  cupTimer?: number;
  isWindowGazing?: boolean;
  gazeTimer?: number;
  activeTaskTitle?: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

let globalAudioCtx: AudioContext | null = null;

export function playRetroOfficeSound(kind: 'phone' | 'siren' | 'coffee' | 'fanfare' | 'click' | 'stapler') {
  try {
    if (!globalAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
    if (!globalAudioCtx) return;

    const now = globalAudioCtx.currentTime;
    const osc = globalAudioCtx.createOscillator();
    const gain = globalAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(globalAudioCtx.destination);

    if (kind === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (kind === 'stapler') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(300, now + 0.03);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (kind === 'phone') {
      // Classic office switchboard ring
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(480, now + 0.06);
      osc.frequency.setValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (kind === 'coffee') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (kind === 'siren') {
      // Fire drill alarm pulse
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(950, now + 0.15);
      osc.frequency.linearRampToValueAtTime(700, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (kind === 'fanfare') {
      // The Dundies victory jingle
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, C
      notes.forEach((freq, idx) => {
        if (!globalAudioCtx) return;
        const noteOsc = globalAudioCtx.createOscillator();
        const noteGain = globalAudioCtx.createGain();
        noteOsc.connect(noteGain);
        noteGain.connect(globalAudioCtx.destination);
        noteOsc.type = 'triangle';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.08);
        noteGain.gain.setValueAtTime(0.15, now + idx * 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        noteOsc.start(now + idx * 0.08);
        noteOsc.stop(now + idx * 0.08 + 0.2);
      });
    }
  } catch {
    // Audio context policy fallback
  }
}

export class OfficeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastTime = 0;

  public characters: SimCharacter[] = [];
  public selectedCharacterId: string | null = null;
  public selectedRoomId: string | null = null;
  public currentEvent: OfficeEventKind = 'normal';
  public eventTimer = 0;
  public soundEnabled = true;
  public isLiveMode = false;

  // Camera & Viewport
  public zoom = 1.0;
  public panX = 0;
  public panY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // Collision Grid
  private grid: boolean[][] = []; // true = walkable, false = blocked
  private particles: Particle[] = [];
  private ambientPhase = 0;

  // Audio Context (Synthesizer)
  private audioCtx: AudioContext | null = null;

  // Flying Message Envelopes (Hive Mailbox)
  public envelopes: FlyingEnvelope[] = [];
  public onEnvelopeDelivered?: (env: FlyingEnvelope) => void;

  // Active Tasks & Hive Mailbox State (Munder Difflin Task Splitting)
  public activeTasks: TaskSplitSpec[] = [];
  public messageHistory: HiveMessage[] = [];
  public wateredPlantIds: Set<string> = new Set();
  public onTaskSplitComplete?: (tasks: TaskSplitSpec[]) => void;
  public onMessageSent?: (msg: HiveMessage) => void;

  // Event Listeners
  public onCharacterSelect?: (char: OfficeCharacter) => void;
  public onEventChange?: (event: OfficeEventKind) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.buildCollisionGrid();
    this.initCharacters();
    this.setupInteractions();
  }

  // ─── Grid & Walkability ───────────────────────────────────────────────────
  private buildCollisionGrid() {
    this.grid = Array.from({ length: WORLD_TILES_Y }, () =>
      Array.from({ length: WORLD_TILES_X }, () => true)
    );

    // Block outer perimeter
    for (let x = 0; x < WORLD_TILES_X; x++) {
      this.grid[0][x] = false;
      this.grid[1][x] = false;
      this.grid[WORLD_TILES_Y - 1][x] = false;
    }
    for (let y = 0; y < WORLD_TILES_Y; y++) {
      this.grid[y][0] = false;
      this.grid[y][1] = false;
      this.grid[y][WORLD_TILES_X - 1] = false;
    }

    // Block room partition walls (leaving doorways open)
    // Wall between Manager and Conference: x=13, y=2..11 (doorway at y=8)
    for (let y = 2; y <= 11; y++) {
      if (y !== 8 && y !== 9) this.grid[y][13] = false;
    }
    // Wall between Conference and Breakroom: x=31, y=2..12 (doorway at y=7)
    for (let y = 2; y <= 12; y++) {
      if (y !== 7 && y !== 8) this.grid[y][31] = false;
    }
    // Wall below Manager/Conference/Breakroom: y=12, x=2..47 (doorways at x=7, x=22, x=38)
    for (let x = 2; x <= 47; x++) {
      if (x !== 7 && x !== 8 && x !== 21 && x !== 22 && x !== 38 && x !== 39) {
        this.grid[12][x] = false;
      }
    }

    // Block solid furniture locations (desks, tables)
    OFFICE_CHARACTERS.forEach((c) => {
      // Desk takes 2 tiles horizontally
      if (this.grid[c.deskCoord.y]) {
        this.grid[c.deskCoord.y][c.deskCoord.x] = false;
        if (c.deskCoord.x + 1 < WORLD_TILES_X) {
          this.grid[c.deskCoord.y][c.deskCoord.x + 1] = false;
        }
      }
    });

    // Conference table block: x=17..25, y=6..7
    for (let y = 6; y <= 7; y++) {
      for (let x = 17; x <= 25; x++) {
        this.grid[y][x] = false;
      }
    }

    // Breakroom table block: x=38..42, y=8
    for (let x = 38; x <= 42; x++) {
      this.grid[8][x] = false;
    }
  }

  // ─── Character Init ───────────────────────────────────────────────────────
  private initCharacters() {
    this.characters = OFFICE_CHARACTERS.map((charDef) => {
      const sprites = getCharacterSprites(charDef);
      const startX = charDef.deskCoord.x * TILE_SIZE;
      const startY = charDef.deskCoord.y * TILE_SIZE + 4;

      return {
        def: charDef,
        sprites,
        x: startX,
        y: startY,
        tileX: charDef.deskCoord.x,
        tileY: charDef.deskCoord.y,
        targetTile: null,
        path: [],
        facing: charDef.deskFacing,
        state: 'working',
        presence: 'working',
        stepPhase: 0,
        walkTick: 0,
        actionTimer: 60 + Math.random() * 200,
        visible: true,
        greyed: false,
      };
    });
  }

  // ─── Live Mode Imperative Commands ───────────────────────────────────────
  public setLiveMode(isLive: boolean) {
    this.isLiveMode = isLive;
    if (isLive) {
      // Clear autonomous errand paths when live mode is engaged
      this.characters.forEach((c) => {
        c.actionTimer = 999999;
      });
    }
  }

  public setAgentPresence(charId: string, presence: PresenceState) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (char) {
      char.presence = presence;
    }
  }

  public setAgentTarget(
    charId: string,
    targetTile: { x: number; y: number },
    state: SimCharacter['state']
  ) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (!char) return;

    if (char.tileX === targetTile.x && char.tileY === targetTile.y) {
      char.state = state;
      char.targetTile = null;
      char.path = [];
      return;
    }

    const path = this.findPath({ x: char.tileX, y: char.tileY }, targetTile);
    char.targetTile = targetTile;
    char.path = path;
    char.state = path.length > 0 ? 'walking' : state;
  }

  public setAgentBubble(charId: string, text: string, isThought?: boolean) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (char) {
      char.bubble = {
        text,
        timer: 300, // 5 seconds
        isThought,
      };
    }
  }

  public setAgentVisibility(charId: string, visible: boolean) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (char) {
      char.visible = visible;
    }
  }

  public setAgentGreyed(charId: string, greyed: boolean) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (char) {
      char.greyed = greyed;
    }
  }

  public setAgentBadge(charId: string, badge?: string) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (char) {
      char.badge = badge;
    }
  }

  public upsertCharacter(charDef: OfficeCharacter): SimCharacter {
    let char = this.characters.find((c) => c.def.id === charDef.id);
    if (!char) {
      const sprites = getCharacterSprites(charDef);
      const startX = charDef.deskCoord.x * TILE_SIZE;
      const startY = charDef.deskCoord.y * TILE_SIZE + 4;
      char = {
        def: charDef,
        sprites,
        x: startX,
        y: startY,
        tileX: charDef.deskCoord.x,
        tileY: charDef.deskCoord.y,
        targetTile: null,
        path: [],
        facing: charDef.deskFacing,
        state: 'working',
        presence: 'working',
        stepPhase: 0,
        walkTick: 0,
        actionTimer: 999999,
        visible: true,
        greyed: false,
      };
      this.characters.push(char);
    }
    return char;
  }

  public resetToDemoCharacters() {
    this.isLiveMode = false;
    this.initCharacters();
  }



  // ─── Audio Synthesis (Retro 8-bit sound effects) ───────────────────────────
  public playSound(kind: 'phone' | 'siren' | 'coffee' | 'fanfare' | 'click' | 'stapler') {
    if (!this.soundEnabled) return;
    playRetroOfficeSound(kind);
  }

  // ─── Pathfinding (A* Algorithm) ──────────────────────────────────────────
  public findPath(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const startKey = `${start.x},${start.y}`;
    const endKey = `${end.x},${end.y}`;
    if (startKey === endKey) return [];

    interface Node {
      x: number;
      y: number;
      g: number;
      h: number;
      f: number;
      parent: Node | null;
    }

    const openList: Node[] = [];
    const closedSet = new Set<string>();

    const heuristic = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    openList.push({
      x: start.x,
      y: start.y,
      g: 0,
      h: heuristic(start, end),
      f: heuristic(start, end),
      parent: null,
    });

    while (openList.length > 0) {
      // Lowest f score
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;
      const curKey = `${current.x},${current.y}`;

      if (current.x === end.x && current.y === end.y) {
        const path: { x: number; y: number }[] = [];
        let curr: Node | null = current;
        while (curr && curr.parent) {
          path.unshift({ x: curr.x, y: curr.y });
          curr = curr.parent;
        }
        return path;
      }

      closedSet.add(curKey);

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const nb of neighbors) {
        if (nb.x < 0 || nb.x >= WORLD_TILES_X || nb.y < 0 || nb.y >= WORLD_TILES_Y) continue;
        const nbKey = `${nb.x},${nb.y}`;
        if (closedSet.has(nbKey)) continue;

        // Walkable check: allow reaching end tile even if furniture
        const isWalkable = this.grid[nb.y]?.[nb.x] || (nb.x === end.x && nb.y === end.y);
        if (!isWalkable) continue;

        const gScore = current.g + 1;
        let existing = openList.find((n) => n.x === nb.x && n.y === nb.y);

        if (!existing) {
          const h = heuristic(nb, end);
          openList.push({
            x: nb.x,
            y: nb.y,
            g: gScore,
            h,
            f: gScore + h,
            parent: current,
          });
        } else if (gScore < existing.g) {
          existing.g = gScore;
          existing.f = gScore + existing.h;
          existing.parent = current;
        }
      }
    }

    return []; // No path found
  }

  // ─── Interaction Handlers ────────────────────────────────────────────────
  private setupInteractions() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.dragStartX;
      this.panY = e.clientY - this.dragStartY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.max(0.65, Math.min(2.4, this.zoom * zoomFactor));
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - this.panX) / this.zoom;
      const clickY = (e.clientY - rect.top - this.panY) / this.zoom;

      // Check click on characters
      for (const char of this.characters) {
        if (char.visible === false) continue;
        const cx = char.x + 8;
        const cy = char.y + 16;
        const dist = Math.hypot(clickX - cx, clickY - cy);
        if (dist < 20) {
          this.selectedCharacterId = char.def.id;
          this.playSound('click');
          this.sayQuote(char);
          if (this.onCharacterSelect) this.onCharacterSelect(char.def);
          return;
        }
      }

      // Check click on rooms
      const tileX = Math.floor(clickX / TILE_SIZE);
      const tileY = Math.floor(clickY / TILE_SIZE);
      const clickedRoom = ROOM_ZONES.find(
        (r) => tileX >= r.x && tileX < r.x + r.w && tileY >= r.y && tileY < r.y + r.h
      );
      if (clickedRoom) {
        this.selectedRoomId = clickedRoom.id;
        this.playSound('click');
      }
    });
  }

  // ─── Speech & Quotes ──────────────────────────────────────────────────────
  public sayQuote(char: SimCharacter, specificQuote?: string) {
    const quote = specificQuote || char.def.quotes[Math.floor(Math.random() * char.def.quotes.length)];
    char.bubble = {
      text: quote,
      timer: 240, // 4 seconds
    };
  }

  // ─── Event Director ───────────────────────────────────────────────────────
  public triggerEvent(kind: OfficeEventKind) {
    this.currentEvent = kind;
    this.eventTimer = 400; // ~6.5 seconds duration
    if (this.onEventChange) this.onEventChange(kind);

    if (kind === 'fire_drill') {
      this.playSound('siren');
      // Dwight yells and characters panic
      const dwight = this.characters.find((c) => c.def.id === 'dwight');
      if (dwight) {
        this.sayQuote(dwight, 'FIRE DRILL! STAY CALM! THE FIRE IS SHOOTING AT US!');
      }
      this.characters.forEach((c) => {
        c.state = 'panic';
        c.presence = 'focus';
        // Pick a random open corridor to run toward
        const randomX = 14 + Math.floor(Math.random() * 20);
        const randomY = 12 + Math.floor(Math.random() * 12);
        c.path = this.findPath({ x: c.tileX, y: c.tileY }, { x: randomX, y: randomY });
      });
      // Spawn fire smoke particles from wastebasket
      for (let i = 0; i < 35; i++) {
        this.particles.push({
          x: 23 * TILE_SIZE + Math.random() * 12,
          y: 15 * TILE_SIZE,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 2 - 0.5,
          color: Math.random() > 0.4 ? '#64748b' : '#f97316',
          size: Math.random() * 6 + 3,
          life: 0,
          maxLife: 80 + Math.random() * 60,
        });
      }
    } else if (kind === 'all_hands') {
      this.playSound('click');
      const michael = this.characters.find((c) => c.def.id === 'michael');
      if (michael) {
        this.sayQuote(michael, 'CONFERENCE ROOM, FIVE MINUTES! THAT MEANS YOU TOO, TOBY.');
        michael.path = this.findPath({ x: michael.tileX, y: michael.tileY }, { x: 22, y: 4 });
        michael.state = 'walking';
      }
      // Seat characters in conference room
      this.characters.forEach((c, idx) => {
        if (c.def.id === 'michael') return;
        const seat = CONFERENCE_SEATS[idx % CONFERENCE_SEATS.length];
        c.path = this.findPath({ x: c.tileX, y: c.tileY }, seat);
        c.state = 'walking';
        c.presence = 'meeting';
      });
    } else if (kind === 'birthday') {
      this.playSound('fanfare');
      const pam = this.characters.find((c) => c.def.id === 'pam');
      if (pam) this.sayQuote(pam, 'IT IS YOUR BIRTHDAY. Party Planning Committee approved.');
      // Characters gather in break room
      this.characters.forEach((c, idx) => {
        const seat = BREAKROOM_SEATS[idx % BREAKROOM_SEATS.length];
        c.path = this.findPath({ x: c.tileX, y: c.tileY }, seat);
        c.state = 'walking';
        c.presence = 'break';
      });
      // Spawn party confetti
      const confColors = ['#ffca54', '#38bdf8', '#f43f5e', '#a855f7', '#22c55e'];
      for (let i = 0; i < 60; i++) {
        this.particles.push({
          x: 34 * TILE_SIZE + Math.random() * (12 * TILE_SIZE),
          y: 3 * TILE_SIZE + Math.random() * (4 * TILE_SIZE),
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 1.5 + 0.5,
          color: confColors[Math.floor(Math.random() * confColors.length)],
          size: Math.random() * 4 + 2,
          life: 0,
          maxLife: 140,
        });
      }
    } else if (kind === 'dundies') {
      this.playSound('fanfare');
      const michael = this.characters.find((c) => c.def.id === 'michael');
      if (michael) {
        this.sayQuote(michael, 'Welcome to the 8th Annual Dundie Awards! Feel God in this Chili’s tonight!');
      }
      const jim = this.characters.find((c) => c.def.id === 'jim');
      if (jim) this.sayQuote(jim, 'Best Hair Award winner right here.');
    } else if (kind === 'phone_call') {
      this.playSound('phone');
      const pam = this.characters.find((c) => c.def.id === 'pam');
      if (pam) {
        pam.state = 'phone';
        this.sayQuote(pam, 'Dunder Mifflin Scranton, this is Pam. How may I direct your call?');
      }
    }
  }

  // ─── Camera Jumps ─────────────────────────────────────────────────────────
  public panToRoom(roomId: string) {
    const room = ROOM_ZONES.find((r) => r.id === roomId);
    if (!room) return;
    this.selectedRoomId = roomId;
    const roomCenterX = (room.x + room.w / 2) * TILE_SIZE;
    const roomCenterY = (room.y + room.h / 2) * TILE_SIZE;
    this.panX = this.canvas.width / 2 - roomCenterX * this.zoom;
    this.panY = this.canvas.height / 2 - roomCenterY * this.zoom;
  }

  public panToCharacter(charId: string) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (!char) return;
    this.selectedCharacterId = charId;
    this.panX = this.canvas.width / 2 - char.x * this.zoom;
    this.panY = this.canvas.height / 2 - char.y * this.zoom;
    this.sayQuote(char);
  }

  // ─── Hive Mailbox & Flying Envelope Dispatch ──────────────────────────────
  public spawnEnvelope(
    fromAgentId: string,
    toAgentId: string,
    act: MessageAct = 'request',
    subject = '',
    needsHuman = false
  ) {
    if (fromAgentId === toAgentId) return;

    // Find start and end positions based on agent desks
    const fromChar = this.characters.find((c) => c.def.id === fromAgentId);
    const toChar = this.characters.find((c) => c.def.id === toAgentId);

    const startCoord = fromChar
      ? { x: fromChar.x + 9, y: fromChar.y + 16 }
      : { x: 7 * TILE_SIZE + 9, y: 6 * TILE_SIZE + 16 }; // default to Michael's desk
    const endCoord = toChar
      ? { x: toChar.x + 9, y: toChar.y + 16 }
      : { x: 20 * TILE_SIZE + 9, y: 18 * TILE_SIZE + 16 };

    const env = createFlyingEnvelope(
      fromAgentId,
      toAgentId,
      startCoord,
      endCoord,
      act,
      subject,
      needsHuman
    );
    this.envelopes.push(env);

    if (this.soundEnabled) {
      this.playSound('click');
    }
  }

  public sendDirectMail(
    fromAgentId: string,
    toAgentId: string,
    subject: string,
    act: MessageAct = 'request',
    body = ''
  ) {
    const fromChar = this.characters.find((c) => c.def.id === fromAgentId);
    const toChar = this.characters.find((c) => c.def.id === toAgentId);
    const msg: HiveMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromAgentId,
      fromName: fromChar?.def.displayName || fromAgentId,
      toAgentId,
      toName: toChar?.def.displayName || toAgentId,
      act,
      subject,
      body: body || subject,
      timestamp: Date.now(),
      conversationId: `conv-${Date.now()}`,
    };
    this.messageHistory.unshift(msg);
    if (this.messageHistory.length > 60) this.messageHistory.pop();
    this.onMessageSent?.(msg);
    this.spawnEnvelope(fromAgentId, toAgentId, act, subject);
  }

  // ─── Task Splitting & Multi-Agent Delegation (Munder Difflin CEO Flow) ───
  public splitAndDelegateTask(objective: string, fromAgentId = 'michael'): TaskSplitSpec[] {
    const fromChar = this.characters.find((c) => c.def.id === fromAgentId) || this.characters[0];
    const rosterCandidates = this.characters.map((c) => ({
      id: c.def.id,
      name: c.def.displayName,
      role: c.def.title,
    }));

    const tasks = decomposeObjective(objective, rosterCandidates, fromAgentId);
    this.activeTasks = tasks;
    this.onTaskSplitComplete?.(tasks);

    // Boss announcement
    if (fromChar) {
      this.sayQuote(fromChar, `Priority: "${objective.slice(0, 30)}..." Delegating across the floor!`);
    }

    if (this.soundEnabled) {
      this.playSound('click');
    }

    // Sequentially dispatch mail envelopes with realistic stagger
    tasks.forEach((task, idx) => {
      setTimeout(() => {
        const msg: HiveMessage = {
          id: `msg-split-${task.id}`,
          fromAgentId,
          fromName: fromChar?.def.displayName || 'Michael Scott',
          toAgentId: task.assigneeAgentId,
          toName: task.assigneeName,
          act: task.act,
          subject: task.title,
          body: task.description,
          timestamp: Date.now(),
          conversationId: `task-split-${Date.now()}`,
        };
        this.messageHistory.unshift(msg);
        if (this.messageHistory.length > 60) this.messageHistory.pop();
        this.onMessageSent?.(msg);

        // Spawn flying envelope
        this.spawnEnvelope(fromAgentId, task.assigneeAgentId, task.act, task.title);

        // Assign task to recipient character
        const recipient = this.characters.find((c) => c.def.id === task.assigneeAgentId);
        if (recipient) {
          recipient.activeTaskTitle = task.title;
        }
      }, (idx + 1) * 450);
    });

    return tasks;
  }

  // ─── Errand Actions: Smoking, Plant Watering, Coffee, Window Gaze ─────────

  /**
   * Cigar / Cigarette smoke break at the open window
   */
  public startSmoking(charId: string, duration = 14, onDone?: () => void) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (!char) return;

    // Pick window: Michael goes to his office cracked window, others go to north corridor window
    const spot = char.def.id === 'michael'
      ? OFFICE_ERRAND_SPOTS.find((s) => s.id === 'smoke_window_michael')!
      : OFFICE_ERRAND_SPOTS.find((s) => s.id === 'smoke_window_north')!;

    char.presence = 'break';
    char.state = 'walking';
    char.path = this.findPath({ x: char.tileX, y: char.tileY }, spot.standTile);

    const onArrive = () => {
      char.facing = spot.facing;
      char.state = 'smoking';
      char.isSmoking = true;
      char.smokePhase = 0;
      char.smokeTimer = duration * 60;
      char.onSmokeDone = () => {
        char.isSmoking = false;
        char.state = 'working';
        char.presence = 'working';
        char.path = this.findPath({ x: char.tileX, y: char.tileY }, char.def.deskCoord);
        onDone?.();
      };
      const quote = spot.thoughtQuotes[Math.floor(Math.random() * spot.thoughtQuotes.length)];
      char.bubble = { text: quote, timer: 200, isThought: true };
    };

    if (char.tileX === spot.standTile.x && char.tileY === spot.standTile.y) {
      onArrive();
    } else {
      char.onSmokeDone = onArrive;
    }
  }

  public stopSmoking(charId: string) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (char) {
      char.isSmoking = false;
      char.smokeTimer = 0;
      char.state = 'working';
      char.presence = 'working';
      char.path = this.findPath({ x: char.tileX, y: char.tileY }, char.def.deskCoord);
    }
  }

  /**
   * Feed water to office plant
   */
  public startWatering(charId: string, plantId?: string, duration = 6, onDone?: () => void) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (!char) return;

    let plant = OFFICE_PLANTS.find((p) => p.id === plantId);
    if (!plant) {
      plant = OFFICE_PLANTS.find((p) => !this.wateredPlantIds.has(p.id)) || OFFICE_PLANTS[0];
    }

    char.presence = 'break';
    char.state = 'walking';
    char.targetPlantId = plant.id;
    char.path = this.findPath({ x: char.tileX, y: char.tileY }, plant.standTile);

    const onArrive = () => {
      const dx = plant!.tile.x - char.tileX;
      const dy = plant!.tile.y - char.tileY;
      char.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      char.state = 'watering';
      char.isWatering = true;
      char.waterPhase = 0;
      char.waterTimer = duration * 60;
      char.onWaterDone = () => {
        char.isWatering = false;
        this.wateredPlantIds.add(plant!.id);
        char.state = 'working';
        char.presence = 'working';
        char.path = this.findPath({ x: char.tileX, y: char.tileY }, char.def.deskCoord);
        onDone?.();
      };
      char.bubble = {
        text: `Feeding ${plant!.name}... Looking lively!`,
        timer: 180,
        isThought: true,
      };
      if (this.soundEnabled) {
        this.playSound('click');
      }
    };

    if (char.tileX === plant.standTile.x && char.tileY === plant.standTile.y) {
      onArrive();
    } else {
      char.onWaterDone = onArrive;
    }
  }

  public stopWatering(charId: string) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (char) {
      char.isWatering = false;
      char.waterTimer = 0;
      char.state = 'working';
      char.presence = 'working';
      char.path = this.findPath({ x: char.tileX, y: char.tileY }, char.def.deskCoord);
    }
  }

  /**
   * Run to coffee maker, brew, and carry steaming mug back
   */
  public grabCoffee(charId: string, duration = 8, onDone?: () => void) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (!char) return;

    const coffeeSpot = OFFICE_ANCHORS.find((a) => a.kind === 'coffee')!;
    char.presence = 'break';
    char.state = 'coffee';
    char.path = this.findPath({ x: char.tileX, y: char.tileY }, coffeeSpot.standTile);

    const onArrive = () => {
      char.facing = 'up';
      if (this.soundEnabled) {
        this.playSound('coffee');
      }
      char.carryingCup = true;
      char.cupPhase = 0;
      char.cupTimer = 600;
      char.bubble = {
        text: 'Fresh Scranton dark roast! Hot and steaming.',
        timer: 180,
        isThought: true,
      };

      setTimeout(() => {
        char.path = this.findPath({ x: char.tileX, y: char.tileY }, char.def.deskCoord);
        char.state = 'walking';
        onDone?.();
      }, 2000);
    };

    if (char.tileX === coffeeSpot.standTile.x && char.tileY === coffeeSpot.standTile.y) {
      onArrive();
    } else {
      char.onSmokeDone = onArrive;
    }
  }

  /**
   * Gaze out north wall window at Scranton skyline
   */
  public gazeWindow(charId: string, duration = 7, onDone?: () => void) {
    const char = this.characters.find((c) => c.def.id === charId);
    if (!char) return;

    const windowSpot = OFFICE_ERRAND_SPOTS.find((s) => s.id === 'window_gaze_peace')!;
    char.presence = 'away';
    char.state = 'walking';
    char.path = this.findPath({ x: char.tileX, y: char.tileY }, windowSpot.standTile);

    const onArrive = () => {
      char.facing = 'up';
      char.state = 'window_gaze';
      char.isWindowGazing = true;
      char.gazeTimer = duration * 60;
      char.bubble = {
        text: 'Gazing out at the Scranton skyline... breeze feels nice.',
        timer: 180,
        isThought: true,
      };
      setTimeout(() => {
        char.isWindowGazing = false;
        char.state = 'working';
        char.presence = 'working';
        char.path = this.findPath({ x: char.tileX, y: char.tileY }, char.def.deskCoord);
        onDone?.();
      }, duration * 1000);
    };

    if (char.tileX === windowSpot.standTile.x && char.tileY === windowSpot.standTile.y) {
      onArrive();
    } else {
      char.onSmokeDone = onArrive;
    }
  }

  public takeSmokeBreak(charId?: string) {
    const id = charId || this.selectedCharacterId || (Math.random() > 0.5 ? 'michael' : 'creed');
    this.startSmoking(id);
  }

  public waterNearestPlant(charId?: string) {
    const id = charId || this.selectedCharacterId || 'pam';
    this.startWatering(id);
  }


  public resetCamera() {
    this.zoom = 1.0;
    this.panX = (this.canvas.width - WORLD_TILES_X * TILE_SIZE) / 2;
    this.panY = (this.canvas.height - WORLD_TILES_Y * TILE_SIZE) / 2;
  }

  // ─── Main Update & Animation Loop ─────────────────────────────────────────
  public start() {
    if (this.animFrameId) return;
    this.lastTime = performance.now();
    this.resetCamera();

    const loop = (currentTime: number) => {
      const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;

      this.update(delta);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private update(delta: number) {
    this.ambientPhase += delta * 4;

    // Handle event timers
    if (this.currentEvent !== 'normal') {
      this.eventTimer--;
      if (this.eventTimer <= 0) {
        this.currentEvent = 'normal';
        // Send everyone back to their desks
        this.characters.forEach((c) => {
          c.path = this.findPath({ x: c.tileX, y: c.tileY }, c.def.deskCoord);
          c.state = 'walking';
          c.presence = 'working';
        });
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update flying envelopes (Hive Mailbox)
    for (let i = this.envelopes.length - 1; i >= 0; i--) {
      const env = this.envelopes[i];
      if (!env) continue;
      const finished = updateFlyingEnvelope(env, delta);
      if (finished) {
        if (this.soundEnabled) {
          this.playSound('stapler');
        }
        const recipient = this.characters.find((c) => c.def.id === env.toAgentId);
        if (recipient) {
          const bubbleText =
            env.act === 'done'
              ? 'Task finished!'
              : env.subject
              ? `Task: ${env.subject.slice(0, 24)}`
              : 'New mail received!';
          recipient.bubble = { text: bubbleText, timer: 140 };
          if (env.act === 'request' && recipient.state !== 'panic') {
            recipient.state = 'working';
            recipient.presence = 'focus';
          }
        }
        this.onEnvelopeDelivered?.(env);
        this.envelopes.splice(i, 1);
      }
    }

    // Update characters
    this.characters.forEach((c) => {
      // Bubble timer
      if (c.bubble) {
        c.bubble.timer--;
        if (c.bubble.timer <= 0) delete c.bubble;
      }

      // Walking along path
      if (c.path.length > 0) {
        const nextTile = c.path[0];
        const targetX = nextTile.x * TILE_SIZE;
        const targetY = nextTile.y * TILE_SIZE + 4;

        const dx = targetX - c.x;
        const dy = targetY - c.y;
        const dist = Math.hypot(dx, dy);
        const speed = c.state === 'panic' ? 3.0 : 1.4;

        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (dist <= speed || prefersReducedMotion) {
          c.x = targetX;
          c.y = targetY;
          c.tileX = nextTile.x;
          c.tileY = nextTile.y;
          c.path.shift();

          if (c.path.length === 0) {
            // Check arrival callbacks for errands
            if (c.onSmokeDone && (c.state === 'smoking' || c.isSmoking || c.state === 'coffee' || c.state === 'window_gaze')) {
              const cb = c.onSmokeDone;
              c.onSmokeDone = undefined;
              cb();
            } else if (c.onWaterDone && (c.state === 'watering' || c.isWatering)) {
              const cb = c.onWaterDone;
              c.onWaterDone = undefined;
              cb();
            } else if (c.tileX === c.def.deskCoord.x && c.tileY === c.def.deskCoord.y) {
              c.state = 'working';
              c.presence = 'working';
              c.facing = c.def.deskFacing;
            } else {
              c.state = 'idle_chat';
              c.actionTimer = 180 + Math.random() * 240;
            }
          }
        } else {
          c.x += (dx / dist) * speed;
          c.y += (dy / dist) * speed;

          // Facing direction
          if (Math.abs(dx) > Math.abs(dy)) {
            c.facing = dx > 0 ? 'right' : 'left';
          } else {
            c.facing = dy > 0 ? 'down' : 'up';
          }

          // Walk cycle animation
          c.walkTick++;
          if (c.walkTick % 8 === 0) {
            c.stepPhase = (c.stepPhase + 1) % 3;
          }
        }
      } else {
        // Update active errand animation timers
        if (c.isSmoking) {
          c.smokePhase = (c.smokePhase ?? 0) + delta * 4;
          c.smokeTimer = (c.smokeTimer ?? 0) - delta * 60;
          if (c.smokeTimer <= 0) {
            c.isSmoking = false;
            c.onSmokeDone?.();
          }
        }
        if (c.isWatering) {
          c.waterPhase = (c.waterPhase ?? 0) + delta * 4;
          c.waterTimer = (c.waterTimer ?? 0) - delta * 60;
          if (c.waterTimer <= 0) {
            c.isWatering = false;
            c.onWaterDone?.();
          }
        }
        if (c.carryingCup) {
          c.cupPhase = (c.cupPhase ?? 0) + delta * 3;
          if (c.cupTimer !== undefined) {
            c.cupTimer -= delta * 60;
            if (c.cupTimer <= 0) c.carryingCup = false;
          }
        }
        if (c.isWindowGazing && c.gazeTimer !== undefined) {
          c.gazeTimer -= delta * 60;
        }

        // Idle / Autonomous errands logic (Demo mode only)
        if (!this.isLiveMode) {
          c.actionTimer--;
          if (c.actionTimer <= 0 && this.currentEvent === 'normal') {
            c.actionTimer = 300 + Math.random() * 500;

            if (c.state === 'working') {
              const roll = Math.random();
              if (roll < 0.22) {
                // Grab coffee with steaming mug
                this.grabCoffee(c.def.id);
              } else if (roll < 0.42) {
                // Feed water to an office plant
                this.startWatering(c.def.id);
              } else if (roll < 0.58) {
                // Cigarette / cigar break by the cracked window
                this.startSmoking(c.def.id);
              } else if (roll < 0.72) {
                // Gaze out the north window
                this.gazeWindow(c.def.id);
              } else if (roll < 0.86) {
                // Water cooler conversation
                const cooler = OFFICE_ANCHORS[Math.random() > 0.5 ? 2 : 3];
                c.path = this.findPath({ x: c.tileX, y: c.tileY }, cooler.standTile);
                c.state = 'idle_chat';
                c.presence = 'away';
              } else {
                // Type furiously at computer
                c.state = 'working';
                c.presence = 'focus';
              }
            } else {
              // Return to desk
              c.path = this.findPath({ x: c.tileX, y: c.tileY }, c.def.deskCoord);
              c.state = 'walking';
              c.presence = 'working';
            }
          }
        }
      }
    });
  }

  private render() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // Apply camera transform
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 1. Office Floor & Carpet
    drawOfficeBackground(ctx, WORLD_TILES_X * TILE_SIZE, WORLD_TILES_Y * TILE_SIZE);

    // 2. Room Boundaries
    ROOM_ZONES.forEach((room) => {
      drawRoomBoundary(
        ctx,
        room.x,
        room.y,
        room.w,
        room.h,
        room.name,
        room.color,
        room.accent
      );
    });

    // 2b. North Wall Windows (Munder Difflin daylight aesthetic with wind streaks)
    drawOfficeWindow(ctx, 3, 0, 4, 2, this.ambientPhase);
    drawOfficeWindow(ctx, 16, 0, 4, 2, this.ambientPhase);
    drawOfficeWindow(ctx, 24, 0, 4, 2, this.ambientPhase);
    drawOfficeWindow(ctx, 38, 0, 4, 2, this.ambientPhase);

    // 2c. Architectural Doorways & Open Thresholds
    drawOfficeDoorway(ctx, 7, 12, 'horizontal', 2, "MICHAEL'S OFFICE");
    drawOfficeDoorway(ctx, 21, 12, 'horizontal', 2, "CONFERENCE");
    drawOfficeDoorway(ctx, 38, 12, 'horizontal', 2, "BREAK ROOM");
    drawOfficeDoorway(ctx, 14, 30, 'horizontal', 3, "MAIN ENTRANCE");

    // 2d. Potted Office Plants (Ficus, Palm, Fern, Monstera)
    OFFICE_PLANTS.forEach((plant) => {
      drawOfficePlant(
        ctx,
        plant.tile.x,
        plant.tile.y,
        plant.type,
        this.ambientPhase,
        this.wateredPlantIds.has(plant.id)
      );
    });

    // 3. Static Props & Furniture
    drawWhiteboard(ctx, 21, 3);
    drawConferenceTable(ctx, 17, 6);
    drawBreakroomTable(ctx, 38, 8);
    drawCoffeeMachine(ctx, 36, 4, this.ambientPhase);
    drawWaterCooler(ctx, 18, 14, this.ambientPhase);
    drawWaterCooler(ctx, 35, 16, this.ambientPhase);
    drawVendingMachine(ctx, 44, 4);
    drawCopier(ctx, 30, 23);

    // Birthday Banner in Breakroom if birthday event
    if (this.currentEvent === 'birthday') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(36 * TILE_SIZE, 3 * TILE_SIZE, 180, 24);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(36 * TILE_SIZE, 3 * TILE_SIZE, 180, 24);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IT IS YOUR BIRTHDAY.', 36 * TILE_SIZE + 90, 3 * TILE_SIZE + 16);
    }

    // 4. Employee Desks with Animated Screens
    OFFICE_CHARACTERS.forEach((char) => {
      const simChar = this.characters.find((c) => c.def.id === char.id);
      const deskPresence = simChar && simChar.visible === false ? undefined : simChar?.presence;
      drawOfficeDesk(
        ctx,
        char.deskCoord.x,
        char.deskCoord.y,
        char.name,
        char.displayName,
        deskPresence,
        char.id === 'michael',
        this.ambientPhase
      );
    });

    // 5. Render Characters (sorted by Y coordinate for natural depth)
    const sortedCharacters = [...this.characters].sort((a, b) => a.y - b.y);

    sortedCharacters.forEach((c) => {
      if (c.visible === false) return;
      const isSelected = c.def.id === this.selectedCharacterId;

      ctx.save();
      if (c.greyed) {
        ctx.globalAlpha = 0.55;
      }

      // Selection glow / ring
      if (isSelected) {
        ctx.strokeStyle = '#ffca54'; // Drago Gold
        ctx.lineWidth = 3;
        ctx.strokeRect(c.x - 2, c.y - 2, 22, 36);
      }

      // Pick sprite frame based on state & facing
      let spriteImg: HTMLCanvasElement;
      if (c.state === 'panic') {
        spriteImg = c.sprites.panic;
      } else if (c.state === 'phone') {
        spriteImg = c.sprites.phone;
      } else if ((c.state === 'working' || c.presence === 'focus') && c.facing === 'down') {
        spriteImg = c.sprites.typing;
      } else if (c.facing === 'up') {
        spriteImg = c.stepPhase === 1 ? c.sprites.backWalk1 : c.stepPhase === 2 ? c.sprites.backWalk2 : c.sprites.backStand;
      } else {
        spriteImg = c.stepPhase === 1 ? c.sprites.frontWalk1 : c.stepPhase === 2 ? c.sprites.frontWalk2 : c.sprites.frontStand;
      }

      // Draw character sprite
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spriteImg, c.x, c.y);

      // Render active errand animation overlays (smoking, watering, coffee mug)
      if (c.isSmoking) {
        drawCigaretteSmoking(ctx, c.x, c.y, c.facing, c.smokePhase ?? this.ambientPhase);
      }
      if (c.isWatering && c.targetPlantId) {
        const plant = OFFICE_PLANTS.find((p) => p.id === c.targetPlantId);
        if (plant) {
          drawWateringCanAndStream(
            ctx,
            c.x,
            c.y,
            plant.tile.x,
            plant.tile.y,
            c.waterPhase ?? this.ambientPhase,
            c.facing
          );
        }
      }
      if (c.carryingCup) {
        drawCarriedCoffeeMug(ctx, c.x, c.y, c.facing, c.cupPhase ?? this.ambientPhase);
      }

      // Presence Dot Indicator above character
      const presenceColors: Record<PresenceState, string> = {
        working: '#22c55e',
        away: '#eab308',
        break: '#f97316',
        meeting: '#a855f7',
        focus: '#3b82f6',
        offline: '#64748b',
      };
      ctx.fillStyle = presenceColors[c.presence] || '#22c55e';
      ctx.beginPath();
      ctx.arc(c.x + 9, c.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Active Subtask Tag
      if (c.activeTaskTitle && !c.badge) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(c.x - 10, c.y - 17, 38, 10);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(c.x - 10, c.y - 17, 38, 10);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.activeTaskTitle.slice(0, 6) + '..', c.x + 9, c.y - 9.5);
      }

      // Speech / Thought Bubble
      if (c.bubble) {
        drawSpeechBubble(ctx, c.x + 9, c.y - 8, c.bubble.text, c.def.displayName.split(' ')[0], c.bubble.isThought);
      }

      // Live Badge (e.g. OVER BUDGET, FAILED, APPROVAL)
      if (c.badge) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px "Space Grotesk", sans-serif';
        const badgeMetrics = ctx.measureText(c.badge);
        const badgeWidth = badgeMetrics.width + 6;
        ctx.fillRect(c.x + 9 - badgeWidth / 2, c.y - 16, badgeWidth, 11);
        ctx.fillStyle = c.badge === 'OVER BUDGET' || c.badge === 'FAILED' ? '#ef4444' : '#ffca54';
        ctx.textAlign = 'center';
        ctx.fillText(c.badge, c.x + 9, c.y - 7);
      }

      ctx.restore();
    });

    // 6. Particles (Smoke, Confetti, Steam)
    this.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    // 7. Flying Message Envelopes (Desk-to-Desk Mail)
    this.envelopes.forEach((env) => {
      drawFlyingEnvelope(ctx, env);
    });

    ctx.restore();
  }
}
