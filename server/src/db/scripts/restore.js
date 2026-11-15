// Replaces the whole database with a dump made by `npm run db:dump`.
//
//   npm run db:restore                         -> the newest file in server/src/db/dumps/
//   npm run db:restore -- path/to/dump.sql     -> that file (path relative
//                                                 to the repository root)

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../pool.js";
import { restoreDatabase } from "../setup.js";
import { confirmDatabaseWipe } from "./confirm.js";

const DUMPS_DIR = fileURLToPath(new URL("../dumps/", import.meta.url));

// Dump file names start with a timestamp, so the last one sorted is the newest.
async function findNewestDump() {
    const files = await fs.readdir(DUMPS_DIR).catch(() => []);
    const dumps = files.filter((file) => file.endsWith(".sql")).sort();
    return dumps.length ? path.join(DUMPS_DIR, dumps.at(-1)) : null;
}

async function readDump(file) {
    try {
        return await fs.readFile(file, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") return null;
        throw err;
    }
}

async function main() {
    const arg = process.argv[2];
    // npm runs this script from server/, so resolve relative paths from the
    // folder npm was started in (INIT_CWD). Via the root package.json's
    // db:restore script that's always the repository root.
    const file = arg
        ? path.resolve(process.env.INIT_CWD ?? process.cwd(), arg)
        : await findNewestDump();

    if (!file) {
        console.error(
            "No dump found in server/src/db/dumps/. Create one with `npm run db:dump`, " +
                "or pass a file: npm run db:restore -- path/to/dump.sql",
        );
        return false;
    }

    const sql = await readDump(file);
    if (sql === null) {
        console.error(`File not found: ${file}`);
        return false;
    }

    console.log(`Dump file: ${file}`);
    if (!(await confirmDatabaseWipe("loads this dump into it"))) return false;

    await restoreDatabase(sql);
    console.log("Database restored.");
    return true;
}

try {
    if (!(await main())) process.exitCode = 1;
} finally {
    await pool.end();
}
