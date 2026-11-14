import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { findAvatar, setAvatar } from "../repositories/userRepository.js";
import {
    ImageError,
    MAX_UPLOAD_BYTES,
    MAX_UPLOAD_MB,
    toAvatarWebp,
} from "../utils/image.js";
import { sendError } from "../utils/apiError.js";
import { toPublicUser } from "../utils/user.js";

const router = express.Router();

// The logged-in user ("me" stands for their id).
router.get("/me", requireAuth, (req, res) => {
    res.json({ user: toPublicUser(req.user) });
});

// The request body is the image file itself (not JSON or a form), with any
// Content-Type: the real format is detected from the file's contents.
// Only read after requireAuth and the rate limit, so anonymous or spamming
// clients can't make the server buffer large uploads.
const readImageBody = express.raw({
    type: () => true,
    limit: MAX_UPLOAD_BYTES,
});

router.put(
    "/me/avatar",
    requireAuth,
    readImageBody,
    async (req, res) => {
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
            return sendError(res, 400, "INVALID_IMAGE", "No image uploaded");
        }

        let image;
        try {
            image = await toAvatarWebp(req.body);
        } catch (err) {
            if (err instanceof ImageError) {
                return sendError(res, 400, err.code, err.message, err.params);
            }
            throw err;
        }

        await setAvatar(req.user.id, image);
        const user = toPublicUser({ ...req.user, hasAvatar: true });
        // The avatar URL itself stays the same, so add a one-off ?v= for the
        // page to load the new picture instead of showing the one it has.
        user.avatarUrl += `?v=${Date.now()}`;
        res.json({ user });
    },
);

router.delete("/me/avatar", requireAuth, async (req, res) => {
    await setAvatar(req.user.id, null);
    res.json({ user: toPublicUser({ ...req.user, hasAvatar: false }) });
});

// Any logged-in user can see any user's avatar.
router.get("/:id/avatar", requireAuth, async (req, res) => {
    const userId = Number(req.params.id);
    const image = Number.isSafeInteger(userId)
        ? await findAvatar(userId)
        : null;
    if (!image) {
        return sendError(res, 404, "NOT_FOUND", "Avatar not found");
    }

    res.set({
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        // The browser keeps a copy but asks every time whether it changed:
        // Express adds an ETag (a hash of the image) and answers 304 Not
        // Modified without resending the image if it's the same.
        "Cache-Control": "private, no-cache",
    });
    res.send(image);
});

// Upload bigger than MAX_UPLOAD_BYTES (thrown by readImageBody).
router.use((err, req, res, next) => {
    if (err.type !== "entity.too.large") return next(err);
    sendError(
        res,
        413,
        "IMAGE_TOO_LARGE",
        `Image is larger than ${MAX_UPLOAD_MB} MB`,
        { maxMb: MAX_UPLOAD_MB },
    );
});

export default router;
