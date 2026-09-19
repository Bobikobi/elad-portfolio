# Visual references - the target level

Approved by the owner 2026-08-17, for [P7](../PHOTOMETRY-megaplan.md) and for every later
stage that changes what a body looks like. Every URL here was opened and returned 200 on
that date; the two that answered 403 to `curl` are bot protection, not dead links, and both
load in a real browser.

---

## Two kinds of reference, and they are not interchangeable

The owner's words on approving this list: the scientific sources are accurate, but some of
them are **visually weak** - they are not the 4K experience of the photograph he sent.

That distinction is the whole point of this file:

| kind | what it is for | who decides |
|---|---|---|
| **Scientific** - the missions below | STRUCTURE, SCALE and MOTION. How fine granulation actually is, how fast it reorganises, how a band flows. These produce **numbers**, and numbers become criteria. | measurable, so me |
| **Aesthetic** - the owner's own references | the LOOK. Richness, drama, what "burning" means on a screen. | the owner, always |

A criterion may be derived from the scientific column. The aesthetic column is never
reduced to a number and never argued with - if he says it looks wrong, it is wrong.

**More aesthetic references are expected.** He has said he may send others. This file is
where they go, in their own section, and they do not replace the scientific ones.

---

## Sun

| | source | why this one |
|---|---|---|
| **still** | [NSF DKIST / Inouye](https://nso.edu/press-release/nsf-inouye-solar-telescope-enables-major-discovery-of-a-hidden-solar-process/) | the highest-resolution solar surface imagery that exists, ~20 km granulation detail. It is what shows how FINE the grain has to be. **CC BY 4.0, not public domain - credit required if anything derived from it ships.** |
| **motion** | [Hinode / SOT G-band, NASA SVS 3412](https://svs.gsfc.nasa.gov/3412) | a real four-hour sequence of granules forming and breaking up. This is the "burning" the owner asked for, and it is a statement about CHANGE, not about brightness. |

## Mars

| | source | why |
|---|---|---|
| **still** | [MRO / HiRISE](https://www.uahirise.org/) | 25 cm per pixel, public domain, full-resolution products |
| **motion** | [NASA SVS 659 - Mars Rotate](https://svs.gsfc.nasa.gov/659) | axial spin, how the limb and features present through a rotation |

## Saturn

| | source | why |
|---|---|---|
| **still** | [Cassini ISS via PDS Rings](https://pds-rings.seti.org/cassini/iss/) | the calibrated archive - rings and cloud tops |
| **motion** | [PIA17652 - Saturn's Streaming Hexagon](https://pds-rings.seti.org/press_releases/pages/PIA17xxx/PIA17652.html) | ten hours, rotation-compensated: jet, polar vortex, storm motion |

## Jupiter

| | source | why |
|---|---|---|
| **still** | [Juno / JunoCam RDR](https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=JUNO-J-JUNOCAM-3-RDR-L1A-V1.0) | linearised 12-bit perijove data, the sharpest visible-light cloud tops |
| **motion** | [Cassini planetwide colour movie](https://science.nasa.gov/photojournal/planetwide-color-movie/) | 24 rotations - differential band flow and the Red Spot turning |

## Earth

| | source | why |
|---|---|---|
| **still** | [Landsat 8-9 / LandsatLook](https://landsatlook.usgs.gov/) | public domain, globally consistent |
| **motion** | [DSCOVR / EPIC time-lapse, SVS 12118](https://svs.gsfc.nasa.gov/12118) | full-disk rotation with clouds actually evolving |

## Amateur stacking - how far ground-based detail can go

[AstroBin solar system group](https://app.astrobin.com/groups/1/solar-system-imaging) ·
[Cloudy Nights planetary imaging](https://www.cloudynights.com/forums/forum/77-major-minor-planetary-imaging/)

Lucky-imaging and stacked results, with acquisition details. Individual uploader rights
vary - treat every image as all-rights-reserved unless its own page says otherwise.

---

## How a reference becomes a criterion

A link on its own changes nothing. The step that matters is measuring it:

1. take the reference frame, find the disc from the image itself - never from a fixed
   threshold, that is the mistake SUN-3 made
2. extract the quantity: typical granule diameter as a fraction of the disc diameter, the
   core-to-limb luminance ratio, the corona's brightness above sky
3. that fraction becomes the target, and our render is measured the same way

**Motion is measurable too, and only became measurable on 2026-08-16.** The fixed-step
clock lets the harness capture at an exact frame interval, so "the granulation reorganises
within N seconds" is a frame-difference measurement rather than an impression. Before that,
every capture landed at a random phase and nothing about motion could be stated.
