/**
 * @file 旅行プランジェネレーターのデータ操作を管理します。
 * @author Gemini
 */

const DATA_MANAGER = (function() {
    const MARKDOWN_STORAGE_KEY = 'travelPromptMarkdownOutput';

    /**
     * 時・分プルダウンから時刻文字列を組み立てます。
     * @param {jQuery} $hourSelect - 時間のselect要素。
     * @param {jQuery} $minuteSelect - 分のselect要素。
     * @returns {string} "HH:mm" 形式の文字列、または空文字列。
     */
    function getTimeFromSelects($hourSelect, $minuteSelect) {
        const hour = $hourSelect.val();
        const minute = $minuteSelect.val();
        return (hour && minute) ? `${hour}:${minute}` : '';
    }

    /**
     * 現在のフォーム入力内容を取得します。
     * @returns {object} 現在のフォームデータを格納したオブジェクト。
     */
    function getCurrentFormData() {
        const data = { general: { transport: {} }, days: [] };

        data.general.departure = $('#departure-point').val();
        data.general.members = $('#members').val();
        data.general.theme = $('#theme').val() || $('#theme').attr('placeholder');
        data.general.priority = $('#priority').val() || $('#priority').attr('placeholder');

        data.general.transport.outbound = {
            type: $('#outbound-transport-type').val(),
            name: $('#outbound-transport-name').val(),
            depLocation: $('#outbound-dep-location').val(),
            depTime: getTimeFromSelects($('#outbound-dep-hour'), $('#outbound-dep-minute')),
            arrLocation: $('#outbound-arr-location').val(),
            arrTime: getTimeFromSelects($('#outbound-arr-hour'), $('#outbound-arr-minute')),
        };
        data.general.transport.inbound = {
            type: $('#inbound-transport-type').val(),
            name: $('#inbound-transport-name').val(),
            depLocation: $('#inbound-dep-location').val(),
            depTime: getTimeFromSelects($('#inbound-dep-hour'), $('#inbound-dep-minute')),
            arrLocation: $('#inbound-arr-location').val(),
            arrTime: getTimeFromSelects($('#inbound-arr-hour'), $('#inbound-arr-minute')),
        };

        $('.day-plan').each(function(){
            const $dayDiv = $(this);
            const dayTransportType = $dayDiv.find('.day-transport-type').val();
            const dayData = {
                isAiSuggestion: $dayDiv.find('.day-ai-suggestion-mode').is(':checked'),
                date: $dayDiv.find('.travel-date').val(),
                prefCode: $dayDiv.find('.open-prefecture-modal-btn').data('pref-code'),
                area: $dayDiv.find('.open-prefecture-modal-btn').text(),
                city: $dayDiv.find('.open-city-modal-btn').data('city-name'),
                accommodation: $dayDiv.find('.accommodation').val(),
                transport: {}, // Initialize as empty
                places: [],
                doEat: $dayDiv.find('.must-do-eat').val().trim().split('\n').filter(Boolean),
                notes: $dayDiv.find('.day-specific-notes').val().trim().split('\n').filter(Boolean)
            };

            if (dayTransportType) {
                dayData.transport = {
                    type: dayTransportType,
                    name: $dayDiv.find('.day-transport-name').val(),
                    depLocation: $dayDiv.find('.day-transport-dep-location').val(),
                    depTime: getTimeFromSelects($dayDiv.find('.day-transport-dep-hour'), $dayDiv.find('.day-transport-dep-minute')),
                    arrLocation: $dayDiv.find('.day-transport-arr-location').val(),
                    arrTime: getTimeFromSelects($dayDiv.find('.day-transport-arr-hour'), $dayDiv.find('.day-transport-arr-minute')),
                };
            }

            $dayDiv.find('.places-container .dynamic-input-group').each(function(){
                const name = $(this).find('.place-name').val().trim();
                const url = $(this).find('.place-url').val().trim();
                if (name) dayData.places.push({ name: name, url: url });
            });

            data.days.push(dayData);
        });

        console.log('DATA_MANAGER: Collected form data:', data); // デバッグログ追加
        return data;
    }

    return {
        getCurrentFormData: getCurrentFormData,
        saveMarkdown: (markdown) => localStorage.setItem(MARKDOWN_STORAGE_KEY, markdown),
        loadMarkdown: () => localStorage.getItem(MARKDOWN_STORAGE_KEY),
        deleteMarkdown: () => localStorage.removeItem(MARKDOWN_STORAGE_KEY)
    };
})();