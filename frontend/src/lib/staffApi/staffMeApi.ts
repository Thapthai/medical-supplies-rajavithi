import staffApi from './index';

/** แผนกจาก staff → app_staff_permission_departments → department (+ default จาก Role) */
export type StaffMeDepartmentsResponse = {
  success?: boolean;
  data?: {
    unrestricted?: boolean;
    staff_user_id?: number;
    role_id?: number;
    /** Division เริ่มต้นจาก app_staff_roles.default_department_id */
    default_department_id?: number | null;
    default_department_name?: string | null;
    /** ตู้ Cabinet เริ่มต้นจาก app_staff_roles.default_cabinet_id */
    default_cabinet_id?: number | null;
    default_cabinet_name?: string | null;
    departments: Array<{
      ID: number;
      DepName?: string | null;
      DepName2?: string | null;
      RefDepID?: string | null;
    }>;
  };
  message?: string;
};

export async function fetchStaffMeDepartments(opts?: {
  withCabinet?: boolean;
}): Promise<StaffMeDepartmentsResponse> {
  const params: Record<string, string> = {};
  if (opts?.withCabinet) {
    params.with_cabinet = 'true';
  }
  const response = await staffApi.get<StaffMeDepartmentsResponse>('/staff/me/departments', {
    params,
  });
  return response.data;
}
