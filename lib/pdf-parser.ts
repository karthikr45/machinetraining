import fs from 'fs/promises';
import path from 'path';

/**
 * Extract text from a PDF buffer using pdf-parse.
 * pdf-parse is CommonJS and pulls in test files at its index; we import the
 * library entry directly to avoid that.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Lazy require to keep it out of the client bundle.
    const pdfParse = (await import('pdf-parse')).default as (
      b: Buffer
    ) => Promise<{ text: string; numpages: number }>;
    const result = await pdfParse(buffer);
    return result.text?.trim() ?? '';
  } catch (err) {
    console.error('[PDF PARSE ERROR]', err);
    return '';
  }
}

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);
  if (ext === '.pdf') {
    return extractTextFromPdf(buffer);
  }
  if (ext === '.txt' || ext === '.md') {
    return buffer.toString('utf-8');
  }
  return '';
}

export const ALLOWED_UPLOAD_TYPES = ['application/pdf', 'text/plain'];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateUpload(file: { type: string; size: number }): string | null {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return 'Only PDF and text files are allowed.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'File exceeds the 25 MB limit.';
  }
  return null;
}

/** Persist an uploaded file to the local uploads dir; return relative public path. */
export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string,
  subdir = 'documents'
): Promise<{ filePath: string; publicPath: string }> {
  const uploadRoot = process.env.UPLOAD_DIR || './public/uploads';
  const dir = path.join(uploadRoot, subdir);
  await fs.mkdir(dir, { recursive: true });
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const unique = `${Date.now()}-${safe}`;
  const filePath = path.join(dir, unique);
  await fs.writeFile(filePath, buffer);
  const publicPath = `/uploads/${subdir}/${unique}`;
  return { filePath, publicPath };
}
