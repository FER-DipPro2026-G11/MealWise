export class ApiError extends Error {
    constructor({ status, code, message, params }) {
        super(message);
        this.name = "ApiError";
        this.status = status; // 0 = network error (server unreachable)
        this.code = code; // translated for the UI, see components/ErrorMessage
        this.params = params;
    }
}

// Thin wrapper around fetch for our own API: sends/parses JSON and turns
// non-2xx responses into ApiError with the server's error code.
// Used inside TanStack Query hooks, which add caching and retries on top.
export async function api(path, { method = "GET", body } = {}) {
    let response;
    try {
        response = await fetch(`/api${path}`, {
            method,
            headers:
                body !== undefined
                    ? { "Content-Type": "application/json" }
                    : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            credentials: "same-origin", // send the session cookie
        });
    } catch {
        throw new ApiError({
            status: 0,
            code: "NETWORK_ERROR",
            message: "Network error",
        });
    }

    if (response.status === 204) return null;

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new ApiError({
            status: response.status,
            // Responses without a code (e.g. a proxy's HTML error page)
            code:
                data?.code ??
                (response.status >= 500 ? "SERVER_ERROR" : "UNKNOWN"),
            message: data?.message ?? `HTTP ${response.status}`,
            params: data?.params,
        });
    }
    return data;
}
