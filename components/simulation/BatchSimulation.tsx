'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { SIMULATION_STAGES } from '@/lib/types';
import type { StageResult, FaultResponse, SimulationSubmission, BMRDocument } from '@/lib/types';
import {
  calculateStageScore,
  generateBMRData,
} from '@/lib/simulation-engine';
import { computeFaultDelta, STAGE_ORDER, type SimConfigDTO, type SimStartResponse } from '@/lib/simulation-shared';
import { clamp, round } from '@/lib/utils';
import { SimulationHeader } from './SimulationHeader';
import { StageNavigator } from './StageNavigator';
import { Stage1Dispensing } from './Stage1Dispensing';
import { Stage2Granulation } from './Stage2Granulation';
import { Stage3Compression } from './Stage3Compression';
import { Stage4Coating } from './Stage4Coating';
import { Stage5QC } from './Stage5QC';
import { Stage6BMR } from './Stage6BMR';

interface BatchSimulationProps {
  machineId: string;
  operatorName: string;
  operatorDesignation: string;
  onSubmit: (submission: SimulationSubmission) => Promise<void>;
  onExit: () => void;
}

interface SavedState {
  batchNumber: string;
  currentIndex: number;
  elapsedSeconds: number;
  stageResults: StageResult[];
  faultResponses: FaultResponse[];
  savedAt: number;
}

const STORAGE_PREFIX = 'pharmatrainx-sim-';
const MAX_RESUME_AGE_MS = 1000 * 60 * 60 * 6; // 6 hours

function mergeFaults(prev: FaultResponse[], next: FaultResponse[]): FaultResponse[] {
  const map = new Map<string, FaultResponse>();
  for (const r of prev) map.set(r.faultId, r);
  for (const r of next) map.set(r.faultId, r);
  return Array.from(map.values());
}

export function BatchSimulation({
  machineId,
  operatorName,
  operatorDesignation,
  onSubmit,
  onExit,
}: BatchSimulationProps) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [config, setConfig] = React.useState<SimConfigDTO | null>(null);
  const [batchNumber, setBatchNumber] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [stageResults, setStageResults] = React.useState<StageResult[]>([]);
  const [faultResponses, setFaultResponses] = React.useState<FaultResponse[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const storageKey = STORAGE_PREFIX + machineId;
  const finished = React.useRef(false);

  // --- Load config + start, resume if a saved session exists. ---
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<SimStartResponse>('/api/simulation/start', {
          method: 'POST',
          body: JSON.stringify({ machineId }),
        });
        if (!active) return;
        setConfig(res.config);

        let resumed = false;
        try {
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
          if (raw) {
            const saved = JSON.parse(raw) as SavedState;
            if (saved && Date.now() - saved.savedAt < MAX_RESUME_AGE_MS && saved.currentIndex < 5) {
              setBatchNumber(saved.batchNumber);
              setCurrentIndex(saved.currentIndex);
              setElapsedSeconds(saved.elapsedSeconds);
              setStageResults(saved.stageResults ?? []);
              setFaultResponses(saved.faultResponses ?? []);
              resumed = true;
            }
          }
        } catch {
          /* ignore malformed saved state */
        }

        if (!resumed) {
          setBatchNumber(res.batchNumber);
        } else {
          toast({ title: 'Session resumed', description: 'Your in-progress batch was restored.' });
        }
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || 'Failed to start simulation');
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId]);

  // --- Elapsed timer ---
  React.useEffect(() => {
    if (loading || paused || submitting || currentIndex > 5) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading, paused, submitting, currentIndex]);

  // --- Persist snapshot: on change and every 60s ---
  const persist = React.useCallback(() => {
    if (finished.current || typeof window === 'undefined' || !batchNumber) return;
    const snapshot: SavedState = {
      batchNumber,
      currentIndex,
      elapsedSeconds,
      stageResults,
      faultResponses,
      savedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      /* storage full / unavailable */
    }
  }, [batchNumber, currentIndex, elapsedSeconds, stageResults, faultResponses, storageKey]);

  React.useEffect(() => {
    persist();
  }, [currentIndex, stageResults, faultResponses, persist]);

  React.useEffect(() => {
    const id = setInterval(persist, 60000);
    return () => clearInterval(id);
  }, [persist]);

  // --- Warn before unload if incomplete ---
  React.useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (finished.current || submitting) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [submitting]);

  const runningScore = React.useMemo(() => {
    const base = stageResults.reduce((sum, s) => sum + calculateStageScore(s), 0);
    const delta = computeFaultDelta(faultResponses);
    return clamp(round(base + delta, 1), 0, 100);
  }, [stageResults, faultResponses]);

  const completedCount = stageResults.filter((s) => s.stage !== 'bmr').length;

  function handleStageComplete(result: StageResult, newFaults: FaultResponse[]) {
    setStageResults((prev) => [...prev.filter((s) => s.stage !== result.stage), result]);
    setFaultResponses((prev) => mergeFaults(prev, newFaults));
    setCurrentIndex((i) => Math.min(5, i + 1));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSign(result: StageResult, newFaults: FaultResponse[], password: string) {
    if (!config) return;
    const finalStages = [...stageResults.filter((s) => s.stage !== 'bmr'), result];
    const finalFaults = mergeFaults(faultResponses, newFaults);
    const submission: SimulationSubmission = {
      machineId,
      batchNumber,
      durationSeconds: elapsedSeconds,
      stages: finalStages,
      faultResponses: finalFaults,
      bmrSigned: true,
      signaturePassword: password,
    };
    setSubmitting(true);
    try {
      finished.current = true;
      await onSubmit(submission);
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    } catch (err) {
      finished.current = false;
      setSubmitting(false);
      toast({
        title: 'Submission failed',
        description: (err as Error).message || 'Please check your password and try again.',
        variant: 'destructive',
      });
    }
  }

  function handleExit() {
    persist();
    onExit();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="h-10 w-10 text-pharma-danger" />
          <div>
            <p className="font-semibold">Unable to start the simulation</p>
            <p className="text-sm text-muted-foreground">{error ?? 'Configuration not available.'}</p>
          </div>
          <Button variant="outline" onClick={onExit}>
            Back to Simulations
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stageKey = STAGE_ORDER[currentIndex];
  const stageFaults = config.faults[stageKey] ?? [];

  const preliminaryBmr: BMRDocument = generateBMRData({
    productName: config.productName,
    batchNumber,
    batchSize: config.batchSize,
    stages: stageResults.filter((s) => s.stage !== 'bmr'),
    faultResponses,
  });

  return (
    <div>
      <SimulationHeader
        batchNumber={batchNumber}
        productName={config.productName}
        operatorName={operatorName}
        targetTablets={config.batchSize}
        runningScore={runningScore}
        currentStageIndex={currentIndex}
        elapsedSeconds={elapsedSeconds}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        onExit={handleExit}
      />

      <StageNavigator currentStageIndex={currentIndex} completedCount={completedCount} />

      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 flex items-center justify-between rounded-lg border border-pharma-warning/40 bg-pharma-warning/5 p-3 text-sm"
          >
            <span className="font-medium text-pharma-warning">Simulation paused — the timer is stopped.</span>
            <Button size="sm" variant="warning" onClick={() => setPaused(false)}>
              Resume
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={paused ? 'pointer-events-none select-none opacity-40' : ''}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {currentIndex === 0 && (
              <Stage1Dispensing config={config} faults={stageFaults} onComplete={handleStageComplete} />
            )}
            {currentIndex === 1 && (
              <Stage2Granulation config={config} faults={stageFaults} onComplete={handleStageComplete} />
            )}
            {currentIndex === 2 && (
              <Stage3Compression config={config} faults={stageFaults} onComplete={handleStageComplete} />
            )}
            {currentIndex === 3 && (
              <Stage4Coating config={config} faults={stageFaults} onComplete={handleStageComplete} />
            )}
            {currentIndex === 4 && (
              <Stage5QC config={config} faults={stageFaults} onComplete={handleStageComplete} />
            )}
            {currentIndex === 5 && (
              <Stage6BMR
                config={config}
                batchNumber={batchNumber}
                bmr={preliminaryBmr}
                faults={config.faults.bmr ?? []}
                operatorName={operatorName}
                operatorDesignation={operatorDesignation}
                submitting={submitting}
                onSign={handleSign}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {submitting && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-8 shadow-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-pharma-blue" />
            <p className="text-sm font-medium">Signing BMR & scoring batch…</p>
            <p className="text-xs text-muted-foreground">Applying 21 CFR Part 11 electronic signature</p>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-muted-foreground">
        Stage {currentIndex + 1} of {SIMULATION_STAGES.length} · {SIMULATION_STAGES[currentIndex].title}
      </div>
    </div>
  );
}
