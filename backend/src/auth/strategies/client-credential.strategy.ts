import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ClientCredentialStrategy {
  generateClientCredential(): { client_id: string; client_secret: string; client_secret_hash: string } {
    const client_id = crypto.randomBytes(16).toString('hex');
    const client_secret = crypto.randomBytes(16).toString('hex');
    const client_secret_hash = bcrypt.hashSync(client_secret, 10);
    return { client_id, client_secret, client_secret_hash };
  }

  async verifyClientSecret(providedSecret: string, storedHash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(providedSecret, storedHash);
    } catch {
      return false;
    }
  }

  isExpired(expires_at?: Date | null): boolean {
    if (!expires_at) return false;
    return new Date() > expires_at;
  }
}
