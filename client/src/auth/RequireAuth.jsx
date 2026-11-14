import { Navigate, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "./useAuth";

// Wrap routes that need a logged-in user (see App.jsx). Logged-out visitors
// go to /login, and come back to the page they wanted after logging in.
export default function RequireAuth() {
    const { t } = useTranslation();
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return <p>{t("common.loading")}</p>;
    if (!user)
        return <Navigate to="/login" replace state={{ from: location }} />;
    return <Outlet />;
}
