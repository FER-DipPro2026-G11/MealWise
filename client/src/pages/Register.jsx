import { Link, Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/useAuth";
import ErrorMessage from "../components/ErrorMessage";

// Must match MIN_PASSWORD_LENGTH in server/src/routes/auth.js
const MIN_PASSWORD_LENGTH = 8;

function Register() {
    const { t } = useTranslation();
    const { user, register } = useAuth();

    // The server logs the new user in right away.
    if (user) return <Navigate to="/" replace />;

    function handleSubmit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        register.mutate({
            email: form.get("email"),
            password: form.get("password"),
        });
    }

    return (
        <div>
            <h1>{t("auth.registerTitle")}</h1>
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
                        autoComplete="new-password"
                        minLength={MIN_PASSWORD_LENGTH}
                        aria-describedby="password-hint"
                        required
                    />
                </label>
                <small id="password-hint">
                    {t("auth.passwordHint", { min: MIN_PASSWORD_LENGTH })}
                </small>
                <ErrorMessage error={register.error} />
                <button type="submit" disabled={register.isPending}>
                    {register.isPending
                        ? t("auth.registering")
                        : t("auth.registerButton")}
                </button>
            </form>
            <p>
                {t("auth.haveAccount")}{" "}
                <Link to="/login">{t("auth.loginLink")}</Link>
            </p>
        </div>
    );
}

export default Register;
