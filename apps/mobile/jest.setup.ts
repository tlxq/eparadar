import { jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    getAllKeys: async () => [...store.keys()],
  };
  return { __esModule: true, default: storage, ...storage };
});
