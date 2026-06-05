export type StoredUser = {
  id: number;
  account: string;
  fullName: string;
  role: string;
};

const STAFF_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem("sgma_auth_user");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.id !== "number") return null;
    return parsed as StoredUser;
  } catch {
    return null;
  }
}

export function isStaffRole(role: string | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function isAdminOrSuper(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
