// =============================================
// メインロジック (main.js)
// 役割：アプリケーション全体を制御する司令塔。ユーザーイベントを監視し、
// DATA_MANAGERやUIに必要な指示を出します。
// =============================================
$(document).ready(function(){
    const API_ENDPOINT = AppConfig.API_ENDPOINT;
    let currentPrefButton = null;
    const markdownTemplate = Handlebars.compile($('#markdown-template').html());

    // --- 初期値設定 ---
    $('#departure-point').val(AppConfig.defaultValues.departure);
    $('#members').val(AppConfig.defaultValues.members);
    $('#theme').attr('placeholder', AppConfig.defaultValues.theme);
    $('#priority').attr('placeholder', AppConfig.defaultValues.priority);

    const randomPrefix = AppConfig.prefixes[Math.floor(Math.random() * AppConfig.prefixes.length)];
    $('#version-info').text(`${randomPrefix}出発地設定・複数日対応版 (Ver. 3.0-merged)`);

    // --- イベントハンドラ ---
    // テストボタンはローカル環境でのみ表示
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        $('#run-tests-btn').show();
    }

    $('.add-day-btn').on('click', () => UI.addDay());
    $('.toggle-import-btn').on('click', () => $('#import-area').slideToggle());

    $('#save-plan-btn').on('click', DATA_MANAGER.save);
    $('#load-plan-btn').on('click', DATA_MANAGER.load);
    $('#delete-plan-btn').on('click', DATA_MANAGER.delete);

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
        .on('click', '.search-events-btn', function() {
            const $dayDiv = $(this).closest('.day-plan');
            const dateVal = $dayDiv.find('.travel-date').val();
            const prefCode = $dayDiv.find('.open-prefecture-modal-btn').data('pref-code');

            if (!dateVal || !prefCode) { alert('日付と都道府県の両方を選択してください。'); return; }

            const prefData = AppConfig.geoData[prefCode];
            if (!prefData) { alert('都道府県の地域情報が見つかりません。'); return; }

            const regionCode = prefData.regionId;
            // walkerplusのエリアコードを生成 (ar + 地域コード2桁 + 都道府県コード2桁)
            const areaCode = `${AppConfig.walkerplus.areaCodePrefix || 'ar'}${regionCode}${prefCode}`;
            const date = new Date(dateVal);
            const mmdd = (date.getMonth() + 1).toString().padStart(2, '0') + date.getDate().toString().padStart(2, '0');
            const path = AppConfig.walkerplus.urlTemplate.replace('{mmdd}', mmdd).replace('{areaCode}', areaCode);
            const targetUrl = `${AppConfig.walkerplus.baseUrl}${path}`;
            window.open(targetUrl, '_blank');
        })
        .on('city-select-init', '.open-prefecture-modal-btn', function(event, prefCode, cityToSelect) {
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
        });

    $('#modal-prefecture-content').on('click', '.prefecture-select-btn', function() {
        if (currentPrefButton) {
            const prefCode = $(this).data('pref-code');
            const prefName = $(this).data('pref-name');
            currentPrefButton.text(prefName).data('pref-code', prefCode).removeClass('text-gray-500');
            const $dayDiv = currentPrefButton.closest('.day-plan');
            UI.updateEventButtonState($dayDiv);
            currentPrefButton.trigger('city-select-init', [prefCode, null]);
            MicroModal.close('modal-prefecture');
        }
    });

    $('#ai-suggestion-mode').on('change', function() {
        const isSuggestionMode = $(this).is(':checked');
        if (isSuggestionMode) {
            $('#ai-suggestion-inputs').slideDown();
            $('#prompt-form > fieldset:not(:first-of-type), #days-container, .add-day-btn').slideUp();
        } else {
            $('#ai-suggestion-inputs').slideUp();
            $('#prompt-form > fieldset:not(:first-of-type), #days-container, .add-day-btn').slideDown();
        }
    });

    $('.import-button').on('click', function() {
        try {
            const text = $('#import-prompt').val();
            if (!text.trim()) { alert('プロンプトを貼り付けてください。'); return; }
            const data = DATA_MANAGER.parseMarkdownFromText(text);
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
    });

    $('.generate-btn').on('click', function(){
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
            const remarks = $('#trip-remarks').val().trim().split('\n').filter(Boolean);
            markdown = `# ★★★ 行先提案モード ★★★\nあなたが行先も含めて、最高の旅行プランを提案してください。\n\n### 旅行の基本条件\n*   **出発地**: ${$('#departure-point').val()}\n*   **到着空港・駅**: ${$('#arrival-point').val()}\n*   **旅行期間**: ${durationText}\n*   **メンバー構成・体力レベル**: ${$('#members').val()}\n*   **旅のキーワード**: ${$('#trip-keywords').val()}\n*   **最優先事項**: ${$('#priority').val()}\n*   **備考・その他の要望**:\n${remarks.length > 0 ? remarks.map(r => `    *   ${r}`).join('\n') : '    *   特になし'}\n---\n`;
            const footerTemplateHtml = $('#markdown-template').html();
            const footerStartIndex = footerTemplateHtml.indexOf('### AIへの特別指示');
            const footerTemplate = Handlebars.compile(footerTemplateHtml.substring(footerStartIndex));
            markdown += footerTemplate({ proactiveSuggestions: $('#proactive-suggestions').is(':checked') });

        } else {
            const templateData = DATA_MANAGER.getCurrentFormData();
            templateData.days.forEach((day, index) => {
                day.dayNumber = index + 1;
                if(day.date) {
                    const date = new Date(day.date + 'T00:00:00');
                    day.date = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                    day.dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                }
                day.area = day.city ? `${day.area} (${day.city})` : day.area;
            });
            templateData.proactiveSuggestions = $('#proactive-suggestions').is(':checked');
            markdown = markdownTemplate(templateData);
        }
        const $outputTextarea = $('#output-markdown');
        $outputTextarea.val(markdown);
        $('#output-area').slideDown();
        $outputTextarea.css('height', 'auto').css('height', $outputTextarea.prop('scrollHeight') + 'px');
    });

    $('.copy-button').on('click', function(){
         const textarea = document.getElementById('output-markdown');
         textarea.select();
         document.execCommand('copy');
         alert('プロンプトをクリップボードにコピーしました！');
    });

    // --- アプリケーション初期化 ---
    $.getJSON(`${API_ENDPOINT}?api=prefectures`).done(function(prefs){
        UI.initialize(prefs);
    }).fail(function(){
        alert('アプリケーションの初期化に失敗しました。バックエンドが起動しているか確認してください。');
    });
});