---
name: Last login-eligible super-admin guard
description: How SGMA APP2 protects against locking out all super admins, and why guards must count login-eligible (ACTIVE + is_active) supers and treat any login-blocking state as deactivation.
---

# Last-login-eligible-super-admin protection

When demoting OR deactivating a SUPER_ADMIN, the guard must count *login-eligible* supers: `role = SUPER_ADMIN AND status = 'ACTIVE' AND is_active = true`, NOT total and NOT merely `is_active = true`. Block when that count `<= 1` and the target is itself login-eligible.

**Why:** Login eligibility is gated by BOTH `is_active = true` AND `status = 'ACTIVE'` — PENDING and SUSPENDED accounts cannot authenticate even when `is_active` is true. An early version defined "deactivation" as only `is_active = false || status = SUSPENDED` and counted supers by `is_active = true` alone. That let a super set the last login-eligible super to `status = PENDING` (with `is_active` still true), passing every guard while locking everyone out. Any state that blocks login must count as deactivation, and the super count must mirror the exact login-eligibility predicate.

**How to apply:** In `routes/admin/users.ts` PATCH, `deactivating` = `isActive === false || (status !== undefined && status !== 'ACTIVE')` (covers SUSPENDED and PENDING). Both the role-demotion branch and the status/isActive branch use `countLoginEligibleSupers()` and gate on `target.status === 'ACTIVE' && target.isActive`. Self-change guards (can't change own role / can't deactivate own account, where deactivate now includes self→PENDING) fire first and independently. **Rule:** whenever login eligibility gains a new blocking condition, update BOTH the `deactivating` predicate and the super-count predicate in lockstep, or a new lockout path opens.
