/**
 * @file Markdownの解析ロジックを管理します。
 * @author Gemini
 */

// =============================================
// Markdown解析モジュール (markdown_parser.js)
// 役割：Markdown文字列を解析し、アプリケーションで利用可能なJavaScriptオブジェクトに変換します。
// =============================================
const MARKDOWN_PARSER = (function() {

    // --- Helper Functions ---

    /**
     * markedのトークン配列からプレーンテキストを抽出します。
     * リンクは後で処理するために特殊な形式の文字列に変換します。
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
     * リストアイテムのトークンを解析し、キーと値のペアを抽出します。
     * 「**キー**: 値」という形式を認識します。
     * @param {object} item - markedのリストアイテムトークン。
     * @returns {{isKeyValue: boolean, key: string, value: string, rawText: string}} 解析結果。
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
                value = extractText(valueTokens).replace(/^[：:]\s*/, '').trim();
                isKeyValue = true;
            }
        }
        return { isKeyValue, key, value, rawText: extractText(item.tokens) };
    }

    /**
     * 交通情報の文字列を解析し、オブジェクトに変換します。
     * @param {string} transportString - 交通情報の文字列。
     * @returns {object} 解析された交通情報オブジェクト。
     */
    function parseTransportString(transportString) {
        const regex = /^(.+?)(?:\s(.+?))?\uFF08(.+?)\s(.+?)発\s→\s(.+?)\s(.+?)\u7740\uFF09$/;
        const match = transportString.match(regex);
        if (match) {
            return {
                type: match[1].trim(),
                name: match[2] ? match[2].trim() : '',
                depLocation: match[3].trim(),
                depTime: match[4].trim(),
                arrLocation: match[5].trim(),
                arrTime: match[6].trim()
            };
        }
        return {};
    }

    /**
     * 「旅行全体の基本情報」のリストを解析し、結果をオブジェクトに格納します。
     * @param {Array} items - 解析対象のリストアイテムのトークン配列。
     * @param {object} targetData - 解析結果を格納するオブジェクト。
     */
    function parseGeneralInfo(items, targetData) {
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

    // --- Mode-specific Parsers ---

    /**
     * AI提案モードのプロンプトを解析します。
     * @param {Array} tokens - markedのトークン配列。
     * @returns {object} 解析されたデータオブジェクト。
     */
    function parseSuggestionMode(tokens) {
        const data = { general: { transport: {} }, suggestion: {} };
        let currentSection = '';
        tokens.forEach(token => {
            if (token.type === 'heading' && token.depth === 3 && token.text.includes('旅行の基本条件')) {
                currentSection = 'suggestion';
            }
            if (token.type === 'list' && currentSection === 'suggestion') {
                parseGeneralInfo(token.items, data.general);
                token.items.forEach(item => {
                    const parsedItem = parseListItem(item);
                    if (parsedItem.isKeyValue) {
                        const key = parsedItem.key;
                        const value = parsedItem.value;
                        if (key.includes('到着空港・駅')) data.suggestion.arrivalPoint = value;
                        else if (key.includes('旅行期間')) {
                            let dateMatch = value.match(/日帰り \((\d{4}-\d{2}-\d{2})\)/) || value.match(/(\d{4}-\d{2}-\d{2})\s*～\s*(\d{4}-\d{2}-\d{2})/);
                            if (dateMatch) {
                                data.suggestion.startDate = dateMatch[1];
                                data.suggestion.endDate = dateMatch[2] || dateMatch[1];
                            }
                        }
                        else if (key.includes('備考・その他の要望')) {
                            let remarks = [];
                            if(item.tokens.length > 1 && item.tokens[1] && item.tokens[1].type === 'list') {
                                item.tokens[1].items.forEach(subItem => remarks.push(extractText(subItem.tokens).trim()));
                            }
                            data.suggestion.remarks = remarks;
                        }
                    }
                });
            }
        });
        return data;
    }

    /**
     * 通常プランニングモードのプロンプトを解析します。
     * @param {Array} tokens - markedのトークン配列。
     * @returns {object} 解析されたデータオブジェクト。
     */
    function parseStandardMode(tokens) {
        const data = { general: { transport: {} }, days: [], suggestion: {} };
        let currentSection = '';
        let currentDay = null;
        let currentListKey = '';

        tokens.forEach(token => {
            if (token.type === 'heading' && token.depth === 3) {
                const title = token.text;
                currentListKey = '';
                if (title.includes('旅行全体の基本情報')) {
                    currentSection = 'general';
                    let listToken = tokens[tokens.indexOf(token) + 1];
                    if (listToken && listToken.type === 'list') parseGeneralInfo(listToken.items, data.general);
                }
                else if (title.includes('日目')) {
                    currentSection = 'day';
                    currentDay = { places: [], doEat: [], notes: [], transport: {}, isAiSuggestion: false };
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
                            } else if (parsedItem.key.includes('プラン') && parsedItem.value.includes('AIにおまかせ')) {
                                currentDay.isAiSuggestion = true;
                            }
                        }
                        if(item.tokens.length > 1 && item.tokens[1] && item.tokens[1].type === 'list') {
                            item.tokens[1].items.forEach(subItem => {
                                const subItemText = extractText(subItem.tokens).trim();
                                if (currentDay && currentListKey) {
                                     if (currentListKey.includes('行きたい場所')) {
                                        const linkMatch = subItemText.match(/__LINK__(.+)__SEP__(.+)__ENDLINK__/);
                                        currentDay.places.push({ name: linkMatch ? linkMatch[1] : subItemText, url: linkMatch ? linkMatch[2] : '' });
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

    // --- Main parse function (Dispatcher) ---

    /**
     * Markdownテキストを解析するメインのエントリポイントです。
     * モードを判別し、適切なパーサー関数に処理を委譲します。
     * @param {string} text - 解析対象のMarkdownテキスト。
     * @returns {object|null} 解析されたデータオブジェクト。入力が空の場合はnull。
     */
    function parse(text) {
        if (!text || !text.trim()) return null;
        text = text.trim();
        let tokens = marked.lexer(text);

        const firstHeadingToken = tokens.find(token => token.type === 'heading');
        const isSuggestionMode = firstHeadingToken && firstHeadingToken.depth === 1 && firstHeadingToken.text === '★★★ 行先提案モード ★★★';
        
        let parsedData = isSuggestionMode ? parseSuggestionMode(tokens) : parseStandardMode(tokens);
        
        return { ...parsedData, isSuggestionMode };
    }

    return { parse: parse };

})();
