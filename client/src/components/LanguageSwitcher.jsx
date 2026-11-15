import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n";

export default function LanguageSwitcher() {
    const { t, i18n } = useTranslation();

    return (
        <label>
            {t("language.label")}{" "}
            <select
                value={i18n.resolvedLanguage}
                onChange={(event) => i18n.changeLanguage(event.target.value)}
            >
                {LANGUAGES.map(({ code, label }) => (
                    <option key={code} value={code} lang={code}>
                        {label}
                    </option>
                ))}
            </select>
        </label>
    );
}
