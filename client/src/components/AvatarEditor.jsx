import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CURRENT_USER_KEY } from "../api/auth";
import { AVATAR_FILE_TYPES, deleteAvatar, uploadAvatar } from "../api/users";
import { useAuth } from "../auth/useAuth";
import Avatar from "./Avatar";
import ErrorMessage from "./ErrorMessage";

// Shows the logged-in user's avatar with buttons to upload or remove it.
export default function AvatarEditor() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInput = useRef(null);

    // Both requests return the updated user (with the new avatarUrl).
    const setUser = (newUser) =>
        queryClient.setQueryData(CURRENT_USER_KEY, newUser);
    const upload = useMutation({
        mutationFn: uploadAvatar,
        onSuccess: setUser,
    });
    const remove = useMutation({
        mutationFn: deleteAvatar,
        onSuccess: setUser,
    });
    const busy = upload.isPending || remove.isPending;

    function handleFileChosen(event) {
        const file = event.target.files?.[0];
        event.target.value = ""; // so choosing the same file again still works
        if (!file) return;
        remove.reset();
        upload.mutate(file);
    }

    function handleRemove() {
        upload.reset();
        remove.mutate();
    }

    let uploadLabel = t("avatar.upload");
    if (upload.isPending) uploadLabel = t("avatar.uploading");
    else if (user.avatarUrl) uploadLabel = t("avatar.change");

    return (
        <div>
            <Avatar user={user} />
            <p>
                <button
                    type="button"
                    onClick={() => fileInput.current.click()}
                    disabled={busy}
                >
                    {uploadLabel}
                </button>{" "}
                {user.avatarUrl && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={busy}
                    >
                        {t("avatar.remove")}
                    </button>
                )}
                <input
                    ref={fileInput}
                    type="file"
                    accept={AVATAR_FILE_TYPES}
                    onChange={handleFileChosen}
                    hidden
                />
            </p>
            <ErrorMessage error={upload.error ?? remove.error} />
        </div>
    );
}
