"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createNewGame,
  generateSeed,
  isReplayV1,
  placeNextPiece,
  tileDisplayName,
  type Coord,
  type GameState,
  type ReplayV1,
} from "@/lib/gameEngine";
import { copyTextToClipboard, downloadJson, saveHighScore } from "@/lib/storage";
import { GameBoard } from "./GameBoard";
import { TileView } from "./TileView";

export function GameClient(): ReactNode {
  const [seed, setSeed] = useState<number>(() => generateSeed());
  const [state, setState] = useState<GameState>(() => createNewGame(seed));
  const [moves, setMoves] = useState<Coord[]>([]);
  const [copied, setCopied] = useState(false);
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());

  const replay: ReplayV1 = useMemo(
    () => ({
      version: 1,
      createdAt,
      gridSize: 6,
      seed,
      moves,
    }),
    [createdAt, moves, seed],
  );

  useEffect(() => {
    // If seed changes, reinitialize.
    setState(createNewGame(seed));
    setMoves([]);
    setCreatedAt(new Date().toISOString());
  }, [seed]);

  useEffect(() => {
    if (!state.gameOver) return;
    saveHighScore({
      score: state.score,
      finishedAt: new Date().toISOString(),
      seed,
      moves: moves.length,
    });
  }, [moves.length, seed, state.gameOver, state.score]);

  function newGame(): void {
    setSeed(generateSeed());
  }

  function onCellClick(coord: Coord): void {
    const res = placeNextPiece(state, coord);
    if (!res.ok) return;
    setState(res.state);
    setMoves((m) => [...m, coord]);
  }

  const replayJsonText = useMemo(() => JSON.stringify(replay, null, 2), [replay]);
  const replaySeemsValid = useMemo(() => isReplayV1(replay), [replay]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Triple Town-ish</h1>
          <p className="text-sm text-zinc-600">
            Place <span className="font-semibold">1</span> tile, resolve merges, repeat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50" href="/">
            Main menu
          </Link>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={newGame}
          >
            New game
          </button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-white p-4">
          <GameBoard grid={state.grid} onCellClick={onCellClick} disabled={state.gameOver} />
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-600">Score</div>
                <div className="text-2xl font-bold tabular-nums">{state.score}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-600">Turn</div>
                <div className="text-lg font-semibold tabular-nums">{state.turn}</div>
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

            <div className="mt-4 text-sm text-zinc-700">
              <div className="flex items-center justify-between">
                <span>Last turn merges</span>
                <span className="tabular-nums font-semibold">{state.lastTurn.chainMerges}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last turn points</span>
                <span className="tabular-nums font-semibold">{state.lastTurn.pointsEarned}</span>
              </div>
            </div>

            {state.gameOver ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Game over — the grid is full.
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border bg-white p-4">
            <h2 className="text-lg font-semibold">Replay</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Replays store the initial seed and each placement.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
                onClick={() => downloadJson(`replay-${seed}.json`, replay)}
                disabled={!replaySeemsValid}
              >
                Download JSON
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
                onClick={async () => {
                  setCopied(false);
                  const ok = await copyTextToClipboard(replayJsonText);
                  setCopied(ok);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
              >
                Copy JSON
              </button>
              <Link
                className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
                href="/replay"
              >
                Open viewer
              </Link>
            </div>
            {copied ? (
              <p className="mt-2 text-sm text-green-700">Copied.</p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Seed: {seed} • Moves: {moves.length}</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
