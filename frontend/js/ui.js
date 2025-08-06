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
                // 市区町村も復元
                $prefButton.trigger('city-select-init', [data.prefCode, data.city]);
            }
        } else if (data.area) { // 旧データ形式（area名のみ）への後方互換性
             const prefEntry = Object.entries(prefectures).find(([code, name]) => name === data.area);
             if(prefEntry) {
                const prefCode = prefEntry[0];
                const prefName = prefEntry[1];
                const $prefButton = $newDay.find('.open-prefecture-modal-btn');
                $prefButton.text(prefName).data('pref-code', prefCode).removeClass('text-gray-500');
                $prefButton.trigger('city-select-init', [prefCode, data.city]);
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

    function addPlace($container, placeData = {}) {
        const placeHtml = placeTemplate({ name: placeData.name || '', url: placeData.url || '' });
        $container.append(placeHtml);
    }

    function updateEventButtonState($dayDiv) {
        const dateVal = $dayDiv.find('.travel-date').val();
        const prefCode = $dayDiv.find('.open-prefecture-modal-btn').data('pref-code');
        const $button = $dayDiv.find('.search-events-btn');
        if (dateVal && prefCode) {
            $button.prop('disabled', false);
        } else {
            $button.prop('disabled', true);
        }
    }

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
            $('#trip-keywords').val(data.suggestion?.keywords || '');
            $('#trip-remarks').val(data.suggestion?.remarks || '');
            // 通常モードのテーマはクリア
            $('#theme').val('');
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
    }

    function showStatusMessage(message) {
        $('#save-status').text(message).fadeIn().delay(3000).fadeOut();
    }

    function showImportStatusMessage(message) {
        $('#import-status').text(message).fadeIn().delay(3000).fadeOut();
    }

    function showMarkdownStatusMessage(message) {
        $('#markdown-status').text(message).fadeIn().delay(3000).fadeOut();
    }

    function displayLoadedMarkdown(markdown) {
        const $outputTextarea = $('#output-markdown');
        $outputTextarea.val(markdown);
        $('#output-area').slideDown();
        $outputTextarea.css('height', 'auto').css('height', $outputTextarea.prop('scrollHeight') + 'px');
        showMarkdownStatusMessage('以前生成したプロンプトを復元しました。');
    }

    return {
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
        getPrefectures: () => prefectures
    };
})();