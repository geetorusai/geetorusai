// Dunder Mifflin Office Page
// Scranton Branch 2D virtual office simulation with Geetorus agent runtime integration
// Neo-Brutalist Drago design architecture, interactive desk pathfinding, sound synthesizer & Dundie awards

import { useState, useRef } from 'react';
import {
  Building2,
  Users,
  Coffee,
  Trophy,
  Briefcase,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Megaphone,
  Volume2,
  MapPin,
  Quote,
  Flame,
  PhoneCall,
  FileSpreadsheet,
  Award,
  Zap,
  Radio,
  Paperclip,
} from 'lucide-react';
import { OfficeView } from '@/components/office/OfficeView';
import {
  OFFICE_CHARACTERS,
  type OfficeCharacter,
  type OfficeDepartment,
} from '@/components/office/officeConstants';
import { getCharacterSprites } from '@/components/office/officeArt';
import { playRetroOfficeSound } from '@/components/office/OfficeEngine';
import { useCompany } from '@/context/CompanyContext';

export function DunderMifflinOfficePage() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const [selectedAgent, setSelectedAgent] = useState<OfficeCharacter | null>(null);
  const [focusedCharacterId, setFocusedCharacterId] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [activeSoundToast, setActiveSoundToast] = useState<string | null>(null);

  const simulationSectionRef = useRef<HTMLDivElement | null>(null);

  const departments: { id: string; label: string }[] = [
    { id: 'all', label: 'All Departments' },
    { id: 'management', label: 'Management' },
    { id: 'sales', label: 'Sales' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'reception', label: 'Reception' },
    { id: 'quality_hr', label: 'Annex & HR' },
  ];

  const filteredCharacters =
    deptFilter === 'all'
      ? OFFICE_CHARACTERS
      : OFFICE_CHARACTERS.filter((c) => c.department === deptFilter);

  const handleLocateCharacter = (charId: string) => {
    setFocusedCharacterId(charId);
    playRetroOfficeSound('click');
    if (simulationSectionRef.current) {
      simulationSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDundieClick = (charId: string) => {
    playRetroOfficeSound('fanfare');
    setFocusedCharacterId(charId);
    triggerSoundToast('🎺 Dundie Victory Fanfare Playing!');
    if (simulationSectionRef.current) {
      simulationSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const triggerSoundToast = (msg: string) => {
    setActiveSoundToast(msg);
    setTimeout(() => setActiveSoundToast(null), 2500);
  };

  const playSoundEffect = (
    kind: 'phone' | 'siren' | 'coffee' | 'fanfare' | 'click' | 'stapler',
    label: string
  ) => {
    playRetroOfficeSound(kind);
    triggerSoundToast(label);
  };

  const canonicalIncidents = [
    {
      id: 'inc-1',
      time: '09:14 AM',
      author: 'Dwight Schrute',
      dept: 'Safety & Arm',
      title: 'Smoke Test / Fire Readiness Drill Initiated',
      desc: 'Trashcan smoke generated in hallway. All main exits tested. Angela was caught attempting to throw Bandit into ceiling tiles.',
      severity: 'high',
      charId: 'dwight',
    },
    {
      id: 'inc-2',
      time: '10:45 AM',
      author: 'Michael Scott',
      dept: 'Management',
      title: 'Verbal Declaration of Chapter 11 Bankruptcy',
      desc: 'Regional manager stood in the middle of the bullpen and shouted "I declare bankruptcy!" Oscar explained this is legally meaningless.',
      severity: 'medium',
      charId: 'michael',
    },
    {
      id: 'inc-3',
      time: '11:30 AM',
      author: 'Jim Halpert',
      dept: 'Sales',
      title: 'Office Stationary Suspension in Lime Gelatin',
      desc: 'Dwight Schrute desk stapler successfully encased in solid Jell-O mold for the fourth time this fiscal quarter.',
      severity: 'low',
      charId: 'jim',
    },
    {
      id: 'inc-4',
      time: '01:05 PM',
      author: 'Kevin Malone',
      dept: 'Accounting',
      title: 'Famous Family Recipe Chili Transport Catastrophe',
      desc: 'Carpet contamination on reception entrance. Immediate clipboard scooping maneuvers were enacted.',
      severity: 'high',
      charId: 'kevin',
    },
    {
      id: 'inc-5',
      time: '02:20 PM',
      author: 'Ryan Howard',
      dept: 'WUPHF Labs',
      title: 'Simultaneous WUPHF Broadcast across 45 Peripherals',
      desc: 'Incoming fax, pager beep, corporate email, and switchboard line triggered simultaneously across entire Scranton bullpen.',
      severity: 'medium',
      charId: 'ryan',
    },
    {
      id: 'inc-6',
      time: '04:59 PM',
      author: 'Stanley Hudson',
      dept: 'Sales',
      title: 'Pretzel Day Countdown & Prompt Five O’Clock Exit',
      desc: 'Briefcase locked. Crossword puzzle complete. Employee has fully disengaged and is departing Scranton branch.',
      severity: 'low',
      charId: 'stanley',
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 max-w-[1600px] mx-auto">
      {/* Sound Toast Notification */}
      {activeSoundToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#ffca54] text-black px-4 py-2.5 border-4 border-black font-black uppercase text-xs tracking-wider shadow-[6px_6px_0px_#000] animate-in fade-in slide-in-from-bottom-2">
          {activeSoundToast}
        </div>
      )}

      {/* 1. PAGE HEADER (Neo-Brutalist Drago Tools Style) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-4 border-black bg-white dark:bg-zinc-900 p-5 shadow-[6px_6px_0px_0px_#000000]">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#ffca54] text-black px-3 py-1 border-2 border-black font-black uppercase text-xs tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5 stroke-[2.5]" />
            Scranton, PA Branch #172
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-heading">
            Dunder Mifflin Virtual Office
          </h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1">
            2D animated branch simulation powered by Geetorus agent runtime & Drago Neo-Brutalist architecture.
          </p>
        </div>

        {/* Branch Quick Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 border-2 border-black px-3 py-2 shadow-[2px_2px_0px_#000]">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-[10px] font-mono uppercase font-bold text-muted-foreground">Staff Roster</div>
              <div className="text-sm font-black font-mono">16 Employees</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 border-2 border-black px-3 py-2 shadow-[2px_2px_0px_#000]">
            <Coffee className="w-4 h-4 text-amber-600" />
            <div>
              <div className="text-[10px] font-mono uppercase font-bold text-muted-foreground">Coffee Economy</div>
              <div className="text-sm font-black font-mono">Fresh Pot (100%)</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#ffca54] text-black border-2 border-black px-3 py-2 shadow-[2px_2px_0px_#000]">
            <Trophy className="w-4 h-4 text-black fill-black" />
            <div>
              <div className="text-[10px] font-mono uppercase font-black text-black/70">The Dundies</div>
              <div className="text-sm font-black font-mono">8th Edition</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE 2D INTERACTIVE OFFICE SIMULATION */}
      <div ref={simulationSectionRef} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-heading">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
            Interactive Floorplan & Desks
          </h2>
          <span className="text-xs font-mono font-bold text-muted-foreground hidden sm:inline">
            Click any employee or desk to inspect & interact • Drag to pan • Scroll to zoom
          </span>
        </div>

        <OfficeView
          companyId={selectedCompanyId}
          focusedCharacterId={focusedCharacterId}
          onFocusedCharacterHandled={() => setFocusedCharacterId(null)}
          onAgentSelect={(char) => setSelectedAgent(char)}
        />
      </div>

      {/* 3. SCRANTON RETRO AUDIO SOUNDBOARD */}
      <div className="border-4 border-black bg-white dark:bg-zinc-900 p-4 shadow-[6px_6px_0px_0px_#000000] space-y-3">
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-500 stroke-[2.5]" />
            <h3 className="font-black uppercase tracking-wider text-xs font-heading">
              Scranton Branch Soundboard (Web Audio API Synthesizer)
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-muted-foreground">
            Instant 8-bit procedural sound synthesis
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <button
            onClick={() => playSoundEffect('fanfare', '🎺 Dundie Fanfare')}
            className="flex flex-col items-center justify-center p-3 bg-[#ffca54] hover:bg-yellow-300 text-black border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer font-black uppercase text-xs gap-1.5 transition-all"
          >
            <Trophy className="w-4 h-4 fill-black" />
            <span>Dundie Fanfare</span>
          </button>

          <button
            onClick={() => playSoundEffect('phone', '☎️ Switchboard Ringing')}
            className="flex flex-col items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer font-black uppercase text-xs gap-1.5 transition-all"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Switchboard</span>
          </button>

          <button
            onClick={() => playSoundEffect('coffee', '☕ Fresh Pot Brewed')}
            className="flex flex-col items-center justify-center p-3 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer font-black uppercase text-xs gap-1.5 transition-all"
          >
            <Coffee className="w-4 h-4" />
            <span>Coffee Brew</span>
          </button>

          <button
            onClick={() => playSoundEffect('siren', '🚨 Fire Drill Alarm')}
            className="flex flex-col items-center justify-center p-3 bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer font-black uppercase text-xs gap-1.5 transition-all"
          >
            <Flame className="w-4 h-4 text-red-600" />
            <span>Fire Drill</span>
          </button>

          <button
            onClick={() => playSoundEffect('stapler', '📎 Stapler in Jell-O')}
            className="flex flex-col items-center justify-center p-3 bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer font-black uppercase text-xs gap-1.5 transition-all"
          >
            <Paperclip className="w-4 h-4 text-blue-600" />
            <span>Stapler Click</span>
          </button>

          <button
            onClick={() => playSoundEffect('click', '⌨️ Terminal Keypress')}
            className="flex flex-col items-center justify-center p-3 bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer font-black uppercase text-xs gap-1.5 transition-all"
          >
            <Radio className="w-4 h-4" />
            <span>Terminal Key</span>
          </button>
        </div>
      </div>

      {/* 4. THE DUNDIE AWARDS SHOWCASE (Shelf of Honors) */}
      <div className="border-4 border-black bg-white dark:bg-zinc-900 p-5 shadow-[6px_6px_0px_0px_#000000] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-[#ffca54] p-1.5 border-2 border-black shadow-[2px_2px_0px_#000]">
              <Trophy className="w-5 h-5 fill-black text-black" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight font-heading">
                The 8th Annual Dundie Awards Showcase
              </h3>
              <p className="text-xs font-medium text-muted-foreground">
                Hosted at Chili's by Michael Scott. Click any trophy to celebrate & focus the recipient's desk.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-[#ffca54] text-black px-3 py-1 border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_#000]">
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            16 Official Trophies
          </div>
        </div>

        {/* Dundie Trophy Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {OFFICE_CHARACTERS.map((char) => {
            const sprites = getCharacterSprites(char);
            return (
              <div
                key={`dundie-${char.id}`}
                onClick={() => handleDundieClick(char.id)}
                className="border-3 border-black p-3 bg-gradient-to-br from-[#ffca54]/30 via-white to-[#ffca54]/10 dark:from-[#ffca54]/20 dark:via-zinc-800 dark:to-zinc-900 shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-[#ffca54] text-black border border-black font-black text-[9px] uppercase shadow-[1px_1px_0px_#000]">
                      <Trophy className="w-3 h-3 fill-black text-black" />
                      Dundie Winner
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                      Desk [{char.deskCoord.x},{char.deskCoord.y}]
                    </span>
                  </div>

                  <h4 className="font-black text-sm uppercase leading-tight text-black dark:text-white group-hover:text-amber-600 transition-colors">
                    {char.dundieAward || "Dundie Recipient"}
                  </h4>
                </div>

                <div className="flex items-center gap-2.5 pt-2 border-t-2 border-black/20">
                  <div className="w-9 h-12 bg-[#cbd5e1] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000]">
                    <canvas
                      ref={(canvas) => {
                        if (canvas) {
                          canvas.width = 18;
                          canvas.height = 28;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.imageSmoothingEnabled = false;
                            ctx.drawImage(sprites.portrait, 0, 0);
                          }
                        }
                      }}
                      className="w-8 h-10 image-pixelated"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-black text-xs uppercase truncate">{char.displayName}</div>
                    <div className="text-[10px] font-bold text-muted-foreground truncate">{char.title}</div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400 underline">
                      Locate →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SCRANTON INCIDENT FEED & WATERCOOLER WIRE */}
      <div className="border-4 border-black bg-white dark:bg-zinc-900 p-5 shadow-[6px_6px_0px_0px_#000000] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight font-heading">
                Scranton Incident Wire & Branch Antics
              </h3>
              <p className="text-xs font-medium text-muted-foreground">
                Live chronological branch activity, HR conflicts, and safety compliance reports.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-green-600 bg-green-50 dark:bg-green-950 px-2 py-1 border border-black">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            LIVE TELETYPE
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {canonicalIncidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => handleLocateCharacter(inc.charId)}
              className="border-2 border-black p-3 bg-zinc-50 dark:bg-zinc-800/80 shadow-[3px_3px_0px_#000] hover:shadow-[5px_5px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-mono font-bold bg-black text-white px-1.5 py-0.5">
                    {inc.time}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 border border-black ${
                      inc.severity === 'high'
                        ? 'bg-red-500 text-white'
                        : inc.severity === 'medium'
                        ? 'bg-amber-400 text-black'
                        : 'bg-green-400 text-black'
                    }`}
                  >
                    {inc.severity} priority
                  </span>
                </div>
                <h4 className="font-black text-xs uppercase leading-tight mt-1">{inc.title}</h4>
                <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mt-1 leading-snug">
                  {inc.desc}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-black/20 text-[10px] font-mono font-bold">
                <span className="text-muted-foreground">{inc.author}</span>
                <span className="text-blue-600 dark:text-blue-400 hover:underline">
                  Jump to Desk →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. ROSTER DIRECTORY & DEPARTMENT PODS */}
      <div className="border-4 border-black bg-white dark:bg-zinc-900 p-5 shadow-[6px_6px_0px_0px_#000000] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight font-heading">
              Scranton Branch Personnel Directory
            </h3>
            <p className="text-xs font-medium text-muted-foreground">
              Dedicated employee desks, designations, Dundie awards, and interactive desk locator.
            </p>
          </div>

          {/* Department Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => setDeptFilter(d.id)}
                className={`px-3 py-1 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer ${
                  deptFilter === d.id
                    ? 'bg-[#ffca54] text-black shadow-[2px_2px_0px_#000]'
                    : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Character Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredCharacters.map((char) => {
            const sprites = getCharacterSprites(char);
            return (
              <div
                key={char.id}
                className="border-2 border-black p-3 bg-zinc-50 dark:bg-zinc-800/60 shadow-[3px_3px_0px_0px_#000000] hover:shadow-[5px_5px_0px_0px_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-2.5 group"
              >
                <div className="flex items-start gap-3">
                  {/* Pixel Portrait */}
                  <div
                    onClick={() => handleLocateCharacter(char.id)}
                    title="Click to locate on floorplan"
                    className="w-12 h-16 bg-[#cbd5e1] border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] cursor-pointer hover:scale-105 transition-transform"
                  >
                    <canvas
                      ref={(canvas) => {
                        if (canvas) {
                          canvas.width = 18;
                          canvas.height = 28;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.imageSmoothingEnabled = false;
                            ctx.drawImage(sprites.portrait, 0, 0);
                          }
                        }
                      }}
                      className="w-10 h-14 image-pixelated"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        onClick={() => handleLocateCharacter(char.id)}
                        className="font-black text-xs uppercase truncate leading-snug cursor-pointer hover:text-amber-600 transition-colors"
                      >
                        {char.displayName}
                      </h4>
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Online & Seated" />
                    </div>
                    <p className="text-[11px] font-semibold text-muted-foreground truncate">{char.title}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="inline-block text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-black text-white border border-black">
                        {char.department}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        [{char.deskCoord.x},{char.deskCoord.y}]
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dundie Award Tag */}
                {char.dundieAward && (
                  <div
                    onClick={() => handleDundieClick(char.id)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#ffca54] text-black border border-black font-black text-[10px] uppercase shadow-[1px_1px_0px_#000] cursor-pointer hover:bg-yellow-300 transition-colors"
                  >
                    <Trophy className="w-3 h-3 fill-black shrink-0" />
                    <span className="truncate">{char.dundieAward}</span>
                  </div>
                )}

                {/* Desk Items Pills */}
                {char.deskItems && char.deskItems.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {char.deskItems.slice(0, 2).map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-black truncate max-w-full"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* Iconic Quote */}
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 italic line-clamp-1 border-t border-black/10 pt-1.5">
                  "{char.quotes[0]}"
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => handleLocateCharacter(char.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-black text-white hover:bg-zinc-800 text-[10px] font-black uppercase border border-black shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    Locate Desk
                  </button>
                  <button
                    onClick={() => {
                      playRetroOfficeSound('click');
                      handleLocateCharacter(char.id);
                    }}
                    title="Inspect & Speak"
                    className="px-2 py-1 bg-[#ffca54] hover:bg-yellow-300 text-black text-[10px] font-black uppercase border border-black shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                  >
                    <Quote className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. BRANCH BULLETIN & MICHAEL'S MEMOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Michael's Memo */}
        <div className="border-4 border-black bg-amber-50 dark:bg-zinc-900 p-4 shadow-[4px_4px_0px_#000] space-y-2">
          <div className="flex items-center gap-2 border-b-2 border-black pb-2 text-amber-900 dark:text-amber-400 font-black uppercase text-xs">
            <Megaphone className="w-4 h-4" />
            Regional Manager Branch Memo
          </div>
          <p className="text-xs font-bold leading-relaxed">
            "To all Scranton employees: Effective immediately, all meetings in the conference room are mandatory, except
            for Toby. Also, whoever put my Dundie in a bowl of grape Jell-O will be reprimanded according to corporate guidelines.
            Paper sales are up 14%! Keep pushing 24lb bond reams."
          </p>
          <div className="text-[10px] font-mono font-bold text-muted-foreground">
            — Michael G. Scott, Regional Manager
          </div>
        </div>

        {/* Dwight's Safety Bulletin */}
        <div className="border-4 border-black bg-red-50 dark:bg-zinc-900 p-4 shadow-[4px_4px_0px_#000] space-y-2">
          <div className="flex items-center gap-2 border-b-2 border-black pb-2 text-red-900 dark:text-red-400 font-black uppercase text-xs">
            <AlertTriangle className="w-4 h-4" />
            Assistant to the Regional Manager - Safety Notice
          </div>
          <p className="text-xs font-bold leading-relaxed">
            "Reminder: The safety officer (me) has conducted a surprise fire readiness test. Exit routes through the annex
            must remain completely unblocked by unauthorized cat food bowls (Angela). In the event of a real emergency,
            do not attempt to climb into the ceiling tiles like Oscar."
          </p>
          <div className="text-[10px] font-mono font-bold text-muted-foreground">
            — Dwight K. Schrute, Volunteer Sheriff & ARM
          </div>
        </div>
      </div>
    </div>
  );
}
