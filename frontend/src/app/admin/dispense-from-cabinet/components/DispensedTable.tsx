import { useMemo, useState, Fragment } from 'react';
import { Download, RefreshCw, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { DispensedItem } from '../types';
import type { Item } from '@/types/item';
import { formatUtcDateTime, parseApiDateTime } from '@/lib/formatThaiDateTime';
import {
  buildDispensedGroups,
  type DispensedGroup,
} from '@/lib/dispenseFromCabinet/buildDispensedGroups';

export type { DispensedGroup } from '@/lib/dispenseFromCabinet/buildDispensedGroups';

const COLUMN_COUNT = 9;

/** มือถือ: แสดงเฉพาะวันที่ (ไม่โชว์เวลา) */
function formatUtcDateOnly(value?: string | null): string {
  if (value == null || value === '') return '-';
  const d = parseApiDateTime(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('th-TH', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** แสดงจำนวนเบิกให้อ่านง่าย: ตัวเลข + หน่วยหลัก และเทียบหน่วยย่อยแยกบรรทัด */
function DispenseQty({
  qty,
  item,
  align = 'center',
  compact = false,
}: {
  qty: number;
  item: Pick<Item, 'unit' | 'subUnit' | 'SubUnitQty'> | null | undefined;
  align?: 'center' | 'end';
  compact?: boolean;
}) {
  const main = item?.unit?.UnitName?.trim() || '';
  const sub = item?.subUnit?.UnitName?.trim() || '';
  const per = item?.SubUnitQty != null ? Number(item.SubUnitQty) : NaN;
  const hasSub = Boolean(sub && Number.isFinite(per) && per > 0);
  const subTotal = hasSub ? Math.round(qty * per) : null;

  return (
    <div
      className={cn(
        'inline-flex flex-col gap-0.5',
        align === 'end' ? 'items-end' : 'items-center',
      )}
      title={
        hasSub && subTotal != null
          ? `เบิก ${qty.toLocaleString()} ${main || 'หน่วย'} (= ${subTotal.toLocaleString()} ${sub})`
          : `เบิก ${qty.toLocaleString()}${main ? ` ${main}` : ''}`
      }
    >
      <span
        className={cn(
          'inline-flex items-baseline gap-1 rounded-md bg-sky-50 text-sky-950 ring-1 ring-inset ring-sky-100',
          compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
        )}
      >
        <span className={cn('font-semibold tabular-nums', compact ? 'text-sm' : 'text-base')}>
          {qty.toLocaleString()}
        </span>
        {main ? (
          <span className="text-xs font-medium text-sky-800/80">{main}</span>
        ) : (
          <span className="text-xs font-medium text-sky-800/80">ชิ้น</span>
        )}
      </span>
      {hasSub && subTotal != null ? (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          = {subTotal.toLocaleString()} {sub}
        </span>
      ) : null}
    </div>
  );
}

interface DispensedTableProps {
  loading: boolean;
  items: DispensedItem[];
  currentPage: number;
  totalPages: number;
  totalRawItems: number;
  totalGroups: number;
  groupsPerPage: number;
  searchItemCode: string;
  itemTypeFilter: string;
  onPageChange: (page: number) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

function GroupDetailList({ group }: { group: DispensedGroup }) {
  return (
    <ul className="divide-y border-t bg-gray-50">
      {group.items.map((item, idx) => (
        <li
          key={`${group.key}-${idx}-${item.RowID}-${item.RfidCode ?? ''}-${item.modifyDate ?? ''}`}
          className="flex items-center gap-2 px-3 py-1.5 text-sm"
        >
          <span className="w-5 shrink-0 tabular-nums text-muted-foreground">{idx + 1}</span>
          <div className="min-w-0 flex-1 truncate text-slate-700">
            <span>{formatUtcDateOnly(item.modifyDate)}</span>
            <span className="text-muted-foreground"> · </span>
            <span>{item.departmentName?.trim() || '-'}</span>
            <span className="text-muted-foreground"> · </span>
            <span>{item.cabinetUserName?.trim() || '-'}</span>
          </div>
          <DispenseQty
            qty={item.qty ?? 1}
            item={item as unknown as Item}
            align="end"
            compact
          />
        </li>
      ))}
    </ul>
  );
}

export default function DispensedTable({
  loading,
  items,
  currentPage,
  totalPages,
  totalRawItems,
  totalGroups,
  groupsPerPage,
  searchItemCode,
  itemTypeFilter,
  onPageChange,
  onExportExcel,
  onExportPdf,
}: DispensedTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildDispensedGroups(items), [items]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * groupsPerPage;
    return groups.slice(start, start + groupsPerPage);
  }, [groups, currentPage, groupsPerPage]);

  const groupRowOffset = (currentPage - 1) * groupsPerPage;

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalDispensedQty = useMemo(
    () => items.reduce((sum, i) => sum + (i.qty ?? 1), 0),
    [items],
  );

  const descriptionText =
    items.length > 0
      ? `แสดง ${paginatedGroups.length} กลุ่มในหน้านี้ (สูงสุด ${groupsPerPage} กลุ่มต่อหน้า) · รวม ${totalGroups} กลุ่ม จาก ${totalRawItems} รายการดิบ (รวม ${totalDispensedQty.toLocaleString()} ชิ้น) · จัดกลุ่มตามรหัสอุปกรณ์ + วันที่เบิก + ชื่อผู้เบิก`
      : 'รายการอุปกรณ์ทั้งหมดที่เบิกจากตู้ SmartCabinet';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base sm:text-lg">รายการเบิกอุปกรณ์จากตู้</CardTitle>
          <CardDescription className="text-sm">
            <span className="sm:hidden">
              {items.length > 0
                ? `${totalGroups} กลุ่ม · ${totalDispensedQty.toLocaleString()} ชิ้น`
                : 'รายการเบิกจากตู้ SmartCabinet'}
              {(searchItemCode || itemTypeFilter !== 'all') && items.length > 0 && ' (กรองแล้ว)'}
            </span>
            <span className="hidden sm:inline">
              {descriptionText}
              {(searchItemCode || itemTypeFilter !== 'all') && items.length > 0 && ' (กรองแล้ว)'}
            </span>
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={onExportExcel} variant="outline" size="sm">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button onClick={onExportPdf} variant="outline" size="sm">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
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
            <p className="text-gray-500">ไม่พบรายการเบิกอุปกรณ์</p>
            <p className="text-sm text-gray-400 mt-2">กรุณาตรวจสอบว่ามีข้อมูลในระบบ</p>
          </div>
        ) : (
          <>
            {/* Mobile: list rows — ฟอนต์ปกติ อ่านง่าย */}
            <div className="md:hidden divide-y rounded-md border bg-white">
              {paginatedGroups.map((group, groupIndex) => {
                const isExpanded = expandedKeys.has(group.key);
                const rowNum = groupRowOffset + groupIndex + 1;
                const first = group.items[0];
                return (
                  <div key={group.key} className={cn(isExpanded && 'bg-slate-50/60')}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(group.key)}
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left touch-manipulation active:bg-slate-100"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'ย่อ' : 'ขยาย'}
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
                        <p className="text-sm font-medium text-slate-800 break-words leading-snug">
                          {group.itemname || '-'}
                        </p>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatUtcDateOnly(group.dispenseTime)}
                          {first?.cabinetName ? ` · ${first.cabinetName}` : ''}
                        </div>
                      </div>
                      <DispenseQty
                        qty={group.totalQty}
                        item={first as unknown as Item}
                        align="end"
                        compact
                      />
                    </button>
                    {isExpanded && <GroupDetailList group={group} />}
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
                    <TableHead className="text-center min-w-[7rem]">จำนวนที่เบิก</TableHead>
                    <TableHead>วันที่เบิก</TableHead>
                    <TableHead>ตู้</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>ชื่อผู้เบิก</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.map((group, groupIndex) => {
                    const isExpanded = expandedKeys.has(group.key);
                    const rowNum = groupRowOffset + groupIndex + 1;
                    return (
                      <Fragment key={group.key}>
                        <TableRow
                          className={cn(
                            'transition-colors',
                            isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/80',
                          )}
                        >
                          <TableCell className="w-12">
                            <button
                              type="button"
                              onClick={() => toggleExpand(group.key)}
                              className="hover:bg-gray-200 p-1 rounded"
                              aria-label={isExpanded ? 'ย่อ' : 'ขยาย'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{rowNum}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {group.itemcode || '-'}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {group.itemname || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <DispenseQty
                              qty={group.totalQty}
                              item={group.items[0] as unknown as Item}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatUtcDateTime(group.dispenseTime)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.items[0]?.cabinetName ?? '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.items[0]?.departmentName ?? '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.items[0]?.cabinetUserName ?? '-'}
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                              <div>
                                <h4 className="font-semibold mb-3 text-gray-700 flex flex-wrap items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  <span>รายการเบิกในกลุ่ม ({group.items.length} ครั้ง)</span>
                                  <span className="font-normal text-muted-foreground">รวม</span>
                                  <DispenseQty
                                    qty={group.totalQty}
                                    item={group.items[0] as unknown as Item}
                                    compact
                                  />
                                </h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-12">ลำดับ</TableHead>
                                        <TableHead className="text-center min-w-[7rem]">จำนวนที่เบิก</TableHead>
                                        <TableHead>วันที่เบิก</TableHead>
                                        <TableHead>Division</TableHead>
                                        <TableHead>ชื่อผู้เบิก</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.items.map((item, idx) => (
                                        <TableRow
                                          key={`${group.key}-${idx}-${item.RowID}-${item.RfidCode ?? ''}-${item.modifyDate ?? ''}`}
                                          className="hover:bg-gray-100/80"
                                        >
                                          <TableCell className="font-medium">{idx + 1}</TableCell>
                                          <TableCell className="text-center">
                                            <DispenseQty
                                              qty={item.qty ?? 1}
                                              item={item as unknown as Item}
                                              compact
                                            />
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">
                                            {formatUtcDateTime(item.modifyDate)}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">
                                            {item.departmentName || '-'}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">
                                            {item.cabinetUserName || '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
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

            {totalPages > 1 && (
              <div className="mt-4 sm:mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500 text-center sm:text-left">
                  หน้า {currentPage} จาก {totalPages}
                  <span className="hidden sm:inline">
                    {' '}
                    ({totalGroups} กลุ่ม · {totalRawItems} รายการ)
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
                  <div className="hidden sm:flex items-center gap-1.5">
                    {generatePageNumbers().map((page, idx) =>
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
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
                    disabled={currentPage === totalPages}
                  >
                    ถัดไป
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    สุดท้าย
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
