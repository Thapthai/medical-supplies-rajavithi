import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'enable' | 'disable';
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PasswordConfirmDialog({
  open,
  onOpenChange,
  action,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  onConfirm,
  onCancel,
}: PasswordConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <span>ยืนยันตัวตน</span>
          </DialogTitle>
          <DialogDescription>
            {action === 'enable'
              ? 'กรุณาใส่รหัสผ่านเพื่อเปิดใช้งาน 2FA'
              : 'กรุณาใส่รหัสผ่านเพื่อปิดใช้งาน 2FA'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="confirm-password" className="text-sm font-medium">
              รหัสผ่านปัจจุบัน
            </Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="ใส่รหัสผ่านของคุณ"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onConfirm()}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
              disabled={!password || loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังยืนยัน...</span>
                </div>
              ) : (
                'ยืนยัน'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

