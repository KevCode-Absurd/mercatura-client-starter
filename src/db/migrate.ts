import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, dbPath } from "./index";
migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
console.log(`Migrated ${dbPath()}`);
