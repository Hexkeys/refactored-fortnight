# Quantum Roulette Online

A dark, neon-green, browser-based quantum probability duel with online multiplayer room codes.

## Features

- Create a temporary five-character room code and share it with a friend
- Two players join from separate devices or browser tabs
- Server-authoritative turn order, energy, pulse sequence, and match result
- Hidden random pulse order; the browser never receives the full sequence
- Three energy points per player, turn-based targeting, and reloads between rounds
- Responsive interface, match log, and copy-code action
- No account or database required for the basic prototype

## Run locally

Requires Node.js 18 or newer.

```sh
npm install
npm start
``

Open http://localhost:3000. For testing on separate devices on the same Wi-Fi, use the host computer's local network IP and port 3000 (make sure your network firewall allows it).

## Deploy for online play

Deploy this repository as a **Node.js web service** on a host that supports long-lived WebSocket connections. Use:

- Build/install command: `npm install`
- Start command: `npm start`
- Health check (optional): `/health`

The server listens on the port provided by the hosting platform. After deployment, both players visit the same public HTTPS URL. Static-only hosting such as GitHub Pages cannot run this server by itself.

## Notes

- Rooms are stored in memory and are temporary. Restarting the server clears all rooms.
- This prototype is designed for casual two-player matches, not ranked or competitive play.
- Use a single server instance unless you add a shared adapter/store for multi-instance Socket.IO deployments.
- Do not put secrets in client-side code.
