"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pe-news:read-article-ids";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function useReadArticles() {
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    // localStorage is only available client-side; load post-mount to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadIds(loadReadIds());
  }, []);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { readIds, markAsRead };
}
