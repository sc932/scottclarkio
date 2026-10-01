// rehype-figure-focus.mjs — plain markdown images become focusable figures
// with the SAME markup contract as Figure.astro (the deep-link id, the
// `fig-open` link that the focus script upgrades, the plate, the caption
// anchor), so every image a post renders is click-to-focus, deep-linkable,
// and downloadable — talk-recap slides, animated-GIF variants, the dbnl
// archive's screenshots. Registered in astro.config.mjs; no hast deps.
//
// Shape handled: a paragraph whose only child is <img> (what remark emits
// for `![alt](src)` on its own line). An immediately following paragraph
// that is ONLY <em>…</em> is adopted as the caption (the house convention
// for captioning a markdown image), otherwise the figure has no caption and
// the alt text stays on the <img>.
import { figureId } from "./figures-scan.mjs";
import { openSync, readSync, closeSync, fstatSync } from "node:fs";
import { join } from "node:path";

/** Intrinsic pixel size of a committed image (PNG / GIF / JPEG / WebP) from
 * its header bytes, so the <img> can carry width/height and the plate
 * reserves its box before the (lazy) bytes arrive — no layout shift. Other
 * formats return null and the image sizes itself on load. */
export function imageSize(file) {
  let fd;
  try {
    fd = openSync(file, "r");
    const size = Math.min(fstatSync(fd).size, 65536);
    const b = Buffer.alloc(size);
    readSync(fd, b, 0, size, 0);
    if (b.length > 24 && b.toString("ascii", 1, 4) === "PNG")
      return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    if (b.length > 10 && b.toString("ascii", 0, 3) === "GIF")
      return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
    if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
      const chunk = b.toString("ascii", 12, 16);
      if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
      if (chunk === "VP8L") {
        const bits = b.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) return null;
        const marker = b[i + 1];
        const len = b.readUInt16BE(i + 2);
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf))
          return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
        i += 2 + len;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

const isEl = (n, tag) => n && n.type === "element" && (!tag || n.tagName === tag);
const text = (n) =>
  n.type === "text" ? n.value : (n.children ?? []).map(text).join("");

export default function rehypeFigureFocus() {
  return (tree) => {
    const walk = (node) => {
      const kids = node.children;
      if (!Array.isArray(kids)) return;
      for (let i = 0; i < kids.length; i++) {
        const p = kids[i];
        if (!isEl(p, "p")) {
          walk(p);
          continue;
        }
        const inner = p.children.filter((c) => !(c.type === "text" && !c.value.trim()));
        if (inner.length !== 1 || !isEl(inner[0], "img")) {
          walk(p);
          continue;
        }
        const img = inner[0];
        const src = String(img.properties?.src ?? "");
        if (!src.startsWith("/") || src.startsWith("//")) continue; // external: leave alone
        const file = src.split("/").pop() ?? "";
        const id = figureId(file);
        const alt = String(img.properties?.alt ?? "");
        // Optional caption: the very next element paragraph that is only <em>.
        let captionChildren = null;
        let j = i + 1;
        while (j < kids.length && kids[j].type === "text" && !kids[j].value.trim()) j++;
        const next = kids[j];
        if (isEl(next, "p")) {
          const ni = next.children.filter((c) => !(c.type === "text" && !c.value.trim()));
          if (ni.length === 1 && isEl(ni[0], "em")) captionChildren = ni[0].children;
        }
        const dims = imageSize(join(process.cwd(), "public", decodeURIComponent(src)));
        img.properties = {
          ...img.properties,
          ...(dims && !img.properties?.width ? { width: dims.width, height: dims.height } : {}),
          loading: img.properties?.loading ?? "lazy",
          decoding: img.properties?.decoding ?? "async",
        };
        const anchor = (extraClass) => ({
          type: "element",
          tagName: "a",
          properties: { className: ["fig-anchor", ...(extraClass ? [extraClass] : [])], href: `#${id}` },
          children: [
            {
              type: "element",
              tagName: "span",
              properties: { className: ["sr-only"] },
              children: [{ type: "text", value: "Link to this figure" }],
            },
          ],
        });
        const open = {
          type: "element",
          tagName: "a",
          properties: {
            className: ["fig-open"],
            href: src,
            dataDownload: file,
            ariaLabel: `Open figure${alt ? `: ${alt}` : ""}`,
          },
          children: [
            img,
            { type: "element", tagName: "span", properties: { className: ["fig-expand"], ariaHidden: "true" }, children: [] },
          ],
        };
        // With a caption the "Figure N" label in the caption is the self-link
        // (the heading-anchor analog); without one the anchor sits in the
        // plate's corner so a captionless slide still has a visible deep link.
        const figure = {
          type: "element",
          tagName: "figure",
          properties: {
            className: ["post-figure", "post-figure--img"],
            id,
            dataFigure: id,
            ...(captionChildren ? { ariaLabelledBy: `${id}-caption` } : {}),
          },
          children: [
            {
              type: "element",
              tagName: "div",
              properties: { className: ["fig-panel"] },
              children: captionChildren ? [open] : [open, anchor("fig-anchor--corner")],
            },
            ...(captionChildren
              ? [
                  {
                    type: "element",
                    tagName: "figcaption",
                    properties: { id: `${id}-caption` },
                    children: [anchor(null), { type: "text", value: " " }, ...captionChildren],
                  },
                ]
              : []),
          ],
        };
        kids.splice(i, captionChildren ? j - i + 1 : 1, figure);
      }
    };
    walk(tree);
  };
}
