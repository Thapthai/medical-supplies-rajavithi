'use client';

import { useState, useEffect } from 'react';
import { itemsApi } from '@/lib/api';
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
import { AlertCircle } from 'lucide-react';
import type { Item } from '@/types/item';

interface UpdateMinMaxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  cabinetId?: number;
  onSuccess: () => void;
}

/** ค่าในช่องกรอก — เก็บเป็น string เพื่อไม่ติด 0 / ไม่ติด leading zero */
type QtyDraft = { stock_min: string; stock_max: string };

function toDraft(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '';
  return String(Math.max(0, Math.trunc(Number(n))));
}

function parseQty(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  if (!/^\d+$/.test(t)) return null;
  return Number.parseInt(t, 10);
}

/** รับเฉพาะตัวเลข 0–9 — ตัด leading zero (เช่น 011 → 11) ยกเว้นค่า 0 เดี่ยว */
function sanitizeQtyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '';
  return String(Number.parseInt(digits, 10));
}

export default function UpdateMinMaxDialog({
  open,
  onOpenChange,
  item,
  cabinetId,
  onSuccess,
}: UpdateMinMaxDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<QtyDraft>({
    stock_min: '',
    stock_max: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (item && open) {
      setFormData({
        stock_min: toDraft(item.stock_min),
        stock_max: toDraft(item.stock_max),
      });
      setErrors([]);
    }
  }, [item, open]);

  const minParsed = parseQty(formData.stock_min);
  const maxParsed = parseQty(formData.stock_max);
  const currentMin = item?.stock_min ?? 0;
  const currentMax = item?.stock_max ?? 0;
  const hasChange =
    (minParsed != null && minParsed !== currentMin) ||
    (maxParsed != null && maxParsed !== currentMax) ||
    formData.stock_min === '' ||
    formData.stock_max === '';

  const validateForm = (): { ok: boolean; min: number; max: number } => {
    const newErrors: string[] = [];
    const min = parseQty(formData.stock_min);
    const max = parseQty(formData.stock_max);

    if (min == null) newErrors.push('กรุณาระบุ Stock Min เป็นจำนวนเต็ม ≥ 0');
    if (max == null) newErrors.push('กรุณาระบุ Stock Max เป็นจำนวนเต็ม ≥ 0');
    if (min != null && max != null && max < min) {
      newErrors.push('Stock Max ต้องมากกว่าหรือเท่ากับ Stock Min');
    }

    setErrors(newErrors);
    if (newErrors.length > 0 || min == null || max == null) {
      return { ok: false, min: min ?? 0, max: max ?? 0 };
    }
    return { ok: true, min, max };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { ok, min, max } = validateForm();
    if (!ok) return;

    if (!item?.itemcode) {
      toast.error('ไม่พบข้อมูลสินค้า');
      return;
    }

    if (cabinetId == null || Number.isNaN(cabinetId)) {
      toast.error('กรุณาเลือกตู้ก่อนจึงจะบันทึก Min/Max ได้');
      return;
    }

    try {
      setLoading(true);
      const response = await itemsApi.updateMinMax(
        item.itemcode,
        { stock_min: min, stock_max: max },
        cabinetId,
      );

      if (response.success) {
        toast.success('อัปเดต Min/Max ต่อตู้สำเร็จ');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'อัปเดต Min/Max ไม่สำเร็จ');
      }
    } catch (error: any) {
      console.error('Update min/max error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดต');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>อัปเดต Min/Max</DialogTitle>
          <DialogDescription>
            ตั้งค่าจำนวนขั้นต่ำและสูงสุดของสินค้าต่อตู้ (ต้องเลือกตู้ก่อนจึงจะบันทึกได้)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(cabinetId == null || Number.isNaN(cabinetId)) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                กรุณาเลือกตู้ใน Filter ด้านบนก่อน จึงจะบันทึก Min/Max ได้
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-lg space-y-2">
            <div className="text-sm">
              <span className="text-gray-600">รหัส: </span>
              <code className="text-xs bg-white px-2 py-1 rounded">{item?.itemcode}</code>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">ชื่อ: </span>
              <span className="font-medium">{item?.itemname}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Stock Balance: </span>
              <span className="font-bold text-green-600">
                {item?.stock_balance?.toLocaleString() ?? 0}
              </span>
            </div>
            <div className="flex items-center space-x-4 pt-2 border-t border-blue-200">
              <div className="text-sm">
                <span className="text-gray-600">Min ปัจจุบัน: </span>
                <span className="font-bold text-blue-600">{currentMin}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Max ปัจจุบัน: </span>
                <span className="font-bold text-blue-600">{currentMax}</span>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  {errors.map((error, idx) => (
                    <p key={idx} className="text-sm text-red-600">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock_min">
                Stock Min <span className="text-red-500">*</span>
              </Label>
              <Input
                id="stock_min"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="เช่น 5"
                value={formData.stock_min}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    stock_min: sanitizeQtyInput(e.target.value),
                  }))
                }
                className="font-medium tabular-nums"
              />
              <p className="text-xs text-gray-500 mt-1">จำนวนขั้นต่ำ</p>
            </div>

            <div>
              <Label htmlFor="stock_max">
                Stock Max <span className="text-red-500">*</span>
              </Label>
              <Input
                id="stock_max"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="เช่น 20"
                value={formData.stock_max}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    stock_max: sanitizeQtyInput(e.target.value),
                  }))
                }
                className="font-medium tabular-nums"
              />
              <p className="text-xs text-gray-500 mt-1">จำนวนสูงสุด</p>
            </div>
          </div>

          {hasChange && minParsed != null && maxParsed != null && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm font-medium text-yellow-800 mb-1">การเปลี่ยนแปลง:</p>
              <div className="space-y-1">
                {minParsed !== currentMin && (
                  <p className="text-xs text-yellow-700">
                    • Stock Min:{' '}
                    <span className="line-through">{currentMin}</span> →{' '}
                    <span className="font-bold">{minParsed}</span>
                  </p>
                )}
                {maxParsed !== currentMax && (
                  <p className="text-xs text-yellow-700">
                    • Stock Max:{' '}
                    <span className="line-through">{currentMax}</span> →{' '}
                    <span className="font-bold">{maxParsed}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={loading || cabinetId == null || Number.isNaN(cabinetId)}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
