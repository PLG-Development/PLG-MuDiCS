import { FileBox, FileImage, FileText, FileVideoCamera, ImagePlay, type X } from "lucide-svelte";
import type { Snippet } from "svelte";

export type RequestResponse = {
    ok: boolean,
    http_code?: number
    blob?: Blob,
    json?: any,
}

export type ShellCommandResponse = {
    stdout: string,
    stderr: string,
    exitCode: number,
}

export type SupportedFileType = {
    display_name: string;
    mime_type: string;
};
export const supported_file_type_icon: Record<string, typeof X> = {
    'MP4': FileVideoCamera,
    'JPG': FileImage,
    'PNG': FileImage,
    'GIF': ImagePlay,
    'PPTX': FileBox,
    'ODP': FileBox,
    'PDF': FileText
}

export type FolderElement = {
    id?: string;
    hash: string | null;
    name: string;
    type: string;
    date_created: Date;
    size: number;
}

export type TreeElement = {
    contents?: TreeElement[];
    type: "file" | "directory";
    name: string;
    size: number;
}


export type Display = {
    id: string;
    ip: string;
    preview_url: string | null;
    preview_timeout_id: number | null;
    mac: string | null;
    name: string;
    status: DisplayStatus;
}

export type DisplayGroup = {
    id: string;
    data: Display[];
};


export type MenuOption = {
    icon?: typeof X;
    name: string;
    class?: string;
    on_select?: () => void;
    disabled?: boolean;
}

export type PopupContent = {
    open: boolean;
    snippet: Snippet<[string]> | null;
    snippet_arg?: string;
    title?: string;
    title_class?: string;
    title_icon?: typeof X | null;
    window_class?: string;
    closable?: boolean;
}

export type DisplayStatus = "host_offline" | "app_offline" | "app_online" | null;

export function to_display_status(value: string): DisplayStatus {
    return ["host_offline", "app_offline", "app_online"].includes(value)
        ? (value as DisplayStatus)
        : null;
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