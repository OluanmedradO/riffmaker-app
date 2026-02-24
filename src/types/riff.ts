export type RecordingType = "Guitar" | "Beat" | "Vocal" | "Melody" | "Bass" | "Other";

export type Marker = {
  id: string;
  label: string;
  timestampMs: number;
};

export type MidiNote = {
  pitch: number;
  startMs: number;
  durationMs: number;
};

export type Riff = {
  id: string;
  name: string;
  createdAt: number;
  duration: number; // in milliseconds
  audioUri: string;
  waveform: number[];
  
  // Optional metadata
  bpm?: number; // User-confirmed or manually entered BPM
  detectedBpm?: number; // Safely extracted from auto
  suggestedBpms?: number[]; // [half, double]
  bpmSource?: "auto" | "manual";
  
  key?: string;
  type?: RecordingType;
  genre?: string;
  
  tags?: string[]; // Legacy tags
  systemTags?: string[];
  customTags?: string[];
  
  energyLevel?: "low" | "medium" | "high";
  averageRms?: number;
  
  notes?: string;
  projectId?: string | null;
  emoji?: string;
  pinned?: boolean;
  detectedKey?: string;
  markers?: Marker[];
  midiData?: MidiNote[];

  // Versioning & Analysis
  versionGroupId?: string;
  versionNumber?: number;
  analysisVersion?: number;

  // Added for future compatibility, kept from old version but aligned
  updatedAt?: number;
  favorite?: boolean;
  tuning?: {
    type: "preset" | "custom";
    value: string;
  };

  // Data integrity
  corrupted?: boolean;

  // Loop region (milliseconds)
  loopStart?: number;
  loopEnd?: number;
};
