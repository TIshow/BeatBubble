"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Song } from "@/core/types";

export type FeedView = "all" | "mine" | "templates";

export type FeedSong = {
  id: string;
  title: string;
  author: string;
  created_at: string;
  updated_at: string;
  song_data: Song;
  user_id: string | null;
  is_template: boolean;
  visibility: "draft" | "unlisted" | "public";
};

// How many songs to fetch per page. The feed loads more as you scroll.
const PAGE_SIZE = 24;

const SONG_COLUMNS =
  "id, title, author, created_at, updated_at, song_data, user_id, is_template, visibility";

// Whether a song belongs to a view — mirrors the server-side filter, so a
// locally-mutated song (template toggled, etc.) leaves/stays in the list
// immediately without waiting for a refetch.
function matchesView(song: FeedSong, view: FeedView, user: User | null): boolean {
  if (view === "mine") return !!user && song.user_id === user.id;
  if (view === "templates") return song.is_template;
  return !song.is_template; // "all" excludes templates
}

// Strip characters that would break the PostgREST `.or()` filter string
// (comma separates terms, parens group them) or act as ilike wildcards, so the
// term is matched literally. Capped to keep the query bounded.
function sanitizeSearch(raw: string): string {
  return raw
    .replace(/[,()%*\\]/g, "")
    .trim()
    .slice(0, 60);
}

// Paginated songs feed for a view. Owns fetching, infinite scroll, and the
// local mutations that keep the list in sync after a card edits itself.
// Attach `sentinelRef` to an element near the list end for scroll auto-load;
// call `loadMore()` from a button as a fallback where the observer can't fire.
export type ClassOption = { grade: number | null; className: string | null };

// Distinct grade/class pairs present in the feed, for the filter dropdowns
// (computed in the DB so it stays cheap as the table grows).
export async function fetchClassOptions(): Promise<ClassOption[]> {
  const { data, error } = await supabase.rpc("song_class_options");
  if (error || !data) return [];
  return (data as { grade: number | null; class_name: string | null }[]).map((r) => ({
    grade: r.grade,
    className: r.class_name,
  }));
}

export type FeedFilters = {
  search?: string;
  grade?: number | null;
  className?: string | null;
};

export function useSongFeed(view: FeedView, user: User | null, filters: FeedFilters = {}) {
  const { search = "", grade = null, className = null } = filters;
  const [songs, setSongs] = useState<FeedSong[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  // Ref (not state) so overlapping triggers — the scroll observer and the
  // button firing together — can't start two fetches for the same page.
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // One page of the current view, newest-first. `count: "exact"` keeps the
  // total in sync as songs are added/removed.
  const fetchPage = useCallback(
    (from: number) => {
      let query = supabase.from("songs").select(SONG_COLUMNS, { count: "exact" });
      if (view === "mine" && user) {
        // "mine" shows the owner's songs at any visibility (drafts included).
        query = query.eq("user_id", user.id);
      } else {
        // Public feeds show only public songs — unlisted is reachable by link
        // only (RLS allows the read; this filter keeps it out of the feed),
        // and drafts aren't world-readable at all.
        query = query.eq("is_template", view === "templates").eq("visibility", "public");
      }
      const term = sanitizeSearch(search);
      if (term) query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%`);
      if (grade != null) query = query.eq("grade", grade);
      if (className) query = query.eq("class_name", className);
      return query.order("updated_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    },
    [view, user, search, grade, className]
  );

  // Initial load, and reset whenever the view (or sign-in state) changes.
  useEffect(() => {
    let active = true;
    async function loadFirstPage() {
      setLoading(true);
      setSongs([]);
      setHasMore(false);
      pageRef.current = 0;
      loadingMoreRef.current = false;
      const { data, count } = await fetchPage(0);
      if (!active) return;
      const rows = (data as FeedSong[]) ?? [];
      setSongs(rows);
      setTotal(count ?? rows.length);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    }
    loadFirstPage();
    return () => {
      active = false;
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const { data, count } = await fetchPage(nextPage * PAGE_SIZE);
      const rows = (data as FeedSong[]) ?? [];
      pageRef.current = nextPage;
      // De-dupe by id in case a song was inserted between page fetches.
      setSongs((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      if (count != null) setTotal(count);
      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore]);

  // Infinite scroll: pull the next page as the sentinel nears the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const removeSong = useCallback((id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const renameSong = useCallback((id: string, title: string) => {
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
  }, []);

  const setSongTemplate = useCallback((id: string, isTemplate: boolean) => {
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, is_template: isTemplate } : s)));
  }, []);

  return {
    songs: songs.filter((s) => matchesView(s, view, user)),
    total,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    sentinelRef,
    removeSong,
    renameSong,
    setSongTemplate,
  };
}
