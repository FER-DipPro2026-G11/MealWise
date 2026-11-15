import { useTranslation } from "react-i18next";

// The user's profile picture, or the first letter of their username if they
// haven't uploaded one.
export default function Avatar({ user, size = 96 }) {
    const { t } = useTranslation();
    const style = { width: size, height: size };

    if (user.avatarUrl) {
        return (
            <img
                className="avatar"
                src={user.avatarUrl}
                alt={t("avatar.alt")}
                style={style}
            />
        );
    }
    return (
        <span
            className="avatar avatar-placeholder"
            style={{ ...style, fontSize: size * 0.4 }}
            aria-hidden="true"
        >
            {user.username.charAt(0).toUpperCase()}
        </span>
    );
}
