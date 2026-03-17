# DEPRECATED — Firebase Cloud Functions

These Firebase Cloud Functions have been fully replaced by the Cloudflare Workers API (`apps/api`).

| Old function | Replacement |
|---|---|
| `notifications.ts` → `onOrderStatusChange` | `apps/api/src/routes/orders.ts` — `PATCH /:id/status` sends emails via Resend |
| `notifications.ts` → `sendDayBeforeReminders` | `apps/api/src/index.ts` — scheduled cron `0 8 * * *` |
| `audit.ts` | `apps/api/src/routes/orders.ts` — writes to `audit_log` table on status change |
| `stock.ts` | `apps/api/src/routes/stock.ts` |

These files can be safely deleted once the Firebase project is decommissioned.
The `functions/` package is still listed in `pnpm-workspace.yaml` but nothing depends on it.
