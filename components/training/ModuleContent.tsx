import { Target, ListChecks, ShieldAlert, BookOpen } from 'lucide-react';
import type { ModuleContent as ModuleContentType } from '@/lib/types';

export interface ModuleContentProps {
  content: ModuleContentType;
}

/** Presentational renderer for a TrainingModule's ModuleContent JSON. */
export function ModuleContent({ content }: ModuleContentProps) {
  return (
    <div className="space-y-8">
      {content.summary ? (
        <p className="text-base leading-relaxed text-slate-700">{content.summary}</p>
      ) : null}

      {content.objectives?.length ? (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-pharma-blue">
            <Target className="h-5 w-5" />
            Learning objectives
          </h3>
          <ul className="space-y-2">
            {content.objectives.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.sections?.map((s, i) => (
        <section key={i}>
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <BookOpen className="h-5 w-5 text-pharma-teal" />
            {s.heading}
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{s.body}</p>
          {s.bullets?.length ? (
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
              {s.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          ) : null}
          {s.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.imageUrl}
              alt={s.heading}
              className="mt-3 max-h-80 w-full rounded-lg border object-contain"
            />
          ) : null}
        </section>
      ))}

      {content.keyPoints?.length ? (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-pharma-blue">
            <ListChecks className="h-5 w-5" />
            Key points
          </h3>
          <ul className="space-y-2 text-sm text-slate-700">
            {content.keyPoints.map((k, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-pharma-blue">•</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.safetyNotes?.length ? (
        <section className="rounded-xl border border-pharma-warning/30 bg-pharma-warning/10 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-pharma-warning">
            <ShieldAlert className="h-5 w-5" />
            Safety notes
          </h3>
          <ul className="space-y-2 text-sm text-slate-800">
            {content.safetyNotes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-pharma-warning">!</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
