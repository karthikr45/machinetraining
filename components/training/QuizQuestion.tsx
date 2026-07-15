'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuizQuestionData {
  id: string;
  question: string;
  questionHi?: string;
  options: string[];
  optionsHi?: string[];
}

export interface QuizQuestionProps {
  data: QuizQuestionData;
  index: number;
  total: number;
  locale: string;
  selected: number | null;
  onSelect: (optionIndex: number) => void;
  /** When set, the question is in review mode and answers are revealed. */
  review?: {
    correctIndex: number;
    selected: number;
  } | null;
}

/** A single multiple-choice quiz question. Bilingual (en/hi) aware. */
export function QuizQuestion({
  data,
  index,
  total,
  locale,
  selected,
  onSelect,
  review,
}: QuizQuestionProps) {
  const isHi = locale === 'hi';
  const questionText = isHi && data.questionHi ? data.questionHi : data.question;
  const options = isHi && data.optionsHi?.length ? data.optionsHi : data.options;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-xs font-semibold text-muted-foreground">
          {index + 1}/{total}
        </span>
        <h3 className="text-base font-semibold text-slate-900">{questionText}</h3>
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => {
          const isChosen = review ? review.selected === i : selected === i;
          const isCorrect = review && review.correctIndex === i;
          const isWrongChoice = review && review.selected === i && review.selected !== review.correctIndex;

          return (
            <button
              key={i}
              type="button"
              disabled={Boolean(review)}
              onClick={() => onSelect(i)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors min-h-[44px]',
                !review && isChosen && 'border-primary bg-primary/5 ring-1 ring-primary',
                !review && !isChosen && 'border-input hover:bg-accent',
                isCorrect && 'border-pharma-success bg-pharma-success/10',
                isWrongChoice && 'border-destructive bg-destructive/10',
                review && !isCorrect && !isWrongChoice && 'border-input opacity-70'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  isChosen ? 'border-primary text-primary' : 'border-muted-foreground/40 text-muted-foreground'
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {isCorrect ? <CheckCircle2 className="h-5 w-5 text-pharma-success" /> : null}
              {isWrongChoice ? <XCircle className="h-5 w-5 text-destructive" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
