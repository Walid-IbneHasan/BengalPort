// Short notifications that pop up over the page ("Application submitted")
// and go away by themselves. Shown by components/Toasts.svelte.
import { writable } from "svelte/store";

export type Toast = { id: number; kind: "success" | "error"; message: string; detail?: string };

type Options = {
  // How long good news stays, in milliseconds. A problem stays twice as long.
  duration?: number;
  limit?: number;
  setTimeout?: (run: () => void, ms: number) => unknown;
  clearTimeout?: (timer: any) => void;
};

export function createToasts(options: Options = {}) {
  const duration = options.duration ?? 7000;
  const limit = options.limit ?? 3;
  const later = options.setTimeout ?? ((run, ms) => setTimeout(run, ms));
  const cancel = options.clearTimeout ?? ((timer) => clearTimeout(timer));
  const { subscribe, update } = writable<Toast[]>([]);
  const timers = new Map<number, unknown>();
  let next = 1;

  function dismiss(id: number) {
    cancel(timers.get(id));
    timers.delete(id);
    update((list) => list.filter((toast) => toast.id !== id));
  }

  // Shows a notification and returns its number, for closing it early.
  function show(message: string, extra: { kind?: Toast["kind"]; detail?: string } = {}): number {
    const id = next++;
    const kind = extra.kind ?? "success";
    update((list) => {
      const kept = [{ id, kind, message, detail: extra.detail }, ...list];
      for (const dropped of kept.slice(limit)) {
        cancel(timers.get(dropped.id));
        timers.delete(dropped.id);
      }
      return kept.slice(0, limit);
    });
    timers.set(id, later(() => dismiss(id), kind === "error" ? duration * 2 : duration));
    return id;
  }

  return { subscribe, show, dismiss };
}

export const toasts = createToasts();
