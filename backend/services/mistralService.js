const Mistral = require('@mistralai/mistralai');

let mistralClient;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL_NAME = 'mistral-small-latest'; // コストと性能のバランスが良いモデル

/**
 * Mistral AI APIクライアントを初期化します。
 */
function initializeMistral() {
    if (MISTRAL_API_KEY) {
        // ドキュメントに基づき、APIキーを渡してインスタンス化
        mistralClient = new Mistral.Mistral({ apiKey: MISTRAL_API_KEY });
        console.log('Mistral AI client initialized.');
    } else {
        console.warn('WARNING: MISTRAL_API_KEY is not set. Mistral AI related features will be disabled.');
    }
}

/**
 * Mistral AI APIにプロンプトを送信し、結果を返します。
 * @param {string} prompt - Mistralに送信するプロンプト文字列。
 * @returns {Promise<string>} Mistral AI APIからのテキスト応答。
 */
async function generateContent(prompt) {
    if (!mistralClient) {
        throw new Error('Mistral AI is not available. MISTRAL_API_KEY might not be set.');
    }
    // ドキュメントに基づき、`chat.complete` メソッドを使用
    const chatResponse = await mistralClient.chat.complete({
        model: MISTRAL_MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
    });

    if (chatResponse.choices && chatResponse.choices.length > 0) {
        return chatResponse.choices[0].message.content;
    } else {
        throw new Error('No response received from Mistral AI.');
    }
}

module.exports = {
    initializeMistral,
    generateContent
};