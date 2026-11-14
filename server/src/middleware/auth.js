import { findUserBySessionToken } from "../repositories/sessionRepository.js";
import { sendError } from "../utils/apiError.js";

export const SESSION_COOKIE = "session";

export function sessionCookieOptions(req) {
    return {
        httpOnly: true, // not readable from JavaScript, so XSS can't steal it
        secure: req.secure, // HTTPS-only on Render; plain HTTP works on localhost
        sameSite: "lax", // not sent on cross-site POSTs (CSRF protection)
        path: "/api", // only sent to API routes, not with static files
    };
}

// Loads the logged-in user (if any) into req.user, based on the session cookie.
export async function loadUser(req, res, next) {
    const token = req.cookies[SESSION_COOKIE];
    req.user = token ? await findUserBySessionToken(token) : null;

    // Expired or deleted session: remove the stale cookie from the browser.
    if (token && !req.user) {
        res.clearCookie(SESSION_COOKIE, sessionCookieOptions(req));
    }
    next();
}

// Add to any route that requires a logged-in user.
export function requireAuth(req, res, next) {
    if (!req.user) {
        return sendError(res, 401, "NOT_AUTHENTICATED", "Not logged in");
    }
    next();
}
