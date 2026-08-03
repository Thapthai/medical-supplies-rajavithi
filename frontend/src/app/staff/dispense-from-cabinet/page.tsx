'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DispensedItemsApi } from '@/lib/staffApi/dispensedItemsApi';
import { readStaffRoleDefaultDepartmentIdFromStorage } from '@/lib/staffDepartmentScope';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import FilterSection from './components/FilterSection';
import DispensedTable from './components/DispensedTable';
import { buildDispensedGroups } from '@/lib/dispenseFromCabinet/buildDispensedGroups';
import type { DispensedItem, FilterState } from './types';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function initialDispenseFilters(): FilterState {
  return {
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentId: readStaffRoleDefaultDepartmentIdFromStorage(),
    subDepartmentId: '',
    cabinetId: '',
  };
}

const GROUPS_PER_PAGE = 10;
const FETCH_BATCH_LIMIT = 5000;

export default function DispenseFromCabinetPage() {
  const [loadingList, setLoadingList] = useState(true);
  const [dispensedList, setDispensedList] = useState<DispensedItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(initialDispenseFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialDispenseFilters);
  /** รอ FilterSection ตั้งค่า Division/ตู้เริ่มต้นก่อนโหลดครั้งแรก */
  const [filtersBootstrapped, setFiltersBootstrapped] = useState(false);
  const initialDepartmentId = useState(() => readStaffRoleDefaultDepartmentIdFromStorage())[0];

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRawItems, setTotalRawItems] = useState(0);

  const allGroups = useMemo(() => buildDispensedGroups(dispensedList), [dispensedList]);
  const totalGroups = allGroups.length;
  const totalPages = useMemo(
    () => (totalGroups > 0 ? Math.ceil(totalGroups / GROUPS_PER_PAGE) : 1),
    [totalGroups],
  );

  const fetchDispensedList = useCallback(
    async (opts?: { resetPage?: boolean; silent?: boolean }) => {
      const activeFilters = appliedFilters;
      try {
        setLoadingList(true);
        const params: Record<string, string | number> = {
          page: 1,
          limit: FETCH_BATCH_LIMIT,
        };
        if (activeFilters.startDate) params.startDate = activeFilters.startDate;
        if (activeFilters.endDate) params.endDate = activeFilters.endDate;
        if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
        if (activeFilters.departmentId?.trim()) params.departmentId = activeFilters.departmentId;
        if (activeFilters.subDepartmentId?.trim()) {
          params.subDepartmentId = activeFilters.subDepartmentId;
        }
        if (activeFilters.cabinetId?.trim()) params.cabinetId = activeFilters.cabinetId;

        const aggregated: DispensedItem[] = [];
        let reportedTotal = 0;
        let page = 1;

        while (true) {
          const response = await DispensedItemsApi.getDispensedItems({
            ...params,
            page,
            limit: FETCH_BATCH_LIMIT,
          });

          if (!response?.success || !Array.isArray(response.data)) {
            toast.error(response?.message || 'ไม่สามารถโหลดข้อมูลได้');
            setDispensedList([]);
            setTotalRawItems(0);
            break;
          }

          const batch = response.data;
          reportedTotal =
            typeof response.total === 'number' ? response.total : aggregated.length + batch.length;
          aggregated.push(...batch);

          if (batch.length < FETCH_BATCH_LIMIT || aggregated.length >= reportedTotal) {
            break;
          }
          page += 1;
          if (page > 500) {
            console.warn('staff dispense-from-cabinet: stopped batch fetch after 500 pages');
            break;
          }
        }

        if (aggregated.length > 0 || reportedTotal === 0) {
          setDispensedList(aggregated);
          setTotalRawItems(reportedTotal);
          if (opts?.resetPage !== false) {
            setCurrentPage(1);
          }

          if (!opts?.silent) {
            if (aggregated.length === 0) {
              toast.info('ไม่พบข้อมูลการเบิกอุปกรณ์ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
            } else {
              toast.success(`พบ ${reportedTotal} รายการเบิกอุปกรณ์`);
            }
          }
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } }; message?: string };
        toast.error(
          err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        );
      } finally {
        setLoadingList(false);
      }
    },
    [appliedFilters],
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  useEffect(() => {
    if (!filtersBootstrapped) return;
    void fetchDispensedList({ resetPage: true, silent: true });
  }, [fetchDispensedList, filtersBootstrapped]);

  const onSearch = useCallback((next: FilterState) => {
    setFilters(next);
    setAppliedFilters(next);
    setCurrentPage(1);
    setFiltersBootstrapped(true);
  }, []);

  const onFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onClear = useCallback((overrides?: Partial<FilterState>) => {
    const reset = { ...initialDispenseFilters(), ...overrides };
    setFilters(reset);
    setAppliedFilters(reset);
    setCurrentPage(1);
    setFiltersBootstrapped(true);
  }, []);

  const onRefresh = useCallback(() => {
    void fetchDispensedList({ resetPage: false, silent: true });
  }, [fetchDispensedList]);

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    if (!filters.departmentId?.trim()) {
      toast.error('กรุณาเลือก Division ก่อนส่งออกรายงาน');
      return;
    }
    if (!filters.cabinetId?.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet ก่อนส่งออกรายงาน');
      return;
    }
    try {
      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);
      const params = {
        keyword: filters.searchItemCode || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        departmentId: filters.departmentId || undefined,
        subDepartmentId: filters.subDepartmentId || undefined,
        cabinetId: filters.cabinetId,
      };
      if (format === 'excel') {
        await DispensedItemsApi.downloadDispensedItemsExcel(params);
      } else {
        await DispensedItemsApi.downloadDispensedItemsPdf(params);
      }
      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${msg}`);
    }
  };

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Package className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายงานเบิกอุปกรณ์จากตู้</h1>
            <p className="text-sm text-gray-500 mt-1">
              รายการอุปกรณ์ทั้งหมดที่เบิกจากตู้ SmartCabinet
            </p>
          </div>
        </div>

        <FilterSection
          filters={filters}
          appliedFilters={appliedFilters}
          onFilterChange={onFilterChange}
          onSearch={onSearch}
          onClear={onClear}
          onRefresh={onRefresh}
          loading={loadingList}
          initialDepartmentId={initialDepartmentId}
          departmentDisabled={false}
        />

        <DispensedTable
          loading={loadingList}
          items={dispensedList}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRawItems={totalRawItems}
          totalGroups={totalGroups}
          groupsPerPage={GROUPS_PER_PAGE}
          searchItemCode={filters.searchItemCode}
          itemTypeFilter={filters.itemTypeFilter}
          onPageChange={handlePageChange}
          onExportExcel={() => handleExportReport('excel')}
          onExportPdf={() => handleExportReport('pdf')}
        />
      </div>
    </>
  );
}
