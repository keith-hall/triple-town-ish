Let's build a game similar to Triple Town. 

Game Specification

1. High-Level Overview

Triple Town is a single-player, turn-based, grid-based puzzle game.
The player places objects onto a fixed grid. When three or more identical objects become orthogonally adjacent, they merge into a higher-tier object, potentially causing chain reactions.

The objective is to maximize score before the grid fills and no legal moves remain.


---

2. Game Board

Grid Size:

Standard: 6 × 6 square grid


Cell States:

Empty

Occupied by exactly one object


Adjacency Rules:

Only orthogonal adjacency (up, down, left, right)

Diagonals do not count




---

3. Turn Structure

Each turn consists of:

1. Random Object Selection

The game selects the next piece from a weighted random pool.



2. Player Placement

Player chooses an empty cell.

Placement is mandatory if at least one empty cell exists.



3. Resolution Phase

Merges are evaluated and resolved.

Chain reactions continue until no valid merges exist.



4. End of Turn

Score updated.

Check for game over.





---

4. Object System

Objects exist in tiers, where each tier can be created by merging three or more of the previous tier.

4.1 Base Objects

Tier    Object  Notes

1   Grass   Most common starting object
2   Bush    3× Grass
3   Tree    3× Bush
4   Hut 3× Tree
5   House   3× Hut
6   Mansion 3× House
7   Castle  3× Mansion


(Exact naming may vary; hierarchy is what's important.)


---

5. Merge Rules

5.1 Merge Condition

When 3 or more identical objects are connected orthogonally:

They merge into one object of the next tier.



5.2 Merge Resolution

One of the merged cells becomes the upgraded object.

Typically the most recently placed tile or a deterministic choice.


All other merged tiles become empty.

Merges may trigger new merges recursively.


5.3 Merge Priority

Only same-type merges occur.

Higher-tier merges take precedence during resolution chains if they arise.



---

6. Special Objects

6.1 Rocks

Immovable blockers

Cannot be merged normally

Occupy space and restrict placement


6.2 Bears

Move after each turn

Behavior:

Move randomly to adjacent empty cells

If trapped (no empty neighbors), transform into Gravestones



6.3 Gravestones

Act as blockers initially

Can be merged (3+) into Churches


6.4 Churches → Cathedrals

Churches merge into Cathedrals

High score value

Late-game objective


6.5 Crystals

Wildcard object

Acts as any object type needed to complete a merge

After merge, becomes the upgraded object



---

7. Random Piece Generation

Each turn produces exactly one piece

Weighted probabilities favor:

Grass (most common)

Bush, Tree (less common)

Special items (rare)


Distribution may change as score increases



---

8. Scoring System

8.1 Points Awarded

Points are awarded when merges occur

Score value increases exponentially by tier


Example (illustrative only):

Object  Points

Bush    5
Tree    20
Hut 100
House   500
Mansion 2000
Castle  10000


8.2 Chain Bonus

Consecutive merges in a single turn:

May apply a multiplier or bonus scoring


Optional but common in implementations



---

9. Game Over Condition

The game ends when:

The grid is completely full

AND the next object cannot be placed

AND no merges can be triggered


There is no win condition, only score optimization.


---

10. Strategy-Enabling Design Constraints

From a systems perspective, the game is designed to:

Reward spatial planning

Encourage delayed gratification

Penalize careless placement

Balance luck with long-term strategy


Key tension:

> Limited grid space vs exponential reward scaling




---

11. Determinism vs Randomness

Randomness:

Next piece selection

Bear movement


Deterministic:

Merge rules

Scoring outcomes

Resolution order (given same inputs)



This allows:

Replays

AI solvers

Seeded randomness



---

12. Minimal Data Model (Conceptual)

Cell {
  x, y
  occupant: Object | null
}

Object {
  type
  tier
  special_behavior?
}

GameState {
  grid[6][6]
  score
  next_piece
  random_seed
}


---

13. Summary

Triple Town is a:

Turn-based

Deterministic-resolution

Probabilistic-input

Grid-merge puzzle game


Core mechanic:

> “Place one object → resolve merges → repeat until no space remains.”

---

When a player starts a game, Please record the initial state and each move, and allow a player to export a replay in json, and from the main menu an option to open a replay and view each move step by step.
---
Also store high scores and show them so players can compete with each other
