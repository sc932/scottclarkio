# Figure fonts (build-time only, never served)

The fonts `src/lib/figure-png.mjs` loads into resvg to rasterize the
DOWNLOADABLE attributed SVG of every house figure to its PNG twin
(`/figures/<slug>/<name>.png`, 2026-11-02). System fonts are OFF for that
render, so the bytes are identical on a laptop and in CI (GitHub's
ubuntu-latest has no IBM Plex and no DejaVu obliques) and the AIO gate can
recompute every PNG byte-for-byte. Keep the set equal to the families the
committed figure SVGs name (`grep -rho 'font-family="[^"]*"' src/assets/blog`):
a family missing here renders in DejaVu Sans, silently.

- DejaVu Sans (Book, Bold, Oblique) and DejaVu Sans Mono (Book, Bold) —
  Bitstream Vera license + public-domain DejaVu changes, `LICENSE-DejaVu.txt`.
- IBM Plex Sans (Regular, SemiBold, Italic) and IBM Plex Mono (Regular,
  SemiBold), where present — SIL Open Font License 1.1, `LICENSE-IBMPlex.txt`.

Source: the Debian `fonts-dejavu-core`, `fonts-dejavu-extra` and
`fonts-ibm-plex` packages (unmodified TTFs).
