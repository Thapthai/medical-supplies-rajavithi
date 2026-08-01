import { Global, Module } from '@nestjs/common';
import { DateTimeService } from './date-time.service';

@Global()
@Module({
  providers: [DateTimeService],
  exports: [DateTimeService],
})
export class DateTimeModule {}
