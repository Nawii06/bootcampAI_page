import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  AuditLogListResponseSchema,
  type AuditLogItem,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorCard } from "@/components/ErrorCard";

function dateInput(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function asRange(startDate: string, endDate: string) {
  return {
    startAt: new Date(`${startDate}T00:00:00`).toISOString(),
    endAt: new Date(`${endDate}T23:59:59.999`).toISOString(),
  };
}

export default function AdminAuditLogs() {
  const [startDate, setStartDate] = useState(dateInput(7));
  const [endDate, setEndDate] = useState(dateInput(0));
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [filters, setFilters] = useState(() => ({
    ...asRange(dateInput(7), dateInput(0)),
    action: "",
    resourceType: "",
  }));

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      startAt: filters.startAt,
      endAt: filters.endAt,
      page: "1",
      pageSize: "100",
    });
    if (filters.action) params.set("action", filters.action);
    if (filters.resourceType) params.set("resourceType", filters.resourceType);
    return params.toString();
  }, [filters]);

  const logs = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () =>
      contractFetch(
        AuditLogListResponseSchema,
        `/api/v1/audit-logs?${queryString}`,
        { credentials: "include" },
      ),
  });

  const exportLogs = useMutation({
    mutationFn: () =>
      customFetch<Blob>("/api/v1/audit-logs/export", {
        method: "POST",
        responseType: "blob",
        credentials: "include",
        body: JSON.stringify({
          purpose,
          filters: {
            startAt: filters.startAt,
            endAt: filters.endAt,
            action: filters.action || undefined,
            resourceType: filters.resourceType || undefined,
          },
        }),
      }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });

  const columns: ColumnDef<AuditLogItem>[] = [
    {
      key: "occurredAt",
      header: "발생일시",
      cell: (row) => new Date(row.occurredAt).toLocaleString("ko-KR"),
    },
    {
      key: "actorDisplayName",
      header: "행위자",
      cell: (row) => row.actorDisplayName ?? "SYSTEM",
    },
    { key: "action", header: "작업" },
    { key: "resourceType", header: "리소스" },
    {
      key: "resourceId",
      header: "리소스 ID",
      cell: (row) => row.resourceId ?? "-",
    },
    { key: "requestId", header: "요청 ID" },
    {
      key: "ipAddress",
      header: "접속망",
      cell: (row) => row.ipAddress ?? "-",
    },
  ];

  return (
    <PortalLayout>
      <SectionHeader
        title="감사로그"
        description="서버에서 마스킹된 감사기록을 조회하고 승인 목적을 남겨 CSV로 내보냅니다."
      />
      <div className="mb-5 grid gap-3 rounded-md border p-4 md:grid-cols-5">
        <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        <Input placeholder="작업(예: UPDATE)" value={action} onChange={(event) => setAction(event.target.value)} />
        <Input placeholder="리소스(예: STORED_FILE)" value={resourceType} onChange={(event) => setResourceType(event.target.value)} />
        <Button onClick={() => setFilters({ ...asRange(startDate, endDate), action: action.trim(), resourceType: resourceType.trim() })}>
          조회
        </Button>
      </div>
      <div className="mb-5 flex flex-col gap-3 rounded-md border p-4 md:flex-row">
        <Input
          className="flex-1"
          placeholder="내보내기 목적(필수, 5자 이상)"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
        />
        <Button
          variant="outline"
          disabled={purpose.trim().length < 5 || exportLogs.isPending}
          onClick={() => exportLogs.mutate()}
        >
          CSV 내보내기
        </Button>
      </div>
            {logs.isError && (
        <ErrorCard
          message="감사로그를 조회하지 못했습니다."
          onRetry={() => logs.refetch()}
          isRetrying={logs.isFetching}
        />
      )}
      {exportLogs.isError && <p className="mb-4 text-destructive">감사로그를 내보내지 못했습니다.</p>}
      <DataTable data={logs.data?.data ?? []} columns={columns} />
      <p className="mt-3 text-xs text-muted-foreground">
        총 {logs.data?.meta.total ?? 0}건 · 개인정보성 필드와 접속 IP는 서버에서 마스킹됩니다.
      </p>
    </PortalLayout>
  );
}
