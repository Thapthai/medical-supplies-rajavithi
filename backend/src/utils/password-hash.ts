import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/** ฟังก์ชัน hash และเปรียบเทียบรหัสผ่าน (ใช้ bcrypt) */
export class PasswordHash {
  static async generatePasswordHash(passwordText: string): Promise<string> {
    return bcrypt.hash(passwordText, SALT_ROUNDS);
  }

  static async comparePassword(
    passwordDb: string,
    passwordText: string,
  ): Promise<boolean> {
    return bcrypt.compare(passwordText, passwordDb);
  }
}
