import {
  type PlayerColor,
  TRACK_LENGTH,
  HOME_START,
  FINISH_PROGRESS,
  TOKENS_PER_PLAYER,
  SAFE_SQUARE_SET,
  STAR_SQUARE_SET,
  START_OFFSETS,
} from "./board.js";

export { PLAYER_COLORS, type PlayerColor, TRACK_LENGTH, HOME_START, FINISH_PROGRESS, TOKENS_PER_PLAYER } from "./board.js";

export type GamePhase = "playing" | "finished";
export type PlayerGameStatus = "active" | "won" | "forfeited" | "timed_out";

export interface TokenState {
  id: string;
  /** -1: yard, 0..50: common track, 51..55: home lane, 56: home (FINISH_PROGRESS). */
  progress: number;
}

export interface GamePlayer {
  id: string;
  name: string;
  color: PlayerColor;
  status: PlayerGameStatus;
  tokens: TokenState[];
  missedTurnCount?: number;
}

export interface LastAction {
  type: "rolled" | "moved" | "turn-skipped" | "forfeited";
  playerId: string;
  dice?: number;
  tokenId?: string;
  capturedTokenIds?: string[];
  starJumped?: boolean;
  reasonThreeSixes?: boolean;
}

export interface GameState {
  phase: GamePhase;
  revision: number;
  players: GamePlayer[];
  currentPlayerId: string;
  dice: number | null;
  movableTokenIds: string[];
  consecutiveSixes: number;
  winners: string[];
  lastAction: LastAction | null;
  startTime?: number;
  tieBreakerActive?: boolean;
}

export class RuleError extends Error {
  constructor(
    public readonly code:
      | "GAME_FINISHED"
      | "NOT_YOUR_TURN"
      | "DICE_ALREADY_ROLLED"
      | "DICE_NOT_ROLLED"
      | "INVALID_DICE"
      | "INVALID_TOKEN"
      | "ILLEGAL_MOVE",
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "RuleError";
  }
}

export function createGame(
  players: ReadonlyArray<{ id: string; name: string; color: PlayerColor }>,
): GameState {
  if (players.length < 2 || players.length > 4) {
    throw new Error("A Ludo game requires 2 to 4 players");
  }
  if (new Set(players.map((player) => player.id)).size !== players.length) {
    throw new Error("Player IDs must be unique");
  }
  if (new Set(players.map((player) => player.color)).size !== players.length) {
    throw new Error("Player colors must be unique");
  }

  return {
    phase: "playing",
    revision: 0,
    players: players.map((player) => ({
      ...player,
      status: "active",
      tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, index) => ({
        id: `${player.id}:${index}`,
        progress: -1,
      })),
      missedTurnCount: 0,
    })),
    currentPlayerId: players[0]!.id,
    dice: null,
    movableTokenIds: [],
    consecutiveSixes: 0,
    winners: [],
    lastAction: null,
    startTime: Date.now(),
    tieBreakerActive: false,
  };
}

export function globalSquare(color: PlayerColor, progress: number): number | null {
  if (progress < 0 || progress >= HOME_START) return null;
  return (START_OFFSETS[color] + progress) % TRACK_LENGTH;
}

function activePlayers(state: GameState): GamePlayer[] {
  return state.players.filter((player) => player.status === "active");
}

function nextActivePlayerId(state: GameState, fromPlayerId: string): string {
  const start = state.players.findIndex((player) => player.id === fromPlayerId);
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const candidate = state.players[(start + offset) % state.players.length]!;
    if (candidate.status === "active") return candidate.id;
  }
  return fromPlayerId;
}


export function canMoveToken(
  state: GameState,
  playerId: string,
  tokenId: string,
  dice: number,
): boolean {
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) return false;
  const player = state.players.find((candidate) => candidate.id === playerId);
  const token = player?.tokens.find((candidate) => candidate.id === tokenId);
  if (!player || player.status !== "active" || !token || token.progress === FINISH_PROGRESS) {
    return false;
  }

  const previousProgress = token.progress;
  const previousSquare = globalSquare(player.color, previousProgress);
  const isOnSafeSquare = previousSquare !== null && SAFE_SQUARE_SET.has(previousSquare);
  const tokensOnSquare = previousProgress >= 0
    ? player.tokens.filter((t) => t.progress === previousProgress).length
    : 1;
  const isBlobMove = tokensOnSquare >= 2 && !isOnSafeSquare && dice % 2 === 0;

  const distance = previousProgress === -1 ? (dice === 6 ? 0 : null) : (isBlobMove ? dice / 2 : dice);
  if (distance === null) return false;

  const finalDestination = previousProgress === -1 ? 0 : previousProgress + distance;
  if (finalDestination > FINISH_PROGRESS) return false;

  // Blockade check along path
  const startProgress = previousProgress === -1 ? 0 : previousProgress + 1;
  for (let step = startProgress; step <= finalDestination; step++) {
    const stepSquare = globalSquare(player.color, step);
    if (stepSquare !== null && !SAFE_SQUARE_SET.has(stepSquare)) {
      for (const opponent of state.players) {
        if (opponent.id === playerId) continue;
        let oppTokensOnSquare = 0;
        for (const oppToken of opponent.tokens) {
          if (globalSquare(opponent.color, oppToken.progress) === stepSquare) {
            oppTokensOnSquare++;
          }
        }
        if (oppTokensOnSquare >= 2) {
          // Single piece cannot pass through an opponent's blob in a single move, but CAN land on it.
          // A moving blob can pass through or land on (capture) an opponent's blob.
          if (!isBlobMove && step < finalDestination) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

export function legalTokenIds(state: GameState, playerId: string, dice: number): string[] {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return [];

  return player.tokens
    .filter((token) => canMoveToken(state, playerId, token.id, dice))
    .map((token) => token.id);
}

function finishTurn(state: GameState, playerId: string, extraTurn: boolean): GameState {
  const remaining = activePlayers(state);
  if (remaining.length <= 1) {
    const solePlayer = remaining[0];
    const winners = solePlayer && !state.winners.includes(solePlayer.id) 
      ? [...state.winners, solePlayer.id] 
      : state.winners;
      
    return {
      ...state,
      phase: "finished",
      winners,
      dice: null,
      movableTokenIds: [],
      consecutiveSixes: 0,
    };
  }

  return {
    ...state,
    currentPlayerId: extraTurn ? playerId : nextActivePlayerId(state, playerId),
    dice: null,
    movableTokenIds: [],
    consecutiveSixes: extraTurn ? state.consecutiveSixes : 0,
  };
}

export function applyRoll(state: GameState, playerId: string, dice: number): GameState {
  if (state.phase !== "playing") throw new RuleError("GAME_FINISHED", "The game is finished");
  if (state.currentPlayerId !== playerId) throw new RuleError("NOT_YOUR_TURN", "It is not your turn");
  if (state.dice !== null) throw new RuleError("DICE_ALREADY_ROLLED", "Move before rolling again");
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) {
    throw new RuleError("INVALID_DICE", "Dice must be an integer from 1 to 6");
  }

  const consecutiveSixes = dice === 6 ? state.consecutiveSixes + 1 : 0;
  let next: GameState = {
    ...state,
    revision: state.revision + 1,
    consecutiveSixes,
    lastAction: { type: "rolled", playerId, dice },
  };

  if (consecutiveSixes === 3) {
    next = finishTurn(
      { ...next, lastAction: { type: "turn-skipped", playerId, dice, reasonThreeSixes: true } },
      playerId,
      false,
    );
    return next;
  }

  const movableTokenIds = legalTokenIds(next, playerId, dice);
  next = { ...next, dice, movableTokenIds };
  if (movableTokenIds.length === 0) {
    next = finishTurn(
      { ...next, lastAction: { type: "turn-skipped", playerId, dice } },
      playerId,
      dice === 6,
    );
  }
  return next;
}

export function applyMove(state: GameState, playerId: string, tokenId: string): GameState {
  if (state.phase !== "playing") throw new RuleError("GAME_FINISHED", "The game is finished");
  if (state.currentPlayerId !== playerId) throw new RuleError("NOT_YOUR_TURN", "It is not your turn");
  if (state.dice === null) throw new RuleError("DICE_NOT_ROLLED", "Roll before moving");
  if (!state.movableTokenIds.includes(tokenId)) {
    const exists = state.players.some((player) => player.tokens.some((token) => token.id === tokenId));
    throw new RuleError(exists ? "ILLEGAL_MOVE" : "INVALID_TOKEN", "That token cannot move");
  }

  const playerIndex = state.players.findIndex((player) => player.id === playerId);
  const player = state.players[playerIndex]!;
  const tokenIndex = player.tokens.findIndex((token) => token.id === tokenId);
  const previousProgress = player.tokens[tokenIndex]!.progress;
  
  const previousSquare = globalSquare(player.color, previousProgress);
  const isOnSafeSquare = previousSquare !== null && SAFE_SQUARE_SET.has(previousSquare);
  const tokensOnSquare = previousProgress >= 0
    ? player.tokens.filter((t) => t.progress === previousProgress).length
    : 1;
  const isBlobMove = tokensOnSquare >= 2 && !isOnSafeSquare && state.dice! % 2 === 0;

  const distance = isBlobMove ? state.dice! / 2 : state.dice!;
  const diceDestination = previousProgress === -1 ? 0 : previousProgress + distance;

  let finalDestination = diceDestination;

  const players = state.players.map((candidate) => ({
    ...candidate,
    tokens: candidate.tokens.map((token) => ({ ...token })),
  }));

  if (isBlobMove) {
    for (let i = 0; i < players[playerIndex]!.tokens.length; i++) {
      if (players[playerIndex]!.tokens[i]!.progress === previousProgress) {
        players[playerIndex]!.tokens[i]!.progress = finalDestination;
      }
    }
  } else {
    players[playerIndex]!.tokens[tokenIndex]!.progress = finalDestination;
  }

  const destinationSquare = globalSquare(player.color, finalDestination);
  const capturedTokenIds: string[] = [];
  if (destinationSquare !== null && !SAFE_SQUARE_SET.has(destinationSquare)) {
    for (const opponent of players) {
      if (opponent.id === playerId) continue;

      const opponentTokensHere = opponent.tokens.filter(t => globalSquare(opponent.color, t.progress) === destinationSquare);

      if (opponentTokensHere.length === 1 && !isBlobMove) {
        // Single piece captures single piece
        capturedTokenIds.push(opponentTokensHere[0]!.id);
        opponentTokensHere[0]!.progress = -1;
      } else if (opponentTokensHere.length >= 1 && isBlobMove) {
        // Blob captures anything (single piece or opponent blob)
        for (const t of opponentTokensHere) {
          capturedTokenIds.push(t.id);
          t.progress = -1;
        }
      }
      // If single piece lands on opponent blob (opponentTokensHere.length >= 2 && !isBlobMove), they coexist! No capture.
    }
  }

  let winners = [...state.winners];
  let finished = false;
  const updatedPlayer = players[playerIndex]!;
  
  if (state.tieBreakerActive && updatedPlayer.tokens.some((token) => token.progress === FINISH_PROGRESS)) {
    updatedPlayer.status = "won";
    winners.push(playerId);
    finished = true;
  } else if (updatedPlayer.tokens.every((token) => token.progress === FINISH_PROGRESS)) {
    updatedPlayer.status = "won";
    winners.push(playerId);
    finished = true;
  }

  let next: GameState = {
    ...state,
    players,
    winners,
    revision: state.revision + 1,
    lastAction: { type: "moved", playerId, tokenId, capturedTokenIds },
  };

  const extraTurn = !finished && (state.dice === 6 || capturedTokenIds.length > 0 || finalDestination === FINISH_PROGRESS);
  next = finishTurn(next, playerId, extraTurn);
  return next;
}

export function skipPlayerTurn(state: GameState, playerId: string): GameState {
  if (state.phase !== "playing") return state;
  if (state.currentPlayerId !== playerId) return state;

  let next = {
    ...state,
    revision: state.revision + 1,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, missedTurnCount: (p.missedTurnCount ?? 0) + 1 } : p
    ),
  };

  const missingPlayer = next.players.find(p => p.id === playerId);
  if (missingPlayer && (missingPlayer.missedTurnCount ?? 0) >= 5) {
    next = forfeitPlayer(next, playerId);
  } else {
    next = finishTurn(
      { ...next, lastAction: { type: "turn-skipped", playerId, dice: state.dice ?? undefined } },
      playerId,
      false,
    );
  }
  return next;
}

export function forfeitPlayer(state: GameState, playerId: string): GameState {
  if (state.phase !== "playing") return state;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.status !== "active") return state;

  const players = state.players.map((candidate) =>
    candidate.id === playerId
      ? { ...candidate, status: ((player.missedTurnCount ?? 0) >= 5 ? "timed_out" : "forfeited") as PlayerGameStatus }
      : candidate,
  );
  let next: GameState = {
    ...state,
    players,
    revision: state.revision + 1,
    lastAction: { type: "forfeited", playerId },
  };
  if (state.currentPlayerId === playerId) next = finishTurn(next, playerId, false);
  else if (activePlayers(next).length <= 1) next = finishTurn(next, state.currentPlayerId, true);
  return next;
}
