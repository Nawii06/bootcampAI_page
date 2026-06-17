import { Badge } from "@/components/ui/badge";
import type { EvidenceStatus } from "../types";

const labels: Record<EvidenceStatus, string> = {
  none: "미등록",
  uploaded: "등록",
  reviewing: "검토중",
  revision_requested: "보완요청",
  approved: "승인"
};

export function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  const className = status === "approved"
    ? "bg-green-700 text-white"
    : status === "revision_requested"
      ? "bg-destructive text-destructive-foreground"
      : status === "reviewing"
        ? "bg-yellow-600 text-white"
        : "";
  return <Badge variant={className ? "default" : "outline"} className={className}>{labels[status]}</Badge>;
}
