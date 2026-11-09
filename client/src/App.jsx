import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="*" element={<NotFound />} />
            {/* Kad cete dodavati nove rute ovu ostavite zadnju -Dorotea */}
        </Routes>
    );
}
