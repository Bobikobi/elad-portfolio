#!/usr/bin/env python3
"""Report one startup attribution table from mobile-startup.mjs raw artifacts.

    python3 scripts/harness/mobile-startup.py [TAG]
    OUT=/path/to/artifacts python3 scripts/harness/mobile-startup.py [TAG]

The denominator is the union of top-level tasks on Chrome's CrRendererMain thread during
the CPU profile. Explicit WebGL/user-timing and browser trace spans claim their own time
first. Remaining JavaScript time comes from CPU-profile leaf samples. Any busy interval
which neither instrument can name stays "unattributed"; it is never donated to a phase.
"""

from __future__ import annotations

import bisect
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlsplit


OUT = Path(os.environ.get("OUT", Path.cwd() / ".harness-out" / "mobile-startup"))
TAG = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("TAG", "now")

PHASES = [
    "module evaluation",
    "geometry and buffer construction",
    "shader compile/link",
    "texture decode and upload",
    "first-frame render",
    "everything else",
    "unattributed",
]

TASK_RE = re.compile(
    r"(?:^|::)(?:RunTask|DoWork)$|ThreadController.*RunTask|ThreadPool_RunTask",
    re.I,
)
SHADER_RE = re.compile(r"compile.?shader|shader.?compile|link.?program|program.?link", re.I)
BUFFER_RE = re.compile(r"buffer(?:data|subdata)|createbuffer|upload.*buffer", re.I)
TEXTURE_RE = re.compile(
    r"decode.*image|image.*decode|tex(?:sub)?image|upload.*texture|texture.*upload",
    re.I,
)
NON_JS_RE = re.compile(
    r"^(?:Layout|UpdateLayoutTree|RecalculateStyles|ParseHTML|Paint|CompositeLayers|"
    r"PrePaint|Layerize|HitTest|CommitLoad)$",
    re.I,
)

# These are exact scene constructors/components whose own call trees build procedural
# arrays. An anonymous/minified descendant is classified only when this ancestry exists;
# a chunk URL alone is never guessed to be geometry.
GEOMETRY_ANCESTOR_RE = re.compile(
    r"^(?:Galaxy|SeededStars|AsteroidBelt|ZodiacalDust|DiveField|Dust|HeroStars|TransitVeils)$"
)
GEOMETRY_LEAF_RE = re.compile(
    r"BufferGeometry|BufferAttribute|setAttribute|setMatrixAt|fromBufferAttribute",
    re.I,
)

Interval = tuple[float, float]


def fail(message: str) -> None:
    raise SystemExit(f"mobile-startup: {message}")


def load_json(path: Path):
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        fail(f"missing {path}")
    except json.JSONDecodeError as error:
        fail(f"invalid JSON in {path}: {error}")


def merge(intervals: list[Interval]) -> list[Interval]:
    ordered = sorted((a, b) for a, b in intervals if b > a)
    out: list[list[float]] = []
    for start, end in ordered:
        if not out or start > out[-1][1]:
            out.append([start, end])
        else:
            out[-1][1] = max(out[-1][1], end)
    return [(a, b) for a, b in out]


def intersect_one(interval: Interval, ranges: list[Interval]) -> list[Interval]:
    start, end = interval
    out = []
    for left, right in ranges:
        if right <= start:
            continue
        if left >= end:
            break
        a, b = max(start, left), min(end, right)
        if b > a:
            out.append((a, b))
    return out


def subtract_one(interval: Interval, cuts: list[Interval]) -> list[Interval]:
    pieces = [interval]
    for cut_start, cut_end in cuts:
        next_pieces = []
        for start, end in pieces:
            if cut_end <= start or cut_start >= end:
                next_pieces.append((start, end))
                continue
            if start < cut_start:
                next_pieces.append((start, min(end, cut_start)))
            if cut_end < end:
                next_pieces.append((max(start, cut_end), end))
        pieces = next_pieces
        if not pieces:
            break
    return pieces


def subtract(ranges: list[Interval], cuts: list[Interval]) -> list[Interval]:
    cuts = merge(cuts)
    return merge([piece for interval in ranges for piece in subtract_one(interval, cuts)])


def duration(intervals: list[Interval]) -> float:
    return sum(end - start for start, end in merge(intervals))


def async_id(event: dict) -> str:
    value = event.get("id2", event.get("id", ""))
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def complete_events(events: list[dict]) -> list[dict]:
    """Normalize X, B/E and async b/e trace records to start/end intervals."""
    complete = []
    stacks: dict[tuple, list[dict]] = defaultdict(list)
    async_starts: dict[tuple, list[dict]] = defaultdict(list)

    for event in sorted(events, key=lambda item: float(item.get("ts", 0))):
        phase = event.get("ph")
        ts = float(event.get("ts", 0))
        if phase == "X" and float(event.get("dur", 0)) > 0:
            complete.append({**event, "start": ts, "end": ts + float(event["dur"])})
        elif phase == "B":
            stacks[(event.get("pid"), event.get("tid"))].append(event)
        elif phase == "E":
            stack = stacks[(event.get("pid"), event.get("tid"))]
            if stack:
                begin = stack.pop()
                if ts > float(begin.get("ts", 0)):
                    complete.append({**begin, "start": float(begin["ts"]), "end": ts})
        elif phase in {"b", "S"}:
            key = (
                event.get("pid"), event.get("cat"), event.get("name"),
                event.get("scope"), async_id(event),
            )
            async_starts[key].append(event)
        elif phase in {"e", "F"}:
            key = (
                event.get("pid"), event.get("cat"), event.get("name"),
                event.get("scope"), async_id(event),
            )
            starts = async_starts.get(key)
            if starts:
                begin = starts.pop()
                if ts > float(begin.get("ts", 0)):
                    complete.append({**begin, "start": float(begin["ts"]), "end": ts})
    return complete


def clipped(event: dict, start: float, end: float) -> Interval | None:
    left, right = max(start, event["start"]), min(end, event["end"])
    return (left, right) if right > left else None


def compact_url(url: str) -> str:
    if not url:
        return "(no URL)"
    if url.startswith(("pptr:", "extensions::", "native ")):
        return url
    parts = urlsplit(url)
    if parts.scheme in {"http", "https"}:
        return f"{parts.netloc}{parts.path}"
    return url


def source_name(frame: dict) -> str:
    function = frame.get("functionName") or "(anonymous)"
    url = compact_url(frame.get("url", ""))
    line = int(frame.get("lineNumber", -1)) + 1
    location = f"{url}:{line}" if line > 0 else url
    return f"{function} — {location}"


def node_ancestry(node_id: int, nodes: dict[int, dict], parents: dict[int, int]) -> list[dict]:
    out = []
    seen = set()
    while node_id in nodes and node_id not in seen:
        seen.add(node_id)
        node = nodes[node_id]
        out.append(node.get("callFrame", {}))
        node_id = parents.get(node_id, -1)
    return out


def classify_stack(frames: list[dict]) -> str:
    names = [frame.get("functionName", "") for frame in frames]
    joined = " ".join(names)
    if SHADER_RE.search(joined):
        return "shader compile/link"
    if TEXTURE_RE.search(joined):
        return "texture decode and upload"
    if GEOMETRY_LEAF_RE.search(joined) or any(GEOMETRY_ANCESTOR_RE.match(name) for name in names):
        return "geometry and buffer construction"
    return "everything else"


def interval_contains(ranges: list[Interval], starts: list[float], point: float) -> bool:
    index = bisect.bisect_right(starts, point) - 1
    return index >= 0 and ranges[index][0] <= point < ranges[index][1]


def trace_rule(event: dict) -> tuple[str, str, bool] | None:
    """Return phase, source, forced-source. False means a CPU-phase overlay."""
    name = str(event.get("name", ""))
    lower = name.lower()
    if name == "mobile-startup:first-frame-render":
        return "first-frame render", "", False
    if name.startswith("mobile-startup:"):
        parts = name.split(":")
        instrument_phase = parts[1] if len(parts) > 1 else ""
        operation = parts[2] if len(parts) > 2 else instrument_phase
        mapping = {
            "shader-compile-link": "shader compile/link",
            "geometry-buffer": "geometry and buffer construction",
            "texture-decode-upload": "texture decode and upload",
            "first-frame-render": "first-frame render",
        }
        phase = mapping.get(instrument_phase)
        if phase:
            return phase, f"[WebGL] {operation}", True
    if SHADER_RE.search(lower):
        return "shader compile/link", f"[browser] {name}", True
    if TEXTURE_RE.search(lower):
        return "texture decode and upload", f"[browser] {name}", True
    if BUFFER_RE.search(lower):
        return "geometry and buffer construction", f"[browser] {name}", True
    if name in {"EvaluateScript", "EvaluateModule", "v8.evaluateModule"}:
        return "module evaluation", "", False
    if NON_JS_RE.match(name):
        return "everything else", f"[browser] {name}", True
    return None


manifest_path = OUT / f"{TAG}-run.json"
manifest = load_json(manifest_path)
if manifest.get("status") != "complete":
    fail(f"run is {manifest.get('status', 'unknown')}: {manifest.get('error', 'no error recorded')}")

gpu = str(manifest.get("gpu", ""))
if not re.search(r"angle|vulkan", gpu, re.I) or re.search(r"swiftshader|llvmpipe|software", gpu, re.I):
    fail(f"manifest does not identify a real ANGLE/Vulkan GPU: {gpu or '(missing)'}")

artifacts = manifest.get("artifacts", {})
profile_path = OUT / Path(artifacts.get("profile", "")).name
trace_path = OUT / Path(artifacts.get("trace", "")).name
profile = load_json(profile_path)
trace = load_json(trace_path)
trace_events = trace.get("traceEvents", trace) if isinstance(trace, dict) else trace
if not isinstance(trace_events, list):
    fail("trace has neither a traceEvents array nor a top-level event array")

profile_start = float(profile.get("startTime", 0))
profile_end = float(profile.get("endTime", 0))
if not profile_start or profile_end <= profile_start:
    fail("CPU profile has an invalid time range")

thread_names = {}
for event in trace_events:
    if event.get("ph") == "M" and event.get("name") == "thread_name":
        thread_names[(event.get("pid"), event.get("tid"))] = event.get("args", {}).get("name", "")

events = complete_events(trace_events)
candidates = [
    thread for thread, name in thread_names.items()
    if re.search(r"CrRendererMain|RendererMain", str(name), re.I)
]
if not candidates:
    fail("trace contains no CrRendererMain thread metadata")


def task_ranges(thread: tuple) -> list[Interval]:
    ranges = []
    for event in events:
        if (event.get("pid"), event.get("tid")) != thread or not TASK_RE.search(str(event.get("name", ""))):
            continue
        interval = clipped(event, profile_start, profile_end)
        if interval:
            ranges.append(interval)
    return merge(ranges)


candidate_tasks = []
for thread in candidates:
    tasks = task_ranges(thread)
    instrumented = sum(
        1 for event in events
        if (event.get("pid"), event.get("tid")) == thread
        and str(event.get("name", "")).startswith("mobile-startup:")
        and clipped(event, profile_start, profile_end)
    )
    candidate_tasks.append((instrumented, duration(tasks), thread, tasks))
_, total_us, main_thread, busy = max(candidate_tasks, key=lambda item: (item[0], item[1]))
if total_us <= 0:
    fail("no top-level main-thread task intervals overlap the CPU profile")

main_events = [
    event for event in events
    if (event.get("pid"), event.get("tid")) == main_thread and clipped(event, profile_start, profile_end)
]

# Forced spans are native/self-describing work. Overlays supply a phase to CPU samples but
# deliberately retain the leaf function/URL as their source.
forced_events = []
overlays: dict[str, list[Interval]] = defaultdict(list)
seen_instrumented_phases = set()
phase_priority = {
    "shader compile/link": 0,
    "texture decode and upload": 1,
    "geometry and buffer construction": 2,
    "module evaluation": 3,
    "first-frame render": 4,
    "everything else": 5,
}
for event in main_events:
    rule = trace_rule(event)
    if not rule:
        continue
    phase, source, forced = rule
    if str(event.get("name", "")).startswith("mobile-startup:"):
        seen_instrumented_phases.add(phase)
    interval = clipped(event, profile_start, profile_end)
    if not interval:
        continue
    if forced:
        instrumented = str(event.get("name", "")).startswith("mobile-startup:")
        forced_events.append((phase_priority[phase], not instrumented, interval[1] - interval[0], interval, phase, source))
    else:
        overlays[phase].append(interval)

for phase in list(overlays):
    overlays[phase] = merge(overlays[phase])
overlay_starts = {phase: [start for start, _ in ranges] for phase, ranges in overlays.items()}

probe_spans = manifest.get("milestones", {}).get("instrumentedSpans", {})
probe_phase_names = {
    "shader-compile-link": "shader compile/link",
    "geometry-buffer": "geometry and buffer construction",
    "texture-decode-upload": "texture decode and upload",
    "first-frame-render": "first-frame render",
}
expected_instrumented_phases = {
    probe_phase_names[name]
    for name, values in probe_spans.items()
    if name in probe_phase_names and float(values.get("duration", 0)) > 0
}
expected_instrumented_phases.add("first-frame render")
missing_instrumentation = expected_instrumented_phases - seen_instrumented_phases
if missing_instrumentation:
    fail(
        "trace is missing recorded instrumentation for: "
        + ", ".join(sorted(missing_instrumentation))
    )

phase_us = defaultdict(float)
source_us = defaultdict(float)
available = busy
for _, _, _, interval, phase, source in sorted(forced_events):
    pieces = intersect_one(interval, available)
    amount = duration(pieces)
    if amount <= 0:
        continue
    phase_us[phase] += amount
    source_us[source] += amount
    available = subtract(available, pieces)

nodes = {int(node["id"]): node for node in profile.get("nodes", [])}
parents = {}
for node_id, node in nodes.items():
    for child in node.get("children", []):
        parents[int(child)] = node_id

samples = profile.get("samples", [])
deltas = profile.get("timeDeltas", [])
if not samples or len(samples) != len(deltas):
    fail("CPU profile samples/timeDeltas are missing or have different lengths")

cursor = profile_start
sample_coverage = []
for node_id, delta in zip(samples, deltas):
    delta = float(delta)
    sample_interval = (cursor, min(profile_end, cursor + max(0.0, delta)))
    cursor += max(0.0, delta)
    if sample_interval[1] <= sample_interval[0]:
        continue
    node = nodes.get(int(node_id))
    if not node:
        continue
    frames = node_ancestry(int(node_id), nodes, parents)
    leaf = frames[0] if frames else {}
    function = leaf.get("functionName", "")
    # V8 uses these sentinel samples while the thread is idle or in unobserved native work.
    # GC is genuine sampled work; idle/program are left for trace or "unattributed".
    if function in {"(idle)", "(program)", "(root)"}:
        continue

    pieces = intersect_one(sample_interval, available)
    for start, end in pieces:
        midpoint = (start + end) / 2
        phase = None
        for candidate in ("module evaluation", "first-frame render"):
            ranges = overlays.get(candidate, [])
            if ranges and interval_contains(ranges, overlay_starts[candidate], midpoint):
                phase = candidate
                break
        phase = phase or classify_stack(frames)
        amount = end - start
        source = source_name(leaf)
        phase_us[phase] += amount
        source_us[source] += amount
        sample_coverage.append((start, end))

residual = subtract(available, sample_coverage)
for phase, source in (
    ("module evaluation", "[browser] module evaluation (unsampled)"),
    ("first-frame render", "[browser] first-frame render (unsampled)"),
):
    overlay_pieces = [
        piece
        for interval in overlays.get(phase, [])
        for piece in intersect_one(interval, residual)
    ]
    overlay_pieces = merge(overlay_pieces)
    amount = duration(overlay_pieces)
    if amount > 0:
        phase_us[phase] += amount
        source_us[source] += amount
        residual = subtract(residual, overlay_pieces)
residual_us = duration(residual)
phase_us["unattributed"] += residual_us
source_us["[unattributed]"] += residual_us

accounted = sum(phase_us.values())
if abs(accounted - total_us) > max(1.0, total_us * 1e-6):
    fail(f"internal accounting error: phases cover {accounted} us of {total_us} us")

settings = manifest.get("emulation")
if not isinstance(settings, dict):
    fail("manifest has no emulation object")
viewport = settings.get("viewport", {})
network = settings.get("network", {})
down_mbit = float(network.get("downloadThroughput", 0)) * 8 / 1_000_000
up_mbit = float(network.get("uploadThroughput", 0)) * 8 / 1_000_000

print(f"Run: {manifest.get('base')}  build {manifest.get('build', {}).get('revision')}  GPU {gpu}")
print(
    f"Emulation: {settings.get('device')}; "
    f"{viewport.get('width')}x{viewport.get('height')} @ DPR {viewport.get('deviceScaleFactor')}; "
    f"CPU {settings.get('cpuThrottlingRate')}x; {network.get('name')} "
    f"{down_mbit:g}/{up_mbit:g} Mbit/s, {network.get('latency')} ms latency"
)
print(f"Total main-thread time: {total_us / 1000:.1f} ms")
print()

rows = [("PHASE", phase, phase_us[phase]) for phase in PHASES]
top_sources = sorted(
    ((source, value) for source, value in source_us.items() if value > 0),
    key=lambda item: (-item[1], item[0]),
)[:15]
rows.extend(("SOURCE", source, value) for source, value in top_sources)

kind_width = max(len("TYPE"), *(len(kind) for kind, _, _ in rows))
name_width = min(100, max(len("ITEM"), *(len(name) for _, name, _ in rows)))
print(f"{'TYPE':<{kind_width}}  {'ITEM':<{name_width}}  {'SELF MS':>12}  {'% TOTAL':>8}")
print(f"{'-' * kind_width}  {'-' * name_width}  {'-' * 12}  {'-' * 8}")
for kind, name, value in rows:
    display = name if len(name) <= name_width else name[: name_width - 1] + "…"
    percent = value * 100 / total_us
    print(f"{kind:<{kind_width}}  {display:<{name_width}}  {value / 1000:12.1f}  {percent:7.2f}%")

largest_phase = max(PHASES, key=lambda phase: phase_us[phase])
largest_source, largest_source_us = top_sources[0]
top_three_us = sum(value for _, value in top_sources[:3])
print()
print(
    f"Where the time actually goes: {largest_phase} — {phase_us[largest_phase] / 1000:.1f} ms "
    f"({phase_us[largest_phase] * 100 / total_us:.2f}%)."
)
print(
    f"Single largest item: {largest_source} — {largest_source_us / 1000:.1f} ms "
    f"({largest_source_us * 100 / total_us:.2f}%)."
)
print(
    f"Top three: {top_three_us / 1000:.1f} ms, "
    f"{top_three_us * 100 / total_us:.2f}% of total main-thread time."
)
