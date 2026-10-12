/**
 * Abstraction over where profile images / logos live.
 * Today: the data URL itself is stored in the DB column (DatabaseBase64ImageStorage).
 * Tomorrow: an S3/MinIO implementation can upload the bytes and return a public URL —
 * callers (users, patients, settings services) don't change.
 */
export interface ImageStorage {
  /** Persists an image given as data URL and returns the value to store in the entity column. */
  save(dataUrl: string, folder: string): Promise<string>;
  /** Removes a previously stored image (no-op for DB storage). */
  remove(storedValue: string): Promise<void>;
}

export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');
