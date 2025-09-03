/**
 * @file APIクライアントモジュールです。
 * @author Gemini
 */

const API_CLIENT = (function() {
    const API_ENDPOINT = AppConfig.API_ENDPOINT;

    /**
     * 都道府県リストを取得します。
     * @returns {Promise<object>} 都道府県リストを含むPromise。
     */
    function getPrefectures() {
        return $.getJSON(`${API_ENDPOINT}?api=prefectures`);
    }

    /**
     * 指定された都道府県の市区町村リストを取得します。
     * @param {string} prefCode - 都道府県コード。
     * @returns {Promise<Array>} 市区町村リストを含むPromise。
     */
    function getCities(prefCode) {
        return $.getJSON(`${API_ENDPOINT}?api=cities&prefCode=${prefCode}`);
    }

    /**
     * 指定されたプロンプトをGemini APIに送信して結果を取得します。
     * @param {string} prompt - Geminiに送信するプロンプト文字列。
     * @returns {Promise<object>} Gemini APIからのレスポンスを含むPromise。
     */
    function executeGemini(prompt) {
        return $.ajax({
            url: `${API_ENDPOINT}?api=gemini`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt })
        });
    }

    return {
        getPrefectures: getPrefectures,
        getCities: getCities,
        executeGemini: executeGemini
    };
})();