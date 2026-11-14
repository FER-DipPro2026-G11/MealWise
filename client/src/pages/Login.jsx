import { Link, Navigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/useAuth";
import ErrorMessage from "../components/ErrorMessage";

function Login() {
    const { t } = useTranslation();
    const { user, login } = useAuth();
    const location = useLocation();

    // Already logged in (or just logged in): go where the user was headed.
    if (user) {
        return <Navigate to={location.state?.from?.pathname ?? "/"} replace />;
    }

    function handleSubmit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        login.mutate({
            email: form.get("email"),
            password: form.get("password"),
        });
    }

    return (
        <div>
            <h1>{t("auth.loginTitle")}</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    {t("auth.email")}
                    <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                    />
                </label>
                <label>
                    {t("auth.password")}
                    <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        required
                    />
                </label>
                <ErrorMessage error={login.error} />
                <button type="submit" disabled={login.isPending}>
                    {login.isPending
                        ? t("auth.loggingIn")
                        : t("auth.loginButton")}
                </button>
            </form>
            <p>
                {t("auth.noAccount")}{" "}
                <Link to="/register">{t("auth.registerLink")}</Link>
            </p>
        </div>
    );
}

export default Login;
