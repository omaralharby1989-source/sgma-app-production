export const TASK_STATUS_OPTIONS = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_REVIEW",
  "COMPLETED",
  "POSTPONED",
  "CANCELLED",
] as const;

export const TASK_PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const STATUS_LABELS: Record<string, string> = {
  NEW: "جديدة",
  IN_PROGRESS: "قيد التنفيذ",
  WAITING_REVIEW: "بانتظار المراجعة",
  COMPLETED: "مكتملة",
  POSTPONED: "مؤجلة",
  CANCELLED: "ملغاة",
};

export const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  NEW: "secondary",
  IN_PROGRESS: "default",
  WAITING_REVIEW: "outline",
  COMPLETED: "default",
  POSTPONED: "outline",
  CANCELLED: "destructive",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
};

export const PRIORITY_CLASS: Record<string, string> = {
  LOW: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  HIGH: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  URGENT: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export const PARTICIPANT_ROLE_LABELS: Record<string, string> = {
  SUPERVISOR: "مشرف المهمة",
  ASSIGNEE: "المكلّفون",
  SUPPORTER: "المساعدون / الداعمون",
};

export const ROLE_LABELS: Record<string, string> = {
  MEMBER: "عضو",
  MODERATOR: "مشرف",
  ADMIN: "مدير",
  SUPER_ADMIN: "مدير عام",
};

export function formatTaskDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}
