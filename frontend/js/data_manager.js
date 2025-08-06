// =============================================
// データモデルと永続化レイヤー (data_manager.js)
// 役割：フォームデータの取得・整形、Markdownの解析、localStorageへの保存・読込・削除を担当します。
// =============================================

const DATA_MANAGER = (function() {
    const MARKDOWN_STORAGE_KEY = 'travelPromptMarkdownOutput';

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

        const isSuggestionMode = text.startsWith('# ★★★ 行先提案モード ★★★');
        const data = { general: {}, days: [], suggestion: {}, isSuggestionMode: isSuggestionMode };
        const tokens = marked.lexer(text);

        // ヘルパー関数
        function extractText(tokens) {
             return tokens.map(t => {
                if (t.type === 'link') {
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
                    value = extractText(valueTokens).replace(/^:\s*/, '').trim();
                    isKeyValue = true;
                }
            }
            return { isKeyValue, key, value, rawText: extractText(item.tokens) };
        }

        if (isSuggestionMode) {
            // AI提案モード専用の解析ロジック
            let currentSection = '';
            tokens.forEach(token => {
                if (token.type === 'heading' && token.depth === 3 && token.text.includes('旅行の基本条件')) {
                    currentSection = 'suggestion';
                }
                if (token.type === 'list' && currentSection === 'suggestion') {
                    token.items.forEach(item => {
                        const parsedItem = parseListItem(item);
                        if (parsedItem.isKeyValue) {
                            const key = parsedItem.key;
                            const value = parsedItem.value;
                            if (key.includes('出発地')) data.general.departure = value;
                            else if (key.includes('到着空港・駅')) data.suggestion.arrivalPoint = value;
                            else if (key.includes('旅行期間')) {
                                const dateMatch = value.match(/(\d{4}-\d{2}-\d{2})\s*～\s*(\d{4}-\d{2}-\d{2})/);
                                if (dateMatch) {
                                    data.suggestion.startDate = dateMatch[1];
                                    data.suggestion.endDate = dateMatch[2];
                                }
                            }
                            else if (key.includes('メンバー構成')) data.general.members = value;
                            else if (key.includes('旅のキーワード')) data.suggestion.keywords = value;
                            else if (key.includes('最優先事項')) data.general.priority = value;
                            else if (key.includes('備考・その他の要望')) {
                                let remarks = [];
                                if(item.tokens.length > 1 && item.tokens[1] && item.tokens[1].type === 'list') {
                                    item.tokens[1].items.forEach(subItem => {
                                        remarks.push(extractText(subItem.tokens).trim());
                                    });
                                }
                                data.suggestion.remarks = remarks.join('\n');
                            }
                        }
                    });
                }
            });
        } else {
            // 既存の通常モード解析ロジック
            let currentSection = '';
            let currentDay = null;
            let currentListKey = '';

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
        }
        return data;
    }

    function saveMarkdown(markdown) {
        try {
            localStorage.setItem(MARKDOWN_STORAGE_KEY, markdown);
        } catch (e) {
            console.error('Markdownの保存に失敗しました。', e);
        }
    }

    function loadMarkdown() {
        return localStorage.getItem(MARKDOWN_STORAGE_KEY);
    }

    function deleteMarkdown() {
        localStorage.removeItem(MARKDOWN_STORAGE_KEY);
    }

    return {
        getCurrentFormData: getCurrentFormData,
        parseMarkdownFromText: parseMarkdownFromText,
        saveMarkdown: saveMarkdown,
        loadMarkdown: loadMarkdown,
        deleteMarkdown: deleteMarkdown
    };
})();
