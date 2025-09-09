/**
 * @file APIプロキシと設定管理用のExpressサーバーです。
 * @author Gemini
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Firestore } = require('@google-cloud/firestore');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 8080;

// -----------------------------------------------
// 環境変数と定数
// -----------------------------------------------
const MLIT_API_KEY = process.env.MLIT_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IS_PRODUCTION = !!process.env.GOOGLE_CLOUD_PROJECT;
const DB_FILE = path.join(__dirname, 'database.sqlite');

// -----------------------------------------------
// DBとAPIクライアントの初期化
// -----------------------------------------------
let db;
let geminiModel;

/**
 * データベースを初期化します。
 * 本番環境ではFirestore、開発環境ではSQLiteを使用します。
 */
async function initializeDatabase() {
    if (IS_PRODUCTION) {
        console.log('Initializing Firestore...');
        db = new Firestore();
        console.log('Firestore initialized.');
    } else {
        console.log('Initializing SQLite...');
        db = new sqlite3.Database(DB_FILE, (err) => {
            if (err) {
                console.error('FATAL ERROR: Could not connect to SQLite.', err.message);
                process.exit(1);
            }
            console.log('Connected to the local SQLite database.');
        });

        // settingsテーブルが存在しない場合は作成
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`, (err) => {
            if (err) {
                console.error('FATAL ERROR: Could not create settings table.', err.message);
                process.exit(1);
            }
            console.log("SQLite 'settings' table is ready.");
        });
    }
}

/**
 * Gemini APIクライアントを初期化します。
 */
function initializeGemini() {
    if (GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        console.log('Gemini API client initialized.');
    } else {
        console.warn('WARNING: GEMINI_API_KEY is not set. Gemini related features will be disabled.');
    }
}


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

// -----------------------------------------------
// ミドルウェア設定
// -----------------------------------------------
app.use(cors());
app.use(express.json());

// プリフライトリクエスト(OPTIONS)への対応
app.options('*', cors());

// -----------------------------------------------
// リクエストハンドラ関数 (既存API)
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
    const query = `query { municipalities(prefCodes: [${parseInt(prefCode, 10)}]) { name, katakana } }`;
    const response = await axios.post('https://www.mlit-data.jp/api/v1/', { query }, {
        headers: { 'Content-Type': 'application/json', 'apikey': MLIT_API_KEY }
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
    if (!geminiModel) {
        return res.status(503).json({ error: 'Gemini API is not available.' });
    }
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
// リクエストハンドラ関数 (新規Settings API)
// -----------------------------------------------

/**
 * 設定情報を取得します。
 * @param {object} req - Expressリクエストオブジェクト。
 * @param {object} res - Expressレスポンスオブジェクト。
 */
async function handleGetSettings(req, res) {
    let settings = {};
    if (IS_PRODUCTION) {
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
    res.status(200).json(settings);
}

/**
 * 設定情報を保存します。
 * @param {object} req - Expressリクエストオブジェクト。
 * @param {object} res - Expressレスポンスオブジェクト。
 */
async function handlePostSettings(req, res) {
    const settings = req.body;
    if (typeof settings !== 'object' || settings === null) {
        return res.status(400).json({ error: 'Invalid settings format.' });
    }

    if (IS_PRODUCTION) {
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
    res.status(200).json({ message: 'Settings saved successfully.' });
}


// -----------------------------------------------
// APIルート
// -----------------------------------------------
const apiRouter = express.Router();
apiRouter.get('/settings', handleGetSettings);
apiRouter.post('/settings', handlePostSettings);
app.use('/api', apiRouter);

// 既存のルート (下位互換性のため残す)
app.use('/', async (req, res, next) => {
    try {
        const { api: apiType } = req.query;

        // POSTリクエストの処理 (Gemini実行)
        if (req.method === 'POST' && apiType === 'gemini') {
            return await handleGeminiExecute(req, res);
        }

        // GETリクエストの処理
        if (req.method === 'GET') {
            if (apiType === 'prefectures') return handleGetPrefectures(req, res);
            if (apiType === 'cities') return await handleGetCities(req, res);
        }
        
        // 新しいAPIルートで処理されなかった場合
        if (!res.headersSent) {
             // `/api` プレフィックスがない、または一致するルートがない場合
            const isApiRoute = req.originalUrl.startsWith('/api/');
            if (!isApiRoute && !apiType) {
                 // ルートパスへのアクセスなど、API以外のリクエストはここで終了させる
                 return res.status(200).send('API Server is running.');
            }
            return res.status(404).json({ error: 'Invalid API endpoint specified.' });
        }

    } catch (error) {
        next(error);
    }
});


// -----------------------------------------------
// エラーハンドリングミドルウェア
// -----------------------------------------------
app.use((error, req, res, next) => {
    console.error(`[Global Error Handler] Path: ${req.path}, Message: ${error.message}`);
    console.error(error.stack); // スタックトレースも出力

    if (error.response) { // axiosエラー
        console.error(`[Axios Error] Status: ${error.response.status}, Data:`, error.response.data);
        return res.status(502).json({ error: 'Bad Gateway: Error from external API.' });
    }

    // その他のサーバー内部エラー
    res.status(500).json({ error: 'Internal Server Error' });
});

// -----------------------------------------------
// サーバー起動
// -----------------------------------------------

/**
 * サーバーを起動します。
 * 必要なAPIキーのチェック、DBの初期化を行い、Expressサーバーを起動します。
 */
async function startServer() {
    if (!MLIT_API_KEY) {
        console.error('FATAL ERROR: MLIT_API_KEY environment variable is not set. Server will not start.');
        process.exit(1);
    }
    
    initializeGemini(); // Geminiはキーがなくてもサーバーは起動する
    await initializeDatabase();

    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
        console.log(`Running in ${IS_PRODUCTION ? 'production (Firestore)' : 'development (SQLite)'} mode.`);
    });
}

startServer();
