## VERIFY: the project previews were standing on their heads

Reported by the owner as "the inverted windows". **My first diagnosis was wrong** - I called
it a mirror, fixed the mirror, and the page looked exactly the same. What settled it was
replacing every preview with a marker image: a large asymmetric **F** with a tick in one
corner, swapped in at runtime so nothing about the layout changed.

| | measured before | after |
|---|---|---|
| 1440x900 | the marker rendered rotated **225 degrees** | upright, unmirrored, tick in the right corner |
| 390x844 | rotated **275 degrees** | upright, unmirrored, tick in the right corner |

Every preview here is a screenshot of a website, so a 225-degree rotation is a page of text
upside down. Rotated Hebrew is exactly what a mirror looks like at a glance, which is how the
first diagnosis went wrong; the marker is chiral and cannot be misread.

### The fix, and why the obvious version of it only worked on the phone

The window must lie in the ring plane - that is the design - but the picture inside it must
not. So the image is counter-rotated inside its own sector.

Counter-rotating by the screen angle of the image's x axis is only correct when the transform
above it is a **similarity**, and the plane matrix is not one: it squashes one axis to seat
the window in the rings, so a local rotation arrives on screen as a different angle. The
first attempt did exactly that - and fixed 390x844, where the matrix is a plain translation,
while leaving 1440x900 lying on its side. It now solves

    A21*cos(phi) + A22*sin(phi) = 0

for the local angle, where A is the plane matrix composed with the window's own rotation,
picks the branch that leaves the image reading left to right, and flips when the plane is
seen from below.

The clip moved from the image to a wrapper group: a clip-path resolves in the user space of
the element referencing it, so a transform on the image would have dragged its clip with it
and the sector would have travelled with the picture.

### No regression

- `projects-tap.mjs`: **5 of 5** cases pass, including the hit test, which now has one more
  level of DOM to walk to find a window from a pointer.
- The sector, the arc, the gold accent and the fan are untouched - only the image inside the
  clip turns.

### Not covered

- **A real phone.** Chromium emulation at 390x844.
- The four projects with **no screenshot** show a drawn monogram, which was already being
  flipped for the same reason and is unchanged here.
