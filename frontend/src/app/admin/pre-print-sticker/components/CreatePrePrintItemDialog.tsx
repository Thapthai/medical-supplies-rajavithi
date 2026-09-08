'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
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
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { itemsApi } from '@/lib/api';
import { joinItemNameWithPrefix } from '@/lib/extractItemBrand';
import type { CreateItemDto } from '@/types/item';

const fieldInputClass = 'bg-white';
const BRAND_CUSTOM = '__custom__';

type CreatePrePrintItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ส่วนหน้าก่อน - / + เช่น "AR40e | Sensar", "A1UL22 | Primus" */
  brands: string[];
  onSuccess: () => void;
};

export default function CreatePrePrintItemDialog({
  open,
  onOpenChange,
  brands,
  onSuccess,
}: CreatePrePrintItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [brandValue, setBrandValue] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [itemNamePart, setItemNamePart] = useState('');

  const brandOptions = useMemo(
    () => [
      ...brands.map((b) => ({ value: b, label: b })),
      { value: BRAND_CUSTOM, label: 'ระบุยี่ห้อใหม่…' },
    ],
    [brands],
  );

  const resolvedBrand =
    brandValue === BRAND_CUSTOM ? customBrand.trim() : brandValue.trim();

  const resetForm = useCallback(() => {
    setBrandValue('');
    setCustomBrand('');
    setItemNamePart('');
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedBrand) {
      toast.error('กรุณาเลือกหรือระบุยี่ห้อ');
      return;
    }
    const namePart = itemNamePart.trim();
    if (namePart.length < 1) {
      toast.error('กรุณากรอกค่ากำลัง / ส่วนท้ายชื่อ');
      return;
    }

    try {
      setLoading(true);
      const codeRes = await itemsApi.getNextUiCode();
      const itemcode = codeRes?.data?.itemcode?.trim();
      if (!codeRes?.success || !itemcode) {
        toast.error(codeRes?.message || 'สร้างรหัสระบบไม่สำเร็จ');
        return;
      }

      const payload: CreateItemDto = {
        itemcode,
        itemname: joinItemNameWithPrefix(resolvedBrand, namePart),
        IsSet: '0',
        IsNormal: '1',
        IsReuse: '1',
        IsCancel: 0,
        item_status: 0,
        IsStock: true,
      };

      const res = await itemsApi.create(payload);
      if (res?.success) {
        toast.success(`เพิ่มอุปกรณ์ ${itemcode} เรียบร้อยแล้ว`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res?.message || 'ไม่สามารถเพิ่มอุปกรณ์ได้');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-lg min-w-0">
        <DialogHeader>
          <DialogTitle>เพิ่มอุปกรณ์ใหม่</DialogTitle>
          <DialogDescription>
            เลือกยี่ห้อ (ส่วนหน้าก่อน - หรือ +) แล้วกรอกค่ากำลัง เช่น 34.0 D หรือ - 3.0 D
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <SearchableSelect
              label="ยี่ห้อ"
              placeholder="เลือกยี่ห้อ เช่น AR40e | Sensar"
              searchPlaceholder="ค้นหายี่ห้อ..."
              value={brandValue}
              onValueChange={setBrandValue}
              options={brandOptions}
              positionMode="floating"
              required
            />
            {brandValue === BRAND_CUSTOM && (
              <Input
                placeholder="เช่น AR40X | Sensar"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                className={fieldInputClass}
                maxLength={100}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="preprint-itemname">
              ค่ากำลัง / ส่วนท้าย <span className="text-red-500">*</span>
            </Label>
            <Input
              id="preprint-itemname"
              placeholder="เช่น 34.0 D หรือ - 3.0 D"
              value={itemNamePart}
              onChange={(e) => setItemNamePart(e.target.value)}
              className={fieldInputClass}
              maxLength={200}
            />
            {resolvedBrand && itemNamePart.trim() ? (
              <p className="text-xs text-muted-foreground">
                ชื่อที่จะบันทึก:{' '}
                <span className="font-medium text-slate-700">
                  {joinItemNameWithPrefix(resolvedBrand, itemNamePart)}
                </span>
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              <Plus className="mr-1 h-4 w-4" />
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
