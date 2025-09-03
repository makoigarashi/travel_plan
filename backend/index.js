/**
 * @file APIプロキシ用のExpressサーバーです。
 * @author Gemini
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 8080;

const MLIT_API_KEY = process.env.MLIT_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest'});

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
// JSONパーサーミドルウェア
app.use(express.json());

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

/**
 * Gemini APIにプロンプトを送信し、結果を返します。
 * @param {object} req - Expressリクエストオブジェクト。
 * @param {object} res - Expressレスポンスオブジェクト。
 */
async function handleGeminiExecute(req, res) {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    res.status(200).json({ text });
}

// -----------------------------------------------
// メインのAPIルート
// -----------------------------------------------
app.use('/', async (req, res, next) => { // GETとPOST両方を受け付けるためにapp.useに変更
    try {
        const { api: apiType } = req.query;

        // POSTリクエストの処理 (Gemini実行)
        if (req.method === 'POST' && apiType === 'gemini') {
            return await handleGeminiExecute(req, res);
        }

        // GETリクエストの処理
        if (req.method === 'GET') {
            if (apiType === 'prefectures') {
                return handleGetPrefectures(req, res);
            }
            if (apiType === 'cities') {
                return await handleGetCities(req, res);
            }
        }
        
        // 一致するルートがない場合
        return res.status(400).json({ error: 'Invalid API type or method specified.' });

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
    if (!GEMINI_API_KEY) {
        console.error('FATAL ERROR: GEMINI_API_KEY environment variable is not set. Server will not start.');
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
}

startServer();
