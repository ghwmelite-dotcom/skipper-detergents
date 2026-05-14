import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label, FieldError } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';

const schema = z
  .object({
    new_password: z.string().min(12, 'Minimum 12 characters'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  });
type Input = z.infer<typeof schema>;

export function ResetPasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  if (!token) return <Navigate to="/forgot-password" replace />;

  const onSubmit = async (values: Input): Promise<void> => {
    setServerError(null);
    try {
      await api.post('/api/admin/auth/reset-password', {
        token,
        new_password: values.new_password,
      });
      navigate('/login?reset=1', { replace: true });
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
          <div className="mx-auto mb-3 h-10 w-10 rounded bg-navy-700 flex items-center justify-center text-white">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-base font-semibold text-ink-900">Choose a new password</h1>
          <p className="mt-1 text-xs text-ink-500">
            Pick something only you would know. Minimum 12 characters.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="new_password">New password</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                invalid={!!errors.new_password}
                className="pr-9"
                {...register('new_password')}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={errors.new_password?.message} />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              invalid={!!errors.confirm_password}
              {...register('confirm_password')}
            />
            <FieldError message={errors.confirm_password?.message} />
          </div>
        </div>

        {serverError && (
          <div className="mt-3 rounded border border-danger-500/30 bg-danger-50 px-3 py-2 text-xs text-danger-600">
            {serverError}{' '}
            {serverError.toLowerCase().includes('expired') && (
              <Link to="/forgot-password" className="underline">
                Request a new link
              </Link>
            )}
          </div>
        )}

        <Button type="submit" size="lg" className="mt-5 w-full" loading={isSubmitting}>
          Update password
        </Button>

        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-700 hover:text-ink-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
