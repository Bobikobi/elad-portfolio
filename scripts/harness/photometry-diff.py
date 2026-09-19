#!/usr/bin/env python3
"""
P1-1 - measure. Capture with `photometry-diff.mjs` first.

    python3 scripts/harness/photometry-diff.py before after

Answers one question per view: did the refactor move a pixel that the live clock would not
have moved anyway?

Three numbers per view:

    floor  the two shots taken ~900ms apart from the SAME build. Animation phase only.
           This is what "unchanged" actually costs on a scene with a live clock.
    diff   before[0] against after[0]. Animation phase PLUS whatever the code did.
    excess diff - floor. The part that is not explained by the clock.

A verdict of PASS needs BOTH: diff inside the P1-1 target (mean < 0.5, max < 4 of 255), and
diff not meaningfully above the floor. A diff that meets the target while sitting far above
the floor is still a change - it is just a small one, and it should be looked at rather than
waved through.

If the floor itself exceeds the target, the criterion is unmeetable as written on this scene
and the harness says so instead of pretending. That is a finding about the criterion, not
about the code.

Difference images are written amplified 20x next to the captures, because the scalar is not
where you see WHERE the change is - and P1-1's whole risk is one constant moving one region.
"""
import sys
import os
import json
import numpy as np
from PIL import Image

OUT = os.environ.get('OUT', os.path.join(os.getcwd(), '.harness-out', 'photometry-diff'))
VIEWS = ['overview', 'about', 'services', 'projects', 'technologies', 'contact']
MEAN_TARGET = 0.5
MAX_TARGET = 4.0
AMPLIFY = 20


def load(tag, view, idx):
    p = os.path.join(OUT, f'{tag}-{view}-{idx}.png')
    if not os.path.exists(p):
        return None
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.float64)


def compare(a, b):
    """Absolute per-pixel difference in 0-255 units, over all three channels."""
    if a.shape != b.shape:
        return None
    d = np.abs(a - b)
    return {
        'mean': float(d.mean()),
        'p999': float(np.percentile(d, 99.9)),
        'max': float(d.max()),
        'over1': float((d.max(axis=2) > 1).mean() * 100),
        'map': d.max(axis=2),
    }


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    before, after = sys.argv[1], sys.argv[2]

    rows, verdicts = [], []
    for view in VIEWS:
        b0, b1 = load(before, view, 0), load(before, view, 1)
        a0, a1 = load(after, view, 0), load(after, view, 1)
        if b0 is None or a0 is None:
            rows.append((view, None, None, None, 'MISSING'))
            verdicts.append(False)
            continue

        floor = compare(b0, b1) if b1 is not None else None
        floor_a = compare(a0, a1) if a1 is not None else None
        # The honest floor is the worse of the two builds' own self-noise.
        if floor and floor_a:
            floor = floor if floor['mean'] >= floor_a['mean'] else floor_a

        diff = compare(b0, a0)
        if diff is None:
            rows.append((view, None, None, None, 'SIZE MISMATCH'))
            verdicts.append(False)
            continue

        Image.fromarray(
            np.clip(diff['map'] * AMPLIFY, 0, 255).astype(np.uint8)
        ).save(os.path.join(OUT, f'diff-{view}.png'))

        within_target = diff['mean'] < MEAN_TARGET and diff['max'] < MAX_TARGET
        floor_note = ''
        if floor:
            if floor['mean'] >= MEAN_TARGET or floor['max'] >= MAX_TARGET:
                floor_note = ' FLOOR EXCEEDS TARGET'
            elif diff['mean'] > floor['mean'] * 2 + 0.05:
                floor_note = ' above floor'
        ok = within_target and 'EXCEEDS' not in floor_note
        verdicts.append(ok)
        rows.append((view, floor, diff, floor_note, 'PASS' if ok else 'FAIL'))

    w = max(len(v) for v in VIEWS)
    print(f'{"view".ljust(w)}  {"floor mean/max":>16}  {"diff mean/max":>16}  {">1 of 255":>10}  verdict')
    print('-' * (w + 56))
    for view, floor, diff, note, verdict in rows:
        if diff is None:
            print(f'{view.ljust(w)}  {"-":>16}  {"-":>16}  {"-":>10}  {verdict}')
            continue
        f = f'{floor["mean"]:.3f}/{floor["max"]:.0f}' if floor else 'n/a'
        d = f'{diff["mean"]:.3f}/{diff["max"]:.0f}'
        print(f'{view.ljust(w)}  {f:>16}  {d:>16}  {diff["over1"]:>9.2f}%  {verdict}{note}')

    print(f'\ntarget: mean < {MEAN_TARGET} and max < {MAX_TARGET} of 255, on every view')
    print(f'difference images (x{AMPLIFY}) -> {OUT}/diff-<view>.png')
    ok = all(verdicts)
    print('\nP1-1: ' + ('PASS' if ok else 'FAIL'))
    json.dump(
        {'before': before, 'after': after,
         'views': {r[0]: ({'floor': {k: v for k, v in r[1].items() if k != 'map'} if r[1] else None,
                           'diff': {k: v for k, v in r[2].items() if k != 'map'} if r[2] else None,
                           'verdict': r[4]}) for r in rows}},
        open(os.path.join(OUT, f'{before}-vs-{after}.json'), 'w'), indent=2)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
