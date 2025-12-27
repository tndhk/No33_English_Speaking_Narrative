# kaku (My English Journal)

自分自身の経験や思考を、自然で印象的な英語の日記（ジャーナル）に変換し、スピーキング練習を行うためのAI学習ツール。
質問に答えるだけで、あなただけの英語日記と復習教材が生成されます。

## 機能

### コア機能

- **Journal Generation**: ユーザーの入力（日本語）から、レベルに合わせた英語の日記を生成
- **Personalized Learning**: 文脈に即した重要表現（Key Phrases）、言い換え表現（Alternative Expressions）、理解度を確認するリコールテスト（Recall Test）を提供
- **Text-to-Speech (TTS)**: 生成された日記を音声で読み上げ。文単位のリピート再生が可能

### 学習管理機能

- **SRS (Spaced Repetition System)**: 効率的な反復学習のための復習スケジュール管理
- **Review Dashboard**: 今日の復習項目と「Years Ago Today」（過去の今日の日記）を表示
- **Calendar View**: 過去の日記をカレンダー形式で閲覧
- **History**: 日付ごとの日記履歴管理

### データ管理

- **Database**: Supabase を使用したデータ永続化
- **User Authentication**: Supabase Auth を使用したユーザー認証と個別データ管理
- **Export/Import**: JSON, CSV, Markdown 形式でのデータエクスポート・インポート

## 技術スタック

- **Frontend**: Vanilla JS, Vite
- **Backend**: Cloudflare Pages Functions (API Proxy)
- **Database**: Supabase (ローカル開発: Docker)
- **AI Model**: Google Gemini 2.0 Flash / 2.5 Flash
- **Deployment**: Cloudflare Pages (予定)

## セットアップ手順

### 前提条件

- Node.js (v18以上)
- Docker (Supabase ローカル実行用)
- Gemini API Key

### インストール

1. リポジトリをクローン

   ```bash
   git clone <repository-url>
   cd EnglishSpeaking251223
   ```

2. 依存関係をインストール

   ```bash
   npm install
   ```

3. Supabase CLI をインストール（未インストールの場合）
   ```bash
   npm install -g supabase
   ```

### ローカル環境のセットアップ

1. Supabase をローカルで起動

   ```bash
   npx supabase start
   ```

   初回起動時は Docker イメージのダウンロードに時間がかかります。
   起動後、コンソールに表示される `API URL` と `anon key` を確認してください。

2. 環境変数ファイルを作成

   **フロントエンド用 (.env):**

   ```text
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
   ```

   **バックエンド用 (.dev.vars):**
   Cloudflare Workers (Backend) 用の API キーなどを設定します。

   ```text
   GEMINI_API_KEY=your_gemini_api_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
   ```

3. 開発サーバーを起動

   ```bash
   # フロントエンドとバックエンドを同時に起動
   npm run dev:full
   ```

4. ブラウザで `http://localhost:8788` にアクセス

### その他の便利なコマンド

```bash
# Supabase の状態確認
npx supabase status

# Supabase の停止
npx supabase stop

# データベースのリセット（マイグレーション再実行）
npx supabase db reset
```

> [!TIP]
> `npx supabase db reset` を実行するとユーザーデータが全消去されるため、ブラウザに残っているログインセッションが無効になります。リセット後は一度ログアウトし、再度新規登録を行ってください。

### ユーザー認証の設定

本アプリケーションは Supabase Auth を使用してユーザー認証を実装しています。

#### ローカル開発環境

ローカル環境では、Supabase のローカルインスタンスで自動的に認証機能が有効になります。

1. アプリケーションを起動すると、ログイン/新規登録画面が表示されます
2. 「新規登録」タブから、メールアドレスとパスワードを入力して登録してください
3. ローカル開発では確認メールなしで即座にログインできます

#### 本番環境（Supabase Cloud）

本番環境にデプロイする場合は、以下の手順で Supabase Auth を設定してください。

1. **Supabase プロジェクトの作成**
   - [Supabase](https://supabase.com) でプロジェクトを作成
   - プロジェクトの設定から `API URL` と `anon key` を取得

2. **メール認証の設定**
   - Supabase ダッシュボード → Authentication → Settings
   - Email provider を設定（デフォルトは Supabase 提供のメールサービス）
   - 必要に応じて、カスタムメールテンプレートを設定

3. **環境変数の設定**

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **マイグレーションの適用**

   ```bash
   # Supabase プロジェクトにリンク
   npx supabase link --project-ref your-project-ref

   # マイグレーションを適用
   npx supabase db push
   ```

#### Row Level Security (RLS) について

データベースは Row Level Security (RLS) により、ユーザーごとにデータが分離されています。

- **narratives テーブル**: 各ユーザーは自分が作成した日記のみを閲覧・編集できます
- **user_stats テーブル**: 各ユーザーは自分の統計情報のみを閲覧・編集できます

RLS ポリシーは `/supabase/migrations/` 内のマイグレーションファイルで定義されています。

## プロジェクト構造

```
.
├── src/
│   ├── index.html           # Frontend Entry
│   ├── main.js              # Core Logic
│   ├── auth.js              # Authentication (Supabase Auth)
│   ├── storage.js           # Supabase Integration
│   ├── supabase.js          # Supabase Client
│   ├── srs.js               # SRS Logic
│   ├── stats.js             # Statistics & Dashboard
│   ├── review-session.js    # Review Session Management
│   ├── export.js            # Export/Import
│   └── style.css            # Styling
├── functions/api/           # Cloudflare Workers (Backend API)
├── supabase/
│   ├── config.toml          # Supabase Configuration
│   └── migrations/          # Database Migrations
│       ├── 20251224115834_init_schema.sql              # Initial schema
│       └── 20251225000000_add_user_authentication.sql  # User authentication
├── prompts/                 # System Prompts for LLM
└── spec.md                  # Requirements Spec
```

## 開発の進め方

### ローカル開発フロー（推奨）

このプロジェクトは Vite 開発サーバーと Wrangler Pages Dev サーバーを連携させるプロキシ設定を使用しています。

**フロントエンド開発：**

```bash
# 別のターミナルウィンドウで実行
npm run dev
```

- Vite 開発サーバーが `http://localhost:5173` で起動
- `/api` への API リクエストは自動的にバックエンド（localhost:8787）にプロキシされます
- コードの変更は自動でリロードされます

**バックエンド開発（オプション）：**

```bash
# ローカルでバックエンドをテストする場合は別のターミナルで実行
# （フロントエンドのプロキシが自動的にリクエストをルーティングします）
```

**フル機能テスト（本番環境に近い環境）：**

```bash
npm run build      # フロントエンドをビルド
npm run dev:backend # Wrangler Pages Dev でバックエンド + フロントエンドを起動
```

### データベースのマイグレーション

新しいテーブルやカラムを追加する場合：

```bash
# 新しいマイグレーションファイルを作成
npx supabase migration new <migration_name>

# SQL を記述後、適用
npx supabase db reset
```

## 注意事項

- 本プロジェクトは個人学習用のツールです
- ローカル環境での実行を前提としています
- **ユーザー認証機能が実装されています**: Supabase Auth を使用
- **データ分離**: RLS (Row Level Security) により、各ユーザーのデータが安全に分離されます
- 本番環境へのデプロイ時は、Supabase のメール認証設定を適切に行ってください

## ライセンス

MIT License

## 関連リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Gemini API Documentation](https://ai.google.dev/docs)
