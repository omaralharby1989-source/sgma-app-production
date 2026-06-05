const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB decoded

// Validates an optional image source that may be EITHER an http(s) URL OR a
// base64 data URI. Returns an Arabic error string when invalid, or null when
// acceptable (including empty/null which clears the image).
//
// - base64: must be `data:<mime>;base64,<payload>` with mime jpeg/png/webp and
//   decoded size <= 2MB.
// - url: must parse as a URL with http: or https: protocol only.
// - rejects dangerous/non-persistable sources: javascript:, file:, blob:,
//   data:text/html, and any other protocol.
export function validateImageSource(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const v = value.trim();
  if (v === "") return null;

  if (/^data:/i.test(v)) {
    const match = /^data:([^;,]+);base64,(.+)$/i.exec(v);
    if (!match) return "صيغة الصورة غير صالحة";
    const mime = match[1].toLowerCase();
    if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(mime)) {
      return "نوع الصورة غير مدعوم، يُسمح بصيغ JPG أو PNG أو WEBP فقط";
    }
    const b64 = match[2];
    const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    const bytes = Math.floor((b64.length * 3) / 4) - padding;
    if (bytes > MAX_IMAGE_BYTES) return "حجم الصورة يجب ألا يتجاوز 2 ميجابايت";
    return null;
  }

  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return "الرجاء إدخال رابط صورة صحيح أو اختيار صورة من الجهاز";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "الرجاء إدخال رابط صورة صحيح يبدأ بـ http أو https";
  }
  return null;
}
