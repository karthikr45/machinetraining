'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Award, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export interface SimulationCertificateProps {
  recipientName: string;
  employeeId?: string | null;
  machineName: string;
  batchNumber: string;
  score: number;
  issuedAt: string | Date;
  expiresAt?: string | Date | null;
  certificateId: string;
  companyName: string;
  framework: string;
  /** Optional external URL (server-rendered A4 certificate) for a full print. */
  printUrl?: string;
}

/** A self-contained, printable certificate card (usable standalone). */
export function SimulationCertificate(props: SimulationCertificateProps) {
  function print() {
    if (props.printUrl) {
      window.open(props.printUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.print();
    }
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-2xl overflow-hidden rounded-2xl border-[6px] border-pharma-blue bg-gradient-to-br from-slate-50 to-blue-50 print:border-4"
      >
        <div className="m-3 rounded-xl border-2 border-pharma-warning p-6 text-center sm:p-8">
          <div className="text-sm font-extrabold uppercase tracking-widest text-pharma-blue">
            💊 PharmaTrainX — {props.companyName}
          </div>
          <div className="mt-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pharma-warning/20 text-pharma-warning">
              <Award className="h-7 w-7" />
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Certificate of Competency</h1>
          <p className="mt-1 text-sm text-muted-foreground">This is to certify that</p>
          <p className="mt-2 text-2xl font-bold text-pharma-blue sm:text-3xl">{props.recipientName}</p>
          {props.employeeId && (
            <p className="text-xs text-muted-foreground">Employee ID: {props.employeeId}</p>
          )}
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-700">
            has successfully completed the <b>Batch Production Simulation</b> for{' '}
            <b>{props.machineName}</b> (Batch {props.batchNumber}) in accordance with {props.framework} and
            GMP requirements.
          </p>
          <div className="mt-4 inline-block rounded-full bg-pharma-success px-5 py-1.5 text-sm font-bold text-white">
            Score: {Math.round(props.score)}/100 — PASSED
          </div>
          <div className="mt-6 flex flex-col justify-between gap-2 text-xs text-slate-600 sm:flex-row">
            <div className="text-left">
              <div><b>Issued:</b> {formatDate(props.issuedAt)}</div>
              <div><b>Certificate ID:</b> {props.certificateId}</div>
            </div>
            <div className="text-left sm:text-right">
              <div><b>Valid Until:</b> {props.expiresAt ? formatDate(props.expiresAt) : 'N/A'}</div>
              <div><b>Framework:</b> {props.framework}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> ALCOA+ compliant · 21 CFR Part 11 electronic record
          </div>
        </div>
      </motion.div>

      <div className="flex justify-center print:hidden">
        <Button onClick={print}>
          <Printer className="h-4 w-4" /> Print / Download PDF
        </Button>
      </div>
    </div>
  );
}
