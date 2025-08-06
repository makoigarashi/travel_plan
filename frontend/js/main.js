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
    const API_ENDPOINT = AppConfig.API_ENDPOINT;
    let currentPrefButton = null;

    /**
     * アプリケーションを初期化します。
     * デフォルト値、バージョン情報、イベントハンドラを設定します。
     */
    function initialize() {
        // --- 初期値設定 ---
        $('#departure-point').val(AppConfig.defaultValues.departure);
        $('#members').val(AppConfig.defaultValues.members);
        $('#theme').attr('placeholder', AppConfig.defaultValues.theme);
        $('#priority').attr('placeholder', AppConfig.defaultValues.priority);

        const randomPrefix = AppConfig.prefixes[Math.floor(Math.random() * AppConfig.prefixes.length)];
        $('#version-info').text(`${randomPrefix}出発地設定・複数日対応版 (Ver. 4.0-beta)`);

        // --- イベントハンドラ ---
        setupEventHandlers();

        // 初期表示の調整
        $('#ai-suggestion-mode').trigger('change');

        // --- アプリケーション初期化 ---
        $.getJSON(`${API_ENDPOINT}?api=prefectures`).done(function(prefs){
            UI.initialize(prefs);

            const savedMarkdown = DATA_MANAGER.loadMarkdown();
            console.log('Loaded Markdown from LocalStorage:', savedMarkdown); // デバッグ用ログ

            if (savedMarkdown) {
                if (confirm('以前保存したプランが見つかりました。復元しますか？\n（キャンセルするとデータは削除されます）')) {
                    const data = MARKDOWN_PARSER.parse(savedMarkdown);
                    console.log('Parsed Data from Markdown:', data); // デバッグ用ログ
                    if (data) {
                        UI.populateFormFromData(data);
                        UI.showStatusMessage('以前のプランを復元しました。');
                    }
                } else {
                    DATA_MANAGER.deleteMarkdown();
                    UI.showStatusMessage('保存されていたプランを削除しました。');
                }
            }

        }).fail(function(){
            alert('アプリケーションの初期化に失敗しました。バックエンドが起動しているか確認してください。');
        });
    }

    /**
     * アプリケーションのすべてのイベントハンドラを設定します。
     */
    function setupEventHandlers() {
        // テストボタンはローカル環境でのみ表示
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
            $('#run-tests-btn').show();
        }

        $('.add-day-btn').on('click', () => UI.addDay());
        $('.toggle-import-btn').on('click', () => $('#import-area').slideToggle());

        $('#days-container')
            .on('click', '.open-prefecture-modal-btn', function() {
                currentPrefButton = $(this);
                MicroModal.show('modal-prefecture');
            })
            .on('click', '.remove-day-btn', function(){
                 const $dayPlan = $(this).closest('.day-plan');
                 if ($('.day-plan').length > 1) {
                     $dayPlan.remove();
                     $('.day-plan').each(function(index){ $(this).find('h2 span').text(`${index + 1}日目`); });
                 } else { alert('最低でも1日は必要です。'); }
            })
            .on('click', '.add-place-btn', function(){ UI.addPlace($(this).prev('.places-container')); })
            .on('click', '.remove-place-btn', function(){
                 const $group = $(this).closest('.dynamic-input-group');
                 if ($group.parent().children().length > 1) { $group.remove(); }
                 else { alert('最低でも1つの入力欄は必要です。'); }
            })
            .on('change', '.travel-date', function() {
                UI.updateEventButtonState($(this).closest('.day-plan'));
            })
            .on('click', '.search-events-btn', handleSearchEvents)
            .on('city-select-init', '.open-prefecture-modal-btn', handleCitySelectInit);

        $('#modal-prefecture-content').on('click', '.prefecture-select-btn', handlePrefectureSelect);

        $('#ai-suggestion-mode').on('change', handleSuggestionModeChange);

        $('.import-button').on('click', handleImport);

        $('.generate-btn').on('click', handleGenerateMarkdown);

        $('.copy-button').on('click', handleCopyMarkdown);
    }

    /**
     * Walker+でイベントを検索するイベントを処理します。
     */
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

    /**
     *市区町村選択ドロップダウンの初期化を処理します。
     * @param {Event} event - イベントオブジェクト。
     * @param {string} prefCode - 都道府県コード。
     * @param {string} cityToSelect - デフォルトで選択される市区町村。
     */
    function handleCitySelectInit(event, prefCode, cityToSelect) {
        const $prefButton = $(this);
        const $citySelect = $prefButton.siblings('.city-select');

        $citySelect.html('<option value="">読み込み中...</option>').prop('disabled', true);
        $.getJSON(`${API_ENDPOINT}?api=cities&prefCode=${prefCode}`, function(data) {
            $citySelect.html('<option value="">市町村を選択</option>').prop('disabled', false);
            if (data && Array.isArray(data)) {
                data.forEach(cityName => { $citySelect.append(`<option value="${cityName}">${cityName}</option>`); });
                if (cityToSelect) { $citySelect.val(cityToSelect); }
            }
        }).fail(function() {
            $citySelect.html('<option value="">取得失敗</option>').prop('disabled', true);
        });
    }

    /**
     * モーダルからの都道府県の選択を処理します。
     */
    function handlePrefectureSelect() {
        if (currentPrefButton) {
            const prefCode = $(this).data('pref-code');
            const prefName = $(this).data('pref-name');
            currentPrefButton.text(prefName).data('pref-code', prefCode).removeClass('text-gray-500');
            const $dayDiv = currentPrefButton.closest('.day-plan');
            UI.updateEventButtonState($dayDiv);
            currentPrefButton.trigger('city-select-init', [prefCode, null]);
            MicroModal.close('modal-prefecture');
        }
    }

    /**
     * AI提案モードのチェックボックスの変更イベントを処理します。
     */
    function handleSuggestionModeChange() {
        const isSuggestionMode = $(this).is(':checked');
        if (isSuggestionMode) {
            $('#ai-suggestion-inputs').slideDown();
            $('#prompt-form > fieldset:not(:first-of-type):not(#ai-instruction-fieldset), #days-container, .add-day-btn').slideUp();
        } else {
            $('#ai-suggestion-inputs').slideUp();
            $('#prompt-form > fieldset:not(:first-of-type), #days-container, .add-day-btn').slideDown();
        }
    }

    /**
     * マークダウンプロンプトのインポートを処理します。
     */
    function handleImport() {
        try {
            let markdownToParse = $('#import-prompt').val().trim();
            if (!markdownToParse) {
                alert('読み込むプロンプトをテキストエリアに貼り付けてください。');
                return;
            }
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

    /**
     * マークダウンプロンプトの生成を処理します。
     */
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
                general: {
                    departure: $('#departure-point').val(),
                    members: $('#members').val(),
                    theme: $('#theme').val() || $('#theme').attr('placeholder'),
                    priority: $('#priority').val()
                },
                suggestion: {
                    arrivalPoint: $('#arrival-point').val(),
                    durationText: durationText,
                    remarks: $('#trip-remarks').val().trim().split('\n').filter(Boolean)
                },
                proactiveSuggestions: $('#proactive-suggestions').is(':checked')
            };
            console.log('DEBUG: templateData for suggestion mode:', templateData); // 追加
            markdown = MARKDOWN_GENERATOR.generateSuggestionMarkdown(templateData);
        } else {
            const templateData = DATA_MANAGER.getCurrentFormData();
            templateData.days.forEach((day, index) => {
                day.dayNumber = index + 1;
                if(day.date) {
                    const date = new Date(day.date + 'T00:00:00');
                    day.date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                    day.dayOfWeek = AppConfig.dayNames[date.getDay()];
                }
                day.area = day.city ? `${day.area} (${day.city})` : day.area;
            });
            templateData.proactiveSuggestions = $('#proactive-suggestions').is(':checked');
            markdown = MARKDOWN_GENERATOR.generateStandardMarkdown(templateData);
        }

        // ★自動保存
        DATA_MANAGER.saveMarkdown(markdown);
        UI.showStatusMessage('プロンプトを生成し、自動保存しました。');

        const $outputTextarea = $('#output-markdown');
        $outputTextarea.val(markdown);
        $('#output-area').slideDown();
        $outputTextarea.css('height', 'auto').css('height', $outputTextarea.prop('scrollHeight') + 'px');
    }

    /**
     * 生成されたマークダウンをクリップボードにコピーするのを処理します。
     */
    function handleCopyMarkdown(){
         const textarea = document.getElementById('output-markdown');
         textarea.select();
         document.execCommand('copy');
         alert('プロンプトをクリップボードにコピーしました！');
    }

    // Initialize the application
    initialize();
});