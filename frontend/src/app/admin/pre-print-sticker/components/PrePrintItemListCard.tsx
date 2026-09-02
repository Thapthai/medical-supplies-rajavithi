'use client';

import { Fragment, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { Item } from '@/types/item';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { generatePageNumbers } from '../utils';
import type { ItemDraft, SelectedLine } from '../types';
import { DEFAULT_ITEM_DRAFT } from '../types';
import PrePrintSubLineRow from './PrePrintSubLineRow';
import BrandTabs from './BrandTabs';

type PrePrintItemListCardProps = {
  brands: string[];
  selectedBrand: string;
  onBrandChange: (brand: string) => void;
  items: Item[];
  loadingList: boolean;
  total: number;
  page: number;
  totalPages: number;
  keywordInput: string;
  onKeywordInputChange: (value: string) => void;
  onPageChange: (nextPage: number) => void;
  checkedItemcodes: Set<string>;
  onToggleCheck: (row: Item) => void;
  getItemDraft: (itemcode: string) => ItemDraft;
  onDraftExpireChange: (itemcode: string, ymd: string) => void;
  onDraftCopiesChange: (itemcode: string, raw: number | '') => void;
  onAddSubLine: (row: Item) => void;
  pendingLines: SelectedLine[];
  onSetCopies: (lineId: string, raw: number | '') => void;
  onExpireDateChange: (lineId: string, ymd: string) => void;
  onRemoveLine: (lineId: string) => void;
  onClearPending: () => void;
  stagedSummary: { rows: number; sheets: number };
  canPrepare: boolean;
  onPrepare: () => void;
};

function DraftControls({
  row,
  draft,
  onDraftExpireChange,
  onDraftCopiesChange,
  onAddSubLine,
  compact,
}: {
  row: Item;
  draft: ItemDraft;
  onDraftExpireChange: (itemcode: string, ymd: string) => void;
  onDraftCopiesChange: (itemcode: string, raw: number | '') => void;
  onAddSubLine: (row: Item) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-2',
        compact ? 'w-full' : '',
      )}
    >
      <div className={cn('min-w-0', compact ? 'grow basis-[9rem]' : 'min-w-[8.5rem]')}>
        <label
          htmlFor={`draft-expire-${row.itemcode}`}
          className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden"
        >
          วันหมดอายุ
        </label>
        <div className="flex items-center [&_input]:h-8 [&_button]:h-8 [&_button]:w-8">
          <DatePickerBE
            id={`draft-expire-${row.itemcode}`}
            className="items-center"
            popoverPortal
            value={draft.expireDate}
            onChange={(v) => onDraftExpireChange(row.itemcode, v)}
            placeholder="วว/ดด/ปปปป"
          />
        </div>
      </div>
      <div className="w-[4.5rem] shrink-0">
        <label
          htmlFor={`draft-copies-${row.itemcode}`}
          className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden"
        >
          จำนวน
        </label>
        <Input
          id={`draft-copies-${row.itemcode}`}
          type="text"
          inputMode="numeric"
          className="h-8 w-full bg-white text-center font-mono text-sm"
          value={draft.copies === '' ? '' : draft.copies}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v === '') {
              onDraftCopiesChange(row.itemcode, '');
              return;
            }
            const n = parseInt(v, 10);
            if (Number.isFinite(n)) onDraftCopiesChange(row.itemcode, n);
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={`เพิ่ม lot ${row.itemcode}`}
        onClick={() => onAddSubLine(row)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function PrePrintItemListCard({
  brands,
  selectedBrand,
  onBrandChange,
  items,
  loadingList,
  total,
  page,
  totalPages,
  keywordInput,
  onKeywordInputChange,
  onPageChange,
  checkedItemcodes,
  onToggleCheck,
  getItemDraft,
  onDraftExpireChange,
  onDraftCopiesChange,
  onAddSubLine,
  pendingLines,
  onSetCopies,
  onExpireDateChange,
  onRemoveLine,
  onClearPending,
  stagedSummary,
  canPrepare,
  onPrepare,
}: PrePrintItemListCardProps) {
  const pendingByItem = useMemo(() => {
    const map = new Map<string, SelectedLine[]>();
    for (const line of pendingLines) {
      const list = map.get(line.itemcode) ?? [];
      list.push(line);
      map.set(line.itemcode, list);
    }
    return map;
  }, [pendingLines]);

  return (
    <Card className="min-w-0 overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="space-y-3 p-4 pb-3 sm:p-6 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">รายการอุปกรณ์</CardTitle>
            <CardDescription className="mt-0.5 text-xs sm:text-sm">
              {loadingList && items.length === 0
                ? 'กำลังโหลด…'
                : `แสดง ${items.length} จาก ${total} รายการ · เช็ค → กรอก lot → + เพิ่ม lot`}
            </CardDescription>
          </div>
          {pendingLines.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 self-start shrink-0 px-2 text-xs sm:text-sm"
              onClick={onClearPending}
            >
              ล้าง lot เพิ่ม ({pendingLines.length})
            </Button>
          )}
        </div>
        <BrandTabs brands={brands} selectedBrand={selectedBrand} onBrandChange={onBrandChange} />
        <Input
          placeholder="ค้นหา itemcode / ชื่อ"
          value={keywordInput}
          onChange={(e) => onKeywordInputChange(e.target.value)}
          className="min-h-10 bg-white shadow-sm"
        />
      </CardHeader>

      <CardContent className="min-h-0 space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
        {/* Mobile card list */}
        <div className="max-h-[min(58vh,calc(100dvh-16rem))] space-y-2 overflow-y-auto overscroll-contain md:hidden">
          {loadingList ? (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
              กำลังโหลด…
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
              ไม่มีรายการ
            </p>
          ) : (
            items.map((row) => {
              const checked = checkedItemcodes.has(row.itemcode);
              const draft = getItemDraft(row.itemcode) ?? DEFAULT_ITEM_DRAFT;
              const itemPending = pendingByItem.get(row.itemcode) ?? [];

              return (
                <div
                  key={row.itemcode}
                  className={cn(
                    'rounded-xl border bg-white p-3 transition-colors',
                    checked ? 'border-violet-200 bg-violet-50/80' : 'border-slate-200',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggleCheck(row)}
                      aria-label={`เลือก ${row.itemcode}`}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <ItemNameWithUnit item={row} />
                    </div>
                  </div>

                  {checked && (
                    <div className="mt-3 border-t border-violet-100/80 pt-3">
                      <DraftControls
                        row={row}
                        draft={draft}
                        onDraftExpireChange={onDraftExpireChange}
                        onDraftCopiesChange={onDraftCopiesChange}
                        onAddSubLine={onAddSubLine}
                        compact
                      />
                    </div>
                  )}

                  {itemPending.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {itemPending.map((line) => (
                        <PrePrintSubLineRow
                          key={line.lineId}
                          line={line}
                          idPrefix="pending-m"
                          variant="stack"
                          onSetCopies={onSetCopies}
                          onExpireDateChange={onExpireDateChange}
                          onRemoveLine={onRemoveLine}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden max-h-[min(70vh,calc(100dvh-15rem))] overflow-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-3">เลือก</TableHead>
                <TableHead className="min-w-[140px]">ชื่ออุปกรณ์</TableHead>
                <TableHead className="w-[148px]">วันหมดอายุ</TableHead>
                <TableHead className="w-[88px] text-center">จำนวน</TableHead>
                <TableHead className="w-12 text-center" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                    กำลังโหลด…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                    ไม่มีรายการ
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const checked = checkedItemcodes.has(row.itemcode);
                  const draft = getItemDraft(row.itemcode) ?? DEFAULT_ITEM_DRAFT;
                  const itemPending = pendingByItem.get(row.itemcode) ?? [];

                  return (
                    <Fragment key={row.itemcode}>
                      <TableRow className={cn(checked && 'bg-violet-50/90')}>
                        <TableCell className="w-12 align-middle pl-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => onToggleCheck(row)}
                            aria-label={`เลือก ${row.itemcode}`}
                          />
                        </TableCell>
                        <TableCell className="min-w-0 align-middle py-2 text-sm">
                          <ItemNameWithUnit item={row} />
                        </TableCell>
                        {checked ? (
                          <>
                            <TableCell className="py-2 align-middle">
                              <div className="flex min-w-[8.5rem] items-center [&_input]:h-8 [&_button]:h-8 [&_button]:w-8">
                                <DatePickerBE
                                  id={`draft-expire-d-${row.itemcode}`}
                                  className="items-center"
                                  popoverPortal
                                  value={draft.expireDate}
                                  onChange={(v) => onDraftExpireChange(row.itemcode, v)}
                                  placeholder="วว/ดด/ปปปป"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-center align-middle">
                              <Input
                                type="text"
                                inputMode="numeric"
                                className="mx-auto h-8 w-16 bg-white text-center font-mono text-sm"
                                value={draft.copies === '' ? '' : draft.copies}
                                onChange={(e) => {
                                  const v = e.target.value.trim();
                                  if (v === '') {
                                    onDraftCopiesChange(row.itemcode, '');
                                    return;
                                  }
                                  const n = parseInt(v, 10);
                                  if (Number.isFinite(n)) onDraftCopiesChange(row.itemcode, n);
                                }}
                              />
                            </TableCell>
                            <TableCell className="py-2 text-center align-middle">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                aria-label={`เพิ่ม lot ${row.itemcode}`}
                                onClick={() => onAddSubLine(row)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="py-2" />
                            <TableCell className="py-2" />
                            <TableCell className="py-2" />
                          </>
                        )}
                      </TableRow>
                      {itemPending.map((line) => (
                        <PrePrintSubLineRow
                          key={line.lineId}
                          line={line}
                          idPrefix="pending"
                          onSetCopies={onSetCopies}
                          onExpireDateChange={onExpireDateChange}
                          onRemoveLine={onRemoveLine}
                        />
                      ))}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground sm:text-sm">
              หน้า {page} จาก {totalPages} ({total} รายการ)
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1 || loadingList}
              >
                ก่อนหน้า
              </Button>
              {generatePageNumbers(page, totalPages).map((pNum, idx) =>
                pNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pNum}
                    type="button"
                    variant={page === pNum ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 min-w-8"
                    onClick={() => onPageChange(pNum as number)}
                    disabled={loadingList}
                  >
                    {pNum}
                  </Button>
                ),
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages || loadingList}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:bg-transparent sm:px-0 sm:py-0 sm:pt-3 sm:backdrop-blur-none">
          {stagedSummary.rows > 0 ? (
            <p className="text-xs text-muted-foreground sm:text-sm">
              รอเตรียม {stagedSummary.rows} lot · รวม {stagedSummary.sheets} แผ่น
            </p>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Button
            type="button"
            className="w-full min-w-[8rem] sm:w-auto"
            onClick={onPrepare}
            disabled={!canPrepare}
          >
            เตรียมพิม
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
