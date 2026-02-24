import AsyncStorage from "@react-native-async-storage/async-storage";
import { Project } from "../types/project";
import { withRetry } from "../utils/async";
import { generateId } from "../utils/formatters";
import { getRiffs, saveRiffs } from "./riffs";

export const PROJECT_COLORS = [
  "#FF3B30", // Red
  "#FF9500", // Orange
  "#FFCC00", // Yellow
  "#34C759", // Green
  "#5AC8FA", // Light Blue
  "#007AFF", // Blue
  "#5856D6", // Purple
  "#FF2D55", // Pink
  "#8E8E93", // Gray
];

const PROJECTS_KEY = "@riffmaker:projects";

export async function getProjects(): Promise<Project[]> {
  try {
    return await withRetry(async () => {
      const data = await AsyncStorage.getItem(PROJECTS_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data) as Project[];
      // Sort projects by updatedAt descending
      return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  } catch (error) {
    console.error("Error loading projects:", error);
    return [];
  }
}

export async function saveProjects(projects: Project[]) {
  await withRetry(async () => {
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  });
}

export async function createProject(
  input: Pick<Project, "name" | "color" | "emoji">
): Promise<Project> {
  const now = Date.now();
  const newProject: Project = {
    id: generateId(),
    name: input.name.trim() || "Novo Projeto",
    color: input.color,
    emoji: input.emoji,
    createdAt: now,
    updatedAt: now,
  };

  const projects = await getProjects();
  await saveProjects([newProject, ...projects]);
  return newProject;
}

export async function updateProject(
  projectId: string,
  patch: Partial<Pick<Project, "name" | "color" | "emoji">>
): Promise<Project> {
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.id === projectId);
  
  if (index === -1) {
    throw new Error(`Project ${projectId} not found.`);
  }

  const updatedProject = {
    ...projects[index],
    ...patch,
    updatedAt: Date.now(), // Always recalculate on edit
  };

  projects[index] = updatedProject;
  await saveProjects(projects);
  return updatedProject;
}

export async function deleteProject(projectId: string): Promise<void> {
  const projects = await getProjects();
  const filtered = projects.filter((p) => p.id !== projectId);
  await saveProjects(filtered);

  // We DO NOT delete the riffs themselves, we just detach them
  const riffs = await getRiffs();
  let changed = false;
  
  const updatedRiffs = riffs.map(r => {
    if (r.projectId === projectId) {
      changed = true;
      return { ...r, projectId: null };
    }
    return r;
  });

  if (changed) {
    await saveRiffs(updatedRiffs);
  }
}

// Touch project updates its timestamp (e.g., when a riff is added or removed)
export async function touchProject(projectId: string): Promise<void> {
  try {
    const projects = await getProjects();
    const index = projects.findIndex((p) => p.id === projectId);
    if (index > -1) {
      projects[index].updatedAt = Date.now();
      await saveProjects(projects);
    }
  } catch (e) {
    console.warn("Could not touch project", e);
  }
}
