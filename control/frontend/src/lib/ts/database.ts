import Dexie, { type Table } from 'dexie';
import type { Display, DisplayGroup, FileOnDisplay, Inode } from './types';

export class FileDatabase extends Dexie {
	files!: Table<Inode, [string, string, number, string]>;
	files_on_display!: Table<FileOnDisplay, [string, string]>;
	displays!: Table<Display, string>;
	display_groups!: Table<DisplayGroup, string>;

	constructor() {
		super('FileDatabase');

		this.version(1).stores({
			files: `
        [path+name+size+type],
        path,
        name,
        size,
        type,
        thumbnail
      `,
			files_on_display: `
        [display_id+file_primary_key],
        display_id,
        file_primary_key,
        date_created,
        loading_data
      `,
			displays: `
        id,
        ip,
        mac,
        position,
        preview,
        group_id,
        name,
        status
      `,
			display_groups: `
        id,
        position
      `
		});
	}
}

export const db = new FileDatabase();
