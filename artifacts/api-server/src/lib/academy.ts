export const ACADEMY_SPECIALTIES = [
  "GENERAL",
  "NURSING",
  "ANESTHESIA_ICU",
  "EMERGENCY",
  "MEDICINE",
  "SURGERY",
  "INTERNAL_MEDICINE",
  "PEDIATRICS",
  "PHARMACY",
  "DENTISTRY",
  "RADIOLOGY",
  "LAB",
  "PHYSIOTHERAPY",
  "MEDICAL_ENGINEERING",
  "OTHER",
] as const;

export type AcademySpecialty = (typeof ACADEMY_SPECIALTIES)[number];

export const SPECIAL_ALL = "ALL";

export function isAcademySpecialty(value: string): value is AcademySpecialty {
  return (ACADEMY_SPECIALTIES as readonly string[]).includes(value);
}

// Infers an academy specialty from the German/Arabic professionGroup label
// chosen at registration. Falls back to GENERAL when nothing matches.
export function specialtyFromProfessionGroup(professionGroup: string | null | undefined): AcademySpecialty {
  const g = (professionGroup ?? "").toLowerCase();
  if (g.includes("pflege") || g.includes("تمريض")) return "NURSING";
  if (g.includes("pharmaz") || g.includes("صيادلة") || g.includes("صيدل")) return "PHARMACY";
  if (g.includes("zahn") || g.includes("أسنان")) return "DENTISTRY";
  if (g.includes("radio") || g.includes("أشعة")) return "RADIOLOGY";
  if (g.includes("labor") || g.includes("مخبر")) return "LAB";
  if (g.includes("physio") || g.includes("فيزيائي")) return "PHYSIOTHERAPY";
  if (g.includes("medizintechnik") || g.includes("هندسة طبية")) return "MEDICAL_ENGINEERING";
  if (g.includes("rettung") || g.includes("إسعاف")) return "EMERGENCY";
  if (g.includes("arzt") || g.includes("طبيب")) return "MEDICINE";
  if (g.includes("andere") || g.includes("أخرى")) return "OTHER";
  return "GENERAL";
}

// Parses a stored text/json column into a clean string[] of specialty codes.
export function parseSpecialties(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
    return [];
  } catch {
    return [];
  }
}

// Serializes a string[] back to a JSON text column value (null when empty).
export function serializeSpecialties(values: string[] | null | undefined): string | null {
  if (!values || values.length === 0) return null;
  const cleaned = Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
  if (cleaned.length === 0) return null;
  return JSON.stringify(cleaned);
}

// Computes the set of specialty codes a SYRIA_ACADEMY_ONLY user may view:
// GENERAL + their own specialty + admin-granted allowed specialties.
// FULL_APP callers should bypass this (they see everything).
export function viewableSpecialtiesForSyriaUser(
  academySpecialty: string | null | undefined,
  academyAllowedSpecialties: string | null | undefined,
): { all: boolean; specialties: Set<string> } {
  const allowed = parseSpecialties(academyAllowedSpecialties);
  if (allowed.includes(SPECIAL_ALL)) return { all: true, specialties: new Set() };
  const set = new Set<string>(["GENERAL"]);
  if (academySpecialty && academySpecialty.trim()) set.add(academySpecialty.trim());
  for (const s of allowed) set.add(s);
  return { all: false, specialties: set };
}

// Whether a lecture (general flag + its allowedSpecialties) is visible to a Syria user.
export function lectureVisibleToSyriaUser(
  lectureIsGeneral: boolean,
  lectureAllowedSpecialties: string | null | undefined,
  viewable: { all: boolean; specialties: Set<string> },
): boolean {
  if (viewable.all) return true;
  if (lectureIsGeneral) return true;
  const specs = parseSpecialties(lectureAllowedSpecialties);
  if (specs.includes("GENERAL")) return true;
  return specs.some((s) => viewable.specialties.has(s));
}

// Converts a Google Drive share/open link to an embeddable /preview URL.
// Returns null when no Drive file id can be extracted.
export function toDriveEmbedUrl(rawUrl: string | null | undefined): string | null {
  const url = (rawUrl ?? "").trim();
  if (!url) return null;
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const fileMatch = /\/file\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  // https://drive.google.com/open?id=FILE_ID  (or any ...?id=FILE_ID)
  const idMatch = /[?&]id=([a-zA-Z0-9_-]+)/.exec(url);
  if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  return null;
}

// True when a string looks like a Google Drive link we can embed.
export function isValidDriveUrl(rawUrl: string): boolean {
  return toDriveEmbedUrl(rawUrl) !== null;
}
