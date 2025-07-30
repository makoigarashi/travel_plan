const scenarios = [
    {
        name: "基本情報と1日のシンプルなプラン",
        input: `# 旅行プランの作成依頼
### 旅行全体の基本情報
*   **出発地**：札幌
*   **最優先事項**：美術館に行く

### 1日目（2025/8/2・土）
*   **主な活動エリア**：北海道 (苫小牧市)
*   **行きたい場所**：
    *   [苫小牧市美術博物館](https://example.com/museum)
*   **やりたいこと・食べたいもの**：
    *   ご当地名物を食べる
`,
        expected: {
            general: {
                departure: "札幌",
                members: "",
                theme: "",
                priority: "美術館に行く"
            },
            days: [
                {
                    date: "2025-08-02",
                    area: "北海道",
                    city: "苫小牧市",
                    accommodation: "",
                    places: [
                        { name: "苫小牧市美術博物館", url: "https://example.com/museum" }
                    ],
                    doEat: ["ご当地名物を食べる"],
                    notes: []
                }
            ]
        }
    },
    {
        name: "複数日と年跨ぎのプラン",
        input: `# 旅行プランの作成依頼
### 1日目（2025/12/31・水）
*   **主な活動エリア**：東京 (渋谷)
*   **宿泊先／最終目的地**：都内のホテル
### 2日目（2026/1/1・木）
*   **主な活動エリア**：神奈川 (横浜市)
*   **行きたい場所**：
    *   カップヌードルミュージアム
`,
        expected: {
            general: {
                departure: "札幌", // デフォルト値が反映されることを期待
                members: "",
                theme: "",
                priority: ""
            },
            days: [
                {
                    date: "2025-12-31",
                    area: "東京",
                    city: "渋谷",
                    accommodation: "都内のホテル",
                    places: [],
                    doEat: [],
                    notes: []
                },
                {
                    date: "2026-01-01",
                    area: "神奈川",
                    city: "横浜市",
                    accommodation: "",
                    places: [
                        { name: "カップヌードルミュージアム", url: "" }
                    ],
                    doEat: [],
                    notes: []
                }
            ]
        }
    }
];