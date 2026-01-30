# Prototype Rules

1) Core loop

Each run is: observe → infiltrate → manipulate (rock) → complete objective → escape.

2) Win/Lose conditions

Win: complete required objectives, then reach the exit zone.

Lose: guard catches player (prototype can implement this as guard touching player; later it can be “only if guard is in chase”).

3) Controls (exact mapping)

W/A/S/D = move

Mouse cursor = aim rock direction

Left click = throw rock (creates noise on impact)

E = interact (pick up keycard, use terminal, open door, enter/exit hide spot)

Esc = pause (optional for prototype)

4) Collision model (must match plan)

Solids use AABB rectangles (player vs walls/doors).

Interactions use trigger rectangles (keycard, terminal, hide spot, exit).

Noise uses circle radius from rock impact.

Acceptance test

A teammate can read the rules doc and answer:

“How do I win?”

“How do I lose?”

“What does E do?”

“How does rock distraction work?”
…without asking you.
