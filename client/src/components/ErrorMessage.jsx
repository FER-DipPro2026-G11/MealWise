import { useTranslation } from "react-i18next";

// Shows an API error in the user's language, using the error code the
// server sends (translations under "errors" in i18n/locales/*.json).
export default function ErrorMessage({ error }) {
    const { t, i18n } = useTranslation();
    if (!error) return null;

    const key = `errors.${error.code}`;
    const text = i18n.exists(key) ? t(key, error.params) : t("errors.UNKNOWN");

    return <p role="alert">{text}</p>;
}
