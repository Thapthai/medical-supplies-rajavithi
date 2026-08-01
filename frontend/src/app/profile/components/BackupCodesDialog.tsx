import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Copy, Download } from 'lucide-react';

interface BackupCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupCodes: string[];
  onCopy: () => void;
  onDownload: () => void;
}

export default function BackupCodesDialog({
  open,
  onOpenChange,
  backupCodes,
  onCopy,
  onDownload,
}: BackupCodesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-green-600" />
            <span>รหัสสำรองของคุณ</span>
          </DialogTitle>
          <DialogDescription>
            เก็บรหัสเหล่านี้ไว้ในที่ปลอดภัย แต่ละรหัสใช้ได้เพียงครั้งเดียว
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="text-amber-600 mt-0.5">⚠️</div>
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">สำคัญมาก!</p>
                <ul className="text-xs space-y-1">
                  <li>• เก็บรหัสเหล่านี้ไว้ในที่ปลอดภัย</li>
                  <li>• ใช้เมื่อไม่สามารถเข้าถึงแอป Authenticator ได้</li>
                  <li>• แต่ละรหัสใช้ได้เพียงครั้งเดียว</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Backup Codes */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-white border rounded px-3 py-2 text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onCopy}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>คัดลอก</span>
            </Button>
            <Button
              variant="outline"
              onClick={onDownload}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด</span>
            </Button>
          </div>

          {/* Close Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            เก็บรหัสเรียบร้อยแล้ว
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

