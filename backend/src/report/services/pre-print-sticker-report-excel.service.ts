import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';
import { formatDate, formatReportDateSlashBE } from '../utils/date-timeformat';

function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

export type PrePrintStickerReportRow = {
  doc_no: string;
  status: string;
  created_at: string | Date;
  created_by_label: string;
  itemcode: string;
  item_name: string | null;
  expire_date: string | Date | null;
  copies: number;
  lot_no: string | null;
};

export type PrePrintStickerReportData = {
  filters?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
  };
  summary: {
    total_documents: number;
    total_lots: number;
    total_sheets: number;
  };
  data: PrePrintStickerReportRow[];
};

function statusLabel(status: string): string {
  if (status === 'PREPARED') return 'เตรียมพิมพ์';
  if (status === 'PRINTED') return 'พิมพ์แล้ว';
  return status || '—';
}

@Injectable()
export class PrePrintStickerReportExcelService {
  async generateReport(data: PrePrintStickerReportData): Promise<Buffer> {
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานเตรียมพิมพ์สติ๊กเกอร์', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = new Date().toLocaleDateString('th-TH', {
      calendar: 'gregory',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:J2',
      title: 'รายงานเอกสารเตรียมพิมพ์สติ๊กเกอร์\nPre-print Sticker Documents Report',
      row1Height: 20,
      row2Height: 20,
    });

    worksheet.mergeCells('A3:J3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    const filters = data.filters ?? {};
    const filterLabels = ['ค้นหา', 'วันที่เริ่ม', 'วันที่สิ้นสุด'];
    const filterValues = [
      filters.keyword?.trim() ? filters.keyword.trim() : 'ทั้งหมด',
      formatFilterDateSlashBE(filters.startDate),
      formatFilterDateSlashBE(filters.endDate),
    ];
    const filterColMap: [string, string][] = [
      ['A', 'D'],
      ['E', 'G'],
      ['H', 'J'],
    ];
    filterLabels.forEach((lbl, gi) => {
      const [colStart, colEnd] = filterColMap[gi];
      worksheet.mergeCells(`${colStart}4:${colEnd}4`);
      const cell = worksheet.getCell(`${colStart}4`);
      cell.value = `${lbl}: ${filterValues[gi]}`;
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    worksheet.getRow(4).height = 20;

    const tableStartRow = 5;
    const tableHeaders = [
      'ลำดับ',
      'เลขที่เอกสาร',
      'วันที่บันทึก',
      'ผู้บันทึก',
      'สถานะ',
      'รหัส',
      'ชื่ออุปกรณ์',
      'วันหมดอายุ',
      'จำนวน',
      'Lot no.',
    ];
    const headerRow = worksheet.getRow(tableStartRow);
    tableHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 26;

    let dataRowIndex = tableStartRow + 1;
    data.data.forEach((item, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      const values: ExcelJS.CellValue[] = [
        idx + 1,
        item.doc_no,
        formatDate(item.created_at),
        item.created_by_label || '—',
        statusLabel(item.status),
        item.itemcode,
        item.item_name?.trim() || '—',
        item.expire_date ? formatReportDateSlashBE(item.expire_date) : '—',
        item.copies,
        item.lot_no?.trim() || '—',
      ];
      values.forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        const leftAlign = [1, 2, 3, 5, 6].includes(colIndex);
        cell.alignment = {
          horizontal: leftAlign ? 'left' : 'center',
          vertical: 'middle',
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      excelRow.height = 22;
      dataRowIndex++;
    });

    worksheet.addRow([]);
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:J${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:J${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = `เอกสาร ${data.summary.total_documents} ฉบับ · ${data.summary.total_lots} lot · รวม ${data.summary.total_sheets} แผ่น`;
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 22;
    worksheet.getColumn(3).width = 22;
    worksheet.getColumn(4).width = 18;
    worksheet.getColumn(5).width = 14;
    worksheet.getColumn(6).width = 14;
    worksheet.getColumn(7).width = 36;
    worksheet.getColumn(8).width = 14;
    worksheet.getColumn(9).width = 10;
    worksheet.getColumn(10).width = 14;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
