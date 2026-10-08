// Keep live documents while their keys remain selected. Removing a key or
// disposing the owner also invalidates callbacks queued before unsubscribe.
export function keyedSubscriptions<T>(
  subscribe: (id: string, receive: (value: T | null) => void, fail: (error: unknown) => void) => () => void,
  changed: (records: ReadonlyMap<string, T>) => void,
  failed: (error: unknown) => void,
) {
  const watches = new Map<string, { active: boolean; stop: () => void }>();
  const records = new Map<string, T>();
  let active = true;
  const publish = () => changed(new Map(records));
  return {
    reconcile(ids: Iterable<string>) {
      if (!active) return;
      const selected = new Set(ids);
      let removedRecord = false;
      for (const [id, watch] of watches) {
        if (selected.has(id)) continue;
        watch.active = false; watches.delete(id); watch.stop();
        removedRecord = records.delete(id) || removedRecord;
      }
      if (removedRecord) publish();
      for (const id of selected) {
        if (watches.has(id)) continue;
        const watch = { active: true, stop: () => {} };
        watches.set(id, watch);
        const current = () => active && watch.active && watches.get(id) === watch;
        const fail = (error: unknown) => {
          if (!current()) return;
          watch.active = false; watches.delete(id);
          watch.stop();
          if (records.delete(id)) publish();
          failed(error);
        };
        try {
          watch.stop = subscribe(id, value => {
            if (!current()) return;
            if (value === null) records.delete(id); else records.set(id, value);
            publish();
          }, fail);
          // A synchronous subscription failure may have retired this watch.
          if (!watch.active) watch.stop();
        } catch (error) { fail(error); }
      }
    },
    dispose() {
      if (!active) return;
      active = false;
      for (const watch of watches.values()) { watch.active = false; watch.stop(); }
      watches.clear(); records.clear();
    },
  };
}
