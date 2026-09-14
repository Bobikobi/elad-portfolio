# P2 verify - every body's peak

Written 2026-09-14, after the fact and labelled as such. P2 had no verify artifact and no
`INDEX.md` row.

P2's acceptance, quoted from [PHOTOMETRY-megaplan.md](PHOTOMETRY-megaplan.md): *"a table of
all eight bodies with peak linear radiance, at the current lighting, on a real GPU, from the
preview alias."*

**All four conditions are met, including the alias**, which is why this is signed and P1 is
not.

## The table

`scripts/harness/sun-3.{mjs,py}`, tag `sun3-alias`, captured from
`https://elad-portfolio-git-codex-p1-pilot-bobikobis-projects.vercel.app`, real GPU
(ANGLE / Vulkan / Intel), solar overview at DPR 2.

    body      diam px  ch  peak  peak linear   p99  p99 linear   blown disc
    --------- -------  --  ----  -----------  ----  ----------   ----------
    mercury      45.5   R   250       0.9560  250.0     0.9560        3.88%
    venus        52.6   R   216       0.6867  210.0     0.6445        0.00%
    earth       130.8   B   247       0.9301  247.0     0.9301        1.19%
    mars         54.1   R   252       0.9734  251.0     0.9647       11.24%
    jupiter     167.8   R   247       0.9301  246.0     0.9216       12.85%
    saturn      100.3   R   251       0.9647  251.0     0.9647       51.45%
    uranus       82.8   G   230       0.7913  230.0     0.7913        0.00%
    neptune      94.6   B    87       0.0953   86.0     0.0931        0.00%

`ch` is the channel that peaks. Linear values are the sRGB peak inverted through the
transfer function, which is what P2 exists to produce: the plan's albedo work was deriving
multipliers from **disc averages** while clipping happens at the **sub-solar point**, and a
multiplier derived from a mean and applied to a peak fixes the number without fixing the
picture.

Confirmed on localhost the same hour, same code: every row matches within the harness's own
live-clock noise (`sun-3.mjs` has no fixed-step freeze, so two runs are never the same
orbital phase). Largest disagreement across the eight bodies is 0.08 percentage points of
blown disc.

## What the table says, and it is not what P3's own numbers say

P3 reported its clipping as **overview 1,498 px, about 9,716 px**, concentrated in Earth's
cloud tops and Venus. Read per body at the peak instead of per view:

- **Saturn is the worst body on the overview by a wide margin - 51.45% of its disc is
  blown**, against Jupiter's 12.85% and Mars's 11.24%. Saturn does not appear in P3's
  account of the remaining failures at all.
- **Venus, the body P3 names, peaks at 0.6867 linear and blows 0.00% of its disc here.**
- Neptune peaks at 0.0953 linear, an order of magnitude below every other body, and is the
  only one with real headroom.

These are not contradictory - P3-1 counts pixels over 250 in **all three channels**, and
this counts each body's own peak channel against its own disc - but they rank the bodies
differently, and the P4-shaped question "which body is actually over-exposed" gets a
different answer depending on which instrument asked. That is worth having on the record
before P4 picks a target.

## Status

P2 is **PASS and signed under rule 2**. It changed no code and no pixels; it is a
measurement, and the measurement now exists as an artifact instead of as a line in a plan.
