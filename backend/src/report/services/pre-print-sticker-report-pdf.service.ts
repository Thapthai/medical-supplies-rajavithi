import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';
import { formatDate, formatReportDateSlashBE } from '../utils/date-timeformat';
import type { PrePrintStickerReportData } from './pre-print-sticker-report-excel.service';

function formatFilterDateSlashBE(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateSlashBE(v);
}

function statusLabel(status: string): string {
  if (status === 'PREPARED') return 'เตรียมพิมพ์';
  if (status === 'PRINTED') return 'พิมพ์แล้ว';
  return status || '—';
}

@Injectable()
export class PrePrintStickerReportPdfService {
  private async registerThaiFont(doc: PDFKit.PDFDocument): Promise<boolean> {
    try {
      const fonts = getReportThaiFontPaths();
      if (!fonts || !fs.existsSync(fonts.regular)) return false;
      doc.registerFont('ThaiFont', fonts.regular);
      doc.registerFont('ThaiFontBold', fonts.bold);
      return true;
    } catch {
      return false;
    }
  }

  private getLogoBuffer(): Buffer | null {
    const logoPath = resolveReportLogoPath();
    if (!logoPath || !fs.existsSync(logoPath)) return null;
    try {
      return fs.readFileSync(logoPath);
    } catch {
      return null;
    }
  }

  async generateReport(data: PrePrintStickerReportData): Promise<Buffer> {
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 10,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    let fontName = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    const hasThai = await this.registerThaiFont(doc);
    if (hasThai) {
      fontName = 'ThaiFont';
      fontBold = 'ThaiFontBold';
      doc.font(fontBold).fontSize(13);
      doc.font(fontName).fontSize(13);
    }

    const logoBuffer = this.getLogoBuffer();
    const reportDate = new Date().toLocaleDateString('th-TH', {
      calendar: 'gregory',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const margin = 10;
        const contentWidth = doc.page.width - margin * 2;

        const drawPageHeader = () => {
          const headerTop = 28;
          const headerHeight = 48;
          doc.rect(margin, headerTop, contentWidth, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');

          if (logoBuffer?.length) {
            try {
              doc.image(logoBuffer, margin + 8, headerTop + 6, { fit: [70, 36] });
            } catch {
              /* skip */
            }
          }

          doc.fontSize(16).font(fontBold).fillColor('#1A365D');
          doc.text('รายงานเอกสารเตรียมพิมพ์สติ๊กเกอร์', margin, headerTop + 6, {
            width: contentWidth,
            align: 'center',
          });
          doc.fontSize(11).font(fontName).fillColor('#6C757D');
          doc.text('Pre-print Sticker Documents Report', margin, headerTop + 22, {
            width: contentWidth,
            align: 'center',
          });
          doc.fillColor('#000000');
          doc.y = headerTop + headerHeight + 10;

          doc.fontSize(10).font(fontName).fillColor('#6C757D');
          doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, {
            width: contentWidth,
            align: 'right',
          });
          doc.fillColor('#000000');
          doc.y += 6;

          const filters = data.filters ?? {};
          const filterCells = [
            { label: 'ค้นหา', value: filters.keyword?.trim() ? filters.keyword.trim() : 'ทั้งหมด' },
            { label: 'วันที่เริ่ม', value: formatFilterDateSlashBE(filters.startDate) },
            { label: 'วันที่สิ้นสุด', value: formatFilterDateSlashBE(filters.endDate) },
          ];
          const filterY = doc.y;
          const filterRowHeight = 34;
          const filterColWidth = Math.floor(contentWidth / filterCells.length);
          let fx = margin;
          filterCells.forEach((fc, i) => {
            const cw =
              i === filterCells.length - 1
                ? contentWidth - filterColWidth * (filterCells.length - 1)
                : filterColWidth;
            doc.rect(fx, filterY, cw, filterRowHeight).fillAndStroke('#E8EDF2', '#DEE2E6');
            doc.fontSize(10).font(fontBold).fillColor('#444444');
            doc.text(fc.label, fx + 3, filterY + 4, { width: cw - 6, align: 'center' });
            doc.fontSize(11).font(fontName).fillColor('#1A365D');
            doc.text(fc.value, fx + 3, filterY + 16, { width: cw - 6, align: 'center' });
            fx += cw;
          });
          doc.fillColor('#000000');
          doc.y = filterY + filterRowHeight + 8;
        };

        const ensureSpace = (needed: number) => {
          const bottom = doc.page.height - margin;
          if (doc.y + needed > bottom) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 10 });
            drawPageHeader();
          }
        };

        drawPageHeader();

        const headers = [
          'ลำดับ',
          'เลขที่เอกสาร',
          'วันที่บันทึก',
          'ผู้บันทึก',
          'รหัส',
          'ชื่ออุปกรณ์',
          'หมดอายุ',
          'จำนวน',
        ];
        const colPct = [0.05, 0.14, 0.14, 0.12, 0.1, 0.25, 0.12, 0.08];
        const colWidths = colPct.map((p) => Math.floor(contentWidth * p));
        const sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < contentWidth) colWidths[5] += contentWidth - sumW;

        const drawTableHeader = () => {
          ensureSpace(24);
          const rowY = doc.y;
          const rowH = 22;
          let x = margin;
          doc.rect(margin, rowY, contentWidth, rowH).fillAndStroke('#1A365D', '#1A365D');
          headers.forEach((h, i) => {
            doc.fontSize(9).font(fontBold).fillColor('#FFFFFF');
            doc.text(h, x + 2, rowY + 5, { width: colWidths[i] - 4, align: 'center' });
            x += colWidths[i];
          });
          doc.fillColor('#000000');
          doc.y = rowY + rowH;
        };

        drawTableHeader();

        data.data.forEach((row, idx) => {
          ensureSpace(20);
          const rowY = doc.y;
          const rowH = 18;
          if (idx % 2 === 1) {
            doc.rect(margin, rowY, contentWidth, rowH).fill('#F8F9FA');
          }
          const values = [
            String(idx + 1),
            row.doc_no,
            formatDate(row.created_at),
            row.created_by_label || '—',
            row.itemcode,
            row.item_name?.trim() || '—',
            row.expire_date ? formatReportDateSlashBE(row.expire_date) : '—',
            String(row.copies),
          ];
          let x = margin;
          values.forEach((val, i) => {
            const leftAlign = i === 1 || i === 2 || i === 3 || i === 4 || i === 5;
            doc.fontSize(8).font(fontName).fillColor('#212529');
            doc.text(val, x + 2, rowY + 4, {
              width: colWidths[i] - 4,
              align: leftAlign ? 'left' : 'center',
              ellipsis: true,
            });
            x += colWidths[i];
          });
          doc.y = rowY + rowH;
        });

        doc.y += 10;
        doc.fontSize(9).font(fontName).fillColor('#6C757D');
        doc.text(
          `เอกสาร ${data.summary.total_documents} ฉบับ · ${data.summary.total_lots} lot · รวม ${data.summary.total_sheets} แผ่น`,
          margin,
          doc.y,
          { width: contentWidth, align: 'center' },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
