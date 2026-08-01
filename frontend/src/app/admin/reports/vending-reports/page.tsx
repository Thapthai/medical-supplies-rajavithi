'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { FileBarChart } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MappingVendingTab } from './components/MappingVendingTab';
import { UnmappedDispensedTab } from './components/UnmappedDispensedTab';
import { UnusedDispensedTab } from './components/UnusedDispensedTab';

export default function VendingReportsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <FileBarChart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                รายงาน Vending
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                รายงานการ Mapping และการเบิกอุปกรณ์จาก Vending
              </p>
            </div>
          </div>

          <Tabs defaultValue="mapping" className="space-y-4">
            <TabsList>
              <TabsTrigger value="mapping">Mapping Vending</TabsTrigger>
              <TabsTrigger value="unmapped">Mapping ไม่ได้</TabsTrigger>
              <TabsTrigger value="unused">ไม่ได้ใช้ภายในวัน</TabsTrigger>
            </TabsList>

            <MappingVendingTab />
            <UnmappedDispensedTab />
            <UnusedDispensedTab />
          </Tabs>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
