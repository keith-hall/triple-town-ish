import type { GameSettingsV1, ReplayV3 } from "./gameEngine";

export type HighScoreEntryV3 = {
  version: 3;
  score: number;
  finishedAt: string;
  seed: number;
  moves: number;
  replay: ReplayV3;
};

const HIGH_SCORES_KEY = "tripleTownHighScoresV3";
const SETTINGS_KEY = "tripleTownSettingsV1";
const ANIM_MS_KEY = "tripleTownAnimMsV1";
const REPLAY_TO_OPEN_KEY = "tripleTownReplayToOpenV3";

export function loadHighScores(): HighScoreEntryV3[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is HighScoreEntryV3 =>
          !!e &&
          typeof e === "object" &&
          (e as HighScoreEntryV3).version === 3 &&
          typeof (e as HighScoreEntryV3).score === "number" &&
          typeof (e as HighScoreEntryV3).finishedAt === "string" &&
          typeof (e as HighScoreEntryV3).seed === "number" &&
          typeof (e as HighScoreEntryV3).moves === "number" &&
          typeof (e as HighScoreEntryV3).replay === "object",
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);
  } catch {
    return [];
  }
}

export function saveHighScore(entry: Omit<HighScoreEntryV3, "version">): void {
  if (typeof window === "undefined") return;
  const next: HighScoreEntryV3[] = [
    { version: 3 as const, ...entry },
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

export function loadSettings(): GameSettingsV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameSettingsV1;
  } catch {
    return null;
  }
}

export function saveSettings(settings: GameSettingsV1): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadAnimationMs(): number {
  if (typeof window === "undefined") return 100;
  const raw = window.localStorage.getItem(ANIM_MS_KEY);
  const n = raw ? Number(raw) : 100;
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(200, Math.round(n)));
}

export function saveAnimationMs(ms: number): void {
  if (typeof window === "undefined") return;
  const clamped = Math.max(0, Math.min(200, Math.round(ms)));
  window.localStorage.setItem(ANIM_MS_KEY, String(clamped));
}

export function setReplayToOpen(replay: ReplayV3): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REPLAY_TO_OPEN_KEY, JSON.stringify(replay));
}

export function consumeReplayToOpen(): ReplayV3 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REPLAY_TO_OPEN_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(REPLAY_TO_OPEN_KEY);
    return JSON.parse(raw) as ReplayV3;
  } catch {
    return null;
  }
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
    // Fallback for environments where clipboard API is blocked.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function parseReplayJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
