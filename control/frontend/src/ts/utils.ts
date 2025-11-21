import type { DisplayStatus, FolderElement, SupportedFileType } from "./types";
import supported_file_types_json from './../../../../shared/supported_file_types.json';

const supported_file_types: Record<string, SupportedFileType> = supported_file_types_json as Record<string, SupportedFileType>;

export function get_file_type(file: FolderElement): SupportedFileType | null {
  for (const key of Object.keys(supported_file_types)) {
    if (file.type === supported_file_types[key].mime_type) {
      return supported_file_types[key];
    }
  }
  // Fallback:
  const extension = file.name.split('.').pop();
  if (extension) {
    if (Object.keys(supported_file_types).includes('.' + extension)) {
      return supported_file_types['.' + extension];
    }
  }
  return null;
}

export function get_uuid(): string {
  return crypto.randomUUID();
}

export function get_file_size_display_string(size: number, toFixed: number | null = null): string {
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



export function is_valid_name(input: string): boolean {
  return /^[\p{L}\p{N}\p{M}\-_.+,()[\]{}@!§$%&=~^ ]+$/u.test(input);
}

export function display_status_to_info(status: DisplayStatus): string {
  switch (status) {
    case 'app_online':
      return 'Online';
    case 'app_offline':
      return 'Lädt';
    case 'host_offline':
      return 'Offline';
    case null:
      return '???';
  }
}