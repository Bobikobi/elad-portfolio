# DIVE-OBJECTS verify (PR #42, stacked on #41)

Preview: elad-portfolio-e3xcn0iez (commit 4c51ac6). Real GPU (Intel RPL-P, Vulkan). Instrument: crossing.mjs, 630-frame ramp, each direction twice.

| Criterion | Result |
|---|---|
| D1 at-rest frame untouched (objects opacity 0 outside their scroll windows) | PASS by construction; rest-phase mean 76.1 / 30.3 identical in all 4 runs; C4a not re-run |
| D2 dark frames 0, both directions | PASS 0/0 (runs 1 and 2, down and up) |
| D3 run-to-run agreement | PASS: max_jump 18.2/18.2 down, 18.3/18.3 up; max_mean 81.5/81.5 and 84.4/84.4 |
| D4 objects visible in their windows | PASS on contact sheet (pillars sp .27-.40, cluster .46-.52, shell .58-.65) |
| D5 no new one-frame flashes (edge-flash SCROLL=1, real time) | no regression: big flashes 17 and 34 vs 38 on the #41 preview (single baseline run, route /about) |
| C1 down | still reads FAIL 8.67 vs 8.0: peak sits at the start of the ramp, same known scene-time drift as #41, not an object |

Judgment left to Elad: whether the pillars read as dark pillars or as black slabs, whether the cluster blob reads as a cluster, whether the shell ring is too faint.
