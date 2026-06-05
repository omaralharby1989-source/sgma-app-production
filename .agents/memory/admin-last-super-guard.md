---
name: Last active super-admin guard
description: How SGMA APP2 protects against locking out all super admins, and why guards must count ACTIVE supers only.
---

# Last-active-super-admin protection

When demoting OR deactivating a SUPER_ADMIN, the guard must count `role = SUPER_ADMIN AND is_active = true` (active-only), NOT total super admins. Block when that count `<= 1` and the target is itself active.

**Why:** An earlier version counted ALL supers for the demotion path, so the only *active* super could be demoted as long as an inactive/suspended super existed elsewhere — locking everyone out. The deactivation path already counted active-only; the two paths must stay consistent.

**How to apply:** Both the role-demotion branch and the deactivate/suspend branch in `routes/admin/users.ts` PATCH use the same active-super count. Self-change guards (can't change own role / can't deactivate own account) fire first and independently; the last-active-super count guard is a second, separate layer. In practice the actor performing a non-self demotion must themselves be an active super (admins can't touch supers), so the count guard is primarily defensive — keep it anyway for consistency and future role-rule changes.
