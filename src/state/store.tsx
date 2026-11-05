import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as repo from '../domain/repository';
import { createSeedData } from '../domain/seed';
import type { AppData, Learner, PromptState, RealWorldCheck, Routine, Session } from '../domain/types';
import { getMedia, loadState, saveState } from '../services/db';

/**
 * App-wide state. Holds AppData in React state, applies the pure operations
 * from domain/repository.ts, and saves to IndexedDB after each change.
 */
export interface Store {
  data: AppData;
  saveLearner: (learner: Learner) => void;
  deleteLearner: (id: string) => void;
  saveRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  recordSession: (session: Session, tokensEarned: number) => void;
  addRealWorldCheck: (check: RealWorldCheck) => void;
  deleteRealWorldCheck: (id: string) => void;
  promptFor: (learnerId: string, stepId: string) => PromptState;
  replaceAll: (data: AppData) => void;
}

const StoreContext = createContext<Store | null>(null);
const SAVE_DELAY_MS = 250;

interface Props {
  children: ReactNode;
  /** Skips IndexedDB and starts from this data. Used by tests. */
  initialData?: AppData;
}

export function StoreProvider({ children, initialData }: Props) {
  const [data, setData] = useState<AppData | null>(initialData ?? null);
  const persist = !initialData;
  const saveTimer = useRef<number>();

  useEffect(() => {
    if (!persist) return;
    loadState()
      .then((saved) => setData(repo.migrate(saved) ?? createSeedData()))
      .catch(() => setData(createSeedData()));
  }, [persist]);

  useEffect(() => {
    if (!data || !persist) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveState(data).catch((e) => console.error('Could not save LifeSync data', e));
    }, SAVE_DELAY_MS);
  }, [data, persist]);

  const apply = useCallback((op: (d: AppData) => AppData) => setData((prev) => (prev ? op(prev) : prev)), []);

  const store = useMemo<Store | null>(
    () =>
      data && {
        data,
        saveLearner: (learner) => apply((d) => repo.upsertLearner(d, learner)),
        deleteLearner: (id) => apply((d) => repo.removeLearner(d, id)),
        saveRoutine: (routine) => apply((d) => repo.upsertRoutine(d, routine)),
        deleteRoutine: (id) => apply((d) => repo.removeRoutine(d, id)),
        recordSession: (session, tokens) => apply((d) => repo.applySession(d, session, tokens)),
        addRealWorldCheck: (check) => apply((d) => repo.addRealWorldCheck(d, check)),
        deleteRealWorldCheck: (id) => apply((d) => repo.removeRealWorldCheck(d, id)),
        promptFor: (learnerId, stepId) => repo.promptStateFor(data, learnerId, stepId),
        replaceAll: setData,
      },
    [data, apply],
  );

  if (!store) return <div className="loading">Loading LifeSync…</div>;
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
    getMedia(mediaId)
      .then((blob) => {
        if (!blob || !live) return;
        const objectUrl = URL.createObjectURL(blob);
        urlCache.set(mediaId, objectUrl);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [mediaId]);
  return url;
}
