'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { itemsApi, stickerPrintApi } from '@/lib/api';
import { extractItemBrand } from '@/lib/extractItemBrand';
import type { Item } from '@/types/item';
import {
  ALL_BRAND_TAB,
  FETCH_BATCH_LIMIT,
  MAX_PRINT,
  MAX_TOTAL_LABELS,
  PAGE_SIZE,
} from './constants';
import type { ItemDraft, SelectedLine } from './types';
import { DEFAULT_ITEM_DRAFT } from './types';
import { clampCopies, maxCopiesPerItem, resolveCopies } from './utils';

function newLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export { ALL_BRAND_TAB };

export function usePrePrintSticker() {
  const [brands, setBrands] = useState<string[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState(ALL_BRAND_TAB);

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [page, setPage] = useState(1);

  const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([]);
  const [preparedOrderLines, setPreparedOrderLines] = useState<SelectedLine[]>([]);
  const [checkedItemcodes, setCheckedItemcodes] = useState<Set<string>>(new Set());
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});

  const [savingDocument, setSavingDocument] = useState(false);

  const loadBrands = useCallback(async () => {
    try {
      setLoadingBrands(true);
      const res = await itemsApi.getBrands();
      if (res?.success === false) {
        toast.error(res.message || 'โหลดรายการยี่ห้อไม่สำเร็จ');
        setBrands([]);
        return;
      }
      const list = Array.isArray(res?.data) ? res.data : [];
      setBrands(list);
      setSelectedBrand((prev) => {
        if (prev === ALL_BRAND_TAB) return ALL_BRAND_TAB;
        if (prev && list.includes(prev)) return prev;
        return ALL_BRAND_TAB;
      });
    } catch {
      toast.error('โหลดรายการยี่ห้อไม่สำเร็จ');
      setBrands([]);
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  const loadAllItems = useCallback(async () => {
    try {
      setLoadingList(true);
      const aggregated: Item[] = [];
      let fetchPage = 1;
      let reportedTotal = 0;

      while (true) {
        const res = (await itemsApi.getMasterList({
          page: fetchPage,
          limit: FETCH_BATCH_LIMIT,
          sort_by: 'itemname',
          sort_order: 'asc',
          item_status_filter: 'active',
        })) as {
          success?: boolean;
          data?: Item[];
          total?: number;
          message?: string;
        };

        if (res?.success === false) {
          toast.error(res.message || 'โหลดรายการไม่สำเร็จ');
          setAllItems([]);
          return;
        }

        const batch = Array.isArray(res?.data) ? res.data : [];
        reportedTotal = typeof res?.total === 'number' ? res.total : aggregated.length + batch.length;
        aggregated.push(...batch);

        if (batch.length < FETCH_BATCH_LIMIT || aggregated.length >= reportedTotal) {
          break;
        }
        fetchPage += 1;
        if (fetchPage > 200) {
          console.warn('pre-print-sticker: stopped batch fetch after 200 pages');
          break;
        }
      }

      setAllItems(aggregated);
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
      setAllItems([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadBrands(), loadAllItems()]);
  }, [loadBrands, loadAllItems]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const brandFilteredItems = useMemo(() => {
    let list =
      selectedBrand === ALL_BRAND_TAB
        ? allItems
        : selectedBrand
          ? allItems.filter((i) => extractItemBrand(i.itemname) === selectedBrand)
          : [];
    const kw = keywordInput.trim().toLowerCase();
    if (kw) {
      list = list.filter((i) => {
        const code = (i.itemcode ?? '').toLowerCase();
        const name = (i.itemname ?? '').toLowerCase();
        return code.includes(kw) || name.includes(kw);
      });
    }
    return list;
  }, [allItems, selectedBrand, keywordInput]);

  const total = brandFilteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const displayItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return brandFilteredItems.slice(start, start + PAGE_SIZE);
  }, [brandFilteredItems, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedBrand, keywordInput]);

  const buildLineFromRow = useCallback(
    (row: Item, copies: number, expireDate: string, refillCap: number): SelectedLine => ({
      lineId: newLineId(),
      itemcode: row.itemcode,
      itemname: (row.itemname ?? '—').trim() || '—',
      copies: refillCap <= 0 ? 0 : clampCopies(copies, refillCap),
      refillCap,
      expireDate,
      lotNo: '',
      SubUnitQty: row.SubUnitQty,
      unit: row.unit,
      subUnit: row.subUnit,
    }),
    [],
  );

  const buildSubLineFromRow = useCallback((row: Item): SelectedLine => {
    const cap = maxCopiesPerItem();
    return {
      lineId: newLineId(),
      itemcode: row.itemcode,
      itemname: (row.itemname ?? '—').trim() || '—',
      copies: '',
      refillCap: cap,
      expireDate: '',
      lotNo: '',
      SubUnitQty: row.SubUnitQty,
      unit: row.unit,
      subUnit: row.subUnit,
    };
  }, []);

  const countStagedRows = useCallback(() => {
    const cap = maxCopiesPerItem();
    let n = 0;
    for (const code of checkedItemcodes) {
      const draft = itemDrafts[code] ?? DEFAULT_ITEM_DRAFT;
      if (resolveCopies(draft.copies, cap) > 0) n += 1;
    }
    n += selectedLines.length;
    return n;
  }, [checkedItemcodes, itemDrafts, selectedLines]);

  const collectStagedLines = useCallback((): SelectedLine[] | null => {
    const cap = maxCopiesPerItem();
    const toAdd: SelectedLine[] = [];

    for (const code of checkedItemcodes) {
      const draft = itemDrafts[code] ?? DEFAULT_ITEM_DRAFT;
      const row = allItems.find((i) => i.itemcode === code);
      if (!row) continue;
      const mainCopies = resolveCopies(draft.copies, cap);
      if (mainCopies <= 0) continue;
      toAdd.push({
        ...buildLineFromRow(row, mainCopies, draft.expireDate ?? '', cap),
        lineId: newLineId(),
      });
    }

    for (const l of selectedLines) {
      const copies = resolveCopies(l.copies, l.refillCap);
      if (copies <= 0) continue;
      toAdd.push({
        ...l,
        lineId: newLineId(),
        copies,
      });
    }

    if (toAdd.length === 0) {
      toast.error('กรอกจำนวน lot อย่างน้อย 1 รายการ');
      return null;
    }
    if (toAdd.length > MAX_PRINT) {
      toast.error(`เลือกได้ไม่เกิน ${MAX_PRINT} รายการต่อครั้ง`);
      return null;
    }

    const totalSheets = toAdd.reduce((s, l) => s + resolveCopies(l.copies, l.refillCap), 0);
    if (totalSheets > MAX_TOTAL_LABELS) {
      toast.error(`จำนวนฉลากรวมเกิน ${MAX_TOTAL_LABELS} แผ่น (ตอนนี้รวม ${totalSheets})`);
      return null;
    }

    return toAdd;
  }, [allItems, buildLineFromRow, checkedItemcodes, itemDrafts, selectedLines]);

  const getItemDraft = useCallback(
    (itemcode: string): ItemDraft => itemDrafts[itemcode] ?? DEFAULT_ITEM_DRAFT,
    [itemDrafts],
  );

  const setItemDraftExpire = useCallback((itemcode: string, ymd: string) => {
    setItemDrafts((prev) => ({
      ...prev,
      [itemcode]: { ...(prev[itemcode] ?? DEFAULT_ITEM_DRAFT), expireDate: ymd },
    }));
  }, []);

  const setItemDraftCopies = useCallback((itemcode: string, raw: number | '') => {
    setItemDrafts((prev) => ({
      ...prev,
      [itemcode]: {
        ...(prev[itemcode] ?? DEFAULT_ITEM_DRAFT),
        copies:
          raw === ''
            ? ''
            : clampCopies(raw, maxCopiesPerItem()),
      },
    }));
  }, []);

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setKeywordInput('');
    // เก็บ checkbox / draft / lot ที่กรอกไว้ — สลับยี่ห้อแค่กรองรายการ ไม่ล้างงานที่ค้าง
  };

  const toggleCheck = (row: Item) => {
    const code = row.itemcode;
    setCheckedItemcodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        setSelectedLines((lines) => lines.filter((l) => l.itemcode !== code));
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const addSubLine = (row: Item) => {
    if (!checkedItemcodes.has(row.itemcode)) {
      toast.error('เช็ครายการก่อนเพิ่ม lot');
      return;
    }
    if (countStagedRows() >= MAX_PRINT) {
      toast.error(`เพิ่มได้ไม่เกิน ${MAX_PRINT} lot ต่อครั้ง`);
      return;
    }
    setSelectedLines((prev) => [...prev, buildSubLineFromRow(row)]);
  };

  const setCopiesFor = (lineId: string, raw: number | '') => {
    setSelectedLines((prev) =>
      prev.map((l) => {
        if (l.lineId !== lineId) return l;
        if (raw === '') return { ...l, copies: '' };
        return { ...l, copies: clampCopies(raw, l.refillCap) };
      }),
    );
  };

  const setExpireDateFor = (lineId: string, ymd: string) => {
    setSelectedLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, expireDate: ymd } : l)),
    );
  };

  const removeLine = (lineId: string) => {
    setSelectedLines((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const clearSelectedLines = () => {
    setSelectedLines([]);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDocument = async (): Promise<boolean> => {
    const payloadLines = preparedOrderLines
      .map((l) => {
        const copies = resolveCopies(l.copies, l.refillCap);
        if (copies <= 0) return null;
        const exp = (l.expireDate ?? '').trim();
        const lot = (l.lotNo ?? '').trim();
        return {
          itemcode: l.itemcode,
          item_name: l.itemname,
          copies,
          ...(exp ? { expire_date: exp } : {}),
          ...(lot ? { lot_no: lot.slice(0, 50) } : {}),
        };
      })
      .filter((l): l is NonNullable<typeof l> => l != null);

    if (payloadLines.length === 0) {
      toast.error('ไม่มีรายการที่บันทึกได้ — ตรวจสอบจำนวน');
      return false;
    }

    const totalSheets = payloadLines.reduce((s, l) => s + l.copies, 0);
    if (totalSheets > MAX_TOTAL_LABELS) {
      toast.error(`จำนวนฉลากรวมเกิน ${MAX_TOTAL_LABELS} แผ่น (ตอนนี้รวม ${totalSheets})`);
      return false;
    }

    try {
      setSavingDocument(true);
      const res = await stickerPrintApi.createPrePrintSticker({ lines: payloadLines });
      if (res?.success === false) {
        toast.error(res.message || 'บันทึกเอกสารไม่สำเร็จ');
        return false;
      }
      const docNo = res.data?.doc_no ?? '';
      toast.success(
        docNo
          ? `บันทึกเอกสาร ${docNo} สำเร็จ · ${res.data?.total_lines ?? payloadLines.length} lot · ${res.data?.total_sheets ?? totalSheets} แผ่น`
          : 'บันทึกเอกสารสำเร็จ',
      );
      setPreparedOrderLines([]);
      return true;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'บันทึกเอกสารไม่สำเร็จ';
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg);
      toast.error(text);
      return false;
    } finally {
      setSavingDocument(false);
    }
  };

  const handlePrepare = () => {
    const toAdd = collectStagedLines();
    if (!toAdd) return;

    if (preparedOrderLines.length + toAdd.length > MAX_PRINT) {
      toast.error(`รายการเตรียมพิมพ์รวมได้ไม่เกิน ${MAX_PRINT} lot`);
      return;
    }

    setPreparedOrderLines((prev) => [...prev, ...toAdd]);
    setSelectedLines([]);
    setCheckedItemcodes(new Set());
    toast.success(`เตรียมพิมพ์ ${toAdd.length} lot`);
  };

  const setPreparedCopiesFor = (lineId: string, raw: number | '') => {
    setPreparedOrderLines((prev) =>
      prev.map((l) => {
        if (l.lineId !== lineId) return l;
        if (raw === '') return { ...l, copies: '' };
        return { ...l, copies: clampCopies(raw, l.refillCap) };
      }),
    );
  };

  const setPreparedExpireDateFor = (lineId: string, ymd: string) => {
    setPreparedOrderLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, expireDate: ymd } : l)),
    );
  };

  const removePreparedLine = (lineId: string) => {
    setPreparedOrderLines((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const clearPreparedOrderLines = () => {
    setPreparedOrderLines([]);
  };

  const canPrepare = useMemo(() => {
    const cap = maxCopiesPerItem();
    for (const code of checkedItemcodes) {
      const draft = itemDrafts[code] ?? DEFAULT_ITEM_DRAFT;
      if (resolveCopies(draft.copies, cap) > 0) return true;
    }
    return selectedLines.some((l) => resolveCopies(l.copies, l.refillCap) > 0);
  }, [checkedItemcodes, itemDrafts, selectedLines]);

  const stagedSummary = useMemo(() => {
    const cap = maxCopiesPerItem();
    let rows = 0;
    let sheets = 0;
    for (const code of checkedItemcodes) {
      const c = resolveCopies((itemDrafts[code] ?? DEFAULT_ITEM_DRAFT).copies, cap);
      if (c > 0) {
        rows += 1;
        sheets += c;
      }
    }
    for (const l of selectedLines) {
      const c = resolveCopies(l.copies, l.refillCap);
      if (c > 0) {
        rows += 1;
        sheets += c;
      }
    }
    return { rows, sheets };
  }, [checkedItemcodes, itemDrafts, selectedLines]);

  const initialLoading = loadingBrands || (loadingList && allItems.length === 0);

  return {
    ALL_BRAND_TAB,
    brands,
    loadingBrands: initialLoading,
    selectedBrand,
    onBrandChange: handleBrandChange,
    reloadAll,
    displayItems,
    loadingList,
    total,
    page,
    totalPages,
    keywordInput,
    setKeywordInput,
    handlePageChange,
    checkedItemcodes,
    toggleCheck,
    getItemDraft,
    setItemDraftExpire,
    setItemDraftCopies,
    addSubLine,
    canPrepare,
    stagedSummary,
    selectedLines,
    preparedOrderLines,
    setPreparedCopiesFor,
    setPreparedExpireDateFor,
    removePreparedLine,
    clearPreparedOrderLines,
    setCopiesFor,
    setExpireDateFor,
    removeLine,
    clearSelectedLines,
    handlePrepare,
    savingDocument,
    handleSaveDocument,
  };
}
