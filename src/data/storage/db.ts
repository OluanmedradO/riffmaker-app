import * as SQLite from "expo-sqlite";

// Open the database synchronously. This is the recommended approach for expo-sqlite.
export const db = SQLite.openDatabaseSync("riffmaker.db");

// Enable foreign keys for the database instance.
db.execSync("PRAGMA foreign_keys = ON;");

