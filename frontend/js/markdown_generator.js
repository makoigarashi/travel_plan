/**
 * @file Markdown生成に関連するロジックを管理します。
 * @author Gemini
 */

// =============================================
// Markdown生成モジュール (markdown_generator.js)
// 役割：指定されたデータからMarkdown文字列を生成することに特化します。
// =============================================
const MARKDOWN_GENERATOR = (function() {

    // 各テンプレートをコンパイル
    const markdownTemplate = Handlebars.compile($('#markdown-template').html());
    const suggestionMarkdownTemplate = Handlebars.compile($('#suggestion-markdown-template').html());
    const footerTemplateHtml = $('#markdown-template').html();
    const footerStartIndex = footerTemplateHtml.indexOf('### AIへの特別指示');
    const footerTemplate = Handlebars.compile(footerTemplateHtml.substring(footerStartIndex));

    /**
     * AI提案モードのマークダウンを生成します。
     * @param {object} data - テンプレートに渡すデータ。
     * @returns {string} 生成されたマークダウン。
     */
    function generateSuggestionMarkdown(data) {
        return suggestionMarkdownTemplate(data);
    }

    /**
     * 標準プランニングモードのマークダウンを生成します。
     * @param {object} data - テンプレートに渡すデータ。
     * @returns {string} 生成されたマークダウン。
     */
    function generateStandardMarkdown(data) {
        return markdownTemplate(data);
    }

    // 公開する関数を返す
    return {
        generateSuggestionMarkdown: generateSuggestionMarkdown,
        generateStandardMarkdown: generateStandardMarkdown
    };
})();
