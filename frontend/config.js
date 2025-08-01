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
    ]
};