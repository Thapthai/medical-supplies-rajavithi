import { fetchStaffMeDepartments } from '@/lib/staffApi/staffMeApi';

export type StaffMeDepartmentRow = {
  ID: number;
  DepName?: string | null;
  DepName2?: string | null;
  RefDepID?: string | null;
};

type MeScopeCache = {
  staffUserId: number;
  unrestricted: boolean;
  allowedIds: number[] | null;
  departments: StaffMeDepartmentRow[];
  defaultDepartmentId: number | null;
  defaultDepartmentName: string | null;
  defaultCabinetId: number | null;
  defaultCabinetName: string | null;
};

let meScopeCache: MeScopeCache | null = null;

export function clearStaffDepartmentScopeCache(): void {
  meScopeCache = null;
}

function staffUserIdFromStorage(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('staff_user');
    if (!raw) return null;
    const u = JSON.parse(raw) as { id?: number; staff_user_id?: number; user_id?: number };
    const n = u.id ?? u.staff_user_id ?? u.user_id;
    if (n != null && Number.isFinite(Number(n))) return Number(n);
  } catch {
    return null;
  }
  return null;
}

async function ensureMeScopeLoaded(): Promise<MeScopeCache | null> {
  const storageUserId = staffUserIdFromStorage();

  if (meScopeCache) {
    if (storageUserId != null && meScopeCache.staffUserId !== storageUserId) {
      meScopeCache = null;
    } else {
      return meScopeCache;
    }
  }

  try {
    const res = await fetchStaffMeDepartments();
    if (!res?.success || !res.data) return null;

    const serverUserId = res.data.staff_user_id;
    if (serverUserId == null || !Number.isFinite(Number(serverUserId))) return null;

    const unrestricted = res.data.unrestricted === true;
    const departments = res.data.departments ?? [];
    const allowedIds = unrestricted
      ? null
      : [...new Set(departments.map((d) => d.ID).filter((n) => Number.isFinite(n) && n > 0))].sort(
        (a, b) => a - b,
      );

    const rawDefault = res.data.default_department_id;
    const defaultDepartmentId =
      rawDefault != null && Number.isFinite(Number(rawDefault)) && Number(rawDefault) > 0
        ? Number(rawDefault)
        : null;

    const rawDefaultCabinet = res.data.default_cabinet_id;
    const defaultCabinetId =
      rawDefaultCabinet != null && Number.isFinite(Number(rawDefaultCabinet)) && Number(rawDefaultCabinet) > 0
        ? Number(rawDefaultCabinet)
        : null;

    meScopeCache = {
      staffUserId: Number(serverUserId),
      unrestricted,
      allowedIds,
      departments,
      defaultDepartmentId,
      defaultDepartmentName: res.data.default_department_name ?? null,
      defaultCabinetId,
      defaultCabinetName: res.data.default_cabinet_name ?? null,
    };
    return meScopeCache;
  } catch {
    return null;
  }
}

/**
 * null = ไม่จำกัดแผนก
 * number[] = เฉพาะ ID เหล่านี้ (จาก StaffPermissionDepartment ต่อผู้ใช้)
 * undefined = ยังไม่รู้ / ไม่มี session / เรียก API ไม่สำเร็จ
 */
export async function getStaffAllowedDepartmentIds(): Promise<number[] | null | undefined> {
  const c = await ensureMeScopeLoaded();
  if (c == null) return undefined;
  if (c.unrestricted) return null;
  return c.allowedIds != null && c.allowedIds.length > 0 ? c.allowedIds : [];
}

/** Division เริ่มต้นจาก Role — '' ถ้าไม่มี / โหลดไม่สำเร็จ */
export async function getStaffRoleDefaultDepartmentId(): Promise<string> {
  const c = await ensureMeScopeLoaded();
  if (c?.defaultDepartmentId != null && c.defaultDepartmentId > 0) {
    return String(c.defaultDepartmentId);
  }
  return '';
}

/** ตู้ Cabinet เริ่มต้นจาก Role — '' ถ้าไม่มี / โหลดไม่สำเร็จ */
export async function getStaffRoleDefaultCabinetId(): Promise<string> {
  const c = await ensureMeScopeLoaded();
  if (c?.defaultCabinetId != null && c.defaultCabinetId > 0) {
    return String(c.defaultCabinetId);
  }
  return '';
}

/**
 * รายการแผนกจาก GET /staff/me/departments (user → StaffPermissionDepartment)
 */
export async function getStaffRestrictedDepartmentsFromMe(): Promise<StaffMeDepartmentRow[] | null> {
  const c = await ensureMeScopeLoaded();
  if (c == null) return null;
  if (c.departments.length > 0) return c.departments;
  return null;
}

/**
 * รายการ Division สำหรับ dropdown/filter ทุกหน้า Staff
 * อิงจาก GET /staff/me/departments เท่านั้น (user → app_staff_permission_departments)
 * ไม่ดึง GET /departments ทั้งโรงพยาบาล
 */
export async function fetchStaffDepartmentsForFilter(opts?: {
  keyword?: string;
  page?: number;
  limit?: number;
  allowedDepartmentIds?: number[] | null | undefined;
  /** เฉพาะ Division ที่มีตู้ Cabinet ผูก ACTIVE */
  withCabinet?: boolean;
}): Promise<StaffMeDepartmentRow[]> {
  const rawKw = opts?.keyword?.trim() ?? '';
  const kwLower = rawKw.toLowerCase();
  const limit = Math.min(500, Math.max(1, opts?.limit ?? 50));
  const page = opts?.page ?? 1;
  const skip = (page - 1) * limit;

  const res = await fetchStaffMeDepartments({ withCabinet: opts?.withCabinet });
  if (!res?.success || !res.data) {
    return [];
  }

  let list = (res.data.departments ?? []) as StaffMeDepartmentRow[];

  if (rawKw) {
    list = list.filter(
      (d) =>
        (d.DepName ?? '').toLowerCase().includes(kwLower) ||
        (d.DepName2 ?? '').toLowerCase().includes(kwLower) ||
        String(d.ID).includes(rawKw),
    );
  }

  if (opts?.allowedDepartmentIds !== undefined && opts.allowedDepartmentIds !== null) {
    list = applyDepartmentScopeToList(list, opts.allowedDepartmentIds);
  }

  return list.slice(skip, skip + limit);
}

/** undefined = ยังไม่รู้ขอบเขต (ห้ามถือว่าไม่จำกัด — ไม่แสดงรายการจนกว่าจะโหลดเสร็จ) */
export function applyDepartmentScopeToList<T extends { ID: number }>(
  list: T[],
  allowed: number[] | null | undefined,
): T[] {
  if (allowed === undefined) return [];
  if (allowed === null) return list;
  if (allowed.length === 0) return [];
  const set = new Set(allowed);
  return list.filter((d) => set.has(d.ID));
}

export function clampDepartmentIdString(
  selected: string | undefined | null,
  allowed: number[] | null | undefined,
  fallbackWhenUnrestricted: string,
): string {
  if (allowed === undefined) {
    return selected != null && selected !== '' ? String(selected) : '';
  }
  if (allowed === null) {
    return selected != null && selected !== '' ? String(selected) : fallbackWhenUnrestricted;
  }
  if (allowed.length === 0) return '';
  const s = selected != null && String(selected).trim() !== '' ? String(selected).trim() : '';
  if (s === '') return '';
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && allowed.includes(n)) return String(n);
  return '';
}

/** อ่าน Division เริ่มต้นจาก Role ที่เก็บใน localStorage (fallback ก่อน API พร้อม) */
export function readStaffRoleDefaultDepartmentIdFromStorage(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('staff_user');
    if (!raw) return '';
    const u = JSON.parse(raw) as { default_department_id?: number | string | null };
    const id = Number(u.default_department_id);
    return Number.isFinite(id) && id > 0 ? String(id) : '';
  } catch {
    return '';
  }
}

/** อ่านตู้ Cabinet เริ่มต้นจาก Role ที่เก็บใน localStorage (fallback ก่อน API พร้อม) */
export function readStaffRoleDefaultCabinetIdFromStorage(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('staff_user');
    if (!raw) return '';
    const u = JSON.parse(raw) as { default_cabinet_id?: number | string | null };
    const id = Number(u.default_cabinet_id);
    return Number.isFinite(id) && id > 0 ? String(id) : '';
  } catch {
    return '';
  }
}

type CabinetSortable = {
  id: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
};

export function sortCabinetsByName<T extends CabinetSortable>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    (a.cabinet_name || a.cabinet_code || String(a.id)).localeCompare(
      b.cabinet_name || b.cabinet_code || String(b.id),
      'th',
    ),
  );
}

/**
 * ค่าเริ่มต้นตู้ = ตู้ ACTIVE ที่ผูกกับ Division
 * — ถ้ามี preferredId (เช่น ตู้เริ่มต้นจาก Role) และอยู่ในรายการ → ใช้ค่านั้น
 * — ไม่มี / ไม่อยู่ในรายการ → ตัวแรกหลังเรียงชื่อ (list ควรถูกเรียงมาก่อนแล้ว)
 */
export function pickDefaultCabinetId(
  list: CabinetSortable[],
  preferredId?: string | number | null,
): string {
  if (list.length === 0) return '';
  const preferred = preferredId != null && String(preferredId).trim() !== '' ? String(preferredId).trim() : '';
  if (preferred && list.some((c) => String(c.id) === preferred)) {
    return preferred;
  }
  return String(list[0].id);
}

/**
 * คำนวณ Division เริ่มต้นจาก Role + ขอบเขตสิทธิ์
 * — มี default จาก Role → ใช้ (ถ้าอยู่ในสิทธิ์)
 * — มี scope หลายแผนก → '' (ทั้งหมดตามสิทธิ์)
 * — ไม่จำกัด + แผนกเดียว → แผนกนั้น
 */
export function resolveStaffInitialDepartmentId(opts: {
  roleDefaultDeptId: string;
  allowed: number[] | null | undefined;
  departments: Array<{ ID: number }>;
}): string {
  const roleDefaultRaw = opts.roleDefaultDeptId.trim();
  const roleDefault = roleDefaultRaw
    ? clampDepartmentIdString(roleDefaultRaw, opts.allowed, roleDefaultRaw)
    : '';
  if (roleDefault) return roleDefault;

  const userScope = Array.isArray(opts.allowed) && opts.allowed.length > 0;
  if (userScope) return '';
  if (opts.departments.length === 1) return String(opts.departments[0].ID);
  return '';
}
