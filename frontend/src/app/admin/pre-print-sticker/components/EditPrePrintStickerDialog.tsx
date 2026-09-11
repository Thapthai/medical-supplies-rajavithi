'use client';

import { useEffect, useState } from 'react';
import { Loader2, Minus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { getTodayCE } from '@/lib/datePickerBE';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  stickerPrintApi,
  type PrePrintStickerDetailRow,
  type PrePrintStickerDocument,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { isExpireDateValid } from '../utils';

type EditLine = {
  key: string;
  itemcode: string;
  item_name: string;
  expireDate: string;
  copies: number | '';
  lotNo: string;
};

type EditPrePrintStickerDialogProps = {
  open: boolean;
  doc: PrePrintStickerDocument | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: PrePrintStickerDocument) => void;
};

function toYmd(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(iso));
    return m?.[1] ?? '';
  }
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function detailToLine(d: PrePrintStickerDetailRow): EditLine {
  return {
    key: `d-${d.id}`,
    itemcode: d.itemcode,
    item_name: d.item_name ?? d.itemcode,
    expireDate: toYmd(d.expire_date),
    copies: d.copies,
    lotNo: d.lot_no ?? '',
  };
}

export default function EditPrePrintStickerDialog({
  open,
  doc,
  onOpenChange,
  onSuccess,
}: EditPrePrintStickerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [remark, setRemark] = useState('');
  const [lines, setLines] = useState<EditLine[]>([]);

  useEffect(() => {
    if (!open || !doc) return;

    let cancelled = false;
    async function load() {
      setLoadingDetail(true);
      try {
        const res = await stickerPrintApi.getPrePrintSticker(doc!.id);
        if (cancelled) return;
        if (res.success && res.data) {
          setRemark(res.data.remark ?? '');
          setLines((res.data.details ?? []).map(detailToLine));
        } else {
          toast.error(res.message || 'โหลดเอกสารไม่สำเร็จ');
          onOpenChange(false);
        }
      } catch {
        if (!cancelled) {
          toast.error('โหลดเอกสารไม่สำเร็จ');
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, doc, onOpenChange]);

  const updateLine = (key: string, patch: Partial<EditLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleSave = async () => {
    if (!doc) return;
    const payloadLines = lines
      .map((l) => {
        const copies = l.copies === '' ? 0 : Number(l.copies);
        if (!Number.isFinite(copies) || copies < 1) return null;
        const exp = l.expireDate.trim();
        if (!exp) return null;
        return {
          itemcode: l.itemcode,
          item_name: l.item_name,
          copies: Math.floor(copies),
          expire_date: exp,
          ...(l.lotNo.trim() ? { lot_no: l.lotNo.trim().slice(0, 50) } : {}),
        };
      })
      .filter((l): l is NonNullable<typeof l> => l != null);

    if (payloadLines.length === 0) {
      toast.error('ต้องมีอย่างน้อย 1 lot ที่มีจำนวนและวันหมดอายุ');
      return;
    }

    const missingExpire = lines.some(
      (l) => l.copies !== '' && Number(l.copies) >= 1 && !l.expireDate.trim(),
    );
    if (missingExpire) {
      toast.error('กรุณากรอกวันหมดอายุให้ครบทุกรายการที่มีจำนวน');
      return;
    }
    const pastExpire = lines.some(
      (l) =>
        l.copies !== '' &&
        Number(l.copies) >= 1 &&
        l.expireDate.trim() !== '' &&
        !isExpireDateValid(l.expireDate),
    );
    if (pastExpire) {
      toast.error('วันหมดอายุต้องไม่ต่ำกว่าวันที่ปัจจุบัน');
      return;
    }

    try {
      setLoading(true);
      const res = await stickerPrintApi.updatePrePrintSticker(doc.id, {
        remark: remark.trim() || undefined,
        lines: payloadLines,
      });
      if (res.success && res.data) {
        toast.success(res.message || `อัปเดตเอกสาร ${doc.doc_no} สำเร็จ`);
        onSuccess(res.data);
        onOpenChange(false);
      } else {
        toast.error(res.message || 'อัปเดตเอกสารไม่สำเร็จ');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'อัปเดตเอกสารไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl min-w-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>แก้ไขเอกสาร</DialogTitle>
          <DialogDescription>
            {doc ? (
              <>
                เลขที่ <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{doc.doc_no}</code>
              </>
            ) : (
              'แก้ไขรายการ lot ในเอกสาร'
            )}
          </DialogDescription>
        </DialogHeader>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลด…
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
            <div className="space-y-2">
              <Label htmlFor="edit-remark">หมายเหตุ</Label>
              <Textarea
                id="edit-remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="หมายเหตุ (ถ้ามี)"
                className="min-h-[72px] bg-white"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label>รายการ lot ({lines.length})</Label>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>อุปกรณ์</TableHead>
                      <TableHead className="w-[148px]">วันหมดอายุ</TableHead>
                      <TableHead className="w-[88px] text-center">จำนวน</TableHead>
                      <TableHead className="w-[110px]">Lot no.</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          ไม่มีรายการ
                        </TableCell>
                      </TableRow>
                    ) : (
                      lines.map((line) => {
                        const expireError =
                          line.copies !== '' && Number(line.copies) >= 1 && !line.expireDate.trim();
                        return (
                          <TableRow key={line.key} className={cn(expireError && 'bg-red-50/70')}>
                            <TableCell className="min-w-[140px] text-sm">
                              <div className="font-medium text-slate-800">{line.item_name}</div>
                              <code className="text-[11px] text-muted-foreground">{line.itemcode}</code>
                            </TableCell>
                            <TableCell>
                              <div
                                className={cn(
                                  'rounded-md p-0.5 [&_input]:h-8 [&_button]:h-8 [&_button]:w-8',
                                  expireError &&
                                    'ring-2 ring-red-500 [&_input]:border-red-500 [&_button]:border-red-500',
                                )}
                              >
                                <DatePickerBE
                                  id={`edit-expire-${line.key}`}
                                  className="items-center"
                                  popoverPortal
                                  value={line.expireDate}
                                  onChange={(v) => updateLine(line.key, { expireDate: v })}
                                  placeholder="วว/ดด/ปปปป (ค.ศ.)"
                                  minDate={getTodayCE()}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="text"
                                inputMode="numeric"
                                className="mx-auto h-8 w-16 bg-white text-center font-mono text-sm"
                                value={line.copies === '' ? '' : line.copies}
                                onChange={(e) => {
                                  const v = e.target.value.trim();
                                  if (v === '') {
                                    updateLine(line.key, { copies: '' });
                                    return;
                                  }
                                  const n = parseInt(v, 10);
                                  if (!Number.isFinite(n) || n <= 0) {
                                    updateLine(line.key, { copies: '' });
                                    return;
                                  }
                                  updateLine(line.key, { copies: n });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8 bg-white text-sm"
                                value={line.lotNo}
                                maxLength={50}
                                onChange={(e) => updateLine(line.key, { lotNo: e.target.value })}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="ลบ lot"
                                onClick={() => removeLine(line.key)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2 shrink-0 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || loadingDetail || lines.length === 0}
          >
            {loading ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DeletePrePrintStickerDialogProps = {
  open: boolean;
  doc: PrePrintStickerDocument | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: (id: number) => void;
};

export function DeletePrePrintStickerDialog({
  open,
  doc,
  onOpenChange,
  onSuccess,
}: DeletePrePrintStickerDialogProps) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!doc) return;
    try {
      setSaving(true);
      const res = await stickerPrintApi.deletePrePrintSticker(doc.id);
      if (res.success) {
        toast.success(res.message || `ลบเอกสาร ${doc.doc_no} สำเร็จ`);
        onSuccess(doc.id);
        onOpenChange(false);
      } else {
        toast.error(res.message || 'ลบเอกสารไม่สำเร็จ');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'ลบเอกสารไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ยืนยันการลบ</DialogTitle>
          <DialogDescription>
            ต้องการลบเอกสาร{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{doc?.doc_no}</code>{' '}
            และรายการ lot ทั้งหมดหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={saving || !doc}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                กำลังลบ…
              </>
            ) : (
              <>
                <Trash2 className="mr-1 h-4 w-4" />
                ลบเอกสาร
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
