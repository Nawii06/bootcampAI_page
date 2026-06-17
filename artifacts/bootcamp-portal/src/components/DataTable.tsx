import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

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
}

export function DataTable<T extends { id: string }>({ 
  data, 
  columns, 
  filterKey, 
  filterPlaceholder,
  onRowClick,
  actions 
}: DataTableProps<T>) {
  const [filterValue, setFilterValue] = useState("");

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
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow 
                  key={row.id} 
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
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
