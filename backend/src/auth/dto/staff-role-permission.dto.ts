import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStaffRolePermissionDto {
  @IsOptional()
  @IsString()
  role_code?: string;

  @IsOptional()
  role_id?: number;

  @IsString()
  menu_href: string;

  @IsOptional()
  @IsBoolean()
  can_access?: boolean;
}

export class UpdateStaffRolePermissionDto {
  @IsOptional()
  @IsBoolean()
  can_access?: boolean;
}

export class BulkUpdateStaffRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStaffRolePermissionDto)
  permissions: CreateStaffRolePermissionDto[];
}
