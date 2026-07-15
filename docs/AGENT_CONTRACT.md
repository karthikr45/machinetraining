# PharmaTrainX — Build Contract (read before writing any file)

This is a Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma (PostgreSQL) +
NextAuth + Anthropic app. The shared foundation already exists. **Do NOT edit any file under
`lib/`, `components/ui/`, `components/layout/`, `prisma/`, `messages/`, or any config file.**
Only CREATE the files you are assigned. If you need a new shared helper, create a NEW file.

## Path alias
`@/` maps to repo root. Import like `@/lib/prisma`, `@/components/ui/button`.

## Auth & session (server)
```ts
import { getCurrentUser } from '@/lib/auth';           // returns SessionUser | null
const user = await getCurrentUser();
// SessionUser: { id, name, email, role, companyId, department, isTrainer, preferredLanguage }
```
Roles (Prisma enum `Role`): SUPER_ADMIN, ADMIN, TRAINING_MANAGER, OPERATOR, TECHNICIAN, QA_OFFICER, TRAINER.
`import { isManager, MANAGER_ROLES } from '@/lib/auth'`.

## API route pattern (App Router route handlers)
Use `@/lib/api-helpers`:
```ts
import { requireUser, requireRole, handle, ApiError, ok, fail } from '@/lib/api-helpers';

export async function GET() {
  return handle(async () => {
    const user = await requireUser();            // throws ApiError(401) if not logged in
    // ...load data scoped to user.companyId...
    return { data };                             // handle() wraps in NextResponse.json
  });
}
```
- Every route must authenticate. Scope all queries by `companyId` where the model has one
  (Company, User, Machine, SOPDocument, CAPA) or via a relation (`user: { companyId }`).
- Enforce role server-side for mutations (use `requireRole([...])`).
- Log meaningful mutations via `import { logAction } from '@/lib/audit-logger'`.
- Read the client IP with `getClientIp(req.headers)` from `@/lib/utils`.
- Route handler files export `GET/POST/PUT/DELETE`. Dynamic params:
  `export async function GET(req: Request, { params }: { params: { id: string } })`.

## Prisma
`import { prisma } from '@/lib/prisma'`. Model accessors are camelCase; note the CAPA model
is accessed as `prisma.cAPA`, SOP as `prisma.sOPDocument`, OJT as `prisma.oJTRecord`,
electronic signature as `prisma.electronicSignature`, `prisma.trainingRecord`,
`prisma.simulationRecord`, `prisma.auditLog`, `prisma.notificationLog`.

## Client fetch
`import { apiFetch } from '@/lib/client'` — `await apiFetch<T>('/api/...', { method, body: JSON.stringify(x) })`.
Toasts: `import { useToast } from '@/components/ui/use-toast'; const { toast } = useToast();`

## Available shadcn/ui components (import from `@/components/ui/<name>`)
button, card (Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter), input, textarea,
label, badge (variants: default/secondary/destructive/outline/success/warning/purple/teal/gray),
separator, skeleton (Skeleton), progress (Progress, prop `value` 0-100, `indicatorClassName`),
checkbox (Checkbox, `onCheckedChange`), table (Table/TableHeader/TableBody/TableRow/TableHead/TableCell),
dialog (Dialog/DialogTrigger/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter/DialogClose),
tabs (Tabs/TabsList/TabsTrigger/TabsContent), select (Select/SelectTrigger/SelectValue/SelectContent/SelectItem),
dropdown-menu, avatar (Avatar/AvatarFallback), tooltip, toaster.
Icons: `lucide-react`. Charts: `recharts`. Animations: `framer-motion`.
If you need another primitive (e.g. radio-group), CREATE it in `components/ui/` following the shadcn pattern.

## Shared domain types & helpers (`@/lib/types`)
SessionUser, ModuleContent, QuizQuestion, StageKey, SIMULATION_STAGES, StageMeta, Fault,
FaultResponse, FaultResult, MaterialEntry, DeviationLogEntry, StageResult, SimulationSubmission,
BMRDocument, CAPATrigger, OJTChecklistItem, OJT_CHECKLIST_TEMPLATE, InspectionResult, ReadinessScore,
ALCOARecord, DashboardStats, ROLE_LABELS.

Lib modules you can call (do not modify them):
- `@/lib/utils`: cn, formatDate, formatDateTime, daysUntil, addMonths, addDays, round, variancePct,
  formatIndianNumber, formatPct, generateBatchNumber, generateCAPANumber, incrementVersion, getClientIp, initials, clamp
- `@/lib/audit-logger`: logAction, getAuditTrail, getRecordHistory
- `@/lib/alcoa`: createALCOARecord, verifyALCOAIntegrity, lockRecord, ALCOA_PRINCIPLES
- `@/lib/electronic-signature`: createElectronicSignature, verifySignature, verifyPassword, getSignatureManifest
- `@/lib/email-service`: sendExpiryWarning, sendCAPAAssignment, sendOJTCompletion, sendSimulationResult, sendRequalificationDue, sendInspectionReport, sendDailySummary
- `@/lib/claude`: generateTrainingContent, chatWithMachineAI, generateSimulationFeedback, generateBMRAnalysis, generateCAPARootCauseAnalysis, generateInspectionReadinessReport, translateContentToHindi, isClaudeConfigured
- `@/lib/fault-library`: faultLibrary, getRandomFaults, getFaultById, evaluateFaultResponse, totalFaultCount
- `@/lib/simulation-engine`: DISPENSING_FORMULA, COATING_FORMULA, evaluateMaterial, validateInProcessCheck, generateTabletReadings, calculateStageScore, calculateTotalScore, calculateBatchYield, collectDeviations, generateBMRData, PASS_THRESHOLD, generateBatchNumber
- `@/lib/capa-engine`: checkAndCreateCAPA, updateCAPAStatus, checkCAPAEffectiveness, getOverdueCAPAs, flagOverdueCAPAs
- `@/lib/expiry-checker`: runDailyExpiryCheck, assignRequalification, getExpiryReport, computeExpiryDate
- `@/lib/mock-inspection-engine`: inspectionQuestions, runMockInspection, calculateReadinessScore, generateInspectionReport
- `@/lib/schedule-m`: scheduleMRequirements, checkScheduleMCompliance
- `@/lib/certificate-generator`: generateCertificateHtml
- `@/lib/bmr-generator`: generateBMRHtml, generateBMRData
- `@/lib/pdf-parser`: extractTextFromPdf, extractTextFromFile, validateUpload, saveUploadedFile, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES

## Design system
Colors via Tailwind: `text-pharma-blue` (#0066CC primary), `pharma-success` #16A34A, `pharma-warning` #D97706,
`pharma-danger`/`destructive` #DC2626, `pharma-purple` #7C3AED, `pharma-teal` #0D9488.
CAPA severity: capa-minor #F59E0B, capa-major #F97316, capa-critical #DC2626.
Training status: status-notstarted, status-inprogress, status-completed, status-failed, status-expired.
Cards white on #F8FAFC bg, rounded-xl, subtle shadow. Font: Inter. Mobile-first: works at 375px,
min 44px touch targets, min 16px font on mobile. Every list page: loading skeleton, empty state with CTA,
error handling with toast.

## Page conventions
- Dashboard pages live under `app/(dashboard)/<route>/page.tsx` (the layout/shell already exists).
- Server components can call `getCurrentUser()` and `prisma` directly for initial data.
- Interactive UI is `'use client'` components that call APIs via `apiFetch`.
- Keep client/server boundaries clean (no importing `@/lib/prisma` into client components).

## Demo data (from seed) — assume these exist
Company "SunPharma India Demo" (PHARMA, ENTERPRISE, SCHEDULE_M). Users (password `demo123`):
admin@demo.com (ADMIN), training.manager@demo.com (TRAINING_MANAGER), operator1@demo.com/operator2/operator3 (OPERATOR),
technician@demo.com (TECHNICIAN), qa@demo.com (QA_OFFICER), trainer@demo.com (TRAINER).
Machines: "Cadmach CMB-45 Tablet Press" (PUBLISHED, sim config), "Glatt GPCG-300 Granulator" (PUBLISHED),
"Accela Cota 500L Coating Pan" (DRAFT).

## Quality bar
Production-ready, zero placeholders, no `TODO`, no `any` where avoidable, no dead imports.
Everything must typecheck under `strict`. Prefer server components for data, client for interactivity.
