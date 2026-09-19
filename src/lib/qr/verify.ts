export async function verifyQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const jsQR = (await import("jsqr")).default;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  if (width < 16 || height < 16) return null;
  const img = ctx.getImageData(0, 0, width, height);
  const code = jsQR(img.data, width, height, { inversionAttempts: "attemptBoth" });
  return code?.data ?? null;
}
