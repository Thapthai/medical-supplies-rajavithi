import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePrePrintStickerDto } from './dto/create-pre-print-sticker.dto';
import type { UpdatePrePrintStickerDto } from './dto/update-pre-print-sticker.dto';
import type { PrintLabelItemDto } from './dto/print-label-item.dto';
import type { PrintLabelItemsDto } from './dto/print-label-items.dto';
import type { PrintSatoSbplDto } from './dto/print-sato-sbpl.dto';
import { PrePrintStickerExportPdfService } from './services/pre-print-sticker-export-pdf.service';

@Injectable()
export class StickerPrintService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly prePrintPdf: PrePrintStickerExportPdfService,
  ) {}

  private async generatePrePrintDocNo(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `PPST-${y}${m}${d}-`;

    const last = await this.prisma.prePrintSticker.findFirst({
      where: { doc_no: { startsWith: prefix } },
      orderBy: { doc_no: 'desc' },
      select: { doc_no: true },
    });

    const lastSeq = last ? parseInt(last.doc_no.slice(prefix.length), 10) : 0;
    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  private parseExpireDateYmd(raw: string | undefined): Date | null {
    const v = raw?.trim();
    if (!v) return null;
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private async resolvePrePrintLines(lines: CreatePrePrintStickerDto['lines']) {
    if (!lines?.length) {
      throw new BadRequestException('กรุณาระบุรายการอย่างน้อย 1 แถว');
    }

    const itemcodes = [...new Set(lines.map((l) => l.itemcode.trim()).filter(Boolean))];
    const items = await this.prisma.item.findMany({
      where: { itemcode: { in: itemcodes } },
      select: { itemcode: true, itemname: true },
    });
    const nameByCode = new Map(items.map((i) => [i.itemcode, i.itemname]));
    const missing = itemcodes.filter((c) => !nameByCode.has(c));
    if (missing.length > 0) {
      const sample = missing.slice(0, 12).join(', ');
      throw new NotFoundException(
        `ไม่พบ Item ${missing.length} รายการ (เช่น ${sample}${missing.length > 12 ? '…' : ''})`,
      );
    }

    const totalSheets = lines.reduce((s, l) => s + l.copies, 0);
    if (totalSheets > 2000) {
      throw new BadRequestException(`จำนวนฉลากรวมเกิน 2000 (ตอนนี้รวม ${totalSheets} แผ่น)`);
    }

    return { lines, nameByCode, totalSheets };
  }

  /** บันทึกเอกสารเตรียมพิมพ์สติ๊กเกอร์ (หัวเอกสาร + รายการ) */
  async createPrePrintSticker(dto: CreatePrePrintStickerDto, userId?: number) {
    const { lines, nameByCode, totalSheets } = await this.resolvePrePrintLines(dto.lines ?? []);
    const docNo = await this.generatePrePrintDocNo();

    const created = await this.prisma.prePrintSticker.create({
      data: {
        doc_no: docNo,
        status: 'PREPARED',
        remark: dto.remark?.trim() || null,
        total_lines: lines.length,
        total_sheets: totalSheets,
        created_by_user_id: userId ?? null,
        details: {
          create: lines.map((line, idx) => ({
            line_order: idx,
            itemcode: line.itemcode.trim(),
            item_name: line.item_name?.trim() || nameByCode.get(line.itemcode.trim()) || null,
            expire_date: this.parseExpireDateYmd(line.expire_date),
            copies: line.copies,
            is_main: false,
            lot_no: line.lot_no?.trim().slice(0, 50) || null,
          })),
        },
      },
      include: {
        details: { orderBy: [{ item_name: 'asc' }, { line_order: 'asc' }] },
        createdBy: {
          select: { id: true, fname: true, lname: true, email: true },
        },
      },
    });

    return { success: true, data: created };
  }

  /** อัปเดตเอกสารเตรียมพิมพ์ — แทนที่รายการทั้งหมด */
  async updatePrePrintSticker(id: number, dto: UpdatePrePrintStickerDto) {
    const existing = await this.prisma.prePrintSticker.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('ไม่พบเอกสาร');

    const { lines, nameByCode, totalSheets } = await this.resolvePrePrintLines(dto.lines ?? []);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.prePrintStickerDetail.deleteMany({ where: { pre_print_sticker_id: id } });
      return tx.prePrintSticker.update({
        where: { id },
        data: {
          remark: dto.remark?.trim() || null,
          total_lines: lines.length,
          total_sheets: totalSheets,
          details: {
            create: lines.map((line, idx) => ({
              line_order: idx,
              itemcode: line.itemcode.trim(),
              item_name: line.item_name?.trim() || nameByCode.get(line.itemcode.trim()) || null,
              expire_date: this.parseExpireDateYmd(line.expire_date),
              copies: line.copies,
              is_main: false,
              lot_no: line.lot_no?.trim().slice(0, 50) || null,
            })),
          },
        },
        include: {
          details: { orderBy: [{ item_name: 'asc' }, { line_order: 'asc' }] },
          createdBy: {
            select: { id: true, fname: true, lname: true, email: true },
          },
        },
      });
    });

    return { success: true, data: updated, message: 'อัปเดตเอกสารสำเร็จ' };
  }

  /** ลบเอกสารเตรียมพิมพ์ (รายการย่อย cascade) */
  async deletePrePrintSticker(id: number) {
    const existing = await this.prisma.prePrintSticker.findUnique({
      where: { id },
      select: { id: true, doc_no: true },
    });
    if (!existing) throw new NotFoundException('ไม่พบเอกสาร');

    await this.prisma.prePrintSticker.delete({ where: { id } });
    return {
      success: true,
      message: `ลบเอกสาร ${existing.doc_no} สำเร็จ`,
      data: { id: existing.id, doc_no: existing.doc_no },
    };
  }

  async listPrePrintStickers(params: {
    page?: number;
    limit?: number;
    keyword?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    const keyword = params.keyword?.trim();
    const startDate = params.start_date?.trim();
    const endDate = params.end_date?.trim();

    const and: Array<Record<string, unknown>> = [];

    if (keyword) {
      and.push({
        OR: [
          { doc_no: { contains: keyword } },
          { remark: { contains: keyword } },
          {
            details: {
              some: {
                OR: [
                  { itemcode: { contains: keyword } },
                  { item_name: { contains: keyword } },
                  { lot_no: { contains: keyword } },
                ],
              },
            },
          },
        ],
      });
    }

    if (startDate || endDate) {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (startDate) createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      and.push({ created_at: createdAt });
    }

    const where = and.length > 0 ? { AND: and } : {};

    const [total, data] = await Promise.all([
      this.prisma.prePrintSticker.count({ where }),
      this.prisma.prePrintSticker.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          createdBy: {
            select: { id: true, fname: true, lname: true, email: true },
          },
          _count: { select: { details: true } },
        },
      }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      limit,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getPrePrintSticker(id: number) {
    const doc = await this.prisma.prePrintSticker.findUnique({
      where: { id },
      include: {
        details: { orderBy: [{ item_name: 'asc' }, { line_order: 'asc' }] },
        createdBy: {
          select: { id: true, fname: true, lname: true, email: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('ไม่พบเอกสาร');
    return { success: true, data: doc };
  }

  async exportPrePrintStickerPdf(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const doc = await this.prisma.prePrintSticker.findUnique({
      where: { id },
      include: {
        details: { orderBy: [{ item_name: 'asc' }, { line_order: 'asc' }] },
        createdBy: {
          select: { id: true, fname: true, lname: true, email: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('ไม่พบเอกสาร');

    const createdByLabel = doc.createdBy
      ? [doc.createdBy.fname, doc.createdBy.lname].filter(Boolean).join(' ').trim() ||
        doc.createdBy.email ||
        '—'
      : '—';

    const buffer = await this.prePrintPdf.generateDocument({
      doc_no: doc.doc_no,
      status: doc.status,
      remark: doc.remark,
      total_lines: doc.total_lines,
      total_sheets: doc.total_sheets,
      created_at: doc.created_at,
      created_by_label: createdByLabel,
      details: doc.details.map((d) => ({
        itemcode: d.itemcode,
        item_name: d.item_name,
        expire_date: d.expire_date,
        copies: d.copies,
        lot_no: d.lot_no,
      })),
    });

    return {
      buffer,
      filename: `pre_print_sticker_${doc.doc_no}.pdf`,
    };
  }

  private satoTemplateCache: string | null = null;

  /**
   * ส่ง SBPL สตริง: connect → write → end (พฤติกรรมเดียวกับที่เครื่องรับได้)
   */
  private async sendSbplLikePrintLabel(
    host: string,
    port: number,
    sbplCommand: string,
  ): Promise<{ bytesSent: number }> {
    const h = host.trim();
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      throw new BadRequestException('พอร์ตไม่ถูกต้อง');
    }
    const bytesSent = Buffer.byteLength(sbplCommand, 'utf8');

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.once('error', (err) => {
        const msg = err.message;
        if (msg.includes('ECONNREFUSED')) {
          reject(
            new ServiceUnavailableException(
              'ปฏิเสธการเชื่อมต่อ (ECONNREFUSED) — ตรวจ IP/พอร์ต RAW TCP',
            ),
          );
        } else {
          reject(new ServiceUnavailableException(msg));
        }
      });
      client.connect(port, h, () => {
        client.write(sbplCommand);
        client.end();
        resolve({ bytesSent });
      });
    });
  }

  private buildSatoSbplPayload(dto: PrintSatoSbplDto): string {
    const template = this.getSatoSbplTemplate();
    const withTokens = this.applySatoTokens(template, dto);
    return this.stripRfidSbplCommands(withTokens);
  }

  /** ฉลากไม่มี RFID — ตัดคำสั่ง SBPL แบบ ESC RU,… ESC IP…; ออก */
  private stripRfidSbplCommands(payload: string): string {
    return payload.replace(/\u001bRU,\d+\u001bIP[^\r\n;]*;/g, '');
  }

  private applySatoTokens(template: string, dto: PrintSatoSbplDto): string {
    const replacements: Array<[string, string | undefined]> = [
      ['QrCode1', dto.QrCode1],
      ['Qrcode', dto.Qrcode],
      ['QrCode2', dto.QrCode2],
      ['itemcode2', dto.itemcode2],
      ['num2', dto.num2],
      ['num3', dto.num3],
      ['num4', dto.num4],
    ];

    return replacements.reduce((acc, [token, value]) => {
      if (value == null) return acc;
      return acc.split(token).join(value);
    }, template);
  }

  private getSatoSbplTemplate(): string {
    if (this.satoTemplateCache != null) {
      return this.satoTemplateCache;
    }

    // JS อยู่ dist/src/sticker-print/ แต่ nest assets ไป dist/sticker-print/example/
    const candidates = [
      path.join(__dirname, '..', '..', 'sticker-print', 'example', 'SBPL1.txt'),
      path.join(process.cwd(), 'dist', 'sticker-print', 'example', 'SBPL1.txt'),
      path.join(process.cwd(), 'dist', 'src', 'sticker-print', 'example', 'SBPL1.txt'),
      path.join(process.cwd(), 'src', 'sticker-print', 'example', 'SBPL1.txt'),
    ];

    for (const p of candidates) {
      if (!existsSync(p)) continue;
      const txt = readFileSync(p, 'utf8');
      this.satoTemplateCache = txt;
      return txt;
    }

    throw new ServiceUnavailableException(
      'ไม่พบไฟล์เทมเพลต SATO SBPL1.txt (src/sticker-print/example/SBPL1.txt)',
    );
  }

  /** host: อาร์กิวเมนต์ (ถ้ามี) หรือ PRINT_STICKER_HOST ใน .env */
  private resolvePrintHost(ip: string | undefined): string {
    if (typeof ip === 'string' && ip.trim() !== '') {
      return this.normalizeTcpHost(ip);
    }
    const env = this.config.get<string>('PRINT_STICKER_HOST');
    if (typeof env === 'string' && env.trim() !== '') {
      return this.normalizeTcpHost(env);
    }
    throw new BadRequestException('ตั้ง PRINT_STICKER_HOST ใน .env ของ backend');
  }

  private resolvePrintPort(port: unknown): number {
    if (port != null && port !== '') {
      const n = Number(port);
      if (Number.isFinite(n) && n >= 1 && n <= 65535) return n;
    }
    const raw = this.config.get<string>('PRINT_STICKER_PORT');
    if (raw != null && String(raw).trim() !== '') {
      const n = Number(String(raw).trim());
      if (Number.isFinite(n) && n >= 1 && n <= 65535) return n;
    }
    return 9100;
  }

  private normalizeTcpHost(raw: string): string {
    const t = raw.trim();
    if (/^https?:\/\//i.test(t)) {
      try {
        const { hostname } = new URL(t);
        return (hostname || t).trim();
      } catch {
        return t.replace(/^https?:\/\//i, '').split('/')[0]?.trim() ?? t;
      }
    }
    return t;
  }

  /** ทดพิมพ์: SBPL จาก SBPL1.txt + token demo → TCP */
  public async printLabel(
    ip?: string,
    port?: unknown,
  ): Promise<{
    success: true;
    bytesSent: number;
    host: string;
    port: number;
    template: 'SBPL1.txt';
  }> {
    const host = this.resolvePrintHost(ip);
    const resolvedPort = this.resolvePrintPort(port);
    const payload = this.buildSatoSbplPayload({
      host,
      port: resolvedPort,
      QrCode1: 'QrCode1',
      Qrcode: 'Qrcode',
      QrCode2: 'QrCode2',
      itemcode2: 'itemcode2',
      num2: 'num2',
      num3: 'num3',
      num4: 'num4',
    } as PrintSatoSbplDto);
    const { bytesSent } = await this.sendSbplLikePrintLabel(host, resolvedPort, payload);
    return { success: true, bytesSent, host, port: resolvedPort, template: 'SBPL1.txt' };
  }

  /** พิมพ์ฉลากจาก Item master — SBPL1 + token จากฟิลด์ item (override จาก body ได้) */
  async printLabelItem(dto: PrintLabelItemDto): Promise<{
    success: true;
    bytesSent: number;
    host: string;
    port: number;
    template: 'SBPL1.txt';
    itemcode: string;
  }> {
    const code = dto.itemcode.trim();
    const item = await this.prisma.item.findUnique({ where: { itemcode: code } });
    if (!item) {
      throw new NotFoundException(`ไม่พบ Item รหัส ${code}`);
    }
    const host = this.resolvePrintHost(undefined);
    const resolvedPort = this.resolvePrintPort(undefined);
    const tokens = this.mergeItemStickerTokens(item, dto);
    const payload = this.buildSatoSbplPayload({
      host,
      port: resolvedPort,
      ...tokens,
    } as PrintSatoSbplDto);
    const { bytesSent } = await this.sendSbplLikePrintLabel(host, resolvedPort, payload);
    return {
      success: true,
      bytesSent,
      host,
      port: resolvedPort,
      template: 'SBPL1.txt',
      itemcode: item.itemcode,
    };
  }

  /** พิมพ์หลายฉลากตามลำดับแถว — แต่ละแถวมีจำนวนฉลากเอง */
  async printLabelItems(dto: PrintLabelItemsDto): Promise<{
    success: true;
    message: string;
    printedAt: string;
    lineCount: number;
    host: string;
    port: number;
    template: 'SBPL1.txt';
    count: number;
    totalBytesSent: number;
    items: { itemcode: string; copies: number; bytesSent: number }[];
  }> {
    const host = this.resolvePrintHost(undefined);
    const resolvedPort = this.resolvePrintPort(undefined);

    const entries = dto.items
      .map((l) => ({
        code: l.itemcode.trim(),
        copies:
          l.copies != null && Number.isFinite(l.copies)
            ? Math.min(50, Math.max(1, Math.floor(l.copies)))
            : 1,
        expire_date:
          l.expire_date != null && String(l.expire_date).trim() !== ''
            ? String(l.expire_date).trim().slice(0, 10)
            : undefined,
      }))
      .filter((l) => l.code.length > 0);

    if (entries.length === 0) {
      throw new BadRequestException('เลือกอย่างน้อย 1 รายการ');
    }

    const uniqueCodes = [...new Set(entries.map((l) => l.code))];
    const rows = await this.prisma.item.findMany({
      where: { itemcode: { in: uniqueCodes } },
    });
    const byCode = new Map(rows.map((r) => [r.itemcode, r]));
    const missing = uniqueCodes.filter((c) => !byCode.has(c));
    if (missing.length > 0) {
      const sample = missing.slice(0, 12).join(', ');
      throw new NotFoundException(
        `ไม่พบ Item ${missing.length} รายการ (เช่น ${sample}${missing.length > 12 ? '…' : ''})`,
      );
    }

    const totalLabels = entries.reduce((s, l) => s + l.copies, 0);
    if (totalLabels > 2000) {
      throw new BadRequestException(
        `จำนวนฉลากรวมเกิน 2000 (ตอนนี้รวม ${totalLabels} แผ่น)`,
      );
    }

    const items: { itemcode: string; copies: number; bytesSent: number }[] = [];
    let totalBytesSent = 0;
    for (const entry of entries) {
      const row = byCode.get(entry.code)!;
      const labelDto: PrintLabelItemDto = { itemcode: row.itemcode };
      if (entry.expire_date) {
        labelDto.num4 = entry.expire_date;
      }
      const tokens = this.mergeItemStickerTokens(row, labelDto);
      const payload = this.buildSatoSbplPayload({
        host,
        port: resolvedPort,
        ...tokens,
      } as PrintSatoSbplDto);
      let itemBytes = 0;
      for (let c = 0; c < entry.copies; c++) {
        const { bytesSent } = await this.sendSbplLikePrintLabel(host, resolvedPort, payload);
        itemBytes += bytesSent;
      }
      items.push({ itemcode: row.itemcode, copies: entry.copies, bytesSent: itemBytes });
      totalBytesSent += itemBytes;
    }

    return {
      success: true,
      message: 'ส่งคำสั่งพิมพ์ไปเครื่องปริ้นแล้ว',
      printedAt: new Date().toISOString(),
      lineCount: entries.length,
      host,
      port: resolvedPort,
      template: 'SBPL1.txt',
      count: totalLabels,
      totalBytesSent,
      items,
    };
  }

  private mergeItemStickerTokens(
    item: NonNullable<Awaited<ReturnType<PrismaService['item']['findUnique']>>>,
    dto: PrintLabelItemDto,
  ): Pick<PrintSatoSbplDto, 'QrCode1' | 'Qrcode' | 'QrCode2' | 'itemcode2' | 'num2' | 'num3' | 'num4'> {
    const trunc = (s: string, max: number) => {
      const t = s.replace(/\r?\n/g, ' ').trim();
      return t.length > max ? t.slice(0, max) : t;
    };
    const itemname = item.itemname?.trim() || item.itemcode;
    const mainQr = item.Barcode?.trim() || item.itemcode;
    const sec = item.itemcode2?.trim() || item.InternalCode?.trim() || '';
    const codeLine = item.itemcode2?.trim() || item.itemcode;
    const serialLine = item.RefNo?.trim() || item.Barcode?.trim() || '-';
    const lotLine = item.ManufacturerName?.trim() || item.SuplierName?.trim() || '-';
    const expLine =
      item.ModiflyDate != null
        ? item.ModiflyDate.toISOString().slice(0, 10)
        : item.ShelfLife != null && item.ShelfLife > 0
          ? String(item.ShelfLife)
          : '-';
    return {
      QrCode1:
        dto.QrCode1 != null && String(dto.QrCode1).trim() !== ''
          ? trunc(String(dto.QrCode1), 200)
          : trunc(itemname, 200),
      Qrcode:
        dto.Qrcode != null && String(dto.Qrcode).trim() !== ''
          ? trunc(String(dto.Qrcode), 500)
          : trunc(mainQr, 500),
      QrCode2:
        dto.QrCode2 != null && String(dto.QrCode2).trim() !== ''
          ? trunc(String(dto.QrCode2), 200)
          : trunc(sec || '-', 200),
      itemcode2:
        dto.itemcode2 != null && String(dto.itemcode2).trim() !== ''
          ? trunc(String(dto.itemcode2), 200)
          : trunc(codeLine, 200),
      num2:
        dto.num2 != null && String(dto.num2).trim() !== ''
          ? trunc(String(dto.num2), 200)
          : trunc(serialLine, 200),
      num3:
        dto.num3 != null && String(dto.num3).trim() !== ''
          ? trunc(String(dto.num3), 200)
          : trunc(lotLine, 200),
      num4:
        dto.num4 != null && String(dto.num4).trim() !== ''
          ? trunc(String(dto.num4), 200)
          : trunc(expLine, 200),
    };
  }
}
