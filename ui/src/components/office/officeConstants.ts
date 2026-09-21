// Geetorus 2D Office Branch - Constants & Data Specifications
// Based on 2D Virtual Office Floorplan & Character Cast

export type OfficeDepartment =
  | 'management'
  | 'sales'
  | 'accounting'
  | 'reception'
  | 'quality_hr'
  | 'breakroom'
  | 'conference';

export type PresenceState =
  | 'working'
  | 'away'
  | 'break'
  | 'meeting'
  | 'focus'
  | 'offline';

export type OfficeEventKind =
  | 'normal'
  | 'all_hands'
  | 'fire_drill'
  | 'birthday'
  | 'dundies'
  | 'phone_call';

export interface OfficeCharacter {
  id: string;
  name: string;
  displayName: string;
  title: string;
  department: OfficeDepartment;
  deskCoord: { x: number; y: number }; // Tile coordinates on office grid (0..48, 0..32)
  deskFacing: 'up' | 'down' | 'left' | 'right';
  signatureColor: string;
  blurb: string;
  quotes: string[];
  dundieAward?: string;
  deskItems?: string[];
  skin: 'light' | 'tan' | 'brown' | 'dark';
  hairColor: [number, number, number];
  hairStyle: string;
  hairArgs?: Record<string, any>;
  clothing: string;
  clothColor1: [number, number, number];
  clothColor2?: [number, number, number];
  tieColor?: [number, number, number];
  glasses?: boolean;
  facialHair?: string;
  heavy?: boolean;
  lashes?: boolean;
  blush?: boolean;
}

export interface RoomZone {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  accent: string;
}

// Office Grid Dims: 50 columns x 34 rows (each tile = 24x24 px, base world = 1200 x 816 px)
export const WORLD_TILES_X = 50;
export const WORLD_TILES_Y = 34;
export const TILE_SIZE = 24;

export const ROOM_ZONES: RoomZone[] = [
  {
    id: 'manager',
    name: "Michael's Office",
    description: "Regional Manager's sanctuary. Home to the World's Best Boss mug.",
    x: 2,
    y: 2,
    w: 11,
    h: 10,
    color: '#eef2ff',
    accent: '#4338ca',
  },
  {
    id: 'conference',
    name: 'Conference Room',
    description: 'Site of intense diversity training and impromptu 5-minute meetings.',
    x: 14,
    y: 2,
    w: 17,
    h: 10,
    color: '#f0fdf4',
    accent: '#15803d',
  },
  {
    id: 'kitchen_break',
    name: 'Break Room & Kitchen',
    description: 'Hot coffee, vending treats, and the Party Planning Committee HQ.',
    x: 32,
    y: 2,
    w: 16,
    h: 11,
    color: '#fffbeb',
    accent: '#b45309',
  },
  {
    id: 'reception',
    name: 'Reception Area',
    description: 'Geetorus 2D, this is Pam. Visitor couch and incoming switchboard.',
    x: 2,
    y: 13,
    w: 12,
    h: 9,
    color: '#fdf4ff',
    accent: '#86198f',
  },
  {
    id: 'accounting',
    name: 'Accounting Department',
    description: 'Angela, Oscar & Kevin. Home of the Kelevin mathematical constant.',
    x: 2,
    y: 23,
    w: 14,
    h: 9,
    color: '#ecfeff',
    accent: '#0e7490',
  },
  {
    id: 'sales',
    name: 'Sales Bullpen',
    description: 'Top paper sales reps in northeastern PA. Epic prank central.',
    x: 15,
    y: 13,
    w: 18,
    h: 19,
    color: '#f8fafc',
    accent: '#0f172a',
  },
  {
    id: 'annex',
    name: 'The Annex & QA/HR',
    description: 'HR, Customer Service, and Quality Assurance. Beyond the hallway.',
    x: 34,
    y: 14,
    w: 14,
    h: 18,
    color: '#f5f3ff',
    accent: '#6d28d9',
  },
];

export const OFFICE_CHARACTERS: OfficeCharacter[] = [
  {
    id: 'michael',
    name: 'michael',
    displayName: 'Michael Scott',
    title: 'Regional Manager',
    department: 'management',
    deskCoord: { x: 7, y: 6 },
    deskFacing: 'down',
    signatureColor: '#4338ca',
    blurb: "World's Best Boss. Would I rather be feared or loved? Easy. Both.",
    quotes: [
      "That's what she said!",
      'I declare BANKRUPTCY!',
      'I am not superstitious, but I am a little stitious.',
      'Conference room, five minutes!',
      'Sometimes I start a sentence and I don’t even know where it’s going.',
      'You miss 100% of the shots you don’t take. — Wayne Gretzky — Michael Scott',
      'I love inside jokes. I’d love to be a part of one someday.',
    ],
    dundieAward: "World's Best Boss Award",
    deskItems: ["World's Best Boss Mug", 'Dundie Trophy', 'George Foreman Grill'],
    skin: 'light',
    hairColor: [58, 42, 28],
    hairStyle: 'styleShort',
    hairArgs: { part: 'L' },
    clothing: 'suit',
    clothColor1: [58, 63, 74],
    tieColor: [180, 50, 50],
  },
  {
    id: 'dwight',
    name: 'dwight',
    displayName: 'Dwight Schrute',
    title: 'Assistant (to the) Regional Manager',
    department: 'sales',
    deskCoord: { x: 21, y: 17 },
    deskFacing: 'up',
    signatureColor: '#b45309',
    blurb: 'Sales legend, beet farmer, karate purple belt, volunteer sheriff.',
    quotes: [
      'Question: What bear is best?',
      'False. Black bear.',
      'Identity theft is not a joke, Jim! Millions of families suffer every year!',
      'Whenever I’m about to do something, I think, “Would an idiot do that?”',
      'I am ready to face any challenge that might be foolish enough to face me.',
      'Schrute Farms has the finest beets in Lackawanna County.',
      'Fire drill! STAY CALM! STAY F***ING CALM!',
    ],
    dundieAward: 'Top Salesman & Volunteer Deputy Award',
    deskItems: ['Bobblehead', 'Jar of Pickled Beets', 'Karate Purple Belt'],
    skin: 'light',
    hairColor: [64, 48, 28],
    hairStyle: 'styleShort',
    hairArgs: { part: 'L', recede: 1 },
    clothing: 'dressshirt',
    clothColor1: [184, 155, 62],
    tieColor: [110, 75, 40],
    glasses: true,
  },
  {
    id: 'jim',
    name: 'jim',
    displayName: 'Jim Halpert',
    title: 'Senior Sales Representative',
    department: 'sales',
    deskCoord: { x: 21, y: 19 },
    deskFacing: 'down',
    signatureColor: '#0284c7',
    blurb: 'Paper salesman, master prankster, stares directly at the camera.',
    quotes: [
      'Bears. Beets. Battlestar Galactica.',
      'I put Dwight’s stapler in Jell-O again.',
      'Right now, this is just a job. If I advance any higher in this company, then this would be my career.',
      'Everything I have I owe to this job... this stupid, wonderful, boring, amazing job.',
      'Dwight, you can’t put a price tag on peace of mind.',
      'I look at the camera like this.',
    ],
    dundieAward: 'Best Dad & Master Prankster Award',
    deskItems: ['Stapler in Jell-O', 'Ham Radio Manual', 'Geetorus 2D Mug'],
    skin: 'light',
    hairColor: [92, 60, 34],
    hairStyle: 'styleFloppy',
    clothing: 'dressshirt',
    clothColor1: [172, 196, 224],
    tieColor: [120, 130, 150],
  },
  {
    id: 'pam',
    name: 'pam',
    displayName: 'Pam Beesly',
    title: 'Receptionist & Office Artist',
    department: 'reception',
    deskCoord: { x: 7, y: 16 },
    deskFacing: 'right',
    signatureColor: '#ec4899',
    blurb: 'Receptionist, watercolor painter, secret keeper of Geetorus 2D.',
    quotes: [
      'Geetorus 2D, this is Pam.',
      'I feel like I’ve been sitting at this desk forever.',
      'There’s a lot of beauty in ordinary things. Isn’t that kind of the point?',
      'You bought a building just to sell coffee?',
      'Michael, you can’t fire someone just for having bad vibes.',
      'I drew a watercolor of our building.',
    ],
    dundieAward: 'Whitest Sneakers Award',
    deskItems: ['Watercolor Paint Set', 'Candy Jar', 'Switchboard Headset'],
    skin: 'light',
    hairColor: [120, 76, 42],
    hairStyle: 'styleFrame',
    hairArgs: { length: 18, vol: 2 },
    clothing: 'cardigan',
    clothColor1: [236, 174, 192],
    clothColor2: [244, 242, 238],
    blush: true,
    lashes: true,
  },
  {
    id: 'stanley',
    name: 'stanley',
    displayName: 'Stanley Hudson',
    title: 'Sales Representative',
    department: 'sales',
    deskCoord: { x: 27, y: 17 },
    deskFacing: 'up',
    signatureColor: '#78350f',
    blurb: 'Master of crossword puzzles, clocking out at 5:00 sharp, Pretzel Day fan.',
    quotes: [
      'Did I stutter?',
      'I wake up every morning in a bed that’s too small, driving my daughter to a school that’s too expensive...',
      'Is it Pretzel Day today?',
      'Leave me alone. I’m doing my crossword.',
      'I will be on the beach in Florida sipping rum.',
      'Five o’clock. Goodnight everybody.',
    ],
    dundieAward: 'Fine Work & Pretzel Champion Award',
    deskItems: ['Crossword Puzzle', 'Pretzel Day Ticket', 'Florida Postcard'],
    skin: 'dark',
    hairColor: [60, 54, 48],
    hairStyle: 'styleRecede',
    clothing: 'dressshirt',
    clothColor1: [150, 120, 86],
    tieColor: [120, 78, 52],
    facialHair: 'mustache',
    glasses: true,
    heavy: true,
  },
  {
    id: 'phyllis',
    name: 'phyllis',
    displayName: 'Phyllis Vance',
    title: 'Sales Representative',
    department: 'sales',
    deskCoord: { x: 27, y: 19 },
    deskFacing: 'down',
    signatureColor: '#9333ea',
    blurb: 'Gentle on the surface, married to Bob Vance (Vance Refrigeration).',
    quotes: [
      'Bob Vance, Vance Refrigeration.',
      'I knitted oven mitts for secret santa.',
      'Close your mouth, sweetie, you look like a trout.',
      'We’re having a sale on 24lb bond paper today.',
      'Michael, don’t make me get Bob down here.',
    ],
    dundieAward: 'Bushiest Beaver Award',
    deskItems: ['Vance Refrigeration Mug', 'Knitting Yarn', 'Scented Pinecone'],
    skin: 'light',
    hairColor: [196, 162, 110],
    hairStyle: 'styleCurly',
    clothing: 'blouse',
    clothColor1: [202, 160, 192],
    glasses: true,
    heavy: true,
    lashes: true,
  },
  {
    id: 'andy',
    name: 'andy',
    displayName: 'Andy Bernard',
    title: 'Sales Representative',
    department: 'sales',
    deskCoord: { x: 24, y: 26 },
    deskFacing: 'up',
    signatureColor: '#16a34a',
    blurb: 'Cornell alumnus, Here Comes Treble soloist, Anger Management graduate.',
    quotes: [
      'Rit-dit-dit-di-doo!',
      'Did I ever tell you guys I went to Cornell?',
      'I wish there was a way to know you’re in the good old days before you’ve actually left them.',
      'Big Tuna! What’s cracking?',
      'My nickname in college was Nard Dog.',
    ],
    dundieAward: 'Doobie Doobie Doo Award',
    deskItems: ['Cornell Pennant', 'Banjo Pick', 'Here Comes Treble CD'],
    skin: 'light',
    hairColor: [74, 51, 32],
    hairStyle: 'styleShort',
    hairArgs: { part: 'R' },
    clothing: 'polo',
    clothColor1: [176, 65, 58],
    clothColor2: [150, 50, 46],
  },
  {
    id: 'angela',
    name: 'angela',
    displayName: 'Angela Martin',
    title: 'Senior Accountant & Head of PPC',
    department: 'accounting',
    deskCoord: { x: 5, y: 26 },
    deskFacing: 'right',
    signatureColor: '#475569',
    blurb: 'Strict accountant, cat enthusiast (Bandit, Sprinkles), Party Planning Committee chair.',
    quotes: [
      'Green is whorish.',
      'The Party Planning Committee meeting starts in 10 minutes.',
      'Poop is raining from the ceilings. Poop!',
      'I have nine cats and they all have names.',
      'Kevin, your numbers are completely made up.',
    ],
    dundieAward: 'Tight-Ass Award',
    deskItems: ['Cat Photos (Bandit & Sprinkles)', 'PPC Gavel', 'Lint Roller'],
    skin: 'light',
    hairColor: [186, 154, 90],
    hairStyle: 'styleBun',
    clothing: 'cardigan',
    clothColor1: [150, 146, 170],
    clothColor2: [235, 233, 226],
    lashes: true,
  },
  {
    id: 'kevin',
    name: 'kevin',
    displayName: 'Kevin Malone',
    title: 'Accountant',
    department: 'accounting',
    deskCoord: { x: 9, y: 26 },
    deskFacing: 'left',
    signatureColor: '#0284c7',
    blurb: 'Famous for his secret family chili, drum player for Scrantonicity.',
    quotes: [
      'Why waste time say lot word when few word do trick?',
      'The trick is to undercook the onions. Everybody is going to get to know each other in the pot.',
      'A mistake plus Kelevin gets you home by seven!',
      'Me want cookie.',
      'It’s just that people think I’m stupid. But I’m not.',
    ],
    dundieAward: "Don't Go in There After Me Award",
    deskItems: ['Secret Chili Pot', 'Scrantonicity Drumsticks', 'Kelevin Calculation Note'],
    skin: 'light',
    hairColor: [58, 44, 30],
    hairStyle: 'styleBald',
    clothing: 'polo',
    clothColor1: [110, 140, 180],
    clothColor2: [90, 120, 160],
    heavy: true,
  },
  {
    id: 'oscar',
    name: 'oscar',
    displayName: 'Oscar Martinez',
    title: 'Senior Accountant',
    department: 'accounting',
    deskCoord: { x: 9, y: 29 },
    deskFacing: 'up',
    signatureColor: '#b91c1c',
    blurb: 'The intellectual backbone of the branch. Finer Things Club co-founder.',
    quotes: [
      'Actually, that’s a misconception.',
      'Your budget has an $800 surplus. If we don’t spend it, we lose it.',
      'Michael, explain this to me like I’m an eight year old.',
      'Our ledger is balanced to the cent, Kevin’s fudge factor notwithstanding.',
      'Actually, espresso is brewed under high pressure, not steeped.',
    ],
    dundieAward: 'Show Me the Money & Actually Award',
    deskItems: ['Financial Ledger', 'Finer Things Club Teacup', 'Abacus'],
    skin: 'tan',
    hairColor: [28, 22, 18],
    hairStyle: 'styleShort',
    hairArgs: { part: 'L' },
    clothing: 'sweater',
    clothColor1: [122, 60, 74],
  },
  {
    id: 'toby',
    name: 'toby',
    displayName: 'Toby Flenderson',
    title: 'HR Representative',
    department: 'quality_hr',
    deskCoord: { x: 38, y: 18 },
    deskFacing: 'down',
    signatureColor: '#71717a',
    blurb: 'Corporate HR liaison. Michael’s sworn enemy. Scranton Strangler juror.',
    quotes: [
      'Technically, you cannot fire someone for their choice of socks.',
      'Michael, you’re not allowed to do that.',
      'I have a passion for mystery novels. Chad Flenderman.',
      'Why does everyone always pick on me?',
      'Costa Rica was... an experience.',
    ],
    dundieAward: 'Extreme Patience Award',
    deskItems: ['Chad Flenderman Manuscript', 'Stress Squeeze Ball', 'Costa Rica Travel Guide'],
    skin: 'light',
    hairColor: [106, 90, 66],
    hairStyle: 'styleShort',
    hairArgs: { part: 'L', recede: 1 },
    clothing: 'dressshirt',
    clothColor1: [150, 150, 120],
    facialHair: 'mustacheSm',
  },
  {
    id: 'kelly',
    name: 'kelly',
    displayName: 'Kelly Kapoor',
    title: 'Customer Service Specialist',
    department: 'quality_hr',
    deskCoord: { x: 42, y: 18 },
    deskFacing: 'down',
    signatureColor: '#db2777',
    blurb: 'Customer relations diva, pop culture encyclopedia, Ryan enthusiast.',
    quotes: [
      'I have a lot of questions. Number one: how dare you?',
      'Ryan used ME as an object!',
      'I am one of the few people who looks good in everything.',
      'Did you see what Beyoncé wore to the Grammy awards?!',
      'Basically, I am the smartest person in the entire annex.',
    ],
    dundieAward: 'A Little Bit of Drama Award',
    deskItems: ['Celebrity Tabloids', 'Glitter Lip Gloss', 'Ryan Nameplate'],
    skin: 'tan',
    hairColor: [24, 18, 22],
    hairStyle: 'styleFrame',
    hairArgs: { length: 20, vol: 1 },
    clothing: 'blouse',
    clothColor1: [212, 90, 158],
    blush: true,
    lashes: true,
  },
  {
    id: 'ryan',
    name: 'ryan',
    displayName: 'Ryan Howard',
    title: 'Business Temp / Prodigy',
    department: 'quality_hr',
    deskCoord: { x: 38, y: 23 },
    deskFacing: 'up',
    signatureColor: '#334155',
    blurb: 'The Temp who started the fire. WUPHF.com founder.',
    quotes: [
      'RYAN STARTED THE FIRE!',
      'WUPHF.com is going to change communication forever.',
      'I’d rather not be recorded right now.',
      'I’m working on an algorithm for paper distribution.',
      'Michael, please stop calling me.',
    ],
    dundieAward: 'Hottest in the Office Award',
    deskItems: ['WUPHF.com Pitch Deck', 'Cheesy Pita Box', 'Fedora Hat'],
    skin: 'light',
    hairColor: [42, 32, 24],
    hairStyle: 'styleSpiky',
    clothing: 'suit',
    clothColor1: [58, 58, 68],
    tieColor: [40, 40, 50],
  },
  {
    id: 'creed',
    name: 'creed',
    displayName: 'Creed Bratton',
    title: 'Quality Assurance Director',
    department: 'quality_hr',
    deskCoord: { x: 42, y: 23 },
    deskFacing: 'up',
    signatureColor: '#4d7c0f',
    blurb: 'Former rock musician, mung bean grower, mysterious background.',
    quotes: [
      'Nobody steals from Creed Bratton and gets away with it.',
      'I’ve been involved in a number of cults, both as a leader and a follower.',
      'If I can’t scuba, then what’s this all been about? What am I working toward?',
      'Just pretend like we’re talking until the cops leave.',
      'I sprout mung beans on a damp paper towel in my desk drawer.',
    ],
    dundieAward: 'Quality Assurance Mystery Award',
    deskItems: ['Sprouting Mung Beans', 'Vintage 1968 Medal', 'Fake IDs'],
    skin: 'light',
    hairColor: [170, 166, 156],
    hairStyle: 'styleBald',
    clothing: 'dressshirt',
    clothColor1: [126, 130, 96],
    facialHair: 'stubble',
  },
  {
    id: 'meredith',
    name: 'meredith',
    displayName: 'Meredith Palmer',
    title: 'Supplier Relations',
    department: 'quality_hr',
    deskCoord: { x: 42, y: 28 },
    deskFacing: 'left',
    signatureColor: '#ea580c',
    blurb: 'Supplier discounts negotiator, party animal, bat-bite survivor.',
    quotes: [
      'It’s five o’clock somewhere!',
      'Stop looking at my thermos.',
      'I got hit by Michael’s car on company property, so we’re good.',
      'Who wants ribs? I got coupons from Hammermill.',
      'Another day, another carton of wine.',
    ],
    dundieAward: 'Grace Under Fire & Best Kegger Award',
    deskItems: ['Thermos Flask', 'Outback Steakhouse Coupons', 'Party Horn'],
    skin: 'light',
    hairColor: [154, 82, 46],
    hairStyle: 'styleMessy',
    hairArgs: { length: 15 },
    clothing: 'blouse',
    clothColor1: [176, 86, 74],
    lashes: true,
  },
  {
    id: 'darryl',
    name: 'darryl',
    displayName: 'Darryl Philbin',
    title: 'Warehouse Foreman / Operations',
    department: 'management',
    deskCoord: { x: 38, y: 28 },
    deskFacing: 'right',
    signatureColor: '#1e293b',
    blurb: 'Smooth warehouse leader, pianist, teaching Michael street slang (Bippity Boppity).',
    quotes: [
      'Bippity boppity, give me the zoppity.',
      'Dinkin flicka.',
      'Fluffy fingers. You know how it is.',
      'Michael, you can’t jump onto a bouncy castle from the roof.',
      'Warehouse runs Scranton. You paper pushers just take orders.',
    ],
    dundieAward: 'Warehouse MVP Award',
    deskItems: ['Warehouse Clipboard', 'Keyboard Synthesizer', 'Bippity Boppity Glossary'],
    skin: 'dark',
    hairColor: [30, 24, 20],
    hairStyle: 'styleShort',
    clothing: 'dressshirt',
    clothColor1: [50, 70, 100],
    facialHair: 'mustache',
    heavy: true,
  },
];

// Special Points of Interest for Errands and Animations
export interface ErrandAnchor {
  id: string;
  name: string;
  tile: { x: number; y: number };
  standTile: { x: number; y: number };
  kind: 'coffee' | 'vending' | 'water_cooler' | 'copier' | 'whiteboard' | 'announcement';
}

export const OFFICE_ANCHORS: ErrandAnchor[] = [
  { id: 'coffee_maker', name: 'Scranton Coffee Machine', tile: { x: 36, y: 4 }, standTile: { x: 36, y: 5 }, kind: 'coffee' },
  { id: 'vending_machine', name: 'Snack Vending Machine', tile: { x: 44, y: 4 }, standTile: { x: 44, y: 5 }, kind: 'vending' },
  { id: 'water_cooler_bullpen', name: 'Bullpen Water Cooler', tile: { x: 18, y: 14 }, standTile: { x: 18, y: 15 }, kind: 'water_cooler' },
  { id: 'water_cooler_annex', name: 'Annex Water Cooler', tile: { x: 35, y: 16 }, standTile: { x: 35, y: 17 }, kind: 'water_cooler' },
  { id: 'copier_machine', name: 'Heavy-Duty Copier', tile: { x: 30, y: 23 }, standTile: { x: 30, y: 24 }, kind: 'copier' },
  { id: 'conference_board', name: 'Conference Whiteboard', tile: { x: 22, y: 3 }, standTile: { x: 22, y: 4 }, kind: 'whiteboard' },
  { id: 'michael_podium', name: "Michael's Announcement Spot", tile: { x: 7, y: 7 }, standTile: { x: 7, y: 8 }, kind: 'announcement' },
];

// Conference Room Chairs for All-Hands Meeting
export const CONFERENCE_SEATS = [
  { x: 17, y: 5 }, { x: 19, y: 5 }, { x: 21, y: 5 }, { x: 23, y: 5 }, { x: 25, y: 5 },
  { x: 17, y: 8 }, { x: 19, y: 8 }, { x: 21, y: 8 }, { x: 23, y: 8 }, { x: 25, y: 8 },
  { x: 15, y: 6 }, { x: 15, y: 7 }, { x: 27, y: 6 }, { x: 27, y: 7 },
];

// Break Room Table Seats for Lunch & Parties
export const BREAKROOM_SEATS = [
  { x: 38, y: 7 }, { x: 40, y: 7 }, { x: 42, y: 7 },
  { x: 38, y: 9 }, { x: 40, y: 9 }, { x: 42, y: 9 },
];

export interface OfficePlant {
  id: string;
  name: string;
  room: string;
  tile: { x: number; y: number };
  standTile: { x: number; y: number };
  type: 'ficus' | 'fern' | 'potted_palm' | 'monstera';
}

export const OFFICE_PLANTS: OfficePlant[] = [
  { id: 'plant_michael', name: "Michael's Office Ficus", room: 'manager', tile: { x: 3, y: 4 }, standTile: { x: 3, y: 5 }, type: 'ficus' },
  { id: 'plant_bullpen', name: 'Sales Bullpen Palm', room: 'sales', tile: { x: 16, y: 14 }, standTile: { x: 16, y: 15 }, type: 'potted_palm' },
  { id: 'plant_reception', name: 'Reception Welcome Fern', room: 'reception', tile: { x: 3, y: 15 }, standTile: { x: 4, y: 15 }, type: 'fern' },
  { id: 'plant_breakroom', name: 'Breakroom Corner Monstera', room: 'breakroom', tile: { x: 33, y: 4 }, standTile: { x: 33, y: 5 }, type: 'monstera' },
  { id: 'plant_accounting', name: 'Accounting Desk Jade', room: 'accounting', tile: { x: 3, y: 24 }, standTile: { x: 4, y: 24 }, type: 'fern' },
];

export type ErrandKind = 'smoke' | 'water' | 'coffee' | 'window' | 'dispenser' | 'fridge' | 'bin';

export interface OfficeErrandSpot {
  id: string;
  kind: ErrandKind;
  name: string;
  standTile: { x: number; y: number };
  facing: 'up' | 'down' | 'left' | 'right';
  duration: number; // in seconds
  thoughtQuotes: string[];
  isWindowSpot?: boolean;
  bossOnly?: boolean;
}

export const OFFICE_ERRAND_SPOTS: OfficeErrandSpot[] = [
  {
    id: 'smoke_window_michael',
    kind: 'smoke',
    name: "Michael's Cracked Window (Cigar Break)",
    standTile: { x: 5, y: 3 },
    facing: 'up',
    duration: 14,
    bossOnly: true,
    isWindowSpot: true,
    thoughtQuotes: [
      'Puffing by the cracked window... pure boss energy.',
      'A fine Cuban cigar. Don’t tell corporate or Jan.',
      'Sometimes you just gotta crack the sash and let the smoke drift.',
    ],
  },
  {
    id: 'smoke_window_north',
    kind: 'smoke',
    name: 'North Corridor Window (Smoke Break)',
    standTile: { x: 18, y: 3 },
    facing: 'up',
    duration: 12,
    isWindowSpot: true,
    thoughtQuotes: [
      'Quick cigarette break by the window. Needed this.',
      'Watching the Scranton clouds roll in with a smoke.',
      'Exhaling out the cracked window. Nobody saw a thing.',
    ],
  },
  {
    id: 'water_plant_michael',
    kind: 'water',
    name: "Feed Michael's Ficus",
    standTile: { x: 3, y: 5 },
    facing: 'up',
    duration: 6,
    thoughtQuotes: [
      'Feeding Michael’s ficus... looking lively today!',
      'Gave the boss plant a good drink of water.',
    ],
  },
  {
    id: 'water_plant_bullpen',
    kind: 'water',
    name: 'Feed Bullpen Palm',
    standTile: { x: 16, y: 15 },
    facing: 'up',
    duration: 6,
    thoughtQuotes: [
      'Watering the bullpen palm. Green energy for high sales.',
      'Plants need love too. Drink up, buddy!',
    ],
  },
  {
    id: 'water_plant_reception',
    kind: 'water',
    name: 'Feed Reception Fern',
    standTile: { x: 4, y: 15 },
    facing: 'left',
    duration: 6,
    thoughtQuotes: [
      'Pam’s reception fern needed a fresh splash of water.',
      'Feeding the welcome fern by the front desk.',
    ],
  },
  {
    id: 'water_plant_breakroom',
    kind: 'water',
    name: 'Feed Breakroom Monstera',
    standTile: { x: 33, y: 5 },
    facing: 'up',
    duration: 6,
    thoughtQuotes: [
      'Giving the breakroom monstera its daily hydration.',
      'Fresh droplets for the office jungle.',
    ],
  },
  {
    id: 'coffee_machine_run',
    kind: 'coffee',
    name: 'Scranton Roast Coffee Brew',
    standTile: { x: 36, y: 5 },
    facing: 'up',
    duration: 7,
    thoughtQuotes: [
      'Fresh dark roast coffee brewing. Aroma is glorious.',
      'Carrying a steaming mug back to my desk to power through tasks.',
      'Coffee is the lifeblood of Geetorus 2D.',
    ],
  },
  {
    id: 'window_gaze_peace',
    kind: 'window',
    name: 'Scranton Skyline Window Gaze',
    standTile: { x: 26, y: 3 },
    facing: 'up',
    duration: 7,
    isWindowSpot: true,
    thoughtQuotes: [
      'Gazing out the north window at Lackawanna County.',
      'Breeze slipping in under the sash feels wonderful.',
    ],
  },
];

export interface DoorwayThreshold {
  id: string;
  name: string;
  x: number;
  y: number;
  orientation: 'horizontal' | 'vertical';
  widthTiles: number;
}

export const DOORWAY_THRESHOLDS: DoorwayThreshold[] = [
  { id: 'door_manager', name: "Michael's Office Door", x: 7, y: 12, orientation: 'horizontal', widthTiles: 2 },
  { id: 'door_conference', name: 'Conference Room Door', x: 21, y: 12, orientation: 'horizontal', widthTiles: 2 },
  { id: 'door_breakroom', name: 'Break Room Door', x: 38, y: 12, orientation: 'horizontal', widthTiles: 2 },
  { id: 'door_entrance', name: 'Main Office Entrance', x: 14, y: 30, orientation: 'horizontal', widthTiles: 3 },
];

