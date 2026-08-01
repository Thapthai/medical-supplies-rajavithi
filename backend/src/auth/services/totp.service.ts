import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';

export interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  qrCodeDataURL: string;
  backup_codes: string[];
}

@Injectable()
export class TOTPService {
  private readonly appName = process.env.APP_NAME || 'POSE';

  async generateTOTPSetup(email: string): Promise<TOTPSetupResult> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, this.appName, secret);
    const qrCodeDataURL = await qrcode.toDataURL(otpauthUrl);
    const backup_codes = this.generateBackupCodes();
    return { secret, qrCodeUrl: otpauthUrl, qrCodeDataURL, backup_codes };
  }

  verifyTOTP(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }

  generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
    }
    return codes;
  }

  hashBackupCodes(codes: string[]): string[] {
    return codes.map((c) => crypto.createHash('sha256').update(c).digest('hex'));
  }

  verifyBackupCode(inputCode: string, backup_codes_json: string): boolean {
    try {
      const hashedCodes = JSON.parse(backup_codes_json);
      const hashedInput = crypto.createHash('sha256').update(inputCode).digest('hex');
      return hashedCodes.includes(hashedInput);
    } catch {
      return false;
    }
  }

  removeUsedBackupCode(usedCode: string, backup_codes_json: string): string {
    try {
      const hashedCodes = JSON.parse(backup_codes_json);
      const hashedUsed = crypto.createHash('sha256').update(usedCode).digest('hex');
      const updated = hashedCodes.filter((c: string) => c !== hashedUsed);
      return JSON.stringify(updated);
    } catch {
      return backup_codes_json;
    }
  }
}
