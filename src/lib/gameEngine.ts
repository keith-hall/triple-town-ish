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

const TILE_KINDS: readonly TileKind[] = [
  "grass",
  "bush",
  "tree",
  "hut",
  "house",
  "mansion",
  "castle",
  "rock",
  "bear",
  "gravestone",
  "church",
  "cathedral",
  "crystal",
] as const;

function isTileKind(value: unknown): value is TileKind {
  return typeof value === "string" && (TILE_KINDS as readonly string[]).includes(value);
}

export type GameSettingsV1 = {
  version: 1;
  spawnRocks: boolean;
  spawnBears: boolean;
  spawnCrystals: boolean;
  /** If enabled, merges crack adjacent rocks; after enough cracks, a rock breaks and disappears. */
  crackRocksOnAdjacentMerge: boolean;
  /** If true, bears can move on the same turn they are placed. */
  newBearsMoveImmediately: boolean;
  /** Randomly seed the board with 0..initialRandomTilesMax tiles on new game. */
  initialRandomTilesMax: number;
};

export const DEFAULT_SETTINGS: GameSettingsV1 = {
  version: 1,
  spawnRocks: true,
  spawnBears: true,
  spawnCrystals: true,
  crackRocksOnAdjacentMerge: true,
  newBearsMoveImmediately: false,
  initialRandomTilesMax: 5,
};

export type BearMove = { from: number; to: number };

export type MergeEvent = {
  to: number;
  created: TileKind;
  consumed: { index: number; kind: TileKind }[]; // includes anchor as one of the consumed indices
};

export type GameState = {
  grid: Cell[]; // length GRID_CELLS, row-major
  bearCooldown: number[]; // length GRID_CELLS; >0 means bear is "new" and cannot move yet
  rockCracks: number[]; // length GRID_CELLS; meaningful only where grid[index]=="rock"
  settings: GameSettingsV1;
  score: number;
  turn: number;
  nextPiece: TileKind;
  rngSeed: number;
  rngState: number; // PRNG internal state (uint32)
  gameOver: boolean;
  lastTurn: {
    chainMerges: number;
    pointsEarned: number;
    bearMoves: number;
  };
};

export type PlaceResult =
  | { ok: true; state: GameState; bearMoves: BearMove[]; mergeEvents: MergeEvent[] }
  | { ok: false; reason: "occupied" | "out_of_bounds" | "game_over" };

const ROCK_CRACKS_TO_BREAK = 5;

export type ReplayV1 = {
  version: 1;
  createdAt: string;
  gridSize: typeof GRID_SIZE;
  seed: number;
  moves: Coord[]; // player placements, one per turn
};

export type ReplayV2 = {
  version: 2;
  createdAt: string;
  gridSize: typeof GRID_SIZE;
  seed: number;
  settings: GameSettingsV1;
  moves: Coord[]; // player placements, one per turn
};

export type ReplayMoveV3 = Coord & { piece: TileKind };

export type ReplayV3 = {
  version: 3;
  createdAt: string;
  gridSize: typeof GRID_SIZE;
  seed: number;
  settings: GameSettingsV1;
  moves: ReplayMoveV3[];
};

export type Replay = ReplayV3 | ReplayV2 | ReplayV1;

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

function isMergeableKind(kind: TileKind): boolean {
  return kind in NEXT_TIER;
}

function wouldCreateImmediateMerge(grid: Cell[], idx: number, kind: TileKind): boolean {
  if (!isMergeableKind(kind)) return false;
  // Only checks the placed kind itself (initial seeding avoids crystals).
  const seen = new Set<number>();
  const q: number[] = [idx];
  seen.add(idx);
  let count = 0;
  while (q.length) {
    const cur = q.pop()!;
    if (grid[cur] !== kind) continue;
    count++;
    if (count >= 3) return true;
    for (const nb of listNeighbors(cur)) {
      if (seen.has(nb)) continue;
      if (grid[nb] === kind) {
        seen.add(nb);
        q.push(nb);
      }
    }
  }
  return false;
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

function pieceWeights(
  score: number,
  settings: GameSettingsV1,
): { kind: TileKind; weight: number }[] {
  // Simple baseline distribution; can be tuned later.
  const base =
    score < 1000
      ? ([
      { kind: "grass", weight: 60 },
      { kind: "bush", weight: 15 },
      { kind: "tree", weight: 7 },
      { kind: "rock", weight: 5 },
      { kind: "bear", weight: 5 },
      { kind: "gravestone", weight: 4 },
      { kind: "crystal", weight: 4 },
        ] as const)
      : ([
    { kind: "grass", weight: 50 },
    { kind: "bush", weight: 14 },
    { kind: "tree", weight: 8 },
    { kind: "rock", weight: 7 },
    { kind: "bear", weight: 7 },
    { kind: "gravestone", weight: 5 },
    { kind: "crystal", weight: 4 },
        ] as const);

  return base.filter((o) => {
    if (o.kind === "rock" && !settings.spawnRocks) return false;
    if (o.kind === "bear" && !settings.spawnBears) return false;
    if (o.kind === "crystal" && !settings.spawnCrystals) return false;
    return true;
  });
}

function pickNextPiece(rngState: number, score: number, settings: GameSettingsV1) {
  const weights = pieceWeights(score, settings);
  // Safety: if a config removes everything somehow, fall back to grass.
  if (weights.length === 0) return { rngState, kind: "grass" as const };
  return pickWeighted(rngState, weights);
}

function randomEmptyIndex(
  grid: Cell[],
  rngState: number,
): { rngState: number; index: number | null } {
  const empties: number[] = [];
  for (let i = 0; i < grid.length; i++) if (grid[i] === null) empties.push(i);
  if (empties.length === 0) return { rngState, index: null };
  const step = rngNext(rngState);
  const pick = Math.floor(step.value * empties.length);
  const index = empties[Math.min(pick, empties.length - 1)]!;
  return { rngState: step.rngState, index };
}

export function createNewGame(seed: number, settings?: Partial<GameSettingsV1>): GameState {
  const resolvedSettings: GameSettingsV1 = {
    ...DEFAULT_SETTINGS,
    ...settings,
    version: 1,
  };
  const grid: Cell[] = Array.from({ length: GRID_CELLS }, () => null);
  const bearCooldown: number[] = Array.from({ length: GRID_CELLS }, () => 0);
  const rockCracks: number[] = Array.from({ length: GRID_CELLS }, () => 0);
  const rngSeed = seed >>> 0;

  let score = 0;
  let rngState = rngSeed;

  // Randomly seed the board with up to N tiles.
  const maxSeedTiles = Math.max(0, Math.min(5, resolvedSettings.initialRandomTilesMax));
  const seedCountStep = rngNext(rngState);
  rngState = seedCountStep.rngState;
  const seedCount = Math.floor(seedCountStep.value * (maxSeedTiles + 1));

  // Initial seeding should *not* create merges.
  const seedSettings: GameSettingsV1 = { ...resolvedSettings, spawnCrystals: false };
  for (let k = 0; k < seedCount; k++) {
    let placed = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      const slot = randomEmptyIndex(grid, rngState);
      rngState = slot.rngState;
      if (slot.index === null) break;

      const piece = pickNextPiece(rngState, score, seedSettings);
      rngState = piece.rngState;

      grid[slot.index] = piece.kind;
      const bad = wouldCreateImmediateMerge(grid, slot.index, piece.kind);
      if (bad) {
        grid[slot.index] = null;
        continue;
      }

      // Bears placed during initial seeding are allowed to move on the first turn.
      if (piece.kind === "bear") bearCooldown[slot.index] = 0;
      placed = true;
      break;
    }
    if (!placed) break;
  }

  // Stabilize any accidental starting merges (no bear movement on game start).
  let stabilized: GameState = {
    grid,
    bearCooldown,
    rockCracks,
    settings: resolvedSettings,
    score,
    turn: 0,
    nextPiece: "grass",
    rngSeed,
    rngState,
    gameOver: false,
    lastTurn: { chainMerges: 0, pointsEarned: 0, bearMoves: 0 },
  };
  stabilized = resolveMerges(stabilized, null);
  score = stabilized.score;

  const picked = pickNextPiece(stabilized.rngState, score, resolvedSettings);
  return {
    ...stabilized,
    score,
    nextPiece: picked.kind,
    rngState: picked.rngState,
    gameOver: computeGameOver(stabilized.grid),
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

function crackAdjacentRocks(state: GameState, anchor: number): GameState {
  if (!state.settings.crackRocksOnAdjacentMerge) return state;
  const grid = state.grid.slice();
  const rockCracks = state.rockCracks.slice();
  for (const nb of listNeighbors(anchor)) {
    if (grid[nb] !== "rock") continue;
    const next = (rockCracks[nb] ?? 0) + 1;
    if (next >= ROCK_CRACKS_TO_BREAK) {
      grid[nb] = null;
      rockCracks[nb] = 0;
    } else {
      rockCracks[nb] = next;
    }
  }
  return { ...state, grid, rockCracks };
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
): { state: GameState; merged: boolean; event?: MergeEvent } {
  for (const kind of MERGE_PRIORITY) {
    const candidates = findMergeComponents(state.grid, kind);
    const chosen = chooseMergeCandidate(candidates, preferredAnchor);
    if (!chosen) continue;

    const upgradedKind = NEXT_TIER[kind];
    if (!upgradedKind) continue;

    const consumed = chosen.indices
      .map((index) => ({ index, kind: state.grid[index] as TileKind }))
      .filter((t) => t.kind !== null);

    const mergedGridResult = mergeComponent(
      state.grid,
      chosen.indices,
      kind,
      preferredAnchor,
    );

    const chainIndex = state.lastTurn.chainMerges;
    const base = POINTS[upgradedKind] ?? 0;
    const chainMultiplier = 1 + chainIndex * 0.25;
    const extraTiles = Math.max(0, chosen.indices.length - 3);
    const biggerMergeMultiplier = 1 + extraTiles * 0.1;
    const awarded = Math.round(base * chainMultiplier * biggerMergeMultiplier);

    let nextState: GameState = {
      ...state,
      grid: mergedGridResult.grid,
      score: state.score + awarded,
      lastTurn: {
        chainMerges: chainIndex + 1,
        pointsEarned: state.lastTurn.pointsEarned + awarded,
        bearMoves: state.lastTurn.bearMoves,
      },
    };

    // Optional mechanic: crack adjacent rocks when the merge result is adjacent.
    nextState = crackAdjacentRocks(nextState, mergedGridResult.upgradedAt);

    return {
      merged: true,
      state: nextState,
      event: {
        to: mergedGridResult.upgradedAt,
        created: upgradedKind,
        consumed,
      },
    };
  }

  return { state, merged: false };
}

function resolveMerges(state: GameState, preferredAnchor: number | null): GameState {
  return resolveMergesWithEvents(state, preferredAnchor).state;
}

function resolveMergesWithEvents(
  state: GameState,
  preferredAnchor: number | null,
): { state: GameState; events: MergeEvent[] } {
  let cur = state;
  const events: MergeEvent[] = [];
  // Re-run from highest priority after each successful merge.
  while (true) {
    const { state: next, merged, event } = applyMergePass(cur, preferredAnchor);
    cur = next;
    if (merged && event) events.push(event);
    if (!merged) break;
  }
  return { state: cur, events };
}

function moveBears(state: GameState): { state: GameState; bearMoves: BearMove[] } {
  const grid = state.grid.slice();
  const bearCooldown = state.bearCooldown.slice();
  let rngState = state.rngState;
  const moves: BearMove[] = [];
  const movedDestinations = new Set<number>();

  for (let i = 0; i < grid.length; i++) {
    if (grid[i] !== "bear") continue;

    // Prevent a bear from moving multiple times in a single turn.
    if (movedDestinations.has(i)) continue;

    if ((bearCooldown[i] ?? 0) > 0) continue;

    const emptyNeighbors = listNeighbors(i).filter((nb) => grid[nb] === null);
    if (emptyNeighbors.length === 0) {
      grid[i] = "gravestone";
      bearCooldown[i] = 0;
      continue;
    }

    const step = rngNext(rngState);
    rngState = step.rngState;
    const pick = Math.floor(step.value * emptyNeighbors.length);
    const dest = emptyNeighbors[Math.min(pick, emptyNeighbors.length - 1)]!;

    grid[dest] = "bear";
    grid[i] = null;

    // Moving bears are not considered "new".
    bearCooldown[dest] = 0;
    bearCooldown[i] = 0;
    moves.push({ from: i, to: dest });

    // If the bear moved to a higher index, the scan would otherwise move it again.
    movedDestinations.add(dest);
  }

  // Decrement cooldowns after this turn's movement phase.
  for (let i = 0; i < bearCooldown.length; i++) {
    if (grid[i] === "bear" && bearCooldown[i] > 0) {
      bearCooldown[i] = Math.max(0, bearCooldown[i] - 1);
    }
    if (grid[i] !== "bear") bearCooldown[i] = 0;
  }

  return { state: { ...state, grid, rngState, bearCooldown }, bearMoves: moves };
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
    bearCooldown: state.bearCooldown.slice(),
    rockCracks: state.rockCracks.slice(),
    lastTurn: { chainMerges: 0, pointsEarned: 0, bearMoves: 0 },
  };

  const placedPiece = state.nextPiece;
  nextState.grid[idx] = placedPiece;
  if (state.nextPiece === "bear" && !state.settings.newBearsMoveImmediately) {
    nextState.bearCooldown[idx] = 1;
  }

  // If a newly placed bear is immediately trapped, it turns into a gravestone right away.
  if (placedPiece === "bear") {
    const hasEmptyNeighbor = listNeighbors(idx).some((nb) => nextState.grid[nb] === null);
    if (!hasEmptyNeighbor) {
      nextState.grid[idx] = "gravestone";
      nextState.bearCooldown[idx] = 0;
    }
  }
  nextState.turn = state.turn + 1;

  const mergeEvents: MergeEvent[] = [];

  // Resolution phase: merges, then bears move, then merges again.
  {
    const resolved = resolveMergesWithEvents(nextState, idx);
    nextState = resolved.state;
    mergeEvents.push(...resolved.events);
  }
  const moved = moveBears(nextState);
  nextState = moved.state;
  {
    const resolved = resolveMergesWithEvents(nextState, idx);
    nextState = resolved.state;
    mergeEvents.push(...resolved.events);
  }

  // Crystal rule: if a newly placed crystal wasn't used in a merge, it becomes a rock.
  if (placedPiece === "crystal" && nextState.grid[idx] === "crystal") {
    nextState.grid[idx] = "rock";
    nextState.rockCracks[idx] = 0;
  }

  // Generate next piece.
  const picked = pickNextPiece(nextState.rngState, nextState.score, nextState.settings);
  nextState.nextPiece = picked.kind;
  nextState.rngState = picked.rngState;

  nextState.gameOver = computeGameOver(nextState.grid);
  nextState.lastTurn.bearMoves = moved.bearMoves.length;

  return {
    ok: true,
    state: nextState,
    bearMoves: moved.bearMoves,
    mergeEvents,
  };
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

export function isGameSettingsV1(value: unknown): value is GameSettingsV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<GameSettingsV1>;
  if (v.version !== 1) return false;
  if (typeof v.spawnRocks !== "boolean") return false;
  if (typeof v.spawnBears !== "boolean") return false;
  if (typeof v.spawnCrystals !== "boolean") return false;
  if (typeof v.crackRocksOnAdjacentMerge !== "boolean") return false;
  if (typeof v.newBearsMoveImmediately !== "boolean") return false;
  if (typeof v.initialRandomTilesMax !== "number") return false;
  return true;
}

export function isReplayV2(value: unknown): value is ReplayV2 {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ReplayV2>;
  if (v.version !== 2) return false;
  if (v.gridSize !== GRID_SIZE) return false;
  if (typeof v.seed !== "number") return false;
  if (!isGameSettingsV1(v.settings)) return false;
  if (!Array.isArray(v.moves)) return false;
  for (const m of v.moves) {
    if (!m || typeof m !== "object") return false;
    const mm = m as Partial<Coord>;
    if (typeof mm.x !== "number" || typeof mm.y !== "number") return false;
    if (!inBounds({ x: mm.x, y: mm.y })) return false;
  }
  return true;
}

export function isReplayV3(value: unknown): value is ReplayV3 {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ReplayV3>;
  if (v.version !== 3) return false;
  if (v.gridSize !== GRID_SIZE) return false;
  if (typeof v.seed !== "number") return false;
  if (!isGameSettingsV1(v.settings)) return false;
  if (!Array.isArray(v.moves)) return false;
  for (const m of v.moves) {
    if (!m || typeof m !== "object") return false;
    const mm = m as Partial<ReplayMoveV3>;
    if (typeof mm.x !== "number" || typeof mm.y !== "number") return false;
    if (!inBounds({ x: mm.x, y: mm.y })) return false;
    if (!isTileKind(mm.piece)) return false;
  }
  return true;
}

/**
 * UI helper: returns the immediate (single-step) merge component that would be formed
 * by placing `piece` at `coord`, or null if it would not immediately merge.
 */
export function previewImmediateMerge(
  state: GameState,
  coord: Coord,
  piece: TileKind,
): number[] | null {
  if (!inBounds(coord)) return null;
  const idx = coordToIndex(coord);
  if (state.grid[idx] !== null) return null;
  if (!isMergeableKind(piece)) return null;
  if (piece === "crystal") return null;

  const grid = state.grid.slice();
  grid[idx] = piece;

  const visited = new Set<number>();
  const q: number[] = [idx];
  visited.add(idx);
  const comp: number[] = [];

  while (q.length) {
    const cur = q.pop()!;
    const cell = grid[cur];
    if (cell !== piece && cell !== "crystal") continue;
    comp.push(cur);
    for (const nb of listNeighbors(cur)) {
      if (visited.has(nb)) continue;
      const nbCell = grid[nb];
      if (nbCell === piece || nbCell === "crystal") {
        visited.add(nb);
        q.push(nb);
      }
    }
  }

  return comp.length >= 3 ? comp : null;
}
