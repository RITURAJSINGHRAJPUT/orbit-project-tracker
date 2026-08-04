let debounce: ReturnType<typeof setTimeout> | undefined;

/**
 * Nudge a background sync after a mutation, coalescing a burst of edits into
 * one upload.
 *
 * The sync store is pulled in dynamically on purpose: it imports the engine,
 * which imports the project store, which imports this file. A static import
 * would close that cycle at module-evaluation time; deferring it to the moment
 * the timer fires keeps the graph acyclic at load.
 */
export function scheduleSync(delayMs = 2000) {
  if (typeof window === 'undefined') return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    void import('./useSyncStore')
      .then((m) => m.useSyncStore.getState().sync({ silent: true }))
      .catch(() => {
        /* sync is best-effort; local data is already durable */
      });
  }, delayMs);
}
