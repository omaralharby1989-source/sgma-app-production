export type Role = "MEMBER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

export const STAFF_ROLES: Role[] = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

export function isStaff(role: string): boolean {
  return (STAFF_ROLES as string[]).includes(role);
}

export function isAdminOrSuper(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdmin(role: string): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Roles an actor is allowed to ASSIGN to other users.
 * - SUPER_ADMIN may assign any role including SUPER_ADMIN.
 *   The last-active-super-admin guard in the route layer prevents demotions
 *   that would leave zero login-eligible super admins.
 * - ADMIN may assign only MEMBER/MODERATOR.
 */
export function assignableRoles(actorRole: string): Role[] {
  if (actorRole === "SUPER_ADMIN") return ["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
  if (actorRole === "ADMIN") return ["MEMBER", "MODERATOR"];
  return [];
}

/**
 * Whether the actor may act on (edit profile / change status / change role of) the target user
 * based purely on their roles. Last-SUPER_ADMIN and self-action guards are enforced separately.
 * - SUPER_ADMIN may act on anyone.
 * - ADMIN may act only on MEMBER and MODERATOR (never on ADMIN or SUPER_ADMIN).
 * - MODERATOR/MEMBER may not manage users at all.
 */
export function canActOnUser(actorRole: string, targetRole: string): boolean {
  if (actorRole === "SUPER_ADMIN") return true;
  if (actorRole === "ADMIN") return targetRole === "MEMBER" || targetRole === "MODERATOR";
  return false;
}

/**
 * Whether the actor may change the target's role from its current value to newRole.
 * Requires both the current target role and the new role to be within the actor's authority.
 */
export function canChangeRole(
  actorRole: string,
  targetCurrentRole: string,
  newRole: string,
): boolean {
  if (!canActOnUser(actorRole, targetCurrentRole)) return false;
  return (assignableRoles(actorRole) as string[]).includes(newRole);
}
