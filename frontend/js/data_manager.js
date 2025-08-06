// =============================================
// データモデルと永続化レイヤー (data_manager.js)
// 役割：フォームデータの取得・整形、Markdownの解析、localStorageへの保存・読込・削除を担当します。
// =============================================

const DATA_MANAGER = (function() {
    const LOCAL_STORAGE_KEY = 'travelPromptGeneratorPlan';

    function getCurrentFormData() {
        const data = { general: {}, days: [] };
        data.general.departure = $('#departure-point').val();
        data.general.members = $('#members').val();
        data.general.theme = $('#theme').val() || $('#theme').attr('placeholder');
        data.general.priority = $('#priority').val() || $('#priority').attr('placeholder');

        $('.day-plan').each(function(){
            const $dayDiv = $(this);
            const prefCode = $dayDiv.find('.open-prefecture-modal-btn').data('pref-code');
            const prefName = UI.getPrefectures()[prefCode] || '';

            const dayData = {
                date: $dayDiv.find('.travel-date').val(),
                prefCode: prefCode, // prefCodeも保存
                area: prefName,
                city: $dayDiv.find('.city-select').val(),
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
            data.days.push(dayData);
        });
        return data;
    }

    function parseMarkdownFromText(text) {
        if (!text || !text.trim()) return null;
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
        tokens.forEach(token => {
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
                                            currentDay.places.push({ name: subItemText, url: '' });
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

    function savePlan() {
        try {
            const currentData = getCurrentFormData();
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentData));
            UI.showStatusMessage(`現在のプランを保存しました (${new Date().toLocaleTimeString()})`);
        } catch (e) {
            alert('プランの保存に失敗しました。');
            console.error(e);
        }
    }

    function loadPlan() {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            if (confirm('保存されているプランを読み込みますか？現在の入力内容は上書きされます。')) {
                // MarkdownではなくJSONをパースするように修正
                UI.populateFormFromData(JSON.parse(savedData));
                UI.showStatusMessage('保存されたプランを読み込みました。');
            }
        } else {
            alert('保存されているプランはありません。');
        }
    }

    function deletePlan() {
        if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
            if (confirm('本当に保存したプランを削除しますか？この操作は元に戻せません。')) {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                UI.showStatusMessage('保存したプランを削除しました。');
            }
        }
        else {
            alert('削除するプランはありません。');
        }
    }

    function autoLoadPlan() {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            UI.populateFormFromData(JSON.parse(savedData));
            UI.showStatusMessage('前回保存したプランを自動で読み込みました。');
            return true;
        }
        return false;
    }

    return {
        save: savePlan,
        load: loadPlan,
        delete: deletePlan,
        autoLoad: autoLoadPlan,
        getCurrentFormData: getCurrentFormData,
        parseMarkdownFromText: parseMarkdownFromText
    };
})();