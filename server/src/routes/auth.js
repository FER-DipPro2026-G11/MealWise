import express from "express";
import { SESSION_COOKIE, sessionCookieOptions } from "../middleware/auth.js";
import { createUser, findUserByLogin } from "../repositories/userRepository.js";
import {
    createSession,
    deleteExpiredSessions,
    deleteSession,
} from "../repositories/sessionRepository.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    USERNAME_MAX_LENGTH,
    USERNAME_MIN_LENGTH,
    cleanText,
    isValidEmail,
    isValidPassword,
    isValidUsername,
} from "../utils/credentials.js";
import { sendError } from "../utils/apiError.js";
import { toPublicUser } from "../utils/user.js";
import {
    loginAccountRateLimit,
    loginIpRateLimit,
    registerRateLimit,
} from "../middleware/rateLimit.js";

const router = express.Router();

const DUMMY_PASSWORD_HASH = await hashPassword("timing-equalizer");

function readPassword(body) {
    return typeof body?.password === "string" ? body.password : "";
}

// Looks up the account being logged into (by username or email) once,
// before the per-account rate limits, which need to know whose account it
// is. The login handler then uses req.loginUser too.
async function findLoginUser(req, res, next) {
    const login = cleanText(req.body?.login);
    req.loginUser = login ? await findUserByLogin(login) : null;
    next();
}

async function startSession(req, res, userId) {
    const { token, expiresAt } = await createSession(userId);
    res.cookie(SESSION_COOKIE, token, {
        ...sessionCookieOptions(req),
        expires: expiresAt,
    });
}

// Body: { username, email, password }
router.post("/register", registerRateLimit, async (req, res) => {
    const username = cleanText(req.body?.username);
    const email = cleanText(req.body?.email);
    const password = readPassword(req.body);

    if (!isValidUsername(username)) {
        return sendError(
            res,
            400,
            "INVALID_USERNAME",
            `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters: English or Croatian letters, numbers and underscores`,
            { min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH },
        );
    }
    if (!isValidEmail(email)) {
        return sendError(res, 400, "INVALID_EMAIL", "Invalid email address");
    }
    if (!isValidPassword(password)) {
        return sendError(
            res,
            400,
            "INVALID_PASSWORD_LENGTH",
            `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long`,
            { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH },
        );
    }

    let user;
    try {
        user = await createUser({
            username,
            email,
            passwordHash: await hashPassword(password),
        });
    } catch (err) {
        // Unique index violated: tell the user which value is taken.
        if (err.code === "23505" && err.constraint?.includes("username")) {
            return sendError(
                res,
                409,
                "USERNAME_TAKEN",
                "Username is already taken",
            );
        }
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

// Body: { login, password }, where login is the username or the email.
router.post(
    "/login",
    loginIpRateLimit,
    findLoginUser,
    loginAccountRateLimit,
    async (req, res) => {
        const user = req.loginUser;
        const password = readPassword(req.body);
        const passwordMatches = await verifyPassword(
            password,
            user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        );

        if (!user || !passwordMatches) {
            return sendError(
                res,
                401,
                "INVALID_CREDENTIALS",
                "Invalid username/email or password",
            );
        }

        await deleteExpiredSessions();

        await startSession(req, res, user.id);
        res.json({ user: toPublicUser(user) });
    },
);

router.post("/logout", async (req, res) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await deleteSession(token);
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions(req));
    res.status(204).end();
});

export default router;
