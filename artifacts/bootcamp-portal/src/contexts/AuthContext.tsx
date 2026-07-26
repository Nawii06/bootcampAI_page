import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import type { Role, User } from "../types";

interface SessionUser {
  id: string;
  displayName: string;
  roles: string[];
  studentId?: string;
  departmentCode?: string;
  grade?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
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

function toPortalUser(session: SessionUser): User {
  return {
    id: session.studentId ?? session.id,
    accountId: session.id,
    name: session.displayName,
    role: portalRole(session.roles),
    roles: session.roles,
    dept: session.departmentCode,
    year: session.grade ? Number(session.grade) : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    customFetch<{ user: SessionUser }>("/api/v1/session", {
      responseType: "json",
      credentials: "include",
    })
      .then((session) => setUser(toPortalUser(session.user)))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      logout() {
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
