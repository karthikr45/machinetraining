# PharmaTrainX — AI-Powered Pharma Machine Training Platform

PharmaTrainX is a full-stack, GMP-compliant training and competency platform for pharmaceutical
manufacturing. It combines AI-generated machine training, a realistic 6-stage tablet batch
production simulation, on-the-job training (OJT) sign-off, CAPA management, requalification
tracking, a mock FDA/CDSCO inspection mode, and a full ALCOA+ audit trail with 21 CFR Part 11
electronic signatures and Indian **Schedule M** regulatory support.

## What this platform does

- **AI machine training** — upload a machine manual/SOP (PDF), auto-extract text and generate
  training modules + quizzes with the Anthropic Claude API; deliver them in English and Hindi.
- **Batch production simulation** — a 6-stage (Dispensing → Granulation → Compression → Coating →
  QC → BMR) interactive simulation with fault injection, in-process checks, deviation
  documentation, scoring, certificates, and auto-CAPA on failure.
- **GMP compliance & data integrity** — every material change is written to an immutable ALCOA+
  audit trail; records are locked with password-verified 21 CFR Part 11 electronic signatures.
- **CAPA, OJT, requalification & mock inspection** — auto-generated CAPAs, dual-signed OJT
  checklists, expiry tracking with email alerts, and an 8-question mock inspection with a
  readiness score.
- **Reporting** — dashboards, training matrix, Schedule M compliance report, and CSV/PDF exports.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS + shadcn/ui · PostgreSQL + Prisma ·
Anthropic Claude API (`claude-sonnet-4-6`) · NextAuth (JWT + role-based) · pdf-parse · Three.js ·
Recharts · Framer Motion · Nodemailer · node-cron · next-intl (English + Hindi).

## Prerequisites

- **Node.js 18+** (tested on Node 22)
- **PostgreSQL 14+**
- **Anthropic API key** (optional — the app degrades gracefully to built-in content if absent)
- **Gmail account / SMTP** (optional — for email alerts; logged to the DB if not configured)

## Installation

```bash
git clone <your-repo-url>
cd machinetraining
npm install            # (uses .npmrc legacy-peer-deps for next-auth/nodemailer peer range)
```

## Environment setup

Copy `.env.example` to `.env.local` (and `.env` for Prisma CLI) and fill in:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://postgres:password@localhost:5432/pharma_training` |
| `ANTHROPIC_API_KEY` | Claude API key (leave blank to use built-in fallback content) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Base URL, e.g. `http://localhost:3000` |
| `UPLOAD_DIR` | Local upload directory, default `./public/uploads` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP for email alerts (optional) |
| `ALERT_FROM_EMAIL` | From address for notifications |
| `CRON_SECRET` | Shared secret for the daily expiry-check cron endpoint |

## Database setup

```bash
npx prisma generate
npx prisma migrate dev --name init      # or: npx prisma db push
npx prisma db seed                      # loads demo companies, users, machines, records
```

## Start development

```bash
npm run dev
# open http://localhost:3000
```

## Demo credentials

All demo accounts use the password **`demo123`**.

| Role | Email |
| --- | --- |
| Admin | `admin@demo.com` |
| Training Manager | `training.manager@demo.com` |
| Operator (Rajesh Kumar) | `operator1@demo.com` |
| Operator (Priya Sharma) | `operator2@demo.com` |
| Operator (Amit Patel) | `operator3@demo.com` |
| Technician | `technician@demo.com` |
| QA Officer | `qa@demo.com` |
| Trainer (Dr. Anjali Singh) | `trainer@demo.com` |

## Platform features overview

- **Machine Training** — 5-step onboarding wizard, AI content generation, module player with quizzes.
- **Batch Simulation** — full 6-stage tablet manufacturing simulation with BMR sign-off.
- **OJT Sign-off** — 15-point checklist with dual (trainer + trainee) electronic signature and record locking.
- **CAPA Management** — Kanban workflow, auto-generation triggers, effectiveness checks.
- **Mock FDA Inspection** — inspector Q&A pulling real records with a readiness score and PDF report.
- **Requalification Tracking** — expiry matrix, alerts, bulk retraining assignment.
- **ALCOA+ Audit Trail** — immutable, filterable, exportable in 21 CFR Part 11 format.
- **Schedule M Compliance** — live gap analysis against Indian GMP requirements.
- **Hindi Language Support** — toggle English/हिंदी across operator-facing screens.

## Adding your first machine

1. Sign in as **Training Manager** or **Admin**.
2. Go to **Machines → Add Machine** and complete Step 1 (basic info + requalification frequency).
3. Step 2 — upload the machine's SOP/manual PDF (and optionally link existing SOPs).
4. Step 3 — run **AI Processing** to extract text and generate training modules and quizzes.
5. Step 4 — review the generated content.
6. Step 5 — choose the regulatory framework and **Publish**.

## Running a batch simulation

1. Sign in as an **Operator**.
2. Go to **Batch Simulation** and pick the *Cadmach CMB-45 Tablet Press*.
3. Work through each stage — dispense materials, set parameters, respond to injected faults, and
   perform in-process checks. Document every deviation.
4. In **Stage 6 (BMR)**, verify each section, then sign the Batch Manufacturing Record with your
   password (21 CFR Part 11 electronic signature).
5. Score **≥ 75** → certificate issued and training record updated. Score **< 75** → a CAPA is
   auto-created and your supervisor is notified.

## Scheduled tasks

The daily expiry/requalification/CAPA check can run in three ways:

- **Vercel Cron** — `vercel.json` calls `POST /api/schedule/expiry-check` daily at 02:00 (send
  the `x-cron-secret` header matching `CRON_SECRET`).
- **node-cron worker** — `npx tsx scripts/scheduler.ts` (keep running as a service).
- **Manual/CI** — `npm run expiry:check`.

## Regulatory compliance notes

- **21 CFR Part 11** — electronic records are attributable, use password-verified electronic
  signatures, carry server-side timestamps, and are protected by an immutable audit trail.
- **ALCOA+** — Attributable, Legible, Contemporaneous, Original, Accurate, plus Complete,
  Consistent, Enduring, Available. Signed/locked records cannot be edited.
- **Schedule M (India)** — the platform maps training, requalification, trainer qualification,
  SOP version control and documentation to Schedule M chapters and reports gaps for CDSCO audits.

> This software supports GMP training and record-keeping. Validate it within your own quality
> system before production use; it does not replace your site QMS or regulatory obligations.

## Project structure

```
app/            App Router pages + API routes
components/      UI primitives (ui/), layout, and feature components
lib/            Domain engines: simulation, CAPA, ALCOA+, expiry, inspection, Schedule M, Claude
prisma/         schema.prisma + seed.ts
messages/       en.json / hi.json (next-intl)
scripts/        expiry-check + node-cron scheduler
docs/           build contract
```

## Support & contact

Open an issue in this repository for questions or bug reports.
