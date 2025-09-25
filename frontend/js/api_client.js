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

    /**
     * 2地点間のルート情報を取得します。
     * @param {{lat: number, lng: number}} origin - 出発地の緯度経度。
     * @param {{lat: number, lng: number}} destination - 目的地の緯度経度。
     * @param {string} mode - 移動モード (例: 'walking', 'transit')。
     * @returns {Promise<{polyline: string}>} ルートのポリラインを含むPromise。
     */
    function getDirections(origin, destination, mode) {
        return $.ajax({
            url: `${API_ENDPOINT}/api/directions`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ origin, destination, mode })
        });
    }

    // --- History Methods ---
    function getHistories() {
        return $.getJSON(`${API_ENDPOINT}/api/histories`);
    }

    function getHistory(id) {
        return $.getJSON(`${API_ENDPOINT}/api/histories/${id}`);
    }

    function saveHistory(title, markdown) {
        return $.ajax({
            url: `${API_ENDPOINT}/api/histories`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ title, markdown })
        });
    }

    function deleteHistory(id) {
        return $.ajax({
            url: `${API_ENDPOINT}/api/histories/${id}`,
            type: 'DELETE'
        });
    }

    return {
        getPrefectures,
        getCities,
        executeGemini,
        executeMistral,
        getSettings,
        saveSettings,
        geocodeAddress,
        getNearestStationAndWalkTime,
        getDirections,
        getHistories,
        getHistory,
        saveHistory,
        deleteHistory
    };
})();
