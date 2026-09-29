"use client";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_EDGE = 1568;
const ACCEPTED = /^(image\/(jpeg|jpg|png|webp|heic|heif))$/i;

export class ImageError extends Error {}

function isHeic(file: File) {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/** Validates, converts HEIC, fixes orientation and resizes to max 1568px on the long edge as JPEG. */
export async function prepareImage(file: File): Promise<Blob> {
  if (!ACCEPTED.test(file.type) && !isHeic(file)) {
    throw new ImageError("Please choose a JPG, PNG or HEIC photo.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageError("That photo is larger than 10 MB. Please choose a smaller one.");
  }

  let source: Blob = file;
  if (isHeic(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      source = Array.isArray(out) ? out[0] : out;
    } catch {
      throw new ImageError("We couldn't open that HEIC photo. Please try a JPG or PNG instead.");
    }
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("We couldn't open that photo. Please try another one.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  if (Math.min(w, h) < 300) {
    throw new ImageError("That photo is too small. Please use a clearer, closer photo of your palm.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new ImageError("We couldn't process that photo. Please try another one.");
  return blob;
}
