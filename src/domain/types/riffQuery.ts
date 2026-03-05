import { RecordingType } from '@/src/domain/types/riff';

export type SortField = 'createdAt' | 'name' | 'duration';
export type SortDirection = 'asc' | 'desc';
export type QuickFilter = 'today' | 'favorites' | null;

export interface AdvancedFilters {
  folder?: string | null;   // project ID, 'none', or undefined (= no filter)
  tags?: string[];
  types?: RecordingType[];
  mustHaveMarkers?: boolean;
}

export interface RiffQueryState {
  search: string;
  quickFilter: QuickFilter;
  advanced: AdvancedFilters;
  sort: { field: SortField; direction: SortDirection };
}

export const DEFAULT_QUERY: RiffQueryState = {
  search: '',
  quickFilter: null,
  advanced: {},
  sort: { field: 'createdAt', direction: 'desc' },
};

