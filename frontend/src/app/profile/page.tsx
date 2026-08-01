'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import ProfileHeader from './components/ProfileHeader';
import ProfileInformation from './components/ProfileInformation';
import ChangePassword from './components/ChangePassword';
import OAuthNotice from './components/OAuthNotice';
import TwoFactorAuth from './components/TwoFactorAuth';
import AccountInformation from './components/AccountInformation';
import TwoFactorSetupDialog from './components/TwoFactorSetupDialog';
import PasswordConfirmDialog from './components/PasswordConfirmDialog';
import TotpVerificationDialog from './components/TotpVerificationDialog';
import BackupCodesDialog from './components/BackupCodesDialog';
import OAuthUpdateConfirmDialog from './components/OAuthUpdateConfirmDialog';
import JwtUpdateConfirmDialog from './components/JwtUpdateConfirmDialog';

const profileSchema = z.object({
  name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
  email: z.string().email('กรุณาใส่อีเมลที่ถูกต้อง'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'กรุณาใส่รหัสผ่านปัจจุบัน'),
  newPassword: z.string()
    .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .regex(/[a-z]/, 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
    .regex(/[A-Z]/, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
    .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว')
    .regex(/[^a-zA-Z0-9]/, 'รหัสผ่านต้องมีอักษรพิเศษอย่างน้อย 1 ตัว'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  // Use NextAuth session instead of localStorage
  const { user: sessionUser } = useAuth();
  const { data: session, update: updateSession } = useSession();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Update user from NextAuth session
    if (sessionUser) {
      setUser(sessionUser);
    }
  }, [sessionUser]);

  // Function to update user state and NextAuth session
  const updateUser = async (updates: Partial<any>) => {
    setUser((prev: any) => {
      if (prev) {
        const updatedUser = { ...prev, ...updates };
        return updatedUser;
      }
      return prev;
    });

    // Update NextAuth session to reflect changes immediately
    if (session) {
      await updateSession({
        ...session,
        user: {
          ...(session as any).user,
          ...updates,
        },
      });
    }
  };
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfirmPasswordInModal, setShowConfirmPasswordInModal] = useState(false); // For profile update modal
  const [show2FAPassword, setShow2FAPassword] = useState(false); // For 2FA password dialog
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showTotpDialog, setShowTotpDialog] = useState(false);
  const [passwordAction, setPasswordAction] = useState<'enable' | 'disable'>('enable');
  const [showConfirmPasswordDialog, setShowConfirmPasswordDialog] = useState(false);
  const [showOAuthConfirmDialog, setShowOAuthConfirmDialog] = useState(false);
  const [pendingProfileData, setPendingProfileData] = useState<ProfileFormData | null>(null);
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [passwordLoading2FA, setPasswordLoading2FA] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update form values when user data is loaded
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user, profileForm]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    // Check if user is OAuth/Firebase user (no password)
    const isOAuthUser = user?.preferred_auth_method === 'oauth2' ||
      user?.preferred_auth_method === 'firebase' ||
      !user?.hasPassword;

    if (isOAuthUser) {
      // For OAuth/Firebase users, show confirmation dialog without password
      setPendingProfileData(data);
      setShowOAuthConfirmDialog(true);
    } else {
      // For password-based users, show confirmation modal with password
      setPendingProfileData(data);
      setShowConfirmPasswordDialog(true);
    }
  };

  // New handler for OAuth users confirmation
  const handleOAuthConfirmUpdate = async () => {
    if (!pendingProfileData) {
      toast.error('ไม่พบข้อมูลที่จะอัพเดต');
      return;
    }

    try {
      setLoading(true);



      // Call the update profile API without password
      const response = await authApi.updateUserProfile({
        name: pendingProfileData.name,
        email: pendingProfileData.email,
        currentPassword: '', // Empty password for OAuth users
      });

      if (response.success && response.data) {
        // Update user data in state and NextAuth session
        await updateUser(response.data);
        toast.success('อัพเดตข้อมูลโปรไฟล์สำเร็จ');

        // Close dialog and reset
        setShowOAuthConfirmDialog(false);
        setPendingProfileData(null);
      } else {
        toast.error(response.message || 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล');
      }
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล';
      toast.error(errorMessage);

      // If token is invalid, suggest re-login
      if (error.response?.status === 401) {
        toast.error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOAuthUpdate = () => {
    setShowOAuthConfirmDialog(false);
    setPendingProfileData(null);
  };

  const handleConfirmProfileUpdate = async () => {
    if (!pendingProfileData || !confirmPasswordValue) {
      toast.error('กรุณาใส่รหัสผ่านเพื่อยืนยันการเปลี่ยนแปลง');
      return;
    }

    try {
      setLoading(true);

      // Call the update profile API
      const response = await authApi.updateUserProfile({
        name: pendingProfileData.name,
        email: pendingProfileData.email,
        currentPassword: confirmPasswordValue,
      });

      if (response.success && response.data) {
        // Update user data in state and NextAuth session
        await updateUser(response.data);
        toast.success('อัพเดตข้อมูลโปรไฟล์สำเร็จ');

        // Close modal and reset
        setShowConfirmPasswordDialog(false);
        setPendingProfileData(null);
        setConfirmPasswordValue('');
      } else {
        toast.error(response.message || 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล');
      }
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการอัพเดตข้อมูล';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelProfileUpdate = () => {
    setShowConfirmPasswordDialog(false);
    setPendingProfileData(null);
    setConfirmPasswordValue('');
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setPasswordLoading(true);

      // Call the change password API
      const response = await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      if (response.success) {
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
        passwordForm.reset();
      } else {
        toast.error(response.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      }
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
      toast.error(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    // For OAuth users, skip password confirmation
    if (user?.preferred_auth_method === 'oauth2' || !user?.hasPassword) {
      try {
        setTwoFactorLoading(true);

        // Call backend API to enable 2FA without password
        const response = await authApi.enable2FA(''); // Empty password for OAuth users

        if (response.success && response.data) {
          setQrCodeUrl(response.data.qrCodeUrl);
          setTotpSecret(response.data.secret);
          setShow2FADialog(true);
          toast.success('สร้าง QR Code สำเร็จ กรุณาสแกนด้วยแอป Authenticator');
        } else {
          throw new Error(response.message || 'ไม่สามารถเปิดใช้งาน 2FA ได้');
        }
      } catch (error: any) {
        toast.error(error.message || 'เกิดข้อผิดพลาดในการเปิดใช้งาน 2FA');
      } finally {
        setTwoFactorLoading(false);
      }
    } else {
      // For JWT users, show password confirmation
      setPasswordAction('enable');
      setShowPasswordDialog(true);
    }
  };

  const handleDisable2FA = async () => {
    // For OAuth users, skip password confirmation and go directly to TOTP
    if (user?.preferred_auth_method === 'oauth2' || !user?.hasPassword) {
      setShowTotpDialog(true);
    } else {
      // For JWT users, show password confirmation first
      setPasswordAction('disable');
      setShowPasswordDialog(true);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('กรุณาใส่รหัสยืนยัน 6 หลัก');
      return;
    }

    try {
      setTwoFactorLoading(true);

      // Call backend API to verify 2FA setup
      const response = await authApi.verify2FASetup(totpSecret, verificationCode);

      if (response.success) {
        toast.success('เปิดใช้งานการยืนยันตัวตนสองขั้นตอนสำเร็จ');

        // Show backup codes if provided
        if (response.data?.backupCodes) {
          setBackupCodes(response.data.backupCodes);
          setShowBackupCodesDialog(true);
        }

        setShow2FADialog(false);
        setVerificationCode('');

        // Update user state and session to reflect 2FA enabled
        // Support both camelCase and snake_case
        await updateUser({ 
          twoFactorEnabled: true,
          two_factor_enabled: true 
        });
      } else {
        throw new Error(response.message || 'รหัสยืนยันไม่ถูกต้อง');
      }
    } catch (error: any) {
      toast.error(error.message || 'รหัสยืนยันไม่ถูกต้อง');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast.success('คัดลอกรหัสสำรองแล้ว');
  };


  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([`รหัสสำรองสำหรับการยืนยันตัวตนสองขั้นตอน\n\n${codesText}\n\nหมายเหตุ: เก็บรหัสเหล่านี้ไว้ในที่ปลอดภัย แต่ละรหัสใช้ได้เพียงครั้งเดียว`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes-2fa.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('ดาวน์โหลดรหัสสำรองแล้ว');
  };


  const handlePasswordConfirm = async () => {
    if (!confirmPasswordValue) {
      toast.error('กรุณาใส่รหัสผ่าน');
      return;
    }

    try {
      setPasswordLoading2FA(true);

      if (passwordAction === 'enable') {
        // Call backend API to enable 2FA
        const response = await authApi.enable2FA(confirmPasswordValue);

        if (response.success && response.data) {
          // Backend ส่ง QR Code เป็น base64 data URL มาแล้ว
          setQrCodeUrl(response.data.qrCodeUrl);
          setTotpSecret(response.data.secret);
          setShow2FADialog(true);
          setShowPasswordDialog(false);
          setConfirmPasswordValue('');
          toast.success('สร้าง QR Code สำเร็จ กรุณาสแกนด้วยแอป Authenticator');
        } else {
          throw new Error(response.message || 'ไม่สามารถเปิดใช้งาน 2FA ได้');
        }
      } else if (passwordAction === 'disable') {
        // For disable, we need both password and 2FA token
        setShowPasswordDialog(false);
        setShowTotpDialog(true);
      }
    } catch (error: any) {
      toast.error(error.message || 'รหัสผ่านไม่ถูกต้อง');
    } finally {
      setPasswordLoading2FA(false);
    }
  };

  const handleTotpConfirm = async () => {
    if (!totpToken || totpToken.length !== 6) {
      toast.error('กรุณาใส่รหัส 2FA 6 หลัก');
      return;
    }

    try {
      setPasswordLoading2FA(true);

      // For OAuth users, use empty password
      const password = (user?.preferred_auth_method === 'oauth2' || !user?.hasPassword) ? '' : confirmPasswordValue;
      const response = await authApi.disable2FA(password, totpToken);

      if (response.success) {
        toast.success('ปิดการใช้งานการยืนยันตัวตนสองขั้นตอนแล้ว');
        setShowTotpDialog(false);
        setConfirmPasswordValue('');
        setTotpToken('');

        // Update user state and session to reflect 2FA disabled
        // Support both camelCase and snake_case
        await updateUser({ 
          twoFactorEnabled: false,
          two_factor_enabled: false 
        });
      } else {
        throw new Error(response.message || 'ไม่สามารถปิดใช้งาน 2FA ได้');
      }
    } catch (error: any) {
      toast.error(error.message || 'รหัส 2FA ไม่ถูกต้อง');
    } finally {
      setPasswordLoading2FA(false);
    }
  };

  const handle2FAToggle = (enabled: boolean) => {
    if (enabled) {
      handleEnable2FA();
    } else {
      handleDisable2FA();
    }
  };


  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-5xl mx-auto">
          <ProfileHeader userName={user?.name} />

          <div className="space-y-4 sm:space-y-6">
            {/* Profile Information */}
            <ProfileInformation
              user={user}
              profileForm={profileForm}
              loading={loading}
              onSubmit={onProfileSubmit}
            />

            {/* Password Change - Only show for JWT users */}
            {(user?.preferred_auth_method === 'jwt' && user?.hasPassword) ? (
              <ChangePassword
                passwordForm={passwordForm}
                passwordLoading={passwordLoading}
                showCurrentPassword={showCurrentPassword}
                showNewPassword={showNewPassword}
                showConfirmPassword={showConfirmPassword}
                setShowCurrentPassword={setShowCurrentPassword}
                setShowNewPassword={setShowNewPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                onSubmit={onPasswordSubmit}
              />
            ) : (
              <OAuthNotice user={user} />
            )}

            {/* Two-Factor Authentication - Only show for JWT users */}
            {user?.preferred_auth_method === 'jwt' && user?.hasPassword && (
              <TwoFactorAuth
                user={user}
                twoFactorLoading={twoFactorLoading}
                onToggle={handle2FAToggle}
              />
            )}

            {/* Account Information */}
            {/* <AccountInformation user={user} /> */}
          </div>

          {/* Dialogs */}
          <TwoFactorSetupDialog
            open={show2FADialog}
            onOpenChange={setShow2FADialog}
            qrCodeUrl={qrCodeUrl}
            totpSecret={totpSecret}
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            loading={twoFactorLoading}
            onVerify={handleVerify2FA}
          />

          <PasswordConfirmDialog
            open={showPasswordDialog}
            onOpenChange={setShowPasswordDialog}
            action={passwordAction}
            password={confirmPasswordValue}
            setPassword={setConfirmPasswordValue}
            showPassword={show2FAPassword}
            setShowPassword={setShow2FAPassword}
            loading={passwordLoading2FA}
            onConfirm={handlePasswordConfirm}
            onCancel={() => {
              setShowPasswordDialog(false);
              setConfirmPasswordValue('');
            }}
          />

          <TotpVerificationDialog
            open={showTotpDialog}
            onOpenChange={setShowTotpDialog}
            token={totpToken}
            setToken={setTotpToken}
            loading={passwordLoading2FA}
            onConfirm={handleTotpConfirm}
            onCancel={() => {
              setShowTotpDialog(false);
              setTotpToken('');
              setConfirmPasswordValue('');
            }}
          />

          <BackupCodesDialog
            open={showBackupCodesDialog}
            onOpenChange={setShowBackupCodesDialog}
            backupCodes={backupCodes}
            onCopy={handleCopyBackupCodes}
            onDownload={handleDownloadBackupCodes}
          />

          <OAuthUpdateConfirmDialog
            open={showOAuthConfirmDialog}
            onOpenChange={setShowOAuthConfirmDialog}
            pendingData={pendingProfileData}
            user={user}
            loading={loading}
            onConfirm={handleOAuthConfirmUpdate}
            onCancel={handleCancelOAuthUpdate}
          />

          <JwtUpdateConfirmDialog
            open={showConfirmPasswordDialog}
            onOpenChange={setShowConfirmPasswordDialog}
            pendingData={pendingProfileData}
            user={user}
            password={confirmPasswordValue}
            setPassword={setConfirmPasswordValue}
            showPassword={showConfirmPasswordInModal}
            setShowPassword={setShowConfirmPasswordInModal}
            loading={loading}
            onConfirm={handleConfirmProfileUpdate}
            onCancel={handleCancelProfileUpdate}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

