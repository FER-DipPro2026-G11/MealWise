import { api, ApiError } from "./client";

// Keep in sync with the server (server/src/utils/image.js).
export const MAX_AVATAR_MB = 20;
export const AVATAR_FILE_TYPES =
    "image/jpeg,image/png,image/webp,image/gif,image/avif";

// The server resizes the image to 512x512 and returns the updated user.
export async function uploadAvatar(file) {
    // Same error the server would send, without waiting for the upload.
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
        throw new ApiError({
            status: 413,
            code: "IMAGE_TOO_LARGE",
            message: `Image is larger than ${MAX_AVATAR_MB} MB`,
            params: { maxMb: MAX_AVATAR_MB },
        });
    }
    const { user } = await api("/users/me/avatar", {
        method: "PUT",
        body: file,
    });
    return user;
}

export async function deleteAvatar() {
    const { user } = await api("/users/me/avatar", { method: "DELETE" });
    return user;
}
