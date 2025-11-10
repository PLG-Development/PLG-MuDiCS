import Dexie, { type EntityTable } from "dexie";

export interface ThumbnailBlobDBEntry {
  hash: string;
  blob: Blob;
}

export class FileDatabase extends Dexie {
  thumbnail_blobs!: EntityTable<ThumbnailBlobDBEntry, "hash">; // (Type, PrimaryKey)

  constructor() {
    super("FileDatabase");

    this.version(1).stores({
      thumbnail_blobs: "++hash, blob" // primary key
    });
  }
}

export const db = new FileDatabase();
