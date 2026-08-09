-- Reverses 000001_init.up.sql entirely.
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_verification_codes;
DROP TABLE IF EXISTS idempotency_keys;
DROP VIEW IF EXISTS account_contributions;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
