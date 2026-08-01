import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface OAuthUpdateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingData: any;
  user: any;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function OAuthUpdateConfirmDialog({
  open,
  onOpenChange,
  pendingData,
  user,
  loading,
  onConfirm,
  onCancel,
}: OAuthUpdateConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            ยืนยันการเปลี่ยนแปลงข้อมูล
          </DialogTitle>
          <DialogDescription>
            คุณกำลังจะเปลี่ยนแปลงข้อมูลโปรไฟล์ กรุณาตรวจสอบความถูกต้อง
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {pendingData && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2 border border-blue-200">
              <p className="text-sm font-medium text-blue-900">การเปลี่ยนแปลงที่จะทำ:</p>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>ชื่อ:</strong> {pendingData.name}</p>
                {pendingData.email !== user?.email && (
                  <p><strong>อีเมล:</strong> {pendingData.email}</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
            <p className="text-sm text-cyan-800 flex items-start gap-2">
              <span>ℹ️</span>
              <span>คุณเข้าสู่ระบบด้วย {user?.preferred_auth_method === 'firebase' ? 'Google' : 'OAuth2'} จึงไม่ต้องยืนยันด้วยรหัสผ่าน</span>
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
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
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

