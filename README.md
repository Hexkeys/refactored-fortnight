# Quantum Roulette Online

A responsive browser-based quantum probability duel with online two-player multiplayer. Players create a temporary room code and join from separate devices.

## Features

- Five-character room codes for online matches
- Server-authoritative turn order, energy, pulse sequence, and match result
- Hidden randomized pulse sequence; clients never receive the full sequence
- Three energy points per player, targeting, and reloads between rounds
- Responsive dark terminal UI with neon-green accents
- No account or database required for the prototype

## Deploy to Render

This repository includes a `render.yaml` Blueprint. To deploy:

1. Push the repository to GitHub.
2. In Render, choose **New + → Blueprint** and connect this repository.
3. Review the service named `quantum-roulette` and create it.
4. Wait for the build and deploy to finish, then open the generated `.onrender.com` URL.
5. Share that URL with your opponent. One player creates a room and sends the five-character room code; the other joins it from their own device.

Render settings are defined in `render.yaml`: Node runtime, `npm install` build command, `npm start` start command, and `/health` health check. The app listens on the platform-provided `PORT` and Socket.IO supports WebSocket connections.

## Run locally

Requires Node.js 18 or newer.

```sh
npm install
npm start
```

Open http://localhost:3000. For testing on separate devices on the same Wi-Fi, use the host computer's local network IP and port 3000 and allow access through the local firewall.

## Notes

- Rooms are stored in server memory and disappear when the server restarts or sleeps.
- This is a casual prototype, not a ranked or competitive service.
- Use one server instance unless a shared Socket.IO adapter/store is added for multi-instance deployments.
- Do not put private service credentials in client-side code.
- GitHub Pages alone cannot host this online multiplayer server; use the configured Render Node service.
