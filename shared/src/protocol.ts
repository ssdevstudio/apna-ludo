import { z } from "zod";
import { PLAYER_COLORS } from "./game.js";
import type { GameState } from "./game.js";

export const roomCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/, "Room code must contain six uppercase letters or digits");
export const playerNameSchema = z.string().trim().min(1).max(24);
export const commandIdSchema = z.string().min(1).max(80);
export const reconnectTokenSchema = z.string().min(24).max(200);

export const commandMetaSchema = z.object({
  commandId: commandIdSchema.optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
}).strict();

export const createRoomSchema = z.object({
  name: playerNameSchema,
  maxPlayers: z.number().int().min(2).max(4).default(4),
  color: z.enum(PLAYER_COLORS).optional(),
  commandId: commandIdSchema.optional(),
}).strict();

export const joinRoomSchema = z.object({
  code: roomCodeSchema,
  name: playerNameSchema.optional(),
  reconnectToken: reconnectTokenSchema.optional(),
  color: z.enum(PLAYER_COLORS).optional(),
  commandId: commandIdSchema.optional(),
}).strict().refine((value) => Boolean(value.name || value.reconnectToken), {
  message: "A name or reconnect token is required",
});

export const roomCommandSchema = z.object({
  expectedRevision: z.number().int().nonnegative().optional(),
  commandId: commandIdSchema.optional(),
}).strict();

export const moveTokenSchema = roomCommandSchema.extend({ tokenId: z.string().min(1).max(100) }).strict();

export const chatCommandSchema = z.object({
  text: z.string().trim().min(1).max(300),
  commandId: commandIdSchema.optional(),
}).strict();

export const tokenStateSchema = z.object({
  id: z.string(),
  progress: z.number().int().min(-1).max(57),
}).strict();

export const gamePlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.enum(PLAYER_COLORS),
  status: z.enum(["active", "won", "forfeited"]),
  tokens: z.array(tokenStateSchema).length(4),
}).strict();

export const lastActionSchema = z.object({
  type: z.enum(["rolled", "moved", "turn-skipped", "forfeited"]),
  playerId: z.string(),
  dice: z.number().int().min(1).max(6).optional(),
  tokenId: z.string().optional(),
  capturedTokenIds: z.array(z.string()).optional(),
  starJumped: z.boolean().optional(),
}).strict();

export const gameStateSchema: z.ZodType<GameState> = z.object({
  phase: z.enum(["playing", "finished"]),
  revision: z.number().int().nonnegative(),
  players: z.array(gamePlayerSchema).min(2).max(4),
  currentPlayerId: z.string(),
  dice: z.number().int().min(1).max(6).nullable(),
  movableTokenIds: z.array(z.string()),
  consecutiveSixes: z.number().int().min(0).max(3),
  winners: z.array(z.string()),
  lastAction: lastActionSchema.nullable(),
}).strict();

export interface RoomPlayerSnapshot {
  id: string;
  name: string;
  color: (typeof PLAYER_COLORS)[number];
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  isBot?: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  sentAt: string;
}

export interface RoomSnapshot {
  code: string;
  phase: "lobby" | "playing" | "finished";
  revision: number;
  maxPlayers: number;
  players: RoomPlayerSnapshot[];
  game: GameState | null;
  chat: ChatMessage[];
}

export const roomPlayerSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.enum(PLAYER_COLORS),
  ready: z.boolean(),
  connected: z.boolean(),
  isHost: z.boolean(),
  isBot: z.boolean().optional(),
}).strict();

export const chatMessageSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  text: z.string(),
  sentAt: z.string().datetime(),
}).strict();

export const roomSnapshotSchema: z.ZodType<RoomSnapshot> = z.object({
  code: roomCodeSchema,
  phase: z.enum(["lobby", "playing", "finished"]),
  revision: z.number().int().nonnegative(),
  maxPlayers: z.number().int().min(2).max(4),
  players: z.array(roomPlayerSnapshotSchema).min(1).max(4),
  game: gameStateSchema.nullable(),
  chat: z.array(chatMessageSchema).max(100),
}).strict();

export type ErrorCode =
  | "INVALID_PAYLOAD"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "GAME_ALREADY_STARTED"
  | "NOT_IN_ROOM"
  | "NOT_HOST"
  | "NOT_READY"
  | "NOT_FINISHED"
  | "STALE_REVISION"
  | "COMMAND_FAILED"
  | "RECONNECT_FAILED"
  | "RATE_LIMITED";

export type CommandResult<T = undefined> =
  | ({ ok: true; commandId?: string } & (T extends undefined ? object : T))
  | { ok: false; code: ErrorCode; message: string; commandId?: string; revision?: number };

export interface JoinResult {
  room: RoomSnapshot;
  playerId: string;
  reconnectToken: string;
}

export interface ClientToServerEvents {
  "room:create": (payload: z.input<typeof createRoomSchema>, ack: (result: CommandResult<JoinResult>) => void) => void;
  "room:createWithBot": (payload: z.input<typeof createRoomSchema>, ack: (result: CommandResult<JoinResult>) => void) => void;
  "room:join": (payload: z.input<typeof joinRoomSchema>, ack: (result: CommandResult<JoinResult>) => void) => void;
  "room:ready": (payload: z.input<typeof roomCommandSchema>, ack: (result: CommandResult) => void) => void;
  "room:start": (payload: z.input<typeof roomCommandSchema>, ack: (result: CommandResult) => void) => void;
  "game:roll": (payload: z.input<typeof roomCommandSchema>, ack: (result: CommandResult) => void) => void;
  "game:move": (payload: z.input<typeof moveTokenSchema>, ack: (result: CommandResult) => void) => void;
  "chat:send": (payload: z.input<typeof chatCommandSchema>, ack: (result: CommandResult) => void) => void;
  "room:rematch": (payload: z.input<typeof roomCommandSchema>, ack: (result: CommandResult) => void) => void;
  "room:leave": (payload: z.input<typeof roomCommandSchema>, ack: (result: CommandResult) => void) => void;
}

export interface ServerToClientEvents {
  "room:snapshot": (snapshot: RoomSnapshot) => void;
  "chat:message": (message: ChatMessage) => void;
  "server:error": (error: { code: ErrorCode; message: string }) => void;
}

export interface InterServerEvents {}
export interface SocketData {
  roomCode?: string;
  playerId?: string;
}
