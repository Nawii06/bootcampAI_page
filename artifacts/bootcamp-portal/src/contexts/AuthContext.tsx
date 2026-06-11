import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { authService } from "../services/authService";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  loginAs: (role: "student" | "partner" | "admin" | "superAdmin" | "public") => void;
  logout: () => void;
  hasPermission: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setUser(authService.getCurrentUser());
  }, []);

  const loginAs = (role: "student" | "partner" | "admin" | "superAdmin" | "public") => {
    const newUser = authService.loginAs(role);
    setUser(newUser);
    if (newUser) {
      setLocation(`/${newUser.role}/dashboard`);
    } else {
      setLocation("/public/home");
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setLocation("/login");
  };

  const hasPermission = (roles: string[]) => {
    return authService.hasPermission(user, roles);
  };

  return (
    <AuthContext.Provider value={{ user, loginAs, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
