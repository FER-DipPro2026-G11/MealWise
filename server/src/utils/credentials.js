// Rules for what users type when registering and logging in. Keep the
// numbers in sync with client/src/pages/Register.jsx.

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
// English and Croatian letters, numbers and underscores. Never "@", so the
// login field can tell usernames and emails apart. Other non-English
// letters aren't allowed, so no two usernames look the same with different
// characters (e.g. Latin "a" vs Cyrillic "а").
const USERNAME_PATTERN = /^[A-Za-z0-9_ČĆĐŠŽčćđšž]+$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

// Trimmed string, or "" if the value isn't a string. Usernames and emails
// are stored like this, as the user typed them.
// NFC: a letter like "č" can be typed as one character or as "c" plus a
// separate caron; both look the same, so always store the one-character form.
export function cleanText(value) {
    return typeof value === "string" ? value.trim().normalize("NFC") : "";
}

// Case-insensitive key for a username or email, e.g. for the rate limiter,
// so "Ana" and "ana" count as the same account.
export function normalizeLogin(value) {
    return cleanText(value).toLowerCase();
}

export function isValidUsername(username) {
    return (
        username.length >= USERNAME_MIN_LENGTH &&
        username.length <= USERNAME_MAX_LENGTH &&
        USERNAME_PATTERN.test(username)
    );
}

export function isValidEmail(email) {
    return EMAIL_PATTERN.test(email);
}

export function isValidPassword(password) {
    return (
        password.length >= PASSWORD_MIN_LENGTH &&
        password.length <= PASSWORD_MAX_LENGTH
    );
}
