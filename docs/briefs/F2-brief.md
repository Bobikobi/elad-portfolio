## BRIEF: F2 - Classic view toggle

### GOAL

A persistent navbar toggle that switches the whole site between the cosmic WebGL
experience and a simple, fast, non-WebGL layout, persisted in a cookie that is read on
the server so a reload never flashes the wrong mode.

### CURRENT STATE (measured on the preview alias, 1440x900, commit 82d4d87)

Cosmic mode is already cleanly separable from a DOM-only mode, and the bundle split
already works:

| page | mode | JS transferred | canvas | largest chunk |
|---|---|---|---|---|
| `/` | cosmic | 675 KB | yes | 424 KB |
| `/projects` | cosmic | 664 KB | yes | 424 KB |
| `/` | reduced-motion | 249 KB | no | 71 KB |
| `/projects` | reduced-motion | 239 KB | no | 71 KB |

The 424 KB chunk is three.js + R3F + drei + postprocessing. It is behind
`dynamic(() => import('@/components/scene/SceneRoot'), { ssr: false })` and
`CosmicStage` returns `null` before rendering it, so when the scene is off the chunk is
never requested. The stage's acceptance criterion "no WebGL chunks in classic mode" is
therefore satisfied by the mechanism that already exists, provided classic mode makes
that decision before render.

**What is NOT ready is the layout underneath.** With the scene off:

- `/` renders Hero over the galaxy poster and 5082 characters of real content below the
  fold. Usable today.
- `/projects` renders the B8b ring - two annular sectors tilted around a planet that is
  not being drawn, 2 of 12 projects reachable, the rest of the frame empty. Screenshot:
  `.harness-out/f2/reduced_projects.png`. The other four section routes render the same
  way through `PlanetWorld`: a `position: fixed` glass overlay sized against a scene.
- Measured overlay count: 4-5 fixed-position elements per route with the scene off.

This is not a B8b regression - the previous rectangular column had the same structural
problem - but B8b made it conspicuous, because the shapes are now overtly planet-shaped.

Existing raw material for classic pages: `src/components/sections/` still holds
`Hero, About, AboutTimeline, Services, Projects, TechStack, Contact`, all rendered today
as one long scroll from `Hero.tsx` on the home route. `Footer.tsx` exists and is already
gated on `!immersive` in `ClientProviders.tsx:54`.

### DIAGNOSIS

There is no "classic view" to switch to yet. Turning the scene off does not produce one:
it produces a scene-shaped DOM with nothing behind it. F2 is two separable pieces -
(a) the mode itself: cookie, server read, toggle, no flash; (b) a real layout for the
five section routes in that mode. Piece (a) is fully specified by the plan. Piece (b) is
not, and it is the larger half.

`immersive` is currently computed twice from the same two hooks -
`ClientProviders.tsx:33` (route-aware) and `CosmicStage.tsx:30` (not route-aware). The
mode has to enter at one place both of them read, or they will disagree.

### RECIPE (piece (a), pending answers on piece (b))

- `src/lib/viewMode.ts`: the `viewMode` cookie name, type, and the parse/serialise pair.
- `src/app/layout.tsx`: read the cookie with `cookies()` (it already reads `headers()`),
  pass `initialViewMode` into `ClientProviders`, and stamp it on `<html data-view>` so
  CSS can respond before hydration.
- `src/components/layout/ClientProviders.tsx`: a `ViewModeProvider` beside `I18nProvider`;
  `immersive` becomes `viewMode === 'cosmic' && webgl && !motionDisabled && (isHome || section)`.
  `CosmicStage` reads the same context instead of recomputing.
- `src/components/layout/Navbar.tsx`: the toggle, in all three locales, writing the
  cookie plus `localStorage`, then a router refresh so the server re-renders in the new
  mode.
- `src/components/scene/SceneBoundary.tsx` (no-WebGL fallback) and the reduced-motion
  path: a link into classic view.
- `src/lib/translations.ts`: the button label in he/en/ru.
- Crawlers: no cookie means cosmic, so a crawler gets cosmic unchanged.

### ACCEPTANCE (from the stage)

1. Toggle works both directions from every route, in all three locales.
2. Survives reload and client-side navigation.
3. Zero WebGL chunks in classic mode - measured as total JS transferred, target under
   260 KB against the 664-675 KB cosmic baseline, and no 424 KB chunk in the list.
4. SSR renders the correct mode with no flash - measured as: no canvas element in the
   first paint, and no layout shift attributable to the mode between first paint and
   hydration.
5. Screenshots of classic and cosmic at 1440x900 and 390x844, all three locales.

### VERIFICATION PLAN

`scripts/harness/f2-viewmode.mjs`, same shape as the B8b harnesses: isolated browser
context per case, real GPU flags (`--use-gl=angle --use-angle=vulkan` - the only set that
gives hardware here), preview alias with the bypass header. Per case it records total JS
transfer from the Performance API, canvas presence at first paint and after settle,
cookie round-trip across a reload and a client-side navigation, and a screenshot.
Adversarial checks to run: that the classic measurement is not simply a failed page load,
that the "no flash" claim is not an artifact of screenshotting after hydration, and that
the cookie is genuinely read server-side rather than corrected on the client.

### RISKS / ROLLBACK

- The mode enters the render path in the root layout, so a mistake affects every route.
  Mitigated by keeping the default with no cookie exactly today's behaviour.
- If classic reuses `sections/*`, those components have not been exercised as standalone
  pages; they are currently only ever rendered inside the home scroll.
- Rollback is a single revert - nothing else depends on the cookie.

### OPEN QUESTIONS FOR OWNER

1. **What is a classic section page?** The five routes currently render scene overlays.
   Options: (a) route each to its `sections/*` counterpart as a normal page - the
   components exist and are styled, but their copy differs from the world copy; (b) reuse
   the world content components (`AboutWorld`, `ProjectsWorld`, ...) inside a plain
   container, keeping one content source and losing the existing section design; (c)
   classic routes scroll to an anchor on the one-page home. The plan says "same content
   source", which points at (b), but (a) is the one that already looks like a website.
2. **Classic home:** is it what the scene-off home renders today (Hero + the full section
   scroll, over the galaxy poster), with the poster dropped? Or a different layout?
3. **Toggle placement:** navbar on desktop is a centre row of links with the locale
   switcher on one side. Where does the button go, and does it also appear in the mobile
   drawer?
4. **Reduced motion and no-WebGL:** the plan says both should offer a *link* to classic.
   Should they instead default *into* classic when no cookie is set? A reduced-motion
   visitor today lands on the broken `/projects` shown above, and a link they have to
   notice does not fix that.

Answering 1 and 4 unblocks the whole stage; 2 and 3 can be decided during implementation.
