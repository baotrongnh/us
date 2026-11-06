export function createLocalStoragePreference<T extends string>(
  key: string,
  fallback: T,
  isValue: (value: string) => value is T
) {
  const eventName = `local-storage-preference:${key}`;

  const getSnapshot = (): T => {
    if (typeof window === "undefined") return fallback;
    const saved = window.localStorage.getItem(key);
    return saved && isValue(saved) ? saved : fallback;
  };

  return {
    getSnapshot,
    getServerSnapshot: () => fallback,
    subscribe(onChange: () => void) {
      if (typeof window === "undefined") return () => {};
      const handleStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) onChange();
      };
      window.addEventListener("storage", handleStorage);
      window.addEventListener(eventName, onChange);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(eventName, onChange);
      };
    },
    set(value: T) {
      window.localStorage.setItem(key, value);
      window.dispatchEvent(new Event(eventName));
    },
  };
}
