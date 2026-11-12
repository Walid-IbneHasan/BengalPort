// The site's own "Are you sure?" box, in place of the browser's. A page asks
// with `confirmAction({...})` and waits for the answer; the box itself is
// components/ConfirmDialog.svelte, shown once in the root layout.
import { writable } from "svelte/store";

export type Question = {
  title: string;
  message?: string;
  // The button that goes ahead. "Delete" unless the action is something else.
  confirmLabel?: string;
  cancelLabel?: string;
  // Red for actions that remove or cannot be undone.
  tone?: "danger" | "default";
};
export type OpenQuestion = Required<Omit<Question, "message">> & { message: string };

export function createConfirms() {
  const { subscribe, set } = writable<OpenQuestion | null>(null);
  const waiting: Array<{ question: OpenQuestion; resolve: (yes: boolean) => void }> = [];

  function show() {
    set(waiting[0]?.question ?? null);
  }

  function ask(question: Question): Promise<boolean> {
    return new Promise((resolve) => {
      waiting.push({
        question: {
          title: question.title,
          message: question.message ?? "",
          confirmLabel: question.confirmLabel ?? "Delete",
          cancelLabel: question.cancelLabel ?? "Cancel",
          tone: question.tone ?? "danger",
        },
        resolve,
      });
      if (waiting.length === 1) show();
    });
  }

  function answer(yes: boolean) {
    const current = waiting.shift();
    current?.resolve(yes);
    show();
  }

  return { subscribe, ask, answer };
}

export const confirms = createConfirms();
export const confirmAction = (question: Question) => confirms.ask(question);
