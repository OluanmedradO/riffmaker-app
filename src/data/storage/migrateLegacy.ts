import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveProjectRepo } from "@/src/data/storage/projects.repo";
import { saveRiffRepo } from "@/src/data/storage/riffs.repo";

// Helper flag so we know we don't have to keep doing this on every boot
const SQLITE_MIGRATED_KEY = "@riffmaker:legacy_migrated_to_sqlite";
const SQLITE_MIGRATED_M2_KEY = "@riffmaker:legacy_migrated_to_sqlite_m2";

export async function migrateLegacyAsyncStorageIfNeeded() {
  try {
    const isMigrated = await AsyncStorage.getItem(SQLITE_MIGRATED_KEY);
    const isM2Migrated = await AsyncStorage.getItem(SQLITE_MIGRATED_M2_KEY);
    
    // If BOTH migrations are complete, SKIP entirely.
    if (isMigrated === "true" && isM2Migrated === "true") return;

    console.log("Starting AsyncStorage to SQLite migration (or re-syncing M2)...");

    // 1. Get legacy data
    const projectsData = await AsyncStorage.getItem("@riffmaker:projects");
    const riffsData = await AsyncStorage.getItem("@riffmaker:riffs");

    let projects = [];
    if (projectsData) {
      try {
        projects = JSON.parse(projectsData);
      } catch (e) {
        console.warn("Could not parse legacy projects", e);
      }
    }

    let riffs = [];
    if (riffsData) {
      try {
        riffs = JSON.parse(riffsData);
      } catch (e) {
        console.warn("Could not parse legacy riffs", e);
      }
    }

    // 2. We use our new pure SQLite repos
    // We already do INSERT OR REPLACE so it's idempotent
    for (const project of projects) {
        if (!project.id) continue;
        await saveProjectRepo(project);
    }
    
    for (const riff of riffs) {
        if (!riff.id) continue;
        await saveRiffRepo(riff);
    }

    console.log(`Migrated/Synced ${projects.length} projects and ${riffs.length} riffs to SQLite.`);

    // 3. Complete migration checkmarks
    await AsyncStorage.setItem(SQLITE_MIGRATED_KEY, "true");
    await AsyncStorage.setItem(SQLITE_MIGRATED_M2_KEY, "true");

  } catch (error) {
    console.error("Failed executing Legacy Migration to SQLite:", error);
  }
}

