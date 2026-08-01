export interface EquipmentUsageReportData {
  hospital?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  items: Array<{
    en?: string;
    hn: string;
    code: string;
    description: string;
    assessionNo?: string;
    status?: string;
    qty: number;
    uom?: string;
  }>;
}

