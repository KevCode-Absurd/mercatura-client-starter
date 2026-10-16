import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { env } from "@/lib/env";
import * as schema from "./schema";
export type DB = BetterSQLite3Database<typeof schema> & {
    $client: Database.Database;
};
export function dbPath(): string {
    return path.join(env.DATA_DIR, "creative-engine.db");
}
function open(): DB {
    fs.mkdirSync(env.DATA_DIR, { recursive: true });
    const sqlite = new Database(dbPath());
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    return drizzle(sqlite, { schema });
}
const g = globalThis as unknown as {
    __ceDb?: DB;
};
export const db: DB = g.__ceDb ?? (g.__ceDb = open());
export { schema };
