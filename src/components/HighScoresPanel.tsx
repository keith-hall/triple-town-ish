import { clearHighScores, loadHighScores, setReplayToOpen } from "@/lib/storage";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function HighScoresPanel(): ReactNode {
  const [scores, setScores] = useState(() => loadHighScores());

  useEffect(() => {
    function refresh() {
      setScores(loadHighScores());
    }
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">High Scores</h2>
        <button
          type="button"
          className="rounded-md border px-3 py-1 text-sm hover:bg-zinc-50"
          onClick={() => {
            clearHighScores();
            setScores([]);
          }}
        >
          Clear
        </button>
      </div>
      {scores.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600">No local high scores yet.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {scores.slice(0, 10).map((s, i) => (
            <button
              key={`${s.finishedAt}-${s.score}-${i}`}
              type="button"
              className="flex w-full items-baseline justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2 text-left hover:bg-zinc-100"
              onClick={() => {
                setReplayToOpen(s.replay);
                window.location.hash = "#/replay";
              }}
            >
              <div className="text-sm">
                <span className="font-semibold">#{i + 1}</span>
                <span className="ml-2 tabular-nums font-semibold">{s.score}</span>
                <span className="ml-2 text-zinc-600">({s.moves} moves)</span>
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(s.finishedAt).toISOString().slice(0, 10)}
              </div>
            </button>
          ))}
        </ol>
      )}
    </section>
  );
}
