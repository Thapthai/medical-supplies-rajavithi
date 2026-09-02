export type ItemDraft = {
  expireDate: string;
  /** ว่างได้ระหว่างพิมพ์ — validate ตอนกด + / เตรียมพิม */
  copies: number | '';
};

export type SelectedLine = {
  lineId: string;
  itemcode: string;
  itemname: string;
  copies: number | '';
  refillCap: number;
  expireDate: string;
  lotNo?: string;
  SubUnitQty?: number;
  unit?: { ID?: number; UnitName?: string | null };
  subUnit?: { ID?: number; UnitName?: string | null };
};



export type PreparedStockRow = {
  RowID: number;
  ItemCode?: string | null;
  RfidCode?: string | null;
};

export const DEFAULT_ITEM_DRAFT: ItemDraft = { expireDate: '', copies: 1 };
