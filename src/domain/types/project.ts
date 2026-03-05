export type ProjectSection = {
  id: string;
  name: string; // Ex: "Intro", "Verso", "Refrão"
  riffIds: string[];
  notes?: string;
  notesMode?: "lyrics" | "notes";
  notesWrap?: boolean;
};

export type ProjectMarker = {
  id: string;
  sectionId: string;
  timestampMs: number;
  text: string;
};

export type Project = {
  id: string;
  name: string;
  color?: string;
  emoji?: string; // legacy support, but can remain if users still have it
  icon?: string;
  genre?: string;
  riffOrder?: string[]; // Legacy property for backwards compatibility, handled in migration
  sections?: ProjectSection[];
  markers?: ProjectMarker[];
  bpm?: number;
  bpmSource?: "manual" | "fromRiff";
  createdAt: number;
  updatedAt: number;
};


