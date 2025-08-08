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
                priority: "美術館に行く",
                transport: {}
            },
            days: [
                {
                    date: "2025-08-02",
                    area: "北海道",
                    city: "苫小牧市",
                    places: [
                        { name: "苫小牧市美術博物館", url: "https://example.com/museum" }
                    ],
                    doEat: ["ご当地名物を食べる"],
                    notes: [],
                    transport: {}
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
                transport: {}
            },
            days: [
                {
                    date: "2025-12-31",
                    area: "東京",
                    city: "渋谷",
                    accommodation: "都内のホテル",
                    places: [],
                    doEat: [],
                    notes: [],
                    transport: {}
                },
                {
                    date: "2026-01-01",
                    area: "神奈川",
                    city: "横浜市",
                    places: [
                        { name: "カップヌードルミュージアム",url: "" }
                    ],
                    doEat: [],
                    notes: [],
                    transport: {}
                }
            ]
        }
    },
    {
        name: "基本情報の往路・復路の交通情報",
        input: `# 旅行プランの作成依頼
### 旅行全体の基本情報
*   **出発地**: 東京
*   **メンバー構成・体力レベル**: 家族4人、子供連れ
*   **旅のテーマ・雰囲気**: 自然を満喫
*   **最優先事項**: 温泉
*   **往路の交通情報**: 飛行機 ANA123（羽田空港 08:00発 → 新千歳空港 09:30着）
*   **復路の交通情報**: 飛行機 JAL456（新千歳空港 18:00発 → 羽田空港 19:30着）

### 1日目（2025/09/01・月）
*   **主な活動エリア**: 北海道 (札幌市)
*   **宿泊先／最終目的地**: 札幌市内のホテル
*   **行きたい場所**:
    *   札幌時計台
*   **やりたいこと・食べたいもの**：
    *   ラーメンを食べる
`,
        expected: {
            general: {
                departure: "東京",
                members: "家族4人、子供連れ",
                theme: "自然を満喫",
                priority: "温泉",
                transport: {
                    outbound: {
                        type: "飛行機",
                        name: "ANA123",
                        depLocation: "羽田空港",
                        depTime: "08:00",
                        arrLocation: "新千歳空港",
                        arrTime: "09:30"
                    },
                    inbound: {
                        type: "飛行機",
                        name: "JAL456",
                        depLocation: "新千歳空港",
                        depTime: "18:00",
                        arrLocation: "羽田空港",
                        arrTime: "19:30"
                    }
                }
            },
            days: [
                {
                    date: "2025-09-01",
                    area: "北海道",
                    city: "札幌市",
                    accommodation: "札幌市内のホテル",
                    places: [
                        { name: "札幌時計台", url: "" }
                    ],
                    doEat: ["ラーメンを食べる"],
                    notes: [],
                    transport: {}
                }
            ]
        }
    },
    {
        name: "日ごとの交通情報と都道府県・市町村",
        input: `# 旅行プランの作成依頼
### 旅行全体の基本情報
*   **出発地**: 大阪

### 1日目（2025/10/10・金）
*   **主な活動エリア**: 京都府 (京都市)
*   **宿泊先／最終目的地**: 京都市内の旅館
*   **この日の主な移動**: 列車 新幹線こだま（新大阪 09:00発 → 京都 09:30着）
*   **行きたい場所**:
    *   金閣寺
*   **やりたいこと・食べたいもの**：
    *   京料理を堪能
`,
        expected: {
            general: {
                departure: "大阪",
                transport: {}
            },
            days: [
                {
                    date: "2025-10-10",
                    area: "京都府",
                    city: "京都市",
                    accommodation: "京都市内の旅館",
                    transport: {
                        type: "列車",
                        name: "新幹線こだま",
                        depLocation: "新大阪",
                        depTime: "09:00",
                        arrLocation: "京都",
                        arrTime: "09:30"
                    },
                    places: [
                        { name: "金閣寺", url: "" }
                    ],
                    doEat: ["京料理を堪能"],
                    notes: []
                }
            ]
        }
    }
];
