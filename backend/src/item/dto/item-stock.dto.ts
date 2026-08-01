import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsString } from 'class-validator';

export class ItemStockDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  item_stock_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
