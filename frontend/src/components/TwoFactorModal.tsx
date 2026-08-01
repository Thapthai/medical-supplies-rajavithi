'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Loader2 } from 'lucide-react';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  loading?: boolean;
}

export default function TwoFactorModal({
  isOpen,
  onClose,
  onVerify,
  loading = false,
}: TwoFactorModalProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string>('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCode(['', '', '', '', '', '']);
      setError('');
    }
  }, [isOpen]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value && newCode.every((digit) => digit !== '')) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length === 6) {
          setCode(digits);
          inputRefs.current[5]?.focus();
          handleSubmit(digits.join(''));
        }
      });
    }
  };

  const handleSubmit = async (codeValue?: string) => {
    const finalCode = codeValue || code.join('');
    
    if (finalCode.length !== 6) {
      setError('กรุณากรอกรหัส 6 หลัก');
      return;
    }

    try {
      await onVerify(finalCode);
    } catch (error: any) {
      setError(error.message || 'รหัสไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    
    if (digits.length === 6) {
      setCode(digits);
      inputRefs.current[5]?.focus();
      handleSubmit(digits.join(''));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl">
            การยืนยันตัวตนสองชั้น
          </DialogTitle>
          <DialogDescription className="text-center">
            กรุณากรอกรหัส 6 หลักจาก Authenticator App
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
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
                className="w-12 h-14 text-center text-2xl font-bold border-2 focus:border-blue-500"
                disabled={loading}
              />
            ))}
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <Button
            onClick={() => handleSubmit()}
            disabled={code.some((digit) => digit === '') || loading}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังตรวจสอบ...</span>
              </div>
            ) : (
              'ยืนยัน'
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>ไม่ได้รับรหัส?</p>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline mt-1"
            disabled={loading}
          >
            ยกเลิกและลองใหม่
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

