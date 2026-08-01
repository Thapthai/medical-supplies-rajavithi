import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Smartphone, Shield } from 'lucide-react';

interface TwoFactorAuthProps {
  user: any;
  twoFactorLoading: boolean;
  onToggle: (checked: boolean) => void;
}

export default function TwoFactorAuth({
  user,
  twoFactorLoading,
  onToggle,
}: TwoFactorAuthProps) {
  // Support both camelCase and snake_case field names
  const is2FAEnabled = user?.twoFactorEnabled || (user as any)?.two_factor_enabled || false;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5" />
          <span>การยืนยันตัวตนสองขั้นตอน (2FA)</span>
        </CardTitle>
        <CardDescription>
          เพิ่มความปลอดภัยให้กับบัญชีของคุณด้วยการยืนยันตัวตนสองขั้นตอน
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">
              สถานะการยืนยันตัวตนสองขั้นตอน
            </Label>
            <p className="text-sm text-gray-500">
              {is2FAEnabled
                ? 'บัญชีของคุณได้รับการปกป้องด้วย 2FA แล้ว'
                : 'เปิดใช้งาน 2FA เพื่อเพิ่มความปลอดภัย'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {is2FAEnabled ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <Shield className="w-4 h-4 mr-1" />
                เปิดใช้งาน
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                <Shield className="w-4 h-4 mr-1" />
                ปิดใช้งาน
              </span>
            )}
            <Switch
              checked={is2FAEnabled}
              onCheckedChange={onToggle}
              disabled={twoFactorLoading}
            />
          </div>
        </div>

        {is2FAEnabled && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                บัญชีของคุณได้รับการปกป้องแล้ว
              </p>
            </div>
            <p className="mt-1 text-sm text-green-700">
              คุณจะต้องใส่รหัสจากแอป Authenticator ทุกครั้งที่เข้าสู่ระบบ
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

