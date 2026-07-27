/**
 * board.ts — Single source of truth for Apna Ludo board layout.
 *
 * Every system in the project reads from this file.
 * No duplicated board information exists elsewhere.
 *
 * Board: 15×15 grid. Cell index = row * 15 + col.
 * Path: 52 cells, clockwise loop.
 * Movement: nextIndex = (currentPathIndex + dice) mod 52.
 */

// ─── Types ───────────────────────────────────────────────────
export type PlayerColor = "red" | "green" | "yellow" | "blue";
export const PLAYER_COLORS: [PlayerColor, ...PlayerColor[]] = [
  "red", "green", "yellow", "blue",
];

/**
 * Every cell on the board has exactly one type.
 */
export type CellType =
  | "empty"        // interior of home corner, not playable
  | "track"        // outer track cell (pathIndex 0–51)
  | "safe"         // safe square (cannot be captured on)
  | "star"         // star marker (also safe; triggers star jump)
  | "start"        // player start square (also safe; first track cell after spawn)
  | "home_entry"   // last track cell before entering home lane
  | "home_lane"    // colored lane leading to center (5 cells per player)
  | "home"         // interior of home corner (colored zone, not track)
  | "center"       // finish cell (row 7, col 7)
  | "yard";        // token starting area (2×2 per player inside home corner)

// ─── Grid ─────────────────────────────────────────────────────
export const GRID_SIZE = 15;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE; // 225
export const CENTER_CELL = 112; // row 7, col 7

// ─── Progress constants ──────────────────────────────────────
export const TOKENS_PER_PLAYER = 4;
export const HOME_START = 51;      // progress 51 = first home lane cell
export const FINISH_PROGRESS = 56; // progress 56 = reached the center (home)
export const STAR_JUMP = 5;        // star teleport distance

// ─── Path generation (clockwise, 52 cells) ──────────────────
// Generated from (row, col) pairs. No manual coordinate arrays.
// Each side of the square has 13 cells. 4 sides × 13 = 52.
//
// Left column (bottom→top): rows 6 to 0, col 0
// Top row (left→right): cols 1 to 14, row 0
// Right column (top→bottom): rows 1 to 14, col 14
// Bottom row (right→left): cols 13 to 0, row 14
// Left column return (bottom→up): rows 13 to 11, col 0

function rc(row: number, col: number): [number, number] {
  return [row, col];
}

const _PATH_RC: [number, number][] = [
  // ── 0-4: Bottom arm left col (up) ──
  rc(13,6), rc(12,6), rc(11,6), rc(10,6), rc(9,6),
  // ── 5-10: Left arm bottom row (left) ──
  rc(8,5), rc(8,4), rc(8,3), rc(8,2), rc(8,1), rc(8,0),
  // ── 11: Left arm outer turn (up) ──
  rc(7,0),
  // ── 12-17: Left arm top row (right) ──
  rc(6,0), rc(6,1), rc(6,2), rc(6,3), rc(6,4), rc(6,5),
  // ── 18-23: Top arm left col (up) ──
  rc(5,6), rc(4,6), rc(3,6), rc(2,6), rc(1,6), rc(0,6),
  // ── 24: Top arm outer turn (right) ──
  rc(0,7),
  // ── 25-30: Top arm right col (down) ──
  rc(0,8), rc(1,8), rc(2,8), rc(3,8), rc(4,8), rc(5,8),
  // ── 31-36: Right arm top row (right) ──
  rc(6,9), rc(6,10), rc(6,11), rc(6,12), rc(6,13), rc(6,14),
  // ── 37: Right arm outer turn (down) ──
  rc(7,14),
  // ── 38-43: Right arm bottom row (left) ──
  rc(8,14), rc(8,13), rc(8,12), rc(8,11), rc(8,10), rc(8,9),
  // ── 44-49: Bottom arm right col (down) ──
  rc(9,8), rc(10,8), rc(11,8), rc(12,8), rc(13,8), rc(14,8),
  // ── 50: Bottom arm outer turn (left) ──
  rc(14,7),
  // ── 51: Bottom arm left col start (up) ──
  rc(14,6)
];

export const TRACK_LENGTH: number = _PATH_RC.length; // must be 52
export const PATH: readonly number[] = _PATH_RC.map(([r, c]) => r * GRID_SIZE + c);
export const PATH_CELLS: ReadonlySet<number> = new Set(PATH);

if (TRACK_LENGTH !== 52) throw new Error(`Board path must have 52 cells, got ${TRACK_LENGTH}`);
if (new Set(PATH).size !== 52) throw new Error("Board path has duplicate cells");

// ─── Start offsets ───────────────────────────────────────────
// Each color's pathIndex where progress 0 maps to.
export const START_OFFSETS: Record<PlayerColor, number> = {
  red: 0,    // pathIndex 0 → cell (13,6)
  green: 13, // pathIndex 13 → cell (6,1)
  yellow: 26,// pathIndex 26 → cell (1,8)
  blue: 39,  // pathIndex 39 → cell (8,13)
};

// ─── Safe squares ────────────────────────────────────────────
// Exactly 8: 4 start + 4 star. No more, no less.
export const START_SQUARES = [0, 13, 26, 39] as const;
export const START_SQUARE_SET: ReadonlySet<number> = new Set(START_SQUARES);

// Stars: 1 per side at fixed positions matching the board image.
export const STAR_SQUARES = [8, 21, 34, 47] as const;
export const STAR_SQUARE_SET: ReadonlySet<number> = new Set(STAR_SQUARES);

export const SAFE_SQUARES = [...START_SQUARES, ...STAR_SQUARES] as const;
export const SAFE_SQUARE_SET: ReadonlySet<number> = new Set(SAFE_SQUARES);

// Visual cell indices for board markers
export const STAR_CELLS: readonly number[] = STAR_SQUARES.map(pi => PATH[pi]!);
export const START_CELLS: readonly number[] = START_SQUARES.map(pi => PATH[pi]!);
export const SAFE_CELLS: readonly number[] = [...START_CELLS, ...STAR_CELLS];

// ─── Home lanes (5 cells each, progress 52–56) ──────────────
const _LANE_RC: Record<PlayerColor, [number, number][]> = {
  red:    [rc(13,7), rc(12,7), rc(11,7), rc(10,7), rc(9,7)],
  green:  [rc(7,1),  rc(7,2),  rc(7,3),  rc(7,4),  rc(7,5)],
  yellow: [rc(1,7),  rc(2,7),  rc(3,7),  rc(4,7),  rc(5,7)],
  blue:   [rc(7,13), rc(7,12), rc(7,11), rc(7,10), rc(7,9)],
};

export const HOME_LANES: Record<PlayerColor, readonly number[]> = {
  red:    _LANE_RC.red.map(([r,c]) => r*GRID_SIZE+c),
  green:  _LANE_RC.green.map(([r,c]) => r*GRID_SIZE+c),
  yellow: _LANE_RC.yellow.map(([r,c]) => r*GRID_SIZE+c),
  blue:   _LANE_RC.blue.map(([r,c]) => r*GRID_SIZE+c),
};

export const HOME_LANE_CELLS: ReadonlySet<number> = new Set(
  Object.values(HOME_LANES).flat(),
);

// ─── Yard positions (4 cells per player, 2×2) ───────────────
const _YARD_RC: Record<PlayerColor, [number, number][]> = {
  red:    [rc(10,1), rc(10,3), rc(12,1), rc(12,3)],
  green:  [rc(1,1),  rc(1,3),  rc(3,1),  rc(3,3)],
  yellow: [rc(1,10), rc(1,12), rc(3,10), rc(3,12)],
  blue:   [rc(10,10), rc(10,12), rc(12,10), rc(12,12)],
};

export const YARD_POSITIONS: Record<PlayerColor, readonly number[]> = {
  red:    _YARD_RC.red.map(([r,c]) => r*GRID_SIZE+c),
  green:  _YARD_RC.green.map(([r,c]) => r*GRID_SIZE+c),
  yellow: _YARD_RC.yellow.map(([r,c]) => r*GRID_SIZE+c),
  blue:   _YARD_RC.blue.map(([r,c]) => r*GRID_SIZE+c),
};

// ─── Home entry mapping ──────────────────────────────────────
// pathIndex of the last track cell before entering home lane.
// After completing a full lap, the token enters the home lane at progress 52.
export const HOME_ENTRY: Record<PlayerColor, number> = {
  red: 51,
  green: 12,
  yellow: 25,
  blue: 38,
};

// ─── Semantic cell classification ────────────────────────────
// Every cell on the board gets exactly one CellType.

const _YARD_SET = new Set(
  Object.values(YARD_POSITIONS).flat(),
);

/** Get the semantic CellType for any cell index 0–224. */
export function getCellType(i: number): CellType {
  // Check semantic sets first (most specific)
  if (_YARD_SET.has(i)) return "yard";
  if (i === CENTER_CELL) return "center";
  if (HOME_LANE_CELLS.has(i)) return "home_lane";

  // Check path classification
  const pathIndex = PATH.indexOf(i);
  if (pathIndex !== -1) {
    if (START_SQUARE_SET.has(pathIndex)) return "start";
    if (STAR_SQUARE_SET.has(pathIndex)) return "star";
    return "track";
  }

  // Not on path, not a special cell — classify by grid position
  const r = Math.floor(i / GRID_SIZE);
  const c = i % GRID_SIZE;

  if (r < 6 && c < 6) return "home";
  if (r < 6 && c > 8) return "home";
  if (r > 8 && c < 6) return "home";
  if (r > 8 && c > 8) return "home";
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return "center";

  return "empty";
}

/** CSS class name for visual rendering. Maps CellType to CSS class. */
export function cellType(i: number): string {
  const ct = getCellType(i);

  switch (ct) {
    case "yard":      return "yard";
    case "center":    return "finish";
    case "start":     return "lane";
    case "star":      return "lane";
    case "track":     return "track";
    case "home_lane": {
      const r = Math.floor(i / GRID_SIZE);
      const c = i % GRID_SIZE;
      if (c === 7 && r >= 9) return "lane-red";
      if (r === 7 && c <= 4) return "lane-green";
      if (c === 7 && r <= 5) return "lane-yellow";
      if (r === 7 && c >= 9) return "lane-blue";
      return "lane";
    }
    case "home": {
      const r = Math.floor(i / GRID_SIZE);
      const c = i % GRID_SIZE;
      if (r < 6 && c < 6) return "home green";
      if (r < 6 && c > 8) return "home yellow";
      if (r > 8 && c < 6) return "home red";
      if (r > 8 && c > 8) return "home blue";
      return "home";
    }
    default: {
      const r = Math.floor(i / GRID_SIZE);
      const c = i % GRID_SIZE;
      if (r === 7 && c < 6) return "lane";
      if (r === 7 && c > 8) return "lane";
      if (c === 7 && r < 6) return "lane";
      if (c === 7 && r > 8) return "lane";
      return "track";
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────
/** progress → grid cell index. Returns null for yard. */
export function progressToCellIndex(color: PlayerColor, progress: number): number | null {
  if (progress === -1) return null;
  if (progress >= HOME_START && progress < FINISH_PROGRESS)
    return HOME_LANES[color]![progress - HOME_START]!;
  if (progress === FINISH_PROGRESS) return CENTER_CELL;
  const pi = (START_OFFSETS[color] + progress) % TRACK_LENGTH;
  return PATH[pi]!;
}

/** progress → path index. Returns null for yard/home. */
export function progressToPathIndex(color: PlayerColor, progress: number): number | null {
  if (progress < 0 || progress >= HOME_START) return null;
  return (START_OFFSETS[color] + progress) % TRACK_LENGTH;
}

/** path index → grid cell index. */
export function pathIndexToCell(pathIndex: number): number {
  return PATH[pathIndex]!;
}

/** Get all cell info for debug overlay. */
export function getCellInfo(i: number) {
  const r = Math.floor(i / GRID_SIZE);
  const c = i % GRID_SIZE;
  const pathIndex = PATH.indexOf(i);
  return {
    cellIndex: i,
    row: r,
    col: c,
    cellType: getCellType(i),
    pathIndex,
    isSafe: pathIndex >= 0 && SAFE_SQUARE_SET.has(pathIndex),
    isStart: pathIndex >= 0 && START_SQUARE_SET.has(pathIndex),
    isStar: pathIndex >= 0 && STAR_SQUARE_SET.has(pathIndex),
  };
}
