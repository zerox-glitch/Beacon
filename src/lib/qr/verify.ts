export async function verifyQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const jsQR = (await import("jsqr")).default;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  if (width < 16 || height < 16) return null;

  const native = ctx.getImageData(0, 0, width, height);
  const hit = jsQR(native.data, width, height, { inversionAttempts: "attemptBoth" });
  if (hit) return hit.data;

  const tryScale = (s: number): string | null => {
    const off = document.createElement("canvas");
    off.width = s;
    off.height = s;
    const ox = off.getContext("2d", { willReadFrequently: true });
    if (!ox) return null;
    ox.imageSmoothingEnabled = true;
    ox.drawImage(canvas, 0, 0, s, s);
    const img = ox.getImageData(0, 0, s, s);
    const scaled = jsQR(img.data, s, s, { inversionAttempts: "attemptBoth" });
    return scaled?.data ?? null;
  };

  // A marginal code (thin modules, soft contrast) often fails at ONE raster
  // size and decodes fine a step away — jsQR's grid estimate is
  // size-sensitive, exactly like a real camera's sampling. Walk a ladder
  // around the native size (down AND up) before declaring the code
  // unscannable: every ladder hit is a genuine ECC-verified decode, so the
  // badge only ever flips false→true, never fakes a pass.
  const ladder =
    width > 560
      ? [480, 420, 360, 320]
      : width > 400
        ? [512, 420, 360, 320]
        : [512, 480, 400, 360, 320, 280];
  for (const s of ladder) {
    const scaled = tryScale(s);
    if (scaled) return scaled;
  }

  return null;
}
