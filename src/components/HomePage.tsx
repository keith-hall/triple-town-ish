import { HighScoresPanel } from "./HighScoresPanel";
import type { ReactNode } from "react";

export function HomePage(): ReactNode {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
      <header className="pt-8">
        <h1 className="text-3xl font-bold">Triple Town-ish</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          A deterministic, replayable 6×6 merge puzzle. Place tiles to make 3+ connected groups and
          chain merges for points.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Main Menu</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="#/game"
              className="rounded-md border px-4 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Start new game
            </a>
            <a
              href="#/replay"
              className="rounded-md border px-4 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Open replay viewer
            </a>
          </div>
          <div className="mt-6 text-sm text-zinc-700">
            <p className="font-semibold">Rules quick summary</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-600">
              <li>Only orthogonal adjacency counts (no diagonals).</li>
              <li>3+ connected identical tiles merge upward (crystals can help complete merges).</li>
              <li>Bears move after each turn; trapped bears become gravestones.</li>
            </ul>
          </div>
        </div>

        <div>
          <HighScoresPanel />
        </div>
      </section>
    </main>
  );
}
