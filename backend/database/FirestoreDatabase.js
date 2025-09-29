const { Firestore, FieldValue } = require('@google-cloud/firestore'); // FieldValue を追加

class FirestoreDatabase /* implements IDatabase */ {
    constructor() {
        this.db = null;
    }

    async initialize(config) {
        console.log('Initializing Firestore...');
        this.db = new Firestore(config);
        console.log('Firestore initialized.');
    }

    async getSettings() {
        const settings = {};
        const snapshot = await this.db.collection('settings').get();
        snapshot.forEach(doc => {
            settings[doc.id] = JSON.parse(doc.data().value);
        });
        return settings;
    }

    async saveSettings(settings) {
        const batch = this.db.batch();
        for (const key in settings) {
            const docRef = this.db.collection('settings').doc(key);
            batch.set(docRef, { value: JSON.stringify(settings[key]) });
        }
        await batch.commit();
    }

    // --- History Methods ---

    async getHistories() {
        const snapshot = await this.db.collection('histories').orderBy('createdAt', 'desc').get();
        const histories = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            histories.push({
                id: doc.id,
                title: data.title,
                // FirestoreのTimestampをISO文字列に変換
                createdAt: data.createdAt.toDate().toISOString()
            });
        });
        return histories;
    }

    async getHistory(id) {
        const docRef = this.db.collection('histories').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return null;
        }
        return { id: doc.id, ...doc.data() };
    }

    async saveHistory(title, markdown) {
        const docRef = this.db.collection('histories').doc(); // IDを自動生成
        const newHistory = {
            title,
            markdown,
            createdAt: FieldValue.serverTimestamp() // サーバー側のタイムスタンプを使用
        };
        await docRef.set(newHistory);
        return { id: docRef.id, ...newHistory };
    }

    async deleteHistory(id) {
        const docRef = this.db.collection('histories').doc(id);
        await docRef.delete();
        return { deleted: true }; // 成功したことを示す
    }
}
module.exports = FirestoreDatabase;