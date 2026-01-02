import type { ReplayV1 } from "./gameEngine";

export type HighScoreEntryV1 = {
  version: 1;
  score: number;
  finishedAt: string;
  seed: number;
  moves: number;
};

const HIGH_SCORES_KEY = "tripleTownHighScoresV1";

export function loadHighScores(): HighScoreEntryV1[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is HighScoreEntryV1 =>
          !!e &&
          typeof e === "object" &&
          (e as HighScoreEntryV1).version === 1 &&
          typeof (e as HighScoreEntryV1).score === "number" &&
          typeof (e as HighScoreEntryV1).finishedAt === "string" &&
          typeof (e as HighScoreEntryV1).seed === "number" &&
          typeof (e as HighScoreEntryV1).moves === "number",
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);
  } catch {
    return [];
  }
}

export function saveHighScore(entry: Omit<HighScoreEntryV1, "version">): void {
  if (typeof window === "undefined") return;
  const next: HighScoreEntryV1[] = [
    { version: 1 as const, ...entry },
    ...loadHighScores(),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);
  window.localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(next));
}

export function clearHighScores(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HIGH_SCORES_KEY);
}

export function downloadJson(filename: string, value: unknown): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function parseReplayJson(text: string): ReplayV1 | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    // Validation happens in the engine (caller should use isReplayV1)
    return parsed as ReplayV1;
  } catch {
    return null;
  }
}
