'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileDown, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/Pagination';
import SearchableSelect from '@/app/staff/items/components/SearchableSelect';
import { cn } from '@/lib/utils';
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
  getStaffRoleDefaultDepartmentId,
} from '@/lib/staffDepartmentScope';
import {
  departmentDispenseApi,
  type DepartmentDispenseDocument,
} from '@/lib/departmentDispenseApi';

const ITEMS_PER_PAGE = 10;

type DepartmentOpt = {
  ID: number;
  DepName?: string | null;
  DepName2?: string | null;
  RefDepID?: string | null;
};

function deptLabel(d: DepartmentOpt): string {
  const name = (d.DepName ?? d.DepName2 ?? '').trim() || String(d.ID);
  const ref = d.RefDepID?.trim();
  return ref ? `${name} (${ref})` : name;
}

function buildScopedDivisionSummary(depts: DepartmentOpt[]): string {
  const names = depts.map((d) => (d.DepName || '').trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} … (+${names.length - 5})`;
}

function formatThDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  } catch {
    return iso;
  }
}

function readRoleDefaultDepartmentId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('staff_user');
    if (!raw) return '';
    const u = JSON.parse(raw) as { default_department_id?: number | string | null };
    const id = Number(u.default_department_id);
    return Number.isFinite(id) && id > 0 ? String(id) : '';
  } catch {
    return '';
  }
}

export default function DepartmentDispenseHistoryTab() {
  const [history, setHistory] = useState<DepartmentDispenseDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);
  const [rowPdfLoadingId, setRowPdfLoadingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DepartmentDispenseDocument | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [departments, setDepartments] = useState<DepartmentOpt[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [departmentId, setDepartmentId] = useState(() => readRoleDefaultDepartmentId());
  const [roleDefaultDeptId, setRoleDefaultDeptId] = useState(() => readRoleDefaultDepartmentId());
  const [roleDefaultReady, setRoleDefaultReady] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllScopedDepartments, setCanPickAllScopedDepartments] = useState(false);
  const initialDeptAppliedRef = useRef(false);

  const scopedDivisionSummary = useMemo(
    () => (canPickAllScopedDepartments ? buildScopedDivisionSummary(departments) : ''),
    [canPickAllScopedDepartments, departments],
  );

  const divisionSelectOptions = useMemo(
    () => [
      ...(canPickAllScopedDepartments
        ? [
            {
              value: '',
              label: 'ทั้งหมด',
              ...(scopedDivisionSummary ? { subLabel: scopedDivisionSummary } : {}),
            },
          ]
        : []),
      ...departments.map((d) => ({
        value: String(d.ID),
        label: deptLabel(d),
        subLabel: d.DepName2 || '',
      })),
    ],
    [canPickAllScopedDepartments, departments, scopedDivisionSummary],
  );

  const loadDepartments = useCallback(async (kw?: string) => {
    try {
      setLoadingDepartments(true);
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      setCanPickAllScopedDepartments(Array.isArray(allowed) && allowed.length > 0);
      const list = await fetchStaffDepartmentsForFilter({
        keyword: kw,
        page: 1,
        limit: 200,
        allowedDepartmentIds: allowed,
        withCabinet: true,
      });
      setDepartments(list as DepartmentOpt[]);
    } catch {
      toast.error('โหลด Division ไม่สำเร็จ');
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromApi = await getStaffRoleDefaultDepartmentId();
      if (cancelled) return;
      const next = fromApi || readRoleDefaultDepartmentId();
      setRoleDefaultDeptId(next);
      setRoleDefaultReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      setCanPickAllScopedDepartments(Array.isArray(allowed) && allowed.length > 0);
      try {
        setLoadingDepartments(true);
        const list = await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 200,
          allowedDepartmentIds: allowed,
          withCabinet: true,
        });
        if (cancelled) return;
        setDepartments(list as DepartmentOpt[]);
      } catch {
        toast.error('โหลด Division ไม่สำเร็จ');
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!roleDefaultReady || initialDeptAppliedRef.current) return;
    if (loadingDepartments) return;
    const allowed = allowedDepartmentIdsRef.current;
    if (allowed === undefined) return;

    initialDeptAppliedRef.current = true;

    const roleDefaultRaw = roleDefaultDeptId.trim();
    const roleDefault = roleDefaultRaw
      ? clampDepartmentIdString(roleDefaultRaw, allowed, roleDefaultRaw)
      : '';

    if (roleDefault) {
      setDepartmentId(roleDefault);
    } else {
      const userScope = Array.isArray(allowed) && allowed.length > 0;
      if (userScope) {
        setDepartmentId('');
      } else if (departments.length === 1) {
        setDepartmentId(String(departments[0].ID));
      }
    }
    setFiltersReady(true);
  }, [roleDefaultReady, roleDefaultDeptId, loadingDepartments, departments]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const allowed = allowedDepartmentIdsRef.current;
      const scopedAll =
        Array.isArray(allowed) && allowed.length > 0 && !departmentId.trim();

      if (scopedAll) {
        const results = await Promise.all(
          allowed.map((deptId) =>
            departmentDispenseApi.listDocuments({
              page: 1,
              limit: 100,
              department_id: deptId,
            }),
          ),
        );
        const merged = results
          .flatMap((res) => (res.success && res.data ? res.data : []))
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
        const start = (page - 1) * ITEMS_PER_PAGE;
        setHistory(merged.slice(start, start + ITEMS_PER_PAGE));
        setTotal(merged.length);
        setLastPage(Math.max(1, Math.ceil(merged.length / ITEMS_PER_PAGE)));
        return;
      }

      const res = await departmentDispenseApi.listDocuments({
        page,
        limit: ITEMS_PER_PAGE,
        department_id: departmentId.trim() ? Number(departmentId) : undefined,
      });
      if (res.success) {
        setHistory(res.data ?? []);
        setTotal(res.total ?? 0);
        setLastPage(res.lastPage ?? 1);
      }
    } catch {
      toast.error('โหลดประวัติการเบิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [page, departmentId]);

  useEffect(() => {
    if (!filtersReady) return;
    void loadHistory();
  }, [loadHistory, filtersReady]);

  useEffect(() => {
    setSelectedId(null);
    setDetail(null);
  }, [page, departmentId]);

  const handleSelectRow = async (doc: DepartmentDispenseDocument) => {
    if (selectedId === doc.id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    setSelectedId(doc.id);
    setDetail(null);
    try {
      setDetailLoading(true);
      const res = await departmentDispenseApi.getDocument(doc.id);
      if (res.success && res.data) {
        setDetail(res.data);
      } else {
        toast.error(res.message || 'โหลดรายละเอียดไม่สำเร็จ');
        setSelectedId(null);
      }
    } catch {
      toast.error('โหลดรายละเอียดไม่สำเร็จ');
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (history.length === 0) {
      toast.error('ไม่มีเอกสารสำหรับส่งออก');
      return;
    }
    try {
      setExportLoading(format);
      toast.info(`กำลังสร้างไฟล์ ${format.toUpperCase()}...`);
      const allowed = allowedDepartmentIdsRef.current;
      const scopedAll =
        Array.isArray(allowed) && allowed.length > 0 && !departmentId.trim();
      if (scopedAll) {
        toast.error('กรุณาเลือก Division ก่อนส่งออก');
        return;
      }

      const params = {
        page: 1,
        limit: Math.max(total, ITEMS_PER_PAGE),
        department_id: departmentId.trim() ? Number(departmentId) : undefined,
      };
      if (format === 'excel') {
        await departmentDispenseApi.downloadDocumentsExcel(params);
      } else {
        await departmentDispenseApi.downloadDocumentsPdf(params);
      }
      toast.success(`ดาวน์โหลด ${format.toUpperCase()} สำเร็จ`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ส่งออกไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownloadRowPdf = async (doc: DepartmentDispenseDocument) => {
    try {
      setRowPdfLoadingId(doc.id);
      await departmentDispenseApi.downloadDocumentPdf(doc.id);
      toast.success(`ดาวน์โหลด PDF ${doc.doc_no} สำเร็จ`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ดาวน์โหลด PDF ไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setRowPdfLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>ประวัติการเบิก</CardTitle>
              <CardDescription>
                ตารางเอกสารควบคุมการเบิกที่เคยบันทึกไว้ — คลิกแถวเพื่อดูรายละเอียด
              </CardDescription>
            </div>
            {history.length > 0 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exportLoading !== null || loading}
                  onClick={() => void handleExport('excel')}
                >
                  {exportLoading === 'excel' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exportLoading !== null || loading}
                  onClick={() => void handleExport('pdf')}
                >
                  {exportLoading === 'pdf' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  PDF
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={() => void loadHistory()}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'รีเฟรช'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchableSelect
            label="Division"
            placeholder={
              canPickAllScopedDepartments
                ? 'เลือก Division หรือทั้งหมด (ตามสิทธิ์ของคุณ)'
                : 'เลือก Division'
            }
            value={departmentId}
            initialDisplay={
              canPickAllScopedDepartments && !departmentId.trim()
                ? {
                    label: 'ทั้งหมด',
                    ...(scopedDivisionSummary ? { subLabel: scopedDivisionSummary } : {}),
                  }
                : departmentId.trim()
                  ? (() => {
                      const d = departments.find((x) => String(x.ID) === departmentId.trim());
                      return d
                        ? { label: deptLabel(d), subLabel: d.DepName2 || undefined }
                        : undefined;
                    })()
                  : undefined
            }
            onValueChange={(value) => {
              setDepartmentId(value);
              setPage(1);
            }}
            options={divisionSelectOptions}
            loading={loadingDepartments}
            onSearch={(kw) => void loadDepartments(kw)}
            searchPlaceholder="ค้นหาชื่อ Division..."
            allowClear={canPickAllScopedDepartments || Boolean(roleDefaultDeptId.trim())}
            clearLabel={canPickAllScopedDepartments ? 'ทั้งหมด' : 'ล้างการเลือก'}
          />

          {!loading && total > 0 && (
            <p className="text-sm text-muted-foreground">ทั้งหมด {total.toLocaleString()} เอกสาร</p>
          )}

          {loading || !filtersReady ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีเอกสารการเบิก
            </p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>หน่วยงาน</TableHead>
                    <TableHead className="w-20">รายการ</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead className="w-36 text-right">ดาวน์โหลด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className={cn(
                        'cursor-pointer',
                        selectedId === doc.id && 'bg-amber-50 hover:bg-amber-50',
                      )}
                      onClick={() => void handleSelectRow(doc)}
                    >
                      <TableCell className="font-mono text-xs">{doc.doc_no}</TableCell>
                      <TableCell>
                        {doc.department
                          ? deptLabel(doc.department as DepartmentOpt)
                          : doc.department_id}
                      </TableCell>
                      <TableCell>{doc._count?.lines ?? doc.lines?.length ?? '—'}</TableCell>
                      <TableCell className="text-xs">{formatThDate(doc.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={rowPdfLoadingId !== null || exportLoading !== null}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownloadRowPdf(doc);
                          }}
                        >
                          {rowPdfLoadingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && history.length > 0 && (
            <Pagination
              currentPage={page}
              totalPages={lastPage}
              onPageChange={setPage}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>

      {(selectedId != null || detailLoading) && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>รายละเอียดเอกสาร</CardTitle>
              <CardDescription>
                {detail
                  ? `เลขที่ ${detail.doc_no}`
                  : detailLoading
                    ? 'กำลังโหลด...'
                    : '—'}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {detail ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={rowPdfLoadingId !== null || exportLoading !== null}
                  onClick={() => void handleDownloadRowPdf(detail)}
                >
                  {rowPdfLoadingId === detail.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => {
                  setSelectedId(null);
                  setDetail(null);
                }}
              >
                <X className="h-4 w-4" />
                ปิด
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>เลขที่เอกสาร:</strong> {detail.doc_no}
                  </p>
                  <p>
                    <strong>หน่วยงาน:</strong>{' '}
                    {detail.department
                      ? deptLabel(detail.department as DepartmentOpt)
                      : detail.department_id}
                  </p>
                  <p>
                    <strong>วันที่บันทึก:</strong> {formatThDate(detail.created_at)}
                  </p>
                  {detail.remark ? (
                    <p>
                      <strong>หมายเหตุ:</strong> {detail.remark}
                    </p>
                  ) : null}
                  {detail.createdBy ? (
                    <p>
                      <strong>ผู้บันทึก:</strong>{' '}
                      {[detail.createdBy.fname, detail.createdBy.lname].filter(Boolean).join(' ') ||
                        detail.createdBy.email}
                    </p>
                  ) : null}
                </div>

                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัส</TableHead>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead>จำนวนเบิก</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail.lines ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                            ไม่มีรายการในเอกสาร
                          </TableCell>
                        </TableRow>
                      ) : (
                        (detail.lines ?? []).map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="font-mono text-xs">{line.itemcode}</TableCell>
                            <TableCell>{line.item_name ?? '—'}</TableCell>
                            <TableCell>{line.qty}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
