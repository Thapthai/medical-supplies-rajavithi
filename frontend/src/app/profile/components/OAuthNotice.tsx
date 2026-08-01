import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface OAuthNoticeProps {
  user: any;
}

export default function OAuthNotice({ user }: OAuthNoticeProps) {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-900">
          <Lock className="h-5 w-5" />
          <span>เปลี่ยนรหัสผ่าน</span>
        </CardTitle>
        <CardDescription className="text-blue-700">
          คุณเข้าสู่ระบบด้วย {user?.preferred_auth_method === 'oauth2' ? 'OAuth2' : user?.preferred_auth_method === 'firebase' ? 'Google' : 'OAuth'} จึงไม่สามารถเปลี่ยนรหัสผ่านได้
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-blue-700">
          🔐 บัญชีของคุณได้รับการปกป้องโดย {user?.preferred_auth_method === 'firebase' ? 'Google' : 'OAuth2'} Provider อยู่แล้ว
        </p>
      </CardContent>
    </Card>
  );
}

