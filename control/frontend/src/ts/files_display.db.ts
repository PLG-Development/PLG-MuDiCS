import Dexie, { type Table } from "dexie";
import type { Display, DisplayGroup, FolderElement } from "./types";

export interface FileOnDisplay {
  display_id: string,
  file_primary_key: string, // JSON.stringify([string, string, number, string])
  date_created: Date;
  is_loading: boolean,
  percentage: number,
}

export class FileDatabase extends Dexie {
  files!: Table<FolderElement, [string, string, number, string]>;
  files_on_display!: Table<FileOnDisplay, [string, string]>;
  displays!: Table<Display, string>;
  display_groups!: Table<DisplayGroup, string>;

  constructor() {
    super("FileDatabase");

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
        is_loading,
        percentage
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
