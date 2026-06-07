export const MAX_TASK_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB decoded per file
export const MAX_TASK_ATTACHMENT_FILES = 5;

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export interface ParsedTaskAttachment {
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData: string;
}

interface AttachmentInput {
  fileName?: string | null;
  mimeType?: string | null;
  fileData?: string | null;
}

// Computes the decoded byte length from a raw base64 string.
function decodedBytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

// Validates a single task report attachment (base64 text or data URI).
// Returns an Arabic error string when invalid, or a normalized file when valid.
export function validateTaskAttachment(
  input: AttachmentInput,
): { error: string } | { file: ParsedTaskAttachment } {
  const fileName = (input.fileName ?? "").trim();
  const declaredMime = (input.mimeType ?? "").trim().toLowerCase();
  const raw = (input.fileData ?? "").trim();

  if (!fileName) return { error: "اسم الملف مفقود" };
  if (!raw) return { error: "محتوى الملف مفقود" };

  let base64 = raw;
  let mimeType = declaredMime;

  const dataUriMatch = /^data:([^;,]+);base64,(.+)$/i.exec(raw);
  if (dataUriMatch) {
    mimeType = dataUriMatch[1].toLowerCase();
    base64 = dataUriMatch[2];
  }

  if (!mimeType || !ALLOWED_MIMES.has(mimeType)) {
    return { error: "يسمح برفع ملفات PDF أو صور فقط" };
  }

  // Reject anything that is not a valid base64 payload.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { error: "صيغة الملف غير صالحة" };
  }

  const bytes = decodedBytes(base64);
  if (bytes <= 0) return { error: "محتوى الملف مفقود" };
  if (bytes > MAX_TASK_ATTACHMENT_BYTES) {
    return { error: "حجم الملف كبير جداً، الحد الأقصى 5MB" };
  }

  // Store as a normalized data URI so downloads carry the correct mime.
  const normalized = dataUriMatch ? raw : `data:${mimeType};base64,${base64}`;

  return {
    file: {
      fileName,
      mimeType,
      fileSize: bytes,
      fileData: normalized,
    },
  };
}
