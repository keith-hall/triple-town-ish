import type { BearMove, Cell, Coord } from "@/lib/gameEngine";
import { GRID_SIZE, indexToCoord } from "@/lib/gameEngine";
import { TileView } from "./TileView";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

function BearMoveOverlay({
  moves,
  ms,
  onDone,
}: {
  moves: BearMove[];
  ms: number;
  onDone: () => void;
}): ReactNode {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (ms <= 0 || moves.length === 0) {
      onDone();
      return;
    }
    const raf = window.requestAnimationFrame(() => setActive(true));
    const t = window.setTimeout(onDone, ms);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [moves.length, ms, onDone]);

  if (ms <= 0 || moves.length === 0) return null;

  const cellSize = `calc((100% - var(--gap) * ${GRID_SIZE - 1}) / ${GRID_SIZE})`;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {moves.map((m, i) => {
        const from = indexToCoord(m.from);
        const to = indexToCoord(m.to);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        return (
          <div
            key={`${m.from}-${m.to}-${i}`}
            className="absolute p-1"
            style={{
              width: cellSize,
              height: cellSize,
              left: `calc(${from.x} * (${cellSize} + var(--gap)))`,
              top: `calc(${from.y} * (${cellSize} + var(--gap)))`,
              transform: active
                ? `translate(calc(${dx} * (100% + var(--gap))), calc(${dy} * (100% + var(--gap))))`
                : "translate(0%, 0%)",
              transition: `transform ${ms}ms ease-in-out`,
            }}
          >
            <TileView kind="bear" />
          </div>
        );
      })}
    </div>
  );
}

export function GameBoard({
  grid,
  onCellClick,
  disabled,
  dimmedIndices,
  bearMoves,
  bearAnimMs,
  onBearAnimDone,
}: {
  grid: Cell[];
  onCellClick: (coord: Coord) => void;
  disabled: boolean;
  dimmedIndices?: Set<number>;
  bearMoves?: BearMove[];
  bearAnimMs?: number;
  onBearAnimDone?: () => void;
}): ReactNode {
  return (
    <div className="relative" style={{ ["--gap" as string]: "0.5rem" }}>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
      >
        {grid.map((cell, idx) => {
          const x = idx % GRID_SIZE;
          const y = Math.floor(idx / GRID_SIZE);
          const isEmpty = cell === null;
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled || !isEmpty}
              onClick={() => onCellClick({ x, y })}
              className={
                "aspect-square rounded-lg border p-1 transition " +
                (isEmpty
                  ? "bg-white hover:bg-zinc-50 active:bg-zinc-100"
                  : "bg-white") +
                " disabled:cursor-not-allowed disabled:opacity-60"
              }
              aria-label={isEmpty ? `Empty cell (${x}, ${y})` : `Cell (${x}, ${y})`}
            >
              {cell ? (
                <TileView kind={cell} dimmed={dimmedIndices?.has(idx)} />
              ) : (
                <div className="h-full w-full rounded-md bg-zinc-100" />
              )}
            </button>
          );
        })}
      </div>
      {bearMoves && bearMoves.length > 0 && bearAnimMs !== undefined && onBearAnimDone ? (
        <BearMoveOverlay moves={bearMoves} ms={bearAnimMs} onDone={onBearAnimDone} />
      ) : null}
    </div>
  );
}
