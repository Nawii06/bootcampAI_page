import { Badge } from "@/components/ui/badge";
import { Role } from "../types";

const roleConfig: Record<Role, { label: string; className: string }> = {
  public: { label: "일반", className: "bg-gray-100 text-gray-800" },
  student: { label: "학생", className: "bg-blue-100 text-blue-800 border-blue-200" },
  partner: { label: "기업/기관", className: "bg-purple-100 text-purple-800 border-purple-200" },
  admin: { label: "관리자", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  superAdmin: { label: "전체관리자", className: "bg-gray-800 text-white" }
};

export function RoleBadge({ role }: { role: Role }) {
  const config = roleConfig[role] || roleConfig.public;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
