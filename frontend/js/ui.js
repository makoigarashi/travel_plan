/**
 * @file UI関連のすべての操作を管理します。
 * @author Gemini
 */

const UI = (function() {
    let dayCount = 0;
    let prefectures = {};
    const templates = {};
    const maps = {}; // 各日の地図インスタンスを保持
    const markers = {}; // 各日のマーカーを保持
    const polylines = {}; // 各日のルート(ポリライン)を保持

    // --- Private Functions ---

    function decodePolyline(encoded) {
        if (!encoded) return [];
        let points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;
        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            points.push([lat / 1e5, lng / 1e5]);
        }
        return points;
    }

    function setupTimeSelects($hourSelect, $minuteSelect) {
        $hourSelect.empty().append('<option value="">--</option>');
        $minuteSelect.empty().append('<option value="">--</option>');
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

    const publicMethods = {
        loadTemplates: function() {
            const templateFiles = {
                dayPlan: 'templates/day-plan.hbs',
                placeInput: 'templates/place-input.hbs',
                prefectureList: 'templates/prefecture-list.hbs',
                cityList: 'templates/city-list.hbs',
                themeSelection: 'templates/theme-selection.hbs',
                markdown: 'templates/markdown.hbs',
                suggestionMarkdown: 'templates/suggestion-markdown.hbs',
                historyList: 'templates/history-list.hbs'
            };
            const partialFiles = {
                proactiveSuggestionPartial: 'templates/_proactive-suggestion-partial.hbs',
                aiInstructionPartial: 'templates/_ai-instruction-partial.hbs'
            };
            const partialPromises = Object.entries(partialFiles).map(([name, path]) =>
                $.get(path).done(source => { Handlebars.registerPartial(name, source); })
            );
            const templatePromises = Object.entries(templateFiles).map(([name, path]) =>
                $.get(path).done(source => { templates[name] = Handlebars.compile(source); })
            );
            return Promise.all([...partialPromises, ...templatePromises]);
        },

        initialize: function(prefs) {
            prefectures = prefs;
            publicMethods.initializePrefectureModal();
            publicMethods.initializeThemeModal();
            publicMethods.initializeMaps();
            setupTimeSelects($('#outbound-dep-hour'), $('#outbound-dep-minute'));
            setupTimeSelects($('#outbound-arr-hour'), $('#outbound-arr-minute'));
            setupTimeSelects($('#inbound-dep-hour'), $('#inbound-dep-minute'));
            setupTimeSelects($('#inbound-arr-hour'), $('#inbound-arr-minute'));
        },

        applyInitialSettings: function() {
            $('#departure-point').val(AppConfig.defaultValues.departure);
            $('#members').val(AppConfig.defaultValues.members);
            $('#theme').attr('placeholder', AppConfig.defaultValues.theme);
            $('#priority').attr('placeholder', AppConfig.defaultValues.priority);
        },

        initializeMaps: function() {
            for (const dayNum in maps) {
                if (maps[dayNum]) {
                    maps[dayNum].remove();
                    maps[dayNum] = null;
                }
            }
            for (const dayNum in markers) {
                if (markers[dayNum]) {
                    markers[dayNum].forEach(marker => marker.remove());
                    markers[dayNum] = null;
                }
            }
            $('.day-map').each(function() {
                const dayNum = $(this).attr('id').replace('map-day-', '');
                const mapId = `map-day-${dayNum}`;
                const map = L.map(mapId, { zoomControl: false }).setView([35.681236, 139.767125], 5);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);
                maps[dayNum] = map;
                markers[dayNum] = [];
            });
        },

        initializeSettingsModal: function(settings) {
            const modalContent = `
                <div class="border-b border-gray-200">
                    <nav class=" -mb-px flex space-x-8" aria-label="Tabs">
                        <button class="settings-tab-btn border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="general">基本設定</button>
                        <button class="settings-tab-btn border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="themes">目的カスタマイズ</button>
                    </nav>
                </div>
                <div id="settings-tab-content-general" class="settings-tab-content mt-4 space-y-4">
                    <div>
                        <label for="settings-departure-point" class="block text-sm font-medium text-gray-700">出発地の初期値</label>
                        <input type="text" id="settings-departure-point" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" value="${settings.defaultValues.departure}">
                    </div>
                    <div>
                        <label for="settings-members" class="block text-sm font-medium text-gray-700">メンバー構成の初期値</label>
                        <input type="text" id="settings-members" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" value="${settings.defaultValues.members}">
                    </div>
                    <div>
                        <label for="settings-theme" class="block text-sm font-medium text-gray-700">旅のテーマのプレースホルダー</label>
                        <input type="text" id="settings-theme" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" value="${settings.defaultValues.theme}">
                    </div>
                    <div>
                        <label for="settings-priority" class="block text-sm font-medium text-gray-700">最優先事項のプレースホルダー</label>
                        <input type="text" id="settings-priority" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" value="${settings.defaultValues.priority}">
                    </div>
                </div>
                <div id="settings-tab-content-themes" class="settings-tab-content mt-4 space-y-4" style="display: none;">
                    <div id="theme-editor-container"></div>
                    <button type="button" id="add-theme-category-btn" class="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">カテゴリを追加</button>
                </div>
            `;
            $('#modal-settings-content').html(modalContent);
            publicMethods.renderThemeEditor(settings.themes);

            $('.settings-tab-btn').on('click', function() {
                const tab = $(this).data('tab');
                $('.settings-tab-btn').removeClass('border-blue-500 text-blue-600').addClass('border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300');
                $(this).addClass('border-blue-500 text-blue-600').removeClass('border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300');
                $('.settings-tab-content').hide();
                $(`#settings-tab-content-${tab}`).show();
            });
        },

        renderThemeEditor: function(themes) {
            const container = $('#theme-editor-container');
            container.empty();
            for (const category in themes) {
                const categoryId = `theme-category-${category.replace(/\s/g, '-')}`;
                const categoryHtml = `
                    <div class="p-4 border rounded-lg mb-4" data-category="${category}">
                        <div class="flex items-center mb-2">
                            <input type="text" value="${category}" class="theme-category-name text-lg font-bold flex-grow border-b-2 p-1">
                            <button type="button" class="remove-theme-category-btn ml-4 text-red-500 hover:text-red-700">✕ 削除</button>
                        </div>
                        <div class="theme-items-container space-y-2 pl-4">
                            ${themes[category].map(item => `
                                <div class="flex items-center gap-2 theme-item" data-id="${item.id}">
                                    <input type="text" value="${item.icon}" class="theme-item-icon w-12 p-1 border rounded-md">
                                    <input type="text" value="${item.name}" class="theme-item-name flex-grow p-1 border rounded-md">
                                    <button type="button" class="remove-theme-item-btn text-red-500 hover:text-red-700">-</button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="add-theme-item-btn mt-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold py-1 px-3 rounded-lg">+ 項目追加</button>
                    </div>
                `;
                container.append(categoryHtml);
            }
            $('#add-theme-category-btn').off('click').on('click', () => {
                const newCategoryName = prompt('新しいカテゴリ名を入力してください:');
                if (newCategoryName && !themes[newCategoryName]) {
                    themes[newCategoryName] = [];
                    publicMethods.renderThemeEditor(themes);
                }
            });
            container.find('.remove-theme-category-btn').off('click').on('click', function() {
                const category = $(this).closest('[data-category]').data('category');
                if (confirm(`カテゴリ「${category}」を削除しますか？`)) {
                    delete themes[category];
                    publicMethods.renderThemeEditor(themes);
                }
            });
            container.find('.add-theme-item-btn').off('click').on('click', function() {
                const category = $(this).closest('[data-category]').data('category');
                themes[category].push({ id: `new-theme-${Date.now()}`, name: '新しい目的', icon: '📝' });
                publicMethods.renderThemeEditor(themes);
            });
            container.find('.remove-theme-item-btn').off('click').on('click', function() {
                const category = $(this).closest('[data-category]').data('category');
                const itemId = $(this).closest('.theme-item').data('id');
                themes[category] = themes[category].filter(item => item.id !== itemId);
                publicMethods.renderThemeEditor(themes);
            });
        },

        getSettingsFromModal: function() {
            const newDefaultValues = {
                departure: $('#settings-departure-point').val(),
                members: $('#settings-members').val(),
                theme: $('#settings-theme').val(),
                priority: $('#settings-priority').val(),
            };
            const newThemes = {};
            $('#theme-editor-container [data-category]').each(function() {
                const oldCategoryName = $(this).data('category');
                const newCategoryName = $(this).find('.theme-category-name').val();
                if (!newCategoryName) return;
                newThemes[newCategoryName] = [];
                $(this).find('.theme-item').each(function() {
                    const id = $(this).data('id');
                    const icon = $(this).find('.theme-item-icon').val();
                    const name = $(this).find('.theme-item-name').val();
                    if (name) {
                        newThemes[newCategoryName].push({ id, icon, name });
                    }
                });
            });
            return { defaultValues: newDefaultValues, themes: newThemes };
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
        },

        initializeCityModal: function(cities) {
            const categorizedCities = categorizeCitiesByKana(cities);
            $('#modal-city-content').html(templates.cityList({ categories: categorizedCities }));
        },

        initializeThemeModal: function() {
            if (templates.themeSelection) {
                const modalContentHtml = templates.themeSelection({ themes: AppConfig.themes });
                $('#modal-theme-content').html(modalContentHtml);
            }
        },

        updateThemeModalButtonStates: function(currentThemeButton) {
            if (!currentThemeButton) {
                $('#modal-theme .theme-select-btn').removeClass('bg-green-200 border-green-600');
                return;
            }
            const $themesContainer = currentThemeButton.closest('.day-plan').find('.selected-themes-container');
            const selectedThemeIds = $themesContainer.find('.theme-badge').map(function() {
                return $(this).data('theme-id');
            }).get();

            $('#modal-theme .theme-select-btn').each(function() {
                const $button = $(this);
                if (selectedThemeIds.includes($button.data('theme-id'))) {
                    $button.addClass('bg-green-200 border-green-600');
                } else {
                    $button.removeClass('bg-green-200 border-green-600');
                }
            });
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

            $newDay.find('.travel-date').val(data.date || '');
            $newDay.find('.accommodation').val(data.accommodation || '');
            $newDay.find('.day-specific-notes').val(data.otherRequests ? data.otherRequests.join('\n') : '');

            if (data.themes && data.themes.length > 0) {
                const $themesContainer = $newDay.find('.selected-themes-container');
                data.themes.forEach(themeName => {
                    const themeId = `theme-${themeName}`.replace(/\s/g, '-') ;
                    const badgeHtml = `<span class="theme-badge inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full" data-theme-id="${themeId}">${themeName}</span>`;
                    $themesContainer.append(badgeHtml);
                });
            }

            let restoredPrefCode = data.prefCode;
            if (!restoredPrefCode && data.area) {
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
                $newDay.find('.open-prefecture-modal-btn').text('都道府県を選択').data('pref-code', '').addClass('text-gray-500');
                $newDay.find('.open-city-modal-btn').text('市町村を選択').data('city-name', '').addClass('text-gray-500').prop('disabled', true);
            }

            if (data.transport) {
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
            if ($newDay.data('day') === 1) {
                $newDay.find('.day-trip-option').show();
            }
            publicMethods.updateEventButtonState($newDay);

            const dayNum = $newDay.data('day');
            const mapId = `map-day-${dayNum}`;
            const map = L.map(mapId, { zoomControl: false }).setView([35.681236, 139.767125], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            maps[dayNum] = map;
            markers[dayNum] = [];

            publicMethods.updateMapForDay(dayNum, data.places, restoredPrefCode, data.city);
        },

        updateMapForDay: async function(dayNum, places = [], prefCode = '', city = '') {
            const map = maps[dayNum];
            if (!map) return;

            if (markers[dayNum]) {
                markers[dayNum].forEach(marker => marker.remove());
            }
            markers[dayNum] = [];
            if (polylines[dayNum]) {
                polylines[dayNum].forEach(polyline => polyline.remove());
            }
            polylines[dayNum] = [];

            let bounds = [];
            const validPlaces = places.filter(p => p.lat && p.lng);

            validPlaces.forEach(place => {
                const marker = L.marker([place.lat, place.lng]).addTo(map);
                let popupContent = `<b>${place.name}</b>`;
                if (place.formattedAddress) popupContent += `<br>${place.formattedAddress}`;
                if (place.stationName && place.walkTimeMinutes) popupContent += `<br>最寄駅: ${place.stationName} (徒歩${place.walkTimeMinutes}分)`;
                if (place.url) popupContent += `<br><a href="${place.url}" target="_blank">詳細を見る</a>`;
                
                marker.bindPopup(popupContent);
                markers[dayNum].push(marker);
                bounds.push([place.lat, place.lng]);
            });

            if (validPlaces.length > 1) {
                for (let i = 0; i < validPlaces.length - 1; i++) {
                    const origin = { lat: validPlaces[i].lat, lng: validPlaces[i].lng };
                    const destination = { lat: validPlaces[i+1].lat, lng: validPlaces[i+1].lng };
                    
                    try {
                        const route = await API_CLIENT.getDirections(origin, destination, 'walking');
                        if (route && route.polyline) {
                            const decodedPath = decodePolyline(route.polyline);
                            const routeLine = L.polyline(decodedPath, { color: 'blue' }).addTo(map);
                            polylines[dayNum].push(routeLine);
                        }
                    } catch (error) {
                        console.error(`Failed to get directions between ${validPlaces[i].name} and ${validPlaces[i+1].name}:`, error);
                    }
                }
            }

            if (bounds.length > 0) {
                map.fitBounds(L.latLngBounds(bounds).pad(0.2));
            } else if (prefCode) {
                map.setView([35.681236, 139.767125], 5);
            } else {
                map.setView([35.681236, 139.767125], 5);
            }
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
            publicMethods.applyInitialSettings(); 
            $('#departure-point').val(data.general?.departure || AppConfig.defaultValues.departure);
            $('#members').val(data.general?.members || AppConfig.defaultValues.members);
            $('#priority').val(data.general?.priority || AppConfig.defaultValues.priority);
            $('#theme').val(data.general?.theme || AppConfig.defaultValues.theme);

            if (data.general?.transport) {
                const { outbound, inbound } = data.general.transport;
                if (Object.keys(outbound || {}).length > 0 || Object.keys(inbound || {}).length > 0) {
                    $('#general-transport-details').prop('open', true);
                }
                const actualOutbound = outbound || {};
                $('#outbound-transport-type').val(actualOutbound.type || '飛行機');
                $('#outbound-transport-name').val(actualOutbound.name || '');
                $('#outbound-dep-location').val(actualOutbound.depLocation || '');
                $('#outbound-arr-location').val(actualOutbound.arrLocation || '');
                if(actualOutbound.depTime) { const [h,m] = actualOutbound.depTime.split(':'); $('#outbound-dep-hour').val(h); $('#outbound-dep-minute').val(m); } else { $('#outbound-dep-hour').val(''); $('#outbound-dep-minute').val(''); }
                if(actualOutbound.arrTime) { const [h,m] = actualOutbound.arrTime.split(':'); $('#outbound-arr-hour').val(h); $('#outbound-arr-minute').val(m); } else { $('#outbound-arr-hour').val(''); $('#outbound-arr-minute').val(''); }
                const actualInbound = inbound || {};
                $('#inbound-transport-type').val(actualInbound.type || '飛行機');
                $('#inbound-transport-name').val(actualInbound.name || '');
                $('#inbound-dep-location').val(actualInbound.depLocation || '');
                $('#inbound-arr-location').val(actualInbound.arrLocation || '');
                if(actualInbound.depTime) { const [h,m] = actualInbound.depTime.split(':'); $('#inbound-dep-hour').val(h); $('#inbound-dep-minute').val(m); } else { $('#inbound-dep-hour').val(''); $('#inbound-dep-minute').val(''); }
                if(actualInbound.arrTime) { const [h,m] = actualInbound.arrTime.split(':'); $('#inbound-arr-hour').val(h); $('#inbound-arr-minute').val(m); } else { $('#inbound-arr-hour').val(''); $('#inbound-arr-minute').val(''); }
            }

            $('#days-container').empty();
            dayCount = 0;
            if (data.days && data.days.length > 0) {
                data.days.forEach(dayData => publicMethods.addDay(dayData));
            } else {
                publicMethods.addDay();
            }

            if (data.isSuggestionMode && data.suggestion) {
                $('#arrival-point').val(data.suggestion.arrivalPoint || '');
                $('#trip-start-date').val(data.suggestion.startDate || '');
                $('#trip-end-date').val(data.suggestion.endDate || '');
                $('#trip-remarks').val(data.suggestion.remarks ? data.suggestion.remarks.join('\n') : '');
            }
            $('#ai-suggestion-mode').prop('checked', data.isSuggestionMode || false).trigger('change');

            if (data.suggestionNovelty) {
                $(`input[name="suggestion-novelty"][value="${data.suggestionNovelty}"]`).prop('checked', true);
            }
            if (typeof data.proactiveSuggestions !== 'undefined') {
                $('#proactive-suggestions').prop('checked', data.proactiveSuggestions);
            }
            $('#proactive-suggestions').trigger('change');
        },

        showStatusMessage: function(message) {
            $('#save-status').text(message).fadeIn().delay(3000).fadeOut();
        },

        updateLLMButtonState: function(enabled) {
            $('#execute-gemini-btn, #execute-mistral-btn').prop('disabled', !enabled);
        },

        displayLLMResponse: function(content, modelName, { isLoading = false, error = null } = {}) {
            const $responseArea = $('#gemini-response-area');
            const $responseContent = $('#gemini-response-content');
            const $responseTitle = $responseArea.find('h3');

            $responseArea.slideDown();
            $responseTitle.text(`${modelName}からの応答`);

            if (isLoading) {
                $responseContent.html(`<p class="text-gray-500">${modelName}からの応答を待っています...</p>`);
                return;
            }
            if (error) {
                const escapedError = $('<div>').text(error).html();
                $responseContent.html(`<p class="text-red-500"><strong>エラー:</strong> ${escapedError}</p>`);
                return;
            }
            if (content) {
                $responseContent.html(marked.parse(content));
            } else {
                $responseArea.slideUp();
                $responseContent.empty();
            }
        },

        renderHistoryList: function(histories) {
            const formattedHistories = histories.map(h => {
                const d = new Date(h.createdAt);
                return {
                    ...h,
                    formattedCreatedAt: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                };
            });
            const html = templates.historyList({ histories: formattedHistories });
            $('#modal-history-content').html(html);
        },

        getHistoryTitle: function() {
            const title = $('#history-title-input').val().trim();
            if (!title) {
                alert('タイトルを入力してください。');
                return null;
            }
            return title;
        },

        clearHistoryTitle: function() {
            $('#history-title-input').val('');
        },

        removeHistoryItemFromUI: function(id) {
            $(`.history-item[data-history-id="${id}"]`).fadeOut(300, function() { 
                $(this).remove(); 
                if ($('#modal-history-content .history-item').length === 0) {
                    $('#modal-history-content').html('<p class="text-center text-gray-500 py-8">保存された履歴はありません。</p>');
                }
            });
        },

        getPrefectures: () => AppConfig.geoData,
        getTemplates: () => templates
    };

    return publicMethods;
})();