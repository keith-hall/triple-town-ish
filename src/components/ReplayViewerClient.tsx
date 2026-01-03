"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createNewGame,
  isReplayV1,
  isReplayV2,
  isReplayV3,
  placeNextPiece,
  tileDisplayName,
  type Replay,
  type GameState,
  type ReplayV2,
  type ReplayV3,
} from "@/lib/gameEngine";
import { consumeReplayToOpen, parseReplayJson } from "@/lib/storage";
import { GameBoard } from "./GameBoard";
import { TileView } from "./TileView";

function toReplayV2(replay: Replay): ReplayV2 {
  if (replay.version === 2) return replay;
  if (replay.version === 3) {
    return {
      version: 2,
      createdAt: replay.createdAt,
      gridSize: replay.gridSize,
      seed: replay.seed,
      settings: replay.settings,
      moves: replay.moves.map((m) => ({ x: m.x, y: m.y })),
    };
  }
  return {
    version: 2,
    createdAt: replay.createdAt,
    gridSize: replay.gridSize,
    seed: replay.seed,
    settings: {
      version: 1,
      spawnRocks: true,
      spawnBears: true,
      spawnCrystals: true,
      crackRocksOnAdjacentMerge: false,
      // Legacy behavior: bears moved on the same turn they were placed.
      newBearsMoveImmediately: true,
      // Legacy behavior: games started with an empty grid.
      initialRandomTilesMax: 0,
    },
    moves: replay.moves,
  };
}

function computeStateAt(replayAny: Replay, step: number): GameState {
  // For deterministic playback, v3 replays force the placed piece each turn.
  if (replayAny.version === 3) {
    const replay = replayAny as ReplayV3;
    let state = createNewGame(replay.seed, replay.settings);
    const clamped = Math.max(0, Math.min(step, replay.moves.length));
    for (let i = 0; i < clamped; i++) {
      const move = replay.moves[i]!;
      state = { ...state, nextPiece: move.piece };
      const res = placeNextPiece(state, { x: move.x, y: move.y });
      if (!res.ok) break;
      state = res.state;
    }
    return state;
  }

  const replay = toReplayV2(replayAny);
  let state = createNewGame(replay.seed, replay.settings);
  const clamped = Math.max(0, Math.min(step, replay.moves.length));
  for (let i = 0; i < clamped; i++) {
    const res = placeNextPiece(state, replay.moves[i]!);
    if (!res.ok) break;
    state = res.state;
  }
  return state;
}

export function ReplayViewerClient(): ReactNode {
  const [text, setText] = useState<string>("");
  const [replay, setReplay] = useState<Replay | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pending = consumeReplayToOpen();
    if (!pending) return;
    setReplay(pending);
    setText(JSON.stringify(pending, null, 2));
    setStep(0);
    setError(null);
  }, []);

  const state = useMemo(() => {
    if (!replay) return null;
    return computeStateAt(replay, step);
  }, [replay, step]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Replay Viewer</h1>
          <p className="text-sm text-zinc-600">Paste a replay JSON and step through moves.</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50" href="/">
            Main menu
          </Link>
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50" href="/game">
            New game
          </Link>
        </div>
      </header>

      <section className="rounded-xl border bg-white p-4">
        <label className="text-sm font-semibold">Replay JSON</label>
        <textarea
          className="mt-2 h-44 w-full rounded-md border p-3 font-mono text-xs"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{"version":1,"seed":123,...}'
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={() => {
              setError(null);
              const parsed = parseReplayJson(text);
              if (!parsed || (!isReplayV3(parsed) && !isReplayV2(parsed) && !isReplayV1(parsed))) {
                setReplay(null);
                setStep(0);
                setError(
                  "Invalid replay JSON (expected version:3, or older version:2/version:1).",
                );
                return;
              }
              setReplay(parsed as Replay);
              setStep(0);
            }}
          >
            Load replay
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={() => {
              setText("");
              setReplay(null);
              setStep(0);
              setError(null);
            }}
          >
            Clear
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </section>

      {replay && state ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border bg-white p-4">
            <GameBoard grid={state.grid} onCellClick={() => {}} disabled={true} />
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-600">Score</div>
                  <div className="text-2xl font-bold tabular-nums">{state.score}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-600">Step</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {step}/{replay.moves.length}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-zinc-600">Next piece</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-12 w-12">
                    <TileView kind={state.nextPiece} />
                  </div>
                  <div className="text-sm font-semibold">{tileDisplayName(state.nextPiece)}</div>
                </div>
              </div>

              {replay.version === 2 || replay.version === 3 ? (
                <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
                  <div className="font-semibold">Settings</div>
                  <div className="mt-1 space-y-1">
                    <div>Spawn rocks: {String(replay.settings.spawnRocks)}</div>
                    <div>Spawn bears: {String(replay.settings.spawnBears)}</div>
                    <div>Spawn crystals: {String(replay.settings.spawnCrystals)}</div>
                    <div>
                      New bears move immediately: {String(replay.settings.newBearsMoveImmediately)}
                    </div>
                    <div>Initial random tiles max: {replay.settings.initialRandomTilesMax}</div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                  disabled={step <= 0}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                  disabled={step >= replay.moves.length}
                  onClick={() => setStep((s) => Math.min(replay.moves.length, s + 1))}
                >
                  Next
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                  disabled={replay.moves.length === 0}
                  onClick={() => setStep(0)}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                  disabled={replay.moves.length === 0}
                  onClick={() => setStep(replay.moves.length)}
                >
                  End
                </button>
              </div>
              {step > 0 ? (
                <p className="mt-3 text-sm text-zinc-600">
                  Last move: ({replay.moves[step - 1]!.x}, {replay.moves[step - 1]!.y})
                  {replay.version === 3 ? (
                    <span className="ml-2">[{replay.moves[step - 1]!.piece}]</span>
                  ) : null}
                </p>
              ) : (
                <p className="mt-3 text-sm text-zinc-600">Step 0 is the initial state.</p>
              )}
            </div>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
