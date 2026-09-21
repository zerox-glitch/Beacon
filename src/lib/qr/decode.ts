import { verifyQr } from "./verify";

export async function decodeImageSource(src: CanvasImageSource, w: number, h: number): Promise<string | null> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(32, Math.round(w));
  canvas.height = Math.max(32, Math.round(h));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return verifyQr(canvas);
}

export async function decodeFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadDecodeImage(url);
    return decodeImageSource(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function decodeClipboardImage(): Promise<string | null> {
  if (!navigator.clipboard?.read) return null;
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith("image/"));
    if (!type) continue;
    const blob = await item.getType(type);
    return decodeFile(new File([blob], "paste.png", { type }));
  }
  return null;
}

function loadDecodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = url;
  });
}
