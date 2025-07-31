const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;

const MLIT_API_KEY = process.env.MLIT_API_KEY;

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

app.use(cors());

// SSL/TLSのセキュリティレベルを緩和するためのエージェントを作成
const httpsAgent = new https.Agent({
  secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT,
});

app.get('/', async (req, res) => {
  if (!MLIT_API_KEY) {
    return res.status(500).send('API Key is not configured on the server.');
  }

  const apiType = req.query.api;
  
  try {
    if (apiType === 'prefectures') {
      return res.status(200).json(prefectures);

    } else if (apiType === 'cities') {
      const prefCode = req.query.prefCode;
      if (!prefCode) {
        return res.status(400).send('Prefecture code is required.');
      }
      
      try {
        const response = await axios.get(apiUrl, {
            headers: { 'apikey': MLIT_API_KEY },
            httpsAgent: httpsAgent
        });
        
        // 生データをそのままクライアントに返す
        console.log("Successfully fetched data:", response.data);
        return res.status(200).json(response.data);

      } catch (error) {
        if (error.response) {
          console.error(`Error with API (${error.config.url}):`, error.response.status, error.response.data);
          res.status(error.response.status).send(error.response.data);
        } else {
          console.error('Error with API:', error.message);
          res.status(500).send('Failed to fetch data from the external API.');
        }
      }

    } else {
      return res.status(400).send('Invalid API type specified.');
    }

  } catch (error) {
    if (error.response) {
      console.error(`Error with API (${error.config.url}):`, error.response.status, error.response.data);
      res.status(error.response.status).send(error.response.data);
    } else {
      console.error('Error with API:', error.message);
      res.status(500).send('Failed to fetch data from the external API.');
    }
  }
});

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