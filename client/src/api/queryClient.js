import { QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";
import { CURRENT_USER_KEY } from "./auth";

const MAX_RETRIES = 3;

function isClientError(error) {
    return (
        error instanceof ApiError && error.status >= 400 && error.status < 500
    );
}

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        // Any query answered with 401 means the session expired: log out locally.
        onError: (error) => {
            if (error instanceof ApiError && error.status === 401) {
                queryClient.setQueryData(CURRENT_USER_KEY, null);
            }
        },
    }),
    defaultOptions: {
        queries: {
            // Retry network errors and 5xx (with exponential backoff), but not
            // 4xx: a bad request or missing permission won't fix itself.
            retry: (failureCount, error) =>
                !isClientError(error) && failureCount < MAX_RETRIES,
            staleTime: 30_000, // reuse fetched data for 30s before refetching
        },
        mutations: {
            // Never auto-retry writes: a retried POST could run twice.
            retry: false,
        },
    },
});
