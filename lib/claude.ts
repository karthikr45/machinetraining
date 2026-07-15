import Anthropic from '@anthropic-ai/sdk';
import type { ModuleContent, QuizQuestion } from './types';

const MODEL = 'claude-sonnet-4-6';

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    });
  }
  return client;
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Call Claude with basic retry on rate-limit / transient errors. */
async function callClaude(params: {
  system?: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const c = getClient();
  let attempt = 0;
  const maxAttempts = 4;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await c.messages.create({
        model: MODEL,
        max_tokens: params.maxTokens ?? 2048,
        temperature: params.temperature ?? 0.4,
        system: params.system,
        messages: params.messages,
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return text;
    } catch (err: unknown) {
      attempt++;
      const status = (err as { status?: number })?.status;
      const retriable = status === 429 || status === 529 || status === 500 || status === 503;
      if (!retriable || attempt >= maxAttempts) throw err;
      const backoff = Math.pow(2, attempt) * 500;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

/** Best-effort JSON extraction from a model reply. */
function extractJson<T>(text: string, fallback: T): T {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : text;
    const start = raw.indexOf('{');
    const startArr = raw.indexOf('[');
    const from =
      start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
    if (from === -1) return fallback;
    const sliced = raw.slice(from);
    return JSON.parse(sliced) as T;
  } catch {
    return fallback;
  }
}

export interface GeneratedTraining {
  content: ModuleContent;
  quiz: QuizQuestion[];
}

/** Generate training content + quiz for a machine from extracted manual text. */
export async function generateTrainingContent(
  machineInfo: { name: string; type: string; manufacturer?: string | null },
  extractedText: string,
  moduleType = 'OPERATION'
): Promise<GeneratedTraining> {
  const fallback: GeneratedTraining = {
    content: {
      summary: `Operation training for the ${machineInfo.name} (${machineInfo.type}).`,
      objectives: [
        'Understand the machine purpose and key components',
        'Follow the correct startup and shutdown sequence',
        'Perform in-process checks per SOP',
      ],
      sections: [
        {
          heading: 'Overview',
          body: `The ${machineInfo.name} is a ${machineInfo.type} used in pharmaceutical manufacturing. Operators must follow the approved SOP at all times.`,
          bullets: ['Verify line clearance', 'Confirm BMR availability', 'Check calibration status'],
        },
      ],
      keyPoints: ['Always follow the current SOP version', 'Document all deviations immediately'],
      safetyNotes: ['Ensure guards are in place before operation'],
    },
    quiz: [],
  };

  if (!isClaudeConfigured()) return fallback;

  const system = `You are a senior pharmaceutical GMP training author. Produce accurate, Schedule M / 21 CFR compliant operator training. Output STRICT JSON only.`;
  const prompt = `Create a ${moduleType} training module for this machine.
Machine: ${machineInfo.name} | Type: ${machineInfo.type} | Manufacturer: ${machineInfo.manufacturer ?? 'N/A'}

Reference manual/SOP text (may be partial):
"""
${extractedText.slice(0, 8000)}
"""

Return JSON with this exact shape:
{
  "content": {
    "summary": string,
    "objectives": string[],
    "sections": [{ "heading": string, "body": string, "bullets": string[] }],
    "keyPoints": string[],
    "safetyNotes": string[]
  },
  "quiz": [
    { "id": "q1", "question": string, "options": [4 strings], "correctIndex": number, "explanation": string }
  ]
}
Provide 5 quiz questions.`;

  const text = await callClaude({ system, messages: [{ role: 'user', content: prompt }], maxTokens: 3000 });
  const parsed = extractJson<GeneratedTraining>(text, fallback);
  if (!parsed.content || !Array.isArray(parsed.quiz)) return fallback;
  return parsed;
}

/** Chat with the machine-specific AI trainer. */
export async function chatWithMachineAI(
  context: { machineName: string; machineType: string; manualText?: string | null },
  history: { role: 'user' | 'assistant'; content: string }[],
  message: string
): Promise<string> {
  if (!isClaudeConfigured()) {
    return `AI trainer is not configured. Please set ANTHROPIC_API_KEY. (You asked: "${message}")`;
  }
  const system = `You are an expert AI training assistant for the ${context.machineName} (${context.machineType}). Answer operator questions accurately per GMP / Schedule M. Be concise and practical. If unsure, advise consulting the SOP or supervisor.${
    context.manualText ? `\n\nReference manual excerpt:\n${context.manualText.slice(0, 4000)}` : ''
  }`;
  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ];
  return callClaude({ system, messages, maxTokens: 1024, temperature: 0.5 });
}

/** Generate AI feedback after a simulation. */
export async function generateSimulationFeedback(results: {
  totalScore: number;
  passed: boolean;
  stageScores: Record<string, number>;
  deviations: number;
  faultsCorrect: number;
  faultsTotal: number;
}): Promise<string> {
  if (!isClaudeConfigured()) {
    const weakest = Object.entries(results.stageScores).sort((a, b) => a[1] - b[1])[0];
    return `You scored ${results.totalScore}/100 (${results.passed ? 'PASS' : 'FAIL'}). Strongest handling was noted across stages; your main area for improvement is ${
      weakest?.[0] ?? 'process control'
    }. Review the relevant SOP sections and re-attempt the in-process checks and fault responses.`;
  }
  const system = `You are a GMP training assessor. Give constructive, specific feedback in 3 short paragraphs: strengths, main improvement area, and recommended SOP review.`;
  const prompt = `Simulation results:
Total: ${results.totalScore}/100 (${results.passed ? 'PASS' : 'FAIL'})
Stage scores: ${JSON.stringify(results.stageScores)}
Deviations logged: ${results.deviations}
Fault responses correct: ${results.faultsCorrect}/${results.faultsTotal}
Write the feedback.`;
  return callClaude({ system, messages: [{ role: 'user', content: prompt }], maxTokens: 800 });
}

export async function generateBMRAnalysis(bmrData: Record<string, unknown>): Promise<string> {
  if (!isClaudeConfigured()) {
    return 'BMR review: all sections should be verified for completeness, deviations confirmed, and yield reconciliation justified before signing.';
  }
  const system = `You are a QA reviewer analysing a Batch Manufacturing Record for GMP compliance. Summarise completeness, deviations, and yield in a short paragraph.`;
  return callClaude({
    system,
    messages: [{ role: 'user', content: `BMR data:\n${JSON.stringify(bmrData).slice(0, 6000)}` }],
    maxTokens: 700,
  });
}

export async function generateCAPARootCauseAnalysis(capaData: {
  title: string;
  description: string;
  deviationType: string;
}): Promise<string> {
  if (!isClaudeConfigured()) {
    return `Likely root cause relates to ${capaData.deviationType.toLowerCase().replace(/_/g, ' ')}. Recommend a 5-Why analysis, competency review, and SOP reinforcement as preventive action.`;
  }
  const system = `You are a QA CAPA specialist. Provide a concise root-cause hypothesis (5-Why style) and a preventive action recommendation.`;
  return callClaude({
    system,
    messages: [
      {
        role: 'user',
        content: `CAPA: ${capaData.title}\nDescription: ${capaData.description}\nDeviation type: ${capaData.deviationType}`,
      },
    ],
    maxTokens: 600,
  });
}

export async function generateInspectionReadinessReport(data: Record<string, unknown>): Promise<string> {
  if (!isClaudeConfigured()) {
    return 'Inspection readiness summary: address any expired certifications and open CAPAs, and ensure SOP-version traceability on all training records before an audit.';
  }
  const system = `You are a mock FDA/CDSCO inspector. Summarise inspection readiness with key findings and recommendations in a short report.`;
  return callClaude({
    system,
    messages: [{ role: 'user', content: JSON.stringify(data).slice(0, 6000) }],
    maxTokens: 900,
  });
}

export async function translateContentToHindi(content: string): Promise<string> {
  if (!isClaudeConfigured()) return content;
  const system = `Translate the following pharmaceutical training text to Hindi. Keep technical terms clear and accurate. Return only the translation.`;
  return callClaude({ system, messages: [{ role: 'user', content }], maxTokens: 2000 });
}
