// Emails are stored and compared lowercase and trimmed. Used by both the
// auth routes and the rate limiter, so they always agree on the same account.
export function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}
