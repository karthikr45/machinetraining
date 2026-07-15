'use client';

import * as React from 'react';
import { FileText, Loader2, Trash2, Upload, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/client';
import { MAX_UPLOAD_BYTES } from '@/lib/upload-constants';
import type { DocumentDTO, SopOption } from './types';

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SopResponse {
  sops?: SopOption[];
  sopDocuments?: SopOption[];
}

export function WizardStep2Documents({
  machineId,
  documents,
  onDocumentsChange,
  availableSops,
  onAvailableSopsChange,
  linkedSopIds,
  onLinkedSopIdsChange,
}: {
  machineId: string;
  documents: DocumentDTO[];
  onDocumentsChange: (docs: DocumentDTO[]) => void;
  availableSops: SopOption[];
  onAvailableSopsChange: (sops: SopOption[]) => void;
  linkedSopIds: string[];
  onLinkedSopIdsChange: (ids: string[]) => void;
}) {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [loadedSops, setLoadedSops] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<SopResponse | SopOption[]>('/api/sop');
        const list = Array.isArray(res) ? res : res.sops ?? res.sopDocuments ?? [];
        if (active) onAvailableSopsChange(list);
      } catch {
        if (active) onAvailableSopsChange([]);
      } finally {
        if (active) setLoadedSops(true);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: DocumentDTO[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast({
            variant: 'destructive',
            title: 'File too large',
            description: `${file.name} exceeds the 25 MB limit.`,
          });
          continue;
        }
        const form = new FormData();
        form.append('machineId', machineId);
        form.append('file', file);
        const res = await fetch('/api/documents/upload', { method: 'POST', body: form });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) {
          throw new Error(data?.error || `Upload failed (${res.status})`);
        }
        added.push(data.document as DocumentDTO);
      }
      if (added.length > 0) {
        onDocumentsChange([...added, ...documents]);
        toast({ title: 'Uploaded', description: `${added.length} document(s) added.` });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeDoc = (id: string) => {
    onDocumentsChange(documents.filter((d) => d.id !== id));
  };

  const toggleSop = (id: string, checked: boolean) => {
    onLinkedSopIdsChange(checked ? [...linkedSopIds, id] : linkedSopIds.filter((x) => x !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Documents & manuals</h2>
        <p className="text-sm text-muted-foreground">
          Upload equipment manuals or SOPs (PDF or text). AI training is generated from these.
        </p>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,text/plain,.pdf,.txt"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 px-6 py-10 text-center transition-colors hover:bg-muted/60 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-pharma-blue" />
          ) : (
            <Upload className="h-8 w-8 text-pharma-blue" />
          )}
          <span className="mt-3 text-sm font-medium">
            {uploading ? 'Uploading…' : 'Click to upload a manual or SOP'}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">PDF or TXT, up to 25 MB each</span>
        </button>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          <Label>Uploaded documents</Label>
          <ul className="divide-y rounded-lg border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 p-3">
                <FileText className="h-5 w-5 shrink-0 text-pharma-blue" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(doc.fileSize)}</p>
                </div>
                {doc.processed && <Badge variant="success">Processed</Badge>}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDoc(doc.id)}
                  aria-label={`Remove ${doc.fileName}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Link existing SOPs
        </Label>
        {!loadedSops ? (
          <p className="text-sm text-muted-foreground">Loading SOPs…</p>
        ) : availableSops.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No existing SOP documents are available to link yet.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {availableSops.map((sop) => (
              <li key={sop.id} className="flex items-center gap-3 p-3">
                <Checkbox
                  id={`sop-${sop.id}`}
                  checked={linkedSopIds.includes(sop.id)}
                  onCheckedChange={(c) => toggleSop(sop.id, c === true)}
                />
                <label htmlFor={`sop-${sop.id}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="block truncate text-sm font-medium">{sop.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {sop.sopNumber} · v{sop.version}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
