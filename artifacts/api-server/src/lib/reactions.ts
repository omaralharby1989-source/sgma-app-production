import { db, newsReactionsTable, articleReactionsTable } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";

export const REACTION_TYPES = ["LIKE", "LOVE", "SUPPORT", "THANKS", "INSIGHTFUL"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export function isReactionType(value: unknown): value is ReactionType {
  return typeof value === "string" && (REACTION_TYPES as readonly string[]).includes(value);
}

export interface ReactionCounts {
  LIKE: number;
  LOVE: number;
  SUPPORT: number;
  THANKS: number;
  INSIGHTFUL: number;
}

export interface ReactionSummary {
  total: number;
  counts: ReactionCounts;
}

export interface ReactionData {
  summary: ReactionSummary;
  myReaction: ReactionType | null;
}

function emptyCounts(): ReactionCounts {
  return { LIKE: 0, LOVE: 0, SUPPORT: 0, THANKS: 0, INSIGHTFUL: 0 };
}

function emptyData(): ReactionData {
  return { summary: { total: 0, counts: emptyCounts() }, myReaction: null };
}

// --- News reactions ---------------------------------------------------------

export async function getNewsReactionData(
  newsIds: number[],
  userId: number,
): Promise<Map<number, ReactionData>> {
  const map = new Map<number, ReactionData>();
  for (const id of newsIds) map.set(id, emptyData());
  if (newsIds.length === 0) return map;

  const grouped = await db
    .select({
      targetId: newsReactionsTable.newsId,
      reactionType: newsReactionsTable.reactionType,
      count: sql<number>`count(*)::int`,
    })
    .from(newsReactionsTable)
    .where(inArray(newsReactionsTable.newsId, newsIds))
    .groupBy(newsReactionsTable.newsId, newsReactionsTable.reactionType);

  for (const g of grouped) {
    const entry = map.get(g.targetId);
    if (entry && isReactionType(g.reactionType)) {
      entry.summary.counts[g.reactionType] = g.count;
      entry.summary.total += g.count;
    }
  }

  const mine = await db
    .select({ targetId: newsReactionsTable.newsId, reactionType: newsReactionsTable.reactionType })
    .from(newsReactionsTable)
    .where(and(inArray(newsReactionsTable.newsId, newsIds), eq(newsReactionsTable.userId, userId)));

  for (const m of mine) {
    const entry = map.get(m.targetId);
    if (entry && isReactionType(m.reactionType)) entry.myReaction = m.reactionType;
  }

  return map;
}

export async function setNewsReaction(
  newsId: number,
  userId: number,
  target: ReactionType | null,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(newsReactionsTable)
    .where(and(eq(newsReactionsTable.newsId, newsId), eq(newsReactionsTable.userId, userId)))
    .limit(1);

  // Removing, or toggling off the same reaction.
  if (target === null || (existing && existing.reactionType === target)) {
    if (existing) {
      await db.delete(newsReactionsTable).where(eq(newsReactionsTable.id, existing.id));
    }
    return;
  }

  await db
    .insert(newsReactionsTable)
    .values({ newsId, userId, reactionType: target })
    .onConflictDoUpdate({
      target: [newsReactionsTable.newsId, newsReactionsTable.userId],
      set: { reactionType: target, updatedAt: new Date() },
    });
}

// --- Article reactions ------------------------------------------------------

export async function getArticleReactionData(
  articleIds: number[],
  userId: number,
): Promise<Map<number, ReactionData>> {
  const map = new Map<number, ReactionData>();
  for (const id of articleIds) map.set(id, emptyData());
  if (articleIds.length === 0) return map;

  const grouped = await db
    .select({
      targetId: articleReactionsTable.articleId,
      reactionType: articleReactionsTable.reactionType,
      count: sql<number>`count(*)::int`,
    })
    .from(articleReactionsTable)
    .where(inArray(articleReactionsTable.articleId, articleIds))
    .groupBy(articleReactionsTable.articleId, articleReactionsTable.reactionType);

  for (const g of grouped) {
    const entry = map.get(g.targetId);
    if (entry && isReactionType(g.reactionType)) {
      entry.summary.counts[g.reactionType] = g.count;
      entry.summary.total += g.count;
    }
  }

  const mine = await db
    .select({ targetId: articleReactionsTable.articleId, reactionType: articleReactionsTable.reactionType })
    .from(articleReactionsTable)
    .where(and(inArray(articleReactionsTable.articleId, articleIds), eq(articleReactionsTable.userId, userId)));

  for (const m of mine) {
    const entry = map.get(m.targetId);
    if (entry && isReactionType(m.reactionType)) entry.myReaction = m.reactionType;
  }

  return map;
}

export async function setArticleReaction(
  articleId: number,
  userId: number,
  target: ReactionType | null,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(articleReactionsTable)
    .where(and(eq(articleReactionsTable.articleId, articleId), eq(articleReactionsTable.userId, userId)))
    .limit(1);

  if (target === null || (existing && existing.reactionType === target)) {
    if (existing) {
      await db.delete(articleReactionsTable).where(eq(articleReactionsTable.id, existing.id));
    }
    return;
  }

  await db
    .insert(articleReactionsTable)
    .values({ articleId, userId, reactionType: target })
    .onConflictDoUpdate({
      target: [articleReactionsTable.articleId, articleReactionsTable.userId],
      set: { reactionType: target, updatedAt: new Date() },
    });
}
