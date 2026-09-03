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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { departmentApi, itemsApi } from '@/lib/api';
import type { CreateItemDto } from '@/types/item';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';
const BRAND_CUSTOM = '__custom__';
const BRAND_SEPARATOR = ' + ';

type ItemKind = 'rfid' | 'normal' | 'weight';

type CreatePrePrintItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const [loadingCode, setLoadingCode] = useState(false);
  const [itemcode, setItemcode] = useState('');
  const [itemKind, setItemKind] = useState<ItemKind>('rfid');
  const [brandValue, setBrandValue] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [itemNamePart, setItemNamePart] = useState('');
  const [itemTypeId, setItemTypeId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [vendor, setVendor] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [isSet, setIsSet] = useState(false);

  const [itemTypes, setItemTypes] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [departments, setDepartments] = useState<
    Array<{ ID: number; DepName?: string | null; DepName2?: string | null }>
  >([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

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
    setItemKind('rfid');
    setBrandValue('');
    setCustomBrand('');
    setItemNamePart('');
    setItemTypeId('');
    setCostPrice('');
    setSalePrice('');
    setVendor('');
    setWarehouseId('');
    setIsSet(false);
  }, []);

  const loadNextCode = useCallback(async () => {
    setLoadingCode(true);
    try {
      const res = await itemsApi.getNextUiCode();
      if (res?.success && res.data?.itemcode) {
        setItemcode(res.data.itemcode);
      } else {
        setItemcode('');
        toast.error(res?.message || 'สร้างรหัสระบบไม่สำเร็จ');
      }
    } catch {
      setItemcode('');
      toast.error('สร้างรหัสระบบไม่สำเร็จ');
    } finally {
      setLoadingCode(false);
    }
  }, []);

  const loadItemTypes = useCallback(async (keyword?: string) => {
    setLoadingTypes(true);
    try {
      const res = await itemsApi.getItemTypes(keyword);
      setItemTypes(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setItemTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  const loadDepartments = useCallback(async (keyword?: string) => {
    setLoadingDepts(true);
    try {
      const res = await departmentApi.getAll({
        limit: 100,
        keyword: keyword?.trim() || undefined,
      });
      if (res?.success && Array.isArray(res.data)) {
        setDepartments(res.data);
      } else {
        setDepartments([]);
      }
    } catch {
      setDepartments([]);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    void loadNextCode();
    void loadItemTypes();
    void loadDepartments();
  }, [open, resetForm, loadNextCode, loadItemTypes, loadDepartments]);

  const parseMoney = (raw: string): number | undefined => {
    const v = raw.trim();
    if (v === '') return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return n;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemcode.trim()) {
      toast.error('ยังไม่มีรหัสระบบ');
      return;
    }
    if (!resolvedBrand) {
      toast.error('กรุณาเลือกหรือระบุยี่ห้อ');
      return;
    }
    const namePart = itemNamePart.trim();
    if (namePart.length < 1) {
      toast.error('กรุณากรอกชื่ออุปกรณ์');
      return;
    }

    const fullName = `${resolvedBrand}${BRAND_SEPARATOR}${namePart}`;
    const cost = parseMoney(costPrice);
    const sale = parseMoney(salePrice);
    const typeId = itemTypeId ? parseInt(itemTypeId, 10) : undefined;
    const whId = warehouseId ? parseInt(warehouseId, 10) : undefined;

    try {
      setLoading(true);
      const payload: CreateItemDto = {
        itemcode: itemcode.trim(),
        itemname: fullName,
        IsSet: isSet ? '1' : '0',
        IsNormal: itemKind === 'normal' ? '1' : '0',
        IsSpecial: itemKind === 'weight' ? '1' : '0',
        IsCancel: 0,
        item_status: 0,
        IsStock: true,
      };
      if (typeId && Number.isFinite(typeId)) payload.itemtypeID = typeId;
      if (cost != null) payload.CostPrice = cost;
      if (sale != null) payload.SalePrice = sale;
      if (vendor.trim()) payload.SuplierName = vendor.trim();
      if (whId && Number.isFinite(whId) && whId > 0) {
        payload.DepartmentID = whId;
        payload.warehouseID = whId;
      }

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
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl min-w-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>เพิ่มอุปกรณ์ใหม่</DialogTitle>
          <DialogDescription>
            สร้างรายการอุปกรณ์สำหรับเตรียมพิมพ์สติ๊กเกอร์ — รหัสระบบจะถูกสร้างให้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
            {/* Row 1: code + kind */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preprint-itemcode">รหัสอุปกรณ์(ระบบ)</Label>
                <Input
                  id="preprint-itemcode"
                  value={loadingCode ? 'กำลังสร้างรหัส…' : itemcode}
                  readOnly
                  disabled
                  className="bg-slate-100 font-mono text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>ประเภทการระบุ</Label>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  {(
                    [
                      { value: 'rfid', label: 'RFID' },
                      { value: 'normal', label: 'ธรรมดา' },
                      { value: 'weight', label: 'Weight (น้ำหนัก)' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="itemKind"
                        className="h-4 w-4 accent-violet-600"
                        checked={itemKind === opt.value}
                        onChange={() => setItemKind(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: brand + name + type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <SearchableSelect
                  label="ยี่ห้อ"
                  placeholder="เลือกยี่ห้อ"
                  searchPlaceholder="ค้นหายี่ห้อ..."
                  value={brandValue}
                  onValueChange={setBrandValue}
                  options={brandOptions}
                  positionMode="floating"
                  required
                />
                {brandValue === BRAND_CUSTOM && (
                  <Input
                    placeholder="พิมพ์ยี่ห้อใหม่"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    className={fieldInputClass}
                    maxLength={100}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="preprint-itemname">
                  ชื่ออุปกรณ์ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="preprint-itemname"
                  placeholder="ชื่อรายการ"
                  value={itemNamePart}
                  onChange={(e) => setItemNamePart(e.target.value)}
                  className={fieldInputClass}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label>ประเภทอุปกรณ์</Label>
                <Select value={itemTypeId || undefined} onValueChange={setItemTypeId}>
                  <SelectTrigger className={cn('w-full', fieldInputClass)}>
                    <SelectValue placeholder="เลือกประเภทอุปกรณ์" />
                  </SelectTrigger>
                  <SelectContent className="z-[100050]" position="popper">
                    {loadingTypes ? (
                      <SelectItem value="__loading" disabled>
                        กำลังโหลด…
                      </SelectItem>
                    ) : itemTypes.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        ไม่พบประเภท
                      </SelectItem>
                    ) : (
                      itemTypes.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: prices + vendor + warehouse */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="preprint-cost">ราคาต้นทุน</Label>
                <Input
                  id="preprint-cost"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className={fieldInputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preprint-sale">ราคาขาย</Label>
                <Input
                  id="preprint-sale"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className={fieldInputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preprint-vendor">Vendor(ผู้ขาย)</Label>
                <Input
                  id="preprint-vendor"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className={fieldInputClass}
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <SearchableSelect
                  label="คลัง"
                  placeholder="เลือกคลัง"
                  searchPlaceholder="ค้นหาคลัง..."
                  value={warehouseId}
                  onValueChange={setWarehouseId}
                  options={departments.map((d) => ({
                    value: String(d.ID),
                    label: d.DepName || `คลัง #${d.ID}`,
                    subLabel: d.DepName2 || undefined,
                  }))}
                  loading={loadingDepts}
                  onSearch={loadDepartments}
                  positionMode="floating"
                  allowClear
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="preprint-isset"
                checked={isSet}
                onCheckedChange={(v) => setIsSet(v === true)}
              />
              <Label htmlFor="preprint-isset" className="cursor-pointer font-normal">
                ค่าใช้จ่ายคิดเป็น Set
              </Label>
            </div>
          </div>

          <DialogFooter className="mt-2 shrink-0 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || loadingCode || !itemcode}>
              <Plus className="mr-1 h-4 w-4" />
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
