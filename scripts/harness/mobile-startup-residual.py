#!/usr/bin/env python3
"""
MOBILE-2 N0 - name the unattributed quarter of the main thread.

    python3 scripts/harness/mobile-startup-residual.py TAG

`mobile-startup.py` reports ~25% of busy main-thread time as "unattributed" and is right to
refuse to donate it to a phase. This asks what is actually in there, so the hole can be
closed with evidence instead of a guess.

It IMPORTS mobile-startup.py and reads that module's own intermediate values - the busy
interval set, the residual after forced trace spans and CPU samples, the profile and the
node tree. Re-deriving them here would let this diagnostic disagree with the report it is
auditing, which is the failure mode the project already paid for once with SUN-3's disc
threshold.
"""
import io
import os
import sys
import importlib.util
from collections import defaultdict
from contextlib import redirect_stdout

HERE = os.path.dirname(os.path.abspath(__file__))
TAG = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("TAG", "now")
sys.argv = [sys.argv[0], TAG]

spec = importlib.util.spec_from_file_location("mobile_startup", os.path.join(HERE, "mobile-startup.py"))
ms = importlib.util.module_from_spec(spec)
with redirect_stdout(io.StringIO()):        # the report prints; we only want its numbers
    spec.loader.exec_module(ms)

residual = ms.residual
total_us = ms.total_us
res_us = ms.duration(residual)
print(f"{TAG}   source {ms.manifest['base']}   cpu {ms.manifest['emulation']['cpuThrottlingRate']}x")
print(f"total main-thread busy : {total_us/1000:9.1f} ms")
print(f"unattributed residual  : {res_us/1000:9.1f} ms   {100*res_us/total_us:5.2f}%")
print()

# ---------------------------------------------------------------- 1. CPU samples in the hole
# Every sample is placed, including the sentinels the report deliberately drops. A sentinel
# is not "nothing happened" - inside a BUSY top-level task it is V8 saying the thread is in
# native code with no JavaScript frame to name.
by_leaf = defaultdict(float)
by_sentinel = defaultdict(float)
cursor = ms.profile_start
covered = []
for node_id, delta in zip(ms.profile.get("samples", []), ms.profile.get("timeDeltas", [])):
    delta = max(0.0, float(delta))
    iv = (cursor, min(ms.profile_end, cursor + delta))
    cursor += delta
    if iv[1] <= iv[0]:
        continue
    node = ms.nodes.get(int(node_id))
    if not node:
        continue
    pieces = ms.intersect_one(iv, residual)
    amount = ms.duration(pieces)
    if amount <= 0:
        continue
    covered.extend(pieces)
    frames = ms.node_ancestry(int(node_id), ms.nodes, ms.parents)
    leaf = frames[0] if frames else {}
    fn = leaf.get("functionName", "") or "(anonymous)"
    if fn in {"(idle)", "(program)", "(root)", "(garbage collector)"}:
        by_sentinel[fn] += amount
        # For a sentinel the only useful attribution is who is BELOW it on the stack.
        named = next((f.get("functionName") for f in frames[1:] if f.get("functionName")
                      and f.get("functionName") not in {"(root)", "(program)", "(idle)"}), None)
        by_sentinel[f"    {fn} under {named or '<nothing - no JS on the stack>'}"] += amount
    else:
        by_leaf[f"{fn} {ms.source_name(leaf)}"] += amount

sampled_us = ms.duration(ms.merge(covered))
print(f"--- CPU samples that land in the hole: {sampled_us/1000:.1f} ms "
      f"({100*sampled_us/res_us:.1f}% of it)")
for k, v in sorted(by_sentinel.items(), key=lambda kv: -kv[1])[:10]:
    print(f"   {v/1000:8.1f} ms  {k[:78]}")
for k, v in sorted(by_leaf.items(), key=lambda kv: -kv[1])[:8]:
    print(f"   {v/1000:8.1f} ms  {k[:78]}")
print()

# ---------------------------------------------------------------- 2. Trace events in the hole
# Self time: a parent is not credited with what one of its own children already explains.
events = sorted(
    ((ms.clipped(e, ms.profile_start, ms.profile_end), e) for e in ms.main_events),
    key=lambda p: (p[0][0], -(p[0][1] - p[0][0])) if p[0] else (0, 0),
)
events = [(iv, e) for iv, e in events if iv]
by_event = defaultdict(float)
for i, (iv, e) in enumerate(events):
    pieces = ms.intersect_one(iv, residual)
    if not pieces:
        continue
    kids = []
    for jv, f in events[i + 1:]:
        if jv[0] >= iv[1]:
            break
        if jv[1] <= iv[1]:
            kids.append(jv)
    self_pieces = ms.subtract(pieces, ms.merge(kids)) if kids else pieces
    amount = ms.duration(self_pieces)
    if amount > 0:
        by_event[str(e.get("name", "?"))] += amount

traced = ms.merge([p for iv, e in events for p in ms.intersect_one(iv, residual)])
print(f"--- trace events that cover the hole: {ms.duration(traced)/1000:.1f} ms "
      f"({100*ms.duration(traced)/res_us:.1f}% of it), by SELF time")
for k, v in sorted(by_event.items(), key=lambda kv: -kv[1])[:14]:
    print(f"   {v/1000:8.1f} ms  {k[:78]}")
print()

dark = ms.subtract(residual, traced)
dark = ms.subtract(dark, ms.merge(covered))
print(f"--- genuinely dark: no CPU sample AND no trace event: {ms.duration(dark)/1000:.1f} ms "
      f"({100*ms.duration(dark)/total_us:.2f}% of the main thread)")
