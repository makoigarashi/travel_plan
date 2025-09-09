const sqlite3 = require('sqlite3').verbose();

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

        await new Promise((resolve, reject) => {
            this.db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`, (err) => {
                if (err) {
                    console.error('FATAL ERROR: Could not create settings table.', err.message);
                    process.exit(1);
                }
                console.log("SQLite 'settings' table is ready.");
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
}
module.exports = SQLiteDatabase;