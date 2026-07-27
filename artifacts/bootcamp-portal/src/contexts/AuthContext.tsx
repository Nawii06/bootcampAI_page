import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import { SessionResponseSchema, type SessionResponse } from "@workspace/api-zod";
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
