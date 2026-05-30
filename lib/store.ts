import { create } from 'zustand';

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  useCase?: string | null;
  referralSource?: string | null;
  onboardingComplete: boolean;
  googleConnected?: boolean;
  firefliesConnected?: boolean;
}

interface TaskStore {
  user: CurrentUser | null;
  setUser: (user: CurrentUser | null) => void;
}

export const useTaskStore = create<TaskStore>(set => ({
  user: null,
  setUser: user => set({ user }),
}));
