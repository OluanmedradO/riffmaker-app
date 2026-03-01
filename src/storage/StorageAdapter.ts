/**
 * Base interface for generic storage adapters.
 * This prepares the app to migrate from AsyncStorage to MMKV or SQLite in the future
 * without changing the consuming components.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  clear(): Promise<void>;
}
