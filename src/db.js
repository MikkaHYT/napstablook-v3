import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

export async function initDb() {
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function addMessage(userId, role, content) {
    if (!db) await initDb();
    await db.run(
        'INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)',
        userId,
        role,
        content
    );
}

export async function getHistory(userId) {
    if (!db) await initDb();
    const messages = await db.all(
        'SELECT role, content FROM messages WHERE user_id = ? ORDER BY id ASC',
        userId
    );

    return messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));
}
