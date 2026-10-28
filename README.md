# Buckshot // Quantum

A lightweight, browser-based Buckshot Roulette-inspired game prototype.

## Run locally

Open `index.html` in a modern browser. No build step, package installation, or server is required.

## Current gameplay

- Local pass-and-play for two players on one device
- Three health points per player
- Randomized chamber containing live and blank shells
- Take a shot at yourself or your opponent
- A blank shot at yourself grants another turn
- Reload after the chamber is empty
- Match log and responsive dark UI

## Multiplayer status

This prototype supports **local two-player pass-and-play**, not online matchmaking. Real online multiplayer needs a shared server or realtime service to synchronize rooms, turns, and hidden chamber state securely. Do not put private service credentials in client-side code.

## Project structure

- `index.html` — complete standalone game, styling, and gameplay logic
