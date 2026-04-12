import { useState, useMemo } from "react";

type SortDirection = "asc" | "desc" | null;

interface SortState {
  key: string | null;
  direction: SortDirection;
}

export function useSort<T>(data: T[], accessors: Record<string, (item: T) => string | number | null | undefined>) {
  const [sort, setSort] = useState<SortState>({ key: null, direction: null });

  const toggle = (key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: null };
    });
  };

  const sorted = useMemo(() => {
    if (!sort.key || !sort.direction) return data;
    const accessor = accessors[sort.key];
    if (!accessor) return data;
    return [...data].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return sort.direction === "asc" ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      const cmp = sa.localeCompare(sb, "es");
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort.key, sort.direction]);

  return { sorted, sortKey: sort.key, sortDirection: sort.direction, toggle };
}
