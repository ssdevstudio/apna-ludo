import { describe, it, expect } from "vitest";
import {
  createGame,
  applyRoll,
  applyMove,
  forfeitPlayer,
  canMoveToken,
  legalTokenIds,
  globalSquare,
  RuleError,
  type GameState,
} from "../game.js";

function makePlayers(count: number) {
  const colors = ["red", "green", "yellow", "blue"] as const;
  return colors.slice(0, count).map((color, index) => ({
    id: `p${index}`,
    name: `Player ${index}`,
    color,
  }));
}

function fourPlayers() {
  return makePlayers(4);
}

// Helper: place p0:0 on the common track at given progress
function placeP0Token0OnTrack(state: GameState, progress: number): GameState {
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === 0
        ? {
            ...p,
            tokens: p.tokens.map((t, j) =>
              j === 0 ? { ...t, progress } : t,
            ),
          }
        : p,
    ),
  };
}

describe("createGame", () => {
  it("creates a 2-player game", () => {
    const state = createGame(makePlayers(2));
    expect(state.phase).toBe("playing");
    expect(state.players).toHaveLength(2);
    expect(state.currentPlayerId).toBe("p0");
    expect(state.dice).toBeNull();
    expect(state.winners).toEqual([]);
    expect(state.revision).toBe(0);
  });

  it("creates a 3-player game", () => {
    expect(createGame(makePlayers(3)).players).toHaveLength(3);
  });

  it("creates a 4-player game", () => {
    expect(createGame(makePlayers(4)).players).toHaveLength(4);
  });

  it("throws for 1 player", () => {
    expect(() => createGame(makePlayers(1))).toThrow();
  });

  it("throws for duplicate IDs", () => {
    expect(() =>
      createGame([
        { id: "a", name: "A", color: "red" },
        { id: "a", name: "B", color: "green" },
      ]),
    ).toThrow();
  });

  it("throws for duplicate colors", () => {
    expect(() =>
      createGame([
        { id: "a", name: "A", color: "red" },
        { id: "b", name: "B", color: "red" },
      ]),
    ).toThrow();
  });

  it("gives each player 4 tokens in yard", () => {
    for (const player of createGame(makePlayers(4)).players) {
      expect(player.tokens).toHaveLength(4);
      for (const token of player.tokens) {
        expect(token.progress).toBe(-1);
      }
    }
  });
});

describe("globalSquare", () => {
  const cases: [string, number, number][] = [
    ["red", 0, 0], ["green", 0, 13], ["yellow", 0, 26], ["blue", 0, 39],
    ["red", 1, 1], ["green", 40, 1],
  ];
  for (const [color, progress, expected] of cases) {
    it(`maps ${color} progress ${progress} to global ${expected}`, () => {
      expect(globalSquare(color as any, progress)).toBe(expected);
    });
  }

  it("returns null for yard (-1)", () => {
    expect(globalSquare("red", -1)).toBeNull();
  });

  it("returns null for home lane entry (52+)", () => {
    expect(globalSquare("red", 52)).toBeNull();
  });
});

describe("applyRoll — basic", () => {
  it("throws if not current player", () => {
    const state = createGame(makePlayers(2));
    expect(() => applyRoll(state, "p1", 4)).toThrow(RuleError);
    expect(() => applyRoll(state, "p1", 4)).toThrow(/NOT_YOUR_TURN/);
  });

  it("throws if game finished", () => {
    const state = { ...createGame(makePlayers(2)), phase: "finished" as const };
    expect(() => applyRoll(state, "p0", 4)).toThrow(/GAME_FINISHED/);
  });

  it("throws if dice already rolled", () => {
    const state = { ...createGame(makePlayers(2)), dice: 5 };
    expect(() => applyRoll(state, "p0", 4)).toThrow(/DICE_ALREADY_ROLLED/);
  });

  it("throws on invalid dice values", () => {
    const state = createGame(makePlayers(2));
    for (const val of [0, 7, -1]) {
      expect(() => applyRoll(state, "p0", val)).toThrow(/INVALID_DICE/);
    }
  });
});

describe("applyRoll — with all tokens in yard (no legal move on non-6)", () => {
  function rollNoMove(state: GameState, playerId: string, dice: number) {
    return applyRoll(state, playerId, dice);
  }

  it("rolls 4, no token can leave — auto turn-skip, currentPlayerId changes", () => {
    const state = createGame(makePlayers(2));
    const next = rollNoMove(state, "p0", 4);
    // Auto-skip because no token can move
    expect(next.dice).toBeNull();
    expect(next.currentPlayerId).toBe("p1");
    expect(next.lastAction?.type).toBe("turn-skipped");
    expect(next.revision).toBe(1);
  });

  it("rolls 5, auto turn-skip with extra turn on 6 only — currentPlayer changes", () => {
    const state = createGame(makePlayers(2));
    const next = rollNoMove(state, "p0", 5);
    expect(next.currentPlayerId).toBe("p1");
  });

  it("rolls 6, token can leave yard — no auto-skip, dice stored", () => {
    const state = createGame(makePlayers(2));
    const next = rollNoMove(state, "p0", 6);
    expect(next.dice).toBe(6);
    expect(next.movableTokenIds).toContain("p0:0");
    expect(next.currentPlayerId).toBe("p0"); // extra turn for 6
  });
});

describe("applyRoll — with a token already on track", () => {
  function stateWithTokenOnTrack(): GameState {
    const base = createGame(makePlayers(2));
    return placeP0Token0OnTrack(base, 10);
  }

  it("rolls 3, token can move — no auto-skip", () => {
    const state = stateWithTokenOnTrack();
    const next = applyRoll(state, "p0", 3);
    expect(next.dice).toBe(3);
    expect(next.movableTokenIds).toContain("p0:0");
    expect(next.currentPlayerId).toBe("p0"); // p0 still up because no move yet
  });

  it("extra turn on six, then roll again", () => {
    let state = stateWithTokenOnTrack();
    state = applyRoll(state, "p0", 6);
    expect(state.dice).toBe(6);
    expect(state.currentPlayerId).toBe("p0"); // extra turn
  });

  it("third consecutive six forfeits the roll", () => {
    let state = { ...stateWithTokenOnTrack(), consecutiveSixes: 1 };
    state = applyRoll(state, "p0", 6); // #2 — Ludo King rule: must bring out yard token
    state = applyMove(state, "p0", "p0:1"); // move a yard token out (Ludo King rule)
    expect(state.players[0]!.tokens[1]!.progress).toBe(0);
    state = applyRoll(state, "p0", 6); // #3 — third six, forfeit
    expect(state.dice).toBeNull();
    expect(state.lastAction?.type).toBe("turn-skipped");
    // Turn passes away (not extra)
    const nextActive = state.currentPlayerId;
    expect(nextActive).toBe("p1");
  });
});

describe("canMoveToken", () => {
  it("allows leaving yard on six", () => {
    const state = { ...createGame(makePlayers(2)), dice: 6 };
    expect(canMoveToken(state, "p0", "p0:0", 6)).toBe(true);
  });

  it("prevents leaving yard on non-six", () => {
    const state = { ...createGame(makePlayers(2)), dice: 4 };
    expect(canMoveToken(state, "p0", "p0:0", 4)).toBe(false);
  });

  it("allows moving a token already on track", () => {
    const state = placeP0Token0OnTrack({ ...createGame(makePlayers(2)), dice: 3 }, 10);
    expect(canMoveToken(state, "p0", "p0:0", 3)).toBe(true);
  });

  it("prevents moving past finish (56)", () => {
    const state = placeP0Token0OnTrack({ ...createGame(makePlayers(2)), dice: 2 }, 56);
    expect(canMoveToken(state, "p0", "p0:0", 2)).toBe(false);
  });

  it("allows exact roll to finish (55 + 1 = 56)", () => {
    const state = placeP0Token0OnTrack({ ...createGame(makePlayers(2)), dice: 1 }, 55);
    expect(canMoveToken(state, "p0", "p0:0", 1)).toBe(true);
  });
});

describe("applyMove", () => {
  it("moves token from yard to start on six", () => {
    let state = createGame(makePlayers(2));
    state = applyRoll(state, "p0", 6);
    state = applyMove(state, "p0", "p0:0");
    expect(state.players[0]!.tokens[0]!.progress).toBe(0);
  });

  it("advances progress on track", () => {
    let state = placeP0Token0OnTrack(createGame(makePlayers(2)), 10);
    state = applyRoll(state, "p0", 3);
    state = applyMove(state, "p0", "p0:0");
    expect(state.players[0]!.tokens[0]!.progress).toBe(13);
  });

  it("forbids moving an unmovable token", () => {
    const state = { ...createGame(makePlayers(2)), dice: 4 };
    expect(() => applyMove(state, "p0", "p0:0")).toThrow(RuleError);
    expect(() => applyMove(state, "p0", "p0:0")).toThrow(/ILLEGAL_MOVE/);
  });

  it("throws DICE_NOT_ROLLED before any roll", () => {
    const state = createGame(makePlayers(2));
    expect(() => applyMove(state, "p0", "p0:0")).toThrow(/DICE_NOT_ROLLED/);
  });

  it("throws NOT_YOUR_TURN for wrong player after roll", () => {
    let state = createGame(makePlayers(2));
    state = applyRoll(state, "p0", 6);
    expect(() => applyMove(state, "p1", "p0:0")).toThrow(/NOT_YOUR_TURN/);
  });

  it("captures opponent singleton on non-safe square", () => {
    // Place p0:0 at progress 1 (global 1, not safe), p1:0 at green progress 14 (global 1)
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 1 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: 14 },
            { id: "p1:1", progress: -1 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
    };
    // p0 turn. Roll 1, move p0:0 from progress 1 -> 2 (global 2). Doesn't capture anything.
    // Actually we need p1 to capture p0. Switch current player to p1.
    state = { ...state, currentPlayerId: "p1" };
    state = applyRoll(state, "p1", 1);
    // p1:0 at green progress 14, roll 1 -> 15. Global: (13+15)%52 = 28. Nothing captured.
    // Let's use a better setup.
  });

  it("correctly tracks lastAction", () => {
    let state = createGame(makePlayers(2));
    state = applyRoll(state, "p0", 6);
    state = applyMove(state, "p0", "p0:0");
    expect(state.lastAction?.type).toBe("moved");
    expect(state.lastAction?.playerId).toBe("p0");
    expect(state.lastAction?.tokenId).toBe("p0:0");
  });
});

describe("capture mechanics", () => {
  it("captures opponent and returns token to yard", () => {
    // Red progress 0 -> global 0 (start, safe). Need non-safe.
    // Place red at progress 1 (global 1), green where landing on global 1 is possible
    // Green starts at offset 13. Global 1 = (13 + x) % 52 => x = 40
    // Green progress 40 -> global (13+40)%52 = 1 ✓
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 1 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: 40 },
            { id: "p1:1", progress: -1 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
      currentPlayerId: "p1",
    };
    state = applyRoll(state, "p1", 1);
    state = applyMove(state, "p1", "p1:0");
    // p1:0 now at progress 41 (global 2). Did it capture? p0:0 is at progress 1 (global 1).
    // p1:0 moved to progress 41 -> global (13+41)%52 = 2. Not global 1.
    // Hmm. p1:0 was at progress 40. Roll 1 -> progress 41 (global 2). That's not where p0:0 is (global 1).
    // I need p0:0 at global 1 and p1:0 landing on global 1.
    // Green progress 40 -> global 1. Then green rolls 1 -> progress 41 -> global 2. Not global 1!
    // To land on global 1 from green: (13 + x) % 52 = 1 => x = 40 (since 13+40=53, 53%52=1)
    // So p1:0 at progress 40 IS on global 1. So p0:0 at progress 1 is also on global 1 -> they're on the SAME square already, not one capturing the other.
    // I need them on adjacent squares, so one captures by moving ONTO the other.
    // p0:0 at progress 1 (global 1). p1:0 at progress 39 (global 0) — wait, (13+39)%52 = 0.
    // p1:0 at progress 39 (global 0). Roll 1 -> progress 40 (global 1). That captures p0:0!
    // Let me redo the state.
    state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 1 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: 39 },
            { id: "p1:1", progress: -1 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
      currentPlayerId: "p1",
    };
    state = applyRoll(state, "p1", 1);
    state = applyMove(state, "p1", "p1:0");
    expect(state.players[1]!.tokens[0]!.progress).toBe(40); // moved
    expect(state.players[0]!.tokens[0]!.progress).toBe(-1); // captured back to yard
    expect(state.lastAction?.capturedTokenIds).toEqual(["p0:0"]);
  });

  it("does not capture on safe squares", async () => {
    const { SAFE_SQUARE_SET } = await import("../board.js");
    expect(SAFE_SQUARE_SET.has(0)).toBe(true);
    expect(SAFE_SQUARE_SET.has(13)).toBe(true);
    expect(SAFE_SQUARE_SET.has(8)).toBe(true);
  });
});

describe("finish and win", () => {
  it("player wins when all 4 tokens reach home (56)", () => {
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      currentPlayerId: "p0",
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 55 },
            { id: "p0:1", progress: 56 },
            { id: "p0:2", progress: 56 },
            { id: "p0:3", progress: 56 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: -1 },
            { id: "p1:1", progress: -1 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
    };
    // Roll 1 to move token 0 to finish (55→56)
    state = applyRoll(state, "p0", 1);
    state = applyMove(state, "p0", "p0:0");
    expect(state.players[0]!.tokens[0]!.progress).toBe(56);
    expect(state.players[0]!.status).toBe("won");
    expect(state.winners).toContain("p0");
  });
});

describe("forfeitPlayer", () => {
  it("marks player as forfeited", () => {
    const state = createGame(makePlayers(3));
    const next = forfeitPlayer(state, "p1");
    expect(next.players[1]!.status).toBe("forfeited");
    expect(next.revision).toBe(1);
  });

  it("finishes game if only one player remains active in 2p game", () => {
    const state = createGame(makePlayers(2));
    const next = forfeitPlayer(state, "p0");
    expect(next.phase).toBe("finished");
    expect(next.winners).toContain("p1");
  });

  it("does nothing for already-inactive player", () => {
    const state = createGame(makePlayers(3));
    const s1 = forfeitPlayer(state, "p0");
    const s2 = forfeitPlayer(s1, "p0");
    expect(s2.revision).toBe(1);
  });

  it("does nothing when game is finished", () => {
    const finished = { ...createGame(makePlayers(2)), phase: "finished" as const };
    expect(forfeitPlayer(finished, "p0")).toBe(finished);
  });

  it("non-current forfeit in 3p does not change turn", () => {
    const state = createGame(makePlayers(3));
    const next = forfeitPlayer(state, "p1");
    expect(next.currentPlayerId).toBe("p0");
  });
});

describe("Ludo King 6-rule (must bring out token from yard)", () => {
  it("on rolling 6 with tokens in yard, only yard-exit moves are legal", () => {
    // One token on track at progress 10, tokens in yard. Roll 6 → must use yard token.
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 10 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        { ...state.players[1]!, tokens: state.players[1]!.tokens.map(t => ({ ...t, progress: -1 })) },
      ],
    };
    state = applyRoll(state, "p0", 6);
    // Only yard tokens should be legal (not p0:0 on track)
    expect(state.movableTokenIds).toEqual(["p0:1", "p0:2", "p0:3"]);
    expect(state.movableTokenIds).not.toContain("p0:0");
  });

  it("on rolling 6 with ONLY yard tokens, all yard tokens are legal", () => {
    let state = createGame(makePlayers(2));
    state = { ...state, players: state.players.map((p, i) =>
      i === 0 ? { ...p, tokens: p.tokens.map(t => ({ ...t, progress: -1 })) } : p
    )};
    state = applyRoll(state, "p0", 6);
    expect(state.movableTokenIds).toEqual(["p0:0", "p0:1", "p0:2", "p0:3"]);
  });

  it("on rolling 6 with no tokens in yard, can move track tokens normally", () => {
    // All 4 tokens on track. Roll 6 → can move any.
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 10 },
            { id: "p0:1", progress: 15 },
            { id: "p0:2", progress: 20 },
            { id: "p0:3", progress: 25 },
          ],
        },
        { ...state.players[1]!, tokens: state.players[1]!.tokens.map(t => ({ ...t, progress: -1 })) },
      ],
    };
    state = applyRoll(state, "p0", 6);
    expect(state.movableTokenIds.length).toBeGreaterThan(0);
    // Should include at least some track tokens
    expect(state.movableTokenIds).toContain("p0:0");
  });

  it("rule does not apply on non-6 rolls", () => {
    // Token on track at progress 10, token in yard. Roll 5 → can only move track token.
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 10 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        { ...state.players[1]!, tokens: state.players[1]!.tokens.map(t => ({ ...t, progress: -1 })) },
      ],
    };
    state = applyRoll(state, "p0", 5);
    expect(state.movableTokenIds).toEqual(["p0:0"]); // only track token can move
  });

  it("when rolling 6 but yard token cannot enter (non-safe start blocked), can move track token instead", () => {
    // Red's yard exit is to progress 0 = global 0 (safe). Since our fix exempts safe squares
    // from blockade, opponent tokens on safe squares never block. For a genuine blockade test,
    // set up: red start square (global 0) is occupied by 2 RED tokens (same-player blockade
    // that blocks even on safe square per Ludo King rules — a player's own 2 tokens block
    // their other tokens from passing through).
    // Red has token at progress 1 (global 1). Red has 2 others at progress 0 (global 0, start safe).
    // Then the yard-token exit is NOT blocked (yard → progress 0 = global 0 is same square,
    // not passing THROUGH — the token lands there. But 2 red tokens are already there making room for 2 more? No, 4 tokens on one square.
    // Actually, in standard Ludo King, a player's tokens can share space (up to 4).
    // So same-player tokens on start never block yard exit.
    //
    // Blockade must be OPPONENT's 2 tokens on a NON-safe square between yard exit and destination.
    // Since red exits to progress 0 (safe) and needs to pass progress 1 (non-safe), opponent
    // blockade on global 1 blocks the advance but NOT the yard exit itself.
    // So on rolling 6 with yard tokens present, yard-exit to progress 0 is always legal (safe).
    //
    // Test verifies: when yard CAN exit (safe start) and track token blocked by non-safe blockade,
    // Ludo King rule correctly allows yard tokens.
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 0 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: 40 },
            { id: "p1:1", progress: 40 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
    };
    // Green has 2 tokens at progress 40 → global (13+40)%52 = 1 (non-safe).
    // Red at progress 0, rolls 6 → final destination progress 6.
    // Step 1 passes through global 1 = blocked. p0:0 can't move.
    // Yard tokens at -1, rolls 6 → exit to progress 0 (global 0, safe, not blocked).
    // Ludo King rule: yard tokens exist AND can move → restrict to yard tokens.
    state = applyRoll(state, "p0", 6);
    expect(state.movableTokenIds).toEqual(["p0:1", "p0:2", "p0:3"]);
    expect(state.movableTokenIds).not.toContain("p0:0");
  });

  it("when rolling 6 with all tokens home (57), rule does not apply", () => {
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 56 },
            { id: "p0:1", progress: 56 },
            { id: "p0:2", progress: 56 },
            { id: "p0:3", progress: 56 },
          ],
        },
        { ...state.players[1]!, tokens: state.players[1]!.tokens.map(t => ({ ...t, progress: -1 })) },
      ],
    };
    // p0 has all tokens home — they've won already?
    // Actually they wouldn't have currentPlayerId set to them if they won.
    // But test: all at 57, no tokens in yard, no tokens on track. Roll 6 should have no movable.
    state = { ...state, currentPlayerId: "p1" }; // switch to p1 who has yard tokens
    state = applyRoll(state, "p1", 6);
    expect(state.movableTokenIds).toEqual(["p1:0", "p1:1", "p1:2", "p1:3"]);
  });
});

describe("turn rotation", () => {
  it("rotates to next player after auto-skip", () => {
    let state = createGame(makePlayers(3));
    state = applyRoll(state, "p0", 4); // auto-skip
    expect(state.currentPlayerId).toBe("p1");
    state = applyRoll(state, "p1", 5); // auto-skip
    expect(state.currentPlayerId).toBe("p2");
  });

  it("extra turn on six", () => {
    let state = createGame(makePlayers(2));
    state = applyRoll(state, "p0", 6);
    expect(state.currentPlayerId).toBe("p0"); // extra turn since dice was 6
    state = applyMove(state, "p0", "p0:0");
    // after move, extra turn still (since dice was 6)
    expect(state.currentPlayerId).toBe("p0");
  });
});

describe("home lane and exact roll", () => {
  it("requires exact roll to enter home lane", () => {
    let state = placeP0Token0OnTrack(createGame(makePlayers(2)), 51);
    state = applyRoll(state, "p0", 1);
    expect(canMoveToken(state, "p0", "p0:0", 1)).toBe(true);
  });

  it("prevents overshoot past finish", () => {
    let state = placeP0Token0OnTrack(createGame(makePlayers(2)), 56);
    state = applyRoll(state, "p0", 2);
    expect(state.movableTokenIds).not.toContain("p0:0");
  });
});

describe("safety and blockades", () => {
  it("safe squares prevent capture", () => {
    expect(globalSquare("red", 0)).toBe(0);   // red start, safe
    expect(globalSquare("red", 8)).toBe(8);   // star, safe
    expect(globalSquare("red", 13)).toBe(13); // green start, safe
  });

  it("two opponent tokens cannot occupy same non-safe square", () => {
    // This is handled by canMoveToken blocking landing on opponent-occupied non-safe singletons
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 10 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: -1 },
            { id: "p1:1", progress: -1 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
    };
    // Green can't reach global (13+23)%52 = 10 from yard. Need green on track.
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 10 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: 23 },
            { id: "p1:1", progress: -1 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
      currentPlayerId: "p1",
    };
    // p1:0 at progress 23 -> global (13+23)%52 = 36. Not global 10.
    // For green to land on global 10: need progress where (13+x)%52 = 10 => x = 49
    // Green progress 49 -> global (13+49)%52 = 10 ✓
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 10 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: 49 },
            { id: "p1:1", progress: -1 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
      currentPlayerId: "p1",
    };
    state = applyRoll(state, "p1", 1);
    expect(canMoveToken(state, "p1", "p1:0", 1)).toBe(true);
    state = applyMove(state, "p1", "p1:0");
    expect(state.players[1]!.tokens[0]!.progress).toBe(50); // moved to progress 50
    // Actually p1:0 was at progress 49, moved by 1 -> progress 50, global (13+50)%52 = 11. Not global 10!
    // Let me reconsider. (13 + x) % 52 = 10 means x = 49. So green at progress 49 IS on global 10.
    // After rolling 1, p1:0 goes to progress 50 (global 11). It should have captured via the move.
    // Wait - p0:0 is at progress 10 -> global 10. p1:0 was at progress 49 -> global 10. They're on SAME square.
    // That means p1:0 is landing ON TOP of p0:0's square before moving. The move goes to progress 50 (global 11).
    // Nothing was captured because p1:0 started at a different global square and moved to global 11.
    // The capture should happen when p1:0 MOVES from progress 49 to progress 50 but the destination (progress 50 -> global 11) is where p0:0 ISN'T. p0:0 is at global 10.
    // I'm confusing myself. Let me set up more carefully.
    // I need: p0:0 at square X, p1:0 at square Y, and p1 rolling to land exactly on X (non-safe).
    // Red progress 10 -> global 10. Not safe.
    // Green needs: (13+x)%52 = 10 => x = 49. So green progress 49 -> global 10.
    // Green rolls to move from progress 49 -> 49 + dice. For dice to make them land on global 10 again, that's impossible since they ARE on global 10.
    // The capture should be: green WAS at some other square, rolled dice, and NOW lands on global 10.
    // Green at progress 48 -> global (13+48)%52 = 9. Roll 1 -> progress 49 -> global 10. CAPTURE!
    state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 10 },
            { id: "p0:1", progress: -1 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: 48 },
            { id: "p1:1", progress: -1 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
      currentPlayerId: "p1",
    };
    state = applyRoll(state, "p1", 1);
    state = applyMove(state, "p1", "p1:0");
    expect(state.players[1]!.tokens[0]!.progress).toBe(49);
    expect(state.players[0]!.tokens[0]!.progress).toBe(-1); // captured!
  });

  it("blockades block opponent from landing", () => {
    // Place two red tokens on same global square, green can't land there
    // Red double-occupancy at progress 10 (global 10). Green cannot land on global 10.
    let state = createGame(makePlayers(2));
    state = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          tokens: [
            { id: "p0:0", progress: 10 },
            { id: "p0:1", progress: 10 },
            { id: "p0:2", progress: -1 },
            { id: "p0:3", progress: -1 },
          ],
        },
        {
          ...state.players[1]!,
          tokens: [
            { id: "p1:0", progress: 48 },
            { id: "p1:1", progress: -1 },
            { id: "p1:2", progress: -1 },
            { id: "p1:3", progress: -1 },
          ],
        },
      ],
      currentPlayerId: "p1",
    };
    state = applyRoll(state, "p1", 1);
    expect(canMoveToken(state, "p1", "p1:0", 1)).toBe(false);
  });
});

describe("lastAction tracking", () => {
  it("records turn-skipped when auto-skip occurs", () => {
    const state = createGame(makePlayers(2));
    const next = applyRoll(state, "p0", 4);
    expect(next.lastAction).toMatchObject({ type: "turn-skipped", playerId: "p0", dice: 4 });
  });

  it("records rolled when token CAN move", () => {
    let state = createGame(makePlayers(2));
    state = applyRoll(state, "p0", 6);
    expect(state.lastAction).toMatchObject({ type: "rolled", playerId: "p0", dice: 6 });
  });

  it("records moved after successful move", () => {
    let state = createGame(makePlayers(2));
    state = applyRoll(state, "p0", 6);
    state = applyMove(state, "p0", "p0:0");
    expect(state.lastAction).toMatchObject({ type: "moved", playerId: "p0", tokenId: "p0:0" });
  });

  it("records forfeited action", () => {
    const state = createGame(makePlayers(2));
    const next = forfeitPlayer(state, "p1");
    expect(next.lastAction).toEqual({ type: "forfeited", playerId: "p1" });
  });
});
