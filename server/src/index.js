import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import api_router from "./routes/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const build_path = path.join(__dirname, "../../client/dist");

app.use(express.static(build_path));
app.use(express.json());

app.use("/api", api_router);

app.use("/api", (req, res) => {
    res.status(404).json({ message: "API route not found" });
});

app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(build_path, "index.html"));
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
