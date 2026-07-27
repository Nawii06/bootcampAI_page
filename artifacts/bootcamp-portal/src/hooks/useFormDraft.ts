/**
 * useFormDraft — sessionStorage-backed draft persistence for forms.
 *
 * Usage:
 *   const { clearDraft } = useFormDraft("my-form-key", state, (draft) => {
 *     setState1(draft.field1 ?? "");
 *     setState2(draft.field2 ?? "");
 *   });
 *   // call clearDraft() on successful submission
 *
 * The hook:
 *  1. On mount: reads sessionStorage[key] and calls `restore` with the parsed
 *     object if a draft exists, then removes it so it is only replayed once.
 *  2. Whenever `state` changes: debounces a write to sessionStorage[key].
 *  3. Returns `clearDraft` to remove the draft (call on successful submit).
 */

import { useEffect, useRef, useCallback } from "react";

const DEBOUNCE_MS = 400;

export function useFormDraft<T extends object>(
  key: string,
  state: T,
  restore: (draft: T) => void,
): { clearDraft: () => void } {
  const storageKey = `form-draft:${key}`;
  const restoredRef = useRef(false);

  // Restore once on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as T;
      restore(draft);
      // Remove immediately so a page refresh or back-nav doesn't re-apply
      sessionStorage.removeItem(storageKey);
    } catch {
      // Malformed JSON or SecurityError — silently ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save on every state change
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(stateRef.current));
      } catch {
        // Quota exceeded or private-mode restriction — silently ignore
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, storageKey]);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { clearDraft };
}
