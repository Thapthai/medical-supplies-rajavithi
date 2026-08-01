/** คีย์ตัวแปร environment ตรงกับ .env (ใช้กับ ConfigService.get(EnvKey.XXX)) */
export class EnvKey {
  static readonly NODE_ENV = 'NODE_ENV';
  static readonly PORT = 'PORT';
  static readonly JWT_SECRET = 'JWT_SECRET';
  static readonly JWT_REFRESH_SECRET = 'JWT_REFRESH_SECRET';
  static readonly JWT_EXPIRES_IN = 'JWT_EXPIRES_IN';
  static readonly JWT_REFRESH_EXPIRES_IN = 'JWT_REFRESH_EXPIRES_IN';

  // Database Configuration
  static readonly DATABASE_URL = 'DATABASE_URL';
  static readonly DATABASE_USER = 'DATABASE_USER';
  static readonly DATABASE_PASSWORD = 'DATABASE_PASSWORD';
  static readonly DATABASE_NAME = 'DATABASE_NAME';
  static readonly DATABASE_HOST = 'DATABASE_HOST';
  static readonly DATABASE_PORT = 'DATABASE_PORT';
  static readonly DATABASE_CONNECTION_LIMIT = 'DATABASE_CONNECTION_LIMIT';
}
