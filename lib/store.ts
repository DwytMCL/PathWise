import { create } from "zustand";
import { normalizeOfferingTerms, type Curriculum, type Course, type Status } from "./curriculum";
import { planCurriculum, type PlanOptions } from "./planner";
import { MAX_SCENARIOS, normalizeOptions, normalizeScenarios, type PlanningWorkspace, type Scenario } from "./workspace";

type Store = {
  curriculum: Curriculum | null;
  options: PlanOptions | null;
  scenarios: Scenario[];
  history: PlanningWorkspace[];
  load: (curriculum: Curriculum, planning?: Pick<PlanningWorkspace, "options" | "scenarios">) => void;
  setStatus: (code: string, status: Status) => void;
  setOfferings: (code: string, terms: number[] | undefined) => void;
  setOptions: (options: PlanOptions) => void;
  move: (code: string, year: number, term: number) => void;
  releasePlacement: (code: string) => void;
  applyPlan: (assignments: Map<string, number>) => void;
  saveScenario: (name: string) => void;
  restoreScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  deleteScenario: (id: string) => void;
  undo: () => void;
  clear: () => void;
};

function checkpoint(state: Store) {
  return state.curriculum && state.options ? [...state.history.slice(-49), {
    curriculum: state.curriculum, options: state.options, scenarios: state.scenarios,
  }] : state.history;
}

function updateCourses(state: Store, update: (course: Course) => Course) {
  return state.curriculum ? {
    history: checkpoint(state), curriculum: { ...state.curriculum, courses: state.curriculum.courses.map(update) },
  } : state;
}

function scenarioName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60) throw new Error("Give your scenario a name of 1–60 characters.");
  return trimmed;
}

export const useCurriculumStore = create<Store>((set) => ({
  curriculum: null, options: null, scenarios: [], history: [],
  load: (curriculum, planning) => set({
    curriculum, options: normalizeOptions(planning?.options, curriculum),
    scenarios: normalizeScenarios(planning?.scenarios, curriculum), history: [],
  }),
  setStatus: (code, status) => set(state => updateCourses(state, c => c.code === code ? { ...c, status } : c)),
  setOfferings: (code, terms) => {
    const offeredTerms = normalizeOfferingTerms(terms);
    set(state => updateCourses(state, c => c.code === code ? { ...c, offeredTerms } : c));
  },
  setOptions: options => set(state => state.curriculum ? {
    options: normalizeOptions(options, state.curriculum), history: checkpoint(state),
  } : state),
  move: (code, year, term) => set(state => updateCourses(state, c => c.code === code ? { ...c, year, term, isPinned: true } : c)),
  releasePlacement: code => set(state => updateCourses(state, c => c.code === code ? { ...c, isPinned: undefined } : c)),
  applyPlan: assignments => set(state => updateCourses(state, course => {
    const index = assignments.get(course.code);
    return index === undefined ? course : { ...course, year: Math.floor((index - 1) / 3) + 1, term: (index - 1) % 3 + 1 };
  })),
  saveScenario: name => set(state => {
    if (!state.curriculum || !state.options) return state;
    if (state.scenarios.length >= MAX_SCENARIOS) throw new Error(`Keep up to ${MAX_SCENARIOS} scenarios. Delete one to make room.`);
    const plan = planCurriculum(state.curriculum.courses, state.options);
    const curriculum = structuredClone(state.curriculum);
    curriculum.courses = curriculum.courses.map(course => {
      const index = plan.assignments.get(course.code);
      return index === undefined ? course : { ...course, year: Math.floor((index - 1) / 3) + 1, term: (index - 1) % 3 + 1 };
    });
    const scenario = { id: crypto.randomUUID(), name: scenarioName(name), savedAt: new Date().toISOString(), curriculum, options: { ...state.options } };
    return { scenarios: [...state.scenarios, scenario], history: checkpoint(state) };
  }),
  restoreScenario: id => set(state => {
    const scenario = state.scenarios.find(s => s.id === id);
    return scenario ? { curriculum: structuredClone(scenario.curriculum), options: { ...scenario.options }, history: checkpoint(state) } : state;
  }),
  renameScenario: (id, name) => {
    const next = scenarioName(name);
    set(state => ({ scenarios: state.scenarios.map(s => s.id === id ? { ...s, name: next } : s), history: checkpoint(state) }));
  },
  deleteScenario: id => set(state => ({ scenarios: state.scenarios.filter(s => s.id !== id), history: checkpoint(state) })),
  undo: () => set(state => {
    const previous = state.history.at(-1);
    return previous ? { ...previous, history: state.history.slice(0, -1) } : state;
  }),
  clear: () => set({ curriculum: null, options: null, scenarios: [], history: [] }),
}));
