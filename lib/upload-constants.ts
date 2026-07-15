/** Client-safe upload constants and validation (no Node/fs imports). */
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
