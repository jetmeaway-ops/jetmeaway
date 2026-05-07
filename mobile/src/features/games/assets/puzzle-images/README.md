# Puzzle images

Drop 4 square JPGs here, ~600×600, ≤30 KB each. The puzzle engine slices them visually at runtime — no pre-slicing needed.

Suggested set:
- `london.jpg` (Big Ben / Tower Bridge)
- `paris.jpg` (Eiffel Tower)
- `tokyo.jpg` (Shibuya / Tokyo Tower)
- `sydney.jpg` (Opera House)

After adding the files, register them in `src/features/games/puzzle/images.ts` (the manifest already references these paths — just drop the JPGs in and the bundler picks them up).

Royalty-free: unsplash.com / pexels.com (no attribution required).
