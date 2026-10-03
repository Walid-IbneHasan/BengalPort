// Turns a page's content (nested text, lists and cards) into the rows of the
// admin's content editor, and applies the editor's changes to a copy of it.

export type ContentRow =
  | { kind: "field"; path: string; label: string; value: string; long: boolean; image: boolean; remove?: { list: string; index: number } }
  | { kind: "remove"; list: string; index: number; label: string }
  | { kind: "add"; list: string; label: string };

// "values.1.description" -> "values 2 · description"
const words = (path: string) =>
  path
    .replace(/\.(\d+)(?=\.|$)/g, (_, index) => ` ${Number(index) + 1}`)
    .replaceAll(".", " · ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
const capital = (value: string) => value.replace(/^./, (c) => c.toUpperCase());

// With `lists`, items can be added to and removed from every list.
export function contentRows(value: unknown, options: { lists?: boolean } = {}, path = "", remove?: { list: string; index: number }): ContentRow[] {
  if (typeof value === "string")
    return [{ kind: "field", path, label: capital(words(path)), value, long: value.length > 75 || /description/i.test(path), image: /(^|\.)image$/i.test(path), ...(remove ? { remove } : {}) }];
  if (Array.isArray(value)) {
    const removable = Boolean(options.lists) && value.length > 1;
    const rows = value.flatMap((item, index): ContentRow[] => {
      const at = { list: path, index };
      const itemPath = `${path}.${index}`;
      if (typeof item === "string") return contentRows(item, options, itemPath, removable ? at : undefined);
      return [...contentRows(item, options, itemPath), ...(removable ? [{ kind: "remove" as const, ...at, label: `Remove ${words(itemPath)}` }] : [])];
    });
    return options.lists ? [...rows, { kind: "add", list: path, label: `Add to ${words(path)}` }] : rows;
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => contentRows(item, options, path ? `${path}.${key}` : key));
}

function at(root: any, path: string) {
  return path.split(".").reduce((target, key) => target[key], root);
}

export function setAt<T>(content: T, path: string, value: string): T {
  const copy = structuredClone(content);
  const keys = path.split(".");
  const parent = keys.slice(0, -1).reduce((target: any, key) => target[key], copy);
  parent[keys.at(-1) as string] = value;
  return copy;
}

// A new item shaped like its neighbours, with every text empty.
const blank = (example: unknown): unknown =>
  typeof example === "string"
    ? ""
    : Array.isArray(example)
      ? [""]
      : example && typeof example === "object"
        ? Object.fromEntries(Object.entries(example).map(([key, item]) => [key, blank(item)]))
        : example;

export function addItem<T>(content: T, list: string): T {
  const copy = structuredClone(content);
  const items = at(copy, list) as unknown[];
  items.push(blank(items.at(-1) ?? ""));
  return copy;
}

export function removeItem<T>(content: T, list: string, index: number): T {
  const copy = structuredClone(content);
  (at(copy, list) as unknown[]).splice(index, 1);
  return copy;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

// A page saved before a section or a text was added to it: what was saved is
// kept, and whatever it lacks gets the built-in wording. The result has
// exactly the shape of `builtIn`; saved lists are kept whole.
export function fillMissing<T>(builtIn: T, saved: unknown): T {
  if (Array.isArray(builtIn)) return structuredClone(Array.isArray(saved) ? saved : builtIn) as T;
  if (isObject(builtIn)) {
    const from = isObject(saved) ? saved : {};
    return Object.fromEntries(Object.entries(builtIn).map(([key, value]) => [key, fillMissing(value, from[key])])) as T;
  }
  return (typeof saved === typeof builtIn ? saved : builtIn) as T;
}
