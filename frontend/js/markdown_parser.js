/**
 * @file Markdownの解析ロジックを管理します。
 * @author Gemini
 */

// =============================================
// Markdown解析モジュール (markdown_parser.js)
// 役割：Markdown文字列を解析し、アプリケーションで利用可能なJavaScriptオブジェクトに変換します。
// =============================================
const MARKDOWN_PARSER = (function() {

    /**
     * markedのトークンからテキストを抽出します。リンクは特殊な形式で保持します。
     * @param {Array} tokens - markedのトークン配列。
     * @returns {string} 抽出されたテキスト。
     */
    function extractText(tokens) {
         return tokens.map(t => {
            if (t.type === 'link') {
                return `__LINK__${t.text}__SEP__${t.href}__ENDLINK__`;
            }
            return t.tokens ? extractText(t.tokens) : t.text;
        }).join('');
    }

    /**
     * リストアイテムのトークンを解析し、キーと値、または単なるテキストを返します。
     * @param {object} item - markedのリストアイテムトークン。
     * @returns {object} 解析結果。
     */
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

    /**
     * Markdownテキストを解析して旅行プランのデータを抽出します。
     * @param {string} text - 解析対象のMarkdownテキスト。
     * @returns {object|null} 解析されたデータオブジェクト。入力が空の場合はnull。
     */
    function parse(text) {
        if (!text || !text.trim()) return null;

        text = text.trim(); // 先頭と末尾の空白文字を削除

        const tokens = marked.lexer(text);
        const firstHeadingToken = tokens.find(token => token.type === 'heading');
        const isSuggestionMode = firstHeadingToken && firstHeadingToken.depth === 1 && firstHeadingToken.text === '★★★ 行先提案モード ★★★';
        const data = { general: {}, days: [], suggestion: {}, isSuggestionMode: isSuggestionMode };

        /**
         * 交通情報の文字列を解析します。
         * @param {string} transportString - 交通情報の文字列。
         * @returns {object} 解析された交通情報オブジェクト。
         */
        function parseTransportString(transportString) {
            // Updated regex to handle optional name and more robust whitespace matching
            // Group 1: type, Group 2: name (optional), Group 3: depLocation, Group 4: depTime, Group 5: arrLocation, Group 6: arrTime
            const regex = /^(.+?)(?:\s(.+?))?\uFF08(.+?)\s(.+?)発\s→\s(.+?)\s(.+?)\u7740\uFF09$/;
            const match = transportString.match(regex);
            if (match) {
                const type = match[1].trim();
                const name = match[2] ? match[2].trim() : ''; // name is now match[2], can be undefined
                const depLocation = match[3].trim();
                const depTime = match[4].trim();
                const arrLocation = match[5].trim();
                const arrTime = match[6].trim();

                return {
                    type: type,
                    name: name,
                    depLocation: depLocation,
                    depTime: depTime,
                    arrLocation: arrLocation,
                    arrTime: arrTime
                };
            }
            return {};
        }

        // 共通の基本情報パース処理
        function parseGeneralInfo(items, targetData) {
            targetData.transport = {}; // Initialize transport object
            items.forEach(item => {
                const parsedItem = parseListItem(item);
                if (parsedItem.isKeyValue) {
                    const key = parsedItem.key;
                    const value = parsedItem.value;
                    if (key.includes('出発地')) targetData.departure = value;
                    else if (key.includes('メンバー構成')) targetData.members = value;
                    else if (key.includes('旅のテーマ')) targetData.theme = value;
                    else if (key.includes('最優先事項')) targetData.priority = value;
                    else if (key.includes('往路の交通情報')) targetData.transport.outbound = parseTransportString(value);
                    else if (key.includes('復路の交通情報')) targetData.transport.inbound = parseTransportString(value);
                }
            });
        }

        if (isSuggestionMode) {
            // AI提案モード専用の解析ロジック
            let currentSection = '';
            tokens.forEach(token => {
                if (token.type === 'heading' && token.depth === 3 && token.text.includes('旅行の基本条件')) {
                    currentSection = 'suggestion';
                }
                if (token.type === 'list' && currentSection === 'suggestion') {
                    // 基本情報をパース
                    parseGeneralInfo(token.items, data.general);

                    token.items.forEach(item => {
                        const parsedItem = parseListItem(item);
                        if (parsedItem.isKeyValue) {
                            const key = parsedItem.key;
                            const value = parsedItem.value;
                            if (key.includes('到着空港・駅')) data.suggestion.arrivalPoint = value;
                            else if (key.includes('旅行期間')) {
                                // 「日帰り (YYYY-MM-DD)」形式の解析
                                let dateMatch = value.match(/日帰り \((\d{4}-\d{2}-\d{2})\)/);
                                if (dateMatch) {
                                    data.suggestion.startDate = dateMatch[1];
                                    data.suggestion.endDate = dateMatch[1]; // 日帰りの場合、開始日と終了日は同じ
                                } else {
                                    // 「X泊Y日 (YYYY-MM-DD ～ YYYY-MM-DD)」形式の解析
                                    dateMatch = value.match(/(\d{4}-\d{2}-\d{2})\s*～\s*(\d{4}-\d{2}-\d{2})/);
                                    if (dateMatch) {
                                        data.suggestion.startDate = dateMatch[1];
                                        data.suggestion.endDate = dateMatch[2];
                                    }
                                }
                            }
                            else if (key.includes('備考・その他の要望')) {
                                let remarks = [];
                                if(item.tokens.length > 1 && item.tokens[1] && item.tokens[1].type === 'list') {
                                    item.tokens[1].items.forEach(subItem => {
                                        remarks.push(extractText(subItem.tokens).trim());
                                    });
                                }
                                data.suggestion.remarks = remarks;
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
                    if (title.includes('旅行全体の基本情報')) {
                        currentSection = 'general';
                        // 基本情報をパース
                        const generalListToken = tokens[tokens.indexOf(token) + 1]; // 次のトークンがリストであることを期待
                        if (generalListToken && generalListToken.type === 'list') {
                            parseGeneralInfo(generalListToken.items, data.general);
                        }
                    }
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
                            // 基本情報は共通関数でパース済みのためスキップ
                            if (currentSection === 'general') return;

                            if (currentDay) {
                                if (parsedItem.key.includes('主な活動エリア')) {
                                    const areaParts = parsedItem.value.match(/(.+?)\s*[(\(](.+?)[)\)]/);
                                    currentDay.area = areaParts ? areaParts[1].trim() : parsedItem.value;
                                    currentDay.city = areaParts ? areaParts[2].trim() : '';
                                } else if (parsedItem.key.includes('宿泊先')) {
                                    currentDay.accommodation = parsedItem.value;
                                } else if (parsedItem.key.includes('この日の主な移動')) {
                                    currentDay.transport = parseTransportString(parsedItem.value);
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

    // 公開する関数を返す
    return {
        parse: parse
    };
})();
