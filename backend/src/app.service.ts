import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** Response สำหรับ GET / (check ว่า API ขึ้น) */
  getApiCheck() {
    return {
      status: 'ok',
      message: 'Smart Cabinet API',
      version: 'v1',
    };
  }

  /** Response สำหรับ GET /health (health check) */
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
