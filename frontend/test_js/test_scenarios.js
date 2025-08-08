const scenarios = [
    // =============================================
    // パーサー単体テスト
    // =============================================
    {
        name: "[パーサー] 基本情報と1日のシンプルなプラン",
        test: async function(assert, simulate) {
            const input = `# 旅行プランの作成依頼
### 旅行全体の基本情報
*   **出発地**：札幌
*   **最優先事項**：美術館に行く

### 1日目（2025/8/2・土）
*   **主な活動エリア**：北海道 (苫小牧市)
*   **行きたい場所**：
    *   [苫小牧市美術博物館](https://example.com/museum)
*   **やりたいこと・食べたいもの**：
    *   ご当地名物を食べる
`;
            const expected = {
                general: { departure: "札幌", priority: "美術館に行く", transport: {} },
                days: [ { date: "2025-08-02", area: "北海道", city: "苫小牧市", places: [ { name: "苫小牧市美術博物館", url: "https://example.com/museum" } ], doEat: ["ご当地名物を食べる"], notes: [], transport: {} } ],
                suggestion: {}, isSuggestionMode: false
            };
            const actual = MARKDOWN_PARSER.parse(input);
            assert.deepEquals(actual, expected, "基本的なパースが正しく行われること");
        }
    },
    {
        name: "[パーサー] 複雑なプロンプトの読み込みテスト",
        test: async function(assert, simulate) {
            const input = `# 旅行プランの作成依頼
### 旅行全体の基本情報
*   **出発地**: 東京
*   **メンバー構成・体力レベル**: 30代夫婦、体力に自信あり
*   **往路の交通情報**: 飛行機 ANA123（羽田空港 08:00発 → 新千歳空港 09:30着）
### 1日目（2025/09/01・月）
*   **主な活動エリア**: 北海道 (札幌市)
*   **この日の主な移動**: バス （札幌駅 10:00発 → 大通公園 10:15着）
*   **行きたい場所**:
    *   [札幌時計台](https://example.com/sapporo-clock-tower)
`;
            const expected = {
                general: {
                    departure: "東京", members: "30代夫婦、体力に自信あり",
                    transport: { outbound: { type: "飛行機", name: "ANA123", depLocation: "羽田空港", depTime: "08:00", arrLocation: "新千歳空港", arrTime: "09:30" } }
                },
                days: [ { 
                    date: "2025-09-01", area: "北海道", city: "札幌市", 
                    transport: { type: "バス", name: "", depLocation: "札幌駅", depTime: "10:00", arrLocation: "大通公園", arrTime: "10:15" },
                    places: [ { name: "札幌時計台", url: "https://example.com/sapporo-clock-tower" } ],
                    doEat: [], notes: []
                } ],
                suggestion: {}, isSuggestionMode: false
            };
            const actual = MARKDOWN_PARSER.parse(input);
            assert.deepEquals(actual, expected, "交通情報を含む複雑なパースが正しく行われること");
        }
    },

    // =============================================
    // UI連携テスト
    // =============================================
    {
        name: "[UI] AI提案モードのプロンプトを読み込んでフォームに反映する",
        test: async function(assert, simulate) {
            // 1. テスト用のプロンプトを定義
            const prompt = `# ★★★ 行先提案モード ★★★
あなたが行先も含めて、最高の旅行プランを提案してください.

### 旅行の基本条件
*   **出発地**: 横浜
*   **到着空港・駅**: 那覇空港
*   **旅行期間**: 2泊3日 (2025-10-01 ～ 2025-10-03)
*   **メンバー構成・体力レベル**: 家族4人
*   **旅のテーマ・雰囲気**: 沖縄の自然を満喫
*   **最優先事項**: 美ら海水族館に行くこと
*   **備考・その他の要望**:
    *   レンタカーを借りたい
`;

            // 2. UI操作をシミュレート
            simulate.input('#import-prompt', prompt);
            simulate.click('.import-button');

            // 3. 結果を検証
            assert.isTrue($('#ai-suggestion-mode').is(':checked'), 'AI提案モードのチェックボックスがONになっていること');
            assert.equals($('#departure-point').val(), '横浜', '出発地が正しく設定されていること');
            assert.equals($('#members').val(), '家族4人', 'メンバー構成が正しく設定されていること');
            assert.equals($('#theme').val(), '沖縄の自然を満喫', 'テーマが正しく設定されていること');
            assert.equals($('#priority').val(), '美ら海水族館に行くこと', '最優先事項が正しく設定されていること');
            assert.equals($('#arrival-point').val(), '那覇空港', '到着空港・駅が正しく設定されていること');
            assert.equals($('#trip-start-date').val(), '2025-10-01', '開始日が正しく設定されていること');
            assert.equals($('#trip-end-date').val(), '2025-10-03', '終了日が正しく設定されていること');
            assert.equals($('#trip-remarks').val(), 'レンタカーを借りたい', '備考が正しく設定されていること');
        }
    }
];
