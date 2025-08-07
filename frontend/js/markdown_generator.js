/**
 * @file Markdown生成に関連するロジックを管理します。
 * @author Gemini
 */

// =============================================
// Markdown生成モジュール (markdown_generator.js)
// 役割：指定されたデータからMarkdown文字列を生成することに特化します。
// =============================================
const MARKDOWN_GENERATOR = (function() {
    let templates = {}; // ここでテンプレートを保持

    /**
     * モジュールを初期化し、必要なテンプレートを設定します。
     * @param {object} compiledTemplates - UIモジュールから渡されるコンパイル済みテンプレート。
     */
    function initialize(compiledTemplates) {
        templates.markdown = compiledTemplates.markdown;
        templates.suggestionMarkdown = compiledTemplates.suggestionMarkdown;
    }

    /**
     * AI提案モードのマークダウンを生成します。
     * @param {object} data - テンプレートに渡すデータ。
     * @returns {string} 生成されたマークダウン。
     */
    function generateSuggestionMarkdown(data) {
        if (!templates.suggestionMarkdown) {
            console.error('Suggestion-Markdown template is not initialized.');
            return '';
        }
        return templates.suggestionMarkdown(data);
    }

    /**
     * 標準プランニングモードのマークダウンを生成します。
     * @param {object} data - テンプレートに渡すデータ。
     * @returns {string} 生成されたマークダウン。
     */
    function generateStandardMarkdown(data) {
        if (!templates.markdown) {
            console.error('Markdown template is not initialized.');
            return '';
        }
        return templates.markdown(data);
    }

    // 公開する関数を返す
    return {
        initialize: initialize,
        generateSuggestionMarkdown: generateSuggestionMarkdown,
        generateStandardMarkdown: generateStandardMarkdown
    };
})();