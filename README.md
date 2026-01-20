# 障がい福祉事業所向け送迎ルート最適化システム

React + TypeScript + Vite + Tailwind CSS + Supabaseで構築された、障がい福祉事業所の送迎ルートを最適化するWebアプリケーションです。

## 機能

- **データ管理**: 施設、利用者、車両、ドライバーの登録・編集・削除
- **リクエスト管理**: 本日の送迎リクエストの選択と施設の指定
- **リソース設定**: 車両とドライバーの組み合わせ設定
- **ルート最適化**: AIによる送迎ルートの自動生成

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **スタイリング**: Tailwind CSS
- **アイコン**: lucide-react
- **データベース**: Supabase (PostgreSQL)
- **日付処理**: date-fns
- **地図API**: Google Maps API

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 3. Supabaseのセットアップ

1. Supabaseプロジェクトを作成
2. SQL Editorで以下の順序でマイグレーションを実行：
   - `supabase/migrations/001_initial_schema.sql`を実行してテーブルとRLSポリシーを作成
   - `supabase/migrations/002_fix_rls_policies.sql`を実行してRLSポリシーを修正
3. Edge Functionをデプロイ（オプション）:
   ```bash
   supabase functions deploy google-maps-proxy
   ```
   Edge Functionを使用する場合は、環境変数`GOOGLE_MAPS_API_KEY`を設定してください。

**重要**: RLSポリシーのエラーが発生する場合は、`002_fix_rls_policies.sql`を実行してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

## データベーススキーマ

### facilities（施設テーブル）
- id: UUID (主キー)
- name: 施設名
- address: 住所
- lat: 緯度
- lng: 経度

### users（利用者テーブル）
- id: UUID (主キー)
- name: 利用者名
- address: 住所
- lat: 緯度
- lng: 経度
- default_facility_id: デフォルト施設ID
- welfare_vehicle_required: 福祉車両が必要かどうか
- pickup_location_type: ピックアップ場所タイプ
- pickup_location_name: ピックアップ場所名
- pickup_location_address: ピックアップ場所住所
- pickup_lat: ピックアップ場所緯度
- pickup_lng: ピックアップ場所経度
- pickup_time: ピックアップ時間

### vehicles（車両テーブル）
- id: UUID (主キー)
- name: 車両名
- capacity: 定員
- welfare_vehicle: 福祉車両かどうか
- wheelchair_capacity: 車椅子定員

### drivers（ドライバーテーブル）
- id: UUID (主キー)
- name: ドライバー名

## 使用方法

1. **データ管理タブ**: 施設、利用者、車両、ドライバーを登録
2. **本日のリクエストタブ**: 送迎が必要な利用者を選択し、送迎先施設を指定
3. **リソース設定タブ**: 車両とドライバーの組み合わせを設定
4. **最適化結果タブ**: 「AIルート計算」ボタンをクリックしてルートを生成

## ルート最適化アルゴリズム

1. 施設ごとにリクエストをグループ化
2. ピックアップ時間の30分ウィンドウでグループ化
3. 福祉車両が必要な利用者は福祉車両にのみ割り当て
4. 同一場所のピックアップをまとめる
5. 最近傍法でルートを最適化
6. 車両・ドライバーの時間的な競合をチェック

## ライセンス

MIT
