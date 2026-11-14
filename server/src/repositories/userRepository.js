import { query } from "../db/pool.js";

// Includes passwordHash: only for checking a login, never send it to the client.
export async function findUserByEmail(email) {
    const { rows } = await query(
        `SELECT id, email, password_hash AS "passwordHash", created_at AS "createdAt"
         FROM users WHERE email = $1`,
        [email],
    );
    return rows[0] ?? null;
}

// Throws a pg error with code "23505" if the email is already taken.
export async function createUser({ email, passwordHash }) {
    const { rows } = await query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2)
         RETURNING id, email, created_at AS "createdAt"`,
        [email, passwordHash],
    );
    return rows[0];
}
