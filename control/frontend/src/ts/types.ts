import { FileBox, FileImage, FileVideoCamera, ImagePlay, type X } from "lucide-svelte";

export type SupportedFileType = {
    display_name:
    string; mime_type:
    string; icon: typeof X;
};

export const supported_file_types: Record<string, SupportedFileType> = {
    '.mp4': {
        display_name: 'MP4',
        mime_type: 'video/mp4',
        icon: FileVideoCamera,
    },
    '.jpg': {
        display_name: 'JPG',
        mime_type: 'image/jpg',
        icon: FileImage,
    },
    '.jpeg': {
        display_name: 'JPG',
        mime_type: 'image/jpeg',
        icon: FileImage,
    },
    '.png': {
        display_name: 'PNG',
        mime_type: 'image/png',
        icon: FileImage,
    },
    '.gif': {
        display_name: 'GIF',
        mime_type: 'image/gif',
        icon: ImagePlay,
    },
    '.pptx': {
        display_name: 'PPTX',
        mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        icon: FileBox,
    },
    '.odp': {
        display_name: 'ODP',
        mime_type: 'application/vnd.oasis.opendocument.presentation',
        icon: FileBox,
    }
}

export type FolderElement = {
    id?: string;
    hash: string | null;
    thumbnail_url: string | null;
    name: string;
    type: string;
    date_created: Date;
    size: number;
}


export type Display = {
    id: string;
    ip: string;
    preview_url: string | null;
    preview_timeout_id: number | null;
    mac: string|null;
    name: string;
    status: string;
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
    snippet: any;
    title: string;
    title_class?: string;
    title_icon?: typeof X | null;
    closable?: boolean;
}