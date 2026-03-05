import { db } from "@/src/data/storage/db";

type TableInfoRow = {
  name: string;
};

async function getColumns(table: string): Promise<Set<string>> {
  const rows = await db.getAllAsync(`PRAGMA table_info(${table});`);
  return new Set((rows as TableInfoRow[]).map((row) => row.name));
}

async function addColumnIfMissing(
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const columns = await getColumns(table);
  if (columns.has(column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}

async function runMigration(version: number, task: () => Promise<void>): Promise<void> {
  await db.execAsync("BEGIN TRANSACTION;");
  try {
    await task();
    await db.runAsync(
      "INSERT OR REPLACE INTO migrations (id, applied_at) VALUES (?, ?);",
      [version, Date.now()]
    );
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function applyMigrations() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const rows = await db.getAllAsync("SELECT id FROM migrations ORDER BY id DESC LIMIT 1;");
  const currentVersion = rows.length > 0 ? (rows[0] as any).id : 0;

  if (currentVersion < 1) {
    await runMigration(1, async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT,
          color TEXT,
          icon TEXT,
          genre TEXT,
          createdAt INTEGER,
          updatedAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS riffs (
          id TEXT PRIMARY KEY,
          name TEXT,
          createdAt INTEGER,
          updatedAt INTEGER,
          duration INTEGER,
          audioUri TEXT,
          type TEXT,
          genre TEXT,
          emoji TEXT,
          favorite INTEGER,
          pinned INTEGER,
          corrupted INTEGER,
          energyLevel TEXT,
          bpm REAL,
          detectedBpm REAL,
          key TEXT,
          detectedKey TEXT,
          projectId TEXT,
          waveformJson TEXT,
          markersJson TEXT,
          loopStart INTEGER,
          loopEnd INTEGER,
          versionGroupId TEXT,
          versionNumber INTEGER,
          analysisVersion INTEGER,
          FOREIGN KEY (projectId) REFERENCES projects (id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_riffs_createdAt ON riffs(createdAt);
        CREATE INDEX IF NOT EXISTS idx_riffs_updatedAt ON riffs(updatedAt);
        CREATE INDEX IF NOT EXISTS idx_riffs_projectId ON riffs(projectId);
        CREATE INDEX IF NOT EXISTS idx_riffs_favorite ON riffs(favorite);
        CREATE INDEX IF NOT EXISTS idx_riffs_type ON riffs(type);
        CREATE INDEX IF NOT EXISTS idx_projects_updatedAt ON projects(updatedAt);
      `);
    });
  }

  if (currentVersion < 2) {
    await runMigration(2, async () => {
      await addColumnIfMissing("riffs", "suggestedBpmsJson", "TEXT");
      await addColumnIfMissing("riffs", "bpmSource", "TEXT");
      await addColumnIfMissing("riffs", "tagsJson", "TEXT");
      await addColumnIfMissing("riffs", "systemTagsJson", "TEXT");
      await addColumnIfMissing("riffs", "customTagsJson", "TEXT");
      await addColumnIfMissing("riffs", "averageRms", "REAL");
      await addColumnIfMissing("riffs", "dynamicRange", "REAL");
      await addColumnIfMissing("riffs", "energyDataJson", "TEXT");
      await addColumnIfMissing("riffs", "bpmDataJson", "TEXT");
      await addColumnIfMissing("riffs", "notes", "TEXT");
      await addColumnIfMissing("riffs", "hourOfDay", "INTEGER");
      await addColumnIfMissing("riffs", "dayOfWeek", "INTEGER");
      await addColumnIfMissing("riffs", "midiDataJson", "TEXT");
      await addColumnIfMissing("riffs", "tuningJson", "TEXT");
      await addColumnIfMissing("riffs", "draft", "INTEGER");
    });
  }

  if (currentVersion < 3) {
    await runMigration(3, async () => {
      await addColumnIfMissing("projects", "emoji", "TEXT");
      await addColumnIfMissing("projects", "riffOrderJson", "TEXT");
      await addColumnIfMissing("projects", "sectionsJson", "TEXT");
      await addColumnIfMissing("projects", "markersJson", "TEXT");
      await addColumnIfMissing("projects", "bpm", "REAL");
      await addColumnIfMissing("projects", "bpmSource", "TEXT");
    });
  }
}

