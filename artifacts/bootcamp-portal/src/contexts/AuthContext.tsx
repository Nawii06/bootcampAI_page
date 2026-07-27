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

// Total idle time before auto-logout (30 minutes)
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// Show warning this many ms before the timeout fires (5 minutes)
const WARN_BEFORE_MS = 5 * 60 * 1000;

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

  async function refreshSession() {
    try {
      const session = await contractFetch(SessionResponseSchema, "/api/v1/session", {
        credentials: "include",
      });
      const nextUser = toPortalUser(session.user);
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    }
  }

  useEffect(() => {
    refreshSession()
      .finally(() => setIsLoading(false));
  }, []);

  // ─── Inactivity timer ──────────────────────────────────────────────────────

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

  const resetIdleTimer = useCallback(() => {
    // Clear any pending timers
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    // Don't arm timers when there is no active session
    if (!userRef.current) return;

    setWarningVisible(false);

    // Schedule the warning WARN_BEFORE_MS before the logout
    warnTimerRef.current = setTimeout(() => {
      if (!userRef.current) return;
      setWarningSecondsLeft(Math.round(WARN_BEFORE_MS / 1000));
      setWarningVisible(true);
    }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);

    // Schedule the actual logout
    logoutTimerRef.current = setTimeout(() => {
      forceLogout();
    }, IDLE_TIMEOUT_MS);
  }, [forceLogout]);

  // Arm timers when the user logs in; disarm when they log out
  useEffect(() => {
    if (user) {
      resetIdleTimer();
    } else {
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      setWarningVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]); // only re-run when logged-in status flips

  // Reset the timer on user activity
  useEffect(() => {
    if (!user) return;

    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    let ticking = false;

    function onActivity() {
      if (ticking) return;
      ticking = true;
      // Throttle to once per second to avoid hammering
      setTimeout(() => {
        ticking = false;
        resetIdleTimer();
      }, 1000);
    }

    EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    return () => EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
  }, [user, resetIdleTimer]);

  // ─── Session-expiry warning handlers ──────────────────────────────────────

  async function handleExtendSession() {
    try {
      await customFetch("/api/v1/session/extend", {
        method: "POST",
        responseType: "json",
        credentials: "include",
      });
    } catch {
      // If extending fails the session has already expired; forceLogout will fire
    }
    setWarningVisible(false);
    resetIdleTimer();
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
    [isLoading, setLocation, user],
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
