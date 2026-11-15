import crypto from "node:crypto";
import { promisify } from "node:util";

const argon2 = promisify(crypto.argon2);

// OWASP minimum for Argon2id: 19 MiB of memory, 2 passes, 1 lane.
const PARAMS = { memory: 19456, passes: 2, parallelism: 1 };
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

// Stored in the standard PHC string format,
// which other Argon2 libraries understand too:
// "$argon2id$v=19$m=19456,t=2,p=1$<salt base64>$<hash base64>"
export async function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = await derive(password, salt, PARAMS, HASH_LENGTH);
    const { memory, passes, parallelism } = PARAMS;
    const params = `m=${memory},t=${passes},p=${parallelism}`;
    return [
        "",
        "argon2id",
        "v=19",
        params,
        toBase64(salt),
        toBase64(hash),
    ].join("$");
}

export async function verifyPassword(password, stored) {
    const parsed = parseHash(stored);
    if (!parsed) return false;

    const actual = await derive(
        password,
        parsed.salt,
        parsed.params,
        parsed.hash.length,
    );

    // constant-time comparison, timing doesn't leak how much matched
    return crypto.timingSafeEqual(actual, parsed.hash);
}

function derive(password, salt, params, tagLength) {
    return argon2("argon2id", {
        message: password,
        nonce: salt,
        tagLength,
        ...params,
    });
}

// PHC strings use base64 without "=" padding.
function toBase64(buffer) {
    return buffer.toString("base64").replace(/=+$/, "");
}

const HASH_PATTERN =
    /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

function parseHash(stored) {
    const match = HASH_PATTERN.exec(stored);
    if (!match) return null;
    const [, memory, passes, parallelism, salt, hash] = match;
    return {
        params: {
            memory: Number(memory),
            passes: Number(passes),
            parallelism: Number(parallelism),
        },
        salt: Buffer.from(salt, "base64"),
        hash: Buffer.from(hash, "base64"),
    };
}
