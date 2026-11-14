import { query } from "../db/pool.js";

export async function findMealById(id) {
    const { rows } = await query("SELECT * FROM meals WHERE id = $1", [id]);
    return rows[0] ?? null;
}

export async function findMealsByUser(userId) {
    const { rows } = await query(
        "SELECT * FROM meals WHERE user_id = $1 ORDER BY created_at DESC",
        [userId],
    );
    return rows;
}

export async function createMeal({ userId, name, calories }) {
    const { rows } = await query(
        "INSERT INTO meals (user_id, name, calories) VALUES ($1, $2, $3) RETURNING *",
        [userId, name, calories],
    );
    return rows[0];
}
