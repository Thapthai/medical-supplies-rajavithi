// Common API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  requiresTwoFactor?: boolean;
}

export interface ItemsStats {
  total_value?: number;
  total_items: number;
  active_items: number;
  inactive_items: number;
  low_stock_items?: number;
}

/** รูปแบบ response จาก getItemsStats (มี details + item_stock.expire) */
export interface GetItemsStatsData {
  details: {
    total_items: number;
    active_items: number;
    inactive_items: number;
    low_stock_items: number;
  };
  item_stock: {
    expire: {
      expired_count: number;
      near_expire_7_days: number;
    };
    items_with_expiry: Array<{
      RowID: number;
      ItemCode: string | null;
      itemname: string | null;
      ExpireDate: string | null;
      วันหมดอายุ: string | null;
      RfidCode: string | null;
      cabinet_name?: string;
      cabinet_code?: string;
    }>;
  };
}

export interface PaginatedResponse<T> {
  success?: boolean;
  data: T[];
  total: number;
  page: number;
  lastPage: number;
  stats?: ItemsStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

