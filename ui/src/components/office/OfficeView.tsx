// Geetorus 2D Virtual Office View
// Neo-brutalist interactive HUD with character drawer, camera controls, branch events & real Geetorus live sync

import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Flame,
  Users,
  Cake,
  Trophy,
  PhoneCall,
  Coffee,
  X,
  Sparkles,
  MapPin,
  Briefcase,
  Quote,
  Info,
  Radio,
  Clock,
  CircleAlert,
  Mail,
  Send,
  Droplets,
  Split,
  Eye,
  CheckCircle2,
  ListTodo,
  Inbox,
  Play,
} from 'lucide-react';
import { OfficeEngine } from './OfficeEngine';
import {
  OFFICE_CHARACTERS,
  ROOM_ZONES,
  OFFICE_PLANTS,
  OFFICE_ERRAND_SPOTS,
  type OfficeCharacter,
  type OfficeEventKind,
} from './officeConstants';
import { getCharacterSprites } from './officeArt';
import { useOfficeLiveSync } from './useOfficeLiveSync';
import {
  TASK_SPLIT_PRESETS,
  ACT_COLORS,
  type TaskSplitSpec,
  type HiveMessage,
  type MessageAct,
} from './officeMailbox';

export interface OfficeViewProps {
  companyId?: string | null;
  onAgentSelect?: (character: OfficeCharacter) => void;
  activeAgentCount?: number;
  focusedCharacterId?: string | null;
  onFocusedCharacterHandled?: () => void;
}

export function OfficeView({
  companyId,
  onAgentSelect,
  activeAgentCount = 16,
  focusedCharacterId,
  onFocusedCharacterHandled,
}: OfficeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<OfficeEngine | null>(null);
  const [engine, setEngine] = useState<OfficeEngine | null>(null);

  const [selectedChar, setSelectedChar] = useState<OfficeCharacter | null>(null);
  const [activeEvent, setActiveEvent] = useState<OfficeEventKind>('normal');
  const [soundOn, setSoundOn] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [quoteIdx, setQuoteIdx] = useState<number>(0);
  const [showLegend, setShowLegend] = useState(false);

  // Geetorus 2D Interactive States
  const [showTaskSplitModal, setShowTaskSplitModal] = useState(false);
  const [showMailboxDrawer, setShowMailboxDrawer] = useState(false);
  const [taskObjectiveInput, setTaskObjectiveInput] = useState(TASK_SPLIT_PRESETS[0].objective);
  const [activeTasks, setActiveTasks] = useState<TaskSplitSpec[]>([]);
  const [mailboxMessages, setMailboxMessages] = useState<HiveMessage[]>([]);
  const [mailFilterAct, setMailFilterAct] = useState<string>('all');
  const [customMailRecipient, setCustomMailRecipient] = useState<string>('dwight');
  const [customMailAct, setCustomMailAct] = useState<MessageAct>('request');
  const [customMailSubject, setCustomMailSubject] = useState<string>('');

  // Connect Real Geetorus Live Sync
  const liveSync = useOfficeLiveSync(engine, companyId ?? null, {
    mode: 'live',
    enabled: true,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle container size
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    updateSize();

    const engineInstance = new OfficeEngine(canvas);
    engineRef.current = engineInstance;
    engineInstance.soundEnabled = soundOn;

    engineInstance.onCharacterSelect = (char) => {
      setSelectedChar(char);
      setQuoteIdx(0);
      if (onAgentSelect) onAgentSelect(char);
    };

    engineInstance.onEventChange = (evt) => {
      setActiveEvent(evt);
    };

    engineInstance.onTaskSplitComplete = (tasks) => {
      setActiveTasks([...tasks]);
    };

    engineInstance.onMessageSent = (msg) => {
      setMailboxMessages((prev) => [msg, ...prev.slice(0, 49)]);
    };

    engineInstance.start();
    setEngine(engineInstance);

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      engineInstance.stop();
      resizeObserver.disconnect();
    };
  }, []);

  // Sync external focus requests (e.g. from Personnel Directory or Dundie awards shelf)
  useEffect(() => {
    if (!focusedCharacterId) return;
    const char =
      OFFICE_CHARACTERS.find((c) => c.id === focusedCharacterId) ||
      (engineRef.current?.characters.find((c) => c.def.id === focusedCharacterId)?.def as OfficeCharacter | undefined);
    if (char && engineRef.current) {
      setSelectedChar(char);
      setQuoteIdx(0);
      engineRef.current.panToCharacter(focusedCharacterId);
      if (onAgentSelect) onAgentSelect(char);
      if (onFocusedCharacterHandled) onFocusedCharacterHandled();
    }
  }, [focusedCharacterId, onFocusedCharacterHandled, onAgentSelect]);

  // Update sound state in engine and unlock on interaction
  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      if (engineRef.current) engineRef.current.soundEnabled = next;
      return next;
    });
  };

  const triggerEvent = (eventKind: OfficeEventKind) => {
    if (liveSync.mode === 'live') {
      liveSync.triggerSimulationEvent(eventKind);
    } else if (engineRef.current) {
      engineRef.current.triggerEvent(eventKind);
      setActiveEvent(eventKind);
    }
  };

  const jumpToRoom = (roomId: string) => {
    setSelectedRoom(roomId);
    if (!engineRef.current) return;
    if (roomId === 'all') {
      engineRef.current.resetCamera();
    } else {
      engineRef.current.panToRoom(roomId);
    }
  };

  const jumpToCharacter = (charId: string) => {
    const char =
      OFFICE_CHARACTERS.find((c) => c.id === charId) ||
      (engineRef.current?.characters.find((c) => c.def.id === charId)?.def as OfficeCharacter | undefined);
    if (char && engineRef.current) {
      setSelectedChar(char);
      setQuoteIdx(0);
      engineRef.current.panToCharacter(charId);
    }
  };

  const playNextQuote = () => {
    if (!selectedChar || !engineRef.current) return;
    const simChar = engineRef.current.characters.find((c) => c.def.id === selectedChar.id);
    const quotes = selectedChar.quotes && selectedChar.quotes.length > 0 ? selectedChar.quotes : ['Working on Geetorus tasks.'];
    const next = (quoteIdx + 1) % quotes.length;
    setQuoteIdx(next);
    const quote = quotes[next];
    if (simChar) {
      engineRef.current.sayQuote(simChar, quote);
      engineRef.current.playSound('click');
    }
  };

  const summonToMichael = () => {
    if (!selectedChar || !engineRef.current) return;
    const simChar = engineRef.current.characters.find((c) => c.def.id === selectedChar.id);
    if (simChar) {
      simChar.path = engineRef.current.findPath({ x: simChar.tileX, y: simChar.tileY }, { x: 8, y: 7 });
      simChar.state = 'walking';
      engineRef.current.sayQuote(simChar, 'Heading to the Manager Office.');
    }
  };

  const sendToBreakRoom = () => {
    if (!selectedChar || !engineRef.current) return;
    const simChar = engineRef.current.characters.find((c) => c.def.id === selectedChar.id);
    if (simChar) {
      simChar.path = engineRef.current.findPath({ x: simChar.tileX, y: simChar.tileY }, { x: 36, y: 5 });
      simChar.state = 'coffee';
      simChar.presence = 'break';
      engineRef.current.sayQuote(simChar, 'Grabbing a fresh pot of coffee.');
    }
  };

  const returnToDesk = () => {
    if (!selectedChar || !engineRef.current) return;
    const simChar = engineRef.current.characters.find((c) => c.def.id === selectedChar.id);
    if (simChar) {
      simChar.path = engineRef.current.findPath({ x: simChar.tileX, y: simChar.tileY }, selectedChar.deskCoord);
      simChar.state = 'walking';
    }
  };

  const handleSplitTasks = (objective?: string) => {
    const obj = objective || taskObjectiveInput;
    if (!obj.trim() || !engineRef.current) return;
    const tasks = engineRef.current.splitAndDelegateTask(obj);
    setActiveTasks(tasks);
    setShowTaskSplitModal(false);
  };

  const handleSmokeBreak = (charId?: string) => {
    if (!engineRef.current) return;
    engineRef.current.takeSmokeBreak(charId);
  };

  const handleWaterPlant = (charId?: string) => {
    if (!engineRef.current) return;
    engineRef.current.waterNearestPlant(charId);
  };

  const handleCoffeeRun = (charId?: string) => {
    if (!engineRef.current) return;
    engineRef.current.grabCoffee(charId || selectedChar?.id || 'jim');
  };

  const handleWindowGaze = (charId?: string) => {
    if (!engineRef.current) return;
    engineRef.current.gazeWindow(charId || selectedChar?.id || 'pam');
  };

  const handleSendCustomMail = () => {
    if (!engineRef.current || !customMailSubject.trim()) return;
    const senderId = selectedChar ? selectedChar.id : 'michael';
    engineRef.current.sendDirectMail(
      senderId,
      customMailRecipient,
      customMailSubject,
      customMailAct
    );
    setCustomMailSubject('');
  };

  // Find assigned real Geetorus agent if in Live Mode
  const assignedSimState = selectedChar
    ? Array.from(liveSync.agentStates.values()).find((s) => s.characterId === selectedChar.id)
    : null;
  const assignedAgent = assignedSimState
    ? liveSync.agents.find((a) => a.id === assignedSimState.agentId)
    : null;
  const assignedIssue = assignedAgent
    ? liveSync.issues.find((i) => i.assigneeAgentId === assignedAgent.id && i.status !== 'done' && i.status !== 'cancelled') ??
      liveSync.issues.find((i) => i.assigneeAgentId === assignedAgent.id)
    : null;

  return (
    <div className="relative w-full h-[760px] min-h-[600px] border-4 border-black bg-[#12141a] overflow-hidden shadow-[8px_8px_0px_0px_#000000] select-none">
      {/* Accessible Screen Reader Status Updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveSync.mode === 'live'
          ? `Virtual office in Live Mode for active company. ${liveSync.agents.length} agents tracked. Status: ${liveSync.connectionStatus}. Active event: ${liveSync.activeEvent}.`
          : 'Virtual office in Demo Simulation Mode with 16 employees.'}
      </div>

      {/* 1. TOP NEO-BRUTALIST COMMAND BAR */}
      <div className="absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center justify-between gap-3 p-3 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b-4 border-black">
        {/* Left: Office Title & Live / Demo Mode Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-400 text-black px-3 py-1.5 border-2 border-black font-black uppercase text-sm tracking-wider shadow-[2px_2px_0px_#000]">
            <Building2 className="w-4 h-4 stroke-[2.5]" />
            Geetorus 2D • Headquarters
          </div>

          {/* Mode Switcher Button */}
          <button
            onClick={() => liveSync.setMode(liveSync.mode === 'live' ? 'demo' : 'live')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 ${
              liveSync.mode === 'live'
                ? 'bg-emerald-400 text-black hover:bg-emerald-300'
                : 'bg-amber-400 text-black hover:bg-amber-300'
            }`}
            title={liveSync.mode === 'live' ? 'Switch to Demo Simulation Mode' : 'Switch to Live Control-Plane Mode'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                liveSync.mode === 'live' ? 'bg-black animate-pulse' : 'bg-black'
              }`}
            />
            <span>{liveSync.mode === 'live' ? 'LIVE MODE' : 'DEMO MODE'}</span>
          </button>

          {/* Real Metrics or Demo Metrics */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold font-mono">
            {liveSync.mode === 'live' ? (
              <>
                <span className="flex items-center gap-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-1 border border-black">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {liveSync.agents.length} Agents Live
                </span>
                <span
                  className={`px-2 py-1 border border-black uppercase ${
                    liveSync.connectionStatus === 'connected'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                      : liveSync.connectionStatus === 'reconnecting'
                      ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {liveSync.connectionStatus}
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-1 border border-black">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  16 Staff Online
                </span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 border border-black">
                  7 Departments
                </span>
              </>
            )}
          </div>
        </div>

        {/* Center: Branch Events Trigger Bar (marked [Sim] in live mode) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => triggerEvent('all_hands')}
            title="Summon employees to Conference Room (Visual Simulation)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase bg-blue-500 hover:bg-blue-400 text-white border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            <span>All-Hands</span>
            {liveSync.mode === 'live' && <span className="opacity-75 font-mono text-xs">[Sim]</span>}
          </button>

          <button
            onClick={() => triggerEvent('fire_drill')}
            title="Dwight initiates fire readiness drill (Visual Simulation)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase bg-red-500 hover:bg-red-400 text-white border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Fire Drill</span>
            {liveSync.mode === 'live' && <span className="opacity-75 font-mono text-xs">[Sim]</span>}
          </button>

          <button
            onClick={() => triggerEvent('birthday')}
            title="Party Planning Committee birthday event (Visual Simulation)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase bg-amber-400 hover:bg-amber-300 text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
          >
            <Cake className="w-3.5 h-3.5" />
            <span>Birthday</span>
            {liveSync.mode === 'live' && <span className="opacity-75 font-mono text-xs">[Sim]</span>}
          </button>

          <button
            onClick={() => triggerEvent('dundies')}
            title="Michael Scott hosts the annual Dundie Awards (Visual Simulation)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase bg-amber-400 hover:bg-yellow-300 text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>The Dundies</span>
            {liveSync.mode === 'live' && <span className="opacity-75 font-mono text-xs">[Sim]</span>}
          </button>

          <button
            onClick={() => triggerEvent('phone_call')}
            title="Trigger incoming call to Reception (Visual Simulation)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase bg-emerald-500 hover:bg-emerald-400 text-white border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Pam</span>
            {liveSync.mode === 'live' && <span className="opacity-75 font-mono text-xs">[Sim]</span>}
          </button>
        </div>

        {/* Right: Legend, Audio FX & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLegend((prev) => !prev)}
            title="Toggle Status Legend"
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-zinc-200 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Legend</span>
          </button>

          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            title={soundOn ? 'Sound On' : 'Sound Muted'}
            className="p-1.5 bg-white dark:bg-zinc-800 text-black dark:text-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-zinc-100 cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>
        </div>
      </div>

      {/* 1b. Geetorus 2D Mechanics & Errands Action Ribbon */}
      <div className="absolute top-15 left-4 z-10 flex items-center gap-1.5 flex-wrap bg-white/95 dark:bg-zinc-900/95 p-1.5 border-2 border-black shadow-[4px_4px_0px_#000] backdrop-blur-sm">
        {/* Task Splitting */}
        <button
          onClick={() => setShowTaskSplitModal(true)}
          title="Split Master Tasks at Conference Table & Dispatch Mails (Geetorus 2D)"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase bg-amber-400 hover:bg-yellow-300 text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
        >
          <Split className="w-3.5 h-3.5" />
          <span>Split Tasks</span>
          {activeTasks.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-black text-white text-[10px] font-mono font-bold">
              {activeTasks.length}
            </span>
          )}
        </button>

        {/* Hive Mailbox Drawer Toggle */}
        <button
          onClick={() => setShowMailboxDrawer((prev) => !prev)}
          title="Toggle Hive Mailbox Drawer (Mails & Speech Acts)"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase bg-sky-400 hover:bg-sky-300 text-black border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Hive Mail</span>
          {mailboxMessages.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-black text-white text-[10px] font-mono font-bold">
              {mailboxMessages.length}
            </span>
          )}
        </button>

        <div className="w-[1px] h-5 bg-black/40 mx-0.5" />

        {/* Errand Quick Triggers */}
        <button
          onClick={() => handleSmokeBreak()}
          title="Cigar/Cigarette smoke break at cracked window with smoke puffs"
          className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Smoke Break</span>
        </button>

        <button
          onClick={() => handleWaterPlant()}
          title="Feed water to office plant with watering can & droplets"
          className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>Feed Plants</span>
        </button>

        <button
          onClick={() => handleCoffeeRun()}
          title="Brew coffee and carry steaming mug across floor"
          className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-orange-500 hover:bg-orange-400 text-white border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Coffee Run</span>
        </button>

        <button
          onClick={() => handleWindowGaze()}
          title="Gaze out north wall window with animated wind streaks"
          className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase bg-sky-600 hover:bg-sky-500 text-white border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Window Gaze</span>
        </button>
      </div>

      {/* TASK SPLITTING MODAL (Geetorus 2D CEO Flow) */}
      {showTaskSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-4 border-black shadow-[10px_10px_0px_0px_#000] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-3 border-black pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-400 border-2 border-black shadow-[2px_2px_0px_#000]">
                  <Split className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wide font-heading">
                    Task Decomposition & Delegation Studio
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Split master goals into specialist subtasks & dispatch flying mail envelopes across desks
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTaskSplitModal(false)}
                className="p-1 border-2 border-black hover:bg-red-400 hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#000]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Quick Goal Presets (Scranton Specials)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TASK_SPLIT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTaskObjectiveInput(preset.objective)}
                    className="px-2.5 py-1 text-xs font-bold border-2 border-black bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-300 dark:hover:bg-amber-400 dark:hover:text-black shadow-[2px_2px_0px_#000] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 text-left"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Objective Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider block">
                Master Objective Brief
              </label>
              <textarea
                value={taskObjectiveInput}
                onChange={(e) => setTaskObjectiveInput(e.target.value)}
                rows={3}
                placeholder="Enter objective (e.g. Deploy new catalog, Fix production database deadlock, Prepare Dundies)..."
                className="w-full p-2.5 text-xs font-mono font-medium border-2 border-black bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]"
              />
            </div>

            {/* Live Subtasks Preview */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider block text-muted-foreground">
                Role Decomposition Preview
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border-2 border-black shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-between font-bold text-blue-800 dark:text-blue-300">
                    <span>1. Core Logic / Architecture</span>
                    <span className="text-[10px] uppercase font-mono px-1 bg-blue-200 dark:bg-blue-900">Backend</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Assigned to Dwight Schrute · Dispatched via Sky Blue Request Envelope
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-black shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                    <span>2. UI / Client Experience</span>
                    <span className="text-[10px] uppercase font-mono px-1 bg-emerald-200 dark:bg-emerald-900">Frontend</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Assigned to Pam Beesly · Dispatched via Mint Request Envelope
                  </p>
                </div>
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 border-2 border-black shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-between font-bold text-purple-800 dark:text-purple-300">
                    <span>3. Validation & Quality Assurance</span>
                    <span className="text-[10px] uppercase font-mono px-1 bg-purple-200 dark:bg-purple-900">QA</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Assigned to Angela Martin · Dispatched via Lilac Request Envelope
                  </p>
                </div>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border-2 border-black shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-between font-bold text-amber-800 dark:text-amber-300">
                    <span>4. Staging & Documentation</span>
                    <span className="text-[10px] uppercase font-mono px-1 bg-amber-200 dark:bg-amber-900">Product</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Assigned to Jim Halpert · Dispatched via Lemon Request Envelope
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black">
              <button
                onClick={() => setShowTaskSplitModal(false)}
                className="px-4 py-2 text-xs font-bold uppercase border-2 border-black bg-zinc-100 hover:bg-zinc-200 cursor-pointer shadow-[2px_2px_0px_#000]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSplitTasks()}
                className="flex items-center gap-2 px-5 py-2 text-xs font-black uppercase bg-amber-400 hover:bg-yellow-300 text-black border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Decompose & Split Across Desks</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIVE MAILBOX DRAWER */}
      {showMailboxDrawer && (
        <div className="absolute top-15 right-4 z-20 w-80 sm:w-96 bg-white dark:bg-zinc-900 border-4 border-black shadow-[8px_8px_0px_0px_#000] p-4 space-y-3 max-h-[85vh] flex flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-black uppercase tracking-wider font-heading">
                Scranton Hive Mailbox ({mailboxMessages.length})
              </span>
            </div>
            <button
              onClick={() => setShowMailboxDrawer(false)}
              className="p-1 border border-black hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speech-act Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
            {['all', 'request', 'propose', 'agree', 'done', 'refuse'].map((act) => (
              <button
                key={act}
                onClick={() => setMailFilterAct(act)}
                className={`px-2 py-0.5 border border-black uppercase text-[10px] cursor-pointer transition-colors ${
                  mailFilterAct === act ? 'bg-black text-white' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200'
                }`}
              >
                {act}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[260px]">
            {mailboxMessages.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground font-mono">
                No active envelopes sent yet. Split a task or send a mail!
              </div>
            ) : (
              mailboxMessages
                .filter((m) => mailFilterAct === 'all' || m.act === mailFilterAct)
                .map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2 bg-zinc-50 dark:bg-zinc-800 border border-black shadow-[2px_2px_0px_#000] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="px-1.5 py-0.2 text-[10px] font-bold uppercase border border-black"
                        style={{ backgroundColor: ACT_COLORS[msg.act] || '#fef08a' }}
                      >
                        {msg.act}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {msg.fromName} → {msg.toName}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">
                      {msg.subject}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Quick Mail Composer */}
          <div className="pt-2 border-t-2 border-black space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider block text-muted-foreground">
              Send Envelope Desk-to-Desk
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <select
                value={customMailRecipient}
                onChange={(e) => setCustomMailRecipient(e.target.value)}
                className="p-1 border border-black bg-zinc-50 dark:bg-zinc-800 text-xs font-medium"
              >
                {OFFICE_CHARACTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    To: {c.displayName.split(' ')[0]}
                  </option>
                ))}
              </select>
              <select
                value={customMailAct}
                onChange={(e) => setCustomMailAct(e.target.value as MessageAct)}
                className="p-1 border border-black bg-zinc-50 dark:bg-zinc-800 text-xs font-medium uppercase font-mono"
              >
                <option value="request">request</option>
                <option value="propose">propose</option>
                <option value="agree">agree</option>
                <option value="done">done</option>
                <option value="query">query</option>
                <option value="refuse">refuse</option>
              </select>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customMailSubject}
                onChange={(e) => setCustomMailSubject(e.target.value)}
                placeholder="Subject brief..."
                className="flex-1 p-1.5 border border-black bg-zinc-50 dark:bg-zinc-800 text-xs font-mono"
              />
              <button
                onClick={handleSendCustomMail}
                className="px-3 py-1.5 text-xs font-black uppercase bg-sky-400 hover:bg-sky-300 text-black border border-black shadow-[1px_1px_0px_#000] cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS LEGEND POPUP */}
      {showLegend && (
        <div className="absolute top-18 right-16 z-20 w-64 bg-white dark:bg-zinc-900 border-3 border-black p-3 shadow-[6px_6px_0px_0px_#000] space-y-2">
          <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
            <span className="text-xs font-black uppercase tracking-wider font-heading">Presence Status Legend</span>
            <button
              onClick={() => setShowLegend(false)}
              className="p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-black cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-xs space-y-1.5 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-black shrink-0" />
              <span>
                <strong>Working</strong>: Active run at assigned desk
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-black shrink-0" />
              <span>
                <strong>Focus / Tool</strong>: MCP tool or phone call in progress
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-black shrink-0" />
              <span>
                <strong>Meeting</strong>: Conference room / awaiting approval
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-black shrink-0" />
              <span>
                <strong>Break / Paused</strong>: In break room / idle drift
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-black shrink-0" />
              <span>
                <strong>Panic / Alert</strong>: Run failed or budget hard stop
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 border border-black shrink-0" />
              <span>
                <strong>Offline / Ghost</strong>: Terminated or sleeping
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. THE MAIN CANVAS */}
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing block" />

      {/* 3. FLOATING CAMERA CONTROLS (Top Right) */}
      <div className="absolute top-18 right-4 z-10 flex flex-col gap-1.5 bg-white dark:bg-black p-1.5 border-2 border-black shadow-[4px_4px_0px_#000]">
        <button
          onClick={() => {
            if (engineRef.current) engineRef.current.zoom = Math.min(2.4, engineRef.current.zoom * 1.15);
          }}
          title="Zoom In"
          className="p-1.5 hover:bg-amber-400 hover:text-black border border-black cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (engineRef.current) engineRef.current.zoom = Math.max(0.65, engineRef.current.zoom * 0.85);
          }}
          title="Zoom Out"
          className="p-1.5 hover:bg-amber-400 hover:text-black border border-black cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (engineRef.current) engineRef.current.resetCamera();
          }}
          title="Reset Camera"
          className="p-1.5 hover:bg-amber-400 hover:text-black border border-black cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 4. BOTTOM ROOM QUICK-JUMP DOCK */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-center gap-1 sm:gap-2 flex-wrap pointer-events-auto">
        <div className="flex items-center gap-1 sm:gap-2 bg-white/95 dark:bg-black/95 p-1.5 border-3 border-black shadow-[4px_4px_0px_#000] overflow-x-auto max-w-full">
          <button
            onClick={() => jumpToRoom('all')}
            className={`px-2.5 py-1 text-xs font-black uppercase border border-black transition-all cursor-pointer ${
              selectedRoom === 'all' ? 'bg-amber-400 text-black shadow-[1px_1px_0px_#000]' : 'bg-zinc-100 dark:bg-zinc-800'
            }`}
          >
            Branch View
          </button>
          {ROOM_ZONES.map((room) => (
            <button
              key={room.id}
              onClick={() => jumpToRoom(room.id)}
              className={`px-2.5 py-1 text-xs font-black uppercase border border-black whitespace-nowrap transition-all cursor-pointer ${
                selectedRoom === room.id ? 'bg-amber-400 text-black shadow-[1px_1px_0px_#000]' : 'bg-zinc-100 dark:bg-zinc-800'
              }`}
            >
              {room.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* 5. EMPLOYEE PROFILE INSPECTOR DRAWER */}
      {selectedChar && (
        <div className="absolute top-18 left-4 z-20 w-80 max-w-[calc(100vw-32px)] bg-white dark:bg-zinc-900 border-4 border-black shadow-[8px_8px_0px_0px_#000] animate-in fade-in slide-in-from-left-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b-2 border-black bg-amber-400 text-black">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="font-black uppercase tracking-wider text-xs font-heading">
                {liveSync.mode === 'live' && assignedAgent ? 'Geetorus Agent Inspector' : 'Scranton Personnel'}
              </span>
            </div>
            <button
              onClick={() => setSelectedChar(null)}
              className="p-1 hover:bg-black hover:text-white border border-black cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[540px] overflow-y-auto">
            {/* Real Agent Profile in Live Mode */}
            {liveSync.mode === 'live' && assignedAgent ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-18 bg-slate-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] shrink-0">
                    <canvas
                      ref={(canvas) => {
                        if (canvas) {
                          canvas.width = 18;
                          canvas.height = 28;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.imageSmoothingEnabled = false;
                            const sprites = getCharacterSprites(selectedChar);
                            ctx.drawImage(sprites.portrait, 0, 0);
                          }
                        }
                      }}
                      className="w-12 h-16 image-pixelated"
                    />
                  </div>

                  <div>
                    <h3 className="font-black text-base uppercase leading-tight font-heading">
                      {assignedAgent.name}
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {assignedAgent.title || assignedAgent.role.toUpperCase()} • Avatar: {selectedChar.displayName}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full border border-black ${
                          assignedSimState?.presence === 'working'
                            ? 'bg-green-500 animate-pulse'
                            : assignedSimState?.presence === 'focus'
                            ? 'bg-blue-500'
                            : assignedSimState?.presence === 'meeting'
                            ? 'bg-purple-500'
                            : assignedSimState?.presence === 'break'
                            ? 'bg-amber-500'
                            : assignedSimState?.presence === 'offline'
                            ? 'bg-slate-500'
                            : 'bg-red-500 animate-bounce'
                        }`}
                      />
                      <span className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-slate-300">
                        {assignedSimState?.badge || assignedSimState?.presence || assignedAgent.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role and Desk Coordinate */}
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="px-2 py-0.5 bg-black text-white border border-black uppercase">
                    Role: {assignedAgent.role}
                  </span>
                  <span className="text-muted-foreground">
                    Desk [{selectedChar.deskCoord.x}, {selectedChar.deskCoord.y}]
                  </span>
                </div>

                {/* Current Active Task / Issue Title (Truncated, Privacy Safe) */}
                <div className="p-2 border-2 border-black bg-slate-50 dark:bg-zinc-800 space-y-1">
                  <div className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span>Active In-Flight Task</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 break-words">
                    {assignedIssue?.title ? assignedIssue.title.slice(0, 72) : 'Idle / No active task assigned'}
                  </div>
                </div>

                {/* Monthly Budget Tracker */}
                <div className="p-2 border-2 border-black bg-amber-50 dark:bg-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span>Monthly Budget</span>
                    <span className="font-mono">
                      ${(assignedAgent.spentMonthlyCents / 100).toFixed(0)} / ${(assignedAgent.budgetMonthlyCents / 100).toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 border border-black overflow-hidden">
                    <div
                      className={`h-full ${
                        assignedAgent.spentMonthlyCents >= assignedAgent.budgetMonthlyCents
                          ? 'bg-red-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          assignedAgent.budgetMonthlyCents > 0
                            ? (assignedAgent.spentMonthlyCents / assignedAgent.budgetMonthlyCents) * 100
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Last Pulse Time */}
                <div className="text-xs font-mono text-muted-foreground flex items-center justify-between">
                  <span>Last Pulse:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {assignedAgent.lastHeartbeatAt
                      ? new Date(assignedAgent.lastHeartbeatAt).toLocaleTimeString()
                      : 'None recorded'}
                  </span>
                </div>
              </>
            ) : (
              /* Classic Scranton Persona in Demo Mode */
              <>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-18 bg-slate-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] shrink-0">
                    <canvas
                      ref={(canvas) => {
                        if (canvas) {
                          canvas.width = 18;
                          canvas.height = 28;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.imageSmoothingEnabled = false;
                            const sprites = getCharacterSprites(selectedChar);
                            ctx.drawImage(sprites.portrait, 0, 0);
                          }
                        }
                      }}
                      className="w-12 h-16 image-pixelated"
                    />
                  </div>

                  <div>
                    <h3 className="font-black text-base uppercase leading-tight font-heading">
                      {selectedChar.displayName}
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground">{selectedChar.title}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-mono uppercase font-bold text-green-600">
                        Online & At Desk
                      </span>
                    </div>
                  </div>
                </div>

                {/* Department Badge */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 bg-black text-white border border-black">
                    {selectedChar.department}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    Desk [{selectedChar.deskCoord.x}, {selectedChar.deskCoord.y}]
                  </span>
                </div>

                {/* Bio Blurb */}
                <p className="text-xs italic bg-amber-50 dark:bg-zinc-800/80 p-2 border-2 border-black text-zinc-800 dark:text-zinc-200">
                  "{selectedChar.blurb}"
                </p>

                {/* Dundie Award Trophy Showcase */}
                {selectedChar.dundieAward && (
                  <div className="bg-amber-400 text-black border-2 border-black p-2 shadow-[3px_3px_0px_#000]">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider">
                      <Trophy className="w-3.5 h-3.5 fill-black" />
                      <span>Dundie Award Winner</span>
                    </div>
                    <div className="text-xs font-black mt-0.5 leading-snug">{selectedChar.dundieAward}</div>
                  </div>
                )}

                {/* Desk Inventory & Artifacts */}
                {selectedChar.deskItems && selectedChar.deskItems.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider block text-muted-foreground">
                      Desk Artifacts & Props
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedChar.deskItems.map((item, idx) => (
                        <span
                          key={idx}
                          className="text-xs font-bold px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border border-black shadow-[1px_1px_0px_#000]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Iconic Quote Player */}
                {selectedChar.quotes && selectedChar.quotes.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <Quote className="w-3 h-3" /> Quotable Line ({quoteIdx + 1}/{selectedChar.quotes.length})
                      </span>
                      <button
                        onClick={playNextQuote}
                        className="text-xs font-black uppercase text-blue-600 hover:text-blue-700 underline cursor-pointer"
                      >
                        Next Quote ↻
                      </button>
                    </div>
                    <div
                      onClick={playNextQuote}
                      title="Click to trigger speech bubble on character"
                      className="text-xs font-bold p-2 bg-zinc-100 dark:bg-zinc-800 border-2 border-black cursor-pointer hover:bg-amber-100 active:translate-x-0.5 active:translate-y-0.5 transition-all select-none"
                    >
                      "{selectedChar.quotes[quoteIdx % selectedChar.quotes.length]}"
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Quick Actions (Visual Simulation in both modes) */}
            <div className="space-y-1.5 pt-2 border-t-2 border-black">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Office Actions</span>
                {liveSync.mode === 'live' && <span className="font-mono text-amber-600">[Sim]</span>}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleSmokeBreak(selectedChar.id)}
                  className="px-2 py-1.5 text-xs font-bold uppercase bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-black text-center cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Smoke Break</span>
                </button>
                <button
                  onClick={() => handleWaterPlant(selectedChar.id)}
                  className="px-2 py-1.5 text-xs font-bold uppercase bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-black text-center cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1"
                >
                  <Droplets className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Water Plant</span>
                </button>
                <button
                  onClick={() => handleCoffeeRun(selectedChar.id)}
                  className="px-2 py-1.5 text-xs font-bold uppercase bg-orange-50 hover:bg-orange-100 text-orange-900 border border-black text-center cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1"
                >
                  <Coffee className="w-3.5 h-3.5 text-orange-600" />
                  <span>Coffee Mug</span>
                </button>
                <button
                  onClick={() => handleWindowGaze(selectedChar.id)}
                  className="px-2 py-1.5 text-xs font-bold uppercase bg-sky-50 hover:bg-sky-100 text-sky-900 border border-black text-center cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  <span>Window Gaze</span>
                </button>
                <button
                  onClick={() => {
                    setCustomMailRecipient(selectedChar.id);
                    setShowMailboxDrawer(true);
                  }}
                  className="px-2 py-1.5 text-xs font-bold uppercase bg-blue-50 hover:bg-blue-100 text-blue-900 border border-black text-center cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1 col-span-2"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Send Mail Envelope</span>
                </button>
                <button
                  onClick={summonToMichael}
                  className="px-2 py-1.5 text-xs font-bold uppercase bg-zinc-100 hover:bg-zinc-200 text-black dark:text-white dark:bg-zinc-800 border border-black text-center cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                >
                  Summon Michael
                </button>
                <button
                  onClick={returnToDesk}
                  className="px-2 py-1.5 text-xs font-bold uppercase bg-green-50 hover:bg-green-100 text-green-900 border border-black text-center cursor-pointer shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
                >
                  Back to Desk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
