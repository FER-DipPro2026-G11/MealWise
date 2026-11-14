import { api, ApiError } from "./client";

// Query key for the logged-in user, shared by AuthProvider and queryClient.
export const CURRENT_USER_KEY = ["auth", "me"];

// Returns the user, or null when not logged in (401 is expected, not an error).
export async function fetchCurrentUser() {
    try {
        const { user } = await api("/auth/me");
        return user;
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
    }
}

export async function login(credentials) {
    const { user } = await api("/auth/login", {
        method: "POST",
        body: credentials,
    });
    return user;
}

export async function register(credentials) {
    const { user } = await api("/auth/register", {
        method: "POST",
        body: credentials,
    });
    return user;
}

export function logout() {
    return api("/auth/logout", { method: "POST" });
}
