'use client';

import { Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SelectedLine } from '../types';
import { parseCopiesInput } from '../utils';

type PrePrintSubLineRowProps = {
  line: SelectedLine;
  idPrefix: string;
  /** prepared = 4 คอลัมน์ (ตารางขวา) */
  layout?: 'catalog' | 'prepared';
  /** stack = การ์ดมือถือ จัดช่องให้ตรงแถว lot ด้านบน */
  variant?: 'table' | 'stack';
  expireError?: boolean;
  onSetCopies: (lineId: string, raw: number | '') => void;
  onExpireDateChange: (lineId: string, ymd: string) => void;
  onRemoveLine: (lineId: string) => void;
};

export default function PrePrintSubLineRow({
  line,
  idPrefix,
  layout = 'catalog',
  variant = 'table',
  expireError = false,
  onSetCopies,
  onExpireDateChange,
  onRemoveLine,
}: PrePrintSubLineRowProps) {
  const inputDisabled = line.refillCap <= 0;

  const expirePicker = (
    <div
      className={cn(
        'flex min-w-0 items-center rounded-md p-0.5 [&_input]:h-8 [&_button]:h-8 [&_button]:w-8',
        expireError && 'ring-2 ring-red-500 bg-red-50/80 [&_input]:border-red-500 [&_button]:border-red-500',
      )}
    >
      <DatePickerBE
        id={`${idPrefix}-expire-${line.lineId}`}
        className="items-center"
        popoverPortal
        value={line.expireDate || ''}
        onChange={(v) => onExpireDateChange(line.lineId, v)}
        placeholder="วว/ดด/ปปปป (ค.ศ.)"
      />
    </div>
  );

  const qtyInput = (
    <Input
      type="text"
      inputMode="numeric"
      className="h-8 w-full bg-white text-center font-mono text-sm"
      value={line.refillCap <= 0 ? '' : line.copies === '' ? '' : line.copies}
      disabled={inputDisabled}
      onChange={(e) => onSetCopies(line.lineId, parseCopiesInput(e.target.value))}
    />
  );

  const removeBtn = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
      aria-label={`ลบ ${line.itemcode}`}
      onClick={() => onRemoveLine(line.lineId)}
    >
      <Minus className="h-4 w-4" />
    </Button>
  );

  if (variant === 'stack') {
    return (
      <div
        className={cn(
          'flex flex-wrap items-end gap-2 rounded-lg border bg-slate-50/70 p-2.5',
          expireError ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-200',
        )}
      >
        <div className="min-w-0 grow basis-[9rem]">{expirePicker}</div>
        <div className="w-[4.5rem] shrink-0">{qtyInput}</div>
        {removeBtn}
      </div>
    );
  }

  const nameCell = <TableCell className="min-w-0 py-2" />;

  const expireCell = (
    <TableCell className="py-2 align-middle">
      <div className="flex min-w-[8.5rem] items-center">{expirePicker}</div>
    </TableCell>
  );

  const qtyCell = (
    <TableCell className="py-2 text-center align-middle">
      <div className="mx-auto w-16">{qtyInput}</div>
    </TableCell>
  );

  const actionCell = (
    <TableCell className="py-2 text-center align-middle">{removeBtn}</TableCell>
  );

  return (
    <TableRow
      className={cn(
        'hover:bg-slate-50/80',
        expireError ? 'bg-red-50/70' : 'bg-slate-50/80',
      )}
    >
      {layout === 'catalog' ? (
        <>
          {nameCell}
          {expireCell}
          {qtyCell}
          {actionCell}
        </>
      ) : (
        <>
          {nameCell}
          {expireCell}
          {qtyCell}
          {actionCell}
        </>
      )}
    </TableRow>
  );
}
