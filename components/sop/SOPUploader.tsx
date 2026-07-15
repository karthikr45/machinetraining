'use client';

import * as React from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const ALLOWED_TYPES = ['application/pdf', 'text/plain'];
const MAX_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SOPUploader({
  file,
  onFileSelected,
  disabled,
}: {
  file: File | null;
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  function validate(f: File): string | null {
    if (!ALLOWED_TYPES.includes(f.type)) return 'Only PDF and plain-text files are allowed.';
    if (f.size > MAX_BYTES) return 'File exceeds the 25 MB limit.';
    return null;
  }

  function accept(f: File | undefined | null) {
    if (!f) return;
    const err = validate(f);
    if (err) {
      setError(err);
      onFileSelected(null);
      return;
    }
    setError(null);
    onFileSelected(f);
  }

  return (
    <div className="space-y-2">
      <Label>SOP Document (PDF or text)</Label>
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-input bg-white px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-pharma-blue" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={() => {
              onFileSelected(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            accept(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragOver ? 'border-pharma-blue bg-blue-50' : 'border-input bg-slate-50 hover:bg-slate-100',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <UploadCloud className="h-8 w-8 text-pharma-blue" />
          <span className="text-sm font-medium">Click to upload or drag &amp; drop</span>
          <span className="text-xs text-muted-foreground">PDF or TXT, up to 25 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
