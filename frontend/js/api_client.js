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

    /**
     * 指定されたプロンプトをMistral AI APIに送信して結果を取得します。
     * @param {string} prompt - Mistralに送信するプロンプト文字列。
     * @returns {Promise<object>} Mistral AI APIからのレスポンスを含むPromise。
     */
    function executeMistral(prompt) {
        return $.ajax({
            url: `${API_ENDPOINT}?api=mistral`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt })
        });
    }

    /**
     * データベースから設定を取得します。
     * @returns {Promise<object>} 設定オブジェクトを含むPromise。
     */
    function getSettings() {
        return $.getJSON(`${API_ENDPOINT}/api/settings`);
    }

    /**
     * 設定をデータベースに保存します。
     * @param {object} settings - 保存する設定オブジェクト。
     * @returns {Promise<object>} 保存結果を含むPromise。
     */
    function saveSettings(settings) {
        return $.ajax({
            url: `${API_ENDPOINT}/api/settings`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(settings)
        });
    }

    /**
     * 住所をジオコーディングし、緯度経度と整形された住所を返します。
     * @param {string} address - ジオコーディングする住所または場所名。
     * @returns {Promise<{lat: number, lng: number, formattedAddress: string}>} 緯度経度と整形された住所。
     */
    function geocodeAddress(address) {
        return $.ajax({
            url: `${API_ENDPOINT}/api/geocode`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ address: address })
        });
    }

    /**
     * 指定された場所の最寄駅とそこからの徒歩時間を取得します。
     * @param {number} lat - 目的地の緯度。
     * @param {number} lng - 目的地の経度。
     * @returns {Promise<{stationName: string, walkTimeMinutes: number}>} 最寄駅名と徒歩時間（分）。
     */
    function getNearestStationAndWalkTime(lat, lng) {
        return $.ajax({
            url: `${API_ENDPOINT}/api/nearest-station`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ lat: lat, lng: lng })
        });
    }

    return {
        getPrefectures: getPrefectures,
        getCities: getCities,
        executeGemini: executeGemini,
        executeMistral: executeMistral, // 追加
        getSettings: getSettings,
        saveSettings: saveSettings,
        geocodeAddress: geocodeAddress,
        getNearestStationAndWalkTime: getNearestStationAndWalkTime
    };
})();
