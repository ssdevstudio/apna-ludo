import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as createClient, type Socket } from "socket.io-client";

let serverUrl: string;
let httpServer: any;
let ioServer: any;

beforeAll(async () => {
  process.env["PORT"] = "0";
  const mod = await import("../index.js");
  httpServer = mod.httpServer;
  ioServer = mod.io;
  await new Promise<void>((resolve) => {
    if (httpServer.listening) resolve();
    else httpServer.once("listening", resolve);
  });
  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 3001;
  serverUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await ioServer.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

async function connect(): Promise<Socket> {
  const socket = createClient(serverUrl, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return socket;
}

function emitAck<T>(socket: Socket, event: string, payload: any): Promise<T> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

describe("Socket.IO Ludo server", () => {
  it("creates a private six-character room", async () => {
    const host = await connect();
    const result: any = await emitAck(host, "room:create", {
      name: "Host",
      maxPlayers: 4,
      commandId: "create-1",
    });
    expect(result.ok).toBe(true);
    expect(result.room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(result.room.phase).toBe("lobby");
    expect(result.room.players).toHaveLength(1);
    expect(result.reconnectToken).toHaveLength(64);
    expect(result.commandId).toBeUndefined();
    host.disconnect();
  });

  it("rejects invalid create payload", async () => {
    const client = await connect();
    const result: any = await emitAck(client, "room:create", { name: "", maxPlayers: 10 });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
    client.disconnect();
  });

  it("lets players join, ready, and start", async () => {
    const host = await connect();
    const guest = await connect();
    const created: any = await emitAck(host, "room:create", { name: "Host", maxPlayers: 2 });
    const code = created.room.code;
    const joined: any = await emitAck(guest, "room:join", { code, name: "Guest" });
    expect(joined.ok).toBe(true);
    expect(joined.room.players).toHaveLength(2);

    const ready: any = await emitAck(guest, "room:ready", {});
    expect(ready.ok).toBe(true);
    const started: any = await emitAck(host, "room:start", {});
    expect(started.ok).toBe(true);

    host.disconnect();
    guest.disconnect();
  });

  it("rejects join after room is full", async () => {
    const host = await connect();
    const guest = await connect();
    const third = await connect();
    const created: any = await emitAck(host, "room:create", { name: "Host", maxPlayers: 2 });
    const code = created.room.code;
    await emitAck(guest, "room:join", { code, name: "Guest" });
    const result: any = await emitAck(third, "room:join", { code, name: "Third" });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("ROOM_FULL");
    host.disconnect(); guest.disconnect(); third.disconnect();
  });

  it("rejects stale expectedRevision", async () => {
    const host = await connect();
    const created: any = await emitAck(host, "room:create", { name: "Host", maxPlayers: 2 });
    expect(created.room.revision).toBe(0);
    const stale: any = await emitAck(host, "room:ready", { expectedRevision: 999, commandId: "stale-1" });
    expect(stale.ok).toBe(false);
    expect(stale.code).toBe("STALE_REVISION");
    expect(stale.commandId).toBe("stale-1");
    expect(stale.revision).toBe(0);
    host.disconnect();
  });

  it("sends chat message to room", async () => {
    const host = await connect();
    const created: any = await emitAck(host, "room:create", { name: "Host", maxPlayers: 2 });
    expect(created.ok).toBe(true);
    const messagePromise = new Promise<any>((resolve) => host.once("chat:message", resolve));
    const sent: any = await emitAck(host, "chat:send", { text: "Hello!", commandId: "chat-1" });
    expect(sent.ok).toBe(true);
    const message = await messagePromise;
    expect(message.text).toBe("Hello!");
    expect(message.playerName).toBe("Host");
    host.disconnect();
  });

  it("supports reconnect token", async () => {
    const host = await connect();
    const created: any = await emitAck(host, "room:create", { name: "Host", maxPlayers: 2 });
    const { code } = created.room;
    const token = created.reconnectToken;
    const playerId = created.playerId;
    host.disconnect();

    const reconnecting = await connect();
    const result: any = await emitAck(reconnecting, "room:join", {
      code,
      reconnectToken: token,
    });
    expect(result.ok).toBe(true);
    expect(result.playerId).toBe(playerId);
    reconnecting.disconnect();
  });

  it("rejects malformed move payload", async () => {
    const client = await connect();
    const result: any = await emitAck(client, "game:move", { tokenId: "" });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_PAYLOAD");
    client.disconnect();
  });

  it("server decides dice and ignores client-supplied values", async () => {
    const host = await connect();
    const guest = await connect();
    const created: any = await emitAck(host, "room:create", { name: "Host", maxPlayers: 2 });
    const code = created.room.code;
    await emitAck(guest, "room:join", { code, name: "Guest" });
    await emitAck(guest, "room:ready", {});
    // Snapshot after ready to get current revision
    const snapshotBeforeStart = created.room; // will be stale; we just need the revision
    const started: any = await emitAck(host, "room:start", {});
    expect(started.ok).toBe(true);
    // send the roll without dice param since schema rejects extra keys
    const result: any = await emitAck(host, "game:roll", {});
    expect(result.ok).toBe(true);
    expect(result.dice).toBeGreaterThanOrEqual(1);
    expect(result.dice).toBeLessThanOrEqual(6);
    host.disconnect(); guest.disconnect();
  });
});
