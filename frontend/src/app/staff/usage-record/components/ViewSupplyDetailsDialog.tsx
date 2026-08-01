'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface ViewSupplyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supply: any;
}

export default function ViewSupplyDetailsDialog({
  open,
  onOpenChange,
  supply,
}: ViewSupplyDetailsDialogProps) {
  if (!supply) return null;

  const supplyData = supply.data || supply;
  const supplyItems = supply.supplies_summary || supplyData.supply_items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            รายละเอียดการเบิกอุปกรณ์
          </DialogTitle>
          <DialogDescription>
            HN: {supplyData.patient_hn || '-'} | EN: {supplyData.en || '-'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Patient Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">ชื่อคนไข้</p>
              <p className="font-medium">
                {supplyData.first_name || ''} {supplyData.lastname || ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">จำนวนรายการ</p>
              <p className="font-medium">{supplyItems.length} รายการ</p>
            </div>
          </div>

          {/* Supply Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ลำดับ</TableHead>
                  <TableHead>รหัสอุปกรณ์</TableHead>
                  <TableHead>ชื่ออุปกรณ์</TableHead>
                  <TableHead className="text-center">จำนวน</TableHead>
                  <TableHead>หน่วย</TableHead>
                  <TableHead>Assession No</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplyItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      ไม่มีรายการอุปกรณ์
                    </TableCell>
                  </TableRow>
                ) : (
                  supplyItems.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.order_item_code || item.supply_code || '-'}
                      </TableCell>
                      <TableCell>
                        {item.order_item_description || item.supply_name || '-'}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {item.qty || item.quantity || 0}
                      </TableCell>
                      <TableCell>{item.uom || item.unit || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.assession_no || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {item.order_item_status || '-'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

