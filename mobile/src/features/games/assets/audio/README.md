# Game audio assets

Drop three royalty-free MP3s here. Until they exist, `useSound` no-ops and the games still work — just no celebratory sound on win.

| File | Trigger | Target size | Vibe |
|---|---|---|---|
| `chime.mp3` | Sliding-puzzle complete | 20–30 KB | Bright two-note chime |
| `fanfare.mp3` | Word search complete | 25–35 KB | Short victorious horn flourish |
| `victory.mp3` | Trivia perfect score | 25–35 KB | Cheering crowd / triumphant sting |

After dropping the files, edit `src/features/games/components/GameCompleteOverlay.tsx` and uncomment the `require()` lines — see the comment block at the top of that file.

**Royalty-free sources (free, commercial-use OK):**
- pixabay.com/sound-effects (no attribution required)
- mixkit.co/free-sound-effects/win/
- zapsplat.com (free tier, attribution)

Keep each file under 35 KB — these ship inside the app bundle and add to APK / IPA size.
