import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { normalizeEmail } from "../utils/email.js";
import { errorBody } from "../utils/apiError.js";

// Counters are kept in memory: fine for a single server instance, but they
// reset when the server restarts (e.g. Render free tier waking from sleep).

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
const emailKey = (req) => normalizeEmail(req.body?.email);

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
// else's account just by knowing their email.
export const loginRateLimit = [
    // Someone guessing the password of one account. Strict, but per person,
    // since the key includes the email.
    failedLoginLimiter({
        windowMs: 15 * MINUTE,
        limit: 5,
        keyGenerator: (req) => `${ipKey(req)}|${emailKey(req)}`,
    }),
    // Many machines guessing one account from different IPs.
    failedLoginLimiter({
        windowMs: 60 * MINUTE,
        limit: 20,
        keyGenerator: emailKey,
    }),
    // One machine trying many accounts. Loose, because many users can
    // share one public IP.
    failedLoginLimiter({
        windowMs: 15 * MINUTE,
        limit: 50,
        keyGenerator: ipKey,
    }),
];

// Stops scripts from creating accounts in bulk, while still allowing a
// whole class to register from the same university network.
export const registerRateLimit = rateLimit({
    windowMs: 60 * MINUTE,
    limit: 20,
    keyGenerator: ipKey,
    message: limitMessage(
        "TOO_MANY_REGISTRATIONS",
        "Too many registrations from this network",
    ),
    standardHeaders: "draft-8",
    legacyHeaders: false,
});
