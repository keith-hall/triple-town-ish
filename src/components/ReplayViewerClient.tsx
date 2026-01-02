"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createNewGame,
  isReplayV1,
  placeNextPiece,
  tileDisplayName,
  type GameState,
  type ReplayV1,
} from "@/lib/gameEngine";
import { parseReplayJson } from "@/lib/storage";
import { GameBoard } from "./GameBoard";
import { TileView } from "./TileView";

function computeStateAt(replay: ReplayV1, step: number): GameState {
  let state = createNewGame(replay.seed);
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
  const [replay, setReplay] = useState<ReplayV1 | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
              if (!parsed || !isReplayV1(parsed)) {
                setReplay(null);
                setStep(0);
                setError("Invalid replay JSON (expected version:1, gridSize:6, seed:number, moves:[{x,y}]).");
                return;
              }
              setReplay(parsed);
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
