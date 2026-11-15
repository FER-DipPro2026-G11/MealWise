import pool from "../pool.js";
import { resetDatabase } from "../setup.js";
import { confirmDatabaseWipe } from "./confirm.js";

try {
    if (
        await confirmDatabaseWipe("recreates it from schema.sql and seed.sql")
    ) {
        await resetDatabase();
        console.log("Database reset: schema.sql and seed.sql applied.");
    } else {
        process.exitCode = 1;
    }
} finally {
    await pool.end();
}
