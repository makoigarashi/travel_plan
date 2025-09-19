/**
 * @file APIプロキシと設定管理用のExpressサーバーです。
 * @author Gemini
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const db = require('./db');
const geminiService = require('./services/geminiService'); // 追加
const mistralService = require('./services/mistralService'); // Mistral追加
const geoService = require('./services/geoService');     // 追加
const mapService = require('./services/mapService');     // 追加

const app = express();
const PORT = process.env.PORT || 8080;

// -----------------------------------------------
// 環境変数と定数
// -----------------------------------------------
const IS_PRODUCTION = !!process.env.GOOGLE_CLOUD_PROJECT;




// -----------------------------------------------
// ミドルウェア設定
// -----------------------------------------------
app.use(cors());
app.use(express.json());

// プリフライトリクエスト(OPTIONS)への対応
app.options('*', cors());



// -----------------------------------------------
// リクエストハンドラ関数 (新規Settings API)
// -----------------------------------------------

/**
 * 設定情報を取得します。
 * @param {object} req - Expressリクエストオブジェクト。
 * @param {object} res - Expressレスポンスオブジェクト。
 */
async function handleGetSettings(req, res) {
    try {
        const settings = await db.getSettings(); // dbモジュールのgetSettingsを呼び出し
        res.status(200).json(settings);
    } catch (error) {
        console.error('Failed to get settings:', error);
        res.status(500).json({ error: 'Failed to retrieve settings.' });
    }
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

    try {
        await db.saveSettings(settings); // dbモジュールのsaveSettingsを呼び出し
        res.status(200).json({ message: 'Settings saved successfully.' });
    } catch (error) {
        console.error('Failed to save settings:', error);
        res.status(500).json({ error: 'Failed to save settings.' });
    }
}


// -----------------------------------------------
// APIルート
// -----------------------------------------------
const apiRouter = express.Router();
apiRouter.get('/settings', handleGetSettings);
apiRouter.post('/settings', handlePostSettings);

// 新しい地図関連API
apiRouter.post('/geocode', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) {
            return res.status(400).json({ error: 'Address is required.' });
        }
        const result = await mapService.geocodeAddress(address);
        res.status(200).json(result);
    } catch (error) {
        console.error('Geocode API Error:', error);
        res.status(500).json({ error: 'Failed to geocode address.' });
    }
});

apiRouter.post('/nearest-station', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (typeof lat === 'undefined' || typeof lng === 'undefined') {
            return res.status(400).json({ error: 'Latitude and longitude are required.' });
        }
        const result = await mapService.getNearestStationAndWalkTime(lat, lng);
        res.status(200).json(result);
    } catch (error) {
        console.error('Nearest Station API Error:', error);
        res.status(500).json({ error: 'Failed to get nearest station and walk time.' });
    }
});

apiRouter.post('/directions', async (req, res) => {
    try {
        const { origin, destination, mode } = req.body;
        if (!origin || !destination) {
            return res.status(400).json({ error: 'Origin and destination are required.' });
        }
        const result = await mapService.getDirections(origin, destination, mode);
        res.status(200).json(result);
    } catch (error) {
        console.error('Directions API Error:', error);
        res.status(500).json({ error: 'Failed to get directions.' });
    }
});

app.use('/api', apiRouter);

// 既存のルート (下位互換性のため残す)
app.use('/', async (req, res, next) => {
    try {
        const { api: apiType } = req.query;

        // POSTリクエストの処理 (Gemini実行)
        if (req.method === 'POST' && apiType === 'gemini') {
            try {
                const text = await geminiService.generateContent(req.body.prompt);
                return res.status(200).json({ text });
            } catch (error) {
                console.error('Error calling Gemini API:', error);
                return res.status(500).json({ error: 'Failed to get response from Gemini API.' });
            }
        }

        // POSTリクエストの処理 (Mistral実行)
        if (req.method === 'POST' && apiType === 'mistral') {
            try {
                const text = await mistralService.generateContent(req.body.prompt);
                return res.status(200).json({ text });
            } catch (error) {
                console.error('Error calling Mistral API:', error);
                return res.status(500).json({ error: 'Failed to get response from Mistral API.' });
            }
        }

        // GETリクエストの処理
        if (req.method === 'GET') {
            if (apiType === 'prefectures') {
                return res.status(200).json(geoService.getPrefectures());
            }
            if (apiType === 'cities') {
                try {
                    const cities = await geoService.getCities(req.query.prefCode);
                    return res.status(200).json(cities);
                } catch (error) {
                    console.error('Error calling MLIT API:', error);
                    return res.status(500).json({ error: 'Failed to fetch city data.' });
                }
            }
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
    
    
    geminiService.initializeGemini(); // Geminiはキーがなくてもサーバーは起動する
    mistralService.initializeMistral(); // Mistralを初期化
    geoService.loadPrefectures(); // 都道府県データを読み込み
    await db.initialize(IS_PRODUCTION); // dbモジュールのinitializeを呼び出し

    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
        console.log(`Running in ${IS_PRODUCTION ? 'production (Firestore)' : 'development (SQLite)'} mode.`);
    });
}

startServer();
