import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';

interface JwtUpdateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingData: any;
  user: any;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function JwtUpdateConfirmDialog({
  open,
  onOpenChange,
  pendingData,
  user,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  onConfirm,
  onCancel,
}: JwtUpdateConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            ยืนยันการเปลี่ยนแปลงข้อมูล
          </DialogTitle>
          <DialogDescription>
            คุณกำลังจะเปลี่ยนแปลงข้อมูลโปรไฟล์ กรุณาตรวจสอบความถูกต้อง
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {pendingData && (
            <div className="bg-emerald-50 p-4 rounded-lg space-y-2 border border-emerald-200">
              <p className="text-sm font-medium text-emerald-900">การเปลี่ยนแปลงที่จะทำ:</p>
              <div className="text-sm text-emerald-700 space-y-1">
                <p><strong>ชื่อ:</strong> {pendingData.name}</p>
                {pendingData.email !== user?.email && (
                  <p><strong>อีเมล:</strong> {pendingData.email}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirmPasswordValue" className="text-sm font-medium text-gray-700">
              รหัสผ่านปัจจุบัน
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="confirmPasswordValue"
                type={showPassword ? 'text' : 'password'}
                placeholder="ใส่รหัสผ่านปัจจุบัน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11"
                autoFocus
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

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800 flex items-start gap-2">
              <span>🔒</span>
              <span>กรุณาใส่รหัสผ่านเพื่อยืนยันตัวตนก่อนเปลี่ยนแปลงข้อมูล</span>
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading || !password}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  กำลังอัพเดต...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  ยืนยันการเปลี่ยนแปลง
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

