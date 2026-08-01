import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateItemMinMaxDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_min?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_max?: number;

  /** ถ้าระบุ = ตั้ง min/max ต่อตู้ (CabinetItemSetting); ไม่ระบุ = อัปเดต Item.stock_min/stock_max แบบเดิม */
  @IsOptional()
  @IsNumber()
  cabinet_id?: number;
}
