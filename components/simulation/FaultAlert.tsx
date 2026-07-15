'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, XCircle, ShieldAlert, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Fault, FaultResponse } from '@/lib/types';
import { evaluateFaultResponse } from '@/lib/fault-library';
import {
  DEVIATION_ROOT_CAUSES,
  DEVIATION_ACTIONS,
  DEVIATION_PENALTY,
} from '@/lib/simulation-shared';

interface FaultAlertProps {
  fault: Fault;
  onResolved: (response: FaultResponse) => void;
}

const severityVariant: Record<Fault['severity'], 'warning' | 'destructive' | 'purple' | 'gray'> = {
  LOW: 'gray',
  MEDIUM: 'warning',
  HIGH: 'destructive',
  CRITICAL: 'purple',
};

/**
 * Modal fault-scenario handler. Presents a GMP fault, evaluates the operator's
 * response, then (when a deviation is required) forces documentation before the
 * simulation can continue. Skipping documentation flags a penalty.
 */
export function FaultAlert({ fault, onResolved }: FaultAlertProps) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const [answered, setAnswered] = React.useState(false);
  const [rootCause, setRootCause] = React.useState('');
  const [action, setAction] = React.useState('');

  const evalResult = answered && selected !== null ? evaluateFaultResponse(fault.id, selected) : null;
  const correct = evalResult?.correct ?? false;

  function finish(documented: boolean) {
    if (selected === null) return;
    onResolved({
      faultId: fault.id,
      stage: fault.stage,
      selectedOption: selected,
      correct,
      pointsAwarded: correct ? fault.points : -5,
      deviationDocumented: fault.deviationRequired ? documented : true,
      rootCause: documented ? rootCause : undefined,
      actionTaken: documented ? action : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="w-full max-w-lg rounded-xl border bg-card shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start gap-3 border-b p-4 sm:p-5">
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="mt-0.5 text-pharma-danger"
          >
            <AlertTriangle className="h-6 w-6" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-pharma-danger">
                Process Alert
              </span>
              <Badge variant={severityVariant[fault.severity]}>{fault.severity}</Badge>
              {fault.deviationRequired && (
                <Badge variant="outline" className="gap-1">
                  <FileWarning className="h-3 w-3" /> Deviation
                </Badge>
              )}
            </div>
            <h3 className="mt-1 text-base font-semibold leading-tight">{fault.title}</h3>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <p className="rounded-lg bg-pharma-danger/5 p-3 text-sm text-foreground">
            {fault.description}
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium">What is the correct GMP response?</p>
            {fault.options.map((opt, i) => {
              const isSel = selected === i;
              const isCorrectOpt = answered && i === fault.correctAnswer;
              const isWrongSel = answered && isSel && i !== fault.correctAnswer;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={answered}
                  onClick={() => setSelected(i)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors min-h-[44px]',
                    !answered && isSel && 'border-pharma-blue bg-pharma-blue/5',
                    !answered && !isSel && 'hover:bg-accent',
                    isCorrectOpt && 'border-pharma-success bg-pharma-success/10',
                    isWrongSel && 'border-pharma-danger bg-pharma-danger/10',
                    answered && 'cursor-default'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      isSel && !answered && 'border-pharma-blue text-pharma-blue',
                      isCorrectOpt && 'border-pharma-success bg-pharma-success text-white',
                      isWrongSel && 'border-pharma-danger bg-pharma-danger text-white'
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-pharma-success" />}
                  {isWrongSel && <XCircle className="h-4 w-4 text-pharma-danger" />}
                </button>
              );
            })}
          </div>

          {!answered && (
            <Button
              className="w-full"
              disabled={selected === null}
              onClick={() => setAnswered(true)}
            >
              Submit Response
            </Button>
          )}

          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 overflow-hidden"
              >
                <div
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    correct
                      ? 'border-pharma-success/40 bg-pharma-success/5'
                      : 'border-pharma-danger/40 bg-pharma-danger/5'
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    {correct ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-pharma-success" />
                        <span className="text-pharma-success">Correct — {fault.points} points</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-pharma-danger" />
                        <span className="text-pharma-danger">Incorrect — 5 points deducted</span>
                      </>
                    )}
                  </div>
                  <p className="text-muted-foreground">{fault.explanation}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span className="font-medium">GMP Reference:</span> {fault.gmpReference}
                  </p>
                </div>

                {fault.deviationRequired ? (
                  <div className="space-y-3 rounded-lg border border-pharma-warning/40 bg-pharma-warning/5 p-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-pharma-warning">
                      <FileWarning className="h-4 w-4" /> Deviation documentation required
                    </p>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Root cause</label>
                      <Select value={rootCause} onValueChange={setRootCause}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select root cause" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEVIATION_ROOT_CAUSES.map((rc) => (
                            <SelectItem key={rc} value={rc}>
                              {rc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Action taken</label>
                      <Select value={action} onValueChange={setAction}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select corrective action" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEVIATION_ACTIONS.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        className="flex-1"
                        variant="success"
                        disabled={!rootCause || !action}
                        onClick={() => finish(true)}
                      >
                        Confirm Deviation & Continue
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => finish(false)}
                      >
                        Skip (−{DEVIATION_PENALTY} pts)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => finish(true)}>
                    Acknowledge & Continue
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
