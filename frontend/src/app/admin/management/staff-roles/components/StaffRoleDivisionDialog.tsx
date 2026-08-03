'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cabinetDepartmentApi, staffPermissionDepartmentApi, staffRoleApi, staffUserApi } from '@/lib/api';
import { Building2, ChevronRight, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { StaffUserDepartmentDialog } from '@/app/admin/management/staff-users/components/StaffUserDepartmentDialog';
import type { StaffUser } from '@/app/admin/management/staff-users/components/types';
import type { StaffRoleRow } from './EditStaffRoleDialog';
import SearchableSelect from '@/app/admin/management/cabinet-departments/components/SearchableSelect';

type RoleDivisionOption = { id: number; label: string };
type CabinetOption = { id: number; label: string };

export interface StaffRoleDivisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: StaffRoleRow | null;
  onSaved?: (patch?: Partial<StaffRoleRow>) => void | Promise<void>;
}

export function StaffRoleDivisionDialog({
  open,
  onOpenChange,
  role,
  onSaved,
}: StaffRoleDivisionDialogProps) {
  const [roleDivisions, setRoleDivisions] = useState<RoleDivisionOption[]>([]);
  const [loadingRoleDivisions, setLoadingRoleDivisions] = useState(false);
  const [defaultDeptId, setDefaultDeptId] = useState('');
  const [savingDefault, setSavingDefault] = useState(false);

  const [cabinetOptions, setCabinetOptions] = useState<CabinetOption[]>([]);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const [defaultCabinetId, setDefaultCabinetId] = useState('');

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [deptOpen, setDeptOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

  /** รวม Division ที่กำหนดให้ Staff ใน Role นี้แล้ว (จากสิทธิ์รายคน) */
  const loadRoleDivisions = useCallback(async (userList: StaffUser[]) => {
    try {
      setLoadingRoleDivisions(true);
      if (userList.length === 0) {
        setRoleDivisions([]);
        return;
      }
      const results = await Promise.all(
        userList.map((u) => staffPermissionDepartmentApi.getByUser({ user_id: u.id })),
      );
      const byId = new Map<number, string>();
      for (const res of results) {
        for (const d of res?.data?.departments ?? []) {
          if (d.id == null || d.id < 1) continue;
          const label = (d.department_name ?? '').trim() || `แผนก #${d.id}`;
          if (!byId.has(d.id)) byId.set(d.id, label);
        }
      }
      setRoleDivisions(
        [...byId.entries()]
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label, 'th')),
      );
    } catch (e) {
      console.error(e);
      toast.error('โหลด Division ของ Role ไม่สำเร็จ');
      setRoleDivisions([]);
    } finally {
      setLoadingRoleDivisions(false);
    }
  }, []);

  const loadUsers = useCallback(
    async (roleId: number) => {
      try {
        setLoadingUsers(true);
        const res = (await staffUserApi.getAllStaffUsers({
          role_id: roleId,
          limit: 5000,
        })) as {
          success?: boolean;
          data?: StaffUser[];
          message?: string;
        };
        if (res?.success === false) {
          toast.error(res.message || 'โหลดผู้ใช้ Staff ไม่สำเร็จ');
          setUsers([]);
          setRoleDivisions([]);
          return;
        }
        const list = Array.isArray(res?.data) ? res.data : [];
        const sorted = [...list].sort((a, b) =>
          `${a.fname} ${a.lname}`.localeCompare(`${b.fname} ${b.lname}`, 'th'),
        );
        setUsers(sorted);
        await loadRoleDivisions(sorted);
      } catch (e) {
        console.error(e);
        toast.error('โหลดผู้ใช้ Staff ไม่สำเร็จ');
        setUsers([]);
        setRoleDivisions([]);
      } finally {
        setLoadingUsers(false);
      }
    },
    [loadRoleDivisions],
  );

  /** ตู้ ACTIVE ที่ผูกกับ Division ที่เลือก เรียงตามชื่อ (th) */
  const loadCabinets = useCallback(async (departmentId: string) => {
    const deptId = departmentId.trim() ? Number(departmentId.trim()) : NaN;
    if (!Number.isInteger(deptId) || deptId < 1) {
      setCabinetOptions([]);
      return;
    }
    try {
      setLoadingCabinets(true);
      const res = await cabinetDepartmentApi.getAll({ departmentId: deptId });
      const mappings = Array.isArray(res?.data) ? res.data : [];
      const byId = new Map<number, string>();
      for (const m of mappings as Array<{
        status?: string;
        cabinet?: { id?: number; cabinet_name?: string | null; cabinet_code?: string | null } | null;
      }>) {
        if (m.status && m.status !== 'ACTIVE') continue;
        const c = m.cabinet;
        if (!c || c.id == null) continue;
        const label = (c.cabinet_name || c.cabinet_code || `ตู้ #${c.id}`).trim();
        if (!byId.has(c.id)) byId.set(c.id, label);
      }
      setCabinetOptions(
        [...byId.entries()]
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label, 'th')),
      );
    } catch (e) {
      console.error(e);
      toast.error('โหลดตู้ Cabinet ของ Division ไม่สำเร็จ');
      setCabinetOptions([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !role) return;
    setSelectedUser(null);
    setDeptOpen(false);
    const initialDeptId =
      role.default_department_id != null && role.default_department_id > 0
        ? String(role.default_department_id)
        : '';
    setDefaultDeptId(initialDeptId);
    setDefaultCabinetId(
      role.default_cabinet_id != null && role.default_cabinet_id > 0
        ? String(role.default_cabinet_id)
        : '',
    );
    void loadUsers(role.id);
    void loadCabinets(initialDeptId);
  }, [open, role, loadUsers, loadCabinets]);

  /** ถ้าค่าที่เคยบันทึกไม่อยู่ในรายการที่เลือกแล้ว — ล้างช่องเลือก */
  useEffect(() => {
    if (loadingUsers || loadingRoleDivisions) return;
    if (!defaultDeptId) return;
    const ok = roleDivisions.some((d) => String(d.id) === defaultDeptId);
    if (!ok) setDefaultDeptId('');
  }, [roleDivisions, loadingUsers, loadingRoleDivisions, defaultDeptId]);

  /** ตู้ที่เลือกไม่อยู่ใน options ของ Division ปัจจุบันแล้ว (เช่นตู้ถูกปลดออกจาก Division) — ล้าง */
  useEffect(() => {
    if (loadingCabinets) return;
    if (!defaultCabinetId) return;
    const ok = cabinetOptions.some((c) => String(c.id) === defaultCabinetId);
    if (!ok) setDefaultCabinetId('');
  }, [cabinetOptions, loadingCabinets, defaultCabinetId]);

  /** ผู้ใช้เปลี่ยน/ล้าง Division เอง — โหลดตู้ใหม่ตาม Division และล้างตู้เดิม (ไม่จำเป็นตรงกับ Division ใหม่) */
  const handleDeptChange = (value: string) => {
    setDefaultDeptId(value);
    setDefaultCabinetId('');
    void loadCabinets(value);
  };

  const departmentOptions = useMemo(
    () =>
      roleDivisions.map((d) => ({
        value: String(d.id),
        label: d.label,
      })),
    [roleDivisions],
  );

  const defaultDeptInitial = useMemo(() => {
    if (!defaultDeptId) return undefined;
    const found = roleDivisions.find((d) => String(d.id) === defaultDeptId);
    if (found) return { label: found.label };
    if (role?.default_department_name) {
      return { label: role.default_department_name };
    }
    return { label: `แผนก #${defaultDeptId}` };
  }, [defaultDeptId, roleDivisions, role?.default_department_name]);

  const cabinetSelectOptions = useMemo(
    () =>
      cabinetOptions.map((c) => ({
        value: String(c.id),
        label: c.label,
      })),
    [cabinetOptions],
  );

  const defaultCabinetInitial = useMemo(() => {
    if (!defaultCabinetId) return undefined;
    const found = cabinetOptions.find((c) => String(c.id) === defaultCabinetId);
    if (found) return { label: found.label };
    if (role?.default_cabinet_name) {
      return { label: role.default_cabinet_name };
    }
    return { label: `ตู้ #${defaultCabinetId}` };
  }, [defaultCabinetId, cabinetOptions, role?.default_cabinet_name]);

  const defaultDirty = useMemo(() => {
    const currentDept =
      role?.default_department_id != null && role.default_department_id > 0
        ? String(role.default_department_id)
        : '';
    const currentCabinet =
      role?.default_cabinet_id != null && role.default_cabinet_id > 0
        ? String(role.default_cabinet_id)
        : '';
    return currentDept !== defaultDeptId || currentCabinet !== defaultCabinetId;
  }, [role?.default_department_id, role?.default_cabinet_id, defaultDeptId, defaultCabinetId]);

  const saveDefaultDepartment = async () => {
    if (!role) return;
    try {
      setSavingDefault(true);
      const nextDeptId = defaultDeptId.trim() ? Number(defaultDeptId) : null;
      if (nextDeptId != null) {
        if (!Number.isInteger(nextDeptId) || nextDeptId < 1) {
          toast.error('Division ไม่ถูกต้อง');
          return;
        }
        if (!roleDivisions.some((d) => d.id === nextDeptId)) {
          toast.error('เลือกได้เฉพาะ Division ที่กำหนดให้ Staff ใน Role นี้แล้ว');
          return;
        }
      }
      const nextCabinetId = defaultCabinetId.trim() ? Number(defaultCabinetId) : null;
      if (nextCabinetId != null) {
        if (!Number.isInteger(nextCabinetId) || nextCabinetId < 1) {
          toast.error('ตู้ Cabinet ไม่ถูกต้อง');
          return;
        }
        if (!nextDeptId) {
          toast.error('เลือก Division ก่อนกำหนดตู้ Cabinet เริ่มต้น');
          return;
        }
        if (!cabinetOptions.some((c) => c.id === nextCabinetId)) {
          toast.error('เลือกได้เฉพาะตู้ ACTIVE ที่ผูกกับ Division นี้');
          return;
        }
      }
      const res = await staffRoleApi.update(role.id, {
        default_department_id: nextDeptId,
        default_cabinet_id: nextCabinetId,
      });
      if (res.success === false) {
        toast.error((res as { message?: string }).message || 'บันทึกไม่สำเร็จ');
        return;
      }
      const data = (res.data ?? {}) as {
        default_department_id?: number | null;
        default_department_name?: string | null;
        default_cabinet_id?: number | null;
        default_cabinet_name?: string | null;
      };
      const deptNameFromList = roleDivisions.find((d) => d.id === nextDeptId)?.label ?? null;
      const cabinetNameFromList = cabinetOptions.find((c) => c.id === nextCabinetId)?.label ?? null;
      toast.success(nextDeptId || nextCabinetId ? 'บันทึกแล้ว' : 'ล้างค่าเริ่มต้นแล้ว');
      await onSaved?.({
        default_department_id: data.default_department_id ?? nextDeptId,
        default_department_name: data.default_department_name ?? deptNameFromList,
        default_cabinet_id: data.default_cabinet_id ?? nextCabinetId,
        default_cabinet_name: data.default_cabinet_name ?? cabinetNameFromList,
      });
    } catch (e) {
      console.error(e);
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setSavingDefault(false);
    }
  };

  const openUserDepartments = (u: StaffUser) => {
    setSelectedUser(u);
    setDeptOpen(true);
  };

  const busy = loadingUsers || loadingRoleDivisions;
  const hasRoleDivisions = roleDivisions.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b px-5 py-3.5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-amber-700" />
              ตั้งค่า Division / ตู้
            </DialogTitle>
            <DialogDescription className="text-sm">
              {role ? (
                <>
                  <span className="font-mono font-medium text-foreground">{role.code}</span>
                  {' · '}
                  {role.name}
                </>
              ) : (
                'เลือก Role'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <section className="space-y-2.5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Division เริ่มต้น</p>
                <p className="text-xs text-slate-500">
                  เลือกได้เฉพาะ Division ที่กำหนดให้ Staff ใน Role นี้แล้ว
                </p>
              </div>

              {!busy && !hasRoleDivisions ? (
                <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/70 px-3 py-3 text-sm text-amber-900">
                  ยังไม่มี Division ใน Role นี้ — กดที่รายชื่อ Staff ด้านล่างเพื่อเลือก Division ก่อน
                </p>
              ) : (
                <SearchableSelect
                  label="Division"
                  placeholder={busy ? 'กำลังโหลด…' : '— ไม่กำหนด —'}
                  value={defaultDeptId}
                  onValueChange={handleDeptChange}
                  options={departmentOptions}
                  loading={busy}
                  searchPlaceholder="ค้นหา Division..."
                  allowClear
                  clearLabel="ไม่กำหนด"
                  initialDisplay={defaultDeptInitial}
                  disabled={!role || savingDefault || busy || !hasRoleDivisions}
                />
              )}
            </section>

            <section className="space-y-2.5">
              <div>
                <p className="text-sm font-semibold text-slate-900">ตู้ Cabinet เริ่มต้น</p>
                <p className="text-xs text-slate-500">
                  เลือกได้เฉพาะตู้ ACTIVE ที่ผูกกับ Division เริ่มต้นด้านบน
                </p>
              </div>

              {!defaultDeptId ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  เลือก Division เริ่มต้นก่อน จึงจะเลือกตู้ Cabinet ได้
                </p>
              ) : !loadingCabinets && cabinetOptions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/70 px-3 py-3 text-sm text-amber-900">
                  Division นี้ยังไม่มีตู้ Cabinet ที่ ACTIVE
                </p>
              ) : (
                <SearchableSelect
                  label="ตู้ Cabinet"
                  placeholder={loadingCabinets ? 'กำลังโหลด…' : '— ไม่กำหนด —'}
                  value={defaultCabinetId}
                  onValueChange={setDefaultCabinetId}
                  options={cabinetSelectOptions}
                  loading={loadingCabinets}
                  searchPlaceholder="ค้นหาตู้..."
                  allowClear
                  clearLabel="ไม่กำหนด"
                  initialDisplay={defaultCabinetInitial}
                  disabled={!role || savingDefault || loadingCabinets || !defaultDeptId}
                />
              )}

              <Button
                type="button"
                className="w-full gap-1.5"
                onClick={() => void saveDefaultDepartment()}
                disabled={!role || !defaultDirty || savingDefault || busy}
              >
                {savingDefault ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                บันทึก
              </Button>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Staff ใน Role นี้</p>
                <span className="text-xs text-slate-500">{users.length} คน</span>
              </div>
              <p className="text-xs text-slate-500">กดที่รายชื่อเพื่อเลือก Division ของคนนั้น</p>

              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
                </div>
              ) : users.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  ยังไม่มี Staff ใน Role นี้
                </p>
              ) : (
                <ul className="overflow-hidden rounded-lg border border-slate-200">
                  {users.map((u) => (
                    <li key={u.id} className="border-b border-slate-100 last:border-b-0">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-amber-50/70"
                        onClick={() => openUserDepartments(u)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {u.fname} {u.lname}
                          </p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <DialogFooter className="shrink-0 border-t px-5 py-3">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StaffUserDepartmentDialog
        open={deptOpen}
        onOpenChange={(o) => {
          setDeptOpen(o);
          if (!o) {
            setSelectedUser(null);
            void loadRoleDivisions(users);
          }
        }}
        user={selectedUser}
      />
    </>
  );
}
