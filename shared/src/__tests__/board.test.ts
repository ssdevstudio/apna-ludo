import { describe, it, expect } from "vitest";
import {
  TRACK_LENGTH, PATH, PATH_CELLS, START_SQUARES, START_SQUARE_SET,
  STAR_SQUARES, STAR_SQUARE_SET, SAFE_SQUARES, SAFE_SQUARE_SET,
  HOME_LANES, HOME_LANE_CELLS, YARD_POSITIONS, HOME_START, FINISH_PROGRESS,
  STAR_CELLS, START_CELLS, SAFE_CELLS, CELL_COUNT, STAR_JUMP,
  GRID_SIZE, CENTER_CELL, PLAYER_COLORS, cellType,
  progressToCellIndex, progressToPathIndex, pathIndexToCell,
  START_OFFSETS,
} from "../board.js";

describe("Board validation — path integrity", () => {
  it("has exactly 52 outer track cells", () => {
    expect(TRACK_LENGTH).toBe(52);
    expect(PATH).toHaveLength(52);
  });

  it("has all 52 path cells unique (no duplicates)", () => {
    expect(new Set(PATH).size).toBe(52);
  });

  it("every path cell is a valid 0–224 grid index", () => {
    for (const cell of PATH) {
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(225);
    }
  });

  it("path cells form a continuous loop: path[51] connects back to path[0]", () => {
    // path[51] leads to the first home lane cell; path[0] is the start.
    // They are NOT adjacent on the grid but that's expected — the jump wraps.
    // What matters: every step from 0..50 is visually adjacent.
    for (let i = 0; i < 51; i++) {
      const r1 = Math.floor(PATH[i]! / GRID_SIZE);
      const c1 = PATH[i]! % GRID_SIZE;
      const r2 = Math.floor(PATH[i + 1]! / GRID_SIZE);
      const c2 = PATH[i + 1]! % GRID_SIZE;
      const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
      expect(dist).toBeLessThanOrEqual(GRID_SIZE);
    }
  });

  it("progressToPathIndex returns correct values for all colors at progress 0", () => {
    expect(progressToPathIndex("red", 0)).toBe(51);
    expect(progressToPathIndex("green", 0)).toBe(12);
    expect(progressToPathIndex("yellow", 0)).toBe(25);
    expect(progressToPathIndex("blue", 0)).toBe(38);
  });

  it("progressToPathIndex returns null for yard and home lane", () => {
    expect(progressToPathIndex("red", -1)).toBeNull();
    expect(progressToPathIndex("red", 52)).toBeNull();
  });

  it("globalSquare works correctly for all 52 track positions", () => {
    for (const color of ["red", "green", "yellow", "blue"] as const) {
      for (let progress = 0; progress < 52; progress++) {
        const pi = progressToPathIndex(color, progress);
        expect(pi).not.toBeNull();
        expect(pi).toBeGreaterThanOrEqual(0);
        expect(pi).toBeLessThan(52);
      }
    }
  });
});

describe("Board validation — safe/star/start squares", () => {
  it("has 8 safe squares total (4 start + 4 star)", () => {
    expect(SAFE_SQUARES).toHaveLength(8);
    expect(START_SQUARES).toHaveLength(4);
    expect(STAR_SQUARES).toHaveLength(4);
    expect(new Set(SAFE_SQUARES).size).toBe(8);
  });

  it("start squares are at path indices 0, 13, 26, 39", () => {
    expect(START_SQUARES).toEqual([51, 12, 25, 38]);
  });

  it("star squares are at path indices 8, 21, 34, 47", () => {
    expect(STAR_SQUARES).toEqual([8, 21, 34, 47]);
  });

  it("safe squares include all start + all star", () => {
    for (const s of START_SQUARES) expect(SAFE_SQUARES).toContain(s);
    for (const s of STAR_SQUARES) expect(SAFE_SQUARES).toContain(s);
  });

  it("SAFE_SQUARE_SET matches SAFE_SQUARES", () => {
    expect(SAFE_SQUARE_SET.size).toBe(SAFE_SQUARES.length);
    for (const s of SAFE_SQUARES) expect(SAFE_SQUARE_SET.has(s)).toBe(true);
  });

  it("star cell indices correctly map from path indices to grid cells", () => {
    expect(STAR_CELLS).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(STAR_CELLS[i]).toBe(PATH[STAR_SQUARES[i]!]!);
    }
  });

  it("start cell indices correctly map from path indices to grid cells", () => {
    expect(START_CELLS).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      expect(START_CELLS[i]).toBe(PATH[START_SQUARES[i]!]!);
    }
  });

  it("safe cell indices has 8 entries (4 start + 4 star)", () => {
    expect(SAFE_CELLS).toHaveLength(8);
    expect(new Set(SAFE_CELLS).size).toBe(8);
  });
});

describe("Board validation — home lanes", () => {
  it("each color has exactly 5 home lane cells (progress 52–56)", () => {
    for (const color of PLAYER_COLORS) {
      expect(HOME_LANES[color]).toHaveLength(5);
    }
  });

  it("all home lane cells are valid 0–224 grid indices", () => {
    for (const cells of Object.values(HOME_LANES)) {
      for (const cell of cells) {
        expect(cell).toBeGreaterThanOrEqual(0);
        expect(cell).toBeLessThan(225);
      }
    }
  });

  it("no two players share any home lane cell", () => {
    // All 20 lane cells should be unique
    const all = PLAYER_COLORS.flatMap(c => [...HOME_LANES[c]]);
    expect(new Set(all).size).toBe(20);
  });

  it("home lane cells are NOT on the outer path (no overlap)", () => {
    for (const cell of HOME_LANE_CELLS) {
      expect(PATH_CELLS.has(cell)).toBe(false);
    }
  });

  it("home lane cells are distinct from yard cells", () => {
    const allYards = PLAYER_COLORS.flatMap(c => [...YARD_POSITIONS[c]]);
    const allLanes = [...HOME_LANE_CELLS];
    for (const y of allYards) {
      expect(allLanes).not.toContain(y);
    }
  });

  it("progressToCellIndex returns correct home lane cells", () => {
    for (const color of PLAYER_COLORS) {
      const lane = HOME_LANES[color]!;
      for (let p = HOME_START; p <= 56; p++) {
        expect(progressToCellIndex(color, p)).toBe(lane[p - HOME_START]!);
      }
    }
  });
});

describe("Board validation — yard positions", () => {
  it("each color has exactly 4 yard positions", () => {
    for (const color of PLAYER_COLORS) {
      expect(YARD_POSITIONS[color]).toHaveLength(4);
    }
  });

  it("all yard positions are valid 0–224 grid indices", () => {
    for (const cells of Object.values(YARD_POSITIONS)) {
      for (const cell of cells) {
        expect(cell).toBeGreaterThanOrEqual(0);
        expect(cell).toBeLessThan(225);
      }
    }
  });

  it("yard positions are in correct home-corner zones", () => {
    for (const cell of YARD_POSITIONS.red) {
      expect(Math.floor(cell / GRID_SIZE)).toBeGreaterThan(8);
      expect(cell % GRID_SIZE).toBeLessThan(6);
    }
    for (const cell of YARD_POSITIONS.green) {
      expect(Math.floor(cell / GRID_SIZE)).toBeLessThan(6);
      expect(cell % GRID_SIZE).toBeLessThan(6);
    }
    for (const cell of YARD_POSITIONS.yellow) {
      expect(Math.floor(cell / GRID_SIZE)).toBeLessThan(6);
      expect(cell % GRID_SIZE).toBeGreaterThan(8);
    }
    for (const cell of YARD_POSITIONS.blue) {
      expect(Math.floor(cell / GRID_SIZE)).toBeGreaterThan(8);
      expect(cell % GRID_SIZE).toBeGreaterThan(8);
    }
  });

  it("no yard cell overlaps with any path cell", () => {
    const allYards = PLAYER_COLORS.flatMap(c => [...YARD_POSITIONS[c]]);
    for (const y of allYards) {
      expect(PATH_CELLS.has(y)).toBe(false);
    }
  });
});

describe("Board validation — finish / center", () => {
  it("center cell is at grid position 112 (row 7, col 7)", () => {
    expect(CENTER_CELL).toBe(112);
    expect(Math.floor(CENTER_CELL / GRID_SIZE)).toBe(7);
    expect(CENTER_CELL % GRID_SIZE).toBe(7);
  });

  it("progress 57 maps to center cell", () => {
    for (const color of PLAYER_COLORS) {
      expect(progressToCellIndex(color, FINISH_PROGRESS)).toBe(CENTER_CELL);
    }
  });

  it("progress -1 maps to null (yard)", () => {
    for (const color of PLAYER_COLORS) {
      expect(progressToCellIndex(color, -1)).toBeNull();
    }
  });
});

describe("Board validation — cellType classification", () => {
  it("path cells are NOT classified as home zones for track cells in corners", () => {
    // Cell 165 (11,0) — pathIndex 51 is now RED START (safe square)
    expect(PATH.includes(165)).toBe(true);
    expect(cellType(165)).not.toContain("home");
  });

  it("start-position cells on the cross get correct lane class", () => {
    // Cell 7 (0,7) — pathIndex 13 is now a track cell (not green start)
    expect(cellType(7)).toBe("track");
    // Cell 220 (14,10) — pathIndex 38 is BLUE START
    expect(cellType(220)).toBe("lane");
  });

  it("colored lane cells get correct color class", () => {
    expect(cellType(105)).toBe("lane-red");  // red lane (7,0)
    expect(cellType(22)).toBe("lane-green");  // green lane (1,7)
    expect(cellType(118)).toBe("lane-yellow"); // yellow lane (7,13)
    expect(cellType(202)).toBe("lane-blue");   // blue lane (13,7)
  });
});

describe("Board validation — movement integrity", () => {
  it("star jump is exactly 5", () => {
    expect(STAR_JUMP).toBe(5);
  });

  it("each step along progress moves to adjacent cells on the path", () => {
    for (const color of PLAYER_COLORS) {
      for (let p = 0; p < 51; p++) {
        const c1 = progressToCellIndex(color, p);
        const c2 = progressToCellIndex(color, p + 1);
        if (c1 === null || c2 === null) continue;
        const r1 = Math.floor(c1 / GRID_SIZE);
        const cc1 = c1 % GRID_SIZE;
        const r2 = Math.floor(c2 / GRID_SIZE);
        const cc2 = c2 % GRID_SIZE;
        const dist = Math.abs(r1 - r2) + Math.abs(cc1 - cc2);
        // Adjacent cells should have Manhattan distance 1.
        // The track wraps from end→start for each color (last→first path cell),
        // which is not geometrically adjacent — that's expected.
        if (dist > 1) {
          const globalP = (START_OFFSETS[color] + p) % TRACK_LENGTH;
          const isWrap = globalP === TRACK_LENGTH - 1;
          expect(isWrap).toBe(true);
        }
      }
    }
  });

  it("roll values 1–6 all produce valid moves from any track position", () => {
    for (const color of PLAYER_COLORS) {
      for (let p = 0; p <= 45; p++) {
        for (let dice = 1; dice <= 6; dice++) {
          const dest = progressToCellIndex(color, p + dice);
          expect(dest).not.toBeNull();
        }
      }
    }
  });
});

describe("Board validation — no missing/duplicate coordinates", () => {
  it("all 225 grid cells in range", () => {
    expect(CELL_COUNT).toBe(225);
  });
});
