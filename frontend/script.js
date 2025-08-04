const DEBUG_FLAG = AppConfig.DEBUG_FLAG;

const walkerplusAreaCodes = AppConfig.walkerplusAreaCodes;

function parseMarkdownFromText(text) {
    const data = { general: {}, days: [] };
    const tokens = marked.lexer(text);
    let currentSection = ''; 
    let currentDay = null;
    let currentListKey = '';

    function extractText(tokens) {
        return tokens.map(t => {
            if (t.type === 'link') {
                // Return a special format to be parsed later
                return `__LINK__${t.text}__SEP__${t.href}__ENDLINK__`;
            }
            return t.tokens ? extractText(t.tokens) : t.text;
        }).join('');
    }
    
    function parseListItem(item) {
        if (!item.tokens) return { isKeyValue: false };
        let key = '', value = '', isKeyValue = false;
        
        if (item.tokens[0] && item.tokens[0].tokens) {
            const strongToken = item.tokens[0].tokens.find(t => t.type === 'strong');
            if (strongToken) {
                key = extractText(strongToken.tokens);
                const keyIndex = item.tokens[0].tokens.indexOf(strongToken);
                const valueTokens = item.tokens[0].tokens.slice(keyIndex + 1);
                value = extractText(valueTokens).replace(/^：\s*/, '').trim();
                isKeyValue = true;
            }
        }
        return { isKeyValue, key, value, rawText: extractText(item.tokens) };
    }

    tokens.forEach((token, tokenIndex) => {
        if(DEBUG_FLAG) {
            console.groupCollapsed(`[Token ${tokenIndex}] type: %c${token.type}`, "font-weight: bold;");
            console.log(token);
            console.groupEnd();
        }

        if (token.type === 'heading' && token.depth === 3) {
            const title = token.text;
            currentListKey = '';
            if (title.includes('旅行全体の基本情報')) currentSection = 'general';
            else if (title.includes('日目')) {
                currentSection = 'day';
                currentDay = { places: [], doEat: [], notes: [] };
                data.days.push(currentDay);
                const dateMatch = title.match(/（(\d{4}\/\d{1,2}\/\d{1,2})・/);
                if (dateMatch) {
                    const [year, month, day] = dateMatch[1].split('/');
                    currentDay.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
            } else {
                currentSection = 'footer';
            }
        }

        if (token.type === 'list' && (currentSection === 'general' || currentSection === 'day')) {
            token.items.forEach(item => {
                const parsedItem = parseListItem(item);
                
                if (parsedItem.isKeyValue) {
                    currentListKey = parsedItem.key;
                    if (currentSection === 'general') {
                        if (parsedItem.key.includes('出発地')) data.general.departure = parsedItem.value;
                        else if (parsedItem.key.includes('メンバー構成')) data.general.members = parsedItem.value;
                        else if (parsedItem.key.includes('旅のテーマ')) data.general.theme = parsedItem.value;
                        else if (parsedItem.key.includes('最優先事項')) data.general.priority = parsedItem.value;
                    } else if (currentDay) {
                        if (parsedItem.key.includes('主な活動エリア')) {
                            const areaParts = parsedItem.value.match(/(.+?)\s*[\(（](.+?)[\)）]/);
                            currentDay.area = areaParts ? areaParts[1].trim() : parsedItem.value;
                            currentDay.city = areaParts ? areaParts[2].trim() : '';
                        } else if (parsedItem.key.includes('宿泊先')) {
                            currentDay.accommodation = parsedItem.value;
                        }
                    }
                    if(item.tokens.length > 1 && item.tokens[1] && item.tokens[1].type === 'list') {
                        item.tokens[1].items.forEach(subItem => {
                            const subItemText = extractText(subItem.tokens).trim();
                            if (currentDay && currentListKey) {
                                if (currentListKey.includes('行きたい場所')) {
                                    const linkMatch = subItemText.match(/__LINK__(.+)__SEP__(.+)__ENDLINK__/);
                                    if (linkMatch) {
                                        currentDay.places.push({ name: linkMatch[1], url: linkMatch[2] });
                                    } else {
                                        currentDay.places.push({ name: subItemText });
                                    }
                                } else if (currentListKey.includes('やりたいこと')) {
                                    currentDay.doEat.push(subItemText);
                                } else if (currentListKey.includes('交通パス')) {
                                    currentDay.notes.push(subItemText);
                                }
                            }
                        });
                    }
                }
            });
        }
    });
    
    return data;
}


$(document).ready(function(){
    let dayCount = 0;
    let prefectures = {}; 

    const API_ENDPOINT = AppConfig.API_ENDPOINT;

    const dayTemplate = Handlebars.compile($('#day-plan-template').html());
    const placeTemplate = Handlebars.compile($('#place-input-template').html());
    const markdownTemplate = Handlebars.compile($('#markdown-template').html());

    // 現在のホスト名を取得
    const hostname = window.location.hostname;
    
    // もしローカル開発環境なら、テストボタンを表示する
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
        $('#run-tests-btn').show();
    }

    const randomPrefix = AppConfig.prefixes[Math.floor(Math.random() * AppConfig.prefixes.length)];
    $('#version-info').text(`${randomPrefix}出発地設定・複数日対応版 (Ver. FINAL-STABLE)`);
    
    // ★★★ デフォルト値を config.js から設定 ★★★
    $('#departure-point').val(AppConfig.defaultValues.departure);
    $('#members').val(AppConfig.defaultValues.members);
    $('#theme').attr('placeholder',AppConfig.defaultValues.theme);
    $('#priority').attr('placeholder',AppConfig.defaultValues.priority);

    function fetchPrefectures() {
        return $.getJSON(`${API_ENDPOINT}?api=prefectures`).done(function(data){
            prefectures = data;
        }).fail(function(){
            alert('都道府県データの取得に失敗しました。APIエンドポイントのURLが正しいか確認してください。');
        });
    }

    function addDay(data = {}) {
        dayCount++;
        const prefArray = Object.keys(prefectures).map(code => ({ code: code, name: prefectures[code] }));
        const context = { dayNumber: dayCount, prefectures: prefArray };
        const dayHtml = dayTemplate(context);
        const $newDay = $(dayHtml);
        
        $newDay.find('.travel-date').val(data.date || '');
        
        if(data.area) {
            const prefName = data.area;
            const prefCode = Object.keys(prefectures).find(key => prefectures[key] === prefName);
            if (prefCode) {
                $newDay.find('.prefecture-select').val(prefCode);
                // 市町村の反映は、API呼び出しが完了した後に行う必要があるため、
                // triggerに渡すデータとしてcityを渡す
                if (data.city) {
                    setTimeout(() => {
                         $newDay.find('.prefecture-select').trigger('change', [data.city]);
                    }, 500); // API通信のための適切な遅延
                }
            }
        }
        
        $newDay.find('.accommodation').val(data.accommodation || '');
        $newDay.find('.must-do-eat').val(data.doEat ? data.doEat.join('\n') : '');
        $newDay.find('.day-specific-notes').val(data.notes ? data.notes.join('\n') : '');
        
        const $placesContainer = $newDay.find('.places-container');
        // URL情報もaddPlace関数に渡すように修正
        if (data.places && data.places.length > 0) {
            data.places.forEach(place => addPlace($placesContainer, place));
        } else {
            addPlace($placesContainer);
        }

        $('#days-container').append($newDay);
    }

    function addPlace($container, placeData = {}) {
        const placeHtml = placeTemplate({
            name: placeData.name || '',
            url: placeData.url || ''
        });
        $container.append(placeHtml);
    }

    // ボタンの活性/非活性を制御する
    function updateEventButtonState($dayDiv) {
        const dateVal = $dayDiv.find('.travel-date').val();
        const prefCode = $dayDiv.find('.prefecture-select').val();
        const $button = $dayDiv.find('.search-events-btn');

        if (dateVal && prefCode) {
            $button.prop('disabled', false); // 両方入力されていれば活性化
        } else {
            $button.prop('disabled', true);  // どちらかが空なら非活性化
        }
    }

    // 日付と都道府県の選択が変更されたら、ボタンの状態を更新
    $('#days-container').on('change', '.travel-date, .prefecture-select', function() {
        const $dayDiv = $(this).closest('.day-plan');
        updateEventButtonState($dayDiv);
    });

    // イベント検索ボタンが押された時の処理
    $('#days-container').on('click', '.search-events-btn', function() {
        const $dayDiv = $(this).closest('.day-plan');
        const dateVal = $dayDiv.find('.travel-date').val(); 
        const prefCode = $dayDiv.find('.prefecture-select').val();
        
        const prefName = prefectures[prefCode];
        const areaCode = AppConfig.walkerplusAreaCodes[prefName];
        
        if (areaCode && dateVal) {
            const date = new Date(dateVal);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const mmdd = month + day;
            
            const targetUrl = `${AppConfig.walkerplus.baseUrl}${mmdd}/${areaCode}/`;
            window.open(targetUrl, '_blank');
        } else {
            alert('日付と都道府県の両方を選択してください。');
        }
    });        

    $('.add-day-btn').on('click', function(){ addDay(); });
    $('.toggle-import-btn').on('click', function(){ $('#import-area').slideToggle(); });
    
    $('#days-container').on('change', '.prefecture-select', function(event, cityToSelect) {
        const $prefSelect = $(this);
        const $citySelect = $prefSelect.siblings('.city-select');
        const selectedPrefCode = $prefSelect.val();
        $citySelect.html('<option value="">読み込み中...</option>').prop('disabled', true);
        if (!selectedPrefCode) {
            $citySelect.html('<option value="">市町村</option>').prop('disabled', true);
            return;
        }
        $.getJSON(`${API_ENDPOINT}?api=cities&prefCode=${selectedPrefCode}`, function(data) {
            $citySelect.html('<option value="">市町村を選択</option>').prop('disabled', false);
            if (data && Array.isArray(data)) {
                data.forEach(cityName => {
                    $citySelect.append(`<option value="${cityName}">${cityName}</option>`);
                });
                if (cityToSelect) {
                    $citySelect.val(cityToSelect);
                }
            }
        }).fail(function() {
            $citySelect.html('<option value="">取得失敗</option>').prop('disabled', true);
            alert('市町村データの取得に失敗しました。');
        });
    });
    
    $('#days-container').on('click', '.remove-day-btn', function(){
         const $dayPlan = $(this).closest('.day-plan');
         if ($('.day-plan').length > 1) {
             $dayPlan.remove();
             $('.day-plan').each(function(index){
                 $(this).find('h2 span').text(`${index + 1}日目`);
             });
             dayCount = $('.day-plan').length;
         } else {
             alert('最低でも1日は必要です。');
         }
    });
    $('#days-container').on('click', '.add-place-btn', function(){ addPlace($(this).prev('.places-container')); });
    $('#days-container').on('click', '.remove-place-btn', function(){
         const $group = $(this).closest('.dynamic-input-group');
         if ($group.parent().children().length > 1) {
             $group.remove();
         } else {
             alert('最低でも1つの入力欄は必要です。');
         }
    });
    
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★ ここが今回の修正ポイントです！(パーサーの最終完全版) ★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    $('.import-button').on('click', function(){
        const text = $('#import-prompt').val();

        try {
            const data = parseMarkdownFromText(text); // ★ 切り出した関数を呼び出す
            if (!text.trim()) { alert('プロンプトを貼り付けてください。'); return; }

            if(DEBUG_FLAG) { console.clear(); console.log("--- 解析開始 ---"); }
            
            if(DEBUG_FLAG) { console.log("%c\n--- 最終解析結果 ---", "color: blue; font-size: 16px;"); console.log(JSON.stringify(data, null, 2)); }
            
            $('#departure-point').val(data.general.departure || '');
            $('#members').val(data.general.members || '');
            $('#theme').val(data.general.theme || '');
            $('#priority').val(data.general.priority || '');
            $('#days-container').empty(); dayCount = 0;
            if(data.days.length > 0) {
                data.days.forEach(dayData => addDay(dayData));
            } else { addDay(); }
            alert('フォームにプロンプトの内容を反映しました！');
        } catch (e) {
            alert('プロンプトの解析中にエラーが発生しました。詳細はコンソールを確認してください。');
            console.error("解析エラー:", e);
        }
    });

    $('.generate-btn').on('click', function(){
        let markdown = "";
        const isSuggestionMode = $('#ai-suggestion-mode').is(':checked');

        // 共通のフッター部分を先に生成
        const footerTemplateData = {
            proactiveSuggestions: $('#proactive-suggestions').is(':checked')
        };
        // Handlebarsのテンプレートからフッター部分だけを抜き出して使う
        const footerTemplateHtml = $('#markdown-template').html();
        const footerStartIndex = footerTemplateHtml.indexOf('### AIへの特別指示');
        const footerTemplate = Handlebars.compile(footerTemplateHtml.substring(footerStartIndex));
        const footerMarkdown = footerTemplate(footerTemplateData);

        if (isSuggestionMode) {
            // --- AI提案モード用のプロンプト ---
            const startDate = $('#trip-start-date').val();
            const endDate = $('#trip-end-date').val();
            let durationText = '';
            if (startDate && endDate) {
                // 日付から泊数を計算する簡易ロジック
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 0) {
                    durationText = `日帰り (${startDate})`;
                } else {
                    durationText = `${diffDays}泊${diffDays + 1}日 (${startDate} ～ ${endDate})`;
                }
            }

            let suggestionMarkdown = `# ★★★ 行先提案モード ★★★
あなたが行先も含めて、最高の旅行プランを提案してください。

### 旅行の基本条件
*   **出発地**: ${$('#departure-point').val()}
*   **到着空港・駅**: ${$('#arrival-point').val()}
*   **旅行期間**: ${durationText}
*   **メンバー構成・体力レベル**: ${$('#members').val()}
*   **旅のキーワード**: ${$('#trip-keywords').val()}
*   **最優先事項**: ${$('#priority').val()}
*   **備考・その他の要望**: 
    *   ${$('#trip-remarks').val().split('\n').join('\n    *   ')}
---
`;
            markdown = suggestionMarkdown + footerMarkdown;

        } else {
            const templateData = { general: {}, days: [], proactiveSuggestions: $('#proactive-suggestions').is(':checked') };
            templateData.general.departure = $('#departure-point').val();
            templateData.general.members = $('#members').val();
            templateData.general.theme = $('#theme').val();
            templateData.general.priority = $('#priority').val();
            $('.day-plan').each(function(index){
                const $dayDiv = $(this); const dateVal = $dayDiv.find('.travel-date').val();
                let date = null; if(dateVal) { date = new Date(dateVal + 'T00:00:00'); }
                const prefCode = $dayDiv.find('.prefecture-select').val();
                const prefName = prefectures[prefCode] || '';
                const cityName = $dayDiv.find('.city-select').val();
                let areaText = prefName;
                if (cityName) { areaText += ` (${cityName})`; }
                const dayData = {
                    dayNumber: index + 1,
                    date: date ? `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}` : '',
                    dayOfWeek: date ? ['日', '月', '火', '水', '木', '金', '土'][date.getDay()] : '',
                    area: areaText,
                    accommodation: $dayDiv.find('.accommodation').val(),
                    places: [],
                    doEat: $dayDiv.find('.must-do-eat').val().trim().split('\n').filter(Boolean),
                    notes: $dayDiv.find('.day-specific-notes').val().trim().split('\n').filter(Boolean)
                };
                $dayDiv.find('.places-container .dynamic-input-group').each(function(){
                    const name = $(this).find('.place-name').val().trim();
                    const url = $(this).find('.place-url').val().trim();
                    if (name) dayData.places.push({ name: name, url: url });
                });
                templateData.days.push(dayData);
            });
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

    $('#ai-suggestion-mode').on('change', function() {
        const isSuggestionMode = $(this).is(':checked');
        if (isSuggestionMode) {
            $('#ai-suggestion-inputs').slideDown();
            // 「旅行全体の基本情報」以外の通常フォームを隠す
            $('#days-container, .add-day-btn, #prompt-form > fieldset:nth-of-type(2)').slideUp();
        } else {
            $('#ai-suggestion-inputs').slideUp();
            // 通常フォームを再表示
            $('#days-container, .add-day-btn, #prompt-form > fieldset:nth-of-type(2)').slideDown();
        }
    });
    

    fetchPrefectures().done(function() {
        addDay(); 
    });
});
