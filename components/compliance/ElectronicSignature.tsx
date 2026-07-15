'use client';

import { useState } from 'react';
import { PenLine, ShieldCheck, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SignatureResult {
  signature: {
    id: string;
    recordType: string;
    recordId: string;
    meaning: string;
    signedAt: string;
    isValid: boolean;
  };
  hash: string;
}

interface ElectronicSignatureProps {
  recordType: string;
  recordId: string;
  /** Default statement of intent, e.g. "Reviewed and approved". */
  defaultMeaning?: string;
  /** Whether the meaning field can be edited by the signer. */
  meaningEditable?: boolean;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'success';
  disabled?: boolean;
  onSigned?: (result: SignatureResult) => void;
}

/**
 * Reusable 21 CFR Part 11 electronic-signature dialog. Re-authenticates the
 * signer with their password, records intent (meaning), and POSTs to
 * /api/signatures.
 */
export function ElectronicSignature({
  recordType,
  recordId,
  defaultMeaning = 'Reviewed and approved',
  meaningEditable = true,
  triggerLabel = 'Sign',
  triggerVariant = 'default',
  disabled = false,
  onSigned,
}: ElectronicSignatureProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [meaning, setMeaning] = useState(defaultMeaning);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSign() {
    if (!password.trim()) {
      toast({ variant: 'destructive', title: 'Password required', description: 'Enter your password to sign.' });
      return;
    }
    if (!meaning.trim()) {
      toast({ variant: 'destructive', title: 'Meaning required', description: 'State the meaning of this signature.' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiFetch<SignatureResult>('/api/signatures', {
        method: 'POST',
        body: JSON.stringify({ recordType, recordId, meaning: meaning.trim(), password }),
      });
      toast({ title: 'Signature applied', description: 'Electronic signature recorded (21 CFR Part 11).' });
      setPassword('');
      setOpen(false);
      onSigned?.(result);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Signature rejected',
        description: err instanceof Error ? err.message : 'Unable to sign record.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPassword('');
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant} disabled={disabled} className="gap-2">
          <PenLine className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-pharma-blue" />
            Electronic Signature
          </DialogTitle>
          <DialogDescription>
            Re-enter your password to apply a legally binding electronic signature. Your identity,
            the meaning, and a server timestamp are recorded immutably.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="es-meaning">Meaning of signature</Label>
            <Input
              id="es-meaning"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              disabled={!meaningEditable || submitting}
              placeholder="e.g. Reviewed and approved"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="es-password">Password</Label>
            <Input
              id="es-password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSign();
              }}
              placeholder="Enter your account password"
            />
          </div>
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Signing this record is the legal equivalent of a handwritten signature and cannot be
            repudiated.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Apply Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
