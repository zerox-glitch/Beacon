export async function verifyQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const jsQR = (await import("jsqr")).default;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  if (width < 16 || height < 16) return null;

  const native = ctx.getImageData(0, 0, width, height);
  const hit = jsQR(native.data, width, height, { inversionAttempts: "attemptBoth" });
  if (hit) return hit.data;

  if (width > 560) {
    const s = 480;
    const off = document.createElement("canvas");
    off.width = s;
    off.height = s;
    const ox = off.getContext("2d", { willReadFrequently: true });
    if (!ox) return null;
    ox.imageSmoothingEnabled = true;
    ox.drawImage(canvas, 0, 0, s, s);
    const img = ox.getImageData(0, 0, s, s);
    const scaled = jsQR(img.data, s, s, { inversionAttempts: "attemptBoth" });
    if (scaled) return scaled.data;
  }

  return null;
}
