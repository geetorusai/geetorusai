// Dunder Mifflin Procedural Pixel Art Generator
// Custom pixel composition for 18x32 character sprites, 18x28 busts, and office props

import type { OfficeCharacter } from './officeConstants';
import { ACT_COLORS, type FlyingEnvelope } from './officeMailbox';

export const PORTRAIT_W = 18;
export const PORTRAIT_H = 28;
export const SCENE_W = 18;
export const SCENE_H = 32;

type RGB = [number, number, number];
type Buf = Uint8ClampedArray;

const OUTLINE: RGB = [30, 26, 36];
const HX0 = 4, HX1 = 13;

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
function shades(rgb: RGB, dl = 1.25, dd = 0.65): [RGB, RGB, RGB] {
  return [
    [clamp(rgb[0] * dl), clamp(rgb[1] * dl), clamp(rgb[2] * dl)],
    [rgb[0], rgb[1], rgb[2]],
    [clamp(rgb[0] * dd), clamp(rgb[1] * dd), clamp(rgb[2] * dd)],
  ];
}

interface SkinPal { hi: RGB; base: RGB; sh: RGB; line: RGB; }
const SKIN: Record<string, SkinPal> = {
  light: { hi: [255, 222, 192], base: [248, 202, 172], sh: [214, 158, 126], line: [168, 112, 82] },
  tan:   { hi: [234, 184, 138], base: [214, 162, 116], sh: [176, 126, 86],  line: [138, 92, 60] },
  brown: { hi: [180, 130, 94],  base: [158, 112, 78],  sh: [124, 86, 58],   line: [90, 60, 40] },
  dark:  { hi: [142, 98, 70],   base: [120, 80, 56],   sh: [94, 62, 42],    line: [64, 42, 28] },
};

function setPixel(buf: Buf, w: number, h: number, x: number, y: number, c: RGB, a = 255) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 4;
  buf[idx] = c[0];
  buf[idx + 1] = c[1];
  buf[idx + 2] = c[2];
  buf[idx + 3] = a;
}

function fillRect(buf: Buf, w: number, h: number, x0: number, y0: number, x1: number, y1: number, c: RGB, a = 255) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      setPixel(buf, w, h, x, y, c, a);
    }
  }
}

function outlinePass(buf: Buf, w: number, h: number) {
  const edgePts: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (buf[idx + 3] !== 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          if (buf[(ny * w + nx) * 4 + 3] === 255) {
            edgePts.push([x, y]);
            break;
          }
        }
      }
    }
  }
  for (const [x, y] of edgePts) {
    setPixel(buf, w, h, x, y, OUTLINE);
  }
}

function drawHead(buf: Buf, w: number, h: number, skinName: string, heavy = false) {
  const s = SKIN[skinName] || SKIN.light;
  for (let y = 4; y <= 16; y++) {
    for (let x = HX0; x <= HX1; x++) {
      if (((x === HX0 || x === HX1) && (y === 4 || y === 5 || y === 16)) || ((x === 5 || x === 12) && y === 4)) continue;
      setPixel(buf, w, h, x, y, s.base);
    }
  }
  // highlights & shadows
  for (let y = 6; y < 12; y++) setPixel(buf, w, h, 5, y, s.hi);
  setPixel(buf, w, h, 6, 5, s.hi);
  setPixel(buf, w, h, 7, 5, s.hi);
  for (let y = 6; y < 15; y++) setPixel(buf, w, h, 12, y, s.sh);
  for (const x of [7, 8, 9, 10, 11]) setPixel(buf, w, h, x, 16, s.sh);
  for (const ex of [HX0 - 1, HX1 + 1]) {
    setPixel(buf, w, h, ex, 9, s.base);
    setPixel(buf, w, h, ex, 10, s.base);
    setPixel(buf, w, h, ex, 11, s.sh);
  }
  // neck
  fillRect(buf, w, h, 7, 17, 10, 18, s.sh);
  fillRect(buf, w, h, 7, 17, 9, 17, s.base);

  if (heavy) {
    for (let y = 11; y <= 15; y++) {
      setPixel(buf, w, h, HX0 - 1, y, s.base);
      setPixel(buf, w, h, HX1 + 1, y, s.base);
    }
    fillRect(buf, w, h, 6, 17, 11, 18, s.base);
  }
}

function drawFace(buf: Buf, w: number, h: number, skinName: string, lashes = false, blush = false) {
  const s = SKIN[skinName] || SKIN.light;
  const white: RGB = [252, 250, 246];
  const pup: RGB = [42, 34, 38];
  // eyes
  for (const [a, b, p] of [[5, 6, 6], [10, 11, 10]] as const) {
    setPixel(buf, w, h, a, 9, white);
    setPixel(buf, w, h, b, 9, white);
    setPixel(buf, w, h, p, 9, pup);
  }
  if (lashes) {
    const lash: RGB = [50, 36, 44];
    for (const x of [5, 6, 10, 11]) setPixel(buf, w, h, x, 8, lash);
    setPixel(buf, w, h, 4, 8, lash);
    setPixel(buf, w, h, 12, 8, lash);
    setPixel(buf, w, h, 5, 9, [255, 255, 255]);
    setPixel(buf, w, h, 10, 9, [255, 255, 255]);
  }
  // brows
  for (const x of [5, 6, 10, 11]) setPixel(buf, w, h, x, 7, s.line);
  // nose
  setPixel(buf, w, h, 8, 11, s.sh);
  setPixel(buf, w, h, 8, 12, s.sh);
  // mouth
  const mc: RGB = [156, 84, 80];
  for (const x of [7, 8, 9, 10]) setPixel(buf, w, h, x, 14, mc);
  setPixel(buf, w, h, 6, 13, mc);
  setPixel(buf, w, h, 11, 13, mc);
  if (blush) {
    setPixel(buf, w, h, 5, 12, [235, 150, 140], 150);
    setPixel(buf, w, h, 12, 12, [235, 150, 140], 150);
  }
}

function drawHair(buf: Buf, w: number, h: number, style: string, color: RGB, skinBase: RGB, args: Record<string, any> = {}) {
  const [hi, base, sh] = shades(color);
  if (style === 'styleShort') {
    fillRect(buf, w, h, HX0, 2, HX1, 4, base);
    for (let x = HX0 - 1; x <= HX1 + 1; x++) setPixel(buf, w, h, x, 3, base);
    fillRect(buf, w, h, HX0 - 1, 4, HX1 + 1, 5, base);
    for (let y = 6; y < 9; y++) {
      setPixel(buf, w, h, HX0 - 1, y, base);
      setPixel(buf, w, h, HX0, y, base);
      setPixel(buf, w, h, HX1, y, base);
      setPixel(buf, w, h, HX1 + 1, y, base);
    }
    if (args.recede) {
      for (let y = 3; y < 6; y++) {
        for (let x = 6; x < 12; x++) setPixel(buf, w, h, x, y, skinBase);
      }
      setPixel(buf, w, h, 8, 5, base);
    }
    for (let x = HX0; x <= HX1; x++) setPixel(buf, w, h, x, 2, hi);
  } else if (style === 'styleFloppy') {
    fillRect(buf, w, h, HX0, 2, HX1, 4, base);
    for (let x = HX0 - 1; x <= HX1 + 1; x++) setPixel(buf, w, h, x, 3, base);
    fillRect(buf, w, h, HX0 - 1, 4, HX1 + 1, 5, base);
    for (let x = 6; x <= 12; x++) setPixel(buf, w, h, x, 6, base);
    for (const x of [9, 10, 11]) setPixel(buf, w, h, x, 7, base);
    for (let y = 6; y < 9; y++) {
      setPixel(buf, w, h, HX0 - 1, y, base);
      setPixel(buf, w, h, HX1 + 1, y, base);
    }
    for (let x = HX0; x <= HX1; x++) setPixel(buf, w, h, x, 2, hi);
  } else if (style === 'styleFrame') {
    const len = args.length ?? 18;
    fillRect(buf, w, h, HX0 - 1, 2, HX1 + 1, 5, base);
    for (let x = 6; x < 12; x++) setPixel(buf, w, h, x, 6, base);
    setPixel(buf, w, h, 8, 6, skinBase);
    setPixel(buf, w, h, 9, 6, skinBase);
    for (let y = 6; y <= len; y++) {
      setPixel(buf, w, h, HX0 - 1, y, base);
      setPixel(buf, w, h, HX0 - 2, y, base);
      setPixel(buf, w, h, HX1 + 1, y, base);
      setPixel(buf, w, h, HX1 + 2, y, base);
    }
    for (let x = HX0; x <= 9; x++) setPixel(buf, w, h, x, 2, hi);
  } else if (style === 'styleBun') {
    fillRect(buf, w, h, HX0, 3, HX1, 5, base);
    fillRect(buf, w, h, 7, 1, 10, 2, base);
    for (let y = 6; y < 9; y++) {
      setPixel(buf, w, h, HX0, y, base);
      setPixel(buf, w, h, HX1, y, base);
    }
    for (let x = HX0; x <= HX1; x++) setPixel(buf, w, h, x, 3, hi);
  } else if (style === 'styleCurly') {
    fillRect(buf, w, h, HX0, 3, HX1, 5, base);
    for (const [x, y] of [[4, 3], [5, 2], [7, 2], [9, 2], [11, 2], [13, 3], [3, 4], [14, 4], [3, 5], [14, 5], [3, 6], [14, 6]]) {
      setPixel(buf, w, h, x, y, base);
    }
    for (let y = 6; y < 10; y++) {
      setPixel(buf, w, h, HX0 - 1, y, base);
      setPixel(buf, w, h, HX1 + 1, y, base);
    }
  } else if (style === 'styleBald') {
    for (let x = 6; x <= 11; x++) setPixel(buf, w, h, x, 2, skinBase);
    for (let x = 5; x <= 12; x++) setPixel(buf, w, h, x, 3, skinBase);
    for (const x of [7, 8, 9]) setPixel(buf, w, h, x, 2, [255, 255, 255]);
    for (let y = 7; y <= 10; y++) {
      setPixel(buf, w, h, HX0 - 1, y, base);
      setPixel(buf, w, h, HX0, y, base);
      setPixel(buf, w, h, HX1, y, base);
      setPixel(buf, w, h, HX1 + 1, y, base);
    }
  } else {
    // Default style
    fillRect(buf, w, h, HX0, 2, HX1, 5, base);
    for (let y = 5; y < 8; y++) {
      setPixel(buf, w, h, HX0 - 1, y, base);
      setPixel(buf, w, h, HX1 + 1, y, base);
    }
  }
}

function drawGlasses(buf: Buf, w: number, h: number) {
  const frame: RGB = [56, 50, 58];
  const glint: RGB = [240, 244, 250];
  for (const x of [5, 6]) {
    setPixel(buf, w, h, x, 8, frame);
    setPixel(buf, w, h, x, 10, frame);
  }
  for (const x of [10, 11]) {
    setPixel(buf, w, h, x, 8, frame);
    setPixel(buf, w, h, x, 10, frame);
  }
  setPixel(buf, w, h, 4, 9, frame);
  setPixel(buf, w, h, 7, 9, frame);
  setPixel(buf, w, h, 9, 9, frame);
  setPixel(buf, w, h, 12, 9, frame);
  setPixel(buf, w, h, 8, 8, frame); // bridge
  setPixel(buf, w, h, 4, 8, glint);
  setPixel(buf, w, h, 9, 8, glint);
}

function drawFacialHair(buf: Buf, w: number, h: number, kind: string, color: RGB) {
  const [, base] = shades(color);
  if (kind === 'mustache') {
    for (const x of [6, 7, 8, 9, 10]) setPixel(buf, w, h, x, 13, base);
    setPixel(buf, w, h, 6, 12, base);
    setPixel(buf, w, h, 10, 12, base);
  } else if (kind === 'mustacheSm') {
    for (const x of [7, 8, 9]) setPixel(buf, w, h, x, 13, base);
  } else if (kind === 'stubble') {
    for (const [x, y] of [[5, 14], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 14]]) {
      setPixel(buf, w, h, x, y, base, 140);
    }
  }
}

function drawSceneLegs(buf: Buf, w: number, h: number, pantsCol: RGB, phase: number) {
  const [, base, sh] = shades(pantsCol);
  const shoeCol: RGB = [36, 32, 40];
  // legs cols 5-7 / 10-12
  for (const [lx0, lx1] of [[5, 7], [10, 12]] as const) {
    fillRect(buf, w, h, lx0, 25, lx1, 30, base);
    for (let y = 25; y <= 30; y++) setPixel(buf, w, h, lx1, y, sh);
  }
  const lShoe = phase === 1 ? 30 : 31;
  const rShoe = phase === 2 ? 30 : 31;
  fillRect(buf, w, h, 5, lShoe, 7, lShoe, shoeCol);
  fillRect(buf, w, h, 10, rShoe, 12, rShoe, shoeCol);
}

function drawSceneTorso(buf: Buf, w: number, h: number, char: OfficeCharacter, back: boolean) {
  const [, base, sh] = shades(char.clothColor1);
  if (char.heavy) {
    fillRect(buf, w, h, 3, 18, 14, 18, base);
    fillRect(buf, w, h, 2, 19, 15, 24, base);
    for (let y = 19; y <= 24; y++) {
      setPixel(buf, w, h, 2, y, sh);
      setPixel(buf, w, h, 15, y, sh);
    }
  } else {
    fillRect(buf, w, h, 4, 18, 13, 18, base);
    fillRect(buf, w, h, 3, 19, 14, 24, base);
    for (let y = 19; y <= 24; y++) {
      setPixel(buf, w, h, 3, y, sh);
      setPixel(buf, w, h, 14, y, sh);
    }
  }
  if (back) {
    fillRect(buf, w, h, 6, 18, 11, 18, sh);
    for (let y = 19; y <= 24; y++) setPixel(buf, w, h, 8, y, sh);
    return;
  }
  // shirt / tie detail
  if (char.clothing === 'suit' || char.clothing === 'dressshirt') {
    const white: RGB = [238, 238, 236];
    for (const [x, y] of [[8, 18], [9, 18], [7, 19], [8, 19], [9, 19], [10, 19], [8, 20], [9, 20]]) {
      setPixel(buf, w, h, x, y, white);
    }
    if (char.tieColor) {
      for (let y = 19; y <= 24; y++) {
        setPixel(buf, w, h, 8, y, char.tieColor);
        setPixel(buf, w, h, 9, y, char.tieColor);
      }
    }
  } else if (char.clothing === 'cardigan') {
    const inner = char.clothColor2 || [235, 233, 226];
    for (let y = 18; y <= 24; y++) {
      setPixel(buf, w, h, 8, y, inner);
      setPixel(buf, w, h, 9, y, inner);
    }
  }
}

function drawHeadBack(buf: Buf, w: number, h: number, char: OfficeCharacter) {
  const s = SKIN[char.skin] || SKIN.light;
  const [, base, sh] = shades(char.hairColor);
  if (char.hairStyle === 'styleBald') {
    for (let y = 2; y <= 10; y++) {
      for (let x = 5; x <= 12; x++) setPixel(buf, w, h, x, y, s.base);
    }
    for (let x = 4; x <= 13; x++) {
      setPixel(buf, w, h, x, 11, base);
      setPixel(buf, w, h, x, 12, base);
    }
  } else {
    for (let y = 2; y <= 13; y++) {
      for (let x = 4; x <= 13; x++) {
        setPixel(buf, w, h, x, y, base);
      }
    }
    for (let y = 4; y <= 12; y++) {
      setPixel(buf, w, h, 4, y, sh);
      setPixel(buf, w, h, 13, y, sh);
    }
  }
  fillRect(buf, w, h, 7, 14, 10, 17, s.sh);
}

// ─── Sprite Frame Cache & Exporters ──────────────────────────────────────────
export interface CharacterSpriteSet {
  frontStand: HTMLCanvasElement;
  frontWalk1: HTMLCanvasElement;
  frontWalk2: HTMLCanvasElement;
  backStand: HTMLCanvasElement;
  backWalk1: HTMLCanvasElement;
  backWalk2: HTMLCanvasElement;
  typing: HTMLCanvasElement;
  phone: HTMLCanvasElement;
  panic: HTMLCanvasElement;
  portrait: HTMLCanvasElement;
}

const spriteCache = new Map<string, CharacterSpriteSet>();

function bufToCanvas(buf: Buf, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  img.data.set(buf);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function renderSceneSprite(char: OfficeCharacter, phase: number, back: boolean, specialPose?: 'typing' | 'phone' | 'panic'): HTMLCanvasElement {
  const w = SCENE_W;
  const h = SCENE_H;
  const buf = new Uint8ClampedArray(w * h * 4);
  const skin = SKIN[char.skin] || SKIN.light;

  drawSceneTorso(buf, w, h, char, back);
  drawSceneLegs(buf, w, h, char.clothing === 'suit' ? shades(char.clothColor1)[2] : [52, 56, 68], phase);

  if (back) {
    drawHeadBack(buf, w, h, char);
  } else {
    drawHead(buf, w, h, char.skin, char.heavy);
    drawFace(buf, w, h, char.skin, char.lashes, char.blush);
    if (char.facialHair) drawFacialHair(buf, w, h, char.facialHair, char.hairColor);
    drawHair(buf, w, h, char.hairStyle, char.hairColor, skin.base, char.hairArgs);
    if (char.glasses) drawGlasses(buf, w, h);
  }

  // Special Overlays
  if (specialPose === 'typing') {
    // animated hands out on keyboard
    const handCol = skin.base;
    setPixel(buf, w, h, 2, 23, handCol);
    setPixel(buf, w, h, 1, 24, handCol);
    setPixel(buf, w, h, 15, 23, handCol);
    setPixel(buf, w, h, 16, 24, handCol);
  } else if (specialPose === 'phone') {
    // holding phone handset to ear
    const phoneCol: RGB = [30, 30, 34];
    fillRect(buf, w, h, 13, 8, 15, 12, phoneCol);
  } else if (specialPose === 'panic') {
    // arms thrown up in the air
    const [, base] = shades(char.clothColor1);
    setPixel(buf, w, h, 1, 14, base);
    setPixel(buf, w, h, 2, 15, base);
    setPixel(buf, w, h, 2, 16, base);
    setPixel(buf, w, h, 16, 14, base);
    setPixel(buf, w, h, 15, 15, base);
    setPixel(buf, w, h, 15, 16, base);
  }

  outlinePass(buf, w, h);
  return bufToCanvas(buf, w, h);
}

function renderPortraitBust(char: OfficeCharacter): HTMLCanvasElement {
  const w = PORTRAIT_W;
  const h = PORTRAIT_H;
  const buf = new Uint8ClampedArray(w * h * 4);
  const skin = SKIN[char.skin] || SKIN.light;

  // upper body clothing bust
  const [, base, sh] = shades(char.clothColor1);
  for (let y = 19; y < h; y++) {
    for (let x = 2; x <= 15; x++) {
      setPixel(buf, w, h, x, y, base);
    }
  }
  if (char.tieColor) {
    for (let y = 19; y < h; y++) {
      setPixel(buf, w, h, 8, y, char.tieColor);
      setPixel(buf, w, h, 9, y, char.tieColor);
    }
  }
  drawHead(buf, w, h, char.skin, char.heavy);
  drawFace(buf, w, h, char.skin, char.lashes, char.blush);
  if (char.facialHair) drawFacialHair(buf, w, h, char.facialHair, char.hairColor);
  drawHair(buf, w, h, char.hairStyle, char.hairColor, skin.base, char.hairArgs);
  if (char.glasses) drawGlasses(buf, w, h);

  outlinePass(buf, w, h);
  return bufToCanvas(buf, w, h);
}

export function getCharacterSprites(char: OfficeCharacter): CharacterSpriteSet {
  let set = spriteCache.get(char.id);
  if (!set) {
    set = {
      frontStand: renderSceneSprite(char, 0, false),
      frontWalk1: renderSceneSprite(char, 1, false),
      frontWalk2: renderSceneSprite(char, 2, false),
      backStand: renderSceneSprite(char, 0, true),
      backWalk1: renderSceneSprite(char, 1, true),
      backWalk2: renderSceneSprite(char, 2, true),
      typing: renderSceneSprite(char, 0, false, 'typing'),
      phone: renderSceneSprite(char, 0, false, 'phone'),
      panic: renderSceneSprite(char, 0, false, 'panic'),
      portrait: renderPortraitBust(char),
    };
    spriteCache.set(char.id, set);
  }
  return set;
}

// ─── Procedural Office Environment Elements ──────────────────────────────────

export function drawOfficeBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Neo-brutalist floor with industrial office carpet and tiles
  ctx.fillStyle = '#1e212b';
  ctx.fillRect(0, 0, width, height);

  // Office carpet pattern
  ctx.fillStyle = '#262a36';
  const tileSize = 24;
  for (let x = 0; x < width; x += tileSize) {
    for (let y = 0; y < height; y += tileSize) {
      if ((x / tileSize + y / tileSize) % 2 === 0) {
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }

  // Hallway walkways in smooth gray laminate
  ctx.fillStyle = '#323646';
  // Central hallway (columns 13-15 and 31-33)
  ctx.fillRect(13 * tileSize, 2 * tileSize, 2 * tileSize, 30 * tileSize);
  ctx.fillRect(31 * tileSize, 2 * tileSize, 3 * tileSize, 30 * tileSize);
  ctx.fillRect(2 * tileSize, 11 * tileSize, 46 * tileSize, 2 * tileSize);
}

export function drawRoomBoundary(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, name: string, color: string, accent: string) {
  const ts = 24;
  const rx = x * ts;
  const ry = y * ts;
  const rw = w * ts;
  const rh = h * ts;

  // Floor tint
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.94;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.globalAlpha = 1.0;

  // Walls: Neo-brutalist thick outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(rx, ry, rw, rh);

  // Hard drop shadow under wall edge
  ctx.fillStyle = '#000000';
  ctx.fillRect(rx + 3, ry + rh, rw, 3);
  ctx.fillRect(rx + rw, ry + 3, 3, rh);

  // Room Header Banner
  ctx.fillStyle = accent;
  ctx.fillRect(rx + 6, ry + 6, rw - 12, 22);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rx + 6, ry + 6, rw - 12, 22);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), rx + 12, ry + 17);
}

export function drawOfficeDesk(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  deskName: string,
  charDisplayName?: string,
  status?: string,
  isExecutive = false,
  animPhase = 0
) {
  const ts = 24;
  const dx = tileX * ts;
  const dy = tileY * ts;

  // 1. Office Chair (behind desk, drawing under desk surface)
  ctx.fillStyle = isExecutive ? '#1e1b4b' : '#334155';
  ctx.beginPath();
  ctx.arc(dx + 12, dy + 22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Chair casters (small base spokes)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(dx + 11, dy + 25, 2, 2);
  ctx.fillRect(dx + 7, dy + 23, 2, 2);
  ctx.fillRect(dx + 15, dy + 23, 2, 2);

  // 2. Desk Surface
  ctx.fillStyle = isExecutive ? '#854d0e' : '#cbd5e1'; // Rich mahogany for Michael, laminate for bullpen
  ctx.fillRect(dx - 4, dy - 2, 32, 26);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(dx - 4, dy - 2, 32, 26);

  // Hard offset shadow
  ctx.fillStyle = '#000000';
  ctx.fillRect(dx + 28, dy + 2, 2, 22);
  ctx.fillRect(dx - 2, dy + 24, 32, 2);

  // Desk wood grain / bevel highlight
  ctx.fillStyle = isExecutive ? 'rgba(254, 240, 138, 0.15)' : 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(dx - 2, dy, 28, 1);

  // 3. Computer Monitor Bezel
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(dx + 4, dy - 1, 16, 12);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(dx + 4, dy - 1, 16, 12);

  // Monitor stand base
  ctx.fillStyle = '#334155';
  ctx.fillRect(dx + 9, dy + 11, 6, 2);

  // 4. Dual-State Computer Screen (DeskScreen Munder Difflin Style)
  const isWorking = status === 'working' || status === 'focus' || status === 'phone';
  if (isWorking) {
    // Lit active screen (Vibrant Hacker Green / Neon Cyan terminal CRT)
    ctx.fillStyle = status === 'focus' ? '#064e3b' : status === 'phone' ? '#0e7490' : '#0369a1';
    ctx.fillRect(dx + 6, dy + 1, 12, 8);

    // Three animated code output lines scrolling up the screen
    for (let i = 0; i < 3; i++) {
      const linePhase = (animPhase * 3.8 + i * 2.5) % 7;
      const ly = dy + 7.5 - linePhase;
      const lw = 3 + ((i * 4 + Math.floor(animPhase * 3)) % 7);
      ctx.fillStyle = status === 'focus' ? 'rgba(74, 222, 128, 0.9)' : 'rgba(186, 230, 253, 0.9)';
      ctx.fillRect(dx + 7, Math.round(ly), Math.min(lw, 10), 1);
    }

    // Blinking terminal cursor in bottom-left
    if (Math.floor(animPhase / 0.4) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dx + 7, dy + 7, 2, 1.5);
    }

    // Active Monitor Power LED (Glowing green indicator on bezel)
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(dx + 18, dy + 9.5, 1.5, 1.5);
  } else if (status === 'meeting') {
    // Purple amber idle glow (All-hands / standup mode)
    ctx.fillStyle = '#581c87';
    ctx.fillRect(dx + 6, dy + 1, 12, 8);
    // Amber standby LED
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(dx + 18, dy + 9.5, 1.5, 1.5);
  } else {
    // Dark switched-off monitor (off state / on break / away)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(dx + 6, dy + 1, 12, 8);
    // Subtle CRT glass reflection diagonal
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(dx + 7, dy + 2, 4, 1);
    // Standby red/dim LED
    ctx.fillStyle = '#64748b';
    ctx.fillRect(dx + 18, dy + 9.5, 1.5, 1.5);
  }

  // 5. Keyboard & Mousepad
  ctx.fillStyle = '#475569';
  ctx.fillRect(dx + 5, dy + 13, 11, 3);
  // Mousepad
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(dx + 18, dy + 12, 5, 5);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(dx + 19, dy + 13, 2, 3);

  // 6. Executive Desk Extras (Michael's Office)
  if (isExecutive) {
    // Leather blotter pad
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(dx + 3, dy + 10, 18, 10);
    // "World's Best Boss" Mug (white cylinder with gold rim)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx + 22, dy + 12, 4, 5);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(dx + 22, dy + 12, 4, 1.5);
    // Dundie Trophy
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(dx - 2, dy + 6, 4, 7);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(dx - 3, dy + 13, 6, 3);
  }

  // 7. Name Tag Plaque
  if (charDisplayName) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.fillRect(dx - 8, dy - 12, 40, 10);
    ctx.strokeRect(dx - 8, dy - 12, 40, 10);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charDisplayName.split(' ')[0], dx + 12, dy - 7);
  }
}

/**
 * North Wall Exterior Windows (Munder Difflin architectural style)
 */
export function drawOfficeWindow(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  wTiles = 3,
  hTiles = 2,
  ambientPhase = 0
) {
  const ts = 24;
  const wx = tileX * ts;
  const wy = tileY * ts;
  const ww = wTiles * ts;
  const wh = hTiles * ts;

  // Window Sill Shadow
  ctx.fillStyle = '#000000';
  ctx.fillRect(wx + 2, wy + wh, ww, 3);

  // Outer Window Frame
  ctx.fillStyle = '#334155';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(wx, wy, ww, wh);

  // Glass Daylight Pane (soft sky daylight gradient)
  const glassGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
  glassGrad.addColorStop(0, 'rgba(186, 230, 253, 0.85)');
  glassGrad.addColorStop(1, 'rgba(125, 211, 252, 0.55)');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);

  // Window Panes / Mullions
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  // Center vertical bar
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy + 4);
  ctx.lineTo(wx + ww / 2, wy + wh - 4);
  // Center horizontal bar
  ctx.moveTo(wx + 4, wy + wh / 2);
  ctx.lineTo(wx + ww - 4, wy + wh / 2);
  ctx.stroke();

  // Curtains / Drapes (left and right fabric folds)
  ctx.fillStyle = '#475569';
  ctx.fillRect(wx - 2, wy - 2, 6, wh + 4);
  ctx.fillRect(wx + ww - 4, wy - 2, 6, wh + 4);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(wx - 2, wy - 2, 6, wh + 4);
  ctx.strokeRect(wx + ww - 4, wy - 2, 6, wh + 4);

  // Subtle ambient sunlight cast onto floor
  ctx.fillStyle = 'rgba(255, 250, 220, 0.05)';
  ctx.beginPath();
  ctx.moveTo(wx + 4, wy + wh);
  ctx.lineTo(wx + ww - 4, wy + wh);
  ctx.lineTo(wx + ww + 16, wy + wh + 36);
  ctx.lineTo(wx - 16, wy + wh + 36);
  ctx.closePath();
  ctx.fill();

  // Munder Difflin animated wind streaks drifting in under the cracked sash
  for (let i = 0; i < 3; i++) {
    const ph = ((ambientPhase * 0.35 + i / 3) % 1);
    const streakX = wx + 8 + i * (ww / 3) - ph * 12;
    const streakY = wy + wh - 2 + ph * 22;
    ctx.fillStyle = `rgba(216, 241, 247, ${(1 - ph) * 0.55})`;
    ctx.fillRect(Math.round(streakX), Math.round(streakY), 9, 1.5);
  }
}

/**
 * Architectural Doorway Portals (Munder Difflin room boundaries)
 */
export function drawOfficeDoorway(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
  wTiles = 2,
  label?: string
) {
  const ts = 24;
  const dx = tileX * ts;
  const dy = tileY * ts;

  if (orientation === 'horizontal') {
    const dw = wTiles * ts;
    // Floor threshold plate
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(dx, dy, dw, 6);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx, dy, dw, 6);

    // Left and right door jamb posts
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(dx - 3, dy - 6, 4, 16);
    ctx.fillRect(dx + dw - 1, dy - 6, 4, 16);

    // Open Door Leaf swung inward
    ctx.fillStyle = '#78350f';
    ctx.fillRect(dx + 2, dy - 18, 4, 20);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx + 2, dy - 18, 4, 20);

    // Brass door handle
    ctx.fillStyle = '#eab308';
    ctx.fillRect(dx + 5, dy - 8, 2, 2);
  } else {
    const dh = wTiles * ts;
    // Floor threshold plate
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(dx, dy, 6, dh);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx, dy, 6, dh);

    // Top and bottom door jamb posts
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(dx - 6, dy - 3, 16, 4);
    ctx.fillRect(dx - 6, dy + dh - 1, 16, 4);

    // Open Door Leaf swung inward
    ctx.fillStyle = '#78350f';
    ctx.fillRect(dx - 18, dy + 2, 20, 4);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx - 18, dy + 2, 20, 4);

    // Brass door handle
    ctx.fillStyle = '#eab308';
    ctx.fillRect(dx - 8, dy + 5, 2, 2);
  }

  // Optional Room Label Plaque above doorway
  if (label) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx + 4, dy - 16, ctx.measureText(label).width + 8, 10);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx + 4, dy - 16, ctx.measureText(label).width + 8, 10);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, dx + 8, dy - 9);
  }
}

/**
 * Conference Room Whiteboard
 */
export function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const ts = 24;
  const wx = x * ts;
  const wy = y * ts;
  const ww = 72;
  const wh = 36;

  // Frame shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(wx + 2, wy + 2, ww, wh);

  // Aluminum Frame
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(wx, wy, ww, wh);

  // Whiteboard Porcelain Surface
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);

  // Marker Tray at bottom
  ctx.fillStyle = '#64748b';
  ctx.fillRect(wx + 10, wy + wh, ww - 20, 3);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(wx + 10, wy + wh, ww - 20, 3);

  // Colorful markers in tray (red, blue, green, black)
  const markerColors = ['#ef4444', '#3b82f6', '#22c55e', '#0f172a'];
  markerColors.forEach((color, idx) => {
    ctx.fillStyle = color;
    ctx.fillRect(wx + 14 + idx * 8, wy + wh + 0.5, 6, 2);
  });

  // Diagram scribbles on whiteboard (flowchart boxes & arrows)
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 6px "JetBrains Mono", monospace';
  ctx.fillText('Q4 GOALS', wx + 8, wy + 11);

  // Small flowchart boxes
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 1;
  ctx.strokeRect(wx + 8, wy + 15, 14, 8);
  ctx.strokeRect(wx + 30, wy + 15, 14, 8);
  ctx.strokeRect(wx + 52, wy + 15, 14, 8);

  // Arrows
  ctx.strokeStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(wx + 22, wy + 19);
  ctx.lineTo(wx + 30, wy + 19);
  ctx.moveTo(wx + 44, wy + 19);
  ctx.lineTo(wx + 52, wy + 19);
  ctx.stroke();

  // Bullet items
  ctx.fillStyle = '#059669';
  ctx.fillRect(wx + 8, wy + 26, 30, 2);
}

export function drawConferenceTable(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const ts = 24;
  const cx = x * ts;
  const cy = y * ts;
  const tw = 216;
  const th = 72;

  // Executive chairs behind top edge of table
  for (let i = 0; i < 4; i++) {
    const chX = cx + 24 + i * 48;
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(chX, cy - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Executive chairs behind bottom edge of table
  for (let i = 0; i < 4; i++) {
    const chX = cx + 24 + i * 48;
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(chX, cy + th + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Hard drop shadow under table
  ctx.fillStyle = '#000000';
  ctx.fillRect(cx + 3, cy + th, tw, 3);
  ctx.fillRect(cx + tw, cy + 3, 3, th);

  // Big boardroom mahogany table
  ctx.fillStyle = '#78350f';
  ctx.fillRect(cx, cy, tw, th);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(cx, cy, tw, th);

  // Warm walnut table inlay
  ctx.fillStyle = '#92400e';
  ctx.fillRect(cx + 8, cy + 8, tw - 16, th - 16);

  // Conference Room Speakerphone Puck (center of table)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx + tw / 2, cy + th / 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Blue LED indicator on speakerphone
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(cx + tw / 2, cy + th / 2, 2, 0, Math.PI * 2);
  ctx.fill();

  // Notepad papers & pens along table edge
  for (let i = 0; i < 4; i++) {
    const px = cx + 18 + i * 48;
    // Top notepads
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px, cy + 10, 10, 12);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(px + 12, cy + 11, 1, 10);
    // Bottom notepads
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px, cy + th - 22, 10, 12);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(px + 12, cy + th - 21, 1, 10);
  }
}

/**
 * Break Room Dining Table with Chairs
 */
export function drawBreakroomTable(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const ts = 24;
  const bx = x * ts;
  const by = y * ts;

  // Stools / chairs around table
  ctx.fillStyle = '#64748b';
  for (const [cx, cy] of [
    [bx + 16, by - 4],
    [bx + 48, by - 4],
    [bx + 16, by + 40],
    [bx + 48, by + 40],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Table surface (clean laminate with drop shadow)
  ctx.fillStyle = '#000000';
  ctx.fillRect(bx + 2, by + 2, 64, 36);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(bx, by, 64, 36);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, 64, 36);

  // Napkin dispenser
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(bx + 28, by + 14, 8, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx + 29, by + 12, 6, 2);
}

export function drawCoffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number, steamPhase = 0) {
  const ts = 24;
  const cx = x * ts;
  const cy = y * ts;

  // Counter
  ctx.fillStyle = '#64748b';
  ctx.fillRect(cx - 4, cy, 32, 24);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 4, cy, 32, 24);

  // Coffee Maker
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx + 4, cy - 10, 16, 14);
  ctx.fillStyle = '#78350f'; // pot with coffee
  ctx.fillRect(cx + 7, cy - 2, 10, 6);

  // Steam particles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  const steamY = cy - 14 - (steamPhase % 10);
  ctx.beginPath();
  ctx.arc(cx + 12 + Math.sin(steamPhase / 4) * 3, steamY, 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number, bubblePhase = 0) {
  const ts = 24;
  const wx = x * ts;
  const wy = y * ts;

  // Base
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(wx + 2, wy + 8, 20, 16);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(wx + 2, wy + 8, 20, 16);

  // Blue Jug
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(wx + 4, wy - 8, 16, 16);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1;
  ctx.strokeRect(wx + 4, wy - 8, 16, 16);

  // Bubble
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(wx + 12, wy - 2 - (bubblePhase % 6), 1.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawVendingMachine(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const ts = 24;
  const vx = x * ts;
  const vy = y * ts;

  // Vending frame
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(vx, vy - 16, 32, 40);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(vx, vy - 16, 32, 40);

  // Glass Window
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(vx + 4, vy - 12, 24, 20);
  ctx.strokeStyle = '#0369a1';
  ctx.lineWidth = 1;
  ctx.strokeRect(vx + 4, vy - 12, 24, 20);

  // Snacks inside
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(vx + 6, vy - 10, 5, 4);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(vx + 14, vy - 10, 5, 4);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(vx + 21, vy - 10, 5, 4);

  // Dispenser slot
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(vx + 6, vy + 12, 20, 8);
}

export function drawCopier(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const ts = 24;
  const cx = x * ts;
  const cy = y * ts;

  // Copier body
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(cx, cy, 36, 26);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx, cy, 36, 26);

  // Glass top
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(cx + 4, cy + 2, 24, 10);

  // Paper feeder
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(cx + 6, cy - 6, 20, 6);
  ctx.strokeRect(cx + 6, cy - 6, 20, 6);
}

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  speakerName?: string,
  isThought = false
) {
  ctx.font = 'bold 11px "Space Grotesk", sans-serif';
  const textMetrics = ctx.measureText(text);
  const padding = 8;
  const bubbleWidth = Math.min(Math.max(textMetrics.width + padding * 2, 120), 220);
  const lineHeight = 14;
  
  // Word wrap
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < bubbleWidth - padding * 2) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  const bubbleHeight = lines.length * lineHeight + padding * 2 + (speakerName ? 14 : 0);
  const bx = x - bubbleWidth / 2;
  const by = y - bubbleHeight - 16;

  // Bubble container (Neo-brutalist white card with black border + drop shadow)
  ctx.fillStyle = '#000000';
  ctx.fillRect(bx + 3, by + 3, bubbleWidth, bubbleHeight);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx, by, bubbleWidth, bubbleHeight);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bubbleWidth, bubbleHeight);

  // Tail pointing to speaker
  ctx.beginPath();
  ctx.moveTo(x - 5, by + bubbleHeight);
  ctx.lineTo(x, by + bubbleHeight + 8);
  ctx.lineTo(x + 5, by + bubbleHeight);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();

  // Speaker Badge
  let textStartY = by + padding;
  if (speakerName) {
    ctx.fillStyle = '#ffca54'; // Drago Gold
    ctx.fillRect(bx + 6, by + 4, ctx.measureText(speakerName.toUpperCase()).width + 8, 12);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 6, by + 4, ctx.measureText(speakerName.toUpperCase()).width + 8, 12);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(speakerName.toUpperCase(), bx + 10, by + 10);
    textStartY += 14;
  }

  // Bubble Text
  ctx.fillStyle = '#000000';
  ctx.font = isThought ? 'italic 10px "Plus Jakarta Sans", sans-serif' : 'bold 11px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((line, idx) => {
    ctx.fillText(line, bx + padding, textStartY + idx * lineHeight);
  });
}

/**
 * Draw flying pixel-art envelope and arrival burst (Munder Difflin desk-to-desk mailing)
 */
export function drawFlyingEnvelope(ctx: CanvasRenderingContext2D, env: FlyingEnvelope) {
  if (env.finished) return;

  ctx.save();
  ctx.globalAlpha = env.alpha;
  ctx.translate(env.currentX, env.currentY);

  if (!env.bursting) {
    ctx.rotate(env.rotation);

    // Hard drop shadow under flying envelope
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-6, 2, 14, 10);

    // Envelope body (14x10 rect with speech-act tint)
    const tint = env.needsHuman ? '#f87171' : (ACT_COLORS[env.act] || '#fef08a');
    ctx.fillStyle = tint;
    ctx.fillRect(-7, -5, 14, 10);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-7, -5, 14, 10);

    // Flap chevron lines meeting in center
    ctx.beginPath();
    ctx.moveTo(-7, -5);
    ctx.lineTo(0, 0);
    ctx.lineTo(7, -5);
    ctx.stroke();

    // Red wax seal or speech-act dot in middle
    ctx.fillStyle = env.needsHuman ? '#dc2626' : '#000000';
    ctx.fillRect(-1, -1, 2, 2);
  } else {
    // Arrival sparkle burst ring
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, env.burstRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Sparkle star particles
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + env.burstElapsed * 4;
      const spx = Math.cos(ang) * (env.burstRadius * 0.85);
      const spy = Math.sin(ang) * (env.burstRadius * 0.85);
      ctx.fillRect(spx - 1, spy - 1, 2, 2);
    }
  }

  ctx.restore();
}

/**
 * Potted Office Plants (Ficus, Fern, Palm, Monstera)
 */
export function drawOfficePlant(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  type: 'ficus' | 'fern' | 'potted_palm' | 'monstera' = 'ficus',
  ambientPhase = 0,
  isWatered = false
) {
  const ts = 24;
  const px = tileX * ts;
  const py = tileY * ts;

  const bounce = isWatered ? Math.sin(ambientPhase * 6) * 1.5 : Math.sin(ambientPhase * 1.2) * 0.5;

  ctx.save();
  // Plant pot shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(px + 4, py + 18, 16, 4);

  // Terracotta Pot Base
  ctx.fillStyle = '#b45309';
  ctx.fillRect(px + 5, py + 11, 14, 9);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 5, py + 11, 14, 9);

  // Pot Rim (flange)
  ctx.fillStyle = '#d97706';
  ctx.fillRect(px + 4, py + 9, 16, 3);
  ctx.strokeRect(px + 4, py + 9, 16, 3);

  // Soil
  ctx.fillStyle = '#451a03';
  ctx.fillRect(px + 6, py + 9, 12, 2);

  if (type === 'ficus') {
    // Branching stalks
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 12, py + 9);
    ctx.lineTo(px + 12, py - 4 + bounce);
    ctx.moveTo(px + 12, py + 5);
    ctx.lineTo(px + 7, py - 1 + bounce);
    ctx.moveTo(px + 12, py + 4);
    ctx.lineTo(px + 17, py - 1 + bounce);
    ctx.stroke();

    const leaves: [number, number, string][] = [
      [px + 12, py - 6 + bounce, '#22c55e'],
      [px + 9, py - 3 + bounce, '#16a34a'],
      [px + 15, py - 3 + bounce, '#15803d'],
      [px + 6, py + 1 + bounce, '#22c55e'],
      [px + 18, py + 1 + bounce, '#16a34a'],
      [px + 12, py - 1 + bounce, '#4ade80'],
    ];
    leaves.forEach(([lx, ly, col]) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });
  } else if (type === 'fern') {
    // Spreading fronds
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) {
      const archX = px + 12 + i * 5;
      const archY = py + 2 - Math.abs(i) * 2 + bounce;
      ctx.beginPath();
      ctx.moveTo(px + 12, py + 9);
      ctx.quadraticCurveTo(px + 12 + i * 2, py + 3 + bounce, archX, archY);
      ctx.stroke();

      ctx.fillStyle = i % 2 === 0 ? '#4ade80' : '#22c55e';
      ctx.fillRect(archX - 2, archY - 1, 4, 2);
    }
  } else if (type === 'monstera') {
    const monsterLeaves: [number, number, string][] = [
      [px + 8, py + 1 + bounce, '#166534'],
      [px + 16, py + 1 + bounce, '#15803d'],
      [px + 12, py - 5 + bounce, '#22c55e'],
    ];
    monsterLeaves.forEach(([lx, ly, col]) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#052e16';
      ctx.fillRect(lx - 2, ly, 1.5, 2);
      ctx.fillRect(lx + 1, ly, 1.5, 2);
    });
  } else {
    // Potted palm
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 1.5;
    for (let a = -2; a <= 2; a++) {
      ctx.beginPath();
      ctx.moveTo(px + 12, py + 9);
      ctx.lineTo(px + 12 + a * 6, py - 5 + bounce);
      ctx.stroke();
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(px + 10 + a * 6, py - 6 + bounce, 4, 2);
    }
  }

  // Dew drops if watered
  if (isWatered) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(px + 8, py - 2 + bounce, 2, 2);
    ctx.fillRect(px + 14, py - 4 + bounce, 2, 2);
    ctx.fillRect(px + 11, py + 3 + bounce, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 9, py - 2 + bounce, 1, 1);
  }

  ctx.restore();
}

/**
 * Cigarette / Cigar smoking on break (Munder Difflin boss cigar & worker cigarette)
 */
export function drawCigaretteSmoking(
  ctx: CanvasRenderingContext2D,
  charX: number,
  charY: number,
  facing: 'up' | 'down' | 'left' | 'right',
  smokePhase: number
) {
  ctx.save();
  const dirX = facing === 'left' ? -1 : 1;
  const handX = charX + (facing === 'left' ? 3 : 15);
  const handY = charY + 16;
  const tipX = handX + dirX * 5;

  // 1. Cigar / Cigarette body
  ctx.fillStyle = '#6b4a33'; // tobacco brown
  ctx.fillRect(Math.min(handX, tipX), handY - 1, 5, 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(Math.min(handX, tipX), handY - 1, 5, 2);

  // 2. Gold cigar band
  ctx.fillStyle = '#d9a04a';
  ctx.fillRect(handX + (dirX >= 0 ? 1 : -3), handY - 1, 1.5, 2);

  // 3. Pulsing glowing ember at tip
  const emberPulse = 0.5 + 0.5 * Math.sin(smokePhase * 7);
  ctx.fillStyle = `rgba(255, 122, 60, ${0.65 + 0.35 * emberPulse})`;
  ctx.fillRect(tipX - (dirX < 0 ? 1 : 0), handY - 1, 2, 2);
  // White-hot core
  ctx.fillStyle = '#ffedd5';
  ctx.fillRect(tipX, handY - 0.5, 1, 1);

  // 4. Staggered smoke puffs rising and drifting into the air
  for (let i = 0; i < 4; i++) {
    const ph = ((smokePhase * 0.45 + i / 4) % 1);
    const driftX = tipX + Math.sin((smokePhase + i * 2) * 1.6) * 3 + ph * 4 * dirX;
    const driftY = handY - 4 - ph * 16;
    const radius = 1.2 + ph * 2.8;
    const alpha = (1 - ph) * 0.45;

    ctx.fillStyle = `rgba(215, 210, 225, ${alpha})`;
    ctx.beginPath();
    ctx.arc(driftX, driftY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Plant Watering Can and Animated Water Droplet Stream
 */
export function drawWateringCanAndStream(
  ctx: CanvasRenderingContext2D,
  charX: number,
  charY: number,
  targetTileX: number,
  targetTileY: number,
  waterPhase: number,
  facing: 'up' | 'down' | 'left' | 'right' = 'up'
) {
  const ts = 24;
  const potTargetX = targetTileX * ts + 12;
  const potTargetY = targetTileY * ts + 12;

  ctx.save();
  const dirX = facing === 'left' ? -1 : 1;
  const handX = charX + (facing === 'left' ? 2 : 14);
  const handY = charY + 15;

  // Watering Can Body
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(handX - 2, handY - 2, 6, 5);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(handX - 2, handY - 2, 6, 5);

  // Handle
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(handX - (dirX > 0 ? 4 : -5), handY - 3, 3, 5);

  // Spout angled forward toward plant
  const spoutTipX = handX + dirX * 6;
  const spoutTipY = handY - 3;
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(handX + dirX * 3, handY);
  ctx.lineTo(spoutTipX, spoutTipY);
  ctx.lineTo(spoutTipX + dirX * 2, spoutTipY - 1);
  ctx.lineTo(handX + dirX * 3, handY - 2);
  ctx.closePath();
  ctx.fill();

  // Parabolic stream of glistening water droplets
  for (let i = 0; i < 5; i++) {
    const p = ((waterPhase * 2.2 + i * 0.2) % 1);
    const dropX = spoutTipX + (potTargetX - spoutTipX) * p;
    // Parabolic arc lifting then dropping into pot
    const arcHeight = -Math.sin(p * Math.PI) * 8;
    const dropY = spoutTipY + (potTargetY - spoutTipY) * p + arcHeight;

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(Math.round(dropX), Math.round(dropY), 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(dropX), Math.round(dropY), 1, 1);
  }

  // Small splash ripple at target pot
  const splashRadius = (waterPhase * 4) % 4;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(potTargetX, potTargetY, splashRadius + 1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Steaming Coffee Mug carried in hand
 */
export function drawCarriedCoffeeMug(
  ctx: CanvasRenderingContext2D,
  charX: number,
  charY: number,
  facing: 'up' | 'down' | 'left' | 'right',
  steamPhase: number
) {
  ctx.save();
  const dirX = facing === 'left' ? -1 : 1;
  const handX = charX + (facing === 'left' ? 3 : 15);
  const handY = charY + 16;

  // Ceramic Mug Body
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(handX - 1, handY - 1, 4, 4);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(handX - 1, handY - 1, 4, 4);

  // Dark roast coffee surface
  ctx.fillStyle = '#451a03';
  ctx.fillRect(handX, handY - 1, 2, 1);

  // Blue Dunder Mifflin strip on mug
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(handX, handY + 1, 2, 1);

  // Handle
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(handX + (dirX >= 0 ? 3 : -2), handY, 1, 2);

  // Wavy steam trails rising
  for (let i = 0; i < 2; i++) {
    const ph = ((steamPhase * 0.7 + i * 0.5) % 1);
    const steamX = handX + 1 + Math.sin(steamPhase * 3 + i * 2) * 2;
    const steamY = handY - 3 - ph * 8;
    ctx.fillStyle = `rgba(255, 255, 255, ${(1 - ph) * 0.6})`;
    ctx.fillRect(Math.round(steamX), Math.round(steamY), 1.5, 1.5);
  }

  ctx.restore();
}


