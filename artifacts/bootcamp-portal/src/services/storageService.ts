import { mockData } from "../data/mockData";

type StoreKeys = keyof typeof mockData;

export const storageService = {
  init() {
    if (!localStorage.getItem("bootcamp_initialized")) {
      Object.entries(mockData).forEach(([key, value]) => {
        localStorage.setItem(`bootcamp_${key}`, JSON.stringify(value));
      });
      localStorage.setItem("bootcamp_initialized", "true");
    }
  },

  get<T>(key: StoreKeys): T[] {
    const data = localStorage.getItem(`bootcamp_${key}`);
    return data ? JSON.parse(data) : [];
  },

  set<T>(key: StoreKeys, data: T[]) {
    localStorage.setItem(`bootcamp_${key}`, JSON.stringify(data));
  },

  reset() {
    Object.keys(mockData).forEach((key) => {
      localStorage.removeItem(`bootcamp_${key}`);
    });
    localStorage.removeItem("bootcamp_initialized");
    this.init();
  }
};
