export const GRID_SIZE = 6 as const;
export const GRID_CELLS = 36 as const;

export type Coord = { x: number; y: number };

export type TileKind =
  | "grass"
  | "bush"
  | "tree"
  | "hut"
  | "house"
  | "mansion"
  | "castle"
  | "rock"
  | "bear"
  | "gravestone"
  | "church"
  | "cathedral"
  | "crystal";

export type Cell = TileKind | null;

export type GameState = {
  grid: Cell[]; // length GRID_CELLS, row-major
  score: number;
  turn: number;
  nextPiece: TileKind;
  rngSeed: number;
  rngState: number; // PRNG internal state (uint32)
  gameOver: boolean;
  lastTurn: {
    chainMerges: number;
    pointsEarned: number;
  };
};

export type PlaceResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: "occupied" | "out_of_bounds" | "game_over" };

export type ReplayV1 = {
  version: 1;
  createdAt: string;
  gridSize: typeof GRID_SIZE;
  seed: number;
  moves: Coord[]; // player placements, one per turn
};

const NEXT_TIER: Partial<Record<TileKind, TileKind>> = {
  grass: "bush",
  bush: "tree",
  tree: "hut",
  hut: "house",
  house: "mansion",
  mansion: "castle",
  gravestone: "church",
  church: "cathedral",
};

const MERGE_PRIORITY: TileKind[] = [
  // highest first: merges that create the biggest pieces should resolve first.
  "church",
  "mansion",
  "house",
  "hut",
  "tree",
  "bush",
  "grass",
  "gravestone",
];

const POINTS: Partial<Record<TileKind, number>> = {
  bush: 5,
  tree: 20,
  hut: 100,
  house: 500,
  mansion: 2000,
  castle: 10000,
  church: 1500,
  cathedral: 7500,
};

export function coordToIndex({ x, y }: Coord): number {
  return y * GRID_SIZE + x;
}

export function indexToCoord(index: number): Coord {
  return { x: index % GRID_SIZE, y: Math.floor(index / GRID_SIZE) };
}

export function inBounds({ x, y }: Coord): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function generateSeed(): number {
  // Deterministic only once chosen; this just provides a reasonable random default.
  // Works in the browser; on server it will fall back to Date.now().
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] ?? (Date.now() >>> 0);
  }
  return Date.now() >>> 0;
}

/**
 * Mulberry32 PRNG step.
 * Returns a float in [0,1) and the next PRNG state.
 */
export function rngNext(rngState: number): { rngState: number; value: number } {
  const nextState = (rngState + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const out = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { rngState: nextState, value: out };
}

function listNeighbors(index: number): number[] {
  const { x, y } = indexToCoord(index);
  const out: number[] = [];
  if (x > 0) out.push(index - 1);
  if (x < GRID_SIZE - 1) out.push(index + 1);
  if (y > 0) out.push(index - GRID_SIZE);
  if (y < GRID_SIZE - 1) out.push(index + GRID_SIZE);
  return out;
}

function countEmpty(grid: Cell[]): number {
  let n = 0;
  for (const c of grid) if (c === null) n++;
  return n;
}

function pickWeighted(
  rngState: number,
  options: { kind: TileKind; weight: number }[],
): { rngState: number; kind: TileKind } {
  const total = options.reduce((s, o) => s + o.weight, 0);
  const { rngState: s2, value } = rngNext(rngState);
  const target = value * total;
  let acc = 0;
  for (const o of options) {
    acc += o.weight;
    if (target <= acc) return { rngState: s2, kind: o.kind };
  }
  return { rngState: s2, kind: options[options.length - 1]!.kind };
}

function pieceWeights(score: number): { kind: TileKind; weight: number }[] {
  // Simple baseline distribution; can be tuned later.
  if (score < 1000) {
    return [
      { kind: "grass", weight: 60 },
      { kind: "bush", weight: 15 },
      { kind: "tree", weight: 7 },
      { kind: "rock", weight: 5 },
      { kind: "bear", weight: 5 },
      { kind: "gravestone", weight: 4 },
      { kind: "crystal", weight: 4 },
    ];
  }
  return [
    { kind: "grass", weight: 50 },
    { kind: "bush", weight: 14 },
    { kind: "tree", weight: 8 },
    { kind: "rock", weight: 7 },
    { kind: "bear", weight: 7 },
    { kind: "gravestone", weight: 5 },
    { kind: "crystal", weight: 4 },
  ];
}

export function createNewGame(seed: number): GameState {
  const grid: Cell[] = Array.from({ length: GRID_CELLS }, () => null);
  const rngSeed = seed >>> 0;
  const picked = pickWeighted(rngSeed, pieceWeights(0));
  return {
    grid,
    score: 0,
    turn: 0,
    nextPiece: picked.kind,
    rngSeed,
    rngState: picked.rngState,
    gameOver: false,
    lastTurn: { chainMerges: 0, pointsEarned: 0 },
  };
}

function mergeComponent(
  grid: Cell[],
  component: number[],
  baseKind: TileKind,
  preferredAnchor: number | null,
): { grid: Cell[]; upgradedAt: number } {
  const upgraded = NEXT_TIER[baseKind];
  if (!upgraded) return { grid, upgradedAt: component[0]! };

  let anchor = component[0]!;
  if (preferredAnchor !== null && component.includes(preferredAnchor)) {
    anchor = preferredAnchor;
  } else {
    anchor = Math.min(...component);
  }

  const nextGrid = grid.slice();
  for (const idx of component) nextGrid[idx] = null;
  nextGrid[anchor] = upgraded;
  return { grid: nextGrid, upgradedAt: anchor };
}

function findMergeComponents(
  grid: Cell[],
  kind: TileKind,
): { indices: number[]; anchor: number }[] {
  // Components are formed by `kind` cells, plus adjacent crystals (wildcards).
  // If a component has no base-kind cells (all crystals), it is not mergeable.
  const visited = new Set<number>();
  const components: { indices: number[]; anchor: number }[] = [];

  for (let i = 0; i < grid.length; i++) {
    if (visited.has(i)) continue;
    if (grid[i] !== kind) continue;

    const q: number[] = [i];
    visited.add(i);
    const comp: number[] = [];
    let minIdx = i;

    while (q.length) {
      const cur = q.pop()!;
      comp.push(cur);
      if (cur < minIdx) minIdx = cur;

      for (const nb of listNeighbors(cur)) {
        if (visited.has(nb)) continue;
        const cell = grid[nb];
        if (cell === kind || cell === "crystal") {
          visited.add(nb);
          q.push(nb);
        }
      }
    }

    if (comp.length >= 3) {
      components.push({ indices: comp, anchor: minIdx });
    }
  }

  return components;
}

function chooseMergeCandidate(
  candidates: { indices: number[]; anchor: number }[],
  preferredAnchor: number | null,
): { indices: number[]; anchor: number } | null {
  if (candidates.length === 0) return null;
  if (preferredAnchor !== null) {
    for (const c of candidates) {
      if (c.indices.includes(preferredAnchor)) return c;
    }
  }
  candidates.sort((a, b) => a.anchor - b.anchor);
  return candidates[0]!;
}

function applyMergePass(
  state: GameState,
  preferredAnchor: number | null,
): { state: GameState; merged: boolean } {
  for (const kind of MERGE_PRIORITY) {
    const candidates = findMergeComponents(state.grid, kind);
    const chosen = chooseMergeCandidate(candidates, preferredAnchor);
    if (!chosen) continue;

    const upgradedKind = NEXT_TIER[kind];
    if (!upgradedKind) continue;

    const mergedGridResult = mergeComponent(
      state.grid,
      chosen.indices,
      kind,
      preferredAnchor,
    );

    const chainIndex = state.lastTurn.chainMerges;
    const base = POINTS[upgradedKind] ?? 0;
    const multiplier = 1 + chainIndex * 0.25;
    const awarded = Math.round(base * multiplier);

    return {
      merged: true,
      state: {
        ...state,
        grid: mergedGridResult.grid,
        score: state.score + awarded,
        lastTurn: {
          chainMerges: chainIndex + 1,
          pointsEarned: state.lastTurn.pointsEarned + awarded,
        },
      },
    };
  }

  return { state, merged: false };
}

function resolveMerges(state: GameState, preferredAnchor: number | null): GameState {
  let cur = state;
  // Re-run from highest priority after each successful merge.
  while (true) {
    const { state: next, merged } = applyMergePass(cur, preferredAnchor);
    cur = next;
    if (!merged) break;
  }
  return cur;
}

function moveBears(state: GameState): GameState {
  const grid = state.grid.slice();
  let rngState = state.rngState;

  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== "bear") continue;

    const emptyNeighbors = listNeighbors(i).filter((nb) => grid[nb] === null);
    if (emptyNeighbors.length === 0) {
      grid[i] = "gravestone";
      continue;
    }

    const step = rngNext(rngState);
    rngState = step.rngState;
    const pick = Math.floor(step.value * emptyNeighbors.length);
    const dest = emptyNeighbors[Math.min(pick, emptyNeighbors.length - 1)]!;

    grid[dest] = "bear";
    grid[i] = null;
  }

  return { ...state, grid, rngState };
}

function computeGameOver(grid: Cell[]): boolean {
  return countEmpty(grid) === 0;
}

export function placeNextPiece(state: GameState, coord: Coord): PlaceResult {
  if (state.gameOver) return { ok: false, reason: "game_over" };
  if (!inBounds(coord)) return { ok: false, reason: "out_of_bounds" };
  const idx = coordToIndex(coord);
  if (state.grid[idx] !== null) return { ok: false, reason: "occupied" };

  let nextState: GameState = {
    ...state,
    grid: state.grid.slice(),
    lastTurn: { chainMerges: 0, pointsEarned: 0 },
  };

  nextState.grid[idx] = state.nextPiece;
  nextState.turn = state.turn + 1;

  // Resolution phase: merges, then bears move, then merges again.
  nextState = resolveMerges(nextState, idx);
  nextState = moveBears(nextState);
  nextState = resolveMerges(nextState, idx);

  // Generate next piece.
  const picked = pickWeighted(nextState.rngState, pieceWeights(nextState.score));
  nextState.nextPiece = picked.kind;
  nextState.rngState = picked.rngState;

  nextState.gameOver = computeGameOver(nextState.grid);

  return { ok: true, state: nextState };
}

export function renderTileShort(kind: TileKind): string {
  switch (kind) {
    case "grass":
      return "Gr";
    case "bush":
      return "Bu";
    case "tree":
      return "Tr";
    case "hut":
      return "Ht";
    case "house":
      return "Hs";
    case "mansion":
      return "Mn";
    case "castle":
      return "Cs";
    case "rock":
      return "Ro";
    case "bear":
      return "Be";
    case "gravestone":
      return "Gv";
    case "church":
      return "Ch";
    case "cathedral":
      return "Ca";
    case "crystal":
      return "Cr";
  }
}

export function tileDisplayName(kind: TileKind): string {
  return kind[0]!.toUpperCase() + kind.slice(1);
}

export function isReplayV1(value: unknown): value is ReplayV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ReplayV1>;
  if (v.version !== 1) return false;
  if (v.gridSize !== GRID_SIZE) return false;
  if (typeof v.seed !== "number") return false;
  if (!Array.isArray(v.moves)) return false;
  for (const m of v.moves) {
    if (!m || typeof m !== "object") return false;
    const mm = m as Partial<Coord>;
    if (typeof mm.x !== "number" || typeof mm.y !== "number") return false;
    if (!inBounds({ x: mm.x, y: mm.y })) return false;
  }
  return true;
}
