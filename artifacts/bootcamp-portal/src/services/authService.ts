import { User } from "../types";

const mockUsers: Record<string, User> = {
  student: { id: "mock-student-001", name: "홍길동 (가상)", role: "student", dept: "컴퓨터공학과", year: 3 },
  partner: { id: "mock-partner-001", name: "테크모빌(주) 담당자 (가상)", role: "partner", company: "테크모빌(주)" },
  admin: { id: "mock-admin-001", name: "김관리 (가상)", role: "admin", dept: "AI부트캠프 사업단" },
  superAdmin: { id: "mock-superadmin-001", name: "최고관리자 (가상)", role: "superAdmin" }
};

export const authService = {
  loginAs(role: "student" | "partner" | "admin" | "superAdmin" | "public") {
    if (role === "public") {
      localStorage.removeItem("currentUser");
      return null;
    }
    const user = mockUsers[role];
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
    }
    return user;
  },

  logout() {
    localStorage.removeItem("currentUser");
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        return JSON.parse(userStr) as User;
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  hasPermission(user: User | null, requiredRole: string[]): boolean {
    if (!user) return requiredRole.includes("public");
    if (user.role === "superAdmin") return true;
    return requiredRole.includes(user.role);
  }
};
