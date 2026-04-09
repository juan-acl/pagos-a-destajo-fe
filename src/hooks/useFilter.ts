import { useState, useMemo, useCallback } from "react";

type FilterValue = string | number | boolean | null | undefined;

type Filters<T> = Partial<Record<keyof T, FilterValue>>;

interface UseFilterOptions<T> {
  data: T[];

  filterableFields?: (keyof T)[];

  exactMatchFields?: (keyof T)[];
  caseSensitive?: boolean;
  partialMatch?: boolean;
}

interface UseFilterReturn<T> {
  filteredData: T[];
  activeFilters: Filters<T>;

  search: string;
  setSearch: (value: string) => void;

  setFilter: (field: keyof T, value: FilterValue) => void;
  setFilters: (filters: Filters<T>) => void;
  clearFilter: (field: keyof T) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

export function useFilter<T extends Record<string, unknown>>({
  data,
  filterableFields,
  exactMatchFields = [],
  caseSensitive = false,
  partialMatch = true,
}: UseFilterOptions<T>): UseFilterReturn<T> {
  const [activeFilters, setActiveFilters] = useState<Filters<T>>({});
  const [search, setSearchValue] = useState("");

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  /* ── Filtros por campo ── */
  const setFilter = useCallback((field: keyof T, value: FilterValue) => {
    setActiveFilters((prev) => {
      if (value === null || value === undefined || value === "") {
        const { [field]: _, ...rest } = prev;
        return rest as Filters<T>;
      }
      return { ...prev, [field]: value };
    });
  }, []);

  const setFilters = useCallback((filters: Filters<T>) => {
    setActiveFilters((prev) => {
      const cleaned = { ...prev };
      for (const [key, value] of Object.entries(filters)) {
        if (value === null || value === undefined || value === "") {
          delete cleaned[key as keyof T];
        } else {
          (cleaned as Record<string, unknown>)[key] = value;
        }
      }
      return cleaned;
    });
  }, []);

  const clearFilter = useCallback((field: keyof T) => {
    setActiveFilters((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest as Filters<T>;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    setSearchValue("");
  }, []);

  const filteredData = useMemo(() => {
    let result = data;

    if (search.trim()) {
      const term = caseSensitive ? search.trim() : search.trim().toLowerCase();
      const fields =
        filterableFields ?? (Object.keys(data[0] ?? {}) as (keyof T)[]);

      const searchFields = fields.filter((f) => !exactMatchFields.includes(f));

      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = item[field];
          if (val === null || val === undefined) return false;
          const str = caseSensitive ? String(val) : String(val).toLowerCase();
          return str.includes(term);
        }),
      );
    }

    const filterEntries = Object.entries(activeFilters) as [
      keyof T,
      FilterValue,
    ][];

    if (filterEntries.length > 0) {
      result = result.filter((item) =>
        filterEntries.every(([field, filterValue]) => {
          if (filterableFields && !filterableFields.includes(field)) {
            return true;
          }

          const itemValue = item[field];
          if (itemValue === null || itemValue === undefined) return false;

          const useExact = exactMatchFields.includes(field) || !partialMatch;

          if (
            typeof itemValue === "string" &&
            typeof filterValue === "string"
          ) {
            const a = caseSensitive ? itemValue : itemValue.toLowerCase();
            const b = caseSensitive ? filterValue : filterValue.toLowerCase();
            return useExact ? a === b : a.includes(b);
          }

          if (
            typeof itemValue === "number" &&
            typeof filterValue === "number"
          ) {
            return itemValue === filterValue;
          }
          if (
            typeof itemValue === "number" &&
            typeof filterValue === "string"
          ) {
            return String(itemValue).includes(filterValue);
          }

          if (
            typeof itemValue === "boolean" &&
            typeof filterValue === "boolean"
          ) {
            return itemValue === filterValue;
          }

          return itemValue === filterValue;
        }),
      );
    }

    return result;
  }, [
    data,
    search,
    activeFilters,
    filterableFields,
    exactMatchFields,
    caseSensitive,
    partialMatch,
  ]);

  const activeFilterCount =
    Object.keys(activeFilters).length + (search.trim() ? 1 : 0);

  return {
    filteredData,
    activeFilters,
    search,
    setSearch,
    setFilter,
    setFilters,
    clearFilter,
    clearAllFilters,
    hasActiveFilters: activeFilterCount > 0,
    activeFilterCount,
  };
}
