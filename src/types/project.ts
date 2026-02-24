export type Project = {
  id: string;
  name: string;
  color?: string;
  emoji?: string; // legacy support, but can remain if users still have it
  icon?: string;
  genre?: string;
  createdAt: number;
  updatedAt: number;
};
