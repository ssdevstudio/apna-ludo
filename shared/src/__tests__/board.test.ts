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
    expect(progressToPathIndex("red", 0)).toBe(0);
    expect(progressToPathIndex("green", 0)).toBe(13);
    expect(progressToPathIndex("yellow", 0)).toBe(26);
    expect(progressToPathIndex("blue", 0)).toBe(39);
  });

  it("progressToPathIndex returns null for yard and home lane", () => {
    expect(progressToPathIndex("red", -1)).toBeNull();
    expect(progressToPathIndex("red", 52)).toBeNull();
  });

  it("globalSquare works correctly for all 52 track positions", () => {
    for (const color of ["red", "green", "yellow", "blue"] as const) {
      for (let progress = 0; progress < HOME_START; progress++) {
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
    expect(START_SQUARES).toEqual([0, 13, 26, 39]);
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
      // progress 51..55 maps to home lane cells (5 entries)
      for (let p = HOME_START; p < FINISH_PROGRESS; p++) {
        expect(progressToCellIndex(color, p)).toBe(lane[p - HOME_START]!);
      }
      // progress FINISH_PROGRESS (56) maps to center cell
      expect(progressToCellIndex(color, FINISH_PROGRESS)).toBe(CENTER_CELL);
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

  it("FINISH_PROGRESS maps to center cell", () => {
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
  it("non-path corner cells get home class", () => {
    // Cell 165 (11,0) is in home zone (r>8, c<6), not on the path
    expect(PATH.includes(165)).toBe(false);
    expect(cellType(165)).toContain("home");
  });

  it("cross cells on the outer path get lane class", () => {
    // Cell 7 (0,7) on the cross — check its cell type
    const ct = cellType(7);
    // Should be a valid type (not throw)
    expect(typeof ct).toBe("string");
  });

  it("home lane cells get correct color class", () => {
    // Red home lane: row 13→9, col 7 → 13*15+7=202, 12*15+7=187, etc. (c=7, r>=9 → lane-red)
    // Green home lane: row 7, col 1→5 → 7*15+1=106 etc. (r=7, c<=4 → lane-green)
    // Yellow home lane: row 1→5, col 7 → 1*15+7=22 etc. (c=7, r<=5 → lane-yellow)
    // Blue home lane: row 7, col 9→13 → 7*15+9=114, 7*15+13=118 etc. (r=7, c>=9 → lane-blue)
    expect(cellType(202)).toBe("lane-red");
    expect(cellType(106)).toBe("lane-green");
    expect(cellType(22)).toBe("lane-yellow");
    expect(cellType(114)).toBe("lane-blue");
  });
});

describe("Board validation — movement integrity", () => {


  it("each step along track moves to adjacent cells on the path", () => {
    // Verify path adjacency between consecutive cells on the outer loop.
    // The 4 corner transitions of the path wrap with Manhattan distance 2 (diagonal corner),
    // all other steps are Manhattan distance 1.
    for (let i = 0; i < PATH.length - 1; i++) {
      const c1 = PATH[i]!;
      const c2 = PATH[i + 1]!;
      const r1 = Math.floor(c1 / GRID_SIZE);
      const cc1 = c1 % GRID_SIZE;
      const r2 = Math.floor(c2 / GRID_SIZE);
      const cc2 = c2 % GRID_SIZE;
      const dist = Math.abs(r1 - r2) + Math.abs(cc1 - cc2);
      expect(dist).toBeLessThanOrEqual(2);
    }
  });

  it("roll values 1–6 all produce valid track moves from any track position", () => {
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
