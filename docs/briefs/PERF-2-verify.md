## VERIFY: PERF-2 - invert the governor's default

Branch `fix/perf-2-governor`, cut from `master`. Preview alias
`elad-portfolio-git-fix-perf-2-governor-bobikobis-projects.vercel.app`, commit `7501364`.

### HARNESS

`scripts/harness/governor.mjs` - samples the scene store once a second for 45s on `/` with
`?hud=1`, at CPU throttle 1x and 4x, and reports every tier transition with the second it
happened on. Output in `.harness-out/governor/`.

### THE PROMOTION CRITERIA, AS SHIPPED

| rule | value |
|---|---|
| smoothed fps must exceed | 0.97 x target |
| sustained for | 8s |
| any frame longer than 1.6 periods | resets the window |
| promotions allowed per session | 1, and a demotion after one latches low |
| demotion | unchanged: below 0.62 x target for 1.2s |

### MEASURED

| run | starts on | ends on | transitions | median fps |
|---|---|---|---|---|
| **1x (unthrottled)** | **low** | **low** | **none** | 63 |
| **4x throttled** | **low** | **low** | **none** | 30 |

The ruling's three requirements: **starts low** yes, in both. **Stays low under throttle**
yes, 45 samples, no transition. **Never flaps** yes, zero transitions in either run.

**Why the unthrottled run did not promote, which is the interesting number:** at 1x this
machine's median is 63fps but **8 of its 45 samples fall below the 58.2fps bar**, and the
window needs 8 consecutive clean seconds. A laptop with integrated graphics that dips below
target eight times in forty-five seconds is precisely the machine the ruling says should
not be promoted, so this is the criteria working rather than failing. It is also, usefully,
the same class of machine the owner described.

### THE RISK THIS CREATES, STATED PLAINLY

If no machine ever clears the bar, the high tier becomes dead code and nobody sees the
expensive profile at all. I cannot measure that from here - it needs a machine with real
headroom. So the HUD now prints the tier, the accrued headroom against the 8s requirement,
the target it is being judged against, and how many promotions have been spent:

```text
tier LOW  headroom 3.2/8s  target 60 fps  promoted 0x
```

On the owner's own desktop with `?hud=1`, that line answers whether it promotes, and if not
how close it gets. If it sits at 7.x/8s and resets, the stall test is too strict and the
right adjustment is that term, not the ratio.

### ADVERSARIAL SELF-CHECK

1. **A run of nulls looks identical to a run that never decided.** The first version
   sampled from navigation and reported `start=null` for all 45 samples at 1x - which I
   nearly read as "the governor never ran". It was hydration. The harness now waits for the
   store to exist before sampling.
2. **"hz=0" looked like the refresh estimate never landing**, which would mean the tier
   block never runs at all. It was my report reading the FIRST sample, taken before the
   96-frame estimate completes. Across the samples the estimate does land: 60Hz at 1x.
3. **The 4x run reports 75Hz**, which is wrong - throttling lengthens frames and the
   estimator reads the fast tail. It does not affect this result (the tier stayed low
   either way) but it means a throttled run judges against a 75fps target, i.e. an even
   harsher bar than intended. Worth knowing before anyone tunes against a throttled number.
4. **Starting low could have been achieved and then instantly undone** by something else
   writing `quality`. Only the governor writes it, and the runs show no transition at all.

### NOT MEASURED

- **The acceptance itself.** "The owner's desktop feels smooth" is the only criterion that
  closes this item and it is not mine to measure.
- Whether the trims are visible. God rays 60 to 32 samples, DPR 1.5 to 1.25 and Bloom
  pinned at 7 levels are cost changes, but `levels` is per-STATE not per-tier, so the glow
  reaches slightly less far on every tier including mobile. Tiers stay identical to each
  other, so the tier law holds; the look change is the owner's eye.
- Render count per frame. The ruling for SUN-2 asks for that check; nothing here adds or
  removes a pass, it only reduces samples and resolution within existing ones.

### AFTER MERGING MASTER - the collision, and a reading I nearly reported wrong

The other lane shipped overlapping performance work while this branch was open, and on two
of the three trims theirs is better, so theirs was taken:

| trim | ruling asked | outcome |
|---|---|---|
| Bloom levels | 9 -> 7 | **theirs: 9 -> 6**, with a half-res base and a tier-aware key. `mipmapBlur` costs a downsample and an upsample PER LEVEL, which is the real explanation of the render count |
| DPR | 1.5 -> 1.25 | **theirs: opens at 1**, owned by a ResolutionScaler that raises it where there is headroom. Strictly better than a static 1.25 |
| god rays | 60 -> ~32 | **mine, on top of theirs**: they added `resolutionScale 0.5` and 26 -> 16 on low; 60 -> 32 on high applied over it |

What remains genuinely from PERF-2 is the part the ruling named as the defect - the
assignment - plus the HUD line.

Re-measured after the merge: both runs still **start low, stay low, zero transitions**.

**A reading I nearly reported as a regression:** that run showed a median of 30fps at 1x
against 63 before the merge. Checked rather than reported: two rounds of a direct frame-
interval sample against **live production as the control** gave 60.0fps and a p95 frame of
16.7ms on both the merged branch and production, twice each. The 30 was the HUD's smoothed
counter during a contended run on this machine, not the page.

### VERDICT

**PASS** on what is measurable: starts low, stays low under throttle, never flaps, in both
runs. The closing criterion is the owner's own machine.
