"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createNewGame,
  DEFAULT_SETTINGS,
  generateSeed,
  isReplayV1,
  isReplayV2,
  isReplayV3,
  placeNextPiece,
  previewImmediateMerge,
  tileDisplayName,
  type BearMove,
  type Coord,
  type GameSettingsV1,
  type GameState,
  type TileKind,
  type Replay,
  type ReplayMoveV3,
  type ReplayV3,
} from "@/lib/gameEngine";
import {
  copyTextToClipboard,
  downloadJson,
  consumeResumePayload,
  loadAnimationMs,
  loadSettings,
  saveAnimationMs,
  saveHighScore,
  saveSettings,
} from "@/lib/storage";
import { GameBoard, type OverlayMove } from "./GameBoard";
import { TileView } from "./TileView";

export function GameClient(): ReactNode {
  const [settingsDraft, setSettingsDraft] = useState<GameSettingsV1>(() => {
    const loaded = loadSettings();
    return loaded && loaded.version === 1 ? { ...DEFAULT_SETTINGS, ...loaded } : DEFAULT_SETTINGS;
  });
  const [animMs, setAnimMs] = useState<number>(() => loadAnimationMs());

  const [seed, setSeed] = useState<number>(() => generateSeed());
  const [state, setState] = useState<GameState>(() => createNewGame(seed, settingsDraft));
  const [moves, setMoves] = useState<ReplayMoveV3[]>([]);
  const [forcedPieces, setForcedPieces] = useState<TileKind[]>([]);
  const [copied, setCopied] = useState(false);
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [animMoves, setAnimMoves] = useState<OverlayMove[]>([]);
  const [animQueue, setAnimQueue] = useState<OverlayMove[][]>([]);
  const [dimmedDestinations, setDimmedDestinations] = useState<Set<number>>(() => new Set());
  const [pulseIndices, setPulseIndices] = useState<Set<number>>(() => new Set());

  const replay: Replay = useMemo(() => {
    const replayV3: ReplayV3 = {
      version: 3,
      createdAt,
      gridSize: 6,
      seed,
      settings: state.settings,
      moves,
    };
    return replayV3;
  }, [createdAt, moves, seed, state.settings]);

  const currentNextPiece = forcedPieces[0] ?? state.nextPiece;

  useEffect(() => {
    // Resume from replay viewer if present.
    const payload = consumeResumePayload();
    if (!payload) return;

    const rep = payload.replay as unknown;
    const step = Math.max(0, Math.floor(payload.step));

    if (isReplayV3(rep)) {
      let s = createNewGame(rep.seed, rep.settings);
      const applied: ReplayMoveV3[] = [];

      for (let i = 0; i < Math.min(step, rep.moves.length); i++) {
        const mv = rep.moves[i]!;
        s = { ...s, nextPiece: mv.piece };
        const r = placeNextPiece(s, { x: mv.x, y: mv.y });
        if (!r.ok) break;
        s = r.state;
        applied.push(mv);
      }

      setSeed(rep.seed);
      setState(s);
      setMoves(applied);
      setForcedPieces(rep.moves.slice(Math.min(step, rep.moves.length)).map((m) => m.piece));
      setSettingsDraft({ ...DEFAULT_SETTINGS, ...rep.settings });
      setCreatedAt(new Date().toISOString());
      return;
    }
  }, []);

  useEffect(() => {
    saveSettings(settingsDraft);
  }, [settingsDraft]);

  useEffect(() => {
    saveAnimationMs(animMs);
  }, [animMs]);

  useEffect(() => {
    if (!state.gameOver) return;
    const replayV3 = replay as ReplayV3;
    saveHighScore({
      score: state.score,
      finishedAt: new Date().toISOString(),
      seed,
      moves: moves.length,
      replay: replayV3,
    });
  }, [moves.length, replay, seed, state.gameOver, state.score]);

  function newGame(): void {
    const nextSeed = generateSeed();
    setSeed(nextSeed);
    setState(createNewGame(nextSeed, settingsDraft));
    setMoves([]);
    setForcedPieces([]);
    setCreatedAt(new Date().toISOString());
    setAnimMoves([]);
    setAnimQueue([]);
    setDimmedDestinations(new Set());
  }

  function onCellClick(coord: Coord): void {
    // If the user clicks while bear animation is running, immediately end the animation.
    if (animMoves.length > 0 || animQueue.length > 0) {
      setAnimMoves([]);
      setAnimQueue([]);
      setDimmedDestinations(new Set());
    }
    const effectiveState =
      forcedPieces.length > 0 ? { ...state, nextPiece: forcedPieces[0]! } : state;
    const piece = effectiveState.nextPiece;
    const res = placeNextPiece(effectiveState, coord);
    if (!res.ok) return;
    setState(res.state);
    setMoves((m) => [...m, { ...coord, piece }]);
    if (forcedPieces.length > 0) setForcedPieces((p) => p.slice(1));

    if (animMs > 0) {
      const steps: OverlayMove[][] = [];

      // Merge animations (one step per merge event)
      for (const ev of res.mergeEvents) {
        const mergeMoves: OverlayMove[] = ev.consumed
          .filter((t) => t.index !== ev.to)
          .map((t) => ({ from: t.index, to: ev.to, kind: t.kind as TileKind }));
        if (mergeMoves.length > 0) steps.push(mergeMoves);
      }

      // Bear movement animation
      if (res.bearMoves.length > 0) {
        steps.push(res.bearMoves.map((m: BearMove) => ({ ...m, kind: "bear" as const })));
      }

      if (steps.length > 0) {
        setAnimMoves(steps[0]!);
        setAnimQueue(steps.slice(1));
        const shouldDim = steps[0]!.some((m) => m.kind === "bear");
        setDimmedDestinations(shouldDim ? new Set(steps[0]!.map((m) => m.to)) : new Set());
      }
    }
  }

  const replayJsonText = useMemo(() => JSON.stringify(replay, null, 2), [replay]);
  const replaySeemsValid = useMemo(
    () => isReplayV3(replay) || isReplayV2(replay) || isReplayV1(replay),
    [replay],
  );

  const replayDataUrl = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(replayJsonText)}`,
    [replayJsonText],
  );

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
          <GameBoard
            grid={state.grid}
            onCellClick={onCellClick}
            disabled={state.gameOver}
            rockCracks={state.rockCracks}
            dimmedIndices={dimmedDestinations}
            animMoves={animMoves}
            animMs={animMs}
            onAnimDone={() => {
              if (animQueue.length === 0) {
                setAnimMoves([]);
                setDimmedDestinations(new Set());
                return;
              }
              const [next, ...rest] = animQueue;
              setAnimMoves(next!);
              setAnimQueue(rest);
              const shouldDim = next!.some((m) => m.kind === "bear");
              setDimmedDestinations(shouldDim ? new Set(next!.map((m) => m.to)) : new Set());
            }}
            previewKind={currentNextPiece}
            pulseIndices={pulseIndices}
            onHoverCell={(coord) => {
              if (!coord) {
                setPulseIndices(new Set());
                return;
              }
              const comp = previewImmediateMerge(state, coord, currentNextPiece);
              setPulseIndices(new Set(comp ?? []));
            }}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="order-2 rounded-xl border bg-white p-4">
            <h2 className="text-lg font-semibold">Settings</h2>
            <div className="mt-3 space-y-3 text-sm">
              <label className="flex items-center justify-between gap-3">
                <span>Spawn rocks</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.spawnRocks}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, spawnRocks: e.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Spawn bears</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.spawnBears}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, spawnBears: e.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Spawn crystals</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.spawnCrystals}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, spawnCrystals: e.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>New bears move immediately</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.newBearsMoveImmediately}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, newBearsMoveImmediately: e.target.checked }))
                  }
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>Crack rocks on adjacent merges</span>
                <input
                  type="checkbox"
                  checked={settingsDraft.crackRocksOnAdjacentMerge}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      crackRocksOnAdjacentMerge: e.target.checked,
                    }))
                  }
                />
              </label>

              <div className="rounded-lg bg-zinc-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Initial random tiles</span>
                  <span className="tabular-nums">{settingsDraft.initialRandomTilesMax}</span>
                </div>
                <input
                  className="mt-2 w-full"
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={settingsDraft.initialRandomTilesMax}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      initialRandomTilesMax: Number(e.target.value),
                    }))
                  }
                />
                <p className="mt-1 text-xs text-zinc-600">
                  Seeded with 0..N tiles, chosen to avoid starting merges.
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Animation speed</span>
                  <span className="tabular-nums">{animMs}ms</span>
                </div>
                <input
                  className="mt-2 w-full"
                  type="range"
                  min={0}
                  max={200}
                  step={10}
                  value={animMs}
                  onChange={(e) => setAnimMs(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-zinc-600">Saved locally (not part of replays).</p>
              </div>
              <p className="text-xs text-zinc-500">
                Applies on next <span className="font-semibold">New game</span>. New games start with
                0–{settingsDraft.initialRandomTilesMax} random tiles.
              </p>
            </div>
          </div>

          <div className="order-1 rounded-xl border bg-white p-4">
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
                  <TileView kind={currentNextPiece} />
                </div>
                <div className="text-sm font-semibold">{tileDisplayName(currentNextPiece)}</div>
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
              <div className="flex items-center justify-between">
                <span>Bear moves</span>
                <span className="tabular-nums font-semibold">{state.lastTurn.bearMoves}</span>
              </div>
            </div>

            {state.gameOver ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Game over — the grid is full.
              </div>
            ) : null}
          </div>

          <div className="order-3 rounded-xl border bg-white p-4">
            <h2 className="text-lg font-semibold">Replay</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Replays store the initial seed, settings, and each placement.
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
              <a
                className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
                href={replayDataUrl}
                download={`replay-${seed}.json`}
              >
                Download (fallback)
              </a>
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

            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-zinc-700">Show JSON</summary>
              <textarea
                className="mt-2 h-40 w-full rounded-md border p-3 font-mono text-xs"
                readOnly
                value={replayJsonText}
              />
            </details>
          </div>
        </aside>
      </section>
    </main>
  );
}
