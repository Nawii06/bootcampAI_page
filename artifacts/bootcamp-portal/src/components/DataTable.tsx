import React, { useEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  cell?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  filterKey?: keyof T;
  filterPlaceholder?: string;
  onRowClick?: (item: T) => void;
  actions?: React.ReactNode;
  /** Show skeleton rows instead of data while a query is loading. */
  loading?: boolean;
  /** Number of skeleton rows to display. Defaults to 5. */
  loadingRows?: number;
  /** Row id to scroll to and visually highlight on load (e.g. from a ?highlight= deep link). */
  highlightId?: string;
  /** Toast message shown when highlightId matches no row at all. */
  highlightMissingMessage?: string;
}

export function DataTable<T extends { id: string }>({ 
  data, 
  columns, 
  filterKey, 
  filterPlaceholder,
  onRowClick,
  actions,
  loading = false,
  loadingRows = 5,
  highlightId,
  highlightMissingMessage = "해당 항목을 찾을 수 없습니다.",
}: DataTableProps<T>) {
  const [filterValue, setFilterValue] = useState("");
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);
  const hasScrolledRef = useRef(false);
  const hasNotifiedMissingRef = useRef(false);
  // Local copy of the highlight so we can fade it out after the admin has seen it.
  const [activeHighlightId, setActiveHighlightId] = useState<string | undefined>(highlightId);

  useEffect(() => {
    setActiveHighlightId(highlightId);
  }, [highlightId]);

  // Scroll the highlighted row into view once, after data has loaded,
  // then fade the highlight out after a few seconds.
  useEffect(() => {
    if (loading || !highlightId || hasScrolledRef.current) return undefined;
    const el = highlightedRowRef.current;
    if (!el) {
      // The target row isn't rendered. Either the current filter hides it
      // (clear the filter so the highlight can proceed) or it doesn't exist
      // in the data at all (tell the admin instead of silently doing nothing).
      if (hasNotifiedMissingRef.current) return undefined;
      const existsInData = data.some((row) => row.id === highlightId);
      if (existsInData) {
        setFilterValue("");
        return undefined;
      }
      hasNotifiedMissingRef.current = true;
      setActiveHighlightId(undefined);
      toast({ description: highlightMissingMessage, variant: "destructive" });
      return undefined;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    hasScrolledRef.current = true;
    const timer = window.setTimeout(() => setActiveHighlightId(undefined), 3000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, highlightId, data, filterValue]);

  const filteredData = filterKey && filterValue
    ? data.filter(item => {
        const val = item[filterKey];
        return String(val).toLowerCase().includes(filterValue.toLowerCase());
      })
    : data;

  return (
    <div className="space-y-4">
      {(filterKey || actions) && (
        <div className="flex justify-between items-center">
          {filterKey && (
            <div className="max-w-sm w-full">
              <Input
                placeholder={filterPlaceholder || "검색..."}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                disabled={loading}
              />
            </div>
          )}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: loadingRows }).map((_, rowIdx) => (
                <TableRow key={rowIdx}>
                  {columns.map((col, colIdx) => (
                    <TableCell key={col.key}>
                      {/* Vary widths so the skeleton looks natural */}
                      <Skeleton
                        className="h-4"
                        style={{ width: `${60 + ((rowIdx * columns.length + colIdx) % 4) * 10}%` }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow 
                  key={row.id} 
                  ref={row.id === highlightId ? highlightedRowRef : undefined}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={[
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : "",
                    "transition-colors duration-1000",
                    row.id === activeHighlightId
                      ? "bg-primary/10 ring-1 ring-inset ring-primary/40"
                      : "",
                  ].join(" ").trim()}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.cell ? col.cell(row) : (row as any)[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
