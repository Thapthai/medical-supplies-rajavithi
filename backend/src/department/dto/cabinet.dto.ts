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

  @IsOptional()
  @IsString()
  cabinet_status?: string;
}
