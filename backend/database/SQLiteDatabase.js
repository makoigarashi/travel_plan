const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid'); // 追加

class SQLiteDatabase /* implements IDatabase */ {
    constructor() {
        this.db = null;
    }

    async initialize(dbFile) {
        console.log('Initializing SQLite...');
        this.db = new sqlite3.Database(dbFile, (err) => {
            if (err) {
                console.error('FATAL ERROR: Could not connect to SQLite.', err.message);
                process.exit(1);
            }
            console.log('Connected to the local SQLite database.');
        });

        // settingsテーブルの作成
        await new Promise((resolve, reject) => {
            this.db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`, (err) => {
                if (err) {
                    console.error('FATAL ERROR: Could not create settings table.', err.message);
                    return reject(err); // rejectを返すように修正
                }
                console.log("SQLite 'settings' table is ready.");
                resolve();
            });
        });

        // historiesテーブルの作成
        await new Promise((resolve, reject) => {
            this.db.run(`CREATE TABLE IF NOT EXISTS histories (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                markdown TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('FATAL ERROR: Could not create histories table.', err.message);
                    return reject(err); // rejectを返すように修正
                }
                console.log("SQLite 'histories' table is ready.");
                resolve();
            });
        });
    }

    async getSettings() {
        const settings = {};
        await new Promise((resolve, reject) => {
            this.db.all("SELECT key, value FROM settings", [], (err, rows) => {
                if (err) return reject(err);
                rows.forEach(row => {
                    try {
                        settings[row.key] = JSON.parse(row.value);
                    } catch (e) {
                        console.warn(`Could not parse setting for key: ${row.key}, value: ${row.value}`);
                        settings[row.key] = row.value;
                    }
                });
                resolve();
            });
        });
        return settings;
    }

    async saveSettings(settings) {
        const stmt = this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        for (const key in settings) {
            await new Promise((resolve, reject) => {
                stmt.run(key, JSON.stringify(settings[key]), (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        }
        await new Promise((resolve) => stmt.finalize(resolve));
    }

    // --- History Methods ---

    async getHistories() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT id, title, createdAt FROM histories ORDER BY createdAt DESC", [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    async getHistory(id) {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT * FROM histories WHERE id = ?", [id], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }

    async saveHistory(title, markdown) {
        const newId = uuidv4();
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare("INSERT INTO histories (id, title, markdown) VALUES (?, ?, ?)");
            stmt.run(newId, title, markdown, function(err) {
                if (err) return reject(err);
                resolve({ id: newId, title, markdown });
            });
            stmt.finalize();
        });
    }

    async deleteHistory(id) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare("DELETE FROM histories WHERE id = ?");
            stmt.run(id, function(err) {
                if (err) return reject(err);
                // 削除された行数を返す
                resolve({ deleted: this.changes });
            });
            stmt.finalize();
        });
    }
}
module.exports = SQLiteDatabase;