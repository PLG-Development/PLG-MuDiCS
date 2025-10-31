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