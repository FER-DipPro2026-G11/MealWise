import express from "express";
import { loadUser } from "../middleware/auth.js";
import auth_router from "./auth.js";

const router = express.Router();

router.use(loadUser);

router.get("/", (req, res) => {
    res.json({ message: "API is working" });
});

router.use("/auth", auth_router);

// TEMPORARY: open /api/debug/ip on Render and check that "ip" matches your
// real public IP (e.g. from whatismyip.com). If it doesn't, the rate limiter
// would treat all users as one IP; "forwardedFor" shows the proxy chain
// needed to fix "trust proxy" in index.js. Delete this route afterwards.
router.get("/debug/ip", (req, res) => {
    res.json({
        ip: req.ip,
        forwardedFor: req.headers["x-forwarded-for"] ?? null,
    });
});

export default router;
