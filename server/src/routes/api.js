import express from "express";
import { loadUser } from "../middleware/auth.js";
import auth_router from "./auth.js";
import users_router from "./users.js";

const router = express.Router();

router.use(loadUser);

router.use("/auth", auth_router);
router.use("/users", users_router);

// temporary debug route to check the IP address of the request
router.get("/debug/ip", (req, res) => {
    res.json({
        ip: req.ip,
        forwardedFor: req.headers["x-forwarded-for"] ?? null,
        forwardedProto: req.headers["x-forwarded-proto"] ?? null,
    });
});

export default router;
