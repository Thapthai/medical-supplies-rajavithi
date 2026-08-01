import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone } from 'lucide-react';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface TotpVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  setToken: (token: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TotpVerificationDialog({
  open,
  onOpenChange,
  token,
  setToken,
  loading,
  onConfirm,
  onCancel,
}: TotpVerificationDialogProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync with parent state
  useEffect(() => {
    if (token && token.length === 6) {
      setCode(token.split(''));
    } else if (!token) {
      setCode(['', '', '', '', '', '']);
    }
  }, [token]);

  // Focus first input when dialog opens
  useEffect(() => {
    if (open && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setToken(newCode.join(''));

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (index === 5 && value && newCode.every(d => d !== '')) {
      setTimeout(() => onConfirm(), 100);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (e.key === 'Enter' && code.every(d => d !== '')) {
      onConfirm();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    
    if (digits.length === 6) {
      setCode(digits);
      setToken(digits.join(''));
      inputRefs.current[5]?.focus();
      setTimeout(() => onConfirm(), 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-orange-600" />
            <span>ยืนยันรหัส 2FA</span>
          </DialogTitle>
          <DialogDescription>
            กรุณาใส่รหัส 6 หลักจากแอป Authenticator เพื่อปิดใช้งาน 2FA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium block mb-3">
              รหัส 2FA
            </Label>
            <div className="flex justify-center gap-2 mb-3" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 focus:border-red-500"
                  disabled={loading}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              ใส่รหัส 6 หลักจากแอป Authenticator
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!token || token.length !== 6 || loading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังปิด...</span>
                </div>
              ) : (
                'ปิดใช้งาน 2FA'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

