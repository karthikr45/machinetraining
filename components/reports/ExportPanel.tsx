'use client';

import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Eye, Loader2, Database } from 'lucide-react';
import { apiFetch } from '@/lib/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const DATASETS = [
  { value: 'training', label: 'Training Records' },
  { value: 'capa', label: 'CAPA Register' },
  { value: 'audit', label: 'Audit Trail' },
  { value: 'requalification', label: 'Requalification' },
  { value: 'schedule-m', label: 'Schedule M Compliance' },
];

interface JsonExport {
  type: string;
  columns: string[];
  rows: Record<string, string>[];
}

export function ExportPanel() {
  const { toast } = useToast();
  const [dataset, setDataset] = useState('training');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState<JsonExport | null>(null);
  const [loading, setLoading] = useState(false);

  function buildQuery(fmt: 'csv' | 'json') {
    const params = new URLSearchParams({ type: dataset, format: fmt });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params.toString();
  }

  function handleExport() {
    if (format === 'csv') {
      window.open(`/api/reports/export?${buildQuery('csv')}`, '_blank');
      toast({ title: 'Export started', description: 'Your CSV download will begin shortly.' });
      return;
    }
    downloadJson();
  }

  async function downloadJson() {
    setLoading(true);
    try {
      const data = await apiFetch<JsonExport>(`/api/reports/export?${buildQuery('json')}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset}-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export ready', description: 'JSON file downloaded.' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Unable to export dataset.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    setLoading(true);
    setPreview(null);
    try {
      const data = await apiFetch<JsonExport>(`/api/reports/export?${buildQuery('json')}`);
      setPreview(data);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Preview failed',
        description: err instanceof Error ? err.message : 'Unable to load preview.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-pharma-blue" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download compliance datasets for inspection, archival, or offline analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Dataset</Label>
              <Select value={dataset} onValueChange={setDataset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATASETS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'csv' | 'json')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (spreadsheet)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-from">From</Label>
              <Input id="ex-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-to">To</Label>
              <Input id="ex-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Date range applies to Training, CAPA and Audit datasets. Requalification and Schedule M
            reflect current state.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : format === 'csv' ? (
                <FileSpreadsheet className="h-4 w-4" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              Export {format.toUpperCase()}
            </Button>
            <Button variant="outline" onClick={handlePreview} disabled={loading} className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Preview — {preview.type}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {preview.rows.length} row(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {preview.rows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No rows for the selected criteria.
              </div>
            ) : (
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.columns.map((c) => (
                        <TableHead key={c} className="whitespace-nowrap">
                          {c}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.slice(0, 100).map((row, i) => (
                      <TableRow key={i}>
                        {preview.columns.map((c) => (
                          <TableCell key={c} className="max-w-[16rem] truncate text-sm" title={row[c] ?? ''}>
                            {row[c] || '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.rows.length > 100 && (
                  <p className="px-4 py-2 text-xs text-muted-foreground">
                    Showing first 100 of {preview.rows.length} rows. Export to see all.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button asChild variant="link" className="gap-1 px-0">
        <a href="/api/reports/export?type=training&format=csv" download>
          <Download className="h-4 w-4" />
          Quick download: full training register
        </a>
      </Button>
    </div>
  );
}
