import { QrCodeDataType } from "uqr";
import type { EncodedQr } from "./encode";
import type { EyeShape, ModuleShape, QrStyle } from "./types";

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
): string {
  const ctl = Math.max(0, tl);
  const ctr = Math.max(0, tr);
  const cbr = Math.max(0, br);
  const cbl = Math.max(0, bl);
  return `M ${x + ctl} ${y} L ${x + w - ctr} ${y} Q ${x + w} ${y} ${x + w} ${y + ctr} L ${x + w} ${y + h - cbr} Q ${x + w} ${y + h} ${x + w - cbr} ${y + h} L ${x + cbl} ${y + h} Q ${x} ${y + h} ${x} ${y + h - cbl} L ${x} ${y + ctl} Q ${x} ${y} ${x + ctl} ${y} Z`;
}

function eyeRadii(shape: EyeShape, s: number): [number, number, number, number] {
  switch (shape) {
    case "square":
      return [0, 0, 0, 0];
    case "rounded":
      return [s * 0.18, s * 0.18, s * 0.18, s * 0.18];
    case "extra-rounded":
      return [s * 0.32, s * 0.32, s * 0.32, s * 0.32];
    case "circle":
      return [s * 0.5, s * 0.5, s * 0.5, s * 0.5];
    case "classy":
      return [0, s * 0.38, 0, s * 0.38];
    case "leaf":
      return [s * 0.42, 0, s * 0.42, 0];
    case "diamond":
      return [0, 0, 0, 0];
    case "hex":
      return [0, 0, 0, 0];
    default:
      return [s * 0.18, s * 0.18, s * 0.18, s * 0.18];
  }
}

function cellHash(gx: number, gy: number): number {
  let h = (gx * 374761393 + gy * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export function exportQrSvg(qr: EncodedQr, style: QrStyle, viewBoxSize = 1000): string {
  const qz = Math.max(0, Math.min(8, style.quietZone));
  const total = qr.size + qz * 2;
  const cell = viewBoxSize / total;
  const origin = qz * cell;
  const body = qr.size * cell;

  const paths: string[] = [];
  const defs: string[] = [];

  const fillId = "qr-fg-fill";
  if (style.gradientType === "diagonal") {
    defs.push(
      `<linearGradient id="${fillId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${style.fg}"/><stop offset="100%" stop-color="${style.gradientTo}"/></linearGradient>`,
    );
  } else if (style.gradientType === "linear") {
    defs.push(
      `<linearGradient id="${fillId}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${style.fg}"/><stop offset="100%" stop-color="${style.gradientTo}"/></linearGradient>`,
    );
  } else if (style.gradientType === "radial") {
    defs.push(
      `<radialGradient id="${fillId}" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${style.fg}"/><stop offset="100%" stop-color="${style.gradientTo}"/></radialGradient>`,
    );
  }

  const fillRef = style.gradientType !== "none" ? `url(#${fillId})` : style.fg;
  const gap = Math.max(0, Math.min(0.35, style.moduleGap));

  // Module renderer helper
  function modulePath(x: number, y: number, s: number, shape: ModuleShape, gx: number, gy: number): string {
    const cx = x + s / 2;
    const cy = y + s / 2;
    const r = s / 2;
    const h = cellHash(gx, gy);

    switch (shape) {
      case "square":
        return `M ${x} ${y} h ${s} v ${s} h -${s} Z`;
      case "rounded":
        return roundedRectPath(x, y, s, s, s * 0.28, s * 0.28, s * 0.28, s * 0.28);
      case "squircle":
        return roundedRectPath(x, y, s, s, s * 0.42, s * 0.42, s * 0.42, s * 0.42);
      case "dots":
      case "bubbles":
        return `M ${cx} ${cy - r * 0.9} a ${r * 0.9} ${r * 0.9} 0 1 0 0.001 0 Z`;
      case "diamond":
        return `M ${cx} ${y} L ${x + s} ${cy} L ${cx} ${y + s} L ${x} ${cy} Z`;
      case "classy":
        return roundedRectPath(x, y, s, s, 0, s * 0.55, 0, s * 0.55);
      case "leaf":
        return roundedRectPath(x, y, s, s, s * 0.62, 0, s * 0.62, 0);
      case "dash": {
        const horiz = h % 2 === 0;
        const len = s * 0.95;
        const thick = s * 0.44;
        if (horiz) {
          return roundedRectPath(cx - len / 2, cy - thick / 2, len, thick, thick / 2, thick / 2, thick / 2, thick / 2);
        }
        return roundedRectPath(cx - thick / 2, cy - len / 2, thick, len, thick / 2, thick / 2, thick / 2, thick / 2);
      }
      case "heart": {
        const hr = s * 0.22;
        return `M ${cx} ${cy + s * 0.4} L ${cx - s * 0.42} ${cy - s * 0.08} A ${hr} ${hr} 0 0 1 ${cx} ${cy - s * 0.25} A ${hr} ${hr} 0 0 1 ${cx + s * 0.42} ${cy - s * 0.08} Z`;
      }
      default:
        return `M ${x} ${y} h ${s} v ${s} h -${s} Z`;
    }
  }

  // Draw data modules
  const moduleD: string[] = [];
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      const type = qr.types[y]![x]!;
      if (type === QrCodeDataType.Position) continue;
      const dark = Boolean(qr.data[y]?.[x]);
      if (!dark) continue;

      const px0 = origin + x * cell;
      const py0 = origin + y * cell;
      const pad = cell * gap * 0.5;
      const ms = cell - pad * 2;

      const isProtected =
        type === QrCodeDataType.Function ||
        type === QrCodeDataType.Timing ||
        type === QrCodeDataType.Alignment;

      if (isProtected) {
        moduleD.push(`M ${px0} ${py0} h ${cell} v ${cell} h -${cell} Z`);
      } else {
        moduleD.push(modulePath(px0 + pad, py0 + pad, ms, style.moduleShape, x, y));
      }
    }
  }

  // Draw finder eyes
  const eyePaths: string[] = [];
  const corners: [number, number][] = [
    [0, 0],
    [qr.size - 7, 0],
    [0, qr.size - 7],
  ];

  for (const [ex, ey] of corners) {
    const ox = origin + ex * cell;
    const oy = origin + ey * cell;
    const s = cell * 7;
    const [tl, tr, br, bl] = eyeRadii(style.eyeShape, s);
    const outerD = roundedRectPath(ox, oy, s, s, tl, tr, br, bl);

    const inset = cell;
    const is = cell * 5;
    const [itl, itr, ibr, ibl] = eyeRadii(style.eyeShape, is);
    const innerD = roundedRectPath(ox + inset, oy + inset, is, is, itl, itr, ibr, ibl);

    const ball = cell * 3;
    const bx = ox + cell * 2;
    const by = oy + cell * 2;
    const [btl, btr, bbr, bbl] = eyeRadii(style.ballShape, ball);
    const ballD = roundedRectPath(bx, by, ball, ball, btl, btr, bbr, bbl);

    eyePaths.push(`<path d="${outerD}" fill="${style.eyeColor}"/>`);
    eyePaths.push(`<path d="${innerD}" fill="${style.bg}"/>`);
    eyePaths.push(`<path d="${ballD}" fill="${style.ballColor}"/>`);
  }

  const bgRect = style.transparentBg
    ? ""
    : `<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="${style.bg}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${viewBoxSize}" height="${viewBoxSize}">
  ${defs.length ? `<defs>${defs.join("")}</defs>` : ""}
  ${bgRect}
  <path d="${moduleD.join(" ")}" fill="${fillRef}"/>
  ${eyePaths.join("\n  ")}
</svg>`;
}

export function downloadSvg(svgString: string, filename = "qrwho-vector.svg") {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
