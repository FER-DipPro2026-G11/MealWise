// The user as sent to the client: never includes the password hash.
export function toPublicUser({ id, username, email, hasAvatar }) {
    const avatarUrl = hasAvatar ? `/api/users/${id}/avatar` : null;
    return { id, username, email, avatarUrl };
}
