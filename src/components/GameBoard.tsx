import type { Cell, Coord } from "@/lib/gameEngine";
import { GRID_SIZE } from "@/lib/gameEngine";
import { TileView } from "./TileView";
import type { ReactNode } from "react";

export function GameBoard({
  grid,
  onCellClick,
  disabled,
}: {
  grid: Cell[];
  onCellClick: (coord: Coord) => void;
  disabled: boolean;
}): ReactNode {
  return (
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
              <TileView kind={cell} />
            ) : (
              <div className="h-full w-full rounded-md bg-zinc-100" />
            )}
          </button>
        );
      })}
    </div>
  );
}
