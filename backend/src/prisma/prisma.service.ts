import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);


  constructor(private readonly config: ConfigService) {
    // Create MySQL adapter with optimized connection pool
    const adapter = new PrismaMariaDb({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      connectionLimit: parseInt(
        process.env.DATABASE_CONNECTION_LIMIT || '20',
        10,
      ),
      // Fix for Prisma 7.2.0: Allow RSA public key retrieval for MariaDB/MySQL authentication
      allowPublicKeyRetrieval: true,
    });

    const isProduction = process.env.NODE_ENV === 'production';

    super({
      adapter,
      log: isProduction
        ? [
          // In production: only log errors
          {
            emit: 'stdout',
            level: 'error',
          },
        ]
        : [
          // In development: log everything for debugging
          {
            emit: 'event',
            level: 'info',
          },
          {
            emit: 'event',
            level: 'query',
          },
          {
            emit: 'stdout',
            level: 'error',
          },
        ],
      errorFormat: isProduction ? 'minimal' : 'pretty',
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      const dbUrl = this.config.get<string>('DATABASE_URL');
      if (dbUrl) {
        // Mask password in log for security
        const maskedUrl = dbUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
        this.logger.log(
          `✅ Database connection established successfully: ${maskedUrl}`,
        );
      } else {
        this.logger.log('✅ Database connection established successfully');
      }
    } catch (e) {
      this.logger.error('❌ Failed to connect to database', e);
      this.logger.error(
        `Database connection error: ${e instanceof Error ? e.message : String(e)}`,
      );
      // Re-throw to prevent app from starting with broken database connection
      throw e;
    }
  }

  enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      void app.close();
      void this.$disconnect();
    });
  }
}
