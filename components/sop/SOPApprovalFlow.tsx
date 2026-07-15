'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { SOPStatus } from '@prisma/client';
import { CheckCircle2, Send, Undo2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';

type Action = 'approve' | 'reject' | null;

export function SOPApprovalFlow({
  sopId,
  status,
  canApprove,
  canManage,
}: {
  sopId: string;
  status: SOPStatus;
  canApprove: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [action, setAction] = React.useState<Action>(null);
  const [comment, setComment] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const isPending = status === 'DRAFT' || status === 'UNDER_REVIEW';

  async function submitForReview() {
    setBusy(true);
    try {
      await apiFetch(`/api/sop/${sopId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'UNDER_REVIEW' }),
      });
      toast({ title: 'Submitted for review' });
      router.refresh();
    } catch (err) {
      toast({ title: 'Action failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction() {
    setBusy(true);
    try {
      if (action === 'approve') {
        const res = await apiFetch<{ affectedCount: number }>(`/api/sop/${sopId}/approve`, {
          method: 'POST',
          body: JSON.stringify({ comment: comment.trim() || undefined }),
        });
        toast({
          title: 'SOP approved',
          description:
            res.affectedCount > 0
              ? `${res.affectedCount} operator(s) trained on a previous version may need retraining.`
              : 'No operators require retraining.',
        });
      } else if (action === 'reject') {
        if (!comment.trim()) {
          toast({ title: 'A reason is required to reject', variant: 'destructive' });
          setBusy(false);
          return;
        }
        await apiFetch(`/api/sop/${sopId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'DRAFT', changeReason: comment.trim() }),
        });
        toast({ title: 'Sent back to draft' });
      }
      setAction(null);
      setComment('');
      router.refresh();
    } catch (err) {
      toast({ title: 'Action failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  if (status === 'APPROVED') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-pharma-success/30 bg-green-50 px-4 py-3 text-sm text-pharma-success">
        <ShieldCheck className="h-5 w-5" />
        This SOP version is approved and effective.
      </div>
    );
  }

  if (status === 'OBSOLETE') {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
        This version is obsolete. A newer version has superseded it.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canManage && status === 'DRAFT' ? (
        <Button variant="outline" onClick={submitForReview} disabled={busy}>
          <Send className="h-4 w-4" /> Submit for Review
        </Button>
      ) : null}

      {canApprove && isPending ? (
        <>
          <Button variant="success" onClick={() => setAction('approve')} disabled={busy}>
            <CheckCircle2 className="h-4 w-4" /> Approve
          </Button>
          <Button variant="outline" onClick={() => setAction('reject')} disabled={busy}>
            <Undo2 className="h-4 w-4" /> Reject
          </Button>
        </>
      ) : null}

      {!canApprove && !canManage ? (
        <p className="text-sm text-muted-foreground">Awaiting approval by a manager.</p>
      ) : null}

      <Dialog open={action !== null} onOpenChange={(o) => (!o ? setAction(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'approve' ? 'Approve SOP' : 'Reject SOP'}</DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? 'Approving marks this version effective and obsoletes prior versions. Operators trained on the previous version will be flagged for retraining.'
                : 'Provide a reason. The SOP will be sent back to draft for revision.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approval-comment">
              {action === 'approve' ? 'Approval note (optional)' : 'Rejection reason'}
            </Label>
            <Textarea
              id="approval-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={action === 'approve' ? 'e.g. Reviewed against Schedule M requirements' : 'Explain what needs to change'}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={action === 'approve' ? 'success' : 'default'}
              onClick={confirmAction}
              disabled={busy}
            >
              {busy ? 'Working…' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
