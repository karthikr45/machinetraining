'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

interface DemoAccount {
  label: string;
  email: string;
  badge: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: 'Admin', email: 'admin@demo.com', badge: 'ADMIN' },
  { label: 'Operator', email: 'operator1@demo.com', badge: 'OPERATOR' },
  { label: 'QA', email: 'qa@demo.com', badge: 'QA' },
  { label: 'Trainer', email: 'trainer@demo.com', badge: 'TRAINER' },
];

const DEMO_PASSWORD = 'demo123';

export default function LoginPage() {
  const t = useTranslations('login');
  const tt = (key: string, fallback: string) => (t.has(key) ? t(key) : fallback);

  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const invalidMessage = tt('invalid', 'Invalid email or password');

  async function authenticate(nextEmail: string, nextPassword: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: nextEmail,
        password: nextPassword,
      });
      if (!res || res.error) {
        setError(invalidMessage);
        toast({
          variant: 'destructive',
          title: tt('signIn', 'Sign In'),
          description: invalidMessage,
        });
        return;
      }
      toast({
        title: tt('title', 'PharmaTrainX'),
        description: tt('welcome', 'Signed in successfully.'),
      });
      router.push('/dashboard');
    } catch {
      setError(invalidMessage);
      toast({
        variant: 'destructive',
        title: tt('signIn', 'Sign In'),
        description: invalidMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await authenticate(email.trim(), password);
  }

  async function handleDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    await authenticate(demoEmail, DEMO_PASSWORD);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold text-pharma-blue">
            <span aria-hidden>💊</span>
            <span>{tt('title', 'PharmaTrainX')}</span>
          </div>
          <LanguageSwitcher compact />
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">{tt('signIn', 'Sign In')}</CardTitle>
            <CardDescription>
              {tt('subtitle', 'AI-Powered Pharma Machine Training Platform')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{tt('email', 'Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{tt('password', 'Password')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {tt('signIn', 'Sign In')}
              </Button>
            </form>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {tt('demoTitle', 'Demo Accounts')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  disabled={loading}
                  onClick={() => handleDemo(account.email)}
                >
                  {account.label}
                </Button>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {tt('noAccount', 'No account yet?')}{' '}
              <Link href="/register" className="font-medium text-pharma-blue hover:underline">
                {tt('register', 'Register')}
              </Link>
            </p>
          </CardContent>

          <CardFooter>
            <div className="flex items-start gap-2 rounded-md bg-slate-50 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pharma-success" />
              <span>
                {tt(
                  'cfrNotice',
                  'This system maintains electronic records and electronic signatures in accordance with 21 CFR Part 11 and Schedule M. All actions are attributable, contemporaneous and recorded in an immutable audit trail.'
                )}
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
