import { IsString, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCabinetDto {
  @IsOptional()
  @IsString()
  cabinet_name?: string;

  @IsOptional()
  @IsString()
  cabinet_code?: string;

  @IsOptional()
  @IsString()
  cabinet_type?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stock_id?: number;

  /**
   * IP เครื่องตู้ — คำนวณ stock_id จากเลขท้าย (octet − 49)
   * ถ้าส่งทั้ง ip_address และ stock_id ค่าต้องตรงกัน ไม่งั้น API จะปฏิเสธ
   */
  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  cabinet_status?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;
}

export class UpdateCabinetDto {
  @IsOptional()
  @IsString()
  cabinet_name?: string;

  @IsOptional()
  @IsString()
  cabinet_code?: string;

  @IsOptional()
  @IsString()
  cabinet_type?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stock_id?: number;

  /**
   * IP เครื่องตู้ — คำนวณ stock_id จากเลขท้าย (octet − 49)
   * ถ้าส่งทั้ง ip_address และ stock_id ค่าต้องตรงกัน ไม่งั้น API จะปฏิเสธ
   */
  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  cabinet_status?: string;
}
