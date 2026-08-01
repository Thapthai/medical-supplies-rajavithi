import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { User, Mail, Save } from 'lucide-react';

interface ProfileInformationProps {
  user: any;
  profileForm: UseFormReturn<any>;
  loading: boolean;
  onSubmit: (data: any) => void;
}

export default function ProfileInformation({
  user,
  profileForm,
  loading,
  onSubmit,
}: ProfileInformationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>ข้อมูลโปรไฟล์</span>
        </CardTitle>
        <CardDescription>
          {user?.preferred_auth_method === 'oauth2'
            ? 'อัพเดตชื่อของคุณ (อีเมลมาจาก OAuth Provider)'
            : 'อัพเดตข้อมูลส่วนตัวของคุณ'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onSubmit)} className="space-y-4">
            <div className={`grid grid-cols-1 gap-4 ${(user?.preferred_auth_method === 'jwt' && user?.hasPassword) ? 'md:grid-cols-2' : ''}`}>
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="ชื่อของคุณ"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email field - Only show for JWT users */}
              {user?.preferred_auth_method === 'jwt' && user?.hasPassword && (
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>อีเมล</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* OAuth Email Display - Read-only */}
              {user?.preferred_auth_method === 'oauth2' && (
                <div className="col-span-full">
                  <Label className="text-sm font-medium text-gray-700">อีเมล (จาก OAuth Provider)</Label>
                  <div className="mt-1 relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      value={user?.email || ''}
                      className="pl-10 bg-gray-50 cursor-not-allowed"
                      disabled
                      readOnly
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    อีเมลนี้มาจาก OAuth Provider และไม่สามารถเปลี่ยนแปลงได้
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>บันทึกการเปลี่ยนแปลง</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

