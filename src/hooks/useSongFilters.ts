"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchClassOptions, type ClassOption, type FeedFilters } from "@/hooks/useSongFeed";

// Owns the feed's search/filter controls: a debounced text query and the
// grade/class dropdowns (whose options come from the songs that exist).
// Returns `filters` to hand straight to useSongFeed, plus the state and
// derived option lists the toolbar renders.
export function useSongFilters() {
  // `searchInput` tracks the field; `search` is the debounced value that
  // actually drives the query, so we don't hit the DB on every keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    fetchClassOptions().then((opts) => {
      if (active) setClassOptions(opts);
    });
    return () => {
      active = false;
    };
  }, []);

  // Distinct grades, and the classes available for the selected grade.
  const grades = [...new Set(classOptions.map((o) => o.grade).filter((g): g is number => g != null))];
  const classNames = [
    ...new Set(
      classOptions
        .filter((o) => grade == null || o.grade === grade)
        .map((o) => o.className)
        .filter((c): c is string => c != null)
    ),
  ];

  // Picking a grade clears a class that no longer belongs to it.
  const selectGrade = useCallback((next: number | null) => {
    setGrade(next);
    setClassName(null);
  }, []);

  const filters: FeedFilters = { search, grade, className };

  return {
    filters,
    searchInput,
    setSearchInput,
    grade,
    selectGrade,
    className,
    setClassName,
    grades,
    classNames,
    hasClassFilters: grades.length > 0 || classNames.length > 0,
  };
}
