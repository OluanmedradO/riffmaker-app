import { createProject, mutateProjects, updateProject } from "@/src/data/storage/projects";
import { Project } from "@/src/domain/types/project";

jest.mock("@/src/utils/async", () => ({
  withRetry: async (fn: () => Promise<unknown>) => fn(),
}));

jest.mock("@/src/utils/formatters", () => ({
  generateId: () => "generated-id",
}));

const getProjectsRepo = jest.fn();
const saveProjectRepo = jest.fn();
const deleteProjectRepo = jest.fn();

jest.mock("@/src/storage/sqlite/projects.repo", () => ({
  getProjectsRepo: (...args: unknown[]) => getProjectsRepo(...args),
  saveProjectRepo: (...args: unknown[]) => saveProjectRepo(...args),
  deleteProjectRepo: (...args: unknown[]) => deleteProjectRepo(...args),
}));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

describe("projects storage", () => {
  let store: Project[];

  beforeEach(() => {
    jest.clearAllMocks();
    store = [
      {
        id: "p1",
        name: "Main",
        color: "#ff0000",
        createdAt: 1,
        updatedAt: 1,
        riffOrder: [],
        sections: [{ id: "s1", name: "Ideas", riffIds: [] }],
      },
    ];

    getProjectsRepo.mockImplementation(async () => clone(store));
    saveProjectRepo.mockImplementation(async (project: Project) => {
      const index = store.findIndex((item) => item.id === project.id);
      if (index >= 0) {
        store[index] = clone(project);
      } else {
        store.push(clone(project));
      }
    });
    deleteProjectRepo.mockResolvedValue(undefined);
  });

  it("creates a project and persists it", async () => {
    const project = await createProject({ name: "  New Project  ", color: "#00ff00", emoji: "EM" });

    expect(project.id).toBe("generated-id");
    expect(project.name).toBe("New Project");
    expect(store.some((item) => item.id === "generated-id")).toBe(true);
  });

  it("serializes concurrent project mutations", async () => {
    const first = mutateProjects(async (projects) => {
      await Promise.resolve();
      projects[0].riffOrder = [...(projects[0].riffOrder || []), "a"];
    });

    const second = mutateProjects(async (projects) => {
      projects[0].riffOrder = [...(projects[0].riffOrder || []), "b"];
    });

    await Promise.all([first, second]);

    expect(store[0].riffOrder).toContain("a");
    expect(store[0].riffOrder).toContain("b");
    expect(saveProjectRepo).toHaveBeenCalled();
  });

  it("updates advanced project fields", async () => {
    const nextSections = [{ id: "s2", name: "Verse", riffIds: ["r1"] }];

    const updated = await updateProject("p1", {
      sections: nextSections,
      bpm: 128,
      bpmSource: "manual",
    });

    expect(updated.sections).toEqual(nextSections);
    expect(updated.bpm).toBe(128);
    expect(updated.bpmSource).toBe("manual");

    expect(store[0].sections).toEqual(nextSections);
    expect(store[0].bpm).toBe(128);
  });
});



