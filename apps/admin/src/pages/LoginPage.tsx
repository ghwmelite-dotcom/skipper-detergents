import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label, FieldError } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import { useAuthStore, type AdminSessionUser } from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  remember: z.boolean().optional(),
});
type LoginInput = z.infer<typeof loginSchema>;

interface LoginResponse {
  token: string;
  expires_in: number;
  user: AdminSessionUser;
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { token, login } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (values: LoginInput): Promise<void> => {
    setServerError(null);
    try {
      const data = await api.post<LoginResponse>('/api/admin/auth/login', {
        email: values.email,
        password: values.password,
      });
      login(data.token, data.user, values.remember ?? true);
      navigate('/', { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setServerError(e.message);
      } else {
        setServerError('Unexpected error — try again');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-md border border-ink-200 bg-white p-6 shadow-admin-md"
      >
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded bg-navy-700 flex items-center justify-center text-white font-bold">
            S
          </div>
          <h1 className="text-base font-semibold text-ink-900">Skipper Admin</h1>
          <p className="mt-1 text-xs text-ink-500">Sign in with your admin credentials</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              invalid={!!errors.email}
              {...register('email')}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                invalid={!!errors.password}
                className="pr-9"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700"
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={errors.password?.message} />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-ink-600 select-none">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-ink-300"
              {...register('remember')}
            />
            Remember me on this device
          </label>
        </div>

        {serverError && (
          <div className="mt-3 rounded border border-danger-500/30 bg-danger-50 px-3 py-2 text-xs text-danger-600">
            {serverError}
          </div>
        )}

        <Button type="submit" size="lg" className="mt-5 w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </div>
  );
}
