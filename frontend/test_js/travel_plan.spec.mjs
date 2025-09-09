import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // APIリクエストをモックして、バックエンドへの依存をなくす
  await page.route('**/api=prefectures', async route => {
    const prefectures = {"01":"北海道","02":"青森県","03":"岩手県","04":"宮城県","05":"秋田県","06":"山形県","07":"福島県","08":"茨城県","09":"栃木県","10":"群馬県","11":"埼玉県","12":"千葉県","13":"東京都","14":"神奈川県","15":"新潟県","16":"富山県","17":"石川県","18":"福井県","19":"山梨県","20":"長野県","21":"岐阜県","22":"静岡県","23":"愛知県","24":"三重県","25":"滋賀県","26":"京都府","27":"大阪府","28":"兵庫県","29":"奈良県","30":"和歌山県","31":"鳥取県","32":"島根県","33":"岡山県","34":"広島県","35":"山口県","36":"徳島県","37":"香川県","38":"愛媛県","39":"高知県","40":"福岡県","41":"佐賀県","42":"長崎県","43":"熊本県","44":"大分県","45":"宮崎県","46":"鹿児島県","47":"沖縄県"};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(prefectures) });
  });
  await page.route('**/api=cities**', async (route, request) => {
    const url = new URL(request.url());
    const prefCode = url.searchParams.get('prefCode');
    let cities = [];
    if (prefCode === '01') {
      cities = [{ name: '札幌市', katakana: 'サッポロシ' }, { name: '苫小牧市', katakana: 'トマコマイシ' }];
    } else if (prefCode === '13') {
        cities = [{ name: '千代田区', katakana: 'チヨダク' }];
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cities) });
  });

  // settings APIをモック
  await page.route('**/api/settings', async route => {
    const mockSettings = {
      defaultValues: {
        departure: "札幌",
        members: "50代、1人、体力に少し不安",
        theme: "美術館に行く",
        priority: "節約志向"
      },
      themes: {
        "食事": [
            { "id": "theme-gourmet", "name": "グルメ", "icon": "🍴" },
            { "id": "theme-cafe", "name": "カフェ巡り", "icon": "☕" },
            { "id": "theme-local-cuisine", "name": "郷土料理", "icon": "🍲" },
            { "id": "theme-b-gourmet", "name": "B級グルメ", "icon": "😋" }
        ],
        "観光・文化": [
            { "id": "theme-museums", "name": "美術館・博物館", "icon": "🖼️" },
            { "id": "theme-scenic-spots", "name": "絶景スポット", "icon": "🏞️" },
            { "id": "theme-tourist-spots", "name": "観光名所", "icon": "📍" }
        ],
        "体験・アクティビティ": [
            { "id": "theme-hot-springs", "name": "温泉", "icon": "♨️" },
            { "id": "theme-cycling", "name": "サイクリング", "icon": "🚲" },
            { "id": "theme-crafts", "name": "伝統工芸体験", "icon": "🏺" },
            { "id": "theme-strolling", "name": "散策", "icon": "🚶" }
        ],
        "その他": [
            { "id": "theme-shopping", "name": "ショッピング", "icon": "🛍️" },
            { "id": "theme-souvenirs", "name": "お土産探し", "icon": "🎁" },
            { "id": "theme-relax", "name": "のんびり", "icon": "😌" }
        ]
      }
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSettings) });
  });

  // confirmやalertダイアログがテストをブロックしないように、自動で閉じる
  page.on('dialog', dialog => dialog.dismiss());

  // テスト対象ページに移動
  await page.goto('/index.html', { timeout: 60000 }); // タイムアウトを60秒に延長

  // ページの初期化が完了したことを、h1要素が表示されることで確認する
  await expect(page.locator('h1:has-text("旅行プラン・プロンプトジェネレーター")')).toBeVisible({ timeout: 10000 });
});

// --- パーサー単体テスト (UI経由で検証) ---

test('[UI] 基本情報と1日のシンプルなプランのインポート', async ({ page }) => {
  const input = `# 旅行プランの作成依頼
### 旅行全体の基本情報
*   **出発地**：札幌
*   **最優先事項**：美術館に行く

### 1日目（2025/8/2・土）
*   **主な活動エリア**：北海道 (苫小牧市)
*   **行きたい場所**:
    *   [苫小牧市美術博物館](https://example.com/museum)
*   **やりたいこと・食べたいもの**:
    *   ご当地名物を食べる
`;

  const importButton = page.locator('.toggle-import-btn');
  await importButton.waitFor({ state: 'visible' });
  await importButton.click();
  await page.locator('#import-area').waitFor({ state: 'visible' }); // 親要素の可視化を待つ
  await page.locator('#import-prompt').waitFor({ state: 'visible' }); // Add this line
  await page.locator('#import-prompt').fill(input);
  await page.locator('.import-button').click();

  // 結果を検証
  await expect(page.locator('#departure-point')).toHaveValue('札幌');
  await expect(page.locator('#priority')).toHaveValue('美術館に行く');

  await expect(page.locator('.day-plan:first-child .open-prefecture-modal-btn')).toHaveText('北海道');
  await expect(page.locator('.day-plan:first-child .open-city-modal-btn')).toHaveText('苫小牧市');

  await expect(page.locator('.day-plan:first-child .place-name')).toHaveValue('苫小牧市美術博物館');
  await expect(page.locator('.day-plan:first-child .place-url')).toHaveValue('https://example.com/museum');
});

test('[UI] 複雑なプロンプトの読み込みテスト', async ({ page }) => {
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

  const importButton = page.locator('.toggle-import-btn');
  await importButton.waitFor({ state: 'visible' });
  await importButton.click();
  await page.locator('#import-area').waitFor({ state: 'visible' }); // 親要素の可視化を待つ
  await page.locator('#import-prompt').fill(input);
  await page.locator('.import-button').click();

  await expect(page.locator('#departure-point')).toHaveValue('東京');
  await expect(page.locator('#members')).toHaveValue('30代夫婦、体力に自信あり');
  await expect(page.locator('#outbound-transport-type')).toHaveValue('飛行機');
  await expect(page.locator('#outbound-transport-name')).toHaveValue('ANA123');
  await expect(page.locator('#outbound-dep-location')).toHaveValue('羽田空港');
  await expect(page.locator('#outbound-dep-hour')).toHaveValue('08');
  await expect(page.locator('#outbound-dep-minute')).toHaveValue('00');
  await expect(page.locator('#outbound-arr-location')).toHaveValue('新千歳空港');
  await expect(page.locator('#outbound-arr-hour')).toHaveValue('09');
  await expect(page.locator('#outbound-arr-minute')).toHaveValue('30');

  await expect(page.locator('.day-plan:first-child .travel-date')).toHaveValue('2025-09-01');
  await expect(page.locator('.day-plan:first-child .open-prefecture-modal-btn')).toHaveText('北海道');
  await expect(page.locator('.day-plan:first-child .open-city-modal-btn')).toHaveText('札幌市');
  await expect(page.locator('.day-plan:first-child .day-transport-type')).toHaveValue('バス');
  await expect(page.locator('.day-plan:first-child .day-transport-dep-location')).toHaveValue('札幌駅');
  await expect(page.locator('.day-plan:first-child .day-transport-dep-hour')).toHaveValue('10');
  await expect(page.locator('.day-plan:first-child .day-transport-dep-minute')).toHaveValue('00');
  await expect(page.locator('.day-plan:first-child .day-transport-arr-location')).toHaveValue('大通公園');
  await expect(page.locator('.day-plan:first-child .day-transport-arr-hour')).toHaveValue('10');
  await expect(page.locator('.day-plan:first-child .day-transport-arr-minute')).toHaveValue('15');
  await expect(page.locator('.day-plan:first-child .place-name')).toHaveValue('札幌時計台');
  await expect(page.locator('.day-plan:first-child .place-url')).toHaveValue('https://example.com/sapporo-clock-tower');
});

test('[UI] AI提案モードのプロンプトを読み込んでフォームに反映する', async ({ page }) => {
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

  const importButton = page.locator('.toggle-import-btn');
  await importButton.waitFor({ state: 'visible' });
  await importButton.click(); // インポートエリアを開く
  await page.locator('#import-area').waitFor({ state: 'visible' }); // 親要素の可視化を待つ
  await page.locator('#import-prompt').fill(prompt);
  await page.locator('.import-button').click();

  await expect(page.locator('#ai-suggestion-mode')).toBeChecked();
  await expect(page.locator('#departure-point')).toHaveValue('横浜');
  await expect(page.locator('#members')).toHaveValue('家族4人');
  await expect(page.locator('#theme')).toHaveValue('沖縄の自然を満喫');
  await expect(page.locator('#priority')).toHaveValue('美ら海水族館に行くこと');
  await expect(page.locator('#arrival-point')).toHaveValue('那覇空港');
  await expect(page.locator('#trip-start-date')).toHaveValue('2025-10-01');
  await expect(page.locator('#trip-end-date')).toHaveValue('2025-10-03');
  await expect(page.locator('#trip-remarks')).toHaveValue('レンタカーを借りたい');
});

test('[UI] 日ごとのAIおまかせモードの生成と復元', async ({ page }) => {
  // --- Part 1: 生成テスト ---
  // 1日目の設定
  await page.locator('.day-plan:first-child .travel-date').fill('2025-11-01');
  await page.locator('.day-plan:first-child .accommodation').fill('ホテルA');
  // 2日目を追加
  await page.locator('.add-day-btn').click();
  // 2日目を「AIにおまかせ」にする
  await page.locator('.day-plan:last-child .day-ai-suggestion-mode').click();
  await page.locator('.day-plan:last-child .accommodation').fill('ホテルB');

  // 2. Markdownを生成
  await page.locator('.generate-btn').click();
  await page.waitForFunction(() => document.getElementById('output-markdown').value.length > 0);
  const generatedMarkdown = await page.locator('#output-markdown').inputValue();

  // 3. 生成されたMarkdownを検証
  await expect(generatedMarkdown).toContain('### 1日目（2025/11/1・土）');
  await expect(generatedMarkdown).toContain('*   **宿泊先／最終目的地**: ホテルA');
  await expect(generatedMarkdown).toContain('### 2日目（2025/11/2・日）');
  await expect(generatedMarkdown).toContain('*   **宿泊先／最終目的地**: ホテルB');
  await expect(generatedMarkdown).toContain('この日はAIにおまかせします');
  await expect(generatedMarkdown).not.toContain('**主な活動エリア**:'); // おまかせモードではエリアは含まれない

  // --- Part 2: 復元テスト ---
  // 1. Part 1で生成したMarkdownをインポートエリアに設定
  const importButton = page.locator('.toggle-import-btn');
  await importButton.waitFor({ state: 'visible' });
  await importButton.click(); // インポートエリアを開く
  await page.locator('#import-area').waitFor({ state: 'visible' });
  await page.locator('#import-prompt').fill(generatedMarkdown);
  await page.locator('.import-button').click();

  // 2. フォームの状態を検証
  await expect(page.locator('.day-plan')).toHaveCount(2);
  // 1日目の検証
  await expect(page.locator('.day-plan:first-child .day-ai-suggestion-mode')).not.toBeChecked();
  await expect(page.locator('.day-plan:first-child .accommodation')).toHaveValue('ホテルA');
  // 2日目の検証
  await expect(page.locator('.day-plan:last-child .day-ai-suggestion-mode')).toBeChecked();
  await expect(page.locator('.day-plan:last-child .accommodation')).toHaveValue('ホテルB');
  await expect(page.locator('.day-plan:last-child .day-manual-inputs')).not.toBeVisible();
});

test('[UI] 日帰りチェックボックスの挙動', async ({ page }) => {
  // 1. 1日目にのみチェックボックスが表示されることを確認
  await expect(page.locator('.day-plan').first().locator('.day-trip-option')).toBeVisible();

  // 2. 2日目を追加し、そこにはチェックボックスがないことを確認
  await page.locator('.add-day-btn').click();
  await expect(page.locator('.day-plan:last-child .day-trip-option')).not.toBeVisible();

  // 3. 1日目のチェックボックスをオンにする
  const day1 = page.locator('.day-plan:first-child');
  const dayTripCheckbox = day1.locator('.day-is-day-trip');
  const accommodationInput = day1.locator('.accommodation');

  await accommodationInput.fill('テストホテル'); // 事前に値を入力
  await dayTripCheckbox.check();

  // 4. 宿泊先入力欄が無効化され、値がクリアされることを確認
  await expect(accommodationInput).toBeDisabled();
  await expect(accommodationInput).toHaveValue('');

  // 5. チェックボックスをオフにする
  await dayTripCheckbox.uncheck();
  await expect(accommodationInput).toBeEnabled();

  // 6. 日帰りチェックを入れた状態でMarkdownを生成
  await dayTripCheckbox.check();
  await page.locator('.generate-btn').click();

  // 7. Markdownに「宿泊先」が含まれないことを確認
  await page.waitForFunction(() => document.getElementById('output-markdown').value.length > 0);
  const generatedMarkdown = await page.locator('#output-markdown').inputValue();
  await expect(generatedMarkdown).not.toContain('宿泊先／最終目的地');
});

test('[UI] Gemini API連携テスト', async ({ page }) => {
  // 1. テスト用のAPIリクエストをモック
  await page.route('http://localhost:8080/?api=gemini', async route => {
    const mockResponse = { text: 'Geminiからの応答メッセージです。' };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockResponse) });
  });

  // 2. 何か入力してMarkdownを生成
  await page.locator('#departure-point').fill('テスト出発地');
  await page.locator('.generate-btn').click();

  // 3. Markdownが生成され、Gemini実行ボタンが有効になるのを待つ
  await page.waitForFunction(() => document.getElementById('output-markdown').value.length > 0);
  await expect(page.locator('#output-markdown')).not.toBeEmpty();
  await expect(page.locator('#execute-gemini-btn')).toBeEnabled();

  // 4. Gemini実行ボタンをクリック
  await page.locator('#execute-gemini-btn').click();

  // 5. 最終的に正しい応答がpタグとしてレンダリングされるのを直接待つ
  //    ローディングのような中間状態をテストすると不安定になることがあるため、最終結果のみを検証します。
  await expect(page.locator('#gemini-response-content p')).toHaveText('Geminiからの応答メッセージです。');
});

test.describe('目的選択機能', () => {
  test('目的選択モーダルが開き、テーマを選択・解除できる', async ({ page }) => {
    // 1. 目的選択モーダルを開く
    await page.locator('.day-plan:first-child .open-theme-modal-btn').click();
    await expect(page.locator('#modal-theme-title')).toBeVisible();
    await expect(page.locator('#modal-theme-title')).toHaveText('目的を選択');

    // 2. モーダル内にテーマが表示されていることを確認 (この時点では失敗するはず)
    await expect(page.locator('.theme-select-btn[data-theme-name="グルメ"]')).toBeVisible();

    // 3. テーマを選択し、表示されることを確認
    await page.locator('.theme-select-btn[data-theme-name="グルメ"]').click();
    await expect(page.locator('.day-plan:first-child .selected-themes-container')).toHaveText(/グルメ/);

    // 4. もう一度クリックして選択解除
    await page.locator('.theme-select-btn[data-theme-name="グルメ"]').click();
    await expect(page.locator('.day-plan:first-child .selected-themes-container')).not.toHaveText(/グルメ/);

    // 5. モーダルを閉じる
    await page.locator('#modal-theme .modal__btn').click();
    await expect(page.locator('#modal-theme')).not.toBeVisible();
  });
});
