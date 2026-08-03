import { IsString, IsBoolean, IsOptional, IsInt, Min, MinLength, ValidateIf } from 'class-validator';

export class CreateStaffRoleDto {
  /** ไม่ส่งหรือว่าง = ระบบสร้างรหัสอัตโนมัติ (เช่น STF-001) */
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @MinLength(2)
  code?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  /** Division หลักเริ่มต้นสำหรับฟิลเตอร์ — null/ไม่ส่ง = ไม่ตั้งค่า */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  default_department_id?: number | null;

  /** ตู้ Cabinet เริ่มต้นสำหรับฟิลเตอร์ — null/ไม่ส่ง = ไม่ตั้งค่า */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  default_cabinet_id?: number | null;
}

export class UpdateStaffRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  /** ส่ง null เพื่อล้างค่า Division เริ่มต้น */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  default_department_id?: number | null;

  /** ส่ง null เพื่อล้างค่าตู้เริ่มต้น */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  default_cabinet_id?: number | null;
}
