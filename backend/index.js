const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

const MLIT_API_KEY = process.env.MLIT_API_KEY;

// -----------------------------------------------
// データ定義
// -----------------------------------------------
const prefectures = {
    "01": "北海道", "02": "青森県", "03": "岩手県", "04": "宮城県", "05": "秋田県", 
    "06": "山形県", "07": "福島県", "08": "茨城県", "09": "栃木県", "10": "群馬県", 
    "11": "埼玉県", "12": "千葉県", "13": "東京都", "14": "神奈川県", "15": "新潟県", 
    "16": "富山県", "17": "石川県", "18": "福井県", "19": "山梨県", "20": "長野県", 
    "21": "岐阜県", "22": "静岡県", "23": "愛知県", "24": "三重県", "25": "滋賀県", 
    "26": "京都府", "27": "大阪府", "28": "兵庫県", "29": "奈良県", "30": "和歌山県", 
    "31": "鳥取県", "32": "島根県", "33": "岡山県", "34": "広島県", "35": "山口県", 
    "36": "徳島県", "37": "香川県", "38": "愛媛県", "39": "高知県", "40": "福岡県", 
    "41": "佐賀県", "42": "長崎県", "43": "熊本県", "44": "大分県", "45": "宮崎県", 
    "46": "鹿児島県", "47": "沖縄県"
};

// CORSミドルウェア
app.use(cors());

// -----------------------------------------------
// リクエストハンドラ関数
// -----------------------------------------------

/**
 * 都道府県リストを取得するハンドラ
 */
async function handleGetPrefectures(req, res) {
    return res.status(200).json(prefectures);
}

/**
 * 指定された都道府県の市区町村リストを取得するハンドラ
 */
async function handleGetCities(req, res) {
    const prefCode = req.query.prefCode;
    if (!prefCode) {
        return res.status(400).send('Prefecture code is required.');
    }
    
    const query = `
        query {
          municipalities(prefCodes: [${parseInt(prefCode, 10)}]) {
            name
          }
        }
    `;
      
    const response = await axios({
        url: 'https://www.mlit-data.jp/api/v1/',
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'apikey': MLIT_API_KEY
        },
        data: {
            query: query
        }
    });

    if (response.data && response.data.data && response.data.data.municipalities && Array.isArray(response.data.data.municipalities)) {
        const cities = response.data.data.municipalities.map(item => item.name);
        return res.status(200).json(cities);
    } else {
        if(response.data && response.data.errors) {
            console.error('GraphQL Errors:', response.data.errors);
        }
        throw new Error('Unexpected data format from MLIT API');
    }
}

// -----------------------------------------------
// メインのAPIルート
// -----------------------------------------------
app.get('/', async (req, res) => {
  if (!MLIT_API_KEY) {
    return res.status(500).send('API Key is not configured on the server.');
  }

  const apiType = req.query.api;
  
  try {
    // リクエストに応じて、適切なハンドラ関数を呼び出す
    if (apiType === 'prefectures') {
      return await handleGetPrefectures(req, res);
    } else if (apiType === 'cities') {
      return await handleGetCities(req, res);
    } else {
      return res.status(400).send('Invalid API type specified.');
    }
  } catch (error) {
    if (error.response) {
      console.error(`Error with API:`, error.response.status, error.response.data);
      return res.status(error.response.status).send(error.response.data);
    } else {
      console.error('Error with API:', error.message);
      return res.status(500).send('Failed to fetch data from the external API.');
    }
  }
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