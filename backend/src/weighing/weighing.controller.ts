import { Controller, Get, Param, Query } from '@nestjs/common';
import { WeighingService } from './weighing.service';

@Controller('weighing')
export class WeighingController {
  constructor(private readonly weighingService: WeighingService) {}

  /**
   * GET /weighing — รายการ ItemSlotInCabinet แบบแบ่งหน้า
   * Query: page, limit, itemName (ค้นหาชื่ออุปกรณ์), itemcode, stockId (filter by cabinet.stock_id)
   */
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('itemName') itemName?: string,
    @Query('itemcode') itemcode?: string,
    @Query('stockId') stockId?: string,
  ) {
    return this.weighingService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      itemName,
      itemcode,
      stockId: stockId ? parseInt(stockId, 10) : undefined,
    });
  }

  /**
   * GET /weighing/by-sign — รายการ Detail ตาม Sign (เบิก = '-', เติม = '+')
   * Query: sign, page, limit, itemName (ค้นหาชื่ออุปกรณ์), itemcode, stockId, dateFrom, dateTo (YYYY-MM-DD)
   */
  @Get('by-sign')
  findBySign(
    @Query('sign') sign?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('itemName') itemName?: string,
    @Query('itemcode') itemcode?: string,
    @Query('stockId') stockId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.weighingService.findDetailsBySign(sign === '+' ? '+' : '-', {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      itemName,
      itemcode,
      stockId: stockId ? parseInt(stockId, 10) : undefined,
      dateFrom,
      dateTo,
    });
  }

  /**
   * GET /weighing/:itemcode/details — รายการ ItemSlotInCabinetDetail ตาม itemcode
   */
  @Get(':itemcode/details')
  findDetails(
    @Param('itemcode') itemcode: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.weighingService.findDetailsByItemcode(itemcode, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /weighing/cabinets/list — รายการตู้ที่มีสต๊อก Weighing (สำหรับ dropdown หน้า weighing-departments)
   */
  @Get('cabinets/list')
  getCabinets() {
    return this.weighingService.findCabinetsWithWeighingStock();
  }

  /**
   * GET /weighing/:itemcode — หนึ่งรายการ ItemSlotInCabinet ตาม itemcode
   */
  @Get(':itemcode')
  findOne(@Param('itemcode') itemcode: string) {
    return this.weighingService.findByItemcode(itemcode);
  }
}
