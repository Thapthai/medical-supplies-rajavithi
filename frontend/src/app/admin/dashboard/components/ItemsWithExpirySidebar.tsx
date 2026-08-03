'use client';

import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarClock, Package, Loader2, ChevronLeft, ChevronRight, AlertCircle, Minus, Plus } from 'lucide-react';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';

export interface ItemWithExpiry {
  RowID: number;
  ItemCode: string | null;
  itemname: string | null;
  ExpireDate: string | null;
  วันหมดอายุ: string | null;
  RfidCode: string | null;
  cabinet_name?: string;
  cabinet_code?: string;
  department_name?: string;
}

const EXPIRY_ITEMS_PER_PAGE = 5;
const EXPIRY_ALERT_DAYS_KEY = 'dashboard-expiry-alert-days';
const DEFAULT_ALERT_DAYS = 7;
const MIN_ALERT_DAYS = 1;
const MAX_ALERT_DAYS = 365;
/** ตัวเลือกเร็วที่ลูกค้าใช้บ่อย */
const ALERT_DAY_PRESETS = [7, 14, 30, 60, 90] as const;

interface ItemsWithExpirySidebarProps {
  itemsWithExpiry: ItemWithExpiry[];
  expiredCount: number;
  /** @deprecated นับจากรายการตามวันที่ตั้งแจ้งเตือนแทน — เก็บไว้เพื่อเข้ากันกับ page เดิม */
  nearExpire7Days?: number;
  loading?: boolean;
}

function clampAlertDays(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ALERT_DAYS;
  return Math.min(MAX_ALERT_DAYS, Math.max(MIN_ALERT_DAYS, Math.round(value)));
}

function readStoredAlertDays(): number {
  if (typeof window === 'undefined') return DEFAULT_ALERT_DAYS;
  try {
    const raw = localStorage.getItem(EXPIRY_ALERT_DAYS_KEY);
    if (!raw) return DEFAULT_ALERT_DAYS;
    return clampAlertDays(Number(raw));
  } catch {
    return DEFAULT_ALERT_DAYS;
  }
}

function getExpiryRaw(item: ItemWithExpiry): string | null {
  return item.ExpireDate ?? item.วันหมดอายุ;
}

function getDaysLeft(expireDate: string | null): number | null {
  if (!expireDate) return null;
  const exp = new Date(expireDate);
  if (Number.isNaN(exp.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? diff : null;
}

function formatExpiryLabel(daysLeft: number | null): string {
  if (daysLeft === null) return '-';
  if (daysLeft < 0) return 'หมดอายุแล้ว';
  if (daysLeft === 0) return 'หมดอายุวันนี้';
  return `เหลือ ${daysLeft} วัน`;
}

function splitExpiryLists(items: ItemWithExpiry[], alertDays: number) {
  const expired: ItemWithExpiry[] = [];
  const near: ItemWithExpiry[] = [];
  for (const item of items) {
    const d = getDaysLeft(getExpiryRaw(item));
    if (d === null) continue;
    if (d <= 0) expired.push(item);
    else if (d >= 1 && d <= alertDays) near.push(item);
  }
  return { expired, near };
}

type ExpiryRowProps = {
  item: ItemWithExpiry;
  variant: 'expired' | 'near';
};

function ExpiryRow({ item, variant }: ExpiryRowProps) {
  const daysLeft = getDaysLeft(getExpiryRaw(item));
  const isUrgentNear = variant === 'near' && daysLeft !== null && daysLeft <= 3;
  const isExpired = variant === 'expired';

  return (
    <div
      className={`rounded-xl border p-3 transition-shadow hover:shadow-md shrink-0 ${isExpired
          ? 'border-red-200 bg-red-50/80'
          : isUrgentNear
            ? 'border-amber-200 bg-amber-50/80'
            : 'border-slate-200 bg-slate-50/50'
        }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isExpired ? 'bg-red-600 text-white' : isUrgentNear ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'
            }`}
        >
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate" title={item.itemname ?? undefined}>
            {item.itemname || item.ItemCode || '-'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {item.department_name || item.cabinet_name || item.ItemCode || '-'}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className={`text-xs font-medium ${isExpired ? 'text-red-700' : isUrgentNear ? 'text-amber-700' : 'text-slate-600'
                }`}
            >
              {formatExpiryLabel(daysLeft)}
            </span>
            <span className="text-xs text-slate-400 shrink-0">
              {item.วันหมดอายุ || (item.ExpireDate ? formatUtcDateTime(item.ExpireDate) : '-')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type ExpiryListCardProps = {
  icon: ReactNode;
  items: ItemWithExpiry[];
  emptyLabel: string;
  listKey: 'expired' | 'near';
};

function ExpiryListCard({ icon, items, emptyLabel, listKey }: ExpiryListCardProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / EXPIRY_ITEMS_PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [items.length, listKey]);

  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * EXPIRY_ITEMS_PER_PAGE;
  const paginated = items.slice(startIdx, startIdx + EXPIRY_ITEMS_PER_PAGE);

  return (
    <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">{icon}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1 min-h-0 flex flex-col overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            {emptyLabel}
          </div>
        ) : (
          <>
            <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
              {paginated.map((item) => (
                <ExpiryRow key={`${listKey}-${item.RowID}-${item.ItemCode}`} item={item} variant={listKey} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="shrink-0 flex items-center justify-between border-t pt-3 mt-3">
                <span className="text-xs text-slate-500">
                  หน้า {safePage} จาก {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
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

export default function ItemsWithExpirySidebar({
  itemsWithExpiry,
  expiredCount,
  loading = false,
}: ItemsWithExpirySidebarProps) {
  const [alertDays, setAlertDays] = useState(DEFAULT_ALERT_DAYS);
  const [daysInput, setDaysInput] = useState(String(DEFAULT_ALERT_DAYS));

  useEffect(() => {
    const stored = readStoredAlertDays();
    setAlertDays(stored);
    setDaysInput(String(stored));
  }, []);

  const commitAlertDays = (raw: string | number) => {
    const next = clampAlertDays(typeof raw === 'number' ? raw : Number(raw));
    setAlertDays(next);
    setDaysInput(String(next));
    try {
      localStorage.setItem(EXPIRY_ALERT_DAYS_KEY, String(next));
    } catch {
      /* ignore quota / private mode */
    }
  };

  const { expired, near } = useMemo(
    () => splitExpiryLists(itemsWithExpiry, alertDays),
    [itemsWithExpiry, alertDays],
  );

  const displayExpiredCount = itemsWithExpiry.length > 0 ? expired.length : expiredCount;
  const displayNearCount = near.length;

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 gap-4">
        <Card className="bg-amber-50 border border-amber-200/80 overflow-hidden shrink-0 gap-0 py-4">
          <CardContent className="pt-2 pb-2 px-4">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardContent className="py-8 flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </CardContent>
        </Card>
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardContent className="py-8 flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <Card className="bg-amber-50 border border-amber-200/80 text-slate-900 overflow-hidden shadow-sm shrink-0 relative gap-2 py-4">
        <CardHeader className="relative space-y-0 pb-0 px-4">
          <CardTitle className="text-sm font-semibold text-amber-900">อุปกรณ์ใกล้หมดอายุ</CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-3 px-4">
          <div className="rounded-xl bg-white text-slate-800 p-3 border border-slate-200 space-y-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-900">ตั้งค่าแจ้งเตือน</p>
              <p className="text-xs text-slate-500 mt-0.5">
                แสดงรายการที่จะหมดอายุภายในกี่วันข้างหน้า
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ALERT_DAY_PRESETS.map((days) => {
                const active = alertDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => commitAlertDays(days)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {days} วัน
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">หรือระบุเอง</span>
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-none px-0 text-slate-600 hover:bg-slate-200"
                  onClick={() => commitAlertDays(alertDays - 1)}
                  disabled={alertDays <= MIN_ALERT_DAYS}
                  aria-label="ลดจำนวนวัน"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Input
                  type="number"
                  min={MIN_ALERT_DAYS}
                  max={MAX_ALERT_DAYS}
                  inputMode="numeric"
                  value={daysInput}
                  onChange={(e) => setDaysInput(e.target.value)}
                  onBlur={() => commitAlertDays(daysInput)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  className="h-8 w-14 border-0 bg-transparent text-center text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0 rounded-none px-1"
                  aria-label="จำนวนวันแจ้งเตือนใกล้หมดอายุ"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-none px-0 text-slate-600 hover:bg-slate-200"
                  onClick={() => commitAlertDays(alertDays + 1)}
                  disabled={alertDays >= MAX_ALERT_DAYS}
                  aria-label="เพิ่มจำนวนวัน"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <span className="text-xs text-slate-500">วัน</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="rounded-lg bg-white border border-red-200 px-3 py-2 min-w-[7.5rem]">
              <p className="text-[11px] text-red-700/80 leading-none mb-1">หมดอายุแล้ว</p>
              <p className="text-xl font-bold tabular-nums leading-none text-red-700">{displayExpiredCount}</p>
            </div>
            <div className="rounded-lg bg-white border border-amber-300 px-3 py-2 min-w-[7.5rem]">
              <p className="text-[11px] text-amber-800/80 leading-none mb-1">ใกล้หมดอายุ ({alertDays} วัน)</p>
              <p className="text-xl font-bold tabular-nums leading-none text-amber-800">{displayNearCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <ExpiryListCard
          icon={
            <>
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span>รายการหมดอายุแล้ว</span>
            </>
          }
          items={expired}
          emptyLabel="ไม่มีรายการหมดอายุ"
          listKey="expired"
        />
        <ExpiryListCard
          icon={
            <>
              <CalendarClock className="h-4 w-4 text-amber-600" />
              <span>จะหมดอายุใน {alertDays} วันข้างหน้า</span>
            </>
          }
          items={near}
          emptyLabel={`ไม่มีรายการที่จะหมดอายุใน ${alertDays} วันข้างหน้า`}
          listKey="near"
        />
      </div>
    </div>
  );
}
