import express from "express";
import {
    SESSION_COOKIE,
    sessionCookieOptions,
    requireAuth,
} from "../middleware/auth.js";
import { createUser, findUserByEmail } from "../repositories/userRepository.js";
import {
    createSession,
    deleteExpiredSessions,
    deleteSession,
} from "../repositories/sessionRepository.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { normalizeEmail } from "../utils/email.js";
import { sendError } from "../utils/apiError.js";
import { loginRateLimit, registerRateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

// Checked against when the email doesn't exist, so a failed login takes the
// same time either way and doesn't reveal which emails are registered.
const DUMMY_PASSWORD_HASH = await hashPassword("timing-equalizer");

function readCredentials(body) {
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    return { email, password };
}

function toPublicUser({ id, email, createdAt }) {
    return { id, email, createdAt };
}

async function startSession(req, res, userId) {
    const { token, expiresAt } = await createSession(userId);
    res.cookie(SESSION_COOKIE, token, {
        ...sessionCookieOptions(req),
        expires: expiresAt,
    });
}

router.post("/register", registerRateLimit, async (req, res) => {
    const { email, password } = readCredentials(req.body);

    if (!EMAIL_PATTERN.test(email)) {
        return sendError(res, 400, "INVALID_EMAIL", "Invalid email address");
    }
    if (
        password.length < MIN_PASSWORD_LENGTH ||
        password.length > MAX_PASSWORD_LENGTH
    ) {
        return sendError(
            res,
            400,
            "INVALID_PASSWORD_LENGTH",
            `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters long`,
            { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH },
        );
    }

    let user;
    try {
        user = await createUser({
            email,
            passwordHash: await hashPassword(password),
        });
    } catch (err) {
        if (err.code === "23505") {
            return sendError(
                res,
                409,
                "EMAIL_TAKEN",
                "Email is already registered",
            );
        }
        throw err;
    }

    await startSession(req, res, user.id);
    res.status(201).json({ user: toPublicUser(user) });
});

router.post("/login", loginRateLimit, async (req, res) => {
    const { email, password } = readCredentials(req.body);
    const user = email ? await findUserByEmail(email) : null;
    const passwordMatches = await verifyPassword(
        password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
        return sendError(
            res,
            401,
            "INVALID_CREDENTIALS",
            "Invalid email or password",
        );
    }

    await deleteExpiredSessions();
    await startSession(req, res, user.id);
    res.json({ user: toPublicUser(user) });
});

router.post("/logout", async (req, res) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await deleteSession(token);
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions(req));
    res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => {
    res.json({ user: toPublicUser(req.user) });
});

export default router;
