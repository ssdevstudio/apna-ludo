import { describe, it, expect } from "vitest";
import {
  SNAKES,
  LADDERS,
  SNAKE_BOARD_SIZE,
  getTileCoordinates,
  canMoveTokenSnake,
  calculateSnakeMove,
} from "../snake.js";
import { createGame, applyRoll, applyMove } from "../game.js";

describe("Snakes and Ladders - Board & Coordinates", () => {
  it("defines 100 board tiles", () => {
    expect(SNAKE_BOARD_SIZE).toBe(100);
  });

  it("has classic ladders where target is always higher than source", () => {
    for (const [fromStr, to] of Object.entries(LADDERS)) {
      const from = Number(fromStr);
      expect(to).toBeGreaterThan(from);
      expect(from).toBeGreaterThanOrEqual(1);
      expect(to).toBeLessThanOrEqual(100);
    }
  });

  it("has classic snakes where target is always lower than source", () => {
    for (const [headStr, tail] of Object.entries(SNAKES)) {
      const head = Number(headStr);
      expect(tail).toBeLessThan(head);
      expect(head).toBeLessThanOrEqual(100);
      expect(tail).toBeGreaterThanOrEqual(1);
    }
  });

  it("no tile has both a snake head and a ladder bottom", () => {
    for (const head of Object.keys(SNAKES)) {
      expect(LADDERS[Number(head)]).toBeUndefined();
    }
  });

  it("tile 100 does not have a snake or ladder", () => {
    expect(SNAKES[100]).toBeUndefined();
    expect(LADDERS[100]).toBeUndefined();
  });

  it("correctly maps 10x10 boustrophedon zigzag coordinates", () => {
    // Tile 1: bottom-left (row 9, col 0)
    const t1 = getTileCoordinates(1);
    expect(t1.row).toBe(9);
    expect(t1.col).toBe(0);

    // Tile 10: bottom-right (row 9, col 9)
    const t10 = getTileCoordinates(10);
    expect(t10.row).toBe(9);
    expect(t10.col).toBe(9);

    // Tile 11: row above bottom, right-to-left start (row 8, col 9)
    const t11 = getTileCoordinates(11);
    expect(t11.row).toBe(8);
    expect(t11.col).toBe(9);

    // Tile 20: row above bottom, end on left (row 8, col 0)
    const t20 = getTileCoordinates(20);
    expect(t20.row).toBe(8);
    expect(t20.col).toBe(0);

    // Tile 91: top row, right side (row 0, col 9)
    const t91 = getTileCoordinates(91);
    expect(t91.row).toBe(0);
    expect(t91.col).toBe(9);

    // Tile 100: top-left winning square (row 0, col 0)
    const t100 = getTileCoordinates(100);
    expect(t100.row).toBe(0);
    expect(t100.col).toBe(0);
  });

  it("all 100 tiles map to 100 distinct (row, col) grid cells", () => {
    const visited = new Set<string>();
    for (let t = 1; t <= 100; t++) {
      const { row, col } = getTileCoordinates(t);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(10);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(10);
      visited.add(`${row},${col}`);
    }
    expect(visited.size).toBe(100);
  });
});

describe("Snakes and Ladders - Movement Rules", () => {
  it("allows moving when progress + dice <= 100", () => {
    expect(canMoveTokenSnake(0, 4)).toBe(true);
    expect(canMoveTokenSnake(94, 6)).toBe(true);
    expect(canMoveTokenSnake(95, 5)).toBe(true);
  });

  it("disallows moves that overshoot 100", () => {
    expect(canMoveTokenSnake(95, 6)).toBe(false);
    expect(canMoveTokenSnake(98, 3)).toBe(false);
    expect(canMoveTokenSnake(99, 2)).toBe(false);
  });

  it("calculates normal step without snakes or ladders", () => {
    const move = calculateSnakeMove(10, 3);
    expect(move.intermediatePos).toBe(13);
    expect(move.target).toBe(13);
    expect(move.ladder).toBeUndefined();
    expect(move.snake).toBeUndefined();
  });

  it("climbs ladder when landing on ladder base", () => {
    // Ladder at 4 -> 14
    const move = calculateSnakeMove(0, 4);
    expect(move.intermediatePos).toBe(4);
    expect(move.target).toBe(14);
    expect(move.ladder).toEqual({ from: 4, to: 14 });
    expect(move.snake).toBeUndefined();
  });

  it("slides down when landing on snake head", () => {
    // Snake at 17 -> 7
    const move = calculateSnakeMove(13, 4);
    expect(move.intermediatePos).toBe(17);
    expect(move.target).toBe(7);
    expect(move.snake).toEqual({ from: 17, to: 7 });
    expect(move.ladder).toBeUndefined();
  });

  it("does not move if dice overshoots 100", () => {
    const move = calculateSnakeMove(97, 4);
    expect(move.intermediatePos).toBe(97);
    expect(move.target).toBe(97);
  });
});

describe("Snakes and Ladders - Game Engine Integration", () => {
  const players = [
    { id: "p1", name: "Alice", color: "red" as const },
    { id: "p2", name: "Bob", color: "blue" as const },
  ];

  it("initializes snake game with 1 token per player at progress 0", () => {
    const game = createGame(players, "snake");
    expect(game.gameType).toBe("snake");
    expect(game.players).toHaveLength(2);
    expect(game.players[0]!.tokens).toHaveLength(1);
    expect(game.players[0]!.tokens[0]!.progress).toBe(0);
    expect(game.players[1]!.tokens).toHaveLength(1);
    expect(game.players[1]!.tokens[0]!.progress).toBe(0);
  });

  it("rolls and moves token, climbing ladder", () => {
    let game = createGame(players, "snake");
    expect(game.currentPlayerId).toBe("p1");

    // Roll 4: tile 0 + 4 = 4 -> ladder to 14
    game = applyRoll(game, "p1", 4);
    expect(game.dice).toBe(4);
    expect(game.movableTokenIds).toContain("p1:0");

    game = applyMove(game, "p1", "p1:0");
    const p1 = game.players.find((p) => p.id === "p1")!;
    expect(p1.tokens[0]!.progress).toBe(14);
    expect(game.lastAction?.ladderClimbed).toEqual({ from: 4, to: 14 });

    // Since rolled 4 (not 6), turn passes to Bob
    expect(game.currentPlayerId).toBe("p2");
  });

  it("rolls 6 grants extra turn in snake mode", () => {
    let game = createGame(players, "snake");
    game = applyRoll(game, "p1", 6);
    game = applyMove(game, "p1", "p1:0");

    // Rolled 6: Alice keeps turn!
    expect(game.currentPlayerId).toBe("p1");
    expect(game.consecutiveSixes).toBe(1);
  });

  it("wins game when reaching tile 100", () => {
    let game = createGame(players, "snake");
    // Manually set Alice's progress to 97
    game.players[0]!.tokens[0]!.progress = 97;

    game = applyRoll(game, "p1", 3);
    game = applyMove(game, "p1", "p1:0");

    expect(game.players[0]!.tokens[0]!.progress).toBe(100);
    expect(game.phase).toBe("finished");
    expect(game.winners).toContain("p1");
  });
});
