import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ItemsHeaderProps {
  onAddClick: () => void;
}

export default function ItemsHeader({ onAddClick }: ItemsHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">จัดการอุปกรณ์</h1>
        <p className="mt-2 text-gray-600">
          จัดการและดูรายการอุปกรณ์ทั้งหมด
        </p>
      </div>
      <Button 
        onClick={onAddClick}
        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <Plus className="mr-2 h-4 w-4" />
        เพิ่มอุปกรณ์ใหม่
      </Button>
    </div>
  );
}

