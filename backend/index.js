/**
 * @file APIプロキシ用のExpressサーバーです。
 * @author Gemini
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const MLIT_API_KEY = process.env.MLIT_API_KEY;

// -----------------------------------------------
// データ読み込み
// -----------------------------------------------
let prefectures = {};
try {
    const filePath = path.join(__dirname, 'prefectures.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    prefectures = JSON.parse(fileContent);
    console.log('Successfully loaded prefectures data.');
} catch (error) {
    console.error('FATAL ERROR: Could not read or parse prefectures.json.', error);
    process.exit(1); // 都道府県データがないと動作しないため、プロセスを終了
}

// CORSミドルウェア
app.use(cors());

// -----------------------------------------------
// リクエストハンドラ関数
// -----------------------------------------------

/**
 * 都道府県リスト取得リクエストを処理します。
 * @param {object} req - Expressリクエストオブジェクト。
 * @param {object} res - Expressレスポンスオブジェクト。
 */
function handleGetPrefectures(req, res) {
    res.status(200).json(prefectures);
}

/**
 * 指定された都道府県の市区町村リスト取得リクエストを処理します。
 * @param {object} req - Expressリクエストオブジェクト。
 * @param {object} res - Expressレスポンスオブジェクト。
 */
async function handleGetCities(req, res) {
    const { prefCode } = req.query;
    if (!prefCode) {
        return res.status(400).json({ error: 'Prefecture code is required.' });
    }

    // クエリを元の直接埋め込む方式に戻す
    const query = `
        query {
          municipalities(prefCodes: [${parseInt(prefCode, 10)}]) {
            name
            katakana
          }
        }
    `;

    const response = await axios.post('https://www.mlit-data.jp/api/v1/', {
        query
        // variables は使用しない
    }, {
        headers: {
            'Content-Type': 'application/json',
            'apikey': MLIT_API_KEY
        }
    });

    if (response.data && response.data.data && Array.isArray(response.data.data.municipalities)) {
        const cities = response.data.data.municipalities.map(item => ({
            name: item.name,
            katakana: item.katakana || ''
        }));
        res.status(200).json(cities);
    } else {
        // エラーハンドリングの強化
        const apiErrors = response.data?.errors || [{ message: 'Unexpected data format from MLIT API' }];
        console.error('GraphQL Errors:', JSON.stringify(apiErrors, null, 2));
        throw new Error('Failed to fetch city data from external API.');
    }
}

// -----------------------------------------------
// メインのAPIルート
// -----------------------------------------------
app.get('/', async (req, res, next) => {
    try {
        const { api: apiType } = req.query;

        if (apiType === 'prefectures') {
            return handleGetPrefectures(req, res);
        }
        if (apiType === 'cities') {
            return await handleGetCities(req, res);
        }
        return res.status(400).json({ error: 'Invalid API type specified.' });

    } catch (error) {
        next(error); // エラーを専用ミドルウェアに渡す
    }
});

// -----------------------------------------------
// エラーハンドリングミドルウェア
// -----------------------------------------------
app.use((error, req, res, next) => {
    console.error(`[Global Error Handler] Path: ${req.path}, Message: ${error.message}`);

    if (error.response) {
        // axiosエラーの場合
        console.error(`[Axios Error] Status: ${error.response.status}`);
        console.error(`[Axios Error] Data:`, error.response.data);
        // クライアントには汎用的なメッセージを返す
        return res.status(502).json({ error: 'Bad Gateway: Error from external API.' });
    }

    // その他のサーバー内部エラー
    res.status(500).json({ error: 'Internal Server Error' });
});

// -----------------------------------------------
// サーバー起動
// -----------------------------------------------
function startServer() {
    if (!MLIT_API_KEY) {
        console.error('FATAL ERROR: MLIT_API_KEY environment variable is not set. Server will not start.');
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
}

startServer();
