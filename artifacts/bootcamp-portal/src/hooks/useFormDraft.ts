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
 * Optional `onRestored` callback fires when a draft is actually found AND
 * differs from the initial state (i.e., contains meaningful user input).
 * Receives `clearDraft` so the caller can offer a "reset" action:
 *
 *   useFormDraft("key", state, restore, (clear) => {
 *     toast({
 *       title: "이전에 작성 중이던 내용을 불러왔습니다",
 *       action: <ToastAction onClick={() => { clear(); resetForm(); }}>초기화</ToastAction>,
 *     });
 *   });
 *
 * The hook:
 *  1. On mount: reads sessionStorage[key]; if a draft exists AND differs from
 *     the initial state, calls `restore` then `onRestored`. Removes the entry
 *     so it is only replayed once.
 *  2. Whenever `state` changes: if state has changed from its initial value,
 *     debounces a write to sessionStorage[key]. If state has returned to the
 *     initial value (e.g. after a reset), removes any stale entry.
 *  3. Returns `clearDraft` to remove the draft (call on successful submit).
 *
 * These two rules together prevent false restore notifications:
 *  - A pristine/empty form is never saved, so there is nothing to restore.
 *  - After clearDraft() + state reset the next save cycle cleans up storage
 *    rather than writing empty defaults back.
 */

import { useEffect, useRef, useCallback } from "react";

const DEBOUNCE_MS = 400;

export function useFormDraft<T extends object>(
  key: string,
  state: T,
  restore: (draft: T) => void,
  onRestored?: (clearDraft: () => void) => void,
): { clearDraft: () => void } {
  const storageKey = `form-draft:${key}`;
  const restoredRef = useRef(false);

  // Capture the form's initial state once (never updated after mount).
  // Used to gate saves and restores to meaningful/non-default content.
  const initialStateRef = useRef(state);

  const clearDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Restore once on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as T;

      // Only restore if the draft carries meaningful content — i.e., it is
      // not identical to the initial (blank) state. This prevents false
      // "restored draft" notifications when the storage key exists but only
      // holds default/empty values from a previous pristine visit.
      if (JSON.stringify(draft) === JSON.stringify(initialStateRef.current)) {
        sessionStorage.removeItem(storageKey);
        return;
      }

      restore(draft);
      // Remove immediately so back-nav or refresh doesn't re-apply
      sessionStorage.removeItem(storageKey);
      onRestored?.(clearDraft);
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
      // Only persist when state has changed from its initial value.
      // If the form is blank or has been reset, remove any stale entry instead
      // of writing empty defaults — this prevents the next visit from seeing a
      // "draft" that was just the initial/reset state.
      if (
        JSON.stringify(stateRef.current) ===
        JSON.stringify(initialStateRef.current)
      ) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
        return;
      }
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

  return { clearDraft };
}
