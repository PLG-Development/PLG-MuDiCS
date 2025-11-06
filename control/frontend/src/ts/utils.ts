export function get_uuid(): string {
    return crypto.randomUUID();
}

export function get_file_size_display_string(size: number, toFixed: number|null = null): string {
    if (size === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(size) / Math.log(k));
    const value = size / Math.pow(k, i);

    const size_string = `${value.toFixed(toFixed !== null ? toFixed : Math.max(0, 2 - Math.floor(Math.log10(value))))} ${sizes[i]}`;

    return size_string.replace('.', ',');
}


export async function image_content_hash(blob: Blob, size = 32): Promise<number> {
  // Blob → ImageBitmap (GPU-dekodiert, superschnell)
  const bitmap = await createImageBitmap(blob);

  // OffscreenCanvas ist sehr schnell (kein Layout nötig)
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, size, size);

  // Pixel-Daten holen
  const { data } = ctx.getImageData(0, 0, size, size);

  // Einfacher, schneller Integer-Hash (FNV-1a)
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = Math.imul(hash, 16777619);
  }

  bitmap.close(); // GPU-Ressourcen freigeben
  return hash >>> 0; // unsigned int
}

