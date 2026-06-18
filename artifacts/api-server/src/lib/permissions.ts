export type Role = "MEMBER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

export const STAFF_ROLES: Role[] = ["MODERATOR", "ADMIN", "SUPER_ADMIN"];

/**
 * The one protected owner account. Only this email may:
 *   - assign the SUPER_ADMIN role to another user
 * And NO account (including another SUPER_ADMIN) may modify this account
 * via the admin API (role, status, isActive, email, or any field).
 */
export const PROTECTED_OWNER_EMAIL = "lordhygm@gmail.com";

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
 * - SUPER_ADMIN may assign MEMBER/MODERATOR/ADMIN.
 *   Assigning SUPER_ADMIN is additionally gated on the actor's email
 *   being PROTECTED_OWNER_EMAIL — enforced at the route layer via
 *   canAssignSuperAdmin().
 * - ADMIN may assign only MEMBER/MODERATOR.
 */
export function assignableRoles(actorRole: string): Role[] {
  if (actorRole === "SUPER_ADMIN") return ["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
  if (actorRole === "ADMIN") return ["MEMBER", "MODERATOR"];
  return [];
}

/**
 * Whether the actor (identified by email) is allowed to assign the SUPER_ADMIN
 * role. Only the protected owner account may do this.
 */
export function canAssignSuperAdmin(actorEmail: string): boolean {
  return actorEmail === PROTECTED_OWNER_EMAIL;
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
 * Note: assigning SUPER_ADMIN also requires canAssignSuperAdmin() to pass at the route layer.
 */
export function canChangeRole(
  actorRole: string,
  targetCurrentRole: string,
  newRole: string,
): boolean {
  if (!canActOnUser(actorRole, targetCurrentRole)) return false;
  return (assignableRoles(actorRole) as string[]).includes(newRole);
}
