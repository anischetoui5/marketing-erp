'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { getApiError } from '@/lib/auth';

const PASSWORD_RULES = [
  { label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
  { label: 'One special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

const schema = z
  .object({
    password: z
      .string()
      .min(10, 'Minimum 10 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/\d/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const passwordValue = watch('password', '');

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setServerError('Invalid invitation link — no token found.');
      return;
    }
    setServerError('');
    try {
      await api.post('/api/users/accept-invitation', { token, password: data.password });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setServerError(getApiError(err));
    }
  };

  if (done) {
    return (
      <div className="text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900">Account activated!</h2>
        <p className="text-gray-500">Redirecting you to login…</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>Choose a strong password to activate your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <ul className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(passwordValue);
                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    <span>{ok ? '✓' : '○'}</span>
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            {isSubmitting ? 'Activating…' : 'Activate account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <BarChart2 className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">MarketingERP</span>
        </div>
        <Suspense fallback={<div className="text-center text-gray-500 py-8">Loading…</div>}>
          <AcceptInvitationForm />
        </Suspense>
      </div>
    </div>
  );
}
