// Type declarations for Node's built-in `node:sqlite` module.
// This module is experimental as of Node 22+, so we declare the surface we use.
// When Node stabilizes the API, this file can be removed.

declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export class StatementSync {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    iterate(...params: unknown[]): IterableIterator<unknown>;
  }

  export const constants: {
    SQLITE_OPEN_READONLY: number;
    SQLITE_OPEN_READWRITE: number;
    SQLITE_OPEN_CREATE: number;
    SQLITE_OPEN_URI: number;
  };

  export class Session {
    constructor(db: DatabaseSync);
  }

  export function backup(sourceDb: DatabaseSync, destPath: string, options?: { attached?: string }): Promise<number>;
}
