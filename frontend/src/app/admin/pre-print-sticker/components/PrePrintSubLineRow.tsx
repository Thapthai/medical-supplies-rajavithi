'use client';

import { Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { TableCell, TableRow } from '@/components/ui/table';
import type { SelectedLine } from '../types';

type PrePrintSubLineRowProps = {
  line: SelectedLine;
  idPrefix: string;
  /** catalog = มีคอลัมน์ checkbox ว่าง (ตารางซ้าย), prepared = 4 คอลัมน์ (ตารางขวา) */
  layout?: 'catalog' | 'prepared';
  /** stack = การ์ดมือถือ จัดช่องให้ตรงแถว lot ด้านบน */
  variant?: 'table' | 'stack';
  onSetCopies: (lineId: string, raw: number | '') => void;
  onExpireDateChange: (lineId: string, ymd: string) => void;
  onRemoveLine: (lineId: string) => void;
};

export default function PrePrintSubLineRow({
  line,
  idPrefix,
  layout = 'catalog',
  variant = 'table',
  onSetCopies,
  onExpireDateChange,
  onRemoveLine,
}: PrePrintSubLineRowProps) {
  const inputDisabled = line.refillCap <= 0;

  const expirePicker = (
    <div className="flex min-w-0 items-center [&_input]:h-8 [&_button]:h-8 [&_button]:w-8">
      <DatePickerBE
        id={`${idPrefix}-expire-${line.lineId}`}
        className="items-center"
        popoverPortal
        value={line.expireDate || ''}
        onChange={(v) => onExpireDateChange(line.lineId, v)}
        placeholder="วว/ดด/ปปปป"
      />
    </div>
  );

  const qtyInput = (
    <Input
      type="text"
      inputMode="numeric"
      className="h-8 w-full bg-white text-center font-mono text-sm"
      value={line.refillCap <= 0 ? 0 : line.copies === '' ? '' : line.copies}
      disabled={inputDisabled}
      onChange={(e) => {
        const v = e.target.value.trim();
        if (v === '') {
          onSetCopies(line.lineId, '');
          return;
        }
        const n = parseInt(v, 10);
        if (Number.isFinite(n)) onSetCopies(line.lineId, n);
      }}
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
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
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
    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
      {layout === 'catalog' ? (
        <>
          <TableCell className="w-12" />
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
