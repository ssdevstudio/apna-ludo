import crypto from "node:crypto";
import { type Server } from "socket.io";
import {
  type GameState,
  type GamePlayer,
  type PlayerColor,
  type RoomSnapshot,
  type RoomPlayerSnapshot,
  type ChatMessage,
  type CommandResult,
  type TokenState,
  PLAYER_COLORS,
  createGame,
  applyRoll,
  applyMove,
  forfeitPlayer,
  legalTokenIds,
  globalSquare,
} from "@apna-ludo/shared";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@apna-ludo/shared";

// Socket.IO Server type with our events
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export interface RoomData {
  code: string;
  maxPlayers: number;
  phase: "lobby" | "playing" | "finished";
  revision: number;
  players: Map<string, RoomPlayerData>;
  playerOrder: string[];
  game: GameState | null;
  chat: ChatMessage[];
  botTimer?: ReturnType<typeof setTimeout>;
  turnTimer?: ReturnType<typeof setTimeout>;
  lastActivity: number;
}

const TURN_TIMEOUT_MS = 30000;

interface RoomPlayerData {
  id: string;
  name: string;
  color: PlayerColor;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  reconnectToken: string;
  socketId: string | null;
  isBot: boolean;
  boundTokens: Map<string, string>;
}

const rooms = new Map<string, RoomData>();
const socketToRoom = new Map<string, string>();
const reconnectLookup = new Map<string, { roomCode: string; playerId: string }>();

function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += alphabet[crypto.randomInt(alphabet.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error("Could not generate unique room code");
}

function nextColor(usedColors: Set<PlayerColor>): PlayerColor | undefined {
  return PLAYER_COLORS.find((color) => !usedColors.has(color));
}

function emitSnapshot(io: TypedServer, roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  const snapshot = buildSnapshot(room);
  io.to(roomCode).emit("room:snapshot", snapshot);
}

function buildSnapshot(room: RoomData): RoomSnapshot {
  const players: RoomPlayerSnapshot[] = [];
  for (const [, player] of room.players) {
    players.push({
      id: player.id,
      name: player.name,
      color: player.color,
      ready: player.ready,
      connected: player.connected,
      isHost: player.isHost,
      isBot: player.isBot,
    });
  }
  players.sort((a, b) => PLAYER_COLORS.indexOf(a.color) - PLAYER_COLORS.indexOf(b.color));
  return {
    code: room.code,
    phase: room.phase,
    revision: room.revision,
    maxPlayers: room.maxPlayers,
    players,
    game: room.game,
    chat: [...room.chat],
  };
}

function checkStaleRevision(room: RoomData, expectedRevision?: number): boolean {
  return expectedRevision !== undefined && room.revision !== expectedRevision;
}

export function createRoom(
  io: TypedServer,
  name: string,
  maxPlayers: number,
  hostSocketId: string,
  preferredColor?: PlayerColor
): CommandResult<{ room: RoomSnapshot; playerId: string; reconnectToken: string }> {
  const code = generateRoomCode();
  const playerId = crypto.randomUUID();
  const reconnectToken = crypto.randomBytes(32).toString("hex");
  const player: RoomPlayerData = {
    id: playerId,
    name,
    color: preferredColor || "red",
    ready: true,
    connected: true,
    isHost: true,
    reconnectToken,
    socketId: hostSocketId,
    isBot: false,
    boundTokens: new Map(),
  };

  const room: RoomData = {
    code,
    maxPlayers,
    phase: "lobby",
    revision: 0,
    players: new Map([[playerId, player]]),
    playerOrder: [playerId],
    game: null,
    chat: [],
    lastActivity: Date.now(),
  };
  rooms.set(code, room);
  if (hostSocketId) {
    socketToRoom.set(hostSocketId, code);
  }
  reconnectLookup.set(reconnectToken, { roomCode: code, playerId });

  return { ok: true, room: buildSnapshot(room), playerId, reconnectToken };
}

export function createRoomWithComputer(
  io: TypedServer,
  name: string,
  hostSocketId: string,
): CommandResult<{ room: RoomSnapshot; playerId: string; reconnectToken: string }> {
  // Create room first
  const createResult = createRoom(io, name, 2, hostSocketId);
  if (!createResult.ok) return createResult;
  const room = rooms.get(createResult.room.code)!;

  // Add computer player
  const botId = `bot-${crypto.randomUUID().slice(0, 8)}`;
  const botPlayer: RoomPlayerData = {
    id: botId,
    name: "Bot",
    color: "green",
    ready: true,
    connected: true,
    isHost: false,
    reconnectToken: "",
    socketId: null,
    isBot: true,
    boundTokens: new Map(),
  };
  room.players.set(botId, botPlayer);
  room.playerOrder.push(botId);
  room.revision += 1;

  // Auto-start game since we have 2 players, both ready
  const gamePlayers = room.playerOrder
    .map((id) => room.players.get(id)!)
    .filter((p) => p.connected || p.isBot)
    .map((p) => ({ id: p.id, name: p.name, color: p.color }));
  room.game = createGame(gamePlayers);
  room.phase = "playing";
  room.revision += 1;
  emitSnapshot(io, room.code);
  scheduleTurnTimeout(io, room);

  return { ok: true, room: buildSnapshot(room), playerId: createResult.playerId, reconnectToken: createResult.reconnectToken };
}

export function joinRoom(
  io: TypedServer,
  code: string,
  socketId: string,
  name?: string,
  reconnectToken?: string,
  preferredColor?: PlayerColor
): CommandResult<{ room: RoomSnapshot; playerId: string; reconnectToken: string }> {
  const room = rooms.get(code);
  if (!room) return { ok: false, code: "ROOM_NOT_FOUND", message: "Room not found" };

  if (reconnectToken) {
    const lookup = reconnectLookup.get(reconnectToken);
    if (!lookup || lookup.roomCode !== code) {
      return { ok: false, code: "RECONNECT_FAILED", message: "Invalid reconnect token" };
    }
    const player = room.players.get(lookup.playerId);
    if (!player) {
      return { ok: false, code: "RECONNECT_FAILED", message: "Player not found" };
    }
    player.connected = true;
    player.socketId = socketId;
    socketToRoom.set(socketId, code);
    room.revision += 1;
    emitSnapshot(io, code);
    return { ok: true, room: buildSnapshot(room), playerId: player.id, reconnectToken };
  }

  if (room.phase !== "lobby") {
    return { ok: false, code: "GAME_ALREADY_STARTED", message: "Game already started" };
  }
  if (room.players.size >= room.maxPlayers) {
    return { ok: false, code: "ROOM_FULL", message: "Room is full" };
  }

  const usedColors = new Set<PlayerColor>();
  for (const [, p] of room.players) usedColors.add(p.color);
  
  let color = preferredColor;
  if (!color || usedColors.has(color)) {
    color = nextColor(usedColors);
  }

  if (!color) {
    return { ok: false, code: "ROOM_FULL", message: "No available color" };
  }

  const playerId = crypto.randomUUID();
  const newReconnectToken = crypto.randomBytes(32).toString("hex");
  const player: RoomPlayerData = {
    id: playerId,
    name: name || "Anonymous",
    color,
    ready: false,
    connected: true,
    isHost: false,
    reconnectToken: newReconnectToken,
    socketId,
    isBot: false,
    boundTokens: new Map(),
  };
  room.players.set(playerId, player);
  room.playerOrder.push(playerId);
  socketToRoom.set(socketId, code);
  reconnectLookup.set(newReconnectToken, { roomCode: code, playerId });
  room.revision += 1;
  emitSnapshot(io, code);

  return { ok: true, room: buildSnapshot(room), playerId, reconnectToken: newReconnectToken };
}

export function handleReady(
  io: TypedServer,
  socketId: string,
  expectedRevision?: number,
  commandId?: string,
): CommandResult {
  const room = getRoomBySocket(socketId);
  if (!room) return { ok: false, code: "NOT_IN_ROOM", message: "Not in a room", commandId };
  const player = getPlayerInRoom(room, socketId);
  if (!player) return { ok: false, code: "NOT_IN_ROOM", message: "Player not found", commandId };
  if (checkStaleRevision(room, expectedRevision)) {
    return { ok: false, code: "STALE_REVISION", message: "Stale revision", commandId, revision: room.revision };
  }
  player.ready = !player.ready;
  room.revision += 1;
  emitSnapshot(io, room.code);
  return { ok: true, commandId };
}

export function handleStart(
  io: TypedServer,
  socketId: string,
  expectedRevision?: number,
  commandId?: string,
): CommandResult {
  const room = getRoomBySocket(socketId);
  if (!room) return { ok: false, code: "NOT_IN_ROOM", message: "Not in a room", commandId };
  const player = getPlayerInRoom(room, socketId);
  if (!player || !player.isHost) {
    return { ok: false, code: "NOT_HOST", message: "Only host can start", commandId };
  }
  if (room.phase !== "lobby") {
    return { ok: false, code: "GAME_ALREADY_STARTED", message: "Game already started", commandId };
  }
  if (room.players.size !== room.maxPlayers) {
    return { ok: false, code: "NOT_READY", message: `Need exactly ${room.maxPlayers} players`, commandId };
  }
  if (checkStaleRevision(room, expectedRevision)) {
    return { ok: false, code: "STALE_REVISION", message: "Stale revision", commandId, revision: room.revision };
  }

  const allReady = [...room.players.values()].every((p) => p.ready);
  if (!allReady) {
    return { ok: false, code: "NOT_READY", message: "Not all players ready", commandId };
  }

  const gamePlayers = room.playerOrder
    .map((id) => room.players.get(id)!)
    .filter((p) => p.connected)
    .map((p) => ({ id: p.id, name: p.name, color: p.color }));

  room.game = createGame(gamePlayers);
  room.phase = "playing";
  room.revision += 1;
  emitSnapshot(io, room.code);
  scheduleTurnTimeout(io, room);
  return { ok: true, commandId };
}

export function handleRoll(
  io: TypedServer,
  socketId: string,
  expectedRevision?: number,
  commandId?: string,
): CommandResult<{ dice: number; movableTokenIds: string[] }> {
  const room = getRoomBySocket(socketId);
  if (!room) return { ok: false, code: "NOT_IN_ROOM", message: "Not in a room", commandId };
  const player = getPlayerInRoom(room, socketId);
  if (!player) return { ok: false, code: "NOT_IN_ROOM", message: "Player not found", commandId };
  if (!room.game) return { ok: false, code: "COMMAND_FAILED", message: "Game not started", commandId };
  if (checkStaleRevision(room, expectedRevision)) {
    return { ok: false, code: "STALE_REVISION", message: "Stale revision", commandId, revision: room.revision };
  }

  const dice = rollDice();
  try {
    room.game = applyRoll(room.game, player.id, dice);
  } catch {
    return { ok: false, code: "COMMAND_FAILED", message: "Cannot roll now", commandId };
  }
  room.revision += 1;
  const movableTokenIds = room.game.dice ? legalTokenIds(room.game, player.id, room.game.dice) : [];
  emitSnapshot(io, room.code);
  scheduleTurnTimeout(io, room);
  scheduleBotTurn(io, room);
  return { ok: true, commandId, dice: room.game.dice ?? dice, movableTokenIds };
}

export function handleMove(
  io: TypedServer,
  socketId: string,
  tokenId: string,
  expectedRevision?: number,
  commandId?: string,
): CommandResult {
  const room = getRoomBySocket(socketId);
  if (!room) return { ok: false, code: "NOT_IN_ROOM", message: "Not in a room", commandId };
  const player = getPlayerInRoom(room, socketId);
  if (!player) return { ok: false, code: "NOT_IN_ROOM", message: "Player not found", commandId };
  if (!room.game) return { ok: false, code: "COMMAND_FAILED", message: "Game not started", commandId };
  if (checkStaleRevision(room, expectedRevision)) {
    return { ok: false, code: "STALE_REVISION", message: "Stale revision", commandId, revision: room.revision };
  }

  try {
    room.game = applyMove(room.game, player.id, tokenId);
  } catch {
    return { ok: false, code: "COMMAND_FAILED", message: "Cannot move that token", commandId };
  }
  room.revision += 1;
  emitSnapshot(io, room.code);
  scheduleTurnTimeout(io, room);
  scheduleBotTurn(io, room);
  return { ok: true, commandId };
}

export function handleForfeit(
  io: TypedServer,
  socketId: string,
  expectedRevision?: number,
  commandId?: string,
): CommandResult {
  const room = getRoomBySocket(socketId);
  if (!room) return { ok: false, code: "NOT_IN_ROOM", message: "Not in a room", commandId };
  const player = getPlayerInRoom(room, socketId);
  if (!player) return { ok: false, code: "NOT_IN_ROOM", message: "Player not found", commandId };
  if (!room.game) return { ok: false, code: "COMMAND_FAILED", message: "Game not started", commandId };
  if (checkStaleRevision(room, expectedRevision)) {
    return { ok: false, code: "STALE_REVISION", message: "Stale revision", commandId, revision: room.revision };
  }

  try {
    room.game = forfeitPlayer(room.game, player.id);
  } catch {
    return { ok: false, code: "COMMAND_FAILED", message: "Cannot forfeit", commandId };
  }
  player.connected = false;
  room.revision += 1;
  emitSnapshot(io, room.code);
  return { ok: true, commandId };
}

export function handleDisconnect(io: TypedServer, socketId: string): void {
  const roomCode = socketToRoom.get(socketId);
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;

  for (const [, player] of room.players) {
    if (player.socketId === socketId) {
      player.connected = false;
      socketToRoom.delete(socketId);
      room.revision += 1;
      // Wait 30s grace, then forfeit if still disconnected
      setTimeout(() => {
        const currentRoom = rooms.get(roomCode);
        if (!currentRoom) return;
        const currentPlayer = currentRoom.players.get(player.id);
        if (!currentPlayer || currentPlayer.connected) return;
        if (currentRoom.game && currentRoom.phase === "playing") {
          try {
            currentRoom.game = forfeitPlayer(currentRoom.game, player.id);
            currentRoom.revision += 1;
          } catch {
            // ignore
          }
        }
        currentRoom.players.delete(player.id);
        if (player.reconnectToken) reconnectLookup.delete(player.reconnectToken);
        currentRoom.revision += 1;
        if (currentRoom.players.size === 0) {
          rooms.delete(roomCode);
        } else {
          emitSnapshot(io, roomCode);
        }
      }, 30000);
      break;
    }
  }
  emitSnapshot(io, roomCode);
}

export function addChatMessage(io: TypedServer, socketId: string, text: string, commandId?: string): CommandResult {
  const room = getRoomBySocket(socketId);
  if (!room) return { ok: false, code: "NOT_IN_ROOM", message: "Not in a room", commandId };
  const player = getPlayerInRoom(room, socketId);
  if (!player) return { ok: false, code: "NOT_IN_ROOM", message: "Player not found", commandId };

  const message: ChatMessage = {
    id: crypto.randomUUID(),
    playerId: player.id,
    playerName: player.name,
    text: text.replace(/[&<>"']/g, (ch: string): string => {
      const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
      return map[ch]!;
    }),
    sentAt: new Date().toISOString(),
  };
  room.chat.push(message);
  if (room.chat.length > 100) room.chat = room.chat.slice(-100);
  io.to(room.code).emit("chat:message", message);
  return { ok: true, commandId };
}

export function handleLeave(io: TypedServer, socketId: string, expectedRevision?: number, commandId?: string): CommandResult {
  const room = getRoomBySocket(socketId);
  if (!room) return { ok: false, code: "NOT_IN_ROOM", message: "Not in a room", commandId };
  const player = getPlayerInRoom(room, socketId);
  if (!player) return { ok: false, code: "NOT_IN_ROOM", message: "Player not found", commandId };
  if (checkStaleRevision(room, expectedRevision)) {
    return { ok: false, code: "STALE_REVISION", message: "Stale revision", commandId, revision: room.revision };
  }

  doLeave(io, socketId, room);
  return { ok: true, commandId };
}

export function handleRematch(io: TypedServer, socketId: string, expectedRevision?: number, commandId?: string): CommandResult {
  const room = getRoomBySocket(socketId);
  if (!room) return { ok: false, code: "NOT_IN_ROOM", message: "Not in a room", commandId };
  if (checkStaleRevision(room, expectedRevision)) {
    return { ok: false, code: "STALE_REVISION", message: "Stale revision", commandId, revision: room.revision };
  }
  
  if (room.phase !== "finished") {
    return { ok: false, code: "NOT_FINISHED", message: "Game is not finished", commandId };
  }

  // Clear timers before resetting
  clearTimeout(room.botTimer);
  clearTimeout(room.turnTimer);
  room.botTimer = undefined;
  room.turnTimer = undefined;

  // Reset to lobby
  room.phase = "lobby";
  room.game = null;
  room.lastActivity = Date.now();
  
  // Unready all players
  for (const player of room.players.values()) {
    if (!player.isBot) {
      player.ready = false;
    }
  }

  room.revision += 1;
  emitSnapshot(io, room.code);
  return { ok: true, commandId };
}

export function getRoom(code: string): RoomData | undefined {
  return rooms.get(code);
}

export function getRoomData(code: string): RoomSnapshot | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  return buildSnapshot(room);
}

export function getPlayerId(socketId: string): string | undefined {
  const roomCode = socketToRoom.get(socketId);
  if (!roomCode) return undefined;
  const room = rooms.get(roomCode);
  if (!room) return undefined;
  for (const [, player] of room.players) {
    if (player.socketId === socketId) return player.id;
  }
  return undefined;
}

export function getRoomBySocket(socketId: string): RoomData | undefined {
  const code = socketToRoom.get(socketId);
  if (!code) return undefined;
  return rooms.get(code);
}

function getPlayerInRoom(room: RoomData, socketId: string): RoomPlayerData | undefined {
  for (const [, player] of room.players) {
    if (player.socketId === socketId) return player;
  }
  return undefined;
}

function doLeave(io: TypedServer, socketId: string, room: RoomData): void {
  for (const [, player] of room.players) {
    if (player.socketId === socketId) {
      room.players.delete(player.id);
      // Clean up reconnect token so memory doesn't leak
      for (const [token, lookup] of reconnectLookup) {
        if (lookup.playerId === player.id) { reconnectLookup.delete(token); break; }
      }

      if (player.isHost && room.players.size > 0) {
        const sorted = [...room.players.values()].sort(
          (a, b) => room.playerOrder.indexOf(a.id) - room.playerOrder.indexOf(b.id),
        );
        if (sorted[0]) sorted[0].isHost = true;
      }
      break;
    }
  }
  socketToRoom.delete(socketId);
  room.revision += 1;
  if (room.players.size === 0) {
    // Clean up reconnect tokens for this room
    for (const [token, lookup] of reconnectLookup) {
      if (lookup.roomCode === room.code) reconnectLookup.delete(token);
    }
    if (room.botTimer) clearTimeout(room.botTimer);
    if (room.turnTimer) clearTimeout(room.turnTimer);
    rooms.delete(room.code);
  } else {
    if (room.game && room.phase === "playing") {
      const remainingCount = [...room.players.values()].filter((p) => p.connected || p.isBot).length;
      if (remainingCount < 2) {
        room.phase = "finished";
      }
    }
    emitSnapshot(io, room.code);
  }
}

function rollDice(): number {
  return crypto.randomInt(1, 7);
}

/** Start a 30-second turn timer. If player doesn't roll, auto-skip. */
function scheduleTurnTimeout(io: TypedServer, room: RoomData): void {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  if (room.phase !== "playing" || !room.game) return;
  const cp = room.players.get(room.game.currentPlayerId);
  if (!cp || cp.isBot) return; // bots don't need timeout

  room.turnTimer = setTimeout(() => {
    const r = rooms.get(room.code);
    if (!r || r.phase !== "playing" || !r.game) return;
    const cp2 = r.players.get(r.game.currentPlayerId);
    if (!cp2 || cp2.isBot) return;

    // If dice already rolled and there are movable tokens, auto-move the first one
    if (r.game.dice !== null) {
      const movable = legalTokenIds(r.game, cp2.id, r.game.dice);
      if (movable.length > 0) {
        try {
          r.game = applyMove(r.game, cp2.id, movable[0]!);
          r.revision += 1;
          emitSnapshot(io, r.code);
          scheduleTurnTimeout(io, r);
          scheduleBotTurn(io, r);
        } catch { /* ignore */ }
        return;
      }
    }

    // Auto-skip turn with a forfeited roll effect
    const dice = rollDice();
    try {
      r.game = applyRoll(r.game, cp2.id, dice);
    } catch {
      return;
    }
    r.revision += 1;
    if (r.game.dice === null) {
      scheduleTurnTimeout(io, r);
    }
    emitSnapshot(io, r.code);
    scheduleBotTurn(io, r);
  }, TURN_TIMEOUT_MS);
}

/** If the current player is a bot, auto-roll + move after a short delay */
export function scheduleBotTurn(io: TypedServer, room: RoomData): void {
  if (room.botTimer) clearTimeout(room.botTimer);
  if (room.turnTimer) clearTimeout(room.turnTimer);
  if (room.phase !== "playing" || !room.game) return;

  const currentPlayer = room.players.get(room.game.currentPlayerId);
  if (!currentPlayer?.isBot) return;

  const delay = 600 + crypto.randomInt(400, 1200); // 1-1.8s = "thinking"
  room.botTimer = setTimeout(() => {
    const r = rooms.get(room.code);
    if (!r || r.phase !== "playing" || !r.game) return;
    const cp = r.players.get(r.game.currentPlayerId);
    if (!cp?.isBot) return;

    // Bot rolls
    const dice = rollDice();
    try {
      r.game = applyRoll(r.game, cp.id, dice);
    } catch {
      // If we can't roll, try again later
      return;
    }
    r.revision += 1;
    emitSnapshot(io, r.code);

    // Smarter bot: pick the best token to move. Use the UPDATED player after applyRoll.
    const updatedCp = r.game.players.find((p: GamePlayer) => p.id === cp.id);
    if (!updatedCp || !r.game.dice) return;
    const movableIds = r.game.dice ? legalTokenIds(r.game, updatedCp.id, r.game.dice) : [];
    if (movableIds.length > 0) {
      const diceValue = r.game.dice;
      // Simple strategy: prefer token with highest progress (closest to home)
      let bestId = movableIds[0]!;
      for (const id of movableIds) {
        const t = updatedCp.tokens.find((tk: {id: string}) => tk.id === id);
        if (t && t.progress > (updatedCp.tokens.find((tk: {id: string}) => tk.id === bestId)?.progress ?? -1)) {
          bestId = id;
        }
      }
      // Prefer capturing tokens: check if any move lands on an opponent
      for (const id of movableIds) {
        const t = updatedCp.tokens.find((tk: TokenState) => tk.id === id);
        if (!t || t.progress === -1) continue;
        const dest = t.progress + diceValue;
        const destGlobal = globalSquare(updatedCp.color, dest);
        if (destGlobal === null) continue;
        const anyOpponent = [...r.game.players].some((opp: GamePlayer) => {
          if (opp.id === cp.id) return false;
          return opp.tokens.some((ot: TokenState) => {
            const og = globalSquare(opp.color, ot.progress);
            return og === destGlobal;
          });
        });
        if (anyOpponent) { bestId = id; break; }
      }

      room.botTimer = setTimeout(() => {
        const r2 = rooms.get(room.code);
        if (!r2 || r2.phase !== "playing" || !r2.game) return;
        try {
          r2.game = applyMove(r2.game, cp.id, bestId);
          r2.revision += 1;
          emitSnapshot(io, r2.code);
          scheduleBotTurn(io, r2);
        } catch {
          // Ignore
        }
      }, 400);
    } else {
      // No legal moves, turn already advanced — maybe bot's turn again?
      scheduleBotTurn(io, r);
    }
  }, delay);
}
