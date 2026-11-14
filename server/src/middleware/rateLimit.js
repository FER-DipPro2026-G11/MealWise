import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { normalizeLogin } from "../utils/credentials.js";
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
// The username or email typed into the login field.
const loginKey = (req) => normalizeLogin(req.body?.login);

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
export const loginRateLimit = [
    // Someone guessing the password of one account. Strict, but per person,
    // since the key includes the username or email.
    failedLoginLimiter({
        windowMs: 15 * MINUTE,
        limit: 5,
        keyGenerator: (req) => `${ipKey(req)}|${loginKey(req)}`,
    }),
    // Many machines guessing one account from different IPs.
    failedLoginLimiter({
        windowMs: 60 * MINUTE,
        limit: 20,
        keyGenerator: loginKey,
    }),
    // One machine trying many accounts. Loose, because many users can
    // share one public IP.
    failedLoginLimiter({
        windowMs: 15 * MINUTE,
        limit: 50,
        keyGenerator: ipKey,
    }),
];

// Resizing images is the most expensive thing the server does, so each
// user gets a limited number of avatar uploads (successful or not).
// Must come after requireAuth, since it counts per user.
export const avatarUploadRateLimit = rateLimit({
    windowMs: 60 * MINUTE,
    limit: 20,
    keyGenerator: (req) => `user:${req.user.id}`,
    message: limitMessage(
        "TOO_MANY_AVATAR_UPLOADS",
        "Too many profile picture uploads",
    ),
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

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
