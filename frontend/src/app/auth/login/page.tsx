'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithGoogle } from '@/lib/firebase';
import TwoFactorModal from '@/components/TwoFactorModal';
import { authApi } from '@/lib/api';
import { ASSETS } from '@/lib/assets';

const REMEMBER_LOGIN_KEY = 'pose_login_remember';

type RememberPayload = {
  email: string;
  /** base64 — ไม่ใช่การเข้ารหัสปลอดภัย แค่ไม่เก็บ plaintext ตรงๆ */
  password: string;
};

function encodeRemember(password: string): string {
  try {
    return btoa(unescape(encodeURIComponent(password)));
  } catch {
    return btoa(password);
  }
}

function decodeRemember(encoded: string): string {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    try {
      return atob(encoded);
    } catch {
      return '';
    }
  }
}

function loadRememberedLogin(): { email: string; password: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberPayload;
    if (!parsed?.email || !parsed?.password) return null;
    const password = decodeRemember(parsed.password);
    if (!password) return null;
    return { email: parsed.email, password };
  } catch {
    return null;
  }
}

function saveRememberedLogin(email: string, password: string) {
  localStorage.setItem(
    REMEMBER_LOGIN_KEY,
    JSON.stringify({ email, password: encodeRemember(password) } satisfies RememberPayload),
  );
}

function clearRememberedLogin() {
  localStorage.removeItem(REMEMBER_LOGIN_KEY);
}

export default function LoginPage() {
  const [error, setError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tempToken, setTempToken] = useState<string>('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const saved = loadRememberedLogin();
    if (!saved) return;
    setRememberLogin(true);
    setValue('email', saved.email);
    setValue('password', saved.password);
  }, [setValue]);

  // Email/Password Login
  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      setEmailError('');
      setPasswordError('');
      setLoading(true);

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Check if error indicates 2FA is required
        if (result.error.includes('2FA') || result.error.includes('verification required')) {
          try {
            const loginResponse = await authApi.login(data);
            if ((loginResponse as any).requiresTwoFactor && loginResponse.data?.tempToken) {
              setTempToken(loginResponse.data.tempToken);
              setShow2FAModal(true);
              if (rememberLogin) saveRememberedLogin(data.email, data.password);
              else clearRememberedLogin();
              return;
            }
          } catch {
            // Continue with regular error handling
          }
        }

        const errorMessage = result.error;

        if (errorMessage.includes('Invalid credentials')) {
          setEmailError('error');
          setPasswordError('error');
          setError(errorMessage);
          toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        } else if (errorMessage.includes('disabled') || errorMessage.includes('deactivated')) {
          setError(errorMessage);
          toast.error(errorMessage);
        } else if (errorMessage.includes('Google Login') || errorMessage.includes('OAuth')) {
          setError(errorMessage);
          toast.error(errorMessage);
        } else {
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } else {
        if (rememberLogin) saveRememberedLogin(data.email, data.password);
        else clearRememberedLogin();
        toast.success('เข้าสู่ระบบสำเร็จ');
        router.refresh();
        const session = await getSession();
        const isAdmin = (session as { user?: { is_admin?: boolean } })?.user?.is_admin === true;
        router.push(isAdmin ? '/admin/dashboard' : '/staff/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  // Handle 2FA verification
  const handle2FAVerify = async (code: string) => {
    try {
      setTwoFactorLoading(true);

      const response = await authApi.loginWith2FA(tempToken, code);

      if (response.success && response.data) {
        const { user, token } = response.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        }

        const result = await signIn('credentials', {
          email: user.email,
          password: 'bypass-2fa-verified',
          '2fa_token': token,
          redirect: false,
        });

        if (result?.ok) {
          setShow2FAModal(false);
          toast.success('เข้าสู่ระบบสำเร็จ');
          router.refresh();
          const session = await getSession();
          const isAdmin = (session as { user?: { is_admin?: boolean } })?.user?.is_admin === true;
          router.push(isAdmin ? '/admin/dashboard' : '/staff/dashboard');
        } else if (result?.error) {
          throw new Error(result.error);
        } else {
          throw new Error('Failed to create session');
        }
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'รหัสไม่ถูกต้อง');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Firebase Login
  const handleFirebaseLogin = async () => {
    try {
      setError('');
      setFirebaseLoading(true);

      const { idToken } = await signInWithGoogle();

      const result = await signIn('firebase', {
        idToken,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success('เข้าสู่ระบบสำเร็จ');
        router.refresh();
        const session = await getSession();
        const isAdmin = (session as { user?: { is_admin?: boolean } })?.user?.is_admin === true;
        router.push(isAdmin ? '/admin/dashboard' : '/staff/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Firebase');
      toast.error(err.message || 'Failed to sign in with Firebase');
    } finally {
      setFirebaseLoading(false);
    }
  };

  return (
    <>
      <TwoFactorModal
        isOpen={show2FAModal}
        onClose={() => {
          setShow2FAModal(false);
          setTempToken('');
        }}
        onVerify={handle2FAVerify}
        loading={twoFactorLoading}
      />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="flex justify-center mb-4">
              <img
                src={ASSETS.LOGO}
                alt="POSE Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              เข้าสู่ระบบ
            </CardTitle>
            <CardDescription className="text-gray-600">
              เข้าสู่ระบบจัดการเวชภัณฑ์ POSE
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className={`text-sm font-medium transition-colors ${
                    errors.email || emailError ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  อีเมล *
                </Label>
                <div className="relative">
                  <Mail
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
                      errors.email || emailError ? 'text-red-400' : 'text-gray-400'
                    }`}
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="username"
                    className={`pl-10 h-12 border-2 transition-all duration-200 ${
                      errors.email || emailError
                        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 shadow-sm shadow-red-100 animate-shake'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-medium animate-shake">
                    <span>⚠️</span>
                    <span>{errors.email.message}</span>
                  </p>
                )}
                {emailError && !errors.email && emailError !== 'error' && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-medium animate-shake">
                    <span>❌</span>
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className={`text-sm font-medium transition-colors ${
                    errors.password || passwordError ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  รหัสผ่าน *
                </Label>
                <div className="relative">
                  <Lock
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
                      errors.password || passwordError ? 'text-red-400' : 'text-gray-400'
                    }`}
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete={rememberLogin ? 'current-password' : 'off'}
                    className={`pl-10 pr-10 h-12 border-2 transition-all duration-200 ${
                      errors.password || passwordError
                        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 shadow-sm shadow-red-100 animate-shake'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-medium animate-shake">
                    <span>⚠️</span>
                    <span>{errors.password.message}</span>
                  </p>
                )}
                {passwordError && !errors.password && passwordError !== 'error' && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-medium animate-shake">
                    <span>❌</span>
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-login"
                  checked={rememberLogin}
                  onCheckedChange={(checked) => {
                    const on = checked === true;
                    setRememberLogin(on);
                    if (!on) clearRememberedLogin();
                  }}
                />
                <Label
                  htmlFor="remember-login"
                  className="cursor-pointer select-none text-sm font-medium text-gray-700"
                >
                  จดจำอีเมลและรหัสผ่าน
                </Label>
              </div>

              {error && (
                <div className="text-sm text-red-600 text-center bg-red-50/80 border-2 border-red-200 p-4 rounded-xl flex items-center justify-center space-x-2 animate-shake shadow-lg shadow-red-100">
                  <span className="text-lg">❌</span>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-13 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 text-white font-semibold text-base transition-all duration-300 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:scale-[1.02] active:scale-[0.98] rounded-xl border border-blue-400/20"
                disabled={loading || firebaseLoading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>เข้าสู่ระบบ</span>
                  </div>
                )}
              </Button>

              <div className="space-y-3 pt-2">
                <Link href="/" className="block">
                  <Button
                    variant="ghost"
                    className="w-full h-11 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      กลับหน้าหลัก
                    </span>
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
