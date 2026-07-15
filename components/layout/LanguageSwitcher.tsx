'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setLocaleCookie } from '@/lib/client';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const router = useRouter();

  const toggle = (next: 'en' | 'hi') => {
    setLocaleCookie(next);
    fetch('/api/users/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: next }),
    }).catch(() => {});
    router.refresh();
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggle(locale === 'en' ? 'hi' : 'en')}
        className="gap-1.5"
        aria-label="Toggle language"
      >
        <Languages className="h-4 w-4" />
        {locale === 'en' ? 'हिंदी' : 'EN'}
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-md border bg-background p-0.5">
      <button
        onClick={() => toggle('en')}
        className={`px-3 py-1.5 text-sm rounded ${locale === 'en' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
      >
        English
      </button>
      <button
        onClick={() => toggle('hi')}
        className={`px-3 py-1.5 text-sm rounded ${locale === 'hi' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
      >
        हिंदी
      </button>
    </div>
  );
}
