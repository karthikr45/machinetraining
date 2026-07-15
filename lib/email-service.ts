import nodemailer from 'nodemailer';
import { prisma } from './prisma';

const FROM = process.env.ALERT_FROM_EMAIL || 'noreply@pharmatrainx.com';
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

function wrap(title: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#F8FAFC;font-family:Inter,Arial,sans-serif;color:#1E293B">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#0066CC;color:#fff;padding:16px 24px;border-radius:12px 12px 0 0;font-weight:700;font-size:18px">💊 PharmaTrainX</div>
    <div style="background:#fff;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
      ${bodyHtml}
      ${
        cta
          ? `<div style="margin-top:20px"><a href="${cta.href}" style="background:#0066CC;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">${cta.label}</a></div>`
          : ''
      }
      <p style="margin-top:24px;color:#64748B;font-size:12px">This is an automated compliance notification from PharmaTrainX. 21 CFR Part 11 / Schedule M.</p>
    </div>
  </div></body></html>`;
}

async function send(
  userId: string,
  to: string,
  type: string,
  subject: string,
  html: string
): Promise<boolean> {
  const t = getTransporter();
  let delivered = false;
  try {
    if (t) {
      await t.sendMail({ from: FROM, to, subject, html });
      delivered = true;
    } else {
      console.info(`[EMAIL:dev] to=${to} subject="${subject}" (SMTP not configured)`);
    }
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
  }
  try {
    await prisma.notificationLog.create({
      data: { userId, type, subject, message: html.slice(0, 2000), delivered },
    });
  } catch {
    /* notification log best-effort */
  }
  return delivered;
}

export async function sendExpiryWarning(
  user: { id: string; name: string; email: string },
  machine: { name: string },
  daysLeft: number
) {
  const urgency = daysLeft <= 0 ? 'EXPIRED' : daysLeft <= 7 ? 'URGENT' : 'Reminder';
  return send(
    user.id,
    user.email,
    'EXPIRY_WARNING',
    `[${urgency}] Certification for ${machine.name} ${daysLeft <= 0 ? 'has expired' : `expires in ${daysLeft} days`}`,
    wrap(
      `Certification ${daysLeft <= 0 ? 'Expired' : 'Expiring'}`,
      `<p>Dear ${user.name},</p><p>Your training certification for <b>${machine.name}</b> ${
        daysLeft <= 0 ? 'has <b>expired</b>' : `expires in <b>${daysLeft} days</b>`
      }. Please complete requalification to remain qualified to operate this equipment.</p>`,
      { label: 'Start Requalification', href: `${BASE_URL}/requalification` }
    )
  );
}

export async function sendCAPAAssignment(
  user: { id: string; name: string; email: string },
  capa: { capaNumber: string; title: string; severity: string; dueDate: Date }
) {
  return send(
    user.id,
    user.email,
    'CAPA_ASSIGNMENT',
    `New CAPA assigned: ${capa.capaNumber} (${capa.severity})`,
    wrap(
      `CAPA Assigned — ${capa.severity}`,
      `<p>Dear ${user.name},</p><p>You have been assigned CAPA <b>${capa.capaNumber}</b>: ${capa.title}.</p><p>Severity: <b>${capa.severity}</b> · Due: <b>${capa.dueDate.toLocaleDateString()}</b></p>`,
      { label: 'Open CAPA', href: `${BASE_URL}/capa` }
    )
  );
}

export async function sendOJTCompletion(
  trainee: { id: string; name: string; email: string },
  trainer: { name: string },
  result: string
) {
  return send(
    trainee.id,
    trainee.email,
    'OJT_COMPLETION',
    `OJT ${result}: signed off by ${trainer.name}`,
    wrap(
      'OJT Session Completed',
      `<p>Dear ${trainee.name},</p><p>Your on-the-job training assessed by <b>${trainer.name}</b> is complete with result <b>${result}</b>.</p>`,
      { label: 'View OJT Record', href: `${BASE_URL}/ojt` }
    )
  );
}

export async function sendSimulationResult(
  user: { id: string; name: string; email: string },
  score: number,
  passed: boolean
) {
  return send(
    user.id,
    user.email,
    'SIMULATION_RESULT',
    `Batch simulation ${passed ? 'PASSED' : 'FAILED'} — ${score}/100`,
    wrap(
      `Simulation ${passed ? 'Passed ✅' : 'Failed ❌'}`,
      `<p>Dear ${user.name},</p><p>Your batch production simulation scored <b>${score}/100</b> — <b>${
        passed ? 'PASSED' : 'FAILED'
      }</b>.${passed ? ' A certificate has been generated.' : ' A CAPA has been created for follow-up.'}</p>`,
      { label: 'View Results', href: `${BASE_URL}/simulation` }
    )
  );
}

export async function sendRequalificationDue(
  user: { id: string; name: string; email: string },
  machine: { name: string }
) {
  return send(
    user.id,
    user.email,
    'REQUALIFICATION_DUE',
    `Requalification assigned: ${machine.name}`,
    wrap(
      'Requalification Assigned',
      `<p>Dear ${user.name},</p><p>You have been assigned requalification training for <b>${machine.name}</b>. Please complete it before the due date.</p>`,
      { label: 'Start Now', href: `${BASE_URL}/training` }
    )
  );
}

export async function sendInspectionReport(
  manager: { id: string; name: string; email: string },
  report: { grade: string; overall: number }
) {
  return send(
    manager.id,
    manager.email,
    'INSPECTION_REPORT',
    `Mock inspection report — ${report.grade} (${report.overall}%)`,
    wrap(
      'Mock Inspection Report',
      `<p>Dear ${manager.name},</p><p>A mock inspection was completed. Overall readiness: <b>${report.overall}%</b> — Grade: <b>${report.grade}</b>.</p>`,
      { label: 'View Report', href: `${BASE_URL}/mock-inspection` }
    )
  );
}

export async function sendDailySummary(
  manager: { id: string; name: string; email: string },
  summary: { expired: number; expiring: number; overdueCapas: number }
) {
  return send(
    manager.id,
    manager.email,
    'DAILY_SUMMARY',
    `Daily compliance summary`,
    wrap(
      'Daily Compliance Summary',
      `<p>Dear ${manager.name},</p><ul><li>Expired certifications: <b>${summary.expired}</b></li><li>Expiring in 30 days: <b>${summary.expiring}</b></li><li>Overdue CAPAs: <b>${summary.overdueCapas}</b></li></ul>`,
      { label: 'Open Dashboard', href: `${BASE_URL}/dashboard` }
    )
  );
}
