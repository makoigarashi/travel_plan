/**
 * @file UI関連のすべての操作を管理します。
 * @author Gemini
 */

const UI = (function() {
    let dayCount = 0;
    let prefectures = {};
    const templates = {};

    // --- Private Functions ---

    function setupTimeSelects($hourSelect, $minuteSelect) {
        for (let i = 0; i < 24; i++) {
            $hourSelect.append(`<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</option>`);
        }
        for (let i = 0; i < 60; i += 5) {
            $minuteSelect.append(`<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</option>`);
        }
    }

    function compareKana(a, b) {
        return a.localeCompare(b, 'ja', { sensitivity: 'base' });
    }

    function categorizeCitiesByKana(cities) {
        const categories = {
            'あ行': [], 'か行': [], 'さ行': [], 'た行': [], 'な行': [],
            'は行': [], 'ま行': [], 'や行': [], 'ら行': [], 'わ行': [], 'その他': []
        };
        cities.forEach(cityData => {
            const firstChar = (cityData.katakana || cityData.name).charAt(0);
            if (/[あ-おア-オ]/.test(firstChar)) categories['あ行'].push(cityData);
            else if (/[か-こカ-コが-ごガ-ゴ]/.test(firstChar)) categories['か行'].push(cityData);
            else if (/[さ-そサ-ソざ-ぞザ-ゾ]/.test(firstChar)) categories['さ行'].push(cityData);
            else if (/[た-とタ-トだ-どダ-ド]/.test(firstChar)) categories['た行'].push(cityData);
            else if (/[な-のナ-ノ]/.test(firstChar)) categories['な行'].push(cityData);
            else if (/[は-ほハ-ホば-ぼバ-ボぱ-ぽパ-ポ]/.test(firstChar)) categories['は行'].push(cityData);
            else if (/[ま-もマ-モ]/.test(firstChar)) categories['ま行'].push(cityData);
            else if (/[やゆよヤユヨ]/.test(firstChar)) categories['や行'].push(cityData);
            else if (/[ら-ろラ-ロ]/.test(firstChar)) categories['ら行'].push(cityData);
            else if (/[わをんワヲン]/.test(firstChar)) categories['わ行'].push(cityData);
            else categories['その他'].push(cityData);
        });
        for (const key in categories) {
            if (categories[key].length === 0) delete categories[key];
            else categories[key].sort((a, b) => compareKana(a.katakana || a.name, b.katakana || b.name));
        }
        return categories;
    }

    // --- Public Methods (defined as an object for internal/external access) ---

    const publicMethods = {
        loadTemplates: function() {
            const templateFiles = {
                dayPlan: 'templates/day-plan.hbs', placeInput: 'templates/place-input.hbs',
                prefectureList: 'templates/prefecture-list.hbs', cityList: 'templates/city-list.hbs',
                markdown: 'templates/markdown.hbs', suggestionMarkdown: 'templates/suggestion-markdown.hbs'
            };
            const promises = Object.entries(templateFiles).map(([name, path]) =>
                $.get(path).done(source => { templates[name] = Handlebars.compile(source); })
            );
            return Promise.all(promises);
        },

        initialize: function(prefs) {
            prefectures = prefs;
            publicMethods.initializePrefectureModal();
            setupTimeSelects($('#outbound-dep-hour'), $('#outbound-dep-minute'));
            setupTimeSelects($('#outbound-arr-hour'), $('#outbound-arr-minute'));
            setupTimeSelects($('#inbound-dep-hour'), $('#inbound-dep-minute'));
            setupTimeSelects($('#inbound-arr-hour'), $('#inbound-arr-minute'));
        },

        initializePrefectureModal: function() {
            const regionsGrouped = {};
            Object.keys(AppConfig.regions).sort((a, b) => parseInt(a) - parseInt(b)).forEach(regionId => {
                regionsGrouped[AppConfig.regions[regionId].name] = [];
            });
            Object.keys(AppConfig.geoData).forEach(prefCode => {
                const prefData = AppConfig.geoData[prefCode];
                regionsGrouped[AppConfig.regions[prefData.regionId].name].push({ name: prefData.name, code: prefCode });
            });
            $('#modal-prefecture-content').html(templates.prefectureList({ regions: regionsGrouped }));
            MicroModal.init();
        },

        initializeCityModal: function(cities) {
            const categorizedCities = categorizeCitiesByKana(cities);
            $('#modal-city-content').html(templates.cityList({ categories: categorizedCities }));
        },

        addDay: function(data = {}) {
            dayCount = $('#days-container .day-plan').length + 1;
            const dayHtml = templates.dayPlan({ dayNumber: dayCount });
            const $newDay = $(dayHtml);

            setupTimeSelects($newDay.find('.day-transport-dep-hour'), $newDay.find('.day-transport-dep-minute'));
            setupTimeSelects($newDay.find('.day-transport-arr-hour'), $newDay.find('.day-transport-arr-minute'));

            const $checkbox = $newDay.find('.day-ai-suggestion-mode');
            if (data.isAiSuggestion) {
                $checkbox.prop('checked', true);
                $newDay.find('.day-manual-inputs').hide();
            } else {
                $checkbox.prop('checked', false);
                $newDay.find('.day-manual-inputs').show();
            }

            // --- Populate new day with data ---
            $newDay.find('.travel-date').val(data.date || '');
            $newDay.find('.accommodation').val(data.accommodation || '');
            $newDay.find('.must-do-eat').val(data.doEat ? data.doEat.join('\n') : '');
            $newDay.find('.day-specific-notes').val(data.notes ? data.notes.join('\n') : '');

            // 都道府県・市町村の復元ロジック
            let restoredPrefCode = data.prefCode;
            if (!restoredPrefCode && data.area) {
                // data.area (都道府県名) から prefCode を検索
                for (const code in AppConfig.geoData) {
                    if (AppConfig.geoData[code].name === data.area) {
                        restoredPrefCode = code;
                        break;
                    }
                }
            }

            if (restoredPrefCode) {
                const $prefButton = $newDay.find('.open-prefecture-modal-btn');
                $prefButton.text(AppConfig.geoData[restoredPrefCode].name).data('pref-code', restoredPrefCode).removeClass('text-gray-500');
                const $cityButton = $newDay.find('.open-city-modal-btn');
                $cityButton.prop('disabled', false).removeClass('text-gray-500');
                if (data.city) {
                    $cityButton.text(data.city).data('city-name', data.city);
                } else {
                    $cityButton.text('市町村を選択').data('city-name', '');
                }
            } else {
                // 都道府県がなければ、両方のボタンをデフォルトに戻す
                $newDay.find('.open-prefecture-modal-btn').text('都道府県を選択').data('pref-code', '').addClass('text-gray-500');
                $newDay.find('.open-city-modal-btn').text('市町村を選択').data('city-name', '').addClass('text-gray-500').prop('disabled', true);
            }

            if (data.transport) {
                // 交通情報が存在する場合、detailsタグを開く
                if (Object.keys(data.transport).length > 0) {
                    $newDay.find(`#day-transport-details-${dayCount}`).prop('open', true);
                }

                $newDay.find('.day-transport-type').val(data.transport.type || '飛行機');
                $newDay.find('.day-transport-name').val(data.transport.name || '');
                $newDay.find('.day-transport-dep-location').val(data.transport.depLocation || '');
                $newDay.find('.day-transport-arr-location').val(data.transport.arrLocation || '');
                if (data.transport.depTime) { const [h,m] = data.transport.depTime.split(':'); $newDay.find('.day-transport-dep-hour').val(h); $newDay.find('.day-transport-dep-minute').val(m); }
                if (data.transport.arrTime) { const [h,m] = data.transport.arrTime.split(':'); $newDay.find('.day-transport-arr-hour').val(h); $newDay.find('.day-transport-arr-minute').val(m); }
            }

            const $placesContainer = $newDay.find('.places-container');
            if (data.places && data.places.length > 0) {
                data.places.forEach(place => publicMethods.addPlace($placesContainer, place));
            } else {
                publicMethods.addPlace($placesContainer);
            }

            $('#days-container').append($newDay);
            publicMethods.updateEventButtonState($newDay);
        },

        addPlace: function($container, placeData = {}) {
            const placeHtml = templates.placeInput({ name: placeData.name || '', url: placeData.url || '' });
            $container.append(placeHtml);
        },

        updateEventButtonState: function($dayDiv) {
            const dateVal = $dayDiv.find('.travel-date').val();
            const prefCode = $dayDiv.find('.open-prefecture-modal-btn').data('pref-code');
            $dayDiv.find('.search-events-btn').prop('disabled', !(dateVal && prefCode));
        },

        populateFormFromData: function(data) {
            if (!data) return;

            // Populate general info
            $('#departure-point').val(data.general?.departure || '');
            $('#members').val(data.general?.members || '');
            $('#priority').val(data.general?.priority || '');
            $('#theme').val(data.general?.theme || '');

            // 基本情報の往路・復路の交通情報復元ロジックを修正
            if (data.general?.transport) {
                const { outbound, inbound } = data.general.transport;

                // 交通情報が存在する場合、detailsタグを開く
                if (Object.keys(outbound || {}).length > 0 || Object.keys(inbound || {}).length > 0) {
                    $('#general-transport-details').prop('open', true);
                }

                // outboundが存在しない場合でも、空のオブジェクトとして扱う
                const actualOutbound = outbound || {};
                $('#outbound-transport-type').val(actualOutbound.type || '飛行機');
                $('#outbound-transport-name').val(actualOutbound.name || '');
                $('#outbound-dep-location').val(actualOutbound.depLocation || '');
                $('#outbound-arr-location').val(actualOutbound.arrLocation || '');
                if(actualOutbound.depTime) { const [h,m] = actualOutbound.depTime.split(':'); $('#outbound-dep-hour').val(h); $('#outbound-dep-minute').val(m); }
                else { $('#outbound-dep-hour').val(''); $('#outbound-dep-minute').val(''); }
                if(actualOutbound.arrTime) { const [h,m] = actualOutbound.arrTime.split(':'); $('#outbound-arr-hour').val(h); $('#outbound-arr-minute').val(m); }
                else { $('#outbound-arr-hour').val(''); $('#outbound-arr-minute').val(''); }

                // inboundが存在しない場合でも、空のオブジェクトとして扱う
                const actualInbound = inbound || {};
                $('#inbound-transport-type').val(actualInbound.type || '飛行機');
                $('#inbound-transport-name').val(actualInbound.name || '');
                $('#inbound-dep-location').val(actualInbound.depLocation || '');
                $('#inbound-arr-location').val(actualInbound.arrLocation || '');
                if(actualInbound.depTime) { const [h,m] = actualInbound.depTime.split(':'); $('#inbound-dep-hour').val(h); $('#inbound-dep-minute').val(m); }
                else { $('#inbound-dep-hour').val(''); $('#inbound-dep-minute').val(''); }
                if(actualInbound.arrTime) { const [h,m] = actualInbound.arrTime.split(':'); $('#inbound-arr-hour').val(h); $('#inbound-arr-minute').val(m); }
                else { $('#inbound-arr-hour').val(''); $('#inbound-arr-minute').val(''); }
            }

            // Populate days
            $('#days-container').empty();
            dayCount = 0;
            if (data.days && data.days.length > 0) {
                data.days.forEach(dayData => publicMethods.addDay(dayData));
            } else {
                publicMethods.addDay(); // Add one empty day if none exists
            }

            // AI提案モードのフォーム項目を復元
            if (data.isSuggestionMode && data.suggestion) {
                $('#arrival-point').val(data.suggestion.arrivalPoint || '');
                $('#trip-start-date').val(data.suggestion.startDate || '');
                $('#trip-end-date').val(data.suggestion.endDate || '');
                $('#trip-remarks').val(data.suggestion.remarks ? data.suggestion.remarks.join('\n') : '');
            }

            $('#ai-suggestion-mode').prop('checked', data.isSuggestionMode || false).trigger('change');
        },

        showStatusMessage: function(message) {
            $('#save-status').text(message).fadeIn().delay(3000).fadeOut();
        },

        getPrefectures: () => prefectures,
        getTemplates: () => templates
    };

    return publicMethods;
})();