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

      const schedule = computeSessionSchedule(expiresAt);

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
          // Recompute remaining seconds at the exact moment the warning fires
          const remaining = Math.round(
            (new Date(expiresAt).getTime() - Date.now()) / 1000,
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
    try {
      const session = await contractFetch(SessionResponseSchema, "/api/v1/session", {
        credentials: "include",
      });
      const nextUser = toPortalUser(session.user);
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
