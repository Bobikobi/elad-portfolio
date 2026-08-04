## BRIEF: PERF-2 - invert the governor's default

Written before implementing, per the standing process note.

### GOAL

An average desktop with integrated graphics must not be handed a profile tuned for a
gaming GPU. Everyone starts on the low-cost profile and is promoted only on measured,
sustained, proven headroom.

### CURRENT STATE (read from the code, not assumed)

- `sceneStore.ts` initialises `quality: 'high'`. **Every visitor starts on the expensive
  profile** and is only demoted after failing - which is the inversion the owner reported:
  a stutter is what a borderline machine gets, and a promotion is what it should have had
  to earn.
- `QualityGovernor` demotes at `fps < 0.62 x target` sustained 1.2s, promotes at
  `fps > 0.86 x target` sustained 6s, and latches after 2 demotions. Both thresholds were
  written for a machine already running high; as promotion criteria measured at LOW cost
  they are far too weak - 86% of target while cheap says very little about 100% while
  expensive.
- High-tier cost knobs: god rays `samples={high ? 60 : 26}`, `dpr={[1, 1.5]}`, and `<Bloom
  mipmapBlur>` with no explicit `levels`, so it takes the library default.

### THE PROMOTION CRITERIA I AM CHOOSING (the ruling asks me to state them)

| rule | value | why |
|---|---|---|
| smoothed fps must exceed | **0.97 x target** | the old 0.86 was evidence of "coping". Promotion needs evidence of headroom, and the measurement is being taken at low cost, so the bar has to be near the ceiling |
| sustained for | **8s** | longer than the old 6s, and long enough to cross a scene transition rather than sampling one quiet moment |
| any frame longer than | **1.6 x the target period** resets the window | a mean hides a stutter. This is the term that makes "never flap" testable rather than hoped for |
| promotions allowed | **1** | one attempt. If a demotion follows a promotion the tier latches low for the session: a machine that failed the real test does not get asked again |
| demotion | unchanged: `< 0.62 x target` for 1.2s | it already works and the owner did not ask for it to change |

### RECIPE

- `src/lib/sceneStore.ts`: initial `quality` `'high'` -> `'low'`.
- `src/components/scene/QualityGovernor.tsx`: the criteria above, with the promotion
  counter separate from the demotion counter.
- `src/components/scene/Effects.tsx`: god rays `60 -> 32`; `<Bloom levels={7}>`.
- `src/components/scene/SceneRoot.tsx`: `dpr={[1, 1.5]}` -> `[1, 1.25]`.

### CONSEQUENCES WORTH STATING BEFORE THEY ARE FOUND LATER

1. **Bloom `levels` is per-STATE, not per-tier** - the file says so explicitly. Dropping it
   to 7 reduces how far the glow spreads on EVERY tier, mobile included. The tier law is
   untouched (all tiers stay identical to each other) but it is a small global change to
   the look, and it is the owner's eye that should confirm it.
2. **Planet textures are chosen when a world is entered**, from `quality` at that moment.
   Starting low means the first world a desktop visitor opens loads the mid-res texture
   rather than the hi-res one, and a later promotion does not re-run that effect for a
   world already open. Softer on the first visit, and a faster first entry.
3. Mobile is untouched by construction: it already ran low, and low is unchanged.

### ACCEPTANCE

The owner's own desktop feeling smooth is the only criterion that closes this. What I can
measure and will report: a 4x-throttled run must **start low, stay low, and never flap**,
and an unthrottled run must show whether this machine promotes at all and how long it takes.

### VERIFICATION PLAN

`scripts/harness/governor.mjs`: samples `quality`, `displayHz`, `pacing` and the frame
interval once a second for 45s on `/` with `?hud=1`, at CPU throttles 1x and 4x, and
reports every tier transition with its timestamp. Flapping is any transition after the
first, or any transition at all under throttle.

### RISKS / ROLLBACK

The visible risk is the opposite of today's: a capable machine sitting on the low profile
because the bar is too high. That is the trade the ruling chose deliberately - a promotion
is invisible, a stutter is not - and the 1x run will show how often this machine clears it.
One commit, four files, revert restores the current behaviour.
