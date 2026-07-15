'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardCheck, Clock, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import type { ModuleContent as ModuleContentType } from '@/lib/types';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ModuleContent } from './ModuleContent';
import { ExpiryBadge } from './ExpiryBadge';

export interface ModulePlayerProps {
  machineId: string;
  machineName: string;
  moduleId: string;
  title: string;
  titleHi?: string | null;
  content: ModuleContentType;
  contentHi?: ModuleContentType | null;
  hasQuiz: boolean;
  initialStatus: string;
  expiresAt?: string | null;
  estimatedMinutes: number;
  sopVersion?: string | null;
}

export function ModulePlayer({
  machineId,
  machineName,
  moduleId,
  title,
  titleHi,
  content,
  contentHi,
  hasQuiz,
  initialStatus,
  expiresAt,
  estimatedMinutes,
  sopVersion,
}: ModulePlayerProps) {
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const startedRef = useRef(false);
  const [status] = useState(initialStatus);

  // Mark the record IN_PROGRESS when the module opens (once).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    apiFetch('/api/training-records', {
      method: 'POST',
      body: JSON.stringify({ machineId, moduleId }),
    }).catch(() => {
      /* non-blocking — progress tracking is best-effort */
    });
  }, [machineId, moduleId]);

  const isHi = locale === 'hi';
  const shownTitle = isHi && titleHi ? titleHi : title;
  const shownContent = isHi && contentHi ? contentHi : content;
  const completed = status === 'COMPLETED';

  const onReviewed = () => {
    toast({
      title: 'Module reviewed',
      description: hasQuiz
        ? 'Take the quiz to complete this module.'
        : 'You have finished reviewing this module.',
    });
    if (!hasQuiz) router.push(`/training/${machineId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/training/${machineId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to {machineName}
          </Link>
        </Button>
        <LanguageSwitcher />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-xl">{shownTitle}</CardTitle>
              {completed ? (
                <ExpiryBadge expiresAt={expiresAt} status={status} />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {estimatedMinutes} min
              </span>
              {sopVersion ? (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  SOP v{sopVersion}
                </Badge>
              ) : null}
              <Badge variant="teal">ALCOA+</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ModuleContent content={shownContent} />
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {hasQuiz ? (
          <Button asChild variant="success">
            <Link href={`/training/${machineId}/quiz?moduleId=${moduleId}`}>
              <ClipboardCheck className="h-4 w-4" />
              Take quiz
            </Link>
          </Button>
        ) : (
          <Button onClick={onReviewed} variant="success">
            <CheckCircle2 className="h-4 w-4" />
            Mark complete
          </Button>
        )}
      </div>
    </div>
  );
}
