const path = require('path');
const FirestoreDatabase = require('./database/FirestoreDatabase');
const SQLiteDatabase = require('./database/SQLiteDatabase');

const DB_FILE = path.join(__dirname, 'database.sqlite');

let activeDatabase;

async function initialize(productionMode) {
    if (productionMode) {
        activeDatabase = new FirestoreDatabase();
        await activeDatabase.initialize();
    } else {
        activeDatabase = new SQLiteDatabase();
        await activeDatabase.initialize(DB_FILE);
    }
}

function ensureDbInitialized() {
    if (!activeDatabase) {
        throw new Error('Database not initialized. Call initialize() first.');
    }
}

async function getSettings() {
    ensureDbInitialized();
    return activeDatabase.getSettings();
}

async function saveSettings(settings) {
    ensureDbInitialized();
    return activeDatabase.saveSettings(settings);
}

async function getHistories() {
    ensureDbInitialized();
    return activeDatabase.getHistories();
}

async function getHistory(id) {
    ensureDbInitialized();
    return activeDatabase.getHistory(id);
}

async function saveHistory(title, markdown) {
    ensureDbInitialized();
    return activeDatabase.saveHistory(title, markdown);
}

async function deleteHistory(id) {
    ensureDbInitialized();
    return activeDatabase.deleteHistory(id);
}

module.exports = {
    initialize,
    getSettings,
    saveSettings,
    getHistories,
    getHistory,
    saveHistory,
    deleteHistory
};