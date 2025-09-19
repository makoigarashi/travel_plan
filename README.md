# 旅行プラン・プロンプトジェネレーター

AI(LLM)に旅行プランの作成を依頼するための、詳細な指示（プロンプト）を対話形式で簡単に生成できるウェブアプリケーションです。

**公開URL: [https://storage.googleapis.com/migarashi_travel_plan/index.html](https://storage.googleapis.com/migarashi_travel_plan/index.html)**

## 主な機能

*   **折りたたみ可能なUI:** 「旅行全体の基本情報」や各日の詳細プランなど、主要な入力セクションを折りたたむことができ、画面全体の見通しが向上しました。
*   **柔軟なプランニングモード:**
    *   **通常モード:** 日付、場所、交通手段、行きたい場所などを細かく指定して、具体的なプロンプトを生成できます。
    *   **AI提案モード:** 到着地や旅行期間といった大まかな希望を伝えるだけで、行き先の選定からAIに任せるプロンプトを生成できます。
    *   **日ごとのおまかせ設定:** 特定の日だけ「AIにおまかせ」にすることで、固定プランとAIの提案を組み合わせた、ハイブリッドな旅行計画が可能です。
*   **日ごとの目的設定:**
    *   「グルメ」「観光名所」「温泉」など、その日の主な目的を複数選択できます。これにより、AIがより具体的で、希望に沿ったプランを提案しやすくなります。
*   **Gemini API / Mistral AI API連携:**
    *   生成したプロンプトを、ワンクリックで直接Gemini APIまたはMistral AI APIに送信し、旅行プランの提案をリアルタイムに受け取れます。
*   **リッチなプレビュー:**
    *   生成されたプロンプトを、シンタックスハイライト付きで分かりやすくプレビューできます。
*   **プロンプトのインポート/エクスポート:**
    *   一度生成したプロンプトをテキストとしてコピーできます。
    *   コピーしたプロンプトを貼り付けることで、いつでも入力内容を復元し、再編集できます。
*   **高度な設定機能:**
    *   出発地やメンバー構成などのフォーム初期値を、自分の使い方に合わせて設定できます。
    *   日毎のプランで選択する「目的」の選択肢（「食事」「観光」など）を、カテゴリから自由に追加・編集・削除できます。
    *   設定はデータベースに保存され、どの環境からアクセスしても同じ設定が利用できます。
*   **地図ルート表示:** 各日の訪問地を線で結び、移動ルートを地図上で視覚的に確認できます。

## 技術スタック

*   **フロントエンド:** HTML, CSS (Tailwind CSS), JavaScript (jQuery, Handlebars.js, SimpleMDE)
*   **バックエンド (APIプロキシ):** Node.js, Express
*   **データベース:** Firestore (本番環境), SQLite (ローカル環境)
*   **ホスティング:**
    *   フロントエンド: Google Cloud Storage (GCS)
    *   バックエンド: Google Cloud Run
*   **外部API:**
    *   [Google Gemini API](https://ai.google.dev/): 旅行プランの生成に使用しています。
    *   [Mistral AI API](https://mistral.ai/): 旅行プランの生成に使用しています。
    *   [国土交通省 共通API](https://www.mlit.go.jp/plateau/api/): 市区町村データの取得に使用しています。
    *   [Google Maps Directions API](https://developers.google.com/maps/documentation/directions): ルート検索に使用しています。

## ローカルでの実行方法

### 前提条件

*   [Node.js](https://nodejs.org/) (v18以上を推奨)

### 手順

1.  **リポジトリをクローンします。**

2.  **バックエンドサーバーをセットアップします。**
    a. `backend`ディレクトリに移動します。
       ```bash
       cd backend
       ```
    b. `.env`ファイルを作成し、APIキーを設定します。
       ```
       MLIT_API_KEY="ここに国土交通省APIのキーを記述"
       GEMINI_API_KEY="ここにGemini APIのキーを記述"
       MISTRAL_API_KEY="ここにMistral AI APIのキーを記述"
       ```
    c. 依存関係をインストールします。
       ```bash
       npm install
       ```
    d. 開発サーバーを起動します。
       ```bash
       npm run dev
       ```
       サーバーが `http://localhost:8080` で起動します。

    > **Note**
    > 初回起動時に、`backend`フォルダ内に`database.sqlite`という設定保存用のデータベースファイルが自動で作成されます。

3.  **フロントエンドを開きます。**

    VS Codeの拡張機能である [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) の使用を推奨します。

    a. VS Codeでプロジェクトのルートディレクトリを開きます。
    b. `frontend/index.html` ファイルを右クリックし、「Open with Live Server」を選択します。
    c. ブラウザで `http://127.0.0.1:5500` のようなアドレスが自動的に開かれ、アプリケーションが表示されます。

    > **Note**
    > `index.html` をファイルとして直接ブラウザで開くと、API通信が正常に動作しないため、必ずローカルサーバー経由でアクセスしてください。

## テストの実行方法

このプロジェクトでは、Playwrightを用いたE2E（End-to-End）テストが導入されています。これにより、アプリケーションがブラウザ上で期待通りに動作するかを自動で検証できます。

### 前提条件

*   Node.js (v18以上を推奨)
*   npm (Node.jsに付属)

### 手順

1.  **フロントエンドの依存関係をインストールします。**
    `frontend`ディレクトリに移動し、以下のコマンドを実行します。
    ```bash
    cd frontend
    npm install
    ```

2.  **テストを実行します。**
    `frontend`ディレクトリで以下のコマンドを実行します。
    ```bash
    npm test
    ```
    これにより、Playwrightが設定されたブラウザ（Chromium, Firefox, WebKit）でテストが実行されます。

3.  **テストレポートを確認します (任意)。**
    テスト実行後、詳細なHTMLレポートをブラウザで開くことができます。
    ```bash
    npx playwright show-report
    ```
    このレポートには、各テストの実行結果、スクリーンショット、トレースなどが含まれており、デバッグに役立ちます。

## デプロイ

このプロジェクトは`cloudbuild.yaml`の設定に基づき、Google Cloud Platformへ自動的にデプロイされます。

*   **フロントエンド:** `frontend`ディレクトリの内容がGoogle Cloud Storageに同期されます。
*   **バックエンド:** `backend`ディレクトリの内容がコンテナ化され、Google Cloud Runにデプロイされます。
    *   **Firestore連携のための設定:** Cloud Runサービスの設定画面で、環境変数 `GOOGLE_CLOUD_PROJECT` にご自身のGoogle CloudプロジェクトIDを設定してください。これにより、本番環境でFirestoreが有効になります。
    *   **Google Maps / Gemini / Mistral AI連携のための設定:** Cloud Buildを実行する前に、Secret Managerに`google-maps-api-key`, `gemini-api-key`, `mistral-api-key`という名前でそれぞれのAPIキーを登録しておく必要があります。