import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendTemplateEmailDto, EmailTemplate, EmailResult } from './dto/email.dto';

const emailOTPTemplate = {
  subject: 'รหัส OTP สำหรับ {{appName}}',
  text: `สวัสดี {{name}},\n\nรหัส OTP ของคุณ: {{otp}}\nหมดอายุใน {{expiresIn}} นาที\n\nทีม {{appName}}`,
  html: `<p>สวัสดี {{name}}!</p><p>รหัส OTP ของคุณ: <strong>{{otp}}</strong></p><p>หมดอายุใน {{expiresIn}} นาที</p><p>ทีม {{appName}}</p>`,
};

const welcomeTemplate = {
  subject: 'ยินดีต้อนรับสู่ระบบ {{appName}}',
  text: `สวัสดี {{name}},\n\nยินดีต้อนรับสู่ {{appName}}!\nเข้าสู่ระบบได้ที่: {{loginUrl}}\n\nทีม {{appName}}`,
  html: `<p>สวัสดี {{name}}!</p><p>ยินดีต้อนรับสู่ {{appName}}!</p><p><a href="{{loginUrl}}">เข้าสู่ระบบ</a></p><p>ทีม {{appName}}</p>`,
};

const templates: Record<string, { subject: string; text: string; html: string }> = {
  [EmailTemplate.EMAIL_OTP]: emailOTPTemplate,
  [EmailTemplate.WELCOME]: welcomeTemplate,
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST || '';
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP not configured. Emails will be logged only.');
    }
  }

  private replaceVars(str: string, data: Record<string, any>): string {
    return str.replace(/\{\{(\w+)\}\}/g, (_m, key) => (data[key] !== undefined ? String(data[key]) : _m));
  }

  async sendTemplateEmail(dto: SendTemplateEmailDto): Promise<EmailResult> {
    const template = templates[dto.template];
    if (!template) {
      return { success: false, message: `Template ${dto.template} not found` };
    }
    const data = dto.templateData || {};
    const subject = this.replaceVars(template.subject, data);
    const text = this.replaceVars(template.text, data);
    const html = this.replaceVars(template.html, data);
    const from = process.env.SMTP_FROM || 'noreply@example.com';

    if (!this.transporter) {
      this.logger.log(`[Email] Would send to ${dto.to}: ${subject}`);
      return { success: true, message: 'Email skipped (no SMTP)' };
    }
    try {
      const info = await this.transporter.sendMail({
        from,
        to: dto.to,
        subject,
        text,
        html,
      });
      return { success: true, message: 'Sent', messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(`Send email failed: ${err?.message}`);
      return { success: false, message: 'Failed to send email', error: err?.message };
    }
  }
}
