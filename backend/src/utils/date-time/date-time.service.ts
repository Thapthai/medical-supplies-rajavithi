import { Injectable } from '@nestjs/common';
import moment from 'moment-timezone';

/**
 * บริการจัดการวันที่/เวลา (timezone Asia/Bangkok)
 * ใช้: constructor(private readonly dateTimeService: DateTimeService) {}
 */
@Injectable()
export class DateTimeService {
  readonly timeZone = 'Asia/Bangkok';

  /** แปลงสตริงวันที่เป็น Date (UTC) */
  convertDateStrToDate(dateStr: string): Date {
    return moment.utc(dateStr).toDate();
  }

  /** วันที่เวลาปัจจุบัน (timezone ปัจจุบัน) เป็น ISO string */
  getNow(): string {
    return moment(new Date()).tz(this.timeZone).utc(true).format();
  }

  /** แปลง Date เป็นสตริงตาม format (default YYYY-MM-DD) */
  getDateFormat(date: Date, format: string = 'YYYY-MM-DD'): string {
    const dateFormatted = moment(date).tz(this.timeZone).format(format);
    return dateFormatted;
  }

  /** แปลงสตริงวันที่เป็นสตริงตาม format */
  getDateFormatFromStr(dateStr: string, format: string = 'YYYY-MM-DD'): string {
    const dateFormatted = moment(dateStr).tz(this.timeZone).format(format);
    return dateFormatted;
  }

  /** ต้นวัน (00:00:00) ของวันที่กำหนด */
  getStartOfDay(date: Date = new Date()): Date {
    return moment(date).tz(this.timeZone).startOf('day').toDate();
  }

  /** สิ้นวัน (23:59:59) ของวันที่กำหนด */
  getEndOfDay(date: Date = new Date()): Date {
    return moment(date).tz(this.timeZone).endOf('day').toDate();
  }

  /** บวกลบเดือนจากวันที่ */
  addMonths(date: Date = new Date(), months: number): Date {
    return moment(date).tz(this.timeZone).add(months, 'months').toDate();
  }

  /** บวกลบนาทีจากวันที่ */
  addMinutes(date: Date = new Date(), minutes: number): Date {
    return moment(date).tz(this.timeZone).add(minutes, 'minutes').toDate();
  }
}
