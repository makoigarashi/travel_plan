const { GoogleGenerativeAI } = require('@google/generative-ai');

let geminiModel;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Gemini APIクライアントを初期化します。
 */
const GEMINI_MODEL_NAME = 'gemini-2.5-flash'; // 追加

function initializeGemini() {
    if (GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME }); // 定数を使用
        console.log('Gemini API client initialized.');
    } else {
        console.warn('WARNING: GEMINI_API_KEY is not set. Gemini related features will be disabled.');
    }
}

/**
 * Gemini APIにプロンプトを送信し、結果を返します。
 * @param {string} prompt - Geminiに送信するプロンプト文字列。
 * @returns {Promise<string>} Gemini APIからのテキスト応答。
 */
async function generateContent(prompt) {
    if (!geminiModel) {
        throw new Error('Gemini API is not available. GEMINI_API_KEY might not be set.');
    }
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

module.exports = {
    initializeGemini,
    generateContent
};