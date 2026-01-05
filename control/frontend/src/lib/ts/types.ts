import { FileBox, FileImage, FileText, FileVideoCamera, ImagePlay, type X } from 'lucide-svelte';
import type { Snippet } from 'svelte';

export type RequestResponse = {
	ok: boolean;
	http_code?: number;
	blob?: Blob;
	json?: Record<string, unknown>;
};

export type ShellCommandResponse = {
	stdout: string;
	stderr: string;
	exitCode: number;
};

export type SupportedFileType = {
	display_name: string;
	mime_type: string;
};
export const supported_file_type_icon: Record<string, typeof X> = {
	MP4: FileVideoCamera,
	JPG: FileImage,
	PNG: FileImage,
	GIF: ImagePlay,
	PPTX: FileBox,
	ODP: FileBox,
	PDF: FileText
};

export type FileTransferTask = {
	data: FileTransferTaskData;
	display: ShortDisplay;
	path: string;
	file_name: string;
	file_primary_key: string;
	bytes_total: number; // if type === 'sync' -> bytes_total = file_size * 2 (1x download + 1x upload)
};

export type FileTransferTaskData = {
	type: 'upload',
	file: File,
} | {
	type: 'download',
} | {
	type: "sync",
	destination_displays: ShortDisplay[],
}


export type ShortDisplay = {
	id: string;
	ip: string;
}


export type FileOnDisplay = {
	display_id: string;
	file_primary_key: string; // JSON.stringify([string, string, number, string])
	date_created: Date;
	loading_data: FileLoadingData | null; // null if not loading
};

export type FileLoadingData = {
	type: 'upload' | 'download' | 'sync_download' | 'sync_upload';
	percentage: number;
	bytes_per_second: number;
	seconds_until_finish: number;
}

export type Inode = {
	path: string;
	name: string;
	size: number;
	type: string;
	thumbnail: Blob | null;
};

export function get_file_primary_key(file: Inode): string {
	return JSON.stringify([file.path, file.name, file.size, file.type]);
}

export type TreeElement = {
	contents?: TreeElement[];
	type: 'file' | 'directory';
	name: string;
	size: number;
};

export type Display = {
	id: string;
	ip: string;
	mac: string | null;
	position: number;
	preview: PreviewObject;
	group_id: string;
	name: string;
	status: DisplayStatus;
};

export type DisplayGroup = {
	id: string;
	position: number;
};

export type PreviewObject = {
	currently_updating: boolean;
	url: string | null;
};

export type MenuOption = {
	icon?: typeof X;
	name: string;
	class?: string;
	on_select?: () => void | Promise<void>;
	disabled?: boolean;
};

export type PopupContent = {
	open: boolean;
	snippet: Snippet<[string]> | null;
	snippet_arg?: string;
	title?: string;
	title_class?: string;
	title_icon?: typeof X | null;
	window_class?: string;
	closable?: boolean;
};

export type DisplayStatus = 'host_offline' | 'app_offline' | 'app_online' | null;

export function to_display_status(value: string): DisplayStatus {
	return ['host_offline', 'app_offline', 'app_online'].includes(value)
		? (value as DisplayStatus)
		: null;
}
