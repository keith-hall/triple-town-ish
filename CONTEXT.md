# Triple-Town-like Merge Puzzle (Next.js)

This repository contains a browser-based, single-player, turn-based, grid-based merge puzzle inspired by **Triple Town**.

## Goals

- Provide a deterministic merge-puzzle game on a fixed **6×6** grid.
- Preserve the “place 1 piece → resolve merges (chain reactions) → repeat” loop.
- Support **replays** via JSON export/import (seeded RNG + recorded player moves).
- Persist **high scores** locally so players can compete on the same device/browser.

## Key features implemented

- Deterministic game engine with a seeded PRNG and reproducible outcomes.
- Merge rules: 3+ orthogonally-connected identical tiles merge upward, with chain reactions.
- Larger merges (4, 5, … tiles) apply a small score bonus multiplier.
- Special tiles:
  - Rocks (blockers)
  - Bears (move after each turn; become Gravestones when trapped)
  - Gravestones → Churches → Cathedrals (merge chain)
  - Crystals (wildcard: can join a merge group to complete 3+; if placed and not merged, they turn into Rocks)
- Configurable settings (stored in `localStorage`): spawn rocks/bears/crystals; whether newly placed bears move immediately.
- New games start with **0–5** random tiles (deterministic from the seed).
- Replay system:
  - Records initial seed + settings + every player placement (including which tile was placed)
  - Export replay JSON
  - Import replay JSON and step through move-by-move
- High score table stored in `localStorage` (clicking an entry opens its replay).
- SVG-based tile icons and animated bear movement for clarity.

## Architecture notes

- Core rules live in [`src/lib/gameEngine.ts`](src/lib/gameEngine.ts:1).
  - All randomness comes from the engine PRNG state so replays are deterministic.
  - The UI treats the engine as a pure-ish state transition system.
- UI is implemented as client components where interactivity is required.
  - Main menu is server-rendered but uses a client component for high scores.

## Conventions

- Server Components by default; add `"use client"` only for interactive screens.
- Replays are versioned (`version: 1`) to allow schema evolution.

## Major changes log

- 2026-01-02: Initial implementation of game engine, game UI, replay export/import, and high scores.
- 2026-01-02: Added configurable spawns, replay settings (v2), initial random seeding, SVG tile icons, and bear movement animation.
- 2026-01-02: Replay v3 includes the placed tile per move; crystals turn into rocks if not merged; initial seeding avoids starting merges.
