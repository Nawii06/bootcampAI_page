import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { contractFetch, customFetch, setUnauthorizedHandler } from "@workspace/api-client-react";
import { SessionResponseSchema, type SessionResponse } from "@workspace/api-zod";
import { toast } from "@/hooks/use-toast";
import { SessionExpiryWarning } from "@/components/SessionExpiryWarning";
import { computeSessionSchedule, WARN_BEFORE_MS } from "@/lib/session-schedule";
import type { Role, User } from "../types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  refreshSession: () => Promise<User | null>;
  loginWithFakeIdentity: (identityId: string) => Promise<User>;
  logout: () => Promise<void>;
  hasPermission: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function portalRole(roles: string[]): Role {
  if (roles.includes("SYSTEM_ADMIN")) return "superAdmin";
  if (roles.includes("STUDENT")) return "student";
  if (
    roles.includes("COMPANY_MANAGER") ||
    roles.includes("COMPANY_APPLICANT")
  ) {
    return "partner";
  }
  return "admin";
}

function toPortalUser(session: SessionResponse["user"]): User {
  return {
    id: session.studentId ?? session.id,
    accountId: session.id,
    name: session.displayName,
    role: portalRole(session.roles),
    roles: session.roles,
    dept: session.departmentCode,
    year: session.grade ? Number(session.grade) : undefined,
    company: session.companyId,
    defaultRoute: session.defaultRoute,
    isFakeSession: session.isFakeSession,
    fakeDataSetId: session.fakeDataSetId,
  };
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Session-expiry warning state
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState(
    Math.round(WARN_BEFORE_MS / 1000),
  );

  // Refs so timer callbacks always see the latest values without re-registering
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  /**
   * Latest server-provided expiry timestamp.  Written before `setUser` so the
   * arm-on-login effect can read it once the state commit is visible.
   */
  const expiresAtRef = useRef<string | null>(null);
  /**
   * Estimated offset between server clock and browser clock (ms).
   * offset = serverNow − clientNow (captured just before the request).
   * Positive → server is ahead of the browser.
   * Applied as `Date.now() + clockOffsetMsRef.current` when computing timer
   * durations, so all timers are anchored to the server's clock.
   * Ignored (stays 0) when clocks are within ~1 s of each other.
   */
  const clockOffsetMsRef = useRef<number>(0);
  /**
   * Guards the clock-skew toast so it fires at most once per page load.
   * Reset to false on explicit logout so a fresh login can re-trigger it.
   */
  const skewWarnedRef = useRef<boolean>(false);
  /**
   * Timestamp (Date.now()) set at the *start* of each refreshSession() call.
   * Used to debounce rapid `visibilitychange` events (e.g. fast alt-tab)
   * so at most one refresh fires per VISIBILITY_DEBOUNCE_MS window.
   * Stamped at request-start (not completion) so bursts during an in-flight
   * request are suppressed immediately.
   */
  const lastRefreshAtRef = useRef<number>(0);
  /**
   * True while a refreshSession() call is in flight.
   * Prevents concurrent visibility events from issuing a second request
   * before the first one completes, even within the debounce window.
   */
  const isRefreshingRef = useRef<boolean>(false);

  /** Minimum gap (ms) between visibility-triggered refreshes. */
  const VISIBILITY_DEBOUNCE_MS = 2_000;

  const forceLogout = useCallback(() => {
    if (!userRef.current) return; // already logged out
    const currentPath =
      window.location.pathname + window.location.search + window.location.hash;
    setUser(null);
    setWarningVisible(false);
    toast({
      title: "세션이 만료되었습니다",
      description: "다시 로그인해 주세요.",
      variant: "destructive",
    });
    setTimeout(() => {
      setLocation(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }, 1500);
  }, [setLocation]);

  // ─── Server-expiry timer ───────────────────────────────────────────────────

  /**
   * Schedule the warning dialog and auto-logout based on the ISO 8601
   * `expiresAt` value returned by the server.  May be called either from a
   * useEffect (after user state commits) or directly when the user is already
   * authenticated (e.g. session extend).
   */
  const scheduleFromExpiry = useCallback(
    (expiresAt: string) => {
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      setWarningVisible(false);

      // Apply the server/browser clock offset so all timers are anchored to
      // the server's clock even when the browser clock is skewed.
      const adjustedNow = Date.now() + clockOffsetMsRef.current;
      const schedule = computeSessionSchedule(expiresAt, adjustedNow);

      if (!schedule) {
        forceLogout();
        return;
      }

      if (schedule.showImmediately) {
        setWarningSecondsLeft(schedule.initialSecondsLeft);
        setWarningVisible(true);
      } else {
        warnTimerRef.current = setTimeout(() => {
          if (!userRef.current) return;
          // Recompute remaining seconds at the exact moment the warning fires,
          // applying the same clock offset for consistency.
          const remaining = Math.round(
            (new Date(expiresAt).getTime() - (Date.now() + clockOffsetMsRef.current)) / 1000,
          );
          setWarningSecondsLeft(Math.max(0, remaining));
          setWarningVisible(true);
        }, schedule.msUntilWarn);
      }

      logoutTimerRef.current = setTimeout(() => {
        forceLogout();
      }, schedule.msUntilExpiry);
    },
    [forceLogout],
  );

  const refreshSession = useCallback(async () => {
    // Stamp at request start so the debounce window begins immediately,
    // suppressing bursts that arrive while this request is still in flight.
    lastRefreshAtRef.current = Date.now();
    isRefreshingRef.current = true;
    try {
      // Capture client time BEFORE the request so that serverNow (captured by
      // the server just before it sends the response) is comparable to it.
      // offset = serverNow − clientNowBeforeRequest ≈ server_clock − browser_clock
      const clientNowBeforeRequest = Date.now();
      const session = await contractFetch(SessionResponseSchema, "/api/v1/session", {
        credentials: "include",
      });
      const nextUser = toPortalUser(session.user);

      // Calibrate the clock offset from the server's timestamp.
      if (session.serverNow) {
        const offset =
          new Date(session.serverNow).getTime() - clientNowBeforeRequest;
        clockOffsetMsRef.current = offset;

        // Warn once per page load when skew exceeds 1 minute so users
        // understand why session timers may feel off.
        const SKEW_WARN_THRESHOLD_MS = 60_000;
        if (!skewWarnedRef.current && Math.abs(offset) > SKEW_WARN_THRESHOLD_MS) {
          skewWarnedRef.current = true;
          const minutes = Math.round(Math.abs(offset) / 60_000);
          // offset > 0 → server is ahead → client clock is slow/late
          // offset < 0 → server is behind → client clock is fast/early
          const direction = offset > 0 ? "늦습니다" : "앞서 있습니다";
          toast({
            title: "기기 시계 동기화 문제",
            description: `귀하의 기기 시계가 서버 시계보다 약 ${minutes}분 ${direction}. 기기 시계를 동기화하면 세션 오류를 방지할 수 있습니다.`,
            variant: "destructive",
            duration: 12_000,
          });
        }
      }

      // Store expiresAt BEFORE setUser so it is ready when the arm-on-login
      // effect fires after React commits the new user state.
      if (session.expiresAt) {
        expiresAtRef.current = session.expiresAt;
      }
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  // ─── Arm / disarm timers in response to committed user state ──────────────
  // This effect runs after React has flushed the setUser() call, so userRef
  // is guaranteed to reflect the new value by the time scheduleFromExpiry runs.
  useEffect(() => {
    if (user && expiresAtRef.current) {
      scheduleFromExpiry(expiresAtRef.current);
    } else if (!user) {
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      setWarningVisible(false);
    }
  }, [user, scheduleFromExpiry]);

  // ─── Session-expiry warning handlers ──────────────────────────────────────

  async function handleExtendSession() {
    setWarningVisible(false);
    try {
      const data = await customFetch("/api/v1/session/extend", {
        method: "POST",
        responseType: "json",
        credentials: "include",
      }) as { ok: boolean; expiresAt?: string };
      // Use the fresh expiresAt from the extend response if available,
      // otherwise fall back to a full session refresh.
      if (data?.expiresAt) {
        expiresAtRef.current = data.expiresAt;
        scheduleFromExpiry(data.expiresAt);
      } else {
        await refreshSession();
      }
    } catch {
      // If extending fails the session has already expired; forceLogout will fire
    }
  }

  function handleDismissWarning() {
    // Let the existing timers run; just hide the dialog
    setWarningVisible(false);
  }

  // ─── 401 redirect handler ─────────────────────────────────────────────────

  // Redirect to /login with ?redirect= when any API call receives 401,
  // so the user returns to the exact page they were on after re-logging in.
  useEffect(() => {
    setUnauthorizedHandler((url: string) => {
      // The session-check endpoint returns 401 when no session exists — that
      // is handled by refreshSession() itself, so skip it here to avoid a
      // redirect loop on initial load.
      if (url.includes("/api/v1/session")) return;

      const currentPath =
        window.location.pathname + window.location.search + window.location.hash;

      // Don't redirect if already on the login page.
      if (currentPath.startsWith("/login")) return;

      setUser(null);
      toast({
        title: "세션이 만료되었습니다",
        description: "다시 로그인해 주세요.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }, 1500);
    });

    return () => setUnauthorizedHandler(null);
  }, [setLocation]);

  // ─── BFCache restore ────────────────────────────────────────────────────
  // When the browser restores the page from the back-forward cache,
  // setTimeout timers resume from where they were paused, but the cached
  // `expiresAt` value may already be in the past — causing an immediate
  // phantom logout even though the server session is still valid.
  // Re-fetching the session on BFCache restore re-anchors all timers to the
  // fresh server-side expiry via the existing arm/disarm effect.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        refreshSession();
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [refreshSession]);

  // ─── Device-wake / tab-restore recovery ─────────────────────────────────
  // When a laptop lid closes (or the OS suspends the process), the page stays
  // in memory without a BFCache event.  Browser timer throttling can pause or
  // slow setTimeout callbacks.  On wake, the logout timer may fire immediately
  // even though the server session is still valid — a phantom logout.
  //
  // Listening to `visibilitychange` covers this gap: whenever the tab becomes
  // visible again after being hidden, we re-fetch the session so all timers
  // are rescheduled from the current server-side expiry.  If the session has
  // actually expired the fetch returns null and the existing arm/disarm effect
  // clears the timers cleanly — no extra handling needed here.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible" || !userRef.current) return;
      // Skip if a refresh is already in flight — concurrent visibility events
      // (fast alt-tab, extension triggers) must not issue a second request.
      if (isRefreshingRef.current) return;
      // Skip if a refresh started within the debounce window — bursts of
      // hide/show events that land after the previous request completed are
      // suppressed here.
      if (Date.now() - lastRefreshAtRef.current < VISIBILITY_DEBOUNCE_MS) return;
      refreshSession();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refreshSession]);

  async function loginWithFakeIdentity(identityId: string) {
    await customFetch("/api/v1/fake-auth/login", {
      method: "POST",
      body: JSON.stringify({ identityId }),
      headers: { "Content-Type": "application/json" },
      responseType: "json",
      credentials: "include",
    });
    const nextUser = await refreshSession();
    if (!nextUser) throw new Error("가상 세션을 확인하지 못했습니다.");
    return nextUser;
  }

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      refreshSession,
      loginWithFakeIdentity,
      async logout() {
        await customFetch("/api/v1/session/logout", {
          method: "POST",
          responseType: "text",
          credentials: "include",
        }).catch(() => undefined);
        setUser(null);
        setLocation("/login");
      },
      hasPermission(requiredRoles) {
        if (!user) return requiredRoles.includes("public");
        if (user.roles?.includes("SYSTEM_ADMIN")) return true;
        return requiredRoles.some(
          (role) => role === user.role || user.roles?.includes(role),
        );
      },
    }),
    [isLoading, refreshSession, setLocation, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {warningVisible && (
        <SessionExpiryWarning
          secondsRemaining={warningSecondsLeft}
          onExtend={handleExtendSession}
          onDismiss={handleDismissWarning}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
