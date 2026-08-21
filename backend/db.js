import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dbPath = process.env.DB_PATH || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// This "Schema" creates the tables if they don't exist
const createTables = `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        encryptionSalt TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        content TEXT,
        iv TEXT,
        FOREIGN KEY (userId) REFERENCES users(id)
    );
`;

db.exec(createTables); // exec is used for running multiple SQL commands at once

// Lightweight migrations for existing local databases.
try {
    db.exec(`ALTER TABLE users ADD COLUMN encryptionSalt TEXT`);
} catch (_) {}

try {
    db.exec(`ALTER TABLE notes ADD COLUMN content TEXT`);
} catch (_) {}

try {
    db.exec(`ALTER TABLE notes ADD COLUMN iv TEXT`);
} catch (_) {}

// Backfill content from legacy note column if it exists.
try {
    db.exec(`UPDATE notes SET content = note WHERE content IS NULL AND note IS NOT NULL`);
} catch (_) {}

export default db;