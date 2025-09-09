const { Firestore } = require('@google-cloud/firestore');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db;
let isProduction;
let dbFile;

/**
 * データベースを初期化します。
 * @param {boolean} productionMode - 本番環境かどうか。
 * @param {string} databaseFile - SQLiteのデータベースファイルパス。
 */
async function initialize(productionMode, databaseFile) {
    isProduction = productionMode;
    dbFile = databaseFile;

    if (isProduction) {
        console.log('Initializing Firestore...');
        db = new Firestore();
        console.log('Firestore initialized.');
    } else {
        console.log('Initializing SQLite...');
        db = new sqlite3.Database(dbFile, (err) => {
            if (err) {
                console.error('FATAL ERROR: Could not connect to SQLite.', err.message);
                process.exit(1);
            }
            console.log('Connected to the local SQLite database.');
        });

        // settingsテーブルが存在しない場合は作成
        await new Promise((resolve, reject) => {
            db.run(`CREATE TABLE IF NOT EXISTS settings (
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
}

/**
 * 設定情報を取得します。
 * @returns {Promise<object>} 設定オブジェクトを含むPromise。
 */
async function getSettings() {
    let settings = {};
    if (isProduction) {
        const snapshot = await db.collection('settings').get();
        snapshot.forEach(doc => {
            settings[doc.id] = JSON.parse(doc.data().value);
        });
    } else {
        await new Promise((resolve, reject) => {
            db.all("SELECT key, value FROM settings", [], (err, rows) => {
                if (err) return reject(err);
                rows.forEach(row => {
                    try {
                        settings[row.key] = JSON.parse(row.value);
                    } catch (e) {
                        console.warn(`Could not parse setting for key: ${row.key}, value: ${row.value}`);
                        settings[row.key] = row.value; // パース失敗時はそのままの値を返す
                    }
                });
                resolve();
            });
        });
    }
    return settings;
}

/**
 * 設定情報を保存します。
 * @param {object} settings - 保存する設定オブジェクト。
 * @returns {Promise<void>} 保存結果を含むPromise。
 */
async function saveSettings(settings) {
    if (isProduction) {
        const batch = db.batch();
        for (const key in settings) {
            const docRef = db.collection('settings').doc(key);
            batch.set(docRef, { value: JSON.stringify(settings[key]) });
        }
        await batch.commit();
    } else {
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
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

module.exports = {
    initialize,
    getSettings,
    saveSettings
};