// Photos straight from a phone or camera are often 5 to 15 MB. They are made
// smaller in the browser before uploading, so an upload over a mobile
// connection takes seconds, not minutes. The server still converts every
// image to WebP of at most 2400 pixels; this only saves the journey there.
export const LONGEST_SIDE = 2400;
const SHRINKABLE = ["image/jpeg", "image/png", "image/webp"];

export function fitWithin(width: number, height: number, longest = LONGEST_SIDE) {
  const scale = Math.min(1, longest / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Small files, animations and drawings go up as they are.
export const worthShrinking = (file: { type: string; size: number }) =>
  SHRINKABLE.includes(file.type) && file.size > 1_500_000;

// A smaller copy of the photo, or the photo itself when shrinking it is not
// worth it or not possible in this browser.
export async function shrinkImage(file: File): Promise<File> {
  if (!worthShrinking(file) || typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}
