// Medical Supply Usage Types
export interface MedicalSupplyUsage {
  id: number;
  hn: string;
  an?: string;
  patient_name: string;
  ward?: string;
  doctor_name?: string;
  items: SupplyUsageItem[];
  twu?: string;
  update?: string;
  print_location?: string;
  print_date?: Date;
  time_print_date?: Date;
  created_at: string;
  updated_at: string;
}

export interface SupplyUsageItem {
  id: number;
  medical_supply_usage_id: number;
  item_name: string;
  quantity: number;
  unit?: string;
  price?: number;
  total_price?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicalSupplyUsageDto {
  hn: string;
  an?: string;
  patient_name: string;
  ward?: string;
  doctor_name?: string;
  items: CreateSupplyUsageItemDto[];
  twu?: string;
  update?: string;
  print_location?: string;
  print_date?: Date;
  time_print_date?: Date;
}

export interface CreateSupplyUsageItemDto {
  item_name: string;
  quantity: number;
  unit?: string;
  price?: number;
}

export interface UpdateMedicalSupplyUsageDto {
  hn?: string;
  an?: string;
  patient_name?: string;
  ward?: string;
  doctor_name?: string;
  items?: UpdateSupplyUsageItemDto[];
  twu?: string;
  update?: string;
  print_location?: string;
  print_date?: Date;
  time_print_date?: Date;
}

export interface UpdateSupplyUsageItemDto {
  id?: number;
  item_name?: string;
  quantity?: number;
  unit?: string;
  price?: number;
}

export interface UpdatePrintInfoDto {
  print_location?: string;
  print_date?: Date;
  time_print_date?: Date;
}

export interface GetMedicalSupplyUsagesQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  hn?: string;
  an?: string;
  sort_by?: 'created_at' | 'updated_at' | 'hn';
  sort_order?: 'asc' | 'desc';
}

