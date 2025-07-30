// テストランナーのロジック
// このファイルは、index.htmlから読み込まれます

// テスト結果を比較するためのヘルパー関数
// JSON.stringifyだとオブジェクトのキーの順序に影響されるため、より堅牢な比較を行う
function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;

    if (obj1 && typeof obj1 == 'object' && obj2 && typeof obj2 == 'object') {
        if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;

        for (var key in obj1) {
            if (obj2.hasOwnProperty(key)) {
                if (!deepEqual(obj1[key], obj2[key])) return false;
            } else {
                return false;
            }
        }
        return true;
    }
    return false;
}


$(document).ready(function(){
    // テスト実行ボタンのクリックイベント
    $('#run-tests-btn').on('click', function(){
        let passed = 0;
        let failed = 0;
        
        console.clear();
        console.log("%c--- シナリオテスト開始 ---", "color: blue; font-size: 16px;");

        if (typeof scenarios === 'undefined') {
            alert('テストシナリオ(test_scenarios.js)が読み込めていません。');
            return;
        }

        // すべてのシナリオを順番に実行
        scenarios.forEach((scenario, index) => {
            console.group(`Test Case ${index + 1}: ${scenario.name}`);
            try {
                // グローバルスコープにあるパーサー関数を呼び出す
                const actual = parseMarkdownFromText(scenario.input);
                
                // 期待値のデフォルト値を補完
                // const expected = $.extend(true, {}, {
                //     general: { departure: "札幌", members: "", theme: "", priority: "" },
                //     days: []
                // }, scenario.expected);
                const expected = scenario.expected;

                // 結果と期待値を比較
                if (deepEqual(actual, expected)) {
                    console.log("%c✅ PASS", "color: green; font-weight: bold;");
                    passed++;
                } else {
                    console.error("%c❌ FAIL", "color: red; font-weight: bold;");
                    console.log("期待値 (Expected):", expected);
                    console.log("実際の結果 (Actual):", actual);
                    failed++;
                }
            } catch (e) {
                console.error("%c❌ ERROR", "color: red; font-weight: bold;", e);
                failed++;
            }
            console.groupEnd();
        });

        console.log(`%c--- テスト完了：${passed}件成功, ${failed}件失敗 ---`, "color: blue; font-size: 16px;");
        alert(`テスト完了：${passed}件成功, ${failed}件失敗\n詳細はコンソールを確認してください。`);
    });
});