# Triple Town-ish (Next.js + Bun)

This repository contains a browser-based, single-player, turn-based, grid-based merge puzzle inspired by **Triple Town**.

It was built purely using Kilo Code's App Builder, with OpenAI ChatGPT 5.2 model. See `CONTEXT.md` for more information and the `docs` folder for the prompts used.

## Local setup (repo already cloned)

### Install dependencies

```bash
bun install
```

### Run the linter

```bash
bun lint
```

### Production build

```bash
bun run build
```

### Run locally in development

This repo is a standard Next.js App Router project. For local development you can run:

```bash
bun run dev
```

## Gameplay

- 6×6 grid merge puzzle inspired by Triple Town.
- Place the “next piece” onto an empty cell.
- 3+ orthogonally-connected identical tiles merge upward (with chain reactions).
- Replays can be exported as JSON and re-opened in the replay viewer.

Key implementation references:

- Engine: [`src/lib/gameEngine.ts`](src/lib/gameEngine.ts:1)
- Game UI: [`GameClient()`](src/components/GameClient.tsx:1)
- Replay viewer: [`ReplayViewerClient()`](src/components/ReplayViewerClient.tsx:1)

