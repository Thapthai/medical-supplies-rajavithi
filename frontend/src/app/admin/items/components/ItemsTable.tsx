"use client";

import { useState, Fragment, useMemo } from "react";
import { Package, RefreshCw, Gauge, ChevronDown, ChevronRight, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Item } from "@/types/item";
import ItemNameWithUnit from "@/components/ItemNameWithUnit";
import { formatUtcDateTime, parseApiDateTime } from "@/lib/formatThaiDateTime";
import { getCabinetQty, toStockLimitNumber } from "@/lib/itemUnitDisplay";

/** มือถือ: แสดงเฉพาะวันที่หมดอายุ (ไม่โชว์เวลา) */
function formatUtcDateOnly(value?: string | null): string {
  if (value == null || value === "") return "-";
  const d = parseApiDateTime(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("th-TH", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ItemsTableProps {
  items: Item[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  /** false = ยังไม่กดค้นหา — แสดงข้อความแนะนำแทน «ไม่พบข้อมูล» */
  hasSearched?: boolean;
  /** true = เลือกตู้แล้ว — แสดง Min/Max + ไฮไลต์สีแถวต้องเติม/หมดอายุ */
  showCabinetMinMax?: boolean;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onUpdateMinMax: (item: Item) => void;
  onPrintSticker: (item: Item, copies: number) => void;
  onPageChange: (page: number) => void;
  headerActions?: React.ReactNode;
}

const COLUMN_COUNT = 11;
const NEAR_EXPIRY_DAYS = 30;

function isExpired(expireStr: string | null | undefined): boolean {
  if (!expireStr) return false;
  const d = new Date(expireStr);
  return d.getTime() < Date.now();
}

function isNearExpiry(expireStr: string | null | undefined): boolean {
  if (!expireStr) return false;
  const d = new Date(expireStr);
  const now = Date.now();
  const end = new Date(now);
  end.setDate(end.getDate() + NEAR_EXPIRY_DAYS);
  return d.getTime() >= now && d.getTime() <= end.getTime();
}

function getItemDepartmentDisplay(item: Item): string {
  if (item.department?.DepName || item.department?.DepName2) {
    return item.department.DepName || item.department.DepName2 || "-";
  }
  const itemStocks = item.itemStocks ?? [];
  const names = new Set<string>();
  itemStocks.forEach((stock) => {
    stock.cabinet?.cabinetDepartments?.forEach((cd) => {
      const name = cd.department?.DepName || cd.department?.DepName2;
      if (name) names.add(name);
    });
  });
  return names.size > 0 ? [...names].join(", ") : "-";
}

/** เรียงให้แถวของตู้เดียวกันอยู่ติดกัน — ชื่อตู้ แล้วรหัสตู้ แล้ว RowID */
function sortItemStocksByCabinet<
  T extends {
    RowID?: number;
    cabinet?: { cabinet_name?: string | null; cabinet_code?: string | null };
  },
>(stocks: T[]): T[] {
  const key = (s: T) => {
    const name = (s.cabinet?.cabinet_name ?? "").trim().toLowerCase();
    const code = (s.cabinet?.cabinet_code ?? "").trim().toLowerCase();
    return { name: name || "\uffff", code: code || "\uffff", row: s.RowID ?? 0 };
  };
  return [...stocks].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    const byName = ka.name.localeCompare(kb.name, "th", { sensitivity: "base" });
    if (byName !== 0) return byName;
    const byCode = ka.code.localeCompare(kb.code, "th", { sensitivity: "base" });
    if (byCode !== 0) return byCode;
    return ka.row - kb.row;
  });
}

function getStatusBadge(status: number | undefined) {
  if (status === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-green-100 text-green-800 border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        ใช้งาน
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-gray-100 text-gray-800 border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
      ไม่ใช้งาน
    </span>
  );
}

type ItemStockRow = NonNullable<Item["itemStocks"]>[number];

function ItemExpandedDetail({
  itemStocks,
  refillByCabinet,
  hasCabinetRefillSummary,
}: {
  itemStocks: ItemStockRow[];
  refillByCabinet: NonNullable<Item["refill_by_cabinet"]>;
  hasCabinetRefillSummary: boolean;
}) {
  return (
    <div className="space-y-4">
      {hasCabinetRefillSummary ? (
        <div>
          <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
            <Gauge className="h-4 w-4" />
            ต้องเติมต่อตู้ (Max − จำนวนในตู้)
          </h4>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-slate-600">ตู้ (Cabinet)</TableHead>
                  <TableHead className="text-center text-slate-600">ในตู้</TableHead>
                  <TableHead className="text-center text-slate-600">Max</TableHead>
                  <TableHead className="text-center text-slate-600">ต้องเติม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refillByCabinet.map((row) => {
                  const rowMin = row.stock_min ?? 0;
                  const rowLowStock = rowMin > 0 && row.in_cabinet < rowMin;
                  return (
                    <TableRow
                      key={row.cabinet_id}
                      className={cn(
                        "border-b border-slate-100",
                        rowLowStock && "bg-red-50/60 hover:bg-red-50/60",
                      )}
                    >
                      <TableCell className="font-medium text-slate-800">
                        {row.cabinet_name?.trim() || `#${row.cabinet_id}`}
                      </TableCell>
                      <TableCell className="text-center font-medium text-blue-700">
                        {row.in_cabinet.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {row.stock_max.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.refill_qty > 0 ? (
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-900">
                            {row.refill_qty.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
      {itemStocks.length > 0 ? (
        <div>
          <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
            <Package className="h-4 w-4" />
            รายการสต็อกอุปกรณ์ในตู้ ({itemStocks.length} รายการ)
          </h4>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-14 text-slate-600">ลำดับ</TableHead>
                  <TableHead className="text-slate-600">ตู้ (Cabinet)</TableHead>
                  <TableHead className="text-slate-600">สถานะสต็อก</TableHead>
                  <TableHead className="text-slate-600">หมดอายุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemStocks.map((stock, idx) => {
                  const expireStr = stock.ExpireDate;
                  const expired = isExpired(expireStr);
                  const nearExpiry = !expired && isNearExpiry(expireStr);
                  const expireDisplay = expireStr ? formatUtcDateTime(expireStr) : "-";
                  const inCabinet =
                    stock.IsStock === true ||
                    (stock as { IsStock?: boolean | number }).IsStock === 1;
                  return (
                    <TableRow
                      key={stock.RowID ?? idx}
                      className={cn(
                        "border-b border-slate-100",
                        expired && "bg-red-50 hover:bg-red-50",
                        !expired && nearExpiry && "bg-amber-50/80 hover:bg-amber-50/80",
                      )}
                    >
                      <TableCell className="text-slate-600">{idx + 1}</TableCell>
                      <TableCell className="text-slate-800">
                        {stock.cabinet?.cabinet_name || stock.cabinet?.cabinet_code || "-"}
                      </TableCell>
                      <TableCell>
                        {inCabinet ? (
                          <Badge
                            variant="default"
                            className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          >
                            อยู่ในตู้
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100"
                          >
                            ถูกเบิก
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        <span className="tabular-nums">{expireDisplay}</span>
                        {expired && (
                          <Badge
                            variant="destructive"
                            className="ml-2 border-red-200 bg-red-100 text-red-800 hover:bg-red-100"
                          >
                            หมดอายุ
                          </Badge>
                        )}
                        {!expired && nearExpiry && (
                          <Badge
                            variant="secondary"
                            className="ml-2 border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100"
                          >
                            ใกล้หมดอายุ
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** มือถือ: รายละเอียดย่อเมื่อขยายแถว — แยกบรรทัดให้อ่านง่าย */
function MobileItemDetailList({
  itemStocks,
  refillByCabinet,
  hasCabinetRefillSummary,
}: {
  itemStocks: ItemStockRow[];
  refillByCabinet: NonNullable<Item["refill_by_cabinet"]>;
  hasCabinetRefillSummary: boolean;
}) {
  return (
    <div className="border-t bg-gray-50">
      {hasCabinetRefillSummary ? (
        <ul className="divide-y">
          {refillByCabinet.map((row) => (
            <li key={row.cabinet_id} className="flex items-start gap-2 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 break-words leading-snug">
                  {row.cabinet_name?.trim() || `#${row.cabinet_id}`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ในตู้ {row.in_cabinet.toLocaleString()}
                  <span className="mx-1">·</span>
                  Max {row.stock_max.toLocaleString()}
                </p>
              </div>
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  row.refill_qty > 0
                    ? "bg-slate-200/80 text-slate-900"
                    : "text-muted-foreground",
                )}
              >
                เติม {row.refill_qty}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {itemStocks.length > 0 ? (
        <ul className={cn("divide-y", hasCabinetRefillSummary && "border-t")}>
          {itemStocks.map((stock, idx) => {
            const expired = isExpired(stock.ExpireDate);
            const nearExpiry = !expired && isNearExpiry(stock.ExpireDate);
            return (
              <li
                key={stock.RowID ?? idx}
                className={cn(
                  "flex items-start gap-2 px-3 py-2 text-sm",
                  expired && "bg-red-50/80",
                  !expired && nearExpiry && "bg-amber-50/60",
                )}
              >
                <span className="mt-0.5 w-5 shrink-0 tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 break-words leading-snug">
                    {stock.cabinet?.cabinet_name || stock.cabinet?.cabinet_code || "-"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    หมดอายุ {formatUtcDateOnly(stock.ExpireDate)}
                  </p>
                </div>
                {expired ? (
                  <span className="mt-0.5 shrink-0 text-xs font-medium text-red-700">หมดอายุ</span>
                ) : nearExpiry ? (
                  <span className="mt-0.5 shrink-0 text-xs font-medium text-amber-700">
                    ใกล้หมดอายุ
                  </span>
                ) : (
                  <span className="mt-0.5 shrink-0 text-xs font-medium text-emerald-700">ในตู้</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default function ItemsTable({
  items,
  loading,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  hasSearched = true,
  showCabinetMinMax = false,
  onUpdateMinMax,
  onPrintSticker,
  onPageChange,
  headerActions,
}: ItemsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<{ item: Item; maxCopies: number } | null>(null);
  const [printCopiesInput, setPrintCopiesInput] = useState("1");

  /** ไม่แสดงแถวที่จำนวนในตู้ = 0 — ยกเว้นเมื่อ refill > 0; ต้องเติมขึ้นก่อน แล้วเรียงชื่อ */
  const visibleItems = useMemo(() => {
    return items
      .filter((item) => {
        const qty = getCabinetQty(item);
        const refill = Math.max(0, Number((item as Item & { refill_qty?: number }).refill_qty ?? 0));
        return qty !== 0 || refill > 0;
      })
      .sort((a, b) => {
        const refillA = Math.max(0, Number((a as Item & { refill_qty?: number }).refill_qty ?? 0));
        const refillB = Math.max(0, Number((b as Item & { refill_qty?: number }).refill_qty ?? 0));
        const needA = refillA > 0;
        const needB = refillB > 0;
        if (needA !== needB) return needA ? -1 : 1;
        if (refillA !== refillB) return refillB - refillA;
        const nameA = (a.itemname ?? a.itemcode ?? "").toString();
        const nameB = (b.itemname ?? b.itemcode ?? "").toString();
        const byName = nameA.localeCompare(nameB, "th", {
          sensitivity: "base",
          numeric: true,
        });
        if (byName !== 0) return byName;
        return (a.itemcode ?? "").localeCompare(b.itemcode ?? "", "th", {
          sensitivity: "base",
          numeric: true,
        });
      });
  }, [items]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return visibleItems.slice(start, start + itemsPerPage);
  }, [visibleItems, currentPage, itemsPerPage]);

  const rowOffset = (currentPage - 1) * itemsPerPage;

  const effectiveTotalPages = useMemo(
    () => (visibleItems.length > 0 ? Math.ceil(visibleItems.length / itemsPerPage) : 1),
    [visibleItems.length, itemsPerPage],
  );

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (effectiveTotalPages <= maxVisible) {
      for (let i = 1; i <= effectiveTotalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(effectiveTotalPages);
    } else if (currentPage >= effectiveTotalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = effectiveTotalPages - 3; i <= effectiveTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(effectiveTotalPages);
    }
    return pages;
  };

  const closePrintDialog = () => {
    setPrintDialogOpen(false);
    setPrintTarget(null);
    setPrintCopiesInput("1");
  };

  const confirmPrintSticker = () => {
    if (!printTarget) return;
    const parsed = Number.parseInt(printCopiesInput, 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return;
    const safeCopies = Math.max(1, Math.min(printTarget.maxCopies, parsed));
    onPrintSticker(printTarget.item, safeCopies);
    closePrintDialog();
  };

  const descriptionText =
    visibleItems.length > 0
      ? `แสดง ${paginatedItems.length} รายการในหน้านี้ (สูงสุด ${itemsPerPage} รายการต่อหน้า) · รวม ${visibleItems.length} อุปกรณ์ที่มีในตู้${
          items.length !== visibleItems.length
            ? ` (ไม่นับ ${items.length - visibleItems.length} รายการที่จำนวนในตู้เป็น 0)`
            : ""
        }${totalItems > visibleItems.length ? ` · จากทั้งหมด ${totalItems} อุปกรณ์` : ""}`
      : "รายการอุปกรณ์ทั้งหมดในระบบ";

  const descriptionMobile =
    visibleItems.length > 0
      ? `${visibleItems.length} อุปกรณ์${totalItems > visibleItems.length ? ` · จาก ${totalItems}` : ""}`
      : "รายการอุปกรณ์ในระบบ";

  const rowHighlightClass = (
    hasExpired: boolean,
    hasNearExpiry: boolean,
    isLowStock: boolean,
  ) =>
    cn(
      hasExpired && showCabinetMinMax && "bg-orange-100",
      !hasExpired && hasNearExpiry && showCabinetMinMax && "bg-amber-100",
      !hasExpired && !hasNearExpiry && showCabinetMinMax && isLowStock && "bg-red-100",
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base sm:text-lg">รายการอุปกรณ์</CardTitle>
          <CardDescription className="text-sm">
            <span className="sm:hidden">{descriptionMobile}</span>
            <span className="hidden sm:inline">{descriptionText}</span>
          </CardDescription>
        </div>
        {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
      </CardHeader>
      <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
        {loading ? (
          <div className="flex justify-center items-center py-10 sm:py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 sm:py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {hasSearched
                ? "ไม่พบข้อมูลอุปกรณ์"
                : "กำหนดเงื่อนไขแล้วกด «ค้นหา» เพื่อแสดงรายการ"}
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-10 sm:py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              ไม่มีรายการที่แสดง — รายการในหน้านี้ทั้งหมดมีจำนวนในตู้เป็น 0 ({items.length} รายการ)
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: list rows */}
            <div className="md:hidden divide-y rounded-md border bg-white">
              {paginatedItems.map((item, index) => {
                const countItemStock = getCabinetQty(item);
                const refillQty = Math.max(
                  0,
                  Number((item as Item & { refill_qty?: number }).refill_qty ?? 0),
                );
                const stockMin = showCabinetMinMax ? toStockLimitNumber(item.stock_min) : 0;
                const isLowStock = stockMin > 0 && countItemStock < stockMin;
                const itemStocks = sortItemStocksByCabinet(
                  (item.itemStocks ?? []).filter(
                    (s) => s.IsStock === true || (s as { IsStock?: boolean | number }).IsStock === 1,
                  ),
                );
                const refillByCabinet = item.refill_by_cabinet ?? [];
                const hasCabinetRefillSummary = refillByCabinet.some(
                  (row) => row.refill_qty > 0 || row.stock_max > 0,
                );
                const canExpandRow = itemStocks.length > 0 || refillByCabinet.length > 0;
                const isExpanded = expandedRow === item.itemcode;
                const hasExpired = itemStocks.some((s) => isExpired(s.ExpireDate));
                const hasNearExpiry =
                  !hasExpired && itemStocks.some((s) => isNearExpiry(s.ExpireDate));
                const rowNum = rowOffset + index + 1;
                const dept = getItemDepartmentDisplay(item);

                return (
                  <div
                    key={item.itemcode}
                    className={cn(
                      isExpanded && "bg-slate-50/60",
                      rowHighlightClass(hasExpired, hasNearExpiry, isLowStock),
                    )}
                  >
                    <div className="flex w-full items-start gap-2 px-3 py-2.5">
                      {canExpandRow ? (
                        <button
                          type="button"
                          onClick={() => setExpandedRow(isExpanded ? null : item.itemcode)}
                          className="mt-0.5 shrink-0 text-slate-500 touch-manipulation"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "ย่อ" : "ขยาย"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <span className="mt-0.5 w-4 shrink-0" />
                      )}
                      <span className="mt-0.5 w-6 shrink-0 text-sm tabular-nums text-muted-foreground">
                        {rowNum}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium break-words leading-snug",
                            showCabinetMinMax && hasExpired ? "text-red-600" : "text-slate-800",
                          )}
                        >
                          {item.itemname || "-"}
                        </p>
                        {(dept !== "-" || (showCabinetMinMax && hasExpired)) && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {dept !== "-" ? dept : null}
                            {showCabinetMinMax && hasExpired
                              ? `${dept !== "-" ? " · " : ""}มีหมดอายุ`
                              : null}
                          </div>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Archive className="h-3.5 w-3.5 text-blue-600" />
                            <span
                              className={cn(
                                "font-semibold tabular-nums",
                                isLowStock ? "text-red-600" : "text-blue-600",
                              )}
                            >
                              {countItemStock.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">ในตู้</span>
                          </span>
                          <span>
                            ใช้{" "}
                            <span className="font-medium tabular-nums">{item.qty_in_use ?? 0}</span>
                          </span>
                          {showCabinetMinMax ? (
                            <span>
                              Min/Max{" "}
                              <span className="tabular-nums">
                                {toStockLimitNumber(item.stock_min)}/
                                {toStockLimitNumber(item.stock_max)}
                              </span>
                            </span>
                          ) : null}
                          {refillQty > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-900">
                              เติม {refillQty}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateMinMax(item)}
                        title="ตั้งค่า Min/Max"
                        className="mt-0.5 shrink-0 text-purple-600 hover:border-purple-600 hover:text-purple-700"
                      >
                        <Gauge className="h-4 w-4" />
                      </Button>
                    </div>
                    {isExpanded && canExpandRow ? (
                      <MobileItemDetailList
                        itemStocks={itemStocks}
                        refillByCabinet={refillByCabinet}
                        hasCabinetRefillSummary={hasCabinetRefillSummary}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead className="w-[100px]">ลำดับ</TableHead>
                    <TableHead>รหัสอุปกรณ์</TableHead>
                    <TableHead>ชื่ออุปกรณ์</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead className="text-center">จำนวนในตู้</TableHead>
                    <TableHead className="text-center">จำนวนที่ถูกใช้งาน</TableHead>
                    <TableHead className="text-center">Min/Max</TableHead>
                    <TableHead className="text-center">จำนวนที่ต้องเติม</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item, index) => {
                    const countItemStock = getCabinetQty(item);
                    const refillQty = Math.max(
                      0,
                      Number((item as Item & { refill_qty?: number }).refill_qty ?? 0),
                    );
                    const stockMin = showCabinetMinMax ? toStockLimitNumber(item.stock_min) : 0;
                    const stockMax = showCabinetMinMax ? toStockLimitNumber(item.stock_max) : 0;
                    const isLowStock = stockMin > 0 && countItemStock < stockMin;
                    const itemStocks = sortItemStocksByCabinet(
                      (item.itemStocks ?? []).filter(
                        (s) =>
                          s.IsStock === true || (s as { IsStock?: boolean | number }).IsStock === 1,
                      ),
                    );
                    const refillByCabinet = item.refill_by_cabinet ?? [];
                    const hasCabinetRefillSummary = refillByCabinet.some(
                      (row) => row.refill_qty > 0 || row.stock_max > 0,
                    );
                    const canExpandRow = itemStocks.length > 0 || refillByCabinet.length > 0;
                    const isExpanded = expandedRow === item.itemcode;
                    const hasExpired = itemStocks.some((s) => isExpired(s.ExpireDate));
                    const hasNearExpiry =
                      !hasExpired && itemStocks.some((s) => isNearExpiry(s.ExpireDate));

                    return (
                      <Fragment key={item.itemcode}>
                        <TableRow
                          className={cn(
                            "transition-colors",
                            rowHighlightClass(hasExpired, hasNearExpiry, isLowStock),
                            hasExpired && showCabinetMinMax && "hover:bg-orange-200",
                            !hasExpired &&
                              hasNearExpiry &&
                              showCabinetMinMax &&
                              "hover:bg-amber-200",
                            !hasExpired &&
                              !hasNearExpiry &&
                              showCabinetMinMax &&
                              isLowStock &&
                              "hover:bg-red-200",
                            !hasExpired &&
                              !hasNearExpiry &&
                              !(showCabinetMinMax && isLowStock) &&
                              "hover:bg-slate-50/80",
                          )}
                        >
                          <TableCell className="w-12">
                            {canExpandRow ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedRow(isExpanded ? null : item.itemcode)
                                }
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
                            ) : (
                              <span className="inline-block w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">
                            {rowOffset + index + 1}
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                              {item.itemcode}
                            </code>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "min-w-0 max-w-[280px]",
                              showCabinetMinMax && hasExpired && "text-red-600",
                            )}
                          >
                            <div className="flex flex-col gap-1">
                              <ItemNameWithUnit
                                item={item}
                                qtyMain={getCabinetQty(item)}
                                nameClassName={
                                  showCabinetMinMax && hasExpired
                                    ? "text-red-600 font-semibold"
                                    : undefined
                                }
                              />
                              {showCabinetMinMax && hasExpired ? (
                                <span className="text-xs font-medium text-red-600">
                                  (มีอุปกรณ์หมดอายุ)
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getItemDepartmentDisplay(item)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Archive className="h-4 w-4 text-blue-600" />
                              <span
                                className={cn(
                                  "font-semibold",
                                  isLowStock ? "text-red-600" : "text-blue-600",
                                )}
                              >
                                {countItemStock.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-slate-700">
                              {item.qty_in_use ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {showCabinetMinMax ? (
                              <>
                                <span className="text-gray-600">{stockMin}</span>
                                <span className="mx-1 text-gray-400">/</span>
                                <span className="text-gray-600">{stockMax}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "font-medium",
                                showCabinetMinMax && refillQty > 0
                                  ? "inline-flex min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-900"
                                  : "text-slate-700",
                              )}
                            >
                              {refillQty}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(item.item_status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onUpdateMinMax(item)}
                                title="ตั้งค่า Min/Max"
                                className="text-purple-600 hover:border-purple-600 hover:text-purple-700"
                              >
                                <Gauge className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && canExpandRow && (
                          <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                              <ItemExpandedDetail
                                itemStocks={itemStocks}
                                refillByCabinet={refillByCabinet}
                                hasCabinetRefillSummary={hasCabinetRefillSummary}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {effectiveTotalPages > 1 && (
              <div className="mt-4 sm:mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center text-sm text-gray-500 sm:text-left">
                  หน้า {currentPage} จาก {effectiveTotalPages}
                  <span className="hidden sm:inline">
                    {" "}
                    ({visibleItems.length} อุปกรณ์)
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                  >
                    แรกสุด
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ก่อนหน้า
                  </Button>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    {generatePageNumbers().map((page, idx) =>
                      page === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => onPageChange(page as number)}
                        >
                          {page}
                        </Button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === effectiveTotalPages}
                  >
                    ถัดไป
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => onPageChange(effectiveTotalPages)}
                    disabled={currentPage === effectiveTotalPages}
                  >
                    สุดท้าย
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog
        open={printDialogOpen}
        onOpenChange={(open) => (open ? setPrintDialogOpen(true) : closePrintDialog())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>พิมพ์สติ๊กเกอร์</DialogTitle>
            <DialogDescription>
              {printTarget
                ? `รหัส: ${printTarget.item.itemcode}`
                : "กำหนดจำนวนแผ่นที่ต้องการพิมพ์"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
              สูงสุดที่พิมพ์ได้:{" "}
              <span className="font-semibold text-slate-900">{printTarget?.maxCopies ?? 0}</span>{" "}
              แผ่น (ตามจำนวนที่ต้องเติม)
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">จำนวนที่ต้องการพิมพ์</label>
              <Input
                type="number"
                min={1}
                max={printTarget?.maxCopies ?? 1}
                value={printCopiesInput}
                onChange={(e) => setPrintCopiesInput(e.target.value)}
                placeholder="ระบุจำนวนแผ่น"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePrintDialog}>
              ยกเลิก
            </Button>
            <Button
              onClick={confirmPrintSticker}
              disabled={
                !printTarget ||
                !Number.isFinite(Number.parseInt(printCopiesInput, 10)) ||
                Number.parseInt(printCopiesInput, 10) < 1 ||
                Number.parseInt(printCopiesInput, 10) > (printTarget?.maxCopies ?? 0)
              }
            >
              พิมพ์สติ๊กเกอร์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
