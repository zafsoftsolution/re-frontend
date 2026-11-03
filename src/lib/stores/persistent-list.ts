/**
 * Tiny localStorage-backed list store for `useSyncExternalStore`.
 *
 * SSR-safe: the server snapshot is always the empty list, and the client only
 * touches localStorage after hydration (React calls getServerSnapshot while
 * hydrating, then re-renders with getSnapshot). Syncs across tabs through the
 * `storage` event. Storage failures (private mode, quota) degrade to an
 * in-memory list.
 */
export interface PersistentListStore<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly T[];
  getServerSnapshot(): readonly T[];
  set(next: readonly T[] | ((prev: readonly T[]) => readonly T[])): void;
  clear(): void;
}

const EMPTY: readonly never[] = Object.freeze([]);

export function createPersistentListStore<T>(
  storageKey: string,
  validate: (raw: unknown) => T | null,
): PersistentListStore<T> {
  let items: readonly T[] = EMPTY;
  let loaded = false;
  const listeners = new Set<() => void>();

  const read = (): readonly T[] => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return EMPTY;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return EMPTY;
      return Object.freeze(parsed.map(validate).filter((x): x is T => x !== null));
    } catch {
      return EMPTY;
    }
  };

  const ensureLoaded = () => {
    if (!loaded && typeof window !== "undefined") {
      items = read();
      loaded = true;
    }
  };

  const emit = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    if (e.key !== storageKey) return;
    items = read();
    emit();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
    getSnapshot() {
      ensureLoaded();
      return items;
    },
    getServerSnapshot() {
      return EMPTY;
    },
    set(next) {
      ensureLoaded();
      items = Object.freeze([...(typeof next === "function" ? next(items) : next)]);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(items));
      } catch {
        /* keep in memory only */
      }
      emit();
    },
    clear() {
      this.set(EMPTY);
    },
  };
}
