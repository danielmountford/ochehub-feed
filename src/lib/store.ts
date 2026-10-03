import { useSyncExternalStore } from 'react';

/** Minimal external store: enough for prefs, saves and the player. */
export interface Store<T> {
  get(): T;
  set(next: T | ((previous: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next) {
      const value = typeof next === 'function' ? (next as (previous: T) => T)(state) : next;
      if (Object.is(value, state)) {
        return;
      }
      state = value;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStore<T>(store: Store<T>): T;
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S;
export function useStore<T, S>(store: Store<T>, selector?: (state: T) => S) {
  return useSyncExternalStore(store.subscribe, () => (selector ? selector(store.get()) : store.get()));
}

/** A store mirrored to localStorage. Storage failures are ignored: state stays in memory. */
export function createPersistedStore<T>(key: string, initial: T): Store<T> {
  let seed = initial;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      seed = { ...initial, ...JSON.parse(raw) };
    }
  } catch {
    // Private mode or blocked storage.
  }
  const store = createStore<T>(seed);
  store.subscribe(() => {
    try {
      localStorage.setItem(key, JSON.stringify(store.get()));
    } catch {
      // Ignore.
    }
  });
  return store;
}
