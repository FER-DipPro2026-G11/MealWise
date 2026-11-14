import { query } from "../db/pool.js";

// Finds a user by username or email, ignoring case. Usernames can't contain
// "@" and emails must, so one value never matches two different users.
// Includes passwordHash: only for checking a login, never send it to the client.
export async function findUserByLogin(login) {
    const { rows } = await query(
        `SELECT id, username, email, password_hash AS "passwordHash",
                avatar IS NOT NULL AS "hasAvatar"
         FROM users
         WHERE lower(username) = lower($1) OR lower(email) = lower($1)`,
        [login],
    );
    return rows[0] ?? null;
}

// Throws a pg error with code "23505" if the username or email is taken;
// err.constraint is then the name of the unique index (see schema.sql).
export async function createUser({ username, email, passwordHash }) {
    const { rows } = await query(
        `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)
         RETURNING id, username, email, false AS "hasAvatar"`,
        [username, email, passwordHash],
    );
    return rows[0];
}

// Returns the avatar image as a Buffer, or null if the user has none.
export async function findAvatar(userId) {
    const { rows } = await query("SELECT avatar FROM users WHERE id = $1", [
        userId,
    ]);
    return rows[0]?.avatar ?? null;
}

// Sets (or with null, removes) the user's avatar.
export async function setAvatar(userId, image) {
    await query("UPDATE users SET avatar = $2 WHERE id = $1", [userId, image]);
}
