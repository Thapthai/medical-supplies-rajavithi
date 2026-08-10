"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, ChevronDown, ChevronRight } from "lucide-react";
import { cabinetDepartmentApi } from "@/lib/api";
import { toast } from "sonner";
import { formatUtcDateTime, toUtcYyyyMmDd } from "@/lib/formatThaiDateTime";
import TablePagination from "@/components/TablePagination";
import { cn } from "@/lib/utils";
import {
  buildCabinetStockGroups,
  type CabinetStockGroup,
  type CabinetStockRow,
} from "@/lib/cabinetDepartments/buildCabinetStockGroups";

interface CabinetDepartment {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
  department?: {
    ID: number;
    DepName?: string;
  };
  itemstock_count?: number;
  itemstock_dispensed_count?: number;
}

interface CabinetDetailsCardProps {
  selectedRow: CabinetDepartment;
  onClose: () => void;
}

const GROUPS_PER_PAGE = 10;
const FETCH_LIMIT = 5000;
const COLUMN_COUNT = 7;

function formatUtcDateOnly(value?: string | null): string {
  if (!value) return "-";
  const ymd = toUtcYyyyMmDd(String(value));
  if (!ymd || ymd === "-") return "-";
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("th-TH", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isInCabinet(stock: CabinetStockRow): boolean {
  return stock.IsStock === true || stock.IsStock === 1;
}

function GroupStatusBadge({ group }: { group: CabinetStockGroup }) {
  const allIn = group.dispensedCount === 0;
  const allOut = group.inCabinetCount === 0;
  if (allIn) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        อยู่ในตู้
      </span>
    );
  }
  if (allOut) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        ถูกเบิก
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      ในตู้ {group.inCabinetCount} / เบิก {group.dispensedCount}
    </span>
  );
}

function StockStatusBadge({ stock }: { stock: CabinetStockRow }) {
  if (isInCabinet(stock)) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        อยู่ในตู้
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      ถูกเบิก
    </span>
  );
}

function MobileGroupDetail({ group }: { group: CabinetStockGroup }) {
  return (
    <ul className="divide-y border-t bg-gray-50">
      {group.items.map((stock, idx) => (
        <li
          key={`${group.key}-m-${idx}-${stock.StockID ?? stock.RowID ?? ""}-${stock.RfidCode ?? ""}`}
          className="flex items-start gap-2 px-3 py-2 text-sm"
        >
          <span className="mt-0.5 w-5 shrink-0 tabular-nums text-muted-foreground">{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="font-medium tabular-nums text-slate-800">
              {(Number(stock.Qty) || 1).toLocaleString()}
              <span className="ml-1 text-xs font-normal text-muted-foreground">ชิ้น</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {stock.LastCabinetModify
                ? formatUtcDateTime(String(stock.LastCabinetModify))
                : "-"}
            </p>
          </div>
          <div className="mt-0.5 shrink-0">
            <StockStatusBadge stock={stock} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function CabinetDetailsCard({ selectedRow, onClose }: CabinetDetailsCardProps) {
  const [itemStocks, setItemStocks] = useState<CabinetStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const loadItemStocks = useCallback(async () => {
    try {
      setLoading(true);
      const aggregated: CabinetStockRow[] = [];
      let reportedTotal = 0;
      let page = 1;

      while (true) {
        const response = await cabinetDepartmentApi.getItemStocksByCabinet(
          selectedRow.cabinet_id,
          { page, limit: FETCH_LIMIT },
        );

        if (!response.success || !response.data) {
          toast.error("ไม่สามารถโหลดข้อมูล ItemStock ได้");
          setItemStocks([]);
          break;
        }

        const batch = Array.isArray(response.data) ? response.data : [];
        reportedTotal =
          typeof (response as { total?: number }).total === "number"
            ? ((response as { total?: number }).total as number)
            : aggregated.length + batch.length;
        aggregated.push(...batch);

        if (batch.length < FETCH_LIMIT || aggregated.length >= reportedTotal) break;
        page += 1;
        if (page > 100) break;
      }

      setItemStocks(aggregated);
      setCurrentPage(1);
      setExpandedKeys(new Set());
    } catch (error: unknown) {
      console.error("Error loading item stocks:", error);
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setItemStocks([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRow.cabinet_id]);

  useEffect(() => {
    void loadItemStocks();
  }, [loadItemStocks]);

  const groups = useMemo(() => buildCabinetStockGroups(itemStocks), [itemStocks]);
  const totalGroups = groups.length;
  const totalPages = Math.max(1, Math.ceil(totalGroups / GROUPS_PER_PAGE));
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * GROUPS_PER_PAGE;
    return groups.slice(start, start + GROUPS_PER_PAGE);
  }, [groups, currentPage]);
  const groupRowOffset = (currentPage - 1) * GROUPS_PER_PAGE;

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    setExpandedKeys(new Set());
  };

  return (
    <Card className="mt-4 sm:mt-6">
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <CardTitle className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2">
            <Package className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="text-base sm:text-lg break-words leading-snug">
              รายละเอียดตู้ {selectedRow.cabinet?.cabinet_name || "-"}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={onClose}>
            ✕
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-3 sm:px-6 sm:py-4">
        {/* Info — compact on mobile */}
        <div className="mb-4 grid grid-cols-1 gap-3 border-b pb-4 sm:mb-6 sm:grid-cols-2 sm:gap-4 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 sm:text-sm">รหัสตู้</label>
              <p className="text-base sm:text-lg">{selectedRow.cabinet?.cabinet_code || "-"}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 sm:text-sm">ชื่อตู้</label>
              <p className="text-base sm:text-lg break-words">
                {selectedRow.cabinet?.cabinet_name || "-"}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 sm:text-sm">แผนก</label>
              <p className="text-base sm:text-lg">{selectedRow.department?.DepName || "-"}</p>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 sm:text-sm">สถานะ</label>
              <div className="mt-1">
                <Badge variant={selectedRow.status === "ACTIVE" ? "default" : "secondary"}>
                  {selectedRow.status}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 sm:text-sm">หมายเหตุ</label>
              <p className="text-sm break-words whitespace-pre-wrap sm:text-base">
                {selectedRow.description || "-"}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500 sm:mb-2 sm:text-sm">
                จำนวนอุปกรณ์
              </label>
              <div className="inline-flex flex-wrap items-center gap-1">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-base font-bold text-slate-700 sm:text-lg">
                  {selectedRow.itemstock_dispensed_count ?? 0} / {selectedRow.itemstock_count ?? 0}
                </span>
                <span className="text-xs text-slate-500 sm:text-sm">(ถูกเบิก / ในตู้)</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-1 flex flex-wrap items-center gap-2 text-base font-semibold sm:mb-2 sm:text-lg">
            <Package className="h-4 w-4" />
            <span className="sm:hidden">
              {totalGroups.toLocaleString()} กลุ่ม · {itemStocks.length.toLocaleString()} รายการ
            </span>
            <span className="hidden sm:inline">
              รายการอุปกรณ์ในตู้ ({totalGroups.toLocaleString()} กลุ่ม ·{" "}
              {itemStocks.length.toLocaleString()} รายการ)
            </span>
          </h3>
          <p className="mb-3 hidden text-sm text-muted-foreground sm:block">
            จัดกลุ่มตามรหัสอุปกรณ์ + วันที่แก้ไข — กดลูกศรเพื่อดูรายการย่อย
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</span>
            </div>
          ) : groups.length > 0 ? (
            <>
              {/* Mobile list */}
              <div className="md:hidden divide-y rounded-md border bg-white">
                {paginatedGroups.map((group, index) => {
                  const isExpanded = expandedKeys.has(group.key);
                  const rowNum = groupRowOffset + index + 1;
                  return (
                    <div key={group.key} className={cn(isExpanded && "bg-slate-50/60")}>
                      <button
                        type="button"
                        onClick={() => toggleExpand(group.key)}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left touch-manipulation active:bg-slate-100"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "ย่อ" : "ขยาย"}
                      >
                        <span className="mt-0.5 shrink-0 text-slate-500">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                        <span className="mt-0.5 w-6 shrink-0 text-sm tabular-nums text-muted-foreground">
                          {rowNum}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium break-words leading-snug text-slate-800">
                            {group.itemname || "-"}
                          </p>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatUtcDateOnly(group.modifyTime || group.modifyDate)}
                            <span className="mx-1">·</span>
                            <GroupStatusBadge group={group} />
                          </div>
                        </div>
                        <div className="mt-0.5 shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-slate-900">
                            {group.totalQty.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {group.items.length} ชิ้น
                          </p>
                        </div>
                      </button>
                      {isExpanded && <MobileGroupDetail group={group} />}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12" />
                      <TableHead>ลำดับ</TableHead>
                      <TableHead>รหัสอุปกรณ์</TableHead>
                      <TableHead>ชื่ออุปกรณ์</TableHead>
                      <TableHead className="text-center">จำนวน</TableHead>
                      <TableHead>สถานะสต็อก</TableHead>
                      <TableHead>วันที่แก้ไข</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGroups.map((group, index) => {
                      const isExpanded = expandedKeys.has(group.key);
                      return (
                        <Fragment key={group.key}>
                          <TableRow
                            className={cn(
                              "transition-colors",
                              isExpanded ? "bg-slate-50/80" : "hover:bg-slate-50/80",
                            )}
                          >
                            <TableCell className="w-12">
                              <button
                                type="button"
                                onClick={() => toggleExpand(group.key)}
                                className="rounded p-1 hover:bg-slate-200"
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? "ย่อ" : "ขยาย"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-slate-600" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-600" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">
                              {groupRowOffset + index + 1}
                            </TableCell>
                            <TableCell>
                              <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                                {group.itemcode}
                              </code>
                            </TableCell>
                            <TableCell className="font-medium text-slate-800">
                              {group.itemname || "-"}
                            </TableCell>
                            <TableCell className="text-center font-semibold tabular-nums">
                              {group.totalQty.toLocaleString()}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">
                                ({group.items.length} ชิ้น)
                              </span>
                            </TableCell>
                            <TableCell>
                              <GroupStatusBadge group={group} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatUtcDateOnly(group.modifyTime || group.modifyDate)}
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                                <h4 className="mb-3 flex flex-wrap items-center gap-2 font-semibold text-gray-700">
                                  <Package className="h-4 w-4" />
                                  <span>รายการในกลุ่ม ({group.items.length} รายการ)</span>
                                  <span className="font-normal text-muted-foreground">
                                    รวม {group.totalQty.toLocaleString()}
                                  </span>
                                </h4>
                                <div className="overflow-x-auto rounded-lg border bg-white">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-12">ลำดับ</TableHead>
                                        <TableHead className="text-center">จำนวน</TableHead>
                                        <TableHead>สถานะ</TableHead>
                                        <TableHead>วันที่แก้ไข</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.items.map((stock, idx) => (
                                        <TableRow
                                          key={`${group.key}-${idx}-${stock.StockID ?? stock.RowID ?? ""}-${stock.RfidCode ?? ""}`}
                                        >
                                          <TableCell>{idx + 1}</TableCell>
                                          <TableCell className="text-center tabular-nums">
                                            {(Number(stock.Qty) || 1).toLocaleString()}
                                          </TableCell>
                                          <TableCell>
                                            <StockStatusBadge stock={stock} />
                                          </TableCell>
                                          <TableCell className="text-sm text-muted-foreground">
                                            {stock.LastCabinetModify
                                              ? formatUtcDateTime(String(stock.LastCabinetModify))
                                              : "-"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                loading={loading}
                variant="responsive"
                summary={
                  <>
                    หน้า {currentPage} จาก {totalPages}
                    <span className="hidden sm:inline">
                      {" "}
                      ({totalGroups} กลุ่ม · {itemStocks.length} รายการ)
                    </span>
                  </>
                }
              />
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">ไม่พบอุปกรณ์ในตู้นี้</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
