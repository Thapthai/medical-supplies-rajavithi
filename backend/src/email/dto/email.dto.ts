export enum EmailTemplate {
  WELCOME = 'welcome',
  EMAIL_OTP = 'email_otp',
}

export interface SendTemplateEmailDto {
  to: string;
  template: EmailTemplate;
  templateData?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}
