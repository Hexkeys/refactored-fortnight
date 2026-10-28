const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 3000;
const rooms = new Map();

app.use(express.static(path.join(__dirname)));
app.get("/health", (_req, res) => res.json({ ok: true, service: "quantum-roulette" }));

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}
function makePulses() {
  const count = 6 + Math.floor(Math.random() * 3);
  const charged = Math.max(1, Math.floor(count * (0.35 + Math.random() * 0.3)));
  return Array.from({ length: count }, (_, i) => i < charged ? "charged" : "empty")
    .sort(() => Math.random() - 0.5);
}
function publicRoom(room, viewerId) {
  return {
    code: room.code,
    status: room.players.length < 2 ? "waiting" : room.over ? "over" : "playing",
    maxPlayers: 10,
    players: room.players.map(p => ({ name: p.name, hp: p.hp, connected: p.connected })),
    viewerIndex: room.players.findIndex(p => p.id === viewerId),
    turn: room.turn,
    round: room.round,
    remaining: room.pulses.length,
    chargedRemaining: room.pulses.filter(p => p === "charged").length,
    log: room.log.slice(0, 12),
    winner: room.winner || null
  };
}
function sendRoom(room) {
  for (const player of room.players) {
    if (player.id) io.to(player.id).emit("room:update", publicRoom(room, player.id));
  }
}
function addLog(room, message) {
  room.log.unshift(message);
  room.log = room.log.slice(0, 30);
}
function startRound(room) {
  room.pulses = makePulses();
  addLog(room, `Round ${String(room.round).padStart(2, "0")} initialized. Pulse sequence concealed.`);
}
function safeName(name, fallback) {
  const clean = String(name || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 18);
  return clean || fallback;
}

io.on("connection", socket => {
  const playerToken = String(socket.handshake.auth && socket.handshake.auth.playerToken || "");
  if (playerToken) {
    for (const room of rooms.values()) {
      const returning = room.players.find(p => p.token === playerToken);
      if (returning) { returning.id = socket.id; returning.connected = true; socket.data.roomCode = room.code; socket.join(room.code); addLog(room, returning.name + " reconnected."); sendRoom(room); break; }
    }
  }
  socket.on("room:create", ({ name } = {}, reply = () => {}) => {
    const code = makeCode();
    const room = {
      code, players: [{ id: socket.id, token: playerToken, name: safeName(name, "Player One"), hp: 3, connected: true }],
      turn: 0, round: 1, pulses: [], log: [], over: false, winner: null
    };
    rooms.set(code, room);
    socket.data.roomCode = code;
    socket.join(code);
    addLog(room, "Room created. Invite up to nine more players.");
    reply({ ok: true, code });
    sendRoom(room);
  });

  socket.on("room:join", ({ code, name } = {}, reply = () => {}) => {
    const normalized = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    const room = rooms.get(normalized);
    if (!room) return reply({ ok: false, error: "Room not found. Check the code and try again." });
    if (room.over) return reply({ ok: false, error: "That match has ended. Create a new room for another game." });
    if (room.players.length >= 10) return reply({ ok: false, error: "That room is full (10 players maximum)." });
    if (room.players.some(p => p.id === socket.id)) return reply({ ok: false, error: "You are already in this room." });
    room.players.push({ id: socket.id, token: playerToken, name: safeName(name, `Player ${room.players.length + 1}`), hp: 3, connected: true });
    socket.data.roomCode = normalized;
    socket.join(normalized);
    if (room.players.length === 2) {
      room.turn = 0;
      room.over = false;
      room.winner = null;
      room.round = 1;
      startRound(room);
    }
    addLog(room, `${room.players[room.players.length - 1].name} joined (${room.players.length}/10 players).`);
    reply({ ok: true, code: normalized });
    sendRoom(room);
  });

  socket.on("game:act", ({ target } = {}, reply = () => {}) => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    if (!room) return reply({ ok: false, error: "Room connection was lost. Create or join a room again." });
    const actor = room.players.findIndex(p => p.id === socket.id);
    if (actor < 0 || room.players.length < 2 || room.over) return reply({ ok: false, error: "The match is not active." });
    if (room.turn !== actor) return reply({ ok: false, error: "It is not your turn." });
    if (!room.pulses.length) return reply({ ok: false, error: "The sequence is empty. Reload first." });
    const targetIndex = target === "self" ? actor : Number.isInteger(target) ? target : target === "opponent" ? room.players.findIndex((p, i) => i !== actor && p.hp > 0) : -1;
    if (targetIndex < 0 || targetIndex >= room.players.length || room.players[targetIndex].hp <= 0) return reply({ ok: false, error: "Choose an active player." });

    const pulse = room.pulses.shift();
    const shooter = room.players[actor];
    const targetPlayer = room.players[targetIndex];
    if (pulse === "charged") {
      targetPlayer.hp = Math.max(0, targetPlayer.hp - 1);
      addLog(room, `${shooter.name} triggered a CHARGED pulse at ${targetPlayer.name}.`);
    } else {
      addLog(room, `${shooter.name} triggered an EMPTY pulse at ${targetIndex === actor ? "themself" : targetPlayer.name}.`);
    }

    const alive = room.players.filter(p => p.hp > 0);
    if (alive.length <= 1) {
      room.over = true;
      room.winner = alive[0]?.name || "Nobody";
      addLog(room, `${targetPlayer.name} is out of energy. ${room.winner} wins.`);
    } else if (pulse === "empty" && targetIndex === actor) {
      addLog(room, `${shooter.name} keeps the turn.`);
    } else {
      let next = actor;
      for (let step = 0; step < room.players.length; step++) {
        next = (next + 1) % room.players.length;
        if (room.players[next].hp > 0 && room.players[next].connected) break;
      }
      room.turn = next;
    }
    if (!room.over && room.pulses.length === 0) addLog(room, "Sequence empty. Any player can reload for the next round.");
    reply({ ok: true });
    sendRoom(room);
  });

  socket.on("game:reload", (_payload, reply = () => {}) => {
    const room = socket.data.roomCode && rooms.get(socket.data.roomCode);
    if (!room || room.players.length < 2 || room.over) return reply({ ok: false, error: "No active match to reload." });
    if (room.pulses.length) return reply({ ok: false, error: "Reload is only available when the chamber is empty." });
    room.round += 1;
    startRound(room);
    addLog(room, `${room.players.find(p => p.id === socket.id)?.name || "A player"} reloaded the chamber.`);
    reply({ ok: true });
    sendRoom(room);
  });

  socket.on("room:leave", () => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    if (room) {
      const index = room.players.findIndex(p => p.id === socket.id);
      const leaving = index >= 0 ? room.players[index] : null;
      if (index >= 0) room.players.splice(index, 1);
      addLog(room, (leaving ? leaving.name : "A player") + " left the room.");
      if (!room.players.length) rooms.delete(code);
      else {
        if (room.turn >= room.players.length) room.turn = 0;
        if (room.players.length < 2) { room.pulses = []; room.over = false; room.winner = null; room.turn = 0; }
        sendRoom(room);
      }
    }
    socket.leave(code);
    delete socket.data.roomCode;
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    const room = code && rooms.get(code);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    player.id = null;
    player.connected = false;
    addLog(room, player.name + " disconnected. They can reconnect to reclaim their seat.");
    if (room.turn === room.players.indexOf(player)) {
      for (let step = 1; step <= room.players.length; step++) {
        const next = (room.turn + step) % room.players.length;
        if (room.players[next].hp > 0 && room.players[next].connected) { room.turn = next; break; }
      }
    }
    sendRoom(room);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Quantum Roulette listening on port ${PORT}`);
});
