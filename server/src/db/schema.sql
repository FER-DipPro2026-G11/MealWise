CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL, -- as typed; unique ignoring case (index below)
    email TEXT NOT NULL, -- as typed; unique ignoring case (index below)
    password_hash TEXT NOT NULL,
    avatar BYTEA -- 512x512 WebP with transparency, NULL if none
);
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
