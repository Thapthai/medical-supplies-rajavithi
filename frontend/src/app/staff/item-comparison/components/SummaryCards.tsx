import { Card, CardContent } from '@/components/ui/card';
import type { ComparisonItem, SummaryData } from '../types';

interface SummaryCardsProps {
  selectedItem: ComparisonItem;
  summary: SummaryData;
}

export default function SummaryCards({ selectedItem, summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">จำนวนเบิก</p>
            <p className="text-3xl font-bold text-blue-600">{selectedItem.total_dispensed}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">จำนวนใช้</p>
            <p className="text-3xl font-bold text-green-600">{selectedItem.total_used}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">ผลต่าง</p>
            <p className={`text-3xl font-bold ${
              selectedItem.difference === 0 ? 'text-green-600' :
              selectedItem.difference > 0 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {selectedItem.difference > 0 && '+'}
              {selectedItem.difference}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">รายการทั้งหมด</p>
            <p className="text-3xl font-bold text-purple-600">{summary.total}</p>
            <p className="text-xs text-gray-400 mt-1">
              ตรงกัน: {summary.matched} | ไม่ตรง: {summary.notMatched}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
