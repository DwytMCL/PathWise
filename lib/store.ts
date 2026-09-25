import { create } from "zustand";
import type { Curriculum, Course, Status } from "./curriculum";

type Store = {
  curriculum: Curriculum | null;
  history: Course[][];
  load: (curriculum: Curriculum) => void;
  setStatus: (code: string, status: Status) => void;
  move: (code: string, year: number, term: number) => void;
  applyPlan: (assignments: Map<string, number>) => void;
  undo: () => void;
  clear: () => void;
};

export const useCurriculumStore = create<Store>((set) => ({
  curriculum: null, history: [],
  load: (curriculum) => set({ curriculum, history: [] }),
  setStatus: (code, status) => set((state) => state.curriculum ? {
    history: [...state.history, state.curriculum.courses],
    curriculum: { ...state.curriculum, courses: state.curriculum.courses.map((course) => course.code === code ? { ...course, status } : course) },
  } : state),
  move: (code, year, term) => set((state) => state.curriculum ? {
    history: [...state.history, state.curriculum.courses],
    curriculum: { ...state.curriculum, courses: state.curriculum.courses.map((course) => course.code === code ? { ...course, year, term, isPinned: true } : course) },
  } : state),
  applyPlan: (assignments) => set((state) => state.curriculum ? {
    history: [...state.history, state.curriculum.courses],
    curriculum: { ...state.curriculum, courses: state.curriculum.courses.map(course => {
      const index = assignments.get(course.code);
      return index === undefined ? course : { ...course, year: Math.floor((index - 1) / 3) + 1, term: (index - 1) % 3 + 1 };
    }) },
  } : state),
  undo: () => set((state) => {
    if (!state.curriculum || !state.history.length) return state;
    return { curriculum: { ...state.curriculum, courses: state.history.at(-1)! }, history: state.history.slice(0, -1) };
  }),
  clear: () => set({ curriculum: null, history: [] }),
}));
