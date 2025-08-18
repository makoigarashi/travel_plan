/**
 * @file アプリケーション全体の設定を定義します。
 * @author Gemini
 */

// =============================================
// アプリケーション設定ファイル (config.js)
// =============================================

/**
 * APIエンドポイントの定義。
 * @type {{production: string, development: string}}
 */
const API_ENDPOINTS = {
        // 本番環境（GCS）で使うURL
        production: 'https://geo-api-proxy-160651572780.asia-northeast1.run.app',
        // 開発環境（ローカル）で使うURL
        development: 'http://localhost:8080'
    };

/**
 * アプリケーション設定オブジェクト。
 * @property {string} API_ENDPOINT - 現在の環境に対応するAPIエンドポイント。
 * @property {boolean} DEBUG_FLAG - デバッグモードの有効/無効フラグ。
 * @property {object} defaultValues - フォームの初期値。
 * @property {string[]} prefixes - バージョン情報に使われるランダムな接頭辞。
 * @property {object} regions - 地方区分データ。
 * @property {object} geoData - 都道府県データ。
 * @property {object} walkerplus - Walker+連携のための設定。
 * @property {string[]} dayNames - 曜日の名称配列。
 */
const AppConfig = {
    // 現在の環境（ホスト名）に応じて、使用するAPIエンドポイントを自動で選択
    API_ENDPOINT: (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
                  ? API_ENDPOINTS.development
                  : API_ENDPOINTS.production,

    // デバッグモードのON/OFF
    DEBUG_FLAG: false,

    // アプリケーションのバージョン情報
    version: '4.1',
    appName: '日付自動設定機能追加版',

    // フォームのデフォルト値
    defaultValues: {
        departure: "札幌",
        members: "50代、1人、体力に少し不安",
        theme: "美術館に行く",
        priority: "節約志向"
    },

    // バージョン情報に表示される、ランダムな接頭辞
    prefixes: [
        '花の', '煌びやかな', '伝説の', '究極の', '月影の', '星屑の',
        '暁の', '至高の', '神速の', '冒険の', '真・', '最終奥義', '風の'
    ],

    // エリアコード
    regions: {
      "01": { name: "北海道" },    "02": { name: "東北" },
      "03": { name: "関東" },      "04": { name: "甲信越" },
      "05": { name: "北陸" },      "06": { name: "東海" },
      "07": { name: "近畿" },      "08": { name: "中国" },
      "09": { name: "四国" },      "10": { name: "九州・沖縄" }
    },

    geoData: {
        "01": { name: "北海道",   regionId: "01" },
        "02": { name: "青森県",   regionId: "02" }, "03": { name: "岩手県",   regionId: "02" },
        "04": { name: "宮城県",   regionId: "02" }, "05": { name: "秋田県",   regionId: "02" },
        "06": { name: "山形県",   regionId: "02" }, "07": { name: "福島県",   regionId: "02" },
        "13": { name: "東京都",   regionId: "03" }, "14": { name: "神奈川県", regionId: "03" },
        "12": { name: "千葉県",   regionId: "03" }, "11": { name: "埼玉県",   regionId: "03" },
        "10": { name: "群馬県",   regionId: "03" }, "09": { name: "栃木県",   regionId: "03" },
        "08": { name: "茨城県",   regionId: "03" },
        "15": { name: "新潟県",   regionId: "04" }, "19": { name: "山梨県",   regionId: "04" },
        "20": { name: "長野県",   regionId: "04" },
        "17": { name: "石川県",   regionId: "05" }, "16": { name: "富山県",   regionId: "05" },
        "18": { name: "福井県",   regionId: "05" },
        "23": { name: "愛知県",   regionId: "06" }, "21": { name: "岐阜県",   regionId: "06" },
        "24": { name: "三重県",   regionId: "06" }, "22": { name: "静岡県",   regionId: "06" },
        "27": { name: "大阪府",   regionId: "07" }, "26": { name: "京都府",   regionId: "07" },
        "28": { name: "兵庫県",   regionId: "07" }, "29": { name: "奈良県",   regionId: "07" },
        "30": { name: "和歌山県", regionId: "07" }, "25": { name: "滋賀県",   regionId: "07" },
        "34": { name: "広島県",   regionId: "08" }, "33": { name: "岡山県",   regionId: "08" },
        "35": { name: "山口県",   regionId: "08" }, "31": { name: "鳥取県",   regionId: "08" },
        "32": { name: "島根県",   regionId: "08" },
        "37": { name: "香川県",   regionId: "09" }, "39": { name: "高知県",   regionId: "09" },
        "38": { name: "愛媛県",   regionId: "09" }, "36": { name: "徳島県",   regionId: "09" },
        "40": { name: "福岡県",   regionId: "10" }, "41": { name: "佐賀県",   regionId: "10" },
        "42": { name: "長崎県",   regionId: "10" }, "43": { name: "熊本県",   regionId: "10" },
        "44": { name: "大分県",   regionId: "10" }, "46": { name: "鹿児島県", regionId: "10" },
        "45": { name: "宮崎県",   regionId: "10" }, "47": { name: "沖縄県",   regionId: "10" }
    },

    // walkerplusの設定
    walkerplus: {
        baseUrl: 'https://www.walkerplus.com/event_list/',
        // URLのテンプレート。{mmdd}と{areaCode}が後で置換される
        urlTemplate: '{mmdd}/{areaCode}/',
        // エリアコードの接頭辞
        areaCodePrefix: 'ar'
    },

    // 曜日
    dayNames: ['日', '月', '火', '水', '木', '金', '土']
};