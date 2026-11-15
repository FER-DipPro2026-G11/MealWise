import fs from "node:fs/promises";
import pool from "./pool.js";

const SCHEMA_FILE = new URL("./schema.sql", import.meta.url);
const SEED_FILE = new URL("./seed.sql", import.meta.url);

// Arbitrary constant; makes sure only one process sets up the database at a time.
const SETUP_LOCK_ID = 7_315_002;

// True if the SQL contains nothing but whitespace and `--` comments.
function isEmptySql(sql) {
    return sql.replace(/--.*$/gm, "").trim() === "";
}

async function runSqlFile(client, file) {
    const sql = await fs.readFile(file, "utf8");
    if (!isEmptySql(sql)) await client.query(sql);
}

async function applySchemaAndSeed(client) {
    await runSqlFile(client, SCHEMA_FILE);
    await runSqlFile(client, SEED_FILE);
}

// Runs fn inside one transaction: if any statement fails, nothing changes.
async function inTransaction(fn) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock($1)", [SETUP_LOCK_ID]);
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function hasTables(client) {
    const { rows } = await client.query(`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
        ) AS has_tables
    `);
    return rows[0].has_tables;
}

// Called on server start: sets up a brand-new database, leaves an existing
// one alone. Schema changes need `npm run db:reset`.
export async function initDatabaseIfEmpty() {
    const initialized = await inTransaction(async (client) => {
        if (await hasTables(client)) return false;
        await applySchemaAndSeed(client);
        return true;
    });
    if (initialized) {
        console.log("Empty database: created schema and inserted seed data");
    }
}

// Deletes everything in the database: tables, data, types, sequences...
async function dropEverything(client) {
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
}

// Starts over from schema.sql and seed.sql.
export async function resetDatabase() {
    await inTransaction(async (client) => {
        await dropEverything(client);
        await applySchemaAndSeed(client);
    });
}

// Replaces everything with a dump from `npm run db:dump`. Deleting and
// loading happen in one transaction: if the dump fails halfway, the old
// database is left exactly as it was.
export async function restoreDatabase(dumpSql) {
    await inTransaction(async (client) => {
        await dropEverything(client);
        await client.query(dumpSql);
    });
}
