import { Project } from "@/src/domain/types/project";
import { db } from "@/src/data/storage/db";

type ProjectRow = {
  id: string;
  name: string;
  color: string | null;
  emoji: string | null;
  icon: string | null;
  genre: string | null;
  riffOrderJson: string | null;
  sectionsJson: string | null;
  markersJson: string | null;
  bpm: number | null;
  bpmSource: "manual" | "fromRiff" | null;
  createdAt: number;
  updatedAt: number;
};

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapRowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    color: row.color || undefined,
    emoji: row.emoji || undefined,
    icon: row.icon || undefined,
    genre: row.genre || undefined,
    riffOrder: parseJson<string[] | undefined>(row.riffOrderJson, undefined),
    sections: parseJson<Project["sections"]>(row.sectionsJson, undefined),
    markers: parseJson<Project["markers"]>(row.markersJson, undefined),
    bpm: row.bpm ?? undefined,
    bpmSource: row.bpmSource || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getProjectsRepo(): Promise<Project[]> {
  const rows = await db.getAllAsync("SELECT * FROM projects ORDER BY updatedAt DESC;");
  return (rows as ProjectRow[]).map(mapRowToProject);
}

export async function saveProjectRepo(project: Project): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO projects (
      id,
      name,
      color,
      emoji,
      icon,
      genre,
      riffOrderJson,
      sectionsJson,
      markersJson,
      bpm,
      bpmSource,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      project.id,
      project.name,
      project.color || null,
      project.emoji || null,
      project.icon || null,
      project.genre || null,
      project.riffOrder ? JSON.stringify(project.riffOrder) : null,
      project.sections ? JSON.stringify(project.sections) : null,
      project.markers ? JSON.stringify(project.markers) : null,
      project.bpm ?? null,
      project.bpmSource || null,
      project.createdAt,
      project.updatedAt,
    ]
  );
}

export async function deleteProjectRepo(projectId: string): Promise<void> {
  await db.runAsync(`DELETE FROM projects WHERE id = ?;`, [projectId]);
}

export async function getProjectByIdRepo(projectId: string): Promise<Project | null> {
  const rows = await db.getAllAsync("SELECT * FROM projects WHERE id = ? LIMIT 1;", [projectId]);
  if (rows.length === 0) return null;
  return mapRowToProject(rows[0] as ProjectRow);
}

