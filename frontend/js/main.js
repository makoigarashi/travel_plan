/**
 * @file 旅行プランジェネレーターのメインロジックです。
 * @author Gemini
 */

// =============================================
// メインロジック (main.js)
// 役割：アプリケーション全体を制御する司令塔。ユーザーイベントを監視し、
// DATA_MANAGERやUIに必要な指示を出します。
// =============================================
$(document).ready(function(){
    let currentPrefButton = null;
    let currentCityButton = null;
    let currentThemeButton = null;

    /**
     * アプリケーションを初期化します。
     * テンプレート読み込み、データ取得、イベントハンドラ設定などを行います。
     */
    async function initialize() {
        try {
            // --- 設定保存後のリロードかどうかのフラグを確認 ---
            const settingsSaved = sessionStorage.getItem('settings_saved');
            sessionStorage.removeItem('settings_saved'); // フラグは一度使ったら消す

            // --- 最初に設定をサーバーから読み込む ---
            try {
                const settings = await API_CLIENT.getSettings();
                if (settings.defaultValues) {
                    AppConfig.defaultValues = settings.defaultValues;
                    console.log('Loaded default values from server:', AppConfig.defaultValues);
                }
                if (settings.themes) {
                    AppConfig.themes = settings.themes;
                    console.log('Loaded themes from server:', AppConfig.themes);
                }
            } catch (error) {
                console.warn('Could not load settings from server. Using local defaults.', error);
            }

            // --- テンプレート読み込み ---
            await UI.loadTemplates();
            MARKDOWN_GENERATOR.initialize(UI.getTemplates());

            // --- UI初期化 (設定反映後) ---
            UI.applyInitialSettings();
            const randomPrefix = AppConfig.prefixes[Math.floor(Math.random() * AppConfig.prefixes.length)];
            $('#version-info').text(`${randomPrefix}${AppConfig.appName} (Ver. ${AppConfig.version})`);

            // --- イベントハンドラ設定 ---
            setupEventHandlers();

            // --- 都道府県データ取得とUI初期化 ---
            const prefs = await API_CLIENT.getPrefectures();
            UI.initialize(prefs);
            UI.initializeSettingsModal(AppConfig);
            MicroModal.init({ onClose: () => UI.updateThemeModalButtonStates() });

            // --- 保存済みデータ復元ロジックの修正 ---
            const savedMarkdown = DATA_MANAGER.loadMarkdown();
            if (savedMarkdown && !settingsSaved) { // 設定保存直後でない場合のみ復元を試みる
                if (confirm('以前保存したプランが見つかりました。復元しますか？\n（キャンセルするとデータは削除されます）')) {
                    const data = MARKDOWN_PARSER.parse(savedMarkdown);
                    if (data) {
                        UI.populateFormFromData(data);
                        UI.showStatusMessage('以前のプランを復元しました。');
                    }
                } else {
                    DATA_MANAGER.deleteMarkdown();
                    UI.showStatusMessage('保存されていたプランを削除しました。');
                    UI.addDay();
                }
            } else {
                UI.addDay();
            }

            // --- 初期表示調整 ---
            updateViewForPlanMode($('#ai-suggestion-mode').is(':checked'));

            // --- テスト用の初期化完了フラグ ---
            $('body').attr('data-initialized', 'true');

        } catch (error) {
            console.error("Initialization failed:", error);
            alert('アプリケーションの初期化に失敗しました。コンソールを確認してください。');
        }
    }

    /**
     * プランニングモードに応じてUIの表示/非表示を切り替える専用関数
     * @param {boolean} isSuggestionMode - AI提案モードが有効かどうか
     */
    function updateViewForPlanMode(isSuggestionMode) {
        const $normalModeElements = $('#prompt-form > fieldset:not(:first-of-type):not(#ai-instruction-fieldset), #days-container, .add-day-btn');
        const $suggestionModeElements = $('#ai-suggestion-inputs');

        if (isSuggestionMode) {
            $suggestionModeElements.show();
            $normalModeElements.hide();
        } else {
            $suggestionModeElements.hide();
            $normalModeElements.show();
        }
    }

    /**
     * AI提案モードのチェックボックス変更イベントを処理します。
     */
    function handleSuggestionModeChange() {
        updateViewForPlanMode($(this).is(':checked'));
    }

    /**
     * アプリケーションのすべてのイベントハンドラを設定します。
     */
    function setupEventHandlers() {
        // --- 設定関連 ---
        $('#open-settings-modal-btn').on('click', () => MicroModal.show('modal-settings'));
        $('#save-settings-btn').on('click', handleSaveSettings);

        // --- その他 ---
        $('#ai-suggestion-mode').on('change', handleSuggestionModeChange);
        $('.add-day-btn').on('click', () => {
            const $lastDay = $('.day-plan:last');
            let nextDate = '';
            let prevDayData = {};

            if ($lastDay.length) {
                const lastDateVal = $lastDay.find('.travel-date').val();
                if (lastDateVal) {
                    try {
                        const lastDate = new Date(lastDateVal + 'T00:00:00');
                        lastDate.setDate(lastDate.getDate() + 1);
                        const year = lastDate.getFullYear();
                        const month = String(lastDate.getMonth() + 1).padStart(2, '0');
                        const day = String(lastDate.getDate()).padStart(2, '0');
                        nextDate = `${year}-${month}-${day}`;
                    } catch (e) {
                        console.error("日付の計算中にエラーが発生しました:", e);
                        nextDate = '';
                    }
                }
                prevDayData.prefCode = $lastDay.find('.open-prefecture-modal-btn').data('pref-code');
                prevDayData.area = $lastDay.find('.open-prefecture-modal-btn').text();
                prevDayData.city = $lastDay.find('.open-city-modal-btn').data('city-name');
            }
            
            UI.addDay({ date: nextDate, ...prevDayData });
        });
                                $('.toggle-import-btn').on('click', () => {
            $('#import-area').show(0, function() {
                $(this).addClass('shown');
            });
        });
        $('#days-container')
            .on('click', '.open-prefecture-modal-btn', function() {
                currentPrefButton = $(this);
                MicroModal.show('modal-prefecture');
            })
            .on('click', '.open-city-modal-btn', function() {
                if (!$(this).prop('disabled')) {
                    currentCityButton = $(this);
                    const prefCode = $(this).closest('.day-plan').find('.open-prefecture-modal-btn').data('pref-code');
                    if (prefCode) loadCityModal(prefCode);
                }
            })
            .on('click', '.open-theme-modal-btn', function() {
                currentThemeButton = $(this);
                UI.updateThemeModalButtonStates($(this));
                MicroModal.show('modal-theme');
            })
            .on('click', '.remove-day-btn', function(){
                 const $dayPlan = $(this).closest('.day-plan');
                 if ($('.day-plan').length > 1) {
                     $dayPlan.remove();
                     $('.day-plan').each((index, el) => $(el).find('h2 span').text(`${index + 1}日目`));
                 } else { alert('最低でも1日は必要です。'); }
            })
            .on('click', '.add-place-btn', function(){ UI.addPlace($(this).prev('.places-container')); })
                                                            .on('click', '.remove-place-btn', async function() { // async追加
                 const $group = $(this).closest('.dynamic-input-group');
                 const $dayDiv = $(this).closest('.day-plan');
                 const dayNum = $dayDiv.data('day');

                 if (typeof dayNum === 'undefined' || dayNum === null) {
                     console.error('ERROR: dayNum is undefined or null. Cannot update map.');
                     return;
                 }

                 if ($group.parent().children().length > 1) {
                     $group.remove();
                     
                     // await を使って非同期処理を待つ
                     const formData = DATA_MANAGER.getCurrentFormData();
                     if (!formData.days || !formData.days[dayNum - 1]) {
                         console.error('ERROR: formData.days or formData.days[dayNum - 1] is undefined.');
                         return;
                     }
                     const currentPlaces = formData.days[dayNum - 1].places;
                     await UI.updateMapForDay(dayNum, currentPlaces); // await追加
                 }
                 else { alert('最低でも1つの入力欄は必要です。'); }
            })
            .on('change', '.place-name', handlePlaceInputChange) // 追加
            .on('change', '.day-ai-suggestion-mode', function() {
                const $checkbox = $(this);
                const $dayPlan = $checkbox.closest('.day-plan');
                const $manualInputs = $dayPlan.find('.day-manual-inputs');
                $manualInputs.slideToggle(!$checkbox.is(':checked'));
            })
            .on('change', '.travel-date', function() { UI.updateEventButtonState($(this).closest('.day-plan')); })
            .on('click', '.search-events-btn', handleSearchEvents)
            .on('change', '.day-is-day-trip', function() {
                const $checkbox = $(this);
                const $accommodationInput = $checkbox.closest('.day-plan').find('.accommodation');
                if ($checkbox.is(':checked')) {
                    $accommodationInput.val('').prop('disabled', true).addClass('bg-gray-200');
                } else {
                    $accommodationInput.prop('disabled', false).removeClass('bg-gray-200');
                }
            });

        $('#modal-prefecture-content').on('click', '.prefecture-select-btn', handlePrefectureSelect);
        $('#modal-city-content').on('click', '.city-select-btn', handleCitySelect);
        $('#modal-theme-content').on('click', '.theme-select-btn', handleThemeSelect);
        $('.import-button').on('click', handleImport);
        $('.generate-btn').on('click', handleGenerateMarkdown);
        $('.copy-button').on('click', handleCopyMarkdown);
        $('#execute-gemini-btn').on('click', () => handleExecuteLLM(API_CLIENT.executeGemini, 'Gemini'));
        $('#execute-mistral-btn').on('click', () => handleExecuteLLM(API_CLIENT.executeMistral, 'Mistral'));
    }

    /**
     * 設定を保存するイベントを処理します。
     */
    async function handleSaveSettings() {
        try {
            const settingsToSave = UI.getSettingsFromModal();
            await API_CLIENT.saveSettings(settingsToSave);
            
            sessionStorage.setItem('settings_saved', 'true');

            MicroModal.close('modal-settings');
            alert('設定を保存しました。ページをリロードして反映します。');
            location.reload();
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('設定の保存に失敗しました。コンソールを確認してください。');
        }
    }

    // 場所入力時の処理
    async function handlePlaceInputChange() {
        const $input = $(this);
        const placeName = $input.val().trim();
        const $dayDiv = $input.closest('.day-plan');
        const dayNum = $dayDiv.data('day');

        if (!placeName) {
            // 場所名が空になったら地図からピンを削除
            const currentPlaces = DATA_MANAGER.getCurrentFormData().days[dayNum - 1].places;
            UI.updateMapForDay(dayNum, currentPlaces);
            return;
        }

        try {
            // ジオコーディング
            const geocodeResult = await API_CLIENT.geocodeAddress(placeName);
            const { lat, lng, formattedAddress } = geocodeResult;

            // 最寄駅と徒歩時間を取得
            const stationResult = await API_CLIENT.getNearestStationAndWalkTime(lat, lng);
            const { stationName, walkTimeMinutes } = stationResult;

            // ★ここから追加★
            console.log('DEBUG: stationResult:', stationResult);
            // ★ここまで追加★

            // フォームのplaceDataを更新
            $input.data('lat', lat);
            $input.data('lng', lng);
            $input.data('formattedAddress', formattedAddress);
            $input.data('stationName', stationName);
            $input.data('walkTimeMinutes', walkTimeMinutes);

            // 地図を更新
            const currentPlaces = DATA_MANAGER.getCurrentFormData().days[dayNum - 1].places;
            UI.updateMapForDay(dayNum, currentPlaces);

        } catch (error) {
            console.error('Error processing place input:', error);
            // エラー時は地図を更新しないか、エラー表示を検討
            // $input.dataをクリアするなどの処理も必要かもしれない
        }
    }

    function handleSearchEvents() {
        const $dayDiv = $(this).closest('.day-plan');
        const dateVal = $dayDiv.find('.travel-date').val();
        const prefCode = $dayDiv.find('.open-prefecture-modal-btn').data('pref-code');
        if (!dateVal || !prefCode) { alert('日付と都道府県の両方を選択してください。'); return; }
        const prefData = AppConfig.geoData[prefCode];
        if (!prefData) { alert('都道府県の地域情報が見つかりません。'); return; }
        const regionCode = prefData.regionId;
        const areaCode = `${AppConfig.walkerplus.areaCodePrefix || 'ar'}${regionCode}${prefCode}`;
        const date = new Date(dateVal);
        const mmdd = (date.getMonth() + 1).toString().padStart(2, '0') + date.getDate().toString().padStart(2, '0');
        const path = AppConfig.walkerplus.urlTemplate.replace('{mmdd}', mmdd).replace('{areaCode}', areaCode);
        const targetUrl = `${AppConfig.walkerplus.baseUrl}${path}`;
        window.open(targetUrl, '_blank');
    }

    function loadCityModal(prefCode) {
        $('#modal-city-content').html('<div class="text-center p-4">読み込み中...</div>');
        MicroModal.show('modal-city');
        API_CLIENT.getCities(prefCode)
            .done(data => {
                if (data && Array.isArray(data)) UI.initializeCityModal(data);
                else $('#modal-city-content').html('<div class="text-center p-4 text-red-500">データの取得に失敗しました</div>');
            })
            .fail(() => $('#modal-city-content').html('<div class="text-center p-4 text-red-500">データの取得に失敗しました</div>'));
    }

    function handlePrefectureSelect() {
        if (currentPrefButton) {
            const prefCode = $(this).data('pref-code');
            const prefName = $(this).data('pref-name');
            currentPrefButton.text(prefName).data('pref-code', prefCode).removeClass('text-gray-500');
            const $dayDiv = currentPrefButton.closest('.day-plan');
            const $cityButton = $dayDiv.find('.open-city-modal-btn');
            $cityButton.prop('disabled', false).removeClass('text-gray-500').text('市町村を選択').data('city-name', '');
            UI.updateEventButtonState($dayDiv);
            MicroModal.close('modal-prefecture');
        }
    }
    
    function handleCitySelect() {
        if (currentCityButton) {
            const cityName = $(this).data('city-name');
            currentCityButton.text(cityName).data('city-name', cityName).attr('data-katakana', $(this).attr('title') || '');
            MicroModal.close('modal-city');
        }
    }

    function handleThemeSelect() {
        if (!currentThemeButton) return;
        const $button = $(this);
        const themeId = $button.data('theme-id');
        const themeName = $button.data('theme-name');
        const $themesContainer = currentThemeButton.closest('.day-plan').find('.selected-themes-container');
        $button.toggleClass('bg-green-200 border-green-600');
        const $existingTheme = $themesContainer.find(`.theme-badge[data-theme-id="${themeId}"]`);
        if ($existingTheme.length) {
            $existingTheme.remove();
        } else {
            const badgeHtml = `
                <span class="theme-badge inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full" data-theme-id="${themeId}">
                    ${themeName}
                </span>
            `;
            $themesContainer.append(badgeHtml);
        }
    }

    function handleImport() {
        try {
            const markdownToParse = $('#import-prompt').val().trim();
            if (!markdownToParse) { alert('読み込むプロンプトをテキストエリアに貼り付けてください。'); return; }
            const data = MARKDOWN_PARSER.parse(markdownToParse);
            if (data) {
                UI.populateFormFromData(data);
                alert('フォームにプロンプトの内容を反映しました！');
            } else {
                alert('プロンプトの形式が正しくないようです。');
            }
        } catch (e) {
            alert('プロンプトの解析中にエラーが発生しました。');
            console.error(e);
        }
    }

    let simplemde; // SimpleMDEインスタンスを保持する変数

    function handleGenerateMarkdown(){
        let markdown;
        const isSuggestionMode = $('#ai-suggestion-mode').is(':checked');

        if (isSuggestionMode) {
            const startDate = $('#trip-start-date').val();
            const endDate = $('#trip-end-date').val();
            let durationText = '';
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                durationText = diffDays === 0 ? `日帰り (${startDate})` : `${diffDays}泊${diffDays + 1}日 (${startDate} ～ ${endDate})`;
            }
            const templateData = {
                general: { departure: $('#departure-point').val(), members: $('#members').val(), theme: $('#theme').val() || $('#theme').attr('placeholder'), priority: $('#priority').val() },
                suggestion: { arrivalPoint: $('#arrival-point').val(), durationText: durationText, remarks: $('#trip-remarks').val().trim().split('\n').filter(Boolean) },
                proactiveSuggestions: $('#proactive-suggestions').is(':checked')
            };
            markdown = MARKDOWN_GENERATOR.generateSuggestionMarkdown(templateData);
        } else {
            const templateData = DATA_MANAGER.getCurrentFormData();
            templateData.proactiveSuggestions = $('#proactive-suggestions').is(':checked');
            templateData.days.forEach((day, index) => {
                day.dayNumber = index + 1;
                if(day.date) {
                    const date = new Date(day.date + 'T00:00:00');
                    day.date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                    day.dayOfWeek = AppConfig.dayNames[date.getDay()];
                }
                const allPrefectures = UI.getPrefectures();
                const prefName = allPrefectures[day.prefCode] || '';
                day.area = day.city ? `${prefName} (${day.city})` : prefName;
            });
            markdown = MARKDOWN_GENERATOR.generateStandardMarkdown(templateData);
        }

        DATA_MANAGER.saveMarkdown(markdown);
        UI.showStatusMessage('プロンプトを生成し、自動保存しました。');

        // まず、テストが依存するtextareaに値を即座に設定する
        $('#output-markdown').val(markdown);
        $('#output-area').show(); // output-areaを表示

        // SimpleMDEの処理は、メインスレッドをブロックしないように少し遅延させて実行
        setTimeout(() => {
            if (!simplemde) {
                simplemde = new SimpleMDE({
                    element: document.getElementById("output-markdown"),
                    spellChecker: false,
                    toolbar: false,
                    status: false,
                    renderingConfig: {
                        singleLineBreaks: false,
                        codeSyntaxHighlighting: true,
                    },
                });
            }
            simplemde.value(markdown);
        }, 10); // 10ms程度のわずかな遅延で十分

        UI.updateLLMButtonState(true);
        UI.displayLLMResponse(null, 'Gemini'); // デフォルトのモデル名を渡す
    }

    function handleCopyMarkdown(){
         // SimpleMDEからMarkdownテキストを取得
         const markdownToCopy = simplemde ? simplemde.value() : document.getElementById('output-markdown').value;
         navigator.clipboard.writeText(markdownToCopy)
             .then(() => alert('プロンプトをクリップボードにコピーしました！'))
             .catch(err => console.error('クリップボードへのコピーに失敗しました:', err));
    }

    /**
     * LLM実行の共通ハンドラ
     * @param {function} apiClientFunction - 実行するAPIクライアントの関数
     * @param {string} modelName - 表示に使用するモデル名 (e.g., 'Gemini', 'Mistral')
     */
    function handleExecuteLLM(apiClientFunction, modelName) {
        const prompt = $('#output-markdown').val();
        if (!prompt) {
            alert('プロンプトがありません。');
            return;
        }

        UI.updateLLMButtonState(false);
        UI.displayLLMResponse(null, modelName, { isLoading: true });

        apiClientFunction(prompt)
            .done(function(response) {
                if (response && response.text) {
                    UI.displayLLMResponse(response.text, modelName);
                } else {
                    UI.displayLLMResponse(null, modelName, { error: `${modelName}から予期しない形式の応答がありました。` });
                }
            })
            .fail(function(jqXHR) {
                let errorMessage = '不明なエラーが発生しました。';
                if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                    errorMessage = jqXHR.responseJSON.error;
                } else if (jqXHR.statusText) {
                    errorMessage = jqXHR.statusText;
                }
                UI.displayLLMResponse(null, modelName, { error: errorMessage });
            })
            .always(function() {
                UI.updateLLMButtonState(true);
            });
    }

    initialize();
});