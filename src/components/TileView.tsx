import type { TileKind } from "@/lib/gameEngine";
import { tileDisplayName } from "@/lib/gameEngine";
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

function TileSvg({ kind }: { kind: TileKind }): ReactNode {
  // Simple, consistent 64×64 icons. Colors are driven by the surrounding text color.
  switch (kind) {
    case "grass":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <path d="M18 52c6-10 6-20 0-30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M32 52c6-12 8-24 2-36" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M46 52c6-10 6-20 0-30" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M12 52h40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "bush":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <circle cx="22" cy="34" r="10" fill="currentColor" opacity="0.9" />
          <circle cx="36" cy="30" r="12" fill="currentColor" opacity="0.9" />
          <circle cx="44" cy="38" r="9" fill="currentColor" opacity="0.9" />
          <rect x="14" y="38" width="36" height="12" rx="6" fill="currentColor" opacity="0.9" />
        </svg>
      );
    case "tree":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <rect x="28" y="34" width="8" height="18" rx="2" fill="currentColor" opacity="0.9" />
          <circle cx="32" cy="26" r="16" fill="currentColor" opacity="0.9" />
        </svg>
      );
    case "hut":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <path d="M14 30 32 16l18 14" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <rect x="18" y="30" width="28" height="22" rx="2" fill="currentColor" opacity="0.9" />
          <rect x="29" y="38" width="6" height="14" rx="1" fill="white" opacity="0.85" />
        </svg>
      );
    case "house":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <path d="M12 30 32 14l20 16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <rect x="16" y="30" width="32" height="24" rx="2" fill="currentColor" opacity="0.9" />
          <rect x="28" y="40" width="8" height="14" rx="1" fill="white" opacity="0.85" />
          <rect x="20" y="36" width="8" height="8" rx="1" fill="white" opacity="0.75" />
        </svg>
      );
    case "mansion":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <rect x="12" y="28" width="40" height="26" rx="2" fill="currentColor" opacity="0.9" />
          <path d="M12 28 32 16l20 12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M20 54V34M28 54V34M36 54V34M44 54V34" stroke="white" strokeWidth="3" opacity="0.75" />
        </svg>
      );
    case "castle":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <path d="M14 24h6v-8h8v8h8v-8h8v8h6v30H14V24z" fill="currentColor" opacity="0.9" />
          <rect x="28" y="38" width="8" height="16" rx="2" fill="white" opacity="0.75" />
        </svg>
      );
    case "rock":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <path
            d="M18 50 10 38l8-14 16-10 14 8 6 14-10 18H18z"
            fill="currentColor"
            opacity="0.9"
          />
          <path d="M22 26h14" stroke="white" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
        </svg>
      );
    case "bear":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <circle cx="20" cy="22" r="8" fill="currentColor" opacity="0.9" />
          <circle cx="44" cy="22" r="8" fill="currentColor" opacity="0.9" />
          <circle cx="32" cy="34" r="18" fill="currentColor" opacity="0.9" />
          <circle cx="26" cy="32" r="3" fill="white" opacity="0.85" />
          <circle cx="38" cy="32" r="3" fill="white" opacity="0.85" />
          <path d="M28 40c2 3 6 3 8 0" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        </svg>
      );
    case "gravestone":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <path d="M20 54V30a12 12 0 0 1 24 0v24H20z" fill="currentColor" opacity="0.9" />
          <path d="M32 30v14M26 38h12" stroke="white" strokeWidth="3" opacity="0.75" strokeLinecap="round" />
        </svg>
      );
    case "church":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <rect x="18" y="28" width="28" height="26" rx="2" fill="currentColor" opacity="0.9" />
          <path d="M32 14v10M28 18h8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M24 28 32 20l8 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M28 54v-10a4 4 0 0 1 8 0v10" fill="white" opacity="0.75" />
        </svg>
      );
    case "cathedral":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <path d="M18 54V26l14-10 14 10v28H18z" fill="currentColor" opacity="0.9" />
          <path d="M32 12v10M28 16h8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M28 44c2-6 6-6 8 0" stroke="white" strokeWidth="3" opacity="0.75" fill="none" strokeLinecap="round" />
          <path d="M26 44h12" stroke="white" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
        </svg>
      );
    case "crystal":
      return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
          <path d="M32 10 48 26 32 54 16 26 32 10z" fill="currentColor" opacity="0.9" />
          <path d="M32 10v44" stroke="white" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
        </svg>
      );
  }
}

export function TileView({
  kind,
  dimmed,
}: {
  kind: TileKind;
  dimmed?: boolean;
}): ReactNode {
  return (
    <div
      className={
        "flex h-full w-full items-center justify-center rounded-md p-1 " +
        tileClassName(kind) +
        (dimmed ? " opacity-30" : "")
      }
      title={tileDisplayName(kind)}
    >
      <div className="h-full w-full">{TileSvg({ kind })}</div>
    </div>
  );
}
