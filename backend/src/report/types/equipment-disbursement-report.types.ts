export interface EquipmentDisbursementReportData {
  hospital?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  records: Array<{
    code: string;
    description: string;
    date: string;
    time: string;
    recordedBy?: string;
    qty: number;
  }>;
  summary: Array<{
    code: string;
    description: string;
    totalQty: number;
  }>;
}

