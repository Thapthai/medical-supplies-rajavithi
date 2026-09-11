import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthContext, AuthGuard } from '../auth/guards/auth.guard';
import { CreatePrePrintStickerDto } from './dto/create-pre-print-sticker.dto';
import { UpdatePrePrintStickerDto } from './dto/update-pre-print-sticker.dto';
import { UpdatePrePrintStickerStatusDto } from './dto/update-pre-print-sticker-status.dto';
import { PrintLabelItemDto } from './dto/print-label-item.dto';
import { PrintLabelItemsDto } from './dto/print-label-items.dto';
import { StickerPrintService } from './sticker-print.service';

const PDF_CONTENT = 'application/pdf';

function toFileResponse(buffer: Buffer, filename: string, contentType: string) {
  return {
    success: true as const,
    data: {
      buffer: buffer.toString('base64'),
      filename,
      contentType,
    },
  };
}

/**
 * สติ๊กเกอร์ SATO SBPL — ต้องล็อกอิน
 */
@Controller('sticker-print')
@UseGuards(AuthGuard)
export class StickerPrintController {
  constructor(private readonly stickerPrintService: StickerPrintService) {}

  /** รายการเอกสารเตรียมพิมพ์สติ๊กเกอร์ */
  @Get('pre-print-stickers')
  listPrePrintStickers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.stickerPrintService.listPrePrintStickers({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword,
      start_date: startDate,
      end_date: endDate,
      status,
    });
  }

  /** ส่งออกเอกสารเตรียมพิมพ์ — PDF */
  @Post('pre-print-stickers/:id/export/pdf')
  @HttpCode(HttpStatus.OK)
  async exportPrePrintStickerPdf(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.stickerPrintService.exportPrePrintStickerPdf(id);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ส่งออก PDF ไม่สำเร็จ';
      return { success: false, error: message };
    }
  }

  /** รายละเอียดเอกสารเตรียมพิมพ์สติ๊กเกอร์ */
  @Get('pre-print-stickers/:id')
  getPrePrintSticker(@Param('id', ParseIntPipe) id: number) {
    return this.stickerPrintService.getPrePrintSticker(id);
  }

  /** อัปเดตสถานะเอกสารเตรียมพิมพ์ (พิมพ์แล้ว / ยังไม่พิมพ์) */
  @Patch('pre-print-stickers/:id/status')
  @HttpCode(HttpStatus.OK)
  updatePrePrintStickerStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePrePrintStickerStatusDto,
  ) {
    return this.stickerPrintService.updatePrePrintStickerStatus(id, body);
  }

  /** อัปเดตเอกสารเตรียมพิมพ์สติ๊กเกอร์ */
  @Put('pre-print-stickers/:id')
  @HttpCode(HttpStatus.OK)
  updatePrePrintSticker(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePrePrintStickerDto,
  ) {
    return this.stickerPrintService.updatePrePrintSticker(id, body);
  }

  /** ลบเอกสารเตรียมพิมพ์สติ๊กเกอร์ */
  @Delete('pre-print-stickers/:id')
  @HttpCode(HttpStatus.OK)
  deletePrePrintSticker(@Param('id', ParseIntPipe) id: number) {
    return this.stickerPrintService.deletePrePrintSticker(id);
  }

  /** บันทึกเอกสารเตรียมพิมพ์สติ๊กเกอร์ */
  @Post('pre-print-stickers')
  @HttpCode(200)
  createPrePrintSticker(
    @Body() body: CreatePrePrintStickerDto,
    @Req() req: Request & { auth?: AuthContext },
  ) {
    const userId = req.auth?.user?.id as number | undefined;
    return this.stickerPrintService.createPrePrintSticker(body, userId);
  }

  @Post('printLabel')
  @HttpCode(200)
  testPrintLabel(@Body() body: { ip?: string; port?: number | string }) {
    return this.stickerPrintService.printLabel(body?.ip, body?.port);
  }

  /** พิมพ์จาก Item master รายการเดียว — SBPL1 + token จาก DB */
  @Post('printLabel-item')
  @HttpCode(200)
  printLabelItem(@Body() body: PrintLabelItemDto) {
    return this.stickerPrintService.printLabelItem(body);
  }

  /** พิมพ์หลายรายการตามลำดับ — host/port จาก PRINT_STICKER_* ใน .env */
  @Post('printLabel-items')
  @HttpCode(200)
  printLabelItems(@Body() body: PrintLabelItemsDto) {
    return this.stickerPrintService.printLabelItems(body);
  }
}
