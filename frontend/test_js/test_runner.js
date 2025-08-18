// テストランナーのロジック
// このファイルは、index.htmlから読み込まれます

// =============================================
// テストフレームワーク
// =============================================
const TEST_RUNNER = (function(){
    let passed = 0;
    let failed = 0;

    // --- ヘルパー関数 ---
    function deepEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        if (obj1 && typeof obj1 == 'object' && obj2 && typeof obj2 == 'object') {
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);
            if (keys1.length !== keys2.length) return false;
            for (const key of keys1) {
                if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    // --- アサーション関数 ---
    const assert = {
        equals: function(actual, expected, message) {
            if (actual !== expected) {
                throw new Error(`${message}\n[期待値]: ${expected}\n[実際値]: ${actual}`);
            }
        },
        deepEquals: function(actual, expected, message) {
            if (!deepEqual(actual, expected)) {
                throw new Error(`${message}\n[期待値]: ${JSON.stringify(expected, null, 2)}\n[実際値]: ${JSON.stringify(actual, null, 2)}`);
            }
        },
        isTrue: function(value, message) {
            if (!value) {
                throw new Error(message);
            }
        }
    };

    // --- UI操作シミュレーター ---
    const simulate = {
        input: function(selector, value) {
            $(selector).val(value).trigger('change');
        },
        click: function(selector) {
            $(selector).trigger('click');
        }
    };

    // --- テスト実行 --- 
    async function runTest(scenario) {
        console.group(`Test Case: ${scenario.name}`);
        try {
            // --- テスト前にフォームをリセットし、テスト間の影響をなくす ---
            if ($('#ai-suggestion-mode').is(':checked')) {
                $('#ai-suggestion-mode').trigger('click');
            }
            while($('.day-plan').length > 1) {
                $('.day-plan:last .remove-day-btn').trigger('click');
            }
            $('#prompt-form')[0].reset();
            $('#import-prompt').val('');
            $('.day-plan:first .open-prefecture-modal-btn').text('都道府県を選択').data('pref-code', '');
            $('.day-plan:first .open-city-modal-btn').text('市町村を選択').data('city-name', '').prop('disabled', true);
            // 「行きたい場所」をリセットして、新しい空の入力欄を1つだけにする
            $('.day-plan:first .places-container').empty();
            $('.day-plan:first .add-place-btn').trigger('click');
            // -----------------------------------------------------

            await scenario.test(assert, simulate);
            console.log("%c✅ PASS", "color: green; font-weight: bold;");
            passed++;
        } catch (e) {
            console.error("%c❌ FAIL", "color: red; font-weight: bold;", e.message);
            failed++;
        }
        console.groupEnd();
    }

    async function runAllTests() {
        passed = 0;
        failed = 0;
        console.clear();
        console.log("%c--- シナリオテスト開始 ---", "color: blue; font-size: 16px;");

        if (typeof scenarios === 'undefined') {
            alert('テストシナリオ(test_scenarios.js)が読み込めていません。');
            return;
        }

        for (const scenario of scenarios) {
            await runTest(scenario);
        }

        console.log(`%c--- テスト完了：${passed}件成功, ${failed}件失敗 ---`, "color: blue; font-size: 16px;");
        alert(`テスト完了：${passed}件成功, ${failed}件失敗\n詳細はコンソールを確認してください。\n\nフォームを初期化するため、ページをリロードします。`);
        location.reload();
    }

    return {
        runAllTests
    };
})();

// DOM読み込み後にイベントリスナーを登録
document.addEventListener('DOMContentLoaded', function() {
    // ローカル環境でのみテストボタンを表示
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        const runTestsBtn = document.getElementById('run-tests-btn');
        if (runTestsBtn) {
            runTestsBtn.style.display = 'block';
            runTestsBtn.addEventListener('click', TEST_RUNNER.runAllTests);
        }
    }
});