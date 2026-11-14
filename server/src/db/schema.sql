-- The whole database schema. Edit it directly when the schema changes.
--
-- Applied automatically when the server starts with an empty database.
-- To apply changes to an existing database: `npm run db:reset`
-- (deletes ALL data, then runs this file and seed.sql).

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE, -- always stored lowercase
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per logged-in browser. The cookie holds a random token; only its
-- SHA-256 hash is stored, so a leaked database can't be used to log in.
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
