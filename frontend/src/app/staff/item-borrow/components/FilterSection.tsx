'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
  getStaffRoleDefaultCabinetId,
  getStaffRoleDefaultDepartmentId,
  pickDefaultCabinetId,
} from '@/lib/staffDepartmentScope';
import { staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';

function getTodayDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

type Department = {
  ID: number;
  DepName?: string;
  DepName2?: string;
};

type Cabinet = {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
  cabinetDepartments?: Array<{ id: number; department_id: number; status: string }>;
};

type CabinetDepartmentMapping = {
  id: number;
  cabinet_id: number;
  department_id: number;
  status?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
    cabinet_status?: string;
  };
};

export type BorrowFilterState = {
  searchItemCode: string;
  startDate: string;
  endDate: string;
  departmentId: string;
  cabinetId: string;
  borrowDepartmentId: string;
};

function mapCabinetFromMapping(cabinet: CabinetDepartmentMapping['cabinet']): Cabinet | null {
  if (!cabinet || typeof cabinet.id !== 'number') return null;
  return {
    id: cabinet.id,
    cabinet_name: cabinet.cabinet_name,
    cabinet_code: cabinet.cabinet_code,
    cabinet_status: cabinet.cabinet_status,
  };
}

function buildScopedDivisionSummary(depts: Department[]): string {
  const names = depts.map((d) => (d.DepName || '').trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} … (+${names.length - 5})`;
}

function sortCabinets(list: Cabinet[]): Cabinet[] {
  return [...list].sort((a, b) =>
    (a.cabinet_name || a.cabinet_code || String(a.id)).localeCompare(
      b.cabinet_name || b.cabinet_code || String(b.id),
      'th',
    ),
  );
}

type Props = {
  filters: BorrowFilterState;
  appliedFilters: BorrowFilterState;
  onFilterChange: (key: keyof BorrowFilterState, value: string) => void;
  onSearch: (next: BorrowFilterState) => void;
  onClear: (overrides?: Partial<BorrowFilterState>) => void;
  onRefresh: () => void;
  loading: boolean;
  initialDepartmentId?: string;
  departmentDisabled?: boolean;
  initialAutoSearch?: boolean;
};

export default function FilterSection({
  filters,
  appliedFilters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  loading,
  initialDepartmentId,
  departmentDisabled,
  initialAutoSearch = true,
}: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllScopedDepartments, setCanPickAllScopedDepartments] = useState(false);
  const initialSearchDoneRef = useRef(false);
  const [roleDefaultDeptId, setRoleDefaultDeptId] = useState(
    () => initialDepartmentId?.trim() || '',
  );
  const [roleDefaultReady, setRoleDefaultReady] = useState(false);
  /** ตู้ Cabinet เริ่มต้นจาก Role via GET /staff/me/departments */
  const [roleDefaultCabinetId, setRoleDefaultCabinetId] = useState('');
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const scopedDivisionSummary = useMemo(
    () => (canPickAllScopedDepartments ? buildScopedDivisionSummary(departments) : ''),
    [canPickAllScopedDepartments, departments],
  );

  const divisionSelectOptions = useMemo(
    () => [
      ...(canPickAllScopedDepartments
        ? [
            {
              value: '',
              label: 'ทั้งหมด',
              ...(scopedDivisionSummary ? { subLabel: scopedDivisionSummary } : {}),
            },
          ]
        : []),
      ...departments.map((dept) => ({
        value: dept.ID.toString(),
        label: dept.DepName || '',
        subLabel: dept.DepName2 || '',
      })),
    ],
    [canPickAllScopedDepartments, departments, scopedDivisionSummary],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [fromApi, cabinetFromApi] = await Promise.all([
        getStaffRoleDefaultDepartmentId(),
        getStaffRoleDefaultCabinetId(),
      ]);
      if (cancelled) return;
      const next = fromApi || initialDepartmentId?.trim() || '';
      setRoleDefaultDeptId(next);
      setRoleDefaultCabinetId(cabinetFromApi);
      setRoleDefaultReady(true);
      if (next && !filtersRef.current.departmentId.trim()) {
        onFilterChange('departmentId', next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialDepartmentId, onFilterChange]);

  useEffect(() => {
    const d = roleDefaultDeptId.trim();
    if (departmentDisabled) {
      if (filters.departmentId !== d) {
        onFilterChange('departmentId', d);
        onFilterChange('cabinetId', '');
      }
      return;
    }
    if (!d) return;
    if (!filters.departmentId.trim()) {
      onFilterChange('departmentId', d);
    }
  }, [roleDefaultDeptId, departmentDisabled, filters.departmentId, onFilterChange]);

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      setCanPickAllScopedDepartments(Array.isArray(allowed) && allowed.length > 0);
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 200,
        allowedDepartmentIds: allowed,
        withCabinet: true,
      });
      setDepartments(list as Department[]);
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string): Promise<Cabinet[]> => {
    try {
      setLoadingCabinets(true);
      let next: Cabinet[] = [];
      const trimmed = departmentIdStr?.trim() ?? '';
      if (!trimmed) {
        const allowed = allowedDepartmentIdsRef.current;
        if (Array.isArray(allowed) && allowed.length > 0) {
          const results = await Promise.all(
            allowed.map((deptId) =>
              staffCabinetDepartmentApi.getAll({
                departmentId: deptId,
                keyword: keyword || undefined,
              }),
            ),
          );
          const uniqueCabinets = new Map<number, Cabinet>();
          for (const response of results) {
            if (response.success && response.data) {
              const mappings = response.data as CabinetDepartmentMapping[];
              mappings
                .filter((mapping) => mapping.status === 'ACTIVE')
                .forEach((mapping) => {
                  const mapped = mapCabinetFromMapping(mapping.cabinet);
                  if (mapped && !uniqueCabinets.has(mapped.id)) {
                    uniqueCabinets.set(mapped.id, mapped);
                  }
                });
            }
          }
          next = Array.from(uniqueCabinets.values());
        }
        next = sortCabinets(next);
        setCabinets(next);
        return next;
      }
      const deptId = parseInt(trimmed, 10);
      if (Number.isNaN(deptId)) {
        setCabinets([]);
        return [];
      }
      const response = await staffCabinetDepartmentApi.getAll({
        departmentId: deptId,
        keyword: keyword || undefined,
      });
      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const uniqueCabinets = new Map<number, Cabinet>();
        mappings
          .filter((mapping) => mapping.status === 'ACTIVE')
          .forEach((mapping) => {
            const mapped = mapCabinetFromMapping(mapping.cabinet);
            if (mapped && !uniqueCabinets.has(mapped.id)) {
              uniqueCabinets.set(mapped.id, mapped);
            }
          });
        next = Array.from(uniqueCabinets.values());
      }
      next = sortCabinets(next);
      setCabinets(next);
      return next;
    } catch (error) {
      console.error('Failed to load cabinets:', error);
      setCabinets([]);
      return [];
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      setCanPickAllScopedDepartments(Array.isArray(allowed) && allowed.length > 0);
      try {
        setLoadingDepartments(true);
        const list = await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 200,
          allowedDepartmentIds: allowed,
          withCabinet: true,
        });
        if (cancelled) return;
        setDepartments(list as Department[]);
      } catch (error) {
        console.error('Failed to load departments:', error);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
      if (cancelled || departmentDisabled) return;
      const nextDept = clampDepartmentIdString(filtersRef.current.departmentId, allowed, '');
      if (nextDept !== filtersRef.current.departmentId) {
        onFilterChange('departmentId', nextDept);
        onFilterChange('cabinetId', '');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- โหลด scope ครั้งแรก + clamp ค่าเริ่มต้น
  }, [departmentDisabled]);

  useEffect(() => {
    void resolveCabinets(filters.departmentId);
  }, [filters.departmentId, resolveCabinets]);

  const autoCabinetForDeptRef = useRef('');

  /** เมื่อมี Division — ค่าเริ่มต้นตู้ = ตู้ ACTIVE ที่ผูกกับ Division */
  useEffect(() => {
    if (loadingCabinets) return;
    const deptId = filters.departmentId.trim();
    if (!deptId) {
      autoCabinetForDeptRef.current = '';
      return;
    }

    const current = filters.cabinetId.trim();
    const currentOk =
      current !== '' && cabinets.some((c) => String(c.id) === current);
    if (currentOk) {
      autoCabinetForDeptRef.current = deptId;
      return;
    }
    if (cabinets.length === 0) return;

    /** ผู้ใช้เลือก "ทั้งหมด" หลังตั้งค่าเริ่มต้นของ Division นี้แล้ว — ไม่บังคับกลับ */
    if (autoCabinetForDeptRef.current === deptId && current === '') return;

    const defaultCabinetId = pickDefaultCabinetId(cabinets, roleDefaultCabinetId);
    autoCabinetForDeptRef.current = deptId;
    if (filters.cabinetId !== defaultCabinetId) {
      onFilterChange('cabinetId', defaultCabinetId);
    }
  }, [cabinets, loadingCabinets, filters.departmentId, filters.cabinetId, onFilterChange, roleDefaultCabinetId]);

  useEffect(() => {
    if (!initialAutoSearch) return;
    if (initialSearchDoneRef.current) return;
    if (loadingDepartments) return;
    if (!roleDefaultReady) return;

    let cancelled = false;
    (async () => {
      let departmentId = '';

      if (departmentDisabled) {
        departmentId = roleDefaultDeptId.trim();
      } else {
        const allowed = allowedDepartmentIdsRef.current;
        if (allowed === undefined) return;

        const roleDefaultRaw = roleDefaultDeptId.trim();
        const roleDefault = roleDefaultRaw
          ? clampDepartmentIdString(roleDefaultRaw, allowed, roleDefaultRaw)
          : '';

        if (roleDefault) {
          departmentId = roleDefault;
        } else {
          const userScope = Array.isArray(allowed) && allowed.length > 0;
          if (userScope) {
            departmentId = '';
          } else if (departments.length === 1) {
            departmentId = String(departments[0].ID);
          } else {
            /** ไม่มี default + หลายแผนก / ไม่มีแผนก → ค้นหาตามวันที่วันนี้ (เหมือนเดิม) */
            departmentId = '';
          }
        }
      }

      let cabinetId = '';
      if (departmentId) {
        const list = await resolveCabinets(departmentId);
        if (cancelled) return;
        cabinetId = pickDefaultCabinetId(list, roleDefaultCabinetId);
      }

      if (cancelled) return;
      initialSearchDoneRef.current = true;
      const current = filtersRef.current;
      onSearch({
        ...current,
        departmentId,
        cabinetId,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    initialAutoSearch,
    departmentDisabled,
    roleDefaultDeptId,
    roleDefaultCabinetId,
    roleDefaultReady,
    loadingDepartments,
    departments,
    resolveCabinets,
    onSearch,
  ]);

  const handleSearchClick = () => {
    if (!departmentDisabled) {
      const allowed = allowedDepartmentIdsRef.current;
      const scopeAll =
        Array.isArray(allowed) && allowed.length > 0 && !filters.departmentId?.trim();
      if (!filters.departmentId?.trim() && !scopeAll) {
        toast.error('กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อมีการจำกัดแผนกให้คุณ)');
        return;
      }
    }
    onSearch(filters);
  };

  const handleClear = () => {
    const resetDeptId = roleDefaultDeptId.trim();
    const today = getTodayDate();
    void (async () => {
      let cabinetId = '';
      if (resetDeptId) {
        const list = await resolveCabinets(resetDeptId);
        cabinetId = pickDefaultCabinetId(list, roleDefaultCabinetId);
      }
      onClear({
        searchItemCode: '',
        startDate: today,
        endDate: today,
        departmentId: resetDeptId,
        cabinetId,
        borrowDepartmentId: '',
      });
    })();
  };

  const today = getTodayDate();
  const appliedDept = departments.find((d) => d.ID.toString() === appliedFilters.departmentId);
  const appliedBorrowDept = departments.find((d) => d.ID.toString() === appliedFilters.borrowDepartmentId);
  const appliedCabinet = cabinets.find((c) => c.id.toString() === appliedFilters.cabinetId);

  const hasActiveFilters =
    appliedFilters.searchItemCode.trim() !== '' ||
    appliedFilters.departmentId !== '' ||
    appliedFilters.cabinetId !== '' ||
    appliedFilters.borrowDepartmentId !== '' ||
    appliedFilters.startDate !== today ||
    appliedFilters.endDate !== today;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">ค้นหาและกรองรายการยืมอุปกรณ์ (ตามสิทธิ์ของคุณ)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="staff-borrow-item-keyword" className="text-xs font-medium text-slate-600">
              รหัส/ชื่อเวชภัณฑ์
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="staff-borrow-item-keyword"
                placeholder="ค้นหา..."
                value={filters.searchItemCode}
                onChange={(e) => onFilterChange('searchItemCode', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="staff-borrow-start-date" className="text-xs font-medium text-slate-600">
                วันที่เริ่มต้น
              </label>
              <DatePickerBE
                id="staff-borrow-start-date"
                value={filters.startDate}
                onChange={(v) => onFilterChange('startDate', v)}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="staff-borrow-end-date" className="text-xs font-medium text-slate-600">
                วันที่สิ้นสุด
              </label>
              <DatePickerBE
                id="staff-borrow-end-date"
                value={filters.endDate}
                onChange={(v) => onFilterChange('endDate', v)}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SearchableSelect
              label="Division (ที่ตั้งตู้)"
              placeholder={
                canPickAllScopedDepartments
                  ? 'เลือก Division หรือทั้งหมด (ตามสิทธิ์ของคุณ)'
                  : 'เลือก Division (บังคับ)'
              }
              required={!canPickAllScopedDepartments && !roleDefaultDeptId.trim()}
              value={filters.departmentId}
              initialDisplay={
                canPickAllScopedDepartments && !filters.departmentId?.trim()
                  ? {
                      label: 'ทั้งหมด',
                      ...(scopedDivisionSummary ? { subLabel: scopedDivisionSummary } : {}),
                    }
                  : filters.departmentId.trim()
                    ? (() => {
                        const d = departments.find(
                          (x) => String(x.ID) === filters.departmentId.trim(),
                        );
                        return d
                          ? { label: d.DepName || `แผนก #${d.ID}`, subLabel: d.DepName2 || undefined }
                          : undefined;
                      })()
                    : undefined
              }
              onValueChange={(value) => {
                if (departmentDisabled) return;
                onFilterChange('departmentId', value);
                onFilterChange('cabinetId', '');
              }}
              options={divisionSelectOptions}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาชื่อ Division..."
              disabled={departmentDisabled}
              allowClear={canPickAllScopedDepartments || Boolean(roleDefaultDeptId.trim())}
              clearLabel={canPickAllScopedDepartments ? 'ทั้งหมด' : 'ล้างการเลือก'}
            />
            <SearchableSelect
              label="ตู้ Cabinet"
              placeholder={
                filters.departmentId
                  ? 'เลือกตู้'
                  : canPickAllScopedDepartments
                    ? 'เลือกตู้'
                    : 'เลือก Division ก่อน'
              }
              value={filters.cabinetId}
              onValueChange={(value) => onFilterChange('cabinetId', value)}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...cabinets.map((cabinet) => ({
                  value: cabinet.id.toString(),
                  label: cabinet.cabinet_name || '',
                  subLabel: cabinet.cabinet_code || '',
                })),
              ]}
              loading={loadingCabinets}
              onSearch={(searchKeyword) => {
                void resolveCabinets(filters.departmentId, searchKeyword);
              }}
              searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
              disabled={!canPickAllScopedDepartments && !filters.departmentId?.trim()}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <SearchableSelect
              label="Division ที่ยืม"
              placeholder="เลือก Division ที่ยืม"
              value={filters.borrowDepartmentId}
              onValueChange={(value) => onFilterChange('borrowDepartmentId', value)}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...departments.map((dept) => ({
                  value: dept.ID.toString(),
                  label: dept.DepName || '',
                  subLabel: dept.DepName2 || '',
                })),
              ]}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาชื่อ Division ที่ยืม..."
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={handleSearchClick} disabled={loading} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          <Button
            type="button"
            onClick={onRefresh}
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={loading}
            aria-label="รีเฟรช"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {appliedFilters.searchItemCode.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                คำค้น: {appliedFilters.searchItemCode.trim()}
              </span>
            ) : null}
            {appliedFilters.startDate !== today || appliedFilters.endDate !== today ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                วันที่: {appliedFilters.startDate || '—'} – {appliedFilters.endDate || '—'}
              </span>
            ) : null}
            {appliedFilters.departmentId ? (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
                ตู้อยู่ที่: {appliedDept?.DepName || appliedFilters.departmentId}
              </span>
            ) : null}
            {appliedFilters.cabinetId ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  'border-indigo-200 bg-indigo-50 text-indigo-900',
                )}
              >
                ตู้: {appliedCabinet?.cabinet_name || appliedFilters.cabinetId}
              </span>
            ) : null}
            {appliedFilters.borrowDepartmentId ? (
              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900">
                ยืมจาก: {appliedBorrowDept?.DepName || appliedFilters.borrowDepartmentId}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-slate-600"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
