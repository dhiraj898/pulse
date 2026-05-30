-- Fireflies individual/free accounts only expose a personal API key (a
-- long-lived GraphQL Bearer token), not OAuth client credentials. Store it
-- encrypted, separate from the OAuth token columns.
alter table users add column if not exists fireflies_api_key_encrypted text;
