export const ACADEMY_SPECIALTY_LABELS: Record<string, string> = {
  GENERAL: "عام (لجميع الاختصاصات)",
  NURSING: "التمريض",
  ANESTHESIA_ICU: "التخدير والعناية المركزة",
  EMERGENCY: "الطوارئ",
  MEDICINE: "الطب",
  SURGERY: "الجراحة",
  INTERNAL_MEDICINE: "الطب الباطني",
  PEDIATRICS: "طب الأطفال",
  PHARMACY: "الصيدلة",
  DENTISTRY: "طب الأسنان",
  RADIOLOGY: "الأشعة",
  LAB: "المختبر",
  PHYSIOTHERAPY: "العلاج الفيزيائي",
  MEDICAL_ENGINEERING: "الهندسة الطبية",
  OTHER: "اختصاصات أخرى",
};

// "ALL" is a special sentinel for admin lecture targeting (visible to all specialties).
export const SPECIAL_ALL = "ALL";

export const ACADEMY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشورة",
  HIDDEN: "مخفية",
  ARCHIVED: "مؤرشفة",
};

export const ACADEMY_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  HIDDEN: "outline",
  ARCHIVED: "destructive",
};

export function specialtyLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return ACADEMY_SPECIALTY_LABELS[value] ?? value;
}

export function statusLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return ACADEMY_STATUS_LABELS[value] ?? value;
}

// Ordered list for selects (GENERAL first).
export const ACADEMY_SPECIALTY_OPTIONS = Object.keys(ACADEMY_SPECIALTY_LABELS);

export function formatAcademyDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
