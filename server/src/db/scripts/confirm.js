import readline from "node:readline/promises";

// Asks for the database name before anything that deletes data. Locally,
// DATABASE_URL may point at the production database on Render, so this
// makes it impossible to wipe it by accident. Returns true if confirmed.
export async function confirmDatabaseWipe(whatHappensNext) {
    const url = new URL(process.env.DATABASE_URL);
    const dbName = decodeURIComponent(url.pathname.slice(1));

    console.log(
        `This DELETES ALL DATA in database "${dbName}" on ${url.hostname} ` +
            `and ${whatHappensNext}.`,
    );
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const answer = await rl.question(`Type "${dbName}" to confirm: `);
    rl.close();

    if (answer.trim() !== dbName) {
        console.log("Cancelled, nothing was changed.");
        return false;
    }
    return true;
}
