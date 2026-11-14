// Dumps the whole database (schema + data) into a .sql file, without
// needing pg_dump: it reads Postgres's own catalog and writes the SQL.
//
// Covers the public schema: tables, columns, defaults, identity/serial
// sequences, enums, extensions, primary/unique/check/exclusion/foreign key
// constraints, indexes and all rows. Views, functions, triggers and domains
// are not dumped; the script warns if the database has any.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../pool.js";

const DUMPS_DIR = fileURLToPath(new URL("../dumps/", import.meta.url));
const ROWS_PER_INSERT = 100;

// Values are read as text, so every value becomes a quoted string literal;
// Postgres converts it back to the column's type on insert.
function literal(value) {
    return value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
}

const client = await pool.connect();
const query = async (text, params) => (await client.query(text, params)).rows;

async function dump() {
    const out = [];
    const warnings = [];

    const { hostname, pathname } = new URL(process.env.DATABASE_URL);
    const dbName = decodeURIComponent(pathname.slice(1));

    out.push(
        `-- Dump of database "${dbName}" on ${hostname}`,
        `-- Created ${new Date().toISOString()} by server/src/db/scripts/dump.js`,
        "-- Restore with `npm run db:restore` (replaces the whole database).",
        "-- No BEGIN/COMMIT here: the restore script runs it in one transaction.",
        "",
        "SET client_encoding = 'UTF8';",
        "SET standard_conforming_strings = on;",
        "SET search_path = public;",
        "",
    );

    // --- Things the dump doesn't cover -----------------------------------
    const unsupported = await query(`
        SELECT CASE c.relkind
                   WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized view'
                   WHEN 'p' THEN 'partitioned table' WHEN 'f' THEN 'foreign table'
                   ELSE 'composite type' END AS kind,
               c.relname AS name
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm', 'p', 'f', 'c')
        UNION ALL
        SELECT 'function', p.proname
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND NOT EXISTS (
            SELECT 1 FROM pg_depend d   -- skip functions from extensions
            WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
        UNION ALL
        SELECT 'trigger', t.tgname
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND NOT t.tgisinternal
        UNION ALL
        SELECT 'domain', t.typname
        FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typtype = 'd'
    `);
    for (const { kind, name } of unsupported) {
        warnings.push(`${kind} "${name}" is not included in the dump`);
    }

    // --- Extensions and enum types ---------------------------------------
    const extensions = await query(`
        SELECT quote_ident(extname) AS name FROM pg_extension
        WHERE extname <> 'plpgsql' ORDER BY extname
    `);
    for (const { name } of extensions) {
        out.push(`CREATE EXTENSION IF NOT EXISTS ${name};`);
    }
    if (extensions.length) out.push("");

    const enums = await query(`
        SELECT quote_ident(t.typname) AS name,
               string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS labels
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE n.nspname = 'public'
        GROUP BY t.typname ORDER BY t.typname
    `);
    for (const { name, labels } of enums) {
        out.push(`CREATE TYPE ${name} AS ENUM (${labels});`);
    }
    if (enums.length) out.push("");

    // --- Sequences ---------------------------------------------------------
    // deptype 'a' = SERIAL column (OWNED BY), 'i' = identity column (created
    // together with its column), none = standalone sequence.
    const sequences = await query(`
        SELECT quote_ident(s.sequencename) AS name, s.data_type::text AS data_type,
               s.start_value, s.min_value, s.max_value, s.increment_by,
               s.cycle, s.cache_size, s.last_value, d.deptype,
               quote_ident(t.relname) AS owner_table,
               quote_ident(a.attname) AS owner_column
        FROM pg_sequences s
        JOIN pg_namespace n ON n.nspname = s.schemaname
        JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = s.sequencename
        LEFT JOIN pg_depend d ON d.classid = 'pg_class'::regclass AND d.objid = c.oid
            AND d.refclassid = 'pg_class'::regclass AND d.deptype IN ('a', 'i')
        LEFT JOIN pg_class t ON t.oid = d.refobjid
        LEFT JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
        WHERE s.schemaname = 'public'
        ORDER BY s.sequencename
    `);
    const standaloneSequences = sequences.filter((s) => s.deptype !== "i");
    for (const s of standaloneSequences) {
        out.push(
            `CREATE SEQUENCE ${s.name} AS ${s.data_type} START WITH ${s.start_value} ` +
                `INCREMENT BY ${s.increment_by} MINVALUE ${s.min_value} ` +
                `MAXVALUE ${s.max_value} CACHE ${s.cache_size}${s.cycle ? " CYCLE" : ""};`,
        );
    }
    if (standaloneSequences.length) out.push("");

    // --- Tables ----------------------------------------------------------
    const tables = await query(`
        SELECT c.oid, quote_ident(c.relname) AS name
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname
    `);

    const dataSql = [];
    const indexSql = [];
    const foreignKeySql = [];
    const rowCounts = [];

    for (const table of tables) {
        const columns = await query(
            `SELECT quote_ident(a.attname) AS name,
                    format_type(a.atttypid, a.atttypmod) AS type,
                    a.attnotnull AS not_null, a.attidentity AS identity,
                    a.attgenerated AS generated,
                    pg_get_expr(d.adbin, d.adrelid) AS default_expr
             FROM pg_attribute a
             LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
             WHERE a.attrelid = $1 AND a.attnum > 0 AND NOT a.attisdropped
             ORDER BY a.attnum`,
            [table.oid],
        );

        const constraints = await query(
            `SELECT quote_ident(conname) AS name, contype AS type,
                    pg_get_constraintdef(oid) AS definition
             FROM pg_constraint
             WHERE conrelid = $1 AND contype IN ('p', 'u', 'c', 'x', 'f')
             ORDER BY contype, conname`,
            [table.oid],
        );

        const lines = columns.map((c) => {
            let line = `    ${c.name} ${c.type}`;
            if (c.generated) {
                const kind = c.generated === "s" ? "STORED" : "VIRTUAL";
                line += ` GENERATED ALWAYS AS (${c.default_expr}) ${kind}`;
            } else if (c.default_expr !== null) {
                line += ` DEFAULT ${c.default_expr}`;
            }
            if (c.identity === "a") line += " GENERATED ALWAYS AS IDENTITY";
            if (c.identity === "d") line += " GENERATED BY DEFAULT AS IDENTITY";
            if (c.not_null) line += " NOT NULL";
            return line;
        });
        for (const con of constraints) {
            const sql = `CONSTRAINT ${con.name} ${con.definition}`;
            // Foreign keys are added after all data is in, so table and
            // insert order doesn't matter (and circular references work).
            if (con.type === "f") {
                foreignKeySql.push(`ALTER TABLE ${table.name} ADD ${sql};`);
            } else {
                lines.push(`    ${sql}`);
            }
        }
        out.push(`CREATE TABLE ${table.name} (\n${lines.join(",\n")}\n);`, "");

        // Indexes that aren't already created by a PRIMARY KEY/UNIQUE constraint.
        const indexes = await query(
            `SELECT pg_get_indexdef(i.indexrelid) AS definition
             FROM pg_index i
             JOIN pg_class ic ON ic.oid = i.indexrelid
             WHERE i.indrelid = $1 AND NOT EXISTS (
                 SELECT 1 FROM pg_constraint c
                 WHERE c.conindid = i.indexrelid AND c.conrelid = i.indrelid)
             ORDER BY ic.relname`,
            [table.oid],
        );
        for (const { definition } of indexes) indexSql.push(`${definition};`);

        // Rows, ordered by primary key so dumps are stable between runs.
        const [{ pk }] = await query(
            `SELECT array_agg(quote_ident(a.attname) ORDER BY k.ord) AS pk
             FROM pg_constraint c
             CROSS JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
             WHERE c.conrelid = $1 AND c.contype = 'p'`,
            [table.oid],
        );
        const insertable = columns.filter((c) => !c.generated);
        const select = insertable.map((c) => `t.${c.name}::text`).join(", ");
        const orderBy = pk
            ? ` ORDER BY ${pk.map((n) => `t.${n}`).join(", ")}`
            : "";
        const { rows } = await client.query({
            text: `SELECT ${select} FROM ${table.name} AS t${orderBy}`,
            rowMode: "array",
        });
        rowCounts.push([table.name, rows.length]);

        const columnList = insertable.map((c) => c.name).join(", ");
        // GENERATED ALWAYS identity columns reject explicit values otherwise.
        const overriding = insertable.some((c) => c.identity === "a")
            ? " OVERRIDING SYSTEM VALUE"
            : "";
        for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
            const values = rows
                .slice(i, i + ROWS_PER_INSERT)
                .map((row) => `    (${row.map(literal).join(", ")})`)
                .join(",\n");
            dataSql.push(
                `INSERT INTO ${table.name} (${columnList})${overriding} VALUES\n${values};`,
            );
        }
    }

    for (const s of sequences.filter((s) => s.deptype === "a")) {
        out.push(
            `ALTER SEQUENCE ${s.name} OWNED BY ${s.owner_table}.${s.owner_column};`,
        );
    }

    out.push("", "-- Data", "", ...dataSql.flatMap((sql) => [sql, ""]));

    // Continue numbering after the highest dumped id. last_value is null
    // for a sequence that has never been used.
    const sequenceSql = sequences
        .filter((s) => s.last_value !== null)
        .map((s) =>
            s.deptype === "i"
                ? `ALTER TABLE ${s.owner_table} ALTER COLUMN ${s.owner_column} ` +
                  `RESTART WITH ${BigInt(s.last_value) + BigInt(s.increment_by)};`
                : `SELECT pg_catalog.setval(${literal(s.name)}, ${s.last_value}, true);`,
        );
    if (sequenceSql.length) out.push("-- Sequences", "", ...sequenceSql, "");
    if (indexSql.length) out.push("-- Indexes", "", ...indexSql, "");
    if (foreignKeySql.length) {
        out.push("-- Foreign keys", "", ...foreignKeySql, "");
    }

    if (warnings.length) {
        out.push("-- WARNING: not included in this dump:");
        out.push(...warnings.map((w) => `--   ${w}`), "");
    }
    return { sql: out.join("\n"), rowCounts, warnings };
}

try {
    // One consistent snapshot of the whole database, read-only.
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    // Output formats that read back exactly, and unqualified names in the
    // generated definitions (the dump sets search_path = public too).
    await client.query(
        "SET LOCAL DateStyle = ISO; SET LOCAL IntervalStyle = postgres; " +
            "SET LOCAL extra_float_digits = 3; SET LOCAL search_path = public",
    );

    const { sql, rowCounts, warnings } = await dump();
    await client.query("ROLLBACK");

    await fs.mkdir(DUMPS_DIR, { recursive: true });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const file = path.join(DUMPS_DIR, `dump-${timestamp}.sql`);
    await fs.writeFile(file, sql);

    for (const [table, count] of rowCounts) {
        console.log(`  ${table}: ${count} rows`);
    }
    for (const warning of warnings) console.warn(`  WARNING: ${warning}`);
    console.log(`Dump written to ${file}`);
} finally {
    client.release();
    await pool.end();
}
