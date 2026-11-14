import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/useAuth";
import ErrorMessage from "../components/ErrorMessage";
import AvatarEditor from "../components/AvatarEditor";

function Home() {
    const { t } = useTranslation();
    const { user, isLoading, logout } = useAuth();

    return (
        <div>
            <h1>{t("home.title")}</h1>
            <p>{t("home.welcome")}</p>
            {isLoading ? (
                <p>{t("common.loading")}</p>
            ) : user ? (
                <>
                    <AvatarEditor />
                    <p>
                        {t("home.loggedInAs", { username: user.username })}{" "}
                        <button
                            onClick={() => logout.mutate()}
                            disabled={logout.isPending}
                        >
                            {t("home.logout")}
                        </button>
                    </p>
                    <ErrorMessage error={logout.error} />
                </>
            ) : (
                <p>
                    <Link to="/login">{t("home.login")}</Link> |{" "}
                    <Link to="/register">{t("home.register")}</Link>
                </p>
            )}
        </div>
    );
}

export default Home;
