import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import api_router from "./routes/api.js";
import { initDatabaseIfEmpty } from "./db/setup.js";
import { sendError } from "./utils/apiError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// the number of reverse proxies in front of the app
// express reads the user's IP from X-Forwarded-For (req.ip) and HTTPS from
// X-Forwarded-Proto (req.secure) only through that many proxy hops, so a
// client can't fake them. If 0, forwarded headers are ignored.
app.set(
    "trust proxy",
    ((value) => {
        if (value === undefined || value.trim() === "") return 0;
        const hops = Number(value);
        if (!Number.isInteger(hops) || hops < 0) {
            throw new Error(
                `TRUST_PROXY_HOPS must be a whole number >= 0, got "${value}"`,
            );
        }
        return hops;
    })(process.env.TRUST_PROXY_HOPS),
);

const build_path = path.join(__dirname, "../../client/dist");

app.use(express.static(build_path));
app.use(express.json());
app.use(cookieParser());

app.use("/api", api_router);

app.use("/api", (req, res) => {
    sendError(res, 404, "NOT_FOUND", "API route not found");
});

app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(build_path, "index.html"));
});

// catch all errors, and send a JSON response instead of the default HTML error page
app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    // err.expose is set by Express for client errors like malformed JSON.
    if (err.expose) {
        return sendError(res, err.status, "INVALID_REQUEST", err.message);
    }
    sendError(res, 500, "SERVER_ERROR", "Internal server error");
});

await initDatabaseIfEmpty();

const port = ((value) => {
    if (value === undefined || value.trim() === "") return 3000;
    const port = Number(value);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new Error(
            `PORT must be a whole number between 0 and 65535, got "${value}"`,
        );
    }
    return port;
})(process.env.PORT);
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
