export interface ComparisonReportData {
  usage: {
    id: number;
    patient_hn: string;
    first_name: string;
    lastname: string;
    en?: string;
    department_code?: string;
    usage_datetime?: Date;
  };
  items: Array<{
    id: number;
    order_item_code?: string;
    order_item_description?: string;
    supply_code?: string;
    supply_name?: string;
    qty: number;
    qty_used_with_patient: number;
    qty_returned_to_cabinet: number;
    qty_pending?: number;
    item_status: string;
  }>;
}
