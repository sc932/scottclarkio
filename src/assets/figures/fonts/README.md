# Figure fonts (build-time only, never served)

The fonts `src/lib/figure-png.mjs` loads into resvg to rasterize the
DOWNLOADABLE attributed SVG of every house figure to its PNG twin
(`/figures/<slug>/<name>.png`, 2026-11-02). System fonts are OFF for that
render (GitHub's ubuntu-latest has no IBM Plex and no DejaVu obliques); the
AIO gate recomputes every PNG through the same renderer on the machine that
built and compares bytes. Keep the set equal to the FACES the committed figure
SVGs are meant to render in — family AND weight AND style, resolved with
inheritance (a bold `<tspan>` under a Plex `<text>` is a Plex Bold run):
Helvetica / Helvetica Neue / Arial at the head of a list (any case, either
quote, attribute or style) are aliased to the vendored Liberation Sans
(Arial-metric; the Chrome-rendered twins drew Nimbus Sans, fontconfig's
Helvetica alias — the same width class; Nimbus is AGPL) by `figure-png.mjs`; Verdana, Consolas
and the generic keywords (`sans-serif`, `monospace`) fall through to DejaVu
Sans — resvg-js 2.6.2 resolves no generic family and honours no
sansSerifFamily / monospaceFamily knob, so a monospace list must NAME DejaVu
Sans Mono or IBM Plex Mono first (the AIO gate holds that for every committed
figure). A family missing here renders in DejaVu Sans, silently; a weight or
style a vendored family lacks renders in that family's nearest loaded face
(resvg does not synthesize bold or oblique). The 2026-11-02 census: DejaVu
Sans at normal / bold / italic, DejaVu Sans Mono at normal / bold, IBM Plex
Sans at normal / 600 / italic, IBM Plex Mono at normal / 600, Helvetica-list
runs at normal / 600 / bold / italic (→ Liberation Sans) — every combination
below is vendored or one nearest-face step away (a 600 under Liberation Sans
→ Bold).

- DejaVu Sans (Book, Bold, Oblique) and DejaVu Sans Mono (Book, Bold) —
  Bitstream Vera license + public-domain DejaVu changes, `LICENSE-DejaVu.txt`.
- Liberation Sans (Regular, Bold, Italic) — SIL Open Font License 1.1,
  `LICENSE-Liberation.txt`; the alias target for Helvetica / Arial lists.
- IBM Plex Sans (Regular, SemiBold, Italic) and IBM Plex Mono (Regular,
  SemiBold), where present — SIL Open Font License 1.1, `LICENSE-IBMPlex.txt`.

Source: the Debian `fonts-dejavu-core`, `fonts-dejavu-extra`, `fonts-liberation`
and `fonts-ibm-plex` packages (unmodified TTFs).
