import crypto from "node:crypto";
import { query } from "../db/pool.js";

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

// Returns the raw token for the cookie; only its hash goes in the database.
export async function createSession(userId) {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await query(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
        [hashToken(token), userId, expiresAt],
    );
    return { token, expiresAt };
}

export async function findUserBySessionToken(token) {
    const { rows } = await query(
        `SELECT u.id, u.username, u.email, u.avatar IS NOT NULL AS "hasAvatar"
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [hashToken(token)],
    );
    return rows[0] ?? null;
}

export async function deleteSession(token) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [
        hashToken(token),
    ]);
}

export async function deleteExpiredSessions() {
    await query("DELETE FROM sessions WHERE expires_at <= now()");
}
