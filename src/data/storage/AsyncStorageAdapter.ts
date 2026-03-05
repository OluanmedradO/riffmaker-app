import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageAdapter } from "@/src/data/storage/StorageAdapter";

/**
 * Concrete implementation of StorageAdapter using React Native's AsyncStorage.
 */
export const AsyncStorageAdapter: StorageAdapter = {
  getItem: async (key: string) => {
    return await AsyncStorage.getItem(key);
  },
  
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
  
  getAllKeys: async () => {
    return await AsyncStorage.getAllKeys();
  },
  
  clear: async () => {
    await AsyncStorage.clear();
  }
};

