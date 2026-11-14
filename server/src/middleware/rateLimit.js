import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { normalizeLogin } from "../utils/credentials.js";
import { errorBody } from "../utils/apiError.js";

// counters are kept in memory

const MINUTE = 60 * 1000;

// Response body for a blocked request; the frontend shows the translated
// text for `code`, including how many minutes are left.
function limitMessage(code, text) {
    return (req) => {
        const msLeft = req.rateLimit.resetTime - Date.now();
        const minutes = Math.max(1, Math.ceil(msLeft / MINUTE));
        return errorBody(code, `${text}. Try again in ${minutes} min`, {
            minutes,
        });
    };
}

// IPv6 users typically control a whole address block, so ipKeyGenerator
// counts the block (/56) instead of each single address.
const ipKey = (req) => ipKeyGenerator(req.ip);

// The account being logged into. If it exists, its id, so typing the
// username or the email counts as the same account; otherwise the typed
// text. req.loginUser is set by the login route before these limits run.
const accountKey = (req) =>
    req.loginUser
        ? `user:${req.loginUser.id}`
        : `login:${normalizeLogin(req.body?.login)}`;

const LOGIN_MESSAGE = limitMessage(
    "TOO_MANY_LOGIN_ATTEMPTS",
    "Too many failed login attempts",
);

function failedLoginLimiter({ windowMs, limit, keyGenerator }) {
    return rateLimit({
        windowMs,
        limit,
        keyGenerator,
        skipSuccessfulRequests: true, // only failed logins count
        message: LOGIN_MESSAGE,
        standardHeaders: "draft-8",
        legacyHeaders: false,
    });
}

// Login is protected by three limits, so a shared IP (NAT: dorms, mobile
// networks) doesn't get everyone blocked, and nobody can lock out someone
// else's account just by knowing their username or email.

// One machine trying many accounts. Loose, because many users can share
// one public IP. Runs first and needs no database lookup, so a flood from
// one IP is stopped before it reaches the database.
export const loginIpRateLimit = failedLoginLimiter({
    windowMs: 15 * MINUTE,
    limit: 100,
    keyGenerator: ipKey,
});

// Need req.loginUser, so they run after the account lookup.
export const loginAccountRateLimit = [
    // Someone guessing the password of one account. Strict, but per person,
    // since the key includes the IP.
    failedLoginLimiter({
        windowMs: 15 * MINUTE,
        limit: 20,
        keyGenerator: (req) => `${ipKey(req)}|${accountKey(req)}`,
    }),
    // Many machines guessing one account from different IPs.
    failedLoginLimiter({
        windowMs: 15 * MINUTE,
        limit: 100,
        keyGenerator: accountKey,
    }),
];

// Stops scripts from creating accounts in bulk.
export const registerRateLimit = rateLimit({
    windowMs: 60 * MINUTE,
    limit: 50,
    keyGenerator: ipKey,
    message: limitMessage(
        "TOO_MANY_REGISTRATIONS",
        "Too many registrations from this network",
    ),
    standardHeaders: "draft-8",
    legacyHeaders: false,
});
