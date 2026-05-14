import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label, FieldError } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});
type Input = z.infer<typeof schema>;

export function ForgotPasswordPage(): JSX.Element {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: Input): Promise<void> => {
    setServerError(null);
    try {
      await api.post('/api/admin/auth/forgot-password', { email: values.email });
      setSent(true);
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
      <div className="w-full max-w-sm rounded-md border border-ink-200 bg-white p-6 shadow-admin-md">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded bg-navy-700 flex items-center justify-center text-white">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-base font-semibold text-ink-900">Forgot your password?</h1>
          <p className="mt-1 text-xs text-ink-500">
            Enter the email tied to your admin account. We'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded border border-success-500/30 bg-success-50 px-3 py-3 text-xs text-success-700">
              If an account exists for that email, a reset link is on its way. It will expire in
              30 minutes. Check your inbox (and spam folder, just in case).
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700 hover:text-ink-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
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
            </div>

            {serverError && (
              <div className="mt-3 rounded border border-danger-500/30 bg-danger-50 px-3 py-2 text-xs text-danger-600">
                {serverError}
              </div>
            )}

            <Button type="submit" size="lg" className="mt-5 w-full" loading={isSubmitting}>
              Send reset link
            </Button>

            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-700 hover:text-ink-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
