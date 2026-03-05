import { Project } from '@/src/domain/types/project';
import { withRetry } from '@/src/utils/async';
import { generateId } from '@/src/utils/formatters';
import { deleteProjectRepo, getProjectsRepo, saveProjectRepo } from '@/src/data/storage/projects.repo';

export const PROJECT_COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#5AC8FA",
  "#007AFF",
  "#5856D6",
  "#FF2D55",
  "#8E8E93",
];

let projectsWriteQueue: Promise<void> = Promise.resolve();

function withProjectsWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const run = projectsWriteQueue.then(task, task);
  projectsWriteQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function saveProjectsUnlocked(projects: Project[]): Promise<void> {
  await withRetry(async () => {
    for (const project of projects) {
      await saveProjectRepo(project);
    }
  });
}

export async function mutateProjects(
  mutator: (projects: Project[]) => void | boolean | Promise<void | boolean>
): Promise<Project[]> {
  return withProjectsWriteLock(async () => {
    const projects = await withRetry(async () => await getProjectsRepo());
    const shouldSave = await mutator(projects);
    if (shouldSave !== false) {
      await saveProjectsUnlocked(projects);
    }
    return projects;
  });
}

export async function getProjects(): Promise<Project[]> {
  try {
    return await withRetry(async () => await getProjectsRepo());
  } catch (error) {
    console.error("Error loading projects:", error);
    return [];
  }
}

export async function saveProjects(projects: Project[]) {
  await withProjectsWriteLock(async () => {
    await saveProjectsUnlocked(projects);
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

  await mutateProjects((projects) => {
    projects.unshift(newProject);
  });

  return newProject;
}

export async function updateProject(
  projectId: string,
  patch: Partial<
    Pick<
      Project,
      "name" | "color" | "emoji" | "riffOrder" | "sections" | "markers" | "bpm" | "bpmSource"
    >
  >
): Promise<Project> {
  let updatedProject: Project | null = null;

  await mutateProjects((projects) => {
    const index = projects.findIndex((project) => project.id === projectId);
    if (index === -1) {
      throw new Error(`Project ${projectId} not found.`);
    }

    updatedProject = {
      ...projects[index],
      ...patch,
      updatedAt: Date.now(),
    };

    projects[index] = updatedProject;
  });

  if (!updatedProject) {
    throw new Error(`Project ${projectId} not found after mutation.`);
  }

  return updatedProject;
}

export async function deleteProject(projectId: string): Promise<void> {
  await withProjectsWriteLock(async () => {
    await deleteProjectRepo(projectId);
  });
}

export async function touchProject(projectId: string): Promise<void> {
  try {
    await mutateProjects((projects) => {
      const index = projects.findIndex((project) => project.id === projectId);
      if (index < 0) return false;
      projects[index].updatedAt = Date.now();
    });
  } catch (error) {
    console.warn("Could not touch project", error);
  }
}

