const axios = require('axios');
const fs = require('fs');
const path = require('path');

const MLIT_API_KEY = process.env.MLIT_API_KEY;
const MLIT_API_BASE_URL = 'https://www.mlit-data.jp/api/v1/'; // 移動

let prefectures = {};

/**
 * 都道府県データを読み込みます。
 */
function loadPrefectures() {
    try {
        const filePath = path.join(__dirname, '../prefectures.json'); // index.jsからの相対パス
        const fileContent = fs.readFileSync(filePath, 'utf8');
        prefectures = JSON.parse(fileContent);
        console.log('Successfully loaded prefectures data.');
    } catch (error) {
        console.error('FATAL ERROR: Could not read or parse prefectures.json.', error);
        process.exit(1); // 都道府県データがないと動作しないため、プロセスを終了
    }
}

/**
 * 都道府県リストを取得します。
 * @returns {object} 都道府県リスト。
 */
function getPrefectures() {
    return prefectures;
}

/**
 * 指定された都道府県の市区町村リストを取得します。
 * @param {string} prefCode - 都道府県コード。
 * @returns {Promise<Array>} 市区町村リストを含むPromise。
 */
async function getCities(prefCode) {
    if (!prefCode) {
        throw new Error('Prefecture code is required.');
    }
    const query = `query { municipalities(prefCodes: [${parseInt(prefCode, 10)}]) { name, katakana } }`;
    const response = await axios.post(MLIT_API_BASE_URL, { query }, { // 定数を使用
        headers: { 'Content-Type': 'application/json', 'apikey': MLIT_API_KEY }
    });

    if (response.data && response.data.data && Array.isArray(response.data.data.municipalities)) {
        const cities = response.data.data.municipalities.map(item => ({
            name: item.name,
            katakana: item.katakana || ''
        }));
        return cities;
    } else {
        const apiErrors = response.data?.errors || [{ message: 'Unexpected data format from MLIT API' }];
        console.error('GraphQL Errors:', JSON.stringify(apiErrors, null, 2));
        throw new Error('Failed to fetch city data from external API.');
    }
}

module.exports = {
    loadPrefectures,
    getPrefectures,
    getCities
};