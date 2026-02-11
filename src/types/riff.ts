export type Riff = {
  id: string;
  title: string;
  bpm?: number;
  notes?: string;
  audioUri?: string;
  createdAt: number;
  updatedAt?: number;
  favorite?: boolean;

  tuning?: {
    type: "preset" | "custom";
    value: string;
  };
};
