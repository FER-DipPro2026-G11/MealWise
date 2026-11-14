import { Routes, Route } from "react-router";
import RequireAuth from "./auth/RequireAuth";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

export default function App() {
    return (
        <>
            <header>
                <LanguageSwitcher />
            </header>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<RequireAuth />}>
                    {/* Rute koje zahtijevaju prijavu idu ovdje, npr.:
                    <Route path="/meals" element={<Meals />} /> */}
                </Route>
                <Route path="*" element={<NotFound />} />
                {/* Kad cete dodavati nove rute ovu ostavite zadnju -Dorotea */}
            </Routes>
        </>
    );
}
