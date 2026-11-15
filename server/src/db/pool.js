import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}

const isExternal = new URL(connectionString).hostname.endsWith(".render.com");

const pool = new pg.Pool({
    connectionString,
    ssl: isExternal ? { rejectUnauthorized: true } : false,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
    console.error("Unexpected Postgres pool error:", err.message);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
