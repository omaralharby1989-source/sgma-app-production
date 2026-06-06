export const PROFESSION_GROUPS = [
  "Arzt / طبيب",
  "Zahnmedizin / أطباء أسنان",
  "Pharmazie / صيادلة",
  "Pflege / تمريض",
  "ATA",
  "OTA",
  "Physiotherapie / علاج فيزيائي",
  "Labor / مخبر",
  "Radiologie / أشعة",
  "Medizintechnik / هندسة طبية",
  "Rettungsdienst / إسعاف",
  "Student / طالب",
  "Andere / أخرى",
] as const;

export const ROLE_ARABIC: Record<string, string> = {
  MEMBER: "عضو",
  MODERATOR: "مشرف",
  ADMIN: "مدير",
  SUPER_ADMIN: "مدير عام",
};

export const STATUS_INFO: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "نشط", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
  PENDING: { label: "قيد الانتظار", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" },
  SUSPENDED: { label: "موقوف", color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" },
};
