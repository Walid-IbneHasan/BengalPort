export type PageMeta = { total: number; page: number; pageSize: number };

export function lastPage(meta: PageMeta): number {
  return Math.max(1, Math.ceil(meta.total / meta.pageSize));
}

// "Showing 26–50 of 132"
export function pageSummary(meta: PageMeta): string {
  if (!meta.total) return "No records";
  const first = (meta.page - 1) * meta.pageSize + 1;
  return `Showing ${first}–${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total}`;
}
