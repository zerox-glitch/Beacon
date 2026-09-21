export async function verifyQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const jsQR = (await import("jsqr")).default;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  if (width < 16 || height < 16) return null;

  const trySize = (w: number, h: number, binary = false): string | null => {
    const src = ctx.getImageData(0, 0, width, height);
    if (w === width && h === height && !binary) {
      const code = jsQR(src.data, w, h, { inversionAttempts: "attemptBoth" });
      return code?.data ?? null;
    }
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ox = off.getContext("2d", { willReadFrequently: true });
    if (!ox) return null;
    ox.imageSmoothingEnabled = true;
    ox.drawImage(canvas, 0, 0, w, h);
    const img = ox.getImageData(0, 0, w, h);
    if (binary) {
      for (let i = 0; i < img.data.length; i += 4) {
        const L = img.data[i]! * 0.2126 + img.data[i + 1]! * 0.7152 + img.data[i + 2]! * 0.0722;
        const v = L < 140 ? 0 : 255;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ox.putImageData(img, 0, 0);
    }
    const code = jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
    return code?.data ?? null;
  };

  const sizes = [width, 720, 480, 360].filter((s, i, a) => a.indexOf(s) === i && s >= 160);
  for (const s of sizes) {
    const hit = trySize(s, s, false);
    if (hit) return hit;
  }
  for (const s of sizes) {
    const hit = trySize(s, s, true);
    if (hit) return hit;
  }
  return null;
}
