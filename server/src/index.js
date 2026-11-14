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

// Render puts a proxy in front of the app; trust one proxy hop so req.ip is
// the user's IP (from X-Forwarded-For) and req.secure reflects HTTPS.
app.set("trust proxy", 1);
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

app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    // err.expose is set by Express for client errors like malformed JSON.
    if (err.expose) {
        return sendError(res, err.status, "INVALID_REQUEST", err.message);
    }
    sendError(res, 500, "SERVER_ERROR", "Internal server error");
});

const port = process.env.PORT || 3000;

await initDatabaseIfEmpty();

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
