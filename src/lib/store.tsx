import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { nextPromptState } from './adaptive';
import { getMedia, loadState, saveState } from './db';
import { createSeedData } from './seed';
import type { AppData, Learner, PromptState, Routine, Session } from './types';
import { promptKey } from './types';

interface Store {
  data: AppData;
  update: (recipe: (draft: AppData) => AppData) => void;
  saveLearner: (learner: Learner) => void;
  deleteLearner: (id: string) => void;
  saveRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  /** Stores the session and applies adaptive prompting to every step it covered. */
  recordSession: (session: Session) => void;
  promptFor: (learnerId: string, stepId: string) => PromptState;
  replaceAll: (data: AppData) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const saveTimer = useRef<number>();

  useEffect(() => {
    loadState<AppData>()
      .then((saved) => setData(saved ?? createSeedData()))
      .catch(() => setData(createSeedData()));
  }, []);

  useEffect(() => {
    if (!data) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveState(data), 250);
  }, [data]);

  const update = useCallback((recipe: (draft: AppData) => AppData) => {
    setData((prev) => (prev ? recipe(prev) : prev));
  }, []);

  if (!data) {
    return <div className="loading">Loading LifeSync…</div>;
  }

  const store: Store = {
    data,
    update,
    saveLearner: (learner) =>
      update((d) => ({
        ...d,
        learners: d.learners.some((l) => l.id === learner.id)
          ? d.learners.map((l) => (l.id === learner.id ? learner : l))
          : [...d.learners, learner],
      })),
    deleteLearner: (id) =>
      update((d) => ({
        ...d,
        learners: d.learners.filter((l) => l.id !== id),
        routines: d.routines.map((r) => ({ ...r, assignedTo: r.assignedTo.filter((a) => a !== id) })),
      })),
    saveRoutine: (routine) =>
      update((d) => {
        const next = { ...routine, updatedAt: Date.now() };
        return {
          ...d,
          routines: d.routines.some((r) => r.id === routine.id)
            ? d.routines.map((r) => (r.id === routine.id ? next : r))
            : [...d.routines, next],
        };
      }),
    deleteRoutine: (id) => update((d) => ({ ...d, routines: d.routines.filter((r) => r.id !== id) })),
    recordSession: (session) =>
      update((d) => {
        const prompts = { ...d.prompts };
        for (const log of session.steps) {
          const key = promptKey(session.learnerId, log.stepId);
          prompts[key] = nextPromptState(prompts[key], log);
        }
        return { ...d, sessions: [...d.sessions, session], prompts };
      }),
    promptFor: (learnerId, stepId) => data.prompts[promptKey(learnerId, stepId)] ?? { level: 3, streak: 0 },
    replaceAll: (next) => setData(next),
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

const urlCache = new Map<string, string>();

/** Object URL for an uploaded photo or video, or undefined while loading / when missing. */
export function useMediaUrl(mediaId?: string) {
  const [url, setUrl] = useState(() => (mediaId ? urlCache.get(mediaId) : undefined));
  useEffect(() => {
    if (!mediaId) {
      setUrl(undefined);
      return;
    }
    const cached = urlCache.get(mediaId);
    if (cached) {
      setUrl(cached);
      return;
    }
    let live = true;
    getMedia(mediaId).then((blob) => {
      if (!blob || !live) return;
      const objectUrl = URL.createObjectURL(blob);
      urlCache.set(mediaId, objectUrl);
      setUrl(objectUrl);
    });
    return () => {
      live = false;
    };
  }, [mediaId]);
  return url;
}
