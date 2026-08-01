import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';

interface AccountInformationProps {
  user: any;
}

export default function AccountInformation({ user }: AccountInformationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>ข้อมูลบัญชี</span>
        </CardTitle>
        <CardDescription>
          ข้อมูลเพิ่มเติมเกี่ยวกับบัญชีของคุณ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-gray-700">ID ผู้ใช้</Label>
            <p className="mt-1 text-sm text-gray-900">{user?.id}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">วิธีการเข้าสู่ระบบ</Label>
            <p className="mt-1 text-sm text-gray-900">
              {user?.preferred_auth_method === 'oauth2' ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  🔗 OAuth (Google)
                </span>
              ) : user?.preferred_auth_method === 'jwt' ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🔑 รหัสผ่าน
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  ❓ ไม่ระบุ
                </span>
              )}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">วันที่สร้างบัญชี</Label>
            <p className="mt-1 text-sm text-gray-900">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '-'}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700">สถานะรหัสผ่าน</Label>
            <p className="mt-1 text-sm text-gray-900">
              {user?.hasPassword ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✅ มีรหัสผ่าน
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  ⚠️ ไม่มีรหัสผ่าน (OAuth เท่านั้น)
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

