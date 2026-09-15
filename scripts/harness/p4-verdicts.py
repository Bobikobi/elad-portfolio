#!/usr/bin/env python3
"""
P4 - one candidate's verdict against the owner-approved criteria (P4-brief.md, CRITERIA, REVISED).

    TAG=<cand>        EXTRA_QS='hl=knee,range,max[,power]'  node scripts/harness/p3-albedo.mjs
    TAG=turn-<cand>   EXTRA_QS='hl=knee,range,max[,power]'  node scripts/harness/mars-turn.mjs
    python3 scripts/harness/p4-verdicts.py <cand> [<cand> ...]

Baselines are today's shipped frame: `p4-on` for the six views and `turn-on` for Mars's full turn,
both captured without ?hl. The ?hl seam was validated before any candidate was believed: without it
the scene is byte-identical to m1-before, and ?hl=0.72,1.70,0.68 (today's values) reproduces p4-on
exactly on 13 bodies, 3 sun regions and 6 frames.

`p4-chroma` is always called as (p4-on, candidate), so the lit face comes from the candidate on every
run and chroma is compared over the same pixels. Targets are the approved halfway points.
"""

import importlib.util, json, subprocess, sys
spec = importlib.util.spec_from_file_location("p3", "scripts/harness/p3-albedo.py")
p3 = importlib.util.module_from_spec(spec); spec.loader.exec_module(p3)

for tag in sys.argv[1:]:
    print(f"\n######## {tag}")
    r = subprocess.run(['python3', 'scripts/harness/p4-chroma.py', 'p4-on', tag], capture_output=True, text=True)
    if r.returncode != 0:
        print("p4-chroma failed:", (r.stdout + r.stderr)[-600:]); continue
    d = json.load(open(f'.harness-out/p3-albedo/p4-on-vs-{tag}-p4.json'))
    rows = {(b['view'], b['body']): b for b in d['bodies']}
    sat, ven, ear = rows[('projects', 'saturn')], rows[('overview', 'venus')], rows[('about', 'earth')]
    ok = lambda c: 'PASS' if c else 'FAIL'
    print(f"P4-2 Saturn projects chroma      {sat['chromaOn']:.4f} -> {sat['chromaOff']:.4f}   target >= 0.0928   {ok(sat['chromaOff'] >= 0.0928)}")
    print(f"P4-3 Venus overview all-ch clip  {ven['clipAllOn']:>5} -> {ven['clipAllOff']:>5}   target <= 958      {ok(ven['clipAllOff'] <= 958)}")
    print(f"     Earth about all-ch clip     {ear['clipAllOn']:>5} -> {ear['clipAllOff']:>5}   target <= 8749     {ok(ear['clipAllOff'] <= 8749)}")
    losers = [(b['view'], b['body'], round(b['chromaOn'], 4), round(b['chromaOff'], 4)) for b in d['bodies'] if b['chromaOff'] < b['chromaOn']]
    print(f"P4-4 bodies losing chroma: {len(losers)}   {ok(not losers)}   {losers}")
    on_cap, c_cap = p3.load_capture('p4-on'), p3.load_capture(tag)
    rises = []
    for v in p3.VIEWS:
        a = int((p3.load_image(on_cap, v).min(axis=2) > 250).sum())
        b = int((p3.load_image(c_cap, v).min(axis=2) > 250).sum())
        if b > a:
            rises.append((v, a, b))
        print(f"     frame all-channel clip {v:<13} {a:>6} -> {b:>6}")
    print(f"P4-5 views where all-channel clipping rose: {len(rises)}   {ok(not rises)}")
    sun = d.get('sun') or []
    print("     sun chroma taken by the change (core/mid/limb): " + ", ".join(f"{s['region']} {s['chromaTakenPercent']:+.2f}%" for s in sun))
    tt = f'turn-{tag}'
    r = subprocess.run(['python3', 'scripts/harness/mars-turn.py', 'turn-on', tt], capture_output=True, text=True)
    if r.returncode != 0:
        print("mars-turn failed:", (r.stdout + r.stderr)[-500:]); continue
    j = json.load(open(f'.harness-out/mars-turn/turn-on-vs-{tt}-turn.json'))
    w0, w1 = j['worst']['clipAnyPercent'], j['other']['worst']
    print(f"P4-1 Mars worst longitude        {w0:.3f}% -> {w1:.3f}%   target <= today     {ok(w1 <= w0)}")
