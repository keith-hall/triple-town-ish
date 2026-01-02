import type { TileKind } from "@/lib/gameEngine";
import { renderTileShort, tileDisplayName } from "@/lib/gameEngine";
import type { ReactNode } from "react";

export function tileClassName(kind: TileKind): string {
  switch (kind) {
    case "grass":
      return "bg-green-200 text-green-950";
    case "bush":
      return "bg-green-300 text-green-950";
    case "tree":
      return "bg-green-400 text-green-950";
    case "hut":
      return "bg-amber-200 text-amber-950";
    case "house":
      return "bg-amber-300 text-amber-950";
    case "mansion":
      return "bg-amber-400 text-amber-950";
    case "castle":
      return "bg-amber-500 text-amber-950";
    case "rock":
      return "bg-slate-400 text-slate-950";
    case "bear":
      return "bg-orange-300 text-orange-950";
    case "gravestone":
      return "bg-slate-500 text-white";
    case "church":
      return "bg-zinc-200 text-zinc-950";
    case "cathedral":
      return "bg-yellow-300 text-yellow-950";
    case "crystal":
      return "bg-fuchsia-300 text-fuchsia-950";
  }
}

export function TileView({ kind }: { kind: TileKind }): ReactNode {
  return (
    <div
      className={
        "flex h-full w-full items-center justify-center rounded-md text-xs font-semibold sm:text-sm " +
        tileClassName(kind)
      }
      title={tileDisplayName(kind)}
    >
      {renderTileShort(kind)}
    </div>
  );
}
