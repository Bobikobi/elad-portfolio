# Fonts per locale - measured, with a corrected premise

Measured on the branch alias, real Chrome, cold browser cache per route, response bodies
weighed on the wire. Harness: `_s6fonts.mjs`, `_s6fonts2.mjs`, `_s6weights.mjs`
(gitignored).

## The premise was wrong, and that is the first finding

The brief said "all four fonts load on every page in every locale". They do not. The
Cyrillic pair is already correctly scoped out of Latin and Hebrew pages, and has been
since B9 - the `preload: false` comment in `layout.tsx` is doing exactly what it claims.

`document.fonts` status per locale, which is the authority on what the browser actually
used:

| Route | Families with a LOADED face | Declared but never loaded |
|---|---|---|
| `/` (en) | Heebo, Frank Ruhl Libre, Glamora | Playfair Display, Inter |
| `/he` | Heebo, Frank Ruhl Libre, Glamora | Playfair Display, Inter |
| `/ru` | Playfair Display, Inter, Glamora | **Heebo, Frank Ruhl Libre** |

Bytes on the wire:

| Route | Locale | Font files downloaded | Bytes |
|---|---|---|---|
| `/` | en | 5 | 167.0 KB |
| `/he` | he | 5 | 167.0 KB |
| `/ru` | ru | **9** | **265.1 KB** |
| `/services/nextjs-development` | en | 5 | 167.0 KB |
| `/guides/nextjs-vs-wordpress` | he | 5 | 167.0 KB |

## Finding 1 - Russian pages download 102.6 KB of fonts they never use

`/ru` fetches nine files. Four of them are Heebo and Frank Ruhl, and `document.fonts`
reports both families as **not loaded** on that page - because `html[lang='ru']` overrides
`--font-display` to Playfair and `--font-body` to Inter, so the CSS never asks for them.

They arrive anyway because `preload` defaults to true on those two declarations, and a
`<link rel="preload" as="font">` overrides the browser's own judgement: it fetches whether
or not any glyph needs the file. Four preload links are emitted on every page of the site,
in every locale.

**102.6 KB per Russian page load, used for nothing.**

The fix is not a one-line flag flip, which is why it is proposed rather than done.
`next/font` must be called at module scope, so "preload only for the locales that use it"
cannot be expressed in the root layout where all four are declared. The options:

* **Set `preload: false` on Heebo and Frank Ruhl as well.** One line, and Russian stops
  wasting the bytes. But English and Hebrew then lose the preload for the fonts they
  genuinely render - and `/he` already has the worst LCP on the site at 3.1-3.4s (S5),
  which is very likely the display font on the largest text element. This could easily
  cost more than it saves, on the locale that matters most.
* **Declare fonts per locale segment**, so the Russian subtree preloads Playfair/Inter and
  the rest preloads Heebo/Frank Ruhl. Correct, and a real refactor: the variables live on
  `<html>` in the root layout, and the un-prefixed tree serves both English routes and the
  Hebrew-only guides.

Either way it wants an A/B on the alias, measuring `/he` LCP before and after, not a
guess. I have not touched it.

## Finding 2 - Glamora is 64.3 KB for three glyphs, on every page in every locale

`public/fonts/GLAMORA.otf` is 65,836 bytes, loaded by a plain `@font-face` in
`globals.css`, and it renders exactly one string: the `E.S` logo in the navbar and the
footer. Three glyphs.

It is also the only font on the site shipped as raw OpenType rather than woff2, so it is
uncompressed relative to everything around it. It is the **largest single font file on the
site** and it is on the critical path of every page in every language.

Subsetting it to the glyphs actually used and converting to woff2 should take it to
roughly 1-2 KB: **about 62 KB saved on every page load, in every locale** - considerably
more than the Russian finding, and with no trade-off at all, since nothing about the
rendering changes.

`font-display: swap` is already set, so there is no blocking issue to fix.

**This needs a dependency and therefore your approval** (per the tool-installation policy):
`fonttools` with `brotli` for woff2 output, into the project's existing `.venv` on D:, at
a pinned version. It is Google's own font tooling and the standard way to do this. It
would be a build-time tool only - nothing new ships to the browser.

## Not a finding: unused weights

`_s6weights.mjs` reported Heebo 700 and Frank Ruhl 500 as declared-but-never-rendered,
which would have been two more files each. **That result is not trustworthy and was not
acted on.** The probe only inspects elements with no element children, and `font-bold`
in this codebase is overwhelmingly on headings that wrap a `<span>` - so the probe skipped
precisely the elements most likely to use weight 700. A real answer needs a different
method, and dropping a weight that turns out to be used produces synthetic bolding, which
is a visible regression for a saving of a few KB.

## Summary of what is actually available

| Item | Saving | Where | Risk | Status |
|---|---|---|---|---|
| Subset + woff2 the Glamora logo font | ~62 KB **per page, every locale** | `public/fonts/` | none, rendering identical | needs approval for `fonttools` |
| Stop preloading Heebo/Frank Ruhl on Russian pages | 102.6 KB per `/ru` page | `layout.tsx` | may worsen `/he` LCP, needs an A/B | proposed |
| Drop unused weights | unknown | `layout.tsx` | measurement was unsound | withdrawn |
