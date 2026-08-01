import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ApiKeyStrategy {
  generateApiKey(): { key: string; hash: string; prefix: string } {
    const prefix = 'ak';
    const randomBytes = crypto.randomBytes(32);
    const keyBody = randomBytes.toString('hex');
    const key = `${prefix}_${keyBody}`;
    const hash = bcrypt.hashSync(key, 10);
    return { key, hash, prefix: key.substring(0, 8) };
  }

  async verifyApiKey(providedKey: string, storedHash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(providedKey, storedHash);
    } catch {
      return false;
    }
  }

  extractApiKeyFromHeader(authHeader: string): string | null {
    if (!authHeader) return null;
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) return bearerMatch[1];
    const apiKeyMatch = authHeader.match(/^ApiKey\s+(.+)$/i);
    if (apiKeyMatch) return apiKeyMatch[1];
    if (authHeader.startsWith('ak_')) return authHeader;
    return null;
  }

  isValidApiKeyFormat(key: string): boolean {
    return /^ak_[a-f0-9]{64}$/.test(key);
  }

  isApiKeyExpired(expires_at?: Date): boolean {
    if (!expires_at) return false;
    return new Date() > expires_at;
  }

  getApiKeyPrefix(key: string): string {
    return key.substring(0, 8);
  }
}
