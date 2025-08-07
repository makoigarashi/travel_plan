/**
 * @file UI関連のすべての操作を管理します。
 * @author Gemini
 */

// =============================================
// UI操作レイヤー (ui.js)
// 役割：DOM操作、テンプレートの適用、UIイベントに応じた画面更新など、表示に関するすべてを担当します。
// =============================================
const UI = (function() {
    let dayCount = 0;
    let prefectures = {};

    const dayTemplate = Handlebars.compile($('#day-plan-template').html());
    const placeTemplate = Handlebars.compile($('#place-input-template').html());
    const prefectureListTemplate = Handlebars.compile($('#prefecture-list-template').html());
    const cityListTemplate = Handlebars.compile($('#city-list-template').html());

    /**
     * 新しい日付プランのセクションをUIに追加します。
     * @param {object} [data={}] - 新しい日付のフィールドに移入するオプションのデータ。
     */
    function addDay(data = {}) {
        dayCount = $('#days-container .day-plan').length + 1;
        const context = { dayNumber: dayCount };
        const dayHtml = dayTemplate(context);
        const $newDay = $(dayHtml);

        $newDay.find('.travel-date').val(data.date || '');
        if(data.prefCode) { // prefCodeを使って復元
            const prefName = prefectures[data.prefCode];
            if (prefName) {
                const $prefButton = $newDay.find('.open-prefecture-modal-btn');
                $prefButton.text(prefName).data('pref-code', data.prefCode).removeClass('text-gray-500');
                // 市町村ボタンを有効化して復元
                const $cityButton = $newDay.find('.open-city-modal-btn');
                $cityButton.prop('disabled', false).removeClass('text-gray-500');
                if (data.city) {
                    $cityButton.text(data.city).data('city-name', data.city);
                }
            }
        } else if (data.area) { // 旧データ形式（area名のみ）への後方互換性
             const prefEntry = Object.entries(prefectures).find(([code, name]) => name === data.area);
             if(prefEntry) {
                const prefCode = prefEntry[0];
                const prefName = prefEntry[1];
                const $prefButton = $newDay.find('.open-prefecture-modal-btn');
                $prefButton.text(prefName).data('pref-code', prefCode).removeClass('text-gray-500');
                // 市町村ボタンを有効化して復元
                const $cityButton = $newDay.find('.open-city-modal-btn');
                $cityButton.prop('disabled', false).removeClass('text-gray-500');
                if (data.city) {
                    $cityButton.text(data.city).data('city-name', data.city);
                }
             }
        }


        $newDay.find('.accommodation').val(data.accommodation || '');
        $newDay.find('.must-do-eat').val(data.doEat ? data.doEat.join('\n') : '');
        $newDay.find('.day-specific-notes').val(data.notes ? data.notes.join('\n') : '');

        const $placesContainer = $newDay.find('.places-container');
        if (data.places && data.places.length > 0) {
            data.places.forEach(place => addPlace($placesContainer, place));
        } else {
            addPlace($placesContainer);
        }

        $('#days-container').append($newDay);
        updateEventButtonState($newDay);
    }

    /**
     * 日付プランに新しい場所の入力フィールドを追加します。
     * @param {jQuery} $container - 新しい場所の入力が追加されるコンテナ。
     * @param {object} [placeData={}] - 場所のフィールドに移入するオプションのデータ。
     */
    function addPlace($container, placeData = {}) {
        const placeHtml = placeTemplate({ name: placeData.name || '', url: placeData.url || '' });
        $container.append(placeHtml);
    }

    /**
     * 入力補完に基づいて「イベントを検索」ボタンの状態を更新します。
     * @param {jQuery} $dayDiv - 日付プランコンテナのjQueryオブジェクト。
     */
    function updateEventButtonState($dayDiv) {
        const dateVal = $dayDiv.find('.travel-date').val();
        const prefCode = $dayDiv.find('.open-prefecture-modal-btn').data('pref-code');
        const $button = $dayDiv.find('.search-events-btn');
        if (dateVal && prefCode) {
            $button.prop('disabled', false);
        }
        else {
            $button.prop('disabled', true);
        }
    }

    /**
     * 文字列の50音順ソート用コンパレータ関数。
     * @param {string} a - 比較する文字列A。
     * @param {string} b - 比較する文字列B。
     * @returns {number} ソート結果。
     */
    function compareKana(a, b) {
        return a.localeCompare(b, 'ja', { sensitivity: 'base' });
    }

    /**
     * 市町村データをカタカナ読みによる50音順カテゴリ（あ行・か行など）で分類します。
     * @param {Array} cities - 市町村データの配列（{name, katakana}オブジェクト）。
     * @returns {object} カテゴリ別に分類されたオブジェクト。
     */
    function categorizeCitiesByKana(cities) {
        const categories = {
            'あ行': [],
            'か行': [],
            'さ行': [],
            'た行': [],
            'な行': [],
            'は行': [],
            'ま行': [],
            'や行': [],
            'ら行': [],
            'わ行': [],
            'その他': []
        };

        cities.forEach(cityData => {
            // カタカナ読みがあればそれを使用、なければ市町村名で判定
            const readingText = cityData.katakana || cityData.name;
            const firstChar = readingText.charAt(0);
            
            if (/[あ-おア-オ]/.test(firstChar)) {
                categories['あ行'].push(cityData);
            } else if (/[か-こカ-コが-ごガ-ゴ]/.test(firstChar)) {
                categories['か行'].push(cityData);
            } else if (/[さ-そサ-ソざ-ぞザ-ゾ]/.test(firstChar)) {
                categories['さ行'].push(cityData);
            } else if (/[た-とタ-トだ-どダ-ド]/.test(firstChar)) {
                categories['た行'].push(cityData);
            } else if (/[な-のナ-ノ]/.test(firstChar)) {
                categories['な行'].push(cityData);
            } else if (/[は-ほハ-ホば-ぼバ-ボぱ-ぽパ-ポ]/.test(firstChar)) {
                categories['は行'].push(cityData);
            } else if (/[ま-もマ-モ]/.test(firstChar)) {
                categories['ま行'].push(cityData);
            } else if (/[やゆよヤユヨ]/.test(firstChar)) {
                categories['や行'].push(cityData);
            } else if (/[ら-ろラ-ロ]/.test(firstChar)) {
                categories['ら行'].push(cityData);
            } else if (/[わをんワヲン]/.test(firstChar)) {
                categories['わ行'].push(cityData);
            } else {
                categories['その他'].push(cityData);
            }
        });

        // 各カテゴリ内でカタカナ読みでソート
        Object.keys(categories).forEach(key => {
            categories[key].sort((a, b) => {
                const aReading = a.katakana || a.name;
                const bReading = b.katakana || b.name;
                return compareKana(aReading, bReading);
            });
        });

        // 空のカテゴリを削除
        Object.keys(categories).forEach(key => {
            if (categories[key].length === 0) {
                delete categories[key];
            }
        });

        return categories;
    }

    /**
     * 市町村選択モーダルをデータで初期化します。
     * @param {Array} cities - 市町村配列。
     */
    function initializeCityModal(cities) {
        // 50音順カテゴリ別に分類
        const categorizedCities = categorizeCitiesByKana(cities);
        const modalContentHtml = cityListTemplate({ categories: categorizedCities });
        $('#modal-city-content').html(modalContentHtml);
    }

    /**
     * 都道府県選択モーダルをデータで初期化します。
     */
    function initializePrefectureModal() {
        const regionsGrouped = {};
        Object.keys(AppConfig.regions).sort((a, b) => parseInt(a) - parseInt(b)).forEach(regionId => {
            const regionName = AppConfig.regions[regionId].name;
            regionsGrouped[regionName] = [];
        });
        Object.keys(AppConfig.geoData).forEach(prefCode => {
            const prefData = AppConfig.geoData[prefCode];
            const regionId = prefData.regionId;
            const regionName = AppConfig.regions[regionId].name;
            if (regionsGrouped[regionName]) {
                regionsGrouped[regionName].push({ name: prefData.name, code: prefCode });
            }
        });
        const modalContentHtml = prefectureListTemplate({ regions: regionsGrouped });
        $('#modal-prefecture-content').html(modalContentHtml);
        MicroModal.init();
    }

    /**
     * 指定されたデータオブジェクトからフォーム全体に移入します。
     * @param {object} data - フォームに移入するデータオブジェクト。
     */
    function populateFormFromData(data) {
        if (!data) return;

        // 共通の基本情報を設定
        $('#departure-point').val(data.general?.departure || '');
        $('#members').val(data.general?.members || '');
        $('#priority').val(data.general?.priority || '');

        if (data.isSuggestionMode) {
            // AI提案モードのフォーム項目を設定
            $('#ai-suggestion-mode').prop('checked', true).trigger('change'); // UIの表示切替もトリガー
            $('#arrival-point').val(data.suggestion?.arrivalPoint || '');
            $('#trip-start-date').val(data.suggestion?.startDate || '');
            $('#trip-end-date').val(data.suggestion?.endDate || '');
            $('#trip-remarks').val(Array.isArray(data.suggestion?.remarks) ? data.suggestion.remarks.join('\n') : '');
            // AI提案モードではテーマをクリアせず、パースされた値を設定
            $('#theme').val(data.general?.theme || '');
        } else {
            // 通常モードのフォーム項目を設定
            $('#ai-suggestion-mode').prop('checked', false).trigger('change');
            $('#theme').val(data.general?.theme || '');

            $('#days-container').empty();
            dayCount = 0;
            if(data.days && data.days.length > 0) {
                data.days.forEach(dayData => addDay(dayData));
            } else {
                addDay(); // データがない場合は空の1日を追加
            }
        }
        // AI提案モードの表示状態を確実に更新
        $('#ai-suggestion-mode').trigger('change');
    }

    /**
     * 数秒後にフェードアウトするステータスメッセージを表示します。
     * @param {string} message - 表示するメッセージ。
     */
    function showStatusMessage(message) {
        $('#save-status').text(message).fadeIn().delay(3000).fadeOut();
    }

    /**
     * インポート関連のステータスメッセージを表示します。
     * @param {string} message - 表示するメッセージ。
     */
    function showImportStatusMessage(message) {
        $('#import-status').text(message).fadeIn().delay(3000).fadeOut();
    }

    /**
     * Markdown関連のステータスメッセージを表示します。
     * @param {string} message - 表示するメッセージ。
     */
    function showMarkdownStatusMessage(message) {
        $('#markdown-status').text(message).fadeIn().delay(3000).fadeOut();
    }

    /**
     * 読み込まれたマークダウンを出力テキストエリアに表示します。
     * @param {string} markdown - 表示するマークダウンコンテンツ。
     */
    function displayLoadedMarkdown(markdown) {
        const $outputTextarea = $('#output-markdown');
        $outputTextarea.val(markdown);
        $('#output-area').slideDown();
        $outputTextarea.css('height', 'auto').css('height', $outputTextarea.prop('scrollHeight') + 'px');
        showMarkdownStatusMessage('以前生成したプロンプトを復元しました。');
    }

    return {
        /**
         * UIモジュールを初期化します。
         * @param {object} prefs - 都道府県データ。
         */
        initialize: function(prefs) {
            prefectures = prefs;
            initializePrefectureModal();
            // ★起動時の自動読み込み処理はmain.jsに集約されたため、ここでは単純に初期の1日を追加するだけにする
            addDay();
        },
        addDay: addDay,
        addPlace: addPlace,
        updateEventButtonState: updateEventButtonState,
        populateFormFromData: populateFormFromData,
        showStatusMessage: showStatusMessage,
        showImportStatusMessage: showImportStatusMessage,
        showMarkdownStatusMessage: showMarkdownStatusMessage,
        displayLoadedMarkdown: displayLoadedMarkdown,
        initializeCityModal: initializeCityModal,
        /**
         * 都道府県オブジェクトを取得します。
         * @returns {object} 都道府県オブジェクト。
         */
        getPrefectures: () => prefectures
    };
})();