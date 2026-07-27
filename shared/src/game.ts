import {
  type PlayerColor,
  TRACK_LENGTH,
  HOME_START,
  FINISH_PROGRESS,
  TOKENS_PER_PLAYER,
  SAFE_SQUARE_SET,
  STAR_SQUARE_SET,
  STAR_JUMP,
  START_OFFSETS,
} from "./board.js";

export { PLAYER_COLORS, type PlayerColor, TRACK_LENGTH, HOME_START, FINISH_PROGRESS, STAR_JUMP, TOKENS_PER_PLAYER } from "./board.js";

export type GamePhase = "playing" | "finished";
export type PlayerGameStatus = "active" | "won" | "forfeited";

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
}

export interface LastAction {
  type: "rolled" | "moved" | "turn-skipped" | "forfeited";
  playerId: string;
  dice?: number;
  tokenId?: string;
  capturedTokenIds?: string[];
  starJumped?: boolean;
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
    })),
    currentPlayerId: players[0]!.id,
    dice: null,
    movableTokenIds: [],
    consecutiveSixes: 0,
    winners: [],
    lastAction: null,
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

function blockadeSquares(state: GameState): Set<number> {
  const counts = new Map<string, { square: number; count: number }>();
  for (const player of state.players) {
    for (const token of player.tokens) {
      const square = globalSquare(player.color, token.progress);
      if (square === null) continue;
      const key = `${player.id}:${square}`;
      const entry = counts.get(key) ?? { square, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
  }
  return new Set(
    [...counts.values()]
      .filter((entry) => entry.count >= 2 && !SAFE_SQUARE_SET.has(entry.square))
      .map((entry) => entry.square),
  );
}

export function canMoveToken(
  state: GameState,
  playerId: string,
  tokenId: string,
  dice: number,
  blockades?: Set<number>,
): boolean {
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) return false;
  const player = state.players.find((candidate) => candidate.id === playerId);
  const token = player?.tokens.find((candidate) => candidate.id === tokenId);
  if (!player || player.status !== "active" || !token || token.progress === FINISH_PROGRESS) {
    return false;
  }

  const diceDestination = token.progress === -1 ? (dice === 6 ? 0 : null) : token.progress + dice;
  if (diceDestination === null) return false;

  const finalDestination = diceDestination;
  if (finalDestination > FINISH_PROGRESS) return false;

  const resolvedBlockades = blockades ?? blockadeSquares(state);
  const firstStep = token.progress === -1 ? 0 : token.progress + 1;
  for (let progress = firstStep; progress <= finalDestination; progress += 1) {
    const square = globalSquare(player.color, progress);
    if (square === null || !resolvedBlockades.has(square)) continue;

    // A token may not pass or land on any blockade (2+ tokens), including its own.
    return false;
  }

  const destinationSquare = globalSquare(player.color, finalDestination);
  if (destinationSquare !== null && !SAFE_SQUARE_SET.has(destinationSquare)) {
    const opponentCount = state.players
      .filter((candidate) => candidate.id !== player.id)
      .flatMap((candidate) => candidate.tokens.map((candidateToken) => ({ candidate, candidateToken })))
      .filter(
        ({ candidate, candidateToken }) =>
          globalSquare(candidate.color, candidateToken.progress) === destinationSquare,
      ).length;
    if (opponentCount >= 2) return false;
  }
  return true;
}

export function legalTokenIds(state: GameState, playerId: string, dice: number): string[] {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return [];

  const blockades = blockadeSquares(state);

  if (dice === 6) {
    const yardTokens = player.tokens
      .filter((token) => token.progress === -1 && canMoveToken(state, playerId, token.id, dice, blockades))
      .map((token) => token.id);
    if (yardTokens.length > 0) return yardTokens;
  }

  return player.tokens
    .filter((token) => canMoveToken(state, playerId, token.id, dice, blockades))
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
      { ...next, lastAction: { type: "turn-skipped", playerId, dice } },
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
  const diceDestination = previousProgress === -1 ? 0 : previousProgress + state.dice;

  let finalDestination = diceDestination;
  let starJumped = false;

  const destSquare = globalSquare(player.color, finalDestination);
  if (destSquare !== null &&
    STAR_SQUARE_SET.has(destSquare) &&
    destSquare !== START_OFFSETS[player.color] &&
    finalDestination + STAR_JUMP <= FINISH_PROGRESS
  ) {
    finalDestination += STAR_JUMP;
    starJumped = true;
  }

  const movedToken: TokenState = { ...player.tokens[tokenIndex]!, progress: finalDestination };
  const players = state.players.map((candidate) => ({
    ...candidate,
    tokens: candidate.tokens.map((token) => ({ ...token })),
  }));
  players[playerIndex]!.tokens[tokenIndex] = movedToken;

  const destinationSquare = globalSquare(player.color, finalDestination);
  const capturedTokenIds: string[] = [];
  if (destinationSquare !== null && !SAFE_SQUARE_SET.has(destinationSquare)) {
    for (const opponent of players) {
      if (opponent.id === playerId) continue;
      for (const token of opponent.tokens) {
        if (globalSquare(opponent.color, token.progress) === destinationSquare) {
          capturedTokenIds.push(token.id);
          token.progress = -1;
        }
      }
    }
  }

  let winners = [...state.winners];
  let finished = false;
  const updatedPlayer = players[playerIndex]!;
  if (updatedPlayer.tokens.every((token) => token.progress === FINISH_PROGRESS)) {
    updatedPlayer.status = "won";
    winners.push(playerId);
    finished = true;
  }

  let next: GameState = {
    ...state,
    players,
    winners,
    revision: state.revision + 1,
    lastAction: { type: "moved", playerId, tokenId, capturedTokenIds, starJumped },
  };

  const extraTurn = !finished && (state.dice === 6 || capturedTokenIds.length > 0 || finalDestination === FINISH_PROGRESS);
  next = finishTurn(next, playerId, extraTurn);
  return next;
}

export function forfeitPlayer(state: GameState, playerId: string): GameState {
  if (state.phase !== "playing") return state;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.status !== "active") return state;

  const players = state.players.map((candidate) =>
    candidate.id === playerId ? { ...candidate, status: "forfeited" as const } : candidate,
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
