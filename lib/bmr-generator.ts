import type { BMRDocument } from './types';
import { formatDate, formatIndianNumber, round } from './utils';

/** Re-export the core builder for convenience. */
export { generateBMRData } from './simulation-engine';

/** Render a BMR as printable HTML (for PDF export / review). */
export function generateBMRHtml(
  bmr: BMRDocument,
  meta: { operatorName: string; designation: string; signedAt?: Date | null }
): string {
  const devRows = bmr.deviations
    .map(
      (d, i) =>
        `<tr><td>${i + 1}</td><td>${d.stage}</td><td>${d.deviation}</td><td>${d.rootCause}</td><td>${d.action}</td><td>${d.impact}</td></tr>`
    )
    .join('');
  const dispRows = bmr.dispensing
    .map(
      (m) =>
        `<tr><td>${m.material}</td><td>${m.target}</td><td>${m.entered}</td><td>${round(
          m.entered - m.target,
          2
        )}</td><td>${m.status.toUpperCase()}</td></tr>`
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>BMR ${bmr.batchNumber}</title>
<style>
  body{font-family:Inter,Arial,sans-serif;color:#1E293B;margin:24px;font-size:13px}
  h1{color:#0066CC;font-size:22px;margin-bottom:4px}
  h2{background:#0066CC;color:#fff;padding:6px 10px;font-size:14px;margin-top:22px;border-radius:4px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{border:1px solid #E2E8F0;padding:6px 8px;text-align:left}
  th{background:#F1F5F9}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-top:8px}
  .sig{margin-top:24px;border:2px solid #0066CC;border-radius:8px;padding:14px}
</style></head><body>
<h1>Batch Manufacturing Record</h1>
<div class="grid">
  <div><b>Product:</b> ${bmr.productName}</div>
  <div><b>Batch No:</b> ${bmr.batchNumber}</div>
  <div><b>Batch Size:</b> ${formatIndianNumber(bmr.batchSize)} tablets</div>
  <div><b>Mfg Date:</b> ${formatDate(bmr.manufacturingDate)}</div>
  <div><b>Expiry:</b> ${formatDate(bmr.expiryDate)}</div>
  <div><b>Theoretical Yield:</b> ${formatIndianNumber(bmr.theoreticalYield)}</div>
  <div><b>Actual Yield:</b> ${formatIndianNumber(bmr.actualYield)}</div>
  <div><b>% Yield:</b> ${bmr.yieldPct}%</div>
</div>

<h2>Section 1 — Dispensing Record</h2>
<table><thead><tr><th>Material</th><th>Required (kg)</th><th>Actual (kg)</th><th>Difference</th><th>Status</th></tr></thead>
<tbody>${dispRows}</tbody></table>

<h2>Section 6 — Deviations Log</h2>
<table><thead><tr><th>#</th><th>Stage</th><th>Deviation</th><th>Root Cause</th><th>Action</th><th>Impact</th></tr></thead>
<tbody>${devRows || '<tr><td colspan="6">No deviations recorded.</td></tr>'}</tbody></table>

<h2>Section 7 — Yield Reconciliation</h2>
<div class="grid">
  <div><b>Input:</b> ${formatIndianNumber(bmr.reconciliation.input)}</div>
  <div><b>Tablets Produced:</b> ${formatIndianNumber(bmr.reconciliation.tabletsProduced)}</div>
  <div><b>Rejects:</b> ${formatIndianNumber(bmr.reconciliation.rejects)}</div>
  <div><b>Samples:</b> ${formatIndianNumber(bmr.reconciliation.samples)}</div>
  <div><b>Coating Loss:</b> ${formatIndianNumber(bmr.reconciliation.coatingLoss)}</div>
  <div><b>% Yield:</b> ${bmr.reconciliation.yieldPct}%</div>
</div>

<div class="sig">
  <b>Section 8 — Electronic Signature (21 CFR Part 11)</b>
  <p>I certify that all information in this Batch Manufacturing Record is accurate, complete, and was recorded at the time of the operation, in compliance with Schedule M / GMP requirements.</p>
  <div class="grid">
    <div><b>Name:</b> ${meta.operatorName}</div>
    <div><b>Designation:</b> ${meta.designation}</div>
    <div><b>Signed At:</b> ${meta.signedAt ? formatDate(meta.signedAt) : '—'} (server timestamp)</div>
    <div><b>Status:</b> ${meta.signedAt ? 'SIGNED & LOCKED' : 'UNSIGNED'}</div>
  </div>
</div>
</body></html>`;
}
