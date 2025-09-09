const { Firestore } = require('@google-cloud/firestore');

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
}
module.exports = FirestoreDatabase;