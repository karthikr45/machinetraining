'use client';

import { Printer, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export interface CertificateProps {
  recipientName: string;
  employeeId?: string | null;
  title: string;
  machineName: string;
  score: number;
  issuedAt: Date | string;
  expiresAt?: Date | string | null;
  certificateId: string;
  companyName?: string;
  framework?: string;
}

/**
 * On-screen, printable certificate of competency. "Download" invokes the
 * browser print dialog (print-to-PDF) scoped to the certificate card.
 */
export function Certificate({
  recipientName,
  employeeId,
  title,
  machineName,
  score,
  issuedAt,
  expiresAt,
  certificateId,
  companyName = 'PharmaTrainX',
  framework = 'Schedule M',
}: CertificateProps) {
  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #training-certificate, #training-certificate * { visibility: visible; }
          #training-certificate { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <motion.div
        id="training-certificate"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-xl border-[10px] border-pharma-blue bg-gradient-to-br from-slate-50 to-blue-50 p-6 sm:p-10 text-center"
      >
        <div className="rounded-lg border-2 border-pharma-warning p-6 sm:p-10">
          <div className="text-lg font-extrabold tracking-wide text-pharma-blue">
            💊 PharmaTrainX — {companyName}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
            Certificate of Competency
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">This is to certify that</p>
          <p className="mt-1 text-2xl font-bold text-pharma-blue sm:text-3xl">{recipientName}</p>
          {employeeId ? (
            <p className="text-xs text-muted-foreground">Employee ID: {employeeId}</p>
          ) : null}
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-700">
            has successfully completed <b>{title}</b> for <b>{machineName}</b> in accordance with{' '}
            {framework} and GMP requirements.
          </p>
          <div className="mt-5 inline-block rounded-full bg-pharma-success px-5 py-2 text-sm font-bold text-white">
            Score: {score}/100 — PASSED
          </div>
          <div className="mt-8 flex flex-col justify-between gap-3 text-left text-xs text-slate-600 sm:flex-row">
            <div>
              <div>
                <b>Issued:</b> {formatDate(issuedAt)}
              </div>
              <div>
                <b>Certificate ID:</b> {certificateId}
              </div>
            </div>
            <div className="sm:text-right">
              <div>
                <b>Valid Until:</b> {expiresAt ? formatDate(expiresAt) : 'N/A'}
              </div>
              <div>
                <b>Framework:</b> {framework}
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-pharma-success" />
            ALCOA+ compliant · 21 CFR Part 11 electronic record
          </div>
        </div>
      </motion.div>

      <div className="no-print flex justify-center">
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="h-4 w-4" />
          Download / Print
        </Button>
      </div>
    </div>
  );
}
