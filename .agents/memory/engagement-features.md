---
name: Engagement features (views, reactions, presence)
description: Design decisions for news/article view counts, reactions, and chat online presence in SGMA APP2.
---

# Engagement features

Additive module (no rebuild, polling-based, no WebSockets). Covers view counts + reactions for news/articles and chat online-user presence.

## Reactions
- One reaction per user per target, enforced by a DB UNIQUE on (newsId|articleId, userId) plus `onConflictDoUpdate`. Toggle/remove = sending the same type again or `reactionType: null` deletes the row.
- Reaction summary is aggregated with a single batched `GROUP BY targetId, reactionType` query for lists (no N+1), plus one "my reaction" query.
- Reaction types: LIKE/LOVE/SUPPORT/THANKS/INSIGHTFUL.

## Access rules (important, differ from write rules)
- News reactions: any authenticated user.
- Article reactions: any authenticated user (incl. Syria-academy/SY users) but ONLY on APPROVED articles. SY users still CANNOT write articles — read/react ≠ write.
- Chat presence: gated by `requireFullApp`, so SY users get 403. Reactions are NOT behind requireFullApp.

**Why:** SY (SYRIA_ACADEMY_ONLY) users have a narrower app scope; engagement reads were intentionally opened to them while full-app/write features stay blocked.

## View counts
- Incremented on the detail GET. Always make the increment conditional in the SQL WHERE clause on the visibility status (news: `status='PUBLISHED'`; articles: `status='APPROVED'`) so a concurrent status change can never let a non-visible item accrue views — do NOT rely only on an in-JS `if (isApproved)` pre-check.

## Frontend
- ReactionBar updates local state from the server response (source of truth) and invalidates list+detail query keys; never trusts client-side counts.
- ChatPresencePanel heartbeats POST /chat/presence on mount + every 20s and polls GET on the same interval.
