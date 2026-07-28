import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  createRoomSchema,
  joinRoomSchema,
  roomCommandSchema,
  moveTokenSchema,
  chatCommandSchema,
  roomReactSchema,
  commandMetaSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type InterServerEvents,
  type SocketData,
  type CommandResult,
} from "@apna-ludo/shared";
import {
  createRoom,
  createRoomWithComputer,
  joinRoom,
  handleReady,
  handleStart,
  handleRematch,
  handleRoll,
  handleMove,
  handleForfeit,
  handleDisconnect,
  addChatMessage,
  handleLeave,
  getRoomData,
  getRoom,
  broadcastReaction,
} from "./room-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPort = process.env["PORT"];
const PORT = rawPort === undefined ? 3001 : Number(rawPort);

const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});
const ORIGIN = process.env["CORS_ORIGIN"] || (process.env["NODE_ENV"] === "production" ? false : "http://localhost:5173");
app.use(cors({ origin: ORIGIN === "*" ? "*" : ORIGIN ? ORIGIN.split(",") : false }));
app.use(express.json({ limit: '10kb' }));

const httpServer = createServer(app);

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
const io: TypedServer = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: { origin: ORIGIN === "*" ? "*" : ORIGIN ? ORIGIN.split(",") : false, methods: ["GET", "POST"] },
  },
);

// Per-socket rate limiting: 5 events/sec per event type
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_EVENTS = 5;
type RateLimitMap = Map<string, number[]>;
const rateLimits = new WeakMap<SocketData, RateLimitMap>();

function checkRateLimit(socketData: SocketData, eventType: string): boolean {
  let limits = rateLimits.get(socketData);
  if (!limits) {
    limits = new Map();
    rateLimits.set(socketData, limits);
  }
  const now = Date.now();
  const timestamps = limits.get(eventType) ?? [];
  const recent = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_EVENTS) return false;
  recent.push(now);
  limits.set(eventType, recent);
  return true;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.post("/api/room", (req, res) => {
  const rawName = req.body?.name;
  const name = (typeof rawName === "string" ? rawName.trim() : "Player") || "Player";
  if (name.length > 20) { res.status(400).json({ ok: false, error: "NAME_TOO_LONG" }); return; }
  const maxPlayers = Math.min(4, Math.max(2, req.body?.maxPlayers || 4));
  const vsComputerRaw = req.body?.vsComputer;
  if (vsComputerRaw !== undefined && typeof vsComputerRaw !== "boolean") {
    res.status(400).json({ ok: false, error: "INVALID_VS_COMPUTER" }); return;
  }
  const isVsBot = vsComputerRaw === true;
  if (isVsBot) {
    const result = createRoomWithComputer(io, name, "", req.body?.color, maxPlayers);
    if (result.ok) {
      res.json({ ok: true, room: result.room, playerId: result.playerId, reconnectToken: result.reconnectToken });
    } else {
      res.status(500).json(result);
    }
  } else {
    const result = createRoom(io, name, maxPlayers, "", req.body?.color);
    if (result.ok) {
      res.json({ ok: true, room: result.room, playerId: result.playerId, reconnectToken: result.reconnectToken });
    } else {
      res.status(500).json(result);
    }
  }
});

// Allow the host to "claim" their socket for a room
app.post("/api/room/:code/claim", (req, res) => {
  const code = req.params["code"]!.toUpperCase();
  const { playerId, reconnectToken } = req.body || {};
  if (!playerId) { res.status(400).json({ ok: false, error: "MISSING_PLAYER_ID" }); return; }
  if (!reconnectToken) { res.status(400).json({ ok: false, error: "MISSING_RECONNECT_TOKEN" }); return; }
  const room = getRoom(code);
  if (!room) { res.status(404).json({ ok: false, error: "ROOM_NOT_FOUND" }); return; }
  const player = room.players?.get(playerId);
  if (!player) { res.status(404).json({ ok: false, error: "PLAYER_NOT_FOUND" }); return; }
  if (player.reconnectToken !== reconnectToken) { res.status(403).json({ ok: false, error: "INVALID_TOKEN" }); return; }
  res.json({ ok: true });
});

app.get("/api/room/:code", (req, res) => {
  const snapshot = getRoomData(req.params["code"]!.toUpperCase());
  if (!snapshot) {
    res.status(404).json({ ok: false, error: "ROOM_NOT_FOUND" });
    return;
  }
  res.json({ ok: true, room: snapshot });
});

app.get("/api/room/:code/preview", (req, res) => {
  const room = getRoom(req.params["code"]!.toUpperCase());
  if (!room) {
    res.status(404).json({ ok: false, error: "ROOM_NOT_FOUND" });
    return;
  }
  
  const usedColors: string[] = [];
  for (const [, p] of room.players) {
    usedColors.push(p.color);
  }
  
  res.json({ 
    ok: true, 
    maxPlayers: room.maxPlayers, 
    currentPlayers: room.players.size,
    phase: room.phase,
    usedColors 
  });
});

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
// SPA fallback — serve index.html for client-side routes
app.use((_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

io.on("connection", (socket) => {
  socket.data = {};

  const commandCache = new Map<string, CommandResult<any>>();
  const withIdempotency = <T extends CommandResult<any>>(commandId: string | undefined, run: () => T): T => {
    if (!commandId) return run();
    const cached = commandCache.get(commandId);
    if (cached) return cached as T;
    const result = run();
    commandCache.set(commandId, result);
    if (commandCache.size > 200) commandCache.delete(commandCache.keys().next().value!);
    return result;
  };

  socket.on("room:create", (payload, ack) => {
    const parsed = createRoomSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message, commandId: payload?.commandId });
      return;
    }
    if (!checkRateLimit(socket.data, "create")) {
      ack({ ok: false, code: "RATE_LIMITED", message: "Too many create attempts — slow down" });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      createRoom(io, parsed.data.name, parsed.data.maxPlayers, socket.id, parsed.data.color),
    );
    if (result.ok) {
      socket.data.roomCode = result.room.code;
      socket.join(result.room.code);
    }
    ack(result);
  });

  socket.on("room:createWithBot", (payload, ack) => {
    const parsed = createRoomSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message, commandId: payload?.commandId });
      return;
    }
    if (!checkRateLimit(socket.data, "create")) {
      ack({ ok: false, code: "RATE_LIMITED", message: "Too many create attempts — slow down" });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      createRoomWithComputer(io, parsed.data.name, socket.id),
    );
    if (result.ok) {
      socket.data.roomCode = result.room.code;
      socket.join(result.room.code);
    }
    ack(result);
  });

  socket.on("room:join", (payload, ack) => {
    const parsed = joinRoomSchema.safeParse(payload);
    if (!parsed.success) {
      ack({
        ok: false,
        code: "INVALID_PAYLOAD",
        message: parsed.error.message,
        commandId: payload?.commandId,
      });
      return;
    }
    if (!checkRateLimit(socket.data, "join")) {
      ack({ ok: false, code: "RATE_LIMITED", message: "Too many join attempts — slow down" });
      return;
    }
    const roomCode = parsed.data.code.toUpperCase();
    const result = joinRoom(
      io,
      roomCode,
      socket.id,
      parsed.data.name,
      parsed.data.reconnectToken,
      parsed.data.color,
    );
    if (result.ok) {
      socket.data.roomCode = roomCode;
      socket.join(roomCode);
    }
    ack(result);
  });

  socket.on("room:ready", (payload, ack) => {
    const parsed = roomCommandSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      handleReady(io, socket.id, parsed.data.expectedRevision, parsed.data.commandId),
    );
    ack(result);
  });

  socket.on("room:start", (payload, ack) => {
    const parsed = roomCommandSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      handleStart(io, socket.id, parsed.data.expectedRevision, parsed.data.commandId),
    );
    ack(result);
  });

  socket.on("game:roll", (payload, ack) => {
    const parsed = roomCommandSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message });
      return;
    }
    if (!checkRateLimit(socket.data, "roll")) {
      ack({ ok: false, code: "RATE_LIMITED", message: "Too many rolls — slow down" });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      handleRoll(io, socket.id, parsed.data.expectedRevision, parsed.data.commandId),
    );
    ack(result);
  });

  socket.on("game:move", (payload, ack) => {
    const parsed = moveTokenSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message });
      return;
    }
    if (!checkRateLimit(socket.data, "move")) {
      ack({ ok: false, code: "RATE_LIMITED", message: "Too many moves — slow down" });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      handleMove(io, socket.id, parsed.data.tokenId, parsed.data.expectedRevision, parsed.data.commandId),
    );
    ack(result);
  });

  socket.on("chat:send", (payload, ack) => {
    const parsed = chatCommandSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message });
      return;
    }
    if (!checkRateLimit(socket.data, "chat")) {
      ack({ ok: false, code: "RATE_LIMITED", message: "Too many messages — slow down" });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      addChatMessage(io, socket.id, parsed.data.text, parsed.data.commandId),
    );
    ack(result);
  });

  socket.on("room:react", (payload, ack) => {
    const parsed = roomReactSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message });
      return;
    }
    if (!checkRateLimit(socket.data, "chat")) {
      ack({ ok: false, code: "RATE_LIMITED", message: "Too many reactions" });
      return;
    }
    const roomCode = socket.data.roomCode;
    if (!roomCode) {
      ack({ ok: false, code: "NOT_IN_ROOM", message: "Not in room" });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      broadcastReaction(io, roomCode, socket.id, parsed.data.emoji)
    );
    ack(result);
  });

  socket.on("room:rematch", (payload, ack) => {
    const parsed = roomCommandSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      handleRematch(io, socket.id, parsed.data.expectedRevision, parsed.data.commandId),
    );
    ack(result);
  });

  socket.on("room:leave", (payload, ack) => {
    const parsed = roomCommandSchema.safeParse(payload);
    if (!parsed.success) {
      ack({ ok: false, code: "INVALID_PAYLOAD", message: parsed.error.message });
      return;
    }
    const result = withIdempotency(parsed.data.commandId, () =>
      handleLeave(io, socket.id, parsed.data.expectedRevision, parsed.data.commandId),
    );
    if (result.ok) {
      const roomCode = [...socket.rooms].find((r) => r !== socket.id);
      if (roomCode) socket.leave(roomCode);
    }
    ack(result);
  });

  socket.on("disconnect", () => {
    handleDisconnect(io, socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});

export { app, httpServer, io };







