// import { DatabaseSync } from 'node:sqlite'
// const db = new DatabaseSync(':memory:')

// // Execute SQL statements from strings
// db.exec(`
//     CREATE TABLE users (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         username TEXT UNIQUE,
//         password TEXT
//     )
// `)

// db.exec(`
//     CREATE TABLE todos (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         user_id INTEGER,
//         task TEXT,
//         completed BOOLEAN DEFAULT 0,
//         FOREIGN KEY(user_id) REFERENCES users(id)
//     )    
// `)

// export default db


import Database from 'better-sqlite3';
const db = new Database('database.db');

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