const path = require('path'); // 追加
const FirestoreDatabase = require('./database/FirestoreDatabase');
const SQLiteDatabase = require('./database/SQLiteDatabase');

const DB_FILE = path.join(__dirname, 'database.sqlite'); // 追加

let activeDatabase;

async function initialize(productionMode) { // dbFileを削除
    if (productionMode) {
        activeDatabase = new FirestoreDatabase();
        await activeDatabase.initialize(); // Firestoreはconfig不要
    } else {
        activeDatabase = new SQLiteDatabase();
        await activeDatabase.initialize(DB_FILE); // DB_FILEを使用
    }
}

async function getSettings() {
    if (!activeDatabase) {
        throw new Error('Database not initialized. Call initialize() first.');
    }
    return activeDatabase.getSettings();
}

async function saveSettings(settings) {
    if (!activeDatabase) {
        throw new Error('Database not initialized. Call initialize() first.');
    }
    return activeDatabase.saveSettings(settings);
}

module.exports = {
    initialize,
    getSettings,
    saveSettings
};