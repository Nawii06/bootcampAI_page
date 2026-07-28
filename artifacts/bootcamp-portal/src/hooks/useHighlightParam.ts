import { useEffect, useState } from "react";
import { useSearch } from "wouter";

/**
 * Reads the ?highlight= deep-link param once on mount (e.g. from a
 * notification or log link) and strips it from the URL so a refresh or
 * shared link doesn't re-highlight. Pass the returned id to
 * DataTable's `highlightId`.
 */
export function useHighlightParam(): string | undefined {
  const search = useSearch();
  const [highlightId] = useState(
    () => new URLSearchParams(search).get("highlight") ?? undefined,
  );

  useEffect(() => {
    if (!highlightId) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("highlight")) return;
    params.delete("highlight");
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [highlightId]);

  return highlightId;
}
