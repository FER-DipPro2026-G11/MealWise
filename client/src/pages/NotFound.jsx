import { Link } from "react-router";
import { useTranslation } from "react-i18next";

function NotFound() {
    const { t } = useTranslation();

    return (
        <div>
            <h1>{t("notFound.title")}</h1>
            <Link to="/">{t("notFound.backHome")}</Link>
        </div>
    );
}

export default NotFound;
