---
name: Drizzle push has no TTY in this environment
description: Why drizzle-kit push can hang/fail on column changes and how to work around it
---

`pnpm --filter @workspace/db run push` (drizzle-kit push) runs without an interactive TTY here.

**Why:** When a schema change is ambiguous (e.g. dropping a column and adding another on the same table, which drizzle can't tell apart from a rename), drizzle-kit prompts interactively. With no TTY the prompt can't be answered, so the push stalls or aborts.

**How to apply:** If the affected table is empty, drop it first via SQL (`DROP TABLE IF EXISTS <t> CASCADE`) using the `executeSql` callback in code_execution, then run push so it recreates the table cleanly with no prompt. For tables with data, write an explicit migration instead. Pure additive changes (new nullable column, new table) push fine without prompts.
