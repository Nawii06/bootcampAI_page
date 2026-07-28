import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
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
import { LoadingCard } from "@/components/LoadingCard";

const SHARE_TOKEN_ACTIONS = [
  "GENERATE_SHARE_TOKEN",
  "REVOKE_SHARE_TOKEN",
] as const;

const SHARE_TOKEN_ACTION_LABELS: Record<string, string> = {
  GENERATE_SHARE_TOKEN: "링크 발급",
  REVOKE_SHARE_TOKEN: "링크 회수",
};

const SHARE_TOKEN_PAGE_SIZE = 100;

function shareTokenQueryString(recordId: string, page: number) {
  const params = new URLSearchParams({
    resourceType: "EXPERIENTIAL_RECORD",
    action: SHARE_TOKEN_ACTIONS.join(","),
    page: String(page),
    pageSize: String(SHARE_TOKEN_PAGE_SIZE),
  });
  if (recordId) params.set("resourceId", recordId);
  return params.toString();
}

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

  const [shareRecordIdInput, setShareRecordIdInput] = useState("");
  const [shareRecordId, setShareRecordId] = useState("");

  const shareTokenLogs = useInfiniteQuery({
    queryKey: ["audit-logs", "share-token", shareRecordId],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await contractFetch(
        AuditLogListResponseSchema,
        `/api/v1/audit-logs?${shareTokenQueryString(shareRecordId, pageParam)}`,
        { credentials: "include" },
      );
      return {
        page: pageParam,
        items: response.data,
        total: response.meta.total,
        hasMore:
          response.meta.page * response.meta.pageSize < response.meta.total,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });

  const shareTokenRows = useMemo(() => {
    const pages = shareTokenLogs.data?.pages ?? [];
    const seen = new Set<string>();
    const merged: AuditLogItem[] = [];
    for (const page of pages) {
      for (const item of page.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
    }
    merged.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    return merged;
  }, [shareTokenLogs.data]);

  const shareTokenTotal = shareTokenLogs.data?.pages[0]?.total ?? 0;

  const shareTokenColumns: ColumnDef<AuditLogItem>[] = [
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
    {
      key: "action",
      header: "작업",
      cell: (row) => SHARE_TOKEN_ACTION_LABELS[row.action] ?? row.action,
    },
    {
      key: "resourceId",
      header: "포트폴리오 ID",
      cell: (row) => row.resourceId ?? "-",
    },
    { key: "requestId", header: "요청 ID" },
  ];

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
      {logs.isLoading ? (
        <LoadingCard message="감사로그를 불러오는 중입니다." />
      ) : (
        <>
          <DataTable data={logs.data?.data ?? []} columns={columns} />
          <p className="mt-3 text-xs text-muted-foreground">
            총 {logs.data?.meta.total ?? 0}건 · 개인정보성 필드와 접속 IP는 서버에서 마스킹됩니다.
          </p>
        </>
      )}

      <div className="mt-10">
        <SectionHeader
          title="포트폴리오 공유 링크 이력"
          description="공개 포트폴리오 공유 링크를 누가 언제 발급하거나 회수했는지 확인합니다."
        />
        <div className="mb-5 flex flex-col gap-3 rounded-md border p-4 md:flex-row">
          <Input
            className="flex-1"
            placeholder="포트폴리오 ID로 검색(선택)"
            value={shareRecordIdInput}
            onChange={(event) => setShareRecordIdInput(event.target.value)}
          />
          <Button onClick={() => setShareRecordId(shareRecordIdInput.trim())}>
            조회
          </Button>
        </div>
        {shareTokenLogs.isError && (
          <ErrorCard
            message="공유 링크 이력을 조회하지 못했습니다."
            onRetry={() => shareTokenLogs.refetch()}
            isRetrying={shareTokenLogs.isFetching}
          />
        )}
        {shareTokenLogs.isSuccess && shareTokenRows.length === 0 && (
          <p className="mb-4 text-sm text-muted-foreground">
            공유 링크 발급·회수 이력이 없습니다.
          </p>
        )}
        {shareTokenLogs.isLoading ? (
          <LoadingCard message="공유 링크 이력을 불러오는 중입니다." />
        ) : (
          <>
            <DataTable data={shareTokenRows} columns={shareTokenColumns} />
            {shareTokenLogs.hasNextPage && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  disabled={shareTokenLogs.isFetchingNextPage}
                  onClick={() => shareTokenLogs.fetchNextPage()}
                >
                  {shareTokenLogs.isFetchingNextPage
                    ? "불러오는 중..."
                    : "이력 더 보기"}
                </Button>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              총 {shareTokenTotal}건 중 {shareTokenRows.length}건 표시 ·
              발급(GENERATE_SHARE_TOKEN)과 회수(REVOKE_SHARE_TOKEN) 기록을 최신순으로
              표시합니다.
            </p>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
