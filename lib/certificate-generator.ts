import { formatDate } from './utils';

export interface CertificateData {
  recipientName: string;
  employeeId?: string | null;
  title: string;
  machineName: string;
  batchNumber?: string;
  score: number;
  issuedAt: Date;
  expiresAt?: Date | null;
  certificateId: string;
  companyName: string;
  framework: string;
}

/**
 * Generate a self-contained, printable HTML certificate.
 * (Server returns this as text/html; the client can print to PDF.)
 */
export function generateCertificateHtml(data: CertificateData): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Certificate — ${data.recipientName}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  body { margin:0; font-family: Inter, Georgia, serif; color:#1E293B; }
  .cert { width: 1122px; height: 793px; margin:0 auto; position:relative;
    background: linear-gradient(135deg,#F8FAFC 0%,#EFF6FF 100%);
    border: 16px solid #0066CC; box-sizing:border-box; padding: 56px 72px; }
  .inner { border: 2px solid #D97706; height:100%; box-sizing:border-box; padding:40px 56px; text-align:center; position:relative; }
  .brand { color:#0066CC; font-weight:800; font-size:26px; letter-spacing:1px; }
  h1 { font-size:44px; margin:24px 0 8px; color:#0f172a; }
  .sub { color:#64748B; font-size:16px; }
  .name { font-size:38px; margin:28px 0 4px; color:#0066CC; font-weight:700; }
  .desc { font-size:18px; max-width:760px; margin:8px auto 0; line-height:1.6; }
  .score { display:inline-block; margin-top:20px; background:#16A34A; color:#fff; padding:8px 22px; border-radius:999px; font-weight:700; font-size:18px; }
  .meta { display:flex; justify-content:space-between; margin-top:40px; font-size:13px; color:#334155; }
  .seal { position:absolute; right:48px; bottom:40px; width:120px; height:120px; border-radius:50%;
    background: radial-gradient(circle at 30% 30%, #F59E0B, #D97706); color:#fff; display:flex; align-items:center; justify-content:center;
    font-weight:800; font-size:12px; text-align:center; box-shadow:0 6px 20px rgba(217,119,6,.4); }
  .alcoa { position:absolute; left:56px; bottom:44px; font-size:11px; color:#64748B; text-align:left; }
</style></head>
<body><div class="cert"><div class="inner">
  <div class="brand">💊 PharmaTrainX — ${data.companyName}</div>
  <h1>Certificate of Competency</h1>
  <div class="sub">This is to certify that</div>
  <div class="name">${data.recipientName}</div>
  <div class="sub">${data.employeeId ? `Employee ID: ${data.employeeId}` : ''}</div>
  <div class="desc">has successfully completed <b>${data.title}</b> for <b>${data.machineName}</b>${
    data.batchNumber ? ` (Batch ${data.batchNumber})` : ''
  } in accordance with ${data.framework} and GMP requirements.</div>
  <div class="score">Score: ${data.score}/100 — PASSED</div>
  <div class="meta">
    <div><b>Issued:</b> ${formatDate(data.issuedAt)}<br/><b>Certificate ID:</b> ${data.certificateId}</div>
    <div style="text-align:right"><b>Valid Until:</b> ${data.expiresAt ? formatDate(data.expiresAt) : 'N/A'}<br/><b>Framework:</b> ${data.framework}</div>
  </div>
  <div class="alcoa">ALCOA+ compliant · 21 CFR Part 11 electronic record<br/>Attributable · Legible · Contemporaneous · Original · Accurate</div>
  <div class="seal">GMP<br/>CERTIFIED</div>
</div></div></body></html>`;
}
