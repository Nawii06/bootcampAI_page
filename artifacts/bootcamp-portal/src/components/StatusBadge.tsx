import { Badge } from "@/components/ui/badge";
import { ApplicationStatus } from "../types";

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  submitted: { label: "접수", className: "bg-gray-100 text-gray-800 border-gray-200" },
  reviewing: { label: "검토중", className: "bg-blue-100 text-blue-800 border-blue-200" },
  supplement: { label: "보완요청", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  selected: { label: "선발", className: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "미선발", className: "bg-red-100 text-red-800 border-red-200" },
  waitlisted: { label: "대기", className: "bg-orange-100 text-orange-800 border-orange-200" }
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status];
  if (!config) return <Badge>{status}</Badge>;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
