'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import SearchableSelect from '@/app/staff/items/components/SearchableSelect';
import { staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
  getStaffRoleDefaultCabinetId,
  getStaffRoleDefaultDepartmentId,
  pickDefaultCabinetId,
  resolveStaffInitialDepartmentId,
  sortCabinetsByName,
} from '@/lib/staffDepartmentScope';
import { cn } from '@/lib/utils';

type Department = { ID: number; DepName?: string; DepName2?: string };

type Cabinet = {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
};

type CabinetDepartmentMapping = {
  id: number;
  cabinet_id: number;
  department_id: number;
  status?: string;
  cabinet?: Cabinet;
};

function mapCabinetFromMapping(cabinet: CabinetDepartmentMapping['cabinet']): Cabinet | null {
  if (!cabinet || typeof cabinet.id !== 'number') return null;
  return cabinet;
}

function buildRoleScopeDivisionSummary(depts: Department[]): string {
  const names = depts.map((d) => (d.DepName || '').trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} … (+${names.length - 5})`;
}

type PrintStickerFilterSectionProps = {
  mode: 'auto' | 'manual';
  departmentId: string;
  cabinetId: string;
  cabinetStockId: number | null;
  onDepartmentIdChange: (value: string) => void;
  onCabinetIdChange: (value: string) => void;
};

export default function PrintStickerFilterSection({
  mode,
  departmentId,
  cabinetId,
  cabinetStockId,
  onDepartmentIdChange,
  onCabinetIdChange,
}: PrintStickerFilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllRoleDepartments, setCanPickAllRoleDepartments] = useState(false);
  const [roleDefaultDeptId, setRoleDefaultDeptId] = useState('');
  const [roleDefaultReady, setRoleDefaultReady] = useState(false);
  /** ตู้ Cabinet เริ่มต้นจาก Role via GET /staff/me/departments */
  const [roleDefaultCabinetId, setRoleDefaultCabinetId] = useState('');
  const autoCabinetForDeptRef = useRef('');
  const departmentIdRef = useRef(departmentId);
  const cabinetIdRef = useRef(cabinetId);
  const defaultsAppliedRef = useRef(false);
  departmentIdRef.current = departmentId;
  cabinetIdRef.current = cabinetId;

  const roleScopeDivisionSummary = useMemo(
    () => (canPickAllRoleDepartments ? buildRoleScopeDivisionSummary(departments) : ''),
    [canPickAllRoleDepartments, departments],
  );

  const divisionSelectOptions = useMemo(
    () => [
      ...(canPickAllRoleDepartments
        ? [
            {
              value: '',
              label: 'ทั้งหมด',
              ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
            },
          ]
        : []),
      ...departments.map((dept) => ({
        value: dept.ID.toString(),
        label: dept.DepName || '',
        subLabel: dept.DepName2 || '',
      })),
    ],
    [canPickAllRoleDepartments, departments, roleScopeDivisionSummary],
  );

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 50,
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

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string) => {
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
          const unique = new Map<number, Cabinet>();
          for (const response of results) {
            if (response.success && response.data) {
              const mappings = response.data as CabinetDepartmentMapping[];
              mappings
                .filter((m) => m.status === 'ACTIVE')
                .forEach((m) => {
                  const mapped = mapCabinetFromMapping(m.cabinet);
                  if (mapped && !unique.has(mapped.id)) unique.set(mapped.id, mapped);
                });
            }
          }
          next = Array.from(unique.values());
        }
        next = sortCabinetsByName(next);
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
        const unique = new Map<number, Cabinet>();
        mappings
          .filter((m) => m.status === 'ACTIVE')
          .forEach((m) => {
            const mapped = mapCabinetFromMapping(m.cabinet);
            if (mapped && !unique.has(mapped.id)) unique.set(mapped.id, mapped);
          });
        next = Array.from(unique.values());
      }
      next = sortCabinetsByName(next);
      setCabinets(next);
      return next;
    } catch {
      setCabinets([]);
      return [];
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [fromApi, cabinetFromApi] = await Promise.all([
        getStaffRoleDefaultDepartmentId(),
        getStaffRoleDefaultCabinetId(),
      ]);
      if (cancelled) return;
      setRoleDefaultDeptId(fromApi);
      setRoleDefaultCabinetId(cabinetFromApi);
      setRoleDefaultReady(true);
      if (fromApi && !departmentIdRef.current.trim()) {
        onDepartmentIdChange(fromApi);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onDepartmentIdChange]);

  useEffect(() => {
    const d = roleDefaultDeptId.trim();
    if (!d) return;
    if (!departmentId.trim()) {
      onDepartmentIdChange(d);
    }
  }, [roleDefaultDeptId, departmentId, onDepartmentIdChange]);

  useEffect(() => {
    if (!roleDefaultReady || defaultsAppliedRef.current) return;
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      try {
        setLoadingDepartments(true);
        const list = await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 50,
          allowedDepartmentIds: allowed,
          withCabinet: true,
        });
        if (cancelled) return;
        setDepartments(list as Department[]);

        const nextDept = resolveStaffInitialDepartmentId({
          roleDefaultDeptId: roleDefaultDeptId.trim(),
          allowed,
          departments: list as Department[],
        });

        defaultsAppliedRef.current = true;

        if (nextDept !== departmentIdRef.current) {
          onDepartmentIdChange(nextDept);
          onCabinetIdChange('');
        } else {
          const clamped = clampDepartmentIdString(departmentIdRef.current, allowed, '');
          if (clamped !== departmentIdRef.current) {
            onDepartmentIdChange(clamped);
            onCabinetIdChange('');
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply role default once
  }, [roleDefaultReady, roleDefaultDeptId, onDepartmentIdChange, onCabinetIdChange]);

  useEffect(() => {
    void resolveCabinets(departmentId);
  }, [departmentId, resolveCabinets]);

  useEffect(() => {
    if (loadingCabinets) return;
    const deptId = departmentId.trim();
    if (!deptId) {
      autoCabinetForDeptRef.current = '';
      return;
    }

    const current = cabinetId.trim();
    const currentOk = current !== '' && cabinets.some((c) => String(c.id) === current);
    if (currentOk) {
      autoCabinetForDeptRef.current = deptId;
      return;
    }
    if (cabinets.length === 0) return;
    if (autoCabinetForDeptRef.current === deptId && current === '') return;

    const defaultCabinetId = pickDefaultCabinetId(cabinets, roleDefaultCabinetId);
    autoCabinetForDeptRef.current = deptId;
    if (cabinetId !== defaultCabinetId) {
      onCabinetIdChange(defaultCabinetId);
    }
  }, [cabinets, loadingCabinets, departmentId, cabinetId, onCabinetIdChange, roleDefaultCabinetId]);

  useEffect(() => {
    if (cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === cabinetId);
      if (!exists) onCabinetIdChange('');
    }
  }, [cabinets, cabinetId, onCabinetIdChange]);

  const cabinetSelectEnabled = Boolean(departmentId?.trim()) || canPickAllRoleDepartments;
  const divisionRequired = mode === 'auto' || !canPickAllRoleDepartments;

  const cabOptions = [
    { value: '', label: 'ทั้งหมด' },
    ...cabinets.map((c) => ({
      value: String(c.id),
      label: c.cabinet_name || c.cabinet_code || 'ตู้',
      subLabel: c.cabinet_code || undefined,
    })),
  ];

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-4 transition-colors sm:px-5',
        mode === 'auto' ? 'border-amber-200/90 bg-amber-50/40' : 'border-slate-200 bg-slate-50/60',
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-lg bg-amber-100 p-2">
          <Search className="h-4 w-4 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {mode === 'auto' ? 'ระบุ Division และตู้' : 'กรองตู้ (ตาม role)'}
          </p>
          <p className="text-xs text-slate-500">แสดงเฉพาะ Division และตู้ที่ role อนุญาต</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SearchableSelect
          label="Division"
          placeholder={
            canPickAllRoleDepartments
              ? 'เลือก Division หรือทั้งหมด (ตาม role)'
              : 'เลือก Division (บังคับ)'
          }
          required={divisionRequired}
          value={departmentId}
          initialDisplay={
            canPickAllRoleDepartments && !departmentId?.trim()
              ? {
                  label: 'ทั้งหมด',
                  ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
                }
              : undefined
          }
          onValueChange={(value) => {
            onDepartmentIdChange(value);
            onCabinetIdChange('');
          }}
          options={divisionSelectOptions}
          loading={loadingDepartments}
          onSearch={loadDepartments}
          searchPlaceholder="ค้นหา Division..."
        />

        <SearchableSelect
          label="ตู้ Cabinet"
          placeholder={
            cabinetSelectEnabled
              ? mode === 'auto'
                ? 'เลือกตู้ (บังคับ)'
                : 'เลือกตู้ (ไม่บังคับ)'
              : 'กรุณาเลือก Division ก่อน'
          }
          required={mode === 'auto'}
          value={cabinetId}
          disabled={!cabinetSelectEnabled}
          onValueChange={onCabinetIdChange}
          options={cabOptions}
          loading={loadingCabinets}
          onSearch={(kw) => void resolveCabinets(departmentId, kw)}
          searchPlaceholder={
            cabinetSelectEnabled ? 'ค้นหารหัสหรือชื่อตู้...' : 'กรุณาเลือก Division ก่อน'
          }
        />
      </div>

      {(mode === 'auto' || cabinetId) && (
        <div className="mt-3 rounded-md bg-background/80 px-3 py-2 text-xs text-muted-foreground">
          {cabinetStockId != null ? (
            <span>
              Stock ID ตู้:{' '}
              <span className="font-mono font-medium text-slate-800">{cabinetStockId}</span>
            </span>
          ) : cabinetId ? (
            <span className="text-amber-800">กำลังโหลด Stock ID...</span>
          ) : mode === 'auto' ? (
            <span>เลือกตู้เมื่อเลือก Division แล้ว</span>
          ) : null}
        </div>
      )}

      {mode === 'manual' && departmentId && !cabinetId && (
        <p className="mt-2 text-xs font-medium text-amber-900">
          เลือกตู้เพื่อโหลดรายการเวชภัณฑ์ในตู้
        </p>
      )}
    </div>
  );
}
