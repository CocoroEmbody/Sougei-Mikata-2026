# Netlifyデプロイ手順

## 前提条件
- GitHubアカウント
- Netlifyアカウント（無料で作成可能: https://www.netlify.com/）

## ステップ1: Gitリポジトリの初期化とGitHubへのプッシュ

### 1-1. Gitリポジトリを初期化
```bash
git init
git add .
git commit -m "Initial commit: Sougei Mikata 2026 route optimization system"
```

### 1-2. GitHubでリポジトリを作成
1. GitHubにログイン: https://github.com
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を入力（例: `sougei-mikata-2026`）
4. 「Public」または「Private」を選択
5. 「Initialize this repository with a README」は**チェックしない**
6. 「Create repository」をクリック

### 1-3. ローカルリポジトリをGitHubにプッシュ
GitHubで作成したリポジトリのURLをコピーして、以下のコマンドを実行：

```bash
git remote add origin https://github.com/YOUR_USERNAME/sougei-mikata-2026.git
git branch -M main
git push -u origin main
```

（`YOUR_USERNAME`を自分のGitHubユーザー名に置き換えてください）

## ステップ2: Netlifyでサイトを作成

### 2-1. Netlifyにログイン
1. https://www.netlify.com/ にアクセス
2. 「Sign up」または「Log in」をクリック
3. GitHubアカウントでログインすることを推奨（連携が簡単）

### 2-2. 新しいサイトを作成
1. Netlifyダッシュボードで「Add new site」→「Import an existing project」をクリック
2. 「GitHub」を選択
3. 初回はGitHubとの連携を許可する必要があります
4. 先ほど作成したリポジトリ（`sougei-mikata-2026`）を選択

### 2-3. ビルド設定
Netlifyが自動的に設定を検出しますが、以下の設定を確認：

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Base directory**: （空欄のまま）

「Deploy site」をクリック

## ステップ3: 環境変数の設定

### 3-1. 環境変数を追加
1. デプロイが開始されたら、サイトの設定画面に移動
2. 左メニューから「Site configuration」→「Environment variables」をクリック
3. 「Add a variable」をクリックして、以下の3つの環境変数を追加：

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | あなたのSupabaseプロジェクトのURL |
| `VITE_SUPABASE_ANON_KEY` | あなたのSupabaseプロジェクトの匿名キー |
| `VITE_GOOGLE_MAPS_API_KEY` | あなたのGoogle Maps APIキー |

### 3-2. 環境変数の取得方法

#### SupabaseのURLとキー
1. Supabaseダッシュボードにログイン: https://app.supabase.com
2. プロジェクトを選択
3. 左メニューから「Settings」→「API」をクリック
4. 「Project URL」と「anon public」キーをコピー

#### Google Maps APIキー
1. Google Cloud Consoleにアクセス: https://console.cloud.google.com
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」をクリック
4. APIキーをコピー（または新規作成）

### 3-3. 環境変数設定後の再デプロイ
環境変数を追加したら、自動的に再デプロイが開始されます。
または、手動で「Deploys」タブから「Trigger deploy」→「Deploy site」をクリック

## ステップ4: Google Maps APIの制限設定

### 4-1. HTTPリファラー制限を設定
本番環境のURLを許可する必要があります：

1. Google Cloud Consoleで「APIとサービス」→「認証情報」をクリック
2. 使用しているAPIキーをクリック
3. 「アプリケーションの制限」で「HTTPリファラー（ウェブサイト）」を選択
4. 「ウェブサイトの制限」に以下を追加：
   - `https://YOUR_SITE_NAME.netlify.app/*`
   - `http://localhost:5173/*`（開発用）
   - `http://localhost:4173/*`（プレビュー用）

（`YOUR_SITE_NAME`はNetlifyが自動生成したサイト名に置き換えてください）

## ステップ5: SupabaseのRLSポリシーを確認

### 5-1. マイグレーションの適用
本番環境のSupabaseプロジェクトで、以下のSQLを実行：

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `supabase/migrations/001_initial_schema.sql`の内容をコピーして実行
3. `supabase/migrations/002_fix_rls_policies.sql`の内容をコピーして実行

### 5-2. RLSポリシーの確認
- データの読み取り・書き込みが正常に動作することを確認
- 必要に応じて、認証設定を調整

## ステップ6: 動作確認

### 6-1. サイトにアクセス
Netlifyが提供するURL（例: `https://random-name-12345.netlify.app`）にアクセス

### 6-2. 機能テスト
- [ ] 施設・利用者・車両・ドライバーの追加・編集・削除が正常に動作する
- [ ] リクエストの選択とルート計算が正常に動作する
- [ ] Google Mapが正常に表示される
- [ ] ルート最適化が正常に動作する

## トラブルシューティング

### ビルドエラー
- コンソールログを確認
- 環境変数が正しく設定されているか確認
- `npm run build`をローカルで実行してエラーを確認

### 環境変数が読み込まれない
- 環境変数の名前が`VITE_`で始まっているか確認
- 再デプロイを実行

### Google Mapsが表示されない
- APIキーのHTTPリファラー制限を確認
- ブラウザのコンソールでエラーを確認
- Google Maps APIの有効化を確認

### Supabase接続エラー
- SupabaseのURLとキーが正しいか確認
- RLSポリシーが正しく設定されているか確認
- Supabaseプロジェクトがアクティブか確認

## カスタムドメインの設定（オプション）

1. Netlifyダッシュボードで「Domain settings」をクリック
2. 「Add custom domain」をクリック
3. ドメイン名を入力
4. DNS設定を指示に従って設定

## 継続的デプロイ

GitHubにプッシュするたびに、Netlifyが自動的に再デプロイします。
手動でデプロイしたい場合は、Netlifyダッシュボードから「Trigger deploy」をクリックしてください。
