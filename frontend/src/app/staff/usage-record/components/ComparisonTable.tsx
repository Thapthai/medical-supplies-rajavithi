'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ComparisonTableProps {
  items: any[];
}

export default function ComparisonTable({ items }: ComparisonTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>รายการเปรียบเทียบอุปกรณ์</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[80px] text-center font-semibold">
                  ลำดับ
                </TableHead>
                <TableHead className="min-w-[150px] font-semibold">
                  รหัสอุปกรณ์
                </TableHead>
                <TableHead className="min-w-[250px] font-semibold">
                  อุปกรณ์
                </TableHead>
                <TableHead className="w-[120px] text-center font-semibold">
                  จำนวนเบิก
                </TableHead>
                <TableHead className="w-[150px] text-center font-semibold">
                  บันทึกใช้<br/>กับคนไข้
                </TableHead>
                <TableHead className="w-[150px] text-center font-semibold">
                  ต้องนำกลับ<br/>เข้าตู้
                </TableHead>
                <TableHead className="w-[120px] text-center font-semibold">
                  สถานะ
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const qty = item.qty || 0;
                const qtyUsed = item.qty_used_with_patient || 0;
                const qtyReturned = item.qty_returned_to_cabinet || 0;
                const qtyPending = item.qty_pending !== undefined 
                  ? item.qty_pending 
                  : (qty - qtyUsed - qtyReturned);
                
                // สถานะ Match ถ้า:
                // 1. ใช้กับคนไข้หมดแล้ว และไม่มีต้องคืน (qtyPending = 0 และ qtyReturned = 0)
                // 2. หรือ คืนครบแล้ว (qtyReturned > 0 และ qtyPending = 0)
                const isMatch = qtyPending === 0;
                
                return (
                  <TableRow 
                    key={item.id || index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="text-center font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.order_item_code || item.supply_code || '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {item.order_item_description || item.supply_name || '-'}
                        </p>
                        {item.assession_no && (
                          <p className="text-xs text-gray-500 mt-1">
                            Assession: {item.assession_no}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">
                        {qty}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-semibold">
                        {qtyUsed}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`
                        inline-flex items-center justify-center px-3 py-1 rounded-full font-semibold
                        ${qtyPending > 0 
                          ? 'bg-orange-100 text-orange-800' 
                          : qtyReturned > 0
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      `}>
                        {qtyPending}
                      </span>
                      {qtyReturned > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          (คืนแล้ว: {qtyReturned})
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isMatch ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500"></span>
                          Match
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500"></span>
                          Not Match
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold mb-2">คำอธิบาย:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span><strong>Match:</strong> ดำเนินการครบถ้วน (ใช้หมด หรือ คืนครบ)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span><strong>Not Match:</strong> ยังมีรายการที่ต้องนำกลับเข้าตู้</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">จำนวนเบิก</span>
              <span>= จำนวนที่เบิกทั้งหมด</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">ใช้กับคนไข้</span>
              <span>= จำนวนที่บันทึกใช้กับคนไข้แล้ว</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">ต้องนำกลับ</span>
              <span>= จำนวนที่ยังต้องระบุสถานะ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded text-xs">(คืนแล้ว)</span>
              <span>= จำนวนที่นำกลับเข้าตู้แล้ว</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-600">
              <strong>สูตร:</strong> จำนวนเบิก = บันทึกใช้กับคนไข้ + คืนเข้าตู้แล้ว + ต้องนำกลับเข้าตู้
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
