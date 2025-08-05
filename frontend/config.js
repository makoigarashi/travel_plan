// =============================================
// アプリケーション設定ファイル (config.js)
// =============================================
const API_ENDPOINTS = {
        // 本番環境（GCS）で使うURL
        production: 'https://geo-api-proxy-160651572780.asia-northeast1.run.app',
        // 開発環境（ローカル）で使うURL
        development: 'http://localhost:8080'
    };

const AppConfig = {
    // 現在の環境（ホスト名）に応じて、使用するAPIエンドポイントを自動で選択
    API_ENDPOINT: (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
                  ? API_ENDPOINTS.development
                  : API_ENDPOINTS.production,

    // デバッグモードのON/OFF
    DEBUG_FLAG: false,

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

    // 都道府県とエリアコードの対応表
    walkerplusAreaCodes: {
        "北海道": "ar0101",
        "青森県": "ar0202", "岩手県": "ar0203", "宮城県": "ar0204", "秋田県": "ar0205", "山形県": "ar0206", "福島県": "ar0207",
        "東京都": "ar0313", "神奈川県": "ar0314", "千葉県": "ar0312", "埼玉県": "ar0311", "群馬県": "ar0310", "栃木県": "ar0309", "茨城県": "ar0308",
        "新潟県": "ar0415", "山梨県": "ar0419", "長野県": "ar0420",
        "石川県": "ar0517", "富山県": "ar0516", "福井県": "ar0518",
        "愛知県": "ar0623", "岐阜県": "ar0621", "三重県": "ar0624", "静岡県": "ar0622",
        "大阪府": "ar0727", "京都府": "ar0726", "兵庫県": "ar0728", "奈良県": "ar0729", "和歌山県": "ar0730", "滋賀県": "ar0725",
        "広島県": "ar0834", "岡山県": "ar0833", "山口県": "ar0835", "鳥取県": "ar0831", "島根県": "ar0832",
        "香川県": "ar0937", "高知県": "ar0939", "愛媛県": "ar0938", "徳島県": "ar0936",
        "福岡県": "ar1040", "佐賀県": "ar1041", "長崎県": "ar1042", "熊本県": "ar1043", "大分県": "ar1044", "鹿児島県": "ar1046", "宮崎県": "ar1045", "沖縄県": "ar1047"    
    },

    geoData: {
        "北海道": { code: "01", walkerCode: "ar0101", region: "北海道" },
        // 東北
        "青森県": { code: "02", walkerCode: "ar0202", region: "東北" },
        "岩手県": { code: "03", walkerCode: "ar0202", region: "東北" },
        "岩手県": { code: "03", walkerCode: "ar0203", region: "東北" },
        "宮城県": { code: "04", walkerCode: "ar0204", region: "東北" },
        "秋田県": { code: "05", walkerCode: "ar0205", region: "東北" },
        "宮城県": { code: "04", walkerCode: "ar0204", region: "東北" },
        "秋田県": { code: "05", walkerCode: "ar0205", region: "東北" },
        "山形県": { code: "06", walkerCode: "ar0206", region: "東北" },
        "福島県": { code: "07", walkerCode: "ar0207", region: "東北" },
        // 関東
        "茨城県": { code: "08", walkerCode: "ar0308", region: "関東" },
        "栃木県": { code: "09", walkerCode: "ar0309", region: "関東" },
        "群馬県": { code: "10", walkerCode: "ar0310", region: "関東" },
        "埼玉県": { code: "11", walkerCode: "ar0311", region: "関東" },
        "千葉県": { code: "12", walkerCode: "ar0312", region: "関東" },
        "東京都": { code: "13", walkerCode: "ar0313", region: "関東" },
        "神奈川県": { code: "14", walkerCode: "ar0314", region: "関東" },
        // 中部
        "新潟県": { code: "15", walkerCode: "ar0415", region: "中部" },
        "富山県": { code: "16", walkerCode: "ar0516", region: "中部" },
        "石川県": { code: "17", walkerCode: "ar0517", region: "中部" },
        "福井県": { code: "18", walkerCode: "ar0518", region: "中部" },
        "山梨県": { code: "19", walkerCode: "ar0419", region: "中部" },
        "長野県": { code: "20", walkerCode: "ar0420", region: "中部" },
        "岐阜県": { code: "21", walkerCode: "ar0621", region: "中部" },
        "静岡県": { code: "22", walkerCode: "ar0622", region: "中部" },
        "愛知県": { code: "23", walkerCode: "ar0623", region: "中部" },
        "三重県": { code: "24", walkerCode: "ar0624", region: "中部" },
        // 近畿
        "滋賀県": { code: "25", walkerCode: "ar0725", region: "近畿" },
        "京都府": { code: "26", walkerCode: "ar0726", region: "近畿" },
        "大阪府": { code: "27", walkerCode: "ar0727", region: "近畿" },
        "兵庫県": { code: "28", walkerCode: "ar0728", region: "近畿" },
        "奈良県": { code: "29", walkerCode: "ar0729", region: "近畿" },
        "和歌山県": { code: "30", walkerCode: "ar0730", region: "近畿" },
        // 中国
        "鳥取県": { code: "31", walkerCode: "ar0831", region: "中国" },
        "島根県": { code: "32", walkerCode: "ar0832", region: "中国" },
        "岡山県": { code: "33", walkerCode: "ar0833", region: "中国" },
        "広島県": { code: "34", walkerCode: "ar0834", region: "中国" },
        "山口県": { code: "35", walkerCode: "ar0835", region: "中国" },
        // 四国
        "徳島県": { code: "36", walkerCode: "ar0936", region: "四国" },
        "香川県": { code: "37", walkerCode: "ar0937", region: "四国" },
        "愛媛県": { code: "38", walkerCode: "ar0938", region: "四国" },
        "高知県": { code: "39", walkerCode: "ar0939", region: "四国" },
        // 九州・沖縄
        "福岡県": { code: "40", walkerCode: "ar1040", region: "九州・沖縄" },
        "佐賀県": { code: "41", walkerCode: "ar1041", region: "九州・沖縄" },
        "長崎県": { code: "42", walkerCode: "ar1042", region: "九州・沖縄" },
        "熊本県": { code: "43", walkerCode: "ar1043", region: "九州・沖縄" },
        "大分県": { code: "44", walkerCode: "ar1044", region: "九州・沖縄" },
        "宮崎県": { code: "45", walkerCode: "ar1045", region: "九州・沖縄" },
        "鹿児島県": { code: "46", walkerCode: "ar1046", region: "九州・沖縄" },
        "沖縄県": { code: "47", walkerCode: "ar1047", region: "九州・沖縄" }
    },

    // ウォーカープラスのベースURL
    walkerplus: {
        baseUrl: 'https://www.walkerplus.com/event_list/'
    },

};